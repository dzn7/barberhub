import { redirect } from 'next/navigation'

/**
 * Página raiz do barbeiro
 * Redireciona automaticamente para a página de login
 */
export default function PaginaBarbeiro() {
  redirect('/colaborador/entrar')
}
