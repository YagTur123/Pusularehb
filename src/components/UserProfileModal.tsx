import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Building2,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Users,
  LogOut,
  Save,
  Download,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { AuthService } from '../lib/auth';
import { StorageService } from '../lib/storage';
import { auth } from '../lib/firebase';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
  onSignOut: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  studentsCount: number;
  sessionsCount: number;
}

const ROLES: UserRole[] = [
  'Rehber Öğretmen & Psikolojik Danışman',
  'YKS / LGS Öğrenci Koçu',
  'Eğitim Danışmanı',
  'Okul Yöneticisi',
];

export function UserProfileModal({
  user,
  onClose,
  onUpdateUser,
  onSignOut,
  onShowToast,
  studentsCount,
  sessionsCount,
}: UserProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [school, setSchool] = useState(user.school || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  // KVKK Account Deletion confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isGoogleUser = auth.currentUser?.providerData.some((p) => p.providerId === 'google.com');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedName = name.replace(/[<>]/g, '').trim().slice(0, 100);
    const sanitizedSchool = school.replace(/[<>]/g, '').trim().slice(0, 150);
    const sanitizedPhone = phone.replace(/[<>]/g, '').trim().slice(0, 30);

    if (!sanitizedName) return;

    setIsSaving(true);
    const result = await AuthService.updateProfile(user.id, {
      name: sanitizedName,
      role,
      school: sanitizedSchool,
      phone: sanitizedPhone,
    });
    setIsSaving(false);

    if (result.success && result.user) {
      onUpdateUser(result.user);
      onShowToast('Profil Güncellendi', 'Danışman bilgileri başarıyla kaydedildi.', 'success');
      onClose();
    } else {
      onShowToast('Hata', result.error || 'Profil güncellenemedi.', 'warning');
    }
  };

  const handleLogoutClick = async () => {
    await AuthService.signOut();
    onSignOut();
    onClose();
    onShowToast('Oturum Kapatıldı', 'Güvenli bir şekilde çıkış yapıldı.', 'info');
  };

  const handleExportDataJson = () => {
    try {
      const json = StorageService.exportBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pusula_rehberlik_kvkk_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Veriler Dışa Aktarıldı', 'Tüm öğrenci ve seans kayıtlarınız JSON olarak indirildi.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Veri indirilemedi.';
      onShowToast('Dışa Aktarma Hatası', msg, 'warning');
    }
  };

  const handleExportDataCsv = () => {
    try {
      const csv = StorageService.exportToCsv();
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pusula_ogrenci_listesi_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Excel/CSV Dışa Aktarıldı', 'Öğrenci CRM listeniz indirildi.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Veri indirilemedi.';
      onShowToast('Dışa Aktarma Hatası', msg, 'warning');
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmationText.trim().toLowerCase() !== 'sil') {
      setDeleteError('Lütfen onaylamak için kutucuğa "SİL" yazınız.');
      return;
    }

    if (!isGoogleUser && !deletePassword) {
      setDeleteError('Lütfen hesabınızı silmek için mevcut hesap şifrenizi giriniz.');
      return;
    }

    setDeleteError(null);
    setIsDeletingAccount(true);

    const result = await AuthService.deleteAccountAndAllData(user.id, deletePassword);
    setIsDeletingAccount(false);

    if (result.success) {
      onSignOut();
      onClose();
      onShowToast(
        'Hesap ve Veriler Silindi',
        'KVKK unutulma hakkınız uyarınca tüm öğrenci, seans ve kullanıcı kayıtlarınız kalıcı olarak silindi.',
        'info'
      );
    } else {
      setDeleteError(result.error || 'Hesap silinemedi.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg max-w-xl w-full overflow-hidden text-stone-800 dark:text-stone-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-semibold shadow-xs ${
                user.avatar_color || 'bg-teal-600 text-white'
              }`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 id="user-profile-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">{user.name}</h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">{user.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-zinc-500 block">Kayıtlı Öğrenci</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{studentsCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-zinc-500 block">Toplam Seans</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{sessionsCount}</span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
              Danışman Bilgileri
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Danışman Ad Soyad
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Ünvan / Rol
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Kurum / Okul
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    maxLength={150}
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Okul adı"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  E-posta (Salt Okunur)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    disabled
                    value={user.email}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-white/[0.05] rounded-lg text-xs text-slate-500 dark:text-zinc-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0532 123 45 67"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
              </button>
            </div>
          </form>

          {/* KVKK / GDPR Data Management Section - Hidden in Demo Mode */}
          {!StorageService.isDemo() && (
            <>
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span>KVKK Veri Yönetimi & Haklarınız</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  6698 Sayılı Kanun Madde 11 uyarınca, reşit olmayan öğrencilerinize ait kayıtlar dahil olmak üzere tüm verilerinizi taşınabilir formatta indirebilir veya hesabınızı kalıcı olarak silebilirsiniz.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportDataJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Verilerimi Dışa Aktar (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDataCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Öğrencileri İndir (Excel/CSV)</span>
                  </button>
                </div>
              </div>

              {/* Delete Account Warning / Confirmation */}
              <div className="p-4 rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h5 className="font-semibold text-rose-900 dark:text-rose-200">Hesabı ve Tüm Verileri Kalıcı Sil</h5>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                      KVKK unutulma hakkınızı kullanarak sistemdeki tüm öğrenci profilleri, seans notları ve danışman hesabınızı anında ve geri döndürülemez şekilde silebilirsiniz.
                    </p>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-900/30 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hesabımı ve Tüm Verilerimi Sil</span>
                  </button>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-rose-200 dark:border-rose-800 animate-in fade-in">
                    <p className="text-xs text-rose-900 dark:text-rose-200 font-medium">
                      Bu işlem <strong>kesinlikle geri alınamaz</strong>. Onaylamak için lütfen aşağıdaki kutuya <strong>SİL</strong> yazınız:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      placeholder="SİL"
                      className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-rose-300 dark:border-rose-700 rounded-md text-xs font-mono text-rose-900 dark:text-rose-200 focus:outline-none"
                    />

                    {!isGoogleUser ? (
                      <div>
                        <label className="block text-xs font-semibold text-rose-900 dark:text-rose-200 mb-1">
                          Güvenlik Doğrulaması: Mevcut Şifreniz <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Hesap şifrenizi giriniz"
                          className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-rose-300 dark:border-rose-700 rounded-md text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-900/60 p-2 rounded border border-stone-200 dark:border-stone-800">
                        Google ile giriş yaptığınız tespit edildi. Butona tıkladığınızda Google yeniden doğrulama penceresi açılacaktır.
                      </p>
                    )}

                    {deleteError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{deleteError}</p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmationText('');
                          setDeletePassword('');
                          setDeleteError(null);
                        }}
                        className="px-3 py-1.5 rounded-md border border-stone-300 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                      >
                        Vazgeç
                      </button>
                      <button
                        type="button"
                        disabled={
                          isDeletingAccount ||
                          deleteConfirmationText.trim().toLowerCase() !== 'sil' ||
                          (!isGoogleUser && !deletePassword)
                        }
                        onClick={handleDeleteAccountConfirm}
                        className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        {isDeletingAccount ? 'Siliniyor...' : 'Evet, Hesabımı ve Tüm Verilerimi Kalıcı Olarak Sil'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#08090f] shrink-0">
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Oturumu Kapat</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
