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
  GripVertical,
  Copy,
  Calendar as CalendarIcon,
  ChevronUp,
  MoreHorizontal,
  CalendarPlus,
  Printer,
} from 'lucide-react';
import {
  getWeekDays,
  generateDefaultTimeSlots,
  displayPhone,
  formatTurkishDate,
  StorageService,
  WeekDayInfo,
  shiftTimeSlotString,
  addMinutesToTime,
  shiftDateString,
} from '../lib/storage';
import {
  generateIndividualSummaryText,
  generateMissedSessionReminderText,
  getWhatsAppDirectUrl,
  openExternalUrl,
} from '../lib/whatsapp';
import { ScheduleConfigModal } from './ScheduleConfigModal';
import { DailyLogPrintModal } from './DailyLogPrintModal';

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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeAssignSlot, setActiveAssignSlot] = useState<{
    date: string;
    time_slot: string;
    sessionId?: string;
  } | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [quickEditingSession, setQuickEditingSession] = useState<Session | null>(null);
  const [showOnlyPriority, setShowOnlyPriority] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [quickBarOpen, setQuickBarOpen] = useState(false);
  const [spotlightCollapsed, setSpotlightCollapsed] = useState(false);
  const [quickSessionMinutes, setQuickSessionMinutes] = useState<number>(15);
  const [quickBreakMinutes, setQuickBreakMinutes] = useState<number>(5);
  
  // Interactive Table Drag & Drop State
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverDayDate, setDragOverDayDate] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [showDayAddPopover, setShowDayAddPopover] = useState<string | null>(null);
  const [customSlotInputTime, setCustomSlotInputTime] = useState<string>('09:00');

  const [quickBreakModal, setQuickBreakModal] = useState<{
    open: boolean;
    date: string;
    time: string;
    title: string;
  }>({
    open: false,
    date: baseDate,
    time: '10:10',
    title: '5 dk Teneffüs',
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

  const handleStartWeeklyProgram = () => {
    if (onFillStandardWeek) {
      onFillStandardWeek(baseDate);
    } else {
      StorageService.fillStandardSlotsForWeek(baseDate);
      window.location.reload();
    }
    if (onShowToast) {
      onShowToast('Haftalık Program Başlatıldı', '15 dakikalık standart seans ve mola saatleri takvime yüklendi.', 'success');
    }
  };

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

  // Direct fast nudge for individual session (+/- 15 or 5 minutes)
  const handleFastNudgeSession = (session: Session, deltaMinutes: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newTime = shiftTimeSlotString(session.time_slot, deltaMinutes);
    const updated: Session = { ...session, time_slot: newTime };
    onUpdateSession(updated);
    const student = session.student_id ? studentMap.get(session.student_id) : null;
    onShowToast(
      'Saat Güncellendi',
      `${student ? student.full_name : 'Seans'}: ${session.time_slot} → ${newTime}`,
      'info'
    );
  };

  // Duplicate session to next 15-min interval
  const handleDuplicateSession = (session: Session, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newTime = shiftTimeSlotString(session.time_slot, 15);
    onAddSession({
      date: session.date,
      time_slot: newTime,
      student_id: session.student_id,
      topic: session.topic ? `${session.topic} (Kopya)` : '',
      action_items: session.action_items,
      tags: [...session.tags],
      status: 'Bekliyor',
      is_priority: session.is_priority,
      is_break: session.is_break,
      break_title: session.break_title,
    });
    onShowToast('Seans Kopyalandı', `${newTime} saatine yeni seans oluşturuldu.`, 'success');
  };

  // Drag & Drop handlers
  const handleCardDragStart = (session: Session, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', session.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSessionId(session.id);
  };

  const handleCardDragEnd = () => {
    setDraggedSessionId(null);
    setDragOverDayDate(null);
    setDragOverSlotId(null);
  };

  const handleDayDrop = (targetDate: string, targetDayName: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sessionId = e.dataTransfer.getData('text/plain') || draggedSessionId;
    setDraggedSessionId(null);
    setDragOverDayDate(null);
    setDragOverSlotId(null);
    if (!sessionId) return;
    const sess = sessions.find((s) => s.id === sessionId);
    if (!sess) return;
    if (sess.date === targetDate) return;

    onUpdateSession({ ...sess, date: targetDate });
    const student = sess.student_id ? studentMap.get(sess.student_id) : null;
    onShowToast(
      'Seans Taşındı',
      `${student ? student.full_name : 'Seans'} ${targetDayName} gününe aktarıldı.`,
      'success'
    );
  };

  const handleSlotDrop = (targetSession: Session, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedSessionId;
    setDraggedSessionId(null);
    setDragOverDayDate(null);
    setDragOverSlotId(null);
    if (!sourceId || sourceId === targetSession.id) return;
    const sourceSess = sessions.find((s) => s.id === sourceId);
    if (!sourceSess) return;

    // Swap times and dates between source and target!
    const targetDate = targetSession.date;
    const targetTime = targetSession.time_slot;
    const sourceDate = sourceSess.date;
    const sourceTime = sourceSess.time_slot;

    onUpdateSession({ ...sourceSess, date: targetDate, time_slot: targetTime });
    onUpdateSession({ ...targetSession, date: sourceDate, time_slot: sourceTime });

    const stSource = sourceSess.student_id ? studentMap.get(sourceSess.student_id) : null;
    const stTarget = targetSession.student_id ? studentMap.get(targetSession.student_id) : null;
    onShowToast(
      'Seanslar Takas Edildi',
      `${stSource ? stSource.full_name : sourceTime} ⟷ ${stTarget ? stTarget.full_name : targetTime} karşılıklı yer değiştirdi.`,
      'success'
    );
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
    openExternalUrl(url);
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
      StorageService.applyScheduleConfigToDates(dates, config, keepAssigned).then((updated) => {
        updated.forEach((s) => onUpdateSession(s));
      });
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

        {/* Right: Primary Action Buttons + Secondary Dropdown ("...") */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PRIMARY 1: Program & Teneffüs Sihirbazı */}
          <button
            type="button"
            onClick={() => setIsScheduleConfigOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700/80 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 text-xs font-medium shadow-xs transition-colors cursor-pointer"
            title="Seans dakikası, teneffüs süresi belirle, tablo saatlerini kaydır ve teneffüs ekle"
          >
            <Sliders className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span>Program & Teneffüs</span>
          </button>

          {/* PRIMARY 2: WhatsApp İlanı */}
          <button
            type="button"
            onClick={() => onOpenBroadcast(baseDate)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
            title="Haftalık veya seçili günün WhatsApp seans ilanını aç"
          >
            <MessageSquare className="w-3.5 h-3.5 text-white" />
            <span>WhatsApp İlanı</span>
          </button>

          {/* PRIMARY 3: Haftalık A4 Yazdır / PDF */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700/80 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Tüm haftanın gün gün resmi A4 görüşme çizelgesini yazdır veya PDF olarak kaydet"
          >
            <Printer className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Yazdır / PDF</span>
          </button>

          {/* SECONDARY: Dropdown Menu ("..." / "Diğer Ayarlar") */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                moreMenuOpen
                  ? 'bg-stone-200 text-stone-900 border-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700'
                  : 'bg-white hover:bg-stone-50 text-stone-700 dark:bg-stone-800/80 dark:hover:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700'
              }`}
              title="Diğer çizelge ve seans ayarları"
            >
              <MoreHorizontal className="w-4 h-4 text-stone-500" />
              <span className="hidden sm:inline">Diğer</span>
              <ChevronDown className={`w-3 h-3 text-stone-500 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMoreMenuOpen(false)}
                />

                {/* Dropdown Menu */}
                <div
                  className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-md shadow-md p-1.5 z-40 space-y-1 text-xs text-stone-800 dark:text-stone-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-stone-400 dark:text-stone-500 border-b border-stone-100 dark:border-stone-800">
                    İkincil Tablo Ayarları
                  </div>

                  {/* 1. Hızlı Çubuk Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickBarOpen(!quickBarOpen);
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-stone-500" />
                      <span>Hızlı Çubuk (15dk / 5dk)</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${quickBarOpen ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium' : 'text-stone-400'}`}>
                      {quickBarOpen ? 'Açık' : 'Kapalı'}
                    </span>
                  </button>

                  {/* 2. + Teneffüs Ekle */}
                  <button
                    type="button"
                    onClick={() => {
                      setQuickBreakModal({
                        open: true,
                        date: baseDate,
                        time: '10:10',
                        title: '10 dk Teneffüs',
                      });
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between cursor-pointer text-stone-700 dark:text-stone-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Coffee className="w-3.5 h-3.5 text-stone-500" />
                      <span>+ Teneffüs / Mola Ekle</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">+Mola</span>
                  </button>

                  {/* 3. 5 Günlük (Okul) / 7 Günlük Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setIncludeWeekend(!includeWeekend);
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
                      <span>{includeWeekend ? '7 Günlük Görünüm' : '5 Günlük (Okul)'}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-stone-500">
                      {includeWeekend ? 'Hafta Sonu Açık' : 'Hafta Sonu Gizli'}
                    </span>
                  </button>

                  {/* 4. ±10dk Kaydır Sub-Options */}
                  <div className="border-t border-stone-100 dark:border-stone-800 pt-1.5 mt-1">
                    <div className="px-2 py-0.5 text-[10px] font-mono text-stone-400 dark:text-stone-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Haftalık Saatleri Kaydır:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleShiftTime(targetWeekDates, -10);
                          setMoreMenuOpen(false);
                        }}
                        className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-center text-xs font-mono text-stone-700 dark:text-stone-300 cursor-pointer transition-colors"
                        title="Tüm seansları 10 dk geri al"
                      >
                        -10 dk
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleShiftTime(targetWeekDates, 10);
                          setMoreMenuOpen(false);
                        }}
                        className="px-2 py-1 rounded bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-center text-xs font-mono text-stone-700 dark:text-stone-300 cursor-pointer transition-colors"
                        title="Tüm seansları 10 dk ileri al"
                      >
                        +10 dk
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* INLINE QUICK SCHEDULE & BREAK STRIP */}
      {quickBarOpen && (
        <div className="p-3 bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-stone-500" />
              <span className="font-medium text-stone-900 dark:text-stone-100 text-xs">Hızlı Çizelge, Seans Dakikası & Saat Kaydırıcı</span>
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
              <span className="text-zinc-400 text-[11px] font-medium block">Rehberlik Seansı Kaç Dakika?</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[15, 20, 25, 30, 40].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setQuickSessionMinutes(mins)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      quickSessionMinutes === mins
                        ? 'bg-emerald-600 text-white border border-emerald-500 font-bold'
                        : 'bg-zinc-800/80 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {mins} dk {mins === 15 && '★'}
                  </button>
                ))}
              </div>
            </div>

            {/* Ara Kaç Dakika? */}
            <div className="space-y-1 bg-[#1a1d2b] p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-zinc-400 text-[11px] font-medium block">Geçiş / Mola Kaç Dakika?</span>
              <div className="flex items-center gap-1 flex-wrap">
                {[0, 5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setQuickBreakMinutes(mins)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                      quickBreakMinutes === mins
                        ? 'bg-amber-600 text-white border border-amber-500 font-bold'
                        : 'bg-zinc-800/80 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {mins === 0 ? '0 dk (Peş Peşe)' : `${mins} dk ${mins === 5 ? '★' : ''}`}
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
                  onClick={() => handleShiftTime(targetWeekDates, -5)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  title="Tüm saatleri 5 dk geri kaydır"
                >
                  -5 dk
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftTime(targetWeekDates, 5)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
                  title="Tüm saatleri 5 dk ileri kaydır"
                >
                  +5 dk
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
                    sessionCount: quickSessionMinutes <= 20 ? 16 : 8,
                    includeLunchBreak: true,
                    lunchBreakAfter: quickSessionMinutes <= 20 ? 8 : 4,
                    lunchBreakDuration: 45,
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
                      sessionCount: quickSessionMinutes <= 20 ? 16 : 8,
                      includeLunchBreak: true,
                      lunchBreakAfter: quickSessionMinutes <= 20 ? 8 : 4,
                      lunchBreakDuration: 45,
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

      {/* ASYMMETRIC TOP BENTO SPOTLIGHT: Bu Haftanın Öncelikli Seansları */}
      {prioritySessionsThisWeek.length > 0 && !showOnlyPriority && (
        <div className="p-3 bg-amber-50/70 dark:bg-stone-900/60 border border-amber-200 dark:border-amber-900/40 rounded-lg space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Star className="w-3 h-3 fill-amber-500 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Bu Haftanın Öncelikli Görüşmeleri</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200/70 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                    {prioritySessionsThisWeek.length} Seans
                  </span>
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSpotlightCollapsed(!spotlightCollapsed)}
              className="text-[11px] text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
            >
              {spotlightCollapsed ? 'Genişlet' : 'Daralt'}
            </button>
          </div>

          {!spotlightCollapsed && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
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
                    className="p-2.5 rounded-md border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-stone-900 hover:border-amber-400 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono font-medium text-[10px]">
                        {dayInfo?.shortDayName} • {pSession.time_slot}
                      </span>
                      <span className="text-[10px] font-mono text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                        {st.class_grade}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {st.full_name}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium truncate">
                          {reasonFlag}
                        </span>
                      </div>
                      {pSession.topic && (
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate mt-0.5">
                          {pSession.topic}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800 text-[10px]">
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(pSession, e)}
                        className={`px-2 py-0.5 rounded font-medium transition-all cursor-pointer ${
                          pSession.status === 'Geldi'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/20'
                            : pSession.status === 'Gelmedi'
                            ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/20'
                            : 'bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
                        }`}
                      >
                        {pSession.status}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSendWhatsAppSummary(pSession, e)}
                        className="p-1 rounded text-stone-500 hover:text-emerald-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-emerald-400 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-1"
                        title="WhatsApp Özeti Gönder"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
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

      {/* 2. BOŞ DURUM (EMPTY STATE) VE 3. GRID DÜZENİ */}
      {weekSessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-[#1F1F1F] p-8 sm:p-12 text-center my-3 transition-all">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <CalendarPlus className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Bu Hafta İçin Henüz Program Açılmadı
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Rehberlik seanslarınızı 15 dakikalık periyotlar ve teneffüslerle planlamaya başlayın. 
                Program oluşturulduktan sonra öğrenciler gün ve saatlere atanabilir.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleStartWeeklyProgram}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Haftalık Programı Başlat (15 dk)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScheduleConfigOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700/80 text-stone-700 dark:text-stone-300 font-medium text-xs border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-stone-500" />
                <span>Program Sihirbazı İle Başlat</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Mobile Day Navigation Tabs */}
          <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-1.5 -mx-1 px-1 no-scrollbar">
            {weekDays.map((day) => {
              const isSelected = day.date === baseDate;
              const dayLessonsCount = weekSessions.filter((s) => s.date === day.date && !s.is_break).length;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => {
                    onSelectDate(day.date);
                    const el = document.getElementById(`day-col-${day.date}`);
                    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white font-semibold'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 border border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <span>{day.shortDayName}</span>
                  <span className="font-mono text-[11px] opacity-80">{day.dayNumber}</span>
                  {day.isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {dayLessonsCount > 0 && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono">
                      {dayLessonsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* GRID DÜZENİ */}
          <div
            className={`flex overflow-x-auto snap-x snap-mandatory gap-2.5 pb-3 scroll-smooth no-scrollbar md:grid md:overflow-visible ${
              includeWeekend
                ? 'md:grid-cols-7'
                : 'md:grid-cols-5'
            } items-start`}
          >
            {weekDays.map((day) => {
              const isSelected = day.date === baseDate;
              const dayAllSessions = weekSessions
                .filter((s) => s.date === day.date)
                .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

              const dayLessons = dayAllSessions.filter((s) => !s.is_break);
              const dayFilled = dayLessons.filter((s) => s.student_id).length;

              const displayedDaySessions = showOnlyPriority
                ? dayAllSessions.filter((s) => s.is_break || isHighPriority(s))
                : dayAllSessions;

              return (
                <div
                  key={day.date}
                  id={`day-col-${day.date}`}
                  onClick={() => onSelectDate(day.date)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverDayDate !== day.date) setDragOverDayDate(day.date);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (dragOverDayDate === day.date) setDragOverDayDate(null);
                  }}
                  onDrop={(e) => handleDayDrop(day.date, day.dayName, e)}
                  className={`w-[85vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink flex flex-col rounded-lg border transition-colors overflow-hidden ${
                    dragOverDayDate === day.date
                      ? 'bg-teal-50 dark:bg-stone-900 border-teal-500 ring-1 ring-teal-500'
                      : day.isToday
                      ? 'bg-white dark:bg-[#1F1F1F] border-teal-600/50 dark:border-teal-500/50'
                      : isSelected
                      ? 'bg-white dark:bg-[#1F1F1F] border-stone-400 dark:border-stone-600'
                      : 'bg-white dark:bg-[#1F1F1F] border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
              {/* Day Column Header */}
              <div
                className={`p-2.5 border-b transition-colors cursor-pointer select-none ${
                  day.isToday
                    ? 'bg-teal-50/50 dark:bg-stone-800/80 border-stone-200 dark:border-stone-800'
                    : isSelected
                    ? 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-800'
                    : 'bg-stone-50/30 dark:bg-stone-900/30 border-stone-200 dark:border-stone-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-xs font-bold tracking-tight ${
                        day.isToday ? 'text-teal-700 dark:text-teal-400' : 'text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 dark:text-stone-400">{day.dayNumber}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {day.isToday && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
                        Bugün
                      </span>
                    )}

                    {/* Quick shift -15 / +15 min */}
                    <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded border border-stone-200 dark:border-stone-700">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShiftTime([day.date], -15);
                          onShowToast('Saatler Kaydırıldı', `${day.dayName} saatleri 15 dk geri alındı.`, 'info');
                        }}
                        className="px-1 py-0.2 rounded text-[9px] font-mono text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        title={`${day.dayName} tüm seansları 15 dk geri kaydır`}
                      >
                        -15
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShiftTime([day.date], 15);
                          onShowToast('Saatler Kaydırıldı', `${day.dayName} saatleri 15 dk ileri alındı.`, 'info');
                        }}
                        className="px-1 py-0.2 rounded text-[9px] font-mono text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        title={`${day.dayName} tüm seansları 15 dk ileri kaydır`}
                      >
                        +15
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress / Slot Count */}
                <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                  <span>
                    Seans: <strong className="text-stone-700 dark:text-stone-300 font-medium">{dayFilled}</strong> / {dayLessons.length}
                  </span>
                  {dayAllSessions.some((s) => isHighPriority(s)) && (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      <span>{dayAllSessions.filter((s) => isHighPriority(s)).length}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Day Sessions List */}
              <div className="p-2 space-y-1.5 flex-1 min-h-[140px]">
                {displayedDaySessions.length === 0 ? (
                  <div className="py-6 text-center px-2 space-y-1.5">
                    <p className="text-[11px] text-stone-400 dark:text-stone-500">Bugün seans yok</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFillStandardSlots(day.date);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                    >
                      + Saat Ekle (15 dk)
                    </button>
                  </div>
                ) : (
                  displayedDaySessions.map((session) => {
                    // Case 1: Teneffüs / Mola (Break) Slot
                    if (session.is_break) {
                      const isLunch = session.break_title?.toLowerCase().includes('öğle') || session.topic?.toLowerCase().includes('öğle');
                      return (
                        <div
                          key={session.id}
                          className={`group relative px-2 py-1 rounded text-xs font-mono flex items-center justify-between my-0.5 transition-colors ${
                            isLunch
                              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 font-medium'
                              : 'bg-stone-50 dark:bg-stone-900/60 border border-dashed border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isLunch ? (
                              <Utensils className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                            ) : (
                              <Coffee className="w-3 h-3 text-stone-500 dark:text-stone-400 shrink-0" />
                            )}
                            <span className="font-semibold text-[11px] font-mono">{session.time_slot}</span>
                            <span className={`text-[10px] truncate ${isLunch ? 'font-semibold text-amber-900 dark:text-amber-300' : 'text-stone-500'}`}>
                              {session.break_title || session.topic || (isLunch ? 'Öğle Arası' : 'Mola')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleFastNudgeSession(session, -15, e)}
                              className="opacity-0 group-hover:opacity-100 px-1 py-0.2 rounded text-[9px] bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 transition-opacity"
                              title="15 dk geri kaydır"
                            >
                              -15
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleFastNudgeSession(session, 15, e)}
                              className="opacity-0 group-hover:opacity-100 px-1 py-0.2 rounded text-[9px] bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 transition-opacity"
                              title="15 dk ileri kaydır"
                            >
                              +15
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                                onShowToast(isLunch ? 'Öğle Arası Silindi' : 'Mola Silindi', 'Mola takvimden kaldırıldı.', 'info');
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-rose-500 transition-opacity cursor-pointer"
                              title={isLunch ? 'Öğle Arasını Kaldır' : 'Molayı Kaldır'}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const student = session.student_id ? studentMap.get(session.student_id) : null;
                    const isPriority = isHighPriority(session);
                    const isDragOverThis = dragOverSlotId === session.id;

                    // Case 2: Assigned Student Session
                    if (student) {
                      if (isPriority) {
                        // HIGH-PRIORITY SESSION: Clean stone card with amber border
                        return (
                          <div
                            key={session.id}
                            draggable={true}
                            onDragStart={(e) => handleCardDragStart(session, e)}
                            onDragEnd={handleCardDragEnd}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverSlotId !== session.id) setDragOverSlotId(session.id);
                            }}
                            onDragLeave={(e) => {
                              e.stopPropagation();
                              if (dragOverSlotId === session.id) setDragOverSlotId(null);
                            }}
                            onDrop={(e) => handleSlotDrop(session, e)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickEditingSession(session);
                            }}
                            className={`group relative rounded-md p-2.5 border transition-all cursor-pointer space-y-1.5 ${
                              isDragOverThis
                                ? 'border-teal-500 bg-teal-50 dark:bg-stone-900 ring-1 ring-teal-500'
                                : 'border-amber-300 dark:border-amber-800/60 bg-amber-50/40 dark:bg-stone-900 hover:border-amber-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span title="Sürükle ve Bırak" className="inline-flex shrink-0">
                                  <GripVertical
                                    className="w-3 h-3 text-stone-400 hover:text-stone-600 cursor-grab active:cursor-grabbing shrink-0"
                                  />
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-mono text-[11px] font-semibold">
                                  {session.time_slot}
                                </span>
                                
                                <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => handleFastNudgeSession(session, -15, e)}
                                    className="px-1 py-0.2 rounded text-[8px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                                    title="15 dakika geri al"
                                  >
                                    -15
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleFastNudgeSession(session, 15, e)}
                                    className="px-1 py-0.2 rounded text-[8px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                                    title="15 dakika ileri al"
                                  >
                                    +15
                                  </button>
                                </div>

                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                  Öncelikli
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleDuplicateSession(session, e)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-all"
                                  title="Seansı Kopyala (+15 dk)"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] font-mono font-medium text-stone-500 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.2 rounded shrink-0">
                                  {student.class_grade}
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                                {student.full_name}
                              </div>

                              {(student.status_flags?.length || session.status === 'Gelmedi') && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {session.status === 'Gelmedi' ? (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40 font-medium">
                                      Randevuya Gelmedi
                                    </span>
                                  ) : (
                                    student.status_flags?.slice(0, 2).map((flag) => (
                                      <span
                                        key={flag}
                                        className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900 font-medium"
                                      >
                                        {flag}
                                      </span>
                                    ))
                                  )}
                                </div>
                              )}

                              {session.topic && (
                                <div className="mt-1 p-1 rounded bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300 leading-snug">
                                  <span className="font-medium">{session.topic}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-amber-200 dark:border-stone-800">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStatus(session, e)}
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                                  session.status === 'Geldi'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : session.status === 'Gelmedi'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'
                                }`}
                                title="Durumu Değiştir"
                              >
                                {session.status}
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePriority(session, e)}
                                  className="p-1 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors cursor-pointer"
                                  title="Öncelik İşaretini Değiştir"
                                >
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleSendWhatsAppSummary(session, e)}
                                  className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-medium transition-colors cursor-pointer"
                                  title="WhatsApp Mesajı"
                                >
                                  <MessageSquare className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>WhatsApp</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // STANDARD SESSION: Crisp stone card
                      return (
                        <div
                          key={session.id}
                          draggable={true}
                          onDragStart={(e) => handleCardDragStart(session, e)}
                          onDragEnd={handleCardDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (dragOverSlotId !== session.id) setDragOverSlotId(session.id);
                          }}
                          onDragLeave={(e) => {
                            e.stopPropagation();
                            if (dragOverSlotId === session.id) setDragOverSlotId(null);
                          }}
                          onDrop={(e) => handleSlotDrop(session, e)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickEditingSession(session);
                          }}
                          className={`group relative rounded-md p-2 transition-colors cursor-pointer border ${
                            isDragOverThis
                              ? 'border-teal-500 bg-teal-50 dark:bg-stone-900 ring-1 ring-teal-500'
                              : session.status === 'Geldi'
                              ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-stone-900'
                              : session.status === 'Gelmedi'
                              ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-stone-900'
                              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1">
                              <span title="Sürükle ve Bırak" className="inline-flex shrink-0">
                                <GripVertical
                                  className="w-3 h-3 text-stone-400 hover:text-stone-600 cursor-grab active:cursor-grabbing shrink-0"
                                />
                              </span>
                              <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                                {session.time_slot}
                              </span>
                              <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => handleFastNudgeSession(session, -15, e)}
                                  className="px-1 py-0.2 rounded text-[8px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900"
                                  title="15 dk geri kaydır"
                                >
                                  -15
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleFastNudgeSession(session, 15, e)}
                                  className="px-1 py-0.2 rounded text-[8px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900"
                                  title="15 dk ileri kaydır"
                                >
                                  +15
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleDuplicateSession(session, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                                title="Kopyala (+15 dk)"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[10px] font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 px-1 py-0.2 rounded">
                                {student.class_grade}
                              </span>
                            </div>
                          </div>
                          <div className="font-medium text-xs text-stone-900 dark:text-stone-100 truncate">
                            {student.full_name}
                          </div>
                          {session.topic && (
                            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                              {session.topic}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1 mt-1 border-t border-stone-100 dark:border-stone-800">
                            <button
                              type="button"
                              onClick={(e) => handleToggleStatus(session, e)}
                              className={`text-[9px] font-medium px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                                session.status === 'Geldi'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : session.status === 'Gelmedi'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                              }`}
                            >
                              {session.status}
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleTogglePriority(session, e)}
                                className="p-1 rounded text-stone-400 hover:text-amber-500 transition-colors cursor-pointer"
                                title="Yüksek Öncelikli Yap"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleSendWhatsAppSummary(session, e)}
                                className="p-1 rounded text-stone-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                title="WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Case 3: Empty Existing Slot
                    return (
                      <div
                        key={session.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (dragOverSlotId !== session.id) setDragOverSlotId(session.id);
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          if (dragOverSlotId === session.id) setDragOverSlotId(null);
                        }}
                        onDrop={(e) => handleSlotDrop(session, e)}
                        className={`group relative p-1.5 px-2 rounded border border-dashed transition-colors flex items-center justify-between text-xs ${
                          isDragOverThis
                            ? 'border-teal-500 bg-teal-50 dark:bg-stone-900 ring-1 ring-teal-500'
                            : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400 font-medium px-1 py-0.2 rounded bg-stone-100 dark:bg-stone-800">
                            {session.time_slot}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleFastNudgeSession(session, -15, e)}
                              className="px-1 py-0.2 rounded text-[8px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900"
                              title="15 dk geri al"
                            >
                              -15
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleFastNudgeSession(session, 15, e)}
                              className="px-1 py-0.2 rounded text-[8px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900"
                              title="15 dk ileri al"
                            >
                              +15
                            </button>
                          </div>
                        </div>

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
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 text-[10px] font-medium transition-colors cursor-pointer"
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
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-rose-500 transition-opacity cursor-pointer"
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

              {/* Day Bottom Actions with Smart Next Slot Calculation */}
              {(() => {
                const lastSession = displayedDaySessions[displayedDaySessions.length - 1];
                const smartNextTime = lastSession ? addMinutesToTime(lastSession.time_slot, 15) : '09:00';
                const isDayPopoverOpen = showDayAddPopover === day.date;

                return (
                  <div className="p-2 border-t border-white/[0.04] flex items-center justify-between bg-white/[0.01] gap-1 relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateEmptySlot(day.date, smartNextTime);
                      }}
                      className="text-[11px] text-zinc-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title={`${smartNextTime} saatine 15 dakikalık yeni seans ekle`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>+15 dk ({smartNextTime})</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDayAddPopover(isDayPopoverOpen ? null : day.date);
                          setCustomSlotInputTime(smartNextTime);
                        }}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors text-[10px]"
                        title="Özel bir saat belirle"
                      >
                        <Clock className="w-3 h-3" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickBreakModal({
                            open: true,
                            date: day.date,
                            time: smartNextTime,
                            title: '5 dk Teneffüs',
                          });
                        }}
                        className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Bu güne teneffüs veya öğle arası ekle"
                      >
                        <Coffee className="w-2.5 h-2.5" />
                        <span>Mola</span>
                      </button>
                    </div>

                    {/* Popover for custom slot time */}
                    {isDayPopoverOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-10 left-2 right-2 p-2 rounded-xl bg-[#1a1d2b] border border-white/[0.1] shadow-xl z-20 space-y-1.5 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="flex items-center justify-between text-[11px] text-zinc-300">
                          <span className="font-medium">Özel Seans Saati:</span>
                          <button
                            type="button"
                            onClick={() => setShowDayAddPopover(null)}
                            className="p-0.5 text-zinc-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={customSlotInputTime}
                            onChange={(e) => setCustomSlotInputTime(e.target.value)}
                            className="flex-1 px-2 py-1 bg-[#0d0f17] border border-white/[0.1] rounded text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleCreateEmptySlot(day.date, customSlotInputTime);
                              setShowDayAddPopover(null);
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                          >
                            Ekle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  )}

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

            {/* Interactive Date & Time Adjustment (Table Playing / Rescheduling) */}
            <div className="p-3 bg-[#0d0f18] rounded-xl border border-white/[0.08] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Görüşme Günü & Saati Düzenle</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleDuplicateSession(quickEditingSession);
                    setQuickEditingSession(null);
                  }}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-0.5 rounded transition-colors"
                  title="Bu seansı 15 dk sonraya kopyalar"
                >
                  <Copy className="w-3 h-3 text-zinc-400" />
                  <span>Kopyasını Oluştur</span>
                </button>
              </div>

              {/* Day Selection Pills */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 block font-medium">Haftanın Hangi Gününe Taşınsın?</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {weekDays.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() =>
                        setQuickEditingSession({
                          ...quickEditingSession,
                          date: d.date,
                        })
                      }
                      className={`px-2 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                        quickEditingSession.date === d.date
                          ? 'bg-emerald-600 text-white border border-emerald-500 font-bold shadow-xs'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300'
                      }`}
                    >
                      {d.shortDayName} ({d.dayNumber})
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setQuickEditingSession({
                        ...quickEditingSession,
                        date: shiftDateString(quickEditingSession.date, 1),
                      })
                    }
                    className="px-2 py-1 rounded-md text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Seansı 1 gün sonraya kaydırır"
                  >
                    +1 Gün (Yarına)
                  </button>
                </div>
              </div>

              {/* Time Slot & Quick Nudge Buttons */}
              <div className="space-y-1 pt-1 border-t border-white/[0.04]">
                <span className="text-[10px] text-zinc-400 block font-medium">Seans Başlangıç Saati:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="time"
                    value={quickEditingSession.time_slot}
                    onChange={(e) =>
                      setQuickEditingSession({
                        ...quickEditingSession,
                        time_slot: e.target.value,
                      })
                    }
                    className="px-2.5 py-1 bg-[#05060a] border border-white/[0.12] rounded-md text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setQuickEditingSession({
                          ...quickEditingSession,
                          time_slot: shiftTimeSlotString(quickEditingSession.time_slot, -15),
                        })
                      }
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono"
                      title="15 dakika geri al"
                    >
                      -15 dk
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickEditingSession({
                          ...quickEditingSession,
                          time_slot: shiftTimeSlotString(quickEditingSession.time_slot, -5),
                        })
                      }
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono"
                      title="5 dakika geri al"
                    >
                      -5 dk
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickEditingSession({
                          ...quickEditingSession,
                          time_slot: shiftTimeSlotString(quickEditingSession.time_slot, 5),
                        })
                      }
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono"
                      title="5 dakika ileri al"
                    >
                      +5 dk
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuickEditingSession({
                          ...quickEditingSession,
                          time_slot: shiftTimeSlotString(quickEditingSession.time_slot, 15),
                        })
                      }
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono"
                      title="15 dakika ileri al"
                    >
                      +15 dk
                    </button>
                  </div>
                </div>
              </div>
            </div>

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

      {/* Official Printable Weekly A4 Log Modal */}
      {isPrintModalOpen && (
        <DailyLogPrintModal
          date={baseDate}
          sessions={sessions}
          students={students}
          counselorName={counselorName}
          initialScope="weekly"
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
}
