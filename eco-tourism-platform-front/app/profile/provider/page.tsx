"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CollaborationModal from "@/components/CollaborationModal";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import CircuitViewContent from "@/components/circuit/CircuitViewContent";
import dynamic from "next/dynamic";
import {
  Plus, Edit3, ShieldCheck, MapPin, Calendar, Phone, Building2, Globe, Leaf, ArrowLeft,
  LayoutGrid, Tag, Info, Sparkles, Users, Mail, MessageCircle,
  ArrowRight, Send, X, Clock, ChevronLeft, ChevronRight, Check, Search, UserPlus,
  MoreVertical, UserX, ShieldBan, Flag, Route, Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import MessagerieWidget from "@/components/MessagerieWidget";
import PubInteractions from "@/components/PubInteractions";
import { PROVIDER_SCHEMA, SUBTYPE_FIELDS, getCategoryByValue } from "@/lib/provider-schema";
import type { FieldConfig } from "@/lib/provider-schema";
import {
  OFFER_DETAIL_FIELDS, getCapacityLimit,
  AVAILABILITY_TYPES, SAISONS,
  type CrossValidationRule,
} from "@/lib/offer-schema";
import InviteCollaboratorModal, { type CollabSection } from "@/components/guide/offer/InviteCollaboratorModal";
import EtapeCollabPickerModal from "@/components/guide/offer/EtapeCollabPickerModal";
import { OfferAvailPicker, EMPTY_OFFER_AVAIL, type OfferAvailSlot } from "@/components/offer/OfferAvailPicker";
import { ConfirmationTypePicker, EMPTY_CONFIRMATION, type ConfirmationData } from "@/components/offer/ConfirmationTypePicker";
import { PUBLIC_RECOMMANDE, DOMAINES } from "@/lib/guideOfferConfig";
import { Bool, PrestSubBlock, InviteButton, SectionLockedBanner, TRANSPORT_ECO_SUBTYPES, TRANSPORT_STD_SUBTYPES, HEBERGEMENT_PREST_SUBTYPES, RepasBlock, AutreServiceBlock, type RepasBlockData, type AutreServiceBlockData } from "@/components/GuideOfferModal";

const MapPicker = dynamic(
  () => import("@/components/map/MapPicker"),
  { ssr: false, loading: () => <div className="h-[268px] rounded-2xl bg-slate-100 animate-pulse" /> }
);
const MapView = dynamic(() => import("@/components/map/MapView"),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" /> }
);
const CircuitRouteMap = dynamic(() => import("@/components/map/CircuitRouteMap"),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" /> }
);

function LocationMap({ lat, lng, address }: { lat: number | null; lng: number | null; address: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
  );
  const [geocoding, setGeocoding] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (coords) return;
    if (!address.trim()) return;
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ProviderProfile = {
  user_id: string; full_name: string; bio: string | null;
  organization: string | null; position: string | null; photo: string | null;
  cover_photo: string | null;
  country: string | null; phone: string | null; language: string | null;
  languages_spoken: string[] | null;
  sustainability_score: number | null; total_reservations: number;
  feedback_received: number;
  provider_type: string | null;
  activity_types: string[] | null;
  secondary_activity_types: string[] | null;
  website: string | null;
  region: string | null;
  address: string | null;
  lat: number | null; lng: number | null;
  years_experience: number | null;
  history: string | null;
  eco_labels: string[] | null;
  certifications: string[] | null;
  photos: string[] | null;
  status: string;
  personal_bio: string | null;
  personal_certifications: Array<{ name: string; document_url?: string }> | null;
};

type OrganizationProfile = {
  id: string;
  name: string;
  logo: string | null;
  provider_type: string | null;
  bio: string | null;
  history: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  region: string | null;
  address: string | null;
  zone: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  photos: string[] | null;
  videos: string[] | null;
  eco_labels: string[] | null;
  certifications: Array<{ name: string; document_url?: string }> | null;
  sustainability_score: number | null;
  status: string;
};

type Offer = {
  id: string; title: string; description: string | null;
  price: number | null; duration: string | null;
  offer_type: string | null; project_id: string | null;
  status: string; created_at: string;
  region: string | null; inclusions: string | null;
  meeting_point: string | null;
  meeting_lat: number | null; meeting_lng: number | null;
  min_group_size: number | null; max_group_size: number | null;
  min_age: number | null;
  cancellation_policy: string | null;
  sustainability_score: number | null;
  images?: string[] | null; cover_image?: string | null;
  offer_subtype?: string | null;
  offer_subtypes?: string[] | null;
  details?: Record<string, any> | null;
  // Extended fields from backend
  activity_id?: string | null;
  offer_mode?: string | null;
  availability_mode?: string | null;
  availability_start?: string | null;
  availability_end?: string | null;
  confirmation_mode?: string | null;
  confirmation_deadline_hours?: number | null;
  deposit_percentage?: number | null;
};

type Activity = {
  id: string; title: string; description: string | null;
  category: string; level: "primary" | "secondary";
  region: string | null; address: string | null;
  photo: string | null; photos: string[] | null;
  status: string; created_at: string;
  lat: number | null; lng: number | null;
  sustainability_score: number | null;
  website: string | null; phone: string | null;
};

type OrgActivity = {
  id: string;
  provider_id: string;
  organization_id: string;
  level: "primary" | "secondary";
  category: string;
  subtypes: string[] | null;
  years_experience: number | null;
  fields: Record<string, Record<string, any>>;
  photos: Record<string, string[]>;
  certifications: Array<{ name: string; document_url?: string }>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFER_TYPES = [
  { value: "sejour",       label: "Séjour",       icon: "hotel",      gradient: "from-blue-500 to-cyan-400" },
  { value: "circuit",      label: "Circuit",      icon: "route",      gradient: "from-slate-600 to-slate-500" },
  { value: "activite",     label: "Activité",     icon: "hiking",     gradient: "from-orange-500 to-amber-400" },
  { value: "restauration", label: "Restauration", icon: "restaurant", gradient: "from-red-500 to-rose-400" },
  { value: "hebergement",  label: "Hébergement",  icon: "cabin",      gradient: "from-emerald-500 to-green-400" },
  { value: "autre",        label: "Autre",        icon: "category",   gradient: "from-slate-400 to-slate-500" },
];

const TYPE_PRESTATION_PROVIDER = [
  { value: "service_seul",    icon: "handyman",       label: "Prestation seule",      desc: "Le service uniquement" },
  { value: "avec_transport",  icon: "directions_car", label: "+ Transport",            desc: "Service + transfert inclus" },
  { value: "transport_repas", icon: "restaurant",     label: "+ Transport & Repas",   desc: "Transport, repas et service" },
  { value: "immersion",       icon: "camping",        label: "+ Immersion complète",  desc: "Multi-jours, tout inclus" },
  { value: "sur_mesure",      icon: "tune",           label: "Sur mesure",            desc: "Contenu entièrement personnalisé" },
];

const PROVIDER_SERVICES = [
  "Eau / Boissons", "Déjeuner inclus", "Équipement fourni", "Transport inclus",
  "Guide local", "Assurance incluse", "Wi-Fi disponible", "Photos / Vidéos",
  "Certificat", "Formation / Initiation", "Traduction", "Service VIP",
  "Livraison", "Installation / Montage", "Pack famille", "Parking gratuit",
];

const PROVIDER_STEPS = [
  { id: 1, title: "Présentation",         subtitle: "Activité, photos, titre & public" },
  { id: 2, title: "Localisation",         subtitle: "Emplacement et description" },
  { id: 3, title: "Sous-types & Détails", subtitle: "Types et champs spécifiques" },
  { id: 4, title: "Disponibilités",       subtitle: "Quand êtes-vous disponible ?" },
  { id: 5, title: "Ce que vous fournissez", subtitle: "Configuration de votre prestation" },
  { id: 6, title: "Tarification",         subtitle: "Prix & Acompte" },
  { id: 7, title: "Conditions",           subtitle: "Confirmation & Annulation" },
];

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France", OTHER: "Autre",
};

const PROVIDER_TYPES = [
  { value: "lodge",       label: "Éco-Lodge",          icon: "cabin" },
  { value: "hotel",       label: "Hôtel Vert",          icon: "hotel" },
  { value: "restaurant",  label: "Restaurant Bio",      icon: "restaurant" },
  { value: "ferme",       label: "Ferme Agro-tourisme", icon: "agriculture" },
  { value: "agence",      label: "Agence de Voyage",    icon: "travel_explore" },
  { value: "transport",   label: "Transport Éco",       icon: "electric_car" },
  { value: "bienetre",    label: "Bien-être & Spa",     icon: "spa" },
  { value: "artisanat",   label: "Artisanat local",     icon: "handshake" },
  { value: "autre",       label: "Autre",               icon: "category" },
];

const PROVIDER_ACTIVITY_TYPES = [
  { value: "hebergement",  label: "Hébergement",             icon: "cabin",          gradient: "from-emerald-500 to-teal-400" },
  { value: "restauration", label: "Restauration Bio",        icon: "restaurant",     gradient: "from-orange-500 to-amber-400" },
  { value: "randonnee",    label: "Randonnée & Trekking",    icon: "hiking",         gradient: "from-green-600 to-emerald-400" },
  { value: "plongee",      label: "Plongée & Sports naut.",  icon: "scuba_diving",   gradient: "from-blue-500 to-cyan-400" },
  { value: "agriculture",  label: "Agro-tourisme",           icon: "agriculture",    gradient: "from-lime-500 to-green-400" },
  { value: "artisanat",    label: "Artisanat local",         icon: "handshake",      gradient: "from-amber-500 to-yellow-400" },
  { value: "transport",    label: "Transport éco",           icon: "electric_car",   gradient: "from-sky-500 to-blue-400" },
  { value: "bienetre",     label: "Bien-être & Spa",         icon: "spa",            gradient: "from-teal-600 to-emerald-500" },
  { value: "culture",      label: "Tourisme culturel",       icon: "museum",         gradient: "from-rose-500 to-pink-400" },
  { value: "aventure",     label: "Aventure & Nature",       icon: "terrain",        gradient: "from-teal-500 to-cyan-400" },
  { value: "formation",    label: "Formation & Éducation",   icon: "school",         gradient: "from-indigo-500 to-blue-400" },
  { value: "autre",        label: "Autre",                   icon: "category",       gradient: "from-slate-400 to-slate-500" },
];

const CATEGORY_GRADIENT_MAP: Record<string, string> = {
  eco_tour:    "from-green-600 to-emerald-400",
  hebergement: "from-emerald-500 to-teal-400",
  activite:    "from-orange-500 to-amber-400",
  restauration:"from-red-500 to-rose-400",
  culture:     "from-rose-500 to-pink-400",
  bien_etre:   "from-teal-600 to-emerald-500",
  artisanat:   "from-amber-500 to-yellow-400",
  agriculture: "from-lime-500 to-green-400",
  transport:   "from-sky-500 to-blue-400",
  equipement:  "from-indigo-500 to-blue-400",
};

function findProviderTypeMeta(value: string) {
  for (const cat of PROVIDER_SCHEMA) {
    const st = cat.subtypes.find((s) => s.value === value);
    if (st) return { label: st.label, categoryLabel: cat.label, categoryIcon: cat.icon, categoryValue: cat.value, gradient: CATEGORY_GRADIENT_MAP[cat.value] ?? "from-slate-400 to-slate-500" };
  }
  const cat = PROVIDER_SCHEMA.find((c) => c.value === value);
  if (cat) return { label: cat.label, categoryLabel: cat.label, categoryIcon: cat.icon, categoryValue: cat.value, gradient: CATEGORY_GRADIENT_MAP[cat.value] ?? "from-slate-400 to-slate-500" };
  const act = PROVIDER_ACTIVITY_TYPES.find((t) => t.value === value);
  if (act) return { label: act.label, categoryLabel: act.label, categoryIcon: act.icon, categoryValue: value, gradient: act.gradient };
  return { label: value, categoryLabel: value, categoryIcon: "eco", categoryValue: value, gradient: "from-slate-400 to-slate-500" };
}

// ─── Offer sustainability questionnaire ───────────────────────────────────────

const OFFER_SUSTAINABILITY_STEPS = [
  {
    category: "Impact Écologique", emoji: "🌿",
    description: "Empreinte environnementale de l'activité proposée",
    questions: [
      { id: "oq1", text: "L'activité se déroule-t-elle dans un milieu naturel préservé ?", options: [{ label: "Oui, site protégé", value: 10 }, { label: "Partiellement", value: 5 }, { label: "Non", value: 0 }] },
      { id: "oq2", text: "Des mesures réduisent-elles l'empreinte carbone (transport, matériel éco…) ?", options: [{ label: "Oui", value: 10 }, { label: "Partiellement", value: 5 }, { label: "Non", value: 0 }] },
      { id: "oq3", text: "Les déchets générés par l'activité sont-ils gérés de manière responsable ?", options: [{ label: "Aucun déchet / gestion complète", value: 10 }, { label: "Gestion partielle", value: 5 }, { label: "Non géré", value: 0 }] },
    ],
  },
  {
    category: "Valorisation Locale", emoji: "🤝",
    description: "Intégration des ressources et acteurs locaux dans l'offre",
    questions: [
      { id: "oq4", text: "Faites-vous appel à des guides, artisans ou intervenants locaux ?", options: [{ label: "Oui, systématiquement", value: 10 }, { label: "Parfois", value: 5 }, { label: "Non", value: 0 }] },
      { id: "oq5", text: "Valorisez-vous le patrimoine culturel ou naturel local dans votre offre ?", options: [{ label: "Oui", value: 8 }, { label: "Partiellement", value: 4 }, { label: "Non", value: 0 }] },
      { id: "oq6", text: "Les achats liés à l'offre (matériel, nourriture) sont-ils effectués localement ?", options: [{ label: "Oui, majoritairement", value: 7 }, { label: "Partiellement", value: 3 }, { label: "Non", value: 0 }] },
    ],
  },
  {
    category: "Sensibilisation", emoji: "📚",
    description: "Actions d'éducation et de sensibilisation auprès des participants",
    questions: [
      { id: "oq7", text: "Sensibilisez-vous les participants à l'environnement et à la biodiversité ?", options: [{ label: "Oui, activement", value: 10 }, { label: "Partiellement", value: 5 }, { label: "Non", value: 0 }] },
      { id: "oq8", text: "Fournissez-vous des conseils sur les bonnes pratiques éco-responsables ?", options: [{ label: "Oui", value: 10 }, { label: "Non", value: 0 }] },
    ],
  },
  {
    category: "Accessibilité", emoji: "♿",
    description: "Ouverture de l'offre à tous les publics",
    questions: [
      { id: "oq9", text: "Votre offre est-elle accessible aux personnes à mobilité réduite ?", options: [{ label: "Oui", value: 8 }, { label: "Partiellement", value: 4 }, { label: "Non", value: 0 }] },
      { id: "oq10", text: "Proposez-vous des tarifs adaptés (familles, étudiants, groupes…) ?", options: [{ label: "Oui", value: 7 }, { label: "Non", value: 0 }] },
    ],
  },
  {
    category: "Pratiques Responsables", emoji: "🏅",
    description: "Engagement et encadrement éthique de l'activité",
    questions: [
      { id: "oq11", text: "Limitez-vous la taille des groupes pour protéger l'environnement ?", options: [{ label: "Oui", value: 5 }, { label: "Non", value: 0 }] },
      { id: "oq12", text: "Avez-vous une politique d'annulation éco-responsable ?", options: [{ label: "Oui", value: 5 }, { label: "Non", value: 0 }] },
    ],
  },
];

function getOfferSustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Offre Ambassadrice Éco Voyage", color: "text-primary",      bg: "bg-primary/10",   emoji: "⭐" };
  if (score >= 71) return { label: "Offre Éco-Responsable",         color: "text-emerald-600", bg: "bg-emerald-50",   emoji: "🌿" };
  if (score >= 51) return { label: "Offre Engagée",                 color: "text-teal-600",    bg: "bg-teal-50",      emoji: "🤝" };
  if (score >= 31) return { label: "Offre Sensibilisée",            color: "text-blue-600",    bg: "bg-blue-50",      emoji: "💡" };
  return              { label: "Offre Conventionnelle",              color: "text-slate-500",   bg: "bg-slate-100",    emoji: "📋" };
}

function getActivitySustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Activité Ambassadrice", color: "text-primary",      bg: "bg-primary/10",   emoji: "⭐" };
  if (score >= 71) return { label: "Activité Éco-Responsable", color: "text-emerald-600", bg: "bg-emerald-50", emoji: "🌿" };
  if (score >= 51) return { label: "Activité Engagée",       color: "text-teal-600",    bg: "bg-teal-50",      emoji: "🤝" };
  if (score >= 31) return { label: "Activité Sensibilisée",  color: "text-blue-600",    bg: "bg-blue-50",      emoji: "💡" };
  return              { label: "Activité Conventionnelle",    color: "text-slate-500",   bg: "bg-slate-100",    emoji: "📋" };
}

const ACTIVITY_SUSTAINABILITY_STEPS = [
  {
    category: "Impact Écologique", emoji: "🌿",
    description: "Empreinte environnementale de l'activité",
    questions: [
      { id: "aq1", text: "L'activité se déroule-t-elle dans un milieu naturel préservé ?", options: [{ label: "Oui, site protégé", value: 10 }, { label: "Partiellement", value: 5 }, { label: "Non", value: 0 }] },
      { id: "aq2", text: "Des mesures réduisent-elles l'empreinte carbone ?", options: [{ label: "Oui", value: 10 }, { label: "Partiellement", value: 5 }, { label: "Non", value: 0 }] },
      { id: "aq3", text: "Les déchets générés sont-ils gérés de manière responsable ?", options: [{ label: "Oui, complètement", value: 10 }, { label: "Partiellement", value: 5 }, { label: "Non", value: 0 }] },
    ],
  },
  {
    category: "Valorisation Locale", emoji: "🤝",
    description: "Intégration des ressources et acteurs locaux",
    questions: [
      { id: "aq4", text: "Faites-vous appel à des artisans ou intervenants locaux ?", options: [{ label: "Oui, systématiquement", value: 10 }, { label: "Parfois", value: 5 }, { label: "Non", value: 0 }] },
      { id: "aq5", text: "Valorisez-vous le patrimoine culturel local ?", options: [{ label: "Oui", value: 8 }, { label: "Partiellement", value: 4 }, { label: "Non", value: 0 }] },
    ],
  },
  {
    category: "Sensibilisation", emoji: "📚",
    description: "Actions d'éducation et de sensibilisation",
    questions: [
      { id: "aq6", text: "Sensibilisez-vous les participants à l'environnement ?", options: [{ label: "Oui, activement", value: 10 }, { label: "Partiellement", value: 5 }, { label: "Non", value: 0 }] },
      { id: "aq7", text: "Fournissez-vous des conseils sur les bonnes pratiques ?", options: [{ label: "Oui", value: 10 }, { label: "Non", value: 0 }] },
    ],
  },
  {
    category: "Accessibilité & Pratiques", emoji: "🏅",
    description: "Ouverture et encadrement responsable",
    questions: [
      { id: "aq8", text: "L'activité est-elle accessible aux personnes à mobilité réduite ?", options: [{ label: "Oui", value: 8 }, { label: "Partiellement", value: 4 }, { label: "Non", value: 0 }] },
      { id: "aq9", text: "Avez-vous une politique d'annulation éco-responsable ?", options: [{ label: "Oui", value: 7 }, { label: "Non", value: 0 }] },
    ],
  },
];

type Tab = "tout" | "offres" | "activites" | "circuits" | "reseau" | "apropos" | "collaborations";

type MyCollab = {
  id: string;
  source_type?: "offer" | "circuit";
  offer_id?: string | null;
  offer_title?: string | null;
  offer_description?: string | null;
  offer_cover?: string | null;
  offer_status?: string | null;
  guide_id?: string | null;
  circuit_id?: string | null;
  circuit_title?: string | null;
  circuit_cover?: string | null;
  circuit_status?: string | null;
  circuit_nb_jours?: number | null;
  circuit_description?: string | null;
  circuit_nb_etapes?: number | null;
  circuit_etapes_preview?: { jour: number | null; titre: string | null; destination: string | null; categorie: string | null; subtypes: string[]; etape_mode?: string | null; expertises?: string[]; heure_debut?: string | null; heure_fin?: string | null }[];
  circuit_categories?: string[];
  owner_id?: string | null;
  circuit_owner_type?: string | null;
  etape_id?: string | null;
  etape_jour?: number | null;
  etape_destination?: string | null;
  etape_titre?: string | null;
  etape_heure_debut?: string | null;
  etape_heure_fin?: string | null;
  etape_subtypes?: string[];
  etape_description_courte?: string | null;
  section: string;
  status: "pending" | "accepted" | "completed" | "declined";
  message: string | null;
  created_at: string;
  invited_user_name?: string;
  contribution_data?: Record<string, any> | null;
};

type ProviderCollab = {
  id?: string;
  userId: string;
  userName: string;
  userType: string;
  section: CollabSection;
  status?: string;
};

// ── Circuit types ─────────────────────────────────────────────────────────────
type CircuitEtape = {
  id: string;
  jour: number;
  heure_debut: string;
  heure_fin: string;
  destination: string;
  address: string;
  lat: number | null;
  lng: number | null;
  categorie: string;
  subtypes: string[];
  titre: string;
  description_courte: string;
  description_longue: string;
  prix: number | null;
  photos: string[];
  fields: Record<string, Record<string, any>>;
  unit_details: Record<string, Array<Record<string, any>>>;
  nb_unites: Record<string, number>;
  form_config: Record<string, Record<string, any>>;
  entity_photos: Record<string, string[]>;
  author_type?: "self" | "guide" | "provider";
  collaborator_id?: string | null;
  collaborator_name?: string | null;
  collaborator_type?: string | null;
  etape_mode?: "guidage" | "service";
  guidage_data?: AutreServiceBlockData;
  collab_contribution?: Record<string, any> | null;
  collab_destination?: string | null;
};

type CircuitAvailability = {
  mode: string;
  specific_dates?: string[];
  weekdays?: number[];
  avail_start?: string;
  avail_end?: string;
  saisons?: string[];
  heure_debut?: string;
  heure_fin?: string;
  delai_reponse?: string;
};

type CircuitHebergement = {
  inclus: boolean;
  type?: "same" | "per_day";
  etape?: CircuitEtape;
};

type Circuit = {
  id: string;
  title: string;
  description: string;
  nb_jours: number;
  cover_image: string | null;
  etapes: CircuitEtape[];
  availability?: any;
  hebergement?: CircuitHebergement;
  status?: string;
  created_at: string;
};

function oldAvailToOfferSlot(av: any): OfferAvailSlot {
  if (!av) return { ...EMPTY_OFFER_AVAIL };
  if (av.type !== undefined) return av as OfferAvailSlot;
  const buildTs = (keys: string[]) => {
    if (!av.heure_debut || !av.heure_fin || !keys.length) return null;
    return keys.reduce((acc: Record<string, {start: string; end: string}[]>, k) => ({ ...acc, [k]: [{ start: av.heure_debut, end: av.heure_fin }] }), {});
  };
  switch (av.mode) {
    case 'specific':
      return { type: 'specific', dates: av.specific_dates ?? [], time_slots: buildTs(av.specific_dates ?? []), start_date: null, end_date: null, days_of_week: null, label: null };
    case 'weekly':
      return { type: 'recurring', days_of_week: (av.weekdays ?? []).map(String), start_date: av.avail_start ?? null, end_date: av.avail_end ?? null, time_slots: buildTs((av.weekdays ?? []).map(String)), dates: null, label: null };
    case 'period':
      return { type: 'range', start_date: av.avail_start ?? null, end_date: av.avail_end ?? null, time_slots: buildTs(['0','1','2','3','4','5','6']), dates: null, days_of_week: null, label: null };
    case 'season':
      return { type: 'season', label: Array.isArray(av.saisons) ? av.saisons.join(', ') : null, dates: null, start_date: null, end_date: null, days_of_week: null, time_slots: null };
    default:
      return { ...EMPTY_OFFER_AVAIL };
  }
}

// ─── Botanical SVG Cover ──────────────────────────────────────────────────────

function BotanicalCover() {
  return (
    <div className="relative h-48 md:h-64 lg:h-72 w-full bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 overflow-hidden">
      <svg
        className="absolute inset-0 w-full h-full opacity-25"
        viewBox="0 0 1200 300"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="#2d6a4f" strokeWidth="1.5" fill="none">
          <path d="M1050,10 Q1150,60 1100,130 Q1050,200 980,160 Q1050,120 1050,10Z" />
          <path d="M1050,10 Q1000,90 980,160" />
          <path d="M1100,20 Q1180,80 1140,150 Q1100,200 1050,170 Q1110,130 1100,20Z" />
          <path d="M1100,20 Q1080,100 1050,170" />
          <path d="M950,40 Q1010,80 990,130 Q960,150 940,120 Q970,100 950,40Z" />
          <path d="M950,40 Q945,90 940,120" />
          <path d="M1200,0 Q1120,80 1000,120 Q900,150 850,200" strokeWidth="1" opacity="0.6" />
          <path d="M1200,50 Q1130,110 1060,140 Q990,170 960,220" strokeWidth="1" opacity="0.5" />
          <path d="M0,200 Q80,160 120,100 Q160,40 200,80" strokeWidth="1" opacity="0.4" />
          <path d="M0,240 Q60,210 100,170 Q140,130 180,150" strokeWidth="1" opacity="0.3" />
          <path d="M1080,200 Q1160,240 1150,290 Q1100,300 1050,270 Q1090,250 1080,200Z" />
          <path d="M1080,200 Q1060,250 1050,270" />
          <path d="M800,30 Q860,60 840,110 Q810,130 790,100 Q820,80 800,30Z" opacity="0.5" />
          <path d="M800,30 Q795,75 790,100" opacity="0.5" />
        </g>
        <path d="M0,260 Q300,230 600,250 Q900,270 1200,240" stroke="#2d6a4f" strokeWidth="1" fill="none" opacity="0.15" />
      </svg>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile,        setProfile]        = useState<ProviderProfile | null>(null);
  const [org,            setOrg]            = useState<OrganizationProfile | null>(null);
  const [offers,         setOffers]         = useState<Offer[]>([]);
  const [activities,     setActivities]     = useState<Activity[]>([]);
  const [orgActivities,  setOrgActivities]  = useState<OrgActivity[]>([]);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);
  const [token,     setToken]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("tout");
  const [collaborations, setCollaborations] = useState<MyCollab[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [openCollab, setOpenCollab] = useState<MyCollab | null>(null);
  const [highlightCollabId,   setHighlightCollabId]   = useState<string | null>(null);
  const [highlightOfferId,    setHighlightOfferId]    = useState<string | null>(null);
  const [highlightCircuitId,  setHighlightCircuitId]  = useState<string | null>(null);
  const [collabResponding, setCollabResponding] = useState(false);
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [detailOffer, setDetailOffer] = useState<OfferFull | null>(null);
  const [detailOfferLoading, setDetailOfferLoading] = useState(false);
  const [circuitFullDetail, setCircuitFullDetail] = useState<any>(null);
  const [circuitFullDetailLoading, setCircuitFullDetailLoading] = useState(false);

  // ── Publication offre (attente_publication) ───────────────────────────────
  const [publishOfferModal,   setPublishOfferModal]   = useState<{ offer: Offer; detail: OfferFull | null } | null>(null);
  const [publishOfferLoading, setPublishOfferLoading] = useState(false);
  const [publishOfferSaving,  setPublishOfferSaving]  = useState(false);

  // ── OrgActivity detail modal ──────────────────────────────────────────────
  const [viewOrgActivity, setViewOrgActivity] = useState<OrgActivity | null>(null);
  const [orgActSliderIdx,  setOrgActSliderIdx]  = useState(0);

  // ── Activity modal (create) ──────────────────────────────────────────────
  const [actModalOpen,        setActModalOpen]        = useState(false);
  const [actFormError,        setActFormError]        = useState("");
  const [actPublishing,       setActPublishing]       = useState(false);
  const [actImages,           setActImages]           = useState<{ file: File; preview: string }[]>([]);
  const [actCoverIdx,         setActCoverIdx]         = useState(0);
  const [actSelCategory,      setActSelCategory]      = useState("");
  const [actSelSubtypes,      setActSelSubtypes]      = useState<string[]>([]);
  const [actFieldValues,      setActFieldValues]      = useState<Record<string, Record<string, any>>>({});
  const [actYearsExp,         setActYearsExp]         = useState("");

  // ── Circuits ──────────────────────────────────────────────────────────────
  const [circuits,            setCircuits]            = useState<Circuit[]>([]);
  const [circuitModalOpen,    setCircuitModalOpen]    = useState(false);
  const [circuitSaving,       setCircuitSaving]       = useState(false);
  const [circuitFormError,    setCircuitFormError]    = useState("");
  const [editingCircuit,      setEditingCircuit]      = useState<Circuit | null>(null);
  const [viewingCircuit,      setViewingCircuit]      = useState<Circuit | null>(null);
  const [viewingCircuitCollabsMap, setViewingCircuitCollabsMap] = useState<Record<string, string>>({});
  const [publishingCircuit,   setPublishingCircuit]   = useState(false);
  const [publishCircuitError, setPublishCircuitError] = useState("");
  const [circuitTitle,        setCircuitTitle]        = useState("");
  const [circuitDescription,  setCircuitDescription]  = useState("");
  const [circuitNbJours,      setCircuitNbJours]      = useState(1);
  const [circuitCoverImg,     setCircuitCoverImg]     = useState<{ file: File; preview: string } | null>(null);
  const [circuitCoverExisting,setCircuitCoverExisting]= useState<string | null>(null);
  const [circuitEtapes,       setCircuitEtapes]       = useState<CircuitEtape[]>([]);
  const [circuitEtapeStatusMap, setCircuitEtapeStatusMap] = useState<Map<string, {status: string; collab_id: string}>>(new Map());
  const [pendingKicks,         setPendingKicks]         = useState<{collabId: string; circuitId: string}[]>([]);
  const [editingCollabSchedule, setEditingCollabSchedule] = useState<string | null>(null); // etape id en cours d'édition horaire
  const [collabSchedStart,     setCollabSchedStart]     = useState("");
  const [collabSchedEnd,       setCollabSchedEnd]       = useState("");
  const [collabScheduleConflicts, setCollabScheduleConflicts] = useState<Set<string>>(new Set()); // etape ids avec conflit détecté
  // Circuit-level availability
  const [circuitAvail, setCircuitAvail] = useState<OfferAvailSlot>(EMPTY_OFFER_AVAIL);
  // Circuit-level hébergement
  const [circuitHebergInclus,  setCircuitHebergInclus]  = useState(false);
  const [circuitHebergType,    setCircuitHebergType]    = useState<"same" | "per_day">("same");
  const [circuitHebergEtape,   setCircuitHebergEtape]   = useState<CircuitEtape | null>(null);
  // États du formulaire d'une nouvelle étape
  const [etapeFormOpen,       setEtapeFormOpen]       = useState(false);
  const [etapeJour,           setEtapeJour]           = useState(1);
  const [etapeDestination,    setEtapeDestination]    = useState("");
  const [etapeAddress,        setEtapeAddress]        = useState("");
  const [etapeLat,            setEtapeLat]            = useState<number | null>(null);
  const [etapeLng,            setEtapeLng]            = useState<number | null>(null);
  const [etapeCategorie,      setEtapeCategorie]      = useState("");
  const [etapeSubtypes,       setEtapeSubtypes]       = useState<string[]>([]);
  const [etapeFields,         setEtapeFields]         = useState<Record<string, Record<string, any>>>({});
  const [etapeTitre,          setEtapeTitre]          = useState("");
  const [etapeDescCourte,     setEtapeDescCourte]     = useState("");
  const [etapeDescLongue,     setEtapeDescLongue]     = useState("");
  const [etapePrix,           setEtapePrix]           = useState("");
  const [etapeLocalPhotos,    setEtapeLocalPhotos]    = useState<{ file: File; preview: string }[]>([]);
  const [etapePhotoCoverIdx,  setEtapePhotoCoverIdx]  = useState(0);
  const [etapeFormError,      setEtapeFormError]      = useState("");
  const [etapeEntityImages,         setEtapeEntityImages]         = useState<Record<string, { file: File; preview: string }[]>>({});
  const [etapeEntityCoverIdx,       setEtapeEntityCoverIdx]       = useState<Record<string, number>>({});
  const [etapeEntityExistingImages, setEtapeEntityExistingImages] = useState<Record<string, string[]>>({});
  const [etapeSubtypeNbUnites,   setEtapeSubtypeNbUnites]   = useState<Record<string, number>>({});
  const [etapeSubtypeUnitDetails,setEtapeSubtypeUnitDetails]= useState<Record<string, Array<Record<string, any>>>>({});
  const [etapeActiveSubtypeTab,  setEtapeActiveSubtypeTab]  = useState<Record<string, number>>({});
  const [etapeSubtypeFormConfig, setEtapeSubtypeFormConfig] = useState<Record<string, Record<string, any>>>({});
  const [etapeSubtypeDetails,    setEtapeSubtypeDetails]    = useState<Record<string, Record<string, any>>>({});
  const [etapeHeureDebut,        setEtapeHeureDebut]        = useState("");
  const [etapeHeureFin,          setEtapeHeureFin]          = useState("");
  const [etapeAuthorType,        setEtapeAuthorType]        = useState<"self" | "guide" | "provider">("self");
  const [etapeCollabSearch,      setEtapeCollabSearch]      = useState("");
  const [etapeCollabResults,     setEtapeCollabResults]     = useState<{ user_id: string; name: string; type: string }[]>([]);
  const [etapeCollabSelected,    setEtapeCollabSelected]    = useState<{ user_id: string; name: string; type: string } | null>(null);
  const [etapeCollabSearching,   setEtapeCollabSearching]   = useState(false);
  const [etapeCollabPanelOpen,   setEtapeCollabPanelOpen]   = useState(false);
  const [etapeMode,              setEtapeMode]              = useState<"guidage" | "service">("service");
  const [etapeGuidageData,       setEtapeGuidageData]       = useState<AutreServiceBlockData>({ categorie: "", sousType: "", details: { _mode: "guide" } });
  const [editingEtapeId,         setEditingEtapeId]         = useState<string | null>(null);

  // ── Activity detail/edit modal ───────────────────────────────────────────
  const [actDetailOpen,  setActDetailOpen]  = useState(false);
  const [actDetailMode,  setActDetailMode]  = useState<"view"|"edit">("view");
  const [viewActivity,   setViewActivity]   = useState<Activity | null>(null);
  const [actEditForm,    setActEditForm]    = useState({ title: "", category: "", level: "primary" as "primary"|"secondary", description: "", region: "", address: "", website: "", phone: "" });
  const [actEditError,   setActEditError]   = useState("");
  const [actEditSaving,  setActEditSaving]  = useState(false);
  const [actDeleting,    setActDeleting]    = useState(false);
  const [actEditImages,  setActEditImages]  = useState<{ src: string; file?: File }[]>([]);
  const [actEditCoverIdx,setActEditCoverIdx]= useState(0);

  // ── Activity type detail / edit modal (profile-level) ───────────────────
  const [actTypeOpen,          setActTypeOpen]          = useState(false);
  const [actTypeMode,          setActTypeMode]          = useState<"view" | "edit">("view");
  const [actTypeCurrent,       setActTypeCurrent]       = useState<{ value: string; level: "primary" | "secondary" } | null>(null);
  const [actTypeEditCategory,  setActTypeEditCategory]  = useState("");
  const [actTypeEditSubtype,   setActTypeEditSubtype]   = useState("");
  const [actTypeEditDynFields, setActTypeEditDynFields] = useState<Record<string, any>>({});
  const [actTypeSaving,        setActTypeSaving]        = useState(false);
  const [actTypeSaveError,     setActTypeSaveError]     = useState("");

  // ── Activity sustainability questionnaire ────────────────────────────────
  const [aqOpen,     setAqOpen]     = useState(false);
  const [aqActId,    setAqActId]    = useState("");
  const [aqStep,     setAqStep]     = useState(0);
  const [aqAnswers,  setAqAnswers]  = useState<Record<string, number>>({});
  const [aqSaving,   setAqSaving]   = useState(false);

  type NetUser = { user_id: string; full_name: string; photo: string | null; _type: string; sub?: string | null };
  const [following,  setFollowing]  = useState<NetUser[]>([]);
  const [followers,  setFollowers]  = useState<NetUser[]>([]);
  type FollowRequest = { id: string; created_at: string; sender: { user_id: string; full_name: string | null; photo: string | null; role: string } };
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [netSearch,  setNetSearch]  = useState("");
  const [netResults, setNetResults] = useState<NetUser[]>([]);
  const [netLoading, setNetLoading] = useState(false);
  const [netMenuId,        setNetMenuId]        = useState<string | null>(null);
  const [netReport,        setNetReport]        = useState<{ id: string; name: string } | null>(null);
  const [netReportReason,  setNetReportReason]  = useState("");
  const [netReportSending, setNetReportSending] = useState(false);
  const NET_REPORT_REASONS = ["Contenu inapproprié", "Faux profil", "Harcèlement ou spam", "Informations trompeuses", "Autre"];

  // ── Publish offer modal ──────────────────────────────────────────────────
  const [modalOpen,       setModalOpen]       = useState(false);
  const [offerStep,       setOfferStep]       = useState(1);
  const [form,            setForm]            = useState({ title: "", offer_type: "", description: "", price: "", duration: "", region: "", inclusions: "", meeting_point: "", min_group_size: "", max_group_size: "", min_age: "", cancellation_policy: "" });
  const [titleError,      setTitleError]      = useState("");
  const [publishing,      setPublishing]      = useState(false);
  const [publishError,    setPublishError]    = useState("");
  const [publishImages,   setPublishImages]   = useState<{ file: File; preview: string }[]>([]);
  const [publishCoverIdx, setPublishCoverIdx] = useState(0);
  const [showPublishMap,  setShowPublishMap]  = useState(false);
  const [publishMapLat,   setPublishMapLat]   = useState<number | null>(null);
  const [publishMapLng,   setPublishMapLng]   = useState<number | null>(null);
  // ── Offer enriched fields ────────────────────────────────────────────────
  const [offerActivity,      setOfferActivity]      = useState<OrgActivity | null>(null);
  const [offerSubtypes,      setOfferSubtypes]      = useState<string[]>([]);
  const [offerMode,          setOfferMode]          = useState<"single" | "variant" | "package">("single");
  const [subtypeDetails,     setSubtypeDetails]     = useState<Record<string, Record<string, any>>>({});
  const [constraintError,    setConstraintError]    = useState("");
  const [availabilityMode,   setAvailabilityMode]   = useState("always");
  const [availabilityStart,  setAvailabilityStart]  = useState("");
  const [availabilityEnd,    setAvailabilityEnd]    = useState("");
  const [availableWeekdays,  setAvailableWeekdays]  = useState<number[]>([]);
  const [specificDates,      setSpecificDates]      = useState<string[]>([]);
  const [newSpecificDate,    setNewSpecificDate]    = useState("");
  const [offerConfirmMode,   setOfferConfirmMode]   = useState("24h");
  const [offerDeadlineHours, setOfferDeadlineHours] = useState("24");
  const [offerDepositPct,    setOfferDepositPct]    = useState("30");
  // ── Bloc 1 extra ────────────────────────────────────────────────────────
  const [offerDescCourte,    setOfferDescCourte]    = useState("");
  const [offerLangue,        setOfferLangue]        = useState("");
  // ── Bloc 3 time fields ──────────────────────────────────────────────────
  const [availHeureDebut,    setAvailHeureDebut]    = useState("");
  const [availHeureFin,      setAvailHeureFin]      = useState("");
  const [availDelaiReponse,  setAvailDelaiReponse]  = useState("24h");
  const [availMessageAccueil,setAvailMessageAccueil]= useState("");
  const [availSaisons,       setAvailSaisons]       = useState<string[]>([]);
  // ── Bloc 4 pricing ──────────────────────────────────────────────────────
  const [prixGroupe,         setPrixGroupe]         = useState("");
  const [nbPersonnesGroupe,  setNbPersonnesGroupe]  = useState("");
  const [prixEnfant,         setPrixEnfant]         = useState("");
  const [ageMaxEnfant,       setAgeMaxEnfant]       = useState("");
  const [suppPrivatisation,  setSuppPrivatisation]  = useState("");
  const [acompteRequis,      setAcompteRequis]      = useState(false);
  const [typeAcompte,        setTypeAcompte]        = useState("pourcentage");
  const [valeurAcompte,      setValeurAcompte]      = useState("");
  // ── Bloc 6 annulation ───────────────────────────────────────────────────
  const [cancellationPolicy, setCancellationPolicy] = useState("moderate");
  const [cancellationDesc,   setCancellationDesc]   = useState("");
  // ── Tarif par sous-type (variant) ────────────────────────────────────────
  const [subtypePrices,      setSubtypePrices]      = useState<Record<string, string>>({});
  // ── Multi-unités par sous-type (hébergement) ─────────────────────────────
  // subtypeNbUnites[st]    = nb d'unités de ce sous-type
  // subtypeUnitDetails[st] = [{...champs unité 0}, {... unité 1}, ...]
  // activeSubtypeTab[st]   = onglet actif pour ce sous-type
  const [subtypeNbUnites,    setSubtypeNbUnites]    = useState<Record<string, number>>({});
  const [subtypeUnitDetails, setSubtypeUnitDetails] = useState<Record<string, Array<Record<string, any>>>>({});
  const [activeSubtypeTab,   setActiveSubtypeTab]   = useState<Record<string, number>>({});
  // ── Gardés pour compat (single subtype path) ──────────────────────────────
  const [offerNbUnites,      setOfferNbUnites]      = useState(1);
  const [unitDetailsArray,   setUnitDetailsArray]   = useState<Array<Record<string, any>>>([{}]);
  const [activeUnitTab,      setActiveUnitTab]      = useState(0);
  // ── Type de prestation + collaboration prestataire ────────────────────────
  const [offerTypePrestation,   setOfferTypePrestation]   = useState<string | null>(null);
  const [providerOfferCollabs,  setProviderOfferCollabs]  = useState<ProviderCollab[]>([]);
  const [providerInviteSection, setProviderInviteSection] = useState<CollabSection | null>(null);
  const [providerCollabSaving,  setProviderCollabSaving]  = useState(false);
  // ── Public ciblé, services inclus, disponibilité OfferAvailPicker, confirmation ──
  const [offerPublicCible,       setOfferPublicCible]       = useState<string[]>([]);
  const [providerServicesInclus, setProviderServicesInclus] = useState<string[]>([]);
  const [offerLocationDesc,          setOfferLocationDesc]          = useState("");
  const [providerTransportInclus,    setProviderTransportInclus]    = useState<boolean | null>(null);
  const [providerTransportEcoST,     setProviderTransportEcoST]     = useState("");
  const [providerTransportEcoDet,    setProviderTransportEcoDet]    = useState<Record<string, any>>({});
  const [providerTransportStdST,     setProviderTransportStdST]     = useState("");
  const [providerTransportStdDet,    setProviderTransportStdDet]    = useState<Record<string, any>>({});
  const [providerRepasFlag,          setProviderRepasFlag]          = useState<boolean | null>(null);
  const [providerRepasMode,          setProviderRepasMode]          = useState<"guide"|"prestataire">("prestataire");
  const [providerRepasGastroExp,     setProviderRepasGastroExp]     = useState("");
  const [providerRepasGastroDet,     setProviderRepasGastroDet]     = useState<Record<string, any>>({});
  const [providerRepasST,            setProviderRepasST]            = useState("");
  const [providerRepasDet,           setProviderRepasDet]           = useState<Record<string, any>>({});
  const [providerHebergementInclus,  setProviderHebergementInclus]  = useState<boolean | null>(null);
  const [providerHebergementST,      setProviderHebergementST]      = useState("");
  const [providerHebergementDet,     setProviderHebergementDet]     = useState<Record<string, any>>({});
  const [providerAutreServiceInclus, setProviderAutreServiceInclus] = useState<boolean | null>(null);
  const [providerAutreServiceCat,    setProviderAutreServiceCat]    = useState("");
  const [providerAutreServiceST,     setProviderAutreServiceST]     = useState("");
  const [providerAutreServiceDet,    setProviderAutreServiceDet]    = useState<Record<string, any>>({});
  const [offerAvail,             setOfferAvail]             = useState<OfferAvailSlot>(EMPTY_OFFER_AVAIL);
  const [offerConfirmation,      setOfferConfirmation]      = useState<ConfirmationData>(EMPTY_CONFIRMATION);
  type ProviderCollabConflict = { userName: string; section: string; conflictSlot: string; conflictDays: string[]; conflictTimeSlots?: Record<string, { start: string; end: string }[]> | null };
  const [providerCollabConflicts,     setProviderCollabConflicts]     = useState<ProviderCollabConflict[]>([]);
  const [checkingProviderCollabConfs, setCheckingProviderCollabConfs] = useState(false);
  // ── Config par sous-type (disponibilité + tarification — hébergement) ────
  const [subtypeFormConfig,  setSubtypeFormConfig]  = useState<Record<string, Record<string, any>>>({});
  // ── Photos par entité (sous-type ou unité) ───────────────────────────────
  const [entityImages,         setEntityImages]         = useState<Record<string, Array<{file: File; preview: string}>>>({});
  const [entityCoverIdx,       setEntityCoverIdx]       = useState<Record<string, number>>({});
  const [entityExistingImages, setEntityExistingImages] = useState<Record<string, string[]>>({});
  // ── Publish modal — edit mode ─────────────────────────────────────────────
  const [offerEditMode,        setOfferEditMode]        = useState(false);
  const [offerEditId,          setOfferEditId]          = useState("");
  const [publishExistingImages,setPublishExistingImages] = useState<string[]>([]);

  // ── Offer detail / edit modal ────────────────────────────────────────────
  const [editModalOpen,  setEditModalOpen]  = useState(false);
  const [editMode,       setEditMode]       = useState(false);
  const [viewOffer,      setViewOffer]      = useState<Offer | null>(null);
  const [sliderIdx,      setSliderIdx]      = useState(0);
  const [touchStartX,    setTouchStartX]    = useState<number | null>(null);
  const [editOfferId,    setEditOfferId]    = useState("");
  const [editForm,       setEditForm]       = useState({ title: "", offer_type: "", description: "", price: "", duration: "", status: "", region: "", inclusions: "", meeting_point: "", min_group_size: "", max_group_size: "", min_age: "", cancellation_policy: "" });
  const [editTitleError, setEditTitleError] = useState("");
  const [editSaving,     setEditSaving]     = useState(false);
  const [editError,      setEditError]      = useState("");
  const [offerDeleting,  setOfferDeleting]  = useState(false);
  const [editImages,     setEditImages]     = useState<{ src: string; file?: File }[]>([]);
  const [editCoverIdx,   setEditCoverIdx]   = useState(0);
  const [editDetails,    setEditDetails]    = useState<Record<string, any>>({});
  const [showEditMap,    setShowEditMap]    = useState(false);
  const [editMapLat,     setEditMapLat]     = useState<number | null>(null);
  const [editMapLng,     setEditMapLng]     = useState<number | null>(null);

  // ── Offer sustainability questionnaire ───────────────────────────────────
  const [oqOpen,    setOqOpen]    = useState(false);
  const [oqOfferId, setOqOfferId] = useState("");
  const [oqStep,    setOqStep]    = useState(0);
  const [oqAnswers, setOqAnswers] = useState<Record<string, number>>({});
  const [oqSaving,  setOqSaving]  = useState(false);

  // ── Edit profile modal ────────────────────────────────────────────────────
  const [editProfileOpen,   setEditProfileOpen]   = useState(false);
  const [editProfileForm,   setEditProfileForm]   = useState({ full_name: "", bio: "", country: "", language: "", organization: "", position: "", phone: "", provider_type: "", region: "", website: "", years_experience: "" });
  const [editProfileActivities,    setEditProfileActivities]    = useState<string[]>([]);
  const [editProfileSecActivities, setEditProfileSecActivities] = useState<string[]>([]);
  const [editProfilePhoto,  setEditProfilePhoto]  = useState<{ file?: File; preview: string } | null>(null);
  const [editProfileCover,  setEditProfileCover]  = useState<{ file?: File; preview: string } | null>(null);
  const [editProfileSaving, setEditProfileSaving] = useState(false);
  const [editProfileError,  setEditProfileError]  = useState("");

  // Lire le tab depuis l'URL (?tab=collaborations)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["tout","offres","activites","circuits","reseau","apropos","collaborations"].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  useEffect(() => {
    async function init() {
      const tkn = localStorage.getItem("access_token");
      if (!tkn) { router.push("/auth/login"); return; }
      setToken(tkn);
      try {
        const [p, myOffers, myActivities, myOrg, myOrgActivities] = await Promise.all([
          apiFetch<ProviderProfile>("/providers/me", { headers: { Authorization: `Bearer ${tkn}` } }),
          apiFetch<Offer[]>("/offers/mine", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => [] as Offer[]),
          apiFetch<Activity[]>("/provider-activities/mine", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => [] as Activity[]),
          apiFetch<OrganizationProfile>("/organizations/me", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => null),
          apiFetch<OrgActivity[]>("/provider-activities/mine", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => [] as OrgActivity[]),
        ]);
        setProfile(p);
        setOrg(myOrg);
        setOrgActivities(myOrgActivities);
        const offersWithCover = myOffers.map((o) => {
          const validImages = o.images?.filter((url) => url.startsWith("http")) ?? null;
          return {
            ...o,
            images:      validImages?.length ? validImages : null,
            cover_image: o.cover_image ?? validImages?.[0] ?? null,
          };
        });
        setOffers(offersWithCover);
        setActivities(myActivities);
        Promise.all([
          apiFetch<NetUser[]>("/follows/following/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<NetUser[]>("/follows/followers/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<FollowRequest[]>("/follows/requests", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
        ]).then(([fwing, fwers, reqs]) => {
          setFollowing(fwing); setFollowers(fwers); setFollowRequests(reqs);
        });
      } catch {
        router.push("/dashboard/provider");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Charger les collaborations à la demande
  useEffect(() => {
    if ((activeTab !== "collaborations" && activeTab !== "tout") || !token) return;
    setCollabLoading(true);
    const autoOpenId        = activeTab === "collaborations" ? searchParams.get("openCollab") : null;
    const autoOpenByOffer   = activeTab === "collaborations" ? searchParams.get("openCollabByOffer") : null;
    const autoOpenByCircuit = activeTab === "collaborations" ? searchParams.get("openCollabByCircuit") : null;
    apiFetch<MyCollab[]>("/guide/collaborations/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((list) => {
        setCollaborations(list);
        const resolveTarget = (t: typeof list[0] | undefined) => {
          if (!t) return;
          setHighlightCollabId(t.id);
          setTimeout(() => {
            document.getElementById(`collab-${t.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => setHighlightCollabId(null), 3000);
          }, 300);
        };
        if (autoOpenId) {
          resolveTarget(list.find((x) => x.id === autoOpenId));
        } else if (autoOpenByOffer) {
          resolveTarget(list.find((x) => x.offer_id === autoOpenByOffer));
        } else if (autoOpenByCircuit) {
          resolveTarget(list.find((x: any) => x.circuit_id === autoOpenByCircuit));
        }
      })
      .catch(() => setCollaborations([]))
      .finally(() => setCollabLoading(false));
  }, [activeTab, token, searchParams]);

  // Highlight une offre depuis URL (?tab=offres&openOffer=...)
  useEffect(() => {
    if (activeTab !== "offres") return;
    const openOfferId = searchParams.get("openOffer");
    if (!openOfferId || !offers.length) return;
    setHighlightOfferId(openOfferId);
    setTimeout(() => {
      document.getElementById(`offer-${openOfferId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlightOfferId(null), 3000);
    }, 300);
  }, [activeTab, searchParams, offers]);

  // Network search
  useEffect(() => {
    if (!netSearch.trim() || !token) { setNetResults([]); return; }
    const t = setTimeout(() => {
      setNetLoading(true);
      Promise.all([
        apiFetch<any[]>(`/guide/public/search?q=${encodeURIComponent(netSearch)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
        apiFetch<any[]>(`/providers/search?q=${encodeURIComponent(netSearch)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
      ]).then(([guides, providers]) => {
        const g = guides.map((g: any) => ({ user_id: g.user_id, full_name: g.full_name, photo: g.photo, _type: "guide", sub: g.zone ?? null }));
        const p = providers.map((p: any) => ({ user_id: p.user_id, full_name: p.full_name ?? p.organization, photo: p.photo, _type: "provider", sub: p.provider_type ?? null }));
        setNetResults([...g, ...p]);
      }).catch(() => setNetResults([]))
        .finally(() => setNetLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [netSearch, token]);

  // ── Circuits — chargés depuis l'API ────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    apiFetch<Circuit[]>("/circuits/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => setCircuits(data.map((c) => ({ ...c, created_at: typeof c.created_at === 'string' ? c.created_at : new Date(c.created_at).toISOString() }))))
      .catch(() => {});
  }, [token]);

  // Highlight circuit depuis URL (?tab=circuits&openCircuit=...)
  useEffect(() => {
    if (activeTab !== "circuits" || !token || !circuits.length) return;
    const openId = searchParams.get("openCircuit");
    if (!openId) return;
    if (!circuits.find((c) => c.id === openId)) return;
    setHighlightCircuitId(openId);
    setTimeout(() => {
      document.getElementById(`circuit-${openId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlightCircuitId(null), 3000);
    }, 300);
  }, [activeTab, token, circuits, searchParams]);

  // Vérification des conflits agenda collaborateurs (étape 4 wizard offre prestataire)
  const providerAvailKey = JSON.stringify(offerAvail);
  useEffect(() => {
    if (!offerEditId || !offerAvail.type || !token) {
      setProviderCollabConflicts([]);
      return;
    }
    setCheckingProviderCollabConfs(true);
    const timer = setTimeout(async () => {
      try {
        const result = await apiFetch<ProviderCollabConflict[]>(`/offers/${offerEditId}/collab-conflicts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ disponibilite: offerAvail }),
        });
        setProviderCollabConflicts(Array.isArray(result) ? result : []);
      } catch {
        setProviderCollabConflicts([]);
      } finally {
        setCheckingProviderCollabConfs(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerAvailKey, offerEditId, token]);

  // Quand les dates range de la dispo changent → resync nb_jours (en tenant compte des jours inclus)
  useEffect(() => {
    if (circuitAvail.type !== 'range' || !circuitAvail.start_date || !circuitAvail.end_date) return;
    const frDays = circuitAvail.days_of_week;
    let n: number;
    if (frDays?.length) {
      // Compter uniquement les jours de la semaine sélectionnés dans la plage
      const s = new Date(circuitAvail.start_date + 'T12:00:00');
      const e = new Date(circuitAvail.end_date + 'T12:00:00');
      n = 0;
      const cur = new Date(s);
      while (cur <= e) {
        const frIdx = String((cur.getDay() + 6) % 7); // 0=Lun…6=Dim
        if (frDays.includes(frIdx)) n++;
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      n = Math.round((new Date(circuitAvail.end_date).getTime() - new Date(circuitAvail.start_date).getTime()) / 86400000) + 1;
    }
    if (n > 0 && n !== circuitNbJours) {
      if (n < circuitNbJours) setCircuitEtapes((prev) => prev.filter((ep) => ep.jour <= n));
      setCircuitNbJours(n);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitAvail.type, circuitAvail.start_date, circuitAvail.end_date, JSON.stringify(circuitAvail.days_of_week)]);

  // Quand les jours récurrents changent → nb_jours = nombre de jours/semaine sélectionnés
  useEffect(() => {
    if (circuitAvail.type !== 'recurring') return;
    const n = circuitAvail.days_of_week?.length ?? 0;
    if (n > 0 && n !== circuitNbJours) {
      if (n < circuitNbJours) setCircuitEtapes((prev) => prev.filter((ep) => ep.jour <= n));
      setCircuitNbJours(n);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitAvail.type, JSON.stringify(circuitAvail.days_of_week)]);

  // Quand les dates specific changent → nb_jours = nombre de dates sélectionnées
  useEffect(() => {
    if (circuitAvail.type !== 'specific') return;
    const n = circuitAvail.dates?.length ?? 0;
    if (n > 0 && n !== circuitNbJours) {
      if (n < circuitNbJours) setCircuitEtapes((prev) => prev.filter((ep) => ep.jour <= n));
      setCircuitNbJours(n);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitAvail.type, JSON.stringify(circuitAvail.dates)]);

  // Quand les dates specific changent → nb_jours = nombre de dates sélectionnées
  useEffect(() => {
    if (circuitAvail.type !== 'specific') return;
    const n = circuitAvail.dates?.length ?? 0;
    if (n > 0 && n !== circuitNbJours) {
      if (n < circuitNbJours) setCircuitEtapes((prev) => prev.filter((ep) => ep.jour <= n));
      setCircuitNbJours(n);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuitAvail.type, JSON.stringify(circuitAvail.dates)]);

  function openCircuitModal(circuit?: Circuit) {
    setCircuitEtapeStatusMap(new Map());
    setPendingKicks([]);
    setEditingCollabSchedule(null);
    setCollabScheduleConflicts(new Set());
    if (circuit) {
      setEditingCircuit(circuit);
      setCircuitTitle(circuit.title);
      setCircuitDescription(circuit.description);
      setCircuitNbJours(circuit.nb_jours);
      setCircuitCoverExisting(circuit.cover_image);
      setCircuitEtapes([...circuit.etapes]);
      setCircuitAvail(oldAvailToOfferSlot(circuit.availability));
      const hb = circuit.hebergement;
      setCircuitHebergInclus(hb?.inclus ?? false);
      setCircuitHebergType(hb?.type ?? "same");
      setCircuitHebergEtape(hb?.etape ?? null);
      // Charger les collabs pour savoir quelles étapes sont verrouillées
      const tkn = localStorage.getItem("access_token") ?? "";
      apiFetch<any[]>(`/circuits/${circuit.id}/collaborations`, { headers: { Authorization: `Bearer ${tkn}` } })
        .then((collabs) => {
          const statusMap = new Map<string, {status: string; collab_id: string}>();
          for (const c of collabs ?? []) {
            if (c.etape_id) statusMap.set(c.etape_id, { status: c.status, collab_id: c.id });
          }
          setCircuitEtapeStatusMap(statusMap);
        })
        .catch(() => {});
    } else {
      setEditingCircuit(null);
      setCircuitTitle(""); setCircuitDescription("");
      setCircuitNbJours(1); setCircuitCoverExisting(null);
      setCircuitEtapes([]);
      setCircuitAvail(EMPTY_OFFER_AVAIL);
      setCircuitHebergInclus(false); setCircuitHebergType("same");
      setCircuitHebergEtape(null);
    }
    setCircuitCoverImg(null); setCircuitFormError("");
    setEtapeFormOpen(false); resetEtapeForm();
    setCircuitModalOpen(true);
  }

  function toMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }

  function resetEtapeForm() {
    setEtapeJour(1);
    setEtapeDestination(""); setEtapeAddress("");
    setEtapeLat(null); setEtapeLng(null);
    setEtapeCategorie("");
    setEtapeSubtypes([]); setEtapeFields({});
    setEtapeTitre(""); setEtapeDescCourte(""); setEtapeDescLongue(""); setEtapePrix("");
    setEtapeLocalPhotos([]); setEtapePhotoCoverIdx(0);
    setEtapeFormError("");
    setEtapeEntityImages({}); setEtapeEntityCoverIdx({}); setEtapeEntityExistingImages({});
    setEtapeSubtypeNbUnites({}); setEtapeSubtypeUnitDetails({});
    setEtapeActiveSubtypeTab({}); setEtapeSubtypeFormConfig({});
    setEtapeSubtypeDetails({});
    setEtapeHeureDebut(""); setEtapeHeureFin("");
    setEtapeAuthorType("self"); setEtapeCollabSearch(""); setEtapeCollabResults([]); setEtapeCollabSelected(null); setEtapeCollabPanelOpen(false);
    setEtapeMode("service");
    setEtapeGuidageData({ categorie: "", sousType: "", details: { _mode: "guide" } });
    setEditingEtapeId(null);
  }

  function openCircuitHebergConfig() {
    resetEtapeForm();
    setEtapeJour(-1);
    setEtapeCategorie('hebergement');
    if (circuitHebergEtape) {
      setEditingEtapeId(circuitHebergEtape.id);
      setEtapeSubtypes(circuitHebergEtape.subtypes);
      setEtapeTitre(circuitHebergEtape.titre);
      setEtapeDescCourte(circuitHebergEtape.description_courte);
      setEtapeDescLongue(circuitHebergEtape.description_longue);
      setEtapeSubtypeDetails(circuitHebergEtape.fields ?? {});
      setEtapeSubtypeUnitDetails(circuitHebergEtape.unit_details ?? {});
      setEtapeSubtypeNbUnites(circuitHebergEtape.nb_unites ?? {});
      setEtapeSubtypeFormConfig(circuitHebergEtape.form_config ?? {});
      setEtapeEntityExistingImages(circuitHebergEtape.entity_photos ?? {});
      setEtapeLat(circuitHebergEtape.lat);
      setEtapeLng(circuitHebergEtape.lng);
      setEtapeAddress(circuitHebergEtape.address ?? "");
      setEtapeAuthorType(circuitHebergEtape.author_type ?? "self");
      if (circuitHebergEtape.collaborator_id && circuitHebergEtape.collaborator_name) {
        setEtapeCollabSelected({
          user_id: circuitHebergEtape.collaborator_id,
          name: circuitHebergEtape.collaborator_name,
          type: circuitHebergEtape.collaborator_type ?? "provider",
        });
      }
    }
    setEtapeFormOpen(true);
  }

  async function addEtape(keepOpen = false) {
    const isCircuitHeberg = etapeJour === -1;
    const isGuidage = etapeMode === "guidage" && !isCircuitHeberg;
    if (!etapeCollabSelected && (!etapeLat || !etapeLng)) { setEtapeFormError("Positionnez la destination sur la carte."); return; }
    if (isGuidage) {
      if (!etapeGuidageData.categorie) { setEtapeFormError("Choisissez un domaine de guidage."); return; }
      if (!etapeCollabSelected) { setEtapeFormError("Invitez un guide pour assurer cette étape."); return; }
    } else {
      if (!isCircuitHeberg && !etapeCategorie) { setEtapeFormError("Choisissez un type d'activité."); return; }
      if (etapeSubtypes.length === 0) { setEtapeFormError(isCircuitHeberg ? "Choisissez au moins un type d'hébergement." : "Choisissez au moins un sous-type."); return; }
      const selfPossible = orgActivities.some((a) => a.category === etapeCategorie);
      if (!selfPossible && !etapeCollabSelected) { setEtapeFormError(isCircuitHeberg ? "Invitez un prestataire hébergement pour ce circuit." : "Invitez un prestataire pour cette catégorie."); return; }
      if (selfPossible && etapeAuthorType === "provider" && !etapeCollabSelected) { setEtapeFormError("Invitez un prestataire ou passez en mode 'Moi-même'."); return; }
    }
    if (!isGuidage && !etapeCollabSelected && !etapeTitre.trim()) { setEtapeFormError("Le titre est requis."); return; }
    if (!isCircuitHeberg) {
      if (!etapeHeureDebut)             { setEtapeFormError("L'heure de début est requise."); return; }
      if (!etapeHeureFin)               { setEtapeFormError("L'heure de fin est requise."); return; }
      if (toMinutes(etapeHeureFin) <= toMinutes(etapeHeureDebut)) {
        setEtapeFormError("L'heure de fin doit être après l'heure de début."); return;
      }
      const newStart = toMinutes(etapeHeureDebut);
      const newEnd   = toMinutes(etapeHeureFin);
      const conflict = circuitEtapes.find((e) =>
        e.jour === etapeJour &&
        e.id !== editingEtapeId &&
        e.heure_debut && e.heure_fin &&
        toMinutes(e.heure_debut) < newEnd &&
        toMinutes(e.heure_fin)   > newStart
      );
      if (conflict) {
        setEtapeFormError(`Ce créneau (${etapeHeureDebut} – ${etapeHeureFin}) est déjà occupé par une autre activité de ce jour. Modifiez les horaires.`);
        return;
      }
    }
    const displayName = etapeDestination.trim() || etapeAddress.split(",")[0].trim();
    const finalEntityPhotos: Record<string, string[]> = { ...etapeEntityExistingImages };
    try {
      for (const [entityKey, imgs] of Object.entries(etapeEntityImages)) {
        if (imgs.length === 0) continue;
        const coverI = etapeEntityCoverIdx[entityKey] ?? 0;
        const urls = await Promise.all(imgs.map((p) => uploadImage(p.file)));
        const cover = urls[coverI] ?? urls[0];
        const newOrdered = [cover, ...urls.filter((u) => u !== cover)];
        const existing = finalEntityPhotos[entityKey] ?? [];
        finalEntityPhotos[entityKey] = [...existing, ...newOrdered];
      }
    } catch { setEtapeFormError("Erreur upload photos."); return; }
    const allEntityUrls = Object.values(finalEntityPhotos).flat();
    const newEtape: CircuitEtape = {
      id: (isCircuitHeberg ? circuitHebergEtape?.id : editingEtapeId) ?? crypto.randomUUID(),
      jour: etapeJour,
      heure_debut: isCircuitHeberg ? '' : etapeHeureDebut,
      heure_fin:   isCircuitHeberg ? '' : etapeHeureFin,
      destination: displayName,
      address: etapeAddress,
      lat: etapeLat,
      lng: etapeLng,
      categorie: isGuidage ? (etapeGuidageData.categorie || "guidage") : etapeCategorie,
      subtypes: isGuidage ? (etapeGuidageData.sousType ? [etapeGuidageData.sousType] : []) : etapeSubtypes,
      titre: etapeTitre.trim(),
      description_courte: etapeDescCourte.trim(),
      description_longue: etapeDescLongue.trim(),
      prix: etapePrix ? Number(etapePrix) : null,
      photos: isGuidage ? [] : allEntityUrls,
      fields: isGuidage ? {} : etapeSubtypeDetails,
      unit_details: isGuidage ? {} : etapeSubtypeUnitDetails,
      nb_unites: isGuidage ? {} : etapeSubtypeNbUnites,
      form_config: isGuidage ? {} : etapeSubtypeFormConfig,
      entity_photos: isGuidage ? {} : finalEntityPhotos,
      etape_mode: isCircuitHeberg ? "service" : etapeMode,
      guidage_data: isGuidage ? etapeGuidageData : undefined,
      author_type: isGuidage ? "guide" : etapeAuthorType,
      collaborator_id: etapeCollabSelected?.user_id ?? null,
      collaborator_name: etapeCollabSelected?.name ?? null,
      collaborator_type: isGuidage ? "guide" : (etapeCollabSelected?.type ?? null),
    };
    if (isCircuitHeberg) {
      setCircuitHebergEtape(newEtape);
      setEtapeFormOpen(false);
      resetEtapeForm();
      return;
    }
    if (editingEtapeId) {
      setCircuitEtapes((prev) => prev.map((e) => e.id === editingEtapeId ? newEtape : e));
    } else {
      setCircuitEtapes((prev) => [...prev, newEtape].sort((a, b) => a.jour - b.jour || toMinutes(a.heure_debut || "00:00") - toMinutes(b.heure_debut || "00:00")));
    }
    if (keepOpen) {
      const savedJour = etapeJour;
      resetEtapeForm();
      setEtapeJour(savedJour);
      setEtapeFormOpen(true);
    } else {
      setEtapeFormOpen(false);
      resetEtapeForm();
    }
  }

  async function saveCircuit() {
    if (!circuitTitle.trim()) { setCircuitFormError("Titre requis."); return; }
    if (circuitEtapes.length === 0) { setCircuitFormError("Configurez au moins un jour."); return; }
    const missingJours = Array.from({ length: circuitNbJours }, (_, i) => i + 1).filter((j) => !circuitEtapes.find((e) => e.jour === j));
    if (missingJours.length > 0) { setCircuitFormError(`Jours non configurés : ${missingJours.join(", ")}.`); return; }
    setCircuitSaving(true);
    try {
      let coverUrl = circuitCoverExisting;
      if (circuitCoverImg) coverUrl = await uploadImage(circuitCoverImg.file);
      const availability = circuitAvail;
      const hebergement: CircuitHebergement = {
        inclus: circuitHebergInclus,
        ...(circuitHebergInclus && { type: circuitHebergType }),
        ...(circuitHebergInclus && circuitHebergType === 'same' && circuitHebergEtape && { etape: circuitHebergEtape }),
      };
      const body = { title: circuitTitle, description: circuitDescription, nb_jours: circuitNbJours, cover_image: coverUrl, etapes: circuitEtapes, availability, hebergement };
      let savedCircuitId: string;
      if (editingCircuit) {
        const updated = await apiFetch<Circuit>(`/circuits/${editingCircuit.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setCircuits((prev) => prev.map((c) => c.id === updated.id ? { ...updated, created_at: typeof updated.created_at === 'string' ? updated.created_at : new Date(updated.created_at).toISOString() } : c));
        savedCircuitId = updated.id;
      } else {
        const created = await apiFetch<Circuit>("/circuits", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setCircuits((prev) => [{ ...created, created_at: typeof created.created_at === 'string' ? created.created_at : new Date(created.created_at).toISOString() }, ...prev]);
        savedCircuitId = created.id;
      }
      // Inviter automatiquement les collaborateurs des étapes non-self
      const etapesWithCollab = circuitEtapes.filter((e) => e.author_type && e.author_type !== "self" && e.collaborator_id);
      for (const etape of etapesWithCollab) {
        try {
          await apiFetch(`/circuits/${savedCircuitId}/collaborations`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              etape_id: etape.id,
              invited_user_id: etape.collaborator_id,
              invited_user_type: etape.collaborator_type ?? etape.author_type,
              invited_user_name: etape.collaborator_name,
              section: etape.categorie,
            }),
          });
        } catch { /* invite non bloquante */ }
      }
      // Exécuter les kicks différés (après le save du circuit)
      for (const kick of pendingKicks) {
        try {
          await apiFetch(`/circuits/${kick.circuitId}/collaborations/${kick.collabId}/kick`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch { /* kick non bloquant */ }
      }
      setPendingKicks([]);
      if (circuitCoverImg) URL.revokeObjectURL(circuitCoverImg.preview);
      setCircuitModalOpen(false);
    } catch { setCircuitFormError("Erreur lors de la sauvegarde."); }
    finally { setCircuitSaving(false); }
  }

  async function handleNetUnfollow(userId: string) {
    try {
      await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setFollowing((prev) => prev.filter((f) => f.user_id !== userId));
    } catch {}
    setNetMenuId(null);
  }

  async function handleNetBlock(userId: string, isFollowing: boolean) {
    try {
      if (isFollowing) await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await apiFetch(`/eco-traveler/block/${userId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setFollowing((prev) => prev.filter((f) => f.user_id !== userId));
      setFollowers((prev) => prev.filter((f) => f.user_id !== userId));
    } catch {}
    setNetMenuId(null);
  }

  async function handleNetReport() {
    if (!netReport || !netReportReason) return;
    setNetReportSending(true);
    try {
      await apiFetch(`/eco-traveler/report/${netReport.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: netReportReason }),
      });
      setNetReport(null); setNetReportReason("");
    } catch {}
    setNetReportSending(false);
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (!res.ok) throw new Error("Upload échoué");
    const data = await res.json();
    return data.url as string;
  }

  // ── Publish modal ──────────────────────────────────────────────────────────

  function openModal() {
    setModalOpen(true);
  }

  function closeModal() {
    setPublishImages((prev) => { prev.forEach((img) => URL.revokeObjectURL(img.preview)); return []; });
    setPublishCoverIdx(0);
    setModalOpen(false);
    setTitleError(""); setPublishError("");
    setOfferActivity(null); setOfferSubtypes([]); setOfferMode("single");
    setSubtypeDetails({}); setConstraintError("");
    setAvailabilityMode("specific"); setAvailabilityStart(""); setAvailabilityEnd("");
    setAvailableWeekdays([]); setSpecificDates([]); setNewSpecificDate("");
    setAvailHeureDebut(""); setAvailHeureFin("");
    setAvailDelaiReponse("24h"); setAvailMessageAccueil(""); setAvailSaisons([]);
    setOfferConfirmMode("24h"); setOfferDeadlineHours("24"); setOfferDepositPct("30");
    setOfferDescCourte(""); setOfferLangue("");
    setPrixGroupe(""); setNbPersonnesGroupe(""); setPrixEnfant(""); setAgeMaxEnfant("");
    setSuppPrivatisation(""); setAcompteRequis(false); setTypeAcompte("pourcentage"); setValeurAcompte("");
    setCancellationPolicy("moderate"); setCancellationDesc("");
    setOfferNbUnites(1); setUnitDetailsArray([{}]); setActiveUnitTab(0); setSubtypePrices({});
    setSubtypeNbUnites({}); setSubtypeUnitDetails({}); setActiveSubtypeTab({});
    setSubtypeFormConfig({});
    setEntityImages((prev) => { Object.values(prev).flat().forEach((img) => URL.revokeObjectURL(img.preview)); return {}; });
    setEntityCoverIdx({});
    setEntityExistingImages({});
    setForm({ title: "", offer_type: "", description: "", price: "", duration: "", region: "", inclusions: "", meeting_point: "", min_group_size: "", max_group_size: "", min_age: "", cancellation_policy: "" });
    setPublishMapLat(null); setPublishMapLng(null); setShowPublishMap(false);
    setOfferEditMode(false); setOfferEditId(""); setPublishExistingImages([]);
    setOfferTypePrestation(null);
    setProviderOfferCollabs([]);
    setProviderInviteSection(null);
    setOfferPublicCible([]); setProviderServicesInclus([]);
    setOfferLocationDesc("");
    setProviderTransportInclus(null);
    setProviderTransportEcoST(""); setProviderTransportEcoDet({});
    setProviderTransportStdST(""); setProviderTransportStdDet({});
    setProviderRepasFlag(null);
    setProviderRepasMode("prestataire"); setProviderRepasGastroExp(""); setProviderRepasGastroDet({});
    setProviderRepasST(""); setProviderRepasDet({});
    setProviderHebergementInclus(null);
    setProviderHebergementST(""); setProviderHebergementDet({});
    setProviderAutreServiceInclus(null);
    setProviderAutreServiceCat(""); setProviderAutreServiceST(""); setProviderAutreServiceDet({});
    setOfferAvail(EMPTY_OFFER_AVAIL); setOfferConfirmation(EMPTY_CONFIRMATION);
    setProviderCollabConflicts([]); setCheckingProviderCollabConfs(false);
    setOfferStep(1);
  }

  function handleNextProvider() {
    if (offerStep === 1 && !form.title.trim()) { setTitleError("Le titre est obligatoire."); return; }
    setTitleError("");
    if (offerStep < PROVIDER_STEPS.length) {
      setOfferStep((s) => s + 1);
    } else {
      handlePublish();
    }
  }

  async function handlePublish() {
    if (!form.title.trim()) { setTitleError("Le titre est obligatoire."); return; }
    setPublishError(""); setPublishing(true);
    try {
      const isHebergementOffer = offerActivity?.category === 'hebergement';
      const combinedDetails: Record<string, any> = {};

      if (isHebergementOffer && offerSubtypes.length > 0) {
        combinedDetails.subtypes_units = Object.fromEntries(
          offerSubtypes.map((st) => [st, subtypeUnitDetails[st] ?? [{}]])
        );
        if (Object.keys(subtypeFormConfig).length > 0) combinedDetails.subtypes_config = subtypeFormConfig;
        if (Object.keys(subtypePrices).length > 0) combinedDetails.subtypes_pricing = subtypePrices;
      } else {
        Object.values(subtypeDetails).forEach((d) => Object.assign(combinedDetails, d));
      }
      if (offerAvail.type) {
        combinedDetails.disponibilite = offerAvail;
        if (offerAvail.dates?.length) combinedDetails.specific_dates = offerAvail.dates;
        if (offerAvail.days_of_week?.length) combinedDetails.available_weekdays = offerAvail.days_of_week;
      }
      if (form.description.trim()) combinedDetails.description_longue = form.description.trim();
      if (offerTypePrestation) combinedDetails.type_prestation = offerTypePrestation;
      if (offerLocationDesc.trim()) combinedDetails.description_localisation = offerLocationDesc.trim();
      if (providerTransportInclus !== null) combinedDetails.transport_inclus = providerTransportInclus;
      if (providerTransportEcoST) combinedDetails.transport_eco_sous_type = providerTransportEcoST;
      if (Object.keys(providerTransportEcoDet).length) combinedDetails.transport_eco_details = providerTransportEcoDet;
      if (providerTransportStdST) combinedDetails.transport_std_sous_type = providerTransportStdST;
      if (Object.keys(providerTransportStdDet).length) combinedDetails.transport_std_details = providerTransportStdDet;
      if (providerRepasFlag !== null) combinedDetails.repas_flag = providerRepasFlag;
      combinedDetails.repas_mode = providerRepasMode;
      if (providerRepasGastroExp) combinedDetails.repas_gastro_expertise = providerRepasGastroExp;
      if (Object.keys(providerRepasGastroDet).length) combinedDetails.repas_gastro_details = providerRepasGastroDet;
      if (providerRepasST) combinedDetails.repas_prest_sous_type = providerRepasST;
      if (Object.keys(providerRepasDet).length) combinedDetails.repas_prest_details = providerRepasDet;
      if (providerHebergementInclus !== null) combinedDetails.hebergement_inclus = providerHebergementInclus;
      if (providerHebergementST) combinedDetails.hebergement_sous_type = providerHebergementST;
      if (Object.keys(providerHebergementDet).length) combinedDetails.hebergement_details = providerHebergementDet;
      if (providerAutreServiceInclus !== null) combinedDetails.autre_service_inclus = providerAutreServiceInclus;
      if (providerAutreServiceCat) combinedDetails.autre_service_categorie = providerAutreServiceCat;
      if (providerAutreServiceST) combinedDetails.autre_service_sous_type = providerAutreServiceST;
      if (Object.keys(providerAutreServiceDet).length) combinedDetails.autre_service_details = providerAutreServiceDet;
      if (offerPublicCible.length) combinedDetails.public_cible = offerPublicCible;

      const availMode = offerAvail.type === "specific" ? "specific"
        : offerAvail.type === "range" ? "period"
        : offerAvail.type === "recurring" ? "weekly"
        : offerAvail.type === "season" ? "season"
        : "always";

      const polAnn = offerConfirmation.politique_annulation;
      const cancPolicy = polAnn === "Personnalisée"
        ? (offerConfirmation.description_politique || undefined)
        : (polAnn || undefined);

      const payload = {
        _finalize:                   true,
        activity_id:                 offerActivity?.id                         || undefined,
        offer_subtypes:              offerSubtypes.length > 0 ? offerSubtypes  : undefined,
        offer_subtype:               offerSubtypes[0]                          || undefined,
        offer_mode:                  offerSubtypes.length > 1 ? offerMode      : "single",
        availability_mode:           availMode,
        availability_start:          (offerAvail.type === "range" || offerAvail.type === "recurring" || offerAvail.type === "season") ? (offerAvail.start_date ?? undefined) : undefined,
        availability_end:            (offerAvail.type === "range" || offerAvail.type === "recurring" || offerAvail.type === "season") ? (offerAvail.end_date ?? undefined) : undefined,
        confirmation_mode:           offerConfirmation.type_confirmation || undefined,
        details: Object.keys(combinedDetails).length > 0 ? combinedDetails : undefined,
        title:               form.title.trim(),
        offer_type:          form.offer_type || offerActivity?.category || undefined,
        description:         offerDescCourte.trim() || undefined,
        langue_offre:        offerLangue || undefined,
        price:               form.price  ? Number(form.price)  : undefined,
        duration:            form.duration.trim()      || undefined,
        region:              form.region.trim()        || undefined,
        inclusions:          providerServicesInclus.length ? providerServicesInclus.join(", ") : undefined,
        meeting_point:       form.meeting_point.trim() || undefined,
        meeting_lat:         publishMapLat              ?? undefined,
        meeting_lng:         publishMapLng              ?? undefined,
        min_group_size:      form.min_group_size ? Number(form.min_group_size) : undefined,
        max_group_size:      form.max_group_size ? Number(form.max_group_size) : undefined,
        min_age:             form.min_age        ? Number(form.min_age)        : undefined,
        cancellation_policy: cancPolicy,
      };

      let finalOffer: Offer;

      if (offerEditMode && offerEditId) {
        // ── MODE ÉDITION : PATCH sur l'offre existante ──────────────────────
        finalOffer = await apiFetch<Offer>(`/offers/${offerEditId}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else {
        // ── MODE CRÉATION : POST nouvelle offre ─────────────────────────────
        finalOffer = await apiFetch<Offer>("/offers", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ organization_id: org?.id || undefined, ...payload }),
        });
      }

      // ── Images ─────────────────────────────────────────────────────────────
      try {
        // On commence avec les images existantes déjà uploadées (mode édition)
        let mainImages: string[] = [...publishExistingImages];
        const detailsPhotos: Record<string, string[]> = {};

        // Photos générales (offres sans sous-types)
        if (publishImages.length > 0) {
          const urls = await Promise.all(publishImages.map((img) => uploadImage(img.file)));
          const cover = urls[publishCoverIdx] ?? urls[0];
          const newOrdered = [cover, ...urls.filter((u) => u !== cover)];
          mainImages = [...newOrdered, ...mainImages.filter((u) => !newOrdered.includes(u))];
        }
        // Photos par entité : combiner existantes + nouvelles, dans details.photos uniquement
        const allEntityKeys = new Set([...Object.keys(entityExistingImages), ...Object.keys(entityImages)]);
        for (const key of allEntityKeys) {
          const existingUrls = entityExistingImages[key] ?? [];
          const newImgs = entityImages[key] ?? [];
          let newUploaded: string[] = [];
          if (newImgs.length > 0) {
            const urls = await Promise.all(newImgs.map((img) => uploadImage(img.file)));
            const coverI = entityCoverIdx[key] ?? 0;
            const cover = urls[coverI] ?? urls[0];
            newUploaded = [cover, ...urls.filter((u) => u !== cover)];
          }
          const combined = [...existingUrls, ...newUploaded];
          if (combined.length > 0) detailsPhotos[key] = combined;
        }

        const hasPhotos = mainImages.length > 0 || Object.keys(detailsPhotos).length > 0;
        if (hasPhotos) {
          const patchBody: Record<string, any> = {};
          if (mainImages.length > 0) patchBody.images = mainImages;
          if (Object.keys(detailsPhotos).length > 0) {
            patchBody.details = { ...combinedDetails, photos: detailsPhotos };
          }
          const patchedOffer = await apiFetch<Offer>(`/offers/${finalOffer.id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(patchBody),
          });
          const validImgs = patchedOffer.images?.filter((u) => u.startsWith("http")) ?? [];
          finalOffer = { ...patchedOffer, cover_image: patchedOffer.cover_image ?? validImgs[0] ?? null };
        }
      } catch { /* offer saved without images */ }

      // Toujours dériver cover_image depuis images[0] si absent
      const validImgsFinal = finalOffer.images?.filter((u) => u.startsWith("http")) ?? [];
      finalOffer = { ...finalOffer, cover_image: finalOffer.cover_image ?? validImgsFinal[0] ?? null };

      const wasEditMode = offerEditMode;
      const savedId     = finalOffer.id;

      if (wasEditMode) {
        setOffers((prev) => prev.map((o) => o.id === savedId ? finalOffer : o));
      } else {
        setOffers((prev) => [finalOffer, ...prev]);
      }

      closeModal();

      if (!wasEditMode) {
        setOqOfferId(savedId); setOqStep(0); setOqAnswers({}); setOqOpen(true);
      }
    } catch (err: any) {
      setPublishError(err.message || "Erreur lors de la publication.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleProviderInvite(section: CollabSection) {
    let id = offerEditId;
    if (!id) {
      if (!form.title.trim()) { setTitleError("Le titre est obligatoire pour inviter un collaborateur."); return; }
      setProviderCollabSaving(true);
      try {
        const savedOffer = await apiFetch<Offer>("/offers", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            organization_id: org?.id || undefined,
            title: form.title.trim(),
            offer_type: form.offer_type || offerActivity?.category || undefined,
            description: offerDescCourte.trim() || undefined,
            details: offerTypePrestation ? { type_prestation: offerTypePrestation } : undefined,
          }),
        });
        id = savedOffer.id;
        setOfferEditId(id);
        setOfferEditMode(true);
        setOffers((prev) => [savedOffer, ...prev]);
      } catch {
        setProviderCollabSaving(false);
        return;
      }
      setProviderCollabSaving(false);
    }
    setProviderInviteSection(section);
  }

  async function kickProviderCollab(collabId: string) {
    try {
      await apiFetch(`/guide/collaborations/${collabId}/kick`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setProviderOfferCollabs((prev) => prev.filter((c) => c.id !== collabId));
    } catch { /* silent */ }
  }

  // ── Offer detail / edit modal ──────────────────────────────────────────────

  function openEditModal(offer: Offer) {
    setViewOffer(offer);
    setEditOfferId(offer.id);
    setEditForm({
      title:               offer.title,
      offer_type:          offer.offer_type          ?? "",
      description:         offer.description         ?? "",
      price:               offer.price !== null ? String(offer.price) : "",
      duration:            offer.duration            ?? "",
      status:              offer.status,
      region:              offer.region              ?? "",
      inclusions:          offer.inclusions          ?? "",
      meeting_point:       offer.meeting_point       ?? "",
      min_group_size:      offer.min_group_size !== null ? String(offer.min_group_size) : "",
      max_group_size:      offer.max_group_size !== null ? String(offer.max_group_size) : "",
      min_age:             offer.min_age       !== null ? String(offer.min_age)       : "",
      cancellation_policy: offer.cancellation_policy ?? "",
    });
    setEditTitleError(""); setEditError("");
    setEditMode(false);
    setSliderIdx(0);
    setEditModalOpen(true);
    // Fetcher les détails complets en arrière-plan (collaborateurs, données de prestation, etc.)
    if (token) {
      apiFetch<any>(`/guide/offers/${offer.id}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((detail) => {
        setViewOffer((prev) => prev ? { ...prev, details: detail.details ?? (prev as any).details } : prev);
        setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, details: detail.details ?? (o as any).details } : o));
      }).catch(() => {});
    }
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditMode(false);
    setViewOffer(null);
    setEditTitleError(""); setEditError("");
    setShowEditMap(false); setEditMapLat(null); setEditMapLng(null);
  }

  // Ouvre le modal de publication pré-rempli avec les données d'une offre existante
  function openPublishModalForEdit(offer: Offer) {
    closeEditModal();

    const details = (offer.details ?? {}) as Record<string, any>;

    // 1 – Champs de base du formulaire
    setOfferDescCourte(offer.description ?? "");
    setForm({
      title:               offer.title,
      offer_type:          offer.offer_type          ?? "",
      description:         (details.description_longue as string) ?? "",
      price:               offer.price   !== null && offer.price   !== undefined ? String(offer.price)   : "",
      duration:            offer.duration            ?? "",
      region:              offer.region              ?? "",
      inclusions:          offer.inclusions          ?? "",
      meeting_point:       offer.meeting_point       ?? "",
      min_group_size:      offer.min_group_size !== null && offer.min_group_size !== undefined ? String(offer.min_group_size) : "",
      max_group_size:      offer.max_group_size !== null && offer.max_group_size !== undefined ? String(offer.max_group_size) : "",
      min_age:             offer.min_age       !== null && offer.min_age       !== undefined ? String(offer.min_age)       : "",
      cancellation_policy: offer.cancellation_policy ?? "",
    });

    // 2 – Activité liée : on cherche dans orgActivities par activity_id
    if (offer.activity_id) {
      const found = orgActivities.find((a) => a.id === offer.activity_id) ?? null;
      if (found) {
        setOfferActivity(found);
      } else if (offer.offer_type) {
        // Activité non trouvée → activité synthétique minimale pour que les checks de catégorie fonctionnent
        setOfferActivity({
          id: "", provider_id: "", organization_id: "",
          level: "primary", category: offer.offer_type,
          subtypes: null, years_experience: null,
          fields: {}, photos: {}, certifications: [],
        });
      }
    } else if (offer.offer_type) {
      setOfferActivity({
        id: "", provider_id: "", organization_id: "",
        level: "primary", category: offer.offer_type,
        subtypes: null, years_experience: null,
        fields: {}, photos: {}, certifications: [],
      });
    }

    // 3 – Sous-types & mode
    const subtypes = offer.offer_subtypes ?? (offer.offer_subtype ? [offer.offer_subtype] : []);
    setOfferSubtypes(subtypes);
    setOfferMode((offer.offer_mode ?? "single") as "single" | "variant" | "package");

    // 4 – Données par unité (hébergement)
    if (details.subtypes_units) {
      const unitsData = details.subtypes_units as Record<string, Record<string, any>[]>;
      setSubtypeUnitDetails(unitsData);
      setSubtypeNbUnites(
        Object.fromEntries(Object.entries(unitsData).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1]))
      );
    }

    // 5 – Config par sous-type (disponibilité + tarification hébergement)
    if (details.subtypes_config) {
      setSubtypeFormConfig(details.subtypes_config as Record<string, Record<string, any>>);
    }

    // 6 – Tarifs par sous-type
    if (details.subtypes_pricing) {
      setSubtypePrices(
        Object.fromEntries(
          Object.entries(details.subtypes_pricing as Record<string, number>).map(([k, v]) => [k, String(v)])
        )
      );
    }

    // 7 – Champs de sous-type (hors hébergement)
    if (!details.subtypes_units && subtypes.length > 0) {
      const stDetails: Record<string, Record<string, any>> = {};
      const meta = ["specific_dates","available_weekdays","available_saisons","heure_debut","heure_fin","delai_reponse","message_accueil","photos","subtypes_pricing"];
      const fieldData: Record<string, any> = Object.fromEntries(
        Object.entries(details).filter(([k]) => !meta.includes(k))
      );
      subtypes.forEach((st) => { stDetails[st] = fieldData; });
      setSubtypeDetails(stDetails);
    }

    // 8 – Disponibilité
    setAvailabilityMode(offer.availability_mode ?? "specific");
    setAvailabilityStart(offer.availability_start ?? "");
    setAvailabilityEnd(offer.availability_end ?? "");
    setAvailableWeekdays((details.available_weekdays as number[]) ?? []);
    setSpecificDates((details.specific_dates as string[]) ?? []);
    setAvailSaisons((details.available_saisons as string[]) ?? []);
    setAvailHeureDebut((details.heure_debut as string) ?? "");
    setAvailHeureFin((details.heure_fin as string) ?? "");
    setAvailDelaiReponse((details.delai_reponse as string) ?? "24h");
    setAvailMessageAccueil((details.message_accueil as string) ?? "");

    // 9 – Mode de confirmation
    setOfferConfirmMode(offer.confirmation_mode ?? "24h");
    setOfferDeadlineHours(offer.confirmation_deadline_hours != null ? String(offer.confirmation_deadline_hours) : "24");
    setOfferDepositPct(offer.deposit_percentage != null ? String(offer.deposit_percentage) : "30");

    // 11 – Tarification extras (stockés dans details)
    setPrixGroupe(details.prix_par_groupe        ? String(details.prix_par_groupe)        : "");
    setNbPersonnesGroupe(details.nb_personnes_groupe ? String(details.nb_personnes_groupe) : "");
    setPrixEnfant(details.prix_enfant            ? String(details.prix_enfant)            : "");
    setAgeMaxEnfant(details.age_max_enfant       ? String(details.age_max_enfant)         : "");
    setSuppPrivatisation(details.supplement_privatisation ? String(details.supplement_privatisation) : "");
    setAcompteRequis(!!(details.acompte_requis));
    setTypeAcompte((details.type_acompte as string) ?? "pourcentage");
    setValeurAcompte(details.valeur_acompte      ? String(details.valeur_acompte)         : "");

    // 12 – Politique d'annulation
    const policy = offer.cancellation_policy ?? "moderate";
    if (["flexible", "moderate", "strict"].includes(policy)) {
      setCancellationPolicy(policy);
      setCancellationDesc("");
    } else {
      setCancellationPolicy("custom");
      setCancellationDesc(policy);
    }

    // 13 – Carte
    setPublishMapLat(offer.meeting_lat ?? null);
    setPublishMapLng(offer.meeting_lng ?? null);
    setShowPublishMap(!!(offer.meeting_lat && offer.meeting_lng));

    // 14 – Images existantes (déjà uploadées sur Cloudinary)
    const detailsPhotosExisting = (details.photos ?? {}) as Record<string, string[]>;
    // Normaliser les clés hébergement : ancien format 'suite' → 'suite_unit_0'
    const isHeberg = !!(details.subtypes_units);
    const normalizedEntityPhotos: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(detailsPhotosExisting)) {
      if (isHeberg && !k.includes('_unit_')) {
        normalizedEntityPhotos[`${k}_unit_0`] = v;
      } else {
        normalizedEntityPhotos[k] = v;
      }
    }
    const entityPhotoSet = new Set<string>(Object.values(normalizedEntityPhotos).flat());
    // Cover = images de l'offre qui ne sont pas des photos d'entité
    const coverImgs = (offer.images ?? []).filter((url) => url.startsWith("http") && !entityPhotoSet.has(url));
    setPublishExistingImages(coverImgs);
    setEntityExistingImages(normalizedEntityPhotos);
    setPublishImages([]);
    setPublishCoverIdx(0);

    // 15 – Type de prestation
    setOfferTypePrestation((details.type_prestation as string) ?? null);

    // 15a – Localisation description
    setOfferLocationDesc((details.description_localisation as string) ?? "");
    // 15b – Prestation config (étape 5 "Ce que vous fournissez")
    setProviderTransportInclus((details.transport_inclus as boolean | null) ?? null);
    setProviderTransportEcoST((details.transport_eco_sous_type as string) ?? "");
    setProviderTransportEcoDet((details.transport_eco_details as Record<string, any>) ?? {});
    setProviderTransportStdST((details.transport_std_sous_type as string) ?? "");
    setProviderTransportStdDet((details.transport_std_details as Record<string, any>) ?? {});
    setProviderRepasFlag((details.repas_flag as boolean | null) ?? null);
    setProviderRepasMode(((details.repas_mode as string) || "prestataire") as "guide"|"prestataire");
    setProviderRepasGastroExp((details.repas_gastro_expertise as string) ?? "");
    setProviderRepasGastroDet((details.repas_gastro_details as Record<string, any>) ?? {});
    setProviderRepasST((details.repas_prest_sous_type as string) ?? "");
    setProviderRepasDet((details.repas_prest_details as Record<string, any>) ?? {});
    setProviderHebergementInclus((details.hebergement_inclus as boolean | null) ?? null);
    setProviderHebergementST((details.hebergement_sous_type as string) ?? "");
    setProviderHebergementDet((details.hebergement_details as Record<string, any>) ?? {});
    setProviderAutreServiceInclus((details.autre_service_inclus as boolean | null) ?? null);
    setProviderAutreServiceCat((details.autre_service_categorie as string) ?? "");
    setProviderAutreServiceST((details.autre_service_sous_type as string) ?? "");
    setProviderAutreServiceDet((details.autre_service_details as Record<string, any>) ?? {});

    // 15b – Public ciblé
    setOfferPublicCible((details.public_cible as string[]) ?? []);

    // 15c – Services inclus (reconstituer depuis inclusions CSV)
    const rawInclusions: string = (offer as any).inclusions ?? "";
    setProviderServicesInclus(
      rawInclusions ? rawInclusions.split(", ").filter((s: string) => PROVIDER_SERVICES.includes(s)) : []
    );

    // 15d – OfferAvailSlot (reconstituer depuis format legacy)
    const am2 = offer.availability_mode ?? "always";
    const reconAvail: OfferAvailSlot = {
      type: am2 === "specific" ? "specific" : am2 === "period" ? "range" : am2 === "weekly" ? "recurring" : am2 === "season" ? "season" : null,
      dates:       (details.specific_dates as string[]) ?? (details.disponibilite as any)?.dates ?? null,
      start_date:  offer.availability_start ?? null,
      end_date:    offer.availability_end ?? null,
      days_of_week:(details.available_weekdays as string[]) ?? null,
      label: null,
      time_slots:  (details.disponibilite as any)?.time_slots ?? null,
    };
    setOfferAvail(reconAvail.type ? reconAvail : { ...EMPTY_OFFER_AVAIL });

    // 15e – ConfirmationData
    const rawMode = offer.confirmation_mode ?? "";
    const rawPol  = offer.cancellation_policy ?? "";
    const polLabel = rawPol === "flexible" ? "Flexible (100% remboursé jusqu'à 24h avant)"
      : rawPol === "moderate" ? "Modérée (50% remboursé jusqu'à 48h avant)"
      : rawPol === "strict"   ? "Stricte (non remboursable)"
      : rawPol ? "Personnalisée" : "";
    const polDesc = !["flexible","moderate","strict",""].includes(rawPol) ? rawPol : "";
    setOfferConfirmation({
      type_confirmation:   rawMode,
      politique_annulation: polLabel,
      description_politique: polDesc,
      annulation_meteo:    null,
    });

    // 16 – Charger les collaborations existantes en arrière-plan
    apiFetch<any[]>(`/guide/offers/${offer.id}/collaborations`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((list) => {
      setProviderOfferCollabs(
        (list ?? []).filter((c: any) => c.status !== "declined").map((c: any) => ({
          id: c.id,
          userId: c.invited_user_id,
          userName: c.invited_user_name ?? c.invited_user_id,
          userType: c.invited_user_type ?? "provider",
          section: c.section as CollabSection,
          status: c.status,
        }))
      );
    }).catch(() => {});

    // 17 – Activer le mode édition et ouvrir le modal
    setOfferEditMode(true);
    setOfferEditId(offer.id);
    setModalOpen(true);
  }

  async function handleDeleteOffer() {
    const targetId = offerEditId || viewOffer?.id;
    if (!targetId) return;
    const offerTitle = offers.find((o) => o.id === targetId)?.title ?? viewOffer?.title ?? "cette offre";
    if (!confirm(`Supprimer l'offre "${offerTitle}" ? Cette action est irréversible.`)) return;
    setOfferDeleting(true);
    try {
      await apiFetch(`/offers/${targetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers((prev) => prev.filter((o) => o.id !== targetId));
      closeModal();
      closeEditModal();
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setOfferDeleting(false);
    }
  }

  async function handleSaveOffer(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editForm.title.trim()) { setEditTitleError("Le titre est obligatoire."); return; }
    setEditError(""); setEditSaving(true);
    try {
      const updated = await apiFetch<Offer>(`/offers/${editOfferId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:               editForm.title.trim(),
          offer_type:          editForm.offer_type          || undefined,
          description:         editForm.description.trim()  || undefined,
          price:               editForm.price ? Number(editForm.price) : undefined,
          duration:            editForm.duration.trim()      || undefined,
          region:              editForm.region.trim()        || undefined,
          inclusions:          editForm.inclusions.trim()    || undefined,
          meeting_point:       editForm.meeting_point.trim() || undefined,
          min_group_size:      editForm.min_group_size ? Number(editForm.min_group_size) : undefined,
          max_group_size:      editForm.max_group_size ? Number(editForm.max_group_size) : undefined,
          min_age:             editForm.min_age        ? Number(editForm.min_age)        : undefined,
          cancellation_policy: editForm.cancellation_policy.trim() || undefined,
          status:              editForm.status,
          details:             Object.keys(editDetails).length > 0 ? editDetails : undefined,
        }),
      });
      const finalImageSrcs = (await Promise.all(
        editImages.map(async (img) => {
          if (img.file) {
            try { return await uploadImage(img.file); } catch { return null; }
          }
          return img.src.startsWith("http") ? img.src : null;
        })
      )).filter((url): url is string => url !== null);
      const coverSrc = finalImageSrcs[editCoverIdx] ?? finalImageSrcs[0] ?? null;
      const orderedImages = coverSrc
        ? [coverSrc, ...finalImageSrcs.filter((_, i) => i !== (finalImageSrcs.indexOf(coverSrc)))]
        : finalImageSrcs;
      const newCover = orderedImages[0] ?? null;
      await apiFetch<Offer>(`/offers/${editOfferId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ images: orderedImages.length ? orderedImages : [] }),
      }).catch(() => {});
      const finalUpdated: Offer = {
        ...updated,
        images:      finalImageSrcs.length ? finalImageSrcs : null,
        cover_image: newCover,
        details:     Object.keys(editDetails).length > 0 ? editDetails : updated.details,
      };
      setOffers((prev) => prev.map((o) => (o.id === editOfferId ? finalUpdated : o)));
      setViewOffer(finalUpdated);
      setEditMode(false);
    } catch (err: any) {
      setEditError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Offer sustainability questionnaire handlers ────────────────────────────

  async function submitOfferQuestionnaire() {
    const score = Object.values(oqAnswers).reduce((s, v) => s + v, 0);
    setOqSaving(true);
    try {
      const updated = await apiFetch<Offer>(`/offers/${oqOfferId}/sustainability`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score }),
      });
      setOffers((prev) => prev.map((o) => o.id === oqOfferId ? { ...o, sustainability_score: updated.sustainability_score } : o));
      if (viewOffer?.id === oqOfferId) setViewOffer((v) => v ? { ...v, sustainability_score: updated.sustainability_score } : v);
    } catch {}
    finally {
      setOqSaving(false);
    }
  }

  // ── Activity CRUD handlers ────────────────────────────────────────────────

  function openActModal(level: "primary" | "secondary" = "secondary") {
    setActSelCategory(""); setActSelSubtypes([]); setActFieldValues({}); setActYearsExp("");
    setActFormError(""); setActImages([]); setActCoverIdx(0);
    setActModalOpen(true);
  }

  async function handleCreateActivity(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!actSelCategory) { setActFormError("Choisissez un type d'activité."); return; }
    setActFormError(""); setActPublishing(true);
    try {
      const created = await apiFetch<OrgActivity>("/provider-activities", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          organization_id:  org?.id,
          level:            "secondary",
          category:         actSelCategory,
          subtypes:         actSelSubtypes.length > 0 ? actSelSubtypes : undefined,
          years_experience: actYearsExp ? Number(actYearsExp) : undefined,
          fields:           Object.keys(actFieldValues).length > 0 ? actFieldValues : undefined,
        }),
      });
      let finalActivity: OrgActivity = created;
      if (actImages.length > 0) {
        try {
          const urls = await Promise.all(actImages.map((img) => uploadImage(img.file)));
          const coverUrl = urls[actCoverIdx] ?? urls[0];
          const subtypeKey = actSelSubtypes[0] ?? actSelCategory;
          const patchedAct = await apiFetch<OrgActivity>(`/provider-activities/${created.id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ photos: { [subtypeKey]: urls }, photo: coverUrl }),
          });
          finalActivity = patchedAct;
        } catch {}
      }
      setOrgActivities((prev) => [finalActivity, ...prev]);
      setActImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.preview)); return []; });
      setActModalOpen(false);
    } catch (err: any) {
      setActFormError(err.message || "Erreur lors de la création.");
    } finally {
      setActPublishing(false);
    }
  }

  function openActivityDetail(activity: Activity) {
    setViewActivity(activity);
    setActEditForm({ title: activity.title, category: activity.category, level: activity.level, description: activity.description ?? "", region: activity.region ?? "", address: activity.address ?? "", website: activity.website ?? "", phone: activity.phone ?? "" });
    setActEditError(""); setActDetailMode("view");
    const imgs = (activity.photos?.length ? activity.photos : activity.photo ? [activity.photo] : []).filter((s) => s.startsWith("http"));
    setActEditImages(imgs.map((src) => ({ src })));
    setActEditCoverIdx(0);
    setActDetailOpen(true);
  }

  async function handleDeleteActivity() {
    if (!viewActivity) return;
    if (!confirm(`Supprimer l'activité "${viewActivity.title}" ? Cette action est irréversible.`)) return;
    setActDeleting(true);
    try {
      await apiFetch(`/provider-activities/${viewActivity.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setActivities((prev) => prev.filter((a) => a.id !== viewActivity.id));
      setActDetailOpen(false);
    } catch { alert("Erreur lors de la suppression."); }
    finally { setActDeleting(false); }
  }

  async function handleSaveActivity(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!actEditForm.title.trim()) { setActEditError("Le titre est obligatoire."); return; }
    setActEditError(""); setActEditSaving(true);
    try {
      const updated = await apiFetch<Activity>(`/provider-activities/${viewActivity!.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:       actEditForm.title.trim(),
          category:    actEditForm.category    || undefined,
          level:       actEditForm.level,
          description: actEditForm.description.trim() || undefined,
          region:      actEditForm.region.trim()       || undefined,
          address:     actEditForm.address.trim()      || undefined,
          website:     actEditForm.website.trim()      || undefined,
          phone:       actEditForm.phone.trim()        || undefined,
        }),
      });
      const finalImgSrcs = (await Promise.all(
        actEditImages.map(async (img) => {
          if (img.file) { try { return await uploadImage(img.file); } catch { return null; } }
          return img.src.startsWith("http") ? img.src : null;
        })
      )).filter((u): u is string => u !== null);
      const cover = finalImgSrcs[actEditCoverIdx] ?? finalImgSrcs[0] ?? null;
      if (finalImgSrcs.length) {
        await apiFetch(`/provider-activities/${viewActivity!.id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ photos: finalImgSrcs, photo: cover }),
        }).catch(() => {});
      }
      const finalAct: Activity = { ...updated, photos: finalImgSrcs.length ? finalImgSrcs : null, photo: cover };
      setActivities((prev) => prev.map((a) => a.id === viewActivity!.id ? finalAct : a));
      setViewActivity(finalAct);
      setActDetailMode("view");
    } catch (err: any) {
      setActEditError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setActEditSaving(false);
    }
  }

  async function submitActivityQuestionnaire() {
    const score = Object.values(aqAnswers).reduce((s, v) => s + v, 0);
    setAqSaving(true);
    try {
      const updated = await apiFetch<Activity>(`/provider-activities/${aqActId}/sustainability`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score }),
      });
      setActivities((prev) => prev.map((a) => a.id === aqActId ? { ...a, sustainability_score: updated.sustainability_score } : a));
      if (viewActivity?.id === aqActId) setViewActivity((v) => v ? { ...v, sustainability_score: updated.sustainability_score } : v);
    } catch {}
    finally { setAqSaving(false); }
  }

  // ── Activity type detail / edit modal handlers ────────────────────────────

  function openActTypeModal(value: string, level: "primary" | "secondary") {
    const meta = findProviderTypeMeta(value);
    setActTypeCurrent({ value, level });
    setActTypeEditCategory(meta.categoryValue);
    setActTypeEditSubtype(value);
    setActTypeEditDynFields({});
    setActTypeSaveError("");
    setActTypeMode("view");
    setActTypeOpen(true);
  }

  async function saveActivityType() {
    if (!profile || !actTypeCurrent) return;
    setActTypeSaving(true);
    setActTypeSaveError("");
    try {
      const newValue = actTypeEditSubtype || actTypeEditCategory;
      let body: Record<string, any> = {};
      if (actTypeCurrent.level === "primary") {
        body = { activity_types: [newValue] };
      } else {
        const orig = actTypeCurrent.value;
        const updated = (profile.secondary_activity_types ?? []).map((v) => v === orig ? newValue : v);
        body = { secondary_activity_types: updated };
      }
      const updated = await apiFetch<ProviderProfile>("/providers/me", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setProfile(updated);
      setActTypeOpen(false);
    } catch (e: any) {
      setActTypeSaveError(e.message ?? "Erreur lors de la sauvegarde.");
    } finally {
      setActTypeSaving(false);
    }
  }

  // ── Edit profile modal ─────────────────────────────────────────────────────

  function openEditProfile() {
    if (!profile) return;
    setEditProfileForm({
      full_name:        profile.full_name        ?? "",
      bio:              profile.bio              ?? "",
      country:          profile.country          ?? "",
      language:         profile.language         ?? "",
      organization:     profile.organization     ?? "",
      position:         profile.position         ?? "",
      phone:            profile.phone            ?? "",
      provider_type:    profile.provider_type    ?? "",
      region:           profile.region           ?? "",
      website:          profile.website          ?? "",
      years_experience: profile.years_experience !== null ? String(profile.years_experience) : "",
    });
    setEditProfileActivities(profile.activity_types           ?? []);
    setEditProfileSecActivities(profile.secondary_activity_types ?? []);
    setEditProfilePhoto(profile.photo       ? { preview: profile.photo }       : null);
    setEditProfileCover(profile.cover_photo ? { preview: profile.cover_photo } : null);
    setEditProfileError("");
    setEditProfileOpen(true);
  }

  function closeEditProfile() {
    setEditProfileOpen(false);
    setEditProfileError("");
  }

  async function handleSaveProfile(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editProfileForm.full_name.trim()) {
      setEditProfileError("Le nom complet est obligatoire.");
      return;
    }
    setEditProfileError(""); setEditProfileSaving(true);
    try {
      let photoUrl: string | undefined = profile?.photo ?? undefined;
      let coverUrl: string | undefined = profile?.cover_photo ?? undefined;

      if (editProfilePhoto?.file) photoUrl = await uploadImage(editProfilePhoto.file);
      else if (editProfilePhoto === null) photoUrl = undefined;

      if (editProfileCover?.file) coverUrl = await uploadImage(editProfileCover.file);
      else if (editProfileCover === null) coverUrl = undefined;

      const updated = await apiFetch<ProviderProfile>("/providers/me", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name:                 editProfileForm.full_name.trim(),
          bio:                       editProfileForm.bio.trim()          || undefined,
          country:                   editProfileForm.country             || undefined,
          language:                  editProfileForm.language            || undefined,
          photo:                     photoUrl,
          cover_photo:               coverUrl,
          organization:              editProfileForm.organization.trim() || undefined,
          position:                  editProfileForm.position.trim()     || undefined,
          phone:                     editProfileForm.phone.trim()        || undefined,
          provider_type:             editProfileForm.provider_type       || undefined,
          region:                    editProfileForm.region.trim()       || undefined,
          website:                   editProfileForm.website.trim()      || undefined,
          years_experience:          editProfileForm.years_experience ? Number(editProfileForm.years_experience) : undefined,
          activity_types:            editProfileActivities.length ? editProfileActivities : undefined,
          secondary_activity_types:  editProfileSecActivities.length ? editProfileSecActivities : undefined,
        }),
      });
      setProfile((prev) => prev ? { ...prev, ...updated } : prev);
      setEditProfileOpen(false);
    } catch (err: any) {
      setEditProfileError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setEditProfileSaving(false);
    }
  }

  // ─── Loading / empty states ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!profile) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Org logo > provider photo > placeholder
  const AvatarImg = ({ cls = "" }: { cls?: string }) => {
    const src = org?.logo ?? profile.photo;
    return src ? (
      <img src={src} alt="" className={`w-full h-full object-cover ${cls}`} />
    ) : (
      <span className="material-symbols-outlined text-primary text-5xl">store</span>
    );
  };

  function openDoc(url: string) {
    if (url.startsWith("data:")) {
      const w = window.open("", "_blank");
      if (w) w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body></html>`);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function socialHref(platform: string, value: string): string {
    if (value.startsWith("http")) return value;
    const handle = value.startsWith("@") ? value.slice(1) : value;
    if (platform === "instagram") return `https://www.instagram.com/${handle}`;
    if (platform === "facebook") return `https://www.facebook.com/${handle}`;
    if (platform === "tiktok") return `https://www.tiktok.com/@${handle}`;
    return value;
  }

  const scoreLabel = (score: number | null) => {
    if (score === null) return "Prestataire";
    if (score >= 80) return "Éco-Leader";
    if (score >= 60) return "Prestataire Engagé";
    if (score >= 40) return "Prestataire Sensible";
    return "Prestataire en Développement";
  };

  const roleLabel =
    profile.organization ??
    profile.position ??
    scoreLabel(profile.sustainability_score);

  // ── Activity card (style projet) ──────────────────────────────────────────
  const ActivityCard = ({ value, level }: { value: string; level: "primary" | "secondary" }) => {
    const meta = findProviderTypeMeta(value);
    const isPrimary = level === "primary";

    return (
      <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
        {/* Cover gradient */}
        <div className="relative h-48 w-full overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
          <div className="absolute inset-0 flex items-center justify-center select-none opacity-20">
            <span className="material-symbols-outlined" style={{ fontSize: 80 }}>{meta.categoryIcon}</span>
          </div>
          {/* Level badge */}
          <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-md border ${isPrimary ? "bg-primary text-white border-white/20" : "bg-white/95 text-orange-500 border-orange-100"}`}>
            {isPrimary ? "Principale" : "Secondaire"}
          </div>
          {/* Category badge */}
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
            <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-1 leading-tight">{meta.label}</h3>
          {profile?.bio && (
            <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{profile.bio}</p>
          )}
          {profile?.region && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-3">
              <MapPin size={12} /><span>{profile.region}</span>
            </div>
          )}
          {profile?.sustainability_score !== null && profile?.sustainability_score !== undefined ? (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Durabilité</span>
                <span className="text-[10px] font-black text-primary">{profile.sustainability_score}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${profile.sustainability_score}%` }} />
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-primary/40 rounded-xl py-1.5 px-3 mb-3 text-center text-[11px] font-bold text-primary/70">
              🌿 Évaluer la durabilité
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
            <p className="text-[11px] font-bold text-slate-400">
              {isPrimary ? "Activité principale" : "Activité secondaire"}
            </p>
            <button
              onClick={() => openActTypeModal(value, level)}
              className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200"
            >
              <span>Voir les détails</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <PubInteractions
          pubId={`activity-${value}-${profile?.user_id ?? ""}`}
          token={token}
          viewerId={profile?.user_id ?? ""}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${profile?.user_id}`}
          pubTitle={meta.label}
          itemApiBase="/interactions/activity"
          commentApiBase="/interactions"
        />
      </div>
    );
  };

  // ── Launch activity CTA ────────────────────────────────────────────────────
  const LaunchActivityCard = () => (
    <div
      onClick={() => setEditProfileOpen(true)}
      className="bg-white rounded-3xl border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center p-10 text-center min-h-[200px]"
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 hover:scale-110 transition-transform">
        <Plus size={22} className="text-primary" strokeWidth={2.5} />
      </div>
      <p className="font-extrabold text-slate-700 text-base mb-1">Ajouter une activité ?</p>
      <p className="text-slate-400 text-sm leading-relaxed mb-4">Gérez vos activités principale et secondaires dans votre profil.</p>
      <span className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-50 bg-white">
        Nouvelle activité
      </span>
    </div>
  );

  // ── Offer card ─────────────────────────────────────────────────────────────
  const OfferCard = ({ offer }: { offer: Offer }) => {
    const typeData    = OFFER_TYPES.find((t) => t.value === offer.offer_type) ?? OFFER_TYPES[OFFER_TYPES.length - 1];
    const statusLabel = offer.status === "approved" ? "Active" : offer.status === "pending" ? "En attente" : offer.status === "draft" ? "Brouillon" : offer.status === "attente_publication" ? "Prêt à publier" : "Refusée";
    const statusClass = offer.status === "approved" ? "bg-primary text-white border-white/20" : offer.status === "pending" ? "bg-amber-500 text-white border-white/20" : offer.status === "draft" ? "bg-slate-400 text-white border-white/20" : offer.status === "attente_publication" ? "bg-teal-600 text-white border-white/20" : "bg-red-500 text-white border-white/20";

    return (
      <div id={`offer-${offer.id}`} className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 ${highlightOfferId === offer.id ? "border-primary ring-2 ring-primary/30 shadow-primary/20" : "border-slate-100/90"}`}>
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-2/5 relative min-h-[200px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
            {offer.cover_image ? (
              <img src={offer.cover_image} alt={offer.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <div className={`absolute inset-0 bg-gradient-to-br ${typeData.gradient} opacity-90`} />
                <span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 100 }}>{typeData.icon}</span>
              </>
            )}
            <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border ${statusClass}`}>
              {statusLabel}
            </div>
            {offer.price !== null && (
              <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl shadow border border-slate-100 text-right">
                <span className="text-primary font-extrabold text-lg tracking-tight">{offer.price} DT</span>
                {offer.duration && <span className="text-slate-400 text-[10px] font-bold block leading-none">/{offer.duration}j</span>}
              </div>
            )}
          </div>

          <div className="lg:w-3/5 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight leading-tight">{offer.title}</h3>
                {offer.price !== null && (
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xl font-extrabold text-primary tracking-tight">
                      {offer.price} DT<span className="text-slate-400 font-bold text-xs">/{offer.duration ? `${offer.duration}j` : "pers"}</span>
                    </p>
                  </div>
                )}
              </div>
              {offer.description && (
                <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">{offer.description}</p>
              )}
              <div className="flex flex-wrap gap-2.5 mb-5">
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-xl px-3 py-1 text-[11px] font-extrabold tracking-wider flex items-center gap-1 uppercase">
                  <Sparkles size={11} className="text-emerald-500 shrink-0" />{typeData.label}
                </span>
              </div>
            </div>
            {offer.sustainability_score !== null ? (
              <div className="mt-3 mb-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Durabilité</span>
                  <span className="text-[10px] font-black text-primary">{offer.sustainability_score}/100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${offer.sustainability_score}%` }} />
                </div>
                <span className={`mt-1 inline-block text-[10px] font-bold ${getOfferSustainabilityLevel(offer.sustainability_score).color}`}>
                  {getOfferSustainabilityLevel(offer.sustainability_score).emoji} {getOfferSustainabilityLevel(offer.sustainability_score).label}
                </span>
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setOqOfferId(offer.id); setOqStep(0); setOqAnswers({}); setOqOpen(true); }}
                className="mt-3 w-full border border-dashed border-primary/40 text-primary text-[11px] font-bold py-1.5 rounded-xl hover:bg-primary/5 transition-colors"
              >
                🌿 Évaluer la durabilité
              </button>
            )}
            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3 gap-2 flex-wrap">
              <p className="text-[11px] font-bold text-slate-400">
                {new Date(offer.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <button
                onClick={() => openEditModal(offer)}
                className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200"
              >
                <span>Voir les détails</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        {offer.status === "approved" && (
          <PubInteractions
            pubId={offer.id}
            token={token}
            viewerId={profile?.user_id ?? ""}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${profile?.user_id}?offer=${offer.id}`}
            pubTitle={offer.title}
            itemApiBase="/interactions/offer"
            commentApiBase="/interactions"
          />
        )}
        {offer.status === "attente_publication" && (
          <div className="border-t border-primary/20 bg-primary/5 px-6 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">pending_actions</span>
            <p className="text-emerald-700 text-xs font-bold flex-1">Tous les collaborateurs ont complété leur partie. Vérifiez l&apos;offre et confirmez la publication.</p>
            <button
              onClick={async () => {
                setPublishOfferLoading(true);
                setPublishOfferModal({ offer, detail: null });
                try {
                  const detail = await apiFetch<OfferFull>(`/offers/${offer.id}`, { headers: { Authorization: `Bearer ${token}` } });
                  setPublishOfferModal({ offer, detail });
                } catch {
                  setPublishOfferModal({ offer, detail: null });
                } finally {
                  setPublishOfferLoading(false);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-slate-900 text-xs font-extrabold hover:bg-primary/90 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Voir et confirmer
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    {/* ══ MODAL CONFIRMATION PUBLICATION OFFRE ═════════════════════════════ */}
    {publishOfferModal && (
      <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-3xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
          <button onClick={() => setPublishOfferModal(null)}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>
          <div className="flex-1 overflow-y-auto">
            {publishOfferLoading || !publishOfferModal.detail ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                {publishOfferLoading ? (
                  <>
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Chargement de l&apos;offre complète…</p>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">Impossible de charger les détails de l&apos;offre.</p>
                )}
              </div>
            ) : (
              <OfferDetailView offer={publishOfferModal.detail} />
            )}
          </div>
          <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4 flex items-center gap-3">
            <button onClick={() => setPublishOfferModal(null)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:border-slate-300 transition-all">
              Annuler
            </button>
            <button
              disabled={publishOfferSaving || !publishOfferModal.detail}
              onClick={async () => {
                setPublishOfferSaving(true);
                try {
                  await apiFetch(`/offers/${publishOfferModal.offer.id}/publish`, {
                    method: "POST", headers: { Authorization: `Bearer ${token}` },
                  });
                  setOffers((prev) => prev.map((o) => o.id === publishOfferModal!.offer.id ? { ...o, status: "approved" } : o));
                  setPublishOfferModal(null);
                } catch {
                  alert("Erreur lors de la publication. Veuillez réessayer.");
                } finally {
                  setPublishOfferSaving(false);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-slate-900 font-extrabold text-sm hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {publishOfferSaving ? (
                <><div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />Publication en cours…</>
              ) : (
                <><span className="material-symbols-outlined text-base">rocket_launch</span>Confirmer la publication</>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══ ACTIVITY CREATE MODAL ════════════════════════════════════════════ */}
    {actModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
          <button onClick={() => setActModalOpen(false)} className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"><X size={16} /></button>
          <div className="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center"><span className="material-symbols-outlined text-orange-500 text-xl">add_circle</span></div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Nouvelle activité secondaire</h3>
                <p className="text-slate-400 text-xs mt-0.5">Activité complémentaire à votre offre principale</p>
              </div>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            <form id="act-create-form" onSubmit={handleCreateActivity} className="px-8 py-6 space-y-6">

              {/* ── Catégorie ── */}
              <div>
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Catégorie *</label>
                <div className="grid grid-cols-3 gap-2">
                  {PROVIDER_SCHEMA.map((cat) => {
                    const active = actSelCategory === cat.value;
                    return (
                      <button key={cat.value} type="button"
                        onClick={() => { setActSelCategory(active ? "" : cat.value); setActSelSubtypes([]); setActFieldValues({}); setActFormError(""); }}
                        className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-white"}`}>
                        <span className={`material-symbols-outlined text-xl ${active ? "text-primary" : "text-slate-400"}`}>{cat.icon}</span>
                        <span className="text-[10px] font-extrabold leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Sous-types ── */}
              {actSelCategory && (() => {
                const cat = PROVIDER_SCHEMA.find((c) => c.value === actSelCategory);
                if (!cat || !cat.subtypes.length) return null;
                return (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Sous-types</label>
                    <div className="flex flex-wrap gap-2">
                      {cat.subtypes.map((st) => {
                        const sel = actSelSubtypes.includes(st.value);
                        return (
                          <button key={st.value} type="button"
                            onClick={() => {
                              setActSelSubtypes((prev) => sel ? prev.filter((v) => v !== st.value) : [...prev, st.value]);
                              if (sel) setActFieldValues((prev) => { const n = { ...prev }; delete n[st.value]; return n; });
                            }}
                            className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-extrabold transition-all cursor-pointer ${sel ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* ── Champs par sous-type (SUBTYPE_FIELDS) ── */}
              {actSelSubtypes.map((stVal) => {
                const config = SUBTYPE_FIELDS[stVal];
                if (!config) return null;
                return (
                  <div key={stVal} className="rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
                      <p className="text-[11px] font-black tracking-widest text-slate-500 uppercase">{config.label}</p>
                    </div>
                    <div className="p-4 space-y-4">
                      {config.sections.map((sec, si) => {
                        const visibleFields = sec.fields.filter((f) => {
                          if (!f.dependsOn) return true;
                          return actFieldValues[stVal]?.[f.dependsOn.field] === f.dependsOn.value;
                        });
                        if (!visibleFields.length) return null;
                        return (
                          <div key={si}>
                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">{sec.section}</p>
                            <div className="space-y-3">
                              {visibleFields.map((field) => {
                                const val = actFieldValues[stVal]?.[field.key];
                                const setVal = (v: any) => setActFieldValues((prev) => ({ ...prev, [stVal]: { ...(prev[stVal] ?? {}), [field.key]: v } }));
                                if (field.type === "boolean") return (
                                  <div key={field.key} className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-700">{field.label}</span>
                                    <button type="button" onClick={() => setVal(!val)}
                                      className={`w-10 h-5 rounded-full transition-colors ${val ? "bg-primary" : "bg-slate-200"}`}>
                                      <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${val ? "translate-x-2.5" : "-translate-x-2.5"}`} />
                                    </button>
                                  </div>
                                );
                                if (field.type === "multiselect") return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">{field.label}</label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(field.options ?? []).map((opt) => {
                                        const chosen = Array.isArray(val) && val.includes(opt);
                                        return (
                                          <button key={opt} type="button"
                                            onClick={() => setVal(chosen ? (val as string[]).filter((v: string) => v !== opt) : [...(val as string[] ?? []), opt])}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all ${chosen ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                                if (field.type === "select") return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">{field.label}</label>
                                    <select value={val ?? ""} onChange={(e) => setVal(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                      <option value="">— Sélectionner —</option>
                                      {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  </div>
                                );
                                if (field.type === "number") return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">{field.label}</label>
                                    <input type="number" min="0" value={val ?? ""} onChange={(e) => setVal(e.target.value ? Number(e.target.value) : undefined)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                );
                                if (field.type === "textarea") return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">{field.label}</label>
                                    <textarea rows={3} value={val ?? ""} onChange={(e) => setVal(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                                  </div>
                                );
                                return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">{field.label}</label>
                                    <input type={field.type === "url" ? "url" : "text"} value={val ?? ""} onChange={(e) => setVal(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Années d'expérience ── */}
              {actSelCategory && (
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Années d'expérience</label>
                  <input type="number" min="0" max="50" placeholder="Ex : 3"
                    value={actYearsExp} onChange={(e) => setActYearsExp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}

              {/* ── Photos ── */}
              {actSelCategory && (
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos</label>
                  {actImages.length === 0 ? (
                    <label htmlFor="act-create-images" className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                      <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                      <p className="text-xs font-semibold text-slate-400">Ajouter des photos</p>
                      <input id="act-create-images" type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => { const files = Array.from(e.target.files ?? []); setActImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]); e.target.value = ""; }}
                      />
                    </label>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {actImages.map((img, i) => (
                        <div key={i} onClick={() => setActCoverIdx(i)} className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${i === actCoverIdx ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                          <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          {i === actCoverIdx && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">Cover</div>}
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); URL.revokeObjectURL(img.preview); setActImages((prev) => prev.filter((_, idx) => idx !== i)); setActCoverIdx((c) => c >= i && c > 0 ? c - 1 : c); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                        </div>
                      ))}
                      <label htmlFor="act-create-images" className="flex items-center justify-center aspect-square border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/50 bg-slate-50/70">
                        <span className="material-symbols-outlined text-slate-300 text-2xl">add</span>
                        <input id="act-create-images" type="file" accept="image/*" multiple className="hidden"
                          onChange={(e) => { const files = Array.from(e.target.files ?? []); setActImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]); e.target.value = ""; }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {actFormError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <span className="material-symbols-outlined text-red-500 text-base">error</span>
                  <p className="text-sm font-semibold text-red-600">{actFormError}</p>
                </div>
              )}
            </form>
          </div>
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={() => setActModalOpen(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">Annuler</button>
            <button type="submit" form="act-create-form" disabled={actPublishing} className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer">
              {actPublishing ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Création…</> : <><Send size={14} />Ajouter l'activité</>}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══ CIRCUIT MODAL ════════════════════════════════════════════════════ */}
    {/* ── Modal Détails Circuit ── */}
    {viewingCircuit && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setViewingCircuit(null)}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

          {/* Header with cover */}
          <div className="relative shrink-0">
            {viewingCircuit.cover_image
              ? <img src={viewingCircuit.cover_image} alt="" className="w-full h-40 object-cover" />
              : <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center"><Route size={40} className="text-primary/30" /></div>
            }
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
              <h3 className="text-xl font-extrabold text-white leading-tight">{viewingCircuit.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[11px] font-black text-white/90">
                  <Calendar size={11} />{viewingCircuit.nb_jours} jour{viewingCircuit.nb_jours > 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-black text-white/90">
                  <MapPin size={11} />{viewingCircuit.etapes.length} étape{viewingCircuit.etapes.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <button onClick={() => setViewingCircuit(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer">
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Description */}
            {viewingCircuit.description && (
              <div>
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Description</p>
                <p className="text-sm text-slate-600 leading-relaxed">{viewingCircuit.description}</p>
              </div>
            )}

            {/* Disponibilité */}
            {viewingCircuit.availability && (() => {
              const avSlot = oldAvailToOfferSlot(viewingCircuit.availability);
              if (!avSlot.type) return null;
              const FR_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
              const typeLabel = avSlot.type === 'specific' ? 'Dates spécifiques' : avSlot.type === 'range' ? 'Plage de dates' : avSlot.type === 'recurring' ? 'Récurrence hebdomadaire' : avSlot.type === 'season' ? 'Saison complète' : avSlot.type;
              const firstTs = avSlot.time_slots ? (Object.values(avSlot.time_slots)[0]?.[0] ?? null) : null;
              return (
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Disponibilité</p>
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-primary shrink-0" />
                      <span className="text-sm font-semibold text-slate-700">{typeLabel}</span>
                    </div>
                    {avSlot.type === 'specific' && (avSlot.dates?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {avSlot.dates!.map((d) => (
                          <span key={d} className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">
                            <Calendar size={9} />{new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        ))}
                      </div>
                    )}
                    {avSlot.type === 'range' && (avSlot.start_date || avSlot.end_date) && (
                      <div className="pl-5 space-y-1">
                        <p className="text-xs text-slate-600 font-semibold">{avSlot.start_date}{avSlot.start_date && avSlot.end_date ? ' → ' : ''}{avSlot.end_date}</p>
                        {(avSlot.days_of_week?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {avSlot.days_of_week!.map((d) => (
                              <span key={d} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{FR_DAYS[Number(d)] ?? d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {avSlot.type === 'recurring' && (avSlot.days_of_week?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {avSlot.days_of_week!.map((d) => (
                          <span key={d} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{FR_DAYS[Number(d)] ?? d}</span>
                        ))}
                      </div>
                    )}
                    {avSlot.type === 'season' && avSlot.label && (
                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {avSlot.label.split(', ').map((s) => (
                          <span key={s} className="text-[11px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-lg">{s}</span>
                        ))}
                      </div>
                    )}
                    {firstTs && (
                      <div className="flex items-center gap-2 pl-5">
                        <Clock size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-500">{firstTs.start} – {firstTs.end}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Hébergement */}
            {viewingCircuit.hebergement && (
              <div>
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Hébergement</p>
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  {!viewingCircuit.hebergement.inclus ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="material-symbols-outlined text-[16px]">hotel_class</span>Non inclus
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <span className="material-symbols-outlined text-[16px] text-primary">hotel</span>
                        {viewingCircuit.hebergement.type === "same" ? "Même hébergement sur tout le circuit" : "Hébergement variable par jour (voir programme)"}
                      </div>
                      {viewingCircuit.hebergement.type === "same" && viewingCircuit.hebergement.etape && (() => {
                        const hb = viewingCircuit.hebergement!.etape!;
                        const hbCat = PROVIDER_SCHEMA.find((c) => c.value === "hebergement");
                        // Lire depuis contribution prestataire en priorité
                        const hbContrib = hb.collab_contribution as Record<string, any> | null | undefined;
                        const collabTitre = hbContrib?.titre ?? hb.titre;
                        const collabDest = hbContrib?.collab_destination ?? hb.collab_destination ?? hb.destination;
                        const collabDescCourte = hbContrib?.description_courte ?? hb.description_courte;
                        const collabDescLongue = hbContrib?.description_longue ?? hb.description_longue;
                        return (
                          <div className="space-y-3 pt-1">
                            {/* Titre + localisation */}
                            <div>
                              {collabTitre && <p className="text-sm font-extrabold text-slate-800">{collabTitre}</p>}
                              {collabDest && (
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                  <MapPin size={10} />{collabDest}
                                </div>
                              )}
                            </div>
                            {/* Descriptions */}
                            {collabDescCourte && <p className="text-xs text-slate-600">{collabDescCourte}</p>}
                            {collabDescLongue && <p className="text-xs text-slate-500">{collabDescLongue}</p>}
                            {/* Sous-types avec photos + tarifs + détails par unité */}
                            {hb.subtypes.length > 0 && (
                              <div className="space-y-3">
                                {hb.subtypes.map((sv) => {
                                  const stLabel = hbCat?.subtypes.find((s) => s.value === sv)?.label ?? sv;
                                  const fieldConfig = OFFER_DETAIL_FIELDS[sv];
                                  // Lire la contribution HebergBlock du prestataire (format hb_${sv})
                                  const collabContrib = hb.collab_contribution as Record<string, any> | null | undefined;
                                  const svHeberg = collabContrib?.[`hb_${sv}`] as { nb_unites?: number; units?: Array<Record<string, any>>; global_pricing?: Record<string, any> } | undefined;
                                  // nb_unites et tarif : contribution prestataire, puis données guide
                                  const nbU = svHeberg?.nb_unites ?? hb.nb_unites?.[sv] ?? 1;
                                  const gp = svHeberg?.global_pricing ?? {};
                                  const hasPrice = gp.prix_groupe || gp.prix_enfant || gp.supp_priv;

                                  const renderFieldRows = (data: Record<string, any>) => {
                                    if (!fieldConfig || Object.keys(data).length === 0) return null;
                                    const rows: { label: string; display: string }[] = [];
                                    fieldConfig.sections.forEach((sec) => {
                                      sec.fields.forEach((f) => {
                                        const v = data[f.key];
                                        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return;
                                        if (f.type === 'boolean') { rows.push({ label: f.label, display: v ? 'Oui' : 'Non' }); return; }
                                        if (Array.isArray(v)) { rows.push({ label: f.label, display: v.join(', ') }); return; }
                                        rows.push({ label: f.label, display: String(v) });
                                      });
                                    });
                                    if (rows.length === 0) return null;
                                    return (
                                      <div className="space-y-1 pt-1 border-t border-slate-100">
                                        {rows.map((r) => (
                                          <div key={r.label} className="flex items-start gap-2">
                                            <span className="text-[10px] text-slate-400 font-semibold shrink-0 min-w-[100px]">{r.label}</span>
                                            <span className="text-[10px] text-slate-700 font-bold">{r.display}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  };

                                  return (
                                    <div key={sv} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                                      {/* Header */}
                                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                                        <span className="text-[11px] font-extrabold text-slate-700">{stLabel}</span>
                                        <span className="text-[10px] font-bold text-slate-500">{nbU} unité{nbU > 1 ? 's' : ''}</span>
                                      </div>
                                      {/* Tarification issue de la contribution prestataire */}
                                      {hasPrice && (
                                        <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-slate-50">
                                          {gp.prix_groupe && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">{gp.prix_groupe} DT{gp.nb_pers_groupe ? ` / ${gp.nb_pers_groupe} pers.` : ''}</span>}
                                          {gp.prix_enfant && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">{gp.prix_enfant} DT enfant{gp.age_max_enfant ? ` (≤${gp.age_max_enfant} ans)` : ''}</span>}
                                          {gp.supp_priv && <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">+{gp.supp_priv} DT privatisation</span>}
                                        </div>
                                      )}
                                      {/* Détails par unité — depuis HebergBlock (units[i]) */}
                                      <div className="divide-y divide-slate-50">
                                        {Array.from({ length: nbU }, (_, i) => {
                                          const svUnit = svHeberg?.units?.[i] ?? {};
                                          const unitPhotos: string[] = Array.isArray(svUnit.photos) ? svUnit.photos : (hb.entity_photos?.[`${sv}_unit_${i}`] ?? (i === 0 ? (hb.entity_photos?.[sv] ?? []) : []));
                                          const unitData: Record<string, any> = Object.keys(svUnit).length > 0
                                            ? svUnit
                                            : ((hb.unit_details as Record<string, Array<Record<string, any>>>)?.[sv]?.[i] ?? {});
                                          const unitName = unitData?.nom_chambre ?? unitData?.nom_suite ?? unitData?.nom_tente ?? unitData?.nom_bungalow;
                                          return (
                                            <div key={i} className="p-3 space-y-2">
                                              {nbU > 1 && (
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{unitName || `Unité ${i + 1}`}</p>
                                              )}
                                              {unitPhotos.length > 0 && (
                                                <div className="flex gap-1.5 overflow-x-auto">
                                                  {unitPhotos.slice(0, 5).map((url, pi) => (
                                                    <img key={pi} src={url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                                                  ))}
                                                </div>
                                              )}
                                              {renderFieldRows(unitData) ?? (
                                                <p className="text-[10px] text-slate-300 italic">Aucun détail renseigné.</p>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Étapes par jour */}
            <div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Programme jour par jour</p>
              {viewingCircuit.etapes.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Aucune étape configurée.</p>
              ) : (
                <div className="space-y-4">
                  {Array.from({ length: viewingCircuit.nb_jours }, (_, i) => i + 1).map((jour) => {
                    const etapesJour = viewingCircuit.etapes.filter((e) => e.jour === jour).sort((a, b) => {
                      const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                      return toMin(a.heure_debut || '00:00') - toMin(b.heure_debut || '00:00');
                    });
                    return (
                      <div key={jour} className="border border-slate-100 rounded-2xl overflow-hidden">
                        {/* Jour header */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">{jour}</div>
                          <p className="text-xs font-extrabold text-slate-700">Jour {jour}</p>
                          <span className="ml-auto text-[10px] text-slate-400 font-semibold">{etapesJour.length} activité{etapesJour.length > 1 ? 's' : ''}</span>
                        </div>
                        {etapesJour.length === 0 ? (
                          <p className="text-[11px] text-slate-300 italic px-4 py-3">Aucune activité ce jour.</p>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {etapesJour.map((etape) => {
                              const cat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
                              const allPhotos = Object.values(etape.entity_photos ?? {}).flat();
                              const coverPhoto = allPhotos[0] ?? etape.photos?.[0];
                              return (
                                <div key={etape.id} className="p-4 space-y-3">
                                  {/* Top row: categorie + badge collab + horaires */}
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{cat?.label ?? DOMAINES[etape.categorie as string]?.label ?? etape.categorie}</span>
                                    <div className="flex items-center gap-2">
                                      {etape.collaborator_id && etape.collaborator_name && (() => {
                                        const st = viewingCircuitCollabsMap[etape.id] ?? "pending";
                                        const cls = st === "declined" ? "bg-red-50 border-red-200 text-red-600"
                                          : st === "pending" ? "bg-amber-50 border-amber-200 text-amber-600"
                                          : "bg-teal-50 border-teal-200 text-teal-700";
                                        const icon = st === "declined" ? "cancel" : st === "pending" ? "schedule" : "check_circle";
                                        const statusLabel = st === "declined" ? "Refusé" : st === "pending" ? "En attente" : null;
                                        return (
                                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
                                            <span className="material-symbols-outlined text-[11px]">{icon}</span>
                                            {statusLabel ? `${etape.collaborator_name} · ${statusLabel}` : etape.collaborator_name}
                                          </span>
                                        );
                                      })()}
                                      {etape.heure_debut && etape.heure_fin && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">
                                          <Clock size={9} />{etape.heure_debut} – {etape.heure_fin}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Photo + titre + localisation */}
                                  <div className="flex gap-3">
                                    {coverPhoto && (
                                      <img src={coverPhoto} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-extrabold text-slate-800 leading-tight">{etape.titre || etape.destination}</p>
                                      {etape.destination && etape.titre && (
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                          <MapPin size={9} />{etape.destination}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Descriptions */}
                                  {etape.description_courte && (
                                    <p className="text-xs text-slate-600 leading-relaxed">{etape.description_courte}</p>
                                  )}
                                  {etape.description_longue && (
                                    <p className="text-xs text-slate-500 leading-relaxed">{etape.description_longue}</p>
                                  )}

                                  {/* Données de contribution du collaborateur */}
                                  {(etape as any).collab_contribution && (() => {
                                    const cd = (etape as any).collab_contribution as Record<string, any>;
                                    const displayEntries = Object.entries(cd).filter(([k, v]) => !k.startsWith('collab_') && v && String(v).trim());
                                    if (displayEntries.length === 0) return null;
                                    return (
                                      <div className="mt-2 p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1">
                                        <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Contribution</p>
                                        {displayEntries.map(([k, v]) => (
                                          <div key={k} className="text-[11px]">
                                            <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")} : </span>
                                            <span className="text-slate-700 font-semibold">{String(v)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}

                                  {/* Sous-types avec leurs détails */}
                                  {etape.subtypes.length > 0 && (
                                    <div className="space-y-2">
                                      {etape.subtypes.map((sv) => {
                                        const stDef = cat?.subtypes.find((s) => s.value === sv);
                                        const stLabel = stDef?.label ?? sv;
                                        const nbU = etape.nb_unites?.[sv] ?? 1;
                                        const cfg = etape.form_config?.[sv] ?? {};
                                        const hasPrice = cfg.prixGroupe || cfg.prixEnfant || cfg.suppPrivatisation;
                                        const etapeFieldConfig = OFFER_DETAIL_FIELDS[sv];

                                        const renderEtapeFieldRows = (data: Record<string, any>) => {
                                          if (!etapeFieldConfig || Object.keys(data).length === 0) return null;
                                          const rows: { label: string; display: string }[] = [];
                                          etapeFieldConfig.sections.forEach((sec) => {
                                            sec.fields.forEach((f) => {
                                              const v = data[f.key];
                                              if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return;
                                              if (f.type === 'boolean') { rows.push({ label: f.label, display: v ? 'Oui' : 'Non' }); return; }
                                              if (Array.isArray(v)) { rows.push({ label: f.label, display: v.join(', ') }); return; }
                                              rows.push({ label: f.label, display: String(v) });
                                            });
                                          });
                                          if (rows.length === 0) return null;
                                          return (
                                            <div className="space-y-1 pt-1 border-t border-slate-200">
                                              {rows.map((r) => (
                                                <div key={r.label} className="flex items-start gap-2">
                                                  <span className="text-[10px] text-slate-400 font-semibold shrink-0 min-w-[100px]">{r.label}</span>
                                                  <span className="text-[10px] text-slate-700 font-bold">{r.display}</span>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        };

                                        return (
                                          <div key={sv} className="bg-slate-50 rounded-xl overflow-hidden">
                                            {/* Header sous-type */}
                                            <div className="flex items-center justify-between px-3 py-2 bg-slate-100">
                                              <span className="text-[11px] font-extrabold text-slate-700">{stLabel}</span>
                                              <span className="text-[10px] font-bold text-slate-500">{nbU} unité{nbU > 1 ? 's' : ''}</span>
                                            </div>
                                            {/* Tarif commun */}
                                            {hasPrice && (
                                              <div className="flex flex-wrap gap-2 px-3 py-2 border-b border-slate-100">
                                                {cfg.prixGroupe && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">{cfg.prixGroupe} DT{cfg.nbPersonnesGroupe ? ` / ${cfg.nbPersonnesGroupe} pers.` : ' groupe'}</span>}
                                                {cfg.prixEnfant && <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">{cfg.prixEnfant} DT enfant{cfg.ageMaxEnfant ? ` (≤${cfg.ageMaxEnfant} ans)` : ''}</span>}
                                                {cfg.suppPrivatisation && <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">+{cfg.suppPrivatisation} DT privatisation</span>}
                                              </div>
                                            )}
                                            {/* Per-unit display */}
                                            <div className="divide-y divide-slate-100">
                                              {Array.from({ length: nbU }, (_, i) => {
                                                const unitPhotos = etape.entity_photos?.[`${sv}_unit_${i}`] ?? (i === 0 ? (etape.entity_photos?.[sv] ?? []) : []);
                                                const isEtapeHeberg = etape.categorie === 'hebergement';
                                                const baseUnitData: Record<string, any> = isEtapeHeberg
                                                  ? ((etape.unit_details as Record<string, Array<Record<string, any>>>)?.[sv]?.[i] ?? {})
                                                  : (nbU === 1
                                                    ? ((etape.fields as Record<string, Record<string, any>>)?.[sv] ?? {})
                                                    : ((etape.unit_details as Record<string, Array<Record<string, any>>>)?.[sv]?.[i] ?? {}));
                                                // Contribution prestataire avec préfixe ${sv}__ prime sur les champs statiques
                                                const svPfxT = `${sv}__`;
                                                const rawContribT = (etape as any).collab_contribution as Record<string, any> | undefined;
                                                const svContribDataT: Record<string, any> = rawContribT
                                                  ? Object.fromEntries(
                                                      Object.entries(rawContribT)
                                                        .filter(([k]) => k.startsWith(svPfxT))
                                                        .map(([k, v]) => [k.slice(svPfxT.length), v])
                                                    )
                                                  : {};
                                                const unitData: Record<string, any> = Object.keys(svContribDataT).length > 0
                                                  ? svContribDataT
                                                  : baseUnitData;
                                                const unitName = unitData?.nom_chambre ?? unitData?.nom_suite ?? unitData?.nom_tente ?? unitData?.nom_bungalow ?? unitData?.nom;
                                                return (
                                                  <div key={i} className="p-3 space-y-2">
                                                    {nbU > 1 && <p className="text-[10px] font-black text-primary uppercase tracking-widest">{unitName || `Unité ${i + 1}`}</p>}
                                                    {unitPhotos.length > 0 && (
                                                      <div className="flex gap-1.5 overflow-x-auto">
                                                        {unitPhotos.slice(0, 5).map((url: string, pi: number) => (
                                                          <img key={pi} src={url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                                                        ))}
                                                      </div>
                                                    )}
                                                    {renderEtapeFieldRows(unitData) ?? (
                                                      <p className="text-[10px] text-slate-300 italic">Aucun détail renseigné.</p>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Prix global de l'étape */}
                                  {etape.prix !== null && etape.prix !== undefined && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-black text-slate-400 uppercase">Prix indicatif</span>
                                      <span className="text-sm font-extrabold text-primary">{etape.prix} DT</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Carte du tracé */}
            {(() => {
              const pts = (viewingCircuit.etapes as any[])
                .filter((e) => (e.lat != null && e.lng != null) || (e.collab_lat != null && e.collab_lng != null))
                .sort((a, b) => a.jour - b.jour)
                .map((e) => ({
                  jour: e.jour,
                  lat: (e.lat ?? e.collab_lat) as number,
                  lng: (e.lng ?? e.collab_lng) as number,
                  destination: e.destination ?? e.collab_destination ?? "",
                }));
              const hbEtape = viewingCircuit.hebergement?.inclus && viewingCircuit.hebergement.type === "same" ? viewingCircuit.hebergement.etape : null;
              const hbContribMap = ((hbEtape as any)?.collab_contribution as Record<string, any> | undefined);
              const hbMapLat = hbContribMap?.collab_lat != null ? Number(hbContribMap.collab_lat) : ((hbEtape as any)?.lat ?? undefined);
              const hbMapLng = hbContribMap?.collab_lng != null ? Number(hbContribMap.collab_lng) : ((hbEtape as any)?.lng ?? undefined);
              const hb = (hbMapLat && hbMapLng)
                ? { lat: hbMapLat, lng: hbMapLng, nom: (hbContribMap?.titre ?? (hbEtape as any)?.titre) || hbContribMap?.collab_destination || (hbEtape as any)?.destination || "Hébergement" }
                : undefined;
              if (pts.length === 0 && !hb) return null;
              return (
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Tracé du circuit</p>
                  <CircuitRouteMap points={pts} hebergementPoint={hb} />
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          {viewingCircuit.status === "attente_publication" && publishCircuitError && (
            <div className="px-6 pt-3 shrink-0">
              <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">{publishCircuitError}</p>
            </div>
          )}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {viewingCircuit.status !== "approved" && (
                <button
                  onClick={() => { setViewingCircuit(null); openCircuitModal(viewingCircuit); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  <Edit3 size={12} />Modifier
                </button>
              )}
              <button
                onClick={async () => {
                  const msg = viewingCircuit.status === "approved"
                    ? "Supprimer ce circuit publié ? Les créneaux agenda de tous les collaborateurs seront supprimés."
                    : "Supprimer ce circuit ?";
                  if (!confirm(msg)) return;
                  try {
                    await apiFetch(`/circuits/${viewingCircuit.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                    setCircuits((prev) => prev.filter((c) => c.id !== viewingCircuit.id));
                    setViewingCircuit(null);
                  } catch {}
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete</span>Supprimer
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setViewingCircuit(null); setPublishCircuitError(""); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
              {viewingCircuit.status === "attente_publication" && (
                <button
                  disabled={publishingCircuit}
                  onClick={async () => {
                    setPublishingCircuit(true);
                    setPublishCircuitError("");
                    try {
                      await apiFetch(`/circuits/${viewingCircuit.id}/publish`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      setCircuits((prev) => prev.map((c) => c.id === viewingCircuit.id ? { ...c, status: "approved" } : c));
                      setViewingCircuit(null);
                    } catch (e: any) {
                      setPublishCircuitError(e?.message ?? "Erreur lors de la publication.");
                    } finally {
                      setPublishingCircuit(false);
                    }
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-2xl text-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {publishingCircuit
                    ? <><div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />Publication...</>
                    : <><span className="material-symbols-outlined text-sm">rocket_launch</span>Publier le circuit</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {circuitModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-7 pb-5 border-b border-slate-100 shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Route size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{editingCircuit ? (editingCircuit.status === "approved" ? "Circuit publié (lecture seule)" : "Modifier le circuit") : "Nouveau circuit"}</h3>
              <p className="text-slate-400 text-xs mt-0.5">Itinéraire multi-destinations avec activités, hébergements et plus</p>
            </div>
            <button onClick={() => setCircuitModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-8 py-6 space-y-7">

            {/* ── Infos générales ── */}
            <div className="space-y-4">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Informations générales</p>
              <div>
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre du circuit *</label>
                <input type="text" placeholder="Ex : Tour du Nord Tunisien — 5 jours"
                  value={circuitTitle} onChange={(e) => { setCircuitTitle(e.target.value); setCircuitFormError(""); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Nombre de jours</label>
                  {(() => {
                    const isRangeAuto     = circuitAvail.type === 'range' && !!circuitAvail.start_date && !!circuitAvail.end_date;
                    const isSpecificAuto  = circuitAvail.type === 'specific' && (circuitAvail.dates?.length ?? 0) > 0;
                    const isRecurringAuto = circuitAvail.type === 'recurring' && (circuitAvail.days_of_week?.length ?? 0) > 0;
                    const isAuto = isRangeAuto || isSpecificAuto || isRecurringAuto;
                    const autoLabel = isRangeAuto
                      ? (circuitAvail.days_of_week?.length ? "jour(s) — jours filtrés dans la plage" : "jour(s) — calculé depuis les dates")
                      : isSpecificAuto
                        ? `jour(s) — ${circuitAvail.dates?.length ?? 0} date(s) sélectionnée(s)`
                        : `jour(s) — ${circuitAvail.days_of_week?.length ?? 0} jour(s)/semaine`;
                    return isAuto ? (
                      <div className="flex items-center gap-2 w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
                        <span className="text-sm font-extrabold text-primary">{circuitNbJours}</span>
                        <span className="text-xs text-slate-400 font-medium">{autoLabel}</span>
                        <span className="material-symbols-outlined text-slate-300 text-base ml-auto">lock</span>
                      </div>
                    ) : (
                      <input type="number" min="1" max="30"
                        value={circuitNbJours} onChange={(e) => {
                          const n = Math.max(1, Number(e.target.value));
                          if (n < circuitNbJours) {
                            setCircuitEtapes((prev) => prev.filter((ep) => ep.jour <= n));
                            if (etapeFormOpen && etapeJour > n) { setEtapeFormOpen(false); resetEtapeForm(); }
                          }
                          setCircuitNbJours(n);
                          if (circuitAvail.type === 'range' && circuitAvail.start_date) {
                            const d = new Date(circuitAvail.start_date);
                            d.setDate(d.getDate() + n - 1);
                            setCircuitAvail((prev) => ({ ...prev, end_date: d.toISOString().split('T')[0] }));
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                    );
                  })()}
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Photo de couverture</label>
                  <label className="flex items-center gap-2 cursor-pointer w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-primary/50 transition-colors">
                    {circuitCoverImg
                      ? <img src={circuitCoverImg.preview} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      : circuitCoverExisting
                        ? <img src={circuitCoverExisting} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        : <span className="material-symbols-outlined text-slate-300 text-xl">add_photo_alternate</span>}
                    <span className="text-xs font-semibold text-slate-400">
                      {circuitCoverImg || circuitCoverExisting ? "Changer" : "Choisir"}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      if (circuitCoverImg) URL.revokeObjectURL(circuitCoverImg.preview);
                      setCircuitCoverImg({ file: f, preview: URL.createObjectURL(f) });
                      e.target.value = "";
                    }} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description</label>
                <textarea rows={3} placeholder="Décrivez le circuit, les points forts…"
                  value={circuitDescription} onChange={(e) => setCircuitDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-400" />
              </div>
            </div>

            {/* ── Disponibilité du circuit ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Disponibilité</p>
              <OfferAvailPicker value={circuitAvail} onChange={setCircuitAvail} hideTimeSlots />
            </div>

            {/* ── Hébergement du circuit ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Hébergement</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setCircuitHebergInclus(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${!circuitHebergInclus ? 'border-primary bg-primary/10 text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                  <span className={`material-symbols-outlined text-sm ${!circuitHebergInclus ? 'text-primary' : 'text-slate-400'}`}>hotel_class</span>
                  Non inclus
                </button>
                <button type="button" onClick={() => setCircuitHebergInclus(true)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${circuitHebergInclus ? 'border-primary bg-primary/10 text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                  <span className={`material-symbols-outlined text-sm ${circuitHebergInclus ? 'text-primary' : 'text-slate-400'}`}>hotel</span>
                  Hébergement inclus
                </button>
              </div>

              {circuitHebergInclus && (
                <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "same",    label: "Même sur tout le circuit", icon: "sync" },
                      { value: "per_day", label: "Variable par jour",         icon: "calendar_view_day" },
                    ] as const).map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setCircuitHebergType(opt.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl border-2 text-[10px] font-bold transition-all ${circuitHebergType === opt.value ? 'border-primary bg-primary/10 text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                        <span className={`material-symbols-outlined text-sm ${circuitHebergType === opt.value ? 'text-primary' : 'text-slate-400'}`}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {circuitHebergType === 'same' && (
                    <p className="text-[10px] text-slate-400">
                      <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">info</span>
                      Configurez l'hébergement dans le slot "Hébergement du circuit" ci-dessous. Il est retiré des activités par jour.
                    </p>
                  )}

                  {circuitHebergType === 'per_day' && (
                    <p className="text-[10px] text-slate-400">
                      <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">info</span>
                      Configurez l'hébergement dans chaque jour directement.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Étapes — un slot par jour ── */}
            <div className="space-y-4">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                Étapes ({circuitEtapes.length}/{circuitNbJours} jours configurés)
              </p>

              {[
                ...(circuitHebergInclus && circuitHebergType === 'same' ? [-1] : []),
                ...Array.from({ length: circuitNbJours }, (_, i) => i + 1),
              ].map((jour) => {
                const isCircuitHebergSlot = jour === -1;
                const activitesJour = isCircuitHebergSlot
                  ? (circuitHebergEtape ? [circuitHebergEtape] : [])
                  : circuitEtapes.filter((e) => e.jour === jour);
                const isFormOpenForThisJour = etapeFormOpen && etapeJour === jour;
                const selfPossible = orgActivities.some((a) => a.category === etapeCategorie);
                const collabSearchMode = etapeMode === "guidage" ? "guide" : etapeCategorie;

                // Slot de disponibilité de l'étape pour la vérification de conflits du guide
                const etapeConflictAvail = (() => {
                  if (isCircuitHebergSlot) return undefined;
                  let date: string | null = null;
                  if (circuitAvail.type === 'range' && circuitAvail.start_date) {
                    const d = new Date(circuitAvail.start_date + 'T12:00:00');
                    d.setDate(d.getDate() + jour - 1);
                    date = d.toISOString().split('T')[0];
                  } else if (circuitAvail.type === 'specific' && circuitAvail.dates?.length) {
                    const sorted = [...circuitAvail.dates].sort();
                    date = sorted[jour - 1] ?? null;
                  }
                  if (!date) return undefined;
                  return {
                    type: "specific" as const,
                    dates: [date],
                    time_slots: etapeHeureDebut && etapeHeureFin
                      ? { [date]: [{ start: etapeHeureDebut, end: etapeHeureFin }] }
                      : null,
                  };
                })();

                const showCollabSearch = isCircuitHebergSlot
                  ? (!selfPossible || (etapeAuthorType === "provider" && etapeSubtypes.length > 0))
                  : (etapeMode === "guidage" || (etapeMode === "service" && etapeCategorie && (!selfPossible || etapeAuthorType === "provider")));

                return (
                  <div key={jour} className="space-y-2">
                    {/* Jour header */}
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${activitesJour.length > 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                        {isCircuitHebergSlot ? <span className="material-symbols-outlined text-[13px]">hotel</span> : jour}
                      </div>
                      <p className="text-xs font-extrabold text-slate-600">{isCircuitHebergSlot ? "Hébergement du circuit" : `Jour ${jour}`}</p>
                      {isFormOpenForThisJour && activitesJour.length > 0 && (
                        <span className="ml-auto text-[10px] text-slate-400 font-semibold">{activitesJour.length} activité{activitesJour.length > 1 ? "s" : ""}</span>
                      )}
                      {isFormOpenForThisJour && (
                        <button type="button" onClick={() => { setEtapeFormOpen(false); resetEtapeForm(); }}
                          className="ml-auto text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">Annuler</button>
                      )}
                    </div>

                    {/* Liste des activités */}
                    {activitesJour.map((act) => {
                      const actCat = PROVIDER_SCHEMA.find((c) => c.value === act.categorie);
                      const actStLabels = act.subtypes.map((sv) => actCat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                      const firstPhoto = Object.values(act.entity_photos ?? {}).flat()[0] ?? act.photos?.[0];
                      const collabEntry  = circuitEtapeStatusMap.get(act.id);
                      const hasCollab    = !!act.collaborator_id && act.author_type !== "self";
                      const isEtapeLocked = collabEntry?.status === "completed";
                      const isPublished   = editingCircuit?.status === "approved";
                      const isEditingSchedule = editingCollabSchedule === act.id;
                      const collabStatusMeta: Record<string, { label: string; cls: string }> = {
                        pending:   { label: "En attente",         cls: "bg-amber-100 text-amber-700" },
                        accepted:  { label: "Accepté",            cls: "bg-blue-100 text-blue-700" },
                        completed: { label: "Contribution reçue", cls: "bg-teal-100 text-teal-700" },
                        declined:  { label: "Refusé",             cls: "bg-red-100 text-red-600" },
                      };
                      const sMeta = collabEntry?.status ? (collabStatusMeta[collabEntry.status] ?? { label: collabEntry.status, cls: "bg-slate-100 text-slate-500" }) : null;
                      return (
                        <div key={act.id} className={`rounded-2xl border ml-9 overflow-hidden ${hasCollab ? "bg-green-50/40 border-green-200/60" : "bg-slate-50 border-slate-100"}`}>
                          <div className="flex items-center gap-3 p-3">
                            {firstPhoto && <img src={firstPhoto} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />}
                            <div className="flex-1 min-w-0">
                              {(act.heure_debut || act.heure_fin) && !isEditingSchedule && (
                                <p className="text-[10px] font-black text-primary mb-0.5">{act.heure_debut || "?"} → {act.heure_fin || "?"}</p>
                              )}
                              {/* Éditeur horaire inline (collab étapes) */}
                              {isEditingSchedule && (
                                <div className="flex items-center gap-1.5 mb-1">
                                  <input type="time" value={collabSchedStart} onChange={(e) => setCollabSchedStart(e.target.value)}
                                    className="border border-primary/40 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary w-24" />
                                  <span className="text-[10px] text-slate-400 font-bold">→</span>
                                  <input type="time" value={collabSchedEnd} onChange={(e) => setCollabSchedEnd(e.target.value)}
                                    className="border border-primary/40 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary w-24" />
                                  <button type="button" onClick={async () => {
                                    // Appliquer localement
                                    setCircuitEtapes((prev) => prev.map((e) => e.id === act.id ? { ...e, heure_debut: collabSchedStart, heure_fin: collabSchedEnd } : e));
                                    setEditingCollabSchedule(null);
                                    // Vérifier conflit agenda si la collab est connue
                                    const cEntry = circuitEtapeStatusMap.get(act.id);
                                    if (cEntry?.collab_id && editingCircuit?.id) {
                                      try {
                                        const res = await apiFetch<{hasConflict: boolean}>(`/circuits/${editingCircuit.id}/collaborations/${cEntry.collab_id}/sync-etape-schedule`, {
                                          method: "POST",
                                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                          body: JSON.stringify({ heure_debut: collabSchedStart, heure_fin: collabSchedEnd }),
                                        });
                                        if (res?.hasConflict) {
                                          setCollabScheduleConflicts((prev) => new Set([...prev, act.id]));
                                        } else {
                                          setCollabScheduleConflicts((prev) => { const s = new Set(prev); s.delete(act.id); return s; });
                                        }
                                      } catch { /* non bloquant */ }
                                    }
                                  }} className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0 cursor-pointer">
                                    <Check size={10} />
                                  </button>
                                  <button type="button" onClick={() => setEditingCollabSchedule(null)}
                                    className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 cursor-pointer">
                                    <X size={9} />
                                  </button>
                                </div>
                              )}
                              <p className="text-sm font-extrabold text-slate-800 truncate">{act.titre || act.destination}</p>
                              <p className="text-[10px] text-slate-400 font-semibold truncate">{act.destination} · {actCat?.label}{actStLabels.length > 0 && ` · ${actStLabels.join(", ")}`}</p>
                              {act.prix != null && <p className="text-[10px] font-black text-primary mt-0.5">{act.prix} TND</p>}
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              {hasCollab ? (
                                /* Pour les étapes collab : bouton crayon = édition horaire uniquement */
                                !isPublished && !isEditingSchedule && (
                                  <button type="button" onClick={() => {
                                    setCollabSchedStart(act.heure_debut ?? "");
                                    setCollabSchedEnd(act.heure_fin ?? "");
                                    setEditingCollabSchedule(act.id);
                                  }} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-primary flex items-center justify-center transition-colors cursor-pointer" title="Modifier l'horaire">
                                    <Edit3 size={10} />
                                  </button>
                                )
                              ) : (
                                /* Étapes normales : bouton crayon = formulaire complet */
                                <button type="button" onClick={() => {
                                  if (isCircuitHebergSlot) { openCircuitHebergConfig(); return; }
                                  resetEtapeForm();
                                  setEditingEtapeId(act.id);
                                  setEtapeJour(jour);
                                  setEtapeDestination(act.destination);
                                  setEtapeAddress(act.address);
                                  setEtapeLat(act.lat); setEtapeLng(act.lng);
                                  setEtapeCategorie(act.categorie);
                                  setEtapeSubtypes(act.subtypes);
                                  setEtapeTitre(act.titre);
                                  setEtapeDescCourte(act.description_courte);
                                  setEtapeDescLongue(act.description_longue);
                                  setEtapePrix(act.prix?.toString() ?? '');
                                  setEtapeHeureDebut(act.heure_debut ?? '');
                                  setEtapeHeureFin(act.heure_fin ?? '');
                                  setEtapeSubtypeDetails(act.fields ?? {});
                                  setEtapeSubtypeUnitDetails(act.unit_details ?? {});
                                  setEtapeSubtypeNbUnites(act.nb_unites ?? {});
                                  setEtapeSubtypeFormConfig(act.form_config ?? {});
                                  setEtapeEntityExistingImages(act.entity_photos ?? {});
                                  setEtapeAuthorType(act.author_type ?? "self");
                                  setEtapeCollabSelected(null);
                                  setEtapeMode(act.etape_mode ?? "service");
                                  if (act.etape_mode === "guidage" && act.guidage_data) {
                                    setEtapeGuidageData(act.guidage_data);
                                  } else {
                                    setEtapeGuidageData({ categorie: "", sousType: "", details: { _mode: "guide" } });
                                  }
                                  setEtapeFormOpen(true); setEtapeFormError('');
                                }} className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-primary flex items-center justify-center transition-colors cursor-pointer">
                                  <Edit3 size={10} />
                                </button>
                              )}
                              {!isPublished && !hasCollab && (
                                <button type="button" onClick={() => {
                                  if (isCircuitHebergSlot) { setCircuitHebergEtape(null); return; }
                                  setCircuitEtapes((prev) => prev.filter((e) => e.id !== act.id));
                                }} className="w-6 h-6 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer" title="Supprimer l'étape">
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Ligne collaborateur */}
                          {hasCollab && (
                            <div className={`flex items-center gap-2 px-3 py-2 border-t ${collabScheduleConflicts.has(act.id) ? "border-red-200/60 bg-red-50/60" : "border-green-200/50 bg-green-50/60"}`}>
                              <span className={`material-symbols-outlined text-[13px] ${collabScheduleConflicts.has(act.id) ? "text-red-500" : "text-green-600"}`}>
                                {collabScheduleConflicts.has(act.id) ? "warning" : "lock"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 truncate">
                                  Géré par{" "}
                                  <span className={`font-extrabold ${collabScheduleConflicts.has(act.id) ? "text-red-700" : "text-green-700"}`}>{act.collaborator_name ?? "collaborateur"}</span>
                                </p>
                                {collabScheduleConflicts.has(act.id) && (
                                  <p className="text-[9px] font-bold text-red-600 mt-0.5">Conflit d'agenda détecté — collaborateur notifié</p>
                                )}
                              </div>
                              {sMeta && !collabScheduleConflicts.has(act.id) && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${sMeta.cls}`}>
                                  {sMeta.label}
                                </span>
                              )}
                              {collabScheduleConflicts.has(act.id) && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 bg-red-100 text-red-600">
                                  ⚠ Conflit
                                </span>
                              )}
                              {!isPublished && (
                                <button type="button" onClick={() => {
                                  if (isCircuitHebergSlot) { setCircuitHebergEtape(null); return; }
                                  // Enregistrer le kick pour l'exécuter après le save
                                  if (collabEntry?.collab_id) {
                                    setPendingKicks((prev) => [...prev, { collabId: collabEntry.collab_id, circuitId: editingCircuit!.id }]);
                                  }
                                  setCircuitEtapes((prev) => prev.filter((e) => e.id !== act.id));
                                }} className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Retirer le collaborateur (après enregistrement)">
                                  <X size={9} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Slot vide ou bouton ajouter — toujours dans la zone indentée */}
                    {!isFormOpenForThisJour && (
                      <div className="ml-9">
                        {activitesJour.length === 0 ? (
                          <div className="flex items-center justify-between px-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl">
                            <p className="text-xs text-slate-400 font-semibold">Non configuré</p>
                            <button type="button"
                              onClick={() => isCircuitHebergSlot ? openCircuitHebergConfig() : (resetEtapeForm(), setEditingEtapeId(null), setEtapeJour(jour), setEtapeFormOpen(true), setEtapeFormError(''))}
                              className="text-[11px] font-extrabold text-primary hover:text-primary/80 cursor-pointer">
                              Configurer →
                            </button>
                          </div>
                        ) : !isCircuitHebergSlot ? (
                          <button type="button"
                            onClick={() => { resetEtapeForm(); setEditingEtapeId(null); setEtapeJour(jour); setEtapeFormOpen(true); setEtapeFormError(''); }}
                            className="w-full py-2 border-2 border-dashed border-primary/30 rounded-xl text-[11px] font-extrabold text-primary hover:bg-primary/5 transition-colors cursor-pointer">
                            + Ajouter une activité pour ce jour
                          </button>
                        ) : null}
                      </div>
                    )}

                    {/* Formulaire activité */}
                    {isFormOpenForThisJour && (
                      <div className="ml-9 border-2 border-primary/20 rounded-2xl p-5 bg-primary/5 space-y-4">
                        <p className="text-[10px] font-black tracking-widest text-primary uppercase">
                          {isCircuitHebergSlot ? (editingEtapeId ? "Modifier l'hébergement" : "Configurer l'hébergement") : (editingEtapeId ? "Modifier l'activité" : "Nouvelle activité") + ` — Jour ${jour}`}
                        </p>

                        {/* Horaires dans le circuit — masqués pour l'hébergement circuit */}
                        {!isCircuitHebergSlot && <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">
                            Plage horaire dans le circuit <span className="text-red-400">*</span>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] text-slate-400 mb-0.5 block">Début</label>
                              <input type="time" value={etapeHeureDebut} onChange={(e) => setEtapeHeureDebut(e.target.value)}
                                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${!etapeHeureDebut && etapeFormError ? "border-red-300" : "border-slate-200"}`} />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 mb-0.5 block">Fin</label>
                              <input type="time" value={etapeHeureFin} onChange={(e) => setEtapeHeureFin(e.target.value)}
                                className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${!etapeHeureFin && etapeFormError ? "border-red-300" : "border-slate-200"}`} />
                            </div>
                          </div>
                        </div>}

                        {!isCircuitHebergSlot && <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nom affiché (optionnel)</label>
                          <input type="text" placeholder="Ex : Ain Draham" value={etapeDestination}
                            onChange={(e) => setEtapeDestination(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-300" />
                        </div>}

                  {/* Carte — cachée si le collaborateur gère la localisation */}
                  {(!showCollabSearch || isCircuitHebergSlot) ? (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                        Localisation sur la carte *
                        {etapeLat && <span className="ml-2 text-primary font-black">✓ Positionnée</span>}
                      </label>
                      <MapPicker
                        lat={etapeLat}
                        lng={etapeLng}
                        onPick={(lat, lng, address) => {
                          setEtapeLat(lat); setEtapeLng(lng); setEtapeAddress(address);
                          if (!etapeDestination) setEtapeDestination(address.split(",")[0].trim());
                          setEtapeFormError("");
                        }}
                      />
                      {etapeAddress && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">{etapeAddress}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-400">
                      <span className="material-symbols-outlined text-[16px] text-slate-300">location_on</span>
                      <span className="text-[11px] font-semibold">La localisation sera renseignée par votre collaborateur</span>
                    </div>
                  )}

                  {/* ── Hébergement circuit : sous-types ── */}
                  {isCircuitHebergSlot && (() => {
                    const cat = PROVIDER_SCHEMA.find((c) => c.value === 'hebergement');
                    if (!cat?.subtypes.length) return null;
                    return (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Type d'hébergement *</label>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subtypes.map((st) => {
                            const sel = etapeSubtypes.includes(st.value);
                            return (
                              <button key={st.value} type="button"
                                onClick={() => { setEtapeSubtypes((prev) => sel ? prev.filter((v) => v !== st.value) : [...prev, st.value]); if (sel) setEtapeFields((prev) => { const n = { ...prev }; delete n[st.value]; return n; }); setEtapeFormError(""); }}
                                className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-extrabold transition-all cursor-pointer ${sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Type d'activité + données + collaborateur (après carte) ── */}
                  {!isCircuitHebergSlot && (() => {
                    return (
                      <div className="space-y-3 p-4 bg-white/70 border border-slate-200 rounded-2xl">
                        {/* Sélecteur Guidage | Service prestataire */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Type d'activité de l'étape</label>
                          <div className="flex gap-2">
                            {([["service","Service prestataire","store"],["guidage","Guidage","hiking"]] as const).map(([val, lbl, ico]) => (
                              <button key={val} type="button"
                                onClick={() => {
                                  setEtapeMode(val);
                                  setEtapeCollabSelected(null); setEtapeCollabSearch(""); setEtapeCollabResults([]); setEtapeCollabPanelOpen(false);
                                  if (val === "guidage") { setEtapeAuthorType("guide"); setEtapeCategorie(""); setEtapeSubtypes([]); setEtapeFields({}); }
                                  else { setEtapeAuthorType("self"); setEtapeGuidageData({ categorie: "", sousType: "", details: { _mode: "guide" } }); }
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${etapeMode === val ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                                <span className="material-symbols-outlined text-base">{ico}</span>{lbl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Mode guidage : domaine + expertises (le guide invité gère le reste) */}
                        {etapeMode === "guidage" && (
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Domaine de guidage *</label>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(DOMAINES).map(([key, cfg]) => {
                                  const active = etapeGuidageData.categorie === key;
                                  return (
                                    <button key={key} type="button"
                                      onClick={() => { setEtapeGuidageData((prev) => ({ ...prev, categorie: active ? "" : key, details: { ...prev.details, expertises: [] } })); setEtapeFormError(""); }}
                                      className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${active ? "bg-primary/10 border-primary shadow-sm" : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/5"}`}>
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary/20" : "bg-slate-100"}`}>
                                        <span className={`material-symbols-outlined text-base ${active ? "text-primary" : "text-slate-500"}`}>{cfg.icon}</span>
                                      </div>
                                      <p className={`flex-1 font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>{cfg.label}</p>
                                      {active && <span className="material-symbols-outlined text-primary text-base shrink-0">check_circle</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Expertises du domaine sélectionné */}
                            {etapeGuidageData.categorie && (() => {
                              const domaine = DOMAINES[etapeGuidageData.categorie];
                              if (!domaine?.expertises?.length) return null;
                              const selected: string[] = etapeGuidageData.details?.expertises ?? [];
                              return (
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                                    Expertises souhaitées <span className="text-slate-300 normal-case font-medium">(optionnel)</span>
                                  </label>
                                  <div className="flex flex-wrap gap-1.5">
                                    {domaine.expertises.map((exp) => {
                                      const sel = selected.includes(exp);
                                      return (
                                        <button key={exp} type="button"
                                          onClick={() => {
                                            const next = sel ? selected.filter((e) => e !== exp) : [...selected, exp];
                                            setEtapeGuidageData((prev) => ({ ...prev, details: { ...prev.details, expertises: next } }));
                                          }}
                                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30 hover:text-slate-700"}`}>
                                          {exp}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Mode service : catégorie */}
                        {etapeMode === "service" && (
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Catégorie de service *</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {PROVIDER_SCHEMA.filter((cat) => !(circuitHebergInclus && circuitHebergType === 'same' && cat.value === 'hebergement')).map((cat) => {
                                const active = etapeCategorie === cat.value;
                                const hasCat = orgActivities.some((a) => a.category === cat.value);
                                return (
                                  <button key={cat.value} type="button"
                                    onClick={() => { setEtapeCategorie(active ? "" : cat.value); setEtapeSubtypes([]); setEtapeFields({}); setEtapeFormError(""); setEtapeCollabPanelOpen(false); if (active) { setEtapeAuthorType("self"); setEtapeCollabSelected(null); } else { setEtapeAuthorType(hasCat ? "self" : "provider"); setEtapeCollabSelected(null); } }}
                                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                                    <span className={`material-symbols-outlined text-base ${active ? "text-primary" : "text-slate-400"}`}>{cat.icon}</span>
                                    <span className="text-[9px] font-extrabold leading-tight">{cat.label}</span>
                                    {hasCat && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1">• point vert = dans vos activités</p>
                          </div>
                        )}

                        {/* Mode service : sous-types */}
                        {etapeMode === "service" && etapeCategorie && (() => {
                          const cat = PROVIDER_SCHEMA.find((c) => c.value === etapeCategorie);
                          if (!cat?.subtypes.length) return null;
                          return (
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Sous-types *</label>
                              <div className="flex flex-wrap gap-1.5">
                                {cat.subtypes.map((st) => {
                                  const sel = etapeSubtypes.includes(st.value);
                                  return (
                                    <button key={st.value} type="button"
                                      onClick={() => { setEtapeSubtypes((prev) => sel ? prev.filter((v) => v !== st.value) : [...prev, st.value]); if (sel) setEtapeFields((prev) => { const n = { ...prev }; delete n[st.value]; return n; }); setEtapeFormError(""); }}
                                      className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-extrabold transition-all cursor-pointer ${sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                                      {st.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    );
                  })()}

                  {/* ── Champs communs (service ou hébergement circuit, assuré par soi-même) ── */}
                  {(isCircuitHebergSlot || etapeMode === "service") && etapeSubtypes.length > 0 && selfPossible && etapeAuthorType !== "provider" && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Informations de l'offre</p>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Titre *</label>
                        <input type="text" placeholder="Ex : Randonnée au Djebel Zaghouan"
                          value={etapeTitre} onChange={(e) => { setEtapeTitre(e.target.value); setEtapeFormError(""); }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description courte</label>
                        <textarea rows={2} placeholder="Résumé de l'étape en 1-2 phrases…"
                          value={etapeDescCourte} onChange={(e) => setEtapeDescCourte(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-300" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description détaillée</label>
                        <textarea rows={3} placeholder="Description complète de l'étape…"
                          value={etapeDescLongue} onChange={(e) => setEtapeDescLongue(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-300" />
                      </div>
                      {etapeCategorie !== 'hebergement' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Prix de base (TND)</label>
                          <input type="number" min="0" placeholder="0"
                            value={etapePrix} onChange={(e) => setEtapePrix(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Détails spécifiques (réplique exacte du formulaire de publication) ── */}
                  {(isCircuitHebergSlot || etapeMode === "service") && etapeSubtypes.length > 0 && selfPossible && etapeAuthorType !== "provider" && (() => {
                    const isEtapeHeberg = etapeCategorie === 'hebergement';

                    // Résolution des dynamicOptions depuis les données d'onboarding des activités
                    const flatOrgOnboarding = orgActivities.reduce<Record<string, any>>((acc, act) => {
                      return { ...acc, ...Object.values(act.fields ?? {}).reduce<Record<string, any>>((a, s) => ({ ...a, ...(s as Record<string, any>) }), {}) };
                    }, {});
                    const resolveEtapeOptions = (field: { options?: string[]; dynamicOptions?: string }): string[] => {
                      if (!field.dynamicOptions) return field.options ?? [];
                      const key = field.dynamicOptions.replace('onboarding.', '');
                      const val = flatOrgOnboarding[key];
                      if (Array.isArray(val)) return val as string[];
                      if (typeof val === 'string' && val.trim()) return [val];
                      return field.options ?? [];
                    };

                    const renderEtapePhotoSection = (entityKey: string, label: string) => {
                      const existingUrls = etapeEntityExistingImages[entityKey] ?? [];
                      const newImgs = etapeEntityImages[entityKey] ?? [];
                      const coverI = etapeEntityCoverIdx[entityKey] ?? 0;
                      const inputId = `ep-${entityKey.replace(/[^a-z0-9]/gi, '-')}`;
                      const hasAny = existingUrls.length > 0 || newImgs.length > 0;
                      return (
                        <div className="mb-4 pb-4 border-b border-slate-200 last:border-0">
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">📷 {label}</label>
                          {!hasAny && (
                            <label htmlFor={inputId}
                              className="flex flex-col items-center justify-center gap-1.5 w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                              <span className="material-symbols-outlined text-slate-300 text-2xl">add_photo_alternate</span>
                              <p className="text-[10px] font-semibold text-slate-400">Cliquez pour ajouter des photos</p>
                              <input id={inputId} type="file" accept="image/*" multiple className="hidden"
                                onChange={(e) => { const files = Array.from(e.target.files ?? []); setEtapeEntityImages((prev) => ({ ...prev, [entityKey]: [...(prev[entityKey] ?? []), ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))] })); e.target.value = ""; }}
                              />
                            </label>
                          )}
                          {hasAny && (
                            <>
                              <div className="mt-1 grid grid-cols-4 gap-1.5">
                                {/* Photos déjà sauvegardées */}
                                {existingUrls.map((url, i) => (
                                  <div key={`ex-${i}`}
                                    className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${i === 0 && newImgs.length === 0 ? "border-primary shadow-md" : "border-slate-200"}`}>
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    {i === 0 && newImgs.length === 0 && <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                                    <button type="button"
                                      onClick={() => setEtapeEntityExistingImages((prev) => ({ ...prev, [entityKey]: (prev[entityKey] ?? []).filter((_, idx) => idx !== i) }))}
                                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X size={10} />
                                    </button>
                                  </div>
                                ))}
                                {/* Nouvelles photos à uploader */}
                                {newImgs.map((img, i) => {
                                  const isCover = existingUrls.length === 0 && i === coverI;
                                  return (
                                    <div key={`new-${i}`}
                                      onClick={() => { if (existingUrls.length === 0) setEtapeEntityCoverIdx((prev) => ({ ...prev, [entityKey]: i })); }}
                                      className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                                      {isCover && <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                                      <button type="button"
                                        onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(img.preview); setEtapeEntityImages((prev) => { const cur = prev[entityKey] ?? []; return { ...prev, [entityKey]: cur.filter((_, idx) => idx !== i) }; }); setEtapeEntityCoverIdx((prev) => { const cur = prev[entityKey] ?? 0; return { ...prev, [entityKey]: cur >= i && cur > 0 ? cur - 1 : cur }; }); }}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={10} />
                                      </button>
                                    </div>
                                  );
                                })}
                                {/* Bouton ajouter */}
                                <label htmlFor={inputId}
                                  className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                                  <span className="material-symbols-outlined text-slate-300 text-xl">add</span>
                                  <input id={inputId} type="file" accept="image/*" multiple className="hidden"
                                    onChange={(e) => { const files = Array.from(e.target.files ?? []); setEtapeEntityImages((prev) => ({ ...prev, [entityKey]: [...(prev[entityKey] ?? []), ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))] })); e.target.value = ""; }}
                                  />
                                </label>
                              </div>
                              {(existingUrls.length + newImgs.length) > 1 && existingUrls.length === 0 && (
                                <p className="text-[9px] text-slate-400 font-medium mt-1">Cliquez sur une photo pour la définir comme image principale.</p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    };

                    const eGetNb = (st: string) => etapeSubtypeNbUnites[st] ?? 1;
                    const eGetUD = (st: string) => etapeSubtypeUnitDetails[st] ?? [{}];
                    const eGetTab = (st: string) => etapeActiveSubtypeTab[st] ?? 0;
                    const eSetNb = (st: string, n: number) => setEtapeSubtypeNbUnites((prev) => ({ ...prev, [st]: n }));
                    const eSetUD = (st: string, arr: Array<Record<string, any>>) => setEtapeSubtypeUnitDetails((prev) => ({ ...prev, [st]: arr }));
                    const eSetTab = (st: string, i: number) => setEtapeActiveSubtypeTab((prev) => ({ ...prev, [st]: i }));
                    const eGetCfg = (st: string): Record<string, any> => etapeSubtypeFormConfig[st] ?? {};
                    const eSetCfg = (st: string, f: string, v: any) => setEtapeSubtypeFormConfig((prev) => ({ ...prev, [st]: { ...(prev[st] ?? {}), [f]: v } }));

                    const renderEtapeFields = (st: string, getData: (k: string) => any, setData: (k: string, v: any) => void) => {
                      const config = OFFER_DETAIL_FIELDS[st];
                      if (!config) return null;
                      return config.sections.map((sec, si) => {
                        if ((sec.conditionalOn as any)?.onboardingKey) return null;
                        const visible = sec.fields.filter((f) => {
                          if (!f.conditionalOn) return true;
                          if (f.conditionalOn.field && f.conditionalOn.value !== undefined) return getData(f.conditionalOn.field) === f.conditionalOn.value;
                          if (f.conditionalOn.field && f.conditionalOn.notValue !== undefined) return getData(f.conditionalOn.field) !== f.conditionalOn.notValue;
                          return true;
                        });
                        if (!visible.length) return null;
                        return (
                          <div key={si} className="mb-4 last:mb-0">
                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">{sec.label}</p>
                            <div className="space-y-2.5">
                              {visible.map((field) => {
                                const val = getData(field.key);
                                const sv = (v: any) => setData(field.key, v);
                                if (field.type === "boolean") return (
                                  <div key={field.key} className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-700">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</span>
                                    <button type="button" onClick={() => sv(!val)} className={`w-10 h-5 rounded-full transition-colors shrink-0 ${val ? "bg-primary" : "bg-slate-200"}`}>
                                      <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${val ? "translate-x-2.5" : "-translate-x-2.5"}`} />
                                    </button>
                                  </div>
                                );
                                if (field.type === "multiselect") {
                                  const opts = resolveEtapeOptions(field);
                                  if (!opts.length) return (
                                    <div key={field.key}>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                      <input type="text" placeholder={`Saisir ${field.label.toLowerCase()}…`} value={Array.isArray(val) ? (val as string[]).join(", ") : (val ?? "")} onChange={(e) => sv(e.target.value ? e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) : [])} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                  );
                                  return (
                                    <div key={field.key}>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                      <div className="flex flex-wrap gap-1">
                                        {opts.map((opt) => { const chosen = Array.isArray(val) && val.includes(opt); return (<button key={opt} type="button" onClick={() => sv(chosen ? (val as string[]).filter((v: string) => v !== opt) : [...(val as string[] ?? []), opt])} className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all ${chosen ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-600"}`}>{opt}</button>); })}
                                      </div>
                                    </div>
                                  );
                                }
                                if (field.type === "select") {
                                  const opts = resolveEtapeOptions(field);
                                  if (!opts.length) return (
                                    <div key={field.key}>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                      <input type="text" placeholder={`Saisir ${field.label.toLowerCase()}…`} value={val ?? ""} onChange={(e) => sv(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                    </div>
                                  );
                                  return (
                                    <div key={field.key}>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                      <select value={val ?? ""} onChange={(e) => sv(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                        <option value="">— Sélectionner —</option>
                                        {opts.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                      </select>
                                    </div>
                                  );
                                }
                                if (field.type === "number") return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.unit && <span className="text-slate-300 ml-1">({field.unit})</span>}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                    <input type="number" min="0" placeholder={field.placeholder} value={val ?? ""} onChange={(e) => sv(e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                );
                                if (field.type === "time") return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                    <input type="time" value={val ?? ""} onChange={(e) => sv(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                );
                                if (field.type === "textarea") return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                    <textarea rows={2} placeholder={field.placeholder} value={val ?? ""} onChange={(e) => sv(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                                  </div>
                                );
                                if (field.type === "repeater") {
                                  const rows = Array.isArray(val) ? val as Array<Record<string, any>> : [];
                                  return (
                                    <div key={field.key}>
                                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}</label>
                                      {rows.map((row, ri) => (
                                        <div key={ri} className="flex gap-1.5 mb-1.5">
                                          {(field.subfields ?? []).map((sf) => (
                                            <input key={sf.key} type={sf.type === "number" ? "number" : "text"} placeholder={sf.placeholder}
                                              value={(row[sf.key] as string) ?? ""}
                                              onChange={(e) => { const nr = [...rows]; nr[ri] = { ...nr[ri], [sf.key]: sf.type === "number" ? Number(e.target.value) : e.target.value }; sv(nr); }}
                                              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                          ))}
                                          <button type="button" onClick={() => sv(rows.filter((_, idx) => idx !== ri))}
                                            className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center shrink-0 mt-0.5"><X size={12} /></button>
                                        </div>
                                      ))}
                                      <button type="button" onClick={() => sv([...rows, {}])}
                                        className="w-full py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-[10px] font-extrabold text-slate-400 hover:border-primary/40 hover:text-primary transition-all">+ Ajouter {field.label}</button>
                                    </div>
                                  );
                                }
                                if (field.type === "file") return null;
                                return (
                                  <div key={field.key}>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                                    <input type="text" placeholder={field.placeholder} value={val ?? ""} onChange={(e) => sv(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    };

                    const renderEtapeAvailBloc = (st: string) => {
                      const cfg = eGetCfg(st);
                      const mode = (cfg.availMode as string) ?? 'specific';
                      const weekdays: number[] = (cfg.availWeekdays as number[]) ?? [];
                      const specificDates: string[] = (cfg.specificDates as string[]) ?? [];
                      const saisons: string[] = (cfg.saisons as string[]) ?? [];
                      return (
                        <div className="mb-4 pb-4 border-b border-slate-200">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Disponibilité</p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {AVAILABILITY_TYPES.map((m) => (
                              <button key={m.value} type="button" onClick={() => eSetCfg(st, 'availMode', m.value)}
                                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${mode === m.value ? 'border-primary bg-primary/10 text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                                <span className={`material-symbols-outlined text-sm ${mode === m.value ? 'text-primary' : 'text-slate-400'}`}>{m.icon}</span>{m.label}
                              </button>
                            ))}
                          </div>
                          {mode === 'specific' && (
                            <div className="space-y-1.5">
                              <div className="flex gap-2">
                                <input type="date" value={(cfg.newSpecificDate as string) ?? ''} onChange={(e) => eSetCfg(st, 'newSpecificDate', e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                <button type="button" onClick={() => { const d = (cfg.newSpecificDate as string) ?? ''; if (d && !specificDates.includes(d)) { eSetCfg(st, 'specificDates', [...specificDates, d].sort()); eSetCfg(st, 'newSpecificDate', ''); } }} className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-extrabold hover:bg-primary/90">Ajouter</button>
                              </div>
                              {specificDates.length > 0 && <div className="flex flex-wrap gap-1">{specificDates.map((d) => <span key={d} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold border border-primary/20">{d}<button type="button" onClick={() => eSetCfg(st, 'specificDates', specificDates.filter((x) => x !== d))}><X size={8} /></button></span>)}</div>}
                            </div>
                          )}
                          {mode === 'weekly' && (
                            <div className="space-y-1.5">
                              <div className="flex gap-1">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((day, i) => <button key={i} type="button" onClick={() => eSetCfg(st, 'availWeekdays', weekdays.includes(i) ? weekdays.filter((d) => d !== i) : [...weekdays, i])} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border-2 transition-all ${weekdays.includes(i) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{day}</button>)}</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début</label><input type="date" value={(cfg.availStart as string) ?? ''} onChange={(e) => eSetCfg(st, 'availStart', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                                <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin</label><input type="date" value={(cfg.availEnd as string) ?? ''} onChange={(e) => eSetCfg(st, 'availEnd', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                              </div>
                            </div>
                          )}
                          {mode === 'period' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début *</label><input type="date" value={(cfg.availStart as string) ?? ''} onChange={(e) => eSetCfg(st, 'availStart', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                              <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin *</label><input type="date" value={(cfg.availEnd as string) ?? ''} onChange={(e) => eSetCfg(st, 'availEnd', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                            </div>
                          )}
                          {mode === 'on_demand' && (
                            <div className="flex gap-2">{['24h','48h','72h'].map((d) => <button key={d} type="button" onClick={() => eSetCfg(st, 'delaiReponse', d)} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all ${(cfg.delaiReponse ?? '24h') === d ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-500'}`}>{d}</button>)}</div>
                          )}
                          {mode === 'season' && (
                            <div className="flex gap-1.5">{SAISONS.map((s) => <button key={s} type="button" onClick={() => eSetCfg(st, 'saisons', saisons.includes(s) ? saisons.filter((x) => x !== s) : [...saisons, s])} className={`flex-1 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all ${saisons.includes(s) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{s}</button>)}</div>
                          )}
                          {mode !== 'on_demand' && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure début</label><input type="time" value={(cfg.heureDebut as string) ?? ''} onChange={(e) => eSetCfg(st, 'heureDebut', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                              <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure fin</label><input type="time" value={(cfg.heureFin as string) ?? ''} onChange={(e) => eSetCfg(st, 'heureFin', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                            </div>
                          )}
                        </div>
                      );
                    };

                    const renderEtapePricingBloc = (st: string) => {
                      const cfg = eGetCfg(st);
                      return (
                        <div className="mb-4 pb-4 border-b border-slate-200 space-y-2.5">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Tarification</p>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Prix groupe <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span><input type="number" min="0" placeholder="1200" value={(cfg.prixGroupe as string) ?? ''} onChange={(e) => eSetCfg(st, 'prixGroupe', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">pers.</span><input type="number" min="1" placeholder="10" value={(cfg.nbPersonnesGroupe as string) ?? ''} onChange={(e) => eSetCfg(st, 'nbPersonnesGroupe', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Prix enfant <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span><input type="number" min="0" placeholder="150" value={(cfg.prixEnfant as string) ?? ''} onChange={(e) => eSetCfg(st, 'prixEnfant', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">≤ âge</span><input type="number" min="0" max="18" placeholder="12" value={(cfg.ageMaxEnfant as string) ?? ''} onChange={(e) => eSetCfg(st, 'ageMaxEnfant', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Supplément privatisation <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span><input type="number" min="0" placeholder="500" value={(cfg.suppPrivatisation as string) ?? ''} onChange={(e) => eSetCfg(st, 'suppPrivatisation', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                          </div>
                        </div>
                      );
                    };

                    const renderEtapeNbUnites = (st: string) => {
                      const nb = eGetNb(st);
                      return (
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                          <div>
                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Nb d'unités</p>
                            <p className="text-[9px] text-slate-400 font-medium mt-0.5">Chambres / suites / tentes disponibles à la vente</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button type="button"
                              onClick={() => {
                                if (nb <= 1) return;
                                const removedKey = `${st}_unit_${nb - 1}`;
                                setEtapeEntityImages((prev) => { const imgs = prev[removedKey] ?? []; imgs.forEach((img) => URL.revokeObjectURL(img.preview)); const next = { ...prev }; delete next[removedKey]; return next; });
                                setEtapeEntityCoverIdx((prev) => { const next = { ...prev }; delete next[removedKey]; return next; });
                                eSetUD(st, eGetUD(st).slice(0, -1));
                                if (eGetTab(st) >= nb - 1) eSetTab(st, nb - 2);
                                eSetNb(st, nb - 1);
                              }}
                              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center text-sm transition-colors">−</button>
                            <span className="text-base font-extrabold text-slate-800 w-6 text-center">{nb}</span>
                            <button type="button"
                              onClick={() => { eSetUD(st, [...eGetUD(st), {}]); eSetNb(st, nb + 1); }}
                              className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center text-sm transition-colors">+</button>
                          </div>
                        </div>
                      );
                    };

                    const renderEtapeUnitTabs = (st: string) => {
                      const nb = eGetNb(st);
                      const unitArr = eGetUD(st);
                      const activeI = eGetTab(st);
                      const config = OFFER_DETAIL_FIELDS[st];
                      const nameKey = config?.sections[0]?.fields.find((f) => f.key.startsWith('nom_'))?.key ?? '';
                      const uGet = (f: string) => unitArr[activeI]?.[f];
                      const uSet = (f: string, v: any) => { const a = [...unitArr]; a[activeI] = { ...(a[activeI] ?? {}), [f]: v }; eSetUD(st, a); };
                      const uMode = (uGet('availMode') as string) ?? 'specific';
                      const uWeekdays: number[] = (uGet('availWeekdays') as number[]) ?? [];
                      const uDates: string[] = (uGet('specificDates') as string[]) ?? [];
                      const uSaisons: string[] = (uGet('saisons') as string[]) ?? [];
                      return (
                        <>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {Array.from({ length: nb }, (_, i) => {
                              const unitName = (unitArr[i]?.[nameKey] as string) || null;
                              return (
                                <button key={i} type="button" onClick={() => eSetTab(st, i)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${activeI === i ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-500 hover:border-primary/30'}`}>
                                  {unitName || `${st.replace(/_/g, ' ')} ${i + 1}`}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mb-3 pb-3 border-b border-slate-200 space-y-3">
                            <div>
                              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Prix / nuit (TND)</label>
                              <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span><input type="number" min="0" placeholder="Ex : 380" value={(unitArr[activeI]?.prix_unite as string) ?? ""} onChange={(e) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), prix_unite: e.target.value }; eSetUD(st, arr); }} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                            </div>
                            <div>
                              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Max. personnes pour cette unité</label>
                              <input type="number" min="1" placeholder="Ex : 2" value={(unitArr[activeI]?.max_pers_unite as string) ?? ""} onChange={(e) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), max_pers_unite: e.target.value }; eSetUD(st, arr); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                            </div>
                            <div>
                              <button type="button"
                                onClick={() => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), acompte_requis: !(arr[activeI]?.acompte_requis ?? false) }; eSetUD(st, arr); }}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${unitArr[activeI]?.acompte_requis ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                                <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all ${unitArr[activeI]?.acompte_requis ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                                  {unitArr[activeI]?.acompte_requis && <Check size={9} className="text-white" />}
                                </div>
                                Acompte requis pour cette unité
                              </button>
                              {unitArr[activeI]?.acompte_requis && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <select value={(unitArr[activeI]?.type_acompte as string) ?? 'pourcentage'} onChange={(e) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), type_acompte: e.target.value }; eSetUD(st, arr); }} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                    <option value="pourcentage">% du prix</option>
                                    <option value="fixe">Montant fixe (DT)</option>
                                  </select>
                                  <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">{(unitArr[activeI]?.type_acompte ?? 'pourcentage') === 'pourcentage' ? '%' : 'DT'}</span>
                                    <input type="number" min="1" placeholder="30" value={(unitArr[activeI]?.valeur_acompte as string) ?? ""} onChange={(e) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), valeur_acompte: e.target.value }; eSetUD(st, arr); }} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          {renderEtapePhotoSection(`${st}_unit_${activeI}`, `Photos — ${(unitArr[activeI]?.[nameKey] as string) || `Unité ${activeI + 1}`}`)}
                          {renderEtapeFields(
                            st,
                            (key) => unitArr[activeI]?.[key],
                            (key, val) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), [key]: val }; eSetUD(st, arr); },
                          )}
                        </>
                      );
                    };

                    return (
                      <div className="space-y-4">
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase block">Détails spécifiques</label>
                        {etapeSubtypes.map((st) => (
                          <div key={st} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            {etapeSubtypes.length > 1 && (
                              <p className="text-[10px] font-black tracking-widest text-primary/70 uppercase mb-3">{st}</p>
                            )}
                            {isEtapeHeberg ? (
                              <>
                                {renderEtapePricingBloc(st)}
                                {renderEtapeNbUnites(st)}
                                {eGetNb(st) > 1
                                  ? renderEtapeUnitTabs(st)
                                  : (
                                    <>
                                      {renderEtapePhotoSection(`${st}_unit_0`, 'Photos de l\'offre')}
                                      {renderEtapeFields(
                                        st,
                                        (key) => (eGetUD(st)[0] ?? {})[key],
                                        (key, val) => { const arr = [...eGetUD(st)]; arr[0] = { ...(arr[0] ?? {}), [key]: val }; eSetUD(st, arr); },
                                      )}
                                    </>
                                  )
                                }
                              </>
                            ) : (
                              <>
                                {renderEtapePhotoSection(st, etapeSubtypes.length > 1 ? `Photos — ${st}` : 'Photos de l\'offre')}
                                {renderEtapeFields(
                                  st,
                                  (key) => (etapeSubtypeDetails[st] ?? {})[key],
                                  (key, val) => setEtapeSubtypeDetails((prev) => ({ ...prev, [st]: { ...(prev[st] ?? {}), [key]: val } })),
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── Bannières + toggle responsable + invite collaborateur ── */}
                  <>
                    {/* Bannière guidage (dès qu'un domaine est choisi) */}
                    {!isCircuitHebergSlot && etapeMode === "guidage" && etapeGuidageData.categorie && (
                      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">info</span>
                        <p className="text-xs font-semibold text-amber-800">Ce guidage sera assuré par un guide — invitez-le ci-dessous.</p>
                      </div>
                    )}

                    {/* Bannière service/hébergement (catégorie non dans activités) */}
                    {(!isCircuitHebergSlot ? (etapeMode === "service" && !!etapeCategorie) : true) && !selfPossible && (
                      <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">warning</span>
                        <p className="text-xs font-semibold text-amber-800">
                          {isCircuitHebergSlot
                            ? "L'hébergement n'est pas dans vos activités — vous devez inviter un prestataire hébergement."
                            : "Cette catégorie n'est pas dans vos activités — vous devez inviter un prestataire qualifié."}
                        </p>
                      </div>
                    )}

                    {/* Toggle Moi-même | Inviter prestataire (catégorie dans activités) */}
                    {(!isCircuitHebergSlot ? (etapeMode === "service" && !!etapeCategorie) : etapeSubtypes.length > 0) && selfPossible && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Responsable</label>
                        <div className="flex gap-2">
                          {([["self","Moi-même","person"],["provider","Inviter un prestataire","person_add"]] as const).map(([val, lbl, ico]) => (
                            <button key={val} type="button"
                              onClick={() => { setEtapeAuthorType(val as "self" | "provider"); if (val === "self") { setEtapeCollabSelected(null); setEtapeCollabSearch(""); setEtapeCollabResults([]); } }}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${etapeAuthorType === val ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                              <span className="material-symbols-outlined text-base">{ico}</span>{lbl}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Invite collaborateur */}
                    {showCollabSearch && (
                      etapeCollabSelected ? (
                        /* Badge collaborateur sélectionné */
                        <div className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-extrabold text-primary">{etapeCollabSelected.name.slice(0,1).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-slate-800 truncate">{etapeCollabSelected.name}</p>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${etapeCollabSelected.type === "guide" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                              {etapeCollabSelected.type === "guide" ? "Guide" : "Prestataire"}
                            </span>
                          </div>
                          <button type="button"
                            onClick={() => { setEtapeCollabSelected(null); setEtapeCollabPanelOpen(false); }}
                            className="w-7 h-7 rounded-full bg-white hover:bg-red-50 border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        /* Bouton "+ Inviter" style InviteButton */
                        <button type="button"
                          onClick={() => setEtapeCollabPanelOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group cursor-pointer">
                          <span className="material-symbols-outlined text-base group-hover:text-primary">person_add</span>
                          <span className="text-xs font-extrabold">+ Inviter un collaborateur pour cette étape</span>
                        </button>
                      )
                    )}

                    {/* Modal de sélection du collaborateur */}
                    <EtapeCollabPickerModal
                      open={etapeCollabPanelOpen}
                      filterMode={collabSearchMode}
                      token={token ?? ""}
                      etapeAvail={etapeConflictAvail}
                      onClose={() => setEtapeCollabPanelOpen(false)}
                      onSelect={(r) => { setEtapeCollabSelected(r); setEtapeCollabPanelOpen(false); }}
                    />
                  </>

                  {etapeFormError && <p className="text-xs font-semibold text-red-500">{etapeFormError}</p>}

                  <div className="flex flex-col gap-2 pt-1">
                    {!editingEtapeId && !isCircuitHebergSlot && (
                      <button type="button" onClick={() => addEtape(true)} className="w-full py-2 text-xs font-extrabold text-primary border-2 border-primary/30 hover:bg-primary/5 rounded-xl cursor-pointer">
                        + Ajouter et configurer une autre activité
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => { setEtapeFormOpen(false); resetEtapeForm(); }} className="flex-1 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">Annuler</button>
                      <button type="button" onClick={() => addEtape(false)} className="flex-1 py-2 text-xs font-extrabold text-white bg-primary hover:bg-primary/90 rounded-xl cursor-pointer">
                        <Check size={12} className="inline mr-1" />{isCircuitHebergSlot ? (editingEtapeId ? "Mettre à jour" : "Enregistrer") : (editingEtapeId ? "Mettre à jour" : "Ajouter")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

            {/* ── Circuit route map ── */}
            {(() => {
              const mappedPoints = (circuitEtapes as any[])
                .filter((e) => (e.lat != null && e.lng != null) || (e.collab_lat != null && e.collab_lng != null))
                .sort((a: any, b: any) => a.jour - b.jour)
                .map((e: any) => ({ jour: e.jour, lat: (e.lat ?? e.collab_lat) as number, lng: (e.lng ?? e.collab_lng) as number, destination: e.destination ?? e.collab_destination ?? "" }));
              const hbLat = (circuitHebergEtape as any)?.lat ?? (circuitHebergEtape as any)?.collab_lat;
              const hbLng = (circuitHebergEtape as any)?.lng ?? (circuitHebergEtape as any)?.collab_lng;
              const hb = (circuitHebergInclus && circuitHebergType === 'same' && hbLat && hbLng)
                ? { lat: hbLat as number, lng: hbLng as number, nom: (circuitHebergEtape as any)?.titre || (circuitHebergEtape as any)?.destination || 'Hébergement' }
                : undefined;
              if (mappedPoints.length === 0 && !hb) return null;
              return (
                <div className="space-y-2">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    Tracé du circuit
                  </p>
                  <CircuitRouteMap points={mappedPoints} hebergementPoint={hb} />
                </div>
              );
            })()}

            {circuitFormError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <span className="material-symbols-outlined text-red-500 text-base">error</span>
                <p className="text-sm font-semibold text-red-600">{circuitFormError}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
            {editingCircuit?.status === "approved" ? (
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="material-symbols-outlined text-emerald-500 text-base">lock</span>
                  <p className="text-xs font-bold text-emerald-700">Circuit publié — modification impossible. Supprimez-le si nécessaire.</p>
                </div>
                <button type="button" onClick={() => setCircuitModalOpen(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">Fermer</button>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => setCircuitModalOpen(false)} className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">Annuler</button>
                <button type="button" onClick={saveCircuit} disabled={circuitSaving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer">
                  {circuitSaving ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Sauvegarde…</> : <><Check size={14} />{editingCircuit ? "Enregistrer" : "Créer le circuit"}</>}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ══ ORG ACTIVITY DETAIL MODAL ════════════════════════════════════════ */}
    {viewOrgActivity && (() => {
      const act = viewOrgActivity;
      const meta = findProviderTypeMeta(act.category);
      const cat = getCategoryByValue(act.category);
      const isPrimary = act.level === "primary";
      const sliderImgs = Object.values(act.photos ?? {}).flat().filter(Boolean);
      const safeIdx = Math.min(orgActSliderIdx, Math.max(sliderImgs.length - 1, 0));
      const fields = (act.fields ?? {}) as Record<string, any>;

      function renderFieldValue(field: FieldConfig, val: any) {
        const isDocUrl = field.type === "url" || (typeof val === "string" && (val.startsWith("http") || val.startsWith("data:")));
        if (isDocUrl && typeof val === "string" && val.trim()) {
          return (
            <button onClick={() => openDoc(val)}
              className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 inline-flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span> Voir
            </button>
          );
        }
        if (typeof val === "boolean") return <span className="text-xs font-semibold text-slate-700">{val ? "Oui" : "Non"}</span>;
        if (Array.isArray(val)) return <span className="text-xs font-semibold text-slate-700">{val.join(", ")}</span>;
        return <span className="text-xs font-semibold text-slate-700">{String(val)}</span>;
      }

      // Build subtype blocks — each subtype has its own photos + sections
      const subtypeValues = act.subtypes ?? [];
      const knownFieldKeys = new Set<string>();
      const subtypeBlocks = subtypeValues.map((sv) => {
        const config = SUBTYPE_FIELDS[sv];
        if (!config) return null;
        const subtypePhotos = (act.photos ?? {})[sv]?.filter(Boolean) ?? [];
        const sections = config.sections.map((sec) => {
          const visibleFields = sec.fields.filter((f) => {
            if (fields[f.key] == null || fields[f.key] === "") return false;
            if (f.dependsOn && fields[f.dependsOn.field] !== f.dependsOn.value) return false;
            knownFieldKeys.add(f.key);
            return true;
          });
          return { ...sec, visibleFields };
        }).filter((s) => s.visibleFields.length > 0);
        if (!sections.length && !subtypePhotos.length) return null;
        return { sv, config, subtypePhotos, sections };
      }).filter(Boolean);

      // Orphan fields (not covered by any subtype config)
      const orphanFields = Object.entries(fields).filter(([k]) => !knownFieldKeys.has(k));

      return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewOrgActivity(null)}>
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* Cover */}
            <div className="relative h-52 w-full overflow-hidden shrink-0">
              <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
              {sliderImgs[0]
                ? <img src={sliderImgs[0]} alt={meta.label} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center opacity-20 select-none">
                    <span className="material-symbols-outlined" style={{ fontSize: 100 }}>{meta.categoryIcon}</span>
                  </div>
              }
              <button onClick={() => setViewOrgActivity(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60">
                <X size={16} />
              </button>
              <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow border ${isPrimary ? "bg-primary text-white border-white/20" : "bg-white/95 text-orange-500 border-orange-100"}`}>
                {isPrimary ? "Principale" : "Secondaire"}
              </div>
              <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-6">

              {/* Header */}
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">{meta.label}</h2>
                {act.years_experience != null && (
                  <p className="text-slate-400 text-sm mt-1">{act.years_experience} an{act.years_experience > 1 ? "s" : ""} d'expérience</p>
                )}
              </div>

              {/* Bloc par sous-type */}
              {subtypeBlocks.map((block) => {
                if (!block) return null;
                const stLabel = cat?.subtypes.find((s) => s.value === block.sv)?.label ?? block.config.label;
                return (
                  <div key={block.sv} className="rounded-2xl border border-slate-100 overflow-hidden">
                    {/* Subtype header */}
                    <div className="bg-primary/5 border-b border-primary/10 px-4 py-2.5 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>{meta.categoryIcon}</span>
                      <span className="text-sm font-extrabold text-primary">{stLabel}</span>
                    </div>

                    {/* Photos de ce sous-type */}
                    {block.subtypePhotos.length > 0 && (
                      <div className="p-4 border-b border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Photos</p>
                        <div className="grid grid-cols-3 gap-2">
                          {block.subtypePhotos.map((url, i) => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer group" onClick={() => openDoc(url)}>
                              <img src={url} alt={stLabel} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sections de champs */}
                    {block.sections.map((sec) => (
                      <div key={sec.section} className="p-4 border-b border-slate-50 last:border-0">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">{sec.section}</p>
                        <div className="space-y-2.5">
                          {sec.visibleFields.map((field) => {
                            const val = fields[field.key];
                            return (
                              <div key={field.key} className="flex items-start gap-3">
                                <span className="text-[11px] font-bold text-slate-500 min-w-[120px] leading-tight mt-0.5 flex-shrink-0">{field.label}</span>
                                <div className="flex-1">{renderFieldValue(field, val)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Champs orphelins (pas dans SUBTYPE_FIELDS) */}
              {orphanFields.length > 0 && (
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Autres informations</p>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {orphanFields.map(([key, val]) => {
                      const isUrl = typeof val === "string" && (val.startsWith("http") || val.startsWith("data:"));
                      return (
                        <div key={key} className="flex items-start gap-3">
                          <span className="text-[11px] font-bold text-slate-500 min-w-[120px] leading-tight mt-0.5 flex-shrink-0">{key.replace(/_/g, " ")}</span>
                          <div className="flex-1">
                            {isUrl ? (
                              <button onClick={() => openDoc(val)}
                                className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 inline-flex items-center gap-1">
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span> Voir
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-700">
                                {Array.isArray(val) ? val.join(", ") : typeof val === "boolean" ? (val ? "Oui" : "Non") : String(val)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Galerie complète (si pas de sous-types connus) */}
              {subtypeBlocks.length === 0 && sliderImgs.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Photos ({sliderImgs.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {sliderImgs.map((url, i) => (
                      <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100 cursor-pointer group" onClick={() => openDoc(url)}>
                        <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications de l'activité */}
              {act.certifications?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Certifications</p>
                  <div className="space-y-2">
                    {act.certifications.map((cert, ci) => (
                      <div key={ci} className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5">
                        <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 16 }}>verified</span>
                        <span className="text-sm font-bold text-slate-700 flex-1 min-w-0">{cert.name}</span>
                        {cert.document_url && (
                          <button onClick={() => openDoc(cert.document_url!)}
                            className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 shrink-0 inline-flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span> Voir
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {/* ══ ACTIVITY DETAIL / EDIT MODAL ═════════════════════════════════════ */}
    {actDetailOpen && viewActivity && (() => {
      const td = PROVIDER_ACTIVITY_TYPES.find((t) => t.value === viewActivity.category) ?? { label: viewActivity.category, icon: "category", gradient: "from-slate-400 to-slate-500" };
      const coverImg = actDetailMode === "edit"
        ? (actEditImages[actEditCoverIdx]?.src ?? null)
        : (viewActivity.photo ?? viewActivity.photos?.[0] ?? null);
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <button onClick={() => { setActDetailOpen(false); setActDetailMode("view"); }} className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"><X size={16} /></button>

            {/* Cover */}
            <div className="relative h-52 w-full overflow-hidden shrink-0">
              {coverImg ? <img src={coverImg} alt={viewActivity.title} className="w-full h-full object-cover" />
                : <><div className={`absolute inset-0 bg-gradient-to-br ${td.gradient} opacity-90`} /><span className="material-symbols-outlined text-white/25 absolute inset-0 flex items-center justify-center" style={{ fontSize: 110 }}>{td.icon}</span></>}
              <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow border ${viewActivity.level === "primary" ? "bg-primary text-white border-white/20" : "bg-white/95 text-slate-700 border-slate-100"}`}>
                {viewActivity.level === "primary" ? "Principale" : "Secondaire"}
              </div>
            </div>

            {actDetailMode === "view" ? (
              <>
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
                  <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight pr-8">{viewActivity.title}</h2>
                  <div className="flex flex-wrap gap-2.5">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-3 py-1.5 text-[11px] font-extrabold tracking-wider flex items-center gap-1.5 uppercase">
                      <span className="material-symbols-outlined text-sm leading-none">{td.icon}</span>{td.label}
                    </span>
                  </div>
                  {viewActivity.description && <div><p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Description</p><p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{viewActivity.description}</p></div>}
                  {viewActivity.region && <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold"><MapPin size={14} className="text-primary" />{viewActivity.region}</div>}
                  {viewActivity.phone && <div className="flex items-center gap-2 text-sm text-slate-600 font-semibold"><Phone size={14} className="text-amber-500" /><a href={`tel:${viewActivity.phone}`} className="hover:text-primary">{viewActivity.phone}</a></div>}
                  {viewActivity.website && <div className="flex items-center gap-2 text-sm font-semibold"><Globe size={14} className="text-teal-500" /><a href={viewActivity.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{viewActivity.website}</a></div>}
                  <p className="text-[11px] font-bold text-slate-400">Créée le {new Date(viewActivity.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                  <button onClick={() => { setActDetailOpen(false); setActDetailMode("view"); }} className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">Fermer</button>
                  <button onClick={() => setActDetailMode("edit")} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer"><Edit3 size={14} />Gérer</button>
                </div>
              </>
            ) : (
              <>
                <div className="px-8 pt-6 pb-4 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center"><Edit3 size={16} className="text-primary" /></div>
                    <div><h3 className="text-lg font-extrabold text-slate-800">Modifier l'activité</h3><p className="text-xs text-slate-400 line-clamp-1">{viewActivity.title}</p></div>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  <form onSubmit={handleSaveActivity} className="px-8 py-6 space-y-4">
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre *</label>
                      <input type="text" value={actEditForm.title} onChange={(e) => setActEditForm((f) => ({ ...f, title: e.target.value }))}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 ${actEditError && !actEditForm.title ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Type d'activité</label>
                      <div className="grid grid-cols-3 gap-2">
                        {PROVIDER_ACTIVITY_TYPES.map((t) => {
                          const active = actEditForm.category === t.value;
                          return (
                            <button key={t.value} type="button" onClick={() => setActEditForm((f) => ({ ...f, category: active ? "" : t.value }))}
                              className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-white"}`}>
                              <span className={`material-symbols-outlined text-lg ${active ? "text-primary" : "text-slate-400"}`}>{t.icon}</span>
                              <span className="text-[9px] font-extrabold leading-tight">{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {([["primary", "Principale"], ["secondary", "Secondaire"]] as const).map(([val, lbl]) => (
                        <button key={val} type="button" onClick={() => setActEditForm((f) => ({ ...f, level: val }))}
                          className={`py-2.5 px-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${actEditForm.level === val ? "bg-primary/10 border-primary" : "bg-slate-50 border-slate-200 hover:border-primary/40"}`}>
                          <p className={`text-xs font-extrabold ${actEditForm.level === val ? "text-primary" : "text-slate-700"}`}>{lbl}</p>
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description</label>
                      <textarea rows={3} value={actEditForm.description} onChange={(e) => setActEditForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Région</label>
                        <input type="text" value={actEditForm.region} onChange={(e) => setActEditForm((f) => ({ ...f, region: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Téléphone</label>
                        <input type="tel" value={actEditForm.phone} onChange={(e) => setActEditForm((f) => ({ ...f, phone: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos</label>
                      {actEditImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {actEditImages.map((img, i) => (
                            <div key={i} onClick={() => setActEditCoverIdx(i)} className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${i === actEditCoverIdx ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                              <img src={img.src} alt="" className="w-full h-full object-cover" />
                              {i === actEditCoverIdx && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">Cover</div>}
                              <button type="button" onClick={(e) => { e.stopPropagation(); setActEditImages((prev) => prev.filter((_, idx) => idx !== i)); setActEditCoverIdx((c) => c >= i && c > 0 ? c - 1 : c); }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label htmlFor="act-edit-images" className="flex flex-col items-center justify-center gap-1.5 w-full h-16 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                        <span className="material-symbols-outlined text-slate-300 text-xl">add_photo_alternate</span>
                        <p className="text-xs font-semibold text-slate-400">Ajouter des photos</p>
                        <input id="act-edit-images" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (!files.length) return; setActEditImages((prev) => [...prev, ...files.map((f) => ({ src: URL.createObjectURL(f), file: f }))]); e.target.value = ""; }} />
                      </label>
                    </div>
                    {actEditError && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl"><span className="material-symbols-outlined text-red-500 text-base">error</span><p className="text-sm font-semibold text-red-600">{actEditError}</p></div>}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setActDetailMode("view")} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"><ChevronLeft size={14} />Retour</button>
                        <button type="button" onClick={handleDeleteActivity} disabled={actDeleting} className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-red-500 hover:bg-red-50 font-bold text-xs transition-colors disabled:opacity-50"><span className="material-symbols-outlined text-base">delete</span>{actDeleting ? "Suppression…" : "Supprimer"}</button>
                      </div>
                      <button type="submit" disabled={actEditSaving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer">
                        {actEditSaving ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Sauvegarde…</> : <><Send size={14} />Enregistrer</>}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      );
    })()}

    {/* ══ ACTIVITY SUSTAINABILITY QUESTIONNAIRE ════════════════════════════ */}
    {aqOpen && (() => {
      const aqScore = Object.values(aqAnswers).reduce((s, v) => s + v, 0);
      const aqCurrentStep = ACTIVITY_SUSTAINABILITY_STEPS[aqStep];
      const aqStepAnswered = aqCurrentStep ? aqCurrentStep.questions.every((q) => q.id in aqAnswers) : false;
      return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Évaluation de durabilité — Activité</p>
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                {aqStep < ACTIVITY_SUSTAINABILITY_STEPS.length ? <>{ACTIVITY_SUSTAINABILITY_STEPS[aqStep].emoji} {ACTIVITY_SUSTAINABILITY_STEPS[aqStep].category}</> : "🎯 Résultat"}
              </h2>
              {aqStep < ACTIVITY_SUSTAINABILITY_STEPS.length && <p className="text-sm text-slate-500 mt-1">{ACTIVITY_SUSTAINABILITY_STEPS[aqStep].description}</p>}
              <div className="flex gap-1.5 mt-4">
                {ACTIVITY_SUSTAINABILITY_STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < aqStep ? "bg-primary" : i === aqStep ? "bg-primary/60" : "bg-slate-100"}`} />
                ))}
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1.5">{aqStep < ACTIVITY_SUSTAINABILITY_STEPS.length ? `Étape ${aqStep + 1} / ${ACTIVITY_SUSTAINABILITY_STEPS.length}` : "Toutes les étapes complétées"}</p>
            </div>
            <div className="overflow-y-auto flex-1 px-7 py-5">
              {aqStep < ACTIVITY_SUSTAINABILITY_STEPS.length ? (
                <div className="space-y-5">
                  {ACTIVITY_SUSTAINABILITY_STEPS[aqStep].questions.map((q) => (
                    <div key={q.id}>
                      <p className="text-sm font-bold text-slate-700 mb-2">{q.text}</p>
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <button key={opt.label} onClick={() => setAqAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                            className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${aqAnswers[q.id] === opt.value ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    {aqStep > 0 && <button onClick={() => setAqStep((s) => s - 1)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"><ChevronLeft size={16} />Précédent</button>}
                    <button onClick={() => { if (aqStep === ACTIVITY_SUSTAINABILITY_STEPS.length - 1) { setAqStep((s) => s + 1); submitActivityQuestionnaire(); } else { setAqStep((s) => s + 1); } }} disabled={!aqStepAnswered}
                      className={`flex-1 py-3 font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${aqStepAnswered ? "bg-primary text-slate-900 hover:bg-primary/90" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}>
                      {aqStep === ACTIVITY_SUSTAINABILITY_STEPS.length - 1 ? "Voir mon score" : "Suivant"}<ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {(() => {
                    const level = getActivitySustainabilityLevel(aqScore);
                    return (
                      <>
                        <div className="relative w-32 h-32 mx-auto mb-5">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 50}`} strokeDashoffset={`${2 * Math.PI * 50 * (1 - aqScore / 100)}`} className="text-primary transition-all duration-1000" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-black text-slate-900">{aqScore}</span><span className="text-xs font-bold text-slate-400">/100</span></div>
                        </div>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${level.bg} mb-3`}>
                          <span className="text-base">{level.emoji}</span>
                          <span className={`font-extrabold text-sm ${level.color}`}>{level.label}</span>
                        </div>
                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">{aqScore >= 71 ? "Excellente activité éco-responsable !" : aqScore >= 51 ? "Votre activité est sur la bonne voie !" : "Identifiez les axes d'amélioration."}</p>
                        <button onClick={() => setAqOpen(false)} disabled={aqSaving} className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-xl hover:bg-primary/90 transition-colors">{aqSaving ? "Enregistrement…" : "Fermer"}</button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {netReport && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><Flag size={16} className="text-red-500" /></div>
            <div><p className="font-extrabold text-slate-800 text-sm">Signaler {netReport.name}</p><p className="text-xs text-slate-400">Choisissez un motif</p></div>
          </div>
          <div className="space-y-2 mb-5">
            {NET_REPORT_REASONS.map((r) => (
              <button key={r} onClick={() => setNetReportReason(r)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${netReportReason === r ? "bg-red-50 border-red-300 text-red-700" : "border-slate-100 text-slate-600 hover:bg-slate-50"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setNetReport(null); setNetReportReason(""); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Annuler</button>
            <button onClick={handleNetReport} disabled={!netReportReason || netReportSending} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50">{netReportSending ? "Envoi…" : "Signaler"}</button>
          </div>
        </div>
      </div>
    )}
    <div className="min-h-screen bg-slate-50/70 pb-20" onClick={() => setNetMenuId(null)}>

      {/* ══ TOP NAV ══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/provider")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft size={16} />
            Retour
          </button>
          <div className="flex items-center gap-2 text-slate-900">
            <Leaf className="text-primary w-6 h-6" />
            <span className="text-base font-extrabold tracking-tight">Éco-Voyage</span>
          </div>
        </div>
      </div>

      {/* ══ EDIT PROFILE MODAL ═══════════════════════════════════════════════ */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
            <button onClick={closeEditProfile}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
              <X size={16} />
            </button>

            <div className="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Edit3 size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Modifier le profil</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Mettez à jour vos informations personnelles</p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <form id="edit-profile-form" onSubmit={handleSaveProfile} className="px-8 py-6 space-y-5">

                {/* Cover photo */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photo de couverture</label>
                  <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 border-2 border-dashed border-slate-200 group">
                    {editProfileCover ? (
                      <img src={editProfileCover.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                        <p className="text-xs font-semibold text-slate-400">Ajouter une photo de couverture</p>
                      </div>
                    )}
                    <label htmlFor="cover-upload"
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer">
                      <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 text-3xl transition-opacity">edit</span>
                    </label>
                    <input id="cover-upload" type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (editProfileCover?.file) URL.revokeObjectURL(editProfileCover.preview);
                        setEditProfileCover({ file, preview: URL.createObjectURL(file) });
                        e.target.value = "";
                      }}
                    />
                    {editProfileCover && (
                      <button type="button"
                        onClick={() => { if (editProfileCover.file) URL.revokeObjectURL(editProfileCover.preview); setEditProfileCover(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile photo */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photo de profil</label>
                  <div className="flex items-center gap-4">
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                        {editProfilePhoto
                          ? <img src={editProfilePhoto.preview} alt="" className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined text-slate-300 text-4xl">person</span>
                        }
                      </div>
                      <label htmlFor="photo-upload"
                        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 text-xl transition-opacity">edit</span>
                      </label>
                      <input id="photo-upload" type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (editProfilePhoto?.file) URL.revokeObjectURL(editProfilePhoto.preview);
                          setEditProfilePhoto({ file, preview: URL.createObjectURL(file) });
                          e.target.value = "";
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="photo-upload" className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-base">upload</span>Changer la photo
                      </label>
                      {editProfilePhoto && (
                        <button type="button"
                          onClick={() => { if (editProfilePhoto.file) URL.revokeObjectURL(editProfilePhoto.preview); setEditProfilePhoto(null); }}
                          className="block text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">
                          Supprimer la photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full name */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Nom complet *</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
                    <input type="text" placeholder="Ahmed Ben Ali"
                      value={editProfileForm.full_name}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Présentation <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <textarea rows={3} placeholder="Prestataire spécialisé dans l'écotourisme en Tunisie…"
                    value={editProfileForm.bio}
                    onChange={(e) => setEditProfileForm((f) => ({ ...f, bio: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* Country + Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Pays</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">public</span>
                      <select value={editProfileForm.country}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, country: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white appearance-none">
                        <option value="">Sélectionner</option>
                        <option value="TN">Tunisie</option>
                        <option value="MA">Maroc</option>
                        <option value="DZ">Algérie</option>
                        <option value="FR">France</option>
                        <option value="OTHER">Autre</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Langue</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">translate</span>
                      <select value={editProfileForm.language}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, language: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white appearance-none">
                        <option value="">Sélectionner</option>
                        <option value="fr">Français</option>
                        <option value="ar">Arabe</option>
                        <option value="en">Anglais</option>
                        <option value="es">Espagnol</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Organisation */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Entreprise / Structure <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">business</span>
                    <input type="text" placeholder="Éco-Voyage, Éco-Lodge Djerba…"
                      value={editProfileForm.organization}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, organization: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Poste <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">work</span>
                    <input type="text" placeholder="Directeur(trice), Gérant(e), Responsable…"
                      value={editProfileForm.position}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, position: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Téléphone <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">phone</span>
                    <input type="tel" placeholder="+216 12 345 678"
                      value={editProfileForm.phone}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* Provider type */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Type de prestataire <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {PROVIDER_TYPES.map((t) => {
                      const active = editProfileForm.provider_type === t.value;
                      return (
                        <button key={t.value} type="button"
                          onClick={() => setEditProfileForm((f) => ({ ...f, provider_type: active ? "" : t.value }))}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-white"}`}>
                          <span className={`material-symbols-outlined text-xl ${active ? "text-primary" : "text-slate-400"}`}>{t.icon}</span>
                          <span className="text-[10px] font-extrabold leading-tight">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Region + Website */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Région <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">location_on</span>
                      <input type="text" placeholder="Tunis, Sfax, Djerba…"
                        value={editProfileForm.region}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, region: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Années d'exp. <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">workspace_premium</span>
                      <input type="number" min="0" max="50" placeholder="Ex : 5"
                        value={editProfileForm.years_experience}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, years_experience: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Site web <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">public</span>
                    <input type="url" placeholder="https://mon-ecolodge.tn"
                      value={editProfileForm.website}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, website: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* Primary activities */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Activités principales <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {PROVIDER_ACTIVITY_TYPES.map((t) => {
                      const active = editProfileActivities.includes(t.value);
                      return (
                        <button key={t.value} type="button"
                          onClick={() => setEditProfileActivities((prev) =>
                            active ? prev.filter((v) => v !== t.value) : [...prev, t.value]
                          )}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-white"}`}>
                          <span className={`material-symbols-outlined text-xl ${active ? "text-primary" : "text-slate-400"}`}>{t.icon}</span>
                          <span className="text-[10px] font-extrabold leading-tight">{t.label}</span>
                          {active && <span className="text-[9px] text-primary font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary activities */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Activités secondaires <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {PROVIDER_ACTIVITY_TYPES.map((t) => {
                      const active = editProfileSecActivities.includes(t.value);
                      return (
                        <button key={t.value} type="button"
                          onClick={() => setEditProfileSecActivities((prev) =>
                            active ? prev.filter((v) => v !== t.value) : [...prev, t.value]
                          )}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${active ? "bg-slate-700/10 border-slate-500 text-slate-800 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-white"}`}>
                          <span className={`material-symbols-outlined text-xl ${active ? "text-slate-600" : "text-slate-400"}`}>{t.icon}</span>
                          <span className="text-[10px] font-extrabold leading-tight">{t.label}</span>
                          {active && <span className="text-[9px] text-slate-600 font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editProfileError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <span className="material-symbols-outlined text-red-500 text-base">error</span>
                    <p className="text-sm font-semibold text-red-600">{editProfileError}</p>
                  </div>
                )}
              </form>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={closeEditProfile}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button type="submit" form="edit-profile-form" disabled={editProfileSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60">
                {editProfileSaving
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Enregistrement…</>
                  : <><Check size={14} />Enregistrer</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PUBLISH OFFER MODAL ══════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <button onClick={closeModal}
              className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors">
              <X size={16} />
            </button>
            <div className="px-8 pt-8 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    {offerEditMode ? "Modifier l'offre" : "Publier une offre éco"}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">{PROVIDER_STEPS[offerStep - 1].title}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{PROVIDER_STEPS[offerStep - 1].subtitle}</span>
                <span className="text-xs font-black text-slate-400">{offerStep}/{PROVIDER_STEPS.length}</span>
              </div>
              <div className="flex gap-1 mt-3">
                {PROVIDER_STEPS.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => s.id < offerStep && setOfferStep(s.id)}
                    className={`flex-1 h-1 rounded-full transition-all duration-300 ${s.id < offerStep ? "bg-primary cursor-pointer" : s.id === offerStep ? "bg-primary" : "bg-slate-200"}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-8 py-6 space-y-5">

                {/* ── ÉTAPE 1 : PRÉSENTATION ───────────────────────────── */}
                {/* Lier à une activité */}
                {offerStep === 1 && orgActivities.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Lier à une activité</label>
                    <div className="grid grid-cols-2 gap-2">
                      {orgActivities.map((act) => {
                        const selected = offerActivity?.id === act.id;
                        const meta = findProviderTypeMeta(act.category);
                        return (
                          <button key={act.id} type="button"
                            onClick={() => {
                              const resetUnits = () => {
                                setEntityImages((prev) => { Object.values(prev).flat().forEach((img) => URL.revokeObjectURL(img.preview)); return {}; });
                                setEntityCoverIdx({});
                                setOfferNbUnites(1); setUnitDetailsArray([{}]); setActiveUnitTab(0);
                                setSubtypeNbUnites({}); setSubtypeUnitDetails({}); setActiveSubtypeTab({});
                              };
                              if (selected) {
                                setOfferActivity(null); setOfferSubtypes([]); setOfferMode("single"); setConstraintError("");
                                resetUnits();
                              } else {
                                setOfferActivity(act); setOfferSubtypes([]); setOfferMode("single"); setConstraintError("");
                                resetUnits();
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-xs font-bold ${selected ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary/30 hover:bg-white"}`}>
                            <span className={`material-symbols-outlined text-base ${selected ? "text-primary" : "text-slate-400"}`}>{meta.categoryIcon}</span>
                            <span className="truncate">{meta.label}</span>
                            {selected && <Check size={12} className="ml-auto text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── ÉTAPE 3 : SOUS-TYPES ─────────────────────────────── */}
                {offerStep === 3 && offerActivity && offerActivity.subtypes && offerActivity.subtypes.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Sous-type d'offre</label>
                    <div className="flex flex-wrap gap-2">
                      {offerActivity.subtypes.map((st) => {
                        const active = offerSubtypes.includes(st);
                        return (
                          <button key={st} type="button"
                            onClick={() => {
                              if (active) {
                                // Désélection — nettoyer les photos de ce sous-type
                                setEntityImages((prev) => {
                                  const imgs = prev[st] ?? [];
                                  imgs.forEach((img) => URL.revokeObjectURL(img.preview));
                                  const next = { ...prev };
                                  delete next[st];
                                  return next;
                                });
                                setEntityCoverIdx((prev) => { const next = { ...prev }; delete next[st]; return next; });
                              }
                              setOfferSubtypes((prev) => {
                                const next = active ? prev.filter((s) => s !== st) : [...prev, st];
                                if (next.length > 1) setOfferMode("variant");
                                else setOfferMode("single");
                                return next;
                              });
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-primary text-white border-primary" : "bg-slate-100 border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                            {st}
                          </button>
                        );
                      })}
                    </div>
                    {offerSubtypes.length > 1 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          { value: "variant", label: "Variante", desc: "Le voyageur choisit son sous-type" },
                          { value: "package", label: "Package",  desc: "Tous les sous-types inclus" },
                        ].map((m) => (
                          <button key={m.value} type="button" onClick={() => setOfferMode(m.value as "variant" | "package")}
                            className={`flex flex-col items-start px-3 py-2.5 rounded-xl border-2 text-xs transition-all ${offerMode === m.value ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-primary/30"}`}>
                            <span className="font-extrabold">{m.label}</span>
                            <span className="text-[10px] font-medium text-slate-400 mt-0.5">{m.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nb d'unités : maintenant intégré dans chaque carte de sous-type */}

                {/* Titre / Descriptions — Étape 1 */}
                {offerStep === 1 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre de l'offre *</label>
                    <input type="text" placeholder="Ex : Séjour éco en forêt de Mogods"
                      value={form.title}
                      onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setTitleError(""); }}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:font-normal ${titleError ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
                    />
                    {titleError && <p className="text-xs font-semibold text-red-500 mt-1">{titleError}</p>}
                  </div>
                )}
                {offerStep === 1 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">
                      Description courte * <span className="normal-case font-medium text-slate-300">({offerDescCourte.length}/160)</span>
                    </label>
                    <textarea rows={2} placeholder="Accroche courte visible dans les résultats de recherche…"
                      value={offerDescCourte} maxLength={160}
                      onChange={(e) => setOfferDescCourte(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                    />
                  </div>
                )}
                {offerStep === 1 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description détaillée</label>
                    <textarea rows={4} placeholder="Décrivez le concept écologique, les activités durables et l'expérience proposée…"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                    />
                  </div>
                )}

                {/* Photo de couverture — Étape 1 */}
                {offerStep === 1 && <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photo de couverture</label>
                  {publishExistingImages.length === 0 && publishImages.length === 0 ? (
                    <label htmlFor="publish-cover-input"
                      className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                      <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                      <p className="text-xs font-semibold text-slate-400">Cliquez pour ajouter une photo de couverture</p>
                      <input id="publish-cover-input" type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          setPublishImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {/* Images déjà uploadées (existantes) */}
                        {publishExistingImages.map((url, i) => (
                          <div key={`ex-${i}`}
                            className={`relative group w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === 0 && publishImages.length === 0 ? "border-primary shadow-md" : "border-slate-200"}`}>
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            {i === 0 && publishImages.length === 0 && (
                              <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>
                            )}
                            <button type="button"
                              onClick={() => setPublishExistingImages((prev) => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {/* Nouvelles images ajoutées */}
                        {publishImages.map((img, i) => {
                          const isCover = publishExistingImages.length === 0 && i === publishCoverIdx;
                          return (
                            <div key={`new-${i}`} onClick={() => { if (publishExistingImages.length === 0) setPublishCoverIdx(i); }}
                              className={`relative group w-20 h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                              <img src={img.preview} alt="" className="w-full h-full object-cover" />
                              {isCover && (
                                <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>
                              )}
                              <button type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  URL.revokeObjectURL(img.preview);
                                  setPublishImages((prev) => prev.filter((_, idx) => idx !== i));
                                  setPublishCoverIdx((c) => (c >= i && c > 0 ? c - 1 : c));
                                }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={10} />
                              </button>
                            </div>
                          );
                        })}
                        <label htmlFor="publish-cover-input"
                          className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                          <span className="material-symbols-outlined text-slate-300 text-2xl">add</span>
                          <input id="publish-cover-input" type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              setPublishImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      {(publishExistingImages.length + publishImages.length) > 1 && publishExistingImages.length === 0 && (
                        <p className="text-[10px] text-slate-400 font-medium mt-2">Cliquez sur une nouvelle photo pour la définir comme couverture.</p>
                      )}
                    </>
                  )}
                </div>}

                {/* ── Public ciblé — Étape 1 ─────────────────────────── */}
                {offerStep === 1 && <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Public ciblé</label>
                  <div className="flex flex-wrap gap-2">
                    {PUBLIC_RECOMMANDE.map((p) => {
                      const active = offerPublicCible.includes(p.value);
                      return (
                        <button key={p.value} type="button"
                          onClick={() => setOfferPublicCible((prev) => active ? prev.filter((x) => x !== p.value) : [...prev, p.value])}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-primary text-white border-primary" : "bg-slate-100 border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                          <span className="material-symbols-outlined text-sm">{p.icon}</span>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>}

                {/* ── ÉTAPE 2 : LOCALISATION ───────────────────────────── */}
                {offerStep === 2 && offerActivity && (() => {
                  const flat = Object.values(offerActivity.fields ?? {}).reduce<Record<string, any>>((a, s) => ({ ...a, ...s }), {});
                  const langs: string[] = flat.langues_guides ?? flat.langues ?? flat.langues_accueil ?? [];
                  if (!langs.length) return null;
                  return (
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Langue de l'offre *</label>
                      <select value={offerLangue} onChange={(e) => setOfferLangue(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white">
                        <option value="">— Sélectionner —</option>
                        {langs.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  );
                })()}
                {offerStep === 2 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">
                      Localisation <span className="text-red-500">*</span>
                    </label>
                    <MapPicker
                      lat={publishMapLat} lng={publishMapLng}
                      onPick={(lat, lng, address) => {
                        setPublishMapLat(lat); setPublishMapLng(lng);
                        const regionPart = address.split(",").slice(-2).join(",").trim();
                        setForm((f) => ({ ...f, meeting_point: address, region: regionPart }));
                        setOfferLocationDesc((prev) => prev.trim() ? prev : address);
                      }}
                    />
                  </div>
                )}
                {offerStep === 2 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">
                      Description de la localisation <span className="text-red-500">*</span>
                    </label>
                    <textarea rows={3}
                      placeholder="Décrivez l'emplacement, l'accès, les points de repère…"
                      value={offerLocationDesc}
                      onChange={(e) => setOfferLocationDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                    />
                  </div>
                )}
                {/* ── ÉTAPE 1 : TYPE DE PRESTATION ──────────────────────── */}
                {offerStep === 1 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Type de prestation <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      {TYPE_PRESTATION_PROVIDER.map((tp) => {
                        const active = offerTypePrestation === tp.value;
                        return (
                          <button key={tp.value} type="button"
                            onClick={() => setOfferTypePrestation(active ? null : tp.value)}
                            className={`relative flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-xs font-bold transition-all duration-150 text-left ${active ? "bg-primary/10 border-primary shadow-sm" : "border-slate-100 bg-white hover:border-primary/30 hover:bg-slate-50/60 text-slate-600"}`}>
                            {active && (
                              <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <Check size={9} className="text-slate-900" strokeWidth={3} />
                              </span>
                            )}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${active ? "bg-primary" : "bg-slate-100"}`}>
                              <span className={`material-symbols-outlined text-lg ${active ? "text-slate-900" : "text-slate-400"}`}>{tp.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0 pr-4">
                              <p className={`font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>{tp.label}</p>
                              <p className={`text-[10px] mt-0.5 leading-tight ${active ? "text-primary/70" : "text-slate-400"}`}>{tp.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* ── ÉTAPE 5 : CE QUE VOUS FOURNISSEZ ─────────────────── */}
                {offerStep === 5 && (() => {
                  const tp = offerTypePrestation;
                  const showTransport    = tp !== null && ["avec_transport", "transport_repas", "immersion", "sur_mesure"].includes(tp);
                  const showRepas       = tp !== null && ["transport_repas", "immersion", "sur_mesure"].includes(tp);
                  const showHebergement = tp !== null && ["immersion", "sur_mesure"].includes(tp);
                  const isSurMesure     = tp === "sur_mesure";
                  const activeCollab  = (s: CollabSection) =>
                    providerOfferCollabs.find((c) => c.section === s && c.status !== "declined") ?? null;
                  const transportCollab   = activeCollab("transport");
                  const restaurationCollab = activeCollab("restauration");

                  // Activités déclarées par le prestataire (principale + secondaire)
                  const myActivities = new Set([
                    ...(profile?.activity_types ?? []),
                    ...(profile?.secondary_activity_types ?? []),
                  ]);
                  const canFill = (cat: string) => myActivities.has(cat);

                  // Bloc "invitation obligatoire" pour les sections hors activité du prestataire
                  function InviteRequiredProv({ section, icon, message }: { section: CollabSection; icon: string; message: string }) {
                    return (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">{icon}</span>
                          <p className="text-xs font-semibold text-amber-700">{message}</p>
                        </div>
                        <InviteButton section={section} onInvite={handleProviderInvite} loading={providerCollabSaving} />
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* Récap prestation */}
                      {tp ? (
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Prestation :</span>
                          <span className="px-2.5 py-1 bg-primary/10 rounded-full text-[10px] font-extrabold text-primary">
                            {TYPE_PRESTATION_PROVIDER.find((o) => o.value === tp)?.label}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                          <span className="material-symbols-outlined text-amber-500 text-base">info</span>
                          <p className="text-xs font-semibold text-amber-700">Aucun type de prestation sélectionné — retournez à l'étape 1.</p>
                        </div>
                      )}

                      {/* Transport */}
                      {showTransport && (
                        <div className="space-y-3">
                          {isSurMesure && (
                            <Bool label="Transport inclus dans cette offre" icon="directions_car"
                              value={providerTransportInclus}
                              onChange={(v) => setProviderTransportInclus(v)} />
                          )}
                          {(!isSurMesure || providerTransportInclus === true) && (
                            transportCollab ? (
                              <div className="space-y-2">
                                <SectionLockedBanner collab={transportCollab} onKick={transportCollab.id ? () => kickProviderCollab(transportCollab.id!) : undefined} />
                                <div className="pointer-events-none select-none opacity-70 space-y-3">
                                  <PrestSubBlock title="Transport Éco" icon="electric_bike" subtypes={TRANSPORT_ECO_SUBTYPES}
                                    sousType={providerTransportEcoST} details={providerTransportEcoDet}
                                    onSousType={() => {}} onDetails={() => {}} />
                                  <PrestSubBlock title="Transport" icon="directions_car" subtypes={TRANSPORT_STD_SUBTYPES}
                                    sousType={providerTransportStdST} details={providerTransportStdDet}
                                    onSousType={() => {}} onDetails={() => {}} />
                                </div>
                              </div>
                            ) : canFill("transport") || canFill("transport_eco") ? (
                              <>
                                <PrestSubBlock
                                  title="Transport Éco" icon="electric_bike"
                                  subtypes={TRANSPORT_ECO_SUBTYPES}
                                  sousType={providerTransportEcoST}
                                  details={providerTransportEcoDet}
                                  onSousType={(v) => { setProviderTransportEcoST(v); setProviderTransportEcoDet({}); }}
                                  onDetails={(k, v) => setProviderTransportEcoDet((prev) => ({ ...prev, [k]: v }))}
                                />
                                <PrestSubBlock
                                  title="Transport" icon="directions_car"
                                  subtypes={TRANSPORT_STD_SUBTYPES}
                                  sousType={providerTransportStdST}
                                  details={providerTransportStdDet}
                                  onSousType={(v) => { setProviderTransportStdST(v); setProviderTransportStdDet({}); }}
                                  onDetails={(k, v) => setProviderTransportStdDet((prev) => ({ ...prev, [k]: v }))}
                                />
                                <InviteButton section="transport" onInvite={handleProviderInvite} loading={providerCollabSaving} />
                              </>
                            ) : (
                              <InviteRequiredProv section="transport" icon="directions_car"
                                message="Le transport n'est pas votre activité principale ni secondaire — invitez un prestataire de transport pour compléter cette section." />
                            )
                          )}
                        </div>
                      )}

                      {/* Restauration */}
                      {showRepas && (
                        <div className="space-y-3">
                          {isSurMesure && (
                            <Bool label="Repas inclus dans cette offre" icon="restaurant"
                              value={providerRepasFlag}
                              onChange={(v) => { setProviderRepasFlag(v); if (!v) { setProviderRepasMode("prestataire"); setProviderRepasGastroExp(""); setProviderRepasGastroDet({}); setProviderRepasST(""); setProviderRepasDet({}); } }} />
                          )}
                          {(!isSurMesure || providerRepasFlag === true) && (() => {
                            const repasData: RepasBlockData = { mode: providerRepasMode, gastroExpertise: providerRepasGastroExp, gastroDet: providerRepasGastroDet, prestSousType: providerRepasST, prestDet: providerRepasDet };
                            const onRepasUpdate = (patch: Partial<RepasBlockData>) => {
                              if (patch.mode !== undefined) setProviderRepasMode(patch.mode);
                              if (patch.gastroExpertise !== undefined) setProviderRepasGastroExp(patch.gastroExpertise);
                              if (patch.gastroDet !== undefined) setProviderRepasGastroDet(patch.gastroDet);
                              if (patch.prestSousType !== undefined) setProviderRepasST(patch.prestSousType);
                              if (patch.prestDet !== undefined) setProviderRepasDet(patch.prestDet);
                            };
                            const repasGuidageSlot = (
                              <InviteRequiredProv section="restauration" icon="hiking"
                                message="Le guidage gastronomique sera assuré par un guide — invitez-le pour compléter cette section." />
                            );
                            const repasPrestSlot = canFill("restaurant_terroir") ? undefined : (
                              <InviteRequiredProv section="restauration" icon="restaurant"
                                message="La restauration n'est pas votre activité principale ni secondaire — invitez un restaurateur pour compléter cette section." />
                            );
                            return restaurationCollab ? (
                              <div className="space-y-2">
                                <SectionLockedBanner collab={restaurationCollab} onKick={restaurationCollab.id ? () => kickProviderCollab(restaurationCollab.id!) : undefined} />
                                <div className="pointer-events-none select-none opacity-70">
                                  <RepasBlock data={repasData} onUpdate={() => {}} />
                                </div>
                              </div>
                            ) : (
                              <RepasBlock data={repasData} onUpdate={onRepasUpdate}
                                guidageSlot={repasGuidageSlot}
                                prestataireSlot={repasPrestSlot}
                              />
                            );
                          })()}
                        </div>
                      )}

                      {/* Hébergement */}
                      {showHebergement && (() => {
                        const hebergementCollab = activeCollab("hebergement");
                        return (
                          <div className="space-y-3">
                            {isSurMesure && (
                              <Bool label="Hébergement inclus dans cette offre" icon="hotel"
                                value={providerHebergementInclus}
                                onChange={(v) => { setProviderHebergementInclus(v); if (!v) { setProviderHebergementST(""); setProviderHebergementDet({}); } }} />
                            )}
                            {(!isSurMesure || providerHebergementInclus === true) && (
                              hebergementCollab ? (
                                <div className="space-y-2">
                                  <SectionLockedBanner collab={hebergementCollab} onKick={hebergementCollab.id ? () => kickProviderCollab(hebergementCollab.id!) : undefined} />
                                  <div className="pointer-events-none select-none opacity-70">
                                    <PrestSubBlock title="Hébergement" icon="hotel" subtypes={HEBERGEMENT_PREST_SUBTYPES}
                                      sousType={providerHebergementST} details={providerHebergementDet}
                                      onSousType={() => {}} onDetails={() => {}} />
                                  </div>
                                </div>
                              ) : canFill("hebergement") ? (
                                <>
                                  <PrestSubBlock title="Hébergement" icon="hotel" subtypes={HEBERGEMENT_PREST_SUBTYPES}
                                    sousType={providerHebergementST} details={providerHebergementDet}
                                    onSousType={(v) => { setProviderHebergementST(v); setProviderHebergementDet({}); }}
                                    onDetails={(k, v) => setProviderHebergementDet((prev) => ({ ...prev, [k]: v }))} />
                                  <InviteButton section="hebergement" onInvite={handleProviderInvite} loading={providerCollabSaving} />
                                </>
                              ) : (
                                <InviteRequiredProv section="hebergement" icon="hotel"
                                  message="L'hébergement n'est pas votre activité principale ni secondaire — invitez un hébergeur pour compléter cette section." />
                              )
                            )}
                          </div>
                        );
                      })()}

                      {/* Autre service */}
                      {isSurMesure && (() => {
                        const autreServiceCollab = activeCollab("autre_service");
                        const autreData: AutreServiceBlockData = { categorie: providerAutreServiceCat, sousType: providerAutreServiceST, details: providerAutreServiceDet };
                        const onAutreUpdate = (patch: Partial<AutreServiceBlockData>) => {
                          if (patch.categorie !== undefined) setProviderAutreServiceCat(patch.categorie);
                          if (patch.sousType  !== undefined) setProviderAutreServiceST(patch.sousType);
                          if (patch.details   !== undefined) setProviderAutreServiceDet(patch.details);
                        };
                        return (
                          <div className="space-y-3">
                            <Bool label="Autre service inclus dans cette offre" icon="add_circle"
                              value={providerAutreServiceInclus}
                              onChange={(v) => { setProviderAutreServiceInclus(v); if (!v) { setProviderAutreServiceCat(""); setProviderAutreServiceST(""); setProviderAutreServiceDet({}); } }} />
                            {providerAutreServiceInclus === true && (
                              autreServiceCollab ? (
                                <div className="space-y-2">
                                  <SectionLockedBanner collab={autreServiceCollab} onKick={autreServiceCollab.id ? () => kickProviderCollab(autreServiceCollab.id!) : undefined} />
                                  <div className="pointer-events-none select-none opacity-70">
                                    <AutreServiceBlock data={autreData} onUpdate={() => {}} />
                                  </div>
                                </div>
                              ) : (
                                <AutreServiceBlock data={autreData} onUpdate={onAutreUpdate}
                                  guidageSousTypeSlot={(_domaine) =>
                                    <InviteRequiredProv section="autre_service" icon="hiking"
                                      message="Le guidage sera assuré par un guide — invitez-le pour compléter cette section." />
                                  }
                                  prestataireSousTypeSlot={(cat) =>
                                    !canFill(cat) ? (
                                      <InviteRequiredProv section="autre_service" icon="add_circle"
                                        message="La catégorie sélectionnée n'est pas votre activité — invitez un prestataire pour compléter cette section." />
                                    ) : undefined
                                  }
                                />
                              )
                            )}
                          </div>
                        );
                      })()}

                      {/* Prestation seule */}
                      {!showTransport && !showRepas && !showHebergement && !!tp && tp !== "sur_mesure" && (
                        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                          <span className="material-symbols-outlined text-primary text-xl">handyman</span>
                          <p className="text-xs font-bold text-slate-700">Prestation seule — aucun service transport, repas ou hébergement à renseigner.</p>
                        </div>
                      )}

                      {/* Services inclus */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Services inclus</p>
                        <div className="flex flex-wrap gap-2">
                          {PROVIDER_SERVICES.map((s) => {
                            const active = providerServicesInclus.includes(s);
                            return (
                              <button key={s} type="button"
                                onClick={() => setProviderServicesInclus((prev) => active ? prev.filter((x) => x !== s) : [...prev, s])}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}>
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* Max. pers. + Âge min. — Étape 1, masqués pour hébergement */}
                {offerStep === 1 && offerActivity?.category !== 'hebergement' && <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Max. pers.</label>
                    <input type="number" min="1" placeholder="20"
                      value={form.max_group_size}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({ ...f, max_group_size: v }));
                        if (offerActivity && v) {
                          const flat = Object.values(offerActivity.fields ?? {}).reduce<Record<string, any>>((acc, sec) => ({ ...acc, ...sec }), {});
                          const maxCap = getCapacityLimit(flat);
                          if (maxCap !== null && Number(v) > maxCap) {
                            setConstraintError(`Capacité dépassée — votre activité déclare max ${maxCap} pers. Modifiez votre profil si cela a changé.`);
                          } else {
                            setConstraintError("");
                          }
                        } else {
                          setConstraintError("");
                        }
                      }}
                      className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:bg-white font-mono ${constraintError ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary"}`}
                    />
                    {constraintError && <p className="text-xs font-semibold text-red-500 mt-1">{constraintError}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Âge min. <span className="normal-case font-medium text-slate-300">(facultatif)</span></label>
                    <input type="number" min="0" placeholder="12"
                      value={form.min_age}
                      onChange={(e) => setForm((f) => ({ ...f, min_age: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono"
                    />
                  </div>
                </div>}
                {/* Type d'offre — fallback si pas d'activité, Étape 1 */}
                {offerStep === 1 && orgActivities.length === 0 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Type d'offre</label>
                    <div className="grid grid-cols-3 gap-2">
                      {OFFER_TYPES.map((t) => {
                        const active = form.offer_type === t.value;
                        return (
                          <button key={t.value} type="button"
                            onClick={() => setForm((f) => ({ ...f, offer_type: active ? "" : t.value }))}
                            className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-white"}`}>
                            <span className={`material-symbols-outlined text-xl ${active ? "text-primary" : "text-slate-400"}`}>{t.icon}</span>
                            <span className="text-[10px] font-extrabold">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* ── ÉTAPE 3 : DÉTAILS SPÉCIFIQUES PAR SOUS-TYPE ───── */}
                {offerStep === 3 && offerSubtypes.length > 0 && (() => {
                  const isMultiUnit = offerNbUnites > 1 && offerActivity?.category === 'hebergement';

                  // ── Résout les options dynamiques depuis les champs d'onboarding ──
                  const flatOnboarding = Object.values(offerActivity?.fields ?? {})
                    .reduce<Record<string, any>>((acc, sec) => ({ ...acc, ...sec }), {});

                  const resolveOptions = (field: { options?: string[]; dynamicOptions?: string }): string[] => {
                    if (!field.dynamicOptions || !offerActivity) return field.options ?? [];
                    const key = field.dynamicOptions.replace('onboarding.', '');
                    const val = flatOnboarding[key];
                    if (Array.isArray(val)) return val as string[];
                    if (typeof val === 'string') return [val];
                    return field.options ?? [];
                  };

                  // ── Vérifie une règle de cross-validation ──
                  const checkRule = (rule: CrossValidationRule, getData: (k: string) => any): string | null => {
                    const fieldVal = getData(rule.field);
                    if (fieldVal === undefined || fieldVal === null || fieldVal === '' || (Array.isArray(fieldVal) && fieldVal.length === 0)) return null;
                    const onbVal = flatOnboarding[rule.onboardingKey];
                    if (onbVal === undefined || onbVal === null) return null;
                    let hasError = false;
                    switch (rule.rule) {
                      case 'lte': hasError = Number(fieldVal) > Number(onbVal); break;
                      case 'gte': hasError = Number(fieldVal) < Number(onbVal); break;
                      case 'in': {
                        const opts = Array.isArray(onbVal) ? onbVal : [onbVal];
                        hasError = Boolean(fieldVal) && !opts.includes(fieldVal);
                        break;
                      }
                      case 'subset': {
                        const opts = Array.isArray(onbVal) ? onbVal : [onbVal];
                        hasError = Array.isArray(fieldVal) && fieldVal.some((v: string) => !opts.includes(v));
                        break;
                      }
                      case 'requiredIfFalse': hasError = !onbVal && fieldVal === true; break;
                      case 'requiredIfTrue':  hasError = Boolean(onbVal) && !fieldVal; break;
                    }
                    return hasError ? rule.message.replace('{value}', String(onbVal)) : null;
                  };

                  // ── Rendu des champs (data source abstrait) ──
                  const renderFields = (
                    st: string,
                    getData: (key: string) => any,
                    setData: (key: string, val: any) => void,
                  ) => {
                    const config = OFFER_DETAIL_FIELDS[st];
                    if (!config) return null;
                    return config.sections.map((section) => {
                      // Cas 2 — Section conditionnelle selon l'onboarding
                      if (section.conditionalOn?.onboardingKey) {
                        const onbVal = flatOnboarding[section.conditionalOn.onboardingKey];
                        if (onbVal !== section.conditionalOn.value) return null;
                      }

                      // Validations inline de la section (Cas 4)
                      const sectionErrors = (section.validations ?? [])
                        .map((rule) => checkRule(rule, getData))
                        .filter(Boolean) as string[];

                      return (
                        <div key={section.label} className="mb-4 last:mb-0">
                          <p className="text-xs font-bold text-slate-500 mb-2">{section.label}</p>

                          {/* Cas 4 — Alertes cross-validation */}
                          {sectionErrors.map((msg, i) => (
                            <div key={i} className="flex items-start gap-2 px-3 py-2 mb-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
                              <span className="shrink-0 mt-0.5">⚠</span>{msg}
                            </div>
                          ))}

                          <div className="space-y-2.5">
                            {section.fields.map((field) => {
                              // Cas champ conditionnel (champ.conditionalOn.field)
                              if (field.conditionalOn?.field) {
                                const condVal = getData(field.conditionalOn.field);
                                if (field.conditionalOn.value !== undefined && condVal !== field.conditionalOn.value) return null;
                                if (field.conditionalOn.notValue !== undefined && condVal === field.conditionalOn.notValue) return null;
                              }

                              // Cas 1 — Résolution des options dynamiques
                              const opts = resolveOptions(field);

                              return (
                                <div key={field.key}>
                                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">
                                    {field.label}{field.required && ' *'}
                                  </label>

                                  {field.type === "boolean" ? (
                                    <button type="button"
                                      onClick={() => setData(field.key, !getData(field.key))}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${getData(field.key) ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                                      <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all ${getData(field.key) ? "border-primary bg-primary" : "border-slate-300"}`}>
                                        {getData(field.key) && <Check size={9} className="text-white" />}
                                      </div>
                                      Oui
                                    </button>

                                  ) : field.type === "textarea" ? (
                                    <textarea rows={2} placeholder={field.placeholder}
                                      value={(getData(field.key) as string) ?? ""}
                                      onChange={(e) => setData(field.key, e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-400" />

                                  ) : field.type === "select" ? (
                                    <select value={(getData(field.key) as string) ?? ""}
                                      onChange={(e) => setData(field.key, e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                      <option value="">— Sélectionner —</option>
                                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>

                                  ) : field.type === "multiselect" ? (
                                    opts.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {opts.map((o) => {
                                          const sel = ((getData(field.key) as string[]) ?? []).includes(o);
                                          return (
                                            <button key={o} type="button"
                                              onClick={() => {
                                                const cur = (getData(field.key) as string[]) ?? [];
                                                setData(field.key, sel ? cur.filter((x) => x !== o) : [...cur, o]);
                                              }}
                                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${sel ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                                              {o}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-slate-400 italic">Options disponibles après sélection d'une activité avec ce champ déclaré.</p>
                                    )

                                  ) : field.type === "time" ? (
                                    <input type="time" value={(getData(field.key) as string) ?? ""}
                                      onChange={(e) => setData(field.key, e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />

                                  ) : field.type === "file" ? (
                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                                      <span className="material-symbols-outlined text-base text-slate-300">upload_file</span>
                                      <span>Upload disponible après publication — envoyez par message</span>
                                    </div>

                                  ) : field.type === "repeater" ? (
                                    // Cas 3 — Repeater (programme jour par jour, etc.)
                                    <div className="space-y-2">
                                      {((getData(field.key) as any[]) ?? []).map((row: any, idx: number) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-extrabold text-primary/70 uppercase">
                                              {field.label} {idx + 1}
                                            </span>
                                            <button type="button"
                                              onClick={() => {
                                                const rows = [...((getData(field.key) as any[]) ?? [])];
                                                rows.splice(idx, 1);
                                                setData(field.key, rows);
                                              }}
                                              className="w-5 h-5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors">
                                              <X size={9} />
                                            </button>
                                          </div>
                                          {field.subfields?.map((sf) => (
                                            <div key={sf.key}>
                                              <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5 block">{sf.label}</label>
                                              {sf.type === 'textarea' ? (
                                                <textarea rows={2} placeholder={sf.placeholder}
                                                  value={(row[sf.key] as string) ?? ""}
                                                  onChange={(e) => {
                                                    const rows = [...((getData(field.key) as any[]) ?? [])];
                                                    rows[idx] = { ...rows[idx], [sf.key]: e.target.value };
                                                    setData(field.key, rows);
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                                              ) : (
                                                <input type="text" placeholder={sf.placeholder}
                                                  value={(row[sf.key] as string) ?? ""}
                                                  onChange={(e) => {
                                                    const rows = [...((getData(field.key) as any[]) ?? [])];
                                                    rows[idx] = { ...rows[idx], [sf.key]: e.target.value };
                                                    setData(field.key, rows);
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                      <button type="button"
                                        onClick={() => {
                                          const rows = [...((getData(field.key) as any[]) ?? [])];
                                          setData(field.key, [...rows, {}]);
                                        }}
                                        className="w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-[10px] font-extrabold text-slate-400 hover:border-primary/40 hover:text-primary transition-all">
                                        + Ajouter {field.label}
                                      </button>
                                    </div>

                                  ) : (
                                    <input type={field.type === "number" ? "number" : "text"} placeholder={field.placeholder}
                                      value={(getData(field.key) as string) ?? ""}
                                      onChange={(e) => setData(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  };

                  // ── Upload photos par entité (sous-type ou unité) ──
                  const renderPhotoSection = (entityKey: string, label: string) => {
                    const existingUrls = entityExistingImages[entityKey] ?? [];
                    const newImgs = entityImages[entityKey] ?? [];
                    const coverI = entityCoverIdx[entityKey] ?? 0;
                    const hasAny = existingUrls.length > 0 || newImgs.length > 0;
                    const inputId = `entity-photos-${entityKey.replace(/[^a-z0-9]/gi, '-')}`;
                    return (
                      <div className="mb-4 pb-4 border-b border-slate-200 last:border-0">
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">
                          📷 {label}
                        </label>
                        {!hasAny && (
                          <label htmlFor={inputId}
                            className="flex flex-col items-center justify-center gap-1.5 w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                            <span className="material-symbols-outlined text-slate-300 text-2xl">add_photo_alternate</span>
                            <p className="text-[10px] font-semibold text-slate-400">Cliquez pour ajouter des photos</p>
                            <input id={inputId} type="file" accept="image/*" multiple className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files ?? []);
                                setEntityImages((prev) => ({ ...prev, [entityKey]: [...(prev[entityKey] ?? []), ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))] }));
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                        {hasAny && (
                          <>
                            <div className="mt-1 grid grid-cols-4 gap-1.5">
                              {/* Photos déjà sauvegardées */}
                              {existingUrls.map((url, i) => (
                                <div key={`ex-${i}`}
                                  className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${i === 0 && newImgs.length === 0 ? "border-primary shadow-md" : "border-slate-200"}`}>
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  {i === 0 && newImgs.length === 0 && <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                                  <button type="button"
                                    onClick={() => setEntityExistingImages((prev) => ({ ...prev, [entityKey]: (prev[entityKey] ?? []).filter((_, idx) => idx !== i) }))}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                              {/* Nouvelles photos à uploader */}
                              {newImgs.map((img, i) => {
                                const isCover = existingUrls.length === 0 && i === coverI;
                                return (
                                  <div key={`new-${i}`}
                                    onClick={() => { if (existingUrls.length === 0) setEntityCoverIdx((prev) => ({ ...prev, [entityKey]: i })); }}
                                    className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                                    {isCover && <div className="absolute top-1 left-1 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                                    <button type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        URL.revokeObjectURL(img.preview);
                                        setEntityImages((prev) => { const cur = prev[entityKey] ?? []; return { ...prev, [entityKey]: cur.filter((_, idx) => idx !== i) }; });
                                        setEntityCoverIdx((prev) => { const cur = prev[entityKey] ?? 0; return { ...prev, [entityKey]: cur >= i && cur > 0 ? cur - 1 : cur }; });
                                      }}
                                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <X size={10} />
                                    </button>
                                  </div>
                                );
                              })}
                              {/* Bouton ajouter */}
                              <label htmlFor={inputId}
                                className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                                <span className="material-symbols-outlined text-slate-300 text-xl">add</span>
                                <input id={inputId} type="file" accept="image/*" multiple className="hidden"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files ?? []);
                                    setEntityImages((prev) => ({ ...prev, [entityKey]: [...(prev[entityKey] ?? []), ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))] }));
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                            {(existingUrls.length + newImgs.length) > 1 && existingUrls.length === 0 && (
                              <p className="text-[9px] text-slate-400 font-medium mt-1">Cliquez sur une photo pour la définir comme image principale.</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  };

                  // ── Helpers pour nb_unites par sous-type ──
                  const getNbUnites = (st: string) => subtypeNbUnites[st] ?? 1;
                  const getUnitData = (st: string) => subtypeUnitDetails[st] ?? [{}];
                  const getActiveTab = (st: string) => activeSubtypeTab[st] ?? 0;

                  const setNbUnites = (st: string, n: number) =>
                    setSubtypeNbUnites((prev) => ({ ...prev, [st]: n }));
                  const setUnitData = (st: string, arr: Array<Record<string, any>>) =>
                    setSubtypeUnitDetails((prev) => ({ ...prev, [st]: arr }));
                  const setActiveTab = (st: string, i: number) =>
                    setActiveSubtypeTab((prev) => ({ ...prev, [st]: i }));

                  const isHebergement = offerActivity?.category === 'hebergement';

                  // ── Getter/setter config par sous-type (dispo + tarif) ──
                  const getStCfg = (st: string): Record<string, any> => subtypeFormConfig[st] ?? {};
                  const setStCfg = (st: string, field: string, val: any) =>
                    setSubtypeFormConfig((prev) => ({ ...prev, [st]: { ...(prev[st] ?? {}), [field]: val } }));

                  // ── Disponibilité par sous-type ──
                  const renderSubtypeAvailBloc = (st: string) => {
                    const cfg = getStCfg(st);
                    const mode = (cfg.availMode as string) ?? 'specific';
                    const weekdays: number[] = (cfg.availWeekdays as number[]) ?? [];
                    const specificDates: string[] = (cfg.specificDates as string[]) ?? [];
                    const saisons: string[] = (cfg.saisons as string[]) ?? [];
                    return (
                      <div className="mb-4 pb-4 border-b border-slate-200">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Disponibilité</p>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {AVAILABILITY_TYPES.map((m) => (
                            <button key={m.value} type="button" onClick={() => setStCfg(st, 'availMode', m.value)}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${mode === m.value ? 'border-primary bg-primary/10 text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                              <span className={`material-symbols-outlined text-sm ${mode === m.value ? 'text-primary' : 'text-slate-400'}`}>{m.icon}</span>
                              {m.label}
                            </button>
                          ))}
                        </div>
                        {mode === 'specific' && (
                          <div className="space-y-1.5">
                            <div className="flex gap-2">
                              <input type="date" value={(cfg.newSpecificDate as string) ?? ''} onChange={(e) => setStCfg(st, 'newSpecificDate', e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                              <button type="button" onClick={() => {
                                const d = (cfg.newSpecificDate as string) ?? '';
                                if (d && !specificDates.includes(d)) { setStCfg(st, 'specificDates', [...specificDates, d].sort()); setStCfg(st, 'newSpecificDate', ''); }
                              }} className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-extrabold hover:bg-primary/90">Ajouter</button>
                            </div>
                            {specificDates.length > 0 && <div className="flex flex-wrap gap-1">{specificDates.map((d) => <span key={d} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold border border-primary/20">{d}<button type="button" onClick={() => setStCfg(st, 'specificDates', specificDates.filter((x) => x !== d))}><X size={8} /></button></span>)}</div>}
                          </div>
                        )}
                        {mode === 'weekly' && (
                          <div className="space-y-1.5">
                            <div className="flex gap-1">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((day, i) => <button key={i} type="button" onClick={() => setStCfg(st, 'availWeekdays', weekdays.includes(i) ? weekdays.filter((d) => d !== i) : [...weekdays, i])} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border-2 transition-all ${weekdays.includes(i) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{day}</button>)}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début</label><input type="date" value={(cfg.availStart as string) ?? ''} onChange={(e) => setStCfg(st, 'availStart', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                              <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin</label><input type="date" value={(cfg.availEnd as string) ?? ''} onChange={(e) => setStCfg(st, 'availEnd', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                            </div>
                          </div>
                        )}
                        {mode === 'period' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début *</label><input type="date" value={(cfg.availStart as string) ?? ''} onChange={(e) => setStCfg(st, 'availStart', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin *</label><input type="date" value={(cfg.availEnd as string) ?? ''} onChange={(e) => setStCfg(st, 'availEnd', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                          </div>
                        )}
                        {mode === 'on_demand' && (
                          <div className="space-y-1.5">
                            <div className="flex gap-2">{['24h','48h','72h'].map((d) => <button key={d} type="button" onClick={() => setStCfg(st, 'delaiReponse', d)} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all ${(cfg.delaiReponse ?? '24h') === d ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-500'}`}>{d}</button>)}</div>
                          </div>
                        )}
                        {mode === 'season' && (
                          <div className="flex gap-1.5">{SAISONS.map((s) => <button key={s} type="button" onClick={() => setStCfg(st, 'saisons', saisons.includes(s) ? saisons.filter((x) => x !== s) : [...saisons, s])} className={`flex-1 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all ${saisons.includes(s) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{s}</button>)}</div>
                        )}
                        {mode !== 'on_demand' && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure début</label><input type="time" value={(cfg.heureDebut as string) ?? ''} onChange={(e) => setStCfg(st, 'heureDebut', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                            <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure fin</label><input type="time" value={(cfg.heureFin as string) ?? ''} onChange={(e) => setStCfg(st, 'heureFin', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                          </div>
                        )}
                      </div>
                    );
                  };

                  // ── Tarification par sous-type (hébergement) ──
                  const renderSubtypePricingBloc = (st: string) => {
                    const cfg = getStCfg(st);
                    return (
                      <div className="mb-4 pb-4 border-b border-slate-200 space-y-2.5">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Tarification</p>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Prix groupe <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span><input type="number" min="0" placeholder="1200" value={(cfg.prixGroupe as string) ?? ''} onChange={(e) => setStCfg(st, 'prixGroupe', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">pers.</span><input type="number" min="1" placeholder="10" value={(cfg.nbPersonnesGroupe as string) ?? ''} onChange={(e) => setStCfg(st, 'nbPersonnesGroupe', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Prix enfant <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span><input type="number" min="0" placeholder="150" value={(cfg.prixEnfant as string) ?? ''} onChange={(e) => setStCfg(st, 'prixEnfant', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">≤ âge</span><input type="number" min="0" max="18" placeholder="12" value={(cfg.ageMaxEnfant as string) ?? ''} onChange={(e) => setStCfg(st, 'ageMaxEnfant', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Supplément privatisation <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span><input type="number" min="0" placeholder="500" value={(cfg.suppPrivatisation as string) ?? ''} onChange={(e) => setStCfg(st, 'suppPrivatisation', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" /></div>
                        </div>
                      </div>
                    );
                  };

                  // ── Contrôle nb_unites inline dans la carte ──
                  const renderNbUnitesControl = (st: string) => {
                    const nb = getNbUnites(st);
                    return (
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                        <div>
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Nb d'unités</p>
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">Chambres / suites / tentes disponibles à la vente</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => {
                              if (nb <= 1) return;
                              const removedKey = `${st}_unit_${nb - 1}`;
                              setEntityImages((prev) => {
                                const imgs = prev[removedKey] ?? [];
                                imgs.forEach((img) => URL.revokeObjectURL(img.preview));
                                const next = { ...prev }; delete next[removedKey]; return next;
                              });
                              setEntityCoverIdx((prev) => { const next = { ...prev }; delete next[removedKey]; return next; });
                              setUnitData(st, getUnitData(st).slice(0, -1));
                              if (getActiveTab(st) >= nb - 1) setActiveTab(st, nb - 2);
                              setNbUnites(st, nb - 1);
                            }}
                            className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center text-sm transition-colors">−</button>
                          <span className="text-base font-extrabold text-slate-800 w-6 text-center">{nb}</span>
                          <button type="button"
                            onClick={() => { setUnitData(st, [...getUnitData(st), {}]); setNbUnites(st, nb + 1); }}
                            className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center text-sm transition-colors">+</button>
                        </div>
                      </div>
                    );
                  };

                  // ── Onglets unités pour un sous-type ──
                  const renderUnitTabs = (st: string) => {
                    const nb = getNbUnites(st);
                    const unitArr = getUnitData(st);
                    const activeI = getActiveTab(st);
                    const config = OFFER_DETAIL_FIELDS[st];
                    const nameKey = config?.sections[0]?.fields.find((f) => f.key.startsWith('nom_'))?.key ?? '';

                    return (
                      <>
                        {/* Tabs */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {Array.from({ length: nb }, (_, i) => {
                            const unitName = (unitArr[i]?.[nameKey] as string) || null;
                            return (
                              <button key={i} type="button" onClick={() => setActiveTab(st, i)}
                                className={`px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${activeI === i ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-500 hover:border-primary/30'}`}>
                                {unitName || `${st.replace(/_/g, ' ')} ${i + 1}`}
                              </button>
                            );
                          })}
                        </div>
                        {/* ── Disponibilité par unité ── */}
                        <div className="mb-3 pb-3 border-b border-slate-200">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Disponibilité de cette unité</p>
                          {(() => {
                            const uArr = getUnitData(st);
                            const uI = getActiveTab(st);
                            const getU = (f: string) => uArr[uI]?.[f];
                            const setU = (f: string, v: any) => { const a = [...uArr]; a[uI] = { ...(a[uI] ?? {}), [f]: v }; setUnitData(st, a); };
                            const uMode = (getU('availMode') as string) ?? 'specific';
                            const uWeekdays: number[] = (getU('availWeekdays') as number[]) ?? [];
                            const uDates: string[] = (getU('specificDates') as string[]) ?? [];
                            const uSaisons: string[] = (getU('saisons') as string[]) ?? [];
                            return (
                              <>
                                <div className="grid grid-cols-2 gap-1.5 mb-2">
                                  {AVAILABILITY_TYPES.map((m) => (
                                    <button key={m.value} type="button" onClick={() => setU('availMode', m.value)}
                                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${uMode === m.value ? 'border-primary bg-primary/10 text-slate-900' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                                      <span className={`material-symbols-outlined text-sm ${uMode === m.value ? 'text-primary' : 'text-slate-400'}`}>{m.icon}</span>{m.label}
                                    </button>
                                  ))}
                                </div>
                                {uMode === 'specific' && (
                                  <div className="space-y-1.5">
                                    <div className="flex gap-2">
                                      <input type="date" value={(getU('newSpecificDate') as string) ?? ''} onChange={(e) => setU('newSpecificDate', e.target.value)}
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                      <button type="button" onClick={() => {
                                        const d = (getU('newSpecificDate') as string) ?? '';
                                        if (d && !uDates.includes(d)) { setU('specificDates', [...uDates, d].sort()); setU('newSpecificDate', ''); }
                                      }} className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-extrabold">Ajouter</button>
                                    </div>
                                    {uDates.length > 0 && <div className="flex flex-wrap gap-1">{uDates.map((d) => <span key={d} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold border border-primary/20">{d}<button type="button" onClick={() => setU('specificDates', uDates.filter((x) => x !== d))}><X size={8} /></button></span>)}</div>}
                                  </div>
                                )}
                                {uMode === 'weekly' && (
                                  <div className="space-y-1.5">
                                    <div className="flex gap-1">{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((day, i) => <button key={i} type="button" onClick={() => setU('availWeekdays', uWeekdays.includes(i) ? uWeekdays.filter((d) => d !== i) : [...uWeekdays, i])} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border-2 transition-all ${uWeekdays.includes(i) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{day}</button>)}</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début</label><input type="date" value={(getU('availStart') as string) ?? ''} onChange={(e) => setU('availStart', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                                      <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin</label><input type="date" value={(getU('availEnd') as string) ?? ''} onChange={(e) => setU('availEnd', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                                    </div>
                                  </div>
                                )}
                                {uMode === 'period' && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début *</label><input type="date" value={(getU('availStart') as string) ?? ''} onChange={(e) => setU('availStart', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                                    <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin *</label><input type="date" value={(getU('availEnd') as string) ?? ''} onChange={(e) => setU('availEnd', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                                  </div>
                                )}
                                {uMode === 'on_demand' && (
                                  <div className="flex gap-2">{['24h','48h','72h'].map((d) => <button key={d} type="button" onClick={() => setU('delaiReponse', d)} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all ${(getU('delaiReponse') ?? '24h') === d ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-500'}`}>{d}</button>)}</div>
                                )}
                                {uMode === 'season' && (
                                  <div className="flex gap-1.5">{SAISONS.map((s) => <button key={s} type="button" onClick={() => setU('saisons', uSaisons.includes(s) ? uSaisons.filter((x) => x !== s) : [...uSaisons, s])} className={`flex-1 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all ${uSaisons.includes(s) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{s}</button>)}</div>
                                )}
                                {uMode !== 'on_demand' && (
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure début</label><input type="time" value={(getU('heureDebut') as string) ?? ''} onChange={(e) => setU('heureDebut', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                                    <div><label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure fin</label><input type="time" value={(getU('heureFin') as string) ?? ''} onChange={(e) => setU('heureFin', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        {/* ── Champs par unité : prix, max pers, acompte ── */}
                        <div className="mb-3 pb-3 border-b border-slate-200 space-y-3">
                          {/* Prix / nuit */}
                          <div>
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">
                              Prix / nuit (TND)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                              <input type="number" min="0" placeholder="Ex : 380"
                                value={(unitArr[activeI]?.prix_unite as string) ?? ""}
                                onChange={(e) => {
                                  const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), prix_unite: e.target.value }; setUnitData(st, arr);
                                }}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                            </div>
                          </div>
                          {/* Max. pers. par unité */}
                          <div>
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">
                              Max. personnes pour cette unité
                            </label>
                            <input type="number" min="1" placeholder="Ex : 2"
                              value={(unitArr[activeI]?.max_pers_unite as string) ?? ""}
                              onChange={(e) => {
                                const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), max_pers_unite: e.target.value }; setUnitData(st, arr);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                          </div>
                          {/* Acompte par unité */}
                          <div>
                            <button type="button"
                              onClick={() => {
                                const arr = [...unitArr];
                                arr[activeI] = { ...(arr[activeI] ?? {}), acompte_requis: !(arr[activeI]?.acompte_requis ?? false) };
                                setUnitData(st, arr);
                              }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${unitArr[activeI]?.acompte_requis ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30'}`}>
                              <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all ${unitArr[activeI]?.acompte_requis ? 'border-primary bg-primary' : 'border-slate-300'}`}>
                                {unitArr[activeI]?.acompte_requis && <Check size={9} className="text-white" />}
                              </div>
                              Acompte requis pour cette unité
                            </button>
                            {unitArr[activeI]?.acompte_requis && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <select
                                  value={(unitArr[activeI]?.type_acompte as string) ?? 'pourcentage'}
                                  onChange={(e) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), type_acompte: e.target.value }; setUnitData(st, arr); }}
                                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                  <option value="pourcentage">% du prix</option>
                                  <option value="fixe">Montant fixe (DT)</option>
                                </select>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">{(unitArr[activeI]?.type_acompte ?? 'pourcentage') === 'pourcentage' ? '%' : 'DT'}</span>
                                  <input type="number" min="1" placeholder="30"
                                    value={(unitArr[activeI]?.valeur_acompte as string) ?? ""}
                                    onChange={(e) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), valeur_acompte: e.target.value }; setUnitData(st, arr); }}
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Photos + champs de l'unité active */}
                        {renderPhotoSection(`${st}_unit_${activeI}`, `Photos — ${(unitArr[activeI]?.[nameKey] as string) || `Unité ${activeI + 1}`}`)}
                        {renderFields(
                          st,
                          (key) => unitArr[activeI]?.[key],
                          (key, val) => { const arr = [...unitArr]; arr[activeI] = { ...(arr[activeI] ?? {}), [key]: val }; setUnitData(st, arr); },
                        )}
                      </>
                    );
                  };

                  return (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase block">Détails spécifiques</label>

                      {offerSubtypes.map((st) => (
                        <div key={st} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                          {/* Libellé sous-type en multi-sélection */}
                          {offerSubtypes.length > 1 && (
                            <p className="text-[10px] font-black tracking-widest text-primary/70 uppercase mb-3">{st}</p>
                          )}

                          {/* Contrôle nb_unites + onglets — hébergement seulement */}
                          {isHebergement ? (
                            <>
                              {/* Dispo + Tarif au niveau sous-type seulement si 1 seule unité */}
                              {getNbUnites(st) === 1 && renderSubtypeAvailBloc(st)}
                              {renderSubtypePricingBloc(st)}
                              {renderNbUnitesControl(st)}
                              {getNbUnites(st) > 1
                                ? renderUnitTabs(st)
                                : (
                                  <>
                                    {renderPhotoSection(`${st}_unit_0`, 'Photos de l\'offre')}
                                    {renderFields(
                                      st,
                                      (key) => (getUnitData(st)[0] ?? {})[key],
                                      (key, val) => { const arr = [...getUnitData(st)]; arr[0] = { ...(arr[0] ?? {}), [key]: val }; setUnitData(st, arr); },
                                    )}
                                  </>
                                )
                              }
                            </>
                          ) : (
                            /* Non-hébergement : champs directs */
                            <>
                              {renderPhotoSection(st, offerSubtypes.length > 1 ? `Photos — ${st}` : 'Photos de l\'offre')}
                              {renderFields(
                                st,
                                (key) => subtypeDetails[st]?.[key],
                                (key, val) => setSubtypeDetails((prev) => ({ ...prev, [st]: { ...(prev[st] ?? {}), [key]: val } })),
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* ── ÉTAPE 4 : DISPONIBILITÉS ─────────────────────────── */}
                {offerStep === 4 && offerActivity?.category !== 'hebergement' && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Quand êtes-vous disponible ?</label>
                    <OfferAvailPicker value={offerAvail} onChange={setOfferAvail} />
                    {offerEditId && offerAvail.type && (
                      checkingProviderCollabConfs ? (
                        <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                          <p className="text-xs text-slate-500 font-medium">Vérification de l&apos;agenda des collaborateurs…</p>
                        </div>
                      ) : providerCollabConflicts.length > 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-amber-500 text-base shrink-0">event_busy</span>
                            <p className="text-xs font-extrabold text-amber-800">
                              {providerCollabConflicts.length} collaborateur{providerCollabConflicts.length > 1 ? "s ont" : " a"} un conflit avec ces nouvelles dates
                            </p>
                          </div>
                          {providerCollabConflicts.map((c, i) => (
                            <div key={i} className="pl-6 space-y-1">
                              <p className="text-xs text-amber-700 font-semibold">
                                {c.userName} <span className="font-normal text-amber-600">({({ hebergement: "Hébergement", restauration: "Restauration", transport: "Transport", guide: "Guidage", autre: "Autre" } as Record<string,string>)[c.section] ?? c.section})</span>
                                {" — "}<span className="italic">&ldquo;{c.conflictSlot}&rdquo;</span>
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {c.conflictDays.map((day) => (
                                  <span key={day} className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-bold">
                                    {new Date(day + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                  </span>
                                ))}
                                {c.conflictTimeSlots && [...new Map(
                                  Object.values(c.conflictTimeSlots).flat()
                                    .map((ts) => [`${ts.start}-${ts.end}`, ts])
                                ).values()].map((ts, ti) => (
                                  <span key={`cts-${ti}`} className="text-[10px] bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 font-bold">
                                    {ts.start}–{ts.end}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                          <p className="pl-6 text-[10px] text-amber-500 pt-1.5 border-t border-amber-200">
                            Vous pouvez continuer — le(s) collaborateur(s) seront notifiés du conflit lors de l&apos;enregistrement.
                          </p>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
                {offerStep === 4 && offerActivity?.category === 'hebergement' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500">
                    <span className="material-symbols-outlined text-slate-400 text-lg align-middle mr-2">info</span>
                    Les disponibilités sont gérées par unité dans l&apos;étape Détails.
                  </div>
                )}

                {/* ── ÉTAPE 6 : TARIFICATION ───────────────────────────── */}
                {offerStep === 6 && offerActivity?.category === 'hebergement' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500">
                    <span className="material-symbols-outlined text-slate-400 text-lg align-middle mr-2">info</span>
                    La tarification est gérée par unité dans l&apos;étape Détails.
                  </div>
                )}
                {offerStep === 6 && offerActivity?.category !== 'hebergement' && <div className="space-y-3">
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase block">Tarification</label>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Durée (jours) <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                    <div className="relative">
                      <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" min="1" step="1" placeholder="Ex : 3"
                        value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono placeholder:text-slate-400 placeholder:font-sans"
                      />
                    </div>
                  </div>

                  {/* Prix par sous-type en mode VARIANT */}
                  {offerMode === "variant" && offerSubtypes.length > 1 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black tracking-widest text-primary uppercase">Prix par variante — Le voyageur choisit</p>
                      {offerSubtypes.map((st) => (
                        <div key={st}>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">
                            {st} (TND)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                            <input type="number" min="0" step="1" placeholder="Ex : 250"
                              value={subtypePrices[st] ?? ""}
                              onChange={(e) => setSubtypePrices((prev) => ({ ...prev, [st]: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">
                      {offerMode === "variant" && offerSubtypes.length > 1
                        ? "Prix de référence général (optionnel)"
                        : "Prix par personne * (TND)"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                      <input type="number" min="0" step="1" placeholder="350" value={form.price}
                        onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Prix groupe <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                        <input type="number" min="0" placeholder="1200" value={prixGroupe} onChange={(e) => setPrixGroupe(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">pers.</span>
                        <input type="number" min="1" placeholder="10" value={nbPersonnesGroupe} onChange={(e) => setNbPersonnesGroupe(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Prix enfant <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                        <input type="number" min="0" placeholder="150" value={prixEnfant} onChange={(e) => setPrixEnfant(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">≤ âge</span>
                        <input type="number" min="0" max="18" placeholder="12" value={ageMaxEnfant} onChange={(e) => setAgeMaxEnfant(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Supplément privatisation <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                      <input type="number" min="0" placeholder="500" value={suppPrivatisation} onChange={(e) => setSuppPrivatisation(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                    </div>
                  </div>
                  <div>
                    <button type="button" onClick={() => setAcompteRequis((v) => !v)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${acompteRequis ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-primary/30"}`}>
                      <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all ${acompteRequis ? "border-primary bg-primary" : "border-slate-300"}`}>
                        {acompteRequis && <Check size={9} className="text-white" />}
                      </div>
                      Acompte requis
                    </button>
                    {acompteRequis && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <select value={typeAcompte} onChange={(e) => setTypeAcompte(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                          <option value="pourcentage">% du prix</option>
                          <option value="fixe">Montant fixe (DT)</option>
                        </select>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">{typeAcompte === "pourcentage" ? "%" : "DT"}</span>
                          <input type="number" min="1" placeholder={typeAcompte === "pourcentage" ? "30" : "100"} value={valeurAcompte} onChange={(e) => setValeurAcompte(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>}

                {/* ── ÉTAPE 7 : CONDITIONS ─────────────────────────────── */}
                {offerStep === 7 && (
                  <ConfirmationTypePicker
                    value={offerConfirmation}
                    onChange={(v) => setOfferConfirmation((c) => ({ ...c, ...v }))}
                    hideMeteо
                  />
                )}


              </div>
            </div>
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-3">
              {publishError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <span className="material-symbols-outlined text-red-500 text-base">error</span>
                  <p className="text-sm font-semibold text-red-600">{publishError}</p>
                </div>
              )}
              <div className="flex gap-2 items-center">
                {offerEditMode && (
                  <>
                    <button type="button" onClick={handleDeleteOffer} disabled={offerDeleting || publishing}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold text-xs transition-all disabled:opacity-50 shrink-0">
                      {offerDeleting ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" /> : <Trash2 size={13} />}
                      Supprimer
                    </button>
                    <button type="button" onClick={closeModal} disabled={publishing}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs transition-all disabled:opacity-50 shrink-0">
                      Annuler
                    </button>
                  </>
                )}
                <div className="flex-1" />
                {offerStep > 1 && (
                  <button type="button" onClick={() => { setOfferStep((s) => s - 1); setTitleError(""); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 hover:border-slate-300 font-bold text-sm transition-all shrink-0">
                    <ArrowLeft size={16} /> Retour
                  </button>
                )}
                <button type="button" onClick={handleNextProvider} disabled={publishing}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-slate-900 font-extrabold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed shrink-0">
                  {publishing ? (
                    <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  ) : offerStep < PROVIDER_STEPS.length ? (
                    <> Continuer <ArrowRight size={16} /> </>
                  ) : offerEditMode ? (
                    <> Enregistrer <Check size={16} /> </>
                  ) : (
                    <> Publier l'offre <Check size={16} /> </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ OFFER DETAIL / EDIT MODAL ════════════════════════════════════════ */}
      {editModalOpen && viewOffer && (() => {
        // Exclure les photos d'entités (stockées dans details.photos) du slider principal
        const entityPhotoUrls = new Set<string>(
          Object.values((viewOffer.details as any)?.photos ?? {}).flat() as string[]
        );
        const allImgs = viewOffer.images?.length
          ? viewOffer.images
          : viewOffer.cover_image ? [viewOffer.cover_image] : [];
        const sliderImgs = allImgs.filter((url) => !entityPhotoUrls.has(url));
        const td = OFFER_TYPES.find((t) => t.value === viewOffer.offer_type) ?? OFFER_TYPES[OFFER_TYPES.length - 1];
        const safeIdx = Math.min(sliderIdx, Math.max(sliderImgs.length - 1, 0));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl h-[90vh] shadow-2xl relative overflow-hidden flex flex-col">

              <button onClick={closeEditModal}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors">
                <X size={16} />
              </button>

              {!editMode ? (
                /* ── VIEW MODE ───────────────────────────────────────────── */
                <>
                  {/* Owner context banner */}
                  {(() => {
                    const s = viewOffer.status;
                    const slabel = s === "approved" ? "Active" : s === "attente_publication" ? "Prêt à publier" : s === "draft" ? "Brouillon" : s === "pending" ? "En attente" : "Refusée";
                    const scls   = s === "approved" ? "bg-primary/10 text-primary border-primary/20" : s === "attente_publication" ? "bg-teal-50 text-teal-700 border-teal-200" : s === "draft" ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-amber-50 text-amber-700 border-amber-200";
                    return (
                      <div className="shrink-0 px-5 py-2.5 flex items-center gap-2.5 bg-slate-50 border-b border-slate-100">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[14px]">storefront</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex-1">Mon offre</span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${scls}`}>{slabel}</span>
                      </div>
                    );
                  })()}
                  <div className="flex-1 overflow-y-auto">
                    <OfferDetailView offer={viewOffer as OfferFull} />
                  </div>
                  <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                    {viewOffer.status === "approved" ? (
                      <>
                        <p className="text-xs text-slate-400 font-semibold">Offre publiée — aucune modification possible</p>
                        <button type="button" onClick={handleDeleteOffer} disabled={offerDeleting}
                          className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 bg-white rounded-2xl text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-60">
                          <span className="material-symbols-outlined text-sm">delete</span>
                          {offerDeleting ? "Suppression…" : "Supprimer"}
                        </button>
                      </>
                    ) : (
                      <button type="button"
                        onClick={() => { if (viewOffer) openPublishModalForEdit(viewOffer); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-slate-900 font-extrabold rounded-2xl text-xs shadow-sm hover:bg-primary/90 transition-all active:scale-95">
                        <Edit3 size={14} />Gérer
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* ── EDIT MODE ───────────────────────────────────────────── */
                <>
                  <div className="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Edit3 size={20} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Gérer l'offre</h3>
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{editForm.title}</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1">
                    <form onSubmit={handleSaveOffer} className="px-8 py-6 space-y-5">
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre de l'offre *</label>
                        <input type="text" placeholder="Ex : Séjour éco en forêt de Mogods"
                          value={editForm.title}
                          onChange={(e) => { setEditForm((f) => ({ ...f, title: e.target.value })); setEditTitleError(""); }}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:font-normal ${editTitleError ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
                        />
                        {editTitleError && <p className="text-xs font-semibold text-red-500 mt-1">{editTitleError}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description détaillée</label>
                        <textarea rows={4} placeholder="Décrivez le concept écologique, les activités durables…"
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Région / Emplacement</label>
                        <input type="text" placeholder="Tunis, Djerba, Sfax…"
                          value={editForm.region}
                          onChange={(e) => setEditForm((f) => ({ ...f, region: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Localisation</label>
                          <button type="button" onClick={() => setShowEditMap((v) => !v)}
                            className="flex items-center gap-1 text-[10px] font-extrabold text-primary hover:text-primary/80 transition-colors">
                            <MapPin size={12} />
                            {showEditMap ? "Masquer la carte" : "Choisir sur la carte"}
                          </button>
                        </div>
                        <input type="text" placeholder="Ex : Place de la Kasbah, Tunis"
                          value={editForm.meeting_point}
                          onChange={(e) => setEditForm((f) => ({ ...f, meeting_point: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400 mb-2"
                        />
                        {showEditMap && (
                          <MapPicker
                            lat={editMapLat} lng={editMapLng}
                            onPick={(lat, lng, address) => {
                              setEditMapLat(lat); setEditMapLng(lng);
                              setEditForm((f) => ({ ...f, meeting_point: address }));
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Inclusions</label>
                        <textarea rows={3} placeholder={"Ex :\n• Transport inclus\n• Repas traditionnels\n• Guide bilingue"}
                          value={editForm.inclusions}
                          onChange={(e) => setEditForm((f) => ({ ...f, inclusions: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Max. pers.</label>
                          <input type="number" min="1" placeholder="20"
                            value={editForm.max_group_size}
                            onChange={(e) => setEditForm((f) => ({ ...f, max_group_size: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Âge min. <span className="normal-case font-medium text-slate-300">(facultatif)</span></label>
                          <input type="number" min="0" placeholder="12"
                            value={editForm.min_age}
                            onChange={(e) => setEditForm((f) => ({ ...f, min_age: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Politique d'annulation</label>
                        <textarea rows={2} placeholder="Ex : Remboursement intégral si annulation 48h avant."
                          value={editForm.cancellation_policy}
                          onChange={(e) => setEditForm((f) => ({ ...f, cancellation_policy: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos de l'offre</label>
                        {editImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            {editImages.map((img, i) => {
                              const isCover = i === editCoverIdx;
                              return (
                                <div key={i} onClick={() => setEditCoverIdx(i)}
                                  className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                                  <img src={img.src} alt="" className="w-full h-full object-cover" />
                                  {isCover && (
                                    <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>
                                  )}
                                  <button type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditImages((prev) => prev.filter((_, idx) => idx !== i));
                                      setEditCoverIdx((c) => (c >= i && c > 0 ? c - 1 : c));
                                    }}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={10} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <label htmlFor="edit-images-input"
                          className="flex flex-col items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                          <span className="material-symbols-outlined text-slate-300 text-2xl">add_photo_alternate</span>
                          <p className="text-xs font-semibold text-slate-400">Ajouter des photos</p>
                          <input id="edit-images-input" type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              if (!files.length) return;
                              const newImgs = files.map((f) => ({ src: URL.createObjectURL(f), file: f }));
                              setEditImages((prev) => [...prev, ...newImgs]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {editImages.length > 0 && (
                          <p className="text-[10px] text-slate-400 font-medium mt-2">Cliquez sur une photo pour la définir comme image principale.</p>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Type d'offre</label>
                        <div className="grid grid-cols-3 gap-2">
                          {OFFER_TYPES.map((t) => {
                            const active = editForm.offer_type === t.value;
                            return (
                              <button key={t.value} type="button"
                                onClick={() => setEditForm((f) => ({ ...f, offer_type: active ? "" : t.value }))}
                                className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-white"}`}>
                                <span className={`material-symbols-outlined text-xl ${active ? "text-primary" : "text-slate-400"}`}>{t.icon}</span>
                                <span className="text-[10px] font-extrabold">{t.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Tarif (TND)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                            <input type="number" min="0" step="0.01" placeholder="Ex : 350"
                              value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono placeholder:text-slate-400 placeholder:font-sans"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Durée (jours)</label>
                          <div className="relative">
                            <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="number" min="1" step="1" placeholder="Ex : 3"
                              value={editForm.duration} onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono placeholder:text-slate-400 placeholder:font-sans"
                            />
                          </div>
                        </div>
                      </div>
                      {/* ── Champs détaillés du sous-type ── */}
                      {(() => {
                        if (!viewOffer) return null;
                        const subtypes = viewOffer.offer_subtypes ?? (viewOffer.offer_subtype ? [viewOffer.offer_subtype] : []);
                        if (!subtypes.length) return null;
                        const isHeberg = !!(editDetails.subtypes_units);

                        const PROVIDER_SCHEMA_MAP: Record<string, string> = {
                          chambre_standard: "Chambre standard", chambre_superieure: "Chambre supérieure",
                          suite: "Suite", dortoir: "Dortoir", bungalow: "Bungalow",
                          tente_glamping: "Tente glamping", gite_rural: "Gîte rural",
                          maison_hotes: "Maison d'hôtes", riad_traditionnel: "Riad",
                          ecolodge: "Écolodge", camping_sauvage: "Camping", ferme_agritouristique: "Ferme",
                        };

                        function renderDetailField(field: { key: string; label: string; type: string; options?: string[] }, val: any, onChange: (v: any) => void) {
                          if (field.type === "boolean") {
                            return (
                              <button type="button" onClick={() => onChange(!val)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${val ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                                <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center ${val ? "border-primary bg-primary" : "border-slate-300"}`}>
                                  {val && <Check size={9} className="text-white" />}
                                </div>
                                Oui
                              </button>
                            );
                          }
                          if (field.type === "select") {
                            const opts = field.options ?? [];
                            return (
                              <select value={val ?? ""} onChange={(e) => onChange(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">— Sélectionner —</option>
                                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            );
                          }
                          if (field.type === "multiselect") {
                            const opts = field.options ?? [];
                            const sel: string[] = Array.isArray(val) ? val : [];
                            return (
                              <div className="flex flex-wrap gap-1.5">
                                {opts.map((o) => (
                                  <button key={o} type="button"
                                    onClick={() => onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o])}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${sel.includes(o) ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-600"}`}>
                                    {o}
                                  </button>
                                ))}
                              </div>
                            );
                          }
                          if (field.type === "time") {
                            return <input type="time" value={val ?? ""} onChange={(e) => onChange(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />;
                          }
                          if (field.type === "textarea") {
                            return <textarea rows={2} value={val ?? ""} onChange={(e) => onChange(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />;
                          }
                          if (field.type === "number") {
                            return <input type="number" value={val ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />;
                          }
                          if (field.type === "file" || field.type === "repeater") return null;
                          return <input type="text" value={val ?? ""} onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />;
                        }

                        return (
                          <div className="space-y-4 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Détails de l'offre</p>
                            {subtypes.map((st) => {
                              const stConfig = OFFER_DETAIL_FIELDS[st];
                              if (!stConfig) return null;
                              const stLabel = PROVIDER_SCHEMA_MAP[st] ?? st;

                              const units: Record<string, any>[] = isHeberg
                                ? ((editDetails.subtypes_units as any)?.[st] ?? [{}])
                                : [editDetails];

                              return (
                                <div key={st} className="rounded-2xl border border-slate-100 overflow-hidden">
                                  {subtypes.length > 1 && (
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                                      <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">{stLabel}</p>
                                    </div>
                                  )}
                                  <div className="p-4 space-y-4">
                                    {units.map((unit, ui) => {
                                      const stCfg = isHeberg ? ((editDetails.subtypes_config as any)?.[st] ?? {}) : {};
                                      const merged = { ...stCfg, ...unit };

                                      function getVal(key: string) { return merged[key]; }
                                      function setVal(key: string, v: any) {
                                        setEditDetails((prev) => {
                                          if (!isHeberg) return { ...prev, [key]: v };
                                          const prevUnits: any[] = [...((prev.subtypes_units as any)?.[st] ?? [{}])];
                                          prevUnits[ui] = { ...prevUnits[ui], [key]: v };
                                          return { ...prev, subtypes_units: { ...(prev.subtypes_units as any), [st]: prevUnits } };
                                        });
                                      }

                                      return (
                                        <div key={ui} className="space-y-3">
                                          {units.length > 1 && <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Unité {ui + 1}</p>}
                                          {stConfig.sections.map((section, si) => (
                                            <div key={si}>
                                              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">{section.label}</p>
                                              <div className="space-y-2">
                                                {section.fields.filter((f) => f.type !== "file" && f.type !== "repeater").map((field) => (
                                                  <div key={field.key}>
                                                    <label className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1 block">{field.label}</label>
                                                    {renderDetailField(field as any, getVal(field.key), (v) => setVal(field.key, v))}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {editError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                          <span className="material-symbols-outlined text-red-500 text-base">error</span>
                          <p className="text-sm font-semibold text-red-600">{editError}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setEditMode(false)}
                            className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                            <ChevronLeft size={14} />Retour
                          </button>
                          <button type="button" onClick={handleDeleteOffer} disabled={offerDeleting}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-red-500 hover:bg-red-50 font-bold text-xs transition-colors disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">delete</span>
                            {offerDeleting ? "Suppression…" : "Supprimer"}
                          </button>
                        </div>
                        <button type="submit" disabled={editSaving}
                          className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer">
                          {editSaving
                            ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Sauvegarde…</>
                            : <><Send size={14} />Enregistrer</>
                          }
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ══ PROFILE HEADER CARD ═══════════════════════════════════════════ */}
        <div className="relative w-full overflow-hidden bg-white shadow-sm rounded-3xl border border-slate-100/80 mb-6">
          {profile.cover_photo
            ? <div className="relative h-48 md:h-64 lg:h-72 w-full overflow-hidden"><img src={profile.cover_photo} alt="" className="w-full h-full object-cover" /></div>
            : <BotanicalCover />
          }
          <div className="relative px-5 pb-5 pt-3 md:pt-0">
            <div className="flex items-end justify-between gap-4 -mt-14 md:-mt-16">
              {/* Avatar + score badge */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md" />
                  <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg flex items-center justify-center">
                    <AvatarImg />
                  </div>
                </div>
                <div className="bg-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider border border-white">
                  <span className="material-symbols-outlined text-yellow-300" style={{ fontSize: 10 }}>star</span>
                  {scoreLabel(profile.sustainability_score)}
                </div>
              </div>

              {/* Name + buttons row */}
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-1">
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-800 leading-tight break-words">
                      {profile.organization || profile.full_name || "Prestataire"}
                    </h1>
                    <ShieldCheck size={18} className="text-emerald-500 fill-emerald-100 shrink-0 mt-1 hidden sm:block" />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-primary font-semibold text-xs">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    <span>Prestataire</span>
                  </div>
                </div>

                {/* Buttons always side-by-side */}
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={openModal}
                    className="bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 hover:shadow-lg transition-all shadow-sm text-sm whitespace-nowrap">
                    <Plus size={16} strokeWidth={2.5} /><span>Publier une offre</span>
                  </button>
                  <button onClick={openEditProfile}
                    className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 hover:shadow-sm active:scale-95 transition-all text-sm whitespace-nowrap">
                    <Edit3 size={15} /><span>Modifier</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ DASHBOARD COLUMNS ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-primary">
                  <Info size={18} strokeWidth={2.5} />
                </div>
                <h2 className="text-base font-extrabold text-slate-800">Informations</h2>
              </div>
              <div className="space-y-4">
                {/* Bio / Description */}
                {profile.bio && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-50 text-emerald-500 shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>description</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Description</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-3">{profile.bio}</p>
                    </div>
                  </div>
                )}
                {/* Type */}
                {profile.provider_type && (() => {
                  const pt = PROVIDER_TYPES.find((t) => t.value === profile.provider_type);
                  return pt ? (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{pt.icon}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Type</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">{pt.label}</p>
                      </div>
                    </div>
                  ) : null;
                })()}
                {/* Localisation — données org en priorité, fallback profil */}
                {(org?.address || org?.zone || org?.region || org?.country || profile.region || profile.country) && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0"><MapPin size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Localisation</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">
                        {[
                          org?.zone,
                          org?.region ?? profile.region,
                          (org?.country ?? profile.country) ? (COUNTRY_LABELS[org?.country ?? profile.country ?? ""] ?? (org?.country ?? profile.country)) : null,
                        ].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
                {/* Site web */}
                {profile.website && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0"><Globe size={16} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Site web</p>
                      <a href={profile.website} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline truncate block mt-0.5">{profile.website.replace(/^https?:\/\//, "")}</a>
                    </div>
                  </div>
                )}
                {/* Membre depuis */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0"><Calendar size={16} /></div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Membre depuis</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                      {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {/* Données org — contact & réseaux */}
                {org && (org.phone || org.whatsapp || org.email || org.website || org.instagram || org.facebook || org.tiktok) && (
                  <div className="pt-3 border-t border-slate-50 space-y-3">
                    {(org.website || org.email) && (
                      <div className="space-y-2">
                        {org.website && (
                          <a href={org.website.startsWith("http") ? org.website : `https://${org.website}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2.5 text-xs font-semibold text-primary hover:underline">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Globe size={13} className="text-primary" />
                            </div>
                            <span className="truncate">{org.website.replace(/^https?:\/\//, "")}</span>
                          </a>
                        )}
                        {org.email && (
                          <a href={`mailto:${org.email}`}
                            className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-primary">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Mail size={13} className="text-slate-500" />
                            </div>
                            <span className="truncate">{org.email}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {(org.phone || org.whatsapp) && (
                      <div className="space-y-2">
                        {org.phone && (
                          <a href={`tel:${org.phone}`}
                            className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-primary">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <Phone size={13} className="text-slate-500" />
                            </div>
                            <span>{org.phone}</span>
                          </a>
                        )}
                        {org.whatsapp && (
                          <a href={`https://wa.me/${org.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-primary">
                            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                              <MessageCircle size={13} className="text-green-500" />
                            </div>
                            <span>{org.whatsapp}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {(org.instagram || org.facebook || org.tiktok) && (
                      <div className="flex gap-2 flex-wrap">
                        {org.instagram && (
                          <a href={socialHref("instagram", org.instagram)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 bg-pink-50 text-pink-600 hover:bg-pink-100 text-[11px] font-black px-3 py-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>photo_camera</span>
                            Instagram
                          </a>
                        )}
                        {org.facebook && (
                          <a href={socialHref("facebook", org.facebook)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-black px-3 py-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>group</span>
                            Facebook
                          </a>
                        )}
                        {org.tiktok && (
                          <a href={socialHref("tiktok", org.tiktok)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-black px-3 py-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>music_note</span>
                            TikTok
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* Messagerie */}
            <MessagerieWidget token={token} />

            {/* Followers */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-extrabold text-base text-slate-800">Followers</span>
                {followers.length > 0 && <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{followers.length}</span>}
              </div>
              {followers.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {followers.slice(0, 5).map((f) => {
                    const path = f._type === "eco_traveler" ? `/profile/ecovoyageur/${f.user_id}` : f._type === "guide" ? `/profile/guide/${f.user_id}` : `/profile/project-owner/${f.user_id}`;
                    return (
                      <button key={f.user_id} onClick={() => router.push(path)}
                        className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center hover:scale-105 transition-transform"
                        title={f.full_name}>
                        {f.photo ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-lg">person</span>}
                      </button>
                    );
                  })}
                  {followers.length > 5 && <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary text-[11px] font-black border border-emerald-100/60 shadow-sm flex items-center justify-center">+{followers.length - 5}</div>}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium">Aucun follower pour l'instant.</p>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/50">
              {[
                { key: "tout",           label: "Tout",           Icon: LayoutGrid },
                { key: "offres",         label: "Offres",         Icon: Tag },
                { key: "activites",      label: "Activités",      Icon: Sparkles },
                { key: "circuits",       label: "Circuits",       Icon: Route },
                { key: "reseau",         label: "Réseau",         Icon: Users },
                { key: "collaborations", label: "Collaborations", Icon: Users },
                { key: "apropos",        label: "À propos",       Icon: Info },
              ].map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveTab(key as Tab)}
                  className={`flex-1 min-w-[60px] py-3 px-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}>
                  <Icon size={14} strokeWidth={2.5} /><span>{label}</span>
                </button>
              ))}
            </div>

            {activeTab === "tout" && (() => {
              const allActivityTypes = [
                ...(profile.activity_types ?? []).map((v) => ({ value: v, level: "primary" as const })),
                ...(profile.secondary_activity_types ?? []).map((v) => ({ value: v, level: "secondary" as const })),
              ];
              const approvedOffersTout = offers.filter((o) => o.status === "approved");
              return (
                <div className="space-y-6">
                  {/* Offers section — seulement si des offres approuvées existent */}
                  {approvedOffersTout.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Tag size={12} className="text-primary" /><span>Offres Écotourisme Actives</span>
                      </h3>
                      {approvedOffersTout.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
                    </div>
                  )}

                  {/* ── Circuits publiés — même carte que l'onglet Circuits ─────── */}
                  {(() => {
                    const approvedCircuits = circuits.filter((c) => c.status === "approved");
                    if (approvedCircuits.length === 0) return null;
                    return (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                          <Route size={12} className="text-primary" /><span>Circuits publiés</span>
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {approvedCircuits.map((circuit) => {
                            const catLabels = [...new Set(circuit.etapes.map((e) => PROVIDER_SCHEMA.find((c) => c.value === e.categorie)?.label ?? DOMAINES[e.categorie as string]?.label ?? e.categorie))];
                            return (
                              <div key={circuit.id} id={`circuit-tout-${circuit.id}`} className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-500">
                                <div className="flex gap-0">
                                  <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center">
                                    {circuit.cover_image ? <img src={circuit.cover_image} alt="" className="w-full h-full object-cover absolute inset-0" /> : <Route size={32} className="text-primary/40" />}
                                    <span className="absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg bg-emerald-500 text-white">Publié</span>
                                  </div>
                                  <div className="flex-1 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <h4 className="text-base font-extrabold text-slate-800 leading-tight">{circuit.title}</h4>
                                        {circuit.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{circuit.description}</p>}
                                      </div>
                                      <button onClick={async () => { if (!confirm("Supprimer ce circuit publié ? Les créneaux agenda de tous les collaborateurs seront supprimés.")) return; try { await apiFetch(`/circuits/${circuit.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); setCircuits((prev) => prev.filter((c) => c.id !== circuit.id)); } catch {} }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-xl"><Calendar size={10} />{circuit.nb_jours} jour{circuit.nb_jours > 1 ? "s" : ""}</span>
                                      <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl"><MapPin size={10} />{circuit.etapes.length} étape{circuit.etapes.length > 1 ? "s" : ""}</span>
                                      {catLabels.slice(0, 3).map((l) => (<span key={l} className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl">{l}</span>))}
                                    </div>
                                    <div className="mt-3 space-y-1">
                                      {circuit.etapes.slice(0, 3).map((etape) => {
                                        const cat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
                                        const stLabels = etape.subtypes.map((sv) => cat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                                        return (
                                          <div key={etape.id} className="flex items-center gap-2 text-xs">
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour}</span>
                                            <span className="font-semibold text-slate-700 truncate">{etape.destination}</span>
                                            <span className="text-slate-400 shrink-0">·</span>
                                            <span className="text-slate-400 truncate">{stLabels.join(", ")}</span>
                                          </div>
                                        );
                                      })}
                                      {circuit.etapes.length > 3 && <p className="text-[10px] text-slate-400 font-semibold">+{circuit.etapes.length - 3} étape{circuit.etapes.length - 3 > 1 ? "s" : ""}…</p>}
                                    </div>
                                    <button onClick={async () => { setViewingCircuit(circuit); setViewingCircuitCollabsMap({}); setPublishCircuitError(""); try { const enriched = await apiFetch<any>(`/circuits/${circuit.id}/view`, { headers: { Authorization: `Bearer ${token}` } }); if (enriched) setViewingCircuit(enriched); const m: Record<string, string> = {}; ((enriched?.etapes ?? []) as any[]).forEach((e: any) => { if (e.id && e.collaborator_status) m[e.id] = e.collaborator_status; }); setViewingCircuitCollabsMap(m); } catch {} }} className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer"><Info size={12} />Voir les détails</button>
                                  </div>
                                </div>
                                <PubInteractions pubId={circuit.id} token={token} viewerId={profile?.user_id ?? ""} shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${profile?.user_id}?tab=circuits&circuit=${circuit.id}`} pubTitle={circuit.title} itemApiBase="/interactions/circuit" commentApiBase="/interactions" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Collaborations publiées — même carte que l'onglet Collaborations ── */}
                  {collabLoading && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                      <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />Chargement des collaborations…
                    </div>
                  )}
                  {!collabLoading && (() => {
                    const INACTIVE = ["offer_deleted", "circuit_deleted", "collab_kicked", "collab_quit"];
                    const approvedCollabs = collaborations.filter((c) => {
                      const resStatus = c.source_type !== "circuit" ? c.offer_status : c.circuit_status;
                      if (INACTIVE.includes(resStatus ?? "")) return false;
                      return c.status === "accepted" || c.status === "completed";
                    });
                    if (approvedCollabs.length === 0) return null;
                    const SECTION_META: Record<string, { label: string; icon: string; grad: string }> = {
                      restauration: { label: "Restauration", icon: "restaurant",    grad: "from-emerald-600 to-green-500" },
                      transport:    { label: "Transport",    icon: "directions_bus", grad: "from-slate-600 to-slate-500" },
                      hebergement:  { label: "Hébergement", icon: "hotel",          grad: "from-teal-600 to-emerald-500" },
                      guide:        { label: "Guidage",     icon: "hiking",         grad: "from-emerald-500 to-green-500" },
                      autre:        { label: "Autre",       icon: "category",       grad: "from-slate-500 to-slate-600" },
                      nature_ecotourisme:   { label: "Nature & Écotourisme",    icon: "park",             grad: "from-green-600 to-emerald-500" },
                      culture_patrimoine:   { label: "Culture & Patrimoine",    icon: "account_balance",  grad: "from-amber-600 to-orange-500" },
                      historique_archeo:    { label: "Historique & Archéo",     icon: "history_edu",      grad: "from-stone-600 to-amber-700" },
                      aventure_randonnee:   { label: "Aventure & Randonnée",    icon: "hiking",           grad: "from-teal-600 to-cyan-500" },
                      gastronomie_locale:   { label: "Gastronomie locale",      icon: "restaurant",       grad: "from-orange-600 to-amber-500" },
                      artisanat_traditions: { label: "Artisanat & Traditions",  icon: "palette",          grad: "from-rose-600 to-pink-500" },
                      decouverte_urbaine:   { label: "Découverte urbaine",      icon: "location_city",    grad: "from-slate-600 to-blue-600" },
                      eco_tour:             { label: "Éco-Tour",                icon: "eco",              grad: "from-green-600 to-teal-500" },
                      activite:             { label: "Activité",                icon: "sports",           grad: "from-teal-600 to-emerald-500" },
                      bien_etre_spa:        { label: "Bien-être & Spa",         icon: "spa",              grad: "from-purple-500 to-violet-500" },
                      volontariat_eco:      { label: "Volontariat Éco",         icon: "volunteer_activism", grad: "from-emerald-600 to-green-500" },
                      autre_service:        { label: "Autre service",           icon: "category",         grad: "from-slate-500 to-slate-600" },
                    };
                    const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
                      accepted:  { label: "Acceptée",  cls: "bg-teal-100 text-teal-700 border-teal-200",          icon: "check_circle" },
                      completed: { label: "Complétée", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "task_alt" },
                    };
                    return (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                          <Users size={12} className="text-primary" /><span>Collaborations actives</span>
                        </h3>
                        {approvedCollabs.map((c) => {
                          const sm = SECTION_META[c.section] ?? SECTION_META.autre;
                          const isCircuit = c.source_type === "circuit";
                          const st = STATUS_META[c.status] ?? STATUS_META.accepted;
                          const displayTitle = isCircuit ? (c.circuit_title ?? "Circuit") : (c.offer_title ?? "Offre");
                          const displayCover = isCircuit ? c.circuit_cover : c.offer_cover;
                          return (
                            <div key={c.id} className="relative group bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                              {isCircuit ? (
                                <div className="flex gap-0">
                                  <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center overflow-hidden">
                                    {displayCover ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" /> : <span className="material-symbols-outlined text-primary/30" style={{ fontSize: 32 }}>route</span>}
                                    <span className={`absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg ${st.cls}`}>{st.label}</span>
                                  </div>
                                  <div className="flex-1 p-5">
                                    <h4 className="text-base font-extrabold text-slate-800 leading-tight">{displayTitle}</h4>
                                    {c.circuit_description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.circuit_description}</p>}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {c.circuit_nb_jours && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-xl"><Calendar size={10} />{c.circuit_nb_jours} jour{c.circuit_nb_jours > 1 ? "s" : ""}</span>}
                                      {c.circuit_nb_etapes != null && c.circuit_nb_etapes > 0 && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl"><MapPin size={10} />{c.circuit_nb_etapes} étape{c.circuit_nb_etapes > 1 ? "s" : ""}</span>}
                                    </div>
                                    {(c.circuit_etapes_preview ?? []).length > 0 && (
                                      <div className="mt-3 space-y-1">
                                        {(c.circuit_etapes_preview ?? []).map((etape, i) => {
                                          const isGuidage = etape.etape_mode === "guidage";
                                          const eCat = PROVIDER_SCHEMA.find((s) => s.value === etape.categorie);
                                          const catLabel = eCat?.label ?? (DOMAINES as any)[etape.categorie ?? ""]?.label ?? SECTION_META[etape.categorie ?? ""]?.label ?? etape.categorie ?? "";
                                          const displayName = etape.titre || etape.destination || catLabel || "Étape";
                                          const stLabels = isGuidage ? (etape.expertises ?? []).slice(0, 2) : (etape.subtypes ?? []).slice(0, 2).map((sv) => eCat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                                          return (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour}</span>
                                              <span className="font-semibold text-slate-700 truncate">{displayName}</span>
                                              {stLabels.length > 0 && (<><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 truncate text-[11px]">{stLabels.join(", ")}</span></>)}
                                              {etape.heure_debut && (<><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 truncate text-[10px] shrink-0">{etape.heure_debut}{etape.heure_fin ? ` → ${etape.heure_fin}` : ""}</span></>)}
                                            </div>
                                          );
                                        })}
                                        {(c.circuit_nb_etapes ?? 0) > (c.circuit_etapes_preview ?? []).length && <p className="text-[10px] text-slate-400 font-semibold">+{(c.circuit_nb_etapes ?? 0) - (c.circuit_etapes_preview ?? []).length} étape{((c.circuit_nb_etapes ?? 0) - (c.circuit_etapes_preview ?? []).length) > 1 ? "s" : ""}…</p>}
                                      </div>
                                    )}
                                    {c.message && <p className="mt-2 text-slate-400 text-xs leading-relaxed line-clamp-1 italic border-l-2 border-slate-200 pl-2">&ldquo;{c.message}&rdquo;</p>}
                                    <button onClick={() => { setOpenCollab(c); setDetailOffer(null); setCircuitFullDetail(null); if (c.circuit_id) { setCircuitFullDetailLoading(true); apiFetch<any>(`/circuits/${c.circuit_id}/view`, { headers: { Authorization: `Bearer ${token}` } }).then(setCircuitFullDetail).catch(() => setCircuitFullDetail(null)).finally(() => setCircuitFullDetailLoading(false)); } }} className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 cursor-pointer"><Info size={12} />Voir les détails</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row">
                                  <div className="relative bg-slate-50 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-100 sm:w-2/5 min-h-[180px]">
                                    {displayCover ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" /> : (<><div className={`absolute inset-0 bg-gradient-to-br ${sm.grad} opacity-90`} /><span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 100 }}>{sm.icon}</span></>)}
                                    <div className={`absolute top-2 left-2 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-xl shadow border flex items-center gap-1 ${st.cls}`}><span className="material-symbols-outlined text-xs">{st.icon}</span>{st.label}</div>
                                  </div>
                                  <div className="flex-1 flex flex-col justify-between p-6 md:p-8">
                                    <div>
                                      <h3 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight leading-tight mb-2">{displayTitle}</h3>
                                      {c.offer_description && <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{c.offer_description}</p>}
                                      {c.message && <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2 italic border-l-2 border-slate-200 pl-3">&ldquo;{c.message}&rdquo;</p>}
                                      <div className="flex flex-wrap gap-2.5 mb-4"><span className={`flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-xl text-white bg-gradient-to-r ${sm.grad} uppercase`}><span className="material-symbols-outlined text-sm">{sm.icon}</span>{sm.label}</span></div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3">
                                      <p className="text-[11px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                                      <button onClick={() => { setOpenCollab(c); setDetailOffer(null); setCircuitFullDetail(null); if (c.offer_id) { setDetailOfferLoading(true); apiFetch<OfferFull>(`/guide/offers/${c.offer_id}/detail`, { headers: { Authorization: `Bearer ${token}` } }).then(setDetailOffer).catch(() => setDetailOffer(null)).finally(() => setDetailOfferLoading(false)); } }} className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200"><span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} /></button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              {!isCircuit && c.offer_status === "approved" && c.offer_id && (
                                <PubInteractions
                                  pubId={c.offer_id}
                                  token={token}
                                  viewerId={profile?.user_id ?? ""}
                                  shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${c.guide_id}?offer=${c.offer_id}`}
                                  pubTitle={c.offer_title ?? undefined}
                                  itemApiBase="/interactions/offer"
                                  commentApiBase="/interactions"
                                />
                              )}
                              {isCircuit && c.circuit_status === "approved" && c.circuit_id && (
                                <PubInteractions
                                  pubId={c.circuit_id}
                                  token={token}
                                  viewerId={profile?.user_id ?? ""}
                                  shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/${c.circuit_owner_type === "guide" ? "guide" : "provider"}/${c.owner_id}?tab=circuits&circuit=${c.circuit_id}`}
                                  pubTitle={c.circuit_title ?? undefined}
                                  itemApiBase="/interactions/circuit"
                                  commentApiBase="/interactions"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* ── Activités proposées ─────────────────────────────────────── */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-primary" />Activités Proposées</span>
                      {orgActivities.length > 0 && (
                        <button onClick={() => setActiveTab("activites")} className="text-primary text-[10px] font-black hover:underline flex items-center gap-1">Tout voir <ArrowRight size={10} /></button>
                      )}
                    </h3>
                    {orgActivities.length === 0 ? (
                      <LaunchActivityCard />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {orgActivities.slice(0, 4).map((act) => {
                          const meta = findProviderTypeMeta(act.category);
                          const cat = getCategoryByValue(act.category);
                          const isPrimary = act.level === "primary";
                          const firstPhoto = Object.values(act.photos ?? {}).flat().filter(Boolean)[0] ?? null;
                          const subtypeLabels = (act.subtypes ?? []).map((sv) => cat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                          return (
                            <div key={act.id} className="bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                              <div className="relative h-48 w-full overflow-hidden">
                                <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
                                {firstPhoto ? <img src={firstPhoto} alt={meta.label} className="absolute inset-0 w-full h-full object-cover" />
                                  : <div className="absolute inset-0 flex items-center justify-center select-none opacity-20"><span className="material-symbols-outlined" style={{ fontSize: 80 }}>{meta.categoryIcon}</span></div>}
                                <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-md border ${isPrimary ? "bg-primary text-white border-white/20" : "bg-white/95 text-orange-500 border-orange-100"}`}>
                                  {isPrimary ? "Principale" : "Secondaire"}
                                </div>
                                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                                  <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
                                </div>
                              </div>
                              <div className="p-5">
                                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-1 leading-tight">{meta.label}</h3>
                                {act.years_experience != null && <p className="text-slate-500 text-sm mb-2">{act.years_experience} an{act.years_experience > 1 ? "s" : ""} d'expérience</p>}
                                {org?.region && <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-3"><MapPin size={12} /><span>{org.region}</span></div>}
                                {subtypeLabels.length > 0 && (
                                  <div className="mb-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 flex flex-wrap gap-1.5">
                                    {subtypeLabels.map((label) => <span key={label} className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">{label}</span>)}
                                  </div>
                                )}
                                <div className="border border-dashed border-primary/40 rounded-xl py-1.5 px-3 mb-3 text-center text-[11px] font-bold text-primary/70">🌿 Évaluer la durabilité</div>
                                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                  <p className="text-[11px] font-bold text-slate-400">{isPrimary ? "Activité principale" : "Activité secondaire"}</p>
                                  <button onClick={() => { setViewOrgActivity(act); setOrgActSliderIdx(0); }}
                                    className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                                    <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {activeTab === "activites" && (() => {
              const primaryActs = orgActivities.filter((a) => a.level === "primary");
              const secondaryActs = orgActivities.filter((a) => a.level === "secondary");
              const filtered = activityFilter === "primary" ? primaryActs
                : activityFilter === "secondary" ? secondaryActs
                : orgActivities;

              return (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-800">Activités ({orgActivities.length})</h3>
                    <button onClick={() => openActModal("secondary")} className="text-orange-500 hover:text-orange-400 text-xs font-extrabold flex items-center gap-1 transition-colors">
                      <Plus size={14} />Ajouter une activité secondaire
                    </button>
                  </div>

                  {orgActivities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: null,        label: "Toutes",                  count: orgActivities.length,   active: !activityFilter,                 cls: "bg-primary text-white border-primary" },
                        { key: "primary",   label: `Principales`,             count: primaryActs.length,     active: activityFilter === "primary",    cls: "bg-primary text-white border-primary" },
                        { key: "secondary", label: `Secondaires`,             count: secondaryActs.length,   active: activityFilter === "secondary",  cls: "bg-orange-500 text-white border-orange-500" },
                      ].filter((f) => f.count > 0 || f.key === null).map((f) => (
                        <button key={String(f.key)} onClick={() => setActivityFilter(f.active ? null : f.key)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${f.active ? f.cls : "bg-white text-slate-500 border-slate-200 hover:border-primary/40"}`}>
                          {f.label} ({f.count})
                        </button>
                      ))}
                    </div>
                  )}

                  {orgActivities.length === 0 ? (
                    <LaunchActivityCard />
                  ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                      <p className="text-slate-800 font-extrabold text-base">Aucune activité dans cette catégorie</p>
                      <button onClick={() => setActivityFilter(null)} className="mt-3 text-primary text-xs font-bold hover:underline">Voir toutes</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filtered.map((act) => {
                        const meta = findProviderTypeMeta(act.category);
                        const cat = getCategoryByValue(act.category);
                        const isPrimary = act.level === "primary";
                        const firstPhoto = Object.values(act.photos ?? {}).flat().filter(Boolean)[0] ?? null;
                        const subtypeLabels = (act.subtypes ?? []).map((sv) => cat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                        return (
                          <div key={act.id} className="bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                            <div className="relative h-48 w-full overflow-hidden">
                              <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
                              {firstPhoto ? <img src={firstPhoto} alt={meta.label} className="absolute inset-0 w-full h-full object-cover" />
                                : <div className="absolute inset-0 flex items-center justify-center select-none opacity-20"><span className="material-symbols-outlined" style={{ fontSize: 80 }}>{meta.categoryIcon}</span></div>}
                              <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-md border ${isPrimary ? "bg-primary text-white border-white/20" : "bg-white/95 text-orange-500 border-orange-100"}`}>
                                {isPrimary ? "Principale" : "Secondaire"}
                              </div>
                              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                                <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
                              </div>
                            </div>
                            <div className="p-5">
                              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-1 leading-tight">{meta.label}</h3>
                              {act.years_experience != null && <p className="text-slate-500 text-sm mb-2">{act.years_experience} an{act.years_experience > 1 ? "s" : ""} d'expérience</p>}
                              {org?.region && <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-3"><MapPin size={12} /><span>{org.region}</span></div>}
                              {subtypeLabels.length > 0 && (
                                <div className="mb-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 flex flex-wrap gap-1.5">
                                  {subtypeLabels.map((label) => <span key={label} className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">{label}</span>)}
                                </div>
                              )}
                              <div className="border border-dashed border-primary/40 rounded-xl py-1.5 px-3 mb-3 text-center text-[11px] font-bold text-primary/70">🌿 Évaluer la durabilité</div>
                              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                <p className="text-[11px] font-bold text-slate-400">{isPrimary ? "Activité principale" : "Activité secondaire"}</p>
                                <button onClick={() => { setViewOrgActivity(act); setOrgActSliderIdx(0); }}
                                  className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                                  <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {activeTab === "offres" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800">Offres disponibles ({offers.length})</h3>
                  <button onClick={openModal} className="text-primary hover:text-primary/80 text-xs font-extrabold flex items-center gap-1">+ Publier une offre</button>
                </div>
                {offers.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-primary text-3xl">sell</span>
                    </div>
                    <p className="text-slate-800 font-extrabold text-base">Aucune offre pour l'instant</p>
                    <p className="text-slate-400 text-sm mt-1">Publiez votre première expérience.</p>
                  </div>
                ) : (
                  offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)
                )}
              </div>
            )}

            {activeTab === "circuits" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Circuits multi-étapes</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Organisez des itinéraires sur plusieurs jours avec différentes destinations et activités</p>
                  </div>
                  <button onClick={() => openCircuitModal()} className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer">
                    <Plus size={13} />Créer un circuit
                  </button>
                </div>

                {circuits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100/80 shadow-sm text-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center">
                      <Route size={28} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-slate-800 font-extrabold text-base">Aucun circuit créé</p>
                      <p className="text-slate-400 text-sm mt-1 max-w-xs">Créez votre premier circuit multi-étapes avec des destinations, activités et hébergements.</p>
                    </div>
                    <button onClick={() => openCircuitModal()} className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all cursor-pointer">
                      <Plus size={13} />Créer mon premier circuit
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {circuits.map((circuit) => {
                      const catLabels = [...new Set(circuit.etapes.map((e) => PROVIDER_SCHEMA.find((c) => c.value === e.categorie)?.label ?? DOMAINES[e.categorie as string]?.label ?? e.categorie))];
                      const cStatus = circuit.status ?? "draft";
                      const cStatusLabel = cStatus === "approved" ? "Publié" : cStatus === "attente_publication" ? "Prêt à publier" : "Brouillon";
                      const cStatusCls = cStatus === "approved" ? "bg-emerald-500 text-white" : cStatus === "attente_publication" ? "bg-teal-500 text-white" : "bg-slate-400 text-white";
                      return (
                        <div key={circuit.id} id={`circuit-${circuit.id}`} className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-500 ${highlightCircuitId === circuit.id ? "border-primary ring-2 ring-primary/30 shadow-primary/20" : "border-slate-100/80"}`}>
                          <div className="flex gap-0">
                            {/* Cover */}
                            <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center">
                              {circuit.cover_image
                                ? <img src={circuit.cover_image} alt="" className="w-full h-full object-cover absolute inset-0" />
                                : <Route size={32} className="text-primary/40" />}
                              <span className={`absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg ${cStatusCls}`}>{cStatusLabel}</span>
                            </div>
                            {/* Info */}
                            <div className="flex-1 p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-base font-extrabold text-slate-800 leading-tight">{circuit.title}</h4>
                                  {circuit.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{circuit.description}</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {cStatus !== "approved" && (
                                    <button onClick={() => openCircuitModal(circuit)} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-primary/10 text-slate-500 hover:text-primary flex items-center justify-center transition-colors cursor-pointer" title="Modifier">
                                      <Edit3 size={14} />
                                    </button>
                                  )}
                                  <button onClick={async () => { if (!confirm(cStatus === "approved" ? "Supprimer ce circuit publié ? Les créneaux agenda de tous les collaborateurs seront supprimés." : "Supprimer ce circuit ?")) return; try { await apiFetch(`/circuits/${circuit.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); setCircuits((prev) => prev.filter((c) => c.id !== circuit.id)); } catch {} }} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                                  <Calendar size={10} />{circuit.nb_jours} jour{circuit.nb_jours > 1 ? "s" : ""}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                                  <MapPin size={10} />{circuit.etapes.length} étape{circuit.etapes.length > 1 ? "s" : ""}
                                </span>
                                {catLabels.slice(0, 3).map((l) => (
                                  <span key={l} className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-xl">{l}</span>
                                ))}
                              </div>
                              {/* Étapes preview */}
                              <div className="mt-3 space-y-1">
                                {circuit.etapes.slice(0, 3).map((etape, i) => {
                                  const cat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
                                  const stLabels = etape.subtypes.map((sv) => cat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                                  return (
                                    <div key={etape.id} className="flex items-center gap-2 text-xs">
                                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour}</span>
                                      <span className="font-semibold text-slate-700 truncate">{etape.destination}</span>
                                      <span className="text-slate-400 shrink-0">·</span>
                                      <span className="text-slate-400 truncate">{stLabels.join(", ")}</span>
                                    </div>
                                  );
                                })}
                                {circuit.etapes.length > 3 && <p className="text-[10px] text-slate-400 font-semibold">+{circuit.etapes.length - 3} étape{circuit.etapes.length - 3 > 1 ? "s" : ""}…</p>}
                              </div>
                              <button
                                onClick={async () => {
                                  setViewingCircuit(circuit);
                                  setViewingCircuitCollabsMap({});
                                  setPublishCircuitError("");
                                  try {
                                    // Charger la version enrichie (contribution_data + collaborator_status par étape)
                                    const enriched = await apiFetch<any>(`/circuits/${circuit.id}/view`, { headers: { Authorization: `Bearer ${token}` } });
                                    if (enriched) setViewingCircuit(enriched);
                                    // Construire la map de statuts depuis les étapes enrichies
                                    const m: Record<string, string> = {};
                                    ((enriched?.etapes ?? []) as any[]).forEach((e: any) => { if (e.id && e.collaborator_status) m[e.id] = e.collaborator_status; });
                                    setViewingCircuitCollabsMap(m);
                                  } catch {}
                                }}
                                className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                              >
                                <Info size={12} />Voir les détails
                              </button>
                            </div>
                          </div>
                          {/* Bandeau prêt à publier */}
                          {cStatus === "attente_publication" && (
                            <div className="border-t border-teal-200 bg-teal-50 px-6 py-3 flex items-center gap-3">
                              <span className="material-symbols-outlined text-teal-600 text-[18px]">pending_actions</span>
                              <p className="text-teal-700 text-xs font-bold flex-1">Tous les collaborateurs ont complété leur partie. Vérifiez le circuit et confirmez la publication.</p>
                              <button
                                onClick={async () => {
                                  setViewingCircuit(circuit);
                                  setViewingCircuitCollabsMap({});
                                  setPublishCircuitError("");
                                  try {
                                    const enriched = await apiFetch<any>(`/circuits/${circuit.id}/view`, { headers: { Authorization: `Bearer ${token}` } });
                                    if (enriched) setViewingCircuit(enriched);
                                    const m: Record<string, string> = {};
                                    ((enriched?.etapes ?? []) as any[]).forEach((e: any) => { if (e.id && e.collaborator_status) m[e.id] = e.collaborator_status; });
                                    setViewingCircuitCollabsMap(m);
                                  } catch {}
                                }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-extrabold hover:bg-teal-700 transition-colors shrink-0"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Vérifier et confirmer
                              </button>
                            </div>
                          )}
                          {/* J'aime / Commentaire / Partage — circuits publiés uniquement */}
                          {cStatus === "approved" && (
                            <PubInteractions
                              pubId={circuit.id}
                              token={token}
                              viewerId={profile?.user_id ?? ""}
                              shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${profile?.user_id}?tab=circuits&circuit=${circuit.id}`}
                              pubTitle={circuit.title}
                              itemApiBase="/interactions/circuit"
                              commentApiBase="/interactions"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "reseau" && (
              <div className="space-y-5">
                {/* Search */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2"><Search size={16} className="text-primary" />Rechercher un utilisateur à suivre</h3>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" value={netSearch} onChange={(e) => setNetSearch(e.target.value)} placeholder="Nom d'un guide ou prestataire…"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors" />
                    {netSearch && <button onClick={() => { setNetSearch(""); setNetResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                  </div>
                  {netLoading && <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />Recherche…</div>}
                  {!netLoading && netResults.length > 0 && (
                    <div className="mt-3 divide-y divide-slate-50">
                      {netResults.map((r) => {
                        const path = r._type === "guide" ? `/profile/guide/${r.user_id}` : `/profile/provider/${r.user_id}`;
                        const typeLabel = r._type === "guide" ? "Guide" : "Prestataire";
                        return (
                        <div key={r.user_id} className="flex items-center justify-between py-3 gap-3">
                          <button onClick={() => router.push(path)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">{r.photo ? <img src={r.photo} alt={r.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">person</span>}</div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-800 text-sm truncate">{r.full_name}</p>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{typeLabel}</span>
                            </div>
                          </button>
                          <button onClick={() => router.push(path)} className="shrink-0 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">Voir</button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                  {!netLoading && netSearch.trim() && netResults.length === 0 && <p className="mt-3 text-xs text-slate-400 italic">Aucun résultat pour "{netSearch}"</p>}
                </div>

                {/* Suivi(e)s */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <UserPlus size={16} className="text-primary" />Suivi(e)s
                    {following.length > 0 && <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{following.length}</span>}
                  </h3>
                  {following.length === 0 ? <p className="text-sm text-slate-400">Vous ne suivez personne encore.</p> : (
                    <div className="divide-y divide-slate-50" onClick={() => setNetMenuId(null)}>
                      {following.map((f) => (
                        <div key={f.user_id} className="flex items-center justify-between py-3 gap-2">
                          <button onClick={() => router.push(`/profile/guide/${f.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">{f.photo ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">person</span>}</div>
                            <div className="min-w-0"><p className="font-extrabold text-slate-800 text-sm truncate">{f.full_name}</p>{f.sub && <p className="text-xs text-slate-400">{f.sub}</p>}</div>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => router.push(`/profile/guide/${f.user_id}`)} className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">Voir</button>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setNetMenuId(netMenuId === `fw-${f.user_id}` ? null : `fw-${f.user_id}`)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                <MoreVertical size={15} />
                              </button>
                              {netMenuId === `fw-${f.user_id}` && (
                                <div className="absolute right-0 top-9 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                  <button onClick={() => handleNetUnfollow(f.user_id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                    <UserX size={14} className="text-slate-400" /> Se désabonner
                                  </button>
                                  <button onClick={() => handleNetBlock(f.user_id, true)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50">
                                    <ShieldBan size={14} /> Bloquer
                                  </button>
                                  <div className="border-t border-slate-100 my-0.5" />
                                  <button onClick={() => { setNetReport({ id: f.user_id, name: f.full_name }); setNetMenuId(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                                    <Flag size={14} /> Signaler
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Demandes de suivi reçues */}
                {followRequests.length > 0 && (
                  <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6">
                    <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                      <UserPlus size={16} className="text-amber-500" />Demandes de suivi
                      <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">{followRequests.length}</span>
                    </h3>
                    <div className="divide-y divide-slate-50">
                      {followRequests.map((req) => {
                        const roleLabel = req.sender.role === "eco_traveler" ? "Éco-Voyageur" : req.sender.role === "guide" ? "Guide" : "Prestataire";
                        return (
                          <div key={req.id} className="flex items-center justify-between py-3 gap-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                {req.sender.photo ? <img src={req.sender.photo} alt={req.sender.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">person</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 text-sm truncate">{req.sender.full_name ?? "Utilisateur"}</p>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{roleLabel}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={async () => {
                                try {
                                  await apiFetch(`/follows/${req.id}/accept`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
                                  setFollowRequests((prev) => prev.filter((r) => r.id !== req.id));
                                  setFollowers((prev) => [...prev, { user_id: req.sender.user_id, full_name: req.sender.full_name ?? "", photo: req.sender.photo, _type: req.sender.role }]);
                                } catch {}
                              }} className="px-3 py-1.5 bg-primary text-slate-900 text-xs font-extrabold rounded-xl hover:bg-primary/90 transition-all">
                                Accepter
                              </button>
                              <button onClick={async () => {
                                try {
                                  await apiFetch(`/follows/${req.id}/reject`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                  setFollowRequests((prev) => prev.filter((r) => r.id !== req.id));
                                } catch {}
                              }} className="px-3 py-1.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all">
                                Refuser
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mes abonnés */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <Users size={16} className="text-primary" />Mes abonnés
                    {followers.length > 0 && <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{followers.length}</span>}
                  </h3>
                  {followers.length === 0 ? <p className="text-sm text-slate-400">Aucun abonné pour l'instant.</p> : (
                    <div className="divide-y divide-slate-50" onClick={() => setNetMenuId(null)}>
                      {followers.map((f) => {
                        const path = f._type === "eco_traveler" ? `/profile/ecovoyageur/${f.user_id}` : f._type === "guide" ? `/profile/guide/${f.user_id}` : `/profile/project-owner/${f.user_id}`;
                        const typeLabel = f._type === "eco_traveler" ? "Éco-Voyageur" : f._type === "guide" ? "Guide" : "Prestataire";
                        return (
                          <div key={f.user_id} className="flex items-center justify-between py-3 gap-2">
                            <button onClick={() => router.push(path)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">{f.photo ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">person</span>}</div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 text-sm truncate">{f.full_name}</p>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{typeLabel}</span>
                              </div>
                            </button>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => router.push(path)} className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">Voir</button>
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setNetMenuId(netMenuId === `ab-${f.user_id}` ? null : `ab-${f.user_id}`)}
                                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                  <MoreVertical size={15} />
                                </button>
                                {netMenuId === `ab-${f.user_id}` && (
                                  <div className="absolute right-0 top-9 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                    <button onClick={async () => {
                                      try { await apiFetch(`/follows/follower/${f.user_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); setFollowers((prev) => prev.filter((x) => x.user_id !== f.user_id)); } catch {}
                                      setNetMenuId(null);
                                    }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                      <UserX size={14} className="text-slate-400" /> Retirer
                                    </button>
                                    <button onClick={() => handleNetBlock(f.user_id, false)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50">
                                      <ShieldBan size={14} /> Bloquer
                                    </button>
                                    <div className="border-t border-slate-100 my-0.5" />
                                    <button onClick={() => { setNetReport({ id: f.user_id, name: f.full_name }); setNetMenuId(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                                      <Flag size={14} /> Signaler
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "apropos" && (
              <div className="space-y-5">

                {/* ── SECTION PRESTATAIRE ──────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>person</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">Prestataire</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {/* Photo + nom + rôle */}
                    <div className="flex items-center gap-4 px-6 py-5">
                      <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border-2 border-primary/20 shadow-sm">
                        {profile.photo
                          ? <img src={profile.photo} alt="" className="w-full h-full object-cover" />
                          : <span className="material-symbols-outlined text-primary text-2xl">person</span>
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-extrabold text-slate-900 truncate">{profile.full_name || "—"}</p>
                        {profile.position && <p className="text-xs font-semibold text-slate-500 mt-0.5">{profile.position}</p>}
                      </div>
                    </div>
                    {/* Bio personnelle */}
                    {profile.personal_bio && (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-black text-primary/70 tracking-widest uppercase mb-2">À propos</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.personal_bio}</p>
                      </div>
                    )}
                    {/* Expérience */}
                    {profile.years_experience !== null && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>workspace_premium</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Expérience</p>
                          <p className="text-sm font-bold text-slate-800">{profile.years_experience} an{profile.years_experience > 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    )}
                    {/* Langues */}
                    {(profile.languages_spoken?.length || profile.language) && (
                      <div className="flex items-start gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>translate</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Langues parlées</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(profile.languages_spoken?.length
                              ? profile.languages_spoken
                              : profile.language ? [profile.language] : []
                            ).map((l) => (
                              <span key={l} className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full">
                                {{ fr: "Français", ar: "Arabe", en: "Anglais", es: "Espagnol", de: "Allemand", it: "Italien", ber: "Amazigh" }[l] ?? l}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Certifications personnelles */}
                    {profile.personal_certifications?.length ? (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Certifications personnelles</p>
                        <div className="space-y-2">
                          {profile.personal_certifications.map((cert, i) => (
                            <div key={i} className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
                              <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 16 }}>verified</span>
                              <span className="text-sm font-bold text-slate-700 flex-1 min-w-0 truncate">{cert.name}</span>
                              {cert.document_url && (
                                <button onClick={() => openDoc(cert.document_url!)}
                                  className="text-[10px] font-black text-primary hover:underline shrink-0 bg-primary/10 px-2 py-1 rounded-full">
                                  Voir
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {!profile.full_name && !profile.position && !profile.personal_bio && !profile.years_experience && !profile.language && !profile.languages_spoken?.length && !profile.personal_certifications?.length && (
                      <div className="px-6 py-6 text-center text-slate-400 text-xs font-medium">Aucune information renseignée.</div>
                    )}
                  </div>
                </div>

                {/* ── SECTION ORGANISATION ──────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 size={16} className="text-primary" />
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">Organisation</p>
                  </div>
                  {org ? (
                    <div className="divide-y divide-slate-50">
                      {/* Logo + nom + type */}
                      <div className="flex items-center gap-4 px-6 py-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-primary/15 shadow-sm">
                          {org.logo
                            ? <img src={org.logo} alt="" className="w-full h-full object-cover" />
                            : <span className="material-symbols-outlined text-primary text-2xl">store</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-extrabold text-slate-900 truncate">{org.name}</p>
                          {org.provider_type && (() => {
                            const pt = PROVIDER_TYPES.find((t) => t.value === org.provider_type);
                            return pt ? (
                              <span className="inline-flex items-center gap-1 mt-1 bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-lg">
                                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{pt.icon}</span>{pt.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      {/* Description */}
                      {org.bio && (
                        <div className="px-6 py-4">
                          <p className="text-[10px] font-black text-primary/70 tracking-widest uppercase mb-2">Description</p>
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{org.bio}</p>
                        </div>
                      )}
                      {/* Histoire */}
                      {org.history && (
                        <div className="px-6 py-4">
                          <p className="text-[10px] font-black text-primary/70 tracking-widest uppercase mb-2">Histoire & Origine</p>
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{org.history}</p>
                        </div>
                      )}
                      {/* Localisation */}
                      {(org.region || org.country || org.address || org.zone) && (
                        <div className="flex items-start gap-4 px-6 py-4">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin size={16} className="text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Localisation</p>
                            <p className="text-sm font-bold text-slate-800">
                              {[org.address, org.zone, org.region, org.country].filter(Boolean).join(", ")}
                            </p>
                            {org.lat && org.lng && (
                              <div className="mt-3">
                                <LocationMap lat={org.lat} lng={org.lng} address={[org.address, org.zone, org.region].filter(Boolean).join(", ")} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Contact */}
                      {(org.phone || org.whatsapp || org.email) && (
                        <div className="px-6 py-4 space-y-2">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Contact</p>
                          {[
                            org.phone    && { icon: "phone", href: `tel:${org.phone}`,                              label: org.phone },
                            org.whatsapp && { icon: "chat",  href: `https://wa.me/${org.whatsapp.replace(/\D/g,"")}`, label: org.whatsapp, ext: true },
                            org.email    && { icon: "email", href: `mailto:${org.email}`,                            label: org.email },
                          ].filter(Boolean).map((item: any, i) => (
                            <a key={i} href={item.href} {...(item.ext ? { target: "_blank", rel: "noreferrer" } : {})}
                              className="flex items-center gap-3 text-sm font-semibold text-primary hover:underline group">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>{item.icon}</span>
                              </div>
                              <span className="truncate">{item.label}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {/* Réseaux sociaux & site */}
                      {(org.website || org.instagram || org.facebook || org.tiktok) && (
                        <div className="px-6 py-4 space-y-2">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Présence en ligne</p>
                          {[
                            org.website   && { icon: "language",     href: org.website,                            label: org.website },
                            org.instagram && { icon: "photo_camera", href: socialHref("instagram", org.instagram), label: org.instagram },
                            org.facebook  && { icon: "groups",       href: socialHref("facebook",  org.facebook),  label: org.facebook },
                            org.tiktok    && { icon: "videocam",     href: socialHref("tiktok",    org.tiktok),    label: org.tiktok },
                          ].filter(Boolean).map((item: any, i) => (
                            <a key={i} href={item.href} target="_blank" rel="noreferrer"
                              className="flex items-center gap-3 text-sm font-semibold text-primary hover:underline group">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>{item.icon}</span>
                              </div>
                              <span className="truncate">{item.label}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {/* Vidéos */}
                      {org.videos?.filter(Boolean).length ? (
                        <div className="px-6 py-4 space-y-2">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Vidéos</p>
                          {org.videos!.filter(Boolean).map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-3 text-sm font-semibold text-primary hover:underline group">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>play_circle</span>
                              </div>
                              <span className="truncate">{url}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {/* Photos de présentation */}
                      {org.photos?.filter(Boolean).length ? (
                        <div className="px-6 py-4">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Photos</p>
                          <div className="grid grid-cols-3 gap-2">
                            {org.photos!.filter(Boolean).map((src, i) => (
                              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                                <img src={src} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {/* Certifications org */}
                      {org.certifications?.length ? (
                        <div className="px-6 py-4">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Certifications</p>
                          <div className="space-y-2">
                            {org.certifications.map((cert, i) => (
                              <div key={i} className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
                                <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 16 }}>verified</span>
                                <span className="text-sm font-bold text-slate-700 flex-1 min-w-0 truncate">{cert.name}</span>
                                {cert.document_url && (
                                  <button onClick={() => openDoc(cert.document_url!)}
                                    className="text-[10px] font-black text-primary shrink-0 bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-colors">
                                    Voir
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <span className="material-symbols-outlined text-slate-200 text-4xl block mb-2">store</span>
                      <p className="text-slate-400 text-xs font-medium">Aucune organisation enregistrée.</p>
                    </div>
                  )}
                </div>

                {/* Activités proposées — même style que ActivityCard */}
                {orgActivities.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Sparkles size={12} className="text-primary" />
                        <span>Activités proposées</span>
                      </h3>
                      <button onClick={() => setActiveTab("activites")}
                        className="text-primary text-[10px] font-black hover:underline flex items-center gap-1">
                        Voir toutes <ArrowRight size={10} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {orgActivities.map((act) => {
                        const meta = findProviderTypeMeta(act.category);
                        const cat = getCategoryByValue(act.category);
                        const isPrimary = act.level === "primary";
                        const allPhotos = Object.values(act.photos ?? {}).flat().filter(Boolean);
                        const firstPhoto = allPhotos[0] ?? null;
                        const subtypeLabels = (act.subtypes ?? []).map((sv) =>
                          cat?.subtypes.find((s) => s.value === sv)?.label ?? sv
                        );

                        return (
                          <div key={act.id} className="bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                            {/* Cover */}
                            <div className="relative h-48 w-full overflow-hidden">
                              <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
                              {firstPhoto
                                ? <img src={firstPhoto} alt={meta.label} className="absolute inset-0 w-full h-full object-cover" />
                                : <div className="absolute inset-0 flex items-center justify-center select-none opacity-20">
                                    <span className="material-symbols-outlined" style={{ fontSize: 80 }}>{meta.categoryIcon}</span>
                                  </div>
                              }
                              {allPhotos.length > 1 && (
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                  {allPhotos.length} photos
                                </div>
                              )}
                              <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-md border ${isPrimary ? "bg-primary text-white border-white/20" : "bg-white/95 text-orange-500 border-orange-100"}`}>
                                {isPrimary ? "Principale" : "Secondaire"}
                              </div>
                              <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                                <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-1 leading-tight">{meta.label}</h3>
                              {act.years_experience != null && (
                                <p className="text-slate-500 text-sm leading-relaxed mb-2">
                                  {act.years_experience} an{act.years_experience > 1 ? "s" : ""} d'expérience
                                </p>
                              )}
                              {org?.region && (
                                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mb-3">
                                  <MapPin size={12} /><span>{org.region}</span>
                                </div>
                              )}
                              {/* Subtypes + certifications info block */}
                              {(subtypeLabels.length > 0 || act.certifications?.length > 0) && (
                                <div className="mb-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50 space-y-1.5">
                                  {subtypeLabels.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {subtypeLabels.map((label) => (
                                        <span key={label} className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">{label}</span>
                                      ))}
                                    </div>
                                  )}
                                  {act.certifications?.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>
                                      {act.certifications.length} certification{act.certifications.length > 1 ? "s" : ""}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="border border-dashed border-primary/40 rounded-xl py-1.5 px-3 mb-3 text-center text-[11px] font-bold text-primary/70">
                                🌿 Évaluer la durabilité
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                <p className="text-[11px] font-bold text-slate-400">
                                  {isPrimary ? "Activité principale" : "Activité secondaire"}
                                </p>
                                <button
                                  onClick={() => { setViewOrgActivity(act); setOrgActSliderIdx(0); }}
                                  className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200"
                                >
                                  <span>Voir les détails</span>
                                  <ArrowRight size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Activité stats */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Activité</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: offers.length,              label: "Offres",       icon: "sell",            color: "text-primary   bg-primary/10" },
                      { value: profile.total_reservations, label: "Réservations", icon: "event_available", color: "text-blue-500  bg-blue-50" },
                      { value: profile.feedback_received,  label: "Avis reçus",   icon: "star",            color: "text-amber-500 bg-amber-50" },
                    ].map((s) => (
                      <div key={s.label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                          <span className="material-symbols-outlined text-base">{s.icon}</span>
                        </div>
                        <p className="text-2xl font-extrabold text-slate-800">{s.value}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score de durabilité */}
                {profile.sustainability_score !== null && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Score de durabilité</p>
                      <span className="text-xl font-extrabold text-primary">{profile.sustainability_score}<span className="text-sm text-slate-400 font-bold">/100</span></span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${profile.sustainability_score}%` }} />
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-2">
                      {scoreLabel(profile.sustainability_score)}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* ── Onglet Collaborations ── */}
            {activeTab === "collaborations" && (() => {
              const SECTION_META: Record<string, { label: string; icon: string; grad: string }> = {
                // Sections offre
                restauration: { label: "Restauration", icon: "restaurant",    grad: "from-emerald-600 to-green-500" },
                transport:    { label: "Transport",    icon: "directions_bus", grad: "from-slate-600 to-slate-500" },
                hebergement:  { label: "Hébergement", icon: "hotel",          grad: "from-teal-600 to-emerald-500" },
                guide:        { label: "Guidage",     icon: "hiking",         grad: "from-emerald-500 to-green-500" },
                autre:        { label: "Autre",       icon: "category",       grad: "from-slate-500 to-slate-600" },
                // Domaines guidage circuit
                nature_ecotourisme:   { label: "Nature & Écotourisme",    icon: "park",                grad: "from-green-600 to-emerald-500" },
                culture_patrimoine:   { label: "Culture & Patrimoine",    icon: "account_balance",     grad: "from-amber-600 to-orange-500" },
                historique_archeo:    { label: "Historique & Archéo",     icon: "history_edu",         grad: "from-stone-600 to-amber-700" },
                aventure_randonnee:   { label: "Aventure & Randonnée",    icon: "hiking",              grad: "from-teal-600 to-cyan-500" },
                gastronomie_locale:   { label: "Gastronomie locale",      icon: "restaurant",          grad: "from-orange-600 to-amber-500" },
                artisanat_traditions: { label: "Artisanat & Traditions",  icon: "palette",             grad: "from-rose-600 to-pink-500" },
                decouverte_urbaine:   { label: "Découverte urbaine",      icon: "location_city",       grad: "from-slate-600 to-blue-600" },
                eco_tour:             { label: "Éco-Tour",                icon: "eco",                 grad: "from-green-600 to-teal-500" },
                activite:             { label: "Activité",                icon: "sports",              grad: "from-teal-600 to-emerald-500" },
                bien_etre_spa:        { label: "Bien-être & Spa",         icon: "spa",                 grad: "from-purple-500 to-violet-500" },
                volontariat_eco:      { label: "Volontariat Éco",         icon: "volunteer_activism",  grad: "from-emerald-600 to-green-500" },
                autre_service:        { label: "Autre service",           icon: "category",            grad: "from-slate-500 to-slate-600" },
              };
              const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
                pending:         { label: "En attente",               cls: "bg-slate-100 text-slate-600 border-slate-200",     icon: "schedule" },
                accepted:        { label: "Acceptée",                 cls: "bg-teal-100 text-teal-700 border-teal-200",       icon: "check_circle" },
                completed:       { label: "Complétée",                cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "task_alt" },
                declined:        { label: "Refusée",                  cls: "bg-red-100 text-red-700 border-red-200",          icon: "cancel" },
                offer_deleted:   { label: "Offre supprimée",          cls: "bg-orange-100 text-orange-700 border-orange-200", icon: "delete_forever" },
                circuit_deleted: { label: "Circuit supprimé",         cls: "bg-orange-100 text-orange-700 border-orange-200", icon: "delete_forever" },
                collab_kicked:   { label: "Retiré par le propriétaire", cls: "bg-red-100 text-red-700 border-red-200",       icon: "person_remove" },
                collab_quit:     { label: "Vous avez quitté",         cls: "bg-slate-100 text-slate-500 border-slate-200",   icon: "exit_to_app" },
              };
              return (
                <div className="space-y-4">
                  {collabLoading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                      <span className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <span className="text-sm">Chargement…</span>
                    </div>
                  ) : collaborations.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-14 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">handshake</span>
                      <p className="font-extrabold text-slate-700 text-base mb-1">Aucune invitation de collaboration</p>
                      <p className="text-slate-400 text-sm">Vous recevrez ici les invitations des guides pour leurs offres.</p>
                    </div>
                  ) : (
                    collaborations.map((c) => {
                      const sm = SECTION_META[c.section] ?? SECTION_META.autre;
                      const isCircuit = c.source_type === "circuit";
                      const effectiveStatus = isCircuit ? c.circuit_status : c.offer_status;
                      const isOfferDeleted = effectiveStatus === "offer_deleted" || effectiveStatus === "circuit_deleted";
                      const isKicked = effectiveStatus === "collab_kicked";
                      const isGuideQuit = effectiveStatus === "collab_quit";
                      const isInactive = isOfferDeleted || isKicked || isGuideQuit;
                      const st = isOfferDeleted ? (isCircuit ? STATUS_META.circuit_deleted : STATUS_META.offer_deleted) : isKicked ? STATUS_META.collab_kicked : isGuideQuit ? STATUS_META.collab_quit : (STATUS_META[c.status] ?? STATUS_META.pending);
                      const displayTitle = isCircuit ? (c.circuit_title ?? "Circuit") : (c.offer_title ?? "Offre");
                      const displayCover = isCircuit ? c.circuit_cover : c.offer_cover;
                      return (
                        <div key={c.id} id={`collab-${c.id}`} className={`relative group bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 ${highlightCollabId === c.id ? "border-primary ring-2 ring-primary/30 shadow-primary/20" : "border-slate-100/90"}`}>
                          <button
                            onClick={async () => {
                              try {
                                if (['accepted', 'completed'].includes(c.status)) {
                                  await apiFetch(`/guide/collaborations/${c.id}/withdraw`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
                                } else {
                                  await apiFetch(`/guide/collaborations/${c.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                }
                                setCollaborations(prev => prev.filter(x => x.id !== c.id));
                              } catch {
                                alert("Erreur lors de la suppression. Veuillez réessayer.");
                              }
                            }}
                            className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/80 hover:bg-red-50 border border-slate-100 hover:border-red-200 text-slate-300 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                          {isCircuit ? (
                            /* ── Card circuit — même design que la card Circuits du propriétaire ── */
                            <div className="flex gap-0">
                              {/* Cover compact w-40 */}
                              <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center overflow-hidden">
                                {displayCover
                                  ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                                  : <span className="material-symbols-outlined text-primary/30" style={{ fontSize: 32 }}>route</span>
                                }
                                <span className={`absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg ${st.cls}`}>{st.label}</span>
                              </div>
                              {/* Contenu */}
                              <div className="flex-1 p-5">
                                <h4 className="text-base font-extrabold text-slate-800 leading-tight">{displayTitle}</h4>
                                {c.circuit_description && (
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.circuit_description}</p>
                                )}
                                {/* Badges : jours + étapes — même style que la card propriétaire */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {c.circuit_nb_jours && (
                                    <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
                                      <Calendar size={10} />{c.circuit_nb_jours} jour{c.circuit_nb_jours > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {c.circuit_nb_etapes != null && c.circuit_nb_etapes > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                                      <MapPin size={10} />{c.circuit_nb_etapes} étape{c.circuit_nb_etapes > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                                {/* Liste étapes preview — même style que la card propriétaire */}
                                {(c.circuit_etapes_preview ?? []).length > 0 && (
                                  <div className="mt-3 space-y-1">
                                    {(c.circuit_etapes_preview ?? []).map((etape, i) => {
                                      const isGuidage = etape.etape_mode === "guidage";
                                      const eCat = PROVIDER_SCHEMA.find((s) => s.value === etape.categorie);
                                      const catLabel = eCat?.label ?? (DOMAINES as any)[etape.categorie ?? ""]?.label ?? SECTION_META[etape.categorie ?? ""]?.label ?? etape.categorie ?? "";
                                      const displayName = etape.titre || etape.destination || catLabel || "Étape";
                                      const stLabels = isGuidage
                                        ? (etape.expertises ?? []).slice(0, 2)
                                        : (etape.subtypes ?? []).slice(0, 2).map((sv) => eCat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                                      return (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour}</span>
                                          <span className="font-semibold text-slate-700 truncate">{displayName}</span>
                                          {stLabels.length > 0 && (
                                            <>
                                              <span className="text-slate-300 shrink-0">·</span>
                                              <span className="text-slate-400 truncate text-[11px]">{stLabels.join(", ")}</span>
                                            </>
                                          )}
                                          {etape.heure_debut && (
                                            <>
                                              <span className="text-slate-300 shrink-0">·</span>
                                              <span className="text-slate-400 truncate text-[10px] shrink-0">{etape.heure_debut}{etape.heure_fin ? ` → ${etape.heure_fin}` : ""}</span>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {(c.circuit_nb_etapes ?? 0) > (c.circuit_etapes_preview ?? []).length && (
                                      <p className="text-[10px] text-slate-400 font-semibold">+{(c.circuit_nb_etapes ?? 0) - (c.circuit_etapes_preview ?? []).length} étape{((c.circuit_nb_etapes ?? 0) - (c.circuit_etapes_preview ?? []).length) > 1 ? "s" : ""}…</p>
                                    )}
                                  </div>
                                )}
                                {c.message && (
                                  <p className="mt-2 text-slate-400 text-xs leading-relaxed line-clamp-1 italic border-l-2 border-slate-200 pl-2">&ldquo;{c.message}&rdquo;</p>
                                )}
                                {isInactive ? (
                                  <span className={`mt-3 inline-flex items-center gap-1 font-extrabold text-xs ${isKicked ? "text-red-400" : isGuideQuit ? "text-slate-400" : "text-orange-400"}`}>
                                    <span className="material-symbols-outlined text-sm">{st.icon}</span>
                                    {st.label}
                                  </span>
                                ) : (
                                  <button onClick={() => {
                                    setOpenCollab(c);
                                    setDetailOffer(null);
                                    setCircuitFullDetail(null);
                                    if (c.circuit_id) {
                                      setCircuitFullDetailLoading(true);
                                      apiFetch<any>(`/circuits/${c.circuit_id}/view`, { headers: { Authorization: `Bearer ${token}` } })
                                        .then(setCircuitFullDetail).catch(() => setCircuitFullDetail(null)).finally(() => setCircuitFullDetailLoading(false));
                                    }
                                  }}
                                    className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 cursor-pointer">
                                    <Info size={12} />Voir les détails
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* ── Card offre — layout d'origine ── */
                            <div className="flex flex-col sm:flex-row">
                              <div className="relative bg-slate-50 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-100 sm:w-2/5 min-h-[180px]">
                                {displayCover ? (
                                  <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                  <>
                                    <div className={`absolute inset-0 bg-gradient-to-br ${sm.grad} opacity-90`} />
                                    <span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 100 }}>{sm.icon}</span>
                                  </>
                                )}
                                <div className={`absolute top-2 left-2 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-xl shadow border flex items-center gap-1 ${st.cls}`}>
                                  <span className="material-symbols-outlined text-xs">{st.icon}</span>{st.label}
                                </div>
                              </div>
                              <div className="flex-1 flex flex-col justify-between p-6 md:p-8">
                                <div>
                                  <h3 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight leading-tight mb-2">{displayTitle}</h3>
                                  {c.offer_description && (
                                    <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{c.offer_description}</p>
                                  )}
                                  {c.message && (
                                    <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2 italic border-l-2 border-slate-200 pl-3">&ldquo;{c.message}&rdquo;</p>
                                  )}
                                  <div className="flex flex-wrap gap-2.5 mb-4">
                                    <span className={`flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-xl text-white bg-gradient-to-r ${sm.grad} uppercase`}>
                                      <span className="material-symbols-outlined text-sm">{sm.icon}</span>{sm.label}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3">
                                  <p className="text-[11px] font-bold text-slate-400">
                                    {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                  </p>
                                  {isInactive ? (
                                    <span className={`font-extrabold text-xs inline-flex items-center gap-1 ${isKicked ? "text-red-400" : isGuideQuit ? "text-slate-400" : "text-orange-400"}`}>
                                      <span className="material-symbols-outlined text-sm">{st.icon}</span>
                                      {st.label}
                                    </span>
                                  ) : (
                                    <button onClick={() => {
                                      setOpenCollab(c);
                                      setDetailOffer(null);
                                      setCircuitFullDetail(null);
                                      if (c.offer_id) {
                                        setDetailOfferLoading(true);
                                        apiFetch<OfferFull>(`/guide/offers/${c.offer_id}/detail`, { headers: { Authorization: `Bearer ${token}` } })
                                          .then(setDetailOffer).catch(() => setDetailOffer(null)).finally(() => setDetailOfferLoading(false));
                                      }
                                    }}
                                      className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                                      <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {/* J'aime / Commentaire / Partage de la ressource associée */}
                          {!isCircuit && c.offer_status === "approved" && c.offer_id && (
                            <PubInteractions
                              pubId={c.offer_id}
                              token={token}
                              viewerId={profile?.user_id ?? ""}
                              shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${c.guide_id}?offer=${c.offer_id}`}
                              pubTitle={c.offer_title ?? undefined}
                              itemApiBase="/interactions/offer"
                              commentApiBase="/interactions"
                            />
                          )}
                          {isCircuit && c.circuit_status === "approved" && c.circuit_id && (
                            <PubInteractions
                              pubId={c.circuit_id}
                              token={token}
                              viewerId={profile?.user_id ?? ""}
                              shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/${c.circuit_owner_type === "guide" ? "guide" : "provider"}/${c.owner_id}?tab=circuits&circuit=${c.circuit_id}`}
                              pubTitle={c.circuit_title ?? undefined}
                              itemApiBase="/interactions/circuit"
                              commentApiBase="/interactions"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* ── Formulaire collaboration (après acceptation) ── */}
            {openCollab && showCollabForm && (
              <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-3xl h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                  <CollaborationModal
                    collabId={openCollab.id}
                    offerId={openCollab.offer_id ?? ""}
                    section={openCollab.section}
                    token={token}
                    offerApproved={openCollab.source_type === "circuit" ? openCollab.circuit_status === "approved" : openCollab.offer_status === "approved"}
                    circuitId={openCollab.source_type === "circuit" ? (openCollab.circuit_id ?? undefined) : undefined}
                    etapeId={openCollab.source_type === "circuit" ? (openCollab.etape_id ?? undefined) : undefined}
                    onClose={() => { setShowCollabForm(false); setOpenCollab(null); }}
                    onContributed={() => {
                      setCollaborations((prev) => prev.map((x) => x.id === openCollab!.id ? { ...x, status: "completed" as const } : x));
                      setOpenCollab((prev) => prev ? { ...prev, status: "completed" } : null);
                    }}
                    onSaved={() => {
                      setShowCollabForm(false);
                      setDetailOfferLoading(true);
                      apiFetch<OfferFull>(`/guide/offers/${openCollab!.offer_id}/detail`, {
                        headers: { Authorization: `Bearer ${token}` },
                      }).then(setDetailOffer).catch(() => setDetailOffer(null)).finally(() => setDetailOfferLoading(false));
                    }}
                    onDeleted={() => {
                      setCollaborations((prev) => prev.map((x) => x.id === openCollab!.id ? { ...x, status: "declined" } : x));
                      setOpenCollab(null);
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── Détail de l'offre (OfferDetailView) + actions ── */}
            {openCollab && !showCollabForm && (
              <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-3xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
                  <button onClick={() => { setOpenCollab(null); setDetailOffer(null); setCircuitFullDetail(null); }}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors">
                    <X size={16} className="text-white" />
                  </button>
                  {/* Collaboration context banner */}
                  {(() => {
                    const sectionLabels: Record<string, string> = { restauration: "Restauration", transport: "Transport", hebergement: "Hébergement", guide: "Guidage", autre_service: "Autre service", autre: "Autre" };
                    const statusInfo: Record<string, { label: string; cls: string }> = {
                      pending:       { label: "En attente",      cls: "bg-slate-100 text-slate-600 border-slate-200" },
                      accepted:      { label: "Acceptée",        cls: "bg-teal-50 text-teal-700 border-teal-200" },
                      completed:     { label: "Complétée",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      declined:      { label: "Refusée",         cls: "bg-red-50 text-red-600 border-red-200" },
                      offer_deleted: { label: "Offre supprimée", cls: "bg-orange-50 text-orange-700 border-orange-200" },
                    };
                    const si = openCollab.offer_status === "offer_deleted"
                      ? statusInfo.offer_deleted
                      : (statusInfo[openCollab.status] ?? { label: openCollab.status, cls: "bg-slate-100 text-slate-600 border-slate-200" });
                    return (
                      <div className="shrink-0 px-5 py-2.5 flex items-center gap-2.5 bg-amber-50/80 border-b border-amber-100">
                        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-amber-600 text-[14px]">handshake</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-amber-700 flex-1">
                          Collaboration · {sectionLabels[openCollab.section] ?? openCollab.section}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${si.cls}`}>{si.label}</span>
                      </div>
                    );
                  })()}
                  {/* Corps scrollable */}
                  <div className="flex-1 overflow-y-auto">
                    {openCollab.source_type === "circuit" ? (
                      /* ── Circuit complet côté collaborateur ── */
                      circuitFullDetailLoading ? (
                        <div className="flex items-center justify-center h-full gap-3 text-slate-400">
                          <span className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <span className="text-sm">Chargement du circuit…</span>
                        </div>
                      ) : circuitFullDetail ? (
                        <>
                          {/* Hero cover */}
                          <div className="relative shrink-0">
                            {circuitFullDetail.cover_image
                              ? <img src={circuitFullDetail.cover_image} alt="" className="w-full h-40 object-cover" />
                              : <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-primary/30" style={{ fontSize: 56 }}>route</span>
                                </div>
                            }
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                              <h3 className="text-xl font-extrabold text-white leading-tight">{circuitFullDetail.title}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-[11px] font-black text-white/90">
                                  <Calendar size={11} />{circuitFullDetail.nb_jours} jour{circuitFullDetail.nb_jours > 1 ? "s" : ""}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] font-black text-white/90">
                                  <MapPin size={11} />{(circuitFullDetail.etapes ?? []).length} étape{(circuitFullDetail.etapes ?? []).length > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                          <CircuitViewContent circuit={circuitFullDetail} />
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-slate-400">
                          <span className="material-symbols-outlined text-5xl text-slate-300">route</span>
                          <div className="text-center">
                            <p className="font-extrabold text-slate-600 text-sm mb-1">Impossible de charger le circuit</p>
                            <p className="text-xs text-slate-400">Vérifiez votre connexion et réessayez.</p>
                          </div>
                        </div>
                      )
                    ) : detailOfferLoading ? (
                      <div className="flex items-center justify-center h-full gap-3 text-slate-400">
                        <span className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="text-sm">Chargement de l&apos;offre…</span>
                      </div>
                    ) : detailOffer ? (
                      <OfferDetailView offer={detailOffer} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                        <span className="material-symbols-outlined text-5xl text-orange-300">delete_forever</span>
                        <div className="text-center">
                          <p className="font-extrabold text-slate-600 text-base mb-1">Offre supprimée</p>
                          <p className="text-sm text-slate-400">Cette offre a été supprimée par son propriétaire.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Pied : boutons action */}
                  <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
                    {openCollab.status === "pending" && (
                      <>
                        <button onClick={async () => {
                          setCollabResponding(true);
                          try {
                            await apiFetch(`/guide/collaborations/${openCollab.id}/respond`, {
                              method: "PATCH",
                              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "accepted" }),
                            });
                            setCollaborations((prev) => prev.map((x) => x.id === openCollab!.id ? { ...x, status: "accepted" } : x));
                            setOpenCollab((prev) => prev ? { ...prev, status: "accepted" } : null);
                            setShowCollabForm(true);
                          } finally { setCollabResponding(false); }
                        }} disabled={collabResponding}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-slate-900 font-extrabold text-sm hover:bg-primary/90 transition-all disabled:opacity-60">
                          {collabResponding ? <span className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" /> : <span className="material-symbols-outlined text-base">check</span>}
                          Accepter et remplir ma partie
                        </button>
                        <button onClick={async () => {
                          setCollabResponding(true);
                          try {
                            await apiFetch(`/guide/collaborations/${openCollab.id}/respond`, {
                              method: "PATCH",
                              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "declined" }),
                            });
                            setCollaborations((prev) => prev.map((x) => x.id === openCollab!.id ? { ...x, status: "declined" } : x));
                            setOpenCollab(null);
                          } finally { setCollabResponding(false); }
                        }} disabled={collabResponding}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-60">
                          <span className="material-symbols-outlined text-base">close</span>Refuser
                        </button>
                      </>
                    )}
                    {openCollab.status === "accepted" && (
                      <button onClick={() => setShowCollabForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-slate-900 font-extrabold text-sm hover:bg-primary/90 transition-all">
                        <span className="material-symbols-outlined text-base">edit</span>Compléter ma contribution
                      </button>
                    )}
                    {openCollab.status === "completed" && (
                      (openCollab.source_type === "circuit" ? openCollab.circuit_status === "approved" : openCollab.offer_status === "approved") ? (
                        <button onClick={() => setShowCollabForm(true)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 transition-all">
                          <span className="material-symbols-outlined text-base">visibility</span>Voir ma contribution
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center justify-end gap-3">
                          <button onClick={() => setOpenCollab(null)}
                            className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                            Fermer
                          </button>
                          <button onClick={() => setShowCollabForm(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-slate-900 font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer">
                            <span className="material-symbols-outlined text-base">edit</span>Gérer
                          </button>
                        </div>
                      )
                    )}
                    {openCollab.status === "declined" && (
                      <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold">
                        <span className="material-symbols-outlined text-base">cancel</span>Invitation refusée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>

    {/* ══ ACTIVITY TYPE DETAIL / EDIT MODAL ════════════════════════════════ */}
    {actTypeOpen && actTypeCurrent && (() => {
      const meta = findProviderTypeMeta(actTypeCurrent.value);
      const isPrimary = actTypeCurrent.level === "primary";
      const editCategoryData = getCategoryByValue(actTypeEditCategory);
      const editSubtypeSections = SUBTYPE_FIELDS[actTypeEditSubtype]?.sections ?? [];

      function DynFieldInline({ field, value, onChange }: { field: FieldConfig; value: any; onChange: (v: any) => void }) {
        if (field.type === "multiselect" && field.options) {
          const selected: string[] = value || [];
          return (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">{field.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {field.options.map((opt) => (
                  <button key={opt} type="button"
                    onClick={() => onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${selected.includes(opt) ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (field.type === "boolean") return (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-sm font-semibold text-slate-700">{field.label}</span>
            <button type="button" onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-all ${value ? "bg-primary" : "bg-slate-200"}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        );
        if (field.type === "textarea") return (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{field.label}</label>
            <textarea className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-primary" value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} placeholder="Décrivez…" />
          </div>
        );
        if (field.type === "select" && field.options) return (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{field.label}</label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary" value={value || ""} onChange={(e) => onChange(e.target.value)}>
              <option value="">Sélectionner…</option>
              {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        );
        return (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{field.label}</label>
            <input type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary"
              value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.label} />
          </div>
        );
      }

      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header gradient */}
            <div className={`relative h-32 bg-gradient-to-br ${meta.gradient} flex-shrink-0`}>
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <span className="material-symbols-outlined" style={{ fontSize: 64 }}>{meta.categoryIcon}</span>
              </div>
              <div className={`absolute top-4 left-4 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl ${isPrimary ? "bg-primary text-white" : "bg-white/90 text-orange-500"}`}>
                {isPrimary ? "Principale" : "Secondaire"}
              </div>
              <button onClick={() => setActTypeOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {/* Title bar */}
              <div className="px-7 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
                  </p>
                  <h2 className="text-xl font-extrabold text-slate-800">{meta.label}</h2>
                  {profile?.region && <p className="flex items-center gap-1 text-slate-400 text-xs mt-1"><MapPin size={11} />{profile.region}</p>}
                </div>
                {actTypeMode === "view" && (
                  <button onClick={() => setActTypeMode("edit")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary text-xs font-bold transition-all">
                    <Edit3 size={12} />Modifier
                  </button>
                )}
              </div>

              {actTypeMode === "view" ? (
                <div className="px-7 py-5 space-y-4">
                  {profile?.bio && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Description</p>
                      <p className="text-slate-600 text-sm leading-relaxed">{profile.bio}</p>
                    </div>
                  )}
                  {profile?.sustainability_score !== null && profile?.sustainability_score !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Durabilité</p>
                        <span className="text-sm font-extrabold text-primary">{profile.sustainability_score}/100</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${profile.sustainability_score}%` }} />
                      </div>
                    </div>
                  )}
                  {SUBTYPE_FIELDS[actTypeCurrent.value]?.sections.map((sec, si) => (
                    <div key={si} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{sec.section}</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-slate-400 text-xs">Aucune information renseignée — cliquez sur Modifier pour compléter.</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-7 py-5 space-y-5">
                  {/* Category selector */}
                  <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Catégorie</p>
                    <div className="flex flex-wrap gap-2">
                      {PROVIDER_SCHEMA.map((cat) => (
                        <button key={cat.value} type="button"
                          onClick={() => { setActTypeEditCategory(cat.value); setActTypeEditSubtype(""); setActTypeEditDynFields({}); }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold border-2 transition-all ${actTypeEditCategory === cat.value ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cat.icon}</span> {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtype selector */}
                  {editCategoryData && (
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        Sous-type — <span className="material-symbols-outlined align-middle" style={{ fontSize: 15 }}>{editCategoryData.icon}</span> {editCategoryData.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {editCategoryData.subtypes.map((st) => (
                          <button key={st.value} type="button"
                            onClick={() => { setActTypeEditSubtype(st.value); setActTypeEditDynFields({}); }}
                            className={`px-3.5 py-2 rounded-full text-sm font-bold border-2 transition-all ${actTypeEditSubtype === st.value ? "bg-primary border-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dynamic field sections */}
                  {editSubtypeSections.map((sec, si) => (
                    <div key={si} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                        <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{sec.section}</p>
                      </div>
                      <div className="p-4 space-y-4">
                        {sec.fields
                          .filter((f) => !f.dependsOn || actTypeEditDynFields[f.dependsOn.field] === f.dependsOn.value)
                          .map((field) => (
                            <DynFieldInline key={field.key} field={field} value={actTypeEditDynFields[field.key]}
                              onChange={(v) => setActTypeEditDynFields((prev) => ({ ...prev, [field.key]: v }))} />
                          ))}
                      </div>
                    </div>
                  ))}

                  {actTypeSaveError && <p className="text-xs text-red-500 font-semibold">{actTypeSaveError}</p>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              {actTypeMode === "edit" ? (
                <>
                  <button onClick={() => setActTypeMode("view")} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-bold transition-colors">
                    <ArrowLeft size={14} />Retour
                  </button>
                  <button onClick={saveActivityType} disabled={actTypeSaving || !actTypeEditSubtype}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 shadow-sm">
                    {actTypeSaving ? "Sauvegarde…" : <><Check size={14} />Enregistrer</>}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setActTypeOpen(false)} className="text-slate-500 hover:text-slate-700 text-sm font-bold">Fermer</button>
                  <button onClick={() => setActTypeMode("edit")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 shadow-sm">
                    <Edit3 size={14} />Modifier
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    })()}

    {/* ══ OFFER SUSTAINABILITY QUESTIONNAIRE ═══════════════════════════════ */}
    {oqOpen && (() => {
      const oqScore = Object.values(oqAnswers).reduce((s, v) => s + v, 0);
      const oqCurrentStep = OFFER_SUSTAINABILITY_STEPS[oqStep];
      const oqStepAnswered = oqCurrentStep ? oqCurrentStep.questions.every((q) => q.id in oqAnswers) : false;
      return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-7 pt-7 pb-5 border-b border-slate-100 shrink-0">
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">Évaluation de durabilité — Offre</p>
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                {oqStep < OFFER_SUSTAINABILITY_STEPS.length ? <>{OFFER_SUSTAINABILITY_STEPS[oqStep].emoji} {OFFER_SUSTAINABILITY_STEPS[oqStep].category}</> : "🎯 Résultat"}
              </h2>
              {oqStep < OFFER_SUSTAINABILITY_STEPS.length && (
                <p className="text-sm text-slate-500 mt-1">{OFFER_SUSTAINABILITY_STEPS[oqStep].description}</p>
              )}
              <div className="flex gap-1.5 mt-4">
                {OFFER_SUSTAINABILITY_STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < oqStep ? "bg-primary" : i === oqStep ? "bg-primary/60" : "bg-slate-100"}`} />
                ))}
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1.5">
                {oqStep < OFFER_SUSTAINABILITY_STEPS.length ? `Étape ${oqStep + 1} / ${OFFER_SUSTAINABILITY_STEPS.length}` : "Toutes les étapes complétées"}
              </p>
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-5">
              {oqStep < OFFER_SUSTAINABILITY_STEPS.length ? (
                <div className="space-y-5">
                  {OFFER_SUSTAINABILITY_STEPS[oqStep].questions.map((q) => (
                    <div key={q.id}>
                      <p className="text-sm font-bold text-slate-700 mb-2">{q.text}</p>
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <button key={opt.label} onClick={() => setOqAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                            className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${oqAnswers[q.id] === opt.value ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    {oqStep > 0 && (
                      <button onClick={() => setOqStep((s) => s - 1)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                        <ChevronLeft size={16} /> Précédent
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (oqStep === OFFER_SUSTAINABILITY_STEPS.length - 1) {
                          setOqStep((s) => s + 1);
                          submitOfferQuestionnaire();
                        } else {
                          setOqStep((s) => s + 1);
                        }
                      }}
                      disabled={!oqStepAnswered}
                      className={`flex-1 py-3 font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${oqStepAnswered ? "bg-primary text-slate-900 hover:bg-primary/90" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                    >
                      {oqStep === OFFER_SUSTAINABILITY_STEPS.length - 1 ? "Voir mon score" : "Suivant"}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {(() => {
                    const level = getOfferSustainabilityLevel(oqScore);
                    return (
                      <>
                        <div className="relative w-36 h-36 mx-auto mb-6">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 50}`}
                              strokeDashoffset={`${2 * Math.PI * 50 * (1 - oqScore / 100)}`}
                              className="text-primary transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-black text-slate-900">{oqScore}</span>
                            <span className="text-xs font-bold text-slate-400">/100</span>
                          </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${level.bg} mb-3`}>
                          <span className="text-base">{level.emoji}</span>
                          <span className={`font-extrabold text-sm ${level.color}`}>{level.label}</span>
                        </div>

                        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                          {oqScore >= 71
                            ? "Excellente offre éco-responsable ! Vous montrez l'exemple."
                            : oqScore >= 51
                            ? "Votre offre est sur la bonne voie. Continuez vos efforts !"
                            : "Ce questionnaire vous aide à identifier les axes d'amélioration."}
                        </p>

                        <div className="space-y-2 mb-6 text-left">
                          {OFFER_SUSTAINABILITY_STEPS.map((step) => {
                            const catScore = step.questions.reduce((sum, q) => sum + (oqAnswers[q.id] ?? 0), 0);
                            const catMax   = step.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.value)), 0);
                            return (
                              <div key={step.category} className="flex items-center gap-3">
                                <span className="text-base w-6 shrink-0">{step.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between mb-0.5">
                                    <span className="text-xs font-bold text-slate-600 truncate">{step.category}</span>
                                    <span className="text-xs font-black text-slate-700 shrink-0 ml-2">{catScore}/{catMax}</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${catMax > 0 ? (catScore / catMax) * 100 : 0}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setOqOpen(false)}
                          disabled={oqSaving}
                          className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-xl hover:bg-primary/90 transition-colors"
                        >
                          {oqSaving ? "Enregistrement…" : "Fermer"}
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}

      {providerInviteSection && offerEditId && (
        <InviteCollaboratorModal
          section={providerInviteSection}
          token={token}
          offerId={offerEditId}
          offerAvail={offerAvail}
          filterMode={(() => {
            if (providerInviteSection === "restauration") {
              return providerRepasMode === "guide" ? "guide" : "restaurant_terroir";
            }
            if (providerInviteSection === "autre_service") {
              const asMode = (providerAutreServiceDet._mode as string) || "guide";
              if (asMode === "guide") return "guide";
              return providerAutreServiceCat || undefined;
            }
            return undefined;
          })()}
          alreadyInvited={providerOfferCollabs
            .filter((c) => c.section === providerInviteSection && c.status !== "declined")
            .map((c) => c.userId)}
          onClose={() => setProviderInviteSection(null)}
          onInvited={(collaborator) => {
            const sec = providerInviteSection;
            const eid = offerEditId;
            setProviderOfferCollabs((prev) => [
              ...prev.filter((c) => !(c.section === sec && c.userId === collaborator.user_id)),
              { userId: collaborator.user_id, userName: collaborator.name, userType: collaborator.type, section: sec, status: "pending" },
            ]);
            setProviderInviteSection(null);
            // Re-fetch pour obtenir l'id du collab (nécessaire pour kick)
            if (eid && token) {
              apiFetch<any[]>(`/guide/offers/${eid}/collaborations`, {
                headers: { Authorization: `Bearer ${token}` },
              }).then((list) => {
                setProviderOfferCollabs(
                  (list ?? []).filter((c: any) => c.status !== "declined").map((c: any) => ({
                    id: c.id,
                    userId: c.invited_user_id,
                    userName: c.invited_user_name ?? c.invited_user_id,
                    userType: c.invited_user_type ?? "provider",
                    section: c.section as CollabSection,
                    status: c.status,
                  }))
                );
              }).catch(() => {});
            }
          }}
        />
      )}
    </>
  );
}
