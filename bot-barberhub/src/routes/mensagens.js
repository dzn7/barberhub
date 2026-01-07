/**
 * Rota de Mensagens
 * Endpoint para envio de mensagens via API
 */

import express from 'express';
import { enviarMensagem, estaConectado, limparSessaoContato, obterEstatisticasStore } from '../services/whatsapp.js';
import { enviarBoasVindasBarbeiro } from '../services/notificacoes.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/mensagens/enviar
 * Envia mensagem para um número
 */
router.post('/enviar', async (req, res) => {
  try {
    const { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Número e mensagem são obrigatórios'
      });
    }

    if (!estaConectado()) {
      return res.status(503).json({
        sucesso: false,
        erro: 'WhatsApp não está conectado'
      });
    }

    logger.info(`📤 Enviando mensagem para: ${numero}`);
    
    const resultado = await enviarMensagem(numero, mensagem);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Mensagem enviada com sucesso'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro || 'Erro ao enviar mensagem'
      });
    }
  } catch (error) {
    logger.error('Erro ao processar envio:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * POST /api/mensagens/boas-vindas-barbeiro
 * Envia mensagem de boas-vindas para novo barbeiro cadastrado
 */
router.post('/boas-vindas-barbeiro', async (req, res) => {
  try {
    const { barbeiro_id } = req.body;

    if (!barbeiro_id) {
      return res.status(400).json({
        sucesso: false,
        erro: 'ID do barbeiro é obrigatório'
      });
    }

    if (!estaConectado()) {
      return res.status(503).json({
        sucesso: false,
        erro: 'WhatsApp não está conectado'
      });
    }

    logger.info(`📤 Enviando boas-vindas para barbeiro: ${barbeiro_id}`);
    
    const resultado = await enviarBoasVindasBarbeiro(barbeiro_id);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Boas-vindas enviadas com sucesso'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro || 'Erro ao enviar boas-vindas'
      });
    }
  } catch (error) {
    logger.error('Erro ao processar boas-vindas barbeiro:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * POST /api/mensagens/limpar-sessao
 * Limpa a sessão de um contato específico para resolver problemas de criptografia
 * Útil quando um contato (especialmente WhatsApp Business) tem "Aguardando mensagem"
 */
router.post('/limpar-sessao', async (req, res) => {
  try {
    const { numero } = req.body;

    if (!numero) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Número é obrigatório'
      });
    }

    if (!estaConectado()) {
      return res.status(503).json({
        sucesso: false,
        erro: 'WhatsApp não está conectado'
      });
    }

    logger.info(`🗑️ Limpando sessão para: ${numero}`);
    
    const resultado = await limparSessaoContato(numero);

    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: 'Sessão limpa com sucesso. Próxima mensagem forçará nova sincronização.'
      });
    } else {
      res.status(500).json({
        sucesso: false,
        erro: resultado.erro || 'Erro ao limpar sessão'
      });
    }
  } catch (error) {
    logger.error('Erro ao limpar sessão:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

/**
 * GET /api/mensagens/estatisticas
 * Retorna estatísticas do store de mensagens e cache de retry
 */
router.get('/estatisticas', (req, res) => {
  try {
    const stats = obterEstatisticasStore();
    res.json({
      sucesso: true,
      dados: stats
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.message
    });
  }
});

export default router;
