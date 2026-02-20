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
  Sparkles
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
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Especialidades
      </label>
      
      {/* Categorias */}
      <div className="space-y-2">
        {Object.entries(categoriasEspecialidades).map(([categoria, especialidades]) => (
          <div key={categoria} className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setCategoriaAberta(categoriaAberta === categoria ? null : categoria)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{categoria}</span>
              <div className="flex items-center gap-2">
                {especialidadesSelecionadas.filter(e => especialidades.includes(e)).length > 0 && (
                  <span className="px-2 py-0.5 bg-zinc-900 dark:bg-white text-white dark:text-black text-xs rounded-full">
                    {especialidadesSelecionadas.filter(e => especialidades.includes(e)).length}
                  </span>
                )}
                <Scissors className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform ${categoriaAberta === categoria ? 'rotate-90' : ''}`} />
              </div>
            </button>
            
            {categoriaAberta === categoria && (
              <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-wrap gap-2">
                  {especialidades.map((esp) => (
                    <button
                      key={esp}
                      type="button"
                      onClick={() => onToggleEspecialidade(esp)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                        especialidadesSelecionadas.includes(esp)
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white'
                          : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-600'
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                especialidadesSelecionadas.includes(esp)
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
              className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-colors ${
                formulario.nome.trim() && formulario.nome.trim().split(' ').filter(p => p.length > 0).length < 2
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
          disabled={salvando || !formulario.nome.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {salvando ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ArrowRight className="w-5 h-5" />
          )}
          {editando ? 'Salvar Alterações' : 'Continuar'}
        </button>
      </div>
    </motion.div>
  )
}

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
  const artigoPlural = terminologia.profissional.artigoPlural
  const artigo = terminologia.profissional.artigo
  
  return (
    <motion.div
      key="pergunta_equipe"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center py-8 px-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-zinc-600 dark:text-zinc-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          Você tem outr{ehSegmentoFeminino ? 'as' : 'os'} {profissionalPlural} na equipe?
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8 max-w-md mx-auto">
          Cada {profissionalSingular} terá seu próprio acesso pelo <strong>/colaborador</strong> e será notificad{ehSegmentoFeminino ? 'a' : 'o'} via WhatsApp com o link e código de acesso.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onSim}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Sim, cadastrar equipe
          </button>
          <button
            onClick={onNao}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Não, trabalho sozinh{ehSegmentoFeminino ? 'a' : 'o'}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
        <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-emerald-700 dark:text-emerald-300 font-medium mb-1">Notificação automática via WhatsApp</p>
          <p className="text-emerald-600/80 dark:text-emerald-200/70">
            Cada {profissionalSingular} cadastrad{ehSegmentoFeminino ? 'a' : 'o'} receberá uma mensagem no WhatsApp com o link de acesso e código único.
          </p>
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
  const tituloNovoProfissional = artigoProfissional === 'a'
    ? `Nova ${terminologia.profissional.singular} da Equipe`
    : `Novo ${terminologia.profissional.singular} da Equipe`

  return (
    <motion.div
      key="cadastro_equipe"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <UserPlus className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div>
            <h3 className="font-medium text-zinc-900 dark:text-white">
              {editando ? `Editar ${terminologia.profissional.singular}` : tituloNovoProfissional}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-500">
              Receberá acesso via WhatsApp para entrar em {linkAcesso}
            </p>
          </div>
        </div>

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
            <p className="text-zinc-700 dark:text-zinc-300">Foto do profissional</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-500">Opcional • JPG, PNG, WebP</p>
          </div>
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              placeholder="Ex: João Silva"
              className={`w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-colors ${
                formulario.nome.trim() && formulario.nome.trim().split(' ').filter(p => p.length > 0).length < 2
                  ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-500/20'
                  : 'border-zinc-200 dark:border-zinc-700 focus:ring-zinc-900/20 dark:focus:ring-white/20'
              }`}
            />
            {formulario.nome.trim() && formulario.nome.trim().split(' ').filter(p => p.length > 0).length < 2 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Digite nome e sobrenome
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              WhatsApp * <span className="text-xs font-normal text-zinc-600 dark:text-zinc-500">(para notificação)</span>
            </label>
            <div className="relative">
              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
              <input
                type="tel"
                value={formulario.telefone}
                onChange={(e) => setFormulario({ ...formulario, telefone: formatarTelefone(e.target.value) })}
                placeholder="(00) 00000-0000"
                className={`w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-colors ${
                  formulario.telefone && formulario.telefone.replace(/\D/g, '').length > 0 && formulario.telefone.replace(/\D/g, '').length < 10
                    ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-500/20'
                    : 'border-zinc-200 dark:border-zinc-700 focus:ring-zinc-900/20 dark:focus:ring-white/20'
                }`}
              />
            </div>
            {formulario.telefone && formulario.telefone.replace(/\D/g, '').length > 0 && formulario.telefone.replace(/\D/g, '').length < 10 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Telefone incompleto (mínimo 10 dígitos)
              </p>
            )}
            {!formulario.telefone && (
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
                Obrigatório para envio do código de acesso
              </p>
            )}
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

        {/* Comissão */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Comissão por atendimento
          </label>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 dark:text-zinc-500" />
              <input
                type="number"
                min="0"
                max="100"
                value={formulario.comissao_percentual}
                onChange={(e) => setFormulario({ ...formulario, comissao_percentual: Number(e.target.value) })}
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20"
              />
            </div>
            <div className="flex gap-2">
              {[30, 40, 50, 60].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFormulario({ ...formulario, comissao_percentual: valor })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formulario.comissao_percentual === valor
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {valor}%
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-2">
            Porcentagem que {artigoProfissional} {terminologia.profissional.singular.toLowerCase()} recebe de cada atendimento realizado
          </p>
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

        {/* Botões */}
        <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onCancelar}
            className="flex-1 px-4 py-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {salvando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            {editando ? 'Salvar' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Etapa 4: Token gerado com instruções
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
  const artigoProfissionalCapitalizado = terminologia.profissional.artigo === 'a' ? 'A' : 'O'

  return (
    <motion.div
      key="token"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Sucesso */}
      <div className="text-center py-6 px-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">
          {barbeiro.nome} foi cadastrado!
        </h3>
        <p className="text-emerald-600 dark:text-emerald-300/70 text-sm">
          Uma mensagem foi enviada via WhatsApp com o link e código de acesso
        </p>
      </div>

      {/* Token */}
      <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">Código de Acesso</p>
            <p className="text-xs text-zinc-500">{artigoProfissionalCapitalizado} {terminologia.profissional.singular.toLowerCase()} usa este código para entrar no painel do colaborador</p>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
          <p className="text-center text-3xl font-mono font-bold tracking-[0.4em] text-zinc-900 dark:text-white">
            {token}
          </p>
        </div>

        <button
          onClick={onCopiar}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {tokenCopiado ? (
            <>
              <Check className="w-5 h-5 text-emerald-500" />
              Copiado!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copiar Código
            </>
          )}
        </button>
      </div>

      {/* Link de acesso */}
      <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
            <ExternalLink className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">Link de Acesso</p>
            <p className="text-xs text-zinc-500">Onde {terminologia.profissional.artigo} {terminologia.profissional.singular.toLowerCase()} faz login</p>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3">
          <code className="text-sm text-blue-600 dark:text-blue-400 break-all">
            {linkAcesso}
          </code>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onAdicionarOutro}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white rounded-xl font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Adicionar outr{terminologia.profissional.artigo === 'a' ? 'a' : 'o'} {terminologia.profissional.singular.toLowerCase()}
        </button>
        <button
          onClick={onContinuar}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          Continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Etapa 5: Lista de barbeiros cadastrados (ilimitados)
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {barbeiros.length} {barbeiros.length === 1
              ? terminologia.profissional.singular.toLowerCase()
              : terminologia.profissional.plural.toLowerCase()}
          </span>
        </div>
        <button
          onClick={onAdicionar}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {/* Proprietário */}
      {proprietario && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-3 h-3 text-amber-500" />
            Proprietário (Admin)
          </p>
          <div
            className="group flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl"
          >
            {/* Foto */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-amber-100 dark:bg-amber-500/20 flex-shrink-0">
              {proprietario.foto_url ? (
                <Image
                  src={proprietario.foto_url}
                  alt={proprietario.nome}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-900 dark:text-white truncate">{proprietario.nome}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Acesso via /admin
              </p>
            </div>

            {/* Ações */}
            <button
              onClick={() => onEditar(proprietario)}
              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Equipe */}
      {equipe.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Equipe ({equipe.length})
          </p>
          <div className="space-y-2">
            {equipe.map((barbeiro) => (
              <div
                key={barbeiro.id}
                className="group flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Foto */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                  {barbeiro.foto_url ? (
                    <Image
                      src={barbeiro.foto_url}
                      alt={barbeiro.nome}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-5 h-5 text-zinc-500 dark:text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white truncate">{barbeiro.nome}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-500 mt-0.5">
                    <span>{formatarTelefone(barbeiro.telefone)}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{barbeiro.comissao_percentual}%</span>
                  </div>
                </div>

                {/* Token badge */}
                {barbeiro.token_acesso && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs text-zinc-600 dark:text-zinc-400">
                    <Key className="w-3 h-3" />
                    {barbeiro.token_acesso}
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditar(barbeiro)}
                    className="p-2 text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemover(barbeiro.id)}
                    className="p-2 text-zinc-500 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sem equipe ainda */}
      {equipe.length === 0 && proprietario && (
        <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
          <Users className="w-8 h-8 text-zinc-400 dark:text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-1">Nenhum{terminologia.profissional.artigo === 'a' ? 'a' : ''} {terminologia.profissional.singular.toLowerCase()} na equipe ainda</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-600 mb-3">
            Você pode adicionar mais {terminologia.profissional.plural.toLowerCase()} a qualquer momento
          </p>
          <button
            onClick={onAdicionar}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar {terminologia.profissional.singular.toLowerCase()}
          </button>
        </div>
      )}
    </motion.div>
  )
}
