'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/components/ui/botao'
import { LogoMarca } from '@/components/ui/logo-marca'
import { 
  Store, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react'

export default function RegistrarPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  
  const [form, setForm] = useState({
    nome_barbearia: '',
    slug: '',
    nome_proprietario: '',
    email: '',
    telefone: '',
    senha: '',
    confirmar_senha: ''
  })
  const [contaCriada, setContaCriada] = useState(false)
  const [tenantSlug, setTenantSlug] = useState('')

  const gerarSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNomeBarbearia = (valor: string) => {
    setForm({
      ...form,
      nome_barbearia: valor,
      slug: gerarSlug(valor)
    })
  }

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 10) {
      return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const validarEtapa1 = () => {
    if (!form.nome_barbearia.trim()) {
      setErro('Digite o nome da sua barbearia')
      return false
    }
    if (!form.slug.trim() || form.slug.length < 3) {
      setErro('O slug deve ter pelo menos 3 caracteres')
      return false
    }
    return true
  }

  const validarEtapa2 = () => {
    if (!form.nome_proprietario.trim()) {
      setErro('Digite seu nome')
      return false
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setErro('Digite um e-mail válido')
      return false
    }
    if (!form.telefone.trim() || form.telefone.replace(/\D/g, '').length < 10) {
      setErro('Digite um telefone válido')
      return false
    }
    return true
  }

  const validarEtapa3 = () => {
    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      return false
    }
    if (form.senha !== form.confirmar_senha) {
      setErro('As senhas não coincidem')
      return false
    }
    return true
  }

  const avancarEtapa = () => {
    setErro(null)
    
    if (etapa === 1 && validarEtapa1()) {
      setEtapa(2)
    } else if (etapa === 2 && validarEtapa2()) {
      setEtapa(3)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    
    if (!validarEtapa3()) return

    setCarregando(true)

    try {
      // Verificar se slug já existe
      const { data: slugExiste } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', form.slug)
        .single()

      if (slugExiste) {
        setErro('Este slug já está em uso. Escolha outro.')
        setCarregando(false)
        return
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: {
            nome: form.nome_proprietario,
          }
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setErro('Este e-mail já está cadastrado. Faça login.')
        } else {
          setErro(authError.message)
        }
        setCarregando(false)
        return
      }

      if (!authData.user) {
        setErro('Erro ao criar conta')
        setCarregando(false)
        return
      }

      // Criar tenant usando a função do banco
      const { data: tenantId, error: tenantError } = await supabase
        .rpc('criar_novo_tenant', {
          p_slug: form.slug,
          p_nome: form.nome_barbearia,
          p_email: form.email,
          p_telefone: form.telefone,
          p_user_id: authData.user.id
        })

      if (tenantError) {
        console.error('Erro ao criar tenant:', tenantError)
        setErro('Erro ao criar barbearia. Tente novamente.')
        setCarregando(false)
        return
      }

      // Sucesso!
      setTenantSlug(form.slug)
      setContaCriada(true)

    } catch (error) {
      console.error('Erro:', error)
      setErro('Erro ao criar conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  // Tela de sucesso após criar conta
  if (contaCriada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">Conta Criada com Sucesso</h1>
          
          <p className="text-zinc-400 mb-8">
            Sua barbearia <span className="text-primary font-semibold">{form.nome_barbearia}</span> está pronta.
            Você tem 14 dias de teste grátis para explorar todas as funcionalidades.
          </p>
          
          <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50 mb-6">
            <p className="text-sm text-zinc-400 mb-3">Link da sua página de agendamentos:</p>
            <div className="bg-zinc-900 rounded-lg p-3">
              <code className="text-primary">barberhub.online/{tenantSlug}</code>
            </div>
          </div>
          
          <div className="space-y-3">
            <Link href="/entrar" className="block">
              <Botao className="w-full">
                Acessar Painel Administrativo
                <ArrowRight className="ml-2 w-4 h-4" />
              </Botao>
            </Link>
            
            <p className="text-xs text-zinc-500">
              Use o e-mail e senha cadastrados para fazer login
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <LogoMarca />
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Criar sua Barbearia</h1>
          <p className="text-zinc-400 mt-2">14 dias grátis para testar</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(step => (
            <div
              key={step}
              className={`w-16 h-1 rounded-full transition-colors ${
                step <= etapa ? 'bg-primary' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50">
          
          {/* Etapa 1: Dados da Barbearia */}
          {etapa === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Dados da Barbearia</h2>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome da Barbearia</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={form.nome_barbearia}
                    onChange={e => handleNomeBarbearia(e.target.value)}
                    placeholder="Ex: Barbearia do João"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Endereço da sua página</label>
                <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
                  <span className="px-3 text-zinc-500 text-sm">barberhub.online/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => setForm({ ...form, slug: gerarSlug(e.target.value) })}
                    placeholder="sua-barbearia"
                    className="flex-1 bg-transparent px-2 py-3 text-white placeholder:text-zinc-500 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Este será o link da sua página de agendamentos
                </p>
              </div>
            </div>
          )}

          {/* Etapa 2: Dados Pessoais */}
          {etapa === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Seus Dados</h2>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Seu Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    value={form.nome_proprietario}
                    onChange={e => setForm({ ...form, nome_proprietario: e.target.value })}
                    placeholder="Seu nome completo"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

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
                <label className="block text-sm text-zinc-400 mb-2">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Etapa 3: Senha */}
          {etapa === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-4">Criar Senha</h2>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={e => setForm({ ...form, senha: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
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

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.confirmar_senha}
                    onChange={e => setForm({ ...form, confirmar_senha: e.target.value })}
                    placeholder="Repita a senha"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-zinc-900/50 rounded-lg p-4 mt-6">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Barbearia:</span>
                    <span className="text-white">{form.nome_barbearia}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Link:</span>
                    <span className="text-primary">barberhub.online/{form.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">E-mail:</span>
                    <span className="text-white">{form.email}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-6">
            {etapa > 1 && (
              <Botao
                type="button"
                variante="contorno"
                onClick={() => setEtapa(etapa - 1)}
                className="flex-1"
              >
                Voltar
              </Botao>
            )}
            
            {etapa < 3 ? (
              <Botao
                type="button"
                onClick={avancarEtapa}
                className="flex-1"
              >
                Continuar
                <ArrowRight className="ml-2 w-4 h-4" />
              </Botao>
            ) : (
              <Botao
                type="submit"
                disabled={carregando}
                className="flex-1"
              >
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 w-4 h-4" />
                    Criar Conta
                  </>
                )}
              </Botao>
            )}
          </div>
        </form>

        {/* Link Login */}
        <p className="text-center text-zinc-400 mt-6">
          Já tem uma conta?{' '}
          <Link href="/entrar" className="text-primary hover:underline">
            Fazer login
          </Link>
        </p>

        {/* Benefícios */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-zinc-400 text-xs">
            <div className="text-primary text-lg font-bold mb-1">14 dias</div>
            Grátis para testar
          </div>
          <div className="text-zinc-400 text-xs">
            <div className="text-primary text-lg font-bold mb-1">Ilimitado</div>
            Agendamentos
          </div>
          <div className="text-zinc-400 text-xs">
            <div className="text-primary text-lg font-bold mb-1">Suporte</div>
            Via WhatsApp
          </div>
        </div>
      </div>
    </div>
  )
}
