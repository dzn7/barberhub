/**
 * Templates de Mensagens Dinâmicos
 * Mensagens personalizadas por tenant para envio via WhatsApp
 * Suporta múltiplos tipos de negócio: barbearia, nail_designer
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { 
  obterTerminologia, 
  obterEmoji, 
  obterEmojiServico,
  obterSaudacaoFinal,
  obterDespedida,
  ehNailDesigner,
  obterTextosProximosPassos
} from './terminologia.js';

const TIMEZONE_BRASIL = 'America/Sao_Paulo';

/**
 * Formata data/hora para timezone brasileiro
 */
function formatarDataHora(dataHora, formato = "dd 'de' MMMM 'às' HH:mm") {
  const dataHoraBrasil = toZonedTime(new Date(dataHora), TIMEZONE_BRASIL);
  return format(dataHoraBrasil, formato, { locale: ptBR });
}

/**
 * Template de boas-vindas para novo tenant (admin/proprietário)
 */
export function templateBoasVindasTenant({ nomeBarbearia, nomeProprietario, slug, tipoNegocio = 'barbearia' }) {
  const termo = obterTerminologia(tipoNegocio);
  const ehNail = ehNailDesigner(tipoNegocio);
  const textos = obterTextosProximosPassos(tipoNegocio);
  const despedida = obterDespedida(tipoNegocio);
  
  const artigoEstabelecimento = ehNail ? 'Seu' : 'Sua';
  const estabelecimentoOnline = ehNail 
    ? `Seu ${termo.estabelecimento.singular.toLowerCase()} está online!`
    : `Sua ${termo.estabelecimento.singular.toLowerCase()} está online!`;
  
  return `🎉 *Parabéns! ${estabelecimentoOnline}*

Olá, *${nomeProprietario}*! 👋

${artigoEstabelecimento} ${termo.estabelecimento.singular.toLowerCase()} *${nomeBarbearia}* foi cadastrad${ehNail ? 'o' : 'a'} com sucesso no BarberHub! 🎊

━━━━━━━━━━━━━━━━━━━
🌐 *SEU SITE DE AGENDAMENTOS:*
barberhub.online/${slug}
━━━━━━━━━━━━━━━━━━━

📋 *PRÓXIMOS PASSOS:*

1️⃣ *Acesse o painel admin:*
   barberhub.online/entrar

2️⃣ *${textos.configurar}*
   ${textos.cadastrarServicos}
   ${textos.adicionarProfissionais}
   ${textos.configurarHorarios}
   ${textos.personalizarLogo}

3️⃣ *Compartilhe com seus clientes:*
   Envie o link do seu site para seus clientes agendarem!

✨ *RECURSOS INCLUSOS:*
• Agendamentos online 24h
• Notificações automáticas no WhatsApp
• Lembretes 1h antes do horário
${textos.recursoComissoes}
• Relatórios e métricas

💡 *Dica:* Adicione o link do seu site na bio do Instagram!

Precisa de ajuda? Responda esta mensagem!
*Equipe BarberHub* ${despedida}`;
}

/**
 * Formata lista de serviços para exibição
 */
function formatarServicos(nomeServico, duracaoTotal = null) {
  if (Array.isArray(nomeServico)) {
    const listaServicos = nomeServico.join(' + ');
    if (duracaoTotal) {
      return `${listaServicos} (${duracaoTotal} min)`;
    }
    return listaServicos;
  }
  if (duracaoTotal) {
    return `${nomeServico} (${duracaoTotal} min)`;
  }
  return nomeServico;
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
  slug,
  tipoNegocio = 'barbearia',
  duracaoTotal = null
}) {
  const dataFormatada = formatarDataHora(dataHora);
  const termo = obterTerminologia(tipoNegocio);
  const ehNail = ehNailDesigner(tipoNegocio);
  const emojiServico = obterEmojiServico(tipoNegocio);
  const saudacao = obterSaudacaoFinal(tipoNegocio);
  
  const preposicao = ehNail ? 'no' : 'na';
  const servicosFormatados = formatarServicos(nomeServico, duracaoTotal);
  const labelServico = Array.isArray(nomeServico) && nomeServico.length > 1 ? 'Serviços' : 'Serviço';
  
  let mensagem = `🎉 *Agendamento Confirmado!*

Olá, *${nomeCliente}*!

Seu agendamento ${preposicao} *${nomeBarbearia}* foi confirmado:

👤 *${termo.profissional.singular}:* ${nomeBarbeiro}
${emojiServico} *${labelServico}:* ${servicosFormatados}
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

🌐 barberhub.online/${slug}`;
  }

  mensagem += `

${saudacao}
*${nomeBarbearia}*`;

  return mensagem;
}

