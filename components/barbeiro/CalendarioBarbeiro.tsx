'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User,
  Loader2,
  Phone
} from 'lucide-react'
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  parseISO, 
  isToday 
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'
import { Badge } from '@radix-ui/themes'

interface Agendamento {
  id: string
  data_hora: string
  status: string
  clientes: { nome: string; telefone: string }
  servicos: { nome: string; preco: number; duracao: number }
}

const STATUS_CORES: Record<string, { bg: string; text: string; badge: string }> = {
  pendente: { 
    bg: 'bg-yellow-50 dark:bg-yellow-900/20', 
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'yellow'
  },
  confirmado: { 
    bg: 'bg-blue-50 dark:bg-blue-900/20', 
    text: 'text-blue-700 dark:text-blue-400',
    badge: 'blue'
  },
  concluido: { 
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', 
    text: 'text-emerald-700 dark:text-emerald-400',
    badge: 'green'
  },
  cancelado: { 
    bg: 'bg-red-50 dark:bg-red-900/20', 
    text: 'text-red-700 dark:text-red-400',
    badge: 'red'
  },
}

const HORAS = Array.from({ length: 12 }, (_, i) => i + 8) // 8h às 19h

/**
 * Calendário Semanal do Barbeiro
 * Visualização dos agendamentos na semana
 */
export function CalendarioBarbeiro() {
  const { barbeiro, tenant } = useBarbeiroAuth()
  const [dataInicio, setDataInicio] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<Agendamento | null>(null)

  // Gerar dias da semana
  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(dataInicio, i))
  }, [dataInicio])

  useEffect(() => {
    if (barbeiro && tenant) {
      carregarAgendamentos()
    }
  }, [barbeiro, tenant, dataInicio])

  const carregarAgendamentos = async () => {
    if (!barbeiro || !tenant) return

    setCarregando(true)
    try {
      const fimSemana = addDays(dataInicio, 7)

      const { data, error } = await supabase
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
        .gte('data_hora', dataInicio.toISOString())
        .lt('data_hora', fimSemana.toISOString())
        .neq('status', 'cancelado')
        .order('data_hora', { ascending: true })

      if (error) throw error
      setAgendamentos((data as unknown as Agendamento[]) || [])
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error)
    } finally {
      setCarregando(false)
    }
  }

  const navegarSemana = (direcao: 'anterior' | 'proxima') => {
    setDataInicio(prev => addDays(prev, direcao === 'anterior' ? -7 : 7))
  }

  const obterAgendamentosDia = (dia: Date) => {
    return agendamentos.filter(ag => isSameDay(parseISO(ag.data_hora), dia))
  }

  const formatarHora = (dataHora: string) => {
    return format(parseISO(dataHora), 'HH:mm')
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Calendário
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Semana de {format(dataInicio, "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navegarSemana('anterior')}
            className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDataInicio(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
          >
            Hoje
          </button>
          <button
            onClick={() => navegarSemana('proxima')}
            className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendário Desktop */}
      <div className="hidden lg:block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header dos dias */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {diasSemana.map((dia) => (
            <div
              key={dia.toISOString()}
              className={`p-3 text-center border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 ${
                isToday(dia) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
              }`}
            >
              <p className="text-xs text-zinc-500 uppercase">
                {format(dia, 'EEE', { locale: ptBR })}
              </p>
              <p className={`text-lg font-semibold ${
                isToday(dia) 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-zinc-900 dark:text-white'
              }`}>
                {format(dia, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="grid grid-cols-7 min-h-[400px]">
            {diasSemana.map((dia) => {
              const agendamentosDia = obterAgendamentosDia(dia)
              return (
                <div
                  key={dia.toISOString()}
                  className={`p-2 border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 ${
                    isToday(dia) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                  }`}
                >
                  {agendamentosDia.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4">
                      Sem agendamentos
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {agendamentosDia.map((ag) => {
                        const status = STATUS_CORES[ag.status] || STATUS_CORES.pendente
                        return (
                          <button
                            key={ag.id}
                            onClick={() => setAgendamentoSelecionado(ag)}
                            className={`w-full p-2 rounded-lg text-left ${status.bg} hover:opacity-80 transition-opacity`}
                          >
                            <p className={`text-xs font-semibold ${status.text}`}>
                              {formatarHora(ag.data_hora)}
                            </p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
                              {ag.clientes?.nome || 'Cliente'}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                              {ag.servicos?.nome || 'Serviço'}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Calendário Mobile (Lista por dia) */}
      <div className="lg:hidden space-y-4">
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          diasSemana.map((dia) => {
            const agendamentosDia = obterAgendamentosDia(dia)
            if (agendamentosDia.length === 0 && !isToday(dia)) return null

            return (
              <motion.div
                key={dia.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              >
                <div className={`px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 ${
                  isToday(dia) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                }`}>
                  <p className={`font-semibold ${
                    isToday(dia) 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-zinc-900 dark:text-white'
                  }`}>
                    {format(dia, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {agendamentosDia.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">
                      Nenhum agendamento
                    </p>
                  ) : (
                    agendamentosDia.map((ag) => {
                      const status = STATUS_CORES[ag.status] || STATUS_CORES.pendente
                      return (
                        <button
                          key={ag.id}
                          onClick={() => setAgendamentoSelecionado(ag)}
                          className={`w-full flex items-center justify-between p-3 rounded-lg ${status.bg} text-left`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className={`text-sm font-bold ${status.text}`}>
                                {formatarHora(ag.data_hora)}
                              </p>
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
                          <Badge color={status.badge as any}>
                            {ag.status}
                          </Badge>
                        </button>
                      )
                    })
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Modal de Detalhes */}
      {agendamentoSelecionado && (
        <ModalDetalhesAgendamento
          agendamento={agendamentoSelecionado}
          onFechar={() => setAgendamentoSelecionado(null)}
        />
      )}
    </div>
  )
}

// Modal de Detalhes do Agendamento
function ModalDetalhesAgendamento({
  agendamento,
  onFechar
}: {
  agendamento: Agendamento
  onFechar: () => void
}) {
  const status = STATUS_CORES[agendamento.status] || STATUS_CORES.pendente

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Detalhes do Agendamento
            </h3>
            <Badge color={status.badge as any} size="2">
              {agendamento.status}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <User className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Cliente</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {agendamento.clientes?.nome || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <Phone className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Telefone</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {agendamento.clientes?.telefone || 'Não informado'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <Clock className="w-4 h-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm text-zinc-500">Horário</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {format(parseISO(agendamento.data_hora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 mb-1">Serviço</p>
              <p className="font-semibold text-zinc-900 dark:text-white">
                {agendamento.servicos?.nome || 'Não informado'}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(agendamento.servicos?.preco || 0)} • {agendamento.servicos?.duracao || 30} min
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onFechar}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-medium text-zinc-900 dark:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
