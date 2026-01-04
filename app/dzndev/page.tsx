'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import {
  Shield, Lock, Eye, EyeOff, Loader2, Users, Store, Calendar,
  Database, Cloud, Trash2, ExternalLink, RefreshCw, AlertTriangle,
  CheckCircle, Clock, Wifi, WifiOff, Search, LogOut, BarChart3,
  Scissors, Building2, FileText, Power, Download, UserCog, Bot,
  AlertCircle, Globe, ChevronDown
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ModalDetalhesTenant, GestaoUsuariosAuth, SistemaBackup, RelatoriosGlobais,
  PLANOS_CONFIG
} from '@/components/superadmin'

const ADMIN_USUARIO = 'dzndev'
const ADMIN_SENHA = '1503'

type AbaAtiva = 'visao-geral' | 'barbearias' | 'usuarios' | 'relatorios' | 'infraestrutura' | 'backup'

interface Tenant {
  id: string
  slug: string
  nome: string
  email: string
  telefone: string | null
  whatsapp: string | null
  logo_url: string | null
  plano: string
  ativo: boolean
  suspenso?: boolean
  trial_inicio: string | null
  trial_fim: string | null
  criado_em: string
  atualizado_em: string
  total_barbeiros: number
  total_servicos: number
  total_agendamentos: number
  total_clientes: number
}

interface Estatisticas {
  totalTenants: number
  tenantsAtivos: number
  emTrial: number
  trialExpirado: number
  planosPagos: number
  totalAgendamentos: number
  totalClientes: number
  totalBarbeiros: number
}

interface StatusBot {
  online: boolean
  ultimaVerificacao: Date | null
}

interface MetricasInfra {
  supabase?: {
    database: { usado_mb: number; percentual: number }
    auth: { usuarios: number; percentual: number }
    tabelas: { total_registros: number }
  }
  r2?: { tamanho_total_mb: number; total_objetos: number; percentual: number }
  fly?: { online: boolean; status: string; region: string }
}

/**
 * Painel Super Admin BarberHub
 * Gestão completa do SaaS
 */
