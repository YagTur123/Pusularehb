import React, { useState, useRef, useEffect } from 'react';
import { Session, Student, COMMON_TOPICS, ScheduleConfig, SessionFeedback } from '../types';
import {
  Calendar,
  Zap,
  Plus,
  MessageSquare,
  Bookmark,
  History,
  Trash2,
  Phone,
  AlertTriangle,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Sparkles,
  ExternalLink,
  Printer,
  LayoutList,
  Table,
  Coffee,
  Utensils,
  X,
  Sliders,
  FileText,
  Star,
  CheckCircle2,
  Filter,
  Clock,
  Pencil,
} from 'lucide-react';
import {
  getTodayDateString,
  shiftDateString,
  shiftTimeSlotString,
  formatTurkishDate,
  formatTurkishDateWithoutDay,
  displayPhone,
  StorageService,
  getWeekDays,
} from '../lib/storage';
import {
  generateIndividualSummaryText,
  generateMissedSessionReminderText,
  getWhatsAppDirectUrl,
} from '../lib/whatsapp';
import { QuickNotePopover } from './QuickNotePopover';
import { StudentHistoryModal } from './StudentHistoryModal';
import { DailyLogPrintModal } from './DailyLogPrintModal';
import { CalendarMonthPicker } from './CalendarMonthPicker';
import { WeeklySchedulerGrid } from './WeeklySchedulerGrid';
import { ScheduleConfigModal } from './ScheduleConfigModal';
import { DailyWhatsAppOfficialCard } from './DailyWhatsAppOfficialCard';
import { SessionFeedbackModal } from './SessionFeedbackModal';
import { BreakDurationModal, getBreakMinutes } from './BreakDurationModal';

// 9 Noktalı Sürükleme Tutamacı (3x3 Izgara)
function NineDotsGrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={`grid grid-cols-3 gap-0.5 w-4 h-4 p-0.5 rounded text-slate-400 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing transition-colors select-none ${className}`}
      title="Sırayı değiştirmek için sürükleyin"
    >
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
      <span className="w-0.5 h-0.5 rounded-full bg-current" />
    </div>
  );
}

interface DailySchedulerProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  sessions: Session[];
  students: Student[];
  counselorName: string;
  onUpdateSession: (session: Session) => void;
  onUpdateMultipleSessions?: (sessions: Session[]) => void;
  onDeleteSession: (id: string) => void;
  onAddSession: (session: Omit<Session, 'id' | 'created_at'>) => void;
  onFillStandardSlots: (date: string) => void;
  onFillStandardWeek?: (baseDate: string) => void;
  onOpenBroadcast: (date?: string) => void;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  onOpenStudentProfile: (student: Student) => void;
  onApplyScheduleConfig?: (dates: string[], config: ScheduleConfig, keepAssigned: boolean) => void;
  onShiftTime?: (dates: string[], deltaMinutes: number) => void;
  onAddBreak?: (date: string, timeSlot: string, title?: string) => void;
}

