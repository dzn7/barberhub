import { supabase } from './supabase';

export const HORARIOS_PADRAO = {
  horaInicio: 8,
  horaFim: 20,
  intervalo: 20,
  diasFuncionamento: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'] as string[],
  intervaloAlmocoInicio: null as string | null,
  intervaloAlmocoFim: null as string | null,
};

export interface ConfiguracaoHorarios {
  horaInicio: number;
  horaFim: number;
  intervalo: number;
  diasFuncionamento: string[];
  intervaloAlmocoInicio: string | null;
  intervaloAlmocoFim: string | null;
}

export const DIAS_SEMANA_ABREV: Record<number, string> = {
  0: 'dom',
  1: 'seg',
  2: 'ter',
  3: 'qua',
  4: 'qui',
  5: 'sex',
  6: 'sab',
};

function normalizarHora(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const v = valor.toString();
  return v.length >= 5 ? v.slice(0, 5) : v;
}

export async function buscarConfiguracaoHorarios(tenantId: string): Promise<ConfiguracaoHorarios> {
  try {
    const { data, error } = await supabase
      .from('configuracoes_barbearia')
      .select('horario_abertura, horario_fechamento, intervalo_horarios, dias_funcionamento, intervalo_almoco_inicio, intervalo_almoco_fim')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return HORARIOS_PADRAO;
    }

    const horarioAbertura = normalizarHora(data.horario_abertura as any) || '08:00';
    const horarioFechamento = normalizarHora(data.horario_fechamento as any) || '20:00';

    const horaInicio = parseInt(horarioAbertura.split(':')[0], 10);
    const horaFim = parseInt(horarioFechamento.split(':')[0], 10);

    const dias = (data.dias_funcionamento as any) || HORARIOS_PADRAO.diasFuncionamento;

    return {
      horaInicio: Number.isFinite(horaInicio) ? horaInicio : HORARIOS_PADRAO.horaInicio,
      horaFim: Number.isFinite(horaFim) ? horaFim : HORARIOS_PADRAO.horaFim,
      intervalo: (data.intervalo_horarios as any) || HORARIOS_PADRAO.intervalo,
      diasFuncionamento: Array.isArray(dias) ? dias : HORARIOS_PADRAO.diasFuncionamento,
      intervaloAlmocoInicio: normalizarHora(data.intervalo_almoco_inicio as any),
      intervaloAlmocoFim: normalizarHora(data.intervalo_almoco_fim as any),
    };
  } catch {
    return HORARIOS_PADRAO;
  }
}
