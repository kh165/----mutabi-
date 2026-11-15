import { useRef, useState } from 'react';
import { AdhkarReaderModal } from '../components/AdhkarReaderModal.jsx';
import { ADHKAR_CATEGORIES } from '../data/adhkar.js';
import { useActivities } from '../hooks/useActivities.js';
import { useLogs } from '../hooks/useLogs.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getTodayDateString } from '../lib/dates.js';

export function AdhkarPage({ initialCategory = 'morning' }) {
  const { userDoc } = useAuth();
  const { activities } = useActivities(false);
  const { logs, saveLog } = useLogs();
  const todayStr = getTodayDateString(userDoc?.timezone);
  const [toastMessage, setToastMessage] = useState(null);
  const savingCategories = useRef(new Set());
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleCompleteCategory = async (title, countsForCompletion = {}) => {
    const category = ADHKAR_CATEGORIES.find((item) => item.title === title);
    if (!category) return;
    const completedCount = category.items.filter((item) =>
      Number(countsForCompletion[item.id] || 0) >= item.count
    ).length;
    const majorityCompleted = completedCount > category.items.length / 2;
    if (!majorityCompleted && !window.confirm(
      `أُنجز ${completedCount} من ${category.items.length} من أذكار هذا القسم. هل تريد تسجيل إتمامه؟`
    )) return;

    // تُمنح نقاط الورد الصباحي والمسائي فقط، وبمرة واحدة للقسم في اليوم.
    if (!['morning', 'evening'].includes(category.id)) {
      showToast('تم تسجيل إتمام القسم. النقاط مخصصة لوردي الصباح والمساء.');
      return;
    }
    const key = `${todayStr}:${category.id}`;
    if (savingCategories.current.has(key)) return;
    savingCategories.current.add(key);
    try {
      const adhkarActivity = activities.find((activity) => activity.title?.includes('أذكار'));
      if (!adhkarActivity) throw new Error('لم يتم العثور على نشاط الأذكار.');
      const currentLog = logs.find(
        (log) => log.activityId === adhkarActivity.id && log.date === todayStr
      );
      const completedCategories = {
        ...(currentLog?.details?.completedCategories || {}),
        ...(currentLog?.details?.category ? { [currentLog.details.category]: true } : {}),
      };
      if (completedCategories[title]) {
        showToast('تم تسجيل هذا الورد اليوم بالفعل؛ لن تُحتسب النقاط مرة أخرى.');
        return;
      }
      completedCategories[title] = true;
      await saveLog(
        adhkarActivity.id,
        todayStr,
        1,
        true,
        { ...currentLog?.details, category: title, completedCategories },
        title,
      );
      showToast('تم تسجيل إتمام الورد واحتساب 25 نقطة.');
    } catch (error) {
      console.error('Failed to complete adhkar category:', error);
      showToast('تعذر تسجيل إتمام الورد. يرجى المحاولة مجدداً.');
    } finally {
      savingCategories.current.delete(key);
    }
  };

  return (
    <>
      {toastMessage && (
        <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-bold shadow-xl">
          {toastMessage}
        </div>
      )}
      <AdhkarReaderModal
        isOpen
        fullPage
        onClose={() => {}}
        initialCategory={initialCategory}
        todayStr={todayStr}
        onCompleteCategory={handleCompleteCategory}
      />
    </>
  );
}
