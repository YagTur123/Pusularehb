import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Building2,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { AuthService } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: (user: User, actionType: 'signin' | 'signup') => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

const ROLES: UserRole[] = [
  'Rehber Öğretmen & Psikolojik Danışman',
  'YKS / LGS Öğrenci Koçu',
  'Eğitim Danışmanı',
  'Okul Yöneticisi',
];

export function AuthModal({
  isOpen,
  initialMode = 'signin',
  onClose,
  onSuccess,
  onShowToast,
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);

  // Sign In states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up states
  const [signUpName, setSignUpName] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('Rehber Öğretmen & Psikolojik Danışman');
  const [signUpSchool, setSignUpSchool] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPasswordConfirm, setSignUpPasswordConfirm] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // General states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMessage('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    setIsSubmitting(true);
    const result = AuthService.signIn(signInEmail, signInPassword);
    setIsSubmitting(false);

    if (result.success && result.user) {
      onShowToast('Hoş Geldiniz!', `${result.user.name} olarak giriş yapıldı.`, 'success');
      onSuccess(result.user, 'signin');
      onClose();
    } else {
      setErrorMessage(result.error || 'Giriş yapılamadı.');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setErrorMessage('Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    if (signUpPassword.length < 6) {
      setErrorMessage('Şifreniz en az 6 karakterden oluşmalıdır.');
      return;
    }

    if (signUpPassword !== signUpPasswordConfirm) {
      setErrorMessage('Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }

    setIsSubmitting(true);
    const result = AuthService.signUp({
      name: signUpName,
      email: signUpEmail,
      password: signUpPassword,
      role: signUpRole,
      school: signUpSchool,
      phone: signUpPhone,
    });
    setIsSubmitting(false);

    if (result.success && result.user) {
      onShowToast(
        'Hesabınız Oluşturuldu!',
        `${result.user.name} başarıyla sisteme kaydedildi.`,
        'success'
      );
      onSuccess(result.user, 'signup');
      onClose();
    } else {
      setErrorMessage(result.error || 'Kayıt işlemi gerçekleştirilemedi.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!forgotEmail.trim() || !newPassword) {
      setErrorMessage('Lütfen e-posta ve yeni şifrenizi giriniz.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    const res = AuthService.resetPassword(forgotEmail, newPassword);
    if (res.success) {
      onShowToast('Şifre Güncellendi', 'Yeni şifrenizle giriş yapabilirsiniz.', 'success');
      setSignInEmail(forgotEmail);
      setSignInPassword(newPassword);
      setMode('signin');
    } else {
      setErrorMessage(res.error || 'Şifre güncellenemedi.');
    }
  };

  const handleDemoLogin = (roleType: 'counselor' | 'coach') => {
    const user = AuthService.quickDemoLogin(roleType);
    onShowToast('Demo Girişi Başarılı', `${user.name} olarak oturum açıldı.`, 'success');
    onSuccess(user, 'signin');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0b0d13] border border-slate-200 dark:border-white/[0.12] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 dark:text-zinc-200 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#08090f]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 flex items-center justify-center dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                {mode === 'signin' && 'Danışman Girişi'}
                {mode === 'signup' && 'Yeni Danışman Kaydı'}
                {mode === 'forgot' && 'Şifre Sıfırlama'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Pusula Rehberlik & Danışmanlık Yönetimi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Giriş Yap / Kayıt Ol) */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-slate-200 dark:border-white/[0.06] bg-slate-100/70 dark:bg-[#090b11] p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-white/[0.02]'
              }`}
            >
              Giriş Yap (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-white/[0.02]'
              }`}
            >
              Kayıt Ol (Sign Up)
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <div className="flex-1 leading-tight">{errorMessage}</div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SIGN IN VIEW                                             */}
        {/* ======================================================== */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="ornek@okul.k12.tr"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Şifre
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  Şifremi unuttum?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showSignInPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 active:scale-[0.99] text-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>Giriş Yap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Demo Logins */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/[0.06] space-y-2">
              <span className="text-[11px] text-slate-500 dark:text-zinc-500 block font-medium">
                ⚡ Hızlı Test & Demo Girişi:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('counselor')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] dark:border-white/[0.06] text-left transition-colors cursor-pointer group"
                >
                  <span className="block text-[11px] font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                    Rehber Öğretmen
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-zinc-500 truncate">
                    Uzm. Psk. Dan. Yağız Efe
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('coach')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] dark:border-white/[0.06] text-left transition-colors cursor-pointer group"
                >
                  <span className="block text-[11px] font-semibold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                    YKS Koçu
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-zinc-500 truncate">
                    Merve Aydın
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* SIGN UP VIEW                                             */}
        {/* ======================================================== */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                Ad Soyad <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Örn: Uzm. Psk. Dan. Elif Yılmaz"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Ünvan / Rol <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <select
                    value={signUpRole}
                    onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Okul / Kurum Adı
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={signUpSchool}
                    onChange={(e) => setSignUpSchool(e.target.value)}
                    placeholder="Örn: Atatürk Anadolu Lisesi"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  E-posta <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="ornek@okul.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
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
                    type="tel"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    placeholder="0532 123 45 67"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Şifre <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="En az 6 karakter"
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                  >
                    {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">
                  Şifre Tekrarı <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpPasswordConfirm}
                    onChange={(e) => setSignUpPasswordConfirm(e.target.value)}
                    placeholder="Şifreyi onaylayın"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 active:scale-[0.99] text-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <span>Hesap Oluştur ve Başla</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* FORGOT PASSWORD VIEW                                     */}
        {/* ======================================================== */}
        {mode === 'forgot' && (
          <form onSubmit={handleResetPassword} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Kayıtlı E-posta Adresiniz
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="ornek@okul.k12.tr"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Yeni Şifre
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500/50 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 text-xs font-semibold transition-colors cursor-pointer"
              >
                Şifreyi Sıfırla
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
