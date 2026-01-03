/**
 * Utilitário de Registro PWA
 * Gerencia registro e atualização de Service Workers
 */

type PWAType = 'client' | 'dashboard';

interface PWAConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

/**
 * Registra o Service Worker apropriado
 */
export async function registerPWA(type: PWAType, config: PWAConfig = {}) {
  // Verifica se o navegador suporta Service Workers
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers não suportados neste navegador');
    return;
  }

  try {
    // Define qual service worker usar
    const swPath = type === 'dashboard' ? '/sw-dashboard.js' : '/sw-client.js';
    
    console.log(`[PWA] Registrando Service Worker: ${swPath}`);
    
    // Registra o service worker
    const registration = await navigator.serviceWorker.register(swPath, {
      scope: type === 'dashboard' ? '/dashboard/' : '/',
    });

    console.log(`[PWA] Service Worker registrado com sucesso:`, registration);

    // Verifica se há atualização disponível
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        console.log('[PWA] Nova versão encontrada, instalando...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] Nova versão instalada! Ativando...');
            
            // Envia mensagem para o SW pular a espera
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            
            // Notifica sobre atualização
            if (config.onUpdate) {
              config.onUpdate(registration);
            }
          }
        });
      }
    });

    // Recarrega automaticamente quando o controller mudar
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[PWA] Nova versão ativa, recarregando página...');
        window.location.reload();
      }
    });

    // Verifica atualizações a cada 30 segundos
    setInterval(() => {
      registration.update();
    }, 30000);

    // Callback de sucesso
    if (config.onSuccess) {
      config.onSuccess(registration);
    }

    return registration;
  } catch (error) {
    console.error('[PWA] Erro ao registrar Service Worker:', error);
    
    if (config.onError) {
      config.onError(error as Error);
    }
  }
}

/**
 * Desregistra o Service Worker
 */
export async function unregisterPWA() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[PWA] Service Worker desregistrado');
    }
  } catch (error) {
    console.error('[PWA] Erro ao desregistrar:', error);
  }
}

/**
 * Verifica a versão atual do Service Worker
 */
export async function getPWAVersion(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.active) {
      const activeWorker = registration.active;
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.version || null);
        };
        
        activeWorker.postMessage(
          { type: 'GET_VERSION' },
          [messageChannel.port2]
        );
      });
    }
    
    return null;
  } catch (error) {
    console.error('[PWA] Erro ao obter versão:', error);
    return null;
  }
}

/**
 * Limpa todo o cache (útil para desenvolvimento)
 */
export async function clearPWACache() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[PWA] Cache limpo com sucesso');
  } catch (error) {
    console.error('[PWA] Erro ao limpar cache:', error);
  }
}

/**
 * Verifica se está rodando como PWA instalada
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Verifica se está em modo standalone (instalado)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Verifica se foi adicionado à tela inicial (iOS)
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  return isStandalone || isIOSStandalone;
}

/**
 * Verifica se está online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  
  return navigator.onLine;
}

/**
 * Adiciona listeners para mudanças de conectividade
 */
export function onConnectivityChange(
  onOnline: () => void,
  onOffline: () => void
) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Retorna função para remover listeners
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
