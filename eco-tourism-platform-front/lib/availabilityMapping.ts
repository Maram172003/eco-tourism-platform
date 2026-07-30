import { getDay, eachDayOfInterval, parseISO, format, addDays } from "date-fns";
import type { AvailData } from "@/components/offer/AvailabilityPicker";
export type { AvailData } from "@/components/offer/AvailabilityPicker";

// ─── Noms FR ↔ index agenda (0 = Lun … 6 = Dim) ──────────────────────────

export const JOURS_FR_TO_INDEX: Record<string, string> = {
  Lundi: "0", Mardi: "1", Mercredi: "2", Jeudi: "3",
  Vendredi: "4", Samedi: "5", Dimanche: "6",
};

export const INDEX_TO_JOURS_FR: Record<string, string> = {
  "0": "Lundi", "1": "Mardi", "2": "Mercredi", "3": "Jeudi",
  "4": "Vendredi", "5": "Samedi", "6": "Dimanche",
};

// JS getDay() (0=Dim, 1=Lun…6=Sam) → index agenda (0=Lun…6=Dim)
const JS_TO_AGENDA: Record<number, string> = {
  1: "0", 2: "1", 3: "2", 4: "3", 5: "4", 6: "5", 0: "6",
};

// Index agenda → JS getDay()
const AGENDA_TO_JS: Record<string, number> = {
  "0": 1, "1": 2, "2": 3, "3": 4, "4": 5, "5": 6, "6": 0,
};

// Nom FR → JS getDay()
const FR_TO_JS: Record<string, number> = {
  Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 0,
};

// ─── Saisons → plages (année courante) ───────────────────────────────────

export const SAISONS_TO_DATES = (
  year: number,
): Record<string, { start: string; end: string }> => ({
  Printemps: { start: `${year}-03-20`,     end: `${year}-06-20` },
  Été:       { start: `${year}-06-21`,     end: `${year}-09-22` },
  Automne:   { start: `${year}-09-23`,     end: `${year}-12-20` },
  Hiver:     { start: `${year}-12-21`,     end: `${year + 1}-03-19` },
});

// ─── Types ────────────────────────────────────────────────────────────────

export interface AgendaSlot {
  id?: string;
  guide_id?: string;
  type: "specific" | "range" | "recurring";
  dates?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  days_of_week?: string[] | null;
  label?: string | null;
  time_slots?: Record<string, { start: string; end: string }[]> | null;
}


export interface MappingResult {
  canSync: boolean;
  agendaSlot: AgendaSlot | null;
  warning: string | null;
  info: string | null;
}

export interface ValidationError {
  type: "hors_agenda" | "conflit_horaire" | "incompatible";
  message: string;
  dates?: string[];
}

