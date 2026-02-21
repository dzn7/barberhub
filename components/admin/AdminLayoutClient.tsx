'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProvedorTema } from '@/components/provedores/provedor-tema'
import { RegistrarServiceWorker } from '@/components/pwa'

const ADMIN_PWA_VERSION = '2026-02-21-admin-manifest-fix-2'
const ADMIN_PWA_VERSION_KEY = 'admin-pwa-version'

/**
 * Força o manifest dinâmico no admin após obter tenant no client.
 */
function ManifestDinamicoAdmin() {
  const { tenant } = useAuth()

  useEffect(() => {
    if (!tenant?.id) return

    const versaoTenant = tenant.atualizado_em || String(Date.now())
    const manifestHref = `/api/admin/manifest?tenant_id=${tenant.id}&v=${encodeURIComponent(versaoTenant)}`

    let manifestLink =
      document.querySelector<HTMLLinkElement>('#admin-dynamic-manifest') ||
      document.querySelector<HTMLLinkElement>('link[rel="manifest"]')

    if (!manifestLink) {
      manifestLink = document.createElement('link')
      document.head.appendChild(manifestLink)
    }

    manifestLink.id = 'admin-dynamic-manifest'
    manifestLink.rel = 'manifest'
    manifestLink.href = manifestHref

    // Mantém somente um manifest ativo para evitar fallback do /manifest.json global.
    document.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]').forEach((link) => {
      if (link !== manifestLink) link.remove()
    })

    let themeColorMeta = document.querySelector<HTMLMetaElement>('#admin-theme-color')
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta')
      themeColorMeta.id = 'admin-theme-color'
      themeColorMeta.setAttribute('name', 'theme-color')
      document.head.appendChild(themeColorMeta)
    }
    themeColorMeta.setAttribute('content', tenant.cor_primaria || '#18181b')

    if (tenant.logo_url || (tenant as any).icone_pwa_192) {
      const iconBaseUrl = (tenant as any).icone_pwa_192 || tenant.logo_url
      const iconUrl = `${iconBaseUrl}${iconBaseUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(versaoTenant)}`

      let appleTouchIcon = document.querySelector<HTMLLinkElement>('#admin-apple-touch-icon')
      if (!appleTouchIcon) {
        appleTouchIcon = document.createElement('link')
        appleTouchIcon.id = 'admin-apple-touch-icon'
        appleTouchIcon.setAttribute('rel', 'apple-touch-icon')
        document.head.appendChild(appleTouchIcon)
      }
      appleTouchIcon.setAttribute('href', iconUrl)
    }

    document.title = `${tenant.nome} - Admin`
  }, [tenant])

  return null
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, carregando } = useAuth()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const versaoAtual = localStorage.getItem(ADMIN_PWA_VERSION_KEY)
    if (versaoAtual === ADMIN_PWA_VERSION) return

    const limparCacheAdmin = async () => {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map((name) => caches.delete(name)))
        }

        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          await Promise.all(registrations.map((reg) => reg.unregister()))
        }
      } catch (error) {
        console.error('Falha ao limpar cache do admin PWA:', error)
      } finally {
        localStorage.setItem(ADMIN_PWA_VERSION_KEY, ADMIN_PWA_VERSION)
        window.location.reload()
      }
    }

    void limparCacheAdmin()
  }, [])

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

  if (!user) return null

  return (
    <>
      <ManifestDinamicoAdmin />
      <RegistrarServiceWorker />
      {children}
    </>
  )
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
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

