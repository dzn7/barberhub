/**
 * Utilitários de fontes para uso em Server e Client Components
 */

/**
 * Mapeamento de nomes de fontes para classes CSS
 */
export const CLASSES_FONTES: Record<string, string> = {
  'Inter': 'font-inter',
  'Poppins': 'font-poppins',
  'Roboto': 'font-roboto',
  'Montserrat': 'font-montserrat',
  'Open Sans': 'font-open-sans',
  'Playfair Display': 'font-playfair',
  'Oswald': 'font-oswald',
  'Lato': 'font-lato',
  'Raleway': 'font-raleway',
  'Nunito': 'font-nunito',
};

/**
 * Mapeamento de nomes de fontes para URLs do Google Fonts
 */
export const FONTES_GOOGLE: Record<string, string> = {
  'Inter': 'Inter:wght@400;500;600;700',
  'Poppins': 'Poppins:wght@400;500;600;700',
  'Roboto': 'Roboto:wght@400;500;700',
  'Montserrat': 'Montserrat:wght@400;500;600;700',
  'Open Sans': 'Open+Sans:wght@400;500;600;700',
  'Playfair Display': 'Playfair+Display:wght@400;500;600;700',
  'Oswald': 'Oswald:wght@400;500;600;700',
  'Lato': 'Lato:wght@400;700',
  'Raleway': 'Raleway:wght@400;500;600;700',
  'Nunito': 'Nunito:wght@400;500;600;700',
};

/**
 * Obtém a classe CSS para uma fonte
 */
export function obterClasseFonte(nomeFonte: string): string {
  return CLASSES_FONTES[nomeFonte] || 'font-inter';
}

/**
 * Gera URL do Google Fonts para as fontes especificadas
 */
export function gerarUrlFontes(fontePrincipal: string, fonteTitulos?: string): string | null {
  const fontesParaCarregar = new Set<string>();
  
  if (fontePrincipal && FONTES_GOOGLE[fontePrincipal]) {
    fontesParaCarregar.add(FONTES_GOOGLE[fontePrincipal]);
  }
  
  if (fonteTitulos && FONTES_GOOGLE[fonteTitulos] && fonteTitulos !== fontePrincipal) {
    fontesParaCarregar.add(FONTES_GOOGLE[fonteTitulos]);
  }

  if (fontesParaCarregar.size === 0) return null;

  return `https://fonts.googleapis.com/css2?${Array.from(fontesParaCarregar).map(f => `family=${f}`).join('&')}&display=swap`;
}
