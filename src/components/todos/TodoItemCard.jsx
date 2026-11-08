import React, { useState } from 'react';
import {
  Check,
  Star,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { PRIORITY_CONFIG, TODO_CATEGORIES } from '../../hooks/useTodos.js';

export function TodoItemCard({
  todo,
  onToggle,
  onToggleStar,
  onDelete,
  onEdit,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const priority = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
  const category = TODO_CATEGORIES.find((c) => c.id === todo.category) || TODO_CATEGORIES[0];
  const subtasks = todo.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;

  // Format due date relative label
  const getDueDateLabel = () => {
    if (!todo.dueDate) return null;
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    let isOverdue = false;
    let label = todo.dueDate;

    if (todo.dueDate === today) {
      label = 'اليوم';
    } else if (todo.dueDate === tomorrow) {
      label = 'غداً';
    } else if (todo.dueDate < today && !todo.completed) {
      isOverdue = true;
      label = `متأخر (${todo.dueDate})`;
    }

    return { label, isOverdue };
  };

  const dueInfo = getDueDateLabel();

  const handleCreateSubtask = (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    onAddSubtask(todo.id, newSubtaskTitle);
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);
  };

  return (
    <div
      className={`group relative rounded-3xl border transition-all duration-200 p-4 sm:p-5 ${
        todo.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
          : todo.isStarred
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60 shadow-2xs'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Custom Animated Checkbox */}
        <button
          type="button"
          onClick={() => onToggle(todo.id, todo.completed)}
          aria-label={todo.completed ? 'تعيين كغير منجز' : 'تعيين كمنجز'}
          className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer mt-0.5 ${
            todo.completed
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-transparent hover:text-emerald-500'
          }`}
        >
          <Check className={`w-4 h-4 stroke-[3] transition-transform ${todo.completed ? 'scale-100' : 'scale-75 opacity-0'}`} />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3
              onClick={() => onToggle(todo.id, todo.completed)}
              className={`text-sm sm:text-base font-bold cursor-pointer transition-all ${
                todo.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {todo.title}
            </h3>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Star toggle */}
              <button
                type="button"
                onClick={() => onToggleStar(todo.id, todo.isStarred)}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  todo.isStarred
                    ? 'text-amber-500 hover:text-amber-600'
                    : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                }`}
                title={todo.isStarred ? 'إزالة من المميزة' : 'تمييز بنجمة'}
              >
                <Star className={`w-4 h-4 ${todo.isStarred ? 'fill-amber-500' : ''}`} />
              </button>

              {/* Edit button */}
              <button
                type="button"
                onClick={() => onEdit(todo)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100"
                title="تعديل المهمة"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => onDelete(todo.id)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100"
                title="حذف المهمة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description if present */}
          {todo.description && (
            <p className={`mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 ${todo.completed ? 'line-through' : ''}`}>
              {todo.description}
            </p>
          )}

          {/* Metadata badges: Category, Priority, Due Date, Subtask Count */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5">
            {/* Category */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              <Folder className="w-3 h-3 text-slate-400" />
              {category.label}
            </span>

            {/* Priority */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${priority.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.badgeColor}`} />
              {priority.label}
            </span>

            {/* Due Date */}
            {dueInfo && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${
                  dueInfo.isOverdue
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {dueInfo.isOverdue ? <AlertCircle className="w-3 h-3 text-rose-500" /> : <Calendar className="w-3 h-3 text-emerald-600" />}
                {dueInfo.label}
                {todo.dueTime && <span className="text-[10px] text-slate-400 dark:text-slate-500">({todo.dueTime})</span>}
              </span>
            )}

            {/* Subtasks Progress pill */}
            {subtasks.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <span>المهام الفرعية: {completedSubtasks}/{subtasks.length}</span>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Subtasks Expanded Checklist */}
          {expanded && subtasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              {/* Mini progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0}%` }}
                />
              </div>

              {subtasks.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-2 py-0.5">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={Boolean(sub.completed)}
                      onChange={() => onToggleSubtask(todo.id, sub.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                    />
                    <span className={`text-xs ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {sub.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onDeleteSubtask(todo.id, sub.id)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                    title="حذف المهمة الفرعية"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* Add subtask inline */}
              {isAddingSubtask ? (
                <form onSubmit={handleCreateSubtask} className="flex items-center gap-1.5 mt-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="مهمة فرعية جديدة..."
                    className="flex-1 px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingSubtask(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingSubtask(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer pt-1"
                >
                  <Plus className="w-3 h-3" />
                  إضافة خطوة فرعية
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TodoItemCard;
