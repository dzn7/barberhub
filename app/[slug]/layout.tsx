import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { InstalarPWA, RegistrarServiceWorker } from '@/components/pwa'
import { obterClasseFonte, gerarUrlFontes } from '@/lib/fontes'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

async function obterTenantPorSlug(slug: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single()

  if (error || !data) return null
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const tenant = await obterTenantPorSlug(slug)

  if (!tenant) {
    return {
      title: 'Barbearia não encontrada',
    }
  }

  const icone192 = tenant.icone_pwa_192 || tenant.logo_url || '/icons/icon-192.png'
  const icone512 = tenant.icone_pwa_512 || tenant.logo_url || '/icons/icon-512.png'

  return {
    title: {
      default: tenant.nome,
      template: `%s | ${tenant.nome}`,
    },
    description: `Agende seu horário na ${tenant.nome}. Atendimento profissional e de qualidade.`,
    manifest: `/${slug}/manifest.webmanifest`,
    themeColor: tenant.cor_primaria || '#18181b',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: tenant.nome,
    },
    icons: {
      icon: [
        { url: icone192, sizes: '192x192', type: 'image/png' },
        { url: icone512, sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: icone192, sizes: '192x192', type: 'image/png' },
      ],
    },
    openGraph: {
      title: tenant.nome,
      description: `Agende seu horário na ${tenant.nome}`,
      type: 'website',
      locale: 'pt_BR',
      images: tenant.logo_url ? [{ url: tenant.logo_url }] : [],
    },
  }
}

export default async function TenantLayout({ children, params }: LayoutProps) {
  const { slug } = await params
  const tenant = await obterTenantPorSlug(slug)

  if (!tenant) {
    notFound()
  }

  const fontePrincipal = tenant.fonte_principal || 'Inter'
  const fonteTitulos = tenant.fonte_titulos || 'Inter'
  const classeFontePrincipal = obterClasseFonte(fontePrincipal)
  const classeFonteTitulos = obterClasseFonte(fonteTitulos)
  const urlFontes = gerarUrlFontes(fontePrincipal, fonteTitulos)

  return (
    <>
      {/* Carregamento de fontes do Google Fonts */}
      {urlFontes && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={urlFontes} />
        </>
      )}
      <div 
        className={`min-h-screen bg-zinc-900 ${classeFontePrincipal}`}
        style={{
          '--cor-primaria': tenant.cor_primaria || '#18181b',
          '--cor-secundaria': tenant.cor_secundaria || '#f4f4f5',
          '--cor-destaque': tenant.cor_destaque || '#a1a1aa',
          '--classe-fonte-titulos': classeFonteTitulos,
        } as React.CSSProperties}
      >
        <RegistrarServiceWorker />
        {children}
        <InstalarPWA 
          nomeBarbearia={tenant.nome} 
          corPrimaria={tenant.cor_primaria || '#18181b'} 
        />
      </div>
    </>
  )
}
