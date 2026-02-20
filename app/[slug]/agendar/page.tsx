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
  Check, 
  Lock,
  ArrowLeft,
  ArrowRight,
  Phone,
  Loader2,
  AlertCircle,
  X,
  Sun,
  Sunset,
  Moon,
  TicketPercent
} from 'lucide-react'
import { 
  format, 
  parse, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday, 
  isBefore, 
  startOfDay,
  getDay
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  gerarTodosHorarios, 
  gerarDatasDisponiveis
} from '@/lib/horarios'
import { ChevronLeft, ChevronRight, CalendarDays, Bell, Sparkles } from 'lucide-react'
import { ModalListaEsperaSemPreferencia } from '@/components/horarios/ModalListaEsperaSemPreferencia'

interface Tenant {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_destaque: string
}

interface Servico {
  id: string
  nome: string
  descricao: string | null
  preco: number
  duracao: number
  precoOriginal?: number
  duracaoOriginal?: number
  personalizado?: boolean
}

interface Barbeiro {
  id: string
  nome: string
  foto_url: string | null
}

interface ConfiguracaoBarbearia {
  id: string
  aberta: boolean
  mensagem_fechamento: string | null
  horario_abertura: string
  horario_fechamento: string
  dias_funcionamento: string[]
  intervalo_almoco_inicio: string | null
  intervalo_almoco_fim: string | null
  intervalo_horarios: number
  usar_horarios_personalizados: boolean
  horarios_personalizados: any
}

interface CupomDisponivel {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  tipo_desconto: 'percentual' | 'valor_fixo'
  valor_desconto: number
  valor_minimo_pedido: number | null
  maximo_desconto: number | null
  escopo: 'loja' | 'servico'
  inicio_em: string | null
  fim_em: string | null
  ativo: boolean
}

interface ResultadoCupom {
  valido: boolean
  mensagem: string
  cupom_id: string | null
  cupom_codigo: string | null
  valor_bruto: number
  valor_desconto: number
  valor_final: number
}

