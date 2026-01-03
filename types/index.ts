/**
 * Tipos TypeScript para a aplicação
 * Sistema completo de gestão para barbearia
 */

export interface Barbeiro {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  especialidades: string[];
  fotoUrl: string | null;
  ativo: boolean;
  dataCadastro: Date;
  comissaoPercentual?: number;
  totalAtendimentos?: number;
  avaliacaoMedia?: number;
}

/**
 * Representa um serviço oferecido pela barbearia
 */
export interface Servico {
  id: string;
  nome: string;
  descricao: string;
  duracao: number; // em minutos
  preco: number;
  ativo: boolean;
  categoria?: string;
  ordemExibicao?: number;
}

/**
 * Status possíveis de um agendamento
 */
export type StatusAgendamento = 
  | "pendente" 
  | "confirmado" 
  | "concluido" 
  | "cancelado" 
  | "nao_compareceu";

/**
 * Representa um agendamento
 */
export interface Agendamento {
  id: string;
  clienteId: string;
  barbeiroId: string;
  servicoId: string;
  dataHora: Date;
  status: StatusAgendamento;
  observacoes?: string;
  valorPago?: number;
  formaPagamento?: string;
  avaliacao?: number;
  comentarioAvaliacao?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Representa um cliente
 */
export interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  dataCadastro: Date;
  ativo: boolean;
  observacoes?: string;
  totalAgendamentos?: number;
  ultimaVisita?: Date;
}

/**
 * Horários disponíveis dos barbeiros
 */
export interface HorarioDisponivel {
  id: string;
  barbeiroId: string;
  diaSemana: number; // 0-6 (Domingo-Sábado)
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
}

// ============================================
// SISTEMA FINANCEIRO
// ============================================

/**
 * Tipos de transação financeira
 */
export type TipoTransacao = "receita" | "despesa";

/**
 * Categorias de despesas
 */
export type CategoriaDespesa = 
  | "luz"
  | "agua"
  | "aluguel"
  | "internet"
  | "marketing"
  | "produtos"
  | "manutencao"
  | "salarios"
  | "impostos"
  | "outros";

/**
 * Formas de pagamento
 */
export type FormaPagamento = 
  | "dinheiro"
  | "pix"
  | "debito"
  | "credito"
  | "transferencia";

/**
 * Representa uma transação financeira
 */
export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  categoria: CategoriaDespesa | "servico";
  descricao: string;
  valor: number;
  data: Date;
  formaPagamento?: FormaPagamento;
  agendamentoId?: string;
  barbeiroId?: string;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Representa um atendimento presencial (walk-in)
 */
export interface AtendimentoPresencial {
  id: string;
  clienteNome: string;
  clienteTelefone?: string;
  barbeiroId: string;
  servicoId: string;
  valor: number;
  formaPagamento: FormaPagamento;
  data: Date;
  observacoes?: string;
  criadoEm: Date;
}

// ============================================
// ESTOQUE E PRODUTOS
// ============================================

/**
 * Representa um produto do estoque
 */
export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  quantidadeEstoque: number;
  quantidadeMinima: number;
  precoCompra: number;
  precoVenda: number;
  fornecedor?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

/**
 * Representa uma movimentação de estoque
 */
export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  motivo: string;
  valorUnitario?: number;
  data: Date;
  usuarioId?: string;
  criadoEm: Date;
}

// ============================================
// COMISSÕES
// ============================================

/**
 * Representa uma comissão de barbeiro
 */
export interface Comissao {
  id: string;
  barbeiroId: string;
  agendamentoId?: string;
  atendimentoPresencialId?: string;
  valorServico: number;
  percentualComissao: number;
  valorComissao: number;
  dataPagamento?: Date;
  pago: boolean;
  mes: number;
  ano: number;
  criadoEm: Date;
}

// ============================================
// MÉTRICAS E RELATÓRIOS
// ============================================

/**
 * Métricas do dashboard
 */
export interface MetricasDashboard {
  receitaTotal: number;
  despesaTotal: number;
  lucroLiquido: number;
  totalAtendimentos: number;
  ticketMedio: number;
  crescimentoMensal: number;
  atendimentosPorBarbeiro: { barbeiroId: string; nome: string; total: number }[];
  receitaPorDia: { data: string; valor: number }[];
  despesasPorCategoria: { categoria: string; valor: number }[];
  formasPagamento: { forma: string; valor: number; quantidade: number }[];
}

/**
 * Filtros para relatórios
 */
export interface FiltrosRelatorio {
  dataInicio: Date;
  dataFim: Date;
  barbeiroId?: string;
  categoria?: string;
  formaPagamento?: FormaPagamento;
}

/**
 * Relatório financeiro detalhado
 */
export interface RelatorioFinanceiro {
  periodo: { inicio: Date; fim: Date };
  receitas: {
    total: number;
    agendamentos: number;
    atendimentosPresenciais: number;
    porFormaPagamento: { forma: FormaPagamento; valor: number }[];
  };
  despesas: {
    total: number;
    porCategoria: { categoria: CategoriaDespesa; valor: number }[];
  };
  lucro: {
    bruto: number;
    liquido: number;
    margem: number;
  };
  comissoes: {
    total: number;
    pagas: number;
    pendentes: number;
  };
}

// ============================================
// CONFIGURAÇÕES
// ============================================

/**
 * Configurações do tema
 */
export interface ConfiguracaoTema {
  modo: "light" | "dark";
  corPrimaria: string;
  corSecundaria: string;
}
