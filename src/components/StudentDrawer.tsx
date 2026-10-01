import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, Session, DIAGNOSTIC_TAGS } from '../types';
import {
  X,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  GraduationCap,
  Target,
  FileText,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Plus,
  Send,
  History,
} from 'lucide-react';
import { formatTurkishDate, displayPhone, StorageService } from '../lib/storage';
import { getWhatsAppDirectUrl, openExternalUrl, formatMessageWithTemplate, getStoredTemplates } from '../lib/whatsapp';

interface StudentDrawerProps {
  student: Student | null;
  allSessions: Session[];
  counselorName: string;
  onClose: () => void;
  onSaveStudent: (studentData: Omit<Student, 'id' | 'created_at'>, studentId?: string) => void;
  onQuickSchedule: (student: Student) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function StudentDrawer({
  student,
  allSessions,
  counselorName,
  onClose,
  onSaveStudent,
  onQuickSchedule,
  onShowToast,
}: StudentDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'edit'>('overview');
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);

  useEffect(() => {
    if (student) {
      setQuickNote(student.notes || '');
      setEditName(student.full_name);
      setEditGrade(student.class_grade);
      setEditPhone(student.phone);
      setEditGoal(student.target_goal || '');
      setEditTags(student.status_flags || []);
    }
  }, [student]);

  // Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && student) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [student, onClose]);

