import { BarbeiroAuthProvider } from '@/contexts/BarbeiroAuthContext'

/**
 * Layout para área do barbeiro
 * Encapsula todas as páginas com o provider de autenticação
 */
export default function BarbeiroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BarbeiroAuthProvider>
      {children}
    </BarbeiroAuthProvider>
  )
}
