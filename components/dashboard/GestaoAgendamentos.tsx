"use client";

import { useState } from "react";
import { CalendarioAgendamentos } from "./CalendarioAgendamentos";
import { CalendarioSemanalNovo } from "./CalendarioSemanalNovo";
import { CalendarioAppBarberNovo } from "./CalendarioAppBarberNovo";
import { List, LayoutGrid, CalendarDays } from "lucide-react";

/**
 * Componente de Gestão de Agendamentos
 * Visualização em calendário estilo Google Calendar ou Grade Semanal
 */
export function GestaoAgendamentos() {
  const [visualizacao, setVisualizacao] = useState<'lista' | 'agenda' | 'calendario'>('calendario');

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
            onClick={() => setVisualizacao('agenda')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              visualizacao === 'agenda'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Agenda</span>
          </button>
          <button
            onClick={() => setVisualizacao('calendario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              visualizacao === 'calendario'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Calendário</span>
          </button>
        </div>

        <div className="sm:hidden">
          <select
            value={visualizacao}
            onChange={(e) => setVisualizacao(e.target.value as 'lista' | 'agenda' | 'calendario')}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          >
            <option value="calendario">Calendário (Novo)</option>
            <option value="agenda">Agenda</option>
            <option value="lista">Lista (Concluir Todos)</option>
          </select>
        </div>
      </div>

      {/* Renderizar visualização selecionada */}
      <div className="min-h-[600px]">
        {visualizacao === 'lista' && <CalendarioAgendamentos />}
        {visualizacao === 'agenda' && <CalendarioSemanalNovo />}
        {visualizacao === 'calendario' && <CalendarioAppBarberNovo />}
      </div>
    </div>
  );
}
