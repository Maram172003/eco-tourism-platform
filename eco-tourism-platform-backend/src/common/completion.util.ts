/**
 * Détail d'une complétion de profil.
 *
 * Le pourcentage seul ne dit pas ce qu'il manque : un profil à 45 % laisse son
 * propriétaire deviner. Chaque rôle décrit ici son barème sous forme de lignes,
 * et le score s'en déduit — les deux ne peuvent donc plus diverger.
 */

export type LigneCompletion = {
  /** Étape de l'inscription à laquelle la ligne appartient. */
  etape: string;
  label: string;
  /** Points que la ligne rapporte quand elle est remplie. */
  poids: number;
  /** Points effectivement obtenus — partiel quand la ligne compte plusieurs champs. */
  obtenus: number;
};

/** Une ligne tout ou rien. */
export function ligne(etape: string, label: string, poids: number, rempli: unknown): LigneCompletion {
  const ok = Array.isArray(rempli) ? rempli.length > 0
    : typeof rempli === 'number' ? Number.isFinite(rempli)
    : !!rempli;
  return { etape, label, poids, obtenus: ok ? poids : 0 };
}

/** Une ligne qui compte plusieurs champs et rapporte au prorata. */
export function lignePartielle(
  etape: string,
  label: string,
  poids: number,
  champs: unknown[],
): LigneCompletion {
  const remplis = champs.filter((c) => (Array.isArray(c) ? c.length > 0 : !!c)).length;
  return {
    etape,
    label: `${label} (${remplis}/${champs.length})`,
    poids,
    obtenus: champs.length ? Math.round((remplis / champs.length) * poids) : 0,
  };
}

/** Le pourcentage, plafonné à 100. */
export function totalCompletion(lignes: LigneCompletion[]): number {
  return Math.min(100, Math.round(lignes.reduce((t, l) => t + l.obtenus, 0)));
}
