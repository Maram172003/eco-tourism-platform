export interface BookableOption {
  key: string;
  label: string;
  price_per_person: number;
  type: "etape" | "hebergement";
  required: boolean;
  jour?: number;
}

export interface CircuitBooking {
  id: string;
  title: string;
  description?: string | null;
  cover_image?: string | null;
  nb_jours: number;
  circuit_mode?: string | null;
  bookable_options?: BookableOption[] | null;
  price?: number | null;
  price_display_from?: number | null;
  capacity?: number | null;
  max_group_size?: number | null;
  min_group_size?: number | null;
  confirmation_mode?: string | null;
  deposit_percentage?: number | null;
  cancellation_policy?: string | null;
  availability?: {
    type?: string | null;
    dates?: string[] | null;
    start_date?: string | null;
    end_date?: string | null;
    days_of_week?: string[] | null;
  } | null;
}

export type CircuitDateMode =
  | { kind: "fixed"; date: string }
  | { kind: "pick_list"; dates: string[] }
  | { kind: "pick_range"; start: string; end: string; days_of_week?: string[] }
  | { kind: "none" };

function toYmd(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

export function isPackageCircuit(circuit: CircuitBooking | null | undefined): boolean {
  if (!circuit) return false;
  return circuit.circuit_mode === "package" || circuit.circuit_mode === "single";
}

export function hasSelectableCircuitFormulas(circuit: CircuitBooking | null | undefined): boolean {
  if (!circuit) return false;
  return circuit.circuit_mode === "variant" && (circuit.bookable_options?.length ?? 0) > 0;
}

export function defaultPackageOptions(circuit: CircuitBooking): string[] {
  return (circuit.bookable_options ?? []).map((o) => o.key).sort();
}

export function getCircuitBookingUnitPrice(
  circuit: CircuitBooking,
  chosenKeys: string[],
): number | null {
  const options = circuit.bookable_options ?? [];
  if (!options.length) return circuit.price != null ? Number(circuit.price) : null;
  if (!chosenKeys.length) return null;
  const map = Object.fromEntries(options.map((o) => [o.key, o.price_per_person]));
  let sum = 0;
  let has = false;
  for (const key of chosenKeys) {
    const p = map[key];
    if (p !== undefined) {
      sum += p;
      has = true;
    }
  }
  return has ? Math.round(sum * 100) / 100 : null;
}

export function formatCircuitCapacityLabel(circuit: CircuitBooking): string | null {
  const cap = circuit.capacity ?? circuit.max_group_size;
  if (cap == null) return null;
  if (circuit.max_group_size != null && circuit.capacity != null && circuit.max_group_size < circuit.capacity) {
    return `Jusqu'à ${circuit.max_group_size} pers. / départ (${circuit.capacity} places max.)`;
  }
  return `Jusqu'à ${cap} participant${cap > 1 ? "s" : ""}`;
}

export function resolveCircuitDateMode(circuit: CircuitBooking): CircuitDateMode {
  const dispo = circuit.availability;
  const dates = (dispo?.dates ?? []).map((d) => toYmd(d)).filter((d): d is string => !!d);
  const start = toYmd(dispo?.start_date);
  const end = toYmd(dispo?.end_date) ?? start;

  if (dispo?.type === "specific" || dates.length > 0) {
    const list = dates.length ? dates : start ? [start] : [];
    if (!list.length) return { kind: "none" };
    if (list.length === 1) return { kind: "fixed", date: list[0] };
    return { kind: "pick_list", dates: list };
  }

  if (dispo?.type === "recurring" && start && end) {
    return {
      kind: "pick_range",
      start,
      end,
      days_of_week: (dispo.days_of_week ?? []).map(String),
    };
  }

  if ((dispo?.type === "range" || dispo?.type === "season") && start && end) {
    if (start === end) return { kind: "fixed", date: start };
    return { kind: "pick_range", start, end };
  }

  if (start && end && start === end) return { kind: "fixed", date: start };
  if (start && end) return { kind: "pick_range", start, end };
  if (start) return { kind: "fixed", date: start };
  return { kind: "none" };
}

export function parseCircuitSubtypesParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
