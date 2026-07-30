"use client";

import { useState, useMemo } from "react";
import {
  addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, startOfDay, isBefore,
  getDaysInMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { X, Copy, AlertTriangle, Check } from "lucide-react";
import { dateStr, FR_MONTHS, type AvailabilitySlot } from "@/lib/availabilityConflicts";

interface Props {
  currentDate: Date;          // source month
  slots: AvailabilitySlot[];  // current slots (to derive pattern from source month)
  onSave: (slot: Omit<AvailabilitySlot, "id">) => Promise<void>;
  onClose: () => void;
}

export default function CopyMonthModal({ currentDate, slots, onSave, onClose }: Props) {
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]); // "YYYY-MM"
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState("");
  const [done,   setDone]     = useState(false);

  const today = startOfDay(new Date());

  // Source month: days covered by any slot
  const sourceDates = useMemo(() => {
    const mS = startOfMonth(currentDate);
    const mE = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: mS, end: mE });
    return days
      .filter((d) => {
        const ds   = dateStr(d);
        const wday = String((d.getDay() + 6) % 7);
        return slots.some((s) => {
          if (s.type === "specific") return s.dates?.includes(ds);
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
      })
      .map((d) => ({ day: d.getDate(), wday: (d.getDay() + 6) % 7 }));
  }, [currentDate, slots]);

  // Next 12 months (starting from next month)
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => addMonths(new Date(), i + 1));
  }, []);

  function toggle(key: string) {
    setSelectedMonths((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);
  }

  function previewForMonth(m: Date): number {
    const daysInM = getDaysInMonth(m);
    return sourceDates.filter(({ day }) => {
      if (day > daysInM) return false;
      const d = new Date(m.getFullYear(), m.getMonth(), day);
      return !isBefore(startOfDay(d), today);
    }).length;
  }

  async function handleSave() {
    setError("");
    if (!selectedMonths.length) { setError("Sélectionnez au moins un mois."); return; }
    if (!sourceDates.length)    { setError("Le mois source n'a aucun créneau à copier."); return; }

    setSaving(true);
    try {
      for (const mk of selectedMonths) {
        const [y, mo] = mk.split("-").map(Number);
        const m = new Date(y, mo - 1, 1);
        const daysInM = getDaysInMonth(m);
        const datesToCopy: string[] = [];
        for (const { day } of sourceDates) {
          if (day > daysInM) continue;
          const d = new Date(y, mo - 1, day);
          if (isBefore(startOfDay(d), today)) continue;
          datesToCopy.push(format(d, "yyyy-MM-dd"));
        }
        if (!datesToCopy.length) continue;
        await onSave({
          type: "specific",
          dates: datesToCopy,
          label: `Copie de ${FR_MONTHS[currentDate.getMonth()]}`,
        });
      }
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la copie.");
    } finally {
      setSaving(false);
    }
  }

  const sourceName = `${FR_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Copy size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-800">Copier ce mois</p>
              <p className="text-xs text-slate-400 font-medium">
                Source : <span className="text-blue-600 font-bold">{sourceName}</span>
                {sourceDates.length > 0 && <> · <span className="text-slate-500">{sourceDates.length} jours couverts</span></>}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {sourceDates.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <span className="material-symbols-outlined text-slate-200 text-5xl block mb-2">event_busy</span>
            <p className="text-sm font-bold text-slate-400">Aucun créneau dans {sourceName}</p>
            <p className="text-xs text-slate-300 mt-1">Créez des disponibilités ce mois-ci avant de copier.</p>
            <button type="button" onClick={onClose}
              className="mt-5 px-5 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
              Fermer
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mois de destination</p>
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {months.map((m) => {
                const key      = format(m, "yyyy-MM");
                const active   = selectedMonths.includes(key);
                const preview  = previewForMonth(m);
                const disabled = preview === 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => !disabled && toggle(key)}
                    disabled={disabled}
                    className={`flex flex-col items-start gap-0.5 p-3 rounded-2xl border-2 text-left transition-all
                      ${disabled
                        ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                        : active
                          ? "border-blue-400 bg-blue-50 cursor-pointer"
                          : "border-slate-100 hover:border-blue-200 bg-slate-50 cursor-pointer"
                      }`}>
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-extrabold ${active ? "text-blue-700" : "text-slate-500"}`}>
                        {format(m, "yyyy")}
                      </span>
                      {active && !disabled && <Check size={12} className="text-blue-500" />}
                    </div>
                    <span className={`text-xs font-extrabold ${active ? "text-blue-800" : "text-slate-700"}`}>
                      {FR_MONTHS[m.getMonth()]}
                    </span>
                    <span className={`text-[9px] font-bold ${disabled ? "text-slate-300" : active ? "text-blue-500" : "text-slate-400"}`}>
                      {disabled ? "aucun jour applicable" : `~${preview} jours`}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedMonths.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                <p className="text-xs font-extrabold text-blue-700">
                  {selectedMonths.length} mois sélectionné{selectedMonths.length > 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-blue-500 font-medium mt-0.5">
                  La structure de disponibilité de {sourceName} sera reproduite dans les mois choisis.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs font-semibold text-red-600">{error}</p>
              </div>
            )}

            <button type="button" onClick={handleSave}
              disabled={saving || selectedMonths.length === 0}
              className={`w-full py-3 font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 ${done ? "bg-emerald-400 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}>
              {done ? (
                <><Check size={16} />Copié avec succès !</>
              ) : saving ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Copie en cours…</>
              ) : (
                <><Copy size={16} />Copier vers {selectedMonths.length || "…"} mois</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
