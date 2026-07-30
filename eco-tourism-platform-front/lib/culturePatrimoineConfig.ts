// ─── NIVEAU 1 : Expertises → Types de visite ──────────────────────────────────

export const TYPES_VISITE_PAR_EXPERTISE: Record<string, string[]> = {
  "Architecture islamique": [
    "Visite de mosquée",
    "Visite de medersa",
    "Visite de palais",
    "Circuit architectural",
    "Visite de médina",
  ],
  "Architecture romaine": [
    "Visite de site romain",
    "Circuit archéologique",
    "Visite de thermes",
    "Visite de théâtre antique",
    "Visite de forum",
  ],
  "Architecture coloniale": [
    "Circuit colonial",
    "Balade architecturale",
    "Visite de quartier historique",
    "Tour des villas et bâtiments",
  ],
  "Artisanat traditionnel": [
    "Visite d'atelier artisan",
    "Visite de souk spécialisé",
    "Visite de coopérative",
    "Démonstration & initiation",
  ],
  "Musées": [
    "Visite de musée national",
    "Visite de musée régional",
    "Visite de musée d'art",
    "Visite de musée archéologique",
  ],
  "Médinas": [
    "Visite de médina",
    "Balade dans les souks",
    "Tour des fondouks",
    "Circuit portes & remparts",
    "Visite de quartier juif",
  ],
  "Traditions locales": [
    "Rencontre communautaire",
    "Participation à une fête locale",
    "Visite chez l'habitant",
    "Découverte vie quotidienne",
  ],
  "Costumes & bijoux": [
    "Visite d'atelier bijoutier",
    "Visite de souk bijoux",
    "Démonstration costume traditionnel",
    "Visite de musée du costume",
  ],
  "Musique traditionnelle": [
    "Soirée musicale traditionnelle",
    "Rencontre avec musiciens",
    "Visite de conservatoire",
    "Participation à une répétition",
  ],
  "Danse folklorique": [
    "Spectacle de danse folklorique",
    "Initiation à la danse",
    "Soirée culturelle avec danse",
  ],
  "Littérature & poésie": [
    "Visite de librairies historiques",
    "Rencontre avec auteur local",
    "Lecture poétique en lieu historique",
    "Circuit des cafés littéraires",
  ],
  "Calligraphie arabe": [
    "Visite d'atelier calligraphe",
    "Initiation à la calligraphie",
    "Visite de collections calligraphiques",
  ],
  "Tissage & broderie": [
    "Visite d'atelier tissage",
    "Initiation au tissage",
    "Visite de coopérative tisserandes",
    "Visite de musée du tapis",
  ],
  "Poterie & céramique": [
    "Visite d'atelier potier",
    "Initiation tournage poterie",
    "Visite de Nabeul / centres céramique",
    "Visite de musée de la céramique",
  ],
  "Hammam & bains": [
    "Visite d'un hammam traditionnel",
    "Expérience hammam authentique",
    "Découverte culture du bain",
  ],
  "Fêtes & festivals": [
    "Participation à un festival",
    "Visite pendant une fête locale",
    "Découverte calendrier culturel",
  ],
  "Contes & légendes": [
    "Soirée de contes traditionnels",
    "Visite des lieux de légendes",
    "Rencontre avec conteur professionnel",
  ],
  "Religion & spiritualité": [
    "Visite de lieu de culte",
    "Découverte pratiques spirituelles",
    "Visite de zaouïa / mausolée",
    "Circuit religieux inter-confession",
  ],
  "Berbère & amazigh": [
    "Visite de village berbère",
    "Rencontre communauté amazigh",
    "Découverte culture berbère",
    "Visite de ksar / ksour",
  ],
  "Art contemporain": [
    "Visite de galerie d'art",
    "Rencontre avec artiste contemporain",
    "Circuit street art & graffiti",
    "Visite d'expo temporaire",
  ],
};

// ─── NIVEAU 2 : Type de visite → Expériences incluses ─────────────────────────

