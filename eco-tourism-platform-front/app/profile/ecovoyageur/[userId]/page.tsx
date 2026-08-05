"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  MapPin, ArrowLeft, Globe, UserPlus, Clock, Check, X, MoreVertical,
  UserMinus, ShieldBan, Flag, ChevronLeft, ChevronRight, ArrowRight,
  Send, Info, Compass, Star, Heart, ShieldCheck, Mountain, Leaf, LayoutGrid,
} from "lucide-react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import PubInteractions from "@/components/PubInteractions";
import PlaceContributions, { type TopPhotoData, type TopDescData } from "@/components/PlaceContributions";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" />,
});

// ─── Botanical SVG Cover ──────────────────────────────────────────────────────

function BotanicalCover() {
  return (
    <div className="relative h-48 md:h-64 lg:h-72 w-full bg-gradient-to-br from-teal-100 via-emerald-50 to-slate-100 overflow-hidden">
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
          <path d="M1080,200 Q1160,240 1150,290 Q1100,300 1050,270 Q1090,250 1080,200Z" />
          <path d="M1080,200 Q1060,250 1050,270" />
        </g>
        <path d="M0,260 Q300,230 600,250 Q900,270 1200,240" stroke="#2d6a4f" strokeWidth="1" fill="none" opacity="0.15" />
      </svg>
    </div>
  );
}

// ─── PubMap ───────────────────────────────────────────────────────────────────

function PubMap({ lat, lng, address }: { lat: number | null; lng: number | null; address: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (coords || !address.trim()) return;
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=fr`)
      .then((r) => r.json())
      .then((d) => { if (d.length) setCoords({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  if (loading) return <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" />;
  if (!coords) return null;
  return (
    <div>
      <MapView lat={coords.lat} lng={coords.lng} />
      <a href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=14/${coords.lat}/${coords.lng}`}
        target="_blank" rel="noopener noreferrer"
        className="mt-1.5 flex justify-end text-[10px] font-black text-primary uppercase tracking-wider hover:underline">
        Ouvrir dans la carte ↗
      </a>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France",
  DE: "Allemagne", IT: "Italie", ES: "Espagne", GB: "Royaume-Uni", OTHER: "Autre",
};

const TRAVELER_TYPES = [
  { value: "solo", label: "Voyageur solo" },
  { value: "couples", label: "Couples" },
  { value: "groupe", label: "Groupe" },
  { value: "groupes", label: "Groupes" },
  { value: "famille", label: "Famille" },
  { value: "aventurier", label: "Aventurier" },
  { value: "culturel", label: "Culturel" },
  { value: "eco_conscient", label: "Éco-Conscient" },
  { value: "digital_nomad", label: "Digital Nomad" },
];

const UNIVERS = [
  { value: "nature",                 label: "Nature" },
  { value: "histoire_archeologie",   label: "Histoire & Archéologie" },
  { value: "aventure_sport",         label: "Aventure & Sport" },
  { value: "gastronomie",            label: "Gastronomie" },
  { value: "artisanat",              label: "Artisanat" },
  { value: "decouverte_urbaine",     label: "Découverte urbaine" },
  { value: "culture_patrimoine",     label: "Culture & Patrimoine" },
  { value: "bien_etre",              label: "Bien-être" },
  { value: "transport_experientiel", label: "Transport expérientiel" },
  { value: "volontariat",            label: "Volontariat" },
];

