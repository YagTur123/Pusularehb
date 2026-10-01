import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Student, Session, ScheduleConfig } from '../types';
import {
  StudentSchema,
  SessionSchema,
  ScheduleConfigSchema,
  BackupImportSchema,
} from './schemas';

export function autoFormatPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('0')) {
    digits = '9' + digits;
  } else if (digits.startsWith('5')) {
    digits = '90' + digits;
  }

  return digits.slice(0, 12);
}

export function displayPhone(phone: string): string {
  if (!phone) return '-';
  const clean = autoFormatPhone(phone);
  if (clean.length === 12 && clean.startsWith('90')) {
    return `+90 (${clean.slice(2, 5)}) ${clean.slice(5, 8)} ${clean.slice(8, 10)} ${clean.slice(10, 12)}`;
  }
  return phone;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateString(baseDate: string, daysOffset: number): string {
  const [y, m, d] = baseDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTurkishDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDate();
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];
    const days = [
      'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi',
    ];
    const monthName = months[date.getMonth()];
    const dayName = days[date.getDay()];
    return `${day} ${monthName} ${y}, ${dayName}`;
  } catch (e) {
    console.error('Date format error:', e);
    return dateStr;
  }
}

export function formatTurkishDateWithoutDay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDate();
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];
    const monthName = months[date.getMonth()];
    return `${day} ${monthName} ${y}`;
  } catch (e) {
    console.error('Date format error:', e);
    return dateStr;
  }
}

export interface WeekDayInfo {
  date: string;
  dayName: string;
  shortDayName: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
}

export function getWeekDays(baseDate: string, includeWeekend = false): WeekDayInfo[] {
  const [y, m, d] = baseDate.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  const dayOfWeek = current.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const daysCount = includeWeekend ? 7 : 5;
  const shortDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const fullDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const todayStr = getTodayDateString();

  const result: WeekDayInfo[] = [];
  for (let i = 0; i < daysCount; i++) {
    const dObj = new Date(monday);
    dObj.setDate(monday.getDate() + i);
    const yStr = dObj.getFullYear();
    const mStr = String(dObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dObj.getDate()).padStart(2, '0');
    const dateFormatted = `${yStr}-${mStr}-${dayStr}`;

    result.push({
      date: dateFormatted,
      dayName: fullDays[i],
      shortDayName: shortDays[i],
      dayNumber: dObj.getDate(),
      isToday: dateFormatted === todayStr,
      isPast: dateFormatted < todayStr,
    });
  }
  return result;
}

