import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useItemProgress } from '../../hooks/useItemProgress.js';
import {
  fetchPlaylistDetails,
  fetchSingleVideoDetails,
  extractPlaylistId,
  extractVideoId,
  loadYouTubeAPI,
} from '../../lib/youtubePlaylist.js';
import {
  Video,
  Check,
  Plus,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Loader2,
  ListVideo,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

/* ---------------------------------------------------------------- */
/* مشغّل يوتيوب مدمج بيكتشف نهاية الفيديو                            */
/* ---------------------------------------------------------------- */
function YouTubePlayer({ url, autoPlay, onEnded, playerRef }) {
  const containerRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let player = null;
    if (!url) return;
    const videoId = extractVideoId(url);
    const listId = extractPlaylistId(url);
    setFailed(false);

    loadYouTubeAPI()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        const mount = document.createElement('div');
        containerRef.current.appendChild(mount);

        const playerVars = { rel: 0, playsinline: 1, autoplay: autoPlayRef.current ? 1 : 0 };
        const opts = {
          width: '100%',
          height: '100%',
          playerVars,
          events: {
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) onEndedRef.current?.();
            },
          },
        };
        if (videoId) {
          opts.videoId = videoId;
        } else if (listId) {
          playerVars.listType = 'playlist';
          playerVars.list = listId;
        }
        player = new YT.Player(mount, opts);
        playerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      try { player && player.destroy(); } catch {}
      playerRef.current = null;
    };
  }, [url]);

  if (!url) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
        لا يوجد رابط للمشاهدة
      </div>
    );
  }

  if (failed) {
    const vid = extractVideoId(url);
    const src = vid
      ? `https://www.youtube.com/embed/${vid}`
      : `https://www.youtube.com/embed/videoseries?list=${extractPlaylistId(url)}`;
    return (
      <iframe
        src={src}
        title="YouTube"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}

/* ---------------------------------------------------------------- */

export function ListenInput({ activity, currentLog, onSave, onClose }) {
  const { isAdmin } = useAuth();
  const {
    items = [],
    progress = {},
    loading,
    updateMinutesListened,
    toggleWatchStatus,
    saveActivityItem,
    deleteActivityItem,
  } = useItemProgress(activity.id);

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [sliderValue, setSliderValue] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // نموذج الإضافة
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState('single');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [detected, setDetected] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectProgress, setDetectProgress] = useState(null);
  const [detectError, setDetectError] = useState(null);
  const [adding, setAdding] = useState(false);

  const playerRef = useRef(null);
  const completedIdsRef = useRef(currentLog?.details?.completedIds || []);
  const titleManualRef = useRef(false);
  const runIdRef = useRef(0);
  const userPickedRef = useRef(false);
  const latest = useRef({});

  const currentItem = (items && items.length > 0) ? (items[activeItemIndex] || items[0]) : null;
  const currentItemProgress = currentItem ? progress[currentItem.id] : null;
  const currentMinutes = currentItemProgress?.minutesListened || 0;
  const currentDuration = currentItem?.durationMin || 30;
  const shownMinutes = sliderValue != null ? sliderValue : currentMinutes;

  latest.current = { currentItem, progress, updateMinutesListened };

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  useEffect(() => {
    completedIdsRef.current = currentLog?.details?.completedIds || [];
  }, [(currentLog?.details?.completedIds || []).join(',')]);

  useEffect(() => {
    setSliderValue(null);
  }, [activeItemIndex]);

  // يفتح على أول فيديو لسه ما خلصش (إلى أن المستخدم يختار بنفسه)
  useEffect(() => {
    if (userPickedRef.current || loading || items.length === 0) return;
    const idx = items.findIndex((i) => !progress[i.id]?.isCompleted);
    setActiveItemIndex(idx >= 0 ? idx : 0);
  }, [items, progress, loading]);

  // حفظ دقائق المشاهدة تلقائياً أثناء التشغيل
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      const { currentItem: item, progress: prog, updateMinutesListened: update } = latest.current;
      if (!p || !item || typeof p.getPlayerState !== 'function') return;
      try {
        if (p.getPlayerState() !== 1) return;
        const watched = Math.floor(p.getCurrentTime() / 60);
        const dur = item.durationMin || 30;
        const cap = Math.min(watched, Math.max(0, dur - 1));
        const existing = prog[item.id]?.minutesListened || 0;
        if (cap > existing) update(item.id, cap, dur).catch(() => {});
      } catch {}
    }, 20000);
    return () => clearInterval(id);
  }, []);

  /* --------------------- تسجيل إنجاز اليوم --------------------- */
  const syncDailyLog = async (item, isCompleted, minutes) => {
    if (!item) return;
    const set = new Set(completedIdsRef.current);
    if (isCompleted) set.add(item.id);
    else set.delete(item.id);
    const ids = [...set];
    completedIdsRef.current = ids;
    const target = activity.dailyTarget || 1;
    await onSave(
      ids.length,
      ids.length >= target,
      {
        completedIds: ids,
        lastWatchedTitle: item.title,
        minutesListened: minutes,
      },
      isCompleted ? `إتمام مقطع ${item.title}` : null
    );
  };

  const handleAutoAdvance = (index, play = false) => {
    userPickedRef.current = true;
    const nextIndex = index + 1;
    if (nextIndex < items.length) {
      setAutoPlay(play);
      setActiveItemIndex(nextIndex);
      showFeedback(`أحسنت! انتقلنا إلى «${items[nextIndex].title}» ⏭`);
    } else {
      showFeedback('ما شاء الله! أتممت جميع مقاطع هذه السلسلة 🎉');
    }
  };

  const handleSetMinutes = async (item, minutes, index, fromEnded = false) => {
    if (!item) return;
    try {
      const duration = item.durationMin || 30;
      const safe = Math.min(duration, Math.max(0, minutes));
      const wasDone = !!progress[item.id]?.isCompleted;
      const isCompleted = safe >= duration;

      await updateMinutesListened(item.id, safe, duration);
      if (isCompleted !== wasDone) {
        await syncDailyLog(item, isCompleted, safe);
      }
      if (isCompleted && (!wasDone || fromEnded)) {
        handleAutoAdvance(index, fromEnded);
      }
    } catch {
      setErrorMsg('تعذر حفظ التقدم، تحقق من الاتصال.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleAddMinutes = (item, delta, index) => {
    if (!item) return;
    const cur = progress[item.id]?.minutesListened || 0;
    handleSetMinutes(item, cur + delta, index);
  };

  const commitSlider = () => {
    if (sliderValue != null && currentItem) {
      const v = sliderValue;
      setSliderValue(null);
      handleSetMinutes(currentItem, v, activeItemIndex);
    }
  };

  const handleToggleCompleted = async (item, index) => {
    if (!item) return;
    try {
      const isCurrentlyDone = !!progress[item.id]?.isCompleted;
      const duration = item.durationMin || 30;
      await toggleWatchStatus(item.id, isCurrentlyDone, duration);
      await syncDailyLog(item, !isCurrentlyDone, isCurrentlyDone ? 0 : duration);
      if (!isCurrentlyDone) handleAutoAdvance(index, false);
    } catch {
      setErrorMsg('تعذر حفظ التقدم، تحقق من الاتصال.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // الفيديو خلص في المشغّل
  const handleVideoEnded = () => {
    const item = latest.current.currentItem;
    if (!item) return;
    handleSetMinutes(item, item.durationMin || 30, activeItemIndex, true);
  };

  /* --------------------- الكشف التلقائي عن الرابط --------------------- */
  useEffect(() => {
    if (!showAddForm) return;
    if (!newUrl.trim()) {
      setDetected(null);
      setDetectError(null);
      setDetecting(false);
      setDetectProgress(null);
      return;
    }

    const listId = extractPlaylistId(newUrl);
    const videoId = extractVideoId(newUrl);
    if (!listId && !videoId) return;

    const myRun = ++runIdRef.current;
    const isCurrent = () => runIdRef.current === myRun;

    const timer = setTimeout(async () => {
      setDetecting(true);
      setDetectError(null);
      setDetectProgress(null);
      try {
        if (listId) {
          setAddMode('playlist');
          const details = await fetchPlaylistDetails(newUrl, '', (done, total) => {
            if (isCurrent()) setDetectProgress({ done, total });
          });
          if (!isCurrent()) return;
          setDetected(details);
          if (!titleManualRef.current) setNewTitle(details.playlistTitle);
          setNewDuration(details.averageDurationMin);
        } else {
          setAddMode('single');
          setDetected(null);
          const meta = await fetchSingleVideoDetails(newUrl);
          if (!isCurrent()) return;
          if (!titleManualRef.current && meta.title) setNewTitle(meta.title);
          if (meta.durationMin) setNewDuration(meta.durationMin);
        }
      } catch (err) {
        if (isCurrent()) {
          setDetected(null);
          setDetectError(err?.message || 'تعذر الكشف التلقائي');
        }
      } finally {
        if (isCurrent()) {
          setDetecting(false);
          setDetectProgress(null);
        }
      }
    }, 700);

    return () => {
      clearTimeout(timer);
      runIdRef.current++;
    };
  }, [newUrl, showAddForm]);

  const resetAddForm = () => {
    runIdRef.current++;
    titleManualRef.current = false;
    setNewTitle('');
    setNewUrl('');
    setNewDuration(30);
    setDetected(null);
    setDetecting(false);
    setDetectProgress(null);
    setDetectError(null);
    setAddMode('single');
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    if (detecting) return;
    setAdding(true);
    setErrorMsg(null);
    try {
      const payloads = [];
      const baseOrder = items.length;

      if (addMode === 'playlist' && detected?.items?.length > 0) {
        const plTitle = newTitle.trim() || detected.playlistTitle;
        detected.items.forEach((it, i) => {
          payloads.push({
            title: it.title,
            youtubeUrl: it.youtubeUrl,
            durationMin: it.durationMin,
            order: baseOrder + i + 1,
            playlistTitle: plTitle,
          });
        });
      } else {
        payloads.push({
          title: newTitle.trim() || 'مقطع جديد',
          youtubeUrl: newUrl.trim(),
          durationMin: parseInt(newDuration, 10) || 30,
          order: baseOrder + 1,
          ...(addMode === 'playlist' ? { playlistTitle: newTitle.trim() } : {}),
        });
      }

      for (let i = 0; i < payloads.length; i += 10) {
        await Promise.all(payloads.slice(i, i + 10).map((p) => saveActivityItem(p)));
      }

      showFeedback(`تمت إضافة ${payloads.length} مقطع بنجاح ✓`);
      resetAddForm();
      setShowAddForm(false);
    } catch {
      setErrorMsg('تعذر الحفظ. تأكد أنك مشرف وأن الاتصال بالإنترنت يعمل.');
    } finally {
      setAdding(false);
    }
  };

  /* --------------------- إحصائيات --------------------- */
  const totalCompletedVideos = items.filter((i) => progress[i.id]?.isCompleted).length;
  const totalMinutesStudied = items.reduce((acc, i) => acc + (progress[i.id]?.minutesListened || 0), 0);
  const totalDurationAll = items.reduce((acc, i) => acc + (i.durationMin || 0), 0);
  const libraryPercent = items.length > 0 ? Math.round((totalCompletedVideos / items.length) * 100) : 0;
  const playlistTitles = [...new Set(items.map((i) => i.playlistTitle).filter(Boolean))];

  return (
    <div className="space-y-4 text-right">
      {feedbackMsg && (
        <div className="p-3 bg-emerald-500 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 font-bold text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Video className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>
                {playlistTitles.length === 1 ? playlistTitles[0] : 'المكتبة المرئية'} ({items.length} مقطع)
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إجمالي مدة المكتبة: {totalDurationAll} دقيقة • الفيديو الذي يكتمل يُعلم ✓ تلقائياً.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              {totalCompletedVideos}/{items.length} منجز • {totalMinutesStudied} دقيقة
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مقطع / قائمة</span>
              </button>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-violet-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${libraryPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300">{libraryPercent}%</span>
          </div>
        )}
      </div>

      {/* نموذج الإضافة (للمشرف) */}
      {isAdmin && showAddForm && (
        <form
          onSubmit={handleAddContent}
          className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">إضافة محتوى مرئي جديد</span>
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddMode('single')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  addMode === 'single' ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                فيديو مفرد
              </button>
              <button
                type="button"
                onClick={() => setAddMode('playlist')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  addMode === 'playlist' ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                قائمة تشغيل كاملة 📑
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              رابط يوتيوب (مقطع أو قائمة تشغيل)
            </label>
            <input
              type="url"
              required
              placeholder="https://www.youtube.com/watch?v=... أو playlist?list=..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-left font-mono"
              dir="ltr"
            />
          </div>

          {detecting && (
            <div className="p-3 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-2xl flex items-center gap-2.5 text-xs text-violet-700 dark:text-violet-300 font-bold">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>
                جارٍ قراءة الرابط واستخراج التفاصيل
                {detectProgress ? ` (${detectProgress.done}/${detectProgress.total})` : '...'}
              </span>
            </div>
          )}

          {detected && (
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-emerald-900 dark:text-emerald-200 font-black">
                <span className="flex items-center gap-2">
                  <ListVideo className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{detected.videoCount} مقطع • إجمالي {detected.totalDurationMin} دقيقة</span>
                </span>
                <span className="text-[11px] bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg font-bold">
                  متوسط المدة: {detected.averageDurationMin} د
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pe-1">
                {detected.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-[11px] text-emerald-900 dark:text-emerald-200">
                    <span className="truncate">{i + 1}. {it.title}</span>
                    <span className="shrink-0 opacity-70">{it.durationMin} د</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {detectError && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-900">
              {detectError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {addMode === 'playlist' ? 'اسم القائمة' : 'عنوان الفيديو'}
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => {
                  titleManualRef.current = e.target.value.trim().length > 0;
                  setNewTitle(e.target.value);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {!(addMode === 'playlist' && detected) && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المدة (دقائق)
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={adding || detecting}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {adding
                ? 'جارٍ الحفظ...'
                : detected
                ? `حفظ القائمة كاملة (${detected.videoCount} مقطع)`
                : 'حفظ وإدراج المحتوى'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setShowAddForm(false);
              }}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* المشغّل */}
      {currentItem && (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-md border border-slate-200 dark:border-slate-800 relative">
            <YouTubePlayer
              url={currentItem.youtubeUrl}
              autoPlay={autoPlay}
              onEnded={handleVideoEnded}
              playerRef={playerRef}
            />
          </div>

          <div className="p-4 bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200">
                  المقطع {activeItemIndex + 1} من {items.length}
                </span>
                <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mt-1 truncate">
                  {currentItem.title}
                </h5>
              </div>

              <button
                type="button"
                onClick={() => handleToggleCompleted(currentItem, activeItemIndex)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                  currentItemProgress?.isCompleted
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{currentItemProgress?.isCompleted ? 'مكتمل ✓' : 'إتمام الدرس'}</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>كم دقيقة استمعت من هذا المقطع؟</span>
                <span className="text-violet-700 dark:text-violet-400 font-extrabold text-sm">
                  {shownMinutes} / {currentDuration} دقيقة ({Math.min(100, Math.round((shownMinutes / currentDuration) * 100))}%)
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <input
                  type="range"
                  min={0}
                  max={currentDuration}
                  value={shownMinutes}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  onPointerUp={commitSlider}
                  onKeyUp={commitSlider}
                  onBlur={commitSlider}
                  className="flex-1 accent-violet-600 cursor-pointer"
                />
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                  <span className="text-[10px] text-slate-400">دقيقة:</span>
                  <input
                    type="number"
                    min={0}
                    max={currentDuration}
                    value={shownMinutes}
                    onChange={(e) => {
                      const v = Math.min(currentDuration, Math.max(0, Number(e.target.value)));
                      setSliderValue(v);
                    }}
                    onBlur={commitSlider}
                    className="w-12 text-center text-xs font-black text-violet-700 dark:text-violet-400 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-2 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px]">إضافة سريعة:</span>
                <button
                  type="button"
                  onClick={() => handleAddMinutes(currentItem, 5, activeItemIndex)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-violet-100 rounded-lg font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  +5 دقائق
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMinutes(currentItem, 15, activeItemIndex)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-violet-100 rounded-lg font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  +15 دقيقة
                </button>
                <button
                  type="button"
                  onClick={() => handleSetMinutes(currentItem, currentDuration, activeItemIndex)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs cursor-pointer"
                >
                  أتممت المقطع بالكامل ✓
                </button>

                {activeItemIndex < items.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      userPickedRef.current = true;
                      setAutoPlay(false);
                      setActiveItemIndex(activeItemIndex + 1);
                    }}
                    className="ms-auto px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>التالي</span>
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* الفهرس */}
      <div>
        <h5 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <span>فهرس المقاطع ({items.length})</span>
          <span className="text-[10px] text-slate-400 font-normal">انقر على أي مقطع لتشغيله</span>
        </h5>

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400">جارٍ جلب المقاطع...</div>
        ) : items.length === 0 ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center text-xs text-slate-500">
            {isAdmin
              ? 'لا توجد مقاطع بعد. اضغط «إضافة مقطع / قائمة» وألصق رابط البلاي ليست.'
              : 'لم يضف المشرف مقاطع لهذا النشاط بعد.'}
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pe-1">
            {items.map((item, idx) => {
              const itemProg = progress[item.id];
              const isDone = !!itemProg?.isCompleted;
              const mins = itemProg?.minutesListened || 0;
              const dur = item.durationMin || 30;
              const isCurrent = activeItemIndex === idx;
              const showGroupHeader =
                item.playlistTitle && (idx === 0 || items[idx - 1].playlistTitle !== item.playlistTitle);

              return (
                <React.Fragment key={item.id}>
                  {showGroupHeader && (
                    <div className="text-[11px] font-black text-violet-700 dark:text-violet-300 pt-1 flex items-center gap-1.5">
                      <ListVideo className="w-3.5 h-3.5" />
                      <span className="truncate">{item.playlistTitle}</span>
                    </div>
                  )}
                  <div
                    onClick={() => {
                      userPickedRef.current = true;
                      setAutoPlay(false);
                      setActiveItemIndex(idx);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/40 shadow-xs ring-1 ring-violet-500'
                        : isDone
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-xs sm:text-sm font-bold truncate ${
                            isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {item.title}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span>المدة: {dur} دقيقة</span>
                          <span>•</span>
                          <span className={mins > 0 ? 'text-violet-600 dark:text-violet-400 font-bold' : ''}>
                            استمعت: {mins} دقيقة
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="فتح الفيديو في تطبيق YouTube مباشرة"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCompleted(item, idx);
                        }}
                        className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-600 dark:text-slate-300'
                        }`}
                        title={isDone ? 'إلغاء الإتمام' : 'تعليم كمكتمل'}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteActivityItem(item.id).catch(() => {});
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="حذف هذا المقطع"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          إتمام وإغلاق النافذة
        </button>
      </div>
    </div>
  );
}
