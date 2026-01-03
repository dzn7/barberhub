'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface PropriedadesFocoVerdadeiro {
  frase?: string
  separador?: string
  modoManual?: boolean
  quantidadeDesfoque?: number
  corBorda?: string
  corBrilho?: string
  duracaoAnimacao?: number
  pausaEntreAnimacoes?: number
}

interface RetanguloFoco {
  x: number
  y: number
  largura: number
  altura: number
}

export function FocoVerdadeiro({
  frase = 'Foco Verdadeiro',
  separador = ' ',
  modoManual = false,
  quantidadeDesfoque = 5,
  corBorda = 'hsl(var(--primary))',
  corBrilho = 'hsl(var(--primary) / 0.6)',
  duracaoAnimacao = 0.5,
  pausaEntreAnimacoes = 1
}: PropriedadesFocoVerdadeiro) {
  const palavras = frase.split(separador)
  const [indiceAtual, definirIndiceAtual] = useState<number>(0)
  const [ultimoIndiceAtivo, definirUltimoIndiceAtivo] = useState<number | null>(null)
  const refContainer = useRef<HTMLDivElement | null>(null)
  const refsPalavras = useRef<(HTMLSpanElement | null)[]>([])
  const [retanguloFoco, definirRetanguloFoco] = useState<RetanguloFoco>({
    x: 0,
    y: 0,
    largura: 0,
    altura: 0
  })

  useEffect(() => {
    if (!modoManual) {
      const intervalo = setInterval(
        () => {
          definirIndiceAtual(anterior => (anterior + 1) % palavras.length)
        },
        (duracaoAnimacao + pausaEntreAnimacoes) * 1000
      )

      return () => clearInterval(intervalo)
    }
  }, [modoManual, duracaoAnimacao, pausaEntreAnimacoes, palavras.length])

  useEffect(() => {
    if (indiceAtual === null || indiceAtual === -1) return
    if (!refsPalavras.current[indiceAtual] || !refContainer.current) return

    const retanguloPai = refContainer.current.getBoundingClientRect()
    const retanguloAtivo = refsPalavras.current[indiceAtual]!.getBoundingClientRect()

    definirRetanguloFoco({
      x: retanguloAtivo.left - retanguloPai.left,
      y: retanguloAtivo.top - retanguloPai.top,
      largura: retanguloAtivo.width,
      altura: retanguloAtivo.height
    })
  }, [indiceAtual, palavras.length])

  const tratarMouseEntrar = (indice: number) => {
    if (modoManual) {
      definirUltimoIndiceAtivo(indice)
      definirIndiceAtual(indice)
    }
  }

  const tratarMouseSair = () => {
    if (modoManual) {
      definirIndiceAtual(ultimoIndiceAtivo!)
    }
  }

  return (
    <div className="relative flex gap-4 justify-center items-center flex-wrap" ref={refContainer}>
      {palavras.map((palavra, indice) => {
        const estaAtivo = indice === indiceAtual
        return (
          <span
            key={indice}
            ref={el => {
              refsPalavras.current[indice] = el
            }}
            className="relative text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold cursor-pointer select-none"
            style={{
              filter: estaAtivo ? 'blur(0px)' : `blur(${quantidadeDesfoque}px)`,
              transition: `filter ${duracaoAnimacao}s ease`
            }}
            onMouseEnter={() => tratarMouseEntrar(indice)}
            onMouseLeave={tratarMouseSair}
          >
            {palavra}
          </span>
        )
      })}

      <motion.div
        className="absolute top-0 left-0 pointer-events-none box-border border-0"
        animate={{
          x: retanguloFoco.x,
          y: retanguloFoco.y,
          width: retanguloFoco.largura,
          height: retanguloFoco.altura,
          opacity: indiceAtual >= 0 ? 1 : 0
        }}
        transition={{
          duration: duracaoAnimacao
        }}
        style={{
          '--border-color': corBorda,
          '--glow-color': corBrilho
        } as React.CSSProperties}
      >
        <span
          className="absolute w-4 h-4 border-[3px] rounded-[3px] top-[-10px] left-[-10px] border-r-0 border-b-0"
          style={{
            borderColor: 'var(--border-color)',
            filter: 'drop-shadow(0 0 4px var(--border-color))'
          }}
        />
        <span
          className="absolute w-4 h-4 border-[3px] rounded-[3px] top-[-10px] right-[-10px] border-l-0 border-b-0"
          style={{
            borderColor: 'var(--border-color)',
            filter: 'drop-shadow(0 0 4px var(--border-color))'
          }}
        />
        <span
          className="absolute w-4 h-4 border-[3px] rounded-[3px] bottom-[-10px] left-[-10px] border-r-0 border-t-0"
          style={{
            borderColor: 'var(--border-color)',
            filter: 'drop-shadow(0 0 4px var(--border-color))'
          }}
        />
        <span
          className="absolute w-4 h-4 border-[3px] rounded-[3px] bottom-[-10px] right-[-10px] border-l-0 border-t-0"
          style={{
            borderColor: 'var(--border-color)',
            filter: 'drop-shadow(0 0 4px var(--border-color))'
          }}
        />
      </motion.div>
    </div>
  )
}