export function getMonthDays(
  year: number,
  monthZeroIndexed: number
): { date: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] {
  const todayStr = getTodayDateString();
  const firstDay = new Date(year, monthZeroIndexed, 1);
  const lastDay = new Date(year, monthZeroIndexed + 1, 0);

  const days: { date: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

  const firstDayWeekDay = firstDay.getDay();
  const startOffset = firstDayWeekDay === 0 ? 6 : firstDayWeekDay - 1;

  for (let i = startOffset; i > 0; i--) {
    const prevDate = new Date(year, monthZeroIndexed, 1 - i);
    const yStr = prevDate.getFullYear();
    const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(prevDate.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;
    days.push({
      date: dateStr,
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const currDate = new Date(year, monthZeroIndexed, i);
    const yStr = currDate.getFullYear();
    const mStr = String(currDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(currDate.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;
    days.push({
      date: dateStr,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, monthZeroIndexed + 1, i);
    const yStr = nextDate.getFullYear();
    const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(nextDate.getDate()).padStart(2, '0');
    const dateStr = `${yStr}-${mStr}-${dStr}`;
    days.push({
      date: dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  sessionDuration: 15,
  breakDuration: 5,
  startTime: '09:00',
  sessionCount: 16,
  includeLunchBreak: true,
  lunchBreakAfter: 8,
  lunchBreakDuration: 45,
};

export const COACH_SCHEDULE_CONFIG: ScheduleConfig = {
  sessionDuration: 30,
  breakDuration: 10,
  startTime: '10:00',
  sessionCount: 8,
  includeLunchBreak: true,
  lunchBreakAfter: 4,
  lunchBreakDuration: 60,
};

export function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return '09:00';
  const clean = timeStr.trim();
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  let totalMins = h * 60 + m + minutes;
  while (totalMins < 0) totalMins += 1440;
  totalMins = totalMins % 1440;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function shiftTimeSlotString(slotStr: string, deltaMinutes: number): string {
  if (!slotStr) return slotStr;
  if (slotStr.includes('-')) {
    const parts = slotStr.split('-').map((s) => s.trim());
    if (parts.length >= 2) {
      const start = addMinutesToTime(parts[0], deltaMinutes);
      const end = addMinutesToTime(parts[1], deltaMinutes);
      return `${start} - ${end}`;
    }
  }
  return addMinutesToTime(slotStr.trim(), deltaMinutes);
}

export function generateSlotsFromScheduleConfig(config: ScheduleConfig): {
  time_slot: string;
  is_break?: boolean;
  break_title?: string;
}[] {
  const slots: { time_slot: string; is_break?: boolean; break_title?: string }[] = [];
  let currentTime = config.startTime;

  for (let i = 1; i <= config.sessionCount; i++) {
    const sessionEnd = addMinutesToTime(currentTime, config.sessionDuration);
    slots.push({
      time_slot: currentTime,
    });

    if (i < config.sessionCount) {
      if (config.includeLunchBreak && i === config.lunchBreakAfter) {
        const lunchEnd = addMinutesToTime(sessionEnd, config.lunchBreakDuration);
        slots.push({
          time_slot: sessionEnd,
          is_break: true,
          break_title: `${config.lunchBreakDuration} dk Öğle Arası & Yemek`,
        });
        currentTime = lunchEnd;
      } else if (config.breakDuration > 0) {
        const breakEnd = addMinutesToTime(sessionEnd, config.breakDuration);
        slots.push({
          time_slot: sessionEnd,
          is_break: true,
          break_title: `${config.breakDuration} dk Teneffüs / Geçiş`,
        });
        currentTime = breakEnd;
      } else {
        currentTime = sessionEnd;
      }
    }
  }

  return slots;
}

export function generateDefaultTimeSlots(): string[] {
  return [
    '09:00', '09:20', '09:40', '10:00', '10:20', '10:40',
    '11:00', '11:20', '11:40', '13:00', '13:20', '13:40',
    '14:00', '14:20', '14:40', '15:00', '15:20', '15:40',
  ];
}

function sanitizeCsvCell(value: string | undefined | null): string {
  if (!value) return '""';
  let str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// Global in-memory cache for ultra-responsive synchronous reads
let cachedStudents: Student[] = [];
let cachedSessions: Session[] = [];
let cachedScheduleConfig: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG;
let cachedCounselorName: string = 'Rehberlik & Psikolojik Danışmanlık Birimi';
let activeUserId: string | null = null;
let isDemoMode: boolean = false;
let errorListeners: Set<(message: string) => void> = new Set();
let dataChangeListeners: Set<() => void> = new Set();
let activeUnsubscribers: Unsubscribe[] = [];

export function isDemoModeActive(): boolean {
  return isDemoMode;
}

function emitError(message: string) {
  console.error('StorageService error:', message);
  errorListeners.forEach((fn) => fn(message));
}

function emitChange() {
  dataChangeListeners.forEach((fn) => fn());
}

export function getActiveUserId(): string {
  if (isDemoMode) return 'demo-local-counselor';
  return activeUserId || auth.currentUser?.uid || '';
}

/**
 * StorageService handles individual document CRUD operations to Firestore,
 * real-time onSnapshot synchronization, crypto.randomUUID() ID generation,
 * Zod validation, and one-time legacy localStorage migration.
 */
export const StorageService = {
  isDemo(): boolean {
    return isDemoMode;
  },

  /**
   * Initializes in-memory demo mode without Firestore or localStorage writes.
   * Completely isolated from Firebase Auth and remote databases.
   */
  initDemo(students: Student[], sessions: Session[], counselorName = 'Demo Danışman') {
    this.cleanupListeners();
    isDemoMode = true;
    activeUserId = 'demo-local-counselor';
    cachedStudents = [...students];
    cachedSessions = [...sessions];
    cachedCounselorName = counselorName;
    cachedScheduleConfig = DEFAULT_SCHEDULE_CONFIG;
    emitChange();
  },

  onError(callback: (message: string) => void): () => void {
    errorListeners.add(callback);
    return () => {
      errorListeners.delete(callback);
    };
  },

  onChange(callback: () => void): () => void {
    dataChangeListeners.add(callback);
    return () => {
      dataChangeListeners.delete(callback);
    };
  },

  /**
   * Initializes real-time Firestore listeners for the authenticated counselor:
   * - counselors/{uid}/students/{studentId}
   * - counselors/{uid}/sessions/{sessionId}
   * - counselors/{uid}/settings/schedule
   */
  init(userId: string) {
    if (!userId) {
      this.clear();
      return;
    }

    if (activeUserId === userId && activeUnsubscribers.length > 0) {
      return;
    }

    // Clean up previous listeners
    this.cleanupListeners();
    activeUserId = userId;

    // 1. One-time migration from legacy localStorage if present
    this.migrateLegacyLocalStorage(userId);

    // 2. Real-time Students subcollection listener: counselors/{uid}/students
    try {
      const studentsColl = collection(db, 'counselors', userId, 'students');
      const unsubStudents = onSnapshot(
        studentsColl,
        (snapshot) => {
          const list: Student[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const parseResult = StudentSchema.safeParse({ ...data, id: docSnap.id });
            if (parseResult.success) {
              list.push(parseResult.data as Student);
            } else {
              console.warn('Student doc validation warning:', parseResult.error);
              list.push({ ...data, id: docSnap.id } as Student);
            }
          });
          cachedStudents = list;
          emitChange();
        },
        (err) => {
          emitError(`Öğrenci verileri senkronizasyon hatası: ${err.message}`);
        }
      );
      activeUnsubscribers.push(unsubStudents);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Öğrenci dinleyicisi başlatılamadı: ${msg}`);
    }

    // 3. Real-time Sessions subcollection listener: counselors/{uid}/sessions
    try {
      const sessionsColl = collection(db, 'counselors', userId, 'sessions');
      const unsubSessions = onSnapshot(
        sessionsColl,
        (snapshot) => {
          const list: Session[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const parseResult = SessionSchema.safeParse({ ...data, id: docSnap.id });
            if (parseResult.success) {
              list.push(parseResult.data as Session);
            } else {
              console.warn('Session doc validation warning:', parseResult.error);
              list.push({ ...data, id: docSnap.id } as Session);
            }
          });
          list.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time_slot.localeCompare(b.time_slot);
          });
          cachedSessions = list;
          emitChange();
        },
        (err) => {
          emitError(`Seans verileri senkronizasyon hatası: ${err.message}`);
        }
      );
      activeUnsubscribers.push(unsubSessions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Seans dinleyicisi başlatılamadı: ${msg}`);
    }

    // 4. Real-time Schedule Config listener: counselors/{uid}/settings/schedule
    try {
      const scheduleDocRef = doc(db, 'counselors', userId, 'settings', 'schedule');
      const unsubSchedule = onSnapshot(
        scheduleDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const parseResult = ScheduleConfigSchema.safeParse(data);
            if (parseResult.success) {
              cachedScheduleConfig = parseResult.data as ScheduleConfig;
            } else {
              cachedScheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG, ...data };
            }
            emitChange();
          }
        },
        (err) => {
          emitError(`Çizelge ayarı okuma hatası: ${err.message}`);
        }
      );
      activeUnsubscribers.push(unsubSchedule);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Çizelge dinleyicisi başlatılamadı: ${msg}`);
    }

    // 5. Counselor Name listener: counselors/{uid}
    try {
      const counselorDocRef = doc(db, 'counselors', userId);
      const unsubCounselor = onSnapshot(
        counselorDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) {
              cachedCounselorName = data.name;
              emitChange();
            }
          }
        },
        (err) => {
          emitError(`Danışman profili okuma hatası: ${err.message}`);
        }
      );
      activeUnsubscribers.push(unsubCounselor);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Profil dinleyicisi başlatılamadı: ${msg}`);
    }
  },

  cleanupListeners() {
    activeUnsubscribers.forEach((unsub) => unsub());
    activeUnsubscribers = [];
  },

  clear() {
    this.cleanupListeners();
    cachedStudents = [];
    cachedSessions = [];
    cachedScheduleConfig = DEFAULT_SCHEDULE_CONFIG;
    cachedCounselorName = 'Rehberlik & Psikolojik Danışmanlık Birimi';
    activeUserId = null;
    emitChange();
  },

  /**
   * One-time migration:
   * Sadece `_${userId}` ile biten anahtarları taşı.
   * 'demo_rehberlik' ve genel `pusula_students_v1` / `pusula_sessions_v1` anahtarlarını taşıma, sadece sil.
   */
  async migrateLegacyLocalStorage(userId: string) {
    if (typeof localStorage === 'undefined') return;
    const migrationFlagKey = `pusula_migrated_v2_${userId}`;
    if (localStorage.getItem(migrationFlagKey) === 'true') {
      return;
    }

    try {
      // 1. SADECE _${userId} ile biten kullanıcıya ait anahtarları taşı
      const userStudentKey = `pusula_students_v1_${userId}`;
      const userSessionKey = `pusula_sessions_v1_${userId}`;

      let rawStudents: unknown[] = [];
      const userStudentItem = localStorage.getItem(userStudentKey);
      if (userStudentItem) {
        try {
          const parsed = JSON.parse(userStudentItem);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawStudents = parsed;
          }
        } catch (e) {
          console.error('Migration parse error for student key:', userStudentKey, e);
        }
      }

      let rawSessions: unknown[] = [];
      const userSessionItem = localStorage.getItem(userSessionKey);
      if (userSessionItem) {
        try {
          const parsed = JSON.parse(userSessionItem);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawSessions = parsed;
          }
        } catch (e) {
          console.error('Migration parse error for session key:', userSessionKey, e);
        }
      }

      // Check if user's Firestore already has students
      const existingSnap = await getDocs(collection(db, 'counselors', userId, 'students'));
      if (existingSnap.empty && (rawStudents.length > 0 || rawSessions.length > 0)) {
        // Write migrated students in batches
        if (rawStudents.length > 0) {
          const batch = writeBatch(db);
          rawStudents.forEach((st) => {
            const parseResult = StudentSchema.safeParse(st);
            const validStudent = parseResult.success
              ? parseResult.data
              : {
                  ...(st as Record<string, unknown>),
                  id: (st as { id?: string }).id || crypto.randomUUID(),
                  created_at: (st as { created_at?: string }).created_at || new Date().toISOString(),
                };
            const docRef = doc(db, 'counselors', userId, 'students', validStudent.id as string);
            batch.set(docRef, validStudent);
          });
          await batch.commit();
        }

        // Write migrated sessions in batches
        if (rawSessions.length > 0) {
          const batch = writeBatch(db);
          rawSessions.forEach((sess) => {
            const parseResult = SessionSchema.safeParse(sess);
            const validSession = parseResult.success
              ? parseResult.data
              : {
                  ...(sess as Record<string, unknown>),
                  id: (sess as { id?: string }).id || crypto.randomUUID(),
                  created_at: (sess as { created_at?: string }).created_at || new Date().toISOString(),
                };
            const docRef = doc(db, 'counselors', userId, 'sessions', validSession.id as string);
            batch.set(docRef, validSession);
          });
          await batch.commit();
        }
      }

      // 2. 'demo_rehberlik' ve genel `pusula_students_v1` / `pusula_sessions_v1` anahtarlarını taşıma, SADECE SİL.
      // Ayrıca taşınan kullanıcı anahtarlarını da temizle.
      const keysToDelete = [
        userStudentKey,
        userSessionKey,
        'pusula_students_v1_demo_rehberlik',
        'pusula_sessions_v1_demo_rehberlik',
        'pusula_students_v1',
        'pusula_sessions_v1',
        'pusula_initialized_v1',
      ];
      keysToDelete.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(migrationFlagKey, 'true');
    } catch (err: unknown) {
      console.error('LocalStorage migration failed:', err);
    }
  },

  // Synchronous getters from in-memory verified cache
  getStudents(_userId?: string): Student[] {
    return cachedStudents;
  },

  getSessions(_userId?: string): Session[] {
    return cachedSessions;
  },

  getCounselorName(_userId?: string): string {
    return cachedCounselorName;
  },

  getScheduleConfig(_userId?: string): ScheduleConfig {
    return cachedScheduleConfig;
  },

  async setCounselorName(name: string, userId?: string): Promise<void> {
    const uid = userId || getActiveUserId();
    if (!uid) return;
    cachedCounselorName = name.trim();
    emitChange();
    if (isDemoMode) return;
    try {
      const counselorRef = doc(db, 'counselors', uid);
      await setDoc(counselorRef, { name: name.trim() }, { merge: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Danışman adı kaydedilemedi: ${msg}`);
    }
  },

  /**
   * Add a single student document to counselors/{uid}/students/{studentId}
   * Generates unique identifier with crypto.randomUUID()
   * Validates with Zod StudentSchema
   */
  async addStudent(studentData: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
    const uid = getActiveUserId();
    if (!uid) {
      const errMsg = 'Öğrenci eklemek için oturum açmalısınız.';
      emitError(errMsg);
      throw new Error(errMsg);
    }

    const newId = crypto.randomUUID();
    const newStudent: Student = {
      ...studentData,
      id: newId,
      phone: autoFormatPhone(studentData.phone),
      created_at: new Date().toISOString(),
      last_meeting_date: studentData.last_meeting_date || null,
      status_flags: studentData.status_flags || [],
      target_goal: studentData.target_goal || '',
      notes: studentData.notes || '',
    };

    // Zod validation
    StudentSchema.parse(newStudent);

    // Optimistic update
    cachedStudents = [...cachedStudents, newStudent];
    emitChange();

    if (isDemoMode) {
      return newStudent;
    }

    try {
      const studentDocRef = doc(db, 'counselors', uid, 'students', newId);
      await setDoc(studentDocRef, newStudent);
    } catch (err: unknown) {
      // Rollback on error
      cachedStudents = cachedStudents.filter((s) => s.id !== newId);
      emitChange();
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Öğrenci kaydedilemedi: ${msg}`);
      throw err;
    }

    return newStudent;
  },

  /**
   * Update a single student document at counselors/{uid}/students/{studentId}
   */
  async updateStudent(student: Student): Promise<void> {
    const uid = getActiveUserId();
    if (!uid) return;

    const formatted: Student = {
      ...student,
      phone: autoFormatPhone(student.phone),
    };

    StudentSchema.parse(formatted);

    // Optimistic update
    cachedStudents = cachedStudents.map((s) => (s.id === student.id ? formatted : s));
    emitChange();

    if (isDemoMode) return;

    try {
      const studentDocRef = doc(db, 'counselors', uid, 'students', student.id);
      await updateDoc(studentDocRef, { ...formatted });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Öğrenci güncellenemedi: ${msg}`);
      throw err;
    }
  },

  /**
   * Delete a single student document from counselors/{uid}/students/{studentId}
   * and clean up references in sessions.
   */
  async deleteStudent(studentId: string): Promise<void> {
    const uid = getActiveUserId();
    if (!uid) return;

    // Optimistic
    const prevStudents = [...cachedStudents];
    cachedStudents = cachedStudents.filter((s) => s.id !== studentId);
    
    // Unassign student from any sessions in memory
    cachedSessions = cachedSessions.map((sess) =>
      sess.student_id === studentId ? { ...sess, student_id: null } : sess
    );
    emitChange();

    if (isDemoMode) return;

    try {
      const studentDocRef = doc(db, 'counselors', uid, 'students', studentId);
      await deleteDoc(studentDocRef);

      const affectedSessions = cachedSessions.filter((s) => s.student_id === studentId);
      if (affectedSessions.length > 0) {
        const batch = writeBatch(db);
        affectedSessions.forEach((sess) => {
          const sessRef = doc(db, 'counselors', uid, 'sessions', sess.id);
          batch.update(sessRef, { student_id: null });
        });
        await batch.commit();
      }
    } catch (err: unknown) {
      cachedStudents = prevStudents;
      emitChange();
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Öğrenci silinemedi: ${msg}`);
      throw err;
    }
  },

  /**
   * Add a single session document to counselors/{uid}/sessions/{sessionId}
   * Uses crypto.randomUUID()
   * Validates with Zod SessionSchema
   */
  async addSession(sessionData: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    const uid = getActiveUserId();
    if (!uid) {
      const errMsg = 'Seans eklemek için oturum açmalısınız.';
      emitError(errMsg);
      throw new Error(errMsg);
    }

    const newId = crypto.randomUUID();
    const newSession: Session = {
      ...sessionData,
      id: newId,
      created_at: new Date().toISOString(),
    };

    SessionSchema.parse(newSession);

    // Optimistic
    cachedSessions = [...cachedSessions, newSession].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_slot.localeCompare(b.time_slot);
    });
    emitChange();

    if (isDemoMode) {
      if (newSession.status === 'Geldi' && newSession.student_id) {
        await this.updateStudentLastMeeting(newSession.student_id, newSession.date);
      }
      return newSession;
    }

    try {
      const sessionDocRef = doc(db, 'counselors', uid, 'sessions', newId);
      await setDoc(sessionDocRef, newSession);

      if (newSession.status === 'Geldi' && newSession.student_id) {
        await this.updateStudentLastMeeting(newSession.student_id, newSession.date);
      }
    } catch (err: unknown) {
      cachedSessions = cachedSessions.filter((s) => s.id !== newId);
      emitChange();
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Seans kaydedilemedi: ${msg}`);
      throw err;
    }

    return newSession;
  },

  /**
   * Update a single session document at counselors/{uid}/sessions/{sessionId}
   */
  async updateSession(session: Session): Promise<void> {
    const uid = getActiveUserId();
    if (!uid) return;

    SessionSchema.parse(session);

    // Optimistic
    cachedSessions = cachedSessions.map((s) => (s.id === session.id ? session : s));
    emitChange();

    if (isDemoMode) {
      if (session.status === 'Geldi' && session.student_id) {
        await this.updateStudentLastMeeting(session.student_id, session.date);
      }
      return;
    }

    try {
      const sessionDocRef = doc(db, 'counselors', uid, 'sessions', session.id);
      await setDoc(sessionDocRef, session, { merge: true });

      if (session.status === 'Geldi' && session.student_id) {
        await this.updateStudentLastMeeting(session.student_id, session.date);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Seans güncellenemedi: ${msg}`);
      throw err;
    }
  },

  /**
   * Update multiple sessions at counselors/{uid}/sessions/{sessionId} using writeBatch
   */
  async updateMultipleSessions(updatedList: Session[]): Promise<Session[]> {
    const uid = getActiveUserId();
    if (!uid) return updatedList;

    // Validate all
    updatedList.forEach((s) => SessionSchema.parse(s));

    const updateMap = new Map(updatedList.map((s) => [s.id, s]));
    cachedSessions = cachedSessions.map((s) => updateMap.get(s.id) || s);
    emitChange();

    if (isDemoMode) {
      for (const sess of updatedList) {
        if (sess.status === 'Geldi' && sess.student_id) {
          await this.updateStudentLastMeeting(sess.student_id, sess.date);
        }
      }
      return cachedSessions;
    }

    try {
      const batch = writeBatch(db);
      updatedList.forEach((sess) => {
        const sessRef = doc(db, 'counselors', uid, 'sessions', sess.id);
        batch.set(sessRef, sess, { merge: true });
      });
      await batch.commit();

      // Update student meetings for 'Geldi'
      for (const sess of updatedList) {
        if (sess.status === 'Geldi' && sess.student_id) {
          await this.updateStudentLastMeeting(sess.student_id, sess.date);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Toplu seans güncellenemedi: ${msg}`);
      throw err;
    }

    return cachedSessions;
  },

  /**
   * Delete a single session document from counselors/{uid}/sessions/{sessionId}
   */
  async deleteSession(sessionId: string): Promise<void> {
    const uid = getActiveUserId();
    if (!uid) return;

    const prevSessions = [...cachedSessions];
    cachedSessions = cachedSessions.filter((s) => s.id !== sessionId);
    emitChange();

    if (isDemoMode) return;

    try {
      const sessionDocRef = doc(db, 'counselors', uid, 'sessions', sessionId);
      await deleteDoc(sessionDocRef);
    } catch (err: unknown) {
      cachedSessions = prevSessions;
      emitChange();
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Seans silinemedi: ${msg}`);
      throw err;
    }
  },

  /**
   * Updates student's last meeting date in counselors/{uid}/students/{studentId}
   */
  async updateStudentLastMeeting(studentId: string, meetingDate: string): Promise<void> {
    const uid = getActiveUserId();
    if (!uid) return;

    cachedStudents = cachedStudents.map((s) =>
      s.id === studentId ? { ...s, last_meeting_date: meetingDate } : s
    );
    emitChange();

    if (isDemoMode) return;

    try {
      const studentDocRef = doc(db, 'counselors', uid, 'students', studentId);
      await updateDoc(studentDocRef, { last_meeting_date: meetingDate });
    } catch (err: unknown) {
      console.error('Son görüşme tarihi güncellenemedi:', err);
    }
  },

  /**
   * Save schedule configuration to counselors/{uid}/settings/schedule
   */
  async saveScheduleConfig(config: ScheduleConfig): Promise<void> {
    const uid = getActiveUserId();
    if (!uid) return;

    ScheduleConfigSchema.parse(config);
    cachedScheduleConfig = config;
    emitChange();

    if (isDemoMode) return;

    try {
      const scheduleRef = doc(db, 'counselors', uid, 'settings', 'schedule');
      await setDoc(scheduleRef, { ...config, updated_at: new Date().toISOString() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      emitError(`Çizelge ayarları kaydedilemedi: ${msg}`);
      throw err;
    }
  },

  /**
   * Shift session times for given dates by deltaMinutes
   */
  async shiftSessionsTime(dates: string[], deltaMinutes: number): Promise<Session[]> {
    const uid = getActiveUserId();
    const dateSet = new Set(dates);
    const affected = cachedSessions.filter((s) => dateSet.has(s.date));

    const updated = affected.map((sess) => ({
      ...sess,
      time_slot: shiftTimeSlotString(sess.time_slot, deltaMinutes),
    }));

    if (uid && updated.length > 0) {
      await this.updateMultipleSessions(updated);
    }
    return cachedSessions;
  },

  /**
   * Add an explicit break/recess session document
   */
  async addBreakSession(date: string, time_slot: string, title?: string): Promise<Session[]> {
    const newBreak: Session = {
      id: crypto.randomUUID(),
      date,
      time_slot,
      student_id: null,
      topic: title || 'Teneffüs',
      action_items: '',
      tags: ['Teneffüs'],
      status: 'Bekliyor',
      is_break: true,
      break_title: title || 'Teneffüs / Mola',
      created_at: new Date().toISOString(),
    };

    await this.addSession(newBreak);
    return cachedSessions;
  },

  /**
   * Apply custom configured schedule to specified dates
   */
  async applyScheduleConfigToDates(
    dates: string[],
    config: ScheduleConfig,
    keepAssigned = true
  ): Promise<Session[]> {
    const uid = getActiveUserId();
    await this.saveScheduleConfig(config);

    const dateSet = new Set(dates);
    const existingAssignedMap = new Map<string, Session[]>();

    if (keepAssigned) {
      dates.forEach((d) => {
        const assigned = cachedSessions
          .filter((s) => s.date === d && s.student_id && !s.is_break)
          .sort((a, b) => a.time_slot.localeCompare(b.time_slot));
        existingAssignedMap.set(d, assigned);
      });
    }

    // Delete existing sessions on those dates
    const sessionsToDelete = cachedSessions.filter((s) => dateSet.has(s.date));
    if (!isDemoMode && uid && sessionsToDelete.length > 0) {
      const deleteBatch = writeBatch(db);
      sessionsToDelete.forEach((s) => {
        deleteBatch.delete(doc(db, 'counselors', uid, 'sessions', s.id));
      });
      await deleteBatch.commit();
    }

    const generatedSlots = generateSlotsFromScheduleConfig(config);
    const newSessions: Session[] = [];

    dates.forEach((date) => {
      const assignedForThisDay = [...(existingAssignedMap.get(date) || [])];
      let assignedIndex = 0;

      generatedSlots.forEach((slot) => {
        if (slot.is_break) {
          newSessions.push({
            id: crypto.randomUUID(),
            date,
            time_slot: slot.time_slot,
            student_id: null,
            topic: slot.break_title || 'Teneffüs',
            action_items: '',
            tags: ['Teneffüs'],
            status: 'Bekliyor',
            is_break: true,
            break_title: slot.break_title,
            created_at: new Date().toISOString(),
          });
        } else {
          if (assignedIndex < assignedForThisDay.length) {
            const prevSess = assignedForThisDay[assignedIndex++];
            newSessions.push({
              ...prevSess,
              id: crypto.randomUUID(),
              date,
              time_slot: slot.time_slot,
              is_break: false,
            });
          } else {
            newSessions.push({
              id: crypto.randomUUID(),
              date,
              time_slot: slot.time_slot,
              student_id: null,
              topic: '',
              action_items: '',
              tags: [],
              status: 'Bekliyor',
              is_break: false,
              created_at: new Date().toISOString(),
            });
          }
        }
      });

      while (assignedIndex < assignedForThisDay.length) {
        newSessions.push({
          ...assignedForThisDay[assignedIndex++],
          id: crypto.randomUUID(),
        });
      }
    });

    cachedSessions = [
      ...cachedSessions.filter((s) => !dateSet.has(s.date)),
      ...newSessions,
    ].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_slot.localeCompare(b.time_slot);
    });
    emitChange();

    if (!isDemoMode && uid && newSessions.length > 0) {
      const addBatch = writeBatch(db);
      newSessions.forEach((sess) => {
        addBatch.set(doc(db, 'counselors', uid, 'sessions', sess.id), sess);
      });
      await addBatch.commit();
    }

    return cachedSessions;
  },

  /**
   * Generates standard slots for a single date
   */
  async fillStandardSlotsForDate(date: string): Promise<Session[]> {
    const uid = getActiveUserId();
    const existingForDate = cachedSessions.filter((s) => s.date === date);
    const config = cachedScheduleConfig;
    const generatedSlots = generateSlotsFromScheduleConfig(config);

    const toAdd: Session[] = [];
    generatedSlots.forEach((slot) => {
      const alreadyHas = existingForDate.some((s) => s.time_slot === slot.time_slot);
      if (!alreadyHas) {
        toAdd.push({
          id: crypto.randomUUID(),
          date,
          time_slot: slot.time_slot,
          student_id: null,
          topic: slot.break_title || '',
          action_items: '',
          tags: slot.is_break ? [slot.break_title || 'Teneffüs'] : [],
          status: 'Bekliyor',
          is_break: slot.is_break || false,
          break_title: slot.break_title,
          created_at: new Date().toISOString(),
        });
      }
    });

    if (toAdd.length > 0) {
      cachedSessions = [...cachedSessions, ...toAdd].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time_slot.localeCompare(b.time_slot);
      });
      emitChange();
    }

    if (!isDemoMode && uid && toAdd.length > 0) {
      const batch = writeBatch(db);
      toAdd.forEach((sess) => {
        batch.set(doc(db, 'counselors', uid, 'sessions', sess.id), sess);
      });
      await batch.commit();
    }

    return cachedSessions;
  },

  /**
   * Generates standard slots for all weekdays (Mon-Fri)
   */
  async fillStandardSlotsForWeek(baseDate: string): Promise<Session[]> {
    const uid = getActiveUserId();
    const weekDays = getWeekDays(baseDate, false);
    const config = cachedScheduleConfig;
    const generatedSlots = generateSlotsFromScheduleConfig(config);

    const toAdd: Session[] = [];
    weekDays.forEach((w) => {
      const existingForDay = cachedSessions.filter((s) => s.date === w.date);
      generatedSlots.forEach((slot) => {
        const alreadyHas = existingForDay.some((s) => s.time_slot === slot.time_slot);
        if (!alreadyHas) {
          toAdd.push({
            id: crypto.randomUUID(),
            date: w.date,
            time_slot: slot.time_slot,
            student_id: null,
            topic: slot.break_title || '',
            action_items: '',
            tags: slot.is_break ? [slot.break_title || 'Teneffüs'] : [],
            status: 'Bekliyor',
            is_break: slot.is_break || false,
            break_title: slot.break_title,
            created_at: new Date().toISOString(),
          });
        }
      });
    });

    if (toAdd.length > 0) {
      cachedSessions = [...cachedSessions, ...toAdd].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time_slot.localeCompare(b.time_slot);
      });
      emitChange();
    }

    if (!isDemoMode && uid && toAdd.length > 0) {
      const batch = writeBatch(db);
      toAdd.forEach((sess) => {
        batch.set(doc(db, 'counselors', uid, 'sessions', sess.id), sess);
      });
      await batch.commit();
    }

    return cachedSessions;
  },

  /**
   * Export all counselor data as JSON (for KVKK Data Portability / Backup)
   */
  exportBackupJson(): string {
    const data = {
      students: cachedStudents,
      sessions: cachedSessions,
      counselor_name: cachedCounselorName,
      schedule_config: cachedScheduleConfig,
      version: '2.0',
      exported_at: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  /**
   * Validates and imports JSON backup using Zod BackupImportSchema
   * Returns validation result or throws error with details
   */
  async importBackupJson(jsonString: string): Promise<{ success: boolean; studentCount?: number; sessionCount?: number; error?: string }> {
    try {
      const rawData = JSON.parse(jsonString);

      // Validate with Zod
      const parseResult = BackupImportSchema.safeParse(rawData);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return { success: false, error: `JSON formatı geçersiz: ${issues}` };
      }

      const validated = parseResult.data;
      const uid = getActiveUserId();
      if (!uid) {
        return { success: false, error: 'Veri yüklemek için oturum açmalısınız.' };
      }

      if (isDemoMode) {
        cachedStudents = validated.students;
        cachedSessions = validated.sessions;
        if (validated.counselor_name) cachedCounselorName = validated.counselor_name;
        if (validated.schedule_config) cachedScheduleConfig = validated.schedule_config;
        emitChange();
        return {
          success: true,
          studentCount: validated.students.length,
          sessionCount: validated.sessions.length,
        };
      }

      // Batch write students
      if (validated.students.length > 0) {
        const batch = writeBatch(db);
        validated.students.forEach((st) => {
          const docRef = doc(db, 'counselors', uid, 'students', st.id);
          batch.set(docRef, st);
        });
        await batch.commit();
      }

      // Batch write sessions
      if (validated.sessions.length > 0) {
        const batch = writeBatch(db);
        validated.sessions.forEach((sess) => {
          const docRef = doc(db, 'counselors', uid, 'sessions', sess.id);
          batch.set(docRef, sess);
        });
        await batch.commit();
      }

      if (validated.counselor_name) {
        await this.setCounselorName(validated.counselor_name, uid);
      }

      if (validated.schedule_config) {
        await this.saveScheduleConfig(validated.schedule_config);
      }

      return {
        success: true,
        studentCount: validated.students.length,
        sessionCount: validated.sessions.length,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg || 'JSON dosyası çözümlenemedi.' };
    }
  },

  /**
   * Export students to CSV
   */
  exportToCsv(): string {
    const students = cachedStudents;
    const headers = ['Ad Soyad', 'Sınıf', 'Telefon', 'Son Görüşme', 'Teşhis Etiketleri', 'Hedef'].map((h) => `"${h}"`);
    const rows = students.map((s) => [
      sanitizeCsvCell(s.full_name),
      sanitizeCsvCell(s.class_grade),
      sanitizeCsvCell(s.phone),
      sanitizeCsvCell(s.last_meeting_date || '-'),
      sanitizeCsvCell(s.status_flags.join(', ')),
      sanitizeCsvCell(s.target_goal || ''),
    ]);
    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  },

  /**
   * Mark WhatsApp message as sent on a session
   */
  async markWhatsAppSent(sessionId: string, sent = true): Promise<Session | undefined> {
    const session = cachedSessions.find((s) => s.id === sessionId);
    if (!session) return undefined;
    const updated: Session = {
      ...session,
      whatsapp_sent: sent,
      whatsapp_sent_at: sent ? new Date().toISOString() : undefined,
    };
    await this.updateSession(updated);
    return updated;
  },

  /**
   * Save draft in browser storage to avoid accidental data loss
   */
  saveDraft<T>(key: string, data: T): void {
    try {
      localStorage.setItem(`pusula_draft_${key}`, JSON.stringify({ data, savedAt: Date.now() }));
    } catch (_) {}
  },

  /**
   * Retrieve saved draft
   */
  getDraft<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`pusula_draft_${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data as T;
    } catch (_) {
      return null;
    }
  },

  /**
   * Clear saved draft
   */
  clearDraft(key: string): void {
    try {
      localStorage.removeItem(`pusula_draft_${key}`);
    } catch (_) {}
  },
};
