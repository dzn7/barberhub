/**
 * Service Worker para PWA BarberHub
 * Gerencia cache, funcionamento offline e notificações
 */

const CACHE_NAME = 'barberhub-v1'
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

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ignorar requisições não-GET
  if (request.method !== 'GET') return

  // Ignorar requisições para APIs externas
  if (!request.url.startsWith(self.location.origin)) return

  // Ignorar requisições de API (sempre buscar do servidor)
  if (request.url.includes('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone a resposta para armazenar no cache
        const responseClone = response.clone()
        
        // Só cachear respostas válidas
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        
        return response
      })
      .catch(async () => {
        // Tentar buscar do cache
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
          return cachedResponse
        }
        
        // Se for uma navegação, mostrar página offline
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL)
          if (offlinePage) {
            return offlinePage
          }
        }
        
        // Retornar erro genérico
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
