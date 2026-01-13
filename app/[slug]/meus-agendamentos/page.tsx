'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  ArrowLeft,
  Phone,
  Loader2,
  AlertCircle,
  X,
  Search,
  CheckCircle2,
  XCircle,
  CalendarX,
  CalendarCheck,
  AlertTriangle,
  Hand
} from 'lucide-react'
import { format, parseISO, isPast, isFuture, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TipoNegocio } from '@/lib/tipos-negocio'
import { obterTerminologia } from '@/lib/configuracoes-negocio'

interface Tenant {
  id: string
  slug: string
  nome: string
  tipo_negocio: TipoNegocio
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_destaque: string
}

interface Agendamento {
  id: string
  data_hora: string
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado' | 'nao_compareceu'
  observacoes: string | null
  criado_em: string
  barbeiro: {
    id: string
    nome: string
    foto_url: string | null
  }
  servico: {
    id: string
    nome: string
    preco: number
    duracao: number
  }
  cliente: {
    id: string
    nome: string
    telefone: string
  }
}

const STATUS_CONFIG = {
  pendente: {
    label: 'Pendente',
    cor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icone: Clock
  },
  confirmado: {
    label: 'Confirmado',
    cor: 'bg-green-500/20 text-green-400 border-green-500/30',
    icone: CheckCircle2
  },
  concluido: {
    label: 'Concluído',
    cor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icone: CalendarCheck
  },
  cancelado: {
    label: 'Cancelado',
    cor: 'bg-red-500/20 text-red-400 border-red-500/30',
    icone: XCircle
  },
  nao_compareceu: {
    label: 'Não Compareceu',
    cor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    icone: CalendarX
  }
}

