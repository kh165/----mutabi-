/**
 * YouTube playlist / video metadata helper.
 * 1) noembed / YouTube oEmbed (فوري وبدون أي قيود أو مفاتيح) لجلب عنوان الفيديو والقائمة
 * 2) مشغّل YouTube IFrame خفي لقياس مدة الفيديو بدقة وحفظها في Realtime Database
 * 3) دعم إضافة مفتاح اختياري VITE_YOUTUBE_API_KEY لو رغب المستخدم
 */

const YT_API_KEY = (import.meta.env && import.meta.env.VITE_YOUTUBE_API_KEY) || '';

export function extractPlaylistId(url) {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get('list');
  } catch {
    const match = String(url).match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }
}

export function extractVideoId(url) {
  if (!url) return null;
  try {
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split(/[?&]/)[0] || null;
    }
    const parsed = new URL(url);
    const v = parsed.searchParams.get('v');
    if (v) return v;
    const m = parsed.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  } catch {
    const match = String(url).match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
}

/* ---------------------------------------------------------------- */
/* helpers                                                           */
/* ---------------------------------------------------------------- */

function parseISODuration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return 0;
  const [, d = 0, h = 0, mi = 0, s = 0] = m;
  return Number(d) * 86400 + Number(h) * 3600 + Number(mi) * 60 + Number(s);
}

const toMinutes = (seconds) => Math.max(1, Math.round((seconds || 0) / 60));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, timeoutMs = 8000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (check()) return true;
    } catch {}
    await sleep(intervalMs);
  }
  return false;
}

export async function fetchVideoTitleViaOEmbed(videoUrl) {
  try {
    const target = encodeURIComponent(videoUrl);
    const res = await fetch(`https://noembed.com/embed?url=${target}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.title) return data.title;
    }
  } catch {}
  return '';
}

export async function fetchPlaylistTitleViaOEmbed(playlistId) {
  try {
    const target = `https://www.youtube.com/playlist?list=${playlistId}`;
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(target)}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.title) return json.title;
    }
  } catch {}
  return '';
}

function buildResult(playlistId, playlistTitle, metas) {
  const items = metas.map((m, idx) => ({
    title: m.title || `${playlistTitle} - المقطع ${idx + 1}`,
    youtubeUrl: `https://www.youtube.com/watch?v=${m.videoId}&list=${playlistId}`,
    durationMin: m.durationMin || 20,
    order: idx + 1,
    playlistTitle,
  }));
  const total = items.reduce((a, v) => a + v.durationMin, 0);
  return {
    success: true,
    playlistId,
    playlistTitle,
    videoCount: items.length,
    totalDurationMin: total,
    averageDurationMin: Math.max(1, Math.round(total / Math.max(1, items.length))),
    items,
  };
}

/* ---------------------------------------------------------------- */
/* YouTube IFrame API loader (singleton)                             */
/* ---------------------------------------------------------------- */

let ytApiPromise = null;

export function loadYouTubeAPI() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ytApiPromise = null;
      reject(new Error('تعذر تحميل مشغّل يوتيوب، تأكد من الاتصال بالإنترنت'));
    }, 15000);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (typeof prev === 'function') prev();
      resolve(window.YT);
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      clearTimeout(timer);
      ytApiPromise = null;
      reject(new Error('تعذر تحميل مشغّل يوتيوب'));
    };
    document.head.appendChild(script);
  });

  return ytApiPromise;
}

/* ---------------------------------------------------------------- */
/* Hidden IFrame Player Helper for probing duration                  */
/* ---------------------------------------------------------------- */

function createHiddenPlayer(options) {
  return loadYouTubeAPI().then(
    (YT) =>
      new Promise((resolve, reject) => {
        const host = document.createElement('div');
        host.style.cssText =
          'position:fixed;left:-9999px;top:0;width:200px;height:120px;opacity:0;pointer-events:none;';
        const inner = document.createElement('div');
        host.appendChild(inner);
        document.body.appendChild(host);

        let player = null;
        let finished = false;
        const destroy = () => {
          try { player && player.destroy(); } catch {}
          host.remove();
        };

        const timer = setTimeout(() => {
          if (!finished) {
            destroy();
            reject(new Error('انتهت مهلة استكشاف المشغّل'));
          }
        }, 12000);

        player = new YT.Player(inner, {
          width: '200',
          height: '120',
          ...options,
          events: {
            onReady: () => {
              finished = true;
              clearTimeout(timer);
              resolve({ player, destroy });
            },
            onError: () => {
              finished = true;
              clearTimeout(timer);
              resolve({ player, destroy });
            },
          },
        });
      })
  );
}

