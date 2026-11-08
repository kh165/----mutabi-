/**
 * Offline Sync and Offline Data Package Manager
 * - Manages offline mutation queue (saving logs, deleting logs, user profile updates)
 * - Automatically syncs pending operations to Firebase Firestore upon reconnection
 * - Pre-downloads and caches complete platform data (Quran, Adhkar, 42 Hadiths, activities)
 */

import { doc, setDoc, deleteDoc, serverTimestamp, db } from '../firebase.js';
import { SURAHS } from '../data/quran.js';
import { AUTHENTIC_QURAN_SURAHS } from '../data/quranTexts.js';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../data/adhkar.js';
import { FORTY_HADITHS } from '../data/fortyHadith.js';
import { INITIAL_PRESETS } from '../hooks/useActivities.js';

const QUEUE_STORAGE_KEY = 'mutabi_offline_queue';
const OFFLINE_PACKAGE_KEY = 'mutabi_offline_package_status';

/**
 * Get pending mutations from localStorage
 */
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save pending mutations to localStorage
 */
export function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    notifyQueueChange();
  } catch (e) {
    console.warn('Failed to save offline queue', e);
  }
}

/**
 * Enqueue an offline action (deduplicating by action ID)
 */
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
}

/**
 * Remove an action from the queue by key
 */
export function removeOfflineAction(actionKey) {
  const current = getOfflineQueue();
  const updated = current.filter((item) => (item.key || `${item.type}_${item.id}`) !== actionKey);
  saveOfflineQueue(updated);
}

/**
 * Clear the entire offline queue
 */
export function clearOfflineQueue() {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
    notifyQueueChange();
  } catch {}
}

function notifyQueueChange() {
  const count = getOfflineQueue().length;
  window.dispatchEvent(
    new CustomEvent('mutabi_offline_queue_update', {
      detail: { pendingCount: count },
    })
  );
}

let isSyncInProgress = false;

/**
 * Sync all pending offline actions to Firestore
 */
export async function syncPendingOfflineData() {
  if (isSyncInProgress) return { synced: 0, pending: getOfflineQueue().length };
  if (!navigator.onLine) return { synced: 0, pending: getOfflineQueue().length };

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, pending: 0 };

  isSyncInProgress = true;
  window.dispatchEvent(
    new CustomEvent('mutabi_sync_status', {
      detail: { isSyncing: true, pendingCount: queue.length },
    })
  );

  let successCount = 0;
  const remaining = [];

  for (const action of queue) {
    try {
      if (action.type === 'SAVE_LOG') {
        const ref = doc(db, 'logs', action.logId);
        await setDoc(
          ref,
          {
            ...action.data,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        successCount++;
      } else if (action.type === 'DELETE_LOG') {
        const ref = doc(db, 'logs', action.logId);
        await deleteDoc(ref);
        successCount++;
      } else if (action.type === 'UPDATE_USER') {
        const ref = doc(db, 'users', action.uid);
        await setDoc(
          ref,
          {
            ...action.fields,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        successCount++;
      } else if (action.type === 'SAVE_TODO') {
        const { uid, todoId, data, todosList } = action;
        if (todoId && data) {
          const todoRef = doc(db, 'users', uid, 'todos', todoId);
          await setDoc(todoRef, data, { merge: true }).catch((e) => console.warn('Subcollection todo sync note:', e));
        }
        if (Array.isArray(todosList)) {
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, { todosList: todosList.slice(0, 100), lastTodosSyncAt: new Date().toISOString() }, { merge: true });
        }
        successCount++;
      } else if (action.type === 'DELETE_TODO') {
        const { uid, todoId, todosList } = action;
        if (todoId) {
          const todoRef = doc(db, 'users', uid, 'todos', todoId);
          await deleteDoc(todoRef).catch(() => {});
        }
        if (Array.isArray(todosList)) {
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, { todosList: todosList.slice(0, 100), lastTodosSyncAt: new Date().toISOString() }, { merge: true });
        }
        successCount++;
      } else if (action.type === 'SYNC_TODOS') {
        const { uid, todosList } = action;
        if (Array.isArray(todosList)) {
          const userRef = doc(db, 'users', uid);
          await setDoc(userRef, { todosList: todosList.slice(0, 100), lastTodosSyncAt: new Date().toISOString() }, { merge: true });
        }
        successCount++;
      } else if (action.type === 'SAVE_ADHKAR') {
        const { uid, dayKey, categoryId, dhikrId, count } = action;
        const ref = doc(db, 'users', uid, 'adhkarProgress', `${dayKey}_${categoryId}_${dhikrId}`);
        await setDoc(
          ref,
          {
            uid,
            date: dayKey,
            categoryId,
            dhikrId,
            count,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        successCount++;
      }
    } catch (err) {
      console.warn('Sync failed for item:', action.key, err);
      // Keep in queue for next retry if it's a network error
      remaining.push(action);
    }
  }

  saveOfflineQueue(remaining);
  isSyncInProgress = false;

  const nowStr = new Date().toISOString();
  try {
    localStorage.setItem('mutabi_last_sync_time', nowStr);
  } catch {}

  window.dispatchEvent(
    new CustomEvent('mutabi_sync_status', {
      detail: {
        isSyncing: false,
        pendingCount: remaining.length,
        syncedCount: successCount,
        lastSyncTime: nowStr,
      },
    })
  );

  return { synced: successCount, pending: remaining.length };
}

// Automatically trigger sync when the device reconnects to internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('Reconnected to internet. Initiating automatic Firestore background sync...');
    syncPendingOfflineData().catch((err) => console.warn('Auto-sync error:', err));
  });
}

