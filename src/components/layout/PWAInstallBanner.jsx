import React, { useState } from 'react';
import { ArrowDownToLine, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';

const DISMISSED_KEY = 'mutabi_install_banner_dismissed';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch (error) {
      console.warn('Could not read the install banner preference:', error);
      return false;
    }
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installError, setInstallError] = useState(false);

  if (isInstalled || dismissed || (!isInstallable && !isIOS)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, 'true');
    } catch (error) {
      console.warn('Could not save the install banner preference:', error);
    }
  };

  const handleInstall = async () => {
    if (!isInstallable) {
      setShowIOSGuide(true);
      return;
    }
    setInstallError(false);
    try {
      await install();
    } catch {
      setInstallError(true);
    }
  };

  return (
    <>
      <aside
        dir="rtl"
        aria-label="تثبيت تطبيق مُتَابِع"
        className="fixed bottom-4 inset-x-3 z-50 animate-in slide-in-from-bottom-5 duration-300 sm:inset-x-auto sm:start-4 sm:max-w-sm"
      >
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-white/95 p-3 text-right shadow-xl backdrop-blur-md dark:border-emerald-500/20 dark:bg-slate-900/95">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black leading-tight text-slate-900 dark:text-white">
                تثبيت تطبيق مُتَابِـع
              </h2>
              <p className="mt-0.5 truncate text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                {installError
                  ? 'تعذر فتح نافذة التثبيت، حاول مرة أخرى.'
                  : 'نزّل التطبيق على هاتفك وافتحه من الشاشة الرئيسية'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleInstall}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
            >
              <ArrowDownToLine className="h-3.5 w-3.5 stroke-[2.5]" />
              تثبيت
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="إغلاق تنبيه التثبيت"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {showIOSGuide && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[60] flex animate-in items-center justify-center bg-black/60 p-4 text-right backdrop-blur-sm fade-in"
          onClick={() => setShowIOSGuide(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <header className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 id="ios-install-title" className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                تثبيت التطبيق على الآيفون والآيباد
              </h2>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="إغلاق"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <ol className="list-inside list-decimal space-y-3 text-xs font-medium leading-6 text-slate-600 dark:text-slate-300">
              <li>في Safari اضغط زر المشاركة أسفل الشاشة.</li>
              <li>اختر «إضافة إلى الشاشة الرئيسية».</li>
              <li>اضغط «إضافة» ليظهر التطبيق على هاتفك.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              فهمت، شكرًا
            </button>
          </section>
        </div>
      )}
    </>
  );
}
