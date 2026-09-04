/**
 * Type de confirmation d'une offre ou d'un circuit — lecture unique côté serveur.
 *
 * Le formulaire de publication fait choisir un intitulé en toutes lettres
 * (« Sous 24h (validation manuelle) »). Le prestataire l'envoie dans le champ
 * `confirmation_mode`, le guide dans `details.type_confirmation` — auquel cas
 * la colonne ne reçoit que la valeur par défaut. Comparer la colonne à
 * `'instant'` laissait donc passer en attente des offres dont l'auteur avait
 * bel et bien choisi la confirmation immédiate.
 *
 * Miroir de `lib/confirmation.ts` côté front : les deux doivent rester alignés.
 */

export type ModeConfirmation = 'instant' | 'manual' | 'quote';

const OPTIONS: Array<{ label: string; mode: ModeConfirmation }> = [
  { label: 'Instantanée (confirmé dès paiement)', mode: 'instant' },
  { label: 'Sous 24h (validation manuelle)', mode: 'manual' },
  { label: 'Sous 48h (validation manuelle)', mode: 'manual' },
  { label: 'Demande de devis', mode: 'quote' },
  { label: 'Sur demande avec acompte', mode: 'manual' },
];

const PAR_CODE: Record<string, ModeConfirmation> = {
  instant: 'instant',
  automatic: 'instant',
  manual: 'manual',
  conditional: 'manual',
  quote: 'quote',
};

/**
 * Le mode réel, quel que soit l'emplacement et l'écriture de la valeur.
 * `details.type_confirmation` prime : c'est le choix explicite de l'auteur.
 */
export function resolveConfirmationMode(
  source?: {
    confirmation_mode?: string | null;
    details?: Record<string, any> | null;
  } | null,
): ModeConfirmation {
  const details = source?.details?.type_confirmation as string | undefined;
  const colonne = source?.confirmation_mode;
  const parIntitule =
    OPTIONS.find((o) => o.label === details?.trim()) ??
    OPTIONS.find((o) => o.label === colonne?.trim());
  if (parIntitule) return parIntitule.mode;
  const code = (details ?? colonne ?? '').trim().toLowerCase();
  return PAR_CODE[code] ?? 'manual';
}

/** Vrai si la réservation doit être confirmée sans intervention de l'auteur. */
export function isInstantConfirmation(source?: {
  confirmation_mode?: string | null;
  details?: Record<string, any> | null;
} | null): boolean {
  return resolveConfirmationMode(source) === 'instant';
}

/**
 * Ce qu'il faut stocker dans la colonne à partir de ce qu'envoie un formulaire.
 * La colonne garde un code, `details.type_confirmation` garde l'intitulé exact :
 * sans cela, une colonne remplie avec « Sous 24h (validation manuelle) » ne peut
 * plus être comparée à quoi que ce soit.
 */
export function normalizeConfirmationMode(valeur?: string | null): ModeConfirmation | null {
  if (!valeur) return null;
  const brut = valeur.trim();
  const parIntitule = OPTIONS.find((o) => o.label === brut);
  if (parIntitule) return parIntitule.mode;
  return PAR_CODE[brut.toLowerCase()] ?? null;
}

/** L'intitulé du formulaire, s'il y en a un dans la valeur reçue. */
export function extractConfirmationLabel(valeur?: string | null): string | null {
  if (!valeur) return null;
  const brut = valeur.trim();
  return OPTIONS.some((o) => o.label === brut) ? brut : null;
}
