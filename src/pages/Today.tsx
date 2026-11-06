import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useActivities } from '../hooks/useActivities';
import { useLogs } from '../hooks/useLogs';
import { useEncouragements } from '../hooks/useEncouragements';
import { ActivityCard } from '../components/ActivityCard';
import { ProgressRing } from '../components/ProgressRing';
import { getTodayDateString, getPastDaysList, formatArabicDate } from '../lib/dates';
import { calculateKhatma, getLatestMemorizedPosition } from '../lib/stats';
import {
  Calendar,
  Sparkles,
  Database,
  Plus,
  Quote,
  X,
  CheckCircle2,
} from 'lucide-react';

export function Today() {
  const { user, userDoc, isAdmin } = useAuth();
  const { activities, loading: loadingActivities, seedPresetsToDatabase } = useActivities(false);
  const { logs, saveLog, resetLog, loading: loadingLogs } = useLogs();
  const { getRandomPhrase } = useEncouragements();

  const todayStr = getTodayDateString(userDoc?.timezone);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [seeding, setSeeding] = useState(false);

  // Celebratory encouragement popup state
  const [encouragementBanner, setEncouragementBanner] = useState<{
    activityTitle: string;
    phrase: string;
  } | null>(null);

  // Auto-dismiss encouragement after 6 seconds
  useEffect(() => {
    if (!encouragementBanner) return;
    const timer = setTimeout(() => {
      setEncouragementBanner(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [encouragementBanner]);

  const pastDays = getPastDaysList(todayStr, 7);

  // Filter logs strictly for the selected date
  const dateLogs = logs.filter((l) => l.date === selectedDate);
  const logsMap = new Map(dateLogs.map((l) => [l.activityId, l]));

  // Calculate day completion
  const totalActivities = activities.length;
  const completedCount = activities.filter((a) => {
    const l = logsMap.get(a.id);
    return l && l.completed;
  }).length;

  const dayPercentage =
    totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;
  const allCompleted = totalActivities > 0 && completedCount === totalActivities;

  // Real Khatma & Memorize stats computed strictly from user's logs
  const khatmaStats = calculateKhatma(logs, activities);
  const latestPosition = getLatestMemorizedPosition(logs);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedPresetsToDatabase();
    } finally {
      setSeeding(false);
    }
  };

  const handleAchievement = (activityTitle: string) => {
    const phrase = getRandomPhrase();
    setEncouragementBanner({ activityTitle, phrase });
  };

  return (
    <div className="space-y-6 text-right">
      {/* Dynamic Celebration Encouragement Banner (Custom from Admin) */}
      {encouragementBanner && (
        <div className="bg-white border-2 border-emerald-500 shadow-lg rounded-3xl p-4 sm:p-5 text-right animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-emerald-600 animate-spin-slow" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-emerald-900">
                    تقبل الله منك! إنجاز مبارك في «{encouragementBanner.activityTitle}»
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <p className="text-xs sm:text-sm text-slate-800 font-semibold mt-1 leading-relaxed bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/50">
                  «{encouragementBanner.phrase}»
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEncouragementBanner(null)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Date Navigator Bar */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-2.5 sm:p-3 shadow-sm">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {pastDays.map((d) => {
            const isSelected = selectedDate === d.date;
            const isToday = d.date === todayStr;

            const dayCompleted =
              totalActivities > 0 &&
              activities.every((a) => {
                const l = logs.find((log) => log.date === d.date && log.activityId === a.id);
                return l && l.completed;
              });

            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className={`flex-1 min-w-[70px] sm:min-w-[80px] py-2 sm:py-2.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 sm:gap-1 transition-all text-center ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
                }`}
              >
                <span className="text-[10px] sm:text-[11px] opacity-80">
                  {isToday ? 'اليوم' : d.label.split('،')[0]}
                </span>
                <span className="text-[11px] sm:text-xs font-bold">
                  {d.date.split('-')[2]}/{d.date.split('-')[1]}
                </span>
                {dayCompleted && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bright & Luminous Daily Progress Overview (Clean White Surface) */}
      <div className="bg-white border border-emerald-200/90 rounded-3xl p-5 sm:p-6 text-slate-900 shadow-sm relative overflow-hidden">
        {/* Soft pastel ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2 text-center sm:text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{formatArabicDate(selectedDate, true)}</span>
            </div>

            <h2 className="text-xl sm:text-3xl font-black text-slate-900">
              {allCompleted ? 'ما شاء الله! أنجزت كل أهدافك 🎉' : 'ورد اليوم وبركتُه 🌱'}
            </h2>

            <p className="text-slate-600 text-xs sm:text-sm max-w-md leading-relaxed">
              {allCompleted
                ? 'تقبل الله طاعتك وثبتك على هذا الخير العظيم، وجعله في موازين حسناتك.'
                : totalActivities > 0
                ? `أنجزت ${completedCount} من أصل ${totalActivities} أنشطة محددة لليوم.`
                : 'أهلاً بك في منصة مُتابِع. ابدأ بتسجيل أنشطتك واستمرارك اليومي.'}
            </p>
          </div>

          <div className="shrink-0 bg-slate-50 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs">
            <ProgressRing
              percentage={dayPercentage}
              size={105}
              strokeWidth={10}
              color="#10b981"
              backgroundColor="#e2e8f0"
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900">{dayPercentage}%</span>
                <span className="text-[10px] text-slate-500 font-bold">
                  {completedCount}/{totalActivities} تم
                </span>
              </div>
            </ProgressRing>
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>أنشطة الورد اليومي</span>
            <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-2xs">
              {totalActivities}
            </span>
          </h3>
          <span className="text-xs text-slate-400 hidden sm:inline">
            اضغط على أي كارت للتسجيل المفصل
          </span>
        </div>

        {loadingActivities || loadingLogs ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-white border border-slate-200 rounded-3xl animate-pulse"
              />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white border border-slate-200/90 rounded-3xl space-y-3 shadow-sm">
            <Database className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">
              لا توجد أنشطة مسجلة في المنصة حاليًا
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              {isAdmin
                ? 'بصفتك المشرف، يمكنك تهيئة باقة الأنشطة الأساسية المقترحة للمنصة، أو تخصيص أنشطة جديدة من لوحة الإدارة.'
                : 'سيقوم المشرف بإضافة وتفعيل الأنشطة لتظهر لك هنا.'}
            </p>

            {isAdmin && (
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeed}
                className="mt-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{seeding ? 'جارٍ التهيئة...' : 'تهيئة الأنشطة الأساسية المقترحة الآن'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                log={logsMap.get(activity.id)}
                dateStr={selectedDate}
                onSaveLog={saveLog}
                onResetLog={resetLog}
                latestPosition={activity.type === 'memorize' ? latestPosition : undefined}
                khatmaStats={activity.type === 'read' ? khatmaStats : undefined}
                onAchievement={handleAchievement}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
