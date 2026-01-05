'use client'

/**
 * Componente de Dados Estruturados (JSON-LD) para SEO
 * Implementa Schema.org para melhor indexação nos mecanismos de busca
 * 
 * Tipos implementados:
 * - Organization: Informações da empresa
 * - SoftwareApplication: Detalhes do produto SaaS
 * - WebSite: Informações do site com SearchAction
 * - FAQPage: Perguntas frequentes
 * - BreadcrumbList: Navegação estruturada
 */

const URL_BASE = 'https://barberhub.online'

interface DadosEstruturadosProps {
  tipo?: 'organizacao' | 'software' | 'website' | 'faq' | 'breadcrumb' | 'todos'
  breadcrumbs?: Array<{ nome: string; url: string }>
  faqs?: Array<{ pergunta: string; resposta: string }>
}

export function DadosEstruturados({ 
  tipo = 'todos',
  breadcrumbs,
  faqs 
}: DadosEstruturadosProps) {
  
  // Schema da Organização
  const schemaOrganizacao = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${URL_BASE}/#organization`,
    name: 'BarberHub',
    alternateName: 'Barber Hub',
    url: URL_BASE,
    logo: {
      '@type': 'ImageObject',
      url: `${URL_BASE}/assets/logo.png`,
      width: 512,
      height: 512,
    },
    image: `${URL_BASE}/assets/og-image.png`,
    description: 'Sistema completo de gestão para barbearias, salões de beleza e nail designers. Agendamento online, controle financeiro e gestão de equipe.',
    foundingDate: '2024',
    slogan: 'Transforme sua barbearia com gestão inteligente',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+55-11-99999-9999',
        contactType: 'customer service',
        availableLanguage: ['Portuguese'],
        areaServed: 'BR',
      },
    ],
    sameAs: [
      'https://instagram.com/barberhub',
      'https://facebook.com/barberhub',
      'https://twitter.com/barberhub',
      'https://linkedin.com/company/barberhub',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'BR',
      addressLocality: 'São Paulo',
      addressRegion: 'SP',
    },
  }

  // Schema do Software/Produto
  const schemaSoftware = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${URL_BASE}/#software`,
    name: 'BarberHub',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Appointment Scheduling Software',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BRL',
      lowPrice: '0',
      highPrice: '497',
      offerCount: 3,
      offers: [
        {
          '@type': 'Offer',
          name: 'Plano Trial',
          price: '0',
          priceCurrency: 'BRL',
          description: '14 dias grátis para testar todas as funcionalidades',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Plano Básico',
          price: '197',
          priceCurrency: 'BRL',
          description: 'Ideal para profissionais autônomos',
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Plano Profissional',
          price: '497',
          priceCurrency: 'BRL',
          description: 'Para barbearias com equipe completa',
          availability: 'https://schema.org/InStock',
        },
      ],
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    description: 'Sistema completo de gestão para barbearias com agendamento online 24h, controle financeiro, gestão de equipe, comissões automáticas e notificações WhatsApp.',
    featureList: [
      'Agendamento online 24 horas',
      'Controle financeiro completo',
      'Gestão de equipe e comissões',
      'Notificações via WhatsApp',
      'Relatórios e métricas',
      'Página de agendamento personalizada',
      'Controle de estoque',
      'Múltiplos profissionais',
    ],
    screenshot: [
      {
        '@type': 'ImageObject',
        url: `${URL_BASE}/assets/dashboard-lista-portrait.png`,
        caption: 'Dashboard de agendamentos do BarberHub',
      },
    ],
    softwareVersion: '2.0',
    releaseNotes: 'Nova versão com suporte a múltiplos tipos de negócio',
    provider: {
      '@type': 'Organization',
      name: 'BarberHub',
      url: URL_BASE,
    },
  }

  // Schema do Website com SearchAction
  const schemaWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${URL_BASE}/#website`,
    url: URL_BASE,
    name: 'BarberHub',
    description: 'Sistema de gestão para barbearias e salões de beleza',
    publisher: {
      '@id': `${URL_BASE}/#organization`,
    },
    inLanguage: 'pt-BR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${URL_BASE}/busca?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  // Schema de FAQ
  const schemaFAQ = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (faqs || [
      {
        pergunta: 'O que é o BarberHub?',
        resposta: 'O BarberHub é um sistema completo de gestão para barbearias, salões de beleza e nail designers. Oferece agendamento online 24h, controle financeiro, gestão de equipe e notificações via WhatsApp.',
      },
      {
        pergunta: 'Quanto custa o BarberHub?',
        resposta: 'O BarberHub oferece um período de teste grátis de 14 dias. Após isso, os planos começam a partir de R$ 197 (pagamento único, sem mensalidades).',
      },
      {
        pergunta: 'Preciso instalar algum aplicativo?',
        resposta: 'Não! O BarberHub funciona 100% online, direto no navegador. Você pode acessar de qualquer dispositivo: computador, tablet ou celular.',
      },
      {
        pergunta: 'Como funciona o agendamento online?',
        resposta: 'Seus clientes acessam sua página personalizada de agendamento, escolhem o serviço, profissional, data e horário. Tudo automático, 24 horas por dia.',
      },
      {
        pergunta: 'O sistema envia lembretes para os clientes?',
        resposta: 'Sim! O BarberHub envia notificações automáticas via WhatsApp para confirmar agendamentos e enviar lembretes antes do horário marcado.',
      },
      {
        pergunta: 'Posso gerenciar minha equipe pelo sistema?',
        resposta: 'Sim! Você pode cadastrar todos os profissionais da sua equipe, definir horários individuais, serviços específicos e calcular comissões automaticamente.',
      },
    ]).map(faq => ({
      '@type': 'Question',
      name: faq.pergunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.resposta,
      },
    })),
  }

  // Schema de Breadcrumb
  const schemaBreadcrumb = breadcrumbs ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.nome,
      item: item.url,
    })),
  } : null

  // Renderizar schemas baseado no tipo
  const renderSchemas = () => {
    const schemas: any[] = []

    if (tipo === 'todos' || tipo === 'organizacao') {
      schemas.push(schemaOrganizacao)
    }
    if (tipo === 'todos' || tipo === 'software') {
      schemas.push(schemaSoftware)
    }
    if (tipo === 'todos' || tipo === 'website') {
      schemas.push(schemaWebsite)
    }
    if (tipo === 'todos' || tipo === 'faq') {
      schemas.push(schemaFAQ)
    }
    if (tipo === 'breadcrumb' && schemaBreadcrumb) {
      schemas.push(schemaBreadcrumb)
    }

    return schemas
  }

  const schemas = renderSchemas()

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}

