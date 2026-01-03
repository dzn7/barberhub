"use client";

import { useState } from "react";
import { CalendarioAgendamentos } from "./CalendarioAgendamentos";
import { CalendarioSemanal } from "./CalendarioSemanal";
import { Calendar, List } from "lucide-react";

/**
 * Componente de Gestão de Agendamentos
 * Visualização em calendário estilo Google Calendar ou Grade Semanal
 */
export function GestaoAgendamentos() {
  const [visualizacao, setVisualizacao] = useState<'lista' | 'semanal'>('lista');

  return (
    <div className="space-y-4">
      {/* Toggle de Visualização */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setVisualizacao('lista')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            visualizacao === 'lista'
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          <List className="w-4 h-4" />
          Lista
        </button>
        <button
          onClick={() => setVisualizacao('semanal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            visualizacao === 'semanal'
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Grade Semanal
        </button>
      </div>

      {/* Renderizar visualização selecionada */}
      {visualizacao === 'lista' ? <CalendarioAgendamentos /> : <CalendarioSemanal />}
    </div>
  );
}
