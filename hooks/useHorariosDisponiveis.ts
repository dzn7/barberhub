'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parse, addMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ConfiguracaoHorario {
  inicio: string
  fim: string
  intervaloAlmocoInicio: string | null
  intervaloAlmocoFim: string | null
  diasFuncionamento: string[]
  intervaloHorarios: number
  usarHorariosPersonalizados: boolean
  horariosPersonalizados: Record<string, any> | null
}

interface HorarioComStatus {
  horario: string
  disponivel: boolean
  motivo?: 'ocupado' | 'almoco' | 'passado' | 'bloqueado' | 'fora_expediente'
}

interface AgendamentoOcupado {
  horario: string
  duracao: number
}

interface Barbeiro {
  id: string
  nome: string
  foto_url: string | null
}

interface UseHorariosDisponiveisProps {
  tenantId: string | null
  barbeiroId: string | null
  dataSelecionada: string | null
  duracaoServico?: number
}

interface UseHorariosDisponiveisReturn {
  horarios: HorarioComStatus[]
  carregando: boolean
  erro: string | null
  horariosOcupados: AgendamentoOcupado[]
  configuracao: ConfiguracaoHorario | null
  totalDisponiveis: number
  totalOcupados: number
  recarregar: () => void
}

const MAPA_DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

const CONFIG_PADRAO: ConfiguracaoHorario = {
  inicio: '09:00',
  fim: '18:00',
  intervaloAlmocoInicio: null,
  intervaloAlmocoFim: null,
  diasFuncionamento: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
  intervaloHorarios: 20,
  usarHorariosPersonalizados: false,
  horariosPersonalizados: null
}

function normalizarHorario(horario: string | null | undefined): string | null {
  if (!horario) return null
  const limpo = horario.trim()
  if (limpo.length >= 5 && limpo.includes(':')) {
    return limpo.substring(0, 5)
  }
  return limpo
}

