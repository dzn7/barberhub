"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Clock, Calendar, Lock, Unlock, AlertCircle, 
  Plus, Trash2, Save, X, History, Settings, User,
  CalendarOff, Coffee, Palmtree, Wrench, Heart,
  CalendarX, Sun, Moon
} from "lucide-react";
import { Button, TextField, Select, Switch, Badge, TextArea } from "@radix-ui/themes";
import { format, parse, addDays, parseISO, getDay } from "date-fns";
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
  
  const [barbeiros, setBarbeiros] = useState<BarbeiroSimples[]>([]);
  const [modalConfig, setModalConfig] = useState<ModalConfigState | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState<{aberto: boolean, id: string | null}>({
    aberto: false,
    id: null
  });
  const [intervaloPersonalizado, setIntervaloPersonalizado] = useState(false);
  const [valorIntervaloPersonalizado, setValorIntervaloPersonalizado] = useState("");

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
        "⚠️ ATENÇÃO!\n\nDeseja realmente FECHAR a barbearia?\n\nClientes não poderão fazer novos agendamentos."
      );
      
      if (!confirmacao1) return;
      
      const confirmacao2 = confirm(
        "🔒 CONFIRMAÇÃO FINAL\n\nTem certeza? Esta ação fechará a barbearia para agendamentos.\n\nClique OK para confirmar ou Cancelar para manter aberta."
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
        title: novoStatus ? "✅ Barbearia Aberta" : "🔒 Barbearia Fechada",
        message: novoStatus 
          ? "A barbearia está aberta para agendamentos. Clientes podem agendar normalmente."
          : "A barbearia foi fechada. Clientes não poderão agendar novos horários.",
        type: "success"
      });
      setModalAberto(true);
      
      setConfig({ ...config, aberta: novoStatus });
    } catch (error: any) {
      setModalConfig({
        title: "❌ Erro",
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
        title: "✅ Sucesso",
        message: "Configurações salvas com sucesso!",
        type: "success"
      });
      setModalAberto(true);
    } catch (error: any) {
      setModalConfig({
        title: "❌ Erro",
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
        title: "✅ Bloqueio Criado",
        message: bloquearDiaCompleto 
          ? "Dia completo bloqueado com sucesso!" 
          : "Horário bloqueado com sucesso!",
        type: "success"
      });
      setModalAberto(true);
    } catch (error: any) {
      setModalConfig({
        title: "❌ Erro",
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
      {/* Status da Barbearia */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {config.aberta ? (
              <Unlock className="w-6 h-6 text-green-500" />
            ) : (
              <Lock className="w-6 h-6 text-red-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Status da Barbearia
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {config.aberta ? "Aberta para agendamentos" : "Fechada"}
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
            {config.aberta ? "Fechar" : "Abrir"} Barbearia
          </Button>
        </div>

        {!config.aberta && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Mensagem de Fechamento
            </label>
            <TextArea
              value={config.mensagem_fechamento || ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfig({ ...config, mensagem_fechamento: e.target.value })}
              placeholder="Ex: Fechado para manutenção. Voltamos em breve!"
              rows={3}
            />
          </div>
        )}
      </motion.div>

      {/* Configurações de Horário */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Horários de Funcionamento
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Configure os horários de abertura, fechamento e intervalo de almoço
            </p>
          </div>
        </div>

        {/* Horário Principal */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-6 mb-6 border-2 border-blue-200 dark:border-blue-800">
          <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horário de Expediente
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Unlock className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                🕐 Horário de Abertura
              </label>
              <TextField.Root
                type="time"
                value={config.horario_abertura}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, horario_abertura: e.target.value })}
                size="3"
                className="text-lg font-semibold"
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                Quando a barbearia abre para atendimento
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                🕐 Horário de Fechamento
              </label>
              <TextField.Root
                type="time"
                value={config.horario_fechamento}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, horario_fechamento: e.target.value })}
                size="3"
                className="text-lg font-semibold"
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                Quando a barbearia fecha
              </p>
            </div>
          </div>
        </div>

        {/* Intervalo de Almoço */}
        <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900/50 dark:to-zinc-800/50 rounded-xl p-6 border-2 border-zinc-200 dark:border-zinc-700">
          <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            Intervalo de Almoço (Opcional)
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Defina o horário em que não haverá atendimentos para o almoço
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                ⏰ Início do Almoço
              </label>
              <TextField.Root
                type="time"
                value={config.intervalo_almoco_inicio || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, intervalo_almoco_inicio: e.target.value || null })}
                placeholder="Ex: 12:00"
                size="3"
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                Deixe vazio se não houver intervalo
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
              <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                ⏰ Fim do Almoço
              </label>
              <TextField.Root
                type="time"
                value={config.intervalo_almoco_fim || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig({ ...config, intervalo_almoco_fim: e.target.value || null })}
                placeholder="Ex: 14:00"
                size="3"
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                Quando os atendimentos retornam
              </p>
            </div>
          </div>
        </div>

        {/* Intervalo entre Horários */}
        <div className="mt-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 rounded-xl p-6 border-2 border-teal-200 dark:border-teal-800">
          <h4 className="text-lg font-semibold text-teal-900 dark:text-teal-100 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Intervalo entre Horários
          </h4>
          <p className="text-sm text-teal-700 dark:text-teal-300 mb-4">
            Defina o espaçamento entre os horários disponíveis para agendamento
          </p>
          
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
            <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
              ⏱️ Intervalo (em minutos)
            </label>
            <Select.Root
              value={intervaloPersonalizado ? "personalizado" : String(config.intervalo_horarios || 20)}
              onValueChange={(value: string) => {
                if (value === "personalizado") {
                  setIntervaloPersonalizado(true);
                  setValorIntervaloPersonalizado(String(config.intervalo_horarios || 20));
                } else {
                  setIntervaloPersonalizado(false);
                  setConfig({ ...config, intervalo_horarios: Number(value) });
                }
              }}
              size="3"
            >
              <Select.Trigger className="w-full max-w-full" />
              <Select.Content position="popper" sideOffset={5}>
                <Select.Group>
                  <Select.Label className="text-xs text-zinc-500 px-2 py-1">Intervalos Curtos</Select.Label>
                  <Select.Item value="5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">5 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:05, 08:10...)</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">10 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:10, 08:20...)</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="15">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">15 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:15, 08:30...)</span>
                    </div>
                  </Select.Item>
                </Select.Group>
                <Select.Separator />
                <Select.Group>
                  <Select.Label className="text-xs text-zinc-500 px-2 py-1">Intervalos Médios</Select.Label>
                  <Select.Item value="20">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">20 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:20, 08:40...)</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="30">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">30 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:30, 09:00...)</span>
                    </div>
                  </Select.Item>
                </Select.Group>
                <Select.Separator />
                <Select.Group>
                  <Select.Label className="text-xs text-zinc-500 px-2 py-1">Intervalos Longos</Select.Label>
                  <Select.Item value="45">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">45 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:45, 09:30...)</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="60">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">60 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 09:00, 10:00...)</span>
                    </div>
                  </Select.Item>
                </Select.Group>
                <Select.Separator />
                <Select.Group>
                  <Select.Label className="text-xs text-zinc-500 px-2 py-1">Outros</Select.Label>
                  <Select.Item value="25">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">25 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:25, 08:50...)</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="35">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">35 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:35, 09:10...)</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="40">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">40 minutos</span>
                      <span className="text-xs text-zinc-500">(Ex: 08:00, 08:40, 09:20...)</span>
                    </div>
                  </Select.Item>
                  <Select.Item value="personalizado">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-semibold">✏️ Personalizado</span>
                      <span className="text-xs text-zinc-500">(Digite o valor desejado)</span>
                    </div>
                  </Select.Item>
                </Select.Group>
              </Select.Content>
            </Select.Root>
            
            {/* Input para intervalo personalizado */}
            {intervaloPersonalizado && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <label className="block text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Digite o intervalo desejado (em minutos):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={valorIntervaloPersonalizado}
                    onChange={(e) => setValorIntervaloPersonalizado(e.target.value)}
                    className="w-24 px-3 py-2 bg-white dark:bg-zinc-800 border border-amber-300 dark:border-amber-700 rounded-lg text-zinc-900 dark:text-white text-center font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="25"
                  />
                  <span className="text-sm text-amber-700 dark:text-amber-300">minutos</span>
                  <button
                    type="button"
                    onClick={() => {
                      const valor = parseInt(valorIntervaloPersonalizado);
                      if (valor >= 1 && valor <= 120) {
                        setConfig({ ...config, intervalo_horarios: valor });
                        setIntervaloPersonalizado(false);
                      }
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntervaloPersonalizado(false)}
                    className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Valor atual: <strong>{config.intervalo_horarios} minutos</strong>
                </p>
              </div>
            )}
            
            <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
              <p className="text-xs text-teal-700 dark:text-teal-300">
                💡 <strong>Dica:</strong> Intervalos menores (15-20 min) permitem mais flexibilidade, 
                enquanto intervalos maiores (30 min) facilitam o gerenciamento.
              </p>
            </div>
          </div>
        </div>

        {/* Dias de Funcionamento */}
        <div className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800">
          <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Dias de Funcionamento
          </h4>
          <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
            Selecione os dias da semana em que a barbearia funciona
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {diasSemana.map(dia => (
              <Button
                key={dia.valor}
                onClick={() => toggleDia(dia.valor)}
                variant={config.dias_funcionamento?.includes(dia.valor) ? "solid" : "outline"}
                color={config.dias_funcionamento?.includes(dia.valor) ? "purple" : "gray"}
                size="3"
                className="h-16 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-lg font-bold">{dia.label.substring(0, 3)}</span>
                <span className="text-xs opacity-75">{dia.label}</span>
              </Button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
            <AlertCircle className="w-4 h-4" />
            <span>
              {config.dias_funcionamento?.length || 0} dia(s) selecionado(s)
            </span>
          </div>
        </div>

        {/* Horários Personalizados por Dia */}
        <div className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl p-6 border-2 border-emerald-200 dark:border-emerald-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h4 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-1 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Horários Personalizados por Dia
              </h4>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Configure horários diferentes para cada dia da semana
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {config.usar_horarios_personalizados ? 'Ativado' : 'Desativado'}
              </span>
              <Switch
                checked={config.usar_horarios_personalizados || false}
                onCheckedChange={(checked) => setConfig({ ...config, usar_horarios_personalizados: checked })}
                size="3"
              />
            </div>
          </div>

          {config.usar_horarios_personalizados && (
            <div className="space-y-4 mt-6">
              {diasSemana.filter(dia => config.dias_funcionamento?.includes(dia.valor)).map(dia => {
                const horarioDia = config.horarios_personalizados?.[dia.valor as keyof HorariosPersonalizados] || {
                  abertura: config.horario_abertura,
                  fechamento: config.horario_fechamento,
                  almoco_inicio: config.intervalo_almoco_inicio,
                  almoco_fim: config.intervalo_almoco_fim
                };

                return (
                  <div key={dia.valor} className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                    <h5 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                          {dia.label.substring(0, 3)}
                        </span>
                      </div>
                      {dia.label}
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Abertura e Fechamento */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                            🕐 Abertura
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
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                            🕐 Fechamento
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
                      </div>

                      {/* Intervalo de Almoço */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                            🍽️ Início Almoço (opcional)
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
                            placeholder="Ex: 12:00"
                            size="2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                            🍽️ Fim Almoço (opcional)
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
                            placeholder="Ex: 14:00"
                            size="2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Botão para copiar horário padrão */}
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
                      className="mt-3 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      Usar horário padrão
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!config.usar_horarios_personalizados && (
            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                💡 <strong>Dica:</strong> Ative esta opção para definir horários diferentes para cada dia da semana. 
                Por exemplo, abrir mais cedo na segunda ou fechar mais tarde na sexta.
              </p>
            </div>
          )}
        </div>

        {/* Botão de Salvar */}
        <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
          <Button
            onClick={() => carregarDados()}
            variant="soft"
            color="gray"
            size="3"
            disabled={salvando}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={salvarConfiguracao}
            disabled={salvando}
            size="3"
            color="green"
            className="w-full sm:min-w-[200px]"
          >
            {salvando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Horários Bloqueados */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <CalendarX className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Horários Bloqueados
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Gerencie bloqueios para {terminologia.profissional.plural.toLowerCase()}
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => setModalBloqueio(true)}
            size="3"
            color="red"
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Bloqueio
          </Button>
        </div>

        {bloqueios.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <CalendarOff className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium">Nenhum horário bloqueado</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
              Clique em "Novo Bloqueio" para bloquear horários
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bloqueios.map(bloqueio => {
              const tipoBloqueio = TIPOS_BLOQUEIO.find(t => t.valor === bloqueio.tipo) || TIPOS_BLOQUEIO[0];
              const Icone = tipoBloqueio.icone;
              
              return (
                <motion.div
                  key={bloqueio.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border-2 ${tipoBloqueio.corFundo} ${tipoBloqueio.corBorda}`}
                >
                  <div className="flex items-start gap-3 flex-1 w-full">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tipoBloqueio.corFundo}`}>
                      <Icone className={`w-5 h-5 ${tipoBloqueio.corIcone}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {format(parseISO(`${bloqueio.data}T00:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </span>
                        <Badge color={tipoBloqueio.cor as any}>
                          {tipoBloqueio.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {normalizarHorario(bloqueio.horario_inicio)} - {normalizarHorario(bloqueio.horario_fim)}
                        </span>
                        {bloqueio.barbeiros && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {bloqueio.barbeiros.nome}
                          </span>
                        )}
                      </div>
                      {bloqueio.motivo && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1 italic">
                          "{bloqueio.motivo}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => removerBloqueio(bloqueio.id)}
                    color="red"
                    variant="soft"
                    size="2"
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    <span className="sm:hidden">Remover</span>
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Modal de Novo Bloqueio */}
      <ModalPortal aberto={modalBloqueio} onFechar={() => { setModalBloqueio(false); setBloquearDiaCompleto(false); }}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
          {/* Header do Modal */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <CalendarX className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Novo Bloqueio</h2>
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
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
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
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
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
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">Bloquear Dia Completo</p>
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
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    ⏰ Horário: <strong>{obterHorariosDoDia(novoBloqueio.data).inicio}</strong> às <strong>{obterHorariosDoDia(novoBloqueio.data).fim}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Seletor de Horário (apenas se não for dia completo) */}
            {!bloquearDiaCompleto && (
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
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
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                    Resumo do Bloqueio
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{format(parseISO(novoBloqueio.data), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {bloquearDiaCompleto 
                          ? `${obterHorariosDoDia(novoBloqueio.data).inicio} às ${obterHorariosDoDia(novoBloqueio.data).fim} (dia completo)`
                          : `${normalizarHorario(novoBloqueio.horario_inicio)} às ${normalizarHorario(novoBloqueio.horario_fim)}`
                        }
                      </span>
                    </p>
                    {novoBloqueio.barbeiro_id && (
                      <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{barbeiros.find(b => b.id === novoBloqueio.barbeiro_id)?.nome}</span>
                      </p>
                    )}
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
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
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => { setModalBloqueio(false); setBloquearDiaCompleto(false); }}
              className="flex-1 px-4 py-3 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
            <button
              onClick={criarBloqueio}
              disabled={salvando}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/25"
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
