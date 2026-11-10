import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FORTY_HADITHS, HADITH_CATEGORIES } from '../data/fortyHadith.js';
import {
  HADITH_COLLECTIONS,
  BUKHARI_BOOKS,
  MUSLIM_BOOKS,
} from '../data/hadithCollections.js';
import {
  fetchBookHadiths,
  isBookCached,
  getCollectionStats,
} from '../lib/hadithService.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Bookmark,
  Share2,
  ChevronDown,
  ChevronUp,
  Award,
  Eye,
  Moon,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  Scroll,
  Library,
  BookMarked,
  Filter,
} from 'lucide-react';

export function HadithPage() {
  const { userDoc, updateUserDoc } = useAuth();

  // Selected collection: 'nawawi' | 'bukhari' | 'muslim'
  const [selectedCollection, setSelectedCollection] = useState(() => {
    return localStorage.getItem('mutabi_active_hadith_collection') || 'nawawi';
  });

  // Selected Book for Bukhari / Muslim (defaults to Book 1 or 0)
  const [selectedBookId, setSelectedBookId] = useState(null);

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');
  const [bookSearchQuery, setBookSearchQuery] = useState('');

  // Forty Hadiths category filter
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  // Status filter: 'all' | 'completed' | 'uncompleted' | 'bookmarked'
  const [statusFilter, setStatusFilter] = useState('all');

  // Eye comfort theme: 'normal' | 'night' | 'sepia'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mutabi_hadith_theme') || 'normal';
  });

  // Font scale: 1 (normal), 2 (large), 3 (x-large)
  const [fontScale, setFontScale] = useState(2);

  // Loaded hadiths for current Bukhari/Muslim book
  const [bookHadiths, setBookHadiths] = useState([]);
  const [isLoadingBook, setIsLoadingBook] = useState(false);
  const [bookError, setBookError] = useState(null);

  // Pagination for ultra-fast rendering (20 hadiths per batch)
  const [visibleCount, setVisibleCount] = useState(20);

  // Expandable benefits for 40 Hadiths
  const [expandedBenefits, setExpandedBenefits] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // User progress from userDoc (synced with Firebase)
  const readHadithMap = useMemo(() => {
    return userDoc?.hadithProgress?.read || {};
  }, [userDoc]);

  const bookmarkedMap = useMemo(() => {
    return userDoc?.hadithProgress?.bookmarked || {};
  }, [userDoc]);

  // Save selected collection preference
  const handleSelectCollection = (collId) => {
    setSelectedCollection(collId);
    setSelectedBookId(null);
    setSearchQuery('');
    setBookSearchQuery('');
    setVisibleCount(20);
    localStorage.setItem('mutabi_active_hadith_collection', collId);
  };

  // Load hadiths when a book is selected in Bukhari or Muslim
  useEffect(() => {
    if (selectedCollection === 'nawawi') {
      setBookHadiths(FORTY_HADITHS);
      setIsLoadingBook(false);
      setBookError(null);
      return;
    }

    if (selectedBookId === null) {
      setBookHadiths([]);
      return;
    }

    let isMounted = true;
    setIsLoadingBook(true);
    setBookError(null);
    setVisibleCount(20);

    fetchBookHadiths(selectedCollection, selectedBookId)
      .then((res) => {
        if (isMounted) {
          setBookHadiths(res.hadiths);
          setIsLoadingBook(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setBookError(err.message || 'تعذر تحميل الأحاديث. يرجى المحاولة لاحقاً.');
          setIsLoadingBook(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCollection, selectedBookId]);

  // Toggle Read status with progress update
  const toggleRead = async (hadithId) => {
    const isCurrentRead = !!readHadithMap[hadithId];
    const updatedRead = {
      ...readHadithMap,
      [hadithId]: !isCurrentRead,
    };
    if (updateUserDoc) {
      await updateUserDoc({
        hadithProgress: {
          read: updatedRead,
          bookmarked: bookmarkedMap,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  };

  // Toggle Bookmark
  const toggleBookmark = async (hadithId) => {
    const isCurrentBookmarked = !!bookmarkedMap[hadithId];
    const updatedBookmarked = {
      ...bookmarkedMap,
      [hadithId]: !isCurrentBookmarked,
    };
    if (updateUserDoc) {
      await updateUserDoc({
        hadithProgress: {
          read: readHadithMap,
          bookmarked: updatedBookmarked,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  };

  const toggleExpand = (hadithId) => {
    setExpandedBenefits((prev) => ({
      ...prev,
      [hadithId]: !prev[hadithId],
    }));
  };

  const handleCopy = (hadith) => {
    const textToCopy = `«${hadith.title || ''}»\n${hadith.text}\n[${hadith.source || hadith.briefSource || ''}]`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(hadith.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleShare = (hadith) => {
    if (navigator.share) {
      navigator.share({
        title: hadith.title || 'حديث شريف',
        text: `«${hadith.title || ''}»\n${hadith.text}\n[${hadith.briefSource || ''}]`,
      }).catch(() => {});
    } else {
      handleCopy(hadith);
    }
  };

  // Collection Stats
  const currentCollectionStats = useMemo(() => {
    return getCollectionStats(selectedCollection, readHadithMap, bookmarkedMap);
  }, [selectedCollection, readHadithMap, bookmarkedMap]);

  // Current Books List for Bukhari or Muslim
  const currentBooksList = useMemo(() => {
    if (selectedCollection === 'bukhari') return BUKHARI_BOOKS;
    if (selectedCollection === 'muslim') return MUSLIM_BOOKS;
    return [];
  }, [selectedCollection]);

  // Filtered Books List by search
  const filteredBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) return currentBooksList;
    const query = bookSearchQuery.trim().toLowerCase();
    return currentBooksList.filter((b) => {
      return (
        b.title.toLowerCase().includes(query) ||
        b.englishTitle.toLowerCase().includes(query) ||
        String(b.id) === query ||
        (b.firstHadith <= Number(query) && b.lastHadith >= Number(query))
      );
    });
  }, [currentBooksList, bookSearchQuery]);

  // Current Book Metadata
  const currentBookObj = useMemo(() => {
    if (selectedBookId === null) return null;
    return currentBooksList.find((b) => b.id === selectedBookId) || null;
  }, [currentBooksList, selectedBookId]);

  // Navigation: Next / Prev Book
  const handlePrevBook = () => {
    if (!currentBookObj) return;
    const currentIndex = currentBooksList.findIndex((b) => b.id === selectedBookId);
    if (currentIndex > 0) {
      setSelectedBookId(currentBooksList[currentIndex - 1].id);
      setSearchQuery('');
    }
  };

  const handleNextBook = () => {
    if (!currentBookObj) return;
    const currentIndex = currentBooksList.findIndex((b) => b.id === selectedBookId);
    if (currentIndex < currentBooksList.length - 1) {
      setSelectedBookId(currentBooksList[currentIndex + 1].id);
      setSearchQuery('');
    }
  };

  // Filtered Hadiths for active view
  const filteredHadiths = useMemo(() => {
    const sourceList = selectedCollection === 'nawawi' ? FORTY_HADITHS : bookHadiths;

    return sourceList.filter((h) => {
      // 40 Hadiths category filter
      if (selectedCollection === 'nawawi' && selectedCategory !== 'الكل' && h.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'completed' && !readHadithMap[h.id]) return false;
      if (statusFilter === 'uncompleted' && readHadithMap[h.id]) return false;
      if (statusFilter === 'bookmarked' && !bookmarkedMap[h.id]) return false;

      // Text / Number search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesTitle = h.title?.toLowerCase().includes(query);
        const matchesText = h.text?.toLowerCase().includes(query);
        const matchesNarrator = h.narrator?.toLowerCase().includes(query);
        const matchesNumber =
          String(h.number) === query ||
          String(h.arabicNumber) === query ||
          String(h.bookHadithNumber) === query;
        return matchesTitle || matchesText || matchesNarrator || matchesNumber;
      }
      return true;
    });
  }, [
    selectedCollection,
    bookHadiths,
    selectedCategory,
    statusFilter,
    searchQuery,
    readHadithMap,
    bookmarkedMap,
  ]);

  // Paginated visible hadiths for smooth 60fps scrolling
  const visibleHadiths = useMemo(() => {
    if (selectedCollection === 'nawawi') return filteredHadiths;
    return filteredHadiths.slice(0, visibleCount);
  }, [filteredHadiths, visibleCount, selectedCollection]);

  // Theme palettes
  const themeStyles = {
    normal: {
      cardBg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
      heroBg: 'bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-950 text-white',
      cardDoneBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800',
      hadithText: 'text-slate-900 dark:text-slate-100',
      quoteBorder: 'border-emerald-600/30',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    night: {
      cardBg: 'bg-[#0e1422] border-slate-800 text-[#f1f5f9]',
      heroBg: 'bg-gradient-to-br from-[#0a1120] via-[#0d1729] to-[#050912] text-white',
      cardDoneBg: 'bg-[#0f2122] border-emerald-700/60 text-emerald-200',
      hadithText: 'text-[#f8fafc]',
      quoteBorder: 'border-emerald-500/40',
      badgeBg: 'bg-slate-800/90 text-slate-300',
    },
    sepia: {
      cardBg: 'bg-[#fbf7ee] border-[#e8dfc8] text-[#2c2214]',
      heroBg: 'bg-gradient-to-br from-[#6b4716] via-[#7c561f] to-[#452e0d] text-[#fff8ee]',
      cardDoneBg: 'bg-[#eef5ee] border-[#badcbe] text-[#1c4b22]',
      hadithText: 'text-[#2c2214]',
      quoteBorder: 'border-[#c4ad85]',
      badgeBg: 'bg-[#ebdcc4] text-[#42331c]',
    },
  }[theme];

  const fontSizeClass = {
    1: 'text-base sm:text-lg leading-[2.4]',
    2: 'text-lg sm:text-xl leading-[2.6]',
    3: 'text-xl sm:text-2xl leading-[2.9]',
  }[fontScale];

  return (
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-16">
      {/* Hero Header */}
      <div className={`rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-emerald-700/40 ${themeStyles.heroBg}`}>
        <div className="absolute top-0 end-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>مكتبة الأحاديث النبوية الشريفة</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {selectedCollection === 'nawawi'
                ? 'الأربعين النووية الشريفة'
                : selectedCollection === 'bukhari'
                ? 'صحيح الإمام البخاري كاملاً'
                : 'صحيح الإمام مسلم كاملاً'}
            </h1>

            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed font-medium">
              {selectedCollection === 'nawawi'
                ? 'متن الأربعين النووية للإمام النووي رحمه الله • 42 حديثاً جامعاً لأصول الدين وقواعد الإسلام ومكارم الأخلاق، مضبوطة بالتشكيل مع الفوائد والبيان.'
                : selectedCollection === 'bukhari'
                ? 'الجامع المسند الصحيح المختصر من أمور رسول الله ﷺ وسننه وأيامه للإمام أبي عبد الله البخاري • 97 كتاباً كاملاً يضم 7,563 حديثاً مشكولة مع الأسانيد.'
                : 'المسند الصحيح بنقل العدل عن العدل إلى رسول الله ﷺ للإمام مسلم بن الحجاج النيسابوري • 57 كتاباً شاملاً لمقدمة الإمام مسلم وكافة أبواب الفقه والسنن.'}
            </p>

            {/* Quick KPI stats */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>
                  أتممت قراءة: {currentCollectionStats.readCount} من{' '}
                  {currentCollectionStats.totalHadiths.toLocaleString('ar-EG')} حديثاً
                </span>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2 text-xs font-bold">
                <Bookmark className="w-4 h-4 text-amber-300" />
                <span>المفضلة: {currentCollectionStats.bookmarkedCount}</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md flex items-center gap-1.5 text-xs font-bold text-emerald-200">
                <Download className="w-3.5 h-3.5" />
                <span>متاحة بالكامل دون إنترنت بعد الفتح</span>
              </div>
            </div>
          </div>

          {/* Progress Circular KPI */}
          <div className="shrink-0 flex items-center gap-4 bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/15">
            <div className="text-center">
              <div className="text-3xl font-black text-white">{currentCollectionStats.percent}%</div>
              <div className="text-[11px] text-emerald-200 font-bold mt-0.5">نسبة إتمام الورد</div>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Switcher Tabs (3 Major Collections) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {HADITH_COLLECTIONS.map((coll) => {
          const isActive = selectedCollection === coll.id;
          return (
            <button
              key={coll.id}
              type="button"
              onClick={() => handleSelectCollection(coll.id)}
              className={`p-4 rounded-3xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                isActive
                  ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {coll.badge}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {coll.totalHadiths.toLocaleString('ar-EG')} حديثاً
                </span>
              </div>
              <h2 className="font-black text-base text-slate-900 dark:text-white mb-1">
                {coll.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {coll.author}
              </p>
            </button>
          );
        })}
      </div>

      {/* VIEW A: Bukhari & Muslim Books Directory (when no book is open) */}
      {selectedCollection !== 'nawawi' && selectedBookId === null && (
        <div className="space-y-4">
          {/* Books Search Bar & Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Library className="w-4 h-4 text-emerald-600" />
                  <span>فهرس كتب {selectedCollection === 'bukhari' ? 'صحيح البخاري' : 'صحيح مسلم'}</span>
                  <span className="text-xs font-bold text-slate-400">({currentBooksList.length} كتاباً)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  اختر أي كتاب لتصفح أحاديثه المشكولة فوراً مع إمكانية البحث برقم الحديث أو الكلمات.
                </p>
              </div>

              {/* Book search input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الكتاب، رقمه، أو الموضوع..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Books Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBooks.map((book) => {
              const cached = isBookCached(selectedCollection, book.id);

              return (
                <div
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 p-4 rounded-3xl shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {book.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {cached && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          محفوظ أوفلاين
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-400">
                        {book.count} حديثاً
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      الأحاديث من {book.firstHadith} إلى {book.lastHadith}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>فتح نصوص الكتاب</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: Active Hadiths Reader (For 40 Hadiths OR a specific Bukhari/Muslim Book) */}
      {(selectedCollection === 'nawawi' || selectedBookId !== null) && (
        <div className="space-y-4">
          {/* Back button & book navigator for Bukhari & Muslim */}
          {selectedCollection !== 'nawawi' && currentBookObj && (
            <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-3xl shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedBookId(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>العودة لفهرس الكتب</span>
              </button>

              <div className="text-center hidden sm:block">
                <p className="font-black text-xs text-slate-900 dark:text-white">
                  {currentBookObj.title}
                </p>
                <p className="text-[10px] text-slate-400">
                  {currentBookObj.count} حديثاً • النطاق ({currentBookObj.firstHadith} - {currentBookObj.lastHadith})
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevBook}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  title="الكتاب السابق"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextBook}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                  title="الكتاب التالي"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Controls & Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
            {/* Search Bar + Eye Comfort Modes */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم الحديث، أو أي كلمة من نصه الشريف..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Eye comfort theme & font controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Theme switcher */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('normal');
                      localStorage.setItem('mutabi_hadith_theme', 'normal');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      theme === 'normal' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    عادي
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('sepia');
                      localStorage.setItem('mutabi_hadith_theme', 'sepia');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      theme === 'sepia' ? 'bg-[#7c561f] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>دافئ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('night');
                      localStorage.setItem('mutabi_hadith_theme', 'night');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      theme === 'night' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>ليلي</span>
                  </button>
                </div>

                {/* Font scale buttons */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <span className="text-[10px] px-1 text-slate-500 font-bold">الخط:</span>
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFontScale(s)}
                      className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                        fontScale === s ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {s === 1 ? 'ص' : s === 2 ? 'م' : 'ك'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1.5 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                جميع الأحاديث ({selectedCollection === 'nawawi' ? FORTY_HADITHS.length : bookHadiths.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                المقروءة
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('uncompleted')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'uncompleted'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                المتبقية
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('bookmarked')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'bookmarked'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>المفضلة</span>
              </button>
            </div>

            {/* 40 Hadiths Categories Pills */}
            {selectedCollection === 'nawawi' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
                {HADITH_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl transition shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoadingBook && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                جارٍ جلب وتجهيز نصوص الكتاب المشكولة...
              </p>
              <p className="text-xs text-slate-400">
                يتم حفظ الكتاب تلقائياً على جهازك للقراءة الفورية أوفلاين.
              </p>
            </div>
          )}

          {/* Error State */}
          {bookError && !isLoadingBook && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center space-y-3">
              <p className="font-bold text-sm text-rose-700 dark:text-rose-300">
                {bookError}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (selectedBookId !== null) {
                    setIsLoadingBook(true);
                    setBookError(null);
                    fetchBookHadiths(selectedCollection, selectedBookId)
                      .then((res) => {
                        setBookHadiths(res.hadiths);
                        setIsLoadingBook(false);
                      })
                      .catch((err) => {
                        setBookError(err.message);
                        setIsLoadingBook(false);
                      });
                  }
                }}
                className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Hadith Cards Stream */}
          {!isLoadingBook && !bookError && (
            <div className="space-y-4">
              {filteredHadiths.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                    لا توجد أحاديث مطابقة لهذا البحث أو الفلتر
                  </h3>
                  <p className="text-xs text-slate-400">
                    جرّب تغيير كلمات البحث أو إلغاء تحديد الفلتر.
                  </p>
                </div>
              ) : (
                <>
                  {visibleHadiths.map((hadith) => {
                    const isRead = !!readHadithMap[hadith.id];
                    const isBookmarked = !!bookmarkedMap[hadith.id];
                    const isExpanded = !!expandedBenefits[hadith.id];

                    return (
                      <div
                        key={hadith.id}
                        className={`rounded-3xl border p-5 sm:p-7 shadow-xs transition-all duration-200 space-y-4 ${
                          isRead ? themeStyles.cardDoneBg : themeStyles.cardBg
                        }`}
                      >
                        {/* Top Card Bar: Number, Category, Read toggle, Bookmark & Actions */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {hadith.number}
                            </span>
                            <div>
                              <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                {hadith.title || `حديث رقم (${hadith.number})`}
                              </h2>
                              {hadith.category && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${themeStyles.badgeBg}`}>
                                  {hadith.category}
                                </span>
                              )}
                              {hadith.bookHadithNumber && (
                                <span className="text-[10px] text-slate-400 font-bold block sm:inline-block sm:ms-2">
                                  حديث {hadith.bookHadithNumber} في الباب
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions: Mark read, bookmark, copy, share */}
                          <div className="flex items-center gap-1.5">
                            {/* Read Toggle Button */}
                            <button
                              type="button"
                              onClick={() => toggleRead(hadith.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                                isRead
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                  : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10'
                              }`}
                              title={isRead ? 'إلغاء تحديد القراءة' : 'تحديد الحديث كمقروء (+10 نقاط)'}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isRead ? 'تمت القراءة' : 'تحديد كمقروء'}</span>
                            </button>

                            {/* Bookmark Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleBookmark(hadith.id)}
                              className={`p-2 rounded-xl border transition cursor-pointer ${
                                isBookmarked
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                  : 'bg-black/5 dark:bg-white/5 border-current/10 hover:bg-black/10 opacity-70 hover:opacity-100'
                              }`}
                              title={isBookmarked ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>

                            {/* Copy Button */}
                            <button
                              type="button"
                              onClick={() => handleCopy(hadith)}
                              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-current/10 hover:bg-black/10 opacity-70 hover:opacity-100 transition cursor-pointer"
                              title="نسخ نص الحديث"
                            >
                              {copiedId === hadith.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            {/* Share Button */}
                            <button
                              type="button"
                              onClick={() => handleShare(hadith)}
                              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-current/10 hover:bg-black/10 opacity-70 hover:opacity-100 transition cursor-pointer"
                              title="مشاركة الحديث"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Narrator (if available separately) */}
                        {hadith.narrator && (
                          <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <span className="opacity-60">سند الرواية:</span>
                            <span>{hadith.narrator}</span>
                          </div>
                        )}

                        {/* Hadith Matn (Text) in Vocalized Script */}
                        <div
                          className={`p-4 sm:p-5 rounded-2xl bg-black/3 dark:bg-white/3 border ${themeStyles.quoteBorder} font-serif ${fontSizeClass} ${themeStyles.hadithText}`}
                          style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}
                        >
                          {hadith.text}
                        </div>

                        {/* Source Verification & Expandable benefits (for Nawawi) */}
                        <div className="flex items-center justify-between text-xs opacity-75 pt-1">
                          <span>
                            {hadith.source ||
                              (selectedCollection === 'bukhari'
                                ? `صحيح البخاري، رقم (${hadith.number})`
                                : selectedCollection === 'muslim'
                                ? `صحيح مسلم، رقم (${hadith.number})`
                                : hadith.briefSource)}
                          </span>

                          {hadith.benefits && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(hadith.id)}
                              className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              <span>{isExpanded ? 'إخفاء الفوائد' : 'عرض الفوائد والشرح'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        {/* Expandable Benefits & Lessons */}
                        {isExpanded && hadith.benefits && (
                          <div className="mt-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-2 animate-in fade-in">
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-emerald-600" />
                              <span>فوائد وعبر مستفادة من الحديث:</span>
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium pr-1">
                              {hadith.benefits.map((b, idx) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Load More Button for large books (e.g. Muslim books with 200+ hadiths) */}
                  {selectedCollection !== 'nawawi' && visibleCount < filteredHadiths.length && (
                    <div className="text-center pt-4">
                      <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => prev + 25)}
                        className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                      >
                        عرض المزيد من أحاديث الباب ({filteredHadiths.length - visibleCount} حديث متبقٍ)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
