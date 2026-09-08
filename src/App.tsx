import { useState, useEffect, useCallback } from 'react';
import { Student, Session } from './types';
import { StorageService, getTodayDateString } from './lib/storage';
import { generateGroupBroadcastText } from './lib/whatsapp';
import { Header } from './components/Header';
import { RiskRadarBar, RiskFilter } from './components/RiskRadarBar';
import { DailyScheduler } from './components/DailyScheduler';
import { StudentCRMDirectory } from './components/StudentCRMDirectory';
import { GroupBroadcastModal } from './components/GroupBroadcastModal';
import { SmartPasteModal } from './components/SmartPasteModal';
import { CommandPalette } from './components/CommandPalette';
import { StudentProfileModal } from './components/StudentProfileModal';
import { StudentHistoryModal } from './components/StudentHistoryModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scheduler' | 'students'>('scheduler');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [sessions, setSessions] = useState<Session[]>(() => StorageService.getSessions());
  const [counselorName, setCounselorName] = useState<string>(() => StorageService.getCounselorName());

  // Risk filter state
  const [activeRiskFilter, setActiveRiskFilter] = useState<RiskFilter>('none');

  // Modals state
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, description?: string, type: 'success' | 'info' | 'warning' = 'info') => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 4);
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshData = useCallback(() => {
    setStudents(StorageService.getStudents());
    setSessions(StorageService.getSessions());
    setCounselorName(StorageService.getCounselorName());
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd/Ctrl + K -> Open Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }

      // Cmd/Ctrl + Enter -> Copy WhatsApp Group Broadcast message to clipboard
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const currentSessions = StorageService.getSessions();
        const currentStudents = StorageService.getStudents();
        const counselor = StorageService.getCounselorName();

        const text = generateGroupBroadcastText(
          selectedDate,
          currentSessions.filter((s) => s.date === selectedDate),
          currentStudents,
          counselor
        );

        try {
          await navigator.clipboard.writeText(text);
          showToast(
            'Grup İlanı Panoya Kopyalandı (⌘↵)',
            'WhatsApp için ASCII formatlı günlük seans tablosu hazır.',
            'success'
          );
        } catch {
          setIsBroadcastModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate, showToast]);

  // Session Handlers
  const handleUpdateSession = (updatedSession: Session) => {
    StorageService.updateSession(updatedSession);
    setSessions(StorageService.getSessions());
    setStudents(StorageService.getStudents());
  };

  const handleDeleteSession = (id: string) => {
    StorageService.deleteSession(id);
    setSessions(StorageService.getSessions());
    showToast('Seans Silindi', 'Kayıt takvimden kaldırıldı.', 'info');
  };

  const handleAddSession = (newSessionData: Omit<Session, 'id' | 'created_at'>) => {
    StorageService.addSession(newSessionData);
    setSessions(StorageService.getSessions());
  };

  const handleFillStandardSlots = (date: string) => {
    const updated = StorageService.fillStandardSlotsForDate(date);
    setSessions(updated);
    showToast(
      'Standart Seanslar Oluşturuldu',
      `${date} tarihi için 40 dakikalık periyotlar takvime eklendi.`,
      'success'
    );
  };

  // Student Handlers
  const handleSaveStudent = (
    studentData: Omit<Student, 'id' | 'created_at'>,
    studentId?: string
  ) => {
    if (studentId) {
      const existing = students.find((s) => s.id === studentId);
      if (existing) {
        StorageService.updateStudent({ ...existing, ...studentData });
      }
    } else {
      StorageService.addStudent(studentData);
    }
    setStudents(StorageService.getStudents());
  };

  const handleDeleteStudent = (id: string) => {
    StorageService.deleteStudent(id);
    setStudents(StorageService.getStudents());
    setSessions(StorageService.getSessions());
  };

  // Quick schedule student from CRM to first empty slot of selected date or create one
  const handleQuickScheduleStudent = (student: Student) => {
    const currentSessions = StorageService.getSessions();
    const dateSessions = currentSessions.filter((s) => s.date === selectedDate);
    const emptySlot = dateSessions.find((s) => !s.student_id);

    if (emptySlot) {
      const updated: Session = {
        ...emptySlot,
        student_id: student.id,
        tags: student.status_flags || [],
        topic: student.status_flags?.[0] ? `${student.status_flags[0]} Analizi` : 'TYT Net Takibi',
      };
      StorageService.updateSession(updated);
      setSessions(StorageService.getSessions());
      setActiveTab('scheduler');
      showToast(
        'Randevu Atandı',
        `${student.full_name}, ${selectedDate} saat ${emptySlot.time_slot} seansına yerleştirildi.`,
        'success'
      );
    } else {
      // Create new session slot for next hour
      const newTime = '16:00';
      StorageService.addSession({
        date: selectedDate,
        time_slot: newTime,
        student_id: student.id,
        topic: student.status_flags?.[0] ? `${student.status_flags[0]} Analizi` : 'TYT Net Takibi',
        action_items: '',
        tags: student.status_flags || [],
        status: 'Bekliyor',
      });
      setSessions(StorageService.getSessions());
      setActiveTab('scheduler');
      showToast(
        'Yeni Randevu Oluşturuldu',
        `${student.full_name} için ${selectedDate} saat ${newTime} seansı açıldı.`,
        'success'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Linear Style Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
        onOpenSmartPaste={() => setIsSmartPasteOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onShowToast={showToast}
        refreshData={refreshData}
      />

      {/* Risk Radar & Analytics Bar */}
      <RiskRadarBar
        students={students}
        sessions={sessions}
        selectedDate={selectedDate}
        activeRiskFilter={activeRiskFilter}
        onSelectRiskFilter={setActiveRiskFilter}
        onGoToStudentsTab={() => setActiveTab('students')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {activeTab === 'scheduler' ? (
          <DailyScheduler
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            sessions={sessions}
            students={students}
            counselorName={counselorName}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
            onAddSession={handleAddSession}
            onFillStandardSlots={handleFillStandardSlots}
            onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
            onShowToast={showToast}
            onOpenStudentProfile={(st) => setSelectedStudentForHistory(st)}
          />
        ) : (
          <StudentCRMDirectory
            students={students}
            sessions={sessions}
            counselorName={counselorName}
            activeRiskFilter={activeRiskFilter}
            onClearRiskFilter={() => setActiveRiskFilter('none')}
            onSaveStudent={handleSaveStudent}
            onDeleteStudent={handleDeleteStudent}
            onShowToast={showToast}
            onQuickScheduleStudent={handleQuickScheduleStudent}
          />
        )}
      </main>

      {/* Global Group Broadcast WhatsApp Modal */}
      {isBroadcastModalOpen && (
        <GroupBroadcastModal
          date={selectedDate}
          sessions={sessions.filter((s) => s.date === selectedDate)}
          students={students}
          counselorName={counselorName}
          onClose={() => setIsBroadcastModalOpen(false)}
          onShowToast={showToast}
        />
      )}

      {/* Smart Paste Excel/WhatsApp Modal */}
      {isSmartPasteOpen && (
        <SmartPasteModal
          onClose={() => setIsSmartPasteOpen(false)}
          onImportComplete={() => {
            refreshData();
          }}
          onShowToast={showToast}
        />
      )}

      {/* Universal Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        students={students}
        onSelectStudent={(student) => {
          setSelectedStudentForHistory(student);
        }}
        onFillStandardSlots={handleFillStandardSlots}
        onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
        onOpenSmartPaste={() => setIsSmartPasteOpen(true)}
        onAddStudent={() => {
          setSelectedStudentForProfile(null);
          setActiveTab('students');
        }}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setActiveTab('scheduler');
        }}
        onExportJson={() => {
          const json = StorageService.exportBackupJson();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pusula_yedek_${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Yedek İndirildi', 'JSON dosyası kaydedildi.', 'success');
        }}
        onExportCsv={() => {
          const csv = StorageService.exportToCsv();
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `pusula_ogrenciler_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Excel/CSV Dışa Aktarıldı', 'Öğrenci listesi kaydedildi.', 'success');
        }}
      />

      {/* Student History Quick Modal (when triggered from scheduler or command palette) */}
      {selectedStudentForHistory && (
        <StudentHistoryModal
          student={selectedStudentForHistory}
          allSessions={sessions}
          counselorName={counselorName}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
