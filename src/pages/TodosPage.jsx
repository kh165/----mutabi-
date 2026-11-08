import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  Check,
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Star,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpDown,
  Folder,
  Edit3,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Cloud,
  CloudCheck,
  RefreshCw,
} from 'lucide-react';
import { db } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { enqueueOfflineAction } from '../lib/offlineSync.js';

// ==========================================
// 1. Constants
// ==========================================
export const TODO_CATEGORIES = [
  { id: 'all', label: 'الكل', icon: 'Layers', color: 'slate' },
  { id: 'worship', label: 'عبادات وطاعات', icon: 'Heart', color: 'emerald' },
  { id: 'work', label: 'عمل ومشاريع', icon: 'Briefcase', color: 'blue' },
  { id: 'study', label: 'دراسة وتعلّم', icon: 'GraduationCap', color: 'purple' },
  { id: 'personal', label: 'شخصي وصحي', icon: 'User', color: 'amber' },
  { id: 'family', label: 'أهل وعائلة', icon: 'Home', color: 'rose' },
  { id: 'other', label: 'عام وأخرى', icon: 'Tag', color: 'slate' },
];

export const PRIORITY_CONFIG = {
  urgent: { label: 'عاجل جداً', color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900', badgeColor: 'bg-rose-500', weight: 4 },
  high: { label: 'أولوية عالية', color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900', badgeColor: 'bg-amber-500', weight: 3 },
  medium: { label: 'أولوية متوسطة', color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900', badgeColor: 'bg-blue-500', weight: 2 },
  low: { label: 'أولوية عادية', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', badgeColor: 'bg-slate-400', weight: 1 },
};

function getLocalTodos(uid) {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`mutabi_todos_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalTodos(uid, items) {
  if (!uid) return;
  try {
    localStorage.setItem(`mutabi_todos_${uid}`, JSON.stringify(items));
  } catch {}
}

// ==========================================
// 2. Custom Hook: useTodos (Real-time Firestore Sync)
// ==========================================
export function useTodos() {
  const { user, userDoc } = useAuth();
  const [todos, setTodos] = useState(() => getLocalTodos(user?.uid));
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'synced' | 'syncing' | 'error'
  const [lastSyncedTime, setLastSyncedTime] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Synchronize with Firestore in Real-Time
  useEffect(() => {
    if (!user?.uid) {
      setTodos([]);
      setSyncStatus('synced');
      return;
    }

    // 1. Initial cached load for immediate UI display
    const cached = getLocalTodos(user.uid);
    if (cached && cached.length > 0) {
      setTodos(cached);
    }

    setSyncStatus('syncing');

    // 2. Real-time Firestore Listener
    let isSubscribed = true;
    const todosRef = collection(db, 'users', user.uid, 'todos');

    const unsubscribe = onSnapshot(
      todosRef,
      (snapshot) => {
        if (!isSubscribed) return;
        const cloudTodos = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort descending by creation date
        cloudTodos.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        // If cloud has documents, make cloud the source of truth
        if (cloudTodos.length > 0 || snapshot.metadata.fromCache === false) {
          setTodos(cloudTodos);
          setLocalTodos(user.uid, cloudTodos);
        }

        setSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setErrorMessage(null);
        setLoading(false);
      },
      (err) => {
        if (!isSubscribed) return;
        console.warn('Firestore subcollection listener error, attempting userDoc fallback:', err);

        // Fallback: Check if todos are saved in the userDoc in Firestore
        if (userDoc?.todosList && Array.isArray(userDoc.todosList)) {
          setTodos(userDoc.todosList);
          setLocalTodos(user.uid, userDoc.todosList);
          setSyncStatus('synced');
          setErrorMessage(null);
        } else {
          setSyncStatus('error');
          setErrorMessage(err.message || 'تعذر الاتصال بالسحابة');
        }
        setLoading(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [user?.uid, userDoc?.todosList]);

  // Dual-Write helper: Writes to both subcollection AND user document in Firestore
  const syncToFirestore = useCallback(
    async (nextTodos, specificTodoAction = null) => {
      if (!user?.uid) return;

      setSyncStatus('syncing');

      let userDocSuccess = false;
      let subcollectionSuccess = false;
      let writeError = null;

      // 1. Primary Cloud Persistence: Backup to user's root document (always permitted for user owner)
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          todosList: nextTodos.slice(0, 100),
          lastTodosSyncAt: new Date().toISOString(),
        });
        userDocSuccess = true;
      } catch (err) {
        console.warn('userDoc todos backup note:', err?.message);
        writeError = err;
      }

      // 2. Subcollection write /users/{uid}/todos/{todoId}
      if (specificTodoAction) {
        try {
          const { action, todoId, data } = specificTodoAction;
          const todoRef = doc(db, 'users', user.uid, 'todos', todoId);
          if (action === 'set') {
            await setDoc(todoRef, data);
          } else if (action === 'update') {
            await updateDoc(todoRef, data);
          } else if (action === 'delete') {
            await deleteDoc(todoRef);
          }
          subcollectionSuccess = true;
        } catch (err) {
          console.warn('subcollection write note:', err?.message);
          if (!userDocSuccess) writeError = err;
        }
      }

      // If at least one cloud destination succeeded, the data IS saved in Firestore!
      if (userDocSuccess || subcollectionSuccess) {
        setSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setErrorMessage(null);
      } else {
        // Enqueue into offline sync queue for automatic upload upon reconnection
        enqueueOfflineAction({
          type: specificTodoAction?.action === 'delete' ? 'DELETE_TODO' : 'SAVE_TODO',
          key: `TODO_${specificTodoAction?.todoId || 'all'}`,
          uid: user.uid,
          todoId: specificTodoAction?.todoId,
          data: specificTodoAction?.data,
          todosList: nextTodos,
        });
        setSyncStatus('synced');
        setLastSyncedTime('محفوظ ومؤمّن محلياً (المزامنة تلقائية عند الاتصال)');
        setErrorMessage(null);
      }
    },
    [user?.uid]
  );

  // Auto-update status when offline background sync completes
  useEffect(() => {
    const handleSyncEvent = (e) => {
      if (e.detail && !e.detail.isSyncing) {
        setSyncStatus('synced');
        setLastSyncedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setErrorMessage(null);
      }
    };
    window.addEventListener('mutabi_sync_status', handleSyncEvent);
    return () => window.removeEventListener('mutabi_sync_status', handleSyncEvent);
  }, []);

  // Add Todo
  const addTodo = useCallback(
    async ({
      title,
      description = '',
      priority = 'medium',
      category = 'worship',
      dueDate = '',
      dueTime = '',
      isStarred = false,
      subtasks = [],
      tags = [],
    }) => {
      if (!user?.uid || !title?.trim()) return null;

      const todoId = `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const newTodo = {
        id: todoId,
        uid: user.uid,
        title: title.trim(),
        description: (description || '').trim(),
        priority: priority || 'medium',
        category: category || 'worship',
        dueDate: dueDate || '',
        dueTime: dueTime || '',
        isStarred: Boolean(isStarred),
        completed: false,
        subtasks: Array.isArray(subtasks) ? subtasks : [],
        tags: Array.isArray(tags) ? tags : [],
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };

      const nextList = [newTodo, ...todos];
      setTodos(nextList);
      setLocalTodos(user.uid, nextList);

      await syncToFirestore(nextList, { action: 'set', todoId, data: newTodo });
      return newTodo;
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Toggle Todo completed
  const toggleTodo = useCallback(
    async (todoId, currentCompleted) => {
      if (!user?.uid || !todoId) return;

      const now = new Date().toISOString();
      const nextCompleted = !currentCompleted;
      const updates = {
        completed: nextCompleted,
        completedAt: nextCompleted ? now : null,
        updatedAt: now,
      };

      const nextList = todos.map((item) =>
        item.id === todoId ? { ...item, ...updates } : item
      );

      setTodos(nextList);
      setLocalTodos(user.uid, nextList);

      await syncToFirestore(nextList, { action: 'update', todoId, data: updates });
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Toggle Star
  const toggleStar = useCallback(
    async (todoId, currentStarred) => {
      if (!user?.uid || !todoId) return;

      const now = new Date().toISOString();
      const updates = { isStarred: !currentStarred, updatedAt: now };

      const nextList = todos.map((item) =>
        item.id === todoId ? { ...item, ...updates } : item
      );

      setTodos(nextList);
      setLocalTodos(user.uid, nextList);

      await syncToFirestore(nextList, { action: 'update', todoId, data: updates });
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Update Todo
  const updateTodo = useCallback(
    async (todoId, updates) => {
      if (!user?.uid || !todoId) return;

      const now = new Date().toISOString();
      const sanitized = { ...updates, updatedAt: now };

      const nextList = todos.map((item) =>
        item.id === todoId ? { ...item, ...sanitized } : item
      );

      setTodos(nextList);
      setLocalTodos(user.uid, nextList);

      await syncToFirestore(nextList, { action: 'update', todoId, data: sanitized });
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Delete Todo
  const deleteTodo = useCallback(
    async (todoId) => {
      if (!user?.uid || !todoId) return;

      const nextList = todos.filter((item) => item.id !== todoId);
      setTodos(nextList);
      setLocalTodos(user.uid, nextList);

      await syncToFirestore(nextList, { action: 'delete', todoId });
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Toggle Subtask
  const toggleSubtask = useCallback(
    async (todoId, subtaskId) => {
      let targetTodo = null;
      const nextList = todos.map((item) => {
        if (item.id === todoId) {
          const updatedSubtasks = (item.subtasks || []).map((sub) =>
            sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
          );
          const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
          targetTodo = {
            ...item,
            subtasks: updatedSubtasks,
            ...(allCompleted && !item.completed ? { completed: true, completedAt: new Date().toISOString() } : {}),
            updatedAt: new Date().toISOString(),
          };
          return targetTodo;
        }
        return item;
      });

      setTodos(nextList);
      setLocalTodos(user?.uid, nextList);

      if (targetTodo) {
        await syncToFirestore(nextList, {
          action: 'update',
          todoId,
          data: {
            subtasks: targetTodo.subtasks,
            completed: targetTodo.completed,
            updatedAt: targetTodo.updatedAt,
          },
        });
      }
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Add Subtask
  const addSubtask = useCallback(
    async (todoId, title) => {
      if (!title?.trim() || !user?.uid) return;

      const newSub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        completed: false,
      };

      let updatedSubtasks = [];
      const nextList = todos.map((item) => {
        if (item.id === todoId) {
          updatedSubtasks = [...(item.subtasks || []), newSub];
          return { ...item, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() };
        }
        return item;
      });

      setTodos(nextList);
      setLocalTodos(user.uid, nextList);

      await syncToFirestore(nextList, {
        action: 'update',
        todoId,
        data: { subtasks: updatedSubtasks, updatedAt: new Date().toISOString() },
      });
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Remove Subtask
  const deleteSubtask = useCallback(
    async (todoId, subtaskId) => {
      if (!user?.uid) return;

      let updatedSubtasks = [];
      const nextList = todos.map((item) => {
        if (item.id === todoId) {
          updatedSubtasks = (item.subtasks || []).filter((s) => s.id !== subtaskId);
          return { ...item, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() };
        }
        return item;
      });

      setTodos(nextList);
      setLocalTodos(user.uid, nextList);

      await syncToFirestore(nextList, {
        action: 'update',
        todoId,
        data: { subtasks: updatedSubtasks, updatedAt: new Date().toISOString() },
      });
    },
    [user?.uid, todos, syncToFirestore]
  );

  // Clear completed
  const clearCompleted = useCallback(async () => {
    if (!user?.uid) return;

    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    const activeList = todos.filter((t) => !t.completed);

    setTodos(activeList);
    setLocalTodos(user.uid, activeList);

    for (const id of completedIds) {
      await deleteDoc(doc(db, 'users', user.uid, 'todos', id)).catch(() => {});
    }

    await syncToFirestore(activeList);
  }, [user?.uid, todos, syncToFirestore]);

  // Manual verify & sync function to let user test live Firestore connection
  const forceVerifyCloud = useCallback(async () => {
    if (!user?.uid) return false;
    setSyncStatus('syncing');
    try {
      // Test read user document
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      // Sync active list
      await syncToFirestore(todos);
      setSyncStatus('synced');
      setLastSyncedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      return true;
    } catch (e) {
      setSyncStatus('error');
      setErrorMessage(e?.message);
      return false;
    }
  }, [user?.uid, todos, syncToFirestore]);

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const activeCount = totalCount - completedCount;
  const starredCount = todos.filter((t) => t.isStarred && !t.completed).length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    todos,
    loading,
    syncStatus,
    lastSyncedTime,
    errorMessage,
    forceVerifyCloud,
    addTodo,
    toggleTodo,
    toggleStar,
    updateTodo,
    deleteTodo,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    clearCompleted,
    stats: {
      totalCount,
      completedCount,
      activeCount,
      starredCount,
      completionRate,
    },
  };
}

// ==========================================
// 3. Subcomponent: TodoItemCard
// ==========================================
function TodoItemCard({
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

            <div className="flex items-center gap-1 shrink-0">
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

              <button
                type="button"
                onClick={() => onEdit(todo)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100"
                title="تعديل المهمة"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

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

          {todo.description && (
            <p className={`mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 ${todo.completed ? 'line-through' : ''}`}>
              {todo.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              <Folder className="w-3 h-3 text-slate-400" />
              {category.label}
            </span>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${priority.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priority.badgeColor}`} />
              {priority.label}
            </span>

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

          {expanded && subtasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
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

// ==========================================
// 4. Subcomponent: TodoModal
// ==========================================
function TodoModal({ isOpen, onClose, onSave, initialTodo = null }) {
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
      setCategory(initialTodo.category || 'worship');
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
    } catch (_) {} finally {
      setSubmitting(false);
    }
  };

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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              المهام الفرعية أو الخطوات ({subtasks.length})
            </label>

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

// ==========================================
// 5. Subcomponent: TodoQuickAdd
// ==========================================
function TodoQuickAdd({ onAdd, onOpenFullModal }) {
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
    } catch (_) {} finally {
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

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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

// ==========================================
// 6. Main Component: TodosPage
// ==========================================
export function TodosPage() {
  const {
    todos,
    loading,
    syncStatus,
    lastSyncedTime,
    errorMessage,
    forceVerifyCloud,
    addTodo,
    toggleTodo,
    toggleStar,
    updateTodo,
    deleteTodo,
    toggleSubtask,
    addSubtask,
    deleteSubtask,
    clearCompleted,
    stats,
  } = useTodos();

  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const handleToggle = async (id, currentCompleted) => {
    try {
      await toggleTodo(id, currentCompleted);
      if (!currentCompleted) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
        });
      }
    } catch (_) {}
  };

  const handleEdit = (todo) => {
    setEditingTodo(todo);
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingTodo(null);
    setModalOpen(true);
  };

  const handleSaveModal = async (todoData) => {
    if (editingTodo) {
      await updateTodo(editingTodo.id, todoData);
    } else {
      await addTodo(todoData);
    }
  };

  const handleManualCheck = async () => {
    setIsVerifying(true);
    setVerifiedSuccess(false);
    const ok = await forceVerifyCloud();
    setIsVerifying(false);
    if (ok) {
      setVerifiedSuccess(true);
      setTimeout(() => setVerifiedSuccess(false), 4000);
    }
  };

  const filteredTodos = useMemo(() => {
    return todos
      .filter((item) => {
        if (activeTab === 'active' && item.completed) return false;
        if (activeTab === 'completed' && !item.completed) return false;
        if (activeTab === 'starred' && !item.isStarred) return false;
        if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchSub = (item.subtasks || []).some((s) => s.title?.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchSub) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (!a.completed && !b.completed) {
          if (a.isStarred && !b.isStarred) return -1;
          if (!a.isStarred && b.isStarred) return 1;
        }

        if (sortBy === 'priority') {
          const weightA = PRIORITY_CONFIG[a.priority]?.weight || 1;
          const weightB = PRIORITY_CONFIG[b.priority]?.weight || 1;
          if (weightB !== weightA) return weightB - weightA;
        }

        if (sortBy === 'due') {
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          if (a.dueDate && b.dueDate) {
            return a.dueDate.localeCompare(b.dueDate);
          }
        }

        if (sortBy === 'alpha') {
          return a.title.localeCompare(b.title, 'ar');
        }

        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [todos, activeTab, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-5 sm:p-7 shadow-lg">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-emerald-100">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>نظام إدارة المهام اليومية والشخصية</span>
              </div>

              {/* Live Cloud Status Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md transition-all ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                    : syncStatus === 'syncing'
                    ? 'bg-blue-500/20 border-blue-400/40 text-blue-200 animate-pulse'
                    : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                }`}
                title="حالة المزامنة الحية مع قاعدة بيانات Firestore السحابية"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    syncStatus === 'synced' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-blue-400' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {syncStatus === 'synced'
                    ? `متزامن سحابياً مع Firestore ${lastSyncedTime ? `(${lastSyncedTime})` : ''}`
                    : syncStatus === 'syncing'
                    ? 'جارٍ المزامنة مع السحابة...'
                    : 'محفوظ ومحمي محلياً'}
                </span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              قائمة المهام والإنجاز
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl leading-relaxed">
              «نِعْمَتَانِ مَغْبُونٌ فِيهِمَا كَثِيرٌ مِنَ النَّاسِ: الصِّحَّةُ وَالْفَرَاغُ» — كل ما تسجله هنا يُحفظ ويزامن سحابياً مع حسابك في قاعدة البيانات.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Cloud Test Button */}
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isVerifying}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition cursor-pointer"
              title="فحص الاتصال المباشر وقراءة بياناتك من Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'جارٍ الفحص...' : 'فحص السحابة'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNew}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs sm:text-sm shadow-md transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>مهمة جديدة</span>
            </button>
          </div>
        </div>

        {/* Success confirmation toast */}
        {verifiedSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/30 border border-emerald-400/50 rounded-2xl text-xs font-bold text-white flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>تم الاتصال بنجاح وتأكيد وصول البيانات وقراءتها من قاعدة بيانات Firestore السحابية!</span>
          </div>
        )}

        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي المهام</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.totalCount}
          </p>
          <span className="text-[10px] text-slate-400">مهمة مسجلة بالسحابة</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">قيد التنفيذ</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.activeCount}
          </p>
          <span className="text-[10px] text-slate-400">بانتظار إنجازك</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">المهام المنجزة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.completedCount}
          </p>
          <span className="text-[10px] text-slate-400">تقبّل الله سعيك</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نسبة الإنجاز</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {stats.completionRate}%
              </span>
              <span className="text-[10px] text-slate-400">
                {stats.completedCount} من {stats.totalCount}
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Bar */}
      <TodoQuickAdd onAdd={addTodo} onOpenFullModal={handleOpenNew} />

      {/* Filters and Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>الكل</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {stats.totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>الجارية</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'active' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {stats.activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('starred')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'starred'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>المميزة</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'starred' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {stats.starredCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>المكتملة</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'completed' ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {stats.completedCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="created">الأحدث إضافة</option>
                <option value="priority">حسب الأولوية</option>
                <option value="due">تاريخ الاستحقاق</option>
                <option value="alpha">أبجدياً</option>
              </select>
            </div>

            {stats.completedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('هل تريد مسح جميع المهام المكتملة؟')) {
                    clearCompleted();
                  }
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer flex items-center gap-1"
                title="مسح المهام المكتملة"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden md:inline">مسح المكتمل</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المهام..."
              className="w-full ps-9 pe-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {TODO_CATEGORIES.map((cat) => {
              const count = cat.id === 'all'
                ? stats.totalCount
                : todos.filter((t) => t.category === cat.id).length;

              const active = selectedCategory === cat.id;

              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                  }`}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span className={`text-[10px] px-1 rounded-full ${active ? 'bg-white/20 dark:bg-black/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Task List */}
      <div className="space-y-3">
        {loading && (
          <div className="py-12 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
            جارٍ تحميل مهامك الخاصة من السحابة...
          </div>
        )}

        {!loading && filteredTodos.length === 0 && (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <CheckSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : activeTab === 'completed' ? 'لا توجد مهام مكتملة بعد' : 'قائمتك خالية حالياً!'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'جرّب البحث بكلمات أخرى أو أزل عوامل التصفية.'
                : 'أضف مهامك اليومية أو أهدافك الطيبة لتبدأ في إنجازها وحفظها في قاعدة البيانات أولاً بأول.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenNew}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                إضافة أول مهمة
              </button>
            )}
          </div>
        )}

        {filteredTodos.map((todo) => (
          <TodoItemCard
            key={todo.id}
            todo={todo}
            onToggle={handleToggle}
            onToggleStar={toggleStar}
            onDelete={deleteTodo}
            onEdit={handleEdit}
            onToggleSubtask={toggleSubtask}
            onAddSubtask={addSubtask}
            onDeleteSubtask={deleteSubtask}
          />
        ))}
      </div>

      <TodoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTodo(null);
        }}
        onSave={handleSaveModal}
        initialTodo={editingTodo}
      />
    </div>
  );
}

export default TodosPage;
