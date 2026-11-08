import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAdminNotes } from '../../hooks/useAdminNotes.js';
import {
  CalendarDays,
  TrendingUp,
  History,
  User,
  Shield,
  LogOut,
  Flame,
  CheckCircle2,
  MessageCircle,
  X,
  ChevronDown,
  Sun,
  Moon,
  CircleDot,
  BookOpen,
  Award,
  CheckSquare,
} from 'lucide-react';
import { formatArabicDate, getTodayDateString } from '../../lib/dates.js';
import { Logo } from './Logo.jsx';
import { QuranReaderModal } from '../QuranReaderModal.jsx';
import { MessageThreadCard } from '../MessageThreadCard.jsx';

export function Shell({
  currentTab,
  onSelectTab,
  currentStreak = 0,
  totalPoints = 0,
  children,
}) {
  const { user, userDoc, isAdmin, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const {
    notes,
    loading: notesLoading,
    error: notesError,
    markAsRead,
    replyToNote,
  } = useAdminNotes();
  const [notesOpen, setNotesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quranOpen, setQuranOpen] = useState(false);

  const unreadNotes = notes.filter((n) => !n.isRead);
  const todayStr = getTodayDateString(userDoc?.timezone);

  const navItems = [
    { id: 'today', label: 'الورد اليومي', icon: CalendarDays },
    { id: 'todos', label: 'قائمة المهام', icon: CheckSquare },
    { id: 'tasbeeh', label: 'التسبيح والأذكار', icon: CircleDot },
    { id: 'hadith', label: 'الأربعين النووية', icon: BookOpen },
    { id: 'progress', label: 'التقدم والأوسمة', icon: TrendingUp },
    { id: 'history', label: 'سجل الإنجازات', icon: History },
    { id: 'profile', label: 'الملف الشخصي', icon: User },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'لوحة الإدارة', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Brand */}
          <div
            onClick={() => onSelectTab('today')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none shrink-0"
          >
            <Logo className="h-8 sm:h-9" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  اليومي
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                {formatArabicDate(todayStr, true)}
              </p>
            </div>
          </div>

          {/* Center: Streak Badge & Points Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl font-bold text-xs sm:text-sm border transition-all ${
                currentStreak > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
              title="سلسلة الاستمرار المتواصل"
            >
              <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${currentStreak > 0 ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
              <span>{currentStreak} {currentStreak === 1 ? 'يوم' : 'أيام'}</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('progress')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl font-bold text-xs sm:text-sm border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shadow-2xs cursor-pointer hover:scale-105 transition-all"
              title="رصيد نقاط العبادة - اضغط للانتقال إلى واجهة الميداليات"
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{totalPoints} <span className="text-[10px] sm:text-xs font-semibold">نقطة</span></span>
            </button>
          </div>

          {/* Right Tools: PWA Install, Theme Toggle, Notifications & User Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Quran Reader with Night Mode */}
            <button
              type="button"
              onClick={() => setQuranOpen(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 flex items-center justify-center text-emerald-700 dark:text-emerald-300 transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              title="المصحف الشريف - القراءة والوضع الليلي المريح"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all border border-slate-200/60 dark:border-slate-700 cursor-pointer"
              title={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن"}
              aria-label="تبديل المظهر"
            >
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              )}
            </button>

            {/* Notifications / Notes dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotesOpen(!notesOpen)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 relative transition-all border border-slate-200/60 dark:border-slate-700 cursor-pointer"
                title="رسائل المشرف"
                aria-label="فتح رسائل المشرف"
                aria-expanded={notesOpen}
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotes.length > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {unreadNotes.length > 9 ? '9+' : unreadNotes.length}
                  </span>
                )}
              </button>
            </div>

            {/* User Avatar & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pe-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-all border border-slate-200/60 dark:border-slate-700 cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {userDoc?.photoURL ? (
                    <img src={userDoc.photoURL} alt={userDoc.displayName} className="w-full h-full object-cover" />
                  ) : (
                    (userDoc?.displayName?.[0] || 'م').toUpperCase()
                  )}
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden md:inline max-w-[90px] truncate">
                  {userDoc?.displayName || 'حسابي'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </button>

              {userMenuOpen && (
                <div className="absolute end-0 mt-2 w-52 sm:w-56 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-right animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
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
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 cursor-pointer"
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
                        className="w-full px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl flex items-center gap-2 cursor-pointer"
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
                      className="w-full px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-2 cursor-pointer"
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

      {notesOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setNotesOpen(false)}
            aria-label="إغلاق الرسائل"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="messages-panel-title"
            className="fixed inset-y-0 end-0 z-[60] flex w-full max-w-md flex-col border-s border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-in slide-in-from-right duration-200"
          >
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 id="messages-panel-title" className="font-black text-slate-900 dark:text-white">
                  رسائل المشرف
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {notes.length} رسالة • لكل رسالة رد واحد
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotesOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-label="إغلاق لوحة الرسائل"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              {notesLoading && (
                <p className="py-8 text-center text-sm text-slate-500">جارٍ تحميل الرسائل...</p>
              )}
              {notesError && (
                <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  تعذر تحميل الرسائل. حاول إعادة فتح اللوحة.
                </p>
              )}
              {!notesLoading && !notesError && notes.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                  <MessageCircle className="mx-auto h-9 w-9 text-emerald-500" />
                  <p className="mt-3 font-bold text-slate-800 dark:text-slate-100">لا توجد رسائل بعد</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    ستظهر هنا رسائل المشرف ويمكنك الرد على كل رسالة مرة واحدة.
                  </p>
                </div>
              )}
              {notes.map((note) => (
                <div key={note.id} className="space-y-2">
                  <MessageThreadCard note={note} canReply onReply={replyToNote} />
                  {!note.isRead && (
                    <button
                      type="button"
                      onClick={() => markAsRead(note.id)}
                      className="ms-2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      تم الاطلاع
                    </button>
                  )}
                  <div className="border-b border-slate-200/70 pt-2 dark:border-slate-800" />
                </div>
              ))}
            </div>
          </aside>
        </>
      )}

      {/* Main Layout Body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 flex gap-6 lg:gap-8">
        {/* Desktop Sidebar Navigation */}
        <aside className="w-56 shrink-0 hidden md:flex flex-col gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-2.5 shadow-2xs space-y-1">
            {navItems.map((item) => {
              const active = currentTab === item.id || (item.id === 'admin' && currentTab.startsWith('admin'));
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-right cursor-pointer ${
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shadow-2xs border border-emerald-200/60 dark:border-emerald-800/60'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Inspirational Box */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed text-right shadow-2xs">
            <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">قَالَ رَسُولُ اللَّهِ ﷺ:</p>
            <p className="italic text-[11px] text-slate-600 dark:text-slate-400">
              «أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ»
            </p>
          </div>
        </aside>

        {/* Page Main Content Area */}
        <main className="flex-1 min-w-0 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      <footer dir="ltr" className="w-full px-4 pb-24 pt-2 text-center text-xs text-slate-400 dark:text-slate-500 md:pb-5">
        khalid salah — All rights reserved | 2026 ©
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 z-40 px-2 py-1.5 flex items-center justify-between overflow-x-auto scrollbar-none shadow-lg gap-0.5">
        {navItems.map((item) => {
          const active = currentTab === item.id || (item.id === 'admin' && currentTab.startsWith('admin'));
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all cursor-pointer shrink-0 ${
                active
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold scale-105'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-medium'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[10px] sm:text-[11px] whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quran Reader Modal */}
      <QuranReaderModal
        isOpen={quranOpen}
        onClose={() => setQuranOpen(false)}
        initialSurahNumber={1}
      />
    </div>
  );
}
