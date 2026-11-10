import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SURAHS, TOTAL_PAGES } from '../data/quran.js';
import { getSurahAyahs, getSurahTafseer } from '../data/quranTexts.js';
import { searchQuran } from '../lib/quranFoundationApi.js';
import { getQuranDivisionByAyah } from '../lib/quranDivision.js';
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
  BookOpenCheck,
  Copy,
  Check,
  Volume2,
  Maximize2,
  BookMarked,
  Type,
  ChevronDown,
  Search,
} from 'lucide-react';

function getSurahForPage(pageNumber) {
  return SURAHS.reduce(
    (current, surah) => (surah.startPage <= pageNumber ? surah : current),
    SURAHS[0],
  );
}

function getSavedReadingPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem('mutabi_quran_position') || 'null');
    if (
      Number.isInteger(saved?.surahNumber) &&
      saved.surahNumber >= 1 &&
      saved.surahNumber <= 114 &&
      Number.isInteger(saved?.ayahNumber) &&
      saved.ayahNumber >= 1 &&
      Number.isInteger(saved?.pageNumber) &&
      saved.pageNumber >= 1 &&
      saved.pageNumber <= TOTAL_PAGES
    ) {
      return saved;
    }
  } catch (error) {
    console.warn('Could not restore the saved Quran reading position:', error);
  }
  return null;
}

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
  const savedPositionRef = useRef(getSavedReadingPosition());
  const [selectedSurah, setSelectedSurah] = useState(() => {
    const saved = savedPositionRef.current;
    return initialSurahNumber === 1 && saved ? saved.surahNumber : initialSurahNumber || 1;
  });
  const [currentPage, setCurrentPage] = useState(
    () =>
      (initialSurahNumber === 1 && savedPositionRef.current?.pageNumber) ||
      SURAHS.find((surah) => surah.number === initialSurahNumber)?.startPage ||
      1,
  );
  const [currentDivision, setCurrentDivision] = useState(null);
  const [surahData, setSurahData] = useState(null);
  const [tafseerMap, setTafseerMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [surahLoadError, setSurahLoadError] = useState(null);
  const [logError, setLogError] = useState(null);
  const [tafseerLoading, setTafseerLoading] = useState(false);
  const [tafseerError, setTafseerError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const readerCanvasRef = useRef(null);

  // Single Ayah audio recitation
  const singleAyahAudioRef = useRef(null);
  const [singleAyahPlaying, setSingleAyahPlaying] = useState(false);

  // Keep the text-based Mushaf view primary; the scanned page remains optional.
  const [viewMode, setViewMode] = useState('text');
  const [pageImageError, setPageImageError] = useState(false);

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

  // Quran Search state (Requirement 8)
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ query: '', surahs: [], verses: [], total: 0 });
  const [searchLoading, setSearchLoading] = useState(false);
  const [highlightedAyahNumber, setHighlightedAyahNumber] = useState(null);
  const searchInputRef = useRef(null);

  // Tafseer Bottom Sheet state
  const [selectedAyahForTafseer, setSelectedAyahForTafseer] = useState(null);
  const [copiedTafseer, setCopiedTafseer] = useState(false);
  const pendingPageNavigationRef = useRef(null);
  const hasMountedSurahRef = useRef(false);
  const readingPositionRestoredRef = useRef(false);

  // Debounced search via Quran Foundation API
  useEffect(() => {
    if (!showSearch) return;
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchResults({ query: '', surahs: [], verses: [], total: 0 });
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchQuran(clean, 25);
        setSearchResults(res);
      } catch (e) {
        console.warn('Search failed:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, showSearch]);

  // Focus search input when search modal opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [showSearch]);

  // Auto-scroll to highlighted verse if navigating from search
  useEffect(() => {
    if (!highlightedAyahNumber || !surahData?.ayahs) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`ayah-${highlightedAyahNumber}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightedAyahNumber, surahData]);

  useEffect(() => {
    readingPositionRestoredRef.current = false;
  }, [isOpen, selectedSurah]);

  useEffect(() => {
    if (
      !isOpen ||
      surahData?.number !== selectedSurah ||
      !surahData?.ayahs?.length ||
      viewMode !== 'text'
    ) return;

    const main = readerCanvasRef.current;
    if (!main) return;

    const updateReadingPosition = () => {
      if (!readingPositionRestoredRef.current) return;
      const markerY = main.getBoundingClientRect().top + Math.min(140, main.clientHeight * 0.2);
      const ayahElements = [...main.querySelectorAll('[data-verse-key]')];
      const activeElement =
        ayahElements.find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.bottom >= markerY && rect.top < main.getBoundingClientRect().bottom;
        }) || ayahElements[0];
      if (!activeElement) return;

      const pageNumber = Number(activeElement.dataset.pageNumber);
      const ayahNumber = Number(activeElement.dataset.ayahNumber);
      const position = {
        surahNumber: selectedSurah,
        ayahNumber,
        pageNumber,
      };
      const division = getQuranDivisionByAyah({
        pageNumber,
        juzNumber: Number(activeElement.dataset.juzNumber),
        hizbNumber: Number(activeElement.dataset.hizbNumber),
        rubElHizbNumber: Number(activeElement.dataset.rubElHizbNumber),
      });

      if (Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= TOTAL_PAGES) {
        setCurrentPage((previous) => (previous === pageNumber ? previous : pageNumber));
        setCurrentDivision(division);
        const previous = savedPositionRef.current;
        if (
          previous?.surahNumber !== position.surahNumber ||
          previous?.ayahNumber !== position.ayahNumber ||
          previous?.pageNumber !== position.pageNumber
        ) {
          try {
            localStorage.setItem('mutabi_quran_position', JSON.stringify(position));
            savedPositionRef.current = position;
          } catch (error) {
            console.warn('Could not save the Quran reading position:', error);
          }
        }
      }
    };

    let animationFrame = 0;
    const handleScroll = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateReadingPosition();
      });
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', handleScroll);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [isOpen, selectedSurah, surahData, viewMode]);

  useEffect(() => {
    if (
      !isOpen ||
      surahData?.number !== selectedSurah ||
      !surahData?.ayahs?.length ||
      viewMode !== 'text'
    ) return;

    const saved = savedPositionRef.current;
    const targetPage = pendingPageNavigationRef.current;
    if (targetPage) {
      const pageElement = document.getElementById(`quran-page-${targetPage}`);
      if (pageElement) {
        readingPositionRestoredRef.current = true;
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        pendingPageNavigationRef.current = null;
        return;
      }
    }

    readingPositionRestoredRef.current = true;
    if (saved?.surahNumber === selectedSurah) {
      const savedAyah = document.getElementById(`ayah-${saved.ayahNumber}`);
      if (savedAyah) {
        const pageNumber = Number(savedAyah.dataset.pageNumber);
        setCurrentPage(pageNumber);
        setCurrentDivision(getQuranDivisionByAyah({
          pageNumber,
          juzNumber: Number(savedAyah.dataset.juzNumber),
          hizbNumber: Number(savedAyah.dataset.hizbNumber),
          rubElHizbNumber: Number(savedAyah.dataset.rubElHizbNumber),
        }));
        savedAyah.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const savedPage = document.getElementById(`quran-page-${saved.pageNumber}`);
      if (savedPage) {
        savedPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    readerCanvasRef.current?.dispatchEvent(new Event('scroll'));
  }, [isOpen, selectedSurah, surahData, viewMode, currentPage]);

  // Sync initial Surah
  useEffect(() => {
    if (initialSurahNumber && initialSurahNumber >= 1 && initialSurahNumber <= 114) {
      const saved = getSavedReadingPosition();
      const shouldRestore = initialSurahNumber === 1 && saved;
      const nextSurah = shouldRestore ? saved.surahNumber : initialSurahNumber;
      setSelectedSurah(nextSurah);
      setCurrentPage(shouldRestore ? saved.pageNumber : SURAHS[nextSurah - 1].startPage);
    }
  }, [initialSurahNumber, isOpen]);

  useEffect(() => {
    if (!hasMountedSurahRef.current) {
      hasMountedSurahRef.current = true;
      return;
    }
    const surah = SURAHS.find((item) => item.number === selectedSurah) || SURAHS[0];
    setCurrentPage(pendingPageNavigationRef.current || surah.startPage);
    setCurrentDivision(null);
  }, [selectedSurah]);

  useEffect(() => {
    setPageImageError(false);
  }, [currentPage]);

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
      // Global search shortcut (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape' && showSearch) {
          setShowSearch(false);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.key === '/') {
        e.preventDefault();
        setShowSearch(true);
      } else if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
        } else if (showFontMenu) {
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
  }, [isOpen, selectedSurah, currentPage, viewMode, surahData, selectedAyahForTafseer, showFontMenu, showSearch]);

  const selectedSurahMeta = SURAHS.find((s) => s.number === selectedSurah) || SURAHS[0];
  const currentMeta = viewMode === 'page' ? getSurahForPage(currentPage) : selectedSurahMeta;
  const currentFont = UTHMANI_FONTS.find((f) => f.id === selectedFontId) || UTHMANI_FONTS[0];

  const pageSections = useMemo(() => {
    if (!surahData?.ayahs) return [];
    return surahData.ayahs.reduce((sections, ayah) => {
      const pageNumber = Number(ayah.pageNumber);
      const lastSection = sections[sections.length - 1];
      if (!lastSection || lastSection.pageNumber !== pageNumber) {
        sections.push({ pageNumber, ayahs: [ayah] });
      } else {
        lastSection.ayahs.push(ayah);
      }
      return sections;
    }, []);
  }, [surahData]);

  const handlePageChange = (pageNumber) => {
    const page = Number(pageNumber);
    if (Number.isInteger(page) && page >= 1 && page <= TOTAL_PAGES) {
      pendingPageNavigationRef.current = page;
      const targetSurah = getSurahForPage(page);
      if (targetSurah.number !== selectedSurah) setSelectedSurah(targetSurah.number);
      setCurrentPage(page);
      setSelectedAyahForTafseer(null);
      const targetAyah = surahData?.ayahs?.find((ayah) => ayah.pageNumber === page);
      if (targetAyah) {
        setCurrentDivision(getQuranDivisionByAyah(targetAyah));
        requestAnimationFrame(() => {
          document.getElementById(`quran-page-${page}`)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
    }
  };

  useEffect(() => {
    if (viewMode !== 'page') return;
    const pageAyah = surahData?.ayahs?.find((ayah) => ayah.pageNumber === currentPage);
    if (pageAyah) setCurrentDivision(getQuranDivisionByAyah(pageAyah));
  }, [surahData, currentPage, viewMode]);

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
    const surahNumber = currentMeta.number;
    if (singleAyahAudioRef.current) {
      singleAyahAudioRef.current.pause();
      setSingleAyahPlaying(false);
    }

    if (!audioRef.current) {
      const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNumber}.mp3`;
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

  const paddedPage = String(currentPage).padStart(3, '0');
  const pageImageUrl = `https://files.quran.app/hafs/madani/width_1024/page${paddedPage}.png`;
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
        className={`fixed top-0 inset-x-0 px-2.5 sm:px-8 py-2 sm:py-3 border-b flex items-center justify-between gap-1.5 sm:gap-3 shrink-0 backdrop-blur-md z-30 transition-transform duration-300 ease-in-out ${
          showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } ${themes.headerBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Right: Surah info & quick switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <select
                value={selectedSurah}
                onChange={(e) => {
                  const surahNumber = Number(e.target.value);
                  pendingPageNavigationRef.current = null;
                  setSelectedAyahForTafseer(null);
                  if (viewMode === 'page') {
                    handlePageChange(SURAHS[surahNumber - 1]?.startPage);
                  } else {
                    setSelectedSurah(surahNumber);
                  }
                }}
                className="font-black text-xs sm:text-base md:text-lg bg-transparent border-none focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
                title="اضغط لتغيير السورة"
              >
                {SURAHS.map((s) => (
                  <option key={s.number} value={s.number} className="text-slate-900 bg-white">
                    {s.number}. سورة {s.name} ({s.type === 'meccan' ? 'مكية' : 'مدنية'})
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-[10px] sm:text-xs ${themes.subText} hidden md:block`}>
              {currentMeta.type === 'meccan' ? 'مكية' : 'مدنية'} • {currentMeta.ayahsCount} آية • صفحة {currentPage}
              {currentDivision
                ? ` • الجزء ${currentDivision.juz} • الحزب ${currentDivision.hizb} • ${currentDivision.rubNameInHizb}`
                : ' • يتم تحديد التقسيم من موضع الآية'}
            </p>
          </div>
        </div>

        {/* Center: Reading Comfort Tools (Sepia Quick Toggle, Uthmani Font Selector, Lighting & Zoom) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* 1. Quick Sepia Switch Toggle (مفتاح تبديل سريع لنمط سيبيا) */}
          <button
            type="button"
            onClick={toggleSepia}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isSepiaActive
                ? 'bg-[#7c561f] text-white border-[#7c561f] shadow-sm ring-2 ring-[#7c561f]/25'
                : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
            }`}
            title={isSepiaActive ? 'إيقاف نمط سيبيا والعودة للوضع السابق' : 'تفعيل مفتاح نمط الورق الدافئ (Sepia) لراحة العين'}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold hidden sm:inline">سيبيا</span>
            {/* Elegant visual toggle switch pill */}
            <span
              className={`w-6 sm:w-7 h-3.5 sm:h-4 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                isSepiaActive ? 'bg-amber-300 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
              }`}
            >
              <span className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full transition-transform ${isSepiaActive ? 'bg-[#2c2214]' : 'bg-white'}`} />
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
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold bg-black/5 dark:bg-white/5 border border-current/10 hover:bg-black/10 flex items-center gap-1 transition cursor-pointer"
              title="اختيار نوع الخط العثماني لراحة القراءة"
            >
              <Type className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline font-bold">{currentFont.shortName}</span>
              <ChevronDown className="w-3 h-3 opacity-60 hidden sm:inline" />
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
          <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-current/10">
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.max(1, s - 1))}
              disabled={fontScale <= 1}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-black/10 disabled:opacity-30 cursor-pointer"
              title="تصغير الخط"
            >
              <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
            <span className="text-[10px] sm:text-xs font-black px-1 opacity-80" title="حجم الخط">
              {fontScale === 1 ? 'ص' : fontScale === 2 ? 'م' : fontScale === 3 ? 'ك' : fontScale === 4 ? 'ك+' : 'ك++'}
            </span>
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.min(5, s + 1))}
              disabled={fontScale >= 5}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-black/10 disabled:opacity-30 cursor-pointer"
              title="تكبير الخط"
            >
              <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {/* 5. Full Surah Audio Recitation Button */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-1.5 sm:p-2 rounded-xl sm:rounded-2xl text-xs font-bold flex items-center gap-1 transition-all border cursor-pointer ${
              audioPlaying
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs animate-pulse'
                : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
            }`}
            title="تلاوة صوتية للسورة كاملة بصوت الشيخ مشاري العفاسي"
          >
            {audioPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span className="hidden xl:inline">{audioPlaying ? 'إيقاف' : 'تلاوة'}</span>
          </button>
        </div>

        {/* Left: Search & Elegant Close Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-xs font-bold bg-black/5 dark:bg-white/5 border border-current/10 hover:bg-black/10 flex items-center gap-1.5 transition cursor-pointer"
            title="البحث في السور والآيات (Ctrl+K أو /)"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
            <span className="hidden sm:inline font-bold">بحث</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-black/10 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs border border-current/10"
            title="إغلاق المصحف والعودة"
            aria-label="إغلاق المصحف"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Fullscreen Quran Canvas - Tapping anywhere toggles zen reading mode */}
      <main
        ref={readerCanvasRef}
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
                <BookOpenCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  {viewMode === 'page'
                    ? 'تنقل بين صفحات المصحف بالأسهم أو اختر رقم الصفحة • انقر لإخفاء الأشرطة'
                    : 'انقر على أي آية لعرض تفسيرها الميسر • انقر في أي مكان بالشاشة لإخفاء الأشرطة والقراءة بصفاء'}
                </span>
              </span>
            </div>
          )}

          {viewMode === 'page' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <label className="flex items-center gap-2 text-sm font-bold">
                <span>الصفحة</span>
                <select
                  value={currentPage}
                  onChange={(e) => handlePageChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-lg border border-current/20 bg-transparent px-2 py-1"
                  aria-label="اختيار صفحة المصحف"
                >
                  {Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1).map((page) => (
                    <option key={page} value={page} className="bg-white text-slate-900">
                      {page} / {TOTAL_PAGES}
                    </option>
                  ))}
                </select>
              </label>
              {pageImageError ? (
                <p className={`py-24 text-center text-sm font-semibold ${themes.subText}`}>
                  تعذر تحميل صورة الصفحة {currentPage}. تحقق من اتصال الإنترنت ثم أعد المحاولة.
                </p>
              ) : (
                <img
                  src={pageImageUrl}
                  alt={`صفحة ${currentPage} من مصحف المدينة`}
                  onError={() => setPageImageError(true)}
                  className={`w-full max-w-2xl h-auto max-h-[85vh] object-contain rounded-2xl border ${themes.pageImageFrame}`}
                  style={{ filter: themes.pageImageFilter }}
                />
              )}
            </div>
          ) : loading ? (
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
                  <span>الصفحة: {currentPage}</span>
                  <span>•</span>
                  {currentDivision ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      الجزء {currentDivision.juz} • الحزب {currentDivision.hizb} • {currentDivision.rubNameInHizb}
                    </span>
                  ) : (
                    <span>جارٍ تحديد الجزء والحزب والربع من موضع الآية</span>
                  )}
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

              {/* Quran text grouped at the exact printed Mushaf page boundaries */}
              <div className="space-y-5">
                {pageSections.map((section) => {
                  const pageDivision = getQuranDivisionByAyah(section.ayahs[0]);
                  return (
                    <section
                      key={section.pageNumber}
                      id={`quran-page-${section.pageNumber}`}
                      className="scroll-mt-24"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 border-y border-current/10 py-2 text-xs font-bold">
                        <span>صفحة {section.pageNumber} من {TOTAL_PAGES}</span>
                        {pageDivision && (
                          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
                            الجزء {pageDivision.juz} • الحزب {pageDivision.hizb} • {pageDivision.rubNameInHizb}
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-right font-normal tracking-normal ${currentFont.className} ${themes.verseTextColor} ${fontStyle} rounded-2xl px-3 py-2 leading-relaxed`}
                        style={{
                          fontFamily: currentFont.fontFamily,
                          textAlignLast: 'right',
                          wordSpacing: '0.04em',
                        }}
                      >
                        {section.ayahs.map((ayah) => {
                          const isSelected = selectedAyahForTafseer?.number === ayah.number;
                          const isHighlighted = highlightedAyahNumber === ayah.number;
                          return (
                            <span
                              key={ayah.number}
                              id={`ayah-${ayah.number}`}
                              data-verse-key={ayah.verseKey}
                              data-ayah-number={ayah.number}
                              data-page-number={ayah.pageNumber}
                              data-juz-number={ayah.juzNumber}
                              data-hizb-number={ayah.hizbNumber}
                              data-rub-el-hizb-number={ayah.rubElHizbNumber}
                              onClick={(e) => handleOpenTafseer(ayah, e)}
                              className={`inline px-1 py-0.5 rounded-xl transition-all cursor-pointer ${
                                isSelected
                                  ? 'ring-2 ring-emerald-500 bg-emerald-500/10'
                                  : isHighlighted
                                  ? 'ring-2 ring-amber-400 bg-amber-400/25 shadow-sm'
                                  : themes.verseHover
                              }`}
                              title={`انقر لعرض تفسير الآية ${ayah.number} وسماعها`}
                            >
                              <span>{ayah.text}</span>{' '}
                              <span
                                className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 mx-1 rounded-full border text-xs font-sans font-black select-none align-middle transition-transform hover:scale-110 active:scale-95 ${
                                  isHighlighted
                                    ? 'bg-amber-400 text-slate-900 border-amber-500 font-black ring-2 ring-amber-300'
                                    : themes.ayahMarker
                                }`}
                                title={`الآية ${ayah.number} • اضغط للتفسير`}
                              >
                                {ayah.number}
                              </span>{' '}
                            </span>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* Official Quran Foundation API Attribution Note (وفق توثيق Quran Foundation الرسمي) */}
              <div className="pt-8 pb-4 text-center border-t border-current/10 mt-6 space-y-1.5 select-text">
                <p className="text-xs font-semibold">
                  النص القرآني الكريم برواية حفص عن عاصم بالرسم العثماني المعتمد بمجمع الملك فهد لطباعة المصحف الشريف
                </p>
                <p className="text-[11px] opacity-75">
                  مصدر البيانات المعتمد:{' '}
                  <a
                    href="https://api-docs.quran.foundation"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-bold underline underline-offset-2"
                  >
                    Quran Foundation Official API (api-docs.quran.foundation)
                  </a>
                  {' '}• 114 سورة و6236 آية كاملة مع التخزين المؤقت وحفظ سلامة النص القرآني 100%
                </p>
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
        className={`fixed bottom-0 inset-x-0 px-2.5 sm:px-8 py-2 sm:py-3 border-t flex items-center justify-between gap-1.5 sm:gap-3 shrink-0 backdrop-blur-md z-30 transition-transform duration-300 ease-in-out ${
          showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        } ${themes.headerBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous page or surah (سهم يمين في الواجهة العربية) */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="flex items-center gap-1 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shrink-0"
          title="الصفحة السابقة"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">الصفحة السابقة</span>
        </button>

        {/* Center: Log in Daily Tracker (+10 Points) & View Mode Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mode Switcher (نص مكبر / صفحة المصحف) */}
          <button
            type="button"
            onClick={() => {
              if (viewMode === 'page') {
                setSelectedSurah(getSurahForPage(currentPage).number);
                setViewMode('text');
              } else {
                setViewMode('page');
              }
            }}
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-black/5 hover:bg-black/10 transition border border-current/10 cursor-pointer flex items-center gap-1.5"
            title="التبديل بين النص وصورة صفحة المصحف"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{viewMode === 'text' ? 'صورة المصحف' : 'عرض النص'}</span>
          </button>

          <label className="flex items-center gap-1 text-[11px] sm:text-xs font-bold whitespace-nowrap">
            <span className="hidden sm:inline">صفحة</span>
            <select
              value={currentPage}
              onChange={(event) => handlePageChange(event.target.value)}
              className="max-w-[72px] rounded-lg border border-current/20 bg-transparent px-1.5 py-1"
              aria-label="الانتقال إلى صفحة في المصحف"
            >
              {Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1).map((page) => (
                <option key={page} value={page} className="bg-white text-slate-900">
                  {page} / {TOTAL_PAGES}
                </option>
              ))}
            </select>
          </label>

          {/* Worship Log button */}
          <button
            type="button"
            onClick={async () => {
              setLogError(null);
              try {
                await onLogPagesRead?.({ ...currentMeta, startPage: currentPage });
              } catch (error) {
                console.error('Could not save the Quran page reading log:', error);
                setLogError('تعذر تسجيل الصفحة في الورد. حاول مرة أخرى.');
              }
            }}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
            title="تسجيل قراءة الصفحة الحالية في الورد اليومي واحتساب النقاط"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="hidden sm:inline">تسجيل الصفحة في الورد (+10 نقاط)</span>
            <span className="sm:hidden">تسجيل الصفحة (+10)</span>
          </button>
        </div>

        {/* Next Surah (سهم يسار في الواجهة العربية) */}
        <button
          type="button"
          disabled={currentPage >= TOTAL_PAGES}
          onClick={() => handlePageChange(currentPage + 1)}
          className="flex items-center gap-1 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-black/5 hover:bg-black/10 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shrink-0"
          title="الصفحة التالية"
        >
          <span className="hidden sm:inline">الصفحة التالية</span>
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </footer>

      {logError && (
        <p
          role="alert"
          className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-lg"
        >
          {logError}
        </p>
      )}

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

      {/* Quran Search Modal (البحث في السور والآيات عبر Quran Foundation API) */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowSearch(false)}
        >
          <div
            className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 ${themes.drawerBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className={`p-4 border-b flex items-center gap-3 ${themes.drawerCard}`}>
              <div className="w-10 h-10 rounded-2xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <div className="flex-1 relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن سورة أو آية (مثال: الفاتحة، الكهف، 18، آية الكرسي)..."
                  className="w-full bg-black/5 dark:bg-white/5 border border-current/10 rounded-2xl px-4 py-2.5 text-sm sm:text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-current placeholder:opacity-40"
                  dir="rtl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-xs cursor-pointer"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="w-10 h-10 rounded-2xl bg-black/5 hover:bg-rose-600 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="إغلاق البحث (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Suggestions when query is empty */}
            {!searchQuery.trim() && (
              <div className="p-5 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <p className={`text-xs font-black ${themes.subText}`}>سور شائعة للقراءة السريعة:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { num: 1, name: 'الفاتحة' },
                      { num: 2, name: 'البقرة' },
                      { num: 18, name: 'الكهف' },
                      { num: 36, name: 'يس' },
                      { num: 67, name: 'الملك' },
                      { num: 112, name: 'الإخلاص' },
                      { num: 113, name: 'الفلق' },
                      { num: 114, name: 'الناس' },
                    ].map((s) => (
                      <button
                        key={s.num}
                        type="button"
                        onClick={() => {
                          pendingPageNavigationRef.current = null;
                          setSelectedSurah(s.num);
                          setSelectedAyahForTafseer(null);
                          setHighlightedAyahNumber(null);
                          setShowSearch(false);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-black/5 hover:bg-emerald-600 hover:text-white transition border border-current/10 cursor-pointer"
                      >
                        سورة {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold space-y-1">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">💡 نصائح البحث الذكي:</p>
                  <p className="opacity-80">• يمكنك كتابة اسم السورة (مثل: مريم، يوسف، الرحمن) أو رقمها (مثل: 36).</p>
                  <p className="opacity-80">• يمكنك البحث بجزء من الآية الكريمة لجلب موضعها مباشرة في المصحف عبر Quran Foundation API.</p>
                </div>
              </div>
            )}

            {/* Search Results Area */}
            {searchQuery.trim() && (
              <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 min-h-[260px]">
                {searchLoading ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className={`text-xs font-bold ${themes.subText}`}>جارٍ البحث في المصحف الشريف عبر Quran Foundation API...</p>
                  </div>
                ) : searchResults.total === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <p className="text-sm font-bold opacity-80">لا توجد نتائج مطابقة لـ «{searchQuery}»</p>
                    <p className={`text-xs ${themes.subText}`}>تأكد من صحة الكلمة باللغة العربية أو جرب البحث بكلمة أخرى.</p>
                  </div>
                ) : (
                  <>
                    {/* Matching Surahs */}
                    {searchResults.surahs?.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black opacity-75">السور المطابقة ({searchResults.surahs.length}):</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {searchResults.surahs.map((s) => (
                            <button
                              key={s.number}
                              type="button"
                              onClick={() => {
                                pendingPageNavigationRef.current = null;
                                setSelectedSurah(s.number);
                                setSelectedAyahForTafseer(null);
                                setHighlightedAyahNumber(null);
                                setShowSearch(false);
                              }}
                              className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-center justify-between gap-3 ${themes.drawerCard} hover:border-emerald-500`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 text-xs font-black flex items-center justify-center shrink-0">
                                  {s.number}
                                </span>
                                <div>
                                  <p className="text-sm font-black">سورة {s.name}</p>
                                  <p className={`text-[11px] ${themes.subText}`}>
                                    {s.type === 'meccan' ? 'مكية' : 'مدنية'} • {s.ayahsCount} آية
                                  </p>
                                </div>
                              </div>
                              <ChevronLeft className="w-4 h-4 opacity-50 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Verses */}
                    {searchResults.verses?.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-black opacity-75">
                          الآيات الكريمة المطابقة ({searchResults.verses.length}):
                        </p>
                        <div className="space-y-2">
                          {searchResults.verses.map((v) => (
                            <button
                              key={v.verseKey}
                              type="button"
                              onClick={() => {
                                pendingPageNavigationRef.current = null;
                                setSelectedSurah(v.chapterId);
                                setViewMode('text');
                                setSelectedAyahForTafseer(null);
                                setHighlightedAyahNumber(v.verseNumber);
                                setShowSearch(false);
                              }}
                              className={`w-full p-3.5 rounded-2xl border text-right transition cursor-pointer space-y-1.5 ${themes.drawerCard} hover:border-emerald-500 hover:bg-emerald-500/5`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                  سورة {v.surahName} • الآية [{v.verseNumber}]
                                </span>
                                <span className={`text-[10px] ${themes.subText}`}>اضغط للانتقال للآية</span>
                              </div>
                              <p
                                className={`text-sm sm:text-base leading-relaxed ${currentFont.className} ${themes.drawerHighlight}`}
                                style={{ fontFamily: currentFont.fontFamily }}
                              >
                                ﴿ {v.text} ﴾
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className={`px-5 py-3 border-t flex items-center justify-between gap-3 text-xs ${themes.drawerCard}`}>
              <span className={`text-[11px] ${themes.subText}`}>
                البحث المعتمد عبر Quran Foundation API الرسمي
              </span>
              <button
                type="button"
                onClick={() => setShowSearch(false)}
                className="px-3 py-1.5 rounded-xl font-bold bg-black/5 hover:bg-black/10 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
