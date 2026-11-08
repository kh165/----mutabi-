import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLogs } from '../hooks/useLogs.js';
import { useActivities } from '../hooks/useActivities.js';
import { TasbeehCounter } from '../components/TasbeehCounter.jsx';
import { AdhkarReaderModal } from '../components/AdhkarReaderModal.jsx';
import { ADHKAR_CATEGORIES } from '../data/adhkar.js';
import { getTodayDateString, formatArabicDate } from '../lib/dates.js';
import {
  Heart,
  CheckCircle2,
  X,
  CircleDot,
  BookOpen,
  Sparkles,
  SunMedium,
  Moon,
  Compass,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';

const ADHKAR_SESSION_TITLES = ['أذكار الصباح', 'أذكار المساء', 'أذكار بعد الصلاة'];

export function TasbeehPage() {
  const { userDoc } = useAuth();
  const todayStr = getTodayDateString(userDoc?.timezone);
  const { logs, saveLog } = useLogs();
  const { activities } = useActivities(false);
  const [activeTab, setActiveTab] = useState('tasbeeh'); // 'tasbeeh' | 'encyclopedia'
  const [successBanner, setSuccessBanner] = useState(null);
  const [adhkarModalOpen, setAdhkarModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState('morning');

  const tasbeehActivity = activities.find((a) => a.title.includes('التسبيح'));
  const adhkarActivity = activities.find(
    (a) => a.title.includes('أذكار') && !a.title.includes('التسبيح')
  );
  const tasbeehActivityId = tasbeehActivity?.id || 'tasbeeh';
  const tasbeehTarget = tasbeehActivity?.dailyTarget || 1;

  const todayTasbeehLog = logs.find(
    (l) =>
      l.date === todayStr &&
      (l.activityId === tasbeehActivityId || l.activityId === 'tasbeeh')
  );

  const initialCount = todayTasbeehLog?.amount || 0;
  const initialCounterState = todayTasbeehLog?.details?.counter || null;

  const persistTasbeehLog = async (count, dhikrTitle, counterState) => {
    if (ADHKAR_SESSION_TITLES.includes(dhikrTitle)) {
      await saveLog(
        adhkarActivity?.id || 'adhkar',
        todayStr,
        1,
        true,
        { category: dhikrTitle },
        dhikrTitle
      );
      return;
    }

    await saveLog(
      tasbeehActivityId,
      todayStr,
      count,
      count >= tasbeehTarget,
      {
        dhikr: dhikrTitle,
        counter: counterState || null,
        updatedAt: new Date().toISOString(),
      },
      dhikrTitle || 'تسبيح وأذكار'
    );
  };

  const handleSaveTasbeeh = async (count, dhikrTitle, counterState) => {
    await persistTasbeehLog(count, dhikrTitle, counterState);
    if (ADHKAR_SESSION_TITLES.includes(dhikrTitle)) {
      setSuccessBanner(`تقبل الله منك! تم تسجيل «${dhikrTitle}» في سجلك اليومي بنجاح.`);
    } else {
      setSuccessBanner(`تقبل الله منك! تم حفظ ${count} تسبيحة في ميزان حسناتك وسجلك اليومي.`);
    }
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleOpenCategory = (catId) => {
    setModalCategory(catId);
    setAdhkarModalOpen(true);
  };

  const getCategoryIcon = (id) => {
    switch (id) {
      case 'morning': return <SunMedium className="w-5 h-5 text-amber-500" />;
      case 'evening': return <Moon className="w-5 h-5 text-indigo-400" />;
      case 'after-prayer': return <Compass className="w-5 h-5 text-emerald-500" />;
      case 'sleep': return <Moon className="w-5 h-5 text-sky-400" />;
      case 'relief': return <Heart className="w-5 h-5 text-rose-500" />;
      case 'prophetic': return <Sparkles className="w-5 h-5 text-amber-400" />;
      case 'ruqyah': return <Shield className="w-5 h-5 text-teal-500" />;
      default: return <Clock className="w-5 h-5 text-purple-400" />;
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
            className="w-7 h-7 rounded-full hover:bg-emerald-200/50 flex items-center justify-center text-emerald-800 dark:text-emerald-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
            <Heart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{formatArabicDate(todayStr, true)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            موسوعة الأذكار والتسبيح النبوي 📿
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
            أذكار وأدعية صحيحة موثقة بنسبة 100% من أصح كتب السنة المطهرة، مع عدادات تفاعلية والرقية الشرعية وجوامع الدعاء.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('tasbeeh')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tasbeeh'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CircleDot className="w-4 h-4" />
            <span>المسبحة الذكية</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('encyclopedia')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'encyclopedia'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>موسوعة الأذكار والأدعية</span>
          </button>
        </div>
      </div>

      {activeTab === 'tasbeeh' ? (
        <TasbeehCounter
          todayStr={todayStr}
          initialCount={initialCount}
          initialCounterState={initialCounterState}
          onSaveCount={handleSaveTasbeeh}
          onCountChange={persistTasbeehLog}
        />
      ) : (
        /* Encyclopedia Categories Grid View */
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              أبواب الأذكار والأدعية النبوية الثابتة ({ADHKAR_CATEGORIES.length} أبواب جامعة)
            </h3>
            <span className="text-xs text-slate-400">اضغط على أي باب لفتحه والقراءة مع العداد التفاعلي</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {ADHKAR_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleOpenCategory(cat.id)}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all shadow-2xs cursor-pointer group flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800">
                    {getCategoryIcon(cat.id)}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {cat.items.length} أذكار وأدعية
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {cat.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>فتح هذا الباب مع العداد</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adhkar Reader Modal */}
      <AdhkarReaderModal
        isOpen={adhkarModalOpen}
        onClose={() => setAdhkarModalOpen(false)}
        initialCategory={modalCategory}
        todayStr={todayStr}
        onCompleteCategory={async (title) => {
          const act = activities.find((a) => a.title.includes('أذكار'));
          if (act) {
            await saveLog(act.id, todayStr, 1, true, { category: title }, title);
          }
          setSuccessBanner(`تقبل الله منك! تم تسجيل «${title}» واحتساب نقاط الطاعة في سجلك اليومي.`);
          setTimeout(() => setSuccessBanner(null), 5000);
        }}
      />
    </div>
  );
}
