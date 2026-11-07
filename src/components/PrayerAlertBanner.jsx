import React from 'react';
import {
  Bell,
  X,
  Volume2,
  Sunrise,
  Sun,
  SunMedium,
  Sunset,
  Moon,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

export function PrayerAlertBanner({ alert, onDismiss, onRecordPrayer }) {
  if (!alert) return null;

  const getAlertIcon = (key) => {
    switch (key) {
      case 'fajr':
        return <Sunrise className="w-6 h-6 text-sky-400" />;
      case 'dhuhr':
        return <Sun className="w-6 h-6 text-amber-400" />;
      case 'asr':
        return <SunMedium className="w-6 h-6 text-orange-400" />;
      case 'maghrib':
        return <Sunset className="w-6 h-6 text-pink-400" />;
      case 'isha':
        return <Moon className="w-6 h-6 text-indigo-400" />;
      case 'dailyWird':
        return <BookOpen className="w-6 h-6 text-emerald-400" />;
      default:
        return <Bell className="w-6 h-6 text-emerald-400" />;
    }
  };

  const isPrayer = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(alert.key);

  return (
    <div className="fixed top-4 start-4 end-4 sm:start-auto sm:end-6 sm:w-[420px] z-50 animate-in fade-in slide-in-from-top-6 duration-300">
      <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white p-4 sm:p-5 rounded-3xl shadow-2xl border-2 border-emerald-500/80 backdrop-blur-md text-right relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 end-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
            {getAlertIcon(alert.key)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                <span>دخول الوقت • {alert.time}</span>
              </span>
              <button
                type="button"
                onClick={onDismiss}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="font-black text-sm sm:text-base text-white mt-1.5 leading-snug">
              {alert.title}
            </h4>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
              {alert.body}
            </p>

            {/* Quick Action button */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                تقبل الله طاعتكم وصالح أعمالكم
              </span>

              {isPrayer && onRecordPrayer && (
                <button
                  type="button"
                  onClick={() => {
                    onRecordPrayer(alert.key);
                    onDismiss();
                  }}
                  className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تسجيل الأداء الآن</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
