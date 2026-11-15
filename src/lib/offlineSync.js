/**
 * Offline Sync and Offline Data Package Manager
 * - Manages offline mutation queue (saving logs, deleting logs, user profile updates)
 * - Automatically syncs pending operations to Firebase Firestore upon reconnection
 * - Pre-downloads and caches Quran text, tafseer, hadiths, Mushaf pages and audio
 */

import { auth, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, db } from '../firebase.js';
import { SURAHS, TOTAL_PAGES } from '../data/quran.js';
import { getChapterVerses } from './quranFoundationApi.js';
import { getSurahTafseer } from '../data/quranTexts.js';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkar.js';
import { FORTY_HADITHS } from '../data/fortyHadith.js';
import { BUKHARI_BOOKS, MUSLIM_BOOKS } from '../data/hadithCollections.js';
import { fetchBookHadiths } from './hadithService.js';
import { INITIAL_PRESETS } from '../hooks/useActivities.js';
import { settleOrTimeout } from './async.js';

const QUEUE_STORAGE_KEY = 'mutabi_offline_queue';
const OFFLINE_PACKAGE_KEY = 'mutabi_offline_package_status';
const OFFLINE_PACKAGE_VERSION = 4;
const QURAN_MEDIA_CACHE = 'quran-audio-cache';
const QURAN_PAGE_CACHE = 'quran-pages-cache';
const OFFLINE_CACHE_NAMES = [
  'quran-text-cache',
  'hadith-cache',
  QURAN_PAGE_CACHE,
  QURAN_MEDIA_CACHE,
];
const OFFLINE_TIERS = {
  basic: 1,
  reading: 2,
  complete: 3,
};
let offlineDownloadPromise = null;

/**
 * Get pending mutations from localStorage
 */
/** @returns {Array<Object>} */
/** @returns {Array<Object>} */
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Could not read the pending offline queue:', error);
    return [];
  }
}

/**
 * Save pending mutations to localStorage
 */
function saveOfflineQueue(queue) {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  notifyQueueChange();
}

/**
 * Enqueue an offline action (deduplicating by action ID)
 */
/** @param {Object} action */
/** @param {Object} action */
export function enqueueOfflineAction(action) {
  const current = getOfflineQueue();
  const actionKey = action.key || `${action.type}_${action.id || Date.now()}`;
  
  // Replace existing pending action for the same key or append
  const existingIdx = current.findIndex((item) => (item.key || `${item.type}_${item.id}`) === actionKey);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...action, key: actionKey, timestamp: Date.now() };
  } else {
    updated = [...current, { ...action, key: actionKey, timestamp: Date.now() }];
  }
  
  saveOfflineQueue(updated);
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    scheduleOfflineSyncRetry(1000);
  }
}

/**
 * Remove an action from the queue by key
 */
/** @param {string} actionKey */
/** @param {string} actionKey */
export function removeOfflineAction(actionKey) {
  const current = getOfflineQueue();
  const updated = current.filter((item) => (item.key || `${item.type}_${item.id}`) !== actionKey);
  saveOfflineQueue(updated);
}

function notifyQueueChange() {
  const count = getOfflineQueue().length;
  window.dispatchEvent(
    new CustomEvent('mutabi_offline_queue_update', {
      detail: { pendingCount: count },
    })
  );
}

let offlineSyncPromise = null;
let offlineSyncRetryTimer = null;
let offlineSyncRetryAttempt = 0;

function getOfflineActionUid(action) {
  if (action.type === 'SAVE_LOG') return action.data?.uid;
  if (action.type === 'DELETE_LOG') return action.uid;
  if (action.type === 'UPDATE_USER' || action.type === 'MARK_NOTE_READ') return action.uid;
  if (
    ['SAVE_TODO', 'DELETE_TODO', 'SYNC_TODOS', 'SAVE_ADHKAR'].includes(action.type)
  ) return action.uid;
  if (action.type === 'SAVE_ITEM_PROGRESS') return action.data?.uid;
  if (action.type === 'DELETE_ITEM_PROGRESS') return action.uid;
  return null;
}

