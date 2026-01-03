'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Scissors,
  Plus,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  Check,
  X,
  Loader2,
  GripVertical
} from 'lucide-react'

interface Servico {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao: number
  ativo: boolean
  categoria: string
  ordem_exibicao: number
}

interface ServicosMiniGestaoProps {
  tenantId: string
  limiteServicos?: number
  onTotalChange?: (total: number) => void
}

const CATEGORIAS = [
  { valor: 'corte', label: 'Corte' },
  { valor: 'barba', label: 'Barba' },
  { valor: 'combo', label: 'Combo' },
  { valor: 'tratamento', label: 'Tratamento' },
  { valor: 'outros', label: 'Outros' },
]

const SERVICOS_SUGERIDOS = [
  { nome: 'Corte Masculino', descricao: 'Corte tradicional masculino', preco: 35, duracao: 30, categoria: 'corte' },
  { nome: 'Corte Degradê', descricao: 'Corte com degradê nas laterais', preco: 45, duracao: 40, categoria: 'corte' },
  { nome: 'Barba', descricao: 'Aparar e modelar barba', preco: 25, duracao: 20, categoria: 'barba' },
  { nome: 'Corte + Barba', descricao: 'Combo corte e barba', preco: 55, duracao: 50, categoria: 'combo' },
  { nome: 'Sobrancelha', descricao: 'Design de sobrancelha', preco: 15, duracao: 10, categoria: 'outros' },
]

/**
 * Componente de gestão simplificada de serviços para onboarding
 * Permite criar, editar e remover serviços de forma rápida
 */
