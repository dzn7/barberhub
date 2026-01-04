'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Smartphone, Share, Plus } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstalarPWAProps {
  nomeBarbearia?: string
  corPrimaria?: string
}

/**
 * Componente para exibir prompt de instalação do PWA
 * Detecta automaticamente se o app pode ser instalado
 */
export function InstalarPWA({ nomeBarbearia = 'BarberHub', corPrimaria = '#18181b' }: InstalarPWAProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [mostrarBanner, setMostrarBanner] = useState(false)
  const [mostrarInstrucoesIOS, setMostrarInstrucoesIOS] = useState(false)
  const [jaInstalado, setJaInstalado] = useState(false)

  // Detectar se é iOS
  const isIOS = typeof window !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    !(window as any).MSStream

  // Detectar se já está instalado como PWA
  const isStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || 
     (window.navigator as any).standalone === true)

  useEffect(() => {
    // Se já está em modo standalone, não mostrar
    if (isStandalone) {
      setJaInstalado(true)
      return
    }

    // Verificar se usuário já dispensou o banner recentemente (24h)
    const ultimaDispensa = localStorage.getItem('pwa-banner-dispensado')
    if (ultimaDispensa) {
      const horasPassadas = (Date.now() - parseInt(ultimaDispensa)) / (1000 * 60 * 60)
      if (horasPassadas < 24) return
    }

    // Listener para evento beforeinstallprompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Mostrar banner após 3 segundos
      setTimeout(() => {
        setMostrarBanner(true)
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Para iOS, mostrar instruções manuais após 5 segundos
    if (isIOS && !isStandalone) {
      setTimeout(() => {
        setMostrarBanner(true)
      }, 5000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isIOS, isStandalone])

  const handleInstalar = async () => {
    if (!deferredPrompt) {
      // Para iOS, mostrar instruções
      if (isIOS) {
        setMostrarInstrucoesIOS(true)
      }
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setJaInstalado(true)
      }
      
      setDeferredPrompt(null)
      setMostrarBanner(false)
    } catch (error) {
      console.error('Erro ao instalar PWA:', error)
    }
  }

  const handleDispensarBanner = () => {
    setMostrarBanner(false)
    localStorage.setItem('pwa-banner-dispensado', Date.now().toString())
  }

  const handleFecharInstrucoesIOS = () => {
    setMostrarInstrucoesIOS(false)
    setMostrarBanner(false)
    localStorage.setItem('pwa-banner-dispensado', Date.now().toString())
  }

  // Não mostrar se já instalado
  if (jaInstalado) return null

  return (
    <>
      {/* Banner de instalação */}
      <AnimatePresence>
        {mostrarBanner && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
          >
            <div 
              className="p-4 rounded-2xl shadow-2xl border backdrop-blur-xl"
              style={{ 
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: corPrimaria }}
                >
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm">
                    Instalar {nomeBarbearia}
                  </h3>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Adicione à tela inicial para acesso rápido
                  </p>
                </div>

                <button
                  onClick={handleDispensarBanner}
                  className="flex-shrink-0 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleDispensarBanner}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Depois
                </button>
                <button
                  onClick={handleInstalar}
                  className="flex-1 py-2.5 px-4 text-sm font-medium text-black bg-white rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Instalar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de instruções para iOS */}
      <AnimatePresence>
        {mostrarInstrucoesIOS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleFecharInstrucoesIOS}
          >
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="w-full max-w-md bg-zinc-900 rounded-2xl p-6 border border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Instalar no iPhone
                </h3>
                <button
                  onClick={handleFecharInstrucoesIOS}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      Toque no ícone <Share className="w-4 h-4 inline text-blue-500" /> compartilhar
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Na barra inferior do Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      Role e toque em &quot;Adicionar à Tela de Início&quot;
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Adicionar à Tela de Início
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      Toque em &quot;Adicionar&quot; no canto superior
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      O app aparecerá na sua tela inicial
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleFecharInstrucoesIOS}
                className="w-full mt-6 py-3 px-4 text-sm font-medium text-black bg-white rounded-xl hover:bg-zinc-100 transition-colors"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
