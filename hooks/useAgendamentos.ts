'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, parseISO, addDays, startOfDay, startOfWeek, subDays, subWeeks, addWeeks } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'

const TIMEZONE_BRASILIA = 'America/Sao_Paulo'
const BOT_URL = 'https://bot-barberhub.fly.dev'

export interface Agendamento {
  id: string
  data_hora: string
  status: string
  observacoes?: string
  barbeiro_id: string
  clientes: { nome: string; telefone: string }
  barbeiros: { id: string; nome: string }
  servicos: { nome: string; preco: number; duracao: number }
}

interface UseAgendamentosOptions {
  tenantId?: string
  barbeiroId?: string
  dataInicio: Date
  dataFim: Date
  habilitarRealtime?: boolean
}

interface UseAgendamentosReturn {
  agendamentos: Agendamento[]
  carregando: boolean
  erro: string | null
  buscarAgendamentos: () => Promise<void>
  atualizarStatus: (id: string, novoStatus: string) => Promise<boolean>
  deletarAgendamento: (id: string) => Promise<boolean>
  criarTransacaoEComissao: (agendamento: Agendamento) => Promise<void>
  notificarCancelamento: (agendamento: Agendamento) => Promise<void>
}

/**
 * Hook para gerenciar agendamentos
 * Reutilizável entre admin e barbeiro
 */
