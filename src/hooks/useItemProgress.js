import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { enqueueOfflineAction, getOfflineQueue, removeOfflineAction } from '../lib/offlineSync.js';
import { settleOrTimeout } from '../lib/async.js';

export const STARTER_PLAYLIST_ITEMS = [
  {
    id: 'starter_1',
    title: 'مقدمة في تدبر القرآن الكريم ومفاتيح الفهم',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    durationMin: 25,
    order: 1,
    playlistTitle: 'سلسلة تدبر القرآن',
  },
  {
    id: 'starter_2',
    title: 'كيف نعيش مع سورة الفاتحة في صلاتنا؟',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    durationMin: 30,
    order: 2,
    playlistTitle: 'سلسلة تدبر القرآن',
  },
  {
    id: 'starter_3',
    title: 'أنوار سورة الكهف والنجاة من الفتن',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    durationMin: 40,
    order: 3,
    playlistTitle: 'سلسلة تدبر القرآن',
  },
];

function getProgressCacheKey(uid, activityId) {
  return `mutabi_item_progress_${uid}_${activityId}`;
}

function getCachedProgress(uid, activityId) {
  if (!uid || !activityId) return {};
  try {
    const raw = localStorage.getItem(getProgressCacheKey(uid, activityId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Could not read cached item progress:', error);
    return {};
  }
}

function saveCachedProgress(uid, activityId, progress) {
  try {
    localStorage.setItem(getProgressCacheKey(uid, activityId), JSON.stringify(progress));
  } catch (error) {
    console.warn('Could not save cached item progress:', error);
  }
}

function mergePendingProgress(progress, uid, activityId) {
  const merged = { ...progress };
  const actions = getOfflineQueue()
    .filter((action) => action.uid === uid && action.activityId === activityId)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  for (const action of actions) {
    if (action.type === 'SAVE_ITEM_PROGRESS' && action.data?.itemId) {
      const data = action.data;
      merged[data.itemId] = {
        isCompleted: Boolean(data.isCompleted),
        minutesListened: Number(data.minutesListened) || 0,
        durationMin: Number(data.durationMin) || 0,
        percentage: Number(data.percentage) || (data.isCompleted ? 100 : 0),
        updatedAt: data.updatedAt,
      };
    } else if (action.type === 'DELETE_ITEM_PROGRESS' && action.itemId) {
      delete merged[action.itemId];
    }
  }
  return merged;
}

function isRetryableWriteError(error) {
  return (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(error?.code)
  );
}

export function useItemProgress(activityId) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState(() => getCachedProgress(user?.uid, activityId));
  const [loading, setLoading] = useState(true);
  const progressMigrationsRef = useRef(new Set());

  // Load items for the activity
  useEffect(() => {
    if (!activityId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const itemsQuery = query(
      collection(db, `activities/${activityId}/items`),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));

        if (list.length === 0) {
          // Provide default starter series if not yet configured
          setItems(STARTER_PLAYLIST_ITEMS.map((item) => ({ ...item, activityId })));
        } else {
          setItems(list);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Items fetch fallback to starter items:', error);
        setItems(STARTER_PLAYLIST_ITEMS.map((item) => ({ ...item, activityId })));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activityId]);

  // Load user watch and listening progress
  useEffect(() => {
    if (!user || !activityId) {
      setProgress({});
      return;
    }

    setProgress(getCachedProgress(user.uid, activityId));
    const progQuery = query(
      collection(db, 'itemProgress'),
      where('uid', '==', user.uid),
      where('activityId', '==', activityId)
    );

    const unsubscribe = onSnapshot(
      progQuery,
      (snapshot) => {
        const map = {};
        const documentIds = new Set(snapshot.docs.map((progressDoc) => progressDoc.id));
        snapshot.forEach((d) => {
          const data = d.data();
          const legacyId = `${user.uid}_${data.itemId}`;
          const currentId = `${user.uid}_${activityId}_${data.itemId}`;
          if (
            d.id === legacyId &&
            !documentIds.has(currentId) &&
            !progressMigrationsRef.current.has(legacyId)
          ) {
            progressMigrationsRef.current.add(legacyId);
            setDoc(doc(db, 'itemProgress', currentId), data, { merge: true })
              .then(() => deleteDoc(doc(db, 'itemProgress', legacyId)))
              .catch((error) => {
                handleFirestoreError(error, OperationType.WRITE, `itemProgress/${currentId}`);
              })
              .finally(() => progressMigrationsRef.current.delete(legacyId));
          }
          map[data.itemId] = {
            isCompleted: !!data.isCompleted,
            minutesListened: data.minutesListened || 0,
            durationMin: data.durationMin || 0,
            percentage: data.percentage || (data.isCompleted ? 100 : 0),
            updatedAt: data.updatedAt,
          };
        });
        const merged = mergePendingProgress(map, user.uid, activityId);
        setProgress(merged);
        saveCachedProgress(user.uid, activityId, merged);
      },
      (error) => {
        console.warn('ItemProgress listener note:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, activityId]);

  // Update minutes listened for a specific video in a playlist
  const updateMinutesListened = useCallback(
    async (itemId, minutes, durationMin, playlistId = null) => {
      if (!user || !activityId) return;
      const progressDocId = `${user.uid}_${activityId}_${itemId}`;
      const previousRecord = progress[itemId];
      const safeMinutes = Math.max(0, minutes);
      const safeDuration = durationMin || 30;
      const isCompleted = safeMinutes >= safeDuration;
      const percentage = Math.min(100, Math.round((safeMinutes / safeDuration) * 100));

      const updatedRecord = {
        isCompleted,
        minutesListened: safeMinutes,
        durationMin: safeDuration,
        percentage,
        updatedAt: new Date().toISOString(),
      };

      // Optimistic local state update
      const nextProgress = { ...progress, [itemId]: updatedRecord };
      setProgress(nextProgress);
      saveCachedProgress(user.uid, activityId, nextProgress);
      const data = {
        uid: user.uid,
        activityId,
        itemId,
        playlistId: playlistId || null,
        minutesListened: safeMinutes,
        durationMin: safeDuration,
        percentage,
        isCompleted,
        updatedAt: updatedRecord.updatedAt,
      };
      const queueAction = () =>
        enqueueOfflineAction({
          type: 'SAVE_ITEM_PROGRESS',
          key: `ITEM_PROGRESS_${progressDocId}`,
          uid: user.uid,
          activityId,
          itemId,
          progressId: progressDocId,
          data,
        });

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        queueAction();
        return updatedRecord;
      }

      try {
        const ref = doc(db, 'itemProgress', progressDocId);
        const result = await settleOrTimeout(
          setDoc(
            ref,
            {
              ...data,
              watchedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
          4000,
        );
        if (result === 'pending') {
          queueAction();
          return updatedRecord;
        }
        removeOfflineAction(`ITEM_PROGRESS_${progressDocId}`);
        return updatedRecord;
      } catch (err) {
        if (isRetryableWriteError(err)) {
          queueAction();
          return updatedRecord;
        }
        const restored = { ...nextProgress };
        if (previousRecord) restored[itemId] = previousRecord;
        else delete restored[itemId];
        setProgress(restored);
        saveCachedProgress(user.uid, activityId, restored);
        handleFirestoreError(err, OperationType.WRITE, `itemProgress/${progressDocId}`);
        throw err;
      }
    },
    [user, activityId, progress]
  );

  // Toggle full completion of a video
  const toggleWatchStatus = useCallback(
    async (itemId, currentStatus, durationMin = 30) => {
      if (!user || !activityId) return;
      const progressDocId = `${user.uid}_${activityId}_${itemId}`;
      const previousRecord = progress[itemId];
      const nextCompleted = !currentStatus;
      const minutes = nextCompleted ? durationMin : 0;
      const updatedRecord = {
        isCompleted: nextCompleted,
        minutesListened: minutes,
        durationMin,
        percentage: nextCompleted ? 100 : 0,
        updatedAt: new Date().toISOString(),
      };

      // Optimistic state
      const nextProgress = { ...progress, [itemId]: updatedRecord };
      if (!nextCompleted) delete nextProgress[itemId];
      setProgress(nextProgress);
      saveCachedProgress(user.uid, activityId, nextProgress);
      const queueAction = () =>
        enqueueOfflineAction(
          nextCompleted
            ? {
                type: 'SAVE_ITEM_PROGRESS',
                key: `ITEM_PROGRESS_${progressDocId}`,
                uid: user.uid,
                activityId,
                itemId,
                progressId: progressDocId,
                data: {
                  uid: user.uid,
                  activityId,
                  itemId,
                  minutesListened: durationMin,
                  durationMin,
                  percentage: 100,
                  isCompleted: true,
                  updatedAt: updatedRecord.updatedAt,
                },
              }
            : {
                type: 'DELETE_ITEM_PROGRESS',
                key: `ITEM_PROGRESS_${progressDocId}`,
                uid: user.uid,
                activityId,
                itemId,
                progressId: progressDocId,
              },
        );

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        queueAction();
        return;
      }

      try {
        const ref = doc(db, 'itemProgress', progressDocId);
        if (!nextCompleted) {
          const result = await settleOrTimeout(deleteDoc(ref), 4000);
          if (result === 'pending') {
            queueAction();
            return;
          }
        } else {
          const result = await settleOrTimeout(
            setDoc(
              ref,
              {
                uid: user.uid,
                activityId,
                itemId,
                minutesListened: durationMin,
                durationMin,
                percentage: 100,
                isCompleted: true,
                watchedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            ),
            4000,
          );
          if (result === 'pending') {
            queueAction();
            return;
          }
        }
        removeOfflineAction(`ITEM_PROGRESS_${progressDocId}`);
      } catch (err) {
        if (isRetryableWriteError(err)) {
          queueAction();
          return;
        }
        const restored = { ...nextProgress };
        if (previousRecord) restored[itemId] = previousRecord;
        else delete restored[itemId];
        setProgress(restored);
        saveCachedProgress(user.uid, activityId, restored);
        handleFirestoreError(err, OperationType.WRITE, `itemProgress/${progressDocId}`);
        throw err;
      }
    },
    [user, activityId, progress]
  );

  // Save new video or playlist lesson
  const saveActivityItem = useCallback(
    async (data) => {
      if (!activityId) return;
      try {
        if (data.id && !data.id.startsWith('starter_')) {
          const ref = doc(db, `activities/${activityId}/items`, data.id);
          await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
        } else {
          const ref = doc(collection(db, `activities/${activityId}/items`));
          await setDoc(ref, {
            ...data,
            id: ref.id,
            activityId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `activities/${activityId}/items`);
        throw err;
      }
    },
    [activityId]
  );

  // Delete item from activity
  const deleteActivityItem = useCallback(
    async (itemId) => {
      if (!activityId) return;
      try {
        await deleteDoc(doc(db, `activities/${activityId}/items`, itemId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `activities/${activityId}/items/${itemId}`);
        throw err;
      }
    },
    [activityId]
  );

  return {
    items,
    progress,
    loading,
    updateMinutesListened,
    toggleWatchStatus,
    saveActivityItem,
    deleteActivityItem,
  };
}
