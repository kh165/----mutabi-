import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserDoc } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userDoc: UserDoc | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROOT_ADMIN_EMAIL = (import.meta.env.VITE_ROOT_ADMIN_EMAIL || 'khalidsalah948@gmail.com').trim().toLowerCase();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const adminRef = doc(db, 'admins', currentUser.uid);

          const isRootEmail = currentUser.email?.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();

          // Check if admin document exists strictly in the database
          try {
            const adminSnap = await getDoc(adminRef);
            if (adminSnap.exists()) {
              setIsAdmin(true);
            } else if (isRootEmail) {
              // Ensure root admin document exists in the database
              await setDoc(adminRef, {
                createdAt: serverTimestamp(),
                email: currentUser.email,
                role: 'admin',
              });
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            setIsAdmin(false);
          }

          // Fetch or initialize user document
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const newDoc: UserDoc = {
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
            const data = userSnap.data() as UserDoc;
            setUserDoc({ ...data, uid: currentUser.uid });
            // Update last active
            updateDoc(userRef, { lastActiveAt: serverTimestamp() }).catch(() => {});
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
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
    } catch (err: any) {
      setError(err?.message || 'تعذر تسجيل الدخول عبر Google');
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setError(err?.message || 'فشل تسجيل الدخول');
      }
      throw err;
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', cred.user.uid);
      const newDoc: UserDoc = {
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
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)');
      } else {
        setError(err?.message || 'فشل إنشاء الحساب');
      }
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setError(err?.message || 'تعذر إرسال رابط استعادة كلمة المرور');
      throw err;
    }
  };

  const logout = async () => {
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
