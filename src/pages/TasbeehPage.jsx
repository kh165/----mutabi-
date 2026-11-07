import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLogs } from '../hooks/useLogs.js';
import { TasbeehCounter } from '../components/TasbeehCounter.jsx';
import { getTodayDateString, formatArabicDate } from '../lib/dates.js';
import { Heart, CheckCircle2, X } from 'lucide-react';

export function TasbeehPage() {
  const { userDoc } = useAuth();
  const todayStr = getTodayDateString(userDoc?.timezone);
  const { logs, saveLog } = useLogs();
  const [successBanner, setSuccessBanner] = useState(null);

  // Find existing tasbeeh log for today if any
  const todayTasbeehLog = logs.find(
    (l) => l.date === todayStr && (l.activityId === 'tasbeeh' || l.activityId.startsWith('tasbeeh_'))
  );

  const initialCount = todayTasbeehLog?.amount || 0;

  const handleSaveTasbeeh = async (count, dhikrTitle) => {
    try {
      await saveLog(
        'tasbeeh',
        todayStr,
        count,
        count > 0,
        {
          dhikr: dhikrTitle,
          updatedAt: new Date().toISOString(),
        },
        dhikrTitle || 'تسبيح وأذكار'
      );
      setSuccessBanner(`تقبل الله منك! تم حفظ ${count} تسبيحة في ميزان حسناتك وسجلك اليومي بنجاح.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      console.error('Error saving tasbeeh:', err);
    }
  };

  return (
    <div className="space-y-6 text-right max-w-4xl mx-auto">
      {/* Success Banner */}
      {successBanner && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-3xl p-4 flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="w-7 h-7 rounded-full hover:bg-emerald-200/50 flex items-center justify-center text-emerald-800 dark:text-emerald-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Intro Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
            <Heart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{formatArabicDate(todayStr, true)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            قسم التسبيح وحصن المسلم 📿
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            مساحة مخصصة ومريحة للتسبيح اليومي، قراءة أذكار الصباح والمساء كاملة مع التكرار والفضائل، وتوثيق أورادك في قاعدة البيانات.
          </p>
        </div>
      </div>

      {/* Standalone Tasbeeh Counter & Adhkar */}
      <TasbeehCounter
        todayStr={todayStr}
        initialCount={initialCount}
        onSaveCount={handleSaveTasbeeh}
      />
    </div>
  );
}
