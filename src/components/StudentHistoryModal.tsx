import { Student, Session } from '../types';
import { X, Calendar, Clock, CheckCircle2, UserX, Tag, MessageSquare } from 'lucide-react';
import { formatTurkishDate, displayPhone } from '../lib/storage';
import { generateIndividualSummaryText, getWhatsAppDirectUrl } from '../lib/whatsapp';

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
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{student.full_name}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                {student.class_grade}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
              <span>{displayPhone(student.phone)}</span>
              {student.target_goal && (
                <>
                  <span className="text-slate-400 dark:text-slate-600">&bull;</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">{student.target_goal}</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span>Toplam Seans:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">{studentSessions.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Katıldı:</span>
            <span className="font-mono font-semibold">{completedCount}</span>
          </div>
          {missedCount > 0 && (
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <UserX className="w-3.5 h-3.5" />
              <span>Katılmadı:</span>
              <span className="font-mono font-semibold">{missedCount}</span>
            </div>
          )}
        </div>

        {/* Timeline body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {studentSessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Bu öğrenciye ait kayıtlı görüşme geçmişi bulunamadı.</p>
            </div>
          ) : (
            studentSessions.map((session) => {
              const isCompleted = session.status === 'Geldi';
              const isMissed = session.status === 'Gelmedi';

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 dark:bg-slate-950/50 dark:border-emerald-900/30 dark:hover:border-emerald-800/60'
                      : isMissed
                      ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300 dark:bg-slate-950/50 dark:border-rose-900/30 dark:hover:border-rose-800/60'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 dark:bg-slate-950/50 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {formatTurkishDate(session.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-mono text-slate-700 dark:text-slate-400 bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-800">
                        <Clock className="w-3 h-3" />
                        {session.time_slot}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : isMissed
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                            : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                        }`}
                      >
                        {session.status}
                      </span>

                      {/* Send card button */}
                      <button
                        onClick={() => handleSendCard(session)}
                        className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Bu seansın WhatsApp özet kartını gönder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="mt-2.5">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {session.topic || 'Genel Değerlendirme'}
                    </h4>
                  </div>

                  {/* Action Items / Goal */}
                  {session.action_items && (
                    <div className="mt-2 p-2 rounded bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                        🎯 Haftalık Hedefler & Ödev:
                      </span>
                      {session.action_items}
                    </div>
                  )}

                  {/* Tags */}
                  {session.tags && session.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {session.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                        >
                          <Tag className="w-2.5 h-2.5" />
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
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
