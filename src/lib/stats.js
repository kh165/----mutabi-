import { getDateOffset, getTodayDateString } from './dates.js';
import { TOTAL_PAGES } from '../data/quran.js';

/**
 * Calculate user streaks based on daily completions.
 * A day counts towards the streak if at least one activity was completed on that day.
 */
export function calculateStreaks(logs = [], todayStr = getTodayDateString()) {
  const completedDates = new Set();
  for (const log of logs) {
    if (log.completed && log.amount > 0) {
      completedDates.add(log.date);
    }
  }

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = todayStr;

  // If today is not completed, we check if yesterday was completed to keep the streak alive
  if (!completedDates.has(todayStr)) {
    const yesterday = getDateOffset(todayStr, -1);
    if (completedDates.has(yesterday)) {
      checkDate = yesterday;
    } else {
      checkDate = '';
    }
  }

  if (checkDate) {
    while (completedDates.has(checkDate)) {
      currentStreak++;
      checkDate = getDateOffset(checkDate, -1);
    }
  }

  // Calculate longest streak across all recorded history
  const sortedDates = Array.from(completedDates).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate = null;

  for (const d of sortedDates) {
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const expectedNext = getDateOffset(prevDate, 1);
      if (d === expectedNext) {
        runningStreak++;
      } else {
        runningStreak = 1;
      }
    }
    prevDate = d;
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    activeDates: completedDates,
  };
}

/**
 * Calculate Quran Khatma metrics from reading logs.
 */
export function calculateKhatma(logs = [], readActivities = []) {
  const readActivityIds = new Set(
    readActivities.filter(a => a.type === 'read').map(a => a.id)
  );

  let totalPagesRead = 0;
  for (const log of logs) {
    if (readActivityIds.has(log.activityId) || log.details?.fromPage != null) {
      if (log.details?.fromPage != null && log.details?.toPage != null) {
        const pages = Math.max(0, log.details.toPage - log.details.fromPage + 1);
        totalPagesRead += pages;
      } else if (log.amount > 0) {
        totalPagesRead += log.amount;
      }
    }
  }

  const completedKhatmas = Math.floor(totalPagesRead / TOTAL_PAGES);
  const remainder = totalPagesRead % TOTAL_PAGES;
  const currentPageInKhatma = remainder === 0 && totalPagesRead > 0 ? TOTAL_PAGES : remainder;
  const percentage = Math.min(100, Math.round((currentPageInKhatma / TOTAL_PAGES) * 100));
  const remainingPages = TOTAL_PAGES - currentPageInKhatma;

  return {
    totalPagesRead,
    completedKhatmas,
    currentPageInKhatma,
    percentage,
    remainingPages,
  };
}

/**
 * Get the latest memorization progress point.
 */
export function getLatestMemorizedPosition(logs = []) {
  const memorizeLogs = logs
    .filter(l => l.details?.surah && l.details?.kind === 'new')
    .sort((a, b) => b.date.localeCompare(a.date));

  if (memorizeLogs.length === 0) return null;

  const latest = memorizeLogs[0];
  return {
    surahNumber: latest.details?.surah,
    fromAyah: latest.details?.fromAyah,
    toAyah: latest.details?.toAyah,
    date: latest.date,
  };
}

/**
 * Calculate weekly breakdown for chart (last 7 days).
 */
export function getWeeklyChartData(logs = [], todayStr) {
  const days = [];
  const arabicDays = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  for (let i = 6; i >= 0; i--) {
    const d = getDateOffset(todayStr, -i);
    const dayOfWeek = new Date(`${d}T12:00:00Z`).getUTCDay();
    const dayLogs = logs.filter(l => l.date === d);
    const completedCount = dayLogs.filter(l => l.completed).length;
    const totalAmount = dayLogs.reduce((acc, l) => acc + (l.amount || 0), 0);

    days.push({
      date: d,
      dayLabel: i === 0 ? 'اليوم' : arabicDays[dayOfWeek],
      completedCount,
      totalAmount,
    });
  }

  return days;
}