export const EXPERIENCES_PAR_TYPE_VISITE: Record<string, string[]> = {
  "Visite de mosquée": [
    "Explication de l'architecture intérieure",
    "Histoire de la construction",
    "Accès à la cour intérieure",
    "Présentation des pratiques religieuses",
  ],
  "Visite de medersa": [
    "Visite des salles d'études",
    "Histoire de l'enseignement islamique",
    "Découverte de la calligraphie ornementale",
  ],
  "Visite de palais": [
    "Découverte des salles d'apparat",
    "Histoire dynastique",
    "Architecture des jardins",
    "Rencontre avec le gardien du lieu",
  ],
  "Circuit architectural": [
    "Comparaison des styles architecturaux",
    "Photos des détails architecturaux",
    "Arrêts dans des cours privées",
  ],
  "Visite de site romain": [
    "Explication des fouilles d'origine",
    "Contextualisation historique",
    "Reconstitution visuelle des bâtiments",
  ],
  "Circuit archéologique": [
    "Comparaison de sites sur la même période",
    "Carte des sites de fouilles fournie",
    "Rencontre avec archéologue si disponible",
  ],
  "Visite de thermes": [
    "Circuit des différentes salles (frigidarium, tepidarium, caldarium)",
    "Histoire du thermalisme romain",
    "Reconstitution du quotidien romain",
  ],
  "Visite de théâtre antique": [
    "Acoustique et architecture expliquées",
    "Histoire des spectacles antiques",
    "Anecdotes sur les grandes représentations",
  ],
  "Visite d'atelier artisan": [
    "Démonstration live de fabrication",
    "Présentation des outils traditionnels",
    "Rencontre avec le maître artisan",
    "Initiation pratique (essai)",
    "Achat direct à l'artisan",
  ],
  "Visite de souk spécialisé": [
    "Explication de l'organisation du souk",
    "Présentation des produits authentiques",
    "Conseils de négociation",
    "Rencontre avec commerçants locaux",
  ],
  "Démonstration & initiation": [
    "Démonstration complète étape par étape",
    "Essai guidé par l'artisan",
    "Pièce créée à emporter",
    "Recette / technique remise par écrit",
  ],
  "Visite de coopérative": [
    "Rencontre avec les artisanes",
    "Présentation du modèle coopératif",
    "Achat éthique direct",
  ],
  "Visite de médina": [
    "Circuit des portes historiques",
    "Visite des fondouks",
    "Découverte des différents souks",
    "Accès à des cours intérieures privées",
    "Rencontre avec des habitants",
    "Dégustation de produits locaux en route",
  ],
  "Balade dans les souks": [
    "Présentation de chaque corps de métier",
    "Conseils d'achat et d'authenticité",
    "Dégustation street food locale",
    "Arrêt café traditionnel",
  ],
  "Tour des fondouks": [
    "Découverte des anciens caravansérails",
    "Histoire commerciale de la ville",
    "Accès à des fondouks transformés en ateliers",
  ],
  "Circuit portes & remparts": [
    "Histoire défensive de la ville",
    "Chronologie des constructions",
    "Photos panoramiques des remparts",
  ],
  "Visite de quartier juif": [
    "Histoire de la communauté juive locale",
    "Visite de la synagogue",
    "Gastronomie judéo-tunisienne présentée",
  ],
  "Visite de musée national": [
    "Présentation des collections phares",
    "Anecdotes sur les pièces maîtresses",
    "Visite des réserves si disponible",
    "Rencontre avec un conservateur",
  ],
  "Visite de musée régional": [
    "Focus sur l'histoire locale",
    "Pièces méconnues mises en valeur",
    "Lien avec le patrimoine régional",
  ],
  "Visite de musée d'art": [
    "Explication de la démarche artistique",
    "Comparaison art traditionnel / contemporain",
    "Rencontre avec artiste si disponible",
  ],
  "Visite de musée archéologique": [
    "Explication des fouilles d'origine",
    "Contextualisation historique",
    "Focus sur les mosaïques / objets",
    "Carte des sites de fouilles fournie",
  ],
  "Rencontre communautaire": [
    "Échange avec des habitants",
    "Dégustation de plats maison",
    "Présentation des traditions familiales",
  ],
  "Participation à une fête locale": [
    "Présentation du calendrier cultural",
    "Costumes traditionnels expliqués",
    "Participation active aux célébrations",
  ],
  "Visite chez l'habitant": [
    "Repas traditionnel en famille",
    "Découverte de l'intérieur d'un riad ou maison traditionnelle",
    "Échange culturel authentique",
  ],
  "Soirée musicale traditionnelle": [
    "Performance live de musiciens locaux",
    "Présentation des instruments traditionnels",
    "Initiation rythmique",
    "Repas traditionnel associé",
  ],
  "Rencontre avec musiciens": [
    "Interview informelle avec les artistes",
    "Écoute et présentation du répertoire",
    "Essai d'instrument",
  ],
  "Participation à une répétition": [
    "Coulisses d'un groupe musical local",
    "Apprentissage de quelques notes",
  ],
  "Spectacle de danse folklorique": [
    "Performance par une troupe locale",
    "Présentation des costumes",
    "Initiation aux pas de base",
  ],
  "Initiation à la danse": [
    "Cours animé par un danseur professionnel",
    "Apprentissage d'une chorégraphie courte",
  ],
  "Visite de librairies historiques": [
    "Découverte de livres rares et locaux",
    "Rencontre avec le libraire",
    "Histoire de la culture littéraire locale",
  ],
  "Initiation à la calligraphie": [
    "Apprentissage des alphabets arabes",
    "Exercice pratique guidé",
    "Pièce calligraphiée à emporter",
  ],
  "Visite d'atelier calligraphe": [
    "Rencontre avec le calligraphe",
    "Démonstration de techniques variées",
    "Œuvre signée remise",
  ],
  "Visite d'atelier tissage": [
    "Présentation du métier à tisser",
    "Démonstration des motifs berbères",
    "Initiation guidée",
  ],
  "Initiation au tissage": [
    "Pratique sur métier à tisser",
    "Création d'un échantillon à emporter",
    "Explication des symboles des motifs",
  ],
  "Visite d'atelier potier": [
    "Démonstration au tour",
    "Histoire de la poterie de la région",
    "Essai de tournage guidé",
  ],
  "Initiation tournage poterie": [
    "Apprentissage des bases du centrage",
    "Création d'une pièce simple à emporter",
    "Cuisson expliquée",
  ],
  "Visite d'un hammam traditionnel": [
    "Explication de l'architecture et de l'histoire",
    "Découverte des différentes salles",
    "Présentation des produits utilisés",
  ],
  "Expérience hammam authentique": [
    "Gommage traditionnel au savon noir",
    "Soin à l'argile ghassoul",
    "Massage traditionnel",
    "Thé à la menthe offert",
  ],
  "Participation à un festival": [
    "Programme culturel complet remis",
    "Accès aux coulisses si possible",
    "Rencontre avec des artistes",
  ],
  "Visite pendant une fête locale": [
    "Explication des rituels et traditions",
    "Dégustation de plats de fête",
    "Photos et vidéos des célébrations",
  ],
  "Soirée de contes traditionnels": [
    "Contes en langue originale avec traduction",
    "Mise en scène théâtrale",
    "Repas traditionnel pendant la soirée",
    "Livret de contes remis",
  ],
  "Rencontre avec conteur professionnel": [
    "Présentation du métier de conteur",
    "Histoire du conte oral en Tunisie",
    "Conte personnalisé pour le groupe",
  ],
  "Visite de lieu de culte": [
    "Histoire et architecture expliquées",
    "Présentation des pratiques religieuses",
    "Respect des règles et tenue commentée",
  ],
  "Visite de zaouïa / mausolée": [
    "Histoire du saint ou de la confrérie",
    "Architecture spécifique expliquée",
    "Rituel de la visite présenté",
  ],
  "Visite de village berbère": [
    "Rencontre avec des familles locales",
    "Découverte de l'habitat traditionnel",
    "Repas berbère chez l'habitant",
    "Artisanat amazigh présenté",
  ],
  "Rencontre communauté amazigh": [
    "Échange culturel avec la communauté",
    "Présentation de la langue tamazight",
    "Musique et chants amazigh",
    "Dégustation plats traditionnels",
  ],
  "Visite de ksar / ksour": [
    "Histoire des greniers fortifiés",
    "Architecture de terre défensive",
    "Vie des nomades et sédentaires",
    "Panorama depuis les tours",
  ],
  "Visite de galerie d'art": [
    "Rencontre avec l'artiste si disponible",
    "Explication de la démarche artistique",
    "Comparaison art traditionnel / contemporain",
  ],
  "Rencontre avec artiste contemporain": [
    "Visite de l'atelier",
    "Processus créatif expliqué",
    "Œuvre commentée par l'artiste",
  ],
  "Circuit street art & graffiti": [
    "Présentation des artistes locaux",
    "Histoire des fresques",
    "Spots secrets et moins connus",
  ],
  "Visite d'expo temporaire": [
    "Introduction par un médiateur culturel",
    "Catalogue d'exposition fourni",
  ],
  "_default": [
    "Commentaire du guide tout au long",
    "Questions-réponses incluses",
    "Document récapitulatif remis",
  ],
};

