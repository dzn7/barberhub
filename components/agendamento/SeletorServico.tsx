'use client'

import { motion } from 'framer-motion'
import { Scissors, Clock, Check } from 'lucide-react'
import { Servico } from '@/lib/tipos'

interface SeletorServicoProps {
  servicos: Servico[]
  servicoSelecionado: string
  onSelecionar: (servicoId: string) => void
  corDestaque?: string
}

export function SeletorServico({ 
  servicos, 
  servicoSelecionado, 
  onSelecionar,
  corDestaque = '#f59e0b'
}: SeletorServicoProps) {
  // Agrupar serviços por categoria
  const servicosPorCategoria = servicos.reduce((acc, servico) => {
    const categoria = servico.categoria || 'geral'
    if (!acc[categoria]) acc[categoria] = []
    acc[categoria].push(servico)
    return acc
  }, {} as Record<string, Servico[]>)

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco)
  }

  return (
    <div className="space-y-6">
      {Object.entries(servicosPorCategoria).map(([categoria, servicosCategoria]) => (
        <div key={categoria}>
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            {categoria === 'popular' ? 'Mais Populares' : 
             categoria === 'adicional' ? 'Serviços Adicionais' : 
             categoria === 'geral' ? 'Serviços' : categoria}
          </h3>
          
          <div className="grid gap-3">
            {servicosCategoria.map((servico) => {
              const selecionado = servicoSelecionado === servico.id
              
              return (
                <motion.button
                  key={servico.id}
                  onClick={() => onSelecionar(servico.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`
                    relative w-full p-4 rounded-xl border-2 text-left transition-all
                    ${selecionado 
                      ? 'border-current bg-current/10' 
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                    }
                  `}
                  style={selecionado ? { borderColor: corDestaque, backgroundColor: `${corDestaque}15` } : {}}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-zinc-400" />
                        <span className="font-semibold text-white">{servico.nome}</span>
                      </div>
                      
                      {servico.descricao && (
                        <p className="text-sm text-zinc-400 mt-1">{servico.descricao}</p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-sm text-zinc-400">
                          <Clock className="w-3 h-3" />
                          {servico.duracao} min
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span 
                        className="text-lg font-bold"
                        style={{ color: corDestaque }}
                      >
                        {formatarPreco(servico.preco)}
                      </span>
                      
                      {selecionado && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: corDestaque }}
                        >
                          <Check className="w-4 h-4 text-black" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
