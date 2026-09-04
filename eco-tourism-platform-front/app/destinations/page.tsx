"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Leaf,
  Search,
  SlidersHorizontal,
  X,
  Clock,
  Users,
  MapPin,
  ArrowUpDown,
  Quote,
  Globe,
  Building2,
  Phone,
  Link,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  Star,
  Landmark,
  Mountain,
  UtensilsCrossed,
  Palette,
  Sparkles,
  Heart,
  Bike,
  HandHeart,
  Home,
  Tent,
  TreePine,
  LayoutGrid,
  Route,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { apiFetch } from "@/lib/api";
import {
  OfferModal, CircuitModal, ImageGallery, seedFromId,
  OFFER_PLACEHOLDERS, PARTNER_PLACEHOLDERS,
} from "@/components/destinations/DetailModals";
import { MACRO_CATEGORIES, TAXONOMY_TAGS, getTagsByMacro } from "@/lib/constants/taxonomy-tags";
import type { MacroSlug } from "@/lib/constants/taxonomy-tags";
import { monTableauDeBord } from "@/lib/dashboard-path";

const MapView = dynamic(() => import("@/components/map/MapView"),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" /> }
);

function MeetingMap({ lat, lng, address }: { lat: number | null; lng: number | null; address: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
  );
  const [geocoding, setGeocoding] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (coords) return;
    if (!address) return;
    setGeocoding(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=fr`)
      .then((r) => r.json())
      .then((data) => {
        if (data.length) setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setGeocoding(false));
  }, [address, coords]);

  if (geocoding) return <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold">Chargement de la carte…</div>;
  if (failed || !coords) return null;
  return (
    <div>
      <MapView lat={coords.lat} lng={coords.lng} />
      <a
        href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=14/${coords.lat}/${coords.lng}`}
        target="_blank" rel="noopener noreferrer"
        className="mt-1.5 flex justify-end text-[10px] font-black text-primary uppercase tracking-wider hover:underline"
      >
        Ouvrir dans la carte ↗
      </a>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Offer = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  duration: string | null;
  offer_type: string | null;
  offer_subtypes: string[] | null;
  region: string | null;
  author_type: "guide" | "project_owner" | "provider";
  author_name: string | null;
  author_photo: string | null;
  org_name: string | null;
  org_logo: string | null;
  images: string[] | null;
  inclusions: string | null;
  meeting_point: string | null;
  meeting_lat: number | null;
  meeting_lng: number | null;
  min_group_size: number | null;
  max_group_size: number | null;
  min_age: number | null;
  cancellation_policy: string | null;
  sustainability_score: number | null;
  tags: string[] | null;
  details: Record<string, any> | null;
  offer_mode?: string | null;
  variant_pricing?: Record<string, number> | null;
  price_display_from?: number | null;
  capacity?: number | null;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  address: string | null;
  photo: string | null;
  photos: string[] | null;
  project_type: string[] | null;
  services: string[] | null;
  eco_labels: string[] | null;
  website: string | null;
  phone: string | null;
  facebook: string | null;
  instagram: string | null;
  opening_hours: string | null;
  lat: number | null;
  lng: number | null;
  sustainability_score: number | null;
  status: string;
};

type Experience = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  region: string | null;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[] | null;
  created_at: string;
};

type Circuit = {
  id: string;
  provider_id: string;
  title: string;
  description: string | null;
  nb_jours: number;
  cover_image: string | null;
  etapes: any[];
  hebergement: any | null;
  tags: string[] | null;
  owner_type: string;
  author_name: string | null;
  author_photo: string | null;
  price?: number | null;
  price_display_from?: number | null;
  bookable_options?: Array<{ key: string; label: string; price_per_person: number }> | null;
  created_at: string;
};

type SortKey = "recent" | "price_asc" | "price_desc";

// ─── Constants ─────────────────────────────────────────────────────────────────


const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Plus récent" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
];

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-green-500",
  "bg-lime-600",
];

// ─── Taxonomy matching ─────────────────────────────────────────────────────────

const OFFER_TYPE_TO_MACRO: Partial<Record<string, MacroSlug>> = {
  hebergement:       "hebergement",
  restauration:      "gastronomie",
  artisanat:         "artisanat",
  transport:         "transport_experientiel",
  bien_etre:         "bien_etre",
  location_materiel: "transport_experientiel",
};

// Normalisation subtype offre → slug taxonomie (quand ils diffèrent)
const SUBTYPE_TO_TAG: Record<string, string> = {
  randonnee:                  "randonnee_pedestre",
  velo_vtt:                   "vtt_cyclisme",
  observation_oiseaux:        "ornithologie",
  observation_etoiles:        "astronomie",
  visite_oasis:               "oasis",
  poterie:                    "poterie_ceramique",
  tissage:                    "tissage_tapis",
  location_velo:              "vtt_cyclisme",
  education_environnementale: "conservation_protection",
};

