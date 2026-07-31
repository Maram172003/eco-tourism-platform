type TimeWindow = { start: string; end: string };
type TimeSlots = Record<string, TimeWindow[]>;

export type SlotLike = {
  type: string;
  dates?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  days_of_week?: string[] | null;
  time_slots?: TimeSlots | null;
};

function toFrIdx(d: Date): string {
  return String((d.getDay() + 6) % 7);
}
function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

function windowsForDay(slot: SlotLike, day: Date): TimeWindow[] | null {
  if (!slot.time_slots) return null;
  const ds = dateStr(day);
  const wday = toFrIdx(day);
  return (slot.time_slots as TimeSlots)[ds] ?? (slot.time_slots as TimeSlots)[wday] ?? null;
}

function timeWindowsOverlap(a: TimeWindow[], b: TimeWindow[]): boolean {
  for (const wa of a) {
    const as = toMin(wa.start), ae = toMin(wa.end);
    for (const wb of b) {
      if (as < toMin(wb.end) && toMin(wb.start) < ae) return true;
    }
  }
  return false;
}

function slotCoversDay(slot: SlotLike, day: Date): boolean {
  const ds = dateStr(day);
  if (slot.type === 'specific') return !!slot.dates?.includes(ds);
  const wday = toFrIdx(day);
  if (slot.type === 'range' && slot.start_date && slot.end_date) {
    if (ds < slot.start_date || ds > slot.end_date) return false;
    return !slot.days_of_week?.length || slot.days_of_week.includes(wday);
  }
  if (slot.type === 'recurring' && slot.days_of_week?.includes(wday)) {
    if (slot.start_date && ds < slot.start_date) return false;
    if (slot.end_date && ds > slot.end_date) return false;
    return true;
  }
  return false;
}

/** Returns overlapping dates between two slots, taking time windows into account. */
export function overlappingDays(a: SlotLike, b: SlotLike): string[] {
  const ref = new Date();
  ref.setHours(0, 0, 0, 0);
  const conflicts: string[] = [];
  for (let i = 0; i < 365; i++) {
    const d = new Date(ref);
    d.setDate(ref.getDate() + i);
    if (!slotCoversDay(a, d) || !slotCoversDay(b, d)) continue;
    const wa = windowsForDay(a, d);
    const wb = windowsForDay(b, d);
    // Both have explicit hours → only conflict if hours actually overlap
    if (wa && wa.length && wb && wb.length) {
      if (!timeWindowsOverlap(wa, wb)) continue;
    }
    // One or both are "whole day" → conflict
    conflicts.push(dateStr(d));
    if (conflicts.length >= 5) break;
  }
  return conflicts;
}

/** True if two disponibilite objects are identical (ignores label) */
export function dispoEqual(a: SlotLike | undefined, b: SlotLike | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (JSON.stringify([...(a.dates ?? [])].sort()) !== JSON.stringify([...(b.dates ?? [])].sort())) return false;
  if ((a.start_date ?? null) !== (b.start_date ?? null)) return false;
  if ((a.end_date ?? null) !== (b.end_date ?? null)) return false;
  if (JSON.stringify([...(a.days_of_week ?? [])].sort()) !== JSON.stringify([...(b.days_of_week ?? [])].sort())) return false;
  // Comparer time_slots — null et {} sont équivalents (pas d'horaires explicites)
  const ats = (a as any).time_slots ?? null;
  const bts = (b as any).time_slots ?? null;
  const atsNorm = (ats && Object.keys(ats).length > 0) ? JSON.stringify(ats) : null;
  const btsNorm = (bts && Object.keys(bts).length > 0) ? JSON.stringify(bts) : null;
  if (atsNorm !== btsNorm) return false;
  return true;
}

/** Converts a disponibilite.type ('season'|...) to a slot type ('range'|...) */
export function toSlotType(dispoType: string): string {
  return dispoType === 'season' ? 'range' : dispoType;
}
