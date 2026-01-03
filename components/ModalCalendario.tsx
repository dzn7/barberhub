"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, isAfter, startOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@radix-ui/themes";

interface ModalCalendarioProps {
  aberto: boolean;
  onFechar: () => void;
  dataSelecionada: string | null;
  onSelecionarData: (data: string) => void;
}

export function ModalCalendario({
  aberto,
  onFechar,
  dataSelecionada,
  onSelecionarData,
}: ModalCalendarioProps) {
  const [mesAtual, setMesAtual] = useState(new Date());

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(mesAtual),
    end: endOfMonth(mesAtual),
  });

  // Calcular dias em branco no início (para alinhar com dia da semana)
  const primeiroDia = startOfMonth(mesAtual).getDay();
  const diasVazios = Array.from({ length: primeiroDia }, (_, i) => i);

  const mesAnterior = () => setMesAtual(subMonths(mesAtual, 1));
  const proximoMes = () => setMesAtual(addMonths(mesAtual, 1));

  const selecionarData = (data: Date) => {
    const hoje = startOfDay(new Date());
    const dataLimite = addDays(hoje, 15);
    
    // Não permitir datas passadas ou após 15 dias
    if (isBefore(data, hoje) || isAfter(data, dataLimite)) return;

    const dataFormatada = format(data, "yyyy-MM-dd");
    onSelecionarData(dataFormatada);
    onFechar();
  };

  const isDiaPassado = (data: Date) => {
    const hoje = startOfDay(new Date());
    return isBefore(data, hoje);
  };

  const isDiaForaDoLimite = (data: Date) => {
    const hoje = startOfDay(new Date());
    const dataLimite = addDays(hoje, 15);
    return isAfter(data, dataLimite);
  };

  if (!aberto) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
              Escolha a Data
            </h3>
            <button
              onClick={onFechar}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {/* Navegação do Mês */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={mesAnterior}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-900 dark:text-white" />
            </button>
            
            <h4 className="text-lg font-semibold text-zinc-900 dark:text-white capitalize">
              {format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
            </h4>
            
            <button
              onClick={proximoMes}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-zinc-900 dark:text-white" />
            </button>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dia) => (
              <div
                key={dia}
                className="text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 py-2"
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Grid de Dias */}
          <div className="grid grid-cols-7 gap-2">
            {/* Dias vazios no início */}
            {diasVazios.map((_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {/* Dias do mês */}
            {diasDoMes.map((dia) => {
              const dataFormatada = format(dia, "yyyy-MM-dd");
              const selecionado = dataSelecionada === dataFormatada;
              const hoje = isToday(dia);
              const passado = isDiaPassado(dia);
              const foraDoLimite = isDiaForaDoLimite(dia);
              const desabilitado = passado || foraDoLimite;
              const mesCorrente = isSameMonth(dia, mesAtual);

              return (
                <motion.button
                  key={dia.toString()}
                  whileHover={!desabilitado ? { scale: 1.1 } : {}}
                  whileTap={!desabilitado ? { scale: 0.95 } : {}}
                  onClick={() => !desabilitado && selecionarData(dia)}
                  disabled={desabilitado}
                  className={`
                    aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                    ${!mesCorrente ? "text-zinc-300 dark:text-zinc-700" : ""}
                    ${desabilitado ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed opacity-50" : ""}
                    ${
                      selecionado
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold shadow-lg"
                        : hoje
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 font-semibold"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white"
                    }
                  `}
                >
                  {format(dia, "d")}
                </motion.button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Hoje</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-zinc-900 dark:bg-white" />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Selecionado</span>
            </div>
          </div>

          {/* Atalhos */}
          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => {
                const hoje = new Date();
                selecionarData(hoje);
              }}
              variant="outline"
              className="flex-1 cursor-pointer text-sm"
            >
              Hoje
            </Button>
            <Button
              onClick={() => {
                const amanha = new Date();
                amanha.setDate(amanha.getDate() + 1);
                selecionarData(amanha);
              }}
              variant="outline"
              className="flex-1 cursor-pointer text-sm"
            >
              Amanhã
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
