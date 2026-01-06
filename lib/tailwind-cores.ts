/**
 * Utilitário de Cores Tailwind
 * 
 * Resolve o problema de classes dinâmicas que não são compiladas pelo Tailwind purge.
 * Em vez de usar template strings como `bg-${cor}-100`, use este mapeamento.
 * 
 * @example
 * // Antes (não funciona em produção):
 * className={`bg-${cor}-100`}
 * 
 * // Depois (funciona corretamente):
 * className={CORES_TAILWIND[cor].bg100}
 */

export type CorTailwind = 'zinc' | 'emerald' | 'blue' | 'amber' | 'red' | 'green' | 'purple' | 'pink' | 'orange' | 'cyan' | 'indigo'

interface ClassesCor {
  bg50: string
  bg100: string
  bg200: string
  bg500: string
  bg900_20: string
  text400: string
  text500: string
  text600: string
  text700: string
  border: string
}

/**
 * Mapeamento de cores para classes Tailwind
 * Todas as classes são estáticas e serão compiladas corretamente
 */
export const CORES_TAILWIND: Record<CorTailwind, ClassesCor> = {
  zinc: {
    bg50: 'bg-zinc-50',
    bg100: 'bg-zinc-100',
    bg200: 'bg-zinc-200',
    bg500: 'bg-zinc-500',
    bg900_20: 'bg-zinc-900/20 dark:bg-zinc-100/20',
    text400: 'text-zinc-400',
    text500: 'text-zinc-500',
    text600: 'text-zinc-600',
    text700: 'text-zinc-700',
    border: 'border-zinc-200 dark:border-zinc-800',
  },
  emerald: {
    bg50: 'bg-emerald-50',
    bg100: 'bg-emerald-100',
    bg200: 'bg-emerald-200',
    bg500: 'bg-emerald-500',
    bg900_20: 'bg-emerald-900/20 dark:bg-emerald-100/20',
    text400: 'text-emerald-400',
    text500: 'text-emerald-500',
    text600: 'text-emerald-600',
    text700: 'text-emerald-700',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  blue: {
    bg50: 'bg-blue-50',
    bg100: 'bg-blue-100',
    bg200: 'bg-blue-200',
    bg500: 'bg-blue-500',
    bg900_20: 'bg-blue-900/20 dark:bg-blue-100/20',
    text400: 'text-blue-400',
    text500: 'text-blue-500',
    text600: 'text-blue-600',
    text700: 'text-blue-700',
    border: 'border-blue-200 dark:border-blue-800',
  },
  amber: {
    bg50: 'bg-amber-50',
    bg100: 'bg-amber-100',
    bg200: 'bg-amber-200',
    bg500: 'bg-amber-500',
    bg900_20: 'bg-amber-900/20 dark:bg-amber-100/20',
    text400: 'text-amber-400',
    text500: 'text-amber-500',
    text600: 'text-amber-600',
    text700: 'text-amber-700',
    border: 'border-amber-200 dark:border-amber-800',
  },
  red: {
    bg50: 'bg-red-50',
    bg100: 'bg-red-100',
    bg200: 'bg-red-200',
    bg500: 'bg-red-500',
    bg900_20: 'bg-red-900/20 dark:bg-red-100/20',
    text400: 'text-red-400',
    text500: 'text-red-500',
    text600: 'text-red-600',
    text700: 'text-red-700',
    border: 'border-red-200 dark:border-red-800',
  },
  green: {
    bg50: 'bg-green-50',
    bg100: 'bg-green-100',
    bg200: 'bg-green-200',
    bg500: 'bg-green-500',
    bg900_20: 'bg-green-900/20 dark:bg-green-100/20',
    text400: 'text-green-400',
    text500: 'text-green-500',
    text600: 'text-green-600',
    text700: 'text-green-700',
    border: 'border-green-200 dark:border-green-800',
  },
  purple: {
    bg50: 'bg-purple-50',
    bg100: 'bg-purple-100',
    bg200: 'bg-purple-200',
    bg500: 'bg-purple-500',
    bg900_20: 'bg-purple-900/20 dark:bg-purple-100/20',
    text400: 'text-purple-400',
    text500: 'text-purple-500',
    text600: 'text-purple-600',
    text700: 'text-purple-700',
    border: 'border-purple-200 dark:border-purple-800',
  },
  pink: {
    bg50: 'bg-pink-50',
    bg100: 'bg-pink-100',
    bg200: 'bg-pink-200',
    bg500: 'bg-pink-500',
    bg900_20: 'bg-pink-900/20 dark:bg-pink-100/20',
    text400: 'text-pink-400',
    text500: 'text-pink-500',
    text600: 'text-pink-600',
    text700: 'text-pink-700',
    border: 'border-pink-200 dark:border-pink-800',
  },
  orange: {
    bg50: 'bg-orange-50',
    bg100: 'bg-orange-100',
    bg200: 'bg-orange-200',
    bg500: 'bg-orange-500',
    bg900_20: 'bg-orange-900/20 dark:bg-orange-100/20',
    text400: 'text-orange-400',
    text500: 'text-orange-500',
    text600: 'text-orange-600',
    text700: 'text-orange-700',
    border: 'border-orange-200 dark:border-orange-800',
  },
  cyan: {
    bg50: 'bg-cyan-50',
    bg100: 'bg-cyan-100',
    bg200: 'bg-cyan-200',
    bg500: 'bg-cyan-500',
    bg900_20: 'bg-cyan-900/20 dark:bg-cyan-100/20',
    text400: 'text-cyan-400',
    text500: 'text-cyan-500',
    text600: 'text-cyan-600',
    text700: 'text-cyan-700',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  indigo: {
    bg50: 'bg-indigo-50',
    bg100: 'bg-indigo-100',
    bg200: 'bg-indigo-200',
    bg500: 'bg-indigo-500',
    bg900_20: 'bg-indigo-900/20 dark:bg-indigo-100/20',
    text400: 'text-indigo-400',
    text500: 'text-indigo-500',
    text600: 'text-indigo-600',
    text700: 'text-indigo-700',
    border: 'border-indigo-200 dark:border-indigo-800',
  },
}

/**
 * Obtém as classes de cor de forma segura
 * Retorna zinc como fallback se a cor não existir
 */
export function obterClassesCor(cor: string): ClassesCor {
  return CORES_TAILWIND[cor as CorTailwind] || CORES_TAILWIND.zinc
}
