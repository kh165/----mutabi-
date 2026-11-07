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
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

function getLocalLogsCache(uid) {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(`mutabi_logs_cache_${uid}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalLogsCache(uid, items) {
  if (!uid) return;
  try {
    localStorage.setItem(`mutabi_logs_cache_${uid}`, JSON.stringify(items));
  } catch {}
}

export function useLogs(targetUid) {
  const { user } = useAuth();
  const effectiveUid = targetUid || user?.uid;
  const [logs, setLogs] = useState(() => getLocalLogsCache(effectiveUid));
  const [loading, setLoading] = useState(!getLocalLogsCache(effectiveUid).length);

  useEffect(() => {
    if (!effectiveUid) {
      setLogs([]);
      setLoading(false);
      return;
    }

    // Pre-populate from local cache immediately
    const cached = getLocalLogsCache(effectiveUid);
    if (cached.length > 0) {
      setLogs(cached);
      setLoading(false);
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
        setLocalLogsCache(effectiveUid, items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'logs');
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

      // 1. Instant Optimistic State & Local Cache Update (0ms delay)
      setLogs((prev) => {
        const existingIdx = prev.findIndex((l) => l.id === logId);
        let updated;
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...logData };
        } else {
          updated = [logData, ...prev];
        }
        setLocalLogsCache(effectiveUid, updated);
        return updated;
      });

      // 2. Persist to Firestore asynchronously
      try {
        const ref = doc(db, 'logs', logId);
        await setDoc(
          ref,
          {
            ...logData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        return logData;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `logs/${logId}`);
        throw err;
      }
    },
    [effectiveUid]
  );

  const deleteLog = useCallback(
    async (logId) => {
      // 1. Optimistic delete
      setLogs((prev) => {
        const updated = prev.filter((l) => l.id !== logId);
        setLocalLogsCache(effectiveUid, updated);
        return updated;
      });

      // 2. Delete from Firestore
      try {
        await deleteDoc(doc(db, 'logs', logId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `logs/${logId}`);
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

  return { logs, loading, saveLog, deleteLog, resetLog };
}
