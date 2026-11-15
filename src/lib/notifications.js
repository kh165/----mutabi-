import { getLocalDateKey } from './prayerTimes.js';
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
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  let permission = Notification.permission;
  if (permission === 'default') {
    try { permission = await Notification.requestPermission(); } catch { return false; }
  }
  if (permission !== 'granted') return false;
  const options = {
    body, icon: '/pwa-192x192.png', badge: '/favicon-32x32.png', tag: tag || 'mutabi_alert',
    renotify: true, requireInteraction: false, dir: 'rtl', lang: 'ar', vibrate: [150, 80, 150],
    data: { url: '/', soundType, dateOfArrival: Date.now() },
    actions: [{ action: 'open', title: 'فتح مُتَابِـع' }],
  };
  try {
    if ('serviceWorker' in navigator) {
      let registration = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (!registration) registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
      ]).catch(() => null);
      if (registration?.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }
    const notification = new Notification(title, options);
    notification.onclick = function () { window.focus(); this.close(); };
    return true;
  } catch (error) {
    console.warn('تعذر إظهار إشعار النظام على هذا الجهاز:', error);
    return false;
  }
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

const notificationAudio = {};
let notificationAudioContext = null;
function getAudioInstance(type = 'gentle') {
  try {
    if (!notificationAudio[type]) {
      const source = type === 'adhan' ? (HUSSARY_ADHAN_AUDIO_DATA_URI || ADHAN_AUDIO_DATA_URI) : CHIME_AUDIO_DATA_URI;
      notificationAudio[type] = new Audio(source);
      notificationAudio[type].volume = 0.45;
      notificationAudio[type].playsInline = true;
    }
    return notificationAudio[type];
  } catch {
    return null;
  }
}

// تشغيل نغمة روحانية عذبة وهادئة ومريحة عبر Web Audio API
function playGentleSynthesizedChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    notificationAudioContext ||= new AudioContextClass();
    const ctx = notificationAudioContext;
    if (ctx.state === 'suspended') void ctx.resume();
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
  } catch {
  }
}

// Mobile Audio unlocker: يجهز القنوات الصوتية تلقائياً عند أول لمسة على الشاشة
if (typeof window !== 'undefined') {
  const unlockAudioPipeline = () => {
    try {
      const gentleAudio = getAudioInstance();
      if (gentleAudio && typeof gentleAudio.load === 'function') gentleAudio.load();
    } catch {
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
export function playNotificationTone(type = 'gentle') {
  if (typeof window === 'undefined') return;

  try {
    const audioType = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'adhan'].includes(type) ? 'adhan' : 'gentle';
    const cached = getAudioInstance(audioType);
    if (cached) {
      cached.currentTime = 0;
      cached.volume = 0.45;
      const playPromise = cached.play();
      if (playPromise !== undefined && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          try {
            const fresh = new Audio(audioType === 'adhan' ? HUSSARY_ADHAN_AUDIO_DATA_URI : '/audio/gentle_notification.wav');
            fresh.volume = 0.45;
            fresh.playsInline = true;
            fresh.play().catch(() => playGentleSynthesizedChime());
          } catch {
            playGentleSynthesizedChime();
          }
        });
      }
      return;
    }

    const fresh = new Audio(audioType === 'adhan' ? HUSSARY_ADHAN_AUDIO_DATA_URI : '/audio/gentle_notification.wav');
    fresh.volume = 0.45;
    fresh.playsInline = true;
    fresh.play().catch(() => playGentleSynthesizedChime());
  } catch {
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
  const todayKey = getLocalDateKey(now);

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

      void sendLocalNotification(title, body, triggerId);
      playNotificationTone(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(item.key) ? 'adhan' : 'gentle');

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
