import React, { useState, useMemo } from 'react';
import { Student, Session, DIAGNOSTIC_TAGS } from '../types';
import {
  Search,
  Plus,
  Phone,
  MessageSquare,
  History,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  Clock,
  UserX,
  Target,
  ExternalLink,
  Download,
  UploadCloud,
  FileSpreadsheet,
} from 'lucide-react';
import { displayPhone, formatTurkishDate, StorageService } from '../lib/storage';
import { getWhatsAppDirectUrl } from '../lib/whatsapp';
import { StudentHistoryModal } from './StudentHistoryModal';
import { StudentProfileModal } from './StudentProfileModal';
import { RiskFilter } from './RiskRadarBar';

interface StudentCRMDirectoryProps {
  students: Student[];
  sessions: Session[];
  counselorName: string;
  activeRiskFilter: RiskFilter;
  onClearRiskFilter: () => void;
  onSaveStudent: (student: Omit<Student, 'id' | 'created_at'>, id?: string) => void;
  onDeleteStudent: (id: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  onQuickScheduleStudent: (student: Student) => void;
  onOpenSmartPaste?: () => void;
}

export function StudentCRMDirectory({
  students,
  sessions,
  counselorName,
  activeRiskFilter,
  onClearRiskFilter,
  onSaveStudent,
  onDeleteStudent,
  onShowToast,
  onQuickScheduleStudent,
  onOpenSmartPaste,
}: StudentCRMDirectoryProps) {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Collect distinct classes
  const classes = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class_grade) set.add(s.class_grade);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const missedStudentIds = new Set(
      sessions
        .filter((s) => s.status === 'Gelmedi' && new Date(s.date) >= sevenDaysAgo)
        .map((s) => s.student_id)
        .filter(Boolean)
    );

    return students.filter((s) => {
      // Risk filter
      if (activeRiskFilter === 'uncontacted_20d') {
        if (!s.last_meeting_date) return true;
        if (new Date(s.last_meeting_date) >= twentyDaysAgo) return false;
      } else if (activeRiskFilter === 'missed_this_week') {
        if (!missedStudentIds.has(s.id)) return false;
      }

      // Class filter
      if (selectedClass !== 'all' && s.class_grade !== selectedClass) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'all' && !s.status_flags.includes(selectedTag)) {
        return false;
      }

      // Text search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = s.full_name.toLowerCase().includes(query);
        const matchesPhone = s.phone.includes(query);
        const matchesGrade = s.class_grade.toLowerCase().includes(query);
        const matchesGoal = s.target_goal?.toLowerCase().includes(query);
        const matchesTag = s.status_flags.some((t) => t.toLowerCase().includes(query));
        return matchesName || matchesPhone || matchesGrade || matchesGoal || matchesTag;
      }

