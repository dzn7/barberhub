'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProvedorTema } from '@/components/provedores/provedor-tema'
import { RegistrarServiceWorker } from '@/components/pwa'
import { Loader2 } from 'lucide-react'

/**
 * Componente para injetar manifest PWA dinâmico do admin
 * Atualiza o link do manifest no head com os dados do tenant
 */
function ManifestDinamicoAdmin() {
  const { tenant } = useAuth()

  useEffect(() => {
    if (!tenant?.id) return

    // Remover manifest existente
    const manifestExistente = document.querySelector('link[rel="manifest"]')
    if (manifestExistente) {
      manifestExistente.remove()
    }

    // Adicionar manifest dinâmico com tenant_id
    const manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    manifestLink.href = `/api/admin/manifest?tenant_id=${tenant.id}`
    document.head.appendChild(manifestLink)

    // Atualizar theme-color meta tag
    let themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.setAttribute('name', 'theme-color')
      document.head.appendChild(themeColorMeta)
    }
    themeColorMeta.setAttribute('content', tenant.cor_primaria || '#18181b')

    // Atualizar apple-touch-icon se houver logo
    if (tenant.logo_url || (tenant as any).icone_pwa_192) {
      const iconUrl = (tenant as any).icone_pwa_192 || tenant.logo_url
      let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]')
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link')
        appleTouchIcon.setAttribute('rel', 'apple-touch-icon')
        document.head.appendChild(appleTouchIcon)
      }
      appleTouchIcon.setAttribute('href', iconUrl)
    }

    // Atualizar título da página
    document.title = `${tenant.nome} - Admin`

  }, [tenant])

  return null
}

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

  return (
    <>
      <ManifestDinamicoAdmin />
      <RegistrarServiceWorker />
      {children}
    </>
  )
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
