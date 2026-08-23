"use client";

import {
  getOfferSustainabilityLevel,
  getCircuitSustainabilityLevel,
} from "@/lib/constants/sustainability";

/**
 * Pastille de score de durabilité — offre ou circuit.
 *
 * Un seul rendu partout : les offres affichaient auparavant un bloc « barre de
 * progression + libellé » distinct de la pastille compacte des circuits.
 * C'est cette dernière qui fait référence.
 */
export default function SustainabilityBadge({ score, kind = "offer", variant = "default", className = "" }: {
  score: number | null | undefined;
  kind?: "offer" | "circuit";
  /** `overlay` : posé sur une photo — fond opaque pour rester lisible. */
  variant?: "default" | "overlay" | "compact";
  className?: string;
}) {
  if (score === null || score === undefined) return null;
  const level = kind === "circuit"
    ? getCircuitSustainabilityLevel(score)
    : getOfferSustainabilityLevel(score);

  const fond = variant === "overlay" ? "bg-white/95 backdrop-blur-sm shadow-sm" : level.bg;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${fond} ${level.color} ${className}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{level.icon}</span>
      {variant !== "compact" && <span className="text-[11px] font-extrabold">{level.label}</span>}
      <span className="text-[11px] font-bold opacity-70">{score}/100</span>
    </div>
  );
}
