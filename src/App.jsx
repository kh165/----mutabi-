import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { Shell } from './components/layout/Shell.jsx';
import { Today } from './pages/Today.jsx';
import { Progress } from './pages/Progress.jsx';
import { History } from './pages/History.jsx';
import { Profile } from './pages/Profile.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { AuthPage } from './pages/auth/AuthPage.jsx';
import { useLogs } from './hooks/useLogs.js';
import { calculateStreaks } from './lib/stats.js';
import { getTodayDateString } from './lib/dates.js';
import { Logo } from './components/layout/Logo.jsx';
import { Lock } from 'lucide-react';

import { TasbeehPage } from './pages/TasbeehPage.jsx';

function MainApp() {
  const { user, userDoc, loading, isAdmin, logout } = useAuth();
  const { logs } = useLogs();
  const [currentTab, setCurrentTab] = useState('today');

  const todayStr = getTodayDateString(userDoc?.timezone);
  const { currentStreak } = calculateStreaks(logs, todayStr);

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
            className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <Shell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      currentStreak={currentStreak}
    >
      {currentTab === 'today' && <Today onNavigateToTasbeeh={() => setCurrentTab('tasbeeh')} />}
      {currentTab === 'tasbeeh' && <TasbeehPage />}
      {currentTab === 'progress' && <Progress />}
      {currentTab === 'history' && <History />}
      {currentTab === 'profile' && <Profile />}
      {currentTab === 'admin' && (isAdmin ? <AdminDashboard /> : <Today onNavigateToTasbeeh={() => setCurrentTab('tasbeeh')} />)}
    </Shell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
