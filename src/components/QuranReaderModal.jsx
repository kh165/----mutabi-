import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { SURAHS } from '../data/quran.js';
import { getMushafPage } from '../data/quranTexts.js';
import { useReaderHistory } from '../hooks/useReaderHistory.js';

const READING_PAGE_KEY = 'mutabi_quran_last_page';
const BOOKMARKS_KEY = 'mutabi_quran_bookmarks';

function readStoredPage(initialSurahNumber) {
  try {
    const savedPage = Number(localStorage.getItem(READING_PAGE_KEY));
    if (Number.isInteger(savedPage) && savedPage >= 1 && savedPage <= 604) return savedPage;
  } catch (error) {
    console.warn('Could not read the last Quran reading position:', error);
  }
  return SURAHS.find((surah) => surah.number === initialSurahNumber)?.startPage || 1;
}

function readBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    return Array.isArray(saved)
      ? saved.filter(
          (bookmark) =>
            /^\d{1,3}:\d{1,3}$/.test(bookmark?.verseKey) &&
            Number.isInteger(bookmark?.pageNumber) &&
            bookmark.pageNumber >= 1 &&
            bookmark.pageNumber <= 604
        )
      : [];
  } catch (error) {
    console.warn('Could not read saved Quran bookmarks:', error);
    return [];
  }
}

function getVerseDetails(verseKey) {
  const [surahNumber, verseNumber] = verseKey.split(':').map(Number);
  return {
    surahNumber,
    verseNumber,
    surah: SURAHS.find((item) => item.number === surahNumber),
  };
}

