"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isPast, startOfDay, isToday, addMonths, subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import {
  FR_DAYS, FR_MONTHS, SLOT_COLORS, getDominantSlot, displayType, formatSlotSummary,
  type AvailabilitySlot,
} from "@/lib/availabilityConflicts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface Props {
  guideId: string;
  token: string;
  onClose: () => void;
}

export default function PublicPreviewModal({ guideId, token, onClose }: Props) {
  const [slots,   setSlots]   = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [current, setCurrent] = useState(new Date());

  const fetchSlots = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/guide/public/${guideId}/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : (data.slots ?? []));
    } catch {
      setError("Impossible de charger les disponibilités publiques.");
    } finally {
      setLoading(false);
    }
  }, [guideId, token]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const calStart = startOfWeek(startOfMonth(current), { weekStartsOn: 1 });
  const calEnd   = endOfWeek(endOfMonth(current),     { weekStartsOn: 1 });
  const calDays  = eachDayOfInterval({ start: calStart, end: calEnd });

  function dayColor(day: Date): string {
    const past = isPast(startOfDay(day)) && !isToday(day);
    if (past) return "bg-slate-50 text-slate-200";
    const dom = getDominantSlot(day, slots);
    if (!dom) return "bg-white text-slate-400";
    const c = SLOT_COLORS[displayType(dom)];
    const ring = isToday(day) ? " ring-2 ring-primary ring-offset-1" : "";
    return `${c.bg} ${c.text}${ring}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Eye size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-800">Vue voyageur</p>
              <p className="text-xs text-slate-400 font-medium">Ce que les touristes voient de vos disponibilités</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Navigation mois */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setCurrent((p) => subMonths(p, 1))}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16} className="text-slate-500" />
            </button>
            <span className="text-sm font-extrabold text-slate-800">
              {FR_MONTHS[current.getMonth()]} {current.getFullYear()}
            </span>
            <button type="button" onClick={() => setCurrent((p) => addMonths(p, 1))}
              className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
              <ChevronRight size={16} className="text-slate-500" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button type="button" onClick={fetchSlots}
                className="mt-3 px-4 py-1.5 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors">
                Réessayer
              </button>
            </div>
          ) : (
            <>
              {/* Grille calendrier read-only */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                  {FR_DAYS.map((d) => (
                    <div key={d} className="text-center text-[9px] font-extrabold text-slate-400 uppercase py-2 tracking-wider">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px bg-slate-100 p-px">
                  {calDays.map((day) => {
                    const inMonth = day.getMonth() === current.getMonth();
                    const dom     = getDominantSlot(day, slots);
                    return (
                      <div key={day.toISOString()}
                        title={dom ? (dom.label ?? formatSlotSummary(dom)) : undefined}
                        className={`aspect-square rounded-sm flex items-center justify-center text-[11px] font-bold transition-colors ${dayColor(day)} ${!inMonth ? "opacity-30" : ""}`}>
                        {format(day, "d")}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Légende */}
              <div className="flex flex-wrap gap-3 mt-4">
                {(["specific","range","recurring","season"] as const).map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${SLOT_COLORS[t].dot}`} />
                    <span className="text-[10px] font-bold text-slate-400">
                      {t === "specific" ? "Date" : t === "range" ? "Plage" : t === "recurring" ? "Récurrent" : "Saison"}
                    </span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-slate-100" />
                  <span className="text-[10px] font-bold text-slate-400">Non disponible</span>
                </div>
              </div>

              {/* Résumé des créneaux actifs */}
              {slots.length > 0 && (
                <div className="mt-4 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Créneaux actifs</p>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {slots.map((s) => {
                      const c = SLOT_COLORS[displayType(s)];
                      return (
                        <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${c.bg} border ${c.border}`}>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/60 ${c.text}`}>
                            {displayType(s) === "season" ? "Saison" : displayType(s)}
                          </span>
                          {s.label && <span className={`text-xs font-bold ${c.text} truncate`}>{s.label}</span>}
                          <span className={`text-[10px] ${c.text} opacity-70 ml-auto`}>{formatSlotSummary(s)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
