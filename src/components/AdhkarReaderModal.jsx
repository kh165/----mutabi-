import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  Moon,
  SunMedium,
  RotateCcw,
  X,
  Search,
  Copy,
  CheckCheck,
  Shield,
  Heart,
  Clock,
  BookOpenCheck,
  Compass,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ADHKAR_CATEGORIES } from '../data/adhkar.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getTodayDateString } from '../lib/dates.js';
import { enqueueOfflineAction } from '../lib/offlineSync.js';
import {
  collection,
  db,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '../firebase.js';

const getProgressStorageKey = (uid, date) =>
  `mutabi_adhkar_counts_${uid || 'guest'}_${date || 'today'}`;

const getProgressDocumentId = (date, categoryId, dhikrId) =>
  `${date}_${categoryId}_${dhikrId}`;

export function AdhkarReaderModal({
  isOpen,
  onClose,
  initialCategory = 'morning',
  todayStr,
  onCompleteCategory,
}) {
  const { user, userDoc } = useAuth();
  // لو الصفحة اللي فتحت المودال ما بعتتش التاريخ نحسبه هنا، عشان التقدم يتسجل في Firestore دايمًا
  const dayKey = todayStr || getTodayDateString(userDoc?.timezone);

  const [activeCategoryId, setActiveCategoryId] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [counts, setCounts] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [fontScale, setFontScale] = useState(2); // 1 to 4
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressSyncError, setProgressSyncError] = useState(null);
  const [progressSyncState, setProgressSyncState] = useState('idle');
  const countsRef = useRef({});

  useEffect(() => {
    if (isOpen) {
      if (initialCategory && ADHKAR_CATEGORIES.some((c) => c.id === initialCategory)) {
        setActiveCategoryId(initialCategory);
      }
    }
  }, [isOpen, initialCategory]);

  useEffect(() => {
    if (!isOpen) return;
    const localKey = getProgressStorageKey(user?.uid, dayKey);
    const localCounts = {};
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) Object.assign(localCounts, JSON.parse(saved));
      else if (user?.uid) {
        const owner = localStorage.getItem('mutabi_adhkar_counts_owner');
        if (!owner || owner === user.uid) {
          const legacy = localStorage.getItem(`mutabi_adhkar_counts_${dayKey || 'today'}`);
          if (legacy) {
            Object.assign(localCounts, JSON.parse(legacy));
            localStorage.setItem(localKey, JSON.stringify(localCounts));
            localStorage.setItem('mutabi_adhkar_counts_owner', user.uid);
          }
        }
      }
    } catch (error) {
      console.warn('Could not read saved adhkar progress:', error);
    }

    setCounts(localCounts);
    countsRef.current = localCounts;
    setProgressSyncError(null);
    if (!user?.uid || !dayKey) {
      setLoadingProgress(false);
      setProgressSyncState('local');
      return;
    }

    setLoadingProgress(true);
    setProgressSyncState(navigator.onLine ? 'syncing' : 'offline');
    const migratingIds = new Set();
    const progressQuery = query(
      collection(db, 'users', user.uid, 'adhkarProgress'),
      where('date', '==', dayKey)
    );
    const unsubscribe = onSnapshot(
      progressQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        const cloudCounts = {};
        snapshot.forEach((progressDoc) => {
          const progress = progressDoc.data();
          if (typeof progress.dhikrId === 'string') {
            cloudCounts[progress.dhikrId] = Math.max(0, Number(progress.count) || 0);
          }
        });

        if (snapshot.metadata.fromCache) {
          const mergedCounts = { ...countsRef.current, ...cloudCounts };
          countsRef.current = mergedCounts;
          setCounts(mergedCounts);
          setProgressSyncState(navigator.onLine ? 'syncing' : 'offline');
          return;
        }

        setLoadingProgress(false);
        setProgressSyncState('synced');
        setProgressSyncError(null);

        const itemCategories = new Map(
          ADHKAR_CATEGORIES.flatMap((category) =>
            category.items.map((item) => [item.id, category.id])
          )
        );
        const missingLocalProgress = Object.entries(localCounts).filter(
          ([dhikrId, count]) =>
            itemCategories.has(dhikrId) &&
            Number(count) > 0 &&
            !Object.hasOwn(cloudCounts, dhikrId) &&
            !migratingIds.has(dhikrId)
        );
        if (missingLocalProgress.length > 0) {
          const migrations = missingLocalProgress.map(([dhikrId, count]) => {
            const categoryId = itemCategories.get(dhikrId);
            migratingIds.add(dhikrId);
            return setDoc(
              doc(
                db,
                'users',
                user.uid,
                'adhkarProgress',
                getProgressDocumentId(dayKey, categoryId, dhikrId)
              ),
              {
                uid: user.uid,
                date: dayKey,
                categoryId,
                dhikrId,
                count: Math.min(100, Number(count)),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).finally(() => migratingIds.delete(dhikrId));
          });
          void Promise.all(migrations).catch((error) => {
            console.error('Failed to sync existing adhkar progress:', error);
            setProgressSyncState('error');
            setProgressSyncError('تعذر مزامنة تقدمك المحفوظ. تحقق من الاتصال أو صلاحيات قاعدة البيانات.');
          });
          return;
        }

        countsRef.current = cloudCounts;
        setCounts(cloudCounts);
        try {
          localStorage.setItem(localKey, JSON.stringify(cloudCounts));
        } catch (error) {
          console.warn('Could not cache synchronized adhkar progress:', error);
        }
      },
      (error) => {
        console.error('Failed to sync adhkar progress:', error);
        setLoadingProgress(false);
        setProgressSyncState('error');
        setProgressSyncError('تعذرت مزامنة تقدم الأذكار. تحقق من الاتصال أو صلاحيات قاعدة البيانات.');
      }
    );

    return () => unsubscribe();
  }, [isOpen, dayKey, user?.uid]);

  if (!isOpen) return null;

  const activeCategory =
    ADHKAR_CATEGORIES.find((c) => c.id === activeCategoryId) || ADHKAR_CATEGORIES[0];

  let displayedItems = activeCategory.items;
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    const allItems = ADHKAR_CATEGORIES.flatMap((c) =>
      c.items.map((item) => ({ ...item, categoryTitle: c.title }))
    );
    displayedItems = allItems.filter(
      (item) =>
        item.text.includes(q) ||
        item.title?.includes(q) ||
        item.virtue?.includes(q) ||
        item.source?.includes(q)
    );
  }

  // نكتب القيمة المطلقة للعدّاد (وليس increment) حتى يتطابق Firestore مع الشاشة دائمًا
  const persistCount = (dhikrId, categoryId, count, errorMessage) => {
    if (!user?.uid || !dayKey || !categoryId) return;
    setProgressSyncError(null);

    if (!navigator.onLine) {
      enqueueOfflineAction({
        type: 'SAVE_ADHKAR',
        key: `ADHKAR_${dayKey}_${categoryId}_${dhikrId}`,
        uid: user.uid,
        dayKey,
        categoryId,
        dhikrId,
        count,
      });
      setProgressSyncState('offline');
      return;
    }

    void setDoc(
      doc(
        db,
        'users',
        user.uid,
        'adhkarProgress',
        getProgressDocumentId(dayKey, categoryId, dhikrId)
      ),
      {
        uid: user.uid,
        date: dayKey,
        categoryId,
        dhikrId,
        count,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).then(
      () => setProgressSyncState('synced'),
      (error) => {
        if (!navigator.onLine || error?.message?.includes('offline') || error?.code === 'unavailable') {
          enqueueOfflineAction({
            type: 'SAVE_ADHKAR',
            key: `ADHKAR_${dayKey}_${categoryId}_${dhikrId}`,
            uid: user.uid,
            dayKey,
            categoryId,
            dhikrId,
            count,
          });
          setProgressSyncState('offline');
        } else {
          console.error('Failed to save adhkar progress:', error);
          setProgressSyncState('error');
          setProgressSyncError(errorMessage);
        }
      }
    );
  };

  const handleIncrement = (id, targetCount) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }

    const currentCount = countsRef.current[id] || 0;
    if (currentCount >= targetCount) return;
    const nextCount = currentCount + 1;
    const nextState = { ...countsRef.current, [id]: nextCount };
    countsRef.current = nextState;
    setCounts(nextState);
    try {
      localStorage.setItem(getProgressStorageKey(user?.uid, dayKey), JSON.stringify(nextState));
    } catch (error) {
      console.warn('Could not cache adhkar progress:', error);
    }
    const categoryId =
      ADHKAR_CATEGORIES.find((category) => category.items.some((item) => item.id === id))?.id;
    persistCount(id, categoryId, nextCount, 'تعذر مزامنة هذا الذكر. تم الاحتفاظ به على هذا الجهاز.');
  };

  const handleResetDhikr = (e, id) => {
    e.stopPropagation();
    const nextState = { ...countsRef.current, [id]: 0 };
    countsRef.current = nextState;
    setCounts(nextState);
    try {
      localStorage.setItem(getProgressStorageKey(user?.uid, dayKey), JSON.stringify(nextState));
    } catch (error) {
      console.warn('Could not cache reset adhkar progress:', error);
    }
    const categoryId =
      ADHKAR_CATEGORIES.find((category) => category.items.some((item) => item.id === id))?.id;
    persistCount(id, categoryId, 0, 'تعذر مزامنة إعادة العداد. تم الاحتفاظ بالتغيير على هذا الجهاز.');
  };

  const handleCopyText = (e, id, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const completedInActive = activeCategory.items.filter(
    (item) => (counts[item.id] || 0) >= item.count
  ).length;
  const totalInActive = activeCategory.items.length;
  const categoryProgress = totalInActive > 0 ? Math.round((completedInActive / totalInActive) * 100) : 0;

  const fontStyle = {
    1: 'text-base sm:text-lg leading-[2.2]',
    2: 'text-lg sm:text-xl leading-[2.4]',
    3: 'text-xl sm:text-2xl leading-[2.7]',
    4: 'text-2xl sm:text-3xl leading-[3.0]',
  }[fontScale];

  const getCategoryIcon = (id) => {
    switch (id) {
      case 'morning': return <SunMedium className="w-4 h-4 text-amber-500" />;
      case 'evening': return <Moon className="w-4 h-4 text-indigo-400" />;
      case 'after-prayer': return <Compass className="w-4 h-4 text-emerald-500" />;
      case 'sleep': return <Moon className="w-4 h-4 text-sky-400" />;
      case 'relief': return <Heart className="w-4 h-4 text-rose-500" />;
      case 'prophetic': return <BookOpenCheck className="w-4 h-4 text-amber-400" />;
      case 'ruqyah': return <Shield className="w-4 h-4 text-teal-500" />;
      default: return <Clock className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="موسوعة الأذكار والأدعية النبوية"
    >
      <div className="w-full max-w-4xl h-[94vh] max-h-[94vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-right">
        {/* Header Bar */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white truncate">
                موسوعة الأذكار والأدعية النبوية الصحيحة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                نصوص كاملة موثقة بالتشكيل والتخريج وفضائل الأعمال من صحيح السنة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFontScale((s) => Math.max(1, s - 1))}
                disabled={fontScale <= 1}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title="تصغير الخط"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold px-1.5 opacity-70">خط</span>
              <button
                type="button"
                onClick={() => setFontScale((s) => Math.min(4, s + 1))}
                disabled={fontScale >= 4}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                title="تكبير الخط"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-600 dark:text-slate-300 flex items-center justify-center transition cursor-pointer"
              title="إغلاق الموسوعة"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Search & Categories Bar */}
        <div className="p-3 sm:px-6 sm:py-3 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث في جميع الأذكار والأدعية (مثال: كرب، دين، سفر، مطر، نوم، استخارة، شفاء...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-10 pe-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {!searchQuery && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {ADHKAR_CATEGORIES.map((cat) => {
                const isActive = activeCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {getCategoryIcon(cat.id)}
                    <span>{cat.badge || cat.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!searchQuery && (
            <div className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {activeCategory.title}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  ({completedInActive} من {totalInActive} أُنجزت)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${categoryProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 min-w-[32px]">
                  {categoryProgress}%
                </span>
              </div>
            </div>
          )}

          {progressSyncError && (
            <p role="alert" className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              {progressSyncError}
            </p>
          )}
        </div>

        {/* Adhkar List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {displayedItems.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Search className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                لم نجد أي ذكر أو دعاء يطابق بحثك «{searchQuery}»
              </p>
              <p className="text-xs text-slate-400">
                جرب البحث بكلمة أخرى مثل: هم، كرب، صلاة، استغفار، سفر، نوم
              </p>
            </div>
          ) : (
            displayedItems.map((item, index) => {
              const currentCount = counts[item.id] || 0;
              const isCompleted = currentCount >= item.count;

              return (
                <div
                  key={item.id}
                  onClick={() => handleIncrement(item.id, item.count)}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer select-none space-y-3 relative overflow-hidden ${
                    isCompleted
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      {item.title && (
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {item.title}
                        </h4>
                      )}
                      {item.categoryTitle && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                          {item.categoryTitle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleCopyText(e, item.id, item.text)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition"
                        title="نسخ الذكر"
                      >
                        {copiedId === item.id ? (
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      {currentCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => handleResetDhikr(e, item.id)}
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 transition"
                          title="إعادة ضبط العداد"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}

                      <div
                        className={`px-3 py-1 rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {isCompleted ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>مكتمل ({item.count})</span>
                          </>
                        ) : (
                          <span>
                            {currentCount} / {item.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className={`font-serif font-normal text-slate-900 dark:text-slate-100 text-right ${fontStyle} leading-relaxed`}>
                    {item.text}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {item.virtue && (
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.virtue}</span>
                      </p>
                    )}

                    {item.source && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                        تخريج: {item.source}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <footer className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>اضغط على أي ذكر للعد التنازلي التفاعلي المباشر</span>
          </div>

          <div className="flex items-center gap-2">
            {onCompleteCategory && (
              <button
                type="button"
                onClick={() => {
                  onCompleteCategory(activeCategory.title);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="تسجيل إنجاز أذكار هذا القسم في الورد واحتساب النقاط"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تسجيل إتمام الأذكار (+25 نقطة)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}