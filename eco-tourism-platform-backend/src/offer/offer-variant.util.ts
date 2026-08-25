import { Offer } from './entities/offer.entity';

/** Parse details.subtypes_pricing (or legacy details.prices) into numeric map. */
export function getVariantPricing(
  details: Record<string, unknown> | null | undefined,
): Record<string, number> {
  if (!details || typeof details !== 'object') return {};
  const raw =
    (details.subtypes_pricing as Record<string, unknown> | undefined) ??
    (details.prices as Record<string, unknown> | undefined);
  if (!raw || typeof raw !== 'object') return {};

  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    const n = Number(val);
    if (!Number.isNaN(n) && n >= 0) out[key] = n;
  }
  return out;
}

export function enrichOfferWithVariantFields<T extends Offer>(offer: T): T & {
  variant_pricing: Record<string, number> | null;
  price_display_from: number | null;
} {
  const variant_pricing = (() => {
    const map = getVariantPricing(offer.details as Record<string, unknown> | null);
    return Object.keys(map).length ? map : null;
  })();

  const prices = variant_pricing ? Object.values(variant_pricing) : [];
  const fromOffer = offer.price != null ? Number(offer.price) : null;
  const price_display_from =
    prices.length > 0 ? Math.min(...prices) : fromOffer;

  return {
    ...offer,
    variant_pricing,
    price_display_from,
  };
}

/** Sum unit price for selected subtypes (variant multi-select or package). */
export function resolveBookingUnitPrice(
  offer: Offer,
  chosenSubtypes: string[] | null | undefined,
): number | null {
  const pricing = getVariantPricing(offer.details as Record<string, unknown> | null);
  const mode = offer.offer_mode;

  if ((mode === 'variant' || mode === 'package') && chosenSubtypes?.length) {
    let sum = 0;
    let hasPrice = false;
    for (const key of chosenSubtypes) {
      const p = pricing[key];
      if (p !== undefined) {
        sum += p;
        hasPrice = true;
      }
    }
    if (hasPrice) return sum;
    return offer.price != null ? Number(offer.price) : null;
  }

  return offer.price != null ? Number(offer.price) : null;
}

/** @deprecated use resolveBookingUnitPrice */
export function resolveVariantUnitPrice(
  offer: Offer,
  chosenSubtype: string | null | undefined,
): number | null {
  return resolveBookingUnitPrice(
    offer,
    chosenSubtype ? [chosenSubtype] : null,
  );
}

export function sortSubtypeKeys(keys: string[]): string[] {
  return [...keys].sort();
}
