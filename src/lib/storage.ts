import { Student, Session } from '../types';

const STORAGE_KEYS = {
  STUDENTS: 'pusula_students_v1',
  SESSIONS: 'pusula_sessions_v1',
  INITIALIZED: 'pusula_initialized_v1',
  COUNSELOR_NAME: 'pusula_counselor_name_v1',
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
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });
  } catch {
    return dateStr;
  }
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
    phone: '905551112233',
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
    phone: '905552223344',
    last_meeting_date: getTodayDateString(),
    status_flags: ['Motivasyon', 'Paragraf Rutini'],
    target_goal: 'Boğaziçi İşletme',
    notes: 'Mezun psikolojisi, deneme sıklığı haftada 2 olacak.',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'std_3',
    full_name: 'Emre Can Öztürk',
    class_grade: '12-B',
    phone: '905553334455',
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
    phone: '905554445566',
    last_meeting_date: shiftDateString(getTodayDateString(), -25), // 25 gün önce (Risk Radarı)
    status_flags: ['Sınav Kaygısı', 'Net Düşüşü'],
    target_goal: 'Cerrahpaşa Tıp Fakültesi',
    notes: '20+ gündür görüşülmedi. Acil randevu atanmalı.',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'std_5',
    full_name: 'Berkay Şahin',
    class_grade: '12-C',
    phone: '905556667788',
    last_meeting_date: shiftDateString(getTodayDateString(), -22), // 22 gün önce (Risk Radarı)
    status_flags: ['Program Aksatması'],
    target_goal: 'Yıldız Teknik Makine',
    notes: 'Program aksatıyor, veli görüşmesi gerekebilir.',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: 'std_6',
    full_name: 'Selin Arslan',
    class_grade: 'Mezun',
    phone: '905557778899',
    last_meeting_date: shiftDateString(getTodayDateString(), -2),
    status_flags: ['Paragraf Rutini', 'Deneme Analizi'],
    target_goal: 'Hacettepe Hukuk',
    notes: 'Son seansa gelmedi.',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'std_7',
    full_name: 'Kaan Yıldırım',
    class_grade: '12-A',
    phone: '905558889900',
    last_meeting_date: shiftDateString(getTodayDateString(), -10),
    status_flags: ['FKB Çalışması', 'AYT Matematik'],
    target_goal: 'Koç Endüstri Mühendisliği',
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
      action_items: 'Günlük 30 paragraf + Haftalık 2 TYT Türkçe denemesi.',
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
      action_items: 'Sosyal deneme çözümleri ve sabah 08:30 kütüphane başlangıcı.',
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
      action_items: 'Önceki hafta kaçırılan seans telafisi yapılacak.',
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
      action_items: 'Randevuya katılmadı.',
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
      return JSON.parse(data);
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
