import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Clock,
  Download,
  UploadCloud,
  UserPlus,
  CheckSquare,
  Square,
  ArrowUpDown,
  Tag,
  Share2,
  Filter,
  X,
  Send,
  CalendarPlus,
  ChevronRight,
} from 'lucide-react';
import { displayPhone, formatTurkishDate, StorageService, getTodayDateString } from '../lib/storage';
import { getWhatsAppDirectUrl, openExternalUrl } from '../lib/whatsapp';
import { StudentHistoryModal } from './StudentHistoryModal';
import { StudentProfileModal } from './StudentProfileModal';
import { StudentDrawer } from './StudentDrawer';
import { RiskFilter } from './RiskRadarBar';

interface StudentCRMDirectoryProps {
  students: Student[];
  sessions: Session[];
  counselorName: string;
  activeRiskFilter: RiskFilter;
  onClearRiskFilter: () => void;
  onSaveStudent: (student: Omit<Student, 'id' | 'created_at'>, id?: string) => void;
  onDeleteStudent: (id: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning', action?: { label: string; onClick: () => void }) => void;
  onQuickScheduleStudent: (student: Student) => void;
  onOpenSmartPaste?: () => void;
}

type SortField = 'name' | 'grade' | 'last_meeting' | 'next_session';
type SortDirection = 'asc' | 'desc';
type QuickFilterType = 'all' | 'uncontacted_30d' | 'uncontacted_20d' | 'missed_this_week' | 'has_next_session' | 'never_contacted';

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
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIdxRef = useRef<number | null>(null);

  // Modals & Drawer state
  const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [batchTagModalOpen, setBatchTagModalOpen] = useState(false);

