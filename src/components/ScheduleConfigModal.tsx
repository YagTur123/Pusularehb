import React, { useState, useMemo } from 'react';
import {
  Clock,
  Coffee,
  Sliders,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Calendar,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { ScheduleConfig } from '../types';
import {
  StorageService,
  DEFAULT_SCHEDULE_CONFIG,
  generateSlotsFromScheduleConfig,
  formatTurkishDate,
  WeekDayInfo,
} from '../lib/storage';

interface ScheduleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  weekDays: WeekDayInfo[];
  onApplySchedule: (dates: string[], config: ScheduleConfig, keepAssigned: boolean) => void;
  onShiftTime: (dates: string[], deltaMinutes: number) => void;
  onAddBreak: (date: string, timeSlot: string, title?: string) => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'info' | 'warning') => void;
}

export function ScheduleConfigModal({
  isOpen,
  onClose,
  selectedDate,
  weekDays,
  onApplySchedule,
  onShiftTime,
  onAddBreak,
  onShowToast,
}: ScheduleConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'shift' | 'break'>('generate');

  // Config State
  const [config, setConfig] = useState<ScheduleConfig>(() => StorageService.getScheduleConfig());
  const [keepAssigned, setKeepAssigned] = useState(true);

  // Sync latest user config when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setConfig(StorageService.getScheduleConfig());
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Time Shift State
  const [shiftScope, setShiftScope] = useState<'day' | 'week'>('week');
  const [customShiftMinutes, setCustomShiftMinutes] = useState<number>(10);

  // Add Break State
  const [breakDate, setBreakDate] = useState(selectedDate);
  const [breakTime, setBreakTime] = useState('10:30');
  const [breakTitle, setBreakTitle] = useState('15 dk Teneffüs');

  // Preview generated slots
  const previewSlots = useMemo(() => {
    return generateSlotsFromScheduleConfig(config);
  }, [config]);

  if (!isOpen) return null;

  const targetWeekDates = weekDays.map((d) => d.date);

  const handleApplyToDay = () => {
    onApplySchedule([selectedDate], config, keepAssigned);
    onShowToast(
      'Günlük Program Güncellendi',
      `${selectedDate} için ${config.sessionDuration} dk seanslar ve ${config.breakDuration} dk aralar uygulandı.`,
      'success'
    );
    onClose();
  };

  const handleApplyToWeek = () => {
    onApplySchedule(targetWeekDates, config, keepAssigned);
    onShowToast(
      'Haftalık Program Güncellendi',
      `Tüm hafta için ${config.sessionDuration} dk seanslar ve ${config.breakDuration} dk teneffüsler uygulandı.`,
      'success'
    );
    onClose();
  };

  const handleQuickShift = (delta: number) => {
    const dates = shiftScope === 'day' ? [selectedDate] : targetWeekDates;
    onShiftTime(dates, delta);
    onShowToast(
      'Saatler Kaydırıldı',
      `${dates.length > 1 ? 'Tüm haftanın' : selectedDate + ' gününün'} saatleri ${delta > 0 ? `+${delta}` : delta} dakika kaydırıldı.`,
      'info'
    );
  };

  const handleAddBreakSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakTime.trim()) return;
    onAddBreak(breakDate, breakTime.trim(), breakTitle.trim() || 'Teneffüs');
    onShowToast('Teneffüs Eklendi', `${breakDate} günü saat ${breakTime} için ${breakTitle} bloğu eklendi.`, 'success');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-config-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[90vh] text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 id="schedule-config-title" className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
                Program, Periyot & Teneffüs Ayarları
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Seans süresini, teneffüs aralarını ve saatleri özelleştirin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`pb-2 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'generate'
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Süre & Ara</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shift')}
            className={`pb-2 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'shift'
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Saatleri Kaydır</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('break')}
            className={`pb-2 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'break'
                ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>Teneffüs / Mola Ekle</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'generate' && (
            <div className="space-y-4 text-xs">
              {/* Session Duration */}
              <div className="space-y-2 p-3.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                <label className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                  <span>Rehberlik Seansı Kaç Dakika Olsun?</span>
                  <span className="font-mono text-teal-700 dark:text-teal-400 font-semibold text-xs px-2.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs">
                    {config.sessionDuration} Dakika
                  </span>
                </label>

                {/* Range Slider */}
                <div className="pt-1.5 pb-1">
                  <input
                    type="range"
                    min={5}
                    max={90}
                    step={5}
                    value={config.sessionDuration}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        sessionDuration: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-teal-600 dark:accent-teal-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-stone-500 dark:text-stone-400 mt-1">
                    <span>5 dk</span>
                    <span>15 dk (Standart)</span>
                    <span>30 dk</span>
                    <span>45 dk</span>
                    <span>90 dk</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[15, 20, 25, 30, 40].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setConfig({ ...config, sessionDuration: mins })}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                        config.sessionDuration === mins
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs dark:bg-teal-600 dark:border-teal-600'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:text-stone-100'
                      }`}
                    >
                      {mins} dk {mins === 15 && '★ (Önerilen)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Break Duration */}
              <div className="space-y-2 p-3.5 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
                <label className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-between">
                  <span>Teneffüs / Geçiş Arası Kaç Dakika Olsun?</span>
                  <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold text-xs px-2.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs">
                    {config.breakDuration} Dakika
                  </span>
                </label>

                {/* Range Slider */}
                <div className="pt-1.5 pb-1">
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={5}
                    value={config.breakDuration}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        breakDuration: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-amber-600 dark:accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-stone-500 dark:text-stone-400 mt-1">
                    <span>0 dk (Peş Peşe)</span>
                    <span>5 dk (Standart)</span>
                    <span>10 dk</span>
                    <span>15 dk</span>
                    <span>40 dk</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {[0, 5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setConfig({ ...config, breakDuration: mins })}
                      className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                        config.breakDuration === mins
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs dark:bg-amber-600 dark:border-amber-600'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300 dark:hover:text-stone-100'
                      }`}
                    >
                      {mins === 0 ? '0 dk (Peş Peşe)' : `${mins} dk ${mins === 5 ? '(Standart)' : ''}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid: Start Time & Session Count */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300">İlk Seans Başlangıç Saati</label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-mono text-xs focus:border-stone-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Günlük Seans Sayısı</label>
                  <select
                    value={config.sessionCount}
                    onChange={(e) =>
                      setConfig({ ...config, sessionCount: parseInt(e.target.value, 10) || 16 })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-mono text-xs focus:border-stone-500 focus:outline-hidden"
                  >
                    <option value={8}>8 Seans (~2.5 Saat)</option>
                    <option value={10}>10 Seans (~3.5 Saat)</option>
                    <option value={12}>12 Seans (~4 Saat)</option>
                    <option value={14}>14 Seans (~4.5 Saat)</option>
                    <option value={16}>16 Seans (Standart Tam Gün)</option>
                    <option value={18}>18 Seans (~6 Saat)</option>
                    <option value={20}>20 Seans (~7 Saat)</option>
                    <option value={24}>24 Seans (Yoğun Gün)</option>
                  </select>
                </div>
              </div>

              {/* Lunch Break Toggle */}
              <div className="p-3 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-lg space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    Öğle Arası / Yemek Molası Eklensin mi?
                  </span>
                  <input
                    type="checkbox"
                    checked={config.includeLunchBreak}
                    onChange={(e) =>
                      setConfig({ ...config, includeLunchBreak: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-700 text-teal-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                {config.includeLunchBreak && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] text-stone-700 dark:text-stone-300">
                    <div>
                      <span className="font-medium">Kaçıncı seanstan sonra?</span>
                      <select
                        value={config.lunchBreakAfter}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lunchBreakAfter: parseInt(e.target.value, 10) || 8,
                          })
                        }
                        className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 font-mono text-xs"
                      >
                        <option value={6}>6. Seanstan sonra (~11:00)</option>
                        <option value={7}>7. Seanstan sonra (~11:20)</option>
                        <option value={8}>8. Seanstan sonra (~11:40 - 12:00 civarı)</option>
                        <option value={9}>9. Seanstan sonra (~12:15)</option>
                        <option value={10}>10. Seanstan sonra (~12:40)</option>
                      </select>
                    </div>

                    <div>
                      <span className="font-medium">Öğle Arası Süresi</span>
                      <select
                        value={config.lunchBreakDuration}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lunchBreakDuration: parseInt(e.target.value, 10) || 45,
                          })
                        }
                        className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 font-mono text-xs"
                      >
                        <option value={30}>30 Dakika</option>
                        <option value={40}>40 Dakika</option>
                        <option value={45}>45 Dakika (Standart)</option>
                        <option value={50}>50 Dakika</option>
                        <option value={60}>60 Dakika (1 Saat)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline Live Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="font-medium text-stone-700 dark:text-stone-300">Oluşacak Seans Çizelgesi Önizleme:</span>
                  <span>{previewSlots.filter((s) => !s.is_break).length} Seans • {previewSlots.filter((s) => s.is_break).length} Mola</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-lg max-h-36 overflow-y-auto">
                  {previewSlots.map((slot, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 ${
                        slot.is_break
                          ? 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                          : 'bg-white text-stone-800 border border-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {slot.is_break && <Coffee className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />}
                      <span>{slot.time_slot}</span>
                      {slot.is_break && <span className="text-[9px] opacity-75">({slot.break_title?.split(' ')[0]} dk ara)</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preservation checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={keepAssigned}
                  onChange={(e) => setKeepAssigned(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-700 text-teal-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-stone-700 dark:text-stone-300 text-xs">
                  Mevcut atanmış öğrencileri koru ve yeni saatlere sırasıyla aktar
                </span>
              </label>

              {/* Apply Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={handleApplyToDay}
                  className="px-3 py-2 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 font-medium text-xs transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
                >
                  Yalnızca Seçili Güne ({selectedDate}) Uygula
                </button>
                <button
                  type="button"
                  onClick={handleApplyToWeek}
                  className="px-4 py-2 rounded-md bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-medium text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                  <span>Tüm Haftaya Uygula (Pzt-Cum)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-stone-100 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-lg text-stone-700 dark:text-stone-300 leading-relaxed">
                Tablodaki mevcut tüm seans ve mola saatlerini tek tıkla ileriye veya geriye kaydırabilirsiniz.
                Öğrenci randevuları ve notları aynen korunur.
              </div>

              {/* Scope Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Kaydırma Kapsamı:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShiftScope('week')}
                    className={`p-2.5 rounded-md border text-left cursor-pointer transition-colors ${
                      shiftScope === 'week'
                        ? 'bg-stone-200 border-stone-400 text-stone-900 font-semibold dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 dark:bg-stone-900/40 dark:border-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                    }`}
                  >
                    <div className="text-xs">Tüm Hafta</div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">Pazartesi - Cuma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftScope('day')}
                    className={`p-2.5 rounded-md border text-left cursor-pointer transition-colors ${
                      shiftScope === 'day'
                        ? 'bg-stone-200 border-stone-400 text-stone-900 font-semibold dark:bg-stone-800 dark:border-stone-600 dark:text-stone-100'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 dark:bg-stone-900/40 dark:border-stone-800 dark:text-stone-400 dark:hover:text-stone-200'
                    }`}
                  >
                    <div className="text-xs">Seçili Gün</div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">{formatTurkishDate(selectedDate)}</div>
                  </button>
                </div>
              </div>

              {/* Quick Shift Presets */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Hızlı Kaydırma Butonları:</label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[11px] text-stone-600 dark:text-stone-400">İleri Kaydır (+):</span>
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleQuickShift(mins)}
                          className="px-3 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 dark:border-stone-700 text-xs font-mono font-medium transition-colors cursor-pointer"
                        >
                          +{mins} dk
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[11px] text-stone-600 dark:text-stone-400">Geri Kaydır (-):</span>
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleQuickShift(-mins)}
                          className="px-3 py-1.5 rounded-md bg-stone-100 hover:bg-stone-200 text-rose-700 border border-rose-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-rose-400 dark:border-stone-700 text-xs font-mono font-medium transition-colors cursor-pointer"
                        >
                          -{mins} dk
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Shift Minutes */}
              <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2">
                <span className="text-xs text-stone-700 dark:text-stone-300">Özel Dakika Miktarı ile Kaydır:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customShiftMinutes}
                    onChange={(e) => setCustomShiftMinutes(parseInt(e.target.value, 10) || 10)}
                    className="w-16 px-2 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded text-stone-900 dark:text-stone-100 text-center font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickShift(-customShiftMinutes)}
                    className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-rose-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-rose-400 text-xs font-medium cursor-pointer"
                  >
                    -{customShiftMinutes} dk
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickShift(customShiftMinutes)}
                    className="px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 text-xs font-medium cursor-pointer"
                  >
                    +{customShiftMinutes} dk
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'break' && (
            <form onSubmit={handleAddBreakSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50/70 dark:bg-stone-900/60 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-900 dark:text-amber-300 leading-relaxed">
                Tabloya özel teneffüs, mola, öğle arası veya rehberlik toplantısı bloğu ekleyin.
                Teneffüsler haftalık çizelgede özel mola kartı olarak görüntülenir.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Tarih</label>
                  <input
                    type="date"
                    value={breakDate}
                    onChange={(e) => setBreakDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-mono text-xs focus:border-stone-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Teneffüs Saati</label>
                  <input
                    type="time"
                    value={breakTime}
                    onChange={(e) => setBreakTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 font-mono text-xs focus:border-stone-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">Mola Başlığı & Açıklaması</label>
                <input
                  type="text"
                  value={breakTitle}
                  onChange={(e) => setBreakTitle(e.target.value)}
                  placeholder="Örn: 15 dk Teneffüs, Öğle Arası & Yemek, Zümre Toplantısı..."
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-md text-stone-900 dark:text-stone-100 text-xs placeholder-stone-400 dark:placeholder-stone-500 focus:border-stone-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  '10 dk Teneffüs',
                  '15 dk Teneffüs',
                  '45 dk Öğle Arası & Yemek',
                  'Rehberlik Zümre Toplantısı',
                  'Veli Görüşme Saati',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBreakTitle(preset)}
                    className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:hover:text-stone-100 border border-stone-200 dark:border-stone-700 text-[11px] transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-950 font-medium text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Teneffüsü Tabloya Ekle</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
