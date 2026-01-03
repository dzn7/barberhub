"use client";

import { Moon, Sun } from "lucide-react";
import { useTema } from "@/contexts/TemaContext";
import { motion } from "framer-motion";

/**
 * Componente de alternância de tema
 * Permite ao usuário alternar entre modo claro e escuro
 * Utiliza animações suaves com Framer Motion
 */
export function AlternadorTema() {
  const { tema, alternarTema } = useTema();

  return (
    <motion.button
      onClick={alternarTema}
      className="relative h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Alternar tema"
    >
      <motion.div
        initial={false}
        animate={{
          rotate: tema === "dark" ? 180 : 0,
          scale: tema === "dark" ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Moon className="h-5 w-5 text-zinc-800 dark:text-zinc-200" />
      </motion.div>
      
      <motion.div
        initial={false}
        animate={{
          rotate: tema === "light" ? 0 : -180,
          scale: tema === "light" ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Sun className="h-5 w-5 text-zinc-800 dark:text-zinc-200" />
      </motion.div>
    </motion.button>
  );
}
