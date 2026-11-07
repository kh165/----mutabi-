import React, { useState } from 'react';

export function Logo({ className = "h-9 sm:h-10", showBadge = true }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-2 select-none group">
      <div className="relative flex items-center justify-center p-1 rounded-2xl bg-white/95 dark:bg-slate-800/90 shadow-2xs border border-emerald-100 dark:border-slate-700/60 transition-transform group-hover:scale-105">
        {!imgError ? (
          <img
            src="/logo.png"
            alt="مُتَابِع"
            className={`${className} w-auto object-contain`}
            loading="eager"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center gap-2 px-1">
            <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="14" fill="#059669" />
              <path d="M24 10L35 24L24 38L13 24L24 10Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
              <circle cx="24" cy="24" r="6" fill="#10B981" />
              <path d="M24 14V34M14 24H34" stroke="white" strokeWidth="1.5" strokeOpacity="0.8" />
            </svg>
            <span className="font-black text-emerald-700 dark:text-emerald-400 text-lg tracking-tight font-serif">
              مُتَابِـع
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function LogoIcon({ className = "w-9 h-9" }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`relative flex items-center justify-center p-0.5 rounded-2xl bg-white dark:bg-slate-800 shadow-2xs border border-emerald-100 dark:border-slate-700/60 overflow-hidden ${className}`}>
      {!imgError ? (
        <img
          src="/logo.png"
          alt="شعار متابع"
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <svg className="w-full h-full text-emerald-600" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="12" fill="#059669" />
          <path d="M24 10L35 24L24 38L13 24L24 10Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
          <circle cx="24" cy="24" r="5" fill="#10B981" />
        </svg>
      )}
    </div>
  );
}
