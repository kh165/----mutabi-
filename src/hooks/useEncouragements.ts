import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';

export interface EncouragementPhrase {
  id: string;
  text: string;
  author?: string;
  createdAt?: any;
}

export const DEFAULT_ENCOURAGEMENTS: string[] = [
  'ما شاء الله! خطوة مباركة كُتبت في ميزان حسناتك 🌱',
  'ثبتك الله على طاعته وزادك همّة وتوفيقاً ✨',
  'هنيئاً لك هذا الورد المبارك، داوم على الخير وإن قل 🤍',
  'طوبى لمن عمّر يومه بذكر الله وكتابه العزيز 📖',
  'وفقك الله ونفع بك، خطوة اليوم تبني ثبات الغد 🌟',
  'تقبل الله طاعتك ورزقك الإخلاص والقبول 🤲',
];

export function useEncouragements() {
  const { user } = useAuth();
  const [phrases, setPhrases] = useState<EncouragementPhrase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPhrases([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'encouragements'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: EncouragementPhrase[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setPhrases(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'encouragements');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addPhrase = async (text: string) => {
    try {
      const ref = doc(collection(db, 'encouragements'));
      await setDoc(ref, {
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'encouragements');
      throw err;
    }
  };

  const deletePhrase = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'encouragements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `encouragements/${id}`);
      throw err;
    }
  };

  const seedDefaultPhrases = async () => {
    for (const text of DEFAULT_ENCOURAGEMENTS) {
      const ref = doc(collection(db, 'encouragements'));
      await setDoc(ref, {
        text,
        createdAt: serverTimestamp(),
      });
    }
  };

  const getRandomPhrase = (): string => {
    if (phrases.length > 0) {
      const idx = Math.floor(Math.random() * phrases.length);
      return phrases[idx].text;
    }
    const idx = Math.floor(Math.random() * DEFAULT_ENCOURAGEMENTS.length);
    return DEFAULT_ENCOURAGEMENTS[idx];
  };

  return { phrases, loading, addPhrase, deletePhrase, seedDefaultPhrases, getRandomPhrase };
}
