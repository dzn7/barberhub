/**
 * Serviço WhatsApp - Baileys v7.0.0-rc.9
 * Conexão e envio de mensagens via WhatsApp Web
 * 
 * ARQUITETURA v4.0 - Otimizada para produção:
 * 
 * 1. AUTH STATE NO SUPABASE
 *    - Substitui useMultiFileAuthState (não recomendado para produção)
 *    - Persiste credenciais e chaves de criptografia no banco
 *    - Suporta LIDs, device-list e tctoken do Baileys v7
 * 
 * 2. QR CODE NO TERMINAL
 *    - Exibe QR Code diretamente no terminal (usando qrcode package)
 *    - Também disponível via endpoint HTTP /health/qr
 * 
 * 3. RECONEXÃO ROBUSTA
 *    - Backoff exponencial com jitter
 *    - Detecção de logout vs desconexão temporária
 *    - Limite de tentativas para evitar loops infinitos
 * 
 * 4. PROTEÇÃO ANTI-SPAM
 *    - Rate limiting entre mensagens
 *    - Delays adaptativos baseados em erros
 *    - Não envia ACKs (evita bans - padrão do v7)
 * 
 * 5. getMessage ROBUSTO
 *    - Store em memória + Supabase
 *    - Pré-armazenamento antes do envio
 *    - Evita "Aguardando mensagem" em WA Business
 */

import makeWASocket, { 
  DisconnectReason, 
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  proto,
  generateMessageID,
  Browsers
} from 'baileys';
import { existsSync, rmSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import qrcode from 'qrcode-terminal';
import NodeCache from 'node-cache';
import logger from '../utils/logger.js';
import { supabase } from '../config/database.js';
import { formatarParaJid, validarTelefone } from '../utils/telefone.js';
import { useSupabaseAuthState, limparAuthSupabase, existeSessaoSalva } from './supabase-auth-state.js';

let sock = null;
let qrCodeAtual = null;
let statusConexao = 'disconnected';
let conectando = false;
let callbackQR = null;

// Controle de reconexão com backoff exponencial
let tentativasReconexao = 0;
const MAX_TENTATIVAS_RECONEXAO = 10;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 60000;

// Controle de rate limiting
let ultimoEnvio = 0;
const DELAY_MINIMO_ENTRE_MENSAGENS = 1500; // 1.5s entre mensagens

// Identificador da sessão (pode ser configurado via env)
const SESSION_ID = process.env.WHATSAPP_SESSION_ID || 'bot-principal';

// Diretório de auth local (fallback, preferir Supabase)
const AUTH_DIR = './auth_info';

// Garantir que o diretório de auth existe (fallback)
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
 * Calcula delay de reconexão com backoff exponencial e jitter
 */
function calcularDelayReconexao() {
  const exponencial = Math.min(BACKOFF_BASE_MS * Math.pow(2, tentativasReconexao), BACKOFF_MAX_MS);
  const jitter = Math.random() * 1000; // Adiciona até 1s de variação
  return exponencial + jitter;
}

/**
 * Limpa credenciais de autenticação (local + Supabase)
 */
async function limparAuth() {
  try {
    // 1. Limpar do Supabase
    await limparAuthSupabase(SESSION_ID);
    
    // 2. Limpar arquivos locais (fallback)
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
    }
    
    logger.info('✅ Auth limpo com sucesso (Supabase + local)');
  } catch (error) {
    logger.error(`❌ Erro ao limpar auth: ${error.message}`);
  }
}

/**
 * Inicia conexão com WhatsApp
 * Usa auth state do Supabase (recomendado para produção)
 */
