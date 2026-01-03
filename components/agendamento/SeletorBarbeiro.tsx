'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { User, Star, Check } from 'lucide-react'
import { Barbeiro } from '@/lib/tipos'

interface SeletorBarbeiroProps {
  barbeiros: Barbeiro[]
  barbeiroSelecionado: string
  onSelecionar: (barbeiroId: string) => void
  corDestaque?: string
}

export function SeletorBarbeiro({
  barbeiros,
  barbeiroSelecionado,
  onSelecionar,
  corDestaque = '#f59e0b'
}: SeletorBarbeiroProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {barbeiros.map((barbeiro) => {
        const selecionado = barbeiroSelecionado === barbeiro.id

        return (
          <motion.button
            key={barbeiro.id}
            onClick={() => onSelecionar(barbeiro.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-all
              ${selecionado
                ? 'border-current bg-current/10'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
              }
            `}
            style={selecionado ? { borderColor: corDestaque, backgroundColor: `${corDestaque}15` } : {}}
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-700 flex-shrink-0">
                {barbeiro.foto_url ? (
                  <Image
                    src={barbeiro.foto_url}
                    alt={barbeiro.nome}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-8 h-8 text-zinc-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{barbeiro.nome}</h3>

                {barbeiro.especialidades && barbeiro.especialidades.length > 0 && (
                  <p className="text-sm text-zinc-400 truncate">
                    {barbeiro.especialidades.slice(0, 3).join(', ')}
                  </p>
                )}

                {barbeiro.avaliacao_media > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span className="text-sm text-zinc-300">
                      {barbeiro.avaliacao_media.toFixed(1)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ({barbeiro.total_atendimentos} atendimentos)
                    </span>
                  </div>
                )}
              </div>

              {/* Check */}
              {selecionado && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: corDestaque }}
                >
                  <Check className="w-4 h-4 text-black" />
                </motion.div>
              )}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
