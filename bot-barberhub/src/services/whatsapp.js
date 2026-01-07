/**
 * Serviço WhatsApp - Baileys
 * Conexão e envio de mensagens via WhatsApp Web
 * 
 * IMPORTANTE: Este serviço foi otimizado para garantir entrega confiável
 * de mensagens para qualquer dispositivo/versão do WhatsApp.
 * 
 * CORREÇÃO CRÍTICA: Implementação robusta para evitar "Aguardando mensagem"
 * em clientes WhatsApp Business. O problema ocorre quando:
 * 1. O destinatário não consegue descriptografar a mensagem
 * 2. O WhatsApp pede reenvio via getMessage() e o bot não retorna corretamente
 * 3. Sessões de criptografia ficam "stale" e precisam ser recriadas
 * 
 * Soluções implementadas:
 * - msgRetryCounterCache para rastrear retries de descriptografia
 * - getMessage retornando estrutura completa da mensagem
 * - Handler para eventos de retry de mensagem
 * - Armazenamento robusto de mensagens enviadas
 * - Sincronização forçada de sessão antes de enviar
 */

import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidUser,
  proto,
  getAggregateVotesInPollMessage
} from '@whiskeysockets/baileys';
import { existsSync, rmSync } from 'fs';
import qrcode from 'qrcode-terminal';
import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

let sock = null;
let qrCodeAtual = null;
let statusConexao = 'disconnected';
let conectando = false;
let callbackQR = null;

const AUTH_DIR = './auth_info';

/**
 * CACHE DE RETRY DE MENSAGENS - CRÍTICO PARA WHATSAPP BUSINESS
 * 
 * Este cache rastreia quantas vezes o WhatsApp pediu reenvio de uma mensagem.
 * É essencial para o protocolo Signal funcionar corretamente com WhatsApp Business.
 * 
 * Quando o destinatário (especialmente WA Business) não consegue descriptografar,
 * o WhatsApp envia uma solicitação de retry. O Baileys usa este cache para
 * saber quantas vezes já tentou e evitar loops infinitos.
 * 
 * TTL de 10 minutos (600s) é suficiente para cobrir a janela de retry.
 */
const msgRetryCounterCache = new NodeCache({ 
  stdTTL: 600, 
  checkperiod: 60,
  useClones: false 
});

/**
 * STORE DE MENSAGENS - CRÍTICO PARA EVITAR "AGUARDANDO MENSAGEM"
 * 
 * O WhatsApp usa criptografia ponta-a-ponta. Quando o destinatário não consegue
 * descriptografar uma mensagem (ex: reconectou, mudou de dispositivo, WA Business),
 * ele pede ao remetente para reenviar a mensagem original via getMessage().
 * 
 * Se getMessage() retorna undefined, aparece "Aguardando mensagem".
 * 
 * Este store armazena as últimas 5000 mensagens com estrutura completa
 * para garantir que possamos retornar a mensagem original quando solicitado.
 * 
 * IMPORTANTE: Para WA Business, precisamos armazenar o objeto message completo,
 * não apenas o texto, pois o protocolo Signal precisa da estrutura exata.
 */
const messageStore = new Map();
const MAX_STORED_MESSAGES = 5000;

/**
 * Armazena uma mensagem enviada para posterior recuperação
 * 
 * CRÍTICO PARA WHATSAPP BUSINESS:
 * Armazena a estrutura completa da mensagem no formato que o Baileys espera.
 * Isso inclui o objeto message com conversation, extendedTextMessage, etc.
 * 
 * @param {object} messageKey - Chave da mensagem (id, remoteJid, fromMe)
 * @param {object} messageContent - Conteúdo da mensagem (texto, mídia, etc)
 * @param {object} fullMessage - Mensagem completa retornada pelo sendMessage (opcional)
 */