const MACRO_ICON: Record<string, LucideIcon> = {
  nature:                 TreePine,
  histoire_archeologie:   Landmark,
  aventure_sport:         Mountain,
  gastronomie:            UtensilsCrossed,
  artisanat:              Palette,
  decouverte_urbaine:     Building2,
  culture_patrimoine:     Sparkles,
  bien_etre:              Heart,
  transport_experientiel: Bike,
  volontariat:            HandHeart,
  hebergement:            Tent,
};

function getOfferTagSlugs(offer: Offer): string[] {
  const subtypes = offer.offer_subtypes ?? [];
  const normalized = subtypes.map((st) => SUBTYPE_TO_TAG[st] ?? st);
  return [...new Set([...normalized, ...(offer.tags ?? [])])];
}

function offerMatchesMacro(offer: Offer, macro: MacroSlug): boolean {
  if (OFFER_TYPE_TO_MACRO[offer.offer_type ?? ""] === macro) return true;
  const slugs = getOfferTagSlugs(offer);
  return slugs.some((slug) => TAXONOMY_TAGS.find((t) => t.slug === slug)?.macro === macro);
}

function circuitMatchesMacro(circuit: Circuit, macro: MacroSlug): boolean {
  const tags = circuit.tags ?? [];
  if (tags.some((slug) => TAXONOMY_TAGS.find((t) => t.slug === slug)?.macro === macro)) return true;
  return (circuit.etapes ?? []).some((e: any) =>
    (e.subtypes ?? []).some((st: string) => {
      const slug = SUBTYPE_TO_TAG[st] ?? st;
      return TAXONOMY_TAGS.find((t) => t.slug === slug)?.macro === macro;
    })
  );
}

function circuitMatchesTag(circuit: Circuit, tagSlug: string): boolean {
  if ((circuit.tags ?? []).includes(tagSlug)) return true;
  return (circuit.etapes ?? []).some((e: any) =>
    (e.subtypes ?? []).some((st: string) => (SUBTYPE_TO_TAG[st] ?? st) === tagSlug)
  );
}

// ──────────────────────────────────────────────────────────────────────────────

