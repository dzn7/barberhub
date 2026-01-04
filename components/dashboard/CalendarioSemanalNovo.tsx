"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, ChevronLeft, ChevronRight, Calendar, User, Scissors, 
  CheckCircle, XCircle, Trash2, X, Clock, 
  Phone, DollarSign, MoreVertical, Search, Filter
} from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { format, addDays, startOfWeek, isSameDay, parseISO, subDays, isToday } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const TIMEZONE_BRASILIA = "America/Sao_Paulo";
const BOT_URL = 'https://bot-barberhub.fly.dev';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  observacoes?: string;
  clientes: {
    nome: string;
    telefone: string;
  };
  barbeiros: {
    nome: string;
  };
  servicos: {
    nome: string;
    preco: number;
    duracao: number;
  };
}

const HORAS_DIA = Array.from({ length: 13 }, (_, i) => i + 7);
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ALTURA_HORA = 64;

const STATUS_CONFIG = {
  pendente: { 
    bg: 'bg-zinc-500/90',
    border: 'border-l-zinc-400',
    text: 'text-zinc-50',
    badge: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    dot: 'bg-zinc-400'
  },
  confirmado: { 
    bg: 'bg-sky-500/90',
    border: 'border-l-sky-400',
    text: 'text-sky-50',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    dot: 'bg-sky-400'
  },
  concluido: { 
    bg: 'bg-emerald-500/90',
    border: 'border-l-emerald-400',
    text: 'text-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    dot: 'bg-emerald-400'
  },
  cancelado: { 
    bg: 'bg-rose-500/90',
    border: 'border-l-rose-400',
    text: 'text-rose-50',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    dot: 'bg-rose-400'
  },
};

