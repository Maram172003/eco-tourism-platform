"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Globe, Star, UserPlus, UserMinus,
  Info, MoreVertical, Flag, X, Check, Leaf,
  ArrowRight, Sparkles, Phone, ShieldBan, ShieldCheck,
  Tag, Calendar, Users, Route, Building2, Mail,
  MessageCircle, LayoutGrid,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PubInteractions from "@/components/PubInteractions";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import CircuitViewContent from "@/components/circuit/CircuitViewContent";
import { PROVIDER_SCHEMA, SUBTYPE_FIELDS, getCategoryByValue } from "@/lib/provider-schema";
import type { FieldConfig } from "@/lib/provider-schema";
import { DOMAINES } from "@/lib/guideOfferConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  provider_type: string | null;
  bio: string | null;
  personal_bio: string | null;
  history: string | null;
  photo: string | null;
  cover_photo: string | null;
  country: string | null;
  zone: string | null;
  region: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  activity_types: string[] | null;
  secondary_activity_types: string[] | null;
  languages_spoken: string[] | null;
  language: string | null;
  years_experience: number | null;
  sustainability_score: number | null;
  eco_labels: string[] | null;
  certifications: string[] | null;
  personal_certifications: Array<{ name: string; document_url?: string }> | null;
  opening_hours: string | null;
  position: string | null;
};

type Offer = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  duration: string | null;
  offer_type: string | null;
  region: string | null;
  images: string[] | null;
  cover_image?: string | null;
  sustainability_score: number | null;
  created_at?: string;
};

type Organization = {
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
  photos: string[] | null;
  certifications: Array<{ name: string; document_url?: string }> | null;
  sustainability_score: number | null;
};

type OrgActivity = {
  id: string;
  level: "primary" | "secondary";
  category: string;
  subtypes: string[] | null;
  years_experience: number | null;
  fields: Record<string, Record<string, any>>;
  photos: Record<string, string[]>;
  certifications: Array<{ name: string; document_url?: string }>;
};

type CircuitEtape = {
  id: string;
  jour: number;
  destination: string;
  categorie: string;
  subtypes: string[];
  titre?: string;
  fields?: Record<string, any>;
  heure_debut?: string;
  heure_fin?: string;
};

type Circuit = {
  id: string;
  title: string;
  description: string | null;
  nb_jours: number;
  cover_image: string | null;
  status: string;
  etapes: CircuitEtape[];
};

type NetUser = {
  user_id: string;
  full_name: string;
  photo: string | null;
  role?: string;
  _type?: string;
};

type PublicCollab = {
  id: string;
  section: string;
  status: string;
  source_type?: string;
  offer_title?: string | null;
  offer_cover?: string | null;
  offer_description?: string | null;
  offer_status?: string | null;
  offer_id?: string | null;
  circuit_id?: string | null;
  circuit_title?: string | null;
  circuit_cover?: string | null;
  circuit_description?: string | null;
  circuit_status?: string | null;
  circuit_nb_jours?: number | null;
  circuit_nb_etapes?: number | null;
  circuit_etapes_preview?: Array<{
    jour: number; destination?: string; titre?: string; categorie?: string;
    subtypes?: string[]; expertises?: string[]; etape_mode?: string;
    heure_debut?: string; heure_fin?: string;
  }> | null;
  message?: string | null;
  created_at: string;
  guide_id?: string | null;
};

type Tab = "tout" | "offres" | "activites" | "circuits" | "reseau" | "collaborations" | "apropos";

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFER_TYPES = [
  { value: "hebergement",  label: "Hébergement",  icon: "hotel",          gradient: "from-blue-500 to-cyan-400" },
  { value: "activite",     label: "Activité",     icon: "sports",         gradient: "from-orange-500 to-amber-400" },
  { value: "circuit",      label: "Circuit",      icon: "route",          gradient: "from-indigo-500 to-blue-400" },
  { value: "restauration", label: "Restauration", icon: "restaurant",     gradient: "from-rose-500 to-pink-400" },
  { value: "artisanat",    label: "Artisanat",    icon: "palette",        gradient: "from-violet-500 to-purple-400" },
  { value: "bien_etre",    label: "Bien-être",    icon: "spa",            gradient: "from-teal-500 to-emerald-400" },
  { value: "sejour",       label: "Séjour",       icon: "hotel",          gradient: "from-emerald-500 to-teal-400" },
  { value: "transport",    label: "Transport",    icon: "directions_car", gradient: "from-slate-500 to-slate-400" },
  { value: "eco_tour",     label: "Éco-Tour",     icon: "hiking",         gradient: "from-emerald-500 to-teal-400" },
  { value: "autre",        label: "Autre",        icon: "category",       gradient: "from-emerald-500 to-teal-400" },
];

const SECTION_META: Record<string, { label: string; icon: string; grad: string }> = {
  restauration:         { label: "Restauration",            icon: "restaurant",       grad: "from-emerald-600 to-green-500" },
  transport:            { label: "Transport",                icon: "directions_bus",   grad: "from-slate-600 to-slate-500" },
  hebergement:          { label: "Hébergement",              icon: "hotel",            grad: "from-teal-600 to-emerald-500" },
  guide:                { label: "Guidage",                  icon: "hiking",           grad: "from-emerald-500 to-green-500" },
  nature_ecotourisme:   { label: "Nature & Écotourisme",     icon: "park",             grad: "from-green-600 to-emerald-500" },
  culture_patrimoine:   { label: "Culture & Patrimoine",     icon: "account_balance",  grad: "from-amber-600 to-orange-500" },
  historique_archeo:    { label: "Historique & Archéo",      icon: "history_edu",      grad: "from-amber-700 to-yellow-600" },
  aventure_randonnee:   { label: "Aventure & Randonnée",     icon: "hiking",           grad: "from-teal-600 to-cyan-500" },
  gastronomie_locale:   { label: "Gastronomie locale",       icon: "restaurant",       grad: "from-orange-600 to-amber-500" },
  artisanat_traditions: { label: "Artisanat & Traditions",   icon: "palette",          grad: "from-rose-600 to-pink-500" },
  decouverte_urbaine:   { label: "Découverte urbaine",       icon: "location_city",    grad: "from-slate-600 to-blue-600" },
  eco_tour:             { label: "Éco-Tour",                 icon: "eco",              grad: "from-green-600 to-teal-500" },
  activite:             { label: "Activité",                 icon: "sports",           grad: "from-teal-600 to-emerald-500" },
  bien_etre_spa:        { label: "Bien-être & Spa",          icon: "spa",              grad: "from-purple-500 to-violet-500" },
  volontariat_eco:      { label: "Volontariat Éco",          icon: "volunteer_activism",grad: "from-emerald-600 to-green-500" },
  autre:                { label: "Autre",                    icon: "category",         grad: "from-slate-500 to-slate-600" },
  autre_service:        { label: "Autre service",            icon: "category",         grad: "from-slate-500 to-slate-600" },
};

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France", OTHER: "Autre",
};

