import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
import prayerMethodMapping from '../../shared/prayer-methods.cjs';
const PRAYER_TIME_KEYS = {
  Fajr: 'fajr',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
};


function getLocalCalculationParameters(method, timezone) {
  const methodName = prayerMethodMapping.METHOD_NAMES[prayerMethodMapping.resolvePrayerMethod(method, timezone)];
  return CalculationMethod[methodName]();
}
function formatLocalPrayerTimes(latitude, longitude, date, method, timezone) {
  const coordinates = new Coordinates(latitude, longitude);
  const calculated = new PrayerTimes(coordinates, date, getLocalCalculationParameters(method, timezone));
  const format = (value) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return { fajr: format(calculated.fajr), dhuhr: format(calculated.dhuhr), asr: format(calculated.asr), maghrib: format(calculated.maghrib), isha: format(calculated.isha) };
}
/** @param {string} timezone @returns {number} */
/** @param {string} timezone @returns {number} */
export function getCalculationMethod(timezone) {
  return prayerMethodMapping.resolvePrayerMethod('auto', timezone);
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * @param {number} latitude
 * @param {number} longitude
 * @param {Date} date
 * @param {string | number} method Prayer method ID or 'auto'.
 * @param {string} [timezone]
 * @returns {Promise<{fajr:string,dhuhr:string,asr:string,maghrib:string,isha:string}>}
 */
export async function fetchPrayerTimes(latitude, longitude, date = new Date(), method = 'auto', timezone) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('إحداثيات الموقع غير صالحة');
  }

  const datePath = `${String(date.getDate()).padStart(2, '0')}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}-${date.getFullYear()}`;
  const url = new URL(`https://api.aladhan.com/v1/timings/${datePath}`);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  const resolvedMethod = prayerMethodMapping.resolvePrayerMethod(method, timezone);
  url.searchParams.set('method', String(prayerMethodMapping.ALADHAN_API_METHODS[resolvedMethod] || resolvedMethod));

  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    console.warn('Prayer API unavailable; calculated prayer times locally.', networkError);
    return formatLocalPrayerTimes(latitude, longitude, date, resolvedMethod, timezone);
  }
  if (!response.ok) {
    console.warn('Prayer API returned an error; calculated prayer times locally.');
    return formatLocalPrayerTimes(latitude, longitude, date, resolvedMethod, timezone);
  }

  const result = await response.json();
  if (result.code !== 200 || !result.data?.timings) {
    throw new Error('استجابة مواقيت الصلاة غير مكتملة');
  }

  const readTime = (apiName, settingKey) => {
    const time = result.data.timings[apiName]?.split(' ')[0];
    if (!/^\d{2}:\d{2}$/.test(time || '')) {
      throw new Error(`وقت صلاة ${settingKey} غير صالح`);
    }
    return time;
  };

  return {
    fajr: readTime('Fajr', 'fajr'),
    dhuhr: readTime('Dhuhr', 'dhuhr'),
    asr: readTime('Asr', 'asr'),
    maghrib: readTime('Maghrib', 'maghrib'),
    isha: readTime('Isha', 'isha'),
  };
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
