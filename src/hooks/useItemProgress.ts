import { useEffect, useState } from 'react';
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
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ActivityItem, ItemProgress } from '../types';
import { useAuth } from '../context/AuthContext';

export function useItemProgress(activityId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load items for the activity strictly from Firestore
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
        const list: ActivityItem[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setItems(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `activities/${activityId}/items`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activityId]);

  // Load user watch progress strictly from Firestore
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
        const map: Record<string, boolean> = {};
        snapshot.forEach((d) => {
          const data = d.data() as ItemProgress;
          map[data.itemId] = true;
        });
        setProgress(map);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'itemProgress');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const toggleWatchStatus = async (itemId: string, currentStatus: boolean) => {
    if (!user || !activityId) return;
    const progressDocId = `${user.uid}_${itemId}`;

    try {
      const ref = doc(db, 'itemProgress', progressDocId);
      if (currentStatus) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          uid: user.uid,
          activityId,
          itemId,
          watchedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `itemProgress/${progressDocId}`);
      throw err;
    }
  };

  const saveActivityItem = async (data: Partial<ActivityItem> & { id?: string }) => {
    if (!activityId) return;

    try {
      if (data.id) {
        const ref = doc(db, `activities/${activityId}/items`, data.id);
        await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        const ref = doc(collection(db, `activities/${activityId}/items`));
        await setDoc(ref, {
          ...data,
          activityId,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${activityId}/items`);
      throw err;
    }
  };

  const deleteActivityItem = async (itemId: string) => {
    if (!activityId) return;

    try {
      await deleteDoc(doc(db, `activities/${activityId}/items`, itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `activities/${activityId}/items/${itemId}`);
      throw err;
    }
  };

  return {
    items,
    progress,
    loading,
    toggleWatchStatus,
    saveActivityItem,
    deleteActivityItem,
  };
}
