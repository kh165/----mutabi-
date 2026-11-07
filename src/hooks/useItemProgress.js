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
} from '../firebase.js';
import { db, handleDatabaseError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * activityId = null  =>  الهوك مبيعملش أي اشتراك (مفيد للكروت اللي مش "سماع")
 */
export function useItemProgress(activityId) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(!!activityId);

  // مقاطع النشاط
  useEffect(() => {
    if (!activityId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const itemsQuery = query(
      collection(db, `activities/${activityId}/items`),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setItems(list);
        setLoading(false);
      },
      (error) => {
        console.warn('Items fetch warning:', error);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activityId]);

  // تقدم المستخدم (بس لو فيه نشاط)
  useEffect(() => {
    if (!user || !activityId) {
      setProgress({});
      return;
    }

    const progQuery = query(
      collection(db, 'itemProgress'),
      where('uid', '==', user.uid),
      where('activityId', '==', activityId)
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
  }, [user, activityId]);

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
        handleDatabaseError(err, OperationType.WRITE, `itemProgress/${progressDocId}`);
        throw err;
      }
    },
    [user, activityId]
  );

  const toggleWatchStatus = useCallback(
    async (itemId, currentStatus, durationMin = 30) => {
      if (!user || !activityId) return;
      const progressDocId = `${user.uid}_${itemId}`;
      const nextCompleted = !currentStatus;
      const minutes = nextCompleted ? durationMin : 0;

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
        handleDatabaseError(err, OperationType.WRITE, `itemProgress/${progressDocId}`);
        throw err;
      }
    },
    [user, activityId]
  );

  const saveActivityItem = useCallback(
    async (data) => {
      if (!activityId) return;
      try {
        if (data.id) {
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
        handleDatabaseError(err, OperationType.WRITE, `activities/${activityId}/items`);
        throw err;
      }
    },
    [activityId]
  );

  const deleteActivityItem = useCallback(
    async (itemId) => {
      if (!activityId) return;
      try {
        await deleteDoc(doc(db, `activities/${activityId}/items`, itemId));
      } catch (err) {
        handleDatabaseError(err, OperationType.DELETE, `activities/${activityId}/items/${itemId}`);
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
