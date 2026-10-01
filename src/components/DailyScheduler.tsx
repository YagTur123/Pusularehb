import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Session, Student, COMMON_TOPICS, ScheduleConfig, SessionFeedback, SessionStatus } from '../types';
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
  XCircle,
  Filter,
  Clock,
  Pencil,
  Send,
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
  openExternalUrl,
  copyToClipboard,
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
import { WhatsAppQueueModal } from './WhatsAppQueueModal';

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
  onShowToast?: (
    title: string,
    desc?: string,
    type?: 'success' | 'info' | 'warning',
    action?: { label: string; onClick: () => void },
    duration?: number
  ) => void;
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
  const [emptySlotSearchIndex, setEmptySlotSearchIndex] = useState(0);
  const [activeQuickNoteSession, setActiveQuickNoteSession] = useState<Session | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isScheduleConfigOpen, setIsScheduleConfigOpen] = useState(false);
  const [slotFilter, setSlotFilter] = useState<'all' | 'assigned' | 'empty' | 'missed' | 'feedback'>('all');

  // WhatsApp announcement & sequential queue modal states
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isWhatsAppQueueOpen, setIsWhatsAppQueueOpen] = useState(false);

  // Live timer for next session countdown & keyboard hover/focus tracking
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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

  // Assigned sessions for selected date & unsent message count
  const assignedDateSessions = dateSessions.filter((s) => s.student_id && !s.is_break);
  const unsentMessagesCount = assignedDateSessions.filter((s) => !s.whatsapp_sent).length;

  // Live timer tick every 10 seconds for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Next session calculation: prioritize active/in-progress, then next upcoming pending
  const nextSession = useMemo(() => {
    // 1. Any session in progress
    const inProgress = assignedDateSessions.find((s) => s.is_in_progress);
    if (inProgress) return inProgress;

    // 2. Pending sessions
    const pending = assignedDateSessions.filter((s) => s.status === 'Bekliyor');
    if (pending.length === 0) return null;

    const todayStr = getTodayDateString();
    if (selectedDate === todayStr) {
      const currentH = currentTime.getHours();
      const currentM = currentTime.getMinutes();
      const currentTotalMin = currentH * 60 + currentM;

      // Find first session whose end time hasn't passed (approx start + 40 mins)
      const upcoming = pending.find((s) => {
        const timePart = s.time_slot.split('-')[0].trim();
        const [h, m] = timePart.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return false;
        return (h * 60 + m + 40) >= currentTotalMin;
      });
      return upcoming || pending[0];
    }

    return pending[0];
  }, [assignedDateSessions, selectedDate, currentTime]);

  const nextStudent = nextSession?.student_id ? studentMap.get(nextSession.student_id) : null;

  // Countdown text for next session
  const countdownInfo = useMemo(() => {
    if (!nextSession) {
      return { text: 'Tüm seanslar tamamlandı', isNow: false, minutes: null };
    }
    if (nextSession.is_in_progress) {
      return { text: 'Şu an devam ediyor (Başladı)', isNow: true, minutes: 0 };
    }

    const todayStr = getTodayDateString();
    if (selectedDate !== todayStr) {
      return { text: `${nextSession.time_slot} planlandı`, isNow: false, minutes: null };
    }

    const timePart = nextSession.time_slot.split('-')[0].trim();
    const [h, m] = timePart.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) {
      return { text: nextSession.time_slot, isNow: false, minutes: null };
    }

    const currentTotalMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const slotStartMin = h * 60 + m;
    const diff = slotStartMin - currentTotalMin;

    if (diff > 0) {
      if (diff > 60) {
        return {
          text: `${Math.floor(diff / 60)} sa ${diff % 60} dk kaldı`,
          isNow: false,
          minutes: diff,
        };
      }
      return { text: `${diff} dk kaldı`, isNow: false, minutes: diff };
    } else if (diff >= -40) {
      return { text: 'Vakti geldi (Devam ediyor)', isNow: true, minutes: diff };
    } else {
      return { text: 'Başlama saati geçti', isNow: false, minutes: diff };
    }
  }, [nextSession, selectedDate, currentTime]);

  // Quick action: Start session (is_in_progress)
  const handleQuickStartNext = (sess: Session) => {
    const prev = { ...sess };
    const updated: Session = {
      ...sess,
      is_in_progress: true,
      status: 'Bekliyor',
    };
    onUpdateSession(updated);
    const st = sess.student_id ? studentMap.get(sess.student_id) : null;
    onShowToast?.(
      'Seans Başlatıldı',
      `${st?.full_name || 'Öğrenci'} seansı şu an devam ediyor olarak işaretlendi.`,
      'success',
      {
        label: 'Geri Al',
        onClick: () => onUpdateSession(prev),
      },
      6000
    );
  };

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

    const sourceSession = dateSessions.find((s) => s.id === sourceId);
    const targetSession = dateSessions.find((s) => s.id === targetId);
    if (!sourceSession || !targetSession) return;

    // Conflict check: if moving a session with student onto a slot that already has a different student
    if (
      sourceSession.student_id &&
      targetSession.student_id &&
      sourceSession.student_id !== targetSession.student_id
    ) {
      const targetStudent = studentMap.get(targetSession.student_id);
      onShowToast?.(
        'Çakışma Uyarısı: Taşıma Yapılmadı',
        `${targetSession.time_slot} saatinde zaten ${targetStudent?.full_name || 'başka bir öğrenci'} seansı bulunmaktadır. Çakışma nedeniyle seans taşınamadı.`,
        'warning'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([15, 10]);
      } catch (_) {}
    }

    // Moving session into an empty slot cleanly
    if (sourceSession.student_id && !targetSession.student_id) {
      const prevSource = { ...sourceSession };
      const prevTarget = { ...targetSession };

      const newTarget: Session = {
        ...targetSession,
        student_id: sourceSession.student_id,
        topic: sourceSession.topic,
        action_items: sourceSession.action_items,
        tags: sourceSession.tags,
        status: sourceSession.status,
        next_followup_date: sourceSession.next_followup_date,
        feedback: sourceSession.feedback,
        whatsapp_sent: sourceSession.whatsapp_sent,
      };

      const newSource: Session = {
        ...sourceSession,
        student_id: null,
        topic: '',
        action_items: '',
        tags: [],
        status: 'Bekliyor',
        feedback: undefined,
        whatsapp_sent: false,
      };

      if (onUpdateMultipleSessions) {
        onUpdateMultipleSessions([newTarget, newSource]);
      } else {
        onUpdateSession(newTarget);
        onUpdateSession(newSource);
      }

      const stName = studentMap.get(sourceSession.student_id)?.full_name || 'Öğrenci';
      onShowToast?.(
        'Seans Taşındı',
        `${stName}, ${sourceSession.time_slot} saatinden ${targetSession.time_slot} saatine taşındı.`,
        'info',
        {
          label: 'Geri Al',
          onClick: () => {
            if (onUpdateMultipleSessions) {
              onUpdateMultipleSessions([prevTarget, prevSource]);
            } else {
              onUpdateSession(prevTarget);
              onUpdateSession(prevSource);
            }
          },
        },
        6000
      );
      return;
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

  const handleStatusChange = (session: Session, newStatus: SessionStatus) => {
    const prevSession = { ...session };
    const updated: Session = {
      ...session,
      status: newStatus,
      is_in_progress: newStatus === 'Bekliyor' ? session.is_in_progress : false,
    };
    onUpdateSession(updated);

    const studentName = session.student_id
      ? studentMap.get(session.student_id)?.full_name || 'Öğrenci'
      : 'Seans';

    onShowToast?.(
      `Durum: ${newStatus}`,
      `${studentName} durumu "${newStatus}" yapıldı.`,
      'info',
      {
        label: 'Geri Al',
        onClick: () => {
          onUpdateSession(prevSession);
        },
      },
      6000
    );
  };

  // Global Keyboard 1-4 for instant status change (1: Bekliyor, 2: Geldi, 3: Gelmedi, 4: Ertelendi)
  useEffect(() => {
    const handleNumKey = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (
        targetTag === 'INPUT' ||
        targetTag === 'TEXTAREA' ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        const targetSession =
          (hoveredSessionId && dateSessions.find((s) => s.id === hoveredSessionId)) ||
          (selectedSessionId && dateSessions.find((s) => s.id === selectedSessionId)) ||
          nextSession;

        if (!targetSession) return;

        e.preventDefault();
        const statusMap: Record<string, SessionStatus> = {
          '1': 'Bekliyor',
          '2': 'Geldi',
          '3': 'Gelmedi',
          '4': 'Ertelendi',
        };
        const newStatus = statusMap[e.key];
        if (newStatus) {
          handleStatusChange(targetSession, newStatus);
        }
      }
    };

    window.addEventListener('keydown', handleNumKey);
    return () => window.removeEventListener('keydown', handleNumKey);
  }, [hoveredSessionId, selectedSessionId, nextSession, dateSessions]);

  const handleSendIndividualSummary = (session: Session) => {
    if (!session.student_id) return;
    const student = studentMap.get(session.student_id);
    if (!student) return;

    const text = generateIndividualSummaryText(session, student, counselorName);
    copyToClipboard(text);
    if (StorageService.isDemo()) {
      onShowToast?.(
        'Demo Modu: Mesaj Önizlemesi',
        `Demo modunda WhatsApp bağlantısı açılmaz. Metin panoya kopyalandı: "${text.slice(0, 50)}..."`,
        'info'
      );
      return;
    }
    const url = getWhatsAppDirectUrl(student.phone, text);
    openExternalUrl(url);
  };

  const handleSendMissedReminder = (session: Session) => {
    if (!session.student_id) return;
    const student = studentMap.get(session.student_id);
    if (!student) return;

    const text = generateMissedSessionReminderText(student, session);
    copyToClipboard(text);
    if (StorageService.isDemo()) {
      onShowToast?.(
        'Demo Modu: Mesaj Önizlemesi',
        `Demo modunda WhatsApp bağlantısı açılmaz. Hatırlatma metni panoya kopyalandı.`,
        'info'
      );
      return;
    }
    const url = getWhatsAppDirectUrl(student.phone, text);
    openExternalUrl(url);
  };

  return (
    <div className="space-y-3">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 text-xs">
        {/* Left: View Mode Switcher + Interactive Date Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-md bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[5px] transition-colors cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
              title="Günlük detaylı seans listesi"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Günlük</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[5px] transition-colors cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
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
              className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700/80 dark:text-stone-100 px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 cursor-pointer transition-colors"
              title="Aylık takvim gezginini aç"
            >
              <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span className="text-xs font-medium">
                {formatTurkishDateWithoutDay(selectedDate)}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
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
          {/* WhatsApp Sıralı Gönderim */}
          <button
            type="button"
            onClick={() => setIsWhatsAppQueueOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-medium transition-colors cursor-pointer"
            title="Bugünkü seanslar için sıralı WhatsApp gönderim modu"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Sıralı Mesaj</span>
            {unsentMessagesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-600 text-white font-mono font-bold">
                {unsentMessagesCount}
              </span>
            )}
          </button>

          {/* Program & Teneffüs Planla */}
          <button
            type="button"
            onClick={() => setIsScheduleConfigOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-stone-50 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-medium transition-colors cursor-pointer"
            title="Seans dakikası, teneffüs süresi belirle, saatleri kaydır"
          >
            <Sliders className="w-3.5 h-3.5 text-stone-500" />
            <span>Program & Teneffüs Planla</span>
          </button>

          {/* Official Printable Daily Log */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-stone-50 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700/80 border border-stone-200 dark:border-stone-700 text-xs font-semibold dark:text-stone-100 transition-colors cursor-pointer"
            title="Resmi görüşme defteri ve A4 çıktısı (Yazdır / PDF)"
          >
            <Printer className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Yazdır / PDF</span>
          </button>
        </div>
      </div>

      {/* Interactive Week Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateString(selectedDate, -7))}
            className="p-1 rounded-md hover:bg-stone-100 text-stone-600 dark:hover:bg-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors cursor-pointer"
            title="Önceki Hafta (7 gün önce)"
            aria-label="Önceki Hafta"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-wrap items-center gap-1">
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
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F766E] text-white font-medium'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-900/60 dark:text-stone-300 dark:hover:text-stone-100 dark:border-stone-800'
                  }`}
                  title={`${day.shortDayName} gününü seç`}
                >
                  <span className="font-medium">{day.shortDayName}</span>
                  <span
                    className={`text-[11px] font-mono ${
                      isSelected ? 'text-white' : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-teal-600'}`} title="Bugün" />
                  )}
                  {dayTotal > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-200/70 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
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
            className="p-1 rounded-md hover:bg-stone-100 text-stone-600 dark:hover:bg-stone-800 dark:text-stone-400 dark:hover:text-stone-100 transition-colors cursor-pointer"
            title="Sonraki Hafta (7 gün sonra)"
            aria-label="Sonraki Hafta"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="text-stone-700 hover:text-teal-700 dark:text-stone-300 dark:hover:text-teal-400 font-medium cursor-pointer"
          >
            Bugüne Dön
          </button>
          <span className="text-stone-300 dark:text-stone-700">|</span>
          <span className="text-stone-500 dark:text-stone-400 font-mono text-[11px]">
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
        <div className="space-y-3">
          {/* 1. "BUGÜN" ANA EKRANI: TEK BAKIŞTA DURUM ÖZETİ & SIRADAKİ SEANS KARTI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Kart 1: Bugünkü Seans Sayısı */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Günün Seansları</span>
                </span>
                <span className="text-xs font-mono font-medium text-stone-400">
                  {formatTurkishDateWithoutDay(selectedDate)}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                    {dateSessions.length}
                  </span>
                  <span className="text-xs text-stone-500 ml-1.5">seans aralığı</span>
                </div>
                <span className="text-xs text-stone-600 dark:text-stone-400 font-mono">
                  <span className="font-semibold text-teal-700 dark:text-teal-400">{assignedCount}</span> dolu · {emptyCount} boş
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleAddNewSessionRow}
                  className="text-teal-700 dark:text-teal-400 hover:text-teal-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Yeni Seans Ekle</span>
                </button>
                <kbd className="text-[10px] font-mono text-stone-400 bg-stone-100 dark:bg-stone-800 px-1 rounded border border-stone-200 dark:border-stone-700">⌘N</kbd>
              </div>
            </div>

            {/* Kart 2: Sıradaki Seans (Canlı Geri Sayım & 1-Tık Aksiyonlar) */}
            <div className="p-3 rounded-lg bg-teal-50/40 dark:bg-stone-900/80 border border-teal-200 dark:border-teal-900/60 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-teal-900 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    <span>Sıradaki Seans</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                      countdownInfo.isNow
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 animate-pulse'
                        : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{countdownInfo.text}</span>
                  </span>
                </div>

                {nextSession && nextStudent ? (
                  <div className="mt-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono font-bold text-teal-950 dark:text-teal-200">
                        {nextSession.time_slot}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenStudentProfile(nextStudent)}
                        className="text-xs font-semibold text-stone-900 dark:text-stone-100 hover:text-teal-700 truncate cursor-pointer"
                      >
                        {nextStudent.full_name}
                      </button>
                      <span className="text-[11px] font-mono text-stone-500">
                        {nextStudent.class_grade}
                      </span>
                    </div>
                    {nextSession.topic && (
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate mt-0.5">
                        {nextSession.topic}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                    Planlanmış bekleyen seans bulunmuyor.
                  </p>
                )}
              </div>

              {/* Tek Tıkla Aksiyonlar: Başladı, Geldi, Gelmedi, Not Ekle, Mesaj Gönder */}
              {nextSession && nextStudent ? (
                <div className="mt-2.5 pt-2 border-t border-teal-200/60 dark:border-teal-900/60 flex items-center justify-between gap-1 flex-wrap text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickStartNext(nextSession)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        nextSession.is_in_progress
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-stone-800 dark:text-emerald-300 dark:border-emerald-800'
                      }`}
                      title="Seansı başlat (Devam ediyor)"
                    >
                      {nextSession.is_in_progress ? '✓ Başladı' : 'Başlat'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(nextSession, 'Geldi')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-stone-800 dark:text-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                      title="Geldi olarak işaretle (Klavye: 2)"
                    >
                      Geldi <span className="text-[9px] opacity-60">2</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(nextSession, 'Gelmedi')}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 dark:bg-stone-800 dark:text-rose-300 dark:border-rose-800 transition-colors cursor-pointer"
                      title="Gelmedi olarak işaretle (Klavye: 3)"
                    >
                      Gelmedi <span className="text-[9px] opacity-60">3</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveQuickNoteSession(nextSession)}
                      className="p-1 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
                      title="Not ve takip planı ekle"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendIndividualSummary(nextSession)}
                      className="p-1 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-stone-800 dark:text-emerald-400 dark:border-emerald-800 transition-colors cursor-pointer"
                      title="WhatsApp Seans Bildirimi Gönder"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 pt-2 border-t border-teal-200/60 dark:border-teal-900/60 text-xs">
                  <span className="text-[11px] text-stone-500">Tüm seanslar güncel</span>
                </div>
              )}
            </div>

            {/* Kart 3: Mesajı Henüz Gönderilmemiş Öğrenciler */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Bekleyen WhatsApp</span>
                </span>
                <span className="text-xs font-mono font-medium text-stone-400">
                  {assignedDateSessions.length} seans
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-stone-900 dark:text-stone-100">
                    {unsentMessagesCount}
                  </span>
                  <span className="text-xs text-stone-500">öğrenciye mesaj gitmedi</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                  {unsentMessagesCount === 0 ? 'Tüm bildirimler gönderildi ✓' : 'Sıralı gönderim ile hızlıca iletin'}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setIsWhatsAppQueueOpen(true)}
                  className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Sıralı Gönderim ({unsentMessagesCount})</span>
                </button>
              </div>
            </div>

            {/* Kart 4: Gelmeyip Tekrar Planlanması Gerekenler */}
            <div className="p-3 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Gelmeyenler & Telafi</span>
                </span>
                <span className="text-xs font-mono text-stone-400">
                  {missedCount > 0 ? `${missedCount} kayıt` : 'Sorunsuz'}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {missedCount}
                  </span>
                  <span className="text-xs text-stone-500">öğrenci gelmedi</span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                  {missedCount > 0 ? 'Yeniden planlama veya veli araması' : 'Bugün gelmeyen öğrenci yok'}
                </p>
              </div>
              <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                {missedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSlotFilter('missed')}
                    className="text-rose-700 dark:text-rose-400 hover:text-rose-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Gelmeyenleri Filtrele</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-stone-400">Düzenli katılım</span>
                )}
              </div>
            </div>
          </div>
          {/* Daily Detailed Table */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden bg-white dark:bg-[#1F1F1F]">
            {dateSessions.length === 0 ? (
              <div className="text-center py-12 px-4 bg-stone-50/50 dark:bg-stone-900/30">
                <div className="w-10 h-10 mx-auto rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-teal-700 dark:text-teal-400 mb-3 border border-stone-200 dark:border-stone-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Bu tarihte seans planlanmamış
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  Standart çalışma saatlerini yükleyerek günlük seansları oluşturabilirsiniz.
                </p>
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => onFillStandardSlots(selectedDate)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Standart Saatleri Yükle</span>
                  </button>
                </div>
              </div>
            ) : (
            <div>
              {/* Professional Table Toolbar & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 border-b border-stone-200 dark:border-stone-800 text-xs">
                {/* Status Filter Tabs (Clean Segmented Control) */}
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setSlotFilter('all')}
                    className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                      slotFilter === 'all'
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    Tümü ({dateSessions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotFilter('assigned')}
                    className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                      slotFilter === 'assigned'
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    Dolu ({assignedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotFilter('empty')}
                    className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                      slotFilter === 'empty'
                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                  >
                    Boş ({emptyCount})
                  </button>
                  {missedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setSlotFilter('missed')}
                      className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                        slotFilter === 'missed'
                          ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-semibold'
                          : 'text-rose-600 hover:text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      Gelmedi ({missedCount})
                    </button>
                  )}
                </div>

                {/* Day Summary Badge */}
                <div className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                  <span className="font-mono text-[11px]">
                    Toplam {dateSessions.length} Seans / Aralık
                  </span>
                </div>
              </div>

              {/* Empty state when active filter has 0 results */}
              {displayedSessions.length === 0 ? (
                <div className="text-center py-12 px-4 bg-stone-50/50 dark:bg-stone-900/30">
                  <div className="w-10 h-10 mx-auto rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 mb-2.5 border border-stone-200 dark:border-stone-700">
                    {slotFilter === 'missed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Filter className="w-5 h-5 text-stone-500" />
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {slotFilter === 'missed' && 'Bugün randevusuna gelmeyen öğrenci yok'}
                    {slotFilter === 'empty' && 'Tüm seans saatleri dolu; boş kontenjan kalmadı'}
                    {slotFilter === 'assigned' && 'Bugün henüz öğrenci atanmış seans yok'}
                    {slotFilter === 'all' && 'Kayıtlı seans bulunamadı'}
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                    {slotFilter === 'missed'
                      ? 'Planlanan tüm seanslara öğrenciler eksiksiz katılım sağladı.'
                      : 'Filtreleme kriterlerine uyan seans veya mola aralığı bulunamadı.'}
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setSlotFilter('all')}
                      className="px-3 py-1.5 rounded-md bg-white hover:bg-stone-50 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Tüm Seansları Göster ({dateSessions.length})
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table (hidden on mobile/tablet screens) */}
                  <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-280px)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
                        <tr className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 select-none">
                          <th className="align-middle py-2.5 px-2 w-12 text-center" title="Sıralama (Sürükleyin veya Okları Kullanın)"></th>
                          <th className="align-middle py-3 px-3 w-28 font-mono">Saat</th>
                          <th className="align-middle py-3 px-3.5 min-w-[220px]">Öğrenci</th>
                          <th className="align-middle py-3 px-3.5 min-w-[240px]">Görüşme Konusu & Teşhis</th>
                          <th className="align-middle py-3 px-3.5 w-56">Durum</th>
                          <th className="align-middle py-3 px-3.5 text-right w-44">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
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
                                className={`transition-colors h-11 ${
                                  isBeingHeld
                                    ? 'bg-teal-50 dark:bg-stone-800 border-teal-600'
                                    : isDropTarget
                                    ? 'bg-stone-100 dark:bg-stone-800 border-t-2 border-teal-700'
                                    : 'bg-stone-50/50 hover:bg-stone-100/50 dark:bg-stone-900/30 dark:hover:bg-stone-850/50'
                                }`}
                              >
                                {/* Sürükleme Tutamacı & Oklar */}
                                <td className="align-middle py-2 px-2 w-12 text-center select-none">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <div
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, session.id)}
                                      onTouchStart={(e) => handleTouchStart(session.id, e)}
                                      onTouchMove={handleTouchMove}
                                      onTouchEnd={handleTouchEnd}
                                      onTouchCancel={handleTouchEnd}
                                      style={{ touchAction: 'none' }}
                                      className="p-1 rounded cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
                                      title="Sırayı değiştirmek için sürükleyin"
                                    >
                                      <NineDotsGrip />
                                    </div>
                                    <div className="flex flex-col items-center -space-y-0.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveRow(session.id, 'up');
                                        }}
                                        disabled={dateSessions.findIndex((s) => s.id === session.id) === 0}
                                        className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 dark:text-stone-500 dark:hover:text-stone-300 transition-colors cursor-pointer"
                                        title="Yukarı taşı"
                                        aria-label="Yukarı taşı"
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
                                        className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 dark:text-stone-500 dark:hover:text-stone-300 transition-colors cursor-pointer"
                                        title="Aşağı taşı"
                                        aria-label="Aşağı taşı"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* Saat Column */}
                                <td className="align-middle py-2 px-3 font-mono whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setEditingBreakSession(session)}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-200/80 cursor-pointer"
                                    title="Teneffüs süresini değiştirmek için tıklayın"
                                  >
                                    {isLunch ? (
                                      <Utensils className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                                    ) : (
                                      <Coffee className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                                    )}
                                    <span>{session.time_slot}</span>
                                  </button>
                                </td>

                                <td colSpan={3} className="align-middle py-2 px-3.5">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingBreakSession(session)}
                                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium text-stone-800 dark:text-stone-200 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 transition-colors cursor-pointer text-left"
                                      title="Teneffüs süresini değiştirmek için tıklayın"
                                    >
                                      <span>
                                        {session.break_title ||
                                          session.topic ||
                                          (isLunch ? 'Öğle Arası' : 'Teneffüs')}
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-mono text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                                        <Clock className="w-3 h-3 text-stone-400" />
                                        <span>{getBreakMinutes(session)} dk</span>
                                      </span>
                                    </button>
                                  </div>
                                </td>

                                <td className="align-middle py-2 px-3.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => onDeleteSession(session.id)}
                                    className="p-1.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title={isLunch ? 'Öğle Arasını Kaldır' : 'Teneffüsü Kaldır'}
                                    aria-label="Molayı kaldır"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                          const isPostponed = session.status === 'Ertelendi';
                          const isHoveredOrSelected = hoveredSessionId === session.id || selectedSessionId === session.id;

                          return (
                            <tr
                              key={session.id}
                              data-session-id={session.id}
                              onMouseEnter={() => setHoveredSessionId(session.id)}
                              onMouseLeave={() => setHoveredSessionId(null)}
                              onClick={() => setSelectedSessionId(session.id)}
                              onDragOver={(e) => handleDragOver(e, session.id)}
                              onDrop={(e) => handleDrop(e, session.id)}
                              onDragEnd={() => {
                                setDraggedSessionId(null);
                                setDragOverSessionId(null);
                              }}
                              className={`transition-colors h-11 ${
                                isBeingHeld
                                  ? 'bg-teal-50 dark:bg-stone-800'
                                  : isDropTarget
                                  ? 'bg-stone-100 dark:bg-stone-800 border-t-2 border-teal-700'
                                  : isCompleted
                                  ? 'bg-emerald-50/20 hover:bg-emerald-50/40 dark:bg-emerald-950/[0.04]'
                                  : isMissed
                                  ? 'bg-rose-50/20 hover:bg-rose-50/40 dark:bg-rose-950/[0.04]'
                                  : isPostponed
                                  ? 'bg-amber-50/20 hover:bg-amber-50/40 dark:bg-amber-950/[0.04]'
                                  : isHoveredOrSelected
                                  ? 'bg-stone-100/70 dark:bg-stone-800/60'
                                  : 'hover:bg-stone-50/80 dark:hover:bg-stone-800/40'
                              }`}
                            >
                              {/* Sürükleme Tutamacı & Oklar */}
                              <td className="align-middle py-2 px-2 w-12 text-center select-none">
                                <div className="flex items-center justify-center gap-0.5">
                                  <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, session.id)}
                                    onTouchStart={(e) => handleTouchStart(session.id, e)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchCancel={handleTouchEnd}
                                    style={{ touchAction: 'none' }}
                                    className="p-1 rounded cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300"
                                    title="Sırayı değiştirmek için sürükleyin"
                                  >
                                    <NineDotsGrip />
                                  </div>
                                  <div className="flex flex-col items-center -space-y-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveRow(session.id, 'up');
                                      }}
                                      disabled={dateSessions.findIndex((s) => s.id === session.id) === 0}
                                      className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 dark:text-stone-500 dark:hover:text-stone-300 transition-colors cursor-pointer"
                                      title="Yukarı taşı"
                                      aria-label="Yukarı taşı"
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
                                      className="p-0.5 text-stone-400 hover:text-stone-700 disabled:opacity-20 dark:text-stone-500 dark:hover:text-stone-300 transition-colors cursor-pointer"
                                      title="Aşağı taşı"
                                      aria-label="Aşağı taşı"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* Saat Column */}
                              <td className="align-middle py-2 px-3 font-mono text-xs whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                                  {session.time_slot}
                                </span>
                              </td>

                              {/* Öğrenci */}
                              <td className="align-middle py-2 px-3.5">
                                {student ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => onOpenStudentProfile(student)}
                                          className="font-medium text-xs text-stone-900 dark:text-stone-100 hover:text-teal-700 dark:hover:text-teal-400 truncate text-left cursor-pointer transition-colors"
                                        >
                                          {student.full_name}
                                        </button>
                                        <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
                                          {student.class_grade}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                                        <span className="font-mono">{displayPhone(student.phone)}</span>
                                        {student.target_goal && (
                                          <>
                                            <span aria-hidden="true">·</span>
                                            <span className="truncate max-w-[140px] text-stone-500" title={student.target_goal}>
                                              {student.target_goal}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleUnassignStudent(session.id)}
                                      className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
                                      title="Seansı boşalt"
                                      aria-label="Öğrenciyi seansından ayır"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  /* Fast Slot Assignment Input */
                                  <div className="relative">
                                    {activeSlotSearchId === session.id ? (
                                      <div className="relative">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={searchQuery}
                                          onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setEmptySlotSearchIndex(0);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'ArrowDown') {
                                              e.preventDefault();
                                              setEmptySlotSearchIndex((prev) =>
                                                Math.min(prev + 1, Math.max(filteredStudents.length - 1, 0))
                                              );
                                            } else if (e.key === 'ArrowUp') {
                                              e.preventDefault();
                                              setEmptySlotSearchIndex((prev) => Math.max(prev - 1, 0));
                                            } else if (e.key === 'Enter') {
                                              e.preventDefault();
                                              if (filteredStudents.length > 0) {
                                                const chosen = filteredStudents[emptySlotSearchIndex] || filteredStudents[0];
                                                handleAssignStudent(session.id, chosen.id);
                                              }
                                            } else if (e.key === 'Escape') {
                                              setActiveSlotSearchId(null);
                                              setSearchQuery('');
                                            }
                                          }}
                                          placeholder="Öğrenci adı yazıp Enter'a basın..."
                                          className="w-full px-2.5 py-1 rounded-md bg-white dark:bg-stone-900 border-2 border-teal-600 dark:border-teal-500 text-xs text-stone-900 dark:text-stone-100 focus:outline-none shadow-sm"
                                        />

                                        {/* Suggestions popover */}
                                        {filteredStudents.length > 0 && (
                                          <div className="absolute left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl z-50 p-1 divide-y divide-stone-100 dark:divide-stone-800">
                                            {filteredStudents.map((st, idx) => (
                                              <button
                                                key={st.id}
                                                type="button"
                                                onMouseEnter={() => setEmptySlotSearchIndex(idx)}
                                                onClick={() => handleAssignStudent(session.id, st.id)}
                                                className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                                  idx === emptySlotSearchIndex
                                                    ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200 font-medium'
                                                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium text-stone-900 dark:text-stone-100">{st.full_name}</span>
                                                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                                                    {st.class_grade}
                                                  </span>
                                                </div>
                                                <span className="text-[10px] text-stone-400 font-mono">
                                                  {displayPhone(st.phone)}
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
                                          setEmptySlotSearchIndex(0);
                                        }}
                                        className="w-full text-left px-2 py-1 rounded-md border border-dashed border-stone-300 dark:border-stone-700 hover:border-teal-600 dark:hover:border-teal-400 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors flex items-center justify-between cursor-pointer text-xs"
                                      >
                                        <span>+ Randevu Ata</span>
                                        <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-stone-100 border border-stone-200 text-stone-500 dark:bg-stone-800 dark:border-stone-700">
                                          Tıkla / Enter
                                        </kbd>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Konu & Teşhis Notu */}
                              <td className="align-middle py-2 px-3.5">
                                <div className="space-y-1">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={session.topic}
                                      onChange={(e) => {
                                        onUpdateSession({ ...session, topic: e.target.value });
                                      }}
                                      onFocus={() => setActiveTopicDropdownId(session.id)}
                                      placeholder="Görüşme konusu..."
                                      className="w-full bg-stone-50 hover:bg-stone-100/70 focus:bg-white dark:bg-stone-900 dark:hover:bg-stone-850 dark:focus:bg-stone-900 border border-stone-200 focus:border-stone-400 dark:border-stone-700 rounded-md text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 px-2.5 py-1 focus:outline-none transition-colors"
                                    />

                                    {/* Suggested topics dropdown */}
                                    {activeTopicDropdownId === session.id && (
                                      <div
                                        className="absolute left-0 top-full mt-1 w-56 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-md p-1 z-30"
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
                                            className="w-full text-left px-2 py-1 rounded text-xs text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100 truncate cursor-pointer"
                                          >
                                            {top}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Tag preview */}
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                                    {session.tags && session.tags.length > 0 && (
                                      <span>{session.tags.join(', ')}</span>
                                    )}
                                    {session.action_items && (
                                      <span className="truncate max-w-[150px]" title={session.action_items}>
                                        · {session.action_items}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Durum Toggle: [Bekliyor (1)] [Geldi (2)] [Gelmedi (3)] [Ertelendi (4)] */}
                              <td className="align-middle py-2 px-3.5">
                                <div className="inline-flex items-center rounded-md p-0.5 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs gap-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(session, 'Bekliyor');
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs transition-colors cursor-pointer ${
                                      isPending
                                        ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs'
                                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                                    }`}
                                    title="Bekliyor (Klavye: 1)"
                                  >
                                    <Clock className="w-3 h-3 text-stone-400" />
                                    <span>Bekliyor</span>
                                    <span className="text-[9px] opacity-50 font-mono">1</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerFeedback(session, 'Geldi');
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs transition-colors cursor-pointer ${
                                      isCompleted
                                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800'
                                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                                    }`}
                                    title="Seansı tamamla ve geri bildirim ekle (Klavye: 2)"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Geldi</span>
                                    <span className="text-[9px] opacity-50 font-mono">2</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTriggerFeedback(session, 'Gelmedi');
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs transition-colors cursor-pointer ${
                                      isMissed
                                        ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-800'
                                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                                    }`}
                                    title="Gelmedi olarak işaretle (Klavye: 3)"
                                  >
                                    <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                    <span>Gelmedi</span>
                                    <span className="text-[9px] opacity-50 font-mono">3</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(session, 'Ertelendi');
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-xs transition-colors cursor-pointer ${
                                      isPostponed
                                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800'
                                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                                    }`}
                                    title="Ertelendi olarak işaretle (Klavye: 4)"
                                  >
                                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    <span>Ertelendi</span>
                                    <span className="text-[9px] opacity-50 font-mono">4</span>
                                  </button>
                                </div>

                                {/* Geri Bildirim Özeti Rozeti */}
                                {session.feedback && (
                                  <div className="mt-1 flex items-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFeedbackSession({
                                          session,
                                          status: session.status === 'Gelmedi' ? 'Gelmedi' : 'Geldi',
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[11px] font-medium border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 cursor-pointer"
                                      title="Geri bildirim detayını incele veya düzenle"
                                    >
                                      <FileText className="w-3 h-3 shrink-0 text-stone-500" />
                                      <span className="truncate max-w-[130px]">
                                        {session.feedback.status === 'Geldi'
                                          ? `${session.feedback.efficiency || 'Verimli'} (${session.feedback.rating || 5}★)`
                                          : `Mazeret: ${session.feedback.reason || 'Gelmedi'}`}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* İşlemler */}
                              <td className="align-middle py-2 px-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Quick Note */}
                                  <button
                                    type="button"
                                    onClick={() => setActiveQuickNoteSession(session)}
                                    className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                                      session.tags?.length || session.action_items
                                        ? 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40'
                                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                                    }`}
                                    title="Not ve Etiketler"
                                    aria-label="Seans notu ve etiketleri aç"
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 1-on-1 WhatsApp Summary */}
                                  {student && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendIndividualSummary(session)}
                                      className="p-1.5 rounded-md text-stone-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                      title="WhatsApp Seans Kartı Gönder"
                                      aria-label={`${student.full_name} için WhatsApp seans kartı`}
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Gelmedi Auto-reminder button */}
                                  {isMissed && student && (
                                    <button
                                      type="button"
                                      onClick={() => handleSendMissedReminder(session)}
                                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                                      title="Randevu Hatırlatması Gönder"
                                      aria-label="Randevu Hatırlatması Gönder"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      <span className="hidden sm:inline">Uyar</span>
                                    </button>
                                  )}

                                  {/* Student Past History Log */}
                                  {student && (
                                    <button
                                      type="button"
                                      onClick={() => setHistoryStudent(student)}
                                      className="p-1.5 rounded-md text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                                      title="Görüşme geçmişi"
                                      aria-label={`${student.full_name} geçmiş görüşmeleri`}
                                    >
                                      <History className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete Session */}
                                  <button
                                    type="button"
                                    onClick={() => onDeleteSession(session.id)}
                                    className="p-1.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="Seansı sil"
                                    aria-label="Seansı sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
              <div className="block md:hidden p-3 space-y-2.5 bg-stone-50/50 dark:bg-stone-900/30">
                {displayedSessions.map((session, index) => {
                  if (session.is_break) {
                    const isLunch =
                      session.break_title?.toLowerCase().includes('öğle') ||
                      session.topic?.toLowerCase().includes('öğle');
                    return (
                      <div
                        key={session.id}
                        className="p-2.5 rounded-lg bg-stone-100/80 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => setEditingBreakSession(session)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                          title="Teneffüs süresini değiştirmek için dokunun"
                        >
                          <span className="font-mono text-xs text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                            {session.time_slot}
                          </span>
                          <div className="flex items-center gap-1.5 truncate">
                            {isLunch ? (
                              <Utensils className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
                            ) : (
                              <Coffee className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
                            )}
                            <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                              {session.break_title || session.topic || 'Mola / Teneffüs'}
                            </span>
                            <span className="text-[11px] font-mono text-stone-500 shrink-0">
                              ({getBreakMinutes(session)} dk)
                            </span>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveRow(session.id, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-20 transition-colors"
                            title="Yukarı taşı"
                            aria-label="Yukarı taşı"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRow(session.id, 'down')}
                            disabled={index === displayedSessions.length - 1}
                            className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 disabled:opacity-20 transition-colors"
                            title="Aşağı taşı"
                            aria-label="Aşağı taşı"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSession(session.id)}
                            className="p-1.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Molayı sil"
                            aria-label="Molayı sil"
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
                  const isPostponed = session.status === 'Ertelendi';

                  return (
                    <div
                      key={session.id}
                      className="p-3 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 space-y-2.5"
                    >
                      {/* Top Row: Time Badge + Quick Reorder + Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
                            {session.time_slot}
                          </span>
                          {session.tags?.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] text-stone-500 dark:text-stone-400"
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
                            className="p-1.5 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 transition-colors cursor-pointer"
                            title="Yukarı taşı"
                            aria-label="Yukarı taşı"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveRow(session.id, 'down')}
                            disabled={index === displayedSessions.length - 1}
                            className="p-1.5 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-20 transition-colors cursor-pointer"
                            title="Aşağı taşı"
                            aria-label="Aşağı taşı"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSession(session.id)}
                            className="p-1.5 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Seansı sil"
                            aria-label="Seansı sil"
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
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenStudentProfile(student)}
                                  className="font-medium text-xs text-stone-900 dark:text-stone-100 hover:text-teal-700 dark:hover:text-teal-400 text-left transition-colors cursor-pointer"
                                >
                                  {student.full_name}
                                </button>
                                <span className="font-mono text-[11px] text-stone-500">
                                  {student.class_grade}
                                </span>
                              </div>
                              {student.target_goal && (
                                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                                  Hedef: {student.target_goal}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleUnassignStudent(session.id)}
                              className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Öğrenciyi kaldır"
                            >
                              Kaldır
                            </button>
                          </div>
                        ) : (
                          <div>
                            {activeSlotSearchId === session.id ? (
                              <div className="space-y-1.5">
                                <div className="relative">
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Öğrenci adı veya sınıf ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-900 border border-teal-600 dark:border-teal-500 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSlotSearchId(null);
                                      setSearchQuery('');
                                    }}
                                    className="absolute right-2 top-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {filteredStudents.length > 0 && (
                                  <div className="max-h-36 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-sm divide-y divide-stone-100 dark:divide-stone-800">
                                    {filteredStudents.map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => handleAssignStudent(session.id, s.id)}
                                        className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center justify-between text-stone-800 dark:text-stone-200 cursor-pointer"
                                      >
                                        <span className="font-medium">{s.full_name}</span>
                                        <span className="text-[10px] text-stone-400 font-mono">{s.class_grade}</span>
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
                                className="w-full py-1.5 px-2.5 rounded-md border border-dashed border-stone-300 dark:border-stone-700 hover:border-teal-600 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Öğrenci Seç / Randevu Ata</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Topic display */}
                      <div className="bg-stone-50 dark:bg-stone-900/50 rounded-md p-2 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-stone-800 dark:text-stone-200 truncate">
                            {session.topic || 'Konu belirtilmemiş'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveQuickNoteSession(session)}
                            className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
                          >
                            Düzenle
                          </button>
                        </div>
                        {session.feedback && (
                          <div className="mt-1 pt-1 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
                            {session.feedback.status === 'Geldi'
                              ? `Değerlendirme: ${session.feedback.efficiency || 'Verimli'} (${session.feedback.rating || 5}★)`
                              : `Mazeret: ${session.feedback.reason || 'Gelmedi'}`}
                          </div>
                        )}
                      </div>

                      {/* Mobile Status Switcher */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-stone-100 dark:bg-stone-900 p-1 rounded-md border border-stone-200 dark:border-stone-800 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(session, 'Bekliyor')}
                          className={`min-h-[44px] rounded-[5px] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            isPending
                              ? 'bg-white text-stone-900 dark:bg-stone-800 dark:text-stone-100 shadow-xs'
                              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>Bekliyor</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerFeedback(session, 'Geldi')}
                          className={`min-h-[44px] rounded-[5px] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Geldi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerFeedback(session, 'Gelmedi')}
                          className={`min-h-[44px] rounded-[5px] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            isMissed
                              ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Gelmedi</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(session, 'Ertelendi')}
                          className={`min-h-[44px] rounded-[5px] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            isPostponed
                              ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>Ertelendi</span>
                        </button>
                      </div>

                      {/* Mobile Action Bar (Min 44px Touch Targets) */}
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
                        <button
                          type="button"
                          onClick={() => setActiveQuickNoteSession(session)}
                          className="flex-1 min-h-[44px] px-2 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Bookmark className="w-4 h-4 text-stone-500" />
                          <span>Not</span>
                        </button>

                        {student && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendIndividualSummary(session)}
                              className="min-h-[44px] px-3 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              title="WhatsApp Kartı Gönder"
                              aria-label="WhatsApp Kartı Gönder"
                            >
                              <MessageSquare className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                              <span>WhatsApp</span>
                            </button>

                            {student.phone && (
                              <a
                                href={`tel:${student.phone}`}
                                className="min-h-[44px] min-w-[44px] rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 flex items-center justify-center transition-colors"
                                title="Ara"
                                aria-label="Telefonla ara"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => setHistoryStudent(student)}
                              className="min-h-[44px] min-w-[44px] rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                              title="Geçmiş seanslar"
                              aria-label="Geçmiş seanslar"
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
              <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 text-xs select-none">
                <div className="flex items-center gap-2 text-[11px] text-stone-600 dark:text-stone-400">
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    Toplam: {dateSessions.length} Seans
                  </span>
                  <span>·</span>
                  <span>Dolu: {assignedCount}</span>
                  <span>·</span>
                  <span>Boş: {emptyCount}</span>
                  {missedCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        Gelmedi: {missedCount}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddNewSessionRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-stone-800 dark:text-stone-200 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-teal-700 dark:text-teal-400" />
                    <span>Boş Seans Ekle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewBreakRow('teneffus_10')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-stone-700 dark:text-stone-300 bg-white hover:bg-stone-50 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                  >
                    <Coffee className="w-3 h-3 text-stone-500" />
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
            onShowToast?.('Seans Notu Kaydedildi', 'Teşhis ve hedefler güncellendi.', 'success');
          }}
          onClose={() => setActiveQuickNoteSession(null)}
          onShowToast={onShowToast}
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

      {/* WhatsApp Sıralı Gönderim Modalı (Sequential 1-by-1 Queue) */}
      {isWhatsAppQueueOpen && (
        <WhatsAppQueueModal
          isOpen={isWhatsAppQueueOpen}
          onClose={() => setIsWhatsAppQueueOpen(false)}
          date={selectedDate}
          sessions={sessions}
          students={students}
          counselorName={counselorName}
          onMarkSent={async (sessionId, sent) => {
            const sess = sessions.find((s) => s.id === sessionId);
            if (sess) {
              onUpdateSession({
                ...sess,
                whatsapp_sent: sent,
                whatsapp_sent_at: sent ? new Date().toISOString() : undefined,
              });
            }
          }}
          onShowToast={onShowToast || (() => {})}
        />
      )}

      {/* Modal: Günün WhatsApp İlanı Popup */}
      {isWhatsAppModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-card-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 modal-backdrop"
          onClick={() => setIsWhatsAppModalOpen(false)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-md animate-dialog"
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
