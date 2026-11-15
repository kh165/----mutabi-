import { useCallback, useEffect, useRef } from 'react';
const KEY = 'mutabi_quran_position';
/** Persists the current Quran reading position with a debounce. */
export function useReadingPosition(position, onRestore) { const ignoreScrollUntilRef = useRef(0); const timerRef = useRef(null); useEffect(() => { if (!position) return undefined; clearTimeout(timerRef.current); timerRef.current = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(position)); } catch {} }, 250); return () => clearTimeout(timerRef.current); }, [position]); const restorePosition = useCallback(() => { try { const value = JSON.parse(localStorage.getItem(KEY) || 'null'); onRestore?.(value); return value; } catch { return null; } }, [onRestore]); return { ignoreScrollUntilRef, restorePosition }; }
