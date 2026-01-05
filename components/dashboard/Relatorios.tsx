"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import {
  Scissors, DollarSign, Clock, TrendingUp, Calendar, Filter,
  Download, ChevronDown, Users, Star, AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, endOfYear, subDays, subMonths, parseISO, eachDayOfInterval,
  eachWeekOfInterval, eachMonthOfInterval, getHours
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos para os dados dos relatórios
interface ServicoPopular {
  nome: string;
  quantidade: number;
  faturamento: number;
}

interface HorarioPico {
  hora: string;
  quantidade: number;
}

interface DadosPorPeriodo {
  periodo: string;
  atendimentos: number;
  faturamento: number;
}

interface FiltroRelatorio {
  tipo: "hoje" | "semana" | "mes" | "ano" | "personalizado";
  dataInicio: Date;
  dataFim: Date;
}

interface DadosRelatorio {
  servicosMaisPedidos: ServicoPopular[];
  servicosMaisFaturam: ServicoPopular[];
  horariosPico: HorarioPico[];
  evolucaoFaturamento: DadosPorPeriodo[];
  evolucaoAtendimentos: DadosPorPeriodo[];
  resumo: {
    totalAtendimentos: number;
    faturamentoTotal: number;
    ticketMedio: number;
    clientesAtendidos: number;
    taxaCancelamento: number;
    avaliacaoMedia: number;
  };
  formaPagamentoDistribuicao: { nome: string; valor: number }[];
  diasSemanaDistribuicao: { dia: string; quantidade: number }[];
}

// Interfaces para dados do banco
interface AgendamentoRelatorio {
  id: string;
  data_hora: string;
  status: string;
  valor_pago?: number;
  forma_pagamento?: string;
  avaliacao?: number;
  servicos?: Record<string, unknown>;
  clientes?: Record<string, unknown>;
}

interface AtendimentoPresencialRelatorio {
  id: string;
  data: string;
  valor?: number;
  forma_pagamento?: string;
  servicos?: Record<string, unknown>;
}

// Helpers para extrair dados de forma segura (Supabase pode retornar objeto ou array)
const extrairServico = (servicos: unknown): { nome: string; preco: number } | null => {
  if (!servicos) return null;
  if (Array.isArray(servicos) && servicos.length > 0) {
    return { nome: servicos[0]?.nome || '', preco: servicos[0]?.preco || 0 };
  }
  if (typeof servicos === 'object') {
    const s = servicos as Record<string, unknown>;
    return { nome: String(s.nome || ''), preco: Number(s.preco || 0) };
  }
  return null;
};

const extrairCliente = (clientes: unknown): { id: string } | null => {
  if (!clientes) return null;
  if (Array.isArray(clientes) && clientes.length > 0) {
    return { id: clientes[0]?.id || '' };
  }
  if (typeof clientes === 'object') {
    const c = clientes as Record<string, unknown>;
    return { id: String(c.id || '') };
  }
  return null;
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CardMetricaProps {
  titulo: string;
  valor: string;
  icone: React.ComponentType<{ className?: string }>;
  cor: "blue" | "green" | "purple" | "zinc" | "red" | "yellow";
}

// Cores para os gráficos
const CORES_GRAFICOS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
];

const CORES_FORMA_PAGAMENTO: Record<string, string> = {
  pix: "#10b981",
  dinheiro: "#f59e0b",
  credito: "#3b82f6",
  debito: "#8b5cf6",
  transferencia: "#06b6d4"
};

