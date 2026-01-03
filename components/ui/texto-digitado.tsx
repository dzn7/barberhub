'use client'

import { ElementType, useEffect, useRef, useState, createElement, useMemo, useCallback } from 'react'
import { gsap } from 'gsap'

interface PropriedadesTextoDigitado {
  className?: string
  mostrarCursor?: boolean
  esconderCursorAoDigitar?: boolean
  caractereCursor?: string | React.ReactNode
  duracaoPiscadaCursor?: number
  classeCursor?: string
  texto: string | string[]
  como?: ElementType
  velocidadeDigitacao?: number
  atrasoInicial?: number
  duracaoPausa?: number
  velocidadeDelecao?: number
  loop?: boolean
  coreTexto?: string[]
  velocidadeVariavel?: { min: number; max: number }
  aoCompletarFrase?: (frase: string, indice: number) => void
  iniciarAoVisivel?: boolean
  modoReverso?: boolean
}

const TextoDigitado = ({
  texto,
  como: Componente = 'div',
  velocidadeDigitacao = 50,
  atrasoInicial = 0,
  duracaoPausa = 2000,
  velocidadeDelecao = 30,
  loop = true,
  className = '',
  mostrarCursor = true,
  esconderCursorAoDigitar = false,
  caractereCursor = '|',
  classeCursor = '',
  duracaoPiscadaCursor = 0.5,
  coreTexto = [],
  velocidadeVariavel,
  aoCompletarFrase,
  iniciarAoVisivel = false,
  modoReverso = false,
  ...props
}: PropriedadesTextoDigitado & React.HTMLAttributes<HTMLElement>) => {
  const [textoExibido, definirTextoExibido] = useState('')
  const [indiceCaractereAtual, definirIndiceCaractereAtual] = useState(0)
  const [estaDeletando, definirEstaDeletando] = useState(false)
  const [indiceTextoAtual, definirIndiceTextoAtual] = useState(0)
  const [estaVisivel, definirEstaVisivel] = useState(!iniciarAoVisivel)
  const refCursor = useRef<HTMLSpanElement>(null)
  const refContainer = useRef<HTMLElement>(null)

  const arrayTexto = useMemo(() => (Array.isArray(texto) ? texto : [texto]), [texto])

  const obterVelocidadeAleatoria = useCallback(() => {
    if (!velocidadeVariavel) return velocidadeDigitacao
    const { min, max } = velocidadeVariavel
    return Math.random() * (max - min) + min
  }, [velocidadeVariavel, velocidadeDigitacao])

  const obterCorTextoAtual = () => {
    if (coreTexto.length === 0) return
    return coreTexto[indiceTextoAtual % coreTexto.length]
  }

  useEffect(() => {
    if (!iniciarAoVisivel || !refContainer.current) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            definirEstaVisivel(true)
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(refContainer.current)
    return () => observer.disconnect()
  }, [iniciarAoVisivel])

  useEffect(() => {
    if (mostrarCursor && refCursor.current) {
      gsap.set(refCursor.current, { opacity: 1 })
      gsap.to(refCursor.current, {
        opacity: 0,
        duration: duracaoPiscadaCursor,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      })
    }
  }, [mostrarCursor, duracaoPiscadaCursor])

  useEffect(() => {
    if (!estaVisivel) return

    let timeout: NodeJS.Timeout

    const textoAtual = arrayTexto[indiceTextoAtual]
    const textoProcessado = modoReverso ? textoAtual.split('').reverse().join('') : textoAtual

    const executarAnimacaoDigitacao = () => {
      if (estaDeletando) {
        if (textoExibido === '') {
          definirEstaDeletando(false)
          if (indiceTextoAtual === arrayTexto.length - 1 && !loop) {
            return
          }

          if (aoCompletarFrase) {
            aoCompletarFrase(arrayTexto[indiceTextoAtual], indiceTextoAtual)
          }

          definirIndiceTextoAtual(prev => (prev + 1) % arrayTexto.length)
          definirIndiceCaractereAtual(0)
          timeout = setTimeout(() => {}, duracaoPausa)
        } else {
          timeout = setTimeout(() => {
            definirTextoExibido(prev => prev.slice(0, -1))
          }, velocidadeDelecao)
        }
      } else {
        if (indiceCaractereAtual < textoProcessado.length) {
          timeout = setTimeout(
            () => {
              definirTextoExibido(prev => prev + textoProcessado[indiceCaractereAtual])
              definirIndiceCaractereAtual(prev => prev + 1)
            },
            velocidadeVariavel ? obterVelocidadeAleatoria() : velocidadeDigitacao
          )
        } else if (arrayTexto.length >= 1) {
          if (!loop && indiceTextoAtual === arrayTexto.length - 1) return
          timeout = setTimeout(() => {
            definirEstaDeletando(true)
          }, duracaoPausa)
        }
      }
    }

    if (indiceCaractereAtual === 0 && !estaDeletando && textoExibido === '') {
      timeout = setTimeout(executarAnimacaoDigitacao, atrasoInicial)
    } else {
      executarAnimacaoDigitacao()
    }

    return () => clearTimeout(timeout)
  }, [
    indiceCaractereAtual,
    textoExibido,
    estaDeletando,
    velocidadeDigitacao,
    velocidadeDelecao,
    duracaoPausa,
    arrayTexto,
    indiceTextoAtual,
    loop,
    atrasoInicial,
    estaVisivel,
    modoReverso,
    velocidadeVariavel,
    aoCompletarFrase,
    obterVelocidadeAleatoria
  ])

  const deveEsconderCursor =
    esconderCursorAoDigitar && (indiceCaractereAtual < arrayTexto[indiceTextoAtual].length || estaDeletando)

  return createElement(
    Componente,
    {
      ref: refContainer,
      className: `inline-block whitespace-pre-wrap tracking-tight ${className}`,
      ...props
    },
    <span className="inline" style={{ color: obterCorTextoAtual() || 'inherit' }}>
      {textoExibido}
    </span>,
    mostrarCursor && (
      <span
        ref={refCursor}
        className={`ml-1 inline-block opacity-100 ${deveEsconderCursor ? 'hidden' : ''} ${classeCursor}`}
      >
        {caractereCursor}
      </span>
    )
  )
}

export default TextoDigitado
