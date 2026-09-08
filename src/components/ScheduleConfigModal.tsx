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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0e1017] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0d13]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Program, Periyot & Teneffüs Ayarları
              </h2>
              <p className="text-[11px] text-zinc-400">
                Seans süresini, teneffüs aralarını ve tablo saatlerini dilediğiniz gibi özelleştirin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/[0.08] bg-[#090a0e] px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'generate'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Süre & Ara Belirle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shift')}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'shift'
                ? 'border-sky-400 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
            <span>Saatleri Kaydır (± Dk)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('break')}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'break'
                ? 'border-amber-400 text-white font-semibold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Teneffüs / Mola Ekle</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'generate' && (
            <div className="space-y-4 text-xs">
              {/* Session Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-200 flex items-center justify-between">
                  <span>Seans Kaç Dakika Olsun?</span>
                  <span className="font-mono text-emerald-400 font-semibold">
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
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                          : 'bg-zinc-900 border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      {mins} dk {mins === 40 && '(Standart MEB)'}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-zinc-500">Özel:</span>
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
                      className="w-16 px-2 py-1 bg-[#090a0f] border border-white/[0.1] rounded text-white text-center font-mono text-xs focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
              </div>

              {/* Break Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-200 flex items-center justify-between">
                  <span>Teneffüs / Ara Kaç Dakika Olsun?</span>
                  <span className="font-mono text-amber-400 font-semibold">
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
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                          : 'bg-zinc-900 border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                      }`}
                    >
                      {mins} dk {mins === 10 && '(Standart Ara)'}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-zinc-500">Özel:</span>
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
                      className="w-16 px-2 py-1 bg-[#090a0f] border border-white/[0.1] rounded text-white text-center font-mono text-xs focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
              </div>

              {/* Grid: Start Time & Session Count */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">İlk Seans Başlangıç Saati</label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => setConfig({ ...config, startTime: e.target.value })}
                    className="w-full px-3 py-1.5 bg-[#090a0f] border border-white/[0.1] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-white/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Günlük Seans Sayısı</label>
                  <select
                    value={config.sessionCount}
                    onChange={(e) =>
                      setConfig({ ...config, sessionCount: parseInt(e.target.value, 10) || 8 })
                    }
                    className="w-full px-3 py-1.5 bg-[#090a0f] border border-white/[0.1] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-white/30"
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
              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-medium text-zinc-200">
                    Öğle Arası / Yemek Molası Eklensin mi?
                  </span>
                  <input
                    type="checkbox"
                    checked={config.includeLunchBreak}
                    onChange={(e) =>
                      setConfig({ ...config, includeLunchBreak: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                </label>

                {config.includeLunchBreak && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] text-zinc-400">
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
                        className="w-full mt-1 px-2.5 py-1 bg-[#090a0f] border border-white/[0.1] rounded text-white font-mono text-xs"
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
                        className="w-full mt-1 px-2.5 py-1 bg-[#090a0f] border border-white/[0.1] rounded text-white font-mono text-xs"
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
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-medium text-zinc-300">Oluşacak Seans Çizelgesi Önizleme:</span>
                  <span>{previewSlots.filter((s) => !s.is_break).length} Seans • {previewSlots.filter((s) => s.is_break).length} Mola</span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#08090d] border border-white/[0.06] rounded-xl max-h-36 overflow-y-auto">
                  {previewSlots.map((slot, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 ${
                        slot.is_break
                          ? 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
                          : 'bg-zinc-800 text-zinc-200 border border-white/[0.08]'
                      }`}
                    >
                      {slot.is_break && <Coffee className="w-2.5 h-2.5 text-amber-400" />}
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
                  className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-zinc-300 text-xs">
                  Mevcut atanmış öğrencileri koru ve yeni saatlere sırasıyla aktar
                </span>
              </label>

              {/* Apply Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleApplyToDay}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Yalnızca Seçili Güne ({selectedDate}) Uygula
                </button>
                <button
                  type="button"
                  onClick={handleApplyToWeek}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Tüm Haftaya Uygula (Pzt-Cum)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl text-sky-200 leading-relaxed">
                Tablodaki mevcut tüm seans ve mola saatlerini tek tıkla ileriye veya geriye kaydırabilirsiniz.
                Öğrenci randevuları ve notları aynen korunur.
              </div>

              {/* Scope Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-200">Kaydırma Kapsamı:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShiftScope('week')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      shiftScope === 'week'
                        ? 'bg-sky-950/30 border-sky-400 text-white font-semibold'
                        : 'bg-zinc-900/60 border-white/[0.08] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Tüm Hafta</div>
                    <div className="text-[11px] text-zinc-500 font-normal">Pazartesi - Cuma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShiftScope('day')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      shiftScope === 'day'
                        ? 'bg-sky-950/30 border-sky-400 text-white font-semibold'
                        : 'bg-zinc-900/60 border-white/[0.08] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs">Seçili Gün</div>
                    <div className="text-[11px] text-zinc-500 font-normal">{formatTurkishDate(selectedDate)}</div>
                  </button>
                </div>
              </div>

              {/* Quick Shift Presets */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-200">Hızlı Kaydırma Butonları:</label>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[11px] text-zinc-400">İleri Kaydır (+):</span>
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleQuickShift(mins)}
                          className="px-3 py-1.5 rounded-lg bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 border border-sky-500/30 text-xs font-mono font-medium transition-all cursor-pointer"
                        >
                          +{mins} dk
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-24 text-[11px] text-zinc-400">Geri Kaydır (-):</span>
                    <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                      {[5, 10, 15, 30].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => handleQuickShift(-mins)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-mono font-medium transition-all cursor-pointer"
                        >
                          -{mins} dk
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom Shift Minutes */}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-300">Özel Dakika Miktarı ile Kaydır:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customShiftMinutes}
                    onChange={(e) => setCustomShiftMinutes(parseInt(e.target.value, 10) || 10)}
                    className="w-16 px-2 py-1 bg-[#090a0f] border border-white/[0.1] rounded text-white text-center font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickShift(-customShiftMinutes)}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-rose-300 text-xs font-medium cursor-pointer"
                  >
                    -{customShiftMinutes} dk
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickShift(customShiftMinutes)}
                    className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold cursor-pointer"
                  >
                    +{customShiftMinutes} dk
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'break' && (
            <form onSubmit={handleAddBreakSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-amber-200 leading-relaxed">
                Tabloya özel teneffüs, mola, öğle arası veya rehberlik toplantısı bloğu ekleyin.
                Teneffüsler haftalık çizelgede özel mola kartı olarak görüntülenir.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Tarih</label>
                  <input
                    type="date"
                    value={breakDate}
                    onChange={(e) => setBreakDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#090a0f] border border-white/[0.1] rounded-lg text-white font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Teneffüs Saati</label>
                  <input
                    type="time"
                    value={breakTime}
                    onChange={(e) => setBreakTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#090a0f] border border-white/[0.1] rounded-lg text-white font-mono text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">Mola Başlığı & Açıklaması</label>
                <input
                  type="text"
                  value={breakTitle}
                  onChange={(e) => setBreakTitle(e.target.value)}
                  placeholder="Örn: 15 dk Teneffüs, Öğle Arası & Yemek, Zümre Toplantısı..."
                  className="w-full px-3 py-2 bg-[#090a0f] border border-white/[0.1] rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white/25"
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
                    className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 border border-white/[0.06] text-[11px] transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
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
