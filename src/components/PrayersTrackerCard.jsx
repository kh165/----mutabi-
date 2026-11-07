import React, { useState } from 'react';
import {
  Sunrise,
  Sun,
  SunMedium,
  Sunset,
  Moon,
  Users,
  User,
  XCircle,
  RotateCcw,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const PRAYERS_CONFIG = [
  { id: 'fajr', title: 'صلاة الفجر', icon: Sunrise, color: '#38bdf8', bgLight: '#f0f9ff', timeEst: '05:00' },
  { id: 'dhuhr', title: 'صلاة الظهر', icon: Sun, color: '#f59e0b', bgLight: '#fffbeb', timeEst: '12:00' },
  { id: 'asr', title: 'صلاة العصر', icon: SunMedium, color: '#fb923c', bgLight: '#fff7ed', timeEst: '15:15' },
  { id: 'maghrib', title: 'صلاة المغرب', icon: Sunset, color: '#ec4899', bgLight: '#fdf2f8', timeEst: '17:45' },
  { id: 'isha', title: 'صلاة العشاء', icon: Moon, color: '#818cf8', bgLight: '#eef2ff', timeEst: '19:15' },
];

export function PrayersTrackerCard({
  log,
  dateStr,
  onSavePrayer,
  onResetAllPrayers,
  prayerActivityId = 'prayers',
}) {
  const [expandedPrayerId, setExpandedPrayerId] = useState(null);
  const [savingPrayerId, setSavingPrayerId] = useState(null);
  const [activeNoteText, setActiveNoteText] = useState({});

  const prayersDetails = log?.details?.prayers || {};

  const performedCount = PRAYERS_CONFIG.filter((p) => {
    const status = prayersDetails[p.id]?.status;
    return status === 'prayed_jamaah' || status === 'prayed_individual';
  }).length;

  const jamaahCount = PRAYERS_CONFIG.filter(
    (p) => prayersDetails[p.id]?.status === 'prayed_jamaah'
  ).length;

  const missedCount = PRAYERS_CONFIG.filter(
    (p) => prayersDetails[p.id]?.status === 'missed'
  ).length;

  const percentage = Math.round((performedCount / 5) * 100);

  const handleSetStatus = async (prayerId, newStatus) => {
    const prayer = PRAYERS_CONFIG.find((p) => p.id === prayerId);
    if (!prayer) return;

    setSavingPrayerId(prayerId);
    try {
      const currentPrayerData = prayersDetails[prayerId] || {};
      const targetStatus = currentPrayerData.status === newStatus ? null : newStatus;
      const note = activeNoteText[prayerId] ?? currentPrayerData.note ?? '';

      // Build updated prayers details map
      const nextPrayers = { ...prayersDetails };
      if (!targetStatus) {
        delete nextPrayers[prayerId];
      } else {
        nextPrayers[prayerId] = {
          id: prayerId,
          title: prayer.title,
          status: targetStatus,
          note: note.trim(),
          updatedAt: new Date().toISOString(),
        };
      }

      const nextPerformedCount = PRAYERS_CONFIG.filter((p) => {
        const st = nextPrayers[p.id]?.status;
        return st === 'prayed_jamaah' || st === 'prayed_individual';
      }).length;

      const isCompleted = nextPerformedCount === 5;

      await onSavePrayer(
        prayerActivityId,
        dateStr,
        nextPerformedCount,
        isCompleted,
        {
          prayers: nextPrayers,
          lastUpdatedPrayer: prayer.title,
          lastUpdatedStatus: targetStatus,
        },
        targetStatus ? `تسجيل ${prayer.title}` : `إلغاء تسجيل ${prayer.title}`
      );
    } catch (err) {
      console.error('Error updating prayer in Realtime Database:', err);
    } finally {
      setSavingPrayerId(null);
    }
  };

  const handleSaveNote = async (prayerId) => {
    const prayer = PRAYERS_CONFIG.find((p) => p.id === prayerId);
    const currentPrayerData = prayersDetails[prayerId];
    if (!prayer || !currentPrayerData) return;

    setSavingPrayerId(prayerId);
    try {
      const note = (activeNoteText[prayerId] ?? currentPrayerData.note ?? '').trim();
      const nextPrayers = {
        ...prayersDetails,
        [prayerId]: {
          ...currentPrayerData,
          note,
          updatedAt: new Date().toISOString(),
        },
      };

      await onSavePrayer(
        prayerActivityId,
        dateStr,
        performedCount,
        performedCount === 5,
        { prayers: nextPrayers },
        `تحديث ملاحظة ${prayer.title}`
      );
      setExpandedPrayerId(null);
    } catch (err) {
      console.error('Error saving prayer note:', err);
    } finally {
      setSavingPrayerId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 text-right">
      {/* Header with Title and Overall Day Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-1.5 border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>عمود الدين وميزان اليوم</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>متابعة الصلوات الخمس اليومية 🕌</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            سجّل كل صلاة فور أدائها (جماعة / منفرداً / فائتة مع ذكر السبب). يتم الحفظ تلقائياً في Realtime Database.
          </p>
        </div>

        {/* Mini Stats Badges */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{performedCount} / 5 مكتملة</span>
          </span>
          {jamaahCount > 0 && (
            <span className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>{jamaahCount} جماعة</span>
            </span>
          )}
          {missedCount > 0 && (
            <span className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{missedCount} فائتة</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar for the 5 Prayers */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>نسبة إتمام صلوات اليوم</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-black">{percentage}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* 5 Prayers Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
        {PRAYERS_CONFIG.map((prayer) => {
          const prayerData = prayersDetails[prayer.id];
          const status = prayerData?.status;
          const isJamaah = status === 'prayed_jamaah';
          const isIndiv = status === 'prayed_individual';
          const isMissed = status === 'missed';
          const isSaving = savingPrayerId === prayer.id;
          const isExpanded = expandedPrayerId === prayer.id;
          const Icon = prayer.icon;

          return (
            <div
              key={prayer.id}
              className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${
                isJamaah
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/80 shadow-2xs ring-1 ring-emerald-400/40'
                  : isIndiv
                  ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700/80 shadow-2xs'
                  : isMissed
                  ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/80 shadow-2xs'
                  : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Prayer Header & Icon */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                    style={{ backgroundColor: `${prayer.color}20`, color: prayer.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{prayer.timeEst}</span>
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                  {prayer.title}
                </h4>

                <div className="text-[11px] font-semibold min-h-[1.25rem]">
                  {isJamaah ? (
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>صليت جماعة ✓</span>
                    </span>
                  ) : isIndiv ? (
                    <span className="text-teal-700 dark:text-teal-300 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-teal-600" />
                      <span>صليت منفرداً ✓</span>
                    </span>
                  ) : isMissed ? (
                    <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-amber-600" />
                      <span>لم أصلِّ ✕</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">بانتظار التسجيل</span>
                  )}
                </div>

                {prayerData?.note && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-1 line-clamp-1 bg-white/60 dark:bg-slate-900/60 p-1 rounded-lg">
                    «{prayerData.note}»
                  </p>
                )}
              </div>

              {/* Status Action Buttons */}
              <div className="space-y-1.5 pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="grid grid-cols-3 gap-1">
                  {/* Jamaah button */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetStatus(prayer.id, 'prayed_jamaah')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      isJamaah
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="تسجيل أداء الصلاة في جماعة"
                  >
                    <Users className="w-3 h-3" />
                    <span>جماعة</span>
                  </button>

                  {/* Individual button */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetStatus(prayer.id, 'prayed_individual')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      isIndiv
                        ? 'bg-teal-600 text-white shadow-xs font-black'
                        : 'bg-white dark:bg-slate-900 hover:bg-teal-100 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="تسجيل أداء الصلاة منفرداً"
                  >
                    <User className="w-3 h-3" />
                    <span>منفرداً</span>
                  </button>

                  {/* Missed button */}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetStatus(prayer.id, 'missed')}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      isMissed
                        ? 'bg-amber-600 text-white shadow-xs font-black'
                        : 'bg-white dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                    title="تسجيل عدم أداء الصلاة أو فواتها"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>فاتتني</span>
                  </button>
                </div>

                {/* Toggle Note input */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPrayerId(isExpanded ? null : prayer.id);
                    if (!activeNoteText[prayer.id] && prayerData?.note) {
                      setActiveNoteText((prev) => ({ ...prev, [prayer.id]: prayerData.note }));
                    }
                  }}
                  className="w-full py-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{prayerData?.note ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {/* Note editor popdown */}
                {isExpanded && (
                  <div className="pt-1 space-y-1.5 animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="اكتب سبب الفوات أو ملاحظة..."
                      value={activeNoteText[prayer.id] ?? prayerData?.note ?? ''}
                      onChange={(e) =>
                        setActiveNoteText((prev) => ({ ...prev, [prayer.id]: e.target.value }))
                      }
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveNote(prayer.id)}
                      className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      {isSaving ? 'جارٍ الحفظ...' : 'حفظ الملاحظة في Realtime Database'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset & Quick Summary Action */}
      {performedCount > 0 && onResetAllPrayers && (
        <div className="flex items-center justify-between pt-2 text-xs">
          <span className="text-slate-400 text-[11px]">
            يتم تحديث حالتك ومجموع صلواتك في ملفك الشخصي وقاعدة البيانات لحظياً ✓
          </span>
          <button
            type="button"
            onClick={() => onResetAllPrayers(prayerActivityId, dateStr)}
            className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة ضبط صلوات هذا اليوم</span>
          </button>
        </div>
      )}
    </div>
  );
}
