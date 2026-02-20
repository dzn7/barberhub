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
 * Retorna QR Code se disponível (HTML ou JSON)
 */
router.get('/qr', (req, res) => {
  const info = obterInfoBot();
  const acceptHtml = req.headers.accept?.includes('text/html') || req.query.format === 'html';
  
  if (info.conectado) {
    if (acceptHtml) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WhatsApp - Conectado</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            .success-icon {
              font-size: 5rem;
              margin-bottom: 1rem;
            }
            h1 {
              color: #25D366;
              margin: 0 0 1rem 0;
            }
            .numero {
              font-size: 1.2rem;
              color: #666;
              font-family: 'Courier New', monospace;
              background: #f5f5f5;
              padding: 0.5rem 1rem;
              border-radius: 8px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <h1>WhatsApp Conectado!</h1>
            <p>O bot já está conectado e funcionando.</p>
            <div class="numero">${info.numero || 'Número não disponível'}</div>
          </div>
        </body>
        </html>
      `);
    }
    return res.json({
      status: 'connected',
      mensagem: 'WhatsApp já está conectado',
      numero: info.numero
    });
  }
  
  if (info.qrCode) {
    if (acceptHtml) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WhatsApp QR Code</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 500px;
            }
            h1 {
              color: #333;
              margin: 0 0 1rem 0;
              font-size: 1.8rem;
            }
            .qr-container {
              background: white;
              padding: 2rem;
              border-radius: 15px;
              margin: 2rem 0;
              display: inline-block;
              box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            #qrcode {
              display: inline-block;
            }
            .instructions {
              text-align: left;
              background: #f8f9fa;
              padding: 1.5rem;
              border-radius: 10px;
              margin-top: 2rem;
            }
            .instructions h3 {
              margin: 0 0 1rem 0;
              color: #25D366;
              font-size: 1.2rem;
            }
            .instructions ol {
              margin: 0;
              padding-left: 1.5rem;
            }
            .instructions li {
              margin: 0.5rem 0;
              color: #555;
            }
            .refresh-btn {
              margin-top: 1.5rem;
              padding: 0.8rem 2rem;
              background: #25D366;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 1rem;
              cursor: pointer;
              transition: background 0.3s;
            }
            .refresh-btn:hover {
              background: #128C7E;
            }
            .loading {
              color: #666;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 Conectar WhatsApp</h1>
            <p class="loading">Gerando QR Code...</p>
            <div class="qr-container">
              <div id="qrcode"></div>
            </div>
            <div class="instructions">
              <h3>Como conectar:</h3>
              <ol>
                <li>Abra o <strong>WhatsApp</strong> no seu celular</li>
                <li>Toque em <strong>Menu (⋮)</strong> ou <strong>Configurações</strong></li>
                <li>Selecione <strong>Aparelhos conectados</strong></li>
                <li>Toque em <strong>Conectar um aparelho</strong></li>
                <li>Aponte a câmera para o QR Code acima</li>
              </ol>
            </div>
            <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar QR Code</button>
          </div>
          <script>
            const qrData = ${JSON.stringify(info.qrCode)};
            try {
              new QRCode(document.getElementById('qrcode'), {
                text: qrData,
                width: 300,
                height: 300,
                colorDark: '#000000',
                colorLight: '#FFFFFF',
                correctLevel: QRCode.CorrectLevel.L
              });
              document.querySelector('.loading').style.display = 'none';
            } catch (error) {
              document.querySelector('.loading').textContent = 'Erro ao gerar QR Code: ' + error.message;
              console.error(error);
            }
            
            // Auto-refresh a cada 30 segundos
            setTimeout(() => location.reload(), 30000);
          </script>
        </body>
        </html>
      `);
    }
    return res.json({
      status: 'awaiting_scan',
      qrCode: info.qrCode
    });
  }
  
  if (acceptHtml) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp - Aguardando</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h1 {
            color: #333;
            margin: 0 0 1rem 0;
          }
          .refresh-btn {
            margin-top: 1.5rem;
            padding: 0.8rem 2rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⏳ Aguardando QR Code</h1>
          <div class="spinner"></div>
          <p>O bot está inicializando. O QR Code será gerado em instantes.</p>
          <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
        </div>
        <script>
          // Auto-refresh a cada 3 segundos
          setTimeout(() => location.reload(), 3000);
        </script>
      </body>
      </html>
    `);
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
