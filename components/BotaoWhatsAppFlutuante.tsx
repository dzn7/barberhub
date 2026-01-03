"use client";

import { motion } from "framer-motion";
import { WhatsAppIcon } from "./WhatsAppIcon";

/**
 * Botão Flutuante de WhatsApp
 * Fixo no canto inferior direito
 */
export function BotaoWhatsAppFlutuante() {
  const numeroWhatsApp = "558694156652"; 

  return (
    <motion.a
      href={`https://wa.me/${numeroWhatsApp}?text=Olá! Gostaria de agendar um horário.`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl cursor-pointer group"
      title="Fale conosco no WhatsApp"
    >
      <WhatsAppIcon size={32} />
      
      {/* Tooltip */}
      <span className="absolute right-full mr-3 px-3 py-2 bg-zinc-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Fale conosco
      </span>

      {/* Animação de pulso */}
      <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20" />
    </motion.a>
  );
}