function getTypeLabel(type: string | null): string {
  if (!type) return "Offre";
  const macro = MACRO_CATEGORIES.find((m) => m.slug === type);
  if (macro) return macro.label;
  const tag = TAXONOMY_TAGS.find((t) => t.slug === type);
  return tag?.label ?? type;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// ─── Offer Detail Modal ────────────────────────────────────────────────────────

// ─── Project Detail Modal ──────────────────────────────────────────────────────

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const fallback = PARTNER_PLACEHOLDERS[seedFromId(project.id, PARTNER_PLACEHOLDERS.length)];
  const types = project.project_type?.filter(Boolean) ?? [];
  const services = project.services?.filter(Boolean) ?? [];
  const ecoLabels = project.eco_labels?.filter(Boolean) ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <ImageGallery images={project.photos ?? (project.photo ? [project.photo] : [])} fallback={fallback} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 md:p-8">
          {/* Eco labels */}
          {ecoLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {ecoLabels.map((l) => (
                <span key={l} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">
                  <Leaf className="w-3 h-3" /> {l}
                </span>
              ))}
            </div>
          )}

          <h2 className="text-2xl font-black text-slate-900 mb-2">{project.name}</h2>

          {/* Type tags */}
          {types.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {types.map((t) => (
                <span key={t} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full capitalize">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Location */}
          <div className="flex flex-wrap gap-4 mb-4">
            {project.region && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                <MapPin className="w-4 h-4 text-primary" /> {project.region}
              </span>
            )}
            {project.address && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                <Building2 className="w-4 h-4 text-primary" /> {project.address}
              </span>
            )}
          </div>

          {/* Map — directly under address */}
          {(project.lat || project.address || project.region) && (
            <div className="mb-4">
              <MeetingMap
                lat={project.lat ?? null}
                lng={project.lng ?? null}
                address={[project.address, project.region].filter(Boolean).join(", ")}
              />
            </div>
          )}

          {/* Opening hours */}
          {project.opening_hours && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 mb-6">
              <Clock className="w-4 h-4 text-primary" /> {project.opening_hours}
            </div>
          )}

          {/* Sustainability score */}
          {project.sustainability_score !== null && (() => {
            const { label, color, bar } = sustainabilityLevel(project.sustainability_score);
            return (
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">🌿 Score de durabilité</span>
                  <span className={`text-sm font-black ${color}`}>{project.sustainability_score}/100</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                  <div className={`h-full ${bar} rounded-full`} style={{ width: `${project.sustainability_score}%` }} />
                </div>
                <span className={`text-xs font-bold ${color}`}>{label}</span>
              </div>
            );
          })()}

          {/* Description */}
          {project.description && (
            <div className="mb-6">
              <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-2">À propos</h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">{project.description}</p>
            </div>
          )}

          {/* Services */}
          {services.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-3">Services proposés</h3>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1.5 rounded-full">
                    <Tag className="w-3 h-3 text-primary" /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(project.phone || project.website || project.facebook || project.instagram) && (
            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-3">Contact</h3>
              <div className="flex flex-wrap gap-3">
                {project.phone && (
                  <a href={`tel:${project.phone}`} className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary hover:text-slate-900 hover:border-primary transition-all">
                    <Phone className="w-4 h-4" /> {project.phone}
                  </a>
                )}
                {project.website && (
                  <a href={project.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary hover:text-slate-900 hover:border-primary transition-all">
                    <Globe className="w-4 h-4" /> Site web
                  </a>
                )}
                {project.facebook && (
                  <a href={project.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-100 transition-all">
                    <Link className="w-4 h-4" /> Facebook
                  </a>
                )}
                {project.instagram && (
                  <a href={project.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-pink-50 border border-pink-200 text-pink-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-pink-100 transition-all">
                    <ExternalLink className="w-4 h-4" /> Instagram
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Experience Detail Modal ───────────────────────────────────────────────────

function ExperienceModal({ exp, onClose }: { exp: Experience; onClose: () => void }) {
  const color = AVATAR_COLORS[seedFromId(exp.author_id, AVATAR_COLORS.length)];
  const fallback = OFFER_PLACEHOLDERS[seedFromId(exp.id, OFFER_PLACEHOLDERS.length)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image if available */}
        {(exp.images && exp.images.length > 0) && (
          <ImageGallery images={exp.images} fallback={fallback} />
        )}

        <button
          onClick={onClose}
          className={`absolute ${exp.images?.length ? "top-4 right-4 bg-black/50 text-white hover:bg-black/70" : "top-4 right-4 bg-slate-100 text-slate-500 hover:bg-slate-200"} w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors z-10`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 md:p-8">
          <Quote className="w-8 h-8 text-primary/30 mb-4" />

          <h2 className="text-2xl font-black text-slate-900 mb-4">{exp.title}</h2>

          {exp.region && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 mb-3">
              <MapPin className="w-4 h-4 text-primary" /> {exp.region}
            </div>
          )}

          {/* Map */}
          {exp.region && (
            <div className="mb-6">
              <MeetingMap
                lat={exp.latitude ?? null}
                lng={exp.longitude ?? null}
                address={exp.region}
              />
            </div>
          )}

          {exp.description ? (
            <p className="text-slate-700 leading-relaxed whitespace-pre-line text-base">{exp.description}</p>
          ) : (
            <p className="text-slate-400 italic">Aucune description fournie.</p>
          )}

          {/* Author footer */}
          <div className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
            <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center text-white font-black text-sm shrink-0`}>
              ÉV
            </div>
            <div>
              <p className="font-bold text-slate-800">Éco-Voyageur</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Calendar className="w-3 h-3" />
                {formatDate(exp.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sustainability helpers ────────────────────────────────────────────────────

function sustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Ambassadeur Éco Voyage", color: "text-primary",      bar: "bg-primary" };
  if (score >= 71) return { label: "Éco-Responsable",        color: "text-emerald-600", bar: "bg-emerald-500" };
  if (score >= 51) return { label: "Engagé",                 color: "text-teal-600",    bar: "bg-teal-500" };
  if (score >= 31) return { label: "Sensibilisé",            color: "text-blue-600",    bar: "bg-blue-500" };
  return              { label: "Conventionnel",               color: "text-slate-500",   bar: "bg-slate-400" };
}

function SustainabilityBar({ score }: { score: number | null }) {
  if (score === null) return null;
  const { label, color, bar } = sustainabilityLevel(score);
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">🌿 Durabilité</span>
        <span className={`text-[10px] font-black ${color}`}>{score}/100</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
        <div className={`h-full ${bar} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-bold ${color}`}>{label}</span>
    </div>
  );
}

// ─── OfferCard ─────────────────────────────────────────────────────────────────

function OfferCard({ offer, onClick }: { offer: Offer; onClick: () => void }) {
  const image = offer.images?.[0] ?? OFFER_PLACEHOLDERS[seedFromId(offer.id, OFFER_PLACEHOLDERS.length)];
  const isGuide = offer.author_type === "guide";

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-64 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url('${image}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <span className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-extrabold text-slate-700 uppercase tracking-widest shadow-sm">
            {getTypeLabel(offer.offer_type)}
          </span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm shadow-sm ${isGuide ? "bg-emerald-500/90 text-white" : "bg-blue-500/90 text-white"}`}>
            {isGuide ? "Guide certifié" : "Projet éco"}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          {offer.region && (
            <span className="flex items-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3 shrink-0" /> {offer.region}
            </span>
          )}
          {offer.price !== null && (
            <span className="ml-auto bg-primary text-slate-900 font-black text-sm px-3 py-1.5 rounded-xl shadow-lg shrink-0">
              {offer.price} TND
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-extrabold text-slate-900 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {offer.title}
        </h3>

        {offer.description && (
          <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">{offer.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {offer.duration && (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" /> {offer.duration}
            </span>
          )}
          {(offer.min_group_size || offer.max_group_size) && (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
              <Users className="w-3 h-3" />
              {offer.min_group_size && offer.max_group_size
                ? `${offer.min_group_size}–${offer.max_group_size} pers.`
                : offer.max_group_size ? `max ${offer.max_group_size} pers.` : `min ${offer.min_group_size} pers.`}
            </span>
          )}
          {offer.min_age && (
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
              <Star className="w-3 h-3" /> Dès {offer.min_age} ans
            </span>
          )}
        </div>

        <SustainabilityBar score={offer.sustainability_score} />

        {/* Author */}
        {offer.author_name && (
          <div className="flex items-center gap-2 mt-3 mb-2">
            {offer.author_photo ? (
              <img src={offer.author_photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-100" />
            ) : (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[10px] shrink-0 ${isGuide ? "bg-emerald-500" : "bg-blue-500"}`}>
                {offer.author_name[0]}
              </div>
            )}
            <span className="text-xs font-bold text-slate-500 truncate">{offer.author_name}</span>
            {offer.org_name && <span className="text-xs text-slate-400 truncate">· {offer.org_name}</span>}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
          {offer.price !== null ? (
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">À partir de</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{offer.price} <span className="text-sm font-bold text-slate-500">TND</span></span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-400 italic">Prix sur demande</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="h-10 px-5 rounded-xl bg-primary text-slate-900 font-bold hover:bg-primary/90 transition-all text-sm"
          >
            Voir l'offre
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PartnerCard ───────────────────────────────────────────────────────────────

function PartnerCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const image = project.photos?.[0] ?? project.photo ?? PARTNER_PLACEHOLDERS[seedFromId(project.id, PARTNER_PLACEHOLDERS.length)];
  const types = project.project_type?.filter(Boolean) ?? [];

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-52 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url('${image}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {project.eco_labels && project.eco_labels.length > 0 && (
          <div className="absolute top-3 left-3">
            <span className="bg-primary/90 backdrop-blur-sm text-slate-900 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
              <Leaf className="w-3 h-3" /> Éco-Certifié
            </span>
          </div>
        )}
        {project.region && (
          <div className="absolute bottom-3 left-3">
            <span className="flex items-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3 shrink-0" /> {project.region}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-extrabold text-slate-900 text-base mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
          {project.name}
        </h3>
        {types.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {types.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">{t}</span>
            ))}
          </div>
        )}
        {project.description && (
          <p className="text-slate-500 text-sm line-clamp-2 flex-1 leading-relaxed">{project.description}</p>
        )}
        <SustainabilityBar score={project.sustainability_score} />

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">Projet partenaire</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="h-8 px-3 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold hover:bg-primary hover:text-slate-900 hover:border-primary transition-all text-xs"
          >
            Voir le projet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ExperienceCard ────────────────────────────────────────────────────────────

function ExperienceCard({ exp, onClick }: { exp: Experience; onClick: () => void }) {
  const color = AVATAR_COLORS[seedFromId(exp.author_id, AVATAR_COLORS.length)];

  return (
    <div
      className="flex flex-col bg-white border border-slate-100 rounded-2xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative cursor-pointer group"
      onClick={onClick}
    >
      <div className="absolute top-4 right-5 opacity-10 group-hover:opacity-20 transition-opacity">
        <Quote className="w-14 h-14 text-primary" />
      </div>

      <Quote className="w-6 h-6 text-primary/40 mb-3 shrink-0" />

      <h4 className="font-extrabold text-slate-900 text-base mb-2 line-clamp-2 pr-8 group-hover:text-primary transition-colors">
        {exp.title}
      </h4>

      {exp.description && (
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 flex-1 mb-4">{exp.description}</p>
      )}

      {exp.region && (
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 mb-4">
          <MapPin className="w-3 h-3 text-primary" /> {exp.region}
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white font-black text-xs shrink-0`}>
          ÉV
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">Éco-Voyageur</p>
          <p className="text-xs text-slate-400">{new Date(exp.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
        </div>
        <span className="ml-auto text-xs font-bold text-primary group-hover:underline">Lire →</span>
      </div>
    </div>
  );
}

// ─── CircuitCard ───────────────────────────────────────────────────────────────

function CircuitCard({ circuit, onClick }: { circuit: Circuit; onClick: () => void }) {
  const image = circuit.cover_image ?? OFFER_PLACEHOLDERS[seedFromId(circuit.id, OFFER_PLACEHOLDERS.length)];
  const nbEtapes = circuit.etapes?.length ?? 0;

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-60 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url('${image}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-extrabold text-slate-700 uppercase tracking-widest shadow-sm">
            Circuit
          </span>
          <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
            {circuit.owner_type === "guide" ? "Guide" : "Prestataire"}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="flex items-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 shrink-0" /> {circuit.nb_jours} jour{circuit.nb_jours > 1 ? "s" : ""}
          </span>
          {nbEtapes > 0 && (
            <span className="flex items-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3 shrink-0" /> {nbEtapes} étape{nbEtapes > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-extrabold text-slate-900 text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {circuit.title}
        </h3>
        {circuit.description && (
          <p className="text-slate-500 text-sm line-clamp-2 flex-1 leading-relaxed mb-3">{circuit.description}</p>
        )}
        {circuit.author_name && (
          <div className="flex items-center gap-2 mt-2 mb-1">
            {circuit.author_photo ? (
              <img src={circuit.author_photo} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-100 shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-[9px] shrink-0">
                {circuit.author_name[0]}
              </div>
            )}
            <span className="text-xs font-bold text-slate-500 truncate">{circuit.author_name}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">{circuit.nb_jours}J / {nbEtapes} étape{nbEtapes > 1 ? "s" : ""}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="h-8 px-3 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold hover:bg-primary hover:text-slate-900 hover:border-primary transition-all text-xs">
            Voir le circuit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CircuitModal ──────────────────────────────────────────────────────────────

// ─── Page ──────────────────────────────────────────────────────────────────────

/**
 * Page publique des destinations, et — montée avec `interne` — le Catalogue
 * accessible depuis la barre latérale de l'éco-voyageur.
 *
 * Un seul composant pour deux présentations : la version publique garde son
 * en-tête, son héros et son pied de page ; la version interne les remplace par
 * la barre de la plateforme. Dupliquer 1300 lignes aurait garanti la dérive.
 */
export default function DestinationsPage({ interne = false }: { interne?: boolean } = {}) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState<"all" | "offres" | "circuits">("all");
  const [selectedMacro, setSelectedMacro] = useState<MacroSlug | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Lien profond depuis l'accueil : /destinations?macro=nature.
  // Lu dans un effet et non dans useState — l'initialiseur ne rejoue pas à l'hydratation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const macro = params.get("macro");
    if (macro && MACRO_CATEGORIES.some((m) => m.slug === macro)) {
      setSelectedMacro(macro as MacroSlug);
    }
    const q = params.get("q");
    if (q) setSearch(q);
  }, []);
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [regionSearch, setRegionSearch] = useState("");
  const [minSustainability, setMinSustainability] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Offer[]>("/offers"),
      apiFetch<Circuit[]>("/circuits/all-public"),
      apiFetch<Project[]>("/project-owner/projects/public"),
      apiFetch<Experience[]>("/publications/experiences"),
    ])
      .then(([o, c, p, e]) => { setOffers(o); setCircuits(c); setProjects(p); setExperiences(e); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const result = offers.filter((o) => {
      if (search && !o.title.toLowerCase().includes(search.toLowerCase()) && !(o.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedMacro && !offerMatchesMacro(o, selectedMacro)) return false;
      if (selectedTag && !getOfferTagSlugs(o).includes(selectedTag)) return false;
      if (regionSearch && !(o.region ?? "").toLowerCase().includes(regionSearch.toLowerCase())) return false;
      if (minPrice !== "" && o.price !== null && o.price < minPrice) return false;
      if (maxPrice !== "" && o.price !== null && o.price > maxPrice) return false;
      if (minSustainability !== null && (o.sustainability_score === null || o.sustainability_score < minSustainability)) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      if (sortBy === "price_asc") { if (a.price === null) return 1; if (b.price === null) return -1; return a.price - b.price; }
      if (sortBy === "price_desc") { if (a.price === null) return 1; if (b.price === null) return -1; return b.price - a.price; }
      return 0;
    });
  }, [offers, search, selectedMacro, selectedTag, regionSearch, minPrice, maxPrice, minSustainability, sortBy]);

  const filteredCircuits = useMemo(() => {
    return circuits.filter((c) => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !(c.description ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedMacro && !circuitMatchesMacro(c, selectedMacro)) return false;
      if (selectedTag && !circuitMatchesTag(c, selectedTag)) return false;
      if (regionSearch) {
        const etapeDestinations = (c.etapes ?? []).map((e: any) => e.destination ?? "").join(" ");
        if (!etapeDestinations.toLowerCase().includes(regionSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [circuits, search, selectedMacro, selectedTag, regionSearch]);

  function resetFilters() {
    setContentType("all"); setSelectedMacro(null); setSelectedTag(null);
    setRegionSearch(""); setMinPrice(""); setMaxPrice(""); setMinSustainability(null);
  }

  const priceFilterActive = minPrice !== "" || maxPrice !== "";
  const activeFilterCount =
    (contentType !== "all" ? 1 : 0) + (selectedMacro ? 1 : 0) + (selectedTag ? 1 : 0) +
    (regionSearch ? 1 : 0) + (priceFilterActive ? 1 : 0) + (minSustainability !== null ? 1 : 0);

  const filterContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900">Filtres</h3>
        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="text-xs font-bold text-primary hover:underline">Réinitialiser</button>
        )}
      </div>

      {/* Type de contenu */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Type</p>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { value: "all",      label: "Tout",     Icon: LayoutGrid },
            { value: "offres",   label: "Offres",   Icon: Ticket },
            { value: "circuits", label: "Circuits", Icon: Route },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setContentType(value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                contentType === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 text-slate-500 hover:border-primary/40 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Thématique — Macro-catégories */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Thématique</p>
        <div className="space-y-0.5">
          {MACRO_CATEGORIES.map(({ slug, label }) => (
            <button
              key={slug}
              onClick={() => {
                if (selectedMacro === slug) { setSelectedMacro(null); setSelectedTag(null); }
                else { setSelectedMacro(slug as MacroSlug); setSelectedTag(null); }
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                selectedMacro === slug
                  ? "bg-primary/10 text-primary"
                  : "text-slate-700 hover:bg-slate-50 hover:text-primary"
              }`}
            >
              {(() => { const Icon = MACRO_ICON[slug]; return Icon ? <Icon className="w-4 h-4 shrink-0" /> : null; })()}
              <span className="flex-1">{label}</span>
              {selectedMacro === slug && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
            </button>
          ))}
        </div>

        {selectedMacro && (
          <div className="pt-2 pb-1 pl-3 border-l-2 border-primary/30 ml-1 mt-2">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Tags fins</p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
              {getTagsByMacro(selectedMacro).map(({ slug: tslug, label: tlabel }) => (
                <button
                  key={tslug}
                  onClick={() => setSelectedTag(selectedTag === tslug ? null : tslug)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    selectedTag === tslug
                      ? "bg-primary text-slate-900 border-primary"
                      : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {tlabel}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Emplacement */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Emplacement</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text" value={regionSearch} onChange={(e) => setRegionSearch(e.target.value)}
            placeholder="Tunis, Djerba, Sfax…"
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm"
          />
          {regionSearch && (
            <button onClick={() => setRegionSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Budget */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Budget (TND)</p>
        <div className="flex items-center gap-2">
          <input type="number" min="0" step="10" value={minPrice} onChange={(e) => setMinPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Min"
            className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm" />
          <span className="text-slate-300 font-bold shrink-0">—</span>
          <input type="number" min="0" step="10" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Max"
            className="w-full px-3 py-2.5 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm" />
        </div>
        {priceFilterActive && (
          <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="mt-2 text-xs font-bold text-slate-400 hover:text-primary transition-colors">
            Effacer le budget
          </button>
        )}
      </div>

      {/* Durabilité */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">🌿 Durabilité minimale</p>
        <div className="space-y-2">
          {[
            { value: null, label: "Tous",            sub: "Sans filtre" },
            { value: 31,   label: "Sensibilisé",     sub: "31+",  color: "text-blue-600" },
            { value: 51,   label: "Engagé",          sub: "51+",  color: "text-teal-600" },
            { value: 71,   label: "Éco-Responsable", sub: "71+",  color: "text-emerald-600" },
            { value: 86,   label: "Ambassadeur",     sub: "86+",  color: "text-primary" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setMinSustainability(opt.value)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                minSustainability === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 text-slate-600 hover:border-primary/40 hover:bg-slate-50"
              }`}
            >
              <span>{opt.label}</span>
              <span className={`text-[11px] font-bold ${opt.color ?? "text-slate-400"}`}>{opt.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      {interne ? (
        <>
          {/* Barre de la plateforme, pour l'accès depuis la barre latérale. */}
          <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 md:px-20 lg:px-40 py-3">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between">
              <button
                onClick={() => router.push(monTableauDeBord())}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all"
              >
                <ArrowLeft size={16} />Retour
              </button>
              <div className="flex items-center gap-2 text-slate-900">
                <Leaf className="text-primary w-6 h-6" />
                <span className="text-base font-extrabold tracking-tight">Éco-Voyage</span>
              </div>
            </div>
          </div>

          <div className="max-w-[1440px] mx-auto w-full px-6 md:px-20 lg:px-40 pt-8 pb-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Catalogue des offres</h1>
            <p className="text-sm text-slate-500 font-medium mt-1 mb-6">
              Offres, circuits et projets éco-responsables à travers la Tunisie.
            </p>
            <div className="relative max-w-2xl">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Search className="w-4 h-4 text-primary" />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une offre, un circuit, une activité…"
                className="w-full h-14 pl-14 pr-12 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <Navbar variant="home" />
      )}

      {/* Hero */}
      {!interne && <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-6 md:px-20 lg:px-40 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80')", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="relative max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-6 h-6 text-primary" />
            <span className="text-primary font-extrabold text-sm uppercase tracking-widest">Éco-Tourisme Tunisien</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Toutes les <span className="text-primary">Destinations</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mb-8">
            Découvrez les offres éco-responsables proposées par nos guides certifiés et nos projets partenaires à travers la Tunisie.
          </p>
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une offre, une activité…"
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-primary" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>}

      {/* Offers */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-6 md:px-20 lg:px-40 py-12">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sticky top-28">
              {filterContent}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6 gap-4">
              <p className="text-sm font-semibold text-slate-500 shrink-0">
                {loading ? "Chargement…" : contentType === "circuits" ? `${filteredCircuits.length} circuit${filteredCircuits.length !== 1 ? "s" : ""} trouvé${filteredCircuits.length !== 1 ? "s" : ""}` : `${filtered.length} offre${filtered.length !== 1 ? "s" : ""} trouvée${filtered.length !== 1 ? "s" : ""}`}
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <div className="relative hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="text-sm font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer pr-1">
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <button onClick={() => setShowFilters(true)} className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtres{activeFilterCount > 0 && <span className="bg-primary text-slate-900 text-xs font-black px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
                </button>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {contentType !== "all" && (
                  <button onClick={() => setContentType("all")} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary text-primary text-xs font-bold rounded-full hover:bg-primary/20 transition-colors">
                    {contentType === "offres" ? <Ticket className="w-3 h-3" /> : <Route className="w-3 h-3" />}
                    {contentType === "offres" ? "Offres" : "Circuits"} <X className="w-3 h-3" />
                  </button>
                )}
                {selectedMacro && (
                  <button onClick={() => { setSelectedMacro(null); setSelectedTag(null); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary text-primary text-xs font-bold rounded-full hover:bg-primary/20 transition-colors">
                    {(() => { const Icon = MACRO_ICON[selectedMacro]; return Icon ? <Icon className="w-3 h-3" /> : null; })()}
                    {MACRO_CATEGORIES.find((m) => m.slug === selectedMacro)?.label} <X className="w-3 h-3" />
                  </button>
                )}
                {selectedTag && (
                  <button onClick={() => setSelectedTag(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary text-primary text-xs font-bold rounded-full hover:bg-primary/20 transition-colors">
                    <Tag className="w-3 h-3" /> {TAXONOMY_TAGS.find((t) => t.slug === selectedTag)?.label ?? selectedTag} <X className="w-3 h-3" />
                  </button>
                )}
                {regionSearch && (
                  <button onClick={() => setRegionSearch("")} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary text-primary text-xs font-bold rounded-full hover:bg-primary/20 transition-colors">
                    <MapPin className="w-3 h-3" /> {regionSearch} <X className="w-3 h-3" />
                  </button>
                )}
                {priceFilterActive && (
                  <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary text-primary text-xs font-bold rounded-full hover:bg-primary/20 transition-colors">
                    {minPrice !== "" && maxPrice !== "" ? `${minPrice}–${maxPrice} TND` : minPrice !== "" ? `min ${minPrice} TND` : `max ${maxPrice} TND`} <X className="w-3 h-3" />
                  </button>
                )}
                {minSustainability !== null && (
                  <button onClick={() => setMinSustainability(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary text-primary text-xs font-bold rounded-full hover:bg-primary/20 transition-colors">
                    🌿 Durabilité ≥ {minSustainability} <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm animate-pulse">
                    <div className="h-64 bg-slate-200" />
                    <div className="p-6 space-y-3">
                      <div className="h-5 bg-slate-200 rounded-xl w-3/4" />
                      <div className="h-4 bg-slate-100 rounded-xl w-full" />
                      <div className="h-4 bg-slate-100 rounded-xl w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-slate-500 font-semibold">{error}</p>
              </div>
            )}

            {!loading && !error && contentType !== "circuits" && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Leaf className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-500 font-semibold text-lg mb-2">Aucune offre trouvée</p>
                <p className="text-slate-400 text-sm">
                  {offers.length === 0 ? "Les offres approuvées apparaîtront ici." : "Essayez de modifier vos filtres."}
                </p>
                {(activeFilterCount > 0 || search) && (
                  <button onClick={() => { resetFilters(); setSearch(""); setSortBy("recent"); }} className="mt-4 px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            )}

            {!loading && !error && contentType !== "circuits" && filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} onClick={() => setSelectedOffer(offer)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Circuits */}
      {!loading && contentType !== "offres" && filteredCircuits.length > 0 && (
        <section className="bg-white border-t border-slate-100 py-16 px-6 md:px-20 lg:px-40">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-0.5 bg-primary" />
              <span className="text-primary font-extrabold text-sm uppercase tracking-widest">Circuits Éco-Touristiques</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Circuits disponibles</h2>
                <p className="text-slate-500 max-w-lg">
                  Parcourez les circuits éco-touristiques proposés par nos guides et prestataires certifiés à travers la Tunisie.
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-400 shrink-0">
                {filteredCircuits.length} circuit{filteredCircuits.length !== 1 ? "s" : ""}
                {filteredCircuits.length !== circuits.length && <span className="text-slate-300"> / {circuits.length}</span>}
              </span>
            </div>
            {filteredCircuits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Leaf className="w-10 h-10 text-slate-200 mb-3" />
                <p className="text-slate-400 font-semibold">Aucun circuit ne correspond aux filtres sélectionnés.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCircuits.map((circuit) => (
                  <CircuitCard key={circuit.id} circuit={circuit} onClick={() => setSelectedCircuit(circuit)} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Nos Partenaires */}
      {!loading && projects.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-100 py-16 px-6 md:px-20 lg:px-40">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-0.5 bg-primary" />
              <span className="text-primary font-extrabold text-sm uppercase tracking-widest">Éco Voyage</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Nos Partenaires</h2>
                <p className="text-slate-500 max-w-lg">
                  Découvrez les projets éco-touristiques validés par Éco Voyage qui contribuent à un tourisme durable en Tunisie.
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-400 shrink-0">
                {projects.length} projet{projects.length !== 1 ? "s" : ""} partenaire{projects.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <PartnerCard key={project.id} project={project} onClick={() => setSelectedProject(project)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Expériences Clientèle */}
      {!interne && !loading && experiences.length > 0 && (
        <section className="bg-white border-t border-slate-100 py-16 px-6 md:px-20 lg:px-40">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-0.5 bg-primary" />
              <span className="text-primary font-extrabold text-sm uppercase tracking-widest">Témoignages</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Ils ont vécu l'expérience</h2>
                <p className="text-slate-500 max-w-lg">
                  Les récits authentiques de nos voyageurs éco-responsables qui ont exploré la Tunisie autrement.
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-400 shrink-0">
                {experiences.length} témoignage{experiences.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {experiences.map((exp) => (
                <ExperienceCard key={exp.id} exp={exp} onClick={() => setSelectedExperience(exp)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setShowFilters(false)}>
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900">Filtres</h3>
              <button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Trier par</p>
                <div className="grid grid-cols-3 gap-2">
                  {SORT_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => setSortBy(o.value)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border-2 transition-all text-center ${sortBy === o.value ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/30"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {filterContent}
              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                <button onClick={resetFilters} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50">Réinitialiser</button>
                <button onClick={() => setShowFilters(false)} className="flex-1 py-3 bg-primary text-slate-900 font-extrabold rounded-xl">Voir les offres</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modals */}
      {selectedOffer && <OfferModal offer={selectedOffer} onClose={() => setSelectedOffer(null)} />}
      {selectedCircuit && <CircuitModal circuit={selectedCircuit} onClose={() => setSelectedCircuit(null)} />}
      {selectedProject && <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
      {selectedExperience && <ExperienceModal exp={selectedExperience} onClose={() => setSelectedExperience(null)} />}

      {!interne && <Footer />}
    </div>
  );
}
