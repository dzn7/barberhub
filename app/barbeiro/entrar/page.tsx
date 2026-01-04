'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Scissors, 
  Loader2, 
  KeyRound, 
  ArrowRight, 
  History, 
  Trash2,
  User,
  Building2,
  CheckCircle
} from 'lucide-react'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'

const STORAGE_KEY_HISTORICO = 'barberhub_tokens_historico'

interface TokenHistorico {
  token: string
  barbeiroNome: string
  barbeariaNome: string
  ultimoAcesso: string
}

/**
 * Página de login para barbeiros via token
 * Com histórico de tokens salvos e design moderno
 */
export default function PaginaLoginBarbeiro() {
  const router = useRouter()
  const { entrar, autenticado, carregando: carregandoAuth } = useBarbeiroAuth()
  
  const [token, setToken] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const [historicoTokens, setHistoricoTokens] = useState<TokenHistorico[]>([])
  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  // Carregar histórico de tokens salvos
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_HISTORICO)
      if (salvo) {
        const historico = JSON.parse(salvo) as TokenHistorico[]
        setHistoricoTokens(historico)
        // Se tiver histórico, mostrar automaticamente
        if (historico.length > 0) {
          setMostrarHistorico(true)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    }
  }, [])

  // Redirecionar se já autenticado
  useEffect(() => {
    if (!carregandoAuth && autenticado) {
      router.push('/barbeiro')
    }
  }, [carregandoAuth, autenticado, router])

  const salvarNoHistorico = (tokenInfo: TokenHistorico) => {
    try {
      // Remover duplicatas e adicionar no início
      const novoHistorico = [
        tokenInfo,
        ...historicoTokens.filter(t => t.token !== tokenInfo.token)
      ].slice(0, 5) // Manter apenas os últimos 5

      setHistoricoTokens(novoHistorico)
      localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novoHistorico))
    } catch (error) {
      console.error('Erro ao salvar histórico:', error)
    }
  }

  const removerDoHistorico = (tokenParaRemover: string) => {
    const novoHistorico = historicoTokens.filter(t => t.token !== tokenParaRemover)
    setHistoricoTokens(novoHistorico)
    localStorage.setItem(STORAGE_KEY_HISTORICO, JSON.stringify(novoHistorico))
  }

  const limparHistorico = () => {
    setHistoricoTokens([])
    localStorage.removeItem(STORAGE_KEY_HISTORICO)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await realizarLogin(token)
  }

  const realizarLogin = async (tokenLogin: string) => {
    setErro('')
    
    if (!tokenLogin.trim()) {
      setErro('Digite o código de acesso')
      return
    }

    setProcessando(true)
    
    const resultado = await entrar(tokenLogin)
    
    if (resultado.sucesso) {
      // Buscar dados do barbeiro e barbearia para salvar no histórico
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: barbeiroData } = await supabase
          .from('barbeiros')
          .select('nome, tenants(nome)')
          .eq('token_acesso', tokenLogin.toUpperCase())
          .single()

        if (barbeiroData) {
          salvarNoHistorico({
            token: tokenLogin.toUpperCase(),
            barbeiroNome: barbeiroData.nome,
            barbeariaNome: (barbeiroData.tenants as any)?.nome || 'Barbearia',
            ultimoAcesso: new Date().toISOString()
          })
        }
      } catch (error) {
        console.error('Erro ao salvar no histórico:', error)
      }

      router.push('/barbeiro')
    } else {
      setErro(resultado.erro || 'Erro ao fazer login')
    }
    
    setProcessando(false)
  }

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setToken(valor.slice(0, 8))
  }

  const formatarData = (dataISO: string) => {
    try {
      const data = new Date(dataISO)
      const agora = new Date()
      const diff = agora.getTime() - data.getTime()
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (dias === 0) return 'Hoje'
      if (dias === 1) return 'Ontem'
      if (dias < 7) return `${dias} dias atrás`
      return data.toLocaleDateString('pt-BR')
    } catch {
      return ''
    }
  }

  if (carregandoAuth) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Scissors className="w-12 h-12 text-emerald-500 animate-pulse" />
          <p className="text-zinc-400">Verificando sessão...</p>
        </div>
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
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <Scissors className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Área do Barbeiro
            </h1>
            <p className="text-zinc-400">
              Acesse sua conta para gerenciar agendamentos
            </p>
          </div>

          {/* Histórico de Tokens */}
          <AnimatePresence>
            {historicoTokens.length > 0 && mostrarHistorico && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Acessos Recentes
                    </h3>
                    <button
                      onClick={limparHistorico}
                      className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      Limpar tudo
                    </button>
                  </div>

                  <div className="space-y-2">
                    {historicoTokens.map((item) => (
                      <div
                        key={item.token}
                        className="group flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors"
                        onClick={() => realizarLogin(item.token)}
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {item.barbeiroNome}
                          </p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {item.barbeariaNome}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 hidden sm:block">
                            {formatarData(item.ultimoAcesso)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removerDoHistorico(item.token)
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setMostrarHistorico(false)}
                    className="w-full mt-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    Usar outro código
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulário */}
          {(!mostrarHistorico || historicoTokens.length === 0) && (
            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
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
                className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20"
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

              {historicoTokens.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMostrarHistorico(true)}
                  className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Ver acessos salvos ({historicoTokens.length})
                </button>
              )}
            </motion.form>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-zinc-300 font-medium mb-1">
                  Acesso salvo automaticamente
                </p>
                <p className="text-xs text-zinc-500">
                  Seu código será salvo para acessos futuros rápidos. 
                  Você pode remover a qualquer momento.
                </p>
              </div>
            </div>
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
