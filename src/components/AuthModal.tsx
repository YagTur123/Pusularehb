import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  GraduationCap,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { AuthService } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: (user: User, actionType: 'signin' | 'signup') => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  onStartDemo?: () => void;
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
  onStartDemo,
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
  const [resetSentSuccess, setResetSentSuccess] = useState(false);

  // General states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signInEmail.trim() || !signInPassword) {
      setErrorMessage('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    setIsSubmitting(true);
    const result = await AuthService.signInWithEmail(signInEmail, signInPassword);
    setIsSubmitting(false);

    if (result.success && result.user) {
      onShowToast('Giriş Yapıldı', `${result.user.name} olarak oturum açıldı.`, 'success');
      onSuccess(result.user, 'signin');
      onClose();
    } else {
      setErrorMessage(result.error || 'Giriş yapılamadı.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await AuthService.signInWithGoogle();
    setIsSubmitting(false);

    if (result.success && result.user) {
      onShowToast('Google ile Giriş Yapıldı', `${result.user.name} olarak oturum açıldı.`, 'success');
      onSuccess(result.user, 'signin');
      onClose();
    } else if (result.error) {
      setErrorMessage(result.error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPassword) {
      setErrorMessage('Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    if (signUpPassword.length < 10) {
      setErrorMessage('Şifreniz en az 10 karakterden oluşmalıdır.');
      return;
    }

    if (signUpPassword !== signUpPasswordConfirm) {
      setErrorMessage('Girdiğiniz şifreler birbiriyle uyuşmuyor.');
      return;
    }

    setIsSubmitting(true);
    const result = await AuthService.signUpWithEmail({
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
        `${result.user.name} başarıyla kaydedildi. E-posta adresinize doğrulama bağlantısı gönderildi.`,
        'success'
      );
      onSuccess(result.user, 'signup');
      onClose();
    } else {
      setErrorMessage(result.error || 'Kayıt işlemi gerçekleştirilemedi.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResetSentSuccess(false);

    if (!forgotEmail.trim()) {
      setErrorMessage('Lütfen e-posta adresinizi giriniz.');
      return;
    }

    setIsSubmitting(true);
    const res = await AuthService.sendPasswordReset(forgotEmail);
    setIsSubmitting(false);

    if (res.success) {
      setResetSentSuccess(true);
      onShowToast('Sıfırlama Bağlantısı Gönderildi', 'Lütfen e-postanızı kontrol ediniz.', 'info');
    } else {
      setErrorMessage(res.error || 'Şifre sıfırlama bağlantısı gönderilemedi.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg max-w-md w-full overflow-hidden text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-teal-50 border border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id="auth-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                {mode === 'signin' && 'Danışman Girişi'}
                {mode === 'signup' && 'Yeni Danışman Kaydı'}
                {mode === 'forgot' && 'Şifre Sıfırlama'}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Pusula Rehberlik & Danışmanlık Yönetimi
              </p>
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

        {/* Tab Switcher (Giriş Yap / Kayıt Ol) */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900/60 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:border-stone-700'
                  : 'text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              Kayıt Ol
            </button>
          </div>
        )}

        {/* Google One-Click Login */}
        {mode !== 'forgot' && (
          <div className="px-6 pt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-black dark:border-white/10 bg-white dark:bg-[#12141e] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-900 dark:text-white text-xs font-bold flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google ile Giriş Yap</span>
            </button>

            {onStartDemo && (
              <button
                type="button"
                onClick={() => {
                  onStartDemo();
                  onClose();
                }}
                className="w-full mt-2.5 py-2.5 px-4 rounded-md border border-stone-300 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Demo'yu Dene (Kayıt Olmadan İncele)</span>
              </button>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-zinc-500">
                <span className="bg-white dark:bg-[#0b0d13] px-2">veya e-posta ile</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mb-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
            <div className="flex-1 leading-tight">{errorMessage}</div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SIGN IN VIEW                                             */}
        {/* ======================================================== */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  maxLength={120}
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="ornek@okul.k12.tr"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Şifre
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setResetSentSuccess(false);
                    setForgotEmail(signInEmail);
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
                  maxLength={100}
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black active:scale-[0.99] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span>{isSubmitting ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* SIGN UP VIEW                                             */}
        {/* ======================================================== */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="px-6 pb-6 space-y-3.5 max-h-[65vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Ad Soyad <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="Örn: Uzm. Psk. Dan. Elif Yılmaz"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Ünvan / Rol <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <select
                    value={signUpRole}
                    onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none transition-colors cursor-pointer"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Okul / Kurum
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    maxLength={150}
                    value={signUpSchool}
                    onChange={(e) => setSignUpSchool(e.target.value)}
                    placeholder="Örn: Atatürk Anadolu Lisesi"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  E-posta <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    maxLength={120}
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="ornek@okul.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
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
                    type="tel"
                    maxLength={30}
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    placeholder="0532 123 45 67"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Şifre <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    maxLength={100}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="En az 10 karakter"
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Şifre Onayı <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    maxLength={100}
                    value={signUpPasswordConfirm}
                    onChange={(e) => setSignUpPasswordConfirm(e.target.value)}
                    placeholder="Şifreyi onaylayın"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black active:scale-[0.99] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <span>{isSubmitting ? 'Hesap Açılıyor...' : 'Hesap Oluştur ve Başla'}</span>
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
            {resetSentSuccess ? (
              <div className="space-y-4 text-center py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Şifre Sıfırlama E-postası Gönderildi</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    <strong>{forgotEmail}</strong> adresine şifre sıfırlama talimatları gönderildi. Lütfen gelen kutunuzu ve spam klasörünüzü kontrol ediniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setResetSentSuccess(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-xs transition-colors cursor-pointer"
                >
                  Giriş Ekranına Dön
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Kayıtlı e-posta adresinizi giriniz. Firebase Authentication üzerinden şifrenizi güvenli şekilde sıfırlayabileceğiniz bir bağlantı gönderilecektir.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Kayıtlı E-posta Adresiniz
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      maxLength={120}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="ornek@okul.k12.tr"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#07080d] border border-slate-300 dark:border-white/[0.08] focus:border-emerald-500 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none transition-colors"
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
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-zinc-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-3 rounded-xl bg-black hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-black text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