// ─── NIVEAU 2 : Type de visite → Supports de médiation ────────────────────────

export const MEDIATION_PAR_TYPE_VISITE: Record<string, string[]> = {
  "Visite de mosquée":              ["Plan annoté du site", "Photos historiques", "Lexique architectural arabe"],
  "Visite de medersa":              ["Plan du bâtiment", "Textes coraniques calligraphiés", "Histoire de l'établissement"],
  "Visite de palais":               ["Plan des pièces", "Chronologie dynastique", "Illustrations d'époque"],
  "Circuit architectural":          ["Carte du circuit", "Fiches comparatives des styles", "Photos avant/après restauration"],
  "Visite de site romain":          ["Plan archéologique", "Chronologie romaine", "Reconstitutions visuelles"],
  "Circuit archéologique":          ["Carte des sites", "Fiches chronologiques", "Bibliographie recommandée"],
  "Visite de thermes":              ["Plan des salles", "Schéma fonctionnement hypocauste", "Chronologie romaine"],
  "Visite de théâtre antique":      ["Plan du monument", "Histoire des représentations", "Acoustique illustrée"],
  "Visite d'atelier artisan":       ["Fiche technique du métier", "Photos des étapes de fabrication", "Carte des ateliers du souk"],
  "Démonstration & initiation":     ["Guide des techniques", "Fiche matériaux", "Procédé écrit"],
  "Visite de souk spécialisé":      ["Carte du souk annoté", "Guide des prix et authenticité", "Vocabulaire arabe des métiers"],
  "Visite de coopérative":          ["Brochure de la coopérative", "Fiches artisans", "Guide d'achat éthique"],
  "Visite de médina":               ["Plan de la médina annoté", "Fiche historique des portes", "Liste des incontournables cachés"],
  "Balade dans les souks":          ["Carte des souks par métier", "Guide pratique d'achat", "Lexique arabe utile"],
  "Tour des fondouks":              ["Carte des fondouks", "Histoire commerciale illustrée"],
  "Circuit portes & remparts":      ["Plan défensif historique", "Frise chronologique", "Photos d'archives"],
  "Visite de quartier juif":        ["Carte du quartier", "Fiches communauté", "Lexique hébreu de base"],
  "Visite de musée national":       ["Guide des collections", "Fiches pièces maîtresses", "Plan du musée"],
  "Visite de musée régional":       ["Brochure officielle", "Fiches thématiques locales"],
  "Visite de musée archéologique":  ["Plan des fouilles", "Chronologie des civilisations", "Fiches d'objets"],
  "Visite de musée d'art":          ["Catalogue d'exposition", "Fiches artistes", "Lexique artistique"],
  "Rencontre communautaire":        ["Carte du quartier", "Fiches traditions locales"],
  "Participation à une fête locale":["Programme de la fête", "Fiches traditions et rites", "Lexique local"],
  "Visite chez l'habitant":         ["Carte du quartier", "Recettes de plats servis"],
  "Soirée musicale traditionnelle": ["Programme de la soirée", "Fiches instruments", "Paroles des chants"],
  "Rencontre avec musiciens":       ["Biographies des artistes", "Discographie recommandée"],
  "Spectacle de danse folklorique": ["Programme", "Présentation des troupes", "Carte des régions et leurs danses"],
  "Initiation à la danse":          ["Guide des pas", "Présentation du style chorégraphique"],
  "Soirée de contes traditionnels": ["Livret des contes", "Lexique des personnages", "Carte des origines"],
  "Rencontre avec conteur professionnel": ["Biographie du conteur", "Recueil de contes recommandés"],
  "Visite de lieu de culte":        ["Plan du lieu", "Fiches pratiques religieuses", "Lexique religieux"],
  "Visite de zaouïa / mausolée":    ["Fiche du saint", "Carte des zaouïas de la région"],
  "Visite de village berbère":      ["Carte du village", "Fiches traditions amazigh", "Lexique tamazight de base"],
  "Rencontre communauté amazigh":   ["Guide culture amazigh", "Alphabet tifinagh", "Fiches musicales"],
  "Visite de ksar / ksour":         ["Plan du ksar", "Histoire des greniers communautaires", "Photos d'archives"],
  "Visite de galerie d'art":        ["Catalogue de la galerie", "Fiches artistes", "Comparatifs art trad/contemp"],
  "Rencontre avec artiste contemporain": ["Portfolio de l'artiste", "Entretien préparé"],
  "Circuit street art & graffiti":  ["Carte des fresques", "Fiches artistes locaux", "Historique du mouvement"],
  "Visite d'expo temporaire":       ["Catalogue d'exposition", "Fiche commissaire"],
  "Initiation à la calligraphie":   ["Guide des alphabets", "Exercices progressifs", "Fiche des calligraphes tunisiens"],
  "Visite d'atelier calligraphe":   ["Lexique calligraphique", "Fiches styles d'écriture"],
  "Visite d'atelier tissage":       ["Fiche des motifs berbères", "Guide des matières"],
  "Initiation au tissage":          ["Guide des techniques", "Fiche symboles de motifs"],
  "Visite d'atelier potier":        ["Fiche technique de la poterie", "Carte des centres céramique"],
  "Initiation tournage poterie":    ["Guide des étapes", "Fiche des glaçures"],
  "Visite d'un hammam traditionnel":["Plan architectural", "Histoire du bain public", "Fiches produits utilisés"],
  "Expérience hammam authentique":  ["Guide des soins", "Fiches produits naturels", "Rituel en images"],
  "Participation à un festival":    ["Programme complet", "Fiches artistes / troupes", "Carte des scènes"],
  "Visite pendant une fête locale": ["Calendrier des fêtes", "Fiches rituels et traditions"],
  "_default":                       ["Livret résumé de la visite", "Plan du lieu", "Bibliographie"],
};

