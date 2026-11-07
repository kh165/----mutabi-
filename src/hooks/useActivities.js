import { useEffect, useRef, useState } from 'react';
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
} from '../firebase.js';
import { db, handleDatabaseError, OperationType } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';

export const INITIAL_PRESETS = [
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
    title: 'الصلوات الخمس في جماعة',
    description: 'متابعة الفجر والظهر والعصر والمغرب والعشاء',
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
  {
    title: 'صيام التطوع',
    description: 'صيام الإثنين والخميس، الأيام البيض، والقضاء',
    type: 'custom',
    inputMode: 'checkbox',
    unit: 'time',
    dailyTarget: 1,
    activeDays: [1, 4],
    icon: 'Moon',
    color: '#059669',
    audience: 'all',
    assignedUids: [],
    order: 6,
    isActive: true,
  },
  {
    title: 'عداد التسبيح والأذكار',
    description: 'التسبيح والتحميد والتهليل والاستغفار اليومي',
    type: 'custom',
    inputMode: 'numeric',
    unit: 'time',
    dailyTarget: 100,
    activeDays: [],
    icon: 'CircleDot',
    color: '#10b981',
    audience: 'all',
    assignedUids: [],
    order: 7,
    isActive: true,
  },
];

const presetId = (idx) => `preset_${idx + 1}`;

const buildPresets = () =>
  INITIAL_PRESETS.map((p, idx) => ({ ...p, id: p.id || presetId(idx) }));

const stripUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export function useActivities(fetchAll = false) {
  const { user } = useAuth();
  const dbCountRef = useRef(-1);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const q = query(collection(db, 'activities'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        dbCountRef.current = items.length;

        const filtered = fetchAll
          ? items
          : items.filter((a) => {
              if (!a.isActive) return false;
              if (a.audience === 'all') return true;
              return a.assignedUids?.includes(user.uid);
            });
        setActivities(filtered);
        setError(null);
        setLoading(false);
      },
      (error) => {
        console.error('Activities fetch failed:', error);
        dbCountRef.current = -1;
        setActivities([]);
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, fetchAll]);

  const seedPresetsToDatabase = async () => {
    if (dbCountRef.current > 0) return;
    if (dbCountRef.current !== 0) {
      throw new Error('تعذر التحقق من قائمة الأنشطة في قاعدة البيانات. أعد المحاولة بعد استعادة الاتصال.');
    }
    for (let i = 0; i < INITIAL_PRESETS.length; i++) {
      const item = INITIAL_PRESETS[i];
      const id = presetId(i);
      await setDoc(doc(db, 'activities', id), {
        ...item,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const saveActivity = async (data) => {
    try {
      if (data.id) {
        if (String(data.id).startsWith('preset_') && dbCountRef.current === 0) {
          await seedPresetsToDatabase();
        }
        const ref = doc(db, 'activities', data.id);
        await setDoc(
          ref,
          stripUndefined({
            ...data,
            createdAt: data.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
          { merge: true }
        );
      } else {
        const ref = doc(collection(db, 'activities'));
        await setDoc(
          ref,
          stripUndefined({
            ...data,
            id: ref.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        );
      }
    } catch (err) {
      handleDatabaseError(err, OperationType.WRITE, `activities/${data.id || 'new'}`);
      throw err;
    }
  };

  const deleteActivity = async (id) => {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (err) {
      handleDatabaseError(err, OperationType.DELETE, `activities/${id}`);
      throw err;
    }
  };

  const reorderActivities = async (orderedList) => {
    try {
      await Promise.all(
        orderedList.flatMap((item, index) =>
          item.order === index + 1
            ? []
            : [
            updateDoc(doc(db, 'activities', item.id), {
              order: index + 1,
              updatedAt: serverTimestamp(),
            }),
          ]
        )
      );
    } catch (err) {
      handleDatabaseError(err, OperationType.UPDATE, 'activities');
      throw err;
    }
  };

  return {
    activities,
    loading,
    error,
    saveActivity,
    deleteActivity,
    reorderActivities,
    seedPresetsToDatabase,
  };
}
