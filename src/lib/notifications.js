/**
 * نظام التنبيهات وإشعارات مواقيت الصلاة (Web Notifications API + Service Worker + صوت أذان عالي ونقي)
 * يرسل إشعارات حقيقية لهاتف وجهاز المستخدم خارج التطبيق
 */

// إعدادات التنبيهات الافتراضية لمواقيت الصلاة
export const NOTIFICATION_DEFAULT_SETTINGS = {
  enabled: true,
  soundEnabled: true,
  fajr: { enabled: true, time: '04:45', title: 'حان الآن موعد صلاة الفجر 🌅', body: 'الصلاة خير من النوم، بادر لأداء فرض الفجر في وقته لنيل بركة اليوم' },
  dhuhr: { enabled: true, time: '12:00', title: 'حان الآن موعد صلاة الظهر ☀️', body: 'أقبل وقت صلاة الظهر، أرحنا بها وبادر لبيوت الله' },
  asr: { enabled: true, time: '15:15', title: 'حان الآن موعد صلاة العصر 🌤️', body: '«حافظوا على الصلوات والصلاة الوسطى» • وقت صلاة العصر' },
  maghrib: { enabled: true, time: '17:45', title: 'حان الآن موعد صلاة المغرب 🌇', body: 'أقبل ليل الله وأدبر نهاره، حان وقت صلاة المغرب' },
  isha: { enabled: true, time: '19:15', title: 'حان الآن موعد صلاة العشاء 🌙', body: 'حان موعد صلاة العشاء وسنة الوتر، استعن بها على ختام يومك' },
  morningAdhkar: { enabled: true, time: '06:30', title: 'أذكار الصباح المباركة 📿', body: 'حصن نفسك بذكر الله في أول النهار لتكن في حفظه ورعايته' },
  eveningAdhkar: { enabled: true, time: '17:00', title: 'أذكار المساء وحصن المسلم 📿', body: 'أقبل المساء، حافظ على وردك المبارك من أذكار المساء' },
  dailyWird: { enabled: true, time: '21:00', title: 'ورد تلاوة القرآن الكريم 📖', body: '«أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ» • لا تنس نصيبك اليومي من كتاب الله' },
};

/**
 * تشغيل صوت الأذان بصوت جميل وعالي ومريح للأذن
 * يدمج بين نداء تكبيرات الأذان والتوليد التوافقي (Harmonic Adhan Tone) بمقام البياتي ذي الرنين العالي
 */
export function playNotificationTone(isLoud = true) {
  if (typeof window === 'undefined') return;

  // 1. محاولة تشغيل مقطع التكبير الصوتي النقي أولاً
  try {
    const audioUrl = 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3';
    const audio = new Audio(audioUrl);
    audio.volume = isLoud ? 1.0 : 0.7;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // إيقاف التلاوة بعد 5 ثوانٍ ليكون تنبيهاً خفيفاً وجميلاً
          setTimeout(() => {
            audio.pause();
          }, 5000);
        })
        .catch(() => {
          // تشغيل الصوت التوافقي المدمج كبديل فوري في حال تعذر تشغيل الصوت الشبكي
          playSynthesizedAdhanChime(isLoud);
        });
      return;
    }
  } catch {
    playSynthesizedAdhanChime(isLoud);
  }

  playSynthesizedAdhanChime(isLoud);
}

/**
 * مولد نغمة الأذان التوافقية العالية النقاء بتقنية Web Audio API
 * نغمات متتالية تمثل مدخل تكبيرات الأذان (الله أكبر - الله أكبر) بصوت جهير ورنان
 */
function playSynthesizedAdhanChime(isLoud = true) {
  let ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    ctx = new AudioContext();

    const maxVolume = isLoud ? 0.85 : 0.45;
    const now = ctx.currentTime;

    // سلم نغمات الأذان الإسلامية (D4, F4, G4, A4, D5) برنين إيماني عالي
    const adhanNotes = [
      { freq: 293.66, delay: 0.0, dur: 0.6 },  // D4 (الله)
      { freq: 349.23, delay: 0.5, dur: 0.8 },  // F4 (أكـ)
      { freq: 440.00, delay: 1.1, dur: 1.2 },  // A4 (ــبر)
      { freq: 392.00, delay: 2.2, dur: 0.7 },  // G4 (الله)
      { freq: 440.00, delay: 2.8, dur: 0.8 },  // A4 (أكـ)
      { freq: 587.33, delay: 3.5, dur: 1.6 },  // D5 (ــبر)
    ];

    adhanNotes.forEach(({ freq, delay, dur }) => {
      const start = now + delay;

      // مذبذب أساسي Sine
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, start);

      // مذبذب توافقي Triangle لإعطاء رنين عميق ودافئ
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, start); // الأوكتاف التوافقي

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      // تصعيد الصوت فورياً ليصبح عالياً ومسموعاً
      gain.gain.linearRampToValueAtTime(maxVolume, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + dur + 0.1);
      osc2.stop(start + dur + 0.1);
    });

    window.setTimeout(() => {
      if (ctx && ctx.state !== 'closed') ctx.close();
    }, 6000);
  } catch (e) {
    console.warn('Synthesizer adhan failed:', e);
    if (ctx && ctx.state !== 'closed') ctx.close();
  }
}

/**
 * فحص حالة إذن الإشعارات الحالية من المتصفح
 */
export function getNotificationPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * طلب إذن إشعارات النظام على الهاتف أو المتصفح
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
 * إرسال إشعار نظام حقيقي على هاتف أو جهاز المستخدم
 * يستخدم Service Worker showNotification حتى يظهر في شريط إشعارات الهاتف مباشرة خارج التطبيق
 */
export async function sendLocalNotification(title, body, tag = 'mutabi_prayer', sound = true) {
  if (sound) {
    playNotificationTone(true);
  }

  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false;
  }

  const options = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag,
    dir: 'rtl',
    lang: 'ar',
    silent: false,
    requireInteraction: true,
    vibrate: [500, 200, 500, 200, 500],
    data: { url: '/' },
  };

  try {
    // الطريقة المعتمدة للهواتف (PWA / Mobile Chrome / Safari 16.4+)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    }

    // بديل للأجهزة المكتبية
    const notification = new Notification(title, options);
    notification.onclick = function () {
      window.focus();
      this.close();
    };
    return true;
  } catch (err) {
    console.error('Error sending mobile system notification:', err);
    try {
      new Notification(title, options);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * فحص الدقائق الحالية وتشغيل التنبيه عند حلول الموعد المحدد
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
        // 1. تشغيل صوت الأذان العالي والجميل
        if (settings.soundEnabled !== false) {
          playNotificationTone(true);
        }

        // 2. إرسال إشعار الهاتف الخارجي
        sendLocalNotification(item.title, item.body, item.key, false);

        // 3. إشعار مرئي مميز داخل التطبيق
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
