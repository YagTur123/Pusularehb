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
} from 'lucide-react';
import { displayPhone, formatTurkishDate } from '../lib/storage';
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

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Öğrenci adı, sınıf, telefon veya teşhis ara..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sınıf Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
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
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 max-w-[160px] truncate"
          >
            <option value="all">Tüm Teşhis Etiketleri</option>
            {DIAGNOSTIC_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          {/* Active Risk Radar indication badge */}
          {activeRiskFilter !== 'none' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <span>
                Filtre: {activeRiskFilter === 'uncontacted_20d' ? '20+ Gündür Görüşülmeyenler' : 'Randevu Kaçıranlar'}
              </span>
              <button
                onClick={onClearRiskFilter}
                className="text-amber-400 hover:text-white font-bold ml-1"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Add Student Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Yeni Öğrenci Ekle</span>
        </button>
      </div>

      {/* Students Table */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/60 shadow-xl shadow-slate-950/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4">Öğrenci & Sınıf</th>
                <th className="py-2.5 px-4">Telefon</th>
                <th className="py-2.5 px-4">Son Görüşme</th>
                <th className="py-2.5 px-4">Hedef & Teşhis Etiketleri</th>
                <th className="py-2.5 px-4 text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Kriterlere uygun öğrenci kaydı bulunamadı.
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
                      className="group hover:bg-slate-900/40 transition-colors"
                    >
                      {/* Name & Grade */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setHistoryStudent(student)}
                            className="font-semibold text-white hover:text-indigo-400 text-left hover:underline"
                          >
                            {student.full_name}
                          </button>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                            {student.class_grade}
                          </span>
                          {isUncontacted20d && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                              title="20+ gündür görüşülmedi"
                            />
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{displayPhone(student.phone)}</span>
                        </div>
                      </td>

                      {/* Son Görüşme */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {student.last_meeting_date ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isUncontacted20d ? 'text-amber-400' : 'text-slate-500'}`} />
                            <span className={isUncontacted20d ? 'text-amber-300 font-medium' : 'text-slate-300'}>
                              {formatTurkishDate(student.last_meeting_date)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-400 text-[11px] font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Hiç görüşülmedi
                          </span>
                        )}
                      </td>

                      {/* Hedef & Teşhis Etiketleri */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {student.target_goal && (
                            <div className="flex items-center gap-1 text-[11px] text-indigo-300 font-medium truncate max-w-xs">
                              <Target className="w-3 h-3 shrink-0 text-indigo-400" />
                              <span className="truncate">{student.target_goal}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1">
                            {student.status_flags.map((flag) => (
                              <span
                                key={flag}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-800"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Aksiyonlar */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Schedule */}
                          <button
                            onClick={() => onQuickScheduleStudent(student)}
                            className="p-1.5 rounded-md bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 hover:text-indigo-200 text-xs transition-colors"
                            title="Bu öğrenciye günün ilk boş seansını ata"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Direct Chat */}
                          <button
                            onClick={() => handleOpenDirectChat(student)}
                            className="p-1.5 rounded-md bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-400 text-xs transition-colors"
                            title="WhatsApp sohbeti başlat"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Past Meeting History */}
                          <button
                            onClick={() => setHistoryStudent(student)}
                            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                            title="Görüşme geçmişini görüntüle"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Profile */}
                          <button
                            onClick={() => setEditingStudent(student)}
                            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
                            title="Öğrenci bilgilerini düzenle"
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
                            className="p-1.5 rounded-md text-slate-600 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                            title="Öğrenciyi sil"
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
