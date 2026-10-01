import React, { useState, useEffect, useRef } from 'react';
import { Student, DIAGNOSTIC_TAGS } from '../types';
import { autoFormatPhone, StorageService } from '../lib/storage';
import {
  X,
  UserPlus,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Phone,
  Target,
  FileText,
  Tag,
  Check,
} from 'lucide-react';

interface QuickStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveStudent: (student: Omit<Student, 'id' | 'created_at'>) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function QuickStudentModal({
  isOpen,
  onClose,
  onSaveStudent,
  onShowToast,
}: QuickStudentModalProps) {
  const [fullName, setFullName] = useState('');
  const [classGrade, setClassGrade] = useState('12-A');
  const [showMore, setShowMore] = useState(false);
  const [phone, setPhone] = useState('');
  const [targetGoal, setTargetGoal] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Restore draft on open
  useEffect(() => {
    if (isOpen) {
      const draft = StorageService.getDraft<{
        fullName: string;
        classGrade: string;
        phone: string;
        targetGoal: string;
        selectedTags: string[];
        notes: string;
      }>('quick_student');

      if (draft && (draft.fullName || draft.phone || draft.targetGoal)) {
        setFullName(draft.fullName || '');
        setClassGrade(draft.classGrade || '12-A');
        setPhone(draft.phone || '');
        setTargetGoal(draft.targetGoal || '');
        setSelectedTags(draft.selectedTags || []);
        setNotes(draft.notes || '');
        if (draft.phone || draft.targetGoal || draft.notes || (draft.selectedTags && draft.selectedTags.length > 0)) {
          setShowMore(true);
        }
        setHasRestoredDraft(true);
        onShowToast('Taslak Geri Yüklendi', 'Önceki yarım kalan öğrenci formu yüklendi.', 'info');
      } else {
        setFullName('');
        setClassGrade('12-A');
        setPhone('');
        setTargetGoal('');
        setSelectedTags([]);
        setNotes('');
        setShowMore(false);
        setHasRestoredDraft(false);
      }

      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Auto-save draft on change
  useEffect(() => {
    if (!isOpen) return;
    if (fullName.trim() || phone.trim() || targetGoal.trim() || notes.trim()) {
      StorageService.saveDraft('quick_student', {
        fullName,
        classGrade,
        phone,
        targetGoal,
        selectedTags,
        notes,
      });
    }
  }, [fullName, classGrade, phone, targetGoal, selectedTags, notes, isOpen]);

  // Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (fullName.trim()) {
          onShowToast('Taslak Korundu', 'Öğrenci formu taslak olarak saklandı.', 'info');
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, fullName, onClose, onShowToast]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.replace(/[<>]/g, '').trim().slice(0, 100);
    const cleanGrade = classGrade.replace(/[<>]/g, '').trim().slice(0, 20);

    if (!cleanName) {
      nameInputRef.current?.focus();
      return;
    }

    const cleanPhone = autoFormatPhone(phone || '0500 000 00 00').slice(0, 25);
    const cleanGoal = targetGoal.replace(/[<>]/g, '').trim().slice(0, 200);
    const cleanNotes = notes.replace(/[<>]/g, '').trim().slice(0, 2000);

    onSaveStudent({
      full_name: cleanName,
      class_grade: cleanGrade || '12-A',
      phone: cleanPhone,
      status_flags: selectedTags,
      last_meeting_date: null,
      target_goal: cleanGoal || undefined,
      notes: cleanNotes || undefined,
    });

    StorageService.clearDraft('quick_student');
    onClose();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-student-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      onClick={() => {
        if (fullName.trim()) {
          onShowToast('Taslak Korundu', 'Öğrenci formu taslak olarak saklandı.', 'info');
        }
        onClose();
      }}
    >
      <div
        className="bg-white dark:bg-[#1E1E1E] border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden text-stone-800 dark:text-stone-200 animate-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 id="quick-student-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Hızlı Öğrenci Ekle
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Sadece ad ve sınıf zorunludur <kbd className="font-mono text-[10px] ml-1">Ctrl+Shift+N</kbd>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (fullName.trim()) {
                onShowToast('Taslak Korundu', 'Öğrenci formu taslak olarak saklandı.', 'info');
              }
              onClose();
            }}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {hasRestoredDraft && (
            <div className="text-[11px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 px-3 py-1.5 rounded-md border border-teal-200 dark:border-teal-800 flex items-center justify-between">
              <span>Taslaktan geri yüklenen bilgiler var.</span>
              <button
                type="button"
                onClick={() => {
                  StorageService.clearDraft('quick_student');
                  setFullName('');
                  setPhone('');
                  setTargetGoal('');
                  setNotes('');
                  setSelectedTags([]);
                  setHasRestoredDraft(false);
                }}
                className="underline hover:no-underline cursor-pointer font-medium"
              >
                Taslağı Temizle
              </button>
            </div>
          )}

          {/* Zorunlu Alanlar: Ad Soyad & Sınıf */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                <span>Öğrenci Adı Soyadı</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn. Zeynep Demir"
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-stone-400" />
                <span>Sınıf</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                placeholder="Örn. 12-A / Mezun"
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-teal-600 dark:focus:border-teal-400"
              />
            </div>
          </div>

          {/* "Daha Fazla" Akordeonu */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-between py-1 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
            >
              <span>Daha fazla detay (Telefon, Hedef, Teşhis, Notlar)</span>
              {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showMore && (
              <div className="mt-3 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-stone-700 dark:text-stone-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>Telefon (Veli / Öğrenci)</span>
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 font-mono placeholder-stone-400 focus:outline-none focus:border-teal-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-700 dark:text-stone-300 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-stone-400" />
                      <span>Hedef / Bölüm</span>
                    </label>
                    <input
                      type="text"
                      value={targetGoal}
                      onChange={(e) => setTargetGoal(e.target.value)}
                      placeholder="Örn. Hacettepe Tıp / İTÜ Ceng"
                      className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-700 dark:text-stone-300 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-stone-400" />
                    <span>Hızlı Teşhis Etiketleri</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DIAGNOSTIC_TAGS.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer border ${
                            isSelected
                              ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
                              : 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {isSelected && '✓ '}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-700 dark:text-stone-300 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-stone-400" />
                    <span>Ön Not</span>
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Görüşme öncesi kısa hatırlatma notu..."
                    className="w-full px-3 py-1.5 rounded-md bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={() => {
                if (fullName.trim()) {
                  onShowToast('Taslak Korundu', 'Öğrenci formu taslak olarak saklandı.', 'info');
                }
                onClose();
              }}
              className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Öğrenciyi Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
