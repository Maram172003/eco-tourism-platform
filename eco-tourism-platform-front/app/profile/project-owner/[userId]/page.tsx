"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Globe, Building2, UserPlus, UserMinus,
  Leaf, MoreVertical, Flag, Check, Clock, Phone, ExternalLink,
  X, ChevronLeft, ChevronRight, Users, Tag, ShieldBan, Send, ArrowRight, Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" /> });

function LocMap({ lat, lng, address }: { lat: number | null; lng: number | null; address: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(lat && lng ? { lat: Number(lat), lng: Number(lng) } : null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (coords || !address.trim()) return;
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=fr`)
      .then((r) => r.json()).then((d) => { if (d.length) setCoords({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) }); })
      .catch(() => {}).finally(() => setLoading(false));
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
import { apiFetch } from "@/lib/api";
import PubInteractions from "@/components/PubInteractions";
import SustainabilityBadge from "@/components/common/SustainabilityBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

type OwnerProfile = {
  user_id: string;
  full_name: string;
  bio: string | null;
  photo: string | null;
  cover_photo: string | null;
  organization: string | null;
  position: string | null;
  country: string | null;
  sustainability_score: number | null;
  projects: Project[];
  offers: Offer[];
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
  eco_labels: string[] | null;
  services: string[] | null;
  opening_hours: string | null;
  phone: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  sustainability_score: number | null;
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
  inclusions: string | null;
  meeting_point: string | null;
  meeting_lat: number | null;
  meeting_lng: number | null;
  min_group_size: number | null;
  max_group_size: number | null;
  cancellation_policy: string | null;
  sustainability_score: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France", OTHER: "Autre",
};

const OFFER_TYPE_LABELS: Record<string, string> = {
  sejour: "Séjour", circuit: "Circuit", activite: "Activité",
  restauration: "Restauration", hebergement: "Hébergement", autre: "Autre",
};

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

function getSustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Projet Ambassadeur Éco Voyage", color: "text-primary",     emoji: "⭐" };
  if (score >= 71) return { label: "Projet Éco-Responsable",        color: "text-emerald-600", emoji: "🌿" };
  if (score >= 51) return { label: "Projet Engagé",                 color: "text-teal-600",    emoji: "🤝" };
  if (score >= 31) return { label: "Projet Sensibilisé",            color: "text-blue-600",    emoji: "💡" };
  return              { label: "Projet Conventionnel",               color: "text-slate-500",   emoji: "📋" };
}

function getOfferSustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Offre Ambassadrice Éco Voyage", color: "text-primary",      emoji: "⭐" };
  if (score >= 71) return { label: "Offre Éco-Responsable",         color: "text-emerald-600", emoji: "🌿" };
  if (score >= 51) return { label: "Offre Engagée",                 color: "text-teal-600",    emoji: "🤝" };
  if (score >= 31) return { label: "Offre Sensibilisée",            color: "text-blue-600",    emoji: "💡" };
  return              { label: "Offre Conventionnelle",              color: "text-slate-500",   emoji: "📋" };
}

const REPORT_REASONS = ["Contenu inapproprié", "Faux profil", "Harcèlement", "Informations trompeuses", "Autre"];

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-primary", bar: "bg-primary" };
  if (score >= 60) return { text: "text-emerald-600", bar: "bg-emerald-500" };
  if (score >= 40) return { text: "text-teal-600", bar: "bg-teal-500" };
  return { text: "text-blue-600", bar: "bg-blue-500" };
}

function scoreLabel(score: number | null) {
  if (score === null) return "Prestataire Éco";
  if (score >= 80) return "Prestataire Ambassadeur";
  if (score >= 60) return "Prestataire Éco-Responsable";
  if (score >= 40) return "Prestataire Engagé";
  return "Prestataire Sensibilisé";
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const cover = project.photos?.[0] ?? project.photo;
  return (
    <div onClick={onClick} className="cursor-pointer hover:opacity-95 transition-opacity">
      {/* Cover image — full width, clipped by outer card's overflow-hidden + rounded-2xl */}
      <div className="relative h-40 bg-gradient-to-br from-emerald-400 to-primary flex items-center justify-center overflow-hidden">
        {cover
          ? <img src={cover} alt={project.name} className="w-full h-full object-cover" />
          : <span className="material-symbols-outlined text-white/30 text-8xl">domain</span>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {project.region && (
          <span className="absolute bottom-2.5 left-3 flex items-center gap-1 text-white text-[11px] font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <MapPin size={10} />{project.region}
          </span>
        )}
      </div>
      {/* Content */}
      <div className="p-4">
        <h3 className="text-sm font-extrabold text-slate-800 leading-snug mb-1">{project.name}</h3>
        {project.description && <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{project.description}</p>}
        {project.project_type?.length ? (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.project_type.map((t) => (
              <span key={t} className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {PROJECT_TYPE_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        ) : null}
        {project.sustainability_score !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Durabilité</span>
              <span className="text-xs font-black text-primary">{project.sustainability_score}/100</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${project.sustainability_score}%` }} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">
              {getSustainabilityLevel(project.sustainability_score).emoji} {getSustainabilityLevel(project.sustainability_score).label}
            </p>
          </div>
        )}
        <div className="border-t border-slate-50 pt-3">
          <span className="text-primary font-extrabold text-xs inline-flex items-center gap-1">
            Voir les détails <ArrowRight size={14} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── OfferCard ────────────────────────────────────────────────────────────────

