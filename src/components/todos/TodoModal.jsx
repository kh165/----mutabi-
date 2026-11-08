import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Folder,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { TODO_CATEGORIES, PRIORITY_CONFIG } from '../../hooks/useTodos.js';

export function TodoModal({ isOpen, onClose, onSave, initialTodo = null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('worship');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [isStarred, setIsStarred] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTodo) {
      setTitle(initialTodo.title || '');
      setDescription(initialTodo.description || '');
      setCategory(initialTodo.category || 'personal');
      setPriority(initialTodo.priority || 'medium');
      setDueDate(initialTodo.dueDate || '');
      setDueTime(initialTodo.dueTime || '');
      setIsStarred(Boolean(initialTodo.isStarred));
      setSubtasks(initialTodo.subtasks ? [...initialTodo.subtasks] : []);
    } else {
      setTitle('');
      setDescription('');
      setCategory('worship');
      setPriority('medium');
      setDueDate('');
      setDueTime('');
      setIsStarred(false);
      setSubtasks([]);
    }
    setNewSubtaskInput('');
  }, [initialTodo, isOpen]);

  if (!isOpen) return null;

  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: newSubtaskInput.trim(),
        completed: false,
      },
    ]);
    setNewSubtaskInput('');
  };

  const handleRemoveSubtask = (subId) => {
    setSubtasks(subtasks.filter((s) => s.id !== subId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        dueDate,
        dueTime,
        isStarred,
        subtasks,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper quick date setters
  const setQuickDate = (type) => {
    const today = new Date();
    if (type === 'today') {
      setDueDate(today.toISOString().split('T')[0]);
    } else if (type === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 86400000);
      setDueDate(tomorrow.toISOString().split('T')[0]);
    } else if (type === 'nextWeek') {
      const nextWeek = new Date(Date.now() + 7 * 86400000);
      setDueDate(nextWeek.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStarred(!isStarred)}
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                isStarred ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
              }`}
              title="تمييز المهمة بنجمة"
            >
              <Star className={`w-5 h-5 ${isStarred ? 'fill-amber-500' : ''}`} />
            </button>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {initialTodo ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان المهمة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: قراءة ورد سورة البقرة، إنهاء تقرير العمل..."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات أو تفاصيل إضافية
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل، روابط، أو تذكير مهم..."
              className="w-full px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              التصنيف
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TODO_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    category === cat.id
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الأولوية
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setPriority(key)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    priority === key
                      ? `${cfg.color} ring-2 ring-emerald-500`
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.badgeColor}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Time */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              موعد الإنجاز (اختياري)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => setQuickDate('today')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
              >
                اليوم
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('tomorrow')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 cursor-pointer"
              >
                غداً
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('nextWeek')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 cursor-pointer"
              >
                خلال أسبوع
              </button>
              {dueDate && (
                <button
                  type="button"
                  onClick={() => {
                    setDueDate('');
                    setDueTime('');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  مسح التاريخ
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="relative">
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Subtasks Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              المهام الفرعية أو الخطوات ({subtasks.length})
            </label>

            {/* List of current subtasks */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2.5 max-h-36 overflow-y-auto">
                {subtasks.map((sub, idx) => (
                  <div
                    key={sub.id || idx}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                  >
                    <span className="text-xs text-slate-800 dark:text-slate-200 truncate">
                      {idx + 1}. {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(sub.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="أضف خطوة فرعية واضغط Enter..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة
              </button>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {initialTodo ? 'حفظ التعديلات' : 'إضافة المهمة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TodoModal;
