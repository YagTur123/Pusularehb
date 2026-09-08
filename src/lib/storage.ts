import { Student, Session, ScheduleConfig } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'pusula_students_v1',
  SESSIONS: 'pusula_sessions_v1',
  INITIALIZED: 'pusula_initialized_v1',
  COUNSELOR_NAME: 'pusula_counselor_name_v1',
  SCHEDULE_CONFIG: 'pusula_schedule_config_v1',
};

export function autoFormatPhone(raw: string): string {
  if (!raw) return '';
  // Strip all non-digits
  let digits = raw.replace(/\D/g, '');

  if (digits.startsWith('0')) {
    digits = '9' + digits;
  } else if (digits.startsWith('5')) {
    digits = '90' + digits;
  } else if (digits.startsWith('90')) {
    // already starts with 90
  }

  // Cap at 12 digits (905xxxxxxxxx)
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
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    const days = [
      'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
    ];
    const monthName = months[date.getMonth()];
    const dayName = days[date.getDay()];
    return `${day} ${monthName} ${y}, ${dayName}`;
  } catch {
    return dateStr;
  }
}

export interface WeekDayInfo {
  date: string; // YYYY-MM-DD
  dayName: string; // Pazartesi, Salı...
  shortDayName: string; // Pzt, Sal...
  dayNumber: number; // 8
  isToday: boolean;
  isPast: boolean;
}

export function getWeekDays(baseDate: string, includeWeekend = false): WeekDayInfo[] {
  const [y, m, d] = baseDate.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon...
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

  const firstDayWeekDay = firstDay.getDay(); // 0=Sun, 1=Mon...
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
  sessionDuration: 40,
  breakDuration: 10,
  startTime: '09:00',
  sessionCount: 8,
  includeLunchBreak: true,
  lunchBreakAfter: 4,
  lunchBreakDuration: 50,
};

export function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr) return '09:00';
  const clean = timeStr.trim();
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;
  let totalMins = h * 60 + m + minutes;
  // keep within positive 24h
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
    // Add lesson/counseling slot
    slots.push({
      time_slot: currentTime,
    });

    if (i < config.sessionCount) {
      // Check lunch break
      if (config.includeLunchBreak && i === config.lunchBreakAfter) {
        const lunchEnd = addMinutesToTime(sessionEnd, config.lunchBreakDuration);
        slots.push({
          time_slot: sessionEnd,
          is_break: true,
          break_title: `${config.lunchBreakDuration} dk Öğle Arası & Yemek`,
        });
        currentTime = lunchEnd;
      } else if (config.breakDuration > 0) {
        // Standard recess / break
        const breakEnd = addMinutesToTime(sessionEnd, config.breakDuration);
        slots.push({
          time_slot: sessionEnd,
          is_break: true,
          break_title: `${config.breakDuration} dk Teneffüs`,
        });
        currentTime = breakEnd;
      } else {
        currentTime = sessionEnd;
      }
    }
  }

  return slots;
}

// Generate default 40-min slots with 10-min breaks
export function generateDefaultTimeSlots(): string[] {
  return [
    '09:00',
    '09:50',
    '10:40',
    '11:30',
    '12:20', // Öğle arası öncesi son seans
    '13:30', // Öğle arası sonrası
    '14:20',
    '15:10',
    '16:00',
  ];
}

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std_1',
    full_name: 'Ahmet Yılmaz',
    class_grade: '12-A',
    phone: '905324182914',
    last_meeting_date: getTodayDateString(),
    status_flags: ['Net Düşüşü', 'Geometri Eksiği'],
    target_goal: 'İTÜ Bilgisayar Mühendisliği',
    notes: 'TYT Fen ve Geometri kaynaklarını bitirme aşamasında.',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'std_2',
    full_name: 'Ayşe Demir',
    class_grade: 'Mezun',
    phone: '905438201945',
    last_meeting_date: getTodayDateString(),
    status_flags: ['Motivasyon', 'Paragraf Rutini'],
    target_goal: '',
    notes: 'Mezun psikolojisi, deneme sıklığı haftada 2 olacak.',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'std_3',
    full_name: 'Emre Can Öztürk',
    class_grade: '12-B',
    phone: '905056714289',
    last_meeting_date: getTodayDateString(),
    status_flags: ['AYT Matematik', 'Zaman Yönetimi'],
    target_goal: 'ODTÜ Elektrik-Elektronik',
    notes: 'Türev-İntegral fasikülü ödevi verildi.',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'std_4',
    full_name: 'Zeynep Kaya',
    class_grade: '11-A',
    phone: '905359124038',
    last_meeting_date: shiftDateString(getTodayDateString(), -25), // 25 gün önce (Risk Radarı)
    status_flags: ['Sınav Kaygısı', 'Net Düşüşü'],
    target_goal: '',
    notes: '20+ gündür görüşülmedi. Acil randevu atanmalı.',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'std_5',
    full_name: 'Berkay Şahin',
    class_grade: '12-C',
    phone: '905362948172',
    last_meeting_date: shiftDateString(getTodayDateString(), -22), // 22 gün önce (Risk Radarı)
    status_flags: ['Program Aksatması'],
    target_goal: '',
    notes: 'Program aksatıyor, veli görüşmesi gerekebilir.',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'std_6',
    full_name: 'Selin Arslan',
    class_grade: 'Mezun',
    phone: '905447193825',
    last_meeting_date: shiftDateString(getTodayDateString(), -2),
    status_flags: ['Paragraf Rutini', 'Deneme Analizi'],
    target_goal: '',
    notes: 'Son seansa gelmedi.',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'std_7',
    full_name: 'Kaan Yıldırım',
    class_grade: '12-A',
    phone: '905336021874',
    last_meeting_date: shiftDateString(getTodayDateString(), -10),
    status_flags: ['FKB Çalışması', 'AYT Matematik'],
    target_goal: '',
    notes: 'AYT Fizik denemeleri incelenecek.',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

