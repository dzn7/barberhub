'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/components/ui/botao'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Phone,
  Check,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  Loader2
} from 'lucide-react'

type Etapa = 'servico' | 'barbeiro' | 'data' | 'horario' | 'dados' | 'confirmacao'

interface Tenant {
  id: string
  slug: string
  nome: string
}

interface Servico {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao: number
}

interface Barbeiro {
  id: string
  nome: string
  foto_url: string | null
}

interface Configuracoes {
  horario_abertura: string
  horario_fechamento: string
  dias_funcionamento: string[]
  intervalo_horarios: number
  intervalo_almoco_inicio: string | null
  intervalo_almoco_fim: string | null
}

interface HorarioDisponivel {
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

export default function PaginaAgendar() {
  const params = useParams()
  const slug = params.slug as string
  
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null)
  const [carregando, setCarregando] = useState(true)
  
  const [etapa, setEtapa] = useState<Etapa>('servico')
  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null)
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState<Barbeiro | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null)
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([])
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)
  
  const [formDados, setFormDados] = useState({
    nome: '',
    telefone: '',
    observacoes: ''
  })
  
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [mesAtual, setMesAtual] = useState(new Date())

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id, slug, nome')
          .eq('slug', slug)
          .eq('ativo', true)
          .single() as { data: Tenant | null }

        if (!tenantData) return

        setTenant(tenantData)

        const [servicosRes, barbeirosRes, configRes] = await Promise.all([
          supabase.from('servicos').select('*').eq('tenant_id', tenantData.id).eq('ativo', true).order('ordem_exibicao'),
          supabase.from('barbeiros').select('*').eq('tenant_id', tenantData.id).eq('ativo', true).order('nome'),
          supabase.from('configuracoes_barbearia').select('*').eq('tenant_id', tenantData.id).single()
        ])

        setServicos(servicosRes.data || [])
        setBarbeiros(barbeirosRes.data || [])
        setConfiguracoes(configRes.data)
      } finally {
        setCarregando(false)
      }
    }

    if (slug) carregarDados()
  }, [slug])

  useEffect(() => {
    if (!dataSelecionada || !barbeiroSelecionado || !tenant) return

    async function carregarHorarios() {
      if (!dataSelecionada || !barbeiroSelecionado || !tenant) return
      setCarregandoHorarios(true)
      try {
        const dataStr = dataSelecionada.toISOString().split('T')[0]
        const diaSemana = dataSelecionada.getDay()

        // Buscar horários do barbeiro
        const { data: horariosConfig } = await supabase
          .from('horarios_disponiveis')
          .select('*')
          .eq('barbeiro_id', barbeiroSelecionado.id)
          .eq('ativo', true)

        const horarioDia = horariosConfig?.find((h: HorarioDisponivel) => h.dia_semana === diaSemana)
        
        if (!horarioDia) {
          setHorariosDisponiveis([])
          return
        }

        // Buscar agendamentos existentes
        const { data: agendamentos } = await supabase
          .from('agendamentos')
          .select('data_hora')
          .eq('tenant_id', tenant.id)
          .eq('barbeiro_id', barbeiroSelecionado.id)
          .gte('data_hora', `${dataStr}T00:00:00`)
          .lt('data_hora', `${dataStr}T23:59:59`)
          .in('status', ['pendente', 'confirmado'])

        const horariosOcupados = new Set(
          agendamentos?.map(a => {
            const hora = new Date(a.data_hora)
            return `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`
          }) || []
        )

        // Gerar horários
        const intervalo = configuracoes?.intervalo_horarios || 30
        const horarios: string[] = []
        
        const [horaInicio, minInicio] = horarioDia.hora_inicio.split(':').map(Number)
        const [horaFim, minFim] = horarioDia.hora_fim.split(':').map(Number)
        
        let atual = horaInicio * 60 + minInicio
        const fim = horaFim * 60 + minFim

        while (atual < fim) {
          const hora = Math.floor(atual / 60)
          const min = atual % 60
          const horarioStr = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
          
          if (!horariosOcupados.has(horarioStr)) {
            // Verificar intervalo de almoço
            let emAlmoco = false
            if (configuracoes?.intervalo_almoco_inicio && configuracoes?.intervalo_almoco_fim) {
              const [almocoInicio] = configuracoes.intervalo_almoco_inicio.split(':').map(Number)
              const [almocoFim] = configuracoes.intervalo_almoco_fim.split(':').map(Number)
              emAlmoco = hora >= almocoInicio && hora < almocoFim
            }
            
            if (!emAlmoco) {
              horarios.push(horarioStr)
            }
          }
          
          atual += intervalo
        }

        setHorariosDisponiveis(horarios)
      } finally {
        setCarregandoHorarios(false)
      }
    }

    carregarHorarios()
  }, [dataSelecionada, barbeiroSelecionado, tenant, configuracoes])

  const diasDoMes = () => {
    const dias: Date[] = []
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    
    const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const fim = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
    
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (d >= hoje) {
        dias.push(new Date(d))
      }
    }
    
    return dias
  }

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 10) {
      return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const handleSubmit = async () => {
    if (!tenant || !servicoSelecionado || !barbeiroSelecionado || !dataSelecionada || !horarioSelecionado) {
      setErro('Preencha todos os campos')
      return
    }

    if (!formDados.nome || !formDados.telefone) {
      setErro('Nome e telefone são obrigatórios')
      return
    }

    setEnviando(true)
    setErro(null)

    try {
      // Buscar ou criar cliente
      let clienteId: string

      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('telefone', formDados.telefone)
        .single()

      if (clienteExistente) {
        clienteId = clienteExistente.id
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert({
            tenant_id: tenant.id,
            nome: formDados.nome,
            telefone: formDados.telefone,
          })
          .select('id')
          .single()

        if (erroCliente || !novoCliente) {
          throw new Error('Erro ao criar cliente')
        }
        
        clienteId = novoCliente.id
      }

      // Criar agendamento
      const dataHora = new Date(dataSelecionada)
      const [hora, min] = horarioSelecionado.split(':').map(Number)
      dataHora.setHours(hora, min, 0, 0)

      const { error: erroAgendamento } = await supabase
        .from('agendamentos')
        .insert({
          tenant_id: tenant.id,
          cliente_id: clienteId,
          barbeiro_id: barbeiroSelecionado.id,
          servico_id: servicoSelecionado.id,
          data_hora: dataHora.toISOString(),
          observacoes: formDados.observacoes || null
        })

      if (erroAgendamento) {
        throw new Error('Erro ao criar agendamento')
      }

      setSucesso(true)
    } catch (error) {
      console.error('Erro:', error)
      setErro('Erro ao criar agendamento. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const voltarEtapa = () => {
    const etapas: Etapa[] = ['servico', 'barbeiro', 'data', 'horario', 'dados']
    const idx = etapas.indexOf(etapa)
    if (idx > 0) setEtapa(etapas[idx - 1])
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
        <p>Barbearia não encontrada</p>
      </div>
    )
  }

  // Tela de Sucesso
  if (sucesso) {
    return (
      <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Agendamento Confirmado</h1>
          <p className="text-zinc-400 mb-8">Seu horário foi reservado com sucesso.</p>
          
          <div className="bg-zinc-800 rounded-xl p-6 mb-8 text-left">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Serviço:</span>
                <span className="font-semibold">{servicoSelecionado?.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Profissional:</span>
                <span className="font-semibold">{barbeiroSelecionado?.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Data:</span>
                <span className="font-semibold">
                  {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Horário:</span>
                <span className="font-semibold">{horarioSelecionado}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-700">
                <span className="text-zinc-400">Valor:</span>
                <span className="font-semibold text-amber-500">R$ {servicoSelecionado?.preco.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <Link href={`/${tenant.slug}`}>
            <Botao className="w-full">Voltar ao Início</Botao>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="bg-zinc-800 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {etapa !== 'servico' ? (
            <button onClick={voltarEtapa} className="p-2 hover:bg-zinc-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link href={`/${tenant.slug}`} className="p-2 hover:bg-zinc-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h1 className="font-bold">{tenant.nome}</h1>
            <p className="text-sm text-zinc-400">Agendar horário</p>
          </div>
        </div>
      </header>

      {/* Progresso */}
      <div className="bg-zinc-800/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between">
          {['Serviço', 'Profissional', 'Data', 'Horário', 'Dados'].map((label, i) => {
            const etapas: Etapa[] = ['servico', 'barbeiro', 'data', 'horario', 'dados']
            const ativo = etapas.indexOf(etapa) >= i
            return (
              <div key={label} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${ativo ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-400'}`}>
                  {i + 1}
                </div>
                {i < 4 && <div className={`w-6 sm:w-10 h-1 ${ativo ? 'bg-amber-500' : 'bg-zinc-700'}`} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <main className="px-4 py-6">
        <div className="max-w-2xl mx-auto">
          
          {/* Etapa 1: Serviço */}
          {etapa === 'servico' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Escolha o serviço</h2>
              <div className="space-y-3">
                {servicos.map(servico => (
                  <button
                    key={servico.id}
                    onClick={() => { setServicoSelecionado(servico); setEtapa('barbeiro') }}
                    className={`w-full p-4 rounded-xl text-left transition-colors ${
                      servicoSelecionado?.id === servico.id ? 'bg-amber-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{servico.nome}</h3>
                        {servico.descricao && <p className={`text-sm mt-1 ${servicoSelecionado?.id === servico.id ? 'text-black/70' : 'text-zinc-400'}`}>{servico.descricao}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">R$ {servico.preco.toFixed(2)}</p>
                        <p className={`text-sm ${servicoSelecionado?.id === servico.id ? 'text-black/70' : 'text-zinc-400'}`}>{servico.duracao} min</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 2: Barbeiro */}
          {etapa === 'barbeiro' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Escolha o profissional</h2>
              <div className="grid grid-cols-2 gap-4">
                {barbeiros.map(barbeiro => (
                  <button
                    key={barbeiro.id}
                    onClick={() => { setBarbeiroSelecionado(barbeiro); setEtapa('data') }}
                    className={`p-4 rounded-xl text-center transition-colors ${
                      barbeiroSelecionado?.id === barbeiro.id ? 'bg-amber-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto mb-3 bg-zinc-700 rounded-full flex items-center justify-center overflow-hidden">
                      {barbeiro.foto_url ? (
                        <Image src={barbeiro.foto_url} alt={barbeiro.nome} width={64} height={64} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 text-zinc-500" />
                      )}
                    </div>
                    <h3 className="font-semibold">{barbeiro.nome}</h3>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Etapa 3: Data */}
          {etapa === 'data' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Escolha a data</h2>
              
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold capitalize">
                  {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))} className="p-2 hover:bg-zinc-800 rounded-lg">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                  <div key={dia} className="text-center text-sm text-zinc-500 py-2">{dia}</div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {diasDoMes().map(dia => {
                  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
                  const passado = dia < hoje
                  const selecionado = dataSelecionada?.toDateString() === dia.toDateString()
                  const diasMap: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' }
                  const diaFunciona = configuracoes?.dias_funcionamento?.includes(diasMap[dia.getDay()]) ?? true
                  
                  return (
                    <button
                      key={dia.toISOString()}
                      disabled={passado || !diaFunciona}
                      onClick={() => { setDataSelecionada(dia); setHorarioSelecionado(null); setEtapa('horario') }}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        selecionado ? 'bg-amber-500 text-black font-bold' 
                          : passado || !diaFunciona ? 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {dia.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Etapa 4: Horário */}
          {etapa === 'horario' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Escolha o horário</h2>
              <p className="text-zinc-400 mb-6">
                {dataSelecionada?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              
              {carregandoHorarios ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : horariosDisponiveis.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-zinc-500 mb-4" />
                  <p className="text-zinc-400">Nenhum horário disponível</p>
                  <button onClick={() => setEtapa('data')} className="mt-4 text-amber-500 hover:underline">
                    Escolher outra data
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {horariosDisponiveis.map(horario => (
                    <button
                      key={horario}
                      onClick={() => { setHorarioSelecionado(horario); setEtapa('dados') }}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        horarioSelecionado === horario ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {horario}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Etapa 5: Dados */}
          {etapa === 'dados' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Seus dados</h2>
              
              {erro && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {erro}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Nome *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      value={formDados.nome}
                      onChange={e => setFormDados({ ...formDados, nome: e.target.value })}
                      placeholder="Seu nome"
                      className="w-full bg-zinc-800 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Telefone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="tel"
                      value={formDados.telefone}
                      onChange={e => setFormDados({ ...formDados, telefone: formatarTelefone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full bg-zinc-800 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Observações</label>
                  <textarea
                    value={formDados.observacoes}
                    onChange={e => setFormDados({ ...formDados, observacoes: e.target.value })}
                    placeholder="Alguma observação?"
                    rows={3}
                    className="w-full bg-zinc-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="mt-8 bg-zinc-800 rounded-xl p-4">
                <h3 className="font-semibold mb-3">Resumo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Serviço:</span><span>{servicoSelecionado?.nome}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Profissional:</span><span>{barbeiroSelecionado?.nome}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Data:</span><span>{dataSelecionada?.toLocaleDateString('pt-BR')}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Horário:</span><span>{horarioSelecionado}</span></div>
                  <div className="flex justify-between pt-2 border-t border-zinc-700">
                    <span className="text-zinc-400">Valor:</span>
                    <span className="text-amber-500 font-bold">R$ {servicoSelecionado?.preco.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <Botao
                onClick={handleSubmit}
                disabled={enviando || !formDados.nome || !formDados.telefone}
                className="w-full mt-6"
              >
                {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Agendando...</> : <><Calendar className="w-5 h-5 mr-2" /> Confirmar Agendamento</>}
              </Botao>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
