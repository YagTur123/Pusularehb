import React, { useState, useMemo } from 'react';
import { Session, Student, COMMON_TOPICS, ScheduleConfig } from '../types';
import {
  Plus,
  Check,
  AlertTriangle,
  Clock,
  MessageSquare,
  Sparkles,
  Zap,
  Phone,
  X,
  ExternalLink,
  Search,
  Star,
  Coffee,
  Utensils,
  Sliders,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Filter,
} from 'lucide-react';
import {
  getWeekDays,
  generateDefaultTimeSlots,
  displayPhone,
  formatTurkishDate,
  StorageService,
  WeekDayInfo,
} from '../lib/storage';
import {
  generateIndividualSummaryText,
  generateMissedSessionReminderText,
  getWhatsAppDirectUrl,
} from '../lib/whatsapp';
import { ScheduleConfigModal } from './ScheduleConfigModal';

interface WeeklySchedulerGridProps {
  baseDate: string;
  onSelectDate: (date: string) => void;
  sessions: Session[];
  students: Student[];
  counselorName: string;
  onUpdateSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
  onAddSession: (session: Omit<Session, 'id' | 'created_at'>) => void;
  onFillStandardSlots: (date: string) => void;
  onFillStandardWeek?: (baseDate: string) => void;
  onOpenBroadcast: (date?: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  onOpenStudentProfile: (student: Student) => void;
  onApplyScheduleConfig?: (dates: string[], config: ScheduleConfig, keepAssigned: boolean) => void;
  onShiftTime?: (dates: string[], deltaMinutes: number) => void;
  onAddBreak?: (date: string, timeSlot: string, title?: string) => void;
}

export function WeeklySchedulerGrid({
  baseDate,
  onSelectDate,
  sessions,
  students,
  counselorName,
  onUpdateSession,
  onDeleteSession,
  onAddSession,
  onFillStandardSlots,
  onFillStandardWeek,
  onOpenBroadcast,
  onShowToast,
  onOpenStudentProfile,
  onApplyScheduleConfig,
  onShiftTime,
  onAddBreak,
}: WeeklySchedulerGridProps) {
  const [includeWeekend, setIncludeWeekend] = useState(false);
  const [isScheduleConfigOpen, setIsScheduleConfigOpen] = useState(false);
  const [activeAssignSlot, setActiveAssignSlot] = useState<{
    date: string;
    time_slot: string;
    sessionId?: string;
  } | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [quickEditingSession, setQuickEditingSession] = useState<Session | null>(null);
  const [showOnlyPriority, setShowOnlyPriority] = useState(false);
  const [quickShiftMenuOpen, setQuickShiftMenuOpen] = useState(false);
  const [quickBarOpen, setQuickBarOpen] = useState(false);
  const [spotlightCollapsed, setSpotlightCollapsed] = useState(false);
  const [quickSessionMinutes, setQuickSessionMinutes] = useState<number>(40);
  const [quickBreakMinutes, setQuickBreakMinutes] = useState<number>(10);
  const [quickBreakModal, setQuickBreakModal] = useState<{
    open: boolean;
    date: string;
    time: string;
    title: string;
  }>({
    open: false,
    date: baseDate,
    time: '10:10',
    title: '10 dk Teneffüs',
  });

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const weekDays = useMemo(() => getWeekDays(baseDate, includeWeekend), [baseDate, includeWeekend]);

  const weekDatesSet = useMemo(() => new Set(weekDays.map((d) => d.date)), [weekDays]);

  const weekSessions = useMemo(() => {
    return sessions.filter((s) => weekDatesSet.has(s.date));
  }, [sessions, weekDatesSet]);

  // Helper to determine if a session is High-Priority
  const isHighPriority = (session: Session): boolean => {
    if (session.is_priority) return true;
    if (session.status === 'Gelmedi') return true;
    if (session.student_id) {
      const student = studentMap.get(session.student_id);
      if (student?.status_flags && student.status_flags.length > 0) {
        const criticalKeywords = ['Net Düşüşü', 'Kritik Risk', 'Sınav Kaygısı', 'Motivasyon', 'Program Aksatması', 'Devamsızlık'];
        return student.status_flags.some((flag) =>
          criticalKeywords.some((crit) => flag.toLowerCase().includes(crit.toLowerCase()))
        );
      }
    }
    return false;
  };

  // Quick stats for this week
  const weekStats = useMemo(() => {
    const total = weekSessions.filter((s) => !s.is_break).length;
    const filled = weekSessions.filter((s) => s.student_id && !s.is_break).length;
    const attended = weekSessions.filter((s) => s.status === 'Geldi' && !s.is_break).length;
    const missed = weekSessions.filter((s) => s.status === 'Gelmedi' && !s.is_break).length;
    const priorityCount = weekSessions.filter((s) => isHighPriority(s) && !s.is_break).length;
    const breaks = weekSessions.filter((s) => s.is_break).length;
    const empty = total - filled;
    return { total, filled, attended, missed, priorityCount, breaks, empty };
  }, [weekSessions, studentMap]);

  // Distinct high-priority sessions for the week's spotlight
  const prioritySessionsThisWeek = useMemo(() => {
    return weekSessions
      .filter((s) => s.student_id && !s.is_break && isHighPriority(s))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time_slot.localeCompare(b.time_slot);
      });
  }, [weekSessions, studentMap]);

  // Filter students for slot assignment
  const filteredStudents = useMemo(() => {
    if (!assignSearch.trim()) return students.slice(0, 7);
    const q = assignSearch.toLowerCase();
    return students
      .filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.class_grade.toLowerCase().includes(q) ||
          s.phone.includes(q)
      )
      .slice(0, 8);
  }, [students, assignSearch]);

  const handleAssignStudent = (student: Student) => {
    if (!activeAssignSlot) return;

    if (activeAssignSlot.sessionId) {
      const existing = sessions.find((s) => s.id === activeAssignSlot.sessionId);
      if (existing) {
        onUpdateSession({
          ...existing,
          student_id: student.id,
          topic:
            existing.topic ||
            (student.status_flags?.[0]
              ? `${student.status_flags[0]} Takibi`
              : 'TYT Deneme & Hedef Analizi'),
          tags:
            existing.tags.length === 0 && student.status_flags
              ? [...student.status_flags]
              : existing.tags,
          is_break: false,
        });
      }
    } else {
      onAddSession({
        date: activeAssignSlot.date,
        time_slot: activeAssignSlot.time_slot,
        student_id: student.id,
        topic: student.status_flags?.[0]
          ? `${student.status_flags[0]} Takibi`
          : 'Bireysel Danışmanlık',
        action_items: '',
        tags: student.status_flags || [],
        status: 'Bekliyor',
        is_break: false,
      });
    }

    setActiveAssignSlot(null);
    setAssignSearch('');
    onShowToast(
      'Öğrenci Seansa Yerleştirildi',
      `${student.full_name} (${activeAssignSlot.time_slot}) seansına atandı.`,
      'success'
    );
  };

  const handleCreateEmptySlot = (date: string, time_slot: string) => {
    onAddSession({
      date,
      time_slot,
      student_id: null,
      topic: '',
      action_items: '',
      tags: [],
      status: 'Bekliyor',
      is_break: false,
    });
    onShowToast('Yeni Seans Saati Açıldı', `${time_slot} saati için boş seans oluşturuldu.`, 'info');
  };

  const handleTogglePriority = (session: Session, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = {
      ...session,
      is_priority: !session.is_priority,
    };
    onUpdateSession(updated);
    onShowToast(
      updated.is_priority ? 'Öncelikli Seans Olarak İşaretlendi' : 'Öncelik İşareti Kaldırıldı',
      `${session.time_slot} seansı güncellendi.`,
      'info'
    );
  };

  const handleToggleStatus = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: Record<string, 'Bekliyor' | 'Geldi' | 'Gelmedi'> = {
      Bekliyor: 'Geldi',
      Geldi: 'Gelmedi',
      Gelmedi: 'Bekliyor',
    };
    const updated: Session = { ...session, status: nextStatus[session.status] || 'Bekliyor' };
    onUpdateSession(updated);

    const student = session.student_id ? studentMap.get(session.student_id) : undefined;
    onShowToast(
      `Durum: ${updated.status}`,
      student ? `${student.full_name} için seans durumu güncellendi.` : 'Seans durumu değiştirildi.',
      'info'
    );
  };

  const handleSendWhatsAppSummary = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session.student_id) return;
    const student = studentMap.get(session.student_id);
    if (!student) return;

    const text = generateIndividualSummaryText(session, student, counselorName);
    const url = getWhatsAppDirectUrl(student.phone, text);
    window.open(url, '_blank');
    onShowToast('WhatsApp Özeti Açıldı', `${student.full_name} için mesaj hazırlandı.`, 'success');
  };

  // Schedule config delegates
  const handleApplyScheduleConfig = (
    dates: string[],
    config: ScheduleConfig,
    keepAssigned: boolean
  ) => {
    if (onApplyScheduleConfig) {
      onApplyScheduleConfig(dates, config, keepAssigned);
    } else {
      const updated = StorageService.applyScheduleConfigToDates(dates, config, keepAssigned);
      updated.forEach((s) => onUpdateSession(s));
    }
  };

  const handleShiftTime = (dates: string[], deltaMinutes: number) => {
    if (onShiftTime) {
      onShiftTime(dates, deltaMinutes);
    } else {
      StorageService.shiftSessionsTime(dates, deltaMinutes);
      window.location.reload();
    }
  };

  const handleAddBreak = (date: string, timeSlot: string, title?: string) => {
    if (onAddBreak) {
      onAddBreak(date, timeSlot, title);
    } else {
      StorageService.addBreakSession(date, timeSlot, title);
      window.location.reload();
    }
  };

  const targetWeekDates = useMemo(() => weekDays.map((d) => d.date), [weekDays]);

  return (
    <div className="space-y-4">
      {/* Top Header & Schedule Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0a0c10] p-3 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-sm">
        {/* Left: Summary Metrics & Visual Filter */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
            <span className="text-slate-600 dark:text-zinc-400 font-medium">Haftalık Seans:</span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">{weekStats.total}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-500/25 text-emerald-900 dark:text-emerald-300 font-medium">
            <span>Dolu:</span>
            <span className="font-semibold font-mono">{weekStats.filled}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-slate-800 dark:text-zinc-300 font-medium">
            <span>Tamamlanan:</span>
            <span className="font-semibold font-mono text-slate-900 dark:text-white">{weekStats.attended}</span>
          </div>

          {weekStats.missed > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-500/25 text-rose-900 dark:text-rose-300 font-medium">
              <span>Gelmeyen:</span>
              <span className="font-semibold font-mono">{weekStats.missed}</span>
            </div>
          )}

          {/* High-priority badge count */}
          {weekStats.priorityCount > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyPriority(!showOnlyPriority)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                showOnlyPriority
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-1 ring-amber-400/40'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-300 hover:bg-amber-900/30'
              }`}
              title="Yalnızca öncelikli / kritik seansları vurgula veya filtrele"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{weekStats.priorityCount} Öncelikli Seans</span>
            </button>
          )}

          {weekStats.breaks > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
              <Coffee className="w-3 h-3 text-amber-400/70" />
              <span>{weekStats.breaks} Mola</span>
            </div>
          )}
        </div>

        {/* Right: The Requested Standard Schedule / Recess / Shift Configurator Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PRIMARY REQUESTED BUTTON: Standard Program, Period & Recess Configurator */}
          <button
            type="button"
            onClick={() => setIsScheduleConfigOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-700/90 hover:bg-emerald-600 text-white text-xs font-medium border border-emerald-600/40 shadow-xs transition-all cursor-pointer active:scale-[0.98]"
            title="Seans dakikası, teneffüs süresi belirle, tablo saatlerini kaydır ve teneffüs ekle"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Standart Program & Teneffüs Sihirbazı</span>
          </button>

          {/* Quick Bar Toggle */}
          <button
            type="button"
            onClick={() => setQuickBarOpen(!quickBarOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              quickBarOpen
                ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                : 'bg-[#151722] hover:bg-[#1a1d2b] text-zinc-300 hover:text-white border-white/[0.08]'
            }`}
            title="Hızlı program dakikaları, ara ve saat kaydırma çubuğunu aç/kapat"
          >
            <Zap className="w-3.5 h-3.5 text-zinc-400" />
            <span>Hızlı Çubuk</span>
          </button>

          {/* Quick Shift Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickShiftMenuOpen(!quickShiftMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#151722] hover:bg-[#1a1d2b] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
              title="Tüm tablodaki saatleri hızlı kaydır"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>±10 dk Kaydır</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {quickShiftMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-48 bg-[#181a26] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 z-40 space-y-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setQuickShiftMenuOpen(false)}
              >
                <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-zinc-500 border-b border-white/[0.06]">
                  Haftalık Saatleri Kaydır
                </div>
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, 10)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-200 flex items-center justify-between cursor-pointer"
                >
                  <span>10 Dakika İleri</span>
                  <span className="font-mono text-[11px] text-zinc-400">+10 dk</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, -10)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-200 flex items-center justify-between cursor-pointer"
                >
                  <span>10 Dakika Geri</span>
                  <span className="font-mono text-[11px] text-zinc-400">-10 dk</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, 15)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-200 flex items-center justify-between cursor-pointer"
                >
                  <span>15 Dakika İleri</span>
                  <span className="font-mono text-[11px] text-zinc-400">+15 dk</span>
                </button>
                <div className="border-t border-white/[0.06] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduleConfigOpen(true);
                      setQuickShiftMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                  >
                    Detaylı Sihirbazı Aç...
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Add Break / Recess Button */}
          <button
            type="button"
            onClick={() =>
              setQuickBreakModal({
                open: true,
                date: baseDate,
                time: '10:10',
                title: '10 dk Teneffüs',
              })
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1c1a16] hover:bg-[#25221d] text-amber-200/90 hover:text-amber-100 border border-amber-500/20 text-xs font-medium transition-colors cursor-pointer"
            title="Tabloya anında teneffüs / mola bloğu ekle"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-300/80" />
            <span>+ Teneffüs Ekle</span>
          </button>

          {/* Weekend Toggle */}
          <button
            type="button"
            onClick={() => setIncludeWeekend(!includeWeekend)}
            className={`px-2.5 py-1.5 text-xs rounded-xl border transition-colors cursor-pointer ${
              includeWeekend
                ? 'bg-zinc-800 text-white border-white/20'
                : 'text-zinc-400 hover:text-white border-white/[0.06] hover:bg-zinc-900'
            }`}
          >
            {includeWeekend ? '7 Günlük' : '5 Günlük (Okul)'}
          </button>

          {/* WhatsApp Broadcast Shortcut */}
          <button
            type="button"
            onClick={() => onOpenBroadcast(baseDate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161c19] hover:bg-[#1d2722] text-emerald-300/90 hover:text-emerald-200 border border-emerald-500/20 text-xs font-medium transition-colors cursor-pointer"
            title="Haftalık veya seçili günün WhatsApp seans ilanını aç"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp İlanı</span>
          </button>
        </div>
      </div>

      {/* INLINE QUICK SCHEDULE & BREAK STRIP (Calm, Non-Neon Styling) */}
      {quickBarOpen && (
        <div className="p-3.5 bg-[#161824] border border-white/[0.08] rounded-2xl shadow-lg space-y-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-zinc-100 text-xs">Hızlı Çizelge, Seans Dakikası & Saat Kaydırıcı</span>
            </div>
            <button
              type="button"
              onClick={() => setIsScheduleConfigOpen(true)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Gelişmiş Sihirbazı Aç</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 text-xs">
            {/* Seans Kaç Dakika? */}
            <div className="space-y-1 bg-[#1a1d2b] p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-zinc-400 text-[11px] font-medium block">Program Kaç Dakika?</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[30, 40, 45, 50].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setQuickSessionMinutes(mins)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      quickSessionMinutes === mins
                        ? 'bg-zinc-700 text-white border border-zinc-600'
                        : 'bg-zinc-800/80 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {mins} dk {mins === 40 && '★'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ara Kaç Dakika? */}
            <div className="space-y-1 bg-[#1a1d2b] p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-zinc-400 text-[11px] font-medium block">Ara / Teneffüs Kaç Dakika?</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setQuickBreakMinutes(mins)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      quickBreakMinutes === mins
                        ? 'bg-zinc-700 text-white border border-zinc-600'
                        : 'bg-zinc-800/80 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {mins} dk {mins === 10 && '★'}
                  </button>
                ))}
              </div>
            </div>

            {/* Saatleri Kaydır */}
            <div className="space-y-1 bg-[#1a1d2b] p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-zinc-400 text-[11px] font-medium block">Tablodaki Saatleri Kaydır:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, -15)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  title="Tüm saatleri 15 dk geri kaydır"
                >
                  -15 dk
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, -10)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  title="Tüm saatleri 10 dk geri kaydır"
                >
                  -10 dk
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, 10)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  title="Tüm saatleri 10 dk ileri kaydır"
                >
                  +10 dk
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, 15)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  title="Tüm saatleri 15 dk ileri kaydır"
                >
                  +15 dk
                </button>
              </div>
            </div>

            {/* Hızlı Uygula & Mola */}
            <div className="flex flex-col justify-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const cfg: ScheduleConfig = {
                    sessionDuration: quickSessionMinutes,
                    breakDuration: quickBreakMinutes,
                    startTime: '09:00',
                    sessionCount: 8,
                    includeLunchBreak: true,
                    lunchBreakAfter: 4,
                    lunchBreakDuration: 50,
                  };
                  handleApplyScheduleConfig(targetWeekDates, cfg, true);
                  onShowToast(
                    'Haftalık Program Güncellendi',
                    `${quickSessionMinutes} dk seans, ${quickBreakMinutes} dk mola tüm haftaya uygulandı.`,
                    'success'
                  );
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs"
              >
                <Zap className="w-3 h-3" />
                <span>Tüm Haftaya Uygula</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const cfg: ScheduleConfig = {
                      sessionDuration: quickSessionMinutes,
                      breakDuration: quickBreakMinutes,
                      startTime: '09:00',
                      sessionCount: 8,
                      includeLunchBreak: true,
                      lunchBreakAfter: 4,
                      lunchBreakDuration: 50,
                    };
                    handleApplyScheduleConfig([baseDate], cfg, true);
                    onShowToast(
                      'Günün Programı Güncellendi',
                      `${quickSessionMinutes} dk seans ve ${quickBreakMinutes} dk mola seçili güne uygulandı.`,
                      'success'
                    );
                  }}
                  className="flex-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
                >
                  Yalnızca Seçili Güne
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setQuickBreakModal({
                      open: true,
                      date: baseDate,
                      time: '10:10',
                      title: `${quickBreakMinutes} dk Teneffüs`,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-[#221f1a] hover:bg-[#2b2721] text-amber-200/90 text-[11px] cursor-pointer border border-amber-500/20"
                >
                  + Mola
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASYMMETRIC TOP BENTO SPOTLIGHT: Bu Haftanın Öncelikli Seansları (Calm Muted Styling) */}
      {prioritySessionsThisWeek.length > 0 && !showOnlyPriority && (
        <div className="p-3.5 bg-[#161824] border border-white/[0.08] rounded-2xl space-y-2.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-300/40 text-amber-300/80" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                  <span>Bu Haftanın Öncelikli Görüşmeleri Vitrini</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25">
                    {prioritySessionsThisWeek.length} Seans
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Net düşüşü, randevu aksaması veya kritik risk taşıyan öğrencilerin genişletilmiş seans kartları
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSpotlightCollapsed(!spotlightCollapsed)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              {spotlightCollapsed ? 'Genişlet' : 'Daralt'}
            </button>
          </div>

          {!spotlightCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
              {prioritySessionsThisWeek.slice(0, 4).map((pSession) => {
                const st = pSession.student_id ? studentMap.get(pSession.student_id) : null;
                if (!st) return null;
                const dayInfo = weekDays.find((d) => d.date === pSession.date);
                const reasonFlag =
                  st.status_flags?.[0] ||
                  (pSession.status === 'Gelmedi' ? 'Randevuya Gelmedi' : 'Yüksek Öncelik');

                return (
                  <div
                    key={pSession.id}
                    onClick={() => setQuickEditingSession(pSession)}
                    className="p-3 rounded-xl border border-amber-500/20 bg-[#1c1f2e] hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-200/90 font-mono font-medium border border-amber-400/20 text-[10px]">
                        {dayInfo?.shortDayName} • {pSession.time_slot}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.05] px-1.5 py-0.5 rounded">
                        {st.class_grade}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-200 transition-colors truncate">
                        {st.full_name}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium truncate">
                          ⚠️ {reasonFlag}
                        </span>
                      </div>
                      {pSession.topic && (
                        <p className="text-[11px] text-zinc-400 truncate mt-1">
                          {pSession.topic}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-[10px]">
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(pSession, e)}
                        className={`px-2 py-0.5 rounded font-medium transition-all cursor-pointer ${
                          pSession.status === 'Geldi'
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                            : pSession.status === 'Gelmedi'
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {pSession.status}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSendWhatsAppSummary(pSession, e)}
                        className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                        title="WhatsApp Özeti Gönder"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-400" />
                        <span>Mesaj</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ASYMMETRIC RESPONSIVE GRID LAYOUT (Clean Day-Lanes with Dynamic Card Sizing) */}
      <div
        className={`grid gap-3.5 items-start ${
          includeWeekend
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
        }`}
      >
        {weekDays.map((day) => {
          const isSelected = day.date === baseDate;
          const dayAllSessions = weekSessions
            .filter((s) => s.date === day.date)
            .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

          const dayLessons = dayAllSessions.filter((s) => !s.is_break);
          const dayFilled = dayLessons.filter((s) => s.student_id).length;

          // Filter by priority if toggle active
          const displayedDaySessions = showOnlyPriority
            ? dayAllSessions.filter((s) => s.is_break || isHighPriority(s))
            : dayAllSessions;

          return (
            <div
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className={`flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden ${
                day.isToday
                  ? 'bg-[#181a26] border-zinc-600/50 shadow-md'
                  : isSelected
                  ? 'bg-[#161824] border-zinc-500/40 ring-1 ring-zinc-500/20'
                  : 'bg-[#141620] border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {/* Day Column Header with Quick Shift & Break controls */}
              <div
                className={`p-3 border-b transition-colors cursor-pointer select-none ${
                  day.isToday
                    ? 'bg-zinc-800/40 border-zinc-700/50'
                    : isSelected
                    ? 'bg-zinc-800/30 border-zinc-700/40'
                    : 'bg-white/[0.02] border-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-xs font-bold tracking-tight ${
                        day.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-zinc-100'
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-400">{day.dayNumber}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {day.isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25">
                        Bugün
                      </span>
                    )}

                    {/* Quick shift +10 min for this day only */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShiftTime([day.date], 10);
                        onShowToast('Saatler Kaydırıldı', `${day.dayName} saatleri 10 dk ileri alındı.`, 'info');
                      }}
                      className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={`${day.dayName} saatlerini +10 dk kaydır`}
                    >
                      <Clock className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Progress / Slot Count */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>
                    Dolu: <strong className="text-zinc-300 font-semibold">{dayFilled}</strong> / {dayLessons.length}
                  </span>
                  {dayAllSessions.some((s) => isHighPriority(s)) && (
                    <span className="text-amber-400/90 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-400/40 text-amber-400/80" />
                      <span>{dayAllSessions.filter((s) => isHighPriority(s)).length}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Day Sessions List (Asymmetric Vertical Flow with Larger Priority Cards) */}
              <div className="p-2 space-y-2 flex-1 min-h-[140px]">
                {displayedDaySessions.length === 0 ? (
                  <div className="py-8 text-center px-2 space-y-2">
                    <p className="text-[11px] text-zinc-600">Planlanmış saat yok</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFillStandardSlots(day.date);
                      }}
                      className="text-[10px] px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      Standart Saatleri Aç
                    </button>
                  </div>
                ) : (
                  displayedDaySessions.map((session) => {
                    // Case 1: Teneffüs / Mola (Break) Slot - Slim Intermission Divider
                    if (session.is_break) {
                      const isLunch = session.break_title?.toLowerCase().includes('öğle') || session.topic?.toLowerCase().includes('öğle');
                      return (
                        <div
                          key={session.id}
                          className={`group relative px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between my-1 transition-all ${
                            isLunch
                              ? 'bg-amber-100 dark:bg-[#251f15] border border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-amber-200 font-semibold shadow-2xs'
                              : 'bg-slate-100/90 dark:bg-[#161822] border border-dashed border-slate-300 dark:border-white/[0.1] text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isLunch ? (
                              <Utensils className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                            ) : (
                              <Coffee className="w-3 h-3 text-slate-500 dark:text-zinc-400 shrink-0" />
                            )}
                            <span className="font-bold text-[11px]">{session.time_slot}</span>
                            <span className={`text-[10px] truncate ${isLunch ? 'font-bold text-amber-900 dark:text-amber-300' : 'text-slate-600 dark:text-zinc-400'}`}>
                              {session.break_title || session.topic || (isLunch ? 'Öğle Arası' : 'Teneffüs')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                              onShowToast(isLunch ? 'Öğle Arası Silindi' : 'Teneffüs Silindi', 'Mola takvimden kaldırıldı.', 'info');
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                            title={isLunch ? 'Öğle Arasını Kaldır' : 'Teneffüsü Kaldır'}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    }

                    const student = session.student_id ? studentMap.get(session.student_id) : null;
                    const isPriority = isHighPriority(session);

                    // Case 2: Assigned Student Session
                    if (student) {
                      if (isPriority) {
                        // HIGH-PRIORITY SESSION: Larger Card with Expressive Presence & Zero Clutter (Soft Slate Accent)
                        return (
                          <div
                            key={session.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickEditingSession(session);
                            }}
                            className="group relative rounded-xl p-3.5 border border-amber-500/30 bg-[#1c1f2e] hover:border-amber-500/50 transition-all cursor-pointer space-y-2"
                          >
                            {/* Top Line: Time Slot + High Priority Badge + Grade */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-lg bg-amber-400/15 text-amber-200/90 border border-amber-400/20 font-mono text-xs font-semibold">
                                  {session.time_slot}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                  <Star className="w-2.5 h-2.5 fill-amber-300/40 text-amber-300/80" />
                                  Öncelikli
                                </span>
                              </div>

                              <span className="text-[11px] font-mono font-medium text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-md shrink-0">
                                {student.class_grade}
                              </span>
                            </div>

                            {/* Middle: Prominent Student Name & Flag */}
                            <div>
                              <div className="text-sm font-bold text-zinc-100 group-hover:text-amber-200 transition-colors tracking-tight leading-snug">
                                {student.full_name}
                              </div>

                              {/* Risk or reason flag without metadata clutter */}
                              {(student.status_flags?.length || session.status === 'Gelmedi') && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {session.status === 'Gelmedi' ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-950/40 text-rose-300 border border-rose-500/25 font-medium">
                                      ❌ Son Randevuya Gelmedi
                                    </span>
                                  ) : (
                                    student.status_flags?.slice(0, 2).map((flag) => (
                                      <span
                                        key={flag}
                                        className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20 font-medium"
                                      >
                                        ⚠️ {flag}
                                      </span>
                                    ))
                                  )}
                                </div>
                              )}

                              {/* Clear Topic banner */}
                              {session.topic && (
                                <div className="mt-1.5 p-2 rounded-lg bg-[#141622] border border-white/[0.06] text-xs text-zinc-300 leading-snug">
                                  <span className="text-[10px] text-zinc-400 font-mono block mb-0.5">🎯 Görüşme Odağı:</span>
                                  <span className="font-medium text-zinc-200">{session.topic}</span>
                                </div>
                              )}
                            </div>

                            {/* Bottom Action Footer (Decluttered & Direct) */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStatus(session, e)}
                                className={`text-xs font-medium px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                                  session.status === 'Geldi'
                                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                                    : session.status === 'Gelmedi'
                                    ? 'bg-rose-950/40 text-rose-300 border border-rose-500/20'
                                    : 'bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.06]'
                                }`}
                                title="Durumu Değiştir (Bekliyor / Geldi / Gelmedi)"
                              >
                                {session.status}
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePriority(session, e)}
                                  className="p-1 rounded-lg text-amber-300/80 bg-amber-400/10 hover:bg-amber-400/20 transition-colors cursor-pointer"
                                  title="Öncelik İşaretini Değiştir"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-300/40" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleSendWhatsAppSummary(session, e)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#18221d] hover:bg-[#1f2e27] text-emerald-300 border border-emerald-500/20 text-[11px] font-medium transition-colors cursor-pointer"
                                  title="Öğrenciye WhatsApp Görüşme Özeti Gönder"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // STANDARD SESSION: Sleek, compact card
                      return (
                        <div
                          key={session.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickEditingSession(session);
                          }}
                          className={`group relative rounded-xl p-2.5 transition-all cursor-pointer border ${
                            session.status === 'Geldi'
                              ? 'border-emerald-500/20 bg-[#161f1a] hover:border-emerald-500/40'
                              : session.status === 'Gelmedi'
                              ? 'border-rose-500/20 bg-[#211618] hover:border-rose-500/40'
                              : 'border-white/[0.08] bg-[#181a26] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white/[0.05] text-zinc-300">
                              {session.time_slot}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.2 rounded">
                              {student.class_grade}
                            </span>
                          </div>
                          <div className="font-semibold text-xs text-zinc-200 group-hover:text-white truncate">
                            {student.full_name}
                          </div>
                          {session.topic && (
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {session.topic}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-white/[0.05]">
                            <button
                              type="button"
                              onClick={(e) => handleToggleStatus(session, e)}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded transition-all cursor-pointer ${
                                session.status === 'Geldi'
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                                  : session.status === 'Gelmedi'
                                  ? 'bg-rose-950/40 text-rose-300 border border-rose-500/20'
                                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              {session.status}
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleTogglePriority(session, e)}
                                className="p-1 rounded text-zinc-500 hover:text-amber-300/80 hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="Yüksek Öncelikli Yap"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleSendWhatsAppSummary(session, e)}
                                className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Case 3: Empty Existing Slot (Minimal Dashed Strip)
                    return (
                      <div
                        key={session.id}
                        className="group relative p-1.5 px-2 rounded-lg border border-dashed border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02] transition-all flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-[11px] text-zinc-500 font-medium">
                          {session.time_slot}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAssignSlot({
                                date: day.date,
                                time_slot: session.time_slot,
                                sessionId: session.id,
                              });
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white text-[11px] transition-colors cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>Öğrenci Ata</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity cursor-pointer"
                            title="Saati Sil"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day Bottom Actions */}
              <div className="p-2 border-t border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextTime = '16:00';
                    handleCreateEmptySlot(day.date, nextTime);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Saat Aç</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickBreakModal({
                      open: true,
                      date: day.date,
                      time: '12:20',
                      title: 'Öğle Arası',
                    });
                  }}
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Bu güne teneffüs veya öğle arası ekle"
                >
                  <Coffee className="w-2.5 h-2.5" />
                  <span>+ Teneffüs</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SCHEDULE CONFIGURATION MODAL (Minutes, Breaks, Shift, Recess) */}
      <ScheduleConfigModal
        isOpen={isScheduleConfigOpen}
        onClose={() => setIsScheduleConfigOpen(false)}
        selectedDate={baseDate}
        weekDays={weekDays}
        onApplySchedule={handleApplyScheduleConfig}
        onShiftTime={handleShiftTime}
        onAddBreak={handleAddBreak}
        onShowToast={onShowToast}
      />

      {/* QUICK BREAK / RECESS ADDITION MODAL */}
      {quickBreakModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={() => setQuickBreakModal({ ...quickBreakModal, open: false })}
        >
          <div
            className="w-full max-w-sm bg-[#181a26] border border-white/[0.1] rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#221f1a] text-amber-300">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Teneffüs / Mola Ekle</h3>
                  <p className="text-[11px] text-zinc-400">Çizelgeye ara veya dinlenme bloğu ekleyin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickBreakModal({ ...quickBreakModal, open: false })}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Gün Seçimi */}
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Uygulanacak Gün</label>
                <select
                  value={quickBreakModal.date}
                  onChange={(e) => setQuickBreakModal({ ...quickBreakModal, date: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12141e] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  {weekDays.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.dayName} ({d.date}) {d.isToday ? '★ Bugün' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teneffüs Saati */}
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Teneffüs Başlangıç Saati</label>
                <input
                  type="time"
                  value={quickBreakModal.time}
                  onChange={(e) => setQuickBreakModal({ ...quickBreakModal, time: e.target.value })}
                  className="w-full px-3 py-2 bg-[#12141e] border border-white/[0.08] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-zinc-500"
                />
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-500">Sık Saatler:</span>
                  {['10:10', '11:50', '12:20', '13:40', '15:10'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQuickBreakModal({ ...quickBreakModal, time: t })}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Başlık ve Şablonlar */}
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium">Mola Başlığı</label>
                <input
                  type="text"
                  value={quickBreakModal.title}
                  onChange={(e) => setQuickBreakModal({ ...quickBreakModal, title: e.target.value })}
                  placeholder="Örn: 10 dk Teneffüs"
                  className="w-full px-3 py-2 bg-[#12141e] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-zinc-500"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {['10 dk Teneffüs', '15 dk Teneffüs', '45 dk Öğle Arası', 'Zümre Toplantısı'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setQuickBreakModal({ ...quickBreakModal, title: lbl })}
                      className="px-2 py-0.5 rounded text-[10px] bg-[#221f1a] hover:bg-[#2b2721] text-amber-200/90 cursor-pointer border border-amber-500/20"
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setQuickBreakModal({ ...quickBreakModal, open: false })}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddBreak(quickBreakModal.date, quickBreakModal.time, quickBreakModal.title);
                  setQuickBreakModal({ ...quickBreakModal, open: false });
                  onShowToast('Teneffüs Eklendi', `${quickBreakModal.time} molası takvime eklendi.`, 'success');
                }}
                className="px-4 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Teneffüsü Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign Modal */}
      {activeAssignSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setActiveAssignSlot(null)}
        >
          <div
            className="w-full max-w-md bg-[#181a26] border border-white/[0.1] rounded-xl shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-semibold text-white">Öğrenci Ata</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {activeAssignSlot.date} | {activeAssignSlot.time_slot}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAssignSlot(null)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="İsim, sınıf veya numara ile ara..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#090a0f] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Student List */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">Öğrenci bulunamadı.</p>
              ) : (
                filteredStudents.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleAssignStudent(st)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-colors text-left cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-white flex items-center gap-1.5">
                        <span>{st.full_name}</span>
                        {st.status_flags && st.status_flags.length > 0 && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            {st.status_flags[0]}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {st.target_goal || 'Hedef belirtilmemiş'}
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded">
                      {st.class_grade}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Session Drawer/Modal */}
      {quickEditingSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setQuickEditingSession(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0e1017] border border-white/[0.12] rounded-xl shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-semibold text-white">Seans Detayı & Notları</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {quickEditingSession.date} | {quickEditingSession.time_slot}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditingSession(null)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student Info */}
            {quickEditingSession.student_id && studentMap.get(quickEditingSession.student_id) && (
              <div className="flex items-center justify-between p-2.5 bg-[#090a0f] rounded-lg border border-white/[0.06]">
                <div>
                  <div className="text-xs font-semibold text-white">
                    {studentMap.get(quickEditingSession.student_id)?.full_name}
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {studentMap.get(quickEditingSession.student_id)?.class_grade} •{' '}
                    {displayPhone(studentMap.get(quickEditingSession.student_id)?.phone || '')}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const st = studentMap.get(quickEditingSession.student_id!);
                      if (st) onOpenStudentProfile(st);
                    }}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Profil
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSession({
                        ...quickEditingSession,
                        student_id: null,
                        topic: '',
                        action_items: '',
                      });
                      setQuickEditingSession(null);
                      onShowToast('Öğrenci Kaldırıldı', 'Seans boşa çıkarıldı.', 'info');
                    }}
                    className="px-2 py-1 rounded bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Boşa Çıkar
                  </button>
                </div>
              </div>
            )}

            {/* Priority Toggle in Modal */}
            <div className="flex items-center justify-between p-2.5 bg-amber-950/15 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Star
                  className={`w-4 h-4 ${
                    quickEditingSession.is_priority
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-zinc-500'
                  }`}
                />
                <div>
                  <div className="text-xs font-medium text-amber-200">
                    Öncelikli Seans Olarak Vurgula
                  </div>
                  <div className="text-[10px] text-amber-300/70">
                    Haftalık tabloda daha geniş kart ve dikkat çekici görselle öne çıkar
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(quickEditingSession.is_priority)}
                onChange={(e) =>
                  setQuickEditingSession({
                    ...quickEditingSession,
                    is_priority: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded border-amber-500/30 bg-zinc-900 text-amber-400 cursor-pointer"
              />
            </div>

            {/* Topic Input */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Görüşme Konusu</label>
              <input
                type="text"
                value={quickEditingSession.topic}
                onChange={(e) =>
                  setQuickEditingSession({ ...quickEditingSession, topic: e.target.value })
                }
                placeholder="Örn: TYT Fen ve Paragraf rutini takibi"
                className="w-full px-3 py-2 bg-[#090a0f] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Common Topics suggestions */}
            <div className="flex flex-wrap gap-1">
              {COMMON_TOPICS.slice(0, 4).map((top) => (
                <button
                  key={top}
                  type="button"
                  onClick={() => setQuickEditingSession({ ...quickEditingSession, topic: top })}
                  className="px-2 py-0.5 rounded text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  {top}
                </button>
              ))}
            </div>

            {/* Action Items */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Alınan Kararlar / Ödevler</label>
              <textarea
                rows={3}
                value={quickEditingSession.action_items}
                onChange={(e) =>
                  setQuickEditingSession({ ...quickEditingSession, action_items: e.target.value })
                }
                placeholder="Haftalık 2 branş denemesi çözülecek..."
                className="w-full px-3 py-2 bg-[#090a0f] border border-white/[0.08] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 resize-none"
              />
            </div>

            {/* Status Select */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-zinc-400">Durum:</span>
              {(['Bekliyor', 'Geldi', 'Gelmedi'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setQuickEditingSession({ ...quickEditingSession, status: st })}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    quickEditingSession.status === st
                      ? st === 'Geldi'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : st === 'Gelmedi'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-zinc-800 text-white border border-white/20'
                      : 'text-zinc-400 hover:text-white bg-zinc-900 border border-transparent'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  onDeleteSession(quickEditingSession.id);
                  setQuickEditingSession(null);
                  onShowToast('Seans Silindi', 'Kayıt takvimden kaldırıldı.', 'info');
                }}
                className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded transition-colors cursor-pointer"
              >
                Seansı Sil
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickEditingSession(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSession(quickEditingSession);
                    setQuickEditingSession(null);
                    onShowToast('Seans Güncellendi', 'Değişiklikler kaydedildi.', 'success');
                  }}
                  className="px-4 py-1.5 text-xs font-medium bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
