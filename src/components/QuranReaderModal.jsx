import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Bookmark,
  BookmarkCheck,
  Type,
  ChevronDown,
  Search,
} from 'lucide-react';

// علامة عند الآية التي تُتلى الآن: معطّلة افتراضياً (لا مربعات ولا ألوان).
// لو حبيت تلوين خفيف للنص فقط (بدون أي مربع) غيّرها إلى true.
const SHOW_PLAYING_TINT = false;

// مفتاح حفظ حالة "المصحف مفتوح" لإعادة فتحه بعد الريلود (يقرأه Shell.jsx)

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

function getSavedBookmark() {
  try {
    const raw = localStorage.getItem('mutabi_quran_bookmark');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      Number.isInteger(data?.surahNumber) &&
      data.surahNumber >= 1 &&
      data.surahNumber <= 114 &&
      Number.isInteger(data?.pageNumber) &&
      data.pageNumber >= 1 &&
      data.pageNumber <= TOTAL_PAGES
    ) {
      return data;
    }
  } catch (e) {
    console.warn('Could not read saved bookmark:', e);
  }
  return null;
}

// يفصل كل مستمعي الأحداث عن عنصر الصوت ثم يوقفه، حتى لا تتداخل حالات الأحداث القديمة مع الجديدة
function detachAudio(audio) {
  if (!audio) return;
  audio.onplay = null;
  audio.onpause = null;
  audio.onended = null;
  audio.onerror = null;
  try {
    audio.pause();
  } catch {
    // ignore
  }
}

