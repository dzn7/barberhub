/**
 * Utilitários para geração e validação de horários
 * Sistema de agendamento multi-tenant
 */

import { format, addDays, parse, addMinutes, isBefore, isAfter, startOfDay, set } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface HorarioComStatus {
  horario: string
  disponivel: boolean
  motivo?: string
}

export interface ConfiguracaoHorario {
  inicio: string
  fim: string
  intervaloAlmocoInicio: string | null
  intervaloAlmocoFim: string | null
  diasFuncionamento: string[]
  intervaloHorarios: number
}

/**
 * Gera datas disponíveis para agendamento (hoje + 30 dias)
 */
export function gerarDatasDisponiveis(quantidadeDias: number = 30) {
  const datas = []
  const hoje = new Date()

  for (let i = 0; i < quantidadeDias; i++) {
    const data = addDays(hoje, i)
    datas.push({
      valor: format(data, 'yyyy-MM-dd'),
      label: format(data, "EEEE, dd 'de' MMMM", { locale: ptBR }),
      diaSemana: format(data, 'EEE', { locale: ptBR }).toLowerCase().substring(0, 3)
    })
  }

  return datas
}

/**
 * Valida se uma data está dentro do período permitido
 */
export function validarDataPermitida(data: string): boolean {
  const dataObj = parse(data, 'yyyy-MM-dd', new Date())
  const hoje = startOfDay(new Date())
  const limite = addDays(hoje, 30)
  
  return !isBefore(dataObj, hoje) && !isAfter(dataObj, limite)
}

/**
 * Gera todos os horários do dia com status de disponibilidade
 */
export function gerarTodosHorarios(
  duracaoServico: number,
  horariosOcupados: Array<{ horario: string; duracao: number }>,
  config: ConfiguracaoHorario
): HorarioComStatus[] {
  const horarios: HorarioComStatus[] = []
  const dataBase = new Date(2000, 0, 1)
  
  const horaInicio = parse(config.inicio, 'HH:mm', dataBase)
  const horaFim = parse(config.fim, 'HH:mm', dataBase)
  const intervalo = config.intervaloHorarios || 20

  let horarioAtual = horaInicio

  while (isBefore(horarioAtual, horaFim)) {
    const horarioStr = format(horarioAtual, 'HH:mm')
    const horarioTermino = addMinutes(horarioAtual, duracaoServico)
    
    // Verificar se está no intervalo de almoço
    let noAlmoco = false
    if (config.intervaloAlmocoInicio && config.intervaloAlmocoFim) {
      const almocoInicio = parse(config.intervaloAlmocoInicio, 'HH:mm', dataBase)
      const almocoFim = parse(config.intervaloAlmocoFim, 'HH:mm', dataBase)
      
      noAlmoco = (
        (!isBefore(horarioAtual, almocoInicio) && isBefore(horarioAtual, almocoFim)) ||
        (isAfter(horarioTermino, almocoInicio) && !isAfter(horarioTermino, almocoFim))
      )
    }

    // Verificar se horário está ocupado
    const ocupado = horariosOcupados.some(ocupado => {
      const ocupadoInicio = parse(ocupado.horario, 'HH:mm', dataBase)
      const ocupadoFim = addMinutes(ocupadoInicio, ocupado.duracao)
      
      return (
        (!isBefore(horarioAtual, ocupadoInicio) && isBefore(horarioAtual, ocupadoFim)) ||
        (isAfter(horarioTermino, ocupadoInicio) && !isAfter(horarioTermino, ocupadoFim)) ||
        (!isAfter(ocupadoInicio, horarioAtual) && !isBefore(ocupadoFim, horarioTermino))
      )
    })

    // Verificar se o serviço cabe antes do fechamento
    const cabeAntesFechamento = !isAfter(horarioTermino, horaFim)

    const disponivel = !noAlmoco && !ocupado && cabeAntesFechamento

    horarios.push({
      horario: horarioStr,
      disponivel,
      motivo: noAlmoco ? 'Intervalo de almoço' : ocupado ? 'Horário ocupado' : !cabeAntesFechamento ? 'Fora do expediente' : undefined
    })

    horarioAtual = addMinutes(horarioAtual, intervalo)
  }

  return horarios
}

/**
 * Calcula horário de término baseado na duração do serviço
 */
export function calcularHorarioTermino(horarioInicio: string, duracaoMinutos: number): string {
  const dataBase = new Date(2000, 0, 1)
  const inicio = parse(horarioInicio, 'HH:mm', dataBase)
  const termino = addMinutes(inicio, duracaoMinutos)
  return format(termino, 'HH:mm')
}

/**
 * Formata horário removendo segundos se necessário
 */
export function formatarHorario(horario: string | null): string | null {
  if (!horario) return null
  if (horario.length === 5 && horario.includes(':')) return horario
  if (horario.length === 8 && horario.split(':').length === 3) {
    return horario.substring(0, 5)
  }
  return horario
}
