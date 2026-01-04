import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Manifest dinâmico para PWA de cada barbearia
 * Gera automaticamente com nome, cores e ícones do tenant
 */
export default async function manifest({
  params,
}: {
  params: { slug: string }
}): Promise<MetadataRoute.Manifest> {
  const { slug } = params

  // Buscar dados do tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('nome, cor_primaria, cor_secundaria, icone_pwa_192, icone_pwa_512, logo_url')
    .eq('slug', slug)
    .single()

  // Valores padrão caso não encontre
  const nome = tenant?.nome || 'BarberHub'
  const corPrimaria = tenant?.cor_primaria || '#18181b'
  const corSecundaria = tenant?.cor_secundaria || '#ffffff'
  
  // Ícones: usa os gerados automaticamente ou fallback para logo ou ícone padrão
  const icone192 = tenant?.icone_pwa_192 || tenant?.logo_url || '/icons/icon-192.png'
  const icone512 = tenant?.icone_pwa_512 || tenant?.logo_url || '/icons/icon-512.png'

  return {
    name: nome,
    short_name: nome.length > 12 ? nome.substring(0, 12) : nome,
    description: `Agende seu horário na ${nome}`,
    start_url: `/${slug}`,
    scope: `/${slug}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: corSecundaria,
    theme_color: corPrimaria,
    icons: [
      {
        src: icone192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icone192,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: icone512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: icone512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['lifestyle', 'business'],
    lang: 'pt-BR',
    dir: 'ltr',
  }
}

export const dynamic = 'force-dynamic'
