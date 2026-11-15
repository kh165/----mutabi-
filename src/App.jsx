import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { Shell } from './components/layout/Shell.jsx';
import { AuthPage } from './pages/auth/AuthPage.jsx';
import { useActivities } from './hooks/useActivities.js';
import { useLogs } from './hooks/useLogs.js';
import { calculateStreaks } from './lib/stats.js';
import { calculateUserPoints } from './lib/points.js';
import { getTodayDateString } from './lib/dates.js';
import { Logo } from './components/layout/Logo.jsx';
import { isDatabasePermissionError } from './firebase.js';
import { Lock } from 'lucide-react';
import { PrayerAlertBanner } from './components/PrayerAlertBanner.jsx';
import { AdminErrorBoundary } from './components/AdminErrorBoundary.jsx';
import { AdminFollowConsentDialog } from './components/AdminFollowConsentDialog.jsx';
import { PWAInstallBanner } from './components/layout/PWAInstallBanner.jsx';
import { UpdateBanner } from './components/layout/UpdateBanner.jsx';
import { LoaderCircle } from 'lucide-react';
import {
  NOTIFICATION_DEFAULT_SETTINGS,
  checkAndTriggerDueNotifications,
} from './lib/notifications.js';
import { applyPrayerTimes, fetchPrayerTimes, getLocalDateKey, getCalculationMethod } from './lib/prayerTimes.js';
import { getOfflinePackageStatus } from './lib/offlineSync.js';
import { getPrayerArabicName } from './lib/prayerNames.js';

