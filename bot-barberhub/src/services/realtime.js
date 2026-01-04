/**
 * Serviço Realtime - Supabase
 * Escuta mudanças no banco em tempo real e dispara notificações
 * Multi-tenant: escuta todos os agendamentos de todos os tenants
 */

import { supabase } from '../config/database.js';
import { 
  enviarConfirmacaoAgendamento, 
  enviarNotificacaoCancelamento,
  enviarNotificacaoRemarcacao,
  enviarBoasVindasTenant
} from './notificacoes.js';
import logger from '../utils/logger.js';

let canalAgendamentos = null;
let canalTenants = null;

/**
 * Inicializa listeners em tempo real para agendamentos
 */
export function iniciarRealtimeAgendamentos() {
  logger.info('🔄 Iniciando Realtime para agendamentos...');

  canalAgendamentos = supabase
    .channel('agendamentos-global')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'agendamentos'
      },
      async (payload) => {
        logger.info('🆕 Novo agendamento detectado:', payload.new.id);
        
        // Envio imediato - sem delay
        try {
          await enviarConfirmacaoAgendamento(payload.new.id);
          logger.info('✅ Notificações enviadas com sucesso!');
        } catch (error) {
          logger.error('❌ Erro ao processar novo agendamento:', error);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'agendamentos'
      },
      async (payload) => {
        const statusAnterior = payload.old.status;
        const statusNovo = payload.new.status;
        const dataHoraAnterior = payload.old.data_hora;
        const dataHoraNova = payload.new.data_hora;

        logger.info('📝 Agendamento atualizado:', {
          id: payload.new.id,
          statusAnterior,
          statusNovo
        });

        // Envio imediato

        try {
          // Cancelamento
          if (statusAnterior !== 'cancelado' && statusNovo === 'cancelado') {
            logger.info('❌ Cancelamento detectado');
            await enviarNotificacaoCancelamento(payload.new.id);
          }

          // Remarcação (data/hora mudou e não foi cancelado)
          if (dataHoraAnterior !== dataHoraNova && statusNovo !== 'cancelado') {
            logger.info('🔄 Remarcação detectada');
            await enviarNotificacaoRemarcacao(payload.new.id, dataHoraAnterior);
          }
        } catch (error) {
          logger.error('❌ Erro ao processar atualização:', error);
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('✅ Realtime agendamentos conectado');
        logger.info('📡 Escutando: INSERT, UPDATE em agendamentos');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('❌ Erro no canal Realtime:', err);
      } else if (status === 'TIMED_OUT') {
        logger.warn('⏱️ Timeout no Realtime, reconectando...');
      }
    });
}

/**
 * Inicializa listener para novos tenants (boas-vindas)
 */
export function iniciarRealtimeTenants() {
  logger.info('🔄 Iniciando Realtime para tenants...');

  canalTenants = supabase
    .channel('tenants-global')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tenants'
      },
      async (payload) => {
        const whatsappAnterior = payload.old.whatsapp;
        const whatsappNovo = payload.new.whatsapp;

        // Se adicionou WhatsApp pela primeira vez, enviar boas-vindas
        if (!whatsappAnterior && whatsappNovo) {
          logger.info('📱 Novo WhatsApp cadastrado para tenant:', payload.new.id);
          
          await new Promise(resolve => setTimeout(resolve, 1000));

          try {
            await enviarBoasVindasTenant(payload.new.id);
          } catch (error) {
            logger.error('❌ Erro ao enviar boas-vindas:', error);
          }
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.info('✅ Realtime tenants conectado');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('❌ Erro no canal tenants:', err);
      }
    });
}

/**
 * Inicializa todos os listeners Realtime
 */
export function iniciarRealtimeListeners() {
  iniciarRealtimeAgendamentos();
  iniciarRealtimeTenants();
  
  logger.info('');
  logger.info('╔═══════════════════════════════════════════╗');
  logger.info('║  🎧 REALTIME MULTI-TENANT ATIVO           ║');
  logger.info('╚═══════════════════════════════════════════╝');
  logger.info('');
}

/**
 * Desconecta do Realtime
 */
export async function desconectarRealtime() {
  if (canalAgendamentos) {
    await supabase.removeChannel(canalAgendamentos);
  }
  if (canalTenants) {
    await supabase.removeChannel(canalTenants);
  }
  logger.info('🔌 Desconectado do Realtime');
}

export default {
  iniciarRealtimeListeners,
  desconectarRealtime
};
