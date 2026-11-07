import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Heart,
  Volume2,
  VolumeX,
  Check,
  ChevronDown,
  Save,
  BookOpen,
  SunMedium,
  Moon,
  Flame,
  Award,
} from 'lucide-react';
import { AdhkarReaderModal } from './AdhkarReaderModal.jsx';

export const COMPREHENSIVE_DHIKR_LIST = [
  { id: 'subhanallah', title: 'سُبْحَانَ اللَّهِ', meaning: 'تنزيه الله تعالى عن كل نقص وعيب' },
  { id: 'alhamdulillah', title: 'الْحَمْدُ لِلَّهِ', meaning: 'الثناء والشكر الكامل لله سبحانه' },
  { id: 'la_ilaha_illallah', title: 'لَا إِلَهَ إِلَّا اللَّهُ', meaning: 'أفضل الذكر وكلمة الإخلاص والتوحيد' },
  { id: 'allahu_akbar', title: 'اللَّهُ أَكْبَرُ', meaning: 'الله أعظم وأجلّ من كل شيء' },
  { id: 'astaghfirullah', title: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', meaning: 'طلب المغفرة والتوبة الصادقة من الذنوب' },
  { id: 'salawat', title: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', meaning: 'الصلاة والسلام على رسول الله صلى الله عليه وسلم' },
  { id: 'subhan_bihamdih', title: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ', meaning: 'حبيبتان إلى الرحمن، خفيفتان على اللسان، ثقيلتان في الميزان' },
  { id: 'hawqala', title: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', meaning: 'كنز من كنوز الجنة وبراءة من الحول والقوة إلا بالله' },
  { id: 'tawheed_complete', title: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', meaning: 'تعدل عتق عشر رقاب، وحرز من الشيطان' },
  { id: 'yunus_dua', title: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ', meaning: 'دعوة ذي النون: ما دعا بها مسلم في كرب إلا استجاب الله له' },
  { id: 'hasbiyallah', title: 'حَسْبِيَ اللَّهُ وَنِعْمَ الْوَكِيلُ', meaning: 'تفويض الأمر لله والتوكل المطلق عليه' },
  { id: 'sayyid_istighfar', title: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ', meaning: 'سيد الاستغفار وأعظم صيغ طلب التوبة' },
  { id: 'subhan_adad', title: 'سُبْحَانَ اللَّهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ', meaning: 'تسبيح مضاعف الأجر والثواب' },
  { id: 'bismillah_la_yadurru', title: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ', meaning: 'حفظ ووقاية من فجأة البلاء والشرور' },
  { id: 'raditu_billah', title: 'رَضِيتُ بِاللَّهِ رَبّاً، وَبِالْإِسْلَامِ دِيناً، وَبِمُحَمَّدٍ ﷺ نَبِيّاً', meaning: 'وجبت له الجنة ورضا الله يوم القيامة' },
];

const TARGETS = [
  { value: 33, label: '33 (تسبيح دبر الصلاة)' },
  { value: 100, label: '100 (أذكار اليوم)' },
  { value: 0, label: 'مفتوح (تسبيح حر)' },
];

export function TasbeehCounter({ todayStr, onSaveCount, initialCount = 0 }) {
  const [selectedDhikr, setSelectedDhikr] = useState(COMPREHENSIVE_DHIKR_LIST[0]);
  const [target, setTarget] = useState(33);
  const [count, setCount] = useState(0);
  const [laps, setLaps] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(initialCount);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customDhikr, setCustomDhikr] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [showDhikrMenu, setShowDhikrMenu] = useState(false);
  const [savingSync, setSavingSync] = useState(false);
  const [syncedSuccess, setSyncedSuccess] = useState(false);
  const [adhkarModalOpen, setAdhkarModalOpen] = useState(false);
  const [adhkarModalCategory, setAdhkarModalCategory] = useState('morning');

  // Load saved counter from localStorage for the current day
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mutabi_tasbeeh_${todayStr || 'today'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCount(Number(parsed.count) || 0);
        setLaps(Number(parsed.laps) || 0);
        setDailyTotal(Number(parsed.dailyTotal) || initialCount || 0);
      }
    } catch {
      // ignore
    }
  }, [todayStr]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        `mutabi_tasbeeh_${todayStr || 'today'}`,
        JSON.stringify({ count, laps, dailyTotal })
      );
    } catch {
      // ignore
    }
  }, [count, laps, dailyTotal, todayStr]);

  // Subtle web audio synthesizer click sound
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // audio error safely caught
    }
  };

  const handleTap = () => {
    playClickSound();
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }

    const nextCount = count + 1;
    const nextDaily = dailyTotal + 1;
    setDailyTotal(nextDaily);

    if (target > 0 && nextCount >= target) {
      setCount(0);
      setLaps((prev) => prev + 1);
      confetti({
        particleCount: 40,
        spread: 55,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#059669', '#f59e0b'],
      });
    } else {
      setCount(nextCount);
    }
  };

  // Immediate Reset of the current round (no blocking confirm that breaks in iFrames)
  const handleResetLap = () => {
    setCount(0);
    setLaps(0);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Complete reset of daily total
  const handleResetDaily = () => {
    setCount(0);
    setLaps(0);
    setDailyTotal(0);
    if (onSaveCount) {
      onSaveCount(0, selectedDhikr.title);
    }
  };

  const handleSaveToLog = async () => {
    if (!onSaveCount) return;
    setSavingSync(true);
    try {
      await onSaveCount(dailyTotal, currentDhikrTitle);
      setSyncedSuccess(true);
      setTimeout(() => setSyncedSuccess(false), 3000);
    } finally {
      setSavingSync(false);
    }
  };

  const currentDhikrTitle = isCustom && customDhikr ? customDhikr : selectedDhikr.title;

  return (
    <div className="space-y-6 text-right">
      {/* Top Banner: Adhkar Quick Access (أذكار الصباح والمساء) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Morning Adhkar Button */}
        <div
          onClick={() => {
            setAdhkarModalCategory('morning');
            setAdhkarModalOpen(true);
          }}
          className="p-4 sm:p-5 bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 rounded-3xl cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-4 select-none"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <SunMedium className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>أذكار الصباح</span>
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                  13 ذكراً
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                قراءة متأنية مع عدّاد تفاعلي لكل ذكر
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-2xs whitespace-nowrap"
          >
            فتح وقراءة
          </button>
        </div>

        {/* Evening Adhkar Button */}
        <div
          onClick={() => {
            setAdhkarModalCategory('evening');
            setAdhkarModalOpen(true);
          }}
          className="p-4 sm:p-5 bg-gradient-to-l from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-300 dark:border-indigo-800/80 rounded-3xl cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-4 select-none"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>أذكار المساء</span>
                <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                  11 ذكراً
                </span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حصن المسلم والوقاية والسكينة
              </p>
            </div>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs whitespace-nowrap"
          >
            فتح وقراءة
          </button>
        </div>
      </div>

      {/* Main Tasbeeh Counter Card */}
      <div className="bg-white dark:bg-slate-900 border border-emerald-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm relative overflow-hidden transition-all text-right">
        {/* Ambient background blur */}
        <div className="absolute top-0 start-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm shadow-emerald-600/20">
              📿
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                <span>مسبحة الأذكار الرقمية</span>
                <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                  ورد التسبيح
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                «أَحَبُّ الْكَلامِ إِلَى اللَّهِ أَرْبَعٌ: سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلا إِلَهَ إِلا اللَّهُ، وَاللَّهُ أَكْبَرُ»
              </p>
            </div>
          </div>

          {/* Controls: Audio Toggle & Quick Reset Round */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                soundEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={soundEnabled ? 'كتم الصوت' : 'تفعيل صوت النقر'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
              <span className="text-[11px]">{soundEnabled ? 'صوت' : 'صامت'}</span>
            </button>

            {/* Direct Lap Reset Button (Works 100% reliably) */}
            <button
              type="button"
              onClick={handleResetLap}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all"
              title="تصفير الدورة الحالية"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>تصفير الدورة</span>
            </button>
          </div>
        </div>

        {/* Dhikr Selector Bar */}
        <div className="mt-5 relative">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            اختر الذكر للتسبيح به ({COMPREHENSIVE_DHIKR_LIST.length} ذكر مسنون ومبارك):
          </label>
          <button
            type="button"
            onClick={() => setShowDhikrMenu(!showDhikrMenu)}
            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl flex items-center justify-between gap-3 text-right transition-all shadow-2xs"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                الذِكْر المختار حالياً:
              </span>
              <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white block truncate font-serif">
                {currentDhikrTitle}
              </span>
              {!isCustom && (
                <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                  {selectedDhikr.meaning}
                </span>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showDhikrMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Full Dhikr Dropdown Menu */}
          {showDhikrMenu && (
            <div className="absolute top-full inset-x-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 max-h-80 overflow-y-auto animate-in fade-in">
              <div className="space-y-1">
                {COMPREHENSIVE_DHIKR_LIST.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDhikr(d);
                      setIsCustom(false);
                      setShowDhikrMenu(false);
                    }}
                    className={`w-full p-3 rounded-xl text-right transition-all flex items-center justify-between gap-3 ${
                      selectedDhikr.id === d.id && !isCustom
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold font-serif">{d.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{d.meaning}</p>
                    </div>
                    {selectedDhikr.id === d.id && !isCustom && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                ))}

                {/* Custom Dhikr Input */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 px-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                    أو كتابة ذكر مخصص من اختيارك:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اكتب الذكر هنا..."
                      value={customDhikr}
                      onChange={(e) => {
                        setCustomDhikr(e.target.value);
                        setIsCustom(true);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDhikrMenu(false)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                    >
                      تأكيد
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Target Rounds Buttons */}
        <div className="mt-4 flex items-center gap-2 justify-center flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 me-1">
            الهدف للجولة:
          </span>
          {TARGETS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setTarget(t.value);
                setCount(0);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                target === t.value
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Big Interactive Circular Counter Button */}
        <div className="py-8 sm:py-10 flex flex-col items-center justify-center select-none">
          <button
            type="button"
            onClick={handleTap}
            className="group relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-2xl shadow-emerald-700/40 hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center p-4 focus:outline-none focus:ring-8 focus:ring-emerald-400/30 cursor-pointer"
          >
            {/* Outer dotted accent ring */}
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-300/40 pointer-events-none" />

            {/* Current Counter Number */}
            <span className="text-6xl sm:text-7xl font-black tracking-tight drop-shadow-md font-sans">
              {count}
            </span>

            {/* Target and helper text */}
            <span className="text-xs sm:text-sm font-bold text-emerald-100/90 mt-1">
              {target > 0 ? `من ${target}` : 'تسبيح حر مفتوح'}
            </span>

            <span className="text-[11px] text-emerald-200/80 mt-1 bg-white/10 px-3 py-0.5 rounded-full">
              انقر في أي مكان للتسبيح
            </span>
          </button>
        </div>

        {/* Counter Summary Bar & Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Laps */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
              الدورات المكتملة
            </span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
              {laps}
            </span>
          </div>

          {/* Daily Total */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
              مجموع تسبيحات اليوم
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
              {dailyTotal}
            </span>
          </div>

          {/* Reset All Daily Total Button (Reliable action) */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleResetDaily}
              className="w-full py-3 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold rounded-2xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5"
              title="تصفير مجموع تسبيحات اليوم"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير إجمالي اليوم</span>
            </button>
          </div>

          {/* Save to Log Button */}
          <div className="flex items-center">
            <button
              type="button"
              disabled={savingSync || dailyTotal === 0}
              onClick={handleSaveToLog}
              className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              title="حفظ التسبيح في سجل إنجازات اليوم في قاعدة البيانات"
            >
              {syncedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>تم التسجيل في السجل ✓</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{savingSync ? 'جارٍ الحفظ...' : 'حفظ في السجل اليومي'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Adhkar Reader Modal */}
      <AdhkarReaderModal
        isOpen={adhkarModalOpen}
        onClose={() => setAdhkarModalOpen(false)}
        initialCategory={adhkarModalCategory}
        onCompleteCategory={(catTitle) => {
          if (onSaveCount) {
            onSaveCount(1, catTitle);
          }
        }}
      />
    </div>
  );
}
