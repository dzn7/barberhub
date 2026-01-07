'use client';

/**
 * Componente para carregar fontes do Google Fonts dinamicamente
 * Baseado nas configurações do tenant
 */

import { useEffect } from 'react';

interface CarregadorFontesProps {
  fontePrincipal: string;
  fonteTitulos: string;
}

/**
 * Mapeamento de nomes de fontes para URLs do Google Fonts
 */
const FONTES_GOOGLE: Record<string, string> = {
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
 * Obtém a classe CSS para uma fonte
 */
export function obterClasseFonte(nomeFonte: string): string {
  return CLASSES_FONTES[nomeFonte] || 'font-inter';
}

/**
 * Componente que injeta as fontes do Google Fonts dinamicamente
 */
export function CarregadorFontes({ fontePrincipal, fonteTitulos }: CarregadorFontesProps) {
  useEffect(() => {
    // Coletar fontes únicas para carregar
    const fontesParaCarregar = new Set<string>();
    
    if (fontePrincipal && FONTES_GOOGLE[fontePrincipal]) {
      fontesParaCarregar.add(FONTES_GOOGLE[fontePrincipal]);
    }
    
    if (fonteTitulos && FONTES_GOOGLE[fonteTitulos] && fonteTitulos !== fontePrincipal) {
      fontesParaCarregar.add(FONTES_GOOGLE[fonteTitulos]);
    }

    if (fontesParaCarregar.size === 0) return;

    // Criar URL do Google Fonts
    const fontesUrl = `https://fonts.googleapis.com/css2?${Array.from(fontesParaCarregar).map(f => `family=${f}`).join('&')}&display=swap`;

    // Verificar se já existe um link para essas fontes
    const linkExistente = document.querySelector(`link[href="${fontesUrl}"]`);
    if (linkExistente) return;

    // Criar e injetar link de preconnect
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';

    // Criar e injetar link das fontes
    const linkFontes = document.createElement('link');
    linkFontes.rel = 'stylesheet';
    linkFontes.href = fontesUrl;

    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(linkFontes);

    // Cleanup
    return () => {
      preconnect1.remove();
      preconnect2.remove();
      linkFontes.remove();
    };
  }, [fontePrincipal, fonteTitulos]);

  return null;
}

export default CarregadorFontes;
