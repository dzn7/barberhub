'use client'

import {
  Plus, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, CalendarDays, Columns, LayoutGrid
} from 'lucide-react'

type TipoVisualizacao = 'dia' | '3dias' | 'semana'
type TamanhoHora = 'compacto' | 'normal' | 'expandido'

interface CabecalhoCalendarioProps {
  tituloPeriodo: string
  visualizacao: TipoVisualizacao
  tamanhoHora: TamanhoHora
  onHoje: () => void
  onAnterior: () => void
  onProximo: () => void
  onVisualizacaoChange: (v: TipoVisualizacao) => void
  onTamanhoHoraChange: (t: TamanhoHora) => void
  onNovoAgendamento: () => void
}

/**
 * Cabeçalho do calendário com navegação e controles
 * Componente reutilizável para diferentes visualizações
 */
export function CabecalhoCalendario({
  tituloPeriodo,
  visualizacao,
  tamanhoHora,
  onHoje,
  onAnterior,
  onProximo,
  onVisualizacaoChange,
  onTamanhoHoraChange,
  onNovoAgendamento
}: CabecalhoCalendarioProps) {
  return (
    <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        {/* Navegação e Título */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onHoje}
            className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              onClick={onAnterior}
              className="p-1 sm:p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-l-lg transition-colors"
              aria-label="Período anterior"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={onProximo}
              className="p-1 sm:p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-r-lg transition-colors"
              aria-label="Próximo período"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
          <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-zinc-900 dark:text-white capitalize ml-1 sm:ml-2 truncate max-w-[140px] sm:max-w-none">
            {tituloPeriodo}
          </h2>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Seletor de Visualização */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => onVisualizacaoChange('dia')}
              className={`p-1 sm:p-1.5 rounded-md transition-all ${
                visualizacao === 'dia' 
                  ? 'bg-white dark:bg-zinc-700 shadow-sm' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Visualizar dia"
              aria-label="Visualização por dia"
            >
              <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => onVisualizacaoChange('3dias')}
              className={`p-1 sm:p-1.5 rounded-md transition-all ${
                visualizacao === '3dias' 
                  ? 'bg-white dark:bg-zinc-700 shadow-sm' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Visualizar 3 dias"
              aria-label="Visualização de 3 dias"
            >
              <Columns className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => onVisualizacaoChange('semana')}
              className={`p-1 sm:p-1.5 rounded-md transition-all ${
                visualizacao === 'semana' 
                  ? 'bg-white dark:bg-zinc-700 shadow-sm' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Visualizar semana"
              aria-label="Visualização semanal"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {/* Zoom - escondido em telas muito pequenas */}
          <div className="hidden xs:flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => onTamanhoHoraChange('compacto')}
              className={`p-1 sm:p-1.5 rounded-md transition-all ${
                tamanhoHora === 'compacto' 
                  ? 'bg-white dark:bg-zinc-700 shadow-sm' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Visualização compacta"
              aria-label="Zoom compacto"
            >
              <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => onTamanhoHoraChange('expandido')}
              className={`p-1 sm:p-1.5 rounded-md transition-all ${
                tamanhoHora === 'expandido' 
                  ? 'bg-white dark:bg-zinc-700 shadow-sm' 
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Visualização expandida"
              aria-label="Zoom expandido"
            >
              <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {/* Botão Novo */}
          <button
            onClick={onNovoAgendamento}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity font-medium text-xs sm:text-sm"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
