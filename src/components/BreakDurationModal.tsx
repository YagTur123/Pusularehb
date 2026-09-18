import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Clock,
  Utensils,
  X,
  Check,
  ArrowRight,
  Sparkles,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Session } from '../types';
import { addMinutesToTime, shiftTimeSlotString } from '../lib/storage';

export function getBreakMinutes(session: Session, nextSession?: Session): number {
  if (session.break_duration && session.break_duration > 0) {
    return session.break_duration;
  }
  const text = `${session.break_title || ''} ${session.topic || ''}`;
  const match = text.match(/(\d+)\s*(dk|dakika|min)/i);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (nextSession && session.time_slot && nextSession.time_slot) {
    try {
      const getSlotStart = (slot: string) => {
        const startStr = slot.includes('-') ? slot.split('-')[0].trim() : slot.trim();
        const [h, m] = startStr.split(':').map(Number);
        return h * 60 + m;
      };
      const diff = getSlotStart(nextSession.time_slot) - getSlotStart(session.time_slot);
      if (diff > 0 && diff <= 180) {
        return diff;
      }
    } catch (_) {}
  }
  const isLunch =
    session.break_title?.toLowerCase().includes('öğle') ||
    session.topic?.toLowerCase().includes('öğle');
  return isLunch ? 45 : 10;
}

interface BreakDurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  allDateSessions: Session[];
  onSaveBreakDuration: (updatedBreak: Session, shiftedSessions?: Session[]) => void;
}

const PRESET_DURATIONS = [
  { mins: 5, label: '5 dk', desc: 'Hızlı Geçiş / Az Teneffüs' },
  { mins: 10, label: '10 dk', desc: 'Standart Teneffüs' },
  { mins: 15, label: '15 dk', desc: 'Geniş Teneffüs' },
  { mins: 20, label: '20 dk', desc: 'Mola & Çay' },
  { mins: 30, label: '30 dk', desc: 'Uzun Dinlenme' },
  { mins: 45, label: '45 dk', desc: 'Öğle Arası / Yemek' },
];

export function BreakDurationModal({
  isOpen,
  onClose,
  session,
  allDateSessions,
  onSaveBreakDuration,
}: BreakDurationModalProps) {
  if (!isOpen || !session) return null;

  const isLunch =
    session.break_title?.toLowerCase().includes('öğle') ||
    session.topic?.toLowerCase().includes('öğle');

  const currentIndex = allDateSessions.findIndex((s) => s.id === session.id);
  const nextSession = currentIndex !== -1 && currentIndex < allDateSessions.length - 1
    ? allDateSessions[currentIndex + 1]
    : undefined;

  const currentDuration = getBreakMinutes(session, nextSession);

  const [minutes, setMinutes] = useState<number>(currentDuration);
  const [customTitle, setCustomTitle] = useState<string>(
    session.break_title || session.topic || (isLunch ? 'Öğle Arası' : 'Teneffüs')
  );
  const [shiftSubsequent, setShiftSubsequent] = useState<boolean>(true);

  // Sync state whenever open session changes
  useEffect(() => {
    if (session) {
      const d = getBreakMinutes(session, nextSession);
      setMinutes(d);
      setCustomTitle(
        session.break_title || session.topic || (isLunch ? 'Öğle Arası' : 'Teneffüs')
      );
      setShiftSubsequent(true);
    }
  }, [session?.id]);

  const deltaMinutes = minutes - currentDuration;
  const breakStart = session.time_slot.includes('-')
    ? session.time_slot.split('-')[0].trim()
    : session.time_slot.trim();
  const breakEnd = addMinutesToTime(breakStart, minutes);

  const handleSelectPreset = (presetMins: number) => {
    setMinutes(presetMins);
    // Auto-update title if it has previous "X dk" format
    if (customTitle.match(/\d+\s*dk/i) || customTitle.includes('Teneffüs')) {
      if (isLunch) {
        setCustomTitle(`${presetMins} dk Öğle Arası`);
      } else {
        setCustomTitle(`${presetMins} dk Teneffüs`);
      }
    }
  };

  const handleApply = () => {
    const finalMinutes = Math.max(1, Math.min(180, minutes));
    const titleToSave = customTitle.trim() || `${finalMinutes} dk Teneffüs`;

    const updatedBreak: Session = {
      ...session,
      break_duration: finalMinutes,
      break_title: titleToSave,
      topic: titleToSave,
    };

    let shiftedSessions: Session[] | undefined;

    if (shiftSubsequent && deltaMinutes !== 0 && currentIndex !== -1) {
      // Shift all sessions that follow this break on this day
      shiftedSessions = allDateSessions.slice(currentIndex + 1).map((s) => ({
        ...s,
        time_slot: shiftTimeSlotString(s.time_slot, deltaMinutes),
      }));
    }

    onSaveBreakDuration(updatedBreak, shiftedSessions);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#181a26] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300/80 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300">
              {isLunch ? <Utensils className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Teneffüs & Mola Süresi Ayarla
              </h2>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-mono">
                Başlangıç: {session.time_slot} | Mevcut: {currentDuration} dakika
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
              Hızlı Süre Seçenekleri
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((preset) => {
                const isSelected = minutes === preset.mins;
                return (
                  <button
                    key={preset.mins}
                    type="button"
                    onClick={() => handleSelectPreset(preset.mins)}
                    className={`p-2 rounded-xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-white font-bold border-amber-500 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-800 dark:text-zinc-200 border-slate-200/80 dark:border-white/[0.06]'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">{preset.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-amber-100' : 'text-slate-500 dark:text-zinc-400'
                      }`}
                    >
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stepper / Custom Minute Input */}
          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  Özel Dakika Belirleyin
                </label>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Dilediğiniz dakika sayısını yazabilir veya butonlarla ayarlayabilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMinutes((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  title="1 dakika azalt"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={minutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setMinutes(Math.max(1, Math.min(180, val)));
                      }
                    }}
                    className="w-16 h-8 text-center text-sm font-bold font-mono bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                  <span className="absolute right-1 text-[10px] font-bold text-slate-400 pointer-events-none">
                    dk
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMinutes((prev) => Math.min(180, prev + 1))}
                  className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                  title="1 dakika artır"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1">
              Teneffüs Başlığı / Açıklaması
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Örn: 5 dk Teneffüs, Kısa Mola, vb."
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Time Shift Option & Dynamic Preview */}
          <div className="rounded-xl border border-amber-200/90 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/15 p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={shiftSubsequent}
                onChange={(e) => setShiftSubsequent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  Sonraki seans saatlerini otomatik kaydır (Önerilen)
                </span>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  Teneffüs kısaldığında sonraki seanslar öne çekilir, uzadığında ileri alınır. Boşluk ve çakışma yaşanmaz.
                </p>
              </div>
            </label>

            {/* Visual Time Flow Indicator */}
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-500/20 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{breakStart}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="font-bold text-amber-800 dark:text-amber-300">{breakEnd}</span>
                <span className="text-[10px] text-slate-500">({minutes} dk mola)</span>
              </div>
              {deltaMinutes !== 0 && shiftSubsequent && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    deltaMinutes < 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                  }`}
                >
                  Sonrakiler: {deltaMinutes > 0 ? `+${deltaMinutes}` : deltaMinutes} dk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#141622] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Süreyi Kaydet ve Uygula</span>
          </button>
        </div>
      </div>
    </div>
  );
}
