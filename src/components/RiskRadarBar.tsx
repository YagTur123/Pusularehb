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
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Risk Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Risk Radarı:</span>
          </span>

          {/* Badge 1: 20+ Gündür Görüşülmeyenler */}
          <button
            onClick={() => handleFilterClick('uncontacted_20d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-all ${
              activeRiskFilter === 'uncontacted_20d'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-950/50'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="20 günden uzun süredir görüşülmeyen öğrencileri filtrele"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>20+ Gündür Görüşülmeyenler</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {uncontactedStudents.length}
            </span>
          </button>

          {/* Badge 2: Randevu Kaçıranlar (Bu Hafta Gelmedi) */}
          <button
            onClick={() => handleFilterClick('missed_this_week')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-all ${
              activeRiskFilter === 'missed_this_week'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm shadow-rose-950/50'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Son 7 günde randevusuna gelmeyen öğrencileri filtrele"
          >
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>Randevu Kaçıranlar</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {missedStudentIds.size}
            </span>
          </button>

          {/* Active Filter Clear Button */}
          {activeRiskFilter !== 'none' && (
            <button
              onClick={() => onSelectRiskFilter('none')}
              className="flex items-center gap-1 px-2 py-0.8 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <span>Filtreyi Kaldır</span>
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        {/* Right: Günün Seansları Analytics */}
        <div className="flex items-center gap-3 ml-auto text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800/80">
            <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300 font-medium">Günün Seansları:</span>
            <span className="font-mono font-semibold text-white">{totalToday}</span>
            <div className="h-3 w-px bg-slate-800 mx-1" />
            <span className="flex items-center gap-1 text-emerald-400" title="Tamamlanan Seanslar">
              <CheckCircle2 className="w-3 h-3" />
              <span className="font-mono font-medium">{completedToday}</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400" title="Bekleyen Seanslar">
              <Clock className="w-3 h-3" />
              <span className="font-mono font-medium">{pendingToday}</span>
            </span>
            {missedToday > 0 && (
              <span className="flex items-center gap-1 text-rose-400" title="Kaçırılan Seanslar">
                <UserX className="w-3 h-3" />
                <span className="font-mono font-medium">{missedToday}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
