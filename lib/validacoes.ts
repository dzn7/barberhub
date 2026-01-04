/**
 * Schemas de validação Zod para formulários do BarberHub
 * Centraliza todas as validações para consistência e reutilização
 */

import { z } from 'zod';

// Mensagens de erro em português
const MENSAGENS = {
  campoObrigatorio: 'Este campo é obrigatório',
  emailInvalido: 'E-mail inválido',
  telefoneInvalido: 'Telefone inválido. Use o formato (00) 00000-0000',
  senhaMinima: 'A senha deve ter no mínimo 6 caracteres',
  senhasNaoCoincidem: 'As senhas não coincidem',
  slugInvalido: 'Use apenas letras minúsculas, números e hífens',
  slugMinimo: 'O endereço deve ter no mínimo 3 caracteres',
  nomeMinimo: 'O nome deve ter no mínimo 2 caracteres',
  valorMinimo: 'O valor deve ser maior que zero',
  duracaoMinima: 'A duração deve ser de pelo menos 5 minutos',
  porcentagemInvalida: 'A porcentagem deve ser entre 0 e 100',
};

// Regex para validações
const REGEX = {
  telefone: /^\(\d{2}\)\s?\d{4,5}-?\d{4}$|^\d{10,11}$/,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
};

// Helpers de validação
export const validarTelefone = (telefone: string): boolean => {
  const apenasNumeros = telefone.replace(/\D/g, '');
  return apenasNumeros.length >= 10 && apenasNumeros.length <= 11;
};

export const formatarTelefone = (valor: string): string => {
  const numeros = valor.replace(/\D/g, '');
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
};

// Schema base para campos comuns
const campoTextoObrigatorio = z.string().min(1, MENSAGENS.campoObrigatorio);
const campoEmail = z.string().email(MENSAGENS.emailInvalido);
const campoTelefone = z.string().refine(validarTelefone, MENSAGENS.telefoneInvalido);

// ============================================
// SCHEMAS DE AUTENTICAÇÃO
// ============================================

export const schemaLogin = z.object({
  email: campoEmail,
  senha: z.string().min(6, MENSAGENS.senhaMinima),
});

export const schemaCriarConta = z.object({
  nome_barbearia: z.string().min(2, MENSAGENS.nomeMinimo),
  slug: z.string()
    .min(3, MENSAGENS.slugMinimo)
    .regex(REGEX.slug, MENSAGENS.slugInvalido),
  nome_proprietario: z.string().min(2, MENSAGENS.nomeMinimo),
  email: campoEmail,
  telefone: campoTelefone,
  senha: z.string().min(6, MENSAGENS.senhaMinima),
  confirmar_senha: z.string().min(6, MENSAGENS.senhaMinima),
}).refine((data) => data.senha === data.confirmar_senha, {
  message: MENSAGENS.senhasNaoCoincidem,
  path: ['confirmar_senha'],
});

// ============================================
// SCHEMAS DE AGENDAMENTO
// ============================================

export const schemaNovoAgendamento = z.object({
  clienteNome: z.string().min(2, MENSAGENS.nomeMinimo),
  clienteTelefone: campoTelefone,
  data: z.string().min(1, MENSAGENS.campoObrigatorio),
  hora: z.string().min(1, MENSAGENS.campoObrigatorio),
  barbeiroId: z.string().min(1, 'Selecione um barbeiro'),
  servicoId: z.string().min(1, 'Selecione um serviço'),
});

export const schemaAgendamentoCliente = z.object({
  nome: z.string().min(2, MENSAGENS.nomeMinimo),
  telefone: campoTelefone,
  observacoes: z.string().optional(),
});

// ============================================
// SCHEMAS DE SERVIÇOS
// ============================================

export const schemaServico = z.object({
  nome: z.string().min(2, MENSAGENS.nomeMinimo),
  descricao: z.string().optional(),
  preco: z.number().min(0.01, MENSAGENS.valorMinimo),
  duracao: z.number().min(5, MENSAGENS.duracaoMinima),
  categoria: z.string().min(1, MENSAGENS.campoObrigatorio),
});

