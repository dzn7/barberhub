"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, Check } from "lucide-react";
import { Button } from "@radix-ui/themes";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  testNotification,
} from "@/lib/push-notifications";

/**
 * Componente para solicitar permissão de notificações
 * Aparece apenas no dashboard
 */
export function NotificationPermission() {
  const [permission, setPermission] = useState<"default" | "granted" | "denied">("default");
  const [showBanner, setShowBanner] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showIndicator, setShowIndicator] = useState(true);

  useEffect(() => {
    // Verificar suporte
    const supported = isNotificationSupported();
    setIsSupported(supported);

    if (!supported) {
      console.log("[Notificações] Não suportadas neste navegador");
      return;
    }

    // Verificar permissão atual
    const currentPermission = getNotificationPermission();
    setPermission(currentPermission as "default" | "granted" | "denied");

    // Esconder indicador se já concedeu permissão
    if (currentPermission === "granted") {
      setShowIndicator(false);
    }

    // Mostrar banner se ainda não pediu permissão
    const hasAsked = localStorage.getItem("notification-permission-asked");
    if (currentPermission === "default" && !hasAsked) {
      // Aguardar 3 segundos antes de mostrar
      setTimeout(() => {
        setShowBanner(true);
      }, 3000);
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    
    if (granted) {
      setPermission("granted");
      setShowBanner(false);
      setShowIndicator(false); // Esconder indicador após permitir
      
      // Enviar notificação de teste
      await testNotification();
    } else {
      setPermission("denied");
      setShowBanner(false);
    }

    // Marcar que já pediu permissão
    localStorage.setItem("notification-permission-asked", "true");
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("notification-permission-asked", "true");
  };

  // Não mostrar se não for suportado
  if (!isSupported) {
    return null;
  }

  // Não mostrar se já negou
  if (permission === "denied") {
    return null;
  }

  return (
    <>
      {/* Banner de solicitação - RESPONSIVO */}
      <AnimatePresence>
        {showBanner && permission === "default" && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 sm:w-full sm:max-w-md"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Ícone */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white mb-1 sm:mb-2">
                    Ativar Notificações?
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-3 sm:mb-4">
                    Receba alertas de novos agendamentos, mesmo com o navegador minimizado.
                  </p>

                  {/* Botões */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRequestPermission}
                      size="2"
                      className="flex-1 bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                    >
                      <Check className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="text-sm">Ativar</span>
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      size="2"
                      variant="outline"
                      className="cursor-pointer px-3"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador de status - Só mostra se não concedeu permissão */}
      <AnimatePresence>
        {showIndicator && permission !== "granted" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-4 right-4 z-40"
          >
            <button
              onClick={() => setShowBanner(true)}
              className={`p-3 rounded-full shadow-lg transition-colors ${
                String(permission) === "granted"
                  ? "bg-green-500 text-white"
                  : "bg-yellow-500 text-white hover:bg-yellow-600"
              }`}
              title={
                String(permission) === "granted"
                  ? "Notificações ativadas"
                  : "Clique para ativar notificações"
              }
            >
              {String(permission) === "granted" ? (
                <Bell className="w-5 h-5" />
              ) : (
                <BellOff className="w-5 h-5" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
