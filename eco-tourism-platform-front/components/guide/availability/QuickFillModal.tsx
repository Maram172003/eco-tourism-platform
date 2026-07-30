"use client";

import { useState } from "react";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, addMonths,
  startOfDay, isBefore, format, isToday, parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { X, Zap, AlertTriangle } from "lucide-react";
import {
  FR_DAYS, getDayConstraints, isDateSelectable, isTimeRangeAvailable,
  type AvailabilitySlot, type TimeSlots,
} from "@/lib/availabilityConflicts";
import TimeSlotEditor from "./TimeSlotEditor";

type Option = "this_month" | "next_month" | "next_week" | "next_7";

const OPTIONS: { k: Option; label: string; desc: string; icon: string }[] = [
  { k: "this_month", label: "Ce mois-ci",      desc: "D'aujourd'hui à la fin du mois courant",    icon: "today" },
  { k: "next_month", label: "Mois prochain",    desc: "Tout le mois suivant",                      icon: "event" },
  { k: "next_week",  label: "7 prochains jours",desc: "D'aujourd'hui + 7 jours",                   icon: "calendar_view_week" },
  { k: "next_7",     label: "Prochains 30 j",   desc: "D'aujourd'hui jusqu'à 30 jours",            icon: "date_range" },
];

interface Props {
  currentDate: Date;
  existingSlots: AvailabilitySlot[];
  onSave: (slot: Omit<AvailabilitySlot, "id">) => Promise<void>;
  onClose: () => void;
}

export default function QuickFillModal({ currentDate, existingSlots, onSave, onClose }: Props) {
  const [option,       setOption]       = useState<Option>("this_month");
  const [selectedDays, setSelectedDays] = useState<string[]>(["0","1","2","3","4","5","6"]);
  const [label,        setLabel]        = useState("");
  const [timeSlots,    setTimeSlots]    = useState<TimeSlots>({});
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");
  const [horairesOpen, setHorairesOpen] = useState(false);

  const today = startOfDay(new Date());

  function getRange(): { start: Date | null; end: Date | null } {
    const now = new Date();
    if (option === "this_month") {
      const s = startOfDay(now); const e = endOfMonth(now);
      return isBefore(e, today) ? { start: null, end: null } : { start: s, end: e };
    }
    if (option === "next_month") {
      const nm = addMonths(now, 1);
      return { start: startOfMonth(nm), end: endOfMonth(nm) };
    }
    if (option === "next_week") {
      const s = today; const e = new Date(today); e.setDate(e.getDate() + 6);
      return { start: s, end: e };
    }
    // next_7 → 30 days
    const s = today; const e = new Date(today); e.setDate(e.getDate() + 29);
    return { start: s, end: e };
  }

  /** Candidate days: weekday-matched, future, not fully blocked by another slot (excludes only what can never work) */
  function candidateDates(): string[] {
    const { start, end } = getRange();
    if (!start || !end) return [];
    return eachDayOfInterval({ start, end })
      .filter((d) => {
        if (isBefore(d, today) && !isToday(d)) return false;
        const wday = String((d.getDay() + 6) % 7);
        if (!selectedDays.includes(wday)) return false;
        return isDateSelectable(d, existingSlots); // drop fully-blocked days
      })
      .map((d) => format(d, "yyyy-MM-dd"));
  }

  /** Of the candidates, which ones the current request (with or without hours) can actually use */
  function usableDates(): string[] {
    return candidateDates().filter((ds) => {
      const d = parseISO(ds);
      const windows = timeSlots[ds];
      if (!windows || !windows.length) {
        // No hours chosen for this day → treated as "journée entière", needs the day fully free
        return getDayConstraints(d, existingSlots).blockedWindows.length === 0;
      }
      return windows.every((w) => isTimeRangeAvailable(d, w.start, w.end, existingSlots));
    });
  }

  const candidates = candidateDates();
  const usable = usableDates();
  const skipped = candidates.length - usable.length;

  async function handleSave() {
    setError("");
    if (!usable.length) { setError("Aucun jour disponible dans cette sélection."); return; }
    setSaving(true);
    try {
      await onSave({
        type: "specific",
        dates: usable,
        label: label.trim() || `Remplissage rapide — ${OPTIONS.find((o) => o.k === option)?.label}`,
        time_slots: Object.keys(timeSlots).length ? timeSlots : null,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={horairesOpen
      ? "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4"
      : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"}
      onClick={onClose}>
      <div
        className={horairesOpen
          ? "absolute top-1/2 -translate-y-1/2 max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          : "bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"}
        style={horairesOpen ? { right: "calc(50% + 0.5rem)", width: "calc(50vw - 2rem)" } : undefined}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Zap size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-800">Remplissage rapide</p>
              <p className="text-xs text-slate-400 font-medium">Bloquez plusieurs jours en un clic</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Période */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Période</p>
            <div className="grid grid-cols-2 gap-2">
              {OPTIONS.map(({ k, label: lb, desc, icon }) => (
                <button key={k} type="button" onClick={() => setOption(k)}
                  className={`flex items-start gap-2 p-3 rounded-2xl border-2 text-left transition-all ${option === k ? "border-amber-400 bg-amber-50" : "border-slate-100 hover:border-amber-200 bg-slate-50"}`}>
                  <span className={`material-symbols-outlined text-lg mt-0.5 ${option === k ? "text-amber-500" : "text-slate-400"}`}>{icon}</span>
                  <div>
                    <p className={`text-xs font-extrabold ${option === k ? "text-amber-700" : "text-slate-600"}`}>{lb}</p>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Jours inclus */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jours inclus</p>
            <div className="flex gap-1">
              {FR_DAYS.map((d, i) => {
                const k = String(i); const a = selectedDays.includes(k);
                return (
                  <button key={i} type="button"
                    onClick={() => setSelectedDays((p) => a ? p.filter((x) => x !== k) : [...p, k])}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold border-2 transition-all ${a ? "bg-amber-400 border-amber-400 text-slate-900" : "border-slate-200 text-slate-400 hover:border-amber-200"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Label */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Label (optionnel)</p>
            <input type="text" placeholder="Vacances d'été, Haute saison…"
              value={label} onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white placeholder:text-slate-400" />
          </div>

          {/* Horaires */}
          {candidates.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Horaires (optionnel)</p>
              <TimeSlotEditor
                mode="specific"
                keys={candidates}
                value={timeSlots}
                existingSlots={existingSlots}
                onChange={setTimeSlots}
                nested
                onOpenChange={setHorairesOpen}
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                Laisse vide pour marquer ces jours disponibles toute la journée.
              </p>
            </div>
          )}

          {/* Preview */}
          <div className={`rounded-2xl p-3 border ${usable.length > 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
            <p className={`text-xs font-extrabold ${usable.length > 0 ? "text-emerald-700" : "text-red-600"}`}>
              {usable.length} jour{usable.length !== 1 ? "s" : ""} entièrement disponible{usable.length !== 1 ? "s" : ""}
            </p>
            {skipped > 0 && (
              <p className="text-[11px] text-amber-600 font-semibold mt-1">
                {skipped} jour{skipped > 1 ? "s" : ""} pas entièrement disponible{skipped > 1 ? "s" : ""}
                {!Object.keys(timeSlots).length && " — ajoute un horaire ci-dessus pour les inclure sur leur créneau encore libre"}
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 shrink-0">
          <button type="button" onClick={handleSave} disabled={saving || usable.length === 0}
            className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-sm active:scale-[0.98]">
            {saving
              ? <><div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />Enregistrement…</>
              : <><Zap size={16} />Remplir {usable.length} jours</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
