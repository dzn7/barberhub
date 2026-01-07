/**
 * Tipos principais do aplicativo BarberHub
 */

// ========================================
// Tipos de Tenant (Barbearia)
// ========================================

export interface Tenant {
  id: string;
  slug: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  logo_url: string | null;
  banner_url: string | null;
  descricao: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_destaque: string | null;
  cor_texto: string | null;
  fonte: string | null;
  tipo_negocio: TipoNegocio;
  horario_abertura: string | null;
  horario_fechamento: string | null;
  dias_funcionamento: number[] | null;
  intervalo_horarios: number;
  ativo: boolean;
  teste_ativo: boolean;
  data_fim_teste: string | null;
  plano: PlanoTenant;
  data_cadastro: string;
}

export type TipoNegocio = 'barbearia' | 'salao' | 'nail_designer' | 'estetica' | 'outro';
export type PlanoTenant = 'gratuito' | 'basico' | 'profissional' | 'enterprise';

// ========================================
// Tipos de Barbeiro/Profissional
// ========================================

export interface Barbeiro {
  id: string;
  tenant_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  especialidades: string[];
  foto_url: string | null;
  ativo: boolean;
  comissao_percentual: number;
  total_atendimentos: number;
  avaliacao_media: number;
  token_acesso: string | null;
  token_ativo: boolean;
  is_proprietario: boolean;
  ultimo_acesso: string | null;
  data_cadastro: string;
}

// ========================================
// Tipos de Serviço
// ========================================

export interface Servico {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  duracao: number;
  preco: number;
  preco_anterior: number | null;
  ativo: boolean;
  categoria: string;
  ordem_exibicao: number;
  criado_em: string;
}

// ========================================
// Tipos de Cliente
// ========================================

export interface Cliente {
  id: string;
  tenant_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  ativo: boolean;
  total_agendamentos: number;
  ultimo_agendamento: string | null;
  data_cadastro: string;
}

// ========================================
// Tipos de Agendamento
// ========================================

export interface Agendamento {
  id: string;
  tenant_id: string;
  cliente_id: string;
  barbeiro_id: string;
  servico_id: string;
  servicos_ids: string[] | null;
  data_hora: string;
  status: StatusAgendamento;
  observacoes: string | null;
  valor_total: number | null;
  forma_pagamento: FormaPagamento | null;
  criado_em: string;
  // Relacionamentos
  clientes?: Cliente;
  barbeiros?: Barbeiro;
  servicos?: Servico;
}

export type StatusAgendamento = 
  | 'pendente' 
  | 'confirmado' 
  | 'em_atendimento' 
  | 'concluido' 
  | 'cancelado' 
  | 'nao_compareceu';

export type FormaPagamento = 
  | 'dinheiro' 
  | 'pix' 
  | 'debito' 
  | 'credito' 
  | 'transferencia';

// ========================================
// Tipos de Transação Financeira
// ========================================

export interface Transacao {
  id: string;
  tenant_id: string;
  tipo: TipoTransacao;
  categoria: CategoriaTransacao;
  descricao: string;
  valor: number;
  data: string;
  forma_pagamento: FormaPagamento | null;
  agendamento_id: string | null;
  barbeiro_id: string | null;
  observacoes: string | null;
  criado_em: string;
}

export type TipoTransacao = 'receita' | 'despesa';
export type CategoriaTransacao = 
  | 'luz' 
  | 'agua' 
  | 'aluguel' 
  | 'internet' 
  | 'marketing' 
  | 'produtos' 
  | 'manutencao' 
  | 'salarios' 
  | 'impostos' 
  | 'outros' 
  | 'servico';

// ========================================
// Tipos de Autenticação
// ========================================

export interface UsuarioAutenticado {
  id: string;
  email: string;
  nome: string;
  tenant_id: string;
  tipo: TipoUsuario;
  barbeiro_id?: string;
  is_proprietario?: boolean;
}

export type TipoUsuario = 'proprietario' | 'barbeiro' | 'admin';

export interface DadosLogin {
  email?: string;
  token?: string;
  senha?: string;
}

export interface ResultadoLogin {
  sucesso: boolean;
  usuario?: UsuarioAutenticado;
  tenant?: Tenant;
  erro?: string;
}

// ========================================
// Tipos de Navegação
// ========================================

export type RotasAutenticacao = 
  | '/' 
  | '/login' 
  | '/registro' 
  | '/esqueci-senha';

export type RotasAdmin = 
  | '/(admin)' 
  | '/(admin)/dashboard' 
  | '/(admin)/agendamentos' 
  | '/(admin)/servicos' 
  | '/(admin)/barbeiros' 
  | '/(admin)/clientes' 
  | '/(admin)/financeiro' 
  | '/(admin)/configuracoes';

// ========================================
// Tipos de Componentes
// ========================================

export type VarianteBotao = 'primario' | 'secundario' | 'outline' | 'ghost' | 'perigo';
export type TamanhoBotao = 'sm' | 'md' | 'lg';

export interface PropsIcone {
  tamanho?: number;
  cor?: string;
}
