import React, { useState } from 'react';
import { MessageSquare, Copy, Check, ExternalLink, Calendar, Send, Sparkles } from 'lucide-react';
import { Session, Student } from '../types';
import { formatTurkishDate } from '../lib/storage';
import {
  generateModernCardBroadcastText,
  generateWeeklyScheduleBroadcastText,
  copyToClipboard,
  getWhatsAppUniversalUrl,
} from '../lib/whatsapp';

export interface CalendarDayInfo {
  date: string;
  dayName: string;
  shortDayName: string;
  dayNumber: number;
  isToday?: boolean;
}

interface CalendarBottomWhatsAppBarProps {
  days: CalendarDayInfo[];
  selectedDate: string;
  sessions: Session[];
  students: Student[];
  counselorName?: string;
  onOpenBroadcast: (date?: string) => void;
  onSelectDate?: (date: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  viewMode?: 'daily' | 'weekly';
}

export function CalendarBottomWhatsAppBar({
  days,
  selectedDate,
  sessions,
  students,
  counselorName,
  onOpenBroadcast,
  onSelectDate,
  onShowToast,
  viewMode = 'weekly',
}: CalendarBottomWhatsAppBarProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fast 1-click clipboard copy
  const handleFastCopy = async (targetDate: string, isWeekly = false) => {
    let text = '';
    if (isWeekly) {
      text = generateWeeklyScheduleBroadcastText(selectedDate, sessions, students, counselorName);
    } else {
      const daySlots = sessions.filter((s) => s.date === targetDate);
      const hasAssigned = daySlots.some((s) => s.student_id);
      text = generateModernCardBroadcastText(targetDate, daySlots, students, counselorName, {
        onlyAssigned: hasAssigned,
      });
    }

    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(isWeekly ? 'week' : targetDate);
      onShowToast(
        'WhatsApp İlanı Kopyalandı!',
        isWeekly
          ? 'Tüm haftanın seans çizelgesi panoya kopyalandı. WhatsApp grubunuza doğrudan yapıştırabilirsiniz.'
          : `${formatTurkishDate(targetDate)} seansları panoya kopyalandı.`,
        'success'
      );
      setTimeout(() => setCopiedKey(null), 2500);
    } else {
      onOpenBroadcast(targetDate);
    }
  };

  return (
    <div className="sticky bottom-3 z-30 w-full max-w-7xl mx-auto px-2 sm:px-4 py-1 print:hidden select-none pointer-events-none">
      <div className="pointer-events-auto bg-white/95 dark:bg-[#10121a]/95 backdrop-blur-md border border-slate-300 dark:border-white/[0.12] rounded-2xl shadow-xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 transition-all">
        {/* Left: Brand Badge & Weekly Broadcast */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold text-xs shadow-2xs">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">WhatsApp Seans İlanı:</span>
            <span className="sm:hidden">İlan:</span>
          </div>

          {/* Full Week Broadcast Button */}
          <button
            type="button"
            onClick={() => onOpenBroadcast(days[0]?.date || selectedDate)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
            title="Tüm haftanın WhatsApp seans duyurusunu hazırla veya düzenle"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>Haftalık İlanı Aç</span>
          </button>
        </div>

        {/* Center: Day Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap overflow-x-auto py-0.5">
          {days.map((day) => {
            const isSelected = day.date === selectedDate;
            const daySessions = sessions.filter((s) => s.date === day.date);
            const filledCount = daySessions.filter((s) => s.student_id).length;
            const totalCount = daySessions.length;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  if (onSelectDate) onSelectDate(day.date);
                  onOpenBroadcast(day.date);
                }}
                className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 shadow-xs'
                    : 'bg-slate-50 hover:bg-emerald-50 text-slate-900 hover:text-emerald-900 border-slate-300 hover:border-emerald-300 dark:bg-[#181a24] dark:hover:bg-[#1e2230] dark:text-zinc-200 dark:hover:text-emerald-300 dark:border-white/[0.08]'
                }`}
                title={`${day.dayName} (${day.date}) WhatsApp İlanını Aç`}
              >
                <span className="font-semibold">{day.shortDayName}</span>
                <span className="font-mono text-[11px] opacity-80">{day.dayNumber}</span>
                {totalCount > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1 py-0.2 rounded font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : filledCount > 0
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-white/[0.08] dark:text-zinc-400'
                    }`}
                  >
                    {filledCount}/{totalCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: 1-Click Fast Copy & WhatsApp Direct */}
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={() => handleFastCopy(selectedDate, false)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-2xs ${
              copiedKey === selectedDate
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#181a24] dark:hover:bg-[#202432] dark:text-zinc-200 border-slate-300 dark:border-white/[0.08]'
            }`}
            title="Seçili günün WhatsApp ilanını panoya kopyala"
          >
            {copiedKey === selectedDate ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
            )}
            <span className="hidden sm:inline">
              {copiedKey === selectedDate ? 'Kopyalandı!' : '1 Tıkla Kopyala'}
            </span>
            <span className="sm:hidden">
              {copiedKey === selectedDate ? 'Kopyalandı' : 'Kopyala'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
