"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X } from "lucide-react";

/**
 * Componente de Notificação de Atualização PWA
 * Exibe banner quando há nova versão disponível
 */
export function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Verifica se há atualização disponível
    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setRegistration(reg);
              setShowUpdate(true);
            }
          });
        }
      });
    });
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Marcar que o usuário solicitou a atualização
      sessionStorage.setItem('pwa-update-requested', 'true');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      setShowUpdate(false);
      // O reload acontecerá via controllerchange event
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Nova Versão Disponível
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                  Uma atualização está pronta para ser instalada. Recarregue para obter a versão mais recente.
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdate}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Atualizar Agora
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    Depois
                  </button>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