function belongsToUser(action, uid) {
  const actionUid = getOfflineActionUid(action);
  if (actionUid) return actionUid === uid;
  if (action.type === 'DELETE_LOG') {
    return String(action.logId || '').startsWith(`${uid}_`);
  }
  return true;
}

function isRetryableSyncError(error) {
  return (
    !navigator.onLine ||
    ['unavailable', 'deadline-exceeded', 'network-request-failed', 'timeout', 'failed-precondition'].includes(error?.code) ||
    error?.message?.includes('offline') ||
    error?.message?.includes('Failed to fetch')
  );
}

function scheduleOfflineSyncRetry(delay) {
  if (typeof window === 'undefined' || !navigator.onLine || offlineSyncRetryTimer) return;
  const retryDelay = delay ?? Math.min(5 * 60 * 1000, 5000 * (2 ** offlineSyncRetryAttempt));
  offlineSyncRetryAttempt = Math.min(offlineSyncRetryAttempt + 1, 6);
  offlineSyncRetryTimer = window.setTimeout(() => {
    offlineSyncRetryTimer = null;
    syncPendingOfflineData().catch((error) => {
      console.warn('Automatic offline sync retry failed:', error);
    });
  }, retryDelay);
}

async function waitForCloudWrite(writePromise) {
  const result = await settleOrTimeout(writePromise, 10000);
  if (result === 'pending') {
    const error = new Error('Cloud write timed out; the action remains queued.');
    error.code = 'unavailable';
    throw error;
  }
}

/**
 * Sync all pending offline actions to Firestore
 */
export function syncPendingOfflineData() {
  if (offlineSyncRetryTimer) {
    window.clearTimeout(offlineSyncRetryTimer);
    offlineSyncRetryTimer = null;
  }
  if (!offlineSyncPromise) {
    offlineSyncPromise = performOfflineSync()
      .catch((error) => {
        const retryable = isRetryableSyncError(error);
        window.dispatchEvent(
          new CustomEvent('mutabi_sync_status', {
            detail: {
              isSyncing: false,
              pendingCount: getOfflineQueue().length,
              syncedCount: 0,
              failedCount: 1,
              retryableCount: retryable ? 1 : 0,
            },
          }),
        );
        if (retryable) scheduleOfflineSyncRetry();
        throw error;
      })
      .finally(() => {
        offlineSyncPromise = null;
      });
  }
  return offlineSyncPromise;
}

