import React, { useState, useEffect } from 'react';
import {
  getOfflineQueue,
  getOfflinePackageStatus,
  syncPendingOfflineData,
} from '../lib/offlineSync.js';
import {
  WifiOff,
  RefreshCw,
  CheckCircle2,
  DownloadCloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function SyncStatusBadge({ onOpenOfflineModal }) {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);
  const [packageStatus, setPackageStatus] = useState(getOfflinePackageStatus);

  const showSyncResult = (result) => {
    if (result.failed > 0) {
      setSyncToast({
        message: `تعذر رفع ${result.failed} عملية. تحقق من الاتصال أو صلاحيات الحساب.`,
        isError: true,
      });
    } else if (result.pending > 0) {
      setSyncToast({
        message: `ما زالت ${result.pending} عملية بانتظار الرفع.`,
        isError: true,
      });
    } else if (result.synced > 0) {
      setSyncToast({ message: `تم رفع ${result.synced} عملية للسحابة ✓`, isError: false });
    }
    if (result.synced > 0 || result.failed > 0 || result.pending > 0) {
      setTimeout(() => setSyncToast(null), 6000);
    }
  };

  useEffect(() => {
    if (!user?.uid || !navigator.onLine) return;
    syncPendingOfflineData()
      .then(showSyncResult)
      .catch((error) => {
        console.error('Initial offline sync failed:', error);
        setSyncToast({ message: 'تعذرت المزامنة. حاول مرة أخرى.', isError: true });
      });
  }, [user?.uid]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const res = await syncPendingOfflineData();
        setPendingCount(res.pending);
        showSyncResult(res);
      } catch (error) {
        console.error('Automatic offline sync failed:', error);
        setSyncToast({ message: 'تعذرت المزامنة. حاول مرة أخرى.', isError: true });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdate = (e) => {
      setPendingCount(e.detail?.pendingCount ?? getOfflineQueue().length);
    };

    const handleSyncStatus = (e) => {
      setIsSyncing(e.detail?.isSyncing ?? false);
      if (typeof e.detail?.pendingCount === 'number') {
        setPendingCount(e.detail.pendingCount);
      }
      if (!e.detail?.isSyncing) {
        showSyncResult({
          synced: e.detail?.syncedCount || 0,
          pending: e.detail?.pendingCount || 0,
          failed: e.detail?.failedCount || 0,
        });
      }
    };

    const handlePackageStatus = (e) => {
      setPackageStatus(e.detail || getOfflinePackageStatus());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('mutabi_offline_queue_update', handleQueueUpdate);
    window.addEventListener('mutabi_sync_status', handleSyncStatus);
    window.addEventListener('mutabi_offline_package_status', handlePackageStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mutabi_offline_queue_update', handleQueueUpdate);
      window.removeEventListener('mutabi_sync_status', handleSyncStatus);
      window.removeEventListener('mutabi_offline_package_status', handlePackageStatus);
    };
  }, []);

  const handleManualSync = async () => {
    try {
      const result = await syncPendingOfflineData();
      setPendingCount(result.pending);
      showSyncResult(result);
    } catch (error) {
      console.error('Manual offline sync failed:', error);
      setSyncToast({ message: 'تعذرت المزامنة. حاول مرة أخرى.', isError: true });
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Toast popup when synced */}
      {syncToast && (
        <span
          title={syncToast.message}
          className={`inline-flex items-center gap-1 px-2 py-1 sm:px-2.5 rounded-full text-[10px] sm:text-[11px] font-bold text-white shadow-sm animate-in fade-in ${syncToast.isError ? 'bg-rose-600' : 'bg-emerald-600'}`}
        >
          {!syncToast.isError && <CheckCircle2 className="w-3.5 h-3.5" />}
          <span className="sm:hidden">{syncToast.isError ? 'تعذر الرفع' : 'تم الرفع'}</span>
          <span className="hidden sm:inline">{syncToast.message}</span>
        </span>
      )}

      {/* Offline Alert Badge */}
      {!isOnline && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs"
          title="أنت تعمل الآن بدون إنترنت. يتم حفظ جميع عباداتك محلياً وستُرفع تلقائياً للسحابة فور عودة الاتصال."
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="hidden sm:inline">أوفلاين (حفظ محلي)</span>
          <span className="sm:hidden text-[10px]">أوفلاين</span>
          {pendingCount > 0 && (
            <span className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px] px-1.5 rounded-full font-black">
              {pendingCount}
            </span>
          )}
        </div>
      )}

      {/* Syncing in progress indicator */}
      {isOnline && isSyncing && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 shadow-2xs">
          <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin shrink-0" />
          <span className="text-[11px]">جارٍ المزامنة...</span>
        </div>
      )}

      {/* Pending Items indicator (when online but pending queue remains) */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <button
          type="button"
          onClick={handleManualSync}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs cursor-pointer hover:bg-amber-100 transition"
          title="اضغط للمزامنة مع السحابة الآن"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px]">{pendingCount} بانتظار الرفع</span>
        </button>
      )}

      {/* Offline Package Manager Button */}
      <button
        type="button"
        onClick={onOpenOfflineModal}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs"
        title="اختر المحتوى الذي تريد تنزيله للاستخدام دون إنترنت"
      >
        <DownloadCloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden md:inline">
          {packageStatus.isDownloading
            ? `تنزيل الأوفلاين ${packageStatus.percent || 0}%`
            : packageStatus.isReady
              ? 'بيانات الأوفلاين ✓'
              : 'تنزيل أوفلاين'}
        </span>
      </button>
    </div>
  );
}
