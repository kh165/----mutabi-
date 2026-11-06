import React, { useState } from 'react';
import { getDateOffset, formatArabicDate, getDayOfWeek } from '../lib/dates';
import { ActivityLog } from '../types';

interface HeatmapProps {
  logs: ActivityLog[];
  todayStr: string;
  daysCount?: number;
}

export function Heatmap({ logs, todayStr, daysCount = 70 }: HeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<{ date: string; count: number } | null>(null);

  // Group completed logs by date
  const countsByDate = new Map<string, number>();
  for (const log of logs) {
    if (log.completed && log.amount > 0) {
      countsByDate.set(log.date, (countsByDate.get(log.date) || 0) + 1);
    }
  }

  // Generate date list from (today - daysCount) to today
  const daysList: { date: string; dayOfWeek: number; count: number }[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = getDateOffset(todayStr, -i);
    daysList.push({
      date: d,
      dayOfWeek: getDayOfWeek(d),
      count: countsByDate.get(d) || 0,
    });
  }

  // Split into weeks (columns of 7 days: Sun-Sat)
  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];

  // Align the first week
  const firstDayOfWeek = daysList[0]?.dayOfWeek || 0;
  for (let empty = 0; empty < firstDayOfWeek; empty++) {
    currentWeek.push({ date: '', count: -1 });
  }

  for (const day of daysList) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: '', count: -1 });
    }
    weeks.push(currentWeek);
  }

  function getColor(count: number) {
    if (count < 0) return 'bg-transparent';
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50';
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800';
    if (count === 2) return 'bg-emerald-400 dark:bg-emerald-600';
    return 'bg-emerald-600 dark:bg-emerald-500 shadow-xs shadow-emerald-500/20';
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-fit flex flex-col gap-2">
        {/* Days of week labels + Grid */}
        <div className="flex gap-1.5 items-start">
          {/* Day of week labels (Sun, Tue, Thu) */}
          <div className="flex flex-col gap-1.5 text-[10px] text-slate-400 font-medium pe-2 select-none justify-between h-[112px]">
            <span>أحد</span>
            <span>ثلاثاء</span>
            <span>خميس</span>
          </div>

          {/* Weeks columns */}
          <div className="flex gap-1.5">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day, dIdx) => {
                  if (day.count === -1) {
                    return <div key={dIdx} className="w-3.5 h-3.5 rounded-xs" />;
                  }
                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredDate({ date: day.date, count: day.count })}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`w-3.5 h-3.5 rounded-xs cursor-pointer transition-transform hover:scale-125 ${getColor(
                        day.count
                      )}`}
                      title={`${formatArabicDate(day.date)}: ${day.count} إنجازات`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend & Tooltip info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div>
            {hoveredDate ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatArabicDate(hoveredDate.date)}: {hoveredDate.count} {hoveredDate.count === 1 ? 'إنجاز' : 'إنجازات'}
              </span>
            ) : (
              <span>مرر الفأرة على الأيام لمعاينة إنجازك</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span>أقل</span>
            <div className="w-2.5 h-2.5 rounded-xs bg-slate-100 dark:bg-slate-800" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-200 dark:bg-emerald-900" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-400 dark:bg-emerald-600" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
            <span>أكثر</span>
          </div>
        </div>
      </div>
    </div>
  );
}
