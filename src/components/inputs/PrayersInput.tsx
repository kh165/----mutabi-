import React, { useState } from 'react';
import { Activity, ActivityLog, PrayerStatus } from '../../types';
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

interface PrayersInputProps {
  activity: Activity;
  currentLog?: ActivityLog;
  onSave: (amount: number, completed: boolean, details: any, note: string) => Promise<void>;
  onReset?: () => Promise<void>;
  onClose: () => void;
}

interface PrayerItemState {
  id: string;
  title: string;
  status: PrayerStatus | null;
  note: string;
}

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
}: PrayersInputProps) {
  const existingPrayers = currentLog?.details?.prayers || {};

  // Build items from activity.subItems or default 5 prayers
  const initialItems: PrayerItemState[] = (
    activity.subItems && activity.subItems.length > 0
      ? activity.subItems
      : DEFAULT_PRAYERS
  ).map((p) => {
    const existing = existingPrayers[p.id];
    return {
      id: p.id,
      title: p.title,
      status: (existing?.status as PrayerStatus) || null,
      note: existing?.note || '',
    };
  });

  const [prayers, setPrayers] = useState<PrayerItemState[]>(initialItems);
  const [dayNote, setDayNote] = useState<string>(currentLog?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPrayerStatus = (id: string, status: PrayerStatus) => {
    setPrayers((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              // If already selected, toggle off or switch
              status: item.status === status ? null : status,
            }
          : item
      )
    );
  };

  const setPrayerNote = (id: string, noteText: string) => {
    setPrayers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note: noteText } : item))
    );
  };

  const performedCount = prayers.filter(
    (p) => p.status === 'prayed_jamaah' || p.status === 'prayed_individual'
  ).length;
  const totalCount = prayers.length;
  const isAllPerformed = performedCount === totalCount && totalCount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const prayersDetails: Record<
        string,
        { id: string; title: string; status: PrayerStatus; note: string }
      > = {};

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
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ الصلوات');
    } finally {
      setSaving(false);
    }
  };

  const getPrayerIcon = (id: string) => {
    const found = DEFAULT_PRAYERS.find((d) => d.id === id);
    return found?.icon || Sparkles;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      {/* Summary Banner */}
      <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-900 block">
            متابعة صلوات اليوم
          </span>
          <span className="text-[11px] text-emerald-700">
            أُديت {performedCount} من {totalCount} صلوات
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-24 bg-emerald-200/60 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (performedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs font-extrabold text-emerald-800">
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
                  ? 'bg-emerald-50/50 border-emerald-300'
                  : isIndividual
                  ? 'bg-teal-50/40 border-teal-300'
                  : isMissed
                  ? 'bg-amber-50/50 border-amber-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
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
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">
                      {prayer.title}
                    </h4>
                    <span className="text-[11px] text-slate-400">
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
                        : 'bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800'
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
                        : 'bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-800'
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
                        : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800'
                    }`}
                    title="لم أصلِّ"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>لم أصلِّ</span>
                  </button>
                </div>
              </div>

              {/* Note / Reason Field for the prayer */}
              {(isMissed || prayer.note || isJamaah || isIndividual) && (
                <div className="mt-2.5 pt-2 border-t border-slate-100/90">
                  <div className="flex items-center gap-1.5 mb-1">
                    <MessageSquare className="w-3 h-3 text-slate-400" />
                    <label className="text-[11px] font-semibold text-slate-600">
                      {isMissed ? (
                        <span className="text-amber-700 font-bold">
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
                        ? 'bg-amber-50/80 border border-amber-300 text-amber-900 focus:ring-amber-500 placeholder:text-amber-400'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-emerald-500 placeholder:text-slate-400'
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
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          خاطرة أو دعاء اليوم (اختياري)
        </label>
        <input
          type="text"
          placeholder="خاطرة أو دعاء ليومك..."
          value={dayNote}
          onChange={(e) => setDayNote(e.target.value)}
          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2 flex-wrap sm:flex-nowrap">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الصلوات والملاحظات'}</span>
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
            className="py-3 px-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            title="إلغاء تسجيل صلوات اليوم والبدء من جديد"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>إلغاء التسجيل</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
