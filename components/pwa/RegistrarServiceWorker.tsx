'use client'

import { useEffect } from 'react'

/**
 * Componente que registra o Service Worker
 * Deve ser incluído no layout principal
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Registrar service worker após a página carregar
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registrado:', registration.scope)
            
            // Verificar atualizações periodicamente
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Nova versão disponível
                    console.log('Nova versão do PWA disponível')
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.error('Erro ao registrar Service Worker:', error)
          })
      })
    }
  }, [])

  return null
}
