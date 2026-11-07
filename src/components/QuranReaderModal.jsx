import React, { useState, useEffect, useRef } from 'react';
import { SURAHS } from '../data/quran.js';
import { getSurahAyahs } from '../data/quranTexts.js';
import { useReaderHistory } from '../hooks/useReaderHistory.js';
import {
  BookOpen,
  Moon,
  Eye,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
} from 'lucide-react';

export function QuranReaderModal({ isOpen, onClose, initialSurahNumber = 1, onLogPagesRead }) {
  const [selectedSurah, setSelectedSurah] = useState(initialSurahNumber);
  const [surahContent, setSurahContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef(null);

  // Eye comfort reading modes: 'night' (Dark OLED obsidian) | 'sepia' (Warm parchment) | 'normal'
  const [readerTheme, setReaderTheme] = useState('night');
  // Font Size: 'sm' (17px) | 'md' (21px) | 'lg' (26px) | 'xl' (32px)
  const [fontSize, setFontSize] = useState('lg');
  const closeReader = useReaderHistory(isOpen, onClose, 'quran');

  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
      return;
    }

    let isCancelled = false;

    async function loadSurah() {
      setLoading(true);
      setLoadError(null);
      // Stop current audio when switching Surah
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }

      try {
        const data = await getSurahAyahs(selectedSurah);
        if (!isCancelled) {
          setSurahContent(data);
        }
      } catch (error) {
        console.error('Failed to load the complete Quran surah:', error);
        if (!isCancelled) {
          setSurahContent(null);
          setLoadError(error.message || 'تعذر تحميل نص السورة كاملًا.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadSurah();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedSurah, retryAttempt]);

  if (!isOpen) return null;

  const currentSurahMeta = SURAHS.find((s) => s.number === selectedSurah) || SURAHS[0];

  const toggleAudio = () => {
    if (!audioRef.current) {
      const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${selectedSurah}.mp3`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setAudioPlaying(true);
        setAudioLoading(false);
      };
      audio.onpause = () => setAudioPlaying(false);
      audio.onended = () => setAudioPlaying(false);
      audio.onerror = () => {
        setAudioPlaying(false);
        setAudioLoading(false);
      };

      setAudioLoading(true);
      audio.play().catch(() => {
        setAudioPlaying(false);
        setAudioLoading(false);
      });
    } else {
      if (audioPlaying) {
        audioRef.current.pause();
      } else {
        setAudioLoading(true);
        audioRef.current.play().catch(() => {
          setAudioPlaying(false);
          setAudioLoading(false);
        });
      }
    }
  };

  const themeStyles = {
    normal: {
      modalBg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
      headerBg: 'bg-slate-50 dark:bg-slate-800/80 border-slate-100 dark:border-slate-800',
      pageSurface: 'bg-[#fffdf7] text-[#3d3021] border-[#c8a96b] shadow-[0_12px_40px_rgba(80,55,20,0.12)]',
      ayahBg: 'hover:bg-emerald-900/5',
      frameBorder: 'border-emerald-600/30 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/10',
      bismillahColor: 'text-emerald-800 dark:text-emerald-300',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      ayahMarker: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40',
      subText: 'text-slate-500 dark:text-slate-400',
    },
    night: {
      modalBg: 'bg-[#0a0d14] border-slate-800 text-[#e2e8f0]',
      headerBg: 'bg-[#0f1523] border-slate-800/90',
      pageSurface: 'bg-[#111827] text-[#f1e7d0] border-amber-500/50 shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
      ayahBg: 'hover:bg-white/5',
      frameBorder: 'border-amber-500/30 bg-amber-950/10',
      bismillahColor: 'text-amber-300',
      badgeBg: 'bg-slate-800/80 text-slate-300',
      ayahMarker: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
      subText: 'text-slate-400',
    },
    sepia: {
      modalBg: 'bg-[#fbf7ee] border-[#e8dfc8] text-[#3e3427]',
      headerBg: 'bg-[#f4ecdb] border-[#e2d5bc]',
      pageSurface: 'bg-[#f7efdf] text-[#49391f] border-[#b89b66] shadow-[0_12px_40px_rgba(80,55,20,0.12)]',
      ayahBg: 'hover:bg-amber-900/5',
      frameBorder: 'border-[#c4ad85] bg-[#f5ede0]',
      bismillahColor: 'text-[#6d4c18]',
      badgeBg: 'bg-[#ebdcc4] text-[#42331c]',
      ayahMarker: 'text-[#8b6528] border-[#c4ad85] bg-[#ebdcc4]/50',
      subText: 'text-[#7d6f5c]',
    },
  }[readerTheme];

  const fontClass = {
    sm: 'text-base sm:text-lg leading-[2.2]',
    md: 'text-lg sm:text-xl leading-[2.35]',
    lg: 'text-xl sm:text-2xl leading-[2.5]',
    xl: 'text-2xl sm:text-3xl leading-[2.65]',
  }[fontSize];

  const handlePrevSurah = () => {
    if (selectedSurah > 1) setSelectedSurah(selectedSurah - 1);
  };

  const handleNextSurah = () => {
    if (selectedSurah < 114) setSelectedSurah(selectedSurah + 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="قارئ القرآن الكريم"
      className="fixed inset-0 z-[70] h-[100dvh] w-full bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        className={`h-full w-full max-w-none flex flex-col shadow-2xl overflow-hidden text-right transition-colors duration-200 ${themeStyles.modalBg}`}
      >
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${themeStyles.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>سورة {currentSurahMeta.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${themeStyles.badgeBg}`}>
                  {currentSurahMeta.type === 'meccan' ? 'مكية' : 'مدنية'} • {currentSurahMeta.ayahsCount} آية
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${themeStyles.badgeBg}`}>
                  عرض المصحف
                </span>
              </h3>
              <p className={`text-xs ${themeStyles.subText}`}>
                المصحف الشريف بالرسم العثماني المعتمد مع وضع حماية العين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Recitation Player Button */}
            <button
              type="button"
              onClick={toggleAudio}
              className={`p-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold transition-all border cursor-pointer ${
                audioPlaying
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm animate-pulse'
                  : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
              }`}
              title="الاستماع للتلاوة بصوت الشيخ مشاري العفاسي"
            >
              {audioLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : audioPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {audioPlaying ? 'إيقاف التلاوة' : 'تلاوة صوتية'}
              </span>
            </button>

            <button
              type="button"
              onClick={closeReader}
              aria-label="إغلاق قارئ القرآن"
              className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 text-current flex items-center justify-center shrink-0 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reader Comfort Controls & Navigation Bar */}
        <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 flex-wrap ${themeStyles.headerBg}`}>
          {/* Surah quick switcher */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={selectedSurah <= 1}
              onClick={handlePrevSurah}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 disabled:opacity-30 cursor-pointer"
              title="السورة السابقة"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <select
              value={selectedSurah}
              onChange={(e) => setSelectedSurah(Number(e.target.value))}
              className="bg-black/5 dark:bg-white/5 border border-current/10 rounded-xl px-2.5 py-1 text-xs font-bold text-current focus:outline-none"
            >
              {SURAHS.map((s) => (
                <option key={s.number} value={s.number} className="text-slate-900 bg-white">
                  {s.number}. سورة {s.name} ({s.ayahsCount} آية)
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={selectedSurah >= 114}
              onClick={handleNextSurah}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 disabled:opacity-30 cursor-pointer"
              title="السورة التالية"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Reading Night Modes & Font Size Adjuster */}
          <div className="flex items-center gap-3">
            {/* Eye-friendly Theme options */}
            <div className="flex items-center gap-1" title="نمط الإضاءة وحماية العين">
              <button
                type="button"
                onClick={() => setReaderTheme('night')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  readerTheme === 'night'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="الوضع الليلي المركز (راحة العين في الظلام)"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>ليلي مريح</span>
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('sepia')}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  readerTheme === 'sepia'
                    ? 'bg-[#d6c5a3] text-[#2c2214] font-black shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="ورق دافئ (سيبيا مريح للبصر)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>دافئ</span>
              </button>
              <button
                type="button"
                onClick={() => setReaderTheme('normal')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  readerTheme === 'normal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="الوضع العادي"
              >
                عادي
              </button>
            </div>

            {/* Font Size Buttons */}
            <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl">
              <span className="text-[10px] px-1 opacity-70">حجم الخط:</span>
              {['sm', 'md', 'lg', 'xl'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setFontSize(sz)}
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    fontSize === sz
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {sz === 'sm' ? 'ص' : sz === 'md' ? 'م' : sz === 'lg' ? 'ك' : 'ك+'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quran Surah Reading Body */}
        <div className="flex-1 overflow-y-auto bg-black/[0.025] p-3 sm:p-6 md:p-8 dark:bg-black/10">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className={`text-xs ${themeStyles.subText}`}>جارٍ جلب الآيات الكريمة بالرسم العثماني المعتمد...</p>
            </div>
          ) : loadError ? (
            <div role="alert" className="mx-auto max-w-lg py-20 text-center">
              <p className="font-bold text-rose-500">{loadError}</p>
              <button
                type="button"
                onClick={() => setRetryAttempt((attempt) => attempt + 1)}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <article
              dir="rtl"
              aria-label={`صفحة مصحف سورة ${currentSurahMeta.name}`}
              className={`quran-mushaf-page relative mx-auto min-h-[65vh] w-full max-w-4xl rounded-xl border-2 px-5 py-8 sm:px-10 sm:py-10 ${themeStyles.pageSurface}`}
            >
              <div className="relative z-10 space-y-7">
              <div className="text-center">
                <div className={`mx-auto max-w-xl space-y-2 rounded-xl border border-current/20 bg-current/[0.025] px-3 py-3 sm:px-5 ${themeStyles.frameBorder}`}>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-serif opacity-50">۞</span>
                  <h4 className="quran-text text-2xl font-bold tracking-wide sm:text-3xl">
                    سُورَةُ {currentSurahMeta.name}
                  </h4>
                  <span className="text-xs font-serif opacity-50">۞</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-[10px] opacity-75 sm:gap-3 sm:text-xs">
                  <span>{currentSurahMeta.type === 'meccan' ? 'مكية' : 'مدنية'}</span>
                  <span aria-hidden="true">۞</span>
                  <span>{currentSurahMeta.ayahsCount} آية</span>
                </div>
                </div>

                {/* Basmalah for all except Surah 1 and Surah 9 */}
                {selectedSurah !== 1 && selectedSurah !== 9 && (
                  <div className="pt-5">
                    <p className={`quran-text text-xl font-bold sm:text-2xl ${themeStyles.bismillahColor}`}>
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </p>
                  </div>
                )}
              </div>

              <div className={`quran-text text-justify ${fontClass} px-1 sm:px-3`}>
                {surahContent?.ayahs?.map((ayah) => (
                  <span
                    key={ayah.number}
                    className={`inline rounded-md px-0.5 transition-colors ${themeStyles.ayahBg}`}
                  >
                    <span>{ayah.text}</span>{' '}
                    <span
                      className={`inline-flex h-7 min-w-[28px] select-none items-center justify-center rounded-full border px-1.5 align-middle font-sans text-[11px] font-black ${themeStyles.ayahMarker}`}
                      title={`آية ${ayah.number}`}
                    >
                      {ayah.number}
                    </span>{' '}
                  </span>
                ))}
              </div>
              </div>
            </article>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t flex items-center justify-between gap-3 ${themeStyles.headerBg}`}>
          <div className="flex items-center gap-2 text-xs opacity-75">
            <span>بداية السورة في المصحف: صفحة {currentSurahMeta.startPage}</span>
          </div>

          <div className="flex items-center gap-2">
            {onLogPagesRead && (
              <button
                type="button"
                onClick={() => {
                  onLogPagesRead(currentSurahMeta);
                  closeReader();
                }}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تسجيل قراءة هذه السورة في الورد</span>
              </button>
            )}

            <button
              type="button"
              onClick={closeReader}
              className="py-2.5 px-5 bg-black/10 dark:bg-white/10 hover:bg-black/20 text-current font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              إلغاء وإغلاق المصحف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
