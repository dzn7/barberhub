/**
 * Service Worker para PWA BarberHub
 * Gerencia cache, funcionamento offline e notificações
 */

const CACHE_NAME = 'barberhub-v3-admin-fix'
const OFFLINE_URL = '/offline.html'

// Recursos estáticos para cachear
const STATIC_ASSETS = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Permite ativação imediata quando o app solicitar atualização
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Estratégia de cache:
// - Navegação: network-first sem cache de HTML
// - Assets internos: stale-while-revalidate
// - Ignora chunks do Next para evitar mistura de versões no PWA
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requisições não-GET
  if (request.method !== 'GET') return

  // Ignorar requisições para APIs externas
  if (url.origin !== self.location.origin) return

  // Ignorar requisições de API (sempre buscar do servidor)
  if (url.pathname.startsWith('/api/')) return

  // Evita cache de chunks do Next.js para não servir bundles antigos
  if (url.pathname.startsWith('/_next/')) return

  // Navegação: sempre tentar rede primeiro (sem cachear HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlinePage = await caches.match(OFFLINE_URL)
        if (offlinePage) return offlinePage
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      })
    )
    return
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        const networkFetch = fetch(request).then((response) => {
          // Só cachear respostas válidas e same-origin
          if (response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })

        // Retorna cache rápido e atualiza em segundo plano
        if (cachedResponse) {
          networkFetch.catch(() => {})
          return cachedResponse
        }

        return networkFetch
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
          return cachedResponse
        }

        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
      })
  )
})

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  try {
    const data = event.data.json()
    
    const options = {
      body: data.body || 'Nova notificação',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
        dateOfArrival: Date.now(),
      },
      actions: data.actions || [],
      tag: data.tag || 'default',
      renotify: true,
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'BarberHub', options)
    )
  } catch (error) {
    console.error('Erro ao processar push notification:', error)
  }
})

// Click na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já existe uma janela aberta, focar nela
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      // Senão, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
