import React, { useState } from 'react';

export function Logo({ className = "h-9 sm:h-10" }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-2 select-none group">
      <div className="relative flex items-center justify-center p-1 rounded-2xl bg-white/95 dark:bg-slate-800/90 shadow-2xs border border-emerald-100 dark:border-slate-700/60 transition-transform group-hover:scale-105">
        {!imgError ? (
          <img
            src="/logo-mark.png"
            alt="علامة مُتَابِع"
            className={`${className} aspect-square w-auto object-contain`}
            loading="eager"
            onError={() => setImgError(true)}
          />
        ) : (
          <LogoMarkGraphic className={`${className} aspect-square w-auto`} />
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
        src="/logo-mark.png"
          alt="شعار متابع"
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <LogoMarkGraphic className="h-full w-full" />
      )}
    </div>
  );
}

function LogoMarkGraphic({ className = '' }) {
  return (
    <svg className={`text-emerald-600 ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#126C45" />
      <rect x="10" y="9" width="28" height="30" rx="6" fill="white" />
      <rect x="18" y="6" width="12" height="5" rx="2.5" fill="#A7F3D0" />
      <circle cx="18" cy="20" r="3.5" fill="#10A563" />
      <path d="m16.5 20 1.1 1.1 2-2.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="24" y="18.5" width="9" height="2.5" rx="1.25" fill="#BCEBD4" />
      <circle cx="18" cy="28" r="3.5" fill="#10A563" />
      <path d="m16.5 28 1.1 1.1 2-2.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="24" y="26.5" width="9" height="2.5" rx="1.25" fill="#BCEBD4" />
      <circle cx="18" cy="36" r="3.1" stroke="#10A563" strokeWidth="1.5" />
      <rect x="24" y="34.5" width="9" height="2.5" rx="1.25" fill="#126C45" />
    </svg>
  );
}
