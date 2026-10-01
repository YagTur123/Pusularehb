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
import { formatTurkishDate, shiftDateString, getWeekDays, StorageService } from '../lib/storage';

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

  const assignedCount = formatMode === 'weekly'
    ? allSessions.filter((s) => s.student_id && weekDays.some((w) => w.date === s.date)).length
    : dateSessions.filter((s) => s.student_id).length;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="broadcast-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                  WhatsApp Seans İlanı & Duyuru
                </h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  {assignedCount} Seans
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                {formatMode === 'weekly' ? 'Haftalık Toplu İlan' : formatTurkishDate(selectedDate)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Header: Day Selector Strip */}
        <div className="px-5 py-2.5 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
          {/* Quick Day Chips */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateString(selectedDate, -1))}
              className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
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
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-emerald-700 text-white font-semibold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/80 dark:text-stone-400 dark:hover:text-stone-200 dark:hover:bg-stone-800'
                  }`}
                >
                  <span>{w.shortDayName}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-stone-500 dark:text-stone-400'}`}>{w.dayNumber}</span>
                  {daySessCount > 0 && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateString(selectedDate, 1))}
              className="p-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
              title="Sonraki Gün"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekly Mode Toggle Chip */}
          <button
            type="button"
            onClick={() => setFormatMode(formatMode === 'weekly' ? 'cards' : 'weekly')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer font-medium ${
              formatMode === 'weekly'
                ? 'bg-emerald-700 text-white font-semibold'
                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:border-stone-700'
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
            <div className="flex flex-wrap items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-md border border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setFormatMode('cards')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  formatMode === 'cards'
                    ? 'bg-white text-stone-900 font-medium dark:bg-stone-800 dark:text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
                title="Mobilde en rahat okunan görsel WhatsApp kartı formatı"
              >
                <LayoutList className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Kart Çizelgesi (Önerilen)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  formatMode === 'table'
                    ? 'bg-white text-stone-900 font-medium dark:bg-stone-800 dark:text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
                title="Hizalanmış monospaced kod tablosu"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Monospace Tablo</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  formatMode === 'list'
                    ? 'bg-white text-stone-900 font-medium dark:bg-stone-800 dark:text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
                title="Kısa ve tek satırlık minimalist liste"
              >
                <List className="w-3.5 h-3.5" />
                <span>Sade Liste</span>
              </button>

              <button
                type="button"
                onClick={() => setFormatMode('parent')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  formatMode === 'parent'
                    ? 'bg-white text-stone-900 font-medium dark:bg-stone-800 dark:text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
                title="Veli ve okul idaresi için kurumsal bilgilendirme yazısı"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Veli & İdare Notu</span>
              </button>
            </div>

            {/* Quick Toggles */}
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTags}
                  onChange={(e) => setIncludeTags(e.target.checked)}
                  className="rounded border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-emerald-700 focus:ring-0 cursor-pointer"
                />
                <span>@Öğrenci Etiketi</span>
              </label>

              <label className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeCounselor}
                  onChange={(e) => setIncludeCounselor(e.target.checked)}
                  className="rounded border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-emerald-700 focus:ring-0 cursor-pointer"
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
              className="w-full p-3.5 rounded-lg bg-stone-50 dark:bg-[#141414] border border-stone-300 dark:border-stone-800 text-stone-900 dark:text-stone-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-stone-500 resize-y"
              spellCheck={false}
              placeholder="WhatsApp ilan metni yükleniyor..."
            />

            {/* Floating Character & Line Counter */}
            <div className="absolute right-3 bottom-3 px-2 py-0.5 rounded bg-white/90 dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 text-[10px] font-mono text-stone-500 dark:text-stone-400 pointer-events-none flex items-center gap-2">
              {isCustomEdited && (
                <span className="text-amber-700 dark:text-amber-400 font-medium">Özelleştirildi</span>
              )}
              <span>{messageText.length} karakter</span>
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400 px-1">
            <p>
              💡 <strong>İpucu:</strong> Kopyaladıktan sonra WhatsApp Web veya mobil uygulamasında herhangi bir sınıfa veya gruba doğrudan yapıştırabilirsiniz.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-[10px] font-mono text-stone-700 dark:text-stone-300">
              ⌘ / Ctrl + Enter
            </kbd>
            <span>Hızlı Kopyala</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Kapat
            </button>

            {/* WhatsApp App / Universal Share link */}
            <a
              href={StorageService.isDemo() ? '#' : getWhatsAppUniversalUrl(messageText)}
              target={StorageService.isDemo() ? '_self' : '_blank'}
              rel="noopener noreferrer"
              onClick={(e) => {
                copyToClipboard(messageText);
                if (StorageService.isDemo()) {
                  e.preventDefault();
                  onShowToast(
                    'Demo Modu: Mesaj Önizlemesi',
                    'Demo modunda dış ağa veya WhatsApp uygulamasına istek yapılmaz. İlan metni panoya kopyalandı.',
                    'info'
                  );
                } else {
                  onShowToast(
                    'WhatsApp Açılıyor (İlan Kopyalandı)',
                    'İlan metni aynı zamanda panoya kopyalandı.',
                    'success'
                  );
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors cursor-pointer"
              title="Mobil veya Masaüstü WhatsApp ile doğrudan paylaş"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>WhatsApp İle Paylaş</span>
            </a>

            {/* WhatsApp Web link */}
            <a
              href={StorageService.isDemo() ? '#' : getWhatsAppWebShareUrl(messageText)}
              target={StorageService.isDemo() ? '_self' : '_blank'}
              rel="noopener noreferrer"
              onClick={(e) => {
                copyToClipboard(messageText);
                if (StorageService.isDemo()) {
                  e.preventDefault();
                  onShowToast(
                    'Demo Modu: Mesaj Önizlemesi',
                    'Demo modunda dış ağa istek yapılmaz. İlan metni panoya kopyalandı.',
                    'info'
                  );
                } else {
                  onShowToast(
                    'WhatsApp Web Açılıyor (İlan Kopyalandı)',
                    'İlan metni aynı zamanda panoya kopyalandı.',
                    'success'
                  );
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
              title="WhatsApp Web üzerinde yeni sekmede aç"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>WhatsApp Web</span>
            </a>

            {/* Main One-Click Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer shadow-xs ${
                isCopied
                  ? 'bg-emerald-700 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950'
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
