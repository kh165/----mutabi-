import { useCallback, useState } from 'react';
const KEY = 'mutabi_quran_bookmark';
function readBookmark() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
/** Persistent Quran bookmark state. */
export function useBookmark() { const [bookmark, setBookmark] = useState(readBookmark); const saveBookmark = useCallback((value) => { setBookmark(value); if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY); }, []); return { bookmark, saveBookmark }; }
