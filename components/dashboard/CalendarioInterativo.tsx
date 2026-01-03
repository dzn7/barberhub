"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, isAfter, startOfDay, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarioInterativoProps {
  dataSelecionada: string | null;
  onSelecionarData: (data: string) => void;
  onFechar?: () => void;
  minDate?: Date;
  maxDate?: Date;
  bloqueios?: Array<{ data: string }>;
}

export function CalendarioInterativo({
  dataSelecionada,
  onSelecionarData,
  onFechar,
  minDate,
  maxDate,
  bloqueios = []
}: CalendarioInterativoProps) {
  const [mesAtual, setMesAtual] = useState(new Date());

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(mesAtual),
    end: endOfMonth(mesAtual),
  });

  const primeiroDia = startOfMonth(mesAtual).getDay();
  const diasVazios = Array.from({ length: primeiroDia }, (_, i) => i);

  const mesAnterior = () => setMesAtual(subMonths(mesAtual, 1));
  const proximoMes = () => setMesAtual(addMonths(mesAtual, 1));

  const selecionarData = (data: Date) => {
    const hoje = minDate || startOfDay(new Date());
    const dataLimite = maxDate || addDays(hoje, 365);
    
    if (isBefore(data, hoje) || isAfter(data, dataLimite)) return;

    const dataFormatada = format(data, "yyyy-MM-dd");
    onSelecionarData(dataFormatada);
    if (onFechar) onFechar();
  };

  const isDiaDesabilitado = (data: Date) => {
    const hoje = minDate || startOfDay(new Date());
    const dataLimite = maxDate || addDays(hoje, 365);
    return isBefore(data, hoje) || isAfter(data, dataLimite);
  };

  const temBloqueio = (data: Date) => {
    const dataStr = format(data, "yyyy-MM-dd");
    return bloqueios.some(b => b.data === dataStr);
  };

  const isSelecionado = (data: Date) => {
    if (!dataSelecionada) return false;
    return isSameDay(data, parseISO(`${dataSelecionada}T00:00:00`));
  };

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-4 sm:p-6 border border-zinc-200 dark:border-zinc-700">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={mesAnterior}
          className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-700 dark:text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            {format(mesAtual, "MMMM yyyy", { locale: ptBR })}
          </h3>
        </div>
        
        <button
          onClick={proximoMes}
          className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-zinc-700 dark:text-white" />
        </button>
      </div>

      {/* Dias da Semana */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {diasSemana.map((dia, idx) => (
          <div
            key={idx}
            className="text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 py-2"
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Dias do Mês */}
      <div className="grid grid-cols-7 gap-2">
        {diasVazios.map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square" />
        ))}
        
        {diasDoMes.map((dia) => {
          const desabilitado = isDiaDesabilitado(dia);
          const bloqueado = temBloqueio(dia);
          const selecionado = isSelecionado(dia);
          const hoje = isToday(dia);

          return (
            <motion.button
              key={dia.toISOString()}
              onClick={() => !desabilitado && selecionarData(dia)}
              disabled={desabilitado}
              whileHover={!desabilitado ? { scale: 1.05 } : {}}
              whileTap={!desabilitado ? { scale: 0.95 } : {}}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all relative
                ${desabilitado 
                  ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-40' 
                  : selecionado
                  ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-600/50'
                  : hoje
                  ? 'bg-zinc-200 dark:bg-zinc-700 border-2 border-green-600 text-zinc-900 dark:text-white'
                  : bloqueado
                  ? 'bg-red-500/20 border border-red-500/50 text-red-600 dark:text-red-300 hover:bg-red-500/30'
                  : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                }
              `}
            >
              {format(dia, "d")}
              {bloqueado && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
              {hoje && !selecionado && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-600 border-2 border-green-600/50" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-700 border-2 border-green-600" />
          <span>Hoje</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50" />
          <span>Bloqueado</span>
        </div>
      </div>
    </div>
  );
}
