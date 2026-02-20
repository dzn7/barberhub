'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { obterCategoriasServicos, obterTerminologia } from '@/lib/configuracoes-negocio'
import { TipoNegocio } from '@/lib/tipos-negocio'
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
  onTotalChange?: (total: number) => void
  tipoNegocio?: TipoNegocio
}

/**
 * Categorias de serviços para Barbearias
 */
const CATEGORIAS_BARBEARIA = [
  { valor: 'corte', label: 'Corte' },
  { valor: 'barba', label: 'Barba' },
  { valor: 'combo', label: 'Combo' },
  { valor: 'tratamento', label: 'Tratamento' },
  { valor: 'outros', label: 'Outros' },
]

/**
 * Categorias de serviços para Nail Designers
 */
const CATEGORIAS_NAIL = [
  { valor: 'alongamento', label: 'Alongamento' },
  { valor: 'esmaltacao', label: 'Esmaltação em Gel' },
  { valor: 'manicure', label: 'Manicure' },
  { valor: 'pedicure', label: 'Pedicure' },
  { valor: 'nail_art', label: 'Nail Art' },
  { valor: 'manutencao', label: 'Manutenção' },
  { valor: 'spa', label: 'Spa dos Pés' },
  { valor: 'outros', label: 'Outros' },
]

/**
 * Categorias de serviços para Lash Designers
 */
const CATEGORIAS_LASH = [
  { valor: 'extensao', label: 'Extensão de Cílios' },
  { valor: 'volume', label: 'Volume' },
  { valor: 'lifting', label: 'Lash Lifting' },
  { valor: 'manutencao', label: 'Manutenção' },
  { valor: 'sobrancelhas', label: 'Sobrancelhas' },
  { valor: 'outros', label: 'Outros' },
]

/**
 * Categorias de serviços para Cabeleireiras
 */
const CATEGORIAS_CABELEIREIRA = [
  { valor: 'corte', label: 'Corte' },
  { valor: 'escova', label: 'Escova' },
  { valor: 'coloracao', label: 'Coloração' },
  { valor: 'tratamento', label: 'Tratamento' },
  { valor: 'penteado', label: 'Penteado' },
  { valor: 'quimica', label: 'Química' },
  { valor: 'outros', label: 'Outros' },
]

/**
 * Serviços sugeridos para Barbearias
 */
const SERVICOS_SUGERIDOS_BARBEARIA = [
  { nome: 'Corte Masculino', descricao: 'Corte tradicional masculino', preco: 35, duracao: 30, categoria: 'corte' },
  { nome: 'Corte Degradê', descricao: 'Corte com degradê nas laterais', preco: 45, duracao: 40, categoria: 'corte' },
  { nome: 'Barba', descricao: 'Aparar e modelar barba', preco: 25, duracao: 20, categoria: 'barba' },
  { nome: 'Corte + Barba', descricao: 'Combo corte e barba', preco: 55, duracao: 50, categoria: 'combo' },
  { nome: 'Sobrancelha', descricao: 'Design de sobrancelha', preco: 15, duracao: 10, categoria: 'outros' },
]

/**
 * Serviços sugeridos para Nail Designers
 */
const SERVICOS_SUGERIDOS_NAIL = [
  { nome: 'Alongamento em Gel', descricao: 'Alongamento com gel moldado', preco: 150, duracao: 120, categoria: 'alongamento' },
  { nome: 'Esmaltação em Gel', descricao: 'Esmaltação durável em gel', preco: 80, duracao: 60, categoria: 'esmaltacao' },
  { nome: 'Manutenção', descricao: 'Manutenção de alongamento', preco: 100, duracao: 90, categoria: 'manutencao' },
  { nome: 'Nail Art', descricao: 'Decoração artística nas unhas', preco: 120, duracao: 90, categoria: 'nail_art' },
  { nome: 'Spa dos Pés', descricao: 'Tratamento completo para os pés', preco: 90, duracao: 60, categoria: 'spa' },
]

/**
 * Serviços sugeridos para Lash Designers
 */
