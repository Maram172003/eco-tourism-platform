// Questionnaires d'évaluation de durabilité — offres et circuits.
//
// Source unique : le questionnaire d'offre était auparavant recopié à
// l'identique dans les profils guide, prestataire et porteur de projet, ce qui
// garantissait une dérive au premier ajustement.
//
// Principes retenus pour la rédaction des questions :
//   – aucune question binaire Oui/Non : trois à quatre paliers, pour que le
//     score reflète un engagement progressif plutôt qu'un tout ou rien ;
//   – des formulations vérifiables (« la majorité », « à chaque étape »)
//     plutôt que des intentions ;
//   – un barème dont le total fait exactement 100 points.

export type SustainabilityOption = { label: string; value: number };
export type SustainabilityQuestion = { id: string; text: string; options: SustainabilityOption[] };
export type SustainabilityStep = {
  category: string;
  /** Nom d'icône Material Symbols — la police iconographique de la plateforme. */
  icon: string;
  description: string;
  questions: SustainabilityQuestion[];
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFRE — 6 catégories, 18 questions, 100 points
// ─────────────────────────────────────────────────────────────────────────────

export const OFFER_SUSTAINABILITY_STEPS: SustainabilityStep[] = [
  {
    category: "Impact écologique", icon: "eco",
    description: "Empreinte environnementale directe de l'activité",
    questions: [
      {
        id: "oq1",
        text: "Dans quel type de milieu l'activité se déroule-t-elle ?",
        options: [
          { label: "Espace naturel protégé, avec autorisation et encadrement", value: 8 },
          { label: "Espace naturel non protégé, fréquentation maîtrisée", value: 5 },
          { label: "Espace rural ou périurbain aménagé", value: 3 },
          { label: "Milieu urbain ou site très fréquenté", value: 1 },
        ],
      },
      {
        id: "oq2",
        text: "Comment les participants rejoignent-ils le point de départ ?",
        options: [
          { label: "Transport en commun, vélo ou marche possibles et encouragés", value: 7 },
          { label: "Covoiturage ou navette groupée organisée", value: 5 },
          { label: "Véhicule individuel, mais trajet court (moins de 30 km)", value: 2 },
          { label: "Véhicule individuel sur longue distance", value: 0 },
        ],
      },
      {
        id: "oq3",
        text: "Que deviennent les déchets générés pendant l'activité ?",
        options: [
          { label: "Aucun déchet produit, ou tout est repris et trié", value: 6 },
          { label: "Tri partiel, une partie est reprise", value: 3 },
          { label: "Déchets laissés à la charge des participants", value: 0 },
        ],
      },
      {
        id: "oq4",
        text: "L'eau et l'énergie consommées font-elles l'objet de mesures d'économie ?",
        options: [
          { label: "Oui, dispositifs concrets en place (économiseurs, énergie renouvelable…)", value: 4 },
          { label: "Quelques gestes ponctuels, sans dispositif dédié", value: 2 },
          { label: "Aucune mesure particulière", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Biodiversité & milieux", icon: "forest",
    description: "Protection des espèces et des espaces traversés",
    questions: [
      {
        id: "oq5",
        text: "Quelles règles encadrent l'observation de la faune et de la flore ?",
        options: [
          { label: "Distances, horaires et parcours définis, transmis aux participants", value: 6 },
          { label: "Consignes orales générales", value: 3 },
          { label: "Aucune règle particulière", value: 0 },
          { label: "Sans objet — l'activité n'implique aucune faune sauvage", value: 4 },
        ],
      },
      {
        id: "oq6",
        text: "L'activité tient-elle compte des périodes sensibles (nidification, reproduction, sécheresse) ?",
        options: [
          { label: "Oui, l'activité est suspendue ou adaptée sur ces périodes", value: 5 },
          { label: "Adaptation partielle selon les saisons", value: 3 },
          { label: "Non, l'activité est proposée à l'identique toute l'année", value: 0 },
        ],
      },
      {
        id: "oq7",
        text: "La fréquentation du site est-elle limitée pour préserver le milieu ?",
        options: [
          { label: "Oui, nombre de participants et de départs plafonnés", value: 4 },
          { label: "Taille des groupes limitée uniquement", value: 2 },
          { label: "Aucune limite définie", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Retombées locales", icon: "handshake",
    description: "Bénéfices économiques réels pour le territoire",
    questions: [
      {
        id: "oq8",
        text: "Qui encadre et anime l'activité ?",
        options: [
          { label: "Des intervenants résidant sur le territoire, rémunérés", value: 9 },
          { label: "Un mélange d'intervenants locaux et extérieurs", value: 5 },
          { label: "Uniquement des intervenants extérieurs au territoire", value: 0 },
        ],
      },
      {
        id: "oq9",
        text: "D'où proviennent les achats liés à l'offre (nourriture, matériel, fournitures) ?",
        options: [
          { label: "Majoritairement de producteurs et commerces locaux", value: 8 },
          { label: "Environ la moitié en circuit local", value: 4 },
          { label: "Approvisionnement sans critère de provenance", value: 0 },
        ],
      },
      {
        id: "oq10",
        text: "Les partenaires locaux sont-ils associés au-delà de la prestation ponctuelle ?",
        options: [
          { label: "Oui, partenariats durables et tarifs négociés équitablement", value: 5 },
          { label: "Collaborations ponctuelles, au coup par coup", value: 3 },
          { label: "Aucun partenariat local", value: 0 },
        ],
      },
      {
        id: "oq11",
        text: "Une part des recettes soutient-elle une action locale (préservation, association, projet) ?",
        options: [
          { label: "Oui, part définie et reversée régulièrement", value: 3 },
          { label: "Contributions ponctuelles", value: 1 },
          { label: "Non", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Sensibilisation & transmission", icon: "school",
    description: "Ce que les participants comprennent et retiennent",
    questions: [
      {
        id: "oq12",
        text: "Quelle place la sensibilisation occupe-t-elle dans l'activité ?",
        options: [
          { label: "Un temps dédié, avec supports ou intervenant spécialisé", value: 7 },
          { label: "Des explications intégrées au fil de l'activité", value: 4 },
          { label: "Sujet abordé seulement si les participants le demandent", value: 1 },
          { label: "Non abordé", value: 0 },
        ],
      },
      {
        id: "oq13",
        text: "Les participants reçoivent-ils des consignes de comportement avant l'activité ?",
        options: [
          { label: "Oui, transmises à la réservation et rappelées sur place", value: 5 },
          { label: "Rappelées uniquement sur place", value: 3 },
          { label: "Aucune consigne formalisée", value: 0 },
        ],
      },
      {
        id: "oq14",
        text: "Le patrimoine culturel local est-il présenté aux participants ?",
        options: [
          { label: "Oui, par des porteurs de ce patrimoine (habitants, artisans)", value: 3 },
          { label: "Oui, présenté par l'encadrant", value: 2 },
          { label: "Non abordé", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Accessibilité & inclusion", icon: "accessible",
    description: "Ouverture de l'offre à tous les publics",
    questions: [
      {
        id: "oq15",
        text: "L'offre est-elle praticable par une personne à mobilité réduite ?",
        options: [
          { label: "Oui, parcours et équipements adaptés", value: 5 },
          { label: "Partiellement, avec accompagnement spécifique", value: 3 },
          { label: "Non, mais l'information est clairement annoncée", value: 1 },
          { label: "Non, sans information préalable", value: 0 },
        ],
      },
      {
        id: "oq16",
        text: "Des tarifs adaptés existent-ils (familles, étudiants, habitants, groupes) ?",
        options: [
          { label: "Oui, plusieurs tarifs réduits", value: 3 },
          { label: "Un seul tarif réduit", value: 2 },
          { label: "Tarif unique", value: 0 },
        ],
      },
      {
        id: "oq17",
        text: "En quelles langues l'activité peut-elle être encadrée ?",
        options: [
          { label: "Trois langues ou plus, dont la langue locale", value: 2 },
          { label: "Deux langues", value: 1 },
          { label: "Une seule langue", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Encadrement responsable", icon: "verified_user",
    description: "Cadre professionnel et conditions d'annulation",
    questions: [
      {
        id: "oq18",
        text: "Quel est le cadre d'annulation proposé au voyageur ?",
        options: [
          { label: "Report privilégié, remboursement en cas d'aléa climatique ou écologique", value: 5 },
          { label: "Conditions d'annulation standard, clairement affichées", value: 3 },
          { label: "Aucune condition formalisée", value: 0 },
        ],
      },
      {
        id: "oq19",
        text: "Quelles qualifications possède la personne qui encadre l'activité ?",
        options: [
          { label: "Diplôme professionnel et formation environnementale", value: 5 },
          { label: "Diplôme professionnel de l'activité", value: 3 },
          { label: "Expérience de terrain sans qualification formelle", value: 1 },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUIT — 6 catégories, 16 questions, 100 points
//
// Un circuit se joue sur plusieurs jours et plusieurs étapes : les enjeux
// dominants ne sont plus l'activité elle-même mais les déplacements entre
// étapes, l'hébergement et la répartition des retombées sur le parcours.
// ─────────────────────────────────────────────────────────────────────────────

export const CIRCUIT_SUSTAINABILITY_STEPS: SustainabilityStep[] = [
  {
    category: "Mobilité entre étapes", icon: "directions_bike",
    description: "Le poste d'impact principal d'un itinéraire multi-jours",
    questions: [
      {
        id: "cq1",
        text: "Quel mode de déplacement domine entre les étapes ?",
        options: [
          { label: "Marche, vélo ou monture — aucun véhicule motorisé", value: 12 },
          { label: "Transports collectifs (train, bus de ligne)", value: 9 },
          { label: "Véhicule partagé du groupe (minibus, navette)", value: 6 },
          { label: "Véhicules individuels", value: 0 },
        ],
      },
      {
        id: "cq2",
        text: "Comment le tracé est-il conçu du point de vue des distances ?",
        options: [
          { label: "Boucle ou itinéraire linéaire sans retour à vide", value: 7 },
          { label: "Aller-retour avec quelques trajets répétés", value: 4 },
          { label: "Nombreux allers-retours depuis un point central", value: 1 },
        ],
      },
      {
        id: "cq3",
        text: "Le circuit est-il accessible depuis un point d'arrivée en transport public ?",
        options: [
          { label: "Oui, départ et retour desservis par le train ou le bus", value: 6 },
          { label: "Desservi d'un seul côté, ou navette organisée", value: 3 },
          { label: "Véhicule personnel indispensable", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Hébergement & restauration", icon: "cottage",
    description: "Où dorment et mangent les voyageurs à chaque étape",
    questions: [
      {
        id: "cq4",
        text: "Quel type d'hébergement est proposé sur le parcours ?",
        options: [
          { label: "Hébergements locaux certifiés ou éco-labellisés", value: 9 },
          { label: "Chez l'habitant, gîtes ou maisons d'hôtes familiales", value: 7 },
          { label: "Hébergements indépendants sans label", value: 4 },
          { label: "Chaînes hôtelières ou grands complexes", value: 0 },
        ],
      },
      {
        id: "cq5",
        text: "Comment les repas sont-ils composés ?",
        options: [
          { label: "Cuisine locale et de saison, produits du territoire", value: 7 },
          { label: "Majoritairement locale, quelques produits importés", value: 4 },
          { label: "Sans critère de provenance ni de saison", value: 0 },
        ],
      },
      {
        id: "cq6",
        text: "Une alternative végétarienne est-elle proposée à chaque repas ?",
        options: [
          { label: "Oui, systématiquement et sans supplément", value: 4 },
          { label: "Sur demande préalable", value: 2 },
          { label: "Non prévue", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Retombées sur le parcours", icon: "handshake",
    description: "Répartition des bénéfices entre les territoires traversés",
    questions: [
      {
        id: "cq7",
        text: "Qui accueille les voyageurs à chaque étape ?",
        options: [
          { label: "Des prestataires locaux différents à chaque étape", value: 9 },
          { label: "Des prestataires locaux sur la majorité des étapes", value: 6 },
          { label: "Un seul opérateur pour l'ensemble du circuit", value: 2 },
          { label: "Aucun prestataire local", value: 0 },
        ],
      },
      {
        id: "cq8",
        text: "Le circuit fait-il étape dans des localités peu fréquentées par le tourisme ?",
        options: [
          { label: "Oui, plusieurs étapes hors des sites très fréquentés", value: 6 },
          { label: "Une étape à l'écart des circuits habituels", value: 3 },
          { label: "Uniquement des sites touristiques majeurs", value: 0 },
        ],
      },
      {
        id: "cq9",
        text: "Des artisans ou producteurs sont-ils rencontrés durant le parcours ?",
        options: [
          { label: "Oui, rencontres prévues et rémunérées au programme", value: 5 },
          { label: "Visites libres, sans engagement financier", value: 2 },
          { label: "Aucune rencontre prévue", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Milieux traversés", icon: "landscape",
    description: "Pression exercée sur les espaces tout au long de l'itinéraire",
    questions: [
      {
        id: "cq10",
        text: "Combien de voyageurs le circuit accueille-t-il par départ ?",
        options: [
          { label: "Petit groupe (8 personnes ou moins)", value: 6 },
          { label: "Groupe moyen (9 à 15 personnes)", value: 4 },
          { label: "Grand groupe (plus de 15 personnes)", value: 0 },
        ],
      },
      {
        id: "cq11",
        text: "Le circuit emprunte-t-il des sentiers et voies balisés existants ?",
        options: [
          { label: "Oui, exclusivement des itinéraires balisés", value: 5 },
          { label: "Majoritairement, avec quelques passages hors sentier encadrés", value: 3 },
          { label: "Tracé libre, hors itinéraires balisés", value: 0 },
        ],
      },
      {
        id: "cq12",
        text: "Le calendrier des départs tient-il compte de la saison écologique ?",
        options: [
          { label: "Oui, départs suspendus sur les périodes sensibles", value: 4 },
          { label: "Programmation adaptée sans suspension", value: 2 },
          { label: "Départs identiques toute l'année", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Sensibilisation", icon: "school",
    description: "Ce que le voyageur apprend du territoire parcouru",
    questions: [
      {
        id: "cq13",
        text: "Comment le territoire est-il présenté aux voyageurs ?",
        options: [
          { label: "Par des habitants et des intervenants du territoire", value: 6 },
          { label: "Par l'accompagnateur, avec supports documentés", value: 4 },
          { label: "Informations pratiques uniquement", value: 0 },
        ],
      },
      {
        id: "cq14",
        text: "Une charte de bonne conduite est-elle remise avant le départ ?",
        options: [
          { label: "Oui, transmise à la réservation et commentée au départ", value: 4 },
          { label: "Rappelée oralement au départ", value: 2 },
          { label: "Aucune charte", value: 0 },
        ],
      },
    ],
  },
  {
    category: "Encadrement du séjour", icon: "explore",
    description: "Conditions d'accompagnement sur plusieurs jours",
    questions: [
      {
        id: "cq15",
        text: "Comment le groupe est-il accompagné sur la durée du circuit ?",
        options: [
          { label: "Accompagnateur qualifié présent sur tout le parcours", value: 6 },
          { label: "Accompagnement sur les étapes techniques uniquement", value: 3 },
          { label: "Circuit en autonomie, avec carnet de route", value: 2 },
        ],
      },
      {
        id: "cq16",
        text: "Que prévoit le circuit en cas d'aléa climatique ou de fermeture d'un site ?",
        options: [
          { label: "Itinéraire de repli documenté et report sans frais", value: 4 },
          { label: "Adaptation décidée sur place au cas par cas", value: 2 },
          { label: "Aucune alternative prévue", value: 0 },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Niveaux
// ─────────────────────────────────────────────────────────────────────────────

export type SustainabilityLevel = { label: string; color: string; bg: string; icon: string };

/** Cinq paliers communs, déclinés au masculin ou au féminin selon le sujet. */
function levelFor(score: number, labels: [string, string, string, string, string]): SustainabilityLevel {
  if (score >= 86) return { label: labels[0], color: "text-primary",      bg: "bg-primary/10",  icon: "workspace_premium" };
  if (score >= 71) return { label: labels[1], color: "text-emerald-600",  bg: "bg-emerald-50",  icon: "eco" };
  if (score >= 51) return { label: labels[2], color: "text-teal-600",     bg: "bg-teal-50",     icon: "handshake" };
  if (score >= 31) return { label: labels[3], color: "text-blue-600",     bg: "bg-blue-50",     icon: "lightbulb" };
  return             { label: labels[4], color: "text-slate-500",    bg: "bg-slate-100",   icon: "description" };
}

export function getOfferSustainabilityLevel(score: number): SustainabilityLevel {
  return levelFor(score, [
    "Offre Ambassadrice Éco-Voyage",
    "Offre Éco-Responsable",
    "Offre Engagée",
    "Offre Sensibilisée",
    "Offre Conventionnelle",
  ]);
}

export function getCircuitSustainabilityLevel(score: number): SustainabilityLevel {
  return levelFor(score, [
    "Circuit Ambassadeur Éco-Voyage",
    "Circuit Éco-Responsable",
    "Circuit Engagé",
    "Circuit Sensibilisé",
    "Circuit Conventionnel",
  ]);
}

/** Score maximal d'un questionnaire — sert à vérifier que le barème fait 100. */
export function maxScore(steps: SustainabilityStep[]): number {
  return steps.reduce(
    (total, step) =>
      total + step.questions.reduce((s, q) => s + Math.max(...q.options.map((o) => o.value)), 0),
    0,
  );
}
