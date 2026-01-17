"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { memo } from "react";
import {
  Plus, ChevronLeft, ChevronRight, Calendar, Scissors,
  CheckCircle, XCircle, Trash2, X, Clock, Phone, RefreshCw,
  ZoomIn, ZoomOut, CalendarDays, Columns, LayoutGrid
} from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { PortalModal } from "@/components/ui/PortalModal";
import { ModalRemarcacao } from "./ModalRemarcacao";
import { ModalNovoAgendamento } from "@/components/agendamento";
import { ModalConfirmacaoExclusao } from "@/components/calendario";
import {
  format, addDays, startOfWeek, parseISO, subDays,
  isToday, addWeeks, subWeeks
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { obterEmojiPrincipal, obterTerminologia } from "@/lib/configuracoes-negocio";
import { TipoNegocio } from "@/lib/tipos-negocio";
import { buscarConfiguracaoHorarios, gerarArrayHoras, ConfiguracaoHorarios, HORARIOS_PADRAO } from "@/lib/horarios-funcionamento";

const TIMEZONE_BRASILIA = "America/Sao_Paulo";
const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || 'https://bot-barberhub.fly.dev';

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
  clientes: { nome: string; telefone: string };
  barbeiros: { id: string; nome: string };
  servicos: Servico;
  servicosMultiplos?: Servico[];
}

type TipoVisualizacao = 'dia' | '3dias' | 'semana';

// Níveis de zoom granulares (0.5x até 1.5x)
const NIVEIS_ZOOM = [0.5, 0.75, 1, 1.25, 1.5] as const;
type NivelZoom = typeof NIVEIS_ZOOM[number];

// Altura base para cálculo do zoom (1x = 160px)
const ALTURA_BASE = 160;

// Largura mínima por coluna baseada no zoom
const LARGURA_COLUNA_BASE = 180;

