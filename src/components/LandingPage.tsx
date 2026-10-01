import { useState } from 'react';
import {
  Calendar,
  MessageSquare,
  ArrowRight,
  Check,
  Copy,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  ExternalLink,
  Sparkles,
  Printer,
  Database,
  Lock,
} from 'lucide-react';
import { getTodayDateString, formatTurkishDate } from '../lib/storage';

interface LandingPageProps {
  onLaunchWorkspace: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onStartDemo?: () => void;
  onOpenBroadcast: () => void;
  onOpenSmartPaste: () => void;
  onOpenCommandPalette: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function LandingPage({
  onLaunchWorkspace,
  onOpenAuth,
  onStartDemo,
  onOpenBroadcast,
  onOpenSmartPaste,
  onShowToast,
}: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'scheduler' | 'ascii' | 'summary'>('scheduler');
  const [copiedAscii, setCopiedAscii] = useState(false);

  const sampleAsciiText = `[REHBERLİK SERVİSİ | GÜNLÜK SEANS PROGRAMI]
Tarih: ${formatTurkishDate(getTodayDateString())}
Danışman: Uzm. Psk. Dan. Mehmet Kaya
\`\`\`
+-------+--------------------+----------------+
| SAAT  | ÖĞRENCİ            | KONU           |
+-------+--------------------+----------------+
| 09:00 | Ahmet Yılmaz (12-A)| TYT Geometri   |
| 09:45 | Zeynep Demir (12-B)| Paragraf Rutin |
| 10:30 | Can Bozkurt (Mezun)| AYT Matematik  |
| 11:15 | Elif Yıldız (12-C) | Sınav Kaygısı  |
| 13:00 | Berke Öz (11-A)    | Alan Seçimi    |
+-------+--------------------+----------------+
\`\`\`

Görüşmesi Olan Öğrenciler:
@+905324182914 (Ahmet Yılmaz)
@+905438201945 (Zeynep Demir)
@+905056714289 (Can Bozkurt)
@+905359124038 (Elif Yıldız)
@+905362948172 (Berke Öz)

* Lütfen randevu saatinizden 5 dakika önce rehberlik odasında hazır bulununuz.`;

  const handleCopyAscii = async () => {
    try {
      await navigator.clipboard.writeText(sampleAsciiText);
      setCopiedAscii(true);
      onShowToast('Tablo Kopyalandı', 'WhatsApp grubuna yapıştırmaya hazır.', 'success');
      setTimeout(() => setCopiedAscii(false), 2000);
    } catch {
      onOpenBroadcast();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16 text-stone-900 dark:text-stone-100">
      {/* 1. HERO BÖLÜMÜ */}
      <section className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium border border-stone-200 dark:border-stone-700">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
          <span>MEB Standartlarında Rehberlik & Psikolojik Danışma Çalışma Masası</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
          Rehberlik seans çizelgesi, resmi A4 çıktısı ve öğrenci takip sistemi.
        </h1>

        <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 leading-relaxed max-w-2xl">
          Okul psikolojik danışmanları ve rehber öğretmenler için: Günlük seans saatlerini belirleyin, WhatsApp gruplarında kaymayan sabit genişlikli monospace randevu duyurusu oluşturun, siyah-beyaz yazıcı uyumlu resmi A4 görüşme defteri çıktısı alın ve öğrenci görüşme kayıtlarını yönetin.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onLaunchWorkspace}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Giriş Yap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {onStartDemo && (
            <button
              type="button"
              onClick={onStartDemo}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              title="Kayıt olmadan, yalnızca bellekte çalışan demo verileriyle inceleyin"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
              <span>Demo'yu Dene</span>
            </button>
          )}

          {onOpenAuth && (
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="px-3.5 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Yeni Danışman Hesabı Aç
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAscii}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium transition-colors cursor-pointer"
          >
            {copiedAscii ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAscii ? 'Kopyalandı' : 'Örnek WhatsApp Çıktısı'}</span>
          </button>
        </div>
      </section>

      {/* 2. CANLI ÖRNEK VE ETKİLEŞİMLİ ÖN İZLEME */}
      <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1E1E1E] overflow-hidden shadow-xs">
        {/* Sekme Başlıkları */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 text-xs">
          <div className="flex items-center gap-2 font-mono text-stone-600 dark:text-stone-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400" />
            <span>{formatTurkishDate(getTodayDateString())}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('scheduler')}
              className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'scheduler'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Seans Çizelgesi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ascii')}
              className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'ascii'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              WhatsApp ASCII
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`px-2.5 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              Bireysel Kart
            </button>
          </div>
        </div>

        {/* Gövde */}
        <div className="p-4 sm:p-5">
          {activeTab === 'scheduler' && (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              <div className="flex items-center justify-between py-2 px-3 hover:bg-stone-50 dark:hover:bg-stone-900/30 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-stone-500 w-12 text-[11px]">09:00</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">Ahmet Yılmaz</span>
                  <span className="text-stone-500 text-[11px]">12-A</span>
                </div>
                <div className="hidden sm:block text-stone-600 dark:text-stone-400">TYT Geometri Net Analizi</div>
                <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Geldi
                </span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 hover:bg-stone-50 dark:hover:bg-stone-900/30 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-stone-500 w-12 text-[11px]">09:45</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">Zeynep Demir</span>
                  <span className="text-stone-500 text-[11px]">12-B</span>
                </div>
                <div className="hidden sm:block text-stone-600 dark:text-stone-400">Paragraf Rutini & Zaman Yönetimi</div>
                <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Geldi
                </span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 hover:bg-stone-50 dark:hover:bg-stone-900/30 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-stone-500 w-12 text-[11px]">10:30</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">Can Bozkurt</span>
                  <span className="text-stone-500 text-[11px]">Mezun</span>
                </div>
                <div className="hidden sm:block text-stone-600 dark:text-stone-400">AYT Matematik Soru Analizi</div>
                <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                  Bekliyor
                </span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 hover:bg-stone-50 dark:hover:bg-stone-900/30 rounded-md transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-stone-500 w-12 text-[11px]">11:15</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100">Elif Yıldız</span>
                  <span className="text-stone-500 text-[11px]">12-C</span>
                </div>
                <div className="hidden sm:block text-stone-600 dark:text-stone-400">Sınav Kaygısı ve Deneme Takibi</div>
                <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Gelmedi
                </span>
              </div>
            </div>
          )}

          {activeTab === 'ascii' && (
            <div className="space-y-3">
              <pre className="p-3.5 rounded-md bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 font-mono text-[11px] leading-relaxed overflow-x-auto">
                {sampleAsciiText}
              </pre>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="p-4 rounded-md bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-800 space-y-2.5 text-xs">
              <div className="flex items-baseline justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                <span className="font-semibold text-stone-900 dark:text-stone-100">Ahmet Yılmaz (12-A) - Seans Notu</span>
                <span className="font-mono text-[11px] text-stone-500">{formatTurkishDate(getTodayDateString())}</span>
              </div>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                <strong>Görüşme Konusu:</strong> TYT Geometri Üçgenler eksikleri ve deneme net düşüşü analiz edildi.
              </p>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                <strong>Haftalık Karar & Ödev:</strong> Günlük 20 problem ve 1 test geometrik çizim fasikülü tamamlanacak.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. İŞLEVSEL BİLGİ BÖLÜMÜ (Kartsız, İnce Ayrım Çizgili) */}
      <section className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-8">
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Sistemin Temel İşlevleri
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Gereksiz menüler veya pazarlama dili yok; doğrudan MEB rehberlik servisi iş akışı.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              WhatsApp Monospace Tablo
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Standart WhatsApp mesajlarında mobilde harf genişlikleri nedeniyle kayan seans saatlerini sabit genişlikli tablo formatında panoya kopyalar.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Printer className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              A4 Resmi Görüşme Çıktısı
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Siyah-beyaz yazıcı ve MEB resmi defter standartlarına uygun, 12mm kenar boşluklu, onay kutulu A4 günlük ve haftalık seans çizelgesi çıktısı verir.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-teal-700 dark:text-teal-400">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Öğrenci Kaydı ve Seans Geçmişi
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Görüşülen konular, ödevler ve durumlar (Geldi / Gelmedi / Bekliyor) kronolojik olarak listelenir. Excel/CSV aktarımı desteklenir.
            </p>
          </div>
        </div>
      </section>

      {/* 4. VERİLER NEREDE TUTULUR? */}
      <section className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-900 dark:text-stone-100">
          <Database className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <span>Veriler Nerede ve Nasıl Tutulur?</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-md border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100">
              <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Gerçek Kullanım (Firestore Veritabanı)</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
              Oturum açtığınızda öğrenci ve randevu verileri Google Firebase Firestore üzerinde, yalnızca danışman kimliğinize (UID) ait özel ve şifreli alt koleksiyonda saklanır. Başka hiçbir okul veya kullanıcı bu verilere erişemez.
            </p>
          </div>

          <div className="p-3.5 rounded-md border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-stone-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Modu (Sadece Tarayıcı RAM Belleği)</span>
            </div>
            <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
              "Demo'yu Dene" butonuna basıldığında Firebase veritabanına veya harici sunuculara hiçbir istek yapılmaz. Veriler geçici olarak tarayıcı belleğinde (React state) tutulur, sayfa yenilendiğinde sıfırlanır.
            </p>
          </div>
        </div>
      </section>

      {/* 5. ALT EYLEM ÇAĞRISI */}
      <section className="pt-6 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            Rehberlik masanızı kullanmaya başlayın
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Hesap açarak veritabanı eşitlemesiyle veya demo modunda doğrudan deneyebilirsiniz.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onStartDemo && (
            <button
              type="button"
              onClick={onStartDemo}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
              <span>Demo'yu Dene</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLaunchWorkspace}
            className="px-4 py-2 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Giriş Yap
          </button>

          {onOpenAuth && (
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="px-4 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Kayıt Ol
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
