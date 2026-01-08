/**
 * Sistema de cores do BarberHub
 * Paleta baseada em Zinc (igual ao site web)
 * Suporta modo claro e escuro
 */

// Cores base Zinc (igual Tailwind)
const zinc = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
};

// Cores de destaque
const emerald = {
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
};

const pink = {
  400: '#f472b6',
  500: '#ec4899',
  600: '#db2777',
};

/**
 * Tema Escuro (padrão)
 */
export const CORES_ESCURO = {
  // Fundos
  fundo: {
    primario: zinc[950],
    secundario: zinc[900],
    terciario: zinc[800],
    card: zinc[900],
    cardHover: zinc[800],
  },

  // Textos
  texto: {
    primario: '#ffffff',
    secundario: zinc[400],
    terciario: zinc[500],
    invertido: zinc[900],
  },

  // Bordas
  borda: {
    sutil: zinc[800],
    media: zinc[700],
    forte: zinc[600],
  },

  // Botão primário
  botao: {
    fundo: '#ffffff',
    texto: zinc[900],
    fundoHover: zinc[200],
  },
};

/**
 * Tema Claro
 * Fundo zinc-50, cards brancos para melhor contraste
 */
export const CORES_CLARO = {
  // Fundos
  fundo: {
    primario: zinc[50],      // Fundo geral levemente cinza
    secundario: '#ffffff',   // Cards e superfícies elevadas
    terciario: zinc[100],    // Áreas de destaque sutil
    card: '#ffffff',         // Cards brancos
    cardHover: zinc[50],
  },

  // Textos
  texto: {
    primario: zinc[900],     // Texto principal escuro
    secundario: zinc[600],   // Texto secundário mais legível
    terciario: zinc[500],    // Texto terciário
    invertido: '#ffffff',    // Texto sobre fundos escuros
  },

  // Bordas
  borda: {
    sutil: zinc[200],
    media: zinc[300],
    forte: zinc[400],
  },

  // Botão primário
  botao: {
    fundo: zinc[900],
    texto: '#ffffff',
    fundoHover: zinc[800],
  },
};

/**
 * Cores compartilhadas (independentes do tema)
 */
export const CORES_COMPARTILHADAS = {
  // Estados
  sucesso: emerald[500],
  sucessoClaro: emerald[400],
  erro: '#ef4444',
  aviso: '#f59e0b',
  info: '#3b82f6',

  // Cores de marca
  barbearia: zinc[900],
  nailDesigner: pink[500],

  // Transparências
  transparente: {
    branco10: 'rgba(255, 255, 255, 0.1)',
    branco20: 'rgba(255, 255, 255, 0.2)',
    branco50: 'rgba(255, 255, 255, 0.5)',
    preto10: 'rgba(0, 0, 0, 0.1)',
    preto50: 'rgba(0, 0, 0, 0.5)',
    preto70: 'rgba(0, 0, 0, 0.7)',
  },

  // Zinc puro para uso direto
  zinc,
};

/**
 * Hook helper para obter cores baseado no tema
 * Por enquanto usa tema escuro como padrão
 */
export const CORES = {
  ...CORES_ESCURO,
  ...CORES_COMPARTILHADAS,
  
  // Aliases para compatibilidade
  primaria: {
    DEFAULT: '#ffffff',
  },
  secundaria: {
    DEFAULT: zinc[800],
  },
  destaque: {
    DEFAULT: zinc[800],
  },
};

export type TemaType = 'claro' | 'escuro';

/**
 * Retorna as cores baseado no tema
 */
export function obterCores(tema: TemaType = 'escuro') {
  const coresTema = tema === 'claro' ? CORES_CLARO : CORES_ESCURO;
  return {
    ...coresTema,
    ...CORES_COMPARTILHADAS,
    // Aliases para compatibilidade
    primaria: {
      DEFAULT: tema === 'escuro' ? '#ffffff' : zinc[900],
    },
    secundaria: {
      DEFAULT: zinc[800],
    },
    destaque: {
      DEFAULT: zinc[800],
    },
  };
}
