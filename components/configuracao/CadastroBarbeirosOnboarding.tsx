'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { RecorteImagem } from '@/components/ui/recorte-imagem'
import {
  User,
  Users,
  UserPlus,
  Phone,
  Mail,
  Check,
  X,
  Loader2,
  Camera,
  Percent,
  Key,
  Copy,
  ExternalLink,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  Trash2,
  Edit2,
  Crown,
  Plus,
  MessageCircle,
  Scissors,
  Hand,
  Sparkles,
  Eye,
  Star,
  ChevronDown
} from 'lucide-react'
import { obterCategoriasEspecialidades, obterTerminologia } from '@/lib/configuracoes-negocio'
import { TipoNegocio, Terminologia, ehTipoNegocioFeminino } from '@/lib/tipos-negocio'

interface Barbeiro {
  id: string
  nome: string
  email: string
  telefone: string
  foto_url: string | null
  especialidades: string[]
  ativo: boolean
  comissao_percentual: number
  token_acesso?: string
  is_proprietario?: boolean
}

interface CadastroBarbeirosOnboardingProps {
  tenantId: string
  onTotalChange?: (total: number) => void
  nomeProprietario?: string
  telefoneProprietario?: string
  tipoNegocio?: TipoNegocio
}

type EtapaFluxo = 'proprietario' | 'pergunta_equipe' | 'cadastro_equipe' | 'token' | 'lista'

/**
 * Gera token de acesso único
 */
const gerarTokenAcesso = (): string => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let token = ''
  for (let i = 0; i < 8; i++) {
    token += caracteres.charAt(Math.floor(Math.random() * caracteres.length))
  }
  return token
}

/**
 * Componente de cadastro de barbeiros no onboarding
 * Fluxo: proprietário → pergunta_equipe → cadastro_equipe → token → lista
 */
