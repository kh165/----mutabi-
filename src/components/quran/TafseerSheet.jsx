import React from 'react';
/** Presentation component for the Quran tafseer bottom sheet. */
export function TafseerSheet({ children, onClose }) { return <div role="dialog" aria-label="التفسير" className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-slate-900">{children}<button type="button" onClick={onClose}>إغلاق</button></div>; }
