"use client";

import { ChevronLeft, ChevronRight, Zap, Copy } from "lucide-react";
import { FR_MONTHS } from "@/lib/availabilityConflicts";
import { format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

export type ViewMode = "month" | "week" | "agenda";

interface Props {
  currentDate: Date;
  activeView: ViewMode;
  stats: { total: number; covered: number; percentage: number };
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (v: ViewMode) => void;
  onQuickFill: () => void;
  onCopyMonth: () => void;
}

export default function CalendarHeader({
  currentDate, activeView, stats,
  onPrev, onNext, onToday, onViewChange,
  onQuickFill, onCopyMonth,
}: Props) {
  const barColor =
    stats.percentage >= 60 ? "bg-emerald-500" :
    stats.percentage >= 30 ? "bg-amber-400"   : "bg-red-400";
  const labelColor =
    stats.percentage >= 60 ? "text-emerald-700 bg-emerald-50" :
    stats.percentage >= 30 ? "text-amber-700 bg-amber-50"     : "text-red-700 bg-red-50";

  const title = activeView === "month"
    ? `${FR_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : `Sem. du ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd MMM", { locale: fr })}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-4 space-y-3">
      {/* Row 1 : navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPrev}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ChevronLeft size={16} className="text-slate-500" />
          </button>
          <span className="text-sm font-extrabold text-slate-800 w-48 text-center">{title}</span>
          <button type="button" onClick={onNext}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
            <ChevronRight size={16} className="text-slate-500" />
          </button>
        </div>

        <button type="button" onClick={onToday}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:border-primary/40 hover:text-primary transition-all">
          Aujourd&apos;hui
        </button>

        {/* Row 2 : vue tabs */}
        <div className="flex gap-0.5 bg-slate-100 p-1 rounded-xl">
          {(["month","week","agenda"] as ViewMode[]).map((v) => (
            <button key={v} type="button" onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${activeView === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Agenda"}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3 : barre de stats */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${stats.percentage}%` }} />
        </div>
        <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full whitespace-nowrap ${labelColor}`}>
          {stats.covered}/{stats.total} j · {stats.percentage}%
        </span>
      </div>

      {/* Row 4 : raccourcis */}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={onQuickFill}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-amber-300 hover:text-amber-600 transition-all bg-white">
          <Zap size={13} className="text-amber-500" />Remplissage rapide
        </button>
        <button type="button" onClick={onCopyMonth}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all bg-white">
          <Copy size={13} />Copier ce mois
        </button>
      </div>
    </div>
  );
}
