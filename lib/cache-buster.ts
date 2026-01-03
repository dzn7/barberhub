/**
 * Cache Buster - Força limpeza de cache antigo
 * Executado na inicialização do app
 */

const CURRENT_VERSION = '2.0.0';
const VERSION_KEY = 'app-version';

/**
 * Verifica e limpa cache se a versão mudou
 */
export async function checkAndClearCache() {
  if (typeof window === 'undefined') return;

  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    // Se a versão mudou, limpa tudo
    if (storedVersion !== CURRENT_VERSION) {
      console.log(`[Cache Buster] Versão mudou de ${storedVersion} para ${CURRENT_VERSION}`);
      console.log('[Cache Buster] Limpando cache...');
      
      // Limpa localStorage
      const keysToKeep = ['theme', 'supabase.auth.token'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Limpa sessionStorage
      sessionStorage.clear();
      
      // Limpa todos os caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('[Cache Buster] Removendo cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }
      
      // Desregistra service workers antigos
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('[Cache Buster] Desregistrando SW:', registration.scope);
            return registration.unregister();
          })
        );
      }
      
      // Salva nova versão
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      
      console.log('[Cache Buster] Cache limpo! Recarregando...');
      
      // Força reload sem cache
      window.location.reload();
    } else {
      console.log('[Cache Buster] Versão atual:', CURRENT_VERSION);
    }
  } catch (error) {
    console.error('[Cache Buster] Erro:', error);
  }
}

/**
 * Força limpeza total (para desenvolvimento)
 */
export async function forceClearAll() {
  if (typeof window === 'undefined') return;

  try {
    console.log('[Cache Buster] Limpeza forçada iniciada...');
    
    // Limpa tudo
    localStorage.clear();
    sessionStorage.clear();
    
    // Limpa caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Desregistra SWs
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
    
    console.log('[Cache Buster] Limpeza completa! Recarregando...');
    window.location.reload();
  } catch (error) {
    console.error('[Cache Buster] Erro na limpeza forçada:', error);
  }
}
