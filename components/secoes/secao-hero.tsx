'use client'

import { ArrowRight, Calendar, Scissors, Users } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { motion } from 'framer-motion'
import Image from 'next/image'

export function SecaoHero() {
  const rolarPara = (id: string) => {
    const elemento = document.getElementById(id)
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white dark:bg-black pt-20">
      {/* Fundo com gradiente sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-white dark:from-zinc-900 dark:via-black dark:to-black" />
      
      {/* Linhas decorativas sutis */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl flex flex-col items-center justify-center w-full px-4 py-10 md:py-20">
        
        {/* Título principal */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white leading-tight max-w-4xl"
        >
          Pare de perder clientes por falta de organização
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-center text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
        >
          Sistema completo para sua barbearia: agendamento online 24h, controle financeiro 
          e gestão de equipe. Seus clientes agendam sozinhos, você foca no corte.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <a href="/registrar">
            <Botao tamanho="lg" className="group px-8">
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Botao>
          </a>
          <Botao
            tamanho="lg"
            variante="contorno"
            onClick={() => rolarPara('jornada')}
            className="px-8"
          >
            Ver Como Funciona
          </Botao>
        </motion.div>
        
        {/* Info trial */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-4 text-sm text-zinc-500 dark:text-zinc-500"
        >
          14 dias grátis. Sem cartão de crédito. Cancele quando quiser.
        </motion.p>

        {/* Cards de benefícios rápidos */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl"
        >
          <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-zinc-900 dark:text-white font-medium">Agendamento Online</p>
              <p className="text-sm text-zinc-500">24 horas por dia</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-zinc-900 dark:text-white font-medium">Gestão de Equipe</p>
              <p className="text-sm text-zinc-500">Comissões automáticas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-zinc-900 dark:text-white font-medium">Controle Total</p>
              <p className="text-sm text-zinc-500">Finanças e estoque</p>
            </div>
          </div>
        </motion.div>

        {/* Mockup principal */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 relative w-full max-w-4xl"
        >
          {/* Gradiente de fundo do mockup */}
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-black via-transparent to-transparent z-10 pointer-events-none" />
          
          <div className="relative flex items-end justify-center gap-4 md:gap-8">
            {/* Mockup esquerdo - Desktop */}
            <div className="hidden md:block w-[200px] lg:w-[260px] opacity-40 dark:opacity-60">
              <Image
                src="/assets/mockup-left.png"
                alt="Painel de agendamentos"
                width={260}
                height={400}
                className="w-full h-auto rounded-t-xl shadow-2xl dark:shadow-2xl shadow-zinc-300/50"
              />
            </div>

            {/* Mockup central - Mobile (destaque) */}
            <div className="w-[220px] sm:w-[260px] relative z-20">
              <Image
                src="/assets/dashboard-lista-portrait.png"
                alt="App de agendamento"
                width={260}
                height={520}
                className="w-full h-auto rounded-t-2xl shadow-2xl dark:shadow-2xl shadow-zinc-400/30"
              />
            </div>

            {/* Mockup direito - Desktop */}
            <div className="hidden md:block w-[200px] lg:w-[260px] opacity-40 dark:opacity-60">
              <Image
                src="/assets/mockup_invertido.png"
                alt="Dashboard financeiro"
                width={260}
                height={400}
                className="w-full h-auto rounded-t-xl shadow-2xl dark:shadow-2xl shadow-zinc-300/50 scale-x-[-1]"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