export function CalendarioSemanalNovo() {
  const { tenant } = useAuth();
  const [diaSelecionado, setDiaSelecionado] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  
  const [novoAgendamento, setNovoAgendamento] = useState({
    clienteNome: "",
    clienteTelefone: "",
    data: format(new Date(), "yyyy-MM-dd"),
    hora: "09:00",
    barbeiroId: "",
    servicoId: "",
  });
  
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const subscriptionRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calcular semana
  const diasSemana = useMemo(() => {
    const inicioDaSemana = startOfWeek(diaSelecionado, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicioDaSemana, i));
  }, [diaSelecionado]);

  // Título do período
  const tituloPeriodo = useMemo(() => {
    const inicio = diasSemana[0];
    const fim = diasSemana[6];
    if (inicio.getMonth() === fim.getMonth()) {
      return format(inicio, "MMMM yyyy", { locale: ptBR });
    }
    return `${format(inicio, "MMM", { locale: ptBR })} - ${format(fim, "MMM yyyy", { locale: ptBR })}`;
  }, [diasSemana]);

  // Buscar agendamentos da semana
  useEffect(() => {
    if (tenant) {
      buscarAgendamentosSemana();
    }
  }, [diaSelecionado, tenant]);

  // Carregar dados do formulário
  useEffect(() => {
    if (tenant) {
      carregarDadosFormulario();
    }
  }, [tenant]);

  // Realtime
  useEffect(() => {
    if (!tenant) return;

    const canal = supabase
      .channel('agendamentos-semanal-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agendamentos',
        filter: `tenant_id=eq.${tenant.id}`
      }, () => {
        buscarAgendamentosSemana();
      })
      .subscribe();

    subscriptionRef.current = canal;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [tenant, diaSelecionado]);

  // Scroll automático para hora atual
  useEffect(() => {
    if (scrollContainerRef.current && !carregando) {
      const horaAtual = new Date().getHours();
      const scrollPosition = Math.max(0, (horaAtual - 8) * ALTURA_HORA);
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, [carregando]);

  const carregarDadosFormulario = async () => {
    if (!tenant) return;
    
    try {
      const [barbeirosRes, servicosRes] = await Promise.all([
        supabase.from('barbeiros').select('id, nome').eq('tenant_id', tenant.id).eq('ativo', true),
        supabase.from('servicos').select('id, nome, preco, duracao').eq('tenant_id', tenant.id).eq('ativo', true),
      ]);

      if (barbeirosRes.data) {
        setBarbeiros(barbeirosRes.data);
        if (barbeirosRes.data.length > 0) {
          setNovoAgendamento(prev => ({ ...prev, barbeiroId: barbeirosRes.data[0].id }));
        }
      }
      if (servicosRes.data) {
        setServicos(servicosRes.data);
        if (servicosRes.data.length > 0) {
          setNovoAgendamento(prev => ({ ...prev, servicoId: servicosRes.data[0].id }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const buscarAgendamentosSemana = async () => {
    if (!tenant) return;

    try {
      setCarregando(true);
      
      const inicio = diasSemana[0];
      const fim = addDays(diasSemana[6], 1);
      
      const inicioUTC = fromZonedTime(`${format(inicio, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE_BRASILIA);
      const fimUTC = fromZonedTime(`${format(fim, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE_BRASILIA);

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clientes (nome, telefone),
          barbeiros (nome),
          servicos (nome, preco, duracao)
        `)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', inicioUTC.toISOString())
        .lt('data_hora', fimUTC.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Agrupar agendamentos por dia
  const agendamentosPorDia = useMemo(() => {
    const grupos: { [key: string]: Agendamento[] } = {};
    
    diasSemana.forEach(dia => {
      grupos[format(dia, 'yyyy-MM-dd')] = [];
    });

    agendamentos.forEach(ag => {
      const dataUTC = parseISO(ag.data_hora);
      const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
      const dataKey = format(dataBrasilia, 'yyyy-MM-dd');
      if (grupos[dataKey]) {
        grupos[dataKey].push(ag);
      }
    });
    
    return grupos;
  }, [agendamentos, diasSemana]);

  // Calcular posição do agendamento
  const calcularPosicao = (dataHora: string, duracao: number) => {
    const dataUTC = parseISO(dataHora);
    const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
    const hora = dataBrasilia.getHours();
    const minutos = dataBrasilia.getMinutes();
    
    const top = ((hora - 7) * ALTURA_HORA) + ((minutos / 60) * ALTURA_HORA);
    const height = Math.max((duracao / 60) * ALTURA_HORA, 48);
    
    return { top, height };
  };

  // Ações
  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      // Buscar dados do agendamento para notificação
      const agendamentoParaNotificar = agendamentos.find(ag => ag.id === id);
      
      const updateData: any = { status: novoStatus };
      if (novoStatus === 'concluido') {
        updateData.concluido_em = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('agendamentos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      // Se cancelou, notificar cliente via bot
      if (novoStatus === 'cancelado' && agendamentoParaNotificar) {
        await notificarCancelamento(agendamentoParaNotificar);
      }
      
      setModalDetalhesAberto(false);
      buscarAgendamentosSemana();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    }
  };

  // Notificar cancelamento via bot WhatsApp
  const notificarCancelamento = async (agendamento: Agendamento) => {
    try {
      const dataUTC = parseISO(agendamento.data_hora);
      const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
      const dataFormatada = format(dataBrasilia, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      
      const mensagem = `❌ *Agendamento Cancelado*\n\nOlá ${agendamento.clientes?.nome}!\n\nSeu agendamento foi cancelado:\n\n📅 *Data:* ${dataFormatada}\n✂️ *Serviço:* ${agendamento.servicos?.nome}\n👤 *Barbeiro:* ${agendamento.barbeiros?.nome}\n\nSe desejar reagendar, entre em contato ou acesse nosso site.\n\n_BarberHub_`;

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

  const enviarWhatsApp = (telefone: string, nome: string, dataHora: string) => {
    const dataUTC = parseISO(dataHora);
    const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
    const mensagem = `Olá ${nome}! Confirmando seu agendamento para ${format(dataBrasilia, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
    const tel = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const deletarAgendamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    
    try {
      await supabase.from('historico_agendamentos').delete().eq('agendamento_id', id);
      const { error } = await supabase.from('agendamentos').delete().eq('id', id);
      if (error) throw error;
      
      setModalDetalhesAberto(false);
      buscarAgendamentosSemana();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao excluir agendamento');
    }
  };

  const salvarNovoAgendamento = async () => {
    if (!tenant) return;
    
    try {
      setProcessando(true);
      setMensagemErro("");

      if (!novoAgendamento.clienteNome.trim()) {
        setMensagemErro("Digite o nome do cliente");
        return;
      }
      if (!novoAgendamento.clienteTelefone.trim()) {
        setMensagemErro("Digite o telefone");
        return;
      }

      const telefoneFormatado = novoAgendamento.clienteTelefone.replace(/\D/g, '');
      let clienteId: string;

      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('telefone', telefoneFormatado)
        .maybeSingle();

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert([{ 
            tenant_id: tenant.id,
            nome: novoAgendamento.clienteNome, 
            telefone: telefoneFormatado, 
            ativo: true 
          }])
          .select()
          .single();

        if (erroCliente) throw erroCliente;
        clienteId = novoCliente.id;
      }

      const dataHoraLocal = `${novoAgendamento.data}T${novoAgendamento.hora}:00`;
      const dataHoraUTC = fromZonedTime(dataHoraLocal, TIMEZONE_BRASILIA);

      const { error: erroAgendamento } = await supabase
        .from('agendamentos')
        .insert([{
          tenant_id: tenant.id,
          cliente_id: clienteId,
          barbeiro_id: novoAgendamento.barbeiroId,
          servico_id: novoAgendamento.servicoId,
          data_hora: dataHoraUTC.toISOString(),
          status: 'pendente',
        }]);

      if (erroAgendamento) throw erroAgendamento;

      setModalNovoAberto(false);
      setNovoAgendamento({
        clienteNome: "",
        clienteTelefone: "",
        data: format(new Date(), "yyyy-MM-dd"),
        hora: "09:00",
        barbeiroId: barbeiros[0]?.id || "",
        servicoId: servicos[0]?.id || "",
      });
      buscarAgendamentosSemana();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMensagemErro("Erro ao criar agendamento");
    } finally {
      setProcessando(false);
    }
  };

  // Estatísticas do dia
  const estatisticasHoje = useMemo(() => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const agHoje = agendamentosPorDia[hoje] || [];
    return {
      total: agHoje.length,
      pendentes: agHoje.filter(a => a.status === 'pendente').length,
      confirmados: agHoje.filter(a => a.status === 'confirmado').length,
      concluidos: agHoje.filter(a => a.status === 'concluido').length,
    };
  }, [agendamentosPorDia]);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800">
        {/* Navegação Principal */}
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDiaSelecionado(new Date())}
              className="px-4 py-2 text-sm font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
            >
              Hoje
            </button>
            
            <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <button
                onClick={() => setDiaSelecionado(subDays(diaSelecionado, 7))}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
              <button
                onClick={() => setDiaSelecionado(addDays(diaSelecionado, 7))}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-l border-zinc-200 dark:border-zinc-700"
              >
                <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>
            
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white capitalize hidden sm:block">
              {tituloPeriodo}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats rápidos */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{estatisticasHoje.pendentes}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{estatisticasHoje.confirmados}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{estatisticasHoje.concluidos}</span>
              </div>
            </div>

            <button
              onClick={() => setModalNovoAberto(true)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </div>

        {/* Cabeçalho dos Dias */}
        <div className="grid grid-cols-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="w-16 sm:w-20 flex-shrink-0" />
          {diasSemana.map((dia, index) => {
            const ehHoje = isToday(dia);
            const agendamentosDia = agendamentosPorDia[format(dia, 'yyyy-MM-dd')] || [];
            
            return (
              <button
                key={index}
                onClick={() => setDiaSelecionado(dia)}
                className={`py-3 px-1 text-center transition-all border-b-2 ${
                  isSameDay(dia, diaSelecionado)
                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900'
                    : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${
                  ehHoje ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-500'
                }`}>
                  {DIAS_SEMANA_CURTO[index]}
                </div>
                <div className={`text-lg sm:text-xl font-bold ${
                  ehHoje
                    ? 'w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center'
                    : isSameDay(dia, diaSelecionado)
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}>
                  {format(dia, 'd')}
                </div>
                {agendamentosDia.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {agendamentosDia.slice(0, 3).map((ag, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[ag.status as keyof typeof STATUS_CONFIG]?.dot || 'bg-zinc-400'}`}
                      />
                    ))}
                    {agendamentosDia.length > 3 && (
                      <span className="text-[8px] text-zinc-500 ml-0.5">+{agendamentosDia.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Horários */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
      >
        {carregando ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">Carregando...</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-8 min-h-full">
            {/* Coluna de Horas */}
            <div className="w-16 sm:w-20 flex-shrink-0 border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              {HORAS_DIA.map((hora) => (
                <div
                  key={hora}
                  className="relative border-b border-zinc-100 dark:border-zinc-800/50"
                  style={{ height: `${ALTURA_HORA}px` }}
                >
                  <span className="absolute -top-2.5 left-2 text-[10px] sm:text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900 px-1">
                    {String(hora).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colunas dos Dias */}
            {diasSemana.map((dia, diaIndex) => {
              const dataKey = format(dia, 'yyyy-MM-dd');
              const agendamentosDia = agendamentosPorDia[dataKey] || [];
              const ehHoje = isToday(dia);
              
              return (
                <div 
                  key={diaIndex}
                  className={`relative border-r border-zinc-100 dark:border-zinc-800/50 ${
                    ehHoje ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                  }`}
                >
                  {/* Linhas de hora */}
                  {HORAS_DIA.map((hora) => (
                    <div
                      key={hora}
                      className="border-b border-zinc-100 dark:border-zinc-800/50"
                      style={{ height: `${ALTURA_HORA}px` }}
                    />
                  ))}

                  {/* Linha do horário atual */}
                  {ehHoje && (
                    <div 
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ 
                        top: `${((new Date().getHours() - 7) * ALTURA_HORA) + ((new Date().getMinutes() / 60) * ALTURA_HORA)}px` 
                      }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 h-0.5 bg-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Agendamentos */}
                  <div className="absolute inset-0 px-0.5 sm:px-1">
                    {agendamentosDia.map((agendamento) => {
                      const { top, height } = calcularPosicao(
                        agendamento.data_hora,
                        agendamento.servicos?.duracao || 30
                      );
                      const config = STATUS_CONFIG[agendamento.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
                      
                      const dataUTC = parseISO(agendamento.data_hora);
                      const dataBrasilia = toZonedTime(dataUTC, TIMEZONE_BRASILIA);
                      const horaFormatada = format(dataBrasilia, 'HH:mm');

                      return (
                        <motion.div
                          key={agendamento.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => {
                            setAgendamentoSelecionado(agendamento);
                            setModalDetalhesAberto(true);
                          }}
                          className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 ${config.bg} rounded-md sm:rounded-lg cursor-pointer overflow-hidden border-l-[3px] ${config.border} shadow-sm hover:shadow-md hover:scale-[1.02] transition-all group`}
                          style={{ top: `${top}px`, height: `${height}px`, minHeight: '44px' }}
                        >
                          <div className="p-1.5 sm:p-2 h-full flex flex-col">
                            <div className="flex items-center gap-1 text-white/90">
                              <span className="text-[10px] sm:text-xs font-semibold">{horaFormatada}</span>
                            </div>
                            <p className="text-[10px] sm:text-xs font-medium text-white truncate mt-0.5">
                              {agendamento.clientes?.nome || 'Cliente'}
                            </p>
                            {height > 60 && (
                              <p className="text-[9px] sm:text-[10px] text-white/75 truncate">
                                {agendamento.servicos?.nome}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <AnimatePresence>
        {modalDetalhesAberto && agendamentoSelecionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalDetalhesAberto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="relative p-6 pb-4">
                <button
                  onClick={() => setModalDetalhesAberto(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
                
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${STATUS_CONFIG[agendamentoSelecionado.status as keyof typeof STATUS_CONFIG]?.bg} flex items-center justify-center`}>
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {agendamentoSelecionado.clientes?.nome || 'Cliente'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CONFIG[agendamentoSelecionado.status as keyof typeof STATUS_CONFIG]?.badge}`}>
                        {agendamentoSelecionado.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalhes */}
              <div className="px-6 pb-4 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <Clock className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {format(toZonedTime(parseISO(agendamentoSelecionado.data_hora), TIMEZONE_BRASILIA), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {format(toZonedTime(parseISO(agendamentoSelecionado.data_hora), TIMEZONE_BRASILIA), "HH:mm", { locale: ptBR })} - {agendamentoSelecionado.servicos?.duracao}min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <Scissors className="w-5 h-5 text-zinc-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {agendamentoSelecionado.servicos?.nome}
                    </p>
                    <p className="text-sm text-zinc-500">
                      com {agendamentoSelecionado.barbeiros?.nome}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    R$ {agendamentoSelecionado.servicos?.preco?.toFixed(2)}
                  </span>
                </div>

                {agendamentoSelecionado.clientes?.telefone && (
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                    <Phone className="w-5 h-5 text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {agendamentoSelecionado.clientes.telefone}
                    </p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="p-6 pt-2 space-y-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-2">
                  {agendamentoSelecionado.status !== 'concluido' && (
                    <button
                      onClick={() => atualizarStatus(agendamentoSelecionado.id, 'concluido')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-medium text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Concluir
                    </button>
                  )}
                  {agendamentoSelecionado.status !== 'confirmado' && agendamentoSelecionado.status !== 'concluido' && (
                    <button
                      onClick={() => atualizarStatus(agendamentoSelecionado.id, 'confirmado')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-colors font-medium text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirmar
                    </button>
                  )}
                  {agendamentoSelecionado.clientes?.telefone && (
                    <button
                      onClick={() => enviarWhatsApp(
                        agendamentoSelecionado.clientes.telefone,
                        agendamentoSelecionado.clientes.nome,
                        agendamentoSelecionado.data_hora
                      )}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium text-sm"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      WhatsApp
                    </button>
                  )}
                  {agendamentoSelecionado.status !== 'cancelado' && (
                    <button
                      onClick={() => atualizarStatus(agendamentoSelecionado.id, 'cancelado')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-colors font-medium text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancelar
                    </button>
                  )}
                </div>
                <button
                  onClick={() => deletarAgendamento(agendamentoSelecionado.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors font-medium text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Agendamento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Novo Agendamento */}
      <AnimatePresence>
        {modalNovoAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !processando && setModalNovoAberto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Novo Agendamento
                  </h3>
                  <button
                    onClick={() => setModalNovoAberto(false)}
                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>

                {mensagemErro && (
                  <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                    <p className="text-sm text-rose-700 dark:text-rose-400">{mensagemErro}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      placeholder="Digite o nome"
                      value={novoAgendamento.clienteNome}
                      onChange={(e) => setNovoAgendamento({ ...novoAgendamento, clienteNome: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Telefone (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={novoAgendamento.clienteTelefone}
                      onChange={(e) => setNovoAgendamento({ ...novoAgendamento, clienteTelefone: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Data
                      </label>
                      <input
                        type="date"
                        value={novoAgendamento.data}
                        onChange={(e) => setNovoAgendamento({ ...novoAgendamento, data: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Horário
                      </label>
                      <input
                        type="time"
                        value={novoAgendamento.hora}
                        onChange={(e) => setNovoAgendamento({ ...novoAgendamento, hora: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Barbeiro
                    </label>
                    <select
                      value={novoAgendamento.barbeiroId}
                      onChange={(e) => setNovoAgendamento({ ...novoAgendamento, barbeiroId: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    >
                      {barbeiros.map((b) => (
                        <option key={b.id} value={b.id}>{b.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Serviço
                    </label>
                    <select
                      value={novoAgendamento.servicoId}
                      onChange={(e) => setNovoAgendamento({ ...novoAgendamento, servicoId: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    >
                      {servicos.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} - R$ {s.preco.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setModalNovoAberto(false)}
                    disabled={processando}
                    className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarNovoAgendamento}
                    disabled={processando}
                    className="flex-1 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Criar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
