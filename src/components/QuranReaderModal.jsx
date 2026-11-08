import React, { useState, useEffect, useRef } from 'react';
import { SURAHS, TOTAL_PAGES } from '../data/quran.js';
import { getSurahAyahs, getSurahTafseer } from '../data/quranTexts.js';
import { getQuranDivisionByPage } from '../lib/quranDivision.js';
import {
  BookOpen,
  Moon,
  Sun,
  Eye,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Layers,
  Sparkles,
  Copy,
  Check,
  Volume2,
  Maximize2,
  BookMarked,
  Type,
  ChevronDown,
  Sliders,
  Share2,
} from 'lucide-react';

// Authentic Uthmani Calligraphy Typefaces optimized for reader eye comfort
export const UTHMANI_FONTS = [
  {
    id: 'hafs',
    name: 'مصحف حفص (عثماني أصيل)',
    shortName: 'حفص عثماني',
    className: 'font-quran-hafs',
    fontFamily: "'Amiri Quran', 'Amiri', serif",
    description: 'الرسم العثماني الملكي المعتمد بمجمع الملك فهد لطباعة المصحف الشريف مع ضبط التشكيل وعلامات الوقف الدقيقة.',
  },
  {
    id: 'scheherazade',
    name: 'النسخ العثماني الميسر (Scheherazade)',
    shortName: 'نسخ ميسر',
    className: 'font-quran-scheherazade',
    fontFamily: "'Scheherazade New', 'Amiri', serif",
    description: 'خط عثماني واسع ومريح جداً للعين ومصمم خصيصاً للقراءة المتواصلة دون إجهاد بصري.',
  },
  {
    id: 'naskh',
    name: 'النسخ القرآني فائق الوضوح (Noto Naskh)',
    shortName: 'نسخ واضح',
    className: 'font-quran-naskh',
    fontFamily: "'Noto Naskh Arabic', serif",
    description: 'خط عربي حديث عالي الدقة والوضوح لجميع أحجام الشاشات وتسهيل قراءة الحركات.',
  },
  {
    id: 'amiri',
    name: 'الأميري المصحفي (Amiri Classic)',
    shortName: 'أميري كلاسيكي',
    className: 'font-quran-amiri',
    fontFamily: "'Amiri', serif",
    description: 'الخط الطباعي المصري التراثي المأخوذ من مصحف الملك فؤاد التاريخي.',
  },
];

