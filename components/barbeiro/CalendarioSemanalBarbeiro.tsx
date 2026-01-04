"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronLeft, ChevronRight, Calendar, User, Scissors,
  CheckCircle, XCircle, Trash2, X, Clock, Phone, RefreshCw,
  ZoomIn, ZoomOut, CalendarDays, Columns, LayoutGrid
} from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { PortalModal } from "@/components/ui/PortalModal";
import { ModalNovoAgendamentoBarbeiro } from "./ModalNovoAgendamentoBarbeiro";
import {
  format, addDays, startOfWeek, isSameDay, parseISO, subDays,
  isToday, addWeeks, subWeeks
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useBarbeiroAuth } from "@/contexts/BarbeiroAuthContext";

const TIMEZONE_BRASILIA = "America/Sao_Paulo";
const BOT_URL = 'https://bot-barberhub.fly.dev';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  observacoes?: string;
  clientes: { nome: string; telefone: string };
  servicos: { nome: string; preco: number; duracao: number };
}

type TipoVisualizacao = 'dia' | '3dias' | 'semana';
type TamanhoHora = 'compacto' | 'normal' | 'expandido';

const HORAS_DIA = Array.from({ length: 14 }, (_, i) => i + 7); // 7h às 20h

const TAMANHOS_HORA: Record<TamanhoHora, number> = {
  compacto: 48,
  normal: 64,
  expandido: 80
};

const STATUS_CORES = {
  pendente: { bg: 'bg-amber-500', border: 'border-amber-600', light: 'bg-amber-100 text-amber-800' },
  confirmado: { bg: 'bg-emerald-500', border: 'border-emerald-600', light: 'bg-emerald-100 text-emerald-800' },
  concluido: { bg: 'bg-blue-500', border: 'border-blue-600', light: 'bg-blue-100 text-blue-800' },
  cancelado: { bg: 'bg-zinc-400', border: 'border-zinc-500', light: 'bg-zinc-100 text-zinc-600' }
};

/**
 * Calendário Semanal para Barbeiro
 * Versão adaptada do CalendarioSemanalNovo para uso exclusivo do barbeiro
 */
