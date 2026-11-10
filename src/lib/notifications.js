/**
 * نظام التنبيهات الحقيقي المتوافق مع هواتف الموبايل (Android & iOS PWA)
 * يستخدم ServiceWorkerRegistration.showNotification لإظهار الإشعارات بنظام الهاتف من الخارج
 */

import {
  ADHAN_AUDIO_DATA_URI,
  CHIME_AUDIO_DATA_URI,
  HUSSARY_ADHAN_AUDIO_DATA_URI
} from './audioAssets.js';
export const NOTIFICATION_DEFAULT_SETTINGS = {
  enabled: false,
  fajr: { enabled: true, time: '04:45', title: 'صلاة الفجر', body: 'الصلاة خير من النوم، حان موعد صلاة الفجر' },
  dhuhr: { enabled: true, time: '12:00', title: 'صلاة الظهر', body: 'حان الآن موعد صلاة الظهر، بادر إلى بيوت الله' },
  asr: { enabled: true, time: '15:15', title: 'صلاة العصر', body: 'حافظوا على الصلوات والصلاة الوسطى' },
  maghrib: { enabled: true, time: '17:45', title: 'صلاة المغرب', body: 'حان الآن موعد صلاة المغرب' },
  isha: { enabled: true, time: '19:15', title: 'صلاة العشاء', body: 'أقم صلاة العشاء والوتر قبل نومك' },
  morningAdhkar: { enabled: true, time: '06:30', title: 'أذكار الصباح', body: 'حصن نفسك بأذكار الصباح وبركة بداية اليوم' },
  eveningAdhkar: { enabled: true, time: '17:00', title: 'أذكار المساء', body: 'أقبل المساء، حافظ على وردك من أذكار المساء' },
  dailyWird: { enabled: true, time: '21:00', title: 'الورد اليومي للقرآن', body: 'لا تنسَ نصيبك من قراءة وحفظ كتاب الله اليوم' },
};

/**
 * طلب إذن الإشعارات مع دعم التحقق من الـ Service Worker
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { granted: false, error: 'المتصفح لا يدعم التنبيهات على هذا الجهاز' };
  }
  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted', permission };
  } catch (err) {
    return { granted: false, error: err?.message };
  }
}

/**
 * إرسال إشعار نظام حقيقي يظهر على شاشة القفل وشريط إشعارات الهاتف وخارج التطبيق
 * مع تمرير نوع الصوت وتوجيهه إلى Service Worker لتجاوز قيود الخلفية
 */
export async function sendLocalNotification(title, body, tag = 'mutabi_worship', soundType = 'gentle') {
  if (typeof window === 'undefined') return false;

  const soundUrl = '/audio/gentle_notification.wav';

  // التحقق من دعم الإشعارات
  if (!('Notification' in window)) {
    console.warn('الإشعارات غير مدعومة في هذا المتصفح');
    return false;
  }

  // إذا لم يتم منح الإذن بعد، نطلبه فوراً أثناء تفاعل المستخدم
  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch (e) {
      console.warn('فشل طلب إذن الإشعارات:', e);
    }
  }

  if (permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    tag: tag || 'mutabi_alert',
    renotify: true,
    requireInteraction: false,
    dir: 'rtl',
    lang: 'ar',
    sound: soundUrl,
    vibrate: [150, 80, 150], // اهتزاز هادئ ومريح وغير مزعج
    data: {
      url: '/',
      soundType: 'gentle_chime',
      soundUrl,
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'فتح مُتَابِـع' },
    ],
  };

  try {
    // 1. الأولوية للموبايل: تمرير الرسالة ومواصفات الصوت للـ Service Worker النشط
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION_WITH_SOUND',
          title,
          body,
          tag,
          soundType: 'gentle_chime',
        });
      }

      let reg = null;
      try {
        reg = await navigator.serviceWorker.getRegistration();
      } catch (err) {
        console.warn('SW getRegistration error:', err);
      }

      if (!reg) {
        reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
        ]).catch(() => null);
      }

      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }

    // 2. البديل للحواسيب المكتبية
    const notification = new Notification(title, notificationOptions);
    notification.onclick = function () {
      window.focus();
      this.close();
    };
    return true;
  } catch (err) {
    console.warn('محاولة إرسال الإشعار عبر البديل:', err);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg?.showNotification) {
          await reg.showNotification(title, notificationOptions);
          return true;
        }
      }
      new Notification(title, notificationOptions);
      return true;
    } catch (e) {
      console.error('تعذر إظهار إشعار النظام على هذا الجهاز:', e);
      return false;
    }
  }
}

