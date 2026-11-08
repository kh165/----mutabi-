import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Moon, RotateCcw, SunMedium, X } from 'lucide-react';
import { ADHKAR_CATEGORIES } from '../data/adhkar.js';
import { useAuth } from '../context/AuthContext.jsx';
import { db, doc, getDoc, serverTimestamp, setDoc } from '../firebase.js';
import { useReaderHistory } from '../hooks/useReaderHistory.js';

const emptyProgress = () =>
  Object.fromEntries(ADHKAR_CATEGORIES.map((category) => [category.id, {}]));

export function AdhkarReaderModal({
  isOpen,
  onClose,
  initialCategory = 'morning',
  todayStr,
  onCompleteCategory,
}) {
  const { user } = useAuth();
  const closeReader = useReaderHistory(isOpen, onClose, 'adhkar');
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [adhkarState, setAdhkarState] = useState(emptyProgress);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState(null);
  const saveQueueRef = useRef(Promise.resolve());

  const activeCategory =
    ADHKAR_CATEGORIES.find((category) => category.id === categoryId) ||
    ADHKAR_CATEGORIES[0];
  const currentList = activeCategory.items;

  useEffect(() => {
    if (isOpen) {
      setCategoryId(
        ADHKAR_CATEGORIES.some((category) => category.id === initialCategory)
          ? initialCategory
          : 'morning'
      );
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    if (!isOpen || !user?.uid || !todayStr) return undefined;
    let cancelled = false;
    setAdhkarState(emptyProgress());
    setLoadingProgress(true);
    setProgressError(null);
    getDoc(doc(db, 'adhkarProgress', user.uid, todayStr))
      .then((snapshot) => {
        if (cancelled) return;
        const saved = snapshot.exists() ? snapshot.data() : {};
        const progress = emptyProgress();
        for (const category of ADHKAR_CATEGORIES) {
          progress[category.id] = Object.fromEntries(
            Object.entries(saved?.[category.id] || {}).map(([id, value]) => [
              id,
              Math.max(0, Number(value?.count) || 0),
            ])
          );
        }
        setAdhkarState(progress);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load adhkar progress:', error);
        setProgressError('تعذر تحميل التقدم المحفوظ للأذكار.');
      })
      .finally(() => {
        if (!cancelled) setLoadingProgress(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.uid, todayStr]);

  if (!isOpen) return null;

  const saveDhikrProgress = (progressCategory, dhikrId, count) => {
    if (!user?.uid || !todayStr) {
      const error = new Error('Missing user or date for adhkar progress.');
      setProgressError('تعذر حفظ التقدم لأن الحساب أو التاريخ غير متاح.');
      return Promise.reject(error);
    }

    const reference = doc(
      db,
      'adhkarProgress',
      user.uid,
      todayStr,
      progressCategory,
      dhikrId
    );
    const save = saveQueueRef.current.then(
      () => setDoc(reference, { count, updatedAt: serverTimestamp() }),
      () => setDoc(reference, { count, updatedAt: serverTimestamp() })
    );
    saveQueueRef.current = save.catch((error) => {
      console.error('Failed to save adhkar progress:', error);
      setProgressError('تعذر حفظ التقدم. تحقق من الاتصال وحاول مرة أخرى.');
    });
    return save;
  };

  const handleTapDhikr = (dhikr) => {
    if (loadingProgress) return;
    const currentCount = adhkarState[categoryId]?.[dhikr.id] || 0;
    if (currentCount >= dhikr.count) return;

    const nextCount = currentCount + 1;
    const updatedCategory = { ...adhkarState[categoryId], [dhikr.id]: nextCount };
    setAdhkarState((state) => ({ ...state, [categoryId]: updatedCategory }));
    setProgressError(null);
    if (navigator.vibrate) navigator.vibrate(12);

    const isDailyRoutine = categoryId === 'morning' || categoryId === 'evening';
    const allDone = currentList.every(
      (item) => (updatedCategory[item.id] || 0) >= item.count
    );
    void saveDhikrProgress(categoryId, dhikr.id, nextCount)
      .then(() => {
        if (isDailyRoutine && allDone && onCompleteCategory) {
          return onCompleteCategory(categoryId === 'morning' ? 'أذكار الصباح' : 'أذكار المساء');
        }
        return undefined;
      })
      .catch((error) => {
        console.error('Failed to persist adhkar progress:', error);
        if (isDailyRoutine && allDone) {
          setProgressError('حُفظ الذكر، لكن تعذر تسجيل إتمام الورد اليومي.');
        }
      });
  };

  const resetDhikr = (dhikr) => {
    setAdhkarState((state) => ({
      ...state,
      [categoryId]: { ...state[categoryId], [dhikr.id]: 0 },
    }));
    setProgressError(null);
    void saveDhikrProgress(categoryId, dhikr.id, 0).catch((error) => {
      console.error('Failed to reset adhkar progress:', error);
    });
  };

  const resetCategory = () => {
    setAdhkarState((state) => ({
      ...state,
      [categoryId]: Object.fromEntries(currentList.map((dhikr) => [dhikr.id, 0])),
    }));
    setProgressError(null);
    for (const dhikr of currentList) {
      void saveDhikrProgress(categoryId, dhikr.id, 0).catch((error) => {
        console.error('Failed to reset adhkar category progress:', error);
      });
    }
  };

  const completedCount = currentList.filter(
    (dhikr) => (adhkarState[categoryId]?.[dhikr.id] || 0) >= dhikr.count
  ).length;
  const progressPercent = currentList.length
    ? Math.round((completedCount / currentList.length) * 100)
    : 0;
  const CategoryIcon = categoryId === 'evening' ? Moon : SunMedium;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="دليل الأذكار والأدعية"
      className="fixed inset-0 z-[70] flex h-[100dvh] w-full flex-col bg-[#f7f4ed] text-slate-800"
    >
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <CategoryIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold sm:text-base">دليل الأذكار والأدعية</h1>
            <p className="truncate text-xs text-slate-500">{activeCategory.title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={closeReader}
          aria-label="إغلاق دليل الأذكار"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <nav
        aria-label="مناسبات الأذكار"
        className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 sm:px-7"
      >
        {ADHKAR_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setCategoryId(category.id)}
            aria-pressed={categoryId === category.id}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
              categoryId === category.id
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800'
            }`}
          >
            {category.title}
          </button>
        ))}
      </nav>

      <div className="h-1 w-full bg-slate-200">
        <div
          className="h-full bg-emerald-600 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeCategory.title}</h2>
              <p className="mt-1 text-xs text-slate-500">{activeCategory.description}</p>
            </div>
            <div className="shrink-0 text-xs font-semibold text-slate-500">
              {completedCount} / {currentList.length}
            </div>
          </div>

          {(loadingProgress || progressError) && (
            <div
              role={progressError ? 'alert' : 'status'}
              className={`mb-4 rounded-xl px-4 py-3 text-xs ${
                progressError
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-sky-50 text-sky-800'
              }`}
            >
              {progressError || 'جارٍ تحميل تقدمك المحفوظ...'}
            </div>
          )}

          <div className="space-y-3">
            {currentList.map((dhikr, index) => {
              const count = adhkarState[categoryId]?.[dhikr.id] || 0;
              const isComplete = count >= dhikr.count;
              return (
                <article
                  key={dhikr.id}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                    isComplete ? 'border-emerald-300' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleTapDhikr(dhikr)}
                    disabled={loadingProgress || isComplete}
                    className="w-full p-4 text-right transition hover:bg-emerald-50/40 disabled:cursor-default sm:p-5"
                  >
                    <span className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {index + 1} / {currentList.length}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isComplete && <Check className="h-3.5 w-3.5" />}
                        {isComplete ? 'اكتمل' : `${count} من ${dhikr.count}`}
                      </span>
                    </span>
                    <span className="block font-serif text-xl leading-[2.1] text-[#3d3426] sm:text-2xl">
                      {dhikr.text}
                    </span>
                    {!isComplete && (
                      <span className="mt-3 block text-[11px] font-semibold text-emerald-700">
                        اضغط للتسبيح والمتابعة
                      </span>
                    )}
                  </button>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 sm:px-5">
                    {dhikr.source ? (
                      <a
                        href={dhikr.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-[11px] font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-emerald-800"
                      >
                        المصدر: {dhikr.source}
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">ذكر مأثور</span>
                    )}
                    {count > 0 && (
                      <button
                        type="button"
                        onClick={() => resetDhikr(dhikr)}
                        aria-label={`إعادة عداد الذكر ${index + 1}`}
                        className="flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] text-slate-500 transition hover:bg-slate-100 hover:text-rose-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        إعادة
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-7">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          <span>{progressPercent}% أُنجز</span>
        </div>
        <button
          type="button"
          onClick={resetCategory}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          تصفير القسم
        </button>
      </footer>
    </div>
  );
}
