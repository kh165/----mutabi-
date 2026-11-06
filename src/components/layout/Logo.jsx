import React from 'react';

export function Logo({ className = "h-9 sm:h-10", showBadge = true }) {
  return (
    <div className="flex items-center gap-2 select-none group">
      <div className="relative flex items-center justify-center p-1 rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-2xs border border-emerald-100 dark:border-slate-700/60 transition-transform group-hover:scale-105">
        <img
          src="/assets/aistudio/image_862cf0fe.png"
          alt="مُتَابِع"
          className={`${className} w-auto object-contain`}
          loading="eager"
        />
      </div>
    </div>
  );
}

export function LogoIcon({ className = "w-9 h-9" }) {
  return (
    <div className={`relative flex items-center justify-center p-0.5 rounded-2xl bg-white dark:bg-slate-800 shadow-2xs border border-emerald-100 dark:border-slate-700/60 overflow-hidden ${className}`}>
      <img
        src="/assets/aistudio/image_862cf0fe.png"
        alt="شعار متابع"
        className="w-full h-full object-contain"
      />
    </div>
  );
}
