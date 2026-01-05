/**
 * Configurações específicas para cada tipo de negócio
 * 
 * Este arquivo contém todas as configurações de terminologia,
 * categorias de serviços e textos para cada tipo de negócio suportado.
 */

import { 
  TipoNegocio, 
  Terminologia, 
  CategoriaServico 
} from './tipos-negocio'

/**
 * Especialidades sugeridas para Barbeiros
 */
const ESPECIALIDADES_BARBEARIA: string[] = [
  'Corte Masculino',
  'Degradê',
  'Barba',
  'Pigmentação',
  'Química',
  'Corte Infantil',
  'Tratamento Capilar',
  'Sobrancelha',
  'Relaxamento',
  'Platinado'
]

/**
 * Especialidades sugeridas para Nail Designers
 */
const ESPECIALIDADES_NAIL: string[] = [
  'Alongamento em Gel',
  'Fibra de Vidro',
  'Nail Art',
  'Esmaltação em Gel',
  'Francesinha',
  'Decoração 3D',
  'Manicure Russa',
  'Banho de Gel',
  'Unhas de Porcelana',
  'Spa dos Pés'
]

/**
 * Categorias de serviços para Barbearias
 */
const CATEGORIAS_BARBEARIA: CategoriaServico[] = [
  { id: 'corte', nome: 'Corte', icone: 'Scissors', ordem: 1 },
  { id: 'barba', nome: 'Barba', icone: 'Brush', ordem: 2 },
  { id: 'sobrancelha', nome: 'Sobrancelha', icone: 'Eye', ordem: 3 },
  { id: 'pigmentacao', nome: 'Pigmentação', icone: 'Palette', ordem: 4 },
  { id: 'tratamento', nome: 'Tratamento', icone: 'Droplets', ordem: 5 },
  { id: 'combo', nome: 'Combo', icone: 'Package', ordem: 6 },
  { id: 'outros', nome: 'Outros', icone: 'MoreHorizontal', ordem: 99 }
]

/**
 * Categorias de serviços para Nail Designers
 */
const CATEGORIAS_NAIL: CategoriaServico[] = [
  { id: 'alongamento', nome: 'Alongamento', icone: 'Gem', ordem: 1 },
  { id: 'esmaltacao', nome: 'Esmaltação em Gel', icone: 'Droplets', ordem: 2 },
  { id: 'manicure', nome: 'Manicure', icone: 'Hand', ordem: 3 },
  { id: 'pedicure', nome: 'Pedicure', icone: 'Footprints', ordem: 4 },
  { id: 'nail_art', nome: 'Nail Art', icone: 'Palette', ordem: 5 },
  { id: 'manutencao', nome: 'Manutenção', icone: 'RefreshCw', ordem: 6 },
  { id: 'spa', nome: 'Spa dos Pés', icone: 'Heart', ordem: 7 },
  { id: 'outros', nome: 'Outros', icone: 'MoreHorizontal', ordem: 99 }
]

/**
 * Configuração completa de terminologia para Barbearias
 */
const TERMINOLOGIA_BARBEARIA: Terminologia = {
  tipo: 'barbearia',
  nomeExibicao: 'Barbearia',
  
  profissional: {
    singular: 'Barbeiro',
    plural: 'Barbeiros',
    artigo: 'o',
    artigoPlural: 'os'
  },
  
  estabelecimento: {
    singular: 'Barbearia',
    plural: 'Barbearias',
    artigo: 'a'
  },
  
  servicosExemplo: [
    'Corte de cabelo',
    'Barba completa',
    'Sobrancelha',
    'Pigmentação',
    'Hidratação capilar'
  ],
  
  categoriasServicos: CATEGORIAS_BARBEARIA,
  
  icone: 'Scissors',
  
  cores: {
    primaria: '#18181b',
    secundaria: '#fafafa',
    destaque: '#a1a1aa'
  },
  
  textos: {
    bemVindo: 'Bem-vindo à',
    selecioneProfissional: 'Escolha o Profissional',
    selecioneServico: 'Escolha o Serviço',
    agendamentoConfirmado: 'Agendamento Confirmado',
    semProfissionais: 'Nenhum barbeiro cadastrado'
  }
}

/**
 * Configuração completa de terminologia para Nail Designers
 */
const TERMINOLOGIA_NAIL: Terminologia = {
  tipo: 'nail_designer',
  nomeExibicao: 'Estúdio de Unhas',
  
  profissional: {
    singular: 'Nail Designer',
    plural: 'Nail Designers',
    artigo: 'a',
    artigoPlural: 'as'
  },
  
  estabelecimento: {
    singular: 'Estúdio',
    plural: 'Estúdios',
    artigo: 'o'
  },
  
  servicosExemplo: [
    'Alongamento em Gel',
    'Esmaltação em Gel',
    'Nail Art',
    'Manutenção',
    'Spa dos Pés'
  ],
  
  categoriasServicos: CATEGORIAS_NAIL,
  
  icone: 'Hand',
  
  cores: {
    primaria: '#18181b',
    secundaria: '#fafafa',
    destaque: '#d4a574'
  },
  
  textos: {
    bemVindo: 'Bem-vinda ao',
    selecioneProfissional: 'Escolha a Profissional',
    selecioneServico: 'Escolha o Serviço',
    agendamentoConfirmado: 'Agendamento Confirmado',
    semProfissionais: 'Nenhuma nail designer cadastrada'
  }
}

