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
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#0c0d12] p-2.5 rounded-lg border border-white/[0.07]">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Öğrenci, sınıf veya telefon ara..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[#08090b] border border-white/[0.08] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Sınıf Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-[#08090b] border border-white/[0.08] text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer"
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
            className="px-2.5 py-1.5 rounded-md bg-[#08090b] border border-white/[0.08] text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 max-w-[160px] truncate cursor-pointer"
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
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <span>
                {activeRiskFilter === 'uncontacted_20d' ? '20+ Gün' : 'Gelmeyenler'}
              </span>
              <button
                onClick={onClearRiskFilter}
                className="text-amber-400 hover:text-white font-bold ml-0.5 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* CSV Export Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0e1015] hover:bg-[#12141a] border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="CSV formatında indir"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>CSV İndir</span>
          </button>

          {/* Add Student Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Öğrenci Ekle</span>
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0b0f] shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#090a0f] border-b border-white/[0.06] text-zinc-400 text-xs">
                <th className="py-2 px-3 font-normal">Öğrenci & Sınıf</th>
                <th className="py-2 px-3 font-normal">Telefon</th>
                <th className="py-2 px-3 font-normal">Son Görüşme</th>
                <th className="py-2 px-3 font-normal">Hedef & Etiket</th>
                <th className="py-2 px-3 text-right font-normal">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Öğrenci kaydı bulunamadı.
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
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Name & Grade */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setHistoryStudent(student)}
                            className="font-medium text-zinc-200 hover:text-white text-left hover:underline cursor-pointer"
                          >
                            {student.full_name}
                          </button>
                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                            {student.class_grade}
                          </span>
                          {isUncontacted20d && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-amber-400"
                              title="20+ gündür görüşülmedi"
                            />
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-2.5 px-3 font-mono text-zinc-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-zinc-500" />
                          <span>{displayPhone(student.phone)}</span>
                        </div>
                      </td>

                      {/* Son Görüşme */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {student.last_meeting_date ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isUncontacted20d ? 'text-amber-400' : 'text-zinc-500'}`} />
                            <span className={isUncontacted20d ? 'text-amber-300 font-medium' : 'text-zinc-300'}>
                              {formatTurkishDate(student.last_meeting_date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                            Hiç görüşülmedi
                          </span>
                        )}
                      </td>

                      {/* Hedef & Teşhis Etiketleri */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          {student.target_goal && (
                            <div className="text-[11px] text-zinc-300 font-normal truncate max-w-xs">
                              {student.target_goal}
                            </div>
                          )}

                          {student.status_flags && student.status_flags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                                {student.status_flags[0]}
                              </span>
                              {student.status_flags.length > 1 && (
                                <span className="text-[11px] text-zinc-400 font-normal">
                                  {student.status_flags.slice(1).join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Aksiyonlar */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Schedule */}
                          <button
                            onClick={() => onQuickScheduleStudent(student)}
                            className="p-1.5 rounded-md bg-[#0e1015] hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white text-xs transition-colors cursor-pointer"
                            title="Bugüne seans planla"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Direct Chat */}
                          <button
                            onClick={() => handleOpenDirectChat(student)}
                            className="p-1.5 rounded-md bg-[#0e1015] hover:bg-zinc-800 border border-white/[0.08] text-emerald-400 hover:text-emerald-300 text-xs transition-colors cursor-pointer"
                            title="WhatsApp mesajı"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Past Meeting History */}
                          <button
                            onClick={() => setHistoryStudent(student)}
                            className="p-1.5 rounded-md bg-[#0e1015] hover:bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
                            title="Geçmiş seanslar"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Profile */}
                          <button
                            onClick={() => setEditingStudent(student)}
                            className="p-1.5 rounded-md bg-[#0e1015] hover:bg-zinc-800 border border-white/[0.08] text-zinc-400 hover:text-white text-xs transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Student */}
                          <button
                            onClick={() => {
                              if (confirm(`${student.full_name} kaydını silmek istediğinize emin misiniz?`)) {
                                onDeleteStudent(student.id);
                                onShowToast('Öğrenci Silindi', student.full_name, 'info');
                              }
                            }}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
