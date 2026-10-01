import React, { useState } from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface KvkkConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  counselorName?: string;
}

export function KvkkConsentModal({
  isOpen,
  onAccept,
  counselorName,
}: KvkkConsentModalProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChecked) return;
    setIsSubmitting(true);
    onAccept();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kvkk-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 select-none"
    >
      <div
        className="bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg max-w-lg w-full overflow-hidden text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="w-8 h-8 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 id="kvkk-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              KVKK Aydınlatma Metni ve Veri Güvenliği Taahhüdü
            </h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında
            </p>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Önemli Yasal Bildirim:</strong> Bu sistemde işlenen öğrenci ve görüşme verileri <strong>reşit olmayan bireylere aittir</strong> ve KVKK kapsamında yüksek hassasiyete tabidir.
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto pr-2 space-y-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans border-y border-stone-200 dark:border-stone-800 py-2.5">
            <p>
              Sayın <strong>{counselorName || 'Rehberlik Danışmanı'}</strong>, Pusula Rehberlik Portalı olarak öğrencilerinize ait görüşme notlarının, teşhis etiketlerinin ve iletişim bilgilerinin gizliliğini en üst düzeyde korumaktayız:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-stone-500 dark:text-stone-400">
              <li>
                <strong>Veri İzolasyonu:</strong> Öğrenci ve seans kayıtlarınıza yalnızca Firebase Kimlik Doğrulama (UID) ile sizin hesabınız erişebilir. Başka danışmanlar veya üçüncü taraflar verilerinize kesinlikle ulaşamaz.
              </li>
              <li>
                <strong>Şifrelenmiş Saklama:</strong> Tüm veriler aktarım esnasında TLS ve bulutta AES-256 standardında şifrelenir.
              </li>
              <li>
                <strong>Veri Taşınabilirliği:</strong> Dilediğiniz an profil ayarlarınızdan "Verilerimi Dışa Aktar" seçeneğiyle tüm kayıtlarınızı JSON veya CSV olarak indirebilirsiniz.
              </li>
              <li>
                <strong>Unutulma Hakkı:</strong> Profil ayarlarından "Hesabımı ve Tüm Verilerimi Sil" butonunu kullanarak sistemdeki tüm öğrenci, seans ve hesap verilerinizi geri döndürülemez şekilde silebilirsiniz.
              </li>
            </ul>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-2.5 p-2.5 rounded-md bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 cursor-pointer hover:bg-stone-100/50 dark:hover:bg-stone-800/40 transition-colors">
            <input
              type="checkbox"
              required
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <span className="text-xs text-stone-800 dark:text-stone-200 leading-snug">
              Reşit olmayan öğrencilere ait rehberlik verilerinin KVKK ve ilgili mevzuat uyarınca korunması ve işlenmesine ilişkin aydınlatma metnini okudum, anladım ve kabul ediyorum.
            </span>
          </label>

          {/* Action Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={!isChecked || isSubmitting}
              className={`w-full py-2 px-4 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isChecked
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500 cursor-not-allowed border border-stone-200 dark:border-stone-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Kaydediliyor...' : 'Onaylıyorum ve Devam Et'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
