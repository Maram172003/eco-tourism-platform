/**
 * Système de badges — barème unique de la plateforme.
 *
 * Le serveur (`GET /badges/me`) ne renvoie que des compteurs bruts ; les
 * conditions et les noms vivent ici, pour que la grille du tableau de bord et
 * celle d'un profil visité affichent rigoureusement la même chose.
 *
 * Chaque rôle suit **une progression** : une échelle de badges portant chacun
 * son propre nom, à gravir dans l'ordre. Un badge n'est acquis que si toutes
 * ses conditions le sont, et il faut tenir le précédent pour prétendre au
 * suivant.
 */

export type BadgeStats = {
  role: "guide" | "provider" | "eco_traveler" | null;
  sustainability_score: number;
  questionnaire_done: boolean;
  offers_published: number;
  offers_scored: number;
  offers_avg_score: number;
  circuits_published: number;
  circuits_scored: number;
  circuits_avg_score: number;
  publications_published: number;
  publications_scored: number;
  publications_avg_score: number;
  publication_scores: number[];
  places_shared: number;
  experiences_shared: number;
  contributions_made: number;
  contribution_votes: number;
};

/** Une condition mesurée, telle qu'annoncée à l'utilisateur. */
export type Critere = { label: string; actuel: number; requis: number };

/** Teintes Tailwind d'un badge — sa couleur propre, distincte des autres. */
export type CouleurBadge = { texte: string; fond: string; bord: string; plein: string };

export type Badge = {
  cle: string;
  /** Nom propre du badge — jamais un intitulé de catégorie. */
  nom: string;
  /** Ce que le badge dit de son porteur. */
  description: string;
  icon: string;
  /** Une couleur par badge, en progression du plus tiède au plus vert. */
  couleur: CouleurBadge;
  criteres: (s: BadgeStats) => Critere[];
};

/**
 * Palette de la progression : chaque rang a sa teinte, du terreux au vert vif.
 * Elle donne un repère visuel immédiat sans qu'il faille lire le nom.
 */
export const TEINTES: CouleurBadge[] = [
  { texte: "text-amber-700",   fond: "bg-amber-50",   bord: "border-amber-200",   plein: "bg-amber-500" },
  { texte: "text-lime-700",    fond: "bg-lime-50",    bord: "border-lime-200",    plein: "bg-lime-500" },
  { texte: "text-teal-700",    fond: "bg-teal-50",    bord: "border-teal-200",    plein: "bg-teal-500" },
  { texte: "text-emerald-700", fond: "bg-emerald-50", bord: "border-emerald-200", plein: "bg-emerald-500" },
  { texte: "text-primary",     fond: "bg-primary/10", bord: "border-primary/40",  plein: "bg-primary" },
];

/**
 * Nombre de publications atteignant un seuil de durabilité.
 *
 * On compte au lieu de moyenner : une moyenne laisse une excellente offre
 * compenser deux médiocres (90, 30, 30 → 50, seuil franchi). Ici chaque
 * publication doit tenir le seuil pour compter, et une publication faible ne
 * retire rien à celles qui l'ont déjà atteint — un badge acquis ne se perd pas.
 */
export function publicationsAuNiveau(s: BadgeStats, seuil: number): number {
  return (s.publication_scores ?? []).filter((n) => n >= seuil).length;
}

export function badgeSatisfait(b: Badge, s: BadgeStats): boolean {
  return b.criteres(s).every((c) => c.actuel >= c.requis);
}

/**
 * Rang atteint dans la progression : l'échelle se gravit dans l'ordre, on
 * s'arrête donc au premier barreau manquant.
 */
export function rangAtteint(echelle: Badge[], s: BadgeStats): number {
  let rang = 0;
  for (const b of echelle) {
    if (!badgeSatisfait(b, s)) break;
    rang++;
  }
  return rang;
}

/** Le badge en cours de conquête, ou `null` si la progression est terminée. */
export function badgeEnCours(echelle: Badge[], s: BadgeStats): Badge | null {
  return echelle[rangAtteint(echelle, s)] ?? null;
}

// ── Progression des guides et des prestataires ───────────────────────────────
//
// Elle repose sur trois choses à la fois : le questionnaire du profil, le
// nombre d'offres et de circuits publiés, et leur score de durabilité moyen.
// Publier beaucoup sans soigner l'évaluation ne fait pas avancer.

