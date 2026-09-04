/**
 * Échelle de badges et score de durabilité — miroir de `lib/constants/badges.ts`.
 *
 * Le score n'est plus une entrée du système de badges, c'en est le résultat :
 * le questionnaire donne le point de départ, puis l'avancement dans les paliers
 * prend le relais. Aucun critère ne peut donc porter sur le score lui-même.
 *
 * Seuls les seuils vivent ici ; les noms, couleurs et libellés restent côté
 * client, qui seul les affiche. Les deux fichiers doivent rester alignés.
 */

export type StatsBadge = {
  questionnaire_done: boolean;
  /** Scores des offres et circuits publiés, pour compter ceux qui tiennent un seuil. */
  publication_scores: number[];
  places_shared: number;
  experiences_shared: number;
  contributions_made: number;
  contribution_votes: number;
};

/** Une condition mesurée : ce qui est atteint, ce qui est demandé. */
type Critere = { actuel: number; requis: number };

/** Nombre de publications atteignant un seuil de durabilité. */
function publicationsAuNiveau(s: StatsBadge, seuil: number): number {
  return (s.publication_scores ?? []).filter((n) => n >= seuil).length;
}

const partages = (s: StatsBadge) => s.places_shared + s.experiences_shared;

/** Guides et prestataires : questionnaire, puis qualité des publications. */
const ECHELLE_PRO: Array<(s: StatsBadge) => Critere[]> = [
  (s) => [
    { actuel: s.questionnaire_done ? 1 : 0, requis: 1 },
    { actuel: publicationsAuNiveau(s, 31), requis: 1 },
  ],
  (s) => [{ actuel: publicationsAuNiveau(s, 51), requis: 3 }],
  (s) => [{ actuel: publicationsAuNiveau(s, 51), requis: 5 }],
  (s) => [{ actuel: publicationsAuNiveau(s, 71), requis: 8 }],
  (s) => [{ actuel: publicationsAuNiveau(s, 71), requis: 12 }],
];

/** Éco-voyageurs : questionnaire, partages, contributions, reconnaissance. */
const ECHELLE_VOYAGEUR: Array<(s: StatsBadge) => Critere[]> = [
  (s) => [{ actuel: s.questionnaire_done ? 1 : 0, requis: 1 }],
  (s) => [{ actuel: partages(s), requis: 2 }],
  (s) => [
    { actuel: partages(s), requis: 5 },
    { actuel: s.contributions_made, requis: 3 },
  ],
  (s) => [
    { actuel: partages(s), requis: 10 },
    { actuel: s.contributions_made, requis: 10 },
  ],
  (s) => [
    { actuel: partages(s), requis: 20 },
    { actuel: s.contributions_made, requis: 20 },
    { actuel: s.contribution_votes, requis: 20 },
  ],
];

function echellePour(role: string): Array<(s: StatsBadge) => Critere[]> {
  if (role === 'guide' || role === 'provider') return ECHELLE_PRO;
  if (role === 'eco_traveler') return ECHELLE_VOYAGEUR;
  return [];
}

/** Rang atteint : l'échelle se gravit dans l'ordre, on s'arrête au premier trou. */
export function rangAtteint(role: string, s: StatsBadge): number {
  const echelle = echellePour(role);
  let rang = 0;
  for (const criteres of echelle) {
    if (!criteres(s).every((c) => c.actuel >= c.requis)) break;
    rang++;
  }
  return rang;
}

/**
 * Avancement dans le palier en cours, entre 0 et 1.
 *
 * Chaque condition pèse autant que les autres, pour que le score progresse
 * de façon continue plutôt que par sauts de vingt points.
 */
function progressionPalier(criteres: Critere[]): number {
  if (!criteres.length) return 0;
  const part = criteres.reduce(
    (t, c) => t + (c.requis > 0 ? Math.min(1, c.actuel / c.requis) : 1),
    0,
  );
  return Math.min(1, part / criteres.length);
}

/**
 * Score de durabilité produit par la progression.
 *
 * @param scoreInitial Score du questionnaire, amorce du compte.
 *
 * Le questionnaire ne sert qu'au démarrage : il donne un score au compte qui
 * vient d'être créé et n'a encore rien fait, et il permet de décrocher le
 * premier palier. Dès qu'un palier est acquis, c'est l'échelle qui fait le
 * score.
 */
export function scoreDurabilite(
  role: string,
  s: StatsBadge,
  scoreInitial: number | null | undefined,
): number {
  const echelle = echellePour(role);
  if (!echelle.length) return scoreInitial ?? 0;
  const rang = rangAtteint(role, s);
  if (rang === 0) {
    return typeof scoreInitial === 'number' && Number.isFinite(scoreInitial)
      ? Math.min(100, Math.round(scoreInitial))
      : 0;
  }
  const enCours = echelle[rang];
  const parEchelle = rang * 20 + (enCours ? progressionPalier(enCours(s)) * 20 : 0);
  return Math.min(100, Math.round(parEchelle));
}
