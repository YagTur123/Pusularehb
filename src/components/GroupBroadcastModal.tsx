import React, { useState, useEffect, useMemo } from 'react';
import { Session, Student } from '../types';
import {
  X,
  Copy,
  ExternalLink,
  MessageSquare,
  Check,
  List,
  Table,
  LayoutList,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import {
  generateGroupBroadcastText,
  generateModernCardBroadcastText,
  generateSimpleListBroadcastText,
  generateParentNotificationText,
  generateWeeklyScheduleBroadcastText,
  getWhatsAppWebShareUrl,
  getWhatsAppDirectUrl,
  getWhatsAppUniversalUrl,
  copyToClipboard,
} from '../lib/whatsapp';
import { formatTurkishDate, shiftDateString, getWeekDays } from '../lib/storage';

interface GroupBroadcastModalProps {
  date: string;
  allSessions: Session[];
  students: Student[];
  counselorName?: string;
  onClose: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

type BroadcastFormat = 'cards' | 'table' | 'list' | 'weekly' | 'parent';

export function GroupBroadcastModal({
  date: initialDate,
  allSessions,
  students,
  counselorName,
  onClose,
  onShowToast,
}: GroupBroadcastModalProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [formatMode, setFormatMode] = useState<BroadcastFormat>('cards');
  const [includeTags, setIncludeTags] = useState(true);
  const [includeCounselor, setIncludeCounselor] = useState(true);
  const [onlyAssigned, setOnlyAssigned] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isCustomEdited, setIsCustomEdited] = useState(false);

  // Filter sessions for selected date
  const dateSessions = useMemo(() => {
    return allSessions.filter((s) => s.date === selectedDate);
  }, [allSessions, selectedDate]);

  const weekDays = useMemo(() => getWeekDays(selectedDate, false), [selectedDate]);

  // Generate text when parameters change (unless manually typed by user)
  useEffect(() => {
    const opts = { includeTags, includeCounselor, onlyAssigned };
    let text = '';

    if (formatMode === 'cards') {
      text = generateModernCardBroadcastText(selectedDate, dateSessions, students, counselorName, opts);
    } else if (formatMode === 'table') {
      text = generateGroupBroadcastText(selectedDate, dateSessions, students, counselorName, opts);
    } else if (formatMode === 'list') {
      text = generateSimpleListBroadcastText(selectedDate, dateSessions, students, counselorName, opts);
    } else if (formatMode === 'weekly') {
      text = generateWeeklyScheduleBroadcastText(selectedDate, allSessions, students, counselorName, opts);
    } else {
      text = generateParentNotificationText(selectedDate, dateSessions, students, counselorName);
    }

    setMessageText(text);
    setIsCustomEdited(false);
  }, [formatMode, selectedDate, dateSessions, allSessions, students, counselorName, includeTags, includeCounselor, onlyAssigned]);

  // Keyboard shortcut Cmd/Ctrl + Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCopy();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messageText]);

  const handleCopy = async () => {
    const success = await copyToClipboard(messageText);
    if (success) {
      setIsCopied(true);
      onShowToast(
        'WhatsApp İlanı Kopyalandı!',
        formatMode === 'weekly'
          ? 'Haftalık seans çizelgesi panoya aktarıldı.'
          : `${formatTurkishDate(selectedDate)} seans programı panoya kopyalandı.`,
        'success'
      );
      setTimeout(() => setIsCopied(false), 2500);
    } else {
      onShowToast('Kopyalama Başarısız', 'Lütfen metni seçerek manuel kopyalayınız.', 'warning');
    }
  };

  const handleOpenWhatsAppWeb = () => {
    window.open(getWhatsAppWebShareUrl(messageText), '_blank');
  };

  const handleOpenWhatsAppApp = () => {
    window.open(getWhatsAppDirectUrl('', messageText), '_blank');
  };

  const assignedCount = formatMode === 'weekly'
    ? allSessions.filter((s) => s.student_id && weekDays.some((w) => w.date === s.date)).length
    : dateSessions.filter((s) => s.student_id).length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b0d13] border border-white/[0.12] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#08090f]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  WhatsApp Seans İlanı & Duyuru
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {assignedCount} Seans Hazır
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                {formatMode === 'weekly' ? 'Haftalık Toplu İlan' : formatTurkishDate(selectedDate)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Kapat (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Header: Day Selector Strip */}
        <div className="px-5 py-2.5 bg-[#090b10] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          {/* Quick Day Chips */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateString(selectedDate, -1))}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Önceki Gün"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {weekDays.map((w) => {
              const isSelected = w.date === selectedDate && formatMode !== 'weekly';
              const daySessCount = allSessions.filter((s) => s.date === w.date && s.student_id).length;

              return (
                <button
                  key={w.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(w.date);
                    if (formatMode === 'weekly') setFormatMode('cards');
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{w.shortDayName}</span>
                  <span className="text-[10px] font-mono text-zinc-400">{w.dayNumber}</span>
                  {daySessCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateString(selectedDate, 1))}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Sonraki Gün"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekly Mode Toggle Chip */}
          <button
            type="button"
            onClick={() => setFormatMode(formatMode === 'weekly' ? 'cards' : 'weekly')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer font-medium ${
              formatMode === 'weekly'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'bg-[#12141c] hover:bg-[#181a24] text-zinc-300 border border-white/[0.08]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Tüm Hafta İlanı</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5">
          {/* Format Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1 bg-[#08090d] p-1 rounded-lg border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setFormatMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  formatMode === 'cards'
                    ? 'bg-zinc-800 text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Mobilde en rahat okunan görsel WhatsApp kartı formatı"
              >
                <LayoutList className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kart Çizelgesi (Önerilen)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  formatMode === 'table'
                    ? 'bg-zinc-800 text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Hizalanmış monospaced kod tablosu"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Monospace Tablo</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  formatMode === 'list'
                    ? 'bg-zinc-800 text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Kısa ve tek satırlık minimalist liste"
              >
                <List className="w-3.5 h-3.5" />
                <span>Sade Liste</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatMode('parent')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                  formatMode === 'parent'
                    ? 'bg-zinc-800 text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Veli ve okul idaresi için kurumsal bilgilendirme yazısı"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Veli & İdare Notu</span>
              </button>
            </div>

            {/* Quick Toggles */}
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTags}
                  onChange={(e) => setIncludeTags(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>@Öğrenci Etiketi</span>
              </label>

              <label className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCounselor}
                  onChange={(e) => setIncludeCounselor(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>Danışman İsmi</span>
              </label>
            </div>
          </div>

          {/* Editable Text Area (Monospace WhatsApp Ready) */}
          <div className="relative">
            <textarea
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                setIsCustomEdited(true);
              }}
              rows={14}
              className="w-full p-4 rounded-xl bg-[#06070b] border border-white/[0.08] text-zinc-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-emerald-500/50 resize-y shadow-inner"
              spellCheck={false}
              placeholder="WhatsApp ilan metni yükleniyor..."
            />

            {/* Floating Character & Line Counter */}
            <div className="absolute right-3 bottom-3 px-2 py-0.5 rounded bg-zinc-900/90 border border-white/[0.06] text-[10px] font-mono text-zinc-500 pointer-events-none flex items-center gap-2">
              {isCustomEdited && (
                <span className="text-amber-400 font-medium">Özelleştirildi</span>
              )}
              <span>{messageText.length} karakter</span>
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
            <p>
              💡 <strong>İpucu:</strong> Kopyaladıktan sonra WhatsApp Web veya mobil uygulamasında herhangi bir sınıfa veya gruba doğrudan yapıştırabilirsiniz.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.08] bg-[#08090f]">
          <div className="text-[11px] text-zinc-500 hidden sm:flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-850 border border-zinc-750 text-[10px] font-mono text-zinc-400">
              ⌘ / Ctrl + Enter
            </kbd>
            <span>Hızlı Kopyala</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Kapat
            </button>

            {/* WhatsApp App / Universal Share link */}
            <a
              href={getWhatsAppUniversalUrl(messageText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                copyToClipboard(messageText);
                onShowToast(
                  'WhatsApp Açılıyor (İlan Kopyalandı)',
                  'İlan metni aynı zamanda panoya kopyalandı.',
                  'success'
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#141622] hover:bg-[#1e2130] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              title="Mobil veya Masaüstü WhatsApp ile doğrudan paylaş"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp İle Paylaş</span>
            </a>

            {/* WhatsApp Web link */}
            <a
              href={getWhatsAppWebShareUrl(messageText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                copyToClipboard(messageText);
                onShowToast(
                  'WhatsApp Web Açılıyor (İlan Kopyalandı)',
                  'İlan metni aynı zamanda panoya kopyalandı.',
                  'success'
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
              title="WhatsApp Web üzerinde yeni sekmede aç"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>WhatsApp Web</span>
            </a>

            {/* Main One-Click Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isCopied
                  ? 'bg-emerald-500 text-zinc-950 ring-2 ring-emerald-400/50'
                  : 'bg-white hover:bg-zinc-200 text-zinc-950'
              }`}
            >
              {isCopied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>İlanı Kopyala</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
