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
  Edit2
} from 'lucide-react'

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
}

interface CadastroBarbeirosOnboardingProps {
  tenantId: string
  limiteBarbeiros?: number
  onTotalChange?: (total: number) => void
}

type EtapaFluxo = 'pergunta' | 'cadastro' | 'token' | 'lista'

const ESPECIALIDADES_SUGERIDAS = [
  'Corte Masculino',
  'Degradê',
  'Barba',
  'Pigmentação',
  'Química',
  'Corte Infantil',
  'Tratamento Capilar'
]

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
 * Fluxo step-by-step: pergunta → cadastro → token → lista
 */
export function CadastroBarbeirosOnboarding({
  tenantId,
  limiteBarbeiros = 2,
  onTotalChange
}: CadastroBarbeirosOnboardingProps) {
  const { toast } = useToast()
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [etapa, setEtapa] = useState<EtapaFluxo>('pergunta')
  const [tokenGerado, setTokenGerado] = useState<string | null>(null)
  const [tokenCopiado, setTokenCopiado] = useState(false)
  const [barbeiroAtual, setBarbeiroAtual] = useState<Barbeiro | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)
  
  const [imagemParaRecortar, setImagemParaRecortar] = useState<string | null>(null)
  const [arquivoOriginal, setArquivoOriginal] = useState<File | null>(null)

  const [formulario, setFormulario] = useState({
    nome: '',
    email: '',
    telefone: '',
    foto_url: '',
    especialidades: [] as string[],
    comissao_percentual: 50
  })

  useEffect(() => {
    buscarBarbeiros()
  }, [tenantId])

  useEffect(() => {
    onTotalChange?.(barbeiros.filter(b => b.ativo).length)
  }, [barbeiros, onTotalChange])

  useEffect(() => {
    // Se já tem barbeiros cadastrados, mostrar lista
    if (!carregando && barbeiros.length > 0) {
      setEtapa('lista')
    }
  }, [carregando, barbeiros.length])

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
      toast({ tipo: 'erro', mensagem: 'Erro ao buscar barbeiros' })
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

  const adicionarBarbeiro = async () => {
    if (!formulario.nome.trim()) {
      toast({ tipo: 'erro', mensagem: 'Digite o nome do barbeiro' })
      return
    }
    if (!formulario.telefone.trim()) {
      toast({ tipo: 'erro', mensagem: 'Digite o telefone do barbeiro' })
      return
    }
    if (barbeiros.length >= limiteBarbeiros) {
      toast({ tipo: 'aviso', mensagem: `Limite de ${limiteBarbeiros} barbeiros atingido` })
      return
    }

    setSalvando(true)
    try {
      const novoToken = gerarTokenAcesso()
      
      const { data, error } = await supabase
        .from('barbeiros')
        .insert([{
          tenant_id: tenantId,
          nome: formulario.nome.trim(),
          email: formulario.email.trim() || `${formulario.nome.toLowerCase().replace(/\s/g, '.')}@temp.com`,
          telefone: formulario.telefone.replace(/\D/g, ''),
          foto_url: formulario.foto_url || null,
          especialidades: formulario.especialidades,
          comissao_percentual: formulario.comissao_percentual,
          token_acesso: novoToken,
          token_ativo: true,
          ativo: true
        }])
        .select()
        .single()

      if (error) throw error

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
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao adicionar barbeiro' })
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
      toast({ tipo: 'sucesso', mensagem: 'Barbeiro atualizado' })
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao atualizar barbeiro' })
    } finally {
      setSalvando(false)
    }
  }

  const removerBarbeiro = async (id: string) => {
    if (!confirm('Remover este barbeiro?')) return

    try {
      const { error } = await supabase
        .from('barbeiros')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error
      setBarbeiros(barbeiros.filter(b => b.id !== id))
      
      if (barbeiros.length <= 1) {
        setEtapa('pergunta')
      }
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao remover barbeiro' })
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
    setEtapa('cadastro')
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
    ? `${window.location.origin}/barbeiro/entrar`
    : '/barbeiro/entrar'

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
        {/* ETAPA 1: Pergunta inicial */}
        {etapa === 'pergunta' && (
          <EtapaPerguntaInicial
            onSim={() => setEtapa('cadastro')}
            onNao={() => setEtapa('lista')}
          />
        )}

        {/* ETAPA 2: Formulário de cadastro */}
        {etapa === 'cadastro' && (
          <EtapaFormularioBarbeiro
            formulario={formulario}
            setFormulario={setFormulario}
            editando={editando}
            salvando={salvando}
            uploadandoFoto={uploadandoFoto}
            inputFotoRef={inputFotoRef}
            onSelecionarFoto={handleSelecionarFoto}
            onToggleEspecialidade={toggleEspecialidade}
            onSalvar={() => editando ? atualizarBarbeiro(editando) : adicionarBarbeiro()}
            onCancelar={() => {
              setEditando(null)
              resetarFormulario()
              setEtapa(barbeiros.length > 0 ? 'lista' : 'pergunta')
            }}
            formatarTelefone={formatarTelefone}
          />
        )}

        {/* ETAPA 3: Token gerado */}
        {etapa === 'token' && tokenGerado && barbeiroAtual && (
          <EtapaTokenGerado
            barbeiro={barbeiroAtual}
            token={tokenGerado}
            tokenCopiado={tokenCopiado}
            linkAcesso={linkAcesso}
            onCopiar={copiarToken}
            onContinuar={() => {
              setTokenGerado(null)
              setBarbeiroAtual(null)
              setEtapa('lista')
            }}
            onAdicionarOutro={() => {
              setTokenGerado(null)
              setBarbeiroAtual(null)
              setEtapa('cadastro')
            }}
            podeAdicionarMais={barbeiros.length < limiteBarbeiros}
          />
        )}

        {/* ETAPA 4: Lista de barbeiros */}
        {etapa === 'lista' && (
          <EtapaListaBarbeiros
            barbeiros={barbeiros}
            limiteBarbeiros={limiteBarbeiros}
            onAdicionar={() => setEtapa('cadastro')}
            onEditar={iniciarEdicao}
            onRemover={removerBarbeiro}
            formatarTelefone={formatarTelefone}
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

/**
 * Etapa 1: Pergunta se tem barbeiros além do proprietário
 */
function EtapaPerguntaInicial({
  onSim,
  onNao
}: {
  onSim: () => void
  onNao: () => void
}) {
  return (
    <motion.div
      key="pergunta"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center py-8 px-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Users className="w-8 h-8 text-zinc-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-2">
          Você trabalha com outros barbeiros?
        </h3>
        <p className="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
          Além de você, há outros profissionais que atendem na sua barbearia? 
          Cada um terá seu próprio acesso ao sistema.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onSim}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Sim, quero cadastrar
          </button>
          <button
            onClick={onNao}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
          >
            Não, trabalho sozinho
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-blue-300 font-medium mb-1">Como funciona?</p>
          <p className="text-blue-200/70">
            Cada barbeiro cadastrado receberá um código de acesso único para entrar 
            no painel dele, onde poderá ver seus agendamentos e comissões.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Etapa 2: Formulário de cadastro do barbeiro
 */
function EtapaFormularioBarbeiro({
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
  formatarTelefone
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
}) {
  return (
    <motion.div
      key="cadastro"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <UserPlus className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">
              {editando ? 'Editar Barbeiro' : 'Novo Barbeiro'}
            </h3>
            <p className="text-xs text-zinc-500">
              Preencha os dados do profissional
            </p>
          </div>
        </div>

        {/* Foto */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center relative">
              {formulario.foto_url ? (
                <Image
                  src={formulario.foto_url}
                  alt="Foto"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <User className="w-8 h-8 text-zinc-600" />
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
          <div className="text-sm text-zinc-500">
            <p className="text-zinc-300">Foto do profissional</p>
            <p className="text-xs">Opcional • JPG, PNG, WebP</p>
          </div>
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              placeholder="Ex: João Silva"
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Telefone *
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="tel"
                value={formulario.telefone}
                onChange={(e) => setFormulario({ ...formulario, telefone: formatarTelefone(e.target.value) })}
                placeholder="(00) 00000-0000"
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={formulario.email}
                onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>
        </div>

        {/* Comissão */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Comissão por atendimento
          </label>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="number"
                min="0"
                max="100"
                value={formulario.comissao_percentual}
                onChange={(e) => setFormulario({ ...formulario, comissao_percentual: Number(e.target.value) })}
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/20"
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
                      ? 'bg-white text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {valor}%
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Porcentagem que o barbeiro recebe de cada atendimento realizado
          </p>
        </div>

        {/* Especialidades */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Especialidades
          </label>
          <div className="flex flex-wrap gap-2">
            {ESPECIALIDADES_SUGERIDAS.map((esp) => (
              <button
                key={esp}
                type="button"
                onClick={() => onToggleEspecialidade(esp)}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  formulario.especialidades.includes(esp)
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {esp}
              </button>
            ))}
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4 border-t border-zinc-800">
          <button
            onClick={onCancelar}
            className="flex-1 px-4 py-3 text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
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
 * Etapa 3: Token gerado com instruções
 */
function EtapaTokenGerado({
  barbeiro,
  token,
  tokenCopiado,
  linkAcesso,
  onCopiar,
  onContinuar,
  onAdicionarOutro,
  podeAdicionarMais
}: {
  barbeiro: Barbeiro
  token: string
  tokenCopiado: boolean
  linkAcesso: string
  onCopiar: () => void
  onContinuar: () => void
  onAdicionarOutro: () => void
  podeAdicionarMais: boolean
}) {
  return (
    <motion.div
      key="token"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Sucesso */}
      <div className="text-center py-6 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">
          {barbeiro.nome} foi cadastrado!
        </h3>
        <p className="text-emerald-300/70 text-sm">
          Envie as informações abaixo para o barbeiro acessar o sistema
        </p>
      </div>

      {/* Token */}
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Key className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-white">Código de Acesso</p>
            <p className="text-xs text-zinc-500">O barbeiro usa este código para entrar</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <p className="text-center text-3xl font-mono font-bold tracking-[0.4em] text-white">
            {token}
          </p>
        </div>

        <button
          onClick={onCopiar}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
        >
          {tokenCopiado ? (
            <>
              <Check className="w-5 h-5 text-emerald-400" />
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
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <ExternalLink className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-white">Link de Acesso</p>
            <p className="text-xs text-zinc-500">Onde o barbeiro faz login</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
          <code className="text-sm text-blue-400 break-all">
            {linkAcesso}
          </code>
        </div>

        <a
          href={linkAcesso}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
          Abrir Página de Login
        </a>
      </div>

      {/* Instruções */}
      <div className="p-4 bg-zinc-800/50 rounded-xl">
        <p className="text-sm text-zinc-400">
          <strong className="text-zinc-300">Instruções para o barbeiro:</strong><br/>
          1. Acessar o link acima<br/>
          2. Digitar o código de 8 caracteres<br/>
          3. Pronto! Acesso ao painel liberado
        </p>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        {podeAdicionarMais && (
          <button
            onClick={onAdicionarOutro}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Adicionar outro barbeiro
          </button>
        )}
        <button
          onClick={onContinuar}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
        >
          Continuar
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  )
}

/**
 * Etapa 4: Lista de barbeiros cadastrados
 */
function EtapaListaBarbeiros({
  barbeiros,
  limiteBarbeiros,
  onAdicionar,
  onEditar,
  onRemover,
  formatarTelefone
}: {
  barbeiros: Barbeiro[]
  limiteBarbeiros: number
  onAdicionar: () => void
  onEditar: (barbeiro: Barbeiro) => void
  onRemover: (id: string) => void
  formatarTelefone: (valor: string) => string
}) {
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
          <Users className="w-5 h-5 text-zinc-500" />
          <span className="text-sm text-zinc-400">
            {barbeiros.length}/{limiteBarbeiros} profissionais
          </span>
        </div>
        {barbeiros.length < limiteBarbeiros && (
          <button
            onClick={onAdicionar}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Lista vazia */}
      {barbeiros.length === 0 && (
        <div className="text-center py-8 px-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
          <User className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 mb-1">Nenhum profissional cadastrado</p>
          <p className="text-xs text-zinc-600 mb-4">
            Você pode continuar sem cadastrar ou adicionar barbeiros depois
          </p>
          <button
            onClick={onAdicionar}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Cadastrar barbeiro
          </button>
        </div>
      )}

      {/* Lista de barbeiros */}
      {barbeiros.length > 0 && (
        <div className="space-y-2">
          {barbeiros.map((barbeiro) => (
            <div
              key={barbeiro.id}
              className="group flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
            >
              {/* Foto */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
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
                    <User className="w-5 h-5 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{barbeiro.nome}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                  <span>{formatarTelefone(barbeiro.telefone)}</span>
                  <span className="text-emerald-400">{barbeiro.comissao_percentual}%</span>
                </div>
              </div>

              {/* Token badge */}
              {barbeiro.token_acesso && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                  <Key className="w-3 h-3" />
                  {barbeiro.token_acesso}
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEditar(barbeiro)}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onRemover(barbeiro.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Limite atingido */}
      {barbeiros.length >= limiteBarbeiros && (
        <p className="text-xs text-zinc-600 text-center">
          Limite de {limiteBarbeiros} profissionais do seu plano atingido
        </p>
      )}
    </motion.div>
  )
}
