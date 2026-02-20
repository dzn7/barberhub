"use client";

import { useState } from "react";
import { CalendarioAgendamentos } from "./CalendarioAgendamentos";
import { CalendarioSemanalNovo } from "./CalendarioSemanalNovo";
import { CalendarioAppBarberNovo } from "./CalendarioAppBarberNovo";
import { List, LayoutGrid, CalendarDays } from "lucide-react";

export function GestaoAgendamentos() {
  const [visualizacao, setVisualizacao] = useState<'lista' | 'agenda' | 'calendario'>('calendario');

  return (
    <div className="space-y-4">
      {/* Toggle de Visualização */}
      <div className="flex items-center justify-end">
        <div className="hidden items-center gap-1 rounded-xl border border-border bg-muted/60 p-1 sm:flex">
          <button
            onClick={() => setVisualizacao('lista')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              visualizacao === 'lista'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Lista</span>
          </button>
          <button
            onClick={() => setVisualizacao('agenda')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              visualizacao === 'agenda'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Agenda</span>
          </button>
          <button
            onClick={() => setVisualizacao('calendario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              visualizacao === 'calendario'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
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
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
          >
            <option value="calendario">Calendário (Google)</option>
            <option value="agenda">Agenda (Timeline)</option>
            <option value="lista">Lista</option>
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
