import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, MessageSquare } from 'lucide-react';
import { getMonthDays, getTodayDateString } from '../lib/storage';
import { Session } from '../types';

interface CalendarMonthPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
  sessions: Session[];
  onOpenBroadcast?: (date: string) => void;
}

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const WEEKDAY_HEADERS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

export function CalendarMonthPicker({
  selectedDate,
  onSelectDate,
  onClose,
  sessions,
  onOpenBroadcast,
}: CalendarMonthPickerProps) {
  const [selectedY, selectedM] = selectedDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState(selectedY || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState((selectedM ? selectedM - 1 : new Date().getMonth()));

  const todayStr = getTodayDateString();
  const monthDays = getMonthDays(viewYear, viewMonth);

  // Map session counts by date
  const sessionsByDate = new Map<string, number>();
  sessions.forEach((s) => {
    sessionsByDate.set(s.date, (sessionsByDate.get(s.date) || 0) + 1);
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDate(todayStr);
    onClose();
  };

  return (
    <div 
      className="absolute top-full left-0 mt-2 z-50 w-72 bg-[#0c0d13] border border-white/[0.12] rounded-xl shadow-2xl p-3.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-white">
            {TURKISH_MONTHS[viewMonth]} {viewYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Önceki Ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Sonraki Ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors ml-1 cursor-pointer"
            title="Kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {WEEKDAY_HEADERS.map((day, idx) => (
          <span 
            key={day} 
            className={`text-[11px] font-mono font-medium ${idx >= 5 ? 'text-zinc-500' : 'text-zinc-400'}`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Calendar days grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((d) => {
          const isSelected = d.date === selectedDate;
          const sessionCount = sessionsByDate.get(d.date) || 0;

          return (
            <button
              key={d.date}
              type="button"
              onClick={() => {
                onSelectDate(d.date);
                onClose();
              }}
              className={`relative flex flex-col items-center justify-center h-8 rounded text-xs transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : d.isToday
                  ? 'bg-zinc-800 text-white font-semibold border border-zinc-500/50'
                  : d.isCurrentMonth
                  ? 'text-zinc-200 hover:bg-zinc-800/80 hover:text-white'
                  : 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400'
              }`}
            >
              <span>{d.dayNumber}</span>
              {/* Session indicator dot */}
              {sessionCount > 0 && (
                <span
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isSelected
                      ? 'bg-zinc-950'
                      : d.isToday
                      ? 'bg-emerald-400'
                      : 'bg-zinc-400'
                  }`}
                  title={`${sessionCount} seans`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Quick jump */}
      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleGoToday}
          className="text-xs text-zinc-400 hover:text-white font-medium hover:underline cursor-pointer"
        >
          Bugüne Git
        </button>

        {onOpenBroadcast && (
          <button
            type="button"
            onClick={() => {
              onOpenBroadcast(selectedDate);
              onClose();
            }}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
            title="Seçili günün WhatsApp ilanını aç"
          >
            <MessageSquare className="w-3 h-3" />
            <span>İlan</span>
          </button>
        )}

        <span className="text-[11px] text-zinc-500 font-mono">
          {sessionsByDate.get(selectedDate) || 0} seans
        </span>
      </div>
    </div>
  );
}
