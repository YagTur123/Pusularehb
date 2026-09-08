import React, { useState, useRef, useEffect } from 'react';
import { Session, Student, COMMON_TOPICS } from '../types';
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
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  getTodayDateString,
  shiftDateString,
  formatTurkishDate,
  displayPhone,
  StorageService,
} from '../lib/storage';
import {
  generateIndividualSummaryText,
  generateMissedSessionReminderText,
  getWhatsAppDirectUrl,
} from '../lib/whatsapp';
import { QuickNotePopover } from './QuickNotePopover';
import { StudentHistoryModal } from './StudentHistoryModal';

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
  onOpenBroadcast: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  onOpenStudentProfile: (student: Student) => void;
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
  onOpenBroadcast,
  onShowToast,
  onOpenStudentProfile,
}: DailySchedulerProps) {
  const [activeSlotSearchId, setActiveSlotSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickNoteSession, setActiveQuickNoteSession] = useState<Session | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [newSlotTime, setNewSlotTime] = useState('17:00');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);

  // Suggested topics dropdown state
  const [activeTopicDropdownId, setActiveTopicDropdownId] = useState<string | null>(null);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Sessions for currently selected date
  const dateSessions = sessions
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const todayStr = getTodayDateString();
  const yesterdayStr = shiftDateString(todayStr, -1);
  const tomorrowStr = shiftDateString(todayStr, 1);

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
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
        {/* Date Selector & Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick switches: [Dün] [Bugün] [Yarın] */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedDate(yesterdayStr)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedDate === yesterdayStr
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dün
            </button>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedDate === todayStr
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bugün
            </button>
            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedDate === tomorrowStr
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yarın
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
            />
          </div>

          {/* Formatted Date Label */}
          <span className="hidden xl:inline text-xs font-medium text-slate-300 ml-1">
            {formatTurkishDate(selectedDate)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Fill Standard Slots Button */}
          <button
            onClick={() => onFillStandardSlots(selectedDate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-indigo-200 border border-slate-700 text-xs font-medium transition-colors"
            title="40 dakikalık standart ders seanslarını otomatik oluştur"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>⚡ Standart Seansları Doldur</span>
          </button>

          {/* Add Custom Slot */}
          <button
            onClick={() => setShowAddCustomModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seans Ekle</span>
          </button>

          {/* WhatsApp Broadcast Shortcut */}
          <button
            onClick={onOpenBroadcast}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Grup İlanı</span>
            <kbd className="px-1.5 py-0.2 rounded bg-emerald-800 text-[10px] font-mono">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>

      {/* Slots Table */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60 shadow-xl shadow-slate-950/30">
        {dateSessions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center text-slate-500 mb-3 border border-slate-800">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">Bu Tarihte Planlanmış Seans Yok</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Standart 40 dakikalık periyotları tek tıkla oluşturabilir veya manuel seans ekleyebilirsiniz.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => onFillStandardSlots(selectedDate)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>⚡ Standart Seansları Doldur (09:00 - 16:40)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-24">Saat</th>
                  <th className="py-2.5 px-4 min-w-[220px]">Öğrenci</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Konu & Teşhis</th>
                  <th className="py-2.5 px-4 w-44">Durum</th>
                  <th className="py-2.5 px-4 text-right w-44">Hızlı Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {dateSessions.map((session) => {
                  const student = session.student_id
                    ? studentMap.get(session.student_id)
                    : undefined;

                  const isCompleted = session.status === 'Geldi';
                  const isMissed = session.status === 'Gelmedi';
                  const isPending = session.status === 'Bekliyor';

                  return (
                    <tr
                      key={session.id}
                      className={`group hover:bg-slate-900/50 transition-colors ${
                        isCompleted
                          ? 'bg-emerald-950/5'
                          : isMissed
                          ? 'bg-rose-950/10'
                          : ''
                      }`}
                    >
                      {/* Saat */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-200 whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {session.time_slot}
                        </span>
                      </td>

                      {/* Öğrenci Fast Assign or Pill */}
                      <td className="py-3 px-4">
                        {student ? (
                          <div className="flex items-center justify-between gap-2 bg-slate-900/90 p-1.5 pl-2.5 rounded-lg border border-slate-800">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => onOpenStudentProfile(student)}
                                  className="font-semibold text-slate-100 hover:text-indigo-400 truncate hover:underline text-left"
                                >
                                  {student.full_name}
                                </button>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                  {student.class_grade}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                                <span>{displayPhone(student.phone)}</span>
                                {student.target_goal && (
                                  <span className="text-slate-500 font-sans truncate max-w-[120px]" title={student.target_goal}>
                                    &bull; {student.target_goal}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleUnassignStudent(session.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title="Öğrenciyi bu seanstan çıkar"
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
                                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-indigo-500 text-xs text-white focus:outline-none font-mono"
                                />

                                {/* Suggestions dropdown */}
                                {filteredStudents.length > 0 && (
                                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-slate-900 border border-slate-700 shadow-xl shadow-slate-950/80 z-40 p-1 divide-y divide-slate-800/40">
                                    {filteredStudents.map((st, idx) => (
                                      <button
                                        key={st.id}
                                        type="button"
                                        onClick={() => handleAssignStudent(session.id, st.id)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between hover:bg-indigo-600/30 transition-colors ${
                                          idx === 0 ? 'bg-indigo-600/20 text-white' : 'text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">{st.full_name}</span>
                                          <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                                            {st.class_grade}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">
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
                                className="w-full text-left px-3 py-1.5 rounded-lg border border-dashed border-slate-800 hover:border-indigo-500/60 hover:bg-slate-900/60 text-slate-500 hover:text-indigo-400 transition-colors flex items-center justify-between"
                              >
                                <span>+ Öğrenci ata (ara)...</span>
                                <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-500">
                                  Enter
                                </kbd>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Konu & Teşhis Notu */}
                      <td className="py-3 px-4">
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
                              className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-xs text-slate-200 placeholder-slate-600 py-0.5 focus:outline-none transition-colors"
                            />

                            {/* Dropdown with suggested common topics */}
                            {activeTopicDropdownId === session.id && (
                              <div
                                className="absolute left-0 top-full mt-1 w-56 rounded-lg bg-slate-900 border border-slate-800 shadow-xl p-1 z-30 animate-in fade-in"
                                onMouseLeave={() => setActiveTopicDropdownId(null)}
                              >
                                <div className="px-2 py-1 text-[10px] text-slate-500 font-mono uppercase">
                                  Hızlı Konular:
                                </div>
                                {COMMON_TOPICS.map((top) => (
                                  <button
                                    key={top}
                                    type="button"
                                    onClick={() => {
                                      onUpdateSession({ ...session, topic: top });
                                      setActiveTopicDropdownId(null);
                                    }}
                                    className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white truncate"
                                  >
                                    {top}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Tag Chips / Action Item preview */}
                          <div className="flex flex-wrap items-center gap-1">
                            {session.tags && session.tags.length > 0 ? (
                              session.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : null}
                            {session.tags && session.tags.length > 2 && (
                              <span className="text-[10px] text-slate-500">
                                +{session.tags.length - 2}
                              </span>
                            )}
                            {session.action_items && (
                              <span
                                className="text-[10px] text-emerald-400 font-medium truncate max-w-[140px]"
                                title={session.action_items}
                              >
                                🎯 {session.action_items}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Durum Toggle: [Bekliyor] [Geldi] [Gelmedi] */}
                      <td className="py-3 px-4">
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-slate-800 text-[11px] font-medium">
                          <button
                            onClick={() => handleStatusChange(session, 'Bekliyor')}
                            className={`px-2 py-1 rounded-md transition-all ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Bekliyor
                          </button>
                          <button
                            onClick={() => handleStatusChange(session, 'Geldi')}
                            className={`px-2 py-1 rounded-md transition-all ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs font-semibold'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Geldi
                          </button>
                          <button
                            onClick={() => handleStatusChange(session, 'Gelmedi')}
                            className={`px-2 py-1 rounded-md transition-all ${
                              isMissed
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs font-semibold'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Gelmedi
                          </button>
                        </div>
                      </td>

                      {/* Hızlı Aksiyonlar */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Note / Teşhis Popover trigger */}
                          <button
                            onClick={() => setActiveQuickNoteSession(session)}
                            className={`p-1.5 rounded-md border text-xs transition-colors ${
                              session.tags?.length || session.action_items
                                ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300 hover:bg-indigo-900/60'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Hızlı Not & Teşhis Etiketleri Düzenle"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>

                          {/* 1-on-1 WhatsApp Summary Card Engine */}
                          {student && (
                            <button
                              onClick={() => handleSendIndividualSummary(session)}
                              className="p-1.5 rounded-md bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 hover:text-emerald-300 text-xs transition-colors"
                              title="📱 Öğrenciye WhatsApp Seans Kartı Gönder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Gelmedi Auto-reminder button */}
                          {isMissed && student && (
                            <button
                              onClick={() => handleSendMissedReminder(session)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-[11px] font-medium transition-colors"
                              title="Kaçırılan Randevu Uyarısı Gönder"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span className="hidden sm:inline">Uyar</span>
                            </button>
                          )}

                          {/* Student Past History Log */}
                          {student && (
                            <button
                              onClick={() => setHistoryStudent(student)}
                              className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                              title="Öğrencinin geçmiş görüşmelerini incele"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Slot */}
                          <button
                            onClick={() => onDeleteSession(session.id)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                            title="Bu seansı sil"
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
        )}
      </div>

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
