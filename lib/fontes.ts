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
  'DM Sans': 'font-dm-sans',
  'Manrope': 'font-manrope',
  'Space Grotesk': 'font-space-grotesk',
  'Bebas Neue': 'font-bebas-neue',
  'Merriweather': 'font-merriweather',
  'Cormorant Garamond': 'font-cormorant',
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
  'DM Sans': 'DM+Sans:wght@400;500;700',
  'Manrope': 'Manrope:wght@400;500;700',
  'Space Grotesk': 'Space+Grotesk:wght@400;500;700',
  'Bebas Neue': 'Bebas+Neue',
  'Merriweather': 'Merriweather:wght@400;700',
  'Cormorant Garamond': 'Cormorant+Garamond:wght@400;500;600;700',
};

/**
 * Mapeamento de nomes para font-family com fallbacks
 */
export const FONTES_FAMILIA: Record<string, string> = {
  'Inter': "'Inter', ui-sans-serif, system-ui, sans-serif",
  'Poppins': "'Poppins', ui-sans-serif, system-ui, sans-serif",
  'Roboto': "'Roboto', ui-sans-serif, system-ui, sans-serif",
  'Montserrat': "'Montserrat', ui-sans-serif, system-ui, sans-serif",
  'Open Sans': "'Open Sans', ui-sans-serif, system-ui, sans-serif",
  'Playfair Display': "'Playfair Display', ui-serif, Georgia, serif",
  'Oswald': "'Oswald', ui-sans-serif, system-ui, sans-serif",
  'Lato': "'Lato', ui-sans-serif, system-ui, sans-serif",
  'Raleway': "'Raleway', ui-sans-serif, system-ui, sans-serif",
  'Nunito': "'Nunito', ui-sans-serif, system-ui, sans-serif",
  'DM Sans': "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  'Manrope': "'Manrope', ui-sans-serif, system-ui, sans-serif",
  'Space Grotesk': "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
  'Bebas Neue': "'Bebas Neue', 'Arial Narrow', ui-sans-serif, sans-serif",
  'Merriweather': "'Merriweather', ui-serif, Georgia, serif",
  'Cormorant Garamond': "'Cormorant Garamond', ui-serif, Georgia, serif",
};

/**
 * Obtém a classe CSS para uma fonte
 */
export function obterClasseFonte(nomeFonte: string): string {
  return CLASSES_FONTES[nomeFonte] || 'font-inter';
}

/**
 * Obtém a família da fonte para uso em variáveis CSS inline
 */
export function obterFamiliaFonte(nomeFonte: string): string {
  return FONTES_FAMILIA[nomeFonte] || FONTES_FAMILIA['Inter'];
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
