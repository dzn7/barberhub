'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Clock, 
  Check, 
  X, 
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { format, parseISO, addDays, isSameDay, isToday, isBefore, startOfDay } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

const TIMEZONE_BRASILIA = 'America/Sao_Paulo'

interface ConfiguracaoBarbearia {
  horario_abertura: string
  horario_fechamento: string
  intervalo_horarios: number
  intervalo_almoco_inicio: string | null
  intervalo_almoco_fim: string | null
  dias_funcionamento: string[]
}

interface AgendamentoOcupado {
  id: string
  data_hora: string
  duracao: number
}

interface SeletorHorarioAvancadoProps {
  tenantId: string
  barbeiroId?: string
  dataSelecionada: string
  horarioSelecionado: string
  onDataChange: (data: string) => void
  onHorarioChange: (horario: string) => void
  servicoDuracao?: number
  onClose?: () => void
  mostrarCalendario?: boolean
}

/**
 * Componente avançado de seleção de horário
 * Conectado às configurações da barbearia em realtime
 */
export function SeletorHorarioAvancado({
  tenantId,
  barbeiroId,
  dataSelecionada,
  horarioSelecionado,
  onDataChange,
  onHorarioChange,
  servicoDuracao = 30,
  onClose,
  mostrarCalendario = true
}: SeletorHorarioAvancadoProps) {
  const [config, setConfig] = useState<ConfiguracaoBarbearia | null>(null)
  const [agendamentosOcupados, setAgendamentosOcupados] = useState<AgendamentoOcupado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const subscriptionRef = useRef<any>(null)

  // Buscar configurações da barbearia
  useEffect(() => {
    const buscarConfiguracoes = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes_barbearia')
          .select('horario_abertura, horario_fechamento, intervalo_horarios, intervalo_almoco_inicio, intervalo_almoco_fim, dias_funcionamento')
          .eq('tenant_id', tenantId)
          .single()

        if (error && error.code !== 'PGRST116') throw error
        
        if (data) {
          setConfig({
            horario_abertura: data.horario_abertura || '09:00:00',
            horario_fechamento: data.horario_fechamento || '18:00:00',
            intervalo_horarios: data.intervalo_horarios || 30,
            intervalo_almoco_inicio: data.intervalo_almoco_inicio,
            intervalo_almoco_fim: data.intervalo_almoco_fim,
            dias_funcionamento: data.dias_funcionamento || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']
          })
        } else {
          // Configuração padrão
          setConfig({
            horario_abertura: '09:00:00',
            horario_fechamento: '18:00:00',
            intervalo_horarios: 30,
            intervalo_almoco_inicio: null,
            intervalo_almoco_fim: null,
            dias_funcionamento: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']
          })
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error)
        setErro('Erro ao carregar configurações')
      }
    }

    buscarConfiguracoes()
  }, [tenantId])

  // Buscar agendamentos ocupados da data selecionada
  const buscarAgendamentosOcupados = useCallback(async () => {
    if (!dataSelecionada || !tenantId) return

    try {
      setCarregando(true)
      
      const inicioDiaLocal = `${dataSelecionada}T00:00:00`
      const fimDiaLocal = `${dataSelecionada}T23:59:59`
      const inicioDiaUTC = fromZonedTime(inicioDiaLocal, TIMEZONE_BRASILIA)
      const fimDiaUTC = fromZonedTime(fimDiaLocal, TIMEZONE_BRASILIA)

      let query = supabase
        .from('agendamentos')
        .select('id, data_hora, servicos(duracao)')
        .eq('tenant_id', tenantId)
        .gte('data_hora', inicioDiaUTC.toISOString())
        .lte('data_hora', fimDiaUTC.toISOString())
        .not('status', 'eq', 'cancelado')

      if (barbeiroId) {
        query = query.eq('barbeiro_id', barbeiroId)
      }

      const { data, error } = await query

      if (error) throw error

      setAgendamentosOcupados(
        (data || []).map((ag: any) => ({
          id: ag.id,
          data_hora: ag.data_hora,
          duracao: ag.servicos?.duracao || 30
        }))
      )
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error)
    } finally {
      setCarregando(false)
    }
  }, [dataSelecionada, tenantId, barbeiroId])

  useEffect(() => {
    buscarAgendamentosOcupados()
  }, [buscarAgendamentosOcupados])

  // Subscription realtime para agendamentos
  useEffect(() => {
    if (!tenantId) return

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const canal = supabase
      .channel(`agendamentos-horarios-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          buscarAgendamentosOcupados()
        }
      )
      .subscribe()

    subscriptionRef.current = canal

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [tenantId, buscarAgendamentosOcupados])

  // Gerar horários disponíveis baseado nas configurações
  const horariosDisponiveis = useMemo(() => {
    if (!config) return []

    const horarios: { horario: string; disponivel: boolean; motivo?: string }[] = []
    
    const [horaAbertura, minAbertura] = config.horario_abertura.split(':').map(Number)
    const [horaFechamento, minFechamento] = config.horario_fechamento.split(':').map(Number)
    const intervalo = config.intervalo_horarios

    let horaAtual = horaAbertura
    let minAtual = minAbertura

    // Gerar horários até o fechamento
    while (horaAtual < horaFechamento || (horaAtual === horaFechamento && minAtual <= minFechamento)) {
      const horarioStr = `${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`
      
      // Verificar se está no intervalo de almoço
      let estaNoAlmoco = false
      if (config.intervalo_almoco_inicio && config.intervalo_almoco_fim) {
        const [horaAlmocoInicio, minAlmocoInicio] = config.intervalo_almoco_inicio.split(':').map(Number)
        const [horaAlmocoFim, minAlmocoFim] = config.intervalo_almoco_fim.split(':').map(Number)
        
        const minutosAtual = horaAtual * 60 + minAtual
        const minutosAlmocoInicio = horaAlmocoInicio * 60 + minAlmocoInicio
        const minutosAlmocoFim = horaAlmocoFim * 60 + minAlmocoFim
        
        estaNoAlmoco = minutosAtual >= minutosAlmocoInicio && minutosAtual < minutosAlmocoFim
      }

      // Verificar se o horário já passou (para hoje)
      const agora = toZonedTime(new Date(), TIMEZONE_BRASILIA)
      const dataAtual = format(agora, 'yyyy-MM-dd')
      let jaPassou = false
      
      if (dataSelecionada === dataAtual) {
        const horaAgora = agora.getHours()
        const minAgora = agora.getMinutes()
        jaPassou = horaAtual < horaAgora || (horaAtual === horaAgora && minAtual <= minAgora)
      }

      // Verificar se há conflito com agendamentos existentes
      let ocupado = false
      let motivoOcupado = ''
      
      for (const ag of agendamentosOcupados) {
        const agDataUTC = parseISO(ag.data_hora)
        const agDataBrasilia = toZonedTime(agDataUTC, TIMEZONE_BRASILIA)
        const agHora = agDataBrasilia.getHours()
        const agMin = agDataBrasilia.getMinutes()
        const agDuracao = ag.duracao || 30

        const agInicioMin = agHora * 60 + agMin
        const agFimMin = agInicioMin + agDuracao
        
        const horarioAtualMin = horaAtual * 60 + minAtual
        const horarioFimMin = horarioAtualMin + servicoDuracao

        // Verificar sobreposição
        if (
          (horarioAtualMin >= agInicioMin && horarioAtualMin < agFimMin) ||
          (horarioFimMin > agInicioMin && horarioFimMin <= agFimMin) ||
          (horarioAtualMin <= agInicioMin && horarioFimMin >= agFimMin)
        ) {
          ocupado = true
          motivoOcupado = 'Ocupado'
          break
        }
      }

      const disponivel = !estaNoAlmoco && !jaPassou && !ocupado

      horarios.push({
        horario: horarioStr,
        disponivel,
        motivo: estaNoAlmoco ? 'Almoço' : jaPassou ? 'Passou' : ocupado ? motivoOcupado : undefined
      })

      // Incrementar para próximo horário
      minAtual += intervalo
      if (minAtual >= 60) {
        horaAtual += Math.floor(minAtual / 60)
        minAtual = minAtual % 60
      }
    }

    return horarios
  }, [config, agendamentosOcupados, dataSelecionada, servicoDuracao])

  // Dias da semana para navegação
  const diasSemana = useMemo(() => {
    const hoje = startOfDay(new Date())
    return Array.from({ length: 14 }, (_, i) => addDays(hoje, i))
  }, [])

  // Mapear dia da semana para sigla
  const getDiaSemana = (data: Date) => {
    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    return dias[data.getDay()]
  }

  // Verificar se um dia está disponível
  const diaDisponivel = (data: Date) => {
    if (!config) return true
    const diaSemana = getDiaSemana(data)
    return config.dias_funcionamento.includes(diaSemana)
  }

  const horariosDisponiveisCount = horariosDisponiveis.filter(h => h.disponivel).length

  if (erro) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400">{erro}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Data */}
      {mostrarCalendario && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Selecione a Data
            </h4>
            <span className="text-xs text-zinc-500">
              {format(parseISO(`${dataSelecionada}T00:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>

          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div className="flex gap-2 min-w-max">
              {diasSemana.map((dia) => {
                const dataStr = format(dia, 'yyyy-MM-dd')
                const selecionado = dataSelecionada === dataStr
                const disponivel = diaDisponivel(dia)
                const ehHoje = isToday(dia)

                return (
                  <button
                    key={dataStr}
                    onClick={() => disponivel && onDataChange(dataStr)}
                    disabled={!disponivel}
                    className={`
                      flex flex-col items-center justify-center min-w-[60px] py-3 px-2 rounded-xl transition-all
                      ${!disponivel 
                        ? 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed'
                        : selecionado
                          ? 'bg-white text-zinc-900 shadow-lg'
                          : 'bg-zinc-800/50 text-white hover:bg-zinc-700'
                      }
                    `}
                  >
                    <span className="text-[10px] uppercase font-medium opacity-70">
                      {format(dia, 'EEE', { locale: ptBR })}
                    </span>
                    <span className={`text-lg font-bold ${ehHoje && !selecionado ? 'text-blue-400' : ''}`}>
                      {format(dia, 'd')}
                    </span>
                    {ehHoje && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${selecionado ? 'bg-zinc-900' : 'bg-blue-400'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid de Horários */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horários Disponíveis
          </h4>
          {carregando ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
          ) : (
            <span className="text-xs text-zinc-500">
              {horariosDisponiveisCount} disponíveis
            </span>
          )}
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : horariosDisponiveis.length === 0 ? (
          <div className="text-center py-8 bg-zinc-800/30 rounded-xl">
            <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">Nenhum horário configurado</p>
          </div>
        ) : horariosDisponiveisCount === 0 ? (
          <div className="text-center py-8 bg-zinc-800/30 rounded-xl">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="text-zinc-400">Todos os horários estão ocupados</p>
            <p className="text-xs text-zinc-500 mt-1">Tente outra data</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {horariosDisponiveis.map((item) => {
              const selecionado = horarioSelecionado === item.horario

              return (
                <motion.button
                  key={item.horario}
                  onClick={() => item.disponivel && onHorarioChange(item.horario)}
                  disabled={!item.disponivel}
                  whileHover={item.disponivel ? { scale: 1.05 } : {}}
                  whileTap={item.disponivel ? { scale: 0.95 } : {}}
                  className={`
                    relative py-3 px-1 rounded-xl text-center transition-all font-medium
                    ${!item.disponivel 
                      ? 'bg-zinc-800/30 text-zinc-600 cursor-not-allowed'
                      : selecionado
                        ? 'bg-white text-zinc-900 shadow-lg'
                        : 'bg-zinc-800/50 text-white hover:bg-zinc-700'
                    }
                  `}
                >
                  <span className={!item.disponivel ? 'line-through' : ''}>
                    {item.horario}
                  </span>
                  
                  {selecionado && item.disponivel && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500 pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zinc-800/50" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zinc-800/30" />
          <span>Ocupado</span>
        </div>
      </div>

      {/* Botão Confirmar */}
      {onClose && (
        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onClose}
            disabled={!horarioSelecionado}
            className="flex-1 py-3 px-4 rounded-xl bg-white text-zinc-900 font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  )
}
