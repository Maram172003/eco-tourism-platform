"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  ECHELLE_PAR_ROLE,
  progressionPalier,
  rangAtteint,
  scoreDurabilite,
  type BadgeStats,
} from "@/lib/constants/badges";

/**
 * Score de durabilité et badge — une seule carte.
 *
 * Les deux vivaient côte à côte sur le tableau de bord alors qu'ils décrivent
 * la même chose : le score **est** la progression dans l'échelle. Pire, le
 * score portait son propre vocabulaire (« Voyageur sensible », « Guide
 * Engagé »), un troisième jeu de noms parallèle à celui des badges.
 *
 * Ici le badge donne le titre, le score donne le chiffre, et le palier en cours
 * dit ce qui reste à faire pour le suivant.
 */
export default function ScoreBadgeCard({ role, scoreInitial, hrefDetail }: {
  role: string;
  /** Score du questionnaire : ce qu'on affiche tant qu'aucun palier n'est acquis. */
  scoreInitial: number | null | undefined;
  hrefDetail?: string;
}) {

  const router = useRouter();
  const [stats, setStats] = useState<BadgeStats | null>(null);

  useEffect(() => {
    apiFetch<BadgeStats>("/badges/me").then(setStats).catch(() => setStats(null));
  }, []);

  const echelle = ECHELLE_PAR_ROLE[role] ?? [];
  if (!echelle.length) return null;

  if (!stats) {
    return (
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-primary/10 lg:col-span-2">
        <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const rang = rangAtteint(echelle, stats);
  const tenu = rang > 0 ? echelle[rang - 1] : null;
  const vise = echelle[rang] ?? null;
  const score = scoreDurabilite(echelle, stats, scoreInitial);
  const criteres = vise ? vise.criteres(stats) : [];
  const scoreVise = Math.min(100, (rang + 1) * 20);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 lg:col-span-2">

      {/* Identité : le badge nomme, le score chiffre. */}
      <div className="flex items-start gap-4">
        <span className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center ${
          tenu ? "bg-primary/10 ring-1 ring-primary/20" : "bg-slate-100 dark:bg-slate-800"
        }`}>
          <span
            className={`material-symbols-outlined ${tenu ? "text-primary" : "text-slate-400"}`}
            style={{ fontSize: 26, ...(tenu ? { fontVariationSettings: '"FILL" 1' } : {}) }}
          >
            {tenu ? tenu.icon : "military_tech"}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-black leading-tight text-slate-900 dark:text-slate-50 truncate">
            {tenu ? tenu.nom : "Aucun badge décroché"}
          </h3>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            {tenu
              ? `Badge actuel · ${rang} palier${rang > 1 ? "s" : ""} sur ${echelle.length}`
              : "Passez votre questionnaire pour démarrer"}
          </p>
        </div>

        <p className="text-right shrink-0">
          <span className="block text-3xl font-black leading-none text-slate-900 dark:text-slate-50 tabular-nums">
            {score}
          </span>
          <span className="block text-[11px] font-bold text-slate-400">sur 100</span>
        </p>
      </div>

      {/* Les cinq marches — le score et la position ne font qu'un. */}
      <div className="flex gap-1.5 mt-3.5">
        {echelle.map((b, i) => (
          <span
            key={b.cle}
            title={b.nom}
            className={`h-2 flex-1 rounded-full transition-all duration-700 ${
              i < rang ? "bg-primary" : "bg-slate-100 dark:bg-slate-800"
            }`}
          />
        ))}
      </div>

      {/* Ce qui reste à faire, palier par palier. */}
      {vise ? (
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
              Prochain palier · <span className="text-slate-900 dark:text-slate-50">{vise.nom}</span>
            </p>
            <p className="text-xs font-black text-primary shrink-0 tabular-nums">→ {scoreVise}/100</p>
          </div>

          <div className="space-y-1.5">
            {criteres.map((c) => {
              const ok = c.actuel >= c.requis;
              return (
                <div key={c.label}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className={`text-[11px] font-semibold truncate ${ok ? "text-primary" : "text-slate-500 dark:text-slate-400"}`}>
                      {c.label}
                    </p>
                    <p className="text-[11px] font-black shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                      {Math.min(c.actuel, c.requis)}
                      <span className="text-slate-300 dark:text-slate-600"> / {c.requis}</span>
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${ok ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`}
                      style={{ width: `${c.requis > 0 ? Math.min(100, (c.actuel / c.requis) * 100) : 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-primary">
          Vous avez atteint le sommet de l&apos;échelle.
        </p>
      )}

      {/* L'invitation au questionnaire vit dans la bannière du tableau de
          bord : la répéter ici ferait deux appels pour la même action. */}
      <button
        onClick={() => router.push(hrefDetail ?? "/dashboard/profile?onglet=badges")}
        className="mt-3 text-[11px] font-bold text-primary hover:underline"
      >
        Voir tous les paliers →
      </button>
    </div>
  );
}
