"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface CardMetricaProps {
  titulo: string;
  valor: string;
  icone: LucideIcon;
  tendencia?: {
    valor: number;
    positiva: boolean;
  };
  cor?: string;
}

/**
 * Card de métrica para o dashboard
 * Exibe valores importantes com ícone e tendência
 */
export function CardMetrica({ titulo, valor, icone: Icone, tendencia, cor = "zinc" }: CardMetricaProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-${cor}-100 dark:bg-${cor}-900/20`}>
          <Icone className={`w-6 h-6 text-${cor}-600 dark:text-${cor}-400`} />
        </div>
        {tendencia && (
          <div className={`text-sm font-medium ${tendencia.positiva ? 'text-green-600' : 'text-red-600'}`}>
            {tendencia.positiva ? '+' : ''}{tendencia.valor}%
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{titulo}</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-white">{valor}</p>
      </div>
    </motion.div>
  );
}
