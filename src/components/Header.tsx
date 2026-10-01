import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Calendar,
  Users,
  Search,
  Download,
  UploadCloud,
  FileSpreadsheet,
  Sun,
  Moon,
  CloudCheck,
  CloudOff,
  RefreshCw,
  LogOut,
  User as UserIcon,
  ChevronDown,
  MoreHorizontal,
  Settings,
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
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  saveStatus?: 'saved' | 'saving' | 'offline';
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
  theme = 'light',
  onToggleTheme,
  saveStatus = 'saved',
}: HeaderProps) {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [isCloudEnabled, setIsCloudEnabled] = useState(() => cloudSync.isEnabled());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = cloudSync.onStatusChange((status) => {
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowToolsMenu(false);
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleExportJson = () => {
    const json = StorageService.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pusula_yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowToolsMenu(false);
    onShowToast('Yedek İndirildi', 'JSON veritabanı yedeği kaydedildi.', 'success');
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
    setShowToolsMenu(false);
    onShowToast('Excel/CSV İndirildi', 'Öğrenci listesi kaydedildi.', 'success');
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = await StorageService.importBackupJson(content);
        if (res.success) {
          refreshData();
          onShowToast('Yedek Yüklendi', 'Tüm kayıtlar başarıyla güncellendi.', 'success');
        } else {
          onShowToast('Yükleme Hatası', res.error || 'Geçersiz dosya formatı.', 'warning');
        }
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
    setShowToolsMenu(false);
  };

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1A1A1A] sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
        {/* Sol Alan: Logo & Sekmeler */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Compass className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Pusula
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-normal hidden sm:inline">
                Rehberlik
              </span>
            </div>
          </div>

          {/* Sekme Seçici (Seanslar / Öğrenciler) */}
          <nav aria-label="Ana Gezinti" className="flex items-center gap-0.5 sm:gap-1 bg-stone-100 dark:bg-stone-900/60 p-0.5 rounded-md border border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setActiveTab('scheduler')}
              aria-label="Seanslar Sekmesi"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer min-h-[36px] sm:min-h-0 ${
                activeTab === 'scheduler'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Seanslar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              aria-label="Öğrenciler Sekmesi"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer min-h-[36px] sm:min-h-0 ${
                activeTab === 'students'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Öğrenciler</span>
            </button>
          </nav>
        </div>

        {/* Orta Alan: Arama Çubuğu (⌘K) */}
        <div className="flex-1 max-w-sm hidden md:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-2.5 py-1 rounded-md bg-stone-100/80 hover:bg-stone-100 dark:bg-stone-900/60 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300 text-xs transition-colors cursor-pointer"
            aria-label="Komut paletini veya aramayı aç"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Öğrenci veya komut ara...</span>
            </span>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Sağ Alan: Araçlar & Profil */}
        <div className="flex items-center gap-2">
          {/* Kaydetme Durumu Göstergesi */}
          {currentUser && (
            <div className="hidden sm:flex items-center">
              {saveStatus === 'saving' && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-[11px] font-medium text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  <span>Kaydediliyor...</span>
                </div>
              )}
              {saveStatus === 'offline' && (
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-[11px] font-medium text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  title="Çevrimdışısınız. Değişiklikler yerel olarak saklanmaktadır ve internet gelince eşitlenecektir."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Çevrimdışı</span>
                </div>
              )}
              {saveStatus === 'saved' && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-[11px] font-medium text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Kaydedildi</span>
                </div>
              )}
            </div>
          )}

          {/* Mobil Arama Butonu */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="md:hidden p-1.5 rounded-md text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Ara"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Tema Değiştirici */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1.5 rounded-md text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'}
              aria-label={theme === 'light' ? 'Koyu temaya geç' : 'Açık temaya geç'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          {/* Araçlar / Menü (İçe/Dışa Aktar, WhatsApp Duyurusu) */}
          {currentUser && (
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                className="p-1.5 rounded-md text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                title="Araçlar ve Dışa Aktarma"
                aria-label="Araçlar menüsü"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showToolsMenu && (
                <div className="absolute right-0 mt-1 w-52 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 shadow-md p-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      setShowToolsMenu(false);
                      onOpenSmartPaste();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:hover:bg-stone-800/80 flex items-center gap-2 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                    <span>Toplu Öğrenci Yapıştır</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowToolsMenu(false);
                      onOpenBroadcast();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:hover:bg-stone-800/80 flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-stone-500" />
                    <span>WhatsApp Günlük İlanı</span>
                  </button>

                  <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />

                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:hover:bg-stone-800/80 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                    <span>Öğrenci Listesi (CSV)</span>
                  </button>

                  <button
                    onClick={handleExportJson}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:hover:bg-stone-800/80 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                    <span>Tam Veri Yedeği (JSON)</span>
                  </button>

                  <label className="w-full cursor-pointer text-left px-2.5 py-1.5 rounded-md text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:hover:bg-stone-800/80 flex items-center gap-2">
                    <UploadCloud className="w-3.5 h-3.5 text-stone-500" />
                    <span>JSON Yedeği Yükle</span>
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
          )}

          {/* Profil / Oturum Kontrolleri */}
          <div className="relative pl-1" ref={userMenuRef}>
            {currentUser ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left"
                  aria-label="Kullanıcı hesabı menüsü"
                >
                  <div className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-stone-800 dark:text-stone-200 hidden sm:inline max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-1 w-56 rounded-lg bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 shadow-md p-1.5 z-50 text-xs">
                    <div className="px-2 py-1.5 border-b border-stone-200 dark:border-stone-800 mb-1">
                      <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{currentUser.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-md text-stone-700 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-stone-500" />
                      <span>Danışman Profili & Ayarlar</span>
                    </button>

                    <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-md text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Oturumu Kapat</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('signin')}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0F766E] hover:bg-[#0D645E] text-white transition-colors cursor-pointer"
                >
                  Kayıt Ol
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