const STATUS_CORES = {
  pendente: { bg: 'bg-amber-400', border: 'border-amber-500', text: 'text-amber-900', light: 'bg-amber-100 text-amber-800' },
  confirmado: { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-white', light: 'bg-emerald-100 text-emerald-800' },
  concluido: { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white', light: 'bg-blue-100 text-blue-800' },
  cancelado: { bg: 'bg-zinc-300', border: 'border-zinc-400', text: 'text-zinc-600', light: 'bg-zinc-100 text-zinc-600' }
};

// Estilos refinados para cards de agendamento (design do arquivo de análise)
const ESTILOS_STATUS = {
  pendente: {
    borda: 'border-amber-400',
    fundo: 'bg-amber-50 dark:bg-amber-950/35',
    texto: 'text-amber-950 dark:text-amber-100',
    ponto: 'bg-amber-400',
  },
  confirmado: {
    borda: 'border-teal-400',
    fundo: 'bg-teal-50 dark:bg-teal-950/35',
    texto: 'text-teal-950 dark:text-teal-100',
    ponto: 'bg-teal-400',
  },
  concluido: {
    borda: 'border-emerald-400',
    fundo: 'bg-emerald-50 dark:bg-emerald-950/35',
    texto: 'text-emerald-950 dark:text-emerald-100',
    ponto: 'bg-emerald-400',
  },
  cancelado: {
    borda: 'border-rose-400',
    fundo: 'bg-rose-50 dark:bg-rose-950/35',
    texto: 'text-rose-950 dark:text-rose-100',
    ponto: 'bg-rose-400',
  },
};

type ModoVisualizacao = 'timeline' | 'lista';

// Mapeamento de dia da semana para abreviação
const DIAS_SEMANA_MAP: Record<number, string> = {
  0: 'dom',
  1: 'seg',
  2: 'ter',
  3: 'qua',
  4: 'qui',
  5: 'sex',
  6: 'sab'
};

// Função auxiliar para extrair informações de serviços (único ou múltiplos)
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

export function CalendarioSemanalNovo() {
  const { tenant } = useAuth();
  const [dataBase, setDataBase] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalRemarcacaoAberto, setModalRemarcacaoAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);
  const [diasFuncionamento, setDiasFuncionamento] = useState<string[]>(['seg', 'ter', 'qua', 'qui', 'sex', 'sab']);
  const [configHorarios, setConfigHorarios] = useState<ConfiguracaoHorarios>(HORARIOS_PADRAO);
  
  // Configurações de visualização
  const [visualizacao, setVisualizacao] = useState<TipoVisualizacao>('semana');
  const [nivelZoom, setNivelZoom] = useState<NivelZoom>(1);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollCabecalhoRef = useRef<HTMLDivElement>(null);
  const sincronizandoScrollRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Calcular altura e largura baseadas no zoom
  const alturaHora = Math.round(ALTURA_BASE * nivelZoom);
  const larguraColuna = Math.round(LARGURA_COLUNA_BASE * Math.max(nivelZoom, 0.75));
  
  // Gerar array de horas dinamicamente baseado na configuração do tenant
  const horasDia = useMemo(() => {
    return gerarArrayHoras(configHorarios.horaInicio, configHorarios.horaFim);
  }, [configHorarios]);

  // Buscar configuração da barbearia para dias de funcionamento e horários
  useEffect(() => {
    const buscarConfiguracao = async () => {
      if (!tenant?.id) return;
      
      // Buscar configuração completa de horários
      const config = await buscarConfiguracaoHorarios(tenant.id, supabase);
      setConfigHorarios(config);
      setDiasFuncionamento(config.diasFuncionamento);
    };
    
    buscarConfiguracao();
  }, [tenant?.id]);

  // Calcular dias a exibir baseado na visualização e dias de funcionamento
  const diasExibidos = useMemo(() => {
    if (visualizacao === 'dia') {
      return [dataBase];
    }
    if (visualizacao === '3dias') {
      return [subDays(dataBase, 1), dataBase, addDays(dataBase, 1)];
    }
    // Semana - filtrar apenas dias de funcionamento
    const inicio = startOfWeek(dataBase, { weekStartsOn: 0 });
    const todosDias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
    
    // Filtrar apenas os dias que a barbearia funciona
    const diasFiltrados = todosDias.filter(dia => {
      const diaSemana = dia.getDay();
      const abreviacao = DIAS_SEMANA_MAP[diaSemana];
      return diasFuncionamento.includes(abreviacao);
    });
    
    // Se não houver dias filtrados (configuração vazia), mostrar todos
    return diasFiltrados.length > 0 ? diasFiltrados : todosDias;
  }, [dataBase, visualizacao, diasFuncionamento]);

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
    if (tenant) buscarAgendamentos();
  }, [dataBase, visualizacao, tenant]);

  // Realtime
  useEffect(() => {
    if (!tenant) return;
    const canal = supabase
      .channel('calendario-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agendamentos',
        filter: `tenant_id=eq.${tenant.id}`
      }, () => buscarAgendamentos())
      .subscribe();
    subscriptionRef.current = canal;
    return () => { if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current); };
  }, [tenant, dataBase, visualizacao]);

  // Scroll para hora atual (usando hora de início dinâmica)
  useEffect(() => {
    if (scrollRef.current && !carregando && horasDia.length > 0) {
      const horaAtual = new Date().getHours();
      const horaInicial = horasDia[0];
      const scrollPosition = Math.max(0, (horaAtual - horaInicial) * alturaHora);
      
      // Scroll suave para a posição
      scrollRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [carregando, alturaHora, horasDia]);

  // Sincronização de scroll otimizada com debounce
  const sincronizarScrollHorizontal = useCallback((origem: 'cabecalho' | 'timeline') => {
    const elTimeline = scrollRef.current;
    const elCabecalho = scrollCabecalhoRef.current;
    if (!elTimeline || !elCabecalho) return;

    if (sincronizandoScrollRef.current) return;
    sincronizandoScrollRef.current = true;

    // Usar transform para melhor performance
    if (origem === 'timeline') {
      elCabecalho.scrollLeft = elTimeline.scrollLeft;
    } else {
      elTimeline.scrollLeft = elCabecalho.scrollLeft;
    }

    // Liberar após o próximo frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sincronizandoScrollRef.current = false;
      });
    });
  }, []);

  // Funções de zoom
  const aumentarZoom = useCallback(() => {
    const indiceAtual = NIVEIS_ZOOM.indexOf(nivelZoom);
    if (indiceAtual < NIVEIS_ZOOM.length - 1) {
      setNivelZoom(NIVEIS_ZOOM[indiceAtual + 1]);
    }
  }, [nivelZoom]);

  const diminuirZoom = useCallback(() => {
    const indiceAtual = NIVEIS_ZOOM.indexOf(nivelZoom);
    if (indiceAtual > 0) {
      setNivelZoom(NIVEIS_ZOOM[indiceAtual - 1]);
    }
  }, [nivelZoom]);

  const buscarAgendamentos = async () => {
    if (!tenant) return;
    try {
      setCarregando(true);
      const inicio = diasExibidos[0];
      const fim = addDays(diasExibidos[diasExibidos.length - 1], 1);
      const inicioUTC = fromZonedTime(`${format(inicio, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE_BRASILIA);
      const fimUTC = fromZonedTime(`${format(fim, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE_BRASILIA);

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`*, clientes (nome, telefone), barbeiros (id, nome), servicos (id, nome, preco, duracao)`)
        .eq('tenant_id', tenant.id)
        .gte('data_hora', inicioUTC.toISOString())
        .lt('data_hora', fimUTC.toISOString())
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

  // Agrupar agendamentos por dia
  const agendamentosPorDia = useMemo(() => {
    const grupos: Record<string, Agendamento[]> = {};
    diasExibidos.forEach(dia => { grupos[format(dia, 'yyyy-MM-dd')] = []; });
    agendamentos.forEach(ag => {
      const dataBrasilia = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA);
      const key = format(dataBrasilia, 'yyyy-MM-dd');
      if (grupos[key]) grupos[key].push(ag);
    });
    return grupos;
  }, [agendamentos, diasExibidos]);

  // Calcular posição do agendamento baseado na hora inicial dinâmica
  const calcularPosicao = useCallback((dataHora: string, duracao: number) => {
    const dataBrasilia = toZonedTime(parseISO(dataHora), TIMEZONE_BRASILIA);
    const hora = dataBrasilia.getHours();
    const minutos = dataBrasilia.getMinutes();
    const horaInicial = horasDia.length > 0 ? horasDia[0] : configHorarios.horaInicio;
    const top = ((hora - horaInicial) * alturaHora) + ((minutos / 60) * alturaHora);
    const height = Math.max((duracao / 60) * alturaHora, 40);
    return { top, height };
  }, [horasDia, alturaHora, configHorarios.horaInicio]);

  // Navegação
  const navegarAnterior = () => {
    if (visualizacao === 'dia') setDataBase(prev => subDays(prev, 1));
    else if (visualizacao === '3dias') setDataBase(prev => subDays(prev, 3));
    else setDataBase(prev => subWeeks(prev, 1));
  };

  const navegarProximo = () => {
    if (visualizacao === 'dia') setDataBase(prev => addDays(prev, 1));
    else if (visualizacao === '3dias') setDataBase(prev => addDays(prev, 3));
    else setDataBase(prev => addWeeks(prev, 1));
  };

  // Ações
  const atualizarStatus = async (id: string, novoStatus: string) => {
    if (!tenant) return;
    
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
    if (!tenant) return;

    try {
      const valorServico = agendamento.servicos?.preco || 0;
      const barbeiroId = agendamento.barbeiros?.id || agendamento.barbeiro_id;
      const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA);
      const dataFormatada = format(dataBrasilia, 'yyyy-MM-dd');
      const mes = dataBrasilia.getMonth() + 1;
      const ano = dataBrasilia.getFullYear();

      // Buscar percentual de comissão do barbeiro
      const { data: barbeiro } = await supabase
        .from('barbeiros')
        .select('comissao_percentual')
        .eq('id', barbeiroId)
        .single();

      const percentualComissao = barbeiro?.comissao_percentual || 40;
      const valorComissao = (valorServico * percentualComissao) / 100;

      // Criar transação de receita
      const { error: erroTransacao } = await supabase
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
          barbeiro_id: barbeiroId
        });

      if (erroTransacao) {
        console.error('Erro ao criar transação:', erroTransacao);
      }

      // Criar registro de comissão
      const { error: erroComissao } = await supabase
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

      if (erroComissao) {
        console.error('Erro ao criar comissão:', erroComissao);
      }

      // Incrementar total de atendimentos do barbeiro
      const { data: barbeiroAtual } = await supabase
        .from('barbeiros')
        .select('total_atendimentos')
        .eq('id', barbeiroId)
        .single();
      
      await supabase
        .from('barbeiros')
        .update({ total_atendimentos: (barbeiroAtual?.total_atendimentos || 0) + 1 })
        .eq('id', barbeiroId);

    } catch (error) {
      console.error('Erro ao criar transação/comissão:', error);
    }
  };

  const notificarCancelamento = async (agendamento: Agendamento) => {
    try {
      const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA);
      const dataFormatada = format(dataBrasilia, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const tipoNegocio = (tenant?.tipo_negocio as TipoNegocio) || 'barbearia';
      const emoji = obterEmojiPrincipal(tipoNegocio);
      const terminologia = obterTerminologia(tipoNegocio);
      const mensagem = `❌ *Agendamento Cancelado*\n\nOlá ${agendamento.clientes?.nome}!\n\nSeu agendamento foi cancelado:\n📅 ${dataFormatada}\n${emoji} ${agendamento.servicos?.nome}\n👤 ${terminologia.profissional.singular}: ${agendamento.barbeiros?.nome}\n\n_${tenant?.nome || 'BarberHub'}_`;
      let telefone = agendamento.clientes?.telefone?.replace(/\D/g, '') || '';
      if (!telefone.startsWith('55')) telefone = '55' + telefone;
      await fetch(`${BOT_URL}/api/mensagens/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: telefone, mensagem }),
      });
    } catch (error) {
      console.error('Erro ao notificar:', error);
    }
  };

  const abrirModalExcluir = () => {
    setModalDetalhesAberto(false);
    setTimeout(() => setModalExcluirAberto(true), 150);
  };

  const deletarAgendamento = async () => {
    if (!agendamentoSelecionado) return;
    
    setProcessandoExclusao(true);
    try {
      // Deletar registros relacionados
      await supabase.from('historico_agendamentos').delete().eq('agendamento_id', agendamentoSelecionado.id);
      await supabase.from('notificacoes_enviadas').delete().eq('agendamento_id', agendamentoSelecionado.id);
      await supabase.from('comissoes').update({ agendamento_id: null }).eq('agendamento_id', agendamentoSelecionado.id);
      await supabase.from('transacoes').update({ agendamento_id: null }).eq('agendamento_id', agendamentoSelecionado.id);
      
      const { error } = await supabase.from('agendamentos').delete().eq('id', agendamentoSelecionado.id);
      if (error) throw error;
      
      setModalExcluirAberto(false);
      setAgendamentoSelecionado(null);
      buscarAgendamentos();
    } catch (error) {
      console.error('Erro ao deletar:', error);
    } finally {
      setProcessandoExclusao(false);
    }
  };

  const enviarWhatsApp = (telefone: string, nome: string, dataHora: string) => {
    const dataBrasilia = toZonedTime(parseISO(dataHora), TIMEZONE_BRASILIA);
    const mensagem = `Olá ${nome}! Confirmando seu agendamento para ${format(dataBrasilia, "dd/MM 'às' HH:mm")}`;
    const tel = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  // Número de colunas baseado na visualização
  const numColunas = diasExibidos.length;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header - Navegação de Semana */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Botão Semana Anterior */}
          <button
            onClick={navegarAnterior}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Semana Anterior</span>
          </button>
          
          {/* Centro: Data picker + Hoje + Título */}
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={format(dataBase, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (!e.target.value) return;
                setDataBase(new Date(`${e.target.value}T12:00:00`));
              }}
              className="hidden sm:block px-3 py-2 text-sm font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
            <button
              onClick={() => setDataBase(new Date())}
              className="px-6 py-2 text-sm font-bold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              HOJE
            </button>
          </div>
          
          {/* Botão Próxima Semana */}
          <button
            onClick={navegarProximo}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <span className="hidden sm:inline">Próxima Semana</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Segunda linha: Controles de visualização */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white capitalize">
            {tituloPeriodo}
          </h2>

          {/* Controles */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Visualização */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setVisualizacao('dia')}
                className={`p-1.5 rounded-md transition-all ${visualizacao === 'dia' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                title="Dia"
              >
                <CalendarDays className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <button
                onClick={() => setVisualizacao('3dias')}
                className={`p-1.5 rounded-md transition-all ${visualizacao === '3dias' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                title="3 Dias"
              >
                <Columns className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <button
                onClick={() => setVisualizacao('semana')}
                className={`p-1.5 rounded-md transition-all ${visualizacao === 'semana' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                title="Semana"
              >
                <LayoutGrid className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Zoom com níveis granulares */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1">
              <button
                onClick={diminuirZoom}
                disabled={nivelZoom === NIVEIS_ZOOM[0]}
                className="p-1 rounded-md transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 min-w-[40px] text-center">
                {nivelZoom}x
              </span>
              <button
                onClick={aumentarZoom}
                disabled={nivelZoom === NIVEIS_ZOOM[NIVEIS_ZOOM.length - 1]}
                className="p-1 rounded-md transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Botão Novo */}
            <button
              onClick={() => setModalNovoAberto(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cabeçalho dos Dias - Design refinado com seleção invertida */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex">
          {/* Espaço para alinhar com coluna de horários */}
          <div className="flex-shrink-0 w-12 sm:w-16 border-r border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95" />
          
          {/* Grid de dias */}
          <div
            ref={scrollCabecalhoRef}
            onScroll={() => sincronizarScrollHorizontal('cabecalho')}
            className="flex-1 overflow-x-auto overscroll-x-contain"
          >
            <div className="flex" style={{ minWidth: diasExibidos.length * larguraColuna }}>
              {diasExibidos.map((dia, idx) => {
                const ehHoje = isToday(dia);
                const isSelecionado = format(dia, 'yyyy-MM-dd') === format(dataBase, 'yyyy-MM-dd');
                const agDia = agendamentosPorDia[format(dia, 'yyyy-MM-dd')] || [];
                
                return (
                  <button
                    key={idx}
                    onClick={() => setDataBase(dia)}
                    className={`flex-none px-4 py-3.5 text-left border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 transition-colors active:scale-[0.99] ${
                      isSelecionado
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-white'
                    }`}
                    style={{ width: larguraColuna, minWidth: larguraColuna }}
                  >
                    <div className={`text-[10px] sm:text-xs font-semibold uppercase truncate ${
                      isSelecionado ? 'text-white/90 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {format(dia, 'EEEE', { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2.5 mt-1">
                      <div className={`text-xl sm:text-lg font-bold leading-none ${
                        isSelecionado ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-white'
                      }`}>
                        {format(dia, 'd')}
                      </div>
                      <div className={`text-sm sm:text-sm font-medium ${
                        isSelecionado ? 'text-white/80 dark:text-zinc-700' : 'text-zinc-600 dark:text-zinc-300'
                      }`}>
                        {format(dia, 'MMM', { locale: ptBR })}
                      </div>
                      {ehHoje && !isSelecionado && (
                        <div className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                          Hoje
                        </div>
                      )}
                      {agDia.length > 0 && isSelecionado && (
                        <div className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 dark:bg-zinc-900/20">
                          {agDia.length}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Área de Agendamentos - Layout com Horários Verticais */}
      <div
        ref={scrollRef}
        onScroll={() => sincronizarScrollHorizontal('timeline')}
        className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950 scroll-smooth overscroll-contain"
        style={{ scrollBehavior: 'smooth' }}
      >
        {carregando ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">Carregando...</span>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[500px]">
            {/* Coluna de Horários - Fixa à esquerda */}
            <div className="flex-shrink-0 w-12 sm:w-16 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-10">
              {horasDia.map((hora) => (
                <div
                  key={hora}
                  className="flex items-start justify-end pr-2 sm:pr-3 text-[10px] sm:text-xs font-medium text-zinc-400 dark:text-zinc-500"
                  style={{ height: alturaHora }}
                >
                  <span className="mt-[-6px]">{`${hora.toString().padStart(2, '0')}:00`}</span>
                </div>
              ))}
            </div>

            {/* Grid de Dias com Timeline */}
            <div 
              className="flex-1 grid relative" 
              style={{ 
                gridTemplateColumns: `repeat(${diasExibidos.length}, minmax(${larguraColuna}px, 1fr))`,
                minWidth: diasExibidos.length * larguraColuna
              }}
            >
              {diasExibidos.map((dia, diaIdx) => {
                const dataKey = format(dia, 'yyyy-MM-dd');
                const agDia = agendamentosPorDia[dataKey] || [];
                const ehHoje = isToday(dia);

                return (
                  <div
                    key={diaIdx}
                    className={`relative border-l border-zinc-200 dark:border-zinc-800 first:border-l-0 ${
                      ehHoje ? 'bg-blue-50/30 dark:bg-blue-950/10' : 'bg-white dark:bg-zinc-900/30'
                    }`}
                    style={{ minHeight: horasDia.length * alturaHora }}
                  >
                    {/* Linhas de hora */}
                    {horasDia.map((hora, horaIdx) => (
                      <div
                        key={hora}
                        className="absolute left-0 right-0 border-t border-zinc-100 dark:border-zinc-800/50"
                        style={{ top: horaIdx * alturaHora }}
                      />
                    ))}

                    {/* Agendamentos posicionados */}
                    {agDia.map((ag) => {
                      const estilo = ESTILOS_STATUS[ag.status as keyof typeof ESTILOS_STATUS] || ESTILOS_STATUS.pendente;
                      const dataBrasilia = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA);
                      const infoServicos = obterInfoServicos(ag);
                      const pos = calcularPosicao(ag.data_hora, infoServicos.duracao);
                      const espacoVerticalEntreCards = 4;
                      const alturaMinimaCard = 60;
                      const alturaCalculada = Math.max(pos.height, alturaMinimaCard);
                      const modoCompacto = alturaCalculada < 80;
                      const horaInicio = format(dataBrasilia, 'HH:mm');
                      const duracaoMs = infoServicos.duracao * 60000;
                      const dataFimBrasilia = new Date(dataBrasilia.getTime() + duracaoMs);
                      const horaFim = format(dataFimBrasilia, 'HH:mm');

                      return (
                        <button
                          key={ag.id}
                          type="button"
                          onClick={() => {
                            setAgendamentoSelecionado(ag);
                            setModalDetalhesAberto(true);
                          }}
                          aria-label={`Agendamento de ${ag.clientes?.nome || 'cliente'} às ${horaInicio}`}
                          className={`absolute rounded-xl border shadow-sm hover:shadow-md active:scale-[0.98] transition-shadow text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${estilo.fundo} ${estilo.borda} border-l-[3px]`}
                          style={{ 
                            top: pos.top + espacoVerticalEntreCards,
                            left: 6,
                            right: 6,
                            height: Math.max(1, alturaCalculada - (espacoVerticalEntreCards * 2)),
                            minHeight: alturaMinimaCard
                          }}
                        >
                          <div className="h-full p-2 flex flex-col gap-0.5 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${estilo.ponto}`} />
                              <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
                                {horaInicio}–{horaFim}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className={`text-sm font-bold leading-snug truncate ${estilo.texto}`} title={ag.clientes?.nome || 'Cliente'}>
                                {ag.clientes?.nome || 'Cliente'}
                              </div>
                              {!modoCompacto && (
                                <div className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                                  {infoServicos.nomesCurtos}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {/* Indicador de hora atual */}
                    {ehHoje && (
                      <div 
                        className="absolute left-0 right-0 z-30 pointer-events-none"
                        style={{ 
                          top: ((new Date().getHours() - horasDia[0]) * alturaHora) + ((new Date().getMinutes() / 60) * alturaHora)
                        }}
                      >
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-0.5 bg-red-500/70" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <PortalModal
        aberto={modalDetalhesAberto && !!agendamentoSelecionado}
        onFechar={() => setModalDetalhesAberto(false)}
        tamanho="md"
      >
        {agendamentoSelecionado && (
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
              <div className={`w-12 h-12 rounded-xl ${STATUS_CORES[agendamentoSelecionado.status as keyof typeof STATUS_CORES]?.bg || 'bg-zinc-500'} flex items-center justify-center`}>
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {agendamentoSelecionado.clientes?.nome}
                </h3>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_CORES[agendamentoSelecionado.status as keyof typeof STATUS_CORES]?.light || 'bg-zinc-100 text-zinc-600'}`}>
                  {agendamentoSelecionado.status}
                </span>
              </div>
              <button onClick={() => setModalDetalhesAberto(false)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Informações */}
            {(() => {
              const infoServicos = obterInfoServicos(agendamentoSelecionado);
              return (
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                    <Clock className="w-5 h-5 text-zinc-500" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {format(toZonedTime(parseISO(agendamentoSelecionado.data_hora), TIMEZONE_BRASILIA), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-zinc-500">{infoServicos.duracao} minutos</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                    <Scissors className="w-5 h-5 text-zinc-500 mt-0.5" />
                    <div className="flex-1">
                      {infoServicos.quantidade > 1 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-zinc-500 font-medium">
                            {infoServicos.quantidade} serviços selecionados
                          </p>
                          {agendamentoSelecionado.servicosMultiplos?.map((s) => (
                            <p key={s.id} className="text-sm text-zinc-900 dark:text-white">
                              • {s.nome} <span className="text-xs text-zinc-500">({s.duracao}min)</span>
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{infoServicos.nome}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">com {agendamentoSelecionado.barbeiros?.nome}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">R$ {infoServicos.preco.toFixed(2)}</span>
                  </div>

                  {agendamentoSelecionado.clientes?.telefone && (
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <Phone className="w-5 h-5 text-zinc-500" />
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{agendamentoSelecionado.clientes.telefone}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Ações */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {agendamentoSelecionado.status !== 'concluido' && (
                  <button
                    onClick={() => atualizarStatus(agendamentoSelecionado.id, 'concluido')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Concluir
                  </button>
                )}
                {agendamentoSelecionado.status === 'pendente' && (
                  <button
                    onClick={() => atualizarStatus(agendamentoSelecionado.id, 'confirmado')}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </button>
                )}
                {agendamentoSelecionado.clientes?.telefone && (
                  <button
                    onClick={() => enviarWhatsApp(agendamentoSelecionado.clientes.telefone, agendamentoSelecionado.clientes.nome, agendamentoSelecionado.data_hora)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    WhatsApp
                  </button>
                )}
                {agendamentoSelecionado.status !== 'concluido' && agendamentoSelecionado.status !== 'cancelado' && (
                  <button
                    onClick={() => { setModalDetalhesAberto(false); setTimeout(() => setModalRemarcacaoAberto(true), 150); }}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-600 hover:bg-zinc-500 text-white rounded-xl text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Remarcar
                  </button>
                )}
              </div>
              <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {agendamentoSelecionado.status !== 'cancelado' && (
                  <button
                    onClick={() => atualizarStatus(agendamentoSelecionado.id, 'cancelado')}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
                <button
                  onClick={abrirModalExcluir}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-rose-600 border border-rose-200 dark:border-rose-800 rounded-xl text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </PortalModal>

      {/* Modal Remarcação */}
      {agendamentoSelecionado && (
        <ModalRemarcacao
          agendamento={{
            id: agendamentoSelecionado.id,
            data_hora: agendamentoSelecionado.data_hora,
            status: agendamentoSelecionado.status,
            clientes: agendamentoSelecionado.clientes,
            barbeiros: { id: agendamentoSelecionado.barbeiros?.id || agendamentoSelecionado.barbeiro_id, nome: agendamentoSelecionado.barbeiros?.nome || '' },
            servicos: agendamentoSelecionado.servicos
          }}
          aberto={modalRemarcacaoAberto}
          onFechar={() => setModalRemarcacaoAberto(false)}
          onSucesso={() => { buscarAgendamentos(); setModalRemarcacaoAberto(false); }}
        />
      )}

      {/* Modal Novo Agendamento */}
      {tenant && (
        <ModalNovoAgendamento
          tenantId={tenant.id}
          aberto={modalNovoAberto}
          onFechar={() => setModalNovoAberto(false)}
          onSucesso={buscarAgendamentos}
          dataPadrao={format(dataBase, 'yyyy-MM-dd')}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirmacaoExclusao
        aberto={modalExcluirAberto}
        nomeCliente={agendamentoSelecionado?.clientes?.nome || ''}
        processando={processandoExclusao}
        onConfirmar={deletarAgendamento}
        onCancelar={() => {
          setModalExcluirAberto(false);
          setAgendamentoSelecionado(null);
        }}
      />
    </div>
  );
}
