import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { InstalarPWA, RegistrarServiceWorker } from '@/components/pwa'
import { obterClasseFonte, obterFamiliaFonte, gerarUrlFontes } from '@/lib/fontes'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

function detectarTipoIcone(src: string): string {
  const urlLimpa = src.split('?')[0].toLowerCase()
  if (urlLimpa.endsWith('.jpg') || urlLimpa.endsWith('.jpeg')) return 'image/jpeg'
  if (urlLimpa.endsWith('.webp')) return 'image/webp'
  if (urlLimpa.endsWith('.svg')) return 'image/svg+xml'
  return 'image/png'
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
  const versaoTenant = encodeURIComponent(tenant.atualizado_em || String(Date.now()))
  const icone192Versionado = `${icone192}${icone192.includes('?') ? '&' : '?'}v=${versaoTenant}`
  const icone512Versionado = `${icone512}${icone512.includes('?') ? '&' : '?'}v=${versaoTenant}`
  const tipoIcone192 = detectarTipoIcone(icone192)
  const tipoIcone512 = detectarTipoIcone(icone512)

  return {
    title: {
      default: tenant.nome,
      template: `%s | ${tenant.nome}`,
    },
    description: `Agende seu horário na ${tenant.nome}. Atendimento profissional e de qualidade.`,
    themeColor: tenant.cor_primaria || '#18181b',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: tenant.nome,
    },
    icons: {
      icon: [
        { url: icone192Versionado, sizes: '192x192', type: tipoIcone192 },
        { url: icone512Versionado, sizes: '512x512', type: tipoIcone512 },
      ],
      apple: [
        { url: icone192Versionado, sizes: '192x192', type: tipoIcone192 },
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
  const familiaFonteTitulos = obterFamiliaFonte(fonteTitulos)
  const urlFontes = gerarUrlFontes(fontePrincipal, fonteTitulos)
  const versaoTenant = encodeURIComponent(tenant.atualizado_em || String(Date.now()))
  const manifestHref = `/api/manifest?slug=${encodeURIComponent(slug)}&v=${versaoTenant}`

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
      <link rel="manifest" href={manifestHref} crossOrigin="use-credentials" />
      <div 
        className={`tenant-fonts min-h-screen bg-zinc-900 ${classeFontePrincipal}`}
        style={{
          '--cor-primaria': tenant.cor_primaria || '#18181b',
          '--cor-secundaria': tenant.cor_secundaria || '#f4f4f5',
          '--cor-destaque': tenant.cor_destaque || '#a1a1aa',
          '--font-titulos-family': familiaFonteTitulos,
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
