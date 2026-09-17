import React from 'react';
import { Session, Student } from '../types';
import { X, Printer, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatTurkishDate } from '../lib/storage';

interface DailyLogPrintModalProps {
  date: string;
  sessions: Session[];
  students: Student[];
  counselorName: string;
  onClose: () => void;
}

export function DailyLogPrintModal({
  date,
  sessions,
  students,
  counselorName,
  onClose,
}: DailyLogPrintModalProps) {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const sortedSessions = [...sessions]
    .filter((s) => s.date === date)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const totalAssigned = sortedSessions.filter((s) => s.student_id).length;
  const completedCount = sortedSessions.filter((s) => s.status === 'Geldi').length;
  const missedCount = sortedSessions.filter((s) => s.status === 'Gelmedi').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-4xl w-full my-8 flex flex-col overflow-hidden text-slate-800 dark:text-zinc-200">
        {/* Modal Controls (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-zinc-300 border border-emerald-200 dark:border-zinc-700/60">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Resmi Görüşme Defteri Çıktısı (A4 Formatı)
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                MEB Rehberlik Servisi standartlarına uygun günlük görüşme çizelgesi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF Kaydet</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 md:p-10 bg-slate-100/70 dark:bg-zinc-950 overflow-y-auto max-h-[calc(85vh-70px)] print:max-h-none print:p-0 print:bg-white">
          <div
            id="counseling-print-sheet"
            className="bg-white text-zinc-900 p-8 rounded-lg shadow-sm border border-zinc-300 max-w-3xl mx-auto print:border-none print:p-0 print:shadow-none print:max-w-none text-[12px] font-sans leading-normal"
          >
            {/* MEB Official Header */}
            <div className="text-center border-b-2 border-zinc-800 pb-3 mb-4">
              <h1 className="text-xs font-bold tracking-wider uppercase text-zinc-800">
                T.C. MİLLÎ EĞİTİM BAKANLIĞI
              </h1>
              <h2 className="text-sm font-bold tracking-tight uppercase mt-0.5 text-zinc-950">
                REHBERLİK VE PSİKOLOJİK DANIŞMA SERVİSİ
              </h2>
              <p className="text-[11px] font-semibold tracking-wide text-zinc-600 mt-0.5">
                GÜNLÜK ÖĞRENCİ GÖRÜŞME VE SEANS ÇİZELGESİ
              </p>
            </div>

            {/* Meta Information Bar */}
            <div className="grid grid-cols-2 gap-4 pb-3 mb-4 border-b border-zinc-300 text-xs">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold text-zinc-700">Tarih: </span>
                  <span className="font-medium text-zinc-900">{formatTurkishDate(date)}</span>
                </p>
                <p>
                  <span className="font-semibold text-zinc-700">Danışman / Rehber Öğretmen: </span>
                  <span className="font-medium text-zinc-900">{counselorName}</span>
                </p>
              </div>
              <div className="text-right space-y-1 font-mono text-[11px]">
                <p>
                  <span className="font-sans text-zinc-700">Planlanan Seans: </span>
                  <span className="font-semibold">{totalAssigned}</span>
                </p>
                <p>
                  <span className="font-sans text-zinc-700">Gerçekleşen: </span>
                  <span className="font-semibold text-emerald-700">{completedCount}</span>
                  <span className="font-sans text-zinc-400 mx-1">/</span>
                  <span className="font-sans text-zinc-700">Gelmedi: </span>
                  <span className="font-semibold text-rose-700">{missedCount}</span>
                </p>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-zinc-400 text-xs mb-6">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 text-[11px] font-bold">
                  <th className="border border-zinc-400 py-1.5 px-2 text-center w-8">No</th>
                  <th className="border border-zinc-400 py-1.5 px-2 text-left w-16">Saat</th>
                  <th className="border border-zinc-400 py-1.5 px-2 text-left w-36">Öğrenci Adı Soyadı</th>
                  <th className="border border-zinc-400 py-1.5 px-2 text-center w-14">Sınıf</th>
                  <th className="border border-zinc-400 py-1.5 px-2 text-left">Görüşme Konusu & Teşhis</th>
                  <th className="border border-zinc-400 py-1.5 px-2 text-center w-16">Durum</th>
                  <th className="border border-zinc-400 py-1.5 px-2 text-left w-44">Karar / Ödev Notu</th>
                  <th className="border border-zinc-400 py-1.5 px-2 text-center w-14">İmza</th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-zinc-400 py-4 text-center text-zinc-500 italic">
                      Bu tarih için kayıtlı görüşme seansı bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  sortedSessions.map((session, index) => {
                    const student = session.student_id ? studentMap.get(session.student_id) : null;
                    return (
                      <tr key={session.id} className="border-b border-zinc-300">
                        <td className="border border-zinc-400 py-2 px-1 text-center font-mono text-[11px] text-zinc-600">
                          {index + 1}
                        </td>
                        <td className="border border-zinc-400 py-2 px-2 font-mono text-[11px] font-medium text-zinc-800">
                          {session.time_slot}
                        </td>
                        <td className="border border-zinc-400 py-2 px-2 font-medium text-zinc-900">
                          {student ? student.full_name : <span className="text-zinc-400 italic">Boş Seans</span>}
                        </td>
                        <td className="border border-zinc-400 py-2 px-2 text-center font-mono text-[11px] text-zinc-700">
                          {student ? student.class_grade : '-'}
                        </td>
                        <td className="border border-zinc-400 py-2 px-2 text-zinc-800">
                          <div>
                            {session.topic || (student ? 'Rutin Takip' : '-')}
                            {session.tags && session.tags.length > 0 && (
                              <span className="block text-[10px] text-zinc-500 mt-0.5">
                                ({session.tags.join(', ')})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="border border-zinc-400 py-2 px-1 text-center font-medium text-[10px]">
                          {session.status === 'Geldi' ? (
                            <span className="text-emerald-700 font-semibold">Geldi</span>
                          ) : session.status === 'Gelmedi' ? (
                            <span className="text-rose-700 font-bold">Gelmedi</span>
                          ) : (
                            <span className="text-zinc-600">Bekliyor</span>
                          )}
                        </td>
                        <td className="border border-zinc-400 py-2 px-2 text-zinc-700 text-[11px]">
                          {session.action_items || '-'}
                        </td>
                        <td className="border border-zinc-400 py-2 px-2 text-center">
                          {/* Signature box */}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Official Signatures */}
            <div className="grid grid-cols-2 gap-12 pt-8 mt-6 border-t border-zinc-300 text-xs">
              <div className="text-center">
                <p className="font-semibold text-zinc-800">{counselorName}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Psikolojik Danışman / Rehber Öğretmen</p>
                <div className="h-12" />
                <p className="text-[10px] text-zinc-400 italic">İmza</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-zinc-800">Okul Müdürü / Yetkili</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Onay ve İnceleme</p>
                <div className="h-12" />
                <p className="text-[10px] text-zinc-400 italic">Mühür / İmza</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