const Today = lazy(() => import('./pages/Today.jsx').then((module) => ({ default: module.Today })));
const AdhkarPage = lazy(() => import('./pages/AdhkarPage.jsx').then((module) => ({ default: module.AdhkarPage })));
const SalatPage = lazy(() => import('./pages/SalatPage.jsx').then((module) => ({ default: module.SalatPage })));
const Progress = lazy(() => import('./pages/Progress.jsx').then((module) => ({ default: module.Progress })));
const History = lazy(() => import('./pages/History.jsx').then((module) => ({ default: module.History })));
const Profile = lazy(() => import('./pages/Profile.jsx').then((module) => ({ default: module.Profile })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx').then((module) => ({ default: module.AdminDashboard })));
const TasbeehPage = lazy(() => import('./pages/TasbeehPage.jsx').then((module) => ({ default: module.TasbeehPage })));
const HadithPage = lazy(() => import('./pages/HadithPage.jsx').then((module) => ({ default: module.HadithPage })));
const IslamicLibraryPage = lazy(() => import('./pages/IslamicLibraryPage.jsx').then((module) => ({ default: module.IslamicLibraryPage })));

const TodosPage = lazy(() => import('./pages/TodosPage.jsx').then((module) => ({ default: module.TodosPage })));

const VALID_TABS = ['today', 'tasbeeh', 'adhkar', 'salawat', 'hadith', 'library', 'todos', 'progress', 'history', 'profile', 'admin'];

function getInitialTab() {
  const hash = window.location.hash.replace('#', '').trim();
  if (hash && VALID_TABS.includes(hash)) return hash;
  try {
    const saved = localStorage.getItem('mutabi_active_tab');
    if (saved && VALID_TABS.includes(saved)) return saved;
  } catch {}
  return 'today';
}

function MainApp() {
  const { user, userDoc, profileSyncError, loading, isAdmin, logout, updateUserDoc } = useAuth();
  const { activities } = useActivities();
  const { logs, saveLog } = useLogs();
  const [currentTab, setCurrentTabState] = useState(getInitialTab);
  const [adhkarInitialCategory, setAdhkarInitialCategory] = useState('morning');
  const [offlineSetupOpen, setOfflineSetupOpen] = useState(false);
  const [activeVisualAlert, setActiveVisualAlert] = useState(null);
  const triggeredMapRef = useRef({});
  const refreshingPrayerTimesRef = useRef(null);

  // نتأكد إن الرابط (hash) دايمًا متطابق مع التبويب الحالي، بدون إضافة سجل جديد في التاريخ
  useEffect(() => {
    try {
      if (window.location.hash.replace('#', '') !== currentTab) {
        window.history.replaceState(null, '', `#${currentTab}`);
      }
    } catch {}
  }, [currentTab]);

  useEffect(() => {
    if (loading || !user?.uid || !userDoc) return;
    try {
      const preferenceKey = `mutabi_offline_setup_seen_${user.uid}`;
      if (getOfflinePackageStatus().downloadedTier) {
        localStorage.setItem(preferenceKey, 'true');
        return;
      }
      if (localStorage.getItem(preferenceKey) !== 'true') {
        setOfflineSetupOpen(true);
      }
    } catch (error) {
      console.warn('Could not read the offline setup preference:', error);
      setOfflineSetupOpen(true);
    }
  }, [loading, user?.uid, userDoc]);

  const dismissOfflineSetup = () => {
    try {
      if (user?.uid) {
        localStorage.setItem(`mutabi_offline_setup_seen_${user.uid}`, 'true');
      }
    } catch (error) {
      console.warn('Could not save the offline setup preference:', error);
    }
    setOfflineSetupOpen(false);
  };

  useEffect(() => {
    const location = userDoc?.prayerLocation;
    if (!user || !location) return;

    let cancelled = false;
    const refreshPrayerTimes = async () => {
      const dateKey = getLocalDateKey();
      const refreshKey = `${dateKey}:${location.latitude}:${location.longitude}`;
      if (
        userDoc?.notifications?.prayerTimesDate === dateKey ||
        refreshingPrayerTimesRef.current === refreshKey
      ) {
        return;
      }

      refreshingPrayerTimesRef.current = refreshKey;
      try {
        const method = userDoc?.prayerMethod && userDoc.prayerMethod !== 'auto'
          ? Number(userDoc.prayerMethod)
          : getCalculationMethod(userDoc?.timezone);
        const prayerTimes = await fetchPrayerTimes(location.latitude, location.longitude, new Date(), method, userDoc?.timezone);
        if (cancelled) return;
        const notifications = applyPrayerTimes(
          userDoc?.notifications || NOTIFICATION_DEFAULT_SETTINGS,
          prayerTimes,
          dateKey
        );
        await updateUserDoc({ notifications });
      } catch (error) {
        if (!cancelled) {
          refreshingPrayerTimesRef.current = null;
          console.error('Failed to refresh daily prayer times:', error);
        }
      }
    };

    refreshPrayerTimes();
    const interval = window.setInterval(refreshPrayerTimes, 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    user,
    userDoc?.prayerLocation?.latitude,
    userDoc?.prayerLocation?.longitude,
    userDoc?.prayerMethod,
    userDoc?.timezone,
    userDoc?.notifications?.prayerTimesDate,
  ]);

  const handleSelectTab = (tabId) => {
    if (!VALID_TABS.includes(tabId)) return;
    if (tabId !== currentTab) {
      try {
        window.history.pushState({ tabId }, '', `#${tabId}`);
      } catch {}
      // كل صفحة تبدأ من أعلى بشكل ثابت، دون استعادة موضع قديم بعد تحميل محتوى متأخر.
      window.scrollTo(0, 0);
    }
    setCurrentTabState(tabId);
    try {
      localStorage.setItem('mutabi_active_tab', tabId);
    } catch {}
  };

  const handleNavigateToAdhkar = (category = 'morning') => {
    setAdhkarInitialCategory(category);
    handleSelectTab('adhkar');
  };

  // نحفظ التبويب الحالي دايمًا (حتى لو اتغير من زر الرجوع أو من الرابط)
  useEffect(() => {
    try {
      localStorage.setItem('mutabi_active_tab', currentTab);
    } catch {}
  }, [currentTab]);

  React.useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && VALID_TABS.includes(hash)) {
        setCurrentTabState(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);

  // Timer checking for prayer times and worship notifications every 20 seconds
  useEffect(() => {
    if (!user) return;
    const settings = userDoc?.notifications || NOTIFICATION_DEFAULT_SETTINGS;

    const checkNotifications = () => {
      triggeredMapRef.current = checkAndTriggerDueNotifications(
        settings,
        triggeredMapRef.current,
        (alert) => {
          setActiveVisualAlert(alert);
        }
      );
    };

    const interval = setInterval(checkNotifications, 20000);
    document.addEventListener('visibilitychange', checkNotifications);
    window.addEventListener('focus', checkNotifications);

    checkNotifications();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', checkNotifications);
      window.removeEventListener('focus', checkNotifications);
    };
  }, [user, userDoc?.notifications]);

  const todayStr = getTodayDateString(userDoc?.timezone);
  const streaks = calculateStreaks(logs, todayStr);
  const currentStreak = streaks.currentStreak;
  const userPoints = calculateUserPoints(logs, activities, streaks);

  const handleRecordPrayerFromAlert = async (prayerKey) => {
    try {
      const prayerActivity = activities.find(
        (activity) =>
          activity.type === 'prayers' ||
          activity.id === 'prayers' ||
          activity.title.includes('الصلوات الخمس')
      );
      const prayerActivityId = prayerActivity?.id || 'prayers';
      const prayerLog =
        logs.find((log) => log.date === todayStr && log.activityId === prayerActivityId) ||
        logs.find(
          (log) =>
            log.date === todayStr &&
            (log.activityId === 'prayers' ||
              String(log.activityId || '').startsWith('prayers_'))
        );
      const currentPrayers = prayerLog?.details?.prayers || {};
      const updatedPrayers = {
        ...currentPrayers,
        [prayerKey]: {
          id: prayerKey,
          title: `صلاة ${getPrayerArabicName(prayerKey)}`,
          status: 'prayed_jamaah',
          note: 'تسجيل سريع من إشعار دخول الوقت',
          updatedAt: new Date().toISOString(),
        },
      };

      const performedCount = Object.values(updatedPrayers).filter(
        (p) => p.status === 'prayed_jamaah' || p.status === 'prayed_individual'
      ).length;

      await saveLog(
        prayerActivityId,
        todayStr,
        performedCount,
        performedCount === 5,
        { prayers: updatedPrayers },
        `تسجيل صلاة ${getPrayerArabicName(prayerKey)} من التنبيه`
      );

      if (updateUserDoc) {
        await updateUserDoc({
          lastPrayerUpdate: {
            date: todayStr,
            performedCount,
            isCompleted: performedCount === 5,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    } catch (e) {
      console.error('Error logging prayer from banner', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Logo className="h-14 sm:h-16 animate-bounce" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            مُتَابِـع... جارٍ التحميل
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated -> show AuthPage
  if (!user) {
    return <AuthPage />;
  }

  if (profileSyncError) {
    const message = isDatabasePermissionError(profileSyncError)
      ? 'قواعد Firestore رفضت قراءة ملف المستخدم أو إنشاؤه. راجع قواعد users في مشروع Firebase الصحيح.'
      : 'تعذر تأكيد ملف المستخدم في Firestore. لم نعرض بيانات محلية بديلة حتى لا يظهر كأنها محفوظة.';

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-right">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-3xl p-8 shadow-xl space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">تعذر مزامنة ملفك مع قاعدة البيانات</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">
            {profileSyncError.code || profileSyncError.message}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is disabled by admin -> block with friendly explanation
  if (userDoc?.isDisabled) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 text-right">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            تم تعطيل هذا الحساب مؤقتًا
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            تم إيقاف تفعيل حسابك من قِبل إدارة المنصة. يرجى مراجعة المشرف المسؤول للاستفسار أو إعادة التفعيل.
          </p>
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PrayerAlertBanner
        alert={activeVisualAlert}
        onDismiss={() => setActiveVisualAlert(null)}
        onRecordPrayer={handleRecordPrayerFromAlert}
      />
      <Shell
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentStreak={currentStreak}
        totalPoints={userPoints.totalPoints}
        showOfflineSetup={offlineSetupOpen}
        onOfflineSetupDismiss={dismissOfflineSetup}
      >
        <Suspense
          fallback={
            <div className="flex min-h-48 items-center justify-center text-emerald-700 dark:text-emerald-300" role="status">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              <span className="sr-only">جارٍ تحميل الصفحة</span>
            </div>
          }
        >
          {currentTab === 'today' && (
            <Today
              onNavigateToTasbeeh={() => handleSelectTab('tasbeeh')}
              onNavigateToHadith={() => handleSelectTab('hadith')}
              onNavigateToTodos={() => handleSelectTab('todos')}
              onNavigateToAdhkar={handleNavigateToAdhkar}
            />
          )}
          {currentTab === 'tasbeeh' && <TasbeehPage />}
          {currentTab === 'adhkar' && <AdhkarPage initialCategory={adhkarInitialCategory} />}
          {currentTab === 'salawat' && <SalatPage />}
          {currentTab === 'hadith' && <HadithPage />}
          {currentTab === 'library' && <IslamicLibraryPage />}
          {currentTab === 'todos' && <TodosPage />}
          {currentTab === 'progress' && <Progress />}
          {currentTab === 'history' && <History />}
          {currentTab === 'profile' && <Profile />}
          {currentTab === 'admin' && (
            isAdmin ? (
              <AdminErrorBoundary>
                <AdminDashboard />
              </AdminErrorBoundary>
            ) : (
              <Today
                onNavigateToTasbeeh={() => handleSelectTab('tasbeeh')}
                onNavigateToHadith={() => handleSelectTab('hadith')}
                onNavigateToTodos={() => handleSelectTab('todos')}
                onNavigateToAdhkar={handleNavigateToAdhkar}
              />
            )
          )}
        </Suspense>
      </Shell>
      {userDoc && typeof userDoc.adminMonitoringConsent !== 'boolean' && (
        <AdminFollowConsentDialog
          onChoose={(consent) => updateUserDoc({ adminMonitoringConsent: consent })}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <>
          <MainApp />
          <PWAInstallBanner />
          <UpdateBanner />
        </>
      </AuthProvider>
    </ThemeProvider>
  );
}
