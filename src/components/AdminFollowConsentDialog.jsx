import React, { useState } from 'react';
import { Eye, EyeOff, Heart, Loader2 } from 'lucide-react';

export function AdminFollowConsentDialog({ onChoose }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const choose = async (consent) => {
    setSaving(true);
    setError(null);
    try {
      await onChoose(consent);
    } catch (saveError) {
      console.error('Failed to save admin follow consent:', saveError);
      setError('تعذر حفظ اختيارك. تحقق من اتصالك وحاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-follow-consent-title"
        className="w-full max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-right shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-8"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Heart className="h-7 w-7" />
        </div>
        <div className="space-y-2 text-center">
          <h2 id="admin-follow-consent-title" className="text-xl font-black text-slate-900 dark:text-white">
            هل ترغب أن يتابع المشرف تقدمك؟
          </h2>
          <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
            بموافقتك، سيتمكن المشرف من الاطلاع على ملفك وسجلات عباداتك وتقدمك لمساعدتك. يمكنك سحب
            الموافقة في أي وقت من الملف الشخصي، وعند الرفض لن تظهر بيانات متابعتك للمشرف.
          </p>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => choose(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            موافق، تابعني
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => choose(false)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <EyeOff className="h-4 w-4" />
            لا، أفضل الخصوصية
          </button>
        </div>
      </section>
    </div>
  );
}
