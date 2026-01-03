'use client'

import { motion } from 'framer-motion'
import { Clock, Check } from 'lucide-react'
import { HorarioComStatus } from '@/lib/horarios'

interface SeletorHorarioProps {
  horarios: HorarioComStatus[]
  horarioSelecionado: string
  onSelecionar: (horario: string) => void
  corDestaque?: string
}

export function SeletorHorario({
  horarios,
  horarioSelecionado,
  onSelecionar,
  corDestaque = '#f59e0b'
}: SeletorHorarioProps) {
  const horariosDisponiveis = horarios.filter(h => h.disponivel)
  const horariosIndisponiveis = horarios.filter(h => !h.disponivel)

  if (horarios.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400">Selecione uma data para ver os horários disponíveis</p>
      </div>
    )
  }

  if (horariosDisponiveis.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400">Nenhum horário disponível para esta data</p>
        <p className="text-sm text-zinc-500 mt-2">Tente selecionar outra data</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Clock className="w-4 h-4" />
        <span>{horariosDisponiveis.length} horários disponíveis</span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {horarios.map((horario) => {
          const selecionado = horarioSelecionado === horario.horario
          const disponivel = horario.disponivel

          return (
            <motion.button
              key={horario.horario}
              onClick={() => disponivel && onSelecionar(horario.horario)}
              disabled={!disponivel}
              whileHover={disponivel ? { scale: 1.05 } : {}}
              whileTap={disponivel ? { scale: 0.95 } : {}}
              className={`
                relative py-3 px-2 rounded-lg border-2 text-center transition-all
                ${!disponivel 
                  ? 'border-zinc-800 bg-zinc-800/30 text-zinc-600 cursor-not-allowed line-through'
                  : selecionado
                    ? 'border-current'
                    : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50 text-white'
                }
              `}
              style={selecionado && disponivel ? { 
                borderColor: corDestaque, 
                backgroundColor: `${corDestaque}15`,
                color: corDestaque
              } : {}}
            >
              <span className="font-medium">{horario.horario}</span>
              
              {selecionado && disponivel && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: corDestaque }}
                >
                  <Check className="w-3 h-3 text-black" />
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