export function QuranReaderModal({ isOpen, onClose, initialSurahNumber = 1, onLogPagesRead }) {
  const closeReader = useReaderHistory(isOpen, onClose, 'quran');
  const [currentPage, setCurrentPage] = useState(() => readStoredPage(initialSurahNumber));
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [bookmarks, setBookmarks] = useState(readBookmarks);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [focusedVerseKey, setFocusedVerseKey] = useState(null);
  const pageBodyRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(READING_PAGE_KEY, String(currentPage));
    } catch (error) {
      console.warn('Could not save the last Quran reading position:', error);
    }
  }, [currentPage]);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.warn('Could not save Quran bookmarks:', error);
    }
  }, [bookmarks]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPageData(null);
    getMushafPage(currentPage)
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch((error) => {
        console.error('Failed to load the Quran Mushaf page:', error);
        if (!cancelled) setLoadError(error.message || 'تعذر تحميل صفحة المصحف.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentPage, retryAttempt]);

  useEffect(() => {
    if (showBookmarks) return;
    if (focusedVerseKey && pageData?.verses.some((verse) => verse.verseKey === focusedVerseKey)) {
      document
        .getElementById(`quran-ayah-${focusedVerseKey.replace(':', '-')}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    pageBodyRef.current?.scrollTo({ top: 0 });
  }, [currentPage, pageData, showBookmarks, focusedVerseKey]);

  const bookmarkedVerseKeys = useMemo(
    () => new Set(bookmarks.map((bookmark) => bookmark.verseKey)),
    [bookmarks]
  );
  const firstVerse = pageData?.verses[0];
  const currentSurah = firstVerse ? getVerseDetails(firstVerse.verseKey).surah : null;

  if (!isOpen) return null;

  const toggleBookmark = (verseKey) => {
    setBookmarks((current) =>
      current.some((bookmark) => bookmark.verseKey === verseKey)
        ? current.filter((bookmark) => bookmark.verseKey !== verseKey)
        : [{ verseKey, pageNumber: currentPage, savedAt: Date.now() }, ...current]
    );
  };

  const openBookmark = (bookmark) => {
    setFocusedVerseKey(bookmark.verseKey);
    setCurrentPage(bookmark.pageNumber);
    setShowBookmarks(false);
  };

  const selectSurah = (event) => {
    const surah = SURAHS.find((item) => item.number === Number(event.target.value));
    if (surah) setCurrentPage(surah.startPage);
    setShowBookmarks(false);
  };

  const renderVerse = (verse) => {
    const { surahNumber, verseNumber, surah } = getVerseDetails(verse.verseKey);
    const isBookmarked = bookmarkedVerseKeys.has(verse.verseKey);
    return (
      <React.Fragment key={verse.verseKey}>
        {verseNumber === 1 && (
          <div className="quran-surah-heading">
            <span>۞</span>
            <span>سُورَةُ {surah?.name || `رقم ${surahNumber}`}</span>
            <span>۞</span>
            {surahNumber !== 1 && surahNumber !== 9 && (
              <span className="quran-bismillah">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => toggleBookmark(verse.verseKey)}
          id={`quran-ayah-${verse.verseKey.replace(':', '-')}`}
          aria-label={`${isBookmarked ? 'إزالة حفظ' : 'حفظ'} الآية ${verse.verseKey}`}
          aria-pressed={isBookmarked}
          title={isBookmarked ? 'إزالة الآية من المحفوظات' : 'حفظ الآية للمتابعة لاحقًا'}
          className={`quran-ayah ${isBookmarked ? 'quran-ayah-bookmarked' : ''} ${
            focusedVerseKey === verse.verseKey ? 'quran-ayah-focused' : ''
          }`}
        >
          <span>{verse.text}</span>
          <span className="quran-ayah-marker" aria-hidden="true">
            {verseNumber.toLocaleString('ar-EG')}
          </span>
          {isBookmarked && <BookmarkCheck className="quran-ayah-bookmark-icon" aria-hidden="true" />}
        </button>
      </React.Fragment>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="المصحف الشريف"
      className="fixed inset-0 z-[70] flex h-[100dvh] w-full flex-col bg-[#e9e4d8] text-[#3d3021]"
    >
      <header className="z-10 flex min-h-14 items-center justify-between gap-2 border-b border-[#d6c6a4] bg-[#fbf8ef] px-3 py-2 shadow-sm sm:px-5">
        <button
          type="button"
          onClick={closeReader}
          aria-label="إغلاق المصحف"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#735b35] transition hover:bg-[#eee5d3]"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-bold">
            {currentSurah ? `سورة ${currentSurah.name}` : 'المصحف الشريف'}
          </div>
          <div className="text-[11px] text-[#88785c]">الصفحة {currentPage} من 604</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setShowBookmarks((value) => !value)}
            aria-label="الآيات المحفوظة"
            aria-pressed={showBookmarks}
            className={`relative flex h-10 min-w-10 items-center justify-center rounded-xl px-2 transition ${
              showBookmarks ? 'bg-[#e9dfc9] text-[#5f4827]' : 'text-[#735b35] hover:bg-[#eee5d3]'
            }`}
          >
            <Bookmark className="h-5 w-5" />
            {bookmarks.length > 0 && (
              <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[9px] font-bold text-white">
                {bookmarks.length}
              </span>
            )}
          </button>
          <select
            value={currentSurah?.number || initialSurahNumber}
            onChange={selectSurah}
            aria-label="الانتقال إلى سورة"
            className="max-w-24 rounded-xl border border-[#e4d9c2] bg-transparent px-1.5 py-2 text-xs font-semibold text-[#5f4827] outline-none sm:max-w-36 sm:px-2"
          >
            {SURAHS.map((surah) => (
              <option key={surah.number} value={surah.number}>
                {surah.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main ref={pageBodyRef} className="flex-1 overflow-y-auto p-3 sm:p-6">
        {showBookmarks ? (
          <section className="mx-auto max-w-2xl space-y-3 py-2" aria-label="الآيات المحفوظة">
            <div className="mb-5 text-center">
              <h2 className="text-lg font-bold text-[#4c3a21]">مواضع أريد متابعتها</h2>
              <p className="mt-1 text-xs text-[#857557]">اختَر آية للعودة إلى صفحتها</p>
            </div>
            {bookmarks.length === 0 ? (
              <div className="rounded-2xl border border-[#d9c9a7] bg-[#fbf8ef] p-8 text-center text-sm text-[#837256]">
                لم تحفظ آيات بعد. اضغط على أي آية في المصحف لحفظ موضعها.
              </div>
            ) : (
              bookmarks.map((bookmark) => {
                const { surahNumber, verseNumber, surah } = getVerseDetails(bookmark.verseKey);
                return (
                  <div
                    key={bookmark.verseKey}
                    className="flex items-center gap-2 rounded-2xl border border-[#dfd2b9] bg-[#fbf8ef] p-3"
                  >
                    <button
                      type="button"
                      onClick={() => openBookmark(bookmark)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-right"
                    >
                      <BookmarkCheck className="h-5 w-5 shrink-0 text-emerald-700" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          سورة {surah?.name || surahNumber}، الآية {verseNumber}
                        </span>
                        <span className="text-xs text-[#857557]">صفحة {bookmark.pageNumber}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(bookmark.verseKey)}
                      aria-label={`حذف حفظ الآية ${bookmark.verseKey}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#8a7860] hover:bg-[#eee5d3]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </section>
        ) : loading ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-sm text-[#837256]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
            جارٍ تحميل صفحة المصحف...
          </div>
        ) : loadError ? (
          <div role="alert" className="mx-auto flex min-h-64 max-w-lg flex-col items-center justify-center gap-4 text-center">
            <p className="font-semibold text-rose-700">{loadError}</p>
            <button
              type="button"
              onClick={() => setRetryAttempt((attempt) => attempt + 1)}
              className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <article
            dir="rtl"
            aria-label={`صفحة المصحف ${currentPage}`}
            className="quran-mushaf-page mx-auto min-h-[68dvh] w-full max-w-3xl px-5 py-8 sm:px-10 sm:py-10"
            style={{ '--quran-font-scale': fontScale }}
          >
            <div className="quran-page-ornament" aria-hidden="true" />
            <div className="quran-page-text">
              {pageData?.verses.map(renderVerse)}
            </div>
          </article>
        )}
      </main>

      <footer className="flex min-h-14 items-center justify-between gap-1 border-t border-[#d6c6a4] bg-[#fbf8ef] px-2 py-2 sm:gap-2 sm:px-5">
        <button
          type="button"
          onClick={() => {
            setShowBookmarks(false);
            setCurrentPage((page) => Math.max(1, page - 1));
          }}
          disabled={currentPage <= 1}
          className="flex h-10 items-center gap-0.5 rounded-xl px-1.5 text-xs font-semibold text-[#735b35] transition hover:bg-[#eee5d3] disabled:opacity-40 sm:gap-1 sm:px-3 sm:text-sm"
        >
          <ChevronRight className="h-4 w-4" />
          السابقة
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setFontScale((scale) => Math.max(0.85, Number((scale - 0.1).toFixed(2))))}
            aria-label="تصغير خط القرآن"
            className="h-9 w-9 rounded-xl text-lg text-[#735b35] hover:bg-[#eee5d3]"
          >
            −
          </button>
          <BookOpen className="h-4 w-4 text-[#8e754b]" />
          <button
            type="button"
            onClick={() => setFontScale((scale) => Math.min(1.35, Number((scale + 0.1).toFixed(2))))}
            aria-label="تكبير خط القرآن"
            className="h-9 w-9 rounded-xl text-lg text-[#735b35] hover:bg-[#eee5d3]"
          >
            +
          </button>
        </div>
        {onLogPagesRead && currentSurah && (
          <button
            type="button"
            onClick={() => onLogPagesRead(currentSurah)}
            aria-label="تسجيل قراءة السورة"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-emerald-800 transition hover:bg-[#eee5d3] sm:w-auto sm:gap-1.5 sm:px-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden text-xs font-semibold sm:inline">تسجيل القراءة</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setShowBookmarks(false);
            setCurrentPage((page) => Math.min(604, page + 1));
          }}
          disabled={currentPage >= 604}
          className="flex h-10 items-center gap-0.5 rounded-xl px-1.5 text-xs font-semibold text-[#735b35] transition hover:bg-[#eee5d3] disabled:opacity-40 sm:gap-1 sm:px-3 sm:text-sm"
        >
          التالية
          <ChevronLeft className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}
