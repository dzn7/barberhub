/**
 * Tipos e enums relacionados aos tipos de negócio suportados pelo sistema
 * 
 * O sistema suporta múltiplos tipos de negócios de beleza:
 * - Barbearias
 * - Estúdios de Nail Designer
 * - (Futuramente: Salões de beleza, etc.)
 */

/**
 * Tipos de negócio suportados pelo sistema
 */
export type TipoNegocio = 'barbearia' | 'nail_designer'

/**
 * Interface para terminologia específica de cada tipo de negócio
 */
export interface Terminologia {
  // Identificação do tipo
  tipo: TipoNegocio
  
  // Nome do tipo para exibição
  nomeExibicao: string
  
  // Termos para o profissional
  profissional: {
    singular: string
    plural: string
    artigo: string // "o" ou "a"
    artigoPlural: string // "os" ou "as"
  }
  
  // Termos para o estabelecimento
  estabelecimento: {
    singular: string
    plural: string
    artigo: string
  }
  
  // Exemplos de serviços típicos
  servicosExemplo: string[]
  
  // Categorias padrão de serviços
  categoriasServicos: CategoriaServico[]
  
  // Ícone principal (nome do ícone Lucide)
  icone: string
  
  // Cores sugeridas
  cores: {
    primaria: string
    secundaria: string
    destaque: string
  }
  
  // Textos para o sistema
  textos: {
    bemVindo: string
    selecioneProfissional: string
    selecioneServico: string
    agendamentoConfirmado: string
    semProfissionais: string
  }
}

/**
 * Interface para categoria de serviço
 */
export interface CategoriaServico {
  id: string
  nome: string
  icone: string
  ordem: number
}

/**
 * Verifica se um valor é um tipo de negócio válido
 */
export function ehTipoNegocioValido(valor: string): valor is TipoNegocio {
  return valor === 'barbearia' || valor === 'nail_designer'
}

/**
 * Retorna o tipo de negócio padrão
 */
export function tipoNegocioPadrao(): TipoNegocio {
  return 'barbearia'
}

/**
 * Lista de todos os tipos de negócio disponíveis
 */
export const TIPOS_NEGOCIO_DISPONIVEIS: TipoNegocio[] = [
  'barbearia',
  'nail_designer'
]

/**
 * Informações básicas sobre cada tipo para seleção
 */
export interface OpcaoTipoNegocio {
  tipo: TipoNegocio
  titulo: string
  descricao: string
  imagem: string
  cor: string
}

export const OPCOES_TIPO_NEGOCIO: OpcaoTipoNegocio[] = [
  {
    tipo: 'barbearia',
    titulo: 'Barbearia',
    descricao: 'Cortes de cabelo, barba, tratamentos masculinos',
    imagem: '/barber.png',
    cor: '#18181b'
  },
  {
    tipo: 'nail_designer',
    titulo: 'Nail Designer',
    descricao: 'Unhas em gel, alongamentos, nail art, manicure',
    imagem: '/naildesign.png',
    cor: '#ec4899'
  }
]