async function performOfflineSync() {
  if (!navigator.onLine) return { synced: 0, pending: getOfflineQueue().length };

  await auth.authStateReady();
  if (!auth.currentUser || !navigator.onLine) {
    return { synced: 0, pending: getOfflineQueue().length };
  }
  const queue = getOfflineQueue().filter((action) => {
    return belongsToUser(action, auth.currentUser.uid);
  });
  if (queue.length === 0) return { synced: 0, pending: getOfflineQueue().length };

  window.dispatchEvent(
    new CustomEvent('mutabi_sync_status', {
      detail: { isSyncing: true, pendingCount: queue.length },
    })
  );

  let successCount = 0;
  let failedCount = 0;
  let retryableFailureCount = 0;
  let pendingCount = getOfflineQueue().length;
  const completedActions = [];

  for (const action of queue) {
    try {
      if (action.type === 'SAVE_LOG') {
        const ref = doc(db, 'logs', action.logId);
        const logData = {
          ...action.data,
          ...(action.isNew ? { createdAt: serverTimestamp() } : {}),
          updatedAt: serverTimestamp(),
        };
        await waitForCloudWrite(
          setDoc(ref, logData, {
            mergeFields: [
              'id', 'uid', 'activityId', 'date', 'amount', 'completed',
              'details', 'note', 'updatedAt',
              ...(action.isNew ? ['createdAt'] : []),
            ],
          }),
        );
      } else if (action.type === 'DELETE_LOG') {
        await waitForCloudWrite(deleteDoc(doc(db, 'logs', action.logId)));
      } else if (action.type === 'UPDATE_USER') {
        await waitForCloudWrite(
          setDoc(
            doc(db, 'users', action.uid),
            { ...action.fields, updatedAt: serverTimestamp() },
            { merge: true },
          ),
        );
      } else if (action.type === 'SAVE_TODO') {
        const { uid, todoId, data, todosList } = action;
        if (todoId && data) {
          await waitForCloudWrite(
            setDoc(doc(db, 'users', uid, 'todos', todoId), data, { merge: true }),
          );
        }
        if (Array.isArray(todosList)) {
          await waitForCloudWrite(
            setDoc(
              doc(db, 'users', uid),
              {
                todosList: todosList.slice(0, 100),
                lastTodosSyncAt: new Date().toISOString(),
              },
              { merge: true },
            ),
          );
        }
      } else if (action.type === 'DELETE_TODO') {
        const { uid, todoId, todosList } = action;
        if (todoId) {
          await waitForCloudWrite(deleteDoc(doc(db, 'users', uid, 'todos', todoId)));
        }
        if (Array.isArray(todosList)) {
          await waitForCloudWrite(
            setDoc(
              doc(db, 'users', uid),
              {
                todosList: todosList.slice(0, 100),
                lastTodosSyncAt: new Date().toISOString(),
              },
              { merge: true },
            ),
          );
        }
      } else if (action.type === 'SYNC_TODOS') {
        const { uid, todosList } = action;
        if (Array.isArray(todosList)) {
          await waitForCloudWrite(
            setDoc(
              doc(db, 'users', uid),
              {
                todosList: todosList.slice(0, 100),
                lastTodosSyncAt: new Date().toISOString(),
              },
              { merge: true },
            ),
          );
        }
      } else if (action.type === 'SAVE_ADHKAR') {
        const { uid, dayKey, categoryId, dhikrId, count } = action;
        await waitForCloudWrite(
          setDoc(
            doc(db, 'users', uid, 'adhkarProgress', `${dayKey}_${categoryId}_${dhikrId}`),
            {
              uid,
              date: dayKey,
              categoryId,
              dhikrId,
              count,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        );
      } else if (action.type === 'SAVE_ITEM_PROGRESS') {
        const { progressId, data } = action;
        if (!progressId || !data?.uid || !data?.activityId || !data?.itemId) {
          throw new Error('Invalid offline item-progress payload.');
        }
        await waitForCloudWrite(
          setDoc(doc(db, 'itemProgress', progressId), data, { merge: true }),
        );
      } else if (action.type === 'DELETE_ITEM_PROGRESS') {
        const { progressId } = action;
        if (!progressId) throw new Error('Invalid offline item-progress deletion.');
        await waitForCloudWrite(deleteDoc(doc(db, 'itemProgress', progressId)));
      } else if (action.type === 'MARK_NOTE_READ') {
        const { noteId, uid } = action;
        if (!noteId || uid !== auth.currentUser.uid) {
          throw new Error('Invalid offline note-read payload.');
        }
        await waitForCloudWrite(
          updateDoc(doc(db, 'notes', noteId), { isRead: true }),
        );
      } else {
        console.error('Unsupported offline action retained for review:', action);
        failedCount++;
        continue;
      }
      successCount++;
      completedActions.push(action);
    } catch (err) {
      console.warn('Sync failed for item:', action.key, err);
      failedCount++;
      if (isRetryableSyncError(err)) retryableFailureCount++;
    }
  }

  const currentQueue = getOfflineQueue();
  const stillPending = currentQueue.filter(
    (queuedAction) =>
      !completedActions.some(
        (completedAction) =>
          (queuedAction.key || `${queuedAction.type}_${queuedAction.id}`) ===
            (completedAction.key || `${completedAction.type}_${completedAction.id}`) &&
          queuedAction.timestamp === completedAction.timestamp,
      ),
  );
  pendingCount = stillPending.length;
  saveOfflineQueue(stillPending);

  const nowStr = new Date().toISOString();
  try {
    localStorage.setItem('mutabi_last_sync_time', nowStr);
  } catch {}

  window.dispatchEvent(
    new CustomEvent('mutabi_sync_status', {
      detail: {
        isSyncing: false,
        pendingCount,
        syncedCount: successCount,
        failedCount,
        retryableCount: retryableFailureCount,
        lastSyncTime: nowStr,
      },
    })
  );

  if (retryableFailureCount > 0) {
    scheduleOfflineSyncRetry();
  } else {
    offlineSyncRetryAttempt = 0;
  }

  return {
    synced: successCount,
    pending: pendingCount,
    failed: failedCount,
    retryable: retryableFailureCount,
  };
}

// Automatically trigger sync when the device reconnects to internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('Reconnected to internet. Initiating automatic Firestore background sync...');
    offlineSyncRetryAttempt = 0;
    scheduleOfflineSyncRetry(1500);
  });
}

