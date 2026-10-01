import { useState, useEffect, useCallback, useRef } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { AlertTriangle } from 'lucide-react';
import { auth } from './lib/firebase';
import { Student, Session, User, ScheduleConfig } from './types';
import { StorageService, getTodayDateString, shiftTimeSlotString } from './lib/storage';
import { AuthService } from './lib/auth';
import { DEMO_USER, createDemoStudents, createDemoSessions } from './lib/demoData';
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
import { KvkkConsentModal } from './components/KvkkConsentModal';
import { LandingPage } from './components/LandingPage';
import { ToastContainer, ToastMessage } from './components/Toast';
import { QuickStudentModal } from './components/QuickStudentModal';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isQuickStudentModalOpen, setIsQuickStudentModalOpen] = useState(false);

  // Real-time Cloud Save & Connectivity Status ('saved' | 'saving' | 'offline')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'saved'
  );

  useEffect(() => {
    const handleOnline = () => setSaveStatus('saved');
    const handleOffline = () => setSaveStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Application data state (only populated when user is authenticated or in demo)
  const [activeTab, setActiveTab] = useState<'scheduler' | 'students'>('scheduler');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [counselorName, setCounselorName] = useState<string>('Rehberlik & Psikolojik Danışmanlık Birimi');

  // Risk filter state
  const [activeRiskFilter, setActiveRiskFilter] = useState<RiskFilter>('none');

  // Real Toast notifications & Undo Stack (6s window, Ctrl+Z)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const undoStackRef = useRef<Array<{ label: string; undo: () => Promise<void> | void }>>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const performUndo = useCallback(async () => {
    const item = undoStackRef.current.pop();
    if (item) {
      try {
        await item.undo();
        showToast('İşlem Geri Alındı', item.label, 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Hata oluştu';
        showToast('Geri Alma Başarısız', msg, 'warning');
      }
    }
  }, []);

  const showToast = useCallback(
    (
      title: string,
      description?: string,
      type: 'success' | 'info' | 'warning' = 'info',
      action?: { label: string; onClick: () => void },
      duration = 4000
    ) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, title, description, type, action, duration }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const registerUndo = useCallback(
    (label: string, undoFn: () => Promise<void> | void, title = 'İşlem Yapıldı', description?: string) => {
      undoStackRef.current.push({ label, undo: undoFn });
      showToast(
        title,
        description,
        'info',
        {
          label: 'Geri Al',
          onClick: () => {
            performUndo();
          },
        },
        6000 // 6-second undo window
      );
    },
    [showToast, performUndo]
  );

  // Demo Handlers: Completely in-memory, zero network/Firebase requests
  const handleStartDemo = useCallback(() => {
    const today = getTodayDateString();
    const demoStudents = createDemoStudents();
    const demoSessions = createDemoSessions(demoStudents, today);
    StorageService.initDemo(demoStudents, demoSessions, 'Demo Danışman');
    setIsDemo(true);
    setCurrentUser(DEMO_USER);
    setStudents(demoStudents);
    setSessions(demoSessions);
    setCounselorName('Demo Danışman');
    setIsAuthModalOpen(false);
    showToast(
      'Demo Modu Başlatıldı',
      'Tüm veriler yalnızca bu sekmenin RAM belleğinde tutulmaktadır. Sayfa yenilendiğinde sıfırlanır.',
      'info'
    );
  }, [showToast]);

  const handleExitDemo = useCallback(() => {
    setIsDemo(false);
    StorageService.clear();
    setCurrentUser(null);
    setStudents([]);
    setSessions([]);
    showToast('Demo Modundan Çıkıldı', 'Oturum sonlandırıldı.', 'info');
  }, [showToast]);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pusula_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('palette-warm');
    root.classList.add('palette-corporate');
    root.setAttribute('data-palette', 'corporate');

    root.classList.remove('light', 'dim', 'dark');
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('color-scheme', 'dark');
    } else {
      root.classList.add('light');
      root.setAttribute('color-scheme', 'light');
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

  // 1. Firebase Authentication Listener (onAuthStateChanged via AuthService)
  useEffect(() => {
    const unsubscribeAuth = AuthService.onAuthStateChange((user, rawUser) => {
      // Do not let background auth changes overwrite active in-memory demo
      if (StorageService.isDemo()) {
        return;
      }
      setCurrentUser(user);
      setIsEmailVerified(rawUser ? rawUser.emailVerified : true);
      setAuthLoading(false);

      if (user) {
        setCounselorName(user.name);
        // Initialize Firestore real-time subcollections for this authenticated counselor
        StorageService.init(user.id);
      } else {
        // Logged out: clear application data from memory
        StorageService.clear();
        setStudents([]);
        setSessions([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Data Subscription
  useEffect(() => {
    if (!currentUser) return;

    const unsubData = StorageService.onChange(() => {
      setStudents(StorageService.getStudents());
      setSessions(StorageService.getSessions());
      setCounselorName(StorageService.getCounselorName());
    });

    const unsubError = StorageService.onError((errMsg) => {
      showToast('Veritabanı Hatası', errMsg, 'warning');
    });

    return () => {
      unsubData();
      unsubError();
    };
  }, [currentUser, showToast]);

  // KVKK Consent Handler
  const handleAcceptKvkk = useCallback(async () => {
    if (!currentUser) return;
    const success = await AuthService.acceptKvkkConsent(currentUser.id);
    if (success) {
      setCurrentUser((prev) => (prev ? { ...prev, kvkk_accepted: true } : null));
      showToast('KVKK Onaylandı', 'Aydınlatma metnini onayladınız. Hoş geldiniz.', 'success');
    } else {
      showToast('Hata', 'KVKK onayı kaydedilemedi. Lütfen tekrar deneyiniz.', 'warning');
    }
  }, [currentUser, showToast]);

  const handleOpenBroadcast = useCallback(
    (date?: string) => {
      setBroadcastDate(date || selectedDate);
      setIsBroadcastModalOpen(true);
    },
    [selectedDate]
  );

  // Auth Handlers
  const handleOpenAuth = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const handleAuthSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setCounselorName(user.name);
    StorageService.init(user.id);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (isDemo) {
      handleExitDemo();
      return;
    }
    await AuthService.signOut();
    setCurrentUser(null);
    StorageService.clear();
    setStudents([]);
    setSessions([]);
    showToast('Oturum Kapatıldı', 'Güvenli çıkış yapıldı.', 'info');
  }, [isDemo, handleExitDemo, showToast]);

  const handleUpdateUser = useCallback((updatedUser: User) => {
    setCurrentUser(updatedUser);
    setCounselorName(updatedUser.name);
  }, []);

  const refreshData = useCallback(() => {
    if (!currentUser) return;
    setStudents(StorageService.getStudents());
    setSessions(StorageService.getSessions());
    setCounselorName(StorageService.getCounselorName());
  }, [currentUser]);

  // Global Keyboard Shortcuts (only active when logged in)
  useEffect(() => {
    if (!currentUser) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      // 1. Command Palette: ⌘K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }

      // 2. Switch Tab: ⌘D
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'scheduler' ? 'students' : 'scheduler'));
      }

      // 3. Undo: ⌘Z (Ctrl+Z)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
        if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA' && !(e.target as HTMLElement)?.isContentEditable) {
          if (undoStackRef.current.length > 0) {
            e.preventDefault();
            performUndo();
          }
        }
      }

      // 4. Quick Student Modal: ⌘Shift+N (Ctrl+Shift+N)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickStudentModalOpen(true);
      }

      // 5. Quick New Session: ⌘N (Ctrl+N without Shift)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const currentSessions = StorageService.getSessions().filter((s) => s.date === selectedDate);
        let nextTime = '09:00';
        if (currentSessions.length > 0) {
          const last = currentSessions[currentSessions.length - 1];
          nextTime = shiftTimeSlotString(last.time_slot, 15);
        }
        await handleAddSession({
          date: selectedDate,
          time_slot: nextTime,
          student_id: null,
          topic: '',
          action_items: '',
          tags: [],
          status: 'Bekliyor',
        });
        showToast('Yeni Seans Slotu Açıldı (⌘N)', `${selectedDate} saat ${nextTime} için seans eklendi.`, 'success');
      }

      // 6. Broadcast Announcement Copy: ⌘Enter
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
            'WhatsApp için seans tablosu hazır.',
            'success'
          );
        } else {
          setIsBroadcastModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, selectedDate, showToast, performUndo]);

  // Email Verification Handlers
  const handleResendEmailVerification = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    try {
      await sendEmailVerification(fbUser);
      showToast(
        'Doğrulama E-postası Gönderildi',
        `${fbUser.email} adresine doğrulama bağlantısı yollandı. Lütfen gelen kutunuzu kontrol ediniz.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'E-posta gönderilemedi.';
      showToast('Gönderilemedi', msg, 'warning');
    }
  };

  const handleCheckEmailVerified = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    try {
      await fbUser.reload();
      if (fbUser.emailVerified) {
        setIsEmailVerified(true);
        showToast('E-posta Doğrulandı', 'Hesabınız başarıyla doğrulandı.', 'success');
      } else {
        showToast('Henüz Doğrulanmadı', 'Lütfen e-postanıza gönderilen onay bağlantısına tıklayınız.', 'info');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Doğrulama durumu kontrol edilemedi.';
      showToast('Hata', msg, 'warning');
    }
  };

  // Session Handlers
  const handleUpdateSession = async (updatedSession: Session) => {
    try {
      setSaveStatus('saving');
      await StorageService.updateSession(updatedSession);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'Güncelleme hatası';
      showToast('Seans Güncellenemedi', msg, 'warning');
    }
  };

  const handleUpdateMultipleSessions = async (updatedList: Session[]) => {
    try {
      setSaveStatus('saving');
      await StorageService.updateMultipleSessions(updatedList);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'Güncelleme hatası';
      showToast('Seanslar Güncellenemedi', msg, 'warning');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const sess = sessions.find((s) => s.id === id);
      setSaveStatus('saving');
      await StorageService.deleteSession(id);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');

      if (sess) {
        registerUndo(
          `${sess.time_slot} seansı`,
          async () => {
            await StorageService.addSession({
              date: sess.date,
              time_slot: sess.time_slot,
              student_id: sess.student_id,
              topic: sess.topic,
              action_items: sess.action_items,
              tags: sess.tags,
              status: sess.status,
              next_followup_date: sess.next_followup_date,
              is_break: sess.is_break,
              break_title: sess.break_title,
              break_duration: sess.break_duration,
              feedback: sess.feedback,
              whatsapp_sent: sess.whatsapp_sent,
            });
          },
          'Seans Silindi',
          `${sess.time_slot} seansı takvimden kaldırıldı.`
        );
      } else {
        showToast('Seans Silindi', 'Kayıt takvimden kaldırıldı.', 'info');
      }
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'Silme hatası';
      showToast('Seans Silinemedi', msg, 'warning');
    }
  };

  const handleAddSession = async (newSessionData: Omit<Session, 'id' | 'created_at'>) => {
    try {
      setSaveStatus('saving');
      await StorageService.addSession(newSessionData);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'Ekleme hatası';
      showToast('Seans Eklenemedi', msg, 'warning');
    }
  };

  const handleFillStandardSlots = async (date: string) => {
    try {
      setSaveStatus('saving');
      await StorageService.fillStandardSlotsForDate(date);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      showToast(
        'Standart Seanslar Oluşturuldu',
        `${date} tarihi için seans periyotları takvime eklendi.`,
        'success'
      );
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'İşlem hatası';
      showToast('Hata', msg, 'warning');
    }
  };

  const handleFillStandardWeek = async (baseDate: string) => {
    try {
      setSaveStatus('saving');
      await StorageService.fillStandardSlotsForWeek(baseDate);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      showToast(
        'Haftalık Standart Seanslar Hazırlandı',
        'Pazartesi-Cuma aralığındaki tüm okul günlerine periyotlar takvime eklendi.',
        'success'
      );
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'İşlem hatası';
      showToast('Hata', msg, 'warning');
    }
  };

  const handleApplyScheduleConfig = async (
    dates: string[],
    config: ScheduleConfig,
    keepAssigned: boolean
  ) => {
    try {
      setSaveStatus('saving');
      await StorageService.applyScheduleConfigToDates(dates, config, keepAssigned);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      showToast('Çizelge Ayarı Uygulandı', 'Seans süreleri ve molalar güncellendi.', 'success');
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'İşlem hatası';
      showToast('Hata', msg, 'warning');
    }
  };

  const handleShiftTime = async (dates: string[], deltaMinutes: number) => {
    try {
      setSaveStatus('saving');
      await StorageService.shiftSessionsTime(dates, deltaMinutes);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      showToast('Saatler Kaydırıldı', `${deltaMinutes} dakika kaydırma uygulandı.`, 'info');
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'İşlem hatası';
      showToast('Hata', msg, 'warning');
    }
  };

  const handleAddBreak = async (date: string, timeSlot: string, title?: string) => {
    try {
      setSaveStatus('saving');
      await StorageService.addBreakSession(date, timeSlot, title);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'Mola eklenemedi';
      showToast('Mola Eklenemedi', msg, 'warning');
    }
  };

  // Student Handlers
  const handleSaveStudent = async (
    studentData: Omit<Student, 'id' | 'created_at'>,
    studentId?: string
  ) => {
    try {
      setSaveStatus('saving');
      if (studentId) {
        const existing = students.find((s) => s.id === studentId);
        if (existing) {
          await StorageService.updateStudent({ ...existing, ...studentData });
          setSaveStatus(navigator.onLine ? 'saved' : 'offline');
          showToast('Öğrenci Güncellendi', studentData.full_name, 'success');
        }
      } else {
        await StorageService.addStudent(studentData);
        setSaveStatus(navigator.onLine ? 'saved' : 'offline');
        showToast('Yeni Öğrenci Eklendi', studentData.full_name, 'success');
      }
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'Kaydetme hatası';
      showToast('Öğrenci Kaydedilemedi', msg, 'warning');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    try {
      const st = students.find((s) => s.id === id);
      setSaveStatus('saving');
      await StorageService.deleteStudent(id);
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');

      if (st) {
        registerUndo(
          `${st.full_name} kaydı`,
          async () => {
            await StorageService.addStudent({
              full_name: st.full_name,
              class_grade: st.class_grade,
              phone: st.phone,
              last_meeting_date: st.last_meeting_date,
              status_flags: st.status_flags,
              target_goal: st.target_goal,
              notes: st.notes,
            });
          },
          'Öğrenci Silindi',
          `${st.full_name} kaydı kaldırıldı.`
        );
      } else {
        showToast('Öğrenci Silindi', 'Kayıt ve seans ilişkisi kaldırıldı.', 'info');
      }
    } catch (err: unknown) {
      setSaveStatus(navigator.onLine ? 'saved' : 'offline');
      const msg = err instanceof Error ? err.message : 'Silme hatası';
      showToast('Öğrenci Silinemedi', msg, 'warning');
    }
  };

  const handleQuickScheduleStudent = async (student: Student) => {
    const currentSessions = StorageService.getSessions();
    const dateSessions = currentSessions.filter((s) => s.date === selectedDate);
    const emptySlot = dateSessions.find((s) => !s.student_id);

    if (emptySlot) {
      const updated: Session = {
        ...emptySlot,
        student_id: student.id,
        tags: student.status_flags || [],
        topic: student.status_flags?.[0] ? `${student.status_flags[0]} Analizi` : 'Görüşme Seansı',
      };
      await handleUpdateSession(updated);
      setActiveTab('scheduler');
      showToast(
        'Randevu Atandı',
        `${student.full_name}, ${selectedDate} saat ${emptySlot.time_slot} seansına yerleştirildi.`,
        'success'
      );
    } else {
      const newTime = '16:00';
      await handleAddSession({
        date: selectedDate,
        time_slot: newTime,
        student_id: student.id,
        topic: student.status_flags?.[0] ? `${student.status_flags[0]} Analizi` : 'Görüşme Seansı',
        action_items: '',
        tags: student.status_flags || [],
        status: 'Bekliyor',
      });
      setActiveTab('scheduler');
      showToast(
        'Yeni Randevu Oluşturuldu',
        `${student.full_name} için ${selectedDate} saat ${newTime} seansı açıldı.`,
        'success'
      );
    }
  };

  // Loading Screen while Firebase Auth initializes
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-[#171717] text-stone-900 dark:text-stone-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Pusula Rehberlik Portalı Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // GUEST / UN-AUTHENTICATED VIEW:
  // Shows ONLY Landing Page and Login/Sign-up modals. No student data is exposed!
  if (!currentUser && !isDemo) {
    return (
      <div className="min-h-screen flex flex-col selection:bg-teal-500/20 bg-stone-50 dark:bg-[#171717] text-stone-900 dark:text-stone-100 transition-colors">
        <Header
          activeTab="scheduler"
          setActiveTab={() => {}}
          onOpenBroadcast={() => handleOpenAuth('signin')}
          onOpenSmartPaste={() => handleOpenAuth('signin')}
          onOpenCommandPalette={() => handleOpenAuth('signin')}
          onShowToast={showToast}
          refreshData={() => {}}
          currentUser={null}
          onOpenAuth={handleOpenAuth}
          onOpenProfile={() => handleOpenAuth('signin')}
          onSignOut={() => {}}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1">
          <LandingPage
            onLaunchWorkspace={() => handleOpenAuth('signin')}
            onOpenAuth={handleOpenAuth}
            onStartDemo={handleStartDemo}
            onOpenBroadcast={() => handleOpenAuth('signin')}
            onOpenSmartPaste={() => handleOpenAuth('signin')}
            onOpenCommandPalette={() => handleOpenAuth('signin')}
            onShowToast={showToast}
          />
        </main>

        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          onShowToast={showToast}
          onStartDemo={handleStartDemo}
        />

        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // AUTHENTICATED COUNSELOR VIEW / DEMO MODE VIEW:
  return (
    <div className={`min-h-screen flex flex-col selection:bg-teal-500/20 bg-stone-50 dark:bg-[#171717] text-stone-900 dark:text-stone-100 transition-colors ${isDemo ? 'pt-8' : ''}`}>
      {/* Demo Mode Top Static Banner */}
      {isDemo && (
        <div className="fixed top-0 inset-x-0 z-50 bg-stone-900 text-stone-100 text-xs py-1.5 px-4 flex items-center justify-between shadow-md print:hidden border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-semibold text-stone-100">Demo modu: veriler kaydedilmez</span>
            <span className="hidden sm:inline text-stone-400 text-[11px]">— Değişiklikler yalnızca bu sekmenin belleğinde tutulur, yenilenince sıfırlanır.</span>
          </div>
          <button
            type="button"
            onClick={handleExitDemo}
            className="px-2.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
          >
            Çıkış
          </button>
        </div>
      )}

      {/* Email Verification Warning Banner for Unverified Accounts */}
      {!isDemo && currentUser && !isEmailVerified && (
        <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              E-posta adresiniz (<strong>{currentUser.email}</strong>) henüz doğrulanmamış. Lütfen gelen kutunuzdaki onay bağlantısına tıklayın.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResendEmailVerification}
              className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors cursor-pointer shadow-xs text-xs"
            >
              Tekrar Gönder
            </button>
            <button
              type="button"
              onClick={handleCheckEmailVerified}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-medium transition-colors cursor-pointer text-xs"
            >
              Kontrol Et
            </button>
          </div>
        </div>
      )}

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
        saveStatus={saveStatus}
      />

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
            onUpdateMultipleSessions={handleUpdateMultipleSessions}
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
            onOpenSmartPaste={() => setIsSmartPasteOpen(true)}
          />
        )}
      </main>

      {/* Group Broadcast WhatsApp Modal */}
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

      {/* Student History Modal */}
      {selectedStudentForHistory && (
        <StudentHistoryModal
          student={selectedStudentForHistory}
          allSessions={sessions}
          counselorName={counselorName}
          onClose={() => setSelectedStudentForHistory(null)}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onShowToast={showToast}
        onStartDemo={handleStartDemo}
      />

      {/* Counselor Profile & Settings Modal (includes KVKK Export and Delete Account) */}
      {isProfileModalOpen && (
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

      {/* KVKK Mandatory Consent Modal on first login (never in demo mode) */}
      {!isDemo && currentUser && !currentUser.kvkk_accepted && (
        <KvkkConsentModal
          isOpen={true}
          counselorName={currentUser.name}
          onAccept={handleAcceptKvkk}
        />
      )}

      {/* Quick Student Modal (⌘Shift+N / Ctrl+Shift+N) */}
      <QuickStudentModal
        isOpen={isQuickStudentModalOpen}
        onClose={() => setIsQuickStudentModalOpen(false)}
        onSaveStudent={handleSaveStudent}
        onShowToast={showToast}
      />

      {/* Real Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