  // Chronological sessions
  const studentSessions = useMemo(() => {
    if (!student) return [];
    return allSessions
      .filter((s) => s.student_id === student.id && !s.is_break)
      .sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        if (cmp !== 0) return cmp;
        return b.time_slot.localeCompare(a.time_slot);
      });
  }, [allSessions, student]);

  // Next planned session (future or today)
  const nextSession = useMemo(() => {
    if (!student) return null;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const upcoming = allSessions
      .filter((s) => s.student_id === student.id && s.date >= todayStr && !s.is_break)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot));
    return upcoming[0] || null;
  }, [allSessions, student]);

  if (!student) return null;

  const handleSaveQuickNote = () => {
    setIsSavingNote(true);
    onSaveStudent(
      {
        full_name: student.full_name,
        class_grade: student.class_grade,
        phone: student.phone,
        status_flags: student.status_flags,
        last_meeting_date: student.last_meeting_date,
        target_goal: student.target_goal,
        notes: quickNote.trim(),
      },
      student.id
    );
    setIsSavingNote(false);
    onShowToast('Not Kaydedildi', `${student.full_name} için profil notu güncellendi.`, 'success');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveStudent(
      {
        full_name: editName.trim() || student.full_name,
        class_grade: editGrade.trim() || student.class_grade,
        phone: editPhone.trim() || student.phone,
        status_flags: editTags,
        last_meeting_date: student.last_meeting_date,
        target_goal: editGoal.trim() || undefined,
        notes: quickNote.trim() || undefined,
      },
      student.id
    );
    setActiveTab('overview');
    onShowToast('Profil Güncellendi', editName, 'success');
  };

  const handleDirectWhatsApp = () => {
    if (!student.phone) {
      onShowToast('Telefon Eksik', 'Öğrencinin telefon numarası kayıtlı değil.', 'warning');
      return;
    }

    const templates = getStoredTemplates();
    const tpl = templates[0];
    const msg = formatMessageWithTemplate(tpl.content, {
      ad: student.full_name,
      saat: nextSession?.time_slot || 'Rehberlik Saati',
      tarih: nextSession ? formatTurkishDate(nextSession.date) : 'Görüşme Günü',
      danisman: counselorName || 'Rehberlik Servisi',
    });

    if (StorageService.isDemo()) {
      onShowToast('Demo Modu: Mesaj Önizlemesi', msg, 'info');
    } else {
      const url = getWhatsAppDirectUrl(student.phone, msg);
      openExternalUrl(url);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#1E1E1E] border-l border-stone-200 dark:border-stone-800 shadow-2xl h-full flex flex-col overflow-hidden text-stone-800 dark:text-stone-200 animate-slideInRight"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-800 dark:text-teal-300 font-bold text-sm shrink-0">
              {student.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 id="student-drawer-title" className="text-base font-semibold text-stone-900 dark:text-stone-100 truncate">
                {student.full_name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                <span className="font-mono">{student.class_grade}</span>
                <span>•</span>
                <span className="font-mono">{displayPhone(student.phone)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-stone-200 dark:border-stone-800 px-4 bg-stone-50/40 dark:bg-stone-900/30 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-teal-700 dark:border-teal-400 text-teal-700 dark:text-teal-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Genel Bakış
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-teal-700 dark:border-teal-400 text-teal-700 dark:text-teal-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            <span>Seans Geçmişi</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-100 dark:bg-stone-800">
              {studentSessions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'edit'
                ? 'border-teal-700 dark:border-teal-400 text-teal-700 dark:text-teal-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Düzenle
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Bir Sonraki Seans Kartı */}
              <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    <span>Planlanan Seans</span>
                  </span>
                  {nextSession ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                      {nextSession.status}
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-400">Plan yok</span>
                  )}
                </div>

                {nextSession ? (
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-stone-900 dark:text-stone-100">
                      {formatTurkishDate(nextSession.date)} saat {nextSession.time_slot}
                    </div>
                    {nextSession.topic && (
                      <p className="text-stone-600 dark:text-stone-400">
                        {nextSession.topic}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-stone-500">Yaklaşan randevusu bulunmuyor.</p>
                    <button
                      type="button"
                      onClick={() => onQuickSchedule(student)}
                      className="px-2.5 py-1 rounded-md bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D645E] cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Bugüne Ata</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hızlı WhatsApp İletişim Butonu */}
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Tek Tuşla WhatsApp Mesajı Gönder</span>
              </button>

              {/* Hedef ve Teşhisler */}
              <div className="space-y-2 text-xs">
                {student.target_goal && (
                  <div className="p-3 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1">
                    <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-stone-400" />
                      <span>Hedeflenen Bölüm / Sıralama</span>
                    </span>
                    <p className="font-medium text-stone-900 dark:text-stone-100">{student.target_goal}</p>
                  </div>
                )}

                {student.status_flags && student.status_flags.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-stone-400" />
                      <span>Teşhis ve Takip Etiketleri</span>
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {student.status_flags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hızlı Not Ekleme & Taslak Alanı */}
              <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-stone-800 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span>Öğrenci Notları & Takip Defteri</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveQuickNote}
                    disabled={isSavingNote}
                    className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>Kaydet</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Bu öğrenciyle ilgili görüşme notları, devamsızlık durumu veya özel hatırlatmalar..."
                  className="w-full p-2.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {studentSessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500 space-y-2">
                  <p>Bu öğrenci için henüz tamamlanmış seans kaydı bulunmuyor.</p>
                  <button
                    type="button"
                    onClick={() => onQuickSchedule(student)}
                    className="px-3 py-1.5 rounded-md bg-[#0F766E] text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>İlk Seansı Planla</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {studentSessions.map((sess) => {
                    const isDone = sess.status === 'Geldi';
                    const isMissed = sess.status === 'Gelmedi';

                    return (
                      <div
                        key={sess.id}
                        className="p-3 rounded-lg bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>{formatTurkishDate(sess.date)} • {sess.time_slot}</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : isMissed
                                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                            }`}
                          >
                            {sess.status}
                          </span>
                        </div>

                        {sess.topic && (
                          <div className="font-medium text-stone-800 dark:text-stone-200">
                            {sess.topic}
                          </div>
                        )}

                        {sess.action_items && (
                          <div className="text-[11px] text-stone-500 dark:text-stone-400 italic">
                            🎯 {sess.action_items}
                          </div>
                        )}

                        {sess.feedback && (
                          <div className="text-[11px] text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-200 dark:border-stone-800">
                            {sess.feedback.status === 'Geldi'
                              ? `Verim: ${sess.feedback.efficiency || 'Verimli'} (${sess.feedback.rating || 5}★) — ${sess.feedback.notes || ''}`
                              : `Gelmedi Mazereti: ${sess.feedback.reason || 'Belirtilmedi'}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-800 dark:text-stone-200">Ad Soyad</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-800 dark:text-stone-200">Sınıf</label>
                  <input
                    type="text"
                    required
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-stone-800 dark:text-stone-200">Telefon</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-800 dark:text-stone-200">Hedeflenen Üniversite / Bölüm</label>
                <input
                  type="text"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-800 dark:text-stone-200">Teşhis Etiketleri</label>
                <div className="flex flex-wrap gap-1 pt-1">
                  {DIAGNOSTIC_TAGS.map((tag) => {
                    const isSelected = editTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setEditTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
                            : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-[#0F766E] text-white font-semibold hover:bg-[#0D645E]"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
