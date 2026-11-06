import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Shell } from './components/layout/Shell';
import { Today } from './pages/Today';
import { Progress } from './pages/Progress';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AuthPage } from './pages/auth/AuthPage';
import { useLogs } from './hooks/useLogs';
import { calculateStreaks } from './lib/stats';
import { getTodayDateString } from './lib/dates';
import { AlertCircle, Lock } from 'lucide-react';

function MainApp() {
  const { user, userDoc, loading, isAdmin, logout } = useAuth();
  const { logs } = useLogs();
  const [currentTab, setCurrentTab] = useState<string>('today');

  const todayStr = getTodayDateString(userDoc?.timezone);
  const { currentStreak } = calculateStreaks(logs, todayStr);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-2xl animate-bounce">
            مُـ
          </div>
          <span className="text-sm font-bold text-slate-700">
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
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center p-4 text-right">
        <div className="w-full max-w-md bg-white border border-red-200 rounded-3xl p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            تم تعطيل هذا الحساب مؤقتًا
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            تم إيقاف تفعيل حسابك من قِبل إدارة المنصة. يرجى مراجعة المشرف المسؤول للاستفسار أو إعادة التفعيل.
          </p>
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
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
      {currentTab === 'today' && <Today />}
      {currentTab === 'progress' && <Progress />}
      {currentTab === 'history' && <History />}
      {currentTab === 'profile' && <Profile />}
      {currentTab === 'admin' && (isAdmin ? <AdminDashboard /> : <Today />)}
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
