import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * API Route para gerar manifest PWA dinâmico do Admin
 * Usa o tenant_id passado como query param para buscar dados do estabelecimento
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      // Retorna manifest padrão se não houver tenant_id
      return NextResponse.json({
        name: 'BarberHub Admin',
        short_name: 'Admin',
        description: 'Painel administrativo BarberHub',
        start_url: '/admin',
        scope: '/admin',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#18181b',
        theme_color: '#18181b',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        categories: ['business', 'productivity'],
        lang: 'pt-BR',
        dir: 'ltr',
      }, {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Buscar dados do tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('nome, cor_primaria, cor_secundaria, icone_pwa_192, icone_pwa_512, logo_url, atualizado_em')
      .eq('id', tenantId)
      .single()

    if (error || !tenant) {
      console.error('[Manifest Admin] Erro ao buscar tenant:', error)
      return NextResponse.json({
        name: 'BarberHub Admin',
        short_name: 'Admin',
        description: 'Painel administrativo BarberHub',
        start_url: '/admin',
        scope: '/admin',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#18181b',
        theme_color: '#18181b',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        categories: ['business', 'productivity'],
        lang: 'pt-BR',
        dir: 'ltr',
      }, {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    }

    // Montar nome do app: "Nome Admin"
    const nomeBase = (tenant.nome || 'BarberHub').trim()
    const nomeCompleto = `${nomeBase} Admin`
    const nomeReduzido = nomeCompleto.length > 30
      ? `${nomeBase.substring(0, 24).trim()} Admin`
      : nomeCompleto
    
    // Ícones: prioriza ícones PWA gerados, depois logo, depois padrão
    const icone192 = tenant.icone_pwa_192 || tenant.logo_url || '/icons/icon-192.png'
    const icone512 = tenant.icone_pwa_512 || tenant.logo_url || '/icons/icon-512.png'
    const versaoIcones = encodeURIComponent(tenant.atualizado_em || String(Date.now()))
    const icone192Versionado = `${icone192}${icone192.includes('?') ? '&' : '?'}v=${versaoIcones}`
    const icone512Versionado = `${icone512}${icone512.includes('?') ? '&' : '?'}v=${versaoIcones}`
    
    // Cores do tenant
    const corPrimaria = tenant.cor_primaria || '#18181b'
    const corSecundaria = tenant.cor_secundaria || '#ffffff'

    const manifest = {
      name: nomeCompleto,
      short_name: nomeReduzido,
      description: `Painel administrativo - ${tenant.nome}`,
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      orientation: 'portrait',
      background_color: corSecundaria,
      theme_color: corPrimaria,
      icons: [
        {
          src: icone192Versionado,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: icone192Versionado,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: icone512Versionado,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: icone512Versionado,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      categories: ['business', 'productivity'],
      lang: 'pt-BR',
      dir: 'ltr',
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (erro) {
    console.error('[Manifest Admin] Erro:', erro)
    return NextResponse.json(
      { error: 'Erro ao gerar manifest' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