export function Relatorios() {
  const { tenant } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [filtro, setFiltro] = useState<FiltroRelatorio>({
    tipo: "mes",
    dataInicio: startOfMonth(new Date()),
    dataFim: endOfMonth(new Date())
  });
  const [dados, setDados] = useState<DadosRelatorio | null>(null);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  // Aplicar filtro de período
  const aplicarFiltroPeriodo = (tipo: FiltroRelatorio["tipo"]) => {
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date;

    switch (tipo) {
      case "hoje":
        dataInicio = new Date(hoje.setHours(0, 0, 0, 0));
        dataFim = new Date(hoje.setHours(23, 59, 59, 999));
        break;
      case "semana":
        dataInicio = startOfWeek(hoje, { weekStartsOn: 0 });
        dataFim = endOfWeek(hoje, { weekStartsOn: 0 });
        break;
      case "mes":
        dataInicio = startOfMonth(hoje);
        dataFim = endOfMonth(hoje);
        break;
      case "ano":
        dataInicio = startOfYear(hoje);
        dataFim = endOfYear(hoje);
        break;
      default:
        dataInicio = filtro.dataInicio;
        dataFim = filtro.dataFim;
    }

    setFiltro({ tipo, dataInicio, dataFim });
  };

  // Buscar dados do relatório
  const buscarDadosRelatorio = async () => {
    if (!tenant?.id) {
      setErroCarregamento("Tenant não identificado");
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErroCarregamento(null);

    try {
      const inicioISO = filtro.dataInicio.toISOString();
      const fimISO = filtro.dataFim.toISOString();

      // Buscar agendamentos do período - FILTRADO POR TENANT
      const { data: agendamentos, error: erroAgendamentos } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          status,
          valor_pago,
          forma_pagamento,
          avaliacao,
          servicos (id, nome, preco),
          clientes (id, nome),
          barbeiros (id, nome)
        `)
        .eq("tenant_id", tenant.id)
        .gte("data_hora", inicioISO)
        .lte("data_hora", fimISO);

      if (erroAgendamentos) {
        throw new Error("Erro ao buscar agendamentos: " + erroAgendamentos.message);
      }

      // Buscar atendimentos presenciais - FILTRADO POR TENANT
      const { data: atendimentosPresenciais, error: erroAtendimentos } = await supabase
        .from("atendimentos_presenciais")
        .select(`
          id,
          data,
          valor,
          forma_pagamento,
          servicos (id, nome, preco),
          barbeiros (id, nome)
        `)
        .eq("tenant_id", tenant.id)
        .gte("data", inicioISO)
        .lte("data", fimISO);

      if (erroAtendimentos) {
        throw new Error("Erro ao buscar atendimentos: " + erroAtendimentos.message);
      }

      // Processar dados (cast necessário pois Supabase retorna tipos dinâmicos)
      const dadosProcessados = processarDadosRelatorio(
        (agendamentos || []) as unknown as AgendamentoRelatorio[],
        (atendimentosPresenciais || []) as unknown as AtendimentoPresencialRelatorio[],
        filtro
      );

      setDados(dadosProcessados);
    } catch (erro) {
      console.error("[Relatórios] Erro:", erro);
      setErroCarregamento(erro instanceof Error ? erro.message : "Erro ao carregar relatórios");
    } finally {
      setCarregando(false);
    }
  };

  // Processar dados para os relatórios
  const processarDadosRelatorio = (
    agendamentos: AgendamentoRelatorio[],
    atendimentosPresenciais: AtendimentoPresencialRelatorio[],
    filtroAtual: FiltroRelatorio
  ): DadosRelatorio => {
    // Filtrar agendamentos confirmados e concluídos
    const agendamentosValidos = agendamentos.filter(
      (ag) => ag.status === "confirmado" || ag.status === "concluido"
    );
    const agendamentosCancelados = agendamentos.filter(
      (ag) => ag.status === "cancelado"
    );

    // Combinar todos os atendimentos
    const todosAtendimentos = [
      ...agendamentosValidos.map((ag) => {
        const servico = extrairServico(ag.servicos);
        const cliente = extrairCliente(ag.clientes);
        return {
          data: parseISO(ag.data_hora),
          hora: getHours(parseISO(ag.data_hora)),
          valor: servico?.preco || ag.valor_pago || 0,
          servico: servico?.nome || "Serviço não identificado",
          formaPagamento: ag.forma_pagamento || "nao_informado",
          avaliacao: ag.avaliacao,
          clienteId: cliente?.id || null
        };
      }),
      ...atendimentosPresenciais.map((at) => {
        const servico = extrairServico(at.servicos);
        return {
          data: parseISO(at.data),
          hora: getHours(parseISO(at.data)),
          valor: at.valor || servico?.preco || 0,
          servico: servico?.nome || "Serviço não identificado",
          formaPagamento: at.forma_pagamento || "nao_informado",
          avaliacao: null,
          clienteId: null
        };
      })
    ];

    // Calcular serviços mais pedidos
    const contagemServicos: Record<string, { quantidade: number; faturamento: number }> = {};
    todosAtendimentos.forEach((at) => {
      if (!contagemServicos[at.servico]) {
        contagemServicos[at.servico] = { quantidade: 0, faturamento: 0 };
      }
      contagemServicos[at.servico].quantidade += 1;
      contagemServicos[at.servico].faturamento += at.valor;
    });

    const servicosMaisPedidos = Object.entries(contagemServicos)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    const servicosMaisFaturam = Object.entries(contagemServicos)
      .map(([nome, dados]) => ({ nome, ...dados }))
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10);

    // Calcular horários de pico
    const contagemHorarios: Record<number, number> = {};
    todosAtendimentos.forEach((at) => {
      contagemHorarios[at.hora] = (contagemHorarios[at.hora] || 0) + 1;
    });

    const horariosPico = Object.entries(contagemHorarios)
      .map(([hora, quantidade]) => ({
        hora: `${hora.padStart(2, "0")}:00`,
        quantidade
      }))
      .sort((a, b) => parseInt(a.hora) - parseInt(b.hora));

    // Calcular evolução por período
    const evolucaoPorDia: Record<string, { atendimentos: number; faturamento: number }> = {};
    todosAtendimentos.forEach((at) => {
      const dataStr = format(at.data, "dd/MM", { locale: ptBR });
      if (!evolucaoPorDia[dataStr]) {
        evolucaoPorDia[dataStr] = { atendimentos: 0, faturamento: 0 };
      }
      evolucaoPorDia[dataStr].atendimentos += 1;
      evolucaoPorDia[dataStr].faturamento += at.valor;
    });

    const evolucaoFaturamento = Object.entries(evolucaoPorDia)
      .map(([periodo, dados]) => ({ periodo, ...dados }))
      .slice(-30);

    const evolucaoAtendimentos = evolucaoFaturamento;

    // Distribuição por forma de pagamento
    const contagemFormaPagamento: Record<string, number> = {};
    todosAtendimentos.forEach((at) => {
      const forma = at.formaPagamento || "nao_informado";
      contagemFormaPagamento[forma] = (contagemFormaPagamento[forma] || 0) + at.valor;
    });

    const formaPagamentoDistribuicao = Object.entries(contagemFormaPagamento)
      .map(([nome, valor]) => ({
        nome: traduzirFormaPagamento(nome),
        valor
      }))
      .filter((item) => item.valor > 0);

    // Distribuição por dia da semana
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const contagemDias: Record<number, number> = {};
    todosAtendimentos.forEach((at) => {
      const dia = at.data.getDay();
      contagemDias[dia] = (contagemDias[dia] || 0) + 1;
    });

    const diasSemanaDistribuicao = diasSemana.map((dia, index) => ({
      dia,
      quantidade: contagemDias[index] || 0
    }));

    // Calcular resumo
    const faturamentoTotal = todosAtendimentos.reduce((sum, at) => sum + at.valor, 0);
    const totalAtendimentos = todosAtendimentos.length;
    const clientesUnicos = new Set(
      todosAtendimentos.filter((at) => at.clienteId).map((at) => at.clienteId)
    ).size;
    const avaliacoesValidas = todosAtendimentos.filter((at) => at.avaliacao !== null);
    const avaliacaoMedia =
      avaliacoesValidas.length > 0
        ? avaliacoesValidas.reduce((sum, at) => sum + (at.avaliacao || 0), 0) /
          avaliacoesValidas.length
        : 0;
    const totalAgendamentos = agendamentos.length;
    const taxaCancelamento =
      totalAgendamentos > 0
        ? (agendamentosCancelados.length / totalAgendamentos) * 100
        : 0;

    return {
      servicosMaisPedidos,
      servicosMaisFaturam,
      horariosPico,
      evolucaoFaturamento,
      evolucaoAtendimentos,
      resumo: {
        totalAtendimentos,
        faturamentoTotal,
        ticketMedio: totalAtendimentos > 0 ? faturamentoTotal / totalAtendimentos : 0,
        clientesAtendidos: clientesUnicos,
        taxaCancelamento,
        avaliacaoMedia
      },
      formaPagamentoDistribuicao,
      diasSemanaDistribuicao
    };
  };

  // Traduzir forma de pagamento
  const traduzirFormaPagamento = (forma: string): string => {
    const traducoes: Record<string, string> = {
      pix: "PIX",
      dinheiro: "Dinheiro",
      credito: "Cartão de Crédito",
      debito: "Cartão de Débito",
      transferencia: "Transferência",
      nao_informado: "Não informado"
    };
    return traducoes[forma] || forma;
  };

  // Formatar valor monetário
  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  // Efeito para buscar dados quando filtro ou tenant muda
  useEffect(() => {
    if (tenant?.id) {
      buscarDadosRelatorio();
    }
  }, [filtro, tenant?.id]);

  // Tooltip customizado para gráficos
  const TooltipCustomizado = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes("R$") || entry.dataKey === "faturamento"
                ? formatarMoeda(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Renderizar estado de carregamento
  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  // Renderizar estado de erro
  if (erroCarregamento) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{erroCarregamento}</p>
          <button
            onClick={buscarDadosRelatorio}
            className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Cabeçalho com filtros */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
            Relatórios e Análises
          </h2>
          <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 mt-1">
            Análise detalhada do desempenho da barbearia
          </p>
        </div>

        {/* Filtros de período */}
        <div className="flex flex-wrap items-center gap-2">
          {(["hoje", "semana", "mes", "ano"] as const).map((tipo) => (
            <button
              key={tipo}
              onClick={() => aplicarFiltroPeriodo(tipo)}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                filtro.tipo === tipo
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {tipo === "hoje" && "Hoje"}
              {tipo === "semana" && "Semana"}
              {tipo === "mes" && "Mês"}
              {tipo === "ano" && "Ano"}
            </button>
          ))}

          {/* Filtro personalizado */}
          <div className="relative">
            <button
              onClick={() => setFiltroAberto(!filtroAberto)}
              className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                filtro.tipo === "personalizado"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <Filter className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Personalizado</span>
              <span className="sm:hidden">Custom</span>
              <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${filtroAberto ? "rotate-180" : ""}`} />
            </button>

            {filtroAberto && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 z-50 w-[280px]"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={format(filtro.dataInicio, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const novaData = new Date(e.target.value + "T00:00:00");
                        setFiltro({
                          tipo: "personalizado",
                          dataInicio: novaData,
                          dataFim: filtro.dataFim
                        });
                      }}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={format(filtro.dataFim, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const novaData = new Date(e.target.value + "T23:59:59");
                        setFiltro({
                          tipo: "personalizado",
                          dataInicio: filtro.dataInicio,
                          dataFim: novaData
                        });
                      }}
                      className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm"
                    />
                  </div>
                  <button
                    onClick={() => setFiltroAberto(false)}
                    className="w-full px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity text-sm"
                  >
                    Aplicar
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Período selecionado */}
      <div className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
        Período: {format(filtro.dataInicio, "dd/MM/yyyy", { locale: ptBR })} até{" "}
        {format(filtro.dataFim, "dd/MM/yyyy", { locale: ptBR })}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <CardResumo
          titulo="Atendimentos"
          valor={dados?.resumo.totalAtendimentos.toString() || "0"}
          icone={Scissors}
          cor="blue"
        />
        <CardResumo
          titulo="Faturamento"
          valor={formatarMoeda(dados?.resumo.faturamentoTotal || 0)}
          icone={DollarSign}
          cor="green"
        />
        <CardResumo
          titulo="Ticket Médio"
          valor={formatarMoeda(dados?.resumo.ticketMedio || 0)}
          icone={TrendingUp}
          cor="purple"
        />
        <CardResumo
          titulo="Clientes"
          valor={dados?.resumo.clientesAtendidos.toString() || "0"}
          icone={Users}
          cor="zinc"
        />
        <CardResumo
          titulo="Taxa Cancel."
          valor={`${(dados?.resumo.taxaCancelamento || 0).toFixed(1)}%`}
          icone={AlertCircle}
          cor="red"
        />
        <CardResumo
          titulo="Avaliação"
          valor={dados?.resumo.avaliacaoMedia ? `${dados.resumo.avaliacaoMedia.toFixed(1)} ★` : "N/A"}
          icone={Star}
          cor="yellow"
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Serviços mais pedidos */}
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <Scissors className="w-4 h-4 md:w-5 md:h-5" />
            <span className="truncate">Serviços Mais Pedidos</span>
          </h3>
          {dados?.servicosMaisPedidos.length === 0 ? (
            <div className="h-48 md:h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
              <BarChart data={dados?.servicosMaisPedidos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={80}
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<TooltipCustomizado />} />
                <Bar dataKey="quantidade" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Serviços que mais faturam */}
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
            <span className="truncate">Serviços que Mais Faturam</span>
          </h3>
          {dados?.servicosMaisFaturam.length === 0 ? (
            <div className="h-48 md:h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
              <BarChart data={dados?.servicosMaisFaturam} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis type="number" stroke="#9ca3af" tickFormatter={(value) => `R$ ${value}`} tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={80}
                  stroke="#9ca3af"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<TooltipCustomizado />} />
                <Bar dataKey="faturamento" fill="#10b981" radius={[0, 4, 4, 0]} name="Faturamento" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Horários de pico */}
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5" />
            <span className="truncate">Horários de Pico</span>
          </h3>
          {dados?.horariosPico.length === 0 ? (
            <div className="h-48 md:h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
              <AreaChart data={dados?.horariosPico}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="hora" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <Tooltip content={<TooltipCustomizado />} />
                <Area
                  type="monotone"
                  dataKey="quantidade"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  name="Atendimentos"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribuição por dia da semana */}
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5" />
            <span className="truncate">Atendimentos por Dia</span>
          </h3>
          {dados?.diasSemanaDistribuicao.every((d) => d.quantidade === 0) ? (
            <div className="h-48 md:h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
              <BarChart data={dados?.diasSemanaDistribuicao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="dia" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <Tooltip content={<TooltipCustomizado />} />
                <Bar dataKey="quantidade" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Atendimentos" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Gráficos secundários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Evolução do faturamento */}
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
            <span className="truncate">Evolução do Faturamento</span>
          </h3>
          {dados?.evolucaoFaturamento.length === 0 ? (
            <div className="h-48 md:h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
              <LineChart data={dados?.evolucaoFaturamento}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="periodo" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                <YAxis stroke="#9ca3af" tickFormatter={(value) => `R$ ${value}`} tick={{ fontSize: 10 }} />
                <Tooltip content={<TooltipCustomizado />} />
                <Line
                  type="monotone"
                  dataKey="faturamento"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 2 }}
                  name="Faturamento"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribuição por forma de pagamento */}
        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3 md:mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
            <span className="truncate">Formas de Pagamento</span>
          </h3>
          {dados?.formaPagamentoDistribuicao.length === 0 ? (
            <div className="h-48 md:h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
              Nenhum dado disponível
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
                <PieChart>
                  <Pie
                    data={dados?.formaPagamentoDistribuicao}
                    dataKey="valor"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {dados?.formaPagamentoDistribuicao.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CORES_GRAFICOS[index % CORES_GRAFICOS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatarMoeda(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de serviços detalhada */}
      <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-3 md:mb-4">
          Detalhamento por Serviço
        </h3>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    Serviço
                  </th>
                  <th className="text-center py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    Qtd
                  </th>
                  <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    Faturamento
                  </th>
                  <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap hidden sm:table-cell">
                    Ticket Médio
                  </th>
                  <th className="text-right py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap hidden md:table-cell">
                    % do Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {dados?.servicosMaisFaturam.map((servico, index) => {
                  const percentual =
                    dados.resumo.faturamentoTotal > 0
                      ? (servico.faturamento / dados.resumo.faturamentoTotal) * 100
                      : 0;
                  const ticketMedio =
                    servico.quantidade > 0 ? servico.faturamento / servico.quantidade : 0;

                  return (
                    <tr
                      key={index}
                      className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-zinc-900 dark:text-white font-medium">
                        <div className="truncate max-w-[120px] md:max-w-none">{servico.nome}</div>
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 text-center">
                        {servico.quantidade}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-zinc-900 dark:text-white text-right font-medium whitespace-nowrap">
                        {formatarMoeda(servico.faturamento)}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 text-right whitespace-nowrap hidden sm:table-cell">
                        {formatarMoeda(ticketMedio)}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-right hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 md:w-16 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${percentual}%` }}
                            />
                          </div>
                          <span className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 w-10 md:w-12 text-right">
                            {percentual.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para cards de resumo
function CardResumo({
  titulo,
  valor,
  icone: Icone,
  cor
}: {
  titulo: string;
  valor: string;
  icone: any;
  cor: "blue" | "green" | "purple" | "zinc" | "red" | "yellow";
}) {
  const coresIcone = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    zinc: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${coresIcone[cor]}`}>
        <Icone className="w-5 h-5" />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{titulo}</p>
      <p className="text-lg font-bold text-zinc-900 dark:text-white truncate">{valor}</p>
    </motion.div>
  );
}
