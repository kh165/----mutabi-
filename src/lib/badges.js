import { calculateStreaks, calculateKhatma } from './stats.js';
import { getTodayDateString } from './dates.js';

export function evaluateBadges(
  logs = [],
  activities = [],
  todayStr = getTodayDateString()
) {
  const { currentStreak, longestStreak } = calculateStreaks(logs, todayStr);
  const khatma = calculateKhatma(logs, activities);
  const totalLogs = logs.filter(l => l.completed).length;

  // Check if user has a day where all assigned active activities were completed
  const activeActivitiesCount = activities.filter(a => a.isActive).length;
  let hasPerfectDay = false;

  // Group logs by date
  const logsByDate = new Map();
  for (const log of logs) {
    if (log.completed) {
      logsByDate.set(log.date, (logsByDate.get(log.date) || 0) + 1);
    }
  }

  if (activeActivitiesCount > 0) {
    for (const count of logsByDate.values()) {
      if (count >= activeActivitiesCount) {
        hasPerfectDay = true;
        break;
      }
    }
  }

  // Count total verses memorized
  const memorizedVerses = logs
    .filter(l => l.details?.surah)
    .reduce((sum, l) => {
      if (l.details?.fromAyah && l.details?.toAyah) {
        return sum + Math.max(0, l.details.toAyah - l.details.fromAyah + 1);
      }
      return sum + (l.amount || 0);
    }, 0);

  return [
    {
      id: 'first_log',
      title: 'خطوة البداية 🌱',
      description: 'تسجيل أول إنجاز لك في المنصة',
      icon: 'Sprout',
      unlocked: totalLogs >= 1,
      progressPercent: totalLogs >= 1 ? 100 : 0,
    },
    {
      id: 'streak_7',
      title: 'أسبوع متواصل 🔥',
      description: 'الاستمرار لمدة 7 أيام متتالية',
      icon: 'Flame',
      unlocked: longestStreak >= 7,
      progressPercent: Math.min(100, Math.round((Math.max(currentStreak, longestStreak) / 7) * 100)),
    },
    {
      id: 'streak_30',
      title: 'ثبات شهر 🏆',
      description: 'الاستمرار لمدة 30 يومًا متواصلاً',
      icon: 'Award',
      unlocked: longestStreak >= 30,
      progressPercent: Math.min(100, Math.round((Math.max(currentStreak, longestStreak) / 30) * 100)),
    },
    {
      id: 'khatma_first',
      title: 'أول ختمة 📖',
      description: 'قراءة 604 صفحات من كتاب الله',
      icon: 'BookOpen',
      unlocked: khatma.totalPagesRead >= 604,
      progressPercent: Math.min(100, Math.round((khatma.totalPagesRead / 604) * 100)),
    },
    {
      id: 'memorize_juz',
      title: 'حافظ السور 🧠',
      description: 'حفظ أكثر من 150 آية كريمة',
      icon: 'Brain',
      unlocked: memorizedVerses >= 150,
      progressPercent: Math.min(100, Math.round((memorizedVerses / 150) * 100)),
    },
    {
      id: 'perfect_day',
      title: 'يوم مثالي 🎯',
      description: 'إتمام جميع الأنشطة المحددة لليوم',
      icon: 'Target',
      unlocked: hasPerfectDay,
      progressPercent: hasPerfectDay ? 100 : 0,
    },
  ];
}