// Authoritative Reciters (القرّاء المعتمدون: الحصري، العفاسي، المنشاوي)
import { RECITERS, UTHMANI_FONTS } from './quran/constants.js';
export { RECITERS, UTHMANI_FONTS };
export function QuranReaderModal({
  isOpen,
  onClose,
  initialSurahNumber = 1,
  onLogPagesRead = async (..._pageData) => {},
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
  const readerCanvasRef = useRef(null);
  const scrollReaderElement = (element, behavior = 'smooth', block = 'start') => {
    const container = readerCanvasRef.current;
    if (!container || !element || !container.contains(element)) return;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    let top = container.scrollTop + elementRect.top - containerRect.top;
    if (block === 'center') {
      top -= (container.clientHeight - elementRect.height) / 2;
    } else if (block === 'end') {
      top -= container.clientHeight - elementRect.height;
    }
    container.scrollTo({ top: Math.max(0, top), behavior });
  };
  const [reciter, setReciter] = useState(() => localStorage.getItem('mutabi_quran_reciter') || 'husary');
  const reciterRef = useRef(reciter);
  reciterRef.current = reciter;
  const [savedBookmark, setSavedBookmark] = useState(() => getSavedBookmark());
  const [previousAlert, setPreviousAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // ------------------------------------------------------------------
  // محرك الصوت: عنصر Audio واحد دائم يُعاد استخدامه لكل الأوضاع
  // (تلاوة السورة / سماع آية واحدة / قراءة متواصلة). إعادة استخدام نفس
  // العنصر هي اللي بتخلي الانتقال للآية التالية يشتغل في الموبايل من غير ما يفصل.
  // قفل نافذة التفسير لا يلمس الصوت نهائياً.
  // ------------------------------------------------------------------
  const playerRef = useRef(null);
  const audioTokenRef = useRef(0);
  const audioModeRef = useRef(null); // 'surah' | 'ayah' | 'continuous' | null
  const audioAyahRef = useRef(null);
  const surahAudioKeyRef = useRef(null);
  const preloadRef = useRef(null);
  const [singleAyahPlaying, setSingleAyahPlaying] = useState(false);
  const [continuousAyahPlaying, setContinuousAyahPlaying] = useState(false);
  // رقم الآية التي تُتلى الآن (للشريط العائم وأزرار التفسير)
  const [playingAyahNumber, setPlayingAyahNumber] = useState(null);

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
  const fontButtonRef = useRef(null);
  const readerHeaderRef = useRef(null);
  const [fontMenuPosition, setFontMenuPosition] = useState(null);

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
  // أثناء استعادة الموضع بعد الريلود نتجاهل أحداث التمرير حتى لا يتغير الموضع المحفوظ
  const ignoreScrollUntilRef = useRef(0);
  // الموضع المنتظر حفظه في localStorage (نحفظ بتأخير بسيط بدل كل إطار)
  const pendingPositionRef = useRef(null);
  const positionTimerRef = useRef(0);

  const getPlayer = () => {
    if (!playerRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      playerRef.current = audio;
    }
    return playerRef.current;
  };

  // إيقاف أي صوت شغال وتصفير كل الحالات
  const stopAudio = () => {
    audioTokenRef.current += 1;
    audioModeRef.current = null;
    audioAyahRef.current = null;
    surahAudioKeyRef.current = null;
    detachAudio(playerRef.current);
    preloadRef.current = null;
    setAudioPlaying(false);
    setSingleAyahPlaying(false);
    setContinuousAyahPlaying(false);
    setPlayingAyahNumber(null);
  };

  // عند إغلاق المصحف (إزالته من الشاشة) نوقف كل الصوت ولا نتركه يعمل في الخلفية
  useEffect(() => {
    return () => {
      audioTokenRef.current += 1;
      const audio = playerRef.current;
      detachAudio(audio);
      if (audio) {
        try {
          audio.removeAttribute('src');
          audio.load();
        } catch {
          // ignore
        }
      }
      playerRef.current = null;
      preloadRef.current = null;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const handleClose = () => onClose?.();

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

  // Auto-scroll to the verse if navigating from search (بدون أي تلوين)
  useEffect(() => {
    if (!highlightedAyahNumber || !surahData?.ayahs) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`ayah-${highlightedAyahNumber}`);
      if (el) {
        scrollReaderElement(el, 'smooth', 'center');
        setHighlightedAyahNumber(null);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightedAyahNumber, surahData]);

  useEffect(() => {
    readingPositionRestoredRef.current = false;
  }, [isOpen, selectedSurah]);

  // متابعة موضع القراءة أثناء التمرير وحفظه (الآية + مكانها بالبكسل داخل الشاشة)
  useEffect(() => {
    if (
      !isOpen ||
      surahData?.number !== selectedSurah ||
      !surahData?.ayahs?.length ||
      viewMode !== 'text'
    ) return;

    const main = readerCanvasRef.current;
    if (!main) return;

    const flushPosition = () => {
      window.clearTimeout(positionTimerRef.current);
      positionTimerRef.current = 0;
      const pending = pendingPositionRef.current;
      if (!pending) return;
      pendingPositionRef.current = null;
      try {
        localStorage.setItem('mutabi_quran_position', JSON.stringify(pending));
      } catch (error) {
        console.warn('Could not save the Quran reading position:', error);
      }
    };

    const updateReadingPosition = () => {
      if (!readingPositionRestoredRef.current) return;
      // لا نحدّث الموضع المحفوظ أثناء استعادته (تفادياً لانزلاق الموضع للخلف)
      if (Date.now() < ignoreScrollUntilRef.current) return;
      const mainRect = main.getBoundingClientRect();
      const markerY = mainRect.top + Math.min(140, main.clientHeight * 0.2);
      const ayahElements = [...main.querySelectorAll('[data-verse-key]')];
      const activeElement =
        ayahElements.find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.bottom >= markerY && rect.top < mainRect.bottom;
        }) || ayahElements[0];
      if (!activeElement) return;

      const pageNumber = Number(activeElement.dataset.pageNumber);
      const ayahNumber = Number(activeElement.dataset.ayahNumber);
      const position = {
        surahNumber: selectedSurah,
        ayahNumber,
        pageNumber,
        offset: Math.round(activeElement.getBoundingClientRect().top - mainRect.top),
      };
      const division = getQuranDivisionByAyah({
        pageNumber,
        juzNumber: Number(activeElement.dataset.juzNumber),
        hizbNumber: Number(activeElement.dataset.hizbNumber),
        rubElHizbNumber: Number(activeElement.dataset.rubElHizbNumber),
      });

      if (Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= TOTAL_PAGES) {
        setCurrentPage((previous) => (previous === pageNumber ? previous : pageNumber));
        setCurrentDivision((previous) =>
          previous?.rubTotal === division?.rubTotal && previous?.page === division?.page
            ? previous
            : division,
        );
        savedPositionRef.current = position;
        pendingPositionRef.current = position;
        if (!positionTimerRef.current) {
          positionTimerRef.current = window.setTimeout(flushPosition, 250);
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
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushPosition();
    };

    main.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', flushPosition);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      main.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pagehide', flushPosition);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      flushPosition();
    };
  }, [isOpen, selectedSurah, surahData, viewMode]);

  // استعادة الموضع بعد تحميل السورة (الريلود يرجّعك لنفس الآية ونفس مكانها في الشاشة)
  useEffect(() => {
    if (
      !isOpen ||
      surahData?.number !== selectedSurah ||
      !surahData?.ayahs?.length ||
      viewMode !== 'text'
    ) return undefined;

    const main = readerCanvasRef.current;
    const saved = savedPositionRef.current;
    const targetPage = pendingPageNavigationRef.current;
    if (targetPage) {
      const pageElement = document.getElementById(`quran-page-${targetPage}`);
      if (pageElement) {
        readingPositionRestoredRef.current = true;
        scrollReaderElement(pageElement, 'smooth', 'start');
        pendingPageNavigationRef.current = null;
        return undefined;
      }
    }

    readingPositionRestoredRef.current = true;
    if (main && saved?.surahNumber === selectedSurah) {
      let lastAppliedTop = null;

      // نحط الآية المحفوظة في نفس المكان بالظبط اللي كانت فيه على الشاشة
      const applySaved = () => {
        const savedAyah = document.getElementById(`ayah-${saved.ayahNumber}`);
        if (!savedAyah) return false;
        const desiredOffset = Number.isFinite(saved.offset)
          ? saved.offset
          : Math.min(140, main.clientHeight * 0.2);
        const delta =
          savedAyah.getBoundingClientRect().top -
          main.getBoundingClientRect().top -
          desiredOffset;
        ignoreScrollUntilRef.current = Date.now() + 800;
        main.scrollTop += delta;
        lastAppliedTop = main.scrollTop;
        return true;
      };

      if (applySaved()) {
        const savedAyah = document.getElementById(`ayah-${saved.ayahNumber}`);
        const pageNumber = Number(savedAyah?.dataset.pageNumber);
        if (Number.isInteger(pageNumber)) {
          setCurrentPage(pageNumber);
          setCurrentDivision(getQuranDivisionByAyah({
            pageNumber,
            juzNumber: Number(savedAyah.dataset.juzNumber),
            hizbNumber: Number(savedAyah.dataset.hizbNumber),
            rubElHizbNumber: Number(savedAyah.dataset.rubElHizbNumber),
          }));
        }

        // الخطوط بتتحمل متأخر وبتغيّر الارتفاعات، فنعيد الضبط مرة واحدة لو المستخدم ما تحركش
        let cancelled = false;
        const reapply = () => {
          if (cancelled) return;
          if (lastAppliedTop != null && Math.abs(main.scrollTop - lastAppliedTop) > 4) return;
          applySaved();
        };
        const timer = window.setTimeout(reapply, 450);
        if (document.fonts?.ready) document.fonts.ready.then(reapply).catch(() => {});
        return () => {
          cancelled = true;
          window.clearTimeout(timer);
        };
      }

      const savedPage = document.getElementById(`quran-page-${saved.pageNumber}`);
      if (savedPage) {
        ignoreScrollUntilRef.current = Date.now() + 700;
        scrollReaderElement(savedPage, 'auto', 'start');
        return undefined;
      }
    }
    readerCanvasRef.current?.dispatchEvent(new Event('scroll'));
    return undefined;
  }, [isOpen, selectedSurah, surahData, viewMode]);

  // Sync initial Surah and check for previous reading position / bookmark
  useEffect(() => {
    if (!isOpen) {
      setPreviousAlert(null);
      return;
    }
    const bookmark = getSavedBookmark();
    const lastPos = getSavedReadingPosition();
    setSavedBookmark(bookmark);

    if (initialSurahNumber && initialSurahNumber >= 1 && initialSurahNumber <= 114) {
      // آخر موضع قراءة له الأولوية على العلامة المرجعية عند الفتح/الريلود
      const target = lastPos || bookmark;
      const shouldRestore = initialSurahNumber === 1 && target;
      const nextSurah = shouldRestore ? target.surahNumber : initialSurahNumber;
      setSelectedSurah(nextSurah);
      setCurrentPage(shouldRestore ? target.pageNumber : SURAHS[nextSurah - 1].startPage);
    }

    // التنبيه يظهر للعلامة المرجعية فقط، وإن كانت تختلف عن مكان القراءة الحالي
    if (
      bookmark &&
      (!lastPos ||
        bookmark.pageNumber !== lastPos.pageNumber ||
        bookmark.surahNumber !== lastPos.surahNumber)
    ) {
      const sMeta = SURAHS.find((s) => s.number === bookmark.surahNumber) || SURAHS[0];
      setPreviousAlert({
        surahNumber: bookmark.surahNumber,
        surahName: sMeta.name,
        pageNumber: bookmark.pageNumber,
        ayahNumber: bookmark.ayahNumber || 1,
        isBookmark: true,
      });
    } else {
      setPreviousAlert(null);
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

  useEffect(() => {
    if (!showFontMenu) {
      setFontMenuPosition(null);
      return undefined;
    }

    const updateFontMenuPosition = () => {
      const button = fontButtonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const headerBottom = readerHeaderRef.current?.getBoundingClientRect().bottom || rect.bottom;
      const menuWidth = Math.min(320, Math.max(260, window.innerWidth - 16));
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - menuWidth - 8),
      );
      // The menu is deliberately placed after the whole header, not inside its scrollable row.
      const below = Math.max(rect.bottom + 12, headerBottom + 12);
      setFontMenuPosition({
        top: below,
        left,
        width: menuWidth,
      });
    };

    updateFontMenuPosition();
    window.addEventListener('resize', updateFontMenuPosition);
    window.addEventListener('scroll', updateFontMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateFontMenuPosition);
      window.removeEventListener('scroll', updateFontMenuPosition, true);
    };
  }, [showFontMenu]);

  useEffect(() => {
    try {
      localStorage.setItem('mutabi_quran_reciter', reciter);
    } catch (error) {
      console.warn('Could not save the Quran reciter preference:', error);
    }
  }, [reciter]);

  // Load the Quran text and tafseer independently so a tafseer outage cannot block reading.
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
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
      // تغيير السورة (أو إعادة التحميل) هو الحالة الوحيدة اللي بتوقف الصوت هنا
      stopAudio();
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
          handleClose();
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
          scrollReaderElement(
            document.getElementById(`quran-page-${page}`),
            'smooth',
            'start'
          );
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

  // Handle setting/toggling bookmark
  const handleToggleBookmark = (targetAyah = null) => {
    const targetPage = targetAyah ? targetAyah.pageNumber : currentPage;
    const targetSurahNum = targetAyah
      ? (surahData?.number || selectedSurah)
      : (viewMode === 'page' ? getSurahForPage(currentPage).number : selectedSurah);
    const surahMeta = SURAHS.find((s) => s.number === targetSurahNum) || currentMeta;
    const targetAyahNum = targetAyah
      ? targetAyah.number
      : (surahData?.ayahs?.find((a) => a.pageNumber === targetPage)?.number || 1);

    const isCurrentBookmarked = savedBookmark?.pageNumber === targetPage && savedBookmark?.surahNumber === targetSurahNum;

    if (isCurrentBookmarked && !targetAyah) {
      showToast(`العلامة المرجعية محفوظة بالفعل عند سورة ${surahMeta.name} (صفحة ${targetPage})`);
      return;
    }

    const newBookmark = {
      surahNumber: targetSurahNum,
      surahName: surahMeta.name,
      pageNumber: targetPage,
      ayahNumber: targetAyahNum,
      updatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('mutabi_quran_bookmark', JSON.stringify(newBookmark));
      setSavedBookmark(newBookmark);
      showToast(`تم حفظ العلامة المرجعية عند سورة ${surahMeta.name} (صفحة ${targetPage} • الآية ${targetAyahNum})`);
    } catch (err) {
      console.warn('Could not save bookmark:', err);
    }
  };

  const handleJumpToBookmark = () => {
    if (!savedBookmark) return;
    pendingPageNavigationRef.current = savedBookmark.pageNumber;
    if (savedBookmark.surahNumber !== selectedSurah) {
      setSelectedSurah(savedBookmark.surahNumber);
    }
    setCurrentPage(savedBookmark.pageNumber);
    setPreviousAlert(null);
    showToast(`تم الانتقال إلى العلامة المرجعية: سورة ${savedBookmark.surahName} (صفحة ${savedBookmark.pageNumber})`);

    setTimeout(() => {
      const pageEl = document.getElementById(`quran-page-${savedBookmark.pageNumber}`);
      scrollReaderElement(pageEl, 'smooth', 'start');
      if (savedBookmark.ayahNumber) {
        const ayahEl = document.getElementById(`ayah-${savedBookmark.ayahNumber}`);
        scrollReaderElement(ayahEl, 'smooth', 'center');
      }
    }, 200);
  };

  // إيقاف التلاوة المتواصلة / سماع الآية (يستخدمه الشريط العائم)
  const stopContinuousAudio = () => {
    stopAudio();
  };

  // قفل نافذة التفسير لا يوقف الصوت أبداً؛ فقط يخفي النافذة
  const closeTafseer = () => {
    setSelectedAyahForTafseer(null);
  };

  const getCurrentReciter = () =>
    RECITERS.find((r) => r.id === reciterRef.current) || RECITERS[0];

  // Toggle full surah audio
  const toggleAudio = () => {
    const surahNumber = currentMeta.number;
    const currentReciter = getCurrentReciter();
    const audioKey = `${currentReciter.id}:${surahNumber}`;
    const audio = getPlayer();

    // نفس السورة بنفس القارئ شغالة بالفعل: تشغيل/إيقاف مؤقت
    if (audioModeRef.current === 'surah' && surahAudioKeyRef.current === audioKey) {
      if (audio.paused) {
        audio.play().catch(() => setAudioPlaying(false));
      } else {
        audio.pause();
      }
      return;
    }

    stopAudio();
    const token = ++audioTokenRef.current;
    audioModeRef.current = 'surah';
    surahAudioKeyRef.current = audioKey;

    audio.onplay = () => {
      if (token === audioTokenRef.current) setAudioPlaying(true);
    };
    audio.onpause = () => {
      if (token === audioTokenRef.current) setAudioPlaying(false);
    };
    audio.onended = () => {
      if (token !== audioTokenRef.current) return;
      stopAudio();
    };
    audio.onerror = () => {
      if (token !== audioTokenRef.current) return;
      stopAudio();
      setLogError('تعذر تشغيل تلاوة السورة. تحقق من اتصال الإنترنت.');
    };

    audio.src = currentReciter.getSurahUrl(surahNumber);
    audio.play().catch((error) => {
      if (token !== audioTokenRef.current || error?.name === 'AbortError') return;
      setAudioPlaying(false);
    });
  };

  // Calculate global Ayah index in Quran (1..6236) for single verse audio
  const getGlobalAyahNumber = (surahNum, ayahNumInSurah) => {
    const priorAyahs = SURAHS.slice(0, surahNum - 1).reduce((acc, s) => acc + s.ayahsCount, 0);
    return priorAyahs + ayahNumInSurah;
  };

  // "سماع الآية": تشغيل هذه الآية وحدها ثم التوقف (من غير ما يكمل لما بعدها)
  const toggleSingleAyahAudio = (ayahNumInSurah) => {
    setLogError(null);

    // ضغطة تانية على نفس الآية وهي شغالة = إيقاف
    if (audioModeRef.current === 'ayah' && audioAyahRef.current === ayahNumInSurah) {
      stopAudio();
      return;
    }

    stopAudio();
    const token = ++audioTokenRef.current;
    audioModeRef.current = 'ayah';
    audioAyahRef.current = ayahNumInSurah;

    const audio = getPlayer();
    const globalNum = getGlobalAyahNumber(selectedSurah, ayahNumInSurah);

    audio.onended = () => {
      if (token !== audioTokenRef.current) return;
      stopAudio();
    };
    audio.onerror = () => {
      if (token !== audioTokenRef.current) return;
      stopAudio();
      setLogError('تعذر تشغيل الآية. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
    };

    audio.src = getCurrentReciter().getAyahUrl(globalNum);
    setSingleAyahPlaying(true);
    setPlayingAyahNumber(ayahNumInSurah);
    audio.play().catch((error) => {
      if (token !== audioTokenRef.current || error?.name === 'AbortError') return;
      console.warn('Could not play the ayah recitation:', error);
      stopAudio();
      setLogError('تعذر تشغيل الآية. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
    });
  };

  // "ابدأ قراءة من هنا": تلاوة متواصلة من هذه الآية حتى نهاية السورة (بدون أي تلوين للآية)
  const startSurahFromAyah = (ayahNumInSurah) => {
    setLogError(null);
    stopAudio();

    const token = ++audioTokenRef.current;
    audioModeRef.current = 'continuous';
    const surahNumber = selectedSurah;
    const lastAyah = selectedSurahMeta.ayahsCount;
    const audio = getPlayer();

    setContinuousAyahPlaying(true);
    setPlayingAyahNumber(ayahNumInSurah);

    const failPlayback = () => {
      if (token !== audioTokenRef.current) return;
      stopAudio();
      setLogError('تعذر تشغيل التلاوة. تحقق من اتصال الإنترنت ثم أعد المحاولة.');
    };

    const playAyah = (ayahNumber) => {
      if (token !== audioTokenRef.current) return;
      audioAyahRef.current = ayahNumber;
      setPlayingAyahNumber(ayahNumber);
      scrollReaderElement(
        document.getElementById(`ayah-${ayahNumber}`),
        'smooth',
        'center'
      );

      const reciterNow = getCurrentReciter();
      audio.onended = () => {
        if (token !== audioTokenRef.current) return;
        if (ayahNumber < lastAyah) {
          playAyah(ayahNumber + 1);
        } else {
          stopAudio();
        }
      };
      audio.onerror = failPlayback;
      audio.src = reciterNow.getAyahUrl(getGlobalAyahNumber(surahNumber, ayahNumber));
      audio.play().catch((error) => {
        if (token !== audioTokenRef.current || error?.name === 'AbortError') return;
        console.warn('Could not play Quran recitation:', error);
        failPlayback();
      });

      // تحميل مسبق للآية التالية عشان ما يبقاش فيه فجوة بين الآيات
      if (ayahNumber < lastAyah) {
        try {
          const preload = new Audio();
          preload.preload = 'auto';
          preload.src = reciterNow.getAyahUrl(getGlobalAyahNumber(surahNumber, ayahNumber + 1));
          preloadRef.current = preload;
        } catch {
          // ignore
        }
      }
    };

    const ayah = surahData?.ayahs?.find((item) => item.number === ayahNumInSurah);
    if (ayah) {
      setCurrentPage(ayah.pageNumber);
      setCurrentDivision(getQuranDivisionByAyah(ayah));
    }
    playAyah(ayahNumInSurah);
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
      // التنقل بين الآيات لا يقطع القراءة المتواصلة؛ يوقف فقط "سماع الآية" الواحدة
      if (audioModeRef.current === 'ayah') stopAudio();
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
      selectedAyah: 'bg-[#e7d7bb]/80 shadow-[inset_0_0_0_1px_#c7ab7e]',
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
      selectedAyah: 'bg-amber-300/15 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.6)]',
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
      selectedAyah: 'bg-emerald-100 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.55)]',
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

  // حالة أزرار الصوت داخل نافذة الآية
  const sheetAyahNumber = selectedAyahForTafseer?.number;
  const singleHere = singleAyahPlaying && playingAyahNumber === sheetAyahNumber;
  const continuousHere = continuousAyahPlaying && playingAyahNumber === sheetAyahNumber;
  const accentText = lightingTheme === 'night' ? 'text-emerald-300' : 'text-emerald-700';

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
        ref={readerHeaderRef}
        className={`fixed top-0 inset-x-0 border-b flex flex-col shrink-0 backdrop-blur-md z-30 transition-transform duration-300 ease-in-out ${
          showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        } ${themes.headerBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1: Surah selection, Page indicator, Bookmark, Search, Close */}
        <div className="px-3 sm:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 border-b border-current/10">
          {/* Right: Surah info & quick switcher */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
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
                  className="font-black text-xs sm:text-base md:text-lg bg-transparent border-none focus:outline-none cursor-pointer max-w-[150px] sm:max-w-xs truncate"
                  title="اضغط لتغيير السورة"
                >
                  {SURAHS.map((s) => (
                    <option key={s.number} value={s.number} className="text-slate-900 bg-white">
                      {s.number}. سورة {s.name} ({s.type === 'meccan' ? 'مكية' : 'مدنية'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/20">
                  صـ {currentPage}
                </span>
              </div>
              <p className={`text-[10px] sm:text-xs ${themes.subText} hidden md:block truncate`}>
                {currentMeta.type === 'meccan' ? 'مكية' : 'مدنية'} • {currentMeta.ayahsCount} آية
                {currentDivision
                  ? ` • الجزء ${currentDivision.juz} • الحزب ${currentDivision.hizb} • ${currentDivision.rubNameInHizb}`
                  : ''}
              </p>
            </div>
          </div>

          {/* Left: Bookmark, Search, Close */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Bookmark button */}
            <button
              type="button"
              onClick={() => handleToggleBookmark()}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                savedBookmark?.pageNumber === currentPage
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs ring-2 ring-amber-400/30'
                  : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
              }`}
              title={
                savedBookmark
                  ? `العلامة المرجعية: سورة ${savedBookmark.surahName} (صفحة ${savedBookmark.pageNumber}) • اضغط لتثبيت العلامة عند هذه الصفحة`
                  : 'حفظ علامة مرجعية عند هذه الصفحة'
              }
            >
              <Bookmark
                className={`w-4 h-4 ${
                  savedBookmark?.pageNumber === currentPage ? 'fill-current text-slate-950' : 'text-amber-500'
                }`}
              />
              <span className="hidden sm:inline font-bold">
                {savedBookmark?.pageNumber === currentPage ? 'العلامة محددة' : 'حفظ موضع'}
              </span>
            </button>

            {/* Jump to Bookmark button (if bookmark exists on another page) */}
            {savedBookmark && savedBookmark.pageNumber !== currentPage && (
              <button
                type="button"
                onClick={handleJumpToBookmark}
                className="px-2 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer flex items-center gap-1"
                title={`الانتقال إلى العلامة المرجعية المحفوظة: سورة ${savedBookmark.surahName} صفحة ${savedBookmark.pageNumber}`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span className="hidden md:inline">صـ {savedBookmark.pageNumber}</span>
              </button>
            )}

            {/* Search button */}
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl sm:rounded-2xl text-xs font-bold bg-black/5 dark:bg-white/5 border border-current/10 hover:bg-black/10 flex items-center gap-1 transition cursor-pointer"
              title="البحث في السور والآيات (Ctrl+K أو /)"
            >
              <Search className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline font-bold">بحث</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-black/10 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs border border-current/10"
              title="إغلاق المصحف والعودة"
              aria-label="إغلاق المصحف"
            >
              <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Reading Tools Toolbar (Reciter, Audio, Font size, Font family, Sepia toggle, Themes) */}
        <div className="px-3 sm:px-8 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar bg-black/[0.02] dark:bg-white/[0.02]">
          {/* Reciter selector + Full Surah Audio Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="flex items-center gap-1">
              <span className="sr-only">القارئ</span>
              <select
                value={reciter}
                onChange={(event) => {
                  const newRec = event.target.value;
                  setReciter(newRec);
                  // تلاوة السورة كاملة بتتوقف عند تغيير القارئ؛ القراءة المتواصلة تكمل بالقارئ الجديد من الآية التالية
                  if (audioModeRef.current === 'surah') stopAudio();
                }}
                className="rounded-xl border border-current/10 bg-black/5 dark:bg-white/5 px-2 py-1 text-xs font-bold cursor-pointer hover:bg-black/10 focus:outline-none"
                aria-label="اختيار قارئ القرآن"
                title="اختيار القارئ المفضل"
              >
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id} className="bg-white text-slate-900">
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            {/* Full Surah Audio Play/Pause Button */}
            <button
              type="button"
              onClick={toggleAudio}
              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all border cursor-pointer ${
                audioPlaying
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs animate-pulse'
                  : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
              }`}
              title={`تلاوة صوتية للسورة كاملة بصوت ${RECITERS.find((r) => r.id === reciter)?.name || 'القارئ'}`}
            >
              {audioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="font-bold">{audioPlaying ? 'إيقاف' : 'تلاوة السورة'}</span>
            </button>
          </div>

          {/* Center & Left Tools: Font Size, Font Style, Sepia Quick Toggle, Themes */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Font Sizer Controls (+ / -) */}
            <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl border border-current/10">
              <button
                type="button"
                onClick={() => setFontScale((s) => Math.max(1, s - 1))}
                disabled={fontScale <= 1}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-black/10 disabled:opacity-30 cursor-pointer"
                title="تصغير الخط"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[10px] font-black px-1 opacity-80" title="حجم الخط">
                {fontScale === 1 ? 'ص' : fontScale === 2 ? 'م' : fontScale === 3 ? 'ك' : fontScale === 4 ? 'ك+' : 'ك++'}
              </span>
              <button
                type="button"
                onClick={() => setFontScale((s) => Math.min(5, s + 1))}
                disabled={fontScale >= 5}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-black/10 disabled:opacity-30 cursor-pointer"
                title="تكبير الخط"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>

            {/* Uthmani Font Family Selector */}
            <div className="relative">
              <button
                type="button"
                ref={fontButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFontMenu((prev) => !prev);
                }}
                className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-black/5 dark:bg-white/5 border border-current/10 hover:bg-black/10 flex items-center gap-1 transition cursor-pointer"
                title="اختيار نوع الخط العثماني"
                aria-label="اختيار نوع خط المصحف"
                aria-expanded={showFontMenu}
                aria-haspopup="menu"
              >
                <Type className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold">{currentFont.shortName}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Font Picker Popover */}
              {showFontMenu && fontMenuPosition && createPortal(
                <div
                  className="fixed inset-0 z-[9999]"
                  onClick={() => setShowFontMenu(false)}
                >
                  <div
                    className={`absolute p-2 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 ${themes.drawerBg}`}
                    style={fontMenuPosition}
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
                              <p className={`text-base mt-1 ${isSelected ? 'text-white' : themes.drawerHighlight}`} style={{ fontFamily: font.fontFamily }}>
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                              </p>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0 mt-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>,
                document.body,
              )}
            </div>

            {/* Quick Sepia Switch Toggle */}
            <button
              type="button"
              onClick={toggleSepia}
              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                isSepiaActive
                  ? 'bg-[#7c561f] text-white border-[#7c561f] shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
              }`}
              title={isSepiaActive ? 'إيقاف نمط سيبيا والعودة للوضع السابق' : 'تفعيل مفتاح نمط الورق الدافئ (Sepia)'}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">سيبيا</span>
              <span
                className={`w-6 h-3.5 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                  isSepiaActive ? 'bg-amber-300 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full transition-transform ${isSepiaActive ? 'bg-[#2c2214]' : 'bg-white'}`} />
              </span>
            </button>

            {/* Desktop Theme Presets (دافئ / ليلي / فاتح) */}
            <div className="hidden lg:flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-xl border border-current/10">
              <button
                type="button"
                onClick={() => setLightingTheme('sepia')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lightingTheme === 'sepia' ? themes.activeBtn : 'opacity-60 hover:opacity-100'
                }`}
                title="ورق دافئ (سيبيا)"
              >
                <Eye className="w-3 h-3" />
                <span>دافئ</span>
              </button>
              <button
                type="button"
                onClick={() => setLightingTheme('night')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lightingTheme === 'night' ? themes.activeBtn : 'opacity-60 hover:opacity-100'
                }`}
                title="ليلي مريح"
              >
                <Moon className="w-3 h-3" />
                <span>ليلي</span>
              </button>
              <button
                type="button"
                onClick={() => setLightingTheme('clean')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  lightingTheme === 'clean' ? themes.activeBtn : 'opacity-60 hover:opacity-100'
                }`}
                title="فاتح نقي"
              >
                <Sun className="w-3 h-3" />
                <span>فاتح</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-2xl bg-slate-900/90 text-white text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-white/10">
          <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Fullscreen Quran Canvas - Tapping anywhere toggles zen reading mode */}
      <main
        ref={readerCanvasRef}
        onClick={() => setShowControls((prev) => !prev)}
        className={`flex-1 min-h-0 overflow-y-auto px-4 sm:px-12 md:px-20 lg:px-32 transition-all duration-300 cursor-default ${
          showControls ? 'pt-28 pb-24 sm:pt-26 sm:pb-24' : 'pt-8 pb-12'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Bookmark Alert Banner */}
          {previousAlert && (
            <div
              className={`rounded-2xl border p-3 sm:p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 ${themes.bannerBg}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Bookmark className="w-5 h-5 fill-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold truncate">
                    {previousAlert.isBookmark ? '📌 علامتك المرجعية المحفوظة:' : '📖 موضع قراءتك السابق:'}{' '}
                    سورة {previousAlert.surahName} (صفحة {previousAlert.pageNumber}
                    {previousAlert.ayahNumber ? ` • الآية ${previousAlert.ayahNumber}` : ''})
                  </p>
                  <p className={`text-[11px] ${themes.subText} truncate`}>
                    اضغط للانتقال إلى علامتك المرجعية
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    pendingPageNavigationRef.current = previousAlert.pageNumber;
                    if (previousAlert.surahNumber !== selectedSurah) {
                      setSelectedSurah(previousAlert.surahNumber);
                    }
                    setCurrentPage(previousAlert.pageNumber);
                    setPreviousAlert(null);
                    showToast(`تم الانتقال إلى سورة ${previousAlert.surahName} (صفحة ${previousAlert.pageNumber})`);
                    setTimeout(() => {
                      const pageEl = document.getElementById(`quran-page-${previousAlert.pageNumber}`);
                      scrollReaderElement(pageEl, 'smooth', 'start');
                      if (previousAlert.ayahNumber) {
                        const ayahEl = document.getElementById(`ayah-${previousAlert.ayahNumber}`);
                        scrollReaderElement(ayahEl, 'smooth', 'center');
                      }
                    }, 200);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                  title="الانتقال إلى العلامة المرجعية"
                >
                  <span>انتقال</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviousAlert(null)}
                  className="w-7 h-7 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-xs opacity-60 hover:opacity-100 transition cursor-pointer"
                  title="إغلاق التنبيه"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Subtle guidance tip when controls are shown */}
          {showControls && (
            <div className="text-center">
              <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold opacity-75 border border-current/10 bg-black/5`}>
                <BookOpenCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  {viewMode === 'page'
                    ? 'تنقل بين صفحات المصحف بالأسهم أو اختر رقم الصفحة • انقر لإخفاء الأشرطة'
                    : 'انقر على أي آية لعرض تفسيرها وسماعها أو بدء القراءة منها • انقر في أي مكان بالشاشة لإخفاء الأشرطة'}
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
                    <p className={`text-2xl sm:text-3xl font-bold ${themes.bismillahColor}`} style={{ fontFamily: currentFont.fontFamily }}>
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
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
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(section.ayahs[0])}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold border transition flex items-center gap-1 cursor-pointer ${
                            savedBookmark?.pageNumber === section.pageNumber
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs ring-2 ring-amber-400/30'
                              : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
                          }`}
                          title="تعيين علامة مرجعية عند هذه الصفحة"
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${
                              savedBookmark?.pageNumber === section.pageNumber
                                ? 'fill-current text-slate-950'
                                : 'text-amber-500'
                            }`}
                          />
                          <span>
                            {savedBookmark?.pageNumber === section.pageNumber ? 'علامتك المرجعية هنا' : 'وضع علامة هنا'}
                          </span>
                        </button>
                      </div>
                      <div
                        className={`text-right font-normal tracking-normal ${themes.verseTextColor} ${fontStyle} rounded-2xl px-3 py-2 leading-relaxed`}
                        style={{
                          fontFamily: currentFont.fontFamily,
                          textAlignLast: 'right',
                          wordSpacing: '0.04em',
                        }}
                      >
                        {section.ayahs.map((ayah) => {
                          const isSelected = selectedAyahForTafseer?.number === ayah.number;
                          const isPlaying = playingAyahNumber === ayah.number;
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
                              className={`inline box-decoration-clone px-1 py-0.5 rounded-xl transition-colors cursor-pointer ${
                                isSelected ? themes.selectedAyah : themes.verseHover
                              } ${SHOW_PLAYING_TINT && isPlaying ? 'text-emerald-600' : ''}`}
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
          className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-lg"
        >
          {logError}
        </p>
      )}

      {/* شريط التلاوة المتواصلة: يظهر حتى لو أُغلق التفسير، ويتيح إيقاف التلاوة */}
      {continuousAyahPlaying && (
        <div
          className={`fixed bottom-20 sm:bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-2 shadow-xl backdrop-blur-md ${themes.headerBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Volume2 className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold whitespace-nowrap">
            قراءة متواصلة{playingAyahNumber ? ` • الآية ${playingAyahNumber}` : ''}
          </span>
          <button
            type="button"
            onClick={stopContinuousAudio}
            className="flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-1 text-xs font-bold text-white cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>إيقاف</span>
          </button>
        </div>
      )}

      {/* Tafseer Al-Muyassar Bottom Sheet Drawer (تفسير ميسر بدون تشتيت وراحة تامة للعين) */}
      {selectedAyahForTafseer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs transition-opacity duration-300 p-0 sm:p-4 animate-in fade-in"
          onClick={closeTafseer}
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

              {/* Action Buttons: Bookmark, Copy, Close */}
              <div className="flex items-center gap-1.5">
                {/* Bookmark Ayah */}
                <button
                  type="button"
                  onClick={() => handleToggleBookmark(selectedAyahForTafseer)}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                    savedBookmark?.pageNumber === selectedAyahForTafseer.pageNumber &&
                    savedBookmark?.ayahNumber === selectedAyahForTafseer.number
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-black/5 hover:bg-black/10 border-current/10'
                  }`}
                  title="حفظ علامة مرجعية عند هذه الآية"
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      savedBookmark?.pageNumber === selectedAyahForTafseer.pageNumber &&
                      savedBookmark?.ayahNumber === selectedAyahForTafseer.number
                        ? 'fill-current text-slate-950'
                        : 'text-amber-500'
                    }`}
                  />
                  <span className="hidden sm:inline">علامة</span>
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

                {/* Close Button: لا يوقف الصوت */}
                <button
                  type="button"
                  onClick={closeTafseer}
                  className="w-8 h-8 rounded-xl bg-black/5 hover:bg-rose-600 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="إغلاق التفسير (الصوت يكمل)"
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
                  className={`text-xl sm:text-2xl font-bold leading-relaxed ${themes.drawerHighlight}`}
                  style={{ fontFamily: currentFont.fontFamily }}
                >
                  ﴿ {selectedAyahForTafseer.text} ﴾
                </p>
                <span className={`inline-block text-xs font-semibold ${themes.subText}`}>
                  سورة {currentMeta.name} — الآية [{selectedAyahForTafseer.number}]
                </span>
              </div>

              {/* زرارين الصوت: مختلفين بوضوح في الشكل والوظيفة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1) سماع الآية: هذه الآية فقط ثم تتوقف */}
                <button
                  type="button"
                  onClick={() => toggleSingleAyahAudio(selectedAyahForTafseer.number)}
                  className={`rounded-2xl border-2 px-3.5 py-2.5 flex items-center gap-3 text-right transition cursor-pointer ${
                    singleHere
                      ? `border-emerald-500 bg-emerald-500/15 ${accentText}`
                      : `border-emerald-500/50 hover:border-emerald-500 hover:bg-emerald-500/10 ${accentText}`
                  }`}
                  title={`سماع هذه الآية فقط ثم تتوقف، بصوت ${RECITERS.find((r) => r.id === reciter)?.name || 'القارئ'}`}
                >
                  <span className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                    {singleHere ? <Pause className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black">
                      {singleHere ? 'إيقاف الآية' : 'سماع الآية'}
                    </span>
                    <span className="block text-[11px] font-semibold opacity-75">
                      هذه الآية فقط ثم تتوقف
                    </span>
                  </span>
                </button>

                {/* 2) ابدأ قراءة من هنا: متواصلة حتى نهاية السورة */}
                <button
                  type="button"
                  onClick={() => {
                    if (continuousHere) {
                      stopAudio();
                    } else {
                      startSurahFromAyah(selectedAyahForTafseer.number);
                    }
                  }}
                  className={`rounded-2xl border-2 px-3.5 py-2.5 flex items-center gap-3 text-right text-white shadow-sm transition cursor-pointer ${
                    continuousHere
                      ? 'bg-rose-600 border-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 border-emerald-600 hover:bg-emerald-700'
                  }`}
                  title={`قراءة متواصلة من هذه الآية حتى نهاية سورة ${currentMeta.name} بصوت ${RECITERS.find((r) => r.id === reciter)?.name || 'القارئ'}`}
                >
                  <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    {continuousHere ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black">
                      {continuousHere ? 'إيقاف القراءة' : 'ابدأ قراءة من هنا'}
                    </span>
                    <span className="block text-[11px] font-semibold opacity-85">
                      متواصلة حتى نهاية السورة
                    </span>
                  </span>
                </button>
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
                                className={`text-sm sm:text-base leading-relaxed ${themes.drawerHighlight}`}
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
