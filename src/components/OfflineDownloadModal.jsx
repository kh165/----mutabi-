import React, { useState, useEffect } from 'react';
import {
  downloadOfflinePackage,
  getOfflinePackageStatus,
  syncPendingOfflineData,
  getOfflineQueue,
} from '../lib/offlineSync.js';
import {
  DownloadCloud,
  CheckCircle2,
  X,
  HardDrive,
  Wifi,
  WifiOff,
  RefreshCw,
  BookOpen,
  SunMedium,
  Award,
  Calendar,
  Layers,
  Sparkles,
  CircleDot,
} from 'lucide-react';
import { formatArabicDate } from '../lib/dates.js';

export function OfflineDownloadModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(getOfflinePackageStatus);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, title: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(getOfflinePackageStatus());
      setPendingCount(getOfflineQueue().length);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    setDownloading(true);
    setIsSuccess(false);
    try {
      const res = await downloadOfflinePackage((p) => {
        setProgress(p);
      });
      setStatus(res);
      setIsSuccess(true);
    } catch (e) {
      console.error('Download package error', e);
    } finally {
      setDownloading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      const res = await syncPendingOfflineData();
      setPendingCount(res.pending);
      if (res.synced > 0) {
        setSyncSuccessMsg(`تمت مزامنة ${res.synced} عملية بنجاح مع السحابة!`);
        setTimeout(() => setSyncSuccessMsg(null), 4000);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>العمل بدون إنترنت (Offline Mode)</span>
                {status.isReady && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                    مفعّل وجاهز ✓
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تحميل بيانات المنصة والمزامنة التلقائية مع السحابة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 ${
              status.isReady
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {status.isReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>المنصة جاهزة تماماً للعمل بدون أي اتصال بالإنترنت</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>لم يتم تحميل حزمة البيانات المحلية بعد</span>
                </>
              )}
            </div>
            <p className="opacity-90">
              {status.isReady
                ? `تم تخزين نصوص القرآن الكريم كاملة، وحصن المسلم، والأربعين النووية، وجدول العبادات محلياً في جهازك. آخر تحديث: ${formatArabicDate(
                    status.lastDownload,
                    true
                  )}.`
                : 'اضغط على زر التحميل أدناه لتخزين كافة السور والأذكار والأحاديث محلياً في جهازك لتتمكن من تصفحها وتسجيل عباداتك في أي وقت حتى أثناء انقطاع الإنترنت.'}
            </p>
          </div>

          {/* Cloud Auto-Sync Notice */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  المزامنة التلقائية مع السحابة:
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                {pendingCount === 0 ? 'جميع العبادات متزامنة ✓' : `${pendingCount} عمليات بانتظار الرفع`}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              عند استخدامك للتطبيق بدون إنترنت، تُحفظ جميع صلواتك، وأورادك، وتسبيحاتك محلياً بشكل فوري، وبمجرد عودة اتصالك بالإنترنت، تُرْفَع كل البيانات تلقائياً وتُحفظ في حسابك بالسحابة دون أي تدخل منك.
            </p>

            {pendingCount > 0 && (
              <div className="pt-1 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={syncing || !navigator.onLine}
                  onClick={handleManualSync}
                  className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'جارٍ الرفع...' : 'مزامنة المعلق الآن'}</span>
                </button>
                {!navigator.onLine && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                    (أنت غير متصل حالياً - ستتم المزامنة تلقائياً عند الاتصال)
                  </span>
                )}
              </div>
            )}

            {syncSuccessMsg && (
              <div className="p-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>{syncSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Features Included in Offline Package */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
              البيانات والمحتويات التي يتم حفظها محلياً:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">القرآن الكريم كاملاً</p>
                  <p className="text-[11px] text-slate-400">114 سورة بالرسم العثماني</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-2.5">
                <SunMedium className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">حصن المسلم والأذكار</p>
                  <p className="text-[11px] text-slate-400">أذكار الصباح والمساء والسبحة</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-2.5">
                <Award className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">الأربعين النووية</p>
                  <p className="text-[11px] text-slate-400">42 حديثاً شريفاً مع الفوائد</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">سجل العبادات والصلوات</p>
                  <p className="text-[11px] text-slate-400">تسجيل وتعديل الأوراد أوفلاين</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar (during download) */}
          {downloading && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span>{progress.title || 'جارٍ تحميل البيانات...'}</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {isSuccess && (
            <div className="p-3.5 bg-emerald-500 text-white text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>اكتمل تحميل بيانات المنصة بنجاح! يمكنك الآن استخدام التطبيق في أي مكان بدون اتصال بالإنترنت.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={handleStartDownload}
            className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جارٍ التحميل والتثبيت...</span>
              </>
            ) : status.isReady ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>تحديث حزمة الأوفلاين</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>بدء تحميل البيانات الآن (2MB)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
