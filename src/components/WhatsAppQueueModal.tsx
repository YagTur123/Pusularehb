import React, { useState, useMemo, useEffect } from 'react';
import { Session, Student, MessageTemplate } from '../types';
import {
  getStoredTemplates,
  saveStoredTemplates,
  formatMessageWithTemplate,
  getWhatsAppUniversalUrl,
  copyToClipboard,
  openExternalUrl,
  DEFAULT_TEMPLATES,
} from '../lib/whatsapp';
import { StorageService, formatTurkishDate, displayPhone } from '../lib/storage';
import {
  X,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Settings,
  Send,
  Sparkles,
  Check,
  RotateCcw,
  SkipForward,
  ExternalLink,
  Phone,
} from 'lucide-react';

interface WhatsAppQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  sessions: Session[];
  students: Student[];
  counselorName: string;
  onMarkSent: (sessionId: string, sent: boolean) => Promise<void> | void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function WhatsAppQueueModal({
  isOpen,
  onClose,
  date,
  sessions,
  students,
  counselorName,
  onMarkSent,
  onShowToast,
}: WhatsAppQueueModalProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => getStoredTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl_reminder');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Target sessions for today with student assigned
  const queueSessions = useMemo(() => {
    return sessions
      .filter((s) => s.date === date && s.student_id && !s.is_break)
      .sort((a, b) => a.time_slot.localeCompare(b.time_slot));
  }, [sessions, date]);

  // Active template
  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || DEFAULT_TEMPLATES[0];
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    if (isOpen) {
      setTemplates(getStoredTemplates());
      setIsEditingTemplate(false);
      // Find first unsent session index
      const firstUnsent = queueSessions.findIndex((s) => !s.whatsapp_sent);
      setCurrentIndex(firstUnsent !== -1 ? firstUnsent : 0);
    }
  }, [isOpen, queueSessions]);

  useEffect(() => {
    setEditingContent(currentTemplate.content);
  }, [currentTemplate]);

  // Esc key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSession = queueSessions[currentIndex];
  const currentStudent = currentSession && currentSession.student_id ? studentMap.get(currentSession.student_id) : null;

  const formattedMessage = currentStudent && currentSession
    ? formatMessageWithTemplate(currentTemplate.content, {
        ad: currentStudent.full_name,
        saat: currentSession.time_slot,
        tarih: formatTurkishDate(date),
        danisman: counselorName || 'Rehberlik Servisi',
      })
    : '';

  const sentCount = queueSessions.filter((s) => s.whatsapp_sent).length;
  const progressPercent = queueSessions.length > 0 ? Math.round((sentCount / queueSessions.length) * 100) : 0;

  const handleSaveTemplate = () => {
    const updated = templates.map((t) =>
      t.id === selectedTemplateId ? { ...t, content: editingContent } : t
    );
    setTemplates(updated);
    saveStoredTemplates(updated);
    setIsEditingTemplate(false);
    onShowToast('Şablon Güncellendi', 'Mesaj taslağı kaydedildi.', 'success');
  };

  const handleResetTemplates = () => {
    setTemplates(DEFAULT_TEMPLATES);
    saveStoredTemplates(DEFAULT_TEMPLATES);
    setIsEditingTemplate(false);
    onShowToast('Varsayılan Şablonlar', 'Şablonlar orijinal metinlere döndürüldü.', 'info');
  };

  const handleSendAndAdvance = async () => {
    if (!currentSession || !currentStudent) return;

    await copyToClipboard(formattedMessage);

    if (StorageService.isDemo()) {
      onShowToast(
        'Demo Modu: Mesaj Önizlemesi',
        `${currentStudent.full_name} için mesaj kopyalandı ve gönderildi olarak işaretlendi.`,
        'info'
      );
    } else {
      const url = getWhatsAppUniversalUrl(formattedMessage);
      openExternalUrl(url);
      onShowToast(
        'WhatsApp Açılıyor',
        `${currentStudent.full_name} için mesaj panoya kopyalandı.`,
        'success'
      );
    }

    await onMarkSent(currentSession.id, true);

    // Auto-advance
    if (currentIndex < queueSessions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleMarkSentOnly = async () => {
    if (!currentSession) return;
    await onMarkSent(currentSession.id, true);
    onShowToast('İşaretlendi', 'Gönderildi olarak kaydedildi.', 'info');
    if (currentIndex < queueSessions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="queue-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1E1E1E] border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl max-w-4xl w-full flex flex-col overflow-hidden text-stone-800 dark:text-stone-200 animate-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 id="queue-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Sıralı WhatsApp Gönderim Modu
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {formatTurkishDate(date)} seansları için tek tıkla ilerleme ve takip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-stone-500">{sentCount} / {queueSessions.length} Gönderildi</span>
              <div className="w-24 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {queueSessions.length === 0 ? (
          <div className="p-12 text-center text-xs text-stone-500 space-y-2">
            <p>Bugün için planlanmış randevulu öğrenci bulunamadı.</p>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-stone-900 text-white text-xs font-semibold"
            >
              Kapat
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-200 dark:divide-stone-800 flex-1 min-h-[420px]">
            {/* Left Column: Student Queue List */}
            <div className="p-3 bg-stone-50/50 dark:bg-stone-900/30 overflow-y-auto max-h-[300px] md:max-h-[500px] space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-stone-400">
                Sıradaki Öğrenciler ({queueSessions.length})
              </div>

              {queueSessions.map((session, idx) => {
                const st = session.student_id ? studentMap.get(session.student_id) : null;
                const isCurrent = idx === currentIndex;
                const isSent = session.whatsapp_sent;

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-full text-left p-2 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 text-stone-900 dark:text-stone-100 font-medium'
                        : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] text-stone-500 shrink-0">
                        {session.time_slot}
                      </span>
                      <div className="truncate">
                        <div className="truncate font-semibold">{st ? st.full_name : 'Öğrenci yok'}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{st?.class_grade}</div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Gönderildi</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-mono">Bekliyor</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Template Controls & Live Preview (Span 2) */}
            <div className="md:col-span-2 p-5 space-y-4 flex flex-col justify-between overflow-y-auto">
              {/* Template Selection Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    Mesaj Şablonu:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                    className="text-xs text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span>{isEditingTemplate ? 'Önizlemeye Dön' : 'Şablonu Düzenle'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setIsEditingTemplate(false);
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer border ${
                        selectedTemplateId === tpl.id
                          ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-transparent font-semibold shadow-xs'
                          : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Editor (Accordion) */}
              {isEditingTemplate ? (
                <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      Şablon Metnini Özelleştir
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      Kullanılabilir: {'{ad}'}, {'{saat}'}, {'{tarih}'}, {'{danisman}'}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full p-2.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-teal-600 font-mono"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleResetTemplates}
                      className="text-[11px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Varsayılana Dön</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      className="px-3 py-1 rounded bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D645E] cursor-pointer"
                    >
                      Şablonu Kaydet
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Preview for Current Student */
                <div className="space-y-3">
                  {currentStudent && currentSession ? (
                    <div className="p-4 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                      {/* Student Info Pill */}
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/40">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {currentStudent.full_name}
                          </span>
                          <span className="text-[11px] font-mono text-stone-500">
                            ({currentStudent.class_grade})
                          </span>
                          <span className="text-[11px] font-mono text-stone-700 dark:text-stone-300 font-semibold bg-white dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                            {currentSession.time_slot}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{displayPhone(currentStudent.phone)}</span>
                        </div>
                      </div>

                      {/* WhatsApp Speech Bubble Style Preview */}
                      <div className="p-3.5 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs text-xs text-stone-800 dark:text-stone-200 leading-relaxed font-sans whitespace-pre-wrap">
                        {formattedMessage}
                      </div>

                      {currentSession.whatsapp_sent && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Bu öğrenciye mesaj gönderildi olarak işaretlenmiş.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-stone-500">
                      Öğrenci seçilmedi.
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="p-2 rounded-md border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 cursor-pointer text-stone-700 dark:text-stone-300"
                    title="Önceki Öğrenci"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-stone-500 px-1">
                    {currentIndex + 1} / {queueSessions.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(queueSessions.length - 1, prev + 1))}
                    disabled={currentIndex === queueSessions.length - 1}
                    className="p-2 rounded-md border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 cursor-pointer text-stone-700 dark:text-stone-300"
                    title="Sonraki Öğrenci"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkSentOnly}
                    className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Yalnızca İşaretle
                  </button>

                  <button
                    type="button"
                    onClick={handleSendAndAdvance}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Aç & Sıradakine Geç</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
