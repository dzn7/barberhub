/**
 * Serviço WhatsApp - Baileys v7
 * Conexão e envio de mensagens via WhatsApp Web
 * 
 * SOLUÇÃO DEFINITIVA PARA WHATSAPP BUSINESS v3.0 (Baileys v7):
 * 
 * Melhorias do v7:
 * - Suporte completo a LIDs (Local Identifiers)
 * - ACKs automáticos removidos (evita bans)
 * - Meta Coexistence suportado
 * - ESM nativo
 * 
 * O problema "Aguardando mensagem" ocorre quando:
 * 1. O destinatário não consegue descriptografar a mensagem
 * 2. Ele solicita a mensagem original via callback getMessage
 * 3. Se getMessage não retorna o proto.Message correto, falha
 * 
 * Esta solução implementa:
 * - Armazenamento PRÉ-ENVIO da mensagem
 * - Formato proto.Message.create() correto para getMessage
 * - Store em memória + Supabase com TTL
 * - Sincronização de sessão forçada antes de cada envio
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  generateMessageID,
  Browsers
} from 'baileys';
import { existsSync, rmSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import qrcode from 'qrcode-terminal';
import NodeCache from 'node-cache';
import logger from '../utils/logger.js';
import { supabase } from '../config/database.js';
import { formatarParaJid, validarTelefone } from '../utils/telefone.js';

let sock = null;
let qrCodeAtual = null;
let statusConexao = 'disconnected';
let conectando = false;
let callbackQR = null;

const AUTH_DIR = './auth_info';

// Garantir que o diretório de auth existe
if (!existsSync(AUTH_DIR)) {
  mkdirSync(AUTH_DIR, { recursive: true });
}

// Cache de retry - essencial para Baileys (TTL aumentado)
const msgRetryCounterCache = new NodeCache({ 
  stdTTL: 1800, // 30 minutos
  checkperiod: 120,
  useClones: false 
});

// Store em memória para mensagens (TTL de 2 horas)
const messageStoreMemoria = new NodeCache({
  stdTTL: 7200,
  checkperiod: 300,
  useClones: false
});


/**
 * Converte conteúdo de mensagem para formato proto.Message válido
 * CRÍTICO: O formato deve ser exatamente o que o WhatsApp espera
 */
function converterParaProtoMessage(conteudo) {
  if (!conteudo) return null;
  
  // Se já é um proto.Message válido
  if (conteudo.conversation || conteudo.extendedTextMessage) {
    return conteudo;
  }
  
  // Se é { text: "..." }, converter para conversation
  if (typeof conteudo === 'string') {
    return { conversation: conteudo };
  }
  
  if (conteudo.text) {
    return { conversation: conteudo.text };
  }
  
  // Tentar criar um proto.Message válido (v7 usa .create() ao invés de .fromObject())
  try {
    return proto.Message.create(conteudo);
  } catch (e) {
    logger.warn(`⚠️ Erro ao converter para proto.Message: ${e.message}`);
    return { conversation: JSON.stringify(conteudo) };
  }
}

/**
 * Armazena mensagem ANTES do envio - crítico para getMessage funcionar
 * Persistência dupla: memória (rápido) + Supabase (durável)
 */
async function armazenarMensagemPreEnvio(messageId, remoteJid, conteudo) {
  if (!messageId || !remoteJid) return;
  
  const protoMessage = converterParaProtoMessage(conteudo);
  
  // 1. Armazenar em memória (acesso instantâneo)
  const chave = `${messageId}:${remoteJid}`;
  messageStoreMemoria.set(chave, {
    message: protoMessage,
    timestamp: Date.now()
  });
  
  // Também armazenar só pelo ID (fallback)
  messageStoreMemoria.set(messageId, {
    message: protoMessage,
    timestamp: Date.now()
  });
  
  logger.info(`💾 Mensagem pré-armazenada: ${messageId}`);
  
  // 2. Persistir no Supabase (assíncrono, não bloqueia)
  supabase.from('mensagens_whatsapp').upsert({
    message_id: messageId,
    remote_jid: remoteJid,
    from_me: true,
    message_content: protoMessage,
    criado_em: new Date().toISOString()
  }, {
    onConflict: 'message_id,remote_jid'
  }).then(({ error }) => {
    if (error) {
      logger.warn(`⚠️ Erro ao persistir no Supabase: ${error.message}`);
    }
  });
}

