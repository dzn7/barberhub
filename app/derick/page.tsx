'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Users,
  Store,
  Calendar,
  TrendingUp,
  Database,
  Cloud,
  Bot,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  HardDrive,
  Wifi,
  WifiOff,
  Search,
  Filter,
  MoreVertical,
  X,
  LogOut,
  BarChart3,
  Scissors,
  UserCheck,
  AlertCircle
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Credenciais hardcoded do administrador do SaaS
const ADMIN_USUARIO = 'admin'
const ADMIN_SENHA = '1503'

interface Tenant {
  id: string
  slug: string
  nome: string
  email: string
  telefone: string | null
  whatsapp: string | null
  plano: string
  ativo: boolean
  trial_fim: string | null
  criado_em: string
  atualizado_em: string
  total_barbeiros: number
  total_servicos: number
  total_agendamentos: number
  total_clientes: number
}

interface EstatisticasGerais {
  totalTenants: number
  tenantsAtivos: number
  emTrial: number
  trialExpirado: number
  totalAgendamentos: number
  totalClientes: number
  totalBarbeiros: number
  totalServicos: number
}

interface StatusBot {
  online: boolean
  ultimaVerificacao: Date | null
  erro: string | null
}

/**
 * Painel Administrativo do SaaS BarberHub
 * Acesso exclusivo para o dono do sistema
 */