// ============================================
// SCHEMAS DE BARBEIROS
// ============================================

export const schemaBarbeiro = z.object({
  nome: z.string().min(2, MENSAGENS.nomeMinimo),
  telefone: campoTelefone,
  email: z.string().email(MENSAGENS.emailInvalido).optional().or(z.literal('')),
  comissao_percentual: z.number().min(0).max(100, MENSAGENS.porcentagemInvalida),
  especialidades: z.array(z.string()).optional(),
});

// ============================================
// SCHEMAS DE CONFIGURAÇÕES
// ============================================

export const schemaConfiguracaoBarbearia = z.object({
  nome: z.string().min(2, MENSAGENS.nomeMinimo),
  telefone: campoTelefone.optional().or(z.literal('')),
  whatsapp: campoTelefone.optional().or(z.literal('')),
  email: campoEmail.optional().or(z.literal('')),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  instagram: z.string().optional(),
});

export const schemaHorarioFuncionamento = z.object({
  horario_abertura: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  horario_fechamento: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  intervalo_almoco_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido').nullable(),
  intervalo_almoco_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido').nullable(),
  dias_funcionamento: z.array(z.string()).min(1, 'Selecione pelo menos um dia'),
});

// ============================================
// SCHEMAS DE ESTOQUE/PRODUTOS
// ============================================

export const schemaProduto = z.object({
  nome: z.string().min(2, MENSAGENS.nomeMinimo),
  descricao: z.string().optional(),
  preco_custo: z.number().min(0, 'Preço de custo inválido'),
  preco_venda: z.number().min(0, 'Preço de venda inválido'),
  quantidade: z.number().min(0, 'Quantidade inválida'),
  quantidade_minima: z.number().min(0, 'Quantidade mínima inválida'),
  categoria: z.string().optional(),
});

// ============================================
// SCHEMAS DE BLOQUEIOS
// ============================================

export const schemaBloqueioHorario = z.object({
  data: z.string().min(1, MENSAGENS.campoObrigatorio),
  horario_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido'),
  horario_fim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido'),
  barbeiro_id: z.string().optional(),
  motivo: z.string().optional(),
});

// ============================================
// TIPOS INFERIDOS DOS SCHEMAS
// ============================================

export type LoginForm = z.infer<typeof schemaLogin>;
export type CriarContaForm = z.infer<typeof schemaCriarConta>;
export type NovoAgendamentoForm = z.infer<typeof schemaNovoAgendamento>;
export type AgendamentoClienteForm = z.infer<typeof schemaAgendamentoCliente>;
export type ServicoForm = z.infer<typeof schemaServico>;
export type BarbeiroForm = z.infer<typeof schemaBarbeiro>;
export type ConfiguracaoBarbeariaForm = z.infer<typeof schemaConfiguracaoBarbearia>;
export type HorarioFuncionamentoForm = z.infer<typeof schemaHorarioFuncionamento>;
export type ProdutoForm = z.infer<typeof schemaProduto>;
export type BloqueioHorarioForm = z.infer<typeof schemaBloqueioHorario>;

// ============================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================

/**
 * Valida um formulário e retorna os erros formatados
 */
export function validarFormulario<T>(
  schema: z.ZodSchema<T>,
  dados: unknown
): { sucesso: true; dados: T } | { sucesso: false; erros: Record<string, string> } {
  const resultado = schema.safeParse(dados);
  
  if (resultado.success) {
    return { sucesso: true, dados: resultado.data };
  }
  
  const erros: Record<string, string> = {};
  resultado.error.errors.forEach((erro) => {
    const campo = erro.path.join('.');
    if (!erros[campo]) {
      erros[campo] = erro.message;
    }
  });
  
  return { sucesso: false, erros };
}

/**
 * Hook helper para obter a primeira mensagem de erro de um campo
 */
export function obterErro(
  erros: Record<string, string> | undefined,
  campo: string
): string | undefined {
  return erros?.[campo];
}
