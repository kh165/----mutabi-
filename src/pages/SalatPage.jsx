import React, { useState } from 'react';
import { BookOpenCheck, CheckCircle2, ChevronDown, ExternalLink, Info } from 'lucide-react';
import { SALAT_GUIDES } from '../data/salatGuides.js';

export function SalatPage() {
  const [expandedId, setExpandedId] = useState(SALAT_GUIDES[0]?.id || null);

  return (
    <section className="space-y-6" dir="rtl">
      <header className="rounded-3xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/40 dark:to-slate-900 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <BookOpenCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">دليل الصلوات</h1>
            <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              صلوات نافلة وأسبابها وأوقاتها وطريقتها، مع الأدعية والأدلة المتاحة لكل مسألة.
            </p>
          </div>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
        <Info className="mt-1 h-5 w-5 shrink-0" />
        <p>هذا ملخص تعليمي مع إحالات للمصادر، وبعض مسائل النوافل فيها خلاف فقهي. لا ننسب صلاة أو دعاء مخصوصًا إلى السنة إلا مع بيان دليله ودرجة ثبوته.</p>
      </div>

      <div className="space-y-4">
        {SALAT_GUIDES.map((guide) => {
          const expanded = expandedId === guide.id;
          return (
            <article key={guide.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`salat-guide-${guide.id}`}
                onClick={() => setExpandedId((currentId) => currentId === guide.id ? null : guide.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-right sm:p-6"
              >
                <span className="min-w-0">
                  <span className="block text-base font-black text-slate-900 dark:text-white sm:text-lg">{guide.title}</span>
                  <span className="mt-1 block text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{guide.status}</span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-emerald-700 transition-transform dark:text-emerald-400 ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && (
                <div id={`salat-guide-${guide.id}`} className="space-y-5 border-t border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
                  {guide.purpose && <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{guide.purpose}</p>}
                  {guide.when && (
                    <div>
                      <h2 className="mb-2 text-sm font-black text-slate-900 dark:text-white">متى تُصلّى؟</h2>
                      <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">{guide.when}</p>
                    </div>
                  )}
                  {guide.conditions?.length > 0 && (
                    <div>
                      <h2 className="mb-2 text-sm font-black text-slate-900 dark:text-white">الشروط والتنبيهات</h2>
                      <ul className="list-inside list-disc space-y-1.5 text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {guide.conditions.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  )}
                  {guide.steps?.length > 0 && (
                    <div>
                      <h2 className="mb-2 text-sm font-black text-slate-900 dark:text-white">الطريقة</h2>
                      <ol className="list-inside list-decimal space-y-1.5 text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {guide.steps.map((item) => <li key={item}>{item}</li>)}
                      </ol>
                    </div>
                  )}
                  {guide.dua?.text && (
                    <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                      <h2 className="text-sm font-black text-emerald-900 dark:text-emerald-200">{guide.dua.title || 'الدعاء المأثور'}</h2>
                      <p className="font-serif text-base leading-9 text-slate-900 dark:text-slate-100">{guide.dua.text}</p>
                      {guide.dua.source && <p className="text-xs leading-6 text-slate-600 dark:text-slate-400">{guide.dua.source}</p>}
                    </div>
                  )}
                  {guide.note && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{guide.note}</p>}
                  {guide.sources?.length > 0 && (
                    <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                      <h2 className="mb-2 text-sm font-black text-slate-900 dark:text-white">المصادر</h2>
                      <ul className="space-y-2">
                        {guide.sources.map((source) => (
                          <li key={`${source.title}-${source.url}`}>
                            <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-900 dark:text-emerald-300">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>{source.title}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
