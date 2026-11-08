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
import {
  enqueueOfflineAction,
  removeOfflineAction,
  syncPendingOfflineData,
  getOfflineQueue,
} from '../lib/offlineSync.js';

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

function isRetryableWriteError(error) {
  return (
    !navigator.onLine ||
    ['unavailable', 'deadline-exceeded', 'network-request-failed'].includes(error?.code)
  );
}

// دمج العمليات المعلّقة (أوفلاين) فوق بيانات Firestore حتى لا تختفي من الشاشة
function applyPendingQueue(items, uid) {
  const map = new Map(items.map((l) => [l.id, l]));
  for (const action of getOfflineQueue()) {
    if (action.type === 'SAVE_LOG' && action.data?.uid === uid) {
      map.set(action.logId, { ...(map.get(action.logId) || {}), ...action.data });
    } else if (action.type === 'DELETE_LOG' && String(action.logId || '').startsWith(`${uid}_`)) {
      map.delete(action.logId);
    }
  }
  return [...map.values()];
}

export function useLogs(targetUid) {
  const { user } = useAuth();
  const effectiveUid = targetUid || user?.uid;
  const [logs, setLogs] = useState(() => getLocalLogsCache(effectiveUid));
  const [loading, setLoading] = useState(!getLocalLogsCache(effectiveUid).length);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!effectiveUid) {
      setLogs([]);
      setLoading(false);
      return;
    }

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
        const merged = applyPendingQueue(items, effectiveUid);
        setLogs(merged);
        setLocalLogsCache(effectiveUid, merged);
        setError(null);
        setLoading(false);
      },
      (listenerError) => {
        if (
          listenerError?.code === 'unavailable' ||
          listenerError?.message?.includes('offline') ||
          listenerError?.message?.includes('Failed to get document')
        ) {
          console.info('Working seamlessly in offline mode with cached logs.');
        } else {
          // خطأ حقيقي (غالبًا صلاحيات): نعرضه بدل ما نكمل نعرض بيانات قديمة بصمت
          console.error('Logs listener failed:', listenerError);
          setError(listenerError);
          handleFirestoreError(listenerError, OperationType.LIST, 'logs');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveUid]);

  // مزامنة تلقائية عند رجوع الاتصال
  useEffect(() => {
    const handleOnline = () => {
      syncPendingOfflineData();
    };
    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      syncPendingOfflineData();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const saveLog = useCallback(
    async (activityId, date, amount, completed, details, note) => {
      if (!effectiveUid) return;
      const logId = `${effectiveUid}_${activityId}_${date}`;
      const previousLog = logs.find((log) => log.id === logId);
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

      // 1) تحديث فوري للواجهة والكاش
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

      // 2) الكتابة في Firestore أو الوضع في الطابور لو أوفلاين
      if (!navigator.onLine) {
        enqueueOfflineAction({
          type: 'SAVE_LOG',
          key: `LOG_${logId}`,
          logId,
          data: logData,
        });
        return logData;
      }

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
        removeOfflineAction(`LOG_${logId}`);
        return logData;
      } catch (err) {
        if (isRetryableWriteError(err)) {
          console.warn('Could not confirm log sync; queued for retry:', err);
          enqueueOfflineAction({
            type: 'SAVE_LOG',
            key: `LOG_${logId}`,
            logId,
            data: logData,
          });
          return logData;
        }

        setLogs((current) => {
          const restored = previousLog
            ? current.map((log) => (log.id === logId ? previousLog : log))
            : current.filter((log) => log.id !== logId);
          setLocalLogsCache(effectiveUid, restored);
          return restored;
        });
        throw handleFirestoreError(err, OperationType.WRITE, `logs/${logId}`);
      }
    },
    [effectiveUid, logs]
  );

  const deleteLog = useCallback(
    async (logId) => {
      const previousLog = logs.find((log) => log.id === logId);
      setLogs((prev) => {
        const updated = prev.filter((l) => l.id !== logId);
        setLocalLogsCache(effectiveUid, updated);
        return updated;
      });

      if (!navigator.onLine) {
        enqueueOfflineAction({
          type: 'DELETE_LOG',
          key: `LOG_${logId}`,
          logId,
        });
        return;
      }

      try {
        await deleteDoc(doc(db, 'logs', logId));
        removeOfflineAction(`LOG_${logId}`);
      } catch (err) {
        if (isRetryableWriteError(err)) {
          console.warn('Could not confirm log deletion; queued for retry:', err);
          enqueueOfflineAction({
            type: 'DELETE_LOG',
            key: `LOG_${logId}`,
            logId,
          });
          return;
        }

        if (previousLog) {
          setLogs((current) => {
            const restored = [...current.filter((log) => log.id !== logId), previousLog];
            setLocalLogsCache(effectiveUid, restored);
            return restored;
          });
        }
        throw handleFirestoreError(err, OperationType.DELETE, `logs/${logId}`);
      }
    },
    [effectiveUid, logs]
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