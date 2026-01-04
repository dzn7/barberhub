/**
 * Serviço WhatsApp - Baileys
 * Conexão e envio de mensagens via WhatsApp Web
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { existsSync, rmSync } from 'fs';
import qrcode from 'qrcode-terminal';
import logger from '../utils/logger.js';
import { formatarParaJid } from '../utils/telefone.js';

let sock = null;
let qrCodeAtual = null;
let statusConexao = 'disconnected';
let conectando = false;
let callbackQR = null;

const AUTH_DIR = './auth_info';

/**
 * Registra callback para QR Code
 */
export function registrarCallbackQR(callback) {
  callbackQR = callback;
}

/**
 * Limpa credenciais de autenticação
 */
function limparAuth() {
  try {
    if (existsSync(AUTH_DIR)) {
      rmSync(AUTH_DIR, { recursive: true, force: true });
      logger.info('✅ Auth limpo com sucesso');
    }
  } catch (error) {
    logger.error('❌ Erro ao limpar auth:', error.message);
  }
}

/**
 * Inicia conexão com WhatsApp
 */
export async function iniciarWhatsApp() {
  if (conectando) {
    logger.warn('⚠️ Conexão já em andamento');
    return;
  }
  
  conectando = true;
  
  try {
    logger.info('🚀 Iniciando WhatsApp...');
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    logger.info(`📱 Baileys v${version.join('.')}`);
    
    // Configuração otimizada para baixo consumo de memória
    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false,
      browser: ['BarberHub', 'Chrome', '120.0.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: false,
      fireInitQueries: true,
      logger: logger.child({ module: 'baileys', level: 'silent' })
    });

    // Salvar credenciais
    sock.ev.on('creds.update', saveCreds);

    // Gerenciar conexão
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodeAtual = qr;
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('📱 ESCANEIE O QR CODE ABAIXO:');
        console.log('═══════════════════════════════════════════');
        qrcode.generate(qr, { small: true });
        console.log('═══════════════════════════════════════════');
        console.log('');
        logger.info('📱 QR Code gerado - escaneie para conectar');
        if (callbackQR) callbackQR(qr);
      }

      if (connection === 'open') {
        conectando = false;
        statusConexao = 'connected';
        qrCodeAtual = null;
        logger.info('✅ WhatsApp conectado!');
        logger.info(`📱 Número: ${sock.user?.id || 'desconhecido'}`);
      }

      if (connection === 'close') {
        conectando = false;
        statusConexao = 'disconnected';
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Desconhecido';
        
        logger.warn(`❌ Desconectado: ${reason} (código: ${statusCode})`);

        if (statusCode === DisconnectReason.loggedOut) {
          logger.info('🔄 Logout detectado, limpando auth...');
          limparAuth();
          setTimeout(() => iniciarWhatsApp(), 3000);
        } else if (statusCode === DisconnectReason.restartRequired) {
          logger.info('🔄 Restart necessário...');
          setTimeout(() => iniciarWhatsApp(), 1000);
        } else {
          logger.info('🔄 Reconectando em 5s...');
          setTimeout(() => iniciarWhatsApp(), 5000);
        }
      }

      if (connection === 'connecting') {
        statusConexao = 'connecting';
        logger.info('🔌 Conectando...');
      }
    });

    return sock;
  } catch (error) {
    conectando = false;
    logger.error('❌ Erro fatal:', error.message);
    setTimeout(() => iniciarWhatsApp(), 5000);
  }
}

/**
 * Envia mensagem de texto
 * @param {string} telefone - Número do destinatário
 * @param {string} mensagem - Texto da mensagem
 * @returns {Promise<{sucesso: boolean, erro?: string}>}
 */
export async function enviarMensagem(telefone, mensagem) {
  try {
    if (!sock || statusConexao !== 'connected') {
      throw new Error('WhatsApp não conectado');
    }

    const jid = formatarParaJid(telefone);
    if (!jid) {
      throw new Error('Telefone inválido');
    }

    logger.info(`📤 Enviando para: ${jid}`);
    
    await sock.sendMessage(jid, { text: mensagem });
    
    logger.info('✅ Mensagem enviada');
    return { sucesso: true };
  } catch (error) {
    logger.error('❌ Erro ao enviar:', error.message);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Verifica se está conectado
 */
export function estaConectado() {
  return sock && statusConexao === 'connected';
}

/**
 * Retorna informações do bot
 */
export function obterInfoBot() {
  return {
    conectado: estaConectado(),
    status: statusConexao,
    numero: sock?.user?.id || null,
    qrCode: qrCodeAtual
  };
}

/**
 * Força geração de novo QR Code
 */
export async function forcarNovoQRCode() {
  logger.info('🔄 Forçando novo QR...');
  
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      // Ignorar erro
    }
    sock = null;
  }
  
  limparAuth();
  setTimeout(() => iniciarWhatsApp(), 1000);
}

export default {
  iniciarWhatsApp,
  enviarMensagem,
  estaConectado,
  obterInfoBot,
  forcarNovoQRCode,
  registrarCallbackQR
};
