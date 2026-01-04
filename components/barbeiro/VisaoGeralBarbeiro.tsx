'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'

interface Metricas {
  comissaoMes: number
  comissaoSemana: number
  agendamentosHoje: number
  agendamentosSemana: number
  atendimentosConcluidos: number
  taxaConclusao: number
}

/**
 * Componente de Visão Geral do Barbeiro
 * Exibe métricas de comissões e agendamentos
 */
export function VisaoGeralBarbeiro() {
  const { barbeiro, tenant } = useBarbeiroAuth()
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [proximosAgendamentos, setProximosAgendamentos] = useState<any[]>([])

  useEffect(() => {
    if (barbeiro && tenant) {
      carregarMetricas()
      carregarProximosAgendamentos()
    }
  }, [barbeiro, tenant])

  const carregarMetricas = async () => {
    if (!barbeiro || !tenant) return

    try {
      const hoje = new Date()
      const inicioMes = startOfMonth(hoje)
      const fimMes = endOfMonth(hoje)
      const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 })
      const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 })

      // Buscar comissões do mês
      const { data: comissoesMes } = await supabase
        .from('comissoes')
        .select('valor')
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .gte('data', inicioMes.toISOString())
        .lte('data', fimMes.toISOString())

      // Buscar comissões da semana
      const { data: comissoesSemana } = await supabase
        .from('comissoes')
        .select('valor')
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .gte('data', inicioSemana.toISOString())
        .lte('data', fimSemana.toISOString())

      // Buscar agendamentos de hoje
      const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0))
      const fimHoje = new Date(hoje.setHours(23, 59, 59, 999))

      const { data: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select('id, status')
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .gte('data_hora', inicioHoje.toISOString())
        .lte('data_hora', fimHoje.toISOString())
        .neq('status', 'cancelado')

      // Buscar agendamentos da semana
      const { data: agendamentosSemana } = await supabase
        .from('agendamentos')
        .select('id, status')
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .gte('data_hora', inicioSemana.toISOString())
        .lte('data_hora', fimSemana.toISOString())
        .neq('status', 'cancelado')

      // Calcular métricas
      const totalComissaoMes = (comissoesMes || []).reduce((acc, c) => acc + Number(c.valor || 0), 0)
      const totalComissaoSemana = (comissoesSemana || []).reduce((acc, c) => acc + Number(c.valor || 0), 0)
      const totalAgendamentosHoje = (agendamentosHoje || []).length
      const totalAgendamentosSemana = (agendamentosSemana || []).length
      const concluidos = (agendamentosSemana || []).filter(a => a.status === 'concluido').length
      const taxa = totalAgendamentosSemana > 0 ? (concluidos / totalAgendamentosSemana) * 100 : 0

      setMetricas({
        comissaoMes: totalComissaoMes,
        comissaoSemana: totalComissaoSemana,
        agendamentosHoje: totalAgendamentosHoje,
        agendamentosSemana: totalAgendamentosSemana,
        atendimentosConcluidos: concluidos,
        taxaConclusao: taxa
      })
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setCarregando(false)
    }
  }

  const carregarProximosAgendamentos = async () => {
    if (!barbeiro || !tenant) return

    try {
      const agora = new Date()

      const { data } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          clientes (nome, telefone),
          servicos (nome, preco, duracao)
        `)
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .gte('data_hora', agora.toISOString())
        .in('status', ['pendente', 'confirmado'])
        .order('data_hora', { ascending: true })
        .limit(5)

      setProximosAgendamentos(data || [])
    } catch (error) {
      console.error('Erro ao carregar próximos agendamentos:', error)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Visão Geral
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Acompanhe suas métricas e próximos agendamentos
        </p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardMetrica
          titulo="Comissão do Mês"
          valor={formatarMoeda(metricas?.comissaoMes || 0)}
          icone={DollarSign}
          cor="emerald"
        />
        <CardMetrica
          titulo="Comissão da Semana"
          valor={formatarMoeda(metricas?.comissaoSemana || 0)}
          icone={TrendingUp}
          cor="blue"
        />
        <CardMetrica
          titulo="Agendamentos Hoje"
          valor={String(metricas?.agendamentosHoje || 0)}
          icone={Calendar}
          cor="purple"
        />
        <CardMetrica
          titulo="Taxa de Conclusão"
          valor={`${(metricas?.taxaConclusao || 0).toFixed(0)}%`}
          icone={CheckCircle}
          cor="amber"
        />
      </div>

      {/* Informações de Comissão */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">
              Sua Comissão
            </h3>
            <p className="text-sm text-zinc-500">
              {barbeiro?.comissao_percentual || 0}% sobre cada atendimento
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-sm text-zinc-500 mb-1">Este mês</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {formatarMoeda(metricas?.comissaoMes || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">Esta semana</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {formatarMoeda(metricas?.comissaoSemana || 0)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Próximos Agendamentos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-white">
            Próximos Agendamentos
          </h3>
          <span className="text-sm text-zinc-500">
            {proximosAgendamentos.length} agendamento(s)
          </span>
        </div>

        {proximosAgendamentos.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhum agendamento próximo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proximosAgendamentos.map((ag) => (
              <div
                key={ag.id}
                className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg">
                    <Clock className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {ag.clientes?.nome || 'Cliente'}
                    </p>
                    <p className="text-sm text-zinc-500">
                      {ag.servicos?.nome || 'Serviço'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {format(new Date(ag.data_hora), 'HH:mm')}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {format(new Date(ag.data_hora), "dd/MM", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// Componente de Card de Métrica
function CardMetrica({
  titulo,
  valor,
  icone: Icone,
  cor
}: {
  titulo: string
  valor: string
  icone: React.ComponentType<{ className?: string }>
  cor: 'emerald' | 'blue' | 'purple' | 'amber'
}) {
  const cores = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${cores[cor]}`}>
          <Icone className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
        {valor}
      </p>
      <p className="text-sm text-zinc-500 mt-1">
        {titulo}
      </p>
    </motion.div>
  )
}
