"use client";

import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isToday, isPast, startOfDay, startOfWeek, endOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Trash2, X, Clock, Ban } from "lucide-react";
import {
  getDominantSlot, toFrIdx, dateStr, SLOT_COLORS, SLOT_TYPE_LABELS,
  displayType, formatSlotSummary, windowsForDay, getDayConstraints, FR_DAYS,
  type AvailabilitySlot, type DayConstraint,
} from "@/lib/availabilityConflicts";

type ConflictInfo = { offer: string; section: string; conflictSlotLabel: string; days: string[] };

const SECTION_LABEL: Record<string, string> = {
  hebergement: "Hébergement", restauration: "Restauration",
  transport: "Transport", guide: "Guidage", autre: "Autre",
};

interface Props {
  currentDate: Date;
  slots: AvailabilitySlot[];
  activeMode: string;
  selectedDates: string[];
  rangeA: string;
  rangeB: string;
  recurDays: string[];
  recurMonths: number[];
  recurFrom: string;
  recurTo: string;
  conflictNotifs?: ConflictInfo[];
  onDayClick: (day: Date) => void;
  onDeleteSlot: (id: string) => Promise<void>;
  onCollabLeave?: (slotLabel: string) => void;
}

/** Is this day within the recurring pattern's currently configured bounds (months, or from/to)? Unbounded = always true. */
function withinRecurBounds(ds: string, month: number, recurMonths: number[], recurFrom: string, recurTo: string): boolean {
  if (recurMonths.length) return recurMonths.includes(month);
  if (recurFrom && ds < recurFrom) return false;
  if (recurTo && ds > recurTo) return false;
  return true;
}

const ICONS: Record<string, string> = {
  specific: "event", range: "date_range", recurring: "autorenew", season: "sunny",
};

const DAY_MIN = 23 * 60 + 59;
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** % of the day already taken, across all blocked windows */
function blockedPercent(constraints: DayConstraint): number {
  const blockedMin = constraints.blockedWindows.reduce((sum, w) => sum + (toMin(w.end) - toMin(w.start)), 0);
  return Math.min(100, Math.round((blockedMin / DAY_MIN) * 100));
}

