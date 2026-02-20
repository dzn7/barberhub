"use client";

import { useState } from "react";
import { CalendarioAgendamentos } from "./CalendarioAgendamentos";
import { CalendarioSemanalNovo } from "./CalendarioSemanalNovo";
import { List, LayoutGrid } from "lucide-react";

/**
 * Componente de Gestão de Agendamentos
 * Visualização em calendário estilo Google Calendar ou Grade Semanal
 */
export function GestaoAgendamentos() {
  const [visualizacao, setVisualizacao] = useState<'lista' | 'semanal'>('semanal');

  return (
    <div className="space-y-4">
      {/* Toggle de Visualização */}
      <div className="flex items-center justify-end">
        <div className="hidden items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800 sm:flex">
          <button
            onClick={() => setVisualizacao('lista')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              visualizacao === 'lista'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => setVisualizacao('semanal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              visualizacao === 'semanal'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Semana</span>
          </button>
        </div>

        <div className="sm:hidden">
          <select
            value={visualizacao}
            onChange={(e) => setVisualizacao(e.target.value as 'lista' | 'semanal')}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          >
            <option value="semanal">Semana</option>
            <option value="lista">Lista (Concluir Todos)</option>
          </select>
        </div>
      </div>

      {/* Renderizar visualização selecionada */}
      <div className="min-h-[600px]">
        {visualizacao === 'lista' ? <CalendarioAgendamentos /> : <CalendarioSemanalNovo />}
      </div>
    </div>
  );
}
