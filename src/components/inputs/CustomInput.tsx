import React, { useState } from 'react';
import { Activity, ActivityLog } from '../../types';
import { Check, AlertCircle, RotateCcw } from 'lucide-react';

interface CustomInputProps {
  activity: Activity;
  currentLog?: ActivityLog;
  onSave: (amount: number, completed: boolean, details: any, note: string) => Promise<void>;
  onReset?: () => Promise<void>;
  onClose: () => void;
}

export function CustomInput({
  activity,
  currentLog,
  onSave,
  onReset,
  onClose,
}: CustomInputProps) {
  const isCheckbox = activity.inputMode === 'checkbox';
  const [checked, setChecked] = useState<boolean>(currentLog?.completed || false);
  const [amount, setAmount] = useState<number>(
    currentLog?.amount != null ? currentLog.amount : activity.dailyTarget || 1
  );
  const [note, setNote] = useState<string>(currentLog?.note || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'minute': return 'دقيقة';
      case 'page': return 'صفحة';
      case 'ayah': return 'آية';
      case 'video': return 'فيديو';
      case 'time': return 'مرة';
      default: return 'مرات';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const finalAmount = isCheckbox ? (checked ? 1 : 0) : Math.max(0, amount);
      const isCompleted = isCheckbox
        ? checked
        : activity.dailyTarget > 0
        ? finalAmount >= activity.dailyTarget
        : finalAmount > 0;

      await onSave(finalAmount, isCompleted, {}, note.trim());
      onClose();
    } catch (err: any) {
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
          className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
            checked
              ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base">{activity.title}</span>
            <span className="text-xs text-slate-500 mt-0.5">
              {checked ? 'تم إنجاز هذا النشاط اليوم بحمد الله ✓' : 'اضغط للتعليم كمنجز'}
            </span>
          </div>

          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
              checked
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'border-2 border-slate-300 bg-white'
            }`}
          >
            {checked && <Check className="w-5 h-5 stroke-[2.5]" />}
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            الكمية المنجزة اليوم ({getUnitLabel(activity.unit)})
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAmount(Math.max(0, amount - 1))}
              className="w-12 h-12 bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all shadow-2xs"
            >
              -
            </button>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-center text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setAmount(amount + 1)}
              className="w-12 h-12 bg-slate-100 rounded-xl text-xl font-bold hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all shadow-2xs"
            >
              +
            </button>
          </div>

          {activity.dailyTarget > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              الهدف اليومي المحدد: {activity.dailyTarget} {getUnitLabel(activity.unit)}
            </p>
          )}
        </div>
      )}

      {/* Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          ملاحظة (اختياري)
        </label>
        <input
          type="text"
          placeholder="أي ملحوظة أو دعاء..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 flex-wrap sm:flex-nowrap">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'جارٍ الحفظ...' : 'تسجيل الإنجاز'}</span>
        </button>

        {currentLog && (currentLog.amount > 0 || currentLog.completed) && onReset && (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onReset();
                onClose();
              } finally {
                setSaving(false);
              }
            }}
            className="py-3 px-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            title="إلغاء تسجيل هذا الإنجاز والبدء من جديد"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>إلغاء التسجيل</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
