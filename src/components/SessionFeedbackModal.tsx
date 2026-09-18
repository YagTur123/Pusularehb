import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#12141e] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Student and Status Badges */}
        <div className="p-5 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#161826]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold">
                  {session.time_slot}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  {formatTurkishDate(session.date)}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <span>{student ? student.full_name : 'Bilinmeyen Öğrenci'}</span>
                {student && (
                  <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">
                    ({student.class_grade})
                  </span>
                )}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Selection Switcher */}
          <div className="mt-4 flex items-center gap-2 p-1 bg-slate-200/80 dark:bg-black/40 rounded-xl">
            <button
              type="button"
              onClick={() => setStatus('Geldi')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                status === 'Geldi'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>GELDI (Tamamlandı)</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('Gelmedi')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                status === 'Gelmedi'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>GELMEDI (Katılmadı)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {status === 'Geldi' ? (
            <>
              {/* Efficiency Pills */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
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
                      className={`py-2 px-2.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                        efficiency === eff
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500'
                          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#151722] text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {eff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Memnuniyet / İlerleme Skoru:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 dark:text-zinc-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-mono text-xs font-bold text-slate-700 dark:text-zinc-300">
                    {rating} / 5 Yıldız
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Öğrenci Geri Bildirimi & Seans Notu:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Öğrencinin motivasyonu, anlaşılan konular, deneme analizi veya rehberlik teşhis notları..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0d14] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              {/* Next Step / Action */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Sonraki Seans Hedefi / Ödev:
                </label>
                <input
                  type="text"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="Örn: Haftalık 300 AYT Matematik sorusu, 2 TYT Denemesi"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0d14] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </>
          ) : (
            <>
              {/* Reason Pills */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
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
                      className={`py-2 px-2.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                        reason === r
                          ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500'
                          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#151722] text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0e1018] border border-slate-200 dark:border-white/[0.06]">
                  <span className="block font-semibold text-slate-800 dark:text-zinc-200 mb-2">
                    Veli Bilgilendirildi mi?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setParentNotified(true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        parentNotified
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Evet
                    </button>
                    <button
                      type="button"
                      onClick={() => setParentNotified(false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !parentNotified
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Hayır
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0e1018] border border-slate-200 dark:border-white/[0.06]">
                  <span className="block font-semibold text-slate-800 dark:text-zinc-200 mb-2">
                    Telafi Seansı Planlanacak mı?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMakeupPlanned(true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        makeupPlanned
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Evet
                    </button>
                    <button
                      type="button"
                      onClick={() => setMakeupPlanned(false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !makeupPlanned
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      Gerek Yok
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes for Gelmedi */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Mazeret Notu / Veli Açıklaması:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Veliyle görüşüldü, yarın telafi randevusu ayarlanacak..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0d14] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => onSkipFeedback(session, status)}
              className="px-3 py-2 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-xs"
            >
              Formu Atla (Sadece Durumu Değiştir)
            </button>

            <button
              type="submit"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer ${
                status === 'Geldi'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
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
