/**
 * Utilitários para formatação de telefone
 * Converte números brasileiros para formato JID do WhatsApp
 */

/**
 * Formata número de telefone para JID do WhatsApp
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
  
  // Remove o 9 extra se tiver 13 dígitos (formato antigo)
  // Formato correto: 55 + DDD (2) + Número (8 ou 9 dígitos)
  // WhatsApp usa formato sem o 9 extra para alguns números
  if (numeroLimpo.length === 13 && numeroLimpo.charAt(4) === '9') {
    // Verifica se é um número móvel (DDD + 9 + 8 dígitos)
    const ddd = parseInt(numeroLimpo.substring(2, 4));
    // DDDs que usam 9 dígitos: maioria do Brasil
    if (ddd >= 11 && ddd <= 99) {
      // Mantém o 9 para números móveis brasileiros
      // O WhatsApp aceita ambos os formatos
    }
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
