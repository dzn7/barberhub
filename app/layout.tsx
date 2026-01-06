import type { Metadata } from 'next'
import { 
  Inter, 
  Poppins, 
  Roboto, 
  Montserrat, 
  Open_Sans, 
  Playfair_Display, 
  Oswald, 
  Lato, 
  Raleway, 
  Nunito 
} from 'next/font/google'
import './globals.css'
import '@radix-ui/themes/styles.css'
import { ProvedorTema } from '@/components/provedores/provedor-tema'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/hooks/useToast'
import { RadixThemeWrapper } from '@/components/provedores/radix-theme-wrapper'

// Fontes disponíveis para personalização do tenant
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-poppins',
})

const roboto = Roboto({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-roboto',
})

const montserrat = Montserrat({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
})

const openSans = Open_Sans({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-open-sans',
})

const playfairDisplay = Playfair_Display({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-playfair',
})

const oswald = Oswald({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-oswald',
})

const lato = Lato({ 
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
  variable: '--font-lato',
})

const raleway = Raleway({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-raleway',
})

const nunito = Nunito({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-nunito',
})

// Combina todas as variáveis de fonte
const fontVariables = [
  inter.variable,
  poppins.variable,
  roboto.variable,
  montserrat.variable,
  openSans.variable,
  playfairDisplay.variable,
  oswald.variable,
  lato.variable,
  raleway.variable,
  nunito.variable,
].join(' ')

const URL_BASE = 'https://barberhub.online'

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: {
    default: 'BarberHub - Sistema de Agendamento Online para Barbearias e Salões | Gestão Completa',
    template: '%s | BarberHub'
  },
  description: 'Sistema completo de gestão para barbearias, salões de beleza e nail designers. Agendamento online 24h, controle financeiro, gestão de equipe, comissões automáticas e notificações WhatsApp. Teste grátis por 14 dias!',
  keywords: [
    'sistema para barbearia',
    'agendamento online barbearia',
    'software para barbearia',
    'gestão de barbearia',
    'sistema de agendamento',
    'app para barbearia',
    'controle financeiro barbearia',
    'agenda online barbeiro',
    'sistema para salão de beleza',
    'nail designer sistema',
    'agendamento manicure',
    'gestão de salão',
    'comissão barbeiro',
    'WhatsApp barbearia',
    'agenda barbeiro online',
    'sistema SaaS barbearia',
    'software gestão beleza',
    'aplicativo barbearia',
    'controle de clientes barbearia',
    'sistema agendamento grátis'
  ],
  authors: [{ name: 'BarberHub', url: URL_BASE }],
  creator: 'BarberHub',
  publisher: 'BarberHub',
  category: 'Software',
  classification: 'Business Software',
  icons: {
    icon: [
      { url: '/assets/favicon/favicon.ico' },
      { url: '/assets/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/assets/favicon/apple-touch-icon.png', sizes: '180x180' },
    ],
    other: [
      { rel: 'mask-icon', url: '/assets/favicon/safari-pinned-tab.svg', color: '#000000' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: URL_BASE,
    title: 'BarberHub - Sistema de Agendamento Online para Barbearias',
    description: 'Transforme sua barbearia com gestão inteligente. Agendamento online 24h, controle financeiro, gestão de equipe e notificações WhatsApp. Teste grátis!',
    siteName: 'BarberHub',
    images: [
      {
        url: '/assets/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BarberHub - Sistema de Gestão para Barbearias',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BarberHub - Sistema de Agendamento Online para Barbearias',
    description: 'Agendamento online 24h, controle financeiro e gestão de equipe. Teste grátis por 14 dias!',
    images: ['/assets/og-image.png'],
    creator: '@barberhub',
    site: '@barberhub',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: URL_BASE,
    languages: {
      'pt-BR': URL_BASE,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
  other: {
    'msapplication-TileColor': '#000000',
    'theme-color': '#000000',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} ${fontVariables}`}>
        <ProvedorTema
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <RadixThemeWrapper>
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </RadixThemeWrapper>
        </ProvedorTema>
      </body>
    </html>
  )
}
