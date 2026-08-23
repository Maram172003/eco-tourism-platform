"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  MapPin, Clock, Users, Star, Leaf, Search, Filter, ArrowRight,
  ChevronLeft, Tag,
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
  fulfillment_mode: string | null;
  confirmation_mode: string | null;
  capacity: number | null;
  deposit_percentage: number | null;
  region: string | null;
  images: string[] | null;
  min_group_size: number | null;
  max_group_size: number | null;
  sustainability_score: number | null;
  author_id: string;
  author_type: string;
}

const FULFILLMENT_LABELS: Record<string, string> = {
  instant_stock: "Réservation directe",
  calendar_stock: "Sur calendrier",
  scheduled: "Séances planifiées",
  recurring: "Récurrent",
  on_request: "Sur demande",
  mixed: "Mixte",
};

const PRICE_UNIT: Record<string, string> = {
  per_person: "/ pers.",
  per_group: "/ groupe",
  per_night: "/ nuit",
  per_unit: "/ unité",
  on_request: "",
};

const TYPE_LABELS: Record<string, string> = {
  hebergement: "Hébergement",
  activite: "Activité",
  circuit: "Circuit",
  restauration: "Restauration",
  artisanat: "Artisanat",
  location_materiel: "Location matériel",
  volontariat: "Volontariat",
  bien_etre: "Bien-être",
  transport: "Transport",
};

const TYPE_ICONS: Record<string, string> = {
  hebergement: "🏕️",
  activite: "🧗",
  circuit: "🗺️",
  restauration: "🍽️",
  artisanat: "🪴",
  location_materiel: "🎒",
  volontariat: "🌱",
  bien_etre: "🧘",
  transport: "🚌",
};

const TYPE_COLORS: Record<string, string> = {
  hebergement: "bg-blue-100 text-blue-700",
  activite: "bg-amber-100 text-amber-700",
  circuit: "bg-teal-100 text-teal-700",
  restauration: "bg-rose-100 text-rose-700",
  artisanat: "bg-purple-100 text-purple-700",
  location_materiel: "bg-orange-100 text-orange-700",
  volontariat: "bg-emerald-100 text-emerald-700",
  bien_etre: "bg-pink-100 text-pink-700",
  transport: "bg-slate-100 text-slate-700",
};

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filtered, setFiltered] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    apiFetch<Offer[]>("/offers")
      .then((data) => {
        setOffers(data);
        setFiltered(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = offers;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (o.description && o.description.toLowerCase().includes(q)) ||
          (o.region && o.region.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((o) => o.offer_type === typeFilter);
    }
    setFiltered(result);
  }, [search, typeFilter, offers]);

  const canReserve = user?.role === "eco_traveler";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
          >
            <ChevronLeft size={18} />
            Retour
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Leaf size={20} className="text-emerald-500" />
            Catalogue des offres
          </h1>
          <span className="text-sm text-slate-400">{filtered.length} offre{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filtres */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une offre, région..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <option value="all">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Leaf size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucune offre trouvée</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                canReserve={canReserve}
                onReserve={() => router.push(`/reservations/new?offerId=${offer.id}`)}
                onDetail={() => router.push(`/offers/${offer.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  canReserve,
  onReserve,
  onDetail,
}: {
  offer: Offer;
  canReserve: boolean;
  onReserve: () => void;
  onDetail: () => void;
}) {
  const typeColor = TYPE_COLORS[offer.offer_type ?? ""] ?? "bg-slate-100 text-slate-600";
  const typeLabel = TYPE_LABELS[offer.offer_type ?? ""] ?? offer.offer_type ?? "Autre";
  const typeIcon = TYPE_ICONS[offer.offer_type ?? ""] ?? "🌿";
  const priceUnit = PRICE_UNIT[offer.price_type ?? "per_person"] ?? "/ pers.";
  const fulfillmentLabel = offer.fulfillment_mode ? FULFILLMENT_LABELS[offer.fulfillment_mode] : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Image */}
      <div className="h-44 bg-gradient-to-br from-emerald-100 to-teal-200 relative overflow-hidden">
        {offer.images?.[0] ? (
          <img
            src={offer.images[0]}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {typeIcon}
          </div>
        )}
        <SustainabilityBadge score={offer.sustainability_score} kind="offer" variant="overlay"
          className="absolute top-3 right-3" />
        {offer.offer_type && (
          <div className={`absolute top-3 left-3 rounded-full px-2 py-1 text-xs font-semibold ${typeColor}`}>
            {typeIcon} {typeLabel}
          </div>
        )}
        {offer.deposit_percentage ? (
          <div className="absolute bottom-3 left-3 bg-amber-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
            Acompte {offer.deposit_percentage}%
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-slate-800 text-base mb-1 line-clamp-1">{offer.title}</h3>
        {offer.offer_subtype && (
          <span className="text-xs text-slate-400 mb-1">{offer.offer_subtype}</span>
        )}
        {offer.description && (
          <p className="text-slate-500 text-sm line-clamp-2 mb-3">{offer.description}</p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-3">
          {offer.region && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {offer.region}
            </span>
          )}
          {offer.duration && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {offer.duration}
            </span>
          )}
          {offer.capacity && (
            <span className="flex items-center gap-1">
              <Users size={11} /> {offer.capacity} places
            </span>
          )}
          {fulfillmentLabel && (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              {fulfillmentLabel}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div>
            {offer.price_type === "on_request" ? (
              <span className="text-slate-500 text-sm font-medium italic">Sur devis</span>
            ) : offer.price !== null ? (
              <span className="text-emerald-600 font-bold text-lg">
                {Number(offer.price).toFixed(0)}{" "}
                <span className="text-sm font-normal text-slate-400">TND {priceUnit}</span>
              </span>
            ) : (
              <span className="text-slate-400 text-sm">Prix non défini</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDetail}
              className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Détails
            </button>
            {canReserve && (
              <button
                onClick={onReserve}
                className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 flex items-center gap-1"
              >
                Réserver <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