export function QuranReaderModal({
  isOpen,
  onClose,
  initialSurahNumber = 1,
  onLogPagesRead,
}) {
  const [selectedSurah, setSelectedSurah] = useState(initialSurahNumber || 1);
  const [surahData, setSurahData] = useState(null);
  const [tafseerMap, setTafseerMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [surahLoadError, setSurahLoadError] = useState(null);
  const [tafseerLoading, setTafseerLoading] = useState(false);
  const [tafseerError, setTafseerError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);

  // Single Ayah audio recitation
  const singleAyahAudioRef = useRef(null);
  const [singleAyahPlaying, setSingleAyahPlaying] = useState(false);

  // View Mode: 'text' (Large crystal-clear Arabic calligraphy) | 'page' (Full physical Madinah Mushaf page)
  const [viewMode, setViewMode] = useState('text');

  // Font Size for text view (1: 22px, 2: 27px, 3: 33px, 4: 40px, 5: 48px)
  const [fontScale, setFontScale] = useState(3);

  // Eye comfort lighting themes: 'sepia' (Warm parchment) | 'night' (OLED amber) | 'clean' (Pure white)
  const [lightingTheme, setLightingTheme] = useState(() => {
    return localStorage.getItem('mutabi_quran_theme') || 'sepia';
  });

  // Dedicated Sepia Quick-Switch previous theme memory
  const [previousNonSepiaTheme, setPreviousNonSepiaTheme] = useState('clean');

  // Selected Uthmani Font (stored in localStorage)
  const [selectedFontId, setSelectedFontId] = useState(() => {
    return localStorage.getItem('mutabi_quran_font') || 'hafs';
  });
  const [showFontMenu, setShowFontMenu] = useState(false);

  // Immersive Zen Reading Mode (Toggles top and bottom toolbars upon tapping page canvas)
  const [showControls, setShowControls] = useState(true);

  // Tafseer Bottom Sheet state
  const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState(null);
  const [copiedTafseer, setCopiedTafseer] = useState(false);

  // Sync initial Surah
  useEffect(() => {
    if (initialSurahNumber && initialSurahNumber >= 1 && initialSurahNumber <= 114) {
      setSelectedSurah(initialSurahNumber);
    }
  }, [initialSurahNumber, isOpen]);

  // Save lighting theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mutabi_quran_theme', lightingTheme);
    } catch {}
  }, [lightingTheme]);

  // Save font preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mutabi_quran_font', selectedFontId);
    } catch {}
  }, [selectedFontId]);

  // Load the Quran text and tafseer independently so a tafseer outage cannot block reading.
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
      if (singleAyahAudioRef.current) {
        singleAyahAudioRef.current.pause();
        setSingleAyahPlaying(false);
      }
      setSelectedAyahForTafseer(null);
      return;
    }

    let isCancelled = false;
    async function fetchSurahAndTafseer() {
      setLoading(true);
      setSurahData(null);
      setSurahLoadError(null);
      setTafseerMap({});
      setTafseerLoading(true);
      setTafseerError(null);
      setSelectedAyahForTafseer(null);
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
      if (singleAyahAudioRef.current) {
        singleAyahAudioRef.current.pause();
        setSingleAyahPlaying(false);
      }
      const [versesResult, tafseerResult] = await Promise.allSettled([
        getSurahAyahs(selectedSurah),
        getSurahTafseer(selectedSurah),
      ]);
      if (isCancelled) return;

      if (versesResult.status === 'fulfilled') {
        setSurahData(versesResult.value);
      } else {
        console.error('Failed to load Quran verses:', versesResult.reason);
        setSurahLoadError('تعذر تحميل آيات السورة. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
      }
      setLoading(false);

      if (tafseerResult.status === 'fulfilled') {
        setTafseerMap(tafseerResult.value);
      } else {
        console.error('Failed to load Quran tafseer:', tafseerResult.reason);
        setTafseerError('تعذر تحميل التفسير الآن. يمكنك إعادة المحاولة.');
      }
      setTafseerLoading(false);
    }

    fetchSurahAndTafseer();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedSurah, loadAttempt]);

  const retryTafseer = async () => {
    setTafseerLoading(true);
    setTafseerError(null);
    try {
      setTafseerMap(await getSurahTafseer(selectedSurah));
    } catch (retryError) {
      console.error('Failed to retry Quran tafseer:', retryError);
      setTafseerError('تعذر تحميل التفسير الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
    } finally {
      setTafseerLoading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNextSurah();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePrevSurah();
      } else if (e.key === 'Escape') {
        if (showFontMenu) {
          setShowFontMenu(false);
        } else if (selectedAyahForTafseer) {
          setSelectedAyahForTafseer(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedSurah, selectedAyahForTafseer, showFontMenu]);

  const currentMeta = SURAHS.find((s) => s.number === selectedSurah) || SURAHS[0];
  const currentFont = UTHMANI_FONTS.find((f) => f.id === selectedFontId) || UTHMANI_FONTS[0];

  const handleNextSurah = () => {
    if (selectedSurah < 114) {
      setSelectedSurah((prev) => prev + 1);
      setSelectedAyahForTafseer(null);
    }
  };

  const handlePrevSurah = () => {
    if (selectedSurah > 1) {
      setSelectedSurah((prev) => prev - 1);
      setSelectedAyahForTafseer(null);
    }
  };

  // Dedicated Sepia Quick-Switch Toggle (مفتاح تبديل سريع لنمط سيبيا)
  const isSepiaActive = lightingTheme === 'sepia';
  const toggleSepia = () => {
    if (isSepiaActive) {
      // Revert to non-sepia theme
      setLightingTheme(previousNonSepiaTheme || 'clean');
    } else {
      // Remember current theme and activate sepia
      setPreviousNonSepiaTheme(lightingTheme);
      setLightingTheme('sepia');
    }
  };

  // Toggle full surah audio
  const toggleAudio = () => {
    if (singleAyahAudioRef.current) {
      singleAyahAudioRef.current.pause();
      setSingleAyahPlaying(false);
    }

    if (!audioRef.current) {
      const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${selectedSurah}.mp3`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => setAudioPlaying(true);
      audio.onpause = () => setAudioPlaying(false);
      audio.onended = () => setAudioPlaying(false);
      audio.onerror = () => setAudioPlaying(false);

      audio.play().catch(() => setAudioPlaying(false));
    } else {
      if (audioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setAudioPlaying(false));
      }
    }
  };

  // Calculate global Ayah index in Quran (1..6236) for single verse audio
  const getGlobalAyahNumber = (surahNum, ayahNumInSurah) => {
    const priorAyahs = SURAHS.slice(0, surahNum - 1).reduce((acc, s) => acc + s.ayahsCount, 0);
    return priorAyahs + ayahNumInSurah;
  };

  // Play / Pause single Ayah audio
  const toggleSingleAyahAudio = (ayahNumInSurah) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }

    const globalNum = getGlobalAyahNumber(selectedSurah, ayahNumInSurah);
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`;

    if (singleAyahAudioRef.current) {
      singleAyahAudioRef.current.pause();
      if (singleAyahPlaying) {
        setSingleAyahPlaying(false);
        return;
      }
    }

    const audio = new Audio(audioUrl);
    singleAyahAudioRef.current = audio;

    audio.onplay = () => setSingleAyahPlaying(true);
    audio.onpause = () => setSingleAyahPlaying(false);
    audio.onended = () => setSingleAyahPlaying(false);
    audio.onerror = () => setSingleAyahPlaying(false);

    audio.play().catch(() => setSingleAyahPlaying(false));
  };

  // Open Tafseer sheet for specific Ayah
  const handleOpenTafseer = (ayah, e) => {
    if (e) e.stopPropagation();
    setSelectedAyahForTafseer(ayah);
    setCopiedTafseer(false);
  };

  // Navigate between ayahs in Tafseer
  const handleTafseerStep = (direction) => {
    if (!selectedAyahForTafseer || !surahData?.ayahs) return;
    const currentIndex = surahData.ayahs.findIndex((a) => a.number === selectedAyahForTafseer.number);
    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < surahData.ayahs.length) {
      if (singleAyahAudioRef.current) {
        singleAyahAudioRef.current.pause();
        setSingleAyahPlaying(false);
      }
      setSelectedAyahForTafseer(surahData.ayahs[nextIndex]);
      setCopiedTafseer(false);
    }
  };

  // Copy Ayah text + Tafseer
  const handleCopyTafseer = () => {
    if (!selectedAyahForTafseer) return;
    const textToCopy = `﴿ ${selectedAyahForTafseer.text} ﴾ [سورة ${currentMeta.name}: ${selectedAyahForTafseer.number}]\n\nالتفسير الميسر:\n${
      tafseerMap[selectedAyahForTafseer.number] || 'جارٍ جلب التفسير...'
    }`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedTafseer(true);
      setTimeout(() => setCopiedTafseer(false), 2200);
    });
  };

  if (!isOpen) return null;

  // Complete, fully-isolated eye-comfort lighting themes
  // (Ensures night mode has ultra-crisp, bright luminous text that is NEVER dark)
  const themes = {
    // 1. نمط سيبيا (الورق الدافئ) - ورق طبيعي مريح جداً للعين يقلل الضوء الأزرق
    sepia: {
      screenBg: 'bg-[#faf5ea] text-[#2c2214]',
      headerBg: 'bg-[#f4ebe0]/95 border-[#e3d5be] text-[#2c2214]',
      bannerBg: 'bg-[#f0e3d0] border-[#d8c3a5] text-[#2c2214]',
      verseTextColor: 'text-[#2c2214]',
      verseHover: 'hover:bg-[#f3e7d5]',
      bismillahColor: 'text-[#6b4716]',
      ayahMarker: 'text-[#7c561f] border-[#d8c3a5] bg-[#ebdcc4]/80 hover:bg-[#7c561f] hover:text-white',
      activeBtn: 'bg-[#7c561f] text-white',
      pageImageFrame: 'border-[#dfd1ba] shadow-xl',
      pageImageFilter: 'none',
      subText: 'text-[#7d6f5c]',
      drawerBg: 'bg-[#faf5ea] border-[#e3d5be] text-[#2c2214]',
      drawerCard: 'bg-[#f4ebe0] border-[#e3d5be]',
      drawerHighlight: 'text-[#7c561f]',
      sepiaPillBg: 'bg-[#7c561f] text-white border-[#7c561f]',
    },
    // 2. الوضع الليلي المركز - شاشات OLED وراحة العين التامة بنصوص مضيئة فائقة التباين
    night: {
      screenBg: 'bg-[#080c14] text-[#f8fafc]',
      headerBg: 'bg-[#0d1320]/95 border-slate-800 text-[#f8fafc]',
      bannerBg: 'bg-[#101827] border-slate-800 text-[#f8fafc]',
      verseTextColor: 'text-[#f8fafc]',
      verseHover: 'hover:bg-slate-800/70',
      bismillahColor: 'text-amber-300',
      ayahMarker: 'text-amber-300 border-amber-500/50 bg-amber-950/70 hover:bg-amber-400 hover:text-slate-950',
      activeBtn: 'bg-emerald-600 text-white',
      pageImageFrame: 'border-slate-800 shadow-2xl',
      pageImageFilter: 'invert(0.92) hue-rotate(180deg) brightness(0.94) contrast(1.15)',
      subText: 'text-slate-300',
      drawerBg: 'bg-[#0d1320] border-slate-800 text-[#f8fafc]',
      drawerCard: 'bg-[#141d2e] border-slate-700/70',
      drawerHighlight: 'text-amber-300',
      sepiaPillBg: 'bg-black/5 hover:bg-black/10 border-current/10',
    },
    // 3. الوضع الفاتح النقي - وضوح وتباين عالي
    clean: {
      screenBg: 'bg-white text-slate-900',
      headerBg: 'bg-slate-50/95 border-slate-200 text-slate-900',
      bannerBg: 'bg-slate-100 border-slate-200 text-slate-900',
      verseTextColor: 'text-slate-900',
      verseHover: 'hover:bg-slate-100/80',
      bismillahColor: 'text-emerald-800',
      ayahMarker: 'text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-600 hover:text-white',
      activeBtn: 'bg-emerald-600 text-white',
      pageImageFrame: 'border-slate-200 shadow-lg',
      pageImageFilter: 'none',
      subText: 'text-slate-500',
      drawerBg: 'bg-white border-slate-200 text-slate-900',
      drawerCard: 'bg-slate-50 border-slate-200',
      drawerHighlight: 'text-emerald-700',
      sepiaPillBg: 'bg-black/5 hover:bg-black/10 border-current/10',
    },
  }[lightingTheme];

  // Font sizing styles for crystal clear viewing
  const fontStyle = {
    1: 'text-xl sm:text-2xl leading-[2.6]',
    2: 'text-2xl sm:text-3xl leading-[2.8]',
    3: 'text-3xl sm:text-4xl leading-[3.0]',
    4: 'text-4xl sm:text-5xl leading-[3.2]',
    5: 'text-5xl sm:text-6xl leading-[3.4]',
  }[fontScale];

  const paddedPage = String(currentMeta.startPage).padStart(3, '0');
  const pageImageUrl = `https://files.quran.app/hafs/madani/width_1024/page${paddedPage}.png`;
  const division = getQuranDivisionByPage(currentMeta.startPage, selectedSurah);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors duration-200 ${themes.screenBg} animate-in fade-in select-none`}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="المصحف الشريف"
      onClick={() => {
        if (showFontMenu) setShowFontMenu(false);
      }}
    >
      {/* Sleek, Distraction-Free Header Bar - Slides smoothly on tap */}
      <header
        className={`fixed top-0 inset-x-0 px-4 sm:px-8 py-3 border-b flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-30 transition-transform duration-300 ease-in-out ${
          showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } ${themes.headerBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Right: Surah info & quick switcher */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={selectedSurah}
                onChange={(e) => {
                  setSelectedSurah(Number(e.target.value));
                  setSelectedAyahForTafseer(null);
                }}
                className="font-black text-base sm:text-lg bg-transparent border-none focus:outline-none cursor-pointer pr-1"
                title="اضغط لتغيير السورة"
              >
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number} className="text-slate-900 bg-white">
                    {s.number}. سورة {s.name} ({s.type === 'meccan' ? 'مكية' : 'مدنية'})
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-xs ${themes.subText} hidden sm:block`}>
              {currentMeta.type === 'meccan' ? 'مكية' : 'مدنية'} • {currentMeta.ayahsCount} آية • الجزء {division.juz} • الحزب {division.hizb} • {division.rubNameInHizb} (صفحة {currentMeta.startPage})
            </p>
          </div>
        </div>

        {/* Center: Reading Comfort Tools (Sepia Quick Toggle, Uthmani Font Selector, Lighting & Zoom) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* 1. Quick Sepia Switch Toggle (مفتاح تبديل سريع لنمط سيبيا) */}
          <button
            type="button"
            onClick={toggleSepia}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
              isSepiaActive
                ? 'bg-[#7c561f] text-white border-[#7c561f] shadow-sm ring-2 ring-[#7c561f]/25'
                : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
            }`}
            title={isSepiaActive ? 'إيقاف نمط سيبيا والعودة للوضع السابق' : 'تفعيل مفتاح نمط الورق الدافئ (Sepia) لراحة العين'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="font-bold">سيبيا</span>
            {/* Elegant visual toggle switch pill */}
            <span
              className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                isSepiaActive ? 'bg-amber-300 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className={`w-3 h-3 rounded-full transition-transform ${isSepiaActive ? 'bg-[#2c2214]' : 'bg-white'}`} />
            </span>
          </button>

          {/* 2. Uthmani Font Family Selector (تغيير الخطوط إلى خطوط عثمانية واضحة) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFontMenu((prev) => !prev);
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-2xl text-xs font-bold bg-black/5 dark:bg-white/5 border border-current/10 hover:bg-black/10 flex items-center gap-1.5 transition cursor-pointer"
              title="اختيار نوع الخط العثماني لراحة القراءة"
            >
              <Type className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline font-bold">{currentFont.shortName}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Font Picker Popover */}
            {showFontMenu && (
              <div
                className={`absolute left-0 mt-2 w-72 p-2 rounded-2xl border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 ${themes.drawerBg}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-current/10 mb-1">
                  <p className="text-xs font-black">الخطوط العثمانية لراحة العين</p>
                  <p className={`text-[10px] ${themes.subText}`}>اختر الخط الأنسب لراحتك البصرية أثناء التلاوة</p>
                </div>
                <div className="space-y-1">
                  {UTHMANI_FONTS.map((font) => {
                    const isSelected = font.id === selectedFontId;
                    return (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => {
                          setSelectedFontId(font.id);
                          setShowFontMenu(false);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl transition cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-xs font-bold">{font.name}</p>
                          <p className={`text-[11px] mt-0.5 line-clamp-1 ${isSelected ? 'text-emerald-100' : themes.subText}`}>
                            {font.description}
                          </p>
                          {/* Sample text preview */}
                          <p className={`text-base mt-1 ${font.className} ${isSelected ? 'text-white' : themes.drawerHighlight}`}>
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. Theme Presets (ورق دافئ / ليلي / فاتح) */}
          <div className="hidden lg:flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-current/10">
            <button
              type="button"
              onClick={() => setLightingTheme('sepia')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                lightingTheme === 'sepia' ? themes.activeBtn : 'opacity-60 hover:opacity-100'
              }`}
              title="ورق دافئ (سيبيا)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>دافئ</span>
            </button>
            <button
              type="button"
              onClick={() => setLightingTheme('night')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                lightingTheme === 'night' ? themes.activeBtn : 'opacity-60 hover:opacity-100'
              }`}
              title="ليلي مريح"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>ليلي</span>
            </button>
            <button
              type="button"
              onClick={() => setLightingTheme('clean')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                lightingTheme === 'clean' ? themes.activeBtn : 'opacity-60 hover:opacity-100'
              }`}
              title="فاتح نقي"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>فاتح</span>
            </button>
          </div>

          {/* 4. Font Sizer Controls (+ / -) */}
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-2xl border border-current/10">
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.max(1, s - 1))}
              disabled={fontScale <= 1}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold hover:bg-black/10 disabled:opacity-30 cursor-pointer"
              title="تصغير الخط"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black px-1.5 opacity-80" title="حجم الخط">
              {fontScale === 1 ? 'ص' : fontScale === 2 ? 'م' : fontScale === 3 ? 'ك' : fontScale === 4 ? 'ك+' : 'ك++'}
            </span>
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.min(5, s + 1))}
              disabled={fontScale >= 5}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold hover:bg-black/10 disabled:opacity-30 cursor-pointer"
              title="تكبير الخط"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 5. Full Surah Audio Recitation Button */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              audioPlaying
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs animate-pulse'
                : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
            }`}
            title="تلاوة صوتية للسورة كاملة بصوت الشيخ مشاري العفاسي"
          >
            {audioPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden xl:inline">{audioPlaying ? 'إيقاف' : 'تلاوة'}</span>
          </button>
        </div>

        {/* Left: Elegant Close Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-black/10 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs border border-current/10"
            title="إغلاق المصحف والعودة"
            aria-label="إغلاق المصحف"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Fullscreen Quran Canvas - Tapping anywhere toggles zen reading mode */}
      <main
        onClick={() => setShowControls((prev) => !prev)}
        className={`flex-1 min-h-0 overflow-y-auto px-4 sm:px-12 md:px-20 lg:px-32 transition-all duration-300 cursor-default ${
          showControls ? 'pt-20 pb-24 sm:pt-22 sm:pb-24' : 'pt-8 pb-12'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Subtle guidance tip when controls are shown */}
          {showControls && (
            <div className="text-center">
              <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold opacity-75 border border-current/10 bg-black/5`}>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>انقر على أي آية لعرض تفسيرها الميسر • انقر في أي مكان بالشاشة لإخفاء الأشرطة والقراءة بصفاء</span>
              </span>
            </div>
          )}

          {loading ? (
            <div className="py-32 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className={`text-sm font-semibold ${themes.subText}`}>
                جارٍ جلب آيات سورة {currentMeta.name} بالرسم العثماني المعتمد...
              </p>
            </div>
          ) : surahLoadError ? (
            <div className="py-24 text-center space-y-4">
              <p className={`text-sm font-semibold ${themes.subText}`}>{surahLoadError}</p>
              <button
                type="button"
                onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
              >
                إعادة تحميل السورة
              </button>
            </div>
          ) : viewMode === 'page' ? (
            /* Madinah Mushaf Page View */
            <div className="flex flex-col items-center justify-center py-4">
              <img
                src={pageImageUrl}
                alt={`سورة ${currentMeta.name} صفحة ${currentMeta.startPage}`}
                className={`w-full max-w-2xl h-auto max-h-[85vh] object-contain rounded-2xl border ${themes.pageImageFrame}`}
                style={{ filter: themes.pageImageFilter }}
              />
            </div>
          ) : (
            /* Authentic Large Scalable Scripture View in Selected Uthmani Font */
            <div className="space-y-8">
              {/* Surah Ornamental Header Banner */}
              <div className={`text-center py-6 px-6 rounded-3xl border ${themes.bannerBg} space-y-3 shadow-xs relative overflow-hidden`}>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-base font-serif opacity-40">۞</span>
                  <h2 className={`text-2xl sm:text-3xl lg:text-4xl font-black font-serif tracking-wide ${themes.verseTextColor}`}>
                    سُورَةُ {currentMeta.name}
                  </h2>
                  <span className="text-base font-serif opacity-40">۞</span>
                </div>

                <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold ${themes.subText}`}>
                  <span>ترتيبها: {currentMeta.number}</span>
                  <span>•</span>
                  <span>{currentMeta.type === 'meccan' ? 'مكية' : 'مدنية'}</span>
                  <span>•</span>
                  <span>آياتها: {currentMeta.ayahsCount}</span>
                  <span>•</span>
                  <span>الصفحة: {currentMeta.startPage}</span>
                  <span>•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    الجزء {division.juz} • الحزب {division.hizb} • {division.rubNameInHizb}
                  </span>
                </div>

                {/* Basmalah (For all surahs except At-Tawbah and Al-Fatihah) */}
                {selectedSurah !== 1 && selectedSurah !== 9 && (
                  <div className="pt-2">
                    <p className={`text-2xl sm:text-3xl font-bold ${currentFont.className} ${themes.bismillahColor}`}>
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </p>
                  </div>
                )}
              </div>

              {/* The Quranic Scripture Flow - Click any verse to view Tafseer Al-Muyassar */}
              <div
                className={`text-right font-normal tracking-normal ${currentFont.className} ${themes.verseTextColor} ${fontStyle} p-3 rounded-2xl leading-relaxed`}
                style={{
                  fontFamily: currentFont.fontFamily,
                  textAlignLast: 'right',
                  wordSpacing: '0.04em',
                }}
              >
                {surahData?.ayahs?.map((ayah) => {
                  const isSelected = selectedAyahForTafseer?.number === ayah.number;
                  return (
                    <span
                      key={ayah.number}
                      onClick={(e) => handleOpenTafseer(ayah, e)}
                      className={`inline px-1 py-0.5 rounded-xl transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                          : themes.verseHover
                      }`}
                      title={`انقر لعرض تفسير الآية ${ayah.number} وسماعها`}
                    >
                      <span>{ayah.text}</span>{' '}
                      <span
                        className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 mx-1 rounded-full border text-xs font-sans font-black select-none align-middle transition-transform hover:scale-110 active:scale-95 ${themes.ayahMarker}`}
                        title={`الآية ${ayah.number} • اضغط للتفسير`}
                      >
                        {ayah.number}
                      </span>{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Discreet Floating Button to restore controls when hidden */}
      {!showControls && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowControls(true);
          }}
          className={`fixed bottom-5 left-5 z-40 p-3 rounded-2xl shadow-lg border backdrop-blur-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 text-xs font-bold ${themes.headerBg}`}
          title="إظهار شريط الأدوات والخيارات"
        >
          <Maximize2 className="w-4 h-4 text-emerald-500" />
          <span className="hidden sm:inline">إظهار الخيارات</span>
        </button>
      )}

      {/* Minimalist Floating Footer Navigation Bar - Slides smoothly on tap */}
      <footer
        className={`fixed bottom-0 inset-x-0 px-4 sm:px-8 py-3 border-t flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-30 transition-transform duration-300 ease-in-out ${
          showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        } ${themes.headerBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Surah (سهم يمين في الواجهة العربية) */}
        <button
          type="button"
          disabled={selectedSurah <= 1}
          onClick={handlePrevSurah}
          className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="السورة السابقة"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>السابقة</span>
        </button>

        {/* Center: Log in Daily Tracker (+10 Points) & View Mode Toggle */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher (نص مكبر / صفحة المصحف) */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'text' ? 'page' : 'text')}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-black/5 hover:bg-black/10 transition border border-current/10 cursor-pointer hidden sm:flex items-center gap-1.5"
            title="التبديل بين قراءة النص المكبر وصورة صفحة المصحف"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{viewMode === 'text' ? 'عرض صفحة المصحف' : 'عرض النص المكبر'}</span>
          </button>

          {/* Worship Log button */}
          <button
            type="button"
            onClick={() => {
              if (onLogPagesRead) {
                onLogPagesRead(currentMeta);
              }
              localStorage.setItem('mutabi_quran_bookmark_page', String(currentMeta.startPage));
            }}
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
            title="تسجيل قراءة هذه السورة في الورد اليومي واحتساب النقاط"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>تسجيل قراءة الورد (+10 نقاط)</span>
          </button>
        </div>

        {/* Next Surah (سهم يسار في الواجهة العربية) */}
        <button
          type="button"
          disabled={selectedSurah >= 114}
          onClick={handleNextSurah}
          className="flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="السورة التالية"
        >
          <span>التالية</span>
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </footer>

      {/* Tafseer Al-Muyassar Bottom Sheet Drawer (تفسير ميسر بدون تشتيت وراحة تامة للعين) */}
      {selectedAyahForTafseer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300 p-0 sm:p-4 animate-in fade-in"
          onClick={() => {
            if (singleAyahAudioRef.current) {
              singleAyahAudioRef.current.pause();
              setSingleAyahPlaying(false);
            }
            setSelectedAyahForTafseer(null);
          }}
        >
          <div
            className={`w-full max-w-2xl rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] transition-all animate-in slide-in-from-bottom duration-300 ${themes.drawerBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${themes.drawerCard}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <BookMarked className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">
                    التفسير الميسر • الآية {selectedAyahForTafseer.number}
                  </h3>
                  <p className={`text-xs ${themes.subText}`}>
                    سورة {currentMeta.name} ({currentMeta.type === 'meccan' ? 'مكية' : 'مدنية'})
                  </p>
                </div>
              </div>

              {/* Action Buttons: Audio, Copy, Close */}
              <div className="flex items-center gap-1.5">
                {/* Single Ayah Audio Play */}
                <button
                  type="button"
                  onClick={() => toggleSingleAyahAudio(selectedAyahForTafseer.number)}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                    singleAyahPlaying
                      ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse'
                      : 'bg-black/5 hover:bg-black/10 border-current/10'
                  }`}
                  title="استماع لتلاوة هذه الآية فقط (بصوت الشيخ مشاري العفاسي)"
                >
                  {singleAyahPlaying ? <Pause className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{singleAyahPlaying ? 'إيقاف' : 'استماع'}</span>
                </button>

                {/* Copy Verse + Tafseer */}
                <button
                  type="button"
                  onClick={handleCopyTafseer}
                  className="p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-current/10 bg-black/5 hover:bg-black/10 transition cursor-pointer"
                  title="نسخ الآية وتفسيرها"
                >
                  {copiedTafseer ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copiedTafseer ? 'تم النسخ' : 'نسخ'}</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (singleAyahAudioRef.current) {
                      singleAyahAudioRef.current.pause();
                      setSingleAyahPlaying(false);
                    }
                    setSelectedAyahForTafseer(null);
                  }}
                  className="w-8 h-8 rounded-xl bg-black/5 hover:bg-rose-600 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="إغلاق التفسير"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drawer Body - Scrollable comfortable reading */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Ayah Scripture in Ornamental Box using Selected Uthmani Font */}
              <div className={`p-4 sm:p-5 rounded-2xl border text-center space-y-2 ${themes.drawerCard}`}>
                <p
                  className={`text-xl sm:text-2xl font-bold leading-relaxed ${currentFont.className} ${themes.drawerHighlight}`}
                  style={{ fontFamily: currentFont.fontFamily }}
                >
                  ﴿ {selectedAyahForTafseer.text} ﴾
                </p>
                <span className={`inline-block text-xs font-semibold ${themes.subText}`}>
                  سورة {currentMeta.name} — الآية [{selectedAyahForTafseer.number}]
                </span>
              </div>

              {/* Tafseer Al-Muyassar Text - Comfortable eye reading typography */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
                  <h4 className="text-xs sm:text-sm font-bold opacity-80">
                    التفسير الميسر (مجمع الملك فهد لطباعة المصحف الشريف):
                  </h4>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-black/5 border border-current/10">
                  {tafseerLoading ? (
                    <p className="text-base sm:text-lg leading-[2.3] font-medium text-justify font-sans flex items-center gap-2 opacity-70">
                      <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
                      <span>جارٍ تحميل نص التفسير المعتمد...</span>
                    </p>
                  ) : tafseerError ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-sans">
                      <span className="text-rose-700 dark:text-rose-300">{tafseerError}</span>
                      <button
                        type="button"
                        onClick={retryTafseer}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  ) : tafseerMap[selectedAyahForTafseer.number] ? (
                    <p className="text-base sm:text-lg leading-[2.3] font-medium text-justify font-sans">
                      {tafseerMap[selectedAyahForTafseer.number]}
                    </p>
                  ) : (
                    <p className="text-base sm:text-lg leading-[2.3] font-medium text-justify font-sans">
                      <span className="flex items-center gap-2 opacity-70">
                        لا يتوفر تفسير لهذه الآية في المصدر.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer - Navigation to Prev/Next Ayah */}
            <div className={`px-5 py-3 border-t flex items-center justify-between gap-3 text-xs ${themes.drawerCard}`}>
              <button
                type="button"
                disabled={selectedAyahForTafseer.number <= 1}
                onClick={() => handleTafseerStep(-1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الآية السابقة</span>
              </button>

              <span className={`font-semibold ${themes.subText}`}>
                {selectedAyahForTafseer.number} من {currentMeta.ayahsCount}
              </span>

              <button
                type="button"
                disabled={selectedAyahForTafseer.number >= currentMeta.ayahsCount}
                onClick={() => handleTafseerStep(1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              >
                <span>الآية التالية</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