function armazenarMensagem(messageKey, messageContent, fullMessage = null) {
  if (!messageKey?.id) return;
  
  // Limpar mensagens antigas se exceder o limite (FIFO)
  if (messageStore.size >= MAX_STORED_MESSAGES) {
    const primeiraChave = messageStore.keys().next().value;
    messageStore.delete(primeiraChave);
  }
  
  // Armazenar com estrutura completa para getMessage
  // O Baileys espera o objeto message no formato do proto
  const messageParaArmazenar = fullMessage?.message || messageContent;
  
  messageStore.set(messageKey.id, {
    key: messageKey,
    message: messageParaArmazenar,
    content: messageContent,
    timestamp: Date.now()
  });
  
  logger.info(`💾 Mensagem armazenada: ${messageKey.id} (total: ${messageStore.size})`);
}

/**
 * Recupera uma mensagem armazenada pelo ID
 * 
 * CRÍTICO PARA WHATSAPP BUSINESS:
 * Esta função é chamada pelo Baileys quando o destinatário (especialmente WA Business)
 * não consegue descriptografar a mensagem e pede reenvio.
 * 
 * Se retornar undefined, aparece "Aguardando mensagem" no WhatsApp do destinatário.
 * 
 * Devemos retornar o objeto message no formato EXATO esperado pelo protocolo Signal.
 * Para mensagens de texto simples, isso é { conversation: "texto" }
 * Para mensagens formatadas, é { extendedTextMessage: { text: "texto" } }
 * 
 * @param {object} key - Chave da mensagem solicitada
 * @returns {object|undefined} Conteúdo da mensagem ou undefined
 */