export default function PainelSuperAdmin() {
  // Auth
  const [autenticado, setAutenticado] = useState(false)
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erroLogin, setErroLogin] = useState('')
  const [tentandoLogin, setTentandoLogin] = useState(false)

  // Dados
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('visao-geral')

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroPlano, setFiltroPlano] = useState('todos')

  // Modais
  const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; tenant: Tenant | null }>({ aberto: false, tenant: null })
  const [modalDetalhes, setModalDetalhes] = useState<{ aberto: boolean; tenant: Tenant | null }>({ aberto: false, tenant: null })
  const [excluindo, setExcluindo] = useState(false)

  // Infra
  const [statusBot, setStatusBot] = useState<StatusBot>({ online: false, ultimaVerificacao: null })
  const [metricas, setMetricas] = useState<MetricasInfra>({})
  const [carregandoMetricas, setCarregandoMetricas] = useState(false)

  // Realtime
  const subscriptionRef = useRef<any>(null)

  // Verificar sessão
  useEffect(() => {
    if (sessionStorage.getItem('admin_saas_auth') === 'true') {
      setAutenticado(true)
    }
  }, [])

  // Carregar dados ao autenticar
  useEffect(() => {
    if (autenticado) {
      carregarDados()
      verificarBot()
      carregarMetricas()
      configurarRealtime()
    }
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [autenticado])

  const configurarRealtime = () => {
    const canal = supabase
      .channel('super-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => carregarDados())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, () => carregarDados())
      .subscribe()
    subscriptionRef.current = canal
  }

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('criado_em', { ascending: false })

      const tenantsComStats = await Promise.all(
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

      setTenants(tenantsComStats)

      const agora = new Date()
      setEstatisticas({
        totalTenants: tenantsComStats.length,
        tenantsAtivos: tenantsComStats.filter(t => t.ativo).length,
        emTrial: tenantsComStats.filter(t => t.plano === 'trial').length,
        trialExpirado: tenantsComStats.filter(t => t.trial_fim && new Date(t.trial_fim) < agora).length,
        planosPagos: tenantsComStats.filter(t => t.plano !== 'trial').length,
        totalAgendamentos: tenantsComStats.reduce((acc, t) => acc + t.total_agendamentos, 0),
        totalClientes: tenantsComStats.reduce((acc, t) => acc + t.total_clientes, 0),
        totalBarbeiros: tenantsComStats.reduce((acc, t) => acc + t.total_barbeiros, 0),
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }, [])

  const verificarBot = async () => {
    try {
      const res = await fetch('https://bot-barberhub.fly.dev/health', { mode: 'cors' })
      setStatusBot({ online: res.ok, ultimaVerificacao: new Date() })
    } catch {
      setStatusBot({ online: false, ultimaVerificacao: new Date() })
    }
  }

  const carregarMetricas = async () => {
    setCarregandoMetricas(true)
    try {
      const res = await fetch('/api/admin/metricas', { headers: { 'x-admin-auth': 'dzndev-1503' } })
      if (res.ok) {
        const dados = await res.json()
        setMetricas({ supabase: dados.supabase, r2: dados.cloudflare_r2, fly: dados.fly_io })
      }
    } catch (error) {
      console.error('Erro métricas:', error)
    } finally {
      setCarregandoMetricas(false)
    }
  }

  const fazerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setTentandoLogin(true)
    setErroLogin('')
    await new Promise(r => setTimeout(r, 500))
    if (usuario === ADMIN_USUARIO && senha === ADMIN_SENHA) {
      sessionStorage.setItem('admin_saas_auth', 'true')
      setAutenticado(true)
    } else {
      setErroLogin('Credenciais inválidas')
    }
    setTentandoLogin(false)
  }

  const fazerLogout = () => {
    sessionStorage.removeItem('admin_saas_auth')
    setAutenticado(false)
    setUsuario('')
    setSenha('')
  }

  const alterarPlano = async (tenantId: string, novoPlano: string) => {
    try {
      const updateData: any = { plano: novoPlano }
      if (novoPlano !== 'trial') {
        updateData.trial_fim = null
      }
      await supabase.from('tenants').update(updateData).eq('id', tenantId)
      carregarDados()
    } catch (error) {
      console.error('Erro ao alterar plano:', error)
    }
  }

  const toggleAtivo = async (tenant: Tenant) => {
    try {
      await supabase.from('tenants').update({ ativo: !tenant.ativo }).eq('id', tenant.id)
      carregarDados()
    } catch (error) {
      console.error('Erro ao toggle ativo:', error)
    }
  }

  const excluirTenant = async () => {
    if (!modalExcluir.tenant) return
    setExcluindo(true)
    const tenantId = modalExcluir.tenant.id
    try {
      // Ordem correta para foreign keys
      const tabelas = [
        'notificacoes_enviadas', 'historico_agendamentos', 'agendamentos',
        'horarios_bloqueados', 'horarios_disponiveis', 'transacoes', 'comissoes',
        'curtidas_trabalhos', 'comentarios_trabalhos', 'trabalhos', 'categorias_trabalhos',
        'avaliacoes_publicas', 'produtos_estoque', 'clientes', 'servicos', 'barbeiros',
        'configuracoes_barbearia', 'configuracoes', 'historico_configuracoes',
        'assinaturas', 'whatsapp_auth', 'proprietarios'
      ]
      for (const tabela of tabelas) {
        await supabase.from(tabela).delete().eq('tenant_id', tenantId)
      }
      await supabase.from('tenants').delete().eq('id', tenantId)
      setModalExcluir({ aberto: false, tenant: null })
      carregarDados()
    } catch (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir barbearia')
    } finally {
      setExcluindo(false)
    }
  }

  const getStatusTrial = (tenant: Tenant) => {
    if (!tenant.trial_fim) return { texto: 'Sem prazo', cor: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800' }
    const dias = differenceInDays(new Date(tenant.trial_fim), new Date())
    if (dias < 0) return { texto: 'Expirado', cor: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' }
    if (dias <= 3) return { texto: `${dias}d`, cor: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' }
    return { texto: `${dias}d`, cor: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' }
  }

  const tenantsFiltrados = tenants.filter(t => {
    const matchBusca = t.nome.toLowerCase().includes(busca.toLowerCase()) ||
      t.email.toLowerCase().includes(busca.toLowerCase()) ||
      t.slug.toLowerCase().includes(busca.toLowerCase())
    if (filtroPlano === 'todos') return matchBusca
    if (filtroPlano === 'expirados') return matchBusca && t.trial_fim && new Date(t.trial_fim) < new Date()
    return matchBusca && t.plano === filtroPlano
  })

  // Tela de Login
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-zinc-900" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Super Admin</h1>
            <p className="text-zinc-500">BarberHub SaaS</p>
          </div>

          <form onSubmit={fazerLogin} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Usuário"
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {erroLogin && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {erroLogin}
              </div>
            )}
            <button
              type="submit"
              disabled={tentandoLogin || !usuario || !senha}
              className="w-full py-3 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {tentandoLogin ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : <><Shield className="w-4 h-4" /> Entrar</>}
            </button>
          </form>
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
              <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white dark:text-zinc-900" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white">BarberHub</h1>
                <p className="text-xs text-zinc-500">Super Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusBot.online ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                {statusBot.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                Bot {statusBot.online ? 'Online' : 'Offline'}
              </div>
              <button onClick={() => { carregarDados(); carregarMetricas(); verificarBot() }} disabled={carregando} className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={fazerLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-1 mt-4 -mb-px overflow-x-auto">
            {[
              { id: 'visao-geral', label: 'Visão Geral', icone: BarChart3 },
              { id: 'barbearias', label: 'Barbearias', icone: Store },
              { id: 'usuarios', label: 'Usuários Auth', icone: UserCog },
              { id: 'relatorios', label: 'Relatórios', icone: FileText },
              { id: 'infraestrutura', label: 'Infraestrutura', icone: Database },
              { id: 'backup', label: 'Backup', icone: Download },
            ].map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id as AbaAtiva)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  abaAtiva === aba.id
                    ? 'bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-t border-x border-zinc-200 dark:border-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <aba.icone className="w-4 h-4" />
                <span className="hidden sm:inline">{aba.label}</span>
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
            {/* Visão Geral */}
            {abaAtiva === 'visao-geral' && (
              <motion.div key="visao-geral" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CardStat titulo="Total Barbearias" valor={estatisticas?.totalTenants || 0} icone={Store} cor="bg-zinc-900 dark:bg-white" corIcone="text-white dark:text-zinc-900" />
                  <CardStat titulo="Em Trial" valor={estatisticas?.emTrial || 0} icone={Clock} cor="bg-amber-500" />
                  <CardStat titulo="Trial Expirado" valor={estatisticas?.trialExpirado || 0} icone={AlertCircle} cor="bg-red-500" />
                  <CardStat titulo="Planos Pagos" valor={estatisticas?.planosPagos || 0} icone={CheckCircle} cor="bg-emerald-500" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CardStatSecundario titulo="Agendamentos" valor={estatisticas?.totalAgendamentos || 0} icone={Calendar} />
                  <CardStatSecundario titulo="Clientes" valor={estatisticas?.totalClientes || 0} icone={Users} />
                  <CardStatSecundario titulo="Barbeiros" valor={estatisticas?.totalBarbeiros || 0} icone={Scissors} />
                  <CardStatSecundario titulo="Ativos" valor={estatisticas?.tenantsAtivos || 0} icone={CheckCircle} />
                </div>

                {/* Últimas Barbearias */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Últimas Barbearias</h3>
                  <div className="space-y-3">
                    {tenants.slice(0, 5).map((tenant) => {
                      const status = getStatusTrial(tenant)
                      const plano = PLANOS_CONFIG[tenant.plano] || PLANOS_CONFIG.trial
                      return (
                        <div key={tenant.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg overflow-hidden flex items-center justify-center">
                              {tenant.logo_url ? (
                                <Image src={tenant.logo_url} alt={tenant.nome} width={40} height={40} className="object-cover" />
                              ) : (
                                <Building2 className="w-5 h-5 text-zinc-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-white">{tenant.nome}</p>
                              <p className="text-xs text-zinc-500">
                                {formatDistanceToNow(parseISO(tenant.criado_em), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plano.bg} ${plano.cor}`}>
                              {plano.nome}
                            </span>
                            {tenant.plano === 'trial' && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.cor}`}>
                                {status.texto}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Barbearias */}
            {abaAtiva === 'barbearias' && (
              <motion.div key="barbearias" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar por nome, email ou slug..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {['todos', 'trial', 'basico', 'profissional', 'expirados'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFiltroPlano(f)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          filtroPlano === f
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                            : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tenantsFiltrados.map((tenant) => (
                    <CardTenantItem
                      key={tenant.id}
                      tenant={tenant}
                      onExcluir={() => setModalExcluir({ aberto: true, tenant })}
                      onAlterarPlano={(plano) => alterarPlano(tenant.id, plano)}
                      onToggleAtivo={() => toggleAtivo(tenant)}
                      onVerDetalhes={() => setModalDetalhes({ aberto: true, tenant })}
                    />
                  ))}
                </div>

                {tenantsFiltrados.length === 0 && (
                  <div className="text-center py-12">
                    <Store className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">Nenhuma barbearia encontrada</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Usuários Auth */}
            {abaAtiva === 'usuarios' && (
              <motion.div key="usuarios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <GestaoUsuariosAuth onAtualizacao={carregarDados} />
              </motion.div>
            )}

            {/* Relatórios */}
            {abaAtiva === 'relatorios' && (
              <motion.div key="relatorios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <RelatoriosGlobais />
              </motion.div>
            )}

            {/* Infraestrutura */}
            {abaAtiva === 'infraestrutura' && (
              <motion.div key="infraestrutura" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Supabase */}
                  <CardInfra
                    titulo="Supabase"
                    subtitulo="Banco de Dados"
                    cor="bg-emerald-500"
                    icone={Database}
                    link="https://supabase.com/dashboard/project/euoexutuawrqxhlqtkud"
                  >
                    <div className="space-y-3">
                      <BarraUso label="Database" valor={metricas.supabase?.database.usado_mb || 0} unidade="MB" limite={500} percentual={metricas.supabase?.database.percentual || 0} />
                      <BarraUso label="Auth Users" valor={metricas.supabase?.auth.usuarios || 0} limite={50000} percentual={metricas.supabase?.auth.percentual || 0} />
                      <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        Total: {(metricas.supabase?.tabelas.total_registros || 0).toLocaleString('pt-BR')} registros
                      </p>
                    </div>
                  </CardInfra>

                  {/* R2 */}
                  <CardInfra
                    titulo="Cloudflare R2"
                    subtitulo="Armazenamento"
                    cor="bg-orange-500"
                    icone={Cloud}
                    link="https://dash.cloudflare.com"
                  >
                    <div className="space-y-3">
                      <BarraUso label="Storage" valor={metricas.r2?.tamanho_total_mb || 0} unidade="MB" limite={10240} percentual={metricas.r2?.percentual || 0} />
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {(metricas.r2?.total_objetos || 0).toLocaleString('pt-BR')} arquivos
                      </p>
                    </div>
                  </CardInfra>

                  {/* Fly.io */}
                  <CardInfra
                    titulo="Bot WhatsApp"
                    subtitulo="Fly.io"
                    cor={statusBot.online ? 'bg-purple-500' : 'bg-zinc-500'}
                    icone={Bot}
                    link="https://fly.io/apps/bot-barberhub"
                    status={statusBot.online ? 'Online' : 'Offline'}
                    statusCor={statusBot.online ? 'text-emerald-500' : 'text-red-500'}
                  >
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Região</span>
                        <span className="text-zinc-900 dark:text-white">{metricas.fly?.region?.toUpperCase() || 'GRU'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Status</span>
                        <span className={statusBot.online ? 'text-emerald-500' : 'text-red-500'}>{metricas.fly?.status || 'Desconhecido'}</span>
                      </div>
                    </div>
                  </CardInfra>
                </div>
              </motion.div>
            )}

            {/* Backup */}
            {abaAtiva === 'backup' && (
              <motion.div key="backup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <SistemaBackup />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Modal de Exclusão */}
      <AnimatePresence>
        {modalExcluir.aberto && modalExcluir.tenant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !excluindo && setModalExcluir({ aberto: false, tenant: null })}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Excluir Barbearia</h3>
                  <p className="text-sm text-zinc-500">Esta ação é irreversível</p>
                </div>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>{modalExcluir.tenant.nome}</strong> e todos os dados serão excluídos:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
                  <li>• {modalExcluir.tenant.total_barbeiros} barbeiros</li>
                  <li>• {modalExcluir.tenant.total_servicos} serviços</li>
                  <li>• {modalExcluir.tenant.total_agendamentos} agendamentos</li>
                  <li>• {modalExcluir.tenant.total_clientes} clientes</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalExcluir({ aberto: false, tenant: null })}
                  disabled={excluindo}
                  className="flex-1 px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluirTenant}
                  disabled={excluindo}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                >
                  {excluindo ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : <><Trash2 className="w-4 h-4" /> Excluir</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes */}
      <ModalDetalhesTenant
        tenant={modalDetalhes.tenant as any}
        aberto={modalDetalhes.aberto}
        onFechar={() => setModalDetalhes({ aberto: false, tenant: null })}
      />
    </div>
  )
}

// Componentes Auxiliares
function CardStat({ titulo, valor, icone: Icone, cor, corIcone = 'text-white' }: {
  titulo: string; valor: number; icone: any; cor: string; corIcone?: string
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${cor} rounded-lg flex items-center justify-center`}>
          <Icone className={`w-5 h-5 ${corIcone}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{valor}</p>
          <p className="text-xs text-zinc-500">{titulo}</p>
        </div>
      </div>
    </div>
  )
}

function CardStatSecundario({ titulo, valor, icone: Icone }: { titulo: string; valor: number; icone: any }) {
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

function CardTenantItem({ tenant, onExcluir, onAlterarPlano, onToggleAtivo, onVerDetalhes }: {
  tenant: Tenant
  onExcluir: () => void
  onAlterarPlano: (plano: string) => void
  onToggleAtivo: () => void
  onVerDetalhes: () => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const plano = PLANOS_CONFIG[tenant.plano] || PLANOS_CONFIG.trial
  const diasTrial = tenant.trial_fim ? differenceInDays(new Date(tenant.trial_fim), new Date()) : null

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden ${!tenant.ativo ? 'opacity-60' : ''} border-zinc-200 dark:border-zinc-800`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
            {tenant.logo_url ? (
              <Image src={tenant.logo_url} alt={tenant.nome} width={48} height={48} className="object-cover" />
            ) : (
              <Building2 className="w-6 h-6 text-zinc-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{tenant.nome}</h3>
            <p className="text-xs text-zinc-500">/{tenant.slug}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plano.bg} ${plano.cor}`}>{plano.nome}</span>
              {diasTrial !== null && tenant.plano === 'trial' && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${diasTrial < 0 ? 'bg-red-100 text-red-600' : diasTrial <= 3 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {diasTrial < 0 ? 'Expirado' : `${diasTrial}d`}
                </span>
              )}
              {!tenant.ativo && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-200 text-zinc-600">Inativo</span>}
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuAberto(!menuAberto)} className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
              <ChevronDown className="w-4 h-4" />
            </button>
            {menuAberto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                  <a href={`/${tenant.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700">
                    <Globe className="w-4 h-4" /> Ver Site
                  </a>
                  <button onClick={() => { onVerDetalhes(); setMenuAberto(false) }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left">
                    <FileText className="w-4 h-4" /> Detalhes
                  </button>
                  <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
                  <div className="px-3 py-1.5 text-xs text-zinc-500">Alterar Plano</div>
                  {Object.entries(PLANOS_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => { onAlterarPlano(key); setMenuAberto(false) }} className={`flex items-center justify-between px-3 py-1.5 text-sm w-full ${tenant.plano === key ? 'bg-zinc-100 dark:bg-zinc-700' : 'hover:bg-zinc-50 dark:hover:bg-zinc-700/50'}`}>
                      <span className={cfg.cor}>{cfg.nome}</span>
                    </button>
                  ))}
                  <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
                  <button onClick={() => { onToggleAtivo(); setMenuAberto(false) }} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left">
                    <Power className="w-4 h-4" /> {tenant.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => { onExcluir(); setMenuAberto(false) }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left">
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
        <MiniStat valor={tenant.total_barbeiros} label="Barb." />
        <MiniStat valor={tenant.total_servicos} label="Serv." />
        <MiniStat valor={tenant.total_agendamentos} label="Agend." />
        <MiniStat valor={tenant.total_clientes} label="Client." />
      </div>
    </div>
  )
}

function MiniStat({ valor, label }: { valor: number; label: string }) {
  return (
    <div className="py-2 text-center">
      <p className="text-sm font-bold text-zinc-900 dark:text-white">{valor}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  )
}

function CardInfra({ titulo, subtitulo, cor, icone: Icone, link, status, statusCor, children }: {
  titulo: string; subtitulo: string; cor: string; icone: any; link: string; status?: string; statusCor?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 ${cor} rounded-lg flex items-center justify-center`}>
          <Icone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-white">{titulo}</h3>
          <p className="text-xs text-zinc-500">{subtitulo}</p>
        </div>
        {status && <span className={`text-xs font-medium ${statusCor}`}>{status}</span>}
      </div>
      {children}
      <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700">
        <ExternalLink className="w-4 h-4" /> Dashboard
      </a>
    </div>
  )
}

function BarraUso({ label, valor, unidade, limite, percentual }: {
  label: string; valor: number; unidade?: string; limite: number; percentual: number
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className="text-zinc-900 dark:text-white font-medium">
          {valor.toLocaleString('pt-BR')}{unidade ? ` ${unidade}` : ''} / {limite.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(percentual, 100)}%` }} />
      </div>
    </div>
  )
}
