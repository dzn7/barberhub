/**
 * Templates de Mensagens Dinâmicos
 * Mensagens personalizadas por tenant para envio via WhatsApp
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE_BRASIL = 'America/Sao_Paulo';

/**
 * Formata data/hora para timezone brasileiro
 */
function formatarDataHora(dataHora, formato = "dd 'de' MMMM 'às' HH:mm") {
  const dataHoraBrasil = toZonedTime(new Date(dataHora), TIMEZONE_BRASIL);
  return format(dataHoraBrasil, formato, { locale: ptBR });
}

/**
 * Template de boas-vindas para novo tenant
 */
export function templateBoasVindasTenant({ nomeBarbearia, nomeProprietario, slug }) {
  return `🎉 *Bem-vindo ao BarberHub!*

Olá, *${nomeProprietario}*!

Sua barbearia *${nomeBarbearia}* foi cadastrada com sucesso! 🎊

📱 *Seu site está pronto:*
🌐 barberhub.com.br/${slug}

✨ *O que você pode fazer agora:*
• Cadastrar seus serviços
• Adicionar barbeiros
• Configurar horários
• Receber agendamentos online

📲 *Notificações automáticas:*
Seus clientes receberão confirmações e lembretes por WhatsApp!

Precisa de ajuda? Estamos aqui!
*Equipe BarberHub* 💈`;
}

/**
 * Template de confirmação de agendamento para cliente
 */
export function templateConfirmacaoCliente({ 
  nomeCliente, 
  nomeBarbearia,
  nomeBarbeiro, 
  nomeServico, 
  preco, 
  dataHora,
  endereco,
  telefone,
  slug
}) {
  const dataFormatada = formatarDataHora(dataHora);
  
  let mensagem = `🎉 *Agendamento Confirmado!*

Olá, *${nomeCliente}*!

Seu agendamento na *${nomeBarbearia}* foi confirmado:

👨‍💼 *Barbeiro:* ${nomeBarbeiro}
✂️ *Serviço:* ${nomeServico}
💰 *Valor:* R$ ${preco?.toFixed(2) || '0.00'}
📅 *Data:* ${dataFormatada}`;

  if (endereco) {
    mensagem += `

📍 *Endereço:*
${endereco}`;
  }

  mensagem += `

⏰ Por favor, chegue com 5 minutos de antecedência.`;

  if (telefone) {
    mensagem += `

Precisa reagendar? Entre em contato:
📱 ${telefone}`;
  }

  if (slug) {
    mensagem += `

🌐 barberhub.com.br/${slug}`;
  }

  mensagem += `

Nos vemos em breve! 💈
*${nomeBarbearia}*`;

  return mensagem;
}

/**
 * Template de notificação para barbeiro
 */
export function templateNotificacaoBarbeiro({
  nomeBarbeiro,
  nomeCliente,
  telefoneCliente,
  nomeServico,
  preco,
  dataHora,
  observacoes
}) {
  const dataFormatada = formatarDataHora(dataHora);
  
  let mensagem = `📅 *Novo Agendamento!*

Olá, *${nomeBarbeiro}*!

Você tem um novo cliente agendado:

👤 *Cliente:* ${nomeCliente}
📱 *Telefone:* ${telefoneCliente || 'Não informado'}
✂️ *Serviço:* ${nomeServico}
💰 *Valor:* R$ ${preco?.toFixed(2) || '0.00'}
📅 *Data:* ${dataFormatada}`;

  if (observacoes) {
    mensagem += `

📝 *Observações:* ${observacoes}`;
  }

  mensagem += `

Prepare-se para atender! 💈`;

  return mensagem;
}

/**
 * Template de lembrete (1 hora antes)
 */
export function templateLembreteCliente({ 
  nomeCliente, 
  nomeBarbearia,
  nomeBarbeiro, 
  nomeServico, 
  dataHora,
  endereco
}) {
  const horaFormatada = formatarDataHora(dataHora, "HH:mm");
  const diaFormatado = formatarDataHora(dataHora, "dd/MM");
  
  let mensagem = `⏰ *Lembrete: Seu horário está chegando!*

Olá, *${nomeCliente}*! 👋

Seu agendamento na *${nomeBarbearia}* é *HOJE* às *${horaFormatada}h*!

📋 *Detalhes:*
👨‍💼 Barbeiro: ${nomeBarbeiro}
✂️ Serviço: ${nomeServico}
📅 Data: ${diaFormatado}
🕐 Horário: ${horaFormatada}h`;

  if (endereco) {
    mensagem += `

📍 *Endereço:*
${endereco}`;
  }

  mensagem += `

💡 *Dica:* Chegue com 5 minutos de antecedência!

Estamos te esperando! 💈✨
*${nomeBarbearia}*`;

  return mensagem;
}

/**
 * Template de cancelamento
 */
export function templateCancelamentoCliente({ 
  nomeCliente, 
  nomeBarbearia,
  nomeBarbeiro, 
  nomeServico, 
  dataHora,
  telefone,
  slug
}) {
  const dataFormatada = formatarDataHora(dataHora);
  
  let mensagem = `❌ *Agendamento Cancelado*

Olá, *${nomeCliente}*,

Seu agendamento na *${nomeBarbearia}* foi cancelado:

👨‍💼 *Barbeiro:* ${nomeBarbeiro}
✂️ *Serviço:* ${nomeServico}
📅 *Data:* ${dataFormatada}`;

  if (telefone) {
    mensagem += `

Se deseja reagendar, entre em contato:
📱 ${telefone}`;
  }

  if (slug) {
    mensagem += `

Ou agende online:
🌐 barberhub.com.br/${slug}`;
  }

  mensagem += `

*${nomeBarbearia}*`;

  return mensagem;
}

/**
 * Template de remarcação
 */
export function templateRemarcacaoCliente({ 
  nomeCliente, 
  nomeBarbearia,
  nomeBarbeiro, 
  nomeServico, 
  preco,
  dataHoraAntiga,
  dataHoraNova,
  endereco
}) {
  const dataAntigaFormatada = formatarDataHora(dataHoraAntiga);
  const dataNovaFormatada = formatarDataHora(dataHoraNova);
  
  let mensagem = `🔄 *Agendamento Remarcado!*

Olá, *${nomeCliente}*!

Seu agendamento na *${nomeBarbearia}* foi remarcado:

📅 *Data Anterior:*
${dataAntigaFormatada}

📅 *Nova Data:*
${dataNovaFormatada}

👨‍💼 *Barbeiro:* ${nomeBarbeiro}
✂️ *Serviço:* ${nomeServico}
💰 *Valor:* R$ ${preco?.toFixed(2) || '0.00'}`;

  if (endereco) {
    mensagem += `

📍 *Endereço:*
${endereco}`;
  }

  mensagem += `

⏰ Por favor, chegue com 5 minutos de antecedência.

Nos vemos em breve! 💈
*${nomeBarbearia}*`;

  return mensagem;
}

export default {
  templateBoasVindasTenant,
  templateConfirmacaoCliente,
  templateNotificacaoBarbeiro,
  templateLembreteCliente,
  templateCancelamentoCliente,
  templateRemarcacaoCliente
};
