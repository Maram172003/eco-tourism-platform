"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Clock, Check, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FR_DAYS, getDayConstraints,
  type AvailabilitySlot, type TimeSlots, type TimeWindow,
} from "@/lib/availabilityConflicts";

interface Props {
  mode: "specific" | "range" | "recurring";
  keys: string[];
  initial: TimeSlots;
  existingSlots: AvailabilitySlot[]; // for cross-slot blocking (excludes the slot being edited, if any)
  onSave: (v: TimeSlots) => void;
  onClose: () => void;
  /** Opened from inside another modal — render as a side panel, not a second stacked overlay. */
  nested?: boolean;
}

const DAY_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function keyLabel(key: string, mode: Props["mode"], short = false): string {
  if (mode === "specific" || DATE_RE.test(key)) {
    try { return format(parseISO(key), short ? "dd MMM" : "EEEE dd MMMM yyyy", { locale: fr }); }
    catch { return key; }
  }
  return short ? (FR_DAYS[Number(key)] ?? key) : (DAY_FULL[Number(key)] ?? key);
}

function windowsOverlap(a: TimeWindow, b: TimeWindow): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Indices of windows that overlap another window in the same list, or a blocked window from another slot */
function badIndices(wins: TimeWindow[], blocked: TimeWindow[]): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < wins.length; i++) {
    for (let j = i + 1; j < wins.length; j++) {
      if (windowsOverlap(wins[i], wins[j])) { bad.add(i); bad.add(j); }
    }
  }
  wins.forEach((w, i) => { if (blocked.some((b) => windowsOverlap(w, b))) bad.add(i); });
  return bad;
}

/** Hours another slot already occupies for this key (only resolvable when the key is an exact date) */
function blockedWindowsForKey(key: string, existingSlots: AvailabilitySlot[]): TimeWindow[] {
  if (!DATE_RE.test(key)) return [];
  return getDayConstraints(parseISO(key), existingSlots).blockedWindows;
}

