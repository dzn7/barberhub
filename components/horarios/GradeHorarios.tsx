'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Sun, Sunset, Moon, AlertCircle } from 'lucide-react'

interface HorarioComStatus {
  horario: string
  disponivel: boolean
  motivo?: 'ocupado' | 'almoco' | 'passado' | 'bloqueado' | 'fora_expediente'
}

interface GradeHorariosProps {
  horarios: HorarioComStatus[]
  carregando: boolean
  cores: {
    primaria: string
    secundaria: string
    destaque: string
  }
  onHorarioOcupadoClick?: (horario: string) => void
  dataSelecionada: string | null
}

interface PeriodoHorarios {
  nome: string
  icone: React.ReactNode
  horarios: HorarioComStatus[]
}

function classificarPeriodo(horario: string): 'manha' | 'tarde' | 'noite' {
  const hora = parseInt(horario.split(':')[0])
  if (hora < 12) return 'manha'
  if (hora < 18) return 'tarde'
  return 'noite'
}

export function GradeHorarios({
  horarios,
  carregando,
  cores,
  onHorarioOcupadoClick,
  dataSelecionada
}: GradeHorariosProps) {
  const periodos = useMemo<PeriodoHorarios[]>(() => {
    const manha = horarios.filter(h => classificarPeriodo(h.horario) === 'manha')
    const tarde = horarios.filter(h => classificarPeriodo(h.horario) === 'tarde')
    const noite = horarios.filter(h => classificarPeriodo(h.horario) === 'noite')

    const resultado: PeriodoHorarios[] = []

    if (manha.length > 0) {
      resultado.push({
        nome: 'Manhã',
        icone: <Sun className="w-4 h-4" />,
        horarios: manha
      })
    }

    if (tarde.length > 0) {
      resultado.push({
        nome: 'Tarde',
        icone: <Sunset className="w-4 h-4" />,
        horarios: tarde
      })
    }

    if (noite.length > 0) {
      resultado.push({
        nome: 'Noite',
        icone: <Moon className="w-4 h-4" />,
        horarios: noite
      })
    }

    return resultado
  }, [horarios])

  const estatisticas = useMemo(() => {
    const disponiveis = horarios.filter(h => h.disponivel).length
    const ocupados = horarios.filter(h => !h.disponivel && h.motivo === 'ocupado').length
    const total = horarios.length
    const percentualOcupado = total > 0 ? Math.round((ocupados / total) * 100) : 0

    return { disponiveis, ocupados, total, percentualOcupado }
  }, [horarios])

  if (!dataSelecionada) {
    return (
      <div 
        className="rounded-2xl border p-8 text-center"
        style={{ 
          backgroundColor: cores.destaque + '08',
          borderColor: cores.destaque + '15'
        }}
      >
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: cores.destaque }} />
        <p className="font-medium mb-1" style={{ color: cores.secundaria }}>
          Selecione uma data
        </p>
        <p className="text-sm" style={{ color: cores.destaque }}>
          Escolha um dia no calendário para ver os horários
        </p>
      </div>
    )
  }

  if (carregando) {
    return (
      <div 
        className="rounded-2xl border p-6"
        style={{ 
          backgroundColor: cores.destaque + '08',
          borderColor: cores.destaque + '15'
        }}
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded" style={{ backgroundColor: cores.destaque + '20' }} />
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {Array(10).fill(0).map((_, i) => (
              <div 
                key={i} 
                className="h-10 rounded-lg"
                style={{ backgroundColor: cores.destaque + '15' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (horarios.length === 0) {
    return (
      <div 
        className="rounded-2xl border p-8 text-center"
        style={{ 
          backgroundColor: cores.destaque + '08',
          borderColor: cores.destaque + '15'
        }}
      >
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: cores.destaque }} />
        <p className="font-medium mb-1" style={{ color: cores.secundaria }}>
          Não há expediente neste dia
        </p>
        <p className="text-sm" style={{ color: cores.destaque }}>
          O estabelecimento não funciona nesta data
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas */}
      <div 
        className="rounded-xl border p-4"
        style={{ 
          backgroundColor: cores.destaque + '08',
          borderColor: cores.destaque + '15'
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p 
                className="text-2xl font-bold"
                style={{ color: '#22c55e' }}
              >
                {estatisticas.disponiveis}
              </p>
              <p className="text-xs" style={{ color: cores.destaque }}>
                disponíveis
              </p>
            </div>
            <div className="text-center">
              <p 
                className="text-2xl font-bold"
                style={{ color: '#ef4444' }}
              >
                {estatisticas.ocupados}
              </p>
              <p className="text-xs" style={{ color: cores.destaque }}>
                ocupados
              </p>
            </div>
          </div>
          
          {/* Barra de Ocupação */}
          <div className="flex-1 min-w-[120px] max-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span style={{ color: cores.destaque }}>Ocupação</span>
              <span style={{ color: cores.secundaria }} className="font-medium">
                {estatisticas.percentualOcupado}%
              </span>
            </div>
            <div 
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: cores.destaque + '20' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${estatisticas.percentualOcupado}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: estatisticas.percentualOcupado > 80 
                    ? '#ef4444' 
                    : estatisticas.percentualOcupado > 50 
                      ? '#f59e0b' 
                      : '#22c55e' 
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Períodos */}
      {periodos.map((periodo, periodoIndex) => (
        <motion.div
          key={periodo.nome}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: periodoIndex * 0.1 }}
          className="rounded-2xl border overflow-hidden"
          style={{ 
            backgroundColor: cores.destaque + '08',
            borderColor: cores.destaque + '15'
          }}
        >
          {/* Header do Período */}
          <div 
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: cores.destaque + '15' }}
          >
            <span style={{ color: cores.destaque }}>{periodo.icone}</span>
            <span className="font-medium text-sm" style={{ color: cores.secundaria }}>
              {periodo.nome}
            </span>
            <span className="text-xs ml-auto" style={{ color: cores.destaque }}>
              {periodo.horarios.filter(h => h.disponivel).length} disponíveis
            </span>
          </div>

          {/* Grid de Horários */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 p-3">
            {periodo.horarios.map((item, index) => {
              const ocupado = !item.disponivel && item.motivo === 'ocupado'
              const almoco = item.motivo === 'almoco'
              const passado = item.motivo === 'passado'

              return (
                <motion.button
                  key={item.horario}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => {
                    if (ocupado && onHorarioOcupadoClick) {
                      onHorarioOcupadoClick(item.horario)
                    }
                  }}
                  disabled={!ocupado || !onHorarioOcupadoClick}
                  className={`
                    relative py-2.5 px-2 rounded-lg text-sm font-medium
                    transition-all
                    ${item.disponivel 
                      ? 'cursor-default' 
                      : ocupado && onHorarioOcupadoClick
                        ? 'cursor-pointer hover:scale-105 active:scale-95'
                        : 'cursor-not-allowed'
                    }
                  `}
                  style={{
                    backgroundColor: item.disponivel 
                      ? '#22c55e20'
                      : ocupado
                        ? '#ef444420'
                        : almoco
                          ? '#f59e0b20'
                          : cores.destaque + '10',
                    color: item.disponivel 
                      ? '#22c55e'
                      : ocupado
                        ? '#ef4444'
                        : almoco
                          ? '#f59e0b'
                          : cores.destaque + '60',
                    borderWidth: 1,
                    borderColor: item.disponivel 
                      ? '#22c55e40'
                      : ocupado
                        ? '#ef444440'
                        : almoco
                          ? '#f59e0b40'
                          : cores.destaque + '20'
                  }}
                  title={
                    item.disponivel 
                      ? 'Horário disponível'
                      : ocupado
                        ? 'Clique para entrar na lista de espera'
                        : almoco
                          ? 'Intervalo de almoço'
                          : passado
                            ? 'Horário já passou'
                            : 'Indisponível'
                  }
                >
                  {item.horario}
                  
                  {ocupado && onHorarioOcupadoClick && (
                    <span 
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: '#ef4444' }}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      ))}

      {/* Legenda */}
      <div 
        className="flex flex-wrap items-center justify-center gap-4 text-xs py-2"
        style={{ color: cores.destaque }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e40' }} />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#ef444440' }} />
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b40' }} />
          <span>Almoço</span>
        </div>
      </div>
    </div>
  )
}

export default GradeHorarios
