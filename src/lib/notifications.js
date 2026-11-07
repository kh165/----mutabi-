/**
 * نظام التنبيهات وإشعارات مواقيت الصلاة (Web Notifications API + In-App Visual Banners)
 * يدعم نظام صلاحيات متكامل:
 * - فحص إذن المتصفح (Notification.permission)
 * - إشعار مرئي حقيقي داخل التطبيق (Visual In-App Toast Banner) عند دخول وقت الصلاة
 * - إشعار النظام المكتبي / المحمول (Native Notification)
 * - صوت تنبيه لطيف (Web Audio API Synthesizer) لا يحتاج لملفات خارجية
 * - حفظ الإعدادات والتفضيلات في Realtime Database للمستخدم
 */

export const NOTIFICATION_DEFAULT_SETTINGS = {
  enabled: true, // مفعّل افتراضياً لخدمة المستخدم
  soundEnabled: true,
  fajr: { enabled: true, time: '04:45', title: 'حان موعد صلاة الفجر 🌅', body: 'الصلاة خير من النوم، بادر لأداء فرض الفجر في وقته' },
  dhuhr: { enabled: true, time: '12:00', title: 'حان موعد صلاة الظهر ☀️', body: 'أقبل وقت صلاة الظهر، أرحنا بها يا بلال وبادر لبيوت الله' },
  asr: { enabled: true, time: '15:15', title: 'حان موعد صلاة العصر 🌤️', body: 'حافظوا على الصلوات والصلاة الوسطى وقوموا لله قانتين' },
  maghrib: { enabled: true, time: '17:45', title: 'حان موعد صلاة المغرب 🌇', body: 'أقبل ليل الله وأدبر نهاره، حان وقت صلاة المغرب' },
  isha: { enabled: true, time: '19:15', title: 'حان موعد صلاة العشاء 🌙', body: 'حان الآن موعد صلاة العشاء والوتر، استعن بها على ختام يومك' },
  morningAdhkar: { enabled: true, time: '06:30', title: 'أذكار الصباح 📿', body: 'حصن نفسك بأذكار الصباح لتكن في حفظ الله ومعيته' },
  eveningAdhkar: { enabled: true, time: '17:00', title: 'أذكار المساء 📿', body: 'أقبل المساء، حافظ على وردك من أذكار المساء' },
  dailyWird: { enabled: true, time: '21:00', title: 'ورد القرآن الكريم 📖', body: 'لا تنسَ نصيبك اليومي من تلاوة وتدبر كتاب الله' },
};

/**
 * صوت أذان وتنبيه نقي باستخدام Web Audio API بدون الحاجة لملفات mp3 خارجية
 */
export function playNotificationTone() {
  if (typeof window === 'undefined') return;
  let ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();

    const now = ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((frequency, index) => {
      const start = now + index * 0.22;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.48);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.5);
    });
    window.setTimeout(() => ctx.close(), 1500);
  } catch (e) {
    console.warn('Notification tone could not be played:', e);
    if (ctx && ctx.state !== 'closed') ctx.close();
  }
}

/**
 * فحص حالة الصلاحية الحالية
 */
export function getNotificationPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * طلب الإذن لنظام التنبيهات
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { granted: false, status: 'unsupported', error: 'متصفحك لا يدعم إشعارات النظام' };
  }
  try {
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      status: permission,
    };
  } catch (err) {
    return { granted: false, status: 'denied', error: err?.message };
  }
}

/**
 * إرسال إشعار للمتصفح
 */
export function sendLocalNotification(title, body, tag = 'mutabi_worship', sound = true) {
  if (sound) {
    playNotificationTone();
  }

  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return Promise.resolve(false);
  }

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag,
    dir: 'rtl',
    lang: 'ar',
    silent: false,
    vibrate: [180, 90, 180],
    data: { url: '/' },
  };

  return (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration.showNotification) {
          await registration.showNotification(title, options);
          return true;
        }
      }

      const notification = new Notification(title, options);
      notification.onclick = function () {
        window.focus();
        this.close();
      };
      return true;
    } catch (err) {
      console.error('Error creating system notification:', err);
      return false;
    }
  })();
}

/**
 * فحص الدقائق الحالية وتشغيل التنبيه عند حلول الموعد المحدد
 * ترجع الكائن المحدّث + أي تنبيه دخل وقته حالياً لعرضه مرئياً في الواجهة
 */
export function checkAndTriggerDueNotifications(settings, lastTriggeredMap = {}, onVisualAlert = null) {
  if (!settings || settings.enabled === false) return lastTriggeredMap;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const updatedMap = { ...lastTriggeredMap };

  const items = [
    { key: 'fajr', ...settings.fajr, prayerName: 'الفجر' },
    { key: 'dhuhr', ...settings.dhuhr, prayerName: 'الظهر' },
    { key: 'asr', ...settings.asr, prayerName: 'العصر' },
    { key: 'maghrib', ...settings.maghrib, prayerName: 'المغرب' },
    { key: 'isha', ...settings.isha, prayerName: 'العشاء' },
    { key: 'morningAdhkar', ...settings.morningAdhkar, prayerName: 'أذكار الصباح' },
    { key: 'eveningAdhkar', ...settings.eveningAdhkar, prayerName: 'أذكار المساء' },
    { key: 'dailyWird', ...settings.dailyWird, prayerName: 'ورد القرآن' },
  ];

  items.forEach((item) => {
    if (item && item.enabled && item.time === currentTimeStr) {
      const triggerKey = `${item.key}_${todayStr}_${currentTimeStr}`;
      if (!updatedMap[triggerKey]) {
        // 1. تشغيل صوت الأذان والتنبيه
        if (settings.soundEnabled !== false) {
          playNotificationTone();
        }

        // 2. إشعار نظام الجهاز
        sendLocalNotification(item.title, item.body, item.key, false);

        // 3. إشعار مرئي حي داخل التطبيق
        if (typeof onVisualAlert === 'function') {
          onVisualAlert({
            key: item.key,
            prayerName: item.prayerName,
            title: item.title,
            body: item.body,
            time: currentTimeStr,
            date: todayStr,
          });
        }

        updatedMap[triggerKey] = true;
      }
    }
  });

  return updatedMap;
}
