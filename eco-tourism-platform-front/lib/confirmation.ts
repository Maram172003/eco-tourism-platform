/**
 * Type de confirmation d'une offre ou d'un circuit — lecture unique.
 *
 * Le formulaire de publication fait choisir un intitulé en toutes lettres
 * (« Sous 24h (validation manuelle) »). Selon le rôle, cet intitulé finit à
 * deux endroits différents : le prestataire l'écrit dans la colonne
 * `confirmation_mode`, le guide dans `details.type_confirmation` — et la
 * colonne reçoit alors la valeur par défaut du serveur. Deux offres identiques
 * pour l'utilisateur ne se ressemblent donc pas en base.
 *
 * Tout ce qui a besoin de connaître le type de confirmation passe par ici :
 * on accepte les deux emplacements et les deux écritures (code ou intitulé),
 * et on rend une réponse unique.
 */

export type ModeConfirmation = "instant" | "manual" | "quote";

type Option = {
  label: string;
  mode: ModeConfirmation;
  /** Délai annoncé au voyageur, quand l'intitulé en promet un. */
  delaiHeures?: number;
  description: string;
};

/** Les cinq choix du formulaire, dans l'ordre où ils y sont proposés. */
const OPTIONS: Option[] = [
  {
    label: "Instantanée (confirmé dès paiement)",
    mode: "instant",
    description: "Votre réservation est confirmée immédiatement.",
  },
  {
    label: "Sous 24h (validation manuelle)",
    mode: "manual",
    delaiHeures: 24,
    description: "Le prestataire vous confirmera sous 24 heures.",
  },
  {
    label: "Sous 48h (validation manuelle)",
    mode: "manual",
    delaiHeures: 48,
    description: "Le prestataire vous confirmera sous 48 heures.",
  },
  {
    label: "Demande de devis",
    mode: "quote",
    description: "Le prestataire vous répondra avec une proposition chiffrée.",
  },
  {
    label: "Sur demande avec acompte",
    mode: "manual",
    description: "Le prestataire validera après réception de l'acompte.",
  },
];

/** Codes historiques, écrits directement en base par les jeux de données. */
const PAR_CODE: Record<string, Option> = {
  instant: OPTIONS[0],
  automatic: OPTIONS[0],
  manual: OPTIONS[2],
  conditional: OPTIONS[4],
};

export type Confirmation = {
  mode: ModeConfirmation;
  /** L'intitulé exact affiché sur la fiche de l'offre. */
  label: string;
  description: string;
  delaiHeures?: number;
};

/** Ce qui est affiché quand l'offre ne dit rien : le comportement du serveur. */
const DEFAUT: Confirmation = {
  mode: "manual",
  label: OPTIONS[2].label,
  description: OPTIONS[2].description,
  delaiHeures: 48,
};

/**
 * @param colonne  `confirmation_mode`, qui porte tantôt un code, tantôt l'intitulé.
 * @param details  `details.type_confirmation`, l'intitulé choisi au formulaire.
 *
 * `details` prime : c'est le choix explicite de l'auteur, là où la colonne peut
 * n'être que la valeur par défaut du serveur.
 */
export function lireConfirmation(
  colonne?: string | null,
  details?: string | null,
): Confirmation {
  const trouver = (v?: string | null): Option | null => {
    if (!v) return null;
    const brut = v.trim();
    return (
      OPTIONS.find((o) => o.label === brut) ??
      PAR_CODE[brut.toLowerCase()] ??
      null
    );
  };
  // Un intitulé explicite l'emporte sur un code, quel que soit son emplacement.
  const parIntitule =
    OPTIONS.find((o) => o.label === details?.trim()) ??
    OPTIONS.find((o) => o.label === colonne?.trim());
  const option = parIntitule ?? trouver(details) ?? trouver(colonne);
  if (!option) return DEFAUT;
  return {
    mode: option.mode,
    label: option.label,
    description: option.description,
    delaiHeures: option.delaiHeures,
  };
}

/** Raccourci pour un objet offre ou circuit tel que le renvoie l'API. */
export function confirmationDe(
  source?: {
    confirmation_mode?: string | null;
    details?: { type_confirmation?: string | null } | null;
  } | null,
): Confirmation {
  return lireConfirmation(source?.confirmation_mode, source?.details?.type_confirmation);
}

/** Intitulés du formulaire, pour les écrans qui les proposent au choix. */
export const INTITULES_CONFIRMATION = OPTIONS.map((o) => o.label);

/** L'intitulé correspondant à un code stocké, pour ré-alimenter le formulaire. */
export function intituleDepuisCode(v?: string | null): string {
  return lireConfirmation(v).label;
}