export async function iniciarWhatsApp() {
  if (conectando) {
    logger.warn('⚠️ Conexão já em andamento');
    return;
  }
  
  conectando = true;
  
  try {
    logger.info('🚀 Iniciando WhatsApp...');
    logger.info(`📋 Sessão: ${SESSION_ID}`);
    
    // Usar auth state do Supabase (mais robusto que useMultiFileAuthState)
    const { state, saveCreds } = await useSupabaseAuthState(SESSION_ID);
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
        
        // Gerar QR Code e capturar a saída
        qrcode.generate(qr, { small: true }, (qrAscii) => {
          // Remover códigos de escape ANSI (cores) para compatibilidade com PM2
          const qrLimpo = qrAscii.replace(/\x1b\[[0-9;]*m/g, '');
          
          // Exibir no terminal
          console.log('\n');
          console.log('================================================================');
          console.log('        ESCANEIE O QR CODE ABAIXO NO WHATSAPP');
          console.log('================================================================');
          console.log('');
          console.log(qrLimpo);
          console.log('');
          console.log('Como conectar:');
          console.log('   1. Abra o WhatsApp no celular');
          console.log('   2. Menu > Aparelhos conectados');
          console.log('   3. Conectar um aparelho');
          console.log('   4. Aponte a camera para o QR Code acima');
          console.log('');
          console.log(`Ou acesse: http://localhost:${process.env.PORT || 3001}/health/qr`);
          console.log('================================================================\n');
          
          // Salvar em arquivo
          try {
            const qrDir = './logs';
            if (!existsSync(qrDir)) {
              mkdirSync(qrDir, { recursive: true });
            }
            const qrFilePath = path.join(qrDir, 'qrcode-atual.txt');
            writeFileSync(qrFilePath, `QR Code gerado em: ${new Date().toLocaleString('pt-BR')}\n\n${qrLimpo}\n\nString: ${qr}`, 'utf8');
          } catch (err) {
            logger.error(`Erro ao salvar QR code: ${err.message}`);
          }
        });
        
        if (callbackQR) callbackQR(qr);
      }

      if (connection === 'open') {
        conectando = false;
        statusConexao = 'connected';
        qrCodeAtual = null;
        tentativasReconexao = 0; // Reset contador de reconexão
        logger.info('✅ WhatsApp conectado!');
        logger.info(`📱 Número: ${sock.user?.id || 'desconhecido'}`);
        logger.info(`💾 Auth persistido no Supabase (sessão: ${SESSION_ID})`);
      }

      if (connection === 'close') {
        conectando = false;
        statusConexao = 'disconnected';
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'Desconhecido';
        
        logger.warn(`❌ Desconectado: ${reason} (código: ${statusCode})`);

        // Logout - limpar auth e reconectar
        if (statusCode === DisconnectReason.loggedOut) {
          logger.info('🔄 Logout detectado, limpando auth...');
          tentativasReconexao = 0;
          await limparAuth();
          setTimeout(() => iniciarWhatsApp(), 3000);
        } 
        // Restart necessário - reconectar imediatamente
        else if (statusCode === DisconnectReason.restartRequired) {
          logger.info('🔄 Restart necessário...');
          tentativasReconexao = 0;
          setTimeout(() => iniciarWhatsApp(), 1000);
        }
        // Conexão perdida - reconectar com backoff exponencial
        else if (statusCode === DisconnectReason.connectionLost || 
                 statusCode === DisconnectReason.connectionClosed ||
                 statusCode === DisconnectReason.timedOut) {
          tentativasReconexao++;
          
          if (tentativasReconexao > MAX_TENTATIVAS_RECONEXAO) {
            logger.error(`❌ Máximo de tentativas (${MAX_TENTATIVAS_RECONEXAO}) atingido. Parando reconexão.`);
            logger.error('   Execute /health/restart para tentar novamente.');
            return;
          }
          
          const delayMs = calcularDelayReconexao();
          logger.info(`🔄 Reconectando em ${Math.round(delayMs/1000)}s (tentativa ${tentativasReconexao}/${MAX_TENTATIVAS_RECONEXAO})...`);
          setTimeout(() => iniciarWhatsApp(), delayMs);
        }
        // Outros erros - reconectar com delay fixo
        else {
          tentativasReconexao++;
          const delayMs = Math.min(5000 * tentativasReconexao, 30000);
          logger.info(`🔄 Reconectando em ${Math.round(delayMs/1000)}s...`);
          setTimeout(() => iniciarWhatsApp(), delayMs);
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
          }, { onConflict: 'message_id,remote_jid' }).then(() => {}).catch(() => {});
          
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
 * Envia mensagem com proteção anti-spam e rate limiting
 * 
 * Estratégias implementadas:
 * 1. Rate limiting global (delay mínimo entre mensagens)
 * 2. Pré-armazenamento para getMessage (evita "Aguardando mensagem")
 * 3. Retry com backoff exponencial
 * 4. Detecção e recuperação de erros de sessão
 */
export async function enviarMensagem(telefone, mensagem, tentativa = 1) {
  const MAX_TENTATIVAS = 5;
  
  try {
    if (!sock || statusConexao !== 'connected') {
      throw new Error('WhatsApp não conectado');
    }
    
    if (!telefone || !mensagem) throw new Error('Telefone e mensagem são obrigatórios');
    if (!validarTelefone(telefone)) throw new Error('Número inválido');

    // Rate limiting global - garantir delay mínimo entre mensagens
    const agora = Date.now();
    const tempoDesdeUltimoEnvio = agora - ultimoEnvio;
    if (tempoDesdeUltimoEnvio < DELAY_MINIMO_ENTRE_MENSAGENS) {
      const esperarMs = DELAY_MINIMO_ENTRE_MENSAGENS - tempoDesdeUltimoEnvio;
      logger.info(`⏳ Rate limiting: aguardando ${esperarMs}ms...`);
      await delay(esperarMs);
    }

    logger.info(`📤 Enviando para ${telefone} (tentativa ${tentativa}/${MAX_TENTATIVAS})`);
    
    // 1. Gerar JID
    const jid = gerarJid(telefone);
    if (!jid) throw new Error('Número inválido para gerar JID');
    
    // 2. Sincronizar sessão de criptografia (apenas em retries)
    if (tentativa > 1) {
      try {
        logger.info(`🔐 Recriando sessão para retry...`);
        await sock.assertSessions([jid], true);
        await delay(500);
      } catch (sessionError) {
        logger.warn(`⚠️ Erro ao sincronizar sessão: ${sessionError.message}`);
      }
    }
    
    // 3. Preparar conteúdo da mensagem
    const conteudoMensagem = { text: mensagem };
    const protoMessage = converterParaProtoMessage(conteudoMensagem);
    
    // 4. Gerar ID único ANTES do envio
    const messageId = generateMessageID();
    
    // 5. PRÉ-ARMAZENAR a mensagem (CRÍTICO para getMessage)
    await armazenarMensagemPreEnvio(messageId, jid, protoMessage);
    
    // 6. Simular presença (reduzido para evitar spam)
    try {
      await sock.sendPresenceUpdate('composing', jid);
      await delay(200);
    } catch (e) {
      // Ignorar erros de presença
    }
    
    // 7. Enviar mensagem
    const resultado = await sock.sendMessage(jid, conteudoMensagem, {
      messageId: messageId
    });
    
    // 8. Parar digitação
    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch (e) {}
    
    // 9. Verificar sucesso
    if (!resultado?.key?.id) {
      throw new Error('Envio falhou - sem confirmação de ID');
    }
    
    // 10. Atualizar store com ID real
    if (resultado.key.id !== messageId) {
      await armazenarMensagemPreEnvio(resultado.key.id, jid, protoMessage);
    }
    
    // Atualizar timestamp do último envio
    ultimoEnvio = Date.now();
    
    logger.info(`✅ Mensagem enviada: ${resultado.key.id}`);
    
    return { 
      sucesso: true, 
      messageId: resultado.key.id,
      jid 
    };
    
  } catch (error) {
    logger.error(`❌ Erro no envio (${tentativa}/${MAX_TENTATIVAS}): ${error.message}`);
    
    // Detectar erros de sessão/criptografia
    const erroSessao = error.message?.includes('session') || 
                       error.message?.includes('decrypt') ||
                       error.message?.includes('prekey') ||
                       error.message?.includes('signal');
    
    // Detectar erros de rate limiting/spam
    const erroRateLimit = error.message?.includes('rate') ||
                          error.message?.includes('spam') ||
                          error.message?.includes('blocked') ||
                          error.message?.includes('ban');
    
    if (erroRateLimit) {
      logger.warn(`⚠️ Possível rate limiting detectado. Aumentando delay...`);
      // Aumentar delay significativamente
      await delay(10000 + (tentativa * 5000));
    } else if (erroSessao && sock) {
      logger.info(`🔧 Erro de sessão detectado, recriando...`);
      try {
        const jid = gerarJid(telefone);
        await sock.assertSessions([jid], true);
      } catch (e) {
        logger.warn(`⚠️ Falha ao recriar sessão: ${e.message}`);
      }
    }
    
    // Retry com backoff exponencial
    if (tentativa < MAX_TENTATIVAS) {
      const tempoEspera = Math.min(tentativa * 3000, 15000);
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
  
  tentativasReconexao = 0; // Reset contador
  await limparAuth();
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
 * Desconecta o WhatsApp (logout)
 */
export async function desconectarWhatsApp() {
  try {
    logger.info('🔌 Desconectando WhatsApp...');
    
    if (sock) {
      await sock.logout();
      sock = null;
    }
    
    statusConexao = 'disconnected';
    qrCodeAtual = null;
    
    logger.info('✅ WhatsApp desconectado');
    return { sucesso: true };
  } catch (error) {
    logger.error(`❌ Erro ao desconectar: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Reinicia a conexão do WhatsApp
 */
export async function reiniciarWhatsApp() {
  try {
    logger.info('🔄 Reiniciando WhatsApp...');
    
    if (sock) {
      try {
        sock.end(undefined);
      } catch (e) {
        // Ignorar erro
      }
      sock = null;
    }
    
    statusConexao = 'disconnected';
    qrCodeAtual = null;
    conectando = false;
    
    // Aguardar um pouco antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await iniciarWhatsApp();
    
    logger.info('✅ WhatsApp reiniciado');
    return { sucesso: true };
  } catch (error) {
    logger.error(`❌ Erro ao reiniciar: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
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
  limparMensagensAntigas,
  desconectarWhatsApp,
  reiniciarWhatsApp
};
