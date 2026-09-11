import { AlertCircle, Clock, CheckCircle2, UserX, CalendarCheck, X } from 'lucide-react';
import { Student, Session } from '../types';

export type RiskFilter = 'none' | 'uncontacted_20d' | 'missed_this_week';

interface RiskRadarBarProps {
  students: Student[];
  sessions: Session[];
  selectedDate: string;
  activeRiskFilter: RiskFilter;
  onSelectRiskFilter: (filter: RiskFilter) => void;
  onGoToStudentsTab: () => void;
}

export function RiskRadarBar({
  students,
  sessions,
  selectedDate,
  activeRiskFilter,
  onSelectRiskFilter,
  onGoToStudentsTab,
}: RiskRadarBarProps) {
  // 1. Calculate 20+ days not contacted
  const now = new Date();
  const twentyDaysAgo = new Date(now.getTime() - 20 * 86400000);

  const uncontactedStudents = students.filter((s) => {
    if (!s.last_meeting_date) return true;
    const lastDate = new Date(s.last_meeting_date);
    return lastDate < twentyDaysAgo;
  });

  // 2. Students marked "Gelmedi" this week (or recent 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const missedRecentSessions = sessions.filter((sess) => {
    if (sess.status !== 'Gelmedi') return false;
    const sessDate = new Date(sess.date);
    return sessDate >= sevenDaysAgo;
  });

  // Unique student IDs who missed
  const missedStudentIds = new Set(
    missedRecentSessions.map((s) => s.student_id).filter(Boolean)
  );

  // 3. Today's sessions stats
  const todaySessions = sessions.filter((s) => s.date === selectedDate);
  const totalToday = todaySessions.length;
  const completedToday = todaySessions.filter((s) => s.status === 'Geldi').length;
  const pendingToday = todaySessions.filter((s) => s.status === 'Bekliyor').length;
  const missedToday = todaySessions.filter((s) => s.status === 'Gelmedi').length;

  const handleFilterClick = (filter: RiskFilter) => {
    if (activeRiskFilter === filter) {
      onSelectRiskFilter('none');
    } else {
      onSelectRiskFilter(filter);
      onGoToStudentsTab();
    }
  };

  return (
    <div className="bg-white dark:bg-[#141620] border-b border-slate-200 dark:border-white/[0.08] px-4 sm:px-6 py-2 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Triage Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 20+ Gündür Görüşülmeyenler */}
          <button
            onClick={() => handleFilterClick('uncontacted_20d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              activeRiskFilter === 'uncontacted_20d'
                ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500/50 text-amber-950 dark:text-amber-200 font-semibold shadow-xs'
                : 'bg-white hover:bg-slate-100 dark:bg-[#1a1d28] dark:hover:bg-[#202433] border-slate-300 dark:border-white/[0.08] text-slate-900 dark:text-zinc-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-zinc-200">20+ Gün İletişimsiz</span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[11px] bg-amber-200/70 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 font-bold border border-amber-300/60 dark:border-transparent">
              {uncontactedStudents.length}
            </span>
          </button>

          {/* Son 7 günde gelmeyen */}
          {missedStudentIds.size > 0 && (
            <button
              onClick={() => handleFilterClick('missed_this_week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors border cursor-pointer ${
                activeRiskFilter === 'missed_this_week'
                  ? 'bg-rose-100 dark:bg-rose-950/50 border-rose-400 dark:border-rose-500/50 text-rose-950 dark:text-rose-200 font-semibold shadow-xs'
                  : 'bg-white hover:bg-slate-100 dark:bg-[#1a1d28] dark:hover:bg-[#202433] border-slate-300 dark:border-white/[0.08] text-slate-900 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-zinc-200">Gelmeyen</span>
              <span className="font-mono text-rose-800 dark:text-rose-400 font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/40 border border-rose-300/50 dark:border-transparent">{missedStudentIds.size}</span>
            </button>
          )}

          {/* Active Filter Clear Button */}
          {activeRiskFilter !== 'none' && (
            <button
              onClick={() => onSelectRiskFilter('none')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer shadow-xs"
            >
              <span>Filtreyi Temizle</span>
              <X className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
            </button>
          )}
        </div>

        {/* Right: Günün Seansları Analytics */}
        <div className="flex items-center gap-2 ml-auto text-slate-700 dark:text-zinc-400">
          <div className="flex items-center gap-2 bg-white dark:bg-[#181b26] px-3 py-1.5 rounded-md border border-slate-200 dark:border-white/[0.08] text-xs shadow-2xs">
            <CalendarCheck className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
            <span className="text-slate-800 dark:text-zinc-300 font-medium">Bugün:</span>
            <span className="font-mono text-slate-950 dark:text-zinc-100 font-bold">{totalToday} seans</span>
            <div className="h-3 w-px bg-slate-300 dark:bg-white/[0.1] mx-0.5" />
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold" title="Gelen">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono">{completedToday}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-700 dark:text-zinc-300 font-semibold" title="Bekleyen">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-mono">{pendingToday}</span>
            </span>
            {missedToday > 0 && (
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold" title="Gelmeyen">
                <UserX className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-mono">{missedToday}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
