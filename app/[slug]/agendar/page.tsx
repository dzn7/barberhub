'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  Check, 
  Lock,
  ArrowLeft,
  Phone,
  MessageSquare,
  Loader2
} from 'lucide-react'
import { format, parse, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  gerarTodosHorarios, 
  gerarDatasDisponiveis,
  HorarioComStatus 
} from '@/lib/horarios'

interface Tenant {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  cor_primaria: string | null
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

/**
 * Página de Agendamento Multi-tenant
 * Permite ao cliente agendar um horário na barbearia
 */
export default function PaginaAgendar() {
  const params = useParams()
  const slug = params.slug as string
  
  // Estados principais
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Estados do formulário
  const [etapa, setEtapa] = useState(1)
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState('')
  const [servicoSelecionado, setServicoSelecionado] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState('')
  const [horarioSelecionado, setHorarioSelecionado] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [telefoneCliente, setTelefoneCliente] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  // Estados de controle
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

  // Carregar dados iniciais
  useEffect(() => {
    if (slug) {
      carregarDados()
    }
  }, [slug])

  // Carregar dados do localStorage
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

  // Realtime para status da barbearia
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

  // Buscar horários ocupados quando data e barbeiro são selecionados
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

        // Buscar agendamentos
        const { data: agendamentosData, error: errorAgendamentos } = await supabase
          .from('agendamentos')
          .select(`
            id, 
            data_hora, 
            status,
            servicos (duracao)
          `)
          .eq('tenant_id', tenant.id)
          .eq('barbeiro_id', barbeiroSelecionado)
          .gte('data_hora', inicioDia.toISOString())
          .lte('data_hora', fimDia.toISOString())
          .neq('status', 'cancelado')

        if (errorAgendamentos) {
          console.error('Erro ao buscar agendamentos:', errorAgendamentos)
        }

        // Buscar horários bloqueados
        const { data: bloqueiosData, error: errorBloqueios } = await supabase
          .from('horarios_bloqueados')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('data', dataSelecionada)
          .or(`barbeiro_id.is.null,barbeiro_id.eq.${barbeiroSelecionado}`)

        if (errorBloqueios) {
          console.error('Erro ao buscar bloqueios:', errorBloqueios)
        }

        // Converter agendamentos para o formato: {horario, duracao}
        const ocupadosAgendamentos = (agendamentosData || []).map((ag: any) => {
          const horario = format(new Date(ag.data_hora), 'HH:mm')
          const duracao = ag.servicos?.duracao || 30
          return { horario, duracao }
        })

        // Converter bloqueios para o formato: {horario, duracao}
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

    // Realtime para agendamentos e bloqueios
    if (dataSelecionada && barbeiroSelecionado && tenant) {
      channel = supabase
        .channel(`horarios-${barbeiroSelecionado}-${dataSelecionada}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'agendamentos',
            filter: `barbeiro_id=eq.${barbeiroSelecionado}`
          },
          () => {
            buscarHorariosOcupados()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'horarios_bloqueados'
          },
          () => {
            buscarHorariosOcupados()
          }
        )
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
      // Buscar tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, slug, nome, logo_url, cor_primaria')
        .eq('slug', slug)
        .eq('ativo', true)
        .single()

      if (tenantError || !tenantData) {
        console.error('Tenant não encontrado')
        return
      }

      setTenant(tenantData)

      // Buscar configurações, barbeiros e serviços em paralelo
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

      // Processar configurações
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

      // Selecionar primeiro barbeiro automaticamente
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

  // Gerar datas disponíveis filtrando por dias de funcionamento
  const todasDatas = gerarDatasDisponiveis()
  const datasDisponiveis = todasDatas.filter(data => {
    const dataObj = parse(data.valor, 'yyyy-MM-dd', new Date())
    const diaSemanaNum = dataObj.getDay()
    const mapa = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
    const diaAbreviado = mapa[diaSemanaNum]
    return configuracaoHorario.diasFuncionamento.includes(diaAbreviado)
  })

  // Calcular horários disponíveis
  const servicoObj = servicos.find(s => s.id === servicoSelecionado)
  const duracaoServico = servicoObj?.duracao || 30

  // Normalizar horário
  const normalizarHorario = (horario: string | null): string | null => {
    if (!horario) return null
    if (horario.length === 5 && horario.includes(':')) return horario
    if (horario.length === 8 && horario.split(':').length === 3) {
      return horario.substring(0, 5)
    }
    return horario
  }

  // Determinar configuração de horário baseada no dia selecionado
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
  const horariosDisponiveis = todosHorarios.filter(h => h.disponivel).map(h => h.horario)

  // Formatar telefone
  const formatarTelefone = (valor: string) => {
    const numeros = valor.replace(/\D/g, '')
    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
  }

  // Finalizar agendamento
  const finalizarAgendamento = async () => {
    if (!tenant) return

    setEnviando(true)
    try {
      // Criar ou buscar cliente
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

      // Criar data/hora
      const [hora, minuto] = horarioSelecionado.split(':')
      const [ano, mes, dia] = dataSelecionada.split('-').map(Number)
      const dataHora = new Date(ano, mes - 1, dia, parseInt(hora), parseInt(minuto), 0, 0)

      // Verificar disponibilidade
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

      // Criar agendamento
      const { data: agendamento, error: erroAgendamento } = await supabase
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
        .select()
        .single()

      if (erroAgendamento) throw erroAgendamento

      // Salvar dados do cliente no localStorage
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

  // Verificar se etapa está completa
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

  // Avançar etapa
  const avancarEtapa = () => {
    if (etapaCompleta()) {
      setEtapa(etapa + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Voltar etapa
  const voltarEtapa = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Loading
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-zinc-400">Carregando...</p>
        </div>
      </div>
    )
  }

  // Tenant não encontrado
  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Barbearia não encontrada</h1>
          <Link href="/" className="text-amber-500 hover:underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    )
  }

  // Barbearia fechada
  if (!barbeariaAberta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900 rounded-2xl p-8 text-center border border-red-800"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-900/30 rounded-full">
              <Lock className="h-16 w-16 text-red-400" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            Barbearia Fechada
          </h2>
          
          <p className="text-zinc-400 mb-6">
            {mensagemFechamento || 'No momento não estamos aceitando agendamentos. Volte mais tarde!'}
          </p>
          
          <Link
            href={`/${slug}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
          >
            Voltar para Início
          </Link>
        </motion.div>
      </div>
    )
  }

  // Agendamento concluído
  if (agendamentoConcluido) {
    const barbeiroNome = barbeiros.find(b => b.id === barbeiroSelecionado)?.nome || ''
    const servicoNome = servicos.find(s => s.id === servicoSelecionado)?.nome || ''
    const servicoPreco = servicos.find(s => s.id === servicoSelecionado)?.preco || 0

    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-green-900/30 rounded-full">
              <Check className="h-16 w-16 text-green-400" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white">
            Agendamento Confirmado!
          </h2>
          
          <p className="text-lg text-zinc-400">
            Seu horário foi agendado com sucesso.
          </p>

          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-zinc-400">Barbeiro:</span>
              <span className="font-semibold text-white">{barbeiroNome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Serviço:</span>
              <span className="font-semibold text-white">{servicoNome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Data:</span>
              <span className="font-semibold text-white">
                {dataSelecionada && format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Horário:</span>
              <span className="font-semibold text-white">{horarioSelecionado}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-700 pt-3 mt-3">
              <span className="text-zinc-400">Valor:</span>
              <span className="font-bold text-amber-500 text-lg">
                R$ {servicoPreco.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={`/${slug}`}
              className="w-full py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Voltar ao Início
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/${slug}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar</span>
            </Link>
            <h1 className="text-lg font-semibold text-white">{tenant.nome}</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-zinc-900 border-b border-zinc-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    step <= etapa
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {step < etapa ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-12 h-1 mx-1 rounded ${
                      step < etapa ? 'bg-amber-500' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-sm text-zinc-400">
            {etapa === 1 && 'Escolha o serviço e barbeiro'}
            {etapa === 2 && 'Escolha data e horário'}
            {etapa === 3 && 'Seus dados'}
            {etapa === 4 && 'Confirmação'}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Etapa 1: Serviço e Barbeiro */}
        {etapa === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Serviços */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Scissors className="w-5 h-5 text-amber-500" />
                Escolha o Serviço
              </h2>
              <div className="grid gap-3">
                {servicos.map((servico) => (
                  <button
                    key={servico.id}
                    onClick={() => setServicoSelecionado(servico.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      servicoSelecionado === servico.id
                        ? 'bg-amber-500/10 border-amber-500'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white">{servico.nome}</h3>
                        {servico.descricao && (
                          <p className="text-sm text-zinc-400 mt-1">{servico.descricao}</p>
                        )}
                        <p className="text-sm text-zinc-500 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {servico.duracao} min
                        </p>
                      </div>
                      <span className="text-amber-500 font-bold">
                        R$ {servico.preco.toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Barbeiros */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-amber-500" />
                Escolha o Profissional
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {barbeiros.map((barbeiro) => (
                  <button
                    key={barbeiro.id}
                    onClick={() => setBarbeiroSelecionado(barbeiro.id)}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      barbeiroSelecionado === barbeiro.id
                        ? 'bg-amber-500/10 border-amber-500'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {barbeiro.foto_url ? (
                        <Image
                          src={barbeiro.foto_url}
                          alt={barbeiro.nome}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-zinc-600" />
                      )}
                    </div>
                    <h3 className="font-semibold text-white">{barbeiro.nome}</h3>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Etapa 2: Data e Horário */}
        {etapa === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Datas */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
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
                      className={`flex-shrink-0 w-20 p-3 rounded-xl border text-center transition-all ${
                        dataSelecionada === data.valor
                          ? 'bg-amber-500/10 border-amber-500'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs text-zinc-400 uppercase">{diaSemana}</p>
                      <p className="text-2xl font-bold text-white">{diaNumero}</p>
                      <p className="text-xs text-zinc-400">{mes}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Horários */}
            {dataSelecionada && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Escolha o Horário
                </h2>
                {todosHorarios.length === 0 ? (
                  <p className="text-zinc-400 text-center py-8">
                    Nenhum horário disponível para esta data.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {todosHorarios.map((h) => (
                      <button
                        key={h.horario}
                        onClick={() => h.disponivel && setHorarioSelecionado(h.horario)}
                        disabled={!h.disponivel}
                        className={`py-3 px-2 rounded-lg text-sm font-medium transition-all ${
                          !h.disponivel
                            ? 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed line-through'
                            : horarioSelecionado === h.horario
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-900 text-white border border-zinc-800 hover:border-zinc-700'
                        }`}
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              Seus Dados
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome completo</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">WhatsApp</label>
                <input
                  type="tel"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Observações (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Alguma observação especial?"
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Etapa 4: Confirmação */}
        {etapa === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Check className="w-5 h-5 text-amber-500" />
              Confirme seu Agendamento
            </h2>

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400">Serviço</span>
                <span className="text-white font-semibold">
                  {servicos.find(s => s.id === servicoSelecionado)?.nome}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400">Profissional</span>
                <span className="text-white font-semibold">
                  {barbeiros.find(b => b.id === barbeiroSelecionado)?.nome}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400">Data</span>
                <span className="text-white font-semibold">
                  {dataSelecionada && format(parse(dataSelecionada, 'yyyy-MM-dd', new Date()), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400">Horário</span>
                <span className="text-white font-semibold">{horarioSelecionado}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400">Cliente</span>
                <span className="text-white font-semibold">{nomeCliente}</span>
              </div>
              
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
                <span className="text-zinc-400">WhatsApp</span>
                <span className="text-white font-semibold">{telefoneCliente}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <span className="text-zinc-400 text-lg">Total</span>
                <span className="text-amber-500 font-bold text-2xl">
                  R$ {servicos.find(s => s.id === servicoSelecionado)?.preco.toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Botões de navegação */}
        <div className="flex gap-3 mt-8">
          {etapa > 1 && (
            <button
              onClick={voltarEtapa}
              className="flex-1 py-3 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Voltar
            </button>
          )}
          
          {etapa < 4 ? (
            <button
              onClick={avancarEtapa}
              disabled={!etapaCompleta()}
              className={`flex-1 py-3 font-semibold rounded-lg transition-colors ${
                etapaCompleta()
                  ? 'bg-amber-500 text-black hover:bg-amber-400'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={finalizarAgendamento}
              disabled={enviando}
              className="flex-1 py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Agendando...
                </>
              ) : (
                'Confirmar Agendamento'
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
