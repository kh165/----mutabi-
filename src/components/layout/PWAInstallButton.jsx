import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall.js';
import { Download, Smartphone, X, Check } from 'lucide-react';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA on the phone, don't show prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop Install Flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all shrink-0"
        title="تثبيت مُتَابِـع كتطبيق على هاتفك"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>تثبيت</span>
      </button>
    );
  }

  // iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shrink-0"
          title="تثبيت التطبيق على آيفون"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>تثبيت</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in text-right">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-600" />
                  <span>تثبيت مُتَابِـع على الآيفون والآيباد</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <span>اضغط على زر <strong>المشاركة (Share ⎋)</strong> في أسفل متصفح Safari.</span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <span>مرر للأسفل واضغط على <strong>«إضافة إلى الشاشة الرئيسية (Add to Home Screen)»</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <span>اضغط <strong>إضافة (Add)</strong> بالأعلى ليظهر التطبيق في شاشتك كأي تطبيق نظامي!</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
              >
                فهمت، شكراً
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
