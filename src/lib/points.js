/**
 * Worship Points & Spiritual Ranks System (نظام النقاط والرتب الإيمانية)
 * Computes spiritual points awarded for completed daily acts of worship, streaks, and Khatma progress.
 */

export const RANKS = [
  {
    level: 1,
    title: 'الساعي بالخير',
    description: 'خطوات مباركة على طريق الاستقامة وبداية الالتزام بالطاعات',
    minPoints: 0,
    maxPoints: 499,
    color: 'emerald',
    icon: 'Sprout',
  },
  {
    level: 2,
    title: 'الذاكر المجتهد',
    description: 'لسان رطب بذكر الله ومحافظة مستمرة على الأوراد اليومية',
    minPoints: 500,
    maxPoints: 1499,
    color: 'teal',
    icon: 'CircleDot',
  },
  {
    level: 3,
    title: 'الصوام القوّام',
    description: 'ثبات راسخ على الصلوات والنوافل وتلاوة كتاب الله الكريم',
    minPoints: 1500,
    maxPoints: 2999,
    color: 'sky',
    icon: 'Award',
  },
  {
    level: 4,
    title: 'المخلص المثابر',
    description: 'عزيمة متينة وأيام متواصلة في طاعة الرحمن والارتقاء بالنفس',
    minPoints: 3000,
    maxPoints: 4999,
    color: 'indigo',
    icon: 'Shield',
  },
  {
    level: 5,
    title: 'السابق بالخيرات',
    description: '«وَالسَّابِقُونَ السَّابِقُونَ أُولَئِكَ الْمُقَرَّبُونَ» • قدوة وهمة عالية',
    minPoints: 5000,
    maxPoints: Infinity,
    color: 'amber',
    icon: 'Trophy',
  },
];

/**
 * Calculates total points earned by the user based on logged acts of worship.
 * Points Breakdown:
 * - Prayers: 20 pts per completed prayer (up to 100 pts/day)
 * - Quran reading: 10 pts per page (details.pagesCount or amount)
 * - Quran memorization: 30 pts per session
 * - Morning/Evening Adhkar: 25 pts each
 * - Smart Tasbeeh: 10 pts per 100 tasbeehs (50 pts bonus at 1000+)
 * - Standard daily habits: 20 pts each
 * - Active Streak bonus: 10 pts per streak day
 */
/** @param {Array<Object>} logs @param {Array<Object>} activities @param {{currentStreak:number}} streaks @returns {Object} */
/** @param {Array<Object>} logs @param {Array<Object>} activities @param {{currentStreak:number}} streaks @returns {Object} */
export function calculateUserPoints(logs = [], activities = [], streaks = { currentStreak: 0 }) {
  let worshipPoints = 0;
  let prayersCount = 0;
  let quranPagesCount = 0;
  let tasbeehCount = 0;
  let adhkarCount = 0;
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));

  for (const log of logs) {
    const activity = activityById.get(log.activityId);
    const activityType = activity?.type;
    const activityTitle = activity?.title || '';

    if (activityType === 'prayers' || log.details?.prayers) {
      const performedCount = Object.values(log.details?.prayers || {}).filter(
        (prayer) => ['prayed_jamaah', 'prayed_individual'].includes(
          typeof prayer === 'string' ? prayer : prayer?.status
        )
      ).length;
      prayersCount += performedCount;
      worshipPoints += performedCount * 20;
    } else if (activityType === 'read') {
      const pages = Array.isArray(log.details?.pagesRead)
        ? new Set(log.details.pagesRead).size
        : log.details?.pagesCount != null
          ? Math.max(0, Number(log.details.pagesCount) || 0)
          : log.details?.fromPage != null && log.details?.toPage != null
            ? Math.max(0, Number(log.details.toPage) - Number(log.details.fromPage) + 1)
            : Math.max(0, Number(log.amount) || 0);
      quranPagesCount += pages;
      worshipPoints += pages * 10;
    } else if (activityType === 'memorize') {
      worshipPoints += 30;
    } else if (activityTitle.includes('أذكار')) {
      const completedCategories = log.details?.completedCategories;
      const categoryCount = completedCategories && typeof completedCategories === 'object'
        ? Object.entries(completedCategories).filter(([category, complete]) =>
          complete === true && (category === 'أذكار الصباح' || category === 'أذكار المساء')
        ).length
        : 1;
      worshipPoints += categoryCount * 25;
      adhkarCount += categoryCount;
    } else if (activityTitle.includes('تسبيح')) {
      const amount = Math.max(0, Number(log.amount) || 0);
      tasbeehCount += amount;
      worshipPoints += Math.floor(amount / 100) * 10;
      if (amount >= 1000) worshipPoints += 50;
    } else if (log.completed) {
      worshipPoints += 20;
    }
  }

  // Streak bonus points
  const streakBonus = Math.min(500, (streaks?.currentStreak || 0) * 10);
  const totalPoints = worshipPoints + streakBonus;

  // Determine user rank/level
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = 0; i < RANKS.length; i++) {
    if (totalPoints >= RANKS[i].minPoints) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || null;
    }
  }

  let progressPercent = 100;
  let pointsInCurrentLevel = totalPoints - currentRank.minPoints;
  let pointsNeededForNext = 0;

  if (nextRank) {
    const range = nextRank.minPoints - currentRank.minPoints;
    pointsInCurrentLevel = totalPoints - currentRank.minPoints;
    pointsNeededForNext = nextRank.minPoints - totalPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((pointsInCurrentLevel / range) * 100)));
  }

  return {
    totalPoints,
    worshipPoints,
    streakBonus,
    prayersCount,
    quranPagesCount,
    tasbeehCount,
    adhkarCount,
    currentRank,
    nextRank,
    progressPercent,
    pointsInCurrentLevel,
    pointsNeededForNext,
  };
}
