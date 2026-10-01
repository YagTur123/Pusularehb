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

  // Bug fix: keep viewYear and viewMonth in sync when selectedDate changes from external controls
  React.useEffect(() => {
    if (selectedDate && selectedDate.includes('-')) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [selectedDate]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      role="dialog"
      aria-label="Ay ve Gün Seçici"
      className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg p-3 text-stone-800 dark:text-stone-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
            {TURKISH_MONTHS[viewMonth]} {viewYear}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Önceki Ay"
            title="Önceki Ay"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Sonraki Ay"
            title="Sonraki Ay"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ml-1 cursor-pointer"
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
            className={`text-[11px] font-mono font-medium ${idx >= 5 ? 'text-stone-400 dark:text-stone-500' : 'text-stone-600 dark:text-stone-400'}`}
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
              className={`relative flex flex-col items-center justify-center h-8 rounded text-xs transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-semibold shadow-xs'
                  : d.isToday
                  ? 'bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-white font-medium border border-stone-300 dark:border-stone-700'
                  : d.isCurrentMonth
                  ? 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100'
                  : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600 dark:text-stone-600 dark:hover:bg-stone-900 dark:hover:text-stone-400'
              }`}
            >
              <span>{d.dayNumber}</span>
              {/* Session indicator dot */}
              {sessionCount > 0 && (
                <span
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isSelected
                      ? 'bg-white dark:bg-stone-950'
                      : d.isToday
                      ? 'bg-teal-600 dark:bg-teal-400'
                      : 'bg-teal-500 dark:bg-stone-400'
                  }`}
                  title={`${sessionCount} seans`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer / Quick jump */}
      <div className="mt-3 pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleGoToday}
          className="text-xs text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 font-medium hover:underline cursor-pointer"
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
            className="flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 font-medium transition-colors cursor-pointer"
            title="Seçili günün WhatsApp ilanını aç"
          >
            <MessageSquare className="w-3 h-3" />
            <span>İlan</span>
          </button>
        )}

        <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
          {sessionsByDate.get(selectedDate) || 0} seans
        </span>
      </div>
    </div>
  );
}
