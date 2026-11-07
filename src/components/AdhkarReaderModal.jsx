import React, { useState } from 'react';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkar.js';
import {
  SunMedium,
  Moon,
  CheckCircle2,
  RotateCcw,
  X,
  Type,
  Eye,
  Sliders,
} from 'lucide-react';

export function AdhkarReaderModal({ isOpen, onClose, initialCategory = 'morning', onCompleteCategory }) {
  const [category, setCategory] = useState(initialCategory); // 'morning' | 'evening'
  const [adhkarState, setAdhkarState] = useState({});

  // Reading Comfort Mode: 'normal' | 'night' (Warm dark sepia for eye protection) | 'sepia' (Cream)
  const [readerTheme, setReaderTheme] = useState('night');
  // Font Size: 'sm' (15px) | 'md' (18px) | 'lg' (22px) | 'xl' (26px)
  const [fontSize, setFontSize] = useState('lg');

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

  // Dynamic Theme Palette for reducing eye strain
  const themeStyles = {
    normal: {
      modalBg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
      headerBg: 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-800',
      cardBg: 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
      cardDoneBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800',
      subText: 'text-slate-500 dark:text-slate-400',
    },
    night: {
      // Warm OLED black/deep obsidian night mode with soft amber/gold contrast
      modalBg: 'bg-[#0b0f19] border-slate-800 text-[#e2e8f0]',
      headerBg: 'bg-[#111827] border-slate-800/90',
      cardBg: 'bg-[#131b2e] border-[#1e293b] text-[#f1f5f9] hover:border-emerald-500/50',
      cardDoneBg: 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200',
      subText: 'text-slate-400',
    },
    sepia: {
      // Warm desert parchment eye protection
      modalBg: 'bg-[#fbf7ee] border-[#e8dfc8] text-[#3e3427]',
      headerBg: 'bg-[#f4ecdb] border-[#e2d5bc]',
      cardBg: 'bg-[#fdfbf7] border-[#e6dbc4] text-[#2c2214]',
      cardDoneBg: 'bg-[#e9f4ea] border-[#badcbe] text-[#1c4b22]',
      subText: 'text-[#7d6f5c]',
    },
  }[readerTheme];

  // Font size classes
  const fontClass = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-loose',
    lg: 'text-lg sm:text-xl leading-loose',
    xl: 'text-xl sm:text-2xl leading-loose',
  }[fontSize];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className={`border rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right transition-colors duration-200 ${themeStyles.modalBg}`}>
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${themeStyles.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0 ${
              category === 'morning'
                ? 'bg-amber-500 text-white shadow-amber-500/20'
                : 'bg-indigo-600 text-white shadow-indigo-600/20'
            }`}>
              {category === 'morning' ? <SunMedium className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>{category === 'morning' ? 'أذكار الصباح المباركة' : 'أذكار المساء والسكينة'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  {completedCount}/{currentList.length} تم
                </span>
              </h3>
              <p className={`text-xs ${themeStyles.subText}`}>
                انقر على الذكر لإنقاص عدّاده عند القراءة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 text-current flex items-center justify-center shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reader Comfort & Font Size Control Bar */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap ${themeStyles.headerBg}`}>
          {/* Mode selector: Morning / Evening */}
          <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setCategory('morning');
                setAdhkarState({});
              }}
              className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                category === 'morning'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-current opacity-70 hover:opacity-100'
              }`}
            >
              أذكار الصباح
            </button>
            <button
              type="button"
              onClick={() => {
                setCategory('evening');
                setAdhkarState({});
              }}
              className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                category === 'evening'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-current opacity-70 hover:opacity-100'
              }`}
            >
              أذكار المساء
            </button>
          </div>

          {/* Reading Night Modes & Font Size Adjuster */}
          <div className="flex items-center gap-3">
            {/* Eye-friendly Theme options */}
            <div className="flex items-center gap-1" title="نمط الإضاءة وحماية العين">
              <button
                type="button"
                onClick={() => setReaderTheme('night')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  readerTheme === 'night'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="الوضع الليلي المركز (راحة العين)"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>ليلي مريح</span>
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('sepia')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  readerTheme === 'sepia'
                    ? 'bg-[#d6c5a3] text-[#2c2214] font-black shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="ورق دافئ (سيبيا)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>دافئ</span>
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('normal')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  readerTheme === 'normal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="العادي"
              >
                عادي
              </button>
            </div>

            {/* Font Size Buttons */}
            <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl">
              <span className="text-[10px] px-1 opacity-70">حجم الخط:</span>
              {['sm', 'md', 'lg', 'xl'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setFontSize(sz)}
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    fontSize === sz
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {sz === 'sm' ? 'ص' : sz === 'md' ? 'م' : sz === 'lg' ? 'ك' : 'ك+'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Scrollable Adhkar List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {currentList.map((dhikr, idx) => {
            const current = adhkarState[dhikr.id] || 0;
            const remaining = getRemainingCount(dhikr);
            const isFinished = remaining === 0;

            return (
              <div
                key={dhikr.id}
                onClick={() => handleTapDhikr(dhikr)}
                className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer select-none relative ${
                  isFinished ? themeStyles.cardDoneBg : themeStyles.cardBg
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <span className="text-[11px] font-bold opacity-60 bg-black/5 dark:bg-white/5 px-2.5 py-0.5 rounded-lg">
                    الذكر {idx + 1} من {currentList.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {current > 0 && !isFinished && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetCurrent(dhikr.id);
                        }}
                        className="text-[11px] opacity-60 hover:opacity-100 hover:text-red-400 flex items-center gap-0.5 px-2 py-0.5 rounded-md"
                        title="إعادة تعيين هذا الذكر"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>تصفير</span>
                      </button>
                    )}
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs ${
                        isFinished
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {isFinished ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>اكتمل الحصن ✓</span>
                        </>
                      ) : (
                        <span>متبقي: {remaining} مرات</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Arabic Text with selected font size & typography */}
                <p className={`font-bold font-serif ${fontClass}`}>
                  {dhikr.text}
                </p>

                {/* Virtue footnote */}
                {dhikr.virtue && (
                  <div className="mt-3 pt-2.5 border-t border-current/10 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>الفضل: {dhikr.virtue}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between gap-2 ${themeStyles.headerBg}`}>
          <button
            type="button"
            onClick={handleResetAll}
            className="text-xs font-bold opacity-70 hover:opacity-100 hover:text-red-500 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تصفير جميع العدادات</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
          >
            إتمام وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
