'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/components/ui/botao'
import { LogoMarca } from '@/components/ui/logo-marca'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle,
  Loader2,
  LogIn,
  ArrowLeft,
  CheckCircle
} from 'lucide-react'

export default function EntrarPage() {
  const { entrar } = useAuth()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [modoRecuperacao, setModoRecuperacao] = useState(false)
  const [emailRecuperacao, setEmailRecuperacao] = useState('')
  const [recuperacaoEnviada, setRecuperacaoEnviada] = useState(false)
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false)
  
  const [form, setForm] = useState({
    email: '',
    senha: ''
  })

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!emailRecuperacao || !emailRecuperacao.includes('@')) {
      setErro('Digite um e-mail válido')
      return
    }

    setEnviandoRecuperacao(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailRecuperacao, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })

      if (error) throw error

      setRecuperacaoEnviada(true)
    } catch (error) {
      setErro('Erro ao enviar e-mail de recuperação. Tente novamente.')
    } finally {
      setEnviandoRecuperacao(false)
    }
  }

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
      setErro('Erro ao fazer login. Tente novamente.')
      setCarregando(false)
    }
  }

  // Tela de recuperação de senha
  if (modoRecuperacao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <LogoMarca />
            </Link>
            <h1 className="text-2xl font-bold text-white mt-4">Recuperar Senha</h1>
            <p className="text-zinc-400 mt-2">
              {recuperacaoEnviada 
                ? 'Verifique sua caixa de entrada' 
                : 'Digite seu e-mail para receber o link de recuperação'}
            </p>
          </div>

          {recuperacaoEnviada ? (
            <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-white mb-2">E-mail enviado com sucesso!</p>
              <p className="text-zinc-400 text-sm mb-6">
                Enviamos um link de recuperação para <strong className="text-white">{emailRecuperacao}</strong>. 
                Verifique sua caixa de entrada e spam.
              </p>
              <button
                onClick={() => {
                  setModoRecuperacao(false)
                  setRecuperacaoEnviada(false)
                  setEmailRecuperacao('')
                }}
                className="text-primary hover:underline text-sm"
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecuperarSenha} className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="email"
                    value={emailRecuperacao}
                    onChange={e => setEmailRecuperacao(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {erro && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {erro}
                </div>
              )}

              <Botao type="submit" disabled={enviandoRecuperacao} className="w-full mt-6">
                {enviandoRecuperacao ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link de recuperação'
                )}
              </Botao>

              <button
                type="button"
                onClick={() => {
                  setModoRecuperacao(false)
                  setErro(null)
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o login
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <LogoMarca />
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Entrar no Painel</h1>
          <p className="text-zinc-400 mt-2">Acesse sua conta para gerenciar sua barbearia</p>
        </div>

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

          {erro && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </div>
          )}

          <Botao type="submit" disabled={carregando} className="w-full mt-6">
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

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setModoRecuperacao(true)
                setErro(null)
                setEmailRecuperacao(form.email)
              }}
              className="text-sm text-zinc-400 hover:text-primary transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
        </form>

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
