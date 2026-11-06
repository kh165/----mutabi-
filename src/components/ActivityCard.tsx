import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Activity,
  ActivityLog,
  LogDetails,
} from '../types';
import * as LucideIcons from 'lucide-react';
import { Check, Plus, X, Sunrise, Sun, Sunset, Moon, Sparkles, RotateCcw } from 'lucide-react';
import { MemorizeInput } from './inputs/MemorizeInput';
import { ReadInput } from './inputs/ReadInput';
import { ListenInput } from './inputs/ListenInput';
import { CustomInput } from './inputs/CustomInput';
import { PrayersInput } from './inputs/PrayersInput';
import { ChecklistInput } from './inputs/ChecklistInput';

interface ActivityCardProps {
  activity: Activity;
  log?: ActivityLog;
  dateStr: string;
  onSaveLog: (
    activityId: string,
    date: string,
    amount: number,
    completed: boolean,
    details?: LogDetails,
    note?: string | null
  ) => Promise<any>;
  onResetLog?: (activityId: string, date: string) => Promise<any>;
  latestPosition?: any;
  khatmaStats?: any;
  onAchievement?: (activityTitle: string) => void;
}

export function ActivityCard({
  activity,
  log,
  dateStr,
  onSaveLog,
  latestPosition,
  khatmaStats,
  onAchievement,
}: ActivityCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const isCompleted = log?.completed || false;
  const currentAmount = log?.amount || 0;

  // Render dynamic Lucide icon
  const IconComponent = (LucideIcons as any)[activity.icon] || LucideIcons.Sparkles;

  const getUnitName = (unit: string) => {
    switch (unit) {
      case 'ayah': return 'آية';
      case 'page': return 'صفحة';
      case 'video': return 'مقطع';
      case 'minute': return 'دقيقة';
      case 'time': return 'صلاة/مرة';
      default: return '';
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10b981', '#34d399', '#059669', '#d4a373', '#f59e0b'],
    });
  };

  const handleQuickCheckboxToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCompleted = !isCompleted;
    if (nextCompleted) {
      triggerConfetti();
      onAchievement?.(activity.title);
    }
    await onSaveLog(
      activity.id,
      dateStr,
      nextCompleted ? 1 : 0,
      nextCompleted,
      log?.details || {},
      log?.note || null
    );
  };

  const handleQuickIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextAmount = currentAmount + 1;
    const nextCompleted = activity.dailyTarget > 0 ? nextAmount >= activity.dailyTarget : true;
    if (nextCompleted) {
      triggerConfetti();
      onAchievement?.(activity.title);
    }
    await onSaveLog(
      activity.id,
      dateStr,
      nextAmount,
      nextCompleted,
      log?.details || {},
      log?.note || null
    );
  };

  const handleResetLog = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onResetLog) {
      await onResetLog(activity.id, dateStr);
    } else {
      await onSaveLog(activity.id, dateStr, 0, false, {}, null);
    }
    setModalOpen(false);
  };

  const progressPercent =
    activity.type === 'prayers' || activity.inputMode === 'prayers'
      ? Math.min(100, Math.round((currentAmount / 5) * 100))
      : activity.type === 'checklist' || activity.inputMode === 'checklist'
      ? activity.dailyTarget > 0
        ? Math.min(100, Math.round((currentAmount / activity.dailyTarget) * 100))
        : isCompleted ? 100 : 0
      : activity.inputMode === 'checkbox'
      ? isCompleted ? 100 : 0
      : activity.dailyTarget > 0
      ? Math.min(100, Math.round((currentAmount / activity.dailyTarget) * 100))
      : isCompleted ? 100 : 0;

  // Prayer dots preview if prayers activity
  const prayersDetails = log?.details?.prayers;

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={`group relative bg-white border rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer hover:shadow-sm ${
          isCompleted
            ? 'border-emerald-300 bg-emerald-50/25'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Right Icon + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: `${activity.color}15`, color: activity.color }}
            >
              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-800 truncate">
                  {activity.title}
                </h3>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                    مكتمل
                  </span>
                )}
              </div>

              {activity.description && (
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {activity.description}
                </p>
              )}

              {/* Progress text */}
              <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">
                  {activity.type === 'prayers' || activity.inputMode === 'prayers' ? (
                    <>
                      أُديت: <span className="text-slate-800 font-bold">{currentAmount}</span> من 5 صلوات
                    </>
                  ) : activity.type === 'checklist' || activity.inputMode === 'checklist' ? (
                    <>
                      المنجز: <span className="text-slate-800 font-bold">{currentAmount}</span> بنود
                    </>
                  ) : activity.inputMode === 'checkbox' ? (
                    isCompleted ? 'تم الإنجاز بنجاح ✓' : 'لم يتم الإنجاز بعد'
                  ) : (
                    <>
                      المنجز: <span className="text-slate-800 font-bold">{currentAmount}</span>
                      {activity.dailyTarget > 0 && ` من ${activity.dailyTarget}`} {getUnitName(activity.unit)}
                    </>
                  )}
                </span>
                <span
                  className="font-bold text-xs"
                  style={{ color: isCompleted ? '#10b981' : activity.color }}
                >
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: isCompleted ? '#10b981' : activity.color,
                  }}
                />
              </div>

              {/* Prayer Mini Indicators if type is prayers */}
              {(activity.type === 'prayers' || activity.inputMode === 'prayers') && (
                <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'fajr', label: 'الفجر' },
                    { id: 'dhuhr', label: 'الظهر' },
                    { id: 'asr', label: 'العصر' },
                    { id: 'maghrib', label: 'المغرب' },
                    { id: 'isha', label: 'العشاء' },
                  ].map((p) => {
                    const st = prayersDetails?.[p.id]?.status;
                    const isDone = st === 'prayed_jamaah' || st === 'prayed_individual';
                    const isMiss = st === 'missed';
                    return (
                      <span
                        key={p.id}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1 ${
                          isDone
                            ? 'bg-emerald-100 text-emerald-800 font-bold'
                            : isMiss
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.label}
                        {isDone && '✓'}
                        {isMiss && '✕'}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Quran details preview if exists */}
              {log?.details?.surah && (
                <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                  <span>سورة {log.details.surah} (الآيات {log.details.fromAyah} - {log.details.toAyah})</span>
                  <span>• {log.details.kind === 'new' ? 'حفظ جديد' : 'مراجعة'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick action button on the left */}
          <div className="shrink-0 flex items-center gap-1.5">
            {/* If recorded today, show quick Undo / Cancel button */}
            {(isCompleted || currentAmount > 0) && (
              <button
                type="button"
                onClick={handleResetLog}
                className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1 transition-all"
                title="تراجع عن تسجيل هذا اليوم والبدء من جديد"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">إلغاء</span>
              </button>
            )}

            {activity.type === 'prayers' || activity.inputMode === 'prayers' || activity.type === 'checklist' || activity.inputMode === 'checklist' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1 transition-all"
                title="تسجيل وتدوين الملاحظات"
              >
                <span>{isCompleted ? 'تعديل' : 'تسجيل'}</span>
              </button>
            ) : activity.inputMode === 'checkbox' ? (
              <button
                type="button"
                onClick={handleQuickCheckboxToggle}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                }`}
                title={isCompleted ? 'إلغاء الإنجاز' : 'تعليم كمنجز'}
              >
                <Check className={`w-5 h-5 ${isCompleted ? 'stroke-[2.5]' : ''}`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickIncrement}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 flex items-center justify-center transition-all shadow-2xs"
                title="إضافة 1 سريع"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Input Modal Dialog with soft light backdrop */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200 relative max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${activity.color}18`, color: activity.color }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    {activity.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    تسجيل إنجاز يوم: {dateStr}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Tailored Input according to activity.type */}
            {activity.type === 'prayers' || activity.inputMode === 'prayers' ? (
              <PrayersInput
                activity={activity}
                currentLog={log}
                onSave={async (amount, completed, details, note) => {
                  if (completed) {
                    triggerConfetti();
                    onAchievement?.(activity.title);
                  }
                  await onSaveLog(activity.id, dateStr, amount, completed, details, note);
                }}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : activity.type === 'checklist' || activity.inputMode === 'checklist' ? (
              <ChecklistInput
                activity={activity}
                currentLog={log}
                onSave={async (amount, completed, details, note) => {
                  if (completed) {
                    triggerConfetti();
                    onAchievement?.(activity.title);
                  }
                  await onSaveLog(activity.id, dateStr, amount, completed, details, note);
                }}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : activity.type === 'memorize' ? (
              <MemorizeInput
                currentLog={log}
                latestPosition={latestPosition}
                dailyTarget={activity.dailyTarget}
                onSave={async (amount, completed, details, note) => {
                  if (completed) {
                    triggerConfetti();
                    onAchievement?.(activity.title);
                  }
                  await onSaveLog(activity.id, dateStr, amount, completed, details, note);
                }}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : activity.type === 'read' ? (
              <ReadInput
                currentLog={log}
                khatmaStats={khatmaStats}
                dailyTarget={activity.dailyTarget}
                onSave={async (amount, completed, details, note) => {
                  if (completed) {
                    triggerConfetti();
                    onAchievement?.(activity.title);
                  }
                  await onSaveLog(activity.id, dateStr, amount, completed, details, note);
                }}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : activity.type === 'listen' ? (
              <ListenInput
                activity={activity}
                currentLog={log}
                onSave={async (amount, completed, details, note) => {
                  if (completed) {
                    triggerConfetti();
                    onAchievement?.(activity.title);
                  }
                  await onSaveLog(activity.id, dateStr, amount, completed, details, note);
                }}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : (
              <CustomInput
                activity={activity}
                currentLog={log}
                onSave={async (amount, completed, details, note) => {
                  if (completed) {
                    triggerConfetti();
                    onAchievement?.(activity.title);
                  }
                  await onSaveLog(activity.id, dateStr, amount, completed, details, note);
                }}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
