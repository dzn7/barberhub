'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface PropriedadesTituloFrame {
  titulo: string
  subtitulo?: string
  className?: string
}

export function TituloFrame({ titulo, subtitulo, className = '' }: PropriedadesTituloFrame) {
  const ref = useRef(null)
  const estaVisivel = useInView(ref, { once: true, amount: 0.4 })

  return (
    <div ref={ref} className={`relative w-full py-16 sm:py-20 ${className}`}>
      {/* Grid Tricotado */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Linhas horizontais principais */}
        {['10%', '50%', '90%'].map((posicao, index) => (
          <motion.div
            key={`linha-h-${posicao}`}
            initial={{ scaleX: 0 }}
            animate={estaVisivel ? { scaleX: 1 } : {}}
            transition={{ duration: 1.1, delay: 0.3 + index * 0.1 }}
            className="absolute left-0 right-0 h-px bg-primary/25 origin-left"
            style={{ top: posicao }}
          />
        ))}

        {/* Linhas verticais principais */}
        {['15%', '50%', '85%'].map((posicao, index) => (
          <motion.div
            key={`linha-v-${posicao}`}
            initial={{ scaleY: 0 }}
            animate={estaVisivel ? { scaleY: 1 } : {}}
            transition={{ duration: 1, delay: 0.4 + index * 0.1 }}
            className="absolute top-4 bottom-4 w-px bg-primary/20 origin-top"
            style={{ left: posicao }}
          />
        ))}

        {/* Círculo decorativo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={estaVisivel ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="absolute -top-6 -left-6 w-16 h-16 rounded-full border border-primary/15"
        />
      </div>

      {/* Símbolos de mais tricotados */}
      {[
        { top: '8%', left: '5%' },
        { top: '8%', right: '5%' },
        { bottom: '8%', left: '5%' },
        { bottom: '8%', right: '5%' }
      ].map((posicao, index) => (
        <motion.div
          key={`plus-${index}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={estaVisivel ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
          className="absolute w-6 h-6 z-30"
          style={posicao}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[1.5px] bg-primary/50" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[1.5px] h-full bg-primary/50" />
          </div>
        </motion.div>
      ))}

      {/* Conteúdo com linhas conectadas */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="relative">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={estaVisivel ? { scaleX: 1 } : {}}
            transition={{ duration: 1.1, delay: 0.6 }}
            className="absolute -top-6 left-0 right-0 h-px bg-primary/30 origin-center"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={estaVisivel ? { scaleX: 1 } : {}}
            transition={{ duration: 1.1, delay: 0.8 }}
            className="absolute -bottom-6 left-0 right-0 h-px bg-primary/30 origin-center"
          />

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white"
          >
            {titulo}
          </motion.h2>
        </div>

        {subtitulo && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={estaVisivel ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-10 flex items-center gap-4"
          >
            <motion.span
              initial={{ scaleX: 0 }}
              animate={estaVisivel ? { scaleX: 1 } : {}}
              transition={{ duration: 0.9, delay: 1 }}
              className="h-px flex-1 bg-primary/20 origin-left"
            />
            <p className="text-center text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              {subtitulo}
            </p>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={estaVisivel ? { scaleX: 1 } : {}}
              transition={{ duration: 0.9, delay: 1 }}
              className="h-px flex-1 bg-primary/20 origin-right"
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}
