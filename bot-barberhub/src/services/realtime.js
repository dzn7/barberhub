/**
 * Serviço Realtime - Supabase
 * Escuta mudanças no banco em tempo real e dispara notificações
 * Multi-tenant: escuta todos os agendamentos de todos os tenants
 * 
 * FALLBACK: Usa polling quando Realtime não funciona
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
let reconectandoAgendamentos = false;
let reconectandoTenants = false;

// Polling fallback
let pollingInterval = null;
let ultimoAgendamentoId = null;
let ultimoAgendamentoTimestamp = null;
let agendamentosProcessados = new Set();

// Cache de tenants para detectar novos WhatsApp
const tenantsWhatsappCache = new Map();

/**
 * Inicializa listeners em tempo real para agendamentos
 */
export async function iniciarRealtimeAgendamentos() {
  if (reconectandoAgendamentos) return;
  
  logger.info('🔄 Iniciando Realtime para agendamentos...');

  // Remover canal anterior se existir
  if (canalAgendamentos) {
    try {
      await supabase.removeChannel(canalAgendamentos);
    } catch (e) {
      // Ignorar erro ao remover canal
    }
    canalAgendamentos = null;
  }

  canalAgendamentos = supabase
    .channel('db-agendamentos')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agendamentos'
      },
      async (payload) => {
        logger.info(`📨 Evento ${payload.eventType} em agendamentos:`, payload.new?.id || payload.old?.id);
        
        try {
          if (payload.eventType === 'INSERT') {
            logger.info('🆕 Novo agendamento detectado:', payload.new.id);
            await enviarConfirmacaoAgendamento(payload.new.id);
            logger.info('✅ Notificações enviadas com sucesso!');
          } else if (payload.eventType === 'UPDATE') {
            const statusAnterior = payload.old?.status;
            const statusNovo = payload.new.status;
            const dataHoraAnterior = payload.old?.data_hora;
            const dataHoraNova = payload.new.data_hora;

            logger.info('📝 Agendamento atualizado:', {
              id: payload.new.id,
              statusAnterior,
              statusNovo
            });

            // Cancelamento
            if (statusAnterior !== 'cancelado' && statusNovo === 'cancelado') {
              logger.info('❌ Cancelamento detectado');
              await enviarNotificacaoCancelamento(payload.new.id);
            }

            // Remarcação (data/hora mudou e não foi cancelado)
            if (dataHoraAnterior && dataHoraAnterior !== dataHoraNova && statusNovo !== 'cancelado') {
              logger.info('🔄 Remarcação detectada');
              await enviarNotificacaoRemarcacao(payload.new.id, dataHoraAnterior);
            }
          }
        } catch (error) {
          logger.error('❌ Erro ao processar evento:', error);
        }
      }
    )
    .subscribe((status, err) => {
      logger.info(`📡 Status Realtime agendamentos: ${status}`);
      if (status === 'SUBSCRIBED') {
        logger.info('✅ Realtime agendamentos conectado!');
        reconectandoAgendamentos = false;
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('❌ Erro no canal Realtime:', err?.message || err);
        reconectandoAgendamentos = false;
        setTimeout(() => iniciarRealtimeAgendamentos(), 10000);
      } else if (status === 'TIMED_OUT') {
        logger.warn('⏱️ Timeout no Realtime agendamentos, reconectando em 10s...');
        reconectandoAgendamentos = true;
        setTimeout(() => {
          reconectandoAgendamentos = false;
          iniciarRealtimeAgendamentos();
        }, 10000);
      } else if (status === 'CLOSED') {
        if (!reconectandoAgendamentos) {
          logger.warn('🔌 Canal agendamentos fechado, reconectando em 10s...');
          reconectandoAgendamentos = true;
          setTimeout(() => {
            reconectandoAgendamentos = false;
            iniciarRealtimeAgendamentos();
          }, 10000);
        }
      }
    });
}

/**
 * Inicializa listener para novos tenants (boas-vindas)
 */