  // Distinct classes
  const classes = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.class_grade) set.add(s.class_grade);
    });
    return Array.from(set).sort();
  }, [students]);

  const todayStr = getTodayDateString();

  // Next planned session for each student
  const nextSessionMap = useMemo(() => {
    const map = new Map<string, Session>();
    sessions
      .filter((s) => s.student_id && s.date >= todayStr && !s.is_break)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time_slot.localeCompare(b.time_slot))
      .forEach((s) => {
        if (!map.has(s.student_id!)) {
          map.set(s.student_id!, s);
        }
      });
    return map;
  }, [sessions, todayStr]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const missedStudentIds = new Set(
      sessions
        .filter((s) => s.status === 'Gelmedi' && new Date(s.date) >= sevenDaysAgo)
        .map((s) => s.student_id)
        .filter(Boolean)
    );

    let list = students.filter((s) => {
      // Risk radar prop filter
      if (activeRiskFilter === 'uncontacted_20d') {
        if (!s.last_meeting_date) return true;
        if (new Date(s.last_meeting_date) >= twentyDaysAgo) return false;
      } else if (activeRiskFilter === 'missed_this_week') {
        if (!missedStudentIds.has(s.id)) return false;
      }

      // Quick filter preset
      if (quickFilter === 'uncontacted_30d') {
        if (!s.last_meeting_date) return true;
        if (new Date(s.last_meeting_date) >= thirtyDaysAgo) return false;
      } else if (quickFilter === 'uncontacted_20d') {
        if (!s.last_meeting_date) return true;
        if (new Date(s.last_meeting_date) >= twentyDaysAgo) return false;
      } else if (quickFilter === 'missed_this_week') {
        if (!missedStudentIds.has(s.id)) return false;
      } else if (quickFilter === 'has_next_session') {
        if (!nextSessionMap.has(s.id)) return false;
      } else if (quickFilter === 'never_contacted') {
        if (s.last_meeting_date) return false;
      }

      // Class filter
      if (selectedClass !== 'all' && s.class_grade !== selectedClass) {
        return false;
      }

      // Tag filter
      if (selectedTag !== 'all' && !s.status_flags.includes(selectedTag)) {
        return false;
      }

      // Search query
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

    // Sorting
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.full_name.localeCompare(b.full_name, 'tr');
      } else if (sortField === 'grade') {
        cmp = a.class_grade.localeCompare(b.class_grade);
      } else if (sortField === 'last_meeting') {
        const aDate = a.last_meeting_date || '0000-00-00';
        const bDate = b.last_meeting_date || '0000-00-00';
        cmp = bDate.localeCompare(aDate); // newest first by default
      } else if (sortField === 'next_session') {
        const aSess = nextSessionMap.get(a.id);
        const bSess = nextSessionMap.get(b.id);
        const aVal = aSess ? `${aSess.date} ${aSess.time_slot}` : '9999-99-99';
        const bVal = bSess ? `${bSess.date} ${bSess.time_slot}` : '9999-99-99';
        cmp = aVal.localeCompare(bVal);
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [students, sessions, activeRiskFilter, quickFilter, selectedClass, selectedTag, search, sortField, sortDirection, nextSessionMap]);

  // Handle header click to toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Multi-selection with Shift key
  const handleSelectRow = (studentId: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (e.shiftKey && lastSelectedIdxRef.current !== null) {
      const start = Math.min(lastSelectedIdxRef.current, index);
      const end = Math.max(lastSelectedIdxRef.current, index);
      const newSelected = new Set(selectedIds);

      for (let i = start; i <= end; i++) {
        if (filteredStudents[i]) {
          newSelected.add(filteredStudents[i].id);
        }
      }
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(studentId)) {
        newSelected.delete(studentId);
      } else {
        newSelected.add(studentId);
      }
      setSelectedIds(newSelected);
      lastSelectedIdxRef.current = index;
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  // Direct WhatsApp chat
  const handleOpenDirectChat = (student: Student) => {
    const text = `Merhaba ${student.full_name}, Pusula Rehberlik servisinden görüşme planınız için yazıyorum.`;
    const url = getWhatsAppDirectUrl(student.phone, text);
    openExternalUrl(url);
  };

  // Export CSV (Full or Selected)
  const handleExportCsv = (onlySelected = false) => {
    const targetStudents = onlySelected
      ? students.filter((s) => selectedIds.has(s.id))
      : students;

    const headers = ['Ad Soyad', 'Sınıf', 'Telefon', 'Son Görüşme', 'Teşhis Etiketleri', 'Hedef'].map((h) => `"${h}"`);
    const rows = targetStudents.map((s) => [
      `"${s.full_name.replace(/"/g, '""')}"`,
      `"${s.class_grade.replace(/"/g, '""')}"`,
      `"${s.phone.replace(/"/g, '""')}"`,
      `"${s.last_meeting_date || '-'}"`,
      `"${s.status_flags.join(', ')}"`,
      `"${(s.target_goal || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rehberlik_ogrenci_listesi_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast('CSV İndirildi', `${targetStudents.length} öğrenci dışa aktarıldı.`, 'success');
  };

  // Batch action: Apply tag to all selected
  const handleApplyBatchTag = (tag: string) => {
    const targetStudents = students.filter((s) => selectedIds.has(s.id));
    targetStudents.forEach((st) => {
      if (!st.status_flags.includes(tag)) {
        onSaveStudent({
          ...st,
          status_flags: [...st.status_flags, tag],
        }, st.id);
      }
    });
    setBatchTagModalOpen(false);
    onShowToast(
      'Toplu Etiket Eklendi',
      `${selectedIds.size} öğrenciye "${tag}" etiketi tanımlandı.`,
      'success'
    );
  };

  // Batch action: Schedule sessions
  const handleBatchSchedule = () => {
    const targetStudents = students.filter((s) => selectedIds.has(s.id));
    targetStudents.forEach((st) => {
      onQuickScheduleStudent(st);
    });
    onShowToast(
      'Toplu Seans Planlandı',
      `${selectedIds.size} öğrenci için randevu oluşturuldu.`,
      'success'
    );
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-3">
      {/* 1. Filtre Çipleri Şeridi */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 text-xs">
        <span className="text-[11px] font-semibold text-stone-500 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" />
          <span>Filtreler:</span>
        </span>

        <button
          type="button"
          onClick={() => setQuickFilter('all')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
            quickFilter === 'all'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-transparent font-semibold shadow-xs'
              : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-100'
          }`}
        >
          Tümü ({students.length})
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('uncontacted_30d')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
            quickFilter === 'uncontacted_30d'
              ? 'bg-amber-600 text-white border-transparent font-semibold shadow-xs'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
          }`}
        >
          30+ Gündür Görüşülmeyenler
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('missed_this_week')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
            quickFilter === 'missed_this_week'
              ? 'bg-rose-600 text-white border-transparent font-semibold shadow-xs'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
          }`}
        >
          Bu Hafta Gelmeyenler
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('has_next_session')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
            quickFilter === 'has_next_session'
              ? 'bg-teal-700 text-white border-transparent font-semibold shadow-xs'
              : 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800 hover:bg-teal-100'
          }`}
        >
          Yaklaşan Randevusu Olanlar
        </button>

        <button
          type="button"
          onClick={() => setQuickFilter('never_contacted')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
            quickFilter === 'never_contacted'
              ? 'bg-stone-800 text-white border-transparent font-semibold shadow-xs'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:bg-stone-200'
          }`}
        >
          Hiç Görüşülmeyenler
        </button>
      </div>

      {/* 2. Arama ve Sınıf Seçici Çubuğu */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          {/* Arama Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim, sınıf veya hedef ara..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Sınıf Filtresi */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-none cursor-pointer"
            aria-label="Sınıf filtresi"
          >
            <option value="all">Tüm Sınıflar</option>
            {classes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          {/* Etiket Filtresi */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-800 dark:text-stone-200 focus:outline-none max-w-[140px] truncate cursor-pointer"
            aria-label="Teşhis etiketi filtresi"
          >
            <option value="all">Tüm Etiketler</option>
            {DIAGNOSTIC_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Aksiyon Butonları */}
        <div className="flex items-center gap-2">
          {onOpenSmartPaste && (
            <button
              type="button"
              onClick={onOpenSmartPaste}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium transition-colors cursor-pointer"
              title="Excel veya metinden yapıştır"
            >
              <UploadCloud className="w-3.5 h-3.5 text-stone-500" />
              <span className="hidden sm:inline">Toplu İçe Aktar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleExportCsv(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium transition-colors cursor-pointer"
            title="CSV dosyası olarak indir"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">CSV İndir</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Öğrenci Ekle</span>
          </button>
        </div>
      </div>

      {/* 3. Toplu İşlem Çubuğu (Floating Batch Bar) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-lg animate-fadeIn text-xs">
          <div className="flex items-center gap-2 font-semibold">
            <span className="px-2 py-0.5 rounded-md bg-stone-800 dark:bg-stone-200 text-teal-400 dark:text-teal-700 font-mono">
              {selectedIds.size}
            </span>
            <span>Öğrenci Seçildi</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBatchSchedule}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-700 hover:bg-teal-600 text-white font-medium cursor-pointer transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Seans Planla</span>
            </button>

            <button
              type="button"
              onClick={() => setBatchTagModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 dark:bg-stone-200 dark:hover:bg-stone-300 text-white dark:text-stone-900 font-medium cursor-pointer transition-colors"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Etiket Ekle</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportCsv(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-700 dark:bg-stone-200 dark:hover:bg-stone-300 text-white dark:text-stone-900 font-medium cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Seçilenleri İndir</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1 rounded-md border border-stone-700 dark:border-stone-300 hover:bg-stone-800 dark:hover:bg-stone-200 text-stone-300 dark:text-stone-700 transition-colors cursor-pointer"
            >
              Temizle
            </button>
          </div>
        </div>
      )}

      {/* 4. Öğrenci Listesi: Masaüstü Sıralanabilir Tablo / Mobil Yatay Kartlar */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1F1F1F] overflow-hidden">
        {/* Masaüstü Tablo Görünümü */}
        <div className="hidden sm:block overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-stone-50/95 dark:bg-stone-900/95 backdrop-blur-xs border-b border-stone-200 dark:border-stone-800">
              <tr className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 select-none">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                    aria-label="Tümünü seç"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredStudents.length ? (
                      <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </button>
                </th>

                <th className="py-2.5 px-3 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 font-semibold hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                  >
                    <span>Öğrenci Adı</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </button>
                </th>

                <th className="py-2.5 px-3 w-24">
                  <button
                    type="button"
                    onClick={() => handleSort('grade')}
                    className="flex items-center gap-1 font-semibold hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                  >
                    <span>Sınıf</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </button>
                </th>

                <th className="py-2.5 px-3 w-32 font-mono">Telefon</th>

                <th className="py-2.5 px-3 w-36">
                  <button
                    type="button"
                    onClick={() => handleSort('last_meeting')}
                    className="flex items-center gap-1 font-semibold hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                  >
                    <span>Son Görüşme</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </button>
                </th>

                <th className="py-2.5 px-3 w-40">
                  <button
                    type="button"
                    onClick={() => handleSort('next_session')}
                    className="flex items-center gap-1 font-semibold hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
                  >
                    <span>Sonraki Seans</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </button>
                </th>

                <th className="py-2.5 px-3 min-w-[180px]">Hedef & Durum</th>
                <th className="py-2.5 px-3 text-right w-32">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500 text-xs">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p>Kriterlere uygun kayıtlı öğrenci bulunamadı.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D645E] cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Yeni Öğrenci Ekle</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const isSelected = selectedIds.has(student.id);
                  const nextSess = nextSessionMap.get(student.id);

                  const now = new Date();
                  const isUncontacted20d =
                    !student.last_meeting_date ||
                    now.getTime() - new Date(student.last_meeting_date).getTime() > 20 * 86400000;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => setDrawerStudent(student)}
                      className={`hover:bg-stone-50/90 dark:hover:bg-stone-800/50 transition-colors h-11 cursor-pointer ${
                        isSelected ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
                      }`}
                    >
                      {/* Checkbox (Shift-Click Range Support) */}
                      <td className="py-2 px-3 text-center" onClick={(e) => handleSelectRow(student.id, idx, e)}>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400" />
                          )}
                        </button>
                      </td>

                      {/* Ad Soyad */}
                      <td className="py-2 px-3">
                        <span className="font-semibold text-stone-900 dark:text-stone-100 hover:text-teal-700 dark:hover:text-teal-400 text-left truncate block">
                          {student.full_name}
                        </span>
                      </td>

                      {/* Sınıf */}
                      <td className="py-2 px-3 text-stone-600 dark:text-stone-400 font-mono text-[11px]">
                        {student.class_grade || '-'}
                      </td>

                      {/* Telefon */}
                      <td className="py-2 px-3 font-mono text-stone-600 dark:text-stone-400 text-[11px] whitespace-nowrap">
                        {displayPhone(student.phone)}
                      </td>

                      {/* Son Görüşme */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {student.last_meeting_date ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-stone-700 dark:text-stone-300">
                              {formatTurkishDate(student.last_meeting_date)}
                            </span>
                            {isUncontacted20d && (
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" title="20+ gündür görüşülmedi" />
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 dark:text-stone-500 italic">Görüşülmedi</span>
                        )}
                      </td>

                      {/* Sonraki Seans */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {nextSess ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {nextSess.date === todayStr ? 'Bugün' : formatTurkishDate(nextSess.date).split(' ').slice(0, 2).join(' ')} {nextSess.time_slot}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickScheduleStudent(student);
                            }}
                            className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                          >
                            + Seans Planla
                          </button>
                        )}
                      </td>

                      {/* Hedef & Durum */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400 text-xs truncate max-w-xs">
                          {student.target_goal && (
                            <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                              {student.target_goal}
                            </span>
                          )}
                          {student.target_goal && student.status_flags?.length > 0 && (
                            <span aria-hidden="true" className="text-stone-300 dark:text-stone-600">·</span>
                          )}
                          {student.status_flags && student.status_flags.length > 0 && (
                            <span className="text-stone-500 dark:text-stone-400 text-[11px] truncate">
                              {student.status_flags.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* İşlemler */}
                      <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onQuickScheduleStudent(student)}
                            className="p-1.5 rounded-md text-stone-500 hover:text-teal-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                            title="Bugüne seans ata"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDirectChat(student)}
                            className="p-1.5 rounded-md text-stone-500 hover:text-emerald-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                            title="WhatsApp mesajı"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 rounded-md text-stone-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDrawerStudent(student)}
                            className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                            title="Detayları aç"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
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

        {/* Mobil Görünüm: Yatay Kaydırılabilir Kartlar (Min 44px Dokunma Hedefleri) */}
        <div className="block sm:hidden p-3 bg-stone-50/50 dark:bg-stone-900/30">
          {filteredStudents.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-500 space-y-2">
              <p>Kayıtlı öğrenci bulunamadı.</p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="min-h-[44px] px-4 rounded-md bg-[#0F766E] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Öğrenci Ekle</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {filteredStudents.map((student) => {
                const nextSess = nextSessionMap.get(student.id);

                return (
                  <div
                    key={student.id}
                    onClick={() => setDrawerStudent(student)}
                    className="min-w-[280px] max-w-[320px] shrink-0 snap-center p-3.5 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 shadow-xs space-y-2.5 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                          {student.full_name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                          <span className="font-mono">{student.class_grade || 'Sınıf yok'}</span>
                          <span>•</span>
                          <span className="font-mono">{displayPhone(student.phone)}</span>
                        </div>
                      </div>

                      {nextSess && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          {nextSess.time_slot}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] space-y-1 text-stone-600 dark:text-stone-400">
                      <div>Son Görüşme: {student.last_meeting_date ? formatTurkishDate(student.last_meeting_date) : 'Yok'}</div>
                      {student.target_goal && <div>Hedef: {student.target_goal}</div>}
                    </div>

                    {/* Dokunma Hedefleri En Az 44px */}
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-stone-100 dark:border-stone-800" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onQuickScheduleStudent(student)}
                        className="min-h-[44px] rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Seans planla"
                      >
                        <Calendar className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDirectChat(student)}
                        className="min-h-[44px] rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="WhatsApp sohbeti"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDrawerStudent(student)}
                        className="min-h-[44px] rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Panel"
                      >
                        <ChevronRight className="w-4 h-4 text-stone-600" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Slide-Over Öğrenci Yan Paneli (Drawer) */}
      {drawerStudent && (
        <StudentDrawer
          student={drawerStudent}
          allSessions={sessions}
          counselorName={counselorName}
          onClose={() => setDrawerStudent(null)}
          onSaveStudent={(data, id) => {
            onSaveStudent(data, id);
            // keep drawer student synced
            if (id && drawerStudent.id === id) {
              setDrawerStudent({ ...drawerStudent, ...data });
            }
          }}
          onQuickSchedule={onQuickScheduleStudent}
          onShowToast={onShowToast}
        />
      )}

      {/* Silme Onay Modalı (Undo Toast ile desteklenir) */}
      {studentToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setStudentToDelete(null)}
        >
          <div
            className="max-w-md w-full p-5 rounded-lg bg-white dark:bg-[#1E1E1E] border border-stone-200 dark:border-stone-800 shadow-md space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Öğrenci Kaydını Sil
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              <strong>{studentToDelete.full_name}</strong> isimli öğrencinin profili silinecektir.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  const deletedStudent = studentToDelete;
                  onDeleteStudent(deletedStudent.id);
                  onShowToast(
                    'Öğrenci Silindi',
                    deletedStudent.full_name,
                    'info',
                    {
                      label: 'Geri Al',
                      onClick: () => {
                        onSaveStudent({
                          full_name: deletedStudent.full_name,
                          class_grade: deletedStudent.class_grade,
                          phone: deletedStudent.phone,
                          status_flags: deletedStudent.status_flags,
                          last_meeting_date: deletedStudent.last_meeting_date,
                          target_goal: deletedStudent.target_goal,
                          notes: deletedStudent.notes,
                        }, deletedStudent.id);
                      },
                    }
                  );
                  setStudentToDelete(null);
                }}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Etiket Modalı */}
      {batchTagModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setBatchTagModalOpen(false)}
        >
          <div
            className="max-w-md w-full p-5 rounded-lg bg-white dark:bg-[#1E1E1E] border border-stone-200 dark:border-stone-800 shadow-md space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Seçili {selectedIds.size} Öğrenciye Etiket Ekle
            </h3>
            <p className="text-xs text-stone-500">
              Tanımlanacak teşhis veya takip etiketini seçin:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1">
              {DIAGNOSTIC_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleApplyBatchTag(tag)}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-stone-100 hover:bg-teal-50 hover:text-teal-800 dark:bg-stone-800 dark:hover:bg-teal-950/60 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setBatchTagModalOpen(false)}
                className="px-3 py-1.5 rounded-md border border-stone-200 text-xs font-medium cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geçmiş Modalı */}
      {historyStudent && (
        <StudentHistoryModal
          student={historyStudent}
          allSessions={sessions}
          counselorName={counselorName}
          onClose={() => setHistoryStudent(null)}
        />
      )}

      {/* Düzenleme Modalı */}
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

      {/* Yeni Öğrenci Ekleme Modalı */}
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
