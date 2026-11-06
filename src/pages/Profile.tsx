import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLogs } from '../hooks/useLogs';
import { useActivities } from '../hooks/useActivities';
import { exportToCSV } from '../lib/csv';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  User,
  Mail,
  Clock,
  Palette,
  Download,
  Trash2,
  Check,
  AlertCircle,
  LogOut,
  Shield,
} from 'lucide-react';

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
  const { user, userDoc, logout, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { logs } = useLogs();
  const { activities } = useActivities(true);

  const [displayName, setDisplayName] = useState(userDoc?.displayName || '');
  const [timezone, setTimezone] = useState(userDoc?.timezone || 'Africa/Cairo');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        timezone,
        theme,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحديث الملف الشخصي');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const actMap = new Map(activities.map((a) => [a.id, a.title]));
    const headers = ['التاريخ', 'اسم النشاط', 'الكمية', 'مكتمل؟', 'تفاصيل الحفظ/القراءة', 'ملاحظات'];
    const rows = logs.map((log) => [
      log.date,
      actMap.get(log.activityId) || log.activityId,
      log.amount,
      log.completed ? 'نعم' : 'لا',
      log.details?.surah
        ? `سورة ${log.details.surah} (${log.details.fromAyah}-${log.details.toAyah})`
        : log.details?.fromPage
        ? `صفحات ${log.details.fromPage}-${log.details.toPage}`
        : '',
      log.note || '',
    ]);

    exportToCSV(`mutabi_my_logs_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mutabi_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 text-right">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          الملف الشخصي والإعدادات ⚙️
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          إدارة اسمك، توقيتك المعتمد لحساب اليوم، وتصدير بياناتك
        </p>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span>المعلومات الأساسية</span>
        </h3>

        {/* Display Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            الاسم المعروض
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>

        {/* Email Readonly */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            البريد الإلكتروني
          </label>
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-500 text-sm">
            <Mail className="w-4 h-4 text-slate-400" />
            <span dir="ltr">{user?.email || userDoc?.email || 'بدون بريد'}</span>
            {isAdmin && (
              <span className="ms-auto text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Shield className="w-3 h-3" />
                مشرف عام
              </span>
            )}
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            المنطقة الزمنية (لتحديد بداية ونهاية اليوم بدقة)
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Theme Preference: Clean Light Mode */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            مظهر المنصة
          </label>
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">☀️</span>
              <span className="text-xs font-bold text-emerald-900">
                الوضع الفاتح المريح للعين (الافتراضي والوحيد)
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
              مفعّل دائماً
            </span>
          </div>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
            <Check className="w-4 h-4" />
            <span>تم حفظ التغييرات بنجاح!</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
        </button>
      </form>

      {/* Data Export Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-sky-600" />
          <span>النسخ الاحتياطي وتصدير البيانات</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          بياناتك ملك لك دائمًا. يمكنك تحميل نسخة كاملة من سجلاتك بصيغة جدول Excel (CSV) أو ملف JSON تقني.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>تصدير ملف Excel (CSV)</span>
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Logout button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={logout}
          className="w-full py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج من الحساب</span>
        </button>
      </div>
    </div>
  );
}
