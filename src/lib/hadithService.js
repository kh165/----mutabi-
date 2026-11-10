/**
 * Hadith Service
 * Provides on-demand loading, memory caching, and Cache Storage persistence
 * for Sahih al-Bukhari (7,563 hadiths) and Sahih Muslim (7,563 hadiths).
 * Ensures ZERO slowness, instantaneous repeat reads, and full offline resilience.
 */

import { FORTY_HADITHS } from '../data/fortyHadith.js';
import { BUKHARI_BOOKS, MUSLIM_BOOKS } from '../data/hadithCollections.js';

// In-memory cache for 0ms retrieval
const memoryCache = new Map();

// LocalStorage cache key prefix
const CACHE_PREFIX = 'mutabi_hadith_v1_';
const CACHED_BOOKS_KEY = 'mutabi_hadith_cached_books';

function markBookCached(cacheKey) {
  try {
    const savedBooks = JSON.parse(localStorage.getItem(CACHED_BOOKS_KEY) || '[]');
    const cachedBooks = new Set(Array.isArray(savedBooks) ? savedBooks : []);
    cachedBooks.add(cacheKey);
    localStorage.setItem(CACHED_BOOKS_KEY, JSON.stringify([...cachedBooks]));
  } catch (error) {
    console.warn('[HadithService] Could not record the cached book list:', error);
  }
}

/**
 * Checks if a specific book is cached locally in memory or localStorage
 */
export function isBookCached(collectionId, sectionId) {
  const cacheKey = `${CACHE_PREFIX}${collectionId}_${sectionId}`;
  if (memoryCache.has(cacheKey)) return true;
  try {
    if (localStorage.getItem(cacheKey) !== null) return true;
    const cachedBooks = JSON.parse(localStorage.getItem(CACHED_BOOKS_KEY) || '[]');
    return Array.isArray(cachedBooks) && cachedBooks.includes(cacheKey);
  } catch {
    return false;
  }
}

/**
 * Retrieves hadiths for a specific collection and section/book
 * @param {string} collectionId - 'nawawi' | 'bukhari' | 'muslim'
 * @param {number|string} sectionId - Section or book ID
 * @returns {Promise<{ hadiths: Array, source: string, fromCache: boolean }>}
 */