export default function PainelAdminSaaS() {
  // Estados de autenticação
  const [autenticado, setAutenticado] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erroLogin, setErroLogin] = useState('')
  const [tentandoLogin, setTentandoLogin] = useState(false)

  // Estados de dados
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'visao-geral' | 'barbearias' | 'infraestrutura'>('visao-geral')
  
  // Estados de filtro e busca
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'trial' | 'expirados'>('todos')
  
  // Estados de ações
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [modalConfirmacao, setModalConfirmacao] = useState<{ aberto: boolean; tenant: Tenant | null }>({ aberto: false, tenant: null })
  
  // Status do bot
  const [statusBot, setStatusBot] = useState<StatusBot>({ online: false, ultimaVerificacao: null, erro: null })
  const [verificandoBot, setVerificandoBot] = useState(false)

  // Verificar se já está autenticado (sessão local)
  useEffect(() => {
    const sessao = sessionStorage.getItem('admin_saas_auth')
    if (sessao === 'true') {
      setAutenticado(true)
    }
  }, [])

  // Carregar dados quando autenticado
  useEffect(() => {
    if (autenticado) {
      carregarDados()
      verificarStatusBot()
    }
  }, [autenticado])

  /**
   * Realiza o login do administrador
   */
  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTentandoLogin(true)
    setErroLogin('')

    // Simular delay para parecer mais seguro
    await new Promise(resolve => setTimeout(resolve, 800))

    if (usuario === ADMIN_USUARIO && senha === ADMIN_SENHA) {
      sessionStorage.setItem('admin_saas_auth', 'true')
      setAutenticado(true)
    } else {
      setErroLogin('Credenciais inválidas')
    }

    setTentandoLogin(false)
  }

  /**
   * Realiza o logout do administrador
   */
  const fazerLogout = () => {
    sessionStorage.removeItem('admin_saas_auth')
    setAutenticado(false)
    setUsuario('')
    setSenha('')
  }

  /**
   * Carrega todos os dados do painel
   */
  const carregarDados = async () => {
    setCarregando(true)
    try {
      // Buscar tenants com estatísticas
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('criado_em', { ascending: false })

      if (tenantsError) throw tenantsError

      // Buscar contagens para cada tenant
      const tenantsComEstatisticas = await Promise.all(
        (tenantsData || []).map(async (tenant) => {
          const [barbeiros, servicos, agendamentos, clientes] = await Promise.all([
            supabase.from('barbeiros').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('ativo', true),
            supabase.from('servicos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('ativo', true),
            supabase.from('agendamentos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
            supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          ])

          return {
            ...tenant,
            total_barbeiros: barbeiros.count || 0,
            total_servicos: servicos.count || 0,
            total_agendamentos: agendamentos.count || 0,
            total_clientes: clientes.count || 0,
          }
        })
      )

      setTenants(tenantsComEstatisticas)

      // Calcular estatísticas gerais
      const agora = new Date()
      const stats: EstatisticasGerais = {
        totalTenants: tenantsComEstatisticas.length,
        tenantsAtivos: tenantsComEstatisticas.filter(t => t.ativo).length,
        emTrial: tenantsComEstatisticas.filter(t => t.plano === 'trial').length,
        trialExpirado: tenantsComEstatisticas.filter(t => t.trial_fim && new Date(t.trial_fim) < agora).length,
        totalAgendamentos: tenantsComEstatisticas.reduce((acc, t) => acc + t.total_agendamentos, 0),
        totalClientes: tenantsComEstatisticas.reduce((acc, t) => acc + t.total_clientes, 0),
        totalBarbeiros: tenantsComEstatisticas.reduce((acc, t) => acc + t.total_barbeiros, 0),
        totalServicos: tenantsComEstatisticas.reduce((acc, t) => acc + t.total_servicos, 0),
      }

      setEstatisticas(stats)
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro)
    } finally {
      setCarregando(false)
    }
  }

  /**
   * Verifica o status do bot no Fly.io
   */
  const verificarStatusBot = async () => {
    setVerificandoBot(true)
    try {
      const resposta = await fetch('https://bot-barberhub.fly.dev/health', {
        method: 'GET',
        mode: 'cors',
      })

      setStatusBot({
        online: resposta.ok,
        ultimaVerificacao: new Date(),
        erro: resposta.ok ? null : `Status: ${resposta.status}`,
      })
    } catch (erro: any) {
      setStatusBot({
        online: false,
        ultimaVerificacao: new Date(),
        erro: 'Não foi possível conectar ao bot',
      })
    } finally {
      setVerificandoBot(false)
    }
  }

  /**
   * Exclui um tenant e todos os seus dados
   */
  const excluirTenant = async (tenant: Tenant) => {
    setExcluindo(tenant.id)
    try {
      // Excluir em ordem para respeitar foreign keys
      await supabase.from('notificacoes_enviadas').delete().eq('tenant_id', tenant.id)
      await supabase.from('historico_agendamentos').delete().eq('tenant_id', tenant.id)
      await supabase.from('agendamentos').delete().eq('tenant_id', tenant.id)
      await supabase.from('horarios_bloqueados').delete().eq('tenant_id', tenant.id)
      await supabase.from('transacoes').delete().eq('tenant_id', tenant.id)
      await supabase.from('comissoes').delete().eq('tenant_id', tenant.id)
      await supabase.from('curtidas_trabalhos').delete().eq('tenant_id', tenant.id)
      await supabase.from('comentarios_trabalhos').delete().eq('tenant_id', tenant.id)
      await supabase.from('trabalhos').delete().eq('tenant_id', tenant.id)
      await supabase.from('categorias_trabalhos').delete().eq('tenant_id', tenant.id)
      await supabase.from('avaliacoes_publicas').delete().eq('tenant_id', tenant.id)
      await supabase.from('produtos_estoque').delete().eq('tenant_id', tenant.id)
      await supabase.from('clientes').delete().eq('tenant_id', tenant.id)
      await supabase.from('servicos').delete().eq('tenant_id', tenant.id)
      await supabase.from('barbeiros').delete().eq('tenant_id', tenant.id)
      await supabase.from('configuracoes_barbearia').delete().eq('tenant_id', tenant.id)
      await supabase.from('configuracoes').delete().eq('tenant_id', tenant.id)
      await supabase.from('historico_configuracoes').delete().eq('tenant_id', tenant.id)
      await supabase.from('assinaturas').delete().eq('tenant_id', tenant.id)
      await supabase.from('whatsapp_auth').delete().eq('tenant_id', tenant.id)
      await supabase.from('proprietarios').delete().eq('tenant_id', tenant.id)
      
      // Por fim, excluir o tenant
      const { error } = await supabase.from('tenants').delete().eq('id', tenant.id)
      if (error) throw error

      // Atualizar lista
      setTenants(prev => prev.filter(t => t.id !== tenant.id))
      setModalConfirmacao({ aberto: false, tenant: null })
    } catch (erro) {
      console.error('Erro ao excluir tenant:', erro)
      alert('Erro ao excluir barbearia. Verifique o console.')
    } finally {
      setExcluindo(null)
    }
  }

  /**
   * Filtra os tenants baseado na busca e filtros
   */
  const tenantsFiltrados = tenants.filter(tenant => {
    const matchBusca = 
      tenant.nome.toLowerCase().includes(busca.toLowerCase()) ||
      tenant.email.toLowerCase().includes(busca.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(busca.toLowerCase())

    const agora = new Date()
    const trialExpirado = tenant.trial_fim && new Date(tenant.trial_fim) < agora

    switch (filtroStatus) {
      case 'ativos':
        return matchBusca && tenant.ativo && !trialExpirado
      case 'trial':
        return matchBusca && tenant.plano === 'trial' && !trialExpirado
      case 'expirados':
        return matchBusca && trialExpirado
      default:
        return matchBusca
    }
  })

  /**
   * Calcula o status do trial de um tenant
   */
  const getStatusTrial = (tenant: Tenant) => {
    if (!tenant.trial_fim) return { texto: 'Sem trial', cor: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800' }
    
    const agora = new Date()
    const fimTrial = new Date(tenant.trial_fim)
    const diasRestantes = differenceInDays(fimTrial, agora)

    if (diasRestantes < 0) {
      return { texto: 'Expirado', cor: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
    } else if (diasRestantes <= 3) {
      return { texto: `${diasRestantes}d restantes`, cor: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
    } else {
      return { texto: `${diasRestantes}d restantes`, cor: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' }
    }
  }

  // Tela de Login
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Painel Admin SaaS</h1>
            <p className="text-zinc-500">Acesso restrito ao proprietário</p>
          </div>

          <form onSubmit={fazerLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Usuário</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Digite o usuário"
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite a senha"
                  className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {erroLogin && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                {erroLogin}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={tentandoLogin || !usuario || !senha}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {tentandoLogin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Acessar Painel
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-600 mt-6">
            Este painel é de uso exclusivo do administrador do sistema BarberHub SaaS
          </p>
        </motion.div>
      </div>
    )
  }

  // Painel Principal
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white dark:text-black" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white">BarberHub Admin</h1>
                <p className="text-xs text-zinc-500">Painel do Proprietário</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={carregarDados}
                disabled={carregando}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={fazerLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 mt-4 -mb-px">
            {[
              { id: 'visao-geral', label: 'Visão Geral', icone: BarChart3 },
              { id: 'barbearias', label: 'Barbearias', icone: Store },
              { id: 'infraestrutura', label: 'Infraestrutura', icone: Database },
            ].map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  abaAtiva === aba.id
                    ? 'bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-t border-x border-zinc-200 dark:border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <aba.icone className="w-4 h-4" />
                {aba.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {carregando && !estatisticas ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* Aba: Visão Geral */}
            {abaAtiva === 'visao-geral' && (
              <motion.div
                key="visao-geral"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Cards de Estatísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CardEstatistica
                    titulo="Total Barbearias"
                    valor={estatisticas?.totalTenants || 0}
                    icone={Store}
                    cor="bg-zinc-900 dark:bg-white"
                    corIcone="text-white dark:text-black"
                  />
                  <CardEstatistica
                    titulo="Em Trial"
                    valor={estatisticas?.emTrial || 0}
                    icone={Clock}
                    cor="bg-blue-500"
                    corIcone="text-white"
                  />
                  <CardEstatistica
                    titulo="Trial Expirado"
                    valor={estatisticas?.trialExpirado || 0}
                    icone={AlertCircle}
                    cor="bg-red-500"
                    corIcone="text-white"
                  />
                  <CardEstatistica
                    titulo="Ativos"
                    valor={estatisticas?.tenantsAtivos || 0}
                    icone={CheckCircle}
                    cor="bg-green-500"
                    corIcone="text-white"
                  />
                </div>

                {/* Métricas de Uso */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CardMetricaSecundaria
                    titulo="Agendamentos"
                    valor={estatisticas?.totalAgendamentos || 0}
                    icone={Calendar}
                  />
                  <CardMetricaSecundaria
                    titulo="Clientes"
                    valor={estatisticas?.totalClientes || 0}
                    icone={Users}
                  />
                  <CardMetricaSecundaria
                    titulo="Barbeiros"
                    valor={estatisticas?.totalBarbeiros || 0}
                    icone={Scissors}
                  />
                  <CardMetricaSecundaria
                    titulo="Serviços"
                    valor={estatisticas?.totalServicos || 0}
                    icone={UserCheck}
                  />
                </div>

                {/* Últimas Barbearias Cadastradas */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    Últimas Barbearias Cadastradas
                  </h3>
                  <div className="space-y-3">
                    {tenants.slice(0, 5).map((tenant) => {
                      const status = getStatusTrial(tenant)
                      return (
                        <div
                          key={tenant.id}
                          className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg flex items-center justify-center">
                              <Store className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-white">{tenant.nome}</p>
                              <p className="text-xs text-zinc-500">
                                Cadastrado {formatDistanceToNow(parseISO(tenant.criado_em), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.cor}`}>
                            {status.texto}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Aba: Barbearias */}
            {abaAtiva === 'barbearias' && (
              <motion.div
                key="barbearias"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar por nome, email ou slug..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    {(['todos', 'ativos', 'trial', 'expirados'] as const).map((filtro) => (
                      <button
                        key={filtro}
                        onClick={() => setFiltroStatus(filtro)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          filtroStatus === filtro
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {filtro.charAt(0).toUpperCase() + filtro.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de Barbearias */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Barbearia</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Contato</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Dados</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Trial</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Cadastro</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {tenantsFiltrados.map((tenant) => {
                          const status = getStatusTrial(tenant)
                          return (
                            <tr key={tenant.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Store className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-zinc-900 dark:text-white">{tenant.nome}</p>
                                    <p className="text-xs text-zinc-500">/{tenant.slug}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <p className="text-sm text-zinc-900 dark:text-white">{tenant.email}</p>
                                <p className="text-xs text-zinc-500">{tenant.whatsapp || tenant.telefone || '-'}</p>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                                  <span title="Barbeiros">{tenant.total_barbeiros} 👤</span>
                                  <span title="Serviços">{tenant.total_servicos} ✂️</span>
                                  <span title="Agendamentos">{tenant.total_agendamentos} 📅</span>
                                  <span title="Clientes">{tenant.total_clientes} 👥</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.cor}`}>
                                  {status.texto}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {format(parseISO(tenant.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                                <p className="text-xs text-zinc-500">
                                  {formatDistanceToNow(parseISO(tenant.criado_em), { addSuffix: true, locale: ptBR })}
                                </p>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <a
                                    href={`/${tenant.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                    title="Ver site"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                  <button
                                    onClick={() => setModalConfirmacao({ aberto: true, tenant })}
                                    className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Excluir barbearia"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {tenantsFiltrados.length === 0 && (
                    <div className="text-center py-12">
                      <Store className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                      <p className="text-zinc-500">Nenhuma barbearia encontrada</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Aba: Infraestrutura */}
            {abaAtiva === 'infraestrutura' && (
              <motion.div
                key="infraestrutura"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Supabase */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Supabase</h3>
                        <p className="text-xs text-zinc-500">Banco de Dados</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Database</span>
                          <span className="text-zinc-900 dark:text-white font-medium">500 MB (Free)</span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '15%' }} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">~75 MB usado (estimativa)</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Auth Users</span>
                          <span className="text-zinc-900 dark:text-white font-medium">50.000 (Free)</span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '1%' }} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{estatisticas?.totalTenants || 0} usuários</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">API Requests</span>
                          <span className="text-zinc-900 dark:text-white font-medium">500K/mês</span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '5%' }} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Uso baixo</p>
                      </div>
                    </div>

                    <a
                      href="https://supabase.com/dashboard/project/euoexutuawrqxhlqtkud"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir Dashboard
                    </a>
                  </div>

                  {/* Cloudflare R2 */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Cloudflare R2</h3>
                        <p className="text-xs text-zinc-500">Armazenamento de Imagens</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Storage</span>
                          <span className="text-zinc-900 dark:text-white font-medium">10 GB (Free)</span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '5%' }} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">~500 MB usado (estimativa)</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Class A Ops</span>
                          <span className="text-zinc-900 dark:text-white font-medium">1M/mês</span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '2%' }} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Uploads/Deletes</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Class B Ops</span>
                          <span className="text-zinc-900 dark:text-white font-medium">10M/mês</span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: '1%' }} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Downloads/Reads</p>
                      </div>
                    </div>

                    <a
                      href="https://dash.cloudflare.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir Dashboard
                    </a>
                  </div>

                  {/* Bot Fly.io */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 ${statusBot.online ? 'bg-purple-500' : 'bg-zinc-500'} rounded-lg flex items-center justify-center`}>
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">Bot WhatsApp</h3>
                        <p className="text-xs text-zinc-500">Fly.io - bot-barberhub</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        statusBot.online 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                      }`}>
                        {statusBot.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {statusBot.online ? 'Online' : 'Offline'}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">VM</span>
                          <span className="text-zinc-900 dark:text-white font-medium">shared-cpu-1x</span>
                        </div>
                        <p className="text-xs text-zinc-500">256 MB RAM • Região: GRU (São Paulo)</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Volume</span>
                          <span className="text-zinc-900 dark:text-white font-medium">1 GB</span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: '10%' }} />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Credenciais WhatsApp</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-600 dark:text-zinc-400">Free Tier</span>
                          <span className="text-zinc-900 dark:text-white font-medium">$5/mês</span>
                        </div>
                        <p className="text-xs text-zinc-500">3 VMs grátis • 3GB storage</p>
                      </div>

                      {statusBot.ultimaVerificacao && (
                        <p className="text-xs text-zinc-500">
                          Última verificação: {format(statusBot.ultimaVerificacao, 'HH:mm:ss', { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={verificarStatusBot}
                        disabled={verificandoBot}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${verificandoBot ? 'animate-spin' : ''}`} />
                        Verificar
                      </button>
                      <a
                        href="https://fly.io/apps/bot-barberhub"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Dashboard
                      </a>
                    </div>
                  </div>
                </div>

                {/* Limites do Free Tier */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    Resumo dos Limites Free Tier
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500" />
                        Supabase
                      </h4>
                      <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                        <li>• 500 MB de banco de dados</li>
                        <li>• 1 GB de storage</li>
                        <li>• 50.000 usuários auth</li>
                        <li>• 500K requisições API/mês</li>
                        <li>• 2 projetos grátis</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-orange-500" />
                        Cloudflare R2
                      </h4>
                      <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                        <li>• 10 GB de storage</li>
                        <li>• 1M Class A ops/mês</li>
                        <li>• 10M Class B ops/mês</li>
                        <li>• Egress grátis</li>
                        <li>• Sem limite de buckets</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-500" />
                        Fly.io
                      </h4>
                      <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                        <li>• 3 VMs shared-cpu-1x</li>
                        <li>• 256 MB RAM cada</li>
                        <li>• 3 GB de volume total</li>
                        <li>• 160 GB egress/mês</li>
                        <li>• $5 crédito mensal</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {modalConfirmacao.aberto && modalConfirmacao.tenant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setModalConfirmacao({ aberto: false, tenant: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Excluir Barbearia</h3>
                  <p className="text-sm text-zinc-500">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Você está prestes a excluir <strong>{modalConfirmacao.tenant.nome}</strong> e todos os seus dados:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                  <li>• {modalConfirmacao.tenant.total_barbeiros} barbeiros</li>
                  <li>• {modalConfirmacao.tenant.total_servicos} serviços</li>
                  <li>• {modalConfirmacao.tenant.total_agendamentos} agendamentos</li>
                  <li>• {modalConfirmacao.tenant.total_clientes} clientes</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalConfirmacao({ aberto: false, tenant: null })}
                  className="flex-1 px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => excluirTenant(modalConfirmacao.tenant!)}
                  disabled={excluindo === modalConfirmacao.tenant.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {excluindo === modalConfirmacao.tenant.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Componentes auxiliares
function CardEstatistica({ titulo, valor, icone: Icone, cor, corIcone }: {
  titulo: string
  valor: number
  icone: any
  cor: string
  corIcone: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${cor} rounded-lg flex items-center justify-center`}>
          <Icone className={`w-5 h-5 ${corIcone}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{valor}</p>
          <p className="text-xs text-zinc-500">{titulo}</p>
        </div>
      </div>
    </motion.div>
  )
}

function CardMetricaSecundaria({ titulo, valor, icone: Icone }: {
  titulo: string
  valor: number
  icone: any
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-zinc-900 dark:text-white">{valor}</p>
          <p className="text-xs text-zinc-500">{titulo}</p>
        </div>
        <Icone className="w-5 h-5 text-zinc-400" />
      </div>
    </div>
  )
}
