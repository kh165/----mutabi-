import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAdminNotes } from '../../hooks/useAdminNotes';
import {
  CalendarDays,
  TrendingUp,
  History,
  User,
  Shield,
  Bell,
  LogOut,
  Flame,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { formatArabicDate, getTodayDateString } from '../../lib/dates';

interface ShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentStreak?: number;
  children: React.ReactNode;
}

export function Shell({
  currentTab,
  onSelectTab,
  currentStreak = 0,
  children,
}: ShellProps) {
  const { user, userDoc, isAdmin, logout } = useAuth();
  const { notes, markAsRead } = useAdminNotes();
  const [notesOpen, setNotesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const unreadNotes = notes.filter((n) => !n.isRead);
  const todayStr = getTodayDateString(userDoc?.timezone);

  const navItems = [
    { id: 'today', label: 'اليوم', icon: CalendarDays },
    { id: 'progress', label: 'التقدم', icon: TrendingUp },
    { id: 'history', label: 'السجل', icon: History },
    { id: 'profile', label: 'حسابي', icon: User },
  ];

  // Strictly only show admin tab if database verifies isAdmin
  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'الإدارة', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Slogan */}
          <div
            onClick={() => onSelectTab('today')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              مُـ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-xl tracking-tight text-slate-900">
                  مُتَابِـع
                </span>
                <span className="text-[10px] sm:text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  اليومي
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">
                {formatArabicDate(todayStr, true)}
              </p>
            </div>
          </div>

          {/* Center: Streak Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl font-bold text-xs sm:text-sm border transition-all ${
                currentStreak > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800 shadow-2xs'
                  : 'bg-slate-100/90 border-slate-200 text-slate-500'
              }`}
              title="سلسلة الاستمرار المتواصل"
            >
              <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${currentStreak > 0 ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
              <span>{currentStreak} {currentStreak === 1 ? 'يوم' : 'أيام'}</span>
            </div>
          </div>

          {/* Right Tools: Notifications & User Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Notifications / Notes dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotesOpen(!notesOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-600 relative transition-all"
                title="ملاحظات المشرف الخاصة"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotes.length > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    {unreadNotes.length}
                  </span>
                )}
              </button>

              {notesOpen && (
                <div className="absolute end-0 mt-2 w-72 sm:w-88 bg-white rounded-3xl shadow-xl border border-slate-200/90 p-4 z-50 text-right animate-in fade-in">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <span className="font-bold text-xs sm:text-sm text-slate-900">
                      ملاحظات المشرف
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {notes.length} رسالة
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-2">
                    {notes.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        لا توجد ملاحظات جديدة في قاعدة البيانات.
                      </div>
                    ) : (
                      notes.map((n) => (
                        <div
                          key={n.id}
                          className={`py-2.5 px-2 rounded-xl transition-all ${
                            !n.isRead ? 'bg-emerald-50/70' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span className="font-bold text-emerald-700">
                              {n.fromName || 'المشرف'}
                            </span>
                            {!n.isRead && (
                              <button
                                onClick={() => markAsRead(n.id)}
                                className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                تم الاطلاع
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {n.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pe-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 transition-all"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {userDoc?.photoURL ? (
                    <img src={userDoc.photoURL} alt={userDoc.displayName} className="w-full h-full object-cover" />
                  ) : (
                    (userDoc?.displayName?.[0] || 'م').toUpperCase()
                  )}
                </div>
                <span className="text-xs font-bold text-slate-800 hidden md:inline max-w-[90px] truncate">
                  {userDoc?.displayName || 'حسابي'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {userMenuOpen && (
                <div className="absolute end-0 mt-2 w-52 sm:w-56 bg-white rounded-3xl shadow-xl border border-slate-200/90 p-2 z-50 text-right animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {userDoc?.displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate" dir="ltr">
                      {user?.email || userDoc?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onSelectTab('profile');
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      الملف الشخصي
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          onSelectTab('admin');
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                        لوحة الإدارة
                      </button>
                    )}

                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex gap-6 lg:gap-8">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-56 shrink-0 hidden md:flex flex-col gap-3">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-2.5 shadow-2xs space-y-1">
            {navItems.map((item) => {
              const active = currentTab === item.id || (item.id === 'admin' && currentTab.startsWith('admin'));
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-right ${
                    active
                      ? 'bg-emerald-50 text-emerald-800 shadow-2xs border border-emerald-200/60'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Inspirational Box */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 text-xs text-slate-700 leading-relaxed text-right shadow-2xs">
            <p className="font-bold text-emerald-700 mb-1">قَالَ رَسُولُ اللَّهِ ﷺ:</p>
            <p className="italic text-[11px] text-slate-600">
              «أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ»
            </p>
          </div>
        </aside>

        {/* Page Main Content Area */}
        <main className="flex-1 min-w-0 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 px-1.5 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const active = currentTab === item.id || (item.id === 'admin' && currentTab.startsWith('admin'));
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
                active
                  ? 'text-emerald-700 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600 text-xs font-medium'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[10px] sm:text-[11px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
