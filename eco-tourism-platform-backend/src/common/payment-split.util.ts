/**
 * Répartition du paiement d'une réservation de groupe.
 *
 * Trois façons de payer à plusieurs :
 *  - `organizer` : l'organisateur règle la totalité, les invités ne doivent rien ;
 *  - `equal`     : le total est divisé à parts égales entre tous les participants ;
 *  - `custom`    : l'organisateur fixe lui-même le montant de chacun.
 *
 * Miroir de `lib/payment-split.ts` côté front : l'écran de réservation calcule
 * les mêmes montants pour les afficher, le serveur les recalcule pour les
 * enregistrer. Les deux doivent rester alignés.
 */

export type ModeRepartition = 'organizer' | 'equal' | 'custom';

export const MODES_REPARTITION: ModeRepartition[] = ['organizer', 'equal', 'custom'];

/** Tolérance de comparaison : un centime, pour absorber les flottants. */
const EPSILON = 0.005;

/**
 * Parts égales exactes.
 *
 * Diviser puis arrondir chaque part fait perdre ou inventer des centimes
 * (100 / 3 → 33.33 × 3 = 99.99). On répartit donc le reste de la division
 * centime par centime sur les premières parts : la somme retombe toujours
 * exactement sur le total.
 */
export function partsEgales(total: number, nb: number): number[] {
  if (nb <= 0) return [];
  const centimes = Math.round(total * 100);
  const base = Math.floor(centimes / nb);
  const reste = centimes - base * nb;
  return Array.from({ length: nb }, (_, i) => (base + (i < reste ? 1 : 0)) / 100);
}

export type Repartition = {
  mode: ModeRepartition;
  /** Ce que doit l'organisateur. */
  organisateur: number;
  /** Ce que doit chaque invité, indexé par sa clé (`user_id` ou `email:…`). */
  invites: Record<string, number>;
};

export type ResultatRepartition =
  | { ok: true; repartition: Repartition }
  | { ok: false; message: string };

/**
 * @param mode     Le choix de l'organisateur ; absent, on divise à parts égales.
 * @param total    Prix total de la réservation ; `null` quand le prix est à définir.
 * @param cles     Clés des invités, dans l'ordre d'invitation.
 * @param saisie   En mode personnalisé : la part de l'organisateur et celle de
 *                 chaque invité, telles qu'il les a saisies.
 */
export function resoudreRepartition(
  mode: string | null | undefined,
  total: number | null,
  cles: string[],
  saisie?: { organisateur?: number | null; invites?: Record<string, number> },
): ResultatRepartition {
  const choisi: ModeRepartition = MODES_REPARTITION.includes(mode as ModeRepartition)
    ? (mode as ModeRepartition)
    : 'equal';

  // Sans prix connu, il n'y a rien à répartir : on garde le mode choisi pour
  // pouvoir l'appliquer le jour où le prestataire fixe le montant.
  if (total === null) {
    return {
      ok: true,
      repartition: { mode: choisi, organisateur: 0, invites: Object.fromEntries(cles.map((c) => [c, 0])) },
    };
  }

  if (choisi === 'organizer') {
    return {
      ok: true,
      repartition: {
        mode: 'organizer',
        organisateur: arrondi(total),
        invites: Object.fromEntries(cles.map((c) => [c, 0])),
      },
    };
  }

  if (choisi === 'equal') {
    // L'organisateur compte pour une part, au même titre que ses invités.
    const parts = partsEgales(total, cles.length + 1);
    return {
      ok: true,
      repartition: {
        mode: 'equal',
        organisateur: parts[0],
        invites: Object.fromEntries(cles.map((c, i) => [c, parts[i + 1]])),
      },
    };
  }

  // ── Répartition personnalisée ──────────────────────────────────────────────
  const organisateur = saisie?.organisateur;
  if (organisateur == null || !Number.isFinite(organisateur) || organisateur < 0) {
    return { ok: false, message: 'Indiquez votre propre part pour une répartition personnalisée.' };
  }
  const invites: Record<string, number> = {};
  for (const cle of cles) {
    const montant = saisie?.invites?.[cle];
    if (montant == null || !Number.isFinite(montant) || montant < 0) {
      return { ok: false, message: 'Chaque invité doit avoir une part définie et positive.' };
    }
    invites[cle] = arrondi(montant);
  }
  const somme = arrondi(
    Object.values(invites).reduce((s, v) => s + v, arrondi(organisateur)),
  );
  if (Math.abs(somme - arrondi(total)) > EPSILON) {
    return {
      ok: false,
      message: `La somme des parts (${somme.toFixed(2)} TND) doit être égale au total de la réservation (${arrondi(total).toFixed(2)} TND).`,
    };
  }
  return { ok: true, repartition: { mode: 'custom', organisateur: arrondi(organisateur), invites } };
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}
