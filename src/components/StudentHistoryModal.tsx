import { useEffect } from 'react';
import { Student, Session } from '../types';
import { X, Calendar, Clock, CheckCircle2, UserX, Tag, MessageSquare } from 'lucide-react';
import { formatTurkishDate, displayPhone } from '../lib/storage';
import { generateIndividualSummaryText, getWhatsAppDirectUrl, openExternalUrl } from '../lib/whatsapp';

interface StudentHistoryModalProps {
  student: Student;
  allSessions: Session[];
  counselorName?: string;
  onClose: () => void;
  onSelectSession?: (session: Session) => void;
}

export function StudentHistoryModal({
  student,
  allSessions,
  counselorName,
  onClose,
}: StudentHistoryModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find all sessions for this student, sorted newest first
  const studentSessions = allSessions
    .filter((s) => s.student_id === student.id)
    .sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return b.time_slot.localeCompare(a.time_slot);
    });

  const completedCount = studentSessions.filter((s) => s.status === 'Geldi').length;
  const missedCount = studentSessions.filter((s) => s.status === 'Gelmedi').length;

  const handleSendCard = (session: Session) => {
    const text = generateIndividualSummaryText(session, student, counselorName);
    const url = getWhatsAppDirectUrl(student.phone, text);
    openExternalUrl(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-history-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div className="bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-stone-800 dark:text-stone-200">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 id="student-history-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">{student.full_name}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700">
                {student.class_grade}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-3">
              <span>{displayPhone(student.phone)}</span>
              {student.target_goal && (
                <>
                  <span className="text-stone-400">&bull;</span>
                  <span className="text-teal-700 dark:text-teal-400 font-medium">{student.target_goal}</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="px-5 py-2 bg-stone-50 dark:bg-stone-900/40 border-b border-stone-200 dark:border-stone-800 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
            <span>Toplam:</span>
            <span className="font-mono font-medium text-stone-900 dark:text-stone-100">{studentSessions.length} seans</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Katıldı:</span>
            <span className="font-mono font-medium">{completedCount}</span>
          </div>
          {missedCount > 0 && (
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <UserX className="w-3.5 h-3.5" />
              <span>Gelmedi:</span>
              <span className="font-mono font-medium">{missedCount}</span>
            </div>
          )}
        </div>

        {/* Timeline body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {studentSessions.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-xs">Bu öğrenciye ait kayıtlı görüşme geçmişi bulunamadı.</p>
            </div>
          ) : (
            studentSessions.map((session) => {
              const isCompleted = session.status === 'Geldi';
              const isMissed = session.status === 'Gelmedi';

              return (
                <div
                  key={session.id}
                  className={`p-3.5 rounded-md border transition-colors ${
                    isCompleted
                      ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40'
                      : isMissed
                      ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/40'
                      : 'bg-stone-50 border-stone-200 dark:bg-stone-900/60 dark:border-stone-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-mono font-medium text-stone-700 dark:text-stone-300">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {formatTurkishDate(session.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-mono text-stone-700 dark:text-stone-300 bg-stone-200/70 dark:bg-stone-800 px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-700">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {session.time_slot}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : isMissed
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {session.status}
                      </span>

                      {/* Send card button */}
                      <button
                        onClick={() => handleSendCard(session)}
                        className="p-1 rounded text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                        title="Bu seansın WhatsApp özet kartını gönder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="mt-2">
                    <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {session.topic || 'Genel Değerlendirme'}
                    </h4>
                  </div>

                  {/* Action Items / Goal */}
                  {session.action_items && (
                    <div className="mt-2 p-2 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      <span className="font-medium text-teal-700 dark:text-teal-400 block mb-0.5">
                        🎯 Haftalık Hedefler & Ödev:
                      </span>
                      {session.action_items}
                    </div>
                  )}

                  {/* Tags */}
                  {session.tags && session.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {session.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700"
                        >
                          <Tag className="w-2.5 h-2.5 text-stone-400" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
