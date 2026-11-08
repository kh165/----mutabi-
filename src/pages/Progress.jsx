import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useActivities } from '../hooks/useActivities.js';
import { useLogs } from '../hooks/useLogs.js';
import { Heatmap } from '../components/Heatmap.jsx';
import { ProgressRing } from '../components/ProgressRing.jsx';
import { MonthlyWorshipCalendar } from '../components/MonthlyWorshipCalendar.jsx';
import { WeeklyWorshipChart } from '../components/WeeklyWorshipChart.jsx';
import { calculateStreaks, calculateKhatma, getWeeklyChartData } from '../lib/stats.js';
import { evaluateBadges } from '../lib/badges.js';
import { calculateUserPoints, RANKS } from '../lib/points.js';
import { getTodayDateString } from '../lib/dates.js';
import {
  Flame,
  Award,
  BookOpen,
  TrendingUp,
  Calendar,
  CheckCircle,
  Sprout,
  Shield,
  CircleDot,
  SunMedium,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { TOTAL_PAGES } from '../data/quran.js';

export function Progress() {
  const { userDoc } = useAuth();
  const { isDark } = useTheme();
  const { activities } = useActivities(false);
  const { logs } = useLogs();
  const [medalFilter, setMedalFilter] = useState('all'); // 'all' | 'unlocked' | 'gold' | 'silver' | 'bronze'

  const todayStr = getTodayDateString(userDoc?.timezone);
  const streaks = calculateStreaks(logs, todayStr);
  const khatma = calculateKhatma(logs, activities);
  const weeklyData = getWeeklyChartData(logs, todayStr);
  const medals = evaluateBadges(logs, activities, todayStr);
  const userPoints = calculateUserPoints(logs, activities, streaks);

  const getMedalIcon = (iconName) => {
    switch (iconName) {
      case 'Sprout': return Sprout;
      case 'Flame': return Flame;
      case 'BookOpen': return BookOpen;
      case 'CircleDot': return CircleDot;
      case 'Shield': return Shield;
      case 'SunMedium': return SunMedium;
      case 'CheckCircle2': return CheckCircle2;
      case 'Trophy': return Trophy;
      default: return Award;
    }
  };

  const unlockedCount = medals.filter((m) => m.unlocked).length;

  const filteredMedals = medals.filter((m) => {
    if (medalFilter === 'unlocked') return m.unlocked;
    if (medalFilter === 'gold') return m.tier === 'gold';
    if (medalFilter === 'silver') return m.tier === 'silver';
    if (medalFilter === 'bronze') return m.tier === 'bronze';
    return true;
  });

  const getTierBadgeStyle = (tier) => {
    switch (tier) {
      case 'gold':
        return {
          label: 'ميدالية ذهبية 🥇',
          cardBorder: 'border-amber-300 dark:border-amber-700/60',
          badgeBg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
          iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
          barColor: 'bg-amber-500',
        };
      case 'silver':
        return {
          label: 'ميدالية فضية 🥈',
          cardBorder: 'border-slate-300 dark:border-slate-700',
          badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700',
          iconBg: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
          barColor: 'bg-slate-400',
        };
      case 'bronze':
      default:
        return {
          label: 'ميدالية برونزية 🥉',
          cardBorder: 'border-orange-300 dark:border-orange-800/60',
          badgeBg: 'bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800',
          iconBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
          barColor: 'bg-orange-500',
        };
    }
  };

  return (
    <div className="space-y-8 text-right">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          لوحة التقدم والمكافآت 📊
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          رصد إنجازك المستمر، رصيد نقاط الطاعات، واجهة الميداليات، وختمات القرآن الكريم.
        </p>
      </div>

      {/* Spiritual Rank & Points Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-3xl p-5 sm:p-7 shadow-lg">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Rank & Title */}
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-emerald-100">
              <Award className="w-4 h-4 text-emerald-200" />
              <span>نظام المكافآت والرتب الإيمانية</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              الرتبة الحالية: {userPoints.currentRank.title} (المستوى {userPoints.currentRank.level})
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
              {userPoints.currentRank.description}
            </p>

            {/* Next Level Progress */}
            {userPoints.nextRank && (
              <div className="space-y-1.5 pt-2 max-w-md">
                <div className="flex items-center justify-between text-xs text-emerald-100 font-bold">
                  <span>التقدم نحو المستوى التالي ({userPoints.nextRank.title})</span>
                  <span>{userPoints.progressPercent}%</span>
                </div>
                <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-emerald-300 h-full rounded-full transition-all duration-500"
                    style={{ width: `${userPoints.progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  متبقي {userPoints.pointsNeededForNext} نقطة للترقية إلى {userPoints.nextRank.title}
                </p>
              </div>
            )}
          </div>

          {/* Points Breakdown Counter */}
          <div className="shrink-0 bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 flex flex-col items-center justify-center min-w-[200px] text-center">
            <span className="text-xs text-emerald-100 font-bold">إجمالي رصيد النقاط</span>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1">
              {userPoints.totalPoints}
            </div>
            <span className="text-[11px] text-emerald-200 mt-1 font-semibold">نقطة عبادة مكتسبة</span>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/15 w-full text-[11px]">
              <div>
                <span className="block text-emerald-200/80">الصلوات</span>
                <span className="font-bold text-white">{userPoints.prayersCount}</span>
              </div>
              <div>
                <span className="block text-emerald-200/80">القرآن</span>
                <span className="font-bold text-white">{userPoints.quranPagesCount} ص</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Current Streak */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سلسلة الاستمرار</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {streaks.currentStreak} <span className="text-xs font-semibold text-slate-400">أيام</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            أطول سلسلة: {streaks.longestStreak} يوم
          </p>
        </div>

        {/* Total Active Days */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي أيام الإنجاز</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {streaks.activeDates.size} <span className="text-xs font-semibold text-slate-400">يوم</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            أيام أُنجز فيها ورد واحد على الأقل
          </p>
        </div>

        {/* Total Pages Read */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">صفحات القرآن</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {khatma.totalPagesRead} <span className="text-xs font-semibold text-slate-400">صفحة</span>
          </div>
          <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold mt-1">
            {khatma.completedKhatmas} ختمات مكتملة
          </p>
        </div>

        {/* Medals Unlocked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الميداليات المكتسبة</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {unlockedCount} <span className="text-xs font-semibold text-slate-400">من {medals.length}</span>
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
            ميداليات إنجازاتك الإيمانية
          </p>
        </div>
      </div>

      {/* Dedicated Medals Interface (واجهة الميداليات) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>واجهة الميداليات والأوسمة ({unlockedCount} من أصل {medals.length} مكتسبة)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              مكافآت ونقاط تُمنح عند إتمام الأنشطة، والمداومة على الصلوات الخمس وختمات القرآن.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'unlocked', label: 'المكتسبة ✓' },
              { id: 'gold', label: 'الذهبية 🥇' },
              { id: 'silver', label: 'الفضية 🥈' },
              { id: 'bronze', label: 'البرونزية 🥉' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMedalFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  medalFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Medals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredMedals.map((medal) => {
            const Icon = getMedalIcon(medal.icon);
            const style = getTierBadgeStyle(medal.tier);

            return (
              <div
                key={medal.id}
                className={`p-4 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  medal.unlocked
                    ? `bg-white dark:bg-slate-900 ${style.cardBorder} shadow-2xs`
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-65'
                }`}
              >
                <div>
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badgeBg}`}>
                      {style.label}
                    </span>

                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      +{medal.points} نقطة
                    </span>
                  </div>

                  {/* Icon & Title */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        medal.unlocked
                          ? style.iconBg
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {medal.title}
                        </h4>
                        {medal.unlocked && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            ✓ مكتملة
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {medal.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress bar towards completion */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>
                      {medal.currentValue} / {medal.targetValue} {medal.unit}
                    </span>
                    <span>{medal.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        medal.unlocked ? style.barColor : 'bg-slate-400'
                      }`}
                      style={{ width: `${medal.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quran Khatma Showcase Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-right flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>متابعة ختمة المصحف الشريف</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              وصلت إلى الصفحة {khatma.currentPageInKhatma} من أصل {TOTAL_PAGES} صفحة
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
              متبقي لك {khatma.remainingPages} صفحة لإتمام ختمتك الحالية. داوم على قراءة صفحات وردك بانتظام لتثبيتها.
            </p>

            <div className="flex items-center justify-center md:justify-start gap-4 pt-1 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>الختمات السابقة: <strong>{khatma.completedKhatmas}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <BookOpen className="w-4 h-4 text-sky-500" />
                <span>الجزء الحالي: <strong>{Math.min(30, Math.ceil(khatma.currentPageInKhatma / 20) || 1)}</strong></span>
              </div>
            </div>
          </div>

          <div className="shrink-0 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700">
            <ProgressRing
              percentage={khatma.percentage}
              size={120}
              strokeWidth={10}
              color="#0284c7"
              backgroundColor={isDark ? "#334155" : "#e2e8f0"}
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{khatma.percentage}%</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">من الختمة</span>
              </div>
            </ProgressRing>
          </div>
        </div>
      </div>

      {/* Heatmap & Consistency Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>خريطة الالتزام اليومي (آخر 10 أسابيع)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            كل مربع يمثل يوماً؛ تزداد قتامة اللون بزيادة عدد العبادات والأنشطة المنجزة.
          </p>
        </div>
        <Heatmap logs={logs} todayStr={todayStr} daysCount={70} />
      </div>

      {/* Monthly Worship Calendar in Progress Tab */}
      <MonthlyWorshipCalendar logs={logs} activities={activities} />

      {/* Weekly Breakdown Chart (Recharts) */}
      <WeeklyWorshipChart weeklyData={weeklyData} isDark={isDark} />
    </div>
  );
}