/**
 * Template de notificação para profissional (barbeiro/nail designer)
 */
export function templateNotificacaoBarbeiro({
  nomeBarbeiro,
  nomeCliente,
  telefoneCliente,
  nomeServico,
  preco,
  dataHora,
  observacoes,
  tipoNegocio = 'barbearia',
  duracaoTotal = null
}) {
  const dataFormatada = formatarDataHora(dataHora);
  const emojiServico = obterEmojiServico(tipoNegocio);
  const emoji = obterEmoji(tipoNegocio);
  const servicosFormatados = formatarServicos(nomeServico, duracaoTotal);
  const labelServico = Array.isArray(nomeServico) && nomeServico.length > 1 ? 'Serviços' : 'Serviço';
  
  let mensagem = `📅 *Novo Agendamento!*

Olá, *${nomeBarbeiro}*!

Você tem um novo cliente agendado:

👤 *Cliente:* ${nomeCliente}
📱 *Telefone:* ${telefoneCliente || 'Não informado'}
${emojiServico} *${labelServico}:* ${servicosFormatados}
💰 *Valor:* R$ ${preco?.toFixed(2) || '0.00'}
📅 *Data:* ${dataFormatada}`;

  if (observacoes) {
    mensagem += `

📝 *Observações:* ${observacoes}`;
  }

  mensagem += `

Prepare-se para atender! ${emoji}`;

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
  endereco,
  tipoNegocio = 'barbearia',
  duracaoTotal = null
}) {
  const horaFormatada = formatarDataHora(dataHora, "HH:mm");
  const diaFormatado = formatarDataHora(dataHora, "dd/MM");
  const termo = obterTerminologia(tipoNegocio);
  const ehNail = ehNailDesigner(tipoNegocio);
  const emojiServico = obterEmojiServico(tipoNegocio);
  const despedida = obterDespedida(tipoNegocio);
  
  const preposicao = ehNail ? 'no' : 'na';
  const servicosFormatados = formatarServicos(nomeServico, duracaoTotal);
  const labelServico = Array.isArray(nomeServico) && nomeServico.length > 1 ? 'Serviços' : 'Serviço';
  
  let mensagem = `⏰ *Lembrete: Seu horário está chegando!*

Olá, *${nomeCliente}*! 👋

Seu agendamento ${preposicao} *${nomeBarbearia}* é *HOJE* às *${horaFormatada}h*!

📋 *Detalhes:*
👤 ${termo.profissional.singular}: ${nomeBarbeiro}
${emojiServico} ${labelServico}: ${servicosFormatados}
📅 Data: ${diaFormatado}
🕐 Horário: ${horaFormatada}h`;

  if (endereco) {
    mensagem += `

📍 *Endereço:*
${endereco}`;
  }

  mensagem += `

💡 *Dica:* Chegue com 5 minutos de antecedência!

Estamos te esperando! ${despedida}
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
  slug,
  tipoNegocio = 'barbearia',
  duracaoTotal = null
}) {
  const dataFormatada = formatarDataHora(dataHora);
  const termo = obterTerminologia(tipoNegocio);
  const ehNail = ehNailDesigner(tipoNegocio);
  const emojiServico = obterEmojiServico(tipoNegocio);
  
  const preposicao = ehNail ? 'no' : 'na';
  const servicosFormatados = formatarServicos(nomeServico, duracaoTotal);
  const labelServico = Array.isArray(nomeServico) && nomeServico.length > 1 ? 'Serviços' : 'Serviço';
  
  let mensagem = `❌ *Agendamento Cancelado*

Olá, *${nomeCliente}*,

Seu agendamento ${preposicao} *${nomeBarbearia}* foi cancelado:

👤 *${termo.profissional.singular}:* ${nomeBarbeiro}
${emojiServico} *${labelServico}:* ${servicosFormatados}
📅 *Data:* ${dataFormatada}`;

  if (telefone) {
    mensagem += `

Se deseja reagendar, entre em contato:
📱 ${telefone}`;
  }

  if (slug) {
    mensagem += `

Ou agende online:
🌐 barberhub.online/${slug}`;
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
  endereco,
  telefone,
  slug,
  tipoNegocio = 'barbearia',
  duracaoTotal = null
}) {
  const dataAntigaFormatada = formatarDataHora(dataHoraAntiga);
  const dataNovaFormatada = formatarDataHora(dataHoraNova);
  const termo = obterTerminologia(tipoNegocio);
  const ehNail = ehNailDesigner(tipoNegocio);
  const emojiServico = obterEmojiServico(tipoNegocio);
  const saudacao = obterSaudacaoFinal(tipoNegocio);
  
  const preposicao = ehNail ? 'no' : 'na';
  const contatoEstabelecimento = ehNail 
    ? `📞 *Contato do ${termo.estabelecimento.singular.toLowerCase()}:*`
    : `📞 *Contato da ${termo.estabelecimento.singular.toLowerCase()}:*`;
  const servicosFormatados = formatarServicos(nomeServico, duracaoTotal);
  const labelServico = Array.isArray(nomeServico) && nomeServico.length > 1 ? 'Serviços' : 'Serviço';
  
  let mensagem = `🔄 *Agendamento Remarcado!*

Olá, *${nomeCliente}*!

Seu agendamento ${preposicao} *${nomeBarbearia}* foi remarcado:

❌ *Data Anterior:*
~${dataAntigaFormatada}~

✅ *Nova Data:*
*${dataNovaFormatada}*

━━━━━━━━━━━━━━━━━━━
👤 *${termo.profissional.singular}:* ${nomeBarbeiro}
${emojiServico} *${labelServico}:* ${servicosFormatados}
💰 *Valor:* R$ ${preco?.toFixed(2) || '0.00'}
━━━━━━━━━━━━━━━━━━━`;

  if (endereco) {
    mensagem += `

📍 *Endereço:*
${endereco}`;
  }

  mensagem += `

⏰ Por favor, chegue com 5 minutos de antecedência.`;

  if (telefone) {
    mensagem += `

${contatoEstabelecimento}
${telefone}`;
  }

  if (slug) {
    mensagem += `

🌐 *Reagendar online:*
barberhub.online/${slug}`;
  }

  mensagem += `

${saudacao}
*${nomeBarbearia}*`;

  return mensagem;
}

/**
 * Template de boas-vindas para novo barbeiro cadastrado
 */
export function templateBoasVindasBarbeiro({ 
  nomeBarbeiro, 
  nomeBarbearia,
  tokenAcesso,
  slug,
  tipoNegocio = 'barbearia'
}) {
  const ehNail = tipoNegocio === 'nail_designer';
  const termo = ehNail ? 'nail designer' : 'barbeiro';
  const emoji = ehNail ? '💅' : '💈';
  
  return `👋 *Bem-vindo(a) à equipe, ${nomeBarbeiro}!*

Você foi cadastrado(a) como ${termo} no(a) *${nomeBarbearia}*! 🎉

━━━━━━━━━━━━━━━━━━━
🔐 *ACESSE SEU PAINEL:*
━━━━━━━━━━━━━━━━━━━

1️⃣ *Acesse o link:*
barberhub.online/colaborador/entrar

2️⃣ *Digite seu token de acesso:*
*${tokenAcesso}*

━━━━━━━━━━━━━━━━━━━

📱 *NO SEU PAINEL VOCÊ PODE:*
• Ver sua agenda de atendimentos
• Acompanhar suas comissões
• Personalizar preços dos serviços
• Atualizar seus dados e foto

💡 *Dica:* Salve o link nos favoritos para acesso rápido!

🔔 *Notificações:*
Você receberá alertas de novos agendamentos diretamente aqui no WhatsApp!

Qualquer dúvida, fale com o proprietário.

Bom trabalho! ${emoji}✨
*${nomeBarbearia}*`;
}

/**
 * Template de notificação de horário liberado (lista de espera)
 */
export function templateHorarioLiberado({ 
  nomeCliente,
  nomeBarbearia,
  nomeBarbeiro, 
  dataHora,
  slug,
  tipoNegocio = 'barbearia'
}) {
  const dataFormatada = formatarDataHora(dataHora);
  const termo = obterTerminologia(tipoNegocio);
  const ehNail = ehNailDesigner(tipoNegocio);
  const emoji = obterEmoji(tipoNegocio);
  
  const preposicao = ehNail ? 'no' : 'na';
  
  return `🔔 *Horário Liberado!*

${nomeCliente ? `Olá, *${nomeCliente}*!` : 'Olá!'}

Ótima notícia! O horário que você estava aguardando ${preposicao} *${nomeBarbearia}* acabou de ser liberado! 🎉

━━━━━━━━━━━━━━━━━━━
📅 *Data:* ${dataFormatada}
👤 *${termo.profissional.singular}:* ${nomeBarbeiro}
━━━━━━━━━━━━━━━━━━━

⚡ *Corra para garantir seu horário!*
Este horário pode ser reservado por outro cliente a qualquer momento.

🌐 *Agende agora:*
barberhub.online/${slug}/agendar

${emoji} *${nomeBarbearia}*`;
}

export default {
  templateBoasVindasTenant,
  templateConfirmacaoCliente,
  templateNotificacaoBarbeiro,
  templateLembreteCliente,
  templateCancelamentoCliente,
  templateRemarcacaoCliente,
  templateBoasVindasBarbeiro,
  templateHorarioLiberado
};
