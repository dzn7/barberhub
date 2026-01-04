'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Scissors, 
  Clock, 
  DollarSign,
  Edit3,
  Save,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useBarbeiroAuth } from '@/contexts/BarbeiroAuthContext'

interface Servico {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao: number
  ativo: boolean
}

interface PrecoBarbeiro {
  id: string
  servico_id: string
  preco: number
  duracao: number
}

/**
 * Gestão de Serviços para Barbeiro
 * Permite visualizar e editar preços/duração dos serviços
 */
export function GestaoServicosBarbeiro() {
  const { barbeiro, tenant } = useBarbeiroAuth()
  const [servicos, setServicos] = useState<Servico[]>([])
  const [precosBarbeiro, setPrecosBarbeiro] = useState<Map<string, PrecoBarbeiro>>(new Map())
  const [carregando, setCarregando] = useState(true)
  const [servicoEditando, setServicoEditando] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null)
  
  // Estado temporário para edição
  const [edicao, setEdicao] = useState<{
    preco: number
    duracao: number
  }>({ preco: 0, duracao: 30 })

  useEffect(() => {
    if (tenant && barbeiro) {
      carregarServicos()
    }
  }, [tenant, barbeiro])

  const carregarServicos = async () => {
    if (!tenant || !barbeiro) return

    try {
      setCarregando(true)
      
      // Buscar serviços do tenant
      const { data: servicosData, error: errorServicos } = await supabase
        .from('servicos')
        .select('id, nome, descricao, preco, duracao, ativo')
        .eq('tenant_id', tenant.id)
        .eq('ativo', true)
        .order('nome')

      if (errorServicos) throw errorServicos

      // Buscar preços personalizados do barbeiro
      const { data: precosData, error: errorPrecos } = await supabase
        .from('precos_barbeiro')
        .select('id, servico_id, preco, duracao')
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiro.id)
        .eq('ativo', true)

      if (errorPrecos) throw errorPrecos

      // Criar mapa de preços personalizados
      const mapaPrecos = new Map<string, PrecoBarbeiro>()
      precosData?.forEach(p => mapaPrecos.set(p.servico_id, p))
      setPrecosBarbeiro(mapaPrecos)

      setServicos(servicosData || [])
    } catch (error) {
      console.error('Erro ao carregar serviços:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar serviços' })
    } finally {
      setCarregando(false)
    }
  }

  // Obter preço/duração efetivo (personalizado ou padrão)
  const obterPrecoEfetivo = (servico: Servico) => {
    const personalizado = precosBarbeiro.get(servico.id)
    return {
      preco: personalizado?.preco ?? servico.preco,
      duracao: personalizado?.duracao ?? servico.duracao,
      personalizado: !!personalizado
    }
  }

  const iniciarEdicao = (servico: Servico) => {
    const { preco, duracao } = obterPrecoEfetivo(servico)
    setServicoEditando(servico.id)
    setEdicao({ preco, duracao })
    setMensagem(null)
  }

  const cancelarEdicao = () => {
    setServicoEditando(null)
    setEdicao({ preco: 0, duracao: 30 })
  }

  const salvarEdicao = async (servicoId: string) => {
    if (!tenant || !barbeiro) return

    // Validações
    if (edicao.preco < 0) {
      setMensagem({ tipo: 'erro', texto: 'O preço não pode ser negativo' })
      return
    }
    if (edicao.duracao < 5 || edicao.duracao > 480) {
      setMensagem({ tipo: 'erro', texto: 'A duração deve ser entre 5 e 480 minutos' })
      return
    }

    setProcessando(true)
    try {
      const precoExistente = precosBarbeiro.get(servicoId)

      if (precoExistente) {
        // Atualizar preço existente
        const { error } = await supabase
          .from('precos_barbeiro')
          .update({
            preco: edicao.preco,
            duracao: edicao.duracao
          })
          .eq('id', precoExistente.id)

        if (error) throw error
      } else {
        // Criar novo preço personalizado
        const { error } = await supabase
          .from('precos_barbeiro')
          .insert({
            tenant_id: tenant.id,
            barbeiro_id: barbeiro.id,
            servico_id: servicoId,
            preco: edicao.preco,
            duracao: edicao.duracao
          })

        if (error) throw error
      }

      // Recarregar dados
      await carregarServicos()

      setServicoEditando(null)
      setMensagem({ tipo: 'sucesso', texto: 'Preço personalizado salvo!' })
      setTimeout(() => setMensagem(null), 3000)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar alterações' })
    } finally {
      setProcessando(false)
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  if (!barbeiro || !tenant) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Serviços
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Visualize e edite os serviços disponíveis
        </p>
      </div>

      {/* Mensagem */}
      <AnimatePresence>
        {mensagem && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${
              mensagem.tipo === 'sucesso'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : mensagem.tipo === 'erro'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            }`}
          >
            {mensagem.tipo === 'sucesso' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : mensagem.tipo === 'erro' ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Info className="w-5 h-5 flex-shrink-0" />
            )}
            {mensagem.texto}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          Você pode ajustar o preço e a duração dos serviços. Para adicionar novos serviços, entre em contato com o proprietário da barbearia.
        </p>
      </div>

      {/* Lista de Serviços */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {carregando ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : servicos.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhum serviço cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {servicos.map((servico) => {
              const editando = servicoEditando === servico.id

              return (
                <motion.div
                  key={servico.id}
                  layout
                  className="p-4 sm:p-5"
                >
                  {editando ? (
                    // Modo de edição
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900 dark:text-white">
                          {servico.nome}
                        </h3>
                        <button
                          onClick={cancelarEdicao}
                          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {servico.descricao && (
                        <p className="text-sm text-zinc-500">{servico.descricao}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {/* Preço */}
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Preço (R$)
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={edicao.preco}
                              onChange={(e) => setEdicao({ ...edicao, preco: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        </div>

                        {/* Duração */}
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Duração (min)
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                              type="number"
                              step="5"
                              min="5"
                              max="480"
                              value={edicao.duracao}
                              onChange={(e) => setEdicao({ ...edicao, duracao: parseInt(e.target.value) || 30 })}
                              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={cancelarEdicao}
                          disabled={processando}
                          className="flex-1 py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => salvarEdicao(servico.id)}
                          disabled={processando}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
                        >
                          {processando ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo de visualização
                    (() => {
                      const { preco, duracao, personalizado } = obterPrecoEfetivo(servico)
                      return (
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                              <Scissors className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-zinc-900 dark:text-white">
                                  {servico.nome}
                                </h3>
                                {personalizado && (
                                  <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                    Personalizado
                                  </span>
                                )}
                              </div>
                              {servico.descricao && (
                                <p className="text-sm text-zinc-500 mt-0.5">{servico.descricao}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatarMoeda(preco)}
                                </span>
                                <span className="text-sm text-zinc-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {duracao} min
                                </span>
                                {personalizado && servico.preco !== preco && (
                                  <span className="text-xs text-zinc-400 line-through">
                                    {formatarMoeda(servico.preco)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => iniciarEdicao(servico)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Editar
                          </button>
                        </div>
                      )
                    })()
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Estatísticas */}
      {!carregando && servicos.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-500 mb-1">Total de Serviços</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {servicos.length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-500 mb-1">Preço Médio</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatarMoeda(servicos.reduce((acc, s) => acc + s.preco, 0) / servicos.length)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
