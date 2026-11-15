import { useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { normalizeHadithId } from '../lib/hadithProgressId.js';

function progressDocId(collectionId, hadithId) {
  return encodeURIComponent(`${collectionId}:${hadithId}`);
}

function mapsFromEntries(entries) {
  const read = {};
  const bookmarked = {};
  entries.forEach((entry) => {
    if (entry?.hadithId == null) return;
    const hadithId = normalizeHadithId(entry.hadithId);
    if (entry.read === true) read[hadithId] = true;
    if (entry.bookmarked === true) bookmarked[hadithId] = true;
  });
  return { read, bookmarked };
}

function legacyEntries(legacyProgress = {}) {
  const read = legacyProgress.read || {};
  const bookmarked = legacyProgress.bookmarked || {};
  const ids = new Set([...Object.keys(read), ...Object.keys(bookmarked)]);
  return [...ids].map((hadithId) => {
    const collectionId = hadithId.startsWith('bukhari_')
      ? 'bukhari'
      : hadithId.startsWith('muslim_')
        ? 'muslim'
        : 'nawawi';
    return {
      hadithId,
      collectionId,
      read: read[hadithId] === true,
      bookmarked: bookmarked[hadithId] === true,
    };
  });
}

export function useHadithProgress(uid, legacyProgress) {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const migrationAttempted = useRef(false);

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoaded(true);
      setSyncError(null);
      return undefined;
    }

    setLoaded(false);
    setSyncError(null);
    const progressRef = collection(db, 'users', uid, 'hadithProgress');
    const unsubscribe = onSnapshot(
      progressRef,
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
          .filter((entry) => {
            const data = /** @type {any} */ (entry);
            return data.hadithId && data.collectionId;
          });
        setEntries(nextEntries);
        setSyncError(null);
        setLoaded(true);
      },
      (error) => {
        console.error('Failed to load hadith progress:', error);
        setSyncError(error);
        setLoaded(true);
      }
    );
    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    if (!uid || !loaded || syncError || migrationAttempted.current || entries.length > 0) return;
    const oldEntries = legacyEntries(legacyProgress);
    if (!oldEntries.length) return;
    migrationAttempted.current = true;

    const batch = writeBatch(db);
    oldEntries.slice(0, 450).forEach((entry) => {
      const ref = doc(db, 'users', uid, 'hadithProgress', progressDocId(entry.collectionId, entry.hadithId));
      batch.set(ref, {
        uid,
        hadithId: entry.hadithId,
        collectionId: entry.collectionId,
        read: entry.read,
        bookmarked: entry.bookmarked,
        updatedAt: serverTimestamp(),
      });
    });
    batch.commit().catch((error) => {
      console.error('Failed to migrate legacy hadith progress:', error);
      setSyncError(error);
    });
  }, [uid, loaded, syncError, entries.length, legacyProgress]);

  const maps = mapsFromEntries(entries);
  const legacyMaps = mapsFromEntries(legacyEntries(legacyProgress));

  const setHadithProgress = async (collectionId, hadithId, values) => {
    hadithId = normalizeHadithId(hadithId);
    if (!uid) {
      throw new Error('يجب تسجيل الدخول لحفظ تقدم الأحاديث.');
    }
    const ref = doc(db, 'users', uid, 'hadithProgress', progressDocId(collectionId, hadithId));
    const next = {
      uid,
      hadithId,
      collectionId,
      read: values.read === true,
      bookmarked: values.bookmarked === true,
      updatedAt: serverTimestamp(),
    };
    const previousEntry = entries.find((entry) => entry.id === ref.id) || null;
    const optimisticEntry = {
      ...next,
      id: ref.id,
      updatedAt: new Date().toISOString(),
    };
    setEntries((current) => {
      const remaining = current.filter((entry) => entry.id !== ref.id);
      return next.read || next.bookmarked ? [...remaining, optimisticEntry] : remaining;
    });
    try {
      if (!next.read && !next.bookmarked) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, next, { merge: true });
      }
      setSyncError(null);
    } catch (error) {
      setEntries((current) => {
        const remaining = current.filter((entry) => entry.id !== ref.id);
        return previousEntry ? [...remaining, previousEntry] : remaining;
      });
      setSyncError(error);
      throw error;
    }
  };

  return {
    readMap: { ...legacyMaps.read, ...maps.read },
    bookmarkedMap: { ...legacyMaps.bookmarked, ...maps.bookmarked },
    syncError,
    setHadithProgress,
  };
}
    
