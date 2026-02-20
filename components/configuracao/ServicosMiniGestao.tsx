'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'
import { obterTerminologia } from '@/lib/configuracoes-negocio'
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

interface CategoriaOption {
  valor: string
  label: string
}

const formatarLabelCategoria = (categoria: string): string =>
  categoria
    .split('_')
    .filter(Boolean)
    .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')

const normalizarIdCategoria = (categoria: string): string =>
  categoria
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

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
  const terminologia = useMemo(() => obterTerminologia(tipoNegocio), [tipoNegocio])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [categoriasCustomizadas, setCategoriasCustomizadas] = useState<CategoriaOption[]>([])

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

  const categoriasDisponiveis = useMemo<CategoriaOption[]>(() => {
    const porValor = new Map<string, CategoriaOption>()

    CATEGORIAS.forEach(categoria => {
      porValor.set(categoria.valor, categoria)
    })

    servicos.forEach(servico => {
      const categoria = servico.categoria?.trim()
      if (!categoria || porValor.has(categoria)) return
      porValor.set(categoria, { valor: categoria, label: formatarLabelCategoria(categoria) })
    })

    categoriasCustomizadas.forEach(categoria => {
      if (porValor.has(categoria.valor)) return
      porValor.set(categoria.valor, categoria)
    })

    return Array.from(porValor.values())
  }, [CATEGORIAS, servicos, categoriasCustomizadas])

  const [formulario, setFormulario] = useState({
    nome: '',
    descricao: '',
    preco: '',
    duracao: '30',
    categoria: categoriaInicial
  })

  useEffect(() => {
    setFormulario(prev => {
      const categoriaValida = categoriasDisponiveis.some(cat => cat.valor === prev.categoria)
      if (categoriaValida) return prev
      return { ...prev, categoria: categoriaInicial }
    })
  }, [categoriasDisponiveis, categoriaInicial])

  useEffect(() => {
    buscarServicos()
  }, [tenantId])

  useEffect(() => {
    onTotalChange?.(servicos.filter(s => s.ativo).length)
  }, [servicos, onTotalChange])

  const resetarFormulario = () => {
    setFormulario({ nome: '', descricao: '', preco: '', duracao: '30', categoria: categoriaInicial })
    setNovaCategoria('')
  }

  const obterLabelCategoria = (categoria: string) =>
    categoriasDisponiveis.find(cat => cat.valor === categoria)?.label || formatarLabelCategoria(categoria)

  const adicionarCategoriaCustomizada = () => {
    const nomeCategoria = novaCategoria.trim()
    if (!nomeCategoria) return

    const valorNormalizado = normalizarIdCategoria(nomeCategoria)
    if (!valorNormalizado || valorNormalizado.length < 2) {
      toast({ tipo: 'erro', mensagem: 'Digite um nome válido para a categoria' })
      return
    }

    const categoriaExistente = categoriasDisponiveis.find(cat => cat.valor === valorNormalizado)
    if (categoriaExistente) {
      setFormulario(prev => ({ ...prev, categoria: categoriaExistente.valor }))
      setNovaCategoria('')
      toast({ tipo: 'aviso', mensagem: 'Essa categoria já existe e foi selecionada' })
      return
    }

    const categoriaCriada = { valor: valorNormalizado, label: nomeCategoria }
    setCategoriasCustomizadas(prev => [...prev, categoriaCriada])
    setFormulario(prev => ({ ...prev, categoria: categoriaCriada.valor }))
    setNovaCategoria('')
    toast({ tipo: 'sucesso', mensagem: 'Categoria criada com sucesso' })
  }

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
      resetarFormulario()
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
      resetarFormulario()
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
    resetarFormulario()
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-5 sm:p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700/50">
            <Scissors className="w-6 h-6 text-zinc-900 dark:text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Serviços</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {servicos.length} {servicos.length === 1 ? 'cadastrado' : 'cadastrados'}
            </p>
          </div>
        </div>
        {!mostrarFormulario && !editando && (
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Serviço</span>
          </button>
        )}
      </div>

      {/* Sugestões Rápidas (quando lista vazia) */}
      {servicos.length === 0 && !mostrarFormulario && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-300">
                Adicione seu primeiro serviço
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400/80">
                Clique nas sugestões abaixo para adicionar rapidamente:
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {SERVICOS_SUGERIDOS.map((sugerido, index) => (
              <button
                key={index}
                onClick={() => adicionarSugerido(sugerido)}
                disabled={salvando}
                className="group flex flex-col items-start px-4 py-3 bg-white dark:bg-zinc-900 border border-amber-200/60 dark:border-amber-500/20 rounded-xl hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm transition-all text-left disabled:opacity-50"
              >
                <span className="font-medium text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{sugerido.nome}</span>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium">R$ {sugerido.preco.toFixed(2)}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                  <span>{sugerido.duracao} min</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
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
            <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-zinc-900 dark:text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white">Configurar Serviço</h4>
                  <p className="text-xs text-zinc-500">Defina valores e tempo de execução</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Nome do Serviço *
                  </label>
                  <input
                    type="text"
                    value={formulario.nome}
                    onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                    {...{ placeholder: placeholderNome }}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Preço (R$) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formulario.preco}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/[^0-9.,]/g, '')
                        setFormulario({ ...formulario, preco: valor })
                      }}
                      placeholder="0,00"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Duração (minutos) *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formulario.duracao}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/[^0-9]/g, '')
                        setFormulario({ ...formulario, duracao: valor })
                      }}
                      placeholder="30"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Categoria
                  </label>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl flex flex-col sm:flex-row gap-3">
                    <select
                      value={formulario.categoria}
                      onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
                      className="flex-1 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none"
                    >
                      {categoriasDisponiveis.map((cat) => (
                        <option key={cat.valor} value={cat.valor}>{cat.label}</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 dark:text-zinc-600 hidden sm:block">|</span>
                      <input
                        type="text"
                        value={novaCategoria}
                        onChange={(e) => setNovaCategoria(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            adicionarCategoriaCustomizada()
                          }
                        }}
                        placeholder="Nova categoria"
                        className="flex-1 sm:w-40 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={adicionarCategoriaCustomizada}
                        className="px-4 py-2.5 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => {
                    setMostrarFormulario(false)
                    resetarFormulario()
                  }}
                  className="flex-1 px-4 py-3 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarServico}
                  disabled={salvando}
                  className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-70 shadow-sm"
                >
                  {salvando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Salvar Serviço
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Serviços */}
      <div className="space-y-3">
        <AnimatePresence>
          {servicos.map((servico) => (
            <motion.div
              key={servico.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="group"
            >
              {editando === servico.id ? (
                // Modo edição INLINE
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-inner space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={formulario.nome}
                        onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formulario.preco}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/[^0-9.,]/g, '')
                          setFormulario({ ...formulario, preco: valor })
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formulario.duracao}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/[^0-9]/g, '')
                          setFormulario({ ...formulario, duracao: valor })
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={cancelarEdicao}
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => atualizarServico(servico.id)}
                      disabled={salvando}
                      className="px-5 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {salvando ? 'Salvando...' : 'Atualizar'}
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualização
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all">
                  <div className="hidden sm:flex p-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5 text-zinc-300 dark:text-zinc-700" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-zinc-900 dark:text-white truncate text-base">
                        {servico.nome}
                      </p>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md">
                        {obterLabelCategoria(servico.categoria)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded-lg">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        R$ {servico.preco.toFixed(2)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        <Clock className="w-3.5 h-3.5" />
                        {servico.duracao} min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => iniciarEdicao(servico)}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 p-2.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                      title="Editar serviço"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="sm:hidden font-medium">Editar</span>
                    </button>
                    <button
                      onClick={() => removerServico(servico.id)}
                      className="flex-1 sm:flex-none flex justify-center items-center gap-2 p-2.5 text-sm text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                      title="Remover serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sm:hidden font-medium">Excluir</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {servicos.length > 0 && !mostrarFormulario && !editando && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center font-medium flex items-center justify-center gap-2 pt-4">
          <GripVertical className="w-3.5 h-3.5" />
          Arraste para reordenar os serviços no seu catálogo
        </p>
      )}
    </div>
  )
}