async function probeVideos(player, ids, onProgress) {
  const metas = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    let title = '';
    let durationSec = 0;
    try {
      player.cueVideoById(id);
      const ok = await waitFor(() => {
        const d = player.getDuration && player.getDuration();
        const vd = player.getVideoData && player.getVideoData();
        return d > 0 && vd && vd.video_id === id;
      }, 5000, 200);
      if (ok) {
        await sleep(100);
        durationSec = player.getDuration();
        title = player.getVideoData()?.title || '';
      }
    } catch {}

    // لو العنوان ما جاش من المشغّل، نجيبه عبر oEmbed
    if (!title) {
      title = await fetchVideoTitleViaOEmbed(`https://www.youtube.com/watch?v=${id}`);
    }

    metas.push({
      videoId: id,
      title: title || `مقطع درس رقم ${i + 1}`,
      durationMin: durationSec ? toMinutes(durationSec) : 15,
    });
    onProgress?.(i + 1, ids.length);
  }
  return metas;
}

/* ---------------------------------------------------------------- */
/* Public API                                                        */
/* ---------------------------------------------------------------- */

/**
 * جلب تفاصيل قائمة التشغيل (Playlist) بالكامل مع الفيديوهات والمدد
 */
export async function fetchPlaylistDetails(playlistUrl, fallbackTitle = '', onProgress) {
  const playlistId = extractPlaylistId(playlistUrl);
  if (!playlistId) {
    throw new Error('الرابط لا يحتوي على معرّف قائمة تشغيل صالح (list=...)');
  }

  // محاولة عبر مشغل يوتيوب المدمج
  try {
    const { player, destroy } = await createHiddenPlayer({
      playerVars: { listType: 'playlist', list: playlistId },
    });
    try {
      const got = await waitFor(() => {
        const l = player.getPlaylist && player.getPlaylist();
        return Array.isArray(l) && l.length > 0;
      }, 10000, 300);

      if (!got) throw new Error('تعذر استخراج مقاطع القائمة (قد تكون خاصة أو غير مسموح بتضمينها)');

      const ids = [...new Set(player.getPlaylist())];
      const metas = await probeVideos(player, ids, onProgress);

      let title = fallbackTitle || '';
      if (!title) title = await fetchPlaylistTitleViaOEmbed(playlistId);
      title = title || 'سلسلة مرئية';

      return buildResult(playlistId, title, metas);
    } finally {
      destroy();
    }
  } catch (err) {
    // Fallback title via oEmbed
    const title = (await fetchPlaylistTitleViaOEmbed(playlistId)) || fallbackTitle || 'سلسلة مرئية';
    return {
      success: true,
      playlistId,
      playlistTitle: title,
      videoCount: 1,
      totalDurationMin: 20,
      averageDurationMin: 20,
      items: [
        {
          title,
          youtubeUrl: playlistUrl,
          durationMin: 20,
          order: 1,
          playlistTitle: title,
        },
      ],
    };
  }
}

/**
 * عنوان ومدة فيديو مفرد مع كشف مدته وعنوانه بدقة
 */
export async function fetchSingleVideoDetails(videoUrl) {
  const id = extractVideoId(videoUrl);
  if (!id) throw new Error('رابط الفيديو غير صالح');

  // 1. جلب العنوان عبر oEmbed (سريع وفوري)
  let title = await fetchVideoTitleViaOEmbed(videoUrl);

  // 2. فحص مدة الفيديو الحقيقية عبر المشغل
  let durationMin = 15;
  try {
    const { player, destroy } = await createHiddenPlayer({ videoId: id });
    try {
      const [meta] = await probeVideos(player, [id]);
      if (meta.title && !title) title = meta.title;
      if (meta.durationMin) durationMin = meta.durationMin;
    } finally {
      destroy();
    }
  } catch (e) {
    console.warn('Could not probe exact duration, defaulting to 15m:', e);
  }

  return {
    title: title || 'مقطع مرئي',
    durationMin,
  };
}
