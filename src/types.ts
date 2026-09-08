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
