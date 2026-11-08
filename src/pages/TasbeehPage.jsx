import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLogs } from '../hooks/useLogs.js';
import { useActivities } from '../hooks/useActivities.js';
import { TasbeehCounter } from '../components/TasbeehCounter.jsx';
import { getTodayDateString, formatArabicDate } from '../lib/dates.js';
import { Heart, CheckCircle2, X } from 'lucide-react';

export function TasbeehPage() {
  const { userDoc } = useAuth();
  const todayStr = getTodayDateString(userDoc?.timezone);
  const { logs, saveLog } = useLogs();
  const { activities } = useActivities(false);
  const [successBanner, setSuccessBanner] = useState(null);

  // نستخدم نفس نشاط "عداد التسبيح" الموجود في الصفحة الرئيسية حتى تتطابق الأرقام في الصفحتين
  const tasbeehActivity = activities.find((a) => a.title?.includes('التسبيح'));
  const tasbeehId = tasbeehActivity?.id || 'tasbeeh';
  const adhkarActivity = activities.find(
    (a) => a.id !== tasbeehId && a.title?.includes('أذكار')
  );

  const todayTasbeehLog =
    logs.find((l) => l.date === todayStr && l.activityId === tasbeehId) ||
    logs.find((l) => l.date === todayStr && l.activityId === 'tasbeeh');

  const initialCount = todayTasbeehLog?.amount || 0;
  const initialCounterState = todayTasbeehLog?.details?.counter || null;
  const dailyTarget =
    userDoc?.customTargets?.[tasbeehId] ?? tasbeehActivity?.dailyTarget ?? 1;

  const persist = async (count, dhikrTitle, counterState) => {
    const counter = counterState || todayTasbeehLog?.details?.counter || null;
    await saveLog(
      tasbeehId,
      todayStr,
      count,
      count > 0 && count >= dailyTarget,
      {
        dhikr: dhikrTitle || 'تسبيح وأذكار',
        ...(counter ? { counter } : {}),
        updatedAt: new Date().toISOString(),
      },
      dhikrTitle || 'تسبيح وأذكار'
    );
  };

  // حفظ تلقائي مؤجّل (debounce) حتى لا نكتب في Firestore مع كل نقرة
  const pendingRef = useRef(null);
  const timerRef = useRef(null);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const flushPending = () => {
    clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return Promise.resolve();
    return persistRef.current(...pending);
  };

  const handleCountChange = (total, title, counterState) => {
    pendingRef.current = [total, title, counterState];
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flushPending().catch((err) => console.error('Error auto-saving tasbeeh:', err));
    }, 1000);
    return Promise.resolve();
  };

  useEffect(() => {
    return () => {
      flushPending().catch(() => {});
    };
  }, []);

  const handleSaveTasbeeh = async (count, dhikrTitle, counterState) => {
    try {
      // المودال بيستدعي onSaveCount(1, عنوانالقسم) بدون counterState عند إتمام قسم أذكار
      // ده لازم يتسجل في نشاط الأذكار مش يمسح إجمالي التسبيح
      if (!counterState) {
        await saveLog(
          adhkarActivity?.id || 'adhkar',
          todayStr,
          1,
          true,
          { category: dhikrTitle },
          dhikrTitle || 'أذكار'
        );
        setSuccessBanner(`تقبل الله منك! تم تسجيل إتمام «${dhikrTitle}» في سجلك اليومي.`);
        setTimeout(() => setSuccessBanner(null), 5000);
        return;
      }

      clearTimeout(timerRef.current);
      pendingRef.current = null;
      await persist(count, dhikrTitle, counterState);
      setSuccessBanner(`تقبل الله منك! تم حفظ ${count} تسبيحة في ميزان حسناتك وسجلك اليومي بنجاح.`);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      console.error('Error saving tasbeeh:', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6 text-right max-w-4xl mx-auto">
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

      <TasbeehCounter
        todayStr={todayStr}
        initialCount={initialCount}
        initialCounterState={initialCounterState}
        onSaveCount={handleSaveTasbeeh}
        onCountChange={handleCountChange}
      />
    </div>
  );
}