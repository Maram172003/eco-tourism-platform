"use client";

import { useState, useEffect, useCallback } from "react";
import { eachDayOfInterval, parseISO, addDays, startOfDay } from "date-fns";
import { apiFetch } from "@/lib/api";
import {
  slotCoversDay,   // prend (slot, Date) — version canonique
  windowsForDay,   // date ISO key puis weekday key — version canonique
  dateStr,         // format local "YYYY-MM-DD"
  toFrIdx,         // getDay() local → index FR 0=Lun…6=Dim
  type AvailabilitySlot,
  type TimeSlots,
  type TimeWindow,
} from "@/lib/availabilityConflicts";
import type { OfferAvailSlot } from "@/components/offer/OfferAvailPicker";

export type { OfferAvailSlot };
export type { AvailabilitySlot };

export interface ValidationError {
  message: string;
  dates?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// Retourne les plages horaires de l'offre pour un jour donné
// (même logique que windowsForDay de l'agenda : clé date ISO d'abord, indice jour ensuite)
function offerWindowsForDay(slot: OfferAvailSlot, day: Date): TimeWindow[] | null {
  if (!slot.time_slots || !Object.keys(slot.time_slots).length) return null;
  const ds   = dateStr(day);
  const wday = toFrIdx(day);
  return slot.time_slots[ds] ?? slot.time_slots[wday] ?? null;
}

// Retourne toutes les dates couvertes par l'offre (horizon 90j pour recurring non borné)
function expandOfferDates(slot: OfferAvailSlot): string[] {
  const todayStr = dateStr(startOfDay(new Date()));

  if (slot.type === "specific") {
    return (slot.dates ?? []).filter((d) => d >= todayStr);
  }

  if ((slot.type === "range" || slot.type === "season") && slot.start_date && slot.end_date) {
    return eachDayOfInterval({
      start: parseISO(slot.start_date),
      end:   parseISO(slot.end_date),
    })
      .filter((d) => dateStr(d) >= todayStr)
      .filter((d) => !slot.days_of_week?.length || slot.days_of_week.includes(toFrIdx(d)))
      .map((d) => dateStr(d));
  }

  if (slot.type === "recurring" && slot.days_of_week?.length) {
    const start = slot.start_date ? parseISO(slot.start_date) : new Date();
    const end   = slot.end_date   ? parseISO(slot.end_date)   : addDays(new Date(), 90);
    return eachDayOfInterval({ start, end })
      .filter((d) => dateStr(d) >= todayStr)
      .filter((d) => slot.days_of_week!.includes(toFrIdx(d)))
      .map((d) => dateStr(d));
  }

  return [];
}

// Détection de conflit : l'offre chevauche-t-elle un créneau agenda existant ?
//
// windowsForDay  (agenda) → null     : journée entière bloquée → conflit systématique
// windowsForDay  (agenda) → []       : aucune entrée horaire  → pas de conflit
// windowsForDay  (agenda) → [...tw]  : créneaux horaires définis → vérification chevauchement
//
// offerWindowsForDay (offre) → null  : l'offre ne restreint pas les heures → couvre toute la journée
// offerWindowsForDay (offre) → [...] : créneaux définis → chevauchement = offerStart < agEnd ET offerEnd > agStart
// ── Conflit détaillé (date + heures) ─────────────────────────────────────────

export interface ConflictDetail {
  date: string;
  offerHours: string | null;   // null = journée entière côté offre
  agendaHours: string | null;  // null = journée entière côté agenda
}

export function conflictsDetailed(
  slot: OfferAvailSlot,
  agenda: AvailabilitySlot[],
  excludeIds: string[] = [],
): ConflictDetail[] {
  const dates = expandOfferDates(slot);
  const result: ConflictDetail[] = [];

  for (const ds of dates) {
    const day      = parseISO(ds);
    const covering = agenda.filter((s) => slotCoversDay(s, day) && !excludeIds.includes(s.id));
    if (!covering.length) continue;

    const offerWindows = offerWindowsForDay(slot, day);

    for (const agSlot of covering) {
      const agWindows = windowsForDay(agSlot, day);

      const isConflict = (() => {
        if (agWindows === null && (offerWindows === null || !offerWindows.length)) return true;
        if (agWindows === null) return false;
        if (!agWindows.length) return false;
        if (offerWindows === null || !offerWindows.length) return true;
        return offerWindows.some((offerW) =>
          agWindows.some((agW) =>
            timeToMin(offerW.start) < timeToMin(agW.end) &&
            timeToMin(offerW.end)   > timeToMin(agW.start),
          ),
        );
      })();

      if (isConflict) {
        result.push({
          date: ds,
          offerHours:  offerWindows?.length  ? offerWindows.map((w)  => `${w.start}–${w.end}`).join(', ')  : null,
          agendaHours: agWindows?.length      ? agWindows.map((w)    => `${w.start}–${w.end}`).join(', ')  : null,
        });
        break; // un conflit par date suffit
      }
    }
  }

  return result;
}

export function conflictsWithAgenda(
  slot: OfferAvailSlot,
  agenda: AvailabilitySlot[],
  excludeIds: string[] = [],
): string[] {
  const dates = expandOfferDates(slot);
  if (!dates.length) return [];

  return dates.filter((ds) => {
    const day      = parseISO(ds);
    const covering = agenda.filter((s) => slotCoversDay(s, day) && !excludeIds.includes(s.id));
    if (!covering.length) return false;

    const offerWindows = offerWindowsForDay(slot, day);

    return covering.some((agSlot) => {
      const agWindows = windowsForDay(agSlot, day);

      // Cas 1 : aucune des deux parties n'a d'heures précises → conflit journée entière
      if (agWindows === null && (offerWindows === null || !offerWindows.length)) return true;

      // Cas 2 : agenda sans heures précises mais offre avec heures → pas de conflit
      // (on ne peut pas savoir si les créneaux se chevauchent sans heures agenda)
      if (agWindows === null) return false;

      // Cas 3 : agenda a des heures mais tableau vide (cas anormal) → pas de conflit
      if (!agWindows.length) return false;

      // Cas 4 : offre sans heures précises = journée entière → conflit avec tout créneau agenda
      if (offerWindows === null || !offerWindows.length) return true;

      // Cas 5 : les deux ont des heures → chevauchement précis
      return offerWindows.some((offerW) =>
        agWindows.some((agW) =>
          timeToMin(offerW.start) < timeToMin(agW.end) &&
          timeToMin(offerW.end)   > timeToMin(agW.start),
        ),
      );
    });
  });
}

function validateSlotAgainstAgenda(
  slot: OfferAvailSlot,
  agenda: AvailabilitySlot[],
  excludeIds: string[] = [],
): ValidationResult {
  if (!slot.type) return { isValid: true, errors: [] };

  const conflictDates = conflictsWithAgenda(slot, agenda, excludeIds);
  if (!conflictDates.length) return { isValid: true, errors: [] };

  return {
    isValid: false,
    errors: [
      {
        message: `${conflictDates.length} jour(s) sont en conflit avec un créneau existant dans votre agenda.`,
        dates: conflictDates.slice(0, 5),
      },
    ],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfferAvailability(token: string) {
  const [agendaSlots,   setAgendaSlots]   = useState<AvailabilitySlot[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [syncedSlotIds, setSyncedSlotIds] = useState<string[]>([]);

  const fetchAgenda = useCallback(async () => {
    setLoadingAgenda(true);
    try {
      const data = await apiFetch<AvailabilitySlot[]>("/guide/availability", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgendaSlots(Array.isArray(data) ? data : []);
    } catch {
      setAgendaSlots([]);
    }
    setLoadingAgenda(false);
  }, [token]);

  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);

  const validateAvail = useCallback(
    (slot: OfferAvailSlot, excludeIds: string[] = []): ValidationResult =>
      validateSlotAgainstAgenda(slot, agendaSlots, excludeIds),
    [agendaSlots],
  );

  // Sync : même format agenda → POST direct
  // "season" est posté en type "range" (l'agenda ne connaît pas ce type UI)
  const syncToAgenda = useCallback(
    async (
      slot: OfferAvailSlot,
      label: string,
    ): Promise<{ success: boolean; createdIds: string[]; error?: string }> => {
      if (!slot.type) return { success: false, createdIds: [], error: "Type non défini." };
      setSyncing(true);
      try {
        const agendaSlot: Omit<AvailabilitySlot, "id"> = {
          type:        (slot.type === "season" ? "range" : slot.type) as AvailabilitySlot["type"],
          dates:       slot.dates       ?? null,
          start_date:  slot.start_date  ?? null,
          end_date:    slot.end_date    ?? null,
          days_of_week: slot.days_of_week ?? null,
          label:       `[Offre] ${label}`,
          time_slots:  (slot.time_slots && Object.keys(slot.time_slots).length) ? slot.time_slots : null,
        };
        const created = await apiFetch<AvailabilitySlot & { id: string }>("/guide/availability", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(agendaSlot),
        });
        const createdIds = created?.id ? [created.id] : [];
        setSyncedSlotIds((prev) => [...prev, ...createdIds]);
        await fetchAgenda();
        return { success: true, createdIds };
      } catch (err) {
        return {
          success: false,
          createdIds: [],
          error: err instanceof Error ? err.message : "Erreur inconnue",
        };
      } finally {
        setSyncing(false);
      }
    },
    [token, fetchAgenda],
  );

  const unsyncFromAgenda = useCallback(
    async (idsToRemove: string[]) => {
      for (const id of idsToRemove) {
        await apiFetch(`/guide/availability/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSyncedSlotIds((prev) => prev.filter((id) => !idsToRemove.includes(id)));
      await fetchAgenda();
    },
    [token, fetchAgenda],
  );

  return {
    agendaSlots,
    loadingAgenda,
    syncing,
    syncedSlotIds,
    validateAvail,
    syncToAgenda,
    unsyncFromAgenda,
  };
}
