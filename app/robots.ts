import { MetadataRoute } from 'next'

const URL_BASE = 'https://barberhub.online'

/**
 * Robots.txt dinâmico para SEO
 * Controla quais páginas os crawlers podem indexar
 * 
 * Referência: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/admin',
          '/api/',
          '/dzndev/',
          '/dzndev',
          '/configurar/',
          '/configurar',
          '/colaborador/',
          '/_next/',
          '/assets/favicon/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dzndev/',
          '/configurar/',
          '/colaborador/',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/assets/',
          '/*.png',
          '/*.jpg',
          '/*.jpeg',
          '/*.webp',
        ],
      },
    ],
    sitemap: `${URL_BASE}/sitemap.xml`,
    host: URL_BASE,
  }
}