/**
 * Recupera mensagem para callback getMessage do Baileys
 * ESSENCIAL para evitar "Aguardando mensagem" em WA Business
 * 
 * O WhatsApp chama este callback quando precisa reenviar uma mensagem
 * para descriptografia. DEVE retornar o proto.Message original.
 */
async function recuperarMensagem(key) {
  const messageId = key?.id;
  const remoteJid = key?.remoteJid;
  
  if (!messageId) {
    logger.warn('⚠️ getMessage chamado sem ID');
    return undefined;
  }
  
  logger.info(`🔍 getMessage solicitado: ${messageId}`);
  
  // 1. Tentar memória com chave composta
  const chaveComposta = `${messageId}:${remoteJid}`;
  let dadosMemoria = messageStoreMemoria.get(chaveComposta);
  
  // 2. Fallback: tentar só pelo ID
  if (!dadosMemoria?.message) {
    dadosMemoria = messageStoreMemoria.get(messageId);
  }
  
  if (dadosMemoria?.message) {
    logger.info(`✅ getMessage: encontrado em memória`);
    return dadosMemoria.message;
  }
  
  // 3. Buscar no Supabase (último recurso)
  try {
    const { data, error } = await supabase
      .from('mensagens_whatsapp')
      .select('message_content')
      .eq('message_id', messageId)
      .single();
    
    if (data?.message_content) {
      logger.info(`✅ getMessage: encontrado no Supabase`);
      const protoMsg = converterParaProtoMessage(data.message_content);
      
      // Cachear em memória
      messageStoreMemoria.set(messageId, { message: protoMsg, timestamp: Date.now() });
      
      return protoMsg;
    }
  } catch (err) {
    logger.warn(`⚠️ Erro ao buscar do Supabase: ${err.message}`);
  }
  
  logger.error(`❌ getMessage: NÃO encontrado - ${messageId}`);
  logger.error(`   Isso causará "Aguardando mensagem" no destinatário`);
  
  // Retornar undefined para o Baileys saber que não temos a mensagem
  return undefined;
}

/**
 * Registra callback para QR Code
 */
export function registrarCallbackQR(callback) {
  callbackQR = callback;
}

/**
 * Limpa credenciais de autenticação
 * No Fly.io o volume é montado em /app/auth_info
 */
function limparAuth() {
  try {
    // Limpar apenas os arquivos dentro do diretório, não o diretório em si
    // (pois é um volume montado no Fly.io)
    if (existsSync(AUTH_DIR)) {
      const arquivos = readdirSync(AUTH_DIR);
      for (const arquivo of arquivos) {
        const caminhoCompleto = path.join(AUTH_DIR, arquivo);
        try {
          rmSync(caminhoCompleto, { recursive: true, force: true });
        } catch (e) {
          logger.warn(`⚠️ Não foi possível remover ${arquivo}: ${e.message}`);
        }
      }
      logger.info('✅ Auth limpo com sucesso');
    }
  } catch (error) {
    logger.error(`❌ Erro ao limpar auth: ${error.message}`);
  }
}