function getInitialSessions(): Session[] {
  const today = getTodayDateString();
  const yesterday = shiftDateString(today, -1);
  const nextWeek = shiftDateString(today, 7);

  return [
    {
      id: 'sess_1',
      date: today,
      time_slot: '09:30',
      student_id: 'std_1',
      topic: 'TYT Analiz & Net Takibi',
      action_items: 'Geometri soru bankası taraması.',
      tags: ['Net Düşüşü', 'Geometri Eksiği'],
      status: 'Geldi',
      next_followup_date: nextWeek,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sess_2',
      date: today,
      time_slot: '10:15',
      student_id: 'std_2',
      topic: 'Hedef Belirleme & Mezun Rutini',
      action_items: '',
      tags: ['Motivasyon', 'Paragraf Rutini'],
      status: 'Bekliyor',
      next_followup_date: nextWeek,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sess_3',
      date: today,
      time_slot: '11:10',
      student_id: 'std_3',
      topic: 'AYT Matematik & Soru Kampı',
      action_items: 'Fonksiyonlar ve Polinomlar soru bankası taraması.',
      tags: ['AYT Matematik'],
      status: 'Bekliyor',
      next_followup_date: nextWeek,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sess_4',
      date: today,
      time_slot: '13:30',
      student_id: 'std_6',
      topic: 'Randevu Telafisi & Deneme Analizi',
      action_items: '',
      tags: ['Deneme Analizi'],
      status: 'Gelmedi',
      next_followup_date: nextWeek,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sess_5',
      date: today,
      time_slot: '14:20',
      student_id: null,
      topic: '',
      action_items: '',
      tags: [],
      status: 'Bekliyor',
      created_at: new Date().toISOString(),
    },
    // Dünkü görüşmeler
    {
      id: 'sess_past_1',
      date: yesterday,
      time_slot: '10:00',
      student_id: 'std_6',
      topic: 'YKS Haftalık Çizelge',
      action_items: '',
      tags: ['Program Aksatması'],
      status: 'Gelmedi',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'sess_past_2',
      date: yesterday,
      time_slot: '11:00',
      student_id: 'std_7',
      topic: 'AYT Fen Programı',
      action_items: 'Fizik optik tekrarı yapıldı.',
      tags: ['FKB Çalışması'],
      status: 'Geldi',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];
}

export const StorageService = {
  getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (!data) {
        this.saveStudents(INITIAL_STUDENTS);
        return INITIAL_STUDENTS;
      }
      const parsed: Student[] = JSON.parse(data);
      let migrated = false;
      const realisticMap: Record<string, string> = {
        std_1: '905324182914',
        std_2: '905438201945',
        std_3: '905056714289',
        std_4: '905359124038',
        std_5: '905362948172',
        std_6: '905447193825',
        std_7: '905336021874',
      };
      const cleaned = parsed.map((s) => {
        if (s.phone && (s.phone.includes('1112233') || s.phone.includes('2223344') || s.phone.includes('3334455') || s.phone.includes('4445566') || s.phone.includes('6667788') || s.phone.includes('7778899') || s.phone.includes('8889900'))) {
          migrated = true;
          return { ...s, phone: realisticMap[s.id] || ('9053' + Math.floor(10000000 + Math.random() * 90000000).toString().slice(0, 8)) };
        }
        return s;
      });
      if (migrated) {
        this.saveStudents(cleaned);
        return cleaned;
      }
      return parsed;
    } catch {
      return INITIAL_STUDENTS;
    }
  },

  saveStudents(students: Student[]) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },

  getSessions(): Session[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!data) {
        const initial = getInitialSessions();
        this.saveSessions(initial);
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return getInitialSessions();
    }
  },

  saveSessions(sessions: Session[]) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getCounselorName(): string {
    return localStorage.getItem(STORAGE_KEYS.COUNSELOR_NAME) || 'Rehberlik & Psikolojik Danışmanlık Birimi';
  },

  setCounselorName(name: string) {
    localStorage.setItem(STORAGE_KEYS.COUNSELOR_NAME, name);
  },

  addStudent(student: Omit<Student, 'id' | 'created_at'>): Student {
    const students = this.getStudents();
    const newStudent: Student = {
      ...student,
      id: 'std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      phone: autoFormatPhone(student.phone),
      created_at: new Date().toISOString(),
    };
    students.push(newStudent);
    this.saveStudents(students);
    return newStudent;
  },

  updateStudent(student: Student) {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.id === student.id);
    if (idx !== -1) {
      students[idx] = {
        ...student,
        phone: autoFormatPhone(student.phone),
      };
      this.saveStudents(students);
    }
  },

  deleteStudent(id: string) {
    const students = this.getStudents().filter((s) => s.id !== id);
    this.saveStudents(students);
    // Also remove reference in sessions
    const sessions = this.getSessions().map((sess) =>
      sess.student_id === id ? { ...sess, student_id: null } : sess
    );
    this.saveSessions(sessions);
  },

  addSession(session: Omit<Session, 'id' | 'created_at'>): Session {
    const sessions = this.getSessions();
    const newSession: Session = {
      ...session,
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      created_at: new Date().toISOString(),
    };
    sessions.push(newSession);
    this.saveSessions(sessions);

    // If marked "Geldi", update student's last_meeting_date
    if (newSession.status === 'Geldi' && newSession.student_id) {
      this.updateStudentLastMeeting(newSession.student_id, newSession.date);
    }

    return newSession;
  },

  updateSession(session: Session) {
    const sessions = this.getSessions();
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
      this.saveSessions(sessions);

      if (session.status === 'Geldi' && session.student_id) {
        this.updateStudentLastMeeting(session.student_id, session.date);
      }
    }
  },

  deleteSession(id: string) {
    const sessions = this.getSessions().filter((s) => s.id !== id);
    this.saveSessions(sessions);
  },

  updateStudentLastMeeting(studentId: string, meetingDate: string) {
    const students = this.getStudents();
    const idx = students.findIndex((s) => s.id === studentId);
    if (idx !== -1) {
      students[idx].last_meeting_date = meetingDate;
      this.saveStudents(students);
    }
  },

  getScheduleConfig(): ScheduleConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE_CONFIG);
      if (!data) return DEFAULT_SCHEDULE_CONFIG;
      return { ...DEFAULT_SCHEDULE_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SCHEDULE_CONFIG;
    }
  },

  saveScheduleConfig(config: ScheduleConfig) {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE_CONFIG, JSON.stringify(config));
  },

  // Shift session times for given dates by deltaMinutes
  shiftSessionsTime(dates: string[], deltaMinutes: number): Session[] {
    const dateSet = new Set(dates);
    const sessions = this.getSessions();
    const updated = sessions.map((sess) => {
      if (dateSet.has(sess.date)) {
        return {
          ...sess,
          time_slot: shiftTimeSlotString(sess.time_slot, deltaMinutes),
        };
      }
      return sess;
    });

    updated.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_slot.localeCompare(b.time_slot);
    });

    this.saveSessions(updated);
    return updated;
  },

  // Add an explicit break/recess session
  addBreakSession(date: string, time_slot: string, title?: string): Session[] {
    const sessions = this.getSessions();
    const newBreak: Session = {
      id: 'break_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
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

    sessions.push(newBreak);
    sessions.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_slot.localeCompare(b.time_slot);
    });

    this.saveSessions(sessions);
    return sessions;
  },

  // Apply custom configured schedule (duration, break, start time) to specified dates
  applyScheduleConfigToDates(
    dates: string[],
    config: ScheduleConfig,
    keepAssigned = true
  ): Session[] {
    this.saveScheduleConfig(config);
    const dateSet = new Set(dates);
    const currentSessions = this.getSessions();

    // Map existing assigned sessions per date
    const existingAssignedMap = new Map<string, Session[]>();
    if (keepAssigned) {
      dates.forEach((d) => {
        const assigned = currentSessions
          .filter((s) => s.date === d && s.student_id && !s.is_break)
          .sort((a, b) => a.time_slot.localeCompare(b.time_slot));
        existingAssignedMap.set(d, assigned);
      });
    }

    // Retain sessions on other dates
    const preservedSessions = currentSessions.filter((s) => !dateSet.has(s.date));

    // Generate slots according to config
    const generatedSlots = generateSlotsFromScheduleConfig(config);
    const newSessionsForDates: Session[] = [];

    dates.forEach((date) => {
      const assignedForThisDay = [...(existingAssignedMap.get(date) || [])];
      let assignedIndex = 0;

      generatedSlots.forEach((slot) => {
        if (slot.is_break) {
          // Break slot
          newSessionsForDates.push({
            id: 'break_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
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
          // Regular lesson slot
          if (assignedIndex < assignedForThisDay.length) {
            // Re-assign previous student session to this slot
            const prevSess = assignedForThisDay[assignedIndex++];
            newSessionsForDates.push({
              ...prevSess,
              id: prevSess.id || 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
              date,
              time_slot: slot.time_slot,
              is_break: false,
            });
          } else {
            // New empty slot
            newSessionsForDates.push({
              id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
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

      // If there were more assigned students than available slots, preserve the remainder
      while (assignedIndex < assignedForThisDay.length) {
        const leftover = assignedForThisDay[assignedIndex++];
        newSessionsForDates.push(leftover);
      }
    });

    const finalSessions = [...preservedSessions, ...newSessionsForDates];
    finalSessions.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_slot.localeCompare(b.time_slot);
    });

    this.saveSessions(finalSessions);
    return finalSessions;
  },

  // Generates 40 min slots with 10 min break
  fillStandardSlotsForDate(date: string): Session[] {
    const existing = this.getSessions();
    const existingForDate = existing.filter((s) => s.date === date);

    const standardSlots = generateDefaultTimeSlots();
    const newSessions: Session[] = [...existing];

    standardSlots.forEach((slot) => {
      const alreadyHas = existingForDate.some((s) => s.time_slot === slot);
      if (!alreadyHas) {
        newSessions.push({
          id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          date,
          time_slot: slot,
          student_id: null,
          topic: '',
          action_items: '',
          tags: [],
          status: 'Bekliyor',
          created_at: new Date().toISOString(),
        });
      }
    });

    // Sort by time_slot
    newSessions.sort((a, b) => a.time_slot.localeCompare(b.time_slot));
    this.saveSessions(newSessions);
    return newSessions;
  },

  // Populates standard slots for all weekdays (Mon-Fri) of the week
  fillStandardSlotsForWeek(baseDate: string): Session[] {
    const weekDays = getWeekDays(baseDate, false);
    let allSessions = this.getSessions();
    const standardSlots = generateDefaultTimeSlots();

    weekDays.forEach((w) => {
      const existingForDay = allSessions.filter((s) => s.date === w.date);
      standardSlots.forEach((slot) => {
        const alreadyHas = existingForDay.some((s) => s.time_slot === slot);
        if (!alreadyHas) {
          allSessions.push({
            id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: w.date,
            time_slot: slot,
            student_id: null,
            topic: '',
            action_items: '',
            tags: [],
            status: 'Bekliyor',
            created_at: new Date().toISOString(),
          });
        }
      });
    });

    allSessions.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_slot.localeCompare(b.time_slot);
    });

    this.saveSessions(allSessions);
    return allSessions;
  },

  exportBackupJson(): string {
    const data = {
      students: this.getStudents(),
      sessions: this.getSessions(),
      counselor_name: this.getCounselorName(),
      version: '1.0',
      exported_at: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  },

  importBackupJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.students) && Array.isArray(data.sessions)) {
        this.saveStudents(data.students);
        this.saveSessions(data.sessions);
        if (data.counselor_name) {
          this.setCounselorName(data.counselor_name);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  exportToCsv(): string {
    const students = this.getStudents();
    const headers = ['Ad Soyad', 'Sınıf', 'Telefon', 'Son Görüşme', 'Teşhis Etiketleri', 'Hedef'];
    const rows = students.map((s) => [
      `"${s.full_name}"`,
      `"${s.class_grade}"`,
      `"${s.phone}"`,
      `"${s.last_meeting_date || '-'}"`,
      `"${s.status_flags.join(', ')}"`,
      `"${s.target_goal || ''}"`,
    ]);
    return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  },
};
