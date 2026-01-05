'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  User, 
  Phone, 
  Scissors, 
  Calendar,
  Clock,
  Plus,
  Loader2,
  Check
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { SeletorHorarioAvancado } from './SeletorHorarioAvancado'
import { obterTerminologia } from '@/lib/configuracoes-negocio'
import { TipoNegocio } from '@/lib/tipos-negocio'

const TIMEZONE_BRASILIA = 'America/Sao_Paulo'

interface Barbeiro {
  id: string
  nome: string
}

interface Servico {
  id: string
  nome: string
  preco: number
  duracao: number
}

interface ModalNovoAgendamentoProps {
  tenantId: string
  aberto: boolean
  onFechar: () => void
  onSucesso: () => void
  dataPadrao?: string
  horaPadrao?: string
  tipoNegocio?: TipoNegocio
}

/**
 * Modal de criação de novo agendamento
 * Design responsivo e modular
 */
export function ModalNovoAgendamento({
  tenantId,
  aberto,
  onFechar,
  onSucesso,
  dataPadrao,
  horaPadrao = '09:00',
  tipoNegocio = 'barbearia'
}: ModalNovoAgendamentoProps) {
  const terminologia = obterTerminologia(tipoNegocio)
  const [etapa, setEtapa] = useState<'dados' | 'horario'>('dados')
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState('')
  
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  
  const [form, setForm] = useState({
    clienteNome: '',
    clienteTelefone: '',
    barbeiroId: '',
    servicoId: '',
    data: dataPadrao || format(new Date(), 'yyyy-MM-dd'),
    hora: horaPadrao
  })

  // Bloquear scroll do body quando modal estiver aberto
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`
    } else {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [aberto])

  // Carregar barbeiros e serviços
  useEffect(() => {
    if (aberto && tenantId) {
      carregarDados()
    }
  }, [aberto, tenantId])

  // Reset ao abrir
  useEffect(() => {
    if (aberto) {
      setEtapa('dados')
      setErro('')
      setForm(prev => ({
        ...prev,
        clienteNome: '',
        clienteTelefone: '',
        data: dataPadrao || format(new Date(), 'yyyy-MM-dd'),
        hora: horaPadrao
      }))
    }
  }, [aberto, dataPadrao, horaPadrao])

  const carregarDados = async () => {
    try {
      const [barbeirosRes, servicosRes] = await Promise.all([
        supabase.from('barbeiros').select('id, nome').eq('tenant_id', tenantId).eq('ativo', true),
        supabase.from('servicos').select('id, nome, preco, duracao').eq('tenant_id', tenantId).eq('ativo', true)
      ])

      if (barbeirosRes.data) {
        setBarbeiros(barbeirosRes.data)
        if (barbeirosRes.data.length > 0 && !form.barbeiroId) {
          setForm(prev => ({ ...prev, barbeiroId: barbeirosRes.data[0].id }))
        }
      }
      if (servicosRes.data) {
        setServicos(servicosRes.data)
        if (servicosRes.data.length > 0 && !form.servicoId) {
          setForm(prev => ({ ...prev, servicoId: servicosRes.data[0].id }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const validarDados = () => {
    if (!form.clienteNome.trim()) {
      setErro('Digite o nome do cliente')
      return false
    }
    if (!form.clienteTelefone.trim() || form.clienteTelefone.replace(/\D/g, '').length < 10) {
      setErro('Digite um telefone válido')
      return false
    }
    if (!form.barbeiroId) {
      setErro('Selecione um barbeiro')
      return false
    }
    if (!form.servicoId) {
      setErro('Selecione um serviço')
      return false
    }
    setErro('')
    return true
  }

  const avancarParaHorario = () => {
    if (validarDados()) {
      setEtapa('horario')
    }
  }

  const salvarAgendamento = async () => {
    if (!form.hora) {
      setErro('Selecione um horário')
      return
    }

    setProcessando(true)
    setErro('')

    try {
      const telefoneFormatado = form.clienteTelefone.replace(/\D/g, '')
      let clienteId: string

      // Verificar se cliente existe
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('telefone', telefoneFormatado)
        .maybeSingle()

      if (clienteExistente) {
        clienteId = clienteExistente.id
        // Atualizar nome se necessário
        await supabase
          .from('clientes')
          .update({ nome: form.clienteNome.trim() })
          .eq('id', clienteId)
      } else {
        // Criar novo cliente
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert([{
            tenant_id: tenantId,
            nome: form.clienteNome.trim(),
            telefone: telefoneFormatado,
            ativo: true
          }])
          .select()
          .single()

        if (erroCliente) throw erroCliente
        clienteId = novoCliente.id
      }

      // Criar data/hora no timezone de Brasília
      const dataHoraLocal = `${form.data}T${form.hora}:00`
      const dataHoraUTC = fromZonedTime(dataHoraLocal, TIMEZONE_BRASILIA)

      // Criar agendamento
      const { error: erroAgendamento } = await supabase
        .from('agendamentos')
        .insert([{
          tenant_id: tenantId,
          cliente_id: clienteId,
          barbeiro_id: form.barbeiroId,
          servico_id: form.servicoId,
          data_hora: dataHoraUTC.toISOString(),
          status: 'pendente'
        }])

      if (erroAgendamento) throw erroAgendamento

      onSucesso()
      onFechar()
    } catch (error: any) {
      console.error('Erro ao salvar:', error)
      setErro(error.message || 'Erro ao criar agendamento')
    } finally {
      setProcessando(false)
    }
  }

  const servicoSelecionado = servicos.find(s => s.id === form.servicoId)

  // Não renderizar no servidor
  if (typeof window === 'undefined') return null
  if (!aberto) return null

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
            onClick={() => !processando && onFechar()}
          />
          
          {/* Container do Modal */}
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-zinc-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-bold text-white">Novo Agendamento</h2>
              <p className="text-sm text-zinc-400">
                {etapa === 'dados' ? 'Dados do cliente' : 'Escolha o horário'}
              </p>
            </div>
            <button
              onClick={onFechar}
              disabled={processando}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {etapa === 'dados' ? (
                <motion.div
                  key="dados"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {/* Erro */}
                  {erro && (
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">{erro}</p>
                    </div>
                  )}

                  {/* Nome do Cliente */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Nome do Cliente
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="text"
                        value={form.clienteNome}
                        onChange={(e) => setForm({ ...form, clienteNome: e.target.value })}
                        placeholder="Digite o nome"
                        className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                    </div>
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Telefone (WhatsApp)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <input
                        type="tel"
                        value={form.clienteTelefone}
                        onChange={(e) => setForm({ ...form, clienteTelefone: formatarTelefone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                    </div>
                  </div>

                  {/* Profissional */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      {terminologia.profissional.singular}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {barbeiros.map((barbeiro) => (
                        <button
                          key={barbeiro.id}
                          onClick={() => setForm({ ...form, barbeiroId: barbeiro.id })}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            form.barbeiroId === barbeiro.id
                              ? 'border-white bg-white/10 text-white'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                          }`}
                        >
                          <span className="font-medium">{barbeiro.nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Serviço */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Serviço
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {servicos.map((servico) => (
                        <button
                          key={servico.id}
                          onClick={() => setForm({ ...form, servicoId: servico.id })}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                            form.servicoId === servico.id
                              ? 'border-white bg-white/10'
                              : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">{servico.nome}</span>
                            <span className="text-emerald-400 font-bold">
                              R$ {servico.preco.toFixed(2)}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500">{servico.duracao} min</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="horario"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {/* Erro */}
                  {erro && (
                    <div className="p-3 mb-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-sm text-red-400">{erro}</p>
                    </div>
                  )}

                  <SeletorHorarioAvancado
                    tenantId={tenantId}
                    barbeiroId={form.barbeiroId}
                    dataSelecionada={form.data}
                    horarioSelecionado={form.hora}
                    onDataChange={(data) => setForm({ ...form, data })}
                    onHorarioChange={(hora) => setForm({ ...form, hora })}
                    servicoDuracao={servicoSelecionado?.duracao || 30}
                    mostrarCalendario={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/80">
            <div className="flex gap-3">
              {etapa === 'horario' && (
                <button
                  onClick={() => setEtapa('dados')}
                  disabled={processando}
                  className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                >
                  Voltar
                </button>
              )}
              
              {etapa === 'dados' ? (
                <button
                  onClick={avancarParaHorario}
                  className="flex-1 py-3 px-4 rounded-xl bg-white text-zinc-900 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  Escolher Horário
                  <Clock className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={salvarAgendamento}
                  disabled={processando || !form.hora}
                  className="flex-1 py-3 px-4 rounded-xl bg-white text-zinc-900 font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Criar Agendamento
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
