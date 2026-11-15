import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookMarked, BookOpen, BookOpenCheck, ExternalLink, LibraryBig, Minus, Plus, Search } from 'lucide-react';

const collections = [
  { id: 'seerah', title: 'السيرة النبوية', description: 'كتب السيرة والمغازي من فهارس المكتبات التراثية.', books: [
    { title: 'السيرة النبوية لابن هشام', author: 'عبد الملك بن هشام', source: 'المكتبة الشاملة', url: 'https://shamela.ws/book/23833' },
    { title: 'سيرة ابن إسحاق: السير والمغازي', author: 'محمد بن إسحاق', source: 'المكتبة الشاملة', url: 'https://shamela.ws/book/9862' },
    { title: 'مغازي الواقدي', author: 'محمد بن عمر الواقدي', source: 'المكتبة الشاملة', url: 'https://shamela.ws/book/23680' },
    { title: 'تصفّح جميع كتب السيرة', author: 'فهرس مصنّف حسب الموضوع', source: 'المكتبة الشاملة', url: 'https://shamela.ws/category/24' },
  ] },
  { id: 'tafsir', title: 'التفسير وعلوم القرآن', description: 'فهارس كتب التفسير وعلوم القرآن وروابط مؤسساتها.', books: [
    { title: 'أضواء البيان في إيضاح القرآن بالقرآن', author: 'محمد الأمين الشنقيطي', source: 'المكتبة الوقفية', url: 'https://waqfeya.net/books/%D8%A3%D8%B6%D9%88%D8%A7%D8%A1-%D8%A7%D9%84%D8%A8%D9%8A%D8%A7%D9%86-%D9%81%D9%8A-%D8%A5%D9%8A%D8%B6%D8%A7%D8%AD-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%A8%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%B7-%D9%85%D8%AC%D9%85%D8%B9-%D8%A7%D9%84%D9%81%D9%82%D9%87-ff2087e54da94ee885ac48a5f46ae4d0' },
    { title: 'كتب التفاسير وعلوم القرآن', author: 'تصفّح الفهرس وابحث باسم الكتاب أو المؤلف', source: 'المكتبة الوقفية', url: 'https://waqfeya.net/' },
    { title: 'إصدارات التفسير وعلوم القرآن', author: 'بوابة مجمع الملك فهد لطباعة المصحف الشريف', source: 'مجمع الملك فهد', url: 'https://qurancomplex.gov.sa/' },
  ] },
  { id: 'fiqh', title: 'الفقه وأصوله', description: 'فهارس الفقه والمذاهب وأصول الفقه لدى مصادرها.', books: [
    { title: 'كتب الفقه العام والمذاهب', author: 'تصفّح الفهارس وابحث باسم الكتاب أو المؤلف', source: 'المكتبة الوقفية', url: 'https://waqfeya.net/' },
    { title: 'كتب الفقه وأصوله', author: 'مكتبة نصية قابلة للبحث', source: 'المكتبة الشاملة', url: 'https://shamela.ws/' },
    { title: 'المكتبة الوقفية للكتب المصورة', author: 'مشروع لخدمة طلبة العلم والباحثين', source: 'المكتبة الوقفية', url: 'https://waqfeya.net/' },
  ] },
];
const internalBooks = [
  { id: 'seerah-halabi', title: 'السيرة الحلبية', author: 'علي بن برهان الدين الحلبي', subtitle: 'سيرة النبي ﷺ في أربعة أجزاء', volumes: [1, 2, 3, 4].map((n) => ({ id: `seerah-halabi-${n}`, title: `الجزء ${['الأول', 'الثاني', 'الثالث', 'الرابع'][n - 1]}`, sourceUrl: `https://ar.wikisource.org/wiki/السيرة_الحلبية/الجزء_${['الأول', 'الثاني', 'الثالث', 'الرابع'][n - 1]}` })) },
  { id: 'jala-al-afham', title: 'جلاء الأفهام في فضل الصلاة والسلام على محمد خير الأنام', author: 'ابن قيم الجوزية', subtitle: 'كتاب كامل في الصلاة والسلام على النبي ﷺ وفضائلهما', volumes: [{ id: 'jala-al-afham', title: 'النص الكامل', sourceUrl: 'https://ar.wikisource.org/wiki/كتاب_جلاء_الأفهام' }] },
];
const licenseUrl = 'https://creativecommons.org/licenses/by-sa/4.0/';