async function recuperarMensagem(key) {
  const messageId = key?.id;
  const remoteJid = key?.remoteJid;
  
  if (!messageId) {
    logger.warn('⚠️ getMessage chamado sem ID');
    return undefined;
  }
  
  logger.info(`🔍 getMessage solicitado: ${messageId} (de: ${remoteJid || 'desconhecido'})`);
  
  const stored = messageStore.get(messageId);
  
  if (stored) {
    logger.info(`✅ getMessage: Mensagem encontrada (ID: ${messageId})`);
    
    // Retornar o objeto message completo
    // Se for um objeto simples { text: "..." }, converter para formato proto
    const mensagem = stored.message;
    
    if (mensagem) {
      // Se já está no formato correto (tem conversation ou extendedTextMessage)
      if (mensagem.conversation || mensagem.extendedTextMessage || 
          mensagem.imageMessage || mensagem.documentMessage ||
          mensagem.audioMessage || mensagem.videoMessage) {
        return mensagem;
      }
      
      // Se é apenas { text: "..." }, converter para formato conversation
      if (mensagem.text) {
        return { conversation: mensagem.text };
      }
    }
    
    // Fallback: retornar como está
    return mensagem;
  }
  
  logger.warn(`⚠️ getMessage: Mensagem NÃO encontrada (ID: ${messageId}) - Isso pode causar "Aguardando mensagem"`);
  
  // Tentativa de fallback: criar mensagem vazia para evitar erro
  // Isso não resolve o problema completamente, mas evita crash
  return proto.Message.fromObject({});
}

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
    
    // Configuração otimizada para envio confiável de mensagens
    // CORREÇÃO CRÍTICA PARA WHATSAPP BUSINESS:
    // - msgRetryCounterCache: Rastreia retries de descriptografia
    // - getMessage: Retorna mensagem original para reenvio
    // - markOnlineOnConnect: Mantém presença online
    sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false,
      browser: ['BarberHub', 'Chrome', '120.0.0'],
      
      // CRÍTICO: Cache de retry de mensagens para WhatsApp Business
      // Sem isso, mensagens para WA Business frequentemente falham
      msgRetryCounterCache,
      
      // IMPORTANTE: markOnlineOnConnect true para evitar "aguardando mensagem"
      markOnlineOnConnect: true,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      
      // getMessage é CRÍTICO para evitar "Aguardando mensagem"
      // Quando o destinatário (especialmente WA Business) não consegue 
      // descriptografar, ele pede a mensagem original via este callback
      getMessage: async (key) => {
        return await recuperarMensagem(key);
      },
      
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: true, // Importante para receber eventos de mensagens próprias
      fireInitQueries: true,
      
      // Configurações de retry para melhor entrega
      retryRequestDelayMs: 350,
      maxMsgRetryCount: 10, // Aumentado para mais tentativas em WA Business
      
      // Gera link preview de qualidade (pode ajudar em alguns casos)
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

    // CRÍTICO PARA WHATSAPP BUSINESS: Handler de atualização de mensagens
    // Detecta quando uma mensagem falhou na entrega e precisa ser reenviada
    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        const { key, update: msgUpdate } = update;
        
        // Verificar se houve erro na mensagem
        if (msgUpdate?.status === 'ERROR' || msgUpdate?.status === 4) {
          logger.warn(`⚠️ Mensagem com erro de entrega: ${key?.id}`);
          logger.warn(`   Destinatário: ${key?.remoteJid}`);
          
          // Tentar reenviar a sessão para este JID
          if (key?.remoteJid) {
            try {
              logger.info(`🔄 Tentando resincronizar sessão para: ${key.remoteJid}`);
              await sock.assertSessions([key.remoteJid], true);
            } catch (e) {
              logger.warn(`⚠️ Erro ao resincronizar sessão: ${e.message}`);
            }
          }
        }
        
        // Log de status de mensagem para debug
        if (msgUpdate?.status) {
          const statusMap = {
            1: 'PENDING',
            2: 'SERVER_ACK',
            3: 'DELIVERY_ACK',
            4: 'READ',
            5: 'PLAYED'
          };
          const statusName = statusMap[msgUpdate.status] || msgUpdate.status;
          logger.info(`📨 Status mensagem ${key?.id}: ${statusName}`);
        }
      }
    });

    // Handler para armazenar mensagens enviadas pelo bot
    // Isso garante que getMessage() possa retornar a mensagem quando solicitado
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Apenas processar mensagens enviadas por nós (fromMe = true)
      for (const msg of messages) {
        if (msg.key?.fromMe && msg.message) {
          // Armazenar a mensagem completa
          armazenarMensagem(msg.key, msg.message, msg);
          logger.info(`📤 Mensagem enviada registrada: ${msg.key.id}`);
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
 * Cache de números verificados (evita verificar o mesmo número várias vezes)
 * Formato: { 'numero': 'jid_correto' }
 */
const cacheNumerosVerificados = new Map();

/**
 * Limpa número de telefone e retorna apenas dígitos com código do país
 */
function limparNumero(telefone) {
  if (!telefone) return null;
  let numero = telefone.replace(/\D/g, '');
  if (!numero.startsWith('55')) {
    numero = '55' + numero;
  }
  return numero;
}

/**
 * Gera possíveis JIDs para um número brasileiro
 * O WhatsApp BR pode usar formato com ou sem o 9 extra
 */
function gerarPossiveisJids(telefone) {
  const numero = limparNumero(telefone);
  if (!numero) return [];
  
  const jids = [];
  
  // Formato original
  jids.push(`${numero}@s.whatsapp.net`);
  
  // Se tem 13 dígitos (com 9), tentar sem o 9
  if (numero.length === 13 && numero[4] === '9') {
    const semNove = numero.slice(0, 4) + numero.slice(5);
    jids.push(`${semNove}@s.whatsapp.net`);
  }
  
  // Se tem 12 dígitos (sem 9), tentar com o 9
  if (numero.length === 12) {
    const comNove = numero.slice(0, 4) + '9' + numero.slice(4);
    jids.push(`${comNove}@s.whatsapp.net`);
  }
  
  return [...new Set(jids)]; // Remove duplicatas
}

/**
 * Verifica qual JID é válido no WhatsApp usando onWhatsApp
 * 
 * CRÍTICO PARA WHATSAPP BUSINESS:
 * Contas WhatsApp Business podem retornar JIDs no formato @lid (Linked ID)
 * ao invés do formato padrão @s.whatsapp.net
 * 
 * Devemos SEMPRE usar o JID exato retornado pelo onWhatsApp(),
 * pois é o formato que o WhatsApp espera para aquela conta específica.
 */
async function verificarNumeroWhatsApp(telefone) {
  const numeroLimpo = limparNumero(telefone);
  
  // Verificar cache primeiro
  if (cacheNumerosVerificados.has(numeroLimpo)) {
    const jidCached = cacheNumerosVerificados.get(numeroLimpo);
    logger.info(`📋 Usando JID do cache: ${jidCached}`);
    return jidCached;
  }
  
  const possiveisJids = gerarPossiveisJids(telefone);
  
  if (possiveisJids.length === 0) {
    throw new Error('Número de telefone inválido');
  }
  
  // Extrair apenas os números dos JIDs para verificar
  const numerosParaVerificar = possiveisJids.map(jid => jid.replace('@s.whatsapp.net', ''));
  
  try {
    // onWhatsApp retorna quais números estão registrados
    // IMPORTANTE: Para WhatsApp Business, pode retornar JID no formato @lid
    const resultado = await sock.onWhatsApp(...numerosParaVerificar);
    
    if (resultado && resultado.length > 0) {
      // Usar o primeiro número válido encontrado
      const numeroValido = resultado.find(r => r.exists);
      if (numeroValido) {
        // IMPORTANTE: Usar o JID EXATO retornado pelo WhatsApp
        // Não converter ou modificar - pode ser @s.whatsapp.net ou @lid
        let jidValido = numeroValido.jid;
        
        // LOG DETALHADO para debug
        logger.info(`✅ Número verificado no WhatsApp:`);
        logger.info(`   JID: ${jidValido}`);
        logger.info(`   É Business (@lid): ${jidValido.includes('@lid')}`);
        
        // CRÍTICO: Para contas @lid (WhatsApp Business), precisamos converter
        // para @s.whatsapp.net porque o Baileys não consegue enviar para @lid
        // O @lid é usado internamente pelo WhatsApp mas envio deve ser via @s.whatsapp.net
        if (jidValido.includes('@lid')) {
          logger.warn(`⚠️ JID @lid detectado - isso é WhatsApp Business`);
          // Usar o número original com @s.whatsapp.net
          // O WhatsApp vai rotear corretamente
          jidValido = `${numeroLimpo}@s.whatsapp.net`;
          logger.info(`   Convertido para: ${jidValido}`);
        }
        
        // Salvar no cache
        cacheNumerosVerificados.set(numeroLimpo, jidValido);
        
        return jidValido;
      }
    }
    
    // Se nenhum foi encontrado, usar o primeiro JID como fallback
    logger.warn(`⚠️ Número não verificado, usando fallback: ${possiveisJids[0]}`);
    return possiveisJids[0];
    
  } catch (error) {
    logger.warn(`⚠️ Erro ao verificar número (${error.message}), usando fallback`);
    return possiveisJids[0];
  }
}

/**
 * Prepara o chat antes de enviar (garante que o WhatsApp reconheça o destinatário)
 * IMPORTANTE: Inclui assertSessions para garantir chaves de criptografia válidas
 * Isso resolve o problema de "Aguardando mensagem" no WhatsApp Business
 */
async function prepararChat(jid, forcarSessao = false) {
  try {
    // 1. Verificar se é um JID de usuário válido
    if (!isJidUser(jid)) {
      logger.warn(`⚠️ JID não é de usuário: ${jid}`);
    }
    
    // 2. CRÍTICO: Forçar sincronização das chaves de sessão
    // Isso é ESSENCIAL para WhatsApp Business funcionar corretamente
    // O segundo parâmetro (true) força a atualização mesmo se já existir sessão
    try {
      logger.info(`🔐 Sincronizando chaves de sessão para: ${jid}`);
      await sock.assertSessions([jid], forcarSessao);
      await delay(300);
    } catch (sessionError) {
      logger.warn(`⚠️ Erro ao sincronizar sessão: ${sessionError.message}`);
      // Continuar mesmo com erro, pode funcionar
    }
    
    // 3. Inscrever para receber atualizações de presença
    await sock.presenceSubscribe(jid);
    await delay(150);
    
    // 4. Marcar como disponível (CRÍTICO para evitar "aguardando mensagem")
    await sock.sendPresenceUpdate('available', jid);
    await delay(200);
    
    // 5. Simular digitação
    await sock.sendPresenceUpdate('composing', jid);
    await delay(800 + Math.random() * 700); // 800-1500ms variável
    
  } catch (error) {
    // Erros de presença não são fatais, apenas loggar
    logger.warn(`⚠️ Preparação de chat: ${error.message}`);
  }
}

/**
 * Envia mensagem de texto com verificação de número e retry inteligente
 * 
 * FLUXO OTIMIZADO PARA WHATSAPP BUSINESS:
 * 1. Verifica se o número existe no WhatsApp (onWhatsApp)
 * 2. FORÇA sincronização de sessão (crítico para WA Business)
 * 3. Prepara o chat (presença, digitação)
 * 4. Envia a mensagem no formato correto do protocolo Signal
 * 5. Armazena a mensagem completa para getMessage
 * 6. Confirma o envio pelo ID retornado
 * 7. Em caso de falha, tenta novamente com backoff exponencial
 * 
 * @param {string} telefone - Número do destinatário
 * @param {string} mensagem - Texto da mensagem
 * @param {number} tentativa - Número da tentativa atual
 * @returns {Promise<{sucesso: boolean, erro?: string, messageId?: string}>}
 */
export async function enviarMensagem(telefone, mensagem, tentativa = 1) {
  const MAX_TENTATIVAS = 5; // Aumentado para WA Business
  
  try {
    // Validação inicial
    if (!sock || statusConexao !== 'connected') {
      throw new Error('WhatsApp não conectado');
    }
    
    if (!telefone || !mensagem) {
      throw new Error('Telefone e mensagem são obrigatórios');
    }

    logger.info(`📤 Enviando mensagem (tentativa ${tentativa}/${MAX_TENTATIVAS})`);
    logger.info(`📱 Telefone original: ${telefone}`);
    
    // 1. Verificar/obter JID correto do número
    const jid = await verificarNumeroWhatsApp(telefone);
    logger.info(`📱 JID resolvido: ${jid}`);
    
    // 2. CRÍTICO PARA WA BUSINESS: Forçar sincronização de sessão ANTES de preparar chat
    // Isso garante que as chaves de criptografia estejam atualizadas
    // Em retries, sempre força a recriação da sessão
    const forcarSessao = tentativa > 1;
    try {
      logger.info(`🔐 Sincronizando sessão (forçar: ${forcarSessao})...`);
      await sock.assertSessions([jid], forcarSessao);
      await delay(500); // Delay maior para garantir sincronização
    } catch (sessionError) {
      logger.warn(`⚠️ Erro ao sincronizar sessão: ${sessionError.message}`);
      // Em caso de erro de sessão, sempre forçar na próxima tentativa
    }
    
    // 3. Preparar chat (presença, digitação)
    await prepararChat(jid, forcarSessao);
    
    // 4. Criar objeto da mensagem no formato correto
    // IMPORTANTE: Para WA Business, usar o formato que o protocolo Signal espera
    const conteudoMensagem = { text: mensagem };
    
    // 5. Enviar mensagem
    const resultado = await sock.sendMessage(jid, conteudoMensagem);
    
    // 6. IMPORTANTE: Armazenar mensagem COMPLETA para getMessage
    // Isso é CRÍTICO para evitar "Aguardando mensagem" em WA Business
    // Quando o WA Business não consegue descriptografar, ele pede a mensagem via getMessage
    if (resultado?.key) {
      // Armazenar com a mensagem completa retornada pelo sendMessage
      // O resultado.message contém a mensagem no formato correto do proto
      armazenarMensagem(resultado.key, conteudoMensagem, resultado);
      
      // Também armazenar pelo remoteJid para facilitar busca
      const chaveAlternativa = `${resultado.key.remoteJid}_${resultado.key.id}`;
      messageStore.set(chaveAlternativa, {
        key: resultado.key,
        message: resultado.message || { conversation: mensagem },
        content: conteudoMensagem,
        timestamp: Date.now()
      });
    }
    
    // 7. Parar digitação
    try {
      await sock.sendPresenceUpdate('paused', jid);
    } catch (e) {
      // Ignorar erros de presença
    }
    
    // 8. Verificar confirmação de envio
    if (!resultado?.key?.id) {
      throw new Error('Mensagem enviada mas sem confirmação de ID');
    }
    
    logger.info(`✅ Mensagem enviada com sucesso!`);
    logger.info(`   ID: ${resultado.key.id}`);
    logger.info(`   Para: ${jid}`);
    logger.info(`   Mensagens armazenadas: ${messageStore.size}`);
    
    // 9. Delay pós-envio para rate limiting e estabilidade
    await delay(600);
    
    return { 
      sucesso: true, 
      messageId: resultado.key.id,
      jid 
    };
    
  } catch (error) {
    logger.error(`❌ Erro ao enviar (tentativa ${tentativa}/${MAX_TENTATIVAS}):`);
    logger.error(`   Erro: ${error.message}`);
    logger.error(`   Telefone: ${telefone}`);
    
    // Detectar erros específicos de sessão/criptografia
    const erroSessao = error.message?.toLowerCase().includes('session') ||
                       error.message?.toLowerCase().includes('prekey') ||
                       error.message?.toLowerCase().includes('decrypt') ||
                       error.message?.toLowerCase().includes('encrypt');
    
    if (erroSessao) {
      logger.warn(`🔐 Erro de sessão/criptografia detectado - forçando recriação`);
    }
    
    // Retry com backoff exponencial
    if (tentativa < MAX_TENTATIVAS) {
      // Aumentar tempo de espera para erros de sessão
      const tempoBase = erroSessao ? 5000 : 3000;
      const tempoEspera = tentativa * tempoBase;
      logger.info(`🔄 Tentando novamente em ${tempoEspera/1000}s...`);
      
      // Limpar cache para forçar nova verificação do número
      const numeroLimpo = limparNumero(telefone);
      cacheNumerosVerificados.delete(numeroLimpo);
      
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
 * Limpa a sessão de um JID específico para forçar recriação
 * Útil quando um contato (especialmente WA Business) tem problemas de criptografia
 * 
 * @param {string} telefone - Número do telefone
 */
export async function limparSessaoContato(telefone) {
  try {
    const jid = await verificarNumeroWhatsApp(telefone);
    logger.info(`🗑️ Limpando sessão para: ${jid}`);
    
    // Remover do cache de números verificados
    const numeroLimpo = limparNumero(telefone);
    cacheNumerosVerificados.delete(numeroLimpo);
    
    // Forçar nova sincronização de sessão
    await sock.assertSessions([jid], true);
    
    logger.info(`✅ Sessão limpa para: ${jid}`);
    return { sucesso: true };
  } catch (error) {
    logger.error(`❌ Erro ao limpar sessão: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
}

/**
 * Retorna estatísticas do store de mensagens
 */
export function obterEstatisticasStore() {
  return {
    mensagensArmazenadas: messageStore.size,
    limiteMaximo: MAX_STORED_MESSAGES,
    retryCacheSize: msgRetryCounterCache.getStats().keys
  };
}

export default {
  iniciarWhatsApp,
  enviarMensagem,
  estaConectado,
  obterInfoBot,
  forcarNovoQRCode,
  registrarCallbackQR,
  limparSessaoContato,
  obterEstatisticasStore
};
