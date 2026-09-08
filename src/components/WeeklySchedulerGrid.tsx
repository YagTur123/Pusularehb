import React, { useState, useMemo } from 'react';
import { Session, Student, COMMON_TOPICS } from '../types';
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
} from 'lucide-react';
import {
  getWeekDays,
  generateDefaultTimeSlots,
  displayPhone,
} from '../lib/storage';
import {
  generateIndividualSummaryText,
  generateMissedSessionReminderText,
  getWhatsAppDirectUrl,
} from '../lib/whatsapp';

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
}: WeeklySchedulerGridProps) {
  const [includeWeekend, setIncludeWeekend] = useState(false);
  const [activeAssignSlot, setActiveAssignSlot] = useState<{ date: string; time_slot: string; sessionId?: string } | null>(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [quickEditingSession, setQuickEditingSession] = useState<Session | null>(null);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const weekDays = useMemo(() => getWeekDays(baseDate, includeWeekend), [baseDate, includeWeekend]);

  // Extract all unique time slots across standard list and existing sessions in the week
  const weekDatesSet = useMemo(() => new Set(weekDays.map((d) => d.date)), [weekDays]);
  
  const weekSessions = useMemo(() => {
    return sessions.filter((s) => weekDatesSet.has(s.date));
  }, [sessions, weekDatesSet]);

  const allTimeSlots = useMemo(() => {
    const slotsSet = new Set<string>(generateDefaultTimeSlots());
    weekSessions.forEach((s) => slotsSet.add(s.time_slot));
    return Array.from(slotsSet).sort((a, b) => a.localeCompare(b));
  }, [weekSessions]);

  // Quick stats for this week
  const weekStats = useMemo(() => {
    const total = weekSessions.length;
    const filled = weekSessions.filter((s) => s.student_id).length;
    const attended = weekSessions.filter((s) => s.status === 'Geldi').length;
    const missed = weekSessions.filter((s) => s.status === 'Gelmedi').length;
    const empty = total - filled;
    return { total, filled, attended, missed, empty };
  }, [weekSessions]);

  // Filter students for slot assignment
  const filteredStudents = useMemo(() => {
    if (!assignSearch.trim()) return students.slice(0, 7);
    const q = assignSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.class_grade.toLowerCase().includes(q) ||
        s.phone.includes(q)
    ).slice(0, 8);
  }, [students, assignSearch]);

  const handleAssignStudent = (student: Student) => {
    if (!activeAssignSlot) return;

    if (activeAssignSlot.sessionId) {
      const existing = sessions.find((s) => s.id === activeAssignSlot.sessionId);
      if (existing) {
        onUpdateSession({
          ...existing,
          student_id: student.id,
          topic: existing.topic || (student.status_flags?.[0] ? `${student.status_flags[0]} Takibi` : 'TYT Deneme Analizi'),
          tags: existing.tags.length === 0 && student.status_flags ? [...student.status_flags] : existing.tags,
        });
      }
    } else {
      // Create new session
      onAddSession({
        date: activeAssignSlot.date,
        time_slot: activeAssignSlot.time_slot,
        student_id: student.id,
        topic: student.status_flags?.[0] ? `${student.status_flags[0]} Takibi` : 'Bireysel Seans',
        action_items: '',
        tags: student.status_flags || [],
        status: 'Bekliyor',
      });
    }

    setActiveAssignSlot(null);
    setAssignSearch('');
    onShowToast('Öğrenci Yerleştirildi', `${student.full_name} (${activeAssignSlot.time_slot}) seansına atandı.`, 'success');
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
    });
    onShowToast('Boş Seans Açıldı', `${time_slot} saati için boş seans oluşturuldu.`, 'info');
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

  return (
    <div className="space-y-3">
      {/* Weekly Stats & Quick Batch Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0c0d12] p-2.5 rounded-lg border border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-zinc-400">
            Haftalık Toplam: <strong className="text-white">{weekStats.total}</strong> seans
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400">
            Dolu: <strong>{weekStats.filled}</strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">
            Tamamlanan: <strong className="text-white">{weekStats.attended}</strong>
          </span>
          {weekStats.missed > 0 && (
            <>
              <span className="text-zinc-600">|</span>
              <span className="text-rose-400">
                Gelmeyen: <strong>{weekStats.missed}</strong>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Weekend Toggle */}
          <button
            type="button"
            onClick={() => setIncludeWeekend(!includeWeekend)}
            className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
            title="Haftalık veya seçili günün WhatsApp seans ilanını aç"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp İlanı</span>
          </button>

          {/* Fill standard slots for entire week */}
          {onFillStandardWeek && (
            <button
              type="button"
              onClick={() => onFillStandardWeek(baseDate)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1015] hover:bg-[#12141a] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
              title="Pazartesi-Cuma aralığındaki tüm günlere 40 dakikalık periyotları aç"
            >
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <span>Haftayı Doldur</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekly Grid Container */}
      <div className="border border-white/[0.08] rounded-xl overflow-x-auto bg-[#0a0b0f] shadow-2xl">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#090a0f]">
              {/* Hour Slot Column Header */}
              <th className="w-20 p-2.5 text-center text-[11px] font-mono uppercase text-zinc-500 border-r border-white/[0.06] sticky left-0 bg-[#090a0f] z-10">
                Saat
              </th>

              {/* Day Column Headers */}
              {weekDays.map((day) => {
                const daySessions = weekSessions.filter((s) => s.date === day.date);
                const isSelected = day.date === baseDate;

                return (
                  <th
                    key={day.date}
                    onClick={() => onSelectDate(day.date)}
                    className={`p-2.5 border-r border-white/[0.06] transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800/40'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-xs font-semibold ${day.isToday ? 'text-white' : 'text-zinc-200'}`}>
                          {day.shortDayName}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {day.dayNumber}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {day.isToday && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Bugün
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500">
                          {daySessions.filter((s) => s.student_id).length}/{daySessions.length}
                        </span>

                        {/* Direct WhatsApp announcement button for this specific day */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenBroadcast(day.date);
                          }}
                          className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer"
                          title={`${day.shortDayName} (${day.dayNumber}) WhatsApp İlanını Aç`}
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.04]">
            {allTimeSlots.map((timeSlot) => (
              <tr key={timeSlot} className="hover:bg-white/[0.01] transition-colors">
                {/* Time slot header */}
                <td className="p-2 text-center text-xs font-mono font-medium text-zinc-400 border-r border-white/[0.06] bg-[#08090d] sticky left-0 z-10">
                  {timeSlot}
                </td>

                {/* Day Cells */}
                {weekDays.map((day) => {
                  const session = weekSessions.find(
                    (s) => s.date === day.date && s.time_slot === timeSlot
                  );
                  const student = session?.student_id ? studentMap.get(session.student_id) : null;

                  return (
                    <td
                      key={`${day.date}-${timeSlot}`}
                      className="p-1.5 border-r border-white/[0.04] align-top min-w-[130px]"
                    >
                      {session ? (
                        student ? (
                          /* Assigned Student Session Card */
                          <div
                            onClick={() => setQuickEditingSession(session)}
                            className={`group relative p-2 rounded-lg border transition-all cursor-pointer ${
                              session.status === 'Geldi'
                                ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                                : session.status === 'Gelmedi'
                                ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                                : 'bg-[#0f1118] border-white/[0.08] hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="text-xs font-semibold text-zinc-100 truncate group-hover:text-white">
                                {student.full_name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1 py-0.2 rounded shrink-0">
                                {student.class_grade}
                              </span>
                            </div>

                            {session.topic && (
                              <p className="text-[11px] text-zinc-400 truncate mb-1.5" title={session.topic}>
                                {session.topic}
                              </p>
                            )}

                            {/* Status and Action bar */}
                            <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                              <button
                                type="button"
                                onClick={(e) => handleToggleStatus(session, e)}
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                  session.status === 'Geldi'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : session.status === 'Gelmedi'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                                }`}
                                title="Durumu Değiştir (Bekliyor / Geldi / Gelmedi)"
                              >
                                {session.status}
                              </button>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => handleSendWhatsAppSummary(session, e)}
                                  className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                                  title="WhatsApp Mesajı Gönder"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Existing Empty Slot */
                          <button
                            type="button"
                            onClick={() =>
                              setActiveAssignSlot({
                                date: day.date,
                                time_slot: timeSlot,
                                sessionId: session.id,
                              })
                            }
                            className="w-full h-full min-h-[52px] flex items-center justify-center gap-1 rounded-lg border border-dashed border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02] text-zinc-500 hover:text-zinc-300 text-xs transition-colors cursor-pointer p-2"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Öğrenci Ata</span>
                          </button>
                        )
                      ) : (
                        /* Slot does not exist for this day/time */
                        <button
                          type="button"
                          onClick={() => handleCreateEmptySlot(day.date, timeSlot)}
                          className="w-full h-full min-h-[52px] opacity-0 hover:opacity-100 flex items-center justify-center gap-1 rounded-lg border border-dashed border-white/[0.06] hover:bg-white/[0.02] text-zinc-600 hover:text-zinc-400 text-xs transition-opacity cursor-pointer p-2"
                          title={`${timeSlot} için seans aç`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Saat Aç</span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick Assign Modal */}
      {activeAssignSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
          onClick={() => setActiveAssignSlot(null)}
        >
          <div
            className="w-full max-w-md bg-[#0e1017] border border-white/[0.12] rounded-xl shadow-2xl p-4 space-y-3"
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
                      <div className="text-xs font-medium text-zinc-200 group-hover:text-white">
                        {st.full_name}
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
                <h3 className="text-sm font-semibold text-white">
                  Seans Detayı & Notları
                </h3>
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
                    {studentMap.get(quickEditingSession.student_id)?.class_grade} • {displayPhone(studentMap.get(quickEditingSession.student_id)?.phone || '')}
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
