"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  ChevronLeft, 
  ChevronRight,
  Search,
  CheckCircle,
  XCircle,
  Scissors,
  DollarSign,
  Filter,
  Trash2,
  Plus,
  RefreshCw,
  X
} from "lucide-react";
import { format, addDays, isSameDay, parseISO, startOfDay, isToday, isPast } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { obterEmojiPrincipal, obterTerminologia } from "@/lib/configuracoes-negocio";
import { TipoNegocio } from "@/lib/tipos-negocio";
import { Badge, Button, TextField, Select } from "@radix-ui/themes";
import { PortalModal } from "@/components/ui/PortalModal";
import { ModalRemarcacao } from "./ModalRemarcacao";
import { ModalNovoAgendamento } from "@/components/agendamento";
import { buscarConfiguracaoHorarios, ConfiguracaoHorarios, HORARIOS_PADRAO } from "@/lib/horarios-funcionamento";

const TIMEZONE_BRASILIA = "America/Sao_Paulo";

const BOT_URL = 'https://bot-barberhub.fly.dev';

interface Servico {
  id?: string;
  nome: string;
  preco: number;
  duracao: number;
}

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  observacoes?: string;
  barbeiro_id: string;
  servicos_ids?: string[];
  clientes: {
    nome: string;
    telefone: string;
  };
  barbeiros: {
    id: string;
    nome: string;
  };
  servicos: Servico;
  servicosMultiplos?: Servico[];
}

// Função auxiliar para obter informações de serviços
function obterInfoServicos(agendamento: Agendamento) {
  const { servicos, servicosMultiplos } = agendamento;
  
  if (servicosMultiplos && servicosMultiplos.length > 1) {
    const nomes = servicosMultiplos.map(s => s.nome);
    const precoTotal = servicosMultiplos.reduce((acc, s) => acc + (s.preco || 0), 0);
    const duracaoTotal = servicosMultiplos.reduce((acc, s) => acc + (s.duracao || 0), 0);
    
    return {
      nome: nomes.join(' + '),
      nomesCurtos: nomes.length > 2 ? `${nomes[0]} +${nomes.length - 1}` : nomes.join(' + '),
      preco: precoTotal,
      duracao: duracaoTotal,
      quantidade: servicosMultiplos.length
    };
  }
  
  return {
    nome: servicos?.nome || 'Serviço',
    nomesCurtos: servicos?.nome || 'Serviço',
    preco: servicos?.preco || 0,
    duracao: servicos?.duracao || 30,
    quantidade: 1
  };
}

const STATUS_CONFIG = {
  pendente: { 
    bg: "bg-amber-50/80 dark:bg-amber-950/30", 
    border: "border-l-[3px] border-l-amber-400", 
    badge: "yellow" as const,
    textColor: "text-amber-700 dark:text-amber-400",
    ponto: "bg-amber-400"
  },
  confirmado: { 
    bg: "bg-teal-50/80 dark:bg-teal-950/30", 
    border: "border-l-[3px] border-l-teal-400", 
    badge: "teal" as const,
    textColor: "text-teal-700 dark:text-teal-400",
    ponto: "bg-teal-400"
  },
  concluido: { 
    bg: "bg-emerald-50/80 dark:bg-emerald-950/30", 
    border: "border-l-[3px] border-l-emerald-400", 
    badge: "green" as const,
    textColor: "text-emerald-700 dark:text-emerald-400",
    ponto: "bg-emerald-400"
  },
  cancelado: { 
    bg: "bg-rose-50/80 dark:bg-rose-950/30", 
    border: "border-l-[3px] border-l-rose-400", 
    badge: "red" as const,
    textColor: "text-rose-700 dark:text-rose-400",
    ponto: "bg-rose-400"
  },
  nao_compareceu: { 
    bg: "bg-zinc-50/80 dark:bg-zinc-900/30", 
    border: "border-l-[3px] border-l-zinc-400", 
    badge: "gray" as const,
    textColor: "text-zinc-700 dark:text-zinc-400",
    ponto: "bg-zinc-400"
  },
};

