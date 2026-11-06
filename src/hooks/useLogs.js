import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useLogs(targetUid) {
  const { user } = useAuth();
  const effectiveUid = targetUid || user?.uid;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectiveUid) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'logs'), where('uid', '==', effectiveUid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLogs(items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'logs');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveUid]);

  const saveLog = async (
    activityId,
    date,
    amount,
    completed,
    details,
    note
  ) => {
    if (!effectiveUid) return;
    const logId = `${effectiveUid}_${activityId}_${date}`;
    const logData = {
      id: logId,
      uid: effectiveUid,
      activityId,
      date,
      amount: Math.max(0, amount),
      completed,
      details: details || {},
      note: note || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const ref = doc(db, 'logs', logId);
      await setDoc(ref, logData, { merge: true });
      return logData;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `logs/${logId}`);
      throw err;
    }
  };

  const deleteLog = async (logId) => {
    try {
      await deleteDoc(doc(db, 'logs', logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `logs/${logId}`);
      throw err;
    }
  };

  const resetLog = async (activityId, date) => {
    if (!effectiveUid) return;
    const logId = `${effectiveUid}_${activityId}_${date}`;
    await deleteLog(logId);
  };

  return { logs, loading, saveLog, deleteLog, resetLog };
}
