import { useState, useEffect, useCallback } from 'react';
import { Student, Session, User, ScheduleConfig } from './types';
import { StorageService, getTodayDateString } from './lib/storage';
import { AuthService } from './lib/auth';
import { generateGroupBroadcastText, copyToClipboard } from './lib/whatsapp';
import { Header } from './components/Header';
import { RiskRadarBar, RiskFilter } from './components/RiskRadarBar';
import { DailyScheduler } from './components/DailyScheduler';
import { StudentCRMDirectory } from './components/StudentCRMDirectory';
import { GroupBroadcastModal } from './components/GroupBroadcastModal';
import { SmartPasteModal } from './components/SmartPasteModal';
import { CommandPalette } from './components/CommandPalette';
import { StudentHistoryModal } from './components/StudentHistoryModal';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scheduler' | 'students'>('scheduler');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [sessions, setSessions] = useState<Session[]>(() => StorageService.getSessions());

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [counselorName, setCounselorName] = useState<string>(
    () => currentUser?.name || StorageService.getCounselorName()
  );

  // Risk filter state
  const [activeRiskFilter, setActiveRiskFilter] = useState<RiskFilter>('none');

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

  // Theme state ('light' by default per user request: "Beyaz tema yap ama karanlık tema ekle")
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pusula_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('pusula_theme', theme);
  }, [theme]);

  // Modals state
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastDate, setBroadcastDate] = useState<string>(() => getTodayDateString());
  const [isSmartPasteOpen, setIsSmartPasteOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);

  const handleOpenBroadcast = useCallback((date?: string) => {
    setBroadcastDate(date || selectedDate);
    setIsBroadcastModalOpen(true);
  }, [selectedDate]);

  // Auth Handlers
  const handleOpenAuth = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleAuthSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setCounselorName(user.name);
    StorageService.setCounselorName(user.name);
    setStudents(StorageService.getStudents());
    setSessions(StorageService.getSessions());
  }, []);

  const handleSignOut = useCallback(() => {
    AuthService.signOut();
    setCurrentUser(null);
    showToast(
      'Oturum Kapatıldı',
      'Misafir modundasınız. Seans çizelgenizi özelleştirmek için giriş yapabilirsiniz.',
      'info'
    );
  }, [showToast]);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    setCounselorName(updatedUser.name);
  }, []);

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

      // Cmd/Ctrl + D -> Toggle between Scheduler and Students Directory
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'scheduler' ? 'students' : 'scheduler'));
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

        const success = await copyToClipboard(text);
        if (success) {
          showToast(
            'Grup İlanı Panoya Kopyalandı (⌘↵)',
            'WhatsApp için profesyonel günlük seans tablosu hazır.',
            'success'
          );
        } else {
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

  const handleFillStandardWeek = (baseDate: string) => {
    const updated = StorageService.fillStandardSlotsForWeek(baseDate);
    setSessions(updated);
    showToast(
      'Haftalık Standart Seanslar Hazırlandı',
      'Pazartesi-Cuma aralığındaki tüm okul günlerine 40 dakikalık periyotlar takvime eklendi.',
      'success'
    );
  };

  const handleApplyScheduleConfig = (
    dates: string[],
    config: ScheduleConfig,
    keepAssigned: boolean
  ) => {
    const updated = StorageService.applyScheduleConfigToDates(dates, config, keepAssigned);
    setSessions(updated);
  };

  const handleShiftTime = (dates: string[], deltaMinutes: number) => {
    const updated = StorageService.shiftSessionsTime(dates, deltaMinutes);
    setSessions(updated);
  };

  const handleAddBreak = (date: string, timeSlot: string, title?: string) => {
    const updated = StorageService.addBreakSession(date, timeSlot, title);
    setSessions(updated);
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
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-[#121319] text-zinc-200' : 'light bg-slate-50 text-slate-900'} flex flex-col selection:bg-emerald-500/20`}>
      {/* Linear Style Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
        onOpenSmartPaste={() => setIsSmartPasteOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onShowToast={showToast}
        refreshData={refreshData}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Guest Mode Notice Bar (if not logged in) */}
      {!currentUser && (
        <div className="bg-slate-100 dark:bg-[#161822] border-b border-slate-200 dark:border-white/[0.08] px-4 sm:px-6 py-2 text-xs flex flex-wrap items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              <strong className="text-slate-900 dark:text-zinc-100 font-semibold">Misafir Modu:</strong> Seansları kendi adınız ve okulunuzla yönetmek, WhatsApp ilanlarında ünvanınızı kullanmak için giriş yapın.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAuth('signin')}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 dark:hover:text-white dark:border-transparent text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => handleOpenAuth('signup')}
              className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium cursor-pointer transition-colors shadow-2xs"
            >
              Kayıt Ol
            </button>
          </div>
        </div>
      )}

      {/* Risk Radar & Analytics Bar - ONLY on Students tab */}
      {activeTab === 'students' && (
        <RiskRadarBar
          students={students}
          sessions={sessions}
          selectedDate={selectedDate}
          activeRiskFilter={activeRiskFilter}
          onSelectRiskFilter={setActiveRiskFilter}
          onGoToStudentsTab={() => setActiveTab('students')}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4">
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
            onFillStandardWeek={handleFillStandardWeek}
            onApplyScheduleConfig={handleApplyScheduleConfig}
            onShiftTime={handleShiftTime}
            onAddBreak={handleAddBreak}
            onOpenBroadcast={handleOpenBroadcast}
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
          date={broadcastDate}
          allSessions={sessions}
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
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
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

      {/* Authentication Modal (Sign In / Sign Up / Forgot Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onShowToast={showToast}
      />

      {/* Counselor User Profile & Settings Modal */}
      {isProfileModalOpen && currentUser && (
        <UserProfileModal
          user={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateUser={handleUpdateUser}
          onSignOut={handleSignOut}
          onShowToast={showToast}
          studentsCount={students.length}
          sessionsCount={sessions.length}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
