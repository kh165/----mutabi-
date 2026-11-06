import React, { useState } from 'react';
import { Activity, ActivityLog } from '../../types';
import { Check, AlertCircle, MessageSquare, RotateCcw } from 'lucide-react';

interface ChecklistInputProps {
  activity: Activity;
  currentLog?: ActivityLog;
  onSave: (amount: number, completed: boolean, details: any, note: string) => Promise<void>;
  onReset?: () => Promise<void>;
  onClose: () => void;
}

interface ItemState {
  id: string;
  title: string;
  completed: boolean;
  note: string;
}

export function ChecklistInput({
  activity,
  currentLog,
  onSave,
  onClose,
}: ChecklistInputProps) {
  const existingChecklist = currentLog?.details?.checklist || {};

  const initialItems: ItemState[] = (
    activity.subItems && activity.subItems.length > 0
      ? activity.subItems
      : [
          { id: '1', title: 'البند الأول' },
          { id: '2', title: 'البند الثاني' },
        ]
  ).map((item) => {
    const existing = existingChecklist[item.id];
    return {
      id: item.id,
      title: item.title,
      completed: existing ? existing.completed : false,
      note: existing?.note || '',
    };
  });

  const [items, setItems] = useState<ItemState[]>(initialItems);
  const [dayNote, setDayNote] = useState<string>(currentLog?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
    );
  };

  const setItemNote = (id: string, noteText: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, note: noteText } : it))
    );
  };

  const completedCount = items.filter((it) => it.completed).length;
  const totalCount = items.length;
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const checklistDetails: Record<
        string,
        { id: string; title: string; completed: boolean; note: string }
      > = {};

      items.forEach((it) => {
        checklistDetails[it.id] = {
          id: it.id,
          title: it.title,
          completed: it.completed,
          note: it.note.trim(),
        };
      });

      await onSave(
        completedCount,
        isAllCompleted,
        { checklist: checklistDetails },
        dayNote.trim()
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ القائمة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      {/* Progress Header */}
      <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-900 block">
            {activity.title}
          </span>
          <span className="text-[11px] text-emerald-700">
            أُنجز {completedCount} من {totalCount} بنود
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-24 bg-emerald-200/60 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs font-extrabold text-emerald-800">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto ps-0.5 pe-1">
        {items.map((item) => {
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.completed
                  ? 'bg-emerald-50/50 border-emerald-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                onClick={() => toggleItem(item.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-300'
                    }`}
                  >
                    {item.completed && <Check className="w-4 h-4" />}
                  </div>
                  <span
                    className={`font-bold text-xs sm:text-sm ${
                      item.completed
                        ? 'text-emerald-900 line-through opacity-85'
                        : 'text-slate-800'
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {item.completed ? 'أُنجز ✓' : 'لم يُنجز'}
                </span>
              </div>

              {/* Note / reason */}
              <div className="mt-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-slate-400" />
                  <label className="text-[10px] text-slate-500 font-medium">
                    {item.completed ? 'ملاحظة (اختياري):' : 'سبب عدم الإنجاز (اختياري):'}
                  </label>
                </div>
                <input
                  type="text"
                  placeholder={
                    item.completed
                      ? 'أي تعليق أو فائدة...'
                      : 'سبب عدم إنجاز هذا البند...'
                  }
                  value={item.note}
                  onChange={(e) => setItemNote(item.id, e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* General Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          ملاحظة عامة (اختياري)
        </label>
        <input
          type="text"
          placeholder="أي ملحوظة لليوم..."
          value={dayNote}
          onChange={(e) => setDayNote(e.target.value)}
          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-2 flex-wrap sm:flex-nowrap">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{saving ? 'جارٍ الحفظ...' : 'حفظ القائمة والملاحظات'}</span>
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
            title="إلغاء تسجيل هذه القائمة والبدء من جديد"
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