/**
 * Inicia conexão com WhatsApp
 * Configuração otimizada para evitar "Aguardando mensagem" em WA Business
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
    
    // Configuração otimizada para WA Business
    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      
      // Cache de retry - ESSENCIAL para WA Business
      msgRetryCounterCache,
      
      // getMessage - CRÍTICO para evitar "Aguardando mensagem"
      getMessage: async (key) => {
        return await recuperarMensagem(key);
      },
      
      // Configurações de conexão
      markOnlineOnConnect: true,
      syncFullHistory: false,
      
      // Timeouts aumentados para melhor estabilidade
      connectTimeoutMs: 120000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      
      // Configurações de retry robustas
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 15,
      
      // Eventos próprios para capturar mensagens enviadas
      emitOwnEvents: true,
      fireInitQueries: true,
      
      // Desabilitar link preview para evitar erros
      generateHighQualityLinkPreview: false,
      
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

    // Handler de atualização de mensagens - detecta erros de entrega
    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        const { key, update: msgUpdate } = update;
        
        // Detectar erro de entrega (stale session)
        if (msgUpdate?.status === 'ERROR' || msgUpdate?.status === 4) {
          logger.warn(`⚠️ Erro de entrega detectado: ${key?.id}`);
          logger.warn(`   JID: ${key?.remoteJid}`);
          
          // Forçar recriação de sessão para este contato
          if (key?.remoteJid && sock) {
            try {
              logger.info(`🔄 Recriando sessão para: ${key.remoteJid}`);
              await sock.assertSessions([key.remoteJid], true);
            } catch (e) {
              logger.warn(`⚠️ Falha ao recriar sessão: ${e.message}`);
            }
          }
        }
        
        // Log de status para debug
        if (msgUpdate?.status && logger.level === 'debug') {
          const statusMap = { 1: 'PENDING', 2: 'SERVER_ACK', 3: 'DELIVERY_ACK', 4: 'READ', 5: 'PLAYED' };
          logger.debug(`📨 Status ${key?.id}: ${statusMap[msgUpdate.status] || msgUpdate.status}`);
        }
      }
    });

    // Handler para armazenar mensagens enviadas (backup)
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const msg of messages) {
        if (msg.key?.fromMe && msg.message) {
          // Armazenar em memória e Supabase
          const protoMsg = converterParaProtoMessage(msg.message);
          messageStoreMemoria.set(msg.key.id, { message: protoMsg, timestamp: Date.now() });
          
          // Persistir no Supabase (assíncrono)
          supabase.from('mensagens_whatsapp').upsert({
            message_id: msg.key.id,
            remote_jid: msg.key.remoteJid,
            from_me: true,
            message_content: protoMsg,
            criado_em: new Date().toISOString()
          }, { onConflict: 'message_id,remote_jid' }).catch(() => {});
          
          logger.debug(`📤 Mensagem registrada pós-envio: ${msg.key.id}`);
        }
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
 * Delay helper
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gera JID para um telefone brasileiro.
 * Regra: remove o "9" extra (celulares BR) quando aplicável.
 */
function gerarJid(telefone) {
  return formatarParaJid(telefone);
}

/**
 * Envia mensagem - SOLUÇÃO DEFINITIVA PARA WA BUSINESS
 * 
 * O segredo para evitar "Aguardando mensagem":
 * 1. Gerar ID da mensagem ANTES do envio
 * 2. Armazenar mensagem ANTES do envio (para getMessage funcionar)
 * 3. Sincronizar sessão de criptografia
 * 4. Enviar mensagem
 * 5. Retry com recriação completa de sessão em falhas
 */
