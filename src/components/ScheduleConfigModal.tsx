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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-[#181a26] border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800 dark:text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50/80 dark:bg-[#141622]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Program, Periyot & Teneffüs Ayarları
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Seans süresini, teneffüs aralarını ve tablo saatlerini dilediğiniz gibi özelleştirin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/[0.08] bg-slate-100/60 dark:bg-[#12141e] px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'generate'
                ? 'border-emerald-600 text-slate-900 dark:border-emerald-400 dark:text-white font-semibold'
                : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Süre & Ara Belirle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shift')}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'shift'
                ? 'border-sky-600 text-slate-900 dark:border-sky-400 dark:text-white font-semibold'
                : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Saatleri Kaydır (± Dk)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('break')}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'break'
                ? 'border-amber-600 text-slate-900 dark:border-amber-400 dark:text-white font-semibold'
                : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Teneffüs / Mola Ekle</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'generate' && (
            <div className="space-y-4 text-xs">
              {/* Session Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-200 flex items-center justify-between">
                  <span>Seans Kaç Dakika Olsun?</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {config.sessionDuration} Dakika
                  </span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[30, 40, 45, 50, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setConfig({ ...config, sessionDuration: mins })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        config.sessionDuration === mins
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:bg-zinc-900 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-850'
                      }`}
                    >
                      {mins} dk {mins === 40 && '(Standart MEB)'}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-500">Özel:</span>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={config.sessionDuration}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          sessionDuration: Math.max(10, parseInt(e.target.value, 10) || 40),
                        })
                      }
                      className="w-16 px-2 py-1 bg-slate-50 dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.1] rounded text-slate-900 dark:text-white text-center font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Break Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-200 flex items-center justify-between">
                  <span>Teneffüs / Ara Kaç Dakika Olsun?</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    {config.breakDuration} Dakika
                  </span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[5, 10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setConfig({ ...config, breakDuration: mins })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                        config.breakDuration === mins
                          ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:bg-zinc-900 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-850'
                      }`}
                    >
                      {mins} dk {mins === 10 && '(Standart Ara)'}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-500">Özel:</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={config.breakDuration}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          breakDuration: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-16 px-2 py-1 bg-slate-50 dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.1] rounded text-slate-900 dark:text-white text-center font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Grid: Start Time & Session Count */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">İlk Seans Başlangıç Saati</label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.1] rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Günlük Seans Sayısı</label>
                  <select
                    value={config.sessionCount}
                    onChange={(e) =>
                      setConfig({ ...config, sessionCount: parseInt(e.target.value, 10) || 8 })
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.1] rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={5}>5 Seans</option>
                    <option value={6}>6 Seans</option>
                    <option value={7}>7 Seans</option>
                    <option value={8}>8 Seans (Tam Gün)</option>
                    <option value={9}>9 Seans</option>
                    <option value={10}>10 Seans</option>
                  </select>
                </div>
              </div>

              {/* Lunch Break Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-slate-800 dark:text-zinc-200">
                    Öğle Arası / Yemek Molası Eklensin mi?
                  </span>
                  <input
                    type="checkbox"
                    checked={config.includeLunchBreak}
                    onChange={(e) =>
                      setConfig({ ...config, includeLunchBreak: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-zinc-800 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </label>

                {config.includeLunchBreak && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                    <div>
                      <span>Kaçıncı seanstan sonra?</span>
                      <select
                        value={config.lunchBreakAfter}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lunchBreakAfter: parseInt(e.target.value, 10) || 4,
                          })
                        }
                        className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.1] rounded text-slate-900 dark:text-white font-mono text-xs"
                      >
                        <option value={3}>3. Seanstan sonra</option>
                        <option value={4}>4. Seanstan sonra (12:20 civarı)</option>
                        <option value={5}>5. Seanstan sonra</option>
                      </select>
                    </div>

                    <div>
                      <span>Öğle Arası Süresi</span>
                      <select
                        value={config.lunchBreakDuration}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lunchBreakDuration: parseInt(e.target.value, 10) || 50,
                          })
                        }
                        className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.1] rounded text-slate-900 dark:text-white font-mono text-xs"
                      >
                        <option value={40}>40 Dakika</option>
                        <option value={50}>50 Dakika (Standart)</option>
                        <option value={60}>60 Dakika (1 Saat)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline Live Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="font-medium text-slate-700 dark:text-zinc-300">Oluşacak Seans Çizelgesi Önizleme:</span>
                  <span>{previewSlots.filter((s) => !s.is_break).length} Seans • {previewSlots.filter((s) => s.is_break).length} Mola</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 dark:bg-[#08090d] border border-slate-200 dark:border-white/[0.06] rounded-xl max-h-36 overflow-y-auto">
                  {previewSlots.map((slot, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 ${
                        slot.is_break
                          ? 'bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-300'
                          : 'bg-white text-slate-800 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-white/[0.08]'
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
                  className="w-4 h-4 rounded border-slate-300 dark:border-white/20 bg-white dark:bg-zinc-800 text-emerald-600 focus:ring-0 cursor-pointer"
                />
                <span className="text-slate-700 dark:text-zinc-300 text-xs">
                  Mevcut atanmış öğrencileri koru ve yeni saatlere sırasıyla aktar
                </span>
              </label>

              {/* Apply Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleApplyToDay}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:hover:text-white font-medium text-xs transition-colors cursor-pointer border border-slate-200 dark:border-white/[0.06]"
                >
                  Yalnızca Seçili Güne ({selectedDate}) Uygula
                </button>
                <button
                  type="button"
                  onClick={handleApplyToWeek}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Tüm Haftaya Uygula (Pzt-Cum)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-500/20 rounded-xl text-sky-800 dark:text-sky-200 leading-relaxed">
                Tablodaki mevcut tüm seans ve mola saatlerini tek tıkla ileriye veya geriye kaydırabilirsiniz.
                Öğrenci randevuları ve notları aynen korunur.
              </div>

              {/* Scope Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-200">Kaydırma Kapsamı:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShiftScope('week')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      shiftScope === 'week'
                        ? 'bg-sky-50 border-sky-400 text-sky-900 font-semibold dark:bg-sky-950/30 dark:border-sky-400 dark:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-zinc-900/60 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Tüm Hafta</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-500 font-normal">Pazartesi - Cuma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftScope('day')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      shiftScope === 'day'
                        ? 'bg-sky-50 border-sky-400 text-sky-900 font-semibold dark:bg-sky-950/30 dark:border-sky-400 dark:text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 dark:bg-zinc-900/60 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Seçili Gün</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-500 font-normal">{formatTurkishDate(selectedDate)}</div>
                  </button>
                </div>
              </div>

              {/* Quick Shift Presets */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-200">Hızlı Kaydırma Butonları:</label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[11px] text-slate-600 dark:text-zinc-400">İleri Kaydır (+):</span>
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleQuickShift(mins)}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 dark:text-sky-300 dark:border-sky-500/30 text-xs font-mono font-medium transition-all cursor-pointer"
                        >
                          +{mins} dk
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[11px] text-slate-600 dark:text-zinc-400">Geri Kaydır (-):</span>
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleQuickShift(-mins)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 dark:text-rose-300 dark:border-rose-500/30 text-xs font-mono font-medium transition-all cursor-pointer"
                        >
                          -{mins} dk
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Shift Minutes */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <span className="text-xs text-slate-700 dark:text-zinc-300">Özel Dakika Miktarı ile Kaydır:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customShiftMinutes}
                    onChange={(e) => setCustomShiftMinutes(parseInt(e.target.value, 10) || 10)}
                    className="w-16 px-2 py-1 bg-slate-50 dark:bg-[#090a0f] border border-slate-300 dark:border-white/[0.1] rounded text-slate-900 dark:text-white text-center font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickShift(-customShiftMinutes)}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-rose-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-rose-300 text-xs font-medium cursor-pointer"
                  >
                    -{customShiftMinutes} dk
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickShift(customShiftMinutes)}
                    className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer"
                  >
                    +{customShiftMinutes} dk
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'break' && (
            <form onSubmit={handleAddBreakSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-[#1e1c18] border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-200/90 leading-relaxed">
                Tabloya özel teneffüs, mola, öğle arası veya rehberlik toplantısı bloğu ekleyin.
                Teneffüsler haftalık çizelgede özel mola kartı olarak görüntülenir.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Tarih</label>
                  <input
                    type="date"
                    value={breakDate}
                    onChange={(e) => setBreakDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Teneffüs Saati</label>
                  <input
                    type="time"
                    value={breakTime}
                    onChange={(e) => setBreakTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white font-mono text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">Mola Başlığı & Açıklaması</label>
                <input
                  type="text"
                  value={breakTitle}
                  onChange={(e) => setBreakTitle(e.target.value)}
                  placeholder="Örn: 15 dk Teneffüs, Öğle Arası & Yemek, Zümre Toplantısı..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#12141e] border border-slate-300 dark:border-white/[0.08] rounded-lg text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500"
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
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-[#1f1e24] dark:hover:bg-[#282732] dark:text-zinc-300 dark:hover:text-white border border-slate-200 dark:border-white/[0.06] text-[11px] transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
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
