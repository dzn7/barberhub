'use client'

import { useMemo, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format, isToday, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

const TIMEZONE_BRASILIA = 'America/Sao_Paulo'
const HORAS_DIA = Array.from({ length: 14 }, (_, i) => i + 7) // 7h às 20h

const TAMANHOS_HORA: Record<string, number> = {
  compacto: 48,
  normal: 64,
  expandido: 80
}

const STATUS_CORES = {
  pendente: { bg: 'bg-amber-500', border: 'border-amber-600' },
  confirmado: { bg: 'bg-blue-500', border: 'border-blue-600' },
  concluido: { bg: 'bg-emerald-500', border: 'border-emerald-600' },
  cancelado: { bg: 'bg-zinc-400', border: 'border-zinc-500' }
}

interface Agendamento {
  id: string
  data_hora: string
  status: string
  clientes: { nome: string; telefone: string }
  barbeiros: { id: string; nome: string }
  servicos: { nome: string; preco: number; duracao: number }
}

interface GridCalendarioSemanalProps {
  diasExibidos: Date[]
  agendamentos: Agendamento[]
  tamanhoHora: 'compacto' | 'normal' | 'expandido'
  carregando: boolean
  onAgendamentoClick: (agendamento: Agendamento) => void
  onSlotClick?: (dia: Date, hora: number) => void
}

/**
 * Grid do calendário semanal com horários e agendamentos
 * Componente responsivo estilo Google Agenda
 */
export function GridCalendarioSemanal({
  diasExibidos,
  agendamentos,
  tamanhoHora,
  carregando,
  onAgendamentoClick,
  onSlotClick
}: GridCalendarioSemanalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const alturaHora = TAMANHOS_HORA[tamanhoHora]

  // Agrupar agendamentos por dia
  const agendamentosPorDia = useMemo(() => {
    const grupos: Record<string, Agendamento[]> = {}
    diasExibidos.forEach(dia => { grupos[format(dia, 'yyyy-MM-dd')] = [] })

    agendamentos.forEach(ag => {
      const dataBrasilia = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA)
      const key = format(dataBrasilia, 'yyyy-MM-dd')
      if (grupos[key]) grupos[key].push(ag)
    })

    return grupos
  }, [agendamentos, diasExibidos])

  // Calcular posição do agendamento
  const calcularPosicao = (dataHora: string, duracao: number) => {
    const dataBrasilia = toZonedTime(parseISO(dataHora), TIMEZONE_BRASILIA)
    const hora = dataBrasilia.getHours()
    const minutos = dataBrasilia.getMinutes()
    const top = ((hora - 7) * alturaHora) + ((minutos / 60) * alturaHora)
    const height = Math.max((duracao / 60) * alturaHora, 36)
    return { top, height }
  }

  // Scroll para hora atual ao carregar
  useEffect(() => {
    if (scrollRef.current && !carregando) {
      const horaAtual = new Date().getHours()
      const scrollPosition = Math.max(0, (horaAtual - 8) * alturaHora)
      scrollRef.current.scrollTop = scrollPosition
    }
  }, [carregando, alturaHora])

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Cabeçalho dos Dias */}
      <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex">
          {/* Espaço para coluna de horas */}
          <div className="w-11 sm:w-14 lg:w-16 flex-shrink-0" />

          {/* Dias */}
          {diasExibidos.map((dia, idx) => {
            const ehHoje = isToday(dia)
            const agDia = agendamentosPorDia[format(dia, 'yyyy-MM-dd')] || []

            return (
              <div
                key={idx}
                className={`flex-1 min-w-0 py-1.5 sm:py-2 px-0.5 sm:px-1 text-center border-l border-zinc-200 dark:border-zinc-800 first:border-l-0 ${
                  ehHoje ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className={`text-[9px] sm:text-[10px] lg:text-xs font-medium uppercase ${
                  ehHoje ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500'
                }`}>
                  {format(dia, 'EEE', { locale: ptBR })}
                </div>
                <div className={`text-base sm:text-lg lg:text-xl font-bold mt-0.5 ${
                  ehHoje
                    ? 'w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 mx-auto rounded-full bg-blue-600 text-white flex items-center justify-center text-sm sm:text-base lg:text-lg'
                    : 'text-zinc-900 dark:text-white'
                }`}>
                  {format(dia, 'd')}
                </div>
                {agDia.length > 0 && (
                  <div className="text-[8px] sm:text-[10px] text-zinc-500 mt-0.5">
                    {agDia.length} agend.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid de Horários */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Coluna de Horas */}
          <div className="w-11 sm:w-14 lg:w-16 flex-shrink-0 bg-zinc-50 dark:bg-zinc-900/30">
            {HORAS_DIA.map(hora => (
              <div
                key={hora}
                className="relative border-b border-zinc-100 dark:border-zinc-800/50"
                style={{ height: `${alturaHora}px` }}
              >
                <span className="absolute -top-2 right-1 sm:right-2 text-[9px] sm:text-[10px] lg:text-xs text-zinc-400 font-medium">
                  {String(hora).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Colunas dos Dias */}
          {diasExibidos.map((dia, diaIdx) => {
            const dataKey = format(dia, 'yyyy-MM-dd')
            const agDia = agendamentosPorDia[dataKey] || []
            const ehHoje = isToday(dia)

            return (
              <div
                key={diaIdx}
                className={`flex-1 min-w-0 relative border-l border-zinc-100 dark:border-zinc-800/50 first:border-l-0 ${
                  ehHoje ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''
                }`}
              >
                {/* Linhas de hora (clicáveis) */}
                {HORAS_DIA.map(hora => (
                  <div
                    key={hora}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    style={{ height: `${alturaHora}px` }}
                    onClick={() => onSlotClick?.(dia, hora)}
                  />
                ))}

                {/* Linha do horário atual */}
                {ehHoje && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{
                      top: `${((new Date().getHours() - 7) * alturaHora) + ((new Date().getMinutes() / 60) * alturaHora)}px`
                    }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 -ml-1 shadow-sm" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  </motion.div>
                )}

                {/* Agendamentos */}
                <div className="absolute inset-0 px-px sm:px-0.5">
                  {agDia.map(ag => {
                    const { top, height } = calcularPosicao(ag.data_hora, ag.servicos?.duracao || 30)
                    const status = STATUS_CORES[ag.status as keyof typeof STATUS_CORES] || STATUS_CORES.pendente
                    const dataBrasilia = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA)

                    return (
                      <motion.div
                        key={ag.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAgendamentoClick(ag)
                        }}
                        className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 ${status.bg} rounded cursor-pointer overflow-hidden shadow-sm hover:shadow-md hover:brightness-110 transition-all border-l-2 ${status.border}`}
                        style={{ top: `${top}px`, height: `${height}px`, minHeight: '32px' }}
                      >
                        <div className="p-0.5 sm:p-1 lg:p-1.5 h-full flex flex-col text-white">
                          <div className="text-[9px] sm:text-[10px] lg:text-xs font-semibold opacity-90">
                            {format(dataBrasilia, 'HH:mm')}
                          </div>
                          <div className="text-[9px] sm:text-[10px] lg:text-xs font-medium truncate">
                            {ag.clientes?.nome}
                          </div>
                          {height > 50 && (
                            <div className="text-[8px] sm:text-[9px] lg:text-[10px] opacity-75 truncate">
                              {ag.servicos?.nome}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
