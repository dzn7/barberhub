'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react'

/**
 * Estados de validação para campos do formulário
 */
type EstadoValidacao = 'idle' | 'validando' | 'valido' | 'invalido'

interface EstadoCampo {
  estado: EstadoValidacao
  mensagem?: string
}

export default function RegistrarPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  
  // Refs para foco automático
  const inputNomeBarbeariaRef = useRef<HTMLInputElement>(null)
  const inputNomeProprietarioRef = useRef<HTMLInputElement>(null)
  const inputSenhaRef = useRef<HTMLInputElement>(null)
  
  const [form, setForm] = useState({
    nome_barbearia: '',
    slug: '',
    nome_proprietario: '',
    email: '',
    telefone: '',
    senha: '',
    confirmar_senha: ''
  })
  
  // Estados de validação em tempo real
  const [validacaoSlug, setValidacaoSlug] = useState<EstadoCampo>({ estado: 'idle' })
  const [validacaoEmail, setValidacaoEmail] = useState<EstadoCampo>({ estado: 'idle' })
  
  const [contaCriada, setContaCriada] = useState(false)
  const [tenantSlug, setTenantSlug] = useState('')

  /**
   * Gera slug a partir do nome da barbearia
   */
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

  /**
   * Verifica se o slug já existe no banco de dados
   */
  const verificarSlugDisponivel = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setValidacaoSlug({ estado: 'idle' })
      return
    }
    
    setValidacaoSlug({ estado: 'validando' })
    
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      
      if (error) throw error
      
      if (data) {
        setValidacaoSlug({ 
          estado: 'invalido', 
          mensagem: 'Este endereço já está em uso. Escolha outro.' 
        })
      } else {
        setValidacaoSlug({ 
          estado: 'valido', 
          mensagem: 'Endereço disponível!' 
        })
      }
    } catch {
      setValidacaoSlug({ estado: 'idle' })
    }
  }, [])

  /**
   * Verifica se o email já existe no Supabase Auth
   */
  const verificarEmailDisponivel = useCallback(async (email: string) => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setValidacaoEmail({ estado: 'idle' })
      return
    }
    
    setValidacaoEmail({ estado: 'validando' })
    
    try {
      // Verificar na tabela de proprietários (que tem o email único)
      const { data, error } = await supabase
        .from('proprietarios')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()
      
      if (error) throw error
      
      if (data) {
        setValidacaoEmail({ 
          estado: 'invalido', 
          mensagem: 'Este e-mail já está cadastrado. Faça login.' 
        })
      } else {
        setValidacaoEmail({ 
          estado: 'valido', 
          mensagem: 'E-mail disponível!' 
        })
      }
    } catch {
      setValidacaoEmail({ estado: 'idle' })
    }
  }, [])

  /**
   * Debounce para verificação de slug
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.slug.length >= 3) {
        verificarSlugDisponivel(form.slug)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [form.slug, verificarSlugDisponivel])

  /**
   * Debounce para verificação de email
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (form.email.includes('@') && form.email.includes('.')) {
        verificarEmailDisponivel(form.email)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [form.email, verificarEmailDisponivel])

  /**
   * Foco automático ao mudar de etapa
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (etapa === 1) inputNomeBarbeariaRef.current?.focus()
      else if (etapa === 2) inputNomeProprietarioRef.current?.focus()
      else if (etapa === 3) inputSenhaRef.current?.focus()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [etapa])

  const handleNomeBarbearia = (valor: string) => {
    const novoSlug = gerarSlug(valor)
    setForm({
      ...form,
      nome_barbearia: valor,
      slug: novoSlug
    })
    // Reset validação do slug quando muda
    if (novoSlug.length < 3) {
      setValidacaoSlug({ estado: 'idle' })
    }
  }

  const handleEmailChange = (valor: string) => {
    setForm({ ...form, email: valor })
    // Reset validação do email quando muda
    if (!valor.includes('@')) {
      setValidacaoEmail({ estado: 'idle' })
    }
  }

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  /**
   * Valida formato de email
   */
  const emailValido = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  const validarEtapa1 = (): boolean => {
    if (!form.nome_barbearia.trim()) {
      setErro('Digite o nome da sua barbearia')
      inputNomeBarbeariaRef.current?.focus()
      return false
    }
    if (!form.slug.trim() || form.slug.length < 3) {
      setErro('O endereço deve ter pelo menos 3 caracteres')
      return false
    }
    if (validacaoSlug.estado === 'invalido') {
      setErro(validacaoSlug.mensagem || 'Este endereço já está em uso')
      return false
    }
    if (validacaoSlug.estado === 'validando') {
      setErro('Aguarde a verificação do endereço')
      return false
    }
    return true
  }

  const validarEtapa2 = (): boolean => {
    if (!form.nome_proprietario.trim()) {
      setErro('Digite seu nome')
      inputNomeProprietarioRef.current?.focus()
      return false
    }
    if (!form.email.trim() || !emailValido(form.email)) {
      setErro('Digite um e-mail válido')
      return false
    }
    if (validacaoEmail.estado === 'invalido') {
      setErro(validacaoEmail.mensagem || 'Este e-mail já está cadastrado')
      return false
    }
    if (validacaoEmail.estado === 'validando') {
      setErro('Aguarde a verificação do e-mail')
      return false
    }
    if (!form.telefone.trim() || form.telefone.replace(/\D/g, '').length < 10) {
      setErro('Digite um telefone válido com DDD')
      return false
    }
    return true
  }

  const validarEtapa3 = (): boolean => {
    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres')
      inputSenhaRef.current?.focus()
      return false
    }
    if (form.senha !== form.confirmar_senha) {
      setErro('As senhas não coincidem')
      return false
    }
    return true
  }

  const avancarEtapa = async () => {
    setErro(null)
    
    if (etapa === 1) {
      // Aguardar validação do slug se ainda estiver validando
      if (validacaoSlug.estado === 'validando') {
        setErro('Aguarde a verificação do endereço')
        return
      }
      if (validarEtapa1()) {
        setEtapa(2)
      }
    } else if (etapa === 2) {
      // Aguardar validação do email se ainda estiver validando
      if (validacaoEmail.estado === 'validando') {
        setErro('Aguarde a verificação do e-mail')
        return
      }
      if (validarEtapa2()) {
        setEtapa(3)
      }
    }
  }

  const voltarEtapa = () => {
    setErro(null)
    if (etapa > 1) {
      setEtapa(etapa - 1)
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
          },
          emailRedirectTo: `${window.location.origin}/configurar`
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

      // Mesmo sem confirmação de email, temos o user.id
      const userId = authData.user?.id
      if (!userId) {
        setErro('Erro ao criar conta. Tente novamente.')
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
          p_user_id: userId
        })

      if (tenantError) {
        console.error('Erro ao criar tenant:', tenantError)
        setErro('Erro ao criar barbearia. Tente novamente.')
        setCarregando(false)
        return
      }

      // Fazer login automático (ignora confirmação de email para dev)
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.senha
      })

      if (loginError) {
        throw loginError
      }

      // Sucesso! Redirecionar com reload completo para garantir que AuthContext carregue
      setTenantSlug(form.slug)
      setContaCriada(true)
      
      // Usar window.location para forçar reload completo do AuthContext
      window.location.href = '/configurar'

    } catch (error) {
      setErro('Erro ao criar conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  /**
   * Renderiza indicador de status de validação
   */
  const renderizarIndicadorValidacao = (validacao: EstadoCampo) => {
    if (validacao.estado === 'validando') {
      return <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
    }
    if (validacao.estado === 'valido') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    }
    if (validacao.estado === 'invalido') {
      return <XCircle className="w-4 h-4 text-red-500" />
    }
    return null
  }

  /**
   * Retorna classes de borda baseado no estado de validação
   */
  const classesBordaValidacao = (validacao: EstadoCampo): string => {
    if (validacao.estado === 'valido') return 'border-emerald-500/50'
    if (validacao.estado === 'invalido') return 'border-red-500/50'
    return 'border-zinc-700'
  }

  // Títulos das etapas para acessibilidade
  const titulosEtapas = ['Dados da Barbearia', 'Seus Dados', 'Criar Senha']

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block" aria-label="Voltar para página inicial">
            <LogoMarca />
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Criar sua Barbearia</h1>
          <p className="text-zinc-400 mt-2">14 dias grátis para testar</p>
        </div>

        {/* Progress com acessibilidade */}
        <nav aria-label="Progresso do cadastro" className="mb-8">
          <ol className="flex justify-center gap-2" role="list">
            {[1, 2, 3].map(step => (
              <li 
                key={step}
                role="listitem"
                aria-current={step === etapa ? 'step' : undefined}
              >
                <div
                  className={`w-16 h-1 rounded-full transition-colors ${
                    step <= etapa ? 'bg-white' : 'bg-zinc-700'
                  }`}
                  aria-label={`Etapa ${step}: ${titulosEtapas[step - 1]}${step < etapa ? ' (concluída)' : step === etapa ? ' (atual)' : ''}`}
                />
              </li>
            ))}
          </ol>
          <p className="text-center text-xs text-zinc-500 mt-2" aria-live="polite">
            Etapa {etapa} de 3: {titulosEtapas[etapa - 1]}
          </p>
        </nav>

        {/* Form */}
        <form 
          onSubmit={handleSubmit} 
          className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50"
          aria-label="Formulário de cadastro"
        >
          
          {/* Etapa 1: Dados da Barbearia */}
          {etapa === 1 && (
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-white mb-4">Dados da Barbearia</legend>
              
              <div>
                <label htmlFor="nome_barbearia" className="block text-sm text-zinc-400 mb-2">
                  Nome da Barbearia <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" aria-hidden="true" />
                  <input
                    ref={inputNomeBarbeariaRef}
                    id="nome_barbearia"
                    type="text"
                    value={form.nome_barbearia}
                    onChange={e => handleNomeBarbearia(e.target.value)}
                    placeholder="Ex: Barbearia do João"
                    required
                    aria-required="true"
                    aria-describedby="nome_barbearia_ajuda"
                    autoComplete="organization"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-zinc-500 transition-all"
                  />
                </div>
                <p id="nome_barbearia_ajuda" className="text-xs text-zinc-500 mt-1">
                  O nome que aparecerá para seus clientes
                </p>
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm text-zinc-400 mb-2">
                  Endereço da sua página <span className="text-red-400">*</span>
                </label>
                <div className={`flex items-center bg-zinc-900 border rounded-lg overflow-hidden transition-colors ${classesBordaValidacao(validacaoSlug)}`}>
                  <span className="px-3 text-zinc-500 text-sm select-none" aria-hidden="true">barberhub.online/</span>
                  <input
                    id="slug"
                    type="text"
                    value={form.slug}
                    onChange={e => {
                      const novoSlug = gerarSlug(e.target.value)
                      setForm({ ...form, slug: novoSlug })
                      if (novoSlug.length < 3) setValidacaoSlug({ estado: 'idle' })
                    }}
                    placeholder="sua-barbearia"
                    required
                    aria-required="true"
                    aria-describedby="slug_ajuda slug_status"
                    aria-invalid={validacaoSlug.estado === 'invalido'}
                    className="flex-1 bg-transparent px-2 py-3 text-white placeholder:text-zinc-500 focus:outline-none"
                  />
                  <div className="pr-3" aria-hidden="true">
                    {renderizarIndicadorValidacao(validacaoSlug)}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p id="slug_ajuda" className="text-xs text-zinc-500">
                    Este será o link da sua página de agendamentos
                  </p>
                  {validacaoSlug.mensagem && (
                    <p 
                      id="slug_status" 
                      className={`text-xs ${validacaoSlug.estado === 'valido' ? 'text-emerald-400' : 'text-red-400'}`}
                      role="status"
                      aria-live="polite"
                    >
                      {validacaoSlug.mensagem}
                    </p>
                  )}
                </div>
              </div>
            </fieldset>
          )}

          {/* Etapa 2: Dados Pessoais */}
          {etapa === 2 && (
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-white mb-4">Seus Dados</legend>
              
              <div>
                <label htmlFor="nome_proprietario" className="block text-sm text-zinc-400 mb-2">
                  Seu Nome <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" aria-hidden="true" />
                  <input
                    ref={inputNomeProprietarioRef}
                    id="nome_proprietario"
                    type="text"
                    value={form.nome_proprietario}
                    onChange={e => setForm({ ...form, nome_proprietario: e.target.value })}
                    placeholder="Seu nome completo"
                    required
                    aria-required="true"
                    autoComplete="name"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-zinc-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm text-zinc-400 mb-2">
                  E-mail <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" aria-hidden="true" />
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={e => handleEmailChange(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    aria-required="true"
                    aria-describedby="email_status"
                    aria-invalid={validacaoEmail.estado === 'invalido'}
                    autoComplete="email"
                    className={`w-full bg-zinc-900 border rounded-lg pl-10 pr-10 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-zinc-500 transition-all ${classesBordaValidacao(validacaoEmail)}`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                    {renderizarIndicadorValidacao(validacaoEmail)}
                  </div>
                </div>
                {validacaoEmail.mensagem && (
                  <p 
                    id="email_status" 
                    className={`text-xs mt-1 ${validacaoEmail.estado === 'valido' ? 'text-emerald-400' : 'text-red-400'}`}
                    role="status"
                    aria-live="polite"
                  >
                    {validacaoEmail.mensagem}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="telefone" className="block text-sm text-zinc-400 mb-2">
                  Telefone/WhatsApp <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" aria-hidden="true" />
                  <input
                    id="telefone"
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                    aria-required="true"
                    aria-describedby="telefone_ajuda"
                    autoComplete="tel"
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-zinc-500 transition-all"
                  />
                </div>
                <p id="telefone_ajuda" className="text-xs text-zinc-500 mt-1">
                  Usado para contato e notificações
                </p>
              </div>
            </fieldset>
          )}

          {/* Etapa 3: Senha */}
          {etapa === 3 && (
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold text-white mb-4">Criar Senha</legend>
              
              <div>
                <label htmlFor="senha" className="block text-sm text-zinc-400 mb-2">
                  Senha <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" aria-hidden="true" />
                  <input
                    ref={inputSenhaRef}
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={e => setForm({ ...form, senha: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    aria-required="true"
                    aria-describedby="senha_ajuda senha_forca"
                    autoComplete="new-password"
                    minLength={6}
                    className={`w-full bg-zinc-900 border rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-zinc-500 transition-all ${
                      form.senha.length > 0 
                        ? form.senha.length >= 6 
                          ? 'border-emerald-500/50' 
                          : 'border-yellow-500/50'
                        : 'border-zinc-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 rounded focus:outline-none focus:ring-2 focus:ring-white/30"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={mostrarSenha}
                  >
                    {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p id="senha_ajuda" className="text-xs text-zinc-500 mt-1">
                  Use pelo menos 6 caracteres
                </p>
                {/* Indicador de força da senha em tempo real */}
                {form.senha.length > 0 && (
                  <div className="mt-2 space-y-1" role="status" aria-live="polite">
                    <div className="flex gap-1" aria-hidden="true">
                      {[1, 2, 3, 4].map((nivel) => (
                        <div 
                          key={nivel}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            form.senha.length >= nivel * 2
                              ? form.senha.length >= 8 ? 'bg-emerald-500' : form.senha.length >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                              : 'bg-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p 
                      id="senha_forca"
                      className={`text-xs ${form.senha.length >= 8 ? 'text-emerald-400' : form.senha.length >= 6 ? 'text-yellow-400' : 'text-red-400'}`}
                    >
                      {form.senha.length >= 8 ? 'Senha forte' : form.senha.length >= 6 ? 'Senha válida' : `Faltam ${6 - form.senha.length} caracteres`}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmar_senha" className="block text-sm text-zinc-400 mb-2">
                  Confirmar Senha <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" aria-hidden="true" />
                  <input
                    id="confirmar_senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.confirmar_senha}
                    onChange={e => setForm({ ...form, confirmar_senha: e.target.value })}
                    placeholder="Repita a senha"
                    required
                    aria-required="true"
                    aria-describedby="confirmar_senha_status"
                    aria-invalid={form.confirmar_senha.length > 0 && form.confirmar_senha !== form.senha}
                    autoComplete="new-password"
                    className={`w-full bg-zinc-900 border rounded-lg pl-10 pr-10 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-zinc-500 transition-all ${
                      form.confirmar_senha.length > 0
                        ? form.confirmar_senha === form.senha && form.senha.length >= 6
                          ? 'border-emerald-500/50'
                          : 'border-red-500/50'
                        : 'border-zinc-700'
                    }`}
                  />
                  {/* Indicador visual de match */}
                  {form.confirmar_senha.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                      {form.confirmar_senha === form.senha && form.senha.length >= 6 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {form.confirmar_senha.length > 0 && (
                  <p 
                    id="confirmar_senha_status"
                    className={`text-xs mt-1 ${form.confirmar_senha === form.senha && form.senha.length >= 6 ? 'text-emerald-400' : 'text-red-400'}`}
                    role="status"
                    aria-live="polite"
                  >
                    {form.confirmar_senha === form.senha && form.senha.length >= 6 
                      ? 'Senhas coincidem' 
                      : 'As senhas não coincidem'}
                  </p>
                )}
              </div>

              {/* Resumo */}
              <div className="bg-zinc-900/50 rounded-lg p-4 mt-6" role="region" aria-label="Resumo do cadastro">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Resumo</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Barbearia:</dt>
                    <dd className="text-white font-medium">{form.nome_barbearia}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Link:</dt>
                    <dd className="text-white font-medium">barberhub.online/{form.slug}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">E-mail:</dt>
                    <dd className="text-white font-medium">{form.email}</dd>
                  </div>
                </dl>
              </div>
            </fieldset>
          )}

          {/* Erro com acessibilidade */}
          {erro && (
            <div 
              className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          )}

          {/* Botões com acessibilidade */}
          <div className="flex gap-3 mt-6">
            {etapa > 1 && (
              <Botao
                type="button"
                variante="contorno"
                onClick={voltarEtapa}
                className="flex-1"
                aria-label={`Voltar para etapa ${etapa - 1}: ${titulosEtapas[etapa - 2]}`}
              >
                <ArrowLeft className="mr-2 w-4 h-4" aria-hidden="true" />
                Voltar
              </Botao>
            )}
            
            {etapa < 3 ? (
              <Botao
                type="button"
                onClick={avancarEtapa}
                className="flex-1"
                disabled={
                  (etapa === 1 && (validacaoSlug.estado === 'validando' || validacaoSlug.estado === 'invalido')) ||
                  (etapa === 2 && (validacaoEmail.estado === 'validando' || validacaoEmail.estado === 'invalido'))
                }
                aria-label={`Continuar para etapa ${etapa + 1}: ${titulosEtapas[etapa]}`}
              >
                Continuar
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Botao>
            ) : (
              <Botao
                type="submit"
                disabled={carregando || form.senha.length < 6 || form.senha !== form.confirmar_senha}
                className="flex-1"
                aria-label="Criar conta e finalizar cadastro"
                aria-busy={carregando}
              >
                {carregando ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Criando conta...</span>
                  </>
                ) : (
                  <>
                    <Check className="mr-2 w-4 h-4" aria-hidden="true" />
                    <span>Criar Conta</span>
                  </>
                )}
              </Botao>
            )}
          </div>
        </form>

        {/* Link Login */}
        <p className="text-center text-zinc-400 mt-6">
          Já tem uma conta?{' '}
          <Link 
            href="/entrar" 
            className="text-white hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-white/30 rounded"
          >
            Fazer login
          </Link>
        </p>

        {/* Benefícios */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center" role="list" aria-label="Benefícios">
          <div className="text-zinc-400 text-xs" role="listitem">
            <div className="text-white text-lg font-bold mb-1">14 dias</div>
            Grátis para testar
          </div>
          <div className="text-zinc-400 text-xs" role="listitem">
            <div className="text-white text-lg font-bold mb-1">Ilimitado</div>
            Agendamentos
          </div>
          <div className="text-zinc-400 text-xs" role="listitem">
            <div className="text-white text-lg font-bold mb-1">Suporte</div>
            Via WhatsApp
          </div>
        </div>
      </div>
    </div>
  )
}
