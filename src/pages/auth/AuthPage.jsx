import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Mail,
  User,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';
import { Logo } from '../../components/layout/Logo.jsx';

export function AuthPage() {
  const {
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
    error: authError,
  } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [accountNotFound, setAccountNotFound] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setAccountNotFound(false);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
      } else if (mode === 'register') {
        if (!name.trim()) {
          setLocalError('يرجى إدخال اسمك');
          setLoading(false);
          return;
        }
        await registerWithEmail(name.trim(), email.trim(), password);
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (err) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (
        mode === 'login' &&
        (code === 'auth/user-not-found' ||
          code === 'auth/invalid-credential' ||
          msg.includes('user-not-found') ||
          msg.includes('invalid-credential'))
      ) {
        setAccountNotFound(true);
      } else {
        setLocalError(err?.message || 'حدث خطأ أثناء المعالجة');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setLocalError(err?.message || 'تعذر تسجيل الدخول بحساب Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 relative transition-colors duration-200">
      {/* Top corner theme toggle */}
      <div className="absolute top-4 left-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-2xs transition-all cursor-pointer"
          title="تبديل المظهر"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-right">
        {/* Logo and Greeting */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Logo className="h-12 sm:h-14" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            مرحباً بك في منصّة مُتَابِـع 🌙
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            متابعة الأنشطة اليومية، حفظ وقراءة القرآن الكريم، والصلوات الخمس في جماعة
          </p>
        </div>

        {/* Tab switch between Login and Register */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setLocalError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              إنشاء حساب جديد
            </button>
          </div>
        )}

        {/* Google Sign-in Button */}
        {mode !== 'forgot' && (
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-3 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>متابعة بحساب Google</span>
          </button>
        )}

        {mode !== 'forgot' && (
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            <span className="absolute bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-semibold">
              أو بالبريد الإلكتروني
            </span>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                الاسم الكريم
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="مثال: خالد صلاح"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-right"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left font-sans"
                dir="ltr"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  كلمة المرور
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setLocalError(null);
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {resetSent && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني!</span>
            </div>
          )}

          {accountNotFound && mode === 'login' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs space-y-2.5 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>هذا الحساب غير مسجل لدينا في المنصة بعد</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                لم نجد حساباً مسجلاً بالبريد الإلكتروني المدخل. يمكنك إنشاء حساب جديد مجاناً والانطلاق فوراً في وردك اليومي.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setAccountNotFound(false);
                  setLocalError(null);
                }}
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>إنشاء حساب جديد بهذا البريد الآن ↗</span>
              </button>
            </div>
          )}

          {(localError || authError) && !accountNotFound && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{localError || authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>
              {loading
                ? 'جارٍ التحقق...'
                : mode === 'login'
                ? 'تسجيل الدخول'
                : mode === 'register'
                ? 'إنشاء حسابي والبدء'
                : 'إرسال رابط استعادة كلمة المرور'}
            </span>
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-2 cursor-pointer"
            >
              العودة لشاشة الدخول
            </button>
          )}
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-400">
          منصة إسلامية موثوقة لحفظ ومتابعة إنجازاتك اليومية
        </div>
      </div>
    </div>
  );
}
