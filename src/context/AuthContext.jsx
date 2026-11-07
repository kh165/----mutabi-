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
  serverTimestamp,
} from '../firebase.js';
import { auth, db } from '../firebase.js';

const AuthContext = createContext(undefined);

export const ROOT_ADMIN_EMAILS = [
  'khalid.niletechno@gmail.com',
  'khalidsalah948@gmail.com',
  'khalidsalah9444@gmail.com',
];

export const isRootAdminEmail = (email) =>
  !!email && ROOT_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === String(email).trim().toLowerCase());

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);
  const [profileSyncError, setProfileSyncError] = useState(null);
  const [loading, setLoading] = useState(true);

  const pendingNameRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfileSyncError(null);
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const adminRef = doc(db, 'admins', currentUser.uid);

          let admin = isRootAdminEmail(currentUser.email);
          try {
            const adminSnap = await getDoc(adminRef);
            if (adminSnap.exists()) {
              admin = true;
            } else if (admin) {
              setDoc(adminRef, { role: 'admin', createdAt: serverTimestamp() }).catch((err) => {
                console.error('Failed to create root admin marker in Realtime Database:', err);
              });
            }
          } catch {
            // Keep root admin evaluation if getDoc fails
          }
          setIsAdmin(admin);

          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const newDoc = {
              displayName:
                pendingNameRef.current ||
                currentUser.displayName ||
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
            pendingNameRef.current = null;
            await setDoc(userRef, newDoc);
            const full = { ...newDoc, uid: currentUser.uid };
            setUserDoc(full);
          } else {
            const data = userSnap.data();
            await updateDoc(userRef, { lastActiveAt: serverTimestamp() });
            const full = { ...data, uid: currentUser.uid };
            setUserDoc(full);
          }
        } catch (err) {
          console.error('Failed to sync user profile with Realtime Database:', err);
          setUserDoc(null);
          setProfileSyncError(err);
        }
      } else {
        setUserDoc(null);
        setIsAdmin(false);
        setProfileSyncError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
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
        setError(err?.message || 'تعذر تسجيل الدخول عبر Google، يرجى المحاولة مرة أخرى');
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
        setError(err?.message || 'تعذر تسجيل الدخول، يرجى التحقق من البيانات المدخلة');
      }
      throw err;
    }
  };

  const registerWithEmail = async (name, email, pass) => {
    setError(null);
    const cleanName = name.trim() || 'مستخدم جديد';
    pendingNameRef.current = cleanName;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch {}
    } catch (err) {
      pendingNameRef.current = null;
      if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة (يجب أن تتكون من 6 خانات على الأقل)');
      } else {
        setError(err?.message || 'تعذر إنشاء الحساب، يرجى المحاولة مجددًا');
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
      setUserDoc((prev) => {
        const next = { ...prev, ...fields };
        return next;
      });
    } catch (err) {
      console.error('Error updating user doc', err);
      throw err;
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
    setUser(null);
    setUserDoc(null);
    setIsAdmin(false);
    setProfileSyncError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userDoc,
        profileSyncError,
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
