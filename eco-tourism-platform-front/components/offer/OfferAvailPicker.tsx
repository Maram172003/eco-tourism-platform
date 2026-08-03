"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, X, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { FR_DAYS, FR_MONTHS, SLOT_COLORS, formatTimeWindows, type TimeSlots, type TimeWindow } from "@/lib/availabilityConflicts";

// Même structure exacte que les slots agenda + time_slots multi-plages par jour
export interface OfferAvailSlot {
  type: "specific" | "range" | "recurring" | "season" | null;
  dates?: string[] | null;        // specific
  start_date?: string | null;     // range, recurring, season
  end_date?: string | null;       // range, recurring, season
  days_of_week?: string[] | null; // range (filtre jours) ou recurring (jours récurrents)
  label?: string | null;
  time_slots?: TimeSlots | null;  // plages horaires par date ISO ou indice jour "0"…"6"
}

export const EMPTY_OFFER_AVAIL: OfferAvailSlot = {
  type: null, dates: null, start_date: null, end_date: null,
  days_of_week: null, label: null, time_slots: null,
};

const MODES: { k: NonNullable<OfferAvailSlot["type"]>; icon: string; label: string; desc: string }[] = [
  { k: "specific",  icon: "event",      label: "Date unique",   desc: "Choisir des dates précises" },
  { k: "range",     icon: "date_range", label: "Plage",         desc: "Du … au …, certains jours" },
  { k: "recurring", icon: "autorenew",  label: "Récurrent",     desc: "Mêmes jours chaque semaine" },
  { k: "season",    icon: "sunny",      label: "Saison",        desc: "Disponible sur une saison" },
];

const inp = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-900 font-medium text-sm";
const timeInp = "w-full px-3 py-3 text-lg font-bold text-violet-800 border-2 border-violet-200 bg-violet-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400";

function computeSeasonDates(mStart: number, mEnd: number) {
  const mn = Math.min(mStart, mEnd);
  const mx = Math.max(mStart, mEnd);
  const y  = new Date().getFullYear();
  return {
    start_date: `${y}-${String(mn + 1).padStart(2, "0")}-01`,
    end_date:   `${y}-${String(mx + 1).padStart(2, "0")}-${String(new Date(y, mx + 1, 0).getDate()).padStart(2, "0")}`,
  };
}

const DAY_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;

function keyLabel(key: string, short = false): string {
  if (DATE_RE.test(key)) {
    try {
      return new Date(key + "T12:00:00").toLocaleDateString("fr-FR", short ? { day: "numeric", month: "short" } : { weekday: "long", day: "numeric", month: "long" });
    } catch { return key; }
  }
  return short ? (FR_DAYS[Number(key)] ?? key) : (DAY_FULL[Number(key)] ?? key);
}

// ── Éditeur horaire inline (sans portal) ──────────────────────────────────────

interface InlineHoursEditorProps {
  keys: string[];                   // dates ISO ou indices jours "0"…"6"
  value: TimeSlots;
  onChange: (ts: TimeSlots) => void;
  onRemove: () => void;
}

