import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, Session, User } from '../types';
import {
  Search,
  Zap,
  MessageSquare,
  UploadCloud,
  Plus,
  Calendar,
  Download,
  Users,
  Clock,
  ArrowRight,
  LogIn,
  UserPlus,
  UserCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { getTodayDateString, StorageService } from '../lib/storage';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onFillStandardSlots: (date: string) => void;
  onOpenBroadcast: () => void;
  onOpenSmartPaste: () => void;
  onAddStudent: () => void;
  onSelectDate: (date: string) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  currentUser?: User | null;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
  onOpenProfile?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

interface CommandItem {
  id: string;
  category: 'Öğrenciler' | 'İşlemler' | 'Navigasyon';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  students,
  onSelectStudent,
  onFillStandardSlots,
  onOpenBroadcast,
  onOpenSmartPaste,
  onAddStudent,
  onSelectDate,
  onExportJson,
  onExportCsv,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  theme = 'light',
  onToggleTheme,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // Auth actions
    if (currentUser) {
      if (onOpenProfile) {
        list.push({
          id: 'act_user_profile',
          category: 'İşlemler',
          title: `Danışman Profili: ${currentUser.name}`,
          subtitle: `${currentUser.role} • Profil ve kurum ayarlarını düzenle`,
          icon: <UserCheck className="w-4 h-4 text-emerald-400" />,
          action: () => {
            onClose();
            onOpenProfile();
          },
        });
      }
    } else {
      if (onOpenAuth) {
        list.push({
          id: 'act_sign_in',
          category: 'İşlemler',
          title: 'Danışman Girişi Yap (Sign In)',
          subtitle: 'E-posta ve şifrenizle giriş yapın',
          icon: <LogIn className="w-4 h-4 text-sky-400" />,
          action: () => {
            onClose();
            onOpenAuth('signin');
          },
        });
        list.push({
          id: 'act_sign_up',
          category: 'İşlemler',
          title: 'Yeni Danışman Hesabı Aç (Sign Up)',
          subtitle: '30 saniyede ücretsiz danışman profili oluştur',
          icon: <UserPlus className="w-4 h-4 text-emerald-400" />,
          action: () => {
            onClose();
            onOpenAuth('signup');
          },
        });
      }
    }

    // Static actions
    list.push({
      id: 'act_broadcast',
      category: 'İşlemler',
      title: 'WhatsApp Grup İlan Tablosu',
      subtitle: 'Profesyonel seans tablosunu kopyala veya önizle',
      icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onOpenBroadcast();
      },
    });

    list.push({
      id: 'act_fill_slots',
      category: 'İşlemler',
      title: '⚡ Standart Seansları Doldur',
      subtitle: 'Günün 40 dakikalık periyotlarını oluştur',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      action: () => {
        onClose();
        onFillStandardSlots(getTodayDateString());
      },
    });

    list.push({
      id: 'act_smart_paste',
      category: 'İşlemler',
      title: 'Toplu Öğrenci İçe Aktar',
      subtitle: "Excel veya WhatsApp'tan yapıştır (Smart Regex)",
      icon: <UploadCloud className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onClose();
        onOpenSmartPaste();
      },
    });

    list.push({
      id: 'act_new_student',
      category: 'İşlemler',
      title: 'Yeni Öğrenci Ekle',
      subtitle: 'Manuel olarak yeni öğrenci kartı aç',
      icon: <Plus className="w-4 h-4 text-sky-400" />,
      action: () => {
        onClose();
        onAddStudent();
      },
    });

    if (onToggleTheme) {
      list.push({
        id: 'act_toggle_theme',
        category: 'İşlemler',
        title: theme === 'light' ? '🌙 Koyu Temaya Geç (Gece Modu)' : '☀️ Açık Beyaz Temaya Geç (Gündüz Modu)',
        subtitle: theme === 'light' ? 'Göz dinlendirici koyu arayüze geçiş yap' : 'Aydınlık beyaz çalışma moduna geçiş yap',
        icon: theme === 'light' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />,
        action: () => {
          onClose();
          onToggleTheme();
        },
      });
    }

    list.push({
      id: 'act_today',
      category: 'Navigasyon',
      title: "Bugünün Seanslarına Git",
      subtitle: getTodayDateString(),
      icon: <Calendar className="w-4 h-4 text-indigo-400" />,
      action: () => {
        onClose();
        onSelectDate(getTodayDateString());
      },
    });

    if (!StorageService.isDemo()) {
      list.push({
        id: 'act_export_json',
        category: 'İşlemler',
        title: 'JSON Yedeği İndir',
        subtitle: 'Tüm veri tabanını dışa aktar',
        icon: <Download className="w-4 h-4 text-slate-400" />,
        action: () => {
          onClose();
          onExportJson();
        },
      });

      list.push({
        id: 'act_export_csv',
        category: 'İşlemler',
        title: 'Excel (CSV) Öğrenci Listesi İndir',
        subtitle: 'Öğrenci tablosunu Excel uyumlu CSV olarak kaydet',
        icon: <Download className="w-4 h-4 text-slate-400" />,
        action: () => {
          onClose();
          onExportCsv();
        },
      });
    }

    // Student items
    students.forEach((st) => {
      list.push({
        id: `std_${st.id}`,
        category: 'Öğrenciler',
        title: st.full_name,
        subtitle: `${st.class_grade} • ${st.phone} ${st.target_goal ? `• ${st.target_goal}` : ''}`,
        icon: <Users className="w-4 h-4 text-indigo-400" />,
        action: () => {
          onClose();
          onSelectStudent(st);
        },
      });
    });

    // Filter by query
    if (!query.trim()) return list;

    const q = query.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [
    query,
    students,
    onClose,
    onOpenBroadcast,
    onFillStandardSlots,
    onOpenSmartPaste,
    onAddStudent,
    onSelectDate,
    onExportJson,
    onExportCsv,
    onSelectStudent,
  ]);

  // Keyboard navigation inside command palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (items.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (items.length || 1)) % (items.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Komut Paleti"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1F1F1F] border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg max-w-xl w-full overflow-hidden text-stone-800 dark:text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <Search className="w-4 h-4 text-stone-400 mr-2.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Bir komut yazın veya öğrenci arayın..."
            className="w-full bg-transparent text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-hidden"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] font-mono text-stone-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 divide-y divide-stone-100 dark:divide-stone-800/60">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400 dark:text-stone-500">
              Sonuç bulunamadı.
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-stone-400'}>{item.icon}</div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.subtitle && (
                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-stone-600 dark:text-stone-400' : 'text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-stone-200 border-stone-300 text-stone-800 dark:bg-stone-700 dark:border-stone-600 dark:text-stone-200'
                          : 'bg-stone-50 border-stone-200 text-stone-500 dark:bg-stone-800/80 dark:border-stone-700 dark:text-stone-400'
                      }`}
                    >
                      {item.category}
                    </span>
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-stone-500" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 text-[11px] text-stone-500 flex items-center justify-between">
          <span>Seçmek için &uarr; &darr; tuşlarını, çalıştırmak için Enter'ı kullanın</span>
          <span className="font-mono">{items.length} kayıt</span>
        </div>
      </div>
    </div>
  );
}
