'use client'

import { ArrowRight, Check } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const garantias = [
  '14 dias grátis para testar',
  'Sem cartão de crédito',
  'Cancele quando quiser',
  'Suporte por WhatsApp',
]

export function SecaoContato() {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.2 })

  return (
    <section id="contato" ref={ref} className="py-20 md:py-32 bg-black">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-8 md:p-12 lg:p-16"
          >
            {/* Gradiente decorativo */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                  Comece agora mesmo
                </h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                  Crie sua conta em 2 minutos e veja como é fácil organizar sua barbearia. 
                  Se não gostar, é só cancelar. Sem burocracia.
                </p>
              </div>

              {/* Garantias */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {garantias.map((garantia) => (
                  <div key={garantia} className="flex items-center gap-2 text-zinc-300">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{garantia}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/registrar">
                  <Botao tamanho="xl" className="group px-10">
                    Criar Minha Conta Grátis
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Botao>
                </a>
              </div>

              {/* Contato alternativo */}
              <p className="text-sm text-zinc-500">
                Prefere falar com alguém?{' '}
                <a 
                  href="https://wa.me/5563981053014" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:underline"
                >
                  Chame no WhatsApp
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