/**
 * Mapa de configurações por tipo de negócio
 */
const CONFIGURACOES: Record<TipoNegocio, Terminologia> = {
  barbearia: TERMINOLOGIA_BARBEARIA,
  nail_designer: TERMINOLOGIA_NAIL
}

/**
 * Obtém a terminologia completa para um tipo de negócio
 * 
 * @param tipo - O tipo de negócio
 * @returns A terminologia completa para o tipo especificado
 */
export function obterTerminologia(tipo: TipoNegocio): Terminologia {
  return CONFIGURACOES[tipo] || TERMINOLOGIA_BARBEARIA
}

/**
 * Obtém as categorias de serviços para um tipo de negócio
 * 
 * @param tipo - O tipo de negócio
 * @returns Array de categorias de serviços
 */
export function obterCategoriasServicos(tipo: TipoNegocio): CategoriaServico[] {
  const terminologia = obterTerminologia(tipo)
  return terminologia.categoriasServicos
}

/**
 * Obtém o termo para "profissional" baseado no tipo e número
 * 
 * @param tipo - O tipo de negócio
 * @param plural - Se deve retornar no plural
 * @param comArtigo - Se deve incluir o artigo
 * @returns O termo formatado
 */
export function obterTermoProfissional(
  tipo: TipoNegocio, 
  plural: boolean = false,
  comArtigo: boolean = false
): string {
  const terminologia = obterTerminologia(tipo)
  const termo = plural 
    ? terminologia.profissional.plural 
    : terminologia.profissional.singular
  
  if (comArtigo) {
    const artigo = plural 
      ? terminologia.profissional.artigoPlural 
      : terminologia.profissional.artigo
    return `${artigo} ${termo}`
  }
  
  return termo
}

/**
 * Obtém o termo para "estabelecimento" baseado no tipo
 * 
 * @param tipo - O tipo de negócio
 * @param comArtigo - Se deve incluir o artigo
 * @returns O termo formatado
 */
export function obterTermoEstabelecimento(
  tipo: TipoNegocio,
  comArtigo: boolean = false
): string {
  const terminologia = obterTerminologia(tipo)
  const termo = terminologia.estabelecimento.singular
  
  if (comArtigo) {
    return `${terminologia.estabelecimento.artigo} ${termo}`
  }
  
  return termo
}

/**
 * Obtém o ícone principal para um tipo de negócio
 * 
 * @param tipo - O tipo de negócio
 * @returns Nome do ícone Lucide
 */
export function obterIconePrincipal(tipo: TipoNegocio): string {
  const terminologia = obterTerminologia(tipo)
  return terminologia.icone
}

/**
 * Obtém as cores sugeridas para um tipo de negócio
 * 
 * @param tipo - O tipo de negócio
 * @returns Objeto com as cores
 */
export function obterCoresSugeridas(tipo: TipoNegocio): Terminologia['cores'] {
  const terminologia = obterTerminologia(tipo)
  return terminologia.cores
}

/**
 * Obtém as especialidades sugeridas para um tipo de negócio
 * 
 * @param tipo - O tipo de negócio
 * @returns Array de especialidades sugeridas
 */
export function obterEspecialidadesSugeridas(tipo: TipoNegocio): string[] {
  return tipo === 'nail_designer' ? ESPECIALIDADES_NAIL : ESPECIALIDADES_BARBEARIA
}

/**
 * Obtém o emoji principal para um tipo de negócio
 * Usado em notificações WhatsApp e mensagens
 * 
 * @param tipo - O tipo de negócio
 * @returns Emoji representativo
 */
export function obterEmojiPrincipal(tipo: TipoNegocio): string {
  return tipo === 'nail_designer' ? '💅' : '✂️'
}

/**
 * Obtém textos dinâmicos para notificações
 * 
 * @param tipo - O tipo de negócio
 * @returns Objeto com textos para notificações
 */
export function obterTextosNotificacao(tipo: TipoNegocio) {
  const terminologia = obterTerminologia(tipo)
  const emoji = obterEmojiPrincipal(tipo)
  
  return {
    emoji,
    profissional: terminologia.profissional.singular,
    profissionalPlural: terminologia.profissional.plural,
    estabelecimento: terminologia.estabelecimento.singular,
    iconeServico: emoji,
    ...terminologia.textos
  }
}

/**
 * Exporta todas as configurações para uso externo
 */
export {
  CATEGORIAS_BARBEARIA,
  CATEGORIAS_NAIL,
  ESPECIALIDADES_BARBEARIA,
  ESPECIALIDADES_NAIL,
  TERMINOLOGIA_BARBEARIA,
  TERMINOLOGIA_NAIL,
  CONFIGURACOES
}
