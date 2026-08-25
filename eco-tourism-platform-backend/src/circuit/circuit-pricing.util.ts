import { Circuit } from './entities/circuit.entity';
import { CircuitCollaboration } from './entities/circuit-collaboration.entity';

export interface BookableOption {
  key: string;
  label: string;
  price_per_person: number;
  type: 'etape' | 'hebergement';
  required: boolean;
  jour?: number;
}

export function sortOptionKeys(keys: string[]): string[] {
  return [...keys].sort();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) || n < 0 ? null : n;
}

function perPersonFromGroupe(prixGroupe: unknown, nbPers: unknown): number | null {
  const total = num(prixGroupe);
  if (total === null) return null;
  const n = num(nbPers);
  if (n && n > 0) return Math.round((total / n) * 100) / 100;
  return total;
}

function extractSubtypePrice(contrib: Record<string, unknown>, subtype: string): number | null {
  const direct = num(contrib[`${subtype}__unit0__prix_unite`]);
  if (direct !== null) return direct;
  const hb = contrib[`hb_${subtype}`] as Record<string, unknown> | undefined;
  const gp = hb?.global_pricing as Record<string, unknown> | undefined;
  if (gp) {
    const pp = perPersonFromGroupe(gp.prix_groupe, gp.nb_pers_groupe);
    if (pp !== null) return pp;
    const enfant = num(gp.prix_enfant);
    if (enfant !== null) return enfant;
  }
  return num(contrib.prix_base ?? contrib.guide_prix_base);
}

function etapeLabel(etape: Record<string, unknown>): string {
  const jour = etape.jour != null ? `Jour ${etape.jour}` : '';
  const titre = (etape.titre as string) || (etape.categorie as string) || 'Étape';
  return jour ? `${jour} — ${titre}` : titre;
}

/** Build normalized bookable options from circuit JSON + collaborations. */
export function buildBookableOptions(
  circuit: Circuit,
  collabs: CircuitCollaboration[] = [],
): BookableOption[] {
  const options: BookableOption[] = [];
  const contribByEtape: Record<string, Record<string, unknown>> = {};
  let hebergContrib: Record<string, unknown> | null = null;

  for (const c of collabs) {
    if (c.section === 'hebergement' && c.contribution_data) {
      hebergContrib = c.contribution_data as Record<string, unknown>;
    } else if (c.etape_id && c.contribution_data) {
      contribByEtape[c.etape_id] = c.contribution_data as Record<string, unknown>;
    }
  }

  const etapes = (circuit.etapes ?? []) as Record<string, unknown>[];
  const mode = circuit.circuit_mode ?? 'single';
  const fallbackPerEtape =
    circuit.price != null && etapes.length > 0
      ? Math.round((Number(circuit.price) / etapes.length) * 100) / 100
      : null;

  for (const etape of etapes) {
    const id = String(etape.id ?? '');
    if (!id) continue;
    const contrib = contribByEtape[id];
    const subtypes = (etape.subtypes as string[] | undefined) ?? [];
    const optional = etape.optional === true;
    const required = mode === 'package' || mode === 'single' || !optional;

    if (subtypes.length > 0 && contrib) {
      for (const st of subtypes) {
        const price = extractSubtypePrice(contrib, st) ?? num(etape.prix) ?? fallbackPerEtape;
        if (price === null) continue;
        options.push({
          key: `etape:${id}:${st}`,
          label: `${etapeLabel(etape)} (${st.replace(/_/g, ' ')})`,
          price_per_person: price,
          type: 'etape',
          required,
          jour: etape.jour as number | undefined,
        });
      }
      continue;
    }

    const price =
      num(etape.prix) ??
      (contrib ? extractSubtypePrice(contrib, '') : null) ??
      num(contrib?.prix_base ?? contrib?.guide_prix_base) ??
      fallbackPerEtape;
    if (price === null) continue;

    options.push({
      key: `etape:${id}`,
      label: etapeLabel(etape),
      price_per_person: price,
      type: 'etape',
      required,
      jour: etape.jour as number | undefined,
    });
  }

  const heberg = circuit.hebergement as Record<string, unknown> | null;
  if (heberg && (heberg.inclus === true || heberg.inclus === undefined)) {
    const hbEtape = (heberg.etape as Record<string, unknown>) ?? {};
    const hbSubtypes = (hbEtape.subtypes as string[] | undefined) ?? [];
    const hbRequired = mode !== 'variant';

    if (hbSubtypes.length > 0 && hebergContrib) {
      for (const st of hbSubtypes) {
        const price = extractSubtypePrice(hebergContrib, st);
        if (price === null) continue;
        options.push({
          key: `hebergement:${st}`,
          label: `Hébergement — ${st.replace(/_/g, ' ')}`,
          price_per_person: price,
          type: 'hebergement',
          required: hbRequired,
        });
      }
    } else if (circuit.price != null && options.length === 0) {
      options.push({
        key: 'circuit:base',
        label: circuit.title,
        price_per_person: Number(circuit.price),
        type: 'etape',
        required: true,
      });
    }
  }

  if (options.length === 0 && circuit.price != null) {
    options.push({
      key: 'circuit:base',
      label: circuit.title,
      price_per_person: Number(circuit.price),
      type: 'etape',
      required: true,
    });
  }

  return options;
}

export function enrichCircuitWithBookingFields<T extends Circuit>(
  circuit: T,
  collabs: CircuitCollaboration[] = [],
): T & {
  bookable_options: BookableOption[];
  price_display_from: number | null;
} {
  const stored = (circuit.bookable_options as BookableOption[] | null) ?? null;
  const bookable_options =
    stored && stored.length > 0 ? stored : buildBookableOptions(circuit, collabs);
  const prices = bookable_options.map((o) => o.price_per_person);
  const fromCircuit = circuit.price != null ? Number(circuit.price) : null;
  const price_display_from =
    prices.length > 0 ? Math.min(...prices) : fromCircuit;

  return { ...circuit, bookable_options, price_display_from };
}

export function resolveBookingUnitPrice(
  options: BookableOption[],
  chosenKeys: string[],
): number | null {
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

export function resolveChosenOptions(
  circuit: Circuit,
  bookableOptions: BookableOption[],
  raw?: { chosen_subtypes?: string[]; chosen_subtype?: string },
): string[] {
  const mode = circuit.circuit_mode ?? 'single';

  if (mode === 'package' || mode === 'single') {
    return sortOptionKeys(bookableOptions.map((o) => o.key));
  }

  let selected: string[] = [];
  if (raw?.chosen_subtypes?.length) {
    selected = raw.chosen_subtypes.map((s) => s.trim()).filter(Boolean);
  } else if (raw?.chosen_subtype?.trim()) {
    selected = [raw.chosen_subtype.trim()];
  }

  const allowed = new Set(bookableOptions.map((o) => o.key));
  const required = bookableOptions.filter((o) => o.required).map((o) => o.key);
  selected = sortOptionKeys([...new Set([...required, ...selected])]);

  if (!selected.length) {
    throw new Error('CHOICE_REQUIRED');
  }

  for (const key of selected) {
    if (!allowed.has(key)) {
      throw new Error('INVALID_OPTION');
    }
    const opt = bookableOptions.find((o) => o.key === key);
    if (!opt || opt.price_per_person < 0) {
      throw new Error('PRICE_MISSING');
    }
  }

  return selected;
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
