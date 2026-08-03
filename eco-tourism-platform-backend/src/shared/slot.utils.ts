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
  // For specific slots, check dates directly — avoids missing past or far-future dates
  if (a.type === 'specific') {
    const dates = a.dates ?? [];
    const conflicts: string[] = [];
    for (const d of dates) {
      const day = new Date(d + 'T12:00:00Z');
      if (!slotCoversDay(b, day)) continue;
      const wa = windowsForDay(a, day);
      const wb = windowsForDay(b, day);
      if (wa && wa.length && wb && wb.length && !timeWindowsOverlap(wa, wb)) continue;
      conflicts.push(d);
      if (conflicts.length >= 5) break;
    }
    return conflicts;
  }
  // For range/recurring/season slots, scan from the slot's own start date (or today)
  const startStr = a.type === 'range' || a.type === 'season' ? (a.start_date ?? null) : null;
  const ref = startStr ? new Date(startStr + 'T12:00:00Z') : new Date();
  ref.setHours(0, 0, 0, 0);
  const conflicts: string[] = [];
  for (let i = 0; i < 730; i++) {
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

export type EtapeForAvail = {
  jour: number;
  heure_debut?: string | null;
  heure_fin?: string | null;
};

/**
 * Dérive la disponibilité d'une étape à partir de la disponibilité du circuit.
 * - Pour chaque type de slot, décale les dates de `etape.jour - 1` jours.
 * - Pour jour = -1 (hébergement global), couvre toute la durée du circuit.
 * - Retourne null si le slot du circuit est vide ou non défini.
 */
export function deriveEtapeAvailFromCircuitAvail(
  circuitAvail: SlotLike,
  etape: EtapeForAvail,
  nbJours: number,
): SlotLike | null {
  if (!circuitAvail.type) return null;

  const isHeberg = etape.jour === -1;
  const offset = isHeberg ? 0 : etape.jour - 1;
  const hasHours = !isHeberg && !!etape.heure_debut && !!etape.heure_fin;

  function shiftDate(d: string, days: number): string {
    const dt = new Date(d + 'T12:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  }

  function buildTs(keys: string[]): Record<string, { start: string; end: string }[]> | null {
    if (!hasHours || !keys.length) return null;
    return keys.reduce<Record<string, { start: string; end: string }[]>>((acc, k) => {
      acc[k] = [{ start: etape.heure_debut!, end: etape.heure_fin! }];
      return acc;
    }, {});
  }

  function shiftDay(idx: string, off: number): string {
    return String(((Number(idx) + off) % 7 + 7) % 7);
  }

  switch (circuitAvail.type) {
    case 'specific': {
      const dates = circuitAvail.dates ?? [];
      if (!dates.length) return null;
      const sorted = [...dates].sort();

      // Détection "run unique consécutif" utilisée aussi pour l'hébergement
      const isExactCircuitDaysCheck =
        sorted.length === nbJours &&
        sorted.every((d, i) => {
          if (i === 0) return true;
          const prev = new Date(sorted[i - 1] + 'T12:00:00Z');
          const curr = new Date(d + 'T12:00:00Z');
          return curr.getTime() - prev.getTime() === 86_400_000;
        });

      if (isHeberg) {
        if (isExactCircuitDaysCheck) {
          // Un seul run : hébergement du premier au dernier jour du circuit
          return {
            type: 'range',
            start_date: sorted[0],
            end_date: sorted[sorted.length - 1],
            dates: null, days_of_week: null, time_slots: null,
          };
        }
        return {
          type: 'range',
          start_date: sorted[0],
          end_date: shiftDate(sorted[sorted.length - 1], nbJours - 1),
          dates: null, days_of_week: null, time_slots: null,
        };
      }

      // Si les dates sélectionnées sont exactement les jours consécutifs du circuit
      // (ex: [Nov 1, Nov 2] pour un circuit 2 jours) → un seul run : chaque date = un jour du circuit.
      // Sinon → chaque date = une date de départ d'un run distinct.
      if (isExactCircuitDaysCheck) {
        // Pour Jour N (offset = N-1) : prendre la Nième date du tableau
        const dayDate = sorted[offset];
        if (!dayDate) return null;
        return {
          type: 'specific',
          dates: [dayDate],
          time_slots: buildTs([dayDate]),
          start_date: null, end_date: null, days_of_week: null,
        };
      }

      // Cas général : dates = dates de départ de runs séparés, décalées par l'offset du jour
      const newDates = sorted.map((d) => shiftDate(d, offset));
      return {
        type: 'specific',
        dates: newDates,
        time_slots: buildTs(newDates),
        start_date: null, end_date: null, days_of_week: null,
      };
    }

    case 'range': {
      if (!circuitAvail.start_date || !circuitAvail.end_date) return null;
      const newStart = shiftDate(circuitAvail.start_date, offset);
      const newEnd = shiftDate(circuitAvail.end_date, offset);
      const srcDays = circuitAvail.days_of_week ?? [];
      const shiftedDays = srcDays.length ? srcDays.map((d) => shiftDay(d, offset % 7)) : null;
      const tsKeys = shiftedDays ?? ['0', '1', '2', '3', '4', '5', '6'];
      return {
        type: 'range',
        start_date: newStart,
        end_date: newEnd,
        days_of_week: shiftedDays,
        time_slots: buildTs(tsKeys),
        dates: null,
      };
    }

    case 'recurring': {
      const srcDays = circuitAvail.days_of_week ?? [];
      const shiftedDays = srcDays.map((d) => shiftDay(d, offset % 7));
      return {
        type: 'recurring',
        start_date: circuitAvail.start_date ?? null,
        end_date: circuitAvail.end_date ?? null,
        days_of_week: shiftedDays,
        time_slots: buildTs(shiftedDays),
        dates: null,
      };
    }

    case 'season': {
      if (!circuitAvail.start_date || !circuitAvail.end_date) return null;
      return {
        type: 'range',
        start_date: shiftDate(circuitAvail.start_date, offset),
        end_date: shiftDate(circuitAvail.end_date, offset),
        days_of_week: null, time_slots: null, dates: null,
      };
    }

    default:
      return null;
  }
}
