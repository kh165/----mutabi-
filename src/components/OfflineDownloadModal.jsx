import React, { useState, useEffect } from 'react';
import {
  downloadOfflinePackage,
  getOfflinePackageStatus,
  getOfflineStorageEstimate,
  deleteOfflinePackage,
  syncPendingOfflineData,
  getOfflineQueue,
} from '../lib/offlineSync.js';
import {
  DownloadCloud,
  CheckCircle2,
  X,
  HardDrive,
  RefreshCw,
  BookOpen,
  Image,
  Music2,
  Trash2,
} from 'lucide-react';
import { formatArabicDate } from '../lib/dates.js';

const TIER_ORDER = ['basic', 'reading', 'complete'];

export function OfflineDownloadModal({ isOpen, onClose }) {
  const [status, setStatus] = useState(getOfflinePackageStatus);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, title: '' });
  const [isSuccess, setIsSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [selectedTier, setSelectedTier] = useState('basic');
  const [storageEstimate, setStorageEstimate] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const selectedTierReady =
    TIER_ORDER.indexOf(status.downloadedTier) >= TIER_ORDER.indexOf(selectedTier);

  useEffect(() => {
    if (isOpen) {
      const currentStatus = getOfflinePackageStatus();
      setStatus(currentStatus);
      setSelectedTier(currentStatus.downloadedTier || currentStatus.selectedTier || 'basic');
      setPendingCount(getOfflineQueue().length);
      setDownloading(Boolean(currentStatus.isDownloading));
      setProgress({
        percent: currentStatus.percent || 0,
        title: currentStatus.title || '',
      });
      setIsSuccess(Boolean(currentStatus.isReady));
      setDownloadError(currentStatus.error || null);
      setDeleteError(null);
      getOfflineStorageEstimate()
        .then((estimate) => {
          setStorageEstimate(estimate);
          setStorageError(null);
        })
        .catch((error) => {
          console.warn('Could not estimate offline storage:', error);
          setStorageEstimate(null);
          setStorageError('تعذر قراءة تقدير مساحة التخزين على هذا الجهاز.');
        });
    }
  }, [isOpen]);

  useEffect(() => {
    const updatePendingCount = (event) => {
      setPendingCount(event.detail?.pendingCount ?? getOfflineQueue().length);
    };
    window.addEventListener('mutabi_offline_queue_update', updatePendingCount);
    window.addEventListener('mutabi_sync_status', updatePendingCount);
    return () => {
      window.removeEventListener('mutabi_offline_queue_update', updatePendingCount);
      window.removeEventListener('mutabi_sync_status', updatePendingCount);
    };
  }, []);

  useEffect(() => {
    const handlePackageStatus = (event) => {
      const nextStatus = event.detail;
      setStatus(nextStatus);
      if (nextStatus.selectedTier) setSelectedTier(nextStatus.selectedTier);
      setDownloading(Boolean(nextStatus.isDownloading));
      setProgress({ percent: nextStatus.percent || 0, title: nextStatus.title || '' });
      setIsSuccess(Boolean(nextStatus.isReady));
      setDownloadError(nextStatus.error || null);
    };

    window.addEventListener('mutabi_offline_package_status', handlePackageStatus);
    return () => window.removeEventListener('mutabi_offline_package_status', handlePackageStatus);
  }, []);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    if (selectedTier === 'complete' && navigator.onLine) {
      const confirmed = window.confirm(
        'الحزمة الكاملة تشمل آلاف الملفات الصوتية وقد تتجاوز 1 جيجابايت. يُفضّل الاتصال بشبكة Wi-Fi. هل تريد المتابعة؟',
      );
      if (!confirmed) return;
    }

    setDownloading(true);
    setIsSuccess(false);
    setDownloadError(null);
    try {
      const res = await downloadOfflinePackage(selectedTier, (p) => {
        setProgress(p);
      });
      setStatus(res);
      setIsSuccess(true);
      setStorageEstimate(await getOfflineStorageEstimate());
    } catch (e) {
      console.error('Download package error', e);
      setDownloadError(e?.message || 'تعذر إكمال تنزيل المحتوى.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteDownloads = async () => {
    if (
      !window.confirm(
        'سيتم حذف القرآن والتفاسير والحديث والصور والصوتيات المحفوظة فقط. سيبقى حسابك وتقدمك وقائمة المزامنة كما هي. متابعة؟',
      )
    ) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const nextStatus = await deleteOfflinePackage();
      setStatus(nextStatus);
      setSelectedTier('basic');
      setIsSuccess(false);
      setProgress({ percent: 0, title: '' });
      setStorageEstimate(await getOfflineStorageEstimate());
    } catch (error) {
      console.error('Could not delete offline downloads:', error);
      setDeleteError(error?.message || 'تعذر حذف المحتوى المحفوظ.');
    } finally {
      setDeleting(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return 'غير متاح';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    setSyncError(null);
    try {
      const res = await syncPendingOfflineData();
      setPendingCount(res.pending);
      if (res.synced > 0) {
        setSyncSuccessMsg(`تمت مزامنة ${res.synced} عملية بنجاح مع السحابة!`);
        setTimeout(() => setSyncSuccessMsg(null), 4000);
      }
      if (res.pending > 0) {
        setSyncError(
          `تعذر رفع ${res.failed || res.pending} عملية. ما زالت ${res.pending} عملية في قائمة الانتظار؛ تحقق من الاتصال وصلاحيات حسابك.`
        );
      }
    } catch (error) {
      console.error('Manual offline sync failed:', error);
      setSyncError(error?.message || 'تعذرت مزامنة البيانات المعلقة.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <DownloadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="flex flex-wrap items-center gap-2 text-base font-black text-slate-900 dark:text-white sm:text-lg">
                <span>العمل بدون إنترنت</span>
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
            className={`space-y-2 rounded-2xl border p-4 text-xs leading-relaxed ${
              selectedTierReady
                ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              {selectedTierReady ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>المحتوى المحدد جاهز للعمل دون اتصال</span>
                </>
              ) : (
                <>
                  <HardDrive className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    {status.downloadedTier
                      ? 'يمكنك استكمال الحزمة أو توسيعها'
                      : 'اختر المحتوى الذي تريد حفظه على جهازك'}
                  </span>
                </>
              )}
            </div>
            {status.lastDownload && (
              <p className="text-[11px] opacity-80">
                آخر تنزيل مكتمل: {formatArabicDate(status.lastDownload, true)}.
              </p>
            )}
            <p className="opacity-90">
              يبدأ التنزيل فقط بعد اختيارك. الملفات التي اكتمل تنزيلها تبقى محفوظة، ويُستكمل التنزيل من حيث توقف عند انقطاع الإنترنت.
            </p>
          </div>

          <section aria-labelledby="offline-package-options" className="space-y-2.5">
            <h4 id="offline-package-options" className="text-sm font-bold text-slate-800 dark:text-slate-100">
              اختر حجم المحتوى
            </h4>
            <div className="grid gap-2">
              {[
                {
                  id: 'basic',
                  title: 'الأساسي',
                  size: 'تقديرًا: بضعة ميجابايت',
                  description: 'نص القرآن وتقسيم صفحاته والتفسير والأذكار.',
                  icon: BookOpen,
                },
                {
                  id: 'reading',
                  title: 'مكتبة القراءة',
                  size: 'تقديرًا: عشرات إلى مئات الميجابايت',
                  description: 'الأساسي، وكتب الحديث كاملة وصور صفحات المصحف.',
                  icon: Image,
                },
                {
                  id: 'complete',
                  title: 'الحزمة الكاملة بالصوتيات',
                  size: 'قد تتجاوز 1 جيجابايت',
                  description: 'كل ما سبق وتلاوات السور والآيات. استخدم Wi-Fi ومساحة تخزين كافية.',
                  icon: Music2,
                },
              ].map((option) => {
                const Icon = option.icon;
                const selected = selectedTier === option.id;
                const downloaded = TIER_ORDER.indexOf(option.id) <=
                  TIER_ORDER.indexOf(status.downloadedTier);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500 dark:bg-emerald-950/30'
                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                    } ${downloading || deleting ? 'pointer-events-none opacity-70' : ''}`}
                  >
                    <input
                      type="radio"
                      name="offline-package-tier"
                      value={option.id}
                      checked={selected}
                      disabled={downloading || deleting}
                      onChange={() => {
                        setSelectedTier(option.id);
                        setStatus({
                          ...status,
                          selectedTier: option.id,
                          isReady: TIER_ORDER.indexOf(status.downloadedTier) >= TIER_ORDER.indexOf(option.id),
                        });
                        setIsSuccess(false);
                        setDownloadError(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-emerald-600"
                    />
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <span className="font-bold text-slate-900 dark:text-white">{option.title}</span>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{option.size}</span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                      {downloaded && (
                        <span className="mt-1 block text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          محفوظة بالفعل
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              الأحجام تقريبية وتتغير حسب الجهاز والمتصفح ومصدر الملفات؛ المساحة المستخدمة أدناه تقدير المتصفح لكل بيانات الموقع.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-2 flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <HardDrive className="h-4 w-4 text-emerald-600" />
              مساحة تخزين الموقع على هذا الجهاز
            </div>
            {storageEstimate ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <span>المستخدمة: {formatBytes(storageEstimate.usage)}</span>
                <span>المسموح به تقريبًا: {formatBytes(storageEstimate.quota)}</span>
                {Number.isFinite(storageEstimate.quota) && Number.isFinite(storageEstimate.usage) && (
                  <span>المتبقي التقريبي: {formatBytes(Math.max(0, storageEstimate.quota - storageEstimate.usage))}</span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {storageError || 'المتصفح لا يوفر تقديرًا لمساحة التخزين.'}
              </p>
            )}
          </section>

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
            {syncError && (
              <p role="alert" className="rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {syncError}
              </p>
            )}
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

          {downloadError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-xs font-bold rounded-2xl border border-red-200 dark:border-red-900">
              تعذر إكمال التنزيل. أُبقيت الملفات التي اكتمل حفظها لاستكمالها لاحقاً. {downloadError}
            </div>
          )}

          {deleteError && (
            <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {deleteError}
            </p>
          )}

          {isSuccess && (
            <div className="p-3.5 bg-emerald-500 text-white text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in shadow-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>اكتمل تحميل بيانات المنصة بنجاح! يمكنك الآن استخدام التطبيق في أي مكان بدون اتصال بالإنترنت.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!navigator.onLine && !status.isReady && (
              <span className="w-full text-right text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                اتصل بالإنترنت لبدء التنزيل أو استكماله.
              </span>
            )}
            {status.downloadedTier && (
              <button
                type="button"
                disabled={downloading || deleting}
                onClick={handleDeleteDownloads}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                حذف التنزيلات
              </button>
            )}
            <button
              type="button"
              disabled={downloading || deleting || selectedTierReady || !navigator.onLine}
              onClick={handleStartDownload}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>جارٍ التحميل...</span>
                </>
              ) : selectedTierReady ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>الحزمة المحددة جاهزة</span>
                </>
              ) : (
                <>
                  <DownloadCloud className="h-4 w-4" />
                  <span>
                    {status.downloadedTier ? 'استكمال / توسيع التنزيل' : 'تنزيل الاختيار'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