export function CalendarioAgendamentos() {
  const { tenant } = useAuth();
  const [dataInicio, setDataInicio] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [modalConcluirTodos, setModalConcluirTodos] = useState(false);
  const [diaSelecionadoConcluir, setDiaSelecionadoConcluir] = useState<Date | null>(null);
  const [modalRemarcacaoAberto, setModalRemarcacaoAberto] = useState(false);
  
  // Estado para novo agendamento
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  
  // Configuração de horários e dias de funcionamento
  const [configHorarios, setConfigHorarios] = useState<ConfiguracaoHorarios>(HORARIOS_PADRAO);
  const [diasFuncionamento, setDiasFuncionamento] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex', 'sab']);

  // Mapeamento de dia da semana para abreviação
  const DIAS_SEMANA_MAP: Record<number, string> = {
    0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
  };

  // Buscar configuração de horários do tenant
  useEffect(() => {
    const buscarConfiguracao = async () => {
      if (!tenant?.id) return;
      const config = await buscarConfiguracaoHorarios(tenant.id, supabase);
      setConfigHorarios(config);
      setDiasFuncionamento(config.diasFuncionamento);
    };
    buscarConfiguracao();
  }, [tenant?.id]);

  // Calcular próximos 7 dias filtrados por dias de funcionamento
  const diasExibicao = useMemo(() => {
    const todosDias = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(dataInicio), i));
    
    // Filtrar apenas os dias que a barbearia funciona
    const diasFiltrados = todosDias.filter(dia => {
      const diaSemana = dia.getDay();
      const abreviacao = DIAS_SEMANA_MAP[diaSemana];
      return diasFuncionamento.includes(abreviacao);
    });
    
    // Retornar os próximos 7 dias de funcionamento
    return diasFiltrados.slice(0, 7);
  }, [dataInicio, diasFuncionamento]);

  // Buscar agendamentos
  useEffect(() => {
    if (tenant) {
      buscarAgendamentos();
    }
  }, [dataInicio, tenant, diasFuncionamento]);

  const buscarAgendamentos = async () => {
    if (!tenant) return;
    
    try {
      setCarregando(true);
      const inicio = startOfDay(dataInicio);
      const fim = addDays(inicio, 7);

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes (nome, telefone),
          barbeiros (id, nome),
          servicos (id, nome, preco, duracao)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', inicio.toISOString())
        .lt('data_hora', fim.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      
      // Processar múltiplos serviços se existirem
      const agendamentosProcessados = await Promise.all((data || []).map(async (ag) => {
        if (ag.servicos_ids && Array.isArray(ag.servicos_ids) && ag.servicos_ids.length > 1) {
          const { data: servicosMultiplos } = await supabase
            .from('servicos')
            .select('id, nome, preco, duracao')
            .in('id', ag.servicos_ids);
          
          if (servicosMultiplos) {
            return { ...ag, servicosMultiplos };
          }
        }
        return ag;
      }));
      
      setAgendamentos(agendamentosProcessados);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Filtrar agendamentos
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter(ag => {
      const matchBusca = !termoBusca || 
        ag.clientes?.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
        ag.clientes?.telefone.includes(termoBusca);
      
      const matchStatus = filtroStatus === "todos" || ag.status === filtroStatus;
      
      return matchBusca && matchStatus;
    });
  }, [agendamentos, termoBusca, filtroStatus]);

  // Agrupar agendamentos por dia
  const agendamentosPorDia = useMemo(() => {
    const grupos: { [key: string]: Agendamento[] } = {};
    
    diasExibicao.forEach(dia => {
      const dataKey = format(dia, 'yyyy-MM-dd');
      grupos[dataKey] = [];
    });

    agendamentosFiltrados.forEach(ag => {
      const data = format(parseISO(ag.data_hora), 'yyyy-MM-dd');
      if (grupos[data]) {
        grupos[data].push(ag);
      }
    });
    
    return grupos;
  }, [agendamentosFiltrados, diasExibicao]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = agendamentosFiltrados.length;
    const confirmados = agendamentosFiltrados.filter(a => a.status === 'confirmado').length;
    const pendentes = agendamentosFiltrados.filter(a => a.status === 'pendente').length;
    const receita = agendamentosFiltrados
      .filter(a => a.status === 'confirmado' || a.status === 'concluido')
      .reduce((sum, a) => sum + obterInfoServicos(a).preco, 0);
    
    return { total, confirmados, pendentes, receita };
  }, [agendamentosFiltrados]);

  // Atualizar status
  const atualizarStatus = async (id: string, novoStatus: string) => {
    if (!tenant) return;
    
    try {
      const agendamento = agendamentos.find(ag => ag.id === id);
      if (!agendamento) return;
      
      const updateData: any = { status: novoStatus };
      if (novoStatus === 'concluido') {
        updateData.concluido_em = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('agendamentos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      // Se concluído, criar transação e comissão
      if (novoStatus === 'concluido') {
        await criarTransacaoEComissao(agendamento);
      }
      
      // Se cancelou, notificar cliente via bot
      if (novoStatus === 'cancelado') {
        await notificarCancelamento(agendamento);
      }
      
      buscarAgendamentos();
      setAgendamentoSelecionado(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Criar transação de receita e comissão do barbeiro
  const criarTransacaoEComissao = async (agendamento: Agendamento) => {
    if (!tenant) return;

    try {
      const infoServicos = obterInfoServicos(agendamento);
      const valorServico = infoServicos.preco;
      const barbeiroId = agendamento.barbeiros?.id || agendamento.barbeiro_id;
      const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA);
      const dataFormatada = format(dataBrasilia, 'yyyy-MM-dd');
      const mes = dataBrasilia.getMonth() + 1;
      const ano = dataBrasilia.getFullYear();

      // Buscar percentual de comissão do barbeiro
      const { data: barbeiro } = await supabase
        .from('barbeiros')
        .select('comissao_percentual, total_atendimentos')
        .eq('id', barbeiroId)
        .single();

      const percentualComissao = barbeiro?.comissao_percentual || 40;
      const valorComissao = (valorServico * percentualComissao) / 100;

      // Criar transação de receita
      await supabase
        .from('transacoes')
        .insert({
          tenant_id: tenant.id,
          tipo: 'receita',
          categoria: 'servico',
          descricao: `${infoServicos.nome} - ${agendamento.clientes?.nome}`,
          valor: valorServico,
          data: dataFormatada,
          forma_pagamento: 'dinheiro',
          agendamento_id: agendamento.id,
          barbeiro_id: barbeiroId
        });

      // Criar registro de comissão
      await supabase
        .from('comissoes')
        .insert({
          tenant_id: tenant.id,
          barbeiro_id: barbeiroId,
          agendamento_id: agendamento.id,
          valor_servico: valorServico,
          percentual_comissao: percentualComissao,
          valor_comissao: valorComissao,
          mes,
          ano,
          pago: false
        });

      // Incrementar total de atendimentos do barbeiro
      await supabase
        .from('barbeiros')
        .update({ total_atendimentos: (barbeiro?.total_atendimentos || 0) + 1 })
        .eq('id', barbeiroId);

    } catch (error) {
      console.error('Erro ao criar transação/comissão:', error);
    }
  };

  // Notificar cancelamento via bot WhatsApp
  const notificarCancelamento = async (agendamento: Agendamento) => {
    try {
      const dataFormatada = format(parseISO(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const tipoNegocio = (tenant?.tipo_negocio as TipoNegocio) || 'barbearia';
      const emoji = obterEmojiPrincipal(tipoNegocio);
      const terminologia = obterTerminologia(tipoNegocio);
      
      const infoServicos = obterInfoServicos(agendamento);
      const mensagem = `❌ *Agendamento Cancelado*\n\nOlá ${agendamento.clientes?.nome}!\n\nSeu agendamento foi cancelado:\n\n📅 *Data:* ${dataFormatada}\n${emoji} *Serviço:* ${infoServicos.nome}\n👤 *${terminologia.profissional.singular}:* ${agendamento.barbeiros?.nome}\n\nSe desejar reagendar, entre em contato ou acesse nosso site.\n\n_${tenant?.nome || 'BarberHub'}_`;

      let telefone = agendamento.clientes?.telefone?.replace(/\D/g, '') || '';
      if (!telefone.startsWith('55')) {
        telefone = '55' + telefone;
      }

      const response = await fetch(`${BOT_URL}/api/mensagens/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: telefone, mensagem }),
      });

      const resultado = await response.json();
      if (resultado.sucesso) {
        console.log('[Cancelamento] ✅ Notificação enviada');
      } else {
        console.error('[Cancelamento] Falha:', resultado.erro);
      }
    } catch (error) {
      console.error('[Cancelamento] Erro ao notificar:', error);
    }
  };

  // Deletar agendamento
  const deletarAgendamento = async () => {
    if (!agendamentoSelecionado) return;
    
    setProcessando(true);
    try {
      // 1. Deletar notificações relacionadas (CASCADE deveria fazer, mas garantindo)
      await supabase
        .from('notificacoes_enviadas')
        .delete()
        .eq('agendamento_id', agendamentoSelecionado.id);

      // 2. Deletar histórico relacionado (CASCADE deveria fazer, mas garantindo)
      await supabase
        .from('historico_agendamentos')
        .delete()
        .eq('agendamento_id', agendamentoSelecionado.id);

      // 3. Setar NULL nas comissões e transações (já é SET NULL, mas garantindo)
      await supabase
        .from('comissoes')
        .update({ agendamento_id: null })
        .eq('agendamento_id', agendamentoSelecionado.id);

      await supabase
        .from('transacoes')
        .update({ agendamento_id: null })
        .eq('agendamento_id', agendamentoSelecionado.id);

      // 4. Deletar o agendamento
      const { error: erroAgendamento } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agendamentoSelecionado.id);

      if (erroAgendamento) throw erroAgendamento;
      
      setModalConfirmacao(false);
      setAgendamentoSelecionado(null);
      buscarAgendamentos();
    } catch (error: any) {
      console.error('Erro ao deletar agendamento:', error);
      alert(`Erro ao deletar agendamento: ${error.message || 'Tente novamente.'}`);
    } finally {
      setProcessando(false);
    }
  };

  const formatarDataHeader = (dia: Date) => {
    if (isToday(dia)) return 'Hoje';
    if (isSameDay(dia, addDays(new Date(), 1))) return 'Amanhã';
    return format(dia, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  // Concluir todos os agendamentos confirmados de um dia
  const concluirTodosAgendamentos = async (dia: Date) => {
    const dataKey = format(dia, 'yyyy-MM-dd');
    const agendamentosDia = agendamentosPorDia[dataKey] || [];
    const agendamentosParaConcluir = agendamentosDia.filter(
      ag => ag.status === 'confirmado' || ag.status === 'pendente'
    );

    if (agendamentosParaConcluir.length === 0) {
      alert('Não há agendamentos confirmados ou pendentes para concluir neste dia.');
      return;
    }

    setDiaSelecionadoConcluir(dia);
    setModalConcluirTodos(true);
  };

  const confirmarConcluirTodos = async () => {
    if (!diaSelecionadoConcluir || !tenant) return;

    setProcessando(true);
    try {
      const dataKey = format(diaSelecionadoConcluir, 'yyyy-MM-dd');
      const agendamentosDia = agendamentosPorDia[dataKey] || [];
      const agendamentosParaConcluir = agendamentosDia.filter(
        ag => ag.status === 'confirmado' || ag.status === 'pendente'
      );

      const idsParaConcluir = agendamentosParaConcluir.map(ag => ag.id);

      // Atualizar todos os agendamentos para concluído
      const { error } = await supabase
        .from('agendamentos')
        .update({ 
          status: 'concluido',
          concluido_em: new Date().toISOString()
        })
        .in('id', idsParaConcluir);

      if (error) throw error;

      // Criar transações e comissões para cada agendamento
      for (const agendamento of agendamentosParaConcluir) {
        await criarTransacaoEComissao(agendamento);
      }

      setModalConcluirTodos(false);
      setDiaSelecionadoConcluir(null);
      buscarAgendamentos();
      
      alert(`✅ ${idsParaConcluir.length} agendamento(s) concluído(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao concluir agendamentos:', error);
      alert('Erro ao concluir agendamentos. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header com Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Total</p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-white">{estatisticas.total}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Confirmados</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{estatisticas.confirmados}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Pendentes</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{estatisticas.pendentes}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Receita Prevista</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            R$ {estatisticas.receita.toFixed(2)}
          </p>
        </motion.div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <TextField.Root
              placeholder="Buscar por nome ou telefone..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              size="3"
            >
              <TextField.Slot>
                <Search className="w-4 h-4" />
              </TextField.Slot>
            </TextField.Root>
          </div>
          
          <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
            <Select.Trigger placeholder="Status" className="w-full sm:w-48" />
            <Select.Content>
              <Select.Item value="todos">Todos os Status</Select.Item>
              <Select.Item value="pendente">Pendentes</Select.Item>
              <Select.Item value="confirmado">Confirmados</Select.Item>
              <Select.Item value="concluido">Concluídos</Select.Item>
              <Select.Item value="cancelado">Cancelados</Select.Item>
            </Select.Content>
          </Select.Root>

          <Button
            onClick={() => setModalNovoAberto(true)}
            className="bg-zinc-900 dark:bg-white text-white dark:text-black cursor-pointer whitespace-nowrap"
            size="3"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Navegação de Período */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between">
          <Button
            variant="soft"
            onClick={() => setDataInicio(addDays(dataInicio, -7))}
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </Button>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {format(diasExibicao[0], "d 'de' MMMM", { locale: ptBR })} - {format(diasExibicao[6], "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h3>
            <Button
              variant="soft"
              size="2"
              onClick={() => setDataInicio(new Date())}
              className="mt-2"
            >
              Hoje
            </Button>
          </div>
          
          <Button
            variant="soft"
            onClick={() => setDataInicio(addDays(dataInicio, 7))}
          >
            Próximo
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Lista de Agendamentos por Dia */}
      <div className="space-y-6">
        {diasExibicao.map((dia) => {
          const dataKey = format(dia, 'yyyy-MM-dd');
          const agendamentosDia = agendamentosPorDia[dataKey] || [];
          const diaPassado = isPast(dia) && !isToday(dia);

          return (
            <motion.div
              key={dataKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
            >
              {/* Header do Dia */}
              <div className={`p-4 border-b border-zinc-200 dark:border-zinc-800 ${
                isToday(dia) ? 'bg-blue-50 dark:bg-blue-950/20' : 
                diaPassado ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold capitalize ${
                      isToday(dia) ? 'text-blue-600 dark:text-blue-400' : 
                      'text-zinc-900 dark:text-white'
                    }`}>
                      {formatarDataHeader(dia)}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {agendamentosDia.length} {agendamentosDia.length === 1 ? 'agendamento' : 'agendamentos'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToday(dia) && (
                      <Badge color="blue" size="2">Hoje</Badge>
                    )}
                    {agendamentosDia.some(ag => ag.status === 'confirmado' || ag.status === 'pendente') && (
                      <Button
                        size="2"
                        color="green"
                        variant="soft"
                        onClick={() => concluirTodosAgendamentos(dia)}
                        className="whitespace-nowrap"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Concluir Todos
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Agendamentos */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {agendamentosDia.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p className="text-zinc-500 dark:text-zinc-400">Nenhum agendamento para este dia</p>
                  </div>
                ) : (
                  agendamentosDia.map((agendamento) => {
                    const config = STATUS_CONFIG[agendamento.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
                    
                    return (
                      <motion.div
                        key={agendamento.id}
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        className={`p-4 sm:p-5 cursor-pointer transition-all rounded-lg mx-2 my-1.5 ${config.bg} ${config.border} hover:shadow-md`}
                        onClick={() => setAgendamentoSelecionado(agendamento)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Informações Principais */}
                          <div className="flex-1 min-w-0">
                            {/* Linha 1: Horário + Status + Cliente */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.ponto}`} />
                              <span className="text-lg font-bold text-zinc-900 dark:text-white tabular-nums">
                                {format(parseISO(agendamento.data_hora), 'HH:mm')}
                              </span>
                              <span className="text-zinc-400 dark:text-zinc-600">•</span>
                              <span className="font-semibold text-zinc-900 dark:text-white truncate">
                                {agendamento.clientes?.nome}
                              </span>
                              <Badge color={config.badge} size="1" className="ml-auto flex-shrink-0 capitalize">
                                {agendamento.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            {/* Linha 2: Serviço + Profissional + Duração + Preço */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                              {(() => {
                                const info = obterInfoServicos(agendamento);
                                return (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <Scissors className="w-3.5 h-3.5" />
                                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                                        {info.nomesCurtos}
                                      </span>
                                      {info.quantidade > 1 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                                          {info.quantidade}x
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3.5 h-3.5" />
                                      <span>{agendamento.barbeiros?.nome}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span>{info.duracao}min</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                      <DollarSign className="w-3.5 h-3.5" />
                                      <span>R$ {info.preco.toFixed(2)}</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>

                            {/* Linha 3: Telefone (opcional) */}
                            {agendamento.clientes?.telefone && (
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                                <Phone className="w-3 h-3" />
                                <span>{agendamento.clientes.telefone}</span>
                              </div>
                            )}

                            {agendamento.observacoes && (
                              <div className="mt-2 p-2 bg-zinc-100/80 dark:bg-zinc-800/50 rounded-md">
                                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                  <strong className="font-medium">Obs:</strong> {agendamento.observacoes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Ações Rápidas */}
                          <div className="flex sm:flex-col gap-2">
                            {agendamento.status === 'pendente' && (
                              <Button
                                size="2"
                                color="green"
                                variant="soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  atualizarStatus(agendamento.id, 'confirmado');
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <a
                              href={`https://wa.me/55${agendamento.clientes?.telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button size="2" color="green" variant="soft">
                                <WhatsAppIcon className="w-4 h-4" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal de Confirmação - Concluir Todos */}
      <AnimatePresence>
        {modalConcluirTodos && diaSelecionadoConcluir && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !processando && setModalConcluirTodos(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      Concluir Todos os Agendamentos
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatarDataHeader(diaSelecionadoConcluir)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    ⚠️ Esta ação irá marcar todos os agendamentos <strong>confirmados e pendentes</strong> deste dia como <strong>concluídos</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setModalConcluirTodos(false)}
                    variant="soft"
                    color="gray"
                    size="3"
                    className="flex-1"
                    disabled={processando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmarConcluirTodos}
                    color="green"
                    size="3"
                    className="flex-1"
                    disabled={processando}
                  >
                    {processando ? 'Processando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes */}
      <PortalModal
        aberto={!!agendamentoSelecionado && !modalRemarcacaoAberto}
        onFechar={() => setAgendamentoSelecionado(null)}
        titulo="Detalhes do Agendamento"
        tamanho="md"
      >
        {agendamentoSelecionado && (
          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge 
                color={STATUS_CONFIG[agendamentoSelecionado.status as keyof typeof STATUS_CONFIG]?.badge || 'gray'}
                size="2"
                className="capitalize"
              >
                {agendamentoSelecionado.status}
              </Badge>
            </div>

            {/* Informações */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 mb-0.5">Data e Hora</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {format(parseISO(agendamentoSelecionado.data_hora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <User className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-500 mb-0.5">Cliente</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">
                    {agendamentoSelecionado.clientes?.nome}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {agendamentoSelecionado.clientes?.telefone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                {(() => {
                  const info = obterInfoServicos(agendamentoSelecionado);
                  return (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500 mb-0.5">
                          Serviço{info.quantidade > 1 ? 's' : ''}
                          {info.quantidade > 1 && (
                            <span className="ml-1 text-emerald-600">({info.quantidade})</span>
                          )}
                        </p>
                        <p className="font-semibold text-zinc-900 dark:text-white truncate">
                          {info.nome}
                        </p>
                        <p className="text-sm text-zinc-500">
                          com {agendamentoSelecionado.barbeiros?.nome} • {info.duracao}min
                        </p>
                      </div>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        R$ {info.preco.toFixed(2)}
                      </span>
                    </>
                  );
                })()}
              </div>

              {agendamentoSelecionado.observacoes && (
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Observações</p>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    {agendamentoSelecionado.observacoes}
                  </p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {/* Ações principais */}
              <div className="grid grid-cols-2 gap-2">
                {agendamentoSelecionado.status !== 'concluido' && (
                  <button
                    onClick={() => atualizarStatus(agendamentoSelecionado.id, 'concluido')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-medium text-sm active:scale-[0.98]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Concluir
                  </button>
                )}
                {agendamentoSelecionado.status === 'pendente' && (
                  <button
                    onClick={() => atualizarStatus(agendamentoSelecionado.id, 'confirmado')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all font-medium text-sm active:scale-[0.98]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </button>
                )}
                <a
                  href={`https://wa.me/55${agendamentoSelecionado.clientes?.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-medium text-sm active:scale-[0.98]"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  WhatsApp
                </a>
                {/* Botão Remarcar */}
                {agendamentoSelecionado.status !== 'concluido' && agendamentoSelecionado.status !== 'cancelado' && (
                  <button
                    onClick={() => {
                      setModalRemarcacaoAberto(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-600 hover:bg-zinc-500 text-white rounded-xl transition-all font-medium text-sm active:scale-[0.98]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Remarcar
                  </button>
                )}
              </div>

              {/* Ações secundárias */}
              <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {agendamentoSelecionado.status !== 'cancelado' && (
                  <button
                    onClick={() => atualizarStatus(agendamentoSelecionado.id, 'cancelado')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all font-medium text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
                <button
                  onClick={() => setModalConfirmacao(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all font-medium text-sm border border-rose-200 dark:border-rose-800"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </PortalModal>

      {/* Modal de Remarcação */}
      {agendamentoSelecionado && (
        <ModalRemarcacao
          agendamento={{
            id: agendamentoSelecionado.id,
            data_hora: agendamentoSelecionado.data_hora,
            status: agendamentoSelecionado.status,
            clientes: agendamentoSelecionado.clientes,
            barbeiros: {
              id: agendamentoSelecionado.barbeiros?.id || agendamentoSelecionado.barbeiro_id,
              nome: agendamentoSelecionado.barbeiros?.nome || ''
            },
            servicos: agendamentoSelecionado.servicos
          }}
          aberto={modalRemarcacaoAberto}
          onFechar={() => setModalRemarcacaoAberto(false)}
          onSucesso={() => {
            buscarAgendamentos();
            setModalRemarcacaoAberto(false);
            setAgendamentoSelecionado(null);
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {modalConfirmacao && agendamentoSelecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => !processando && setModalConfirmacao(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Confirmar Exclusão
                  </h3>
                </div>

                <p className="text-zinc-600 dark:text-zinc-400">
                  Tem certeza que deseja deletar permanentemente o agendamento de{' '}
                  <strong className="text-zinc-900 dark:text-white">
                    {agendamentoSelecionado.clientes?.nome}
                  </strong>?
                </p>

                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    ⚠️ Esta ação não pode ser desfeita. O agendamento será removido permanentemente do sistema.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setModalConfirmacao(false)}
                    variant="soft"
                    className="flex-1"
                    size="3"
                    disabled={processando}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={deletarAgendamento}
                    color="red"
                    className="flex-1"
                    size="3"
                    disabled={processando}
                  >
                    {processando ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        Deletando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Deletar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Novo Agendamento */}
      {tenant && (
        <ModalNovoAgendamento
          tenantId={tenant.id}
          aberto={modalNovoAberto}
          onFechar={() => setModalNovoAberto(false)}
          onSucesso={buscarAgendamentos}
          dataPadrao={format(dataInicio, 'yyyy-MM-dd')}
        />
      )}

      {carregando && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white"></div>
        </div>
      )}
    </div>
  );
}
