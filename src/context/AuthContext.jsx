import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  setPersistence,
  browserLocalPersistence,
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

const AuthContext = createContext(undefined);

const ROOT_ADMIN_EMAILS = [
  'khalidsalah948@gmail.com',
  'khalidsalah9444@gmail.com',
  'khalid.niletechno@gmail.com',
];

const isRootAdminEmail = (email) =>
  Boolean(email) &&
  ROOT_ADMIN_EMAILS.includes(String(email).trim().toLowerCase());

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

export function AuthProvider({ children }) {
  const cached = getCachedAuth();
  const [user, setUser] = useState(cached.user);
  const [userDoc, setUserDoc] = useState(cached.userDoc);
  const [isAdmin, setIsAdmin] = useState(() => {
    return isRootAdminEmail(cached.user?.email);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileSyncError, setProfileSyncError] = useState(null);
  const pendingNameRef = useRef(null);
  const userDocUnsubRef = useRef(null);

  const stopUserDocListener = () => {
    if (userDocUnsubRef.current) {
      userDocUnsubRef.current();
      userDocUnsubRef.current = null;
    }
  };

  // مزامنة حيّة لملف المستخدم: أي تغيير في Firestore يظهر في الموقع فورًا
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

    // جلب/إنشاء ملف المستخدم في الخلفية بدون تعليق الواجهة
    const loadProfile = async (currentUser, rootAdmin) => {
      const stillCurrent = () => !cancelled && auth.currentUser?.uid === currentUser.uid;
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const adminRef = doc(db, 'admins', currentUser.uid);

        try {
          const adminSnap = await getDoc(adminRef);
          if (stillCurrent()) setIsAdmin(rootAdmin || adminSnap.exists());
        } catch (adminError) {
          console.error('Failed to check the administrator profile:', adminError);
          if (stillCurrent()) setIsAdmin(rootAdmin);
        }

        const userSnap = await getDoc(userRef);
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
          updateDoc(userRef, { lastActiveAt: serverTimestamp() }).catch((updateError) => {
            console.warn('Could not update the last-active timestamp:', updateError);
          });
        }
      } catch (err) {
        console.warn('Initial profile fetch warning:', err);
        if (!stillCurrent()) return;
        const isOfflineError =
          err?.code === 'unavailable' ||
          err?.code === 'deadline-exceeded' ||
          err?.message?.includes('client is offline');
        if (!isOfflineError) setProfileSyncError(err);
        setUserDoc((prev) => prev || {
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || null,
          timezone: 'Africa/Cairo',
          theme: 'light',
          isDisabled: false,
          uid: currentUser.uid,
        });
        if (!isOfflineError) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      }

      // نبدأ المزامنة الحيّة حتى لو فشل الجلب الأولي (مثلاً أوفلاين)
      if (stillCurrent()) startUserDocListener(currentUser.uid);
    };

    const initializeAuthState = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistenceError) {
        console.error('Could not confirm persistent Firebase authentication:', persistenceError);
      }

      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        stopUserDocListener();
        setUser(currentUser);
        if (currentUser) {
          setProfileSyncError(null);
          const rootAdmin = isRootAdminEmail(currentUser.email);
          setIsAdmin(rootAdmin);
          try {
            localStorage.setItem('mutabi_auth_user', JSON.stringify({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
            }));
          } catch {}

          // الواجهة تفتح فورًا، وبيانات الملف تتحمّل في الخلفية
          setUserDoc((prev) => prev || {
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || null,
            timezone: 'Africa/Cairo',
            theme: 'light',
            isDisabled: false,
            uid: currentUser.uid,
          });
          setLoading(false);
          void loadProfile(currentUser, rootAdmin);
        } else {
          setUserDoc(null);
          setIsAdmin(false);
          setProfileSyncError(null);
          setLoading(false);
        }
      });
    };

    void initializeAuthState();
    return () => {
      cancelled = true;
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

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      applyLocalUpdate();
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
      await setDoc(
        userRef,
        {
          ...fields,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      applyLocalUpdate();
      removeOfflineAction(`USER_${user.uid}`);
    } catch (err) {
      console.error('Failed to sync the user profile to Firestore:', err);
      throw err;
    }
  };

  const logout = async () => {
    stopUserDocListener();
    try {
      localStorage.removeItem('mutabi_auth_user');
      localStorage.removeItem('mutabi_auth_userdoc');
    } catch {}
    await fbSignOut(auth);
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