export function CadastroBarbeirosOnboarding({
  tenantId,
  onTotalChange,
  nomeProprietario = '',
  telefoneProprietario = '',
  tipoNegocio = 'barbearia'
}: CadastroBarbeirosOnboardingProps) {
  const { toast } = useToast()

  // Obter terminologia e categorias dinâmicas baseadas no tipo de negócio
  const terminologia = obterTerminologia(tipoNegocio)
  const categoriasEspecialidades = obterCategoriasEspecialidades(tipoNegocio)
  const ehSegmentoFeminino = ehTipoNegocioFeminino(tipoNegocio)
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [etapa, setEtapa] = useState<EtapaFluxo>('proprietario')
  const [tokenGerado, setTokenGerado] = useState<string | null>(null)
  const [tokenCopiado, setTokenCopiado] = useState(false)
  const [barbeiroAtual, setBarbeiroAtual] = useState<Barbeiro | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(
    tipoNegocio === 'nail_designer'
      ? 'Alongamento'
      : tipoNegocio === 'lash_designer'
        ? 'Extensão de Cílios'
        : 'Cortes'
  )
  const [novaEspecialidade, setNovaEspecialidade] = useState('')
  const [especialidadesCustomizadas, setEspecialidadesCustomizadas] = useState<string[]>([])

  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(null)
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null)

  const [formulario, setFormulario] = useState({
    nome: nomeProprietario,
    email: '',
    telefone: telefoneProprietario,
    foto_url: '',
    especialidades: [] as string[],
    comissao_percentual: 100
  })

  useEffect(() => {
    buscarBarbeiros()
  }, [tenantId])

  useEffect(() => {
    onTotalChange?.(barbeiros.filter(b => b.ativo).length)
  }, [barbeiros, onTotalChange])

  useEffect(() => {
    // Se já tem proprietário cadastrado, pular para pergunta da equipe ou lista
    if (!carregando && barbeiros.length > 0) {
      const temProprietario = barbeiros.some(b => b.is_proprietario)
      if (temProprietario) {
        setEtapa(barbeiros.length > 1 ? 'lista' : 'pergunta_equipe')
      }
    }
  }, [carregando, barbeiros])

  const buscarBarbeiros = async () => {
    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
        .order('nome')

      if (error) throw error
      setBarbeiros(data || [])
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao buscar profissionais' })
    } finally {
      setCarregando(false)
    }
  }

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const handleSelecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    if (!arquivo.type.startsWith('image/')) {
      toast({ tipo: 'erro', mensagem: 'Selecione uma imagem válida' })
      return
    }

    if (arquivo.size > 10 * 1024 * 1024) {
      toast({ tipo: 'erro', mensagem: 'A imagem deve ter no máximo 10MB' })
      return
    }

    const urlTemporaria = URL.createObjectURL(arquivo)
    setImagemParaRecortar(urlTemporaria)
    setArquivoOriginal(arquivo)

    if (inputFotoRef.current) {
      inputFotoRef.current.value = ''
    }
  }

  const handleRecorteConcluido = async (imagemRecortada: Blob) => {
    setUploadandoFoto(true)
    setImagemParaRecortar(null)

    try {
      const arquivoRecortado = new File(
        [imagemRecortada],
        arquivoOriginal?.name || 'foto-barbeiro.jpg',
        { type: 'image/jpeg' }
      )

      const formData = new FormData()
      formData.append('file', arquivoRecortado)
      formData.append('tenant_id', tenantId)
      formData.append('tipo', 'barbeiro')

      const resposta = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const dados = await resposta.json()
      if (dados.error) throw new Error(dados.error)

      setFormulario({ ...formulario, foto_url: dados.url })
      toast({ tipo: 'sucesso', mensagem: 'Foto enviada com sucesso' })
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao enviar foto' })
    } finally {
      setUploadandoFoto(false)
      setArquivoOriginal(null)
    }
  }

  const handleCancelarRecorte = () => {
    if (imagemParaRecortar) {
      URL.revokeObjectURL(imagemParaRecortar)
    }
    setImagemParaRecortar(null)
    setArquivoOriginal(null)
  }

  const toggleEspecialidade = (especialidade: string) => {
    setFormulario(prev => ({
      ...prev,
      especialidades: prev.especialidades.includes(especialidade)
        ? prev.especialidades.filter(e => e !== especialidade)
        : [...prev.especialidades, especialidade]
    }))
  }

  // Adiciona especialidade customizada
  const adicionarEspecialidadeCustomizada = () => {
    if (!novaEspecialidade.trim()) return
    const nova = novaEspecialidade.trim()
    if (!especialidadesCustomizadas.includes(nova)) {
      setEspecialidadesCustomizadas([...especialidadesCustomizadas, nova])
    }
    if (!formulario.especialidades.includes(nova)) {
      setFormulario(prev => ({
        ...prev,
        especialidades: [...prev.especialidades, nova]
      }))
    }
    setNovaEspecialidade('')
  }

  // Validação de nome completo (nome e sobrenome)
  const validarNomeCompleto = (nome: string): { valido: boolean; mensagem?: string } => {
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      return { valido: false, mensagem: 'Digite seu nome completo' }
    }
    const partes = nomeLimpo.split(' ').filter(p => p.length > 0)
    if (partes.length < 2) {
      return { valido: false, mensagem: 'Digite seu nome e sobrenome' }
    }
    if (partes[0].length < 2) {
      return { valido: false, mensagem: 'O nome deve ter pelo menos 2 caracteres' }
    }
    return { valido: true }
  }

  // Gera email temporário baseado no nome
  const gerarEmailTemporario = (nome: string): string => {
    const nomeFormatado = nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .trim()
      .replace(/\s+/g, '.')
    const timestamp = Date.now().toString(36)
    return `${nomeFormatado}.${timestamp}@temp.barberhub.com`
  }

  // Cadastra o proprietário (barbeiro admin)
  const cadastrarProprietario = async () => {
    const validacaoNome = validarNomeCompleto(formulario.nome)
    if (!validacaoNome.valido) {
      toast({ tipo: 'erro', mensagem: validacaoNome.mensagem || 'Nome inválido' })
      return
    }

    setSalvando(true)
    try {
      // Gera email e telefone temporários se não fornecidos (campos obrigatórios no banco)
      const emailFinal = formulario.email.trim() || gerarEmailTemporario(formulario.nome)
      const telefoneFinal = formulario.telefone.replace(/\D/g, '') || '00000000000'

      const { data, error } = await supabase
        .from('barbeiros')
        .insert([{
          tenant_id: tenantId,
          nome: formulario.nome.trim(),
          email: emailFinal,
          telefone: telefoneFinal,
          foto_url: formulario.foto_url || null,
          especialidades: formulario.especialidades,
          comissao_percentual: 100,
          is_proprietario: true,
          ativo: true
        }])
        .select()
        .single()

      if (error) {
        console.error('[CadastroBarbeiros] Erro ao cadastrar:', error)
        // Mensagens de erro mais específicas
        if (error.code === '23505') {
          toast({ tipo: 'erro', mensagem: 'Já existe um profissional com este e-mail' })
        } else if (error.code === '23503') {
          toast({ tipo: 'erro', mensagem: 'Erro de referência. Tente novamente.' })
        } else {
          toast({ tipo: 'erro', mensagem: 'Erro ao salvar perfil. Tente novamente.' })
        }
        return
      }

      setBarbeiros([...barbeiros, data])
      setEtapa('pergunta_equipe')
      resetarFormulario()
      toast({ tipo: 'sucesso', mensagem: 'Seu perfil foi criado!' })
    } catch (erro: any) {
      console.error('[CadastroBarbeiros] Erro inesperado:', erro)
      toast({ tipo: 'erro', mensagem: erro?.message || 'Erro ao salvar perfil. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  // Valida telefone (mínimo 10 dígitos)
  const validarTelefone = (telefone: string): { valido: boolean; mensagem?: string } => {
    const numeros = telefone.replace(/\D/g, '')
    if (!numeros) {
      return { valido: false, mensagem: 'Digite o número de WhatsApp' }
    }
    if (numeros.length < 10) {
      return { valido: false, mensagem: 'O telefone deve ter pelo menos 10 dígitos' }
    }
    if (numeros.length > 11) {
      return { valido: false, mensagem: 'O telefone deve ter no máximo 11 dígitos' }
    }
    return { valido: true }
  }

  // Adiciona barbeiro da equipe
  const adicionarBarbeiroEquipe = async () => {
    // Validação do nome
    const validacaoNome = validarNomeCompleto(formulario.nome)
    if (!validacaoNome.valido) {
      toast({ tipo: 'erro', mensagem: validacaoNome.mensagem || 'Nome inválido' })
      return
    }

    // Validação do telefone
    const validacaoTelefone = validarTelefone(formulario.telefone)
    if (!validacaoTelefone.valido) {
      toast({ tipo: 'erro', mensagem: validacaoTelefone.mensagem || 'Telefone inválido' })
      return
    }

    setSalvando(true)
    try {
      const novoToken = gerarTokenAcesso()
      const emailFinal = formulario.email.trim() || gerarEmailTemporario(formulario.nome)

      const { data, error } = await supabase
        .from('barbeiros')
        .insert([{
          tenant_id: tenantId,
          nome: formulario.nome.trim(),
          email: emailFinal,
          telefone: formulario.telefone.replace(/\D/g, ''),
          foto_url: formulario.foto_url || null,
          especialidades: formulario.especialidades,
          comissao_percentual: formulario.comissao_percentual,
          token_acesso: novoToken,
          token_ativo: true,
          is_proprietario: false,
          ativo: true
        }])
        .select()
        .single()

      if (error) {
        console.error('[CadastroBarbeiros] Erro ao cadastrar equipe:', error)
        if (error.code === '23505') {
          if (error.message?.includes('email')) {
            toast({ tipo: 'erro', mensagem: 'Já existe um profissional com este e-mail' })
          } else if (error.message?.includes('token')) {
            toast({ tipo: 'erro', mensagem: 'Erro ao gerar token. Tente novamente.' })
          } else {
            toast({ tipo: 'erro', mensagem: 'Este profissional já está cadastrado' })
          }
        } else {
          toast({ tipo: 'erro', mensagem: `Erro ao adicionar ${terminologia.profissional.singular.toLowerCase()}. Tente novamente.` })
        }
        return
      }

      // Enviar mensagem de boas-vindas via WhatsApp (bot)
      const telefoneNumeros = formulario.telefone.replace(/\D/g, '')
      if (data && telefoneNumeros) {
        try {
          const BOT_URL = process.env.NEXT_PUBLIC_BOT_URL || 'https://bot-barberhub.fly.dev'
          await fetch(`${BOT_URL}/api/mensagens/boas-vindas-barbeiro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barbeiro_id: data.id }),
          })
          console.log('[CadastroBarbeiros] Mensagem de boas-vindas enviada ao barbeiro')
        } catch (erroBot) {
          console.warn('[CadastroBarbeiros] Não foi possível enviar WhatsApp (bot offline?):', erroBot)
        }
      }

      setBarbeiros([...barbeiros, data])
      setBarbeiroAtual(data)
      setTokenGerado(novoToken)
      setEtapa('token')
      resetarFormulario()
      toast({ tipo: 'sucesso', mensagem: `${terminologia.profissional.singular} adicionado${ehSegmentoFeminino ? 'a' : ''} com sucesso!` })
    } catch (erro: any) {
      console.error('[CadastroBarbeiros] Erro inesperado:', erro)
      toast({ tipo: 'erro', mensagem: erro?.message || `Erro ao adicionar ${terminologia.profissional.singular.toLowerCase()}` })
    } finally {
      setSalvando(false)
    }
  }

  const atualizarBarbeiro = async (id: string) => {
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('barbeiros')
        .update({
          nome: formulario.nome.trim(),
          email: formulario.email.trim(),
          telefone: formulario.telefone.replace(/\D/g, ''),
          foto_url: formulario.foto_url || null,
          especialidades: formulario.especialidades,
          comissao_percentual: formulario.comissao_percentual
        })
        .eq('id', id)

      if (error) throw error

      setBarbeiros(barbeiros.map(b =>
        b.id === id
          ? { ...b, ...formulario, telefone: formulario.telefone.replace(/\D/g, '') }
          : b
      ))
      setEditando(null)
      setEtapa('lista')
      resetarFormulario()
      toast({ tipo: 'sucesso', mensagem: `${terminologia.profissional.singular} atualizado${ehSegmentoFeminino ? 'a' : ''}` })
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: `Erro ao atualizar ${terminologia.profissional.singular.toLowerCase()}` })
    } finally {
      setSalvando(false)
    }
  }

  const removerBarbeiro = async (id: string) => {
    const barbeiro = barbeiros.find(b => b.id === id)
    if (barbeiro?.is_proprietario) {
      toast({ tipo: 'erro', mensagem: 'Não é possível remover o proprietário' })
      return
    }
    if (!confirm(`Remover ${ehSegmentoFeminino ? 'esta' : 'este'} ${terminologia.profissional.singular.toLowerCase()}?`)) return

    try {
      const { error } = await supabase
        .from('barbeiros')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error
      setBarbeiros(barbeiros.filter(b => b.id !== id))

      if (barbeiros.filter(b => b.id !== id && !b.is_proprietario).length === 0) {
        setEtapa('pergunta_equipe')
      }
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: `Erro ao remover ${terminologia.profissional.singular.toLowerCase()}` })
    }
  }

  const iniciarEdicao = (barbeiro: Barbeiro) => {
    setEditando(barbeiro.id)
    setFormulario({
      nome: barbeiro.nome,
      email: barbeiro.email,
      telefone: formatarTelefone(barbeiro.telefone),
      foto_url: barbeiro.foto_url || '',
      especialidades: barbeiro.especialidades || [],
      comissao_percentual: barbeiro.comissao_percentual || 50
    })
    setEtapa(barbeiro.is_proprietario ? 'proprietario' : 'cadastro_equipe')
  }

  const resetarFormulario = () => {
    setFormulario({
      nome: '',
      email: '',
      telefone: '',
      foto_url: '',
      especialidades: [],
      comissao_percentual: 50
    })
  }

  const copiarToken = async () => {
    if (!tokenGerado) return
    try {
      await navigator.clipboard.writeText(tokenGerado)
      setTokenCopiado(true)
      setTimeout(() => setTokenCopiado(false), 2000)
    } catch {
      toast({ tipo: 'erro', mensagem: 'Erro ao copiar' })
    }
  }

  const linkAcesso = typeof window !== 'undefined'
    ? `${window.location.origin}/colaborador/entrar`
    : '/colaborador/entrar'

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* ETAPA 1: Cadastro do proprietário */}
        {etapa === 'proprietario' && (
          <EtapaCadastroProprietario
            formulario={formulario}
            setFormulario={setFormulario}
            salvando={salvando}
            uploadandoFoto={uploadandoFoto}
            inputFotoRef={inputFotoRef}
            onSelecionarFoto={handleSelecionarFoto}
            onToggleEspecialidade={toggleEspecialidade}
            onSalvar={editando ? () => atualizarBarbeiro(editando) : cadastrarProprietario}
            formatarTelefone={formatarTelefone}
            categoriasEspecialidades={categoriasEspecialidades}
            especialidadesCustomizadas={especialidadesCustomizadas}
            novaEspecialidade={novaEspecialidade}
            setNovaEspecialidade={setNovaEspecialidade}
            onAdicionarEspecialidade={adicionarEspecialidadeCustomizada}
            categoriaAberta={categoriaAberta}
            setCategoriaAberta={setCategoriaAberta}
            editando={!!editando}
          />
        )}

        {/* ETAPA 2: Pergunta sobre equipe */}
        {etapa === 'pergunta_equipe' && (
          <EtapaPerguntaEquipe
            onSim={() => setEtapa('cadastro_equipe')}
            onNao={() => setEtapa('lista')}
            tipoNegocio={tipoNegocio}
            terminologia={terminologia}
          />
        )}

        {/* ETAPA 3: Formulário de cadastro da equipe */}
        {etapa === 'cadastro_equipe' && (
          <EtapaFormularioEquipe
            formulario={formulario}
            setFormulario={setFormulario}
            editando={editando}
            salvando={salvando}
            uploadandoFoto={uploadandoFoto}
            inputFotoRef={inputFotoRef}
            onSelecionarFoto={handleSelecionarFoto}
            onToggleEspecialidade={toggleEspecialidade}
            onSalvar={() => editando ? atualizarBarbeiro(editando) : adicionarBarbeiroEquipe()}
            onCancelar={() => {
              setEditando(null)
              resetarFormulario()
              setEtapa(barbeiros.filter(b => !b.is_proprietario).length > 0 ? 'lista' : 'pergunta_equipe')
            }}
            formatarTelefone={formatarTelefone}
            categoriasEspecialidades={categoriasEspecialidades}
            especialidadesCustomizadas={especialidadesCustomizadas}
            novaEspecialidade={novaEspecialidade}
            setNovaEspecialidade={setNovaEspecialidade}
            onAdicionarEspecialidade={adicionarEspecialidadeCustomizada}
            categoriaAberta={categoriaAberta}
            setCategoriaAberta={setCategoriaAberta}
            terminologia={terminologia}
            linkAcesso={linkAcesso}
          />
        )}

        {/* ETAPA 4: Token gerado */}
        {etapa === 'token' && tokenGerado && barbeiroAtual && (
          <EtapaTokenGerado
            barbeiro={barbeiroAtual}
            token={tokenGerado}
            tokenCopiado={tokenCopiado}
            linkAcesso={linkAcesso}
            terminologia={terminologia}
            onCopiar={copiarToken}
            onContinuar={() => {
              setTokenGerado(null)
              setBarbeiroAtual(null)
              setEtapa('lista')
            }}
            onAdicionarOutro={() => {
              setTokenGerado(null)
              setBarbeiroAtual(null)
              setEtapa('cadastro_equipe')
            }}
          />
        )}

        {/* ETAPA 5: Lista de barbeiros */}
        {etapa === 'lista' && (
          <EtapaListaBarbeiros
            barbeiros={barbeiros}
            onAdicionar={() => setEtapa('cadastro_equipe')}
            onEditar={iniciarEdicao}
            onRemover={removerBarbeiro}
            formatarTelefone={formatarTelefone}
            terminologia={terminologia}
          />
        )}
      </AnimatePresence>

      {/* Modal de Recorte */}
      {imagemParaRecortar && (
        <RecorteImagem
          imagemOriginal={imagemParaRecortar}
          onRecorteConcluido={handleRecorteConcluido}
          onCancelar={handleCancelarRecorte}
          aspectoRecorte={1}
          formatoCircular={true}
        />
      )}
    </div>
  )
}

// =============================================
// COMPONENTES DAS ETAPAS (MODULARES)
// =============================================

// Interface para props de especialidades
interface EspecialidadesProps {
  categoriasEspecialidades: Record<string, string[]>
  especialidadesCustomizadas: string[]
  especialidadesSelecionadas: string[]
  novaEspecialidade: string
  setNovaEspecialidade: (valor: string) => void
  onToggleEspecialidade: (esp: string) => void
  onAdicionarEspecialidade: () => void
  categoriaAberta: string | null
  setCategoriaAberta: (cat: string | null) => void
}

/**
 * Ícones por categoria
 */
const obterIconeCategoria = (categoria: string) => {
  const catLower = categoria.toLowerCase()
  if (catLower.includes('cabel') || catLower.includes('barb') || catLower.includes('corte')) return <Scissors className="w-4 h-4" />
  if (catLower.includes('sobrancelha') || catLower.includes('lash') || catLower.includes('cíl')) return <Eye className="w-4 h-4" />
  if (catLower.includes('unha') || catLower.includes('nail')) return <Hand className="w-4 h-4" />
  if (catLower.includes('químic') || catLower.includes('cor') || catLower.includes('tint')) return <Sparkles className="w-4 h-4" />
  return <Star className="w-4 h-4" />
}

/**
 * Componente de seleção de especialidades com categorias
 */
function SeletorEspecialidades({
  categoriasEspecialidades,
  especialidadesCustomizadas,
  especialidadesSelecionadas,
  novaEspecialidade,
  setNovaEspecialidade,
  onToggleEspecialidade,
  onAdicionarEspecialidade,
  categoriaAberta,
  setCategoriaAberta
}: EspecialidadesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Especialidades <span className="text-xs text-amber-500 font-normal">* Selecione ao menos 1</span>
        </label>
        {especialidadesSelecionadas.length > 0 && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
            {especialidadesSelecionadas.length} selecionada(s)
          </span>
        )}
      </div>

      {/* Categorias */}
      <div className="space-y-2">
        {Object.entries(categoriasEspecialidades).map(([categoria, especialidades]) => (
          <div key={categoria} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={() => setCategoriaAberta(categoriaAberta === categoria ? null : categoria)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${categoriaAberta === categoria ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                  {obterIconeCategoria(categoria)}
                </div>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{categoria}</span>
              </div>
              <div className="flex items-center gap-3 border-l border-zinc-200 dark:border-zinc-700 pl-3">
                {especialidadesSelecionadas.filter(e => especialidades.includes(e)).length > 0 && (
                  <span className="w-5 h-5 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full">
                    {especialidadesSelecionadas.filter(e => especialidades.includes(e)).length}
                  </span>
                )}
                <motion.div
                  animate={{ rotate: categoriaAberta === categoria ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </motion.div>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {categoriaAberta === categoria && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/20 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-wrap gap-2.5">
                      {especialidades.map((esp) => (
                        <button
                          key={esp}
                          type="button"
                          onClick={() => onToggleEspecialidade(esp)}
                          className={`relative flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl border transition-all active:scale-[0.98] ${especialidadesSelecionadas.includes(esp)
                            ? 'bg-zinc-900 shadow-sm dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 shadow-sm'
                            }`}
                        >
                          {esp}
                          {especialidadesSelecionadas.includes(esp) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-white/20 dark:bg-black/10 rounded-full p-0.5"
                            >
                              <Check className="w-3 h-3" />
                            </motion.div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Especialidades customizadas */}
      {especialidadesCustomizadas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {especialidadesCustomizadas.map((esp) => (
            <button
              key={esp}
              type="button"
              onClick={() => onToggleEspecialidade(esp)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${especialidadesSelecionadas.includes(esp)
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-600'
                }`}
            >
              <Check className="w-3 h-3 inline mr-1" />
              {esp}
            </button>
          ))}
        </div>
      )}

      {/* Adicionar nova especialidade */}
      <div className="flex gap-2">
        <input
          type="text"
          value={novaEspecialidade}
          onChange={(e) => setNovaEspecialidade(e.target.value)}
          placeholder="Adicionar especialidade..."
          className="flex-1 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdicionarEspecialidade())}
        />
        <button
          type="button"
          onClick={onAdicionarEspecialidade}
          disabled={!novaEspecialidade.trim()}
          className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Selecionadas */}
      {especialidadesSelecionadas.length > 0 && (
        <p className="text-xs text-zinc-600 dark:text-zinc-500">
          {especialidadesSelecionadas.length} especialidade(s) selecionada(s)
        </p>
      )}
    </div>
  )
}

