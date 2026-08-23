"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import CircuitViewContent from "@/components/circuit/CircuitViewContent";

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
};

export type ModalCircuit = {
  id: string;
  title: string;
  cover_image: string | null;
  owner_type?: string | null;
  author_name?: string | null;
  author_photo?: string | null;
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
  const router = useRouter();

  function handleReserve() {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      router.push(`/auth/login?redirect=/reservations/new?offerId=${offer.id}`);
    } else {
      router.push(`/reservations/new?offerId=${offer.id}`);
    }
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
          cancellation_policy: offer.cancellation_policy,
          inclusions: offer.inclusions,
          details: offer.details,
        }} />

        <div className="flex items-center justify-between px-6 py-5 border-t border-slate-100">
          {offer.price !== null ? (
            <div>
              <p className="text-xs text-slate-400 font-medium">À partir de</p>
              <p className="text-3xl font-black text-slate-900">{offer.price} <span className="text-lg font-bold text-slate-400">TND</span></p>
            </div>
          ) : (
            <p className="text-base font-semibold text-slate-400 italic">Prix sur demande</p>
          )}
          <button onClick={handleReserve} className="h-12 px-8 rounded-xl bg-primary text-slate-900 font-extrabold hover:bg-primary/90 transition-colors text-sm">
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
      </div>
    </div>
  );
}
