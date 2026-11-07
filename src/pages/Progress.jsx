import React from 'react';
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
import { getTodayDateString } from '../lib/dates.js';
import {
  Flame,
  Award,
  BookOpen,
  Brain,
  TrendingUp,
  Calendar,
  CheckCircle,
  Sprout,
  Target,
} from 'lucide-react';
import { TOTAL_PAGES } from '../data/quran.js';

export function Progress() {
  const { userDoc } = useAuth();
  const { isDark } = useTheme();
  const { activities } = useActivities(false);
  const { logs } = useLogs();

  const todayStr = getTodayDateString(userDoc?.timezone);
  const streaks = calculateStreaks(logs, todayStr);
  const khatma = calculateKhatma(logs, activities);
  const weeklyData = getWeeklyChartData(logs, todayStr);
  const badges = evaluateBadges(logs, activities, todayStr);

  const getBadgeIcon = (iconName) => {
    switch (iconName) {
      case 'Sprout': return Sprout;
      case 'Flame': return Flame;
      case 'BookOpen': return BookOpen;
      case 'Brain': return Brain;
      case 'Target': return Target;
      default: return Award;
    }
  };

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <div className="space-y-8 text-right">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          لوحة التقدم والإحصائيات 📊
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          رصد إنجازك المستمر، ختمات القرآن، وسلسلة أيامك المتواصلة.
        </p>
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

        {/* Badges Unlocked */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الأوسمة المحققة</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            {unlockedCount} <span className="text-xs font-semibold text-slate-400">من {badges.length}</span>
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-1">
            أوسمة إنجازاتك الشخصية
          </p>
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

      {/* Badges & Achievements Gallery */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>الأوسمة والإنجازات ({unlockedCount} / {badges.length})</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            شارات تشجيعية تُمنح تلقائياً عند استمرارك وتحقيق أهدافك.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {badges.map((badge) => {
            const Icon = getBadgeIcon(badge.icon);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-3xl border transition-all ${
                  badge.unlocked
                    ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700/60 shadow-2xs'
                    : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      badge.unlocked
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {badge.title}
                      </h4>
                      {badge.unlocked && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          محقَق ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                    {!badge.unlocked && badge.progressPercent != null && (
                      <div className="mt-2.5">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${badge.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block text-left">
                          {badge.progressPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
