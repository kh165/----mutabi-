import React, { createContext, useContext, useEffect, useState } from 'react';
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
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

const AuthContext = createContext(undefined);

const ROOT_ADMIN_EMAILS = [
  'khalidsalah948@gmail.com',
  'khalidsalah9444@gmail.com',
];

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
    return cached.user?.email && ROOT_ADMIN_EMAILS.includes(cached.user.email);
  });
  const [loading, setLoading] = useState(!cached.user);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Explicitly enforce persistent auth state
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          localStorage.setItem('mutabi_auth_user', JSON.stringify({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          }));
        } catch {}

        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const adminRef = doc(db, 'admins', currentUser.uid);

          // Check if user is strictly marked as admin in Firestore /admins/{uid}
          try {
            const adminSnap = await getDoc(adminRef);
            if (adminSnap.exists() && adminSnap.data()?.role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            setIsAdmin(false);
          }

          // Fetch or initialize user profile document
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const newDoc = {
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم جديد',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || null,
              timezone: 'Africa/Cairo',
              theme: 'light',
              isDisabled: false,
              createdAt: serverTimestamp(),
              lastActiveAt: serverTimestamp(),
            };
            await setDoc(userRef, newDoc);
            setUserDoc({ ...newDoc, uid: currentUser.uid });
          } else {
            const data = userSnap.data();
            setUserDoc({ ...data, uid: currentUser.uid });
            updateDoc(userRef, { lastActiveAt: serverTimestamp() }).catch(() => {});
          }
        } catch (err) {
          console.warn('Initial profile fetch warning:', err);
          // Set a fallback userDoc from currentUser in case DB is still propagating or offline
          setUserDoc((prev) => prev || {
            displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || null,
            timezone: 'Africa/Cairo',
            theme: 'light',
            isDisabled: false,
            uid: currentUser.uid,
          });
          if (err?.code !== 'unavailable' && !err?.message?.includes('client is offline')) {
            try {
              handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
            } catch (_) {}
          }
        }
      } else {
        setUserDoc(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', cred.user.uid);
      const newDoc = {
        displayName: name.trim() || 'مستخدم جديد',
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
    } catch (err) {
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
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...fields,
        updatedAt: serverTimestamp(),
      });
      setUserDoc((prev) => ({ ...prev, ...fields }));
    } catch (err) {
      console.error('Error updating user doc', err);
      // Fallback local update
      setUserDoc((prev) => ({ ...prev, ...fields }));
      throw err;
    }
  };

  const logout = async () => {
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
