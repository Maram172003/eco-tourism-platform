"use client";

import { useState, useCallback, useEffect } from "react";
import { addMonths, subMonths, addWeeks, subWeeks, format } from "date-fns";
import { apiFetch } from "@/lib/api";

import { useAvailability }     from "@/hooks/useAvailability";
import CalendarHeader, { type ViewMode } from "./CalendarHeader";
import CalendarMonthView       from "./CalendarMonthView";
import CalendarWeekView        from "./CalendarWeekView";
import CalendarAgendaView      from "./CalendarAgendaView";
import CreationPanel, { type CreateMode } from "./CreationPanel";
import DayDetailPanel          from "./DayDetailPanel";
import DayTimeEditModal        from "./DayTimeEditModal";
import EditSlotModal           from "./EditSlotModal";
import QuickFillModal          from "./QuickFillModal";
import CopyMonthModal          from "./CopyMonthModal";
import { findInvalidDays, type AvailabilitySlot } from "@/lib/availabilityConflicts";

interface Props {
  token:     string;
  readOnly?: boolean;
  offers?: Array<{ id: string; title: string }>;
  onOfferDeleted?: (offerId: string) => void;
  pendingConflict?: { offer: string; section: string; conflictSlotLabel: string; days: string[] } | null;
  initialDate?: Date;
}