// ─── Fonctions utilitaires ─────────────────────────────────────────────────────

export function getTypesVisiteDisponibles(expertisesSelectionnees: string[]): string[] {
  const types = new Set<string>();
  expertisesSelectionnees.forEach((expertise) => {
    (TYPES_VISITE_PAR_EXPERTISE[expertise] ?? []).forEach((tv) => types.add(tv));
  });
  return Array.from(types).sort();
}

export function getExperiencesDisponibles(typesVisiteSelectionnes: string[]): string[] {
  const exp = new Set<string>();
  typesVisiteSelectionnes.forEach((tv) => {
    (EXPERIENCES_PAR_TYPE_VISITE[tv] ?? EXPERIENCES_PAR_TYPE_VISITE["_default"]).forEach((e) => exp.add(e));
  });
  return Array.from(exp);
}

export function getMediationDisponible(typesVisiteSelectionnes: string[]): string[] {
  const med = new Set<string>();
  typesVisiteSelectionnes.forEach((tv) => {
    (MEDIATION_PAR_TYPE_VISITE[tv] ?? MEDIATION_PAR_TYPE_VISITE["_default"]).forEach((m) => med.add(m));
  });
  return Array.from(med);
}

const ALL_KNOWN_EXPERIENCES = new Set<string>(
  Object.values(EXPERIENCES_PAR_TYPE_VISITE).flat()
);

