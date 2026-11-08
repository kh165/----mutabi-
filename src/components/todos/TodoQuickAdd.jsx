import React, { useState } from 'react';
import { Plus, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { TODO_CATEGORIES, PRIORITY_CONFIG } from '../../hooks/useTodos.js';

export function TodoQuickAdd({ onAdd, onOpenFullModal }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('worship');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await onAdd({
        title: title.trim(),
        category,
        priority,
      });
      setTitle('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="اكتب مهمة جديدة ثم اضغط Enter (مثال: أذكار المساء، مراجعة ربع، مذاكرة درس)..."
            className="flex-1 px-4 py-2.5 sm:py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">إضافة</span>
          </button>
        </div>

        {/* Quick selectors bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Quick Category Dropdown/Pills */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] sm:text-xs border-0 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {TODO_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Quick Priority Dropdown */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px] sm:text-xs border-0 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Add button */}
          <button
            type="button"
            onClick={onOpenFullModal}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            خيارات إضافية (تاريخ، خطوات فرعية، تفاصيل)
          </button>
        </div>
      </form>
    </div>
  );
}

export default TodoQuickAdd;