const TAXONOMY_TAGS: Record<string, { value: string; label: string }[]> = {
  nature: [
    { value: "faune", label: "Faune" }, { value: "flore", label: "Flore" },
    { value: "biodiversite", label: "Biodiversité" }, { value: "ornithologie", label: "Ornithologie & oiseaux" },
    { value: "geologie", label: "Géologie" }, { value: "botanique", label: "Botanique" },
    { value: "ecologie_marine", label: "Écologie marine" }, { value: "zones_humides", label: "Zones humides" },
    { value: "forets_maquis", label: "Forêts & maquis" }, { value: "desert_dunes", label: "Désert & dunes" },
    { value: "oasis", label: "Oasis" }, { value: "parcs_naturels", label: "Parcs naturels" },
    { value: "astronomie", label: "Astronomie & ciel nocturne" }, { value: "photographie_nature", label: "Photographie nature" },
    { value: "conservation_protection", label: "Conservation & protection" }, { value: "observation_faune", label: "Observation faune & mammifères" },
    { value: "safari_desert", label: "Safari désert" }, { value: "circuit_nature", label: "Circuit nature" },
    { value: "circuit_montagne", label: "Circuit montagne" }, { value: "tour_cotier", label: "Tour côtier" },
  ],
  histoire_archeologie: [
    { value: "periode_punique", label: "Période punique" }, { value: "periode_romaine", label: "Période romaine" },
    { value: "periode_byzantine", label: "Période byzantine" }, { value: "periode_arabe_medievale", label: "Période arabe & médiévale" },
    { value: "periode_ottomane", label: "Période ottomane" }, { value: "periode_coloniale", label: "Période coloniale" },
    { value: "prehistoire", label: "Préhistoire" }, { value: "fouilles_archeologiques", label: "Fouilles archéologiques" },
    { value: "mosaiques_antiques", label: "Mosaïques antiques" }, { value: "thermes_romains", label: "Thermes romains" },
    { value: "amphitheatres", label: "Amphithéâtres" }, { value: "necropoles", label: "Nécropoles" },
    { value: "ksour_greniers_berberes", label: "Ksour & greniers berbères" }, { value: "routes_commerciales", label: "Routes commerciales" },
    { value: "carthage_civilisation_punique", label: "Carthage & civilisation punique" }, { value: "circuit_historique", label: "Circuit historique" },
  ],
  aventure_sport: [
    { value: "randonnee_pedestre", label: "Randonnée pédestre" }, { value: "trek_multi_jours", label: "Trek multi-jours" },
    { value: "escalade", label: "Escalade" }, { value: "via_ferrata", label: "Via ferrata" },
    { value: "speleologie", label: "Spéléologie" }, { value: "canyoning", label: "Canyoning" },
    { value: "vtt_cyclisme", label: "VTT & cyclisme" }, { value: "kayak_canoe", label: "Kayak & canoë" },
    { value: "surf_windsurf", label: "Surf & windsurf" }, { value: "plongee_sous_marine", label: "Plongée sous-marine" },
    { value: "snorkeling", label: "Snorkeling" }, { value: "quad_4x4", label: "Quad & 4x4" },
    { value: "bivouac", label: "Bivouac" }, { value: "equitation", label: "Équitation" },
    { value: "tir_arc", label: "Tir à l'arc" }, { value: "peche_traditionnelle", label: "Pêche traditionnelle" },
  ],
  gastronomie: [
    { value: "cuisine_tunisienne_traditionnelle", label: "Cuisine tunisienne traditionnelle" }, { value: "cuisine_berbere", label: "Cuisine berbère" },
    { value: "cuisine_cotiere_fruits_mer", label: "Cuisine côtière & fruits de mer" }, { value: "street_food", label: "Street food" },
    { value: "epices_condiments", label: "Épices & condiments" }, { value: "huile_olive_oleiculture", label: "Huile d'olive & oléiculture" },
    { value: "dattes_palmeraies", label: "Dattes & palmeraies" }, { value: "marches_locaux", label: "Marchés locaux" },
    { value: "cours_cuisine", label: "Cours de cuisine" }, { value: "degustation_thes", label: "Dégustation de thés" },
    { value: "vins_viticulture", label: "Vins & viticulture" }, { value: "boulangerie_traditionnelle", label: "Boulangerie traditionnelle" },
    { value: "miel_apiculture", label: "Miel & apiculture" }, { value: "restaurant_traditionnel", label: "Restaurant traditionnel" },
    { value: "food_truck", label: "Food truck" }, { value: "table_hotes", label: "Table d'hôtes" },
  ],
  artisanat: [
    { value: "poterie_ceramique", label: "Poterie & céramique" }, { value: "tissage_tapis", label: "Tissage & tapis" },
    { value: "broderie", label: "Broderie" }, { value: "bijoux_berberes", label: "Bijoux berbères" },
    { value: "bijoux_argent", label: "Bijoux en argent" }, { value: "maroquinerie_cuir", label: "Maroquinerie & cuir" },
    { value: "sculpture_bois", label: "Sculpture sur bois" }, { value: "thuya_marqueterie", label: "Thuya & marqueterie" },
    { value: "vannerie_alfa", label: "Vannerie & alfa" }, { value: "calligraphie", label: "Calligraphie arabe" },
    { value: "savon_artisanal", label: "Savon artisanal" }, { value: "peinture_traditionnelle", label: "Peinture traditionnelle" },
  ],
  decouverte_urbaine: [
    { value: "architecture_moderne", label: "Architecture moderne" }, { value: "street_art_graffiti", label: "Street art & graffiti" },
    { value: "quartiers_historiques", label: "Quartiers historiques" }, { value: "vie_de_quartier", label: "Vie de quartier" },
    { value: "marches_urbains", label: "Marchés urbains" }, { value: "cafes_culture_locale", label: "Cafés & culture locale" },
    { value: "scene_artistique", label: "Scène artistique" }, { value: "musique_nuits_locales", label: "Musique & nuits locales" },
    { value: "parcs_espaces_verts", label: "Parcs & espaces verts" }, { value: "port_activites_maritimes", label: "Port & activités maritimes" },
  ],
  culture_patrimoine: [
    { value: "architecture_islamique", label: "Architecture islamique" }, { value: "architecture_romaine", label: "Architecture romaine" },
    { value: "musees", label: "Musées" }, { value: "medinas", label: "Médinas" },
    { value: "traditions_locales", label: "Traditions locales" }, { value: "musique_traditionnelle", label: "Musique traditionnelle" },
    { value: "danse_folklorique", label: "Danse folklorique" }, { value: "fetes_festivals", label: "Fêtes & festivals" },
    { value: "religion_spiritualite", label: "Religion & spiritualité" }, { value: "art_contemporain", label: "Art contemporain" },
    { value: "visite_medina", label: "Visite médina guidée" }, { value: "visite_musee", label: "Visite musée" },
  ],
  bien_etre: [
    { value: "hammam_traditionnel", label: "Hammam traditionnel" }, { value: "massage_naturel", label: "Massage naturel" },
    { value: "retraite_yoga", label: "Retraite yoga" }, { value: "meditation", label: "Méditation" },
    { value: "bain_thermal", label: "Bain thermal" }, { value: "yoga", label: "Yoga" },
  ],
  transport_experientiel: [
    { value: "location_velo", label: "Balade à vélo" }, { value: "caleche", label: "Calèche" },
    { value: "bateau_traditionnel", label: "Bateau traditionnel" }, { value: "dromadaire", label: "Balade à dromadaire" },
    { value: "transfert_partage", label: "Transfert partagé & covoiturage local" },
  ],
  volontariat: [
    { value: "plantation_arbres", label: "Plantation d'arbres" }, { value: "nettoyage_plage", label: "Nettoyage plage" },
    { value: "nettoyage_foret", label: "Nettoyage forêt" }, { value: "education_environnementale", label: "Éducation environnementale" },
    { value: "jardin_communautaire", label: "Jardin communautaire" },
  ],
};

