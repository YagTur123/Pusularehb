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
    <div className="bg-[#090a0f] border-b border-white/[0.06] px-4 sm:px-6 py-1.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Triage Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 20+ Gündür Görüşülmeyenler */}
          <button
            onClick={() => handleFilterClick('uncontacted_20d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              activeRiskFilter === 'uncontacted_20d'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                : 'bg-zinc-900/90 hover:bg-zinc-850 border-white/[0.06] text-zinc-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>20+ Gün İletişimsiz</span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[11px] bg-amber-400/15 text-amber-300 font-semibold">
              {uncontactedStudents.length}
            </span>
          </button>

          {/* Son 7 günde gelmeyen */}
          {missedStudentIds.size > 0 && (
            <button
              onClick={() => handleFilterClick('missed_this_week')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors border cursor-pointer ${
                activeRiskFilter === 'missed_this_week'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  : 'bg-zinc-900/90 hover:bg-zinc-850 border-white/[0.06] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>Gelmeyen</span>
              <span className="font-mono text-rose-400 font-semibold">{missedStudentIds.size}</span>
            </button>
          )}

          {/* Active Filter Clear Button */}
          {activeRiskFilter !== 'none' && (
            <button
              onClick={() => onSelectRiskFilter('none')}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
            >
              <span>Temizle</span>
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          )}
        </div>

        {/* Right: Günün Seansları Analytics */}
        <div className="flex items-center gap-2 ml-auto text-zinc-400">
          <div className="flex items-center gap-2 bg-[#0c0d12] px-2.5 py-1 rounded-md border border-white/[0.06] text-[11px]">
            <CalendarCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-300 font-medium">Bugün:</span>
            <span className="font-mono text-white font-medium">{totalToday} seans</span>
            <div className="h-2.5 w-px bg-white/[0.1] mx-0.5" />
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-mono">{completedToday}</span>
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{pendingToday}</span>
            </span>
            {missedToday > 0 && (
              <span className="flex items-center gap-1 text-rose-400">
                <UserX className="w-3 h-3" />
                <span className="font-mono">{missedToday}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
