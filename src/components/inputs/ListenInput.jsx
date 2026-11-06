import React, { useState } from 'react';
import { useItemProgress } from '../../hooks/useItemProgress.js';
import { Video, Check, Play, ExternalLink, Clock } from 'lucide-react';

export function ListenInput({
  activity,
  currentLog,
  onSave,
  onReset,
  onClose,
}) {
  const { items, progress, loading, toggleWatchStatus } = useItemProgress(activity.id);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const getEmbedUrl = (url) => {
    try {
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(url).search);
        videoId = urlParams.get('v') || '';
      }
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    } catch {
      return url;
    }
  };

  const handleToggle = async (itemId, current) => {
    await toggleWatchStatus(itemId, current);
    const newProgress = { ...progress, [itemId]: !current };
    const watchedCount = items.filter((i) => newProgress[i.id]).length;
    await onSave(
      watchedCount,
      watchedCount >= (activity.dailyTarget || 1),
      { watchedItemId: itemId },
      ''
    );
  };

  return (
    <div className="space-y-4 text-right">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Video className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span>المحتوى المرئي والمقاطع المقررة ({items.length})</span>
        </h4>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          تمت مشاهدة {items.filter((i) => progress[i.id]).length} من {items.length}
        </span>
      </div>

      {/* Embedded Player if selected */}
      {selectedVideo && (
        <div className="rounded-2xl overflow-hidden bg-black aspect-video shadow-md border border-slate-200 dark:border-slate-800">
          <iframe
            src={getEmbedUrl(selectedVideo)}
            title="مقطع الفيديو"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">جارٍ تحميل قائمة الفيديوهات...</div>
      ) : items.length === 0 ? (
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center text-xs text-slate-500 dark:text-slate-400">
          لم يتم إضافة مقاطع فيديو لهذا النشاط بعد.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pe-1">
          {items.map((item, idx) => {
            const isWatched = !!progress[item.id];
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isWatched
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isWatched ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      {item.durationMin && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {item.durationMin} دقيقة
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedVideo(item.youtubeUrl)}
                        className="text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Play className="w-3 h-3" />
                        تشغيل هنا
                      </button>
                      <a
                        href={item.youtubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        يوتيوب
                      </a>
                    </div>
                  </div>
                </div>

                {/* Mark as watched button */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.id, isWatched)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                    isWatched
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 hover:text-emerald-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isWatched ? 'تمت المشاهدة' : 'تعليم كمشاهد'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
        >
          إغلاق النافذة
        </button>
      </div>
    </div>
  );
}
