"use client";

import { useEffect, useMemo, useRef } from "react";
import { useOfferAvailability, type OfferAvailSlot } from "@/hooks/useOfferAvailability";

interface Props {
  avail: OfferAvailSlot;
  token: string;
  editOfferTitle?: string;
  onConflictChange?: (hasConflict: boolean) => void;
}

export default function AvailabilitySyncPanel({ avail, token, editOfferTitle, onConflictChange }: Props) {
  const { loadingAgenda, validateAvail, agendaSlots } = useOfferAvailability(token);

  // En mode édition, exclure les créneaux agenda créés par cette même offre
  const excludeIds = useMemo(() => {
    if (!editOfferTitle) return [];
    const label = `[Offre] ${editOfferTitle}`;
    return agendaSlots.filter((s) => s.label === label).map((s) => s.id);
  }, [editOfferTitle, agendaSlots]);

  const validation = useMemo(() => validateAvail(avail, excludeIds), [avail, validateAvail, excludeIds]);

  const onConflictChangeRef = useRef(onConflictChange);
  useEffect(() => { onConflictChangeRef.current = onConflictChange; });

  useEffect(() => {
    if (!loadingAgenda) onConflictChangeRef.current?.(validation.errors.length > 0);
  }, [validation.errors.length, loadingAgenda]);

  if (loadingAgenda) {
    return (
      <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
        <p className="text-xs text-slate-500 font-medium">Vérification de votre agenda…</p>
      </div>
    );
  }

  if (validation.errors.length > 0) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-base shrink-0">cancel</span>
          <p className="text-xs font-extrabold text-red-800">Conflit avec votre agenda</p>
        </div>
        {validation.errors.map((err, i) => (
          <div key={i} className="pl-6 space-y-1">
            <p className="text-[11px] text-red-700 font-semibold">{err.message}</p>
            {err.dates && err.dates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {err.dates.map((d) => (
                  <span key={d} className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-bold">{d}</span>
                ))}
                {err.dates.length === 5 && (
                  <span className="text-[10px] text-red-400">et d&apos;autres…</span>
                )}
              </div>
            )}
          </div>
        ))}
        <p className="pl-6 text-[10px] text-red-500 pt-2 border-t border-red-100">
          Mettez à jour votre agenda ou modifiez vos dates / horaires.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-2">
      <span className="material-symbols-outlined text-green-500 text-base shrink-0">check_circle</span>
      <p className="text-xs font-semibold text-green-700">
        Aucun conflit avec votre agenda — les disponibilités seront ajoutées à la publication.
      </p>
    </div>
  );
}
