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
  AlertCircle, Globe, ChevronDown, MoreVertical, Copy, Mail,
  MessageSquare, CreditCard, Settings, Activity, TrendingUp,
  Pause, Play, RotateCcw, Link2, QrCode, Bell, X, Plus, Minus,
  Receipt, Key, Send, CalendarPlus, CalendarMinus, Banknote
} from 'lucide-react'
import { LogoMarca } from '@/components/ui/logo-marca'
import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ModalDetalhesTenant, GestaoUsuariosAuth, SistemaBackup, RelatoriosGlobais,
  PainelBotFly, PLANOS_CONFIG
} from '@/components/superadmin'
import { ModalPagamentoPix } from '@/components/pagamentos'
import { Hand } from 'lucide-react'

const ADMIN_USUARIO = 'dzndev'
const ADMIN_SENHA = '1503'

type AbaAtiva = 'visao-geral' | 'negocios' | 'cobrancas' | 'usuarios' | 'relatorios' | 'bot' | 'infraestrutura' | 'backup'
type FiltroTipoNegocio = 'todos' | 'barbearia' | 'nail_designer'

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
  tipo_negocio: 'barbearia' | 'nail_designer'
  total_barbeiros: number
  total_servicos: number
  total_agendamentos: number
  total_clientes: number
  // Campos de cobrança
  dia_cobranca: number | null
  data_ultimo_pagamento: string | null
  data_proximo_pagamento: string | null
  pagamento_pendente: boolean
  notificacao_enviada: boolean
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
  totalBarbearias: number
  totalNailDesigners: number
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
  const [filtroTipoNegocio, setFiltroTipoNegocio] = useState<FiltroTipoNegocio>('todos')

  // Modais
  const [modalExcluir, setModalExcluir] = useState<{ aberto: boolean; tenant: Tenant | null }>({ aberto: false, tenant: null })
  const [modalDetalhes, setModalDetalhes] = useState<{ aberto: boolean; tenant: Tenant | null }>({ aberto: false, tenant: null })
  const [modalPagamento, setModalPagamento] = useState<{ aberto: boolean; tenant: Tenant | null }>({ aberto: false, tenant: null })
  const [excluindo, setExcluindo] = useState(false)

  // Infra
  const [statusBot, setStatusBot] = useState<StatusBot>({ online: false, ultimaVerificacao: null })
  const [metricas, setMetricas] = useState<MetricasInfra>({})
  const [carregandoMetricas, setCarregandoMetricas] = useState(false)
  const [verificandoBot, setVerificandoBot] = useState(false)

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
        totalBarbearias: tenantsComStats.filter(t => t.tipo_negocio === 'barbearia' || !t.tipo_negocio).length,
        totalNailDesigners: tenantsComStats.filter(t => t.tipo_negocio === 'nail_designer').length,
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }, [])

  const verificarBot = async () => {
    setVerificandoBot(true)
    try {
      // Primeiro tenta a API de métricas que usa o Fly.io GraphQL API
      const resMetricas = await fetch('/api/admin/metricas', { 
        headers: { 'x-admin-auth': 'dzndev-1503' } 
      })
      
      if (resMetricas.ok) {
        const dados = await resMetricas.json()
        const flyOnline = dados.fly_io?.online || dados.fly_io?.status === 'started'
        setStatusBot({ online: flyOnline, ultimaVerificacao: new Date() })
        return
      }
      
      // Fallback: tenta health check direto (pode falhar por CORS)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const res = await fetch('https://bot-barberhub.fly.dev/health', { 
        mode: 'cors',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      setStatusBot({ online: res.ok, ultimaVerificacao: new Date() })
    } catch {
      // Se falhar, assume online baseado nas métricas já carregadas
      const flyOnline = metricas.fly?.online || metricas.fly?.status === 'started'
      setStatusBot({ online: flyOnline, ultimaVerificacao: new Date() })
    } finally {
      setVerificandoBot(false)
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

  const alterarTrial = async (tenantId: string, dias: number) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId)
      if (!tenant) return
      
      const dataBase = tenant.trial_fim ? new Date(tenant.trial_fim) : new Date()
      const novaData = new Date(dataBase)
      novaData.setDate(novaData.getDate() + dias)
      
      await supabase.from('tenants').update({ 
        trial_fim: novaData.toISOString(),
        plano: 'trial'
      }).eq('id', tenantId)
      carregarDados()
    } catch (error) {
      console.error('Erro ao alterar trial:', error)
    }
  }

  const removerTrial = async (tenantId: string) => {
    try {
      await supabase.from('tenants').update({ 
        trial_fim: null,
        plano: 'trial'
      }).eq('id', tenantId)
      carregarDados()
    } catch (error) {
      console.error('Erro ao remover trial:', error)
    }
  }

  const solicitarCobranca = (tenant: Tenant) => {
    const mensagem = encodeURIComponent(
      `Olá ${tenant.nome}! 👋\n\n` +
      `Seu período de teste no BarberHub está chegando ao fim.\n\n` +
      `Para continuar usando todas as funcionalidades e não perder seus dados, ` +
      `ative sua assinatura:\n\n` +
      `💳 *Assinatura Mensal* - R$ 39,90/mês\n\n` +
      `Responda essa mensagem para receber o PIX de pagamento!`
    )
    const numero = tenant.whatsapp?.replace(/\D/g, '') || tenant.telefone?.replace(/\D/g, '')
    if (numero) {
      window.open(`https://wa.me/55${numero}?text=${mensagem}`, '_blank')
    } else {
      alert('Tenant não possui WhatsApp cadastrado')
    }
  }

  const gerarPixPagamento = (tenant: Tenant) => {
    setModalPagamento({ aberto: true, tenant })
  }

  // Terminar trial imediatamente (força expiração)
  const terminarTrialAgora = async (tenantId: string) => {
    try {
      const ontem = new Date()
      ontem.setDate(ontem.getDate() - 1)
      
      const { error } = await supabase
        .from('tenants')
        .update({ 
          trial_fim: ontem.toISOString(),
          pagamento_pendente: true,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', tenantId)
      
      if (error) throw error
      carregarDados()
    } catch (error) {
      console.error('Erro ao terminar trial:', error)
    }
  }

  // Cobrar agora - termina trial e abre modal de pagamento
  const cobrarAgora = async (tenant: Tenant) => {
    try {
      const ontem = new Date()
      ontem.setDate(ontem.getDate() - 1)
      
      await supabase
        .from('tenants')
        .update({ 
          trial_fim: ontem.toISOString(),
          pagamento_pendente: true,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', tenant.id)
      
      // Abre modal de pagamento PIX
      setModalPagamento({ aberto: true, tenant })
      carregarDados()
    } catch (error) {
      console.error('Erro ao cobrar agora:', error)
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
    
    // Filtro por tipo de negócio
    const matchTipoNegocio = filtroTipoNegocio === 'todos' || 
      (filtroTipoNegocio === 'barbearia' && (t.tipo_negocio === 'barbearia' || !t.tipo_negocio)) ||
      (filtroTipoNegocio === 'nail_designer' && t.tipo_negocio === 'nail_designer')
    
    if (!matchTipoNegocio) return false
    if (filtroPlano === 'todos') return matchBusca
    if (filtroPlano === 'expirados') return matchBusca && t.trial_fim && new Date(t.trial_fim) < new Date()
    return matchBusca && t.plano === filtroPlano
  })

  // Tela de Login
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-white/10">
              <Shield className="w-8 h-8 text-zinc-900" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Super Admin</h1>
            <p className="text-zinc-500">BarberHub SaaS</p>
          </div>

          <form onSubmit={fazerLogin} className="space-y-4" aria-label="Formulário de login">
            <div className="space-y-1">
              <label htmlFor="usuario" className="sr-only">Usuário</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
                <input
                  id="usuario"
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Usuário"
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-colors"
                  aria-required="true"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label htmlFor="senha" className="sr-only">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Senha"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-700 transition-colors"
                  aria-required="true"
                />
                <button 
                  type="button" 
                  onClick={() => setMostrarSenha(!mostrarSenha)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {erroLogin && (
              <div 
                className="p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm flex items-center gap-2"
                role="alert"
                aria-live="polite"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> 
                <span>{erroLogin}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={tentandoLogin || !usuario || !senha}
              className="w-full py-3 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-white/10"
            >
              {tentandoLogin ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> 
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" aria-hidden="true" /> 
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>
          
          <p className="text-center text-xs text-zinc-600 mt-6">
            Acesso restrito a administradores
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
              <LogoMarca className="h-8" />
              <div className="hidden sm:block">
                <p className="text-xs text-zinc-500 font-medium">Super Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  verificandoBot 
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' 
                    : statusBot.online 
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                }`}
                role="status"
                aria-label={`Status do bot: ${verificandoBot ? 'Verificando' : statusBot.online ? 'Online' : 'Verificando conexão'}`}
              >
                {verificandoBot ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : statusBot.online ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <Activity className="w-3 h-3" />
                )}
                Bot {verificandoBot ? 'Verificando...' : statusBot.online ? 'Online' : 'Conectando...'}
              </div>
              <button 
                onClick={() => { carregarDados(); carregarMetricas(); verificarBot() }} 
                disabled={carregando} 
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                aria-label="Atualizar dados"
                title="Atualizar dados"
              >
                <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
              <button 
                onClick={fazerLogout} 
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                aria-label="Sair do painel"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" /> 
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          {/* Abas */}
          <nav 
            className="flex gap-1 mt-4 -mb-px overflow-x-auto scrollbar-hide pb-px"
            role="tablist"
            aria-label="Navegação do painel"
          >
            {[
              { id: 'visao-geral', label: 'Visão Geral', labelCurto: 'Geral', icone: BarChart3 },
              { id: 'negocios', label: 'Negócios', labelCurto: 'Neg.', icone: Store },
              { id: 'cobrancas', label: 'Cobranças', labelCurto: 'Cobr.', icone: CreditCard },
              { id: 'usuarios', label: 'Usuários Auth', labelCurto: 'Users', icone: UserCog },
              { id: 'relatorios', label: 'Relatórios', labelCurto: 'Relat.', icone: FileText },
              { id: 'bot', label: 'Bot WhatsApp', labelCurto: 'Bot', icone: Bot },
              { id: 'infraestrutura', label: 'Infraestrutura', labelCurto: 'Infra', icone: Database },
              { id: 'backup', label: 'Backup', labelCurto: 'Backup', icone: Download },
            ].map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id as AbaAtiva)}
                role="tab"
                aria-selected={abaAtiva === aba.id}
                aria-controls={`painel-${aba.id}`}
                id={`aba-${aba.id}`}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg whitespace-nowrap transition-all ${
                  abaAtiva === aba.id
                    ? 'bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-t border-x border-zinc-200 dark:border-zinc-800 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <aba.icone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                <span className="hidden md:inline">{aba.label}</span>
                <span className="md:hidden">{aba.labelCurto}</span>
              </button>
            ))}
          </nav>
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
                {/* Cards por Tipo de Negócio */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CardStat titulo="Total Negócios" valor={estatisticas?.totalTenants || 0} icone={Store} cor="bg-zinc-900 dark:bg-white" corIcone="text-white dark:text-zinc-900" />
                  <CardStat titulo="Barbearias" valor={estatisticas?.totalBarbearias || 0} icone={Scissors} cor="bg-blue-500" />
                  <CardStat titulo="Nail Designers" valor={estatisticas?.totalNailDesigners || 0} icone={Hand} cor="bg-pink-500" />
                  <CardStat titulo="Planos Pagos" valor={estatisticas?.planosPagos || 0} icone={CheckCircle} cor="bg-emerald-500" />
                </div>

                {/* Cards de Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CardStatSecundario titulo="Em Trial" valor={estatisticas?.emTrial || 0} icone={Clock} />
                  <CardStatSecundario titulo="Trial Expirado" valor={estatisticas?.trialExpirado || 0} icone={AlertCircle} />
                  <CardStatSecundario titulo="Ativos" valor={estatisticas?.tenantsAtivos || 0} icone={CheckCircle} />
                  <CardStatSecundario titulo="Profissionais" valor={estatisticas?.totalBarbeiros || 0} icone={Users} />
                </div>

                {/* Métricas Gerais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CardStatSecundario titulo="Agendamentos" valor={estatisticas?.totalAgendamentos || 0} icone={Calendar} />
                  <CardStatSecundario titulo="Clientes" valor={estatisticas?.totalClientes || 0} icone={Users} />
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Status do Bot</p>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${statusBot.online ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                          <span className={`text-sm font-medium ${statusBot.online ? 'text-emerald-600' : 'text-zinc-500'}`}>
                            {verificandoBot ? 'Verificando...' : statusBot.online ? 'Online' : 'Verificando...'}
                          </span>
                        </div>
                      </div>
                      <Bot className={`w-6 h-6 ${statusBot.online ? 'text-emerald-500' : 'text-zinc-400'}`} />
                    </div>
                  </div>
                </div>

                {/* Últimos Negócios */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Últimos Negócios Cadastrados</h3>
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

            {/* Negócios (Barbearias e Nail Designers) */}
            {abaAtiva === 'negocios' && (
              <motion.div key="negocios" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Filtros por Tipo de Negócio - Responsivo */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Segmented Control para Tipo */}
                  <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-x-auto">
                    <button
                      onClick={() => setFiltroTipoNegocio('todos')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                        filtroTipoNegocio === 'todos'
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                      <span className="hidden sm:inline">Todos</span>
                      <span className="text-xs opacity-60">({estatisticas?.totalTenants || 0})</span>
                    </button>
                    <button
                      onClick={() => setFiltroTipoNegocio('barbearia')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                        filtroTipoNegocio === 'barbearia'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <Scissors className="w-4 h-4" />
                      <span className="hidden sm:inline">Barbearias</span>
                      <span className="sm:hidden">Barber</span>
                      <span className="text-xs opacity-60">({estatisticas?.totalBarbearias || 0})</span>
                    </button>
                    <button
                      onClick={() => setFiltroTipoNegocio('nail_designer')}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                        filtroTipoNegocio === 'nail_designer'
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-pink-50 dark:hover:bg-pink-900/20'
                      }`}
                    >
                      <Hand className="w-4 h-4" />
                      <span className="hidden sm:inline">Nail Designers</span>
                      <span className="sm:hidden">Nail</span>
                      <span className="text-xs opacity-60">({estatisticas?.totalNailDesigners || 0})</span>
                    </button>
                  </div>
                </div>

                {/* Filtros de Busca e Plano */}
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
                      onAlterarTrial={(dias) => alterarTrial(tenant.id, dias)}
                      onRemoverTrial={() => removerTrial(tenant.id)}
                      onSolicitarCobranca={() => solicitarCobranca(tenant)}
                      onGerarPix={() => gerarPixPagamento(tenant)}
                      onTerminarTrial={() => terminarTrialAgora(tenant.id)}
                      onCobrarAgora={() => cobrarAgora(tenant)}
                    />
                  ))}
                </div>

                {tenantsFiltrados.length === 0 && (
                  <div className="text-center py-12">
                    <Store className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">Nenhum negócio encontrado</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Cobranças */}
            {abaAtiva === 'cobrancas' && (
              <motion.div key="cobrancas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Resumo de Cobranças */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {tenants.filter(t => {
                            const dataProximo = t.data_proximo_pagamento ? new Date(t.data_proximo_pagamento) : null
                            return dataProximo && dataProximo <= new Date()
                          }).length}
                        </p>
                        <p className="text-xs text-zinc-500">Pagamentos Vencidos</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {tenants.filter(t => {
                            const dataProximo = t.data_proximo_pagamento ? new Date(t.data_proximo_pagamento) : null
                            const hoje = new Date()
                            const em7Dias = new Date()
                            em7Dias.setDate(hoje.getDate() + 7)
                            return dataProximo && dataProximo > hoje && dataProximo <= em7Dias
                          }).length}
                        </p>
                        <p className="text-xs text-zinc-500">Vencem em 7 dias</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {tenants.filter(t => t.data_ultimo_pagamento).length}
                        </p>
                        <p className="text-xs text-zinc-500">Já Pagaram</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-lg flex items-center justify-center">
                        <Banknote className="w-5 h-5 text-white dark:text-zinc-900" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                          R$ {(tenants.filter(t => t.data_ultimo_pagamento).length * 39.90).toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-xs text-zinc-500">Receita Mensal</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Cobranças Pendentes */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">Cobranças Pendentes</h3>
                      <p className="text-xs text-zinc-500">Tenants com pagamento vencido ou próximo do vencimento</p>
                    </div>
                    <button
                      onClick={() => {
                        const pendentes = tenants.filter(t => {
                          const dataProximo = t.data_proximo_pagamento ? new Date(t.data_proximo_pagamento) : null
                          return dataProximo && dataProximo <= new Date() && t.whatsapp
                        })
                        pendentes.forEach(t => solicitarCobranca(t))
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <Bell className="w-4 h-4" />
                      Lembrar Todos
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[500px] overflow-y-auto">
                    {tenants
                      .filter(t => {
                        const dataProximo = t.data_proximo_pagamento ? new Date(t.data_proximo_pagamento) : (t.trial_fim ? new Date(t.trial_fim) : null)
                        const hoje = new Date()
                        const em7Dias = new Date()
                        em7Dias.setDate(hoje.getDate() + 7)
                        return dataProximo && dataProximo <= em7Dias
                      })
                      .sort((a, b) => {
                        const dataA = a.data_proximo_pagamento || a.trial_fim || ''
                        const dataB = b.data_proximo_pagamento || b.trial_fim || ''
                        return new Date(dataA).getTime() - new Date(dataB).getTime()
                      })
                      .map(tenant => {
                        const dataVencimento = tenant.data_proximo_pagamento || tenant.trial_fim
                        const vencido = dataVencimento ? new Date(dataVencimento) <= new Date() : false
                        return (
                          <div key={tenant.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                tenant.tipo_negocio === 'nail_designer' ? 'bg-pink-100 dark:bg-pink-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                              }`}>
                                {tenant.tipo_negocio === 'nail_designer' ? (
                                  <Hand className="w-5 h-5 text-pink-500" />
                                ) : (
                                  <Scissors className="w-5 h-5 text-blue-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-zinc-900 dark:text-white">{tenant.nome}</p>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                  <span>{tenant.email}</span>
                                  {tenant.dia_cobranca && (
                                    <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                                      Dia {tenant.dia_cobranca}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-sm font-medium ${vencido ? 'text-red-500' : 'text-amber-500'}`}>
                                  {vencido ? 'Vencido' : 'Vence'} {dataVencimento ? format(new Date(dataVencimento), "dd/MM", { locale: ptBR }) : '-'}
                                </p>
                                <p className="text-xs text-zinc-500">R$ 39,90</p>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => gerarPixPagamento(tenant)}
                                  className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                  title="Gerar PIX"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => solicitarCobranca(tenant)}
                                  className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                  title="Lembrar via WhatsApp"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    {tenants.filter(t => {
                      const dataProximo = t.data_proximo_pagamento ? new Date(t.data_proximo_pagamento) : (t.trial_fim ? new Date(t.trial_fim) : null)
                      const hoje = new Date()
                      const em7Dias = new Date()
                      em7Dias.setDate(hoje.getDate() + 7)
                      return dataProximo && dataProximo <= em7Dias
                    }).length === 0 && (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <p className="text-zinc-500">Nenhuma cobrança pendente</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Histórico de Pagamentos */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Últimos Pagamentos Confirmados</h3>
                    <p className="text-xs text-zinc-500">Tenants que realizaram pagamento</p>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
                    {tenants
                      .filter(t => t.data_ultimo_pagamento)
                      .sort((a, b) => new Date(b.data_ultimo_pagamento!).getTime() - new Date(a.data_ultimo_pagamento!).getTime())
                      .slice(0, 10)
                      .map(tenant => (
                        <div key={tenant.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-white text-sm">{tenant.nome}</p>
                              <p className="text-xs text-zinc-500">
                                Pago em {format(new Date(tenant.data_ultimo_pagamento!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-emerald-600">R$ 39,90</p>
                            {tenant.data_proximo_pagamento && (
                              <p className="text-xs text-zinc-500">
                                Próximo: {format(new Date(tenant.data_proximo_pagamento), "dd/MM", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    {tenants.filter(t => t.data_ultimo_pagamento).length === 0 && (
                      <div className="p-8 text-center">
                        <CreditCard className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-zinc-500">Nenhum pagamento confirmado ainda</p>
                      </div>
                    )}
                  </div>
                </div>
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

            {/* Bot WhatsApp */}
            {abaAtiva === 'bot' && (
              <motion.div key="bot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <PainelBotFly />
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !excluindo && setModalExcluir({ aberto: false, tenant: null })}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-excluir-titulo"
            aria-describedby="modal-excluir-descricao"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              {/* Header com botão fechar */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 id="modal-excluir-titulo" className="text-lg font-bold text-zinc-900 dark:text-white">
                      Excluir Barbearia
                    </h3>
                    <p className="text-sm text-zinc-500">Esta ação é irreversível</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalExcluir({ aberto: false, tenant: null })}
                  disabled={excluindo}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="modal-excluir-descricao" className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  <strong>{modalExcluir.tenant.nome}</strong> e todos os dados associados serão excluídos permanentemente:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <Scissors className="w-4 h-4" aria-hidden="true" />
                    <span>{modalExcluir.tenant.total_barbeiros} barbeiros</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <Settings className="w-4 h-4" aria-hidden="true" />
                    <span>{modalExcluir.tenant.total_servicos} serviços</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    <span>{modalExcluir.tenant.total_agendamentos} agendamentos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                    <Users className="w-4 h-4" aria-hidden="true" />
                    <span>{modalExcluir.tenant.total_clientes} clientes</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setModalExcluir({ aberto: false, tenant: null })}
                  disabled={excluindo}
                  className="flex-1 px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={excluirTenant}
                  disabled={excluindo}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {excluindo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> 
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" aria-hidden="true" /> 
                      <span>Excluir Definitivamente</span>
                    </>
                  )}
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

      {/* Modal de Pagamento PIX */}
      {modalPagamento.tenant && (
        <ModalPagamentoPix
          aberto={modalPagamento.aberto}
          onFechar={() => setModalPagamento({ aberto: false, tenant: null })}
          tenantId={modalPagamento.tenant.id}
          tenantNome={modalPagamento.tenant.nome}
          onPagamentoAprovado={() => {
            carregarDados()
            setModalPagamento({ aberto: false, tenant: null })
          }}
        />
      )}
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

function CardTenantItem({ 
  tenant, 
  onExcluir, 
  onAlterarPlano, 
  onToggleAtivo, 
  onVerDetalhes,
  onAlterarTrial,
  onRemoverTrial,
  onSolicitarCobranca,
  onGerarPix,
  onTerminarTrial,
  onCobrarAgora
}: {
  tenant: Tenant
  onExcluir: () => void
  onAlterarPlano: (plano: string) => void
  onToggleAtivo: () => void
  onVerDetalhes: () => void
  onAlterarTrial: (dias: number) => void
  onRemoverTrial: () => void
  onSolicitarCobranca: () => void
  onGerarPix: () => void
  onTerminarTrial: () => void
  onCobrarAgora: () => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const plano = PLANOS_CONFIG[tenant.plano] || PLANOS_CONFIG.trial
  const diasTrial = tenant.trial_fim ? differenceInDays(new Date(tenant.trial_fim), new Date()) : null

  const abrirMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = 224 // w-56 = 14rem = 224px
      const menuHeight = 400 // altura estimada do menu
      
      // Calcular posição
      let top = rect.bottom + 4
      let left = rect.right - menuWidth
      
      // Se não cabe embaixo, abre em cima
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4
      }
      
      // Se não cabe à esquerda, ajusta
      if (left < 8) {
        left = 8
      }
      
      setMenuPosition({ top, left })
    }
    setMenuAberto(true)
  }

  const copiarLink = async () => {
    const url = `${window.location.origin}/${tenant.slug}`
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const abrirWhatsApp = () => {
    if (tenant.whatsapp) {
      const numero = tenant.whatsapp.replace(/\D/g, '')
      window.open(`https://wa.me/${numero}`, '_blank')
    }
  }

  const enviarEmail = () => {
    if (tenant.email) {
      window.open(`mailto:${tenant.email}`, '_blank')
    }
  }

  return (
    <div 
      className={`bg-white dark:bg-zinc-900 rounded-xl border overflow-hidden transition-all ${
        !tenant.ativo ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50'
      } border-zinc-200 dark:border-zinc-800`}
      role="article"
      aria-label={`Barbearia ${tenant.nome}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
            {tenant.logo_url ? (
              <Image src={tenant.logo_url} alt={`Logo de ${tenant.nome}`} width={48} height={48} className="object-cover w-full h-full" unoptimized />
            ) : tenant.tipo_negocio === 'nail_designer' ? (
              <Hand className="w-6 h-6 text-pink-400" aria-hidden="true" />
            ) : (
              <Scissors className="w-6 h-6 text-blue-400" aria-hidden="true" />
            )}
            {/* Badge de tipo */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
              tenant.tipo_negocio === 'nail_designer' ? 'bg-pink-500' : 'bg-blue-500'
            }`}>
              {tenant.tipo_negocio === 'nail_designer' ? (
                <Hand className="w-2.5 h-2.5 text-white" />
              ) : (
                <Scissors className="w-2.5 h-2.5 text-white" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{tenant.nome}</h3>
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                tenant.tipo_negocio === 'nail_designer' 
                  ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600' 
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
              }`}>
                {tenant.tipo_negocio === 'nail_designer' ? 'Nail' : 'Barber'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 truncate">/{tenant.slug}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plano.bg} ${plano.cor}`}>
                {plano.nome}
              </span>
              {diasTrial !== null && tenant.plano === 'trial' && (
                <span 
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    diasTrial < 0 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600' 
                      : diasTrial <= 3 
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' 
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  }`}
                  title={diasTrial < 0 ? 'Trial expirado' : `${diasTrial} dias restantes`}
                >
                  {diasTrial < 0 ? 'Expirado' : `${diasTrial}d`}
                </span>
              )}
              {!tenant.ativo && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                  Inativo
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <button 
              ref={buttonRef}
              onClick={abrirMenu} 
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Abrir menu de opções"
              aria-expanded={menuAberto}
              aria-haspopup="menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {menuAberto && menuPosition && (
                <>
                  <div 
                    className="fixed inset-0 z-[9998]" 
                    onClick={() => setMenuAberto(false)} 
                    aria-hidden="true"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    className="fixed w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 py-1.5 z-[9999] overflow-hidden max-h-[70vh] overflow-y-auto"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    {/* Ações Rápidas */}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Ações Rápidas
                    </div>
                    
                    <a 
                      href={`/${tenant.slug}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      role="menuitem"
                    >
                      <Globe className="w-4 h-4 text-zinc-400" /> 
                      <span>Ver Site Público</span>
                      <ExternalLink className="w-3 h-3 ml-auto text-zinc-400" />
                    </a>
                    
                    <button 
                      onClick={() => { onVerDetalhes(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      <FileText className="w-4 h-4 text-zinc-400" /> 
                      <span>Ver Detalhes Completos</span>
                    </button>
                    
                    <button 
                      onClick={() => { copiarLink(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      {copiado ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-600">Link Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 text-zinc-400" />
                          <span>Copiar Link do Site</span>
                        </>
                      )}
                    </button>
                    
                    <hr className="my-1.5 border-zinc-200 dark:border-zinc-700" />
                    
                    {/* Comunicação */}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Comunicação
                    </div>
                    
                    <button 
                      onClick={() => { enviarEmail(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left transition-colors"
                      role="menuitem"
                      disabled={!tenant.email}
                    >
                      <Mail className="w-4 h-4 text-zinc-400" /> 
                      <span>Enviar E-mail</span>
                      {tenant.email && <span className="ml-auto text-xs text-zinc-400 truncate max-w-[80px]">{tenant.email.split('@')[0]}...</span>}
                    </button>
                    
                    <button 
                      onClick={() => { abrirWhatsApp(); setMenuAberto(false) }} 
                      className={`flex items-center gap-2.5 px-3 py-2 text-sm w-full text-left transition-colors ${
                        tenant.whatsapp 
                          ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700' 
                          : 'text-zinc-400 cursor-not-allowed'
                      }`}
                      role="menuitem"
                      disabled={!tenant.whatsapp}
                    >
                      <MessageSquare className="w-4 h-4 text-zinc-400" /> 
                      <span>Abrir WhatsApp</span>
                      {tenant.whatsapp && <span className="ml-auto text-xs text-emerald-500">●</span>}
                    </button>
                    
                    <hr className="my-1.5 border-zinc-200 dark:border-zinc-700" />
                    
                    {/* Gestão de Plano */}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Alterar Plano
                    </div>
                    
                    <div className="px-2 py-1 grid grid-cols-2 gap-1">
                      {Object.entries(PLANOS_CONFIG).map(([key, cfg]) => (
                        <button 
                          key={key} 
                          onClick={() => { onAlterarPlano(key); setMenuAberto(false) }} 
                          className={`flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            tenant.plano === key 
                              ? `${cfg.bg} ${cfg.cor} ring-2 ring-offset-1 ring-current` 
                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                          }`}
                          role="menuitem"
                          aria-pressed={tenant.plano === key}
                        >
                          {tenant.plano === key && <CheckCircle className="w-3 h-3" />}
                          {cfg.nome}
                        </button>
                      ))}
                    </div>
                    
                    <hr className="my-1.5 border-zinc-200 dark:border-zinc-700" />
                    
                    {/* Gestão de Trial */}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Gestão de Trial
                    </div>
                    
                    <div className="px-2 py-1 space-y-1">
                      <div className="grid grid-cols-3 gap-1">
                        <button 
                          onClick={() => { onAlterarTrial(7); setMenuAberto(false) }} 
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                          role="menuitem"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          +7d
                        </button>
                        <button 
                          onClick={() => { onAlterarTrial(15); setMenuAberto(false) }} 
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                          role="menuitem"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          +15d
                        </button>
                        <button 
                          onClick={() => { onAlterarTrial(30); setMenuAberto(false) }} 
                          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                          role="menuitem"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          +30d
                        </button>
                      </div>
                      <button 
                        onClick={() => { onRemoverTrial(); setMenuAberto(false) }} 
                        className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-all"
                        role="menuitem"
                      >
                        <CalendarMinus className="w-3 h-3" />
                        Remover Prazo (Trial Infinito)
                      </button>
                    </div>
                    
                    <hr className="my-1.5 border-zinc-200 dark:border-zinc-700" />
                    
                    {/* Cobrança */}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Cobrança
                    </div>
                    
                    <button 
                      onClick={() => { onGerarPix(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      <QrCode className="w-4 h-4" /> 
                      <span>Gerar PIX (R$ 39,90)</span>
                      <span className="ml-auto text-xs bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">Mercado Pago</span>
                    </button>
                    
                    <button 
                      onClick={() => { onSolicitarCobranca(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      <MessageSquare className="w-4 h-4 text-zinc-400" /> 
                      <span>Lembrar via WhatsApp</span>
                    </button>
                    
                    <button 
                      onClick={() => { onCobrarAgora(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      <Banknote className="w-4 h-4" /> 
                      <span>Cobrar Agora</span>
                      <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Termina trial + PIX</span>
                    </button>
                    
                    <button 
                      onClick={() => { onTerminarTrial(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      <Clock className="w-4 h-4" /> 
                      <span>Terminar Trial Agora</span>
                    </button>
                    
                    <hr className="my-1.5 border-zinc-200 dark:border-zinc-700" />
                    
                    {/* Ações de Controle */}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Controle
                    </div>
                    
                    <button 
                      onClick={() => { onToggleAtivo(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      {tenant.ativo ? (
                        <>
                          <Pause className="w-4 h-4 text-amber-500" /> 
                          <span>Suspender Conta</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-emerald-500" /> 
                          <span>Reativar Conta</span>
                        </>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => { onExcluir(); setMenuAberto(false) }} 
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                      role="menuitem"
                    >
                      <Trash2 className="w-4 h-4" /> 
                      <span>Excluir Permanentemente</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Estatísticas */}
      <div className="grid grid-cols-4 divide-x divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
        <MiniStat valor={tenant.total_barbeiros} label="Barbeiros" icone={Scissors} />
        <MiniStat valor={tenant.total_servicos} label="Serviços" icone={Settings} />
        <MiniStat valor={tenant.total_agendamentos} label="Agendamentos" icone={Calendar} />
        <MiniStat valor={tenant.total_clientes} label="Clientes" icone={Users} />
      </div>
    </div>
  )
}

function MiniStat({ valor, label, icone: Icone }: { valor: number; label: string; icone?: any }) {
  return (
    <div className="py-2.5 px-1 text-center group">
      <div className="flex items-center justify-center gap-1">
        {Icone && <Icone className="w-3 h-3 text-zinc-400 hidden sm:block" aria-hidden="true" />}
        <p className="text-sm font-bold text-zinc-900 dark:text-white">{valor}</p>
      </div>
      <p className="text-[10px] text-zinc-500 truncate">{label}</p>
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
