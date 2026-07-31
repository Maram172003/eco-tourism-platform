"use client";

import { useState, useMemo } from "react";
import { X, Pencil, Clock, SlidersHorizontal, LayoutList, CalendarDays } from "lucide-react";
import { format, eachDayOfInterval, startOfDay, addDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  SLOT_COLORS, SLOT_TYPE_LABELS, FR_DAYS, displayType, dateStr,
  formatSlotSummary, windowsForDay, slotCoversDay, formatTimeWindows,
  type AvailabilitySlot, type TimeWindow,
} from "@/lib/availabilityConflicts";

type ConflictInfo = { offer: string; section: string; conflictSlotLabel: string; days: string[] };

const SECTION_LABEL: Record<string, string> = {
  hebergement: "Hébergement", restauration: "Restauration",
  transport: "Transport", guide: "Guidage", autre: "Autre",
};

interface Props {
  slots: AvailabilitySlot[];
  conflictNotifs?: ConflictInfo[];
  onDelete: (id: string) => Promise<void>;
  onCollabLeave?: (slotLabel: string) => void;
  onEdit: (slot: AvailabilitySlot) => void;
  onEditDay: (slot: AvailabilitySlot, day: Date) => void;
  onEditOfferSlot?: (slot: AvailabilitySlot) => void;
  onDeleteOfferSlot?: (slot: AvailabilitySlot) => void;
}

type FilterType  = "all" | "specific" | "range" | "recurring";
type AgendaStyle = "slots" | "days";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "Tout", specific: "Date unique", range: "Plage", recurring: "Récurrent",
};

const ICONS: Record<string, string> = {
  specific: "event", range: "date_range", recurring: "autorenew", season: "sunny",
};

const LEFT_COLORS: Record<string, string> = {
  specific: "border-l-emerald-400", range: "border-l-blue-400",
  recurring: "border-l-amber-400",  season:   "border-l-orange-400",
};