export function ServicosMiniGestao({
  tenantId,
  limiteServicos = 10,
  onTotalChange
}: ServicosMiniGestaoProps) {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  
  const [formulario, setFormulario] = useState({
    nome: '',
    descricao: '',
    preco: 0,
    duracao: 30,
    categoria: 'corte'
  })

  useEffect(() => {
    buscarServicos()
  }, [tenantId])

  useEffect(() => {
    onTotalChange?.(servicos.filter(s => s.ativo).length)
  }, [servicos, onTotalChange])

  const buscarServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('ordem_exibicao')

      if (error) throw error
      setServicos(data || [])
    } catch (erro) {
      console.error('Erro ao buscar serviços:', erro)
    } finally {
      setCarregando(false)
    }
  }

  const adicionarServico = async () => {
    if (!formulario.nome.trim()) {
      alert('Digite o nome do serviço')
      return
    }
    if (formulario.preco <= 0) {
      alert('O preço deve ser maior que zero')
      return
    }
    if (servicos.length >= limiteServicos) {
      alert(`Limite de ${limiteServicos} serviços atingido`)
      return
    }

    setSalvando(true)
    try {
      const proximaOrdem = servicos.length > 0 
        ? Math.max(...servicos.map(s => s.ordem_exibicao || 0)) + 1 
        : 1

      const { data, error } = await supabase
        .from('servicos')
        .insert([{
          tenant_id: tenantId,
          nome: formulario.nome.trim(),
          descricao: formulario.descricao.trim() || null,
          preco: formulario.preco,
          duracao: formulario.duracao,
          categoria: formulario.categoria,
          ordem_exibicao: proximaOrdem,
          ativo: true
        }])
        .select()
        .single()

      if (error) throw error

      setServicos([...servicos, data])
      setFormulario({ nome: '', descricao: '', preco: 0, duracao: 30, categoria: 'corte' })
      setMostrarFormulario(false)
    } catch (erro: any) {
      console.error('Erro ao adicionar serviço:', erro)
      alert('Erro ao adicionar serviço')
    } finally {
      setSalvando(false)
    }
  }

  const atualizarServico = async (id: string) => {
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('servicos')
        .update({
          nome: formulario.nome.trim(),
          descricao: formulario.descricao.trim() || null,
          preco: formulario.preco,
          duracao: formulario.duracao,
          categoria: formulario.categoria
        })
        .eq('id', id)

      if (error) throw error

      setServicos(servicos.map(s => 
        s.id === id 
          ? { ...s, ...formulario }
          : s
      ))
      setEditando(null)
      setFormulario({ nome: '', descricao: '', preco: 0, duracao: 30, categoria: 'corte' })
    } catch (erro) {
      console.error('Erro ao atualizar serviço:', erro)
      alert('Erro ao atualizar serviço')
    } finally {
      setSalvando(false)
    }
  }

  const removerServico = async (id: string) => {
    if (!confirm('Remover este serviço?')) return

    try {
      const { error } = await supabase
        .from('servicos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setServicos(servicos.filter(s => s.id !== id))
    } catch (erro) {
      console.error('Erro ao remover serviço:', erro)
      alert('Erro ao remover serviço')
    }
  }

  const iniciarEdicao = (servico: Servico) => {
    setEditando(servico.id)
    setFormulario({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco: servico.preco,
      duracao: servico.duracao,
      categoria: servico.categoria || 'corte'
    })
    setMostrarFormulario(false)
  }

  const cancelarEdicao = () => {
    setEditando(null)
    setFormulario({ nome: '', descricao: '', preco: 0, duracao: 30, categoria: 'corte' })
  }

  const adicionarSugerido = async (sugerido: typeof SERVICOS_SUGERIDOS[0]) => {
    if (servicos.length >= limiteServicos) {
      alert(`Limite de ${limiteServicos} serviços atingido`)
      return
    }

    // Verificar se já existe
    if (servicos.some(s => s.nome.toLowerCase() === sugerido.nome.toLowerCase())) {
      alert('Este serviço já existe')
      return
    }

    setSalvando(true)
    try {
      const proximaOrdem = servicos.length > 0 
        ? Math.max(...servicos.map(s => s.ordem_exibicao || 0)) + 1 
        : 1

      const { data, error } = await supabase
        .from('servicos')
        .insert([{
          tenant_id: tenantId,
          ...sugerido,
          ordem_exibicao: proximaOrdem,
          ativo: true
        }])
        .select()
        .single()

      if (error) throw error

      setServicos([...servicos, data])
    } catch (erro) {
      console.error('Erro ao adicionar serviço:', erro)
    } finally {
      setSalvando(false)
    }
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
          <Scissors className="w-5 h-5 text-zinc-500" />
          <span className="text-sm text-zinc-400">
            {servicos.length}/{limiteServicos} serviços
          </span>
        </div>
        {!mostrarFormulario && !editando && servicos.length < limiteServicos && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Sugestões Rápidas (quando lista vazia) */}
      {servicos.length === 0 && !mostrarFormulario && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Adicione rapidamente serviços comuns:
          </p>
          <div className="flex flex-wrap gap-2">
            {SERVICOS_SUGERIDOS.map((sugerido, index) => (
              <button
                key={index}
                onClick={() => adicionarSugerido(sugerido)}
                disabled={salvando}
                className="px-3 py-1.5 text-sm bg-zinc-800/50 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 hover:border-zinc-600 transition-all disabled:opacity-50"
              >
                + {sugerido.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulário de Novo Serviço */}
      <AnimatePresence>
        {mostrarFormulario && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    value={formulario.nome}
                    onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                    placeholder="Ex: Corte Degradê"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Preço (R$) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formulario.preco || ''}
                      onChange={(e) => setFormulario({ ...formulario, preco: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Duração (min) *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={formulario.duracao}
                      onChange={(e) => setFormulario({ ...formulario, duracao: parseInt(e.target.value) || 30 })}
                      className="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formulario.categoria}
                    onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
                  >
                    {CATEGORIAS.map((cat) => (
                      <option key={cat.valor} value={cat.valor}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setMostrarFormulario(false)
                    setFormulario({ nome: '', descricao: '', preco: 0, duracao: 30, categoria: 'corte' })
                  }}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarServico}
                  disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {salvando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Adicionar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Serviços */}
      <div className="space-y-2">
        <AnimatePresence>
          {servicos.map((servico) => (
            <motion.div
              key={servico.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="group"
            >
              {editando === servico.id ? (
                // Modo edição
                <div className="p-4 bg-zinc-900/50 border border-zinc-700 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={formulario.nome}
                        onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="number"
                        step="0.01"
                        value={formulario.preco}
                        onChange={(e) => setFormulario({ ...formulario, preco: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={formulario.duracao}
                        onChange={(e) => setFormulario({ ...formulario, duracao: parseInt(e.target.value) || 30 })}
                        className="w-full pl-10 pr-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelarEdicao}
                      className="p-2 text-zinc-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => atualizarServico(servico.id)}
                      disabled={salvando}
                      className="p-2 text-white bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors disabled:opacity-50"
                    >
                      {salvando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualização
                <div className="flex items-center gap-3 p-3 bg-zinc-900/30 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                  <GripVertical className="w-4 h-4 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {servico.nome}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                        {CATEGORIAS.find(c => c.valor === servico.categoria)?.label || 'Outro'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        R$ {servico.preco.toFixed(2)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {servico.duracao} min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => iniciarEdicao(servico)}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removerServico(servico.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dica quando tem serviços */}
      {servicos.length > 0 && servicos.length < limiteServicos && !mostrarFormulario && !editando && (
        <p className="text-xs text-zinc-600 text-center">
          Passe o mouse sobre um serviço para editar ou remover
        </p>
      )}
    </div>
  )
}
