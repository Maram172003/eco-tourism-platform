"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import CircuitViewContent from "@/components/circuit/CircuitViewContent";
import { goToCircuitReservation, goToReservation } from "@/lib/auth";
import {
  formatSubtypeLabel,
  formatOfferCapacityLabel,
  getBookingUnitPrice,
  hasSelectableFormulas,
  isPackageOffer,
  defaultPackageSubtypes,
} from "@/lib/offer-variant";

/**
 * Fenêtres de détail des offres et des circuits.
 *
 * Extraites de `app/destinations/page.tsx`, où elles étaient définies en local :
 * la page d'accueil en a besoin à l'identique, et une seconde copie aurait
 * divergé au premier ajustement — le défaut récurrent de ce dépôt.
 */

export const OFFER_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&q=80",
  "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
];

export const PARTNER_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1552422535-c45813c61732?w=800&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=80",
  "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80",
  "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80",
];

export function seedFromId(id: string, mod: number): number {
  return id.charCodeAt(0) % mod;
}

/** Offre telle qu'attendue par la fenêtre — sous-ensemble accepté par les deux appelants. */
export type ModalOffer = OfferFull & {
  author_type?: string | null;
  author_name?: string | null;
  author_photo?: string | null;
  org_name?: string | null;
  org_logo?: string | null;
  offer_mode?: string | null;
  offer_subtypes?: string[] | null;
  variant_pricing?: Record<string, number> | null;
  price_display_from?: number | null;
  capacity?: number | null;
};

export type ModalCircuit = {
  id: string;
  title: string;
  cover_image: string | null;
  owner_type?: string | null;
  author_name?: string | null;
  author_photo?: string | null;
  price?: number | null;
  price_display_from?: number | null;
  bookable_options?: Array<{ key: string; label: string; price_per_person: number }> | null;
  [k: string]: any;
};

/** Ferme sur Échap et gèle le défilement de la page derrière la fenêtre. */
function useFermetureModale(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
}