export async function iniciarRealtimeTenants() {
  if (reconectandoTenants) return;
  
  logger.info('🔄 Iniciando Realtime para tenants...');

  // Remover canal anterior se existir
  if (canalTenants) {
    try {
      await supabase.removeChannel(canalTenants);
    } catch (e) {
      // Ignorar erro ao remover canal
    }
    canalTenants = null;
  }

  canalTenants = supabase
    .channel('db-tenants')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tenants'
      },
      async (payload) => {
        const whatsappAnterior = payload.old?.whatsapp;
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
      logger.info(`📡 Status Realtime tenants: ${status}`);
      if (status === 'SUBSCRIBED') {
        logger.info('✅ Realtime tenants conectado!');
        reconectandoTenants = false;
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('❌ Erro no canal tenants:', err?.message || err);
        reconectandoTenants = false;
        setTimeout(() => iniciarRealtimeTenants(), 10000);
      } else if (status === 'TIMED_OUT') {
        logger.warn('⏱️ Timeout no Realtime tenants, reconectando em 10s...');
        reconectandoTenants = true;
        setTimeout(() => {
          reconectandoTenants = false;
          iniciarRealtimeTenants();
        }, 10000);
      } else if (status === 'CLOSED') {
        if (!reconectandoTenants) {
          logger.warn('🔌 Canal tenants fechado, reconectando em 10s...');
          reconectandoTenants = true;
          setTimeout(() => {
            reconectandoTenants = false;
            iniciarRealtimeTenants();
          }, 10000);
        }
      }
    });
}

/**
 * Inicializa todos os listeners Realtime
 */
export function iniciarRealtimeListeners() {
  // Usar polling ao invés de Realtime (mais confiável)
  iniciarPolling();
  
  logger.info('');
  logger.info('╔═══════════════════════════════════════════╗');
  logger.info('║  🎧 POLLING MULTI-TENANT ATIVO            ║');
  logger.info('╚═══════════════════════════════════════════╝');
  logger.info('');
}

/**
 * POLLING FALLBACK - Verifica novos agendamentos a cada 5 segundos
 */
async function iniciarPolling() {
  logger.info('🔄 Iniciando sistema de polling...');
  
  // Buscar último agendamento para referência inicial
  const { data: ultimo } = await supabase
    .from('agendamentos')
    .select('id, criado_em')
    .order('criado_em', { ascending: false })
    .limit(1)
    .single();
  
  if (ultimo) {
    ultimoAgendamentoTimestamp = ultimo.criado_em;
    agendamentosProcessados.add(ultimo.id);
    logger.info(`📌 Referência inicial: ${ultimo.id} (${ultimo.criado_em})`);
  } else {
    ultimoAgendamentoTimestamp = new Date().toISOString();
  }
  
  // Carregar cache inicial de tenants
  await carregarCacheTenantsWhatsapp();
  
  // Polling a cada 5 segundos
  pollingInterval = setInterval(async () => {
    await verificarNovosAgendamentos();
    await verificarAgendamentosAtualizados();
    await verificarNovosTenants();
  }, 5000);
  
  logger.info('✅ Polling ativo - verificando a cada 5 segundos');
}

/**
 * Carrega cache inicial de tenants com WhatsApp
 */
async function carregarCacheTenantsWhatsapp() {
  try {
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, whatsapp');
    
    for (const tenant of tenants || []) {
      tenantsWhatsappCache.set(tenant.id, tenant.whatsapp || null);
    }
    logger.info(`📌 Cache de tenants carregado: ${tenantsWhatsappCache.size} tenants`);
  } catch (err) {
    logger.error('❌ Erro ao carregar cache de tenants:', err.message);
  }
}

/**
 * Verifica novos tenants com WhatsApp (para boas-vindas)
 */
