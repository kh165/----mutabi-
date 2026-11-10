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
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { enqueueOfflineAction, getOfflineQueue } from '../lib/offlineSync.js';

function isRetryableWriteError(error) {
  return (
    !navigator.onLine ||
    ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(error?.code)
  );
}

export function useAdminNotes(conversationUid = null) {
  const { user, isAdmin } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }

    const toUid = isAdmin ? conversationUid || user.uid : user.uid;
    if (!toUid) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const q = query(
      collection(db, 'notes'),
      where('toUid', '==', toUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        const pendingReads = new Set(
          getOfflineQueue()
            .filter((action) => action.type === 'MARK_NOTE_READ' && action.uid === user.uid)
            .map((action) => action.noteId)
        );
        snapshot.forEach((d) =>
          list.push({
            id: d.id,
            ...d.data(),
            isRead: d.data().isRead || pendingReads.has(d.id),
          })
        );
        list.sort(
          (a, b) =>
            (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
        );
        setNotes(list);
        setError(null);
        setLoading(false);
      },
      (listenerError) => {
        setError(listenerError);
        handleFirestoreError(listenerError, OperationType.LIST, 'notes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isAdmin, conversationUid]);

  const markAsRead = async (noteId) => {
    if (!user?.uid) throw new Error('You must be signed in to mark a note as read.');
    const note = notes.find((item) => item.id === noteId);
    if (!note || note.isRead) return;

    setNotes((current) =>
      current.map((item) => (item.id === noteId ? { ...item, isRead: true } : item))
    );

    const queueRead = () =>
      enqueueOfflineAction({
        type: 'MARK_NOTE_READ',
        key: `NOTE_READ_${noteId}`,
        noteId,
        uid: user.uid,
      });

    if (!navigator.onLine) {
      queueRead();
      return;
    }

    try {
      const ref = doc(db, 'notes', noteId);
      await updateDoc(ref, { isRead: true });
      setError(null);
    } catch (err) {
      if (isRetryableWriteError(err)) {
        queueRead();
        return;
      }
      setNotes((current) =>
        current.map((item) => (item.id === noteId ? { ...item, isRead: false } : item))
      );
      setError(err);
      handleFirestoreError(err, OperationType.UPDATE, `notes/${noteId}`);
      throw err;
    }
  };

  const sendNote = async (toUid, text) => {
    if (!user) throw new Error('You must be signed in to send a note.');
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
      setError(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'notes');
      throw err;
    }
  };

  const replyToNote = async (noteId, text) => {
    if (!user || isAdmin) throw new Error('Only the note recipient can reply.');
    const trimmedText = text.trim();
    if (!trimmedText || trimmedText.length > 1000) {
      throw new Error('The reply must contain 1 to 1000 characters.');
    }
    try {
      await updateDoc(doc(db, 'notes', noteId), {
        reply: {
          fromUid: user.uid,
          fromName: user.displayName || 'المستخدم',
          text: trimmedText,
          createdAt: serverTimestamp(),
        },
      });
      setError(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notes/${noteId}`);
      throw err;
    }
  };

  return { notes, loading, error, markAsRead, sendNote, replyToNote };
}
