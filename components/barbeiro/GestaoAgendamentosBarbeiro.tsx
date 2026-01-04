'use client'

import { useState } from 'react'
import { Calendar, List } from 'lucide-react'
import { CalendarioSemanalBarbeiro } from './CalendarioSemanalBarbeiro'
import { ListaAgendamentosBarbeiro } from './ListaAgendamentosBarbeiro'

type TipoVisualizacao = 'calendario' | 'lista'

/**
 * Componente de gestão de agendamentos para o barbeiro
 * Permite alternar entre visualização de calendário e lista
 */
export function GestaoAgendamentosBarbeiro() {
  const [visualizacao, setVisualizacao] = useState<TipoVisualizacao>('calendario')

  return (
    <div className="h-full flex flex-col">
      {/* Seletor de Visualização */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
          <button
            onClick={() => setVisualizacao('calendario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              visualizacao === 'calendario'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Calendário
          </button>
          <button
            onClick={() => setVisualizacao('lista')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              visualizacao === 'lista'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-h-0">
        {visualizacao === 'calendario' ? (
          <div className="h-[calc(100vh-220px)] bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <CalendarioSemanalBarbeiro />
          </div>
        ) : (
          <ListaAgendamentosBarbeiro />
        )}
      </div>
    </div>
  )
}
