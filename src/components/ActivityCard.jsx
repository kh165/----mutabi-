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
import { useItemProgress } from '../hooks/useItemProgress.js';

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
  // الهدف المحلي بيظهر فوراً حتى لو الحفظ في السيرفر اتأخر
  const [localTarget, setLocalTarget] = useState(null);

  const effectiveTarget =
    localTarget != null
      ? localTarget
      : customTarget != null
      ? customTarget
      : activity.dailyTarget || 1;
  const [targetInput, setTargetInput] = useState(effectiveTarget);

  const effectiveActivity = { ...activity, dailyTarget: effectiveTarget };

  const isCompleted = log?.completed || false;
  const currentAmount = log?.amount || 0;

  const isPrayers = activity.type === 'prayers' || activity.inputMode === 'prayers';
  const isChecklist = activity.type === 'checklist' || activity.inputMode === 'checklist';
  const isListen = activity.type === 'listen';
  const checklistTotal = activity.subItems?.length || effectiveTarget;

  // إحصائيات مكتبة الفيديوهات (لأنشطة السماع فقط)
  const { items: listenItems = [], progress: listenProgress = {} } = useItemProgress(isListen ? activity.id : null);
  const listenTotal = listenItems.length;
  const listenDone = listenItems.filter((i) => listenProgress[i.id]?.isCompleted).length;

  // أنشطة السماع بتتعرض كعدّاد رقمي (عدد المقاطع المنجزة اليوم)
  const showNumeric = !isPrayers && !isChecklist && (isListen || activity.inputMode !== 'checkbox');

  const IconComponent = LucideIcons[activity.icon] || LucideIcons.CheckCircle2;

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
    const nextCompleted = effectiveTarget > 0 ? nextAmount >= effectiveTarget : true;
    if (nextCompleted && !isCompleted) {
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

  const progressPercent = isPrayers
    ? Math.min(100, Math.round((currentAmount / 5) * 100))
    : isChecklist
    ? checklistTotal > 0
      ? Math.min(100, Math.round((currentAmount / checklistTotal) * 100))
      : 0
    : showNumeric
    ? effectiveTarget > 0
      ? Math.min(100, Math.round((currentAmount / effectiveTarget) * 100))
      : isCompleted
      ? 100
      : 0
    : isCompleted
    ? 100
    : 0;

  // حفظ الهدف: الواجهة بتتحدث فوراً والكتابة في السيرفر في الخلفية
  const handleSaveTarget = async (e) => {
    e.stopPropagation();
    const newT = Math.max(1, parseInt(targetInput, 10) || 1);
    setLocalTarget(newT);
    setEditingTarget(false);
    try {
      await onUpdateTarget?.(activity.id, newT);
    } catch (err) {
      console.error('Failed to persist target', err);
    }
  };

  const prayersDetails = log?.details?.prayers;

  const handleModalSave = async (amount, completed, details, note) => {
    if (completed && !isCompleted) {
      triggerConfetti();
      onAchievement?.(activity.title);
    }
    await onSaveLog(activity.id, dateStr, amount, completed, details, note);
  };

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

              <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  {isPrayers ? (
                    <span>
                      أُديت: <strong className="text-slate-800 dark:text-slate-200">{currentAmount}</strong> من 5 صلوات
                    </span>
                  ) : isChecklist ? (
                    <span>
                      المنجز: <strong className="text-slate-800 dark:text-slate-200">{currentAmount}</strong> من {checklistTotal} بنود
                    </span>
                  ) : showNumeric ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{isListen ? 'اليوم:' : 'المنجز:'} <strong className="text-slate-800 dark:text-slate-200">{currentAmount}</strong></span>
                      <span>من</span>
                      {editingTarget ? (
                        <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={targetInput}
                            autoFocus
                            onChange={(e) => setTargetInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTarget(e);
                              if (e.key === 'Escape') setEditingTarget(false);
                            }}
                            className="w-14 px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 border border-emerald-500 rounded font-bold text-center"
                          />
                          <button
                            type="button"
                            onClick={handleSaveTarget}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTarget(false);
                            }}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetInput(effectiveTarget);
                            setEditingTarget(true);
                          }}
                          className="font-bold text-emerald-700 dark:text-emerald-400 underline decoration-dashed hover:text-emerald-800 cursor-pointer"
                          title="اضغط لتعديل هدفك اليومي الشخصي"
                        >
                          {effectiveTarget} {getUnitName(activity.unit)} ✏️
                        </button>
                      )}
                    </div>
                  ) : (
                    <span>{isCompleted ? 'تم الإنجاز بنجاح ✓' : 'لم يتم الإنجاز بعد'}</span>
                  )}
                </div>
                <span
                  className="font-bold text-xs"
                  style={{ color: isCompleted ? '#10b981' : activity.color }}
                >
                  {progressPercent}%
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: isCompleted ? '#10b981' : activity.color,
                  }}
                />
              </div>

              {isListen && (
                <div className="mt-2 text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                  {listenTotal > 0 ? (
                    <span>📺 المكتبة: أُنجز {listenDone} من {listenTotal} مقطع</span>
                  ) : (
                    <span>📺 لم تُضف مقاطع بعد</span>
                  )}
                </div>
              )}

              {isPrayers && (
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

              {log?.details?.surah && (
                <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                  <span>سورة {log.details.surah} (الآيات {log.details.fromAyah} - {log.details.toAyah})</span>
                  <span>• {log.details.kind === 'new' ? 'حفظ جديد' : 'مراجعة'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {(isCompleted || currentAmount > 0) && (
              <button
                type="button"
                onClick={handleResetLog}
                className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                title="تراجع عن تسجيل هذا اليوم والبدء من جديد"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-[11px]">تراجع</span>
              </button>
            )}

            {isPrayers || isChecklist || isListen ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                title={isListen ? 'فتح المشغّل والمكتبة' : 'تسجيل وتدوين الملاحظات'}
              >
                <span>{isListen ? 'مشاهدة' : isCompleted ? 'تعديل' : 'تسجيل'}</span>
              </button>
            ) : activity.inputMode === 'checkbox' ? (
              <button
                type="button"
                onClick={handleQuickCheckboxToggle}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
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
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                title="إضافة 1 سريع"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto"
          >
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
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isPrayers ? (
              <PrayersInput
                activity={effectiveActivity}
                currentLog={log}
                onSave={handleModalSave}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : isChecklist ? (
              <ChecklistInput
                activity={effectiveActivity}
                currentLog={log}
                onSave={handleModalSave}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : activity.type === 'memorize' ? (
              <MemorizeInput
                currentLog={log}
                latestPosition={latestPosition}
                dailyTarget={effectiveTarget}
                onSave={handleModalSave}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : activity.type === 'read' ? (
              <ReadInput
                currentLog={log}
                khatmaStats={khatmaStats}
                dailyTarget={effectiveTarget}
                onSave={handleModalSave}
                onReset={handleResetLog}
                onClose={() => setModalOpen(false)}
              />
            ) : isListen ? (
              <ListenInput
                activity={effectiveActivity}
                currentLog={log}
                onSave={handleModalSave}
                onClose={() => setModalOpen(false)}
              />
            ) : (
              <CustomInput
                activity={effectiveActivity}
                currentLog={log}
                onSave={handleModalSave}
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
