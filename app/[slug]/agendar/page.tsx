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
  Loader2
} from 'lucide-react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  gerarTodosHorarios, 
  gerarDatasDisponiveis
} from '@/lib/horarios'

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

export default function PaginaAgendar() {
  const params = useParams()
  const slug = params.slug as string
  
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  
  const [etapa, setEtapa] = useState(1)
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState('')
  const [servicoSelecionado, setServicoSelecionado] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
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
      setServicos(servicosRes.data || [])

      if (barbeirosRes.data && barbeirosRes.data.length > 0) {
        setBarbeiroSelecionado(barbeirosRes.data[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setCarregando(false)
    }
  }

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

  const servicoObj = servicos.find(s => s.id === servicoSelecionado)
  const duracaoServico = servicoObj?.duracao || 30

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

  const todosHorarios = gerarTodosHorarios(duracaoServico, horariosOcupados, configHorarioFinal)

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
        alert('Este horário acabou de ser reservado. Escolha outro horário.')
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
          servico_id: servicoSelecionado,
          data_hora: dataHora.toISOString(),
          status: 'pendente',
          observacoes: observacoes || null,
        }])

      if (erroAgendamento) throw erroAgendamento

      localStorage.setItem('dadosCliente', JSON.stringify({
        nome: nomeCliente,
        telefone: telefoneCliente,
      }))

      setAgendamentoConcluido(true)
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error)
      alert(`Erro ao criar agendamento: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setEnviando(false)
    }
  }

  const etapaCompleta = () => {
    switch (etapa) {
      case 1:
        return barbeiroSelecionado !== '' && servicoSelecionado !== ''
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
    const barbeiroNome = barbeiros.find(b => b.id === barbeiroSelecionado)?.nome || ''
    const servicoNome = servicos.find(s => s.id === servicoSelecionado)?.nome || ''
    const servicoPreco = servicos.find(s => s.id === servicoSelecionado)?.preco || 0

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: cores.primaria }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
            style={{ backgroundColor: cores.secundaria }}
          >
            <Check className="w-10 h-10" style={{ color: cores.primaria }} />
          </motion.div>
          
          <h2 className="text-3xl font-bold" style={{ color: cores.secundaria }}>
            Agendamento Confirmado!
          </h2>
          
          <p className="text-lg" style={{ color: cores.destaque }}>
            Seu horário foi agendado com sucesso.
          </p>

          <div 
            className="p-6 rounded-xl border space-y-3 text-left"
            style={{ 
              backgroundColor: cores.destaque + '10',
              borderColor: cores.destaque + '20'
            }}
          >
            <div className="flex justify-between">
              <span style={{ color: cores.destaque }}>Barbeiro:</span>
              <span className="font-semibold" style={{ color: cores.secundaria }}>{barbeiroNome}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: cores.destaque }}>Serviço:</span>
              <span className="font-semibold" style={{ color: cores.secundaria }}>{servicoNome}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: cores.destaque }}>Data:</span>
              <span className="font-semibold" style={{ color: cores.secundaria }}>
                {dataSelecionada && format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: cores.destaque }}>Horário:</span>
              <span className="font-semibold" style={{ color: cores.secundaria }}>{horarioSelecionado}</span>
            </div>
            <div 
              className="flex justify-between pt-3 mt-3 border-t"
              style={{ borderColor: cores.destaque + '20' }}
            >
              <span style={{ color: cores.destaque }}>Valor:</span>
              <span className="font-bold text-lg" style={{ color: cores.secundaria }}>
                R$ {servicoPreco.toFixed(2)}
              </span>
            </div>
          </div>

          <Link
            href={`/${slug}`}
            className="block w-full py-3 font-semibold rounded-xl transition-all hover:scale-[1.02]"
            style={{ 
              backgroundColor: cores.secundaria,
              color: cores.primaria
            }}
          >
            Voltar ao Início
          </Link>
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

      {/* Progress Steps */}
      <div 
        className="border-b"
        style={{ borderColor: cores.destaque + '20' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            {ETAPAS_INFO.map((item, index) => (
              <div key={item.numero} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
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
                </div>
                {index < ETAPAS_INFO.length - 1 && (
                  <div
                    className="w-8 sm:w-12 h-0.5 mx-1 rounded"
                    style={{ backgroundColor: item.numero < etapa ? cores.secundaria : cores.destaque + '20' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Etapa 1: Serviço e Barbeiro */}
          {etapa === 1 && (
            <motion.div
              key="etapa1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Serviços */}
              <div>
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: cores.secundaria }}
                >
                  <Scissors className="w-5 h-5" style={{ color: cores.destaque }} />
                  Escolha o Serviço
                </h2>
                <div className="grid gap-3">
                  {servicos.map((servico) => (
                    <button
                      key={servico.id}
                      onClick={() => setServicoSelecionado(servico.id)}
                      className="p-4 rounded-xl border text-left transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: servicoSelecionado === servico.id 
                          ? cores.secundaria + '15' 
                          : cores.destaque + '08',
                        borderColor: servicoSelecionado === servico.id 
                          ? cores.secundaria 
                          : cores.destaque + '20'
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold" style={{ color: cores.secundaria }}>
                            {servico.nome}
                          </h3>
                          {servico.descricao && (
                            <p className="text-sm mt-1" style={{ color: cores.destaque }}>
                              {servico.descricao}
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
                  ))}
                </div>
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
            </motion.div>
          )}

          {/* Etapa 2: Data e Horário */}
          {etapa === 2 && (
            <motion.div
              key="etapa2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Datas */}
              <div>
                <h2 
                  className="text-lg font-semibold mb-4 flex items-center gap-2"
                  style={{ color: cores.secundaria }}
                >
                  <Calendar className="w-5 h-5" style={{ color: cores.destaque }} />
                  Escolha a Data
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  {datasDisponiveis.slice(0, 10).map((data) => {
                    const dataObj = parse(data.valor, 'yyyy-MM-dd', new Date())
                    const diaSemana = format(dataObj, 'EEE', { locale: ptBR })
                    const diaNumero = format(dataObj, 'dd')
                    const mes = format(dataObj, 'MMM', { locale: ptBR })
                    
                    return (
                      <button
                        key={data.valor}
                        onClick={() => {
                          setDataSelecionada(data.valor)
                          setHorarioSelecionado('')
                        }}
                        className="flex-shrink-0 w-20 p-3 rounded-xl border text-center transition-all hover:scale-[1.02]"
                        style={{
                          backgroundColor: dataSelecionada === data.valor 
                            ? cores.secundaria + '15' 
                            : cores.destaque + '08',
                          borderColor: dataSelecionada === data.valor 
                            ? cores.secundaria 
                            : cores.destaque + '20'
                        }}
                      >
                        <p className="text-xs uppercase" style={{ color: cores.destaque }}>{diaSemana}</p>
                        <p className="text-2xl font-bold" style={{ color: cores.secundaria }}>{diaNumero}</p>
                        <p className="text-xs" style={{ color: cores.destaque }}>{mes}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Horários */}
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
                    <p className="text-center py-8" style={{ color: cores.destaque }}>
                      Nenhum horário disponível para esta data.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                      {todosHorarios.map((h) => (
                        <button
                          key={h.horario}
                          onClick={() => h.disponivel && setHorarioSelecionado(h.horario)}
                          disabled={!h.disponivel}
                          className="py-3 px-2 rounded-lg text-sm font-medium transition-all"
                          style={{
                            backgroundColor: !h.disponivel 
                              ? cores.destaque + '10'
                              : horarioSelecionado === h.horario 
                                ? cores.secundaria 
                                : cores.destaque + '15',
                            color: !h.disponivel 
                              ? cores.destaque + '50'
                              : horarioSelecionado === h.horario 
                                ? cores.primaria 
                                : cores.secundaria,
                            cursor: h.disponivel ? 'pointer' : 'not-allowed',
                            textDecoration: h.disponivel ? 'none' : 'line-through'
                          }}
                        >
                          {h.horario}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Etapa 3: Dados do Cliente */}
          {etapa === 3 && (
            <motion.div
              key="etapa3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
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
            </motion.div>
          )}

          {/* Etapa 4: Confirmação */}
          {etapa === 4 && (
            <motion.div
              key="etapa4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
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
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 pb-3 sm:pb-4 border-b"
                  style={{ borderColor: cores.destaque + '20' }}
                >
                  <span className="text-sm" style={{ color: cores.destaque }}>Serviço</span>
                  <span className="font-semibold text-right" style={{ color: cores.secundaria }}>
                    {servicos.find(s => s.id === servicoSelecionado)?.nome}
                  </span>
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
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base sm:text-lg" style={{ color: cores.destaque }}>Total</span>
                  <span className="font-bold text-xl sm:text-2xl" style={{ color: cores.secundaria }}>
                    R$ {servicos.find(s => s.id === servicoSelecionado)?.preco.toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navegação */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          {etapa > 1 && (
            <button
              onClick={voltarEtapa}
              className="w-full sm:w-auto sm:flex-1 py-4 px-6 font-semibold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: cores.destaque + '20',
                color: cores.secundaria
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          
          {etapa < 4 ? (
            <button
              onClick={avancarEtapa}
              disabled={!etapaCompleta()}
              className="w-full sm:w-auto sm:flex-1 py-4 px-6 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              style={{ 
                backgroundColor: etapaCompleta() ? cores.secundaria : cores.destaque + '20',
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
              className="w-full sm:w-auto sm:flex-1 py-4 px-6 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
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
                  Confirmar
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
