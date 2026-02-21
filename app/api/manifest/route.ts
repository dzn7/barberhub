import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function detectarTipoIcone(src: string): string | undefined {
  const urlLimpa = src.split('?')[0].toLowerCase()

  if (urlLimpa.endsWith('.png')) return 'image/png'
  if (urlLimpa.endsWith('.jpg') || urlLimpa.endsWith('.jpeg')) return 'image/jpeg'
  if (urlLimpa.endsWith('.webp')) return 'image/webp'
  if (urlLimpa.endsWith('.svg')) return 'image/svg+xml'

  return undefined
}

function gerarManifestPadrao(slug?: string) {
  const startUrl = slug ? `/${slug}` : '/'

  return {
    name: 'BarberHub',
    short_name: 'BarberHub',
    description: 'Sistema de agendamento BarberHub',
    start_url: startUrl,
    scope: startUrl === '/' ? '/' : `${startUrl}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#18181b',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')?.trim()

    if (!slug) {
      return NextResponse.json(gerarManifestPadrao(), {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('slug, nome, cor_primaria, cor_secundaria, icone_pwa_192, icone_pwa_512, logo_url, atualizado_em')
      .eq('slug', slug)
      .eq('ativo', true)
      .single()

    if (error || !tenant) {
      return NextResponse.json(gerarManifestPadrao(slug), {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    const nome = tenant.nome || 'BarberHub'
    const corPrimaria = tenant.cor_primaria || '#18181b'
    const corSecundaria = tenant.cor_secundaria || '#ffffff'
    const versaoIcones = encodeURIComponent(tenant.atualizado_em || String(Date.now()))
    const shortNameBase = nome.length > 30 ? `${nome.substring(0, 27).trim()}...` : nome

    const icone192Base = tenant.icone_pwa_192 || tenant.logo_url || '/icons/icon-192.png'
    const icone512Base = tenant.icone_pwa_512 || tenant.logo_url || '/icons/icon-512.png'
    const icone192 = `${icone192Base}${icone192Base.includes('?') ? '&' : '?'}v=${versaoIcones}`
    const icone512 = `${icone512Base}${icone512Base.includes('?') ? '&' : '?'}v=${versaoIcones}`

    const tipoIcone192 = detectarTipoIcone(icone192Base)
    const tipoIcone512 = detectarTipoIcone(icone512Base)

    const manifest = {
      name: nome,
      short_name: shortNameBase,
      description: `Agende seu horário na ${nome}`,
      start_url: `/${tenant.slug}`,
      scope: `/${tenant.slug}`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: corSecundaria,
      theme_color: corPrimaria,
      icons: [
        {
          src: icone192,
          sizes: '192x192',
          ...(tipoIcone192 ? { type: tipoIcone192 } : {}),
          purpose: 'any',
        },
        {
          src: icone192,
          sizes: '192x192',
          ...(tipoIcone192 ? { type: tipoIcone192 } : {}),
          purpose: 'maskable',
        },
        {
          src: icone512,
          sizes: '512x512',
          ...(tipoIcone512 ? { type: tipoIcone512 } : {}),
          purpose: 'any',
        },
        {
          src: icone512,
          sizes: '512x512',
          ...(tipoIcone512 ? { type: tipoIcone512 } : {}),
          purpose: 'maskable',
        },
      ],
      categories: ['lifestyle', 'business'],
      lang: 'pt-BR',
      dir: 'ltr',
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Manifest Cliente] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar manifest' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
