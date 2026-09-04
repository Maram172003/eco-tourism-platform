/**
 * Répartition du paiement d'une réservation de groupe.
 *
 * Miroir de `src/common/payment-split.util.ts` côté serveur : l'écran de
 * réservation calcule les montants pour les montrer avant l'envoi, le serveur
 * les recalcule et les enregistre. Les deux doivent rester alignés — sinon
 * l'organisateur voit une somme et en paie une autre.
 */

export type ModeRepartition = "organizer" | "equal" | "custom";

export const MODES_REPARTITION: Array<{
  cle: ModeRepartition;
  titre: string;
  description: string;
  icone: string;
}> = [
  {
    cle: "organizer",
    titre: "Je paie pour tout le monde",
    description: "Vous réglez la totalité, vos invités n'ont rien à payer.",
    icone: "account_balance_wallet",
  },
  {
    cle: "equal",
    titre: "Division équitable",
    description: "Le total est partagé à parts égales entre tous les participants.",
    icone: "balance",
  },
  {
    cle: "custom",
    titre: "Répartition personnalisée",
    description: "Vous fixez vous-même le montant de chacun.",
    icone: "tune",
  },
];

/**
 * Parts égales exactes.
 *
 * Diviser puis arrondir chaque part fait perdre ou inventer des centimes
 * (100 / 3 → 33.33 × 3 = 99.99). Le reste de la division est donc distribué
 * centime par centime sur les premières parts.
 */
export function partsEgales(total: number, nb: number): number[] {
  if (nb <= 0) return [];
  const centimes = Math.round(total * 100);
  const base = Math.floor(centimes / nb);
  const reste = centimes - base * nb;
  return Array.from({ length: nb }, (_, i) => (base + (i < reste ? 1 : 0)) / 100);
}

export type Repartition = {
  /** Ce que doit l'organisateur. */
  organisateur: number;
  /** Ce que doit chaque invité, indexé par son `user_id`. */
  invites: Record<string, number>;
  /** Ce qu'il reste à attribuer — non nul, la réservation est refusée. */
  reste: number;
  /** Message à montrer tant que la répartition ne tombe pas juste. */
  erreur: string | null;
};

/**
 * @param mode     Le choix de l'organisateur.
 * @param total    Prix total ; `null` quand le prestataire fixera le montant.
 * @param invites  `user_id` des invités, dans l'ordre d'invitation.
 * @param saisie   Montants saisis en répartition personnalisée.
 */
export function calculerRepartition(
  mode: ModeRepartition,
  total: number | null,
  invites: string[],
  saisie?: { organisateur?: number | null; invites?: Record<string, number | null> },
): Repartition {
  const vide = Object.fromEntries(invites.map((c) => [c, 0]));
  if (total === null) {
    return { organisateur: 0, invites: vide, reste: 0, erreur: null };
  }

  if (mode === "organizer") {
    return { organisateur: arrondi(total), invites: vide, reste: 0, erreur: null };
  }

  if (mode === "equal") {
    // L'organisateur compte pour une part, au même titre que ses invités.
    const parts = partsEgales(total, invites.length + 1);
    return {
      organisateur: parts[0],
      invites: Object.fromEntries(invites.map((c, i) => [c, parts[i + 1]])),
      reste: 0,
      erreur: null,
    };
  }

  const organisateur = nombre(saisie?.organisateur);
  const parInvite = Object.fromEntries(
    invites.map((c) => [c, nombre(saisie?.invites?.[c])]),
  );
  const somme = arrondi(Object.values(parInvite).reduce((s, v) => s + v, organisateur));
  const reste = arrondi(arrondi(total) - somme);
  return {
    organisateur,
    invites: parInvite,
    reste,
    erreur:
      Math.abs(reste) < 0.005
        ? null
        : reste > 0
          ? `Il reste ${reste.toFixed(2)} TND à répartir.`
          : `Vous avez réparti ${Math.abs(reste).toFixed(2)} TND de trop.`,
  };
}

function nombre(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? arrondi(v) : 0;
}

function arrondi(v: number): number {
  return Math.round(v * 100) / 100;
}
