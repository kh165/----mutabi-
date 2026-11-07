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

export function useAdminNotes(recipientUid) {
  const { user } = useAuth();
  const targetUid = recipientUid === undefined ? user?.uid : recipientUid;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !targetUid) {
      setNotes([]);
      setLoading(false);
      setError(null);
      return;
    }

    const q = query(
      collection(db, 'notes'),
      where('toUid', '==', targetUid)
    );

    setLoading(true);
    setError(null);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
        setNotes(list);
        setLoading(false);
        setError(null);
      },
      (error) => {
        setError(handleDatabaseError(error, OperationType.LIST, 'notes'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, targetUid]);

  const markAsRead = async (noteId) => {
    try {
      await setDoc(doc(db, 'notes', noteId, 'isRead'), true);
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, `notes/${noteId}`);
    }
  };

  const sendNote = async (toUid, text) => {
    if (!user) throw new Error('يجب تسجيل الدخول لإرسال الرسالة');
    const cleanText = text.trim();
    if (!toUid || !cleanText || cleanText.length > 1000) {
      throw new Error('الرسالة مطلوبة ويجب ألا تتجاوز 1000 حرف');
    }
    try {
      const ref = doc(collection(db, 'notes'));
      await setDoc(ref, {
        toUid,
        fromUid: user.uid,
        fromName: user.displayName || 'المشرف',
        text: cleanText,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleDatabaseError(err, OperationType.CREATE, 'notes');
      throw err;
    }
  };

  const replyToNote = async (noteId, text) => {
    if (!user) throw new Error('يجب تسجيل الدخول لإرسال الرد');
    const cleanText = text.trim();
    if (!noteId || !cleanText || cleanText.length > 1000) {
      throw new Error('الرد مطلوب ويجب ألا يتجاوز 1000 حرف');
    }
    try {
      await setDoc(doc(db, 'notes', noteId, 'reply'), {
        fromUid: user.uid,
        fromName: user.displayName || 'مستخدم',
        text: cleanText,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleDatabaseError(err, OperationType.CREATE, `notes/${noteId}/reply`);
      throw err;
    }
  };

  return { notes, loading, error, markAsRead, sendNote, replyToNote };
}
