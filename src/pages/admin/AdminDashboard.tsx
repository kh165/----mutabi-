import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useActivities } from '../../hooks/useActivities';
import { useItemProgress } from '../../hooks/useItemProgress';
import { useAdminNotes } from '../../hooks/useAdminNotes';
import { useEncouragements } from '../../hooks/useEncouragements';
import { exportToCSV } from '../../lib/csv';
import { Activity, ActivityType, UserDoc } from '../../types';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';
import { db } from '../../firebase';
import * as LucideIcons from 'lucide-react';
import {
  Shield,
  Layers,
  Users,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Video,
  Send,
  UserCheck,
  UserX,
  Search,
  Sparkles,
  Database,
  MessageSquareHeart,
  Quote,
  BookOpenCheck,
  BookOpen,
  Scroll,
  Bookmark,
  SunMedium,
  Moon,
  Heart,
  Headphones,
  GraduationCap,
  Lightbulb,
  HandHeart,
  Smile,
  Flame,
  Trophy,
  Target,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const ICON_CATEGORIES = [
  {
    category: '📖 القرآن الكريم وتلاوته',
    icons: [
      { id: 'BookOpenCheck', label: 'مصحف الحفظ والتثبيت' },
      { id: 'BookOpen', label: 'المصحف الشريف (تلاوة)' },
      { id: 'Scroll', label: 'آيات وسور محددة' },
      { id: 'Bookmark', label: 'فاصل الورد القرآني' },
    ],
  },
  {
    category: '📿 العبادات والأذكار',
    icons: [
      { id: 'SunMedium', label: 'أذكار الصباح والمساء' },
      { id: 'Moon', label: 'قيام الليل والوتر' },
      { id: 'Sparkles', label: 'تسبيح وتهليل واستغفار' },
      { id: 'Heart', label: 'إخلاص النية وصلاح القلب' },
    ],
  },
  {
    category: '🎥 العلم والسماع والتدبر',
    icons: [
      { id: 'Video', label: 'مقاطع التفسير والدروس' },
      { id: 'Headphones', label: 'سماع تلاوة خاشعة' },
      { id: 'GraduationCap', label: 'مجالس الفقه والعلم' },
      { id: 'Lightbulb', label: 'تأملات وتدبر قرآني' },
    ],
  },
  {
    category: '🤲 البر والصدقة والإحسان',
    icons: [
      { id: 'HandHeart', label: 'صدقة وبر وإحسان' },
      { id: 'Smile', label: 'بشاشة وحسن خلق' },
      { id: 'Users', label: 'صلة الرحم والتعاون' },
      { id: 'CheckCircle2', label: 'وفاء بالعهد وإنجاز' },
    ],
  },
  {
    category: '⏱️ الهمة وتنظيم الوقت',
    icons: [
      { id: 'Flame', label: 'علو الهمة والاستمرار' },
      { id: 'Trophy', label: 'ثبات وتحقيق هدف' },
      { id: 'Target', label: 'ورد محدد ومقاس' },
      { id: 'Clock', label: 'بركة تنظيم الوقت' },
    ],
  },
];

const AVAILABLE_COLORS = [
  '#10b981', // Emerald
  '#0284c7', // Sky Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

export function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const {
    activities,
    saveActivity,
    deleteActivity,
    reorderActivities,
    seedPresetsToDatabase,
    loading: loadingActivities,
  } = useActivities(true);
  const { sendNote } = useAdminNotes();
  const {
    phrases: encouragements,
    addPhrase: addEncouragement,
    deletePhrase: deleteEncouragement,
    seedDefaultPhrases,
  } = useEncouragements();

  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'encouragements' | 'users' | 'reports'>('overview');

  // Users list directly from Firestore
  const [usersList, setUsersList] = useState<UserDoc[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  // Selected User for details / note
  const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSending, setNoteSending] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  // New encouragement phrase text input
  const [newPhraseText, setNewPhraseText] = useState('');
  const [addingPhrase, setAddingPhrase] = useState(false);

  // Activity Form Modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Partial<Activity> | null>(null);

  // Videos Manager Modal for listen activity
  const [videoManageActivityId, setVideoManageActivityId] = useState<string | null>(null);

  // Seeding states
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [newSubItemTitle, setNewSubItemTitle] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      setUsersList([]);
      setLoadingUsers(false);
      return;
    }

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UserDoc[] = [];
        snapshot.forEach((d) => list.push({ uid: d.id, ...(d.data() as any) }));
        setUsersList(list);
        setLoadingUsers(false);
      },
      (error) => {
        console.error('Error fetching users for admin:', error);
        setLoadingUsers(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // Strict Admin Gate check
  if (!isAdmin) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-3xl text-center space-y-3">
        <Shield className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="font-bold text-lg text-red-700">
          غير مصرح لك بدخول لوحة الإدارة
        </h3>
        <p className="text-xs text-red-600 max-w-sm mx-auto">
          يتطلب هذا القسم صلاحيات المشرف الموثقة في قاعدة البيانات (مستند admins).
        </p>
      </div>
    );
  }

  const toggleUserStatus = async (uid?: string, currentStatus?: boolean) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, 'users', uid), {
        isDisabled: !currentStatus,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.uid || !noteText.trim()) return;
    setNoteSending(true);
    try {
      await sendNote(selectedUser.uid, noteText.trim());
      setNoteSuccess(true);
      setNoteText('');
      setTimeout(() => setNoteSuccess(false), 3000);
    } finally {
      setNoteSending(false);
    }
  };

  const handleAddPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhraseText.trim()) return;
    setAddingPhrase(true);
    try {
      await addEncouragement(newPhraseText.trim());
      setNewPhraseText('');
    } finally {
      setAddingPhrase(false);
    }
  };

  const handleMoveActivity = (idx: number, direction: 'up' | 'down') => {
    const list = [...activities];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    reorderActivities(list);
  };

  const handleSaveActivityForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivity) return;
    await saveActivity(editingActivity);
    setActivityModalOpen(false);
    setEditingActivity(null);
  };

  const handleSeedPresets = async () => {
    setSeeding(true);
    try {
      await seedPresetsToDatabase();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const handleAddFivePrayersDirectly = async () => {
    try {
      await saveActivity({
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
        order: activities.length + 1,
        isActive: true,
      });
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-right">
      {/* Admin Title & Nav Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-600" />
              <span>لوحة تحكم المشرف (مباشر من Firestore)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              إدارة الأنشطة، العبارات التشجيعية، ومتابعة المستخدمين مباشرة في قاعدة البيانات
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              صلاحية المشرف معتمدة في الداتابيز ✓
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 overflow-x-auto">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: Shield },
            { id: 'activities', label: `إدارة الأنشطة (${activities.length})`, icon: Layers },
            { id: 'encouragements', label: `عبارات التشجيع (${encouragements.length})`, icon: MessageSquareHeart },
            { id: 'users', label: `المستخدمين (${usersList.length})`, icon: Users },
            { id: 'reports', label: 'التقارير والتصدير', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500">المستخدمون المسجلون</span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {usersList.length}
              </div>
              <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                {usersList.filter((u) => !u.isDisabled).length} حسابات مفعلة
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500">الأنشطة المعتمدة في الداتابيز</span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {activities.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {activities.filter((a) => a.isActive).length} نشطة وظاهرة للمستخدمين
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500">جمل التشجيع التلقائية</span>
              <div className="text-3xl font-black text-slate-900 mt-2">
                {encouragements.length}
              </div>
              <p className="text-[11px] text-purple-600 mt-1 font-medium">
                تظهر عند تسجيل أي إنجاز يومي
              </p>
            </div>
          </div>

          {activities.length === 0 && (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-right">
                <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2 justify-center sm:justify-start">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>قاعدة بيانات الأنشطة فارغة حاليًا</span>
                </h4>
                <p className="text-xs text-amber-700">
                  يمكنك بضغطة زر كتابة باقة الأنشطة المقترحة (حفظ، تلاوة وختمة، تدبر، أذكار، صلاة) مباشرة في Firestore.
                </p>
              </div>

              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedPresets}
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{seeding ? 'جارٍ الحفظ في Firestore...' : 'تهيئة الأنشطة في الداتابيز'}</span>
              </button>
            </div>
          )}

          {seedSuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>تمت إضافة الأنشطة بنجاح في قاعدة بيانات Firestore!</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVITIES MANAGEMENT */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                قائمة الأنشطة المخزنة في Firestore
              </h3>
              <p className="text-xs text-slate-500">
                يمكنك تخصيص طريقة استخدام وتفاعل المستخدم مع كل نشاط في صفحته
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddFivePrayersDirectly}
                className="py-2.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl shadow-2xs transition-all flex items-center gap-1.5"
                title="إضافة نشاط الصلوات الخمس مع تسجيل أسباب التأخير تلقائياً"
              >
                <Moon className="w-4 h-4 text-emerald-600" />
                <span>+ إضافة الصلوات الخمس مباشرة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingActivity({
                    title: '',
                    description: '',
                    type: 'custom',
                    inputMode: 'checkbox',
                    unit: 'time',
                    dailyTarget: 1,
                    activeDays: [],
                    icon: 'BookOpenCheck',
                    color: '#10b981',
                    audience: 'all',
                    assignedUids: [],
                    order: activities.length + 1,
                    isActive: true,
                  });
                  setActivityModalOpen(true);
                }}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نشاط وتحديد طريقة استخدامه</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {loadingActivities ? (
              <div className="p-8 text-center text-xs text-slate-400">جارٍ جلب الأنشطة من الداتابيز...</div>
            ) : activities.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Database className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500">لا توجد أنشطة في قاعدة البيانات حتى الآن.</p>
                <button
                  type="button"
                  onClick={handleSeedPresets}
                  className="py-2 px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                >
                  كتابة الأنشطة الأساسية في Firestore
                </button>
              </div>
            ) : (
              activities.map((act, idx) => {
                const IconComp = (LucideIcons as any)[act.icon] || LucideIcons.Sparkles;
                return (
                  <div
                    key={act.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveActivity(idx, 'up')}
                          className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === activities.length - 1}
                          onClick={() => handleMoveActivity(idx, 'down')}
                          className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: `${act.color}15`,
                          borderColor: `${act.color}35`,
                          color: act.color,
                        }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {act.title}
                          </span>
                          {!act.isActive && (
                            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              معطّل
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          النوع: {act.type === 'memorize' ? 'حفظ قرآن' : act.type === 'read' ? 'قراءة قرآن' : act.type === 'listen' ? 'سماع ومقاطع' : 'مخصص'} • الهدف: {act.dailyTarget > 0 ? `${act.dailyTarget} ${act.unit}` : 'اختياري'} • الأيقونة: {act.icon}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {act.type === 'listen' && (
                        <button
                          type="button"
                          onClick={() => setVideoManageActivityId(act.id)}
                          className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>مكتبة الفيديوهات</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingActivity(act);
                          setActivityModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                        title="تعديل النشاط"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteActivity(act.id)}
                        className="w-8 h-8 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center"
                        title="حذف النشاط"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: ENCOURAGEMENTS (CUSTOM QUOTES SHOWN ON LOGGING ACHIEVEMENTS) */}
      {activeTab === 'encouragements' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <MessageSquareHeart className="w-5 h-5 text-emerald-600" />
                <span>إدارة الجمل التشجيعية اليومية (تظهر للمستخدم عند تسجيل أي إنجاز)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                اكتب عباراتك الخاصة لتشجيع المستخدمين. تظهر هذه العبارة تلقائيًا في نافذة أنيقة ومبهجة فور تسجيل الإنجاز!
              </p>
            </div>

            {/* Add new phrase form */}
            <form onSubmit={handleAddPhrase} className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                required
                placeholder="اكتب عبارة تشجيعية جميلة (مثال: ما شاء الله! همتك اليوم تثلج الصدر، استمر في هذا الخير 🌱)"
                value={newPhraseText}
                onChange={(e) => setNewPhraseText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={addingPhrase || !newPhraseText.trim()}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{addingPhrase ? 'جارٍ الإضافة...' : 'إضافة العبارة'}</span>
              </button>
            </form>

            {encouragements.length === 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={seedDefaultPhrases}
                  className="py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تهيئة باقة عبارات تشجيعية جاهزة في قاعدة البيانات</span>
                </button>
              </div>
            )}
          </div>

          {/* List of current encouragement phrases */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-800">
              العبارات المعتمدة حاليًا في Firestore ({encouragements.length}):
            </h4>

            <div className="divide-y divide-slate-100">
              {encouragements.map((item) => (
                <div key={item.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Quote className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm font-semibold text-slate-800">
                      «{item.text}»
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteEncouragement(item.id)}
                    className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all shrink-0"
                    title="حذف العبارة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: USERS LIST */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-base text-slate-900">
              المستخدمون في النظام ({filteredUsers.length})
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث بالاسم أو البريد..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full ps-9 pe-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100">
            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-slate-400">جارٍ جلب المستخدمين من Firestore...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">لا يوجد مستخدمون مطابقون في قاعدة البيانات</div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.uid}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {u.displayName?.[0] || 'م'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {u.displayName}
                        </span>
                        {u.isDisabled && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            معطّل
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate" dir="ltr">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setNoteText('');
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال تشجيع شخصي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleUserStatus(u.uid, u.isDisabled)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-all ${
                        u.isDisabled
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                      title={u.isDisabled ? 'إعادة تفعيل الحساب' : 'تعطيل الحساب'}
                    >
                      {u.isDisabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      <span>{u.isDisabled ? 'تفعيل' : 'تعطيل'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>تصدير التقارير الرسمية من Firestore (CSV)</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            تصدير ملفات Excel معرّبة تدعم UTF-8 مباشرة من قاعدة البيانات.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const headers = ['المعرف', 'الاسم', 'البريد الإلكتروني', 'المنطقة الزمنية', 'الحالة'];
                const rows = usersList.map((u) => [
                  u.uid || '',
                  u.displayName,
                  u.email,
                  u.timezone,
                  u.isDisabled ? 'معطّل' : 'نشط',
                ]);
                exportToCSV(`mutabi_users_report_${new Date().toISOString().split('T')[0]}`, headers, rows);
              }}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير قائمة المستخدمين المعتمدين</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT ACTIVITY WITH REAL CATEGORIZED ICON PICKER */}
      {activityModalOpen && editingActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setActivityModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingActivity.id ? 'تعديل النشاط في الداتابيز' : 'إضافة نشاط جديد إلى Firestore'}
              </h3>
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivityForm} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان النشاط
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الصلوات الخمس، قيام الليل، أذكار الصباح..."
                  value={editingActivity.title || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  الوصف (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="وصف توضيحي للنشاط..."
                  value={editingActivity.description || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Interaction Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  طريقة تفاعل واستخدام المستخدم للنشاط في صفحته:
                </label>
                <select
                  value={
                    editingActivity.type === 'prayers'
                      ? 'prayers'
                      : editingActivity.type === 'checklist'
                      ? 'checklist'
                      : editingActivity.type === 'memorize'
                      ? 'memorize'
                      : editingActivity.type === 'read'
                      ? 'read'
                      : editingActivity.type === 'listen'
                      ? 'listen'
                      : editingActivity.inputMode === 'numeric'
                      ? 'custom_numeric'
                      : 'custom_checkbox'
                  }
                  onChange={(e) => {
                    const mode = e.target.value;
                    if (mode === 'prayers') {
                      setEditingActivity({
                        ...editingActivity,
                        type: 'prayers',
                        inputMode: 'prayers',
                        unit: 'time',
                        dailyTarget: 5,
                        icon: editingActivity.icon || 'Moon',
                        color: editingActivity.color || '#059669',
                        subItems: editingActivity.subItems && editingActivity.subItems.length > 0 ? editingActivity.subItems : [
                          { id: 'fajr', title: 'صلاة الفجر', order: 1 },
                          { id: 'dhuhr', title: 'صلاة الظهر', order: 2 },
                          { id: 'asr', title: 'صلاة العصر', order: 3 },
                          { id: 'maghrib', title: 'صلاة المغرب', order: 4 },
                          { id: 'isha', title: 'صلاة العشاء', order: 5 },
                        ],
                      });
                    } else if (mode === 'checklist') {
                      setEditingActivity({
                        ...editingActivity,
                        type: 'checklist',
                        inputMode: 'checklist',
                        unit: 'time',
                        dailyTarget: editingActivity.subItems?.length || 3,
                        subItems: editingActivity.subItems && editingActivity.subItems.length > 0 ? editingActivity.subItems : [
                          { id: '1', title: 'البند الأول', order: 1 },
                          { id: '2', title: 'البند الثاني', order: 2 },
                        ],
                      });
                    } else if (mode === 'memorize') {
                      setEditingActivity({
                        ...editingActivity,
                        type: 'memorize',
                        inputMode: 'numeric',
                        unit: 'ayah',
                        dailyTarget: 5,
                        icon: editingActivity.icon || 'BookOpenCheck',
                      });
                    } else if (mode === 'read') {
                      setEditingActivity({
                        ...editingActivity,
                        type: 'read',
                        inputMode: 'numeric',
                        unit: 'page',
                        dailyTarget: 4,
                        icon: editingActivity.icon || 'BookOpen',
                      });
                    } else if (mode === 'listen') {
                      setEditingActivity({
                        ...editingActivity,
                        type: 'listen',
                        inputMode: 'checkbox',
                        unit: 'video',
                        dailyTarget: 1,
                        icon: editingActivity.icon || 'Video',
                      });
                    } else if (mode === 'custom_numeric') {
                      setEditingActivity({
                        ...editingActivity,
                        type: 'custom',
                        inputMode: 'numeric',
                        unit: editingActivity.unit || 'time',
                        dailyTarget: editingActivity.dailyTarget || 10,
                      });
                    } else {
                      setEditingActivity({
                        ...editingActivity,
                        type: 'custom',
                        inputMode: 'checkbox',
                        unit: 'time',
                        dailyTarget: 1,
                      });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="prayers">🕌 الصلوات الخمس (تسجيل حالة كل صلاة مع تدوين أسباب عدم الأداء والملاحظات)</option>
                  <option value="checklist">📋 قائمة مهام تفصيلية (بنود متعددة مع تدوين ملاحظات لكل بند)</option>
                  <option value="memorize">📖 حفظ القرآن الكريم (تحديد السورة والآيات ومراجعة)</option>
                  <option value="read">📚 تلاوة القرآن والختمة (تحديد أرقام الصفحات وحساب الختمة)</option>
                  <option value="listen">🎥 سلسلة استماع / مشاهدة (مقاطع يوتيوب محددة)</option>
                  <option value="custom_numeric">🔢 عداد رقمي (زيادة بالعداد بهدف يومي محدد)</option>
                  <option value="custom_checkbox">✅ مربع تأشير مباشر (تم / لم يتم بنقرة واحدة)</option>
                </select>
              </div>

              {/* SubItems Manager for prayers and checklist */}
              {(editingActivity.type === 'prayers' || editingActivity.type === 'checklist' || editingActivity.inputMode === 'prayers' || editingActivity.inputMode === 'checklist') && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      {editingActivity.type === 'prayers' ? 'صلوات النشاط وبنوده المتاحة للمستخدم:' : 'بنود القائمة التفصيلية:'}
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {editingActivity.subItems?.length || 0} بنود
                    </span>
                  </div>

                  {/* Existing items list */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {(editingActivity.subItems || []).map((sub, sIdx) => (
                      <div
                        key={sub.id || sIdx}
                        className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{sub.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingActivity.subItems || []).filter((_, i) => i !== sIdx);
                            setEditingActivity({ ...editingActivity, subItems: updated });
                          }}
                          className="w-5 h-5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center"
                          title="حذف هذا البند"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add sub-item bar */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="اسم البند أو الصلاة الجديدة..."
                      value={newSubItemTitle}
                      onChange={(e) => setNewSubItemTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newSubItemTitle.trim()) return;
                        const current = editingActivity.subItems || [];
                        const newItem = {
                          id: `item_${Date.now()}`,
                          title: newSubItemTitle.trim(),
                          order: current.length + 1,
                        };
                        setEditingActivity({
                          ...editingActivity,
                          subItems: [...current, newItem],
                          dailyTarget: current.length + 1,
                        });
                        setNewSubItemTitle('');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      + إضافة
                    </button>
                  </div>

                  {/* Quick prayer suggestions if prayers mode */}
                  {editingActivity.type === 'prayers' && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-slate-500 font-semibold">اقتراحات سنن:</span>
                      {['صلاة الضحى', 'صلاة الوتر', 'قيام الليل'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            const current = editingActivity.subItems || [];
                            if (current.some((x) => x.title === sug)) return;
                            const newItem = {
                              id: `sunnah_${Date.now()}`,
                              title: sug,
                              order: current.length + 1,
                            };
                            setEditingActivity({
                              ...editingActivity,
                              subItems: [...current, newItem],
                            });
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg text-slate-700 hover:text-emerald-700"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Numeric goal if numeric mode */}
              {editingActivity.inputMode === 'numeric' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      الهدف اليومي
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editingActivity.dailyTarget ?? 1}
                      onChange={(e) => setEditingActivity({ ...editingActivity, dailyTarget: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      وحدة القياس
                    </label>
                    <select
                      value={editingActivity.unit || 'time'}
                      onChange={(e) => setEditingActivity({ ...editingActivity, unit: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      <option value="ayah">آية</option>
                      <option value="page">صفحة</option>
                      <option value="video">مقطع/فيديو</option>
                      <option value="minute">دقيقة</option>
                      <option value="time">مرة</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Categorized Custom Icon Selector */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-800">
                  اختر أيقونة النشاط المنظمة:
                </label>
                <div className="space-y-3 max-h-48 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  {ICON_CATEGORIES.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        {cat.category}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {cat.icons.map((item) => {
                          const IconComp = (LucideIcons as any)[item.id] || LucideIcons.Sparkles;
                          const selected = editingActivity.icon === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setEditingActivity({ ...editingActivity, icon: item.id })}
                              className={`p-2 rounded-xl border flex items-center gap-2 text-right transition-all ${
                                selected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <IconComp className="w-4 h-4 shrink-0" />
                              <span className="text-[11px] font-medium truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  اللون المميز للنشاط
                </label>
                <div className="flex items-center gap-2">
                  {AVAILABLE_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditingActivity({ ...editingActivity, color: col })}
                      className={`w-7 h-7 rounded-xl transition-transform ${
                        editingActivity.color === col ? 'scale-125 ring-2 ring-emerald-500 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="act_active"
                  checked={editingActivity.isActive ?? true}
                  onChange={(e) => setEditingActivity({ ...editingActivity, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded-xs"
                />
                <label htmlFor="act_active" className="text-xs font-semibold text-slate-700">
                  تفعيل النشاط وحفظه في قاعدة البيانات
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm"
                >
                  حفظ في الداتابيز
                </button>
                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SEND NOTE */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setSelectedUser(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                إرسال ملاحظة للمستخدم: {selectedUser.displayName}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نص الملاحظة
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="بارك الله في همتك واستمرارك..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {noteSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5 font-bold">
                  <Check className="w-4 h-4" />
                  <span>تم حفظ الملاحظة في Firestore وستظهر للمستخدم في إشعاراته!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={noteSending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{noteSending ? 'جارٍ الحفظ في الداتابيز...' : 'إرسال الملاحظة'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIDEO ITEMS MANAGER */}
      {videoManageActivityId && (
        <VideoItemsManager
          activityId={videoManageActivityId}
          onClose={() => setVideoManageActivityId(null)}
        />
      )}
    </div>
  );
}

function VideoItemsManager({ activityId, onClose }: { activityId: string; onClose: () => void }) {
  const { items, saveActivityItem, deleteActivityItem } = useItemProgress(activityId);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDuration, setNewDuration] = useState(10);
  const [saving, setSaving] = useState(false);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    setSaving(true);
    try {
      await saveActivityItem({
        title: newTitle.trim(),
        youtubeUrl: newUrl.trim(),
        durationMin: Number(newDuration) || 10,
        order: items.length + 1,
      });
      setNewTitle('');
      setNewUrl('');
      setNewDuration(10);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-xs p-4 animate-in fade-in text-right"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-violet-600" />
            <span>إدارة مكتبة مقاطع السماع ({items.length})</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAddVideo} className="p-4 bg-slate-50 rounded-2xl space-y-3">
          <h4 className="font-bold text-xs text-slate-700">
            إضافة مقطع فيديو جديد إلى Firestore
          </h4>
          <div>
            <input
              type="text"
              required
              placeholder="عنوان الفيديو (مثال: تدبر سورة الفاتحة)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input
                type="url"
                required
                placeholder="رابط يوتيوب (https://youtu.be/...)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <input
                type="number"
                min={1}
                placeholder="المدة (دقيقة)"
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-center font-bold"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'جارٍ الحفظ في الداتابيز...' : 'إضافة المقطع للمكتبة'}</span>
          </button>
        </form>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {item.durationMin} دقيقة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => deleteActivityItem(item.id)}
                className="text-slate-400 hover:text-red-600 p-1 rounded-lg"
                title="حذف الفيديو"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
