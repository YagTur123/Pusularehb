import React, { useState, useRef, useEffect } from 'react';
import { Session, Student, COMMON_TOPICS, ScheduleConfig } from '../types';
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
  Sparkles,
  ExternalLink,
  Printer,
  LayoutList,
  Table,
  Coffee,
  Utensils,
  X,
  Sliders,
} from 'lucide-react';
import {
  getTodayDateString,
  shiftDateString,
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

interface DailySchedulerProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
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

export function DailyScheduler({
  selectedDate,
  setSelectedDate,
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
}: DailySchedulerProps) {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [activeSlotSearchId, setActiveSlotSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickNoteSession, setActiveQuickNoteSession] = useState<Session | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [newSlotTime, setNewSlotTime] = useState('17:00');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isScheduleConfigOpen, setIsScheduleConfigOpen] = useState(false);
  const [slotFilter, setSlotFilter] = useState<'all' | 'assigned' | 'empty' | 'missed'>('all');

  // Floating + menu and break modal states
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showAddBreakModal, setShowAddBreakModal] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [breakPreset, setBreakPreset] = useState<'teneffus_10' | 'teneffus_15' | 'ogle_50' | 'custom'>('teneffus_10');
  const [breakTime, setBreakTime] = useState('11:50');
  const [breakCustomTitle, setBreakCustomTitle] = useState('10 dk Teneffüs');

  // Suggested topics dropdown state
  const [activeTopicDropdownId, setActiveTopicDropdownId] = useState<string | null>(null);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Sessions for currently selected date
  const dateSessions = sessions
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const assignedCount = dateSessions.filter((s) => s.student_id).length;
  const emptyCount = dateSessions.filter((s) => !s.student_id).length;
  const missedCount = dateSessions.filter((s) => s.status === 'Gelmedi').length;

  const displayedSessions = dateSessions.filter((s) => {
    if (slotFilter === 'assigned') return Boolean(s.student_id);
    if (slotFilter === 'empty') return !s.student_id;
    if (slotFilter === 'missed') return s.status === 'Gelmedi';
    return true;
  });

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
    onShowToast('Öğrenci Atandı', `${student?.full_name} seansa yerleştirildi.`, 'success');
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
    onShowToast('Öğrenci Kaldırıldı', 'Seans boşa çıkarıldı.', 'info');
  };

  const handleStatusChange = (session: Session, newStatus: 'Bekliyor' | 'Geldi' | 'Gelmedi') => {
    const updated: Session = { ...session, status: newStatus };
    onUpdateSession(updated);

    const student = session.student_id ? studentMap.get(session.student_id) : undefined;
    if (newStatus === 'Geldi' && student) {
      onShowToast(
        'Görüşme Tamamlandı',
        `${student.full_name} geldi olarak işaretlendi ve son görüşme tarihi güncellendi.`,
        'success'
      );
    } else if (newStatus === 'Gelmedi' && student) {
      onShowToast(
        'Öğrenci Gelmedi',
        'Tek tıkla WhatsApp üzerinden kaçırılan randevu uyarısı gönderebilirsiniz.',
        'warning'
      );
    }
  };

  const handleSendIndividualSummary = (session: Session) => {
    if (!session.student_id) return;
    const student = studentMap.get(session.student_id);
    if (!student) return;

    const text = generateIndividualSummaryText(session, student, counselorName);
    const url = getWhatsAppDirectUrl(student.phone, text);
    window.open(url, '_blank');
    onShowToast(
      'Bireysel Seans Kartı Oluşturuldu',
      `${student.full_name} için WhatsApp sohbeti açıldı.`,
      'success'
    );
  };

  const handleSendMissedReminder = (session: Session) => {
    if (!session.student_id) return;
    const student = studentMap.get(session.student_id);
    if (!student) return;

    const text = generateMissedSessionReminderText(student, session);
    const url = getWhatsAppDirectUrl(student.phone, text);
    window.open(url, '_blank');
    onShowToast(
      'Gelmedi Bildirimi Hazırlandı',
      `${student.full_name} öğrencisine hatırlatma gönderiliyor.`,
      'info'
    );
  };

  const handleAddCustomSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotTime) return;

    onAddSession({
      date: selectedDate,
      time_slot: newSlotTime,
      student_id: null,
      topic: '',
      action_items: '',
      tags: [],
      status: 'Bekliyor',
    });

    setShowAddCustomModal(false);
    onShowToast('Yeni Seans Eklendi', `${newSlotTime} saati için boş seans açıldı.`, 'success');
  };

  const handleAddBreakSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let title = breakCustomTitle.trim();
    if (!title) {
      if (breakPreset === 'teneffus_15') title = '15 dk Teneffüs';
      else if (breakPreset === 'ogle_50') title = '50 dk Öğle Arası & Yemek';
      else title = '10 dk Teneffüs';
    }

    if (onAddBreak) {
      onAddBreak(selectedDate, breakTime, title);
    } else {
      onAddSession({
        date: selectedDate,
        time_slot: breakTime,
        student_id: null,
        topic: title,
        action_items: '',
        tags: [title],
        status: 'Bekliyor',
        is_break: true,
        break_title: title,
      });
    }

    setShowAddBreakModal(false);
    const isLunch = title.toLowerCase().includes('öğle');
    onShowToast(
      isLunch ? 'Öğle Arası Eklendi' : 'Teneffüs Eklendi',
      `${breakTime} saatine ${title} kaydedildi.`,
      'success'
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-[#0c0d12] p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.07] shadow-xs">
        {/* Left: View Mode Switcher + Interactive Date Selector + Quick switches */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: [Günlük (Liste)] [Haftalık (Çizelge)] */}
          <div className="flex items-center bg-slate-100 dark:bg-[#12141e] p-0.5 rounded-md border border-slate-200 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
              title="Günlük detaylı seans listesi"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Günlük</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-zinc-200'
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
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#181a26] dark:hover:bg-[#1e2130] px-2.5 py-1 rounded-md border border-slate-300 dark:border-white/[0.08] cursor-pointer transition-colors group shadow-2xs"
              title="Aylık takvim gezginini aç"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200" />
              <span className="text-xs font-bold text-slate-900 dark:text-zinc-200">
                {formatTurkishDateWithoutDay(selectedDate)}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500 dark:text-zinc-500 group-hover:text-slate-800 dark:group-hover:text-zinc-300" />
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 dark:bg-[#221f1a] dark:hover:bg-[#2c2822] dark:border-amber-500/25 text-amber-950 hover:text-amber-900 dark:text-amber-200/90 dark:hover:text-amber-100 text-xs font-semibold transition-colors cursor-pointer"
            title="Seans dakikası, teneffüs süresi belirle, tablo saatlerini kaydır veya teneffüs ekle"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300/80" />
            <span>Program & Teneffüs Planla</span>
          </button>

          {/* Official Printable Daily Log */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 dark:bg-[#181a26] dark:hover:bg-[#1e2130] dark:border-white/[0.08] text-slate-800 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            title="Resmi görüşme defteri ve A4 çıktısı"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
            <span>Defter</span>
          </button>
        </div>
      </div>

      {/* Interactive Week Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#141622] px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.06] shadow-xs">
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
                      ? 'bg-slate-900 text-white font-semibold shadow-xs border border-slate-900 dark:bg-zinc-800 dark:text-white dark:border-white/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border border-slate-200 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900 dark:border-transparent'
                  }`}
                  title={`${day.shortDayName} gününü seç`}
                >
                  <span className="font-bold">{day.shortDayName}</span>
                  <span
                    className={`text-[11px] font-mono ${
                      isSelected ? 'text-slate-200 dark:text-zinc-300' : 'text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Bugün" />
                  )}
                  {dayTotal > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-800 dark:bg-white/[0.06] dark:text-zinc-400'
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
              <div className="text-center py-16 px-4">
                <div className="w-10 h-10 mx-auto rounded-lg bg-slate-100 dark:bg-[#181a26] flex items-center justify-center text-slate-500 dark:text-zinc-400 mb-3 border border-slate-200 dark:border-white/[0.08]">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
                </div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white">Bu tarihte planlanmış seans yok</h3>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => onFillStandardSlots(selectedDate)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-slate-900 dark:border-white/[0.1] text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-slate-200 dark:text-zinc-300" />
                    <span>Standart Saatleri Yükle (09:00 - 16:40)</span>
                  </button>
                </div>
              </div>
            ) : (
            <div>
              {/* Fast Slot Filter Tabs */}
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#12141e] text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSlotFilter('all')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                      slotFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white font-medium'
                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Tümü ({dateSessions.length})
                  </button>
                  <button
                    onClick={() => setSlotFilter('assigned')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                      slotFilter === 'assigned'
                        ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white font-medium'
                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Dolu ({assignedCount})
                  </button>
                  <button
                    onClick={() => setSlotFilter('empty')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                      slotFilter === 'empty'
                        ? 'bg-slate-900 text-white dark:bg-zinc-800 dark:text-white font-medium'
                        : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    Boş ({emptyCount})
                  </button>
                  {missedCount > 0 && (
                    <button
                      onClick={() => setSlotFilter('missed')}
                      className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                        slotFilter === 'missed'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 font-medium border border-rose-300 dark:border-rose-500/30'
                          : 'text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300'
                      }`}
                    >
                      Gelmedi ({missedCount})
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-[#090a0f] border-b border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-zinc-400 text-xs font-semibold">
                      <th className="py-2 px-3 w-20 font-mono font-medium">Saat</th>
                      <th className="py-2 px-3 min-w-[200px] font-medium">Öğrenci</th>
                      <th className="py-2 px-3 min-w-[200px] font-medium">Konu & Karar</th>
                      <th className="py-2 px-3 w-40 font-medium">Durum</th>
                      <th className="py-2 px-3 text-right w-36 font-medium">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/[0.04] font-sans">
                    {displayedSessions.map((session) => {
                    if (session.is_break) {
                      const isLunch = session.break_title?.toLowerCase().includes('öğle') || session.topic?.toLowerCase().includes('öğle');
                      return (
                        <tr key={session.id} className={isLunch ? "bg-amber-100/70 dark:bg-amber-950/30 border-y border-amber-300 dark:border-amber-500/40" : "bg-slate-100/70 dark:bg-[#121420] border-y border-dashed border-slate-200 dark:border-white/[0.06]"}>
                          <td className="py-2.5 px-3 font-mono font-medium whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1.5 w-fit font-bold ${
                              isLunch
                                ? 'bg-amber-200/90 text-amber-950 dark:bg-amber-500/25 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40'
                                : 'bg-slate-200/80 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-300 dark:border-white/[0.08]'
                            }`}>
                              {isLunch ? <Utensils className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" /> : <Coffee className="w-3 h-3 text-slate-600 dark:text-zinc-400" />}
                              {session.time_slot}
                            </span>
                          </td>
                          <td colSpan={3} className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isLunch ? 'text-amber-950 dark:text-amber-100 text-sm' : 'text-slate-800 dark:text-zinc-200'}`}>
                                {session.break_title || session.topic || (isLunch ? 'Öğle Arası' : 'Teneffüs')}
                              </span>
                              {isLunch && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200 border border-amber-300 dark:border-amber-500/30">
                                  Yemek & Dinlenme
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteSession(session.id);
                                onShowToast(isLunch ? 'Öğle Arası Kaldırıldı' : 'Teneffüs Kaldırıldı', 'Mola takvimden silindi.', 'info');
                              }}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={isLunch ? 'Öğle Arasını Kaldır' : 'Teneffüsü Kaldır'}
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

                    return (
                      <tr
                        key={session.id}
                        className={`group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors ${
                          isCompleted
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/[0.04]'
                            : isMissed
                            ? 'bg-rose-50/40 dark:bg-rose-950/[0.06]'
                            : ''
                        }`}
                      >
                        {/* Saat */}
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 dark:bg-white/[0.04] dark:border-white/[0.08] text-slate-800 dark:text-zinc-300 text-[11px] font-semibold">
                            {session.time_slot}
                          </span>
                        </td>

                        {/* Öğrenci Fast Assign or Pill */}
                        <td className="py-2.5 px-3">
                          {student ? (
                            <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#0c0d12] p-1.5 pl-2 rounded-md border border-slate-200 dark:border-white/[0.06]">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => onOpenStudentProfile(student)}
                                    className="font-semibold text-slate-900 hover:text-slate-950 dark:text-zinc-200 dark:hover:text-white truncate hover:underline text-left cursor-pointer"
                                  >
                                    {student.full_name}
                                  </button>
                                  <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400 shrink-0 font-medium">
                                    {student.class_grade}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                                  <span>{displayPhone(student.phone)}</span>
                                  {student.target_goal && (
                                    <span className="text-slate-600 dark:text-zinc-400 font-sans truncate max-w-[120px]" title={student.target_goal}>
                                      &bull; {student.target_goal}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() => handleUnassignStudent(session.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
                                    placeholder="2 harf yazıp Enter'a basın..."
                                    className="w-full px-2.5 py-1.5 rounded-md bg-white dark:bg-[#07080b] border border-slate-400 dark:border-zinc-500 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                                  />

                                  {/* Suggestions dropdown */}
                                  {filteredStudents.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-[#0e1015] border border-slate-300 dark:border-white/[0.08] shadow-2xl z-40 p-1 divide-y divide-slate-100 dark:divide-white/[0.04]">
                                      {filteredStudents.map((st, idx) => (
                                        <button
                                          key={st.id}
                                          type="button"
                                          onClick={() => handleAssignStudent(session.id, st.id)}
                                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                                            idx === 0 ? 'bg-slate-100 text-slate-950 dark:bg-white/[0.08] dark:text-white font-semibold' : 'text-slate-800 dark:text-zinc-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold">{st.full_name}</span>
                                            <span className="text-[10px] font-mono px-1 rounded bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300">
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
                                  onClick={() => {
                                    setActiveSlotSearchId(session.id);
                                    setSearchQuery('');
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-md border border-dashed border-slate-300 dark:border-white/[0.08] hover:border-slate-500 hover:bg-slate-50 dark:hover:border-zinc-500 dark:hover:bg-white/[0.02] text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors flex items-center justify-between cursor-pointer"
                                >
                                  <span>+ Öğrenci ata</span>
                                  <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 border border-slate-300 text-slate-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400">
                                    Enter
                                  </kbd>
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Konu & Teşhis Notu */}
                        <td className="py-2.5 px-3">
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
                                placeholder="Konu girin..."
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 dark:hover:border-zinc-700 dark:focus:border-zinc-500 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-400 py-0.5 focus:outline-none transition-colors"
                              />

                              {/* Dropdown with suggested common topics */}
                              {activeTopicDropdownId === session.id && (
                                <div
                                  className="absolute left-0 top-full mt-1 w-52 rounded-lg bg-white dark:bg-[#0e1015] border border-slate-300 dark:border-white/[0.08] shadow-2xl p-1 z-30 animate-in fade-in"
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
                                      className="w-full text-left px-2 py-1 rounded text-xs text-slate-800 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white truncate cursor-pointer"
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
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/60">
                                    {session.tags[0]}
                                  </span>
                                  {session.tags.length > 1 && (
                                    <span className="text-[11px] text-slate-600 dark:text-zinc-400 font-normal truncate max-w-[150px]">
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
                        <td className="py-2.5 px-3">
                          <div className="inline-flex items-center rounded-md p-0.5 bg-slate-100 dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.06] text-[11px]">
                            <button
                              onClick={() => handleStatusChange(session, 'Bekliyor')}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                isPending
                                  ? 'bg-white text-slate-900 shadow-2xs font-semibold dark:bg-zinc-800 dark:text-zinc-200'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                              }`}
                            >
                              <span>Bekliyor</span>
                            </button>
                            <button
                              onClick={() => handleStatusChange(session, 'Geldi')}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-100 text-emerald-800 font-semibold shadow-2xs dark:bg-zinc-800 dark:text-emerald-400'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                              }`}
                            >
                              <span>Geldi</span>
                            </button>
                            <button
                              onClick={() => handleStatusChange(session, 'Gelmedi')}
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                isMissed
                                  ? 'bg-rose-100 text-rose-800 font-semibold border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isMissed ? 'bg-rose-600' : 'bg-slate-400 dark:bg-zinc-600'}`} />
                              <span>Gelmedi</span>
                            </button>
                          </div>
                        </td>

                        {/* Hızlı Aksiyonlar */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick Note / Teşhis Popover trigger */}
                            <button
                              onClick={() => setActiveQuickNoteSession(session)}
                              className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                                session.tags?.length || session.action_items
                                  ? 'bg-slate-200 border-slate-300 text-slate-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-950 dark:bg-[#0e1015] dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800'
                              }`}
                              title="Not ve Etiketler"
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>

                            {/* 1-on-1 WhatsApp Summary Card Engine */}
                            {student && (
                              <button
                                onClick={() => handleSendIndividualSummary(session)}
                                className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-[#0e1015] dark:hover:bg-zinc-800 dark:border-white/[0.08] dark:text-emerald-400 dark:hover:text-emerald-300 text-xs transition-colors cursor-pointer"
                                title="WhatsApp Seans Kartı Gönder"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Gelmedi Auto-reminder button */}
                            {isMissed && student && (
                              <button
                                onClick={() => handleSendMissedReminder(session)}
                                className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:border-rose-500/30 dark:text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                                title="Randevu Hatırlatması Gönder"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                <span className="hidden sm:inline">Uyar</span>
                              </button>
                            )}

                            {/* Student Past History Log */}
                            {student && (
                              <button
                                onClick={() => setHistoryStudent(student)}
                                className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-[#0e1015] dark:hover:bg-zinc-800 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-white text-xs transition-colors cursor-pointer"
                                title="Görüşme geçmişi"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Session */}
                            <button
                              onClick={() => onDeleteSession(session.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Seansı sil"
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
          </div>
          )}

          {/* Bottom Action Footer with (+) Button */}
          <div className="flex items-center justify-center p-3 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/70 dark:bg-[#10121c] rounded-b-xl">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 flex items-center justify-center shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 group"
                title="Ekle (Seans veya Mola)"
              >
                <Plus className={`w-5 h-5 transition-transform duration-200 ${showPlusMenu ? 'rotate-45' : ''}`} />
              </button>

              {/* 2 Options Popover: [Seans] & [Mola] */}
              {showPlusMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowPlusMenu(false)}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 rounded-xl bg-white dark:bg-[#141622] border border-slate-200 dark:border-white/[0.12] shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase px-2.5 py-1 tracking-wider">
                      Ekle
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        setShowAddCustomModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Seans</div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">Danışmanlık seans saati</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPlusMenu(false);
                        setShowAddBreakModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300 flex items-center justify-center">
                        <Coffee className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">Mola</div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">Teneffüs veya Öğle Arası</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
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

      {/* Add Custom Slot Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-xs w-full shadow-2xl space-y-4">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Yeni Seans Saati Ekle</h4>
            <form onSubmit={handleAddCustomSlot} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Seans Saati (Örn: 17:00):</label>
                <input
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Break / Lunch Modal */}
      {showAddBreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#141622] border border-slate-200 dark:border-white/[0.1] rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Mola / Teneffüs Ekle</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Takvime dinlenme veya yemek aralığı ekleyin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBreakModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddBreakSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Mola Türü:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBreakPreset('teneffus_10');
                      setBreakCustomTitle('10 dk Teneffüs');
                    }}
                    className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      breakPreset === 'teneffus_10'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-950 dark:text-amber-200 font-semibold'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      <span>10 dk Teneffüs</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBreakPreset('teneffus_15');
                      setBreakCustomTitle('15 dk Teneffüs');
                    }}
                    className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      breakPreset === 'teneffus_15'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-950 dark:text-amber-200 font-semibold'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      <span>15 dk Teneffüs</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBreakPreset('ogle_50');
                      setBreakCustomTitle('50 dk Öğle Arası & Yemek');
                    }}
                    className={`col-span-2 p-2.5 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                      breakPreset === 'ogle_50'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/20 text-amber-950 dark:text-amber-200 font-bold'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-zinc-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                        <div>
                          <div className="font-bold">Öğle Arası (50 dk)</div>
                          <div className="text-[10px] font-normal text-slate-500 dark:text-zinc-400">Yemek ve dinlenme aralığı</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-500/30 dark:text-amber-200">
                        Öğle
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Başlangıç Saati:
                </label>
                <input
                  type="time"
                  value={breakTime}
                  onChange={(e) => setBreakTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Mola Başlığı / Açıklama:
                </label>
                <input
                  type="text"
                  value={breakCustomTitle}
                  onChange={(e) => setBreakCustomTitle(e.target.value)}
                  placeholder="Örn: 10 dk Teneffüs veya Öğle Arası"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddBreakModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  Molayı Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom-Right Trigger: Günün WhatsApp İlanı */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsWhatsAppModalOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer border border-emerald-400/40 group"
          title="Günün Resmi WhatsApp Seans İlanını Aç"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="tracking-tight font-medium">Günün WhatsApp İlanı</span>
          {assignedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-bold shadow-2xs">
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
    </div>
  );
}
