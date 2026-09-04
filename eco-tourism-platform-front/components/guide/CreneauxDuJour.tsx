"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Les créneaux du guide pour aujourd'hui.
 *
 * L'agenda vit dans `guide_availability_slots`, où chaque ligne décrit une
 * disponibilité par sa règle (date précise, période, récurrence) et porte ses
 * horaires dans un JSON indexé par date. On ne garde ici que ce qui tombe
 * aujourd'hui : c'est la seule question que se pose un guide en ouvrant son
 * tableau de bord.
 */

type Creneau = { start: string; end: string };

type Slot = {
  id: string;
  type: string;
  dates?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  days_of_week?: string[] | null;
  label?: string | null;
  time_slots?: Record<string, Creneau[]> | null;
};

/** Aujourd'hui au format ISO, en heure locale — `toISOString` décalerait le jour. */
function aujourdhuiISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Jour de la semaine au format de l'agenda : 0 = lundi … 6 = dimanche. */
function jourAgenda(iso: string): string {
  const js = new Date(`${iso}T12:00:00`).getDay(); // 0 = dimanche
  return js === 0 ? "6" : String(js - 1);
}

/** La règle de ce créneau couvre-t-elle cette date ? */
function couvre(slot: Slot, iso: string): boolean {
  if (slot.type === "specific") {
    return (slot.dates ?? []).map((d) => String(d).slice(0, 10)).includes(iso);
  }
  if (slot.type === "recurring") {
    const jours = (slot.days_of_week ?? []).map(String);
    if (jours.length && !jours.includes(jourAgenda(iso))) return false;
  }
  const debut = slot.start_date ? String(slot.start_date).slice(0, 10) : null;
  const fin = slot.end_date ? String(slot.end_date).slice(0, 10) : null;
  if (debut && iso < debut) return false;
  if (fin && iso > fin) return false;
  return debut !== null || fin !== null || slot.type === "recurring";
}

/** Le label porte son origine entre crochets : on la sépare du titre. */
function decomposer(label: string | null | undefined): { origine: string | null; titre: string } {
  const brut = (label ?? "").trim();
  const m = brut.match(/^\[([^\]]+)\]\s*(.*)$/);
  return m ? { origine: m[1], titre: m[2] || "Sans titre" } : { origine: null, titre: brut || "Disponibilité" };
}

export default function CreneauxDuJour({ hrefAgenda }: { hrefAgenda: string }) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const iso = useMemo(aujourdhuiISO, []);

  useEffect(() => {
    apiFetch<Slot[]>("/guide/availability")
      .then((r) => setSlots(Array.isArray(r) ? r : []))
      .catch(() => setSlots([]));
  }, []);

  type Ligne = { id: string; start: string | null; end: string | null; origine: string | null; titre: string };
  const duJour: Ligne[] = (slots ?? [])
    .filter((s) => couvre(s, iso))
    .flatMap((s): Ligne[] => {
      const heures = s.time_slots?.[iso] ?? [];
      const { origine, titre } = decomposer(s.label);
      // Sans horaire précisé, la disponibilité vaut pour la journée entière.
      if (!heures.length) return [{ id: s.id, start: null, end: null, origine, titre }];
      return heures.map((h, i) => ({ id: `${s.id}-${i}`, start: h.start, end: h.end, origine, titre }));
    })
    .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));

  const date = new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Mes créneaux aujourd&apos;hui</h3>
        <button onClick={() => router.push(hrefAgenda)} className="text-xs font-bold text-primary hover:underline">
          Agenda
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{date}</p>

        {slots === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : duJour.length === 0 ? (
          <div className="text-center py-4">
            <CalendarClock className="w-7 h-7 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Aucun créneau</p>
            <p className="text-xs text-slate-400 mt-0.5">Journée libre.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {duJour.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                {/* L'heure d'abord : c'est ce qu'on cherche dans un agenda. */}
                <span className="shrink-0 w-[86px] text-xs font-black text-slate-800 dark:text-slate-100 tabular-nums">
                  {c.start ? `${c.start}–${c.end}` : "Journée"}
                </span>
                <span className="w-px self-stretch bg-slate-100 dark:bg-slate-800" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                    {c.titre}
                  </span>
                  {c.origine && (
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      {c.origine}
                    </span>
                  )}
                </span>
              </li>
            ))}
            {duJour.length > 4 && (
              <li className="text-[11px] font-bold text-slate-400 pt-1">
                +{duJour.length - 4} autre{duJour.length - 4 > 1 ? "s" : ""}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
