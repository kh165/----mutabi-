import { useEffect, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
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

// IDs ثابتة للأنشطة الافتراضية: السجلات القديمة تفضل مرتبطة بنفس النشاط بعد الحفظ في Firestore
const presetsWithIds = () =>
  INITIAL_PRESETS.map((p, idx) => ({ ...p, id: `preset_${idx + 1}` }));

// يكتب فقط الأنشطة الافتراضية الناقصة (لا يمسح أي تعديل للأدمن)
let seedInFlight = null;
async function seedMissingPresets() {
  if (seedInFlight) return seedInFlight;
  seedInFlight = (async () => {
    const existing = await getDocs(collection(db, 'activities'));
    const existingIds = new Set(existing.docs.map((d) => d.id));
    for (const preset of presetsWithIds()) {
      if (existingIds.has(preset.id)) continue;
      await setDoc(doc(db, 'activities', preset.id), {
        ...preset,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  })().finally(() => {
    seedInFlight = null;
  });
  return seedInFlight;
}

function getActivitiesCacheKey(uid, fetchAll) {
  return `mutabi_activities_cache_${uid}_${fetchAll ? 'all' : 'assigned'}`;
}

function getCachedActivities(uid, fetchAll) {
  if (!uid) return [];
  try {
    const cached = localStorage.getItem(getActivitiesCacheKey(uid, fetchAll));
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

export function useActivities(fetchAll = false) {
  const { user, isAdmin } = useAuth();
  const [activities, setActivities] = useState(() => getCachedActivities(user?.uid, fetchAll));
  const [loading, setLoading] = useState(false);
  const [usingPresets, setUsingPresets] = useState(false);
  const usingPresetsRef = useRef(false);
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  useEffect(() => {
    if (!user) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setActivities(getCachedActivities(user.uid, fetchAll));
    setLoading(true);
    const q = query(collection(db, 'activities'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (items.length === 0) {
          usingPresetsRef.current = true;
          setUsingPresets(true);
          setActivities(presetsWithIds());
          // الأدمن يكتب الأنشطة الافتراضية في Firestore تلقائيًا (مرة واحدة، من السيرفر فقط)
          if (isAdminRef.current && !snapshot.metadata.fromCache) {
            seedMissingPresets().catch((seedError) => {
              console.error('Failed to seed default activities:', seedError);
            });
          }
        } else {
          usingPresetsRef.current = false;
          setUsingPresets(false);
          if (fetchAll) {
            setActivities(items);
            try {
              localStorage.setItem(
                getActivitiesCacheKey(user.uid, fetchAll),
                JSON.stringify(items)
              );
            } catch {}
          } else {
            const filtered = items.filter((a) => {
              if (!a.isActive) return false;
              if (a.audience === 'all') return true;
              return a.assignedUids?.includes(user.uid);
            });
            setActivities(filtered);
            try {
              localStorage.setItem(
                getActivitiesCacheKey(user.uid, fetchAll),
                JSON.stringify(filtered)
              );
            } catch {}
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Activities fetch warning, falling back to built-in presets:', error);
        setActivities(presetsWithIds());
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, fetchAll]);

  const saveActivity = async (data) => {
    try {
      if (usingPresetsRef.current) {
        await seedMissingPresets();
      }
      if (data.id) {
        const ref = doc(db, 'activities', data.id);
        await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
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

  const deleteActivity = async (id) => {
    try {
      if (usingPresetsRef.current) {
        await seedMissingPresets();
      }
      await deleteDoc(doc(db, 'activities', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `activities/${id}`);
      throw err;
    }
  };

  const reorderActivities = async (orderedList) => {
    setActivities(orderedList);
    try {
      if (usingPresetsRef.current) {
        await seedMissingPresets();
      }
      for (let i = 0; i < orderedList.length; i++) {
        const item = orderedList[i];
        if (item.order !== i + 1) {
          await setDoc(
            doc(db, 'activities', item.id),
            { order: i + 1, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'activities/reorder');
    }
  };

  const seedPresetsToDatabase = async () => {
    await seedMissingPresets();
  };

  return {
    activities,
    loading,
    usingPresets,
    saveActivity,
    deleteActivity,
    reorderActivities,
    seedPresetsToDatabase,
  };
}