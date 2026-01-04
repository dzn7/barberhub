"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { 
  Calendar, DollarSign, Users, TrendingUp, TrendingDown, Package, Percent, LogOut, Scissors, Edit3, Clock, Menu, X, Settings, BarChart3, Filter, ChevronDown, Image as ImageIcon, MessageCircle, Store, Palette
} from "lucide-react";
import { Tabs } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { GestaoFinanceira } from "@/components/dashboard/GestaoFinanceira";
import { AtendimentosPresenciais } from "@/components/dashboard/AtendimentosPresenciais";
import { GestaoAgendamentos } from "@/components/dashboard/GestaoAgendamentos";
import { GestaoEstoque } from "@/components/dashboard/GestaoEstoque";
import { GestaoComissoes } from "@/components/dashboard/GestaoComissoes";
import { GestaoUsuarios } from "@/components/dashboard/GestaoUsuarios";
import { GestaoServicos } from "@/components/dashboard/GestaoServicos";
import { RemarcacaoAgendamento } from "@/components/dashboard/RemarcacaoAgendamento";
import { GestaoHorarios } from "@/components/dashboard/GestaoHorarios";
import { GestaoHorariosAvancada } from "@/components/dashboard/GestaoHorariosAvancada";
import { Relatorios } from "@/components/dashboard/Relatorios";
import { ConfiguracaoBarbearia } from "@/components/dashboard/ConfiguracaoBarbearia";
import { AlternadorTema } from "@/components/AlternadorTema";
// PWA removido temporariamente
// import { NotificationPermission } from "@/components/NotificationPermission";
// import { useAgendamentosRealtime } from "@/hooks/useAgendamentosRealtime";
import { supabase } from "@/lib/supabase";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Dashboard Completo de Gestão
 * Sistema integrado para controle total da barbearia
 */
