const PRAYER_TIME_KEYS = {
  Fajr: 'fajr',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
};

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchPrayerTimes(latitude, longitude, date = new Date()) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('إحداثيات الموقع غير صالحة');
  }

  const datePath = `${String(date.getDate()).padStart(2, '0')}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${date.getFullYear()}`;
  const url = new URL(`https://api.aladhan.com/v1/timings/${datePath}`);
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('method', '5');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`تعذر جلب مواقيت الصلاة (HTTP ${response.status})`);
  }

  const result = await response.json();
  if (result.code !== 200 || !result.data?.timings) {
    throw new Error('استجابة مواقيت الصلاة غير مكتملة');
  }

  return Object.fromEntries(
    Object.entries(PRAYER_TIME_KEYS).map(([apiName, settingKey]) => {
      const time = result.data.timings[apiName]?.split(' ')[0];
      if (!/^\d{2}:\d{2}$/.test(time || '')) {
        throw new Error(`وقت صلاة ${settingKey} غير صالح`);
      }
      return [settingKey, time];
    })
  );
}

export function requestCurrentPosition() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('متصفحك لا يدعم تحديد الموقع'));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'يرجى السماح بالوصول إلى موقعك لحساب مواقيت الصلاة'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'تعذر تحديد موقعك الحالي'
              : 'انتهت مهلة تحديد الموقع، حاول مرة أخرى';
        reject(new Error(message));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60 * 60 * 1000 }
    );
  });
}

export function applyPrayerTimes(notifications, prayerTimes, dateKey) {
  const updated = { ...notifications };
  for (const [key, time] of Object.entries(prayerTimes)) {
    updated[key] = { ...updated[key], time };
  }
  updated.prayerTimesDate = dateKey;
  return updated;
}
