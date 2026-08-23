"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Plus, Edit3, ShieldCheck, MapPin, Calendar, Phone, Building2, Globe, Leaf, ArrowLeft,
  LayoutGrid, Tag, Briefcase, Users, Info, Sparkles,
  ArrowRight, Send, X, Clock, ChevronLeft, ChevronRight, Check, Search, UserPlus,
  MoreVertical, UserX, ShieldBan, Flag,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import MessagerieWidget from "@/components/MessagerieWidget";
import PubInteractions from "@/components/PubInteractions";
import { OFFER_SUSTAINABILITY_STEPS, getOfferSustainabilityLevel } from "@/lib/constants/sustainability";
import SustainabilityBadge from "@/components/common/SustainabilityBadge";
import { monTableauDeBord } from "@/lib/dashboard-path";

const MapPicker = dynamic(
  () => import("@/components/map/MapPicker"),
  { ssr: false, loading: () => <div className="h-[268px] rounded-2xl bg-slate-100 animate-pulse" /> }
);
const MapView = dynamic(() => import("@/components/map/MapView"),
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

type Project = {
  id: string; name: string; project_type: string[] | null;
  region: string | null; status: string; description: string | null;
  address: string | null; website: string | null; phone: string | null;
  eco_labels: string[] | null; services: string[] | null;
  photo: string | null; photos: string[] | null;
  lat: number | null; lng: number | null; opening_hours: string | null;
  facebook: string | null; instagram: string | null;
  sustainability_score: number | null;
  created_at: string;
};

type OwnerProfile = {
  user_id: string; full_name: string; bio: string | null;
  organization: string | null; position: string | null; photo: string | null;
  cover_photo: string | null;
  country: string | null; phone: string | null; language: string | null;
  sustainability_score: number | null; total_reservations: number;
  feedback_received: number; projects: Project[];
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
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFER_TYPES = [
  { value: "sejour",       label: "Séjour",       icon: "hotel",      gradient: "from-blue-500 to-cyan-400" },
  { value: "circuit",      label: "Circuit",      icon: "route",      gradient: "from-violet-500 to-purple-400" },
  { value: "activite",     label: "Activité",     icon: "hiking",     gradient: "from-orange-500 to-amber-400" },
  { value: "restauration", label: "Restauration", icon: "restaurant", gradient: "from-red-500 to-rose-400" },
  { value: "hebergement",  label: "Hébergement",  icon: "cabin",      gradient: "from-emerald-500 to-green-400" },
  { value: "autre",        label: "Autre",        icon: "category",   gradient: "from-slate-400 to-slate-500" },
];

const PROJECT_TYPE_LABELS: Record<string, string> = {
  hebergement: "Hébergement", restauration: "Restauration",
  artisanat: "Artisanat", agence: "Agence de voyage", centre_loisir: "Centre de loisirs",
};

const PROJECT_TYPES_FULL = [
  { value: "hebergement",   label: "Hébergement",      icon: "hotel" },
  { value: "restauration",  label: "Restauration",     icon: "restaurant" },
  { value: "artisanat",     label: "Artisanat",        icon: "brush" },
  { value: "agence",        label: "Agence de voyage", icon: "luggage" },
  { value: "centre_loisir", label: "Centre de loisirs", icon: "sports" },
];

const ECO_PRACTICES = [
  "Panneaux solaires", "Eau recyclée", "Zéro plastique", "Produits locaux",
  "Compostage", "Éco-certification", "Véhicules électriques", "Éclairage LED",
];

const PROJECT_SERVICES = [
  { value: "hebergement",   label: "Hébergement",        icon: "hotel" },
  { value: "restauration",  label: "Restauration",       icon: "restaurant" },
  { value: "transport",     label: "Transport",          icon: "directions_car" },
  { value: "excursions",    label: "Excursions",         icon: "hiking" },
  { value: "artisanat",     label: "Artisanat",          icon: "brush" },
  { value: "spa_bien_etre", label: "Spa & Bien-être",    icon: "spa" },
  { value: "location",      label: "Location matériel",  icon: "backpack" },
  { value: "animation",     label: "Animation culturelle", icon: "celebration" },
];

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France", OTHER: "Autre",
};

const PHONE_RE = /^(\+216|00216)?[2-9]\d{7}$|^\+?[0-9\s\-().]{7,20}$/;
const URL_RE = /^https?:\/\/.+\..+/;

// ─── Questionnaire de durabilité ──────────────────────────────────────────────

const SUSTAINABILITY_STEPS = [
  {
    category: "Environnement",
    emoji: "🌿",
    color: "from-emerald-500 to-green-400",
    description: "Pratiques écologiques et gestion des ressources naturelles",
    questions: [
      {
        id: "q1", text: "Utilisez-vous des énergies renouvelables (solaire, éolien…) ?",
        options: [{ label: "Oui, principalement", value: 8 }, { label: "Partiellement", value: 4 }, { label: "Non", value: 0 }],
      },
      {
        id: "q2", text: "Avez-vous une politique de gestion des déchets et de recyclage ?",
        options: [{ label: "Oui, politique complète", value: 7 }, { label: "En cours de mise en place", value: 3 }, { label: "Non", value: 0 }],
      },
      {
        id: "q3", text: "Utilisez-vous des produits biologiques ou de l'agriculture locale ?",
        options: [{ label: "Oui, systématiquement", value: 8 }, { label: "Parfois", value: 4 }, { label: "Non", value: 0 }],
      },
      {
        id: "q4", text: "Avez-vous des mesures pour réduire la consommation d'eau ?",
        options: [{ label: "Oui (récupération, douches éco…)", value: 7 }, { label: "Non", value: 0 }],
      },
    ],
  },
  {
    category: "Social & Communauté",
    emoji: "🤝",
    color: "from-blue-500 to-cyan-400",
    description: "Contribution à la communauté locale et création de valeur sociale",
    questions: [
      {
        id: "q5", text: "Quelle est la proportion d'employés locaux (de la région) ?",
        options: [{ label: "Plus de 70 %", value: 10 }, { label: "Entre 30 % et 70 %", value: 5 }, { label: "Moins de 30 %", value: 0 }],
      },
      {
        id: "q6", text: "Travaillez-vous en partenariat avec des artisans ou producteurs locaux ?",
        options: [{ label: "Oui, régulièrement", value: 8 }, { label: "Parfois", value: 4 }, { label: "Non", value: 0 }],
      },
      {
        id: "q7", text: "Proposez-vous des activités culturelles ou éducatives liées au patrimoine local ?",
        options: [{ label: "Oui", value: 7 }, { label: "Non", value: 0 }],
      },
    ],
  },
  {
    category: "Économie locale",
    emoji: "💰",
    color: "from-amber-500 to-yellow-400",
    description: "Investissement et soutien à l'économie de votre territoire",
    questions: [
      {
        id: "q8", text: "Quel pourcentage de votre budget d'achat est consacré aux fournisseurs locaux ?",
        options: [{ label: "Plus de 70 %", value: 10 }, { label: "Entre 40 % et 70 %", value: 5 }, { label: "Moins de 40 %", value: 0 }],
      },
      {
        id: "q9", text: "Vendez-vous ou valorisez-vous des produits artisanaux fabriqués localement ?",
        options: [{ label: "Oui", value: 10 }, { label: "Non", value: 0 }],
      },
    ],
  },
  {
    category: "Gouvernance & Certifications",
    emoji: "🏅",
    color: "from-violet-500 to-purple-400",
    description: "Cadre organisationnel et reconnaissance officielle de vos pratiques",
    questions: [
      {
        id: "q10", text: "Votre projet possède-t-il une certification éco-touristique ou environnementale ?",
        options: [{ label: "Oui (certification obtenue)", value: 8 }, { label: "En cours d'obtention", value: 4 }, { label: "Non", value: 0 }],
      },
      {
        id: "q11", text: "Avez-vous formalisé une politique de responsabilité sociale et environnementale ?",
        options: [{ label: "Oui, document écrit", value: 7 }, { label: "Non", value: 0 }],
      },
    ],
  },
  {
    category: "Sensibilisation & Éducation",
    emoji: "📚",
    color: "from-rose-500 to-pink-400",
    description: "Actions de sensibilisation auprès des visiteurs et de la communauté",
    questions: [
      {
        id: "q12", text: "Informez-vous vos visiteurs sur les bonnes pratiques environnementales ?",
        options: [{ label: "Oui", value: 5 }, { label: "Non", value: 0 }],
      },
      {
        id: "q13", text: "Participez-vous à des initiatives locales de conservation ou de reboisement ?",
        options: [{ label: "Oui", value: 5 }, { label: "Non", value: 0 }],
      },
    ],
  },
];

function getSustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Projet Ambassadeur Éco Voyage", color: "text-primary", bg: "bg-primary/10", emoji: "⭐" };
  if (score >= 71) return { label: "Projet Éco-Responsable",        color: "text-emerald-600", bg: "bg-emerald-50", emoji: "🌿" };
  if (score >= 51) return { label: "Projet Engagé",                 color: "text-teal-600",   bg: "bg-teal-50",    emoji: "🤝" };
  if (score >= 31) return { label: "Projet Sensibilisé",            color: "text-blue-600",   bg: "bg-blue-50",    emoji: "💡" };
  return              { label: "Projet Conventionnel",               color: "text-slate-500",  bg: "bg-slate-100",  emoji: "📋" };
}




type Tab = "tout" | "offres" | "projets" | "reseau" | "apropos";

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

/**
 * Page de profil du porteur de projet. Montée telle quelle dans le tableau de
 * bord (`embedded`), elle n'affiche que l'onglet demandé.
 */