export default function CalendarAgendaView({ slots, conflictNotifs = [], onDelete, onCollabLeave, onEdit, onEditDay, onEditOfferSlot, onDeleteOfferSlot }: Props) {
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [filter,       setFilter]       = useState<FilterType>("all");
  const [agendaStyle,  setAgendaStyle]  = useState<AgendaStyle>("days");
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const todayStr = dateStr(new Date());

  const filteredSlots = filter === "all"
    ? slots
    : slots.filter((s) => displayType(s) === filter);

  // ── Days view: all days in next 365 days with at least one slot ─────────────
  const upcomingDays = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const end = addDays(todayStart, 365);
    return eachDayOfInterval({ start: todayStart, end })
      .filter((day) => filteredSlots.some((s) => slotCoversDay(s, day)));
  }, [filteredSlots]);

  // ── Slots view: upcoming slots sorted by start date ─────────────────────────
  const upcomingSlots = useMemo(() => {
    return [...filteredSlots]
      .filter((s) => {
        if (s.type === "specific" && s.dates) return s.dates.some((d) => d >= todayStr);
        if (s.type === "range" && s.end_date)  return s.end_date >= todayStr;
        return true;
      })
      .sort((a, b) => {
        const ad = a.type === "specific" ? (a.dates?.[0] ?? "") : (a.start_date ?? "");
        const bd = b.type === "specific" ? (b.dates?.[0] ?? "") : (b.start_date ?? "");
        return ad.localeCompare(bd);
      });
  }, [filteredSlots, todayStr]);

  async function remove(id: string) {
    setDeleting(id);
    await onDelete(id);
    setDeleting(null);
  }

  if (!slots.length) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-16 text-center">
        <span className="material-symbols-outlined text-slate-200 text-5xl block mb-3">event_busy</span>
        <p className="text-sm font-bold text-slate-400">Aucun créneau à venir</p>
        <p className="text-xs text-slate-300 mt-1">Créez des disponibilités via le calendrier</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Barre filtres + toggle vue ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm px-4 py-3 flex items-center gap-2 flex-wrap">
        <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
        {(Object.entries(FILTER_LABELS) as [FilterType, string][]).map(([f, label]) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
              filter === f ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}>
            {label}
          </button>
        ))}

        {/* Séparateur */}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Toggle vue */}
        <div className="flex gap-0.5 bg-slate-100 p-1 rounded-xl">
          <button type="button" onClick={() => setAgendaStyle("slots")}
            title="Par créneaux"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${agendaStyle === "slots" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"}`}>
            <LayoutList size={13} />
          </button>
          <button type="button" onClick={() => setAgendaStyle("days")}
            title="Par jour"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${agendaStyle === "days" ? "bg-white shadow-sm text-slate-700" : "text-slate-400 hover:text-slate-600"}`}>
            <CalendarDays size={13} />
          </button>
        </div>

        <span className="ml-auto text-[10px] font-bold text-slate-300">
          {agendaStyle === "days"
            ? `${upcomingDays.length} jour${upcomingDays.length !== 1 ? "s" : ""}`
            : `${upcomingSlots.length} créneau${upcomingSlots.length !== 1 ? "x" : ""}`}
        </span>
      </div>

      {/* ── Aucun résultat ───────────────────────────────────────── */}
      {((agendaStyle === "days" && upcomingDays.length === 0) ||
        (agendaStyle === "slots" && upcomingSlots.length === 0)) && (
        <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-10 text-center">
          <span className="material-symbols-outlined text-slate-200 text-4xl block mb-2">filter_list_off</span>
          <p className="text-xs font-bold text-slate-400">Aucun créneau pour ce filtre</p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          VUE PAR CRÉNEAUX  (LayoutList)
          ════════════════════════════════════════════════════════════ */}
      {agendaStyle === "slots" && upcomingSlots.map((slot) => {
        const c  = SLOT_COLORS[displayType(slot)];
        const dt = displayType(slot);
        const dateKeyed = !!slot.time_slots && Object.keys(slot.time_slots).some((k) => k.includes("-"));

        // Build full list of date rows for this slot
        const isExpanded = expanded.has(slot.id);
        const allDateRows: { label: string; windows: TimeWindow[] | null }[] = [];
        if (slot.type === "specific" && slot.dates) {
          slot.dates
            .filter((d) => d >= todayStr)
            .forEach((d) => {
              allDateRows.push({
                label: format(parseISO(d), "d MMM", { locale: fr }),
                windows: slot.time_slots?.[d] ?? null,
              });
            });
        } else if (dateKeyed && slot.time_slots) {
          Object.entries(slot.time_slots)
            .filter(([d]) => d >= todayStr)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([d, w]) => {
              allDateRows.push({
                label: format(parseISO(d), "d MMM", { locale: fr }),
                windows: w,
              });
            });
        }

        const totalDateRows = allDateRows.length;
        const dateRows = isExpanded ? allDateRows : allDateRows.slice(0, 6);

        const slotKey = slot.label?.trim() || slot.type;
        const slotConflict = conflictNotifs.find((cn) => cn.conflictSlotLabel === slotKey);
        const conflictDaySet = new Set(slotConflict?.days ?? []);
        const isCollabSlot = slot.label?.startsWith("[Collab]");
        const isOfferSlot  = !isCollabSlot && slot.label?.startsWith("[Offre]");
        const cleanLabel = isCollabSlot
          ? slot.label!.replace(/^\[Collab\]\s*/, "").replace(/\s*—\s*\w+$/, "").trim()
          : isOfferSlot
          ? slot.label!.replace(/^\[Offre\]\s*/, "").trim()
          : slot.label;
        const collabSec = isCollabSlot ? slot.label!.match(/—\s*(\w+)$/)?.[1] ?? "" : "";

        return (
          <div key={slot.id}
            className={`rounded-2xl border-l-4 shadow-sm ${
              slotConflict   ? "bg-red-50 border border-red-300 border-l-red-500"
              : isCollabSlot ? "bg-emerald-50 border border-emerald-200 border-l-emerald-400"
              : isOfferSlot  ? "bg-violet-50 border border-violet-200 border-l-violet-400"
              : `bg-white border border-slate-100 ${LEFT_COLORS[dt]}`
            }`}>
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    slotConflict ? "bg-red-100" : isCollabSlot ? "bg-emerald-100" : isOfferSlot ? "bg-violet-100" : c.bg
                  }`}>
                    <span className={`material-symbols-outlined text-lg ${
                      slotConflict ? "text-red-500" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-600" : c.text
                    }`}>{isCollabSlot ? "handshake" : isOfferSlot ? "local_activity" : ICONS[dt]}</span>
                  </div>
                  <div className="min-w-0">
                    {/* Badge type */}
                    {isCollabSlot ? (
                      <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mb-0.5 bg-emerald-100 text-emerald-700">
                        Offre collaborative · {SECTION_LABEL[collabSec] ?? collabSec}
                      </span>
                    ) : isOfferSlot ? (
                      <span className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mb-0.5 bg-violet-100 text-violet-700">
                        Mon offre
                      </span>
                    ) : (
                      <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mb-0.5 ${
                        slotConflict ? "bg-red-100 text-red-600" : `${c.bg} ${c.text}`
                      }`}>
                        {SLOT_TYPE_LABELS[dt]}
                      </span>
                    )}
                    {/* Label */}
                    {cleanLabel && (
                      <p className={`text-sm font-extrabold truncate ${
                        slotConflict ? "text-red-800" : isCollabSlot ? "text-emerald-800" : isOfferSlot ? "text-violet-800" : "text-slate-800"
                      }`}>{cleanLabel}</p>
                    )}
                    <p className={`text-xs font-medium ${
                      slotConflict ? "text-red-400" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-500" : "text-slate-400"
                    }`}>{formatSlotSummary(slot)}</p>
                    {/* Message conflit */}
                    {slotConflict && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[11px] text-red-500 mt-0.5 shrink-0">warning</span>
                        <p className="text-[10px] text-red-600 font-semibold leading-tight">
                          Chevauche l'offre <strong>{slotConflict.offer}</strong> ({SECTION_LABEL[slotConflict.section] ?? slotConflict.section}) — supprimez ce créneau pour maintenir la collaboration.
                        </p>
                      </div>
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
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!isCollabSlot && !isOfferSlot && (
                    <button type="button" onClick={() => onEdit(slot)}
                      className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all">
                      <Pencil size={13} />
                    </button>
                  )}
                  {isOfferSlot && onEditOfferSlot && (
                    <button type="button" onClick={() => onEditOfferSlot(slot)}
                      title="Modifier le créneau de l'offre"
                      className="w-8 h-8 rounded-xl border border-violet-200 flex items-center justify-center text-violet-400 hover:text-violet-700 hover:border-violet-300 hover:bg-violet-50 transition-all">
                      <Pencil size={13} />
                    </button>
                  )}
                  <button type="button"
                    onClick={() =>
                      isCollabSlot ? onCollabLeave?.(slot.label!)
                      : isOfferSlot ? onDeleteOfferSlot?.(slot)
                      : remove(slot.id)
                    }
                    disabled={deleting === slot.id}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 ${
                      slotConflict   ? "border-red-200 text-red-400 hover:text-red-600 hover:bg-red-100"
                      : isCollabSlot ? "border-emerald-200 text-emerald-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
                      : isOfferSlot  ? "border-violet-200 text-violet-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
                      : "border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
                    }`}>
                    {deleting === slot.id
                      ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                      : <X size={13} />}
                  </button>
                </div>
              </div>

              {/* Par jour de semaine (récurrent / plage sans dates) */}
              {!!slot.days_of_week?.length && !dateKeyed && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {slot.days_of_week.map((d) => {
                    const w = slot.time_slots?.[d];
                    return (
                      <div key={d} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${c.bg}`}>
                        <span className={`text-[10px] font-extrabold ${c.text}`}>{FR_DAYS[Number(d)] ?? d}</span>
                        {w?.length && <span className={`text-[10px] font-medium ${c.text} opacity-80`}>· {formatTimeWindows(w)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Par date précise */}
              {dateRows.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {dateRows.map(({ label, windows }, i) => {
                    // Retrouver la date ISO correspondante à ce label
                    let isoDate = "";
                    if (slot.type === "specific" && slot.dates) {
                      isoDate = slot.dates.filter((d) => d >= todayStr)[i] ?? "";
                    } else if (dateKeyed && slot.time_slots) {
                      isoDate = Object.keys(slot.time_slots).filter((d) => d >= todayStr).sort()[i] ?? "";
                    }
                    const rowConflict = isoDate ? conflictDaySet.has(isoDate) : false;
                    return (
                      <div key={i} className={`flex items-center gap-3 px-2 py-1 rounded-lg ${rowConflict ? "bg-red-50" : ""}`}>
                        <span className={`text-[11px] font-bold w-14 shrink-0 ${rowConflict ? "text-red-600" : "text-slate-500"}`}>
                          {label}
                          {rowConflict && <span className="ml-1 text-red-500 font-black">!</span>}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Clock size={10} className={rowConflict ? "text-red-300 shrink-0" : "text-slate-300 shrink-0"} />
                          {windows?.length ? (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${rowConflict ? "bg-red-100 text-red-700" : `${c.bg} ${c.text}`}`}>
                              {formatTimeWindows(windows)}
                            </span>
                          ) : (
                            <span className={`text-[11px] font-medium ${rowConflict ? "text-red-400" : "text-slate-400"}`}>Journée entière</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {totalDateRows > 6 && (
                    <button type="button" onClick={() => toggleExpand(slot.id)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1 mt-0.5">
                      {isExpanded
                        ? "Masquer les jours supplémentaires ↑"
                        : `+${totalDateRows - 6} autres jours ↓`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ════════════════════════════════════════════════════════════
          VUE PAR JOUR  (CalendarDays)
          ════════════════════════════════════════════════════════════ */}
      {agendaStyle === "days" && upcomingDays.map((day) => {
        const ds = dateStr(day);
        const isToday = ds === todayStr;
        const daySlots = filteredSlots.filter((s) => slotCoversDay(s, day));
        const dayHasConflict = daySlots.some((s) => {
          const sk = s.label?.trim() || s.type;
          return conflictNotifs.some((cn) => cn.conflictSlotLabel === sk && cn.days.includes(ds));
        });

        return (
          <div key={ds} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${dayHasConflict ? "border-red-300" : "border-slate-100/80"}`}>
            {/* En-tête */}
            <div className={`flex items-center gap-3 px-5 py-3 border-b ${dayHasConflict ? "bg-red-50/60 border-red-100" : isToday ? "bg-emerald-50/60 border-slate-50" : "border-slate-50"}`}>
              <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${dayHasConflict ? "bg-red-500 text-white" : isToday ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                <span className="text-[9px] font-extrabold uppercase leading-none tracking-wide">
                  {format(day, "EEE", { locale: fr }).slice(0, 3)}
                </span>
                <span className="text-base font-black leading-snug">{format(day, "d")}</span>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-extrabold capitalize ${dayHasConflict ? "text-red-700" : isToday ? "text-emerald-700" : "text-slate-800"}`}>
                  {format(day, "EEEE d MMMM yyyy", { locale: fr })}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {daySlots.length} activité{daySlots.length > 1 ? "s" : ""}
                </p>
              </div>
              {dayHasConflict && (
                <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-100 border border-red-200 px-2 py-1 rounded-full">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  Conflit
                </span>
              )}
            </div>

            {/* Activités */}
            <div className="divide-y divide-slate-50">
              {daySlots.map((slot) => {
                const c  = SLOT_COLORS[displayType(slot)];
                const dt = displayType(slot);
                const windows = windowsForDay(slot, day);
                const sk = slot.label?.trim() || slot.type;
                const slotConflict = conflictNotifs.find((cn) => cn.conflictSlotLabel === sk && cn.days.includes(ds));
                const isCollabSlot = slot.label?.startsWith("[Collab]");
                const isOfferSlot  = !isCollabSlot && slot.label?.startsWith("[Offre]");
                const cleanLabel = isCollabSlot
                  ? slot.label!.replace(/^\[Collab\]\s*/, "").replace(/\s*—\s*\w+$/, "").trim()
                  : isOfferSlot
                  ? slot.label!.replace(/^\[Offre\]\s*/, "").trim()
                  : slot.label;
                const collabSec = isCollabSlot
                  ? slot.label!.match(/—\s*(\w+)$/)?.[1] ?? ""
                  : "";

                return (
                  <div key={slot.id} className={`px-5 py-4 ${
                    slotConflict ? "bg-red-50/60" : isCollabSlot ? "bg-emerald-50/40" : isOfferSlot ? "bg-violet-50/40" : ""
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Icône */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        slotConflict ? "bg-red-100" : isCollabSlot ? "bg-emerald-100" : isOfferSlot ? "bg-violet-100" : c.bg
                      }`}>
                        <span className={`material-symbols-outlined text-base ${
                          slotConflict ? "text-red-500" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-600" : c.text
                        }`}>{isCollabSlot ? "handshake" : isOfferSlot ? "local_activity" : ICONS[dt]}</span>
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        {/* Badge type */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {isCollabSlot ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Offre collaborative · {SECTION_LABEL[collabSec] ?? collabSec}
                            </span>
                          ) : isOfferSlot ? (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                              Mon offre
                            </span>
                          ) : (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              slotConflict ? "bg-red-100 text-red-600" : `${c.bg} ${c.text}`
                            }`}>
                              {slotConflict ? "Mon créneau" : SLOT_TYPE_LABELS[dt]}
                            </span>
                          )}
                        </div>

                        {/* Label */}
                        {cleanLabel && (
                          <p className={`text-xs font-extrabold mb-1.5 ${
                            slotConflict ? "text-red-700" : isCollabSlot ? "text-emerald-800" : isOfferSlot ? "text-violet-800" : "text-slate-700"
                          }`}>{cleanLabel}</p>
                        )}

                        {/* Horaires */}
                        {windows?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {windows.map((w, i) => (
                              <span key={i} className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                slotConflict ? "bg-red-100 text-red-700" : isCollabSlot ? "bg-emerald-100 text-emerald-700" : isOfferSlot ? "bg-violet-100 text-violet-700" : `${c.bg} ${c.text}`
                              }`}>
                                <Clock size={9} />{w.start.replace(":", "h")}–{w.end.replace(":", "h")}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className={`flex items-center gap-1 text-[11px] font-medium ${
                            slotConflict ? "text-red-400" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-500" : "text-slate-400"
                          }`}>
                            <Clock size={9} />Journée entière
                          </p>
                        )}

                        {/* Message conflit */}
                        {slotConflict && (
                          <div className="mt-2 flex items-start gap-1.5 bg-red-100 rounded-lg px-2.5 py-1.5">
                            <span className="material-symbols-outlined text-[11px] text-red-500 mt-0.5 shrink-0">info</span>
                            <p className="text-[10px] text-red-600 font-semibold leading-tight">
                              Chevauche l'offre <strong>{slotConflict.offer}</strong> ({SECTION_LABEL[slotConflict.section] ?? slotConflict.section}).
                              Supprimez-le pour maintenir la collaboration.
                            </p>
                          </div>
                        )}

                        {/* Info collab */}
                        {isCollabSlot && (
                          <p className="mt-1.5 text-[10px] text-emerald-600 font-medium">
                            Créneau réservé · offre collaborative
                          </p>
                        )}

                        {/* Info offre */}
                        {isOfferSlot && (
                          <p className="mt-1.5 text-[10px] text-violet-500 font-medium">
                            Créneau lié à votre offre
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0 mt-0.5">
                        {!isCollabSlot && !isOfferSlot && (
                          <button type="button" onClick={() => onEditDay(slot, day)}
                            className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-300 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all">
                            <Pencil size={11} />
                          </button>
                        )}
                        {isOfferSlot && onEditOfferSlot && (
                          <button type="button" onClick={() => onEditOfferSlot(slot)}
                            title="Modifier le créneau de l'offre"
                            className="w-7 h-7 rounded-lg border border-violet-200 flex items-center justify-center text-violet-300 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-all">
                            <Pencil size={11} />
                          </button>
                        )}
                        <button type="button"
                          onClick={() =>
                            isCollabSlot ? onCollabLeave?.(slot.label!)
                            : isOfferSlot ? onDeleteOfferSlot?.(slot)
                            : remove(slot.id)
                          }
                          disabled={deleting === slot.id}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
                            slotConflict   ? "border-red-200 text-red-300 hover:text-red-600 hover:bg-red-50"
                            : isOfferSlot  ? "border-violet-200 text-violet-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
                            : "border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50"
                          }`}>
                          {deleting === slot.id
                            ? <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                            : <X size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