const SERVICOS_SUGERIDOS_LASH = [
  { nome: 'Fio a Fio', descricao: 'Extensão clássica fio a fio', preco: 180, duracao: 120, categoria: 'extensao' },
  { nome: 'Volume Brasileiro', descricao: 'Técnica de volume brasileiro', preco: 220, duracao: 150, categoria: 'volume' },
  { nome: 'Lash Lifting', descricao: 'Curvatura e elevação de cílios naturais', preco: 140, duracao: 75, categoria: 'lifting' },
  { nome: 'Manutenção de Cílios', descricao: 'Manutenção em até 21 dias', preco: 120, duracao: 90, categoria: 'manutencao' },
  { nome: 'Design de Sobrancelhas', descricao: 'Design e finalização', preco: 60, duracao: 40, categoria: 'sobrancelhas' },
]

/**
 * Serviços sugeridos para Cabeleireiras
 */
const SERVICOS_SUGERIDOS_CABELEIREIRA = [
  { nome: 'Corte Feminino', descricao: 'Corte personalizado feminino', preco: 90, duracao: 60, categoria: 'corte' },
  { nome: 'Escova Modelada', descricao: 'Escova com finalização', preco: 70, duracao: 50, categoria: 'escova' },
  { nome: 'Hidratação Capilar', descricao: 'Tratamento de hidratação profunda', preco: 85, duracao: 60, categoria: 'tratamento' },
  { nome: 'Coloração', descricao: 'Coloração completa', preco: 180, duracao: 120, categoria: 'coloracao' },
  { nome: 'Penteado', descricao: 'Penteado para eventos', preco: 150, duracao: 90, categoria: 'penteado' },
]

/**
 * Componente de gestão simplificada de serviços para onboarding
 * Permite criar, editar e remover serviços de forma rápida
 */
