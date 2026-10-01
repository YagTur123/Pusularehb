import { useState, useEffect } from 'react';
import { Session, Student, DIAGNOSTIC_TAGS, COMMON_TOPICS } from '../types';
import {
  X,
  Check,
  Calendar,
  Bookmark,
  Tag,
  MessageSquare,
  Phone,
  Target,
  Sparkles,
  Clock,
  User,
  ArrowRight,
} from 'lucide-react';
import { shiftDateString, getTodayDateString, displayPhone, StorageService } from '../lib/storage';
import { getWhatsAppDirectUrl } from '../lib/whatsapp';

interface QuickNotePopoverProps {
  session: Session;
  student?: Student;
  onSave: (updated: Partial<Session>) => void;
  onClose: () => void;
  onShowToast?: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function QuickNotePopover({
  session,
  student,
  onSave,
  onClose,
  onShowToast,
}: QuickNotePopoverProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(session.tags || []);
  const [actionItems, setActionItems] = useState(session.action_items || '');
  const [topic, setTopic] = useState(session.topic || '');
  const [nextDate, setNextDate] = useState(
    session.next_followup_date || shiftDateString(session.date || getTodayDateString(), 7)
  );
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // Restore draft if left unfinished
  useEffect(() => {
    const draft = StorageService.getDraft<{
      topic: string;
      actionItems: string;
      selectedTags: string[];
      nextDate: string;
    }>('quick_note_' + session.id);

    if (draft && (draft.topic || draft.actionItems)) {
      if (draft.topic) setTopic(draft.topic);
      if (draft.actionItems) setActionItems(draft.actionItems);
      if (draft.selectedTags) setSelectedTags(draft.selectedTags);
      if (draft.nextDate) setNextDate(draft.nextDate);
      setHasRestoredDraft(true);
      onShowToast?.('Taslak Geri Yüklendi', 'Önceki yarım kalan görüşme notu yüklendi.', 'info');
    }
  }, [session.id, onShowToast]);

  // Save draft on unmount / escape if not empty
  const handleCloseWithDraft = () => {
    if (topic.trim() || actionItems.trim()) {
      StorageService.saveDraft('quick_note_' + session.id, {
        topic,
        actionItems,
        selectedTags,
        nextDate,
      });
      onShowToast?.('Taslak Kaydedildi', 'Yarım kalan notunuz taslak olarak saklandı.', 'info');
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseWithDraft();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [topic, actionItems, selectedTags, nextDate]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = () => {
    StorageService.clearDraft('quick_note_' + session.id);
    onSave({
      tags: selectedTags,
      action_items: actionItems.trim(),
      topic: topic.trim(),
      next_followup_date: nextDate,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-note-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#1F1F1F] h-full shadow-xl border-l border-stone-200 dark:border-stone-800 flex flex-col text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="quick-note-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Seans Notu & Detay Paneli
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-300">
                  {session.time_slot}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Görüşme içeriği, hedefler ve bir sonraki takip randevusu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="Paneli kapat (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Student Overview Card (if assigned) */}
          {student ? (
            <div className="p-3 rounded-md bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 font-medium text-xs flex items-center justify-center">
                    {student.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                      {student.full_name}
                    </h4>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">
                      Sınıf: {student.class_grade}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {student.phone && (
                    <a
                      href={`tel:${student.phone}`}
                      className="p-1.5 rounded bg-white hover:bg-stone-100 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs transition-colors"
                      title={`Ara: ${displayPhone(student.phone)}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {student.phone && (
                    <a
                      href={getWhatsAppDirectUrl(
                        student.phone,
                        `Merhaba ${student.full_name}, Pusula Rehberlik randevunuz ile ilgili bilgilendirmedir.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs transition-colors"
                      title="WhatsApp'tan Yaz"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {student.target_goal && (
                <div className="flex items-center gap-1.5 text-[11px] text-stone-700 dark:text-stone-300 pt-1 border-t border-stone-200 dark:border-stone-800">
                  <Target className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span className="font-medium">Hedef:</span>
                  <span className="text-teal-700 dark:text-teal-400">{student.target_goal}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-md bg-amber-50/70 dark:bg-stone-900/60 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bu seans aralığı henüz bir öğrenciye atanmamış.</span>
            </div>
          )}

          {/* Topic / Subject Input with Suggestions */}
          <div>
            <label className="block text-stone-800 dark:text-stone-200 font-medium mb-1 flex items-center justify-between">
              <span>Görüşme Konusu & Odak Alanı:</span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">
                Ana gündem maddesi
              </span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Örn: TYT Matematik Net Analizi, Soru Çözüm Takibi..."
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-stone-500 focus:outline-hidden text-xs"
            />
            {/* Sık Kullanılan Hızlı Şablon Çipleri (Akademik takip, Veli görüşmesi, Sınav kaygısı...) */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-stone-500 font-medium">Hızlı Şablon:</span>
              {[
                'Akademik takip',
                'Veli görüşmesi',
                'Sınav kaygısı',
                'Hedef belirleme',
                'Motivasyon görüşmesi',
                'TYT Deneme Analizi',
                'AYT Matematik Planlama',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setTopic(chip)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                    topic === chip
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:border-stone-700'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostic Tag Chips */}
          <div>
            <label className="block text-stone-800 dark:text-stone-200 font-medium mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone-500" />
                <span>Teşhis ve Danışmanlık Etiketleri:</span>
              </div>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">
                {selectedTags.length} seçildi
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 rounded-md bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
              {DIAGNOSTIC_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Haftalık Hedef / Ödev */}
          <div>
            <label className="block text-stone-800 dark:text-stone-200 font-medium mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Haftalık Eylem Maddeleri & Ödev:</span>
              </div>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">
                WhatsApp kartına aktarılır
              </span>
            </label>
            <textarea
              rows={3}
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="Örn: Her gün 25 paragraf sorusu, Çarşamba TYT Türkçe denemesi analizi..."
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-stone-500 focus:outline-hidden text-xs resize-none"
            />
            {/* Quick action chips */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-stone-500 font-mono">Hızlı Şablon:</span>
              {[
                'Deneme analizi tamamlanacak',
                'Haftalık soru çizelgesi teslimi',
                'Veli bilgilendirmesi planlandı',
                'Etüt & soru çözümü ayarlandı',
              ].map((quickText) => (
                <button
                  key={quickText}
                  type="button"
                  onClick={() => {
                    setActionItems((prev) =>
                      prev.trim() ? `${prev.trim()}\n• ${quickText}` : `• ${quickText}`
                    );
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:border-stone-700 transition-colors cursor-pointer"
                >
                  +{quickText}
                </button>
              ))}
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div>
            <label className="block text-stone-800 dark:text-stone-200 font-medium mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                <span>Bir Sonraki Takip Randevusu:</span>
              </div>
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">
                Otomatik takip hatırlatıcı
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:border-stone-500 focus:outline-hidden text-xs w-full sm:w-52 font-mono"
              />
              <button
                type="button"
                onClick={() => setNextDate(shiftDateString(session.date || getTodayDateString(), 7))}
                className="px-2.5 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                +7 Gün (1 Hafta)
              </button>
              <button
                type="button"
                onClick={() => setNextDate(shiftDateString(session.date || getTodayDateString(), 14))}
                className="px-2.5 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                +14 Gün
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Değişiklikleri Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
}