/**
 * Schema específico para página de serviço/produto
 */
export function SchemaServico({ 
  nome, 
  descricao, 
  preco, 
  imagem 
}: { 
  nome: string
  descricao: string
  preco: number
  imagem?: string 
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: nome,
    description: descricao,
    provider: {
      '@type': 'Organization',
      name: 'BarberHub',
      url: URL_BASE,
    },
    offers: {
      '@type': 'Offer',
      price: preco.toString(),
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
    },
    image: imagem || `${URL_BASE}/assets/og-image.png`,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Schema para artigos/blog posts
 */
export function SchemaArtigo({
  titulo,
  descricao,
  dataPublicacao,
  dataModificacao,
  autor,
  imagem,
  url,
}: {
  titulo: string
  descricao: string
  dataPublicacao: string
  dataModificacao?: string
  autor: string
  imagem?: string
  url: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: titulo,
    description: descricao,
    image: imagem || `${URL_BASE}/assets/og-image.png`,
    datePublished: dataPublicacao,
    dateModified: dataModificacao || dataPublicacao,
    author: {
      '@type': 'Person',
      name: autor,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BarberHub',
      logo: {
        '@type': 'ImageObject',
        url: `${URL_BASE}/assets/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Schema para LocalBusiness (para páginas de tenants)
 */
export function SchemaLocalBusiness({
  nome,
  descricao,
  endereco,
  cidade,
  estado,
  telefone,
  imagem,
  url,
  horarioFuncionamento,
}: {
  nome: string
  descricao?: string
  endereco?: string
  cidade?: string
  estado?: string
  telefone?: string
  imagem?: string
  url: string
  horarioFuncionamento?: string[]
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BarberShop',
    name: nome,
    description: descricao || `${nome} - Barbearia`,
    image: imagem,
    url: url,
    telephone: telefone,
    address: endereco ? {
      '@type': 'PostalAddress',
      streetAddress: endereco,
      addressLocality: cidade,
      addressRegion: estado,
      addressCountry: 'BR',
    } : undefined,
    openingHoursSpecification: horarioFuncionamento?.map(horario => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: horario,
    })),
    priceRange: '$$',
    paymentAccepted: 'Cash, Credit Card, Debit Card, PIX',
    currenciesAccepted: 'BRL',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
