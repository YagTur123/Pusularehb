import { useState, useMemo } from 'react';
import { Student, ParsedStudentRow } from '../types';
import { parseBulkStudentText } from '../lib/parser';
import { StorageService } from '../lib/storage';
import { X, UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, Plus } from 'lucide-react';

interface SmartPasteModalProps {
  onClose: () => void;
  onImportComplete: (count: number) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

const SAMPLE_DATA = `Ahmet Yılmaz\t12-A\t0532 123 45 67\tNet Düşüşü, Geometri Eksiği
Ayşe Demir\tMezun\t0555 222 33 44\tMotivasyon
Mehmet Kaya - 11B - 0544 333 22 11 (AYT Matematik)
1. Zeynep Ak (12-C) 0555 987 65 43 [Paragraf Rutini, Sınav Kaygısı]`;

export function SmartPasteModal({
  onClose,
  onImportComplete,
  onShowToast,
}: SmartPasteModalProps) {
  const [inputText, setInputText] = useState('');

  const parsedRows: ParsedStudentRow[] = useMemo(() => {
    return parseBulkStudentText(inputText);
  }, [inputText]);

  const validRows = parsedRows.filter((r) => r.valid);
  const invalidRows = parsedRows.filter((r) => !r.valid);

  const handleImport = () => {
    if (validRows.length === 0) return;

    let addedCount = 0;
    const existing = StorageService.getStudents();
    const existingPhones = new Set(existing.map((s) => s.phone));

    validRows.forEach((row) => {
      // Check if duplicate phone
      if (!existingPhones.has(row.phone)) {
        StorageService.addStudent({
          full_name: row.full_name,
          class_grade: row.class_grade,
          phone: row.phone,
          status_flags: row.tags,
          last_meeting_date: null,
          target_goal: '',
          notes: 'Toplu akıllı yapıştırma ile eklendi.',
        });
        existingPhones.add(row.phone);
        addedCount++;
      }
    });

    onImportComplete(addedCount);
    onShowToast(
      'İçe Aktarma Tamamlandı',
      `${addedCount} yeni öğrenci sisteme başarıyla eklendi.`,
      'success'
    );
    onClose();
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_DATA);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Akıllı Toplu Öğrenci İçe Aktarma</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                  Smart Regex
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Excel sütunları veya karışık WhatsApp listelerini yapıştırın; isim, sınıf, telefon ve etiketler otomatik ayıklanır.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Metin veya Excel Verisini Buraya Yapıştırın:</span>
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium underline cursor-pointer"
              >
                Örnek Format Yükle
              </button>
            </div>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Excel'den kopyaladığınız satırları veya WhatsApp öğrenci listesini doğrudan buraya yapıştırın (Cmd+V)..."
              className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-indigo-500 selection:bg-indigo-100 dark:selection:bg-indigo-950 resize-y"
            />
          </div>

          {/* Real-time stats */}
          {parsedRows.length > 0 && (
            <div className="flex items-center gap-4 text-xs font-mono py-1.5 px-3 bg-slate-50 dark:bg-slate-950/60 rounded-md border border-slate-200 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">
                Toplam Satır: <strong className="text-slate-900 dark:text-white">{parsedRows.length}</strong>
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Geçerli: <strong className="text-slate-900 dark:text-white">{validRows.length}</strong>
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Eksik/Hatalı: <strong className="text-slate-900 dark:text-white">{invalidRows.length}</strong>
                </span>
              )}
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ayrıştırılan Öğrenci Önizlemesi ({validRows.length} / {parsedRows.length})
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/80 font-mono text-[11px] sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Durum</th>
                      <th className="px-3 py-2">Ad Soyad</th>
                      <th className="px-3 py-2">Sınıf</th>
                      <th className="px-3 py-2">Formatlanmış Tel</th>
                      <th className="px-3 py-2">Etiketler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                          !row.valid ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          {row.valid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Hazır
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-500/20" title={row.error}>
                              <AlertTriangle className="w-3 h-3" /> {row.error || 'Hata'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">
                          {row.full_name || <span className="text-slate-400">-</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">
                          {row.class_grade}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">
                          {row.phone ? `+${row.phone}` : <span className="text-rose-600 font-sans">Yok</span>}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {row.tags.length > 0 ? (
                              row.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                >
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="text-xs text-slate-500">
            Aynı telefon numarasına sahip mükerrer kayıtlar otomatik filtrelenir.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              İptal
            </button>
            <button
              onClick={handleImport}
              disabled={validRows.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{validRows.length} Öğrenciyi Sisteme Aktar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
