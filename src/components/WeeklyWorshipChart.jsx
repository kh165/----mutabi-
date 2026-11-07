import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, BarChart3, LineChart, Sparkles } from 'lucide-react';

export function WeeklyWorshipChart({ weeklyData = [], isDark = false }) {
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'area'

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-xl text-right">
          <p className="font-black text-xs text-slate-900 dark:text-white mb-1">
            {label} ({payload[0]?.payload?.date})
          </p>
          <div className="space-y-0.5 text-[11px]">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-between gap-3">
              <span>المهام والعبادات المكتملة:</span>
              <span className="font-black text-sm">{payload[0]?.value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const totalWeeklyDone = weeklyData.reduce((acc, d) => acc + (d.completedCount || 0), 0);
  const avgDaily = Math.round((totalWeeklyDone / Math.max(1, weeklyData.length)) * 10) / 10;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>لوحة تقدم الأداء الأسبوعي</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            رسم بياني تفاعلي يوضح عدد العبادات والمهام المنجزة يومياً على مدار الأسبوع.
          </p>
        </div>

        {/* View Switcher: Bar vs Area */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="رسم بياني بالأعمدة"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === 'area'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="رسم بياني بالمساحة والتدرج"
            >
              <LineChart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI mini tags */}
      <div className="flex items-center gap-3 text-xs">
        <span className="p-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
          إجمالي المنجز هذا الأسبوع: <strong>{totalWeeklyDone} عبادة</strong>
        </span>
        <span className="p-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
          متوسط الإنجاز اليومي: <strong>{avgDaily}</strong>
        </span>
      </div>

      {/* Recharts Render Container */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={weeklyData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
              <XAxis
                dataKey="dayLabel"
                stroke={isDark ? '#94a3b8' : '#64748b'}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={isDark ? '#94a3b8' : '#64748b'}
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={customTooltip} />
              <Bar
                dataKey="completedCount"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                animationDuration={900}
              />
            </BarChart>
          ) : (
            <AreaChart data={weeklyData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.6} />
              <XAxis
                dataKey="dayLabel"
                stroke={isDark ? '#94a3b8' : '#64748b'}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={isDark ? '#94a3b8' : '#64748b'}
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={customTooltip} />
              <Area
                type="monotone"
                dataKey="completedCount"
                stroke="#059669"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCompleted)"
                animationDuration={900}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
