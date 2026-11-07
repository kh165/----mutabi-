import React, { useState, useEffect } from 'react';
import { SURAHS, validateAyahRange, getSurah } from '../../data/quran.js';
import { BookOpen, Check, AlertCircle, History, RotateCcw } from 'lucide-react';

export function MemorizeInput({
  currentLog,
  latestPosition,
  onSave,
  onReset,
  onClose,
  dailyTarget = 5,
}) {
  const initialSurah = currentLog?.details?.surah || latestPosition?.surahNumber || 2;
  const initialFrom = currentLog?.details?.fromAyah || (latestPosition?.toAyah ? latestPosition.toAyah + 1 : 1);
  const initialTo = currentLog?.details?.toAyah || initialFrom + Math.max(1, dailyTarget - 1);

  const [surahNumber, setSurahNumber] = useState(initialSurah);
  const [fromAyah, setFromAyah] = useState(initialFrom);
  const [toAyah, setToAyah] = useState(initialTo);
  const [kind, setKind] = useState(currentLog?.details?.kind || 'new');
  const [note, setNote] = useState(currentLog?.note || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedSurah = getSurah(surahNumber);

  useEffect(() => {
    if (selectedSurah && toAyah > selectedSurah.ayahsCount) {
      setToAyah(Math.min(fromAyah + 4, selectedSurah.ayahsCount));
    }
  }, [surahNumber]);

  const ayahCount = Math.max(0, toAyah - fromAyah + 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateAyahRange(surahNumber, fromAyah, toAyah);
    if (!validation.valid) {
      setError(validation.error || 'نطاق الآيات غير صحيح');
      return;
    }

    setSaving(true);
    try {
      const isCompleted = ayahCount >= (dailyTarget || 1);
      await onSave(
        ayahCount,
        isCompleted,
        {
          surah: surahNumber,
          fromAyah,
          toAyah,
          kind,
        },
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
      {/* Latest memorized position banner */}
      {latestPosition && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-300">
          <History className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            آخر موضع محفوظ: <strong>سورة {getSurah(latestPosition.surahNumber)?.name}</strong> (الآية {latestPosition.toAyah || 1})
          </span>
        </div>
      )}

      {/* Kind Toggle: New memorization vs Review */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setKind('new')}
          className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            kind === 'new'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          حفظ جديد 📖
        </button>
        <button
          type="button"
          onClick={() => setKind('review')}
          className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
            kind === 'review'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          مراجعة وتثبيت 🔁
        </button>
      </div>

      {/* Surah selection */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          السورة الكريمة
        </label>
        <select
          value={surahNumber}
          onChange={(e) => {
            const num = Number(e.target.value);
            setSurahNumber(num);
            setFromAyah(1);
            const s = getSurah(num);
            setToAyah(Math.min(dailyTarget || 5, s?.ayahsCount || 5));
          }}
          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs sm:text-sm"
        >
          {SURAHS.map((s) => (
            <option key={s.number} value={s.number} className="dark:bg-slate-900 dark:text-slate-100">
              {s.number}. سورة {s.name} ({s.ayahsCount} آية)
            </option>
          ))}
        </select>
      </div>

      {/* Verses range: from Ayah to Ayah */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            من الآية
          </label>
          <input
            type="number"
            min={1}
            max={selectedSurah?.ayahsCount || 286}
            value={fromAyah}
            onChange={(e) => setFromAyah(Number(e.target.value))}
            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            إلى الآية
          </label>
          <input
            type="number"
            min={fromAyah}
            max={selectedSurah?.ayahsCount || 286}
            value={toAyah}
            onChange={(e) => setToAyah(Number(e.target.value))}
            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
      </div>

      {/* Quick increments */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-slate-500 dark:text-slate-400">إضافة سريعة:</span>
        <button
          type="button"
          onClick={() => setToAyah(Math.min((selectedSurah?.ayahsCount || 286), toAyah + 1))}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
        >
          +1 آية
        </button>
        <button
          type="button"
          onClick={() => setToAyah(Math.min((selectedSurah?.ayahsCount || 286), toAyah + 5))}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
        >
          +5 آيات
        </button>
        <button
          type="button"
          onClick={() => setToAyah(Math.min((selectedSurah?.ayahsCount || 286), toAyah + 10))}
          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg text-slate-700 dark:text-slate-200 font-medium"
        >
          +10 آيات
        </button>
      </div>

      {/* Summary card */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300 font-semibold">المجموع المنجز:</span>
        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
          {ayahCount} {ayahCount === 1 ? 'آية' : 'آيات'}
          {dailyTarget > 0 && ` (الهدف اليومي: ${dailyTarget} آيات)`}
        </span>
      </div>

      {/* Note input */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          ملاحظة شخصية (اختياري)
        </label>
        <input
          type="text"
          placeholder="مثال: تم التسميع للشيخ بفضل الله"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'جارٍ الحفظ...' : 'تسجيل الإنجاز'}</span>
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
            title="إلغاء تسجيل حفظ اليوم والبدء من جديد"
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
