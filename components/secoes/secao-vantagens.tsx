'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Calendar, Smartphone, TrendingUp, Bell, Users, Clock } from 'lucide-react'

const vantagens = [
  {
    icone: Calendar,
    titulo: 'Agenda Online 24h',
    descricao: 'Clientes agendam a qualquer hora, você recebe tudo organizado.',
  },
  {
    icone: Smartphone,
    titulo: 'Site do Seu Negócio',
    descricao: 'Página profissional pronta para compartilhar nas redes sociais.',
  },
  {
    icone: Bell,
    titulo: 'Lembretes Automáticos',
    descricao: 'WhatsApp avisa o cliente antes do horário. Menos faltas.',
  },
  {
    icone: Users,
    titulo: 'Gestão de Equipe',
    descricao: 'Cada profissional com sua agenda. Comissões calculadas sozinhas.',
  },
  {
    icone: TrendingUp,
    titulo: 'Controle Financeiro',
    descricao: 'Saiba quanto entrou e quanto saiu. Sem planilha complicada.',
  },
  {
    icone: Clock,
    titulo: 'Economize Tempo',
    descricao: 'Pare de atender WhatsApp o dia todo. O sistema faz isso por você.',
  },
]

export function SecaoVantagens() {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="vantagens" ref={ref} className="py-24 md:py-32 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Cabeçalho */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              Por que usar o BarberHub?
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Menos trabalho manual. Mais tempo pra fazer o que você faz de melhor.
            </p>
          </motion.div>

          {/* Grid de vantagens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vantagens.map((vantagem, indice) => {
              const Icone = vantagem.icone
              return (
                <motion.div
                  key={vantagem.titulo}
                  initial={{ opacity: 0, y: 20 }}
                  animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: indice * 0.1 }}
                  className="group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center group-hover:bg-zinc-900 dark:group-hover:bg-white transition-colors duration-300">
                      <Icone className="w-6 h-6 text-zinc-700 dark:text-zinc-300 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors duration-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                        {vantagem.titulo}
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {vantagem.descricao}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
