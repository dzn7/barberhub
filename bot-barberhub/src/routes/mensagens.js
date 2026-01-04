/**
 * Rota de Mensagens
 * Endpoint para envio de mensagens via API
 */

import express from 'express';
import { enviarMensagem, estaConectado } from '../services/whatsapp.js';
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

export default router;
