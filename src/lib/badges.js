import { calculateStreaks, calculateKhatma } from './stats.js';
import { getTodayDateString } from './dates.js';

export function evaluateBadges(
  logs = [],
  activities = [],
  todayStr = getTodayDateString()
) {
  const { currentStreak, longestStreak } = calculateStreaks(logs, todayStr);
  const khatma = calculateKhatma(logs, activities);
  const totalCompletedLogs = logs.filter(l => l.completed).length;

  // Count prayers completed across all days
  let totalPrayers = 0;
  for (const log of logs) {
    if (!log.completed) continue;
    if (log.details?.prayers) {
      totalPrayers += Object.values(log.details.prayers).filter(Boolean).length;
    } else if (log.activityId === 'prayers' || log.activityTitle?.includes('صلاة')) {
      totalPrayers += 5;
    }
  }

  // Count memorized verses
  const memorizedVerses = logs
    .filter(l => l.completed && (l.details?.surah || l.activityType === 'quran_memorize'))
    .reduce((sum, l) => {
      if (l.details?.fromAyah && l.details?.toAyah) {
        return sum + Math.max(0, l.details.toAyah - l.details.fromAyah + 1);
      }
      return sum + (l.amount || 5);
    }, 0);

  // Count total tasbeehs
  const totalTasbeeh = logs
    .filter(l => l.completed && (l.activityType === 'counter' || l.activityId === 'tasbeeh'))
    .reduce((sum, l) => sum + (l.amount || 100), 0);

  // Count perfect days (all active activities completed on that day)
  const activeActivitiesCount = activities.filter(a => a.isActive).length;
  let perfectDaysCount = 0;
  const logsByDate = new Map();
  for (const log of logs) {
    if (log.completed) {
      logsByDate.set(log.date, (logsByDate.get(log.date) || 0) + 1);
    }
  }
  if (activeActivitiesCount > 0) {
    for (const count of logsByDate.values()) {
      if (count >= activeActivitiesCount) {
        perfectDaysCount++;
      }
    }
  }

  // Count adhkar days
  const adhkarLogsCount = logs.filter(
    l => l.completed && (l.activityId === 'adhkar_morning' || l.activityId === 'adhkar_evening' || l.activityTitle?.includes('أذكار'))
  ).length;

  const maxStreak = Math.max(currentStreak, longestStreak);

  return [
    // --- 🥇 الذهبية (Gold Medals) ---
    {
      id: 'medal_khatma_gold',
      title: 'خاتم القرآن الكريم',
      tier: 'gold',
      category: 'quran',
      description: 'إتمام ختمة كاملة لكتاب الله (604 صفحات)',
      points: 500,
      icon: 'BookOpen',
      currentValue: khatma.totalPagesRead,
      targetValue: 604,
      unit: 'صفحة',
      unlocked: khatma.totalPagesRead >= 604,
      progressPercent: Math.min(100, Math.round((khatma.totalPagesRead / 604) * 100)),
    },
    {
      id: 'medal_streak_30_gold',
      title: 'وسام الثبات الراسخ',
      tier: 'gold',
      category: 'streak',
      description: 'الاستمرار متواصلاً في العبادات لمدة 30 يوماً بلا انقطاع',
      points: 400,
      icon: 'Flame',
      currentValue: maxStreak,
      targetValue: 30,
      unit: 'يوم',
      unlocked: maxStreak >= 30,
      progressPercent: Math.min(100, Math.round((maxStreak / 30) * 100)),
    },
    {
      id: 'medal_prayers_200_gold',
      title: 'سيد المحاريب',
      tier: 'gold',
      category: 'prayers',
      description: 'إقامة 200 صلاة فريضة في أوقاتها',
      points: 350,
      icon: 'Shield',
      currentValue: totalPrayers,
      targetValue: 200,
      unit: 'صلاة',
      unlocked: totalPrayers >= 200,
      progressPercent: Math.min(100, Math.round((totalPrayers / 200) * 100)),
    },
    {
      id: 'medal_tasbeeh_10k_gold',
      title: 'تاج الذاكرين',
      tier: 'gold',
      category: 'tasbeeh',
      description: 'تسبيح وذكر الله لأكثر من 10,000 تسبيحة',
      points: 300,
      icon: 'CircleDot',
      currentValue: totalTasbeeh,
      targetValue: 10000,
      unit: 'تسبيحة',
      unlocked: totalTasbeeh >= 10000,
      progressPercent: Math.min(100, Math.round((totalTasbeeh / 10000) * 100)),
    },

    // --- 🥈 الفضية (Silver Medals) ---
    {
      id: 'medal_streak_14_silver',
      title: 'فارس المداومة',
      tier: 'silver',
      category: 'streak',
      description: 'الاستمرار أسبوعين متتاليين (14 يوماً) في الأوراد',
      points: 200,
      icon: 'Flame',
      currentValue: maxStreak,
      targetValue: 14,
      unit: 'يوم',
      unlocked: maxStreak >= 14,
      progressPercent: Math.min(100, Math.round((maxStreak / 14) * 100)),
    },
    {
      id: 'medal_quran_half_silver',
      title: 'نصف الختمة المباركة',
      tier: 'silver',
      category: 'quran',
      description: 'تلاوة 302 صفحة من القرآن الكريم',
      points: 250,
      icon: 'BookOpen',
      currentValue: khatma.totalPagesRead,
      targetValue: 302,
      unit: 'صفحة',
      unlocked: khatma.totalPagesRead >= 302,
      progressPercent: Math.min(100, Math.round((khatma.totalPagesRead / 302) * 100)),
    },
    {
      id: 'medal_memorize_100_silver',
      title: 'حافظ الآيات',
      tier: 'silver',
      category: 'memorize',
      description: 'حفظ وتثبيت 100 آية كريمة من القرآن الكريم',
      points: 200,
      icon: 'Award',
      currentValue: memorizedVerses,
      targetValue: 100,
      unit: 'آية',
      unlocked: memorizedVerses >= 100,
      progressPercent: Math.min(100, Math.round((memorizedVerses / 100) * 100)),
    },
    {
      id: 'medal_perfect_7_silver',
      title: 'إتقان الأسبوع',
      tier: 'silver',
      category: 'general',
      description: 'إتمام كافة الأنشطة المحددة بالكامل في 7 أيام مختلفة',
      points: 200,
      icon: 'CheckCircle2',
      currentValue: perfectDaysCount,
      targetValue: 7,
      unit: 'أيام',
      unlocked: perfectDaysCount >= 7,
      progressPercent: Math.min(100, Math.round((perfectDaysCount / 7) * 100)),
    },
    {
      id: 'medal_adhkar_30_silver',
      title: 'الحصن المنيع',
      tier: 'silver',
      category: 'tasbeeh',
      description: 'المحافظة على أذكار الصباح والمساء في 30 مناسبة',
      points: 150,
      icon: 'SunMedium',
      currentValue: adhkarLogsCount,
      targetValue: 30,
      unit: 'ورد',
      unlocked: adhkarLogsCount >= 30,
      progressPercent: Math.min(100, Math.round((adhkarLogsCount / 30) * 100)),
    },

    // --- 🥉 البرونزية (Bronze Medals) ---
    {
      id: 'medal_first_step_bronze',
      title: 'بذرة الخير',
      tier: 'bronze',
      category: 'general',
      description: 'تسجيل أول إنجاز لك على منصة مُتَابِع',
      points: 50,
      icon: 'Sprout',
      currentValue: totalCompletedLogs >= 1 ? 1 : 0,
      targetValue: 1,
      unit: 'إنجاز',
      unlocked: totalCompletedLogs >= 1,
      progressPercent: totalCompletedLogs >= 1 ? 100 : 0,
    },
    {
      id: 'medal_streak_7_bronze',
      title: 'شعلة الانطلاق',
      tier: 'bronze',
      category: 'streak',
      description: 'الاستمرار لمدة 7 أيام متتالية في الأوراد',
      points: 100,
      icon: 'Flame',
      currentValue: maxStreak,
      targetValue: 7,
      unit: 'يوم',
      unlocked: maxStreak >= 7,
      progressPercent: Math.min(100, Math.round((maxStreak / 7) * 100)),
    },
    {
      id: 'medal_quran_50_bronze',
      title: 'قارئ الأجزاء',
      tier: 'bronze',
      category: 'quran',
      description: 'قراءة 50 صفحة من المصحف الشريف',
      points: 80,
      icon: 'BookOpen',
      currentValue: khatma.totalPagesRead,
      targetValue: 50,
      unit: 'صفحة',
      unlocked: khatma.totalPagesRead >= 50,
      progressPercent: Math.min(100, Math.round((khatma.totalPagesRead / 50) * 100)),
    },
    {
      id: 'medal_tasbeeh_1k_bronze',
      title: 'ألفية التسبيح',
      tier: 'bronze',
      category: 'tasbeeh',
      description: 'إتمام 1000 تسبيحة بالمسبحة الذكية',
      points: 75,
      icon: 'CircleDot',
      currentValue: totalTasbeeh,
      targetValue: 1000,
      unit: 'تسبيحة',
      unlocked: totalTasbeeh >= 1000,
      progressPercent: Math.min(100, Math.round((totalTasbeeh / 1000) * 100)),
    },
    {
      id: 'medal_prayers_25_bronze',
      title: 'المواظب على الصلوات',
      tier: 'bronze',
      category: 'prayers',
      description: 'أداء 25 صلاة مكتوبة في أوقاتها',
      points: 90,
      icon: 'Shield',
      currentValue: totalPrayers,
      targetValue: 25,
      unit: 'صلاة',
      unlocked: totalPrayers >= 25,
      progressPercent: Math.min(100, Math.round((totalPrayers / 25) * 100)),
    },
  ];
}
