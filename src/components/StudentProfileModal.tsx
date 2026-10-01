import React, { useState, useEffect } from 'react';
import { Student, DIAGNOSTIC_TAGS } from '../types';
import { autoFormatPhone, displayPhone } from '../lib/storage';
import { X, Check, User, Phone, GraduationCap, Target, Tag, FileText } from 'lucide-react';

interface StudentProfileModalProps {
  student?: Student | null; // if null, adding new student
  onSave: (studentData: Omit<Student, 'id' | 'created_at'>, studentId?: string) => void;
  onClose: () => void;
}

export function StudentProfileModal({
  student,
  onSave,
  onClose,
}: StudentProfileModalProps) {
  const isEditing = Boolean(student);

  const [fullName, setFullName] = useState(student?.full_name || '');
  const [classGrade, setClassGrade] = useState(student?.class_grade || '12-A');
  const [phone, setPhone] = useState(student?.phone || '');
  const [targetGoal, setTargetGoal] = useState(student?.target_goal || '');
  const [notes, setNotes] = useState(student?.notes || '');
  const [statusFlags, setStatusFlags] = useState<string[]>(student?.status_flags || []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleTag = (tag: string) => {
    if (statusFlags.includes(tag)) {
      setStatusFlags(statusFlags.filter((t) => t !== tag));
    } else {
      setStatusFlags([...statusFlags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedName = fullName.replace(/[<>]/g, '').trim().slice(0, 100);
    const sanitizedGrade = classGrade.replace(/[<>]/g, '').trim().slice(0, 20);
    const sanitizedGoal = targetGoal.replace(/[<>]/g, '').trim().slice(0, 200);
    const sanitizedNotes = notes.replace(/[<>]/g, '').trim().slice(0, 2000);

    if (!sanitizedName || !phone.trim()) return;

    const cleanedPhone = autoFormatPhone(phone).slice(0, 25);

    onSave(
      {
        full_name: sanitizedName,
        class_grade: sanitizedGrade || '12-A',
        phone: cleanedPhone,
        status_flags: statusFlags.slice(0, 20),
        last_meeting_date: student?.last_meeting_date || null,
        target_goal: sanitizedGoal,
        notes: sanitizedNotes,
      },
      student?.id
    );

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div className="bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg max-w-lg w-full overflow-hidden text-stone-800 dark:text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 id="student-profile-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {isEditing ? 'Öğrenci Profilini Düzenle' : 'Yeni Öğrenci Kaydı'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Rehberlik CRM veri tabanı öğrenci kartı
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Ad Soyad & Sınıf */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1">
                Ad Soyad: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1 flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                <span>Sınıf:</span>
              </label>
              <input
                type="text"
                required
                maxLength={20}
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                placeholder="12-A / Mezun"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500 text-xs"
              />
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                <span>WhatsApp / Telefon Numarası:</span> <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">Otomatik formatlanır (905...)</span>
            </label>
            <input
              type="tel"
              required
              maxLength={30}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0532 123 45 67 veya 905321234567"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500 text-xs"
            />
          </div>

          {/* Hedef Üniversite / Bölüm */}
          <div>
            <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
              <span>Hedef Üniversite / Bölüm:</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder="Örn: İTÜ Bilgisayar Mühendisliği / Boğaziçi İktisat"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500 text-xs"
            />
          </div>

          {/* Teşhis & Durum Etiketleri */}
          <div>
            <label className="block text-slate-700 dark:text-zinc-400 font-medium mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
              <span>Teşhis ve Odak Etiketleri:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {DIAGNOSTIC_TAGS.map((tag) => {
                const isSelected = statusFlags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border border-slate-900 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-[#12141e] dark:hover:bg-[#1e2130] dark:text-zinc-400 dark:border-white/[0.06]'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rehberlik Notları */}
          <div>
            <label className="block text-stone-700 dark:text-stone-300 font-medium mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-stone-500" />
              <span>Rehber Öğretmen Özel Notu:</span>
            </label>
            <textarea
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Öğrencinin çalışma alışkanlıkları, deneme durumu, aile veya veli iletişim notları..."
              className="w-full px-3 py-1.5 rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-xs resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md font-medium bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span>{isEditing ? 'Güncelle' : 'Öğrenciyi Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