const SUSTAINABILITY_VALUES = [
  { value: "support_local_economy",   label: "Économie locale" },
  { value: "protect_biodiversity",    label: "Biodiversité" },
  { value: "reduce_carbon",           label: "Réduire l'empreinte carbone" },
  { value: "responsible_tourism",     label: "Tourisme responsable" },
  { value: "respect_cultures",        label: "Respect des cultures" },
  { value: "local_consumption",       label: "Consommation locale" },
  { value: "avoid_mass_tourism",      label: "Éviter le tourisme de masse" },
];

const LANDSCAPES = [
  { value: "mountain",    label: "Montagne" },
  { value: "desert",      label: "Désert" },
  { value: "sea",         label: "Mer" },
  { value: "forest",      label: "Forêt" },
  { value: "lake",        label: "Lac" },
  { value: "village",     label: "Village" },
  { value: "archaeology", label: "Archéologie" },
  { value: "oasis",       label: "Oasis" },
];

const GOALS = [
  { value: "reduce_carbon",          label: "Réduire mon empreinte carbone" },
  { value: "support_local_projects", label: "Soutenir des projets locaux" },
  { value: "preserve_biodiversity",  label: "Préserver la biodiversité" },
  { value: "avoid_mass_tourism",     label: "Éviter le tourisme de masse" },
  { value: "support_local_crafts",   label: "Valoriser l'artisanat local" },
  { value: "promote_local_culture",  label: "Promouvoir la culture locale" },
];