/**
 * Etapa 1: Cadastro do proprietário (barbeiro admin)
 */
function EtapaCadastroProprietario({
  formulario,
  setFormulario,
  salvando,
  uploadandoFoto,
  inputFotoRef,
  onSelecionarFoto,
  onToggleEspecialidade,
  onSalvar,
  formatarTelefone,
  categoriasEspecialidades,
  especialidadesCustomizadas,
  novaEspecialidade,
  setNovaEspecialidade,
  onAdicionarEspecialidade,
  categoriaAberta,
  setCategoriaAberta,
  editando
}: {
  formulario: {
    nome: string
    email: string
    telefone: string
    foto_url: string
    especialidades: string[]
    comissao_percentual: number
  }
  setFormulario: React.Dispatch<React.SetStateAction<typeof formulario>>
  salvando: boolean
  uploadandoFoto: boolean
  inputFotoRef: React.RefObject<HTMLInputElement>
  onSelecionarFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggleEspecialidade: (esp: string) => void
  onSalvar: () => void
  formatarTelefone: (valor: string) => string
  categoriasEspecialidades: Record<string, string[]>
  especialidadesCustomizadas: string[]
  novaEspecialidade: string
  setNovaEspecialidade: (valor: string) => void
  onAdicionarEspecialidade: () => void
  categoriaAberta: string | null
  setCategoriaAberta: (cat: string | null) => void
  editando: boolean
}) {
  return (
    <motion.div
      key="proprietario"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Crown className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          {editando ? 'Editar seu Perfil' : 'Configure seu Perfil'}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-md mx-auto">
          Como proprietário, você terá acesso total ao painel administrativo em <strong>/admin</strong>
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-6">
        {/* Foto */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
              {formulario.foto_url ? (
                <Image
                  src={formulario.foto_url}
                  alt="Foto"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <User className="w-8 h-8 text-zinc-500 dark:text-zinc-600" />
              )}
              {uploadandoFoto && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => inputFotoRef.current?.click()}
              disabled={uploadandoFoto}
              className="absolute -bottom-1 -right-1 p-2 bg-zinc-700 rounded-full hover:bg-zinc-600 transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onSelecionarFoto}
              className="hidden"
            />
          </div>
          <div className="text-sm">
            <p className="text-zinc-700 dark:text-zinc-300">Sua foto</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-500">Opcional • JPG, PNG, WebP</p>
          </div>
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Seu Nome Completo *
            </label>
            <input
              type="text"
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              placeholder="Ex: João Silva"
              className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-colors ${formulario.nome.trim() && formulario.nome.trim().split(' ').filter(p => p.length > 0).length < 2
                ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-500/20'
                : 'border-zinc-200 dark:border-zinc-700 focus:ring-zinc-900/20 dark:focus:ring-white/20'
                }`}
            />
            {formulario.nome.trim() && formulario.nome.trim().split(' ').filter(p => p.length > 0).length < 2 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Digite seu nome e sobrenome
              </p>
            )}
            {!formulario.nome.trim() && (
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                Informe nome e sobrenome para identificação
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Telefone/WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-500" />
              <input
                type="tel"
                value={formulario.telefone}
                onChange={(e) => setFormulario({ ...formulario, telefone: formatarTelefone(e.target.value) })}
                placeholder="(00) 00000-0000"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20"
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
              Opcional para o proprietário
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-500" />
              <input
                type="email"
                value={formulario.email}
                onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20"
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
              Opcional • Usado para recuperação de acesso
            </p>
          </div>
        </div>

        {/* Especialidades */}
        <SeletorEspecialidades
          categoriasEspecialidades={categoriasEspecialidades}
          especialidadesCustomizadas={especialidadesCustomizadas}
          especialidadesSelecionadas={formulario.especialidades}
          novaEspecialidade={novaEspecialidade}
          setNovaEspecialidade={setNovaEspecialidade}
          onToggleEspecialidade={onToggleEspecialidade}
          onAdicionarEspecialidade={onAdicionarEspecialidade}
          categoriaAberta={categoriaAberta}
          setCategoriaAberta={setCategoriaAberta}
        />

        {/* Botão */}
        <button
          onClick={onSalvar}
          disabled={salvando || !formulario.nome.trim() || formulario.especialidades.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {salvando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          {editando ? 'Salvar Alterações' : 'Salvar Meu Perfil'}
        </button>
      </div>
    </motion.div>
  )
}

/**
 * SVGs personalizados para UI
 */
const SvgEquipe = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M16 21V19C16 17.8954 15.1046 17 14 17H5C3.89543 17 3 17.8954 3 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 13C11.433 13 13 11.433 13 9.5C13 7.567 11.433 6 9.5 6C7.567 6 6 7.567 6 9.5C6 11.433 7.567 13 9.5 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 21V19C20.9961 17.8996 20.1039 17.0049 19 17H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 6.09631C16.1738 6.40251 17.0344 7.45862 17.0344 8.70613C17.0344 9.95364 16.1738 11.0098 15 11.316" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17.5" cy="5.5" r="3.5" fill="currentColor" opacity="0.2" />
    <circle cx="5" cy="14" r="2" fill="currentColor" opacity="0.2" />
  </svg>
)

const SvgChaveAcesso = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M13.6262 6.64177C14.0044 6.26359 14.6174 6.26359 14.9956 6.64177L21.3592 13.0054C21.7374 13.3836 21.7374 13.9966 21.3592 14.3748L15.3592 20.3748C14.9811 20.753 14.368 20.753 13.9898 20.3748L7.62621 14.0112C7.24803 13.633 7.24803 13.02 7.62621 12.6418L13.6262 6.64177Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9.50005 7L4.50005 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 4.5L5.49995 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 11.5L17.5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="16" cy="11.5" r="1.5" fill="currentColor" />
    <path d="M7 16V18H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 13V15H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Etapa 2: Pergunta se tem equipe
 */
function EtapaPerguntaEquipe({
  onSim,
  onNao,
  tipoNegocio,
  terminologia
}: {
  onSim: () => void
  onNao: () => void
  tipoNegocio: TipoNegocio
  terminologia: ReturnType<typeof obterTerminologia>
}) {
  const ehSegmentoFeminino = ehTipoNegocioFeminino(tipoNegocio)
  const profissionalPlural = terminologia.profissional.plural.toLowerCase()
  const profissionalSingular = terminologia.profissional.singular.toLowerCase()

  return (
    <motion.div
      key="pergunta_equipe"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="max-w-md mx-auto"
    >
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">

        {/* Header decorativo da notificação */}
        <div className="h-2 bg-gradient-to-r from-zinc-800 to-zinc-900 dark:from-zinc-200 dark:to-white w-full"></div>

        <div className="p-8 text-center relative z-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-20 h-20 mx-auto bg-zinc-50 dark:bg-zinc-800/80 rounded-full flex items-center justify-center mb-6 shadow-inner border border-zinc-100 dark:border-zinc-700/50"
          >
            <SvgEquipe className="w-10 h-10 text-zinc-900 dark:text-white" />
          </motion.div>

          <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-3">
            Trabalha com {profissionalPlural}?
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base leading-relaxed mb-8">
            Adicione sua equipe e deixe que cada {profissionalSingular} gerencie a própria agenda. Eles receberão o acesso automaticamente por <span className="font-medium text-emerald-600 dark:text-emerald-400">WhatsApp</span>.
          </p>

          <div className="space-y-3">
            <button
              onClick={onSim}
              className="w-full group relative flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300"></div>
              <UserPlus className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Sim, adicionar {profissionalPlural}</span>
            </button>
            <button
              onClick={onNao}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-medium hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors active:scale-[0.98]"
            >
              Não, sou só eu por enquanto
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Etapa 3: Formulário de cadastro da equipe
 */
function EtapaFormularioEquipe({
  formulario,
  setFormulario,
  editando,
  salvando,
  uploadandoFoto,
  inputFotoRef,
  onSelecionarFoto,
  onToggleEspecialidade,
  onSalvar,
  onCancelar,
  formatarTelefone,
  categoriasEspecialidades,
  especialidadesCustomizadas,
  novaEspecialidade,
  setNovaEspecialidade,
  onAdicionarEspecialidade,
  categoriaAberta,
  setCategoriaAberta,
  terminologia,
  linkAcesso
}: {
  formulario: {
    nome: string
    email: string
    telefone: string
    foto_url: string
    especialidades: string[]
    comissao_percentual: number
  }
  setFormulario: React.Dispatch<React.SetStateAction<typeof formulario>>
  editando: string | null
  salvando: boolean
  uploadandoFoto: boolean
  inputFotoRef: React.RefObject<HTMLInputElement>
  onSelecionarFoto: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggleEspecialidade: (esp: string) => void
  onSalvar: () => void
  onCancelar: () => void
  formatarTelefone: (valor: string) => string
  categoriasEspecialidades: Record<string, string[]>
  especialidadesCustomizadas: string[]
  novaEspecialidade: string
  setNovaEspecialidade: (valor: string) => void
  onAdicionarEspecialidade: () => void
  categoriaAberta: string | null
  setCategoriaAberta: (cat: string | null) => void
  terminologia: Terminologia
  linkAcesso: string
}) {
  const artigoProfissional = terminologia.profissional.artigo
  const tituloNovoProfissional = editando
    ? `Editar ${terminologia.profissional.singular}`
    : `Novo membro: ${terminologia.profissional.singular}`

  return (
    <motion.div
      key="cadastro_equipe"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">

        {/* Notificação/Header da Etapa */}
        <div className="flex items-start sm:items-center gap-4 p-5 sm:p-6 bg-zinc-50 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-700">
            <UserPlus className="w-5 h-5 text-zinc-900 dark:text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {tituloNovoProfissional}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
              Ao salvar, enviaremos as credenciais automaticamente pelo WhatsApp para acesso ao painel.
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Foto Minimalista */}
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 transition-colors">
                {formulario.foto_url ? (
                  <Image
                    src={formulario.foto_url}
                    alt="Foto"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <Camera className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                )}
                {uploadandoFoto && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => inputFotoRef.current?.click()}
                disabled={uploadandoFoto}
                className="absolute inset-0 w-full h-full rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/40 text-white text-xs font-medium cursor-pointer"
              >
                Alterar
              </button>
              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onSelecionarFoto}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">Foto de Perfil</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Recomendado para identificar o profissional no agendamento</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>Nome Completo do Profissional</span>
                <span className="text-xs text-amber-500 font-normal">Obrigatório</span>
              </label>
              <input
                type="text"
                value={formulario.nome}
                onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                placeholder="Ex: Carlos Mendes"
                className="w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <span>WhatsApp</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-medium">Usado p/ login</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formulario.telefone}
                  onChange={(e) => setFormulario({ ...formulario, telefone: formatarTelefone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                  className="w-full pl-4 pr-4 py-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none block transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                E-mail <span className="text-zinc-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="email"
                value={formulario.email}
                onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-white rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2 p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-3">
                Comissão por Atendimento (%)
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 w-full sm:w-auto">
                  {[30, 40, 50, 60, 70].map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setFormulario({ ...formulario, comissao_percentual: valor })}
                      className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${formulario.comissao_percentual === valor
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                    >
                      {valor}%
                    </button>
                  ))}
                </div>
                <div className="flex-1 relative max-w-[120px]">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formulario.comissao_percentual}
                    onChange={(e) => setFormulario({ ...formulario, comissao_percentual: Number(e.target.value) })}
                    className="w-full pr-8 pl-4 py-2 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          <SeletorEspecialidades
            categoriasEspecialidades={categoriasEspecialidades}
            especialidadesCustomizadas={especialidadesCustomizadas}
            especialidadesSelecionadas={formulario.especialidades}
            novaEspecialidade={novaEspecialidade}
            setNovaEspecialidade={setNovaEspecialidade}
            onToggleEspecialidade={onToggleEspecialidade}
            onAdicionarEspecialidade={onAdicionarEspecialidade}
            categoriaAberta={categoriaAberta}
            setCategoriaAberta={setCategoriaAberta}
          />
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 flex-wrap">
          <button
            onClick={onCancelar}
            className="px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando || !formulario.nome.trim() || formulario.especialidades.length === 0}
            className="px-6 py-2.5 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center justify-center min-w-[140px] disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {salvando ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</span>
            ) : (
              <span className="flex items-center gap-2"><Check className="w-4 h-4" /> {editando ? 'Salvar Edição' : 'Salvar Profissional'}</span>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Etapa 4: Token gerado com instruções (estilo Ticket/Card)
 */
function EtapaTokenGerado({
  barbeiro,
  token,
  tokenCopiado,
  linkAcesso,
  terminologia,
  onCopiar,
  onContinuar,
  onAdicionarOutro
}: {
  barbeiro: Barbeiro
  token: string
  tokenCopiado: boolean
  linkAcesso: string
  terminologia: Terminologia
  onCopiar: () => void
  onContinuar: () => void
  onAdicionarOutro: () => void
}) {
  return (
    <motion.div
      key="token"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="max-w-md mx-auto"
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

        <div className="p-8 pb-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
            className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-500/20"
          >
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </motion.div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
            Acesso Liberado!
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {barbeiro.nome} receberá o login via WhatsApp em instantes.
          </p>
        </div>

        {/* Ticket Area */}
        <div className="px-6 pb-8 relative">
          <div className="absolute -left-3 top-0 bottom-0 border-r-2 border-dashed border-zinc-200 dark:border-zinc-800"></div>
          <div className="absolute -right-3 top-0 bottom-0 border-l-2 border-dashed border-zinc-200 dark:border-zinc-800"></div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-700/50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Credencial de</p>
                <p className="font-semibold text-zinc-900 dark:text-white truncate max-w-[150px]">{barbeiro.nome}</p>
              </div>
              <SvgChaveAcesso className="w-8 h-8 text-amber-500" />
            </div>

            <div className="mb-4">
              <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Código PIN único</p>
              <div className="bg-white dark:bg-zinc-900 rounded-xl py-3 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-inner cursor-pointer" onClick={onCopiar}>
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-[0.2em] sm:tracking-[0.4em] text-zinc-900 dark:text-white">
                  {token}
                </span>
                <Copy className={`w-4 h-4 ml-3 transition-colors ${tokenCopiado ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-600'}`} />
              </div>
            </div>

            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mt-2">
              Login em: <span className="font-medium text-blue-600 dark:text-blue-400 truncate break-all block mt-1">{linkAcesso}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onAdicionarOutro}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-xl font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-sm">Adicionar outr{terminologia.profissional.artigo === 'a' ? 'a' : 'o'}</span>
        </button>
        <button
          onClick={onContinuar}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
        >
          <span className="text-sm">Continuar Configuração</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Etapa 5: Lista de barbeiros cadastrados (ilimitados) - NOVO VISUAL LISTA LIMPA
 */
function EtapaListaBarbeiros({
  barbeiros,
  onAdicionar,
  onEditar,
  onRemover,
  formatarTelefone,
  terminologia
}: {
  barbeiros: Barbeiro[]
  onAdicionar: () => void
  onEditar: (barbeiro: Barbeiro) => void
  onRemover: (id: string) => void
  formatarTelefone: (valor: string) => string
  terminologia: Terminologia
}) {
  const proprietario = barbeiros.find(b => b.is_proprietario)
  const equipe = barbeiros.filter(b => !b.is_proprietario)

  return (
    <motion.div
      key="lista"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="max-w-xl mx-auto space-y-8"
    >
      {/* Header Profissionais */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-6 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-zinc-900 dark:text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Equipe</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {barbeiros.length} {barbeiros.length === 1
                ? terminologia.profissional.singular.toLowerCase()
                : terminologia.profissional.plural.toLowerCase()} no total
            </p>
          </div>
        </div>
        <button
          onClick={onAdicionar}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm active:scale-[0.98]"
        >
          <UserPlus className="w-4 h-4" />
          Novo Membro
        </button>
      </div>

      <div className="space-y-6">
        {/* Proprietário */}
        {proprietario && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">
              SEU PERFIL (ADMIN)
            </h4>
            <div className="group relative bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:shadow-md transition-shadow overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>

              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 flex-shrink-0">
                {proprietario.foto_url ? (
                  <Image src={proprietario.foto_url} alt={proprietario.nome} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Crown className="w-6 h-6 text-amber-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-zinc-900 dark:text-white truncate text-base">{proprietario.nome}</p>
                  <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md">Admin</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{formatarTelefone(proprietario.telefone)}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Acesso via <strong className="text-zinc-700 dark:text-zinc-300 font-medium">/admin</strong></span>
                </div>
              </div>

              <button
                onClick={() => onEditar(proprietario)}
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-colors shrink-0"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Equipe */}
        {equipe.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
              DEMAIS MEMBROS
              <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] text-zinc-500">{equipe.length}</span>
            </h4>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {equipe.map((barbeiro) => (
                  <div key={barbeiro.id} className="group p-4 sm:p-5 flex items-center gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent group-hover:border-zinc-200 dark:group-hover:border-zinc-700 transition-colors flex-shrink-0">
                      {barbeiro.foto_url ? (
                        <Image src={barbeiro.foto_url} alt={barbeiro.nome} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-5 h-5 text-zinc-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-white truncate">{barbeiro.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        <span className="truncate">{formatarTelefone(barbeiro.telefone)}</span>

                        <div className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            <Percent className="w-3 h-3 inline pb-0.5" />
                            {barbeiro.comissao_percentual}%
                          </span>
                        </div>

                        {barbeiro.token_acesso && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 hidden sm:block"></span>
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs shrink-0 max-w-[80px]">
                              <Key className="w-3 h-3 text-zinc-400" />
                              <span className="truncate font-mono">{barbeiro.token_acesso}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                      <button
                        onClick={() => onEditar(barbeiro)}
                        className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemover(barbeiro.id)}
                        className="p-2.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State Simplificado */}
        {equipe.length === 0 && proprietario && (
          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="w-12 h-12 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <UserPlus className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-white text-sm mb-1">
              Trabalha com outras pessoas?
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-[200px] mx-auto">
              Adicione mais {terminologia.profissional.plural.toLowerCase()} para gerirem a própria agenda.
            </p>
            <button
              onClick={onAdicionar}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
            >
              Adicionar agora
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