      return true;
    });
  }, [students, sessions, activeRiskFilter, selectedClass, selectedTag, search]);

  const handleOpenDirectChat = (student: Student) => {
    const text = `Merhaba ${student.full_name}, Pusula Rehberlik servisinden yazıyorum.`;
    const url = getWhatsAppDirectUrl(student.phone, text);
    window.open(url, '_blank');
  };

  const handleExportCsv = () => {
    const csvContent = StorageService.exportToCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rehberlik_ogrenci_listesi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('CSV İndirildi', 'Öğrenci portföyü Excel / CSV formatında kaydedildi.', 'success');
  };

  return (
    <div className="space-y-3">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-[#141622] p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.07] shadow-xs transition-colors">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Öğrenci, sınıf veya telefon ara..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500"
            />
          </div>

          {/* Sınıf Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] text-xs text-slate-900 dark:text-zinc-300 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500 cursor-pointer font-medium"
          >
            <option value="all">Tüm Sınıflar</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] text-xs text-slate-900 dark:text-zinc-300 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-500 max-w-[160px] truncate cursor-pointer font-medium"
          >
            <option value="all">Tüm Etiketler</option>
            {DIAGNOSTIC_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          {/* Active Risk Radar indication badge */}
          {activeRiskFilter !== 'none' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-950 dark:text-amber-300 text-xs font-semibold shadow-2xs">
              <span>
                {activeRiskFilter === 'uncontacted_20d' ? '20+ Gün İletişimsiz' : 'Gelmeyenler'}
              </span>
              <button
                onClick={onClearRiskFilter}
                className="text-amber-800 dark:text-amber-400 hover:text-black dark:hover:text-white font-bold ml-1 cursor-pointer"
                title="Filtreyi kaldır"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Bulk Import Button */}
          {onOpenSmartPaste && (
            <button
              type="button"
              onClick={onOpenSmartPaste}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="e-Okul veya Excel'den toplu öğrenci aktarımı yap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Toplu İçe Aktar (e-Okul / Excel)</span>
              <span className="sm:hidden">İçe Aktar</span>
            </button>
          )}

          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#181a26] dark:hover:bg-[#1e2130] border border-slate-300 dark:border-white/[0.08] text-slate-800 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            title="CSV formatında indir"
          >
            <Download className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
            <span>CSV İndir</span>
          </button>

          {/* Add Student Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-100 border border-slate-900 dark:border-white/[0.1] text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Öğrenci Ekle</span>
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="border border-slate-200/90 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-[#121420] shadow-xs transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-[#0c0e17] border-b border-slate-200 dark:border-white/[0.08] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 select-none">
                <th className="align-middle py-3 px-4 min-w-[220px]">Öğrenci & Sınıf</th>
                <th className="align-middle py-3 px-4 w-40 font-mono">Telefon</th>
                <th className="align-middle py-3 px-4 w-44">Son Görüşme</th>
                <th className="align-middle py-3 px-4 min-w-[240px]">Hedef & Teşhis Etiketleri</th>
                <th className="align-middle py-3 px-4 text-right w-44">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/90 dark:divide-white/[0.07] font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-500 dark:text-zinc-500 text-xs">
                    Kayıtlı öğrenci bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  // Check 20+ days status
                  const now = new Date();
                  const isUncontacted20d = !student.last_meeting_date ||
                    (now.getTime() - new Date(student.last_meeting_date).getTime()) > 20 * 86400000;

                  return (
                    <tr
                      key={student.id}
                      className="group transition-colors duration-150 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"
                    >
                      {/* Name & Grade */}
                      <td className="align-middle py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setHistoryStudent(student)}
                            className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-left transition-colors cursor-pointer"
                          >
                            {student.full_name}
                          </button>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-700 shrink-0">
                            {student.class_grade}
                          </span>
                          {isUncontacted20d && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200/90 dark:border-amber-800/40 shrink-0"
                              title="20+ gündür görüşülmedi"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>20+ Gün</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="align-middle py-3.5 px-4 font-mono text-xs font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
                          <span>{displayPhone(student.phone)}</span>
                        </div>
                      </td>

                      {/* Son Görüşme */}
                      <td className="align-middle py-3.5 px-4 whitespace-nowrap">
                        {student.last_meeting_date ? (
                          <div className="flex items-center gap-2">
                            <Clock className={`w-3.5 h-3.5 shrink-0 ${isUncontacted20d ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-zinc-500'}`} />
                            <span className={`text-xs ${isUncontacted20d ? 'text-amber-900 dark:text-amber-300 font-bold' : 'text-slate-800 dark:text-zinc-200 font-medium'}`}>
                              {formatTurkishDate(student.last_meeting_date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 text-xs font-normal flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 shrink-0" />
                            <span>Hiç görüşülmedi</span>
                          </span>
                        )}
                      </td>

                      {/* Hedef & Teşhis Etiketleri */}
                      <td className="align-middle py-3.5 px-4">
                        <div className="space-y-1 max-w-sm">
                          {student.target_goal && (
                            <div className="text-xs font-semibold text-slate-900 dark:text-zinc-200 truncate">
                              {student.target_goal}
                            </div>
                          )}

                          {student.status_flags && student.status_flags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/80">
                                {student.status_flags[0]}
                              </span>
                              {student.status_flags.length > 1 && (
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate max-w-[160px]">
                                  {student.status_flags.slice(1).join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Aksiyonlar (Temiz, çerçevesiz, hover-vurgulu butonlar) */}
                      <td className="align-middle py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Schedule */}
                          <button
                            type="button"
                            onClick={() => onQuickScheduleStudent(student)}
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-zinc-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            title="Bugüne seans planla"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Direct Chat */}
                          <button
                            type="button"
                            onClick={() => handleOpenDirectChat(student)}
                            className="p-2 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            title="WhatsApp mesajı"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Past Meeting History */}
                          <button
                            type="button"
                            onClick={() => setHistoryStudent(student)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Geçmiş seanslar"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Edit Profile */}
                          <button
                            type="button"
                            onClick={() => setEditingStudent(student)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Student */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`${student.full_name} kaydını silmek istediğinize emin misiniz?`)) {
                                onDeleteStudent(student.id);
                                onShowToast('Öğrenci Silindi', student.full_name, 'info');
                              }
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          allSessions={sessions}
          counselorName={counselorName}
          onClose={() => setHistoryStudent(null)}
        />
      )}

      {/* Edit Modal */}
      {editingStudent && (
        <StudentProfileModal
          student={editingStudent}
          onSave={(data, id) => {
            onSaveStudent(data, id);
            setEditingStudent(null);
            onShowToast('Öğrenci Güncellendi', data.full_name, 'success');
          }}
          onClose={() => setEditingStudent(null)}
        />
      )}

      {/* Add New Student Modal */}
      {isAddModalOpen && (
        <StudentProfileModal
          onSave={(data) => {
            onSaveStudent(data);
            setIsAddModalOpen(false);
            onShowToast('Yeni Öğrenci Eklendi', data.full_name, 'success');
          }}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
}
