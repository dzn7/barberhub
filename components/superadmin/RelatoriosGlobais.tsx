'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Calendar, DollarSign,
  Users, Scissors, Building2, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Clock, FileText
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

interface RelatorioData {
  periodo: string
  agendamentos: number
  receita: number
  novosClientes: number
  novosTenants: number
}

interface TopTenant {
  id: string
  nome: string
  agendamentos: number
  receita: number
}

/**
 * Componente de relatórios e métricas globais do sistema
 */
export function RelatoriosGlobais() {
  const [periodo, setPeriodo] = useState<'7d' | '30d' | 'mes'>('30d')
  const [dados, setDados] = useState<RelatorioData | null>(null)
  const [topTenants, setTopTenants] = useState<TopTenant[]>([])
  const [carregando, setCarregando] = useState(true)
  const [estatisticasPorStatus, setEstatisticasPorStatus] = useState<Record<string, number>>({})

  useEffect(() => {
    carregarDados()
  }, [periodo])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const agora = new Date()
      let dataInicio: Date

      switch (periodo) {
        case '7d':
          dataInicio = subDays(agora, 7)
          break
        case 'mes':
          dataInicio = startOfMonth(agora)
          break
        default:
          dataInicio = subDays(agora, 30)
      }

      // Buscar agendamentos do período
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('id, status, tenant_id, servicos(preco)')
        .gte('criado_em', dataInicio.toISOString())

      // Buscar novos clientes
      const { count: novosClientes } = await supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .gte('data_cadastro', dataInicio.toISOString())

      // Buscar novos tenants
      const { count: novosTenants } = await supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })
        .gte('criado_em', dataInicio.toISOString())

      // Calcular receita e agrupar por status
      let receita = 0
      const statusCount: Record<string, number> = {}
      const tenantStats: Record<string, { agendamentos: number; receita: number }> = {}

      agendamentos?.forEach((ag: any) => {
        const preco = ag.servicos?.preco || 0
        if (ag.status === 'concluido') {
          receita += preco
        }
        
        statusCount[ag.status] = (statusCount[ag.status] || 0) + 1

        if (!tenantStats[ag.tenant_id]) {
          tenantStats[ag.tenant_id] = { agendamentos: 0, receita: 0 }
        }
        tenantStats[ag.tenant_id].agendamentos++
        if (ag.status === 'concluido') {
          tenantStats[ag.tenant_id].receita += preco
        }
      })

      setEstatisticasPorStatus(statusCount)

      // Buscar top tenants
      const tenantIds = Object.keys(tenantStats).slice(0, 10)
      if (tenantIds.length > 0) {
        const { data: tenantNomes } = await supabase
          .from('tenants')
          .select('id, nome')
          .in('id', tenantIds)

        const top = tenantIds
          .map(id => ({
            id,
            nome: tenantNomes?.find((t: any) => t.id === id)?.nome || 'Desconhecido',
            ...tenantStats[id]
          }))
          .sort((a, b) => b.agendamentos - a.agendamentos)
          .slice(0, 5)

        setTopTenants(top)
      }

      setDados({
        periodo: periodo === '7d' ? '7 dias' : periodo === 'mes' ? 'Este mês' : '30 dias',
        agendamentos: agendamentos?.length || 0,
        receita,
        novosClientes: novosClientes || 0,
        novosTenants: novosTenants || 0
      })
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    } finally {
      setCarregando(false)
    }
  }

  const totalStatus = Object.values(estatisticasPorStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Seletor de Período */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Relatórios Globais
          </h2>
          <p className="text-sm text-zinc-500">
            Métricas consolidadas de todas as barbearias
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          {[
            { valor: '7d', label: '7 dias' },
            { valor: '30d', label: '30 dias' },
            { valor: 'mes', label: 'Este mês' }
          ].map((p) => (
            <button
              key={p.valor}
              onClick={() => setPeriodo(p.valor as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                periodo === p.valor
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardMetrica
          titulo="Agendamentos"
          valor={dados?.agendamentos || 0}
          icone={Calendar}
          cor="bg-blue-500"
          carregando={carregando}
        />
        <CardMetrica
          titulo="Receita Total"
          valor={dados?.receita || 0}
          icone={DollarSign}
          cor="bg-emerald-500"
          formato="moeda"
          carregando={carregando}
        />
        <CardMetrica
          titulo="Novos Clientes"
          valor={dados?.novosClientes || 0}
          icone={Users}
          cor="bg-purple-500"
          carregando={carregando}
        />
        <CardMetrica
          titulo="Novas Barbearias"
          valor={dados?.novosTenants || 0}
          icone={Building2}
          cor="bg-amber-500"
          carregando={carregando}
        />
      </div>

      {/* Gráficos e Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Agendamentos */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-zinc-500" />
            Status dos Agendamentos
          </h3>

          {carregando ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <BarraStatus
                label="Concluídos"
                valor={estatisticasPorStatus.concluido || 0}
                total={totalStatus}
                cor="bg-emerald-500"
              />
              <BarraStatus
                label="Confirmados"
                valor={estatisticasPorStatus.confirmado || 0}
                total={totalStatus}
                cor="bg-blue-500"
              />
              <BarraStatus
                label="Pendentes"
                valor={estatisticasPorStatus.pendente || 0}
                total={totalStatus}
                cor="bg-amber-500"
              />
              <BarraStatus
                label="Cancelados"
                valor={estatisticasPorStatus.cancelado || 0}
                total={totalStatus}
                cor="bg-red-500"
              />
            </div>
          )}
        </div>

        {/* Top Barbearias */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-500" />
            Top Barbearias (por agendamentos)
          </h3>

          {carregando ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            </div>
          ) : topTenants.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-500">
              Sem dados suficientes
            </div>
          ) : (
            <div className="space-y-3">
              {topTenants.map((tenant, index) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-zinc-200 text-zinc-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-zinc-100 text-zinc-500'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white text-sm">
                      {tenant.nome}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">
                      {tenant.agendamentos}
                    </p>
                    <p className="text-xs text-zinc-500">
                      R$ {tenant.receita.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CardMetrica({
  titulo,
  valor,
  icone: Icone,
  cor,
  formato,
  carregando
}: {
  titulo: string
  valor: number
  icone: any
  cor: string
  formato?: 'moeda'
  carregando: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${cor} rounded-xl flex items-center justify-center`}>
          <Icone className="w-5 h-5 text-white" />
        </div>
      </div>
      {carregando ? (
        <div className="h-8 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
          {formato === 'moeda' ? `R$ ${valor.toFixed(2)}` : valor.toLocaleString('pt-BR')}
        </p>
      )}
      <p className="text-sm text-zinc-500 mt-1">{titulo}</p>
    </motion.div>
  )
}

function BarraStatus({
  label,
  valor,
  total,
  cor
}: {
  label: string
  valor: number
  total: number
  cor: string
}) {
  const percentual = total > 0 ? (valor / total) * 100 : 0

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="text-zinc-900 dark:text-white font-medium">
          {valor} ({percentual.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${cor} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentual}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>
    </div>
  )
}
