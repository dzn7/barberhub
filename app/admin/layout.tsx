'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProvedorTema } from '@/components/provedores/provedor-tema'
import { Loader2 } from 'lucide-react'

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, carregando } = useAuth()

  useEffect(() => {
    if (!carregando && !user) {
      router.push('/entrar')
    }
  }, [user, carregando, router])

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorTema
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AuthProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </AuthProvider>
    </ProvedorTema>
  )
}
