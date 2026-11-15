import React, { useEffect, useState } from 'react';

export function UpdateBanner() {
  const [updateSW, setUpdateSW] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleNeedRefresh = (event) => {
      setUpdateSW(() => event.detail?.updateSW || null);
      setVisible(true);
    };
    window.addEventListener('mutabi:pwa-update', handleNeedRefresh);
    return () => window.removeEventListener('mutabi:pwa-update', handleNeedRefresh);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-[70] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-white p-3 text-right shadow-2xl dark:border-emerald-800 dark:bg-slate-900 md:bottom-5">
      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">يوجد تحديث جديد للتطبيق</p>
      <button
        type="button"
        onClick={() => {
          if (updateSW) updateSW(true);
          setVisible(false);
        }}
        className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
      >
        تحديث الآن
      </button>
    </div>
  );
}
