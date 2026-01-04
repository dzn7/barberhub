'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

/**
 * Seção de Benefícios - Design Stripe-inspired
 * Apresentação elegante com scroll parallax e métricas destacadas
 */

const metricas = [
  {
    valor: '-40%',
    label: 'menos faltas',
    descricao: 'Lembretes automáticos no WhatsApp garantem que seus clientes não esqueçam do horário.',
  },
  {
    valor: '+10h',
    label: 'por semana',
    descricao: 'Tempo economizado com agendamentos automáticos e gestão simplificada.',
  },
  {
    valor: '98%',
    label: 'aprovação',
    descricao: 'Clientes satisfeitos com a experiência profissional de agendamento.',
  },
]

export function SecaoBeneficios() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  const opacidade = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const escala = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.95])

  return (
    <section 
      id="beneficios" 
      ref={containerRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Fundo com gradiente suave */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-black dark:to-zinc-950" />
      
      {/* Linha decorativa vertical central */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-zinc-200 dark:via-zinc-800 to-transparent hidden lg:block" />

      <motion.div 
        style={{ opacity: opacidade, scale: escala }}
        className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8"
      >
        {/* Cabeçalho da seção */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium tracking-widest text-zinc-500 dark:text-zinc-400 uppercase mb-4"
          >
            Resultados reais
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white leading-tight"
          >
            Números que fazem{' '}
            <span className="relative">
              diferença
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                <path d="M1 5.5C47 2 153 2 199 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-300 dark:text-zinc-700"/>
              </svg>
            </span>
          </motion.h2>
        </div>

        {/* Grid de métricas - Design minimalista */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {metricas.map((metrica, indice) => (
            <motion.div
              key={metrica.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: indice * 0.15 }}
              className="group relative"
            >
              {/* Card com hover elegante */}
              <div className="relative p-8 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-500 hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50">
                {/* Número grande */}
                <div className="mb-6">
                  <span className="text-5xl sm:text-6xl font-bold bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                    {metrica.valor}
                  </span>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wide">
                    {metrica.label}
                  </p>
                </div>

                {/* Descrição */}
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {metrica.descricao}
                </p>

                {/* Linha decorativa no hover */}
                <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Frase de impacto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Mais organização, menos dor de cabeça.{' '}
            <span className="text-zinc-900 dark:text-white font-medium">
              Mais dinheiro no final do mês.
            </span>
          </p>
        </motion.div>
      </motion.div>
    </section>
  )
}
