'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/components/ui/botao'
import { LogoMarca } from '@/components/ui/logo-marca'
import {
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
  XCircle,
  Scissors,
  Hand,
  Clock3,
} from 'lucide-react'
import Image from 'next/image'
import { TipoNegocio, OPCOES_TIPO_NEGOCIO, ehTipoNegocioFeminino } from '@/lib/tipos-negocio'
import { obterTerminologia } from '@/lib/configuracoes-negocio'

/**
 * Estados de validação para campos do formulário
 */
type EstadoValidacao = 'idle' | 'validando' | 'valido' | 'invalido'

interface EstadoCampo {
  estado: EstadoValidacao
  mensagem?: string
}

interface EtapaCadastro {
  id: 1 | 2 | 3
  titulo: string
  subtitulo: string
  resumo: string
  tempoEstimado: string
  listaApoio: string[]
  explicacao: string
}

function obterEtapasCadastro(tipoNegocio: TipoNegocio | ''): EtapaCadastro[] {
  const tipoSelecionado = tipoNegocio || 'barbearia'
  const ehSegmentoFeminino = ehTipoNegocioFeminino(tipoSelecionado)
  const termoEstabelecimento = obterTerminologia(tipoSelecionado).estabelecimento.singular.toLowerCase()
  const termoCliente = 'clientes'

  return [
    {
      id: 1,
      titulo: 'Negócio',
      subtitulo: `Defina a identidade do seu ${termoEstabelecimento}`,
      resumo: 'Tipo, nome e link',
      tempoEstimado: '~1 minuto',
      listaApoio: [
        'Escolha o tipo de negócio correto',
        `Informe o nome do seu ${termoEstabelecimento}`,
        'Crie o endereço da página de agendamento',
      ],
      explicacao:
        'Esses dados formam sua identidade no sistema e geram seu link público de agendamento.',
    },
    {
      id: 2,
      titulo: 'Contato',
      subtitulo: 'Cadastre os dados da pessoa responsável',
      resumo: 'Nome, e-mail e telefone',
      tempoEstimado: '~1 minuto',
      listaApoio: [
        'Nome da pessoa proprietária da conta',
        'E-mail de acesso e recuperação',
        'Telefone para notificações e suporte',
      ],
      explicacao:
        `Essas informações garantem acesso seguro e contato rápido quando houver agendamentos dos ${termoCliente}.`,
    },
    {
      id: 3,
      titulo: 'Segurança',
      subtitulo: 'Finalize com uma senha segura',
      resumo: 'Senha e confirmação',
      tempoEstimado: '~30 segundos',
      listaApoio: [
        'Crie uma senha com no mínimo 6 caracteres',
        'Confirme exatamente a mesma senha',
        'Revise o resumo antes de concluir',
      ],
      explicacao:
        'A senha protege seus dados e o acesso ao painel administrativo da sua operação.',
    },
  ]
}