export async function fetchBookHadiths(collectionId, sectionId) {
  if (collectionId === 'nawawi') {
    return {
      hadiths: FORTY_HADITHS,
      source: 'متن الأربعين النووية',
      fromCache: true,
    };
  }

  const cacheKey = `${CACHE_PREFIX}${collectionId}_${sectionId}`;

  // 1. Check in-memory cache (0ms)
  if (memoryCache.has(cacheKey)) {
    return {
      hadiths: memoryCache.get(cacheKey),
      source: collectionId === 'bukhari' ? 'صحيح البخاري' : 'صحيح مسلم',
      fromCache: true,
    };
  }

  // 2. Check localStorage (0ms)
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache.set(cacheKey, parsed);
        return {
          hadiths: parsed,
          source: collectionId === 'bukhari' ? 'صحيح البخاري' : 'صحيح مسلم',
          fromCache: true,
        };
      }
    }
  } catch (err) {
    console.warn('[HadithService] Failed to read from localStorage:', err);
  }

  // 3. Cache API responses without consuming the browser's small localStorage quota.
  const edition = collectionId === 'bukhari' ? 'ara-bukhari' : 'ara-muslim';
  const urls = [
    `https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/${edition}/sections/${sectionId}.json`,
    `https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/${edition}/sections/${sectionId}.json`,
  ];

  let rawData = null;
  let lastError = null;
  const cache = typeof caches !== 'undefined' ? await caches.open('hadith-cache') : null;

  for (const url of urls) {
    try {
      const cachedResponse = await cache?.match(url);
      if (cachedResponse) {
        rawData = await cachedResponse.json();
        markBookCached(cacheKey);
        break;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.ok) {
        if (cache) {
          try {
            await cache.put(url, res.clone());
          } catch (cacheError) {
            console.warn('[HadithService] Could not cache the downloaded book:', cacheError);
          }
        }
        rawData = await res.json();
        markBookCached(cacheKey);
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!rawData || !rawData.hadiths || rawData.hadiths.length === 0) {
    throw new Error(
      lastError?.name === 'AbortError'
        ? 'انتهت مهلة الاتصال بالخادم. تأكد من اتصالك بالإنترنت.'
        : 'تعذر تحميل نصوص الكتاب. يمكنك المحاولة مجدداً.'
    );
  }

  // Format & clean hadiths
  const formattedHadiths = rawData.hadiths
    .filter((h) => h && h.text && h.text.trim().length > 0)
    .map((h, idx) => {
      // Find book details
      const booksList = collectionId === 'bukhari' ? BUKHARI_BOOKS : MUSLIM_BOOKS;
      const bookObj = booksList.find((b) => b.id === Number(sectionId));
      const bookTitle = bookObj ? bookObj.title : `كتاب ${sectionId}`;

      return {
        id: `${collectionId}_${h.hadithnumber || `${sectionId}_${idx + 1}`}`,
        number: h.hadithnumber || idx + 1,
        arabicNumber: h.arabicnumber || h.hadithnumber || idx + 1,
        bookNumber: h.reference?.book ?? Number(sectionId),
        bookHadithNumber: h.reference?.hadith ?? idx + 1,
        bookTitle,
        title: `${bookTitle} — حديث رقم ${h.hadithnumber || idx + 1}`,
        text: h.text.trim(),
        collection: collectionId,
        source:
          collectionId === 'bukhari'
            ? `صحيح البخاري، ${bookTitle}، رقم (${h.hadithnumber})`
            : `صحيح مسلم، ${bookTitle}، رقم (${h.hadithnumber})`,
        briefSource: collectionId === 'bukhari' ? 'صحيح البخاري' : 'صحيح مسلم',
      };
    });

  // Keep the parsed result in memory; the raw response is persisted in Cache Storage above.
  memoryCache.set(cacheKey, formattedHadiths);

  return {
    hadiths: formattedHadiths,
    source: collectionId === 'bukhari' ? 'صحيح البخاري' : 'صحيح مسلم',
    fromCache: false,
  };
}

/**
 * Calculates user progress stats across a collection
 */
export function getCollectionStats(collectionId, readMap = {}, bookmarkedMap = {}) {
  let totalHadiths = 42;
  let readCount = 0;
  let bookmarkedCount = 0;

  if (collectionId === 'nawawi') {
    totalHadiths = 42;
    FORTY_HADITHS.forEach((h) => {
      if (readMap[h.id]) readCount++;
      if (bookmarkedMap[h.id]) bookmarkedCount++;
    });
  } else if (collectionId === 'bukhari') {
    totalHadiths = 7563;
    Object.keys(readMap).forEach((id) => {
      if (id.startsWith('bukhari_') && readMap[id]) readCount++;
    });
    Object.keys(bookmarkedMap).forEach((id) => {
      if (id.startsWith('bukhari_') && bookmarkedMap[id]) bookmarkedCount++;
    });
  } else if (collectionId === 'muslim') {
    totalHadiths = 7563;
    Object.keys(readMap).forEach((id) => {
      if (id.startsWith('muslim_') && readMap[id]) readCount++;
    });
    Object.keys(bookmarkedMap).forEach((id) => {
      if (id.startsWith('muslim_') && bookmarkedMap[id]) bookmarkedCount++;
    });
  }

  const percent = totalHadiths > 0 ? Math.min(100, Math.round((readCount / totalHadiths) * 100)) : 0;

  return {
    totalHadiths,
    readCount,
    bookmarkedCount,
    percent,
  };
}
