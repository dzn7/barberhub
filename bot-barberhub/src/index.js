/**
 * Bot WhatsApp BarberHub
 * Sistema multi-tenant de notificações automáticas via WhatsApp
 * Otimizado para Fly.io free tier
 */

import express from 'express';
import dotenv from 'dotenv';
import { iniciarWhatsApp, registrarCallbackQR } from './services/whatsapp.js';
import { iniciarRealtimeListeners } from './services/realtime.js';
import { iniciarLembretes } from './services/lembretes.js';
import healthRoutes from './routes/health.js';
import mensagensRoutes from './routes/mensagens.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(express.json());

// Rotas
app.use('/health', healthRoutes);
app.use('/api/mensagens', mensagensRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    nome: 'BarberHub WhatsApp Bot',
    versao: '1.0.0',
    status: 'online',
    documentacao: '/health para status completo'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  logger.info('');
  logger.info('╔═══════════════════════════════════════════╗');
  logger.info('║     🤖 BOT BARBERHUB - WHATSAPP           ║');
  logger.info('╚═══════════════════════════════════════════╝');
  logger.info('');
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`📱 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info('');
  
  // Inicializar serviços de forma assíncrona
  (async () => {
    try {
      // 1. Iniciar WhatsApp
      logger.info('📲 Iniciando conexão WhatsApp...');
      iniciarWhatsApp().catch(error => {
        logger.error('❌ Erro ao inicializar WhatsApp:', error);
      });
      
      // 2. Iniciar Realtime (escuta todos os tenants)
      logger.info('📡 Iniciando Supabase Realtime...');
      iniciarRealtimeListeners();
      
      // 3. Iniciar sistema de lembretes
      logger.info('⏰ Iniciando sistema de lembretes...');
      iniciarLembretes();
      
      logger.info('');
      logger.info('✅ Sistema inicializado com sucesso!');
      logger.info('');
      logger.info('🎯 Funcionalidades ativas:');
      logger.info('   ✉️  Confirmação de agendamentos');
      logger.info('   📱 Notificação para barbeiros');
      logger.info('   ⏰ Lembretes 1h antes');
      logger.info('   ❌ Notificação de cancelamentos');
      logger.info('   🔄 Notificação de remarcações');
      logger.info('   🎉 Boas-vindas para novos tenants');
      logger.info('');
    } catch (error) {
      logger.error('❌ Erro ao inicializar sistema:', error);
    }
  })();
});

// Tratamento de erros
process.on('unhandledRejection', (error) => {
  logger.error('Erro não tratado:', error);
});

process.on('SIGINT', () => {
  logger.info('🛑 Encerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM recebido, encerrando...');
  process.exit(0);
});
