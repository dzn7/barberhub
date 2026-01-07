/**
 * Configurações globais do aplicativo
 */

export const CONFIG = {
  // Nome do aplicativo
  nome: 'BarberHub',
  versao: '1.0.0',

  // URLs da API
  api: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    botUrl: 'https://bot-barberhub.fly.dev',
  },

  // Cloudflare R2
  storage: {
    r2PublicUrl: process.env.EXPO_PUBLIC_R2_PUBLIC_URL || '',
    r2Bucket: 'barberhub-uploads',
  },

  // Mercado Pago
  mercadoPago: {
    publicKey: process.env.EXPO_PUBLIC_MP_PUBLIC_KEY || '',
  },

  // Configurações de UI
  ui: {
    animacaoDuracao: 300,
    toastDuracao: 3000,
    debounceDelay: 500,
  },

  // Limites
  limites: {
    tamanhoMaximoImagem: 5 * 1024 * 1024, // 5MB
    quantidadeMaximaServicos: 50,
    quantidadeMaximaBarbeiros: 20,
  },
} as const;

/**
 * Configurações de paginação
 */
export const PAGINACAO = {
  itensPorPagina: 20,
  itensPorPaginaAgendamentos: 50,
} as const;

/**
 * Timeouts em milissegundos
 */
export const TIMEOUTS = {
  requisicaoApi: 30000,
  atualizacaoPresenca: 5000,
  verificacaoConexao: 10000,
} as const;
