import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Moon,
  CheckCircle2,
  XCircle,
  Users,
  User,
  Info,
  Flame,
} from 'lucide-react';
import { formatArabicDate, getTodayDateString } from '../lib/dates.js';

export function MonthlyWorshipCalendar({
  logs = [],
  activities = [],
  todayStr,
  onToggleFasting,
  onSelectDate,
}) {
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const today = todayStr || getTodayDateString();
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m }; // 1-indexed month
  });

  const [viewMode, setViewMode] = useState('prayers'); // 'prayers' | 'fasting'
  const [selectedDayDetail, setSelectedDayDetail] = useState(null);

  const { year, month } = currentYearMonth;

  // Helpers for calendar calculation
  const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();
  const getFirstDayOfWeek = (y, m) => new Date(y, m - 1, 1).getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  const daysInCurrentMonth = getDaysInMonth(year, month);
  const startDayOfWeek = getFirstDayOfWeek(year, month); // Day 1 of month

  const arabicMonthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const prevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 1) return { year: prev.year - 1, month: 12 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 12) return { year: prev.year + 1, month: 1 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const resetToTodayMonth = () => {
    const today = todayStr || getTodayDateString();
    const [y, m] = today.split('-').map(Number);
    setCurrentYearMonth({ year: y, month: m });
  };

  // Find prayer activity
  const prayerActivity = activities.find(
    (a) => a.type === 'prayers' || a.inputMode === 'prayers'
  );
  const prayerActivityId = prayerActivity?.id;

  // Find fasting activity
  const fastingActivity = activities.find(
    (a) => a.id === 'fasting' || a.title?.includes('صيام')
  );
  const fastingActivityId = fastingActivity?.id || 'fasting';

  // Build map of logs for the month
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  // Analyze days
  let totalCompletedPrayerDays = 0;
  let totalFastingDays = 0;

  const daysData = [];
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();

    // Check prayers for this date
    const dayPrayerLog = logs.find(
      (l) => l.date === dateStr && (l.activityId === prayerActivityId || l.details?.prayers)
    );
    const prayers = dayPrayerLog?.details?.prayers || {};
    const prayedCount = Object.values(prayers).filter(
      (p) => p.status === 'prayed_jamaah' || p.status === 'prayed_individual'
    ).length;
    const isAllPrayersCompleted = prayedCount === 5 || (dayPrayerLog?.completed && dayPrayerLog?.amount >= 5);

    if (isAllPrayersCompleted) {
      totalCompletedPrayerDays++;
    }

    // Check fasting for this date
    const dayFastingLog = logs.find(
      (l) =>
        l.date === dateStr &&
        (l.activityId === fastingActivityId ||
          l.details?.fasting === true ||
          l.note?.includes('صيام') ||
          (l.completed && l.activityId?.includes('fast')))
    );
    const isFasting = !!(dayFastingLog && (dayFastingLog.completed || dayFastingLog.amount > 0));

    if (isFasting) {
      totalFastingDays++;
    }

    // Check Sunnah fasting days: Monday (1) or Thursday (4)
    const isSunnahDay = dayOfWeek === 1 || dayOfWeek === 4;
    // White days (approximated mid-month 13, 14, 15)
    const isWhiteDay = d === 13 || d === 14 || d === 15;

    daysData.push({
      dayNumber: d,
      dateStr,
      dayOfWeek,
      isToday: dateStr === todayStr,
      prayers,
      prayedCount,
      isAllPrayersCompleted,
      hasPrayerLog: !!dayPrayerLog,
      isFasting,
      isSunnahDay,
      isWhiteDay,
      dayPrayerLog,
      dayFastingLog,
    });
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 text-right">
      {/* Header with Navigation and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              التقويم المرئي للعبادات المكتملة
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            متابعة أيام الصيام والصلوات الخمس المكتملة يوماً بيوم خلال الشهر.
          </p>
        </div>

        {/* View Mode Switcher: Prayers vs Fasting */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('prayers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'prayers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>🕌 الصلوات الخمس</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('fasting')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              viewMode === 'fasting'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>🌙 أيام الصيام</span>
          </button>
        </div>
      </div>

      {/* Month Navigator Toolbar & Monthly Stats Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Arrows */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all"
            title="الشهر التالي"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-base font-black text-slate-900 dark:text-white px-2">
            {arabicMonthNames[month - 1]} {year}
          </span>

          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all"
            title="الشهر السابق"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={resetToTodayMonth}
            className="ms-2 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-all"
          >
            الشهر الحالي
          </button>
        </div>

        {/* Monthly Summary Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {viewMode === 'prayers' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>أيام الصلوات المكتملة: {totalCompletedPrayerDays} من {daysInCurrentMonth} يوماً</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-300">
              <Moon className="w-4 h-4 text-amber-600" />
              <span>أيام الصيام في هذا الشهر: {totalFastingDays} يوماً</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-center py-2.5">
          {arabicDays.map((dayName) => (
            <span key={dayName} className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
              {dayName}
            </span>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-x-reverse divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
          {/* Empty cells before start of month */}
          {Array.from({ length: startDayOfWeek }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="min-h-[70px] sm:min-h-[85px] bg-slate-50/40 dark:bg-slate-900/40 opacity-40"
            />
          ))}

          {/* Days of Month */}
          {daysData.map((d) => {
            const isPrayersDone = d.isAllPrayersCompleted;
            const isFastingDone = d.isFasting;

            return (
              <div
                key={d.dateStr}
                onClick={() => setSelectedDayDetail(d)}
                className={`min-h-[70px] sm:min-h-[85px] p-1.5 sm:p-2 flex flex-col justify-between cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 relative ${
                  d.isToday
                    ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/20 dark:bg-emerald-950/20'
                    : ''
                }`}
              >
                {/* Day Number and Today Indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      d.isToday
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {d.dayNumber}
                  </span>

                  {/* Sunnah Fasting Hint Badge */}
                  {viewMode === 'fasting' && (d.isSunnahDay || d.isWhiteDay) && !isFastingDone && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1 rounded-md hidden sm:inline">
                      {d.isWhiteDay ? 'أيام بيض' : 'سُنّة'}
                    </span>
                  )}
                </div>

                {/* MODE 1: PRAYERS DISPLAY IN DAY CELL */}
                {viewMode === 'prayers' && (
                  <div className="mt-1">
                    {isPrayersDone ? (
                      <div className="bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl p-1 text-center">
                        <span className="text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>5/5 صلوات</span>
                        </span>
                      </div>
                    ) : d.prayedCount > 0 ? (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-1 text-center">
                        <span className="text-[10px] font-bold">
                          {d.prayedCount}/5 أُديت
                        </span>
                      </div>
                    ) : (
                      <div className="text-center py-1 opacity-20">
                        <span className="text-[10px] text-slate-400">—</span>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 2: FASTING DISPLAY IN DAY CELL */}
                {viewMode === 'fasting' && (
                  <div className="mt-1">
                    {isFastingDone ? (
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl p-1 text-center shadow-2xs">
                        <span className="text-[10px] sm:text-[11px] font-extrabold flex items-center justify-center gap-1">
                          <Moon className="w-3 h-3 fill-amber-300 text-amber-300" />
                          <span>صائم ✓</span>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleFasting) {
                            onToggleFasting(d.dateStr, false);
                          }
                        }}
                        className="w-full text-[10px] text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      >
                        + تسجيل
                      </button>
                    )}
                  </div>
                )}

                {/* Bottom subtle dot indicators */}
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {viewMode === 'prayers' && isPrayersDone && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {viewMode === 'fasting' && isFastingDone && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-600" />
            <span>مكتمل بالكامل</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500" />
            <span>أداء جزئي / سُنّة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md border-2 border-emerald-500" />
            <span>اليوم الحالي</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400">
          اضغط على أي يوم لعرض التفاصيل الكاملة أو تسجيل الصيام
        </span>
      </div>

      {/* DAY DETAIL POPUP MODAL */}
      {selectedDayDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setSelectedDayDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-right"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-600" />
                  <span>تفاصيل يوم: {formatArabicDate(selectedDayDetail.dateStr, true)}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Fasting Status & Quick Toggle */}
            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    حالة الصيام: {selectedDayDetail.isFasting ? 'صائم بحمد الله 🌙' : 'لم يُسجل صيام'}
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedDayDetail.isSunnahDay ? 'يوم سُنّة مبارك (إثنين/خميس)' : 'صيام تطوع وقضاء'}
                  </p>
                </div>
              </div>

              {onToggleFasting && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleFasting(selectedDayDetail.dateStr, selectedDayDetail.isFasting);
                    setSelectedDayDetail(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDayDetail.isFasting
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  }`}
                >
                  {selectedDayDetail.isFasting ? 'إلغاء الصيام' : 'تسجيل صيام اليوم'}
                </button>
              )}
            </div>

            {/* Prayers Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  سجل الصلوات الخمس ({selectedDayDetail.prayedCount}/5):
                </h5>
                {selectedDayDetail.isAllPrayersCompleted && (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                    مكتملة بالكامل ✓
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {[
                  { id: 'fajr', title: 'صلاة الفجر' },
                  { id: 'dhuhr', title: 'صلاة الظهر' },
                  { id: 'asr', title: 'صلاة العصر' },
                  { id: 'maghrib', title: 'صلاة المغرب' },
                  { id: 'isha', title: 'صلاة العشاء' },
                ].map((p) => {
                  const pLog = selectedDayDetail.prayers?.[p.id];
                  const isJamaah = pLog?.status === 'prayed_jamaah';
                  const isIndividual = pLog?.status === 'prayed_individual';
                  const isMissed = pLog?.status === 'missed';

                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                        isJamaah
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                          : isIndividual
                          ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-300'
                          : isMissed
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      <span>{p.title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">
                          {isJamaah
                            ? 'جماعة ✓'
                            : isIndividual
                            ? 'منفرداً ✓'
                            : isMissed
                            ? 'لم أصلِّ ✕'
                            : 'لم تسجل بعد'}
                        </span>
                        {pLog?.note && (
                          <span className="text-[10px] opacity-75">({pLog.note})</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Reflection Note if present */}
            {selectedDayDetail.dayPrayerLog?.note && (
              <p className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 italic">
                خاطرة اليوم: «{selectedDayDetail.dayPrayerLog.note}»
              </p>
            )}

            {/* Direct date picker trigger */}
            {onSelectDate && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectDate(selectedDayDetail.dateStr);
                    setSelectedDayDetail(null);
                  }}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  الانتقال لتسجيل أنشطة هذا اليوم في الصفحة الرئيسية
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
