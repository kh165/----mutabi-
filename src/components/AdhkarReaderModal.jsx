import React, { useState } from 'react';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkar.js';
import {
  SunMedium,
  Moon,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  X,
  Volume2,
} from 'lucide-react';

export function AdhkarReaderModal({ isOpen, onClose, initialCategory = 'morning', onCompleteCategory }) {
  const [category, setCategory] = useState(initialCategory); // 'morning' | 'evening'
  const [adhkarState, setAdhkarState] = useState({});

  if (!isOpen) return null;

  const currentList = category === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;

  const getRemainingCount = (dhikr) => {
    const current = adhkarState[dhikr.id] || 0;
    return Math.max(0, dhikr.count - current);
  };

  const handleTapDhikr = (dhikr) => {
    const current = adhkarState[dhikr.id] || 0;
    if (current < dhikr.count) {
      const next = current + 1;
      const updated = { ...adhkarState, [dhikr.id]: next };
      setAdhkarState(updated);

      if (navigator.vibrate) {
        navigator.vibrate(12);
      }

      // Check if all adhkar in this category are completed
      const allDone = currentList.every((d) => (updated[d.id] || 0) >= d.count);
      if (allDone && onCompleteCategory) {
        onCompleteCategory(category === 'morning' ? 'أذكار الصباح' : 'أذكار المساء');
      }
    }
  };

  const handleResetCurrent = (id) => {
    setAdhkarState((prev) => ({ ...prev, [id]: 0 }));
  };

  const handleResetAll = () => {
    setAdhkarState({});
  };

  const completedCount = currentList.filter(
    (d) => (adhkarState[d.id] || 0) >= d.count
  ).length;

  const progressPercent = Math.round((completedCount / currentList.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-xs ${
              category === 'morning'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
            }`}>
              {category === 'morning' ? <SunMedium className="w-5 h-5 text-amber-600" /> : <Moon className="w-5 h-5 text-indigo-500" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{category === 'morning' ? 'أذكار الصباح المباركة' : 'أذكار المساء وحصن المسلم'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {completedCount}/{currentList.length} تم
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اضغط على كل ذكر لإنقاص عدّاده حتى يكتمل الحصن
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Switcher & Progress Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCategory('morning');
                setAdhkarState({});
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                category === 'morning'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <SunMedium className="w-3.5 h-3.5" />
              <span>أذكار الصباح</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCategory('evening');
                setAdhkarState({});
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                category === 'evening'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>أذكار المساء</span>
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {progressPercent}% مكتمل
            </span>
          </div>
        </div>

        {/* Scrollable Adhkar Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {currentList.map((dhikr, idx) => {
            const current = adhkarState[dhikr.id] || 0;
            const remaining = getRemainingCount(dhikr);
            const isFinished = remaining === 0;

            return (
              <div
                key={dhikr.id}
                onClick={() => handleTapDhikr(dhikr)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer select-none relative ${
                  isFinished
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 opacity-80'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    الذكر {idx + 1} من {currentList.length}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {current > 0 && !isFinished && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetCurrent(dhikr.id);
                        }}
                        className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="إعادة تعيين هذا الذكر"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>تصفير</span>
                      </button>
                    )}
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                        isFinished
                          ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {isFinished ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>اكتمل ✓</span>
                        </>
                      ) : (
                        <span>متبقي: {remaining}</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Arabic Text */}
                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-loose font-serif">
                  {dhikr.text}
                </p>

                {/* Virtue footnote */}
                {dhikr.virtue && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{dhikr.virtue}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 rounded-xl transition-all flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تصفير جميع الأذكار</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            تم وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
