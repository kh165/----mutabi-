import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Activity } from '../types';
import { useAuth } from '../context/AuthContext';

export const INITIAL_PRESETS: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'حفظ القرآن الكريم',
    description: 'ورد الحفظ والمراجعة اليومي بالسور والآيات',
    type: 'memorize',
    inputMode: 'numeric',
    unit: 'ayah',
    dailyTarget: 5,
    activeDays: [],
    icon: 'BookOpenCheck',
    color: '#10b981',
    audience: 'all',
    assignedUids: [],
    order: 1,
    isActive: true,
  },
  {
    title: 'تلاوة القرآن (الختمة)',
    description: 'قراءة صفحات الورد اليومي ومتابعة ختمة الـ 604 صفحات',
    type: 'read',
    inputMode: 'numeric',
    unit: 'page',
    dailyTarget: 4,
    activeDays: [],
    icon: 'BookOpen',
    color: '#0284c7',
    audience: 'all',
    assignedUids: [],
    order: 2,
    isActive: true,
  },
  {
    title: 'سلسلة تدبر القرآن',
    description: 'مشاهدة مقاطع التفسير والتدبر المقررة',
    type: 'listen',
    inputMode: 'checkbox',
    unit: 'video',
    dailyTarget: 1,
    activeDays: [],
    icon: 'Video',
    color: '#8b5cf6',
    audience: 'all',
    assignedUids: [],
    order: 3,
    isActive: true,
  },
  {
    title: 'الصلوات الخمس',
    description: 'المحافظة على صلوات اليوم الخمس في أوقاتها مع تدوين أسباب التأخير أو الملاحظات',
    type: 'prayers',
    inputMode: 'prayers',
    unit: 'time',
    dailyTarget: 5,
    activeDays: [],
    icon: 'Moon',
    color: '#059669',
    subItems: [
      { id: 'fajr', title: 'صلاة الفجر', order: 1 },
      { id: 'dhuhr', title: 'صلاة الظهر', order: 2 },
      { id: 'asr', title: 'صلاة العصر', order: 3 },
      { id: 'maghrib', title: 'صلاة المغرب', order: 4 },
      { id: 'isha', title: 'صلاة العشاء', order: 5 },
    ],
    audience: 'all',
    assignedUids: [],
    order: 4,
    isActive: true,
  },
  {
    title: 'أذكار الصباح والمساء',
    description: 'المحافظة على الحصن اليومي من الأذكار',
    type: 'custom',
    inputMode: 'checkbox',
    unit: 'time',
    dailyTarget: 1,
    activeDays: [],
    icon: 'SunMedium',
    color: '#f59e0b',
    audience: 'all',
    assignedUids: [],
    order: 5,
    isActive: true,
  },
];

export function useActivities(fetchAll: boolean = false) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'activities'), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Activity[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });

        if (fetchAll) {
          setActivities(items);
        } else {
          // Filter strictly for the current authenticated user
          const filtered = items.filter((a) => {
            if (!a.isActive) return false;
            if (a.audience === 'all') return true;
            return a.assignedUids?.includes(user.uid);
          });
          setActivities(filtered);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'activities');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, fetchAll]);

  const saveActivity = async (data: Partial<Activity> & { id?: string }) => {
    try {
      if (data.id) {
        const ref = doc(db, 'activities', data.id);
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
      } else {
        const ref = doc(collection(db, 'activities'));
        const newAct = {
          ...data,
          id: ref.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(ref, newAct);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `activities/${data.id || 'new'}`);
      throw err;
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `activities/${id}`);
      throw err;
    }
  };

  const reorderActivities = async (orderedList: Activity[]) => {
    setActivities(orderedList);
    for (let i = 0; i < orderedList.length; i++) {
      const item = orderedList[i];
      if (item.order !== i + 1) {
        updateDoc(doc(db, 'activities', item.id), {
          order: i + 1,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }
  };

  // Admin function to seed initial activities directly into Firestore database
  const seedPresetsToDatabase = async () => {
    for (let i = 0; i < INITIAL_PRESETS.length; i++) {
      const item = INITIAL_PRESETS[i];
      const newDocRef = doc(collection(db, 'activities'));
      await setDoc(newDocRef, {
        ...item,
        id: newDocRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  return { activities, loading, saveActivity, deleteActivity, reorderActivities, seedPresetsToDatabase };
}
