"use client";

import { useState } from "react";
import { Clock, Edit2, X } from "lucide-react";
import { formatTimeWindows, type AvailabilitySlot, type TimeSlots } from "@/lib/availabilityConflicts";
import TimeSlotModal from "./TimeSlotModal";

interface Props {
  mode: "specific" | "range" | "recurring";
  keys: string[];
  value: TimeSlots;
  existingSlots: AvailabilitySlot[]; // for cross-slot blocking (excludes the slot being edited, if any)
  onChange: (v: TimeSlots) => void;
  /** True when this editor is triggered from inside another modal (EditSlotModal, QuickFillModal…) —
   *  renders as a side panel instead of a full dark overlay stacked on top of the parent modal. */
  nested?: boolean;
  /** Notifies the parent modal when the horaires panel opens/closes, so it can shift aside to make room. */
  onOpenChange?: (open: boolean) => void;
}

export default function TimeSlotEditor({ mode, keys, value, existingSlots, onChange, nested = false, onOpenChange }: Props) {
  const [open, setOpenState] = useState(false);
  const setOpen = (v: boolean) => { setOpenState(v); onOpenChange?.(v); };
  if (!keys.length) return null;

  const hasSlots = Object.keys(value).length > 0;

  function preview(): string {
    if (!hasSlots) return "";
    const vals = Object.values(value);
    if (!vals.length) return "";
    const first = JSON.stringify(vals[0]);
    const uniform = vals.every((v) => JSON.stringify(v) === first);
    if (uniform && vals[0]) return formatTimeWindows(vals[0]);
    return `Personnalisé (${Object.keys(value).length} ${mode === "specific" ? "dates" : "jours"})`;
  }

  return (
    <>
      {/* Trigger button */}
      {!hasSlots ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 py-3 px-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50/50 transition-all group">
          <Clock size={15} className="group-hover:text-violet-400" />
          <span className="text-xs font-bold flex-1 text-left">Ajouter des horaires</span>
          <span className="text-[10px] font-semibold text-slate-300">optionnel</span>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 bg-violet-50 border-2 border-violet-200 rounded-2xl">
          <Clock size={15} className="text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Horaires</p>
            <p className="text-xs font-bold text-violet-800 truncate">{preview()}</p>
          </div>
          <button type="button" onClick={() => setOpen(true)}
            className="w-7 h-7 rounded-xl bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition-colors">
            <Edit2 size={12} className="text-violet-500" />
          </button>
          <button type="button" onClick={() => onChange({})}
            className="w-7 h-7 rounded-xl bg-violet-100 hover:bg-red-100 flex items-center justify-center transition-colors group">
            <X size={12} className="text-violet-400 group-hover:text-red-500" />
          </button>
        </div>
      )}

      {/* Modal */}
      {open && (
        <TimeSlotModal
          mode={mode}
          keys={keys}
          initial={value}
          existingSlots={existingSlots}
          onSave={onChange}
          onClose={() => setOpen(false)}
          nested={nested}
        />
      )}
    </>
  );
}