export function DailyScheduler({
  selectedDate,
  setSelectedDate,
  sessions,
  students,
  counselorName,
  onUpdateSession,
  onUpdateMultipleSessions,
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
}: DailySchedulerProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [activeSlotSearchId, setActiveSlotSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickNoteSession, setActiveQuickNoteSession] = useState<Session | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isScheduleConfigOpen, setIsScheduleConfigOpen] = useState(false);
  const [slotFilter, setSlotFilter] = useState<'all' | 'assigned' | 'empty' | 'missed' | 'feedback'>('all');

  // WhatsApp announcement modal state
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Drag & drop row reordering state (9 dots)
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(null);

  // Feedback modal state (seansa geldi/gelmedi işaretledikten sonra geri bildirim ekranı)
  const [activeFeedbackSession, setActiveFeedbackSession] = useState<{
    session: Session;
    status: 'Geldi' | 'Gelmedi';
  } | null>(null);

  // Suggested topics dropdown state
  const [activeTopicDropdownId, setActiveTopicDropdownId] = useState<string | null>(null);

  // Break duration quick-edit modal state
  const [editingBreakSession, setEditingBreakSession] = useState<Session | null>(null);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Sessions for currently selected date
  const dateSessions = sessions
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const assignedCount = dateSessions.filter((s) => s.student_id).length;
  const emptyCount = dateSessions.filter((s) => !s.student_id).length;
  const missedCount = dateSessions.filter((s) => s.status === 'Gelmedi').length;
  const feedbackCount = dateSessions.filter((s) => Boolean(s.feedback)).length;

  const displayedSessions = dateSessions.filter((s) => {
    if (slotFilter === 'assigned') return Boolean(s.student_id);
    if (slotFilter === 'empty') return !s.student_id;
    if (slotFilter === 'missed') return s.status === 'Gelmedi';
    if (slotFilter === 'feedback') return Boolean(s.feedback);
    return true;
  });

  // Reorder logic with automatic chronological time slot assignment
  const performReorder = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = dateSessions.findIndex((s) => s.id === sourceId);
    const targetIndex = dateSessions.findIndex((s) => s.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    // Get time slots of the current sessions in chronological order
    const originalTimeSlots = dateSessions.map((s) => s.time_slot);

    // Reorder sessions array
    const reordered = [...dateSessions];
    const [movedItem] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Automatically reassign time slots so the schedule is kept in neat chronological order
    const updatedSessions = reordered.map((item, idx) => ({
      ...item,
      time_slot: originalTimeSlots[idx],
    }));

    if (onUpdateMultipleSessions) {
      onUpdateMultipleSessions(updatedSessions);
    } else {
      for (const s of updatedSessions) {
        onUpdateSession(s);
      }
    }
  };

  // Save break duration changes and optionally shift subsequent slots
  const handleSaveBreakDuration = (updatedBreak: Session, shiftedSessions?: Session[]) => {
    if (shiftedSessions && shiftedSessions.length > 0) {
      const shiftMap = new Map(shiftedSessions.map((s) => [s.id, s]));
      const updatedDateSessions = dateSessions.map((s) => {
        if (s.id === updatedBreak.id) return updatedBreak;
        if (shiftMap.has(s.id)) return shiftMap.get(s.id)!;
        return s;
      });
      if (onUpdateMultipleSessions) {
        onUpdateMultipleSessions(updatedDateSessions);
      } else {
        updatedDateSessions.forEach((s) => onUpdateSession(s));
      }
    } else {
      onUpdateSession(updatedBreak);
    }

    if (onShowToast) {
      const isShifted = shiftedSessions && shiftedSessions.length > 0;
      onShowToast(
        'Teneffüs Süresi Güncellendi',
        `${updatedBreak.break_duration || 10} dakika olarak ayarlandı.${
          isShifted ? ' Sonraki seans saatleri otomatik kaydırıldı.' : ''
        }`,
        'success'
      );
    }
  };

  // Mouse drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedSessionId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (_) {}
    }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSessionId !== id && draggedSessionId !== id) {
      setDragOverSessionId(id);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(8);
        } catch (_) {}
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedSessionId || e.dataTransfer.getData('text/plain');
    setDraggedSessionId(null);
    setDragOverSessionId(null);

    if (!sourceId || sourceId === targetId) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([15, 10]);
      } catch (_) {}
    }
    performReorder(sourceId, targetId);
  };

  // Tablet & Touch Screen Drag-and-Drop Support (Tactile "Held in Hand")
  const touchSourceIdRef = useRef<string | null>(null);

  const handleTouchStart = (sessionId: string, _e: React.TouchEvent) => {
    touchSourceIdRef.current = sessionId;
    setDraggedSessionId(sessionId);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([30]);
      } catch (_) {}
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchSourceIdRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = element?.closest('[data-session-id]') as HTMLElement | null;
    const targetId = row?.dataset?.sessionId;
    if (targetId && targetId !== touchSourceIdRef.current) {
      if (dragOverSessionId !== targetId) {
        setDragOverSessionId(targetId);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(8);
          } catch (_) {}
        }
      }
    } else {
      setDragOverSessionId(null);
    }
  };

  const handleTouchEnd = () => {
    const sourceId = touchSourceIdRef.current;
    const targetId = dragOverSessionId;
    touchSourceIdRef.current = null;
    setDraggedSessionId(null);
    setDragOverSessionId(null);

    if (sourceId && targetId && sourceId !== targetId) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([18, 12]);
        } catch (_) {}
      }
      performReorder(sourceId, targetId);
    }
  };

  // 1-tap reorder step for tablets / quick accessibility
  const handleMoveRow = (sessionId: string, direction: 'up' | 'down') => {
    const currentIndex = dateSessions.findIndex((s) => s.id === sessionId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= dateSessions.length) return;
    const targetId = dateSessions[targetIndex].id;
    performReorder(sessionId, targetId);
  };

  // Add empty session at the bottom (after the last session of the day)
  const handleAddNewSessionRow = () => {
    let nextTime = '09:00';
    if (dateSessions.length > 0) {
      const last = dateSessions[dateSessions.length - 1];
      nextTime = shiftTimeSlotString(last.time_slot, 15);
    }
    onAddSession({
      date: selectedDate,
      time_slot: nextTime,
      student_id: null,
      topic: '',
      action_items: '',
      tags: [],
      status: 'Bekliyor',
    });
  };

  // Add break slot at the bottom (after the last session of the day)
  const handleAddNewBreakRow = (preset: 'teneffus_10' | 'teneffus_15' | 'ogle_50' = 'teneffus_10') => {
    let nextTime = '11:50';
    if (dateSessions.length > 0) {
      const last = dateSessions[dateSessions.length - 1];
      nextTime = shiftTimeSlotString(last.time_slot, 15);
    }
    const title =
      preset === 'ogle_50'
        ? '50 dk Öğle Arası & Yemek'
        : preset === 'teneffus_15'
        ? '15 dk Teneffüs'
        : '10 dk Teneffüs';

    if (onAddBreak) {
      onAddBreak(selectedDate, nextTime, title);
    } else {
      onAddSession({
        date: selectedDate,
        time_slot: nextTime,
        student_id: null,
        topic: title,
        action_items: '',
        tags: [title],
        status: 'Bekliyor',
        is_break: true,
        break_title: title,
      });
    }
  };

  // Trigger feedback modal when user marks session as "Geldi" or "Gelmedi"
  const handleTriggerFeedback = (session: Session, newStatus: 'Geldi' | 'Gelmedi') => {
    if (!session.student_id) {
      onUpdateSession({ ...session, status: newStatus });
      return;
    }
    setActiveFeedbackSession({ session, status: newStatus });
  };

  const handleSaveFeedback = (session: Session, feedback: SessionFeedback) => {
    const updated: Session = {
      ...session,
      status: feedback.status,
      feedback,
    };
    onUpdateSession(updated);
    setActiveFeedbackSession(null);
  };

  const handleSkipFeedback = (session: Session, status: 'Geldi' | 'Gelmedi') => {
    const updated: Session = {
      ...session,
      status,
    };
    onUpdateSession(updated);
    setActiveFeedbackSession(null);
  };

  const todayStr = getTodayDateString();
  const yesterdayStr = shiftDateString(todayStr, -1);
  const tomorrowStr = shiftDateString(todayStr, 1);

  // Week days for the interactive week strip
  const currentWeekDays = getWeekDays(selectedDate, false);

  // Filter students for inline search
  const filteredStudents = searchQuery.trim().length >= 1
    ? students.filter((s) =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.class_grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery)
      ).slice(0, 8)
    : [];

  const handleAssignStudent = (sessionId: string, studentId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const student = studentMap.get(studentId);
    const updated: Session = {
      ...session,
      student_id: studentId,
      // If student has status tags and session has none, auto-fill tags
      tags: session.tags.length === 0 && student?.status_flags ? [...student.status_flags] : session.tags,
      // Default topic if empty
      topic: session.topic || (student?.status_flags?.[0] ? `${student.status_flags[0]} Takibi` : 'TYT Deneme Analizi'),
    };

    onUpdateSession(updated);
    setActiveSlotSearchId(null);
    setSearchQuery('');
  };

  const handleUnassignStudent = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    onUpdateSession({
      ...session,
      student_id: null,
      topic: '',
      action_items: '',
      tags: [],
      status: 'Bekliyor',
    });
  };

  const handleStatusChange = (session: Session, newStatus: 'Bekliyor' | 'Geldi' | 'Gelmedi') => {
    const updated: Session = { ...session, status: newStatus };
    onUpdateSession(updated);
  };

  const handleSendIndividualSummary = (session: Session) => {
    if (!session.student_id) return;
    const student = studentMap.get(session.student_id);
    if (!student) return;

    const text = generateIndividualSummaryText(session, student, counselorName);
    const url = getWhatsAppDirectUrl(student.phone, text);
    window.open(url, '_blank');
  };

  const handleSendMissedReminder = (session: Session) => {
    if (!session.student_id) return;
    const student = studentMap.get(session.student_id);
    if (!student) return;

    const text = generateMissedSessionReminderText(student, session);
    const url = getWhatsAppDirectUrl(student.phone, text);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-[#0c0d12] p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.07] shadow-xs">
        {/* Left: View Mode Switcher + Interactive Date Selector + Quick switches */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: [Günlük (Liste)] [Haftalık (Çizelge)] */}
          <div className="flex items-center bg-slate-100 dark:bg-[#12141e] p-0.5 rounded-lg border border-slate-200/80 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/80 dark:bg-zinc-800 dark:text-white dark:border-transparent'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              title="Günlük detaylı seans listesi"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Günlük</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/80 dark:bg-zinc-800 dark:text-white dark:border-transparent'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              title="Haftalık ders ve seans çizelgesi matrisi"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Haftalık Çizelge</span>
            </button>
          </div>

          {/* Interactive Date Selector with Calendar Month Picker Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 dark:bg-[#181a26] dark:hover:bg-[#1e2130] dark:text-zinc-200 px-3 py-1.5 rounded-lg border border-slate-200/90 dark:border-white/[0.08] cursor-pointer transition-colors group shadow-2xs"
              title="Aylık takvim gezginini aç"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-zinc-200" />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {formatTurkishDateWithoutDay(selectedDate)}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300" />
            </button>

            {showMonthPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMonthPicker(false)}
                />
                <CalendarMonthPicker
                  selectedDate={selectedDate}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    setShowMonthPicker(false);
                  }}
                  onClose={() => setShowMonthPicker(false)}
                  sessions={sessions}
                  onOpenBroadcast={onOpenBroadcast}
                />
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Program & Teneffüs Customizer Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsScheduleConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200 dark:bg-[#221f1a] dark:hover:bg-[#2c2822] dark:border-amber-500/25 text-amber-900 hover:text-amber-950 dark:text-amber-200/90 dark:hover:text-amber-100 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            title="Seans dakikası, teneffüs süresi belirle, tablo saatlerini kaydır veya teneffüs ekle"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300/80" />
            <span>Program & Teneffüs Planla</span>
          </button>

          {/* Official Printable Daily Log */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 dark:bg-[#181a26] dark:hover:bg-[#1e2130] dark:border-white/[0.08] text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            title="Resmi görüşme defteri ve A4 çıktısı"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span>Defter</span>
          </button>
        </div>
      </div>

      {/* Interactive Week Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#141622] px-3 py-2 rounded-lg border border-slate-200/90 dark:border-white/[0.06] shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateString(selectedDate, -7))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Önceki Hafta (7 gün önce)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-center gap-1.5">
            {currentWeekDays.map((day) => {
              const isSelected = day.date === selectedDate;
              const daySessions = sessions.filter((s) => s.date === day.date);
              const dayTotal = daySessions.length;
              const dayFilled = daySessions.filter((s) => s.student_id).length;

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs border border-indigo-600 dark:bg-indigo-600 dark:text-white dark:border-transparent'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900 dark:border-transparent'
                  }`}
                  title={`${day.shortDayName} gününü seç`}
                >
                  <span className="font-bold">{day.shortDayName}</span>
                  <span
                    className={`text-[11px] font-mono ${
                      isSelected ? 'text-indigo-100 dark:text-indigo-200' : 'text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} title="Bugün" />
                  )}
                  {dayTotal > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/80 text-slate-700 dark:bg-white/[0.06] dark:text-zinc-400'
                      }`}
                    >
                      {dayFilled}/{dayTotal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateString(selectedDate, 7))}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Sonraki Hafta (7 gün sonra)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="text-slate-700 hover:text-slate-950 font-medium hover:underline cursor-pointer dark:text-zinc-400 dark:hover:text-white"
          >
            Bugüne Dön
          </button>
          <span className="text-slate-300 dark:text-zinc-700">|</span>
          <span className="text-slate-700 dark:text-zinc-400 font-mono text-[11px] font-medium">
            {currentWeekDays[0]?.dayNumber} - {currentWeekDays[currentWeekDays.length - 1]?.dayNumber}{' '}
            {formatTurkishDate(selectedDate).split(' ')[1]}
          </span>
        </div>
      </div>

      {/* Main Scheduler Body: Weekly Matrix Grid OR Daily Detailed Table */}
      {viewMode === 'weekly' ? (
        <WeeklySchedulerGrid
          baseDate={selectedDate}
          onSelectDate={(d) => setSelectedDate(d)}
          sessions={sessions}
          students={students}
          counselorName={counselorName}
          onUpdateSession={onUpdateSession}
          onDeleteSession={onDeleteSession}
          onAddSession={onAddSession}
          onFillStandardSlots={onFillStandardSlots}
          onFillStandardWeek={onFillStandardWeek}
          onOpenBroadcast={onOpenBroadcast}
          onShowToast={onShowToast}
          onOpenStudentProfile={onOpenStudentProfile}
          onApplyScheduleConfig={onApplyScheduleConfig}
          onShiftTime={onShiftTime}
          onAddBreak={onAddBreak}
        />
      ) : (
        /* Daily Detailed View */
        <div className="space-y-4">
          {/* Daily Detailed Table */}
          <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-[#141622] shadow-sm dark:shadow-2xl transition-colors">
            {dateSessions.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50/50 dark:bg-[#10121c]/40">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3.5 border border-indigo-200/80 dark:border-indigo-500/20 shadow-xs">
                  <Calendar className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bu tarihte planlanmış seans yok
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                  Gününüzü tek tıkla standart çalışma saatlerine bölebilir veya ihtiyacınıza göre serbest aralıklar tanımlayabilirsiniz.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onFillStandardSlots(selectedDate)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Standart Saatleri Yükle (09:00 - 16:40)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewSessionRow}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Boş Seans Ekle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScheduleConfigOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Zil & Mola Yapılandır</span>
                  </button>
                </div>
              </div>
            ) : (
            <div>
              {/* Professional Table Toolbar & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 bg-slate-50/80 dark:bg-[#10121c] border-b border-slate-200/80 dark:border-white/[0.08] text-xs">
                {/* Status Filter Tabs (Linear-inspired segmented switch) */}
                <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-[#0c0d12] p-1 rounded-lg border border-slate-200/80 dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setSlotFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      slotFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90 dark:bg-zinc-800 dark:text-white dark:border-transparent'
                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Tümü ({dateSessions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotFilter('assigned')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      slotFilter === 'assigned'
                        ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/90 dark:bg-zinc-800 dark:text-emerald-400 dark:border-transparent'
                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Dolu ({assignedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotFilter('empty')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      slotFilter === 'empty'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200/90 dark:bg-zinc-800 dark:text-white dark:border-transparent'
                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Boş ({emptyCount})
                  </button>
                  {missedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSlotFilter('missed')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        slotFilter === 'missed'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      Gelmedi ({missedCount})
                    </button>
                  )}
                </div>

                {/* Day Summary Badge */}
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <span className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/90 dark:border-zinc-700 font-mono shadow-2xs">
                    Toplam {dateSessions.length} Seans / Aralık
                  </span>
                </div>
              </div>

              {/* Empty state when active filter has 0 results */}
              {displayedSessions.length === 0 ? (
                <div className="text-center py-14 px-4 bg-slate-50/50 dark:bg-[#10121c]/50">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 mb-3 border border-slate-200 dark:border-white/[0.08]">
                    {slotFilter === 'missed' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : slotFilter === 'empty' ? (
                      <Sparkles className="w-6 h-6 text-amber-500" />
                    ) : (
                      <Filter className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {slotFilter === 'missed' && 'Harika! Bugün randevusuna gelmeyen öğrenci yok'}
                    {slotFilter === 'empty' && 'Tüm seans saatleri dolu! Boş kontenjan kalmadı'}
                    {slotFilter === 'assigned' && 'Bugün henüz öğrenci atanmış seans yok'}
                    {slotFilter === 'all' && 'Kayıtlı seans bulunamadı'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    {slotFilter === 'missed'
                      ? 'Planlanan tüm seanslara öğrenciler eksiksiz katılım sağladı.'
                      : 'Filtreleme kriterlerine uyan seans veya mola aralığı bulunamadı.'}
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setSlotFilter('all')}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Tüm Seansları Göster ({dateSessions.length})
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table (hidden on mobile/tablet screens) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 dark:bg-[#0c0e17] border-b border-slate-200 dark:border-white/[0.08] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 select-none">
                          <th className="align-middle py-3 px-2 w-14 text-center" title="Sıralama (9 Nokta ile Tutup Sürükleyin / Tablet / Oklar)"></th>
                          <th className="align-middle py-3 px-3 w-28 font-mono">Saat</th>
                          <th className="align-middle py-3 px-3.5 min-w-[220px]">Öğrenci</th>
                          <th className="align-middle py-3 px-3.5 min-w-[240px]">Görüşme Konusu & Teşhis</th>
                          <th className="align-middle py-3 px-3.5 w-52">Durum & Değerlendirme</th>
                          <th className="align-middle py-3 px-3.5 text-right w-44">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="font-sans divide-y divide-slate-200/90 dark:divide-white/[0.07]">
                        {displayedSessions.map((session) => {
                          const isBeingHeld = draggedSessionId === session.id;
                          const isDropTarget = dragOverSessionId === session.id;

                          if (session.is_break) {
                            const isLunch =
                              session.break_title?.toLowerCase().includes('öğle') ||
                              session.topic?.toLowerCase().includes('öğle');
                            return (
                              <tr
                                key={session.id}
                                data-session-id={session.id}
                                onDragOver={(e) => handleDragOver(e, session.id)}
                                onDrop={(e) => handleDrop(e, session.id)}
                                onDragEnd={() => {
                                  setDraggedSessionId(null);
                                  setDragOverSessionId(null);
                                }}
                                className={`group relative transition-colors duration-150 ${
                                  isBeingHeld
                                    ? 'drag-held-card z-40 bg-indigo-50/95 dark:bg-[#1a1d32] border-indigo-400 dark:border-indigo-500'
                                    : isDropTarget
                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-t-[3px] border-indigo-600 dark:border-indigo-400 drop-shelf-indicator'
                                    : isLunch
                                    ? 'bg-amber-50/70 hover:bg-amber-100/60 border-l-[3px] border-l-amber-500 dark:bg-amber-950/20 dark:border-l-amber-500'
                                    : 'bg-amber-50/40 hover:bg-amber-100/50 border-l-[3px] border-l-amber-400 dark:bg-[#10121a] dark:border-l-amber-400'
                                }`}
                              >
                                {/* 9 Noktalı Sürükleme Tutamacı & Tablet Kontrolleri */}
                                <td className="align-middle py-3 px-2 w-14 text-center select-none relative">
                                  {isDropTarget && (
                                    <span className="absolute -top-1.5 left-2 w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400 border-2 border-white dark:border-zinc-900 shadow-md z-30 animate-pulse pointer-events-none" />
                                  )}
                                  <div className="flex items-center justify-center gap-1">
                                    <div
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, session.id)}
                                      onTouchStart={(e) => handleTouchStart(session.id, e)}
                                      onTouchMove={handleTouchMove}
                                      onTouchEnd={handleTouchEnd}
                                      onTouchCancel={handleTouchEnd}
                                      style={{ touchAction: 'none' }}
                                      className={`p-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-all touch-none select-none ${
                                        isBeingHeld
                                          ? 'bg-indigo-600 text-white shadow-md scale-110 ring-2 ring-indigo-300'
                                          : 'hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-zinc-200'
                                      }`}
                                      title="Sürükleyip sırayı değiştirmek için basılı tutun"
                                    >
                                      <NineDotsGrip className={isBeingHeld ? 'text-white' : ''} />
                                    </div>
                                    <div className="flex flex-col items-center -space-y-0.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveRow(session.id, 'up');
                                        }}
                                        disabled={dateSessions.findIndex((s) => s.id === session.id) === 0}
                                        className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                        title="Yukarı taşı"
                                      >
                                        <ChevronUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveRow(session.id, 'down');
                                        }}
                                        disabled={dateSessions.findIndex((s) => s.id === session.id) === dateSessions.length - 1}
                                        className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                        title="Aşağı taşı"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Saat Column */}
                                <td className="align-middle py-3 px-3 font-mono whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setEditingBreakSession(session)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono transition-all cursor-pointer hover:ring-2 hover:ring-amber-400/60 ${
                                      isLunch
                                        ? 'bg-amber-100 text-amber-950 border border-amber-300/80 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30'
                                        : 'bg-slate-100 text-slate-800 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 hover:bg-amber-100/70'
                                    }`}
                                    title="Teneffüs süresini değiştirmek için tıklayın"
                                  >
                                    {isLunch ? (
                                      <Utensils className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                    ) : (
                                      <Coffee className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
                                    )}
                                    {session.time_slot}
                                  </button>
                                </td>

                                <td colSpan={3} className="align-middle py-3 px-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingBreakSession(session)}
                                      className="group/break inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100/80 hover:bg-amber-200/90 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-950 dark:text-amber-100 border border-amber-300/80 dark:border-amber-500/30 transition-all cursor-pointer text-left shadow-2xs"
                                      title="Teneffüs süresini (kaç dakika) değiştirmek için dokunun"
                                    >
                                      <span className="text-xs font-bold">
                                        {session.break_title ||
                                          session.topic ||
                                          (isLunch ? 'Öğle Arası' : 'Teneffüs')}
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold font-mono bg-white/85 dark:bg-black/40 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-500/30">
                                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                        <span>{getBreakMinutes(session)} dk</span>
                                      </span>
                                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 group-hover/break:text-amber-950 dark:group-hover/break:text-white flex items-center gap-0.5 ml-1">
                                        <Pencil className="w-3 h-3" />
                                        <span className="underline decoration-amber-500/60">Süreyi Düzenle</span>
                                      </span>
                                    </button>
                                    {isLunch && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200/80 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-300/80 dark:border-amber-500/30">
                                        Yemek & Dinlenme
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="align-middle py-3 px-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => onDeleteSession(session.id)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                    title={isLunch ? 'Öğle Arasını Kaldır' : 'Teneffüsü Kaldır'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          }

                          const student = session.student_id
                            ? studentMap.get(session.student_id)
                            : undefined;

                          const isCompleted = session.status === 'Geldi';
                          const isMissed = session.status === 'Gelmedi';
                          const isPending = session.status === 'Bekliyor';

                          return (
                            <tr
                              key={session.id}
                              data-session-id={session.id}
                              onDragOver={(e) => handleDragOver(e, session.id)}
                              onDrop={(e) => handleDrop(e, session.id)}
                              onDragEnd={() => {
                                setDraggedSessionId(null);
                                setDragOverSessionId(null);
                              }}
                              className={`group relative transition-colors duration-150 ${
                                isBeingHeld
                                  ? 'drag-held-card z-40 bg-indigo-50/95 dark:bg-[#1a1d32] border-indigo-400 dark:border-indigo-500'
                                  : isDropTarget
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-t-[3px] border-indigo-600 dark:border-indigo-400 drop-shelf-indicator'
                                  : isCompleted
                                  ? 'bg-emerald-50/35 hover:bg-emerald-50/60 border-l-[3px] border-l-emerald-600 dark:bg-emerald-950/[0.08] dark:hover:bg-emerald-950/[0.14] dark:border-l-emerald-500'
                                  : isMissed
                                  ? 'bg-rose-50/35 hover:bg-rose-50/60 border-l-[3px] border-l-rose-600 dark:bg-rose-950/[0.08] dark:hover:bg-rose-950/[0.14] dark:border-l-rose-500'
                                  : 'bg-white hover:bg-indigo-50/30 border-l-[3px] border-l-transparent dark:bg-[#141622] dark:hover:bg-[#181b2a]'
                              }`}
                            >
                              {/* 9 Noktalı Sürükleme Tutamacı & Tablet Kontrolleri */}
                              <td className="align-middle py-3 px-2 w-14 text-center select-none relative">
                                {isDropTarget && (
                                  <span className="absolute -top-1.5 left-2 w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400 border-2 border-white dark:border-zinc-900 shadow-md z-30 animate-pulse pointer-events-none" />
                                )}
                                <div className="flex items-center justify-center gap-1">
                                  <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, session.id)}
                                    onTouchStart={(e) => handleTouchStart(session.id, e)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchCancel={handleTouchEnd}
                                    style={{ touchAction: 'none' }}
                                    className={`p-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-all touch-none select-none ${
                                      isBeingHeld
                                        ? 'bg-indigo-600 text-white shadow-md scale-110 ring-2 ring-indigo-300'
                                        : 'hover:bg-slate-200/80 dark:hover:bg-zinc-800 text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-zinc-200'
                                    }`}
                                    title="Sürükleyip sırayı değiştirmek için basılı tutun"
                                  >
                                    <NineDotsGrip className={isBeingHeld ? 'text-white' : ''} />
                                  </div>
                                  <div className="flex flex-col items-center -space-y-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveRow(session.id, 'up');
                                      }}
                                      disabled={dateSessions.findIndex((s) => s.id === session.id) === 0}
                                      className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                      title="Yukarı taşı"
                                    >
                                      <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveRow(session.id, 'down');
                                      }}
                                      disabled={dateSessions.findIndex((s) => s.id === session.id) === dateSessions.length - 1}
                                      className="p-0.5 text-slate-400 hover:text-slate-900 disabled:opacity-20 disabled:hover:text-slate-400 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                      title="Aşağı taşı"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Saat Column */}
                              <td className="align-middle py-3 px-3 font-mono text-xs whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-bold font-mono tracking-tight">
                                  {session.time_slot}
                                </span>
                              </td>

                              {/* Öğrenci */}
                              <td className="align-middle py-3 px-3.5">
                                {student ? (
                                  <div className="flex items-center justify-between gap-2.5">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => onOpenStudentProfile(student)}
                                          className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate hover:underline text-left cursor-pointer transition-colors"
                                        >
                                          {student.full_name}
                                        </button>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 shrink-0">
                                          {student.class_grade}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-zinc-400 font-mono">
                                        <span className="font-semibold text-slate-800 dark:text-zinc-200">{displayPhone(student.phone)}</span>
                                        {student.target_goal && (
                                          <span
                                            className="text-slate-500 dark:text-zinc-400 font-sans truncate max-w-[140px]"
                                            title={student.target_goal}
                                          >
                                            &bull; {student.target_goal}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleUnassignStudent(session.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                                      title="Seansı boşalt"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  /* Fast Slot Assignment Input with autocomplete */
                                  <div className="relative">
                                    {activeSlotSearchId === session.id ? (
                                      <div className="relative">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={searchQuery}
                                          onChange={(e) => setSearchQuery(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && filteredStudents.length > 0) {
                                              handleAssignStudent(session.id, filteredStudents[0].id);
                                            }
                                            if (e.key === 'Escape') {
                                              setActiveSlotSearchId(null);
                                              setSearchQuery('');
                                            }
                                          }}
                                          placeholder="Öğrenci adı yazıp Enter'a basın..."
                                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#07080b] border border-indigo-500 dark:border-indigo-400 text-xs text-slate-900 dark:text-white focus:outline-none font-mono shadow-xs"
                                        />

                                        {/* Suggestions dropdown */}
                                        {filteredStudents.length > 0 && (
                                          <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-[#0e1015] border border-slate-300 dark:border-white/[0.08] shadow-2xl z-40 p-1 divide-y divide-slate-100 dark:divide-white/[0.04]">
                                            {filteredStudents.map((st, idx) => (
                                              <button
                                                key={st.id}
                                                type="button"
                                                onClick={() => handleAssignStudent(session.id, st.id)}
                                                className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer ${
                                                  idx === 0
                                                    ? 'bg-slate-100 text-slate-950 dark:bg-white/[0.08] dark:text-white font-semibold'
                                                    : 'text-slate-800 dark:text-zinc-300'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-slate-900 dark:text-white">{st.full_name}</span>
                                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 font-semibold">
                                                    {st.class_grade}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                                                  {st.phone}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveSlotSearchId(session.id);
                                          setSearchQuery('');
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-700 dark:text-zinc-400 dark:hover:text-indigo-300 transition-colors flex items-center justify-between cursor-pointer"
                                      >
                                        <span className="text-xs font-semibold">+ Randevu Ata</span>
                                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 font-semibold">
                                          Seç
                                        </kbd>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Konu & Teşhis Notu */}
                              <td className="align-middle py-3 px-3.5">
                                <div className="space-y-1">
                                  {/* Topic Input with suggestion dropdown trigger */}
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={session.topic}
                                      onChange={(e) => {
                                        onUpdateSession({ ...session, topic: e.target.value });
                                      }}
                                      onFocus={() => setActiveTopicDropdownId(session.id)}
                                      placeholder="Görüşme konusu veya teşhis..."
                                      className="w-full bg-slate-50/70 hover:bg-slate-100 focus:bg-white dark:bg-[#0e1017] dark:hover:bg-zinc-800/60 dark:focus:bg-[#090a0f] border border-slate-200/80 focus:border-indigo-500 dark:border-zinc-700/80 dark:focus:border-indigo-400 rounded-md text-xs font-medium text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 px-2.5 py-1.5 focus:outline-none transition-all"
                                    />

                                    {/* Dropdown with suggested common topics */}
                                    {activeTopicDropdownId === session.id && (
                                      <div
                                        className="absolute left-0 top-full mt-1 w-56 rounded-lg bg-white dark:bg-[#0e1015] border border-slate-300 dark:border-white/[0.08] shadow-2xl p-1 z-30 animate-in fade-in"
                                        onMouseLeave={() => setActiveTopicDropdownId(null)}
                                      >
                                        {COMMON_TOPICS.map((top) => (
                                          <button
                                            key={top}
                                            type="button"
                                            onClick={() => {
                                              onUpdateSession({ ...session, topic: top });
                                              setActiveTopicDropdownId(null);
                                            }}
                                            className="w-full text-left px-2.5 py-1.5 rounded text-xs text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white truncate cursor-pointer font-medium"
                                          >
                                            {top}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Tag Chips / Action Item preview */}
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {session.tags && session.tags.length > 0 ? (
                                      <>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/80">
                                          {session.tags[0]}
                                        </span>
                                        {session.tags.length > 1 && (
                                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate max-w-[150px]">
                                            {session.tags.slice(1).join(', ')}
                                          </span>
                                        )}
                                      </>
                                    ) : null}
                                    {session.action_items && (
                                      <span
                                        className="text-[10px] text-slate-600 dark:text-zinc-400 font-normal truncate max-w-[150px]"
                                        title={session.action_items}
                                      >
                                        &bull; {session.action_items}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Durum Toggle: [Bekliyor] [Geldi] [Gelmedi] */}
                              <td className="align-middle py-3 px-3.5">
                                <div className="inline-flex items-center rounded-lg p-0.5 bg-slate-100 dark:bg-[#090a0f] border border-slate-200/90 dark:border-white/[0.06] text-[11px]">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(session, 'Bekliyor');
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                                      isPending
                                        ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/90 dark:bg-zinc-800 dark:text-zinc-100 dark:border-transparent'
                                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                                    }`}
                                  >
                                    <span>Bekliyor</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerFeedback(session, 'Geldi');
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                                      isCompleted
                                        ? 'bg-emerald-600 text-white font-bold shadow-xs dark:bg-emerald-600 dark:text-white'
                                        : 'text-slate-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                                    }`}
                                    title="Seansı tamamla ve geri bildirim ekranını aç"
                                  >
                                    <span>Geldi</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerFeedback(session, 'Gelmedi');
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                                      isMissed
                                        ? 'bg-rose-600 text-white font-bold shadow-xs dark:bg-rose-600 dark:text-white'
                                        : 'text-slate-600 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                                    }`}
                                    title="Gelmedi işaretle ve mazeret/telafi formunu aç"
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isMissed ? 'bg-white' : 'bg-slate-400 dark:bg-zinc-600'
                                      }`}
                                    />
                                    <span>Gelmedi</span>
                                  </button>
                                </div>

                                {/* Geri Bildirim Özeti Rozeti */}
                                {session.feedback && (
                                  <div className="mt-1.5 flex items-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFeedbackSession({
                                          session,
                                          status: session.status === 'Gelmedi' ? 'Gelmedi' : 'Geldi',
                                        });
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                                        session.feedback.status === 'Geldi'
                                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                                          : 'bg-rose-50 text-rose-900 border-rose-300/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                                      }`}
                                      title="Geri bildirim detayını incele veya düzenle"
                                    >
                                      <FileText className="w-3 h-3 shrink-0" />
                                      <span className="truncate max-w-[140px]">
                                        {session.feedback.status === 'Geldi'
                                          ? `${session.feedback.efficiency || 'Verimli'} (${session.feedback.rating || 5}★)`
                                          : `Mazeret: ${session.feedback.reason || 'Gelmedi'}`}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* İşlemler (Temiz, çerçevesiz, hover-vurgulu butonlar) */}
                              <td className="align-middle py-3 px-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Quick Note / Teşhis Popover trigger */}
                                  <button
                                    type="button"
                                    onClick={() => setActiveQuickNoteSession(session)}
                                    className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                      session.tags?.length || session.action_items
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                                    }`}
                                    title="Not ve Etiketler"
                                  >
                                    <Bookmark className="w-4 h-4" />
                                  </button>

                                  {/* 1-on-1 WhatsApp Summary Card Engine */}
                                  {student && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendIndividualSummary(session)}
                                      className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                      title="WhatsApp Seans Kartı Gönder"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Gelmedi Auto-reminder button */}
                                  {isMissed && student && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendMissedReminder(session)}
                                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                                      title="Randevu Hatırlatması Gönder"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                      <span className="hidden sm:inline">Uyar</span>
                                    </button>
                                  )}

                                  {/* Student Past History Log */}
                                  {student && (
                                    <button
                                      type="button"
                                      onClick={() => setHistoryStudent(student)}
                                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                      title="Görüşme geçmişi"
                                    >
                                      <History className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* Delete Session */}
                                  <button
                                    type="button"
                                    onClick={() => onDeleteSession(session.id)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Seansı sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

              {/* Mobile & Tablet Card View: block on screens below md */}
              <div className="block md:hidden p-3 space-y-3 bg-slate-50/70 dark:bg-[#0e1017]">
                {displayedSessions.map((session, index) => {
                  if (session.is_break) {
                    const isLunch =
                      session.break_title?.toLowerCase().includes('öğle') ||
                      session.topic?.toLowerCase().includes('öğle');
                    return (
                      <div
                        key={session.id}
                        className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/90 dark:border-amber-800/30 border-l-4 border-l-amber-500 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => setEditingBreakSession(session)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group/mbreak"
                          title="Teneffüs süresini değiştirmek için dokunun"
                        >
                          <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-300 px-2 py-1 rounded bg-amber-100/90 dark:bg-amber-900/40 shrink-0">
                            {session.time_slot}
                          </span>
                          <div className="flex items-center gap-1.5 truncate">
                            {isLunch ? (
                              <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Coffee className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 truncate group-hover/mbreak:underline">
                              {session.break_title || session.topic || 'Mola / Teneffüs'}
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{getBreakMinutes(session)} dk</span>
                              <Pencil className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveRow(session.id, 'up')}
                            disabled={index === 0}
                            className="p-2 rounded-lg bg-amber-100/80 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 disabled:opacity-30 transition-colors"
                            title="Yukarı taşı"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRow(session.id, 'down')}
                            disabled={index === displayedSessions.length - 1}
                            className="p-2 rounded-lg bg-amber-100/80 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 disabled:opacity-30 transition-colors"
                            title="Aşağı taşı"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSession(session.id)}
                            className="p-2 rounded-lg text-amber-700 hover:text-rose-600 hover:bg-rose-50 dark:text-amber-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Molayı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const student = session.student_id ? studentMap.get(session.student_id) : undefined;
                  const isPending = session.status === 'Bekliyor';
                  const isCompleted = session.status === 'Geldi';
                  const isMissed = session.status === 'Gelmedi';

                  const borderAccent = isMissed
                    ? 'border-l-4 border-l-rose-500'
                    : isCompleted
                    ? 'border-l-4 border-l-emerald-500'
                    : student
                    ? 'border-l-4 border-l-indigo-500'
                    : 'border-l-4 border-l-slate-300 dark:border-l-zinc-700';

                  const hasRisk = student?.status_flags?.some((f) =>
                    f.toLowerCase().includes('kırmızı') ||
                    f.toLowerCase().includes('risk') ||
                    f.toLowerCase().includes('kaygı')
                  );

                  return (
                    <div
                      key={session.id}
                      className={`p-3.5 rounded-xl bg-white dark:bg-[#141622] border border-slate-200/90 dark:border-white/[0.08] ${borderAccent} shadow-xs space-y-3`}
                    >
                      {/* Top Row: Time Badge + Risk Indicator + Quick Reorder + Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700">
                            {session.time_slot}
                          </span>
                          {hasRisk && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Öncelikli</span>
                            </span>
                          )}
                          {session.tags?.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveRow(session.id, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-25 transition-colors cursor-pointer"
                            title="Yukarı taşı"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRow(session.id, 'down')}
                            disabled={index === displayedSessions.length - 1}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-25 transition-colors cursor-pointer"
                            title="Aşağı taşı"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSession(session.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Seansı sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Student Section */}
                      <div>
                        {student ? (
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenStudentProfile(student)}
                                  className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition-colors cursor-pointer"
                                >
                                  {student.full_name}
                                </button>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40">
                                  {student.class_grade}
                                </span>
                              </div>
                              {student.target_goal && (
                                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                  Hedef: {student.target_goal}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUnassignStudent(session.id)}
                              className="text-[11px] text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Öğrenciyi kaldır"
                            >
                              Kaldır
                            </button>
                          </div>
                        ) : (
                          <div>
                            {activeSlotSearchId === session.id ? (
                              <div className="space-y-2">
                                <div className="relative">
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Öğrenci adı veya sınıf ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-indigo-400 dark:border-indigo-500 text-xs text-slate-900 dark:text-white focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSlotSearchId(null);
                                      setSearchQuery('');
                                    }}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                {filteredStudents.length > 0 && (
                                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-md divide-y divide-slate-100 dark:divide-zinc-800">
                                    {filteredStudents.map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleAssignStudent(session.id, s.id)}
                                        className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between text-slate-800 dark:text-zinc-200 cursor-pointer"
                                      >
                                        <span className="font-medium">{s.full_name}</span>
                                        <span className="text-[10px] text-slate-400">{s.class_grade}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSlotSearchId(session.id);
                                  setSearchQuery('');
                                }}
                                className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Öğrenci Seç / Randevu Ata</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Topic & Notes display */}
                      <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium text-slate-800 dark:text-zinc-200 truncate">
                            {session.topic || 'Konu belirtilmemiş'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveQuickNoteSession(session)}
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                          >
                            Düzenle
                          </button>
                        </div>
                        {session.action_items && (
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            Hedef: {session.action_items}
                          </p>
                        )}
                        {session.feedback && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
                            <span className={session.feedback.status === 'Geldi' ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-rose-700 dark:text-rose-400 font-medium'}>
                              {session.feedback.status === 'Geldi'
                                ? `✓ Değerlendirme: ${session.feedback.efficiency || 'Verimli'} (${session.feedback.rating || 5}★)`
                                : `✗ Mazeret: ${session.feedback.reason || 'Gelmedi'}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Mobile Touch-Friendly Status Switcher (Min 40px touch height) */}
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-[#090a0f] p-1 rounded-xl border border-slate-200/90 dark:border-white/[0.06] text-xs">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(session, 'Bekliyor')}
                          className={`min-h-[40px] rounded-lg font-semibold transition-all flex items-center justify-center cursor-pointer ${
                            isPending
                              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/90 dark:bg-zinc-800 dark:text-white dark:border-transparent'
                              : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          Bekliyor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerFeedback(session, 'Geldi')}
                          className={`min-h-[40px] rounded-lg font-semibold transition-all flex items-center justify-center cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-600 text-white shadow-2xs dark:bg-emerald-600 dark:text-white'
                              : 'text-slate-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          Geldi
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerFeedback(session, 'Gelmedi')}
                          className={`min-h-[40px] rounded-lg font-semibold transition-all flex items-center justify-center cursor-pointer ${
                            isMissed
                              ? 'bg-rose-600 text-white shadow-2xs dark:bg-rose-600 dark:text-white'
                              : 'text-slate-600 hover:text-rose-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                          }`}
                        >
                          Gelmedi
                        </button>
                      </div>

                      {/* Mobile Action Bar: Quick Drawer + WhatsApp + Call + History */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                        <button
                          type="button"
                          onClick={() => setActiveQuickNoteSession(session)}
                          className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Not & Çekmece</span>
                        </button>

                        {student && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendIndividualSummary(session)}
                              className="py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              title="WhatsApp Kartı Gönder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            {student.phone && (
                              <a
                                href={`tel:${student.phone}`}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 transition-colors"
                                title="Ara"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => setHistoryStudent(student)}
                              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                              title="Geçmiş seanslar"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

              {/* Table Footer Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-[#0c0d14] border-t border-slate-200 dark:border-white/[0.08] text-xs select-none">
                <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                  <span className="text-slate-900 dark:text-white font-semibold">
                    Toplam: {dateSessions.length} Seans
                  </span>
                  <span>&bull;</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    Dolu: {assignedCount}
                  </span>
                  <span>&bull;</span>
                  <span className="text-slate-500 dark:text-zinc-400">
                    Boş: {emptyCount}
                  </span>
                  {missedCount > 0 && (
                    <>
                      <span>&bull;</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        Gelmedi: {missedCount}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewSessionRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/40 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Boş Seans Ekle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewBreakRow('teneffus_10')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/40 transition-colors cursor-pointer"
                  >
                    <Coffee className="w-3 h-3 text-amber-600" />
                    <span>Mola Ekle</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

      {/* Session Feedback / Evaluation Modal */}
      {activeFeedbackSession && (
        <SessionFeedbackModal
          session={activeFeedbackSession.session}
          student={
            activeFeedbackSession.session.student_id
              ? studentMap.get(activeFeedbackSession.session.student_id)
              : undefined
          }
          initialStatus={activeFeedbackSession.status}
          onSaveFeedback={handleSaveFeedback}
          onSkipFeedback={handleSkipFeedback}
          onClose={() => setActiveFeedbackSession(null)}
        />
      )}

      {/* Official Daily Log Print Modal */}
      {showPrintModal && (
        <DailyLogPrintModal
          date={selectedDate}
          sessions={sessions}
          students={students}
          counselorName={counselorName}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Quick Note & Diagnosis Popover */}
      {activeQuickNoteSession && (
        <QuickNotePopover
          session={activeQuickNoteSession}
          student={
            activeQuickNoteSession.student_id
              ? studentMap.get(activeQuickNoteSession.student_id)
              : undefined
          }
          onSave={(updatedFields) => {
            const merged = { ...activeQuickNoteSession, ...updatedFields };
            onUpdateSession(merged);
            setActiveQuickNoteSession(null);
            onShowToast('Seans Notu Kaydedildi', 'Teşhis ve hedefler güncellendi.', 'success');
          }}
          onClose={() => setActiveQuickNoteSession(null)}
        />
      )}

      {/* Student History Timeline Modal */}
      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          allSessions={sessions}
          counselorName={counselorName}
          onClose={() => setHistoryStudent(null)}
        />
      )}

      {/* Floating Bottom-Right Trigger: Günün WhatsApp İlanı (Sadece WhatsApp Logosu) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsWhatsAppModalOpen(true)}
          className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer flex items-center justify-center border-2 border-white/60 dark:border-white/20 group relative hover:scale-105"
          title="Günün WhatsApp Seans İlanını Aç"
          aria-label="WhatsApp İlanı"
        >
          <MessageCircle className="w-7 h-7 text-white fill-white/20 transition-transform group-hover:scale-110" />
          {assignedCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-slate-950 dark:bg-black border-2 border-white text-[10px] font-mono font-bold text-white flex items-center justify-center shadow-md">
              {assignedCount}
            </span>
          )}
        </button>
      </div>

      {/* Modal: Günün WhatsApp İlanı Popup */}
      {isWhatsAppModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsWhatsAppModalOpen(false)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <DailyWhatsAppOfficialCard
              selectedDate={selectedDate}
              sessions={sessions}
              students={students}
              counselorName={counselorName}
              onShowToast={onShowToast}
              onOpenPrintModal={() => {
                setIsWhatsAppModalOpen(false);
                setShowPrintModal(true);
              }}
              onClose={() => setIsWhatsAppModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* SCHEDULE CONFIGURATION MODAL (Minutes, Breaks, Shift, Recess) */}
      <ScheduleConfigModal
        isOpen={isScheduleConfigOpen}
        onClose={() => setIsScheduleConfigOpen(false)}
        selectedDate={selectedDate}
        weekDays={currentWeekDays}
        onApplySchedule={onApplyScheduleConfig}
        onShiftTime={onShiftTime}
        onAddBreak={onAddBreak}
        onShowToast={onShowToast}
      />

      {/* BREAK DURATION QUICK EDIT MODAL */}
      <BreakDurationModal
        isOpen={Boolean(editingBreakSession)}
        onClose={() => setEditingBreakSession(null)}
        session={editingBreakSession}
        allDateSessions={dateSessions}
        onSaveBreakDuration={handleSaveBreakDuration}
      />
    </div>
  );
}