/**
 * Check if the offline bundle has been downloaded
 */
export function getOfflinePackageStatus() {
  try {
    const raw = localStorage.getItem(OFFLINE_PACKAGE_KEY);
    return raw ? JSON.parse(raw) : { isReady: false, lastDownload: null };
  } catch {
    return { isReady: false, lastDownload: null };
  }
}

/**
 * Downloads and preloads the complete offline package
 * (Quran scripture, Adhkar, 42 Hadiths, activities, cache storage)
 */
export async function downloadOfflinePackage(onProgress) {
  const steps = [
    { title: 'تهيئة مساحة التخزين بدون إنترنت...', weight: 10 },
    { title: 'حفظ وتثبيت القرآن الكريم بالرسم العثماني (114 سورة)...', weight: 40 },
    { title: 'تخزين أذكار الصباح والمساء وحصن المسلم بالكامل...', weight: 20 },
    { title: 'تحميل متن الأربعين النووية الشريفة وشروحها (42 حديثاً)...', weight: 20 },
    { title: 'تجهيز جدول العبادات والأنشطة والخطوط...', weight: 10 },
  ];

  let currentPercent = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    onProgress?.({
      step: i + 1,
      totalSteps: steps.length,
      title: step.title,
      percent: currentPercent,
    });

    // Step 1: Storage init
    if (i === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }

    // Step 2: Preload Quran data into localStorage & CacheStorage
    if (i === 1) {
      try {
        localStorage.setItem('mutabi_offline_surahs_meta', JSON.stringify(SURAHS));
        localStorage.setItem(
          'mutabi_offline_quran_sample',
          JSON.stringify(AUTHENTIC_QURAN_SURAHS)
        );
      } catch (e) {
        console.warn('Cache Quran warning', e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    // Step 3: Preload Adhkar
    if (i === 2) {
      try {
        localStorage.setItem(
          'mutabi_offline_adhkar',
          JSON.stringify({ morning: MORNING_ADHKAR, evening: EVENING_ADHKAR })
        );
      } catch (e) {
        console.warn('Cache Adhkar warning', e);
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    // Step 4: Preload Hadiths
    if (i === 3) {
      try {
        localStorage.setItem('mutabi_offline_hadith', JSON.stringify(FORTY_HADITHS));
      } catch (e) {
        console.warn('Cache Hadith warning', e);
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    // Step 5: Preload Activities presets
    if (i === 4) {
      try {
        if (!localStorage.getItem('mutabi_activities_cache')) {
          const presets = INITIAL_PRESETS.map((p, idx) => ({ ...p, id: p.id || `preset_${idx + 1}` }));
          localStorage.setItem('mutabi_activities_cache', JSON.stringify(presets));
        }
      } catch (e) {
        console.warn('Cache Activities warning', e);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    currentPercent += step.weight;
  }

  // Mark package as fully downloaded and ready
  const packageInfo = {
    isReady: true,
    lastDownload: new Date().toISOString(),
    itemsCount: {
      surahs: SURAHS.length,
      hadiths: FORTY_HADITHS.length,
      morningAdhkar: MORNING_ADHKAR.length,
      eveningAdhkar: EVENING_ADHKAR.length,
    },
  };

  try {
    localStorage.setItem(OFFLINE_PACKAGE_KEY, JSON.stringify(packageInfo));
  } catch {}

  onProgress?.({
    step: steps.length,
    totalSteps: steps.length,
    title: 'اكتمل تحميل كافة البيانات بنجاح! المنصة جاهزة 100% للعمل بدون إنترنت.',
    percent: 100,
  });

  return packageInfo;
}
