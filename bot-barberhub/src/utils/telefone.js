/**
 * Utilitários para formatação de telefone
 * Converte números brasileiros para formato JID do WhatsApp
 */

/**
 * Normaliza número para padrão BR de WhatsApp:
 * - garante código do país 55
 * - compatibilidade regional:
 *   - DDD 11: usa formato com 9 (novo)
 *   - demais DDDs: mantém formato antigo sem 9
 *
 * @param {string} telefone
 * @returns {string|null} número no formato 55 + DDD + número (12 ou 13 dígitos)
 */
function normalizarNumeroWhatsappBR(telefone) {
  if (!telefone) return null;

  let numero = telefone.replace(/\D/g, '');
  if (!numero) return null;

  if (numero.startsWith('55')) {
    numero = numero.slice(2);
  }

  if (numero.length < 10 || numero.length > 11) return null;

  const ddd = numero.slice(0, 2);

  // São Paulo (11): força formato com 9
  if (ddd === '11' && numero.length === 10) {
    numero = `${ddd}9${numero.slice(2)}`;
  }

  // Outros DDDs: usa formato antigo sem 9
  if (ddd !== '11' && numero.length === 11 && numero[2] === '9') {
    numero = `${ddd}${numero.slice(3)}`;
  }

  if (numero.length < 10 || numero.length > 11) return null;

  return `55${numero}`;
}

/**
 * Formata número de telefone para JID do WhatsApp
 * 
 * @param {string} telefone - Número de telefone
 * @returns {string} JID formatado (numero@s.whatsapp.net)
 */
export function formatarParaJid(telefone) {
  const numeroNormalizado = normalizarNumeroWhatsappBR(telefone);
  if (!numeroNormalizado) return null;

  return `${numeroNormalizado}@s.whatsapp.net`;
}

/**
 * Extrai número limpo do telefone
 * @param {string} telefone - Número de telefone
 * @returns {string} Número apenas com dígitos e código do país
 */
export function limparTelefone(telefone) {
  return normalizarNumeroWhatsappBR(telefone);
}

/**
 * Valida se é um número de telefone válido
 * @param {string} telefone - Número de telefone
 * @returns {boolean} true se válido
 */
export function validarTelefone(telefone) {
  return !!normalizarNumeroWhatsappBR(telefone);
}

export default {
  formatarParaJid,
  limparTelefone,
  validarTelefone
};
