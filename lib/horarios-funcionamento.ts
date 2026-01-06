/**
 * Utilitário de Horários de Funcionamento
 * 
 * Módulo centralizado para buscar e gerenciar horários de funcionamento
 * dos estabelecimentos. Elimina valores hardcoded nos componentes.
 * 
 * @example
 * const config = await buscarConfiguracaoHorarios(tenantId, supabase)
 * const horarios = gerarArrayHorarios(config.horaInicio, config.horaFim)
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Configuração padrão de horários
 * Usada quando tenant não tem configuração personalizada
 */
export const HORARIOS_PADRAO = {
  horaInicio: 8,
  horaFim: 20,
  intervalo: 30,
  diasFuncionamento: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as string[],
}

/**
 * Interface para configuração de horários
 */
export interface ConfiguracaoHorarios {
  horaInicio: number
  horaFim: number
  intervalo: number
  diasFuncionamento: string[]
}

/**
 * Interface para slot de horário disponível
 */
export interface SlotHorario {
  horario: string
  hora: number
  minuto: number
}

/**
 * Busca a configuração de horários do tenant no Supabase
 * 
 * @param tenantId - ID do tenant
 * @param supabase - Cliente Supabase
 * @returns Configuração de horários (padrão se não encontrada)
 */
export async function buscarConfiguracaoHorarios(
  tenantId: string,
  supabase: SupabaseClient
): Promise<ConfiguracaoHorarios> {
  try {
    const { data, error } = await supabase
      .from('configuracoes_barbearia')
      .select('horario_abertura, horario_fechamento, intervalo_horarios, dias_funcionamento')
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      console.log('[Horários] Usando configuração padrão para tenant:', tenantId)
      return HORARIOS_PADRAO
    }

    // Extrair hora do formato HH:MM
    const horaInicio = data.horario_abertura 
      ? parseInt(data.horario_abertura.split(':')[0], 10) 
      : HORARIOS_PADRAO.horaInicio
    
    const horaFim = data.horario_fechamento 
      ? parseInt(data.horario_fechamento.split(':')[0], 10) 
      : HORARIOS_PADRAO.horaFim

    return {
      horaInicio,
      horaFim,
      intervalo: data.intervalo_horarios || HORARIOS_PADRAO.intervalo,
      diasFuncionamento: data.dias_funcionamento || HORARIOS_PADRAO.diasFuncionamento,
    }
  } catch (erro) {
    console.error('[Horários] Erro ao buscar configuração:', erro)
    return HORARIOS_PADRAO
  }
}

/**
 * Gera array de horas do dia baseado na configuração
 * 
 * @param horaInicio - Hora de início (ex: 8)
 * @param horaFim - Hora de fim (ex: 20)
 * @returns Array de números representando as horas [8, 9, 10, ..., 20]
 */
export function gerarArrayHoras(
  horaInicio: number = HORARIOS_PADRAO.horaInicio,
  horaFim: number = HORARIOS_PADRAO.horaFim
): number[] {
  const horas: number[] = []
  for (let h = horaInicio; h <= horaFim; h++) {
    horas.push(h)
  }
  return horas
}

/**
 * Gera todos os slots de horário disponíveis
 * 
 * @param horaInicio - Hora de início
 * @param horaFim - Hora de fim
 * @param intervalo - Intervalo em minutos (padrão: 30)
 * @returns Array de slots de horário
 */
export function gerarSlotsHorario(
  horaInicio: number = HORARIOS_PADRAO.horaInicio,
  horaFim: number = HORARIOS_PADRAO.horaFim,
  intervalo: number = HORARIOS_PADRAO.intervalo
): SlotHorario[] {
  const slots: SlotHorario[] = []
  
  for (let h = horaInicio; h < horaFim; h++) {
    for (let m = 0; m < 60; m += intervalo) {
      slots.push({
        horario: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
        hora: h,
        minuto: m,
      })
    }
  }
  
  return slots
}

/**
 * Verifica se um horário está dentro do período de funcionamento
 * 
 * @param horario - Horário no formato HH:MM
 * @param config - Configuração de horários
 * @returns true se estiver no horário de funcionamento
 */
export function estaNoHorarioFuncionamento(
  horario: string,
  config: ConfiguracaoHorarios
): boolean {
  const [hora, minuto] = horario.split(':').map(Number)
  const minutosTotais = hora * 60 + minuto
  const inicioMinutos = config.horaInicio * 60
  const fimMinutos = config.horaFim * 60
  
  return minutosTotais >= inicioMinutos && minutosTotais < fimMinutos
}

/**
 * Formata hora para exibição
 * 
 * @param hora - Número da hora
 * @returns String formatada (ex: "08:00")
 */
export function formatarHora(hora: number): string {
  return `${hora.toString().padStart(2, '0')}:00`
}

/**
 * Converte dia da semana para abreviação
 */
export const DIAS_SEMANA_ABREV: Record<number, string> = {
  0: 'dom',
  1: 'seg',
  2: 'ter',
  3: 'qua',
  4: 'qui',
  5: 'sex',
  6: 'sab',
}

/**
 * Verifica se um dia da semana está nos dias de funcionamento
 * 
 * @param diaSemana - Número do dia (0 = domingo, 6 = sábado)
 * @param diasFuncionamento - Array de dias que funciona
 * @returns true se estiver funcionando neste dia
 */
export function diaEstaFuncionando(
  diaSemana: number,
  diasFuncionamento: string[]
): boolean {
  const abrev = DIAS_SEMANA_ABREV[diaSemana]
  return diasFuncionamento.includes(abrev)
}