export default function TimeSlotModal({ mode, keys, initial, existingSlots, onSave, onClose, nested = false }: Props) {
  const [perDay,    setPerDay]    = useState(() => {
    if (!Object.keys(initial).length) return false;
    const vals = Object.values(initial);
    const first = JSON.stringify(vals[0]);
    return vals.some((v) => JSON.stringify(v) !== first);
  });
  const [activeKey, setActiveKey] = useState<string>(keys[0] ?? "");

  // Uniform mode
  const [uStart, setUStart] = useState(() => Object.values(initial)[0]?.[0]?.start ?? "09:00");
  const [uEnd,   setUEnd]   = useState(() => Object.values(initial)[0]?.[0]?.end   ?? "17:00");
  const [uLabel, setULabel] = useState(() => Object.values(initial)[0]?.[0]?.label ?? "");
  const [uExtra, setUExtra] = useState<TimeWindow[]>(() => Object.values(initial)[0]?.slice(1) ?? []);

  // Per-day mode
  const [perDayData, setPerDayData] = useState<TimeSlots>(() => {
    if (Object.keys(initial).length) return { ...initial };
    const next: TimeSlots = {};
    keys.forEach((k) => { next[k] = [{ start: "09:00", end: "17:00" }]; });
    return next;
  });

  function buildUniform(): TimeSlots {
    const wins: TimeWindow[] = [{ start: uStart, end: uEnd, label: uLabel.trim() || undefined }, ...uExtra];
    const next: TimeSlots = {};
    keys.forEach((k) => { next[k] = wins; });
    return next;
  }

  function switchToPerDay() {
    const current = buildUniform();
    const next: TimeSlots = {};
    keys.forEach((k) => { next[k] = current[k] ? [...current[k]] : [{ start: uStart, end: uEnd, label: uLabel.trim() || undefined }]; });
    setPerDayData(next);
    setPerDay(true);
  }

  function switchToUniform() {
    const first = Object.values(perDayData)[0];
    if (first?.[0]) { setUStart(first[0].start); setUEnd(first[0].end); setULabel(first[0].label ?? ""); setUExtra(first.slice(1)); }
    setPerDay(false);
  }

  function updatePerDay(key: string, idx: number, field: "start" | "end" | "label", v: string) {
    const wins = [...(perDayData[key] ?? [{ start: "09:00", end: "17:00" }])];
    wins[idx] = { ...wins[idx], [field]: v };
    setPerDayData({ ...perDayData, [key]: wins });
  }

  function addPerDayWindow(key: string) {
    const wins = perDayData[key] ?? [];
    const last = wins[wins.length - 1];
    const h = last ? Math.min(parseInt(last.end.split(":")[0]) + 1, 22) : 14;
    setPerDayData({ ...perDayData, [key]: [...wins, { start: `${String(h).padStart(2,"0")}:00`, end: `${String(Math.min(h+2,23)).padStart(2,"0")}:00` }] });
  }

  function removePerDayWindow(key: string, idx: number) {
    const wins = (perDayData[key] ?? []).filter((_, i) => i !== idx);
    setPerDayData({ ...perDayData, [key]: wins.length ? wins : [{ start: "09:00", end: "17:00" }] });
  }

  function handleSave() {
    onSave(perDay ? perDayData : buildUniform());
    onClose();
  }

  const activeWins = perDayData[activeKey] ?? [];
  const single = keys.length === 1;

  const allBlockedAcrossKeys = keys.flatMap((k) => blockedWindowsForKey(k, existingSlots));
  const uniformWins = [{ start: uStart, end: uEnd }, ...uExtra];
  const uniformBad  = badIndices(uniformWins, allBlockedAcrossKeys);
  const activeBlocked = blockedWindowsForKey(activeKey, existingSlots);
  const activeBad      = badIndices(activeWins, activeBlocked);

  const isValid = perDay
    ? Object.keys(perDayData).every((k) => badIndices(perDayData[k], blockedWindowsForKey(k, existingSlots)).size === 0)
    : uniformBad.size === 0;

  return createPortal(
    <div className={nested
      ? "fixed inset-0 z-[70] bg-black/20 p-4"
      : "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"}
      onClick={onClose}>
      <div
        className={nested
          ? "absolute top-1/2 -translate-y-1/2 max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] ring-1 ring-black/5"
          : "bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]"}
        style={nested ? { left: "calc(50% + 0.5rem)", width: "calc(50vw - 2rem)" } : undefined}
        onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={22} className="text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-extrabold text-slate-800">Horaires de disponibilité</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {mode === "specific"
                ? `${keys.length} date${keys.length > 1 ? "s" : ""} sélectionnée${keys.length > 1 ? "s" : ""}`
                : `${keys.length} jour${keys.length > 1 ? "s" : ""} de la semaine`}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* ── Mode toggle (only meaningful with 2+ keys) ── */}
        {!single && (
          <div className="px-7 pt-5 shrink-0">
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
              <button type="button" onClick={switchToUniform}
                className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all ${!perDay ? "bg-white text-violet-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                Même horaire pour tous
              </button>
              <button type="button" onClick={switchToPerDay}
                className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all ${perDay ? "bg-white text-violet-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                Horaire par {mode === "specific" ? "date" : "jour"}
              </button>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5">

          {/* UNIFORM MODE */}
          {!perDay && (
            <>
              <p className="text-xs text-slate-400 font-medium capitalize">
                {single ? (
                  <>Horaire pour <strong className="text-slate-700">{keyLabel(keys[0], mode)}</strong></>
                ) : (
                  <>Cet horaire s&apos;applique à <strong className="text-slate-700">
                    {mode === "specific"
                      ? `toutes les dates sélectionnées`
                      : `tous les jours (${keys.map((k) => FR_DAYS[Number(k)]).join(", ")})`}
                  </strong></>
                )}
              </p>

              <div className="grid grid-cols-[1fr_48px_1fr] items-end gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Début</label>
                  <input type="time" value={uStart}
                    onChange={(e) => setUStart(e.target.value)}
                    className={`w-full px-5 py-4 text-xl font-bold text-violet-800 border-2 rounded-2xl focus:outline-none focus:ring-2 ${uniformBad.has(0) ? "bg-red-50 border-red-300 focus:ring-red-400 focus:border-red-400" : "bg-violet-50 border-violet-200 focus:ring-violet-400 focus:border-violet-400"}`} />
                </div>
                <div className="pb-4 text-center text-2xl text-slate-300 font-light">→</div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fin</label>
                  <input type="time" value={uEnd}
                    onChange={(e) => setUEnd(e.target.value)}
                    className={`w-full px-5 py-4 text-xl font-bold text-violet-800 border-2 rounded-2xl focus:outline-none focus:ring-2 ${uniformBad.has(0) ? "bg-red-50 border-red-300 focus:ring-red-400 focus:border-red-400" : "bg-violet-50 border-violet-200 focus:ring-violet-400 focus:border-violet-400"}`} />
                </div>
              </div>
              <input type="text" placeholder="Nom de cette plage (ex : Randonnée du matin)" value={uLabel}
                onChange={(e) => setULabel(e.target.value)}
                className="w-full -mt-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white placeholder:text-slate-400" />

              {/* Extra windows */}
              {uExtra.map((w, i) => (
                <div key={i} className="space-y-2">
                  <div className="grid grid-cols-[1fr_48px_1fr_40px] items-end gap-4">
                    <input type="time" value={w.start}
                      onChange={(e) => { const u = [...uExtra]; u[i]={...u[i],start:e.target.value}; setUExtra(u); }}
                      className={`w-full px-5 py-4 text-xl font-bold text-violet-800 border-2 rounded-2xl focus:outline-none focus:ring-2 ${uniformBad.has(i+1) ? "bg-red-50 border-red-300 focus:ring-red-400" : "bg-violet-50 border-violet-200 focus:ring-violet-400"}`} />
                    <div className="pb-4 text-center text-2xl text-slate-300 font-light">→</div>
                    <input type="time" value={w.end}
                      onChange={(e) => { const u = [...uExtra]; u[i]={...u[i],end:e.target.value}; setUExtra(u); }}
                      className={`w-full px-5 py-4 text-xl font-bold text-violet-800 border-2 rounded-2xl focus:outline-none focus:ring-2 ${uniformBad.has(i+1) ? "bg-red-50 border-red-300 focus:ring-red-400" : "bg-violet-50 border-violet-200 focus:ring-violet-400"}`} />
                    <button type="button" onClick={() => setUExtra((p) => p.filter((_,j) => j!==i))}
                      className="w-10 h-10 mb-0.5 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors self-center">
                      <X size={15} />
                    </button>
                  </div>
                  <input type="text" placeholder="Nom de cette plage (ex : Visite du soir)" value={w.label ?? ""}
                    onChange={(e) => { const u = [...uExtra]; u[i] = { ...u[i], label: e.target.value }; setUExtra(u); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white placeholder:text-slate-400" />
                </div>
              ))}

              {uniformBad.size > 0 && (
                <p className="flex items-start gap-1.5 text-xs font-bold text-red-500 -mt-2">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  Ces plages horaires se chevauchent ou empiètent sur un créneau existant.
                </p>
              )}

              {allBlockedAcrossKeys.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-semibold">Déjà pris :</span>
                  {allBlockedAcrossKeys.map((w, i) => (
                    <span key={i} className="font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                      {w.start.replace(":","h")}–{w.end.replace(":","h")}
                    </span>
                  ))}
                </div>
              )}

              <button type="button" onClick={() => {
                const h = parseInt(uEnd.split(":")[0]);
                setUExtra([...uExtra, { start: `${String(Math.min(h+1,22)).padStart(2,"0")}:00`, end: `${String(Math.min(h+3,23)).padStart(2,"0")}:00` }]);
              }}
                className="flex items-center gap-2 text-sm font-bold text-violet-400 hover:text-violet-600 transition-colors py-1">
                <Plus size={16} className="bg-violet-100 rounded-lg p-0.5" />
                Ajouter une coupure (ex : pause midi)
              </button>
            </>
          )}

          {/* PER-DAY MODE */}
          {perDay && (
            <>
              {/* Day/date chips */}
              <div className="flex flex-wrap gap-2">
                {keys.map((k) => {
                  const isActive = activeKey === k;
                  const wins = perDayData[k] ?? [];
                  const dayBad = badIndices(wins, blockedWindowsForKey(k, existingSlots)).size > 0;
                  return (
                    <button key={k} type="button" onClick={() => setActiveKey(k)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-extrabold transition-all ${isActive ? "bg-violet-500 border-violet-500 text-white shadow-md" : dayBad ? "border-red-300 text-red-600 bg-red-50 hover:bg-red-100" : "border-violet-200 text-violet-600 bg-violet-50 hover:bg-violet-100"}`}>
                      <span>{keyLabel(k, mode, true)}</span>
                      {wins.length > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : dayBad ? "bg-red-200 text-red-700" : "bg-violet-200 text-violet-700"}`}>
                          {wins.map((w) => `${w.start.slice(0,5)}–${w.end.slice(0,5)}`).join(" · ")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active day editor */}
              {activeKey && (
                <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-6 space-y-4">
                  <p className="text-base font-extrabold text-violet-800 capitalize">
                    {keyLabel(activeKey, mode)}
                  </p>

                  {activeWins.map((w, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="grid grid-cols-[1fr_48px_1fr_40px] items-end gap-4">
                        <div>
                          {idx === 0 && <label className="text-[11px] font-black text-violet-400 uppercase tracking-widest block mb-2">Début</label>}
                          <input type="time" value={w.start}
                            onChange={(e) => updatePerDay(activeKey, idx, "start", e.target.value)}
                            className={`w-full px-5 py-4 text-xl font-bold text-violet-800 bg-white border-2 rounded-2xl focus:outline-none focus:ring-2 ${activeBad.has(idx) ? "border-red-300 focus:ring-red-400" : "border-violet-200 focus:ring-violet-400"}`} />
                        </div>
                        <div className={`text-center text-2xl text-slate-300 font-light ${idx === 0 ? "pt-7" : ""}`}>→</div>
                        <div>
                          {idx === 0 && <label className="text-[11px] font-black text-violet-400 uppercase tracking-widest block mb-2">Fin</label>}
                          <input type="time" value={w.end}
                            onChange={(e) => updatePerDay(activeKey, idx, "end", e.target.value)}
                            className={`w-full px-5 py-4 text-xl font-bold text-violet-800 bg-white border-2 rounded-2xl focus:outline-none focus:ring-2 ${activeBad.has(idx) ? "border-red-300 focus:ring-red-400" : "border-violet-200 focus:ring-violet-400"}`} />
                        </div>
                        {activeWins.length > 1 && (
                          <button type="button" onClick={() => removePerDayWindow(activeKey, idx)}
                            className={`w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors ${idx === 0 ? "mt-7" : ""}`}>
                            <X size={15} />
                          </button>
                        )}
                      </div>
                      <input type="text" placeholder="Nom de cette plage (ex : Randonnée du matin)" value={w.label ?? ""}
                        onChange={(e) => updatePerDay(activeKey, idx, "label", e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-violet-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-300 placeholder:text-slate-400" />
                    </div>
                  ))}

                  {activeBad.size > 0 && (
                    <p className="flex items-start gap-1.5 text-xs font-bold text-red-500">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      Ces plages horaires se chevauchent ou empiètent sur un créneau existant.
                    </p>
                  )}

                  {activeBlocked.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-violet-400 font-semibold">Déjà pris ce jour-là :</span>
                      {activeBlocked.map((w, i) => (
                        <span key={i} className="font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          {w.start.replace(":","h")}–{w.end.replace(":","h")}
                        </span>
                      ))}
                    </div>
                  )}

                  <button type="button" onClick={() => addPerDayWindow(activeKey)}
                    className="flex items-center gap-2 text-sm font-bold text-violet-500 hover:text-violet-700 transition-colors">
                    <Plus size={16} className="bg-violet-200 rounded-lg p-0.5" />
                    Ajouter une plage horaire
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 px-7 pb-7 pt-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-3.5 border-2 border-slate-200 rounded-2xl text-sm font-extrabold text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button type="button" onClick={handleSave} disabled={!isValid}
            className="flex-2 flex-grow-[2] py-3.5 bg-violet-500 hover:bg-violet-600 disabled:bg-slate-200 disabled:cursor-not-allowed disabled:hover:bg-slate-200 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]">
            <Check size={16} />
            Enregistrer les horaires
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
