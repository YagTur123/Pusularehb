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
} from 'lucide-react';
import { StorageService } from '../lib/storage';

interface HeaderProps {
  activeTab: 'scheduler' | 'students';
  setActiveTab: (tab: 'scheduler' | 'students') => void;
  onOpenBroadcast: () => void;
  onOpenSmartPaste: () => void;
  onOpenCommandPalette: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  refreshData: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  onOpenBroadcast,
  onOpenSmartPaste,
  onOpenCommandPalette,
  onShowToast,
  refreshData,
}: HeaderProps) {
  const [counselorName, setCounselorName] = useState(() => StorageService.getCounselorName());
  const [isEditingCounselor, setIsEditingCounselor] = useState(false);
  const [editNameInput, setEditNameInput] = useState(counselorName);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (backupMenuRef.current && !backupMenuRef.current.contains(event.target as Node)) {
        setShowBackupMenu(false);
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
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <Compass className="w-4 h-4 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                  Pusula <span className="text-slate-400 font-normal">Rehberlik</span>
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.4 Pro
                </span>
              </div>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('scheduler')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'scheduler'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Günlük Seanslar</span>
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'students'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Öğrenci Portalı & Risk Radarı</span>
            </button>
          </nav>
        </div>

        {/* Center / Search trigger */}
        <div className="flex-1 max-w-xs hidden lg:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors group"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
              <span>Öğrenci, seans veya komut ara...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-800 border border-slate-700 text-slate-400">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Quick Command button on mobile */}
          <button
            onClick={onOpenCommandPalette}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            title="Komut Paleti (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Smart Paste (Excel/WhatsApp) */}
          <button
            onClick={onOpenSmartPaste}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Excel veya WhatsApp'tan toplu öğrenci yapıştır"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Toplu İçe Aktar</span>
          </button>

          {/* Backup dropdown */}
          <div className="relative" ref={backupMenuRef}>
            <button
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Veri Yedekleme & Dışa Aktarma"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Yedekle</span>
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg bg-slate-900 border border-slate-800 shadow-xl shadow-slate-950/60 p-1.5 z-50 text-xs animate-in fade-in">
                <button
                  onClick={handleExportJson}
                  className="w-full text-left px-2.5 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>JSON Yedeği İndir</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full text-left px-2.5 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                  <span>Excel (CSV) İndir</span>
                </button>
                <div className="h-px bg-slate-800 my-1" />
                <label className="w-full cursor-pointer text-left px-2.5 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2">
                  <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
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

          {/* WhatsApp Group Broadcast Trigger */}
          <button
            onClick={onOpenBroadcast}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm shadow-emerald-950/40 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 fill-white/20" />
            <span>Grup İlanı</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-emerald-700/60 text-[10px] font-mono border border-emerald-500/40">
              ⌘↵
            </kbd>
          </button>

          {/* Counselor Name / Profile pill */}
          <div className="relative pl-1 border-l border-slate-800 hidden xl:block">
            {isEditingCounselor ? (
              <form onSubmit={handleSaveCounselor} className="flex items-center gap-1">
                <input
                  type="text"
                  value={editNameInput}
                  onChange={(e) => setEditNameInput(e.target.value)}
                  className="px-2 py-1 rounded bg-slate-900 border border-indigo-500 text-xs text-white focus:outline-none w-48"
                  autoFocus
                  placeholder="Danışman Adı..."
                />
                <button
                  type="submit"
                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setEditNameInput(counselorName);
                  setIsEditingCounselor(true);
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
                title="Danışman adını değiştirmek için tıklayın"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate max-w-[140px]">{counselorName}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950 px-2 py-1">
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded ${
            activeTab === 'scheduler' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Seans Programı</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded ${
            activeTab === 'students' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Öğrenci Rehberi</span>
        </button>
      </div>
    </header>
  );
}
