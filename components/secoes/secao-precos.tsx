'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Check, ArrowRight } from 'lucide-react'
import { Botao } from '@/components/ui/botao'

const recursos = [
  'Agendamento online ilimitado',
  'Site próprio da sua barbearia',
  'Lembretes automáticos WhatsApp',
  'Gestão completa de equipe',
  'Controle financeiro',
  'Relatórios e métricas',
  'Suporte por WhatsApp',
  'Atualizações gratuitas',
]

export function SecaoPrecos() {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="precos" ref={ref} className="py-24 md:py-32 bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Cabeçalho */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              Preço único e simples
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Sem planos confusos. Tudo incluído por um valor que cabe no bolso.
            </p>
          </motion.div>

          {/* Card de preço */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="relative bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 md:p-12 overflow-hidden">
              {/* Gradiente decorativo sutil */}
              <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-zinc-100 dark:from-zinc-800/30 to-transparent pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  {/* Lado esquerdo - Preço */}
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">14 dias grátis</span>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white">
                        R$ 39
                      </span>
                      <span className="text-2xl text-zinc-500 dark:text-zinc-400">,90</span>
                      <span className="text-zinc-500 dark:text-zinc-500">/mês</span>
                    </div>
                    
                    <p className="text-zinc-600 dark:text-zinc-400 max-w-sm">
                      Menos que um corte de cabelo. Valor fixo, sem surpresas no final do mês.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <a href="/registrar">
                        <Botao tamanho="xl" className="group w-full sm:w-auto">
                          Começar Teste Grátis
                          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Botao>
                      </a>
                    </div>
                    
                    <p className="text-sm text-zinc-500">
                      Sem cartão de crédito. Cancele quando quiser.
                    </p>
                  </div>

                  {/* Lado direito - Lista de recursos */}
                  <div className="lg:pl-12 lg:border-l lg:border-zinc-200 lg:dark:border-zinc-800">
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                      Tudo incluído
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recursos.map((recurso) => (
                        <li key={recurso} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-5 h-5 bg-zinc-900 dark:bg-white rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white dark:text-zinc-900" />
                          </div>
                          <span className="text-zinc-700 dark:text-zinc-300">{recurso}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Nota de rodapé */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={estaVisivel ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center text-sm text-zinc-500 mt-8"
          >
            Mais de 100 barbearias já usam o BarberHub para organizar o dia a dia.
          </motion.p>
        </div>
      </div>
    </section>
  )
}
