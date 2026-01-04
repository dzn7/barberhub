'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Scissors, Loader2, KeyRound, ArrowRight } from 'lucide-react'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'

/**
 * Página de login para barbeiros via token
 * Design clean e focado na experiência do usuário
 */
export default function PaginaLoginBarbeiro() {
  const router = useRouter()
  const { entrar, autenticado, carregando: carregandoAuth } = useBarbeiroAuth()
  
  const [token, setToken] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)

  // Redirecionar se já autenticado
  useEffect(() => {
    if (!carregandoAuth && autenticado) {
      router.push('/barbeiro')
    }
  }, [carregandoAuth, autenticado, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    
    if (!token.trim()) {
      setErro('Digite o código de acesso')
      return
    }

    setProcessando(true)
    
    const resultado = await entrar(token)
    
    if (resultado.sucesso) {
      router.push('/barbeiro')
    } else {
      setErro(resultado.erro || 'Erro ao fazer login')
    }
    
    setProcessando(false)
  }

  // Formatar token enquanto digita (em grupos de 3)
  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setToken(valor.slice(0, 8))
  }

  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              barber<span className="text-emerald-500">hub</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Ícone */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-700/50 shadow-xl">
              <Scissors className="w-10 h-10 text-emerald-500" />
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Área do Barbeiro
            </h1>
            <p className="text-zinc-400">
              Digite o código de acesso fornecido pelo proprietário
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="token" 
                className="block text-sm font-medium text-zinc-300 mb-2"
              >
                Código de Acesso
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={handleTokenChange}
                  placeholder="XXXXXXXX"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-white text-center text-xl tracking-[0.3em] font-mono placeholder:text-zinc-600 placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  autoComplete="off"
                  autoFocus
                />
              </div>
              {erro && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400"
                >
                  {erro}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              disabled={processando || !token.trim()}
              className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              {processando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <p className="text-sm text-zinc-400 text-center">
              O código de acesso é fornecido pelo proprietário da barbearia 
              ao cadastrar você como barbeiro no sistema.
            </p>
          </div>

          {/* Link para proprietários */}
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500">
              É proprietário?{' '}
              <Link 
                href="/entrar" 
                className="text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Acesse aqui
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-4">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} BarberHub
          </p>
        </div>
      </footer>
    </div>
  )
}
