import React, { useState, useMemo } from 'react';
import { FORTY_HADITHS, HADITH_CATEGORIES } from '../data/fortyHadith.js';
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
  Sparkles,
  Award,
  CircleDot,
  Eye,
  Moon,
  Sun,
  Flame,
  RotateCcw,
} from 'lucide-react';

export function HadithPage() {
  const { user, userDoc, updateUserDoc } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'completed' | 'uncompleted' | 'bookmarked'
  const [expandedBenefits, setExpandedBenefits] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Eye comfort theme: 'normal' | 'night' | 'sepia'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mutabi_hadith_theme') || 'normal';
  });

  // Font scale: 1 (normal), 2 (large), 3 (x-large)
  const [fontScale, setFontScale] = useState(2);

  // User progress from userDoc (synced with Firebase) or fallback to localStorage
  const readHadithMap = useMemo(() => {
    return userDoc?.hadithProgress?.read || {};
  }, [userDoc]);

  const bookmarkedMap = useMemo(() => {
    return userDoc?.hadithProgress?.bookmarked || {};
  }, [userDoc]);

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
    const textToCopy = `«${hadith.title}»\n${hadith.narrator}:\n${hadith.text}\n[${hadith.source}]`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedId(hadith.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleShare = (hadith) => {
    if (navigator.share) {
      navigator.share({
        title: hadith.title,
        text: `«${hadith.title}»\n${hadith.text}\n[${hadith.briefSource}]`,
      }).catch(() => {});
    } else {
      handleCopy(hadith);
    }
  };

  // Filtered Hadiths
  const filteredHadiths = useMemo(() => {
    return FORTY_HADITHS.filter((h) => {
      // Category filter
      if (selectedCategory !== 'الكل' && h.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === 'completed' && !readHadithMap[h.id]) return false;
      if (statusFilter === 'uncompleted' && readHadithMap[h.id]) return false;
      if (statusFilter === 'bookmarked' && !bookmarkedMap[h.id]) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesTitle = h.title.toLowerCase().includes(query);
        const matchesText = h.text.toLowerCase().includes(query);
        const matchesNarrator = h.narrator.toLowerCase().includes(query);
        const matchesNumber = String(h.number) === query;
        return matchesTitle || matchesText || matchesNarrator || matchesNumber;
      }
      return true;
    });
  }, [selectedCategory, statusFilter, searchQuery, readHadithMap, bookmarkedMap]);

  // Overall Statistics
  const completedCount = useMemo(() => {
    return FORTY_HADITHS.filter((h) => !!readHadithMap[h.id]).length;
  }, [readHadithMap]);

  const progressPercent = Math.round((completedCount / FORTY_HADITHS.length) * 100);

  // Themes palette
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
    <div className="space-y-6 text-right max-w-6xl mx-auto pb-12">
      {/* Hero Header */}
      <div className={`rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-emerald-700/40 ${themeStyles.heroBg}`}>
        <div className="absolute top-0 end-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>جوامع الكلم النبوي الشريف</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              الأربعين النووية الشريفة
            </h1>

            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl leading-relaxed font-medium">
              متن الأربعين النووية للإمام يحيى بن شرف النووي رحمه الله • 42 حديثاً جامعاً لقواعد الإسلام وأصول الدين ومكارم الأخلاق، مضبوطة بالتشكيل مع الفوائد والبيان.
            </p>

            {/* Quick KPI stats */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>أتممت قراءة: {completedCount} من 42 حديثاً</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-2 text-xs font-bold">
                <Bookmark className="w-4 h-4 text-amber-300" />
                <span>المفضلة: {Object.values(bookmarkedMap).filter(Boolean).length}</span>
              </div>
            </div>
          </div>

          {/* Progress Circular KPI */}
          <div className="shrink-0 flex items-center gap-4 bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/15">
            <div className="text-center">
              <div className="text-3xl font-black text-white">{progressPercent}%</div>
              <div className="text-[11px] text-emerald-200 font-bold mt-0.5">نسبة إتمام الورد</div>
            </div>
          </div>
        </div>
      </div>

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
              placeholder="ابحث برقم الحديث، كلماته، أو الراوي..."
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
            جميع الأحاديث ({FORTY_HADITHS.length})
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
            المقروءة ({completedCount})
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
            المتبقية ({FORTY_HADITHS.length - completedCount})
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
            <span>المفضلة ({Object.values(bookmarkedMap).filter(Boolean).length})</span>
          </button>
        </div>

        {/* Categories Pills */}
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
      </div>

      {/* Hadith Cards Stream */}
      <div className="space-y-5">
        {filteredHadiths.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              لا توجد أحاديث مطابقة لهذا البحث أو الفلتر
            </h3>
            <p className="text-xs text-slate-400">
              جرّب تغيير كلمات البحث أو اختيار تبويب تصنيف آخر.
            </p>
          </div>
        ) : (
          filteredHadiths.map((hadith) => {
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
                      <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                        {hadith.title}
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${themeStyles.badgeBg}`}>
                        {hadith.category}
                      </span>
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
                      title={isRead ? 'إلغاء تحديد القراءة' : 'تحديد الحديث كمقروء'}
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

                {/* Narrator */}
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="opacity-60">سند الرواية:</span>
                  <span>{hadith.narrator}</span>
                </div>

                {/* Hadith Matn (Text) in Beautiful Vocalized Script */}
                <div
                  className={`p-4 rounded-2xl bg-black/3 dark:bg-white/3 border ${themeStyles.quoteBorder} font-serif ${fontSizeClass} ${themeStyles.hadithText}`}
                  style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}
                >
                  {hadith.text}
                </div>

                {/* Source Verification */}
                <div className="flex items-center justify-between text-xs opacity-75 pt-1">
                  <span>تخريج الحديث: {hadith.briefSource}</span>
                  <button
                    type="button"
                    onClick={() => toggleExpand(hadith.id)}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <span>{isExpanded ? 'إخفاء الفوائد والشرح' : 'عرض الفوائد والشرح المستفاد'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expandable Benefits & Lessons */}
                {isExpanded && (
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
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-emerald-200/40 dark:border-emerald-800/40">
                      التخريج الكامل: {hadith.source}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