export function IslamicLibraryPage() {
  const [activeId, setActiveId] = useState('complete');
  const [readerBookId, setReaderBookId] = useState(null);
  const [activeVolumeId, setActiveVolumeId] = useState(null);
  const [bookData, setBookData] = useState(null);
  const [readerError, setReaderError] = useState('');
  const [readerSearch, setReaderSearch] = useState('');
  const [fontSize, setFontSize] = useState(20);
  const [search, setSearch] = useState('');
  const active = collections.find((entry) => entry.id === activeId);
  const currentBook = internalBooks.find((entry) => entry.id === readerBookId);
  const activeVolume = currentBook?.volumes.find((entry) => entry.id === activeVolumeId);

  useEffect(() => {
    if (!readerBookId || !activeVolumeId) return undefined;
    const controller = new AbortController();
    setBookData(null);
    setReaderError('');
    fetch(`/books/${activeVolumeId}.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Book data unavailable'); return response.json(); })
      .then(setBookData)
      .catch((error) => { if (error.name !== 'AbortError') setReaderError('تعذر تحميل هذا الجزء. حدّث الصفحة ثم حاول مرة أخرى.'); });
    return () => controller.abort();
  }, [readerBookId, activeVolumeId]);

  const filteredBooks = useMemo(() => {
    if (!active) return [];
    const query = search.trim().toLocaleLowerCase('ar');
    return active.books.filter((book) => !query || `${book.title} ${book.author} ${book.source}`.toLocaleLowerCase('ar').includes(query));
  }, [active, search]);
  const blocks = useMemo(() => {
    const content = bookData?.content || [];
    const query = readerSearch.trim().toLocaleLowerCase('ar');
    return query ? content.filter((block) => block.text.toLocaleLowerCase('ar').includes(query)) : content;
  }, [bookData, readerSearch]);
  const openBook = (book) => { setReaderBookId(book.id); setActiveVolumeId(book.volumes[0].id); setReaderSearch(''); };
  const closeReader = () => { setReaderBookId(null); setActiveVolumeId(null); setBookData(null); };

  if (currentBook) return (
    <main className="max-w-6xl mx-auto px-4 py-7 sm:px-6" dir="rtl">
      <button type="button" onClick={closeReader} className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"><ArrowRight className="h-4 w-4" />العودة إلى المكتبة</button>
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-900 dark:bg-slate-900">
        <header className="border-b border-slate-200 bg-emerald-50/60 p-5 dark:border-slate-800 dark:bg-emerald-950/30 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"><BookOpenCheck className="h-4 w-4" />قارئ داخلي — نص كامل</span><h1 className="mt-3 text-2xl font-black leading-relaxed text-slate-900 dark:text-white">{currentBook.title}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">المؤلف: {currentBook.author} · {currentBook.subtitle}</p></div>
            <div className="flex items-center gap-2"><button type="button" onClick={() => setFontSize((size) => Math.max(16, size - 2))} aria-label="تصغير الخط" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Minus className="h-4 w-4" /></button><span className="text-xs font-bold text-slate-500">حجم الخط</span><button type="button" onClick={() => setFontSize((size) => Math.min(30, size + 2))} aria-label="تكبير الخط" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Plus className="h-4 w-4" /></button></div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap gap-2" aria-label="أجزاء الكتاب">{currentBook.volumes.map((volume) => <button key={volume.id} type="button" onClick={() => { setActiveVolumeId(volume.id); setReaderSearch(''); }} aria-pressed={activeVolumeId === volume.id} className={`rounded-xl px-4 py-2 text-sm font-bold ${activeVolumeId === volume.id ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>{volume.title}</button>)}</div>
            <label className="relative w-full sm:max-w-sm"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={readerSearch} onChange={(event) => setReaderSearch(event.target.value)} placeholder="ابحث داخل هذا الجزء" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-950" /></label>
          </div>
        </header>
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">المصدر: <a href={activeVolume?.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 underline dark:text-emerald-300">ويكي مصدر العربية</a> · النص المضمّن مرخّص وفق <a href={licenseUrl} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 underline dark:text-emerald-300">CC BY-SA 4.0</a> مع الإسناد والمشاركة بالمثل.</div>
        <article className="mx-auto max-w-4xl px-5 py-7 sm:px-10 sm:py-10" style={{ fontSize: `${fontSize}px` }}>
          {!bookData && !readerError && <p className="py-12 text-center text-sm text-slate-500" role="status">جارٍ تحميل النص الكامل...</p>}
          {readerError && <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 dark:bg-rose-950/30 dark:text-rose-200" role="alert">{readerError}</p>}
          {bookData && <div className="mb-6 text-xs text-slate-500">{activeVolume?.title} · {blocks.length.toLocaleString('ar')} مقطع{readerSearch ? ' مطابق للبحث' : ''}</div>}
          {blocks.map((block, index) => block.type === 'heading' ? <h2 key={`${index}-${block.text}`} className="mb-4 mt-9 border-r-4 border-emerald-500 pr-4 text-xl font-black leading-9 text-emerald-900 dark:text-emerald-200">{block.text}</h2> : <p key={`${index}-${block.text.slice(0, 24)}`} className="mb-4 leading-[2.15] text-slate-800 dark:text-slate-200">{block.text}</p>)}
          {bookData && blocks.length === 0 && <p className="py-8 text-center text-sm text-slate-500">لا توجد نتائج مطابقة.</p>}
        </article>
        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">نسبة النص: {bookData?.author || currentBook.author}، ويكي مصدر العربية. الترخيص CC BY-SA 4.0؛ تفاصيل النسبة محفوظة داخل public/books/ATTRIBUTION.md.</footer>
      </section>
    </main>
  );

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6" dir="rtl">
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-6 dark:border-emerald-900 dark:from-emerald-950/50 dark:to-slate-900 sm:p-9"><div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300"><LibraryBig className="h-8 w-8" /><span className="font-bold">قراءة موثقة داخل موقعك</span></div><h1 className="mt-4 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">المكتبة الإسلامية</h1><p className="mt-3 max-w-3xl leading-8 text-slate-600 dark:text-slate-300">النصوص التي تحققنا من اكتمالها وترخيص إعادة نشرها متاحة هنا بقارئ داخلي. أما المراجع الأخرى فتبقى روابط لمصادرها الأصلية ولا ندّعي اكتمال نصوصها المنقولة.</p></section>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="تصنيفات المكتبة"><button type="button" onClick={() => { setActiveId('complete'); setSearch(''); }} aria-pressed={activeId === 'complete'} className={`rounded-xl px-4 py-3 text-sm font-bold ${activeId === 'complete' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><BookMarked className="ml-2 inline-block h-4 w-4" />كتب كاملة داخل الموقع</button>{collections.map((collection) => <button key={collection.id} type="button" onClick={() => { setActiveId(collection.id); setSearch(''); }} aria-pressed={activeId === collection.id} className={`rounded-xl px-4 py-3 text-sm font-bold ${activeId === collection.id ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><BookMarked className="ml-2 inline-block h-4 w-4" />{collection.title}</button>)}</nav>
      {activeId === 'complete' ? <section className="mt-7"><div className="mb-5"><h2 className="text-2xl font-black text-slate-900 dark:text-white">كتب كاملة النص وقابلة للقراءة</h2><p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">النصوص مخزنة ضمن ملفات الموقع. افتح الكتاب هنا دون الانتقال إلى موقع آخر.</p></div><div className="grid gap-4 md:grid-cols-2">{internalBooks.map((book) => <article key={book.id} className="flex min-h-56 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><div><div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><BookOpenCheck className="h-5 w-5" /><span className="text-xs font-black">النص الكامل متاح</span></div><h3 className="mt-3 text-xl font-black leading-8 text-slate-900 dark:text-white">{book.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{book.author} · {book.subtitle}</p><p className="mt-2 text-xs font-bold text-slate-500">{book.volumes.length > 1 ? `${book.volumes.length} أجزاء محلية` : 'كتاب كامل محلي'}</p></div><button type="button" onClick={() => openBook(book)} className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"><BookOpen className="h-4 w-4" />افتح القارئ الداخلي</button></article>)}</div><p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">المتاح حاليًا بالنص الكامل داخل الموقع هو السيرة الحلبية بأجزائها الأربعة، وكتاب جلاء الأفهام.</p></section> : active && <section className="mt-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-black text-slate-900 dark:text-white">{active.title}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{active.description}</p></div><label className="relative w-full sm:max-w-xs"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في هذا القسم" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-600 dark:border-slate-700 dark:bg-slate-900" /></label></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredBooks.map((book) => <a key={book.title} href={book.url} target="_blank" rel="noopener noreferrer" className="group flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"><div><div className="flex items-start justify-between gap-3"><h3 className="font-black leading-7 text-slate-900 dark:text-white">{book.title}</h3><ExternalLink className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" /></div><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{book.author}</p></div><div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300"><BookOpen className="h-4 w-4" />{book.source}</div></a>)}</div><p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">الروابط تفتح لدى الجهات الأصلية. وجود رابط لكتاب لا يعني أن نصه مخزن هنا أو أن إعادة نشره مسموحة.</p></section>}
    </main>
  );
}