export function ImageGallery({ images, fallback }: { images: string[]; fallback: string }) {
  const [idx, setIdx] = useState(0);
  const all = images.length ? images : [fallback];

  return (
    <div className="relative w-full h-72 md:h-96 overflow-hidden rounded-t-2xl bg-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{ backgroundImage: `url('${all[idx]}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      {all.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + all.length) % all.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % all.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {all.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Offre ─────────────────────────────────────────────────────────────────────

export function OfferModal({ offer, onClose }: { offer: ModalOffer; onClose: () => void }) {
  const isGuide = offer.author_type === "guide";
  const isVariant = hasSelectableFormulas(offer);
  const isPackage = isPackageOffer(offer);
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>(() =>
    isPackage ? defaultPackageSubtypes(offer) : [],
  );
  const capacityLabel = formatOfferCapacityLabel(offer);
  const displayPrice =
    isVariant || isPackage
      ? getBookingUnitPrice(offer, selectedSubtypes) ?? offer.price_display_from ?? offer.price
      : offer.price;

  function toggleSubtype(key: string) {
    setSelectedSubtypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort(),
    );
  }

  function handleReserve() {
    if (isVariant && selectedSubtypes.length === 0) return;
    goToReservation(offer.id, selectedSubtypes.length ? selectedSubtypes : undefined);
  }

  useFermetureModale(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {offer.author_name && (
          <div className="flex items-center gap-3 px-6 pt-6 pb-3 border-b border-slate-100">
            {offer.author_photo ? (
              <img src={offer.author_photo} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${isGuide ? "bg-emerald-500" : "bg-blue-500"}`}>
                {offer.author_name[0]}
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-slate-800 text-sm">{offer.author_name}</p>
              {offer.org_name && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {offer.org_logo && <img src={offer.org_logo} alt="" className="w-4 h-4 rounded object-cover" />}
                  <p className="text-xs font-semibold text-slate-400">{offer.org_name}</p>
                </div>
              )}
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${isGuide ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
              {isGuide ? "Guide certifié" : "Prestataire"}
            </span>
          </div>
        )}

        <OfferDetailView offer={{
          id: offer.id,
          title: offer.title,
          description: offer.description,
          offer_type: offer.offer_type,
          duration: offer.duration,
          region: offer.region,
          price: offer.price,
          images: offer.images,
          meeting_point: offer.meeting_point,
          meeting_lat: offer.meeting_lat,
          meeting_lng: offer.meeting_lng,
          max_group_size: offer.max_group_size,
          min_group_size: offer.min_group_size,
          min_age: offer.min_age,
          capacity: offer.capacity,
          cancellation_policy: offer.cancellation_policy,
          inclusions: offer.inclusions,
          offer_mode: offer.offer_mode,
          offer_subtypes: offer.offer_subtypes,
          variant_pricing: offer.variant_pricing,
          price_display_from: offer.price_display_from,
          details: offer.details,
        }} />

        {isVariant && offer.variant_pricing && (
          <div className="px-6 pb-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Formules — sélection multiple</p>
            <div className="space-y-2">
              {Object.entries(offer.variant_pricing).map(([key, price]) => {
                const selected = selectedSubtypes.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSubtype(key)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 flex justify-between gap-3 ${selected ? "border-primary bg-primary/5" : "border-slate-100"}`}
                  >
                    <div>
                      <span className="text-sm font-bold text-slate-800">{formatSubtypeLabel(key)}</span>
                      {capacityLabel && <span className="block text-[11px] text-slate-400">{capacityLabel}</span>}
                    </div>
                    <span className="text-sm font-bold text-primary">{price} TND</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-5 border-t border-slate-100">
          {displayPrice !== null ? (
            <div>
              <p className="text-xs text-slate-400 font-medium">
                {isVariant && selectedSubtypes.length === 0 ? "À partir de" : "Total / pers."}
              </p>
              <p className="text-3xl font-black text-slate-900">{Number(displayPrice).toFixed(0)} <span className="text-lg font-bold text-slate-400">TND</span></p>
            </div>
          ) : (
            <p className="text-base font-semibold text-slate-400 italic">Prix sur demande</p>
          )}
          <button
            onClick={handleReserve}
            disabled={isVariant && selectedSubtypes.length === 0}
            className="h-12 px-8 rounded-xl bg-primary text-slate-900 font-extrabold hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
          >
            Réserver cette offre
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Circuit ───────────────────────────────────────────────────────────────────

export function CircuitModal({ circuit, onClose }: { circuit: ModalCircuit; onClose: () => void }) {
  const fallback = OFFER_PLACEHOLDERS[seedFromId(circuit.id, OFFER_PLACEHOLDERS.length)];
  const priceFrom = circuit.price_display_from ?? circuit.price;
  const bookable = (circuit.bookable_options?.length ?? 0) > 0 || priceFrom != null;

  useFermetureModale(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <ImageGallery images={circuit.cover_image ? [circuit.cover_image] : []} fallback={fallback} />

        <button onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="bg-slate-100 text-slate-700 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest">Circuit</span>
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
              {circuit.owner_type === "guide" ? "Guide certifié" : "Prestataire"}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-3">{circuit.title}</h2>

          {circuit.author_name && (
            <div className="flex items-center gap-3">
              {circuit.author_photo ? (
                <img src={circuit.author_photo} alt="" className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                  {circuit.author_name[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-slate-800 text-sm">{circuit.author_name}</p>
                <p className="text-xs text-slate-400">{circuit.owner_type === "guide" ? "Guide certifié" : "Prestataire"}</p>
              </div>
            </div>
          )}
        </div>

        <CircuitViewContent circuit={circuit} ownerName={circuit.author_name ?? undefined} />

        {bookable && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4 bg-slate-50/80">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">À partir de</p>
              <p className="text-xl font-black text-slate-900">
                {(priceFrom ?? 0).toFixed(0)} TND
                <span className="text-sm font-semibold text-slate-500"> / pers.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => goToCircuitReservation(circuit.id)}
              className="h-11 px-6 rounded-xl bg-primary text-slate-900 font-bold hover:bg-primary/90 transition-all text-sm shrink-0"
            >
              Réserver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
