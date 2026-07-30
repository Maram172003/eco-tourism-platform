import { eachDayOfInterval, parseISO, getDay, startOfDay, isAfter } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotType = "specific" | "range" | "recurring";

export interface TimeWindow { start: string; end: string; label?: string; }
// clé = date ISO (specific, ou recurring/range une fois borné) pour un horaire précis à cette date,
// sinon indice jour "0"…"6" pour un horaire par jour de semaine
export type TimeSlots = Record<string, TimeWindow[]>;

export interface AvailabilitySlot {
  id: string;
  type: SlotType;
  dates?: string[] | null;        // specific: array of ISO date strings
  start_date?: string | null;     // range/recurring start
  end_date?: string | null;       // range/recurring end
  days_of_week?: string[] | null; // "0"=Lun … "6"=Dim (French week)
  label?: string | null;
  time_slots?: TimeSlots | null;  // horaires par jour/jour-de-semaine ; absent pour un jour donné = journée entière
  created_at?: string;
}

export interface DayConstraint {
  isFullyBlocked: boolean;       // whole day already taken
  blockedWindows: TimeWindow[];  // hours already taken
  availableWindows: TimeWindow[]; // hours still free
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const FR_DAYS   = ["Lu","Ma","Me","Je","Ve","Sa","Di"] as const;
export const FR_DAYS_FULL = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"] as const;
export const FR_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"] as const;

export const SLOT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  specific:  { bg:"bg-emerald-100", text:"text-emerald-800", border:"border-emerald-200", dot:"bg-emerald-500"  },
  range:     { bg:"bg-blue-100",    text:"text-blue-800",    border:"border-blue-200",    dot:"bg-blue-500"     },
  recurring: { bg:"bg-amber-100",   text:"text-amber-800",   border:"border-amber-200",   dot:"bg-amber-500"    },
  season:    { bg:"bg-teal-100",    text:"text-teal-800",    border:"border-teal-200",    dot:"bg-teal-500"     },
};

export const SLOT_TYPE_LABELS: Record<string, string> = {
  specific: "Date unique", range: "Plage", recurring: "Récurrent", season: "Saison",
};

const PRIORITY: Record<SlotType, number> = { specific: 3, range: 2, recurring: 1 };

// ─── Basic helpers ──────────────────────────────────────────────────────────────

/** Convert JS Date to French weekday index string (0=Mon, 6=Sun) */
export function toFrIdx(d: Date): string {
  return String((getDay(d) + 6) % 7);
}