function InlineHoursEditor({ keys, value, onChange, onRemove }: InlineHoursEditorProps) {
  const hasPerDay = useMemo(() => {
    const vals = Object.values(value);
    if (vals.length < 2) return false;
    const first = JSON.stringify(vals[0]);
    return vals.some((v) => JSON.stringify(v) !== first);
  }, [value]);

  const [perDay, setPerDay] = useState(hasPerDay);
  const [activeKey, setActiveKey] = useState(keys[0] ?? "");

  // État uniforme
  const firstWins = Object.values(value)[0] ?? [{ start: "09:00", end: "17:00" }];
  const [uStart, setUStart] = useState(firstWins[0]?.start ?? "09:00");
  const [uEnd,   setUEnd]   = useState(firstWins[0]?.end   ?? "17:00");
  const [uExtra, setUExtra] = useState<TimeWindow[]>(firstWins.slice(1));

  // État par jour
  const [perDayData, setPerDayData] = useState<TimeSlots>(() => {
    if (Object.keys(value).length) return { ...value };
    const next: TimeSlots = {};
    keys.forEach((k) => { next[k] = [{ start: "09:00", end: "17:00" }]; });
    return next;
  });

  // Propage les horaires dès le montage pour que le parent ait toujours une valeur à jour
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (!Object.keys(value).length) {
      // Aucune valeur existante → initialise avec les defaults
      const ts: TimeSlots = {};
      keys.forEach((k) => { ts[k] = [{ start: uStart, end: uEnd }]; });
      onChange(ts);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Construit les time_slots uniformes à partir de valeurs EXPLICITES (évite l'état React périmé)
  function buildWith(start: string, end: string, extra: TimeWindow[]): TimeSlots {
    const wins: TimeWindow[] = [{ start, end }, ...extra];
    const next: TimeSlots = {};
    keys.forEach((k) => { next[k] = wins; });
    return next;
  }

  function switchToUniform() {
    const first = Object.values(perDayData)[0];
    const s = first?.[0]?.start ?? uStart;
    const e = first?.[0]?.end   ?? uEnd;
    const ex = first ? first.slice(1) : uExtra;
    setUStart(s); setUEnd(e); setUExtra(ex);
    setPerDay(false);
    onChange(buildWith(s, e, ex));
  }

  function switchToPerDay() {
    const uni = buildWith(uStart, uEnd, uExtra);
    setPerDayData(uni);
    setPerDay(true);
    onChange(uni);
  }

  const updatePerDay = (key: string, idx: number, field: "start" | "end" | "label", v: string) => {
    const wins = [...(perDayData[key] ?? [{ start: "09:00", end: "17:00" }])];
    wins[idx] = { ...wins[idx], [field]: v };
    const next = { ...perDayData, [key]: wins };
    setPerDayData(next);
    onChange(next);
  };

  const addPerDayWin = (key: string) => {
    const wins = perDayData[key] ?? [];
    const last = wins[wins.length - 1];
    const h = last ? Math.min(parseInt(last.end) + 1, 22) : 14;
    const next = { ...perDayData, [key]: [...wins, { start: `${String(h).padStart(2,"0")}:00`, end: `${String(Math.min(h+2,23)).padStart(2,"0")}:00` }] };
    setPerDayData(next);
    onChange(next);
  };

  const removePerDayWin = (key: string, idx: number) => {
    const wins = (perDayData[key] ?? []).filter((_, i) => i !== idx);
    const next = { ...perDayData, [key]: wins.length ? wins : [{ start: "09:00", end: "17:00" }] };
    setPerDayData(next);
    onChange(next);
  };

  const single = keys.length === 1;
  const activeWins = perDayData[activeKey] ?? [{ start: "09:00", end: "17:00" }];

  return (
    <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-200">
        <Clock size={14} className="text-violet-500 shrink-0" />
        <p className="text-xs font-extrabold text-violet-700 flex-1">Horaires de disponibilité</p>
        <button type="button" onClick={onRemove}
          className="w-6 h-6 rounded-lg bg-violet-100 hover:bg-red-100 flex items-center justify-center transition-colors group">
          <X size={12} className="text-violet-400 group-hover:text-red-500" />
        </button>
      </div>

      {/* Toggle uniforme / par jour (seulement si plusieurs clés) */}
      {!single && (
        <div className="flex gap-1 bg-violet-100 p-1 m-3 rounded-xl">
          <button type="button" onClick={switchToUniform}
            className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all ${!perDay ? "bg-white text-violet-700 shadow-sm" : "text-violet-400 hover:text-violet-600"}`}>
            Même horaire pour tous
          </button>
          <button type="button" onClick={switchToPerDay}
            className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all ${perDay ? "bg-white text-violet-700 shadow-sm" : "text-violet-400 hover:text-violet-600"}`}>
            Horaire par {DATE_RE.test(keys[0] ?? "") ? "date" : "jour"}
          </button>
        </div>
      )}

      <div className="px-4 pb-4 space-y-3">

        {/* ── Mode uniforme ── */}
        {!perDay && (
          <>
            {!single && (
              <p className="text-[10px] text-violet-600 font-medium">
                S&apos;applique à <strong>{keys.map((k) => keyLabel(k, true)).join(", ")}</strong>
              </p>
            )}
            {single && (
              <p className="text-[10px] text-violet-600 font-medium">
                Horaire pour <strong>{keyLabel(keys[0] ?? "")}</strong>
              </p>
            )}

            {/* Plage principale */}
            <div className="grid grid-cols-[1fr_24px_1fr] items-center gap-2">
              <input type="time" value={uStart}
                onChange={(e) => { const v = e.target.value; setUStart(v); onChange(buildWith(v, uEnd, uExtra)); }}
                className={timeInp} />
              <span className="text-center text-slate-300 font-light text-lg">→</span>
              <input type="time" value={uEnd}
                onChange={(e) => { const v = e.target.value; setUEnd(v); onChange(buildWith(uStart, v, uExtra)); }}
                className={timeInp} />
            </div>

            {/* Plages supplémentaires */}
            {uExtra.map((w, i) => (
              <div key={i} className="space-y-1.5">
                <div className="grid grid-cols-[1fr_24px_1fr_28px] items-center gap-2">
                  <input type="time" value={w.start}
                    onChange={(e) => { const u=[...uExtra]; u[i]={...u[i],start:e.target.value}; setUExtra(u); onChange(buildWith(uStart, uEnd, u)); }}
                    className={timeInp} />
                  <span className="text-center text-slate-300 font-light text-lg">→</span>
                  <input type="time" value={w.end}
                    onChange={(e) => { const u=[...uExtra]; u[i]={...u[i],end:e.target.value}; setUExtra(u); onChange(buildWith(uStart, uEnd, u)); }}
                    className={timeInp} />
                  <button type="button"
                    onClick={() => { const u=uExtra.filter((_,j)=>j!==i); setUExtra(u); onChange(buildWith(uStart, uEnd, u)); }}
                    className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors">
                    <X size={12} />
                  </button>
                </div>
                <input type="text" placeholder="Nom de cette plage (optionnel)"
                  value={w.label ?? ""}
                  onChange={(e) => { const u=[...uExtra]; u[i]={...u[i],label:e.target.value||undefined}; setUExtra(u); onChange(buildWith(uStart, uEnd, u)); }}
                  className={inp} />
              </div>
            ))}

            <button type="button"
              onClick={() => {
                const h = parseInt(uEnd) + 1;
                const next = [...uExtra, { start: `${String(Math.min(h,22)).padStart(2,"0")}:00`, end: `${String(Math.min(h+2,23)).padStart(2,"0")}:00` }];
                setUExtra(next);
                onChange(buildWith(uStart, uEnd, next));
              }}
              className="flex items-center gap-2 text-xs font-bold text-violet-500 hover:text-violet-700 transition-colors">
              <Plus size={14} className="bg-violet-200 rounded p-0.5" />
              Ajouter une coupure (ex : pause midi)
            </button>
          </>
        )}

        {/* ── Mode par jour ── */}
        {perDay && (
          <>
            {/* Chips des jours/dates */}
            <div className="flex flex-wrap gap-1.5">
              {keys.map((k) => {
                const isActive = activeKey === k;
                const wins = perDayData[k] ?? [];
                return (
                  <button key={k} type="button" onClick={() => setActiveKey(k)}
                    className={`px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold transition-all ${isActive ? "bg-violet-500 border-violet-500 text-white shadow-sm" : "border-violet-200 text-violet-600 bg-white hover:bg-violet-50"}`}>
                    <span>{keyLabel(k, true)}</span>
                    {wins.length > 0 && (
                      <span className={`ml-1.5 text-[9px] font-black ${isActive ? "text-white/70" : "text-violet-400"}`}>
                        {wins.map((w) => `${w.start}–${w.end}`).join(" · ")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Éditeur du jour actif */}
            {activeKey && (
              <div className="bg-white border border-violet-200 rounded-xl p-3 space-y-2.5">
                <p className="text-xs font-extrabold text-violet-700">{keyLabel(activeKey)}</p>
                {activeWins.map((w, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="grid grid-cols-[1fr_24px_1fr_28px] items-center gap-2">
                      <input type="time" value={w.start}
                        onChange={(e) => updatePerDay(activeKey, idx, "start", e.target.value)}
                        className={timeInp} />
                      <span className="text-center text-slate-300 font-light text-lg">→</span>
                      <input type="time" value={w.end}
                        onChange={(e) => updatePerDay(activeKey, idx, "end", e.target.value)}
                        className={timeInp} />
                      {activeWins.length > 1 && (
                        <button type="button" onClick={() => removePerDayWin(activeKey, idx)}
                          className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <input type="text" placeholder="Nom de cette plage (optionnel)"
                      value={w.label ?? ""}
                      onChange={(e) => updatePerDay(activeKey, idx, "label", e.target.value)}
                      className={inp} />
                  </div>
                ))}
                <button type="button" onClick={() => addPerDayWin(activeKey)}
                  className="flex items-center gap-2 text-xs font-bold text-violet-500 hover:text-violet-700 transition-colors">
                  <Plus size={13} className="bg-violet-100 rounded p-0.5" />
                  Ajouter une plage
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Picker principal ──────────────────────────────────────────────────────────

export function OfferAvailPicker({
  value,
  onChange,
  hideTimeSlots = false,
}: {
  value: OfferAvailSlot;
  onChange: (v: OfferAvailSlot) => void;
  hideTimeSlots?: boolean;
}) {
  const [newDate,  setNewDate]  = useState("");
  const [sMStart,  setSMStart]  = useState(new Date().getMonth());
  const [sMEnd,    setSMEnd]    = useState(Math.min(new Date().getMonth() + 2, 11));
  const [showHours, setShowHours] = useState(false);

  const upd = (patch: Partial<OfferAvailSlot>) => onChange({ ...value, ...patch });

  const togDay = (idx: string) => {
    const arr = value.days_of_week ?? [];
    upd({
      days_of_week: arr.includes(idx) ? arr.filter((x) => x !== idx) : [...arr, idx],
      time_slots: null,
    });
  };

  const addDate = () => {
    if (!newDate) return;
    const arr = value.dates ?? [];
    if (!arr.includes(newDate)) upd({ dates: [...arr, newDate].sort(), time_slots: null });
    setNewDate("");
  };

  const removeDate = (d: string) => {
    const next = (value.dates ?? []).filter((x) => x !== d);
    const ts = value.time_slots ? { ...value.time_slots } : null;
    if (ts) delete ts[d];
    upd({ dates: next, time_slots: ts && Object.keys(ts).length ? ts : null });
  };

  const selectMode = (mode: NonNullable<OfferAvailSlot["type"]>) => {
    setShowHours(false);
    if (mode === "season") {
      const mn = new Date().getMonth();
      const mx = Math.min(mn + 2, 11);
      setSMStart(mn); setSMEnd(mx);
      onChange({ ...EMPTY_OFFER_AVAIL, type: "season", ...computeSeasonDates(mn, mx) });
    } else {
      onChange({ ...EMPTY_OFFER_AVAIL, type: mode });
    }
  };

  const changeSeasonMonth = (which: "start" | "end", month: number) => {
    const ns = which === "start" ? month : sMStart;
    const ne = which === "end"   ? month : sMEnd;
    if (which === "start") setSMStart(month); else setSMEnd(month);
    upd({ ...computeSeasonDates(ns, ne), dates: null, days_of_week: null });
  };

  // Clés pour l'éditeur horaire
  const hoursKeys = useMemo<string[]>(() => {
    if (value.type === "specific")  return [...(value.dates ?? [])].sort();
    if (value.type === "range")     return value.days_of_week?.length ? [...value.days_of_week].sort() : ["0","1","2","3","4","5","6"];
    if (value.type === "recurring") return [...(value.days_of_week ?? [])].sort();
    return [];
  }, [value.type, value.dates, value.days_of_week]);

  const hasHours = !!(value.time_slots && Object.keys(value.time_slots).length);

  // Résumé des horaires pour le bouton toggle
  const hoursSummary = useMemo(() => {
    if (!hasHours || !value.time_slots) return "";
    const vals = Object.values(value.time_slots);
    if (!vals.length) return "";
    const first = JSON.stringify(vals[0]);
    const uniform = vals.every((v) => JSON.stringify(v) === first);
    if (uniform && vals[0]) return formatTimeWindows(vals[0]);
    return `Personnalisé (${Object.keys(value.time_slots).length} ${value.type === "specific" ? "dates" : "jours"})`;
  }, [hasHours, value.time_slots, value.type]);

  const colorKey = value.type === "season" ? "season" : value.type ?? "specific";
  const c = SLOT_COLORS[colorKey];

  return (
    <div className="space-y-4">

      {/* ── Sélection du mode ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">
          Mode de disponibilité <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(({ k, icon, label, desc }) => {
            const active = value.type === k;
            const mc = SLOT_COLORS[k === "season" ? "season" : k];
            return (
              <button key={k} type="button" onClick={() => selectMode(k)}
                className={`flex flex-col gap-1 px-3 py-3 rounded-xl border-2 text-left transition-all
                  ${active ? `${mc.bg} ${mc.border} ${mc.text}` : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                <span className={`material-symbols-outlined text-base ${active ? mc.text : "text-slate-400"}`}>{icon}</span>
                <p className="text-xs font-extrabold leading-tight">{label}</p>
                <p className={`text-[10px] font-medium ${active ? "" : "text-slate-400"}`}>{desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DATE UNIQUE ──────────────────────────────────────────────────── */}
      {value.type === "specific" && (
        <div className={`p-4 rounded-2xl border space-y-3 ${c.bg} ${c.border}`}>
          <div className="flex gap-2">
            <input type="date" value={newDate} min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <button type="button" onClick={addDate}
              className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-extrabold hover:bg-emerald-600 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          {(value.dates ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {(value.dates ?? []).map((d) => (
                <span key={d} className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                  {d}
                  <button type="button" onClick={() => removeDate(d)}><X size={8} /></button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-emerald-600/70 text-center py-1">Aucune date sélectionnée</p>
          )}
          <input type="text" placeholder="Nom du créneau (optionnel)"
            value={value.label ?? ""}
            onChange={(e) => upd({ label: e.target.value || null })}
            className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-slate-400" />
        </div>
      )}

      {/* ── PLAGE ────────────────────────────────────────────────────────── */}
      {value.type === "range" && (
        <div className={`p-4 rounded-2xl border space-y-3 ${c.bg} ${c.border}`}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-blue-500 uppercase block mb-1">Début *</label>
              <input type="date" value={value.start_date ?? ""} min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => upd({ start_date: e.target.value, time_slots: null })}
                className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[9px] font-black text-blue-500 uppercase block mb-1">Fin *</label>
              <input type="date" value={value.end_date ?? ""} min={value.start_date ?? ""}
                onChange={(e) => upd({ end_date: e.target.value, time_slots: null })}
                className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-blue-500 uppercase block mb-1.5">
              Jours inclus <span className="font-medium text-blue-400">(vide = tous)</span>
            </label>
            <div className="flex gap-1">
              {FR_DAYS.map((d, i) => {
                const k = String(i); const active = (value.days_of_week ?? []).includes(k);
                return (
                  <button key={i} type="button" onClick={() => togDay(k)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold border transition-all ${active ? "bg-blue-500 border-blue-500 text-white" : "border-blue-200 text-blue-400 hover:border-blue-400"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <input type="text" placeholder="Label (ex : Vacances d'été)"
            value={value.label ?? ""}
            onChange={(e) => upd({ label: e.target.value || null })}
            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400" />
        </div>
      )}

      {/* ── RÉCURRENT ────────────────────────────────────────────────────── */}
      {value.type === "recurring" && (
        <div className={`p-4 rounded-2xl border space-y-3 ${c.bg} ${c.border}`}>
          <div>
            <label className="text-[9px] font-black text-amber-600 uppercase block mb-1.5">Jours de la semaine *</label>
            <div className="flex gap-1">
              {FR_DAYS.map((d, i) => {
                const k = String(i); const active = (value.days_of_week ?? []).includes(k);
                return (
                  <button key={i} type="button" onClick={() => togDay(k)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-extrabold border-2 transition-all ${active ? "bg-amber-400 border-amber-400 text-slate-900" : "border-amber-200 text-amber-500 hover:border-amber-400"}`}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-amber-600 uppercase block mb-1">À partir du</label>
              <input type="date" value={value.start_date ?? ""} min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => upd({ start_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm font-medium" />
            </div>
            <div>
              <label className="text-[9px] font-black text-amber-600 uppercase block mb-1">{"Jusqu'au"}</label>
              <input type="date" value={value.end_date ?? ""} min={value.start_date ?? ""}
                onChange={(e) => upd({ end_date: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm font-medium" />
            </div>
          </div>
          <input type="text" placeholder="Label (ex : Week-ends disponibles)"
            value={value.label ?? ""}
            onChange={(e) => upd({ label: e.target.value || null })}
            className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300 placeholder:text-slate-400" />
        </div>
      )}

      {/* ── SAISON ───────────────────────────────────────────────────────── */}
      {value.type === "season" && (
        <div className={`p-4 rounded-2xl border space-y-3 ${c.bg} ${c.border}`}>
          <div>
            <label className="text-[9px] font-black text-teal-600 uppercase block mb-2">Période</label>
            {/* Barre visuelle des mois */}
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 12 }, (_, i) => {
                const mn = Math.min(sMStart, sMEnd); const mx = Math.max(sMStart, sMEnd);
                const inR = i >= mn && i <= mx; const isEdge = i === mn || i === mx;
                return (
                  <button key={i} type="button"
                    onClick={() => changeSeasonMonth(i <= sMStart ? "start" : "end", i)}
                    title={FR_MONTHS[i]}
                    className={`flex-1 h-5 rounded-sm text-[7px] font-extrabold transition-all ${isEdge ? "bg-teal-500 text-white" : inR ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-400 hover:bg-teal-50"}`}>
                    {FR_MONTHS[i].slice(0, 1)}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-black text-teal-600 uppercase block mb-1">Début</label>
                <select value={sMStart} onChange={(e) => changeSeasonMonth("start", Number(e.target.value))}
                  className="w-full px-2 py-2 bg-white border border-teal-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300 appearance-none">
                  {FR_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-teal-600 uppercase block mb-1">Fin</label>
                <select value={sMEnd} onChange={(e) => changeSeasonMonth("end", Number(e.target.value))}
                  className="w-full px-2 py-2 bg-white border border-teal-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300 appearance-none">
                  {FR_MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
            {value.start_date && value.end_date && (
              <p className="text-xs font-extrabold text-teal-600 mt-1.5">
                1er {FR_MONTHS[Math.min(sMStart, sMEnd)]} → fin {FR_MONTHS[Math.max(sMStart, sMEnd)]} {new Date().getFullYear()}
              </p>
            )}
          </div>
          <input type="text" placeholder="Label (ex : Saison haute été)"
            value={value.label ?? ""}
            onChange={(e) => upd({ label: e.target.value || null })}
            className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder:text-slate-400" />
          <p className="text-[10px] text-teal-500/80 font-medium">
            Les horaires ne sont pas configurables pour une saison entière (journée entière).
          </p>
        </div>
      )}

      {/* ── Horaires inline (tous modes sauf saison) ─────────────────────── */}
      {!hideTimeSlots && value.type && value.type !== "season" && hoursKeys.length > 0 && (
        <>
          {!hasHours && !showHours ? (
            /* Bouton "Ajouter des horaires" */
            <button type="button" onClick={() => setShowHours(true)}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 transition-all group">
              <Clock size={15} className="group-hover:text-violet-400 shrink-0" />
              <span className="text-xs font-bold flex-1 text-left">Ajouter des horaires</span>
              <span className="text-[10px] font-semibold text-slate-300">optionnel</span>
            </button>
          ) : hasHours && !showHours ? (
            /* Résumé horaires + bouton modifier */
            <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border-2 border-violet-200 rounded-2xl">
              <Clock size={15} className="text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Horaires</p>
                <p className="text-xs font-bold text-violet-800 truncate">{hoursSummary}</p>
              </div>
              <button type="button" onClick={() => setShowHours(true)}
                className="w-7 h-7 rounded-xl bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition-colors">
                <ChevronDown size={13} className="text-violet-500" />
              </button>
              <button type="button" onClick={() => upd({ time_slots: null })}
                className="w-7 h-7 rounded-xl bg-violet-100 hover:bg-red-100 flex items-center justify-center transition-colors group">
                <X size={12} className="text-violet-400 group-hover:text-red-500" />
              </button>
            </div>
          ) : (
            /* Éditeur inline ouvert */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horaires</span>
                <button type="button" onClick={() => setShowHours(false)}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors">
                  <ChevronUp size={12} />
                  Replier
                </button>
              </div>
              <InlineHoursEditor
                keys={hoursKeys}
                value={value.time_slots ?? {}}
                onChange={(ts) => upd({ time_slots: Object.keys(ts).length ? ts : null })}
                onRemove={() => { upd({ time_slots: null }); setShowHours(false); }}
              />
            </div>
          )}
        </>
      )}

      {/* Hint quand les clés ne sont pas encore disponibles */}
      {!hideTimeSlots && value.type && value.type !== "season" && hoursKeys.length === 0 && (
        <p className="text-[11px] text-slate-400 text-center py-2 border border-dashed border-slate-200 rounded-2xl">
          {value.type === "recurring"
            ? "Sélectionnez des jours ci-dessus pour configurer les horaires"
            : "Ajoutez des dates ci-dessus pour configurer les horaires"}
        </p>
      )}
    </div>
  );
}