export default function RegistrarPage() {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  // Refs para foco automático
  const inputNomeBarbeariaRef = useRef<HTMLInputElement>(null)
  const inputNomeProprietarioRef = useRef<HTMLInputElement>(null)
  const inputSenhaRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    tipo_negocio: '' as TipoNegocio | '',
    nome_estabelecimento: '',
    slug: '',
    nome_proprietario: '',
    email: '',
    telefone: '',
    senha: '',
    confirmar_senha: '',
  })

  // Terminologia baseada no tipo selecionado
  const terminologia = form.tipo_negocio ? obterTerminologia(form.tipo_negocio as TipoNegocio) : null
  const ehSegmentoFeminino = ehTipoNegocioFeminino(form.tipo_negocio)

  // Estados de validação em tempo real
  const [validacaoSlug, setValidacaoSlug] = useState<EstadoCampo>({ estado: 'idle' })
  const [validacaoEmail, setValidacaoEmail] = useState<EstadoCampo>({ estado: 'idle' })

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
      const { data, error } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle()

      if (error) throw error

      if (data) {
        setValidacaoSlug({
          estado: 'invalido',
          mensagem: 'Este endereço já está em uso. Escolha outro.',
        })
      } else {
        setValidacaoSlug({
          estado: 'valido',
          mensagem: 'Endereço disponível!',
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
          mensagem: 'Este e-mail já está cadastrado. Faça login.',
        })
      } else {
        setValidacaoEmail({
          estado: 'valido',
          mensagem: 'E-mail disponível!',
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
      else inputSenhaRef.current?.focus()
    }, 100)

    return () => clearTimeout(timer)
  }, [etapa])

  const handleNomeEstabelecimento = (valor: string) => {
    const novoSlug = gerarSlug(valor)
    setForm({
      ...form,
      nome_estabelecimento: valor,
      slug: novoSlug,
    })

    if (novoSlug.length < 3) {
      setValidacaoSlug({ estado: 'idle' })
    }
  }

  const handleTipoNegocio = (tipo: TipoNegocio) => {
    setForm({ ...form, tipo_negocio: tipo })
    setErro(null)
  }

  const handleEmailChange = (valor: string) => {
    setForm({ ...form, email: valor })

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
    if (!form.tipo_negocio) {
      setErro('Selecione o tipo do seu negócio')
      return false
    }

    if (!form.nome_estabelecimento.trim()) {
      const termo = terminologia?.estabelecimento.singular || 'estabelecimento'
      setErro(`Digite o nome ${terminologia?.estabelecimento.artigo || 'do'} ${termo.toLowerCase()}`)
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
      if (validacaoSlug.estado === 'validando') {
        setErro('Aguarde a verificação do endereço')
        return
      }
      if (validarEtapa1()) {
        setEtapa(2)
      }
    } else if (etapa === 2) {
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
      setEtapa((etapa - 1) as 1 | 2 | 3)
    }
  }

  const irParaEtapa = (proximaEtapa: 1 | 2 | 3) => {
    if (proximaEtapa < etapa) {
      setErro(null)
      setEtapa(proximaEtapa)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (!validarEtapa3()) return

    setCarregando(true)

    try {
      // Verificar se slug já existe
      const { data: slugExiste } = await supabase.from('tenants').select('id').eq('slug', form.slug).maybeSingle()

      if (slugExiste) {
        setErro('Este endereço já está em uso. Escolha outro.')
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
          emailRedirectTo: `${window.location.origin}/configurar`,
        },
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

      const userId = authData.user?.id
      if (!userId) {
        setErro('Erro ao criar conta. Tente novamente.')
        setCarregando(false)
        return
      }

      // Criar tenant usando a função do banco
      const { error: tenantError } = await supabase.rpc('criar_novo_tenant', {
        p_slug: form.slug,
        p_nome: form.nome_estabelecimento,
        p_email: form.email,
        p_telefone: form.telefone,
        p_user_id: userId,
        p_tipo_negocio: form.tipo_negocio || 'barbearia',
      })

      if (tenantError) {
        console.error('Erro ao criar tenant:', tenantError)
        const termoErro = terminologia?.estabelecimento.singular.toLowerCase() || 'negócio'
        setErro(`Erro ao criar ${termoErro}. Tente novamente.`)
        setCarregando(false)
        return
      }

      // Fazer login automático (ignora confirmação de email para dev)
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.senha,
      })

      if (loginError) {
        throw loginError
      }

      // Forçar reload completo para garantir que AuthContext carregue
      window.location.href = '/configurar'
    } catch {
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
      return <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
    }
    if (validacao.estado === 'valido') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    }
    if (validacao.estado === 'invalido') {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    return null
  }

  /**
   * Retorna classes de borda baseado no estado de validação
   */
  const classesBordaValidacao = (validacao: EstadoCampo): string => {
    if (validacao.estado === 'valido') return 'border-emerald-500/60'
    if (validacao.estado === 'invalido') return 'border-red-500/60'
    return 'border-zinc-300 dark:border-zinc-700'
  }

  const classeInput =
    `w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors ${
      ehSegmentoFeminino
        ? 'focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/15 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-rose-400 dark:focus:ring-rose-300/20'
        : 'focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/20'
    }`

  const classeBotaoPrimario = ehSegmentoFeminino
    ? 'bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-500'
    : ''

  const etapasCadastro = obterEtapasCadastro(form.tipo_negocio)
  const totalEtapas = etapasCadastro.length
  const etapaAtualDetalhes = etapasCadastro[etapa - 1]
  const percentualProgresso = (etapa / totalEtapas) * 100

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden px-4 py-6 text-zinc-900 dark:text-zinc-100 sm:px-6 sm:py-10 ${
        ehSegmentoFeminino ? 'bg-rose-50 dark:bg-zinc-950' : 'bg-zinc-50 dark:bg-zinc-950'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={`absolute -left-16 top-10 h-64 w-64 rounded-full blur-3xl ${
            ehSegmentoFeminino ? 'bg-rose-200/70 dark:bg-rose-900/30' : 'bg-zinc-200/70 dark:bg-zinc-800/60'
          }`}
        />
        <div
          className={`absolute bottom-0 right-0 h-72 w-72 rounded-full blur-3xl ${
            ehSegmentoFeminino ? 'bg-pink-200/50 dark:bg-pink-900/20' : 'bg-zinc-300/50 dark:bg-zinc-700/50'
          }`}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 text-center lg:mb-10">
          <Link href="/" className="inline-block" aria-label="Voltar para página inicial">
            <LogoMarca />
          </Link>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {terminologia
              ? `Cadastre ${terminologia.estabelecimento.artigo} ${terminologia.estabelecimento.singular}`
              : 'Crie sua conta profissional'}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            Configure sua operação em poucos minutos e publique sua página de agendamentos com um fluxo simples e guiado.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
          <section
            className={`rounded-3xl border bg-white/90 p-5 shadow-sm dark:bg-zinc-900/80 sm:p-8 ${
              ehSegmentoFeminino ? 'border-rose-200 dark:border-rose-900/30' : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <nav aria-label="Progresso do cadastro" className="mb-7">
              <ol className="grid grid-cols-3 gap-2 sm:gap-3" role="list">
                {etapasCadastro.map((meta) => {
                  const ativa = etapa === meta.id
                  const concluida = etapa > meta.id
                  const bloqueada = meta.id > etapa

                  return (
                    <li key={meta.id} role="listitem">
                      <button
                        type="button"
                        onClick={() => irParaEtapa(meta.id)}
                        disabled={bloqueada}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                          ativa
                            ? ehSegmentoFeminino
                              ? 'border-rose-500 bg-rose-500 text-white dark:border-rose-400 dark:bg-rose-400 dark:text-zinc-900'
                              : 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                            : concluida
                              ? 'border-zinc-300 bg-zinc-100 text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100'
                              : 'border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500'
                        } ${bloqueada ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        aria-current={ativa ? 'step' : undefined}
                        aria-label={`Etapa ${meta.id}: ${meta.titulo}${concluida ? ' (concluída)' : ativa ? ' (atual)' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              ativa
                                ? ehSegmentoFeminino
                                  ? 'bg-white/25 text-white dark:bg-rose-900/20 dark:text-zinc-900'
                                  : 'bg-white/20 text-white dark:bg-zinc-900/10 dark:text-zinc-900'
                                : concluida
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                  : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500'
                            }`}
                            aria-hidden="true"
                          >
                            {concluida ? <Check className="h-4 w-4" /> : meta.id}
                          </span>
                          <span className="text-sm font-semibold">{meta.titulo}</span>
                        </div>
                        <p className="mt-1 text-xs opacity-80">{meta.resumo}</p>
                      </button>
                    </li>
                  )
                })}
              </ol>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${ehSegmentoFeminino ? 'bg-rose-500 dark:bg-rose-400' : 'bg-zinc-900 dark:bg-zinc-100'}`}
                  style={{ width: `${percentualProgresso}%` }}
                />
              </div>

              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
                Etapa {etapa} de {totalEtapas}: {etapaAtualDetalhes.titulo}
              </p>
            </nav>

            <div className="mb-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{etapaAtualDetalhes.titulo}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{etapaAtualDetalhes.subtitulo}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" aria-label="Formulário de cadastro">
              {/* Etapa 1: Tipo de Negócio e Dados */}
              {etapa === 1 && (
                <fieldset className="space-y-6">
                  <legend className="sr-only">Dados do negócio</legend>

                  <div>
                    <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Tipo do seu negócio <span className="text-red-500">*</span>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {OPCOES_TIPO_NEGOCIO.map((opcao) => {
                        const selecionado = form.tipo_negocio === opcao.tipo

                        return (
                          <button
                            key={opcao.tipo}
                            type="button"
                            onClick={() => handleTipoNegocio(opcao.tipo)}
                            className={`rounded-2xl border p-4 text-left transition-all ${
                              selecionado
                                ? ehSegmentoFeminino
                                  ? 'border-rose-500 bg-rose-500 text-white dark:border-rose-400 dark:bg-rose-400 dark:text-zinc-900'
                                  : 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                                : 'border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/70 dark:hover:border-zinc-500'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
                                <Image src={opcao.imagem} alt={opcao.titulo} fill className="object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-semibold ${
                                    selecionado ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'
                                  }`}
                                >
                                  {opcao.titulo}
                                </p>
                                <p
                                  className={`mt-1 text-xs leading-relaxed ${
                                    selecionado ? 'text-zinc-200 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                                  }`}
                                >
                                  {opcao.descricao}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {form.tipo_negocio && (
                    <>
                      <div>
                        <label
                          htmlFor="nome_estabelecimento"
                          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          Nome {terminologia?.estabelecimento.artigo} {terminologia?.estabelecimento.singular}{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          {!ehTipoNegocioFeminino(form.tipo_negocio) ? (
                            <Scissors
                              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                              aria-hidden="true"
                            />
                          ) : (
                            <Hand
                              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                              aria-hidden="true"
                            />
                          )}
                          <input
                            ref={inputNomeBarbeariaRef}
                            id="nome_estabelecimento"
                            type="text"
                            value={form.nome_estabelecimento}
                            onChange={(e) => handleNomeEstabelecimento(e.target.value)}
                            placeholder={
                              form.tipo_negocio === 'barbearia'
                                ? 'Ex: Barbearia do João'
                                : form.tipo_negocio === 'cabeleireira'
                                  ? 'Ex: Salão Bella'
                                  : form.tipo_negocio === 'lash_designer'
                                    ? 'Ex: Estúdio Bela Cílios'
                                    : 'Ex: Studio da Maria'
                            }
                            required
                            aria-required="true"
                            aria-describedby="nome_estabelecimento_ajuda"
                            autoComplete="organization"
                            className={`${classeInput} pl-11`}
                          />
                        </div>
                        <p id="nome_estabelecimento_ajuda" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Este nome aparecerá no painel e na página de agendamento.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="slug" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Endereço da sua página <span className="text-red-500">*</span>
                        </label>
                        <div
                          className={`flex items-center overflow-hidden rounded-2xl border bg-white transition-colors dark:bg-zinc-950/70 ${classesBordaValidacao(validacaoSlug)}`}
                        >
                          <span
                            className="select-none whitespace-nowrap px-2 text-xs text-zinc-500 sm:px-3 sm:text-sm"
                            aria-hidden="true"
                          >
                            barberhub.online/
                          </span>
                          <input
                            id="slug"
                            type="text"
                            value={form.slug}
                            onChange={(e) => {
                              const novoSlug = gerarSlug(e.target.value)
                              setForm({ ...form, slug: novoSlug })
                              if (novoSlug.length < 3) setValidacaoSlug({ estado: 'idle' })
                            }}
                            placeholder={
                              form.tipo_negocio === 'barbearia'
                                ? 'sua-barbearia'
                                : form.tipo_negocio === 'cabeleireira'
                                  ? 'seu-salao'
                                  : form.tipo_negocio === 'lash_designer'
                                    ? 'seu-estudio-lash'
                                    : 'seu-studio'
                            }
                            required
                            aria-required="true"
                            aria-describedby="slug_ajuda slug_status"
                            aria-invalid={validacaoSlug.estado === 'invalido'}
                            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                          />
                          <div className="flex-shrink-0 pr-2 sm:pr-3" aria-hidden="true">
                            {renderizarIndicadorValidacao(validacaoSlug)}
                          </div>
                        </div>

                        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p id="slug_ajuda" className="text-xs text-zinc-500 dark:text-zinc-400">
                            Este será o link compartilhado com seus clientes.
                          </p>
                          {validacaoSlug.mensagem && (
                            <p
                              id="slug_status"
                              className={`text-xs ${validacaoSlug.estado === 'valido' ? 'text-emerald-500' : 'text-red-500'}`}
                              role="status"
                              aria-live="polite"
                            >
                              {validacaoSlug.mensagem}
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </fieldset>
              )}

              {/* Etapa 2: Dados Pessoais */}
              {etapa === 2 && (
                <fieldset className="space-y-4">
                  <legend className="sr-only">Dados de contato</legend>

                  <div>
                    <label htmlFor="nome_proprietario" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Seu nome <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                        aria-hidden="true"
                      />
                      <input
                        ref={inputNomeProprietarioRef}
                        id="nome_proprietario"
                        type="text"
                        value={form.nome_proprietario}
                        onChange={(e) => setForm({ ...form, nome_proprietario: e.target.value })}
                        placeholder="Seu nome completo"
                        required
                        aria-required="true"
                        autoComplete="name"
                        className={`${classeInput} pl-11`}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                        aria-hidden="true"
                      />
                      <input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        aria-required="true"
                        aria-describedby="email_status"
                        aria-invalid={validacaoEmail.estado === 'invalido'}
                        autoComplete="email"
                        className={`${classeInput} pl-11 pr-10 ${classesBordaValidacao(validacaoEmail)}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                        {renderizarIndicadorValidacao(validacaoEmail)}
                      </div>
                    </div>
                    {validacaoEmail.mensagem && (
                      <p
                        id="email_status"
                        className={`mt-1 text-xs ${validacaoEmail.estado === 'valido' ? 'text-emerald-500' : 'text-red-500'}`}
                        role="status"
                        aria-live="polite"
                      >
                        {validacaoEmail.mensagem}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="telefone" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Telefone/WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                        aria-hidden="true"
                      />
                      <input
                        id="telefone"
                        type="tel"
                        value={form.telefone}
                        onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        required
                        aria-required="true"
                        aria-describedby="telefone_ajuda"
                        autoComplete="tel"
                        className={`${classeInput} pl-11`}
                      />
                    </div>
                    <p id="telefone_ajuda" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Usaremos esse número para notificações importantes.
                    </p>
                  </div>
                </fieldset>
              )}

              {/* Etapa 3: Senha */}
              {etapa === 3 && (
                <fieldset className="space-y-4">
                  <legend className="sr-only">Senha de acesso</legend>

                  <div>
                    <label htmlFor="senha" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Senha <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                        aria-hidden="true"
                      />
                      <input
                        ref={inputSenhaRef}
                        id="senha"
                        type={mostrarSenha ? 'text' : 'password'}
                        value={form.senha}
                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                        placeholder="Mínimo 6 caracteres"
                        required
                        aria-required="true"
                        aria-describedby="senha_ajuda senha_forca"
                        autoComplete="new-password"
                        minLength={6}
                        className={`${classeInput} pl-11 pr-12 ${
                          form.senha.length > 0
                            ? form.senha.length >= 6
                              ? 'border-emerald-500/60'
                              : 'border-yellow-500/60'
                            : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 transition-colors hover:text-zinc-700 focus:outline-none focus:ring-2 dark:hover:text-zinc-300 ${
                          ehSegmentoFeminino ? 'focus:ring-rose-500/25 dark:focus:ring-rose-300/25' : 'focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20'
                        }`}
                        aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                        aria-pressed={mostrarSenha}
                      >
                        {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p id="senha_ajuda" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Recomendado usar combinação de letras e números.
                    </p>

                    {form.senha.length > 0 && (
                      <div className="mt-2 space-y-1" role="status" aria-live="polite">
                        <div className="flex gap-1" aria-hidden="true">
                          {[1, 2, 3, 4].map((nivel) => (
                            <div
                              key={nivel}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                form.senha.length >= nivel * 2
                                  ? form.senha.length >= 8
                                    ? 'bg-emerald-500'
                                    : form.senha.length >= 6
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  : 'bg-zinc-300 dark:bg-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                        <p
                          id="senha_forca"
                          className={`text-xs ${
                            form.senha.length >= 8
                              ? 'text-emerald-500'
                              : form.senha.length >= 6
                                ? 'text-yellow-500'
                                : 'text-red-500'
                          }`}
                        >
                          {form.senha.length >= 8
                            ? 'Senha forte'
                            : form.senha.length >= 6
                              ? 'Senha válida'
                              : `Faltam ${6 - form.senha.length} caracteres`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="confirmar_senha"
                      className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      Confirmar senha <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                        aria-hidden="true"
                      />
                      <input
                        id="confirmar_senha"
                        type={mostrarSenha ? 'text' : 'password'}
                        value={form.confirmar_senha}
                        onChange={(e) => setForm({ ...form, confirmar_senha: e.target.value })}
                        placeholder="Repita a senha"
                        required
                        aria-required="true"
                        aria-describedby="confirmar_senha_status"
                        aria-invalid={form.confirmar_senha.length > 0 && form.confirmar_senha !== form.senha}
                        autoComplete="new-password"
                        className={`${classeInput} pl-11 pr-10 ${
                          form.confirmar_senha.length > 0
                            ? form.confirmar_senha === form.senha && form.senha.length >= 6
                              ? 'border-emerald-500/60'
                              : 'border-red-500/60'
                            : 'border-zinc-300 dark:border-zinc-700'
                        }`}
                      />

                      {form.confirmar_senha.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                          {form.confirmar_senha === form.senha && form.senha.length >= 6 ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {form.confirmar_senha.length > 0 && (
                      <p
                        id="confirmar_senha_status"
                        className={`mt-1 text-xs ${
                          form.confirmar_senha === form.senha && form.senha.length >= 6
                            ? 'text-emerald-500'
                            : 'text-red-500'
                        }`}
                        role="status"
                        aria-live="polite"
                      >
                        {form.confirmar_senha === form.senha && form.senha.length >= 6
                          ? 'Senhas coincidem'
                          : 'As senhas não coincidem'}
                      </p>
                    )}
                  </div>

                  <div
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
                    role="region"
                    aria-label="Resumo do cadastro"
                  >
                    <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Resumo antes de criar conta</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-zinc-500 dark:text-zinc-400">{terminologia?.estabelecimento.singular || 'Estabelecimento'}:</dt>
                        <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{form.nome_estabelecimento}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-zinc-500 dark:text-zinc-400">Link:</dt>
                        <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">barberhub.online/{form.slug}</dd>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-zinc-500 dark:text-zinc-400">E-mail:</dt>
                        <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{form.email}</dd>
                      </div>
                    </dl>
                  </div>
                </fieldset>
              )}

              {erro && (
                <div
                  className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{erro}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row">
                {etapa > 1 && (
                  <Botao
                    type="button"
                    variante="contorno"
                    onClick={voltarEtapa}
                    className="w-full sm:flex-1"
                    aria-label={`Voltar para etapa ${etapa - 1}: ${etapasCadastro[etapa - 2].titulo}`}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Voltar
                  </Botao>
                )}

                {etapa < 3 ? (
                  <Botao
                    type="button"
                    onClick={avancarEtapa}
                    className={`w-full sm:flex-1 ${classeBotaoPrimario}`}
                    disabled={
                      (etapa === 1 &&
                        (validacaoSlug.estado === 'validando' || validacaoSlug.estado === 'invalido')) ||
                      (etapa === 2 &&
                        (validacaoEmail.estado === 'validando' || validacaoEmail.estado === 'invalido'))
                    }
                    aria-label={`Continuar para etapa ${etapa + 1}: ${etapasCadastro[etapa].titulo}`}
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Botao>
                ) : (
                  <Botao
                    type="submit"
                    disabled={carregando || form.senha.length < 6 || form.senha !== form.confirmar_senha}
                    className={`w-full sm:flex-1 ${classeBotaoPrimario}`}
                    aria-label="Criar conta e finalizar cadastro"
                    aria-busy={carregando}
                  >
                    {carregando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>Criando conta...</span>
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                        <span>Criar conta</span>
                      </>
                    )}
                  </Botao>
                )}
              </div>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Já tem uma conta?{' '}
              <Link
                href="/entrar"
                className={`font-semibold text-zinc-900 underline-offset-4 transition hover:underline focus:outline-none focus:ring-2 dark:text-zinc-100 ${
                  ehSegmentoFeminino ? 'focus:ring-rose-500/20 dark:focus:ring-rose-300/25' : 'focus:ring-zinc-900/20 dark:focus:ring-zinc-100/20'
                }`}
              >
                Fazer login
              </Link>
            </p>
          </section>

          <aside
            className={`rounded-3xl border bg-white/90 p-5 shadow-sm dark:bg-zinc-900/80 sm:p-6 lg:sticky lg:top-6 ${
              ehSegmentoFeminino ? 'border-rose-200 dark:border-rose-900/30' : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Tempo estimado desta etapa: {etapaAtualDetalhes.tempoEstimado}
            </div>

            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">O que você vai preencher agora</h3>

            <ul className="mt-3 space-y-3" aria-label="Checklist da etapa">
              {etapaAtualDetalhes.listaApoio.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <span
                    className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      ehSegmentoFeminino ? 'bg-rose-500 dark:bg-rose-400' : 'bg-zinc-900 dark:bg-zinc-100'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Por que isso é importante</h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{etapaAtualDetalhes.explicacao}</p>
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Próximo passo</h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {etapa === 3
                  ? 'Após criar a conta, você será direcionado para o onboarding completo com serviços, equipe e aparência da sua página.'
                  : `Depois desta etapa, vamos para “${etapasCadastro[etapa].titulo}”.`}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
