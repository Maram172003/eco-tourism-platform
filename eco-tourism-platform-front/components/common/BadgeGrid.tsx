"use client";

import { useEffect, useState } from "react";
import {
  ECHELLE_PAR_ROLE, rangAtteint,
  type Badge, type BadgeStats,
} from "@/lib/constants/badges";
import { apiFetch } from "@/lib/api";

/**
 * Progression des badges — rendu unique partagé par les tableaux de bord, la
 * page Paramètres et les profils publics.
 *
 * L'échelle se lit de haut en bas comme un chemin : les badges franchis, celui
 * en cours avec ce qu'il reste à faire, puis ceux à venir. `details={false}`
 * n'affiche que l'en-tête — c'est la version du tableau de bord.
 */
export default function BadgeGrid({
  stats: statsProp, role, userId, compact = false, details = true,
}: {
  stats?: BadgeStats | null;
  role: string;
  /** Profil visité ; absent, on lit les compteurs du compte connecté. */
  userId?: string;
  /** Masque l'en-tête récapitulatif. */
  compact?: boolean;
  /** Conditions et barres de progression. */
  details?: boolean;
}) {
  const [stats, setStats] = useState<BadgeStats | null>(statsProp ?? null);

  useEffect(() => {
    if (statsProp !== undefined) { setStats(statsProp ? normaliser(statsProp) : statsProp); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const url = userId ? `/badges/${userId}/${role}` : "/badges/me";
    apiFetch<BadgeStats>(url, {
      headers: !userId && token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((r) => setStats(normaliser(r)))
      .catch(() => setStats(null));
  }, [statsProp, userId, role]);

  const echelle = ECHELLE_PAR_ROLE[role] ?? [];
  if (!echelle.length) return null;

  if (!stats) {
    return (
      <div className="space-y-3">
        <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        {details && echelle.map((b) => (
          <div key={b.cle} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const rang = rangAtteint(echelle, stats);
  const tenu = rang > 0 ? echelle[rang - 1] : null;
  const vise = echelle[rang] ?? null;

  return (
    <div className="space-y-5">
      {!compact && <Enseigne echelle={echelle} rang={rang} tenu={tenu} vise={vise} />}

      {details && (
        <ol className="relative">
          {/* Le fil qui relie les étapes — le chemin, pas une liste. */}
          <span className="absolute left-[18px] top-6 bottom-6 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
          {echelle.map((badge, i) => (
            <Etape
              key={badge.cle}
              badge={badge}
              stats={stats}
              rang={i + 1}
              etat={i < rang ? "acquis" : i === rang ? "en-cours" : "a-venir"}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Un compteur absent vaudrait `NaN` une fois divisé. On repart de zéro plutôt
 * que d'afficher une barre cassée si l'API évolue avant le client.
 */
function normaliser(s: BadgeStats): BadgeStats {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    ...s,
    sustainability_score:   n(s.sustainability_score),
    offers_published:       n(s.offers_published),
    offers_scored:          n(s.offers_scored),
    offers_avg_score:       n(s.offers_avg_score),
    circuits_published:     n(s.circuits_published),
    circuits_scored:        n(s.circuits_scored),
    circuits_avg_score:     n(s.circuits_avg_score),
    publications_published: n(s.publications_published),
    publications_scored:    n(s.publications_scored),
    publications_avg_score: n(s.publications_avg_score),
    publication_scores:     Array.isArray(s.publication_scores) ? s.publication_scores : [],
    places_shared:          n(s.places_shared),
    experiences_shared:     n(s.experiences_shared),
    contributions_made:     n(s.contributions_made),
    contribution_votes:     n(s.contribution_votes),
  };
}

/** Enseigne : le badge porté, mis en avant, et la marche suivante. */
function Enseigne({ echelle, rang, tenu, vise }: {
  echelle: Badge[]; rang: number; tenu: Badge | null; vise: Badge | null;
}) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${
      tenu
        ? "border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
    }`}>
      <div className="px-5 py-4 flex items-center gap-4">
        <span className={`h-14 w-14 shrink-0 rounded-2xl flex items-center justify-center ${
          tenu ? "bg-white dark:bg-slate-900 shadow-sm ring-1 ring-primary/20" : "bg-slate-200 dark:bg-slate-700"
        }`}>
          <span
            className={`material-symbols-outlined ${tenu ? "text-primary" : "text-slate-400"}`}
            style={{ fontSize: 30, ...(tenu ? { fontVariationSettings: '"FILL" 1' } : {}) }}
          >
            {tenu ? tenu.icon : "military_tech"}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            {tenu ? "Badge actuel" : "Aucun badge décroché"}
          </p>
          {tenu && (
            <p className="text-lg font-black leading-tight truncate text-slate-900 dark:text-slate-50">
              {tenu.nom}
            </p>
          )}
          {vise && (
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Prochain : <span className="text-slate-700 dark:text-slate-200 font-bold">{vise.nom}</span>
            </p>
          )}
        </div>

        <p className="shrink-0 text-right">
          <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
            {rang}
          </span>
          <span className="block text-[10px] font-bold text-slate-400 tabular-nums">
            sur {echelle.length}
          </span>
        </p>
      </div>

      {/* Les cinq marches, franchies ou non. */}
      <div className="flex gap-1 px-5 pb-4">
        {echelle.map((b, i) => (
          <span
            key={b.cle}
            title={b.nom}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < rang ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

type Etat = "acquis" | "en-cours" | "a-venir";

function Etape({ badge, stats, rang, etat }: {
  badge: Badge; stats: BadgeStats; rang: number; etat: Etat;
}) {
  const acquis  = etat === "acquis";
  const enCours = etat === "en-cours";
  const criteres = badge.criteres(stats);

  return (
    <li className="relative pl-11 pb-3 last:pb-0">
      {/* Jalon sur le fil */}
      <span className={`absolute left-0 top-3 h-9 w-9 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white dark:ring-slate-900 ${
        acquis  ? "bg-primary text-slate-900"
        : enCours ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
      }`}>
        {acquis
          ? <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: '"FILL" 1' }}>check</span>
          : rang}
      </span>

      <div className={`rounded-2xl border px-4 py-3 transition-all ${
        acquis  ? "border-primary/25 bg-primary/5"
        : enCours ? "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm"
        : "border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"
      }`}>
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-outlined shrink-0 ${
              acquis ? "text-primary" : enCours ? "text-slate-700 dark:text-slate-200" : "text-slate-300 dark:text-slate-600"
            }`}
            style={{ fontSize: 18, ...(acquis ? { fontVariationSettings: '"FILL" 1' } : {}) }}
          >
            {badge.icon}
          </span>
          <p className={`text-sm font-extrabold truncate ${
            acquis || enCours ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
          }`}>
            {badge.nom}
          </p>
          {acquis && (
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              Obtenu
            </span>
          )}
          {enCours && (
            <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900">
              En cours
            </span>
          )}
        </div>

        <p className={`text-[11px] mt-0.5 leading-snug ${
          enCours ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
        }`}>
          {badge.description}
        </p>

        {/* Conditions détaillées sur le badge en cours ; simple aperçu au-delà,
            pour que la suite du chemin reste lisible sans l'alourdir. */}
        {enCours ? (
          <div className="mt-3 space-y-2">
            {criteres.map((critere) => {
              const ok = critere.actuel >= critere.requis;
              return (
                <div key={critere.label}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className={`text-[11px] font-semibold truncate flex items-center gap-1 ${
                      ok ? "text-primary" : "text-slate-600 dark:text-slate-300"
                    }`}>
                      {ok && (
                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: '"FILL" 1' }}>
                          check_circle
                        </span>
                      )}
                      {critere.label}
                    </p>
                    <p className="text-[11px] font-black shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                      {Math.min(critere.actuel, critere.requis)}
                      <span className="text-slate-300 dark:text-slate-600"> / {critere.requis}</span>
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ok ? "bg-primary" : "bg-slate-400"}`}
                      style={{ width: `${Math.min(100, (critere.actuel / critere.requis) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : !acquis ? (
          <p className="mt-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
            {criteres.map((c) => `${c.label} ${c.requis}`).join(" · ")}
          </p>
        ) : null}
      </div>
    </li>
  );
}
