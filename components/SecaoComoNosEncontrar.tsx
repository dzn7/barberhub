"use client";

import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import { useHorarioFuncionamento } from "@/hooks/useHorarioFuncionamento";

/**
 * Seção Como nos Encontrar
 * Exibe vídeo do YouTube Shorts de forma responsiva e integrada ao design
 */
export function SecaoComoNosEncontrar() {
  const { getHorarioDia, carregando: carregandoHorarios } = useHorarioFuncionamento();
  return (
    <section className="py-20 bg-white dark:bg-black">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Título */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
            Como nos encontrar
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Estamos localizados no coração de Barras, PI. Veja como é fácil chegar até nós!
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Vídeo do YouTube */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            {/* Container responsivo para vídeo 9:16 (formato Shorts) */}
            <div className="relative w-full max-w-sm mx-auto">
              <div className="relative" style={{ paddingBottom: '177.78%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-2xl shadow-2xl border-4 border-zinc-100 dark:border-zinc-800"
                  src="https://www.youtube.com/embed/EFjhuPxm6iQ"
                  title="Como chegar na Barbearia BR99"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  style={{
                    border: 'none',
                  }}
                />
              </div>
              
              {/* Decoração */}
              <div className="absolute -z-10 -inset-4 bg-gradient-to-br from-zinc-900/5 to-zinc-600/5 dark:from-white/5 dark:to-zinc-400/5 rounded-3xl blur-2xl" />
            </div>
          </motion.div>

          {/* Informações de Localização */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Endereço */}
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white dark:text-zinc-900" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                    Nosso Endereço
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Rua Duque de Caxias, 601<br />
                    Xique-Xique, Barras - PI<br />
                    CEP: 64100-000
                  </p>
                </div>
              </div>
            </div>

            {/* Horário de Funcionamento */}
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                Horário de Funcionamento
              </h3>
              {carregandoHorarios ? (
                <div className="text-center py-4 text-zinc-500 dark:text-zinc-400">
                  Carregando horários...
                </div>
              ) : (
                <div className="space-y-2 text-zinc-600 dark:text-zinc-400">
                  <div className="flex justify-between">
                    <span>Segunda a Sexta</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{getHorarioDia('segunda')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sábado</span>
                    <span className={`font-medium ${getHorarioDia('sabado') === 'Fechado' ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
                      {getHorarioDia('sabado')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domingo</span>
                    <span className={`font-medium ${getHorarioDia('domingo') === 'Fechado' ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}>
                      {getHorarioDia('domingo')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Navegação */}
            <a
              href="https://www.google.com/maps/dir//Rua+Duque+de+Caxias,+601+-+Xique-Xique,+Barras+-+PI"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center justify-center w-full px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-semibold overflow-hidden transition-all hover:scale-105 hover:shadow-xl"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Abrir no Google Maps
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-900 dark:from-zinc-100 dark:to-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* Dica */}
            <p className="text-sm text-zinc-500 dark:text-zinc-500 text-center">
              💡 Dica: Assista ao vídeo para ver pontos de referência e facilitar sua chegada
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
