import React from 'react';
import { AdhkarReaderModal } from '../components/AdhkarReaderModal.jsx';
import { useActivities } from '../hooks/useActivities.js';
import { useLogs } from '../hooks/useLogs.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getTodayDateString } from '../lib/dates.js';

export function AdhkarPage({ initialCategory = 'morning' }) {
  const { userDoc } = useAuth();
  const { activities } = useActivities(false);
  const { logs, saveLog } = useLogs();
  const todayStr = getTodayDateString(userDoc?.timezone);

  const handleCompleteCategory = async (title) => {
    const adhkarActivity = activities.find((activity) => activity.title?.includes('أذكار'));
    if (!adhkarActivity) return;
    const currentLog = logs.find(
      (log) => log.activityId === adhkarActivity.id && log.date === todayStr
    );
    const completedCategories = {
      ...(currentLog?.details?.completedCategories || {}),
      ...(currentLog?.details?.category ? { [currentLog.details.category]: true } : {}),
      [title]: true,
    };
    await saveLog(
      adhkarActivity.id,
      todayStr,
      1,
      true,
      { ...currentLog?.details, category: title, completedCategories },
      title,
    );
  };

  return (
    <AdhkarReaderModal
      isOpen
      fullPage
      onClose={() => {}}
      initialCategory={initialCategory}
      todayStr={todayStr}
      onCompleteCategory={handleCompleteCategory}
    />
  );
}