export default function AvailabilityCalendar({ token, readOnly = false, offers = [], onOfferDeleted, pendingConflict, initialDate }: Props) {
  const {
    slots, loading,
    createSlot, createSlotForced, deleteSlot, leaveCollabByLabel,
    getMonthStats, refetch,
  } = useAvailability(token);

  // ── Editing an existing slot ───────────────────────────────────────────────────
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);

  // ── Navigation state ──────────────────────────────────────────────────────────
  const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());

  // Navigate to initialDate when it changes (e.g. from "Régler mon agenda")
  useEffect(() => {
    if (initialDate) setCurrentDate(initialDate);
  }, [initialDate]);
  const [activeView,  setActiveView]  = useState<ViewMode>("month");

  // ── Creation state (lifted so calendar clicks drive them) ─────────────────────
  const [activeMode,    setActiveMode]    = useState<CreateMode | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeA,        setRangeA]        = useState("");
  const [rangeB,        setRangeB]        = useState("");
  const [recurDays,     setRecurDays]     = useState<string[]>([]);
  const [recurMonths,   setRecurMonths]   = useState<number[]>([]); // month indices 0-11, for the calendar preview
  const [recurFrom,     setRecurFrom]     = useState("");
  const [recurTo,       setRecurTo]       = useState("");

  // ── Day detail (clic sans mode actif) ────────────────────────────────────────
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ── Edition horaires d'un jour spécifique (depuis agenda) ─────────────────────
  const [editingDaySlot, setEditingDaySlot] = useState<{ slot: AvailabilitySlot; day: Date } | null>(null);

  // ── Modal flags ───────────────────────────────────────────────────────────────
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [showCopyMonth, setShowCopyMonth] = useState(false);

  // ── Quitter une collaboration (confirmation) ──────────────────────────────────
  const [confirmLeaveLabel, setConfirmLeaveLabel] = useState<string | null>(null);
  const [leavingCollab,     setLeavingCollab]     = useState(false);
  const [leaveError,        setLeaveError]        = useState<string | null>(null);

  const handleCollabLeave = useCallback((slotLabel: string) => {
    setLeaveError(null);
    setConfirmLeaveLabel(slotLabel);
  }, []);

  const confirmLeave = useCallback(async () => {
    if (!confirmLeaveLabel) return;
    setLeavingCollab(true);
    setLeaveError(null);
    try {
      await leaveCollabByLabel(confirmLeaveLabel);
      setConfirmLeaveLabel(null);
    } catch (e: any) {
      setLeaveError(e?.message ?? "Impossible de quitter la collaboration.");
    }
    setLeavingCollab(false);
  }, [confirmLeaveLabel, leaveCollabByLabel]);

  // ── Créneaux [Offre] : suppression avec confirmation ──────────────────────────
  const [confirmDeleteOfferSlot, setConfirmDeleteOfferSlot] = useState<{
    slotId: string; offerId: string; offerTitle: string;
  } | null>(null);
  const [deletingOffer, setDeletingOffer] = useState(false);
  const [deleteOfferError, setDeleteOfferError] = useState<string | null>(null);

  // ── Créneaux [Offre] : édition via PATCH /guide/offers/:id/availability ───────
  const [editingOfferSlot, setEditingOfferSlot] = useState<AvailabilitySlot | null>(null);

  const findOfferForSlot = useCallback((slot: AvailabilitySlot) => {
    if (!slot.label?.startsWith("[Offre]")) return null;
    const title = slot.label.replace(/^\[Offre\]\s*/, "").trim();
    return offers.find((o) => o.title === title) ?? null;
  }, [offers]);

  const handleOfferSlotDeleteRequest = useCallback((slot: AvailabilitySlot) => {
    const offer = findOfferForSlot(slot);
    if (!offer) return;
    setDeleteOfferError(null);
    setConfirmDeleteOfferSlot({ slotId: slot.id, offerId: offer.id, offerTitle: offer.title });
  }, [findOfferForSlot]);

  const confirmDeleteOffer = useCallback(async () => {
    if (!confirmDeleteOfferSlot) return;
    setDeletingOffer(true);
    setDeleteOfferError(null);
    try {
      await apiFetch(`/guide/offers/${confirmDeleteOfferSlot.offerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onOfferDeleted?.(confirmDeleteOfferSlot.offerId);
      setConfirmDeleteOfferSlot(null);
      await refetch();
    } catch (e: any) {
      setDeleteOfferError(e?.message ?? "Impossible de supprimer l'offre.");
    }
    setDeletingOffer(false);
  }, [confirmDeleteOfferSlot, token, onOfferDeleted, refetch]);

  const handleOfferSlotEditSave = useCallback(async (_id: string, updated: Omit<AvailabilitySlot, "id">) => {
    if (!editingOfferSlot) return;
    const offer = findOfferForSlot(editingOfferSlot);
    if (!offer) throw new Error("Offre introuvable.");
    const disponibilite = {
      type:         updated.type,
      dates:        updated.dates        ?? undefined,
      start_date:   updated.start_date   ?? undefined,
      end_date:     updated.end_date     ?? undefined,
      days_of_week: updated.days_of_week ?? undefined,
      time_slots:   updated.time_slots   ?? undefined,
    };
    await apiFetch(`/guide/offers/${offer.id}/availability`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ disponibilite }),
    });
    setEditingOfferSlot(null);
    await refetch();
  }, [editingOfferSlot, findOfferForSlot, token, refetch]);

  // ── Conflits d'agenda issus des notifications ─────────────────────────────────
  type ConflictInfo = { id?: string; offer: string; section: string; conflictSlotLabel: string; days: string[] };
  const [conflictNotifs, setConflictNotifs] = useState<ConflictInfo[]>([]);

  const fetchConflicts = useCallback(() => {
    if (!token) return;
    apiFetch<Array<{ id: string; type: string; data: any }>>("/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((notifs) => {
      setConflictNotifs(
        notifs
          .filter((n) => n.type === "offer_schedule_conflict" || n.type === "circuit_schedule_conflict")
          .map((n) => ({
            id: n.id,
            offer: n.data?.offer_title ?? n.data?.circuit_title ?? "",
            section: n.data?.section ?? "",
            conflictSlotLabel: n.data?.conflicting_slot ?? n.data?.conflict_slot ?? "",
            days: Array.isArray(n.data?.conflict_days) ? n.data.conflict_days : [],
          }))
      );
    }).catch(() => {});
  }, [token]);


  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  // Merge pendingConflict (from collab accept 409) into conflictNotifs
  const mergedConflictNotifs = pendingConflict
    ? [
        ...conflictNotifs.filter((n) => n.conflictSlotLabel !== pendingConflict.conflictSlotLabel),
        pendingConflict,
      ]
    : conflictNotifs;

  const stats = getMonthStats(currentDate.getFullYear(), currentDate.getMonth());

  // ── Navigation ────────────────────────────────────────────────────────────────
  const prev = useCallback(() => {
    setCurrentDate((d) => activeView === "week" ? subWeeks(d, 1) : subMonths(d, 1));
  }, [activeView]);

  const next = useCallback(() => {
    setCurrentDate((d) => activeView === "week" ? addWeeks(d, 1) : addMonths(d, 1));
  }, [activeView]);

  // ── Mode change — clears selection state, but only on an actual mode switch ───
  // Re-clicking the already-active tab (or a double-click firing two clicks) must not wipe the selection.
  const handleModeChange = useCallback((m: CreateMode | null) => {
    setSelectedDay(null);
    setActiveMode((prev) => {
      if (prev === m) return prev;
      setSelectedDates([]);
      setRangeA(""); setRangeB("");
      setRecurDays([]); setRecurMonths([]); setRecurFrom(""); setRecurTo("");
      return m;
    });
  }, []);

  // ── Day click — drives calendar selection for all 3 interactive modes ─────────
  // Days/hours already fully taken are filtered out upstream in CalendarMonthView,
  // which never calls this for a fully-blocked day.
  const handleDayClick = useCallback((day: Date) => {
    if (readOnly) return;
    const ds   = format(day, "yyyy-MM-dd");
    const wday = String((day.getDay() + 6) % 7); // French: 0=Lun … 6=Dim

    // Clic sans mode actif → affiche les détails du jour
    if (!activeMode) {
      setSelectedDay(day);
      return;
    }

    if (activeMode === "specific") {
      setSelectedDates((p) => p.includes(ds) ? p.filter((d) => d !== ds) : [...p, ds]);

    } else if (activeMode === "range") {
      if (!rangeA || (rangeA && rangeB)) {
        setRangeA(ds); setRangeB("");
      } else {
        if (ds === rangeA) { setRangeA(""); return; }
        if (ds < rangeA)   { setRangeB(rangeA); setRangeA(ds); }
        else               { setRangeB(ds); }
      }

    } else if (activeMode === "recurring") {
      setRecurDays((p) => p.includes(wday) ? p.filter((d) => d !== wday) : [...p, wday]);
    }
  }, [readOnly, activeMode, rangeA, rangeB]);

  // ── Submit: rejected outright if it collides with an existing slot ────────────
  const handleSubmit = useCallback(async (slot: Omit<AvailabilitySlot, "id">) => {
    await createSlot(slot); // throws if any covered day/hour is already taken
    setSelectedDates([]); setRangeA(""); setRangeB("");
    fetchConflicts();
  }, [createSlot, fetchConflicts]);

  // ── Quick fill / copy save (bulk ops, unchanged) ──────────────────────────────
  const handleQuickSave = useCallback(async (slot: Omit<AvailabilitySlot, "id">) => {
    await createSlotForced(slot);
    fetchConflicts();
  }, [createSlotForced, fetchConflicts]);

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    await deleteSlot(id);
    fetchConflicts();
  }, [deleteSlot, fetchConflicts]);

  // ── Edit: replace the slot's dates/days/hours (delete + recreate) ─────────────
  const handleEditSave = useCallback(async (id: string, updated: Omit<AvailabilitySlot, "id">) => {
    const others = slots.filter((s) => s.id !== id);
    if (findInvalidDays(updated, others).length > 0) {
      throw new Error("Certaines dates/horaires sélectionnés sont déjà pris. Modifie ta sélection.");
    }
    const dto: Omit<AvailabilitySlot, "id"> = {
      type:         updated.type,
      dates:        updated.dates        ?? undefined,
      start_date:   updated.start_date   ?? undefined,
      end_date:     updated.end_date     ?? undefined,
      days_of_week: updated.days_of_week ?? undefined,
      label:        updated.label        ?? undefined,
      time_slots:   updated.time_slots   ?? undefined,
    };
    await deleteSlot(id);
    await createSlotForced(dto);
    setEditingSlot(null);
    setEditingDaySlot(null);
    fetchConflicts();
  }, [slots, deleteSlot, createSlotForced, fetchConflicts]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        activeView={activeView}
        stats={stats}
        onPrev={prev}
        onNext={next}
        onToday={() => setCurrentDate(new Date())}
        onViewChange={setActiveView}
        onQuickFill={() => !readOnly && setShowQuickFill(true)}
        onCopyMonth={() => !readOnly && setShowCopyMonth(true)}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className={readOnly || activeView === "agenda" ? "space-y-4" : "grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4"}>
          {/* Left: calendar view */}
          <div className="space-y-4">
            {activeView === "month" && (
              <CalendarMonthView
                currentDate={currentDate}
                slots={slots}
                activeMode={readOnly ? "" : (activeMode ?? "")}
                selectedDates={selectedDates}
                rangeA={rangeA}
                rangeB={rangeB}
                recurDays={recurDays}
                recurMonths={recurMonths}
                recurFrom={recurFrom}
                recurTo={recurTo}
                conflictNotifs={mergedConflictNotifs}
                onDayClick={handleDayClick}
                onDeleteSlot={handleDelete}
                onCollabLeave={handleCollabLeave}
              />
            )}
            {activeView === "week" && (
              <CalendarWeekView
                currentDate={currentDate}
                slots={slots}
                onDayClick={handleDayClick}
              />
            )}
            {activeView === "agenda" && (
              <CalendarAgendaView
                slots={slots}
                conflictNotifs={mergedConflictNotifs}
                onDelete={handleDelete}
                onCollabLeave={handleCollabLeave}
                onEdit={setEditingSlot}
                onEditDay={(slot, day) => setEditingDaySlot({ slot, day })}
                onEditOfferSlot={setEditingOfferSlot}
                onDeleteOfferSlot={handleOfferSlotDeleteRequest}
              />
            )}
          </div>

          {/* Right: détail jour ou panneau création (masqué en mode agenda) */}
          {!readOnly && activeView !== "agenda" && (
            <div className="space-y-4">
              {!activeMode && selectedDay ? (
                <DayDetailPanel
                  day={selectedDay}
                  slots={slots}
                  conflictNotifs={mergedConflictNotifs}
                  onClose={() => setSelectedDay(null)}
                  onDelete={handleDelete}
                  onCollabLeave={handleCollabLeave}
                  onEdit={(slot) => { setSelectedDay(null); setEditingSlot(slot); }}
                  onEditOfferSlot={(slot) => { setSelectedDay(null); setEditingOfferSlot(slot); }}
                  onDeleteOfferSlot={(slot) => { setSelectedDay(null); handleOfferSlotDeleteRequest(slot); }}
                  onAddSlot={(ds) => {
                    setSelectedDay(null);
                    setActiveMode("specific");
                    setSelectedDates([ds]);
                  }}
                />
              ) : (
                <CreationPanel
                  activeMode={activeMode}
                  onModeChange={handleModeChange}
                  selectedDates={selectedDates}
                  onRemoveDate={(d) => setSelectedDates((p) => p.filter((x) => x !== d))}
                  onClearDates={() => setSelectedDates([])}
                  rangeA={rangeA}
                  rangeB={rangeB}
                  onRangeChange={(a, b) => { setRangeA(a); setRangeB(b); }}
                  recurDays={recurDays}
                  onRecurDaysChange={setRecurDays}
                  recurMonths={recurMonths}
                  onRecurMonthsChange={setRecurMonths}
                  recurFrom={recurFrom}
                  onRecurFromChange={setRecurFrom}
                  recurTo={recurTo}
                  onRecurToChange={setRecurTo}
                  existingSlots={slots}
                  onSubmit={handleSubmit}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit an existing personal slot (full) */}
      {editingSlot && (
        <EditSlotModal
          slot={editingSlot}
          existingSlots={slots}
          onSave={handleEditSave}
          onClose={() => setEditingSlot(null)}
        />
      )}

      {/* Edit an offer slot — saves via PATCH /guide/offers/:id/availability */}
      {editingOfferSlot && (
        <EditSlotModal
          slot={editingOfferSlot}
          existingSlots={slots.filter((s) => s.id !== editingOfferSlot.id)}
          onSave={handleOfferSlotEditSave}
          onClose={() => setEditingOfferSlot(null)}
        />
      )}

      {/* Edit time slots for a specific day (depuis agenda) */}
      {editingDaySlot && (
        <DayTimeEditModal
          slot={editingDaySlot.slot}
          day={editingDaySlot.day}
          onSave={handleEditSave}
          onClose={() => setEditingDaySlot(null)}
        />
      )}

      {/* Quick fill */}
      {showQuickFill && (
        <QuickFillModal
          currentDate={currentDate}
          existingSlots={slots}
          onSave={handleQuickSave}
          onClose={() => setShowQuickFill(false)}
        />
      )}

      {/* Copy month */}
      {showCopyMonth && (
        <CopyMonthModal
          currentDate={currentDate}
          slots={slots}
          onSave={handleQuickSave}
          onClose={() => setShowCopyMonth(false)}
        />
      )}

      {/* Supprimer offre depuis agenda — modal de confirmation */}
      {confirmDeleteOfferSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !deletingOffer && setConfirmDeleteOfferSlot(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-2xl text-red-500">local_activity</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-800 text-center mb-1">
              Supprimer l'offre ?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Ce créneau est lié à votre offre <strong>«&nbsp;{confirmDeleteOfferSlot.offerTitle}&nbsp;»</strong>.
              Supprimer ce créneau supprimera définitivement l'offre et notifiera tous les collaborateurs.
            </p>
            {deleteOfferError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                <span className="material-symbols-outlined text-sm text-red-500 mt-0.5 shrink-0">warning</span>
                <p className="text-xs text-red-600 font-semibold">{deleteOfferError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button"
                onClick={() => !deletingOffer && setConfirmDeleteOfferSlot(null)}
                disabled={deletingOffer}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                Annuler
              </button>
              <button type="button"
                onClick={confirmDeleteOffer}
                disabled={deletingOffer}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-extrabold text-white hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                {deletingOffer
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Suppression...</>
                  : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quitter collaboration — modal de confirmation */}
      {confirmLeaveLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !leavingCollab && setConfirmLeaveLabel(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}>
            {/* Icône */}
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-2xl text-red-500">exit_to_app</span>
            </div>
            {/* Titre */}
            <h3 className="text-base font-extrabold text-slate-800 text-center mb-1">
              Quitter la collaboration ?
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Votre créneau agenda sera supprimé et votre contribution retirée de l'offre.
              Le propriétaire sera notifié.
            </p>
            {/* Erreur */}
            {leaveError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
                <span className="material-symbols-outlined text-sm text-red-500 mt-0.5 shrink-0">warning</span>
                <p className="text-xs text-red-600 font-semibold">{leaveError}</p>
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-2">
              <button type="button"
                onClick={() => !leavingCollab && setConfirmLeaveLabel(null)}
                disabled={leavingCollab}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                Annuler
              </button>
              <button type="button"
                onClick={confirmLeave}
                disabled={leavingCollab}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-extrabold text-white hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5">
                {leavingCollab
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Quitter...</>
                  : "Oui, quitter"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