export default function PaginaMeusAgendamentos() {
  const params = useParams()
  const slug = params.slug as string
  
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoAgendamentos, setCarregandoAgendamentos] = useState(false)
  const [erro, setErro] = useState(false)
  
  const [telefone, setTelefone] = useState('')
  const [telefoneBuscado, setTelefoneBuscado] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [buscaRealizada, setBuscaRealizada] = useState(false)
  
  const [modalCancelar, setModalCancelar] = useState<Agendamento | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Carregar dados do tenant
  useEffect(() => {
    async function carregarTenant() {
      try {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, slug, nome, tipo_negocio, logo_url, cor_primaria, cor_secundaria, cor_destaque')
          .eq('slug', slug)
          .eq('ativo', true)
          .single()

        if (tenantError || !tenantData) {
          setErro(true)
          return
        }

        setTenant(tenantData)
      } catch (error) {
        console.error('Erro ao carregar tenant:', error)
        setErro(true)
      } finally {
        setCarregando(false)
      }
    }

    if (slug) {
      carregarTenant()
    }
  }, [slug])

  // Carregar telefone salvo no localStorage
  useEffect(() => {
    const dadosSalvos = localStorage.getItem('dadosCliente')
    if (dadosSalvos) {
      try {
        const dados = JSON.parse(dadosSalvos)
        if (dados.telefone) {
          setTelefone(formatarTelefone(dados.telefone))
        }
      } catch (error) {
        console.error('Erro ao carregar dados salvos:', error)
      }
    }
  }, [])

  // Formatar telefone para exibição
  function formatarTelefone(valor: string): string {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    if (numeros.length <= 11) return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  function handleTelefoneChange(valor: string) {
    setTelefone(formatarTelefone(valor))
  }

  async function buscarAgendamentos() {
    if (!tenant) return
    
    const telefoneLimpo = telefone.replace(/\D/g, '')
    if (telefoneLimpo.length < 10) {
      return
    }

    setCarregandoAgendamentos(true)
    setBuscaRealizada(true)
    setTelefoneBuscado(telefone)

    try {
      // Primeiro, buscar o cliente pelo telefone (suporta formato limpo ou formatado)
      // Tenta buscar pelo telefone limpo primeiro, depois pelo formatado
      let clienteData: { id: string } | null = null
      
      // Busca 1: telefone limpo (ex: 86981454059)
      const { data: cliente1 } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('telefone', telefoneLimpo)
        .single()
      
      if (cliente1) {
        clienteData = cliente1
      } else {
        // Busca 2: telefone formatado (ex: (86) 98145-4059)
        const telefoneFormatado = formatarTelefone(telefoneLimpo)
        const { data: cliente2 } = await supabase
          .from('clientes')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('telefone', telefoneFormatado)
          .single()
        
        if (cliente2) {
          clienteData = cliente2
        } else {
          // Busca 3: usando ilike para encontrar qualquer formato que contenha os dígitos
          const { data: cliente3 } = await supabase
            .from('clientes')
            .select('id')
            .eq('tenant_id', tenant.id)
            .or(`telefone.ilike.%${telefoneLimpo.slice(-8)}%`)
            .limit(1)
            .single()
          
          if (cliente3) {
            clienteData = cliente3
          }
        }
      }

      if (!clienteData) {
        setAgendamentos([])
        setCarregandoAgendamentos(false)
        return
      }

      // Buscar agendamentos do cliente
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          observacoes,
          criado_em,
          barbeiro:barbeiros(id, nome, foto_url),
          servico:servicos(id, nome, preco, duracao),
          cliente:clientes(id, nome, telefone)
        `)
        .eq('tenant_id', tenant.id)
        .eq('cliente_id', clienteData.id)
        .order('data_hora', { ascending: false })
        .limit(50)

      if (agendamentosError) {
        console.error('Erro ao buscar agendamentos:', agendamentosError)
        setAgendamentos([])
        return
      }

      // Formatar dados
      const agendamentosFormatados = (agendamentosData || []).map((ag: any) => ({
        ...ag,
        barbeiro: ag.barbeiro || { id: '', nome: 'Profissional', foto_url: null },
        servico: ag.servico || { id: '', nome: 'Serviço', preco: 0, duracao: 30 },
        cliente: ag.cliente || { id: '', nome: 'Cliente', telefone: '' }
      }))

      setAgendamentos(agendamentosFormatados)
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error)
      setAgendamentos([])
    } finally {
      setCarregandoAgendamentos(false)
    }
  }

  async function cancelarAgendamento() {
    if (!modalCancelar || !tenant) return

    setCancelando(true)

    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ 
          status: 'cancelado',
          cancelado_em: new Date().toISOString(),
          motivo_cancelamento: motivoCancelamento || 'Cancelado pelo cliente'
        })
        .eq('id', modalCancelar.id)
        .eq('tenant_id', tenant.id)

      if (error) {
        console.error('Erro ao cancelar:', error)
        return
      }

      // Atualizar lista local
      setAgendamentos(prev => 
        prev.map(ag => 
          ag.id === modalCancelar.id 
            ? { ...ag, status: 'cancelado' as const }
            : ag
        )
      )

      setModalCancelar(null)
      setMotivoCancelamento('')
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
    } finally {
      setCancelando(false)
    }
  }

  function podeCancelar(agendamento: Agendamento): boolean {
    if (agendamento.status === 'cancelado' || agendamento.status === 'concluido' || agendamento.status === 'nao_compareceu') {
      return false
    }
    const dataAgendamento = parseISO(agendamento.data_hora)
    return isFuture(dataAgendamento) || isToday(dataAgendamento)
  }

  function formatarDataHora(dataHora: string): { data: string; hora: string; passado: boolean } {
    const data = parseISO(dataHora)
    return {
      data: format(data, "EEEE, d 'de' MMMM", { locale: ptBR }),
      hora: format(data, 'HH:mm'),
      passado: isPast(data) && !isToday(data)
    }
  }

  // Estados de loading e erro
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (erro || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Estabelecimento não encontrado</h1>
          <p className="text-zinc-400 mb-6">Verifique o endereço e tente novamente.</p>
          <Link href="/" className="text-white hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Cores do tenant
  const cores = {
    primaria: tenant.cor_primaria || '#18181b',
    secundaria: tenant.cor_secundaria || '#fafafa',
    destaque: tenant.cor_destaque || '#a1a1aa',
  }

  const terminologia = obterTerminologia(tenant.tipo_negocio)

  // Separar agendamentos futuros e passados
  const agendamentosFuturos = agendamentos.filter(ag => {
    const data = parseISO(ag.data_hora)
    return (isFuture(data) || isToday(data)) && ag.status !== 'cancelado' && ag.status !== 'concluido' && ag.status !== 'nao_compareceu'
  })

  const agendamentosPassados = agendamentos.filter(ag => {
    const data = parseISO(ag.data_hora)
    return isPast(data) && !isToday(data) || ag.status === 'cancelado' || ag.status === 'concluido' || ag.status === 'nao_compareceu'
  })

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: cores.primaria }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ 
          backgroundColor: cores.primaria + 'e6',
          borderColor: cores.destaque + '20'
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/${slug}`}
              className="p-2 -ml-2 rounded-xl transition-colors"
              style={{ color: cores.secundaria }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex-1 flex items-center gap-3">
              {tenant.logo_url ? (
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border" style={{ borderColor: cores.destaque + '30' }}>
                  <Image
                    src={tenant.logo_url}
                    alt={tenant.nome}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: cores.destaque + '20' }}
                >
                  {tenant.tipo_negocio === 'nail_designer' ? (
                    <Hand className="w-5 h-5" style={{ color: cores.secundaria }} />
                  ) : (
                    <Scissors className="w-5 h-5" style={{ color: cores.secundaria }} />
                  )}
                </div>
              )}
              
              <div>
                <h1 className="font-semibold" style={{ color: cores.secundaria }}>
                  Meus Agendamentos
                </h1>
                <p className="text-xs" style={{ color: cores.destaque }}>
                  {tenant.nome}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Busca por telefone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div 
            className="p-6 rounded-2xl border"
            style={{ 
              backgroundColor: cores.destaque + '08',
              borderColor: cores.destaque + '20'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <Search className="w-5 h-5" style={{ color: cores.secundaria }} />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: cores.secundaria }}>
                  Buscar Agendamentos
                </h2>
                <p className="text-sm" style={{ color: cores.destaque }}>
                  Digite seu telefone para visualizar
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Phone 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: cores.destaque }}
                />
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => handleTelefoneChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarAgendamentos()}
                  placeholder="(11) 99999-9999"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border text-base transition-all focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: cores.primaria,
                    borderColor: cores.destaque + '30',
                    color: cores.secundaria,
                  }}
                />
              </div>
              
              <button
                onClick={buscarAgendamentos}
                disabled={telefone.replace(/\D/g, '').length < 10 || carregandoAgendamentos}
                className="px-6 py-3.5 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ 
                  backgroundColor: cores.secundaria,
                  color: cores.primaria
                }}
              >
                {carregandoAgendamentos ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Buscar'
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Resultados */}
        <AnimatePresence mode="wait">
          {carregandoAgendamentos ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: cores.destaque }} />
              <p style={{ color: cores.destaque }}>Buscando agendamentos...</p>
            </motion.div>
          ) : buscaRealizada && agendamentos.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <CalendarX className="w-8 h-8" style={{ color: cores.destaque }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: cores.secundaria }}>
                Nenhum agendamento encontrado
              </h3>
              <p className="mb-6" style={{ color: cores.destaque }}>
                Não encontramos agendamentos para o telefone {telefoneBuscado}
              </p>
              <Link
                href={`/${slug}/agendar`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{ 
                  backgroundColor: cores.secundaria,
                  color: cores.primaria
                }}
              >
                <Calendar className="w-5 h-5" />
                Fazer um Agendamento
              </Link>
            </motion.div>
          ) : buscaRealizada && agendamentos.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Agendamentos Futuros */}
              {agendamentosFuturos.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium uppercase tracking-wider mb-4" style={{ color: cores.destaque }}>
                    Próximos Agendamentos
                  </h3>
                  <div className="space-y-3">
                    {agendamentosFuturos.map((agendamento, index) => {
                      const { data, hora, passado } = formatarDataHora(agendamento.data_hora)
                      const statusConfig = STATUS_CONFIG[agendamento.status]
                      const StatusIcone = statusConfig.icone
                      
                      return (
                        <motion.div
                          key={agendamento.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-5 rounded-2xl border transition-all"
                          style={{ 
                            backgroundColor: cores.destaque + '08',
                            borderColor: cores.destaque + '20'
                          }}
                        >
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                                style={{ backgroundColor: cores.destaque + '20' }}
                              >
                                {agendamento.barbeiro.foto_url ? (
                                  <Image
                                    src={agendamento.barbeiro.foto_url}
                                    alt={agendamento.barbeiro.nome}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-6 h-6" style={{ color: cores.destaque }} />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold" style={{ color: cores.secundaria }}>
                                  {agendamento.servico.nome}
                                </p>
                                <p className="text-sm" style={{ color: cores.destaque }}>
                                  com {agendamento.barbeiro.nome}
                                </p>
                              </div>
                            </div>
                            
                            <span 
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.cor}`}
                            >
                              {statusConfig.label}
                            </span>
                          </div>

                          <div 
                            className="flex items-center gap-4 p-3 rounded-xl mb-4"
                            style={{ backgroundColor: cores.destaque + '10' }}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" style={{ color: cores.destaque }} />
                              <span className="text-sm capitalize" style={{ color: cores.secundaria }}>
                                {data}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" style={{ color: cores.destaque }} />
                              <span className="text-sm font-semibold" style={{ color: cores.secundaria }}>
                                {hora}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <span className="text-sm" style={{ color: cores.destaque }}>
                                {agendamento.servico.duracao} min
                              </span>
                              <span className="font-semibold" style={{ color: cores.secundaria }}>
                                R$ {agendamento.servico.preco.toFixed(2)}
                              </span>
                            </div>
                            
                            {podeCancelar(agendamento) && (
                              <button
                                onClick={() => setModalCancelar(agendamento)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ 
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: '#ef4444'
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                                Cancelar
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Histórico */}
              {agendamentosPassados.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-wider mb-4" style={{ color: cores.destaque }}>
                    Histórico
                  </h3>
                  <div className="space-y-3">
                    {agendamentosPassados.map((agendamento, index) => {
                      const { data, hora } = formatarDataHora(agendamento.data_hora)
                      const statusConfig = STATUS_CONFIG[agendamento.status]
                      
                      return (
                        <motion.div
                          key={agendamento.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="p-4 rounded-xl border opacity-70"
                          style={{ 
                            backgroundColor: cores.destaque + '05',
                            borderColor: cores.destaque + '15'
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: cores.destaque + '15' }}
                              >
                                {tenant.tipo_negocio === 'nail_designer' ? (
                                  <Hand className="w-5 h-5" style={{ color: cores.destaque }} />
                                ) : (
                                  <Scissors className="w-5 h-5" style={{ color: cores.destaque }} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate" style={{ color: cores.secundaria }}>
                                  {agendamento.servico.nome}
                                </p>
                                <p className="text-xs truncate" style={{ color: cores.destaque }}>
                                  {data} às {hora}
                                </p>
                              </div>
                            </div>
                            
                            <span 
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${statusConfig.cor}`}
                            >
                              {statusConfig.label}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* CTA para novo agendamento */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-8 text-center"
              >
                <Link
                  href={`/${slug}/agendar`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                  style={{ 
                    backgroundColor: cores.secundaria,
                    color: cores.primaria
                  }}
                >
                  <Calendar className="w-5 h-5" />
                  Novo Agendamento
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: cores.destaque + '20' }}
              >
                <Calendar className="w-8 h-8" style={{ color: cores.destaque }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: cores.secundaria }}>
                Consulte seus agendamentos
              </h3>
              <p style={{ color: cores.destaque }}>
                Digite seu telefone acima para ver seus agendamentos
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal de Cancelamento */}
      <AnimatePresence>
        {modalCancelar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm"
              onClick={() => !cancelando && setModalCancelar(null)}
            />
            
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden pointer-events-auto"
                style={{ 
                  backgroundColor: cores.primaria,
                  borderColor: cores.destaque + '30'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div 
                  className="flex items-center justify-between px-6 py-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <h2 className="text-lg font-semibold" style={{ color: cores.secundaria }}>
                      Cancelar Agendamento
                    </h2>
                  </div>
                  
                  <button
                    onClick={() => !cancelando && setModalCancelar(null)}
                    disabled={cancelando}
                    className="p-2 -mr-2 rounded-xl transition-colors"
                    style={{ color: cores.destaque }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6">
                  <div 
                    className="p-4 rounded-xl border mb-6"
                    style={{ 
                      backgroundColor: cores.destaque + '08',
                      borderColor: cores.destaque + '20'
                    }}
                  >
                    <p className="font-medium mb-1" style={{ color: cores.secundaria }}>
                      {modalCancelar.servico.nome}
                    </p>
                    <p className="text-sm mb-2" style={{ color: cores.destaque }}>
                      com {modalCancelar.barbeiro.nome}
                    </p>
                    <p className="text-sm" style={{ color: cores.destaque }}>
                      {format(parseISO(modalCancelar.data_hora), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="mb-6">
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: cores.secundaria }}
                    >
                      Motivo do cancelamento (opcional)
                    </label>
                    <textarea
                      value={motivoCancelamento}
                      onChange={(e) => setMotivoCancelamento(e.target.value)}
                      placeholder="Ex: Imprevisto, mudança de planos..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border resize-none transition-all focus:outline-none focus:ring-2"
                      style={{ 
                        backgroundColor: cores.primaria,
                        borderColor: cores.destaque + '30',
                        color: cores.secundaria,
                      }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalCancelar(null)}
                      disabled={cancelando}
                      className="flex-1 px-4 py-3 rounded-xl font-medium border transition-all hover:scale-[1.02] disabled:opacity-50"
                      style={{ 
                        borderColor: cores.destaque + '30',
                        color: cores.secundaria
                      }}
                    >
                      Voltar
                    </button>
                    <button
                      onClick={cancelarAgendamento}
                      disabled={cancelando}
                      className="flex-1 px-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ 
                        backgroundColor: '#ef4444',
                        color: '#fff'
                      }}
                    >
                      {cancelando ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          Confirmar Cancelamento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer 
        className="py-6 px-4 text-center border-t mt-8"
        style={{ borderColor: cores.destaque + '20' }}
      >
        <p className="text-sm" style={{ color: cores.destaque }}>
          {new Date().getFullYear()} {tenant.nome}
        </p>
      </footer>
    </div>
  )
}
