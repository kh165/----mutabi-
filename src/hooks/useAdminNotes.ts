import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AdminNote } from '../types';
import { useAuth } from '../context/AuthContext';

export function useAdminNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notes'),
      where('toUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AdminNote[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setNotes(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (noteId: string) => {
    try {
      const ref = doc(db, 'notes', noteId);
      await updateDoc(ref, { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const sendNote = async (toUid: string, text: string) => {
    if (!user) return;

    try {
      const ref = doc(collection(db, 'notes'));
      await setDoc(ref, {
        toUid,
        fromUid: user.uid,
        fromName: user.displayName || 'المشرف',
        text: text.trim(),
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notes');
      throw err;
    }
  };

  return { notes, loading, markAsRead, sendNote };
}
