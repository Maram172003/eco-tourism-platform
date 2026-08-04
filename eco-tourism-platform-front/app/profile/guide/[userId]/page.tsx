"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Globe, Star, UserPlus, UserMinus,
  Clock, Leaf, MoreVertical, Flag, X, Check, ChevronLeft, ChevronRight, Users, ShieldCheck, ShieldBan, Send, ArrowRight, Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" /> });

function OfferMap({ lat, lng, fallbackLat, fallbackLng, address }: { lat: number | null; lng: number | null; fallbackLat?: number|null; fallbackLng?: number|null; address: string }) {
  const initLat = lat ?? fallbackLat ?? null;
  const initLng = lng ?? fallbackLng ?? null;
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initLat && initLng ? { lat: Number(initLat), lng: Number(initLng) } : null
  );
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (coords || !address.trim()) return;
    setLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=fr`)
      .then((r) => r.json()).then((d) => { if (d.length) setCoords({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) }); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [address]);
  if (loading) return <div className="h-[220px] rounded-2xl bg-slate-100 animate-pulse" />;
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

function LieuxMap({ lieux }: { lieux: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [cssReady, setCssReady] = useState(false);
  const [points, setPoints] = useState<Array<{ lat: number; lng: number; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!lieux.length) { setLoading(false); return; }
    let cancelled = false;
    const geo = async (q: string) => {
      const r = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
      const d = await r.json();
      return Array.isArray(d) && d.length ? { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) } : null;
    };
    const delay = () => new Promise<void>(r => setTimeout(r, 1100));
    (async () => {
      const pts: Array<{ lat: number; lng: number; label: string }> = [];
      for (let i = 0; i < lieux.length; i++) {
        if (i > 0) await delay();
        if (cancelled) break;
        try {
          let found = await geo(lieux[i]);
          if (!found) { await delay(); found = await geo(`${lieux[i]} Tunisie`); }
          if (!found) { const short = lieux[i].split(' ').slice(-2).join(' '); await delay(); found = await geo(`${short} Tunisie`); }
          if (!found) { const last = lieux[i].split(' ').pop() ?? lieux[i]; await delay(); found = await geo(`${last} Tunisie`); }
          if (found) pts.push({ lat: found.lat, lng: found.lng, label: lieux[i] });
        } catch {}
      }
      if (!cancelled) { setPoints(pts); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [lieux.join(",")]);
  useEffect(() => {
    if (document.querySelector('link[href*="leaflet.css"]')) { setCssReady(true); return; }
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; l.onload = () => setCssReady(true);
    document.head.appendChild(l);
  }, []);
  useEffect(() => {
    if (!cssReady || !containerRef.current || !points.length) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet") as typeof import("leaflet");
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; OpenStreetMap' }).addTo(map);
    const bounds: [number,number][] = [];
    points.forEach((pt, i) => {
      const icon = L.divIcon({ className:"", iconSize:[24,24], iconAnchor:[12,12],
        html:`<div style="width:24px;height:24px;background:var(--color-primary,#10b981);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)">${i+1}</div>` });
      L.marker([pt.lat,pt.lng],{icon}).addTo(map).bindPopup(`<b>${i+1}.</b> ${pt.label}`);
      bounds.push([pt.lat,pt.lng]);
    });
    if (bounds.length===1) map.setView(bounds[0],13); else map.fitBounds(bounds,{padding:[24,24],maxZoom:13});
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [cssReady, points]);
  if (loading) return <div className="h-[180px] rounded-2xl bg-slate-100 animate-pulse"/>;
  if (!points.length) return null;
  return <div ref={containerRef} style={{height:180,borderRadius:"1rem",overflow:"hidden"}} className={cssReady?"":"bg-slate-100 animate-pulse"}/>;
}
import { apiFetch } from "@/lib/api";
import PubInteractions from "@/components/PubInteractions";
import { DOMAIN_CASCADE_CONFIG } from "@/lib/domainCascadeConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type GuideProfile = {
  user_id: string;
  full_name: string;
  guide_type: string | null;
  bio: string | null;
  photo: string | null;
  cover_photo: string | null;
  country: string | null;
  zone: string | null;
  ville_residence: string | null;
  specialties: string[] | null;
  domaines: string[] | null;
  expertises: string[] | null;
  languages_spoken: string[] | null;
  years_experience: number | null;
  sustainability_score: number | null;
  zones_couvertes: string[] | null;
  villes_couvertes: string[] | null;
  sites_maitrises: string[] | null;
  deplacement_possible: boolean | null;
  publics_accueillis: string[] | null;
  experience_pro: string | null;
  centres_interet: string | null;
  pourquoi_moi: string | null;
  offers: Offer[];
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
  min_age: number | null;
  cancellation_policy: string | null;
  sustainability_score: number | null;
  details: Record<string, any> | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France",
  DE: "Allemagne", IT: "Italie", ES: "Espagne", GB: "Royaume-Uni", OTHER: "Autre",
};

const GUIDE_TYPE_LABELS: Record<string, string> = {
  local: "Guide local", adventure: "Guide aventure", cultural: "Guide culturel",
  eco: "Guide éco", nature: "Guide nature", urban: "Guide urbain",
};

const OFFER_TYPE_LABELS: Record<string, string> = {
  eco_tour: "Éco-Tour", activity: "Activité", workshop: "Atelier",
  transfer: "Transfert", sejour: "Séjour", circuit: "Circuit",
  activite: "Activité", restauration: "Restauration", hebergement: "Hébergement", autre: "Autre",
};

const OFFER_TYPES = [
  { value: "eco_tour",  label: "Éco-Tour",  icon: "hiking",         gradient: "from-emerald-500 to-teal-400" },
  { value: "activity",  label: "Activité",  icon: "sports",         gradient: "from-orange-500 to-amber-400" },
  { value: "workshop",  label: "Atelier",   icon: "school",         gradient: "from-violet-500 to-purple-400" },
  { value: "transfer",  label: "Transfert", icon: "directions_car", gradient: "from-blue-500 to-cyan-400" },
  { value: "sejour",    label: "Séjour",    icon: "hotel",          gradient: "from-blue-500 to-cyan-400" },
  { value: "circuit",   label: "Circuit",   icon: "route",          gradient: "from-indigo-500 to-blue-400" },
  { value: "autre",     label: "Autre",     icon: "category",       gradient: "from-slate-400 to-slate-500" },
];

function getOfferSustainabilityLevel(score: number) {
  if (score >= 86) return { label: "Offre Ambassadrice Éco Voyage", color: "text-primary",      emoji: "⭐" };
  if (score >= 71) return { label: "Offre Éco-Responsable",         color: "text-emerald-600", emoji: "🌿" };
  if (score >= 51) return { label: "Offre Engagée",                 color: "text-teal-600",    emoji: "🤝" };
  if (score >= 31) return { label: "Offre Sensibilisée",            color: "text-secondary",   emoji: "💡" };
  return              { label: "Offre Conventionnelle",              color: "text-slate-500",   emoji: "📋" };
}

const REPORT_REASONS = ["Contenu inapproprié", "Faux profil", "Harcèlement", "Informations trompeuses", "Autre"];

const LANG_LABELS: Record<string, string> = {
  fr: "Français", ar: "Arabe", en: "Anglais", es: "Espagnol", de: "Allemand", it: "Italien",
};

const DOMAINES_META: Record<string, { label: string; icon: string }> = {
  nature_ecotourisme:   { label: "Nature & Écotourisme",       icon: "park" },
  culture_patrimoine:   { label: "Culture & Patrimoine",       icon: "account_balance" },
  historique_archeo:    { label: "Historique & Archéologique", icon: "history_edu" },
  aventure_randonnee:   { label: "Aventure & Randonnée",       icon: "hiking" },
  gastronomie_locale:   { label: "Gastronomie locale",         icon: "restaurant" },
  artisanat_traditions: { label: "Artisanat & Traditions",     icon: "palette" },
  decouverte_urbaine:   { label: "Découverte urbaine",         icon: "location_city" },
  autre:                { label: "Autre",                      icon: "auto_awesome" },
};

const ZONES_META: Record<string, string> = {
  grand_tunis: "Grand Tunis", cap_bon: "Cap Bon", nord_ouest: "Nord-Ouest",
  sahel: "Sahel", centre_ouest: "Centre-Ouest", sfax: "Sfax & Environs",
  djerba_sud_est: "Djerba & Sud-Est", tozeur_sahara: "Tozeur & Sahara",
  tataouine_berbere: "Tataouine & Berbère",
};

const PUBLICS_META: Record<string, { label: string; icon: string }> = {
  familles:     { label: "Familles avec enfants", icon: "family_restroom" },
  scolaires:    { label: "Enfants (scolaires)",   icon: "school" },
  adultes:      { label: "Adultes",               icon: "person" },
  seniors:      { label: "Seniors",               icon: "elderly" },
  pmr:          { label: "PMR",                   icon: "accessible" },
  groupes:      { label: "Groupes de voyageurs",  icon: "group" },
  photographes: { label: "Photographes",          icon: "photo_camera" },
};

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-secondary", bar: "bg-secondary" };
  if (score >= 60) return { text: "text-secondary/80", bar: "bg-secondary/80" };
  if (score >= 40) return { text: "text-secondary/60", bar: "bg-secondary/60" };
  return { text: "text-secondary/40", bar: "bg-secondary/40" };
}

function scoreLabel(score: number | null) {
  if (score === null) return "Guide Éco-Voyage";
  if (score >= 80) return "Guide Ambassadeur";
  if (score >= 60) return "Guide Éco-Responsable";
  if (score >= 40) return "Guide Engagé";
  return "Guide Débutant";
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
          {offer.sustainability_score !== null && (
            <div className="mb-1">
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

export default function PublicGuideProfile() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [userRole, setUserRole] = useState("");

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [blockDone, setBlockDone] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  type SocialUser = { user_id: string; full_name: string | null; photo: string | null; _type?: string; sub?: string | null };
  const [theirFollowers, setTheirFollowers] = useState<SocialUser[]>([]);
  const [myConnectionIds, setMyConnectionIds] = useState<Set<string>>(new Set());
  const [viewerId, setViewerId] = useState("");
  const [showFollowersModal, setShowFollowersModal] = useState(false);

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") || "";
    if (!tkn) { router.push("/auth/login"); return; }
    setToken(tkn);

    let role = "";
    try { const payload = JSON.parse(atob(tkn.split(".")[1])); role = payload.role ?? ""; setUserRole(role); } catch { setUserRole(""); }

    Promise.all([
      apiFetch<GuideProfile>(`/guide/public/${userId}`),
      apiFetch<{ following: boolean; pending: boolean; followId: string | null }>(`/follows/status/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => ({ following: false, pending: false, followId: null })),
    ]).then(([p, status]) => {
      setProfile(p);
      setFollowing(status.following);
      setFollowPending(status.pending);
      setFollowId(status.followId);
    }).catch((e: Error) => setError(e.message)).finally(() => setLoading(false));

    let vid = "";
    try { vid = JSON.parse(atob(tkn.split(".")[1])).sub ?? ""; } catch {}
    setViewerId(vid);
    // Load their followers + my connections for mutual detection
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

  // Scroll + highlight offer from shared link ?offer=xxx
  const offerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightedOfferId = searchParams.get("offer");
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

  const canFollow = ["eco_traveler", "provider", "guide"].includes(userRole) && userId !== viewerId;

  async function toggleFollow() {
    if (!token || !canFollow) return;
    setFollowLoading(true);
    try {
      if (following && followId) {
        await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setFollowing(false); setFollowId(null); setFollowerCount((c) => Math.max(0, c - 1));
      } else if (followPending && followId) {
        await apiFetch(`/follows/${followId}/reject`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setFollowPending(false); setFollowId(null);
      } else {
        const f = await apiFetch<{ id: string }>(`/follows/${userId}/guide`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        setFollowing(true); setFollowId(f.id); setFollowerCount((c) => c + 1);
      }
    } finally { setFollowLoading(false); }
  }

  function handleContact() {
    const name = encodeURIComponent(profile?.full_name ?? "");
    router.push(`/messagerie?recipient=${userId}&name=${name}&role=guide`);
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
        <span className="font-extrabold text-slate-900 text-base">{profile.full_name}</span>
        <div className="w-9 h-9" />
      </div>

      {/* Cover */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-teal-200 via-emerald-100 to-slate-200 overflow-hidden">
        {profile.cover_photo && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${profile.cover_photo}')` }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col items-center px-6 pb-6 pt-2">
                <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-teal-100 to-emerald-50 flex items-center justify-center mb-4">
                  {profile.photo ? <img src={profile.photo} alt={profile.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-teal-600" style={{ fontSize: 56 }}>person</span>}
                </div>

                <h1 className="text-xl font-black text-slate-900 text-center">{profile.full_name}</h1>
                <p className="text-sm font-semibold text-primary mt-0.5 text-center">
                  {profile.guide_type ? (GUIDE_TYPE_LABELS[profile.guide_type] ?? profile.guide_type) : scoreLabel(profile.sustainability_score)}
                </p>

                {profile.bio && <p className="text-sm text-slate-500 leading-relaxed mt-3 text-center">{profile.bio}</p>}

                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {profile.country && <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Globe size={13} className="text-primary" />{COUNTRY_LABELS[profile.country] ?? profile.country}</span>}
                  {profile.zone && <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><MapPin size={13} className="text-primary" />{profile.zone}</span>}
                  {profile.years_experience && <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Star size={13} className="text-primary" />{profile.years_experience} ans d'exp.</span>}
                </div>

                {(profile.specialties?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {profile.specialties!.map((s) => <span key={s} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[11px] font-bold rounded-full">{s}</span>)}
                  </div>
                )}

                {(profile.languages_spoken?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {profile.languages_spoken!.map((l) => <span key={l} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full">{l}</span>)}
                  </div>
                )}

                {/* Follow button + menu */}
                {canFollow && (
                  <div className="mt-5 w-full flex items-center gap-2">
                    <button onClick={toggleFollow} disabled={followLoading}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 font-extrabold rounded-2xl text-sm transition-all disabled:opacity-60
                        ${following ? "border-2 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500"
                          : followPending ? "border-2 border-primary/40 text-primary hover:border-red-300 hover:text-red-500"
                          : "bg-primary text-slate-900 hover:bg-primary/90 active:scale-95 shadow-sm"}`}>
                      {following ? <><UserMinus size={15} /> Abonné</>
                        : followPending ? <><span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" /> En attente</>
                        : <><UserPlus size={15} /> Suivre</>}
                    </button>
                    <div className="relative" ref={menuRef}>
                      <button onClick={() => setMenuOpen((v) => !v)}
                        className="w-11 h-11 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors">
                        <MoreVertical size={17} />
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 top-13 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 py-1" style={{ top: "3rem" }}>
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
                {/* Contacter — éco-voyageurs et project-owners peuvent contacter un guide */}
                {(userRole === "eco_traveler" || userRole === "project") && (
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    👥 Followers de {profile.full_name.split(" ")[0]}
                  </p>
                  <span className="text-[11px] font-black text-slate-400">{theirFollowers.length}</span>
                </div>
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
                </div>
                {theirFollowers.length > 3 && (
                  <button onClick={() => setShowFollowersModal(true)}
                    className="mt-3 w-full text-xs font-bold text-primary hover:underline text-center">
                    Voir tout ({theirFollowers.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: à propos + offers */}
          <div className="lg:col-span-2 space-y-4">

            {/* Domaines + Expertises */}
            {((profile.domaines?.length ?? 0) > 0 || (profile.expertises?.length ?? 0) > 0) && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                {profile.domaines && profile.domaines.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Domaines d'expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.domaines.map((d) => {
                        const m = DOMAINES_META[d];
                        return (
                          <span key={d} className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl px-3 py-1.5 text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">{m?.icon ?? "label"}</span>{m?.label ?? d}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {profile.expertises && profile.expertises.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Expertises</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.expertises.map((e) => (
                        <span key={e} className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-3 py-1.5 text-xs font-bold">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Zone d'activité */}
            {((profile.zones_couvertes?.length ?? 0) > 0 || (profile.villes_couvertes?.length ?? 0) > 0 || (profile.sites_maitrises?.length ?? 0) > 0) && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Zone d'activité</p>
                {profile.zones_couvertes && profile.zones_couvertes.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-400">map</span>Régions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.zones_couvertes.map((z) => (
                        <span key={z} className="bg-secondary/10 text-secondary border border-secondary/20 rounded-xl px-3 py-1.5 text-xs font-bold">{ZONES_META[z] ?? z}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.villes_couvertes && profile.villes_couvertes.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>Villes & lieux
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.villes_couvertes.map((v) => (
                        <span key={v} className="flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold">
                          <span className="material-symbols-outlined text-xs text-slate-400">place</span>{v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.sites_maitrises && profile.sites_maitrises.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-slate-400">landscape</span>Sites maîtrisés
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {profile.sites_maitrises.map((s) => (
                        <span key={s} className="flex items-center gap-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl px-3 py-1.5 text-xs font-bold">
                          <span className="material-symbols-outlined text-xs text-secondary/60">landscape</span>{s}
                        </span>
                      ))}
                    </div>
                    <LieuxMap lieux={profile.sites_maitrises} />
                  </div>
                )}
                {profile.deplacement_possible !== null && (
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-teal-500">directions_car</span>
                    Déplacement hors zone : <span className="font-bold text-slate-700 ml-1">{profile.deplacement_possible ? "Possible" : "Non disponible"}</span>
                  </p>
                )}
              </div>
            )}

            {/* Publics */}
            {profile.publics_accueillis && profile.publics_accueillis.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Publics accueillis</p>
                <div className="flex flex-wrap gap-2">
                  {profile.publics_accueillis.map((p) => {
                    const m = PUBLICS_META[p];
                    return (
                      <span key={p} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl px-3 py-1.5 text-xs font-bold">
                        <span className="material-symbols-outlined text-sm">{m?.icon ?? "group"}</span>{m?.label ?? p}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Textes de présentation complémentaires */}
            {(profile.experience_pro || profile.centres_interet || profile.pourquoi_moi) && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                {profile.experience_pro && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Expérience professionnelle</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.experience_pro}</p>
                  </div>
                )}
                {profile.centres_interet && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Centres d'intérêt</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.centres_interet}</p>
                  </div>
                )}
                {profile.pourquoi_moi && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Pourquoi choisir ce guide ?</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.pourquoi_moi}</p>
                  </div>
                )}
              </div>
            )}

            {/* Langues */}
            {profile.languages_spoken && profile.languages_spoken.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Langues parlées</p>
                <div className="flex flex-wrap gap-2">
                  {profile.languages_spoken.map((l) => (
                    <span key={l} className="bg-sky-50 text-sky-700 border border-sky-100 rounded-xl px-3 py-1.5 text-xs font-bold">{LANG_LABELS[l] ?? l}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-extrabold text-slate-800">Offres</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {profile.offers.length === 0 ? "Aucune offre publiée" : `${profile.offers.length} offre${profile.offers.length > 1 ? "s" : ""}`}
                </p>
              </div>
              {profile.offers.length === 0 ? (
                <div className="py-16 text-center"><Leaf size={40} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-400 font-semibold text-sm">Aucune offre pour l'instant.</p></div>
              ) : (
                <div className="p-4 space-y-4">
                  {profile.offers.map((o) => (
                    <div key={o.id} ref={(el) => { offerRefs.current[o.id] = el; }}
                      className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${highlightedOfferId === o.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-slate-100"}`}>
                      <OfferCard offer={o} onClick={() => { setSelectedOffer(o); setSliderIdx(0); }} />
                      <PubInteractions
                        pubId={o.id}
                        token={token}
                        viewerId={viewerId}
                        shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?offer=${o.id}`}
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

      {/* ══ OFFER DETAIL MODAL — organisé par étapes ══ */}
      {selectedOffer && (() => {
        const o = selectedOffer;
        const d = (o.details ?? {}) as Record<string, any>;
        const imgs = o.images?.filter((s) => s?.startsWith("http") || s?.startsWith("data:")) ?? [];

        const GUIDAGE: Record<string,string> = { guidage_seul:"Guidage seul", avec_transport:"+ Transport", transport_repas:"+ Transport & Repas", immersion:"Immersion complète", sur_mesure:"Sur mesure" };
        const PRESTATION: Record<string,string> = { visite_guidee:"Visite guidée", randonnee:"Randonnée", excursion:"Excursion", atelier:"Atelier", transfert:"Transfert", sur_mesure:"Sur mesure" };
        const ANNUL: Record<string,string> = { flexible:"Flexible", moderate:"Modérée", stricte:"Stricte", non_remboursable:"Non remboursable" };
        const CONF: Record<string,string> = { instant:"Instantanée", manual:"Manuelle", conditional:"Sous conditions" };
        const PUBLIC_ICONS: Record<string,string> = { familles:"family_restroom", adultes:"person", seniors:"elderly", enfants:"child_care", groupes:"groups", photographes:"photo_camera", tous_publics:"diversity_3" };
        const PUBLIC_LABELS: Record<string,string> = { familles:"Familles", adultes:"Adultes", seniors:"Seniors", enfants:"Enfants", groupes:"Groupes", photographes:"Photographes", tous_publics:"Tous publics" };

        const langs: string[] = Array.isArray(d.langue_guidage) ? d.langue_guidage : [];
        const inclus: string[] = Array.isArray(d.inclus_resume) ? d.inclus_resume : (o.inclusions ? o.inclusions.split("||") : []);
        const pointsForts: string[] = Array.isArray(d.points_forts) ? d.points_forts : [];
        const lieux: string[] = Array.isArray(d.lieux_visites) ? d.lieux_visites : [];
        const expertises: string[] = Array.isArray(d.expertises_offre) ? d.expertises_offre : [];
        const publicRec: string[] = Array.isArray(d.public_recommande) ? d.public_recommande : [];
        const domDetails = d.domaine_details as Record<string,any> | null | undefined;

        // ── composants locaux ──
        const SH = ({ icon, title: t }: { icon: string; title: string }) => (
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-700 tracking-wide">{t}</h3>
            <div className="flex-1 h-px bg-slate-100"/>
          </div>
        );

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setSelectedOffer(null)}>
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

              {/* ── HERO ── */}
              <div className="relative shrink-0">
                {imgs.length > 0 ? (
                  <div className="h-52 overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url('${imgs[sliderIdx]}')` }} />
                    {imgs.length>1 && <>
                      <button onClick={(e)=>{e.stopPropagation();setSliderIdx(i=>(i-1+imgs.length)%imgs.length);}} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center z-10"><ChevronLeft size={16}/></button>
                      <button onClick={(e)=>{e.stopPropagation();setSliderIdx(i=>(i+1)%imgs.length);}} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center z-10"><ChevronRight size={16}/></button>
                    </>}
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/30" style={{fontSize:80}}>hiking</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {d.type_guidage_offre && <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-slate-900 px-2.5 py-0.5 rounded-lg">{GUIDAGE[d.type_guidage_offre]??d.type_guidage_offre}</span>}
                    {d.type_prestation && <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-lg backdrop-blur-sm">{PRESTATION[d.type_prestation]??d.type_prestation}</span>}
                  </div>
                  <h2 className="text-lg font-extrabold text-white leading-tight drop-shadow">{o.title}</h2>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {o.price!=null && <span className="text-sm font-black text-primary">{o.price} DT</span>}
                    {o.duration && <span className="text-[11px] font-bold text-white/90 flex items-center gap-1"><Clock size={10}/>{o.duration}</span>}
                    {o.region && <span className="text-[11px] font-bold text-white/90 flex items-center gap-1"><MapPin size={10}/>{o.region}</span>}
                  </div>
                </div>
                <button onClick={()=>setSelectedOffer(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center z-10"><X size={15}/></button>
              </div>

              {/* ── BODY ── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">

                {/* Photo strip */}
                {imgs.length>1 && (
                  <div className="flex gap-2 overflow-x-auto pb-0.5">
                    {imgs.map((src,i)=>(
                      <button key={i} onClick={()=>setSliderIdx(i)} className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i===sliderIdx?"border-primary":"border-transparent opacity-60"}`}>
                        <img src={src} alt="" className="w-full h-full object-cover"/>
                      </button>
                    ))}
                  </div>
                )}

                {/* Présentation */}
                <section>
                  <SH icon="description" title="Présentation de l'offre"/>
                  {/* Type de guidage + Type de prestation */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {d.type_guidage_offre && (
                      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-2.5">
                        <span className="material-symbols-outlined text-primary text-lg">hiking</span>
                        <div>
                          <p className="text-[8px] font-black tracking-widest text-primary/60 uppercase">Type de guidage</p>
                          <p className="text-xs font-extrabold text-primary leading-tight">{GUIDAGE[d.type_guidage_offre]??d.type_guidage_offre}</p>
                        </div>
                      </div>
                    )}
                    {d.type_prestation && (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
                        <span className="material-symbols-outlined text-slate-500 text-lg">category</span>
                        <div>
                          <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Type de prestation</p>
                          <p className="text-xs font-extrabold text-slate-700 leading-tight">{PRESTATION[d.type_prestation]??d.type_prestation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {o.description && <p className="text-sm text-slate-600 leading-relaxed mb-2">{o.description}</p>}
                  {d.description_longue && <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line mb-4">{String(d.description_longue)}</p>}
                  {d.difficulte_physique && (
                    <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 w-fit">
                      <span className="material-symbols-outlined text-primary text-sm">fitness_center</span>
                      <span className="text-xs font-bold text-slate-600">Niveau d'expérience : <span className="text-slate-800">{d.difficulte_physique}</span></span>
                    </div>
                  )}
                  {/* Points forts — grille 2 colonnes */}
                  {pointsForts.length>0 && (
                    <div className="mb-4">
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-400 text-sm">star</span>Points forts
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {pointsForts.map((pf,i)=>(
                          <div key={i} className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl p-3">
                            <div className="w-6 h-6 rounded-full bg-amber-200/60 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                            </div>
                            <span className="text-xs font-bold text-amber-800 leading-tight">{pf}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Public recommandé — badges avec icônes */}
                  {publicRec.length>0 && (
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary/60 text-sm">groups</span>Public recommandé
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {publicRec.map(p=>(
                          <div key={p} className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 rounded-2xl px-3 py-2">
                            <span className="material-symbols-outlined text-secondary text-base">{PUBLIC_ICONS[p]??'person'}</span>
                            <span className="text-xs font-bold text-secondary">{PUBLIC_LABELS[p]??p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Expertises & cascade */}
                {(expertises.length>0||domDetails) && (() => {
                  const domaineKey = (d.domaine_offre as string|undefined) ?? profile.domaines?.[0] ?? undefined;
                  const cascadeCfg = domaineKey ? (DOMAIN_CASCADE_CONFIG[domaineKey] ?? null) : null;
                  const cascade = d.domaine_details as { types_visite?: string[]; experiences?: string[]; mediation?: string[] } | null | undefined;
                  const selTypes: string[] = cascade?.types_visite ?? [];
                  const selExp: string[] = cascade?.experiences ?? [];
                  const selMed: string[] = cascade?.mediation ?? [];
                  const hasAnyCascade = selTypes.length>0||selExp.length>0||selMed.length>0;
                  if (!expertises.length && !hasAnyCascade && !domDetails) return null;
                  const CL_STYLES = {
                    expertises:   { border:"border-secondary/70",  text:"text-secondary",  icon:"eco"            },
                    types:        { border:"border-secondary/70",  text:"text-secondary",  icon:"landscape"      },
                    experiences:  { border:"border-secondary/70",  text:"text-secondary",  icon:"explore"        },
                    supports:     { border:"border-secondary/70",  text:"text-secondary",  icon:"backpack"       },
                  } as const;
                  const CL = ({ label, tone }: { label: string; tone: keyof typeof CL_STYLES }) => {
                    const s = CL_STYLES[tone];
                    return (
                      <div className={`flex items-center gap-2 border-l-[3px] ${s.border} pl-3 py-1 mb-3`}>
                        <span className={`material-symbols-outlined text-[17px] ${s.text}`}>{s.icon}</span>
                        <span className={`text-[11px] font-extrabold tracking-wide ${s.text}`}>{label}</span>
                      </div>
                    );
                  };
                  return (
                    <section>
                      <SH icon="psychology" title="Expertises & Détails"/>

                      {/* Niveau 1 — Expertises */}
                      {expertises.length>0 && (
                        <div className="mb-4">
                          <CL label="Expertises" tone="expertises"/>
                          <div className="flex flex-wrap gap-2">
                            {expertises.map((e,i)=>(
                              <span key={i} className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold px-3 py-2 rounded-2xl">
                                <span className="material-symbols-outlined text-sm">psychology</span>{e}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Niveau 2 — Types (groupés par expertise si plusieurs) */}
                      {selTypes.length>0 && (
                        <div className="mb-4">
                          <CL label={cascadeCfg?.labelType ?? "Types sélectionnés"} tone="types"/>
                          {cascadeCfg && expertises.length>0 ? (
                            <div className="space-y-2">
                              {expertises.map(exp=>{
                                const expTypes = (cascadeCfg.typesByExpertise[exp] ?? cascadeCfg.typesByExpertise["_default"] ?? []).filter(t=>selTypes.includes(t));
                                if (!expTypes.length) return null;
                                return (
                                  <div key={exp}>
                                    {expertises.length>1 && <p className="text-[10px] font-bold text-slate-400 mb-1 pl-0.5">{exp}</p>}
                                    <div className="flex flex-wrap gap-1.5">
                                      {expTypes.map(t=><span key={t} className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl">{t}</span>)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {selTypes.map(t=><span key={t} className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl">{t}</span>)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Niveau 3 — Expériences incluses (groupées par type si plusieurs) */}
                      {selExp.length>0 && (
                        <div className="mb-4">
                          <CL label={cascadeCfg?.labelExperiences ?? "Activités & expériences incluses"} tone="experiences"/>
                          {cascadeCfg && selTypes.length>0 ? (
                            <div className="space-y-3">
                              {selTypes.map(t=>{
                                const tExps = (cascadeCfg.experiencesByType[t] ?? cascadeCfg.experiencesByType["_default"] ?? []).filter(e=>selExp.includes(e));
                                if (!tExps.length) return null;
                                return (
                                  <div key={t}>
                                    {selTypes.length>1 && <p className="text-[10px] font-bold text-secondary/60 mb-1.5 pl-0.5">{t}</p>}
                                    <div className="space-y-1">
                                      {tExps.map(e=>(
                                        <div key={e} className="flex items-start gap-2 text-sm text-slate-700">
                                          <span className="w-1.5 h-1.5 rounded-full bg-secondary/50 shrink-0 mt-1.5"/>
                                          {e}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {selExp.map(e=>(
                                <div key={e} className="flex items-start gap-2 text-sm text-slate-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"/>{e}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Niveau 4 — Matériel & Supports (groupés par type si plusieurs) */}
                      {selMed.length>0 && (
                        <div>
                          <CL label={cascadeCfg?.labelMediation ?? "Matériel & supports fournis"} tone="supports"/>
                          {cascadeCfg && selTypes.length>0 ? (
                            <div className="space-y-3">
                              {selTypes.map(t=>{
                                const tMed = (cascadeCfg.mediationByType[t] ?? cascadeCfg.mediationByType["_default"] ?? []).filter(m=>selMed.includes(m));
                                if (!tMed.length) return null;
                                return (
                                  <div key={t}>
                                    {selTypes.length>1 && <p className="text-[10px] font-bold text-slate-400 mb-1.5 pl-0.5">{t}</p>}
                                    <div className="flex flex-wrap gap-1.5">
                                      {tMed.map(m=><span key={m} className="bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold px-2.5 py-1.5 rounded-xl">{m}</span>)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {selMed.map(m=><span key={m} className="bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold px-2.5 py-1.5 rounded-xl">{m}</span>)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Champs domaine non-cascade */}
                      {!cascadeCfg && domDetails && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-3">
                          {Object.entries(domDetails).filter(([,v])=>v!=null&&v!==''&&!(Array.isArray(v)&&!v.length)).map(([k,v])=>(
                            <div key={k}>
                              <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">{k.replace(/_/g,' ')}</p>
                              <p className="text-[11px] font-bold text-slate-700">{Array.isArray(v)?(v as string[]).join(', '):String(v)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })()}

                {/* Localisation */}
                <section>
                  <SH icon="map" title="Localisation"/>
                  {o.meeting_point && (
                    <>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-3">
                        <OfferMap lat={o.meeting_lat} lng={o.meeting_lng} fallbackLat={d.lieu_lat as number|null} fallbackLng={d.lieu_lng as number|null} address={o.meeting_point ?? ""}/>
                      </div>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-emerald-600 text-sm">location_on</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Point de départ / Point de rendez-vous</p>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{o.meeting_point}</p>
                          {d.lieu_precis && d.lieu_precis!==o.meeting_point && <p className="text-xs text-slate-500 mt-1">{d.lieu_precis}</p>}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {o.duration && (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <Clock size={13} className="text-primary"/>
                        <div><p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Durée</p><p className="text-xs font-bold text-slate-700">{o.duration}</p></div>
                      </div>
                    )}
                    {d.heure_depart && d.heure_depart!=="00:00" && (
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <span className="material-symbols-outlined text-primary text-sm">alarm</span>
                        <div><p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Heure de départ</p><p className="text-xs font-bold text-slate-700">{d.heure_depart}</p></div>
                      </div>
                    )}
                  </div>
                  {/* Sites / Lieux visités */}
                  {lieux.length>0 && (
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm">route</span>Sites / Lieux visités
                      </p>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-3">
                        <LieuxMap lieux={lieux}/>
                      </div>
                      <div className="space-y-1.5">
                        {lieux.map((l,i)=>(
                          <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                            <div className="w-5 h-5 rounded-full bg-primary text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</div>
                            <span className="text-sm font-semibold text-slate-700">{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Groupe & Conditions */}
                <section>
                  <SH icon="groups" title="Groupe & Conditions"/>
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    {([
                      { icon:"person", label:"Nb min. participants", val: d.nb_participants_min!=null ? String(d.nb_participants_min) : null },
                      { icon:"groups", label:"Nb max. participants", val: (d.nb_participants_max!=null||o.max_group_size) ? String(d.nb_participants_max??o.max_group_size) : null },
                      { icon:"child_care", label:"Âge minimum", val: (d.age_minimum!=null||o.min_age) ? `${d.age_minimum??o.min_age} ans` : null },
                      { icon:"elderly", label:"Âge maximum", val: d.age_maximum!=null ? `${d.age_maximum} ans` : null },
                    ] as {icon:string;label:string;val:string|null}[]).filter(it=>it.val!=null).map(({icon,label,val})=>(
                      <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
                        </div>
                        <div>
                          <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase leading-tight mb-0.5">{label}</p>
                          <p className="text-xl font-extrabold text-slate-800 leading-none">{val}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {langs.length>0 && (
                    <div className="mb-3">
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm">translate</span>Langue(s) de guidage
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {langs.map(l=><span key={l} className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-xl"><Globe size={12}/>{LANG_LABELS[l] ?? l}</span>)}
                      </div>
                    </div>
                  )}
                  {d.restrictions_medicales && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-base">warning</span>
                        <p className="text-xs font-extrabold text-amber-700">Restrictions médicales / contre-indications</p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{d.restrictions_medicales}</p>
                    </div>
                  )}
                  {d.conditions_particulieres && (
                    <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="material-symbols-outlined text-secondary text-base">info</span>
                        <p className="text-xs font-extrabold text-secondary">Conditions particulières</p>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{d.conditions_particulieres}</p>
                    </div>
                  )}
                </section>

                {/* Disponibilités */}
                {d.disponibilite?.type && (() => {
                  const DISPO_LABELS: Record<string,{label:string;icon:string}> = {
                    specific:  { label:"Date unique / Dates spécifiques", icon:"calendar_today" },
                    range:     { label:"Période continue",                icon:"date_range" },
                    recurring: { label:"Récurrent",                      icon:"event_repeat" },
                    season:    { label:"Saison",                         icon:"wb_sunny" },
                  };
                  const dispType = d.disponibilite.type as string;
                  const dispMeta = DISPO_LABELS[dispType] ?? { label: dispType, icon: "event" };

                  const rawTs = d.disponibilite.time_slots as Record<string,Array<{start:string;end:string}>> | null | undefined;
                  const timeWindows: Array<{start:string;end:string}> = rawTs && typeof rawTs === "object" && !Array.isArray(rawTs)
                    ? Array.from(new Map(Object.values(rawTs).flat().map(w=>[`${w.start}-${w.end}`,w])).values())
                    : [];

                  const FR_DAYS_DISPLAY = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];
                  const days_of_week: string[] = Array.isArray(d.disponibilite.days_of_week) ? d.disponibilite.days_of_week as string[] : [];

                  return (
                    <section>
                      <SH icon="calendar_month" title="Disponibilités"/>
                      <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-base">{dispMeta.icon}</span>
                          <span className="text-sm font-extrabold text-slate-700">{dispMeta.label}</span>
                        </div>
                        <div className="p-4 space-y-4">
                          {/* Période (range / season) */}
                          {d.disponibilite.start_date && (
                            <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3">
                              <span className="material-symbols-outlined text-primary text-lg">date_range</span>
                              <div>
                                <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Période</p>
                                <p className="text-sm font-bold text-slate-700">
                                  {new Date(d.disponibilite.start_date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}
                                  {d.disponibilite.end_date && <> → {new Date(d.disponibilite.end_date).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</>}
                                </p>
                              </div>
                            </div>
                          )}
                          {/* Jours récurrents */}
                          {days_of_week.length>0 && (
                            <div>
                              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-primary text-sm">view_week</span>Jours disponibles
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {days_of_week.map(d=>{
                                  const label = FR_DAYS_DISPLAY[parseInt(d)] ?? d;
                                  return <span key={d} className="bg-secondary/10 text-secondary text-xs font-black px-3 py-1.5 rounded-xl">{label}</span>;
                                })}
                              </div>
                            </div>
                          )}
                          {/* Dates spécifiques */}
                          {Array.isArray(d.disponibilite.dates)&&d.disponibilite.dates.length>0 && (
                            <div>
                              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-primary text-sm">calendar_today</span>
                                {d.disponibilite.dates.length===1 ? "Date unique" : `${d.disponibilite.dates.length} dates`}
                              </p>
                              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                                {(d.disponibilite.dates as string[]).map(dt=>(
                                  <span key={dt} className="bg-white border border-primary/20 text-primary text-[11px] font-bold px-3 py-1.5 rounded-xl">
                                    {new Date(dt).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Créneaux horaires */}
                          {timeWindows.length>0 && (
                            <div>
                              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-primary text-sm">schedule</span>Horaires
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {timeWindows.map((tw,i)=>(
                                  <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                                    <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                                    <span className="text-sm font-extrabold text-slate-700">{tw.start}</span>
                                    <span className="text-slate-400 text-sm">→</span>
                                    <span className="text-sm font-extrabold text-slate-700">{tw.end}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  );
                })()}

                {/* Ce que vous fournissez */}
                <section>
                  <SH icon="room_service" title="Ce que vous fournissez"/>
                  <div className="space-y-3">
                    {d.transport_inclus===true && (
                      <div className="border border-secondary/20 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-secondary/5 border-b border-secondary/20">
                          <span className="material-symbols-outlined text-secondary text-lg">directions_bus</span>
                          <p className="text-xs font-extrabold text-secondary">Transport</p>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          {Array.isArray(d.transport_types)&&d.transport_types.length>0 && (
                            <div className="flex flex-wrap gap-1.5">{(d.transport_types as string[]).map(t=><span key={t} className="bg-secondary/10 text-secondary text-[11px] font-bold px-2.5 py-1 rounded-lg">{t}</span>)}</div>
                          )}
                          {d.transport_svcs && Object.entries(d.transport_svcs as Record<string,any>).map(([type,svc])=>(
                            <div key={type}>
                              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{type}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                {Object.entries(svc as Record<string,any>).filter(([,v])=>v!=null&&v!==''&&v!==false&&!(Array.isArray(v)&&!v.length)).map(([k,v])=>(
                                  <p key={k} className="text-[11px] text-slate-500">{k} : <span className="font-bold text-slate-700">{Array.isArray(v)?(v as string[]).join(', '):String(v)}</span></p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {d.repas_flag===true && (
                      <div className="border border-orange-100 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-orange-50 border-b border-orange-100">
                          <span className="material-symbols-outlined text-orange-600 text-lg">restaurant</span>
                          <p className="text-xs font-extrabold text-orange-700">Restauration</p>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          {Array.isArray(d.restauration_types)&&d.restauration_types.length>0 && (
                            <div className="flex flex-wrap gap-1.5">{(d.restauration_types as string[]).map(t=><span key={t} className="bg-orange-50 text-orange-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{t}</span>)}</div>
                          )}
                          {d.restauration_svcs && Object.entries(d.restauration_svcs as Record<string,any>).map(([type,svc])=>svc&&(
                            <div key={type}>
                              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{type}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                {Object.entries(svc as Record<string,any>).filter(([,v])=>v!=null&&v!==''&&v!==false&&!(Array.isArray(v)&&!v.length)).map(([k,v])=>(
                                  <p key={k} className="text-[11px] text-slate-500">{k} : <span className="font-bold text-slate-700">{Array.isArray(v)?(v as string[]).join(', '):String(v)}</span></p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {d.hebergement_inclus===true && (
                      <div className="border border-teal-100 rounded-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border-b border-teal-100">
                          <span className="material-symbols-outlined text-teal-600 text-lg">hotel</span>
                          <p className="text-xs font-extrabold text-teal-700">Hébergement</p>
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          {Array.isArray(d.hebergement_types)&&d.hebergement_types.length>0 && (
                            <div className="flex flex-wrap gap-1.5">{(d.hebergement_types as string[]).map(t=><span key={t} className="bg-teal-50 text-teal-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{t}</span>)}</div>
                          )}
                          {d.hebergement_svcs && Object.entries(d.hebergement_svcs as Record<string,any>).map(([type,svc])=>svc&&(
                            <div key={type}>
                              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{type}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                {Object.entries(svc as Record<string,any>).filter(([,v])=>v!=null&&v!==''&&v!==false&&!(Array.isArray(v)&&!v.length)).map(([k,v])=>(
                                  <p key={k} className="text-[11px] text-slate-500">{k} : <span className="font-bold text-slate-700">{Array.isArray(v)?(v as string[]).join(', '):String(v)}</span></p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {inclus.length>0 && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                        <p className="text-[9px] font-black tracking-widest text-emerald-700 uppercase mb-2.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">check_circle</span>Services inclus
                        </p>
                        <ul className="space-y-1.5">
                          {inclus.map((item,i)=><li key={i} className="flex items-start gap-2 text-sm text-slate-700"><span className="material-symbols-outlined text-emerald-500 text-base shrink-0 mt-0.5">done</span>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {d.equipement_a_apporter && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                        <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-slate-400 text-sm">backpack</span>À apporter par le participant
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{d.equipement_a_apporter}</p>
                      </div>
                    )}
                    {d.non_inclus && (
                      <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                        <p className="text-[9px] font-black tracking-widest text-red-500 uppercase mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-red-400 text-sm">cancel</span>Non inclus (à prévoir par le participant)
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{d.non_inclus}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Tarification */}
                {d.tarification && (
                  <section>
                    <SH icon="payments" title="Tarification"/>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl overflow-hidden">
                      <div className="flex flex-wrap divide-x divide-emerald-100">
                        {(d.tarification.prix_par_personne??d.tarification.price_per_person)!=null && (
                          <div className="flex-1 p-5 text-center min-w-[120px]">
                            <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">Par personne</p>
                            <p className="text-2xl font-extrabold text-primary leading-none">{d.tarification.prix_par_personne??d.tarification.price_per_person}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">DT</p>
                          </div>
                        )}
                        {(d.tarification.prix_groupe??d.tarification.price_per_group)!=null && (
                          <div className="flex-1 p-5 text-center min-w-[120px]">
                            <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">Par groupe</p>
                            <p className="text-2xl font-extrabold text-primary leading-none">{d.tarification.prix_groupe??d.tarification.price_per_group}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">DT</p>
                          </div>
                        )}
                        {d.tarification.base_price!=null && (
                          <div className="flex-1 p-5 text-center min-w-[120px]">
                            <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">Prix de base</p>
                            <p className="text-2xl font-extrabold text-primary leading-none">{d.tarification.base_price}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">DT</p>
                          </div>
                        )}
                        {d.tarification.deposit_percent!=null && (
                          <div className="flex-1 p-5 text-center min-w-[100px] bg-white/50">
                            <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">Acompte</p>
                            <p className="text-2xl font-extrabold text-slate-700 leading-none">{d.tarification.deposit_percent}<span className="text-lg">%</span></p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">du total</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* Confirmation & Annulation */}
                <section>
                  <SH icon="policy" title="Confirmation & Annulation"/>
                  <div className="space-y-3">
                    {d.type_confirmation && (
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-emerald-600 text-xl">verified</span>
                        </div>
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Type de confirmation</p>
                          <p className="text-sm font-bold text-slate-700">{CONF[d.type_confirmation]??d.type_confirmation}</p>
                        </div>
                      </div>
                    )}
                    {(o.cancellation_policy||d.politique_annulation) && (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-slate-400 text-sm">policy</span>Politique d'annulation
                        </p>
                        <p className="text-sm font-bold text-slate-700 mb-1">{ANNUL[o.cancellation_policy??d.politique_annulation??'']??(o.cancellation_policy??d.politique_annulation)}</p>
                        {d.description_politique && <p className="text-xs text-slate-500 leading-relaxed">{d.description_politique}</p>}
                      </div>
                    )}
                    {d.annulation_meteo!=null && (
                      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${d.annulation_meteo?"bg-secondary/5 border-secondary/20":"bg-slate-50 border-slate-100"}`}>
                        <span className={`material-symbols-outlined text-lg ${d.annulation_meteo?"text-secondary":"text-slate-400"}`}>{d.annulation_meteo?"thunderstorm":"wb_sunny"}</span>
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Météo</p>
                          <p className={`text-sm font-bold ${d.annulation_meteo?"text-secondary":"text-slate-500"}`}>
                            {d.annulation_meteo?"Remboursement si météo dangereuse":"Pas de remboursement en cas de météo"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Score durabilité */}
                {o.sustainability_score!=null && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1.5"><Leaf size={13}/>Score de durabilité</span>
                      <span className="text-sm font-black text-primary">{o.sustainability_score}/100</span>
                    </div>
                    <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{width:`${o.sustainability_score}%`}}/></div>
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