export interface ValidationWarning {
  type: "approximation" | "non_syncable" | "partiel";
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ─── AvailData → AgendaSlot (pour sync) ──────────────────────────────────

export function offerToAgendaSlot(
  avail: AvailData,
  label: string,
  _guideId: string,
): MappingResult {
  const year = new Date().getFullYear();

  switch (avail.type_disponibilite) {
    // ── Type A → specific ─────────────────────────────
    case "A": {
      if (!avail.avail_dates?.length)
        return { canSync: false, agendaSlot: null, warning: "Aucune date sélectionnée.", info: null };

      const time_slots: Record<string, { start: string; end: string }[]> = {};
      avail.avail_dates.forEach((date) => {
        time_slots[date] = [{ start: avail.heure_debut_A || "00:00", end: avail.heure_fin_A || "23:59" }];
      });

      return {
        canSync: true,
        agendaSlot: { type: "specific", dates: avail.avail_dates, label: `[Offre] ${label}`, time_slots },
        warning: null,
        info: `${avail.avail_dates.length} date(s) seront ajoutées à votre agenda`,
      };
    }

    // ── Type B → recurring ────────────────────────────
    case "B": {
      if (!avail.jours_recurrence?.length)
        return { canSync: false, agendaSlot: null, warning: "Aucun jour sélectionné.", info: null };

      const days_of_week = avail.jours_recurrence
        .map((j) => JOURS_FR_TO_INDEX[j])
        .filter(Boolean);

      const time_slots: Record<string, { start: string; end: string }[]> = {};
      days_of_week.forEach((idx) => {
        time_slots[idx] = [{ start: avail.heure_debut_B || "00:00", end: avail.heure_fin_B || "23:59" }];
      });

      return {
        canSync: true,
        agendaSlot: {
          type: "recurring",
          days_of_week,
          start_date: avail.valable_du || null,
          end_date:   avail.valable_au || null,
          label: `[Offre] ${label}`,
          time_slots,
        },
        warning: null,
        info: `Récurrence ${avail.jours_recurrence.join(", ")} ajoutée à votre agenda`,
      };
    }

    // ── Type C → range ────────────────────────────────
    case "C": {
      if (!avail.date_debut_C || !avail.date_fin_C)
        return { canSync: false, agendaSlot: null, warning: "Dates de début et fin requises.", info: null };

      const time_slots: Record<string, { start: string; end: string }[]> = {};
      const joursJS = avail.jours_dispo_C?.map((j) => FR_TO_JS[j]) ?? [];
      const days = eachDayOfInterval({
        start: parseISO(avail.date_debut_C),
        end:   parseISO(avail.date_fin_C),
      });
      days.forEach((day) => {
        if (joursJS.length > 0 && !joursJS.includes(getDay(day))) return;
        const key = format(day, "yyyy-MM-dd");
        time_slots[key] = [{ start: avail.heure_debut_C || "00:00", end: avail.heure_fin_C || "23:59" }];
      });

      return {
        canSync: true,
        agendaSlot: {
          type: "range",
          start_date: avail.date_debut_C,
          end_date:   avail.date_fin_C,
          days_of_week: joursJS.length > 0 ? avail.jours_dispo_C.map((j) => JOURS_FR_TO_INDEX[j]) : null,
          label: `[Offre] ${label}`,
          time_slots,
        },
        warning: null,
        info: `Plage du ${avail.date_debut_C} au ${avail.date_fin_C} ajoutée à votre agenda`,
      };
    }

    // ── Type D → pas d'équivalent ─────────────────────
    case "D":
      return {
        canSync: false,
        agendaSlot: null,
        warning: null,
        info: "Les offres « Sur demande » ne sont pas ajoutées à l'agenda — elles se gèrent manuellement.",
      };

    // ── Type E → range approximatif par saison ────────
    case "E": {
      if (!avail.saisons_offre?.length)
        return { canSync: false, agendaSlot: null, warning: "Aucune saison sélectionnée.", info: null };

      const saisonsMap = SAISONS_TO_DATES(year);
      const first = saisonsMap[avail.saisons_offre[0]];
      if (!first)
        return { canSync: false, agendaSlot: null, warning: "Saison non reconnue.", info: null };

      const time_slots: Record<string, { start: string; end: string }[]> = {};
      eachDayOfInterval({ start: parseISO(first.start), end: parseISO(first.end) }).forEach((day) => {
        time_slots[format(day, "yyyy-MM-dd")] = [{ start: avail.heure_debut_E || "00:00", end: "23:59" }];
      });

      return {
        canSync: true,
        agendaSlot: {
          type: "range",
          start_date: first.start,
          end_date:   first.end,
          label: `[Offre] ${label} — ${avail.saisons_offre[0]}`,
          time_slots,
        },
        warning: avail.saisons_offre.length > 1
          ? `${avail.saisons_offre.length} saisons → ${avail.saisons_offre.length} entrées agenda seront créées`
          : null,
        info: "Saison(s) converties en plages de dates dans votre agenda",
      };
    }

    default:
      return { canSync: false, agendaSlot: null, warning: "Type de disponibilité non reconnu.", info: null };
  }
}

// ── Type E → plusieurs slots (1 par saison) ───────────────────────────────

export function offerSaisonToAgendaSlots(avail: AvailData, label: string, _guideId: string): AgendaSlot[] {
  if (avail.type_disponibilite !== "E") return [];
  const year = new Date().getFullYear();
  const saisonsMap = SAISONS_TO_DATES(year);

  return (avail.saisons_offre ?? []).flatMap((saison) => {
    const dates = saisonsMap[saison];
    if (!dates) return [];
    const time_slots: Record<string, { start: string; end: string }[]> = {};
    eachDayOfInterval({ start: parseISO(dates.start), end: parseISO(dates.end) }).forEach((day) => {
      time_slots[format(day, "yyyy-MM-dd")] = [{ start: avail.heure_debut_E || "00:00", end: "23:59" }];
    });
    return [{ type: "range" as const, start_date: dates.start, end_date: dates.end, label: `[Offre] ${label} — ${saison}`, time_slots }];
  });
}

// ─── Validation AvailData vs agenda existant ──────────────────────────────

export function validateOfferAgainstAgenda(avail: AvailData, agendaSlots: AgendaSlot[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (avail.type_disponibilite === "D") {
    warnings.push({ type: "non_syncable", message: "Les disponibilités « Sur demande » ne sont pas vérifiées contre votre agenda." });
    return { isValid: true, errors, warnings };
  }
  if (avail.type_disponibilite === "E") {
    warnings.push({ type: "approximation", message: "Les saisons seront converties en plages de dates approximatives dans votre agenda." });
    return { isValid: true, errors, warnings };
  }
  if (!avail.type_disponibilite) return { isValid: true, errors, warnings };
  if (agendaSlots.length === 0) {
    errors.push({ type: "hors_agenda", message: "Votre agenda est vide — ajoutez d'abord des disponibilités dans votre agenda." });
    return { isValid: false, errors, warnings };
  }

  const offerDays = getOfferDays(avail);
  if (offerDays.length === 0) return { isValid: true, errors, warnings };

  const hors: string[] = [];
  const horsHoraire: string[] = [];

  offerDays.forEach(({ date, heureDebut, heureFin }) => {
    const covering = agendaSlots.find((s) => slotCoversDay(s, date));
    if (!covering) { hors.push(date); return; }

    if (covering.time_slots && heureDebut && heureFin) {
      const key = getTimeSlotKey(covering, date);
      const windows = covering.time_slots[key];
      if (windows?.length) {
        const fits = windows.some((w) => timeToMin(heureDebut) >= timeToMin(w.start) && timeToMin(heureFin) <= timeToMin(w.end));
        if (!fits) horsHoraire.push(date);
      }
    }
  });

  if (hors.length > 0)
    errors.push({ type: "hors_agenda", message: `${hors.length} jour(s) ne sont pas dans votre agenda de disponibilités.`, dates: hors.slice(0, 5) });
  if (horsHoraire.length > 0)
    errors.push({ type: "conflit_horaire", message: `${horsHoraire.length} jour(s) ont des horaires incompatibles avec votre agenda.`, dates: horsHoraire.slice(0, 5) });

  return { isValid: errors.length === 0, errors, warnings };
}

// ─── Helpers internes ─────────────────────────────────────────────────────

function getOfferDays(avail: AvailData): Array<{ date: string; heureDebut: string; heureFin: string }> {
  const result: Array<{ date: string; heureDebut: string; heureFin: string }> = [];

  if (avail.type_disponibilite === "A") {
    avail.avail_dates?.forEach((date) =>
      result.push({ date, heureDebut: avail.heure_debut_A, heureFin: avail.heure_fin_A }),
    );
  }

  if (avail.type_disponibilite === "B") {
    const start = avail.valable_du ? parseISO(avail.valable_du) : new Date();
    const end   = avail.valable_au ? parseISO(avail.valable_au) : addDays(start, 90);
    const joursJS = avail.jours_recurrence?.map((j) => FR_TO_JS[j]) ?? [];
    eachDayOfInterval({ start, end }).forEach((day) => {
      if (joursJS.includes(getDay(day)))
        result.push({ date: format(day, "yyyy-MM-dd"), heureDebut: avail.heure_debut_B, heureFin: avail.heure_fin_B });
    });
  }

  if (avail.type_disponibilite === "C" && avail.date_debut_C && avail.date_fin_C) {
    const joursJS = avail.jours_dispo_C?.map((j) => FR_TO_JS[j]) ?? [];
    eachDayOfInterval({ start: parseISO(avail.date_debut_C), end: parseISO(avail.date_fin_C) }).forEach((day) => {
      if (joursJS.length === 0 || joursJS.includes(getDay(day)))
        result.push({ date: format(day, "yyyy-MM-dd"), heureDebut: avail.heure_debut_C, heureFin: avail.heure_fin_C });
    });
  }

  return result;
}

function slotCoversDay(slot: AgendaSlot, date: string): boolean {
  const day = parseISO(date);
  switch (slot.type) {
    case "specific":
      return slot.dates?.includes(date) ?? false;

    case "range": {
      if (!slot.start_date || !slot.end_date) return false;
      if (day < parseISO(slot.start_date) || day > parseISO(slot.end_date)) return false;
      if (slot.days_of_week?.length) return slot.days_of_week.includes(JS_TO_AGENDA[getDay(day)]);
      return true;
    }

    case "recurring": {
      if (slot.start_date && day < parseISO(slot.start_date)) return false;
      if (slot.end_date   && day > parseISO(slot.end_date))   return false;
      return slot.days_of_week?.includes(JS_TO_AGENDA[getDay(day)]) ?? false;
    }
  }
  return false;
}

function getTimeSlotKey(slot: AgendaSlot, date: string): string {
  if (slot.type === "recurring") return JS_TO_AGENDA[getDay(parseISO(date))];
  return date;
}

function timeToMin(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
