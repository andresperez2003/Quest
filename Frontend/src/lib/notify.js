// Notificaciones locales del sistema (funcionan con la app abierta o en segundo plano, no cerrada del todo).

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotifications() {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function notify(title, body, tag) {
  if (notificationPermission() !== 'granted') return;
  const options = { body, tag, icon: '/icon.svg' };
  // En móvil (PWA instalada) solo funcionan a través del service worker.
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return await reg.showNotification(title, options);
  } catch {
    /* se intenta la API directa */
  }
  try {
    new Notification(title, options);
  } catch {
    /* sin soporte */
  }
}
