'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown
} from 'lucide-react'
import { format, parseISO, isToday, isPast, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'
import { Badge, Select } from '@radix-ui/themes'

interface Agendamento {
  id: string
  data_hora: string
  status: string
  observacoes: string | null
  clientes: { nome: string; telefone: string }
  servicos: { nome: string; preco: number; duracao: number }
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; badge: string }> = {
  pendente: { label: 'Pendente', cor: 'text-yellow-600', badge: 'yellow' },
  confirmado: { label: 'Confirmado', cor: 'text-blue-600', badge: 'blue' },
  concluido: { label: 'Concluído', cor: 'text-emerald-600', badge: 'green' },
  cancelado: { label: 'Cancelado', cor: 'text-red-600', badge: 'red' },
}

/**
 * Lista de Agendamentos do Barbeiro
 * Com filtros por status e busca
 */
export function ListaAgendamentosBarbeiro() {
  const { barbeiro, tenant } = useBarbeiroAuth()
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoje')
  const [termoBusca, setTermoBusca] = useState('')
  const [processando, setProcessando] = useState<string | null>(null)

  useEffect(() => {
    if (barbeiro && tenant) {
      carregarAgendamentos()
    }
  }, [barbeiro, tenant, filtroStatus, filtroPeriodo])

  const carregarAgendamentos = async () => {
    if (!barbeiro || !tenant) return

    setCarregando(true)
    try {
      const hoje = new Date()
      let dataInicio: Date
      let dataFim: Date | null = null

      switch (filtroPeriodo) {
        case 'hoje':
          dataInicio = startOfDay(hoje)
          dataFim = endOfDay(hoje)
          break
        case 'semana':
          dataInicio = new Date(hoje)
          dataInicio.setDate(hoje.getDate() - hoje.getDay())
          dataFim = new Date(dataInicio)
          dataFim.setDate(dataInicio.getDate() + 7)
          break
        case 'mes':
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
          break
        default:
          dataInicio = new Date(2020, 0, 1)
      }

      let query = supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          observacoes,
          clientes (nome, telefone),
          servicos (nome, preco, duracao)
        `)
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .gte('data_hora', dataInicio.toISOString())
        .order('data_hora', { ascending: false })

      if (dataFim) {
        query = query.lte('data_hora', dataFim.toISOString())
      }

      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setAgendamentos((data as unknown as Agendamento[]) || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setCarregando(false)
    }
  }

  const atualizarStatus = async (id: string, novoStatus: string) => {
    if (!tenant) return

    setProcessando(id)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', id)
        .eq('tenant_id', tenant.id)

      if (error) throw error
      
      // Atualizar lista local
      setAgendamentos(prev => 
        prev.map(ag => ag.id === id ? { ...ag, status: novoStatus } : ag)
      )
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    } finally {
      setProcessando(null)
    }
  }

  // Filtrar por busca
  const agendamentosFiltrados = agendamentos.filter(ag => {
    if (!termoBusca) return true
    const termo = termoBusca.toLowerCase()
    return (
      ag.clientes?.nome?.toLowerCase().includes(termo) ||
      ag.clientes?.telefone?.includes(termo) ||
      ag.servicos?.nome?.toLowerCase().includes(termo)
    )
  })

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Agendamentos
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Gerencie seus atendimentos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar cliente ou serviço..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Filtro de Período */}
        <select
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="hoje">Hoje</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mês</option>
          <option value="todos">Todos</option>
        </select>

        {/* Filtro de Status */}
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Lista */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : agendamentosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {agendamentosFiltrados.map((ag) => {
              const statusConfig = STATUS_CONFIG[ag.status] || STATUS_CONFIG.pendente
              const dataAgendamento = parseISO(ag.data_hora)
              const passado = isPast(dataAgendamento) && !isToday(dataAgendamento)

              return (
                <motion.div
                  key={ag.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 ${passado ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Info Principal */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 text-center">
                        <p className="text-xs text-zinc-500">
                          {format(dataAgendamento, 'dd/MM')}
                        </p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {format(dataAgendamento, 'HH:mm')}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-zinc-900 dark:text-white truncate">
                            {ag.clientes?.nome || 'Cliente não informado'}
                          </p>
                          <Badge color={statusConfig.badge as any} size="1">
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-500">
                          {ag.servicos?.nome || 'Serviço'} • {formatarMoeda(ag.servicos?.preco || 0)}
                        </p>
                        {ag.clientes?.telefone && (
                          <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {ag.clientes.telefone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    {!passado && ag.status !== 'cancelado' && ag.status !== 'concluido' && (
                      <div className="flex items-center gap-2 ml-auto">
                        {ag.status === 'pendente' && (
                          <button
                            onClick={() => atualizarStatus(ag.id, 'confirmado')}
                            disabled={processando === ag.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                          >
                            {processando === ag.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Confirmar
                          </button>
                        )}
                        {ag.status === 'confirmado' && (
                          <button
                            onClick={() => atualizarStatus(ag.id, 'concluido')}
                            disabled={processando === ag.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                          >
                            {processando === ag.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Concluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Contador */}
      {!carregando && (
        <p className="text-sm text-zinc-500 text-center">
          {agendamentosFiltrados.length} agendamento(s) encontrado(s)
        </p>
      )}
    </div>
  )
}
