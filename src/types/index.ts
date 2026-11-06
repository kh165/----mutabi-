export type ActivityType = 'memorize' | 'read' | 'listen' | 'prayers' | 'checklist' | 'custom';
export type InputMode = 'numeric' | 'checkbox' | 'prayers' | 'checklist';
export type ActivityUnit = 'ayah' | 'page' | 'juz' | 'minute' | 'video' | 'time';
export type ActivityAudience = 'all' | 'selected';

export interface UserDoc {
  uid?: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  timezone: string; // e.g. "Africa/Cairo"
  theme: 'light' | 'dark' | 'system';
  isDisabled: boolean;
  createdAt: any;
  lastActiveAt: any;
}

export interface SubItemConfig {
  id: string;
  title: string;
  order?: number;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  type: ActivityType;
  inputMode: InputMode;
  unit: ActivityUnit;
  dailyTarget: number; // 0 if no specific numeric target
  activeDays: number[]; // 0=Sun .. 6=Sat (empty = all days)
  icon: string; // Lucide icon name
  color: string; // Hex color string, e.g. "#10b981"
  link?: string | null;
  subItems?: SubItemConfig[]; // For prayers and checklist modes
  audience: ActivityAudience;
  assignedUids: string[];
  order: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface ActivityItem {
  id: string;
  activityId: string;
  title: string;
  youtubeUrl: string;
  durationMin?: number;
  order: number;
  createdAt: any;
}

export type PrayerStatus = 'prayed_jamaah' | 'prayed_individual' | 'missed';

export interface PrayerItemLog {
  id: string;
  title: string;
  status: PrayerStatus;
  note?: string; // Reason if missed or reflection note
}

export interface ChecklistItemLog {
  id: string;
  title: string;
  completed: boolean;
  note?: string; // Reason if not completed
}

export interface LogDetails {
  // For 'memorize'
  surah?: number;
  fromAyah?: number;
  toAyah?: number;
  kind?: 'new' | 'review';
  // For 'read'
  fromPage?: number;
  toPage?: number;
  juz?: number;
  // For 'prayers'
  prayers?: Record<string, PrayerItemLog>;
  // For 'checklist'
  checklist?: Record<string, ChecklistItemLog>;
}

export interface ActivityLog {
  id: string; // uid_activityId_YYYY-MM-DD
  uid: string;
  activityId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  completed: boolean;
  details?: LogDetails;
  note?: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface ItemProgress {
  id: string; // uid_itemId
  uid: string;
  activityId: string;
  itemId: string;
  watchedAt: any;
}

export interface AdminNote {
  id: string;
  toUid: string;
  fromUid: string;
  fromName?: string;
  text: string;
  isRead: boolean;
  createdAt: any;
}

export interface UserBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progressPercent?: number;
}

export interface KhatmaStats {
  totalPagesRead: number;
  completedKhatmas: number;
  currentPageInKhatma: number;
  percentageInCurrentKhatma: number;
  remainingPages: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  completedTodayCount: number;
  totalTodayTarget: number;
  overallRatePercent: number;
}
