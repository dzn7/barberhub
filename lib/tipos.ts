/**
 * Tipos do sistema BarberHub
 * Definições de tipos para multi-tenancy
 */

export interface Tenant {
  id: string
  slug: string
  nome: string
  email: string
  telefone: string | null
  whatsapp: string | null
  endereco: string | null
  cidade: string | null
  estado: string | null
  logo_url: string | null
  cor_primaria: string | null
  cor_secundaria: string | null
  cor_destaque: string | null
  instagram: string | null
  facebook: string | null
  ativo: boolean
  plano: string
  trial_fim: string | null
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
  role: string
  criado_em: string
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
  data_cadastro: string
  comissao_percentual: number
  total_atendimentos: number
  avaliacao_media: number
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
  criado_em: string
}

export interface Cliente {
  id: string
  tenant_id: string
  nome: string
  email: string | null
  telefone: string
  user_id: string | null
  criado_em: string
}

export interface Agendamento {
  id: string
  tenant_id: string
  cliente_id: string
  barbeiro_id: string
  servico_id: string
  data_hora: string
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
  observacoes: string | null
  criado_em: string
  atualizado_em: string
  clientes?: Cliente
  barbeiros?: Barbeiro
  servicos?: Servico
}

export interface ConfiguracaoBarbearia {
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
  usar_horarios_personalizados: boolean
  horarios_personalizados: HorariosPersonalizados | null
}

export interface HorarioDia {
  abertura: string
  fechamento: string
  almoco_inicio: string | null
  almoco_fim: string | null
}

export interface HorariosPersonalizados {
  seg?: HorarioDia
  ter?: HorarioDia
  qua?: HorarioDia
  qui?: HorarioDia
  sex?: HorarioDia
  sab?: HorarioDia
  dom?: HorarioDia
}

export interface HorarioBloqueado {
  id: string
  tenant_id: string
  barbeiro_id: string | null
  data: string
  horario_inicio: string
  horario_fim: string
  motivo: string | null
}

export interface Transacao {
  id: string
  tenant_id: string
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  data: string
  forma_pagamento: string | null
  agendamento_id: string | null
  barbeiro_id: string | null
  observacoes: string | null
}