export function dateStr(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${dy}`;
}

export function isSeason(slot: AvailabilitySlot): boolean {
  return slot.type === "range" && (slot.label?.endsWith("(saison)") ?? false);
}

export function displayType(slot: AvailabilitySlot): string {
  return isSeason(slot) ? "season" : slot.type;
}

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const toTime = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** "9h00–17h00" or "9h00-12h00 (Randonnée) · 14h00-18h00 (Visite)" */
export function formatTimeWindows(windows: TimeWindow[]): string {
  return windows
    .map((w) => `${w.start.replace(":","h")}–${w.end.replace(":","h")}${w.label ? ` (${w.label})` : ""}`)
    .join(" · ");
}

/** Hours a slot has on a given day: exact date key first, then weekday key. null = no hours set (whole day) */
export function windowsForDay(slot: AvailabilitySlot, day: Date): TimeWindow[] | null {
  if (!slot.time_slots) return null;
  const ds   = dateStr(day);
  const wday = toFrIdx(day);
  return slot.time_slots[ds] ?? slot.time_slots[wday] ?? null;
}

// ─── Day coverage ─────────────────────────────────────────────────────────────

/** Does this slot cover the given calendar day? (fast, no date-range expansion) */
export function slotCoversDay(slot: AvailabilitySlot, day: Date): boolean {
  const ds = dateStr(day);
  if (slot.type === "specific") return !!slot.dates?.includes(ds);

  const wday = toFrIdx(day);
  if (slot.type === "range" && slot.start_date && slot.end_date) {
    if (ds < slot.start_date || ds > slot.end_date) return false;
    return !slot.days_of_week?.length || slot.days_of_week.includes(wday);
  }
  if (slot.type === "recurring" && slot.days_of_week?.includes(wday)) {
    if (slot.start_date && ds < slot.start_date) return false;
    if (slot.end_date   && ds > slot.end_date)   return false;
    return true;
  }
  return false;
}

/** Get all days covered by a slot (expands the whole range/recurring pattern) */
export function getDaysOfSlot(
  slot: AvailabilitySlot,
  year = new Date().getFullYear()
): Date[] {
  if (slot.type === "specific") {
    return (slot.dates ?? []).map((d) => parseISO(d));
  }

  if (slot.type === "range" && slot.start_date && slot.end_date) {
    const s = parseISO(slot.start_date);
    const e = parseISO(slot.end_date);
    if (isAfter(s, e)) return [];
    const all = eachDayOfInterval({ start: s, end: e });
    if (!slot.days_of_week?.length) return all;
    return all.filter((d) => slot.days_of_week!.includes(toFrIdx(d)));
  }

  if (slot.type === "recurring" && slot.days_of_week?.length) {
    const from = slot.start_date ? parseISO(slot.start_date) : new Date(year, 0, 1);
    const to   = slot.end_date   ? parseISO(slot.end_date)   : new Date(year, 11, 31);
    if (isAfter(from, to)) return [];
    return eachDayOfInterval({ start: from, end: to })
      .filter((d) => slot.days_of_week!.includes(toFrIdx(d)));
  }

  return [];
}

/** Return the first slot covering a given day */
export function isDayCovered(day: Date, slots: AvailabilitySlot[]): AvailabilitySlot | null {
  const d = startOfDay(day);
  return slots.find((s) => slotCoversDay(s, d)) ?? null;
}

/** Return the highest-priority slot covering a day (specific > range > recurring) */
export function getDominantSlot(day: Date, slots: AvailabilitySlot[]): AvailabilitySlot | null {
  const d = startOfDay(day);
  let best: AvailabilitySlot | null = null;
  let bestP = -1;
  for (const s of slots) {
    if (slotCoversDay(s, d) && PRIORITY[s.type] > bestP) { best = s; bestP = PRIORITY[s.type]; }
  }
  return best;
}

/** Format a slot into a human-readable summary */
export function formatSlotSummary(slot: AvailabilitySlot): string {
  if (slot.type === "specific" && slot.dates) {
    const sorted = [...slot.dates].sort();
    const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    if (sorted.length === 1) return fmt(sorted[0]);
    if (sorted.length <= 3)  return sorted.map(fmt).join(", ");
    return `${sorted.slice(0,2).map(fmt).join(", ")} +${sorted.length - 2} autres`;
  }
  if (slot.type === "range" && slot.start_date && slot.end_date) {
    const [a,b] = slot.start_date <= slot.end_date ? [slot.start_date, slot.end_date] : [slot.end_date, slot.start_date];
    const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    const days = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
    return `Du ${fmt(a)} au ${fmt(b)} · ${days} j`;
  }
  if (slot.type === "recurring" && slot.days_of_week) {
    return "Chaque " + slot.days_of_week.map((d) => FR_DAYS_FULL[Number(d)] ?? d).join(", ");
  }
  return "—";
}

// ─── Block-at-source constraints ───────────────────────────────────────────────
// Nothing conflicts anymore: an already-taken day/hour simply can't be selected.

/** What's free/taken on a given day, aggregated across every existing slot covering it */
export function getDayConstraints(day: Date, existingSlots: AvailabilitySlot[]): DayConstraint {
  const covering = existingSlots.filter((s) => slotCoversDay(s, day));

  if (!covering.length) {
    return { isFullyBlocked: false, blockedWindows: [], availableWindows: [{ start: "00:00", end: "23:59" }] };
  }

  // A covering slot with no hours set for THIS day = "whole day" and absorbs everything
  const dayWindows = covering.map((s) => windowsForDay(s, day));
  const hasFullDay = dayWindows.some((w) => !w || !w.length);
  if (hasFullDay) {
    return { isFullyBlocked: true, blockedWindows: [{ start: "00:00", end: "23:59" }], availableWindows: [] };
  }

  const blockedWindows = dayWindows
    .flatMap((w) => w as TimeWindow[])
    .sort((a, b) => toMin(a.start) - toMin(b.start));

  const availableWindows: TimeWindow[] = [];
  let cursor = 0;
  for (const blocked of blockedWindows) {
    const bStart = toMin(blocked.start);
    const bEnd   = toMin(blocked.end);
    if (cursor < bStart) availableWindows.push({ start: toTime(cursor), end: blocked.start });
    cursor = Math.max(cursor, bEnd);
  }
  if (cursor < 23 * 60 + 59) availableWindows.push({ start: toTime(cursor), end: "23:59" });

  return { isFullyBlocked: false, blockedWindows, availableWindows };
}

/** Can this day take at least one more slot (any hours)? */
export function isDateSelectable(day: Date, existingSlots: AvailabilitySlot[]): boolean {
  return !getDayConstraints(day, existingSlots).isFullyBlocked;
}

/** Is this exact hour range free on this day? */
export function isTimeRangeAvailable(
  day: Date, requestStart: string, requestEnd: string, existingSlots: AvailabilitySlot[]
): boolean {
  const { isFullyBlocked, blockedWindows } = getDayConstraints(day, existingSlots);
  if (isFullyBlocked) return false;
  const rs = toMin(requestStart), re = toMin(requestEnd);
  return !blockedWindows.some((b) => rs < toMin(b.end) && toMin(b.start) < re);
}

/** Every fully-blocked day of a given month */
export function getBlockedDaysOfMonth(year: number, month: number, existingSlots: AvailabilitySlot[]): Date[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blocked: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i);
    if (!isDateSelectable(day, existingSlots)) blocked.push(day);
  }
  return blocked;
}

/** Last selectable end-date for a range starting at startDate (the eve of the first fully-blocked day after it), or null if none within a year */
export function getMaxEndDate(startDate: Date, existingSlots: AvailabilitySlot[]): Date | null {
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1);
  for (let i = 0; i < 365; i++) {
    if (!isDateSelectable(current, existingSlots)) {
      const maxEnd = new Date(current);
      maxEnd.setDate(maxEnd.getDate() - 1);
      return maxEnd;
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}

/** Validate every day a candidate slot would cover against existing slots. Empty array = fully valid. */
export function findInvalidDays(
  candidate: Omit<AvailabilitySlot, "id">, existingSlots: AvailabilitySlot[]
): Date[] {
  const candidateWithId = { ...candidate, id: "__new__" } as AvailabilitySlot;
  const days = getDaysOfSlot(candidateWithId);
  return days.filter((d) => {
    const windows = windowsForDay(candidateWithId, d);
    if (!windows || !windows.length) {
      // journée entière : en conflit avec tout créneau existant sur ce jour
      return existingSlots.some((s) => slotCoversDay(s, d));
    }
    return windows.some((w) => !isTimeRangeAvailable(d, w.start, w.end, existingSlots));
  });
}
