import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useActivities } from '../hooks/useActivities.js';
import { useLogs } from '../hooks/useLogs.js';
import { useEncouragements } from '../hooks/useEncouragements.js';
import { ActivityCard } from '../components/ActivityCard.jsx';
import { PrayersTrackerCard } from '../components/PrayersTrackerCard.jsx';
import { ProgressRing } from '../components/ProgressRing.jsx';
import { MonthlyWorshipCalendar } from '../components/MonthlyWorshipCalendar.jsx';
import { QuranReaderModal } from '../components/QuranReaderModal.jsx';
import { AdhkarReaderModal } from '../components/AdhkarReaderModal.jsx';
import { getTodayDateString, getPastDaysList, formatArabicDate } from '../lib/dates.js';
import { calculateKhatma, getLatestMemorizedPosition } from '../lib/stats.js';
import {
  Calendar,
  Heart,
  CircleDot,
  Layers,
  X,
  CheckCircle2,
  CalendarDays,
  ListTodo,
  BookOpen,
  SunMedium,
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
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'prayers' | 'quran' | 'adhkar' | 'remaining'
  const [seeding, setSeeding] = useState(false);

  // Quick Reader Modals from the Hero Launchpad
  const [quranModalOpen, setQuranModalOpen] = useState(false);
  const [adhkarModalOpen, setAdhkarModalOpen] = useState(false);
  const [adhkarInitialCategory, setAdhkarInitialCategory] = useState('morning');

  // Celebratory encouragement banner
  const [encouragementBanner, setEncouragementBanner] = useState(null);

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

  // Find the prayer activity if present
  const prayerActivity = activities.find(
    (a) => a.type === 'prayers' || a.id === 'prayers' || a.title.includes('الصلوات الخمس')
  );
  const prayerActivityId = prayerActivity ? prayerActivity.id : 'prayers';
  const prayerLog = logsMap.get(prayerActivityId) || logsMap.get('prayers');

  // Calculate day completion
  const totalActivities = activities.length;
  const completedCount = activities.filter((a) => {
    const l = logsMap.get(a.id);
    return l && l.completed;
  }).length;

  const dayPercentage =
    totalActivities > 0 ? Math.round((completedCount / totalActivities) * 100) : 0;

  const khatmaStats = calculateKhatma(logs, activities);
  const latestPosition = getLatestMemorizedPosition(logs);

  // Dynamic time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = userDoc?.displayName ? `يا ${userDoc.displayName.split(' ')[0]}` : '';
    if (hour >= 4 && hour < 12) {
      return `صباح البركة والنور والنشاط ${name} 🌅`;
    } else if (hour >= 12 && hour < 17) {
      return `طاب يومك بذكر الله وطاعته ${name} ☀️`;
    } else {
      return `مساء السكينة وطمأنينة القلب ${name} 🌙`;
    }
  };

  const handleAchievement = (activityTitle) => {
    const phrase = getRandomPhrase();
    setEncouragementBanner({ activityTitle, phrase });
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedPresetsToDatabase();
    } finally {
      setSeeding(false);
    }
  };

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

  // Specific handler for saving a prayer with user stats update in Realtime Database
  const handleSavePrayer = async (actId, dStr, performedCount, isCompleted, details, note) => {
    try {
      // 1. Save prayer log directly in Realtime Database
      await saveLog(actId, dStr, performedCount, isCompleted, details, note);

      // 2. Update user status in Realtime Database (today's prayer count & last active prayer)
      if (updateUserDoc) {
        await updateUserDoc({
          lastPrayerUpdate: {
            date: dStr,
            performedCount,
            isCompleted,
            updatedAt: new Date().toISOString(),
          },
        });
      }

      if (details?.lastUpdatedPrayer && details?.lastUpdatedStatus) {
        handleAchievement(`${details.lastUpdatedPrayer}`);
      }
    } catch (err) {
      console.error('Failed to save prayer to Realtime Database:', err);
      throw err;
    }
  };

  // Filter activities based on the selected category tab
  // If prayers tab is selected or all is selected, we can render the dedicated PrayersTrackerCard
  const filteredActivities = activities
    .filter((act) => {
      // Don't duplicate prayers card in the grid if dedicated card is shown
      if (act.type === 'prayers' || act.id === 'prayers') {
        return false;
      }
      const isDone = !!logsMap.get(act.id)?.completed;
      if (categoryFilter === 'remaining') return !isDone;
      if (categoryFilter === 'prayers') return false; // Handled by PrayersTrackerCard
      if (categoryFilter === 'quran') return act.type === 'read' || act.type === 'memorize' || act.title.includes('قرآن') || act.type === 'listen';
      if (categoryFilter === 'adhkar') return act.title.includes('أذكار') || act.title.includes('تسبيح') || act.title.includes('صيام');
      return true;
    });

  const shouldShowPrayersCard = categoryFilter === 'all' || categoryFilter === 'prayers';

  return (
    <div className="space-y-6 text-right">
      {/* Encouragement Pop-up */}
      {encouragementBanner && (
        <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-xl rounded-3xl p-4 sm:p-5 text-right animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                <Heart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Spiritual Greeting & Progress Dashboard */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-emerald-700/40">
        <div className="absolute top-0 end-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -start-10 w-60 h-60 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatArabicDate(selectedDate, true)}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {getGreeting()}
            </h1>

            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl leading-relaxed font-medium">
              «أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ» • استمر في المحافظة على وردك اليومي، واجعل كل خطوة لك اليوم بركة وقربة.
            </p>

            {/* Quick Launchpad Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {/* Quran Reader */}
              <button
                type="button"
                onClick={() => setQuranModalOpen(true)}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center gap-2.5 transition-all text-right group select-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white group-hover:text-emerald-200 leading-snug whitespace-normal break-words">
                    المصحف الشريف
                  </span>
                  <span className="block text-[10px] text-emerald-200/80 leading-tight whitespace-normal">تلاوة وراحة عين</span>
                </div>
              </button>

              {/* Smart Tasbeeh */}
              <button
                type="button"
                onClick={onNavigateToTasbeeh}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center gap-2.5 transition-all text-right group select-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-teal-500/30 flex items-center justify-center shrink-0">
                  <CircleDot className="w-4 h-4 text-teal-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white group-hover:text-teal-200 leading-snug whitespace-normal break-words">
                    المسبحة الذكية
                  </span>
                  <span className="block text-[10px] text-teal-200/80 leading-tight whitespace-normal">عداد وسجل الذكر</span>
                </div>
              </button>

              {/* Morning/Evening Adhkar */}
              <button
                type="button"
                onClick={() => {
                  setAdhkarInitialCategory(new Date().getHours() < 13 ? 'morning' : 'evening');
                  setAdhkarModalOpen(true);
                }}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center gap-2.5 transition-all text-right group select-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/30 flex items-center justify-center shrink-0">
                  <SunMedium className="w-4 h-4 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white group-hover:text-amber-200 leading-snug whitespace-normal break-words">
                    حصن المسلم
                  </span>
                  <span className="block text-[10px] text-amber-200/80 leading-tight whitespace-normal">أذكار الصباح والمساء</span>
                </div>
              </button>

              {/* Monthly Calendar */}
              <button
                type="button"
                onClick={() => setActiveMainView(activeMainView === 'daily' ? 'calendar' : 'daily')}
                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center gap-2.5 transition-all text-right group select-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/30 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-white group-hover:text-indigo-200 leading-snug whitespace-normal break-words">
                    تقويم العبادات
                  </span>
                  <span className="block text-[10px] text-indigo-200/80 leading-tight whitespace-normal">الصلوات والصيام</span>
                </div>
              </button>
            </div>
          </div>

          {/* Daily Progress Ring in Hero */}
          <div className="shrink-0 flex items-center justify-center bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/15">
            <ProgressRing
              percentage={dayPercentage}
              size={120}
              strokeWidth={11}
              color="#34d399"
              backgroundColor="rgba(255, 255, 255, 0.15)"
            >
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-white">{dayPercentage}%</span>
                <span className="text-[10px] text-emerald-200 font-bold">
                  {completedCount}/{totalActivities} مكتمل
                </span>
              </div>
            </ProgressRing>
          </div>
        </div>
      </div>

      {/* Main View Switcher: الورد اليومي vs تقويم الصلوات والصيام */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setActiveMainView('daily')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMainView === 'daily'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>الورد والأنشطة اليومية</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainView('calendar')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
            onSelectDate={(targetDate) => {
              setSelectedDate(targetDate);
              setActiveMainView('daily');
            }}
          />
        </div>
      ) : (
        /* Daily View Section */
        <>
          {/* Past 7 Days Navigator Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2.5 sm:p-3 shadow-2xs">
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
                    className={`flex-1 min-w-[70px] sm:min-w-[80px] py-2 sm:py-2.5 px-2 rounded-2xl flex flex-col items-center gap-0.5 sm:gap-1 transition-all text-center cursor-pointer ${
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

          {/* DEDICATED 5 PRAYERS TRACKER CARD */}
          {shouldShowPrayersCard && (
            <PrayersTrackerCard
              log={prayerLog}
              dateStr={selectedDate}
              prayerActivityId={prayerActivityId}
              onSavePrayer={handleSavePrayer}
              onResetAllPrayers={resetLog}
            />
          )}

          {/* Activities Filter Tabs */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                الكل ({activities.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('prayers')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === 'prayers'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                الصلوات 🕌
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('quran')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === 'quran'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                القرآن والتدبر 📖
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('adhkar')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === 'adhkar'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                الأذكار والسنن 📿
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('remaining')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  categoryFilter === 'remaining'
                    ? 'bg-amber-500 text-white shadow-2xs font-black'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                المتبقي لليوم ({Math.max(0, totalActivities - completedCount)})
              </button>
            </div>
          </div>

          {/* Activities Grid */}
          <div>
            {activities.length === 0 ? (
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
                    className="mt-2 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{seeding ? 'جارٍ التهيئة...' : 'تهيئة باقة الأنشطة المقترحة'}</span>
                  </button>
                )}
              </div>
            ) : filteredActivities.length === 0 && categoryFilter !== 'prayers' ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-xs text-slate-500">
                لا توجد عبادات أخرى تطابق هذا التبويب المحدد حالياً.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                {filteredActivities.map((activity) => (
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

      {/* Hero-accessible Quran Reader Modal */}
      <QuranReaderModal
        isOpen={quranModalOpen}
        onClose={() => setQuranModalOpen(false)}
        initialSurahNumber={1}
        onLogPagesRead={async (surah) => {
          const readAct = activities.find((a) => a.type === 'read' || a.title.includes('تلاوة'));
          if (readAct) {
            await saveLog(readAct.id, selectedDate, 2, true, { surah: surah.name, page: surah.startPage }, `قراءة سورة ${surah.name}`);
            handleAchievement(`تلاوة سورة ${surah.name}`);
          }
        }}
      />

      {/* Hero-accessible Adhkar Reader Modal */}
      <AdhkarReaderModal
        isOpen={adhkarModalOpen}
        onClose={() => setAdhkarModalOpen(false)}
        initialCategory={adhkarInitialCategory}
        onCompleteCategory={async (title) => {
          const adhkarAct = activities.find((a) => a.title.includes('أذكار'));
          if (adhkarAct) {
            await saveLog(adhkarAct.id, selectedDate, 1, true, { category: title }, title);
            handleAchievement(title);
          }
        }}
      />
    </div>
  );
}
