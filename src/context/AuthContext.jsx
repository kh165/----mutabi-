import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  enqueueOfflineAction,
  removeOfflineAction,
} from '../lib/offlineSync.js';
import { settleOrTimeout, withTimeout } from '../lib/async.js';

const AuthContext = createContext(undefined);

const ROOT_ADMIN_EMAILS = [
  'khalidsalah948@gmail.com',
  'khalidsalah9444@gmail.com',
  'khalid.niletechno@gmail.com',
];

const isRootAdminEmail = (email) =>
  Boolean(email) &&
  ROOT_ADMIN_EMAILS.includes(String(email).trim().toLowerCase());

const adminCacheKey = (uid) => `mutabi_is_admin_${uid}`;

function readAdminCache(uid) {
  try {
    return localStorage.getItem(adminCacheKey(uid)) === '1';
  } catch {
    return false;
  }
}

function writeAdminCache(uid, value) {
  try {
    localStorage.setItem(adminCacheKey(uid), value ? '1' : '0');
  } catch {}
}

function getCachedAuth() {
  try {
    const raw = localStorage.getItem('mutabi_auth_user');
    const rawDoc = localStorage.getItem('mutabi_auth_userdoc');
    if (raw) {
      return {
        user: JSON.parse(raw),
        userDoc: rawDoc ? JSON.parse(rawDoc) : null,
      };
    }
  } catch {}
  return { user: null, userDoc: null };
}

function isOfflineLikeError(err) {
  const msg = err?.message || '';
  return (
    !navigator.onLine ||
    err?.code === 'timeout' ||
    err?.code === 'unavailable' ||
    err?.code === 'deadline-exceeded' ||
    err?.code === 'failed-precondition' ||
    msg.includes('offline') ||
    msg.includes('Failed to fetch') ||
    msg.includes('network-request-failed') ||
    msg.includes('IndexedDB') ||
    msg.includes('indexedDB')
  );
}

