"use client";

import { useEffect, useState } from "react";
import { ECHELLE_PAR_ROLE, rangAtteint, type BadgeStats } from "@/lib/constants/badges";
import { apiFetch } from "@/lib/api";

/**
 * Pastille du bandeau : le badge porté.
 *
 * Rend la pastille entière, et non son seul texte : sans badge décroché il n'y
 * a rien à annoncer, la pastille disparaît donc complètement plutôt que
 * d'afficher « Aucun badge ».
 *
 * `fallback` couvre les rôles sans échelle définie — le porteur de projet — et
 * le temps de la requête, pour éviter que la pastille clignote.
 */
export default function BadgeChip({
  role, fallback, icon = "verified_user",
}: {
  role: string;
  fallback: string;
  icon?: string;
}) {
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const echelle = ECHELLE_PAR_ROLE[role] ?? [];

  useEffect(() => {
    if (!echelle.length) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;
    apiFetch<BadgeStats>("/badges/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(setStats)
      .catch(() => setStats(null));
  }, [role, echelle.length]);

  const badge = echelle.length && stats
    ? echelle[rangAtteint(echelle, stats) - 1] ?? null
    : null;

  // Compteurs chargés, aucun badge décroché : on n'affiche rien.
  if (echelle.length && stats && !badge) return null;

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-5 py-2 gap-2 whitespace-nowrap">
      <span className="material-symbols-outlined text-primary text-base">
        {badge?.icon ?? icon}
      </span>
      <span className="text-sm font-semibold">{badge?.nom ?? fallback}</span>
    </div>
  );
}