// الاستماع لأي أوامر تشغيل صوت قادمة من الـ Service Worker في الخلفية
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (
      event.data?.type === 'PLAY_AUDIO_FROM_SW' ||
      event.data?.type === 'NOTIFICATION_CLICKED'
    ) {
      playNotificationTone(event.data.soundType || 'adhan');
    }
  });
}

/**
 * التحقق من حالة إذن الإشعارات الحالية
 */
export function getNotificationPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Memory-cached Audio instances for instant, latency-free playback on mobile
let preloadedGentleAudio = null;

function getAudioInstance() {
  try {
    if (!preloadedGentleAudio) {
      preloadedGentleAudio = new Audio(CHIME_AUDIO_DATA_URI);
      preloadedGentleAudio.volume = 0.45; // صوت هادئ ومريح ومناسب للأذن
      preloadedGentleAudio.playsInline = true;
    }
    return preloadedGentleAudio;
  } catch (e) {
    return null;
  }
}

// تشغيل نغمة روحانية عذبة وهادئة ومريحة عبر Web Audio API
function playGentleSynthesizedChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const t0 = ctx.currentTime;
    // نغمات ثلاثية متتالية عذبة وناعمة مثل جرس الماريمبا الهادئ (C5 -> E5 -> G5)
    const notes = [
      { freq: 523.25, time: 0.00, gain: 0.20, dur: 1.3 }, // C5
      { freq: 659.25, time: 0.14, gain: 0.17, dur: 1.3 }, // E5
      { freq: 783.99, time: 0.28, gain: 0.14, dur: 1.5 }, // G5
    ];

    notes.forEach(({ freq, time, gain: peakGain, dur }) => {
      const startTime = t0 + time;

      const osc1 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      // توافقي ثاني خفيف جداً يمنح الصوت دفئاً وجمالاً بدون أي حدة
      const osc2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, startTime);

      // هجوم ناعم (15ms) وتلاشٍ أسي طبيعي ومريح
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      gainNode2.gain.setValueAtTime(0.0001, startTime);
      gainNode2.gain.exponentialRampToValueAtTime(peakGain * 0.2, startTime + 0.015);
      gainNode2.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.5);

      osc1.connect(gainNode);
      osc2.connect(gainNode2);
      gainNode.connect(ctx.destination);
      gainNode2.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + dur + 0.1);
      osc2.stop(startTime + dur + 0.1);
    });
  } catch (err) {
    // ignore
  }
}

// Mobile Audio unlocker: يجهز القنوات الصوتية تلقائياً عند أول لمسة على الشاشة
if (typeof window !== 'undefined') {
  const unlockAudioPipeline = () => {
    try {
      const gentleAudio = getAudioInstance();
      if (gentleAudio && typeof gentleAudio.load === 'function') gentleAudio.load();
    } catch (e) {
      // ignore
    }
    window.removeEventListener('click', unlockAudioPipeline, true);
    window.removeEventListener('touchstart', unlockAudioPipeline, true);
  };
  window.addEventListener('click', unlockAudioPipeline, { capture: true, once: true, passive: true });
  window.addEventListener('touchstart', unlockAudioPipeline, { capture: true, once: true, passive: true });
}

/**
 * تشغيل نغمة التنبيه الموحدة الهادئة (للأذان وبقية العبادات معاً)
 * صوت روحاني جميل وهادئ غير مزعج نهائياً
 */
