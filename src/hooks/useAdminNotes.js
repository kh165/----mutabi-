import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
} from '../firebase.js';
import { db, handleDatabaseError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useAdminNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
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
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setNotes(list);
        setLoading(false);
      },
      (error) => {
        handleDatabaseError(error, OperationType.LIST, 'notes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (noteId) => {
    try {
      await setDoc(doc(db, 'notes', noteId, 'isRead'), true);
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const sendNote = async (toUid, text) => {
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
      handleDatabaseError(err, OperationType.CREATE, 'notes');
      throw err;
    }
  };

  return { notes, loading, markAsRead, sendNote };
}
