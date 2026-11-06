import React, { useState } from 'react';
import { useActivities } from '../hooks/useActivities';
import { useLogs } from '../hooks/useLogs';
import { formatArabicDate } from '../lib/dates';
import { getSurah } from '../data/quran';
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
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    await deleteLog(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-6 text-right">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-emerald-600" />
            <span>سجل الأنشطة والإنجازات السابقة</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مراجعة كافة التسجيلات السابقة مع إمكانية التعديل أو الحذف
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع الأنشطة ({activities.length})</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">كل الأوقات</option>
            <option value="7days">آخر 7 أيام</option>
            <option value="30days">آخر 30 يومًا</option>
          </select>
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">جارٍ تحميل السجل...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <HistoryIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">
              لا توجد سجلات مطابقة لهذا الفلتر
            </p>
            <p className="text-xs text-slate-400">
              قم بتسجيل إنجاز جديد في صفحة اليوم ليظهر هنا.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((log) => {
              const activity = activitiesMap.get(log.activityId);
              const surah = log.details?.surah ? getSurah(log.details.surah) : null;
              const prayers = log.details?.prayers;

              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: activity ? `${activity.color}15` : '#10b98115',
                        color: activity ? activity.color : '#10b981',
                      }}
                    >
                      {activity?.type === 'prayers' ? (
                        <Moon className="w-5 h-5" />
                      ) : activity?.type === 'memorize' ? (
                        <BookOpen className="w-5 h-5" />
                      ) : activity?.type === 'read' ? (
                        <BookOpen className="w-5 h-5" />
                      ) : activity?.type === 'listen' ? (
                        <Video className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {activity?.title || 'نشاط'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          • {formatArabicDate(log.date)}
                        </span>
                        {log.completed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            مكتمل
                          </span>
                        )}
                      </div>

                      {/* Details specs */}
                      <div className="mt-1 text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          المنجز: <strong>{log.amount}</strong>{' '}
                          {activity?.unit === 'ayah'
                            ? 'آية'
                            : activity?.unit === 'page'
                            ? 'صفحة'
                            : activity?.type === 'prayers'
                            ? 'صلوات'
                            : 'مرة'}
                        </span>

                        {surah && (
                          <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            سورة {surah.name} ({log.details?.fromAyah} - {log.details?.toAyah})
                            {log.details?.kind === 'new' ? ' [حفظ جديد]' : ' [مراجعة]'}
                          </span>
                        )}

                        {log.details?.fromPage && (
                          <span className="text-sky-800 font-semibold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                            من صفحة {log.details.fromPage} إلى {log.details.toPage}
                          </span>
                        )}

                        {/* Prayers breakdown */}
                        {prayers && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {Object.entries(prayers).map(([k, p]: [string, any]) => (
                              <span
                                key={k}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  p.status === 'prayed_jamaah'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : p.status === 'prayed_individual'
                                    ? 'bg-teal-100 text-teal-900'
                                    : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {p.title}: {p.status === 'prayed_jamaah' ? 'جماعة' : p.status === 'prayed_individual' ? 'منفرداً' : 'لم تُصلَّ'}
                                {p.note && ` (${p.note})`}
                              </span>
                            ))}
                          </div>
                        )}

                        {log.note && (
                          <span className="text-slate-500 italic">
                            «{log.note}»
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {confirmDeleteId === log.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => handleDelete(log.id)}
                          className="px-2.5 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                        >
                          تأكيد الحذف
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(log.id)}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all"
                        title="حذف هذا التسجيل"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