export function playNotificationTone(_type = 'gentle') {
  if (typeof window === 'undefined') return;

  try {
    const cached = getAudioInstance();
    if (cached) {
      cached.currentTime = 0;
      cached.volume = 0.45;
      const playPromise = cached.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          try {
            const fresh = new Audio('/audio/gentle_notification.wav');
            fresh.volume = 0.45;
            fresh.playsInline = true;
            fresh.play().catch(() => playGentleSynthesizedChime());
          } catch (e) {
            playGentleSynthesizedChime();
          }
        });
      }
      return;
    }

    const fresh = new Audio('/audio/gentle_notification.wav');
    fresh.volume = 0.45;
    fresh.playsInline = true;
    fresh.play().catch(() => playGentleSynthesizedChime());
  } catch (err) {
    playGentleSynthesizedChime();
  }
}

/**
 * فحص وإطلاق التنبيهات المستحقة للصلوات والأوراد اليومية
 */
export function checkAndTriggerDueNotifications(settings, triggeredMap = {}, onVisualAlert = null) {
  if (!settings || !settings.enabled) return triggeredMap;

  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  const todayKey = now.toISOString().split('T')[0];

  const updatedMap = { ...(triggeredMap || {}) };

  const items = [
    { key: 'fajr', title: 'صلاة الفجر', fallback: '04:45', body: 'الصلاة خير من النوم، حان موعد صلاة الفجر' },
    { key: 'dhuhr', title: 'صلاة الظهر', fallback: '12:00', body: 'حان الآن موعد صلاة الظهر، بادر إلى بيوت الله' },
    { key: 'asr', title: 'صلاة العصر', fallback: '15:15', body: 'حافظوا على الصلوات والصلاة الوسطى' },
    { key: 'maghrib', title: 'صلاة المغرب', fallback: '17:45', body: 'حان الآن موعد صلاة المغرب' },
    { key: 'isha', title: 'صلاة العشاء', fallback: '19:15', body: 'أقم صلاة العشاء والوتر قبل نومك' },
    { key: 'morningAdhkar', title: 'أذكار الصباح', fallback: '06:30', body: 'حصن نفسك بأذكار الصباح وبركة بداية اليوم' },
    { key: 'eveningAdhkar', title: 'أذكار المساء', fallback: '17:00', body: 'أقبل المساء، حافظ على وردك من أذكار المساء' },
    { key: 'dailyWird', title: 'الورد اليومي للقرآن', fallback: '21:00', body: 'لا تنسَ نصيبك من قراءة وحفظ كتاب الله اليوم' },
  ];

  for (const item of items) {
    const itemConfig = settings[item.key];
    const isEnabled = itemConfig?.enabled ?? true;
    const targetTime = itemConfig?.time || item.fallback;

    if (!isEnabled) continue;

    const triggerId = `${todayKey}_${item.key}_${targetTime}`;

    if (currentTimeStr === targetTime && !updatedMap[triggerId]) {
      updatedMap[triggerId] = true;
      const title = itemConfig?.title || item.title;
      const body = itemConfig?.body || item.body;

      sendLocalNotification(title, body, triggerId);
      playNotificationTone(item.key);

      if (typeof onVisualAlert === 'function') {
        onVisualAlert({
          id: triggerId,
          type: item.key,
          title,
          body,
          time: targetTime,
        });
      }
    }
  }

  return updatedMap;
}

/**
 * دالة لاختبار إشعار يخرج للموبايل بعد 5 ثوانٍ
 * تتيح للمستخدم الضغط على "تجربة"، ثم قفل شاشة الهاتف فوراً ليرى الإشعار يضيء الشاشة من الخارج
 */
export function scheduleTestNotification() {
  setTimeout(() => {
    sendLocalNotification(
      'تنبيه تجريبي من مُتَابِـع 🕌',
      'نجاح الاتصال! هذا الإشعار يظهر على شاشة قفل الموبايل وخارج التطبيق بنجاح.'
    );
  }, 5000);
}