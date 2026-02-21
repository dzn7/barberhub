'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  Clock,
  Loader2,
  Save,
  Scissors,
  User,
  Phone,
  X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
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

interface AgendamentoParaEdicao {
  id: string
  data_hora: string
  cliente_id?: string
  barbeiro_id?: string
  servico_id?: string
  servicos_ids?: string[]
  clientes?: {
    nome?: string
    telefone?: string
  } | null
  barbeiros?: {
    id?: string
    nome?: string
  } | null
  servicos?: {
    id?: string
    nome?: string
    preco?: number
    duracao?: number
  } | null
  servicosMultiplos?: Array<{
    id?: string
    nome?: string
    preco?: number
    duracao?: number
  }>
}

interface ModalEditarAgendamentoProps {
  tenantId: string
  aberto: boolean
  agendamento: AgendamentoParaEdicao | null
  onFechar: () => void
  onSucesso: () => void
  tipoNegocio?: TipoNegocio
}

export function ModalEditarAgendamento({
  tenantId,
  aberto,
  agendamento,
  onFechar,
  onSucesso,
  tipoNegocio = 'barbearia',
}: ModalEditarAgendamentoProps) {
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
    servicosSelecionados: [] as string[],
    data: format(new Date(), 'yyyy-MM-dd'),
    hora: '09:00',
  })

  const normalizarTelefone = (valor: string) => {
    let numeros = valor.replace(/\D/g, '')

    // Remove 55 quando vier com código do país
    if (numeros.length > 11 && numeros.startsWith('55')) {
      numeros = numeros.slice(2)
    }

    return numeros.slice(0, 11)
  }

  const formatarTelefone = (valor: string) => {
    const numeros = normalizarTelefone(valor)
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const obterServicosSelecionadosIniciais = (item: AgendamentoParaEdicao) => {
    const ids = new Set<string>()

    if (Array.isArray(item.servicos_ids)) {
      item.servicos_ids.forEach((id) => {
        if (id) ids.add(id)
      })
    }

    if (ids.size === 0 && item.servico_id) {
      ids.add(item.servico_id)
    }

    if (ids.size === 0 && item.servicos?.id) {
      ids.add(item.servicos.id)
    }

    if (ids.size === 0 && Array.isArray(item.servicosMultiplos)) {
      item.servicosMultiplos.forEach((servico) => {
        if (servico.id) ids.add(servico.id)
      })
    }

    return Array.from(ids)
  }

  const carregarDados = async (servicosSelecionados: string[], barbeiroSelecionado?: Barbeiro | null) => {
    try {
      const [barbeirosRes, servicosRes] = await Promise.all([
        supabase
          .from('barbeiros')
          .select('id, nome')
          .eq('tenant_id', tenantId)
          .eq('ativo', true)
          .order('nome', { ascending: true }),
        supabase
          .from('servicos')
          .select('id, nome, preco, duracao')
          .eq('tenant_id', tenantId)
          .eq('ativo', true)
          .order('nome', { ascending: true }),
      ])

      if (barbeirosRes.error) throw barbeirosRes.error
      if (servicosRes.error) throw servicosRes.error

      let listaBarbeiros = (barbeirosRes.data || []) as Barbeiro[]
      if (
        barbeiroSelecionado?.id &&
        !listaBarbeiros.some((barbeiro) => barbeiro.id === barbeiroSelecionado.id)
      ) {
        listaBarbeiros = [barbeiroSelecionado, ...listaBarbeiros]
      }

      let listaServicos = (servicosRes.data || []) as Servico[]

      const servicosFaltantes = servicosSelecionados.filter(
        (servicoId) => !listaServicos.some((servico) => servico.id === servicoId)
      )

      if (servicosFaltantes.length > 0) {
        const { data: servicosExtras, error: erroServicosExtras } = await supabase
          .from('servicos')
          .select('id, nome, preco, duracao')
          .in('id', servicosFaltantes)

        if (erroServicosExtras) throw erroServicosExtras

        listaServicos = [
          ...listaServicos,
          ...((servicosExtras || []) as Servico[]),
        ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      }

      setBarbeiros(listaBarbeiros)
      setServicos(listaServicos)
    } catch (error) {
      console.error('Erro ao carregar dados para edição:', error)
      setErro('Erro ao carregar profissionais e serviços')
    }
  }

  useEffect(() => {
    if (!aberto) return

    const scrollY = window.scrollY
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.top = `-${scrollY}px`

    return () => {
      const scrollTop = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      if (scrollTop) {
        window.scrollTo(0, parseInt(scrollTop, 10) * -1)
      }
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto || !agendamento) return

    const dataHora = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA)
    const servicosSelecionados = obterServicosSelecionadosIniciais(agendamento)
    const barbeiroId = agendamento.barbeiros?.id || agendamento.barbeiro_id || ''

    setEtapa('dados')
    setErro('')
    setForm({
      clienteNome: agendamento.clientes?.nome || '',
      clienteTelefone: formatarTelefone(agendamento.clientes?.telefone || ''),
      barbeiroId,
      servicosSelecionados,
      data: format(dataHora, 'yyyy-MM-dd'),
      hora: format(dataHora, 'HH:mm'),
    })

    void carregarDados(servicosSelecionados, agendamento.barbeiros?.id ? {
      id: agendamento.barbeiros.id,
      nome: agendamento.barbeiros.nome || '',
    } : null)
  }, [aberto, agendamento, tenantId])

  const validarDados = () => {
    if (!form.clienteNome.trim()) {
      setErro('Digite o nome do cliente')
      return false
    }

    if (normalizarTelefone(form.clienteTelefone).length < 10) {
      setErro('Digite um telefone válido')
      return false
    }

    if (!form.barbeiroId) {
      setErro(`Selecione ${terminologia.profissional.artigo} ${terminologia.profissional.singular.toLowerCase()}`)
      return false
    }

    if (form.servicosSelecionados.length === 0) {
      setErro('Selecione pelo menos um serviço')
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

  const salvarEdicao = async () => {
    if (!agendamento) return

    if (!form.hora) {
      setErro('Selecione um horário disponível')
      return
    }

    if (!validarDados()) {
      return
    }

    setProcessando(true)
    setErro('')

    try {
      const telefone = normalizarTelefone(form.clienteTelefone)
      let clienteId = agendamento.cliente_id

      if (!clienteId) {
        const { data: clienteExistente, error: erroClienteExistente } = await supabase
          .from('clientes')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('telefone', telefone)
          .limit(1)
          .maybeSingle()

        if (erroClienteExistente && erroClienteExistente.code !== 'PGRST116') {
          throw erroClienteExistente
        }

        if (clienteExistente?.id) {
          clienteId = clienteExistente.id
        }
      }

      if (clienteId) {
        const { error: erroAtualizarCliente } = await supabase
          .from('clientes')
          .update({
            nome: form.clienteNome.trim(),
            telefone,
            ativo: true,
          })
          .eq('id', clienteId)

        if (erroAtualizarCliente) throw erroAtualizarCliente
      } else {
        const { data: novoCliente, error: erroNovoCliente } = await supabase
          .from('clientes')
          .insert([
            {
              tenant_id: tenantId,
              nome: form.clienteNome.trim(),
              telefone,
              ativo: true,
            },
          ])
          .select('id')
          .single()

        if (erroNovoCliente) throw erroNovoCliente
        clienteId = novoCliente.id
      }

      const dataHoraLocal = `${form.data}T${form.hora}:00`
      const dataHoraUTC = fromZonedTime(dataHoraLocal, TIMEZONE_BRASILIA)

      const { error: erroAtualizarAgendamento } = await supabase
        .from('agendamentos')
        .update({
          cliente_id: clienteId,
          barbeiro_id: form.barbeiroId,
          servico_id: form.servicosSelecionados[0],
          servicos_ids: form.servicosSelecionados,
          data_hora: dataHoraUTC.toISOString(),
        })
        .eq('id', agendamento.id)

      if (erroAtualizarAgendamento) throw erroAtualizarAgendamento

      onSucesso()
      onFechar()
    } catch (error: any) {
      console.error('Erro ao editar agendamento:', error)
      setErro(error?.message || 'Erro ao salvar alterações do agendamento')
    } finally {
      setProcessando(false)
    }
  }

  const servicosSelecionadosObj = useMemo(
    () => servicos.filter((servico) => form.servicosSelecionados.includes(servico.id)),
    [servicos, form.servicosSelecionados]
  )

  const duracaoTotal = useMemo(
    () => servicosSelecionadosObj.reduce((total, servico) => total + (servico.duracao || 0), 0) || 30,
    [servicosSelecionadosObj]
  )

  const precoTotal = useMemo(
    () => servicosSelecionadosObj.reduce((total, servico) => total + (servico.preco || 0), 0),
    [servicosSelecionadosObj]
  )

  if (typeof window === 'undefined') return null
  if (!aberto || !agendamento) return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
        onClick={() => !processando && onFechar()}
      />

      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none">
        <div
          className="bg-zinc-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-bold text-white">Editar Agendamento</h2>
              <p className="text-sm text-zinc-400">
                {etapa === 'dados' ? 'Atualize os dados do atendimento' : 'Escolha o novo horário'}
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

          <div className="flex-1 overflow-y-auto p-4">
            {etapa === 'dados' ? (
              <div className="space-y-4">
                {erro && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{erro}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Nome do Cliente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      value={form.clienteNome}
                      onChange={(e) => setForm((prev) => ({ ...prev, clienteNome: e.target.value }))}
                      placeholder="Digite o nome"
                      className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Telefone (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="tel"
                      value={form.clienteTelefone}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          clienteTelefone: formatarTelefone(e.target.value),
                        }))
                      }
                      placeholder="(00) 00000-0000"
                      className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    {terminologia.profissional.singular}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {barbeiros.map((barbeiro) => (
                      <button
                        key={barbeiro.id}
                        onClick={() => setForm((prev) => ({ ...prev, barbeiroId: barbeiro.id }))}
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-zinc-300">Serviços</label>
                    {form.servicosSelecionados.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                        {form.servicosSelecionados.length} selecionado{form.servicosSelecionados.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {servicos.map((servico) => {
                      const selecionado = form.servicosSelecionados.includes(servico.id)
                      return (
                        <button
                          key={servico.id}
                          onClick={() => {
                            setForm((prev) => {
                              if (selecionado) {
                                return {
                                  ...prev,
                                  servicosSelecionados: prev.servicosSelecionados.filter((id) => id !== servico.id),
                                }
                              }

                              return {
                                ...prev,
                                servicosSelecionados: [...prev.servicosSelecionados, servico.id],
                              }
                            })
                          }}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all relative ${
                            selecionado
                              ? 'border-white bg-white/10'
                              : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <div
                            className={`absolute top-3 right-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              selecionado ? 'bg-white border-white' : 'border-zinc-600'
                            }`}
                          >
                            {selecionado && <Check className="w-3 h-3 text-zinc-900" />}
                          </div>

                          <div className="flex items-center justify-between pr-8">
                            <span className="font-medium text-white">{servico.nome}</span>
                            <span className="text-emerald-400 font-bold">R$ {servico.preco.toFixed(2)}</span>
                          </div>
                          <span className="text-xs text-zinc-500">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {servico.duracao} min
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {form.servicosSelecionados.length > 1 && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Duração total: <span className="font-semibold text-white">{duracaoTotal} min</span>
                        </span>
                        <span className="text-emerald-400 font-bold">Total: R$ {precoTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
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
                  onDataChange={(data) => setForm((prev) => ({ ...prev, data }))}
                  onHorarioChange={(hora) => setForm((prev) => ({ ...prev, hora }))}
                  servicoDuracao={duracaoTotal}
                  mostrarCalendario={true}
                  agendamentoIdIgnorar={agendamento.id}
                />
              </div>
            )}
          </div>

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
                  Revisar Horário
                  <Clock className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={salvarEdicao}
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
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
