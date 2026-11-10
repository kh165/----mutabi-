/**
 * Quran Foundation Official API Client (عميل Quran Foundation API الرسمي)
 * Documentation: https://api-docs.quran.foundation / https://quran.dev
 *
 * Provides authoritative Uthmani text (رواية حفص عن عاصم بالرسم العثماني المعتمد),
 * full 114 surahs listing, per-surah on-demand verse streaming, and semantic verse search.
 * Includes tiered caching (Memory RAM -> LocalStorage -> Resilient Fallback) for 0ms reads and offline support.
 */

import { SURAHS } from '../data/quran.js';

// Base URLs
const QF_PUBLIC_API_BASE = 'https://api.quran.com/api/v4';

// In-Memory RAM Cache for 0ms instant repeated reads
const memoryVersesCache = new Map();
let memoryChaptersCache = null;
const QURAN_CACHE_NAME = 'quran-text-cache';

async function fetchCachedQuranJson(url, signal) {
  const cache = typeof caches !== 'undefined'
    ? await caches.open(QURAN_CACHE_NAME)
    : null;
  const cached = await cache?.match(url);
  if (cached) return cached.json();

  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Quran Foundation API returned HTTP ${response.status}.`);
  }

  if (cache) {
    try {
      await cache.put(url, response.clone());
    } catch (cacheError) {
      console.warn('Could not persist Quran chapter metadata in Cache Storage:', cacheError);
    }
  }
  return response.json();
}

/**
 * جلب قائمة السور الـ 114 الكاملة من Quran Foundation API الرسمي مع التخزين المؤقت
 */
export async function getQuranChapters() {
  if (memoryChaptersCache && memoryChaptersCache.length === 114) {
    return memoryChaptersCache;
  }

  const cacheKey = 'qf_chapters_list_v4';
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length === 114) {
        memoryChaptersCache = parsed;
        return parsed;
      }
    }
  } catch {}

  try {
    const res = await fetch(`${QF_PUBLIC_API_BASE}/chapters`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.chapters) && data.chapters.length === 114) {
        const mapped = data.chapters.map((ch) => ({
          number: ch.id,
          id: ch.id,
          name: ch.name_arabic,
          nameArabic: ch.name_arabic,
          englishName: ch.name_simple || ch.name_complex,
          type: ch.revelation_place === 'makkah' ? 'meccan' : 'medinan',
          revelationType: ch.revelation_place === 'makkah' ? 'مكية' : 'مدنية',
          ayahsCount: ch.verses_count,
          versesCount: ch.verses_count,
          startPage: ch.pages?.[0] || 1,
          endPage: ch.pages?.[1] || 1,
          bismillahPre: ch.bismillah_pre ?? (ch.id !== 1 && ch.id !== 9),
        }));
        memoryChaptersCache = mapped;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(mapped));
        } catch {}
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Network request for Quran Foundation chapters failed, using verified metadata:', err);
  }

  // Fallback to verified local SURAHS registry
  memoryChaptersCache = SURAHS;
  return SURAHS;
}

/**
 * جلب آيات السورة الكريمة كاملة بالرسم العثماني المعتمد من Quran Foundation API الرسمي
 * Endpoint: /verses/by_chapter/{chapterId}, including canonical page and division metadata.
 *
 * @param {number|string} chapterNumber رقم السورة من 1 إلى 114
 * @returns {Promise<{number: number, name: string, ayahsCount: number, bismillahPre: boolean, ayahs: Array<{number: number, text: string, verseKey: string, pageNumber: number, juzNumber: number, hizbNumber: number, rubElHizbNumber: number}>}>}
 */
export async function getChapterVerses(chapterNumber) {
  const chapterId = Math.min(114, Math.max(1, Number(chapterNumber) || 1));

  // 1. RAM Cache check (0ms)
  if (memoryVersesCache.has(chapterId)) {
    return memoryVersesCache.get(chapterId);
  }

  // Cache Storage keeps all 114 chapters without exhausting localStorage quotas.
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const fields = 'text_uthmani,page_number,juz_number,hizb_number,rub_el_hizb_number';
    const url = `${QF_PUBLIC_API_BASE}/verses/by_chapter/${chapterId}?fields=${fields}&per_page=300`;
    let data;
    try {
      data = await fetchCachedQuranJson(url, controller.signal);
    } finally {
      clearTimeout(timeoutId);
    }
    if (!Array.isArray(data?.verses) || data.verses.length === 0) {
      throw new Error(`Quran Foundation API returned no verses for chapter ${chapterId}.`);
    }

    const chapters = await getQuranChapters();
    const chMeta =
      chapters.find((chapter) => chapter.number === chapterId) ||
      SURAHS.find((surah) => surah.number === chapterId) ||
      {};
    const formattedAyahs = data.verses.map((verse) => {
      const number = Number(verse.verse_number);
      const pageNumber = Number(verse.page_number);
      const juzNumber = Number(verse.juz_number);
      const hizbNumber = Number(verse.hizb_number);
      const rubElHizbNumber = Number(verse.rub_el_hizb_number);

      if (
        !Number.isInteger(number) ||
        !Number.isInteger(pageNumber) ||
        !Number.isInteger(juzNumber) ||
        !Number.isInteger(hizbNumber) ||
        !Number.isInteger(rubElHizbNumber) ||
        typeof verse.text_uthmani !== 'string'
      ) {
        throw new Error(`Quran Foundation returned incomplete page metadata for ${verse.verse_key}.`);
      }

      return {
        number,
        verseNumber: number,
        text: verse.text_uthmani.trim(),
        verseKey: verse.verse_key || `${chapterId}:${number}`,
        pageNumber,
        juzNumber,
        hizbNumber,
        rubElHizbNumber,
      };
    });

    const result = {
      number: chapterId,
      name: chMeta.name || chMeta.nameArabic || `سورة ${chapterId}`,
      englishName: chMeta.englishName || '',
      revelationType: chMeta.type === 'meccan' ? 'مكية' : 'مدنية',
      ayahsCount: formattedAyahs.length,
      bismillahPre: chapterId !== 1 && chapterId !== 9,
      ayahs: formattedAyahs,
    };

    memoryVersesCache.set(chapterId, result);
    return result;
  } catch (err) {
    if (err?.name !== 'AbortError') {
      console.warn(`Quran Foundation API request failed for chapter ${chapterId}:`, err);
    }
    if (err?.name === 'AbortError') {
      throw new Error(`انتهت مهلة تحميل آيات سورة ${chapterId}. تحقق من اتصال الإنترنت وحاول مجددًا.`);
    }
    throw err;
  }
}

/**
 * البحث الشامل في السور والآيات عبر Quran Foundation API الرسمي
 *
 * @param {string} query كلمة أو جملة البحث أو رقم السورة
 * @param {number} size عدد نتائج الآيات
 */
export async function searchQuran(query, size = 20) {
  const cleanQuery = (query || '').trim();
  if (!cleanQuery) {
    return { query: '', surahs: [], verses: [], total: 0 };
  }

  // 1. Search matching Surahs by name or number (instant local lookup)
  const normalizedQuery = cleanQuery.replace(/[أإآء]/g, 'ا').replace(/ة/g, 'ه').toLowerCase();
  const matchedSurahs = SURAHS.filter((s) => {
    const sNameNorm = s.name.replace(/[أإآء]/g, 'ا').replace(/ة/g, 'ه').toLowerCase();
    const sEnglish = (s.englishName || '').toLowerCase();
    const queryNum = Number(cleanQuery);
    return (
      sNameNorm.includes(normalizedQuery) ||
      sEnglish.includes(cleanQuery.toLowerCase()) ||
      (!isNaN(queryNum) && s.number === queryNum)
    );
  }).slice(0, 5);

  // 2. Search verses via Quran Foundation Search API
  let matchedVerses = [];
  let totalVerses = 0;

  if (cleanQuery.length >= 2) {
    try {
      const res = await fetch(`${QF_PUBLIC_API_BASE}/search?q=${encodeURIComponent(cleanQuery)}&size=${size}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        totalVerses = data?.search?.total_results || 0;
        matchedVerses = (data?.search?.results || []).map((r) => {
          const parts = (r.verse_key || '').split(':');
          const chapterId = Number(parts[0]) || 1;
          const verseNumber = Number(parts[1]) || 1;
          const chMeta = SURAHS.find((s) => s.number === chapterId);

          return {
            verseKey: r.verse_key,
            chapterId,
            verseNumber,
            surahName: chMeta?.name || `سورة ${chapterId}`,
            text: r.text || '',
            highlighted: r.highlighted || r.text || '',
          };
        });
      }
    } catch (err) {
      console.warn('Quran Foundation search API request failed:', err);
    }
  }

  return {
    query: cleanQuery,
    surahs: matchedSurahs,
    verses: matchedVerses,
    total: matchedSurahs.length + (totalVerses || matchedVerses.length),
  };
}
