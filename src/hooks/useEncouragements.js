import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from '../firebase.js';
import { db, handleDatabaseError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

export const DEFAULT_ENCOURAGEMENTS = [
  'ما شاء الله! خطوة مباركة كُتبت في ميزان حسناتك 🌱',
  'ثبتك الله على طاعته وزادك همّة وتوفيقاً 🌿',
  'هنيئاً لك هذا الورد المبارك، داوم على الخير وإن قل 🤍',
  'طوبى لمن عمّر يومه بذكر الله وكتابه العزيز 📖',
  'وفقك الله ونفع بك، خطوة اليوم تبني ثبات الغد 🌿',
  'تقبل الله طاعتك ورزقك الإخلاص والقبول 🤲',
];

export function useEncouragements() {
  const { user } = useAuth();
  const [phrases, setPhrases] = useState([]);
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
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setPhrases(list);
        setLoading(false);
      },
      (error) => {
        handleDatabaseError(error, OperationType.LIST, 'encouragements');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addPhrase = async (text) => {
    try {
      const ref = doc(collection(db, 'encouragements'));
      await setDoc(ref, {
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleDatabaseError(err, OperationType.CREATE, 'encouragements');
      throw err;
    }
  };

  const deletePhrase = async (id) => {
    try {
      await deleteDoc(doc(db, 'encouragements', id));
    } catch (err) {
      handleDatabaseError(err, OperationType.DELETE, `encouragements/${id}`);
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

  const getRandomPhrase = () => {
    if (phrases.length > 0) {
      const idx = Math.floor(Math.random() * phrases.length);
      return phrases[idx].text;
    }
    const idx = Math.floor(Math.random() * DEFAULT_ENCOURAGEMENTS.length);
    return DEFAULT_ENCOURAGEMENTS[idx];
  };

  return {
    phrases,
    loading,
    addPhrase,
    deletePhrase,
    seedDefaultPhrases,
    getRandomPhrase,
  };
}
