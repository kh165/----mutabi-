import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from '../firebase.js';
import { db, handleDatabaseError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useLogs(targetUid) {
  const { user } = useAuth();
  const effectiveUid = targetUid || user?.uid;
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(!!effectiveUid);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!effectiveUid) {
      setLogs([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLogs([]);
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'logs'), where('uid', '==', effectiveUid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLogs(items);
        setError(null);
        setLoading(false);
      },
      (error) => {
        handleDatabaseError(error, OperationType.LIST, 'logs');
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveUid]);

  const saveLog = useCallback(
    async (activityId, date, amount, completed, details, note) => {
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
        updatedAt: new Date().toISOString(),
      };

      try {
        const ref = doc(db, 'logs', logId);
        await setDoc(ref, {
          ...logData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return logData;
      } catch (err) {
        handleDatabaseError(err, OperationType.WRITE, `logs/${logId}`);
        throw err;
      }
    },
    [effectiveUid]
  );

  const deleteLog = useCallback(
    async (logId) => {
      try {
        await deleteDoc(doc(db, 'logs', logId));
      } catch (err) {
        handleDatabaseError(err, OperationType.DELETE, `logs/${logId}`);
        throw err;
      }
    },
    [effectiveUid]
  );

  const resetLog = useCallback(
    async (activityId, date) => {
      if (!effectiveUid) return;
      const logId = `${effectiveUid}_${activityId}_${date}`;
      await deleteLog(logId);
    },
    [effectiveUid, deleteLog]
  );

  return { logs, loading, error, saveLog, deleteLog, resetLog };
}
