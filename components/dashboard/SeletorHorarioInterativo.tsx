"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format, addMinutes } from "date-fns";

interface SeletorHorarioInterativoProps {
  horarioInicio: string;
  horarioFim: string;
  onInicioChange: (horario: string) => void;
  onFimChange: (horario: string) => void;
  intervalo?: number;
  minHorario?: string;
  maxHorario?: string;
}

export function SeletorHorarioInterativo({
  horarioInicio,
  horarioFim,
  onInicioChange,
  onFimChange,
  intervalo = 15,
  minHorario = "00:00",
  maxHorario = "23:59"
}: SeletorHorarioInterativoProps) {
  const [expandedInicio, setExpandedInicio] = useState(false);
  const [expandedFim, setExpandedFim] = useState(false);

  const horariosDisponiveis = useMemo(() => {
    const horarios: string[] = [];
    const [minH, minM] = minHorario.split(':').map(Number);
    const [maxH, maxM] = maxHorario.split(':').map(Number);
    
    const inicio = new Date();
    inicio.setHours(minH, minM, 0, 0);
    
    const fim = new Date();
    fim.setHours(maxH, maxM, 0, 0);
    
    let atual = inicio;
    while (atual <= fim) {
      horarios.push(format(atual, 'HH:mm'));
      atual = addMinutes(atual, intervalo);
    }
    
    return horarios;
  }, [intervalo, minHorario, maxHorario]);

  const incrementarHorario = (horario: string, incremento: number) => {
    const [h, m] = horario.split(':').map(Number);
    const data = new Date();
    data.setHours(h, m + incremento, 0, 0);
    
    const novoHorario = format(data, 'HH:mm');
    const [novoH, novoM] = novoHorario.split(':').map(Number);
    const [minH, minM] = minHorario.split(':').map(Number);
    const [maxH, maxM] = maxHorario.split(':').map(Number);
    
    if (novoH < minH || (novoH === minH && novoM < minM)) return minHorario;
    if (novoH > maxH || (novoH === maxH && novoM > maxM)) return maxHorario;
    
    return novoHorario;
  };

  return (
    <div className="space-y-4">
      {/* Início */}
      <div className="relative">
        <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-600" />
          Horário de Início
        </label>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="flex items-center">
            <button
              onClick={() => onInicioChange(incrementarHorario(horarioInicio, -intervalo))}
              className="px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-white"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setExpandedInicio(!expandedInicio)}
              className="flex-1 px-4 py-3 text-center text-lg font-bold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {horarioInicio}
            </button>
            
            <button
              onClick={() => onInicioChange(incrementarHorario(horarioInicio, intervalo))}
              className="px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          {expandedInicio && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-zinc-200 dark:border-zinc-700 max-h-48 overflow-y-auto"
            >
              <div className="grid grid-cols-4 gap-1 p-2">
                {horariosDisponiveis.map((horario) => {
                  const selecionado = horario === horarioInicio;
                  const [h, m] = horario.split(':').map(Number);
                  const [fimH, fimM] = horarioFim.split(':').map(Number);
                  const desabilitado = h > fimH || (h === fimH && m >= fimM);
                  
                  return (
                    <button
                      key={horario}
                      onClick={() => {
                        if (!desabilitado) {
                          onInicioChange(horario);
                          setExpandedInicio(false);
                        }
                      }}
                      disabled={desabilitado}
                      className={`
                        py-2 px-3 rounded text-sm font-medium transition-all
                        ${selecionado
                          ? 'bg-green-600 text-white'
                          : desabilitado
                          ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-40'
                          : 'text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }
                      `}
                    >
                      {horario}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Fim */}
      <div className="relative">
        <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-600" />
          Horário de Fim
        </label>
        
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="flex items-center">
            <button
              onClick={() => onFimChange(incrementarHorario(horarioFim, -intervalo))}
              className="px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-white"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setExpandedFim(!expandedFim)}
              className="flex-1 px-4 py-3 text-center text-lg font-bold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {horarioFim}
            </button>
            
            <button
              onClick={() => onFimChange(incrementarHorario(horarioFim, intervalo))}
              className="px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          {expandedFim && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-zinc-200 dark:border-zinc-700 max-h-48 overflow-y-auto"
            >
              <div className="grid grid-cols-4 gap-1 p-2">
                {horariosDisponiveis.map((horario) => {
                  const selecionado = horario === horarioFim;
                  const [h, m] = horario.split(':').map(Number);
                  const [inicioH, inicioM] = horarioInicio.split(':').map(Number);
                  const desabilitado = h < inicioH || (h === inicioH && m <= inicioM);
                  
                  return (
                    <button
                      key={horario}
                      onClick={() => {
                        if (!desabilitado) {
                          onFimChange(horario);
                          setExpandedFim(false);
                        }
                      }}
                      disabled={desabilitado}
                      className={`
                        py-2 px-3 rounded text-sm font-medium transition-all
                        ${selecionado
                          ? 'bg-green-600 text-white'
                          : desabilitado
                          ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-40'
                          : 'text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }
                      `}
                    >
                      {horario}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Preview do intervalo */}
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Duração:</span>
          <span className="text-zinc-900 dark:text-white font-semibold">
            {(() => {
              const [inicioH, inicioM] = horarioInicio.split(':').map(Number);
              const [fimH, fimM] = horarioFim.split(':').map(Number);
              const inicioMinutos = inicioH * 60 + inicioM;
              const fimMinutos = fimH * 60 + fimM;
              const duracao = fimMinutos - inicioMinutos;
              const horas = Math.floor(duracao / 60);
              const minutos = duracao % 60;
              return horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
