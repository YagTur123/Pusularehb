import React, { useState, useEffect } from 'react';
import { Session, Student } from '../types';
import { X, Copy, ExternalLink, MessageSquare, Terminal, Check } from 'lucide-react';
import { generateGroupBroadcastText } from '../lib/whatsapp';

interface GroupBroadcastModalProps {
  date: string;
  sessions: Session[];
  students: Student[];
  counselorName?: string;
  onClose: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function GroupBroadcastModal({
  date,
  sessions,
  students,
  counselorName,
  onClose,
  onShowToast,
}: GroupBroadcastModalProps) {
  const [messageText, setMessageText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const text = generateGroupBroadcastText(date, sessions, students, counselorName);
    setMessageText(text);
  }, [date, sessions, students, counselorName]);

  // Handle Cmd/Ctrl + Enter inside modal
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
    try {
      await navigator.clipboard.writeText(messageText);
      setIsCopied(true);
      onShowToast(
        'Grup İlanı Kopyalandı!',
        'ASCII Tablosu ve etiketler panoya kopyalandı.',
        'success'
      );
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      onShowToast('Kopyalama Hatası', 'Metin panoya kopyalanamadı.', 'warning');
    }
  };

  const handleOpenWhatsApp = () => {
    const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const assignedCount = sessions.filter((s) => s.student_id).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>WhatsApp Grup İlan Tablosu</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                  {assignedCount} Öğrenci
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monospace ASCII formatlı tablo ve otomatik @etiket listesi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content / Live Preview Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-slate-300">WhatsApp Çıktı Önizlemesi:</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              (Gerektiğinde metni düzenleyebilirsiniz)
            </span>
          </div>

          <div className="relative">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={14}
              className="w-full p-4 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none focus:border-indigo-500 selection:bg-emerald-950 resize-y"
              spellCheck={false}
            />
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">💡 WhatsApp İpuçları:</p>
            <p>
              &bull; Tablo WhatsApp'ta sabit genişlikli (Monospace) font ile kusursuz hizalı görüntülenir.
            </p>
            <p>
              &bull; Alt kısımdaki <code className="text-emerald-400 font-mono">@+905xxxxxxxxx</code> etiketleri WhatsApp gruplarında öğrencilerin telefonlarına doğrudan bildirim tetikler.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
              Cmd/Ctrl + Enter
            </kbd>
            <span>ile anında kopyala</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Kapat
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>WhatsApp Web</span>
            </button>

            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all ${
                isCopied
                  ? 'bg-emerald-600 text-white shadow-emerald-950/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
              }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Kopyalandı!' : 'Panoya Kopyala'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
