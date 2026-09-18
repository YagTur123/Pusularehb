export type SessionStatus = 'Bekliyor' | 'Geldi' | 'Gelmedi';

export interface Student {
  id: string;
  full_name: string;
  class_grade: string; // e.g. "12-A", "Mezun", "11-B"
  phone: string; // e.g. "905551234567"
  last_meeting_date: string | null; // YYYY-MM-DD
  status_flags: string[]; // e.g. ['Net Düşüşü', 'Geometri Eksiği', 'Paragraf Rutini', 'Motivasyon']
  target_goal?: string; // e.g. "Hacettepe Tıp", "İTÜ Bilgisayar"
  notes?: string;
  created_at: string;
}

export interface SessionFeedback {
  status: 'Geldi' | 'Gelmedi';
  submitted_at: string; // ISO timestamp
  // If 'Geldi'
  rating?: number; // 1 to 5
  efficiency?: 'Çok Verimli' | 'Verimli' | 'Orta' | 'Düşük Verim';
  notes?: string;
  next_step?: string;
  // If 'Gelmedi'
  reason?: 'Mazeretli' | 'Hastalık' | 'Unuttu' | 'İletişim Kurulamadı' | 'Diğer';
  parent_notified?: boolean;
  makeup_session_planned?: boolean;
  makeup_date?: string;
}

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  time_slot: string; // e.g. "09:30" or "09:30 - 10:10"
  student_id: string | null;
  topic: string;
  action_items: string; // "Haftalık Hedef/Ödev"
  tags: string[];
  status: SessionStatus;
  next_followup_date?: string;
  created_at: string;
  is_priority?: boolean; // High priority session
  is_break?: boolean; // Teneffüs / Mola bloğu
  break_title?: string; // e.g. "10 dk Teneffüs", "Öğle Arası"
  break_duration?: number; // Teneffüs / mola süresi (dakika)
  feedback?: SessionFeedback;
}

export interface ScheduleConfig {
  sessionDuration: number; // e.g. 40 mins
  breakDuration: number; // e.g. 10 mins
  startTime: string; // e.g. "09:00"
  sessionCount: number; // e.g. 8 sessions
  includeLunchBreak: boolean;
  lunchBreakAfter: number; // after 4th session
  lunchBreakDuration: number; // e.g. 50 mins
}

export interface ParsedStudentRow {
  full_name: string;
  class_grade: string;
  phone: string;
  tags: string[];
  raw: string;
  valid: boolean;
  error?: string;
}

export const DIAGNOSTIC_TAGS = [
  'Net Düşüşü',
  'Geometri Eksiği',
  'Paragraf Rutini',
  'Motivasyon',
  'AYT Matematik',
  'Sınav Kaygısı',
  'Zaman Yönetimi',
  'Deneme Analizi',
  'FKB Çalışması',
  'Kaynak Seçimi',
  'Program Aksatması',
  'Mezun Psikolojisi',
] as const;

export const COMMON_TOPICS = [
  'TYT Deneme Analizi',
  'Haftalık Program Takibi',
  'AYT Matematik Planlama',
  'Sınav Kaygısı & Motivasyon',
  'Hedef ve Sıralama Analizi',
  'Geometri & Paragraf Rutini',
  'Meslek & Üniversite Tanıtımı',
  'Ders Çalışma Stratejisi',
] as const;

export type UserRole =
  | 'Rehber Öğretmen & Psikolojik Danışman'
  | 'YKS / LGS Öğrenci Koçu'
  | 'Eğitim Danışmanı'
  | 'Okul Yöneticisi';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  school?: string;
  phone?: string;
  created_at: string;
  avatar_color?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
