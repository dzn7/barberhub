"use client";

import { useState } from "react";
import { CalendarioAgendamentos } from "./CalendarioAgendamentos";
import { CalendarioSemanalNovo } from "./CalendarioSemanalNovo";
import { Calendar, List, LayoutGrid } from "lucide-react";

/**
 * Componente de Gestão de Agendamentos
 * Visualização em calendário estilo Google Calendar ou Grade Semanal
 */
export function GestaoAgendamentos() {
  const [visualizacao, setVisualizacao] = useState<'lista' | 'semanal'>('semanal');

  return (
    <div className="space-y-4">
      {/* Toggle de Visualização */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
          Agendamentos
        </h2>
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
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
            <span className="hidden sm:inline">Semana</span>
          </button>
        </div>
      </div>

      {/* Renderizar visualização selecionada */}
      <div className="min-h-[600px]">
        {visualizacao === 'lista' ? <CalendarioAgendamentos /> : <CalendarioSemanalNovo />}
      </div>
    </div>
  );
}
