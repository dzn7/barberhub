/**
 * Rota de Health Check
 * Endpoint para verificar status do bot
 */

import express from 'express';
import { obterInfoBot } from '../services/whatsapp.js';

const router = express.Router();

/**
 * GET /health
 * Retorna status do bot
 */
router.get('/', (req, res) => {
  const info = obterInfoBot();
  
  res.json({
    status: info.conectado ? 'online' : 'offline',
    servico: 'BarberHub WhatsApp Bot',
    whatsapp: {
      conectado: info.conectado,
      status: info.status,
      numero: info.numero
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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

export default router;
