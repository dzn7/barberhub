import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@radix-ui/themes/styles.css'
import { ProvedorTema } from '@/components/provedores/provedor-tema'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/hooks/useToast'
import { RadixThemeWrapper } from '@/components/provedores/radix-theme-wrapper'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Barber Hub - Sistema Completo de Gestão para Barbearias',
  description: 'Transforme sua barbearia com gestão inteligente. Agendamento online 24/7, controle financeiro completo, gestão de comissões e integração WhatsApp. Pagamento único, sem mensalidades.',
  keywords: 'barbearia, gestão, agendamento online, sistema para barbearia, controle financeiro, comissões, WhatsApp',
  authors: [{ name: 'Barber Hub' }],
  icons: {
    icon: [
      { url: '/assets/favicon/favicon.ico' },
      { url: '/assets/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/assets/favicon/apple-touch-icon.png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/assets/favicon/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/assets/favicon/android-chrome-512x512.png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://barberhub.com.br',
    title: 'Barber Hub - Sistema Completo de Gestão para Barbearias',
    description: 'Transforme sua barbearia com gestão inteligente. Pagamento único, sem mensalidades.',
    siteName: 'Barber Hub',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Barber Hub - Sistema Completo de Gestão para Barbearias',
    description: 'Transforme sua barbearia com gestão inteligente. Pagamento único, sem mensalidades.',
  },
  robots: {
    index: true,
    follow: true,
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
      <body className={inter.className}>
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
