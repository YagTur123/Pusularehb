import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Download,
  Share2,
  Calendar,
  UserCheck,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  FileImage,
  Tag,
  ExternalLink,
  X,
} from 'lucide-react';
import { Session, Student } from '../types';
import { formatTurkishDate, StorageService } from '../lib/storage';
import {
  generateOfficialTaggedBroadcastText,
  copyToClipboard,
  getWhatsAppUniversalUrl,
  openExternalUrl,
} from '../lib/whatsapp';

interface DailyWhatsAppOfficialCardProps {
  selectedDate: string;
  sessions: Session[];
  students: Student[];
  counselorName: string;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
  onOpenPrintModal?: () => void;
  onClose?: () => void;
}

export function DailyWhatsAppOfficialCard({
  selectedDate,
  sessions,
  students,
  counselorName,
  onShowToast,
  onOpenPrintModal,
  onClose,
}: DailyWhatsAppOfficialCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isCopiedImage, setIsCopiedImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Daily target sessions
  const dateSessions = sessions
    .filter((s) => s.date === selectedDate)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const assignedSessions = dateSessions.filter((s) => s.student_id);
  const totalAssigned = assignedSessions.length;

  // Students with appointments today who have phone numbers
  const taggedStudents = assignedSessions
    .map((sess) => {
      const student = sess.student_id ? studentMap.get(sess.student_id) : undefined;
      if (!student) return null;
      const cleanPhone = (student.phone || '').replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('90')
        ? cleanPhone
        : cleanPhone.startsWith('0')
        ? '9' + cleanPhone
        : cleanPhone.length >= 10
        ? '90' + cleanPhone
        : cleanPhone;

      return {
        session: sess,
        student,
        phone: formattedPhone,
        tag: formattedPhone ? `@+${formattedPhone}` : '@Öğrenci',
      };
    })
    .filter(Boolean) as {
    session: Session;
    student: Student;
    phone: string;
    tag: string;
  }[];

  const officialBroadcastText = generateOfficialTaggedBroadcastText(
    selectedDate,
    dateSessions,
    students,
    counselorName
  );

  // High-Resolution Official Document Image Drawing on Canvas
  const drawOfficialDocument = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1100;
    const baseRowHeight = 44;
    const headerHeight = 220;
    const footerHeight = 130;
    const rowCount = Math.max(assignedSessions.length, 1);
    const height = headerHeight + rowCount * baseRowHeight + footerHeight;

    canvas.width = width;
    canvas.height = height;

    // Crisp white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Elegant official double outer border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, width - 52, height - 52);

    // Official Header Banner
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('T.C. MİLLÎ EĞİTİM BAKANLIĞI', width / 2, 62);

    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('REHBERLİK VE PSİKOLOJİK DANIŞMA SERVİSİ', width / 2, 88);

    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('GÜNLÜK RESMİ GÖRÜŞME VE RANDEVU ÇİZELGESİ', width / 2, 114);

    // Thin header divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 130);
    ctx.lineTo(width - 50, 130);
    ctx.stroke();

    // Metadata Strip: Tarih & Danışman
    ctx.textAlign = 'left';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(`📅 Tarih: ${formatTurkishDate(selectedDate)}`, 50, 155);

    ctx.textAlign = 'right';
    ctx.fillText(`👤 Danışman: ${counselorName || 'Rehber Öğretmen'}`, width - 50, 155);

    // Table Setup
    const tableTop = 175;
    const tableLeft = 45;
    const tableWidth = width - 90;
    const cols = [
      { name: 'NO', width: 60, align: 'center' as const },
      { name: 'SAAT', width: 100, align: 'center' as const },
      { name: 'ÖĞRENCİ ADI SOYADI', width: 290, align: 'left' as const },
      { name: 'SINIFI / ŞUBESİ', width: 150, align: 'center' as const },
      { name: 'GÖRÜŞME KONUSU / ODAĞI', width: 280, align: 'left' as const },
      { name: 'DURUM', width: 130, align: 'center' as const },
    ];

    // Table Header Background
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(tableLeft, tableTop, tableWidth, 38);

    // Table Header Borders
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableLeft, tableTop, tableWidth, 38);

    // Table Header Texts
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let curX = tableLeft;
    cols.forEach((col) => {
      ctx.textAlign = col.align;
      const textX =
        col.align === 'center'
          ? curX + col.width / 2
          : curX + 12;
      ctx.fillText(col.name, textX, tableTop + 24);

      // Vertical separator
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curX + col.width, tableTop);
      ctx.lineTo(curX + col.width, tableTop + 38);
      ctx.stroke();

      curX += col.width;
    });

    // Table Rows
    let curY = tableTop + 38;

    if (assignedSessions.length === 0) {
      // Empty row
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tableLeft, curY, tableWidth, baseRowHeight);
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(tableLeft, curY, tableWidth, baseRowHeight);

      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Bu tarih için planlanmış resmi seans / görüşme kaydı bulunmamaktadır.',
        width / 2,
        curY + 27
      );
      curY += baseRowHeight;
    } else {
      assignedSessions.forEach((sess, idx) => {
        const student = sess.student_id ? studentMap.get(sess.student_id) : undefined;
        const isEven = idx % 2 === 0;

        ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
        ctx.fillRect(tableLeft, curY, tableWidth, baseRowHeight);

        // Outer row border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.strokeRect(tableLeft, curY, tableWidth, baseRowHeight);

        // Row content
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#0f172a';

        let rowX = tableLeft;

        // 1. NO
        ctx.textAlign = 'center';
        ctx.font = '600 12px "Geist Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(String(idx + 1), rowX + cols[0].width / 2, curY + 27);
        rowX += cols[0].width;

        // 2. SAAT
        ctx.font = 'bold 12px "Geist Mono", monospace';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(sess.time_slot, rowX + cols[1].width / 2, curY + 27);
        rowX += cols[1].width;

        // 3. ÖĞRENCİ ADI SOYADI
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#0f172a';
        const name = student ? student.full_name : 'Belirtilmedi';
        ctx.fillText(name.slice(0, 32), rowX + 12, curY + 27);
        rowX += cols[2].width;

        // 4. SINIFI
        ctx.textAlign = 'center';
        ctx.font = '600 12px "Geist Mono", monospace';
        ctx.fillStyle = '#334155';
        ctx.fillText(student?.class_grade || '-', rowX + cols[3].width / 2, curY + 27);
        rowX += cols[3].width;

        // 5. GÖRÜŞME KONUSU
        ctx.textAlign = 'left';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#475569';
        const topic = sess.topic || (sess.tags?.[0] ? `${sess.tags[0]} Takibi` : 'Bireysel Görüşme');
        ctx.fillText(topic.slice(0, 34), rowX + 12, curY + 27);
        rowX += cols[4].width;

        // 6. DURUM
        ctx.textAlign = 'center';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        if (sess.status === 'Geldi') {
          ctx.fillStyle = '#15803d';
          ctx.fillText('✓ Tamamlandı', rowX + cols[5].width / 2, curY + 27);
        } else if (sess.status === 'Gelmedi') {
          ctx.fillStyle = '#b91c1c';
          ctx.fillText('✕ Gelmedi', rowX + cols[5].width / 2, curY + 27);
        } else {
          ctx.fillStyle = '#475569';
          ctx.fillText('Bekliyor', rowX + cols[5].width / 2, curY + 27);
        }

        curY += baseRowHeight;
      });
    }

    // Bottom Table Line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tableLeft, tableTop, tableWidth, curY - tableTop);

    // Official Footer & Signature Stamp
    const footerY = curY + 30;
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      'İşbu çizelge Millî Eğitim Bakanlığı Rehberlik Hizmetleri Yönetmeliği uyarınca tanzim edilmiştir.',
      50,
      footerY + 16
    );

    ctx.textAlign = 'right';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(`${counselorName || 'Psikolojik Danışman'}`, width - 50, footerY + 12);
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Rehber Öğretmen / İmza', width - 50, footerY + 32);
  }, [selectedDate, dateSessions, assignedSessions, students, counselorName, studentMap]);

  useEffect(() => {
    drawOfficialDocument();
  }, [drawOfficialDocument]);

  // Copy Screenshot Image (PNG) Directly to Clipboard
  const handleCopyImage = async () => {
    setIsGeneratingImage(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not available');

      canvas.toBlob(async (blob) => {
        if (!blob) {
          onShowToast('Hata', 'Görsel oluşturulamadı.', 'warning');
          setIsGeneratingImage(false);
          return;
        }

        try {
          if (navigator.clipboard && window.isSecureContext && typeof ClipboardItem !== 'undefined') {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setIsCopiedImage(true);
            onShowToast(
              'Ekran Görüntüsü Kopyalandı!',
              'Resmi görüşme çizelgesi görseli panoya alındı. WhatsApp Web veya masaüstüne Ctrl+V ile doğrudan yapıştırabilirsiniz.',
              'success'
            );
            setTimeout(() => setIsCopiedImage(false), 3000);
          } else {
            handleDownloadImage();
            onShowToast(
              'Görsel İndirildi',
              'Panoya kopyalama bu tarayıcıda desteklenmediğinden PNG görseli indirildi.',
              'info'
            );
          }
        } catch {
          handleDownloadImage();
          onShowToast(
            'Görsel İndirildi',
            'Doğrudan panoya yapıştırma güvenlik izinleri nedeniyle dosya olarak indirildi.',
            'info'
          );
        } finally {
          setIsGeneratingImage(false);
        }
      }, 'image/png');
    } catch {
      setIsGeneratingImage(false);
      onShowToast('Hata', 'Görsel kopyalanamadı.', 'warning');
    }
  };

  // Download Screenshot Image (PNG)
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `resmi_gorusme_cizelgesi_${selectedDate}.png`;
    link.href = dataUrl;
    link.click();
    onShowToast('Görsel Kaydedildi', 'Resmi görüşme çizelgesi PNG olarak indirildi.', 'success');
  };

  // Copy Text with Tagged Numbers
  const handleCopyTaggedText = async () => {
    const success = await copyToClipboard(officialBroadcastText);
    if (success) {
      setIsCopiedText(true);
      onShowToast(
        'WhatsApp Metni Kopyalandı!',
        'Resmi duyuru metni ve ilgili öğrenci numaraları etiketleriyle panoya alındı.',
        'success'
      );
      setTimeout(() => setIsCopiedText(false), 2500);
    } else {
      onShowToast('Hata', 'Metin kopyalanamadı.', 'warning');
    }
  };

  // Copy Only Tags Line
  const handleCopyOnlyTags = async () => {
    const onlyTagsText = taggedStudents.map((t) => `${t.tag} (${t.session.time_slot} - ${t.student.full_name})`).join(' ');
    const success = await copyToClipboard(onlyTagsText);
    if (success) {
      onShowToast('Numara Etiketleri Kopyalandı', 'Sadece etiketler panoya alındı.', 'success');
    }
  };

  // Open WhatsApp with prefilled message
  const handleOpenWhatsApp = () => {
    copyToClipboard(officialBroadcastText);
    if (StorageService.isDemo()) {
      onShowToast(
        'Demo Modu: Mesaj Önizlemesi',
        'Demo modunda dış ağa WhatsApp isteği gönderilmez. Metin panoya kopyalandı ve aşağıda önizlenmektedir.',
        'info'
      );
      return;
    }
    const url = getWhatsAppUniversalUrl(officialBroadcastText);
    openExternalUrl(url);
    onShowToast(
      'WhatsApp Açılıyor',
      'Metin panoya kopyalandı. WhatsApp açıldığında görseli de Ctrl+V ile yapıştırabilirsiniz.',
      'success'
    );
  };

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-lg bg-white dark:bg-[#1E1E1E] shadow-xs overflow-hidden transition-colors">
      {/* Top Header Row of the Rectangular Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800">
        {/* Left: Badge & Information */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[#0F766E] text-white shrink-0">
            <MessageSquare className="w-4 h-4 fill-white text-white stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                Günün WhatsApp İlanı
              </span>
              <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-[10px] font-semibold">
                Resmi Görüşme Çıktısı
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-2">
              <span>{formatTurkishDate(selectedDate)}</span>
              <span>&bull;</span>
              <span className="font-medium text-stone-700 dark:text-stone-300">
                {totalAssigned > 0 ? `${totalAssigned} Öğrenci Randevulu` : 'Randevulu Seans Yok'}
              </span>
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Copy Image (Screenshot) Button */}
          <button
            type="button"
            onClick={handleCopyImage}
            disabled={isGeneratingImage}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              isCopiedImage
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700'
            }`}
            title="Resmi görüşme çıktısının ekran görüntüsünü kopyala (WhatsApp'a Ctrl+V yapıştır)"
          >
            {isCopiedImage ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <FileImage className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            )}
            <span>{isCopiedImage ? 'Görsel Kopyalandı' : 'Görsel Kopyala'}</span>
          </button>

          {/* 2. Download Image Button */}
          <button
            type="button"
            onClick={handleDownloadImage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 text-xs font-medium transition-colors cursor-pointer"
            title="Görseli PNG olarak indir"
          >
            <Download className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span className="hidden sm:inline">PNG İndir</span>
          </button>

          {/* 3. Copy Tagged Text Button */}
          <button
            type="button"
            onClick={handleCopyTaggedText}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              isCopiedText
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700'
            }`}
            title="Etiketli metni kopyala"
          >
            {isCopiedText ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            )}
            <span className="hidden sm:inline">Metni Kopyala</span>
            <span className="sm:hidden">Metin</span>
          </button>

          {/* 4. WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title={StorageService.isDemo() ? "Demo modunda mesaj önizlemesi" : "WhatsApp üzerinden aç ve gönder"}
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">WhatsApp Aç</span>
          </button>

          {/* 5. Print Modal Trigger */}
          {onOpenPrintModal && (
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Resmi A4 Çizelgesini Yazdır veya PDF Kaydet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF</span>
            </button>
          )}

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Görünümü Genişlet' : 'Görünümü Daralt'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body of the Rectangular Card: Screenshot Preview & Tagged Numbers */}
      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* 1. Official Document Screenshot Frame */}
          <div className="rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0b0d13] p-2 sm:p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-white/[0.06] text-xs text-slate-600 dark:text-zinc-400">
              <span className="font-medium flex items-center gap-1.5">
                <FileImage className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Resmi Görüşme Çıktısı Ekran Görüntüsü (Görsel Önizleme)</span>
              </span>
              <span className="text-[10px] font-mono bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-700">
                1100 × Auto PNG
              </span>
            </div>

            {/* Canvas (Hidden element that generates the crisp image) */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Visual Screen Representation matching canvas for instantaneous responsive feedback */}
            <div className="bg-white text-slate-900 rounded-lg p-4 sm:p-6 shadow-xs border-2 border-slate-800 max-w-2xl mx-auto text-[11px] font-sans select-text">
              {/* MEB Letterhead */}
              <div className="text-center border-b-2 border-slate-800 pb-2 mb-3">
                <h4 className="font-bold uppercase tracking-wider text-xs text-slate-900">
                  T.C. MİLLÎ EĞİTİM BAKANLIĞI
                </h4>
                <p className="text-[11px] font-semibold text-slate-700">
                  REHBERLİK VE PSİKOLOJİK DANIŞMA SERVİSİ
                </p>
                <p className="text-[10px] font-bold text-slate-900 tracking-wide mt-0.5">
                  GÜNLÜK RESMİ GÖRÜŞME VE RANDEVU ÇİZELGESİ
                </p>
              </div>

              {/* Subheader info */}
              <div className="flex justify-between items-center text-[10px] font-semibold border-b border-slate-200 pb-1.5 mb-2.5">
                <span>📅 Tarih: {formatTurkishDate(selectedDate)}</span>
                <span>👤 Danışman: {counselorName || 'Rehber Öğretmen'}</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border border-stone-800 border-collapse">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-800 text-stone-900 font-bold h-9">
                      <th className="py-1 px-1.5 w-8 text-center border-r border-stone-300">No</th>
                      <th className="py-1 px-2 w-16 text-center border-r border-stone-300 font-mono">Saat</th>
                      <th className="py-1 px-2 border-r border-stone-300">Öğrenci Adı Soyadı</th>
                      <th className="py-1 px-2 w-20 text-center border-r border-stone-300 font-mono">Sınıf</th>
                      <th className="py-1 px-2 border-r border-stone-300">Görüşme Konusu</th>
                      <th className="py-1 px-2 w-20 text-center">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedSessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-stone-500 italic">
                          Bu tarih için planlanmış resmi görüşme bulunmamaktadır.
                        </td>
                      </tr>
                    ) : (
                      assignedSessions.map((sess, idx) => {
                        const st = sess.student_id ? studentMap.get(sess.student_id) : undefined;
                        return (
                          <tr key={sess.id} className="border-b border-stone-200 h-10 hover:bg-stone-50 transition-colors">
                            <td className="py-1 px-1.5 text-center font-mono text-stone-500 border-r border-stone-200">
                              {idx + 1}
                            </td>
                            <td className="py-1 px-2 text-center font-mono font-semibold text-stone-900 border-r border-stone-200">
                              {sess.time_slot}
                            </td>
                            <td className="py-1 px-2 font-semibold text-stone-900 border-r border-stone-200">
                              {st ? st.full_name : 'Boş'}
                            </td>
                            <td className="py-1 px-2 text-center font-mono text-stone-700 border-r border-stone-200">
                              {st?.class_grade || '-'}
                            </td>
                            <td className="py-1 px-2 text-stone-700 border-r border-stone-200">
                              {sess.topic || 'Bireysel Görüşme'}
                            </td>
                            <td className="py-1 px-2 text-center font-semibold">
                              {sess.status === 'Geldi' ? (
                                <span className="text-emerald-700">✓ Geldi</span>
                              ) : sess.status === 'Gelmedi' ? (
                                <span className="text-rose-700">✕ Gelmedi</span>
                              ) : (
                                <span className="text-stone-600">Bekliyor</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom official sign */}
              <div className="flex justify-between items-end mt-4 pt-2 text-[10px] text-stone-500">
                <span className="italic">MEB Rehberlik Hizmetleri Mevzuatı</span>
                <div className="text-right">
                  <div className="font-semibold text-stone-800">{counselorName || 'Rehber Öğretmen'}</div>
                  <div className="text-[9px] text-stone-500">İmza & Kaşe</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tagged Numbers Section ("ve altında ilgilendiren numaralar etiketlendirilsin") */}
          <div className="rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span className="text-xs font-semibold text-teal-950 dark:text-teal-200">
                  Görüşmeye Çağrılan Öğrenci & Veli Numaraları (WhatsApp Etiketleri)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-300 text-[10px] font-mono font-medium">
                  {taggedStudents.length} Numara
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyOnlyTags}
                  className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 text-[11px] font-medium transition-colors cursor-pointer"
                  title="Sadece @+905... etiketlerini kopyala"
                >
                  Yalnızca Etiketleri Kopyala
                </button>
              </div>
            </div>

            {taggedStudents.length === 0 ? (
              <div className="p-3 bg-white/80 dark:bg-[#1E1E1E] rounded-md border border-stone-200 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 italic">
                Bugün için telefon numarası kayıtlı randevulu öğrenci bulunmamaktadır.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {taggedStudents.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-[#1E1E1E] border border-stone-200 dark:border-stone-800 text-xs shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                          {item.tag}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-[10px] text-stone-700 dark:text-stone-300 font-medium">
                          {item.session.time_slot}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-700 dark:text-stone-300 font-medium truncate mt-0.5">
                        {item.student.full_name} ({item.student.class_grade})
                      </div>
                    </div>

                    {StorageService.isDemo() ? (
                      <button
                        type="button"
                        onClick={() =>
                          onShowToast(
                            'Demo Modu',
                            'Demo modunda dış ağa WhatsApp isteği gönderilmez. Önizleme aktiftir.',
                            'info'
                          )
                        }
                        className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors ml-2 cursor-pointer"
                        title="Demo modunda bağlantı devre dışıdır"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <a
                        href={getWhatsAppUniversalUrl(`Merhaba ${item.student.full_name}, ${formatTurkishDate(selectedDate)} saat ${item.session.time_slot} rehberlik seansınızı hatırlatırız.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md hover:bg-teal-100 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-400 transition-colors ml-2"
                        title={`${item.student.full_name} için direkt WhatsApp`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Copyable Message Snippet Preview */}
            <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-900/40 text-[11px] text-stone-600 dark:text-stone-400 flex items-center justify-between">
              <span className="truncate">
                💡 <strong className="font-semibold text-teal-900 dark:text-teal-300">Kullanım:</strong> Yukarıdaki <strong>"Görsel Kopyala"</strong> butonuna basın ve WhatsApp grubunuza yapıştırın (Ctrl+V); altına bu etiketler eklenecektir.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
