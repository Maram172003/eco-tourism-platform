"use client";

import { useEffect, useState } from "react";
import { ECHELLE_PAR_ROLE, rangAtteint, type BadgeStats } from "@/lib/constants/badges";
import { apiFetch } from "@/lib/api";

/**
 * Étiquette du badge porté, pour l'en-tête des profils.
 *
 * Remplace le libellé de niveau de score (« Prestataire en Développement »),
 * et prend la couleur propre du badge. Sans badge décroché, elle disparaît :
 * il n'y a rien à annoncer.
 *
 * `userId` sert aux profils visités ; sans lui, on lit le compte connecté.
 */
export default function BadgeLabel({
  role, userId, taille = 10,
}: {
  role: string;
  userId?: string;
  /** Taille de l'icône, pour s'accorder aux en-têtes existants. */
  taille?: number;
}) {
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const echelle = ECHELLE_PAR_ROLE[role] ?? [];

  useEffect(() => {
    if (!echelle.length) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const url = userId ? `/badges/${userId}/${role}` : "/badges/me";
    if (!userId && !token) return;
    apiFetch<BadgeStats>(url, {
      headers: !userId && token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then(setStats)
      .catch(() => setStats(null));
  }, [role, userId, echelle.length]);

  if (!echelle.length || !stats) return null;
  const badge = echelle[rangAtteint(echelle, stats) - 1];
  if (!badge) return null;

  const c = badge.couleur;
  return (
    <div className={`${c.fond} ${c.texte} border ${c.bord} text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider`}>
      <span className="material-symbols-outlined" style={{ fontSize: taille, fontVariationSettings: '"FILL" 1' }}>
        {badge.icon}
      </span>
      {badge.nom}
    </div>
  );
}