const LANG_LABELS: Record<string, string> = {
  fr: "Français", ar: "Arabe", en: "Anglais", es: "Espagnol",
  de: "Allemand", it: "Italien", ber: "Amazigh",
};

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

const REPORT_REASONS = [
  "Contenu inapproprié", "Faux profil", "Harcèlement ou spam",
  "Informations trompeuses", "Autre",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreLabel(score: number | null) {
  if (score === null) return "Prestataire Éco-Voyage";
  if (score >= 80) return "Prestataire Ambassadeur";
  if (score >= 60) return "Prestataire Engagé";
  if (score >= 40) return "Prestataire Sensible";
  return "Prestataire en Développement";
}

function getOfferSustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Offre Ambassadrice Éco Voyage", color: "text-primary",    emoji: "⭐" };
  if (score >= 71) return { label: "Offre Éco-Responsable",         color: "text-emerald-600", emoji: "🌿" };
  if (score >= 51) return { label: "Offre Engagée",                 color: "text-teal-600",    emoji: "🤝" };
  if (score >= 31) return { label: "Offre Sensibilisée",            color: "text-blue-600",    emoji: "💡" };
  return              { label: "Offre Conventionnelle",              color: "text-slate-500",   emoji: "📋" };
}

function findProviderTypeMeta(value: string) {
  for (const cat of PROVIDER_SCHEMA) {
    const st = cat.subtypes.find((s) => s.value === value);
    if (st) return { label: st.label, categoryLabel: cat.label, categoryIcon: cat.icon, categoryValue: cat.value, gradient: CATEGORY_GRADIENT_MAP[cat.value] ?? "from-slate-400 to-slate-500" };
  }
  const cat = PROVIDER_SCHEMA.find((c) => c.value === value);
  if (cat) return { label: cat.label, categoryLabel: cat.label, categoryIcon: cat.icon, categoryValue: cat.value, gradient: CATEGORY_GRADIENT_MAP[cat.value] ?? "from-slate-400 to-slate-500" };
  return { label: value, categoryLabel: value, categoryIcon: "eco", categoryValue: value, gradient: "from-slate-400 to-slate-500" };
}

function socialHref(platform: string, value: string): string {
  if (value.startsWith("http")) return value;
  if (platform === "instagram") return `https://instagram.com/${value.replace(/^@/, "")}`;
  if (platform === "facebook")  return `https://facebook.com/${value}`;
  if (platform === "tiktok")    return `https://tiktok.com/@${value.replace(/^@/, "")}`;
  return value;
}

// ─── BotanicalCover ───────────────────────────────────────────────────────────