export function ServicosMiniGestao({
  tenantId,
  onTotalChange,
  tipoNegocio = 'barbearia'
}: ServicosMiniGestaoProps) {
  const { toast } = useToast()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  
  // Categorias e serviços dinâmicos baseados no tipo de negócio
  const { CATEGORIAS, SERVICOS_SUGERIDOS, categoriaInicial, placeholderNome } = useMemo(() => {
    if (tipoNegocio === 'nail_designer') {
      return {
        CATEGORIAS: CATEGORIAS_NAIL,
        SERVICOS_SUGERIDOS: SERVICOS_SUGERIDOS_NAIL,
        categoriaInicial: 'alongamento',
        placeholderNome: 'Ex: Alongamento em Gel'
      }
    }

    if (tipoNegocio === 'lash_designer') {
      return {
        CATEGORIAS: CATEGORIAS_LASH,
        SERVICOS_SUGERIDOS: SERVICOS_SUGERIDOS_LASH,
        categoriaInicial: 'extensao',
        placeholderNome: 'Ex: Volume Brasileiro'
      }
    }

    if (tipoNegocio === 'cabeleireira') {
      return {
        CATEGORIAS: CATEGORIAS_CABELEIREIRA,
        SERVICOS_SUGERIDOS: SERVICOS_SUGERIDOS_CABELEIREIRA,
        categoriaInicial: 'corte',
        placeholderNome: 'Ex: Corte Feminino'
      }
    }

    return {
      CATEGORIAS: CATEGORIAS_BARBEARIA,
      SERVICOS_SUGERIDOS: SERVICOS_SUGERIDOS_BARBEARIA,
      categoriaInicial: 'corte',
      placeholderNome: 'Ex: Corte Degradê'
    }
  }, [tipoNegocio])
  
  const [formulario, setFormulario] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao: '30',
    categoria: categoriaInicial
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
      toast({ tipo: 'erro', mensagem: 'Erro ao buscar serviços' })
    } finally {
      setCarregando(false)
    }
  }

  const adicionarServico = async () => {
    if (!formulario.nome.trim()) {
      toast({ tipo: 'erro', mensagem: 'Digite o nome do serviço' })
      return
    }
    const precoNumerico = parseFloat(String(formulario.preco).replace(',', '.')) || 0
    const duracaoNumerica = parseInt(String(formulario.duracao)) || 30
    if (precoNumerico <= 0) {
      toast({ tipo: 'erro', mensagem: 'O preço deve ser maior que zero' })
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
          preco: precoNumerico,
          duracao: duracaoNumerica,
          categoria: formulario.categoria,
          ordem_exibicao: proximaOrdem,
          ativo: true
        }])
        .select()
        .single()

      if (error) throw error

      setServicos([...servicos, data])
      setFormulario({ nome: '', descricao: '', preco: '', duracao: '30', categoria: categoriaInicial })
      setMostrarFormulario(false)
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao adicionar serviço' })
    } finally {
      setSalvando(false)
    }
  }

  const atualizarServico = async (id: string) => {
    const precoNumerico = parseFloat(String(formulario.preco).replace(',', '.')) || 0
    const duracaoNumerica = parseInt(String(formulario.duracao)) || 30
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('servicos')
        .update({
          nome: formulario.nome.trim(),
          descricao: formulario.descricao.trim() || null,
          preco: precoNumerico,
          duracao: duracaoNumerica,
          categoria: formulario.categoria
        })
        .eq('id', id)

      if (error) throw error

      setServicos(servicos.map(s => 
        s.id === id 
          ? { ...s, nome: formulario.nome, descricao: formulario.descricao, preco: precoNumerico, duracao: duracaoNumerica, categoria: formulario.categoria }
          : s
      ))
      setEditando(null)
      setFormulario({ nome: '', descricao: '', preco: '', duracao: '30', categoria: categoriaInicial })
    } catch (erro) {
      toast({ tipo: 'erro', mensagem: 'Erro ao atualizar serviço' })
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
      toast({ tipo: 'erro', mensagem: 'Erro ao remover serviço' })
    }
  }

  const iniciarEdicao = (servico: Servico) => {
    setEditando(servico.id)
    setFormulario({
      nome: servico.nome,
      descricao: servico.descricao || '',
      preco: String(servico.preco),
      duracao: String(servico.duracao),
      categoria: servico.categoria || categoriaInicial
    })
    setMostrarFormulario(false)
  }

  const cancelarEdicao = () => {
    setEditando(null)
    setFormulario({ nome: '', descricao: '', preco: '', duracao: '30', categoria: categoriaInicial })
  }

  const adicionarSugerido = async (sugerido: typeof SERVICOS_SUGERIDOS[0]) => {

    // Verificar se já existe
    if (servicos.some(s => s.nome.toLowerCase() === sugerido.nome.toLowerCase())) {
      toast({ tipo: 'aviso', mensagem: 'Este serviço já existe' })
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
          <Scissors className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {servicos.length} {servicos.length === 1 ? 'serviço' : 'serviços'}
          </span>
        </div>
        {!mostrarFormulario && !editando && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-900 dark:bg-zinc-800 text-white rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Sugestões Rápidas (quando lista vazia) */}
      {servicos.length === 0 && !mostrarFormulario && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-500">
            Adicione rapidamente serviços comuns:
          </p>
          <div className="flex flex-wrap gap-2">
            {SERVICOS_SUGERIDOS.map((sugerido, index) => (
              <button
                key={index}
                onClick={() => adicionarSugerido(sugerido)}
                disabled={salvando}
                className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all disabled:opacity-50"
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
            <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    value={formulario.nome}
                    onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                    {...{ placeholder: placeholderNome }}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Preço (R$) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formulario.preco}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/[^0-9.,]/g, '')
                        setFormulario({ ...formulario, preco: valor })
                      }}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Duração (min) *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formulario.duracao}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/[^0-9]/g, '')
                        setFormulario({ ...formulario, duracao: valor })
                      }}
                      placeholder="30"
                      className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formulario.categoria}
                    onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
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
                    setFormulario({ nome: '', descricao: '', preco: '', duracao: '30', categoria: 'corte' })
                  }}
                  className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarServico}
                  disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
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
                <div className="p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={formulario.nome}
                        onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formulario.preco}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/[^0-9.,]/g, '')
                          setFormulario({ ...formulario, preco: valor })
                        }}
                        placeholder="0,00"
                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formulario.duracao}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/[^0-9]/g, '')
                          setFormulario({ ...formulario, duracao: valor })
                        }}
                        placeholder="30"
                        className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelarEdicao}
                      className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => atualizarServico(servico.id)}
                      disabled={salvando}
                      className="p-2 text-white bg-zinc-800 dark:bg-zinc-700 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
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
                <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                  <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-white truncate">
                        {servico.nome}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
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

                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => iniciarEdicao(servico)}
                      className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      aria-label="Editar serviço"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removerServico(servico.id)}
                      className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      aria-label="Remover serviço"
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
      {servicos.length > 0 && !mostrarFormulario && !editando && (
        <p className="text-xs text-zinc-500 dark:text-zinc-600 text-center hidden sm:block">
          Passe o mouse sobre um serviço para editar ou remover
        </p>
      )}
    </div>
  )
}
