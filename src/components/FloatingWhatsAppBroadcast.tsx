import React, { useState } from 'react';
import { MessageSquare, Copy, Check, ExternalLink, Calendar, ChevronUp, Zap } from 'lucide-react';
import { Session, Student } from '../types';
import { formatTurkishDate } from '../lib/storage';
import { generateModernCardBroadcastText } from '../lib/whatsapp';

interface FloatingWhatsAppBroadcastProps {
  selectedDate: string;
  sessions: Session[];
  students: Student[];
  counselorName?: string;
  onOpenBroadcast: (date?: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function FloatingWhatsAppBroadcast({
  selectedDate,
  sessions,
  students,
  counselorName,
  onOpenBroadcast,
  onShowToast,
}: FloatingWhatsAppBroadcastProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const dateSessions = sessions.filter((s) => s.date === selectedDate && s.student_id);
  const sessionCount = dateSessions.length;

  const handleFastCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const text = generateModernCardBroadcastText(selectedDate, dateSessions, students, counselorName);
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      onShowToast(
        'WhatsApp İlanı Kopyalandı!',
        `${formatTurkishDate(selectedDate)} seans programı panoya alındı.`,
        'success'
      );
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      onOpenBroadcast(selectedDate);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 print:hidden select-none">
      {/* Quick Menu Popover when opened via caret */}
      {showQuickMenu && (
        <div 
          className="bg-[#0c0e15] border border-white/[0.12] rounded-xl shadow-2xl p-2.5 w-64 space-y-1.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06] text-zinc-400">
            <span className="font-medium text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{formatTurkishDate(selectedDate)}</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.06] px-1.5 py-0.2 rounded">
              {sessionCount} Seans
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowQuickMenu(false);
              onOpenBroadcast(selectedDate);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>İlanı Özelleştir & Gönder</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Detaylı</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              handleFastCopy(e);
              setShowQuickMenu(false);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/[0.06] text-zinc-200 hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Günün İlanını Hızlı Kopyala</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono">1-Tık</span>
          </button>
        </div>
      )}

      {/* Floating Action Button (FAB) Dock */}
      <div className="flex items-center bg-[#090b10]/95 hover:bg-[#0d1017] border border-emerald-500/30 hover:border-emerald-500/60 rounded-full shadow-2xl backdrop-blur-md p-1 pl-3.5 transition-all duration-200 group">
        {/* Main Click to Open Broadcast Modal */}
        <button
          type="button"
          onClick={() => onOpenBroadcast(selectedDate)}
          className="flex items-center gap-2.5 py-1.5 pr-2 text-xs font-medium text-zinc-100 hover:text-white transition-colors cursor-pointer"
          title={`${formatTurkishDate(selectedDate)} için WhatsApp Seans İlanını Aç`}
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4 fill-emerald-400/20" />
            </div>
            {sessionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-zinc-950 font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                {sessionCount}
              </span>
            )}
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-white flex items-center gap-1.5">
              WhatsApp İlanı
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                {formatTurkishDate(selectedDate).split(' ')[0]} {formatTurkishDate(selectedDate).split(' ')[1]}
              </span>
            </span>
            <span className="text-[10px] text-zinc-400 leading-tight">
              {sessionCount > 0 ? `${sessionCount} seans planlı` : 'Seans programı hazırla'}
            </span>
          </div>
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-white/[0.1] my-auto" />

        {/* Fast Copy Icon Button */}
        <button
          type="button"
          onClick={handleFastCopy}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            isCopied
              ? 'bg-emerald-500 text-zinc-950'
              : 'hover:bg-white/[0.08] text-zinc-400 hover:text-white'
          }`}
          title="Tek tıkla panoya kopyala"
        >
          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Quick Menu Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowQuickMenu(!showQuickMenu);
          }}
          className="p-1.5 pr-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Diğer Seçenekler"
        >
          <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-150 ${showQuickMenu ? 'rotate-180 text-white' : ''}`} />
        </button>
      </div>
    </div>
  );
}
