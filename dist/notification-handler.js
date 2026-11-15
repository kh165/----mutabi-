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
  event.notification.close();
  const soundType = event.notification.data?.soundType || 'adhan';
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // إذا كان هناك تبويب مفتوح بالفعل، نركز عليه ونرسل أمر الصوت
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICKED', soundType });
          return client.focus();
        }
      }
      // إذا لم يكن مفتوحاً، نفتح نافذة جديدة
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});