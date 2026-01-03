"use client";

import { motion } from "framer-motion";
import { Scissors, Mail, Phone, MapPin } from "lucide-react";

/**
 * Componente de rodapé da aplicação
 * Exibe informações de contato e links úteis
 */
export function Rodape() {
  const anoAtual = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-x-hidden w-full">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sobre */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Scissors className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Barbearia BR99
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Excelência em cortes masculinos e cuidados com a barba. 
              Tradição e modernidade em um só lugar.
            </p>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Contato
            </h3>
            <div className="space-y-3">
              <motion.a
                href="tel:+558694156652"
                whileHover={{ x: 5 }}
                className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>(86) 99415-6652</span>
              </motion.a>
              
              <motion.a
                href="mailto:contato@barbearia.com"
                whileHover={{ x: 5 }}
                className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>contato@barbearia.com</span>
              </motion.a>
              
              <motion.div
                whileHover={{ x: 5 }}
                className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400"
              >
                <MapPin className="h-4 w-4" />
                <span>Rua Duque de Caxias, 601 - Xique-Xique, Barras - PI</span>
              </motion.div>
            </div>
          </div>

          {/* Horário de funcionamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Horário de Funcionamento
            </h3>
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Segunda a Sexta:</span>
                <span className="font-medium">08:00 - 19:00</span>
              </div>
              <div className="flex justify-between">
                <span>Sábado:</span>
                <span className="font-medium">08:00 - 19:00</span>
              </div>
              <div className="flex justify-between">
                <span>Domingo:</span>
                <span className="font-medium">Fechado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            © {anoAtual} Barbearia BR99. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
