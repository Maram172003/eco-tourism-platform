/** Human-readable label for offer subtype keys (chambre_foret → Chambre foret). */
export function formatSubtypeLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type OfferVariantFields = {
  offer_mode?: string | null;
  price?: number | null;
  variant_pricing?: Record<string, number> | null;
  offer_subtypes?: string[] | null;
  capacity?: number | null;
  max_group_size?: number | null;
};

export function formatOfferCapacityLabel(
  offer: Pick<OfferVariantFields, "capacity" | "max_group_size"> | null | undefined,
): string | null {
  if (!offer) return null;
  const cap = offer.max_group_size ?? offer.capacity;
  if (!cap || cap < 1) return null;
  return `Jusqu'à ${cap} personne${cap > 1 ? "s" : ""}`;
}

export function getBookingUnitPrice(
  offer: OfferVariantFields | null | undefined,
  chosenSubtypes: string[],
): number | null {
  if (!offer) return null;
  const mode = offer.offer_mode;
  if ((mode === "variant" || mode === "package") && chosenSubtypes.length && offer.variant_pricing) {
    let sum = 0;
    let has = false;
    for (const key of chosenSubtypes) {
      const p = offer.variant_pricing[key];
      if (p !== undefined) {
        sum += p;
        has = true;
      }
    }
    if (has) return sum;
  }
  return offer.price != null ? Number(offer.price) : null;
}

/** @deprecated use getBookingUnitPrice */
export function getVariantUnitPrice(
  offer: OfferVariantFields | null | undefined,
  chosenSubtype: string | null,
): number | null {
  return getBookingUnitPrice(offer, chosenSubtype ? [chosenSubtype] : []);
}

export function hasSelectableFormulas(offer: OfferVariantFields | null | undefined): boolean {
  if (!offer) return false;
  return (
    offer.offer_mode === "variant" &&
    !!offer.variant_pricing &&
    Object.keys(offer.variant_pricing).length > 0
  );
}

export function isPackageOffer(offer: OfferVariantFields | null | undefined): boolean {
  if (!offer) return false;
  return offer.offer_mode === "package" && (offer.offer_subtypes?.length ?? 0) > 0;
}

export function defaultPackageSubtypes(offer: OfferVariantFields | null | undefined): string[] {
  if (!isPackageOffer(offer)) return [];
  return [...(offer!.offer_subtypes ?? [])].sort();
}

export function parseSubtypesParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function subtypesToParam(subtypes: string[]): string {
  return [...subtypes].sort().join(",");
}
