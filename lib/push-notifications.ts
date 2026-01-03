/**
 * Serviço de Notificações Push - PWA Dashboard
 * Sistema nativo sem Firebase
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Verifica se o navegador suporta notificações
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Verifica o status da permissão de notificações
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Solicita permissão para enviar notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('[Push] Notificações não suportadas');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('[Push] Permissão de notificações negada');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push] Permissão:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('[Push] Erro ao solicitar permissão:', error);
    return false;
  }
}

/**
 * Envia notificação local (sem service worker)
 */
export async function showLocalNotification(payload: NotificationPayload): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn('[Push] Notificações não suportadas');
    return;
  }

  const permission = await requestNotificationPermission();
  if (!permission) {
    console.warn('[Push] Sem permissão para notificações');
    return;
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/favicon-dashboard/android-chrome-192x192.png',
      badge: payload.badge || '/favicon-dashboard/android-chrome-192x192.png',
      tag: payload.tag || 'default',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data,
    });

    // Auto-fechar após 10 segundos se não for requireInteraction
    if (!payload.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }

    // Evento de clique
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Se tiver URL nos dados, navegar
      if (payload.data?.url) {
        window.location.href = payload.data.url;
      }
    };

    console.log('[Push] Notificação enviada:', payload.title);
  } catch (error) {
    console.error('[Push] Erro ao enviar notificação:', error);
  }
}

/**
 * Envia notificação via Service Worker (mais confiável)
 */
export async function showServiceWorkerNotification(
  payload: NotificationPayload
): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn('[Push] Notificações não suportadas');
    return;
  }

  const permission = await requestNotificationPermission();
  if (!permission) {
    console.warn('[Push] Sem permissão para notificações');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    await registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/favicon-dashboard/android-chrome-192x192.png',
      badge: payload.badge || '/favicon-dashboard/android-chrome-192x192.png',
      tag: payload.tag || 'default',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data,
    });

    console.log('[Push] Notificação SW enviada:', payload.title);
  } catch (error) {
    console.error('[Push] Erro ao enviar notificação SW:', error);
    // Fallback para notificação local
    await showLocalNotification(payload);
  }
}

/**
 * Notificação de novo agendamento
 */
export async function notifyNewAgendamento(agendamento: {
  id: string;
  cliente_nome: string;
  servico_nome: string;
  data_hora: string;
  barbeiro_nome?: string;
}): Promise<void> {
  const dataHora = new Date(agendamento.data_hora);
  const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFormatada = dataHora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  await showServiceWorkerNotification({
    title: '🎉 Novo Agendamento!',
    body: `${agendamento.cliente_nome} - ${agendamento.servico_nome}\n${dataFormatada} às ${horaFormatada}`,
    icon: '/favicon-dashboard/android-chrome-192x192.png',
    badge: '/favicon-dashboard/android-chrome-192x192.png',
    tag: `agendamento-${agendamento.id}`,
    requireInteraction: true,
    data: {
      type: 'novo_agendamento',
      agendamento_id: agendamento.id,
      url: '/dashboard/agendamentos',
    },
  });
}

/**
 * Notificação de cancelamento
 */
export async function notifyCancelamento(agendamento: {
  id: string;
  cliente_nome: string;
  data_hora: string;
}): Promise<void> {
  const dataHora = new Date(agendamento.data_hora);
  const dataFormatada = dataHora.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
  const horaFormatada = dataHora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  await showServiceWorkerNotification({
    title: '❌ Agendamento Cancelado',
    body: `${agendamento.cliente_nome}\n${dataFormatada} às ${horaFormatada}`,
    icon: '/favicon-dashboard/android-chrome-192x192.png',
    tag: `cancelamento-${agendamento.id}`,
    requireInteraction: false,
    data: {
      type: 'cancelamento',
      agendamento_id: agendamento.id,
      url: '/dashboard/agendamentos',
    },
  });
}

/**
 * Testa notificação
 */
export async function testNotification(): Promise<void> {
  await showServiceWorkerNotification({
    title: '✅ Notificações Ativadas!',
    body: 'Você receberá alertas de novos agendamentos aqui.',
    icon: '/favicon-dashboard/android-chrome-192x192.png',
    requireInteraction: false,
    data: {
      type: 'test',
    },
  });
}
