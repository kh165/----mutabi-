import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useActivities } from '../hooks/useActivities';
import { useLogs } from '../hooks/useLogs';
import { Heatmap } from '../components/Heatmap';
import { ProgressRing } from '../components/ProgressRing';
import { calculateStreaks, calculateKhatma, getWeeklyChartData } from '../lib/stats';
import { evaluateBadges } from '../lib/badges';
import { getTodayDateString } from '../lib/dates';
import {
  Flame,
  Award,
  BookOpen,
  Brain,
  TrendingUp,
  Calendar,
  CheckCircle,
  Star,
  Sprout,
  Target,
  Sparkles,
} from 'lucide-react';
import { TOTAL_PAGES } from '../data/quran';

export function Progress() {
  const { user, userDoc } = useAuth();
  const { activities } = useActivities(false);
  const { logs, loading } = useLogs();

  const todayStr = getTodayDateString(userDoc?.timezone);
  const streaks = calculateStreaks(logs, todayStr);
  const khatma = calculateKhatma(logs, activities);
  const weeklyData = getWeeklyChartData(logs, todayStr);
  const badges = evaluateBadges(logs, activities, todayStr);

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sprout': return Sprout;
      case 'Flame': return Flame;
      case 'Star': return Star;
      case 'BookOpen': return BookOpen;
      case 'Brain': return Brain;
      case 'Target': return Target;
      default: return Award;
    }
  };

  return (
    <div className="space-y-8 text-right">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          لوحة التقدم والإحصائيات 📊
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          رصد إنجازك المستمر، ختمات القرآن، وسلسلة أيامك المتواصلة.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Streak */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">الاستمرار الحالي</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
              <Flame className="w-5 h-5 fill-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {streaks.currentStreak}
            </span>
            <span className="text-xs text-slate-400 ms-1.5 font-medium">أيام متتالية</span>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
            {streaks.currentStreak >= 7 ? 'أداء ممتاز، استمر في الثبات!' : 'كل يوم جديد هو خطوة مباركة.'}
          </p>
        </div>

        {/* Longest Streak */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">أطول سلسلة استمرار</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {streaks.longestStreak}
            </span>
            <span className="text-xs text-slate-400 ms-1.5 font-medium">أيام</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            إجمالي الأيام النشطة: {streaks.activeDates.size} يومًا
          </p>
        </div>

        {/* Khatma Progress */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ختمة التلاوة</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {khatma.currentPageInKhatma}
            </span>
            <span className="text-xs text-slate-400 ms-1.5 font-medium">من {TOTAL_PAGES} صفحة</span>
          </div>
          <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-medium">
            مكتمل: {khatma.percentage}% (الختمات السابقة: {khatma.completedKhatmas})
          </p>
        </div>

        {/* Total Logs */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">إجمالي الإنجازات</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {logs.filter((l) => l.completed).length}
            </span>
            <span className="text-xs text-slate-400 ms-1.5 font-medium">نشاطًا منجزًا</span>
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
            مسجلة ومحفوظة في حسابك
          </p>
        </div>
      </div>

      {/* Khatma Details Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-3 flex-1 text-center sm:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold">
              <BookOpen className="w-4 h-4" />
              <span>متابعة ختمة المصحف الشريف</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              الختمة الحالية: وصلت للصفحة {khatma.currentPageInKhatma} من أصل 604
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
              المتبقي لإتمام هذه الختمة المباركة: <strong className="text-sky-600 font-bold">{khatma.remainingPages} صفحة</strong>.
              كلما سجلت صفحات في نشاط القراءة، يتم تحديث موقعك تلقائيًا.
            </p>

            {/* Linear Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full transition-all duration-700"
                style={{ width: `${khatma.percentage}%` }}
              />
            </div>
          </div>

          <div className="shrink-0">
            <ProgressRing
              percentage={khatma.percentage}
              size={120}
              strokeWidth={12}
              color="#0284c7"
            >
              <div className="text-center">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {khatma.percentage}%
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">الختمة</span>
              </div>
            </ProgressRing>
          </div>
        </div>
      </div>

      {/* Activity Consistency Heatmap */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              خريطة الالتزام اليومي (Heatmap)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              عرض بياني لالتزامك خلال آخر 70 يومًا
            </p>
          </div>
        </div>
        <Heatmap logs={logs} todayStr={todayStr} daysCount={70} />
      </div>

      {/* Weekly Activity Performance Chart (SVG) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          إنجاز الأسبوع الحالي
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          عدد الأنشطة المنجزة في كل يوم من الأيام السبعة الأخيرة
        </p>

        <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 px-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800">
          {weeklyData.map((day) => {
            const maxVal = Math.max(1, ...weeklyData.map((d) => d.completedCount));
            const barHeightPercent = Math.max(10, Math.round((day.completedCount / maxVal) * 100));

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.completedCount}
                </span>
                <div
                  className={`w-full max-w-[42px] rounded-2xl transition-all duration-500 ${
                    day.completedCount > 0
                      ? 'bg-emerald-600 dark:bg-emerald-500 shadow-sm shadow-emerald-600/30 group-hover:bg-emerald-500'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                  style={{ height: `${barHeightPercent}%` }}
                />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Gallery */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>أوسمة الإنجاز والهمة 🏅</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            أوسمة تُمنح تلقائيًا كلما حققت محطات جديدة في الحفظ والاستمرار
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => {
            const Icon = getBadgeIcon(badge.icon);
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  badge.unlocked
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    badge.unlocked
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {badge.title}
                    </h4>
                    {badge.unlocked && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                        مكتسب ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {badge.description}
                  </p>

                  {!badge.unlocked && (
                    <div className="mt-2.5">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all"
                          style={{ width: `${badge.progressPercent || 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                        التقدم: {badge.progressPercent || 0}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Trophy(props: any) {
  return <Award {...props} />;
}
