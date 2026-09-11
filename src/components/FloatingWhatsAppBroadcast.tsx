import React, { useState } from 'react';
import { MessageSquare, Copy, Check, ExternalLink, Calendar, ChevronUp, Send } from 'lucide-react';
import { Session, Student } from '../types';
import { formatTurkishDate } from '../lib/storage';
import { generateModernCardBroadcastText, copyToClipboard, getWhatsAppUniversalUrl } from '../lib/whatsapp';

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

  const allDateSlots = sessions.filter((s) => s.date === selectedDate);
  const assignedSessions = allDateSlots.filter((s) => s.student_id);
  const hasAssigned = assignedSessions.length > 0;
  const sessionCount = hasAssigned ? assignedSessions.length : allDateSlots.length;

  const currentBroadcastText = generateModernCardBroadcastText(
    selectedDate,
    allDateSlots,
    students,
    counselorName,
    { onlyAssigned: hasAssigned }
  );

  const handleFastCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(currentBroadcastText);
    if (success) {
      setIsCopied(true);
      onShowToast(
        'WhatsApp İlanı Kopyalandı!',
        `${formatTurkishDate(selectedDate)} seans programı panoya alındı. WhatsApp grubunuza doğrudan yapıştırabilirsiniz.`,
        'success'
      );
      setTimeout(() => setIsCopied(false), 2500);
    } else {
      onOpenBroadcast(selectedDate);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 print:hidden select-none">
      {/* Quick Menu Popover when opened via caret */}
      {showQuickMenu && (
        <div 
          className="bg-white dark:bg-[#0c0e15] border border-slate-200 dark:border-white/[0.12] rounded-xl shadow-2xl p-2.5 w-68 space-y-1.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs text-slate-700 dark:text-zinc-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-zinc-400">
            <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{formatTurkishDate(selectedDate)}</span>
            </span>
            <span className="font-mono text-[10px] text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-white/[0.08] px-1.5 py-0.5 rounded font-semibold">
              {hasAssigned ? `${sessionCount} Seans` : allDateSlots.length > 0 ? `${allDateSlots.length} Boş Saat` : '0 Seans'}
            </span>
          </div>

          {/* Direct WhatsApp Send Link */}
          <a
            href={getWhatsAppUniversalUrl(currentBroadcastText)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              copyToClipboard(currentBroadcastText);
              setShowQuickMenu(false);
              onShowToast('WhatsApp Açılıyor', 'İlan metni aynı zamanda panoya kopyalandı.', 'success');
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 transition-colors cursor-pointer text-left font-medium"
          >
            <div className="flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>WhatsApp İle Paylaş</span>
            </div>
            <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          </a>

          <button
            type="button"
            onClick={() => {
              setShowQuickMenu(false);
              onOpenBroadcast(selectedDate);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500 dark:text-emerald-400" />
              <span>İlanı Özelleştir & Tablo Formatı</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Detaylı</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              handleFastCopy(e);
              setShowQuickMenu(false);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Metni Hızlı Kopyala</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">1-Tık</span>
          </button>
        </div>
      )}

      {/* Floating Action Button (FAB) Dock */}
      <div className="flex items-center bg-white/95 dark:bg-[#090b10]/95 hover:bg-slate-50 dark:hover:bg-[#0d1017] border border-emerald-600/30 dark:border-emerald-500/30 hover:border-emerald-600/60 dark:hover:border-emerald-500/60 rounded-full shadow-2xl backdrop-blur-md p-1 pl-3.5 transition-all duration-200 group">
        {/* Main Click to Open Broadcast Modal */}
        <button
          type="button"
          onClick={() => onOpenBroadcast(selectedDate)}
          className="flex items-center gap-2.5 py-1.5 pr-2 text-xs font-medium text-slate-800 dark:text-zinc-100 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
          title={`${formatTurkishDate(selectedDate)} için WhatsApp Seans İlanını Aç`}
        >
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-4 h-4 fill-emerald-500/20 dark:fill-emerald-400/20" />
            </div>
            {sessionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 font-bold text-[9px] rounded-full flex items-center justify-center shadow-xs">
                {sessionCount}
              </span>
            )}
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              WhatsApp İlanı
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                {formatTurkishDate(selectedDate).split(' ')[0]} {formatTurkishDate(selectedDate).split(' ')[1]}
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
              {hasAssigned
                ? `${assignedSessions.length} seans hazır`
                : allDateSlots.length > 0
                ? `${allDateSlots.length} saat müsait`
                : 'Seans programı hazırla'}
            </span>
          </div>
        </button>

        {/* Separator */}
        <div className="w-px h-5 bg-slate-200 dark:bg-white/[0.1] my-auto" />

        {/* Fast Copy Icon Button */}
        <button
          type="button"
          onClick={handleFastCopy}
          className={`p-2 rounded-full transition-all cursor-pointer ${
            isCopied
              ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950'
              : 'hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
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
          className="p-1.5 pr-2 rounded-full text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Diğer Seçenekler (Hızlı Gönder & Özelleştir)"
        >
          <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-150 ${showQuickMenu ? 'rotate-180 text-slate-900 dark:text-white' : ''}`} />
        </button>
      </div>
    </div>
  );
}
