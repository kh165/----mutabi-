import React, { useState } from 'react';
import { TOTAL_PAGES } from '../../data/quran.js';
import { BookOpen, Check, AlertCircle, RotateCcw, Moon } from 'lucide-react';
import { QuranReaderModal } from '../QuranReaderModal.jsx';

export function ReadInput({
  currentLog,
  khatmaStats,
  onSave,
  onReset,
  onClose,
  dailyTarget = 4,
}) {
  const [quranReaderOpen, setQuranReaderOpen] = useState(false);
  const [entryMode, setEntryMode] = useState(
    currentLog?.details?.fromPage ? 'range' : 'count'
  );
  const [pagesCount, setPagesCount] = useState(currentLog?.amount || dailyTarget || 4);
  const [fromPage, setFromPage] = useState(
    currentLog?.details?.fromPage || (khatmaStats ? khatmaStats.currentPageInKhatma + 1 : 1)
  );
  const [toPage, setToPage] = useState(
    currentLog?.details?.toPage || fromPage + Math.max(1, (dailyTarget || 4) - 1)
  );
  const [note, setNote] = useState(currentLog?.note || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const effectivePages =
    entryMode === 'range' ? Math.max(0, toPage - fromPage + 1) : Math.max(0, pagesCount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (effectivePages <= 0) {
      setError('يرجى تحديد عدد صفحات أكبر من 0');
      return;
    }
    if (entryMode === 'range' && fromPage > toPage) {
      setError('صفحة البداية يجب أن تسبق صفحة النهاية');
      return;
    }

    setSaving(true);
    try {
      const isCompleted = effectivePages >= (dailyTarget || 1);
      await onSave(
        effectivePages,
        isCompleted,
        entryMode === 'range' ? { fromPage, toPage } : {},
        note.trim()
      );
      onClose();
    } catch (err) {
      setError(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      {/* Khatma status overview */}
      {khatmaStats && (
        <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl flex items-center justify-between text-xs text-sky-900 dark:text-sky-200">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>
              الختمة الحالية: <strong>الصفحة {khatmaStats.currentPageInKhatma}</strong> من {TOTAL_PAGES}
            </span>
          </div>
          <span className="font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full text-[11px] border border-sky-200 dark:border-sky-800">
            ختمات سابقة: {khatmaStats.completedKhatmas}
          </span>
        </div>
      )}

      {/* Reader Launch Button */}
      <button
        type="button"
        onClick={() => setQuranReaderOpen(true)}
        className="w-full py-3 px-4 bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-2xl flex items-center justify-between shadow-sm transition-all"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span>فتح المصحف الشريف للقراءة (الوضع الليلي وراحة العين)</span>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
          <Moon className="w-3 h-3" />
          <span>تحكم بالخط والإضاءة</span>
        </span>
      </button>

      {/* Quran Reader Modal */}
      <QuranReaderModal
        isOpen={quranReaderOpen}
        onClose={() => setQuranReaderOpen(false)}
        initialSurahNumber={1}
        onLogPagesRead={(surah) => {
          setEntryMode('range');
          setFromPage(surah.startPage);
          setToPage(surah.startPage);
          setNote(`قراءة الصفحة ${surah.startPage} من سورة ${surah.name}`);
        }}
      />

      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setEntryMode('count')}
          className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            entryMode === 'count'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          عدد الصفحات 📄
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('range')}
          className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            entryMode === 'range'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          نطاق (من ص إلى ص) 📖
        </button>
      </div>

      {entryMode === 'count' ? (
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            عدد الصفحات المقروءة اليوم
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPagesCount(Math.max(1, pagesCount - 1))}
              className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-all shadow-2xs"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={TOTAL_PAGES}
              value={pagesCount}
              onChange={(e) => setPagesCount(Number(e.target.value))}
              className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={() => setPagesCount(pagesCount + 1)}
              className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-all shadow-2xs"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              من صفحة
            </label>
            <input
              type="number"
              min={1}
              max={TOTAL_PAGES}
              value={fromPage}
              onChange={(e) => setFromPage(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-base font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              إلى صفحة
            </label>
            <input
              type="number"
              min={fromPage}
              max={TOTAL_PAGES}
              value={toPage}
              onChange={(e) => setToPage(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-base font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      )}

      {/* Quick increments */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-slate-500 dark:text-slate-400">إضافة سريعة:</span>
        <button
          type="button"
          onClick={() => {
            if (entryMode === 'count') setPagesCount(pagesCount + 2);
            else setToPage(toPage + 2);
          }}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950/50 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
        >
          +2 صفحة
        </button>
        <button
          type="button"
          onClick={() => {
            if (entryMode === 'count') setPagesCount(pagesCount + 4);
            else setToPage(toPage + 4);
          }}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950/50 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
        >
          +4 (ربع حزب)
        </button>
        <button
          type="button"
          onClick={() => {
            if (entryMode === 'count') setPagesCount(pagesCount + 20);
            else setToPage(toPage + 20);
          }}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950/50 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
        >
          +20 (جزء كامل)
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300 font-semibold">الإجمالي المنجز:</span>
        <span className="font-bold text-sky-700 dark:text-sky-400 text-sm">
          {effectivePages} {effectivePages === 1 ? 'صفحة' : 'صفحات'}
          {dailyTarget > 0 && ` (الهدف اليومي: ${dailyTarget} صفحات)`}
        </span>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          ملاحظة (اختياري)
        </label>
        <input
          type="text"
          placeholder="مثال: قراءة بتدبر وتأمل في آيات سورة الإسراء"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 flex-wrap sm:flex-nowrap">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'جارٍ الحفظ...' : 'تسجيل القراءة'}</span>
        </button>

        {currentLog && (currentLog.amount > 0 || currentLog.completed) && onReset && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onReset();
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            className="py-3 px-3.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            title="إلغاء تسجيل قراءة اليوم والبدء من جديد"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>إلغاء التسجيل</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
