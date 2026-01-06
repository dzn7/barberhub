/**
 * Tipos para o painel Super Admin
 */

export interface Tenant {
  id: string
  slug: string
  nome: string
  email: string
  telefone: string | null
  whatsapp: string | null
  logo_url: string | null
  plano: 'trial' | 'basico' | 'profissional' | 'enterprise'
  ativo: boolean
  suspenso: boolean
  trial_inicio: string | null
  trial_fim: string | null
  criado_em: string
  atualizado_em: string
  // Estatísticas calculadas
  total_barbeiros: number
  total_servicos: number
  total_agendamentos: number
  total_clientes: number
  receita_total: number
}

export interface EstatisticasGerais {
  totalTenants: number
  tenantsAtivos: number
  emTrial: number
  trialExpirado: number
  planosPagos: number
  totalAgendamentos: number
  totalClientes: number
  totalBarbeiros: number
  totalServicos: number
  receitaTotal: number
  agendamentosHoje: number
  agendamentosSemana: number
}

export interface UsuarioAuth {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  raw_user_meta_data: any
  tenant_nome?: string
  tenant_id?: string
}

export interface StatusBot {
  online: boolean
  ultimaVerificacao: Date | null
  erro: string | null
}

export interface MetricasSupabase {
  database: {
    usado_mb: number
    limite_mb: number
    percentual: number
  }
  auth: {
    usuarios: number
    limite: number
    percentual: number
  }
  tabelas: {
    tenants: number
    agendamentos: number
    clientes: number
    barbeiros: number
    servicos: number
    trabalhos: number
    transacoes: number
    comentarios: number
    total_registros: number
  }
}

export interface MetricasR2 {
  total_objetos: number
  tamanho_total_bytes: number
  tamanho_total_mb: number
  limite_gb: number
  percentual: number
}

export interface MetricasFly {
  online: boolean
  app_name: string
  region: string
  vm_size: string
  memory_mb: number
  status: string
  erro: string | null
}

export interface BackupInfo {
  id: string
  tipo: 'completo' | 'parcial'
  tabelas: string[]
  tamanho_bytes: number
  criado_em: string
  status: 'concluido' | 'em_andamento' | 'erro'
}

export type AbaAtiva = 'visao-geral' | 'barbearias' | 'usuarios' | 'relatorios' | 'infraestrutura' | 'backup'

export interface PlanoConfig {
  nome: string
  cor: string
  bg: string
  limite_profissionais: number
  limite_servicos: number
  limite_agendamentos: number
  preco: number
}

export const PLANOS_CONFIG: Record<string, PlanoConfig> = {
  trial: {
    nome: 'Trial',
    cor: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    limite_profissionais: 999,
    limite_servicos: 999,
    limite_agendamentos: 999999,
    preco: 0
  },
  basico: {
    nome: 'Básico',
    cor: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    limite_profissionais: 999,
    limite_servicos: 999,
    limite_agendamentos: 999999,
    preco: 39.90
  },
  profissional: {
    nome: 'Profissional',
    cor: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    limite_profissionais: 999,
    limite_servicos: 999,
    limite_agendamentos: 999999,
    preco: 39.90
  },
  enterprise: {
    nome: 'Enterprise',
    cor: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    limite_profissionais: 999,
    limite_servicos: 999,
    limite_agendamentos: 999999,
    preco: 39.90
  }
}
