import { z } from 'zod';
import { SessionStatus, UserRole } from '../types';

export const SessionFeedbackSchema = z.object({
  status: z.enum(['Geldi', 'Gelmedi']),
  submitted_at: z.string(),
  rating: z.number().min(1).max(5).optional(),
  efficiency: z.enum(['Çok Verimli', 'Verimli', 'Orta', 'Düşük Verim']).optional(),
  notes: z.string().optional(),
  next_step: z.string().optional(),
  reason: z.enum(['Mazeretli', 'Hastalık', 'Unuttu', 'İletişim Kurulamadı', 'Diğer']).optional(),
  parent_notified: z.boolean().optional(),
  makeup_session_planned: z.boolean().optional(),
  makeup_date: z.string().optional(),
});

export const StudentSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().min(1, 'Öğrenci adı boş olamaz'),
  class_grade: z.string().default(''),
  phone: z.string().default(''),
  last_meeting_date: z.string().nullable().default(null),
  status_flags: z.array(z.string()).default([]),
  target_goal: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  created_at: z.string().default(() => new Date().toISOString()),
});

export const SessionSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1),
  time_slot: z.string().min(1),
  student_id: z.string().nullable().default(null),
  topic: z.string().default(''),
  action_items: z.string().default(''),
  tags: z.array(z.string()).default([]),
  status: z.enum(['Bekliyor', 'Geldi', 'Gelmedi'] as const).default('Bekliyor'),
  next_followup_date: z.string().optional(),
  created_at: z.string().default(() => new Date().toISOString()),
  is_priority: z.boolean().optional(),
  is_break: z.boolean().optional(),
  break_title: z.string().optional(),
  break_duration: z.number().optional(),
  feedback: SessionFeedbackSchema.optional(),
});

export const ScheduleConfigSchema = z.object({
  sessionDuration: z.number().min(5).max(180).default(15),
  breakDuration: z.number().min(0).max(60).default(5),
  startTime: z.string().default('09:00'),
  sessionCount: z.number().min(1).max(30).default(16),
  includeLunchBreak: z.boolean().default(true),
  lunchBreakAfter: z.number().default(8),
  lunchBreakDuration: z.number().default(45),
});

export const UserRoleSchema = z.enum([
  'Rehber Öğretmen & Psikolojik Danışman',
  'YKS / LGS Öğrenci Koçu',
  'Eğitim Danışmanı',
  'Okul Yöneticisi',
] as const);

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  name: z.string().min(1, 'İsim boş bırakılamaz'),
  role: UserRoleSchema.default('Rehber Öğretmen & Psikolojik Danışman'),
  school: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  created_at: z.string().default(() => new Date().toISOString()),
  avatar_color: z.string().optional().default('bg-emerald-600 text-emerald-100'),
  kvkk_accepted: z.boolean().optional().default(false),
  kvkk_accepted_at: z.string().optional(),
});

export const BackupImportSchema = z.object({
  students: z.array(StudentSchema).default([]),
  sessions: z.array(SessionSchema).default([]),
  counselor_name: z.string().optional(),
  schedule_config: ScheduleConfigSchema.optional(),
  version: z.string().optional(),
  exported_at: z.string().optional(),
});

export type ValidatedStudent = z.infer<typeof StudentSchema>;
export type ValidatedSession = z.infer<typeof SessionSchema>;
export type ValidatedScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export type ValidatedUser = z.infer<typeof UserSchema>;
export type ValidatedBackup = z.infer<typeof BackupImportSchema>;
