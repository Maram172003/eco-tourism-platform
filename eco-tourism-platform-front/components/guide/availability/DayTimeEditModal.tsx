"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { X, Check, Clock, Plus } from "lucide-react";
import {
  dateStr, windowsForDay, SLOT_COLORS, displayType,
  type AvailabilitySlot, type TimeWindow,
} from "@/lib/availabilityConflicts";

interface Props {
  slot: AvailabilitySlot;
  day: Date;
  onSave: (id: string, updated: Omit<AvailabilitySlot, "id">) => Promise<void>;
  onClose: () => void;
}

export default function DayTimeEditModal({ slot, day, onSave, onClose }: Props) {
  const ds = dateStr(day);
  const c  = SLOT_COLORS[displayType(slot)];

  const [windows, setWindows] = useState<TimeWindow[]>(
    () => windowsForDay(slot, day) ?? [{ start: "09:00", end: "17:00" }]
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  function update(i: number, field: keyof TimeWindow, v: string) {
    setWindows((p) => p.map((w, j) => j === i ? { ...w, [field]: v } : w));
  }

  function add() {
    const last = windows[windows.length - 1];
    const h = last ? Math.min(parseInt(last.end.split(":")[0]) + 1, 22) : 14;
    setWindows((p) => [...p, {
      start: `${String(h).padStart(2, "0")}:00`,
      end:   `${String(Math.min(h + 2, 23)).padStart(2, "0")}:00`,
    }]);
  }

  function remove(i: number) {
    if (windows.length <= 1) return;
    setWindows((p) => p.filter((_, j) => j !== i));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const newTimeSlots = { ...(slot.time_slots ?? {}), [ds]: windows };
      await onSave(slot.id, {
        type:         slot.type,
        dates:        slot.dates        ?? undefined,
        start_date:   slot.start_date   ?? undefined,
        end_date:     slot.end_date     ?? undefined,
        days_of_week: slot.days_of_week ?? undefined,
        label:        slot.label        ?? undefined,
        time_slots:   newTimeSlots,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-4 px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={22} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-slate-800 capitalize">
              {format(day, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            {slot.label && (
              <p className={`text-xs font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block ${c.bg} ${c.text}`}>
                {slot.label}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Windows */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          {windows.map((w, i) => (
            <div key={i} className="space-y-2">
              <div className={`grid items-center gap-3 ${windows.length > 1 ? "grid-cols-[1fr_28px_1fr_36px]" : "grid-cols-[1fr_28px_1fr]"}`}>
                <input type="time" value={w.start}
                  onChange={(e) => update(i, "start", e.target.value)}
                  className="w-full px-4 py-3.5 text-xl font-bold text-emerald-800 bg-emerald-50 border-2 border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400" />
                <span className="text-center text-slate-300 text-xl font-light">→</span>
                <input type="time" value={w.end}
                  onChange={(e) => update(i, "end", e.target.value)}
                  className="w-full px-4 py-3.5 text-xl font-bold text-emerald-800 bg-emerald-50 border-2 border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400" />
                {windows.length > 1 && (
                  <button type="button" onClick={() => remove(i)}
                    className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <input type="text" placeholder="Nom de cette plage (ex : Randonnée du matin)"
                value={w.label ?? ""} onChange={(e) => update(i, "label", e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white placeholder:text-slate-400" />
            </div>
          ))}

          <button type="button" onClick={add}
            className="flex items-center gap-2 text-sm font-bold text-emerald-500 hover:text-emerald-700 transition-colors">
            <Plus size={15} className="bg-emerald-100 rounded-lg p-0.5" />
            Ajouter une plage horaire
          </button>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-7 pb-7 pt-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3.5 border-2 border-slate-200 rounded-2xl text-sm font-extrabold text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-sm">
            {saving
              ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <Check size={16} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