/**
 * Check if the offline bundle has been downloaded
 */
export function getOfflinePackageStatus() {
  try {
    const raw = localStorage.getItem(OFFLINE_PACKAGE_KEY);
    if (!raw) return { isReady: false, isDownloading: false, lastDownload: null };
    const status = JSON.parse(raw);
    if (status.version === 2 && status.isReady) {
      return {
        ...status,
        version: OFFLINE_PACKAGE_VERSION,
        downloadedTier: 'complete',
        selectedTier: 'complete',
      };
    }
    if (status.version !== OFFLINE_PACKAGE_VERSION) {
      return {
        isReady: false,
        isDownloading: false,
        lastDownload: status.lastDownload,
        downloadedTier: null,
        selectedTier: 'basic',
      };
    }
    return {
      ...status,
      isReady:
        OFFLINE_TIERS[status.downloadedTier] >=
        OFFLINE_TIERS[status.selectedTier || 'basic'],
      isDownloading: offlineDownloadPromise ? Boolean(status.isDownloading) : false,
    };
  } catch {
    return {
      isReady: false,
      isDownloading: false,
      lastDownload: null,
      downloadedTier: null,
      selectedTier: 'basic',
    };
  }
}

export async function getOfflineStorageEstimate() {
  if (!navigator.storage?.estimate) return null;
  return navigator.storage.estimate();
}

export async function deleteOfflinePackage() {
  if (offlineDownloadPromise) {
    throw new Error('انتظر حتى يتوقف التنزيل قبل حذف المحتوى المحفوظ.');
  }
  if (typeof caches === 'undefined') {
    throw new Error('هذا المتصفح لا يدعم حذف المحتوى المحفوظ.');
  }

  await Promise.all(OFFLINE_CACHE_NAMES.map((cacheName) => caches.delete(cacheName)));

  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index);
    if (
      key?.startsWith('mutabi_tafseer_arabic_moyassar_v1_') ||
      key?.startsWith('mutabi_hadith_v1_') ||
      key === 'mutabi_hadith_cached_books' ||
      key === 'mutabi_offline_surahs_meta' ||
      key === 'mutabi_offline_adhkar' ||
      key === 'mutabi_offline_hadith'
    ) {
      localStorage.removeItem(key);
    }
  }

  const status = {
    version: OFFLINE_PACKAGE_VERSION,
    isReady: false,
    isDownloading: false,
    percent: 0,
    title: '',
    lastDownload: null,
    downloadedTier: null,
    selectedTier: 'basic',
  };
  saveOfflinePackageStatus(status);
  return status;
}

function saveOfflinePackageStatus(status, onProgress) {
  localStorage.setItem(OFFLINE_PACKAGE_KEY, JSON.stringify(status));
  window.dispatchEvent(new CustomEvent('mutabi_offline_package_status', { detail: status }));
  onProgress?.(status);
}

async function ensureServiceWorkerControlsPage() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('يلزم متصفح يدعم Service Worker لتشغيل الوسائط دون اتصال.');
  }

  let readyTimeout;
  try {
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => {
        readyTimeout = setTimeout(
          () => reject(new Error('تعذر تفعيل التخزين دون اتصال. أعد تحميل الصفحة وحاول مجدداً.')),
          10000,
        );
      }),
    ]);
  } finally {
    clearTimeout(readyTimeout);
  }
  if (navigator.serviceWorker.controller) return;

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      resolve();
    }, 5000);
    const handleControllerChange = () => {
      clearTimeout(timeout);
      resolve();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
  });
  if (!navigator.serviceWorker.controller) {
    throw new Error('لم يتمكن التطبيق من تفعيل التخزين دون اتصال. أعد تحميل الصفحة وحاول مجدداً.');
  }
}

