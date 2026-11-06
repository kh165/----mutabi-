import React, { useState } from 'react';
import { useActivities } from '../hooks/useActivities.js';
import { useLogs } from '../hooks/useLogs.js';
import { formatArabicDate } from '../lib/dates.js';
import { getSurah } from '../data/quran.js';
import {
  History as HistoryIcon,
  Trash2,
  BookOpen,
  Video,
  Sparkles,
  CheckCircle2,
  Calendar,
  Moon,
} from 'lucide-react';

export function History() {
  const { activities } = useActivities(false);
  const { logs, deleteLog, loading } = useLogs();
  const [selectedActivityId, setSelectedActivityId] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const activitiesMap = new Map(activities.map((a) => [a.id, a]));

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (selectedActivityId !== 'all' && log.activityId !== selectedActivityId) {
      return false;
    }
    if (filterPeriod !== 'all') {
      const now = new Date();
      const logDate = new Date(log.date);
      const diffDays = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 3600 * 24));
      if (filterPeriod === '7days' && diffDays > 7) return false;
      if (filterPeriod === '30days' && diffDays > 30) return false;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const handleDelete = async (id) => {
    await deleteLog(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 text-right">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          سجل الإنجازات والأنشطة 📜
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          مراجعة كاملة لجميع السجلات والصلوات والقراءات التي قمت بتسجيلها.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Activity Filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            تصفية بالنشاط:
          </label>
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع الأنشطة المسجلة</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        {/* Period Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            الفترة الزمنية:
          </label>
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterPeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === '7days'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => setFilterPeriod('30days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterPeriod === '30days'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              آخر شهر
            </button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">جارٍ تحميل سجل الأنشطة...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2 shadow-2xs">
            <HistoryIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              لا توجد سجلات مطابقة لهذا البحث
            </h4>
            <p className="text-xs text-slate-400">
              ابدأ بتسجيل إنجازاتك اليومية وستظهر تلقائياً في هذا السجل التاريخي.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const activity = activitiesMap.get(log.activityId);
            const title = activity?.title || 'نشاط سابق';
            const color = activity?.color || '#10b981';

            return (
              <div
                key={log.id}
                className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {title}
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        {formatArabicDate(log.date)}
                      </span>
                    </div>

                    {/* Details content */}
                    <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      {/* Quran Memorization Details */}
                      {log.details?.surah && (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>
                            سورة {getSurah(log.details.surah)?.name || log.details.surah} (من آية {log.details.fromAyah} إلى {log.details.toAyah})
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md">
                            {log.details.kind === 'new' ? 'حفظ جديد' : 'مراجعة وتثبيت'}
                          </span>
                        </div>
                      )}

                      {/* Quran Read Range Details */}
                      {log.details?.fromPage && (
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                          <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>
                            من صفحة {log.details.fromPage} إلى صفحة {log.details.toPage} ({log.amount} صفحات)
                          </span>
                        </div>
                      )}

                      {/* Prayers Details */}
                      {log.details?.prayers && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.values(log.details.prayers).map((p) => {
                            const isJamaah = p.status === 'prayed_jamaah';
                            const isIndiv = p.status === 'prayed_individual';
                            const isMissed = p.status === 'missed';
                            return (
                              <span
                                key={p.id}
                                className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold ${
                                  isJamaah
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                    : isIndiv
                                    ? 'bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300'
                                    : isMissed
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {p.title}: {isJamaah ? 'جماعة ✓' : isIndiv ? 'منفرداً ✓' : isMissed ? 'لم أصلِّ' : '—'}
                                {p.note && ` (${p.note})`}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Generic amount if not prayers/read range */}
                      {!log.details?.fromPage && !log.details?.surah && !log.details?.prayers && log.amount > 0 && (
                        <div>
                          الكمية المنجزة: <span className="font-bold text-slate-900 dark:text-white">{log.amount}</span>
                        </div>
                      )}

                      {/* User's Note */}
                      {log.note && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-0.5">
                          «{log.note}»
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button with confirmation */}
                <div className="shrink-0 self-end sm:self-center">
                  {confirmDeleteId === log.id ? (
                    <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1.5 rounded-xl border border-red-200 dark:border-red-900">
                      <span className="text-[11px] text-red-700 dark:text-red-400 font-bold px-1">
                        تأكيد الحذف؟
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(log.id)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold"
                      >
                        نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px]"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(log.id)}
                      className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-all"
                      title="حذف هذا السجل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
