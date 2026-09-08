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
  Sliders,
} from 'lucide-react';
import {
  getTodayDateString,
  shiftDateString,
  formatTurkishDate,
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
  const [slotFilter, setSlotFilter] = useState<'all' | 'assigned' | 'empty' | 'missed'>('all');

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

  return (
    <div className="space-y-3">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0c0d12] p-2.5 rounded-lg border border-white/[0.07]">
        {/* Left: View Mode Switcher + Interactive Date Selector + Quick switches */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: [Günlük (Liste)] [Haftalık (Çizelge)] */}
          <div className="flex items-center bg-[#08090b] p-0.5 rounded-md border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Günlük detaylı seans listesi"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Günlük</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
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
              className="flex items-center gap-2 bg-[#0e1015] hover:bg-[#12141a] px-2.5 py-1 rounded-md border border-white/[0.08] cursor-pointer transition-colors group"
              title="Aylık takvim gezginini aç"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
              <span className="text-xs font-medium text-zinc-200">
                {formatTurkishDate(selectedDate)}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
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

          {/* Quick switches: [Dün] [Bugün] [Yarın] */}
          <div className="flex items-center bg-[#08090b] p-0.5 rounded-md border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                selectedDate === yesterdayStr
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dün
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-zinc-700 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Yarın
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Fill Standard Slots */}
          {viewMode === 'weekly' && onFillStandardWeek ? (
            <button
              type="button"
              onClick={() => onFillStandardWeek(selectedDate)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1015] hover:bg-[#12141a] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
              title="Bu haftanın tüm okul günlerine standart saatleri oluştur"
            >
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <span>Haftalık Saatleri Aç</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onFillStandardSlots(selectedDate)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1015] hover:bg-[#12141a] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
              title="Günün 40 dakikalık standart ders seanslarını otomatik oluştur"
            >
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <span>Standart Saatler</span>
            </button>
          )}

          {/* Add Custom Slot */}
          <button
            type="button"
            onClick={() => setShowAddCustomModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1015] hover:bg-[#12141a] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seans</span>
          </button>

          {/* Official Printable Daily Log */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1015] hover:bg-[#12141a] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Resmi görüşme defteri ve A4 çıktısı"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>Defter</span>
          </button>

          {/* WhatsApp Broadcast Shortcut */}
          <button
            type="button"
            onClick={onOpenBroadcast}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-900" />
            <span>WhatsApp İlanı</span>
            <kbd className="px-1 py-0.2 rounded bg-zinc-200 text-[10px] font-mono text-zinc-800 border border-zinc-300">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>

      {/* Interactive Week Navigation Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0b10] px-3 py-2 rounded-lg border border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateString(selectedDate, -7))}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
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
                <div
                  key={day.date}
                  className="flex items-center group/day rounded-md overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800 text-white font-medium shadow-xs border-y border-l border-white/20'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-y border-l border-transparent'
                    }`}
                    title={`${day.shortDayName} gününü seç`}
                  >
                    <span className="font-semibold">{day.shortDayName}</span>
                    <span className="text-[11px] font-mono text-zinc-300">{day.dayNumber}</span>
                    {day.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Bugün" />
                    )}
                    {dayTotal > 0 && (
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.06] text-zinc-400">
                        {dayFilled}/{dayTotal}
                      </span>
                    )}
                  </button>

                  {/* WhatsApp button right beside each day */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBroadcast(day.date);
                    }}
                    className={`px-1.5 py-1 text-[10px] transition-colors cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-y border-r border-white/20'
                        : 'bg-zinc-900/60 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-950/40 border-y border-r border-transparent'
                    }`}
                    title={`${day.shortDayName} (${day.dayNumber}) WhatsApp Seans İlanı`}
                  >
                    <MessageSquare className="w-3 h-3 text-emerald-400" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(shiftDateString(selectedDate, 7))}
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Sonraki Hafta (7 gün sonra)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="text-zinc-400 hover:text-white hover:underline cursor-pointer"
          >
            Bugüne Dön
          </button>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400 font-mono text-[11px]">
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
        /* Daily Detailed Table */
        <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0b0f] shadow-2xl">
          {dateSessions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-10 h-10 mx-auto rounded-lg bg-[#0e1015] flex items-center justify-center text-zinc-400 mb-3 border border-white/[0.08]">
                <Calendar className="w-5 h-5 text-zinc-400" />
              </div>
              <h3 className="text-xs font-semibold text-white">Bu tarihte planlanmış seans yok</h3>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onFillStandardSlots(selectedDate)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-zinc-800" />
                  <span>Standart Saatleri Yükle (09:00 - 16:40)</span>
                </button>
              </div>
            </div>
          ) : (
          <div>
            {/* Fast Slot Filter Tabs */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-[#090a0f] text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSlotFilter('all')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    slotFilter === 'all'
                      ? 'bg-zinc-800 text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Tümü ({dateSessions.length})
                </button>
                <button
                  onClick={() => setSlotFilter('assigned')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    slotFilter === 'assigned'
                      ? 'bg-zinc-800 text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Dolu ({assignedCount})
                </button>
                <button
                  onClick={() => setSlotFilter('empty')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    slotFilter === 'empty'
                      ? 'bg-zinc-800 text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Boş ({emptyCount})
                </button>
                {missedCount > 0 && (
                  <button
                    onClick={() => setSlotFilter('missed')}
                    className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                      slotFilter === 'missed'
                        ? 'bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30'
                        : 'text-rose-400 hover:text-rose-300'
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
                  <tr className="bg-[#090a0f] border-b border-white/[0.06] text-zinc-400 text-xs">
                    <th className="py-2 px-3 w-20 font-mono font-normal">Saat</th>
                    <th className="py-2 px-3 min-w-[200px] font-normal">Öğrenci</th>
                    <th className="py-2 px-3 min-w-[200px] font-normal">Konu & Karar</th>
                    <th className="py-2 px-3 w-40 font-normal">Durum</th>
                    <th className="py-2 px-3 text-right w-36 font-normal">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] font-sans">
                  {displayedSessions.map((session) => {
                  if (session.is_break) {
                    return (
                      <tr key={session.id} className="bg-amber-950/15 border-b border-dashed border-amber-500/20">
                        <td className="py-2 px-3 font-mono font-medium text-amber-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[11px] flex items-center gap-1 w-fit">
                            <Coffee className="w-3 h-3 text-amber-400" />
                            {session.time_slot}
                          </span>
                        </td>
                        <td colSpan={3} className="py-2 px-3">
                          <span className="text-xs text-amber-200 font-medium">
                            {session.break_title || session.topic || 'Teneffüs / Mola'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSession(session.id);
                              onShowToast('Teneffüs Kaldırıldı', 'Mola takvimden silindi.', 'info');
                            }}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Teneffüsü Kaldır"
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
                      className={`group hover:bg-white/[0.02] transition-colors ${
                        isCompleted
                          ? 'bg-emerald-950/[0.04]'
                          : isMissed
                          ? 'bg-rose-950/[0.06]'
                          : ''
                      }`}
                    >
                      {/* Saat */}
                      <td className="py-2.5 px-3 font-mono font-medium text-zinc-200 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-[11px]">
                          {session.time_slot}
                        </span>
                      </td>

                      {/* Öğrenci Fast Assign or Pill */}
                      <td className="py-2.5 px-3">
                        {student ? (
                          <div className="flex items-center justify-between gap-2 bg-[#0c0d12] p-1.5 pl-2 rounded-md border border-white/[0.06]">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => onOpenStudentProfile(student)}
                                  className="font-medium text-zinc-200 hover:text-white truncate hover:underline text-left cursor-pointer"
                                >
                                  {student.full_name}
                                </button>
                                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                  {student.class_grade}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-mono">
                                <span>{displayPhone(student.phone)}</span>
                                {student.target_goal && (
                                  <span className="text-zinc-400 font-sans truncate max-w-[120px]" title={student.target_goal}>
                                    &bull; {student.target_goal}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleUnassignStudent(session.id)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
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
                                  className="w-full px-2.5 py-1.5 rounded-md bg-[#07080b] border border-zinc-500 text-xs text-white focus:outline-none font-mono"
                                />

                                {/* Suggestions dropdown */}
                                {filteredStudents.length > 0 && (
                                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-[#0e1015] border border-white/[0.08] shadow-2xl z-40 p-1 divide-y divide-white/[0.04]">
                                    {filteredStudents.map((st, idx) => (
                                      <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => handleAssignStudent(session.id, st.id)}
                                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-white/[0.06] transition-colors cursor-pointer ${
                                          idx === 0 ? 'bg-white/[0.08] text-white' : 'text-zinc-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">{st.full_name}</span>
                                          <span className="text-[10px] font-mono px-1 rounded bg-zinc-800 text-zinc-300">
                                            {st.class_grade}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-mono">
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
                                className="w-full text-left px-2.5 py-1.5 rounded-md border border-dashed border-white/[0.08] hover:border-zinc-500 hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <span>+ Öğrenci ata</span>
                                <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
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
                              className="w-full bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-zinc-500 text-xs text-zinc-200 placeholder-zinc-400 py-0.5 focus:outline-none transition-colors"
                            />

                            {/* Dropdown with suggested common topics */}
                            {activeTopicDropdownId === session.id && (
                              <div
                                className="absolute left-0 top-full mt-1 w-52 rounded-lg bg-[#0e1015] border border-white/[0.08] shadow-2xl p-1 z-30 animate-in fade-in"
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
                                    className="w-full text-left px-2 py-1 rounded text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white truncate cursor-pointer"
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
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                                  {session.tags[0]}
                                </span>
                                {session.tags.length > 1 && (
                                  <span className="text-[11px] text-zinc-400 font-normal truncate max-w-[150px]">
                                    {session.tags.slice(1).join(', ')}
                                  </span>
                                )}
                              </>
                            ) : null}
                            {session.action_items && (
                              <span
                                className="text-[10px] text-zinc-400 font-normal truncate max-w-[150px]"
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
                        <div className="inline-flex items-center rounded-md p-0.5 bg-[#090a0f] border border-white/[0.06] text-[11px]">
                          <button
                            onClick={() => handleStatusChange(session, 'Bekliyor')}
                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                              isPending
                                ? 'bg-zinc-800 text-zinc-200 font-medium'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span>Bekliyor</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(session, 'Geldi')}
                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                              isCompleted
                                ? 'bg-zinc-800 text-emerald-400 font-medium'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span>Geldi</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(session, 'Gelmedi')}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                              isMissed
                                ? 'bg-rose-500/20 text-rose-300 font-medium border border-rose-500/40'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isMissed ? 'bg-rose-400' : 'bg-zinc-600'}`} />
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
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                                : 'bg-[#0e1015] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-zinc-800'
                            }`}
                            title="Not ve Etiketler"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          {/* 1-on-1 WhatsApp Summary Card Engine */}
                          {student && (
                            <button
                              onClick={() => handleSendIndividualSummary(session)}
                              className="p-1.5 rounded-md bg-[#0e1015] hover:bg-zinc-800 border border-white/[0.08] text-emerald-400 hover:text-emerald-300 text-xs transition-colors cursor-pointer"
                              title="WhatsApp Seans Kartı Gönder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Gelmedi Auto-reminder button */}
                          {isMissed && student && (
                            <button
                              onClick={() => handleSendMissedReminder(session)}
                              className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                              title="Randevu Hatırlatması Gönder"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span className="hidden sm:inline">Uyar</span>
                            </button>
                          )}

                          {/* Student Past History Log */}
                          {student && (
                            <button
                              onClick={() => setHistoryStudent(student)}
                              className="p-1.5 rounded-md bg-[#0e1015] hover:bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
                              title="Görüşme geçmişi"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Session */}
                          <button
                            onClick={() => onDeleteSession(session.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-xs w-full shadow-2xl space-y-4">
            <h4 className="text-sm font-semibold text-white">Yeni Seans Saati Ekle</h4>
            <form onSubmit={handleAddCustomSlot} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Seans Saati (Örn: 17:00):</label>
                <input
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
