import React, { useState } from 'react';
import { Check, AlertCircle, RotateCcw } from 'lucide-react';

export function CustomInput({
  activity,
  currentLog,
  onSave,
  onReset,
  onClose,
}) {
  const isCheckbox = activity.inputMode === 'checkbox';
  const [checked, setChecked] = useState(currentLog?.completed || false);
  const [amount, setAmount] = useState(
    currentLog?.amount != null ? currentLog.amount : activity.dailyTarget || 1
  );
  const [note, setNote] = useState(currentLog?.note || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const getUnitLabel = (unit) => {
    switch (unit) {
      case 'minute': return 'دقيقة';
      case 'page': return 'صفحة';
      case 'ayah': return 'آية';
      case 'video': return 'فيديو';
      case 'time': return 'مرة';
      default: return 'مرات';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalAmount = isCheckbox ? (checked ? 1 : 0) : Math.max(0, amount);
      const isCompleted = isCheckbox
        ? checked
        : finalAmount >= (activity.dailyTarget || 1);

      await onSave(finalAmount, isCompleted, {}, note.trim());
      onClose();
    } catch (err) {
      setError(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      {isCheckbox ? (
        <div
          onClick={() => setChecked(!checked)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 select-none ${
            checked
              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                checked
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'border-2 border-slate-300 dark:border-slate-600'
              }`}
            >
              {checked && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {checked ? 'تم إنجاز هذا النشاط اليوم بحمد الله ✓' : 'اضغط للتعليم كمنجز'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activity.title} {activity.dailyTarget ? `(المطلوب: ${activity.dailyTarget} ${getUnitLabel(activity.unit)})` : ''}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            الكمية المنجزة اليوم ({getUnitLabel(activity.unit)})
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAmount(Math.max(0, amount - 1))}
              className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-all shadow-2xs"
            >
              -
            </button>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center text-xl font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setAmount(amount + 1)}
              className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl text-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-all shadow-2xs"
            >
              +
            </button>
          </div>
          {activity.dailyTarget > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-left">
              الهدف المطلوب: {activity.dailyTarget} {getUnitLabel(activity.unit)}
            </p>
          )}
        </div>
      )}

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          ملاحظة شخصية (اختياري)
        </label>
        <input
          type="text"
          placeholder="اكتب ملاحظة حول إنجازك اليوم..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        {onReset && currentLog && (
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة التعيين</span>
          </button>
        )}
        <div className="flex items-center gap-2 ms-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
