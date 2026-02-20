// Tipos para o sistema SaaS BarberHub

export type PlanoAssinatura = 'trial' | 'basico' | 'profissional' | 'enterprise'
export type StatusAssinatura = 'ativa' | 'pendente' | 'cancelada' | 'expirada' | 'suspensa'
export type RoleUsuario = 'super_admin' | 'owner' | 'admin' | 'manager' | 'operator'
export type TipoNegocio =
  | 'barbearia'
  | 'nail_designer'
  | 'lash_designer'
  | 'cabeleireira'

export interface Tenant {
  id: string
  slug: string
  nome: string
  tipo_negocio: TipoNegocio
  logo_url: string | null
  icone_pwa_192: string | null
  icone_pwa_512: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_destaque: string
  cor_texto?: string | null
  fonte_principal?: string | null
  fonte_titulos?: string | null
  telefone: string | null
  whatsapp: string | null
  email: string
  endereco: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  latitude: number | null
  longitude: number | null
  instagram: string | null
  facebook: string | null
  plano: PlanoAssinatura
  trial_inicio: string
  trial_fim: string
  ativo: boolean
  suspenso: boolean
  motivo_suspensao: string | null
  limite_profissionais: number
  limite_servicos: number
  limite_agendamentos_mes: number
  criado_em: string
  atualizado_em: string
}

export interface Proprietario {
  id: string
  user_id: string
  tenant_id: string
  nome: string
  email: string
  telefone: string | null
  role: RoleUsuario
  ativo: boolean
  criado_em: string
  tenant?: Tenant
}

export interface Barbeiro {
  id: string
  tenant_id: string
  nome: string
  email: string
  telefone: string
  especialidades: string[]
  foto_url: string | null
  ativo: boolean
  comissao_percentual: number
}

export interface Servico {
  id: string
  tenant_id: string
  nome: string
  descricao: string | null
  duracao: number
  preco: number
  ativo: boolean
  categoria: string
  ordem_exibicao: number
}

export interface ConfiguracoesBarbearia {
  id: string
  tenant_id: string
  aberta: boolean
  mensagem_fechamento: string | null
  horario_abertura: string
  horario_fechamento: string
  dias_funcionamento: string[]
  intervalo_almoco_inicio: string | null
  intervalo_almoco_fim: string | null
  intervalo_horarios: number
}

// Formulários
export interface FormCriarConta {
  nome_barbearia: string
  slug: string
  nome_proprietario: string
  email: string
  telefone: string
  senha: string
  confirmar_senha: string
}

export interface FormLogin {
  email: string
  senha: string
}

export interface FormPersonalizacao {
  nome: string
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  cor_destaque: string
  telefone: string
  whatsapp: string
  endereco: string
  cidade: string
  estado: string
  instagram: string
  facebook: string
}