export function useHorariosDisponiveis({
  tenantId,
  barbeiroId,
  dataSelecionada,
  duracaoServico = 30
}: UseHorariosDisponiveisProps): UseHorariosDisponiveisReturn {
  const [configuracao, setConfiguracao] = useState<ConfiguracaoHorario | null>(null)
  const [horariosOcupados, setHorariosOcupados] = useState<AgendamentoOcupado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const buscarConfiguracao = useCallback(async () => {
    if (!tenantId) return

    try {
      const { data, error } = await supabase
        .from('configuracoes_barbearia')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (error) {
        console.error('Erro ao buscar configuração:', error)
        setConfiguracao(CONFIG_PADRAO)
        return
      }

      setConfiguracao({
        inicio: normalizarHorario(data.horario_abertura) || '09:00',
        fim: normalizarHorario(data.horario_fechamento) || '18:00',
        intervaloAlmocoInicio: normalizarHorario(data.intervalo_almoco_inicio),
        intervaloAlmocoFim: normalizarHorario(data.intervalo_almoco_fim),
        diasFuncionamento: data.dias_funcionamento || CONFIG_PADRAO.diasFuncionamento,
        intervaloHorarios: data.intervalo_horarios || 20,
        usarHorariosPersonalizados: data.usar_horarios_personalizados || false,
        horariosPersonalizados: data.horarios_personalizados
      })
    } catch (err) {
      console.error('Erro ao buscar configuração:', err)
      setConfiguracao(CONFIG_PADRAO)
    }
  }, [tenantId])

  const buscarHorariosOcupados = useCallback(async () => {
    if (!tenantId || !barbeiroId || !dataSelecionada) {
      setHorariosOcupados([])
      return
    }

    try {
      const [ano, mes, dia] = dataSelecionada.split('-').map(Number)
      const inicioDia = new Date(Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0))
      const fimDia = new Date(Date.UTC(ano, mes - 1, dia, 23, 59, 59, 999))

      const [agendamentosRes, bloqueiosRes] = await Promise.all([
        supabase
          .from('agendamentos')
          .select('id, data_hora, status, servicos (duracao)')
          .eq('tenant_id', tenantId)
          .eq('barbeiro_id', barbeiroId)
          .gte('data_hora', inicioDia.toISOString())
          .lte('data_hora', fimDia.toISOString())
          .neq('status', 'cancelado'),
        supabase
          .from('horarios_bloqueados')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('data', dataSelecionada)
          .or(`barbeiro_id.is.null,barbeiro_id.eq.${barbeiroId}`)
      ])

      const ocupados: AgendamentoOcupado[] = []

      if (agendamentosRes.data) {
        agendamentosRes.data.forEach((ag: any) => {
          const horario = format(new Date(ag.data_hora), 'HH:mm')
          const duracao = ag.servicos?.duracao || 30
          ocupados.push({ horario, duracao })
        })
      }

      if (bloqueiosRes.data) {
        bloqueiosRes.data.forEach((bloqueio: any) => {
          const horaInicioStr = bloqueio.horario_inicio.substring(0, 5)
          const horaFimStr = bloqueio.horario_fim.substring(0, 5)
          
          const dataBase = new Date(2000, 0, 1)
          const inicioBloqueio = parse(horaInicioStr, 'HH:mm', dataBase)
          const fimBloqueio = parse(horaFimStr, 'HH:mm', dataBase)
          
          let horarioAtual = inicioBloqueio
          const intervalo = configuracao?.intervaloHorarios || 20

          while (horarioAtual < fimBloqueio) {
            const horarioFormatado = format(horarioAtual, 'HH:mm')
            const tempoRestante = Math.ceil((fimBloqueio.getTime() - horarioAtual.getTime()) / 60000)
            const duracaoBloqueio = Math.min(intervalo, tempoRestante)
            
            ocupados.push({
              horario: horarioFormatado,
              duracao: duracaoBloqueio
            })
            
            horarioAtual = addMinutes(horarioAtual, intervalo)
          }
        })
      }

      setHorariosOcupados(ocupados)
    } catch (err) {
      console.error('Erro ao buscar horários ocupados:', err)
      setErro('Erro ao carregar horários')
    }
  }, [tenantId, barbeiroId, dataSelecionada, configuracao?.intervaloHorarios])

  const horarios = useMemo<HorarioComStatus[]>(() => {
    if (!configuracao || !dataSelecionada) return []

    const dataObj = parse(dataSelecionada, 'yyyy-MM-dd', new Date())
    const diaSemanaNum = dataObj.getDay()
    const diaAbreviado = MAPA_DIAS[diaSemanaNum]

    if (!configuracao.diasFuncionamento.includes(diaAbreviado)) {
      return []
    }

    let configFinal = {
      inicio: configuracao.inicio,
      fim: configuracao.fim,
      intervaloAlmocoInicio: configuracao.intervaloAlmocoInicio,
      intervaloAlmocoFim: configuracao.intervaloAlmocoFim
    }

    if (configuracao.usarHorariosPersonalizados && configuracao.horariosPersonalizados) {
      const horarioDia = configuracao.horariosPersonalizados[diaAbreviado]
      if (horarioDia) {
        configFinal = {
          inicio: normalizarHorario(horarioDia.abertura) || configFinal.inicio,
          fim: normalizarHorario(horarioDia.fechamento) || configFinal.fim,
          intervaloAlmocoInicio: normalizarHorario(horarioDia.almoco_inicio) || configFinal.intervaloAlmocoInicio,
          intervaloAlmocoFim: normalizarHorario(horarioDia.almoco_fim) || configFinal.intervaloAlmocoFim
        }
      }
    }

    const resultado: HorarioComStatus[] = []
    const dataBase = new Date(2000, 0, 1)
    const intervalo = configuracao.intervaloHorarios || 20

    const agora = new Date()
    const hoje = format(agora, 'yyyy-MM-dd')
    const ehHoje = dataSelecionada === hoje
    const horaAtualMinutos = ehHoje ? agora.getHours() * 60 + agora.getMinutes() : 0

    const horaInicio = parse(configFinal.inicio, 'HH:mm', dataBase)
    const horaFim = parse(configFinal.fim, 'HH:mm', dataBase)

    let almocoInicio: Date | null = null
    let almocoFim: Date | null = null

    if (configFinal.intervaloAlmocoInicio && configFinal.intervaloAlmocoFim) {
      almocoInicio = parse(configFinal.intervaloAlmocoInicio, 'HH:mm', dataBase)
      almocoFim = parse(configFinal.intervaloAlmocoFim, 'HH:mm', dataBase)
    }

    let horarioAtual = horaInicio

    while (horarioAtual < horaFim) {
      const horarioFormatado = format(horarioAtual, 'HH:mm')
      const horarioTermino = addMinutes(horarioAtual, duracaoServico)
      
      let disponivel = true
      let motivo: HorarioComStatus['motivo'] = undefined

      if (horarioTermino > horaFim) {
        disponivel = false
        motivo = 'fora_expediente'
      }

      if (disponivel && almocoInicio && almocoFim) {
        const inicioNoAlmoco = horarioAtual >= almocoInicio && horarioAtual < almocoFim
        const terminoNoAlmoco = horarioTermino > almocoInicio && horarioTermino <= almocoFim
        const atravessaAlmoco = horarioAtual < almocoInicio && horarioTermino > almocoFim
        
        if (inicioNoAlmoco || terminoNoAlmoco || atravessaAlmoco) {
          disponivel = false
          motivo = 'almoco'
        }
      }

      if (disponivel) {
        const temConflito = horariosOcupados.some(ocupado => {
          const inicioOcupado = parse(ocupado.horario, 'HH:mm', dataBase)
          const fimOcupado = addMinutes(inicioOcupado, ocupado.duracao)
          
          return (
            (horarioAtual >= inicioOcupado && horarioAtual < fimOcupado) ||
            (horarioTermino > inicioOcupado && horarioTermino <= fimOcupado) ||
            (horarioAtual < inicioOcupado && horarioTermino > fimOcupado)
          )
        })

        if (temConflito) {
          disponivel = false
          motivo = 'ocupado'
        }
      }

      if (disponivel) {
        const [hora, minuto] = horarioFormatado.split(':').map(Number)
        const horarioEmMinutos = hora * 60 + minuto
        
        if (ehHoje && horarioEmMinutos <= horaAtualMinutos) {
          disponivel = false
          motivo = 'passado'
        }
      }

      resultado.push({
        horario: horarioFormatado,
        disponivel,
        motivo
      })

      horarioAtual = addMinutes(horarioAtual, intervalo)
    }

    return resultado
  }, [configuracao, dataSelecionada, horariosOcupados, duracaoServico])

  const totalDisponiveis = useMemo(() => 
    horarios.filter(h => h.disponivel).length, [horarios])

  const totalOcupados = useMemo(() => 
    horarios.filter(h => !h.disponivel).length, [horarios])

  const recarregar = useCallback(() => {
    buscarHorariosOcupados()
  }, [buscarHorariosOcupados])

  useEffect(() => {
    if (tenantId) {
      buscarConfiguracao()
    }
  }, [tenantId, buscarConfiguracao])

  useEffect(() => {
    setCarregando(true)
    buscarHorariosOcupados().finally(() => setCarregando(false))
  }, [buscarHorariosOcupados])

  useEffect(() => {
    if (!tenantId || !barbeiroId || !dataSelecionada) return

    const canalAgendamentos = supabase
      .channel(`horarios-${barbeiroId}-${dataSelecionada}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agendamentos',
        filter: `barbeiro_id=eq.${barbeiroId}`
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

    return () => {
      supabase.removeChannel(canalAgendamentos)
    }
  }, [tenantId, barbeiroId, dataSelecionada, buscarHorariosOcupados])

  return {
    horarios,
    carregando,
    erro,
    horariosOcupados,
    configuracao,
    totalDisponiveis,
    totalOcupados,
    recarregar
  }
}

export function useBarbeirosAtivos(tenantId: string | null) {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setBarbeiros([])
      setCarregando(false)
      return
    }

    const buscar = async () => {
      try {
        const { data, error } = await supabase
          .from('barbeiros')
          .select('id, nome, foto_url')
          .eq('tenant_id', tenantId)
          .eq('ativo', true)
          .order('nome')

        if (error) throw error
        setBarbeiros(data || [])
      } catch (err) {
        console.error('Erro ao buscar barbeiros:', err)
      } finally {
        setCarregando(false)
      }
    }

    buscar()
  }, [tenantId])

  return { barbeiros, carregando }
}

export function useDiasFuncionamento(tenantId: string | null) {
  const [diasFuncionamento, setDiasFuncionamento] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setDiasFuncionamento([])
      setCarregando(false)
      return
    }

    const buscar = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes_barbearia')
          .select('dias_funcionamento')
          .eq('tenant_id', tenantId)
          .single()

        if (error) throw error
        setDiasFuncionamento(data?.dias_funcionamento || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'])
      } catch (err) {
        console.error('Erro ao buscar dias de funcionamento:', err)
        setDiasFuncionamento(['seg', 'ter', 'qua', 'qui', 'sex', 'sab'])
      } finally {
        setCarregando(false)
      }
    }

    buscar()
  }, [tenantId])

  return { diasFuncionamento, carregando }
}
