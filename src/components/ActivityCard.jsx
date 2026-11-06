import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import * as LucideIcons from 'lucide-react';
import { Check, Plus, X, RotateCcw } from 'lucide-react';
import { MemorizeInput } from './inputs/MemorizeInput.jsx';
import { ReadInput } from './inputs/ReadInput.jsx';
import { ListenInput } from './inputs/ListenInput.jsx';
import { CustomInput } from './inputs/CustomInput.jsx';
import { PrayersInput } from './inputs/PrayersInput.jsx';
import { ChecklistInput } from './inputs/ChecklistInput.jsx';

export function ActivityCard({
  activity,
  log,
  dateStr,
  onSaveLog,
  onResetLog,
  latestPosition,
  khatmaStats,
  onAchievement,
  customTarget,
  onUpdateTarget,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const effectiveTarget = customTarget != null ? customTarget : (activity.dailyTarget || 1);
  const [targetInput, setTargetInput] = useState(effectiveTarget);

  const isCompleted = log?.completed || false;
  const currentAmount = log?.amount || 0;

  // Render dynamic Lucide icon
  const IconComponent = LucideIcons[activity.icon] || LucideIcons.Sparkles;

  const getUnitName = (unit) => {
    switch (unit) {
      case 'ayah': return 'آية';
      case 'page': return 'صفحة';
      case 'video': return 'مقطع';
      case 'minute': return 'دقيقة';
      case 'time': return 'صلاة/مرة';
      default: return 'مرات';
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

  const handleQuickCheckboxToggle = async (e) => {
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

  const handleQuickIncrement = async (e) => {
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

  const handleResetLog = async (e) => {
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
      ? effectiveTarget > 0
        ? Math.min(100, Math.round((currentAmount / effectiveTarget) * 100))
        : isCompleted ? 100 : 0
      : activity.inputMode === 'checkbox'
      ? isCompleted ? 100 : 0
      : effectiveTarget > 0
      ? Math.min(100, Math.round((currentAmount / effectiveTarget) * 100))
      : isCompleted ? 100 : 0;

  const handleSaveTarget = async (e) => {
    e.stopPropagation();
    const newT = Math.max(1, parseInt(targetInput, 10) || 1);
    if (onUpdateTarget) {
      await onUpdateTarget(activity.id, newT);
    }
    setEditingTarget(false);
  };

  const prayersDetails = log?.details?.prayers;

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className={`group relative bg-white dark:bg-slate-900 border rounded-3xl p-4 sm:p-5 transition-all duration-200 cursor-pointer hover:shadow-md ${
          isCompleted
            ? 'border-emerald-400 dark:border-emerald-600/80 bg-emerald-50/30 dark:bg-emerald-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
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
                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 truncate">
                  {activity.title}
                </h3>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full shrink-0 border border-emerald-200 dark:border-emerald-800">
                    <Check className="w-3 h-3 stroke-[3]" />
                    مكتمل
                  </span>
                )}
              </div>

              {activity.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {activity.description}
                </p>
              )}

              {/* Progress text */}
              <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  {activity.type === 'prayers' || activity.inputMode === 'prayers' ? (
                    <span>
                      أُديت: <strong className="text-slate-800 dark:text-slate-200">{currentAmount}</strong> من 5 صلوات
                    </span>
                  ) : activity.type === 'checklist' || activity.inputMode === 'checklist' ? (
                    <span>
                      المنجز: <strong className="text-slate-800 dark:text-slate-200">{currentAmount}</strong> بنود
                    </span>
                  ) : activity.inputMode === 'checkbox' ? (
                    <span>{isCompleted ? 'تم الإنجاز بنجاح ✓' : 'لم يتم الإنجاز بعد'}</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>المنجز: <strong className="text-slate-800 dark:text-slate-200">{currentAmount}</strong></span>
                      <span>من</span>
                      {editingTarget ? (
                        <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={targetInput}
                            onChange={(e) => setTargetInput(e.target.value)}
                            className="w-14 px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 border border-emerald-500 rounded font-bold text-center"
                          />
                          <button
                            type="button"
                            onClick={handleSaveTarget}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                          >
                            حفظ
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTarget(true);
                          }}
                          className="font-bold text-emerald-700 dark:text-emerald-400 underline decoration-dashed hover:text-emerald-800"
                          title="اضغط لتعديل هدفك اليومي الشخصي"
                        >
                          {effectiveTarget} {getUnitName(activity.unit)} ✏️
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <span
                  className="font-bold text-xs"
                  style={{ color: isCompleted ? '#10b981' : activity.color }}
                >
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-1.5 overflow-hidden">
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
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
                            : isMiss
                            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
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

              {/* Quran details preview */}
              {log?.details?.surah && (
                <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                  <span>سورة {log.details.surah} (الآيات {log.details.fromAyah} - {log.details.toAyah})</span>
                  <span>• {log.details.kind === 'new' ? 'حفظ جديد' : 'مراجعة'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick action button on the left */}
          <div className="shrink-0 flex items-center gap-1.5">
            {(isCompleted || currentAmount > 0) && (
              <button
                type="button"
                onClick={handleResetLog}
                className="px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1 transition-all"
                title="تراجع عن تسجيل هذا اليوم والبدء من جديد"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center gap-1 transition-all"
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
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600'
                }`}
                title={isCompleted ? 'إلغاء الإنجاز' : 'تعليم كمنجز'}
              >
                <Check className={`w-5 h-5 ${isCompleted ? 'stroke-[2.5]' : ''}`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickIncrement}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-center transition-all shadow-2xs"
                title="إضافة 1 سريع"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Input Modal Dialog */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${activity.color}18`, color: activity.color }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                    {activity.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    تسجيل إنجاز يوم: {dateStr}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
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