export default function CalendarMonthView({
  currentDate, slots, activeMode, selectedDates, rangeA, rangeB, recurDays,
  recurMonths, recurFrom, recurTo, conflictNotifs = [],
  onDayClick, onDeleteSlot, onCollabLeave,
}: Props) {
  const [popup, setPopup] = useState<{ date: Date; slots: AvailabilitySlot[] } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Build calendar days (6 weeks)
  const calStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const calEnd   = endOfWeek(endOfMonth(currentDate),     { weekStartsOn: 1 });
  const calDays  = eachDayOfInterval({ start: calStart, end: calEnd });

  function getAllSlotsForDay(day: Date): AvailabilitySlot[] {
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

  function handleClick(day: Date) {
    if (isPast(startOfDay(day)) && !isToday(day)) return;

    const daySlots = getAllSlotsForDay(day);

    // Mode navigation (pas de création) : toujours afficher le popup si des créneaux existent
    if (!activeMode) {
      if (daySlots.length > 0) {
        setPopup({ date: day, slots: daySlots });
      } else {
        onDayClick(day);
      }
      return;
    }

    // Mode création : bloquer si le jour est entièrement pris
    const constraints = getDayConstraints(day, slots);
    if (constraints.isFullyBlocked) return;
    onDayClick(day);
  }

  /** Returns the day cell's className, plus a 0-100 fill % when it should show the red conic-gradient "filling up" overlay */
  function dayClass(day: Date): { cls: string; fillPct: number | null } {
    const ds    = dateStr(day);
    const wday  = toFrIdx(day);
    const past  = isPast(startOfDay(day)) && !isToday(day);
    const today = isToday(day);
    const inM   = isSameMonth(day, currentDate);

    let base = "relative w-full aspect-square rounded-xl text-xs font-bold flex flex-col items-center justify-center select-none transition-all ";
    if (!inM) base += "opacity-30 ";

    if (past) { base += "text-slate-300 cursor-default "; return { cls: base.trim(), fillPct: null }; }

    const constraints = getDayConstraints(day, slots);
    if (constraints.isFullyBlocked) {
      return { cls: (base + "bg-slate-100 text-slate-400 line-through cursor-not-allowed").trim(), fillPct: null };
    }
    base += "cursor-pointer ";

    // Edit-mode previews (highest priority) — these override the fill overlay while active
    if (activeMode === "specific" && selectedDates.includes(ds)) {
      return { cls: (base + "bg-emerald-500 text-white").trim(), fillPct: null };
    }
    if (activeMode === "range") {
      const a = rangeA && rangeB ? (rangeA <= rangeB ? rangeA : rangeB) : rangeA;
      const b = rangeA && rangeB ? (rangeA <= rangeB ? rangeB : rangeA) : "";
      if (ds === a || ds === b) return { cls: (base + "bg-blue-500 text-white").trim(), fillPct: null };
      if (a && b && ds > a && ds < b) return { cls: (base + "bg-blue-100 text-blue-700").trim(), fillPct: null };
    }
    if (activeMode === "recurring" && recurDays.includes(wday) && withinRecurBounds(ds, day.getMonth(), recurMonths, recurFrom, recurTo)) {
      return { cls: (base + "bg-amber-200 text-amber-900").trim(), fillPct: null };
    }

    const ring = today ? " ring-2 ring-primary ring-offset-1" : "";

    // Partially taken: no flat bg class here — a conic-gradient fill is applied inline instead
    if (constraints.blockedWindows.length > 0) {
      return { cls: (base + `text-slate-700${ring}`).trim(), fillPct: blockedPercent(constraints) };
    }

    // Saved slot color (fully free day covered by a slot)
    const dom = getDominantSlot(day, slots);
    if (dom) {
      const c = SLOT_COLORS[displayType(dom)];
      return { cls: (base + `${c.bg} ${c.text}${ring}`).trim(), fillPct: null };
    }

    return { cls: (base + `hover:bg-emerald-50 text-slate-600${ring}`).trim(), fillPct: null };
  }

  async function deleteFromPopup(id: string) {
    setDeleting(id);
    await onDeleteSlot(id);
    setDeleting(null);
    setPopup((p) => p ? { ...p, slots: p.slots.filter((s) => s.id !== id) } : null);
  }

  // Ensemble des jours ayant un conflit (pour les indicateurs sur les cellules)
  const conflictDaySet = new Set(conflictNotifs.flatMap((cn) => cn.days));

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
        {/* En-têtes */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
          {FR_DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-extrabold text-slate-400 uppercase py-3 tracking-wider">{d}</div>
          ))}
        </div>

        {/* Grille */}
        <div className="grid grid-cols-7 gap-0.5 p-2">
          {calDays.map((day) => {
            const past       = isPast(startOfDay(day)) && !isToday(day);
            const daySlots   = getAllSlotsForDay(day);
            const constraints = past ? null : getDayConstraints(day, slots);
            const { cls, fillPct } = dayClass(day);
            const ds = dateStr(startOfDay(day));
            const hasConflict = !past && conflictDaySet.has(ds) && daySlots.length > 0;
            return (
              <button key={day.toISOString()} type="button"
                onClick={() => handleClick(day)}
                disabled={past || (!!activeMode && !!constraints?.isFullyBlocked)}
                title={!past && daySlots[0]?.label ? daySlots[0].label : undefined}
                className={cls}
                style={fillPct !== null ? { background: `conic-gradient(#f87171 0% ${fillPct}%, #a7f3d0 ${fillPct}% 100%)` } : undefined}>
                <span className="leading-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">{format(day, "d")}</span>
                {hasConflict && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white font-black ring-1 ring-white" style={{ fontSize: 9 }}>!</span>
                )}
                {constraints?.isFullyBlocked && !past && (
                  <Ban size={10} className="absolute top-1 right-1 text-slate-300" />
                )}
                {daySlots.length > 0 && !past && fillPct === null && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {daySlots.slice(0,3).map((s, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${SLOT_COLORS[displayType(s)]?.dot}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Légende */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-3">
          {(["specific","range","recurring","season"] as const).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${SLOT_COLORS[t].dot}`} />
              <span className="text-[10px] font-bold text-slate-400">{SLOT_TYPE_LABELS[t]}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0"
              style={{ background: "conic-gradient(#f87171 0% 40%, #a7f3d0 40% 100%)" }} />
            <span className="text-[10px] font-bold text-slate-400">Se remplit en rouge à mesure que le jour se prend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Ban size={11} className="text-slate-300" />
            <span className="text-[10px] font-bold text-slate-400">Journée complète</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-white font-black ring-1 ring-white shrink-0" style={{ fontSize: 9 }}>!</span>
            <span className="text-[10px] font-bold text-slate-400">Conflit d'agenda détecté</span>
          </div>
        </div>
      </div>

      {/* Popup jour */}
      {popup && popup.slots.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setPopup(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest capitalize">
                  {format(popup.date, "EEEE", { locale: fr })}
                </p>
                <p className="text-xl font-extrabold text-slate-800">
                  {format(popup.date, "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
              <button type="button" onClick={() => setPopup(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-2">
              {popup.slots.map((s) => {
                const c = SLOT_COLORS[displayType(s)];
                const windows = windowsForDay(s, popup.date);
                const ds = dateStr(startOfDay(popup.date));
                const slotKey = s.label?.trim() || s.type;
                const conflict = conflictNotifs.find((cn) =>
                  cn.days.includes(ds) && cn.conflictSlotLabel === slotKey
                );
                const isCollabSlot = s.label?.startsWith("[Collab]");
                const isOfferSlot  = !isCollabSlot && s.label?.startsWith("[Offre]");
                const cleanLabel = isCollabSlot
                  ? s.label!.replace(/^\[Collab\]\s*/, "").replace(/\s*—\s*\w+$/, "").trim()
                  : isOfferSlot
                  ? s.label!.replace(/^\[Offre\]\s*/, "").trim()
                  : s.label;
                const collabSec = isCollabSlot
                  ? s.label!.match(/—\s*(\w+)$/)?.[1] ?? ""
                  : "";

                return (
                  <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    conflict       ? "bg-red-50 border-red-300"
                    : isCollabSlot ? "bg-emerald-50 border-emerald-200"
                    : isOfferSlot  ? "bg-violet-50 border-violet-200"
                    : `${c.bg} ${c.border}`
                  }`}>
                    {/* Icône */}
                    <span className={`material-symbols-outlined text-xl shrink-0 ${
                      conflict ? "text-red-500" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-600" : c.text
                    }`}>{isCollabSlot ? "handshake" : isOfferSlot ? "local_activity" : ICONS[displayType(s)]}</span>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      {/* Badge */}
                      {isCollabSlot ? (
                        <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mb-1">
                          Offre collaborative · {SECTION_LABEL[collabSec] ?? collabSec}
                        </span>
                      ) : isOfferSlot ? (
                        <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 mb-1">
                          Mon offre
                        </span>
                      ) : conflict ? (
                        <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600 mb-1">
                          Mon créneau · conflictuel
                        </span>
                      ) : (
                        <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mb-1 bg-white/60 ${c.text}`}>
                          {SLOT_TYPE_LABELS[displayType(s)]}
                        </span>
                      )}

                      {/* Label */}
                      {cleanLabel && (
                        <p className={`text-xs font-extrabold mb-0.5 truncate ${
                          conflict ? "text-red-700" : isCollabSlot ? "text-emerald-800" : isOfferSlot ? "text-violet-800" : c.text
                        }`}>{cleanLabel}</p>
                      )}

                      {/* Résumé / horaires */}
                      <p className={`text-xs opacity-70 ${conflict ? "text-red-600" : isCollabSlot ? "text-emerald-700" : isOfferSlot ? "text-violet-600" : c.text}`}>
                        {formatSlotSummary(s)}
                      </p>
                      {windows?.length ? (
                        <div className="mt-1 space-y-0.5">
                          {windows.map((w, i) => (
                            <div key={i} className={`flex items-center gap-1.5 text-xs font-bold ${
                              conflict ? "text-red-600" : isCollabSlot ? "text-emerald-700" : isOfferSlot ? "text-violet-700" : c.text
                            }`}>
                              <Clock size={10} className="shrink-0 opacity-60" />
                              {w.start.replace(":", "h")}–{w.end.replace(":", "h")}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={`flex items-center gap-1 text-xs font-medium mt-1 opacity-60 ${
                          conflict ? "text-red-500" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-500" : c.text
                        }`}>
                          <Clock size={10} className="shrink-0" />Toute la journée
                        </p>
                      )}

                      {/* Message conflit */}
                      {conflict && (
                        <p className="mt-1.5 text-[10px] text-red-600 font-semibold leading-tight">
                          ⚠ Chevauche <strong>{conflict.offer}</strong> ({SECTION_LABEL[conflict.section] ?? conflict.section}) — supprimez ce créneau pour maintenir la collaboration.
                        </p>
                      )}

                      {/* Info collab */}
                      {isCollabSlot && (
                        <p className="mt-1 text-[10px] text-emerald-600 font-medium">
                          Créneau réservé · offre collaborative
                        </p>
                      )}

                      {/* Info offre */}
                      {isOfferSlot && (
                        <p className="mt-1 text-[10px] text-violet-500 font-medium">
                          Créneau lié à votre offre
                        </p>
                      )}
                    </div>

                    {/* Bouton supprimer / quitter */}
                    <button type="button"
                      onClick={() => isCollabSlot ? (onCollabLeave?.(s.label!), setPopup(null)) : deleteFromPopup(s.id)}
                      disabled={deleting === s.id}
                      className="w-7 h-7 rounded-lg border border-current/20 flex items-center justify-center text-current/40 hover:text-red-600 hover:bg-white transition-all disabled:opacity-50 shrink-0">
                      {deleting === s.id
                        ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
