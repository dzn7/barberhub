/**
 * Configurações específicas para cada tipo de negócio
 * 
 * Este arquivo contém todas as configurações de terminologia,
 * categorias de serviços e textos para cada tipo de negócio suportado.
 */

import { 
  TipoNegocio, 
  Terminologia, 
  CategoriaServico,
  ehTipoNegocioFeminino
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
 * Especialidades sugeridas para Lash Designers
 */
const ESPECIALIDADES_LASH: string[] = [
  'Fio a Fio',
  'Volume Brasileiro',
  'Volume Russo',
  'Lash Lifting',
  'Manutenção de Cílios',
  'Remoção de Cílios',
  'Henna para Sobrancelhas',
  'Design de Sobrancelhas',
  'Laminação de Sobrancelhas',
  'Brow Lamination'
]

/**
 * Especialidades sugeridas para Cabeleireiras
 */
const ESPECIALIDADES_CABELEIREIRA: string[] = [
  'Corte Feminino',
  'Escova',
  'Hidratação',
  'Coloração',
  'Mechas',
  'Progressiva',
  'Botox Capilar',
  'Penteados',
  'Tratamento Capilar',
  'Finalização'
]

/**
 * Categorias de especialidades para Barbearias (usado no cadastro de profissionais)
 */
export const CATEGORIAS_ESPECIALIDADES_BARBEARIA: Record<string, string[]> = {
  'Cortes': [
    'Corte Masculino',
    'Degradê',
    'Corte Infantil',
    'Corte Feminino',
    'Corte Navalhado',
    'Corte Social',
    'Corte Americano',
    'Undercut',
    'Moicano',
    'Mullet'
  ],
  'Barba': [
    'Barba Completa',
    'Barba Desenhada',
    'Barba Degradê',
    'Pézinho',
    'Bigode',
    'Cavanhaque'
  ],
  'Tratamentos': [
    'Hidratação Capilar',
    'Tratamento Antiqueda',
    'Cauterização',
    'Botox Capilar',
    'Reconstrução',
    'Nutrição'
  ],
  'Química': [
    'Pigmentação',
    'Coloração',
    'Luzes',
    'Platinado',
    'Relaxamento',
    'Progressiva',
    'Descoloração'
  ],
  'Outros': [
    'Design de Sobrancelha',
    'Limpeza de Pele',
    'Depilação Facial',
    'Massagem Capilar'
  ]
}

/**
 * Categorias de especialidades para Nail Designers (usado no cadastro de profissionais)
 */
export const CATEGORIAS_ESPECIALIDADES_NAIL: Record<string, string[]> = {
  'Alongamento': [
    'Alongamento em Gel',
    'Fibra de Vidro',
    'Unhas de Porcelana',
    'Unhas Acrílicas',
    'Molde F1',
    'Molde Bailarina',
    'Molde Stiletto',
    'Molde Coffin'
  ],
  'Esmaltação': [
    'Esmaltação em Gel',
    'Esmaltação Tradicional',
    'Banho de Gel',
    'Rubber Base',
    'Builder Gel',
    'Polygel'
  ],
  'Nail Art': [
    'Decoração 3D',
    'Francesinha',
    'Baby Boomer',
    'Encapsulamento',
    'Pedrarias',
    'Adesivos',
    'Carimbos',
    'Degradê'
  ],
  'Manutenção': [
    'Manutenção Quinzenal',
    'Manutenção Mensal',
    'Remoção Segura',
    'Blindagem',
    'Fortalecimento'
  ],
  'Pedicure': [
    'Spa dos Pés',
    'Pedicure Russa',
    'Esmaltação Pés',
    'Alongamento Pés',
    'Tratamento Podal'
  ],
  'Outros': [
    'Manicure Russa',
    'Cuticulagem',
    'Hidratação',
    'Design de Unhas'
  ]
}

/**
 * Categorias de especialidades para Lash Designers
 */
export const CATEGORIAS_ESPECIALIDADES_LASH: Record<string, string[]> = {
  'Extensão de Cílios': [
    'Fio a Fio',
    'Volume Brasileiro',
    'Volume Russo',
    'Volume Egípcio',
    'Mega Volume',
    'Híbrido'
  ],
  'Lash Lifting': [
    'Lash Lifting',
    'Lash Bottox',
    'Tintura de Cílios',
    'Hidratação de Cílios'
  ],
  'Sobrancelhas': [
    'Design de Sobrancelhas',
    'Henna para Sobrancelhas',
    'Brow Lamination',
    'Coloração de Sobrancelhas'
  ],
  'Manutenção': [
    'Manutenção 15 dias',
    'Manutenção 21 dias',
    'Remoção de Cílios',
    'Avaliação Técnica'
  ],
  'Outros': [
    'Consultoria de Visagismo',
    'Combo Cílios + Sobrancelhas'
  ]
}

/**
 * Categorias de especialidades para Cabeleireiras
 */
export const CATEGORIAS_ESPECIALIDADES_CABELEIREIRA: Record<string, string[]> = {
  'Cortes': [
    'Corte Feminino',
    'Corte Long Bob',
    'Corte em Camadas',
    'Franja',
    'Corte Curto Feminino'
  ],
  'Coloração': [
    'Coloração Global',
    'Retoque de Raiz',
    'Mechas',
    'Morena Iluminada',
    'Tonalização'
  ],
  'Tratamentos': [
    'Hidratação',
    'Nutrição',
    'Reconstrução',
    'Botox Capilar',
    'Cauterização'
  ],
  'Escova e Finalização': [
    'Escova Modelada',
    'Escova Lisa',
    'Babyliss',
    'Prancha',
    'Finalização'
  ],
  'Química': [
    'Progressiva',
    'Selagem',
    'Relaxamento',
    'Permanente'
  ],
  'Outros': [
    'Penteados',
    'Penteado de Festa',
    'Dia da Noiva'
  ]
}

/**
 * Obtém as categorias de especialidades para um tipo de negócio
 * @param tipo - O tipo de negócio
 * @returns Objeto com categorias e suas especialidades
 */
export function obterCategoriasEspecialidades(tipo: TipoNegocio): Record<string, string[]> {
  const categoriasPorTipo: Record<TipoNegocio, Record<string, string[]>> = {
    barbearia: CATEGORIAS_ESPECIALIDADES_BARBEARIA,
    nail_designer: CATEGORIAS_ESPECIALIDADES_NAIL,
    lash_designer: CATEGORIAS_ESPECIALIDADES_LASH,
    cabeleireira: CATEGORIAS_ESPECIALIDADES_CABELEIREIRA
  }

  return categoriasPorTipo[tipo] ?? CATEGORIAS_ESPECIALIDADES_BARBEARIA
}

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
 * Categorias de serviços para Lash Designers
 */
const CATEGORIAS_LASH: CategoriaServico[] = [
  { id: 'extensao', nome: 'Extensão de Cílios', icone: 'Sparkles', ordem: 1 },
  { id: 'volume', nome: 'Volume', icone: 'Gem', ordem: 2 },
  { id: 'lifting', nome: 'Lash Lifting', icone: 'WandSparkles', ordem: 3 },
  { id: 'manutencao', nome: 'Manutenção', icone: 'RefreshCw', ordem: 4 },
  { id: 'sobrancelhas', nome: 'Sobrancelhas', icone: 'Eye', ordem: 5 },
  { id: 'outros', nome: 'Outros', icone: 'MoreHorizontal', ordem: 99 }
]

/**
 * Categorias de serviços para Cabeleireiras
 */
const CATEGORIAS_CABELEIREIRA: CategoriaServico[] = [
  { id: 'corte', nome: 'Corte', icone: 'Scissors', ordem: 1 },
  { id: 'escova', nome: 'Escova', icone: 'Wind', ordem: 2 },
  { id: 'coloracao', nome: 'Coloração', icone: 'Palette', ordem: 3 },
  { id: 'tratamento', nome: 'Tratamento', icone: 'Droplets', ordem: 4 },
  { id: 'penteado', nome: 'Penteado', icone: 'Sparkles', ordem: 5 },
  { id: 'quimica', nome: 'Química', icone: 'FlaskConical', ordem: 6 },
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
 * Configuração completa de terminologia para Lash Designers
 */
const TERMINOLOGIA_LASH: Terminologia = {
  tipo: 'lash_designer',
  nomeExibicao: 'Estúdio de Cílios',

  profissional: {
    singular: 'Lash Designer',
    plural: 'Lash Designers',
    artigo: 'a',
    artigoPlural: 'as'
  },

  estabelecimento: {
    singular: 'Estúdio',
    plural: 'Estúdios',
    artigo: 'o'
  },

  servicosExemplo: [
    'Fio a Fio',
    'Volume Brasileiro',
    'Lash Lifting',
    'Manutenção de Cílios',
    'Design de Sobrancelhas'
  ],

  categoriasServicos: CATEGORIAS_LASH,

  icone: 'Sparkles',

  cores: {
    primaria: '#1f1a1f',
    secundaria: '#faf5ff',
    destaque: '#e879f9'
  },

  textos: {
    bemVindo: 'Bem-vinda ao',
    selecioneProfissional: 'Escolha a Profissional',
    selecioneServico: 'Escolha o Serviço',
    agendamentoConfirmado: 'Agendamento Confirmado',
    semProfissionais: 'Nenhuma lash designer cadastrada'
  }
}

/**
 * Configuração completa de terminologia para Cabeleireiras
 */
const TERMINOLOGIA_CABELEIREIRA: Terminologia = {
  tipo: 'cabeleireira',
  nomeExibicao: 'Salão de Beleza',

  profissional: {
    singular: 'Cabeleireira',
    plural: 'Cabeleireiras',
    artigo: 'a',
    artigoPlural: 'as'
  },

  estabelecimento: {
    singular: 'Salão',
    plural: 'Salões',
    artigo: 'o'
  },

  servicosExemplo: [
    'Corte Feminino',
    'Escova',
    'Hidratação',
    'Coloração',
    'Penteado'
  ],

  categoriasServicos: CATEGORIAS_CABELEIREIRA,

  icone: 'Sparkles',

  cores: {
    primaria: '#2a1f1f',
    secundaria: '#fff7ed',
    destaque: '#fb7185'
  },

  textos: {
    bemVindo: 'Bem-vinda ao',
    selecioneProfissional: 'Escolha a Profissional',
    selecioneServico: 'Escolha o Serviço',
    agendamentoConfirmado: 'Agendamento Confirmado',
    semProfissionais: 'Nenhuma cabeleireira cadastrada'
  }
}

/**
 * Mapa de configurações por tipo de negócio
 */
const CONFIGURACOES: Record<TipoNegocio, Terminologia> = {
  barbearia: TERMINOLOGIA_BARBEARIA,
  nail_designer: TERMINOLOGIA_NAIL,
  lash_designer: TERMINOLOGIA_LASH,
  cabeleireira: TERMINOLOGIA_CABELEIREIRA
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
  const especialidadesPorTipo: Record<TipoNegocio, string[]> = {
    barbearia: ESPECIALIDADES_BARBEARIA,
    nail_designer: ESPECIALIDADES_NAIL,
    lash_designer: ESPECIALIDADES_LASH,
    cabeleireira: ESPECIALIDADES_CABELEIREIRA
  }

  return especialidadesPorTipo[tipo] ?? ESPECIALIDADES_BARBEARIA
}

/**
 * Obtém o emoji principal para um tipo de negócio
 * Usado em notificações WhatsApp e mensagens
 * 
 * @param tipo - O tipo de negócio
 * @returns Emoji representativo
 */
export function obterEmojiPrincipal(tipo: TipoNegocio): string {
  if (tipo === 'barbearia') return '✂️'
  if (tipo === 'lash_designer') return '✨'
  if (tipo === 'cabeleireira') return '💇‍♀️'
  return '💅'
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
  const iconeServico = ehTipoNegocioFeminino(tipo) ? emoji : '✂️'
  
  return {
    emoji,
    profissional: terminologia.profissional.singular,
    profissionalPlural: terminologia.profissional.plural,
    estabelecimento: terminologia.estabelecimento.singular,
    iconeServico,
    ...terminologia.textos
  }
}

/**
 * Exporta todas as configurações para uso externo
 */
export {
  CATEGORIAS_BARBEARIA,
  CATEGORIAS_NAIL,
  CATEGORIAS_LASH,
  CATEGORIAS_CABELEIREIRA,
  ESPECIALIDADES_BARBEARIA,
  ESPECIALIDADES_NAIL,
  ESPECIALIDADES_LASH,
  ESPECIALIDADES_CABELEIREIRA,
  TERMINOLOGIA_BARBEARIA,
  TERMINOLOGIA_NAIL,
  TERMINOLOGIA_LASH,
  TERMINOLOGIA_CABELEIREIRA,
  CONFIGURACOES
}
