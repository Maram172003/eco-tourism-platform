"use client";

import { useState } from "react";
import { format, parseISO, addDays, differenceInDays, getDaysInMonth, startOfDay, eachDayOfInterval, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { X, AlertTriangle } from "lucide-react";
import {
  FR_DAYS, FR_MONTHS, SLOT_COLORS, getMaxEndDate, dateStr, toFrIdx, isDateSelectable,
  type AvailabilitySlot, type TimeSlots,
} from "@/lib/availabilityConflicts";
import TimeSlotEditor from "./TimeSlotEditor";

export type CreateMode = "specific" | "range" | "recurring" | "season";

interface Props {
  activeMode: CreateMode | null;
  onModeChange: (m: CreateMode | null) => void;

  // Specific mode (controlled by calendar clicks)
  selectedDates: string[];
  onRemoveDate: (d: string) => void;
  onClearDates: () => void;

  // Range mode (controlled by calendar clicks)
  rangeA: string;
  rangeB: string;
  onRangeChange: (a: string, b: string) => void;

  // Recurring mode (controlled by calendar clicks)
  recurDays: string[];
  onRecurDaysChange: (days: string[]) => void;
  recurMonths: number[];
  onRecurMonthsChange: (months: number[]) => void;
  recurFrom: string;
  onRecurFromChange: (v: string) => void;
  recurTo: string;
  onRecurToChange: (v: string) => void;

  existingSlots: AvailabilitySlot[]; // used to constrain hours (block at the source)

  onSubmit: (slot: Omit<AvailabilitySlot, "id">) => Promise<void>;
  saving?: boolean;
}

/** Group a set of month indices (0-11) into contiguous [start, end] blocks */
function monthBlocks(months: number[]): [number, number][] {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (!sorted.length) return [];
  const blocks: [number, number][] = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
    blocks.push([start, prev]);
    start = sorted[i]; prev = sorted[i];
  }
  blocks.push([start, prev]);
  return blocks;
}

/** List every actual occurrence date for a set of weekdays within a bounded window (months, or from/to) */
function occurrenceDatesInWindow(days: string[], monthsSel: number[], from: string, to: string, today: string): string[] {
  const y = new Date().getFullYear();
  let ranges: [Date, Date][];
  if (monthsSel.length) {
    ranges = monthBlocks(monthsSel).map(([mn, mx]): [Date, Date] =>
      [new Date(y, mn, 1), new Date(y, mx, getDaysInMonth(new Date(y, mx)))]);
  } else if (from && to) {
    ranges = [[parseISO(from), parseISO(to)]];
  } else {
    return [];
  }
  const out: string[] = [];
  for (const [s, e] of ranges) {
    if (isAfter(s, e)) continue;
    for (const d of eachDayOfInterval({ start: s, end: e })) {
      const ds = dateStr(d);
      if (ds < today) continue;
      if (days.includes(toFrIdx(d))) out.push(ds);
    }
  }
  return out.sort();
}

const MODES: { k: CreateMode; icon: string; label: string }[] = [
  { k: "specific",  icon: "event",      label: "Date unique" },
  { k: "range",     icon: "date_range", label: "Plage"       },
  { k: "recurring", icon: "autorenew",  label: "Récurrent"   },
  { k: "season",    icon: "sunny",      label: "Saison"      },
];

