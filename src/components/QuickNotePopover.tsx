import { useState } from 'react';
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
import { shiftDateString, getTodayDateString, displayPhone } from '../lib/storage';
import { getWhatsAppDirectUrl } from '../lib/whatsapp';

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
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#11131d] h-full shadow-2xl border-l border-slate-200 dark:border-white/[0.08] flex flex-col animate-in slide-in-from-right duration-200 text-slate-800 dark:text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/90 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0c0e16]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/20 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Seans Notu & Detay Paneli
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-200/80 text-slate-800 dark:bg-zinc-800 dark:text-zinc-300">
                  {session.time_slot}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Görüşme içeriği, hedefler ve bir sonraki takip randevusu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Paneli kapat (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Student Overview Card (if assigned) */}
          {student ? (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161824] border border-slate-200/80 dark:border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {student.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      {student.full_name}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Sınıf: {student.class_grade}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {student.phone && (
                    <a
                      href={`tel:${student.phone}`}
                      className="p-1.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-200/90 dark:border-zinc-700 text-xs transition-colors"
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
                      className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 text-xs transition-colors"
                      title="WhatsApp'tan Yaz"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {student.target_goal && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-zinc-300 pt-1 border-t border-slate-200/60 dark:border-white/[0.04]">
                  <Target className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="font-medium">Hedef:</span>
                  <span>{student.target_goal}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Bu seans aralığı henüz bir öğrenciye atanmamış.</span>
            </div>
          )}

          {/* Topic / Subject Input with Suggestions */}
          <div>
            <label className="block text-slate-800 dark:text-zinc-200 font-semibold mb-1.5 flex items-center justify-between">
              <span>Görüşme Konusu & Odak Alanı:</span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">
                Ana gündem maddesi
              </span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Örn: TYT Matematik Net Analizi, Soru Çözüm Takibi..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#161824] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-2xs"
            />
            {/* Topic Suggestion Chips */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">Öneriler:</span>
              {COMMON_TOPICS.slice(0, 4).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostic Tag Chips */}
          <div>
            <label className="block text-slate-800 dark:text-zinc-200 font-semibold mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Teşhis ve Danışmanlık Etiketleri:</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">
                {selectedTags.length} seçildi
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2 rounded-lg bg-slate-50 dark:bg-[#161824] border border-slate-200/80 dark:border-white/[0.06]">
              {DIAGNOSTIC_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs border border-indigo-600 dark:bg-indigo-600 dark:text-white dark:border-transparent'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700'
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
            <label className="block text-slate-800 dark:text-zinc-200 font-semibold mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Haftalık Eylem Maddeleri & Ödev:</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">
                WhatsApp kartına aktarılır
              </span>
            </label>
            <textarea
              rows={3}
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder="Örn: Her gün 25 paragraf sorusu, Çarşamba TYT Türkçe denemesi analizi..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#161824] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none shadow-2xs"
            />
            {/* Quick action chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-mono">Hızlı Şablon:</span>
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
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/90 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  +{quickText}
                </button>
              ))}
            </div>
          </div>

          {/* Next Follow-up Date */}
          <div>
            <label className="block text-slate-800 dark:text-zinc-200 font-semibold mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Bir Sonraki Takip Randevusu:</span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal">
                Otomatik takip hatırlatıcı
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white dark:bg-[#161824] border border-slate-300 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs w-full sm:w-52 font-mono shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setNextDate(shiftDateString(session.date || getTodayDateString(), 7))}
                className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-200/90 dark:border-zinc-700 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                +7 Gün (1 Hafta)
              </button>
              <button
                type="button"
                onClick={() => setNextDate(shiftDateString(session.date || getTodayDateString(), 14))}
                className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 border border-slate-200/90 dark:border-zinc-700 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                +14 Gün
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200/90 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#0c0e16]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Değişiklikleri Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
}

