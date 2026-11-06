import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useActivities, INITIAL_PRESETS } from '../../hooks/useActivities.js';
import { useAdminNotes } from '../../hooks/useAdminNotes.js';
import { useEncouragements } from '../../hooks/useEncouragements.js';
import { useItemProgress } from '../../hooks/useItemProgress.js';
import { exportToCSV } from '../../lib/csv.js';
import { getTodayDateString, formatArabicDate } from '../../lib/dates.js';
import { calculateStreaks, calculateKhatma } from '../../lib/stats.js';
import { evaluateBadges } from '../../lib/badges.js';
import { getSurah, TOTAL_PAGES } from '../../data/quran.js';
import { ProgressRing } from '../../components/ProgressRing.jsx';
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase.js';
import * as LucideIcons from 'lucide-react';
import {
  Users,
  Shield,
  Layers,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  FileSpreadsheet,
  Send,
  UserX,
  UserCheck,
  Quote,
  MessageSquareHeart,
  Video,
  ArrowUp,
  ArrowDown,
  Calendar,
  Flame,
  BookOpen,
  Award,
  AlertCircle,
  Eye,
  CheckCircle2,
  XCircle,
  ExternalLink,
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
  const { isDark } = useTheme();
  const {
    activities,
    saveActivity,
    deleteActivity,
    reorderActivities,
    seedPresetsToDatabase,
  } = useActivities(true);
  const { sendNote } = useAdminNotes();
  const {
    phrases: encouragements,
    addPhrase,
    deletePhrase,
    seedDefaultPhrases,
  } = useEncouragements();

  const [activeTab, setActiveTab] = useState('user-inspection');
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  // Detailed User Inspection state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLogs, setUserLogs] = useState([]);
  const [loadingUserLogs, setLoadingUserLogs] = useState(false);
  const [inspectionDate, setInspectionDate] = useState(() => getTodayDateString());

  // Note sending state
  const [noteText, setNoteText] = useState('');
  const [noteSending, setNoteSending] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Encouragement phrase state
  const [newPhraseText, setNewPhraseText] = useState('');
  const [addingPhrase, setAddingPhrase] = useState(false);

  // Activity Edit/Add Modal state
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [videoManageActivityId, setVideoManageActivityId] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [newSubItemTitle, setNewSubItemTitle] = useState('');

  // Fetch users list
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => {
          list.push({ uid: d.id, ...d.data() });
        });
        setUsersList(list);
        setLoadingUsers(false);
        // Automatically select the first user if none selected
        if (!selectedUser && list.length > 0) {
          setSelectedUser(list[0]);
        }
      },
      () => setLoadingUsers(false)
    );
    return () => unsubscribe();
  }, [isAdmin]);

  // Load logs for the selected user whenever selectedUser changes
  useEffect(() => {
    if (!selectedUser?.uid) {
      setUserLogs([]);
      return;
    }
    setLoadingUserLogs(true);
    const q = query(
      collection(db, 'logs'),
      where('uid', '==', selectedUser.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setUserLogs(list);
        setLoadingUserLogs(false);
      },
      () => setLoadingUserLogs(false)
    );
    return () => unsubscribe();
  }, [selectedUser?.uid]);

  const toggleUserStatus = async (uid, currentStatus) => {
    if (!uid) return;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { isDisabled: !currentStatus });
      if (selectedUser?.uid === uid) {
        setSelectedUser((prev) => (prev ? { ...prev, isDisabled: !currentStatus } : null));
      }
    } catch (err) {
      console.error('Error toggling user status', err);
    }
  };

  const handleSendNote = async (e) => {
    e.preventDefault();
    if (!selectedUser?.uid || !noteText.trim()) return;
    setNoteSending(true);
    setNoteSuccess(false);
    try {
      await sendNote(selectedUser.uid, noteText.trim());
      setNoteText('');
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 3500);
    } finally {
      setNoteSending(false);
    }
  };

  const handleAddPhrase = async (e) => {
    e.preventDefault();
    if (!newPhraseText.trim()) return;
    setAddingPhrase(true);
    try {
      await addPhrase(newPhraseText.trim());
      setNewPhraseText('');
    } finally {
      setAddingPhrase(false);
    }
  };

  const handleMoveActivity = (idx, direction) => {
    const list = [...activities];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    reorderActivities(list);
  };

  const handleSaveActivityForm = async (e) => {
    e.preventDefault();
    if (!editingActivity) return;
    await saveActivity(editingActivity);
    setActivityModalOpen(false);
    setEditingActivity(null);
  };

  const handleSeedPresets = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await seedPresetsToDatabase();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } finally {
      setSeeding(false);
    }
  };

  const handleAddFivePrayersDirectly = async () => {
    const prayerPreset = INITIAL_PRESETS.find((p) => p.type === 'prayers');
    if (prayerPreset) {
      await saveActivity({
        ...prayerPreset,
        order: activities.length + 1,
      });
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Metrics for the inspected user
  const inspectedUserStreaks = calculateStreaks(userLogs, inspectionDate);
  const inspectedUserKhatma = calculateKhatma(userLogs, activities);
  const inspectedUserBadges = evaluateBadges(userLogs, activities, inspectionDate);

  // Group inspected user's logs for the selected inspection date
  const inspectedDateLogs = userLogs.filter((l) => l.date === inspectionDate);
  const inspectedLogsMap = new Map(inspectedDateLogs.map((l) => [l.activityId, l]));

  const completedActivitiesCount = activities.filter((a) => {
    const l = inspectedLogsMap.get(a.id);
    return l && l.completed;
  }).length;

  const totalAssignedActivities = activities.filter((a) => {
    if (!a.isActive) return false;
    if (a.audience === 'all') return true;
    return a.assignedUids?.includes(selectedUser?.uid);
  });

  const completionPercentage = totalAssignedActivities.length > 0
    ? Math.round((completedActivitiesCount / totalAssignedActivities.length) * 100)
    : 0;

  const tabs = [
    { id: 'user-inspection', label: 'متابعة إنجازات المستخدمين', icon: Users },
    { id: 'overview', label: 'نظرة عامة', icon: Shield },
    { id: 'activities', label: 'إدارة الأنشطة والعبادات', icon: Layers },
    { id: 'encouragements', label: 'العبارات التشجيعية', icon: MessageSquareHeart },
    { id: 'reports', label: 'تصدير التقارير (Excel)', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6 text-right">
      {/* Top Admin Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                لوحة تحكم الإدارة والمتابعة
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              متابعة ما أنجزه وما فات المستخدمين، تفقد الأوسمة والختمات، وإدارة الأنشطة والعبارات.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-2xl">
              حساب إداري معتمد ✓
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto pb-1 border-t border-slate-100 dark:border-slate-800 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB: USER INSPECTION (KEY USER FEATURE: WHAT THEY DID & DIDN'T DO) */}
      {/* ======================================================== */}
      {activeTab === 'user-inspection' && (
        <div className="space-y-6">
          {/* User selector and search header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>اختر المستخدم للمعاينة وتفقد إنجازاته</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  اضغط على أي مستخدم لعرض كل ما أداه وما قصر فيه بدقة، ومتابعة ختمته وأوسمته.
                </p>
              </div>

              {/* Search box */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو البريد..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full ps-9 pe-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* User pills / cards horizontal carousel */}
            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-slate-400">جارٍ جلب قائمة المستخدمين...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">لا يوجد مستخدمون مطابقون</div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUser?.uid === u.uid;
                  return (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-right transition-all shrink-0 min-w-[220px] ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/60 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {u.displayName?.[0] || 'م'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {u.displayName}
                          </span>
                          {u.isDisabled && (
                            <span className="text-[9px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold px-1.5 py-0.2 rounded-full">
                              معطّل
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate" dir="ltr">
                          {u.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* If user is selected, show deep inspection view */}
          {selectedUser && (
            <div className="space-y-6">
              {/* Profile Bar & Date Selector for Selected User */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md">
                    {selectedUser.displayName?.[0] || 'م'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-lg text-slate-900 dark:text-white">
                        {selectedUser.displayName}
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(selectedUser.uid, selectedUser.isDisabled)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                          selectedUser.isDisabled
                            ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                        }`}
                        title={selectedUser.isDisabled ? 'إعادة تفعيل الحساب' : 'تعطيل الحساب'}
                      >
                        {selectedUser.isDisabled ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        <span>{selectedUser.isDisabled ? 'معطّل (اضغط للتفعيل)' : 'نشط ومفعل'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5" dir="ltr">
                      {selectedUser.email} • المنطقة: {selectedUser.timezone || 'Africa/Cairo'}
                    </p>
                  </div>
                </div>

                {/* Date Picker for Inspection */}
                <div className="flex items-center gap-3 w-full lg:w-auto bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    تاريخ المعاينة:
                  </span>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setInspectionDate(getTodayDateString())}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                  >
                    اليوم
                  </button>
                </div>
              </div>

              {/* Inspected User KPIs (Streak, Khatma, Badges, Daily completion) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Daily Completion Rate */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">إنجاز اليوم المختار</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {completedActivitiesCount} / {totalAssignedActivities.length}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5">
                    نسبة الإتمام: {completionPercentage}%
                  </p>
                </div>

                {/* User Streak */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سلسلة الاستمرار المتواصل</span>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <Flame className="w-6 h-6 fill-amber-500 text-amber-500" />
                    <span>{inspectedUserStreaks.currentStreak} أيام</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    أطول سلسلة: {inspectedUserStreaks.longestStreak} يوم متواصل
                  </p>
                </div>

                {/* User Khatma Status */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ختمة القرآن الكريم</span>
                  <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
                    صـ {inspectedUserKhatma.currentPageInKhatma} <span className="text-xs font-semibold text-slate-400">من {TOTAL_PAGES}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    إجمالي الصفحات: {inspectedUserKhatma.totalPagesRead} ({inspectedUserKhatma.completedKhatmas} ختمات)
                  </p>
                </div>

                {/* Badges Earned */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الأوسمة المحققة</span>
                  <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1.5">
                    <Award className="w-6 h-6" />
                    <span>{inspectedUserBadges.filter((b) => b.unlocked).length} / {inspectedUserBadges.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    إنجازات وأوسمة مكتملة
                  </p>
                </div>
              </div>

              {/* CORE SECTION 1: WHAT THEY COMPLETED VS WHAT THEY MISSED (اليوم المختار) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>تقرير الأنشطة والعبادات ليوم:</span>
                      <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                        {formatArabicDate(inspectionDate, true)}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      تفصيل كامل بالأنشطة التي أنجزها المستخدم وما فاته أو لم يقم به، مع الملاحظات وأسباب التأخير.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-xl">
                      أُنجز {completedActivitiesCount}
                    </span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-xl">
                      لم يُنجز {Math.max(0, totalAssignedActivities.length - completedActivitiesCount)}
                    </span>
                  </div>
                </div>

                {loadingUserLogs ? (
                  <div className="p-8 text-center text-xs text-slate-400">جارٍ جلب السجلات...</div>
                ) : totalAssignedActivities.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">لا توجد أنشطة محددة لهذا المستخدم</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {totalAssignedActivities.map((act) => {
                      const log = inspectedLogsMap.get(act.id);
                      const isDone = log && log.completed;
                      const hasLog = !!log;
                      const IconComp = LucideIcons[act.icon] || LucideIcons.Sparkles;

                      return (
                        <div
                          key={act.id}
                          className={`p-4 rounded-3xl border transition-all ${
                            isDone
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div
                                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                                style={{ backgroundColor: `${act.color}15`, color: act.color }}
                              >
                                <IconComp className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                    {act.title}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                  الهدف المطلوب: {act.dailyTarget > 0 ? `${act.dailyTarget} ${act.unit}` : 'إتمام الورد'}
                                </p>
                              </div>
                            </div>

                            {/* Status Chip */}
                            <div className="shrink-0">
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-xl">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>تم الإنجاز</span>
                                </span>
                              ) : hasLog && log.amount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-xl">
                                  <span>إنجاز جزئي ({log.amount})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl">
                                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                  <span>لم يُنجز بعد</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Specific Details logged by the user */}
                          {hasLog && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                              {/* Quran Memorization Details */}
                              {log.details?.surah && (
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-900 dark:text-emerald-300 flex items-center justify-between text-xs">
                                  <span>
                                    📖 سورة {getSurah(log.details.surah)?.name || log.details.surah} (الآيات {log.details.fromAyah} - {log.details.toAyah})
                                  </span>
                                  <span className="font-bold">
                                    {log.details.kind === 'new' ? 'حفظ جديد' : 'مراجعة'}
                                  </span>
                                </div>
                              )}

                              {/* Quran Reading Details */}
                              {log.details?.fromPage && (
                                <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-900 dark:text-sky-300 text-xs">
                                  📖 من صفحة {log.details.fromPage} إلى صفحة {log.details.toPage} (إجمالي {log.amount} صفحات)
                                </div>
                              )}

                              {/* Prayers Details */}
                              {log.details?.prayers && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                                    تفاصيل الصلوات المسجلة:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {Object.values(log.details.prayers).map((p) => {
                                      const isJamaah = p.status === 'prayed_jamaah';
                                      const isIndiv = p.status === 'prayed_individual';
                                      const isMissed = p.status === 'missed';
                                      return (
                                        <div
                                          key={p.id}
                                          className={`p-2 rounded-xl text-[11px] font-medium border ${
                                            isJamaah
                                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                                              : isIndiv
                                              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-300'
                                              : isMissed
                                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
                                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'
                                          }`}
                                        >
                                          <div className="font-bold flex items-center justify-between">
                                            <span>{p.title}</span>
                                            <span>{isJamaah ? 'جماعة ✓' : isIndiv ? 'منفرداً ✓' : isMissed ? 'لم أصلِّ ✕' : '—'}</span>
                                          </div>
                                          {p.note && (
                                            <p className="text-[10px] opacity-80 mt-0.5">
                                              السبب/الملاحظة: {p.note}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Checklist Details */}
                              {log.details?.checklist && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                                    بنود القائمة:
                                  </span>
                                  <div className="space-y-1">
                                    {Object.values(log.details.checklist).map((it) => (
                                      <div
                                        key={it.id}
                                        className={`p-1.5 px-2.5 rounded-lg text-[11px] flex items-center justify-between ${
                                          it.completed
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
                                        }`}
                                      >
                                        <span>{it.title}</span>
                                        <span>{it.completed ? 'أُنجز ✓' : 'لم ينجز'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* User Reflection Note */}
                              {log.note && (
                                <p className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 italic">
                                  ملاحظة المستخدم: «{log.note}»
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CORE SECTION 2: COMPLETED ACHIEVEMENTS & BADGES (الأوسمة والإنجازات المحققة) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>إنجازات وأوسمة {selectedUser.displayName}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      الأوسمة التي فتحها المستخدم بناءً على سجله التراكمي في المنصة.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-xl">
                    {inspectedUserBadges.filter((b) => b.unlocked).length} من {inspectedUserBadges.length} أوسمة محققة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inspectedUserBadges.map((badge) => {
                    return (
                      <div
                        key={badge.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          badge.unlocked
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              badge.unlocked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                            }`}
                          >
                            <Award className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {badge.title}
                              </h5>
                              {badge.unlocked && (
                                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold px-1.5 py-0.2 rounded-full">
                                  تم ✓
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {badge.description}
                            </p>
                            {!badge.unlocked && badge.progressPercent != null && (
                              <div className="mt-1.5">
                                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${badge.progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-slate-400 mt-0.5 block text-left">
                                  {badge.progressPercent}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CORE SECTION 3: DIRECT ENCOURAGEMENT NOTE FROM ADMIN TO USER */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>إرسال تشجيع أو ملاحظة مباشرة لـ {selectedUser.displayName}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ستظهر هذه الرسالة فوراً في جرس الإشعارات لدى المستخدم لتشجيعه وتثبيته.
                  </p>
                </div>

                <form onSubmit={handleSendNote} className="space-y-3">
                  <textarea
                    rows={3}
                    required
                    placeholder={`اكتب رسالة تشجيعية لـ ${selectedUser.displayName}... (مثال: ما شاء الله على استمرارك اليومي، تقبل الله طاعتك ورزقك الثبات!)`}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  {noteSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>تم إرسال الملاحظة بنجاح وستصل للمستخدم في إشعاراته!</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={noteSending || !noteText.trim()}
                    className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{noteSending ? 'جارٍ الإرسال...' : 'إرسال الرسالة التشجيعية'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">المستخدمون المسجلون</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {usersList.length}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                {usersList.filter((u) => !u.isDisabled).length} حسابات مفعلة
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">الأنشطة المعتمدة في المنصة</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {activities.length}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {activities.filter((a) => a.isActive).length} نشطة وظاهرة للمستخدمين
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">العبارات التشجيعية التلقائية</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                {encouragements.length}
              </div>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                تظهر عند تسجيل أي إنجاز يومي
              </p>
            </div>
          </div>

          {activities.length === 0 && (
            <div className="p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-right">
                <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2 justify-center sm:justify-start">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>قائمة الأنشطة فارغة حاليًا</span>
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  يمكنك بنقرة زر واحدة تهيئة باقة الأنشطة الموصى بها (حفظ، تلاوة وختمة، تدبر، أذكار، صلاة).
                </p>
              </div>
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedPresets}
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{seeding ? 'جارٍ الحفظ...' : 'تهيئة الأنشطة المقترحة'}</span>
              </button>
            </div>
          )}

          {seedSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs rounded-2xl flex items-center gap-2 font-bold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>تمت إضافة الأنشطة بنجاح!</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: ACTIVITIES MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                إدارة الأنشطة والعبادات ({activities.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إضافة أنشطة جديدة، تغيير ترتيبها، تخصيص ألوانها وأيقوناتها وإعداداتها.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingActivity({
                    title: '',
                    description: '',
                    type: 'custom',
                    inputMode: 'numeric',
                    unit: 'ayah',
                    dailyTarget: 5,
                    activeDays: [],
                    icon: 'Sparkles',
                    color: '#10b981',
                    audience: 'all',
                    assignedUids: [],
                    order: activities.length + 1,
                    isActive: true,
                    subItems: [],
                  });
                  setActivityModalOpen(true);
                }}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نشاط جديد</span>
              </button>
            </div>
          </div>

          {/* Activities List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                لا توجد أنشطة مضافة حالياً.
              </div>
            ) : (
              activities.map((act, idx) => {
                const IconComp = LucideIcons[act.icon] || LucideIcons.Sparkles;
                return (
                  <div
                    key={act.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveActivity(idx, 'up')}
                          className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === activities.length - 1}
                          onClick={() => handleMoveActivity(idx, 'down')}
                          className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs"
                        style={{ backgroundColor: `${act.color}15`, color: act.color }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {act.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              act.isActive
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {act.isActive ? 'نشط' : 'معطل'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {act.description || `الهدف: ${act.dailyTarget} ${act.unit}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {act.type === 'listen' && (
                        <button
                          type="button"
                          onClick={() => setVideoManageActivityId(act.id)}
                          className="px-3 py-1.5 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 text-violet-700 dark:text-violet-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>إدارة الفيديوهات</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingActivity(act);
                          setActivityModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all"
                        title="تعديل النشاط"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف نشاط "${act.title}"؟`)) {
                            deleteActivity(act.id);
                          }
                        }}
                        className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center transition-all"
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

      {/* ======================================================== */}
      {/* TAB: ENCOURAGEMENTS */}
      {/* ======================================================== */}
      {activeTab === 'encouragements' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquareHeart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>إدارة العبارات التشجيعية التلقائية</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تظهر هذه العبارة تلقائياً في نافذة أنيقة ومبهجة للمستخدم فور تسجيل أي إنجاز يومي!
              </p>
            </div>

            {/* Add phrase form */}
            <form onSubmit={handleAddPhrase} className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                required
                placeholder="اكتب عبارة تشجيعية جميلة (مثال: ما شاء الله! همتك اليوم تثلج الصدر، استمر في هذا الخير 🌱)"
                value={newPhraseText}
                onChange={(e) => setNewPhraseText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="py-2 px-4 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تهيئة باقة عبارات تشجيعية مقترحة</span>
                </button>
              </div>
            )}
          </div>

          {/* Encouragements List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              العبارات المعتمدة حالياً ({encouragements.length}):
            </h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {encouragements.map((item) => (
                <div key={item.id} className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 rounded-xl transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Quote className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      «{item.text}»
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePhrase(item.id)}
                    className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center transition-all shrink-0"
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

      {/* ======================================================== */}
      {/* TAB: REPORTS & EXPORT */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>تصدير التقارير الرسمية (ملفات Excel / CSV)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            تصدير ملفات Excel معرّبة تدعم الأحرف العربية (UTF-8 BOM) للاحتفاظ بنسخ احتياطية أو تحليل الإحصائيات.
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
                exportToCSV(`mutabi_users_${new Date().toISOString().split('T')[0]}`, headers, rows);
              }}
              className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير قائمة المستخدمين المعتمدين</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT ACTIVITY */}
      {/* ======================================================== */}
      {activityModalOpen && editingActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setActivityModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {editingActivity.id ? 'تعديل النشاط' : 'إضافة نشاط جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveActivityForm} className="space-y-4 text-right">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان النشاط
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الصلوات الخمس، قيام الليل، أذكار الصباح..."
                  value={editingActivity.title || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  الوصف (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="وصف توضيحي للنشاط..."
                  value={editingActivity.description || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    النوع التخصصي
                  </label>
                  <select
                    value={editingActivity.type || 'custom'}
                    onChange={(e) => {
                      const t = e.target.value;
                      let mode = 'numeric';
                      let unit = 'ayah';
                      if (t === 'prayers') {
                        mode = 'prayers';
                        unit = 'time';
                      } else if (t === 'listen') {
                        mode = 'checkbox';
                        unit = 'video';
                      } else if (t === 'read') {
                        mode = 'numeric';
                        unit = 'page';
                      } else if (t === 'memorize') {
                        mode = 'numeric';
                        unit = 'ayah';
                      } else if (t === 'checklist') {
                        mode = 'checklist';
                        unit = 'time';
                      }
                      setEditingActivity({ ...editingActivity, type: t, inputMode: mode, unit });
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="memorize">حفظ القرآن الكريم</option>
                    <option value="read">تلاوة القرآن (الختمة)</option>
                    <option value="prayers">الصلوات الخمس</option>
                    <option value="listen">سماع وتدبر (فيديوهات)</option>
                    <option value="checklist">قائمة مهام متعددة</option>
                    <option value="custom">نشاط عام مخصص</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    الهدف اليومي المطلوب
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingActivity.dailyTarget ?? 1}
                    onChange={(e) => setEditingActivity({ ...editingActivity, dailyTarget: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  لون النشاط
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditingActivity({ ...editingActivity, color: c })}
                      className={`w-7 h-7 rounded-xl transition-transform ${
                        editingActivity.color === c ? 'scale-125 ring-2 ring-slate-800 dark:ring-white ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker Categories */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  أيقونة النشاط (اختر الأيقونة المناسبة):
                </label>
                <div className="space-y-3 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {ICON_CATEGORIES.map((cat) => (
                    <div key={cat.category} className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block px-1">
                        {cat.category}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {cat.icons.map((ic) => {
                          const IconC = LucideIcons[ic.id] || LucideIcons.Sparkles;
                          const isSelected = editingActivity.icon === ic.id;
                          return (
                            <button
                              key={ic.id}
                              type="button"
                              onClick={() => setEditingActivity({ ...editingActivity, icon: ic.id })}
                              className={`p-2 rounded-xl border flex items-center gap-2 transition-all text-right ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <IconC className="w-4 h-4 shrink-0" />
                              <span className="text-[10px] truncate">{ic.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status active checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="actActive"
                  checked={editingActivity.isActive ?? true}
                  onChange={(e) => setEditingActivity({ ...editingActivity, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <label htmlFor="actActive" className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  تفعيل النشاط وإظهاره للمستخدمين
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  حفظ النشاط
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIDEO MANAGEMENT FOR 'LISTEN' ACTIVITIES */}
      {/* ======================================================== */}
      {videoManageActivityId && (
        <VideoManagerModal
          activityId={videoManageActivityId}
          onClose={() => setVideoManageActivityId(null)}
        />
      )}
    </div>
  );
}

// Subcomponent for managing videos
function VideoManagerModal({ activityId, onClose }) {
  const { items, loading, saveActivityItem, deleteActivityItem } = useItemProgress(activityId);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState(15);
  const [saving, setSaving] = useState(false);

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      await saveActivityItem({
        title: title.trim(),
        youtubeUrl: url.trim(),
        durationMin: Number(duration) || 15,
        order: items.length + 1,
      });
      setTitle('');
      setUrl('');
      setDuration(15);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto text-right"
      >
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              إدارة مقاطع الفيديو والدروس المقررة
            </h3>
            <p className="text-xs text-slate-400">
              أضف روابط مقاطع YouTube لتظهر للمستخدمين للمشاهدة وتتبع الإنجاز.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add video form */}
        <form onSubmit={handleAddVideo} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              عنوان الدرس أو المقطع
            </label>
            <input
              type="text"
              required
              placeholder="مثال: الحلقة 1 - مقدمة وتفسير سورة الفاتحة"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                رابط YouTube
              </label>
              <input
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                المدة (دقائق)
              </label>
              <input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{saving ? 'جارٍ الإضافة...' : 'إضافة المقطع للمكتبة'}</span>
          </button>
        </form>

        {/* Existing videos list */}
        <div className="space-y-2 pt-3">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            المقاطع المضافة حالياً ({items.length}):
          </h4>
          {items.map((it, idx) => (
            <div
              key={it.id}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {it.title}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {it.durationMin} دقيقة
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => deleteActivityItem(it.id)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
