import { useState } from 'react';
import { Session, Student, DIAGNOSTIC_TAGS } from '../types';
import { X, Check, Calendar, Bookmark, Tag } from 'lucide-react';
import { shiftDateString, getTodayDateString } from '../lib/storage';

interface QuickNotePopoverProps {
  session: Session;
  student?: Student;
  onSave: (updated: Partial<Session>) => void;
  onClose: () => void;
}

export function QuickNotePopover({
  session,
  student,
  onSave,
  onClose,
}: QuickNotePopoverProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(session.tags || []);
  const [actionItems, setActionItems] = useState(session.action_items || '');
  const [topic, setTopic] = useState(session.topic || '');
  const [nextDate, setNextDate] = useState(
    session.next_followup_date || shiftDateString(session.date || getTodayDateString(), 7)
  );

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSave = () => {
    onSave({
      tags: selectedTags,
      action_items: actionItems.trim(),
      topic: topic.trim(),
      next_followup_date: nextDate,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Hızlı Not & Teşhis</span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-normal">
                  ({session.time_slot})
                </span>
              </h3>
              {student && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {student.full_name} &bull; {student.class_grade}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Topic */}
          <div>
            <label className="block text-slate-700 dark:text-slate-400 font-medium mb-1.5 flex items-center gap-1.5">
              <span>Görüşme Konusu / Başlık:</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Örn: TYT Matematik Net Analizi, Deneme Değerlendirmesi..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
          </div>

          {/* Diagnostic Tag Chips */}
          <div>
            <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Teşhis ve Odak Etiketleri:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {DIAGNOSTIC_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-2xs border border-emerald-600 dark:bg-zinc-200 dark:text-zinc-900 dark:border-white'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-800'
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
            <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1.5 flex items-center justify-between">
              <span>Haftalık Hedef / Ödev Notu:</span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-normal">WhatsApp kartında yer alır</span>
            </label>
            <textarea
              rows={2}
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="Örn: Geometri üçgenler soru bankası taraması..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 text-xs resize-none"
            />
            {/* Hızlı Ekleme Çipleri */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">Hızlı ekle:</span>
              {[
                'Deneme analizi yapıldı',
                'Soru çizelgesi verildi',
                'Veli ile görüşülecek',
                'Etüt revize edildi',
              ].map((quickText) => (
                <button
                  key={quickText}
                  type="button"
                  onClick={() => {
                    setActionItems((prev) =>
                      prev.trim() ? `${prev.trim()} • ${quickText}` : quickText
                    );
                  }}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700/60 transition-colors cursor-pointer"
                >
                  +{quickText}
                </button>
              ))}
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div>
            <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span>Bir Sonraki Takip / Randevu Tarihi:</span>
            </label>
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs w-full sm:w-48 font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 transition-colors cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
}
