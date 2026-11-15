import { useEffect, useState } from 'react';
import { searchQuran } from '../../lib/quranFoundationApi.js';
/** Debounced Quran search state. */
export function useQuranSearch(query, enabled = true, delay = 350) {
  const [results, setResults] = useState({ query: '', surahs: [], verses: [], total: 0 });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (!enabled) return undefined; const cleanQuery = query.trim(); if (!cleanQuery) { setResults({ query: '', surahs: [], verses: [], total: 0 }); setLoading(false); return undefined; } const timer = setTimeout(async () => { setLoading(true); try { setResults(await searchQuran(cleanQuery)); } finally { setLoading(false); } }, delay); return () => clearTimeout(timer); }, [query, enabled, delay]);
  return { results, loading };
}
