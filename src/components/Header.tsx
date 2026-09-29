import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Calendar,
  Users,
  MessageSquare,
  UploadCloud,
  Download,
  Search,
  Check,
  UserCheck,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  LogIn,
  UserPlus,
  LogOut,
  ChevronDown,
  User as UserIcon,
  ShieldCheck,
  Sun,
  Moon,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  Palette,
  Sparkles,
} from 'lucide-react';
import { StorageService } from '../lib/storage';
import { cloudSync, SyncStatus } from '../lib/firebaseSync';
import { User } from '../types';

interface HeaderProps {
  activeTab: 'scheduler' | 'students';
  setActiveTab: (tab: 'scheduler' | 'students') => void;
  onOpenBroadcast: () => void;
  onOpenSmartPaste: () => void;
  onOpenCommandPalette: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  refreshData: () => void;
  currentUser: User | null;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
  onQuickDemoLogin?: (roleType: 'counselor' | 'coach') => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  onOpenBroadcast,
  onOpenSmartPaste,
  onOpenCommandPalette,
  onShowToast,
  refreshData,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
  onQuickDemoLogin,
  theme = 'light',
  onToggleTheme,
}: HeaderProps) {
  const [counselorName, setCounselorName] = useState(() => currentUser?.name || StorageService.getCounselorName());
  const [isEditingCounselor, setIsEditingCounselor] = useState(false);
  const [editNameInput, setEditNameInput] = useState(counselorName);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isCloudEnabled, setIsCloudEnabled] = useState(() => cloudSync.isEnabled());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleToggleCloudSync = async () => {
    if (isCloudEnabled) {
      cloudSync.setEnabled(false);
      setIsCloudEnabled(false);
      onShowToast('Bulut Eşitleme Durduruldu', 'Verileriniz yalnızca bu cihazın yerel hafızasında saklanacaktır.', 'info');
    } else {
      cloudSync.setEnabled(true);
      setIsCloudEnabled(true);
      setIsManualSyncing(true);
      const success = await cloudSync.syncLocalToCloud();
      setIsManualSyncing(false);
      if (success) {
        onShowToast('Bulut Eşitlendi', 'Tüm seanslar ve öğrenci verileri Firebase Firestore bulutunda güncellendi.', 'success');
      } else {
        onShowToast('Bulut Eşitleme', 'Bulut bağlantısı açıldı.', 'info');
      }
    }
  };

  useEffect(() => {
    const unsub = cloudSync.onStatusChange((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser?.name) {
      setCounselorName(currentUser.name);
      setEditNameInput(currentUser.name);
    }
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (backupMenuRef.current && !backupMenuRef.current.contains(event.target as Node)) {
        setShowBackupMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveCounselor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameInput.trim()) return;
    StorageService.setCounselorName(editNameInput.trim());
    setCounselorName(editNameInput.trim());
    setIsEditingCounselor(false);
    onShowToast('Danışman Adı Güncellendi', editNameInput.trim(), 'success');
  };

  const handleExportJson = () => {
    const json = StorageService.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pusula_yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowBackupMenu(false);
    onShowToast('Yedek İndirildi', 'JSON formatında tüm veritabanı dışa aktarıldı.', 'success');
  };

  const handleExportCsv = () => {
    const csv = StorageService.exportToCsv();
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pusula_ogrenciler_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowBackupMenu(false);
    onShowToast('Excel/CSV Dışa Aktarıldı', 'Öğrenci listesi indirildi.', 'success');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const success = StorageService.importBackupJson(content);
        if (success) {
          refreshData();
          onShowToast('Yedek Başarıyla Yüklendi', 'Tüm öğrenci ve seans kayıtları güncellendi.', 'success');
        } else {
          onShowToast('Yükleme Hatası', 'Geçersiz JSON yedek dosyası formatı.', 'warning');
        }
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
    setShowBackupMenu(false);
  };

  return (
    <header className="border-b-2 border-black dark:border-white/[0.1] bg-white/98 dark:bg-[#13151f]/95 backdrop-blur-md sticky top-0 z-30 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo & Linear Breadcrumb */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            {/* Prominent Pusula Logo */}
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-gradient-to-br dark:from-blue-600 dark:to-indigo-700 border-2 border-black dark:border-blue-400/80 flex items-center justify-center text-black dark:text-white shadow-sm transition-transform hover:scale-105">
              <Compass className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-black dark:text-white">
                Pusula
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-black text-white dark:bg-blue-500/20 dark:text-blue-300 border border-black dark:border-blue-400/40">
                Rehberlik
              </span>
              <span className="text-slate-400 dark:text-zinc-600 font-bold">/</span>
              <span className="text-xs text-black dark:text-zinc-300 font-bold">
                {activeTab === 'scheduler' ? 'Seanslar' : 'Öğrenciler'}
              </span>
            </div>
          </div>

          {/* Linear Segmented View Tabs Slider */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-[#181a24] border-2 border-black dark:border-white/20 p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveTab('scheduler')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'scheduler'
                  ? 'bg-white text-black font-extrabold border-2 border-black shadow-2xs dark:border-transparent dark:bg-zinc-800 dark:text-blue-400'
                  : 'text-black hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Seanslar</span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white text-black font-extrabold border-2 border-black shadow-2xs dark:border-transparent dark:bg-zinc-800 dark:text-blue-400'
                  : 'text-black hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 font-semibold'
              }`}
            >
              <Users className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Öğrenciler</span>
            </button>
          </nav>
        </div>

        {/* Center / Linear Search Command Bar */}
        <div className="flex-1 max-w-sm hidden lg:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200/80 dark:bg-[#181a24] dark:hover:bg-[#1d202d] border border-slate-200 dark:border-white/[0.08] text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 text-xs transition-colors group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
              <span className="text-[11px]">Ara veya komut yaz...</span>
            </span>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Smart Paste (Excel/WhatsApp) */}
          <button
            onClick={onOpenSmartPaste}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer shadow-2xs"
            title="Excel veya WhatsApp'tan toplu öğrenci yapıştır"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>İçe Aktar</span>
          </button>

          {/* Backup dropdown */}
          <div className="relative" ref={backupMenuRef}>
            <button
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Yedekleme & Dışa Aktarma"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="hidden sm:inline">Yedekle</span>
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg bg-white dark:bg-[#181a24] border border-slate-200 dark:border-white/[0.08] shadow-xl p-1 z-50 text-xs animate-in fade-in">
                <button
                  onClick={handleExportJson}
                  className="w-full text-left px-2 py-1 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-500" />
                  <span>JSON Yedeği İndir</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full text-left px-2 py-1 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3 text-sky-500" />
                  <span>Excel (CSV) İndir</span>
                </button>
                <div className="h-px bg-slate-200 dark:bg-white/[0.06] my-1" />
                <label className="w-full cursor-pointer text-left px-2 py-1 rounded text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 flex items-center gap-2">
                  <UploadCloud className="w-3 h-3 text-amber-500" />
                  <span>JSON Yükle</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonFile}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Cloud Firestore Sync Toggle Switch ("Slider Anahtar") */}
          <button
            type="button"
            role="switch"
            aria-checked={isCloudEnabled}
            onClick={handleToggleCloudSync}
            disabled={isManualSyncing}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border-2 border-black dark:border-white/20 transition-all cursor-pointer group shadow-2xs select-none"
            title={
              isCloudEnabled
                ? syncStatus === 'syncing' || isManualSyncing
                  ? 'Bulut eşitleme aktif (Eşitleniyor...)'
                  : 'Bulut eşitleme açık ve veriler güvende. Kapatmak için anahtara tıklayın.'
                : 'Bulut eşitleme kapalı (Yalnızca yerel cihaz). Açmak için anahtara tıklayın.'
            }
          >
            <div className="flex items-center gap-1.5">
              {syncStatus === 'syncing' || isManualSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
              ) : isCloudEnabled && (syncStatus === 'synced' || syncStatus !== 'offline') ? (
                <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.2]" />
              ) : (
                <CloudOff className="w-4 h-4 text-slate-500 dark:text-zinc-500 shrink-0 stroke-[2]" />
              )}
              <span className="text-xs font-bold text-black dark:text-zinc-200 hidden md:inline whitespace-nowrap">
                Bulut
              </span>
            </div>

            {/* Belirgin Slider Anahtarı (Prominent Toggle Switch Track & Sliding Knob) */}
            <div
              className={`w-10 h-5.5 rounded-full p-0.5 border-2 transition-colors duration-200 ease-in-out flex items-center shrink-0 shadow-inner ${
                isCloudEnabled && syncStatus !== 'offline'
                  ? syncStatus === 'syncing' || isManualSyncing
                    ? 'bg-amber-500 border-black dark:border-amber-400'
                    : 'bg-emerald-600 border-black dark:bg-emerald-500 dark:border-emerald-400'
                  : 'bg-slate-200 dark:bg-zinc-700 border-black dark:border-zinc-500'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white border border-black/30 shadow-md transform transition-transform duration-200 ease-in-out ${
                  isCloudEnabled && syncStatus !== 'offline' ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {/* Theme Switcher Toggle Switch ("Slider Anahtar" - Açık / Koyu) */}
          {onToggleTheme && (
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={onToggleTheme}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border-2 border-black dark:border-white/20 transition-all cursor-pointer group shadow-2xs select-none"
              title={theme === 'light' ? 'Koyu Temaya Geç (Gece Modu)' : 'Açık Temaya Geç (Gündüz Modu)'}
            >
              <div className="flex items-center gap-1.5">
                {theme === 'light' ? (
                  <Sun className="w-4 h-4 text-amber-500 shrink-0 stroke-[2.4]" />
                ) : (
                  <Moon className="w-4 h-4 text-blue-400 shrink-0 stroke-[2.4]" />
                )}
                <span className="text-xs font-bold text-black dark:text-zinc-200 hidden md:inline whitespace-nowrap">
                  {theme === 'light' ? 'Gündüz' : 'Gece'}
                </span>
              </div>

              {/* Belirgin Slider Anahtarı (Prominent Toggle Switch Track & Sliding Knob) */}
              <div
                className={`w-10 h-5.5 rounded-full p-0.5 border-2 transition-colors duration-200 ease-in-out flex items-center shrink-0 shadow-inner ${
                  theme === 'dark'
                    ? 'bg-blue-600 border-black dark:bg-blue-500 dark:border-blue-400'
                    : 'bg-amber-400 border-black'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white border border-black/30 shadow-md transform transition-transform duration-200 ease-in-out ${
                    theme === 'dark' ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          )}

          {/* Authentication & Counselor Profile */}
          <div className="relative pl-2 border-l-2 border-black dark:border-white/[0.1]" ref={userMenuRef}>
            {currentUser ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] border-2 border-transparent hover:border-black dark:hover:border-white/20 transition-all cursor-pointer group"
                  title={`${currentUser.name} - ${currentUser.role}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full border-2 border-black dark:border-white/30 flex items-center justify-center text-xs font-black shadow-xs ${
                      currentUser.avatar_color || 'bg-black text-white dark:bg-blue-600 dark:text-white'
                    }`}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-extrabold text-black dark:text-white max-w-[130px] truncate leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="block text-[10px] text-slate-700 dark:text-zinc-400 max-w-[130px] truncate leading-tight font-semibold">
                      {currentUser.role.split(' ')[0]}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-black dark:text-zinc-400 group-hover:scale-110 transition-transform stroke-[2.5]" />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-[#0e1017] border border-slate-200 dark:border-white/[0.1] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in duration-100">
                    {/* User Summary Card */}
                    <div className="px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] mb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white truncate text-xs">
                          {currentUser.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate mb-0.5">
                        {currentUser.role}
                      </div>
                      {currentUser.school && (
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1">
                          <span>🏫</span>
                          <span>{currentUser.school}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-1">
                        {currentUser.email}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                      <span>Profili & Kurum Bilgilerini Düzenle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAuth('signin');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      <span>Hesap Değiştir (Giriş Yap)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAuth('signup');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span>Yeni Danışman Hesabı Aç</span>
                    </button>

                    {onQuickDemoLogin && (
                      <div className="pt-1.5 pb-1 border-t border-slate-200 dark:border-white/[0.06] mt-1">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium block px-1 mb-1">
                          ⚡ Demo Profiline Geçiş:
                        </span>
                        <div className="grid grid-cols-2 gap-1 px-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowUserMenu(false);
                              onQuickDemoLogin('counselor');
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all text-center cursor-pointer ${
                              currentUser.id === 'usr_counselor_1'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-500/50 dark:text-emerald-200'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-zinc-300'
                            }`}
                          >
                            Rehber Öğretmen
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowUserMenu(false);
                              onQuickDemoLogin('coach');
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all text-center cursor-pointer ${
                              currentUser.id === 'usr_coach_2'
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 dark:bg-indigo-950/50 dark:border-indigo-500/50 dark:text-indigo-200'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/[0.04] dark:border-white/[0.06] dark:text-zinc-300'
                            }`}
                          >
                            YKS Koçu
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-slate-200 dark:bg-white/[0.06] my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {onQuickDemoLogin && (
                  <div className="hidden lg:flex items-center gap-1 mr-1 bg-slate-100 dark:bg-white/[0.04] px-2 py-1 rounded-md border border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Demo:</span>
                    <button
                      type="button"
                      onClick={() => onQuickDemoLogin('counselor')}
                      className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                      title="Uzm. Psk. Dan. Yağız Efe (Okul Rehberliği)"
                    >
                      Rehberlik
                    </button>
                    <span className="text-slate-300 dark:text-zinc-700 text-[9px]">•</span>
                    <button
                      type="button"
                      onClick={() => onQuickDemoLogin('coach')}
                      className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
                      title="Merve Aydın (YKS Koçluğu)"
                    >
                      Koçluk
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#0e1015] dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/[0.08] text-slate-700 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                  <span>Giriş Yap</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Kayıt Ol</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-[#08090a] px-2 py-1">
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
            activeTab === 'scheduler'
              ? 'bg-white text-slate-900 shadow-2xs dark:bg-zinc-800 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Seanslar</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
            activeTab === 'students'
              ? 'bg-white text-slate-900 shadow-2xs dark:bg-zinc-800 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Öğrenciler</span>
        </button>
      </div>
    </header>
  );
}