export function AuthProvider({ children }) {
  const cached = getCachedAuth();
  const [user, setUser] = useState(cached.user);
  const [userDoc, setUserDoc] = useState(cached.userDoc);
  const [isAdmin, setIsAdmin] = useState(() => {
    return (
      isRootAdminEmail(cached.user?.email) ||
      (cached.user?.uid ? readAdminCache(cached.user.uid) : false)
    );
  });
  // لو عندنا مستخدم محفوظ نفتح التطبيق فوراً بدون انتظار Firebase
  const [loading, setLoading] = useState(!cached.user);
  const [error, setError] = useState(null);
  const [profileSyncError, setProfileSyncError] = useState(null);
  const pendingNameRef = useRef(null);
  const userDocUnsubRef = useRef(null);
  const activeUidRef = useRef(cached.user?.uid || null);

  const stopUserDocListener = () => {
    if (userDocUnsubRef.current) {
      userDocUnsubRef.current();
      userDocUnsubRef.current = null;
    }
  };

  const startUserDocListener = (uid) => {
    stopUserDocListener();
    userDocUnsubRef.current = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = { ...snap.data(), uid };
        setUserDoc(data);
        try {
          localStorage.setItem('mutabi_auth_userdoc', JSON.stringify(data));
        } catch {}
      },
      (listenerError) => {
        console.warn('User profile listener error:', listenerError);
      }
    );
  };

  useEffect(() => {
    let cancelled = false;
    let unsubscribe;
    let resolved = false;

    const fallbackUserDoc = (u) => ({
      displayName: u.displayName || u.email?.split('@')[0] || 'مستخدم',
      email: u.email || '',
      photoURL: u.photoURL || null,
      timezone: 'Africa/Cairo',
      theme: 'light',
      isDisabled: false,
      uid: u.uid,
    });

    const loadProfile = async (currentUser, rootAdmin) => {
      const stillCurrent = () => !cancelled && activeUidRef.current === currentUser.uid;

      // الاستماع الحي يبدأ فوراً: يقرأ من الكاش المحلي حتى بدون نت
      if (stillCurrent()) startUserDocListener(currentUser.uid);

      // أوفلاين: لا نحاول أي قراءة من الشبكة
      if (!navigator.onLine) return;

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const adminRef = doc(db, 'admins', currentUser.uid);

        try {
          const adminSnap = await withTimeout(getDoc(adminRef), 6000);
          const adminValue = rootAdmin || adminSnap.exists();
          writeAdminCache(currentUser.uid, adminValue);
          if (stillCurrent()) setIsAdmin(adminValue);
        } catch (adminError) {
          if (stillCurrent()) {
            setIsAdmin(rootAdmin || readAdminCache(currentUser.uid));
          }
          if (!isOfflineLikeError(adminError)) {
            console.error('Failed to check the administrator profile:', adminError);
          }
        }

        const userSnap = await withTimeout(getDoc(userRef), 8000);
        if (!stillCurrent()) return;
        if (!userSnap.exists()) {
          const newDoc = {
            displayName:
              currentUser.displayName ||
              pendingNameRef.current ||
              currentUser.email?.split('@')[0] ||
              'مستخدم جديد',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || null,
            timezone: 'Africa/Cairo',
            theme: 'light',
            isDisabled: false,
            createdAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
          };
          await setDoc(userRef, newDoc);
          if (stillCurrent()) setUserDoc({ ...newDoc, uid: currentUser.uid });
          pendingNameRef.current = null;
        } else {
          const data = userSnap.data();
          setUserDoc({ ...data, uid: currentUser.uid });
          updateDoc(userRef, { lastActiveAt: serverTimestamp() }).catch(() => {});
        }
      } catch (err) {
        console.warn('Initial profile fetch warning:', err);
        if (!stillCurrent()) return;
        setUserDoc((prev) => prev || fallbackUserDoc(currentUser));
        // نعرض شاشة الخطأ فقط لو القواعد رفضت فعلاً، مش لأي مشكلة اتصال
        if (err?.code === 'permission-denied') {
          setProfileSyncError(err);
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      }
    };

    const applySession = (currentUser, isRealFirebaseUser) => {
      resolved = true;
      activeUidRef.current = currentUser.uid;
      setUser(currentUser);
      setProfileSyncError(null);

      const rootAdmin = isRootAdminEmail(currentUser.email);
      setIsAdmin(rootAdmin || readAdminCache(currentUser.uid));

      try {
        localStorage.setItem(
          'mutabi_auth_user',
          JSON.stringify({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          })
        );
      } catch {}

      const initialCached = getCachedAuth().userDoc;
      setUserDoc(
        (prev) =>
          prev ||
          (initialCached?.uid === currentUser.uid ? initialCached : null) ||
          fallbackUserDoc(currentUser)
      );
      setLoading(false);
      void loadProfile(currentUser, rootAdmin);
    };

    // شبكة أمان: لو Firebase Auth اتأخر (مشكلة معروفة في iOS) نستخدم الجلسة المحفوظة
    const safetyTimer = setTimeout(() => {
      if (resolved || cancelled) return;
      const cachedUser = getCachedAuth().user;
      if (cachedUser) {
        applySession(cachedUser, false);
      } else {
        setLoading(false);
      }
    }, 3500);

    unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (cancelled) return;
      clearTimeout(safetyTimer);
      stopUserDocListener();

      if (currentUser) {
        applySession(currentUser, true);
        return;
      }

      // Firebase رجّع null: لو أوفلاين ومعانا جلسة محفوظة نكمل بها بدل تسجيل الخروج
      const cachedUser = getCachedAuth().user;
      if (cachedUser && !navigator.onLine) {
        applySession(cachedUser, false);
        return;
      }

      resolved = true;
      activeUidRef.current = null;
      setUser(null);
      setUserDoc(null);
      setIsAdmin(false);
      setProfileSyncError(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      stopUserDocListener();
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        setError(
          'هذا النطاق غير مصرح له في مشروع Firebase بعد. يرجى إضافة هذا الرابط في Firebase Console > Authentication > Settings > Authorized domains'
        );
      } else if (msg.includes('popup-closed-by-user')) {
        setError('تم إغلاق نافذة الدخول قبل إتمامها');
      } else {
        setError('تعذر تسجيل الدخول عبر Google، يرجى المحاولة مرة أخرى');
      }
      throw err;
    }
  };

  const signInWithEmail = async (email, pass) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (err.code === 'auth/network-request-failed') {
        setError('لا يوجد اتصال بالإنترنت. تسجيل الدخول لأول مرة يحتاج إنترنت.');
      } else {
        setError('تعذر تسجيل الدخول، يرجى التحقق من البيانات المدخلة');
      }
      throw err;
    }
  };

  const registerWithEmail = async (name, email, pass) => {
    setError(null);
    const displayName = name.trim() || 'مستخدم جديد';
    pendingNameRef.current = displayName;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      try {
        await updateProfile(cred.user, { displayName });
      } catch (profileError) {
        console.error('Failed to update the Firebase account display name:', profileError);
      }
      const userRef = doc(db, 'users', cred.user.uid);
      const newDoc = {
        displayName,
        email,
        photoURL: null,
        timezone: 'Africa/Cairo',
        theme: 'light',
        isDisabled: false,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
      };
      await setDoc(userRef, newDoc);
      setUserDoc({ ...newDoc, uid: cred.user.uid });
      pendingNameRef.current = null;
    } catch (err) {
      if (!auth.currentUser) pendingNameRef.current = null;
      if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة (يجب أن تتكون من 6 خانات على الأقل)');
      } else {
        setError('تعذر إنشاء الحساب، يرجى المحاولة مجددًا');
      }
      throw err;
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError('تعذر إرسال رابط استعادة كلمة المرور، يرجى التأكد من البريد');
      throw err;
    }
  };

  const updateUserDoc = async (fields) => {
    if (!user) return;
    const previousUserDoc = userDoc;
    const applyLocalUpdate = () => {
      setUserDoc((prev) => {
        const updated = { ...(prev || {}), ...fields, uid: user.uid };
        try {
          localStorage.setItem('mutabi_auth_userdoc', JSON.stringify(updated));
        } catch (cacheError) {
          console.warn('Could not cache the updated user profile:', cacheError);
        }
        return updated;
      });
    };

    // التحديث المحلي فوري دائماً
    applyLocalUpdate();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction({
        type: 'UPDATE_USER',
        key: `USER_${user.uid}`,
        uid: user.uid,
        fields,
      });
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const result = await settleOrTimeout(
        setDoc(userRef, { ...fields, updatedAt: serverTimestamp() }, { merge: true }),
        5000
      );
      if (result === 'pending') {
        // الشبكة معلّقة: Firestore حافظها محلياً، ونحط نسخة احتياطية في الطابور
        enqueueOfflineAction({
          type: 'UPDATE_USER',
          key: `USER_${user.uid}`,
          uid: user.uid,
          fields,
        });
      } else {
        removeOfflineAction(`USER_${user.uid}`);
      }
    } catch (err) {
      console.error('Failed to sync the user profile to Firestore:', err);
      if (isOfflineLikeError(err)) {
        enqueueOfflineAction({
          type: 'UPDATE_USER',
          key: `USER_${user.uid}`,
          uid: user.uid,
          fields,
        });
        return;
      }
      setUserDoc(previousUserDoc);
      try {
        if (previousUserDoc) {
          localStorage.setItem('mutabi_auth_userdoc', JSON.stringify(previousUserDoc));
        } else {
          localStorage.removeItem('mutabi_auth_userdoc');
        }
      } catch (cacheError) {
        console.warn('Could not restore the previous cached profile:', cacheError);
      }
      throw err;
    }
  };

  const logout = async () => {
    stopUserDocListener();
    try {
      localStorage.removeItem('mutabi_auth_user');
      localStorage.removeItem('mutabi_auth_userdoc');
    } catch {}
    activeUidRef.current = null;
    try {
      await fbSignOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setUser(null);
    setUserDoc(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        isAdmin,
        loading,
        error,
        profileSyncError,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        updateUserDoc,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}