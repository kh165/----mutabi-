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

function progressDocId(collectionId, hadithId) {
  return encodeURIComponent(`${collectionId}:${hadithId}`);
}

function mapsFromEntries(entries) {
  const read = {};
  const bookmarked = {};
  entries.forEach((entry) => {
    if (!entry?.hadithId) return;
    if (entry.read === true) read[entry.hadithId] = true;
    if (entry.bookmarked === true) bookmarked[entry.hadithId] = true;
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
  const migrationAttempted = useRef(false);

  useEffect(() => {
    if (!uid) {
      setEntries([]);
      setLoaded(true);
      return undefined;
    }

    setLoaded(false);
    const progressRef = collection(db, 'users', uid, 'hadithProgress');
    const unsubscribe = onSnapshot(
      progressRef,
      (snapshot) => {
        const nextEntries = snapshot.docs
          .map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() }))
          .filter((entry) => entry.hadithId && entry.collectionId);
        setEntries(nextEntries);
        setLoaded(true);
      },
      () => setLoaded(true)
    );
    return () => unsubscribe();
  }, [uid]);

  useEffect(() => {
    if (!uid || !loaded || migrationAttempted.current || entries.length > 0) return;
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
    batch.commit().catch(() => {});
  }, [uid, loaded, entries.length, legacyProgress]);

  const maps = mapsFromEntries(entries);
  const legacyMaps = mapsFromEntries(legacyEntries(legacyProgress));

  const setHadithProgress = async (collectionId, hadithId, values) => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'hadithProgress', progressDocId(collectionId, hadithId));
    const next = {
      uid,
      hadithId,
      collectionId,
      read: values.read === true,
      bookmarked: values.bookmarked === true,
      updatedAt: serverTimestamp(),
    };
    if (!next.read && !next.bookmarked) {
      await deleteDoc(ref);
      return;
    }
    await setDoc(ref, next, { merge: true });
  };

  return {
    readMap: { ...legacyMaps.read, ...maps.read },
    bookmarkedMap: { ...legacyMaps.bookmarked, ...maps.bookmarked },
    setHadithProgress,
  };
}
    