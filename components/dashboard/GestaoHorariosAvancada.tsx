"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock, Calendar, Lock, Unlock, AlertCircle,
  Plus, Trash2, Save, X, History, User,
  CalendarOff, Coffee, Palmtree, Wrench, Heart,
  CalendarX, Sun
} from "lucide-react";
import { Button, TextField, Select, Switch, Badge, TextArea, Tabs } from "@radix-ui/themes";
import { format, parseISO, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/Modal";
import { ModalPortal } from "@/components/ui/modal-portal";
import { CalendarioInterativo } from "./CalendarioInterativo";
import { SeletorHorarioInterativo } from "./SeletorHorarioInterativo";
import { obterTerminologia } from "@/lib/configuracoes-negocio";
import { TipoNegocio } from "@/lib/tipos-negocio";

// Função para normalizar horário removendo segundos (HH:mm:ss -> HH:mm)
function normalizarHorario(horario: string | null | undefined): string {
  if (!horario) return "09:00";
  // Se já está no formato HH:mm, retorna como está
  if (horario.length === 5 && horario.includes(':')) return horario;
  // Se está no formato HH:mm:ss, remove os segundos
  if (horario.length === 8 && horario.split(':').length === 3) {
    return horario.substring(0, 5);
  }
  return horario;
}

// Tipos de bloqueio disponíveis
const TIPOS_BLOQUEIO = [
  { 
    valor: "bloqueio_manual", 
    label: "Bloqueio Manual", 
    descricao: "Bloqueio geral de horário",
    icone: Lock, 
    cor: "zinc",
    corFundo: "bg-zinc-50 dark:bg-zinc-800",
    corBorda: "border-zinc-300 dark:border-zinc-600",
    corIcone: "text-zinc-600 dark:text-zinc-400"
  },
  { 
    valor: "folga", 
    label: "Folga", 
    descricao: "Dia de descanso do profissional",
    icone: Coffee, 
    cor: "blue",
    corFundo: "bg-blue-50 dark:bg-blue-900/20",
    corBorda: "border-blue-300 dark:border-blue-700",
    corIcone: "text-blue-600 dark:text-blue-400"
  },
  { 
    valor: "feriado", 
    label: "Feriado", 
    descricao: "Feriado nacional ou local",
    icone: Palmtree, 
    cor: "red",
    corFundo: "bg-red-50 dark:bg-red-900/20",
    corBorda: "border-red-300 dark:border-red-700",
    corIcone: "text-red-600 dark:text-red-400"
  },
  { 
    valor: "manutencao", 
    label: "Manutenção", 
    descricao: "Período de manutenção ou reforma",
    icone: Wrench, 
    cor: "amber",
    corFundo: "bg-amber-50 dark:bg-amber-900/20",
    corBorda: "border-amber-300 dark:border-amber-700",
    corIcone: "text-amber-600 dark:text-amber-400"
  },
  { 
    valor: "evento", 
    label: "Evento Especial", 
    descricao: "Evento, curso ou treinamento",
    icone: Heart, 
    cor: "purple",
    corFundo: "bg-purple-50 dark:bg-purple-900/20",
    corBorda: "border-purple-300 dark:border-purple-700",
    corIcone: "text-purple-600 dark:text-purple-400"
  }
];

interface HorarioDia {
  abertura: string;
  fechamento: string;
  almoco_inicio: string | null;
  almoco_fim: string | null;
}

interface HorariosPersonalizados {
  seg?: HorarioDia;
  ter?: HorarioDia;
  qua?: HorarioDia;
  qui?: HorarioDia;
  sex?: HorarioDia;
  sab?: HorarioDia;
  dom?: HorarioDia;
}

interface ConfiguracaoBarbearia {
  id: string;
  aberta: boolean;
  mensagem_fechamento: string | null;
  horario_abertura: string;
  horario_fechamento: string;
  dias_funcionamento: string[];
  intervalo_almoco_inicio: string | null;
  intervalo_almoco_fim: string | null;
  intervalo_horarios: number;
  usar_horarios_personalizados: boolean;
  horarios_personalizados: HorariosPersonalizados | null;
}

interface HorarioBloqueado {
  id: string;
  barbeiro_id: string | null;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  motivo: string | null;
  tipo: string;
  barbeiros?: { nome: string };
}

interface BarbeiroSimples {
  id: string;
  nome: string;
}

interface ModalConfigState {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export function GestaoHorariosAvancada() {
  const { tenant } = useAuth();
  const [config, setConfig] = useState<ConfiguracaoBarbearia | null>(null);
  const [bloqueios, setBloqueios] = useState<HorarioBloqueado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Modal de novo bloqueio
  const [modalBloqueio, setModalBloqueio] = useState(false);
  const [bloquearDiaCompleto, setBloquearDiaCompleto] = useState(false);
  const [novoBloqueio, setNovoBloqueio] = useState({
    barbeiro_id: "",
    data: format(new Date(), "yyyy-MM-dd"),
    horario_inicio: "09:00",
    horario_fim: "18:00",
    motivo: "",
    tipo: "bloqueio_manual"
  });

  // Terminologia dinâmica baseada no tipo de negócio
  const tipoNegocio = (tenant?.tipo_negocio as TipoNegocio) || 'barbearia';
  const terminologia = useMemo(() => obterTerminologia(tipoNegocio), [tipoNegocio]);
  const estabelecimentoSingularLower = terminologia.estabelecimento.singular.toLowerCase();
  const artigoEstabelecimento = terminologia.estabelecimento.artigo;
  const estabelecimentoComArtigo = `${artigoEstabelecimento} ${estabelecimentoSingularLower}`;
  const sufixoGeneroEstabelecimento = artigoEstabelecimento === 'a' ? 'a' : 'o';
  const artigoEstabelecimentoCapitalizado = artigoEstabelecimento === 'a' ? 'A' : 'O';
  
  const [barbeiros, setBarbeiros] = useState<BarbeiroSimples[]>([]);
  const [modalConfig, setModalConfig] = useState<ModalConfigState | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState<{aberto: boolean, id: string | null}>({
    aberto: false,
    id: null
  });
  const [intervaloPersonalizado, setIntervaloPersonalizado] = useState(false);
  const [valorIntervaloPersonalizado, setValorIntervaloPersonalizado] = useState("");
  const [abaHorario, setAbaHorario] = useState<"configurar" | "bloquear">("configurar");

  useEffect(() => {
    if (!tenant) return;
    
    carregarDados();
    carregarBarbeiros();
    carregarBloqueios();
    
    // Realtime para configurações
    const channelConfig = supabase
      .channel('config-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'configuracoes_barbearia',
        filter: `tenant_id=eq.${tenant.id}`
      }, () => {
        carregarDados();
      })
      .subscribe();

    // Realtime para bloqueios
    const channelBloqueios = supabase
      .channel('bloqueios-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'horarios_bloqueados',
        filter: `tenant_id=eq.${tenant.id}`
      }, () => {
        carregarBloqueios();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelConfig);
      supabase.removeChannel(channelBloqueios);
    };
  }, [tenant]);

  const carregarDados = async () => {
    if (!tenant) return;
    
    try {
      const { data, error } = await supabase
        .from('configuracoes_barbearia')
        .select('*')
        .eq('tenant_id', tenant.id)
        .single();

      if (error) throw error;
      setConfig(data);
      
      await carregarBloqueios();
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setCarregando(false);
    }
  };

  const carregarBloqueios = async () => {
    if (!tenant) return;
    
    try {
      const { data, error } = await supabase
        .from('horarios_bloqueados')
        .select(`
          *,
          barbeiros (nome)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data', format(new Date(), 'yyyy-MM-dd'))
        .order('data', { ascending: true });

      if (error) throw error;
      setBloqueios(data || []);
    } catch (error) {
      console.error('Erro ao carregar bloqueios:', error);
    }
  };

  const carregarBarbeiros = async () => {
    if (!tenant) return;
    
    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('id, nome')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true);

      if (error) throw error;
      setBarbeiros(data || []);
    } catch (error) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  const alternarStatus = async () => {
    if (!config) return;
    
    const novoStatus = !config.aberta;
    
    // Se está tentando FECHAR, pedir confirmação dupla
    if (!novoStatus) {
      const confirmacao1 = confirm(
        `ATENÇÃO\n\nDeseja realmente fechar ${estabelecimentoComArtigo}?\n\nClientes não poderão fazer novos agendamentos.`
      );
      
      if (!confirmacao1) return;
      
      const confirmacao2 = confirm(
        `CONFIRMAÇÃO FINAL\n\nTem certeza? Esta ação fechará ${estabelecimentoComArtigo} para agendamentos.\n\nClique OK para confirmar ou Cancelar para manter ${estabelecimentoComArtigo} abert${sufixoGeneroEstabelecimento}.`
      );
      
      if (!confirmacao2) return;
    }
    
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('configuracoes_barbearia')
        .update({ 
          aberta: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      setModalConfig({
        title: novoStatus
          ? `${terminologia.estabelecimento.singular} abert${sufixoGeneroEstabelecimento}`
          : `${terminologia.estabelecimento.singular} fechad${sufixoGeneroEstabelecimento}`,
        message: novoStatus 
          ? `${artigoEstabelecimentoCapitalizado} ${estabelecimentoSingularLower} está abert${sufixoGeneroEstabelecimento} para agendamentos. Clientes podem agendar normalmente.`
          : `${artigoEstabelecimentoCapitalizado} ${estabelecimentoSingularLower} foi fechad${sufixoGeneroEstabelecimento}. Clientes não poderão agendar novos horários.`,
        type: "success"
      });
      setModalAberto(true);
      
      setConfig({ ...config, aberta: novoStatus });
    } catch (error: any) {
      setModalConfig({
        title: "Erro",
        message: `Erro ao alterar status: ${error.message}`,
        type: "error"
      });
      setModalAberto(true);
    } finally {
      setSalvando(false);
    }
  };

  const salvarConfiguracao = async () => {
    if (!config) return;
    
    // Validar intervalo de almoço: ambos devem estar preenchidos ou ambos vazios
    const temInicioAlmoco = config.intervalo_almoco_inicio && config.intervalo_almoco_inicio.trim() !== '';
    const temFimAlmoco = config.intervalo_almoco_fim && config.intervalo_almoco_fim.trim() !== '';
    
    if (temInicioAlmoco !== temFimAlmoco) {
      setModalConfig({
        title: "⚠️ Atenção",
        message: "Para configurar o intervalo de almoço, preencha tanto o horário de início quanto o de fim. Ou deixe ambos vazios para não ter intervalo.",
        type: "warning"
      });
      setModalAberto(true);
      return;
    }
    
    setSalvando(true);
    try {
      // Garantir que valores vazios sejam null
      const intervaloAlmocoInicio = temInicioAlmoco ? config.intervalo_almoco_inicio : null;
      const intervaloAlmocoFim = temFimAlmoco ? config.intervalo_almoco_fim : null;
      
      const { error } = await supabase
        .from('configuracoes_barbearia')
        .update({
          horario_abertura: config.horario_abertura,
          horario_fechamento: config.horario_fechamento,
          dias_funcionamento: config.dias_funcionamento,
          intervalo_almoco_inicio: intervaloAlmocoInicio,
          intervalo_almoco_fim: intervaloAlmocoFim,
          intervalo_horarios: config.intervalo_horarios,
          mensagem_fechamento: config.mensagem_fechamento,
          usar_horarios_personalizados: config.usar_horarios_personalizados,
          horarios_personalizados: config.horarios_personalizados,
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      setModalConfig({
        title: "Sucesso",
        message: "Configurações salvas com sucesso!",
        type: "success"
      });
      setModalAberto(true);
    } catch (error: any) {
      setModalConfig({
        title: "Erro",
        message: `Erro ao salvar: ${error.message}`,
        type: "error"
      });
      setModalAberto(true);
    } finally {
      setSalvando(false);
    }
  };

  // Função para obter horários do dia (para bloqueio completo)
  const obterHorariosDoDia = (data: string): { inicio: string; fim: string } => {
    if (!config) return { inicio: "09:00", fim: "18:00" };
    
    // Verificar se usa horários personalizados
    if (config.usar_horarios_personalizados && config.horarios_personalizados) {
      const dataObj = parseISO(data);
      const diaSemana = getDay(dataObj);
      const mapasDias: Record<number, string> = {
        0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
      };
      const diaKey = mapasDias[diaSemana] as keyof HorariosPersonalizados;
      const horarioDia = config.horarios_personalizados[diaKey];
      
      if (horarioDia) {
        return {
          inicio: normalizarHorario(horarioDia.abertura),
          fim: normalizarHorario(horarioDia.fechamento)
        };
      }
    }
    
    // Usar horário padrão
    return {
      inicio: normalizarHorario(config.horario_abertura),
      fim: normalizarHorario(config.horario_fechamento)
    };
  };

  const criarBloqueio = async () => {
    if (!tenant) return;
    
    setSalvando(true);
    try {
      // Se bloquear dia completo, usar horários do dia
      let horarioInicio = novoBloqueio.horario_inicio;
      let horarioFim = novoBloqueio.horario_fim;
      
      if (bloquearDiaCompleto) {
        const horariosDia = obterHorariosDoDia(novoBloqueio.data);
        horarioInicio = horariosDia.inicio;
        horarioFim = horariosDia.fim;
      }
      
      // Garantir formato HH:mm:ss para o banco
      const horarioInicioFormatado = horarioInicio.length === 5 ? horarioInicio + ':00' : horarioInicio;
      const horarioFimFormatado = horarioFim.length === 5 ? horarioFim + ':00' : horarioFim;

      const { error } = await supabase
        .from('horarios_bloqueados')
        .insert([{
          tenant_id: tenant.id,
          barbeiro_id: novoBloqueio.barbeiro_id || null,
          data: novoBloqueio.data,
          horario_inicio: horarioInicioFormatado,
          horario_fim: horarioFimFormatado,
          motivo: novoBloqueio.motivo || (bloquearDiaCompleto ? 'Dia completo bloqueado' : null),
          tipo: novoBloqueio.tipo
        }] as any);

      if (error) throw error;

      // Recarregar lista de bloqueios imediatamente
      await carregarBloqueios();

      setModalBloqueio(false);
      setBloquearDiaCompleto(false);
      setNovoBloqueio({
        barbeiro_id: "",
        data: format(new Date(), "yyyy-MM-dd"),
        horario_inicio: normalizarHorario(config?.horario_abertura),
        horario_fim: normalizarHorario(config?.horario_fechamento),
        motivo: "",
        tipo: "bloqueio_manual"
      });

      setModalConfig({
        title: "Bloqueio criado",
        message: bloquearDiaCompleto 
          ? "Dia completo bloqueado com sucesso!" 
          : "Horário bloqueado com sucesso!",
        type: "success"
      });
      setModalAberto(true);
    } catch (error: any) {
      setModalConfig({
        title: "Erro",
        message: `Erro ao criar bloqueio: ${error.message}`,
        type: "error"
      });
      setModalAberto(true);
    } finally {
      setSalvando(false);
    }
  };

  const removerBloqueio = async (id: string) => {
    setConfirmarRemocao({ aberto: true, id });
  };

  const confirmarRemocaoBloqueio = async () => {
    if (!confirmarRemocao.id) return;

    try {
      const { error } = await supabase
        .from('horarios_bloqueados')
        .delete()
        .eq('id', confirmarRemocao.id);

      if (error) throw error;

      // Recarregar lista de bloqueios imediatamente
      await carregarBloqueios();

      setConfirmarRemocao({ aberto: false, id: null });
      setModalConfig({
        title: "Sucesso",
        message: "Bloqueio removido com sucesso!",
        type: "success"
      });
      setModalAberto(true);
    } catch (error: any) {
      setModalConfig({
        title: "Erro",
        message: `Erro ao remover: ${error.message}`,
        type: "error"
      });
      setModalAberto(true);
    }
  };

  const diasSemana = [
    { valor: "seg", label: "Segunda" },
    { valor: "ter", label: "Terça" },
    { valor: "qua", label: "Quarta" },
    { valor: "qui", label: "Quinta" },
    { valor: "sex", label: "Sexta" },
    { valor: "sab", label: "Sábado" },
    { valor: "dom", label: "Domingo" }
  ];

  const toggleDia = (dia: string) => {
    if (!config) return;
    
    const dias = config.dias_funcionamento || [];
    const novos = dias.includes(dia)
      ? dias.filter(d => d !== dia)
      : [...dias, dia];
    
    setConfig({ ...config, dias_funcionamento: novos });
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-zinc-600 dark:text-zinc-400">
          Erro ao carregar configurações
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs.Root value={abaHorario} onValueChange={(value) => setAbaHorario(value as "configurar" | "bloquear")}>
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
          <Tabs.List className="grid grid-cols-1 gap-2 bg-transparent sm:grid-cols-2">
            <Tabs.Trigger value="configurar" className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl">
              <Clock className="h-4 w-4" />
              Configurar horário
            </Tabs.Trigger>
            <Tabs.Trigger value="bloquear" className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl">
              <CalendarX className="h-4 w-4" />
              Bloquear horário
            </Tabs.Trigger>
          </Tabs.List>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {abaHorario === "configurar"
              ? "Ajuste expediente, intervalo de almoço, frequência dos horários e personalização por dia."
              : "Crie bloqueios pontuais, acompanhe a agenda bloqueada e remova bloqueios quando necessário."}
          </p>
        </div>

        <Tabs.Content value="configurar" className="mt-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
          >
            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {config.aberta ? (
                  <Unlock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Status do estabelecimento
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {config.aberta ? "Aberto para agendamentos" : "Fechado para novos agendamentos"}
                  </p>
                </div>
              </div>

              <Button
                onClick={alternarStatus}
                disabled={salvando}
                color={config.aberta ? "red" : "green"}
                size="3"
                className="w-full sm:w-auto"
              >
                {config.aberta ? "Fechar" : "Abrir"} {terminologia.estabelecimento.singular}
              </Button>
            </div>

            {!config.aberta && (
              <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Mensagem de fechamento
                </label>
                <TextArea
                  value={config.mensagem_fechamento || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig({ ...config, mensagem_fechamento: e.target.value })}
                  placeholder="Ex: Fechado para manutenção. Voltamos em breve."
                  rows={3}
                />
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
          >
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Configuração de horário
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Defina horário padrão, dias ativos e ajustes personalizados por dia.
              </p>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Expediente padrão
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Horários usados como base para geração dos slots.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Abertura
                    </label>
                    <TextField.Root
                      type="time"
                      value={config.horario_abertura}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, horario_abertura: e.target.value })}
                      size="3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Fechamento
                    </label>
                    <TextField.Root
                      type="time"
                      value={config.horario_fechamento}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, horario_fechamento: e.target.value })}
                      size="3"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Intervalo de almoço
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Opcional. Preencha início e fim para bloquear essa faixa na agenda.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Início
                    </label>
                    <TextField.Root
                      type="time"
                      value={config.intervalo_almoco_inicio || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, intervalo_almoco_inicio: e.target.value || null })}
                      placeholder="12:00"
                      size="3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      Fim
                    </label>
                    <TextField.Root
                      type="time"
                      value={config.intervalo_almoco_fim || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, intervalo_almoco_fim: e.target.value || null })}
                      placeholder="14:00"
                      size="3"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Intervalo entre horários
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Define de quanto em quanto tempo os horários de agendamento são exibidos.
                </p>
                <div className="mt-4 space-y-3">
                  <Select.Root
                    value={intervaloPersonalizado ? "personalizado" : String(config.intervalo_horarios || 20)}
                    onValueChange={(value: string) => {
                      if (value === "personalizado") {
                        setIntervaloPersonalizado(true);
                        setValorIntervaloPersonalizado(String(config.intervalo_horarios || 20));
                        return;
                      }
                      setIntervaloPersonalizado(false);
                      setConfig({ ...config, intervalo_horarios: Number(value) });
                    }}
                    size="3"
                  >
                    <Select.Trigger className="w-full max-w-full min-w-0" />
                    <Select.Content
                      position="popper"
                      sideOffset={5}
                      className="max-h-[60vh] w-[min(420px,calc(100vw-24px))] overflow-y-auto"
                    >
                      <Select.Group>
                        <Select.Label className="px-2 py-1 text-xs text-zinc-500">Intervalos curtos</Select.Label>
                        <Select.Item value="5">5 minutos</Select.Item>
                        <Select.Item value="10">10 minutos</Select.Item>
                        <Select.Item value="15">15 minutos</Select.Item>
                      </Select.Group>
                      <Select.Separator />
                      <Select.Group>
                        <Select.Label className="px-2 py-1 text-xs text-zinc-500">Intervalos médios</Select.Label>
                        <Select.Item value="20">20 minutos</Select.Item>
                        <Select.Item value="30">30 minutos</Select.Item>
                      </Select.Group>
                      <Select.Separator />
                      <Select.Group>
                        <Select.Label className="px-2 py-1 text-xs text-zinc-500">Intervalos longos</Select.Label>
                        <Select.Item value="45">45 minutos</Select.Item>
                        <Select.Item value="60">60 minutos</Select.Item>
                      </Select.Group>
                      <Select.Separator />
                      <Select.Group>
                        <Select.Label className="px-2 py-1 text-xs text-zinc-500">Outros</Select.Label>
                        <Select.Item value="25">25 minutos</Select.Item>
                        <Select.Item value="35">35 minutos</Select.Item>
                        <Select.Item value="40">40 minutos</Select.Item>
                        <Select.Item value="personalizado">Valor personalizado</Select.Item>
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>

                  {intervaloPersonalizado && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/70">
                      <label className="mb-2 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        Digite o intervalo em minutos
                      </label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="5"
                            max="120"
                            step="5"
                            inputMode="numeric"
                            value={valorIntervaloPersonalizado}
                            onChange={(e) => setValorIntervaloPersonalizado(e.target.value)}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-center text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-zinc-500 sm:w-28"
                            placeholder="25"
                          />
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">min</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => {
                              const valor = Number(valorIntervaloPersonalizado);
                              if (Number.isFinite(valor) && valor >= 5 && valor <= 120) {
                                const valorNormalizado = Math.max(5, Math.min(120, Math.round(valor / 5) * 5));
                                setConfig({ ...config, intervalo_horarios: valorNormalizado });
                                setIntervaloPersonalizado(false);
                              }
                            }}
                            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                          >
                            Aplicar
                          </button>
                          <button
                            type="button"
                            onClick={() => setIntervaloPersonalizado(false)}
                            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Dias de funcionamento
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Selecione os dias ativos para atendimento e agendamento.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {diasSemana.map((dia) => (
                    <Button
                      key={dia.valor}
                      onClick={() => toggleDia(dia.valor)}
                      variant={config.dias_funcionamento?.includes(dia.valor) ? "solid" : "outline"}
                      color="gray"
                      size="2"
                      className="h-11 w-full justify-center text-sm font-medium"
                    >
                      {dia.label.substring(0, 3)}
                    </Button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  {config.dias_funcionamento?.length || 0} dia(s) selecionado(s)
                </p>
              </section>

              <section className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Horários personalizados por dia
                    </h4>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Ative para configurar horários diferentes em cada dia da semana.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {config.usar_horarios_personalizados ? "Ativado" : "Desativado"}
                    </span>
                    <Switch
                      checked={config.usar_horarios_personalizados || false}
                      onCheckedChange={(checked) => setConfig({ ...config, usar_horarios_personalizados: checked })}
                      size="3"
                    />
                  </div>
                </div>

                {config.usar_horarios_personalizados ? (
                  <div className="mt-4 space-y-3">
                    {diasSemana.filter((dia) => config.dias_funcionamento?.includes(dia.valor)).map((dia) => {
                      const horarioDia = config.horarios_personalizados?.[dia.valor as keyof HorariosPersonalizados] || {
                        abertura: config.horario_abertura,
                        fechamento: config.horario_fechamento,
                        almoco_inicio: config.intervalo_almoco_inicio,
                        almoco_fim: config.intervalo_almoco_fim
                      };

                      return (
                        <div key={dia.valor} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                          <h5 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{dia.label}</h5>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Abertura
                              </label>
                              <TextField.Root
                                type="time"
                                value={horarioDia.abertura}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const novosHorarios = {
                                    ...config.horarios_personalizados,
                                    [dia.valor]: {
                                      ...horarioDia,
                                      abertura: e.target.value
                                    }
                                  };
                                  setConfig({ ...config, horarios_personalizados: novosHorarios });
                                }}
                                size="2"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Fechamento
                              </label>
                              <TextField.Root
                                type="time"
                                value={horarioDia.fechamento}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const novosHorarios = {
                                    ...config.horarios_personalizados,
                                    [dia.valor]: {
                                      ...horarioDia,
                                      fechamento: e.target.value
                                    }
                                  };
                                  setConfig({ ...config, horarios_personalizados: novosHorarios });
                                }}
                                size="2"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Início almoço (opcional)
                              </label>
                              <TextField.Root
                                type="time"
                                value={horarioDia.almoco_inicio || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const novosHorarios = {
                                    ...config.horarios_personalizados,
                                    [dia.valor]: {
                                      ...horarioDia,
                                      almoco_inicio: e.target.value || null
                                    }
                                  };
                                  setConfig({ ...config, horarios_personalizados: novosHorarios });
                                }}
                                placeholder="12:00"
                                size="2"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Fim almoço (opcional)
                              </label>
                              <TextField.Root
                                type="time"
                                value={horarioDia.almoco_fim || ""}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                  const novosHorarios = {
                                    ...config.horarios_personalizados,
                                    [dia.valor]: {
                                      ...horarioDia,
                                      almoco_fim: e.target.value || null
                                    }
                                  };
                                  setConfig({ ...config, horarios_personalizados: novosHorarios });
                                }}
                                placeholder="14:00"
                                size="2"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              const novosHorarios = {
                                ...config.horarios_personalizados,
                                [dia.valor]: {
                                  abertura: config.horario_abertura,
                                  fechamento: config.horario_fechamento,
                                  almoco_inicio: config.intervalo_almoco_inicio,
                                  almoco_fim: config.intervalo_almoco_fim
                                }
                              };
                              setConfig({ ...config, horarios_personalizados: novosHorarios });
                            }}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            <Clock className="h-3 w-3" />
                            Copiar horário padrão
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                    Quando ativado, você poderá configurar exceções para cada dia da semana.
                  </p>
                )}
              </section>
            </div>

            <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
              <Button
                onClick={() => carregarDados()}
                variant="soft"
                color="gray"
                size="3"
                disabled={salvando}
                className="w-full sm:w-auto"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={salvarConfiguracao}
                disabled={salvando}
                size="3"
                color="green"
                className="w-full sm:min-w-[220px]"
              >
                {salvando ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar configurações
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </Tabs.Content>

        <Tabs.Content value="bloquear" className="mt-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
          >
            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Bloqueios de horário
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Gerencie bloqueios para {terminologia.profissional.plural.toLowerCase()} sem sair desta aba.
                </p>
              </div>

              <Button
                onClick={() => setModalBloqueio(true)}
                size="3"
                color="red"
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo bloqueio
              </Button>
            </div>

            {bloqueios.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
                <CalendarOff className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                <p className="font-medium text-zinc-600 dark:text-zinc-400">Nenhum horário bloqueado</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                  Clique em &quot;Novo bloqueio&quot; para registrar uma indisponibilidade.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bloqueios.map((bloqueio) => {
                  const tipoBloqueio = TIPOS_BLOQUEIO.find((t) => t.valor === bloqueio.tipo) || TIPOS_BLOQUEIO[0];
                  const Icone = tipoBloqueio.icone;

                  return (
                    <motion.div
                      key={bloqueio.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {format(parseISO(`${bloqueio.data}T00:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </span>
                            <Badge color={tipoBloqueio.cor as any}>{tipoBloqueio.label}</Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {normalizarHorario(bloqueio.horario_inicio)} - {normalizarHorario(bloqueio.horario_fim)}
                            </span>
                            {bloqueio.barbeiros && (
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {bloqueio.barbeiros.nome}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Icone className={`h-3.5 w-3.5 ${tipoBloqueio.corIcone}`} />
                              {tipoBloqueio.descricao}
                            </span>
                          </div>

                          {bloqueio.motivo && (
                            <p className="mt-2 break-words text-sm text-zinc-500 dark:text-zinc-500">
                              {bloqueio.motivo}
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={() => removerBloqueio(bloqueio.id)}
                          color="red"
                          variant="soft"
                          size="2"
                          className="w-full sm:w-auto"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Modal de Novo Bloqueio */}
      <ModalPortal aberto={modalBloqueio} onFechar={() => { setModalBloqueio(false); setBloquearDiaCompleto(false); }}>
        <div className="max-h-[90vh] w-full max-w-[min(44rem,calc(100vw-16px))] overflow-x-hidden overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          {/* Header do Modal */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <CalendarX className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Novo bloqueio</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Bloqueie horários para {terminologia.profissional.plural.toLowerCase()}
                </p>
              </div>
            </div>
            <button 
              onClick={() => { setModalBloqueio(false); setBloquearDiaCompleto(false); }} 
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Profissional */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                {terminologia.profissional.singular} (opcional)
              </label>
              <Select.Root
                value={novoBloqueio.barbeiro_id || "all"}
                onValueChange={(value) => setNovoBloqueio({ ...novoBloqueio, barbeiro_id: value === "all" ? "" : value })}
              >
                <Select.Trigger className="w-full" placeholder={`Tod${terminologia.profissional.artigoPlural} ${terminologia.profissional.plural.toLowerCase()}`} />
                <Select.Content>
                  <Select.Item value="all">Tod{terminologia.profissional.artigoPlural} {terminologia.profissional.plural.toLowerCase()}</Select.Item>
                  {barbeiros.map(b => (
                    <Select.Item key={b.id} value={b.id}>{b.nome}</Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                Deixe em branco para bloquear para tod{terminologia.profissional.artigoPlural} {terminologia.profissional.plural.toLowerCase()}
              </p>
            </div>

            {/* Tipo de Bloqueio */}
            <div>
              <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Tipo de Bloqueio
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {TIPOS_BLOQUEIO.map((tipo) => {
                  const Icone = tipo.icone;
                  const selecionado = novoBloqueio.tipo === tipo.valor;
                  return (
                    <button
                      key={tipo.valor}
                      onClick={() => setNovoBloqueio({ ...novoBloqueio, tipo: tipo.valor })}
                      className={`p-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        selecionado
                          ? `${tipo.corFundo} ${tipo.corBorda} border-2`
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                      }`}
                    >
                      <Icone className={`w-5 h-5 mx-auto mb-1.5 ${
                        selecionado ? tipo.corIcone : 'text-zinc-400'
                      }`} />
                      <span className={`text-xs font-medium block ${
                        selecionado ? 'text-zinc-900 dark:text-white' : 'text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {tipo.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Descrição do tipo selecionado */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic">
                {TIPOS_BLOQUEIO.find(t => t.valor === novoBloqueio.tipo)?.descricao}
              </p>
            </div>

            {/* Calendário para selecionar data */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                Selecione a Data
              </label>
              <CalendarioInterativo
                dataSelecionada={novoBloqueio.data}
                onSelecionarData={(data) => setNovoBloqueio({ ...novoBloqueio, data })}
                bloqueios={bloqueios.map(b => ({ data: b.data }))}
              />
            </div>

            {/* Toggle para Bloquear Dia Completo */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700">
                    <Sun className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">Bloquear dia completo</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Bloqueia do horário de abertura ao fechamento
                    </p>
                  </div>
                </div>
                <Switch
                  checked={bloquearDiaCompleto}
                  onCheckedChange={(checked) => {
                    setBloquearDiaCompleto(checked);
                    if (checked) {
                      const horarios = obterHorariosDoDia(novoBloqueio.data);
                      setNovoBloqueio(prev => ({
                        ...prev,
                        horario_inicio: horarios.inicio,
                        horario_fim: horarios.fim
                      }));
                    }
                  }}
                  size="3"
                />
              </div>
              {bloquearDiaCompleto && (
                <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Horário aplicado: <strong>{obterHorariosDoDia(novoBloqueio.data).inicio}</strong> às <strong>{obterHorariosDoDia(novoBloqueio.data).fim}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Seletor de Horário (apenas se não for dia completo) */}
            {!bloquearDiaCompleto && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                <SeletorHorarioInterativo
                  horarioInicio={normalizarHorario(novoBloqueio.horario_inicio)}
                  horarioFim={normalizarHorario(novoBloqueio.horario_fim)}
                  onInicioChange={(horario) => setNovoBloqueio({ ...novoBloqueio, horario_inicio: horario })}
                  onFimChange={(horario) => setNovoBloqueio({ ...novoBloqueio, horario_fim: horario })}
                  intervalo={config?.intervalo_horarios || 20}
                  minHorario={normalizarHorario(config?.horario_abertura) || "08:00"}
                  maxHorario={normalizarHorario(config?.horario_fechamento) || "20:00"}
                />
              </div>
            )}

            {/* Motivo */}
            <div>
              <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Motivo (opcional)
              </label>
              <TextArea
                value={novoBloqueio.motivo}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNovoBloqueio({ ...novoBloqueio, motivo: e.target.value })}
                placeholder={`Ex: Feriado nacional, Folga d${terminologia.profissional.artigo} ${terminologia.profissional.singular.toLowerCase()}, Manutenção...`}
                rows={2}
                className="w-full"
              />
            </div>

            {/* Resumo */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700">
                  <AlertCircle className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="flex-1">
                  <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Resumo do Bloqueio
                  </p>
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span>{format(parseISO(novoBloqueio.data), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
                    </p>
                    <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <Clock className="w-4 h-4" />
                      <span>
                        {bloquearDiaCompleto 
                          ? `${obterHorariosDoDia(novoBloqueio.data).inicio} às ${obterHorariosDoDia(novoBloqueio.data).fim} (dia completo)`
                          : `${normalizarHorario(novoBloqueio.horario_inicio)} às ${normalizarHorario(novoBloqueio.horario_fim)}`
                        }
                      </span>
                    </p>
                    {novoBloqueio.barbeiro_id && (
                      <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <User className="w-4 h-4" />
                        <span>{barbeiros.find(b => b.id === novoBloqueio.barbeiro_id)?.nome}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {(() => {
                        const tipoSelecionado = TIPOS_BLOQUEIO.find(t => t.valor === novoBloqueio.tipo);
                        const Icone = tipoSelecionado?.icone || Lock;
                        return (
                          <>
                            <Icone className="w-4 h-4" />
                            <span>{tipoSelecionado?.label}</span>
                          </>
                        );
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800 sm:flex-row">
            <button
              onClick={() => { setModalBloqueio(false); setBloquearDiaCompleto(false); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={criarBloqueio}
              disabled={salvando}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Criando...
                </>
              ) : (
                <>
                  <CalendarX className="w-4 h-4" />
                  {bloquearDiaCompleto ? 'Bloquear Dia Completo' : 'Criar Bloqueio'}
                </>
              )}
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Modal de Confirmação de Remoção */}
      <ModalPortal aberto={confirmarRemocao.aberto} onFechar={() => setConfirmarRemocao({ aberto: false, id: null })}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            Confirmar Remoção
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            Tem certeza que deseja remover este bloqueio? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmarRemocao({ aberto: false, id: null })}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarRemocaoBloqueio}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          </div>
        </div>
      </ModalPortal>

      {/* Modal de Feedback */}
      {modalConfig && (
        <Modal
          isOpen={modalAberto}
          onClose={() => setModalAberto(false)}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
        />
      )}
    </div>
  );
}