export function isCustomExperience(exp: string): boolean {
  return !ALL_KNOWN_EXPERIENCES.has(exp);
}

// ─── Versions groupées (pour affichage avec séparateurs) ──────────────────────

export function getTypesVisiteGrouped(
  expertisesSelectionnees: string[]
): { expertise: string; types: string[] }[] {
  return expertisesSelectionnees
    .map((expertise) => ({ expertise, types: TYPES_VISITE_PAR_EXPERTISE[expertise] ?? [] }))
    .filter((g) => g.types.length > 0);
}

export function getExperiencesGrouped(
  typesVisiteSelectionnes: string[]
): { typeVisite: string; experiences: string[] }[] {
  return typesVisiteSelectionnes
    .map((tv) => ({
      typeVisite: tv,
      experiences: EXPERIENCES_PAR_TYPE_VISITE[tv] ?? EXPERIENCES_PAR_TYPE_VISITE["_default"],
    }))
    .filter((g) => g.experiences.length > 0);
}

export function getMediationGrouped(
  typesVisiteSelectionnes: string[]
): { typeVisite: string; mediation: string[] }[] {
  return typesVisiteSelectionnes
    .map((tv) => ({
      typeVisite: tv,
      mediation: MEDIATION_PAR_TYPE_VISITE[tv] ?? MEDIATION_PAR_TYPE_VISITE["_default"],
    }))
    .filter((g) => g.mediation.length > 0);
}
