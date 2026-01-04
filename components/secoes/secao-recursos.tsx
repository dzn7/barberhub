'use client'

import { Calendar, LayoutDashboard, DollarSign, Users, MessageSquare, Package } from 'lucide-react'
import { BentoGrid, CartaoBento } from '@/components/ui/bento-grid'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const recursos = [
  {
    icone: Calendar,
    titulo: 'Agendamento Online',
    descricao: 'Seus clientes agendam pelo celular, a qualquer hora. Você recebe tudo organizado na sua agenda.',
    className: 'md:col-span-1',
    fundo: (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 dark:from-zinc-800/50 via-transparent to-transparent" />
    ),
  },
  {
    icone: LayoutDashboard,
    titulo: 'Painel de Controle',
    descricao: 'Veja quanto faturou hoje, quantos clientes atendeu e como está a performance de cada barbeiro. Tudo em uma tela.',
    className: 'md:col-span-2',
    fundo: (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 dark:from-zinc-800/50 via-transparent to-transparent" />
    ),
  },
  {
    icone: DollarSign,
    titulo: 'Financeiro Simplificado',
    descricao: 'Registre entradas e saídas em segundos. Saiba exatamente quanto sobra no final do mês.',
    className: 'md:col-span-2',
    fundo: (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 dark:from-zinc-800/50 via-transparent to-transparent" />
    ),
  },
  {
    icone: Users,
    titulo: 'Comissões Automáticas',
    descricao: 'Define o percentual de cada barbeiro e o sistema calcula sozinho. Sem planilha, sem erro.',
    className: 'md:col-span-1',
    fundo: (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 dark:from-zinc-800/50 via-transparent to-transparent" />
    ),
  },
  {
    icone: MessageSquare,
    titulo: 'Lembrete por WhatsApp',
    descricao: 'Cliente recebe lembrete automático antes do horário. Menos faltas, mais faturamento.',
    className: 'md:col-span-1',
    fundo: (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 dark:from-zinc-800/50 via-transparent to-transparent" />
    ),
  },
  {
    icone: Package,
    titulo: 'Controle de Produtos',
    descricao: 'Saiba quais produtos estão acabando e quanto lucra com cada venda. Reponha antes de faltar.',
    className: 'md:col-span-2',
    fundo: (
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 dark:from-zinc-800/50 via-transparent to-transparent" />
    ),
  },
]

export function SecaoRecursos() {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="recursos" ref={ref} className="py-20 md:py-28 bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Título */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <p className="text-center text-sm font-medium tracking-widest text-zinc-500 uppercase">
              Funcionalidades
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-zinc-900 dark:text-white">
              Tudo que sua barbearia precisa
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center max-w-2xl mx-auto">
              Sem complicação. Sem funcionalidade inútil. Só o que funciona de verdade no dia a dia.
            </p>
          </motion.div>

          {/* Bento Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <BentoGrid>
              {recursos.map((recurso) => (
                <CartaoBento
                  key={recurso.titulo}
                  nome={recurso.titulo}
                  className={recurso.className}
                  fundo={recurso.fundo}
                  Icone={recurso.icone}
                  descricao={recurso.descricao}
                />
              ))}
            </BentoGrid>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
