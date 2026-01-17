/**
 * Rota de Health Check e Gerenciamento do Bot
 * Endpoints para verificar status, QR code e gerenciar o bot
 */

import express from 'express';
import { 
  obterInfoBot, 
  obterEstatisticasStore,
  desconectarWhatsApp,
  reiniciarWhatsApp,
  forcarNovoQRCode
} from '../services/whatsapp.js';
import { supabase } from '../config/database.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /health
 * Retorna status completo do bot
 */
router.get('/', (req, res) => {
  const info = obterInfoBot();
  const stats = obterEstatisticasStore();
  
  res.json({
    status: info.conectado ? 'online' : 'offline',
    servico: 'BarberHub WhatsApp Bot',
    whatsapp: {
      conectado: info.conectado,
      status: info.status,
      numero: info.numero
    },
    estatisticas: stats,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoria: {
      usada_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  });
});

/**
 * GET /health/qr
 * Retorna QR Code se disponível
 */
router.get('/qr', (req, res) => {
  const info = obterInfoBot();
  
  if (info.conectado) {
    return res.json({
      status: 'connected',
      mensagem: 'WhatsApp já está conectado',
      numero: info.numero
    });
  }
  
  if (info.qrCode) {
    return res.json({
      status: 'awaiting_scan',
      qrCode: info.qrCode
    });
  }
  
  res.json({
    status: info.status,
    mensagem: 'Aguardando QR Code...'
  });
});

/**
 * POST /health/restart
 * Reinicia a conexão do WhatsApp
 */
router.post('/restart', async (req, res) => {
  try {
    logger.info('🔄 Reiniciando bot via API...');
    const resultado = await reiniciarWhatsApp();
    
    res.json({
      sucesso: resultado.sucesso,
      mensagem: resultado.sucesso ? 'Bot reiniciado com sucesso' : resultado.erro
    });
  } catch (error) {
    logger.error('Erro ao reiniciar bot:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * POST /health/disconnect
 * Desconecta o WhatsApp (logout)
 */
router.post('/disconnect', async (req, res) => {
  try {
    logger.info('🔌 Desconectando bot via API...');
    const resultado = await desconectarWhatsApp();
    
    res.json({
      sucesso: resultado.sucesso,
      mensagem: resultado.sucesso ? 'Bot desconectado com sucesso' : resultado.erro
    });
  } catch (error) {
    logger.error('Erro ao desconectar bot:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * POST /health/new-qr
 * Força geração de novo QR Code
 */
router.post('/new-qr', async (req, res) => {
  try {
    logger.info('📱 Forçando novo QR Code via API...');
    await forcarNovoQRCode();
    
    res.json({
      sucesso: true,
      mensagem: 'Novo QR Code será gerado em instantes'
    });
  } catch (error) {
    logger.error('Erro ao gerar novo QR:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * GET /health/mensagens-recentes
 * Retorna as últimas notificações enviadas
 */
router.get('/mensagens-recentes', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 20;
    
    const { data: mensagens, error } = await supabase
      .from('notificacoes_enviadas')
      .select(`
        id,
        tipo,
        status,
        data_envio,
        mensagem,
        erro,
        tenants (nome, slug)
      `)
      .order('data_envio', { ascending: false })
      .limit(limite);
    
    if (error) {
      throw new Error(error.message);
    }
    
    res.json({
      sucesso: true,
      total: mensagens?.length || 0,
      mensagens: mensagens || []
    });
  } catch (error) {
    logger.error('Erro ao buscar mensagens:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * GET /health/estatisticas
 * Retorna estatísticas do bot
 */
router.get('/estatisticas', async (req, res) => {
  try {
    const stats = obterEstatisticasStore();
    
    // Buscar estatísticas do banco
    const [enviadas, pendentes, erros] = await Promise.all([
      supabase.from('notificacoes_enviadas').select('id', { count: 'exact', head: true }).eq('status', 'enviada'),
      supabase.from('notificacoes_enviadas').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('notificacoes_enviadas').select('id', { count: 'exact', head: true }).eq('status', 'erro')
    ]);
    
    res.json({
      sucesso: true,
      store: stats,
      notificacoes: {
        enviadas: enviadas.count || 0,
        pendentes: pendentes.count || 0,
        erros: erros.count || 0
      },
      sistema: {
        uptime_segundos: Math.floor(process.uptime()),
        memoria_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    });
  } catch (error) {
    logger.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

export default router;
