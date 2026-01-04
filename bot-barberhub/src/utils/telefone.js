/**
 * Utilitários para formatação de telefone
 * Converte números brasileiros para formato JID do WhatsApp
 */

/**
 * Formata número de telefone para JID do WhatsApp
 * Remove o 9 extra dos celulares brasileiros para formato correto do WhatsApp
 * 
 * O WhatsApp Brasil usa formato: 55 + DDD (2) + número (8) = 12 dígitos
 * Celulares brasileiros têm 9 na frente, mas o WhatsApp não usa esse 9.
 * 
 * @param {string} telefone - Número de telefone
 * @returns {string} JID formatado (numero@s.whatsapp.net)
 */
export function formatarParaJid(telefone) {
  if (!telefone) return null;
  
  // Remove tudo que não é dígito
  let numeroLimpo = telefone.replace(/\D/g, '');
  
  // Adiciona código do país se não tiver
  if (!numeroLimpo.startsWith('55')) {
    numeroLimpo = '55' + numeroLimpo;
  }
  
  // Se tem 13 dígitos (55 + DDD + 9 + 8 dígitos), remover o 9 extra
  // Formato: 5563981053014 -> 556381053014
  if (numeroLimpo.length === 13 && numeroLimpo[4] === '9') {
    numeroLimpo = numeroLimpo.slice(0, 4) + numeroLimpo.slice(5);
  }
  
  return `${numeroLimpo}@s.whatsapp.net`;
}

/**
 * Extrai número limpo do telefone
 * @param {string} telefone - Número de telefone
 * @returns {string} Número apenas com dígitos e código do país
 */
export function limparTelefone(telefone) {
  if (!telefone) return null;
  
  let numeroLimpo = telefone.replace(/\D/g, '');
  
  if (!numeroLimpo.startsWith('55')) {
    numeroLimpo = '55' + numeroLimpo;
  }
  
  return numeroLimpo;
}

/**
 * Valida se é um número de telefone válido
 * @param {string} telefone - Número de telefone
 * @returns {boolean} true se válido
 */
export function validarTelefone(telefone) {
  if (!telefone) return false;
  
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // Número brasileiro: 10-11 dígitos (sem código país) ou 12-13 (com código)
  return numeroLimpo.length >= 10 && numeroLimpo.length <= 13;
}

export default {
  formatarParaJid,
  limparTelefone,
  validarTelefone
};
