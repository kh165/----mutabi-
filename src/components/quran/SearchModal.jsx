import React from 'react';
export function SearchModal({ children, onClose }) { return <div role="dialog" aria-label="بحث في القرآن" className="fixed inset-0 z-50 bg-black/40 p-4"><div className="mx-auto max-w-xl rounded-2xl bg-white p-4 dark:bg-slate-900">{children}<button type="button" onClick={onClose}>إغلاق</button></div></div>; }
