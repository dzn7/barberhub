/**
 * Serviço de Lembretes Automáticos
 * Verifica agendamentos próximos e envia lembretes 1h antes
 */

import { supabase } from '../config/database.js';
import { enviarLembreteAgendamento } from './notificacoes.js';
import logger from '../utils/logger.js';

let intervaloLembretes = null;

/**
 * Lembretes podem ser enviados a qualquer momento (24h)
 * Removido limite de horário para permitir envio contínuo
 */
function dentroDoHorarioPermitido() {
  return true;
}

/**
 * Busca agendamentos que precisam de lembrete (próxima 1h)
 */
async function buscarAgendamentosParaLembrete() {
  const agora = new Date();
  const emUmaHora = new Date(agora.getTime() + 60 * 60 * 1000);
  const emDuasHoras = new Date(agora.getTime() + 120 * 60 * 1000);

  // Buscar agendamentos entre 1h e 2h a partir de agora
  // que ainda não receberam lembrete
  const { data: agendamentos, error } = await supabase
    .from('agendamentos')
    .select(`
      id,
      data_hora,
      status,
      tenant_id
    `)
    .gte('data_hora', emUmaHora.toISOString())
    .lt('data_hora', emDuasHoras.toISOString())
    .in('status', ['pendente', 'confirmado'])
    .order('data_hora', { ascending: true });

  if (error) {
    logger.error('Erro ao buscar agendamentos para lembrete:', error);
    return [];
  }

  // Filtrar os que já receberam lembrete
  const agendamentosParaLembrete = [];

  for (const agendamento of agendamentos || []) {
    const { data: lembreteExistente } = await supabase
      .from('notificacoes_enviadas')
      .select('id')
      .eq('agendamento_id', agendamento.id)
      .eq('tipo', 'lembrete')
      .eq('status', 'enviada')
      .maybeSingle();

    if (!lembreteExistente) {
      agendamentosParaLembrete.push(agendamento);
    }
  }

  return agendamentosParaLembrete;
}

/**
 * Processa lembretes pendentes
 */
async function processarLembretes() {
  if (!dentroDoHorarioPermitido()) {
    logger.debug('⏰ Fora do horário de lembretes');
    return;
  }

  try {
    const agendamentos = await buscarAgendamentosParaLembrete();

    if (agendamentos.length === 0) {
      logger.debug('📭 Nenhum lembrete pendente');
      return;
    }

    logger.info(`📬 ${agendamentos.length} lembrete(s) para enviar`);

    for (const agendamento of agendamentos) {
      try {
        await enviarLembreteAgendamento(agendamento.id);
        // Aguardar 2s entre envios para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`Erro ao enviar lembrete ${agendamento.id}:`, error);
      }
    }
  } catch (error) {
    logger.error('Erro ao processar lembretes:', error);
  }
}

/**
 * Inicia sistema de lembretes automáticos
 * Verifica a cada 15 minutos
 */
export function iniciarLembretes() {
  logger.info('⏰ Iniciando sistema de lembretes...');
  
  // Verificar imediatamente
  processarLembretes();
  
  // Verificar a cada 15 minutos (900000ms)
  intervaloLembretes = setInterval(processarLembretes, 15 * 60 * 1000);
  
  logger.info('✅ Lembretes configurados (verificação a cada 15min)');
}

/**
 * Para sistema de lembretes
 */
export function pararLembretes() {
  if (intervaloLembretes) {
    clearInterval(intervaloLembretes);
    intervaloLembretes = null;
    logger.info('🛑 Sistema de lembretes parado');
  }
}

export default {
  iniciarLembretes,
  pararLembretes
};