async function verificarNovosTenants() {
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, whatsapp, nome')
      .not('whatsapp', 'is', null);
    
    if (error) return;
    
    for (const tenant of tenants || []) {
      const whatsappAnterior = tenantsWhatsappCache.get(tenant.id);
      
      // Se não tinha WhatsApp antes e agora tem = novo cadastro ou atualização
      if (!whatsappAnterior && tenant.whatsapp) {
        logger.info(`📱 Novo WhatsApp detectado para tenant: ${tenant.nome} (${tenant.id})`);
        
        try {
          await enviarBoasVindasTenant(tenant.id);
          logger.info('✅ Boas-vindas enviadas!');
        } catch (err) {
          logger.error('❌ Erro ao enviar boas-vindas:', err.message);
        }
      }
      
      // Atualizar cache
      tenantsWhatsappCache.set(tenant.id, tenant.whatsapp);
    }
  } catch (err) {
    logger.error('❌ Erro no polling de tenants:', err.message);
  }
}

/**
 * Verifica novos agendamentos (INSERT)
 */
async function verificarNovosAgendamentos() {
  try {
    const { data: novos, error } = await supabase
      .from('agendamentos')
      .select('id, criado_em, status')
      .gt('criado_em', ultimoAgendamentoTimestamp)
      .order('criado_em', { ascending: true });
    
    if (error) {
      logger.error('❌ Erro ao buscar novos agendamentos:', error.message);
      return;
    }
    
    for (const agendamento of novos || []) {
      if (!agendamentosProcessados.has(agendamento.id)) {
        logger.info(`🆕 Novo agendamento detectado: ${agendamento.id}`);
        agendamentosProcessados.add(agendamento.id);
        ultimoAgendamentoTimestamp = agendamento.criado_em;
        
        try {
          await enviarConfirmacaoAgendamento(agendamento.id);
          logger.info('✅ Notificação enviada com sucesso!');
        } catch (err) {
          logger.error('❌ Erro ao enviar notificação:', err.message);
        }
      }
    }
    
    // Limpar set de processados (manter últimos 1000)
    if (agendamentosProcessados.size > 1000) {
      const arr = Array.from(agendamentosProcessados);
      agendamentosProcessados = new Set(arr.slice(-500));
    }
  } catch (err) {
    logger.error('❌ Erro no polling de novos:', err.message);
  }
}

// Cache de status para detectar mudanças
const statusCache = new Map();

/**
 * Verifica agendamentos atualizados (UPDATE - cancelamentos)
 */
async function verificarAgendamentosAtualizados() {
  try {
    // Buscar agendamentos recentes (últimas 24h) que podem ter sido atualizados
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('id, status, atualizado_em')
      .gte('data_hora', ontem.toISOString())
      .order('atualizado_em', { ascending: false })
      .limit(50);
    
    if (error) return;
    
    for (const ag of agendamentos || []) {
      const cacheKey = `${ag.id}`;
      const statusAnterior = statusCache.get(cacheKey);
      
      if (statusAnterior && statusAnterior !== ag.status) {
        // Status mudou!
        if (ag.status === 'cancelado' && statusAnterior !== 'cancelado') {
          logger.info(`❌ Cancelamento detectado: ${ag.id}`);
          try {
            await enviarNotificacaoCancelamento(ag.id);
            logger.info('✅ Notificação de cancelamento enviada!');
          } catch (err) {
            logger.error('❌ Erro ao enviar cancelamento:', err.message);
          }
        }
      }
      
      statusCache.set(cacheKey, ag.status);
    }
    
    // Limpar cache antigo
    if (statusCache.size > 500) {
      const entries = Array.from(statusCache.entries());
      statusCache.clear();
      entries.slice(-250).forEach(([k, v]) => statusCache.set(k, v));
    }
  } catch (err) {
    logger.error('❌ Erro no polling de updates:', err.message);
  }
}

/**
 * Desconecta do Realtime/Polling
 */
export async function desconectarRealtime() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  if (canalAgendamentos) {
    await supabase.removeChannel(canalAgendamentos);
  }
  if (canalTenants) {
    await supabase.removeChannel(canalTenants);
  }
  logger.info('🔌 Desconectado');
}

export default {
  iniciarRealtimeListeners,
  desconectarRealtime
};
