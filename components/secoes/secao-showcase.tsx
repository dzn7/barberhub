'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Iphone } from '@/components/ui/iphone'

/**
 * Dados das funcionalidades do sistema com suas respectivas imagens
 * Cada item representa uma tela do aplicativo que será exibida no mockup
 */
const funcionalidades = [
  {
    id: 'agendamentos',
    titulo: 'Agenda Completa',
    descricao: 'Visualize todos os agendamentos do dia em formato de lista. Métricas em tempo real, busca inteligente e filtros por status.',
    imagem: '/assets/dashboard-lista.png',
  },
  {
    id: 'grade',
    titulo: 'Grade Semanal',
    descricao: 'Visão completa da semana. Filtre por profissional, navegue entre semanas e adicione agendamentos direto na grade.',
    imagem: '/assets/dashboard-gradesemanal.png',
  },
  {
    id: 'servicos',
    titulo: 'Gestão de Serviços',
    descricao: 'Cadastre serviços com preços e duração. Edite em tempo real e organize seu catálogo profissional.',
    imagem: '/assets/dashbaord-servicos.png',
  },
  {
    id: 'horarios',
    titulo: 'Horários Flexíveis',
    descricao: 'Configure expediente, intervalos de almoço e dias de funcionamento. Bloqueio automático fora do horário.',
    imagem: '/assets/dashboard-horarios.png',
  },
  {
    id: 'landing',
    titulo: 'Sua Página Online',
    descricao: 'Site profissional pronto para compartilhar. Hero impactante, serviços em destaque e botão de agendamento.',
    imagem: '/assets/landing-page-mobile.png',
  },
  {
    id: 'catalogo',
    titulo: 'Catálogo de Serviços',
    descricao: 'Seus clientes veem todos os serviços com preços e duração. Agendamento direto pelo celular.',
    imagem: '/assets/landing-page-mobile2.png',
  },
]

export function SecaoShowcase() {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.1 })
  const [funcionalidadeAtiva, setFuncionalidadeAtiva] = useState(funcionalidades[0])

  return (
    <section id="showcase" ref={ref} className="py-24 md:py-32 bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Cabeçalho */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              Conheça o Sistema
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Interface moderna e intuitiva. Gerencie seu negócio de qualquer lugar.
            </p>
          </motion.div>

          {/* Layout principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Mockup do iPhone */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={estaVisivel ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex justify-center order-2 lg:order-1"
            >
              {/* Gradiente decorativo atrás do iPhone */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[300px] h-[300px] bg-gradient-to-br from-zinc-200 dark:from-zinc-800 to-transparent rounded-full blur-3xl opacity-50" />
              </div>
              
              <div className="relative w-[220px] sm:w-[260px] md:w-[280px]">
                <Iphone
                  src={funcionalidadeAtiva.imagem}
                  className="drop-shadow-2xl"
                />
              </div>
            </motion.div>

            {/* Lista de funcionalidades */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={estaVisivel ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="space-y-3 order-1 lg:order-2"
            >
              {funcionalidades.map((funcionalidade, indice) => {
                const estaAtivo = funcionalidadeAtiva.id === funcionalidade.id
                return (
                  <motion.button
                    key={funcionalidade.id}
                    onClick={() => setFuncionalidadeAtiva(funcionalidade)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.4 + indice * 0.05 }}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                      estaAtivo
                        ? 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 shadow-lg'
                        : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-zinc-900/50 hover:border-zinc-200 dark:hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors duration-300 ${
                        estaAtivo
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        {indice + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold mb-1 transition-colors duration-300 ${
                          estaAtivo
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {funcionalidade.titulo}
                        </h3>
                        <p className={`text-sm leading-relaxed transition-all duration-300 ${
                          estaAtivo
                            ? 'text-zinc-600 dark:text-zinc-400 max-h-20 opacity-100'
                            : 'text-zinc-500 dark:text-zinc-500 max-h-0 opacity-0 overflow-hidden'
                        }`}>
                          {funcionalidade.descricao}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
