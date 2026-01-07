/**
 * Paletas de Cores para Personalização
 * Idêntico ao web - cores por tipo de negócio
 */

import { TipoNegocio } from '../../types';

export interface Paleta {
  nome: string;
  descricao: string;
  primaria: string;
  secundaria: string;
  destaque: string;
}

/**
 * Paletas de cores para Barbearias (tons masculinos e neutros)
 */
export const PALETAS_BARBEARIA: Paleta[] = [
  { nome: 'Obsidian', descricao: 'Elegância clássica', primaria: '#09090b', secundaria: '#fafafa', destaque: '#fafafa' },
  { nome: 'Grafite', descricao: 'Minimalismo moderno', primaria: '#18181b', secundaria: '#f4f4f5', destaque: '#a1a1aa' },
  { nome: 'Midnight', descricao: 'Sofisticação noturna', primaria: '#0c0a09', secundaria: '#fafaf9', destaque: '#a8a29e' },
  { nome: 'Slate', descricao: 'Profissional discreto', primaria: '#0f172a', secundaria: '#f8fafc', destaque: '#94a3b8' },
  { nome: 'Charcoal', descricao: 'Neutro atemporal', primaria: '#171717', secundaria: '#fafafa', destaque: '#d4d4d4' },
  { nome: 'Onyx', descricao: 'Contraste marcante', primaria: '#0a0a0a', secundaria: '#ffffff', destaque: '#737373' },
  { nome: 'Navy', descricao: 'Azul profundo', primaria: '#0c1929', secundaria: '#f0f9ff', destaque: '#38bdf8' },
  { nome: 'Forest', descricao: 'Verde floresta', primaria: '#052e16', secundaria: '#f0fdf4', destaque: '#4ade80' },
  { nome: 'Wine', descricao: 'Vinho elegante', primaria: '#1c0a0a', secundaria: '#fef2f2', destaque: '#f87171' },
  { nome: 'Royal', descricao: 'Roxo real', primaria: '#1e1033', secundaria: '#faf5ff', destaque: '#a78bfa' },
  { nome: 'Copper', descricao: 'Cobre vintage', primaria: '#1c1210', secundaria: '#fffbeb', destaque: '#f59e0b' },
  { nome: 'Snow', descricao: 'Branco neve', primaria: '#ffffff', secundaria: '#18181b', destaque: '#71717a' },
];

/**
 * Paletas de cores para Nail Designers (tons femininos e sofisticados)
 */
export const PALETAS_NAIL: Paleta[] = [
  { nome: 'Rose Gold', descricao: 'Elegância rosé', primaria: '#2d1f1f', secundaria: '#fff5f5', destaque: '#e8a4a4' },
  { nome: 'Blush', descricao: 'Rosa delicado', primaria: '#1f1a1a', secundaria: '#fdf2f8', destaque: '#f9a8d4' },
  { nome: 'Nude', descricao: 'Nude sofisticado', primaria: '#292524', secundaria: '#fef7f0', destaque: '#d4a574' },
  { nome: 'Mauve', descricao: 'Malva elegante', primaria: '#1c1a1e', secundaria: '#faf5ff', destaque: '#c4b5fd' },
  { nome: 'Dusty Rose', descricao: 'Rosa antigo', primaria: '#1a1516', secundaria: '#fff1f2', destaque: '#fb7185' },
  { nome: 'Champagne', descricao: 'Champanhe luxuoso', primaria: '#1c1a15', secundaria: '#fefce8', destaque: '#fbbf24' },
  { nome: 'Burgundy', descricao: 'Bordô clássico', primaria: '#1a0a0a', secundaria: '#fef2f2', destaque: '#be123c' },
  { nome: 'Plum', descricao: 'Ameixa refinada', primaria: '#1a0f1a', secundaria: '#fdf4ff', destaque: '#a855f7' },
  { nome: 'Sage', descricao: 'Sálvia suave', primaria: '#0f1a14', secundaria: '#f0fdf4', destaque: '#86efac' },
  { nome: 'Lavender', descricao: 'Lavanda sonhadora', primaria: '#16141f', secundaria: '#f5f3ff', destaque: '#a78bfa' },
  { nome: 'Marble', descricao: 'Mármore luxuoso', primaria: '#fafafa', secundaria: '#18181b', destaque: '#a1a1aa' },
  { nome: 'Coral', descricao: 'Coral vibrante', primaria: '#1c1412', secundaria: '#fff7ed', destaque: '#f97316' },
];

/**
 * Retorna as paletas de cores baseadas no tipo de negócio
 */
export function obterPaletas(tipoNegocio?: TipoNegocio): Paleta[] {
  return tipoNegocio === 'nail_designer' ? PALETAS_NAIL : PALETAS_BARBEARIA;
}

/**
 * Fontes disponíveis para personalização
 * Idêntico ao web - 10 fontes do Google Fonts
 */
export interface Fonte {
  nome: string;
  descricao: string;
  familia: string;
}

export const FONTES_DISPONIVEIS: Fonte[] = [
  { nome: 'Inter', descricao: 'Moderna e legível', familia: 'Inter' },
  { nome: 'Poppins', descricao: 'Geométrica e elegante', familia: 'Poppins' },
  { nome: 'Roboto', descricao: 'Clássica e versátil', familia: 'Roboto' },
  { nome: 'Montserrat', descricao: 'Sofisticada e bold', familia: 'Montserrat' },
  { nome: 'Open Sans', descricao: 'Limpa e neutra', familia: 'OpenSans' },
  { nome: 'Playfair Display', descricao: 'Serifada clássica', familia: 'PlayfairDisplay' },
  { nome: 'Oswald', descricao: 'Condensada impactante', familia: 'Oswald' },
  { nome: 'Lato', descricao: 'Humanista e amigável', familia: 'Lato' },
  { nome: 'Raleway', descricao: 'Elegante e fina', familia: 'Raleway' },
  { nome: 'Nunito', descricao: 'Arredondada e suave', familia: 'Nunito' },
];

/**
 * Obtém a família de fonte para React Native
 */
export function obterFamiliaFonte(nomeFonte: string): string {
  const fonte = FONTES_DISPONIVEIS.find(f => f.nome === nomeFonte);
  return fonte?.familia || 'System';
}