function OfferCard({ offer, onClick }: { offer: Offer; onClick: () => void }) {
  const coverImg = offer.images?.[0];
  const typeData = OFFER_TYPES.find((t) => t.value === offer.offer_type)
    ?? { label: OFFER_TYPE_LABELS[offer.offer_type ?? ""] ?? "Offre", icon: "category", gradient: "from-slate-400 to-slate-500" };
  return (
    <div onClick={onClick} className="flex flex-col lg:flex-row cursor-pointer">
      <div className="lg:w-2/5 relative min-h-[200px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
        {coverImg ? (
          <img src={coverImg} alt={offer.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${typeData.gradient} opacity-90`} />
            <span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 100 }}>{typeData.icon}</span>
          </>
        )}
        {offer.price !== null && (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl shadow border border-slate-100 text-right">
            <span className="text-primary font-extrabold text-lg tracking-tight">{offer.price} DT</span>
            {offer.duration && <span className="text-slate-400 text-[10px] font-bold block leading-none">/{offer.duration}</span>}
          </div>
        )}
      </div>
      <div className="lg:w-3/5 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-tight mb-2">{offer.title}</h3>
          {offer.description && <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">{offer.description}</p>}
          <div className="flex flex-wrap gap-2.5 mb-4">
            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-xl px-3 py-1 text-[11px] font-extrabold tracking-wider flex items-center gap-1 uppercase">
              <Sparkles size={11} className="text-emerald-500 shrink-0" />{typeData.label}
            </span>
            {offer.region && (
              <span className="bg-slate-50 text-slate-500 border border-slate-100 rounded-xl px-3 py-1 text-[11px] font-bold flex items-center gap-1">
                <MapPin size={10} className="text-primary" />{offer.region}
              </span>
            )}
          </div>
          <SustainabilityBadge score={offer.sustainability_score} kind="offer" className="mb-1" />
        </div>
        <div className="flex items-center justify-end border-t border-slate-50 pt-4 mt-3">
          <span className="text-primary font-extrabold text-xs inline-flex items-center gap-1">
            Voir les détails <ArrowRight size={14} strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PublicOwnerProfile() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [userRole, setUserRole] = useState("");
  const [tab, setTab] = useState<"projects" | "offers">("projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);

  const [following, setFollowing] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [blockDone, setBlockDone] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  type SocialUser = { user_id: string; full_name: string | null; photo: string | null; _type?: string; sub?: string | null };
  const [theirFollowers, setTheirFollowers] = useState<SocialUser[]>([]);
  const [myConnectionIds, setMyConnectionIds] = useState<Set<string>>(new Set());
  const [viewerId, setViewerId] = useState("");

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") || "";
    if (!tkn) { router.push("/auth/login"); return; }
    setToken(tkn);
    let role = "";
    try { const payload = JSON.parse(atob(tkn.split(".")[1])); role = payload.role ?? ""; setUserRole(role); } catch { setUserRole(""); }

    Promise.all([
      apiFetch<OwnerProfile>(`/project-owner/public/${userId}`),
      apiFetch<{ following: boolean; followId: string | null }>(`/follows/status/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => ({ following: false, followId: null })),
    ]).then(([p, status]) => {
      setProfile(p);
      setFollowing(status.following);
      setFollowId(status.followId);
    }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));

    let vid = "";
    try { vid = JSON.parse(atob(tkn.split(".")[1])).sub ?? ""; } catch {}
    setViewerId(vid);
    apiFetch<SocialUser[]>(`/follows/followers/public/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } })
      .then(setTheirFollowers).catch(() => {});
    if (role === "eco_traveler") {
      apiFetch<SocialUser[]>("/eco-traveler/friends", { headers: { Authorization: `Bearer ${tkn}` } })
        .then((list) => setMyConnectionIds(new Set(list.map((f) => f.user_id)))).catch(() => {});
    } else {
      apiFetch<SocialUser[]>("/follows/followers/profiles", { headers: { Authorization: `Bearer ${tkn}` } })
        .then((list) => setMyConnectionIds(new Set(list.map((f) => f.user_id)))).catch(() => {});
    }
  }, [userId]);

  // Scroll + highlight offer or project from shared link
  const offerRefs   = useRef<Record<string, HTMLDivElement | null>>({});
  const projectRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightedOfferId   = searchParams.get("offer");
  const highlightedProjectId = searchParams.get("project");
  useEffect(() => {
    if (!profile) return;
    if (highlightedOfferId) {
      setTab("offers");
      setTimeout(() => {
        const el = offerRefs.current[highlightedOfferId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    } else if (highlightedProjectId) {
      setTab("projects");
      setTimeout(() => {
        const el = projectRefs.current[highlightedProjectId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [highlightedOfferId, highlightedProjectId, profile]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const canFollow = userRole === "eco_traveler" || userRole === "guide";

  async function toggleFollow() {
    if (!token || !canFollow) return;
    setFollowLoading(true);
    try {
      if (following && followId) {
        await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setFollowing(false); setFollowId(null);
      } else {
        const f = await apiFetch<{ id: string }>(`/follows/${userId}/project`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        setFollowing(true); setFollowId(f.id);
      }
    } finally { setFollowLoading(false); }
  }

  function handleContact() {
    const name = encodeURIComponent(profile?.full_name ?? "");
    router.push(`/messagerie?recipient=${userId}&name=${name}&role=project_owner`);
  }

  async function blockUser() {
    if (!token) return;
    try {
      if (following && followId) await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await apiFetch(`/eco-traveler/block/${userId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setFollowing(false); setFollowId(null); setBlockDone(true); setMenuOpen(false);
    } catch {}
  }

  async function reportUser() {
    if (!token || !reportReason) return;
    await apiFetch(`/reports`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ reported_id: userId, reason: reportReason }) }).catch(() => {});
    setReportSent(true);
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  if (error || !profile) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-slate-500 font-semibold">Profil introuvable.</p>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"><ArrowLeft size={14} /> Retour</button>
    </div>
  );

  const sc = profile.sustainability_score !== null ? scoreColor(profile.sustainability_score) : null;

  return (
    <>
    <div className="min-h-screen bg-slate-100 pb-16">

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <span className="font-extrabold text-slate-900 text-base truncate max-w-[200px]">{profile.full_name}</span>
        <div className="w-9 h-9" />
      </div>

      {/* Cover */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-blue-200 via-cyan-100 to-slate-200 overflow-hidden">
        {profile.cover_photo && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${profile.cover_photo}')` }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col items-center px-6 pb-6 pt-2">
                <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-blue-100 to-cyan-50 flex items-center justify-center mb-4">
                  {profile.photo ? <img src={profile.photo} alt={profile.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 56 }}>business</span>}
                </div>

                <h1 className="text-xl font-black text-slate-900 text-center">{profile.full_name}</h1>
                {profile.organization && (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mt-0.5">
                    <Building2 size={14} />{profile.organization}
                  </div>
                )}
                {profile.position && <p className="text-xs text-slate-400 font-medium mt-0.5">{profile.position}</p>}

                {profile.bio && <p className="text-sm text-slate-500 leading-relaxed mt-3 text-center">{profile.bio}</p>}

                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {profile.country && <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Globe size={13} className="text-primary" />{COUNTRY_LABELS[profile.country] ?? profile.country}</span>}
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Leaf size={13} className="text-primary" />{profile.projects.length} projet{profile.projects.length !== 1 ? "s" : ""}</span>
                </div>

                {canFollow && (
                  <div className="mt-5 w-full flex items-center gap-2">
                    <button onClick={toggleFollow} disabled={followLoading}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 font-extrabold rounded-2xl text-sm transition-all disabled:opacity-60 ${following ? "border-2 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500" : "bg-primary text-slate-900 hover:bg-primary/90 active:scale-95 shadow-sm"}`}>
                      {following ? <><UserMinus size={15} /> Abonné</> : <><UserPlus size={15} /> Suivre</>}
                    </button>
                    <div className="relative" ref={menuRef}>
                      <button onClick={() => setMenuOpen((v) => !v)}
                        className="w-11 h-11 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors">
                        <MoreVertical size={17} />
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 py-1" style={{ top: "3rem" }}>
                          {following && (
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
                {/* Contacter — éco-voyageurs et guides peuvent contacter un propriétaire */}
                {(userRole === "eco_traveler" || userRole === "guide") && (
                  <button onClick={handleContact} 
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-primary text-slate-900 font-extrabold rounded-2xl text-sm hover:bg-primary/90 active:scale-95 transition-all shadow-sm disabled:opacity-60">
                    <Send size={15} /> Contacter
                  </button>
                )}
              </div>
            </div>

            {/* Score */}
            {profile.sustainability_score !== null && sc && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">🌿 Score de durabilité</p>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-4xl font-black ${sc.text}`}>{profile.sustainability_score}</span>
                  <span className="text-slate-400 font-bold text-base mb-1">/100</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${sc.bar} rounded-full`} style={{ width: `${profile.sustainability_score}%` }} />
                </div>
                <span className={`text-xs font-bold ${sc.text}`}>{scoreLabel(profile.sustainability_score)}</span>
              </div>
            )}

            {/* Followers + en commun */}
            {theirFollowers.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  👥 Followers de {profile.full_name.split(" ")[0]}
                </p>
                <div className="space-y-2.5">
                  {theirFollowers.slice(0, 3).map((f) => {
                    const isCommon = myConnectionIds.has(f.user_id) && f.user_id !== viewerId;
                    const ownPath = f._type === "guide" ? "/profile/guide" : f._type === "project" ? "/profile/project-owner" : "/profile/ecovoyageur";
                    const pubPath = f._type === "guide" ? `/profile/guide/${f.user_id}` : f._type === "project" ? `/profile/project-owner/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                    const path = f.user_id === viewerId ? ownPath : pubPath;
                    return (
                      <button key={f.user_id} onClick={() => router.push(path)}
                        className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-1.5 transition-colors text-left">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {f.photo ? <img src={f.photo} alt={f.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                        </div>
                        <p className="text-sm font-extrabold text-slate-800 truncate flex-1">{f.full_name ?? "—"}</p>
                        {isCommon && (
                          <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">En commun</span>
                        )}
                      </button>
                    );
                  })}
                  {theirFollowers.length > 3 && (
                    <button onClick={() => setShowFollowersModal(true)}
                      className="mt-3 w-full text-xs font-bold text-primary hover:underline text-center">
                      Voir tout ({theirFollowers.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-base font-extrabold text-slate-800">Contenu</h2>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button onClick={() => setTab("projects")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "projects" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    Projets ({profile.projects.length})
                  </button>
                  <button onClick={() => setTab("offers")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "offers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    Offres ({profile.offers.length})
                  </button>
                </div>
              </div>

              {tab === "projects" && (
                profile.projects.length === 0
                  ? <div className="py-16 text-center"><Building2 size={40} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-400 font-semibold text-sm">Aucun projet actif.</p></div>
                  : <div className="p-4 space-y-4">
                      {profile.projects.map((p) => (
                        <div key={p.id} ref={(el) => { projectRefs.current[p.id] = el; }}
                          className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${highlightedProjectId === p.id ? "border-primary ring-2 ring-primary ring-offset-2 bg-primary/5" : "border-slate-100"}`}>
                          <ProjectCard project={p} onClick={() => { setSelectedProject(p); setSliderIdx(0); }} />
                          <PubInteractions
                            pubId={p.id}
                            token={token}
                            viewerId={viewerId}
                            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/project-owner/${userId}?project=${p.id}`}
                            pubTitle={p.name}
                            itemApiBase="/interactions/project"
                            commentApiBase="/interactions"
                          />
                        </div>
                      ))}
                    </div>
              )}
              {tab === "offers" && (
                profile.offers.length === 0
                  ? <div className="py-16 text-center"><Leaf size={40} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-400 font-semibold text-sm">Aucune offre publiée.</p></div>
                  : <div className="p-4 space-y-4">
                      {profile.offers.map((o) => (
                        <div key={o.id} ref={(el) => { offerRefs.current[o.id] = el; }}
                          className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${highlightedOfferId === o.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-slate-100"}`}>
                          <OfferCard offer={o} onClick={() => { setSelectedOffer(o); setSliderIdx(0); }} />
                          <PubInteractions
                            pubId={o.id}
                            token={token}
                            viewerId={viewerId}
                            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/project-owner/${userId}?offer=${o.id}`}
                            pubTitle={o.title}
                            itemApiBase="/interactions/offer"
                            commentApiBase="/interactions"
                          />
                        </div>
                      ))}
                    </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!reportSent) setReportOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {reportSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><Check size={24} className="text-emerald-500" /></div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Signalement envoyé</h3>
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

      {/* Project detail modal */}
      {selectedProject && (() => {
        const imgs = (selectedProject.photos?.length ? selectedProject.photos : selectedProject.photo ? [selectedProject.photo] : []).filter((s) => s.startsWith("http"));
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {imgs.length > 0 ? (
                <div className="relative h-60 overflow-hidden rounded-t-3xl bg-slate-900">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${imgs[sliderIdx]}')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {imgs.length > 1 && <>
                    <button onClick={() => setSliderIdx((i) => (i - 1 + imgs.length) % imgs.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><ChevronLeft size={18} /></button>
                    <button onClick={() => setSliderIdx((i) => (i + 1) % imgs.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><ChevronRight size={18} /></button>
                  </>}
                  <button onClick={() => setSelectedProject(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><X size={16} /></button>
                </div>
              ) : (
                <div className="relative h-24 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-t-3xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/40" style={{ fontSize: 56 }}>domain</span>
                  <button onClick={() => setSelectedProject(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></button>
                </div>
              )}
              <div className="px-6 py-5 space-y-4">
                {selectedProject.eco_labels?.length ? (
                  <div className="flex flex-wrap gap-1.5">{selectedProject.eco_labels.map((l) => <span key={l} className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-full"><Leaf size={10} />{l}</span>)}</div>
                ) : null}
                <h2 className="text-xl font-extrabold text-slate-800">{selectedProject.name}</h2>
                {selectedProject.project_type?.length ? (
                  <div className="flex flex-wrap gap-1.5">{selectedProject.project_type.map((t) => <span key={t} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full capitalize">{t}</span>)}</div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {selectedProject.region && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin size={13} className="text-primary" />{selectedProject.region}</span>}
                  {selectedProject.address && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><Building2 size={13} className="text-primary" />{selectedProject.address}</span>}
                  {selectedProject.opening_hours && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><Clock size={13} />{selectedProject.opening_hours}</span>}
                </div>
                {(selectedProject.lat || selectedProject.address || selectedProject.region) && (
                  <LocMap lat={selectedProject.lat ?? null} lng={selectedProject.lng ?? null} address={[selectedProject.address, selectedProject.region].filter(Boolean).join(", ")} />
                )}
                {selectedProject.description && <div><p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">À propos</p><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedProject.description}</p></div>}
                {selectedProject.services?.length ? (
                  <div><p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Services</p><div className="flex flex-wrap gap-1.5">{selectedProject.services.map((s) => <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-full"><Tag size={10} className="text-primary" />{s}</span>)}</div></div>
                ) : null}
                {selectedProject.phone && <a href={`tel:${selectedProject.phone}`} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary"><Phone size={13} />{selectedProject.phone}</a>}
                {selectedProject.website && <a href={selectedProject.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ExternalLink size={13} />Site web</a>}
                {selectedProject.sustainability_score !== null && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">🌿 Durabilité</span><span className="text-sm font-black text-primary">{selectedProject.sustainability_score}/100</span></div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${selectedProject.sustainability_score}%` }} /></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Offer detail modal */}
      {selectedOffer && (() => {
        const imgs = selectedOffer.images?.filter((s) => s.startsWith("http")) ?? [];
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedOffer(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {imgs.length > 0 ? (
                <div className="relative h-60 overflow-hidden rounded-t-3xl bg-slate-900">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${imgs[sliderIdx]}')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {imgs.length > 1 && <>
                    <button onClick={() => setSliderIdx((i) => (i - 1 + imgs.length) % imgs.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><ChevronLeft size={18} /></button>
                    <button onClick={() => setSliderIdx((i) => (i + 1) % imgs.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><ChevronRight size={18} /></button>
                  </>}
                  <button onClick={() => setSelectedOffer(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><X size={16} /></button>
                </div>
              ) : (
                <div className="relative h-24 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-t-3xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/40" style={{ fontSize: 56 }}>storefront</span>
                  <button onClick={() => setSelectedOffer(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></button>
                </div>
              )}
              <div className="px-6 py-5 space-y-4">
                {selectedOffer.offer_type && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">{OFFER_TYPE_LABELS[selectedOffer.offer_type] ?? selectedOffer.offer_type}</span>}
                <h2 className="text-xl font-extrabold text-slate-800">{selectedOffer.title}</h2>
                <div className="flex flex-wrap gap-3">
                  {selectedOffer.price !== null && <span className="text-sm font-black text-primary">💰 {selectedOffer.price} DT</span>}
                  {selectedOffer.duration && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><Clock size={13} />{selectedOffer.duration}</span>}
                  {selectedOffer.region && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin size={13} className="text-primary" />{selectedOffer.region}</span>}
                  {(selectedOffer.min_group_size || selectedOffer.max_group_size) && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><Users size={13} className="text-primary" />{selectedOffer.min_group_size ?? 1}–{selectedOffer.max_group_size ?? "∞"} pers.</span>}
                </div>
                {selectedOffer.description && <div><p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Description</p><p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedOffer.description}</p></div>}
                {selectedOffer.inclusions && <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[11px] font-black uppercase tracking-widest text-emerald-700 mb-1.5">✅ Inclusions</p><p className="text-sm text-slate-700 leading-relaxed">{selectedOffer.inclusions}</p></div>}
                {selectedOffer.meeting_point && (
                  <div>
                    <div className="flex items-center gap-2 mb-1"><MapPin size={13} className="text-slate-400" /><p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Localisation</p></div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">{selectedOffer.meeting_point}</p>
                    <LocMap lat={selectedOffer.meeting_lat} lng={selectedOffer.meeting_lng} address={selectedOffer.meeting_point} />
                  </div>
                )}
                {selectedOffer.cancellation_policy && <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100"><p className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-1.5">Politique d'annulation</p><p className="text-sm text-slate-700">{selectedOffer.cancellation_policy}</p></div>}
                {selectedOffer.sustainability_score !== null && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">🌿 Durabilité</span><span className="text-sm font-black text-primary">{selectedOffer.sustainability_score}/100</span></div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${selectedOffer.sustainability_score}%` }} /></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFollowersModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <p className="text-sm font-extrabold text-slate-800">
                👥 Followers de {profile?.full_name?.split(" ")[0]}
                <span className="ml-2 text-slate-400 font-bold text-xs">({theirFollowers.length})</span>
              </p>
              <button onClick={() => setShowFollowersModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1">
              {theirFollowers.map((f) => {
                const isCommon = myConnectionIds.has(f.user_id) && f.user_id !== viewerId;
                const ownPath = f._type === "guide" ? "/profile/guide" : f._type === "project" ? "/profile/project-owner" : "/profile/ecovoyageur";
                const pubPath = f._type === "guide" ? `/profile/guide/${f.user_id}` : f._type === "project" ? `/profile/project-owner/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                const path = f.user_id === viewerId ? ownPath : pubPath;
                return (
                  <button key={f.user_id} onClick={() => { setShowFollowersModal(false); router.push(path); }}
                    className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-3 py-2 transition-colors text-left">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {f.photo ? <img src={f.photo} alt={f.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 truncate flex-1">{f.full_name ?? "—"}</p>
                    {isCommon && (
                      <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">En commun</span>
                    )}
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
