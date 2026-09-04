"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { confirmationDe } from "@/lib/confirmation";
import { goToReservation } from "@/lib/auth";
import { formatSubtypeLabel, formatOfferCapacityLabel, getBookingUnitPrice, hasSelectableFormulas, isPackageOffer, defaultPackageSubtypes } from "@/lib/offer-variant";
import {
  MapPin, Clock, Users, Star, Leaf, ChevronLeft, ArrowRight,
  Calendar, Zap, CheckCircle, Info, Shield, UserCircle, Globe,
  Phone, Package, Tag,
} from "lucide-react";
import SustainabilityBadge from "@/components/common/SustainabilityBadge";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  duration: string | null;
  offer_type: string | null;
  offer_subtype: string | null;
  offer_mode?: string | null;
  offer_subtypes?: string[] | null;
  variant_pricing?: Record<string, number> | null;
  price_display_from?: number | null;
  fulfillment_mode: string | null;
  confirmation_mode: string | null;
  capacity: number | null;
  deposit_percentage: number | null;
  booking_deadline_hours: number | null;
  confirmation_deadline_hours: number | null;
  min_group_size: number | null;
  max_group_size: number | null;
  min_age: number | null;
  cancellation_policy: string | null;
  inclusions: string | null;
  meeting_point: string | null;
  region: string | null;
  images: string[] | null;
  sustainability_score: number | null;
  author_id: string;
  details: any;
}

interface Provider {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  provider_type: string | null;
  bio: string | null;
  region: string | null;
  photo: string | null;
  phone: string | null;
  website: string | null;
  sustainability_score: number | null;
  languages_spoken: string[] | null;
  eco_labels: string[] | null;
  years_experience: number | null;
}

interface OfferSession {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  spots_taken: number;
  status: string;
}

const TYPE_ICONS: Record<string, string> = {
  hebergement: "🏕️", activite: "🧗", circuit: "🗺️",
  restauration: "🍽️", artisanat: "🪴", location_materiel: "🎒",
  volontariat: "🌱", bien_etre: "🧘", transport: "🚌",
};

const TYPE_LABELS: Record<string, string> = {
  hebergement: "Hébergement", activite: "Activité", circuit: "Circuit",
  restauration: "Restauration", artisanat: "Artisanat", location_materiel: "Location matériel",
  volontariat: "Volontariat", bien_etre: "Bien-être", transport: "Transport",
};

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  guide: "Guide nature", agence: "Agence de voyage", ecolodge: "Écolodge",
  restaurant: "Restauration", artisan: "Artisan", association: "Association",
  bien_etre: "Bien-être", transport: "Transport",
};

const PRICE_UNIT: Record<string, string> = {
  per_person: "/ pers.", per_group: "/ groupe",
  per_night: "/ nuit", per_unit: "/ unité", on_request: "",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  instant_stock: "Réservation directe", calendar_stock: "Sur calendrier",
  scheduled: "Séances planifiées", recurring: "Récurrent",
  on_request: "Sur demande", mixed: "Mixte",
};