export default function PaginaAgendar() {
  const params = useParams()
  const slug = params.slug as string
  
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [servicosBase, setServicosBase] = useState<Servico[]>([])
  const [precosBarbeiro, setPrecosBarbeiro] = useState<Map<string, { preco: number; duracao: number }>>(new Map())
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  
  const [etapa, setEtapa] = useState(1)
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState('')
  const [servicosSelecionados, setServicosSelecionados] = useState<string[]>([])
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [mesAtual, setMesAtual] = useState(new Date())
  const [modoCalendario, setModoCalendario] = useState<'rapido' | 'calendario'>('rapido')
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  const [agendamentoConcluido, setAgendamentoConcluido] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [horariosOcupados, setHorariosOcupados] = useState<Array<{horario: string, duracao: number}>>([])
  const [barbeariaAberta, setBarbeariaAberta] = useState(true)
  const [mensagemFechamento, setMensagemFechamento] = useState('')
  const [configuracaoHorario, setConfiguracaoHorario] = useState({
    inicio: '09:00',
    fim: '19:00',
    intervaloAlmocoInicio: null as string | null,
    intervaloAlmocoFim: null as string | null,
    diasFuncionamento: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as string[],
    intervaloHorarios: 20
  })
  const [usarHorariosPersonalizados, setUsarHorariosPersonalizados] = useState(false)
  const [horariosPersonalizados, setHorariosPersonalizados] = useState<any>(null)
  const [cuponsDisponiveis, setCuponsDisponiveis] = useState<CupomDisponivel[]>([])
  const [cupomServicos, setCupomServicos] = useState<Record<string, string[]>>({})
  const [codigoCupom, setCodigoCupom] = useState('')
  const [cupomAplicado, setCupomAplicado] = useState<ResultadoCupom | null>(null)
  const [validandoCupom, setValidandoCupom] = useState(false)
  
  // Toast local para feedback
  const [toastInfo, setToastInfo] = useState<{ tipo: 'erro' | 'aviso' | 'sucesso'; mensagem: string } | null>(null)
  
  // Modal de lista de espera sem preferência de horário
  const [modalListaEsperaAberto, setModalListaEsperaAberto] = useState(false)
  
  const mostrarToast = (tipo: 'erro' | 'aviso' | 'sucesso', mensagem: string) => {
    setToastInfo({ tipo, mensagem })
    setTimeout(() => setToastInfo(null), 4000)
  }

  // Cores do tenant
  const cores = tenant ? {
    primaria: tenant.cor_primaria || '#18181b',
    secundaria: tenant.cor_secundaria || '#fafafa',
    destaque: tenant.cor_destaque || '#a1a1aa',
  } : {
    primaria: '#18181b',
    secundaria: '#fafafa',
    destaque: '#a1a1aa',
  }

  useEffect(() => {
    if (slug) {
      carregarDados()
    }
  }, [slug])

  useEffect(() => {
    const dadosSalvos = localStorage.getItem('dadosCliente')
    if (dadosSalvos) {
      try {
        const dados = JSON.parse(dadosSalvos)
        setNomeCliente(dados.nome || '')
        setTelefoneCliente(dados.telefone || '')
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }
  }, [])

  useEffect(() => {
    if (!tenant) return

    const channel = supabase
      .channel('status-barbearia')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'configuracoes_barbearia',
        filter: `tenant_id=eq.${tenant.id}`
      }, () => {
        verificarStatusBarbearia()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenant])

  useEffect(() => {
    if (!tenant?.id) return

    carregarCuponsDisponiveis(tenant.id)

    const channel = supabase
      .channel(`cupons-publico-${tenant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cupons',
        filter: `tenant_id=eq.${tenant.id}`
      }, () => {
        carregarCuponsDisponiveis(tenant.id)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'cupom_servicos'
      }, () => {
        carregarCuponsDisponiveis(tenant.id)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenant?.id])

  useEffect(() => {
    let channel: any = null

    const buscarHorariosOcupados = async () => {
      if (!dataSelecionada || !barbeiroSelecionado || !tenant) {
        setHorariosOcupados([])
        return
      }

      try {
        const [ano, mes, dia] = dataSelecionada.split('-').map(Number)
        const inicioDia = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0))
        const fimDia = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59, 999))

        const { data: agendamentosData, error: errorAgendamentos } = await supabase
          .from('agendamentos')
          .select(`id, data_hora, status, servicos (duracao)`)
          .eq('tenant_id', tenant.id)
          .eq('barbeiro_id', barbeiroSelecionado)
          .gte('data_hora', inicioDia.toISOString())
          .lte('data_hora', fimDia.toISOString())
          .neq('status', 'cancelado')

        if (errorAgendamentos) {
          console.error('Erro ao buscar agendamentos:', errorAgendamentos)
        }

        const { data: bloqueiosData, error: errorBloqueios } = await supabase
          .from('horarios_bloqueados')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('data', dataSelecionada)
          .or(`barbeiro_id.is.null,barbeiro_id.eq.${barbeiroSelecionado}`)

        if (errorBloqueios) {
          console.error('Erro ao buscar bloqueios:', errorBloqueios)
        }

        const ocupadosAgendamentos = (agendamentosData || []).map((ag: any) => {
          const horario = format(new Date(ag.data_hora), 'HH:mm')
          const duracao = ag.servicos?.duracao || 30
          return { horario, duracao }
        })

        const ocupadosBloqueios: Array<{horario: string, duracao: number}> = []
        if (bloqueiosData) {
          bloqueiosData.forEach((bloqueio: any) => {
            const horaInicioStr = bloqueio.horario_inicio.substring(0, 5)
            const horaFimStr = bloqueio.horario_fim.substring(0, 5)
            
            const dataBase = new Date(2000, 0, 1)
            const inicioBloqueio = parse(horaInicioStr, 'HH:mm', dataBase)
            const fimBloqueio = parse(horaFimStr, 'HH:mm', dataBase)
            
            let horarioAtual = inicioBloqueio
            while (horarioAtual < fimBloqueio) {
              const horarioFormatado = format(horarioAtual, 'HH:mm')
              const tempoRestante = Math.ceil((fimBloqueio.getTime() - horarioAtual.getTime()) / 60000)
              const duracaoBloqueio = Math.min(20, tempoRestante)
              
              ocupadosBloqueios.push({
                horario: horarioFormatado,
                duracao: duracaoBloqueio
              })
              
              horarioAtual = new Date(horarioAtual.getTime() + 20 * 60000)
            }
          })
        }

        const todosOcupados = [...ocupadosAgendamentos, ...ocupadosBloqueios]
        setHorariosOcupados(todosOcupados)
      } catch (error) {
        console.error('Erro ao buscar horários ocupados:', error)
      }
    }

    buscarHorariosOcupados()

    if (dataSelecionada && barbeiroSelecionado && tenant) {
      channel = supabase
        .channel(`horarios-${barbeiroSelecionado}-${dataSelecionada}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
          filter: `barbeiro_id=eq.${barbeiroSelecionado}`
        }, () => {
          buscarHorariosOcupados()
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'horarios_bloqueados'
        }, () => {
          buscarHorariosOcupados()
        })
        .subscribe()
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [dataSelecionada, barbeiroSelecionado, tenant])

  const carregarDados = async () => {
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, slug, nome, logo_url, cor_primaria, cor_secundaria, cor_destaque')
        .eq('slug', slug)
        .eq('ativo', true)
        .single()

      if (tenantError || !tenantData) {
        console.error('Tenant não encontrado')
        return
      }

      setTenant(tenantData)

      const [configRes, barbeirosRes, servicosRes] = await Promise.all([
        supabase
          .from('configuracoes_barbearia')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .single(),
        supabase
          .from('barbeiros')
          .select('id, nome, foto_url')
          .eq('tenant_id', tenantData.id)
          .eq('ativo', true),
        supabase
          .from('servicos')
          .select('id, nome, descricao, preco, duracao')
          .eq('tenant_id', tenantData.id)
          .eq('ativo', true)
          .order('ordem_exibicao')
      ])

      if (configRes.data) {
        const config = configRes.data as ConfiguracaoBarbearia
        setBarbeariaAberta(config.aberta ?? true)
        setMensagemFechamento(config.mensagem_fechamento || '')
        
        const formatarHorario = (horario: string | null) => {
          if (!horario) return null
          return horario.substring(0, 5)
        }
        
        setConfiguracaoHorario({
          inicio: formatarHorario(config.horario_abertura) || '09:00',
          fim: formatarHorario(config.horario_fechamento) || '19:00',
          intervaloAlmocoInicio: formatarHorario(config.intervalo_almoco_inicio),
          intervaloAlmocoFim: formatarHorario(config.intervalo_almoco_fim),
          diasFuncionamento: config.dias_funcionamento || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
          intervaloHorarios: config.intervalo_horarios || 20
        })
        
        setUsarHorariosPersonalizados(config.usar_horarios_personalizados || false)
        if (config.horarios_personalizados) {
          setHorariosPersonalizados(config.horarios_personalizados)
        }
      }

      setBarbeiros(barbeirosRes.data || [])
      setServicosBase(servicosRes.data || [])
      setServicos(servicosRes.data || [])
      await carregarCuponsDisponiveis(tenantData.id)

      if (barbeirosRes.data && barbeirosRes.data.length > 0) {
        const primeiroBarbeiro = barbeirosRes.data[0].id
        setBarbeiroSelecionado(primeiroBarbeiro)
        // Buscar preços personalizados do primeiro barbeiro
        await buscarPrecosBarbeiro(tenantData.id, primeiroBarbeiro, servicosRes.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

  const carregarCuponsDisponiveis = async (tenantId: string) => {
    try {
      const { data: cuponsData, error: cuponsError } = await supabase
        .from('cupons')
        .select('id, codigo, nome, descricao, tipo_desconto, valor_desconto, valor_minimo_pedido, maximo_desconto, escopo, inicio_em, fim_em, ativo')
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
        .order('codigo', { ascending: true })

      if (cuponsError) throw cuponsError

      const listaCupons = (cuponsData || []) as CupomDisponivel[]
      setCuponsDisponiveis(listaCupons)

      if (listaCupons.length === 0) {
        setCupomServicos({})
        return
      }

      const ids = listaCupons.map(c => c.id)
      const { data: cupomServicosData, error: cupomServicosError } = await supabase
        .from('cupom_servicos')
        .select('cupom_id, servico_id')
        .in('cupom_id', ids)

      if (cupomServicosError) throw cupomServicosError

      const mapa: Record<string, string[]> = {}
      ;(cupomServicosData || []).forEach((item: any) => {
        if (!mapa[item.cupom_id]) mapa[item.cupom_id] = []
        mapa[item.cupom_id].push(item.servico_id)
      })
      setCupomServicos(mapa)
    } catch (error) {
      console.error('Erro ao carregar cupons:', error)
      setCuponsDisponiveis([])
      setCupomServicos({})
    }
  }

  // Buscar preços personalizados do barbeiro
  const buscarPrecosBarbeiro = async (tenantId: string, barbeiroId: string, servicosLista: Servico[]) => {
    try {
      const { data: precosData, error } = await supabase
        .from('precos_barbeiro')
        .select('servico_id, preco, duracao')
        .eq('tenant_id', tenantId)
        .eq('barbeiro_id', barbeiroId)
        .eq('ativo', true)

      if (error) {
        console.error('Erro ao buscar preços personalizados:', error)
        return
      }

      // Criar mapa de preços personalizados
      const mapaPrecos = new Map<string, { preco: number; duracao: number }>()
      precosData?.forEach(p => mapaPrecos.set(p.servico_id, { preco: p.preco, duracao: p.duracao }))
      setPrecosBarbeiro(mapaPrecos)

      // Atualizar serviços com preços personalizados
      const servicosAtualizados = servicosLista.map(servico => {
        const precoPersonalizado = mapaPrecos.get(servico.id)
        if (precoPersonalizado) {
          return {
            ...servico,
            precoOriginal: servico.preco,
            duracaoOriginal: servico.duracao,
            preco: precoPersonalizado.preco,
            duracao: precoPersonalizado.duracao,
            personalizado: true
          }
        }
        return { ...servico, personalizado: false }
      })
      setServicos(servicosAtualizados)
    } catch (error) {
      console.error('Erro ao buscar preços:', error)
    }
  }

  // Atualizar preços quando barbeiro muda
  useEffect(() => {
    if (tenant && barbeiroSelecionado && servicosBase.length > 0) {
      buscarPrecosBarbeiro(tenant.id, barbeiroSelecionado, servicosBase)
    }
  }, [barbeiroSelecionado, tenant])

  useEffect(() => {
    if (!cupomAplicado) return
    setCupomAplicado(null)
  }, [servicosSelecionados.join('|')])

  const verificarStatusBarbearia = async () => {
    if (!tenant) return

    try {
      const { data, error } = await supabase
        .from('configuracoes_barbearia')
        .select('aberta, mensagem_fechamento')
        .eq('tenant_id', tenant.id)
        .single()

      if (!error && data) {
        setBarbeariaAberta(data.aberta ?? true)
        setMensagemFechamento(data.mensagem_fechamento || '')
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
    }
  }

  const todasDatas = gerarDatasDisponiveis()
  const datasDisponiveis = todasDatas.filter(data => {
    const dataObj = parse(data.valor, 'yyyy-MM-dd', new Date())
    const diaSemanaNum = dataObj.getDay()
    const mapa = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    const diaAbreviado = mapa[diaSemanaNum]
    return configuracaoHorario.diasFuncionamento.includes(diaAbreviado)
  })

  const servicosSelecionadosObj = servicos.filter(s => servicosSelecionados.includes(s.id))
  const duracaoServico = servicosSelecionadosObj.reduce((acc, s) => acc + s.duracao, 0) || 30
  const precoTotal = servicosSelecionadosObj.reduce((acc, s) => acc + s.preco, 0)
  const descontoAplicado = cupomAplicado?.valor_desconto || 0
  const totalComDesconto = cupomAplicado?.valor_final ?? Math.max(precoTotal - descontoAplicado, 0)

  const cuponsFiltradosCheckout = cuponsDisponiveis.filter((cupom) => {
    const agora = new Date()
    if (!cupom.ativo) return false
    if (cupom.inicio_em && new Date(cupom.inicio_em) > agora) return false
    if (cupom.fim_em && new Date(cupom.fim_em) < agora) return false
    if (cupom.valor_minimo_pedido && precoTotal < cupom.valor_minimo_pedido) return false

    if (cupom.escopo === 'servico') {
      const relacionados = cupomServicos[cupom.id] || []
      return servicosSelecionados.some((id) => relacionados.includes(id))
    }

    return true
  })

  const buscarClienteIdPorTelefone = async () => {
    if (!tenant || !telefoneCliente) return null

    const { data } = await supabase
      .from('clientes')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('telefone', telefoneCliente)
      .limit(1)

    return data && data.length > 0 ? data[0].id : null
  }

  const aplicarCupom = async (codigoParam?: string) => {
    if (!tenant) return

    const codigo = (codigoParam || codigoCupom).trim().toUpperCase()
    if (!codigo) {
      mostrarToast('aviso', 'Informe um código de cupom.')
      return
    }

    setValidandoCupom(true)

    try {
      const clienteId = await buscarClienteIdPorTelefone()
      const { data, error } = await supabase.rpc('validar_cupom_agendamento', {
        p_tenant_id: tenant.id,
        p_cliente_id: clienteId,
        p_servico_id: servicosSelecionados[0] || null,
        p_servicos_ids: servicosSelecionados,
        p_cupom_codigo: codigo,
        p_cupom_id: null,
        p_agendamento_id: null
      })

      if (error) throw error

      const resultado = (Array.isArray(data) ? data[0] : data) as ResultadoCupom | undefined
      if (!resultado || !resultado.valido || !resultado.cupom_id) {
        mostrarToast('erro', resultado?.mensagem || 'Cupom inválido para este agendamento.')
        return
      }

      const bruto = Number(resultado.valor_bruto || 0)
      const desconto = Number(resultado.valor_desconto || 0)
      const final = Number(resultado.valor_final || 0)

      setCodigoCupom(resultado.cupom_codigo || codigo)
      setCupomAplicado({
        ...resultado,
        valor_bruto: bruto,
        valor_desconto: desconto,
        valor_final: final
      })
      mostrarToast('sucesso', 'Cupom aplicado com sucesso.')
    } catch (error: any) {
      console.error('Erro ao validar cupom:', error)
      mostrarToast('erro', error?.message || 'Não foi possível validar o cupom.')
    } finally {
      setValidandoCupom(false)
    }
  }

  const removerCupom = () => {
    setCupomAplicado(null)
    setCodigoCupom('')
    mostrarToast('sucesso', 'Cupom removido.')
  }

  const normalizarHorario = (horario: string | null): string | null => {
    if (!horario) return null
    if (horario.length === 5 && horario.includes(':')) return horario
    if (horario.length === 8 && horario.split(':').length === 3) {
      return horario.substring(0, 5)
    }
    return horario
  }

  let configHorarioFinal = configuracaoHorario

  if (usarHorariosPersonalizados && horariosPersonalizados && dataSelecionada) {
    const dataObj = parse(dataSelecionada, 'yyyy-MM-dd', new Date())
    const diaSemanaNum = dataObj.getDay()
    const mapa = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    const diaAbreviado = mapa[diaSemanaNum]
    
    const horarioDia = horariosPersonalizados[diaAbreviado]
    if (horarioDia) {
      configHorarioFinal = {
        inicio: normalizarHorario(horarioDia.abertura) || configuracaoHorario.inicio,
        fim: normalizarHorario(horarioDia.fechamento) || configuracaoHorario.fim,
        intervaloAlmocoInicio: normalizarHorario(horarioDia.almoco_inicio) || configuracaoHorario.intervaloAlmocoInicio,
        intervaloAlmocoFim: normalizarHorario(horarioDia.almoco_fim) || configuracaoHorario.intervaloAlmocoFim,
        diasFuncionamento: configuracaoHorario.diasFuncionamento,
        intervaloHorarios: configuracaoHorario.intervaloHorarios
      }
    }
  }

  const todosHorarios = gerarTodosHorarios(duracaoServico, horariosOcupados, configHorarioFinal, dataSelecionada)

  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  const finalizarAgendamento = async () => {
    if (!tenant) return

    setEnviando(true)
    try {
      let clienteId = null

      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('telefone', telefoneCliente)
        .limit(1)

      if (clienteExistente && clienteExistente.length > 0) {
        clienteId = clienteExistente[0].id
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clientes')
          .insert([{
            tenant_id: tenant.id,
            nome: nomeCliente,
            telefone: telefoneCliente,
          }])
          .select('id')
          .single()

        if (erroCliente) throw erroCliente
        clienteId = novoCliente.id
      }

      const [hora, minuto] = horarioSelecionado.split(':')
      const [ano, mes, dia] = dataSelecionada.split('-').map(Number)
      const dataHora = new Date(ano, mes - 1, dia, parseInt(hora), parseInt(minuto), 0, 0)

      const { data: verificacao } = await supabase
        .from('agendamentos')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('barbeiro_id', barbeiroSelecionado)
        .eq('data_hora', dataHora.toISOString())
        .in('status', ['pendente', 'confirmado'])
        .maybeSingle()

      if (verificacao) {
        mostrarToast('aviso', 'Este horário acabou de ser reservado. Escolha outro horário.')
        setEnviando(false)
        setEtapa(2)
        return
      }

      const { error: erroAgendamento } = await supabase
        .from('agendamentos')
        .insert([{
          tenant_id: tenant.id,
          cliente_id: clienteId,
          barbeiro_id: barbeiroSelecionado,
          servico_id: servicosSelecionados[0],
          servicos_ids: servicosSelecionados,
          data_hora: dataHora.toISOString(),
          status: 'pendente',
          cupom_id: cupomAplicado?.cupom_id || null,
          cupom_codigo: cupomAplicado?.cupom_codigo || null,
          valor_bruto: precoTotal,
          valor_desconto: cupomAplicado?.valor_desconto || 0,
          valor_pago: totalComDesconto,
          observacoes: observacoes || null,
        }])

      if (erroAgendamento) {
        const mensagemCupom = erroAgendamento.message?.toLowerCase().includes('cupom')
        if (mensagemCupom) {
          mostrarToast('erro', erroAgendamento.message)
        }
        throw erroAgendamento
      }

      localStorage.setItem('dadosCliente', JSON.stringify({
        nome: nomeCliente,
        telefone: telefoneCliente,
      }))

      setAgendamentoConcluido(true)
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error)
      mostrarToast('erro', `Erro ao criar agendamento: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setEnviando(false)
    }
  }

  const etapaCompleta = () => {
    switch (etapa) {
      case 1:
        return barbeiroSelecionado !== '' && servicosSelecionados.length > 0
      case 2:
        return dataSelecionada !== '' && horarioSelecionado !== ''
      case 3:
        return nomeCliente !== '' && telefoneCliente.replace(/\D/g, '').length >= 10
      default:
        return false
    }
  }

  const avancarEtapa = () => {
    if (etapaCompleta()) {
      setEtapa(etapa + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const voltarEtapa = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: cores.primaria }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: cores.secundaria }} />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Barbearia não encontrada</h1>
          <Link href="/" className="text-white hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  if (!barbeariaAberta) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: cores.primaria }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full rounded-2xl p-8 text-center border"
          style={{ 
            backgroundColor: cores.destaque + '10',
            borderColor: cores.destaque + '30'
          }}
        >
          <div 
            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: cores.destaque + '20' }}
          >
            <Lock className="w-8 h-8" style={{ color: cores.secundaria }} />
          </div>
          
          <h2 className="text-2xl font-bold mb-4" style={{ color: cores.secundaria }}>
            Agendamentos Fechados
          </h2>
          
          <p className="mb-6" style={{ color: cores.destaque }}>
            {mensagemFechamento || 'No momento não estamos aceitando agendamentos. Volte mais tarde!'}
          </p>
          
          <Link
            href={`/${slug}`}
            className="inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl transition-all hover:scale-[1.02]"
            style={{ 
              backgroundColor: cores.secundaria,
              color: cores.primaria
            }}
          >
            Voltar
          </Link>
        </motion.div>
      </div>
    )
  }

  if (agendamentoConcluido) {
    const barbeiroInfo = barbeiros.find(b => b.id === barbeiroSelecionado)
    const servicosInfo = servicos.filter(s => servicosSelecionados.includes(s.id))
    const duracaoTotal = servicosInfo.reduce((acc, s) => acc + s.duracao, 0)
    const valorTotal = servicosInfo.reduce((acc, s) => acc + s.preco, 0)

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: cores.primaria }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full"
        >
          {/* Card Principal */}
          <div 
            className="rounded-2xl overflow-hidden border"
            style={{ 
              backgroundColor: cores.destaque + '08',
              borderColor: cores.destaque + '15'
            }}
          >
            {/* Header com ícone de sucesso */}
            <div 
              className="px-6 py-8 text-center"
              style={{ backgroundColor: cores.secundaria + '08' }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: cores.secundaria }}
              >
                <Check className="w-8 h-8" style={{ color: cores.primaria }} />
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold mb-2" 
                style={{ color: cores.secundaria }}
              >
                Agendamento Confirmado
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm" 
                style={{ color: cores.destaque }}
              >
                Você receberá uma confirmação por WhatsApp
              </motion.p>
            </div>

            {/* Detalhes do Agendamento */}
            <div className="px-6 py-6 space-y-4">
              {/* Serviços e Profissional */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex items-start gap-4"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cores.destaque + '15' }}
                >
                  <Scissors className="w-5 h-5" style={{ color: cores.secundaria }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="space-y-1">
                    {servicosInfo.map((servico, idx) => (
                      <p key={servico.id} className="font-semibold truncate" style={{ color: cores.secundaria }}>
                        {servico.nome}
                        {idx < servicosInfo.length - 1 && <span className="text-xs ml-1" style={{ color: cores.destaque }}>+</span>}
                      </p>
                    ))}
                  </div>
                  <p className="text-sm mt-1" style={{ color: cores.destaque }}>
                    com {barbeiroInfo?.nome} • {duracaoTotal} min
                  </p>
                </div>
              </motion.div>

              {/* Data e Horário */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-4"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cores.destaque + '15' }}
                >
                  <Calendar className="w-5 h-5" style={{ color: cores.secundaria }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: cores.secundaria }}>
                    {dataSelecionada && format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-sm" style={{ color: cores.destaque }}>
                    às {horarioSelecionado}
                  </p>
                </div>
              </motion.div>

              {/* Valor */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="pt-4 mt-4 border-t flex items-center justify-between"
                style={{ borderColor: cores.destaque + '15' }}
              >
                <span className="text-sm" style={{ color: cores.destaque }}>
                  {servicosInfo.length > 1 ? 'Valor total' : 'Valor do serviço'}
                </span>
                <span className="text-xl font-bold" style={{ color: cores.secundaria }}>
                  R$ {valorTotal.toFixed(2)}
                </span>
              </motion.div>
            </div>

            {/* Footer com botão */}
            <div className="px-6 pb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Link
                  href={`/${slug}`}
                  className="block w-full py-3.5 font-semibold rounded-xl text-center transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ 
                    backgroundColor: cores.secundaria,
                    color: cores.primaria
                  }}
                >
                  Voltar ao Início
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Texto de rodapé */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs mt-4" 
            style={{ color: cores.destaque + '80' }}
          >
            Dúvidas? Entre em contato com {tenant.nome}
          </motion.p>
        </motion.div>
      </div>
    )
  }

  const ETAPAS_INFO = [
    { numero: 1, titulo: 'Serviço' },
    { numero: 2, titulo: 'Horário' },
    { numero: 3, titulo: 'Dados' },
    { numero: 4, titulo: 'Confirmar' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: cores.primaria }}>
      {/* Header */}
      <header 
        className="sticky top-0 z-50 border-b"
        style={{ 
          backgroundColor: cores.primaria,
          borderColor: cores.destaque + '20'
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href={`/${slug}`} 
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: cores.destaque }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <h1 className="text-lg font-semibold" style={{ color: cores.secundaria }}>
              {tenant.nome}
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Progress Steps - Clicável */}
      <div 
        className="border-b"
        style={{ borderColor: cores.destaque + '20' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            {ETAPAS_INFO.map((item, index) => {
              // Pode clicar apenas em etapas já completadas (anteriores à atual)
              const podeClicar = item.numero < etapa
              
              return (
                <div key={item.numero} className="flex items-center">
                  <button
                    onClick={() => podeClicar && setEtapa(item.numero)}
                    disabled={!podeClicar}
                    className={`flex flex-col items-center transition-all ${podeClicar ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${podeClicar ? 'ring-2 ring-offset-2 ring-white/30' : ''}`}
                      style={{
                        backgroundColor: item.numero <= etapa ? cores.secundaria : cores.destaque + '20',
                        color: item.numero <= etapa ? cores.primaria : cores.destaque
                      }}
                    >
                      {item.numero < etapa ? <Check className="w-4 h-4" /> : item.numero}
                    </div>
                    <span 
                      className="text-xs mt-1 hidden sm:block"
                      style={{ color: item.numero === etapa ? cores.secundaria : cores.destaque }}
                    >
                      {item.titulo}
                    </span>
                  </button>
                  {index < ETAPAS_INFO.length - 1 && (
                    <div
                      className="w-8 sm:w-12 h-0.5 mx-1 rounded"
                      style={{ backgroundColor: item.numero < etapa ? cores.secundaria : cores.destaque + '20' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait" initial={false}>
          {/* Etapa 1: Serviço e Barbeiro */}
          {etapa === 1 && (
            <div
              key="etapa1"
              className="space-y-8 animate-in fade-in duration-200"
            >
              {/* Serviços - Seleção Múltipla */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 
                    className="text-lg font-semibold flex items-center gap-2"
                    style={{ color: cores.secundaria }}
                  >
                    <Scissors className="w-5 h-5" style={{ color: cores.destaque }} />
                    Escolha os Serviços
                  </h2>
                  {servicosSelecionados.length > 0 && (
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ backgroundColor: cores.secundaria + '20', color: cores.secundaria }}
                    >
                      {servicosSelecionados.length} selecionado{servicosSelecionados.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="grid gap-3">
                  {servicos.map((servico) => {
                    const estaSelecionado = servicosSelecionados.includes(servico.id)
                    const comentario = (servico.descricao || '').trim()
                    const exibirComentario = comentario.length > 0 && comentario.toLowerCase() !== servico.nome.trim().toLowerCase()
                    
                    return (
                      <button
                        key={servico.id}
                        onClick={() => {
                          if (estaSelecionado) {
                            setServicosSelecionados(prev => prev.filter(id => id !== servico.id))
                          } else {
                            setServicosSelecionados(prev => [...prev, servico.id])
                          }
                        }}
                        className="p-4 rounded-xl border text-left transition-all hover:scale-[1.01] relative"
                        style={{
                          backgroundColor: estaSelecionado 
                            ? cores.secundaria + '15' 
                            : cores.destaque + '08',
                          borderColor: estaSelecionado 
                            ? cores.secundaria 
                            : cores.destaque + '20'
                        }}
                      >
                        {/* Indicador de seleção */}
                        <div 
                          className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            estaSelecionado ? 'scale-100' : 'scale-90'
                          }`}
                          style={{ 
                            borderColor: estaSelecionado ? cores.secundaria : cores.destaque + '50',
                            backgroundColor: estaSelecionado ? cores.secundaria : 'transparent'
                          }}
                        >
                          {estaSelecionado && (
                            <Check className="w-3 h-3" style={{ color: cores.primaria }} />
                          )}
                        </div>
                        
                        <div className="flex justify-between items-start pr-8">
                          <div>
                            <h3 className="font-semibold" style={{ color: cores.secundaria }}>
                              {servico.nome}
                            </h3>
                            {exibirComentario && (
                              <p className="text-sm mt-1 leading-relaxed line-clamp-3 md:line-clamp-2" style={{ color: cores.destaque }}>
                                {comentario}
                              </p>
                            )}
                            <p className="text-sm mt-1" style={{ color: cores.destaque }}>
                              <Clock className="w-3 h-3 inline mr-1" />
                              {servico.duracao} min
                            </p>
                          </div>
                          <span className="font-bold" style={{ color: cores.secundaria }}>
                            R$ {servico.preco.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                
                {/* Resumo dos serviços selecionados */}
                {servicosSelecionados.length > 1 && (
                  <div 
                    className="mt-4 p-3 rounded-xl flex items-center justify-between"
                    style={{ backgroundColor: cores.secundaria + '10' }}
                  >
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4" style={{ color: cores.secundaria }} />
                      <span className="text-sm font-medium" style={{ color: cores.secundaria }}>
                        {servicosSelecionados.length} serviços • {duracaoServico} min
                      </span>
                    </div>
                    <span className="font-bold" style={{ color: cores.secundaria }}>
                      R$ {precoTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Barbeiros */}
              <div>
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: cores.secundaria }}
                >
                  <User className="w-5 h-5" style={{ color: cores.destaque }} />
                  Escolha o Profissional
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {barbeiros.map((barbeiro) => (
                    <button
                      key={barbeiro.id}
                      onClick={() => setBarbeiroSelecionado(barbeiro.id)}
                      className="p-4 rounded-xl border text-center transition-all hover:scale-[1.02]"
                      style={{
                        backgroundColor: barbeiroSelecionado === barbeiro.id 
                          ? cores.secundaria + '15' 
                          : cores.destaque + '08',
                        borderColor: barbeiroSelecionado === barbeiro.id 
                          ? cores.secundaria 
                          : cores.destaque + '20'
                      }}
                    >
                      <div 
                        className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: cores.destaque + '20' }}
                      >
                        {barbeiro.foto_url ? (
                          <Image
                            src={barbeiro.foto_url}
                            alt={barbeiro.nome}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8" style={{ color: cores.destaque }} />
                        )}
                      </div>
                      <h3 className="font-semibold" style={{ color: cores.secundaria }}>
                        {barbeiro.nome}
                      </h3>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Etapa 2: Data e Horário */}
          {etapa === 2 && (
            <div
              key="etapa2"
              className="space-y-8 animate-in fade-in duration-200"
            >
              {/* Seletor de Data */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 
                    className="text-lg font-semibold flex items-center gap-2"
                    style={{ color: cores.secundaria }}
                  >
                    <Calendar className="w-5 h-5" style={{ color: cores.destaque }} />
                    Escolha a Data
                  </h2>
                  
                  {/* Toggle modo de visualização */}
                  <div 
                    className="flex items-center rounded-lg p-0.5"
                    style={{ backgroundColor: cores.destaque + '15' }}
                  >
                    <button
                      onClick={() => setModoCalendario('rapido')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                        modoCalendario === 'rapido' ? 'shadow-sm' : ''
                      }`}
                      style={{
                        backgroundColor: modoCalendario === 'rapido' ? cores.secundaria : 'transparent',
                        color: modoCalendario === 'rapido' ? cores.primaria : cores.destaque
                      }}
                    >
                      Rápido
                    </button>
                    <button
                      onClick={() => setModoCalendario('calendario')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                        modoCalendario === 'calendario' ? 'shadow-sm' : ''
                      }`}
                      style={{
                        backgroundColor: modoCalendario === 'calendario' ? cores.secundaria : 'transparent',
                        color: modoCalendario === 'calendario' ? cores.primaria : cores.destaque
                      }}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      Calendário
                    </button>
                  </div>
                </div>

                {/* Modo Rápido - Scroll horizontal com próximos 14 dias */}
                {modoCalendario === 'rapido' && (
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {datasDisponiveis.slice(0, 14).map((data) => {
                      const dataObj = parse(data.valor, 'yyyy-MM-dd', new Date())
                      const diaSemana = format(dataObj, 'EEE', { locale: ptBR })
                      const diaNumero = format(dataObj, 'dd')
                      const mes = format(dataObj, 'MMM', { locale: ptBR })
                      const ehHoje = isToday(dataObj)
                      
                      return (
                        <button
                          key={data.valor}
                          onClick={() => {
                            setDataSelecionada(data.valor)
                            setHorarioSelecionado('')
                          }}
                          className="flex-shrink-0 w-[72px] p-3 rounded-xl border text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            backgroundColor: dataSelecionada === data.valor 
                              ? cores.secundaria + '15' 
                              : cores.destaque + '08',
                            borderColor: dataSelecionada === data.valor 
                              ? cores.secundaria 
                              : cores.destaque + '20'
                          }}
                        >
                          <p className="text-[10px] uppercase font-medium" style={{ color: cores.destaque }}>
                            {ehHoje ? 'Hoje' : diaSemana}
                          </p>
                          <p className="text-2xl font-bold" style={{ color: cores.secundaria }}>{diaNumero}</p>
                          <p className="text-[10px]" style={{ color: cores.destaque }}>{mes}</p>
                        </button>
                      )
                    })}
                    
                    {/* Botão para ver mais datas */}
                    <button
                      onClick={() => setModoCalendario('calendario')}
                      className="flex-shrink-0 w-[72px] p-3 rounded-xl border border-dashed text-center transition-all hover:scale-[1.02] flex flex-col items-center justify-center gap-1"
                      style={{ borderColor: cores.destaque + '40' }}
                    >
                      <CalendarDays className="w-5 h-5" style={{ color: cores.destaque }} />
                      <p className="text-[10px] font-medium" style={{ color: cores.destaque }}>
                        Ver mais
                      </p>
                    </button>
                  </div>
                )}

                {/* Modo Calendário - Calendário mensal completo */}
                {modoCalendario === 'calendario' && (() => {
                  const hoje = startOfDay(new Date())
                  const dataLimite = new Date()
                  dataLimite.setDate(dataLimite.getDate() + 60)
                  
                  const inicioMes = startOfMonth(mesAtual)
                  const fimMes = endOfMonth(mesAtual)
                  const diasDoMes = eachDayOfInterval({ start: inicioMes, end: fimMes })
                  
                  const primeiroDiaSemana = getDay(inicioMes)
                  const diasVaziosInicio = Array(primeiroDiaSemana).fill(null)
                  
                  const podeMesAnterior = !isBefore(startOfMonth(subMonths(mesAtual, 1)), startOfMonth(hoje))
                  const podeMesSeguinte = isBefore(startOfMonth(addMonths(mesAtual, 1)), dataLimite)
                  
                  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
                  
                  return (
                    <div 
                      className="rounded-xl border p-4"
                      style={{ 
                        backgroundColor: cores.destaque + '05',
                        borderColor: cores.destaque + '20'
                      }}
                    >
                      {/* Header do calendário */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => podeMesAnterior && setMesAtual(subMonths(mesAtual, 1))}
                          disabled={!podeMesAnterior}
                          className={`p-2 rounded-lg transition-all ${podeMesAnterior ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}
                          style={{ color: cores.secundaria }}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <h3 className="text-base font-semibold capitalize" style={{ color: cores.secundaria }}>
                          {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                        
                        <button
                          onClick={() => podeMesSeguinte && setMesAtual(addMonths(mesAtual, 1))}
                          disabled={!podeMesSeguinte}
                          className={`p-2 rounded-lg transition-all ${podeMesSeguinte ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}
                          style={{ color: cores.secundaria }}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                      
                      {/* Dias da semana */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {diasSemana.map((dia) => (
                          <div 
                            key={dia} 
                            className="text-center text-[10px] font-medium py-2"
                            style={{ color: cores.destaque }}
                          >
                            {dia}
                          </div>
                        ))}
                      </div>
                      
                      {/* Grid de dias */}
                      <div className="grid grid-cols-7 gap-1">
                        {/* Dias vazios no início */}
                        {diasVaziosInicio.map((_, idx) => (
                          <div key={`vazio-${idx}`} className="aspect-square" />
                        ))}
                        
                        {/* Dias do mês */}
                        {diasDoMes.map((dia) => {
                          const dataFormatada = format(dia, 'yyyy-MM-dd')
                          const estaSelecionado = dataSelecionada === dataFormatada
                          const ehHoje = isToday(dia)
                          const diaNumero = getDay(dia)
                          
                          const mapaDias: Record<number, string> = {
                            0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab'
                          }
                          const diaSemanaStr = mapaDias[diaNumero]
                          const diaFunciona = configuracaoHorario.diasFuncionamento.includes(diaSemanaStr)
                          
                          const passado = isBefore(dia, hoje)
                          const muitoFuturo = isBefore(dataLimite, dia)
                          const desabilitado = passado || muitoFuturo || !diaFunciona
                          
                          return (
                            <button
                              key={dataFormatada}
                              onClick={() => {
                                if (!desabilitado) {
                                  setDataSelecionada(dataFormatada)
                                  setHorarioSelecionado('')
                                }
                              }}
                              disabled={desabilitado}
                              className={`
                                aspect-square rounded-lg flex items-center justify-center text-sm font-medium
                                transition-all duration-150
                                ${desabilitado 
                                  ? 'opacity-30 cursor-not-allowed' 
                                  : 'hover:scale-105 active:scale-95 cursor-pointer'
                                }
                                ${ehHoje && !estaSelecionado ? 'ring-2 ring-offset-1' : ''}
                              `}
                              style={{
                                backgroundColor: estaSelecionado 
                                  ? cores.secundaria 
                                  : 'transparent',
                                color: estaSelecionado 
                                  ? cores.primaria 
                                  : desabilitado 
                                    ? cores.destaque 
                                    : cores.secundaria,
                                boxShadow: ehHoje && !estaSelecionado 
                                  ? `0 0 0 2px ${cores.primaria}, 0 0 0 4px ${cores.secundaria}50` 
                                  : 'none'
                              }}
                            >
                              {format(dia, 'd')}
                            </button>
                          )
                        })}
                      </div>
                      
                      {/* Legenda */}
                      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: cores.destaque + '15' }}>
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ boxShadow: `0 0 0 2px ${cores.primaria}, 0 0 0 4px ${cores.secundaria}50` }}
                          />
                          <span className="text-[10px]" style={{ color: cores.destaque }}>Hoje</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cores.secundaria }}
                          />
                          <span className="text-[10px]" style={{ color: cores.destaque }}>Selecionado</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-3 h-3 rounded-full opacity-30"
                            style={{ backgroundColor: cores.destaque }}
                          />
                          <span className="text-[10px]" style={{ color: cores.destaque }}>Indisponível</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Data selecionada - Feedback visual */}
                {dataSelecionada && (
                  <div 
                    className="mt-4 p-3 rounded-xl flex items-center gap-3"
                    style={{ backgroundColor: cores.secundaria + '10' }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cores.secundaria + '20' }}
                    >
                      <Calendar className="w-5 h-5" style={{ color: cores.secundaria }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: cores.secundaria }}>
                        {format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs" style={{ color: cores.destaque }}>
                        {isToday(parse(dataSelecionada, 'yyyy-MM-dd', new Date())) ? 'Hoje' : 'Data selecionada'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDataSelecionada('')
                        setHorarioSelecionado('')
                      }}
                      className="p-1.5 rounded-lg transition-all hover:bg-white/10"
                      style={{ color: cores.destaque }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Horários agrupados por período */}
              {dataSelecionada && (
                <div>
                  <h2 
                    className="text-lg font-semibold mb-4 flex items-center gap-2"
                    style={{ color: cores.secundaria }}
                  >
                    <Clock className="w-5 h-5" style={{ color: cores.destaque }} />
                    Escolha o Horário
                  </h2>
                  {todosHorarios.length === 0 ? (
                    <div 
                      className="text-center py-12 rounded-xl border-2 border-dashed"
                      style={{ borderColor: cores.destaque + '30' }}
                    >
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: cores.destaque }} />
                      <p style={{ color: cores.destaque }}>
                        Nenhum horário disponível para esta data.
                      </p>
                      <p className="text-sm mt-1 opacity-60" style={{ color: cores.destaque }}>
                        Tente selecionar outra data.
                      </p>
                      
                      {/* Botão para lista de espera sem preferência */}
                      {barbeiroSelecionado && (
                        <button
                          onClick={() => setModalListaEsperaAberto(true)}
                          className="mt-6 px-6 py-3 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 mx-auto"
                          style={{ 
                            backgroundColor: cores.secundaria + '15',
                            color: cores.secundaria,
                            border: `1px solid ${cores.secundaria}30`
                          }}
                        >
                          <Sparkles className="w-4 h-4" />
                          Entrar na Lista de Espera
                        </button>
                      )}
                    </div>
                  ) : (() => {
                    // Agrupar horários por período
                    const horariosDisponiveis = todosHorarios.filter(h => h.disponivel)
                    const proximoDisponivel = horariosDisponiveis[0]?.horario || null
                    
                    const manha = todosHorarios.filter(h => {
                      const hora = parseInt(h.horario.split(':')[0])
                      return hora >= 6 && hora < 12
                    })
                    const tarde = todosHorarios.filter(h => {
                      const hora = parseInt(h.horario.split(':')[0])
                      return hora >= 12 && hora < 18
                    })
                    const noite = todosHorarios.filter(h => {
                      const hora = parseInt(h.horario.split(':')[0])
                      return hora >= 18 || hora < 6
                    })
                    
                    const periodos = [
                      { nome: 'Manhã', icone: Sun, horarios: manha, cor: '#f59e0b' },
                      { nome: 'Tarde', icone: Sunset, horarios: tarde, cor: '#f97316' },
                      { nome: 'Noite', icone: Moon, horarios: noite, cor: '#6366f1' }
                    ].filter(p => p.horarios.length > 0)
                    
                    return (
                      <div className="space-y-6">
                        {/* Indicador do próximo horário disponível */}
                        {proximoDisponivel && !horarioSelecionado && (
                          <button
                            onClick={() => setHorarioSelecionado(proximoDisponivel)}
                            className="w-full p-4 rounded-xl border-2 border-dashed transition-all hover:scale-[1.01] active:scale-[0.99]"
                            style={{ 
                              borderColor: cores.secundaria + '50',
                              backgroundColor: cores.secundaria + '08'
                            }}
                          >
                            <div className="flex items-center justify-center gap-3">
                              <Clock className="w-5 h-5" style={{ color: cores.secundaria }} />
                              <span className="font-medium" style={{ color: cores.secundaria }}>
                                Próximo disponível: <strong>{proximoDisponivel}</strong>
                              </span>
                              <ArrowRight className="w-4 h-4" style={{ color: cores.destaque }} />
                            </div>
                          </button>
                        )}

                        {/* Botão Lista de Espera - Sempre visível quando não há horários disponíveis suficientes */}
                        {horariosDisponiveis.length < 3 && (
                          <button
                            onClick={() => setModalListaEsperaAberto(true)}
                            className="w-full p-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                            style={{ 
                              borderColor: cores.destaque + '30',
                              backgroundColor: cores.destaque + '08',
                              color: cores.destaque
                            }}
                          >
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm">Poucos horários? Entre na lista de espera</span>
                          </button>
                        )}
                        
                        {/* Períodos */}
                        {periodos.map((periodo) => {
                          const Icone = periodo.icone
                          const temDisponivel = periodo.horarios.some(h => h.disponivel)
                          
                          return (
                            <div key={periodo.nome}>
                              <div 
                                className="flex items-center gap-2 mb-3 pb-2 border-b"
                                style={{ borderColor: cores.destaque + '20' }}
                              >
                                <Icone className="w-4 h-4" style={{ color: periodo.cor }} />
                                <span className="text-sm font-semibold" style={{ color: cores.secundaria }}>
                                  {periodo.nome}
                                </span>
                                {!temDisponivel && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                                    Lotado
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                {periodo.horarios.map((h) => {
                                  const estaOcupado = !h.disponivel
                                  const estaSelecionado = horarioSelecionado === h.horario
                                  const ehProximo = h.horario === proximoDisponivel && !horarioSelecionado
                                  
                                  return (
                                    <button
                                      key={h.horario}
                                      onClick={() => h.disponivel && setHorarioSelecionado(h.horario)}
                                      disabled={estaOcupado}
                                      className={`
                                        py-2.5 px-2 rounded-lg text-sm font-medium 
                                        transition-all duration-200 ease-out relative
                                        ${estaOcupado 
                                          ? 'bg-red-500/10 text-red-400/60 cursor-not-allowed line-through' 
                                          : estaSelecionado
                                            ? 'scale-[1.02] shadow-lg'
                                            : 'hover:scale-[1.02] active:scale-[0.98]'
                                        }
                                      `}
                                      style={!estaOcupado ? {
                                        backgroundColor: estaSelecionado 
                                          ? cores.secundaria 
                                          : cores.destaque + '12',
                                        color: estaSelecionado 
                                          ? cores.primaria 
                                          : cores.secundaria,
                                        boxShadow: estaSelecionado 
                                          ? `0 4px 14px ${cores.secundaria}40` 
                                          : 'none',
                                        border: ehProximo ? `2px solid ${cores.secundaria}50` : 'none'
                                      } : undefined}
                                    >
                                      {h.horario}
                                      {ehProximo && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cores.secundaria }} />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Etapa 3: Dados do Cliente */}
          {etapa === 3 && (
            <div
              key="etapa3"
              className="space-y-6 animate-in fade-in duration-200"
            >
              <h2 
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: cores.secundaria }}
              >
                <User className="w-5 h-5" style={{ color: cores.destaque }} />
                Seus Dados
              </h2>

              <div className="space-y-4">
                <div>
                  <label 
                    className="block text-sm mb-2"
                    style={{ color: cores.destaque }}
                  >
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none"
                    style={{
                      backgroundColor: cores.destaque + '10',
                      borderColor: cores.destaque + '20',
                      color: cores.secundaria
                    }}
                  />
                </div>

                <div>
                  <label 
                    className="block text-sm mb-2"
                    style={{ color: cores.destaque }}
                  >
                    WhatsApp
                  </label>
                  <div className="relative">
                    <Phone 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: cores.destaque }}
                    />
                    <input
                      type="tel"
                      value={telefoneCliente}
                      onChange={(e) => setTelefoneCliente(formatarTelefone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border transition-all focus:outline-none"
                      style={{
                        backgroundColor: cores.destaque + '10',
                        borderColor: cores.destaque + '20',
                        color: cores.secundaria
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label 
                    className="block text-sm mb-2"
                    style={{ color: cores.destaque }}
                  >
                    Observações (opcional)
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Alguma observação especial?"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none resize-none"
                    style={{
                      backgroundColor: cores.destaque + '10',
                      borderColor: cores.destaque + '20',
                      color: cores.secundaria
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Etapa 4: Confirmação */}
          {etapa === 4 && (
            <div
              key="etapa4"
              className="space-y-6 animate-in fade-in duration-200"
            >
              <h2 
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: cores.secundaria }}
              >
                <Check className="w-5 h-5" style={{ color: cores.destaque }} />
                Confirme seu Agendamento
              </h2>

              <div 
                className="rounded-xl border p-4 sm:p-6 space-y-3 sm:space-y-4"
                style={{ 
                  backgroundColor: cores.destaque + '08',
                  borderColor: cores.destaque + '20'
                }}
              >
                <div 
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 pb-3 sm:pb-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <span className="text-sm" style={{ color: cores.destaque }}>
                    {servicosSelecionados.length > 1 ? 'Serviços' : 'Serviço'}
                  </span>
                  <div className="text-right">
                    {servicosSelecionadosObj.map((s, idx) => (
                      <span key={s.id} className="font-semibold block" style={{ color: cores.secundaria }}>
                        {s.nome}
                        {idx < servicosSelecionadosObj.length - 1 && (
                          <span className="text-xs ml-1" style={{ color: cores.destaque }}>+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div 
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-3 sm:pb-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <span className="text-sm" style={{ color: cores.destaque }}>Profissional</span>
                  <span className="font-semibold text-right" style={{ color: cores.secundaria }}>
                    {barbeiros.find(b => b.id === barbeiroSelecionado)?.nome}
                  </span>
                </div>
                
                <div 
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-3 sm:pb-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <span className="text-sm" style={{ color: cores.destaque }}>Data</span>
                  <span className="font-semibold text-right" style={{ color: cores.secundaria }}>
                    {dataSelecionada && format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                
                <div 
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-3 sm:pb-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <span className="text-sm" style={{ color: cores.destaque }}>Horário</span>
                  <span className="font-semibold text-right" style={{ color: cores.secundaria }}>{horarioSelecionado}</span>
                </div>
                
                <div 
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-3 sm:pb-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <span className="text-sm" style={{ color: cores.destaque }}>Cliente</span>
                  <span className="font-semibold text-right truncate max-w-[200px] sm:max-w-none" style={{ color: cores.secundaria }}>{nomeCliente}</span>
                </div>
                
                <div 
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-3 sm:pb-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <span className="text-sm" style={{ color: cores.destaque }}>WhatsApp</span>
                  <span className="font-semibold text-right" style={{ color: cores.secundaria }}>{telefoneCliente}</span>
                </div>

                <div 
                  className="pb-3 sm:pb-4 border-b space-y-3"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <div className="flex items-center gap-2">
                    <TicketPercent className="w-4 h-4" style={{ color: cores.destaque }} />
                    <span className="text-sm font-medium" style={{ color: cores.destaque }}>Cupom de desconto</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={codigoCupom}
                      onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                      placeholder="Digite o código"
                      className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                      style={{
                        backgroundColor: cores.destaque + '10',
                        borderColor: cores.destaque + '20',
                        color: cores.secundaria
                      }}
                    />

                    {cupomAplicado ? (
                      <button
                        type="button"
                        onClick={removerCupom}
                        className="px-3 py-2 rounded-lg text-sm font-semibold"
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#fff'
                        }}
                      >
                        Remover
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aplicarCupom()}
                        disabled={validandoCupom || !codigoCupom.trim()}
                        className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                        style={{
                          backgroundColor: cores.secundaria,
                          color: cores.primaria
                        }}
                      >
                        {validandoCupom ? 'Validando...' : 'Aplicar'}
                      </button>
                    )}
                  </div>

                  {cupomAplicado && (
                    <div
                      className="rounded-lg px-3 py-2 text-sm"
                      style={{ backgroundColor: '#10b98120', color: '#047857' }}
                    >
                      Cupom <strong>{cupomAplicado.cupom_codigo}</strong> aplicado com desconto de{' '}
                      <strong>R$ {cupomAplicado.valor_desconto.toFixed(2)}</strong>.
                    </div>
                  )}

                  {cuponsFiltradosCheckout.length > 0 && !cupomAplicado && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium" style={{ color: cores.destaque }}>
                        Cupons disponíveis para este agendamento:
                      </p>
                      <div className="grid gap-2">
                        {cuponsFiltradosCheckout.slice(0, 4).map((cupom) => (
                          <button
                            key={cupom.id}
                            type="button"
                            onClick={() => aplicarCupom(cupom.codigo)}
                            className="w-full text-left px-3 py-2 rounded-lg border transition-all hover:scale-[1.01]"
                            style={{
                              backgroundColor: cores.destaque + '10',
                              borderColor: cores.destaque + '25',
                              color: cores.secundaria
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{cupom.codigo}</span>
                              <span className="text-xs" style={{ color: cores.destaque }}>
                                {cupom.tipo_desconto === 'percentual'
                                  ? `${cupom.valor_desconto}%`
                                  : `R$ ${cupom.valor_desconto.toFixed(2)}`}
                              </span>
                            </div>
                            <p className="text-xs mt-1 line-clamp-2" style={{ color: cores.destaque }}>
                              {cupom.nome}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: cores.destaque }}>Subtotal</span>
                    <span className="font-semibold" style={{ color: cores.secundaria }}>
                      R$ {precoTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: cores.destaque }}>Desconto</span>
                    <span className="font-semibold" style={{ color: descontoAplicado > 0 ? '#047857' : cores.secundaria }}>
                      - R$ {descontoAplicado.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div>
                    <span className="text-base sm:text-lg" style={{ color: cores.destaque }}>Total</span>
                    {servicosSelecionados.length > 1 && (
                      <span className="text-xs ml-2" style={{ color: cores.destaque }}>
                        ({servicosSelecionados.length} serviços • {duracaoServico} min)
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-xl sm:text-2xl" style={{ color: cores.secundaria }}>
                    R$ {totalComDesconto.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Espaçador para os botões fixos */}
        <div className="h-28 sm:h-24" />
      </main>

      {/* Navegação Fixa em Baixo */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl"
        style={{ 
          backgroundColor: cores.primaria + 'f5',
          borderColor: cores.destaque + '20'
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            {etapa > 1 && (
              <button
                onClick={voltarEtapa}
                className="flex-1 sm:flex-none sm:w-32 py-3.5 px-4 font-semibold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: cores.destaque + '20',
                  color: cores.secundaria
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            )}
            
            {etapa < 4 ? (
              <button
                onClick={avancarEtapa}
                disabled={!etapaCompleta()}
                className="flex-1 py-3.5 px-6 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                style={{ 
                  backgroundColor: etapaCompleta() ? cores.secundaria : cores.destaque + '30',
                  color: etapaCompleta() ? cores.primaria : cores.destaque,
                  cursor: etapaCompleta() ? 'pointer' : 'not-allowed'
                }}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finalizarAgendamento}
                disabled={enviando}
                className="flex-1 py-3.5 px-6 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                style={{ 
                  backgroundColor: cores.secundaria,
                  color: cores.primaria,
                  opacity: enviando ? 0.7 : 1
                }}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirmar Agendamento
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toast de feedback */}
      <AnimatePresence>
        {toastInfo && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
          >
            <div 
              className={`
                flex items-start gap-3 p-4 rounded-xl border shadow-2xl
                ${toastInfo.tipo === 'erro' ? 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800' : ''}
                ${toastInfo.tipo === 'aviso' ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800' : ''}
                ${toastInfo.tipo === 'sucesso' ? 'bg-green-50 dark:bg-green-950/80 border-green-200 dark:border-green-800' : ''}
              `}
            >
              <AlertCircle 
                className={`w-5 h-5 flex-shrink-0 mt-0.5 
                  ${toastInfo.tipo === 'erro' ? 'text-red-600' : ''}
                  ${toastInfo.tipo === 'aviso' ? 'text-amber-600' : ''}
                  ${toastInfo.tipo === 'sucesso' ? 'text-green-600' : ''}
                `} 
              />
              <p className={`flex-1 text-sm font-medium
                ${toastInfo.tipo === 'erro' ? 'text-red-800 dark:text-red-200' : ''}
                ${toastInfo.tipo === 'aviso' ? 'text-amber-800 dark:text-amber-200' : ''}
                ${toastInfo.tipo === 'sucesso' ? 'text-green-800 dark:text-green-200' : ''}
              `}>
                {toastInfo.mensagem}
              </p>
              <button
                onClick={() => setToastInfo(null)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" style={{ color: cores.destaque }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Lista de Espera sem Preferência de Horário */}
      {tenant && barbeiroSelecionado && (
        <ModalListaEsperaSemPreferencia
          aberto={modalListaEsperaAberto}
          onFechar={() => setModalListaEsperaAberto(false)}
          tenantId={tenant.id}
          barbeiroId={barbeiroSelecionado}
          barbeiroNome={barbeiros.find(b => b.id === barbeiroSelecionado)?.nome || 'Profissional'}
          cores={cores}
          nomeEstabelecimento={tenant.nome}
        />
      )}
    </div>
  )
}
