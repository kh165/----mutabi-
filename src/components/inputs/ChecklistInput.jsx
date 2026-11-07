import React, { useState } from 'react';
import { Check, AlertCircle, MessageSquare, RotateCcw } from 'lucide-react';

export function ChecklistInput({
  activity,
  currentLog,
  onSave,
  onReset,
  onClose,
}) {
  const existingChecklist = currentLog?.details?.checklist || {};
  const initialItems = (
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

  const [items, setItems] = useState(initialItems);
  const [dayNote, setDayNote] = useState(currentLog?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleItem = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, completed: !it.completed } : it))
    );
  };

  const setItemNote = (id, noteText) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, note: noteText } : it))
    );
  };

  const completedCount = items.filter((it) => it.completed).length;
  const totalCount = items.length;
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const checklistDetails = {};
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
    } catch (err) {
      setError(err?.message || 'حدث خطأ أثناء حفظ القائمة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      {/* Progress Header */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block">
            {activity.title}
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
            أُنجز {completedCount} من {totalCount} بنود
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-24 bg-emerald-200/60 dark:bg-emerald-900/60 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
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
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="flex items-center gap-3 text-right flex-1 select-none cursor-pointer"
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                    }`}
                  >
                    {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-sm font-semibold transition-all ${
                      item.completed
                        ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {item.title}
                  </span>
                </button>
              </div>

              {/* Note for the sub item */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-slate-400" />
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    ملاحظة خاصة بهذا البند (اختياري):
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="تدوين ملاحظة سريعة..."
                  value={item.note}
                  onChange={(e) => setItemNote(item.id, e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* General Day Reflection Note */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          ملاحظة عامة لليوم (اختياري)
        </label>
        <input
          type="text"
          placeholder="تدوين أو دعاء..."
          value={dayNote}
          onChange={(e) => setDayNote(e.target.value)}
          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة التعيين</span>
          </button>
        )}
        <div className="flex items-center gap-2 ms-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الإنجاز'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