export default function CreationPanel({
  activeMode, onModeChange,
  selectedDates, onRemoveDate, onClearDates,
  rangeA, rangeB, onRangeChange,
  recurDays, onRecurDaysChange,
  recurMonths, onRecurMonthsChange,
  recurFrom, onRecurFromChange,
  recurTo, onRecurToChange,
  existingSlots,
  onSubmit, saving = false,
}: Props) {
  const [error, setError] = useState("");

  // Range: internal (label + days filter within range)
  const [rangeDays,  setRangeDays]  = useState(["0","1","2","3","4","5","6"]);
  const [rangeLabel, setRangeLabel] = useState("");

  // Recurring: internal (label only — months/from/to are lifted so the calendar preview can see them)
  const [recurLabel, setRecurLabel] = useState("");

  // Season: internal
  const [sMStart,     setSMStart]     = useState(0);
  const [sMEnd,       setSMEnd]       = useState(11);
  const [seasonLabel, setSeasonLabel] = useState("");

  // Specific label
  const [specLabel, setSpecLabelState] = useState("");

  // Horaires par jour (plusieurs plages possibles, différentes par jour/date)
  const [timeSlots, setTimeSlots] = useState<TimeSlots>({});

  const today = format(startOfDay(new Date()), "yyyy-MM-dd");

  function resetMode(m: CreateMode | null) {
    setError("");
    setTimeSlots({});
    onModeChange(m);
  }

  /** Builds the DTO(s) for the current mode/state, without hours. Returns an error message instead if invalid. */
  function buildBaseDtos(): { dtos: Omit<AvailabilitySlot, "id">[]; error?: string } {
    if (!activeMode) return { dtos: [], error: "Choisis d'abord un type de disponibilité." };

    if (activeMode === "specific") {
      const future = selectedDates.filter((d) => d >= today);
      if (!future.length) return { dtos: [], error: "Sélectionnez au moins une date future." };
      return { dtos: [{ type: "specific", dates: [...future].sort(), label: specLabel.trim() || null }] };
    }

    if (activeMode === "range") {
      if (!rangeA || !rangeB) return { dtos: [], error: "Cliquez sur deux jours dans le calendrier (début puis fin)." };
      const [a, b] = rangeA <= rangeB ? [rangeA, rangeB] : [rangeB, rangeA];
      if (b < today) return { dtos: [], error: "La plage est entièrement dans le passé." };

      // Some days inside this range are already taken by another slot — a "range" type can't skip
      // individual days, so fall back to explicit dates for just the ones still free.
      if (rangeOccurrencesRaw.length > rangeOccurrences.length) {
        if (!rangeOccurrences.length) return { dtos: [], error: "Tous les jours de cette plage sont déjà pris." };
        return { dtos: [{ type: "specific", dates: rangeOccurrences, label: rangeLabel.trim() || null }] };
      }

      return { dtos: [{
        type: "range",
        start_date: a < today ? today : a,
        end_date: b,
        days_of_week: rangeDays.length < 7 ? rangeDays : null,
        label: rangeLabel.trim() || null,
      }] };
    }

    if (activeMode === "recurring") {
      if (!recurDays.length) return { dtos: [], error: "Cliquez sur des jours dans le calendrier ou sélectionnez des jours ci-dessous." };

      // Same idea as "range": if the pattern is bounded and some occurrences are already taken,
      // save the still-free dates explicitly instead of a recurring pattern that can't skip days.
      if (recurBounded && recurOccurrencesRaw.length > recurOccurrences.length) {
        if (!recurOccurrences.length) return { dtos: [], error: "Tous les jours de cette récurrence sont déjà pris." };
        return { dtos: [{ type: "specific", dates: recurOccurrences, label: recurLabel.trim() || null }] };
      }

      if (recurMonths.length) {
        const y = new Date().getFullYear();
        const blocks = monthBlocks(recurMonths)
          .map(([mn, mx]) => {
            const last = getDaysInMonth(new Date(y, mx));
            const start_date = `${y}-${String(mn + 1).padStart(2,"0")}-01`;
            const end_date   = `${y}-${String(mx + 1).padStart(2,"0")}-${String(last).padStart(2,"0")}`;
            return { start_date: start_date < today ? today : start_date, end_date };
          })
          .filter((b) => b.end_date >= today);
        if (!blocks.length) return { dtos: [], error: "Tous les mois sélectionnés sont déjà passés." };
        return { dtos: blocks.map((b) => ({
          type: "recurring", days_of_week: recurDays,
          start_date: b.start_date, end_date: b.end_date,
          label: recurLabel.trim() || null,
        })) };
      }

      if (recurTo && recurTo < today) return { dtos: [], error: "La date de fin est déjà passée." };
      return { dtos: [{
        type: "recurring", days_of_week: recurDays,
        start_date: recurFrom && recurFrom < today ? today : (recurFrom || null),
        end_date: recurTo || null,
        label: recurLabel.trim() || null,
      }] };
    }

    // season
    const y   = new Date().getFullYear();
    const mn  = Math.min(sMStart, sMEnd);
    const mx  = Math.max(sMStart, sMEnd);
    const last = getDaysInMonth(new Date(y, mx));
    const endD = `${y}-${String(mx + 1).padStart(2,"0")}-${String(last).padStart(2,"0")}`;
    if (endD < today) return { dtos: [], error: "Cette saison est entièrement dans le passé." };
    return { dtos: [{
      type: "range",
      start_date: `${y}-${String(mn + 1).padStart(2,"0")}-01`,
      end_date: endD,
      label: `${seasonLabel.trim() || "Saison"} (saison)`,
    }] };
  }

  // Recurring: once the period is bounded (months chosen, or an explicit from/to range),
  // every occurrence date is enumerable — so hours can be set per exact date instead of just per weekday.
  // Days already fully taken by another slot are dropped — nothing to configure there anyway.
  const recurBounded = recurMonths.length > 0 || (!!recurFrom && !!recurTo);
  const recurOccurrencesRaw = recurBounded ? occurrenceDatesInWindow(recurDays, recurMonths, recurFrom, recurTo, today) : [];
  const recurOccurrences = recurOccurrencesRaw.filter((ds) => isDateSelectable(parseISO(ds), existingSlots));

  // Range is always bounded (rangeA/rangeB are exact dates) — set hours per exact date, not per generic weekday
  const rangeOccurrencesRaw = (rangeA && rangeB)
    ? occurrenceDatesInWindow(rangeDays, [], rangeA <= rangeB ? rangeA : rangeB, rangeA <= rangeB ? rangeB : rangeA, today)
    : [];
  const rangeOccurrences = rangeOccurrencesRaw.filter((ds) => isDateSelectable(parseISO(ds), existingSlots));

  const hoursKeys: string[] =
    activeMode === "specific" ? [...selectedDates].sort() :
    activeMode === "range"    ? rangeOccurrences :
    activeMode === "recurring" ? (recurBounded && recurOccurrences.length ? recurOccurrences : [...recurDays].sort()) :
    [];

  async function handleSubmit() {
    setError("");
    const { dtos, error: buildError } = buildBaseDtos();
    if (buildError) { setError(buildError); return; }
    if (!dtos.length) return;

    const withTime = dtos.map((d) => ({
      ...d,
      time_slots: activeMode === "season" || !Object.keys(timeSlots).length ? null : timeSlots,
    }));

    try {
      for (const d of withTime) await onSubmit(d);
      setRangeLabel(""); setRangeDays(["0","1","2","3","4","5","6"]);
      onRecurFromChange(""); onRecurToChange(""); setRecurLabel(""); onRecurMonthsChange([]);
      setSMStart(0); setSMEnd(11); setSeasonLabel("");
      setSpecLabelState(""); setTimeSlots({});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    }
  }

  const maxEnd = activeMode === "range" && rangeA ? getMaxEndDate(parseISO(rangeA), existingSlots) : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
      {/* Mode tabs */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Nouvelle disponibilité</p>
        <div className="grid grid-cols-2 gap-1.5">
          {MODES.map(({ k, icon, label }) => {
            const ct = k === "season" ? "season" : k;
            const c  = SLOT_COLORS[ct];
            const active = activeMode === k;
            return (
              <button key={k} type="button" onClick={() => resetMode(active ? null : k)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold border-2 transition-all text-left ${active ? `${c.bg} ${c.text} border-current` : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                <span className="material-symbols-outlined text-base">{icon}</span>{label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">

        {!activeMode && (
          <p className="text-xs text-slate-400 text-center py-6">
            Choisis un type de disponibilité ci-dessus pour commencer, ou clique sur un jour du calendrier pour en voir le détail.
          </p>
        )}

        {/* ① DATE UNIQUE */}
        {activeMode === "specific" && (
          <>
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <span className="material-symbols-outlined text-sm text-emerald-500">touch_app</span>
              <p className="text-[10px] font-semibold text-emerald-600">Cliquez sur les jours du calendrier pour les sélectionner</p>
            </div>
            {selectedDates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {[...selectedDates].sort().map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {format(parseISO(d), "dd MMM", { locale: fr })}
                    <button type="button" onClick={() => onRemoveDate(d)} className="hover:text-red-500"><X size={9} /></button>
                  </span>
                ))}
                <button type="button" onClick={onClearDates} className="text-[10px] text-slate-400 font-bold hover:text-red-500 transition-colors">Tout effacer</button>
              </div>
            )}
            {selectedDates.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">Aucun jour sélectionné</p>
            )}
            <input type="text" placeholder="Nom du créneau (optionnel)"
              value={specLabel} onChange={(e) => setSpecLabelState(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white placeholder:text-slate-400" />
          </>
        )}

        {/* ② PLAGE */}
        {activeMode === "range" && (
          <>
            {/* Calendar click hint */}
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="material-symbols-outlined text-sm text-blue-500">touch_app</span>
              <p className="text-[10px] font-semibold text-blue-600">
                {!rangeA ? "Cliquez sur le jour de début dans le calendrier"
                  : !rangeB ? "Cliquez maintenant sur le jour de fin"
                  : "Cliquez sur un autre jour pour réinitialiser la plage"}
              </p>
            </div>

            {/* Visual selection summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-xl border-2 text-center transition-all ${rangeA ? "border-blue-400 bg-blue-50" : "border-dashed border-slate-200"}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Début</p>
                {rangeA
                  ? <p className="text-sm font-extrabold text-blue-700">{format(parseISO(rangeA), "dd MMM", { locale: fr })}</p>
                  : <p className="text-xs text-slate-300 font-medium">—</p>}
              </div>
              <div className={`p-3 rounded-xl border-2 text-center transition-all ${rangeB ? "border-blue-400 bg-blue-50" : "border-dashed border-slate-200"}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fin</p>
                {rangeB
                  ? <p className="text-sm font-extrabold text-blue-700">{format(parseISO(rangeB), "dd MMM", { locale: fr })}</p>
                  : <p className="text-xs text-slate-300 font-medium">—</p>}
              </div>
            </div>

            {rangeA && rangeB && (
              <p className="text-xs font-bold text-blue-600 text-center">
                {differenceInDays(parseISO(rangeA > rangeB ? rangeA : rangeB), parseISO(rangeA > rangeB ? rangeB : rangeA)) + 1} jours sélectionnés
                <button type="button" onClick={() => onRangeChange("", "")}
                  className="ml-2 text-slate-400 hover:text-red-500 transition-colors text-[10px]">✕ Réinitialiser</button>
              </p>
            )}

            {maxEnd && (
              <p className="text-[10px] text-amber-600 font-semibold text-center">
                La plage doit s&apos;arrêter au plus tard le {format(maxEnd, "dd MMM", { locale: fr })} (jour suivant déjà pris)
              </p>
            )}

            {/* Saisie manuelle optionnelle */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ou saisir début</label>
                <input type="date" value={rangeA} min={today}
                  onChange={(e) => onRangeChange(e.target.value, rangeB)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ou saisir fin</label>
                <input type="date" value={rangeB} min={rangeA || today} max={maxEnd ? dateStr(maxEnd) : undefined}
                  onChange={(e) => onRangeChange(rangeA, e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Jours inclus dans la plage</label>
              <div className="flex gap-1">
                {FR_DAYS.map((d, i) => {
                  const k = String(i); const a = rangeDays.includes(k);
                  return (
                    <button key={i} type="button"
                      onClick={() => setRangeDays((p) => a ? p.filter((x) => x !== k) : [...p, k])}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold border transition-all ${a ? "bg-blue-500 border-blue-500 text-white" : "border-slate-200 text-slate-400 hover:border-blue-300"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <input type="text" placeholder="Label (ex: Vacances d'été)"
              value={rangeLabel} onChange={(e) => setRangeLabel(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white placeholder:text-slate-400" />
          </>
        )}

        {/* ③ RÉCURRENT */}
        {activeMode === "recurring" && (
          <>
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="material-symbols-outlined text-sm text-amber-500">touch_app</span>
              <p className="text-[10px] font-semibold text-amber-600">Cliquez sur des jours du calendrier ou sélectionnez ci-dessous</p>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Jours de la semaine *</label>
              <div className="flex gap-1">
                {FR_DAYS.map((d, i) => {
                  const k = String(i); const a = recurDays.includes(k);
                  return (
                    <button key={i} type="button"
                      onClick={() => onRecurDaysChange(a ? recurDays.filter((x) => x !== k) : [...recurDays, k])}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-extrabold border-2 transition-all ${a ? "bg-amber-400 border-amber-400 text-slate-900" : "border-slate-200 text-slate-400 hover:border-amber-300"}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {recurDays.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">4 prochains créneaux</p>
                {(() => {
                  if (recurBounded) {
                    if (!recurOccurrences.length) {
                      return <p className="text-xs text-amber-700 font-semibold">Aucune date disponible dans cette période.</p>;
                    }
                    return recurOccurrences.slice(0, 4).map((ds) => (
                      <p key={ds} className="text-xs text-amber-700 font-semibold capitalize">
                        {format(parseISO(ds), "EEEE dd MMM", { locale: fr })}
                      </p>
                    ));
                  }
                  const upcoming: Date[] = []; let d = new Date();
                  while (upcoming.length < 4) {
                    if (recurDays.includes(String((d.getDay() + 6) % 7))) upcoming.push(new Date(d));
                    d = addDays(d, 1);
                  }
                  return upcoming.map((u) => (
                    <p key={u.toISOString()} className="text-xs text-amber-700 font-semibold capitalize">
                      {format(u, "EEEE dd MMM", { locale: fr })}
                    </p>
                  ));
                })()}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Mois concernés (optionnel)</label>
              <div className="grid grid-cols-4 gap-1">
                {FR_MONTHS.map((m, i) => {
                  const a = recurMonths.includes(i);
                  const isCurrent = i === new Date().getMonth();
                  const isPast = i < new Date().getMonth();
                  return (
                    <button key={i} type="button" disabled={isPast}
                      onClick={() => onRecurMonthsChange(a ? recurMonths.filter((x) => x !== i) : [...recurMonths, i])}
                      className={`py-1.5 rounded-lg text-[10px] font-extrabold border-2 transition-all ${isPast ? "border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed" : a ? "bg-amber-400 border-amber-400 text-slate-900" : isCurrent ? "border-amber-300 text-amber-600 hover:border-amber-400" : "border-slate-200 text-slate-400 hover:border-amber-300"}`}>
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                {recurMonths.length
                  ? "Laisse vide pour choisir des dates précises à la place."
                  : "Choisis un ou plusieurs mois (pas forcément à la suite), sinon utilise les dates ci-dessous."}
              </p>
            </div>

            {recurMonths.length === 0 && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">À partir du</label>
                  <input type="date" value={recurFrom} min={today} onChange={(e) => onRecurFromChange(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Jusqu&apos;au</label>
                  <input type="date" value={recurTo} min={recurFrom || today} onChange={(e) => onRecurToChange(e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white" />
                </div>
              </div>
            )}
            <input type="text" placeholder="Label (ex: Week-ends disponibles)"
              value={recurLabel} onChange={(e) => setRecurLabel(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white placeholder:text-slate-400" />
          </>
        )}

        {/* ④ SAISON */}
        {activeMode === "season" && (
          <>
            <p className="text-xs text-slate-500 font-medium">Disponibilité saisonnière pour cette année.</p>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Période</label>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 12 }, (_, i) => {
                  const mn = Math.min(sMStart, sMEnd); const mx = Math.max(sMStart, sMEnd);
                  const inR = i >= mn && i <= mx; const isEdge = i === mn || i === mx;
                  return (
                    <button key={i} type="button"
                      onClick={() => i < sMStart ? setSMStart(i) : setSMEnd(i)}
                      className={`flex-1 h-5 rounded-sm text-[7px] font-extrabold transition-all ${isEdge ? "bg-teal-500 text-white" : inR ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400 hover:bg-teal-50"}`}
                      title={FR_MONTHS[i]}>
                      {FR_MONTHS[i].slice(0, 1)}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Début</label>
                  <select value={sMStart} onChange={(e) => setSMStart(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300 focus:bg-white appearance-none">
                    {FR_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fin</label>
                  <select value={sMEnd} onChange={(e) => setSMEnd(Number(e.target.value))}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300 focus:bg-white appearance-none">
                    {FR_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-teal-600 font-bold mt-1.5">
                1er {FR_MONTHS[Math.min(sMStart, sMEnd)]} → fin {FR_MONTHS[Math.max(sMStart, sMEnd)]} {new Date().getFullYear()}
              </p>
            </div>
            <input type="text" placeholder="Label (ex: Saison haute été)"
              value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300 focus:bg-white placeholder:text-slate-400" />
          </>
        )}

        {/* ── Horaires par jour ────────────────────────────────────────────── */}
        {activeMode !== "season" && hoursKeys.length > 0 && (
          <TimeSlotEditor
            mode={activeMode === "recurring" && !(recurBounded && recurOccurrences.length) ? "recurring" : "specific"}
            keys={hoursKeys}
            value={timeSlots}
            existingSlots={existingSlots}
            onChange={setTimeSlots}
          />
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-600">{error}</p>
          </div>
        )}

        <button type="button" onClick={handleSubmit} disabled={saving}
          className="w-full py-3 bg-primary hover:bg-primary/90 text-slate-900 font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-sm active:scale-[0.98]">
          {saving
            ? <><div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />Enregistrement…</>
            : <><span className="material-symbols-outlined text-base">save</span>
              {activeMode === "specific" && selectedDates.length > 0
                ? `Enregistrer ${selectedDates.length} jour${selectedDates.length > 1 ? "s" : ""}`
                : activeMode === "range" && rangeA && rangeB
                  ? `Enregistrer la plage`
                  : activeMode === "recurring" && recurDays.length > 0
                    ? `Enregistrer (${recurDays.length} jour${recurDays.length > 1 ? "s" : ""}/sem.)`
                    : "Enregistrer"}
            </>
          }
        </button>
      </div>
    </div>
  );
}
