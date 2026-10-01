import React, { useState, useEffect } from 'react';
import { Session, Student } from '../types';
import {
  X,
  Printer,
  FileText,
  Calendar,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { formatTurkishDate, getWeekDays } from '../lib/storage';

interface DailyLogPrintModalProps {
  date: string;
  sessions: Session[];
  students: Student[];
  counselorName: string;
  onClose: () => void;
  initialScope?: 'daily' | 'weekly';
}

export function DailyLogPrintModal({
  date,
  sessions,
  students,
  counselorName,
  onClose,
  initialScope = 'daily',
}: DailyLogPrintModalProps) {
  const [printScope, setPrintScope] = useState<'daily' | 'weekly'>(initialScope);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Keep body class synced for landscape printing if selected
  useEffect(() => {
    if (orientation === 'landscape') {
      document.body.classList.add('print-orientation-landscape');
    } else {
      document.body.classList.remove('print-orientation-landscape');
    }
    return () => {
      document.body.classList.remove('print-orientation-landscape');
    };
  }, [orientation]);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const handlePrint = () => {
    window.print();
  };

  const daysToPrint: string[] =
    printScope === 'daily'
      ? [date]
      : getWeekDays(date, false).map((d) => d.date);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 overflow-y-auto"
    >
      <div className="bg-white dark:bg-[#1E1E1E] border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl max-w-5xl w-full my-6 flex flex-col overflow-hidden text-stone-800 dark:text-stone-200">
        {/* Modal Controls (Hidden in Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 id="print-modal-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Resmi Görüşme ve Seans Tablosu (A4 Yazdırma & PDF)
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Siyah-beyaz yazıcı ve arşivleme uyumlu, sabit sütunlu A4 formatı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Scope selector */}
            <div className="inline-flex rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPrintScope('daily')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  printScope === 'daily'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Günün Tablosu
              </button>
              <button
                type="button"
                onClick={() => setPrintScope('weekly')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  printScope === 'weekly'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Haftalık Çıktı (5 Gün)
              </button>
            </div>

            {/* Orientation selector */}
            <div className="inline-flex rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  orientation === 'portrait'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Dikey (A4)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  orientation === 'landscape'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'
                }`}
              >
                Yatay (A4)
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] hover:bg-[#0D645E] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet Preview */}
        <div className="p-4 sm:p-8 bg-stone-100 dark:bg-[#141414] overflow-y-auto max-h-[calc(85vh-70px)] print:max-h-none print:p-0 print:bg-white">
          <div
            id="counseling-print-sheet"
            className="bg-white text-black p-6 sm:p-10 border border-stone-300 max-w-4xl mx-auto print:border-none print:p-0 print:max-w-none text-[10.5pt] font-sans leading-snug"
            style={{ minHeight: '297mm' }}
          >
            {daysToPrint.map((dayDate, dayIdx) => {
              const daySessions = sessions
                .filter((s) => s.date === dayDate)
                .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

              const assignedCount = daySessions.filter((s) => s.student_id && !s.is_break).length;
              const totalSessionsCount = daySessions.length;

              return (
                <div
                  key={dayDate}
                  className={`space-y-4 ${
                    dayIdx < daysToPrint.length - 1 ? 'page-break-after-always pb-10 border-b border-dashed border-stone-300 print:border-none print:pb-0' : ''
                  }`}
                >
                  {/* Top Header */}
                  <div className="border-b-2 border-black pb-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[9pt] font-bold uppercase tracking-wider text-black">
                          T.C. MİLLÎ EĞİTİM BAKANLIĞI
                        </div>
                        <h1 className="text-[12pt] font-bold uppercase tracking-tight text-black mt-0.5">
                          REHBERLİK VE PSİKOLOJİK DANIŞMA SERVİSİ
                        </h1>
                        <p className="text-[10pt] font-semibold text-black mt-0.5">
                          GÜNLÜK SEANS VE ÖĞRENCİ GÖRÜŞME ÇİZELGESİ
                        </p>
                      </div>

                      <div className="text-right text-[9pt] space-y-0.5">
                        <div className="font-semibold text-black">
                          {counselorName || 'Rehberlik & Psikolojik Danışmanlık Servisi'}
                        </div>
                        <div className="text-black font-medium">
                          Tarih: {formatTurkishDate(dayDate)}
                        </div>
                        <div className="text-black italic">
                          Toplam Seans: {totalSessionsCount} ({assignedCount} Öğrenci Randevulu)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Fixed-Layout A4 Table */}
                  <table
                    className="w-full border-collapse border border-black text-[10pt]"
                    style={{ tableLayout: 'fixed', width: '100%' }}
                  >
                    <colgroup>
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '19%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b-2 border-black bg-stone-100 print:bg-transparent text-left font-bold text-black text-[9.5pt]">
                        <th className="border border-black px-2 py-1.5 text-center">Saat</th>
                        <th className="border border-black px-2 py-1.5">Öğrenci</th>
                        <th className="border border-black px-1.5 py-1.5 text-center">Sınıf</th>
                        <th className="border border-black px-2 py-1.5">Veli / Öğr. Tel</th>
                        <th className="border border-black px-1.5 py-1.5 text-center">Durum</th>
                        <th className="border border-black px-1.5 py-1.5 text-center leading-tight">
                          Mesaj<br />Gönderildi
                        </th>
                        <th className="border border-black px-2 py-1.5">Not</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daySessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="border border-black py-6 text-center italic text-stone-600">
                            Bu tarih için kayıtlı seans veya randevu bulunmamaktadır.
                          </td>
                        </tr>
                      ) : (
                        daySessions.map((sess) => {
                          if (sess.is_break) {
                            return (
                              <tr
                                key={sess.id}
                                className="border-b border-black print:break-inside-avoid"
                                style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                              >
                                <td className="border border-black px-2 py-1.5 text-center font-mono font-medium text-[9.5pt]">
                                  {sess.time_slot}
                                </td>
                                <td
                                  colSpan={6}
                                  className="border border-black px-2 py-1.5 italic text-stone-700 bg-stone-50 print:bg-transparent text-[9.5pt]"
                                >
                                  ☕ {sess.break_title || sess.topic || 'Teneffüs / Ara / Dinlenme'}
                                </td>
                              </tr>
                            );
                          }

                          const student = sess.student_id ? studentMap.get(sess.student_id) : null;
                          const studentPhone = student?.phone || '-';

                          return (
                            <tr
                              key={sess.id}
                              className="border-b border-black print:break-inside-avoid"
                              style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                            >
                              {/* 1. Saat */}
                              <td className="border border-black px-2 py-1.5 text-center font-mono font-semibold text-[9.5pt] whitespace-nowrap">
                                {sess.time_slot}
                              </td>

                              {/* 2. Öğrenci */}
                              <td className="border border-black px-2 py-1.5 font-bold text-black break-words whitespace-normal text-[9.5pt]">
                                {student ? student.full_name : <span className="font-normal italic text-stone-500">Boş Seans</span>}
                              </td>

                              {/* 3. Sınıf */}
                              <td className="border border-black px-1.5 py-1.5 text-center font-mono text-[9.5pt] whitespace-nowrap">
                                {student?.class_grade || '-'}
                              </td>

                              {/* 4. Veli / Öğrenci Telefonu */}
                              <td className="border border-black px-2 py-1.5 font-mono text-[9pt] break-words whitespace-normal">
                                {studentPhone}
                              </td>

                              {/* 5. Durum */}
                              <td className="border border-black px-1.5 py-1.5 text-center text-[9pt] font-semibold">
                                {sess.status === 'Geldi' ? (
                                  <span className="font-bold">✓ Geldi</span>
                                ) : sess.status === 'Gelmedi' ? (
                                  <span className="italic font-bold">✗ Gelmedi</span>
                                ) : (
                                  <span>Bekliyor</span>
                                )}
                              </td>

                              {/* 6. Mesaj Gönderildi (Onay Kutusu) */}
                              <td className="border border-black px-1.5 py-1.5 text-center">
                                <span className="inline-block text-[13pt] leading-none select-none text-black">
                                  ☐
                                </span>
                              </td>

                              {/* 7. Not */}
                              <td className="border border-black px-2 py-1.5 text-[9pt] break-words whitespace-normal leading-tight">
                                {sess.topic && <div className="font-medium">{sess.topic}</div>}
                                {sess.action_items && (
                                  <div className="italic text-[8.5pt] mt-0.5">{sess.action_items}</div>
                                )}
                                {!sess.topic && !sess.action_items && '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Document Footer: KVKK Note, Counselor and Administrator Signatures */}
                  <div className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-8 text-[9pt]">
                      <div className="text-center pt-2">
                        <div className="font-bold text-black">{counselorName || 'Psikolojik Danışman'}</div>
                        <div className="text-[8pt] text-stone-600">Rehber Öğretmen & Psikolojik Danışman</div>
                        <div className="h-8" />
                        <div className="text-[8pt] text-stone-500 italic">İmza</div>
                      </div>

                      <div className="text-center pt-2">
                        <div className="font-bold text-black">Okul Müdürü / Müdür Yardımcısı</div>
                        <div className="text-[8pt] text-stone-600">Görülmüştür / İnceleme</div>
                        <div className="h-8" />
                        <div className="text-[8pt] text-stone-500 italic">Mühür / İmza</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-stone-300 pt-2 text-[8pt] text-stone-600 italic">
                      <div>
                        <strong>Gizli</strong> — 6698 sayılı KVKK kapsamında özel nitelikli kişisel veri içerir. Yetkisiz üçüncü şahıslarla paylaşılamaz.
                      </div>
                      <div className="font-mono text-[8pt] text-black">
                        Sayfa {dayIdx + 1} / {daysToPrint.length}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
