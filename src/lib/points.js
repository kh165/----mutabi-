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
export function calculateUserPoints(logs = [], activities = [], streaks = { currentStreak: 0 }) {
  let worshipPoints = 0;
  let prayersCount = 0;
  let quranPagesCount = 0;
  let tasbeehCount = 0;
  let adhkarCount = 0;

  for (const log of logs) {
    if (!log.completed) continue;

    // Check prayer activity logs
    if (log.details?.prayers) {
      const prayers = log.details.prayers;
      const count = Object.values(prayers).filter(Boolean).length;
      worshipPoints += count * 20;
      prayersCount += count;
    } else if (log.activityId === 'prayers' || log.activityTitle?.includes('صلاة')) {
      worshipPoints += 100;
      prayersCount += 5;
    } else if (log.details?.pagesCount || log.details?.fromPage) {
      // Quran page reading
      const pages = log.details.pagesCount ||
        (log.details.toPage && log.details.fromPage
          ? Math.max(1, log.details.toPage - log.details.fromPage + 1)
          : (log.amount || 1));
      worshipPoints += pages * 10;
      quranPagesCount += pages;
    } else if (log.activityType === 'quran_memorize' || log.details?.surah) {
      // Quran memorization
      worshipPoints += 30;
    } else if (log.activityId === 'adhkar_morning' || log.activityId === 'adhkar_evening' || log.activityTitle?.includes('أذكار')) {
      worshipPoints += 25;
      adhkarCount += 1;
    } else if (log.activityType === 'counter' || log.activityId === 'tasbeeh') {
      const amount = log.amount || 100;
      tasbeehCount += amount;
      worshipPoints += Math.floor(amount / 100) * 10;
      if (amount >= 1000) worshipPoints += 50;
    } else {
      // Other generic daily activities
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
