"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { obterClassesCor, CorTailwind } from "@/lib/tailwind-cores";

interface CardMetricaProps {
  titulo: string;
  valor: string;
  icone: LucideIcon;
  tendencia?: {
    valor: number;
    positiva: boolean;
  };
  cor?: CorTailwind;
}

/**
 * Card de métrica para o dashboard
 * Exibe valores importantes com ícone e tendência
 * 
 * Usa utilitário de cores para garantir compilação correta do Tailwind
 */
export function CardMetrica({ titulo, valor, icone: Icone, tendencia, cor = "zinc" }: CardMetricaProps) {
  const classes = obterClassesCor(cor);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${classes.bg100} dark:${classes.bg900_20}`}>
          <Icone className={`w-6 h-6 ${classes.text600} dark:${classes.text400}`} />
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