const REPORT_REASONS = [
  "Contenu inapproprié", "Faux profil", "Harcèlement ou spam",
  "Informations trompeuses", "Autre",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicProfile = {
  user_id: string;
  full_name: string;
  bio: string | null;
  photo: string | null;
  cover_photo: string | null;
  country: string | null;
  sustainability_score: number | null;
  traveler_types: string[] | null;
  motivations: string[] | null;
  interests: string[] | null;
  landscapes: string[] | null;
  sustainability_values: string[] | null;
  sustainability_goals: string[] | null;
  publications: Publication[];
  friend_status: "none" | "pending_sent" | "pending_received" | "accepted";
  friendship_id: string | null;
};

type Publication = {
  id: string;
  type: "place" | "experience";
  title: string;
  description: string | null;
  images: string[] | null;
  place_name: string | null;
  region: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreLabel(score: number | null) {
  if (score === null) return "Éco-Voyageur";
  if (score >= 80) return "Ambassadeur Éco Voyage";
  if (score >= 60) return "Explorateur Engagé";
  if (score >= 40) return "Voyageur Sensible";
  return "Voyageur Éco-Débutant";
}


function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

// ─── PubRow ───────────────────────────────────────────────────────────────────

function PubRow({ pub, topPhoto, topDesc }: { pub: Publication; topPhoto?: TopPhotoData | null; topDesc?: TopDescData | null }) {
  const isExp = pub.type === "experience";
  const cover = pub.images?.find((s) => s.startsWith("http"));
  const authorInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col lg:flex-row overflow-hidden rounded-t-3xl">
      <div className="lg:w-2/5 relative min-h-[180px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
        {cover ? (
          <img src={cover} alt={pub.title} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        ) : (
          <>
            <div className={`absolute inset-0 opacity-85 ${isExp ? "bg-gradient-to-br from-teal-500 to-emerald-400" : "bg-gradient-to-br from-blue-500 to-cyan-400"}`} />
            <span className="material-symbols-outlined text-white/35 relative z-10" style={{ fontSize: 90 }}>
              {isExp ? "hiking" : "location_on"}
            </span>
          </>
        )}
        <div className="absolute top-3 left-3 z-10 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border bg-white/90 text-slate-700 border-white/40">
          {isExp ? "Expérience" : "Lieu"}
        </div>
        {pub.type === "place" && cover && (
          <span className="absolute bottom-3 left-3 z-10 text-[9px] font-black uppercase tracking-wide bg-white/90 text-slate-700 px-2 py-0.5 rounded-full shadow-sm border border-white/40">
            Officiel
          </span>
        )}
        {pub.type === "place" && topPhoto && (() => {
          const descAuthor = topDesc?.author ?? null;
          const showDescAuthor = descAuthor && descAuthor.user_id !== topPhoto.author.user_id;
          return (
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
              <div className="w-5 h-5 rounded-full overflow-hidden border border-white/60 bg-emerald-100 shrink-0 flex items-center justify-center">
                {topPhoto.author.photo
                  ? <img src={topPhoto.author.photo} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[7px] font-black text-emerald-700">{authorInitials(topPhoto.author.full_name)}</span>}
              </div>
              {showDescAuthor && (
                <div className="w-5 h-5 rounded-full overflow-hidden border border-white/60 bg-emerald-100 shrink-0 flex items-center justify-center -ml-1.5">
                  {descAuthor.photo
                    ? <img src={descAuthor.photo} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[7px] font-black text-emerald-700">{authorInitials(descAuthor.full_name)}</span>}
                </div>
              )}
              <span className="text-[9px] font-bold text-white ml-0.5">+photo</span>
            </div>
          );
        })()}
      </div>
      <div className="lg:w-3/5 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-tight mb-1">{pub.title}</h3>
          {(pub.place_name || pub.region) && (
            <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold mb-3">
              <MapPin size={11} className="text-primary shrink-0" />
              {[pub.place_name, pub.region].filter(Boolean).join(", ")}
            </div>
          )}
          {pub.description && (
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{pub.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
          <p className="text-[11px] font-bold text-slate-400">{formatDate(pub.created_at)}</p>
          <span className="text-primary font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
            <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PublicEcoTravelerProfile() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightedPubId = searchParams.get("pub");
  const menuRef = useRef<HTMLDivElement>(null);
  const pubRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [viewerRole, setViewerRole] = useState("");
  const [viewerId, setViewerId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const [tab, setTab] = useState<"all" | "places" | "experiences" | "apropos">("all");
  const [selectedPub, setSelectedPub] = useState<Publication | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  type SocialUser = { user_id: string; full_name: string | null; photo: string | null };
  const [theirFriends, setTheirFriends] = useState<SocialUser[]>([]);
  const [myFriendIds, setMyFriendIds] = useState<Set<string>>(new Set());

  const [contribCounts, setContribCounts] = useState<Record<string, number>>({});
  const [topPhotos, setTopPhotos] = useState<Record<string, TopPhotoData | null>>({});
  const [topDescs, setTopDescs] = useState<Record<string, TopDescData | null>>({});

  useEffect(() => {
    if (!highlightedPubId || !profile) return;
    const el = pubRefs.current[highlightedPubId];
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
  }, [highlightedPubId, profile]);

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
    if (!tkn) { router.push("/auth/login"); return; }
    setToken(tkn);
    let role = ""; let vid = "";
    try { const p = JSON.parse(atob(tkn.split(".")[1])); role = p.role ?? ""; vid = p.sub ?? ""; setViewerRole(role); setViewerId(vid); } catch {}
    apiFetch<PublicProfile>(`/eco-traveler/profile/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } })
      .then(setProfile).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
    apiFetch<SocialUser[]>(`/eco-traveler/friends/public/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } })
      .then(setTheirFriends).catch(() => {});
    if (role === "eco_traveler") {
      apiFetch<SocialUser[]>("/eco-traveler/friends", { headers: { Authorization: `Bearer ${tkn}` } })
        .then((list) => setMyFriendIds(new Set(list.map((f) => f.user_id)))).catch(() => {});
    }
  }, [userId]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function sendRequest() {
    if (!token || !profile) return;
    setActionLoading(true);
    try {
      const f = await apiFetch<{ id: string }>(`/eco-traveler/friends/request/${userId}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      setProfile((p) => p ? { ...p, friend_status: "pending_sent", friendship_id: f.id } : p);
    } finally { setActionLoading(false); }
  }

  async function cancelRequest() {
    if (!token || !profile?.friendship_id) return;
    setActionLoading(true);
    try {
      await apiFetch(`/eco-traveler/friends/${profile.friendship_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setProfile((p) => p ? { ...p, friend_status: "none", friendship_id: null } : p);
    } finally { setActionLoading(false); }
  }

  async function acceptRequest() {
    if (!token || !profile?.friendship_id) return;
    setActionLoading(true);
    try {
      await apiFetch(`/eco-traveler/friends/accept/${profile.friendship_id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      setProfile((p) => p ? { ...p, friend_status: "accepted" } : p);
    } finally { setActionLoading(false); }
  }

  async function removeFriend() {
    if (!token || !profile?.friendship_id) return;
    setActionLoading(true);
    try {
      await apiFetch(`/eco-traveler/friends/${profile.friendship_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setProfile((p) => p ? { ...p, friend_status: "none", friendship_id: null } : p);
      setRemoveConfirm(false);
    } finally { setActionLoading(false); }
  }

  async function blockUser() {
    if (!token) return;
    setActionLoading(true);
    try {
      await apiFetch(`/eco-traveler/block/${userId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setBlocked(true); setBlockConfirm(false);
    } finally { setActionLoading(false); }
  }

  async function reportUser() {
    if (!token || !reportReason) return;
    setActionLoading(true);
    try {
      await apiFetch(`/reports`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reported_id: userId, reason: reportReason }),
      });
      setReportSent(true);
    } finally { setActionLoading(false); }
  }

  function handleContact() {
    const name = encodeURIComponent(profile?.full_name ?? "");
    router.push(`/messagerie?recipient=${userId}&name=${name}&role=eco_traveler`);
  }

  // ── States ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (error || !profile || blocked) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      {blocked
        ? <><ShieldBan size={48} className="text-slate-300" /><p className="text-slate-500 font-semibold">Utilisateur bloqué.</p></>
        : <><Mountain size={48} className="text-slate-300" /><p className="text-slate-500 font-semibold">Profil introuvable.</p></>
      }
      <button onClick={() => router.back()} className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
        <ArrowLeft size={14} /> Retour
      </button>
    </div>
  );

  const places = profile.publications.filter((p) => p.type === "place");
  const experiences = profile.publications.filter((p) => p.type === "experience");
  const visiblePubs = tab === "places" ? places : tab === "experiences" ? experiences : profile.publications;

  return (
    <>
    <div className="min-h-screen bg-slate-100 pb-16">

      {/* ── Nav ── */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all">
            <ArrowLeft size={16} />Retour
          </button>
          <div className="flex items-center gap-2 text-slate-900">
            <Leaf className="text-primary w-6 h-6" />
            <span className="text-base font-extrabold tracking-tight">Éco-Voyage</span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ── Profile Header Card ── */}
        <div className="relative w-full overflow-hidden bg-white shadow-sm rounded-3xl border border-slate-100/80 mb-6">
          {profile.cover_photo
            ? <img src={profile.cover_photo} alt="" className="h-48 md:h-64 w-full object-cover" />
            : <BotanicalCover />
          }
          <div className="relative px-6 pb-6 pt-3 md:pt-0">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 md:-mt-20 gap-4">

              {/* Left: avatar + name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 min-w-0">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md" />
                    <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg flex items-center justify-center">
                      {profile.photo
                        ? <img src={profile.photo} alt={profile.full_name} className="w-full h-full object-cover" />
                        : <span className="material-symbols-outlined text-primary" style={{ fontSize: 56 }}>person</span>
                      }
                    </div>
                  </div>
                  <div className="bg-primary text-white text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider border border-white">
                    <span className="material-symbols-outlined text-yellow-300" style={{ fontSize: 11 }}>star</span>
                    {scoreLabel(profile.sustainability_score)}
                  </div>
                </div>
                <div className="text-center sm:text-left pb-1 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 break-words">{profile.full_name}</h1>
                    <ShieldCheck size={20} className="text-emerald-500 fill-emerald-100 hidden sm:block shrink-0" />
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-primary font-semibold text-sm">
                    <span>Éco-Voyageur</span>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: action buttons */}
              <div className="flex flex-row flex-wrap justify-center md:justify-end gap-3 shrink-0 self-end pb-1">
                {viewerRole === "eco_traveler" && (
                  <>
                    {profile.friend_status === "none" && (
                      <button onClick={sendRequest} disabled={actionLoading}
                        className="whitespace-nowrap bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 hover:shadow-lg transition-all shadow-sm text-sm disabled:opacity-60">
                        <UserPlus size={16} /> Ajouter en ami
                      </button>
                    )}
                    {profile.friend_status === "pending_sent" && (
                      <button onClick={cancelRequest} disabled={actionLoading}
                        className="whitespace-nowrap border-2 border-slate-200 bg-white text-slate-500 font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 text-sm disabled:opacity-60 hover:border-red-200 hover:text-red-500 transition-all">
                        <Clock size={16} /> Demande envoyée
                      </button>
                    )}
                    {profile.friend_status === "pending_received" && (
                      <div className="flex gap-2">
                        <button onClick={acceptRequest} disabled={actionLoading}
                          className="whitespace-nowrap bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 text-sm disabled:opacity-60 transition-all">
                          <Check size={16} /> Accepter
                        </button>
                        <button onClick={cancelRequest} disabled={actionLoading}
                          className="w-12 border-2 border-slate-200 text-slate-500 rounded-2xl hover:border-red-300 hover:text-red-500 flex items-center justify-center transition-all">
                          <X size={16} />
                        </button>
                      </div>
                    )}
                    {profile.friend_status === "accepted" && (
                      <button onClick={handleContact}
                        className="whitespace-nowrap bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 hover:shadow-lg transition-all shadow-sm text-sm">
                        <Send size={16} /> Contacter
                      </button>
                    )}
                  </>
                )}
                {/* 3-dots menu */}
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen((v) => !v)}
                    className="w-12 h-12 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors shrink-0">
                    <MoreVertical size={18} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 py-1" style={{ top: "3.2rem" }}>
                      {viewerRole === "eco_traveler" && profile.friend_status === "accepted" && (
                        <button onClick={() => { setMenuOpen(false); setRemoveConfirm(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                          <UserMinus size={15} className="text-slate-400" /> Retirer l'ami
                        </button>
                      )}
                      <button onClick={() => { setMenuOpen(false); setBlockConfirm(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors">
                        <ShieldBan size={15} /> Bloquer
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                        <Flag size={15} /> Signaler
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT SIDEBAR ── */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">

            {/* Informations */}
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
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Globe size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Pays</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{COUNTRY_LABELS[profile.country] ?? profile.country}</p>
                    </div>
                  </div>
                )}
                {profile.traveler_types && profile.traveler_types.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Compass size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Type de voyageur</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profile.traveler_types.map((v) => {
                          const t = TRAVELER_TYPES.find((x) => x.value === v);
                          return <span key={v} className="text-xs font-semibold text-slate-700">{t?.label ?? v}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Star size={16} /></div>
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Score durabilité</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.sustainability_score !== null ? `${profile.sustainability_score}/100` : "—"}</p>
                  </div>
                </div>
                {profile.motivations && profile.motivations.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Globe size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Univers</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profile.motivations.map((v) => {
                          const u = UNIVERS.find((x) => x.value === v);
                          return <span key={v} className="text-xs font-semibold text-slate-700">{u?.label ?? v}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Heart size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Activités & intérêts</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profile.interests.slice(0, 6).map((slug) => (
                          <span key={slug} className="text-xs font-semibold text-slate-700">{slug}</span>
                        ))}
                        {profile.interests.length > 6 && (
                          <span className="text-xs text-slate-400 font-medium">+{profile.interests.length - 6} autres</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {!profile.country && !profile.traveler_types?.length && (
                  <p className="text-xs text-slate-400 italic">Aucune information renseignée.</p>
                )}
              </div>
            </div>

            {/* Amis en commun */}
            {theirFriends.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    👥 Amis de {profile.full_name.split(" ")[0]}
                  </p>
                  <span className="text-[11px] font-black text-slate-400">{theirFriends.length}</span>
                </div>
                <div className="space-y-2.5">
                  {theirFriends.slice(0, 3).map((f) => {
                    const isCommon = myFriendIds.has(f.user_id) && f.user_id !== viewerId;
                    const dest = f.user_id === viewerId ? "/profile/ecovoyageur" : `/profile/ecovoyageur/${f.user_id}`;
                    return (
                      <button key={f.user_id} onClick={() => router.push(dest)}
                        className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors text-left">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {f.photo ? <img src={f.photo} alt={f.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                        </div>
                        <p className="text-sm font-extrabold text-slate-800 truncate flex-1">{f.full_name ?? "—"}</p>
                        {isCommon && (
                          <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">En commun</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {theirFriends.length > 3 && (
                  <button onClick={() => setShowFriendsModal(true)}
                    className="mt-3 w-full text-xs font-bold text-primary hover:underline text-center">
                    Voir tout ({theirFriends.length})
                  </button>
                )}
              </div>
            )}

          </div>

          {/* ── RIGHT: Publications ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Tabs — même style que profil propre */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/50">
              {[
                { key: "all",         label: "Tout",         Icon: LayoutGrid },
                { key: "experiences", label: "Expériences",  Icon: Mountain   },
                { key: "places",      label: "Lieux",        Icon: MapPin     },
                { key: "apropos",     label: "À propos",     Icon: Info       },
              ].map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setTab(key as typeof tab)}
                  className={`flex-1 min-w-[70px] py-3 px-4 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${tab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}>
                  <Icon size={14} strokeWidth={2.5} /><span>{label}</span>
                </button>
              ))}
            </div>

            {/* ── À propos complet ── */}
            {tab === "apropos" ? (
              <div className="space-y-6">

                {profile.bio && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Leaf size={16} className="text-primary" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-800">Présentation</h3>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {((profile.traveler_types?.length ?? 0) > 0 || (profile.motivations?.length ?? 0) > 0) && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Compass size={16} className="text-blue-600" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-800">Profil Voyageur</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {profile.traveler_types && profile.traveler_types.length > 0 && (
                        <div className="py-3 first:pt-0">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Type de voyageur</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.traveler_types.map((v) => {
                              const t = TRAVELER_TYPES.find((x) => x.value === v);
                              return <span key={v} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-xl text-xs font-bold">{t?.label ?? v}</span>;
                            })}
                          </div>
                        </div>
                      )}
                      {profile.motivations && profile.motivations.length > 0 && (
                        <div className="py-3 last:pb-0">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Univers</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.motivations.map((v) => {
                              const u = UNIVERS.find((x) => x.value === v);
                              return <span key={v} className="bg-slate-50 text-slate-700 border border-slate-100 px-3 py-1 rounded-xl text-xs font-semibold">{u?.label ?? v}</span>;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center">
                        <Heart size={16} className="text-violet-600" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-800">Activités & intérêts</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.map((slug) => {
                        const tag = Object.values(TAXONOMY_TAGS).flat().find((t) => t.value === slug);
                        return (
                          <span key={slug} className="bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-xl text-xs font-semibold">
                            {tag?.label ?? slug}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {((profile.landscapes?.length ?? 0) > 0 || (profile.sustainability_values?.length ?? 0) > 0 || (profile.sustainability_goals?.length ?? 0) > 0) && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Mountain size={16} className="text-emerald-600" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-800">Préférences & Objectifs</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {profile.landscapes && profile.landscapes.length > 0 && (
                        <div className="py-3 first:pt-0">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Paysages préférés</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.landscapes.map((v) => {
                              const l = LANDSCAPES.find((x) => x.value === v);
                              return <span key={v} className="bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-xl text-xs font-semibold">{l?.label ?? v}</span>;
                            })}
                          </div>
                        </div>
                      )}
                      {profile.sustainability_values && profile.sustainability_values.length > 0 && (
                        <div className="py-3">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Valeurs durables</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.sustainability_values.map((v) => {
                              const sv = SUSTAINABILITY_VALUES.find((x) => x.value === v);
                              return <span key={v} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-xl text-xs font-semibold">{sv?.label ?? v}</span>;
                            })}
                          </div>
                        </div>
                      )}
                      {profile.sustainability_goals && profile.sustainability_goals.length > 0 && (
                        <div className="py-3 last:pb-0">
                          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Objectifs durables</p>
                          <ul className="space-y-1.5">
                            {profile.sustainability_goals.map((v) => {
                              const g = GOALS.find((x) => x.value === v);
                              return (
                                <li key={v} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                  <Check size={13} className="text-emerald-500 shrink-0" />{g?.label ?? v}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Leaf size={16} className="text-primary" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800">Score de durabilité</h3>
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-5xl font-black text-slate-900">
                      {profile.sustainability_score !== null ? profile.sustainability_score : "—"}
                    </span>
                    <span className="text-slate-400 font-bold text-lg mb-1">/100</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-emerald-300 rounded-full transition-all duration-700"
                      style={{ width: `${profile.sustainability_score ?? 0}%` }} />
                  </div>
                  <p className="text-sm font-bold text-primary">{scoreLabel(profile.sustainability_score)}</p>
                </div>

                {!profile.bio && !profile.traveler_types?.length && !profile.motivations?.length && !profile.interests?.length && (
                  <div className="bg-white p-8 rounded-3xl border border-slate-100/80 shadow-sm text-center">
                    <Leaf size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm italic">Aucune information complémentaire renseignée.</p>
                  </div>
                )}

              </div>
            ) : (
              /* Publications */
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 px-1">
                  <Leaf size={12} className="text-primary" /><span>Publications éco-touristiques</span>
                </h3>
                {profile.publications.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm py-16 text-center">
                    <Leaf size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold text-sm">Aucune publication pour l'instant.</p>
                  </div>
                ) : visiblePubs.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm py-12 text-center">
                    <p className="text-slate-400 font-medium text-sm">Aucune publication dans cette catégorie.</p>
                  </div>
                ) : (
                  visiblePubs.map((pub) => {
                    const isHighlighted = pub.id === highlightedPubId;
                    return (
                      <div
                        key={pub.id}
                        ref={(el) => { pubRefs.current[pub.id] = el; }}
                        className={`bg-white rounded-3xl border border-slate-100/90 shadow-sm hover:shadow-md transition-all duration-300 ${isHighlighted ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      >
                        <div onClick={() => { setSelectedPub(pub); setSliderIdx(0); }} className="cursor-pointer">
                          <PubRow pub={pub} topPhoto={topPhotos[pub.id]} topDesc={topDescs[pub.id]} />
                        </div>
                        <PubInteractions
                          pubId={pub.id}
                          token={token}
                          viewerId={viewerId}
                          shareUrl={typeof window !== "undefined" ? `${window.location.origin}/profile/ecovoyageur/${userId}?pub=${pub.id}` : `/profile/ecovoyageur/${userId}?pub=${pub.id}`}
                          pubTitle={pub.title}
                          contributionsCount={contribCounts[pub.id]}
                          contributionsContent={pub.type === "place" ? (
                            <PlaceContributions
                              publicationId={pub.id}
                              publisherId={userId}
                              onCountLoaded={(n) => setContribCounts((prev) => prev[pub.id] === n ? prev : { ...prev, [pub.id]: n })}
                              onTopPhotoLoaded={(data) => setTopPhotos((prev) => {
                                const prevUrl = prev[pub.id]?.images[0] ?? null;
                                if (prevUrl === (data?.images[0] ?? null)) return prev;
                                return { ...prev, [pub.id]: data };
                              })}
                              onTopDescLoaded={(data) => setTopDescs((prev) => {
                                const prevTxt = prev[pub.id]?.content ?? null;
                                if (prevTxt === (data?.content ?? null)) return prev;
                                return { ...prev, [pub.id]: data };
                              })}
                            />
                          ) : undefined}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ── Confirm remove ── */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRemoveConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><UserMinus size={22} className="text-slate-500" /></div>
            <h3 className="text-lg font-extrabold text-slate-900 text-center mb-1">Supprimer l'ami ?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">{profile.full_name} sera retiré de votre liste d'amis.</p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveConfirm(false)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl text-sm hover:bg-slate-50">Annuler</button>
              <button onClick={removeFriend} disabled={actionLoading} className="flex-1 py-3 bg-slate-800 text-white font-extrabold rounded-2xl text-sm hover:bg-slate-900 disabled:opacity-60">
                {actionLoading ? "…" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm block ── */}
      {blockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBlockConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4"><ShieldBan size={22} className="text-orange-500" /></div>
            <h3 className="text-lg font-extrabold text-slate-900 text-center mb-1">Bloquer {profile.full_name} ?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Il ne pourra plus voir votre profil ni vous contacter.</p>
            <div className="flex gap-3">
              <button onClick={() => setBlockConfirm(false)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl text-sm hover:bg-slate-50">Annuler</button>
              <button onClick={blockUser} disabled={actionLoading} className="flex-1 py-3 bg-orange-500 text-white font-extrabold rounded-2xl text-sm hover:bg-orange-600 disabled:opacity-60">
                {actionLoading ? "…" : "Bloquer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Report modal ── */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!reportSent) setReportOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {reportSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><Check size={24} className="text-emerald-500" /></div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Signalement envoyé</h3>
                <p className="text-sm text-slate-500 mb-5">Notre équipe examinera ce profil dans les plus brefs délais.</p>
                <button onClick={() => { setReportOpen(false); setReportSent(false); setReportReason(""); }}
                  className="w-full py-3 bg-primary text-white font-extrabold rounded-2xl text-sm hover:bg-primary/90">Fermer</button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><Flag size={22} className="text-red-500" /></div>
                <h3 className="text-lg font-extrabold text-slate-900 text-center mb-1">Signaler ce profil</h3>
                <p className="text-sm text-slate-500 text-center mb-5">Choisissez un motif de signalement</p>
                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map((r) => (
                    <button key={r} onClick={() => setReportReason(r)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${reportReason === r ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setReportOpen(false)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl text-sm hover:bg-slate-50">Annuler</button>
                  <button onClick={reportUser} disabled={!reportReason || actionLoading}
                    className="flex-1 py-3 bg-red-500 text-white font-extrabold rounded-2xl text-sm hover:bg-red-600 disabled:opacity-50">
                    {actionLoading ? "Envoi…" : "Signaler"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Publication detail modal ── */}
      {selectedPub && (() => {
        const isExp = selectedPub.type === "experience";
        const officialImgs = selectedPub.images?.filter((s) => s.startsWith("http")) ?? [];
        const communityItems = selectedPub.type === "place" ? (topPhotos[selectedPub.id]?.items ?? []) : [];
        const topDesc = selectedPub.type === "place" ? topDescs[selectedPub.id] : null;
        const authorInitM = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        const getProfilePath = (uid: string, role: string) => {
          if (role === "guide") return `/profile/guide/${uid}`;
          if (role === "project_owner") return `/profile/project-owner/${uid}`;
          return `/profile/ecovoyageur/${uid}`;
        };
        type Slide = { url: string; tag: "officiel" | "communauté"; authorPhoto?: string | null; authorName?: string; authorUserId?: string; authorRole?: string };
        const slides: Slide[] = [
          ...officialImgs.map((url) => ({ url, tag: "officiel" as const })),
          ...communityItems.map((item) => ({ url: item.url, tag: "communauté" as const, authorPhoto: item.author.photo, authorName: item.author.full_name, authorUserId: item.author.user_id, authorRole: item.author.role })),
        ];
        const safeIdx = Math.min(sliderIdx, Math.max(slides.length - 1, 0));
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPub(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {slides.length > 0 ? (
                <div className="relative h-64 shrink-0 overflow-hidden rounded-t-3xl bg-slate-900">
                  <div className="absolute inset-0 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url('${slides[safeIdx].url}')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {slides[safeIdx].tag === "officiel" ? (
                    <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wide bg-white/90 text-slate-700 px-2.5 py-1 rounded-full shadow border border-white/40">Officiel</span>
                  ) : (
                    <>
                      <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wide bg-emerald-500/90 text-white px-2.5 py-1 rounded-full shadow">Communauté</span>
                      {slides[safeIdx].authorName && (
                        <button type="button"
                          onClick={() => slides[safeIdx].authorUserId && slides[safeIdx].authorRole && router.push(getProfilePath(slides[safeIdx].authorUserId!, slides[safeIdx].authorRole!))}
                          className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full hover:bg-black/60 transition-colors cursor-pointer">
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/60 bg-emerald-100 shrink-0 flex items-center justify-center">
                            {slides[safeIdx].authorPhoto ? <img src={slides[safeIdx].authorPhoto!} alt="" className="w-full h-full object-cover" /> : <span className="text-[7px] font-black text-emerald-700">{authorInitM(slides[safeIdx].authorName ?? "")}</span>}
                          </div>
                          <span className="text-[10px] font-bold text-white">{slides[safeIdx].authorName}</span>
                        </button>
                      )}
                    </>
                  )}
                  {slides.length > 1 && (
                    <>
                      <button onClick={() => setSliderIdx((i) => (i - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"><ChevronLeft size={18} /></button>
                      <button onClick={() => setSliderIdx((i) => (i + 1) % slides.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"><ChevronRight size={18} /></button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {slides.map((_, i) => <button key={i} onClick={() => setSliderIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === safeIdx ? "bg-white scale-125" : "bg-white/50"}`} />)}
                      </div>
                    </>
                  )}
                  <button onClick={() => setSelectedPub(null)} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"><X size={16} /></button>
                </div>
              ) : (
                <div className={`relative h-28 shrink-0 rounded-t-3xl flex items-center justify-center ${isExp ? "bg-gradient-to-br from-teal-500 to-emerald-400" : "bg-gradient-to-br from-blue-500 to-cyan-400"}`}>
                  <span className="material-symbols-outlined text-white/40" style={{ fontSize: 56 }}>{isExp ? "hiking" : "location_on"}</span>
                  <button onClick={() => setSelectedPub(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50"><X size={16} /></button>
                </div>
              )}
              <div className="px-6 py-5 space-y-4">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl ${isExp ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                  {isExp ? "Expérience" : "Lieu recommandé"}
                </span>
                <h2 className="text-xl font-extrabold text-slate-800 leading-snug">{selectedPub.title}</h2>
                {(selectedPub.place_name || selectedPub.region) && (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                    <MapPin size={14} className="text-primary shrink-0" />
                    {[selectedPub.place_name, selectedPub.region].filter(Boolean).join(" — ")}
                  </div>
                )}
                <PubMap lat={selectedPub.latitude ?? null} lng={selectedPub.longitude ?? null}
                  address={isExp ? (selectedPub.region ?? selectedPub.place_name ?? "") : [selectedPub.place_name, selectedPub.region].filter(Boolean).join(", ")}
                />
                {selectedPub.description && (
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{isExp ? "Récit" : "Description"}</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedPub.description}</p>
                  </div>
                )}
                {topDesc && (
                  <div className="border border-emerald-100 rounded-2xl p-4 bg-emerald-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <button type="button" onClick={() => router.push(getProfilePath(topDesc.author.user_id, topDesc.author.role))} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-sm bg-emerald-100 shrink-0 flex items-center justify-center">
                          {topDesc.author.photo ? <img src={topDesc.author.photo} alt="" className="w-full h-full object-cover" /> : <span className="text-[7px] font-black text-emerald-700">{authorInitM(topDesc.author.full_name)}</span>}
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700">{topDesc.author.full_name}</span>
                      </button>
                      <span className="ml-auto text-[9px] font-black uppercase tracking-wide bg-emerald-500 text-white px-2 py-0.5 rounded-full">Communauté</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{topDesc.content}</p>
                  </div>
                )}
                <p className="text-[11px] text-slate-400 font-medium">Publié le {formatDate(selectedPub.created_at)}</p>
              </div>
            </div>
          </div>
        );
      })()}

    </div>

    {/* Friends Modal */}
    {showFriendsModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFriendsModal(false)} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <p className="text-sm font-extrabold text-slate-800">
              👥 Amis de {profile?.full_name?.split(" ")[0]}
              <span className="ml-2 text-slate-400 font-bold text-xs">({theirFriends.length})</span>
            </p>
            <button onClick={() => setShowFriendsModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto p-3 space-y-1">
            {theirFriends.map((f) => {
              const isCommon = myFriendIds.has(f.user_id) && f.user_id !== viewerId;
              const dest = f.user_id === viewerId ? "/profile/ecovoyageur" : `/profile/ecovoyageur/${f.user_id}`;
              return (
                <button key={f.user_id} onClick={() => { setShowFriendsModal(false); router.push(dest); }}
                  className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-3 py-2 transition-colors text-left">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {f.photo ? <img src={f.photo} alt={f.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                  </div>
                  <p className="text-sm font-extrabold text-slate-800 truncate flex-1">{f.full_name ?? "—"}</p>
                  {isCommon && <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">En commun</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
