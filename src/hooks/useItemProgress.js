import { useEffect, useState, useCallback } from 'react';
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

export function useItemProgress(activityId) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

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
    if (!user) {
      setProgress({});
      return;
    }

    const progQuery = query(
      collection(db, 'itemProgress'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      progQuery,
      (snapshot) => {
        const map = {};
        snapshot.forEach((d) => {
          const data = d.data();
          map[data.itemId] = {
            isCompleted: !!data.isCompleted,
            minutesListened: data.minutesListened || 0,
            durationMin: data.durationMin || 0,
            percentage: data.percentage || (data.isCompleted ? 100 : 0),
            updatedAt: data.updatedAt,
          };
        });
        setProgress(map);
      },
      (error) => {
        console.warn('ItemProgress listener note:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Update minutes listened for a specific video in a playlist
  const updateMinutesListened = useCallback(
    async (itemId, minutes, durationMin, playlistId = null) => {
      if (!user || !activityId) return;
      const progressDocId = `${user.uid}_${itemId}`;
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
      setProgress((prev) => ({
        ...prev,
        [itemId]: updatedRecord,
      }));

      try {
        const ref = doc(db, 'itemProgress', progressDocId);
        await setDoc(
          ref,
          {
            uid: user.uid,
            activityId,
            itemId,
            playlistId: playlistId || null,
            minutesListened: safeMinutes,
            durationMin: safeDuration,
            percentage,
            isCompleted,
            watchedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        return updatedRecord;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `itemProgress/${progressDocId}`);
        throw err;
      }
    },
    [user, activityId]
  );

  // Toggle full completion of a video
  const toggleWatchStatus = useCallback(
    async (itemId, currentStatus, durationMin = 30) => {
      if (!user || !activityId) return;
      const progressDocId = `${user.uid}_${itemId}`;
      const nextCompleted = !currentStatus;
      const minutes = nextCompleted ? durationMin : 0;

      // Optimistic state
      setProgress((prev) => ({
        ...prev,
        [itemId]: {
          isCompleted: nextCompleted,
          minutesListened: minutes,
          durationMin,
          percentage: nextCompleted ? 100 : 0,
          updatedAt: new Date().toISOString(),
        },
      }));

      try {
        const ref = doc(db, 'itemProgress', progressDocId);
        if (!nextCompleted) {
          await deleteDoc(ref);
        } else {
          await setDoc(
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
            { merge: true }
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `itemProgress/${progressDocId}`);
        throw err;
      }
    },
    [user, activityId]
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
