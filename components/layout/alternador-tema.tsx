'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Botao } from '@/components/ui/botao'

export function AlternadorTema() {
  const { theme: tema, setTheme: definirTema } = useTheme()
  const [montado, definirMontado] = React.useState(false)

  React.useEffect(() => {
    definirMontado(true)
  }, [])

  if (!montado) {
    return (
      <Botao
        variante="fantasma"
        tamanho="icone"
        className="rounded-full"
        disabled
      >
        <Sun className="h-5 w-5" />
        <span className="sr-only">Alternar tema</span>
      </Botao>
    )
  }

  const alternarTema = () => {
    if (!definirTema) return
    definirTema(tema === 'dark' ? 'light' : 'dark')
  }

  return (
    <Botao
      variante="fantasma"
      tamanho="icone"
      className="rounded-full"
      onClick={alternarTema}
      aria-label={tema === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      disabled={!definirTema}
    >
      {tema === 'dark' ? (
        <Sun className="h-5 w-5 transition-all" />
      ) : (
        <Moon className="h-5 w-5 transition-all" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Botao>
  )
}
