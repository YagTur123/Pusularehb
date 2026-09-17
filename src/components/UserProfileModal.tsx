import React, { useState } from 'react';
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
  Check,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { AuthService } from '../lib/auth';

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated = AuthService.updateProfile({
      name: name.trim(),
      role,
      school: school.trim(),
      phone: phone.trim(),
    });

    if (updated) {
      onUpdateUser(updated);
      onShowToast('Profil Güncellendi', 'Danışman bilgileri başarıyla kaydedildi.', 'success');
      onClose();
    }
  };

  const handleLogoutClick = () => {
    AuthService.signOut();
    onSignOut();
    onClose();
    onShowToast('Oturum Kapatıldı', 'Güvenli bir şekilde çıkış yapıldı.', 'info');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-xs animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0b0d13] border border-slate-200 dark:border-white/[0.12] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 dark:text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#08090f]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-inner ${
                user.avatar_color || 'bg-emerald-600 text-white'
              }`}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">{user.name}</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">{user.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 p-6 pb-2">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 block">Kayıtlı Öğrenci</span>
              <span className="text-base font-semibold text-slate-900 dark:text-white">{studentsCount}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 block">Toplam Seans</span>
              <span className="text-base font-semibold text-slate-900 dark:text-white">{sessionsCount}</span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="p-6 pt-3 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
              Danışman Ad Soyad
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
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
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Kurum / Okul
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
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
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
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
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Telefon
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0532 123 45 67"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:border-rose-500/30 dark:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Çıkış Yap</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Kapat
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