function BotanicalCover() {
  return (
    <div className="relative h-48 md:h-64 lg:h-72 w-full bg-gradient-to-br from-emerald-100 via-teal-50 to-slate-100 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1200 300"
        xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PublicProviderProfile() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<Provider | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgActivities, setOrgActivities] = useState<OrgActivity[]>([]);
  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [followers, setFollowers] = useState<NetUser[]>([]);
  const [following, setFollowing] = useState<NetUser[]>([]);
  const [collaborations, setCollaborations] = useState<PublicCollab[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [userRole, setUserRole] = useState("");
  const [viewerId, setViewerId] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("tout");

  const [viewingOffer, setViewingOffer] = useState<OfferFull | null>(null);
  const [viewingOfferLoading, setViewingOfferLoading] = useState(false);
  const [viewOrgActivity, setViewOrgActivity] = useState<OrgActivity | null>(null);
  const [viewingCircuit, setViewingCircuit] = useState<any>(null);
  const [viewingCircuitLoading, setViewingCircuitLoading] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const offerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightedOfferId = searchParams.get("offer");

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") || "";
    if (!tkn) { router.push("/auth/login"); return; }
    setToken(tkn);
    try {
      const payload = JSON.parse(atob(tkn.split(".")[1]));
      setUserRole(payload.role ?? "");
      setViewerId(payload.sub ?? "");
    } catch { setUserRole(""); }

    const auth = { headers: { Authorization: `Bearer ${tkn}` } };

    Promise.all([
      apiFetch<Provider>(`/providers/${userId}`, auth),
      apiFetch<Offer[]>(`/offers/author/${userId}`).catch(() => [] as Offer[]),
      apiFetch<Organization | null>(`/organizations/by-provider/${userId}`, auth).catch(() => null),
      apiFetch<Circuit[]>(`/circuits/public/${userId}`, auth).catch(() => [] as Circuit[]),
      apiFetch<NetUser[]>(`/follows/followers/public/${userId}`, auth).catch(() => [] as NetUser[]),
      apiFetch<NetUser[]>(`/follows/following/public/${userId}`, auth).catch(() => [] as NetUser[]),
      apiFetch<PublicCollab[]>(`/guide/collaborations/public/${userId}`, auth).catch(() => [] as PublicCollab[]),
      apiFetch<{ following: boolean; pending: boolean; followId: string | null }>(`/follows/status/${userId}`, auth)
        .catch(() => ({ following: false, pending: false, followId: null })),
    ]).then(([p, o, o2, circ, foll, fwing, collabs, status]) => {
      setProfile(p);
      setOffers(o);
      setOrg(o2);
      setCircuits(circ);
      setFollowers(foll);
      setFollowing(fwing);
      setCollaborations(collabs);
      setIsFollowing(status.following);
      setFollowPending(status.pending);
      setFollowId(status.followId);
      if (o2?.id) {
        apiFetch<OrgActivity[]>(`/provider-activities/by-organization/${o2.id}`, auth)
          .then(setOrgActivities).catch(() => {});
      }
    }).catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["tout","offres","activites","circuits","reseau","collaborations","apropos"].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!highlightedOfferId || !profile) return;
    const el = offerRefs.current[highlightedOfferId];
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  }, [highlightedOfferId, profile]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function openOfferDetail(offerId: string) {
    setViewingOfferLoading(true);
    try {
      const tkn = localStorage.getItem("access_token") || "";
      const data = await apiFetch<OfferFull>(`/offers/${offerId}`, { headers: { Authorization: `Bearer ${tkn}` } });
      setViewingOffer(data);
    } catch {} finally { setViewingOfferLoading(false); }
  }

  async function openCircuitDetail(circuitId: string) {
    setViewingCircuitLoading(true);
    try {
      const tkn = localStorage.getItem("access_token") || "";
      const data = await apiFetch<any>(`/circuits/${circuitId}/public-detail`, { headers: { Authorization: `Bearer ${tkn}` } });
      setViewingCircuit(data);
    } catch {} finally { setViewingCircuitLoading(false); }
  }

  async function toggleFollow() {
    if (!token) return;
    setFollowLoading(true);
    try {
      if (isFollowing && followId) {
        await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setIsFollowing(false); setFollowId(null);
      } else if (followPending && followId) {
        await apiFetch(`/follows/${followId}/reject`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setFollowPending(false); setFollowId(null);
      } else {
        const f = await apiFetch<{ id: string }>(`/follows/${userId}/provider`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        setIsFollowing(true); setFollowId(f.id);
      }
    } finally { setFollowLoading(false); }
  }

  async function blockUser() {
    if (!token) return;
    try {
      if (isFollowing && followId) await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await apiFetch(`/eco-traveler/block/${userId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setIsFollowing(false); setFollowId(null); setMenuOpen(false);
    } catch {}
  }

  async function reportUser() {
    if (!token || !reportReason) return;
    await apiFetch(`/reports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reported_id: userId, reason: reportReason }),
    }).catch(() => {});
    setReportSent(true);
  }

  function openDoc(url: string) {
    if (url.startsWith("data:")) {
      const w = window.open("", "_blank");
      if (w) w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain"/></body></html>`);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const canFollow = ["eco_traveler", "provider", "guide"].includes(userRole) && userId !== viewerId;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-slate-500 font-semibold">Profil introuvable.</p>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
        <ArrowLeft size={14} /> Retour
      </button>
    </div>
  );

  const displayName = org?.name ?? profile.organization ?? profile.full_name ?? "Prestataire";
  const avatarSrc = org?.logo ?? profile.photo;

  const activeCollabs = collaborations.filter((c) => {
    if (c.status !== "completed") return false;
    const st = c.source_type === "circuit" ? c.circuit_status : c.offer_status;
    return st === "approved";
  });

  // ─── OfferCard — exact design profil prestataire ─────────────────────────

  function OfferCard({ offer }: { offer: Offer }) {
    const typeData = OFFER_TYPES.find((t) => t.value === offer.offer_type) ?? OFFER_TYPES[OFFER_TYPES.length - 1];
    return (
      <div ref={(el) => { offerRefs.current[offer.id] = el; }}
        className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 ${highlightedOfferId === offer.id ? "border-primary ring-2 ring-primary/30 shadow-primary/20" : "border-slate-100/90"}`}>
        <div className="flex flex-col lg:flex-row">
          {/* Cover gauche 2/5 */}
          <div className="lg:w-2/5 relative min-h-[200px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
            {offer.cover_image ?? offer.images?.[0]
              ? <img src={offer.cover_image ?? offer.images![0]} alt={offer.title} className="absolute inset-0 w-full h-full object-cover" />
              : (<>
                  <div className={`absolute inset-0 bg-gradient-to-br ${typeData.gradient} opacity-90`} />
                  <span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 100 }}>{typeData.icon}</span>
                </>)}
            {offer.price !== null && (
              <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl shadow border border-slate-100 text-right">
                <span className="text-primary font-extrabold text-lg tracking-tight">{offer.price} DT</span>
                {offer.duration && <span className="text-slate-400 text-[10px] font-bold block leading-none">/{offer.duration}j</span>}
              </div>
            )}
          </div>
          {/* Contenu droite 3/5 */}
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
              {offer.description && <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">{offer.description}</p>}
              <div className="flex flex-wrap gap-2.5 mb-5">
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-xl px-3 py-1 text-[11px] font-extrabold tracking-wider flex items-center gap-1 uppercase">
                  <Sparkles size={11} className="text-emerald-500 shrink-0" />{typeData.label}
                </span>
              </div>
            </div>
            {offer.sustainability_score !== null && (
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
            )}
            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3 gap-2 flex-wrap">
              {offer.created_at && (
                <p className="text-[11px] font-bold text-slate-400">
                  {new Date(offer.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              <button onClick={() => openOfferDetail(offer.id)}
                className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200 ml-auto">
                <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        <PubInteractions pubId={offer.id} token={token} viewerId={viewerId}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${userId}?offer=${offer.id}`}
          pubTitle={offer.title} itemApiBase="/interactions/offer" commentApiBase="/interactions" />
      </div>
    );
  }

  // ─── CircuitCard — exact design profil prestataire ───────────────────────

  function CircuitCard({ circuit }: { circuit: Circuit }) {
    const catLabels = [...new Set(circuit.etapes.map((e) =>
      PROVIDER_SCHEMA.find((c) => c.value === e.categorie)?.label
      ?? (DOMAINES as any)[e.categorie]?.label ?? e.categorie
    ))];
    return (
      <div id={`circuit-${circuit.id}`}
        className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-500">
        <div className="flex gap-0">
          <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center">
            {circuit.cover_image
              ? <img src={circuit.cover_image} alt="" className="w-full h-full object-cover absolute inset-0" />
              : <Route size={32} className="text-primary/40" />}
            <span className="absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg bg-emerald-500 text-white">Publié</span>
          </div>
          <div className="flex-1 p-5">
            <h4 className="text-base font-extrabold text-slate-800 leading-tight">{circuit.title}</h4>
            {circuit.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{circuit.description}</p>}
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
            <div className="mt-3 space-y-1">
              {circuit.etapes.slice(0, 3).map((etape) => {
                const cat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
                const catLabel = cat?.label ?? (DOMAINES as any)[etape.categorie]?.label ?? etape.categorie ?? "";
                const displayName = etape.titre || etape.destination || catLabel || "Étape";
                const stLabels = (etape.subtypes ?? []).slice(0, 2).map((sv) => cat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                return (
                  <div key={etape.id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour}</span>
                    <span className="font-semibold text-slate-700 truncate">{displayName}</span>
                    {stLabels.length > 0 && (<><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 truncate text-[11px]">{stLabels.join(", ")}</span></>)}
                    {etape.heure_debut && (<><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 text-[10px] shrink-0">{etape.heure_debut}{etape.heure_fin ? ` → ${etape.heure_fin}` : ""}</span></>)}
                  </div>
                );
              })}
              {circuit.etapes.length > 3 && <p className="text-[10px] text-slate-400 font-semibold">+{circuit.etapes.length - 3} étape{circuit.etapes.length - 3 > 1 ? "s" : ""}…</p>}
            </div>
            <button onClick={() => openCircuitDetail(circuit.id)}
              className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer">
              <Info size={12} />Voir les détails
            </button>
          </div>
        </div>
        <PubInteractions pubId={circuit.id} token={token} viewerId={viewerId}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${userId}?tab=circuits`}
          pubTitle={circuit.title} itemApiBase="/interactions/circuit" commentApiBase="/interactions" />
      </div>
    );
  }

  // ─── CollabCard — exact design profil prestataire ────────────────────────

  function CollabCard({ c }: { c: PublicCollab }) {
    const sm = SECTION_META[c.section] ?? SECTION_META.autre;
    const isCircuit = c.source_type === "circuit";
    const effectiveStatus = isCircuit ? c.circuit_status : c.offer_status;
    if (["offer_deleted","circuit_deleted","collab_kicked","collab_quit"].includes(effectiveStatus ?? "")) return null;
    const stCls = c.status === "completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-teal-100 text-teal-700 border-teal-200";
    const stLabel = c.status === "completed" ? "Complétée" : "Acceptée";
    const stIcon  = c.status === "completed" ? "task_alt" : "check_circle";
    const displayTitle = isCircuit ? (c.circuit_title ?? "Circuit") : (c.offer_title ?? "Offre");
    const displayCover = isCircuit ? c.circuit_cover : c.offer_cover;
    const sectionLabel = sm.label;

    return (
      <div className="relative bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
        {isCircuit ? (
          <div className="flex gap-0">
            <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center overflow-hidden">
              {displayCover
                ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                : <span className="material-symbols-outlined text-primary/30" style={{ fontSize: 32 }}>route</span>}
              <span className={`absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg border ${stCls}`}>{stLabel}</span>
            </div>
            <div className="flex-1 p-5">
              <h4 className="text-base font-extrabold text-slate-800 leading-tight">{displayTitle}</h4>
              {c.circuit_description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.circuit_description}</p>}
              <div className="flex flex-wrap gap-2 mt-3">
                {c.circuit_nb_jours && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-xl"><Calendar size={10} />{c.circuit_nb_jours} jour{c.circuit_nb_jours > 1 ? "s" : ""}</span>}
                {(c.circuit_nb_etapes ?? 0) > 0 && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl"><MapPin size={10} />{c.circuit_nb_etapes} étape{(c.circuit_nb_etapes ?? 0) > 1 ? "s" : ""}</span>}
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
                        {etape.heure_debut && (<><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 text-[10px] shrink-0">{etape.heure_debut}{etape.heure_fin ? ` → ${etape.heure_fin}` : ""}</span></>)}
                      </div>
                    );
                  })}
                  {(c.circuit_nb_etapes ?? 0) > (c.circuit_etapes_preview ?? []).length && (
                    <p className="text-[10px] text-slate-400 font-semibold">+{(c.circuit_nb_etapes ?? 0) - (c.circuit_etapes_preview ?? []).length} étape{((c.circuit_nb_etapes ?? 0) - (c.circuit_etapes_preview ?? []).length) > 1 ? "s" : ""}…</p>
                  )}
                </div>
              )}
              {c.message && <p className="mt-2 text-slate-400 text-xs leading-relaxed line-clamp-1 italic border-l-2 border-slate-200 pl-2">&ldquo;{c.message}&rdquo;</p>}
              {c.circuit_id && (
                <button onClick={() => openCircuitDetail(c.circuit_id!)}
                  className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer">
                  <Info size={12} />Voir les détails
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row">
            <div className="relative bg-slate-50 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-100 sm:w-2/5 min-h-[180px]">
              {displayCover
                ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" />
                : (<><div className={`absolute inset-0 bg-gradient-to-br ${sm.grad} opacity-90`} /><span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 100 }}>{sm.icon}</span></>)}
              <div className={`absolute top-2 left-2 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-xl shadow border flex items-center gap-1 ${stCls}`}>
                <span className="material-symbols-outlined text-xs">{stIcon}</span>{stLabel}
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between p-6 md:p-8">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight leading-tight mb-2">{displayTitle}</h3>
                {c.offer_description && <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{c.offer_description}</p>}
                {c.message && <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2 italic border-l-2 border-slate-200 pl-3">&ldquo;{c.message}&rdquo;</p>}
                <div className="flex flex-wrap gap-2.5 mb-4">
                  <span className={`flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-xl text-white bg-gradient-to-r ${sm.grad} uppercase`}>
                    <span className="material-symbols-outlined text-sm">{sm.icon}</span>{sectionLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3">
                <p className="text-[11px] font-bold text-slate-400">
                  {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                {c.offer_id && (
                  <button onClick={() => openOfferDetail(c.offer_id!)}
                    className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                    <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {!isCircuit && c.offer_id && (
          <PubInteractions pubId={c.offer_id} token={token} viewerId={viewerId}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${userId}`}
            pubTitle={c.offer_title ?? undefined} itemApiBase="/interactions/offer" commentApiBase="/interactions" />
        )}
        {isCircuit && c.circuit_id && (
          <PubInteractions pubId={c.circuit_id} token={token} viewerId={viewerId}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${userId}`}
            pubTitle={c.circuit_title ?? undefined} itemApiBase="/interactions/circuit" commentApiBase="/interactions" />
        )}
      </div>
    );
  }

  // ─── ActivityCard ─────────────────────────────────────────────────────────

  function ActivityCard({ act }: { act: OrgActivity }) {
    const meta = findProviderTypeMeta(act.category);
    const cat = getCategoryByValue(act.category);
    const isPrimary = act.level === "primary";
    const allPhotos = Object.values(act.photos ?? {}).flat().filter(Boolean);
    const firstPhoto = allPhotos[0] ?? null;
    const subtypeLabels = (act.subtypes ?? []).map((sv) => cat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
    return (
      <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="relative h-48 w-full overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
          {firstPhoto
            ? <img src={firstPhoto} alt={meta.label} className="absolute inset-0 w-full h-full object-cover" />
            : <div className="absolute inset-0 flex items-center justify-center select-none opacity-20"><span className="material-symbols-outlined" style={{ fontSize: 80 }}>{meta.categoryIcon}</span></div>
          }
          <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-md border ${isPrimary ? "bg-primary text-white border-white/20" : "bg-white/95 text-orange-500 border-orange-100"}`}>
            {isPrimary ? "Principale" : "Secondaire"}
          </div>
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
            <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
          </div>
        </div>
        <div className="p-5">
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight mb-1 leading-tight">{meta.label}</h3>
          {act.years_experience != null && <p className="text-slate-500 text-sm mb-2">{act.years_experience} an{act.years_experience > 1 ? "s" : ""} d&apos;expérience</p>}
          {subtypeLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {subtypeLabels.map((label) => <span key={label} className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">{label}</span>)}
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
            <p className="text-[11px] font-bold text-slate-400">{isPrimary ? "Activité principale" : "Activité secondaire"}</p>
            <button onClick={() => setViewOrgActivity(act)}
              className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
              <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <>
    <div className="min-h-screen bg-slate-50/70 pb-20">

      {/* ══ TOP NAV ══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all">
            <ArrowLeft size={16} /> Retour
          </button>
          <div className="flex items-center gap-2 text-slate-900">
            <Leaf className="text-primary w-6 h-6" />
            <span className="text-base font-extrabold tracking-tight">Éco-Voyage</span>
          </div>
          <div className="w-24" />
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ══ PROFILE HEADER CARD ════════════════════════════════════════════ */}
        <div className="relative w-full overflow-hidden bg-white shadow-sm rounded-3xl border border-slate-100/80 mb-6">
          {profile.cover_photo
            ? <div className="relative h-48 md:h-64 lg:h-72 w-full overflow-hidden"><img src={profile.cover_photo} alt="" className="w-full h-full object-cover" /></div>
            : <BotanicalCover />
          }
          <div className="relative px-6 pb-6 pt-3 md:pt-0">
            {/* Flex: col sur mobile → row sur MD (layout guide visiteur) */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-14 md:-mt-16">
              {/* Avatar + nom */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md" />
                    <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg flex items-center justify-center">
                      {avatarSrc
                        ? <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                        : <span className="material-symbols-outlined text-primary text-5xl">store</span>
                      }
                    </div>
                  </div>
                  <div className="bg-primary text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider border border-white">
                    <span className="material-symbols-outlined text-yellow-300" style={{ fontSize: 10 }}>star</span>
                    {scoreLabel(profile.sustainability_score)}
                  </div>
                </div>
                <div className="text-center sm:text-left pt-3 sm:pt-0 pb-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">{displayName}</h1>
                    <ShieldCheck size={20} className="text-emerald-500 fill-emerald-100 hidden sm:block" />
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-primary font-semibold text-sm">
                    <span>Prestataire</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Boutons Suivre + 3 points — design identique profil guide visiteur */}
              {canFollow && (
                <div className="flex items-center gap-3 shrink-0 mt-6 md:mt-0 self-center md:self-end">
                  <button onClick={toggleFollow} disabled={followLoading}
                    className={`flex items-center justify-center gap-2.5 py-3.5 px-7 font-extrabold rounded-2xl text-base transition-all disabled:opacity-60
                      ${isFollowing
                        ? "border-2 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500"
                        : followPending
                        ? "border-2 border-primary/40 text-primary hover:border-red-300 hover:text-red-500"
                        : "bg-primary text-slate-900 hover:bg-primary/90 active:scale-95 shadow-md"}`}>
                    {followLoading
                      ? <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" /> En cours</>
                      : isFollowing
                      ? <><UserMinus size={18} /> Abonné(e)</>
                      : followPending
                      ? <><span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" /> En attente</>
                      : <><UserPlus size={18} /> Suivre</>}
                  </button>
                  <div className="relative" ref={menuRef}>
                    <button onClick={() => setMenuOpen((v) => !v)}
                      className="w-14 h-14 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors">
                      <MoreVertical size={22} />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 py-1" style={{ top: "3.5rem" }}>
                        {isFollowing && (
                          <button onClick={() => { setMenuOpen(false); toggleFollow(); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                            <UserMinus size={15} className="text-slate-400" /> Se désabonner
                          </button>
                        )}
                        <button onClick={blockUser}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors">
                          <ShieldBan size={15} /> Bloquer
                        </button>
                        <div className="border-t border-slate-100 my-0.5" />
                        <button onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                          <Flag size={15} /> Signaler
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ COLUMNS ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">

            {/* Informations — sans Type */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-primary">
                  <Info size={18} strokeWidth={2.5} />
                </div>
                <h2 className="text-base font-extrabold text-slate-800">Informations</h2>
              </div>
              <div className="space-y-4">
                {(profile.bio ?? org?.bio) && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-50 text-emerald-500 shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>description</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Description</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-3">{profile.bio ?? org?.bio}</p>
                    </div>
                  </div>
                )}
                {(org?.zone || org?.region || org?.country || profile.zone || profile.region || profile.country) && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0"><MapPin size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Localisation</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">
                        {[org?.zone ?? profile.zone, org?.region ?? profile.region,
                          (org?.country ?? profile.country) ? (COUNTRY_LABELS[org?.country ?? profile.country ?? ""] ?? (org?.country ?? profile.country)) : null
                        ].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
                {profile.years_experience && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0"><Star size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Expérience</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.years_experience} ans</p>
                    </div>
                  </div>
                )}
                {(org?.website ?? profile.website) && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0"><Globe size={16} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Site web</p>
                      <a href={org?.website ?? profile.website!} target="_blank" rel="noreferrer"
                        className="text-sm font-semibold text-primary hover:underline truncate block mt-0.5">
                        {(org?.website ?? profile.website!).replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  </div>
                )}
                {profile.opening_hours && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400 shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Horaires</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.opening_hours}</p>
                    </div>
                  </div>
                )}
                {(org?.phone || org?.whatsapp || org?.email || profile.phone || profile.whatsapp) && (
                  <div className="pt-3 border-t border-slate-50 space-y-2">
                    {org?.email && (
                      <a href={`mailto:${org.email}`} className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-primary">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Mail size={13} className="text-slate-500" /></div>
                        <span className="truncate">{org.email}</span>
                      </a>
                    )}
                    {(org?.phone ?? profile.phone) && (
                      <a href={`tel:${org?.phone ?? profile.phone}`} className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-primary">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Phone size={13} className="text-slate-500" /></div>
                        <span>{org?.phone ?? profile.phone}</span>
                      </a>
                    )}
                    {(org?.whatsapp ?? profile.whatsapp) && (
                      <a href={`https://wa.me/${(org?.whatsapp ?? profile.whatsapp)!.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 hover:text-primary">
                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><MessageCircle size={13} className="text-green-500" /></div>
                        <span>{org?.whatsapp ?? profile.whatsapp}</span>
                      </a>
                    )}
                    {(org?.instagram || org?.facebook || org?.tiktok) && (
                      <div className="flex gap-2 flex-wrap pt-1">
                        {org?.instagram && (
                          <a href={socialHref("instagram", org.instagram)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 bg-pink-50 text-pink-600 hover:bg-pink-100 text-[11px] font-black px-3 py-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>photo_camera</span>Instagram
                          </a>
                        )}
                        {org?.facebook && (
                          <a href={socialHref("facebook", org.facebook)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[11px] font-black px-3 py-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>group</span>Facebook
                          </a>
                        )}
                        {org?.tiktok && (
                          <a href={socialHref("tiktok", org.tiktok)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-black px-3 py-1.5 rounded-xl transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>music_note</span>TikTok
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Followers */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-extrabold text-base text-slate-800">Followers</span>
                <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{followers.length}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {followers.slice(0, 5).map((f) => {
                  const role = (f as any).role ?? f._type ?? "";
                  const path = role === "eco_traveler" ? `/profile/ecovoyageur/${f.user_id}` : role === "guide" ? `/profile/guide/${f.user_id}` : role === "provider" ? `/profile/provider/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                  const icon = role === "provider" ? "storefront" : "person";
                  return (
                    <button key={f.user_id} onClick={() => router.push(path)}
                      className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center hover:scale-105 transition-transform" title={f.full_name}>
                      {f.photo ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>}
                    </button>
                  );
                })}
                {followers.length > 5 && <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary text-[11px] font-black border border-emerald-100/60 shadow-sm flex items-center justify-center">+{followers.length - 5}</div>}
              </div>
              {followers.length === 0 && <p className="text-xs text-slate-400 italic">Aucun follower pour l&apos;instant.</p>}
            </div>

          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Tab bar — design identique profil prestataire (px-3, gap-1.5) */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/50">
              {([
                { key: "tout",           label: "Tout",           Icon: LayoutGrid },
                { key: "offres",         label: "Offres",         Icon: Tag },
                { key: "activites",      label: "Activités",      Icon: Sparkles },
                { key: "circuits",       label: "Circuits",       Icon: Route },
                { key: "reseau",         label: "Réseau",         Icon: Users },
                { key: "collaborations", label: "Collaborations", Icon: Users },
                { key: "apropos",        label: "À propos",       Icon: Info },
              ] as { key: Tab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 min-w-[60px] py-3 px-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}>
                  <Icon size={14} strokeWidth={2.5} /><span>{label}</span>
                </button>
              ))}
            </div>

            {/* ── TOUT ──────────────────────────────────────────────────── */}
            {activeTab === "tout" && (
              <div className="space-y-8">
                {offers.length === 0 && circuits.length === 0 && orgActivities.length === 0 && activeCollabs.length === 0 && (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-14 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">public</span>
                    <p className="font-extrabold text-slate-700 text-base mb-1">Aucune publication</p>
                    <p className="text-slate-400 text-sm">Les offres, circuits et collaborations de ce prestataire apparaîtront ici.</p>
                  </div>
                )}
                {offers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Tag size={12} className="text-primary" /><span>Offres Écotourisme Actives</span>
                    </h3>
                    {offers.slice(0, 3).map((offer) => <OfferCard key={offer.id} offer={offer} />)}
                    {offers.length > 3 && <button onClick={() => setActiveTab("offres")} className="text-primary text-xs font-extrabold hover:underline flex items-center gap-1">Voir toutes les offres <ArrowRight size={13} /></button>}
                  </div>
                )}
                {circuits.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Route size={12} className="text-primary" /><span>Circuits publiés</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {circuits.slice(0, 3).map((c) => <CircuitCard key={c.id} circuit={c} />)}
                    </div>
                    {circuits.length > 3 && <button onClick={() => setActiveTab("circuits")} className="text-primary text-xs font-extrabold hover:underline flex items-center gap-1">Voir tous les circuits <ArrowRight size={13} /></button>}
                  </div>
                )}
                {activeCollabs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Users size={12} className="text-primary" /><span>Collaborations actives</span>
                    </h3>
                    {activeCollabs.slice(0, 3).map((c) => <CollabCard key={c.id} c={c} />)}
                    {activeCollabs.length > 3 && <button onClick={() => setActiveTab("collaborations")} className="text-primary text-xs font-extrabold hover:underline flex items-center gap-1">Voir toutes les collaborations <ArrowRight size={13} /></button>}
                  </div>
                )}
              </div>
            )}

            {/* ── OFFRES ────────────────────────────────────────────────── */}
            {activeTab === "offres" && (
              <div className="space-y-5">
                <h3 className="text-sm font-extrabold text-slate-800">Offres disponibles ({offers.length})</h3>
                {offers.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-primary text-3xl">sell</span>
                    </div>
                    <p className="text-slate-800 font-extrabold text-base">Aucune offre pour l&apos;instant</p>
                  </div>
                ) : (
                  offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)
                )}
              </div>
            )}

            {/* ── ACTIVITÉS ─────────────────────────────────────────────── */}
            {activeTab === "activites" && (
              <div className="space-y-5">
                <h3 className="text-sm font-extrabold text-slate-800">Activités ({orgActivities.length})</h3>
                {orgActivities.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                    <Sparkles size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-800 font-extrabold text-base">Aucune activité renseignée</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {orgActivities.map((act) => <ActivityCard key={act.id} act={act} />)}
                  </div>
                )}
              </div>
            )}

            {/* ── CIRCUITS ──────────────────────────────────────────────── */}
            {activeTab === "circuits" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Circuits multi-étapes</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Itinéraires sur plusieurs jours avec différentes destinations et activités</p>
                </div>
                {circuits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100/80 shadow-sm text-center gap-4">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center"><Route size={28} className="text-primary" /></div>
                    <div>
                      <p className="text-slate-800 font-extrabold text-base">Aucun circuit publié</p>
                      <p className="text-slate-400 text-sm mt-1 max-w-xs">Ce prestataire n&apos;a pas encore publié de circuits.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {circuits.map((c) => <CircuitCard key={c.id} circuit={c} />)}
                  </div>
                )}
              </div>
            )}

            {/* ── RÉSEAU ────────────────────────────────────────────────── */}
            {activeTab === "reseau" && (
              <div className="space-y-5">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <UserPlus size={16} className="text-primary" />Suivi(e)s
                    {following.length > 0 && <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{following.length}</span>}
                  </h3>
                  {following.length === 0 ? <p className="text-sm text-slate-400">Aucun suivi pour l&apos;instant.</p> : (
                    <div className="divide-y divide-slate-50">
                      {following.map((f) => {
                        const role = (f as any).role ?? f._type ?? "";
                        const path = role === "guide" ? `/profile/guide/${f.user_id}` : role === "provider" ? `/profile/provider/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                        const typeLabel = role === "guide" ? "Guide" : role === "provider" ? "Prestataire" : "Utilisateur";
                        const typeIcon = role === "provider" ? "storefront" : "person";
                        return (
                          <div key={f.user_id} className="flex items-center justify-between py-3 gap-2">
                            <button onClick={() => router.push(path)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                {f.photo ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">{typeIcon}</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 text-sm truncate">{f.full_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{typeLabel}</span>
                                  {(f as any).sub && <span className="text-[10px] text-slate-400 font-medium truncate">{(f as any).sub}</span>}
                                </div>
                              </div>
                            </button>
                            <button onClick={() => router.push(path)} className="shrink-0 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">Voir</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <Users size={16} className="text-primary" />Abonnés
                    {followers.length > 0 && <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{followers.length}</span>}
                  </h3>
                  {followers.length === 0 ? <p className="text-sm text-slate-400">Aucun abonné pour l&apos;instant.</p> : (
                    <div className="divide-y divide-slate-50">
                      {followers.map((f) => {
                        const role = (f as any).role ?? f._type ?? "";
                        const path = role === "eco_traveler" ? `/profile/ecovoyageur/${f.user_id}` : role === "guide" ? `/profile/guide/${f.user_id}` : role === "provider" ? `/profile/provider/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                        const typeLabel = role === "eco_traveler" ? "Éco-Voyageur" : role === "guide" ? "Guide" : role === "provider" ? "Prestataire" : "Utilisateur";
                        const typeIcon = role === "provider" ? "storefront" : role === "project" ? "business" : "person";
                        return (
                          <div key={f.user_id} className="flex items-center justify-between py-3 gap-2">
                            <button onClick={() => router.push(path)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                                {f.photo ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">{typeIcon}</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 text-sm truncate">{f.full_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{typeLabel}</span>
                                  {(f as any).sub && <span className="text-[10px] text-slate-400 font-medium truncate">{(f as any).sub}</span>}
                                </div>
                              </div>
                            </button>
                            <button onClick={() => router.push(path)} className="shrink-0 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">Voir</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── COLLABORATIONS ────────────────────────────────────────── */}
            {activeTab === "collaborations" && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-800">Collaborations ({activeCollabs.length})</h3>
                {activeCollabs.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-14 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">handshake</span>
                    <p className="font-extrabold text-slate-700 text-base mb-1">Aucune collaboration active</p>
                  </div>
                ) : (
                  activeCollabs.map((c) => <CollabCard key={c.id} c={c} />)
                )}
              </div>
            )}

            {/* ── À PROPOS ──────────────────────────────────────────────── */}
            {activeTab === "apropos" && (
              <div className="space-y-5">
                {/* Prestataire */}
                <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>person</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">Prestataire</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    <div className="flex items-center gap-4 px-6 py-5">
                      <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border-2 border-primary/20 shadow-sm">
                        {profile.photo ? <img src={profile.photo} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-primary text-2xl">person</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-extrabold text-slate-900 truncate">{profile.full_name || "—"}</p>
                        {profile.position && <p className="text-xs font-semibold text-slate-500 mt-0.5">{profile.position}</p>}
                      </div>
                    </div>
                    {profile.personal_bio && (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-black text-primary/70 tracking-widest uppercase mb-2">À propos</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.personal_bio}</p>
                      </div>
                    )}
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
                    {(profile.languages_spoken?.length || profile.language) && (
                      <div className="flex items-start gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>translate</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Langues parlées</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(profile.languages_spoken?.length ? profile.languages_spoken : profile.language ? [profile.language] : []).map((l) => (
                              <span key={l} className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full">{LANG_LABELS[l] ?? l}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {(profile.personal_certifications?.length ?? 0) > 0 && (
                      <div className="px-6 py-4">
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Certifications personnelles</p>
                        <div className="space-y-2">
                          {profile.personal_certifications!.map((cert, i) => (
                            <div key={i} className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
                              <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 16 }}>verified</span>
                              <span className="text-sm font-bold text-slate-700 flex-1 min-w-0 truncate">{cert.name}</span>
                              {cert.document_url && <button onClick={() => openDoc(cert.document_url!)} className="text-[10px] font-black text-primary hover:underline shrink-0 bg-primary/10 px-2 py-1 rounded-full">Voir</button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Organisation */}
                <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Building2 size={16} className="text-primary" /></div>
                    <p className="text-sm font-extrabold text-slate-800">Organisation</p>
                  </div>
                  {org ? (
                    <div className="divide-y divide-slate-50">
                      <div className="flex items-center gap-4 px-6 py-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-primary/15 shadow-sm">
                          {org.logo ? <img src={org.logo} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-primary text-2xl">store</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-extrabold text-slate-900 truncate">{org.name}</p>
                        </div>
                      </div>
                      {org.bio && (
                        <div className="px-6 py-4">
                          <p className="text-[10px] font-black text-primary/70 tracking-widest uppercase mb-2">Description</p>
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{org.bio}</p>
                        </div>
                      )}
                      {org.history && (
                        <div className="px-6 py-4">
                          <p className="text-[10px] font-black text-primary/70 tracking-widest uppercase mb-2">Histoire & Origine</p>
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{org.history}</p>
                        </div>
                      )}
                      {(org.region || org.country || org.address || org.zone) && (
                        <div className="flex items-start gap-4 px-6 py-4">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><MapPin size={16} className="text-primary" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Localisation</p>
                            <p className="text-sm font-bold text-slate-800">{[org.address, org.zone, org.region, org.country].filter(Boolean).join(", ")}</p>
                          </div>
                        </div>
                      )}
                      {(org.photos?.filter(Boolean).length ?? 0) > 0 && (
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
                      )}
                      {(org.certifications?.length ?? 0) > 0 && (
                        <div className="px-6 py-4">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Certifications</p>
                          <div className="space-y-2">
                            {org.certifications!.map((cert, i) => (
                              <div key={i} className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
                                <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 16 }}>verified</span>
                                <span className="text-sm font-bold text-slate-700 flex-1 min-w-0 truncate">{cert.name}</span>
                                {cert.document_url && <button onClick={() => openDoc(cert.document_url!)} className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 shrink-0">Voir</button>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <span className="material-symbols-outlined text-slate-200 text-4xl block mb-2">store</span>
                      <p className="text-slate-400 text-xs font-medium">Aucune organisation enregistrée.</p>
                    </div>
                  )}
                </div>

                {orgActivities.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-primary" />Activités proposées</span>
                      <button onClick={() => setActiveTab("activites")} className="text-primary text-[10px] font-black hover:underline flex items-center gap-1">Voir toutes <ArrowRight size={10} /></button>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {orgActivities.map((act) => <ActivityCard key={act.id} act={act} />)}
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Activité</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: offers.length,    label: "Offres",    icon: "sell",  color: "text-primary bg-primary/10" },
                      { value: circuits.length,  label: "Circuits",  icon: "route", color: "text-blue-500 bg-blue-50" },
                      { value: followers.length, label: "Followers", icon: "group", color: "text-amber-500 bg-amber-50" },
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

                {profile.sustainability_score !== null && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Score de durabilité</p>
                      <span className="text-xl font-extrabold text-primary">{profile.sustainability_score}<span className="text-sm text-slate-400 font-bold">/100</span></span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${profile.sustainability_score}%` }} />
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-2">{scoreLabel(profile.sustainability_score)}</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ══ REPORT MODAL ══════════════════════════════════════════════════════ */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!reportSent) setReportOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {reportSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><Check size={24} className="text-emerald-500" /></div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-4">Signalement envoyé</h3>
                <button onClick={() => { setReportOpen(false); setReportSent(false); setReportReason(""); }} className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-2xl text-sm">Fermer</button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><Flag size={22} className="text-red-500" /></div>
                <h3 className="text-lg font-extrabold text-slate-900 text-center mb-5">Signaler ce profil</h3>
                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map((r) => (
                    <button key={r} onClick={() => setReportReason(r)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${reportReason === r ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>{r}</button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setReportOpen(false)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl text-sm">Annuler</button>
                  <button onClick={reportUser} disabled={!reportReason} className="flex-1 py-3 bg-red-500 text-white font-extrabold rounded-2xl text-sm disabled:opacity-50">Signaler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spinners de chargement */}
      {viewingOfferLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin" />
        </div>
      )}
      {viewingCircuitLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin" />
        </div>
      )}

      {/* ══ MODAL OFFRE ══════════════════════════════════════════════════════ */}
      {viewingOffer && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingOffer(null)} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-extrabold text-slate-800 leading-tight truncate pr-3">{viewingOffer.title}</h3>
              <button onClick={() => setViewingOffer(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto flex-1"><OfferDetailView offer={viewingOffer} /></div>
          </div>
        </div>
      )}

      {/* ══ MODAL CIRCUIT — design guide visiteur avec CircuitViewContent ═════ */}
      {viewingCircuit && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingCircuit(null)} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="relative shrink-0">
              {viewingCircuit.cover_image
                ? <img src={viewingCircuit.cover_image} alt="" className="w-full h-44 object-cover" />
                : <div className="w-full h-44 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center"><Route size={56} className="text-primary/30" /></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button onClick={() => setViewingCircuit(null)} className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors">
                <X size={18} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                <h3 className="text-xl font-extrabold text-white leading-tight">{viewingCircuit.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[11px] font-black text-white/90"><Calendar size={11} />{viewingCircuit.nb_jours} jour{viewingCircuit.nb_jours > 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1 text-[11px] font-black text-white/90"><MapPin size={11} />{(viewingCircuit.etapes ?? []).length} étape{(viewingCircuit.etapes ?? []).length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <CircuitViewContent circuit={viewingCircuit} ownerName={displayName} />
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL ACTIVITÉ ════════════════════════════════════════════════════ */}
      {viewOrgActivity && (() => {
        const act = viewOrgActivity;
        const meta = findProviderTypeMeta(act.category);
        const cat = getCategoryByValue(act.category);
        const isPrimary = act.level === "primary";
        const sliderImgs = Object.values(act.photos ?? {}).flat().filter(Boolean);
        const fields = (act.fields ?? {}) as Record<string, any>;

        function renderFieldValue(field: FieldConfig, val: any) {
          const isDocUrl = field.type === "url" || (typeof val === "string" && (val.startsWith("http") || val.startsWith("data:")));
          if (isDocUrl && typeof val === "string" && val.trim()) {
            return <button onClick={() => openDoc(val)} className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span> Voir</button>;
          }
          if (typeof val === "boolean") return <span className="text-xs font-semibold text-slate-700">{val ? "Oui" : "Non"}</span>;
          if (Array.isArray(val)) return <span className="text-xs font-semibold text-slate-700">{val.join(", ")}</span>;
          return <span className="text-xs font-semibold text-slate-700">{String(val)}</span>;
        }

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

        const orphanFields = Object.entries(fields).filter(([k]) => !knownFieldKeys.has(k));

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewOrgActivity(null)}>
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="relative h-52 w-full overflow-hidden shrink-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
                {sliderImgs[0]
                  ? <img src={sliderImgs[0]} alt={meta.label} className="absolute inset-0 w-full h-full object-cover" />
                  : <div className="absolute inset-0 flex items-center justify-center opacity-20 select-none"><span className="material-symbols-outlined" style={{ fontSize: 100 }}>{meta.categoryIcon}</span></div>
                }
                <button onClick={() => setViewOrgActivity(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60"><X size={16} /></button>
                <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow border ${isPrimary ? "bg-primary text-white border-white/20" : "bg-white/95 text-orange-500 border-orange-100"}`}>
                  {isPrimary ? "Principale" : "Secondaire"}
                </div>
                <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-xl">
                  <span className="material-symbols-outlined align-middle" style={{ fontSize: 13 }}>{meta.categoryIcon}</span> {meta.categoryLabel}
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight">{meta.label}</h2>
                  {act.years_experience != null && <p className="text-slate-400 text-sm mt-1">{act.years_experience} an{act.years_experience > 1 ? "s" : ""} d&apos;expérience</p>}
                </div>
                {subtypeBlocks.map((block) => {
                  if (!block) return null;
                  const stLabel = cat?.subtypes.find((s) => s.value === block.sv)?.label ?? block.config.label;
                  return (
                    <div key={block.sv} className="rounded-2xl border border-slate-100 overflow-hidden">
                      <div className="bg-primary/5 border-b border-primary/10 px-4 py-2.5 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>{meta.categoryIcon}</span>
                        <span className="text-sm font-extrabold text-primary">{stLabel}</span>
                      </div>
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
                      {block.sections.map((sec) => (
                        <div key={sec.section} className="p-4 border-b border-slate-50 last:border-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">{sec.section}</p>
                          <div className="space-y-2.5">
                            {sec.visibleFields.map((field) => (
                              <div key={field.key} className="flex items-start gap-3">
                                <span className="text-[11px] font-bold text-slate-500 min-w-[120px] leading-tight mt-0.5 flex-shrink-0">{field.label}</span>
                                <div className="flex-1">{renderFieldValue(field, fields[field.key])}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {orphanFields.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5">
                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Autres informations</p>
                    </div>
                    <div className="p-4 space-y-2.5">
                      {orphanFields.map(([key, val]) => (
                        <div key={key} className="flex items-start gap-3">
                          <span className="text-[11px] font-bold text-slate-500 min-w-[120px] leading-tight mt-0.5 flex-shrink-0">{key.replace(/_/g, " ")}</span>
                          <span className="text-xs font-semibold text-slate-700 flex-1">{Array.isArray(val) ? val.join(", ") : typeof val === "boolean" ? (val ? "Oui" : "Non") : String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                {(act.certifications?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Certifications</p>
                    <div className="space-y-2">
                      {act.certifications.map((cert, ci) => (
                        <div key={ci} className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5">
                          <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 16 }}>verified</span>
                          <span className="text-sm font-bold text-slate-700 flex-1 min-w-0">{cert.name}</span>
                          {cert.document_url && <button onClick={() => openDoc(cert.document_url!)} className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 shrink-0 inline-flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span> Voir</button>}
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

    </div>
    </>
  );
}
