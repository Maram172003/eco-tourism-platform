"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Check, Plus } from "lucide-react";
import {
  FR_DAYS, SLOT_COLORS, SLOT_TYPE_LABELS,
  type AvailabilitySlot, type TimeSlots,
} from "@/lib/availabilityConflicts";
import TimeSlotEditor from "./TimeSlotEditor";

interface Props {
  slot: AvailabilitySlot;
  existingSlots: AvailabilitySlot[];
  onSave: (id: string, updated: Omit<AvailabilitySlot, "id">) => Promise<void>;
  onClose: () => void;
}

export default function EditSlotModal({ slot, existingSlots, onSave, onClose }: Props) {
  const c = SLOT_COLORS[slot.type];
  const today = format(new Date(), "yyyy-MM-dd");
  const others = existingSlots.filter((s) => s.id !== slot.id); // don't compare the slot against itself

  const [label,      setLabel]      = useState(slot.label ?? "");
  const [dates,      setDates]      = useState<string[]>(slot.dates ?? []);
  const [newDate,    setNewDate]    = useState("");
  const [startDate,  setStartDate]  = useState(slot.start_date ?? "");
  const [endDate,    setEndDate]    = useState(slot.end_date ?? "");
  const [days,       setDays]       = useState<string[]>(slot.days_of_week ?? []);
  const [timeSlots,  setTimeSlots]  = useState<TimeSlots>(slot.time_slots ?? {});
  const [error,      setError]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [horairesOpen, setHorairesOpen] = useState(false);

  function toggleDay(d: string) {
    setDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);
  }

  function addDate() {
    if (!newDate || dates.includes(newDate)) return;
    setDates((p) => [...p, newDate].sort());
    setNewDate("");
  }

  function buildDto(): Omit<AvailabilitySlot, "id"> | null {
    if (slot.type === "specific") {
      if (!dates.length) { setError("Ajoute au moins une date."); return null; }
      return { type: "specific", dates, label: label.trim() || null };
    }
    if (slot.type === "range") {
      if (!startDate || !endDate) { setError("Renseigne une date de début et de fin."); return null; }
      return {
        type: "range", start_date: startDate, end_date: endDate,
        days_of_week: days.length && days.length < 7 ? days : null,
        label: label.trim() || null,
      };
    }
    // recurring
    if (!days.length) { setError("Choisis au moins un jour de semaine."); return null; }
    return {
      type: "recurring", days_of_week: days,
      start_date: startDate || null, end_date: endDate || null,
      label: label.trim() || null,
    };
  }

  // Determine keys for TimeSlotEditor:
  // - specific → date strings
  // - range/recurring with date-keyed time_slots → preserve those date strings
  // - range/recurring with weekday-keyed time_slots → use weekday indices
  // - range/recurring with no time_slots yet → use selected weekdays (or all 7 for range)
  const hoursKeys = (() => {
    if (slot.type === "specific") return dates;
    const existingKeys = Object.keys(timeSlots);
    if (existingKeys.length > 0 && existingKeys.some((k) => k.includes("-"))) {
      return existingKeys.sort(); // date-keyed → preserve as-is
    }
    if (days.length > 0) return days; // weekday-keyed
    if (slot.type === "range" && startDate && endDate) return ["0","1","2","3","4","5","6"]; // all weekdays
    return [];
  })();

  // For TimeSlotEditor mode: if keys are dates → treat as "specific" layout
  const editorMode = hoursKeys.some((k) => k.includes("-")) ? "specific" : slot.type;

  async function handleSave() {
    setError("");
    const dto = buildDto();
    if (!dto) return;
    const withTime = { ...dto, time_slots: Object.keys(timeSlots).length ? timeSlots : null };

    setSaving(true);
    try {
      await onSave(slot.id, withTime);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={horairesOpen
      ? "fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm p-4"
      : "fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"}
      onClick={onClose}>
      <div
        className={horairesOpen
          ? "absolute top-1/2 -translate-y-1/2 max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
          : "bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"}
        style={horairesOpen ? { right: "calc(50% + 0.5rem)", width: "calc(50vw - 2rem)" } : undefined}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${c.bg}`}>
            <span className={`material-symbols-outlined text-2xl ${c.text}`}>
              {slot.type === "specific" ? "event" : slot.type === "recurring" ? "autorenew" : "date_range"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold text-slate-800">Modifier le créneau</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{SLOT_TYPE_LABELS[slot.type]}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          <input type="text" placeholder="Nom du créneau (optionnel)"
            value={label} onChange={(e) => setLabel(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white" />

          {slot.type === "specific" && (
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dates</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dates.map((d) => (
                  <span key={d} className={`inline-flex items-center gap-1 ${c.bg} ${c.text} text-xs font-bold px-2.5 py-1 rounded-full`}>
                    {format(parseISO(d), "dd MMM yyyy", { locale: fr })}
                    <button type="button" onClick={() => setDates((p) => p.filter((x) => x !== d))} className="hover:text-red-600">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <button type="button" onClick={addDate}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-extrabold hover:bg-emerald-100 transition-colors">
                  <Plus size={13} />Ajouter
                </button>
              </div>
            </div>
          )}

          {(slot.type === "range" || slot.type === "recurring") && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    {slot.type === "range" ? "Début" : "À partir du"}
                  </label>
                  <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    {slot.type === "range" ? "Fin" : "Jusqu'au"}
                  </label>
                  <input type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                  {slot.type === "range" ? "Jours inclus dans la plage" : "Jours de la semaine"}
                </label>
                <div className="flex gap-1">
                  {FR_DAYS.map((d, i) => {
                    const k = String(i); const a = days.includes(k);
                    return (
                      <button key={i} type="button" onClick={() => toggleDay(k)}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-extrabold border-2 transition-all ${a ? `${c.bg} ${c.text} border-current` : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {hoursKeys.length > 0 && (
            <TimeSlotEditor
              mode={editorMode}
              keys={hoursKeys}
              value={timeSlots}
              existingSlots={others}
              onChange={setTimeSlots}
              nested
              onOpenChange={setHorairesOpen}
            />
          )}

          {error && (
            <p className="text-xs font-bold text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-7 pb-7 pt-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3.5 border-2 border-slate-200 rounded-2xl text-sm font-extrabold text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-2 flex-grow-[2] py-3.5 bg-primary hover:bg-primary/90 text-slate-900 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] disabled:opacity-60">
            {saving
              ? <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
              : <Check size={16} />}
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
}
