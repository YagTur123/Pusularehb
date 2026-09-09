import React, { useState } from 'react';
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

  const toggleTag = (tag: string) => {
    if (statusFlags.includes(tag)) {
      setStatusFlags(statusFlags.filter((t) => t !== tag));
    } else {
      setStatusFlags([...statusFlags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    const cleanedPhone = autoFormatPhone(phone);

    onSave(
      {
        full_name: fullName.trim(),
        class_grade: classGrade.trim(),
        phone: cleanedPhone,
        status_flags: statusFlags,
        last_meeting_date: student?.last_meeting_date || null,
        target_goal: targetGoal.trim(),
        notes: notes.trim(),
      },
      student?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#181a26] border border-white/[0.1] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141622]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isEditing ? 'Öğrenci Profilini Düzenle' : 'Yeni Öğrenci Kaydı'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Rehberlik CRM veri tabanı öğrenci kartı
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Ad Soyad & Sınıf */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-zinc-400 font-medium mb-1">
                Ad Soyad: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full px-3 py-2 rounded-lg bg-[#12141e] border border-white/[0.08] text-white focus:outline-none focus:border-zinc-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-zinc-400" />
                <span>Sınıf:</span>
              </label>
              <input
                type="text"
                required
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                placeholder="12-A / Mezun"
                className="w-full px-3 py-2 rounded-lg bg-[#12141e] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-zinc-500 text-xs"
              />
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-zinc-400" />
                <span>WhatsApp / Telefon Numarası:</span> <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">Otomatik formatlanır (905...)</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0532 123 45 67 veya 905321234567"
              className="w-full px-3 py-2 rounded-lg bg-[#12141e] border border-white/[0.08] text-white font-mono focus:outline-none focus:border-zinc-500 text-xs"
            />
          </div>

          {/* Hedef Üniversite / Bölüm */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-zinc-400" />
              <span>Hedef Üniversite / Bölüm:</span>
            </label>
            <input
              type="text"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder="Örn: İTÜ Bilgisayar Mühendisliği / Boğaziçi İktisat"
              className="w-full px-3 py-2 rounded-lg bg-[#12141e] border border-white/[0.08] text-white focus:outline-none focus:border-zinc-500 text-xs"
            />
          </div>

          {/* Teşhis & Durum Etiketleri */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3 text-zinc-400" />
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
                        ? 'bg-zinc-800 text-white border border-zinc-600 shadow-xs'
                        : 'bg-[#12141e] hover:bg-[#1e2130] text-zinc-400 border border-white/[0.06]'
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
            <label className="block text-zinc-400 font-medium mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-zinc-400" />
              <span>Rehber Öğretmen Özel Notu:</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Öğrencinin çalışma alışkanlıkları, deneme durumu, aile veya veli iletişim notları..."
              className="w-full px-3 py-2 rounded-lg bg-[#12141e] border border-white/[0.08] text-white focus:outline-none focus:border-zinc-500 text-xs resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md font-medium bg-zinc-800 hover:bg-zinc-700 text-white border border-white/[0.1] shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEditing ? 'Güncelle' : 'Öğrenciyi Kaydet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