export function useAgendamentos({
  tenantId,
  barbeiroId,
  dataInicio,
  dataFim,
  habilitarRealtime = true
}: UseAgendamentosOptions): UseAgendamentosReturn {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const subscriptionRef = useRef<any>(null)

  // Buscar agendamentos
  const buscarAgendamentos = useCallback(async () => {
    if (!tenantId) return

    try {
      setCarregando(true)
      setErro(null)

      const inicioUTC = fromZonedTime(`${format(dataInicio, 'yyyy-MM-dd')}T00:00:00`, TIMEZONE_BRASILIA)
      const fimUTC = fromZonedTime(`${format(dataFim, 'yyyy-MM-dd')}T23:59:59`, TIMEZONE_BRASILIA)

      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          clientes (nome, telefone),
          barbeiros (id, nome),
          servicos (nome, preco, duracao)
        `)
        .eq('tenant_id', tenantId)
        .gte('data_hora', inicioUTC.toISOString())
        .lte('data_hora', fimUTC.toISOString())
        .order('data_hora', { ascending: true })

      // Filtrar por barbeiro se especificado
      if (barbeiroId) {
        query = query.eq('barbeiro_id', barbeiroId)
      }

      const { data, error } = await query

      if (error) throw error
      setAgendamentos(data || [])
    } catch (error: any) {
      console.error('Erro ao buscar agendamentos:', error)
      setErro(error.message || 'Erro ao carregar agendamentos')
    } finally {
      setCarregando(false)
    }
  }, [tenantId, barbeiroId, dataInicio, dataFim])

  // Configurar realtime
  useEffect(() => {
    if (!tenantId || !habilitarRealtime) return

    const filtro = barbeiroId 
      ? `barbeiro_id=eq.${barbeiroId}` 
      : `tenant_id=eq.${tenantId}`

    const canal = supabase
      .channel(`agendamentos-${barbeiroId || tenantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agendamentos',
        filter: filtro
      }, () => {
        buscarAgendamentos()
      })
      .subscribe()

    subscriptionRef.current = canal

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [tenantId, barbeiroId, habilitarRealtime, buscarAgendamentos])

  // Buscar ao montar e quando datas mudarem
  useEffect(() => {
    if (tenantId) {
      buscarAgendamentos()
    }
  }, [tenantId, dataInicio, dataFim, buscarAgendamentos])

  // Atualizar status
  const atualizarStatus = useCallback(async (id: string, novoStatus: string): Promise<boolean> => {
    if (!tenantId) return false

    try {
      const agendamento = agendamentos.find(a => a.id === id)
      if (!agendamento) return false

      const updateData: any = { status: novoStatus }
      if (novoStatus === 'concluido') {
        updateData.concluido_em = new Date().toISOString()
      }

      const { error } = await supabase
        .from('agendamentos')
        .update(updateData)
        .eq('id', id)

      if (error) throw error

      // Criar transação e comissão se concluído
      if (novoStatus === 'concluido') {
        await criarTransacaoEComissao(agendamento)
      }

      // Notificar cancelamento
      if (novoStatus === 'cancelado') {
        await notificarCancelamento(agendamento)
      }

      // Atualizar lista local
      setAgendamentos(prev =>
        prev.map(a => a.id === id ? { ...a, status: novoStatus } : a)
      )

      return true
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      return false
    }
  }, [tenantId, agendamentos])

  // Deletar agendamento
  const deletarAgendamento = useCallback(async (id: string): Promise<boolean> => {
    if (!tenantId) return false

    try {
      // Deletar registros relacionados
      await supabase.from('notificacoes_enviadas').delete().eq('agendamento_id', id)
      await supabase.from('historico_agendamentos').delete().eq('agendamento_id', id)
      await supabase.from('comissoes').update({ agendamento_id: null }).eq('agendamento_id', id)
      await supabase.from('transacoes').update({ agendamento_id: null }).eq('agendamento_id', id)

      const { error } = await supabase.from('agendamentos').delete().eq('id', id)

      if (error) throw error

      setAgendamentos(prev => prev.filter(a => a.id !== id))
      return true
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error)
      return false
    }
  }, [tenantId])

  // Criar transação e comissão
  const criarTransacaoEComissao = useCallback(async (agendamento: Agendamento) => {
    if (!tenantId) return

    try {
      const valorServico = agendamento.servicos?.preco || 0
      const barbeiroIdAtual = agendamento.barbeiros?.id || agendamento.barbeiro_id
      const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA)
      const dataFormatada = format(dataBrasilia, 'yyyy-MM-dd')
      const mes = dataBrasilia.getMonth() + 1
      const ano = dataBrasilia.getFullYear()

      // Buscar percentual de comissão do barbeiro
      const { data: barbeiro } = await supabase
        .from('barbeiros')
        .select('comissao_percentual, total_atendimentos')
        .eq('id', barbeiroIdAtual)
        .single()

      const percentualComissao = barbeiro?.comissao_percentual || 40
      const valorComissao = (valorServico * percentualComissao) / 100

      // Criar transação de receita
      await supabase.from('transacoes').insert({
        tenant_id: tenantId,
        tipo: 'receita',
        categoria: 'servico',
        descricao: `${agendamento.servicos?.nome} - ${agendamento.clientes?.nome}`,
        valor: valorServico,
        data: dataFormatada,
        forma_pagamento: 'dinheiro',
        agendamento_id: agendamento.id,
        barbeiro_id: barbeiroIdAtual
      })

      // Criar registro de comissão
      await supabase.from('comissoes').insert({
        tenant_id: tenantId,
        barbeiro_id: barbeiroIdAtual,
        agendamento_id: agendamento.id,
        valor_servico: valorServico,
        percentual_comissao: percentualComissao,
        valor_comissao: valorComissao,
        mes,
        ano,
        pago: false
      })

      // Incrementar total de atendimentos
      await supabase
        .from('barbeiros')
        .update({ total_atendimentos: (barbeiro?.total_atendimentos || 0) + 1 })
        .eq('id', barbeiroIdAtual)
    } catch (error) {
      console.error('Erro ao criar transação/comissão:', error)
    }
  }, [tenantId])

  // Notificar cancelamento
  const notificarCancelamento = useCallback(async (agendamento: Agendamento) => {
    try {
      const dataBrasilia = toZonedTime(parseISO(agendamento.data_hora), TIMEZONE_BRASILIA)
      const dataFormatada = format(dataBrasilia, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

      const mensagem = `❌ *Agendamento Cancelado*\n\nOlá ${agendamento.clientes?.nome}!\n\nSeu agendamento foi cancelado:\n📅 ${dataFormatada}\n✂️ ${agendamento.servicos?.nome}\n👤 ${agendamento.barbeiros?.nome}\n\n_BarberHub_`

      let telefone = agendamento.clientes?.telefone?.replace(/\D/g, '') || ''
      if (!telefone.startsWith('55')) telefone = '55' + telefone

      await fetch(`${BOT_URL}/api/mensagens/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: telefone, mensagem })
      })
    } catch (error) {
      console.error('Erro ao notificar cancelamento:', error)
    }
  }, [])

  return {
    agendamentos,
    carregando,
    erro,
    buscarAgendamentos,
    atualizarStatus,
    deletarAgendamento,
    criarTransacaoEComissao,
    notificarCancelamento
  }
}

/**
 * Utilitários para cálculos de calendário
 */
export const calendarioUtils = {
  TIMEZONE_BRASILIA,

  calcularPosicaoAgendamento(dataHora: string, duracao: number, alturaHora: number) {
    const dataBrasilia = toZonedTime(parseISO(dataHora), TIMEZONE_BRASILIA)
    const hora = dataBrasilia.getHours()
    const minutos = dataBrasilia.getMinutes()
    const top = ((hora - 7) * alturaHora) + ((minutos / 60) * alturaHora)
    const height = Math.max((duracao / 60) * alturaHora, 40)
    return { top, height }
  },

  agruparPorDia(agendamentos: Agendamento[], dias: Date[]) {
    const grupos: Record<string, Agendamento[]> = {}
    dias.forEach(dia => { grupos[format(dia, 'yyyy-MM-dd')] = [] })

    agendamentos.forEach(ag => {
      const dataBrasilia = toZonedTime(parseISO(ag.data_hora), TIMEZONE_BRASILIA)
      const key = format(dataBrasilia, 'yyyy-MM-dd')
      if (grupos[key]) grupos[key].push(ag)
    })

    return grupos
  },

  formatarDataBrasilia(dataHora: string, formatoStr: string) {
    const dataBrasilia = toZonedTime(parseISO(dataHora), TIMEZONE_BRASILIA)
    return format(dataBrasilia, formatoStr, { locale: ptBR })
  },

  obterDiasSemana(dataBase: Date, visualizacao: 'dia' | '3dias' | 'semana') {
    if (visualizacao === 'dia') return [dataBase]
    if (visualizacao === '3dias') return [subDays(dataBase, 1), dataBase, addDays(dataBase, 1)]
    const inicio = startOfWeek(dataBase, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i))
  },

  navegarPeriodo(dataBase: Date, direcao: 'anterior' | 'proximo', visualizacao: 'dia' | '3dias' | 'semana') {
    const multiplicador = direcao === 'proximo' ? 1 : -1
    if (visualizacao === 'dia') return addDays(dataBase, multiplicador)
    if (visualizacao === '3dias') return addDays(dataBase, multiplicador * 3)
    return direcao === 'proximo' ? addWeeks(dataBase, 1) : subWeeks(dataBase, 1)
  }
}
