'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  User,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Check,
  X,
  Loader2,
  Camera,
  UserPlus
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
}

interface BarbeirosMiniGestaoProps {
  tenantId: string
  limiteBarbeiros?: number
  onTotalChange?: (total: number) => void
}

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
 * Componente de gestão simplificada de barbeiros para onboarding
 * Permite cadastrar e gerenciar profissionais rapidamente
 */
export function BarbeirosMiniGestao({
  tenantId,
  limiteBarbeiros = 2,
  onTotalChange
}: BarbeirosMiniGestaoProps) {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [uploadandoFoto, setUploadandoFoto] = useState(false)
  const inputFotoRef = useRef<HTMLInputElement>(null)

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

  const buscarBarbeiros = async () => {
    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('nome')

      if (error) throw error
      setBarbeiros(data || [])
    } catch (erro) {
      console.error('Erro ao buscar barbeiros:', erro)
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

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    if (!arquivo.type.startsWith('image/')) {
      alert('Selecione uma imagem válida')
      return
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB')
      return
    }

    setUploadandoFoto(true)
    try {
      const formData = new FormData()
      formData.append('file', arquivo)
      formData.append('tenant_id', tenantId)
      formData.append('tipo', 'barbeiro')

      const resposta = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const dados = await resposta.json()
      if (dados.error) throw new Error(dados.error)

      setFormulario({ ...formulario, foto_url: dados.url })
    } catch (erro) {
      console.error('Erro ao fazer upload:', erro)
      alert('Erro ao enviar foto')
    } finally {
      setUploadandoFoto(false)
      if (inputFotoRef.current) {
        inputFotoRef.current.value = ''
      }
    }
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
      alert('Digite o nome do barbeiro')
      return
    }
    if (!formulario.telefone.trim()) {
      alert('Digite o telefone do barbeiro')
      return
    }
    if (barbeiros.length >= limiteBarbeiros) {
      alert(`Limite de ${limiteBarbeiros} barbeiros atingido no seu plano`)
      return
    }

    setSalvando(true)
    try {
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
          ativo: true
        }])
        .select()
        .single()

      if (error) throw error

      setBarbeiros([...barbeiros, data])
      resetarFormulario()
      setMostrarFormulario(false)
    } catch (erro: any) {
      console.error('Erro ao adicionar barbeiro:', erro)
      alert('Erro ao adicionar barbeiro')
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
      resetarFormulario()
    } catch (erro) {
      console.error('Erro ao atualizar barbeiro:', erro)
      alert('Erro ao atualizar barbeiro')
    } finally {
      setSalvando(false)
    }
  }

  const removerBarbeiro = async (id: string) => {
    if (!confirm('Remover este barbeiro? Os agendamentos dele serão mantidos.')) return

    try {
      const { error } = await supabase
        .from('barbeiros')
        .update({ ativo: false })
        .eq('id', id)

      if (error) throw error

      setBarbeiros(barbeiros.filter(b => b.id !== id))
    } catch (erro) {
      console.error('Erro ao remover barbeiro:', erro)
      alert('Erro ao remover barbeiro')
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
    setMostrarFormulario(false)
  }

  const cancelarEdicao = () => {
    setEditando(null)
    resetarFormulario()
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

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-zinc-500" />
          <span className="text-sm text-zinc-400">
            {barbeiros.length}/{limiteBarbeiros} profissionais
          </span>
        </div>
        {!mostrarFormulario && !editando && barbeiros.length < limiteBarbeiros && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Mensagem quando vazio */}
      {barbeiros.length === 0 && !mostrarFormulario && (
        <div className="text-center py-8 px-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
          <User className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 mb-1">Nenhum profissional cadastrado</p>
          <p className="text-xs text-zinc-600">
            Adicione os barbeiros que trabalham na sua barbearia
          </p>
        </div>
      )}

      {/* Formulário */}
      <AnimatePresence>
        {(mostrarFormulario || editando) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
                    {formulario.foto_url ? (
                      <Image
                        src={formulario.foto_url}
                        alt="Foto"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-zinc-600" />
                    )}
                    {uploadandoFoto && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => inputFotoRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-zinc-700 rounded-full hover:bg-zinc-600 transition-colors"
                  >
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                  <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFoto}
                    className="hidden"
                  />
                </div>
                <div className="text-xs text-zinc-500">
                  <p>Foto do profissional</p>
                  <p className="text-zinc-600">Opcional • JPG, PNG</p>
                </div>
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formulario.nome}
                    onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Telefone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="tel"
                      value={formulario.telefone}
                      onChange={(e) => setFormulario({ ...formulario, telefone: formatarTelefone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      value={formulario.email}
                      onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      className="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>
              </div>

              {/* Especialidades */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Especialidades
                </label>
                <div className="flex flex-wrap gap-2">
                  {ESPECIALIDADES_SUGERIDAS.map((esp) => (
                    <button
                      key={esp}
                      type="button"
                      onClick={() => toggleEspecialidade(esp)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
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
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => {
                    if (editando) {
                      cancelarEdicao()
                    } else {
                      setMostrarFormulario(false)
                      resetarFormulario()
                    }
                  }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => editando ? atualizarBarbeiro(editando) : adicionarBarbeiro()}
                  disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {salvando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editando ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Barbeiros */}
      <div className="space-y-2">
        <AnimatePresence>
          {barbeiros.map((barbeiro) => (
            <motion.div
              key={barbeiro.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="group flex items-center gap-4 p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
            >
              {/* Foto */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                {barbeiro.foto_url ? (
                  <Image
                    src={barbeiro.foto_url}
                    alt={barbeiro.nome}
                    fill
                    className="object-cover"
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
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {formatarTelefone(barbeiro.telefone)}
                  </span>
                </div>
                {barbeiro.especialidades?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {barbeiro.especialidades.slice(0, 3).map((esp) => (
                      <span
                        key={esp}
                        className="px-2 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded"
                      >
                        {esp}
                      </span>
                    ))}
                    {barbeiro.especialidades.length > 3 && (
                      <span className="text-[10px] text-zinc-600">
                        +{barbeiro.especialidades.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => iniciarEdicao(barbeiro)}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removerBarbeiro(barbeiro.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Limite atingido */}
      {barbeiros.length >= limiteBarbeiros && !editando && (
        <p className="text-xs text-zinc-600 text-center">
          Limite de {limiteBarbeiros} profissionais do seu plano atingido
        </p>
      )}
    </div>
  )
}
