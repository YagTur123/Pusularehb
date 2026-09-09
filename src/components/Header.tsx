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
} from 'lucide-react';
import { StorageService } from '../lib/storage';
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
}: HeaderProps) {
  const [counselorName, setCounselorName] = useState(() => currentUser?.name || StorageService.getCounselorName());
  const [isEditingCounselor, setIsEditingCounselor] = useState(false);
  const [editNameInput, setEditNameInput] = useState(counselorName);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
    <header className="border-b border-white/[0.08] bg-[#13151f]/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        {/* Logo & Linear Breadcrumb */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-200 shadow-xs">
              <Compass className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold tracking-tight text-white">Pusula</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-300 font-medium">
                {activeTab === 'scheduler' ? 'Seanslar' : 'Öğrenciler'}
              </span>
            </div>
          </div>

          {/* Linear Segmented View Tabs */}
          <nav className="hidden md:flex items-center gap-0.5 bg-[#181a24] border border-white/[0.06] p-0.5 rounded-md">
            <button
              onClick={() => setActiveTab('scheduler')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'scheduler'
                  ? 'bg-zinc-800 text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Seanslar</span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-zinc-800 text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Öğrenciler</span>
            </button>
          </nav>
        </div>

        {/* Center / Linear Search Command Bar */}
        <div className="flex-1 max-w-sm hidden lg:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-2.5 py-1 rounded-md bg-[#181a24] hover:bg-[#1d202d] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs transition-colors group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
              <span className="text-[11px]">Ara veya komut yaz...</span>
            </span>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Smart Paste (Excel/WhatsApp) */}
          <button
            onClick={onOpenSmartPaste}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181a24] hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Excel veya WhatsApp'tan toplu öğrenci yapıştır"
          >
            <UploadCloud className="w-3.5 h-3.5 text-zinc-400" />
            <span>İçe Aktar</span>
          </button>

          {/* Backup dropdown */}
          <div className="relative" ref={backupMenuRef}>
            <button
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              className="px-2.5 py-1 rounded-md bg-[#181a24] hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Yedekleme & Dışa Aktarma"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Yedekle</span>
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-1 w-44 rounded-lg bg-[#181a24] border border-white/[0.08] shadow-2xl p-1 z-50 text-xs animate-in fade-in">
                <button
                  onClick={handleExportJson}
                  className="w-full text-left px-2 py-1 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>JSON Yedeği İndir</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full text-left px-2 py-1 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3 text-sky-400" />
                  <span>Excel (CSV) İndir</span>
                </button>
                <div className="h-px bg-white/[0.06] my-1" />
                <label className="w-full cursor-pointer text-left px-2 py-1 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2">
                  <UploadCloud className="w-3 h-3 text-amber-400" />
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

          {/* WhatsApp Group Broadcast Trigger (Calm Soft Style) */}
          <button
            onClick={onOpenBroadcast}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/[0.08] hover:border-white/[0.15] text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp İlanı</span>
            <kbd className="hidden sm:inline-block px-1 py-0.2 rounded bg-zinc-700/70 text-[10px] font-mono text-zinc-300 border border-zinc-600/50">
              ⌘↵
            </kbd>
          </button>

          {/* Authentication & Counselor Profile */}
          <div className="relative pl-2 border-l border-white/[0.08]" ref={userMenuRef}>
            {currentUser ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all cursor-pointer group"
                  title={`${currentUser.name} - ${currentUser.role}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shadow-xs ${
                      currentUser.avatar_color || 'bg-emerald-600 text-white'
                    }`}
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-medium text-zinc-200 group-hover:text-white max-w-[130px] truncate leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="block text-[10px] text-zinc-500 max-w-[130px] truncate leading-tight">
                      {currentUser.role.split(' ')[0]}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-transform" />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-[#0e1017] border border-white/[0.1] shadow-2xl p-1.5 z-50 text-xs animate-in fade-in duration-100">
                    {/* User Summary Card */}
                    <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] mb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white truncate text-xs">
                          {currentUser.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-medium truncate mb-0.5">
                        {currentUser.role}
                      </div>
                      {currentUser.school && (
                        <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                          <span>🏫</span>
                          <span>{currentUser.school}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-500 truncate mt-1">
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
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Profili & Kurum Bilgilerini Düzenle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAuth('signin');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5 text-sky-400" />
                      <span>Hesap Değiştir (Giriş Yap)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenAuth('signup');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Yeni Danışman Hesabı Aç</span>
                    </button>

                    <div className="h-px bg-white/[0.06] my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0e1015] hover:bg-zinc-800 border border-white/[0.08] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Giriş Yap</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
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
      <div className="md:hidden flex items-center justify-around border-t border-white/[0.06] bg-[#08090a] px-2 py-1">
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded ${
            activeTab === 'scheduler' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Seanslar</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium rounded ${
            activeTab === 'students' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Öğrenciler</span>
        </button>
      </div>
    </header>
  );
}
