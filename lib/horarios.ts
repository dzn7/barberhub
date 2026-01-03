/**
 * Utilitários para cálculo de horários dinâmicos
 * Gera horários disponíveis baseados na duração dos serviços
 */

import { addMinutes, format, parse, isAfter, isBefore, isEqual } from 'date-fns';

/**
 * Configuração padrão de horário de funcionamento (fallback)
 */
export const HORARIO_FUNCIONAMENTO_PADRAO = {
  inicio: '09:00',
  fim: '19:00',
  intervaloMinimo: 5,
  intervaloAlmocoInicio: null as string | null,
  intervaloAlmocoFim: null as string | null,
};

/**
 * Interface para configurações de horário
 */
export interface ConfiguracaoHorario {
  inicio: string;
  fim: string;
  intervaloAlmocoInicio?: string | null;
  intervaloAlmocoFim?: string | null;
  intervaloHorarios?: number;
}

/**
 * Tipo para horário com status
 */
export interface HorarioComStatus {
  horario: string;
  disponivel: boolean;
}

/**
 * Gera todos os horários possíveis com status (disponível ou ocupado)
 * 
 * @param duracaoServico - Duração do serviço em minutos
 * @param agendamentosOcupados - Array de objetos com horário e duração dos agendamentos
 * @param config - Configurações de horário (abertura, fechamento, almoço)
 * @returns Array de objetos com horário e status
 */
export function gerarTodosHorarios(
  duracaoServico: number,
  agendamentosOcupados: Array<{horario: string, duracao: number}> = [],
  config: ConfiguracaoHorario = HORARIO_FUNCIONAMENTO_PADRAO
): HorarioComStatus[] {
  const horarios: HorarioComStatus[] = [];
  const dataBase = new Date(2000, 0, 1);
  
  const horaInicio = parse(config.inicio, 'HH:mm', dataBase);
  const horaFim = parse(config.fim, 'HH:mm', dataBase);
  
  let horarioAtual = horaInicio;
  
  // Intervalos de almoço (se configurados)
  let almocoInicio: Date | null = null;
  let almocoFim: Date | null = null;
  
  if (config.intervaloAlmocoInicio && config.intervaloAlmocoFim) {
    almocoInicio = parse(config.intervaloAlmocoInicio, 'HH:mm', dataBase);
    almocoFim = parse(config.intervaloAlmocoFim, 'HH:mm', dataBase);
  }
  
  // Intervalo entre horários (padrão 20 minutos)
  const intervalo = config.intervaloHorarios || 20;
  
  // Gerar todos os horários com o intervalo configurado
  while (isBefore(horarioAtual, horaFim)) {
    const horarioFormatado = format(horarioAtual, 'HH:mm');
    const horarioTermino = addMinutes(horarioAtual, duracaoServico);
    
    // Verificar se o término não ultrapassa o horário de fechamento
    if (isBefore(horarioTermino, horaFim) || isEqual(horarioTermino, horaFim)) {
      // Verificar se está no intervalo de almoço
      let estaNoAlmoco = false;
      if (almocoInicio && almocoFim) {
        estaNoAlmoco = (
          (isAfter(horarioAtual, almocoInicio) || isEqual(horarioAtual, almocoInicio)) && 
          isBefore(horarioAtual, almocoFim)
        ) || (
          isAfter(horarioTermino, almocoInicio) && 
          (isBefore(horarioTermino, almocoFim) || isEqual(horarioTermino, almocoFim))
        );
      }
      
      // Verificar se conflita com agendamentos ocupados
      const temConflito = agendamentosOcupados.some(agendamento => {
        const inicioOcupado = parse(agendamento.horario, 'HH:mm', dataBase);
        const fimOcupado = addMinutes(inicioOcupado, agendamento.duracao);
        
        return (
          (isAfter(horarioAtual, inicioOcupado) || isEqual(horarioAtual, inicioOcupado)) && isBefore(horarioAtual, fimOcupado) ||
          isAfter(horarioTermino, inicioOcupado) && (isBefore(horarioTermino, fimOcupado) || isEqual(horarioTermino, fimOcupado)) ||
          isBefore(horarioAtual, inicioOcupado) && isAfter(horarioTermino, fimOcupado)
        );
      });
      
      horarios.push({
        horario: horarioFormatado,
        disponivel: !temConflito && !estaNoAlmoco
      });
    }
    
    horarioAtual = addMinutes(horarioAtual, intervalo);
  }
  
  return horarios;
}

/**
 * Gera todos os horários possíveis com intervalo configurável (15, 20 ou 30 minutos)
 * Bloqueia horários que conflitam com agendamentos existentes
 * 
 * @param duracaoServico - Duração do serviço em minutos (usado para calcular conflitos)
 * @param agendamentosOcupados - Array de objetos com horário e duração dos agendamentos
 * @param config - Configurações de horário (abertura, fechamento, almoço, intervalo)
 * @returns Array de horários disponíveis
 * 
 * @example
 * // Com intervalo de 20 minutos (padrão)
 * gerarHorariosDisponiveis(30, [{horario: '08:00', duracao: 40}])
 * // Retorna: ['08:40', '09:00', '09:20', ...] (08:00 e 08:20 bloqueados)
 */
export function gerarHorariosDisponiveis(
  duracaoServico: number,
  agendamentosOcupados: Array<{horario: string, duracao: number}> = [],
  config: ConfiguracaoHorario = HORARIO_FUNCIONAMENTO_PADRAO
): string[] {
  const todosHorarios = gerarTodosHorarios(duracaoServico, agendamentosOcupados, config);
  return todosHorarios.filter(h => h.disponivel).map(h => h.horario);
}

/**
 * Valida se uma data está dentro do período permitido
 * (hoje até 15 dias no futuro)
 * 
 * @param data - Data a ser validada no formato 'yyyy-MM-dd'
 * @returns true se a data é válida, false caso contrário
 */
export function validarDataPermitida(data: string): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() + 15);
  
  const dataSelecionada = parse(data, 'yyyy-MM-dd', new Date());
  dataSelecionada.setHours(0, 0, 0, 0);
  
  return (
    (isAfter(dataSelecionada, hoje) || isEqual(dataSelecionada, hoje)) &&
    (isBefore(dataSelecionada, dataLimite) || isEqual(dataSelecionada, dataLimite))
  );
}

/**
 * Gera array de datas disponíveis (hoje + 15 dias)
 * 
 * @returns Array de objetos com valor e label das datas
 */
export function gerarDatasDisponiveis(): Array<{ valor: string; label: string }> {
  const datas: Array<{ valor: string; label: string }> = [];
  const hoje = new Date();
  
  for (let i = 0; i <= 15; i++) {
    const data = new Date(hoje);
    data.setDate(data.getDate() + i);
    
    datas.push({
      valor: format(data, 'yyyy-MM-dd'),
      label: format(data, "EEEE, dd 'de' MMMM", { locale: require('date-fns/locale/pt-BR').ptBR }),
    });
  }
  
  return datas;
}

/**
 * Calcula o horário de término de um agendamento
 * 
 * @param horarioInicio - Horário de início no formato 'HH:mm'
 * @param duracaoMinutos - Duração em minutos
 * @returns Horário de término no formato 'HH:mm'
 */
export function calcularHorarioTermino(horarioInicio: string, duracaoMinutos: number): string {
  const dataBase = new Date(2000, 0, 1);
  const inicio = parse(horarioInicio, 'HH:mm', dataBase);
  const termino = addMinutes(inicio, duracaoMinutos);
  return format(termino, 'HH:mm');
}
