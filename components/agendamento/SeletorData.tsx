'use client'

import { motion } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface DataDisponivel {
  valor: string
  label: string
  diaSemana: string
}

interface SeletorDataProps {
  datas: DataDisponivel[]
  dataSelecionada: string
  onSelecionar: (data: string) => void
  corDestaque?: string
}

export function SeletorData({
  datas,
  dataSelecionada,
  onSelecionar,
  corDestaque = '#f59e0b'
}: SeletorDataProps) {
  const [paginaAtual, setPaginaAtual] = useState(0)
  const itensPorPagina = 7

  const totalPaginas = Math.ceil(datas.length / itensPorPagina)
  const datasVisiveis = datas.slice(
    paginaAtual * itensPorPagina,
    (paginaAtual + 1) * itensPorPagina
  )

  const proximaPagina = () => {
    if (paginaAtual < totalPaginas - 1) {
      setPaginaAtual(paginaAtual + 1)
    }
  }

  const paginaAnterior = () => {
    if (paginaAtual > 0) {
      setPaginaAtual(paginaAtual - 1)
    }
  }

  const formatarDiaSemana = (dia: string) => {
    const mapa: Record<string, string> = {
      'dom': 'Dom',
      'seg': 'Seg',
      'ter': 'Ter',
      'qua': 'Qua',
      'qui': 'Qui',
      'sex': 'Sex',
      'sab': 'Sáb'
    }
    return mapa[dia] || dia
  }

  const extrairDia = (label: string) => {
    const match = label.match(/(\d+)/)
    return match ? match[1] : ''
  }

  const extrairMes = (label: string) => {
    const match = label.match(/de (\w+)/)
    return match ? match[1].substring(0, 3) : ''
  }

  return (
    <div className="space-y-4">
      {/* Navegação */}
      <div className="flex items-center justify-between">
        <button
          onClick={paginaAnterior}
          disabled={paginaAtual === 0}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Calendar className="w-4 h-4" />
          <span>Selecione a data</span>
        </div>

        <button
          onClick={proximaPagina}
          disabled={paginaAtual >= totalPaginas - 1}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Grid de datas */}
      <div className="grid grid-cols-7 gap-2">
        {datasVisiveis.map((data) => {
          const selecionada = dataSelecionada === data.valor
          const dia = extrairDia(data.label)
          const mes = extrairMes(data.label)

          return (
            <motion.button
              key={data.valor}
              onClick={() => onSelecionar(data.valor)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex flex-col items-center p-3 rounded-xl border-2 transition-all
                ${selecionada
                  ? 'border-current'
                  : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                }
              `}
              style={selecionada ? { 
                borderColor: corDestaque, 
                backgroundColor: `${corDestaque}15` 
              } : {}}
            >
              <span className="text-xs text-zinc-400 uppercase">
                {formatarDiaSemana(data.diaSemana)}
              </span>
              <span 
                className="text-xl font-bold"
                style={selecionada ? { color: corDestaque } : { color: 'white' }}
              >
                {dia}
              </span>
              <span className="text-xs text-zinc-500 capitalize">{mes}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Indicador de páginas */}
      {totalPaginas > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: totalPaginas }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPaginaAtual(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === paginaAtual ? 'bg-white' : 'bg-zinc-700'
              }`}
              style={i === paginaAtual ? { backgroundColor: corDestaque } : {}}
            />
          ))}
        </div>
      )}
    </div>
  )
}
