'use client'

import { TrendingUp, Clock, Shield, Zap, Users, BarChart3 } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const beneficios = [
  {
    icone: TrendingUp,
    titulo: 'Menos Faltas',
    descricao: 'Lembrete automático no WhatsApp reduz faltas drasticamente. Cliente lembra, você não perde dinheiro.',
    metrica: '-40%',
    metricaLabel: 'de faltas',
  },
  {
    icone: Clock,
    titulo: 'Mais Tempo',
    descricao: 'Para de perder tempo anotando em caderno ou respondendo WhatsApp. O sistema faz isso por você.',
    metrica: '10h+',
    metricaLabel: 'por semana',
  },
  {
    icone: Shield,
    titulo: 'Seus Dados Seguros',
    descricao: 'Tudo salvo na nuvem com backup automático. Não perde nada se o celular quebrar.',
    metrica: '100%',
    metricaLabel: 'na nuvem',
  },
  {
    icone: Zap,
    titulo: 'Começa em 5 Minutos',
    descricao: 'Cria a conta, cadastra os serviços e já pode usar. Sem treinamento, sem complicação.',
    metrica: '5min',
    metricaLabel: 'para começar',
  },
  {
    icone: Users,
    titulo: 'Cliente Volta',
    descricao: 'Experiência profissional que impressiona. Cliente satisfeito indica pra todo mundo.',
    metrica: '98%',
    metricaLabel: 'aprovação',
  },
  {
    icone: BarChart3,
    titulo: 'Sabe Quanto Ganha',
    descricao: 'Relatórios claros mostram quanto entrou, quanto saiu e quanto cada barbeiro faturou.',
    metrica: '24/7',
    metricaLabel: 'atualizado',
  },
]

export function SecaoBeneficios() {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="beneficios" ref={ref} className="relative py-20 md:py-28 bg-zinc-950 text-white overflow-hidden">
      {/* Gradiente de fundo sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <p className="text-sm font-medium tracking-widest text-zinc-500 uppercase">
            Por que usar
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
            Resultados que você vai sentir no bolso
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Não é só organização. É mais cliente, menos dor de cabeça e mais dinheiro no final do mês.
          </p>
        </motion.div>

        <div className="mt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {beneficios.map((beneficio, indice) => {
                const Icone = beneficio.icone
                return (
                  <div 
                    key={beneficio.titulo} 
                    className={`relative p-6 sm:p-8 ${
                      indice < 3 ? 'border-b border-zinc-800' : ''
                    } ${
                      indice % 3 !== 2 ? 'lg:border-r lg:border-zinc-800' : ''
                    } ${
                      indice % 2 === 0 ? 'md:border-r md:border-zinc-800 lg:border-r-0' : ''
                    } ${
                      indice < 4 ? 'md:border-b md:border-zinc-800' : ''
                    } lg:border-b-0 ${
                      indice < 3 ? 'lg:border-b lg:border-zinc-800' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                          <Icone className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-semibold text-white">{beneficio.titulo}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-white">{beneficio.metrica}</div>
                        <div className="text-xs text-zinc-500">{beneficio.metricaLabel}</div>
                      </div>
                    </div>
                    <p className="mt-4 text-zinc-400 leading-relaxed">
                      {beneficio.descricao}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
