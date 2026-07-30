"use client";

import { format, startOfWeek, eachDayOfInterval, isPast, startOfDay, isToday, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus } from "lucide-react";
import {
  toFrIdx, dateStr, SLOT_COLORS, displayType,
  type AvailabilitySlot,
} from "@/lib/availabilityConflicts";

interface Props {
  currentDate: Date;
  slots: AvailabilitySlot[];
  onDayClick: (day: Date) => void;
}

const ICONS: Record<string, string> = {
  specific: "event", range: "date_range", recurring: "autorenew", season: "sunny",
};

export default function CalendarWeekView({ currentDate, slots, onDayClick }: Props) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays  = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  function getDaySlots(day: Date): AvailabilitySlot[] {
    const ds   = dateStr(startOfDay(day));
    const wday = toFrIdx(day);
    return slots.filter((s) => {
      if (s.type === "specific")                  return s.dates?.includes(ds);
      if (s.type === "range" && s.start_date && s.end_date) {
        if (ds < s.start_date || ds > s.end_date) return false;
        return !s.days_of_week?.length || s.days_of_week.includes(wday);
      }
      if (s.type === "recurring" && s.days_of_week?.includes(wday)) {
        if (s.start_date && ds < s.start_date) return false;
        if (s.end_date   && ds > s.end_date)   return false;
        return true;
      }
      return false;
    });
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[200px]">
        {weekDays.map((day) => {
          const daySlots = getDaySlots(day);
          const past     = isPast(startOfDay(day)) && !isToday(day);
          const today    = isToday(day);

          return (
            <div key={day.toISOString()}
              className={`flex flex-col p-2 gap-1.5 transition-colors ${past ? "opacity-40" : "cursor-pointer hover:bg-slate-50/50"} ${today ? "bg-primary/5" : ""}`}
              onClick={() => !past && onDayClick(day)}>

              {/* Header */}
              <div className={`w-8 h-8 rounded-xl flex flex-col items-center justify-center mx-auto ${today ? "bg-primary text-slate-900" : "text-slate-500"}`}>
                <span className="text-[9px] font-extrabold uppercase leading-none">
                  {format(day, "EEE", { locale: fr }).slice(0, 2)}
                </span>
                <span className="text-xs font-black leading-none">{format(day, "d")}</span>
              </div>

              {/* Slots */}
              {daySlots.map((s, i) => {
                const c = SLOT_COLORS[displayType(s)];
                const label = s.label ?? (s.type === "specific" ? "Date" : s.type === "range" ? "Plage" : "Récurrent");
                return (
                  <div key={i} className={`rounded-lg px-1.5 py-1 text-[10px] font-bold ${c.bg} ${c.text} border ${c.border} truncate`}>
                    <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">
                      {ICONS[displayType(s)]}
                    </span>
                    {label}
                  </div>
                );
              })}

              {daySlots.length === 0 && !past && (
                <div className="flex-1 flex items-center justify-center text-slate-200">
                  <Plus size={16} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
