'use client'

import { Play, BarChart3, Calendar, Wallet } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const funcionalidades = [
  {
    icone: Calendar,
    titulo: 'Agenda Inteligente',
    descricao: 'Visualize todos os agendamentos em uma interface intuitiva',
  },
  {
    icone: BarChart3,
    titulo: 'Relatórios Detalhados',
    descricao: 'Acompanhe métricas e tome decisões baseadas em dados',
  },
  {
    icone: Wallet,
    titulo: 'Gestão Financeira',
    descricao: 'Controle completo de receitas, despesas e comissões',
  },
]

export function SecaoDemonstracao() {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.2 })

  const rolarPara = (id: string) => {
    const elemento = document.getElementById(id)
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section id="demonstracao" ref={ref} className="py-20 md:py-32 bg-white dark:bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Conteúdo textual */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={estaVisivel ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  Veja o Barber Hub em Ação
                </h2>
                <p className="text-lg text-muted-foreground">
                  Interface moderna e intuitiva desenvolvida para facilitar o dia a dia da sua barbearia. 
                  Acesse de qualquer dispositivo e gerencie seu negócio de onde estiver.
                </p>
              </div>

              <div className="space-y-4">
                {funcionalidades.map((funcionalidade, indice) => {
                  const Icone = funcionalidade.icone
                  return (
                    <motion.div
                      key={funcionalidade.titulo}
                      initial={{ opacity: 0, x: -20 }}
                      animate={estaVisivel ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.1 + indice * 0.1 }}
                      className="flex items-start space-x-4 p-4 rounded-lg hover:bg-card transition-colors"
                    >
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Icone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{funcionalidade.titulo}</h3>
                        <p className="text-sm text-muted-foreground">{funcionalidade.descricao}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              <Botao
                onClick={() => rolarPara('contato')}
                tamanho="lg"
                className="w-full sm:w-auto"
              >
                Solicitar Demonstração
              </Botao>
            </motion.div>

            {/* Área de preview/mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={estaVisivel ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border shadow-2xl overflow-hidden">
                {/* Simulação de interface */}
                <div className="absolute inset-0 p-6 space-y-4">
                  {/* Header simulado */}
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-32 bg-foreground/10 rounded animate-pulse" />
                    <div className="flex space-x-2">
                      <div className="h-8 w-8 bg-foreground/10 rounded animate-pulse" />
                      <div className="h-8 w-8 bg-foreground/10 rounded animate-pulse" />
                    </div>
                  </div>

                  {/* Cards simulados */}
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-foreground/10 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>

                  {/* Gráfico simulado */}
                  <div className="h-32 bg-foreground/10 rounded-lg animate-pulse" style={{ animationDelay: '0.4s' }} />

                  {/* Lista simulada */}
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-foreground/10 rounded animate-pulse" style={{ animationDelay: `${0.5 + i * 0.1}s` }} />
                    ))}
                  </div>
                </div>

                {/* Overlay com ícone de play */}
                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] hover:bg-background/10 transition-colors cursor-pointer group">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Elementos decorativos */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
