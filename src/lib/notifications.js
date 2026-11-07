/**
 * نظام التنبيهات المحلي الحقيقي (Web Notifications API)
 * يدعم طلب الإذن، فحص التوقيت الدقيق، وإرسال إشعارات الصلوات والأذكار
 */

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

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return { granted: false, error: 'المتصفح لا يدعم التنبيهات' };
  }
  try {
    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted', permission };
  } catch (err) {
    return { granted: false, error: err?.message };
  }
}

export function sendLocalNotification(title, body, tag = 'mutabi_worship') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }
  try {
    const notification = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon-48x48.png',
      tag,
      dir: 'rtl',
      lang: 'ar',
      silent: false,
    });

    notification.onclick = function () {
      window.focus();
      this.close();
    };
    return true;
  } catch (err) {
    console.error('Error creating local notification:', err);
    return false;
  }
}

/**
 * فحص الدقائق الحالية وتشغيل التنبيه عند حلول الموعد المحدد
 */
export function checkAndTriggerDueNotifications(settings, lastTriggeredMap = {}) {
  if (!settings || !settings.enabled) return lastTriggeredMap;

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${hours}:${minutes}`;
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const updatedMap = { ...lastTriggeredMap };

  const items = [
    { key: 'fajr', ...settings.fajr },
    { key: 'dhuhr', ...settings.dhuhr },
    { key: 'asr', ...settings.asr },
    { key: 'maghrib', ...settings.maghrib },
    { key: 'isha', ...settings.isha },
    { key: 'morningAdhkar', ...settings.morningAdhkar },
    { key: 'eveningAdhkar', ...settings.eveningAdhkar },
    { key: 'dailyWird', ...settings.dailyWird },
  ];

  items.forEach((item) => {
    if (item && item.enabled && item.time === currentTimeStr) {
      const triggerKey = `${item.key}_${todayStr}_${currentTimeStr}`;
      if (!updatedMap[triggerKey]) {
        sendLocalNotification(item.title, item.body, item.key);
        updatedMap[triggerKey] = true;
      }
    }
  });

  return updatedMap;
}