export default function OfferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [sessions, setSessions] = useState<OfferSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    apiFetch<Offer>(`/offers/${id}`)
      .then((o) => {
        setOffer(o);
        if (isPackageOffer(o)) setSelectedSubtypes(defaultPackageSubtypes(o));
        return Promise.all([
          apiFetch<Provider>(`/providers/${o.author_id}`).catch(() => null),
          (o.fulfillment_mode === "scheduled" || o.fulfillment_mode === "recurring")
            ? apiFetch<OfferSession[]>(`/offers/${id}/sessions`).catch(() => [])
            : Promise.resolve([]),
        ]);
      })
      .then(([p, s]) => {
        if (p) setProvider(p as Provider);
        setSessions(s as OfferSession[]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-64 bg-slate-200 animate-pulse" />
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
        <Leaf size={40} className="opacity-30" />
        <p>Offre introuvable</p>
        <button onClick={() => router.push("/offers")} className="text-emerald-600 text-sm hover:underline">
          Retour aux offres
        </button>
      </div>
    );
  }

  const canReserve = true;
  const isVariant = hasSelectableFormulas(offer);
  const isPackage = isPackageOffer(offer);
  const displayPrice = isVariant || isPackage
    ? getBookingUnitPrice(offer, selectedSubtypes) ?? offer.price_display_from ?? offer.price
    : offer.price;
  const capacityLabel = formatOfferCapacityLabel(offer);
  const priceUnit = PRICE_UNIT[offer.price_type ?? "per_person"] ?? "/ pers.";
  const hasDeposit = offer.deposit_percentage && offer.deposit_percentage > 0;
  const depositAmount = displayPrice && hasDeposit ? (Number(displayPrice) * offer.deposit_percentage!) / 100 : null;

  const futureSessions = sessions.filter((s) => new Date(s.date) >= new Date() && s.status !== "cancelled");

  const goReserve = () => {
    if (isVariant && selectedSubtypes.length === 0) return;
    goToReservation(offer.id, selectedSubtypes.length ? selectedSubtypes : undefined);
  };

  function toggleSubtype(key: string) {
    setSelectedSubtypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort(),
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header sticky */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 flex-1 text-sm line-clamp-1">{offer.title}</h1>
          {canReserve && (
            <button
              onClick={goReserve}
              disabled={isVariant && selectedSubtypes.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Réserver <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Galerie */}
      <div className="relative bg-gradient-to-br from-emerald-100 to-teal-200">
        <div className="h-72 overflow-hidden">
          {offer.images && offer.images.length > 0 ? (
            <img src={offer.images[activeImage]} alt={offer.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">
              {TYPE_ICONS[offer.offer_type ?? ""] ?? "🌿"}
            </div>
          )}
        </div>
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {offer.offer_type && (
            <span className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold text-slate-700">
              {TYPE_ICONS[offer.offer_type]} {TYPE_LABELS[offer.offer_type] ?? offer.offer_type}
            </span>
          )}
          <SustainabilityBadge score={offer.sustainability_score} kind="offer" variant="overlay" />
        </div>
        {hasDeposit && (
          <div className="absolute top-4 right-4 bg-amber-500 text-white rounded-full px-3 py-1 text-xs font-bold">
            Acompte {offer.deposit_percentage}%
          </div>
        )}
        {/* Miniatures */}
        {offer.images && offer.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {offer.images.map((_, i) => (
              <button key={i} onClick={() => setActiveImage(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? "bg-white w-4" : "bg-white/50"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Titre + prix */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">{offer.title}</h2>
              {offer.offer_subtype && (
                <p className="text-sm text-slate-400 mt-0.5">{offer.offer_subtype}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {offer.price_type === "on_request" || (!displayPrice && !isVariant) ? (
                <span className="text-emerald-600 font-bold text-lg">Sur devis</span>
              ) : (
                <>
                  {isVariant && selectedSubtypes.length === 0 && (
                    <p className="text-xs text-slate-400 mb-0.5">À partir de</p>
                  )}
                  <span className="text-emerald-600 font-bold text-2xl">{Number(displayPrice).toFixed(0)}</span>
                  <span className="text-slate-400 text-sm ml-1">TND {priceUnit}</span>
                </>
              )}
              {hasDeposit && depositAmount && (
                <p className="text-amber-600 text-xs font-semibold mt-0.5">
                  Acompte {depositAmount.toFixed(0)} TND
                </p>
              )}
            </div>
          </div>

          {/* Meta tags */}
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            {offer.region && (
              <span className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-slate-600">
                <MapPin size={11} /> {offer.region}
              </span>
            )}
            {offer.duration && (
              <span className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-slate-600">
                <Clock size={11} /> {offer.duration}
              </span>
            )}
            {offer.capacity && (
              <span className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-slate-600">
                <Users size={11} /> {offer.capacity} places
              </span>
            )}
            {offer.fulfillment_mode && (
              <span className="flex items-center gap-1 bg-emerald-100 rounded-full px-3 py-1 text-emerald-700 font-medium">
                {FULFILLMENT_LABELS[offer.fulfillment_mode]}
              </span>
            )}
            {confirmationDe(offer as any).mode === "instant" && (
              <span className="flex items-center gap-1 bg-amber-100 rounded-full px-3 py-1 text-amber-700 font-medium">
                <Zap size={11} /> Confirmation instantanée
              </span>
            )}
          </div>
        </div>

        {/* Formules (variant) */}
        {isVariant && offer.variant_pricing && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Package size={16} className="text-emerald-500" /> Formules disponibles
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sélectionnez une ou plusieurs formules. Le nombre de participants est celui de l&apos;offre
              {capacityLabel ? ` (${capacityLabel.toLowerCase()}).` : "."}
            </p>
            <div className="space-y-2">
              {Object.entries(offer.variant_pricing).map(([key, price]) => {
                const selected = selectedSubtypes.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSubtype(key)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3
                      ${selected
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-100 hover:border-emerald-200"}`}
                  >
                    <div>
                      <span className="font-semibold text-slate-800 text-sm block">
                        {formatSubtypeLabel(key)}
                      </span>
                      {capacityLabel && (
                        <span className="text-[11px] text-slate-400">{capacityLabel}</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-emerald-600 whitespace-nowrap">
                      {price.toFixed(0)} TND {priceUnit}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isPackage && offer.variant_pricing && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
            <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
              <Package size={16} /> Package tout inclus
            </h3>
            <ul className="text-sm text-emerald-700 space-y-1">
              {Object.entries(offer.variant_pricing).map(([key, price]) => (
                <li key={key} className="flex justify-between gap-2">
                  <span>{formatSubtypeLabel(key)}</span>
                  <span className="font-semibold">{price.toFixed(0)} TND</span>
                </li>
              ))}
            </ul>
            {capacityLabel && <p className="text-xs text-emerald-600 mt-2">{capacityLabel}</p>}
          </div>
        )}

        {/* Description */}
        {offer.description && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Info size={16} className="text-emerald-500" /> À propos
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">{offer.description}</p>
          </div>
        )}

        {/* Inclus */}
        {offer.inclusions && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
            <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
              <CheckCircle size={16} /> Ce qui est inclus
            </h3>
            <p className="text-emerald-700 text-sm leading-relaxed">{offer.inclusions}</p>
          </div>
        )}

        {/* Infos pratiques */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Tag size={16} className="text-emerald-500" /> Infos pratiques
          </h3>
          <div className="space-y-2 text-sm">
            {offer.min_group_size || offer.max_group_size ? (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Groupe</span>
                <span className="text-slate-700 font-medium">
                  {offer.min_group_size ? `Min ${offer.min_group_size}` : ""}
                  {offer.min_group_size && offer.max_group_size ? " – " : ""}
                  {offer.max_group_size ? `Max ${offer.max_group_size} pers.` : ""}
                </span>
              </div>
            ) : null}
            {offer.min_age ? (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Âge minimum</span>
                <span className="text-slate-700 font-medium">{offer.min_age} ans</span>
              </div>
            ) : null}
            {offer.booking_deadline_hours ? (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Délai de réservation</span>
                <span className="text-slate-700 font-medium">{offer.booking_deadline_hours}h avant</span>
              </div>
            ) : null}
            {offer.meeting_point && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Point de départ</span>
                <span className="text-slate-700 font-medium text-right max-w-52">{offer.meeting_point}</span>
              </div>
            )}
          </div>
        </div>

        {/* Séances disponibles */}
        {futureSessions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-emerald-500" /> Prochaines séances
            </h3>
            <div className="space-y-2">
              {futureSessions.slice(0, 5).map((s) => {
                const available = (s.capacity ?? offer.capacity ?? 0) - s.spots_taken;
                const full = available <= 0;
                return (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border
                    ${full ? "bg-slate-50 border-slate-100 opacity-60" : "bg-emerald-50 border-emerald-100"}`}>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {new Date(s.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      {(s.start_time || s.end_time) && (
                        <p className="text-xs text-slate-500">
                          {s.start_time}{s.end_time ? ` → ${s.end_time}` : ""}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${full ? "bg-red-100 text-red-600" : "bg-emerald-200 text-emerald-800"}`}>
                      {full ? "Complet" : `${available} place${available > 1 ? "s" : ""}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Prestataire */}
        {provider && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <UserCircle size={16} className="text-emerald-500" /> Le prestataire
            </h3>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
                {provider.photo
                  ? <img src={provider.photo} alt="" className="w-full h-full object-cover" />
                  : "🌿"}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">{provider.full_name ?? provider.organization}</p>
                {provider.organization && provider.full_name && (
                  <p className="text-xs text-slate-400">{provider.organization}</p>
                )}
                {provider.provider_type && (
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">
                    {PROVIDER_TYPE_LABELS[provider.provider_type] ?? provider.provider_type}
                  </p>
                )}
                {provider.region && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {provider.region}
                  </p>
                )}
              </div>
              {provider.sustainability_score !== null && (
                <div className="text-right">
                  <div className="text-emerald-600 font-bold text-lg">{provider.sustainability_score}</div>
                  <div className="text-xs text-slate-400">score éco</div>
                </div>
              )}
            </div>
            {provider.bio && (
              <p className="text-sm text-slate-600 mt-3 leading-relaxed line-clamp-3">{provider.bio}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {provider.languages_spoken?.map((l) => (
                <span key={l} className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-medium">{l}</span>
              ))}
              {provider.years_experience ? (
                <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{provider.years_experience} ans d'expérience</span>
              ) : null}
              {provider.eco_labels?.map((l) => (
                <span key={l} className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">🌿 {l}</span>
              ))}
            </div>
            <button onClick={() => router.push(`/profile/provider/${provider.user_id}`)}
              className="mt-3 text-xs text-emerald-600 hover:underline font-semibold">
              Voir le profil complet →
            </button>
          </div>
        )}

        {/* Politique d'annulation */}
        {offer.cancellation_policy && (
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
            <h3 className="font-bold text-amber-800 text-sm mb-1 flex items-center gap-2">
              <Shield size={14} /> Politique d'annulation
            </h3>
            <p className="text-amber-700 text-xs">{offer.cancellation_policy}</p>
          </div>
        )}
      </div>

      {/* Barre d'action fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-lg px-4 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            {offer.price_type === "on_request" || (!displayPrice && !isVariant) ? (
              <p className="font-bold text-slate-800">Prix sur devis</p>
            ) : (
              <p className="font-bold text-slate-800">
                {isVariant && selectedSubtypes.length === 0 && (
                  <span className="text-slate-400 text-xs font-normal block">À partir de</span>
                )}
                <span className="text-emerald-600 text-xl">{Number(displayPrice).toFixed(0)} TND</span>
                <span className="text-slate-400 text-sm font-normal"> {priceUnit}</span>
              </p>
            )}
            {hasDeposit && <p className="text-xs text-amber-600">Acompte {offer.deposit_percentage}% requis</p>}
            {isVariant && selectedSubtypes.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">Choisissez une formule ci-dessus</p>
            )}
          </div>
          {canReserve ? (
            <button
              onClick={goReserve}
              disabled={isVariant && selectedSubtypes.length === 0}
              className="flex-1 max-w-56 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              Réserver <ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