async function cacheResource(cache, url) {
  if (await cache.match(url)) return false;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    try {
      response = await fetch(url, { signal: controller.signal, mode: 'cors' });
    } catch (corsError) {
      // بعض مصادر الوسائط لا تعرض CORS؛ نستخدم opaque كحل احتياطي.
      response = await fetch(url, { signal: controller.signal, mode: 'no-cors' });
    }
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok && response.type !== 'opaque') {
    throw new Error(`تعذر تنزيل ${url} (HTTP ${response.status}).`);
  }
  await cache.put(url, response);
  return true;
}

async function cacheResources(cache, resources, onItemComplete) {
  const concurrency = 3;
  for (let offset = 0; offset < resources.length; offset += concurrency) {
    const batch = resources.slice(offset, offset + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (url) => {
        const downloaded = await cacheResource(cache, url);
        onItemComplete(downloaded);
      }),
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
}

export async function downloadOfflinePackage(tier = 'basic', onProgress) {
  if (!Object.hasOwn(OFFLINE_TIERS, tier)) {
    throw new Error('اختيار حزمة الأوفلاين غير صالح.');
  }
  if (offlineDownloadPromise) return offlineDownloadPromise;
  const previousStatus = getOfflinePackageStatus();
  if (OFFLINE_TIERS[previousStatus.downloadedTier] >= OFFLINE_TIERS[tier]) {
    return previousStatus;
  }

  offlineDownloadPromise = (async () => {
    const storageEstimate = await navigator.storage?.estimate?.();
    const availableBytes = Number(storageEstimate?.quota || 0) - Number(storageEstimate?.usage || 0);
    const minimumBytesByTier = {
      basic: 50 * 1024 * 1024,
      reading: 250 * 1024 * 1024,
      complete: 1024 * 1024 * 1024,
    };
    if (availableBytes > 0 && availableBytes < minimumBytesByTier[tier]) {
      throw new Error('المساحة المتاحة على جهازك غير كافية لهذه الحزمة. احذف بعض الملفات أو اختر حزمة أصغر.');
    }

    const packageStatus = {
      version: OFFLINE_PACKAGE_VERSION,
      isReady: false,
      isDownloading: true,
      percent: 0,
      title: 'تهيئة تنزيل المحتوى...',
      lastDownload: previousStatus.lastDownload || null,
      downloadedTier: previousStatus.downloadedTier || null,
      selectedTier: tier,
    };

    const chapterCount = SURAHS.length;
    const hadithBooks =
      OFFLINE_TIERS[tier] >= OFFLINE_TIERS.reading
        ? [
            ...BUKHARI_BOOKS.map((book) => ({ collection: 'bukhari', id: book.id })),
            ...MUSLIM_BOOKS.map((book) => ({ collection: 'muslim', id: book.id })),
          ]
        : [];
    const totalAyahs = SURAHS.reduce((total, surah) => total + surah.ayahsCount, 0);
    const includeAudio = OFFLINE_TIERS[tier] >= OFFLINE_TIERS.complete;
    const includePages = OFFLINE_TIERS[tier] >= OFFLINE_TIERS.reading;
    // الحزمة الكاملة تحفظ ملف كل سورة فقط؛ لا تنزّل ملفًا لكل آية.
    const totalResources = chapterCount * 2 + hadithBooks.length +
      (includePages ? TOTAL_PAGES : 0) +
      (includeAudio ? chapterCount : 0);
    let completed = 0;

    const report = (title) => {
      packageStatus.percent = Math.min(99, Math.floor((completed / totalResources) * 100));
      packageStatus.title = title;
      saveOfflinePackageStatus(packageStatus, onProgress);
    };
    const completeOne = (title) => {
      completed++;
      report(title);
    };

    try {
      if (typeof caches === 'undefined' || typeof fetch === 'undefined') {
        throw new Error('هذا المتصفح لا يدعم التخزين اللازم للعمل دون اتصال.');
      }
      if (!navigator.onLine) {
        throw new Error('اتصل بالإنترنت لبدء تنزيل المحتوى للعمل دون اتصال.');
      }

      await ensureServiceWorkerControlsPage();
      await navigator.storage?.persist?.();
      saveOfflinePackageStatus(packageStatus, onProgress);
      localStorage.setItem('mutabi_offline_surahs_meta', JSON.stringify(SURAHS));
      localStorage.setItem(
        'mutabi_offline_adhkar',
        JSON.stringify({ morning: MORNING_ADHKAR, evening: EVENING_ADHKAR }),
      );
      localStorage.setItem('mutabi_offline_hadith', JSON.stringify(FORTY_HADITHS));
      if (!localStorage.getItem('mutabi_activities_cache')) {
        const presets = INITIAL_PRESETS.map((preset, index) => ({
          ...preset,
          id: preset.id || `preset_${index + 1}`,
        }));
        localStorage.setItem('mutabi_activities_cache', JSON.stringify(presets));
      }

      for (let index = 0; index < SURAHS.length; index++) {
        await getChapterVerses(index + 1);
        completeOne(`تنزيل نص القرآن وبيانات الصفحات (${index + 1}/${SURAHS.length})`);
        const tafseer = await getSurahTafseer(index + 1);
        if (Object.keys(tafseer).length < SURAHS[index].ayahsCount) {
          throw new Error(`التفسير المحفوظ لسورة ${index + 1} غير مكتمل.`);
        }
        completeOne(`تنزيل تفاسير السور (${index + 1}/${SURAHS.length})`);
      }

      for (let index = 0; index < hadithBooks.length; index++) {
        const book = hadithBooks[index];
        await fetchBookHadiths(book.collection, book.id);
        completeOne(`تنزيل كتب الحديث (${index + 1}/${hadithBooks.length})`);
      }

      if (includePages) {
        const pageCache = await caches.open(QURAN_PAGE_CACHE);
        const pageUrls = Array.from({ length: TOTAL_PAGES }, (_, index) => {
          const page = String(index + 1).padStart(3, '0');
          return `https://files.quran.app/hafs/madani/width_1024/page${page}.png`;
        });
        await cacheResources(pageCache, pageUrls, () => completeOne('تنزيل صور صفحات المصحف'));
      }

      if (includeAudio) {
        const audioCache = await caches.open(QURAN_MEDIA_CACHE);
        const audioUrls = SURAHS.map(
          (surah) => `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surah.number}.mp3`,
        );
        await cacheResources(audioCache, audioUrls, () =>
          completeOne('تنزيل تلاوات القرآن الصوتية'),
        );
      }
    } catch (error) {
      const failedStatus = {
        ...packageStatus,
        isDownloading: false,
        isReady: Boolean(previousStatus.downloadedTier),
        percent: previousStatus.percent || 0,
        title: previousStatus.title || '',
        error: error?.message || 'تعذر إكمال تنزيل المحتوى.',
      };
      saveOfflinePackageStatus(failedStatus, onProgress);
      throw error;
    }

    const readyStatus = {
      version: OFFLINE_PACKAGE_VERSION,
      isReady: true,
      isDownloading: false,
      percent: 100,
      title:
        tier === 'basic'
          ? 'اكتمل تنزيل المحتوى الأساسي.'
          : tier === 'reading'
            ? 'اكتمل تنزيل مكتبة القراءة.'
            : 'اكتمل تنزيل المحتوى وتلاوات السور.',
      lastDownload: new Date().toISOString(),
      downloadedTier: tier,
      selectedTier: tier,
      itemsCount: {
        surahs: chapterCount,
        hadithBooks: hadithBooks.length,
        hadiths: FORTY_HADITHS.length,
        pages: includePages ? TOTAL_PAGES : 0,
        ayahAudio: 0,
        surahAudio: includeAudio ? chapterCount : 0,
        morningAdhkar: MORNING_ADHKAR.length,
        eveningAdhkar: EVENING_ADHKAR.length,
      },
    };
    saveOfflinePackageStatus(readyStatus, onProgress);
    return readyStatus;
  })().finally(() => {
    offlineDownloadPromise = null;
  });

  return offlineDownloadPromise;
}
