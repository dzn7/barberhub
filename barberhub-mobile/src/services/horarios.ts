import { addMinutes, format, parse, isAfter, isBefore, isEqual } from 'date-fns';

export const HORARIO_FUNCIONAMENTO_PADRAO = {
  inicio: '09:00',
  fim: '19:00',
  intervaloMinimo: 5,
  intervaloAlmocoInicio: null as string | null,
  intervaloAlmocoFim: null as string | null,
};

export interface ConfiguracaoHorario {
  inicio: string;
  fim: string;
  intervaloAlmocoInicio?: string | null;
  intervaloAlmocoFim?: string | null;
  intervaloHorarios?: number;
}

export interface HorarioComStatus {
  horario: string;
  disponivel: boolean;
}

function normalizarHorario(horario: string | null | undefined): string | null {
  if (!horario) return null;
  const limpo = horario.trim();
  if (limpo.length >= 5 && limpo.includes(':')) {
    return limpo.substring(0, 5);
  }
  return limpo;
}

export function gerarTodosHorarios(
  duracaoServico: number,
  agendamentosOcupados: Array<{ horario: string; duracao: number }> = [],
  config: ConfiguracaoHorario = HORARIO_FUNCIONAMENTO_PADRAO,
  dataSelecionada?: string
): HorarioComStatus[] {
  const horarios: HorarioComStatus[] = [];
  const dataBase = new Date(2000, 0, 1);

  const agora = new Date();
  const hoje = format(agora, 'yyyy-MM-dd');
  const ehHoje = dataSelecionada === hoje;
  const horaAtualMinutos = ehHoje ? agora.getHours() * 60 + agora.getMinutes() : 0;

  const inicioNormalizado = normalizarHorario(config.inicio) || '09:00';
  const fimNormalizado = normalizarHorario(config.fim) || '19:00';

  const horaInicio = parse(inicioNormalizado, 'HH:mm', dataBase);
  const horaFim = parse(fimNormalizado, 'HH:mm', dataBase);

  let horarioAtual = horaInicio;

  let almocoInicio: Date | null = null;
  let almocoFim: Date | null = null;

  const almocoInicioNormalizado = normalizarHorario(config.intervaloAlmocoInicio);
  const almocoFimNormalizado = normalizarHorario(config.intervaloAlmocoFim);

  if (almocoInicioNormalizado && almocoFimNormalizado) {
    almocoInicio = parse(almocoInicioNormalizado, 'HH:mm', dataBase);
    almocoFim = parse(almocoFimNormalizado, 'HH:mm', dataBase);
  }

  const intervalo = config.intervaloHorarios || 20;

  while (isBefore(horarioAtual, horaFim)) {
    const horarioFormatado = format(horarioAtual, 'HH:mm');
    const horarioTermino = addMinutes(horarioAtual, duracaoServico);

    if (isBefore(horarioTermino, horaFim) || isEqual(horarioTermino, horaFim)) {
      let estaNoAlmoco = false;
      if (almocoInicio && almocoFim) {
        const inicioNoAlmoco = (isAfter(horarioAtual, almocoInicio) || isEqual(horarioAtual, almocoInicio)) &&
          isBefore(horarioAtual, almocoFim);

        const terminoNoAlmoco = isAfter(horarioTermino, almocoInicio) &&
          (isBefore(horarioTermino, almocoFim) || isEqual(horarioTermino, almocoFim));

        const atravessaAlmoco = isBefore(horarioAtual, almocoInicio) && isAfter(horarioTermino, almocoFim);

        estaNoAlmoco = inicioNoAlmoco || terminoNoAlmoco || atravessaAlmoco;
      }

      const temConflito = agendamentosOcupados.some((agendamento) => {
        const inicioOcupado = parse(agendamento.horario, 'HH:mm', dataBase);
        const fimOcupado = addMinutes(inicioOcupado, agendamento.duracao);

        return (
          ((isAfter(horarioAtual, inicioOcupado) || isEqual(horarioAtual, inicioOcupado)) && isBefore(horarioAtual, fimOcupado)) ||
          (isAfter(horarioTermino, inicioOcupado) && (isBefore(horarioTermino, fimOcupado) || isEqual(horarioTermino, fimOcupado))) ||
          (isBefore(horarioAtual, inicioOcupado) && isAfter(horarioTermino, fimOcupado))
        );
      });

      const [hora, minuto] = horarioFormatado.split(':').map(Number);
      const horarioEmMinutos = hora * 60 + minuto;
      const jaPassou = ehHoje && horarioEmMinutos <= horaAtualMinutos;

      horarios.push({
        horario: horarioFormatado,
        disponivel: !temConflito && !estaNoAlmoco && !jaPassou,
      });
    }

    horarioAtual = addMinutes(horarioAtual, intervalo);
  }

  return horarios;
}
