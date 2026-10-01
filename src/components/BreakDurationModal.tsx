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
  const isLunch = Boolean(
    session?.break_title?.toLowerCase().includes('öğle') ||
    session?.topic?.toLowerCase().includes('öğle')
  );

  const currentIndex = session ? allDateSessions.findIndex((s) => s.id === session.id) : -1;
  const nextSession =
    currentIndex !== -1 && currentIndex < allDateSessions.length - 1
      ? allDateSessions[currentIndex + 1]
      : undefined;

  const currentDuration = session ? getBreakMinutes(session, nextSession) : 10;

  const [minutes, setMinutes] = useState<number>(currentDuration);
  const [customTitle, setCustomTitle] = useState<string>(
    session?.break_title || session?.topic || (isLunch ? 'Öğle Arası' : 'Teneffüs')
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-duration-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg overflow-hidden flex flex-col text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
              {isLunch ? <Utensils className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="break-duration-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                Teneffüs & Mola Süresi
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                Başlangıç: {session.time_slot} | Mevcut: {currentDuration} dk
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
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
                    className={`p-2 rounded-md text-left transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-600 text-white font-medium border-amber-600 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <div className="text-xs font-semibold font-mono">{preset.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isSelected ? 'text-amber-100' : 'text-stone-500 dark:text-stone-400'
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
          <div className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-md p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-900 dark:text-stone-100">
                  Özel Dakika Belirleyin
                </label>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Dilediğiniz dakika sayısını yazabilir veya butonlarla ayarlayabilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setMinutes((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer transition-colors"
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
                    className="w-16 h-8 text-center text-sm font-semibold font-mono bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-white focus:border-stone-500 focus:outline-hidden"
                  />
                  <span className="absolute right-1 text-[10px] font-medium text-stone-400 pointer-events-none">
                    dk
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMinutes((prev) => Math.min(180, prev + 1))}
                  className="w-8 h-8 rounded bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer transition-colors"
                  title="1 dakika artır"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
              Teneffüs Başlığı / Açıklaması
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Örn: 5 dk Teneffüs, Kısa Mola, vb."
              className="w-full px-3 py-2 text-xs rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:border-stone-500 focus:outline-hidden"
            />
          </div>

          {/* Time Shift Option & Dynamic Preview */}
          <div className="rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={shiftSubsequent}
                onChange={(e) => setShiftSubsequent(e.target.checked)}
                className="mt-0.5 rounded border-stone-300 text-amber-600 focus:ring-0 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  Sonraki seans saatlerini otomatik kaydır (Önerilen)
                </span>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                  Teneffüs kısaldığında sonraki seanslar öne çekilir, uzadığında ileri alınır. Boşluk ve çakışma yaşanmaz.
                </p>
              </div>
            </label>

            {/* Visual Time Flow Indicator */}
            <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span>{breakStart}</span>
                <ArrowRight className="w-3 h-3 text-stone-400" />
                <span className="font-semibold text-amber-800 dark:text-amber-300">{breakEnd}</span>
                <span className="text-[10px] text-stone-500">({minutes} dk mola)</span>
              </div>
              {deltaMinutes !== 0 && shiftSubsequent && (
                <span
                  className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                    deltaMinutes < 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-300'
                  }`}
                >
                  Sonrakiler: {deltaMinutes > 0 ? `+${deltaMinutes}` : deltaMinutes} dk
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-md text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Süreyi Kaydet ve Uygula</span>
          </button>
        </div>
      </div>
    </div>
  );
}
