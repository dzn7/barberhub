/**
 * Serviço de integração com o Bot WhatsApp
 * Comunicação com o backend do bot para envio de notificações
 */

import { CONFIG } from '../constants/config';

const BOT_URL = CONFIG.api.botUrl;

interface RespostaBot {
  sucesso: boolean;
  mensagem?: string;
  erro?: string;
}

/**
 * Envia notificação de confirmação de agendamento
 * Nota: Desativado temporariamente - bot WhatsApp não configurado
 */
export async function enviarConfirmacaoAgendamento(agendamentoId: string): Promise<RespostaBot> {
  // Bot WhatsApp desativado - retorna sucesso sem fazer requisição
  console.log('[Bot] Notificação de confirmação desativada para:', agendamentoId);
  return { sucesso: true, mensagem: 'Notificação desativada' };
}

/**
 * Envia notificação de cancelamento de agendamento
 * Nota: Desativado temporariamente - bot WhatsApp não configurado
 */
export async function enviarCancelamentoAgendamento(agendamentoId: string): Promise<RespostaBot> {
  // Bot WhatsApp desativado - retorna sucesso sem fazer requisição
  console.log('[Bot] Notificação de cancelamento desativada para:', agendamentoId);
  return { sucesso: true, mensagem: 'Notificação desativada' };
}

/**
 * Envia notificação de remarcação de agendamento
 * Nota: Desativado temporariamente - bot WhatsApp não configurado
 */
export async function enviarRemarcacaoAgendamento(agendamentoId: string): Promise<RespostaBot> {
  // Bot WhatsApp desativado - retorna sucesso sem fazer requisição
  console.log('[Bot] Notificação de remarcação desativada para:', agendamentoId);
  return { sucesso: true, mensagem: 'Notificação desativada' };
}

/**
 * Verifica status do bot
 */
export async function verificarStatusBot(): Promise<{ conectado: boolean; numero?: string }> {
  try {
    const resposta = await fetch(`${BOT_URL}/api/status`, {
      method: 'GET',
    });

    if (!resposta.ok) {
      return { conectado: false };
    }

    const dados = await resposta.json();
    return {
      conectado: dados.status === 'connected',
      numero: dados.numero,
    };
  } catch (erro) {
    console.error('Erro ao verificar status do bot:', erro);
    return { conectado: false };
  }
}

/**
 * Solicita QR Code para conexão do WhatsApp
 */
export async function obterQrCode(tenantId: string): Promise<{ qrCode?: string; erro?: string }> {
  try {
    const resposta = await fetch(`${BOT_URL}/api/qrcode/${tenantId}`, {
      method: 'GET',
    });

    if (!resposta.ok) {
      return { erro: 'Não foi possível obter o QR Code' };
    }

    const dados = await resposta.json();
    return { qrCode: dados.qrCode };
  } catch (erro) {
    console.error('Erro ao obter QR Code:', erro);
    return { erro: 'Falha na comunicação com o bot' };
  }
}

/**
 * Envia mensagem personalizada via WhatsApp
 */
export async function enviarMensagemWhatsApp(
  telefone: string,
  mensagem: string,
  tenantId: string
): Promise<RespostaBot> {
  try {
    const resposta = await fetch(`${BOT_URL}/api/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefone,
        mensagem,
        tenantId,
      }),
    });

    const dados = await resposta.json();
    return { sucesso: resposta.ok, ...dados };
  } catch (erro) {
    console.error('Erro ao enviar mensagem:', erro);
    return { sucesso: false, erro: 'Falha na comunicação com o bot' };
  }
}
