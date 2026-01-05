import { MetadataRoute } from 'next'

const URL_BASE = 'https://barberhub.online'

/**
 * Sitemap dinâmico para SEO
 * Gera automaticamente o sitemap.xml com todas as páginas públicas
 * 
 * Referência: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const dataAtual = new Date()
  
  // Páginas estáticas principais
  const paginasEstaticas: MetadataRoute.Sitemap = [
    {
      url: URL_BASE,
      lastModified: dataAtual,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${URL_BASE}/registrar`,
      lastModified: dataAtual,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${URL_BASE}/entrar`,
      lastModified: dataAtual,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${URL_BASE}/termos`,
      lastModified: dataAtual,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${URL_BASE}/colaborador/entrar`,
      lastModified: dataAtual,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  return paginasEstaticas
}
