import { useCallback, useRef } from 'react';

export function useLogReadPage({ activities, logs, saveLog, date, customTargets = {} }) {
  const logsRef = useRef(logs);
  logsRef.current = logs;
  return useCallback(async (surah) => {
    const activity = activities.find((item) => item.type === 'read' || item.title?.includes('تلاوة'));
    if (!activity) throw new Error('لم يتم العثور على نشاط تلاوة القرآن');
    const page = Number(surah?.startPage ?? surah?.page);
    if (!Number.isInteger(page) || page < 1 || page > 604) throw new Error('رقم صفحة المصحف غير صالح');
    const currentLog = logsRef.current.find((item) => item.activityId === activity.id && item.date === date);
    const pagesRead = [...new Set([...(currentLog?.details?.pagesRead || []), page])]
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 604)
      .sort((a, b) => a - b);
    const amount = pagesRead.length;
    const dailyTarget = Math.max(1, Number(customTargets[activity.id] ?? activity.dailyTarget) || 1);
    const optimisticLog = { ...(currentLog || {}), activityId: activity.id, date, amount, completed: amount >= dailyTarget, details: { ...currentLog?.details, surah: surah?.name || currentLog?.details?.surah, page, lastPage: page, pagesRead, pagesCount: amount } };
    logsRef.current = [...logsRef.current.filter((item) => !(item.activityId === activity.id && item.date === date)), optimisticLog];
    try {
      await saveLog(
      activity.id,
      date,
      amount,
      amount >= dailyTarget,
      { ...currentLog?.details, surah: surah?.name || currentLog?.details?.surah, page, lastPage: page, pagesRead, pagesCount: amount },
      `قراءة الصفحة ${page}${surah?.name ? ` من سورة ${surah.name}` : ''}`,
      );
    } catch (error) {
      logsRef.current = logs;
      throw error;
    }
    return { page, amount, activityId: activity.id };
  }, [activities, logs, saveLog, date, customTargets]);
}
