import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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

  return {
    title: {
      default: tenant.nome,
      template: `%s | ${tenant.nome}`,
    },
    description: `Agende seu horário na ${tenant.nome}. Atendimento profissional e de qualidade.`,
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

  return (
    <div 
      className="min-h-screen bg-zinc-900"
      style={{
        '--cor-primaria': tenant.cor_primaria || '#18181b',
        '--cor-secundaria': tenant.cor_secundaria || '#ffffff',
        '--cor-destaque': tenant.cor_destaque || '#fbbf24',
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
