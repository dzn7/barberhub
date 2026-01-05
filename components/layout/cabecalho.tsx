'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlternadorTema } from './alternador-tema'
import { Botao } from '@/components/ui/botao'
import { cn } from '@/lib/utils'
import { LogoMarca } from '@/components/ui/logo-marca'
import { LogIn } from 'lucide-react'

export function Cabecalho() {
  const [rolado, definirRolado] = React.useState(false)

  React.useEffect(() => {
    const tratarRolagem = () => {
      definirRolado(window.scrollY > 20)
    }

    window.addEventListener('scroll', tratarRolagem, { passive: true })
    return () => window.removeEventListener('scroll', tratarRolagem)
  }, [])

  const rolarPara = (id: string) => {
    const elemento = document.getElementById(id)
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        rolado
          ? 'bg-background/80 backdrop-blur-lg border-b shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <button className="flex items-center space-x-2 cursor-pointer" onClick={() => rolarPara('inicio')} aria-label="Ir para o início">
            <LogoMarca />
          </button>

          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => rolarPara('vantagens')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Vantagens
            </button>
            <button
              onClick={() => rolarPara('beneficios')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Resultados
            </button>
            <button
              onClick={() => rolarPara('precos')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Preços
            </button>
            <button
              onClick={() => rolarPara('contato')}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Contato
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <AlternadorTema />
            <Link
              href="/entrar"
              className="hidden sm:inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </Link>
            <Link href="/registrar">
              <Botao
                tamanho="lg"
                className="hidden sm:inline-flex"
              >
                Criar Conta Grátis
              </Botao>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