export function CalendarioSemanalBarbeiro() {
  const { barbeiro, tenant } = useBarbeiroAuth();
  const [dataBase, setDataBase] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [dataSelecionadaNovo, setDataSelecionadaNovo] = useState<string>('');
  const [horaSelecionadaNovo, setHoraSelecionadaNovo] = useState<string>('');
  
  // Configurações de visualização
  const [visualizacao, setVisualizacao] = useState<TipoVisualizacao>('semana');
  const [tamanhoHora, setTamanhoHora] = useState<TamanhoHora>('normal');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const subscriptionRef = useRef<any>(null);

  const alturaHora = TAMANHOS_HORA[tamanhoHora];

  // Calcular dias a exibir baseado na visualização
  const diasExibidos = useMemo(() => {
    if (visualizacao === 'dia') {
      return [dataBase];
    }
    if (visualizacao === '3dias') {
      return [subDays(dataBase, 1), dataBase, addDays(dataBase, 1)];
    }
    // Semana completa
    const inicio = startOfWeek(dataBase, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  }, [dataBase, visualizacao]);

  // Título do período
  const tituloPeriodo = useMemo(() => {
    if (visualizacao === 'dia') {
      return format(dataBase, "EEEE, d 'de' MMMM", { locale: ptBR });
    }
    const inicio = diasExibidos[0];
    const fim = diasExibidos[diasExibidos.length - 1];
    if (inicio.getMonth() === fim.getMonth()) {
      return format(inicio, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return `${format(inicio, "MMM", { locale: ptBR })} - ${format(fim, "MMM 'de' yyyy", { locale: ptBR })}`;
  }, [dataBase, diasExibidos, visualizacao]);

  // Buscar agendamentos
  useEffect(() => {
    if (tenant && barbeiro) buscarAgendamentos();
  }, [dataBase, visualizacao, tenant, barbeiro]);

  // Realtime
  useEffect(() => {
    if (!tenant || !barbeiro) return;
    const canal = supabase
      .channel('calendario-barbeiro-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agendamentos',
        filter: `barbeiro_id=eq.${barbeiro.id}`
      }, () => buscarAgendamentos())
      .subscribe();
    subscriptionRef.current = canal;
    return () => { if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current); };
  }, [tenant, barbeiro, dataBase, visualizacao]);

  // Scroll para hora atual
  useEffect(() => {
    if (scrollRef.current && !carregando) {
      const horaAtual = new Date().getHours();
      const scrollPosition = Math.max(0, (horaAtual - 8) * alturaHora);
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, [carregando, alturaHora]);

  const buscarAgendamentos = async () => {
    if (!tenant || !barbeiro) return;
    try {
      setCarregando(true);
      const inicio = diasExibidos[0];
      const fim = addDays(diasExibidos[diasExibidos.length - 1], 1);
      const inicioUTC = fromZonedTime(`${format(inicio, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE_BRASILIA);
      const fimUTC = fromZonedTime(`${format(fim, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE_BRASILIA);

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`*, clientes (nome, telefone), servicos (nome, preco, duracao)`)
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
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

  // Navegação
  const navegarPeriodo = (direcao: 'anterior' | 'proximo') => {
    if (visualizacao === 'dia') {
      setDataBase(d => direcao === 'proximo' ? addDays(d, 1) : subDays(d, 1));
    } else if (visualizacao === '3dias') {
      setDataBase(d => direcao === 'proximo' ? addDays(d, 3) : subDays(d, 3));
    } else {
      setDataBase(d => direcao === 'proximo' ? addWeeks(d, 1) : subWeeks(d, 1));
    }
  };

  // Atualizar status
  const atualizarStatus = async (id: string, novoStatus: string) => {
    if (!tenant || !barbeiro) return;
    
    try {
      const agendamento = agendamentos.find(a => a.id === id);
      if (!agendamento) return;

      const updateData: any = { status: novoStatus };
      if (novoStatus === 'concluido') {
        updateData.concluido_em = new Date().toISOString();
      }
      
      const { error: erroUpdate } = await supabase
        .from('agendamentos')
        .update(updateData)
        .eq('id', id);
      
      if (erroUpdate) throw erroUpdate;

      // Se concluído, criar transação e comissão
      if (novoStatus === 'concluido' && agendamento) {
        await criarTransacaoEComissao(agendamento);
      }

      // Se cancelado, notificar cliente
      if (novoStatus === 'cancelado' && agendamento) {
        await notificarCancelamento(agendamento);
      }

      setModalDetalhesAberto(false);
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    }
  };

  // Criar transação de receita e comissão do barbeiro
  const criarTransacaoEComissao = async (agendamento: Agendamento) => {
    if (!tenant || !barbeiro) return;

    try {
      const valorServico = agendamento.servicos?.preco || 0;
      const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA);
      const dataFormatada = format(dataBrasilia, 'yyyy-MM-dd');
      const mes = dataBrasilia.getMonth() + 1;
      const ano = dataBrasilia.getFullYear();

      const percentualComissao = barbeiro.comissao_percentual || 40;
      const valorComissao = (valorServico * percentualComissao) / 100;

      // Criar transação de receita
      await supabase
        .from('transacoes')
        .insert({
          tenant_id: tenant.id,
          tipo: 'receita',
          categoria: 'servico',
          descricao: `${agendamento.servicos?.nome} - ${agendamento.clientes?.nome}`,
          valor: valorServico,
          data: dataFormatada,
          forma_pagamento: 'dinheiro',
          agendamento_id: agendamento.id,
          barbeiro_id: barbeiro.id
        });

      // Criar registro de comissão
      await supabase
        .from('comissoes')
        .insert({
          tenant_id: tenant.id,
          barbeiro_id: barbeiro.id,
          agendamento_id: agendamento.id,
          valor_servico: valorServico,
          percentual_comissao: percentualComissao,
          valor_comissao: valorComissao,
          mes,
          ano,
          pago: false
        });

      // Incrementar total de atendimentos do barbeiro
      const { data: barbeiroAtual } = await supabase
        .from('barbeiros')
        .select('total_atendimentos')
        .eq('id', barbeiro.id)
        .single();
      
      await supabase
        .from('barbeiros')
        .update({ total_atendimentos: (barbeiroAtual?.total_atendimentos || 0) + 1 })
        .eq('id', barbeiro.id);

    } catch (error) {
      console.error('Erro ao criar transação/comissão:', error);
    }
  };

  // Notificar cancelamento
  const notificarCancelamento = async (agendamento: Agendamento) => {
    try {
      const dataFormatada = format(parseISO(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      
      const mensagem = `❌ *Agendamento Cancelado*\n\nOlá ${agendamento.clientes?.nome}!\n\nSeu agendamento foi cancelado:\n\n📅 *Data:* ${dataFormatada}\n✂️ *Serviço:* ${agendamento.servicos?.nome}\n👤 *Barbeiro:* ${barbeiro?.nome}\n\nSe desejar reagendar, entre em contato.\n\n_BarberHub_`;

      let telefone = agendamento.clientes?.telefone?.replace(/\D/g, '') || '';
      if (!telefone.startsWith('55')) {
        telefone = '55' + telefone;
      }

      await fetch(`${BOT_URL}/api/enviar-mensagem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, mensagem, tenant_id: tenant?.id })
      });
    } catch (error) {
      console.error('Erro ao notificar cancelamento:', error);
    }
  };

  // Obter agendamentos do dia
  const getAgendamentosDia = (dia: Date) => {
    return agendamentos.filter(ag => {
      const dataAg = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA);
      return isSameDay(dataAg, dia);
    });
  };

  // Calcular posição do agendamento
  const calcularPosicao = (ag: Agendamento) => {
    const data = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA);
    const horas = data.getHours();
    const minutos = data.getMinutes();
    const top = ((horas - 7) * alturaHora) + (minutos / 60) * alturaHora;
    const duracao = ag.servicos?.duracao || 30;
    const height = Math.max((duracao / 60) * alturaHora, 28);
    return { top, height };
  };

  // Abrir modal para novo agendamento em horário específico
  const abrirModalNovo = (dia: Date, hora?: number) => {
    setDataSelecionadaNovo(format(dia, 'yyyy-MM-dd'));
    setHoraSelecionadaNovo(hora ? `${String(hora).padStart(2, '0')}:00` : '09:00');
    setModalNovoAberto(true);
  };

  // Abrir WhatsApp
  const abrirWhatsApp = (telefone: string) => {
    const numero = telefone.replace(/\D/g, '');
    const numeroCompleto = numero.startsWith('55') ? numero : `55${numero}`;
    window.open(`https://wa.me/${numeroCompleto}`, '_blank');
  };

  if (!barbeiro || !tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header Compacto */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-3 sm:p-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navegação */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDataBase(new Date())}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
            >
              Hoje
            </button>
            <div className="flex items-center">
              <button
                onClick={() => navegarPeriodo('anterior')}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navegarPeriodo('proximo')}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white capitalize">
              {tituloPeriodo}
            </h2>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {/* Visualização */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setVisualizacao('dia')}
                className={`p-1.5 rounded-md transition-colors ${visualizacao === 'dia' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                title="Dia"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVisualizacao('3dias')}
                className={`p-1.5 rounded-md transition-colors ${visualizacao === '3dias' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                title="3 Dias"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVisualizacao('semana')}
                className={`p-1.5 rounded-md transition-colors ${visualizacao === 'semana' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                title="Semana"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setTamanhoHora('compacto')}
                className={`p-1.5 rounded-md transition-colors ${tamanhoHora === 'compacto' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                title="Compacto"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTamanhoHora('expandido')}
                className={`p-1.5 rounded-md transition-colors ${tamanhoHora === 'expandido' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}
                title="Expandido"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Botão Novo */}
            <button
              onClick={() => abrirModalNovo(new Date())}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Coluna de Horários */}
          <div className="w-12 sm:w-16 flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
            <div className="h-10 sm:h-12 border-b border-zinc-200 dark:border-zinc-800"></div>
            <div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100% - 40px)' }}>
              {HORAS_DIA.map(hora => (
                <div
                  key={hora}
                  className="border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-end pr-2 text-xs text-zinc-500"
                  style={{ height: alturaHora }}
                >
                  <span className="-mt-2">{`${hora}:00`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Colunas dos Dias */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-full h-full flex">
              {diasExibidos.map((dia, idx) => (
                <div
                  key={idx}
                  className={`flex-1 min-w-[100px] sm:min-w-[120px] border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 ${
                    isToday(dia) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-white dark:bg-zinc-900'
                  }`}
                >
                  {/* Header do Dia */}
                  <div
                    className={`h-10 sm:h-12 border-b border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center sticky top-0 z-10 ${
                      isToday(dia) ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <span className="text-[10px] sm:text-xs text-zinc-500 uppercase">
                      {format(dia, 'EEE', { locale: ptBR })}
                    </span>
                    <span className={`text-sm sm:text-lg font-bold ${
                      isToday(dia) ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'
                    }`}>
                      {format(dia, 'd')}
                    </span>
                  </div>

                  {/* Grid de Horários */}
                  <div className="relative overflow-y-auto" style={{ height: `calc(100% - ${visualizacao === 'dia' ? '48px' : '40px'})` }}>
                    {HORAS_DIA.map(hora => (
                      <div
                        key={hora}
                        className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        style={{ height: alturaHora }}
                        onClick={() => abrirModalNovo(dia, hora)}
                      />
                    ))}

                    {/* Agendamentos */}
                    {getAgendamentosDia(dia).map(ag => {
                      const { top, height } = calcularPosicao(ag);
                      const cores = STATUS_CORES[ag.status as keyof typeof STATUS_CORES] || STATUS_CORES.pendente;
                      
                      return (
                        <motion.div
                          key={ag.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg ${cores.bg} cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow border-l-2 sm:border-l-4 ${cores.border}`}
                          style={{ top, height: Math.max(height, 28) }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgendamentoSelecionado(ag);
                            setModalDetalhesAberto(true);
                          }}
                        >
                          <div className="p-1 sm:p-1.5 h-full flex flex-col text-white">
                            <p className="text-[10px] sm:text-xs font-medium truncate">
                              {ag.clientes?.nome}
                            </p>
                            {height > 36 && (
                              <p className="text-[8px] sm:text-[10px] opacity-80 truncate">
                                {ag.servicos?.nome}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <PortalModal aberto={modalDetalhesAberto} onFechar={() => setModalDetalhesAberto(false)}>
        {agendamentoSelecionado && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                  {agendamentoSelecionado.clientes?.nome}
                </h3>
                <p className="text-sm text-zinc-500">
                  {format(toZonedTime(parseISO(agendamentoSelecionado.data_hora), TIMEZONE_BRASILIA), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <button
                onClick={() => setModalDetalhesAberto(false)}
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <Scissors className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {agendamentoSelecionado.servicos?.nome}
                  </p>
                  <p className="text-sm text-emerald-600">
                    R$ {agendamentoSelecionado.servicos?.preco?.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => abrirWhatsApp(agendamentoSelecionado.clientes?.telefone || '')}
                className="w-full flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-green-700 dark:text-green-400">WhatsApp</p>
                  <p className="text-sm text-green-600">{agendamentoSelecionado.clientes?.telefone}</p>
                </div>
              </button>

              {/* Status */}
              <div className={`px-3 py-2 rounded-lg text-center ${STATUS_CORES[agendamentoSelecionado.status as keyof typeof STATUS_CORES]?.light}`}>
                <span className="text-sm font-medium capitalize">{agendamentoSelecionado.status}</span>
              </div>
            </div>

            {/* Ações */}
            {agendamentoSelecionado.status !== 'cancelado' && agendamentoSelecionado.status !== 'concluido' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => atualizarStatus(agendamentoSelecionado.id, 'confirmado')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar
                </button>
                <button
                  onClick={() => atualizarStatus(agendamentoSelecionado.id, 'concluido')}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Concluir
                </button>
                <button
                  onClick={() => atualizarStatus(agendamentoSelecionado.id, 'cancelado')}
                  className="col-span-2 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}
          </motion.div>
        )}
      </PortalModal>

      {/* Modal Novo Agendamento */}
      <ModalNovoAgendamentoBarbeiro
        tenantId={tenant.id}
        barbeiroId={barbeiro.id}
        barbeiroNome={barbeiro.nome}
        aberto={modalNovoAberto}
        onFechar={() => setModalNovoAberto(false)}
        onSucesso={buscarAgendamentos}
        dataPadrao={dataSelecionadaNovo}
        horaPadrao={horaSelecionadaNovo}
      />
    </div>
  );
}
