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
    <div className="bg-white dark:bg-[#1F1F1F] border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Triage Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 20+ Gündür Görüşülmeyenler */}
          <button
            onClick={() => handleFilterClick('uncontacted_20d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              activeRiskFilter === 'uncontacted_20d'
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>20+ Gün İletişimsiz</span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[11px] bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 font-semibold">
              {uncontactedStudents.length}
            </span>
          </button>

          {/* Son 7 günde gelmeyen */}
          {missedStudentIds.size > 0 && (
            <button
              onClick={() => handleFilterClick('missed_this_week')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors border cursor-pointer ${
                activeRiskFilter === 'missed_this_week'
                  ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-medium'
                  : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/80 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>Gelmeyen</span>
              <span className="font-mono text-rose-700 dark:text-rose-400 font-semibold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/40">{missedStudentIds.size}</span>
            </button>
          )}

          {/* Active Filter Clear Button */}
          {activeRiskFilter !== 'none' && (
            <button
              onClick={() => onSelectRiskFilter('none')}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-stone-200 hover:bg-stone-300 text-stone-800 border border-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 dark:border-stone-700 transition-colors cursor-pointer"
            >
              <span>Filtreyi Temizle</span>
              <X className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
            </button>
          )}
        </div>

        {/* Right: Günün Seansları Analytics */}
        <div className="flex items-center gap-2 ml-auto text-stone-700 dark:text-stone-400">
          <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-800/80 px-2.5 py-1 rounded-md border border-stone-200 dark:border-stone-700 text-xs">
            <CalendarCheck className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-stone-700 dark:text-stone-300 font-medium">Bugün:</span>
            <span className="font-mono text-stone-900 dark:text-stone-100 font-medium">{totalToday} seans</span>
            <div className="h-3 w-px bg-stone-200 dark:bg-stone-700 mx-0.5" />
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400" title="Gelen">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono font-medium">{completedToday}</span>
            </span>
            <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400" title="Bekleyen">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-mono font-medium">{pendingToday}</span>
            </span>
            {missedToday > 0 && (
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400" title="Gelmeyen">
                <UserX className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-mono font-medium">{missedToday}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
