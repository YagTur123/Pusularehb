import { useState } from 'react';
import {
  Calendar,
  MessageSquare,
  Zap,
  ArrowRight,
  Search,
  Check,
  Copy,
  Clock,
  UserX,
  Users,
  FileSpreadsheet,
  Terminal,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { getTodayDateString, formatTurkishDate } from '../lib/storage';

interface LandingPageProps {
  onLaunchWorkspace: () => void;
  onOpenBroadcast: () => void;
  onOpenSmartPaste: () => void;
  onOpenCommandPalette: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function LandingPage({
  onLaunchWorkspace,
  onOpenBroadcast,
  onOpenSmartPaste,
  onOpenCommandPalette,
  onShowToast,
}: LandingPageProps) {
  const [activeMockupTab, setActiveMockupTab] = useState<'scheduler' | 'ascii' | 'summary' | 'risk'>('scheduler');
  const [copiedAscii, setCopiedAscii] = useState(false);

  const sampleAsciiText = `[PUSULA REHBERLİK SERVİSİ | GÜNLÜK SEANS PROGRAMI]
Tarih: ${formatTurkishDate(getTodayDateString())}
Danışman: Uzm. Psk. Dan. Mehmet Kaya
\`\`\`
+-------+--------------------+----------------+
| SAAT  | ÖĞRENCİ            | KONU           |
+-------+--------------------+----------------+
| 09:00 | Ahmet Yılmaz (12-A)| TYT Geometri   |
| 09:50 | Zeynep Demir (12-B)| Paragraf Hız   |
| 10:40 | Can Bozkurt (Mezun)| AYT Matematik  |
| 11:30 | Elif Yıldız (12-C) | Sınav Kaygısı  |
| 13:00 | Berke Öz (11-MF)   | 11. Sınıf Kamp |
+-------+--------------------+----------------+
\`\`\`

Görüşmesi Olan Öğrenciler:
@+905324182914 (Ahmet Yılmaz)
@+905438201945 (Zeynep Demir)
@+905056714289 (Can Bozkurt)
@+905359124038 (Elif Yıldız)
@+905362948172 (Berke Öz)

* Önemli Not: Lütfen randevu saatinizden 5 dakika önce rehberlik biriminde hazır bulununuz.`;

  const handleCopyAscii = async () => {
    try {
      await navigator.clipboard.writeText(sampleAsciiText);
      setCopiedAscii(true);
      onShowToast('ASCII Tablosu Kopyalandı', 'WhatsApp grubuna yapıştırmaya hazır.', 'success');
      setTimeout(() => setCopiedAscii(false), 2500);
    } catch {
      onOpenBroadcast();
    }
  };

  return (
    <div className="w-full space-y-24 py-8 sm:py-14 text-zinc-200">
      {/* 1. HERO SECTION (Asymmetric, Left-Aligned, Authentic Field Note) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-left">
          {/* Hero Title - Directly starting without mono eyebrow */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white leading-[1.14] mb-4">
            Rehberlik seanslarını planlayın.
            <br />
            <span className="text-zinc-400 font-normal">WhatsApp grupları için kaymayan seans tablosu üretin.</span>
          </h1>

          {/* Hero Subheading */}
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed mb-6">
            40 dakikalık görüşme periyotlarını tek tıkla oluşturun, saatleri ve öğrenci isimleri mobilde kaymayan
            sabit genişlikli WhatsApp tablosunu panoya alın. 20 gündür görüşme odasına girmeyen öğrencileri risk radarıyla yakalayın.
          </p>

          {/* Hero Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button
              onClick={onLaunchWorkspace}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-xs"
            >
              <span>Çalışma Masasını Aç</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopyAscii}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition-colors"
            >
              {copiedAscii ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedAscii ? 'Panoya Kopyalandı' : 'Örnek WhatsApp Tablosu'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. REAL INTERACTIVE PRODUCT VIEWPORT (Authentic Turkish Counselor Data) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
          {/* Window Header */}
          <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-zinc-850 bg-zinc-900/70 text-xs">
            {/* Left: Window Controls & Active Context */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
              </div>
              <span className="text-zinc-600">|</span>
              <span className="font-mono text-zinc-300">{formatTurkishDate(getTodayDateString())}</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-300 font-mono">
                Uzm. Psk. Dan. Mehmet Kaya
              </span>
            </div>

            {/* Right: Interactive View Switcher */}
            <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveMockupTab('scheduler')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  activeMockupTab === 'scheduler'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Seans Takvimi
              </button>
              <button
                onClick={() => setActiveMockupTab('ascii')}
                className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                  activeMockupTab === 'ascii'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp ASCII</span>
              </button>
              <button
                onClick={() => setActiveMockupTab('summary')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  activeMockupTab === 'summary'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Bireysel Kart
              </button>
              <button
                onClick={() => setActiveMockupTab('risk')}
                className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                  activeMockupTab === 'risk'
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Risk Radarı (2)</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen Body */}
          <div className="p-4 sm:p-6 bg-zinc-950 min-h-[380px]">
            {activeMockupTab === 'scheduler' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-850">
                  <span>Günlük Seans Çizelgesi (40 dk periyotlar)</span>
                  <span className="font-mono text-emerald-400">5 Seans Planlandı • 2 Tamamlandı</span>
                </div>

                <div className="space-y-1.5 font-sans">
                  {/* Row 1 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-400 w-12">09:00</span>
                      <div>
                        <span className="font-medium text-white">Ahmet Yılmaz</span>
                        <span className="ml-1.5 font-mono text-[11px] text-zinc-400">12-A</span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-zinc-300">TYT Geometri Net Analizi</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">Geometri Eksiği</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400 font-medium">
                        Geldi
                      </span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-400 w-12">09:50</span>
                      <div>
                        <span className="font-medium text-white">Zeynep Demir</span>
                        <span className="ml-1.5 font-mono text-[11px] text-zinc-400">12-B</span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-zinc-300">Paragraf Hızlandırma</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">Paragraf Rutini</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400 font-medium">
                        Geldi
                      </span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/90 border border-zinc-750 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-amber-400 w-12 font-medium">10:40</span>
                      <div>
                        <span className="font-medium text-white">Can Bozkurt</span>
                        <span className="ml-1.5 font-mono text-[11px] text-zinc-400">Mezun</span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-zinc-200">AYT Limit-Süreklilik</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">AYT Matematik</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">
                        Bekliyor
                      </span>
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-850 hover:border-zinc-750 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-zinc-400 w-12">11:30</span>
                      <div>
                        <span className="font-medium text-white">Elif Yıldız</span>
                        <span className="ml-1.5 font-mono text-[11px] text-zinc-400">12-C</span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <span className="text-zinc-300">Deneme Kaygısı & Uyku</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">Sınav Kaygısı</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Gelmedi</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">
                    Öğrenci isimlerine tıklayarak görüşme geçmişini ve geçmiş ödevleri inceleyebilirsiniz.
                  </span>
                  <button
                    onClick={onLaunchWorkspace}
                    className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-medium underline"
                  >
                    <span>Canlı Takvimi Aç</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {activeMockupTab === 'ascii' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Sabit Genişlikli WhatsApp ASCII Çıktısı (Monospace)</span>
                  <button
                    onClick={handleCopyAscii}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-mono"
                  >
                    {copiedAscii ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAscii ? 'Panoya Kopyalandı' : 'Metni Kopyala'}</span>
                  </button>
                </div>

                <pre className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre">
                  {sampleAsciiText}
                </pre>
              </div>
            )}

            {activeMockupTab === 'summary' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <span className="font-semibold text-white">Bireysel Görüşme Özeti Oluşturucu</span>
                    <span className="text-[11px] text-zinc-500">Ahmet Yılmaz (12-A)</span>
                  </div>

                  <div className="space-y-2 text-zinc-300">
                    <div>
                      <span className="text-zinc-500 block text-[11px]">Görüşülen Konu:</span>
                      <p className="font-medium text-white">TYT Geometri Net Analizi & Problemler Rutini</p>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[11px]">Ödev & Haftalık Kararlar:</span>
                      <p className="p-2 rounded bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-300">
                        • 3D Geometri Üçgenler Test 1-6 arası bitirilecek.<br />
                        • Her gün 20 paragraf + 15 problem çözülecek.<br />
                        • Yanlış yapılan sorular kesilip analiz defterine yapıştırılacak.
                      </p>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[11px]">Sonraki Takip Seansı:</span>
                      <p className="font-mono text-emerald-400">15 Eylül Pazartesi, 09:00</p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Preview */}
                <div className="p-4 rounded-lg bg-[#0b141a] border border-zinc-800 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-[11px] text-zinc-400 font-mono">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      <span>WhatsApp Görünümü (+90 532 411 20 89)</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#1f2c34] text-zinc-200 text-[11px] leading-relaxed font-sans space-y-1.5 shadow-sm">
                      <p className="font-semibold text-emerald-400">[PUSULA REHBERLİK SERVİSİ | BİREYSEL GÖRÜŞME KARTI]</p>
                      <p className="text-zinc-400">━━━━━━━━━━━━━━━━━━━━━━━━━</p>
                      <p><span className="text-zinc-400">Öğrenci:</span> Ahmet Yılmaz (12-A)</p>
                      <p><span className="text-zinc-400">Tarih:</span> {formatTurkishDate(getTodayDateString())} - 09:00</p>
                      <p><span className="text-zinc-400">Danışman:</span> Uzm. Psk. Dan. Mehmet Kaya</p>
                      <p><span className="text-zinc-400">Görüşme Konusu:</span> TYT Geometri Net Analizi</p>
                      <div className="pt-1 text-zinc-300">
                        <p className="font-medium text-white">Görüşme Kararları ve Ödevler:</p>
                        <p className="text-zinc-300">• 3D Geometri Üçgenler Test 1-6 tamamlanacak.</p>
                        <p className="text-zinc-300">• Günlük 20 paragraf + 15 problem çözülecek.</p>
                      </div>
                      <p className="text-zinc-400 pt-1">Sonraki Randevu: 15 Eylül Pazartesi, 09:00</p>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={onLaunchWorkspace}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      WhatsApp'ta Aç
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeMockupTab === 'risk' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-850">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="font-semibold text-white">20+ Gündür Görüşülmeyen Öğrenciler</span>
                  </div>
                  <span className="text-zinc-500 text-[11px]">Sistem son görüşme tarihlerini otomatik takip eder</span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Barış Kaya</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">12-D</span>
                        <span className="text-[11px] text-amber-400 font-mono">24 gündür görüşülmedi</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Hedef: Hacettepe Tıp • Son Seans: 14 Ağustos • Etiket: Net Düşüşü</p>
                    </div>
                    <button
                      onClick={onLaunchWorkspace}
                      className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                    >
                      Bugüne Randevu Ver
                    </button>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">Selin Acar</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">Mezun</span>
                        <span className="text-[11px] text-amber-400 font-mono">31 gündür görüşülmedi</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] mt-0.5">Hedef: Boğaziçi İktisat • Son Seans: 7 Ağustos • Etiket: AYT Matematik</p>
                    </div>
                    <button
                      onClick={onLaunchWorkspace}
                      className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium"
                    >
                      Bugüne Randevu Ver
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. ASYMMETRICAL FEATURE BENTO (Breaking the symmetrical 3-card grid) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="mb-6">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Rehberlik biriminin gerçek iş yüküne göre modellendi
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gereksiz formlar veya karmaşık menüler yok. Yalnızca seans saatleri, WhatsApp çıktısı ve öğrenci takibi.
          </p>
        </div>

        {/* Row 1: Asymmetric 65% / 35% */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Bento Item 1 (65% width): WhatsApp ASCII Monospace */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>ASCII TABLO MOTORU</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white tracking-tight">
                WhatsApp gruplarında saatleri ve isimleri kaymayan hizalı tablo
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-xl">
                Standart WhatsApp mesajlarında karakter genişlikleri değişken olduğu için saat ve öğrenci sütunları mobilde darmadağın olur.
                Pusula, 7-20-16 karakter hassasiyetinde sabit genişlikli ASCII sınırları çizer ve öğrencileri alta otomatik etiketler.
              </p>
            </div>

            <div className="mt-5 p-3.5 rounded-lg bg-zinc-900 border border-zinc-850 font-mono text-[11px] text-zinc-300 overflow-x-auto">
              <span className="text-zinc-500"># WhatsApp'a yapıştırıldığında monospace blok olarak görüntülenir:</span>
              <p className="text-emerald-400/90 mt-1">
                +-------+--------------------+----------------+<br />
                | SAAT  | ÖĞRENCİ            | KONU           |<br />
                +-------+--------------------+----------------+<br />
                | 09:00 | Ahmet Yılmaz (12-A)| TYT Geometri   |<br />
                | 09:50 | Zeynep Demir (12-B)| Paragraf Rutin |<br />
                +-------+--------------------+----------------+
              </p>
            </div>
          </div>

          {/* Bento Item 2 (35% width): Student Portfolio & History */}
          <div className="lg:col-span-4 p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>ÖĞRENCİ PORTFÖYÜ</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white tracking-tight">
                Kronolojik görüşme geçmişi ve teşhisler
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                Bir öğrenci odaya girdiğinde önceki seanslarda konuşulanları, verilen ödevleri ve veli iletişim notlarını tek tıkla açın.
              </p>
            </div>

            <div className="mt-5 p-3 rounded-lg bg-zinc-900/80 border border-zinc-850 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">Ahmet Yılmaz (12-A)</span>
                <span className="text-[11px] font-mono text-zinc-500">4 görüşme</span>
              </div>
              <div className="text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 space-y-1">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Son Konu:</span>
                  <span className="text-zinc-200">TYT Geometri Net Analizi</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Önceki Karar:</span>
                  <span className="text-zinc-400 truncate max-w-[140px]">Haftalık soru çizelgesi</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Asymmetric 35% / 65% */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Bento Item 3 (35% width): Smart Regex Paste */}
          <div className="lg:col-span-4 p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
                <span>TOPLU İÇE AKTARIM</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white tracking-tight">
                Excel veya WhatsApp listesinden tek yapıştırma
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                e-Okul veya Excel'den aldığınız karışık telefon formatlarını (0532, +90, boşluklu) otomatik temizleyip 905xxxxxxxxx formatına çevirir.
              </p>
            </div>

            <div className="mt-5 p-3 rounded bg-zinc-900 border border-zinc-850 font-mono text-[11px] text-zinc-400">
              <span className="text-zinc-500 block text-[10px]">Girdi:</span>
              <p className="truncate">Ahmet Yılmaz	12-A	0 (532) 411 20 89</p>
              <span className="text-emerald-400 block text-[10px] mt-1.5">Temiz Çıktı:</span>
              <p className="text-zinc-200">Ahmet Yılmaz (12-A) &bull; +905324112089</p>
            </div>
          </div>

          {/* Bento Item 4 (65% width): Post-Meeting Action Cards */}
          <div className="lg:col-span-8 p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span>BİREYSEL GERİ BİLDİRİM</span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white tracking-tight">
                Görüşme bitiminde öğrenciye ve veliye tek tıkla şablon mesaj
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed max-w-xl">
                Görüşme bittiğinde rehberlik masasında kararlaştırılan ödevleri, deneme net hedeflerini ve bir sonraki randevu tarihini
                tek bir butona basarak doğrudan öğrencinin WhatsApp sohbetine aktarın.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="font-semibold text-white block mb-1">Görüşme Kararları & Ödevler</span>
                <p className="text-zinc-400 text-[11px] leading-normal">
                  Soru bankası hedefleri, deneme analizi ve paragraf rutinleri tek satırda kaydedilir.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-850">
                <span className="font-semibold text-white block mb-1">Gelmedi Uyarısı</span>
                <p className="text-zinc-400 text-[11px] leading-normal">
                  Randevusuna gelmeyen öğrenciye tek tıkla yeni randevu hatırlatma mesajı açılır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WORKFLOW COMPARISON (Real Counselor Day: Old vs Pusula) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="border border-zinc-800 rounded-xl bg-zinc-950 p-6 sm:p-8">
          <div className="max-w-2xl mb-6">
            <h2 className="font-display text-xl font-semibold text-white tracking-tight">
              Klasik yöntem vs. Pusula iş akışı
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Günün her aşamasında rehberlik danışmanının harcadığı zamanı ölçtük.
            </p>
          </div>

          <div className="divide-y divide-zinc-850 text-xs">
            {/* Step 1 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-4 items-center">
              <div className="md:col-span-3 font-mono text-zinc-400">
                <span className="text-white font-semibold block">08:30 Sabah Duyurusu</span>
                <span>Günlük seans tablosu</span>
              </div>
              <div className="md:col-span-4 text-zinc-500">
                <span className="text-rose-400 block font-medium">Eski Yöntem (15-20 dk):</span>
                <span>WhatsApp'a elle seans saatlerini yazma, mobilde yazı tipleri kaydığı için bozuk hizalama.</span>
              </div>
              <div className="md:col-span-5 text-zinc-300">
                <span className="text-emerald-400 block font-medium">Pusula ile (10 saniye):</span>
                <span>Standart 40 dk seansları doldur, ⌘Enter ile hizalı ASCII tablosunu kopyala ve gruba yapıştır.</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-4 items-center">
              <div className="md:col-span-3 font-mono text-zinc-400">
                <span className="text-white font-semibold block">11:00 Seans Takibi</span>
                <span>Görüşme esnasında</span>
              </div>
              <div className="md:col-span-4 text-zinc-500">
                <span className="text-rose-400 block font-medium">Eski Yöntem:</span>
                <span>Defter veya ajanda sayfalarında geçmiş görüşmeleri ve verilen eski hedefleri arama.</span>
              </div>
              <div className="md:col-span-5 text-zinc-300">
                <span className="text-emerald-400 block font-medium">Pusula ile:</span>
                <span>Öğrencinin ismine tıklayarak son görüşmelerini, net durumunu ve ödev geçmişini tek pencerede gör.</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-4 items-center">
              <div className="md:col-span-3 font-mono text-zinc-400">
                <span className="text-white font-semibold block">16:30 Gün Sonu Raporu</span>
                <span>Devamsızlık & risk kontrolü</span>
              </div>
              <div className="md:col-span-4 text-zinc-500">
                <span className="text-rose-400 block font-medium">Eski Yöntem:</span>
                <span>Kim geldi kim gelmedi elle işaretleme; unutulan öğrencileri haftalar sonra fark etme.</span>
              </div>
              <div className="md:col-span-5 text-zinc-300">
                <span className="text-emerald-400 block font-medium">Pusula ile:</span>
                <span>Risk radarı 20 gündür görüşülmeyen öğrencileri otomatik listeler, kaçıranlara tek tıkla telafi mesajı iletir.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CALL TO ACTION */}
      <section className="max-w-4xl mx-auto text-center px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
            Rehberlik masanızı hemen kullanmaya başlayın
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Hesap oluşturma, sunucu kurulumu veya kredi kartı gerekmez. Tarayıcınızda anında açılır, tüm verileriniz bilgisayarınızda yerel kalır.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onLaunchWorkspace}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-xs"
            >
              <span>Canlı Çalışma Masasını Başlat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onOpenSmartPaste}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
              <span>Öğrenci Listesi İçe Aktar</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
