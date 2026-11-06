import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useActivities } from '../hooks/useActivities.js';
import { useLogs } from '../hooks/useLogs.js';
import { useEncouragements } from '../hooks/useEncouragements.js';
import { ActivityCard } from '../components/ActivityCard.jsx';
import { ProgressRing } from '../components/ProgressRing.jsx';
import { TasbeehCounter } from '../components/TasbeehCounter.jsx';
import { MonthlyWorshipCalendar } from '../components/MonthlyWorshipCalendar.jsx';
import { getTodayDateString, getPastDaysList, formatArabicDate } from '../lib/dates.js';
import { calculateKhatma, getLatestMemorizedPosition } from '../lib/stats.js';
import {
  Calendar,
  Sparkles,
  Layers,
  X,
  CheckCircle2,
  CalendarDays,
  ListTodo,
} from 'lucide-react';

export function Today({ onNavigateToTasbeeh }) {
  const { user, userDoc, isAdmin, updateUserDoc } = useAuth();
  const { isDark } = useTheme();
  const { activities, loading: loadingActivities, seedPresetsToDatabase } = useActivities(false);
  const { logs, saveLog, resetLog, loading: loadingLogs } = useLogs();
  const { getRandomPhrase } = useEncouragements();

  const todayStr = getTodayDateString(userDoc?.timezone);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeMainView, setActiveMainView] = useState('daily'); // 'daily' | 'calendar'
  const [seeding, setSeeding] = useState(false);

  // Celebratory encouragement popup state
  const [encouragementBanner, setEncouragementBanner] = useState(null);

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

  const handleAchievement = (activityTitle) => {
    const phrase = getRandomPhrase();
    setEncouragementBanner({ activityTitle, phrase });
  };

  // Handler for Tasbeeh counter to save in daily log
  const handleSaveTasbeeh = async (count, dhikrTitle) => {
    try {
      // Find or match tasbeeh activity if exists
      const tasbeehActivity = activities.find(
        (a) => a.id === 'tasbeeh' || a.id.startsWith('tasbeeh_') || a.title.includes('تسبيح')
      );
      const actId = tasbeehActivity ? tasbeehActivity.id : 'tasbeeh';
      const prevLog = logsMap.get(actId);
      const newAmount = (prevLog?.amount || 0) + count;
      await saveLog(actId, selectedDate, newAmount, true, {
        dhikr: dhikrTitle,
        lastAdded: count,
        updatedAt: new Date().toISOString(),
      }, dhikrTitle || 'تسبيح وأذكار');
      handleAchievement(dhikrTitle || 'عداد التسبيح');
    } catch (e) {
      console.error('Error saving tasbeeh count', e);
    }
  };

  // Handler for toggling fasting directly from calendar view
  const handleToggleFasting = async (dateStr, currentlyFasted) => {
    try {
      const fastingAct = activities.find(
        (a) => a.id === 'fasting' || a.id.startsWith('fasting_') || a.title.includes('صيام')
      );
      const actId = fastingAct ? fastingAct.id : 'fasting';
      if (currentlyFasted) {
        await resetLog(actId, dateStr);
      } else {
        await saveLog(actId, dateStr, 1, true, { fasting: true }, 'صيام تطوع');
        handleAchievement('صيام اليوم');
      }
    } catch (e) {
      console.error('Error toggling fasting', e);
    }
  };

  // Handler for updating custom user target for an activity
  const handleUpdateTarget = async (activityId, newTarget) => {
    try {
      const currentTargets = userDoc?.customTargets || {};
      const updatedTargets = { ...currentTargets, [activityId]: newTarget };
      await updateUserDoc({ customTargets: updatedTargets });
      handleAchievement(`تحديث الهدف اليومي لـ ${newTarget}`);
    } catch (e) {
      console.error('Error updating custom target', e);
    }
  };

  return (
    <div className="space-y-6 text-right">
      {/* Dynamic Celebration Encouragement Banner */}
      {encouragementBanner && (
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl rounded-3xl p-4 sm:p-5 text-right animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                    تقبل الله منك! إنجاز مبارك في «{encouragementBanner.activityTitle}»
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold mt-1 leading-relaxed bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  «{encouragementBanner.phrase}»
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEncouragementBanner(null)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Switcher: الورد اليومي vs تقويم الصلوات والصيام */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setActiveMainView('daily')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeMainView === 'daily'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>الورد اليومي والتسبيح</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainView('calendar')}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeMainView === 'calendar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>تقويم الصلوات والصيام الشهري</span>
          </button>
        </div>
      </div>

      {activeMainView === 'calendar' ? (
        /* Calendar View Section */
        <div className="space-y-6">
          <MonthlyWorshipCalendar
            logs={logs}
            activities={activities}
            onToggleFasting={handleToggleFasting}
          />
        </div>
      ) : (
        /* Daily View Section */
        <>
          {/* Date Navigator Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2.5 sm:p-3 shadow-sm">
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
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium'
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

          {/* Daily Progress Overview Card */}
          <div className="bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-slate-100 shadow-sm relative overflow-hidden">
            {/* Soft pastel ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 dark:bg-emerald-950/20 rounded-full blur-3xl pointer-events-none -z-10" />

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
              <div className="space-y-2 text-center sm:text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{formatArabicDate(selectedDate, true)}</span>
                </div>

                <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {allCompleted ? 'ما شاء الله! أنجزت كل أهدافك 🎉' : 'ورد اليوم وبركتُه 🌱'}
                </h2>

                <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-md leading-relaxed">
                  {allCompleted
                    ? 'تقبل الله طاعتك وثبتك على هذا الخير العظيم، وجعله في موازين حسناتك.'
                    : totalActivities > 0
                    ? `أنجزت ${completedCount} من أصل ${totalActivities} أنشطة محددة لليوم.`
                    : 'أهلاً بك في منصة مُتابِع. ابدأ بتسجيل أنشطتك واستمرارك اليومي.'}
                </p>
              </div>

              <div className="shrink-0 bg-slate-50 dark:bg-slate-800/80 p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                <ProgressRing
                  percentage={dayPercentage}
                  size={105}
                  strokeWidth={10}
                  color="#10b981"
                  backgroundColor={isDark ? "#334155" : "#e2e8f0"}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{dayPercentage}%</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      {completedCount}/{totalActivities} تم
                    </span>
                  </div>
                </ProgressRing>
              </div>
            </div>
          </div>

          {/* Dedicated Tasbeeh & Adhkar Banner Launcher */}
          <div
            onClick={onNavigateToTasbeeh}
            className="p-4 sm:p-5 bg-gradient-to-l from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl shadow-md cursor-pointer hover:shadow-lg transition-all flex items-center justify-between gap-4 select-none"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0 shadow-inner">
                📿
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base">
                    مسبحة الأذكار وحصن المسلم
                  </h3>
                  <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                    قسم مستقل
                  </span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed">
                  أذكار الصباح والمساء كاملة مع التكرار والفضائل، وعداد تسبيح رقمي مع كامل الأذكار المسنونة.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-xl shadow-xs whitespace-nowrap shrink-0 transition-all"
            >
              افتح المسبحة والأذكار ↗
            </button>
          </div>

          {/* Activities Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>أنشطة الورد اليومي</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full shadow-2xs">
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
                    className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse"
                  />
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 shadow-sm">
                <Layers className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                  لا توجد أنشطة مسجلة في المنصة حاليًا
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {isAdmin
                    ? 'بصفتك المشرف، يمكنك تهيئة باقة الأنشطة الأساسية المقترحة للمنصة بنقرة واحدة، أو تخصيص أنشطة جديدة من لوحة الإدارة.'
                    : 'سيقوم المشرف بإضافة وتفعيل الأنشطة لتظهر لك هنا.'}
                </p>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeed}
                    className="mt-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{seeding ? 'جارٍ التهيئة...' : 'تهيئة باقة الأنشطة المقترحة'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    log={logsMap.get(activity.id)}
                    dateStr={selectedDate}
                    onSaveLog={saveLog}
                    onResetLog={resetLog}
                    latestPosition={latestPosition}
                    khatmaStats={khatmaStats}
                    onAchievement={handleAchievement}
                    customTarget={userDoc?.customTargets?.[activity.id]}
                    onUpdateTarget={handleUpdateTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
