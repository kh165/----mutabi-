import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLogs } from '../hooks/useLogs.js';
import { useActivities } from '../hooks/useActivities.js';
import { exportToCSV } from '../lib/csv.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import {
  NOTIFICATION_DEFAULT_SETTINGS,
  requestNotificationPermission,
  sendLocalNotification,
  playNotificationTone,
} from '../lib/notifications.js';
import {
  User,
  Mail,
  Clock,
  Palette,
  Download,
  Check,
  AlertCircle,
  LogOut,
  Shield,
  Sun,
  Moon,
  Bell,
  BellRing,
  Volume2,
} from 'lucide-react';
import { Logo } from '../components/layout/Logo.jsx';

const TIMEZONES = [
  { value: 'Africa/Cairo', label: 'القاهرة (GMT+2 / GMT+3)' },
  { value: 'Asia/Riyadh', label: 'مكة المكرمة / الرياض (GMT+3)' },
  { value: 'Asia/Dubai', label: 'دبي / أبوظبي (GMT+4)' },
  { value: 'Asia/Amman', label: 'عمّان / القدس (GMT+3)' },
  { value: 'Africa/Casablanca', label: 'الدار البيضاء / الرباط (GMT+1)' },
  { value: 'Europe/London', label: 'لندن (GMT+0 / GMT+1)' },
  { value: 'America/New_York', label: 'نيويورك (GMT-5 / GMT-4)' },
];

export function Profile() {
  const { user, userDoc, logout, isAdmin, updateUserDoc } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const { logs } = useLogs();
  const { activities } = useActivities(true);

  const [displayName, setDisplayName] = useState(userDoc?.displayName || '');
  const [timezone, setTimezone] = useState(userDoc?.timezone || 'Africa/Cairo');
  const [notifications, setNotifications] = useState(
    userDoc?.notifications || NOTIFICATION_DEFAULT_SETTINGS
  );
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleToggleNotifications = async () => {
    if (!notifications.enabled) {
      const res = await requestNotificationPermission();
      if (!res.granted) {
        setError('يرجى السماح بإشعارات المتصفح حتى تتمكن من استلام التنبيهات');
        return;
      }
      setNotifications((prev) => ({ ...prev, enabled: true }));
      sendLocalNotification(
        'تم تفعيل تنبيهات مُتَابِـع 🕌',
        'ستصلك إشعارات وتنبيهات الصلوات والأذكار في مواعيدها المحددة بإذن الله'
      );
    } else {
      setNotifications((prev) => ({ ...prev, enabled: false }));
    }
  };

  const handleTestNotification = () => {
    playNotificationTone();
    const success = sendLocalNotification(
      'تنبيه تجريبي من منصة مُتَابِـع 🔔',
      'الصلاة خير من النوم، موعد صلاتك ووردك اليومي جاهز.'
    );
    if (!success) {
      setError('يرجى التحقق من إذن الإشعارات في متصفحك');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      if (updateUserDoc) {
        await updateUserDoc({
          displayName: displayName.trim(),
          timezone,
          notifications,
        });
      } else {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: displayName.trim(),
          timezone,
          notifications,
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  const handleExportMyData = () => {
    const actMap = new Map(activities.map((a) => [a.id, a.title]));
    const headers = ['التاريخ', 'اسم النشاط', 'الكمية', 'مكتمل', 'ملاحظة', 'تفاصيل إضافية'];
    const rows = logs.map((l) => [
      l.date,
      actMap.get(l.activityId) || l.activityId,
      l.amount,
      l.completed ? 'نعم' : 'لا',
      l.note || '',
      JSON.stringify(l.details || {}),
    ]);
    exportToCSV(`mutabi_export_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-right">
      {/* Header Profile Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-600 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
          {(userDoc?.displayName?.[0] || user?.email?.[0] || 'م').toUpperCase()}
        </div>
        <div className="text-center sm:text-right flex-1 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
              {userDoc?.displayName || 'مستخدم مُتَابِع'}
            </h2>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                <Shield className="w-3 h-3 text-emerald-600" />
                مشرف معتمد
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1" dir="ltr">
            {user?.email}
          </p>
          <div className="mt-3 flex items-center justify-center sm:justify-start gap-3">
            <Logo className="h-6" />
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <h3 className="font-bold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
          إعدادات الحساب والتفضيلات
        </h3>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>الاسم الظاهر في المنصة</span>
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Email Read-only */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>البريد الإلكتروني المسجل</span>
          </label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium cursor-not-allowed"
            dir="ltr"
          />
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>المنطقة الزمنية (لتحديد بداية ونهاية اليوم بدقة)</span>
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value} className="dark:bg-slate-900">
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Preference */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span>مظهر المنصة (المظهر الفاتح / الداكن)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                !isDark
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-xs">الوضع الفاتح</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 ${
                isDark
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-xs">الوضع الداكن</span>
            </button>
          </div>
        </div>

        {/* Web Notifications System Settings */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  نظام التنبيهات المحلي (إشعارات المتصفح)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  تنبيهات صوتية حقيقية للصلوات الخمس والأذكار والورد القرآني في مواعيدها
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                notifications.enabled
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {notifications.enabled ? 'مفعّلة ✓' : 'تفعيل التنبيهات'}
            </button>
          </div>

          {notifications.enabled && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ضبط مواعيد التنبيهات اليومية:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playNotificationTone()}
                    className="text-[11px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-1 cursor-pointer transition-colors"
                    title="استماع لصوت التنبيه الموحد"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>سماع النغمة 🔊</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>إرسال إشعار تجريبي 🔔</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { key: 'fajr', label: 'الفجر' },
                  { key: 'dhuhr', label: 'الظهر' },
                  { key: 'asr', label: 'العصر' },
                  { key: 'maghrib', label: 'المغرب' },
                  { key: 'isha', label: 'العشاء' },
                  { key: 'morningAdhkar', label: 'أذكار الصباح' },
                  { key: 'eveningAdhkar', label: 'أذكار المساء' },
                  { key: 'dailyWird', label: 'ورد القرآن الكريم' },
                ].map(({ key, label }) => {
                  const item = notifications[key] || {};
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
                    >
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={item.enabled ?? true}
                          onChange={(e) =>
                            setNotifications((prev) => ({
                              ...prev,
                              [key]: { ...prev[key], enabled: e.target.checked },
                            }))
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{label}</span>
                      </label>
                      <input
                        type="time"
                        value={item.time || '12:00'}
                        onChange={(e) =>
                          setNotifications((prev) => ({
                            ...prev,
                            [key]: { ...prev[key], time: e.target.value },
                          }))
                        }
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                        dir="ltr"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تم حفظ التعديلات وإعدادات التنبيهات بنجاح في قاعدة البيانات!</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </form>

      {/* Export & Data Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير بياناتي الشخصية</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            يمكنك تنزيل نسخة من جميع سجلاتك وقراءاتك بصيغة Excel معرّبة (CSV).
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportMyData}
          className="py-2.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تنزيل ملف الإنجازات (CSV)</span>
        </button>
      </div>

      {/* Logout Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            تسجيل الخروج من الحساب
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            الخروج الآمن من المنصة على هذا الجهاز.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="py-2.5 px-4 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-red-200 dark:border-red-900"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}
