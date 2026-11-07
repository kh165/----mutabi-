import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getDatabase,
  ref as databaseRef,
  push,
  get,
  set,
  update,
  remove,
  onValue,
  query as databaseQuery,
  orderByChild,
  equalTo,
  serverTimestamp,
} from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app, firebaseConfig.databaseURL);
export const auth = getAuth(app);

const makeRef = (path) => ({
  path,
  id: path.split('/').pop(),
  _databaseRef: databaseRef(db, path),
});

const pathFor = (parent, child) =>
  [parent?.path, child].filter(Boolean).join('/').replace(/^\/+|\/+$/g, '');

export function collection(database, path) {
  if (database !== db) throw new Error('Unsupported Realtime Database instance.');
  return { path: path.replace(/^\/+|\/+$/g, ''), _databaseRef: databaseRef(db, path) };
}

export function doc(parent, ...segments) {
  if (parent === db) {
    return makeRef(segments.filter(Boolean).join('/'));
  }

  if (segments.length === 0) {
    const newRef = push(parent._databaseRef);
    return makeRef(pathFor(parent, newRef.key));
  }

  return makeRef(pathFor(parent, segments.filter(Boolean).join('/')));
}

export function where(field, operator, value) {
  if (operator !== '==') {
    throw new Error(`Realtime Database adapter does not support the "${operator}" operator.`);
  }
  return { type: 'where', field, value };
}

export function orderBy(field, direction = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function query(reference, ...constraints) {
  return { path: reference.path, _databaseRef: reference._databaseRef, constraints };
}

const getQueryRef = (source) => {
  const constraints = source.constraints || [];
  const equality = constraints.find((constraint) => constraint.type === 'where');
  const ordering = constraints.find((constraint) => constraint.type === 'orderBy');

  if (equality) {
    return databaseQuery(source._databaseRef, orderByChild(equality.field), equalTo(equality.value));
  }
  if (ordering) {
    return databaseQuery(source._databaseRef, orderByChild(ordering.field));
  }
  return source._databaseRef;
};

const readEntries = (snapshot, source) => {
  const value = snapshot.val();
  if (!value || typeof value !== 'object') return [];

  let entries = Object.entries(value).map(([id, data]) => ({
    id,
    data: data && typeof data === 'object' ? data : { value: data },
  }));
  const constraints = source.constraints || [];

  for (const constraint of constraints) {
    if (constraint.type === 'where') {
      entries = entries.filter(({ data }) => data[constraint.field] === constraint.value);
    }
  }

  const ordering = constraints.find((constraint) => constraint.type === 'orderBy');
  if (ordering) {
    const direction = ordering.direction === 'desc' ? -1 : 1;
    entries.sort((a, b) => {
      const left = a.data[ordering.field];
      const right = b.data[ordering.field];
      if (left === right) return 0;
      if (left === undefined || left === null) return -direction;
      if (right === undefined || right === null) return direction;
      return (left < right ? -1 : 1) * direction;
    });
  }

  return entries;
};

const makeDocumentSnapshot = (id, value) => ({
  id,
  exists: () => value !== null && value !== undefined,
  data: () => value,
});

const makeQuerySnapshot = (snapshot, source) => {
  const docs = readEntries(snapshot, source).map(({ id, data }) => makeDocumentSnapshot(id, data));
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
    forEach: (callback) => docs.forEach(callback),
  };
};

export function onSnapshot(source, onNext, onError) {
  if (!Array.isArray(source.constraints)) {
    return onValue(
      source._databaseRef,
      (snapshot) => onNext(makeDocumentSnapshot(snapshot.key, snapshot.val())),
      onError
    );
  }

  return onValue(
    getQueryRef(source),
    (snapshot) => onNext(makeQuerySnapshot(snapshot, source)),
    onError
  );
}

export async function getDocs(source) {
  const snapshot = await get(getQueryRef(source));
  return makeQuerySnapshot(snapshot, source);
}

export async function getDoc(reference) {
  const snapshot = await get(reference._databaseRef);
  return makeDocumentSnapshot(snapshot.key, snapshot.val());
}

export function setDoc(reference, value, options = {}) {
  return options.merge
    ? update(reference._databaseRef, value)
    : set(reference._databaseRef, value);
}

export function updateDoc(reference, value) {
  return update(reference._databaseRef, value);
}

export function deleteDoc(reference) {
  return remove(reference._databaseRef);
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleDatabaseError(error, operationType, path) {
  console.error('Realtime Database operation failed:', {
    operationType,
    path,
    code: error?.code,
    message: error instanceof Error ? error.message : String(error),
  });
  return error instanceof Error ? error : new Error(String(error));
}

export const isDatabasePermissionError = (error) =>
  error?.code === 'PERMISSION_DENIED' ||
  error?.code === 'permission-denied' ||
  error?.code?.endsWith('/permission-denied') ||
  /permission denied/i.test(error?.message || '');

export { serverTimestamp };
