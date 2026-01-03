'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Botao } from '@/components/ui/botao'
import { LogoMarca } from '@/components/ui/logo-marca'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle,
  Loader2,
  LogIn
} from 'lucide-react'

export default function EntrarPage() {
  const { entrar } = useAuth()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  
  const [form, setForm] = useState({
    email: '',
    senha: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    
    if (!form.email || !form.senha) {
      setErro('Preencha todos os campos')
      return
    }

    setCarregando(true)

    try {
      const resultado = await entrar(form.email, form.senha)

      if (resultado.erro) {
        if (resultado.erro.includes('Invalid login credentials')) {
          setErro('E-mail ou senha incorretos')
        } else if (resultado.erro.includes('Email not confirmed')) {
          setErro('E-mail não confirmado. Verifique sua caixa de entrada.')
        } else {
          setErro(resultado.erro)
        }
        setCarregando(false)
        return
      }

      // Login bem-sucedido - redirecionar
      window.location.href = '/admin'

    } catch (error) {
      console.error('[Login] Erro:', error)
      setErro('Erro ao fazer login. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <LogoMarca />
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Entrar no Painel</h1>
          <p className="text-zinc-400 mt-2">Acesse sua conta para gerenciar sua barbearia</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => setForm({ ...form, senha: e.target.value })}
                  placeholder="Sua senha"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </div>
          )}

          {/* Botão */}
          <Botao
            type="submit"
            disabled={carregando}
            className="w-full mt-6"
          >
            {carregando ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="mr-2 w-4 h-4" />
                Entrar
              </>
            )}
          </Botao>

          {/* Link recuperar senha */}
          <div className="text-center mt-4">
            <button
              type="button"
              className="text-sm text-zinc-400 hover:text-primary"
            >
              Esqueci minha senha
            </button>
          </div>
        </form>

        {/* Link Registrar */}
        <p className="text-center text-zinc-400 mt-6">
          Não tem uma conta?{' '}
          <Link href="/registrar" className="text-primary hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
