"use client";

import { X, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  SLOT_COLORS, SLOT_TYPE_LABELS, displayType, dateStr,
  type AvailabilitySlot,
} from "@/lib/availabilityConflicts";

type ConflictInfo = { offer: string; section: string; conflictSlotLabel: string; days: string[] };

const SECTION_LABEL: Record<string, string> = {
  hebergement: "Hébergement", restauration: "Restauration",
  transport: "Transport", guide: "Guidage", autre: "Autre",
};

interface Props {
  day: Date;
  slots: AvailabilitySlot[];
  conflictNotifs?: ConflictInfo[];
  onClose: () => void;
  onAddSlot: (ds: string) => void;
  onDelete?: (id: string) => void;
  onCollabLeave?: (slotLabel: string) => void;
}

const ICONS: Record<string, string> = {
  specific: "event", range: "date_range", recurring: "autorenew", season: "sunny",
};

export default function DayDetailPanel({ day, slots, conflictNotifs = [], onClose, onAddSlot, onDelete, onCollabLeave }: Props) {
  const ds   = dateStr(day);
  const wday = String((day.getDay() + 6) % 7);

  const daySlots = slots.filter((s) => {
    if (s.type === "specific") return s.dates?.includes(ds);
    if (s.type === "range" && s.start_date && s.end_date) {
      if (ds < s.start_date || ds > s.end_date) return false;
      return !s.days_of_week?.length || s.days_of_week.includes(wday);
    }
    if (s.type === "recurring" && s.days_of_week?.includes(wday)) {
      if (s.start_date && ds < s.start_date) return false;
      if (s.end_date   && ds > s.end_date)   return false;
      return true;
    }
    return false;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
            Jour sélectionné
          </p>
          <p className="text-sm font-extrabold text-slate-800 capitalize">
            {format(day, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <button type="button" onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <X size={14} className="text-slate-500" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {daySlots.length === 0 ? (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-slate-200 text-4xl block mb-2">event_available</span>
            <p className="text-xs font-bold text-slate-400">Aucun créneau ce jour</p>
            <p className="text-[11px] text-slate-300 mt-0.5">Ce jour est entièrement libre</p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {daySlots.length} créneau{daySlots.length > 1 ? "x" : ""}
            </p>
            {daySlots.map((slot) => {
              const c  = SLOT_COLORS[displayType(slot)];
              const dt = displayType(slot);
              const windows = slot.time_slots
                ? (slot.time_slots[ds] ?? slot.time_slots[wday] ?? null)
                : null;
              const slotKey = slot.label?.trim() || slot.type;
              const slotConflict = conflictNotifs.find((cn) =>
                cn.days.includes(ds) && cn.conflictSlotLabel === slotKey
              );
              const isCollabSlot = slot.label?.startsWith("[Collab]");
              const isOfferSlot  = !isCollabSlot && slot.label?.startsWith("[Offre]");
              const cleanLabel = isCollabSlot
                ? slot.label!.replace(/^\[Collab\]\s*/, "").replace(/\s*—\s*\w+$/, "").trim()
                : isOfferSlot
                ? slot.label!.replace(/^\[Offre\]\s*/, "").trim()
                : slot.label;
              const collabSection = isCollabSlot
                ? slot.label!.match(/—\s*(\w+)$/)?.[1] ?? ""
                : "";
              return (
                <div key={slot.id} className={`rounded-2xl p-3.5 border ${
                  slotConflict   ? "border-red-300 bg-red-50"
                  : isCollabSlot ? "border-emerald-200 bg-emerald-50"
                  : isOfferSlot  ? "border-violet-200 bg-violet-50"
                  : `${c.border} ${c.bg}`
                }`}>
                  {/* En-tête */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`material-symbols-outlined text-sm ${
                      slotConflict ? "text-red-500" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-600" : c.text
                    }`}>
                      {isCollabSlot ? "handshake" : isOfferSlot ? "local_activity" : ICONS[dt]}
                    </span>
                    {isCollabSlot ? (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Offre collaborative · {SECTION_LABEL[collabSection] ?? collabSection}
                      </span>
                    ) : isOfferSlot ? (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                        Mon offre
                      </span>
                    ) : (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/60 ${slotConflict ? "text-red-600" : c.text}`}>
                        {slotConflict ? "Mon créneau personnel" : SLOT_TYPE_LABELS[dt]}
                      </span>
                    )}
                    {(onDelete || (isCollabSlot && onCollabLeave)) && (
                      <button type="button"
                        onClick={() => isCollabSlot ? onCollabLeave?.(slot.label!) : onDelete?.(slot.id)}
                        title={isCollabSlot ? "Quitter la collaboration" : "Supprimer ce créneau"}
                        className="ml-auto w-6 h-6 flex items-center justify-center rounded-full bg-white/60 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Nom */}
                  {cleanLabel && (
                    <p className={`text-xs font-extrabold mb-1 ${
                      slotConflict ? "text-red-700" : isCollabSlot ? "text-emerald-800" : isOfferSlot ? "text-violet-800" : c.text
                    }`}>
                      {cleanLabel}
                    </p>
                  )}

                  {/* Horaires */}
                  {windows?.length ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {windows.map((w, i) => (
                        <span key={i} className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                          slotConflict ? "bg-red-100 text-red-700"
                          : isCollabSlot ? "bg-emerald-100 text-emerald-700"
                          : isOfferSlot ? "bg-violet-100 text-violet-700"
                          : `bg-white/60 ${c.text}`
                        }`}>
                          {w.start.replace(":", "h")}–{w.end.replace(":", "h")}
                          {w.label && <span className="font-normal opacity-70 ml-1 italic">{w.label}</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-[11px] font-semibold mt-1 ${
                      slotConflict ? "text-red-400" : isCollabSlot ? "text-emerald-600" : isOfferSlot ? "text-violet-500" : `${c.text} opacity-60`
                    }`}>
                      Journée entière
                    </p>
                  )}

                  {/* Message d'action conflit */}
                  {slotConflict && (
                    <div className="mt-2 pt-2 border-t border-red-200 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[12px] text-red-500 mt-0.5 shrink-0">info</span>
                      <p className="text-[10px] text-red-600 font-semibold leading-tight">
                        Chevauche l'offre <strong>{slotConflict.offer}</strong> ({SECTION_LABEL[slotConflict.section] ?? slotConflict.section}).
                        Supprimez-le pour maintenir la collaboration.
                      </p>
                    </div>
                  )}

                  {/* Info slot collab */}
                  {isCollabSlot && !slotConflict && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[12px] text-emerald-500 shrink-0">info</span>
                      <p className="text-[10px] text-emerald-700 font-semibold">Créneau réservé pour cette offre collaborative.</p>
                    </div>
                  )}

                  {/* Info slot offre */}
                  {isOfferSlot && !slotConflict && (
                    <div className="mt-2 pt-2 border-t border-violet-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[12px] text-violet-500 shrink-0">info</span>
                      <p className="text-[10px] text-violet-700 font-semibold">Créneau lié à votre offre publiée.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        <button type="button" onClick={() => onAddSlot(ds)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all text-xs font-bold">
          <Plus size={14} />
          Ajouter une disponibilité
        </button>
      </div>
    </div>
  );
}
