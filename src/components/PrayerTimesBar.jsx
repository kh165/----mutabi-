import React, { useState, useEffect } from 'react';
import {
  Sunrise,
  Sun,
  SunMedium,
  Sunset,
  Moon,
  Compass,
  MapPin,
  Bell,
  BellRing,
  Volume2,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  fetchPrayerTimes,
  requestCurrentPosition,
  getLocalDateKey,
  applyPrayerTimes,
} from '../lib/prayerTimes.js';
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  sendLocalNotification,
  playNotificationTone,
  NOTIFICATION_DEFAULT_SETTINGS,
} from '../lib/notifications.js';

const PRAYERS_LIST = [
  { id: 'fajr', name: 'الفجر', icon: Sunrise, defaultTime: '04:45' },
  { id: 'dhuhr', name: 'الظهر', icon: Sun, defaultTime: '12:00' },
  { id: 'asr', name: 'العصر', icon: SunMedium, defaultTime: '15:15' },
  { id: 'maghrib', name: 'المغرب', icon: Sunset, defaultTime: '17:45' },
  { id: 'isha', name: 'العشاء', icon: Moon, defaultTime: '19:15' },
];

export function PrayerTimesBar({ userDoc, updateUserDoc }) {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [testingSound, setTestingSound] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(getNotificationPermissionStatus);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute for active prayer & countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const savedTimes = userDoc?.notifications || {};
  const location = userDoc?.prayerLocation;

  // Extract times for today
  const prayerTimes = {
    fajr: savedTimes.fajr?.time || '04:45',
    dhuhr: savedTimes.dhuhr?.time || '12:00',
    asr: savedTimes.asr?.time || '15:15',
    maghrib: savedTimes.maghrib?.time || '17:45',
    isha: savedTimes.isha?.time || '19:15',
  };

  // Convert "HH:MM" to minutes of day
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  // Find next upcoming prayer
  let nextPrayer = null;
  let minutesToNext = Infinity;

  for (const p of PRAYERS_LIST) {
    const pMinutes = toMinutes(prayerTimes[p.id]);
    const diff = pMinutes - currentMinutes;
    if (diff > 0 && diff < minutesToNext) {
      minutesToNext = diff;
      nextPrayer = { ...p, time: prayerTimes[p.id], diffMinutes: diff };
    }
  }

  // If all prayers today have passed, next is tomorrow's Fajr
  if (!nextPrayer) {
    const fajrMin = toMinutes(prayerTimes.fajr);
    const diff = 24 * 60 - currentMinutes + fajrMin;
    nextPrayer = {
      ...PRAYERS_LIST[0],
      time: prayerTimes.fajr,
      diffMinutes: diff,
      isTomorrow: true,
    };
  }

  // Determine current active prayer
  let activePrayerId = 'isha';
  if (currentMinutes >= toMinutes(prayerTimes.fajr) && currentMinutes < toMinutes(prayerTimes.dhuhr)) {
    activePrayerId = 'fajr';
  } else if (currentMinutes >= toMinutes(prayerTimes.dhuhr) && currentMinutes < toMinutes(prayerTimes.asr)) {
    activePrayerId = 'dhuhr';
  } else if (currentMinutes >= toMinutes(prayerTimes.asr) && currentMinutes < toMinutes(prayerTimes.maghrib)) {
    activePrayerId = 'asr';
  } else if (currentMinutes >= toMinutes(prayerTimes.maghrib) && currentMinutes < toMinutes(prayerTimes.isha)) {
    activePrayerId = 'maghrib';
  }

  const handleDetectLocation = async () => {
    setLoadingLocation(true);
    setErrorMsg(null);
    try {
      const coords = await requestCurrentPosition();
      const times = await fetchPrayerTimes(coords.latitude, coords.longitude);
      const dateKey = getLocalDateKey();
      const updatedNotifications = applyPrayerTimes(
        userDoc?.notifications || NOTIFICATION_DEFAULT_SETTINGS,
        times,
        dateKey
      );

      if (updateUserDoc) {
        await updateUserDoc({
          prayerLocation: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            updatedAt: new Date().toISOString(),
          },
          notifications: updatedNotifications,
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'تعذر تحديد الموقع الجغرافي');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    const newStatus = res.permission || (res.granted ? 'granted' : 'denied');
    setPermissionStatus(newStatus);

    if (res.granted) {
      if (updateUserDoc) {
        const currentNotifs = userDoc?.notifications || NOTIFICATION_DEFAULT_SETTINGS;
        await updateUserDoc({
          notifications: {
            ...currentNotifs,
            enabled: true,
          },
        });
      }
      playNotificationTone();
      // Send a welcoming confirmation notification to test mobile reception
      await sendLocalNotification(
        'تم تفعيل تنبيهات الصلاة بنجاح 🕌',
        'ستصلك إشعارات الأذان مباشرة على شاشة هاتفك عند دخول وقت كل صلاة بإذن الله.',
        'welcome_notif'
      );
    }
  };

  const [testingChime, setTestingChime] = useState(false);

  const handleTestAdhanSound = (e) => {
    e?.stopPropagation?.();
    // 1. تشغيل فوري ومتزامن فوراً عند اللمس لضمان موافقة متصفحات الموبايل (User Gesture)
    playNotificationTone('adhan');
    setTestingSound(true);

    // 2. إرسال إشعار النظام بشكل متوازي مع ملف الصوت المناسب
    sendLocalNotification(
      'الله أكبر • تجربة أذان وإشعار الصلاة 🕌',
      'صوت الأذان يعمل بأعلى درجات النقاء، والإشعارات جاهزة للتنبيه على هاتفك.',
      'test_adhan',
      'adhan'
    ).catch(() => {});

    setTimeout(() => setTestingSound(false), 3000);
  };

  const handleTestChimeSound = (e) => {
    e?.stopPropagation?.();
    // 1. تشغيل فوري متزامن لنغمة التنبيهات
    playNotificationTone('chime');
    setTestingChime(true);

    // 2. إرسال إشعار النظام مع نغمة الأذكار
    sendLocalNotification(
      'أذكار الصباح والمساء • تجربة التنبيه 🌿',
      'نغمة التنبيهات والأذكار تعمل بنقاء عالٍ، جاهزة لإشعارك في شريط الهاتف.',
      'test_chime',
      'chime'
    ).catch(() => {});

    setTimeout(() => setTestingChime(false), 2500);
  };

  const formatCountdown = (mins) => {
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    if (hours > 0) {
      return `${hours} ساعة و ${m} دقيقة`;
    }
    return `${m} دقيقة`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4 text-right">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 shrink-0">
            <Compass className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                مواقيت الصلاة حسب موقعك الجغرافي
              </h3>
              {location && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  موقعك مفعل
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مواقيت دقيقة محسوبة فلكياً مع تنبيهات الأذان الحي على الهاتف.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Location button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={loadingLocation}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="تحديث مواقيت الصلاة من موقعك الحالي"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLocation ? 'animate-spin' : ''}`} />
            <span>{loadingLocation ? 'جارٍ التحديد...' : location ? 'تحديث الموقع' : 'تحديد موقعي 📍'}</span>
          </button>

          {/* Test Adhan Sound button */}
          <button
            type="button"
            onClick={handleTestAdhanSound}
            disabled={testingSound}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="تجربة صوت الأذان العالي (الله أكبر الله أكبر)"
          >
            <Volume2 className={`w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 ${testingSound ? 'animate-bounce' : ''}`} />
            <span>{testingSound ? 'أذان 🔊' : 'أذان الأوقات'}</span>
          </button>

          {/* Test General Notification Chime button */}
          <button
            type="button"
            onClick={handleTestChimeSound}
            disabled={testingChime}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="تجربة نغمة الأذكار والتنبيهات الأخرى"
          >
            <Bell className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ${testingChime ? 'animate-bounce' : ''}`} />
            <span>{testingChime ? 'نغمة 🔔' : 'نغمة الأذكار'}</span>
          </button>

          {/* Phone Notification permission button */}
          {permissionStatus === 'granted' ? (
            <span
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] sm:text-xs font-bold flex items-center gap-1.5"
              title="الإشعارات مفعلة على هذا الهاتف"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>الإشعارات مفعّلة 🔔</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
              title="تفعيل الإشعارات على الهاتف"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>تفعيل الإشعارات</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active & Next Prayer Highlight Banner */}
      {nextPrayer && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="font-bold text-emerald-900 dark:text-emerald-200 text-[11px] sm:text-xs">
              الصلاة القادمة: <strong className="text-emerald-700 dark:text-emerald-400 font-black">صلاة {nextPrayer.name}</strong> في {nextPrayer.time}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs text-[11px] sm:text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>باقي على الأذان: {formatCountdown(nextPrayer.diffMinutes)}</span>
          </div>
        </div>
      )}

      {/* The 5 Prayers Row - Unified 5-column responsive row */}
      <div className="grid grid-cols-5 gap-1 sm:gap-2.5 md:gap-3">
        {PRAYERS_LIST.map((prayer) => {
          const Icon = prayer.icon;
          const time = prayerTimes[prayer.id];
          const isCurrentActive = activePrayerId === prayer.id;
          const isNext = nextPrayer?.id === prayer.id;

          return (
            <div
              key={prayer.id}
              className={`p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all text-center flex flex-col items-center justify-center gap-0.5 sm:gap-1 relative overflow-hidden min-h-[66px] sm:min-h-[85px] ${
                isCurrentActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs scale-[1.02] font-bold'
                  : isNext
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {isCurrentActive && (
                <span className="hidden sm:inline absolute top-1 start-1 text-[8px] sm:text-[9px] bg-white text-emerald-800 font-black px-1.5 py-0.2 rounded-full">
                  الآن
                </span>
              )}
              {isNext && (
                <span className="hidden sm:inline absolute top-1 start-1 text-[8px] sm:text-[9px] bg-amber-500 text-white font-black px-1.5 py-0.2 rounded-full">
                  القادمة
                </span>
              )}

              <Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${isCurrentActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span className="text-[10px] sm:text-xs font-bold leading-tight truncate">{prayer.name}</span>
              <span className={`text-[11px] sm:text-sm md:text-base font-black tabular-nums ${isCurrentActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {time}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
