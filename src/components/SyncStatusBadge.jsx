import React, { useState, useEffect } from 'react';
import {
  getOfflineQueue,
  getOfflinePackageStatus,
  syncPendingOfflineData,
} from '../lib/offlineSync.js';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CheckCircle2,
  DownloadCloud,
} from 'lucide-react';

export function SyncStatusBadge({ onOpenOfflineModal }) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);
  const [packageStatus, setPackageStatus] = useState(getOfflinePackageStatus);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const res = await syncPendingOfflineData();
      setPendingCount(res.pending);
      if (res.synced > 0) {
        setSyncToast(`تم رفع ${res.synced} عبادة للسحابة ✓`);
        setTimeout(() => setSyncToast(null), 4000);
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
      if (e.detail?.syncedCount > 0) {
        setSyncToast(`تم رفع ${e.detail.syncedCount} عبادة للسحابة ✓`);
        setTimeout(() => setSyncToast(null), 4000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('mutabi_offline_queue_update', handleQueueUpdate);
    window.addEventListener('mutabi_sync_status', handleSyncStatus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mutabi_offline_queue_update', handleQueueUpdate);
      window.removeEventListener('mutabi_sync_status', handleSyncStatus);
    };
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {/* Toast popup when synced */}
      {syncToast && (
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{syncToast}</span>
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
          onClick={() => syncPendingOfflineData()}
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
        title="إدارة حزمة العمل بدون إنترنت والمزامنة السحابية"
      >
        <DownloadCloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden md:inline">
          {packageStatus.isReady ? 'بيانات الأوفلاين ✓' : 'تحميل الأوفلاين'}
        </span>
      </button>
    </div>
  );
}