export default function DashboardCompleto() {
  const router = useRouter();
  const { user, tenant, carregando: carregandoAuth, sair } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [filtroVisaoGeral, setFiltroVisaoGeral] = useState<{
    tipo: "hoje" | "semana" | "mes" | "ano" | "geral" | "personalizado";
    dataInicio: Date;
    dataFim: Date;
  }>({
    tipo: "geral",
    dataInicio: new Date(2020, 0, 1),
    dataFim: new Date()
  });
  const [metricas, setMetricas] = useState({
    receitaMensal: 0,
    totalAtendimentos: 0,
    ticketMedio: 0,
    lucroLiquido: 0,
    totalDespesas: 0,
    margemLucro: 0,
    receitaPorDia: [] as { data: string; valor: number }[],
    atendimentosPorBarbeiro: [] as { nome: string; total: number }[],
  });
  const [carregando, setCarregando] = useState(true);

  // Hook de notificações em tempo real (PWA removido temporariamente)
  // useAgendamentosRealtime({
  //   enabled: !!user && !!tenant,
  //   onNewAgendamento: (agendamento) => {
  //     console.log("[Dashboard] 🎉 Novo agendamento:", agendamento);
  //     buscarMetricas();
  //   },
  //   onCancelamento: (agendamento) => {
  //     console.log("[Dashboard] ❌ Cancelamento:", agendamento);
  //     buscarMetricas();
  //   },
  // });

  // Redirecionar se não autenticado
  useEffect(() => {
    if (!carregandoAuth && !user) {
      router.push("/entrar");
    }
  }, [carregandoAuth, user, router]);

  useEffect(() => {
    if (user && tenant) {
      buscarMetricas();
    }
  }, [user, tenant, filtroVisaoGeral]);

  // Função para aplicar filtro de período na visão geral
  const aplicarFiltroVisaoGeral = (tipo: typeof filtroVisaoGeral.tipo) => {
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date;

    switch (tipo) {
      case "hoje":
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
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
      case "geral":
        dataInicio = new Date(2020, 0, 1);
        dataFim = new Date();
        break;
      default:
        dataInicio = filtroVisaoGeral.dataInicio;
        dataFim = filtroVisaoGeral.dataFim;
    }

    setFiltroVisaoGeral({ tipo, dataInicio, dataFim });
  };

  const handleLogout = async () => {
    await sair();
    router.push("/entrar");
  };

  const buscarMetricas = async () => {
    try {
      const inicioMes = filtroVisaoGeral.dataInicio.toISOString();
      const fimMes = filtroVisaoGeral.dataFim.toISOString();

      console.log('[Métricas] Buscando dados do período:', { inicioMes, fimMes, tipo: filtroVisaoGeral.tipo });

      // Buscar agendamentos confirmados e concluídos do mês
      const { data: agendamentos, error: erroAgendamentos, count } = await supabase
        .from('agendamentos')
        .select(`
          *,
          servicos (preco),
          barbeiros (nome)
        `, { count: 'exact' })
        .eq('tenant_id', tenant?.id)
        .in('status', ['confirmado', 'concluido'])
        .gte('data_hora', inicioMes)
        .lte('data_hora', fimMes);

      console.log('[Métricas] Agendamentos encontrados:', { 
        total: count, 
        retornados: agendamentos?.length,
        erro: erroAgendamentos,
        primeiroAgendamento: agendamentos?.[0],
        todosAgendamentos: agendamentos
      });

      if (erroAgendamentos) {
        console.error('[Métricas] Erro ao buscar agendamentos:', erroAgendamentos);
        throw erroAgendamentos;
      }

      // Buscar atendimentos presenciais do mês
      const { data: atendimentos, error: erroAtendimentos } = await supabase
        .from('atendimentos_presenciais')
        .select(`
          valor,
          data,
          barbeiros (nome)
        `)
        .eq('tenant_id', tenant?.id)
        .gte('data', inicioMes)
        .lte('data', fimMes);

      console.log('[Métricas] Atendimentos presenciais:', { 
        total: atendimentos?.length,
        erro: erroAtendimentos 
      });

      if (erroAtendimentos) {
        console.error('[Métricas] Erro ao buscar atendimentos:', erroAtendimentos);
        throw erroAtendimentos;
      }

      // Buscar despesas do mês
      const { data: despesas, error: erroDespesas } = await supabase
        .from('transacoes')
        .select('valor')
        .eq('tenant_id', tenant?.id)
        .eq('tipo', 'despesa')
        .gte('data', inicioMes)
        .lte('data', fimMes);

      console.log('[Métricas] Despesas:', { 
        total: despesas?.length,
        erro: erroDespesas 
      });

      if (erroDespesas) {
        console.error('[Métricas] Erro ao buscar despesas:', erroDespesas);
        throw erroDespesas;
      }

      // Calcular métricas
      const receitaAgendamentos = (agendamentos as any[])?.reduce((sum, a) => sum + (a.servicos?.preco || 0), 0) || 0;
      const receitaAtendimentos = (atendimentos as any[])?.reduce((sum, a) => sum + a.valor, 0) || 0;
      const receitaTotal = receitaAgendamentos + receitaAtendimentos;
      const totalDespesas = (despesas as any[])?.reduce((sum, d) => sum + d.valor, 0) || 0;
      const lucroLiquidoReal = receitaTotal - totalDespesas;
      const totalAtendimentos = (agendamentos?.length || 0) + (atendimentos?.length || 0);
      const ticketMedio = totalAtendimentos > 0 ? receitaTotal / totalAtendimentos : 0;

      console.log('[Métricas] Cálculos intermediários:', {
        receitaAgendamentos,
        receitaAtendimentos,
        receitaTotal,
        totalDespesas,
        lucroLiquidoReal,
        totalAtendimentos,
        ticketMedio
      });

      // Dados para gráficos
      const receitaPorDia = calcularReceitaPorDia(agendamentos || [], atendimentos || []);
      const atendimentosPorBarbeiro = calcularAtendimentosPorBarbeiro(agendamentos || [], atendimentos || []);

      console.log('[Métricas] Dados dos gráficos:', {
        receitaPorDia,
        atendimentosPorBarbeiro
      });

      setMetricas({
        receitaMensal: receitaTotal,
        totalAtendimentos,
        ticketMedio,
        lucroLiquido: lucroLiquidoReal,
        totalDespesas,
        margemLucro: receitaTotal > 0 ? (lucroLiquidoReal / receitaTotal) * 100 : 0,
        receitaPorDia,
        atendimentosPorBarbeiro,
      });

      console.log('[Métricas] ✅ Métricas atualizadas com sucesso!', {
        receitaTotal,
        totalAtendimentos,
        ticketMedio,
      });
    } catch (error) {
      console.error('[Métricas] ❌ Erro ao buscar métricas:', error);
    } finally {
      setCarregando(false);
    }
  };

  const calcularReceitaPorDia = (agendamentos: any[], atendimentos: any[]) => {
    const dados: { [key: string]: number } = {};
    
    console.log('[Gráfico] Calculando receita por dia...', {
      totalAgendamentos: agendamentos.length,
      totalAtendimentos: atendimentos.length
    });

    // Somar receitas dos agendamentos
    agendamentos.forEach(ag => {
      const dataStr = new Date(ag.data_hora).toISOString().split('T')[0];
      dados[dataStr] = (dados[dataStr] || 0) + (ag.servicos?.preco || 0);
    });

    // Somar receitas dos atendimentos
    atendimentos.forEach(at => {
      const dataStr = new Date(at.data).toISOString().split('T')[0];
      dados[dataStr] = (dados[dataStr] || 0) + at.valor;
    });

    // Se não houver dados, criar array dos últimos 7 dias com valores zerados
    if (Object.keys(dados).length === 0) {
      console.log('[Gráfico] ⚠️ Nenhum dado encontrado, criando array vazio dos últimos 7 dias');
      const dadosVazios = [];
      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        dadosVazios.push({
          data: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          valor: 0
        });
      }
      return dadosVazios;
    }

    // Ordenar por data e pegar os últimos 7 dias com dados
    const dadosOrdenados = Object.entries(dados)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([data, valor]) => ({
        data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        valor
      }));

    console.log('[Gráfico] Receita por dia calculada:', dadosOrdenados);

    return dadosOrdenados;
  };

  const calcularAtendimentosPorBarbeiro = (agendamentos: any[], atendimentos: any[]) => {
    const dados: { [key: string]: number } = {};

    // Contar agendamentos por barbeiro
    agendamentos.forEach(ag => {
      const nome = ag.barbeiros?.nome || 'Sem barbeiro';
      dados[nome] = (dados[nome] || 0) + 1;
    });

    // Contar atendimentos por barbeiro
    atendimentos.forEach(at => {
      const nome = at.barbeiros?.nome || 'Sem barbeiro';
      dados[nome] = (dados[nome] || 0) + 1;
    });

    return Object.entries(dados).map(([nome, total]) => ({ nome, total }));
  };

  // Estado de carregamento
  if (carregandoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Usuário não autenticado - será redirecionado pelo useEffect
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-zinc-900 dark:border-white mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  // Usuário autenticado mas sem tenant (erro de configuração)
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Erro ao carregar dados</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Não foi possível carregar os dados da sua barbearia. Isso pode acontecer se sua conta não está vinculada a uma barbearia.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => sair().then(() => router.push('/entrar'))}
              className="w-full px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Fazer logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black overflow-x-hidden">
      {/* Componente de Notificações Push - PWA removido temporariamente */}
      {/* <NotificationPermission /> */}
      
      {/* Navbar Exclusiva do Dashboard */}
      <header className="bg-white dark:bg-[#1a1a1a] border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 w-full">
        <div className="container mx-auto px-4 max-w-full">
          <div className="flex items-center justify-between h-16">
            {/* Logo do Tenant */}
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {tenant.logo_url ? (
                  <Image
                    src={tenant.logo_url}
                    alt={tenant.nome}
                    fill
                    sizes="56px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <Store className="w-6 h-6 text-zinc-500" />
                )}
              </div>
              <div className="hidden sm:flex items-center border-l border-zinc-300 dark:border-zinc-700 pl-4 h-10">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">
                  Dashboard Administrativo
                </p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-3">
              <AlternadorTema />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <div className="container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
        <Tabs.Root value={abaAtiva} onValueChange={(value) => {
          setAbaAtiva(value);
          setMenuMobileAberto(false); // Fechar menu ao selecionar
        }}>
          {/* Botão Menu Mobile */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setMenuMobileAberto(!menuMobileAberto)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
            >
              <span className="font-semibold text-zinc-900 dark:text-white">
                Menu
              </span>
              {menuMobileAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Menu Desktop */}
          <Tabs.List className="mb-8 hidden lg:flex">
            <Tabs.Trigger value="visao-geral">
              <TrendingUp className="w-4 h-4 mr-2" />
              Visão Geral
            </Tabs.Trigger>
            <Tabs.Trigger value="agendamentos">
              <Calendar className="w-4 h-4 mr-2" />
              Agendamentos
            </Tabs.Trigger>
            <Tabs.Trigger value="financeiro">
              <DollarSign className="w-4 h-4 mr-2" />
              Financeiro
            </Tabs.Trigger>
            <Tabs.Trigger value="atendimentos">
              <Users className="w-4 h-4 mr-2" />
              Atendimentos
            </Tabs.Trigger>
            <Tabs.Trigger value="estoque">
              <Package className="w-4 h-4 mr-2" />
              Estoque
            </Tabs.Trigger>
            <Tabs.Trigger value="comissoes">
              <Percent className="w-4 h-4 mr-2" />
              Comissões
            </Tabs.Trigger>
            <Tabs.Trigger value="usuarios">
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </Tabs.Trigger>
            <Tabs.Trigger value="servicos">
              <Edit3 className="w-4 h-4 mr-2" />
              Serviços
            </Tabs.Trigger>
                        <Tabs.Trigger value="remarcacao">
              <Clock className="w-4 h-4 mr-2" />
              Remarcação
            </Tabs.Trigger>
            <Tabs.Trigger value="horarios">
              <Clock className="w-4 h-4 mr-2" />
              Horários
            </Tabs.Trigger>
            <Tabs.Trigger value="relatorios">
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatórios
            </Tabs.Trigger>
            <Tabs.Trigger value="configuracoes">
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Tabs.Trigger>
          </Tabs.List>

          {/* Menu Mobile */}
          {menuMobileAberto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mb-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <div className="flex flex-col">
                {[
                  { value: "visao-geral", icon: TrendingUp, label: "Visão Geral" },
                  { value: "agendamentos", icon: Calendar, label: "Agendamentos" },
                  { value: "financeiro", icon: DollarSign, label: "Financeiro" },
                  { value: "atendimentos", icon: Users, label: "Atendimentos" },
                  { value: "estoque", icon: Package, label: "Estoque" },
                  { value: "comissoes", icon: Percent, label: "Comissões" },
                  { value: "usuarios", icon: Users, label: "Usuários" },
                  { value: "servicos", icon: Edit3, label: "Serviços" },
                                    { value: "remarcacao", icon: Clock, label: "Remarcação" },
                  { value: "horarios", icon: Clock, label: "Horários" },
                  { value: "relatorios", icon: BarChart3, label: "Relatórios" },
                  { value: "configuracoes", icon: Settings, label: "Configurações" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setAbaAtiva(item.value);
                        setMenuMobileAberto(false);
                      }}
                      className={`flex items-center gap-3 p-4 text-left transition-colors ${
                        abaAtiva === item.value
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Visão Geral */}
          <Tabs.Content value="visao-geral">
            <div className="space-y-6">
              {/* Cabeçalho com filtros de período */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  Visão Geral do Negócio
                </h2>

                {/* Filtros de período */}
                <div className="flex flex-wrap items-center gap-2">
                  {(["geral", "hoje", "semana", "mes", "ano"] as const).map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => aplicarFiltroVisaoGeral(tipo)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filtroVisaoGeral.tipo === tipo
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {tipo === "geral" && "Geral"}
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
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filtroVisaoGeral.tipo === "personalizado"
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-black"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      Personalizado
                      <ChevronDown className={`w-3 h-3 transition-transform ${filtroAberto ? "rotate-180" : ""}`} />
                    </button>

                    {filtroAberto && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute right-0 top-full mt-2 p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 z-50 min-w-[260px]"
                      >
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Data Início
                            </label>
                            <input
                              type="date"
                              value={format(filtroVisaoGeral.dataInicio, "yyyy-MM-dd")}
                              onChange={(e) => {
                                const novaData = new Date(e.target.value + "T00:00:00");
                                setFiltroVisaoGeral({
                                  tipo: "personalizado",
                                  dataInicio: novaData,
                                  dataFim: filtroVisaoGeral.dataFim
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
                              value={format(filtroVisaoGeral.dataFim, "yyyy-MM-dd")}
                              onChange={(e) => {
                                const novaData = new Date(e.target.value + "T23:59:59");
                                setFiltroVisaoGeral({
                                  tipo: "personalizado",
                                  dataInicio: filtroVisaoGeral.dataInicio,
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

              {/* Indicador de período selecionado */}
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Período: {format(filtroVisaoGeral.dataInicio, "dd/MM/yyyy", { locale: ptBR })} até {format(filtroVisaoGeral.dataFim, "dd/MM/yyyy", { locale: ptBR })}
              </div>
              
              {/* Cards de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard
                  titulo="Receita Prevista"
                  valor={`R$ ${metricas.receitaMensal.toFixed(2)}`}
                  icone={DollarSign}
                  tendencia={{ valor: 0, positiva: true }}
                  carregando={carregando}
                />
                <MetricCard
                  titulo="Atendimentos"
                  valor={metricas.totalAtendimentos.toString()}
                  icone={Users}
                  tendencia={{ valor: 0, positiva: true }}
                  carregando={carregando}
                />
                <MetricCard
                  titulo="Ticket Médio"
                  valor={`R$ ${metricas.ticketMedio.toFixed(2)}`}
                  icone={TrendingUp}
                  carregando={carregando}
                />
                <MetricCard
                  titulo="Despesas Mensais"
                  valor={`R$ ${metricas.totalDespesas.toFixed(2)}`}
                  icone={TrendingDown}
                  carregando={carregando}
                />
                <MetricCard
                  titulo="Lucro Líquido"
                  valor={`R$ ${metricas.lucroLiquido.toFixed(2)}`}
                  icone={metricas.lucroLiquido >= 0 ? TrendingUp : TrendingDown}
                  tendencia={{ 
                    valor: Math.abs(metricas.margemLucro), 
                    positiva: metricas.lucroLiquido >= 0 
                  }}
                  carregando={carregando}
                />
              </div>

              {/* Gráficos e Relatórios */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    Receita dos Últimos 7 Dias
                  </h3>
                  <GraficoReceita dados={metricas.receitaPorDia} carregando={carregando} />
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    Atendimentos por Barbeiro
                  </h3>
                  <GraficoBarbeiros dados={metricas.atendimentosPorBarbeiro} carregando={carregando} />
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Agendamentos */}
          <Tabs.Content value="agendamentos">
            <GestaoAgendamentos />
          </Tabs.Content>

          {/* Financeiro */}
          <Tabs.Content value="financeiro">
            <GestaoFinanceira />
          </Tabs.Content>

          {/* Atendimentos Presenciais */}
          <Tabs.Content value="atendimentos">
            <AtendimentosPresenciais />
          </Tabs.Content>

          {/* Estoque */}
          <Tabs.Content value="estoque">
            <GestaoEstoque />
          </Tabs.Content>

          {/* Comissões */}
          <Tabs.Content value="comissoes">
            <GestaoComissoes />
          </Tabs.Content>

          {/* Usuários */}
          <Tabs.Content value="usuarios">
            <GestaoUsuarios />
          </Tabs.Content>

          {/* Serviços */}
          <Tabs.Content value="servicos">
            <GestaoServicos />
          </Tabs.Content>

          
          {/* Remarcação */}
          <Tabs.Content value="remarcacao">
            <RemarcacaoAgendamento />
          </Tabs.Content>

          {/* Horários */}
          <Tabs.Content value="horarios">
            <GestaoHorarios />
          </Tabs.Content>

          {/* Relatórios */}
          <Tabs.Content value="relatorios">
            <Relatorios />
          </Tabs.Content>

          {/* Configurações */}
          <Tabs.Content value="configuracoes">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-8 h-8 text-zinc-700 dark:text-zinc-300" />
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    Configurações da Barbearia
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Personalize sua barbearia: logo, cores, dados e horários
                  </p>
                </div>
              </div>
              
              {/* Tabs internas para configurações */}
              <Tabs.Root defaultValue="personalizacao">
                <Tabs.List className="mb-6">
                  <Tabs.Trigger value="personalizacao">
                    <Palette className="w-4 h-4 mr-2" />
                    Personalização
                  </Tabs.Trigger>
                  <Tabs.Trigger value="horarios">
                    <Clock className="w-4 h-4 mr-2" />
                    Horários e Bloqueios
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="personalizacao">
                  <ConfiguracaoBarbearia />
                </Tabs.Content>

                <Tabs.Content value="horarios">
                  <GestaoHorariosAvancada />
                </Tabs.Content>
              </Tabs.Root>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

// Componente auxiliar para cards de métrica
function MetricCard({ 
  titulo, 
  valor, 
  icone: Icone, 
  tendencia,
  carregando = false
}: { 
  titulo: string; 
  valor: string; 
  icone: any; 
  tendencia?: { valor: number; positiva: boolean };
  carregando?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Icone className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
        </div>
        {tendencia && !carregando && (
          <div className={`text-sm font-medium ${tendencia.positiva ? 'text-green-600' : 'text-red-600'}`}>
            {tendencia.positiva ? '+' : ''}{tendencia.valor}%
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{titulo}</p>
        {carregando ? (
          <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{valor}</p>
        )}
      </div>
    </motion.div>
  );
}

// Componente de gráfico de receita
function GraficoReceita({ 
  dados, 
  carregando 
}: { 
  dados: { data: string; valor: number }[]; 
  carregando: boolean;
}) {
  if (carregando) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500 dark:text-zinc-400">
          Carregando dados...
        </div>
      </div>
    );
  }

  // Agora sempre temos dados (pelo menos 7 dias com valores zerados)
  console.log('[GraficoReceita] Renderizando com dados:', dados);

  const maxValor = Math.max(...dados.map(d => d.valor), 1); // Mínimo 1 para evitar divisão por zero

  return (
    <div className="h-64">
      <div className="flex items-end justify-between h-48 gap-2">
        {dados.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
              style={{ 
                height: maxValor > 0 ? `${(item.valor / maxValor) * 100}%` : '2px',
                minHeight: '2px'
              }}
            />
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 text-center">
              {item.data}
            </div>
            <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              R$ {item.valor.toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de gráfico de barbeiros
function GraficoBarbeiros({ 
  dados, 
  carregando 
}: { 
  dados: { nome: string; total: number }[]; 
  carregando: boolean;
}) {
  if (carregando) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-zinc-500 dark:text-zinc-400">
          Carregando dados...
        </div>
      </div>
    );
  }

  console.log('[GraficoBarbeiros] Renderizando com dados:', dados);

  if (dados.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
        Nenhum atendimento registrado neste período
      </div>
    );
  }

  const cores = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];

  return (
    <div className="h-64 space-y-4">
      {dados.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-24 text-sm text-zinc-900 dark:text-zinc-100 truncate">
            {item.nome}
          </div>
          <div className="flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-full h-6 relative overflow-hidden">
            <div 
              className={`h-full ${cores[index % cores.length]} rounded-full transition-all duration-500`}
              style={{ 
                width: dados.length > 0 ? `${(item.total / Math.max(...dados.map(d => d.total))) * 100}%` : '0%'
              }}
            />
          </div>
          <div className="w-8 text-sm font-medium text-zinc-900 dark:text-zinc-100 text-right">
            {item.total}
          </div>
        </div>
      ))}
    </div>
  );
}