function echellePro(nomFinal: string): Badge[] {
  return [
    {
      cle: "empreinte",
      nom: "Première Empreinte",
      description: "Profil évalué et première prestation correctement notée.",
      icon: "footprint",
      couleur: TEINTES[0],
      criteres: (s) => [
        { label: "Questionnaire du profil",       actuel: s.questionnaire_done ? 1 : 0,     requis: 1 },
        { label: "Publications notées 31 ou plus", actuel: publicationsAuNiveau(s, 31),      requis: 1 },
      ],
    },
    {
      cle: "artisan",
      nom: "Artisan du Territoire",
      description: "Une offre régulière, ancrée localement et réellement engagée.",
      icon: "handyman",
      couleur: TEINTES[1],
      criteres: (s) => [
        { label: "Publications notées 51 ou plus", actuel: publicationsAuNiveau(s, 51), requis: 3 },
      ],
    },
    {
      cle: "batisseur",
      nom: "Bâtisseur Durable",
      description: "Un catalogue étoffé dont chaque prestation tient le niveau.",
      icon: "foundation",
      couleur: TEINTES[2],
      criteres: (s) => [
        { label: "Publications notées 51 ou plus", actuel: publicationsAuNiveau(s, 51), requis: 5 },
        { label: "Score du profil",                actuel: s.sustainability_score,      requis: 50 },
      ],
    },
    {
      cle: "gardien",
      nom: "Gardien des Sentiers",
      description: "Une référence locale, éco-responsable sur l'ensemble de son offre.",
      icon: "forest",
      couleur: TEINTES[3],
      criteres: (s) => [
        { label: "Publications notées 71 ou plus", actuel: publicationsAuNiveau(s, 71), requis: 8 },
        { label: "Score du profil",                actuel: s.sustainability_score,      requis: 65 },
      ],
    },
    {
      cle: "ambassadeur",
      nom: nomFinal,
      description: "Le plus haut niveau : chaque prestation est exemplaire.",
      icon: "workspace_premium",
      couleur: TEINTES[4],
      criteres: (s) => [
        { label: "Publications notées 71 ou plus", actuel: publicationsAuNiveau(s, 71), requis: 12 },
        { label: "Score du profil",                actuel: s.sustainability_score,      requis: 80 },
      ],
    },
  ];
}

// ── Progression des éco-voyageurs ────────────────────────────────────────────
//
// Elle repose sur le questionnaire, les lieux et expériences partagés, et les
// contributions apportées aux lieux des autres.

const partages = (s: BadgeStats) => s.places_shared + s.experiences_shared;

const ECHELLE_VOYAGEUR: Badge[] = [
  {
    cle: "reperes",
    nom: "Premiers Repères",
    description: "Votre profil de voyage est évalué : le point de départ.",
    icon: "explore",
    couleur: TEINTES[0],
    criteres: (s) => [
      { label: "Questionnaire du profil", actuel: s.questionnaire_done ? 1 : 0, requis: 1 },
    ],
  },
  {
    cle: "eclaireur",
    nom: "Éclaireur",
    description: "Vous avez fait découvrir vos premiers lieux ou récits.",
    icon: "hiking",
    couleur: TEINTES[1],
    criteres: (s) => [
      { label: "Lieux et expériences partagés", actuel: partages(s), requis: 2 },
    ],
  },
  {
    cle: "cartographe",
    nom: "Cartographe",
    description: "Vos partages enrichissent la carte, vos retours enrichissent les autres.",
    icon: "map",
    couleur: TEINTES[2],
    criteres: (s) => [
      { label: "Lieux et expériences partagés", actuel: partages(s),            requis: 5 },
      { label: "Contributions sur des lieux",   actuel: s.contributions_made,   requis: 3 },
      { label: "Score du profil",               actuel: s.sustainability_score, requis: 40 },
    ],
  },
  {
    cle: "conteur",
    nom: "Conteur du Territoire",
    description: "Une voix reconnue, qui raconte autant qu'elle documente.",
    icon: "auto_stories",
    couleur: TEINTES[3],
    criteres: (s) => [
      { label: "Lieux et expériences partagés", actuel: partages(s),            requis: 10 },
      { label: "Contributions sur des lieux",   actuel: s.contributions_made,   requis: 10 },
      { label: "Score du profil",               actuel: s.sustainability_score, requis: 55 },
    ],
  },
  {
    cle: "gardien-communaute",
    nom: "Gardien de la Communauté",
    description: "Le plus haut niveau : vos contributions font référence auprès des autres.",
    icon: "workspace_premium",
    couleur: TEINTES[4],
    criteres: (s) => [
      { label: "Lieux et expériences partagés", actuel: partages(s),            requis: 20 },
      { label: "Contributions sur des lieux",   actuel: s.contributions_made,   requis: 20 },
      { label: "Votes reçus",                   actuel: s.contribution_votes,   requis: 20 },
      { label: "Score du profil",               actuel: s.sustainability_score, requis: 70 },
    ],
  },
];

export const ECHELLE_PAR_ROLE: Record<string, Badge[]> = {
  guide:        echellePro("Guide Ambassadeur"),
  provider:     echellePro("Prestataire Ambassadeur"),
  eco_traveler: ECHELLE_VOYAGEUR,
};
