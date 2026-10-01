import React, { useState, useEffect } from 'react';
import { Session, Student, SessionFeedback } from '../types';
import {
  CheckCircle2,
  XCircle,
  Star,
  Clock,
  User as UserIcon,
  MessageSquare,
  Sparkles,
  X,
  Calendar,
  AlertCircle,
  Send,
  FileText,
} from 'lucide-react';
import { formatTurkishDate } from '../lib/storage';

interface SessionFeedbackModalProps {
  session: Session;
  student?: Student;
  initialStatus: 'Geldi' | 'Gelmedi';
  onSaveFeedback: (session: Session, feedback: SessionFeedback) => void;
  onSkipFeedback: (session: Session, status: 'Geldi' | 'Gelmedi') => void;
  onClose: () => void;
}

export function SessionFeedbackModal({
  session,
  student,
  initialStatus,
  onSaveFeedback,
  onSkipFeedback,
  onClose,
}: SessionFeedbackModalProps) {
  const [status, setStatus] = useState<'Geldi' | 'Gelmedi'>(initialStatus);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Geldi fields
  const [rating, setRating] = useState<number>(session.feedback?.rating || 5);
  const [efficiency, setEfficiency] = useState<'Çok Verimli' | 'Verimli' | 'Orta' | 'Düşük Verim'>(
    session.feedback?.efficiency || 'Çok Verimli'
  );
  const [notes, setNotes] = useState<string>(
    session.feedback?.notes || session.action_items || ''
  );
  const [nextStep, setNextStep] = useState<string>(
    session.feedback?.next_step || ''
  );

  // Gelmedi fields
  const [reason, setReason] = useState<
    'Mazeretli' | 'Hastalık' | 'Unuttu' | 'İletişim Kurulamadı' | 'Diğer'
  >(session.feedback?.reason || 'Mazeretli');
  const [parentNotified, setParentNotified] = useState<boolean>(
    session.feedback?.parent_notified ?? true
  );
  const [makeupPlanned, setMakeupPlanned] = useState<boolean>(
    session.feedback?.makeup_session_planned ?? false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const feedback: SessionFeedback = {
      status,
      submitted_at: new Date().toISOString(),
      ...(status === 'Geldi'
        ? {
            rating,
            efficiency,
            notes: notes.trim(),
            next_step: nextStep.trim(),
          }
        : {
            reason,
            parent_notified: parentNotified,
            makeup_session_planned: makeupPlanned,
            notes: notes.trim(),
          }),
    };

    onSaveFeedback(session, feedback);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg overflow-hidden text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Student and Status Badges */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium">
                  {session.time_slot}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {formatTurkishDate(session.date)}
                </span>
              </div>
              <h2 id="feedback-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-1 flex items-center gap-2">
                <span>{student ? student.full_name : 'Bilinmeyen Öğrenci'}</span>
                {student && (
                  <span className="text-xs font-normal text-stone-500 dark:text-stone-400">
                    ({student.class_grade})
                  </span>
                )}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Selection Switcher */}
          <div className="mt-3 flex items-center gap-2 p-1 bg-stone-200/80 dark:bg-stone-900 rounded-md">
            <button
              type="button"
              onClick={() => setStatus('Geldi')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                status === 'Geldi'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>GELDİ (Tamamlandı)</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('Gelmedi')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                status === 'Gelmedi'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>GELMEDİ (Katılmadı)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {status === 'Geldi' ? (
            <>
              {/* Efficiency Pills */}
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Görüşme Verimliliği:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    ['Çok Verimli', 'Verimli', 'Orta', 'Düşük Verim'] as const
                  ).map((eff) => (
                    <button
                      key={eff}
                      type="button"
                      onClick={() => setEfficiency(eff)}
                      className={`py-1.5 px-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                        efficiency === eff
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      {eff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Memnuniyet / İlerleme Skoru:
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-stone-300 hover:text-amber-500 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300 dark:text-stone-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono text-xs font-medium text-stone-700 dark:text-stone-300">
                    {rating} / 5 Yıldız
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Öğrenci Geri Bildirimi & Seans Notu:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Öğrencinin motivasyonu, anlaşılan konular, deneme analizi veya rehberlik teşhis notları..."
                  className="w-full p-2.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-stone-500 focus:outline-hidden text-xs"
                />
              </div>

              {/* Next Step / Action */}
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Sonraki Seans Hedefi / Ödev:
                </label>
                <input
                  type="text"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="Örn: Haftalık 300 AYT Matematik sorusu, 2 TYT Denemesi"
                  className="w-full p-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-stone-500 focus:outline-hidden text-xs"
                />
              </div>
            </>
          ) : (
            <>
              {/* Reason Pills */}
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Gelmeme Nedeni:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'Mazeretli',
                      'Hastalık',
                      'Unuttu',
                      'İletişim Kurulamadı',
                      'Diğer',
                    ] as const
                  ).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`py-1.5 px-2 rounded-md border text-xs font-medium text-center transition-colors cursor-pointer ${
                        reason === r
                          ? 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-md bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                  <span className="block font-medium text-stone-800 dark:text-stone-200 mb-2">
                    Veli Bilgilendirildi mi?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setParentNotified(true)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        parentNotified
                          ? 'bg-emerald-700 text-white'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      Evet
                    </button>
                    <button
                      type="button"
                      onClick={() => setParentNotified(false)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        !parentNotified
                          ? 'bg-rose-700 text-white'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      Hayır
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-md bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                  <span className="block font-medium text-stone-800 dark:text-stone-200 mb-2">
                    Telafi Seansı Planlanacak mı?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMakeupPlanned(true)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        makeupPlanned
                          ? 'bg-teal-700 text-white'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      Evet
                    </button>
                    <button
                      type="button"
                      onClick={() => setMakeupPlanned(false)}
                      className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                        !makeupPlanned
                          ? 'bg-stone-700 text-white dark:bg-stone-700'
                          : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      Gerek Yok
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes for Gelmedi */}
              <div>
                <label className="block font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Mazeret Notu / Veli Açıklaması:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Veliyle görüşüldü, yarın telafi randevusu ayarlanacak..."
                  className="w-full p-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-stone-500 focus:outline-hidden text-xs"
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => onSkipFeedback(session, status)}
              className="px-3 py-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors cursor-pointer text-xs"
            >
              Formu Atla (Sadece Durumu Değiştir)
            </button>

            <button
              type="submit"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-white font-medium text-xs shadow-xs transition-colors cursor-pointer ${
                status === 'Geldi'
                  ? 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Geri Bildirimi Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
