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
import { PrayerTimesBar } from '../components/PrayerTimesBar.jsx';
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
  CloudDownload,
  Wifi,
  WifiOff,
  CheckSquare,
} from 'lucide-react';
import { getOfflinePackageStatus } from '../lib/offlineSync.js';

export function Today({ onNavigateToTasbeeh, onNavigateToHadith, onNavigateToTodos }) {
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
  const [offlinePkgStatus, setOfflinePkgStatus] = useState(() => getOfflinePackageStatus());

  useEffect(() => {
    const handleUpdate = () => {
      setOfflinePkgStatus(getOfflinePackageStatus());
    };
    window.addEventListener('mutabi_offline_queue_update', handleUpdate);
    window.addEventListener('mutabi_sync_status', handleUpdate);
    return () => {
      window.removeEventListener('mutabi_offline_queue_update', handleUpdate);
      window.removeEventListener('mutabi_sync_status', handleUpdate);
    };
  }, []);

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

  // Specific handler for saving a prayer with user stats update
  const handleSavePrayer = async (actId, dStr, performedCount, isCompleted, details, note) => {
    try {
      await saveLog(actId, dStr, performedCount, isCompleted, details, note);

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
      console.error('Failed to save prayer:', err);
      throw err;
    }
  };

  // Filter activities based on the selected category tab
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

  // Quick launchpad buttons (full text, no truncation)
  const launchItems = [
    {
      key: 'quran',
      label: 'المصحف الشريف',
      sub: 'تلاوة وراحة عين',
      Icon: BookOpen,
      iconBg: 'bg-emerald-500/30',
      iconColor: 'text-emerald-300',
      hoverText: 'group-hover:text-emerald-200',
      subColor: 'text-emerald-200/80',
      onClick: () => setQuranModalOpen(true),
    },
    {
      key: 'tasbeeh',
      label: 'المسبحة الذكية',
      sub: 'عداد وسجل الذكر',
      Icon: CircleDot,
      iconBg: 'bg-teal-500/30',
      iconColor: 'text-teal-300',
      hoverText: 'group-hover:text-teal-200',
      subColor: 'text-teal-200/80',
      onClick: onNavigateToTasbeeh,
    },
    {
      key: 'adhkar',
      label: 'حصن المسلم',
      sub: 'أذكار اليوم والليلة',
      Icon: SunMedium,
      iconBg: 'bg-amber-500/30',
      iconColor: 'text-amber-300',
      hoverText: 'group-hover:text-amber-200',
      subColor: 'text-amber-200/80',
      onClick: () => {
        setAdhkarInitialCategory(new Date().getHours() < 13 ? 'morning' : 'evening');
        setAdhkarModalOpen(true);
      },
    },
    {
      key: 'hadith',
      label: 'الأحاديث النبوية',
      sub: 'البخاري ومسلم والنووية',
      Icon: BookOpen,
      iconBg: 'bg-rose-500/30',
      iconColor: 'text-rose-300',
      hoverText: 'group-hover:text-rose-200',
      subColor: 'text-rose-200/80',
      onClick: onNavigateToHadith,
    },
    {
      key: 'calendar',
      label: 'تقويم العبادات',
      sub: 'الصلوات والصيام',
      Icon: CalendarDays,
      iconBg: 'bg-indigo-500/30',
      iconColor: 'text-indigo-300',
      hoverText: 'group-hover:text-indigo-200',
      subColor: 'text-indigo-200/80',
      onClick: () => setActiveMainView(activeMainView === 'daily' ? 'calendar' : 'daily'),
    },
    {
      key: 'todos',
      label: 'قائمة المهام',
      sub: 'تنظيم ومتابعة المهام',
      Icon: CheckSquare,
      iconBg: 'bg-teal-500/30',
      iconColor: 'text-teal-300',
      hoverText: 'group-hover:text-teal-200',
      subColor: 'text-teal-200/80',
      onClick: onNavigateToTodos,
    },
  ];

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
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950 text-white rounded-3xl p-4 sm:p-7 shadow-xl relative overflow-hidden border border-emerald-700/40">
        <div className="absolute top-0 end-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -start-10 w-60 h-60 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatArabicDate(selectedDate, true)}</span>
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {getGreeting()}
            </h1>

            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl leading-relaxed font-medium">
              «أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ» • استمر في المحافظة على وردك اليومي، واجعل كل خطوة لك اليوم بركة وقربة.
            </p>

            {/* Quick Launchpad Buttons - 2 columns on mobile, 3 on larger screens, full text visible */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-2">
              {launchItems.map(({ key, label, sub, Icon, iconBg, iconColor, hoverText, subColor, onClick }) => (
                <button
                  key={key}
                  type="button"
                  onClick={onClick}
                  className="p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/15 flex items-center gap-2.5 transition-all text-right group select-none cursor-pointer min-h-[56px]"
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`block text-xs sm:text-sm font-bold text-white ${hoverText} leading-snug break-words`}>
                      {label}
                    </span>
                    <span className={`block text-[10px] sm:text-[11px] ${subColor} leading-snug break-words mt-0.5`}>
                      {sub}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Progress Ring in Hero */}
          <div className="shrink-0 flex items-center justify-center bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-white/15 self-center lg:self-auto">
            <ProgressRing
              percentage={dayPercentage}
              size={108}
              strokeWidth={10}
              color="#34d399"
              backgroundColor="rgba(255, 255, 255, 0.15)"
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-white">{dayPercentage}%</span>
                <span className="text-[10px] text-emerald-200 font-bold">
                  {completedCount}/{totalActivities} مكتمل
                </span>
              </div>
            </ProgressRing>
          </div>
        </div>
      </div>

      {/* Live Geolocation Prayer Times Bar & Phone Notifications */}
      <PrayerTimesBar userDoc={userDoc} updateUserDoc={updateUserDoc} />

      {/* Offline Ready & Cache Download Promo Banner */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
        offlinePkgStatus?.isReady
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
          : 'bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-slate-900 dark:to-emerald-950/30 border-amber-200 dark:border-emerald-800/60'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              offlinePkgStatus?.isReady
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
            }`}>
              <CloudDownload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {offlinePkgStatus?.isReady
                  ? 'بيانات المنصة مهيأة وجاهزة بالكامل للعمل بدون إنترنت'
                  : 'هل ترغب في حفظ المصحف والأذكار والأحاديث لتعمل بدون إنترنت؟'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {offlinePkgStatus?.isReady
                  ? 'تسجيل الصلوات والأذكار يعمل أوفلاين ويتم رفعه تلقائياً للسحابة فور توفر الاتصال.'
                  : 'قم بتحميل الحزمة الكاملة لتصفح القرآن وحصن المسلم والأربعين النووية أينما كنت.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('mutabi:open-offline-modal'))}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              offlinePkgStatus?.isReady
                ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {offlinePkgStatus?.isReady ? 'فحص ومزامنة البيانات' : 'تحميل الحزمة الآن'}
          </button>
        </div>
      </div>

      {/* Main View Switcher */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setActiveMainView('daily')}
            className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeMainView === 'daily'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">الورد والأنشطة اليومية</span>
            <span className="sm:hidden">الورد اليومي</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainView('calendar')}
            className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              activeMainView === 'calendar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">تقويم الصلوات والصيام الشهري</span>
            <span className="sm:hidden">تقويم الصلوات</span>
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2 sm:p-3 shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                    className={`flex-1 min-w-[56px] sm:min-w-[76px] py-1.5 sm:py-2.5 px-1 sm:px-2 rounded-xl sm:rounded-2xl flex flex-col items-center gap-0.5 sm:gap-1 transition-all text-center cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <span className="text-[10px] sm:text-[11px] opacity-80">
                      {isToday ? 'اليوم' : d.label.split('،')[0]}
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold tabular-nums">
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-[11px] sm:text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  categoryFilter === 'remaining'
                    ? 'bg-amber-500 text-white shadow-2xs font-black'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                المتبقي ({Math.max(0, totalActivities - completedCount)})
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
            await saveLog(
              readAct.id,
              selectedDate,
              1,
              true,
              { surah: surah.name, page: surah.startPage, fromPage: surah.startPage, toPage: surah.startPage },
              `قراءة الصفحة ${surah.startPage} من سورة ${surah.name}`,
            );
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