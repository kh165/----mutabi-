/**
 * Service Worker Notification & Audio Handler
 * يتولى توجيه وتشغيل ملف الصوت الصحيح (أذان أو تنبيه)
 * ويتجاوز قيود نظام التشغيل في الخلفية عبر Service Worker
 */

const GENTLE_SOUND_URL = '/audio/gentle_notification.wav';

// الاستماع لرسائل الصفحة لتشغيل وإطلاق الإشعارات من داخل الـ Service Worker مباشرة
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION_WITH_SOUND') {
    const { title, body, tag } = event.data;

    const notificationOptions = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      tag: tag || 'mutabi_worship_alert',
      renotify: true,
      requireInteraction: false,
      dir: 'rtl',
      lang: 'ar',
      sound: GENTLE_SOUND_URL,
      vibrate: [150, 80, 150], // اهتزاز هادئ ومريح وغير مزعج
      data: {
        url: '/',
        soundType: 'gentle_chime',
        soundUrl: GENTLE_SOUND_URL,
        dateOfArrival: Date.now(),
      },
      actions: [
        { action: 'open', title: 'فتح مُتَابِـع' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title, notificationOptions).then(() => {
        // إبلاغ التبويبات المفتوحة في الخلفية بتشغيل الصوت عبر القنوات المفتوحة
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          for (const client of clients) {
            client.postMessage({
              type: 'PLAY_AUDIO_FROM_SW',
              soundType: 'gentle_chime',
              soundUrl: GENTLE_SOUND_URL,
            });
          }
        });
      })
    );
  }
});

// التعامل مع النقر على الإشعار في شريط التنبيهات أو شاشة القفل
self.addEventListener('notificationclick', (event) => {
  // This handler is imported before Firebase Messaging; prevent its default
  // notification-click handler from racing us to open another window.
  event.stopImmediatePropagation();
  event.notification.close();
  const soundType = event.notification.data?.soundType || 'adhan';
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing app window and navigate it when the notification
      // targets a different route, rather than opening a second app window.
      const existing = clientList.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin && 'focus' in client;
        } catch {
          return false;
        }
      });
      if (existing) {
        const navigate = existing.url === targetUrl || typeof existing.navigate !== 'function'
          ? Promise.resolve(existing)
          : existing.navigate(targetUrl);
        return navigate.then((client) => {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', soundType });
          return client.focus();
        });
      }
      // No app window exists, so open the requested app route.
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
