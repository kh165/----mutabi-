import React, { useState } from 'react';
import {
  Check,
  AlertCircle,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Users,
  User,
  XCircle,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';

const DEFAULT_PRAYERS = [
  { id: 'fajr', title: 'صلاة الفجر', icon: Sunrise },
  { id: 'dhuhr', title: 'صلاة الظهر', icon: Sun },
  { id: 'asr', title: 'صلاة العصر', icon: Sparkles },
  { id: 'maghrib', title: 'صلاة المغرب', icon: Sunset },
  { id: 'isha', title: 'صلاة العشاء', icon: Moon },
];

export function PrayersInput({
  activity,
  currentLog,
  onSave,
  onClose,
  onReset,
}) {
  const existingPrayers = currentLog?.details?.prayers || {};

  // Build items from activity.subItems or default 5 prayers
  const initialItems = (
    activity.subItems && activity.subItems.length > 0
      ? activity.subItems
      : DEFAULT_PRAYERS
  ).map((p) => {
    const existing = existingPrayers[p.id];
    return {
      id: p.id,
      title: p.title,
      status: existing?.status || null,
      note: existing?.note || '',
    };
  });

  const [prayers, setPrayers] = useState(initialItems);
  const [dayNote, setDayNote] = useState(currentLog?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setPrayerStatus = (id, status) => {
    setPrayers((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === status ? null : status,
            }
          : item
      )
    );
  };

  const setPrayerNote = (id, noteText) => {
    setPrayers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note: noteText } : item))
    );
  };

  const performedCount = prayers.filter(
    (p) => p.status === 'prayed_jamaah' || p.status === 'prayed_individual'
  ).length;
  const totalCount = prayers.length;
  const isAllPerformed = performedCount === totalCount && totalCount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const prayersDetails = {};
      prayers.forEach((p) => {
        if (p.status) {
          prayersDetails[p.id] = {
            id: p.id,
            title: p.title,
            status: p.status,
            note: p.note.trim(),
          };
        }
      });

      const completed = isAllPerformed;
      await onSave(
        performedCount,
        completed,
        { prayers: prayersDetails },
        dayNote.trim()
      );
      onClose();
    } catch (err) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الصلوات');
    } finally {
      setSaving(false);
    }
  };

  const getPrayerIcon = (id) => {
    const found = DEFAULT_PRAYERS.find((d) => d.id === id);
    return found?.icon || Sparkles;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      {/* Summary Banner */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block">
            متابعة صلوات اليوم
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
            أُديت {performedCount} من {totalCount} صلوات
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-24 bg-emerald-200/60 dark:bg-emerald-900/60 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (performedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
            {totalCount > 0 ? Math.round((performedCount / totalCount) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Prayers List */}
      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto ps-0.5 pe-1">
        {prayers.map((prayer) => {
          const Icon = getPrayerIcon(prayer.id);
          const isMissed = prayer.status === 'missed';
          const isJamaah = prayer.status === 'prayed_jamaah';
          const isIndividual = prayer.status === 'prayed_individual';

          return (
            <div
              key={prayer.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isJamaah
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60'
                  : isIndividual
                  ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700/60'
                  : isMissed
                  ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Prayer Label */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isJamaah
                        ? 'bg-emerald-600 text-white'
                        : isIndividual
                        ? 'bg-teal-600 text-white'
                        : isMissed
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {prayer.title}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {prayer.status === 'prayed_jamaah'
                        ? 'أُديت في جماعة ✓'
                        : prayer.status === 'prayed_individual'
                        ? 'أُديت منفرداً ✓'
                        : prayer.status === 'missed'
                        ? 'لم تُؤدَّ بعد'
                        : 'لم يتم التحديد بعد'}
                    </span>
                  </div>
                </div>

                {/* 3 Status Choices */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  {/* Jamaah */}
                  <button
                    type="button"
                    onClick={() => setPrayerStatus(prayer.id, 'prayed_jamaah')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      isJamaah
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-300 hover:text-emerald-800'
                    }`}
                    title="صليتها في جماعة"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>جماعة</span>
                  </button>

                  {/* Individual */}
                  <button
                    type="button"
                    onClick={() => setPrayerStatus(prayer.id, 'prayed_individual')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      isIndividual
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-950/50 text-slate-700 dark:text-slate-300 hover:text-teal-800'
                    }`}
                    title="صليتها منفرداً"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>منفرداً</span>
                  </button>

                  {/* Missed */}
                  <button
                    type="button"
                    onClick={() => setPrayerStatus(prayer.id, 'missed')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                      isMissed
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300 hover:text-amber-800'
                    }`}
                    title="لم أصلِّ"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>لم أصلِّ</span>
                  </button>
                </div>
              </div>

              {/* Note / Reason Field */}
              {(isMissed || prayer.note || isJamaah || isIndividual) && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {isMissed ? (
                        <span className="text-amber-700 dark:text-amber-400 font-bold">
                          سبب عدم الأداء أو التأخير (اكتب ملاحظتك):
                        </span>
                      ) : (
                        <span>ملاحظة أو تدوين حول الصلاة:</span>
                      )}
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder={
                      isMissed
                        ? 'مثال: نوم، انشغال خارج المنزل، سهو، عذر شرعي...'
                        : 'ملاحظة (مكان الصلاة، إدراك تكبيرة الإحرام، خشوع...)'
                    }
                    value={prayer.note}
                    onChange={(e) => setPrayerNote(prayer.id, e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 ${
                      isMissed
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 focus:ring-amber-500 placeholder:text-amber-400'
                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-emerald-500 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* General Day Reflection Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          خاطرة أو دعاء اليوم (اختياري)
        </label>
        <input
          type="text"
          placeholder="خاطرة أو دعاء ليومك..."
          value={dayNote}
          onChange={(e) => setDayNote(e.target.value)}
          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        {onReset && currentLog && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة التعيين</span>
          </button>
        )}
        <div className="flex items-center gap-2 ms-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ...' : 'تأكيد وحفظ'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