export async function enviarMensagem(telefone, mensagem, tentativa = 1) {
  const MAX_TENTATIVAS = 5;
  
  try {
    if (!sock || statusConexao !== 'connected') {
      throw new Error('WhatsApp não conectado');
    }
    
    if (!telefone || !mensagem) throw new Error('Telefone e mensagem são obrigatórios');
    if (!validarTelefone(telefone)) throw new Error('Número inválido');

    logger.info(`📤 Enviando para ${telefone} (tentativa ${tentativa}/${MAX_TENTATIVAS})`);
    
    // 1. Gerar JID
    const jid = gerarJid(telefone);
    if (!jid) throw new Error('Número inválido para gerar JID');
    
    logger.info(`📱 JID: ${jid}`);
    
    // 2. Sincronizar sessão de criptografia
    // Em retries ou primeira tentativa, forçar recriação da sessão
    const forcarRecriacao = tentativa > 1;
    try {
      logger.info(`🔐 Sincronizando sessão (forçar=${forcarRecriacao})...`);
      await sock.assertSessions([jid], forcarRecriacao);
      await delay(300);
    } catch (sessionError) {
      logger.warn(`⚠️ Erro ao sincronizar sessão: ${sessionError.message}`);
      // Continuar mesmo com erro, o envio pode funcionar
    }
    
    // 3. Preparar conteúdo da mensagem no formato correto
    const conteudoMensagem = { text: mensagem };
    const protoMessage = converterParaProtoMessage(conteudoMensagem);
    
    // 4. Gerar ID único para a mensagem ANTES do envio
    // Isso permite armazenar a mensagem antes de enviar
    const messageId = generateMessageID();
    
    // 5. PRÉ-ARMAZENAR a mensagem (CRÍTICO para getMessage)
    await armazenarMensagemPreEnvio(messageId, jid, protoMessage);
    
    // 6. Simular presença (opcional, mas ajuda com rate limiting)
    try {
      await sock.sendPresenceUpdate('available', jid);
      await delay(150);
      await sock.sendPresenceUpdate('composing', jid);
      await delay(300);
    } catch (e) {
      // Ignorar erros de presença
    }
    
    // 7. Enviar mensagem com ID pré-gerado
    const resultado = await sock.sendMessage(jid, conteudoMensagem, {
      messageId: messageId
    });
    
    // 8. Parar digitação
    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch (e) {}
    
    // 9. Verificar se o envio foi bem-sucedido
    if (!resultado?.key?.id) {
      throw new Error('Envio falhou - sem confirmação de ID');
    }
    
    // 10. Atualizar store com o ID real (caso seja diferente)
    if (resultado.key.id !== messageId) {
      await armazenarMensagemPreEnvio(resultado.key.id, jid, protoMessage);
    }
    
    logger.info(`✅ Mensagem enviada: ${resultado.key.id}`);
    
    // Delay entre mensagens para evitar rate limiting
    await delay(500);
    
    return { 
      sucesso: true, 
      messageId: resultado.key.id,
      jid 
    };
    
  } catch (error) {
    logger.error(`❌ Erro no envio (${tentativa}/${MAX_TENTATIVAS}): ${error.message}`);
    
    // Detectar erros específicos que indicam problema de sessão
    const erroSessao = error.message?.includes('session') || 
                       error.message?.includes('decrypt') ||
                       error.message?.includes('prekey');
    
    if (erroSessao && sock) {
      logger.info(`🔧 Erro de sessão detectado, limpando sessão do contato...`);
      try {
        const jid = gerarJid(telefone);
        await sock.assertSessions([jid], true);
      } catch (e) {
        logger.warn(`⚠️ Falha ao limpar sessão: ${e.message}`);
      }
    }
    
    // Retry com backoff exponencial
    if (tentativa < MAX_TENTATIVAS) {
      const tempoEspera = Math.min(tentativa * 2000, 10000);
      logger.info(`🔄 Retry em ${tempoEspera/1000}s...`);
      await delay(tempoEspera);
      return enviarMensagem(telefone, mensagem, tentativa + 1);
    }
    
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

/**
 * Limpa sessão de um contato
 */
export async function limparSessaoContato(telefone) {
  try {
    if (!validarTelefone(telefone)) {
      return { sucesso: false, erro: 'Número inválido' };
    }
    const jid = gerarJid(telefone);
    logger.info(`🗑️ Limpando sessão: ${jid}`);
    await sock.assertSessions([jid], true);
    logger.info(`✅ Sessão limpa`);
    return { sucesso: true };
  } catch (error) {
    logger.error(`❌ Erro: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Estatísticas do store de mensagens
 */
export function obterEstatisticasStore() {
  return {
    mensagensMemoria: messageStoreMemoria.keys().length,
    retryCacheSize: msgRetryCounterCache.keys().length
  };
}

/**
 * Limpa mensagens antigas do Supabase (manutenção)
 * Remove mensagens com mais de 24 horas
 */
export async function limparMensagensAntigas() {
  try {
    const dataLimite = new Date();
    dataLimite.setHours(dataLimite.getHours() - 24);
    
    const { error, count } = await supabase
      .from('mensagens_whatsapp')
      .delete()
      .lt('criado_em', dataLimite.toISOString());
    
    if (error) {
      logger.warn(`⚠️ Erro ao limpar mensagens antigas: ${error.message}`);
    } else {
      logger.info(`🧹 Mensagens antigas removidas: ${count || 0}`);
    }
  } catch (err) {
    logger.error(`❌ Erro na limpeza: ${err.message}`);
  }
}

export default {
  iniciarWhatsApp,
  enviarMensagem,
  estaConectado,
  obterInfoBot,
  forcarNovoQRCode,
  registrarCallbackQR,
  limparSessaoContato,
  obterEstatisticasStore,
  limparMensagensAntigas
};