export default function ProjectOwnerProfilePage({ embedded = false, forcedTab, openEditOnMount = false }: {
  embedded?: boolean;
  forcedTab?: Tab;
  /** Page Paramètres : n'affiche que le formulaire de modification, en flux. */
  openEditOnMount?: boolean;
} = {}) {
  const router = useRouter();

  const [profile,   setProfile]   = useState<OwnerProfile | null>(null);
  const [offers,    setOffers]    = useState<Offer[]>([]);
  const [token,     setToken]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(forcedTab ?? "tout");
  type NetUser = { user_id: string; full_name: string; photo: string | null; _type: string; sub?: string | null };
  const [following,  setFollowing]  = useState<NetUser[]>([]);
  const [followers,  setFollowers]  = useState<NetUser[]>([]);
  const [netLoaded,  setNetLoaded]  = useState(false);
  const [netSearch,  setNetSearch]  = useState("");
  const [netResults, setNetResults] = useState<NetUser[]>([]);
  const [netLoading, setNetLoading] = useState(false);
  const [netMenuId,       setNetMenuId]        = useState<string | null>(null);
  const [netReport,       setNetReport]        = useState<{ id: string; name: string } | null>(null);
  const [netReportReason, setNetReportReason]  = useState("");
  const [netReportSending,setNetReportSending] = useState(false);
  const NET_REPORT_REASONS = ["Contenu inapproprié", "Faux profil", "Harcèlement ou spam", "Informations trompeuses", "Autre"];

  // ── Publish offer modal ──────────────────────────────────────────────────
  const [modalOpen,       setModalOpen]       = useState(false);
  const [form,            setForm]            = useState({ title: "", offer_type: "", project_id: "", description: "", price: "", duration: "", region: "", inclusions: "", meeting_point: "", min_group_size: "", max_group_size: "", min_age: "", cancellation_policy: "" });
  const [titleError,      setTitleError]      = useState("");
  const [publishing,      setPublishing]      = useState(false);
  const [publishError,    setPublishError]    = useState("");
  const [publishImages,   setPublishImages]   = useState<{ file: File; preview: string }[]>([]);
  const [publishCoverIdx, setPublishCoverIdx] = useState(0);
  const [showPublishMap,  setShowPublishMap]  = useState(false);
  const [publishMapLat,   setPublishMapLat]   = useState<number | null>(null);
  const [publishMapLng,   setPublishMapLng]   = useState<number | null>(null);

  // ── Offer detail / edit modal ────────────────────────────────────────────
  const [editModalOpen,  setEditModalOpen]  = useState(false);
  const [editMode,       setEditMode]       = useState(false); // false=view, true=edit
  const [viewOffer,      setViewOffer]      = useState<Offer | null>(null);
  const [sliderIdx,      setSliderIdx]      = useState(0);
  const [projSliderIdx,  setProjSliderIdx]  = useState(0);
  const [touchStartX,    setTouchStartX]    = useState<number | null>(null);
  const [editOfferId,    setEditOfferId]    = useState("");
  const [editForm,       setEditForm]       = useState({ title: "", offer_type: "", project_id: "", description: "", price: "", duration: "", status: "", region: "", inclusions: "", meeting_point: "", min_group_size: "", max_group_size: "", min_age: "", cancellation_policy: "" });
  const [editTitleError, setEditTitleError] = useState("");
  const [editSaving,     setEditSaving]     = useState(false);
  const [editError,      setEditError]      = useState("");
  const [offerDeleting,  setOfferDeleting]  = useState(false);
  const [editImages,     setEditImages]     = useState<{ src: string; file?: File }[]>([]);
  const [editCoverIdx,   setEditCoverIdx]   = useState(0);
  const [showEditMap,    setShowEditMap]    = useState(false);
  const [editMapLat,     setEditMapLat]     = useState<number | null>(null);
  const [editMapLng,     setEditMapLng]     = useState<number | null>(null);

  // ── Project creation modal ───────────────────────────────────────────────
  const [projModalOpen,   setProjModalOpen]   = useState(false);
  const [projForm,        setProjForm]        = useState({ name: "", description: "", region: "", address: "", website: "", phone: "", project_type: [] as string[], eco_labels: [] as string[], services: [] as string[], opening_hours: "", facebook: "", instagram: "" });
  const [projFieldErrors, setProjFieldErrors] = useState<{ name?: string; phone?: string; website?: string; region?: string }>({});
  const [projSaving,      setProjSaving]      = useState(false);
  const [projError,       setProjError]       = useState("");
  const [projImages,      setProjImages]      = useState<{ file: File; preview: string }[]>([]);
  const [projCoverIdx,    setProjCoverIdx]    = useState(0);
  // ── Project detail / edit modal ─────────────────────────────────────────
  const [projDetailOpen,  setProjDetailOpen]  = useState(false);
  const [projDetailMode,  setProjDetailMode]  = useState<"view" | "edit">("view");
  const [viewProject,     setViewProject]     = useState<Project | null>(null);
  const [projEditForm,    setProjEditForm]    = useState({ name: "", description: "", region: "", address: "", website: "", phone: "", project_type: [] as string[], eco_labels: [] as string[], services: [] as string[], opening_hours: "", facebook: "", instagram: "" });
  const [projEditImages,  setProjEditImages]  = useState<{ src: string; file?: File }[]>([]);
  const [projEditCoverIdx, setProjEditCoverIdx] = useState(0);
  const [projEditSaving,  setProjEditSaving]  = useState(false);
  const [projEditError,   setProjEditError]   = useState("");
  const [projDeleting,    setProjDeleting]    = useState(false);
  const [showProjCreateMap, setShowProjCreateMap] = useState(false);
  const [projCreateMapLat,  setProjCreateMapLat]  = useState<number | null>(null);
  const [projCreateMapLng,  setProjCreateMapLng]  = useState<number | null>(null);
  const [showProjEditMap,   setShowProjEditMap]   = useState(false);
  const [projEditMapLat,    setProjEditMapLat]    = useState<number | null>(null);
  const [projEditMapLng,    setProjEditMapLng]    = useState<number | null>(null);

  // ── Sustainability questionnaire ─────────────────────────────────────────
  const [qOpen,      setQOpen]      = useState(false);
  const [qProjectId, setQProjectId] = useState("");
  const [qStep,      setQStep]      = useState(0);
  const [qAnswers,   setQAnswers]   = useState<Record<string, number>>({});
  const [qSaving,    setQSaving]    = useState(false);

  // ── Offer sustainability questionnaire ───────────────────────────────────────
  const [oqOpen,    setOqOpen]    = useState(false);
  const [oqOfferId, setOqOfferId] = useState("");
  const [oqStep,    setOqStep]    = useState(0);
  const [oqAnswers, setOqAnswers] = useState<Record<string, number>>({});
  const [oqSaving,  setOqSaving]  = useState(false);

  // ── Edit profile modal ────────────────────────────────────────────────────
  const [editProfileOpen,   setEditProfileOpen]   = useState(false);
  const [editProfileForm,   setEditProfileForm]   = useState({ full_name: "", bio: "", country: "", language: "", organization: "", position: "", phone: "" });
  const [editProfilePhoto,  setEditProfilePhoto]  = useState<{ file?: File; preview: string } | null>(null);
  const [editProfileCover,  setEditProfileCover]  = useState<{ file?: File; preview: string } | null>(null);
  const [editProfileSaving, setEditProfileSaving] = useState(false);
  const [editProfileError,  setEditProfileError]  = useState("");
  /** Mode Paramètres : on confirme sans refermer, le formulaire EST la page. */
  const [editProfileSaved, setEditProfileSaved] = useState(false);

  useEffect(() => {
    async function init() {
      const tkn = localStorage.getItem("access_token");
      if (!tkn) { router.push("/auth/login"); return; }
      setToken(tkn);
      try {
        const [p, myOffers] = await Promise.all([
          apiFetch<OwnerProfile>("/project-owner/profile", { headers: { Authorization: `Bearer ${tkn}` } }),
          apiFetch<Offer[]>("/offers/mine", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => [] as Offer[]),
        ]);
        setProfile(p);
        const offersWithCover = myOffers.map((o) => {
          const validImages = o.images?.filter((url) => url.startsWith("http")) ?? null;
          return {
            ...o,
            images:      validImages?.length ? validImages : null,
            cover_image: o.cover_image ?? validImages?.[0] ?? null,
          };
        });
        setOffers(offersWithCover);
        // Load network in background
        Promise.all([
          apiFetch<NetUser[]>("/follows/following/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<NetUser[]>("/follows/followers/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
        ]).then(([fwing, fwers]) => {
          setFollowing(fwing); setFollowers(fwers); setNetLoaded(true);
        });
      } catch {
        router.push(monTableauDeBord());
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Network search — guides
  useEffect(() => {
    if (!netSearch.trim() || !token) { setNetResults([]); return; }
    const t = setTimeout(() => {
      setNetLoading(true);
      apiFetch<any[]>(`/guide/public/search?q=${encodeURIComponent(netSearch)}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => setNetResults(r.map((g) => ({ user_id: g.user_id, full_name: g.full_name, photo: g.photo, _type: "guide", sub: g.zone ?? null }))))
        .catch(() => setNetResults([]))
        .finally(() => setNetLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [netSearch, token]);

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
    setForm({ title: "", offer_type: "", project_id: "", description: "", price: "", duration: "", region: "", inclusions: "", meeting_point: "", min_group_size: "", max_group_size: "", min_age: "", cancellation_policy: "" });
    setTitleError(""); setPublishError("");
    setPublishImages([]); setPublishCoverIdx(0);
    setShowPublishMap(false); setPublishMapLat(null); setPublishMapLng(null);
    setModalOpen(true);
  }

  function closeModal() {
    setPublishImages((prev) => { prev.forEach((img) => URL.revokeObjectURL(img.preview)); return []; });
    setPublishCoverIdx(0);
    setModalOpen(false);
    setTitleError(""); setPublishError("");
  }

  async function handlePublish(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) { setTitleError("Le titre est obligatoire."); return; }
    setPublishError(""); setPublishing(true);
    try {
      const created = await apiFetch<Offer>("/offers", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:       form.title.trim(),
          offer_type:  form.offer_type  || undefined,
          project_id:  form.project_id  || undefined,
          description: form.description.trim() || undefined,
          price:       form.price ? Number(form.price) : undefined,
          duration:    form.duration.trim() || undefined,
          region:              form.region.trim()              || undefined,
          inclusions:          form.inclusions.trim()          || undefined,
          meeting_point:       form.meeting_point.trim()       || undefined,
          min_group_size:      form.min_group_size ? Number(form.min_group_size) : undefined,
          max_group_size:      form.max_group_size ? Number(form.max_group_size) : undefined,
          min_age:             form.min_age        ? Number(form.min_age)        : undefined,
          cancellation_policy: form.cancellation_policy.trim() || undefined,
        }),
      });

      let finalOffer: Offer = created;

      if (publishImages.length > 0) {
        try {
          const urls = await Promise.all(publishImages.map((img) => uploadImage(img.file)));
          // Cover first so images[0] = cover after reload
          const cover = urls[publishCoverIdx] ?? urls[0];
          const ordered = [cover, ...urls.filter((u) => u !== cover)];
          await apiFetch<Offer>(`/offers/${created.id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ images: ordered }),
          });
          finalOffer = { ...finalOffer, images: ordered, cover_image: cover };
        } catch { /* upload failed — offer saved without images */ }
      }

      setOffers((prev) => [finalOffer, ...prev]);
      closeModal();
      setOqOfferId(finalOffer.id); setOqStep(0); setOqAnswers({}); setOqOpen(true);
    } catch (err: any) {
      setPublishError(err.message || "Erreur lors de la publication.");
    } finally {
      setPublishing(false);
    }
  }

  // ── Offer detail / edit modal ──────────────────────────────────────────────

  function openEditModal(offer: Offer) {
    setViewOffer(offer);
    setEditOfferId(offer.id);
    setEditForm({
      title:               offer.title,
      offer_type:          offer.offer_type          ?? "",
      project_id:          offer.project_id          ?? "",
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
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditMode(false);
    setViewOffer(null);
    setEditTitleError(""); setEditError("");
    setShowEditMap(false); setEditMapLat(null); setEditMapLng(null);
  }

  async function handleDeleteOffer() {
    if (!viewOffer) return;
    if (!confirm(`Supprimer l'offre "${viewOffer.title}" ? Cette action est irréversible.`)) return;
    setOfferDeleting(true);
    try {
      await apiFetch(`/offers/${viewOffer.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setOffers((prev) => prev.filter((o) => o.id !== viewOffer.id));
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
          title:       editForm.title.trim(),
          offer_type:  editForm.offer_type  || undefined,
          description: editForm.description.trim() || undefined,
          price:       editForm.price ? Number(editForm.price) : undefined,
          duration:    editForm.duration.trim() || undefined,
          region:              editForm.region.trim()              || undefined,
          inclusions:          editForm.inclusions.trim()          || undefined,
          meeting_point:       editForm.meeting_point.trim()       || undefined,
          min_group_size:      editForm.min_group_size ? Number(editForm.min_group_size) : undefined,
          max_group_size:      editForm.max_group_size ? Number(editForm.max_group_size) : undefined,
          min_age:             editForm.min_age        ? Number(editForm.min_age)        : undefined,
          cancellation_policy: editForm.cancellation_policy.trim() || undefined,
          status:      editForm.status,
        }),
      });
      // Upload new images; keep only valid http URLs (filter out expired blob:// URLs)
      const finalImageSrcs = (await Promise.all(
        editImages.map(async (img) => {
          if (img.file) {
            try { return await uploadImage(img.file); } catch { return null; }
          }
          return img.src.startsWith("http") ? img.src : null;
        })
      )).filter((url): url is string => url !== null);
      // Reorder so the chosen cover is always first (cover = images[0] after reload)
      const coverSrc = finalImageSrcs[editCoverIdx] ?? finalImageSrcs[0] ?? null;
      const orderedImages = coverSrc
        ? [coverSrc, ...finalImageSrcs.filter((_, i) => i !== (finalImageSrcs.indexOf(coverSrc)))]
        : finalImageSrcs;
      const newCover = orderedImages[0] ?? null;
      // Persist image list to DB
      await apiFetch<Offer>(`/offers/${editOfferId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ images: orderedImages.length ? orderedImages : [] }),
      }).catch(() => {});
      const finalUpdated: Offer = {
        ...updated,
        images:      finalImageSrcs.length ? finalImageSrcs : null,
        cover_image: newCover,
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

  // ── Sustainability questionnaire handlers ──────────────────────────────────

  const qScore = Object.values(qAnswers).reduce((sum, v) => sum + v, 0);

  const qCurrentStep = SUSTAINABILITY_STEPS[qStep];

  const qStepAnswered = qCurrentStep
    ? qCurrentStep.questions.every((q) => q.id in qAnswers)
    : true;

  async function submitQuestionnaire() {
    setQSaving(true);
    try {
      const updated = await apiFetch<Project>(`/project-owner/projects/${qProjectId}/sustainability`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score: qScore }),
      });
      setProfile((prev) =>
        prev ? { ...prev, projects: prev.projects.map((p) => p.id === qProjectId ? { ...p, sustainability_score: updated.sustainability_score } : p) } : prev
      );
    } catch {
      // silent — score shown, user closes manually
    } finally {
      setQSaving(false);
    }
  }

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
    } catch {
      // silent — score shown, user closes manually
    } finally {
      setOqSaving(false);
    }
  }

  // ── Project creation modal ─────────────────────────────────────────────────

  const EMPTY_PROJ_FORM = { name: "", description: "", region: "", address: "", website: "", phone: "", project_type: [] as string[], eco_labels: [] as string[], services: [] as string[], opening_hours: "", facebook: "", instagram: "" };

  function openProjModal() {
    setProjForm(EMPTY_PROJ_FORM);
    setProjFieldErrors({}); setProjError("");
    setProjImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.preview)); return []; });
    setProjCoverIdx(0);
    setShowProjCreateMap(false); setProjCreateMapLat(null); setProjCreateMapLng(null);
    setProjModalOpen(true);
  }

  function closeProjModal() {
    setProjModalOpen(false);
    setProjFieldErrors({}); setProjError("");
    setProjImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.preview)); return []; });
    setProjCoverIdx(0);
    setShowProjCreateMap(false); setProjCreateMapLat(null); setProjCreateMapLng(null);
  }

  function validateProjForm(): boolean {
    const errors: typeof projFieldErrors = {};
    if (!projForm.name.trim()) errors.name = "Le nom du projet est obligatoire.";
    else if (projForm.name.trim().length < 2) errors.name = "Le nom doit contenir au moins 2 caractères.";
    if (projForm.phone && !PHONE_RE.test(projForm.phone.replace(/\s/g, "")))
      errors.phone = "Numéro de téléphone invalide.";
    if (projForm.website && !URL_RE.test(projForm.website))
      errors.website = "L'URL doit commencer par http:// ou https://";
    if (projForm.region && projForm.region.trim().length === 1)
      errors.region = "La région doit contenir au moins 2 caractères.";
    setProjFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateProject(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateProjForm()) return;
    setProjError(""); setProjSaving(true);
    try {
      // Upload all images, put cover first
      let uploadedPhotos: string[] = [];
      if (projImages.length > 0) {
        const results = await Promise.all(projImages.map((img) => uploadImage(img.file).catch(() => null)));
        const valid = results.filter((u): u is string => u !== null);
        const cover = valid[projCoverIdx] ?? valid[0];
        uploadedPhotos = cover ? [cover, ...valid.filter((u) => u !== cover)] : valid;
      }
      const created = await apiFetch<Project>("/project-owner/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name:          projForm.name.trim(),
          description:   projForm.description.trim() || undefined,
          region:        projForm.region.trim() || undefined,
          address:       projForm.address.trim() || undefined,
          website:       projForm.website.trim() || undefined,
          phone:         projForm.phone.trim() || undefined,
          project_type:  projForm.project_type.length > 0 ? projForm.project_type : undefined,
          eco_labels:    projForm.eco_labels.length > 0 ? projForm.eco_labels : undefined,
          services:      projForm.services.length > 0 ? projForm.services : undefined,
          photos:        uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
          lat:           projCreateMapLat ?? undefined,
          lng:           projCreateMapLng ?? undefined,
          opening_hours: projForm.opening_hours.trim() || undefined,
          facebook:      projForm.facebook.trim() || undefined,
          instagram:     projForm.instagram.trim() || undefined,
        }),
      });
      setProfile((prev) => prev ? { ...prev, projects: [...prev.projects, created] } : prev);
      closeProjModal();
      // Open sustainability questionnaire for the newly created project
      setQProjectId(created.id);
      setQStep(0);
      setQAnswers({});
      setQOpen(true);
    } catch (err: any) {
      setProjError(err.message || "Erreur lors de la création du projet.");
    } finally {
      setProjSaving(false);
    }
  }

  // ── Project detail / edit / delete ────────────────────────────────────────

  function openProjDetail(proj: Project) {
    setViewProject(proj);
    setProjEditForm({
      name: proj.name, description: proj.description ?? "", region: proj.region ?? "",
      address: proj.address ?? "", website: proj.website ?? "", phone: proj.phone ?? "",
      project_type: proj.project_type ?? [], eco_labels: proj.eco_labels ?? [],
      services: proj.services ?? [],
      opening_hours: proj.opening_hours ?? "", facebook: proj.facebook ?? "", instagram: proj.instagram ?? "",
    });
    const imgs = (proj.photos?.length ? proj.photos : proj.photo ? [proj.photo] : [])
      .filter((s) => s.startsWith("http"));
    setProjEditImages(imgs.map((src) => ({ src })));
    setProjEditCoverIdx(0);
    setProjEditMapLat(proj.lat ?? null);
    setProjEditMapLng(proj.lng ?? null);
    setShowProjEditMap(false);
    setProjEditError("");
    setProjDetailMode("view");
    setProjSliderIdx(0);
    setProjDetailOpen(true);
  }

  function closeProjDetail() {
    setProjDetailOpen(false);
    setViewProject(null);
    setProjDetailMode("view");
    setProjSliderIdx(0);
    setProjEditError("");
  }

  async function handleSaveProject(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projEditForm.name.trim()) { setProjEditError("Le nom est obligatoire."); return; }
    setProjEditError(""); setProjEditSaving(true);
    try {
      const finalImgs = (await Promise.all(
        projEditImages.map(async (img) => {
          if (img.file) { try { return await uploadImage(img.file); } catch { return null; } }
          return img.src.startsWith("http") ? img.src : null;
        })
      )).filter((u): u is string => u !== null);
      const cover = finalImgs[projEditCoverIdx] ?? finalImgs[0];
      const ordered = cover ? [cover, ...finalImgs.filter((u) => u !== cover)] : finalImgs;
      const updated = await apiFetch<Project>(`/project-owner/projects/${viewProject!.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: projEditForm.name.trim(),
          description: projEditForm.description.trim() || undefined,
          region: projEditForm.region.trim() || undefined,
          address: projEditForm.address.trim() || undefined,
          website: projEditForm.website.trim() || undefined,
          phone: projEditForm.phone.trim() || undefined,
          project_type: projEditForm.project_type,
          eco_labels: projEditForm.eco_labels,
          services: projEditForm.services,
          lat: projEditMapLat ?? undefined,
          lng: projEditMapLng ?? undefined,
          opening_hours: projEditForm.opening_hours.trim() || undefined,
          facebook: projEditForm.facebook.trim() || undefined,
          instagram: projEditForm.instagram.trim() || undefined,
          photos: ordered.length ? ordered : [],
        }),
      });
      const withPhotos = { ...updated, photos: ordered.length ? ordered : null, photo: ordered[0] ?? null };
      setProfile((prev) => prev ? { ...prev, projects: prev.projects.map((p) => p.id === viewProject!.id ? withPhotos : p) } : prev);
      setViewProject(withPhotos);
      setProjDetailMode("view");
    } catch (err: any) {
      setProjEditError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setProjEditSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!viewProject) return;
    if (!confirm(`Supprimer le projet "${viewProject.name}" ? Cette action est irréversible.`)) return;
    setProjDeleting(true);
    try {
      await apiFetch(`/project-owner/projects/${viewProject.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setProfile((prev) => prev ? { ...prev, projects: prev.projects.filter((p) => p.id !== viewProject.id) } : prev);
      closeProjDetail();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    } finally {
      setProjDeleting(false);
    }
  }

  // ── Edit profile modal ─────────────────────────────────────────────────────

  // Le formulaire ne peut s'ouvrir qu'une fois le profil chargé : il pré-remplit
  // ses champs à partir de celui-ci.
  const editDejaOuvert = useRef(false);
  useEffect(() => {
    if (!openEditOnMount || editDejaOuvert.current || !profile) return;
    editDejaOuvert.current = true;
    openEditProfile();
  }, [openEditOnMount, profile]);

  function openEditProfile() {
    if (!profile) return;
    setEditProfileForm({
      full_name:    profile.full_name    ?? "",
      bio:          profile.bio          ?? "",
      country:      profile.country      ?? "",
      language:     profile.language     ?? "",
      organization: profile.organization ?? "",
      position:     profile.position     ?? "",
      phone:        profile.phone        ?? "",
    });
    setEditProfilePhoto(profile.photo    ? { preview: profile.photo }       : null);
    setEditProfileCover(profile.cover_photo ? { preview: profile.cover_photo } : null);
    setEditProfileError("");
    setEditProfileOpen(true);
  }

  /**
   * Fin d'édition. En mode Paramètres le formulaire occupe toute la page :
   * le refermer laisserait un écran vide, on affiche donc une confirmation.
   */
  function terminerEdition() {
    if (openEditOnMount) {
      setEditProfileSaved(true);
      setTimeout(() => setEditProfileSaved(false), 4000);
      return;
    }
    setEditProfileOpen(false);
  }

  function closeEditProfile() {
    if (openEditOnMount) { setEditProfileError(""); return; }
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

      const updated = await apiFetch<OwnerProfile>("/project-owner/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          full_name:    editProfileForm.full_name.trim(),
          bio:          editProfileForm.bio.trim()          || undefined,
          country:      editProfileForm.country             || undefined,
          language:     editProfileForm.language            || undefined,
          photo:        photoUrl,
          cover_photo:  coverUrl,
          organization: editProfileForm.organization.trim() || undefined,
          position:     editProfileForm.position.trim()     || undefined,
          phone:        editProfileForm.phone.trim()        || undefined,
        }),
      });
      setProfile((prev) => prev ? { ...prev, ...updated } : prev);
      terminerEdition();
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

  const AvatarImg = ({ cls = "" }: { cls?: string }) =>
    profile.photo ? (
      <img src={profile.photo} alt="" className={`w-full h-full object-cover ${cls}`} />
    ) : (
      <span className="material-symbols-outlined text-primary text-5xl">person</span>
    );

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

  // ── Offer card ─────────────────────────────────────────────────────────────
  const OfferCard = ({ offer }: { offer: Offer }) => {
    const typeData  = OFFER_TYPES.find((t) => t.value === offer.offer_type) ?? OFFER_TYPES[OFFER_TYPES.length - 1];
    const linked    = profile.projects.find((p) => p.id === offer.project_id);
    const statusLabel = offer.status === "approved" ? "Offre Active" : offer.status === "pending" ? "En attente" : "Refusée";
    const statusClass = offer.status === "approved" ? "bg-primary text-white border-white/20" : offer.status === "pending" ? "bg-amber-500 text-white border-white/20" : "bg-red-500 text-white border-white/20";

    return (
      <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
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
                {linked && (
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-xl px-3 py-1 text-[11px] font-extrabold tracking-wider flex items-center gap-1 uppercase">
                    <Sparkles size={11} className="text-emerald-500 shrink-0" />{linked.name}
                  </span>
                )}
              </div>
            </div>
            {offer.sustainability_score !== null ? (
              <SustainabilityBadge score={offer.sustainability_score} kind="offer" className="mt-3 mb-1" />
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setOqOfferId(offer.id); setOqStep(0); setOqAnswers({}); setOqOpen(true); }}
                className="mt-3 w-full border border-dashed border-primary/40 text-primary text-[11px] font-bold py-1.5 rounded-xl hover:bg-primary/5 transition-colors"
              >
                🌿 Évaluer la durabilité
              </button>
            )}
            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3">
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
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/project-owner/${profile?.user_id}?offer=${offer.id}`}
            pubTitle={offer.title}
            itemApiBase="/interactions/offer"
            commentApiBase="/interactions"
          />
        )}
      </div>
    );
  };

  // ── Project card ───────────────────────────────────────────────────────────
  const ProjectCard = ({ proj }: { proj: Project }) => {
    const cover = proj.photos?.[0] ?? proj.photo ?? null;
    return (
      <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6 flex flex-col justify-between">
        <div>
          <div className="w-full h-28 rounded-xl mb-4 bg-gradient-to-br from-emerald-400 to-primary flex items-center justify-center relative overflow-hidden">
            {cover
              ? <img src={cover} alt={proj.name} className="w-full h-full object-cover" />
              : <span className="material-symbols-outlined text-white/30 text-8xl">domain</span>}
            <span className={`absolute top-2.5 right-2.5 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${proj.status === "active" ? "bg-green-500" : proj.status === "rejected" ? "bg-red-500" : "bg-amber-500"}`}>
              {proj.status === "active" ? "Actif" : proj.status === "rejected" ? "Refusé" : "En attente"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-sm font-extrabold text-slate-800 leading-snug">{proj.name}</h3>
          </div>
          {proj.description && <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">{proj.description}</p>}
          {(proj.region || proj.project_type?.length) && (
            <div className="space-y-1.5 mb-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
              {proj.region && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                  <MapPin size={12} className="text-slate-400" /><span>{proj.region}</span>
                </div>
              )}
              {proj.project_type?.length ? (
                <div className="flex flex-wrap gap-1">
                  {proj.project_type.map((t) => (
                    <span key={t} className="text-[10px] font-bold text-primary">{PROJECT_TYPE_LABELS[t] ?? t}</span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {/* Sustainability score */}
          {proj.sustainability_score !== null ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Durabilité</span>
                <span className="text-xs font-black text-primary">{proj.sustainability_score}/100</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${proj.sustainability_score}%` }} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{getSustainabilityLevel(proj.sustainability_score).emoji} {getSustainabilityLevel(proj.sustainability_score).label}</p>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setQProjectId(proj.id); setQStep(0); setQAnswers({}); setQOpen(true); }}
              className="w-full mb-4 py-2 rounded-xl border-2 border-dashed border-primary/30 text-primary text-xs font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🌿</span> Évaluer la durabilité
            </button>
          )}
        </div>
        <div className="border-t border-slate-50 pt-4 mt-2">
          <button onClick={() => openProjDetail(proj)}
            className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
            <span>Voir les détails</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      {proj.status === "active" && (
        <PubInteractions
          pubId={proj.id}
          token={token}
          viewerId={profile?.user_id ?? ""}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/project-owner/${profile?.user_id}?project=${proj.id}`}
          pubTitle={proj.name}
          itemApiBase="/interactions/project"
          commentApiBase="/interactions"
        />
      )}
      </div>
    );
  };

  // ── Launch project CTA ─────────────────────────────────────────────────────
  const LaunchProjectCard = () => (
    <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
      <button
        onClick={openProjModal}
        className="w-12 h-12 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-primary hover:scale-110 active:scale-95 transition-transform mb-4"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>
      <h4 className="text-lg font-extrabold text-slate-800 tracking-tight mb-2">Lancer un nouveau projet ?</h4>
      <p className="text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
        Vous avez une idée pour un voyage encore plus durable ? Créez un projet et rassemblez la communauté.
      </p>
      <button
        onClick={openProjModal}
        className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-2xl shadow-sm text-xs hover:border-primary/40 active:scale-95 transition-all"
      >
        Nouveau Projet
      </button>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
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
      <div className={`sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3${embedded ? " hidden" : ""}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(monTableauDeBord())}
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
        <div className={openEditOnMount ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"}>
          <div className={`bg-white rounded-3xl w-full relative overflow-hidden flex flex-col ${openEditOnMount ? "border border-slate-100" : "max-w-lg shadow-2xl max-h-[92vh]"}`}>
            {editProfileSaved && (
              <div className="mx-6 mt-5 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-700 flex items-center gap-2">
                <Check size={14} />Modifications enregistrées.
              </div>
            )}
            <button onClick={closeEditProfile}
              className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors${openEditOnMount ? " hidden" : ""}`}>
              <X size={16} />
            </button>

            {/* Header */}
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
                    <input type="text" placeholder="Leila Trabelsi"
                      value={editProfileForm.full_name}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Présentation <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <textarea rows={3} placeholder="Passionnée par le développement durable et l'écotourisme en Tunisie…"
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

                {editProfileError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <span className="material-symbols-outlined text-red-500 text-base">error</span>
                    <p className="text-sm font-semibold text-red-600">{editProfileError}</p>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
              {/* Rien à annuler en mode Paramètres : le formulaire est la page. */}
              {!openEditOnMount && (
                <button type="button" onClick={closeEditProfile}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
              )}
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
            <div className="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Publier une offre éco</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Proposez une expérience éco-touristique à la communauté</p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <form id="publish-offer-form" onSubmit={handlePublish} className="px-8 py-6 space-y-5">
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre de l'offre *</label>
                  <input type="text" placeholder="Ex : Séjour éco en forêt de Mogods"
                    value={form.title}
                    onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setTitleError(""); }}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:font-normal ${titleError ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
                  />
                  {titleError && <p className="text-xs font-semibold text-red-500 mt-1">{titleError}</p>}
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description détaillée</label>
                  <textarea rows={4} placeholder="Décrivez le concept écologique, les activités durables et l'expérience proposée…"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Région / Emplacement</label>
                  <input type="text" placeholder="Tunis, Djerba, Sfax…"
                    value={form.region}
                    onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Inclusions</label>
                  <textarea rows={3} placeholder={"Ex :\n• Transport inclus\n• Repas traditionnels\n• Guide bilingue"}
                    value={form.inclusions}
                    onChange={(e) => setForm((f) => ({ ...f, inclusions: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Localisation</label>
                    <button type="button" onClick={() => setShowPublishMap((v) => !v)}
                      className="flex items-center gap-1 text-[10px] font-extrabold text-primary hover:text-primary/80 transition-colors">
                      <MapPin size={12} />
                      {showPublishMap ? "Masquer la carte" : "Choisir sur la carte"}
                    </button>
                  </div>
                  <input type="text" placeholder="Ex : Place de la Kasbah, Tunis"
                    value={form.meeting_point}
                    onChange={(e) => setForm((f) => ({ ...f, meeting_point: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400 mb-2"
                  />
                  {showPublishMap && (
                    <MapPicker
                      lat={publishMapLat} lng={publishMapLng}
                      onPick={(lat, lng, address) => {
                        setPublishMapLat(lat); setPublishMapLng(lng);
                        setForm((f) => ({ ...f, meeting_point: address }));
                      }}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Max. pers.</label>
                    <input type="number" min="1" placeholder="20"
                      value={form.max_group_size}
                      onChange={(e) => setForm((f) => ({ ...f, max_group_size: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Âge min. <span className="normal-case font-medium text-slate-300">(facultatif)</span></label>
                    <input type="number" min="0" placeholder="12"
                      value={form.min_age}
                      onChange={(e) => setForm((f) => ({ ...f, min_age: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Politique d'annulation</label>
                  <textarea rows={2} placeholder="Ex : Remboursement intégral si annulation 48h avant. Aucun remboursement après ce délai."
                    value={form.cancellation_policy}
                    onChange={(e) => setForm((f) => ({ ...f, cancellation_policy: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos de l'offre</label>
                  <label htmlFor="publish-images-input"
                    className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                    <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                    <p className="text-xs font-semibold text-slate-400">Cliquez pour ajouter des photos</p>
                    <input id="publish-images-input" type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        const newImgs = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
                        setPublishImages((prev) => [...prev, ...newImgs]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {publishImages.length > 0 && (
                    <>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {publishImages.map((img, i) => {
                          const isCover = i === publishCoverIdx;
                          return (
                            <div key={i} onClick={() => setPublishCoverIdx(i)}
                              className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                              <img src={img.preview} alt="" className="w-full h-full object-cover" />
                              {isCover && (
                                <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>
                              )}
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-2">Cliquez sur une photo pour la définir comme image principale (cover).</p>
                    </>
                  )}
                </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Tarif (TND)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
                      <input type="number" min="0" step="1" placeholder="Ex : 350"
                        value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono placeholder:text-slate-400 placeholder:font-sans"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Durée (jours)</label>
                    <div className="relative">
                      <Clock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" min="1" step="1" placeholder="Ex : 3"
                        value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono placeholder:text-slate-400 placeholder:font-sans"
                      />
                    </div>
                  </div>
                </div>
                {(() => {
                  const activeProjects = profile.projects.filter((p) => p.status === "active");
                  return (
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Projet associé (optionnel)</label>
                      {activeProjects.length === 0 ? (
                        <p className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">Aucun projet validé disponible.</p>
                      ) : (
                        <select value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white">
                          <option value="">— Aucun projet lié —</option>
                          {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })()}
                {publishError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <span className="material-symbols-outlined text-red-500 text-base">error</span>
                    <p className="text-sm font-semibold text-red-600">{publishError}</p>
                  </div>
                )}
              </form>
            </div>
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={closeModal}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                Annuler
              </button>
              <button type="submit" form="publish-offer-form" disabled={publishing}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60 cursor-pointer">
                {publishing
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Publication…</>
                  : <><Send size={14} />Publier l'offre</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ OFFER DETAIL / EDIT MODAL ════════════════════════════════════════ */}
      {editModalOpen && viewOffer && (() => {
        const sliderImgs = viewOffer.images?.length
          ? viewOffer.images
          : viewOffer.cover_image ? [viewOffer.cover_image] : [];
        const td = OFFER_TYPES.find((t) => t.value === viewOffer.offer_type) ?? OFFER_TYPES[OFFER_TYPES.length - 1];
        const safeIdx = Math.min(sliderIdx, Math.max(sliderImgs.length - 1, 0));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

              {/* Shared X button */}
              <button onClick={closeEditModal}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors">
                <X size={16} />
              </button>

              {!editMode ? (
                /* ── VIEW MODE ───────────────────────────────────────────── */
                <>
                  {/* Image carousel */}
                  <div
                    className="relative h-56 w-full overflow-hidden shrink-0 select-none"
                    onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                      if (touchStartX === null || sliderImgs.length <= 1) return;
                      const diff = touchStartX - e.changedTouches[0].clientX;
                      if (Math.abs(diff) > 40) {
                        setSliderIdx((i) => diff > 0
                          ? Math.min(i + 1, sliderImgs.length - 1)
                          : Math.max(i - 1, 0));
                      }
                      setTouchStartX(null);
                    }}
                  >
                    {sliderImgs.length > 0 ? (
                      /* Sliding strip */
                      <div
                        className="flex h-full transition-transform duration-300 ease-out"
                        style={{ transform: `translateX(-${(safeIdx / sliderImgs.length) * 100}%)`, width: `${sliderImgs.length * 100}%` }}
                      >
                        {sliderImgs.map((src, i) => (
                          <div key={i} className="h-full" style={{ width: `${100 / sliderImgs.length}%` }}>
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Fallback gradient */
                      <>
                        <div className={`absolute inset-0 bg-gradient-to-br ${td.gradient} opacity-90`} />
                        <span className="material-symbols-outlined text-white/25 absolute inset-0 flex items-center justify-center" style={{ fontSize: 110 }}>{td.icon}</span>
                      </>
                    )}

                    {/* Prev / Next arrows */}
                    {sliderImgs.length > 1 && (
                      <>
                        <button type="button"
                          onClick={() => setSliderIdx((i) => Math.max(i - 1, 0))}
                          disabled={safeIdx === 0}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                          <ChevronLeft size={18} />
                        </button>
                        <button type="button"
                          onClick={() => setSliderIdx((i) => Math.min(i + 1, sliderImgs.length - 1))}
                          disabled={safeIdx === sliderImgs.length - 1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                          <ChevronRight size={18} />
                        </button>
                      </>
                    )}

                    {/* Dot indicators */}
                    {sliderImgs.length > 1 && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {sliderImgs.map((_, i) => (
                          <button key={i} type="button" onClick={() => setSliderIdx(i)}
                            className={`h-1.5 rounded-full transition-all duration-200 ${i === safeIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Image counter badge */}
                    {sliderImgs.length > 1 && (
                      <div className="absolute top-3 left-3 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                        {safeIdx + 1} / {sliderImgs.length}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-tight pr-8">{viewOffer.title}</h2>

                    <div className="flex flex-wrap gap-2.5">
                      {viewOffer.offer_type && (() => {
                        const t = OFFER_TYPES.find((x) => x.value === viewOffer.offer_type);
                        return t ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-3 py-1.5 text-[11px] font-extrabold tracking-wider flex items-center gap-1.5 uppercase">
                            <span className="material-symbols-outlined text-sm leading-none">{t.icon}</span>{t.label}
                          </span>
                        ) : null;
                      })()}
                      {viewOffer.price !== null && (
                        <span className="bg-primary/10 text-primary border border-primary/20 rounded-xl px-3 py-1.5 text-[11px] font-extrabold tracking-wider flex items-center gap-1.5">
                          <span className="font-extrabold">{viewOffer.price} DT</span>
                          {viewOffer.duration && <span className="text-slate-400 font-bold">/ {viewOffer.duration}j</span>}
                        </span>
                      )}
                      {viewOffer.duration && viewOffer.price === null && (
                        <span className="bg-slate-50 text-slate-500 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-extrabold tracking-wider flex items-center gap-1.5">
                          <Clock size={12} />{viewOffer.duration} jours
                        </span>
                      )}
                    </div>

                    {viewOffer.description && (
                      <div>
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Description</p>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{viewOffer.description}</p>
                      </div>
                    )}

                    {viewOffer.inclusions && (
                      <div className="bg-emerald-50/60 border border-emerald-100/70 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-emerald-600 text-base leading-none">check_circle</span>
                          <p className="text-[10px] font-black tracking-widest text-emerald-700 uppercase">Inclusions</p>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{viewOffer.inclusions}</p>
                      </div>
                    )}

                    {viewOffer.meeting_point && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-slate-500 text-base leading-none">location_on</span>
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Localisation</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 mb-2">{viewOffer.meeting_point}</p>
                        <LocationMap
                          lat={viewOffer.meeting_lat ?? null}
                          lng={viewOffer.meeting_lng ?? null}
                          address={viewOffer.meeting_point}
                        />
                      </div>
                    )}

                    {(viewOffer.min_group_size !== null || viewOffer.max_group_size !== null || viewOffer.min_age !== null) && (
                      <div className="grid grid-cols-2 gap-3">
                        {(viewOffer.min_group_size !== null || viewOffer.max_group_size !== null) && (
                          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="material-symbols-outlined text-slate-500 text-xl mt-0.5">group</span>
                            <div>
                              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Groupe</p>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5">
                                {viewOffer.min_group_size ?? 1} – {viewOffer.max_group_size ?? "∞"} pers.
                              </p>
                            </div>
                          </div>
                        )}
                        {viewOffer.min_age !== null && (
                          <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="material-symbols-outlined text-slate-500 text-xl mt-0.5">person</span>
                            <div>
                              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Âge minimum</p>
                              <p className="text-sm font-semibold text-slate-700 mt-0.5">{viewOffer.min_age} ans</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {viewOffer.cancellation_policy && (
                      <div className="flex items-start gap-3 p-4 bg-amber-50/60 border border-amber-100/70 rounded-2xl">
                        <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5">policy</span>
                        <div>
                          <p className="text-[10px] font-black tracking-widest text-amber-700 uppercase mb-1">Politique d'annulation</p>
                          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{viewOffer.cancellation_policy}</p>
                        </div>
                      </div>
                    )}

                    {viewOffer.project_id && (() => {
                      const proj = profile.projects.find((p) => p.id === viewOffer.project_id);
                      return proj ? (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50/60 border border-emerald-100/60 rounded-xl">
                          <span className="material-symbols-outlined text-emerald-600 text-xl">domain</span>
                          <div>
                            <p className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Projet associé</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5">{proj.name}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <p className="text-[11px] font-bold text-slate-400">
                      Publiée le {new Date(viewOffer.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>

                  <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                    <button type="button" onClick={closeEditModal}
                      className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                      Fermer
                    </button>
                    <button type="button" onClick={() => {
                      if (!viewOffer) return;
                      setEditForm({
                        title:               viewOffer.title,
                        offer_type:          viewOffer.offer_type          ?? "",
                        project_id:          viewOffer.project_id          ?? "",
                        description:         viewOffer.description         ?? "",
                        price:               viewOffer.price !== null ? String(viewOffer.price) : "",
                        duration:            viewOffer.duration            ?? "",
                        status:              viewOffer.status,
                        region:              viewOffer.region              ?? "",
                        inclusions:          viewOffer.inclusions          ?? "",
                        meeting_point:       viewOffer.meeting_point       ?? "",
                        min_group_size:      viewOffer.min_group_size !== null ? String(viewOffer.min_group_size) : "",
                        max_group_size:      viewOffer.max_group_size !== null ? String(viewOffer.max_group_size) : "",
                        min_age:             viewOffer.min_age       !== null ? String(viewOffer.min_age)       : "",
                        cancellation_policy: viewOffer.cancellation_policy ?? "",
                      });
                      setEditTitleError(""); setEditError("");
                      const imgs = (viewOffer.images?.length
                        ? viewOffer.images
                        : viewOffer.cover_image ? [viewOffer.cover_image] : []
                      ).filter((src) => src.startsWith("http"));
                      setEditImages(imgs.map((src) => ({ src })));
                      setEditCoverIdx(0);
                      setEditMode(true);
                    }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 cursor-pointer">
                      <Edit3 size={14} />Gérer
                    </button>
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

                  {/* Form with submit button INSIDE — eliminates form="id" flash bug */}
                  <div className="overflow-y-auto flex-1">
                    <form onSubmit={handleSaveOffer} className="px-8 py-6 space-y-5">
                      {/* Titre */}
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre de l'offre *</label>
                        <input type="text" placeholder="Ex : Séjour éco en forêt de Mogods"
                          value={editForm.title}
                          onChange={(e) => { setEditForm((f) => ({ ...f, title: e.target.value })); setEditTitleError(""); }}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:font-normal ${editTitleError ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
                        />
                        {editTitleError && <p className="text-xs font-semibold text-red-500 mt-1">{editTitleError}</p>}
                      </div>
                      {/* Description */}
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description détaillée</label>
                        <textarea rows={4} placeholder="Décrivez le concept écologique, les activités durables…"
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                        />
                      </div>
                      {/* Région */}
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Région / Emplacement</label>
                        <input type="text" placeholder="Tunis, Djerba, Sfax…"
                          value={editForm.region}
                          onChange={(e) => setEditForm((f) => ({ ...f, region: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
                        />
                      </div>
                      {/* Inclusions */}
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Inclusions</label>
                        <textarea rows={3} placeholder={"Ex :\n• Transport inclus\n• Repas traditionnels\n• Guide bilingue"}
                          value={editForm.inclusions}
                          onChange={(e) => setEditForm((f) => ({ ...f, inclusions: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                        />
                      </div>
                      {/* Localisation */}
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
                      {/* Groupe + âge */}
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
                      {/* Politique d'annulation */}
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Politique d'annulation</label>
                        <textarea rows={2} placeholder="Ex : Remboursement intégral si annulation 48h avant."
                          value={editForm.cancellation_policy}
                          onChange={(e) => setEditForm((f) => ({ ...f, cancellation_policy: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                        />
                      </div>
                      {/* Photos */}
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

                      {/* Type d'offre */}
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
                      {/* Prix + Durée */}
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
                      {/* Projet lié */}
                      {(() => {
                        const activeProjects = profile.projects.filter((p) => p.status === "active");
                        return (
                          <div>
                            <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Projet associé (optionnel)</label>
                            {activeProjects.length === 0 ? (
                              <p className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">Aucun projet validé disponible.</p>
                            ) : (
                              <select value={editForm.project_id} onChange={(e) => setEditForm((f) => ({ ...f, project_id: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white">
                                <option value="">— Aucun projet lié —</option>
                                {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            )}
                          </div>
                        );
                      })()}
                      {editError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                          <span className="material-symbols-outlined text-red-500 text-base">error</span>
                          <p className="text-sm font-semibold text-red-600">{editError}</p>
                        </div>
                      )}
                      {/* Footer inside form — no form="id" needed, eliminates flash bug */}
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

      {/* ══ PROJECT DETAIL / EDIT MODAL ══════════════════════════════════════ */}
      {projDetailOpen && viewProject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeProjDetail}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-extrabold text-slate-900 truncate">{viewProject.name}</h2>
              <button onClick={closeProjDetail} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {projDetailMode === "view" ? (
              /* ── VIEW MODE ─────────────────────────────────────────────── */
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Photos slider */}
                {(() => {
                  const imgs = (viewProject.photos?.length ? viewProject.photos : viewProject.photo ? [viewProject.photo] : []).filter((s) => s.startsWith("http"));
                  if (!imgs.length) return null;
                  return (
                    <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-slate-100 group">
                      <div className="flex h-full transition-transform duration-300" style={{ transform: `translateX(-${(projSliderIdx / imgs.length) * 100}%)`, width: `${imgs.length * 100}%` }}>
                        {imgs.map((src, i) => <div key={i} style={{ width: `${100 / imgs.length}%` }} className="h-full shrink-0"><img src={src} alt="" className="w-full h-full object-cover" /></div>)}
                      </div>
                      {imgs.length > 1 && <>
                        <button type="button" onClick={() => setProjSliderIdx((s) => Math.max(0, s - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft size={16} /></button>
                        <button type="button" onClick={() => setProjSliderIdx((s) => Math.min(imgs.length - 1, s + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={16} /></button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {imgs.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === projSliderIdx ? "bg-white scale-125" : "bg-white/50"}`} />)}
                        </div>
                      </>}
                    </div>
                  );
                })()}

                {/* Status + type */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${viewProject.status === "active" ? "bg-green-50 text-green-600 border border-green-100" : viewProject.status === "rejected" ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                    {viewProject.status === "active" ? "Actif" : viewProject.status === "rejected" ? "Refusé" : "En attente"}
                  </span>
                  {viewProject.project_type?.map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">{PROJECT_TYPE_LABELS[t] ?? t}</span>
                  ))}
                </div>

                {/* Description */}
                {viewProject.description && <p className="text-slate-600 text-sm leading-relaxed">{viewProject.description}</p>}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {viewProject.region && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Région</p><p className="font-semibold text-slate-800">{viewProject.region}</p></div>}
                  {(viewProject.lat || viewProject.address || viewProject.region) && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-slate-500" />
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Localisation</p>
                      </div>
                      {(viewProject.address || viewProject.region) && (
                        <p className="text-sm font-semibold text-slate-700 mb-2">
                          {[viewProject.address, viewProject.region].filter(Boolean).join(", ")}
                        </p>
                      )}
                      <LocationMap
                        lat={viewProject.lat ?? null}
                        lng={viewProject.lng ?? null}
                        address={[viewProject.address, viewProject.region].filter(Boolean).join(", ")}
                      />
                    </div>
                  )}
                  {viewProject.opening_hours && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Horaires</p><p className="font-semibold text-slate-800">{viewProject.opening_hours}</p></div>}
                  {viewProject.phone && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Téléphone</p><p className="font-semibold text-slate-800">{viewProject.phone}</p></div>}
                  {viewProject.website && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Site web</p><a href={viewProject.website} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline truncate block">{viewProject.website}</a></div>}
                  {viewProject.facebook && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Facebook</p><a href={viewProject.facebook} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline truncate block">{viewProject.facebook}</a></div>}
                  {viewProject.instagram && <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Instagram</p><a href={viewProject.instagram} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline truncate block">{viewProject.instagram}</a></div>}
                </div>

                {/* Services */}
                {viewProject.services?.length ? (
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Services</p>
                    <div className="flex flex-wrap gap-2">{viewProject.services.map((s) => <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold">{PROJECT_SERVICES.find((x) => x.value === s)?.label ?? s}</span>)}</div>
                  </div>
                ) : null}

                {/* Éco-pratiques */}
                {viewProject.eco_labels?.length ? (
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Pratiques éco-responsables</p>
                    <div className="flex flex-wrap gap-2">{viewProject.eco_labels.map((l) => <span key={l} className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-bold">{l}</span>)}</div>
                  </div>
                ) : null}

                {/* Footer actions */}
                <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                  <button onClick={() => { setProjSliderIdx(0); setProjDetailMode("edit"); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-extrabold rounded-xl text-sm hover:bg-primary/90 transition-colors">
                    <Edit3 size={14} />Gérer
                  </button>
                </div>
              </div>
            ) : (
              /* ── EDIT MODE ─────────────────────────────────────────────── */
              <form onSubmit={handleSaveProject} className="overflow-y-auto flex-1 p-6 space-y-4">
                {/* Photos */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Photos</label>
                  {projEditImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {projEditImages.map((img, i) => {
                        const isCover = i === projEditCoverIdx;
                        return (
                          <div key={i} onClick={() => setProjEditCoverIdx(i)}
                            className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                            <img src={img.src} alt="" className="w-full h-full object-cover" />
                            {isCover && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                            <button type="button" onClick={(e) => { e.stopPropagation(); setProjEditImages((prev) => prev.filter((_, idx) => idx !== i)); setProjEditCoverIdx((c) => c >= i && c > 0 ? c - 1 : c); }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <label htmlFor="proj-edit-images" className="flex items-center justify-center gap-2 w-full h-16 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                    <span className="material-symbols-outlined text-slate-300 text-xl">add_photo_alternate</span>
                    <p className="text-xs font-semibold text-slate-400">Ajouter des photos</p>
                    <input id="proj-edit-images" type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => { const files = Array.from(e.target.files ?? []); setProjEditImages((prev) => [...prev, ...files.map((f) => ({ src: URL.createObjectURL(f), file: f }))]); e.target.value = ""; }} />
                  </label>
                </div>

                {/* Nom */}
                <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Nom *</label>
                  <input value={projEditForm.name} onChange={(e) => setProjEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
                </div>

                {/* Description */}
                <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description</label>
                  <textarea rows={3} value={projEditForm.description} onChange={(e) => setProjEditForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium resize-none" />
                </div>

                {/* Région */}
                <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Région</label>
                  <input value={projEditForm.region} onChange={(e) => setProjEditForm((f) => ({ ...f, region: e.target.value }))} placeholder="Tataouine, Djerba…" className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
                </div>

                {/* Localisation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Localisation</label>
                    <button type="button" onClick={() => setShowProjEditMap((v) => !v)} className="text-[10px] font-bold text-primary hover:underline">
                      {showProjEditMap ? "Masquer la carte" : "Choisir sur la carte"}
                    </button>
                  </div>
                  <input readOnly value={projEditForm.address} placeholder="Auto-rempli par la carte…"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl text-slate-500 font-medium cursor-default" />
                  {showProjEditMap && (
                    <MapPicker lat={projEditMapLat} lng={projEditMapLng} onPick={(lat, lng, address) => { setProjEditMapLat(lat); setProjEditMapLng(lng); setProjEditForm((f) => ({ ...f, address })); }} />
                  )}
                </div>

                {/* Horaires */}
                <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Horaires</label>
                  <input value={projEditForm.opening_hours} onChange={(e) => setProjEditForm((f) => ({ ...f, opening_hours: e.target.value }))} placeholder="Lun-Sam 9h-19h" className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
                </div>

                {/* Téléphone + Site web */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Téléphone</label>
                    <input value={projEditForm.phone} onChange={(e) => setProjEditForm((f) => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
                  </div>
                  <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Site web</label>
                    <input value={projEditForm.website} onChange={(e) => setProjEditForm((f) => ({ ...f, website: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
                  </div>
                </div>

                {/* Facebook + Instagram */}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Facebook</label>
                    <input value={projEditForm.facebook} onChange={(e) => setProjEditForm((f) => ({ ...f, facebook: e.target.value }))} placeholder="https://facebook.com/..." className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
                  </div>
                  <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Instagram</label>
                    <input value={projEditForm.instagram} onChange={(e) => setProjEditForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="https://instagram.com/..." className="w-full px-4 py-3 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
                  </div>
                </div>

                {/* Types */}
                <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Type de projet</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROJECT_TYPES_FULL.map((t) => { const active = projEditForm.project_type.includes(t.value); return (
                      <button key={t.value} type="button" onClick={() => setProjEditForm((f) => ({ ...f, project_type: active ? f.project_type.filter((x) => x !== t.value) : [...f.project_type, t.value] }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                        <span className="material-symbols-outlined text-base">{t.icon}</span>{t.label}{active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    ); })}
                  </div>
                </div>

                {/* Services */}
                <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Services</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROJECT_SERVICES.map((s) => { const active = projEditForm.services.includes(s.value); return (
                      <button key={s.value} type="button" onClick={() => setProjEditForm((f) => ({ ...f, services: active ? f.services.filter((x) => x !== s.value) : [...f.services, s.value] }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                        <span className="material-symbols-outlined text-base">{s.icon}</span>{s.label}{active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    ); })}
                  </div>
                </div>

                {/* Éco-pratiques */}
                <div><label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Pratiques éco-responsables</label>
                  <div className="flex flex-wrap gap-2">
                    {ECO_PRACTICES.map((p) => { const active = projEditForm.eco_labels.includes(p); return (
                      <button key={p} type="button" onClick={() => setProjEditForm((f) => ({ ...f, eco_labels: active ? f.eco_labels.filter((x) => x !== p) : [...f.eco_labels, p] }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-green-50 border-green-400 text-green-700" : "border-slate-200 text-slate-500 hover:border-green-300"}`}>
                        {active && <Check className="w-3 h-3" />}{p}
                      </button>
                    ); })}
                  </div>
                </div>

                {projEditError && <p className="text-sm font-semibold text-red-500 bg-red-50 p-3 rounded-xl">{projEditError}</p>}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setProjDetailMode("view")} className="py-3 px-5 rounded-xl border-2 border-slate-200 text-slate-700 font-extrabold text-sm hover:bg-slate-50 transition-colors">Annuler</button>
                    <button type="button" onClick={handleDeleteProject} disabled={projDeleting}
                      className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold text-sm transition-colors disabled:opacity-50">
                      <span className="material-symbols-outlined text-base">delete</span>
                      {projDeleting ? "Suppression…" : "Supprimer"}
                    </button>
                  </div>
                  <button type="submit" disabled={projEditSaving} className="py-3 px-6 bg-primary text-white font-extrabold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors">
                    {projEditSaving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══ PROJECT CREATION MODAL ═══════════════════════════════════════════ */}
      {projModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeProjModal}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900">Ajouter un projet</h2>
              <button onClick={closeProjModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">

              {/* Photo de couverture */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Photos du projet</label>
                <label htmlFor="proj-images-input" className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                  <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                  <p className="text-xs font-semibold text-slate-400">Cliquez pour ajouter des photos</p>
                  <input id="proj-images-input" type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setProjImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {projImages.length > 0 && (
                  <>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {projImages.map((img, i) => {
                        const isCover = i === projCoverIdx;
                        return (
                          <div key={i} onClick={() => setProjCoverIdx(i)}
                            className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                            <img src={img.preview} alt="" className="w-full h-full object-cover" />
                            {isCover && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                            <button type="button" onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(img.preview); setProjImages((prev) => prev.filter((_, idx) => idx !== i)); setProjCoverIdx((c) => c >= i && c > 0 ? c - 1 : c); }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Cliquez sur une photo pour la définir comme cover.</p>
                  </>
                )}
              </div>

              {/* Nom */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Nom du projet *</label>
                <input
                  value={projForm.name}
                  onChange={(e) => { setProjForm((f) => ({ ...f, name: e.target.value })); setProjFieldErrors((fe) => ({ ...fe, name: undefined })); }}
                  placeholder="Éco-Lodge Sahara, Restaurant Terroir…"
                  className={`w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${projFieldErrors.name ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`}
                />
                {projFieldErrors.name && <p className="text-xs font-semibold text-red-500">{projFieldErrors.name}</p>}
              </div>

              {/* Type(s) */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">
                  Type de projet <span className="ml-1.5 text-xs font-normal text-slate-400">(plusieurs choix possibles)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TYPES_FULL.map((t) => {
                    const active = projForm.project_type.includes(t.value);
                    return (
                      <button key={t.value} type="button"
                        onClick={() => setProjForm((f) => ({
                          ...f,
                          project_type: active
                            ? f.project_type.filter((x) => x !== t.value)
                            : [...f.project_type, t.value],
                        }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                        <span className="material-symbols-outlined text-base">{t.icon}</span>
                        {t.label}
                        {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Description</label>
                <textarea rows={3}
                  value={projForm.description}
                  onChange={(e) => setProjForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez votre projet éco-touristique…"
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium resize-none"
                />
              </div>

              {/* Région */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Région</label>
                <input
                  value={projForm.region}
                  onChange={(e) => { setProjForm((f) => ({ ...f, region: e.target.value })); setProjFieldErrors((fe) => ({ ...fe, region: undefined })); }}
                  placeholder="Tataouine, Djerba…"
                  className={`w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${projFieldErrors.region ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`}
                />
                {projFieldErrors.region && <p className="text-xs font-semibold text-red-500">{projFieldErrors.region}</p>}
              </div>

              {/* Téléphone + Site web */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Téléphone</label>
                  <input type="tel"
                    value={projForm.phone}
                    onChange={(e) => { setProjForm((f) => ({ ...f, phone: e.target.value })); setProjFieldErrors((fe) => ({ ...fe, phone: undefined })); }}
                    placeholder="+216 XX XXX XXX"
                    className={`w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${projFieldErrors.phone ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`}
                  />
                  {projFieldErrors.phone && <p className="text-xs font-semibold text-red-500">{projFieldErrors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Site web</label>
                  <input
                    value={projForm.website}
                    onChange={(e) => { setProjForm((f) => ({ ...f, website: e.target.value })); setProjFieldErrors((fe) => ({ ...fe, website: undefined })); }}
                    placeholder="https://mon-projet.tn"
                    className={`w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${projFieldErrors.website ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`}
                  />
                  {projFieldErrors.website && <p className="text-xs font-semibold text-red-500">{projFieldErrors.website}</p>}
                </div>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  Services proposés <span className="ml-1.5 text-xs font-normal text-slate-400">(plusieurs choix possibles)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_SERVICES.map((s) => {
                    const active = projForm.services.includes(s.value);
                    return (
                      <button key={s.value} type="button"
                        onClick={() => setProjForm((f) => ({
                          ...f,
                          services: active ? f.services.filter((x) => x !== s.value) : [...f.services, s.value],
                        }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                        <span className="material-symbols-outlined text-base">{s.icon}</span>
                        {s.label}
                        {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Localisation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Localisation</label>
                  <button type="button" onClick={() => setShowProjCreateMap((v) => !v)} className="text-xs font-bold text-primary hover:underline">
                    {showProjCreateMap ? "Masquer la carte" : "Choisir sur la carte"}
                  </button>
                </div>
                <input readOnly value={projForm.address} placeholder="Auto-rempli par la carte…"
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-500 font-medium cursor-default" />
                {showProjCreateMap && (
                  <MapPicker lat={projCreateMapLat} lng={projCreateMapLng} onPick={(lat, lng, address) => { setProjCreateMapLat(lat); setProjCreateMapLng(lng); setProjForm((f) => ({ ...f, address })); }} />
                )}
              </div>

              {/* Horaires */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Horaires d'ouverture</label>
                <input
                  value={projForm.opening_hours}
                  onChange={(e) => setProjForm((f) => ({ ...f, opening_hours: e.target.value }))}
                  placeholder="Lun-Sam 9h-19h"
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium"
                />
              </div>

              {/* Réseaux sociaux */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Facebook</label>
                  <input
                    value={projForm.facebook}
                    onChange={(e) => setProjForm((f) => ({ ...f, facebook: e.target.value }))}
                    placeholder="https://facebook.com/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Instagram</label>
                  <input
                    value={projForm.instagram}
                    onChange={(e) => setProjForm((f) => ({ ...f, instagram: e.target.value }))}
                    placeholder="https://instagram.com/..."
                    className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Éco-pratiques */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Pratiques éco-responsables</label>
                <div className="flex flex-wrap gap-2">
                  {ECO_PRACTICES.map((p) => {
                    const active = projForm.eco_labels.includes(p);
                    return (
                      <button key={p} type="button"
                        onClick={() => setProjForm((f) => ({
                          ...f,
                          eco_labels: active
                            ? f.eco_labels.filter((x) => x !== p)
                            : [...f.eco_labels, p],
                        }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-green-50 border-green-400 text-green-700" : "border-slate-200 text-slate-500 hover:border-green-300"}`}>
                        {active && <Check className="w-3 h-3" />}
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {projError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <span className="material-symbols-outlined text-base text-red-500">error</span>
                  <p className="text-sm font-semibold text-red-600">{projError}</p>
                </div>
              )}

              <button type="submit" disabled={projSaving}
                className="w-full py-3.5 bg-primary text-slate-900 font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60">
                {projSaving ? "Création en cours…" : "Créer le projet"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={openEditOnMount ? "hidden" : embedded ? "w-full" : "w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6"}>

        {/* ══ PROFILE HEADER CARD ═══════════════════════════════════════════ */}
        <div className="relative w-full overflow-hidden bg-white shadow-sm rounded-3xl border border-slate-100/80 mb-6">
          {profile.cover_photo
            ? <div className="relative h-48 md:h-64 lg:h-72 w-full overflow-hidden"><img src={profile.cover_photo} alt="" className="w-full h-full object-cover" /></div>
            : <BotanicalCover />
          }
          <div className="relative px-6 pb-6 pt-3 md:pt-0">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 md:-mt-20">
              <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md" />
                    <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg flex items-center justify-center">
                      <AvatarImg />
                    </div>
                  </div>
                  <div className="bg-primary text-white text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider border border-white">
                    <span className="material-symbols-outlined text-yellow-300" style={{ fontSize: 11 }}>star</span>
                    {scoreLabel(profile.sustainability_score)}
                  </div>
                </div>
                <div className="text-center sm:text-left pt-3 sm:pt-0 pb-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">{profile.full_name || "Prestataire"}</h1>
                    <ShieldCheck size={20} className="text-emerald-500 fill-emerald-100 hidden sm:block" />
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-primary font-semibold text-sm">
                    <span>{roleLabel}</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-0 flex flex-row flex-wrap justify-center sm:justify-end gap-3 self-center md:self-end">
                <button onClick={openModal}
                  className="bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 hover:shadow-lg transition-all shadow-sm text-sm">
                  <Plus size={18} strokeWidth={2.5} /><span>Publier une offre</span>
                </button>
                <button onClick={openEditProfile}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 hover:shadow-sm active:scale-95 transition-all text-sm">
                  <Edit3 size={16} /><span>Modifier le profil</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══ DASHBOARD COLUMNS ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
          <div className={`lg:col-span-4 lg:sticky lg:top-6 space-y-6${embedded ? " hidden" : ""}`}>
            <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-primary">
                  <Info size={18} strokeWidth={2.5} />
                </div>
                <h2 className="text-base font-extrabold text-slate-800">Informations</h2>
              </div>
              <div className="space-y-4">
                {profile.country && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><MapPin size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Localisation</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{COUNTRY_LABELS[profile.country] ?? profile.country}</p>
                    </div>
                  </div>
                )}
                {profile.position && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Briefcase size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Poste</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.position.charAt(0).toUpperCase() + profile.position.slice(1)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Calendar size={16} /></div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Membre depuis</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                      {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                {!profile.country && !profile.position && (
                  <p className="text-xs text-slate-400 italic">Aucune information renseignée.</p>
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
                <>
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
                </>
              ) : (
                <p className="text-xs text-slate-400 font-medium">Aucun follower pour l'instant.</p>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────────── */}
          <div className={`space-y-6${embedded ? " col-span-full" : " lg:col-span-8"}`}>
            <div className={`bg-slate-100 p-1.5 rounded-2xl flex-wrap gap-1 border border-slate-200/50${embedded ? " hidden" : " flex"}`}>
              {[
                { key: "tout",    label: "Tout",     Icon: LayoutGrid },
                { key: "offres",  label: "Offres",   Icon: Tag },
                { key: "projets", label: "Projets",  Icon: Briefcase },
                { key: "reseau",  label: "Réseau",   Icon: Users },
                { key: "apropos", label: "À propos", Icon: Info },
              ].map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveTab(key as Tab)}
                  className={`flex-1 min-w-[70px] py-3 px-4 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}>
                  <Icon size={14} strokeWidth={2.5} /><span>{label}</span>
                </button>
              ))}
            </div>

            {activeTab === "tout" && (
              <div className="space-y-6">
                <div className="space-y-5">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                    <Sparkles size={12} className="text-primary" /><span>Offres Écotourisme Actives</span>
                  </h3>
                  {offers.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-primary text-3xl">sell</span>
                      </div>
                      <p className="text-slate-800 font-extrabold text-base mb-1">Aucune offre publiée</p>
                      <p className="text-slate-400 text-sm mb-5">Publiez votre première expérience éco-touristique.</p>
                      <button onClick={openModal}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 shadow-sm">
                        <Plus size={16} /> Publier une offre
                      </button>
                    </div>
                  ) : (
                    offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)
                  )}
                </div>
                <div className="space-y-5 pt-2">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                    <Briefcase size={12} className="text-teal-500" /><span>Projets Citoyens & Éco-Chantiers</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {profile.projects.map((proj) => <ProjectCard key={proj.id} proj={proj} />)}
                    <LaunchProjectCard />
                  </div>
                </div>
              </div>
            )}

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

            {activeTab === "projets" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800">Projets d'initiative verte ({profile.projects.length})</h3>
                  <button onClick={openProjModal} className="text-primary text-xs font-extrabold">+ Lancer un projet</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {profile.projects.length === 0 ? (
                    <div className="col-span-2 bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-slate-400 text-3xl">domain</span>
                      </div>
                      <p className="text-slate-800 font-extrabold text-base">Aucun projet</p>
                      <p className="text-slate-400 text-sm mt-1">Ajoutez votre premier projet depuis le tableau de bord.</p>
                    </div>
                  ) : (
                    profile.projects.map((proj) => <ProjectCard key={proj.id} proj={proj} />)
                  )}
                  <LaunchProjectCard />
                </div>
              </div>
            )}

            {activeTab === "reseau" && (
              <div className="space-y-5">
                {/* Search guides */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2"><Search size={16} className="text-primary" />Rechercher un guide certifié</h3>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" value={netSearch} onChange={(e) => setNetSearch(e.target.value)} placeholder="Nom d'un guide…"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors" />
                    {netSearch && <button onClick={() => { setNetSearch(""); setNetResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                  </div>
                  {netLoading && <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />Recherche…</div>}
                  {!netLoading && netResults.length > 0 && (
                    <div className="mt-3 divide-y divide-slate-50">
                      {netResults.map((r) => (
                        <div key={r.user_id} className="flex items-center justify-between py-3 gap-3">
                          <button onClick={() => router.push(`/profile/guide/${r.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">{r.photo ? <img src={r.photo} alt={r.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">person</span>}</div>
                            <div className="min-w-0"><p className="font-extrabold text-slate-800 text-sm truncate">{r.full_name}</p>{r.sub && <p className="text-xs text-slate-400">{r.sub}</p>}</div>
                          </button>
                          <button onClick={() => router.push(`/profile/guide/${r.user_id}`)} className="shrink-0 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">Voir</button>
                        </div>
                      ))}
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

                {/* Bio */}
                {profile.bio && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Présentation</p>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
                  </div>
                )}

                {/* Infos professionnelles + contact */}
                <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Informations professionnelles</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {profile.organization && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                          <Building2 size={16} className="text-violet-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Organisation</p>
                          <p className="text-sm font-bold text-slate-800 truncate">{profile.organization}</p>
                        </div>
                      </div>
                    )}
                    {profile.position && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Briefcase size={16} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Poste</p>
                          <p className="text-sm font-bold text-slate-800">{profile.position.charAt(0).toUpperCase() + profile.position.slice(1)}</p>
                        </div>
                      </div>
                    )}
                    {profile.country && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <Globe size={16} className="text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Pays</p>
                          <p className="text-sm font-bold text-slate-800">{COUNTRY_LABELS[profile.country] ?? profile.country}</p>
                        </div>
                      </div>
                    )}
                    {profile.language && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-sky-500" style={{ fontSize: 18 }}>translate</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Langue</p>
                          <p className="text-sm font-bold text-slate-800">{{ fr: "Français", ar: "Arabe", en: "Anglais", es: "Espagnol" }[profile.language] ?? profile.language}</p>
                        </div>
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                          <Phone size={16} className="text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Téléphone</p>
                          <a href={`tel:${profile.phone}`} className="text-sm font-bold text-slate-800 hover:text-primary transition-colors">{profile.phone}</a>
                        </div>
                      </div>
                    )}
                    {!profile.organization && !profile.position && !profile.country && !profile.phone && !profile.language && (
                      <div className="px-6 py-8 text-center text-slate-400 text-xs font-medium">Aucune information renseignée.</div>
                    )}
                  </div>
                </div>

                {/* Activité */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Activité</p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: profile.projects.length, label: "Projets",       icon: "domain",          color: "text-primary    bg-primary/10" },
                      { value: profile.total_reservations, label: "Réservations", icon: "event_available", color: "text-blue-500   bg-blue-50" },
                      { value: profile.feedback_received,  label: "Avis reçus",  icon: "star",            color: "text-amber-500  bg-amber-50" },
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
                      {profile.sustainability_score >= 80 ? "Prestataire Ambassadeur Éco Voyage" : scoreLabel(profile.sustainability_score)}
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </div>
    </div>

    {/* ══ SUSTAINABILITY QUESTIONNAIRE MODAL ══════════════════════════════════ */}
    {qOpen && (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 border-b border-slate-100">
            <button
              onClick={() => setQOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Évaluation de durabilité</p>
            <h2 className="text-xl font-black text-slate-900">
              {qStep < SUSTAINABILITY_STEPS.length ? (
                <>{SUSTAINABILITY_STEPS[qStep].emoji} {SUSTAINABILITY_STEPS[qStep].category}</>
              ) : (
                "🎯 Résultat"
              )}
            </h2>
            {qStep < SUSTAINABILITY_STEPS.length && (
              <p className="text-sm text-slate-500 mt-1">{SUSTAINABILITY_STEPS[qStep].description}</p>
            )}

            {/* Progress bar */}
            <div className="mt-4 flex gap-1.5">
              {SUSTAINABILITY_STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < qStep ? "bg-primary" : i === qStep ? "bg-primary/60" : "bg-slate-100"}`} />
              ))}
            </div>
            <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
              {qStep < SUSTAINABILITY_STEPS.length ? `Étape ${qStep + 1} / ${SUSTAINABILITY_STEPS.length}` : "Toutes les étapes complétées"}
            </p>
          </div>

          {/* Step content */}
          <div className="p-6">
            {qStep < SUSTAINABILITY_STEPS.length ? (
              <div className="space-y-6">
                {SUSTAINABILITY_STEPS[qStep].questions.map((q) => (
                  <div key={q.id}>
                    <p className="text-sm font-bold text-slate-800 mb-3 leading-snug">{q.text}</p>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const selected = qAnswers[q.id] === opt.value;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setQAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm font-semibold transition-all ${
                              selected
                                ? "border-primary bg-primary/10 text-slate-900"
                                : "border-slate-200 text-slate-600 hover:border-primary/40 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "border-primary bg-primary" : "border-slate-300"}`}>
                              {selected && <span className="w-2 h-2 rounded-full bg-white block" />}
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  {qStep > 0 && (
                    <button onClick={() => setQStep((s) => s - 1)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                      <ChevronLeft size={16} /> Précédent
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (qStep === SUSTAINABILITY_STEPS.length - 1) {
                        setQStep((s) => s + 1);
                        submitQuestionnaire();
                      } else {
                        setQStep((s) => s + 1);
                      }
                    }}
                    disabled={!qStepAnswered}
                    className={`flex-1 py-3 font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${
                      qStepAnswered
                        ? "bg-primary text-slate-900 hover:bg-primary/90"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {qStep === SUSTAINABILITY_STEPS.length - 1 ? "Voir mon score" : "Suivant"}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* Result screen */
              <div className="text-center">
                {(() => {
                  const level = getSustainabilityLevel(qScore);
                  const pct = qScore;
                  return (
                    <>
                      {/* Score circle */}
                      <div className="relative w-36 h-36 mx-auto mb-6">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                          <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 50}`}
                            strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                            className="text-primary transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black text-slate-900">{qScore}</span>
                          <span className="text-xs font-bold text-slate-400">/100</span>
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${level.bg} mb-3`}>
                        <span className="text-base">{level.emoji}</span>
                        <span className={`font-extrabold text-sm ${level.color}`}>{level.label}</span>
                      </div>

                      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                        {qScore >= 71
                          ? "Félicitations ! Votre projet affiche un excellent engagement éco-responsable."
                          : qScore >= 51
                          ? "Votre projet est sur la bonne voie. Continuez vos efforts !"
                          : "Ce questionnaire vous aide à identifier les axes d'amélioration pour votre projet."}
                      </p>

                      {/* Category breakdown */}
                      <div className="space-y-2 mb-6 text-left">
                        {SUSTAINABILITY_STEPS.map((step) => {
                          const catScore = step.questions.reduce((sum, q) => sum + (qAnswers[q.id] ?? 0), 0);
                          const catMax = step.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.value)), 0);
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
                        onClick={() => setQOpen(false)}
                        disabled={qSaving}
                        className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-xl hover:bg-primary/90 transition-colors"
                      >
                        {qSaving ? "Enregistrement…" : "Fermer"}
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

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
                {oqStep < OFFER_SUSTAINABILITY_STEPS.length
                  ? <><span className="material-symbols-outlined align-middle text-primary" style={{ fontSize: 22 }}>{OFFER_SUSTAINABILITY_STEPS[oqStep].icon}</span> {OFFER_SUSTAINABILITY_STEPS[oqStep].category}</>
                  : <><span className="material-symbols-outlined align-middle text-primary" style={{ fontSize: 22 }}>flag</span> Résultat</>}
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
                      onClick={() => { if (oqStep === OFFER_SUSTAINABILITY_STEPS.length - 1) { setOqStep((s) => s + 1); submitOfferQuestionnaire(); } else { setOqStep((s) => s + 1); } }}
                      disabled={!oqStepAnswered}
                      className={`flex-1 py-3 font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all ${oqStepAnswered ? "bg-primary text-slate-900 hover:bg-primary/90" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                    >
                      {oqStep === OFFER_SUSTAINABILITY_STEPS.length - 1 ? "Voir mon score" : "Suivant"}<ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (() => {
                const level = getOfferSustainabilityLevel(oqScore);
                const pct = oqScore;
                const r = 54; const circ = 2 * Math.PI * r;
                return (
                  <>
                    <div className="flex flex-col items-center py-4">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                        <circle cx="70" cy="70" r={r} fill="none" stroke="#86efac" strokeWidth="10"
                          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
                          strokeLinecap="round" transform="rotate(-90 70 70)" className="transition-all duration-700" />
                        <text x="70" y="65" textAnchor="middle" className="text-3xl font-black fill-slate-900" style={{ fontSize: 28, fontWeight: 900 }}>{oqScore}</text>
                        <text x="70" y="82" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 12, fontWeight: 700 }}>/100</text>
                      </svg>
                      <span className={`mt-2 text-base font-extrabold ${level.color}`}><span className="material-symbols-outlined align-middle" style={{ fontSize: 18 }}>{level.icon}</span> {level.label}</span>
                      <p className="text-sm text-slate-500 mt-1 text-center">{oqScore >= 71 ? "Votre offre est éco-responsable. Excellent !" : oqScore >= 51 ? "Votre offre est sur la bonne voie. Continuez vos efforts !" : "Des améliorations sont possibles pour cette offre."}</p>
                    </div>
                    <div className="space-y-3 mb-4">
                      {OFFER_SUSTAINABILITY_STEPS.map((step) => {
                        const catScore = step.questions.reduce((sum, q) => sum + (oqAnswers[q.id] ?? 0), 0);
                        const catMax = step.questions.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.value)), 0);
                        return (
                          <div key={step.category} className="flex items-center gap-3">
                            <span className="material-symbols-outlined w-6 shrink-0 text-primary" style={{ fontSize: 18 }}>{step.icon ?? "eco"}</span>
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
                    <button onClick={() => setOqOpen(false)} disabled={oqSaving}
                      className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-xl hover:bg-primary/90 transition-colors">
                      {oqSaving ? "Enregistrement…" : "Fermer"}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      );
    })()}

    </>
  );
}
