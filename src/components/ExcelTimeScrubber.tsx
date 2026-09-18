import React, { useState, useRef, useEffect } from 'react';
import { shiftTimeSlotString } from '../lib/storage';
import { ArrowLeftRight, MoveVertical } from 'lucide-react';

interface ExcelTimeScrubberProps {
  timeSlot: string;
  onTimeChange: (newTime: string) => void;
  className?: string;
  styleVariant?: 'badge' | 'excel-cell' | 'compact' | 'break';
  disabled?: boolean;
}

export const ExcelTimeScrubber: React.FC<ExcelTimeScrubberProps> = ({
  timeSlot,
  onTimeChange,
  className = '',
  styleVariant = 'badge',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewTime, setPreviewTime] = useState(timeSlot);
  const [deltaMinutes, setDeltaMinutes] = useState(0);
  const [isEditingDirectly, setIsEditingDirectly] = useState(false);
  const [directInput, setDirectInput] = useState(timeSlot);

  const startPos = useRef<{ x: number; y: number } | null>(null);
  const hasMoved = useRef(false);
  const currentDelta = useRef(0);

  useEffect(() => {
    setPreviewTime(timeSlot);
    setDirectInput(timeSlot);
  }, [timeSlot]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isEditingDirectly) return;
    // Don't drag if secondary button
    if (e.button !== 0) return;
    
    e.stopPropagation();
    startPos.current = { x: e.clientX, y: e.clientY };
    hasMoved.current = false;
    currentDelta.current = 0;
    setDeltaMinutes(0);
    setPreviewTime(timeSlot);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!startPos.current) return;
      const dx = moveEvent.clientX - startPos.current.x;
      const dy = moveEvent.clientY - startPos.current.y;
      
      const distance = Math.hypot(dx, dy);
      if (distance > 4) {
        hasMoved.current = true;
        setIsDragging(true);
      }

      if (hasMoved.current) {
        // Horizontal drag or inverted vertical drag (drag right/up = forward in time, drag left/down = backward)
        const primaryDelta = Math.abs(dx) >= Math.abs(dy) ? dx : -dy;
        // Every 12 pixels is 5 minutes
        const steps = Math.round(primaryDelta / 12);
        const mins = steps * 5;
        
        if (mins !== currentDelta.current) {
          currentDelta.current = mins;
          setDeltaMinutes(mins);
          const calculated = shiftTimeSlotString(timeSlot, mins);
          setPreviewTime(calculated);
        }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (hasMoved.current && currentDelta.current !== 0) {
        const finalTime = shiftTimeSlotString(timeSlot, currentDelta.current);
        onTimeChange(finalTime);
      } else if (!hasMoved.current) {
        // Quick click -> allow direct input
        setIsEditingDirectly(true);
      }

      setIsDragging(false);
      startPos.current = null;
      hasMoved.current = false;
      currentDelta.current = 0;
      setDeltaMinutes(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isEditingDirectly || e.touches.length !== 1) return;
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    hasMoved.current = false;
    currentDelta.current = 0;
    setDeltaMinutes(0);
    setPreviewTime(timeSlot);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!startPos.current || moveEvent.touches.length !== 1) return;
      const touchMove = moveEvent.touches[0];
      const dx = touchMove.clientX - startPos.current.x;
      const dy = touchMove.clientY - startPos.current.y;
      
      const distance = Math.hypot(dx, dy);
      if (distance > 6) {
        hasMoved.current = true;
        setIsDragging(true);
        moveEvent.preventDefault(); // Prevent page scroll during scrub
      }

      if (hasMoved.current) {
        const primaryDelta = Math.abs(dx) >= Math.abs(dy) ? dx : -dy;
        const steps = Math.round(primaryDelta / 12);
        const mins = steps * 5;
        
        if (mins !== currentDelta.current) {
          currentDelta.current = mins;
          setDeltaMinutes(mins);
          const calculated = shiftTimeSlotString(timeSlot, mins);
          setPreviewTime(calculated);
        }
      }
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      if (hasMoved.current && currentDelta.current !== 0) {
        const finalTime = shiftTimeSlotString(timeSlot, currentDelta.current);
        onTimeChange(finalTime);
      }

      setIsDragging(false);
      startPos.current = null;
      hasMoved.current = false;
      currentDelta.current = 0;
      setDeltaMinutes(0);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleDirectSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (directInput.trim() && directInput.trim() !== timeSlot) {
      onTimeChange(directInput.trim());
    }
    setIsEditingDirectly(false);
  };

  if (isEditingDirectly) {
    return (
      <form
        onSubmit={handleDirectSubmit}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center"
      >
        <input
          type="text"
          autoFocus
          value={directInput}
          onChange={(e) => setDirectInput(e.target.value)}
          onBlur={() => handleDirectSubmit()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDirectInput(timeSlot);
              setIsEditingDirectly(false);
            }
          }}
          className="w-16 px-1 py-0.5 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-2 border-emerald-500 rounded text-slate-900 dark:text-zinc-100 outline-none shadow-xs text-center"
        />
      </form>
    );
  }

  // Base styling per variant
  let variantStyles = 'bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-zinc-200 border-slate-300 dark:border-white/[0.08]';
  if (styleVariant === 'excel-cell') {
    variantStyles = 'bg-transparent text-slate-900 dark:text-zinc-100 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20';
  } else if (styleVariant === 'break') {
    variantStyles = 'bg-amber-200/90 text-amber-950 dark:bg-amber-500/25 dark:text-amber-200 border-amber-300 dark:border-amber-500/40';
  }

  return (
    <div className="relative inline-flex items-center select-none group/scrub">
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        title="Basılı tut ve sağa/sola sürükleyerek saati kaydır (Excel gibi)"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold border cursor-ew-resize active:cursor-grabbing transition-all ${variantStyles} ${
          isDragging
            ? 'ring-2 ring-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-md scale-105 z-30'
            : 'hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400'
        } ${className}`}
      >
        <span>{isDragging ? previewTime : timeSlot}</span>
        
        {/* Excel-style little drag indicator */}
        <ArrowLeftRight className="w-2.5 h-2.5 opacity-40 group-hover/scrub:opacity-90 transition-opacity text-slate-500 dark:text-zinc-400 shrink-0" />
      </div>

      {/* Floating Scrub Tooltip / HUD while dragging */}
      {isDragging && (
        <div className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-12 px-2.5 py-1 bg-slate-900 dark:bg-[#0d0f17] text-white text-xs font-mono font-bold rounded-lg shadow-2xl border border-emerald-500 flex items-center gap-1.5 whitespace-nowrap animate-in fade-in zoom-in-95 duration-75">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-300">{previewTime}</span>
          <span className={`text-[10px] px-1 py-0.2 rounded ${deltaMinutes >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
            {deltaMinutes >= 0 ? `+${deltaMinutes} dk` : `${deltaMinutes} dk`}
          </span>
          <span className="text-[9px] text-zinc-400 font-sans font-normal ml-0.5">
            Bırakınca kaydeder
          </span>
        </div>
      )}
    </div>
  );
};
