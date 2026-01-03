"use client";

import { useEffect, useState } from "react";
import { NotificationPermission } from "./NotificationPermission";
import { useAgendamentosRealtime } from "@/hooks/useAgendamentosRealtime";
import { useAutenticacao } from "@/contexts/AutenticacaoContext";

/**
 * Wrapper para ativar notificações no dashboard
 * Só ativa se usuário estiver autenticado
 */
export function DashboardNotificationWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario } = useAutenticacao();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Verificar se deve habilitar notificações
  useEffect(() => {
    // Só habilitar se estiver autenticado e no dashboard
    const isDashboard = window.location.pathname.startsWith("/dashboard");
    setNotificationsEnabled(!!usuario && isDashboard);
  }, [usuario]);

  // Hook de realtime (só ativa se enabled)
  const { isConnected } = useAgendamentosRealtime({
    enabled: notificationsEnabled,
    onNewAgendamento: (agendamento) => {
      console.log("[Dashboard] Novo agendamento recebido:", agendamento);
      
      // Tocar som (opcional)
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          console.log('[Dashboard] Não foi possível tocar som');
        });
      } catch (error) {
        // Ignorar erro de som
      }
    },
    onCancelamento: (agendamento) => {
      console.log("[Dashboard] Agendamento cancelado:", agendamento);
    },
  });

  // Log de status
  useEffect(() => {
    if (notificationsEnabled) {
      console.log("[Dashboard] Notificações ativadas");
      console.log("[Dashboard] Realtime conectado:", isConnected);
    }
  }, [notificationsEnabled, isConnected]);

  return (
    <>
      {children}
      {notificationsEnabled && <NotificationPermission />}
    </>
  );
}
