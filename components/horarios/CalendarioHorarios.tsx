'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon 
} from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday, 
  isBefore, 
  startOfDay,
  getDay
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CalendarioHorariosProps {
  dataSelecionada: string | null
  onSelecionarData: (data: string) => void
  diasFuncionamento: string[]
  cores: {
    primaria: string
    secundaria: string
    destaque: string
  }
  diasMaximos?: number
}

const MAPA_DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
const NOMES_DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function CalendarioHorarios({
  dataSelecionada,
  onSelecionarData,
  diasFuncionamento,
  cores,
  diasMaximos = 60
}: CalendarioHorariosProps) {
  const [mesAtual, setMesAtual] = useState(new Date())
  
  const hoje = useMemo(() => startOfDay(new Date()), [])
  const dataLimite = useMemo(() => {
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() + diasMaximos)
    return limite
  }, [hoje, diasMaximos])

  const diasDoMes = useMemo(() => {
    const inicio = startOfMonth(mesAtual)
    const fim = endOfMonth(mesAtual)
    return eachDayOfInterval({ start: inicio, end: fim })
  }, [mesAtual])

  const primeiroDiaSemana = useMemo(() => {
    return getDay(startOfMonth(mesAtual))
  }, [mesAtual])

  const diasVazios = useMemo(() => {
    return Array(primeiroDiaSemana).fill(null)
  }, [primeiroDiaSemana])

  const verificarDiaDisponivel = (data: Date): boolean => {
    if (isBefore(data, hoje)) return false
    if (isBefore(dataLimite, data)) return false
    
    const diaSemanaNum = getDay(data)
    const diaAbreviado = MAPA_DIAS[diaSemanaNum]
    return diasFuncionamento.includes(diaAbreviado)
  }

  const mesAnterior = () => {
    const novoMes = subMonths(mesAtual, 1)
    if (isSameMonth(novoMes, hoje) || novoMes > hoje) {
      setMesAtual(novoMes)
    }
  }

  const proximoMes = () => {
    const novoMes = addMonths(mesAtual, 1)
    if (isBefore(startOfMonth(novoMes), dataLimite)) {
      setMesAtual(novoMes)
    }
  }

  const podeVoltarMes = useMemo(() => {
    const mesAnteriorData = subMonths(mesAtual, 1)
    return isSameMonth(mesAnteriorData, hoje) || mesAnteriorData > hoje || isSameMonth(mesAtual, hoje)
  }, [mesAtual, hoje])

  const podeAvancarMes = useMemo(() => {
    const proximoMesData = addMonths(mesAtual, 1)
    return isBefore(startOfMonth(proximoMesData), dataLimite)
  }, [mesAtual, dataLimite])

  const dataSelecionadaObj = dataSelecionada 
    ? new Date(dataSelecionada + 'T12:00:00') 
    : null

  return (
    <div 
      className="rounded-2xl border overflow-hidden"
      style={{ 
        backgroundColor: cores.destaque + '08',
        borderColor: cores.destaque + '15'
      }}
    >
      {/* Header do Calendário */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: cores.destaque + '15' }}
      >
        <button
          onClick={mesAnterior}
          disabled={!podeVoltarMes || isSameMonth(mesAtual, hoje)}
          className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: cores.destaque + '15',
            color: cores.secundaria
          }}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" style={{ color: cores.destaque }} />
          <span 
            className="font-semibold capitalize"
            style={{ color: cores.secundaria }}
          >
            {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
          </span>
        </div>

        <button
          onClick={proximoMes}
          disabled={!podeAvancarMes}
          className="p-2 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: cores.destaque + '15',
            color: cores.secundaria
          }}
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dias da Semana */}
      <div className="grid grid-cols-7 gap-1 px-2 py-2">
        {NOMES_DIAS.map((dia, index) => (
          <div
            key={dia + index}
            className="text-center text-xs font-medium py-1"
            style={{ color: cores.destaque }}
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Grid de Dias */}
      <div className="grid grid-cols-7 gap-1 px-2 pb-3">
        {diasVazios.map((_, index) => (
          <div key={`vazio-${index}`} className="aspect-square" />
        ))}

        {diasDoMes.map((data) => {
          const dataFormatada = format(data, 'yyyy-MM-dd')
          const disponivel = verificarDiaDisponivel(data)
          const selecionado = dataSelecionadaObj && isSameDay(data, dataSelecionadaObj)
          const ehHoje = isToday(data)

          return (
            <motion.button
              key={dataFormatada}
              onClick={() => disponivel && onSelecionarData(dataFormatada)}
              disabled={!disponivel}
              whileHover={disponivel ? { scale: 1.1 } : {}}
              whileTap={disponivel ? { scale: 0.95 } : {}}
              className={`
                aspect-square rounded-xl flex items-center justify-center text-sm font-medium
                transition-all relative
                ${disponivel ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}
              `}
              style={{
                backgroundColor: selecionado 
                  ? cores.secundaria 
                  : ehHoje 
                    ? cores.destaque + '30'
                    : 'transparent',
                color: selecionado 
                  ? cores.primaria 
                  : disponivel 
                    ? cores.secundaria 
                    : cores.destaque
              }}
            >
              {format(data, 'd')}
              
              {ehHoje && !selecionado && (
                <span 
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: cores.secundaria }}
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Legenda */}
      <div 
        className="flex items-center justify-center gap-4 px-4 py-2 border-t text-xs"
        style={{ borderColor: cores.destaque + '15' }}
      >
        <div className="flex items-center gap-1.5">
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: cores.secundaria }}
          />
          <span style={{ color: cores.destaque }}>Hoje</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded"
            style={{ backgroundColor: cores.secundaria }}
          />
          <span style={{ color: cores.destaque }}>Selecionado</span>
        </div>
      </div>
    </div>
  )
}

export default CalendarioHorarios
