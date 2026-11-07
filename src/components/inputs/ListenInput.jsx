import React, { useState, useEffect } from 'react';
import { useItemProgress } from '../../hooks/useItemProgress.js';
import { fetchPlaylistDetails, extractPlaylistId } from '../../lib/youtubePlaylist.js';
import {
  Video,
  Check,
  Play,
  ExternalLink,
  Clock,
  Plus,
  ListPlus,
  SkipForward,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Loader2,
  ListVideo,
} from 'lucide-react';

export function ListenInput({
  activity,
  currentLog,
  onSave,
  onReset,
  onClose,
}) {
  const {
    items,
    progress,
    loading,
    updateMinutesListened,
    toggleWatchStatus,
    saveActivityItem,
    deleteActivityItem,
  } = useItemProgress(activity.id);

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState('single'); // 'single' | 'playlist'
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [playlistEpisodesCount, setPlaylistEpisodesCount] = useState(5);
  const [detectedPlaylist, setDetectedPlaylist] = useState(null);
  const [detectingPlaylist, setDetectingPlaylist] = useState(false);
  const [detectError, setDetectError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const currentItem = items[activeItemIndex] || items[0];
  const currentItemProgress = currentItem ? progress[currentItem.id] : null;
  const currentMinutes = currentItemProgress?.minutesListened || 0;
  const currentDuration = currentItem?.durationMin || 30;

  // Extract clean embed URL (supports single video, playlist, youtu.be, etc.)
  const getEmbedUrl = (url) => {
    if (!url) return '';
    try {
      if (url.includes('list=')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        const listId = urlParams.get('list');
        if (listId) {
          return `https://www.youtube.com/embed/videoseries?list=${listId}&enablejsapi=1`;
        }
      }
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v') || '';
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1` : url;
    } catch {
      return url;
    }
  };

  // Auto-advance to the next video when current video completes
  const handleAutoAdvance = (currentIndex) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < items.length) {
      setActiveItemIndex(nextIndex);
      setFeedbackMsg(`مبارك إتمام المقطع! تم الانتقال تلقائياً إلى «${items[nextIndex].title}» ⏭`);
      setTimeout(() => setFeedbackMsg(null), 5000);
    } else {
      setFeedbackMsg('ما شاء الله! أتممت جميع مقاطع هذه السلسلة بنجاح 🎉');
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // Adjust minutes listened
  const handleSetMinutes = async (item, minutes, index) => {
    const duration = item.durationMin || 30;
    const safeMinutes = Math.min(duration, Math.max(0, minutes));
    const isCompleted = safeMinutes >= duration;

    await updateMinutesListened(item.id, safeMinutes, duration);

    // Sync with daily worship log so it updates user achievements in database
    const completedItemsCount = items.filter((i) => {
      if (i.id === item.id) return isCompleted;
      return progress[i.id]?.isCompleted;
    }).length;

    await onSave(
      completedItemsCount,
      completedItemsCount >= (activity.dailyTarget || 1),
      {
        lastWatchedTitle: item.title,
        minutesListened: safeMinutes,
        updatedAt: new Date().toISOString(),
      },
      `استماع ${safeMinutes} دقيقة من ${item.title}`
    );

    // Trigger auto-advance if completed
    if (isCompleted) {
      handleAutoAdvance(index);
    }
  };

  // Quick increment
  const handleAddMinutes = (item, delta, index) => {
    const cur = progress[item.id]?.minutesListened || 0;
    handleSetMinutes(item, cur + delta, index);
  };

  // Toggle full completion
  const handleToggleCompleted = async (item, index) => {
    const isCurrentlyDone = !!progress[item.id]?.isCompleted;
    const duration = item.durationMin || 30;
    await toggleWatchStatus(item.id, isCurrentlyDone, duration);

    const completedItemsCount = items.filter((i) => {
      if (i.id === item.id) return !isCurrentlyDone;
      return progress[i.id]?.isCompleted;
    }).length;

    await onSave(
      completedItemsCount,
      completedItemsCount >= (activity.dailyTarget || 1),
      {
        lastWatchedTitle: item.title,
        completedNow: !isCurrentlyDone,
      },
      `إتمام مقطع ${item.title}`
    );

    if (!isCurrentlyDone) {
      handleAutoAdvance(index);
    }
  };

  // Auto-detect playlist details when URL changes or mode is playlist
  const handleAutoDetectPlaylist = async (urlToDetect) => {
    const targetUrl = urlToDetect || newUrl;
    if (!targetUrl || !targetUrl.trim()) return;

    const listId = extractPlaylistId(targetUrl);
    if (!listId && addMode === 'playlist') {
      setDetectError('يرجى إدخال رابط يوتيوب يحتوي على قائمة تشغيل (list=...)');
      return;
    }

    setDetectingPlaylist(true);
    setDetectError(null);
    try {
      const details = await fetchPlaylistDetails(targetUrl, newTitle);
      if (details?.success) {
        setDetectedPlaylist(details);
        if (!newTitle.trim() || newTitle === 'قائمة تشغيل مرئية') {
          setNewTitle(details.playlistTitle);
        }
        setPlaylistEpisodesCount(details.videoCount);
        setNewDuration(details.averageDurationMin);
        setAddMode('playlist');
      }
    } catch (err) {
      console.warn('Playlist detection error:', err);
      setDetectError('تم التعرف التقديري، يمكنك المتابعة أو الحفظ المباشر.');
    } finally {
      setDetectingPlaylist(false);
    }
  };

  // Watch URL input for automatic playlist detection
  useEffect(() => {
    if (!newUrl) {
      setDetectedPlaylist(null);
      setDetectError(null);
      return;
    }

    if (extractPlaylistId(newUrl)) {
      setAddMode('playlist');
      const timer = setTimeout(() => {
        handleAutoDetectPlaylist(newUrl);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [newUrl]);

  // Form submit: Add single video or entire playlist
  const handleAddContent = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAdding(true);
    try {
      if (addMode === 'single') {
        await saveActivityItem({
          title: newTitle.trim(),
          youtubeUrl: newUrl.trim() || 'https://www.youtube.com',
          durationMin: parseInt(newDuration, 10) || 30,
          order: items.length + 1,
        });
      } else {
        // Automatically save all detected playlist items with their real titles & durations
        if (detectedPlaylist?.items?.length > 0) {
          for (let i = 0; i < detectedPlaylist.items.length; i++) {
            const item = detectedPlaylist.items[i];
            await saveActivityItem({
              title: item.title,
              youtubeUrl: item.youtubeUrl || newUrl.trim(),
              durationMin: item.durationMin || parseInt(newDuration, 10) || 20,
              order: items.length + i + 1,
              playlistTitle: detectedPlaylist.playlistTitle || newTitle.trim(),
            });
          }
        } else {
          // Structured series fallback
          const count = Math.max(2, Math.min(50, parseInt(playlistEpisodesCount, 10) || 5));
          for (let i = 1; i <= count; i++) {
            await saveActivityItem({
              title: `${newTitle.trim()} - الحلقة ${i}`,
              youtubeUrl: newUrl.trim() || 'https://www.youtube.com',
              durationMin: parseInt(newDuration, 10) || 25,
              order: items.length + i,
              playlistTitle: newTitle.trim(),
            });
          }
        }
      }
      setNewTitle('');
      setNewUrl('');
      setDetectedPlaylist(null);
      setShowAddForm(false);
      setFeedbackMsg('تم حفظ مقاطع القائمة وتحديد مددها تلقائياً بنجاح!');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } finally {
      setAdding(false);
    }
  };

  const totalMinutesStudied = Object.values(progress).reduce(
    (acc, p) => acc + (p?.minutesListened || 0),
    0
  );
  const totalCompletedVideos = items.filter((i) => progress[i.id]?.isCompleted).length;

  return (
    <div className="space-y-4 text-right">
      {/* Motivational feedback toast */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-500 text-white font-bold text-xs rounded-2xl flex items-center justify-between gap-2 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        </div>
      )}

      {/* Header & Overall Playlist KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Video className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>المكتبة المرئية وقوائم التشغيل ({items.length} مقطع)</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            تتبع دقائق المشاهدة والاستماع، والانتقال التلقائي للدرس التالي فور الإتمام.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            {totalCompletedVideos} منجز • {totalMinutesStudied} دقيقة
          </span>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مقطع / قائمة</span>
          </button>
        </div>
      </div>

      {/* Add Content Form Modal/Accordion */}
      {showAddForm && (
        <form onSubmit={handleAddContent} className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              إضافة محتوى مرئي جديد
            </span>
            <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddMode('single')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  addMode === 'single' ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                فيديو مفرد
              </button>
              <button
                type="button"
                onClick={() => setAddMode('playlist')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  addMode === 'playlist' ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-2xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                قائمة تشغيل كاملة 📑
              </button>
            </div>
          </div>

          {/* Auto detection status feedback */}
          {detectingPlaylist && (
            <div className="p-3 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 rounded-2xl flex items-center gap-2.5 text-xs text-violet-700 dark:text-violet-300 font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>جارٍ قراءة قائمة التشغيل تلقائياً واستخراج عناوين المقاطع والمدد...</span>
            </div>
          )}

          {detectedPlaylist && (
            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-200 font-black">
                <span className="flex items-center gap-2">
                  <ListVideo className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>تم التعرّف التلقائي: {detectedPlaylist.videoCount} مقاطع</span>
                </span>
                <span className="text-[11px] bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg font-bold">
                  متوسط المدة: {detectedPlaylist.averageDurationMin} دقيقة
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                تم استخراج كل فيديو بمدته الدقيقة وعنوانه تلقائياً دون الحاجة لإدخال يدوي.
              </p>
            </div>
          )}

          {detectError && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-900">
              {detectError}
            </p>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              {addMode === 'single' ? 'عنوان الفيديو / الدرس' : 'عنوان السلسلة أو قائمة التشغيل'}
            </label>
            <input
              type="text"
              required
              placeholder={addMode === 'single' ? 'مثال: شرح أذكار الاستيقاظ والصباح' : 'مثال: سلسلة مدارج السالكين لابن القيم'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                رابط يوتيوب (مقطع أو قائمة تشغيل)
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=... أو playlist?list=..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 text-left font-mono"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                مدة المقطع (بالدقائق) {detectedPlaylist ? '• (محدد تلقائياً)' : ''}
              </label>
              <input
                type="number"
                min={1}
                max={600}
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {addMode === 'playlist' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  عدد مقاطع القائمة {detectedPlaylist ? '• (مكتشف تلقائياً)' : ''}
                </label>
                {extractPlaylistId(newUrl) && !detectingPlaylist && (
                  <button
                    type="button"
                    onClick={() => handleAutoDetectPlaylist(newUrl)}
                    className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer"
                  >
                    إعادة الفحص التلقائي ↻
                  </button>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={100}
                value={playlistEpisodesCount}
                onChange={(e) => setPlaylistEpisodesCount(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                {detectedPlaylist
                  ? 'تم استيراد قائمة التشغيل بكافة حلقاتها تلقائياً وتتبع دقائق مشاهدتها ونقل المستخدم تلقائياً للدرس التالي.'
                  : 'بمجرد وضع رابط قائمة التشغيل، سيتم استكشاف عدد مقاطعها ومدتها تلقائياً دون إدخال يدوي.'}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={adding}
              className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {adding ? 'جارٍ الحفظ...' : 'حفظ وإدراج المحتوى'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Embedded Video / Playlist Player */}
      {currentItem && (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-md border border-slate-200 dark:border-slate-800 relative">
            <iframe
              src={getEmbedUrl(currentItem.youtubeUrl)}
              title={currentItem.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Active Video Progress Control Card ("سمعت منه قد ايه") */}
          <div className="p-4 bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200">
                  المقطع النشط حالياً (#{activeItemIndex + 1} من {items.length})
                </span>
                <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mt-1 truncate">
                  {currentItem.title}
                </h5>
              </div>

              <button
                type="button"
                onClick={() => handleToggleCompleted(currentItem, activeItemIndex)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  currentItemProgress?.isCompleted
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{currentItemProgress?.isCompleted ? 'مكتمل ✓' : 'إتمام الدرس'}</span>
              </button>
            </div>

            {/* Minutes Listened Slider & Input ("سمعت منه قد ايه") */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>كم دقيقة استمعت من هذا المقطع؟</span>
                <span className="text-violet-700 dark:text-violet-400 font-extrabold text-sm">
                  {currentMinutes} / {currentDuration} دقيقة ({Math.min(100, Math.round((currentMinutes / currentDuration) * 100))}%)
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={currentDuration}
                value={currentMinutes}
                onChange={(e) => handleSetMinutes(currentItem, Number(e.target.value), activeItemIndex)}
                className="w-full accent-violet-600 cursor-pointer"
              />

              {/* Quick Increment Buttons */}
              <div className="flex items-center gap-1.5 pt-2 flex-wrap text-xs">
                <span className="text-slate-400 text-[11px]">إضافة سريعة:</span>
                <button
                  type="button"
                  onClick={() => handleAddMinutes(currentItem, 5, activeItemIndex)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-violet-100 rounded-lg font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  +5 دقائق
                </button>
                <button
                  type="button"
                  onClick={() => handleAddMinutes(currentItem, 15, activeItemIndex)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-violet-100 rounded-lg font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  +15 دقيقة
                </button>
                <button
                  type="button"
                  onClick={() => handleSetMinutes(currentItem, currentDuration, activeItemIndex)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs"
                >
                  أتممت المقطع بالكامل ✓
                </button>

                {activeItemIndex < items.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveItemIndex(activeItemIndex + 1)}
                    className="ms-auto px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center gap-1"
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

      {/* Playlist Videos Queue List */}
      <div>
        <h5 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
          <span>فهرس مقاطع القائمة ({items.length})</span>
          <span className="text-[10px] text-slate-400 font-normal">انقر على أي مقطع لتشغيله وتحديث إنجازك</span>
        </h5>

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400">جارٍ جلب مقاطع القائمة...</div>
        ) : items.length === 0 ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center text-xs text-slate-500">
            لا توجد مقاطع مضافة بعد، يمكنك إضافة فيديو مفرد أو قائمة كاملة من الزر أعلاه.
          </div>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pe-1">
            {items.map((item, idx) => {
              const itemProg = progress[item.id];
              const isDone = !!itemProg?.isCompleted;
              const mins = itemProg?.minutesListened || 0;
              const dur = item.durationMin || 30;
              const isCurrent = activeItemIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveItemIndex(idx)}
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
                      <p className={`text-xs sm:text-sm font-bold truncate ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCompleted(item, idx);
                      }}
                      className={`p-1.5 rounded-xl text-xs font-bold transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-600 dark:text-slate-300'
                      }`}
                      title={isDone ? 'إلغاء الإتمام' : 'تعليم كمكتمل'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteActivityItem(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="حذف هذا المقطع"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
        >
          إتمام وإغلاق النافذة
        </button>
      </div>
    </div>
  );
}
