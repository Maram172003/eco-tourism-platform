"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isDayCovered, findInvalidDays,
  type AvailabilitySlot,
} from "@/lib/availabilityConflicts";
import { apiFetch } from "@/lib/api";

export type { AvailabilitySlot };

export function useAvailability(token: string) {
  const [slots,   setSlots]   = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AvailabilitySlot[]>("/guide/availability", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSlots(data);
    } catch {}
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Internal: persists a slot to the backend, no validation ────────────────

  const saveSlot = useCallback(async (slot: Omit<AvailabilitySlot, "id">): Promise<AvailabilitySlot> => {
    const saved = await apiFetch<AvailabilitySlot>("/guide/availability", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(slot),
    });
    setSlots((prev) => [...prev, saved]);
    return saved;
  }, [token]);

  // ── Public: create — blocked at the source, days/hours already taken can't be saved ─

  const createSlot = useCallback(async (newSlot: Omit<AvailabilitySlot, "id">): Promise<AvailabilitySlot> => {
    const invalidDays = findInvalidDays(newSlot, slots);
    if (invalidDays.length > 0) {
      throw new Error("Certaines dates/horaires sélectionnés sont déjà pris. Modifie ta sélection.");
    }
    return saveSlot(newSlot);
  }, [slots, saveSlot]);

  // ── Delete ─────────────────────────────────────────────────────────────────

  const deleteSlot = useCallback(async (id: string) => {
    await apiFetch(`/guide/availability/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }, [token]);

  const leaveCollabByLabel = useCallback(async (slotLabel: string) => {
    await apiFetch("/guide/collaborations/leave", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slotLabel }),
    });
    setSlots((prev) => prev.filter((s) => s.label !== slotLabel));
  }, [token]);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const getMonthStats = useCallback((year: number, month: number) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const allDays  = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const future   = allDays.filter((d) => d >= today);
    const covered  = future.filter((d) => isDayCovered(d, slots) !== null).length;
    return {
      total:      future.length,
      covered,
      percentage: future.length > 0 ? Math.round((covered / future.length) * 100) : 0,
    };
  }, [slots]);

  return {
    slots, loading,
    createSlot,
    createSlotForced: saveSlot,
    deleteSlot,
    leaveCollabByLabel,
    getMonthStats,
    refetch: fetchSlots,
  };
}
