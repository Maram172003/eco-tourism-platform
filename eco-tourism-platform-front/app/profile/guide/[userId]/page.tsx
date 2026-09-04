"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Globe, Star, UserPlus, UserMinus,
  Clock, Leaf, MoreVertical, Flag, X, Check, Users, ShieldCheck, ShieldBan, Send, ArrowRight, Sparkles, Info, BookOpen,
  LayoutGrid, Tag, Calendar, Route,
} from "lucide-react";
import dynamic from "next/dynamic";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";
import CircuitViewContent from "@/components/circuit/CircuitViewContent";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import SustainabilityBadge from "@/components/common/SustainabilityBadge";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" /> });


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
import BadgeLabel from "@/components/common/BadgeLabel";

// ─── Types ────────────────────────────────────────────────────────────────────

type PubCollab = {
  id: string;
  source_type?: "offer" | "circuit";
  offer_id?: string | null;
  offer_title?: string | null;
  offer_description?: string | null;
  offer_cover?: string | null;
  offer_status?: string | null;
  circuit_id?: string | null;
  circuit_title?: string | null;
  circuit_cover?: string | null;
  circuit_description?: string | null;
  circuit_nb_jours?: number | null;
  circuit_sustainability_score?: number | null;
  offer_sustainability_score?: number | null;
  circuit_nb_etapes?: number | null;
  circuit_status?: string | null;
  section: string;
  status: string;
  message?: string | null;
  created_at: string;
};

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
          <path d="M800,30 Q860,60 840,110 Q810,130 790,100 Q820,80 800,30Z" opacity="0.5" />
          <path d="M800,30 Q795,75 790,100" opacity="0.5" />
        </g>
        <path d="M0,260 Q300,230 600,250 Q900,270 1200,240" stroke="#2d6a4f" strokeWidth="1" fill="none" opacity="0.15" />
      </svg>
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


  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [blockDone, setBlockDone] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  type SocialUser = { user_id: string; full_name: string | null; photo: string | null; _type?: string; sub?: string | null };
  const [theirFollowers, setTheirFollowers] = useState<SocialUser[]>([]);
  const [myConnectionIds, setMyConnectionIds] = useState<Set<string>>(new Set());
  const [viewerId, setViewerId] = useState("");
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [theirFollowing, setTheirFollowing] = useState<SocialUser[]>([]);
  const [theirCollabs, setTheirCollabs] = useState<PubCollab[]>([]);
  const [theirCircuits, setTheirCircuits] = useState<any[]>([]);
  const [viewingCircuit, setViewingCircuit] = useState<any>(null);
  const [viewingCircuitLoading, setViewingCircuitLoading] = useState(false);
  const [viewingOffer, setViewingOffer] = useState<OfferFull | null>(null);
  const [viewingOfferLoading, setViewingOfferLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"tout" | "offres" | "circuits" | "collaborations" | "reseau" | "apropos">("tout");

  async function openOfferDetail(offerId: string) {
    setViewingOfferLoading(true);
    try {
      const tkn = localStorage.getItem("access_token") || "";
      const data = await apiFetch<OfferFull>(`/guide/offers/${offerId}/public-detail`, { headers: { Authorization: `Bearer ${tkn}` } });
      setViewingOffer(data);
    } catch { /* silently ignore */ } finally {
      setViewingOfferLoading(false);
    }
  }

  async function openCircuitDetail(circuitId: string) {
    setViewingCircuitLoading(true);
    try {
      const tkn = localStorage.getItem("access_token") || "";
      const data = await apiFetch<any>(`/circuits/${circuitId}/public-detail`, { headers: { Authorization: `Bearer ${tkn}` } });
      setViewingCircuit(data);
    } catch { /* silently ignore */ } finally {
      setViewingCircuitLoading(false);
    }
  }

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
    apiFetch<SocialUser[]>(`/follows/following/public/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } })
      .then(setTheirFollowing).catch(() => {});
    apiFetch<PubCollab[]>(`/guide/collaborations/public/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } })
      .then((list) => setTheirCollabs(list.filter((c) => {
        if (c.status !== "completed") return false;
        const st = c.source_type === "circuit" ? c.circuit_status : c.offer_status;
        return st === "approved";
      }))).catch(() => {});
    apiFetch<any[]>(`/circuits/public/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } })
      .then(setTheirCircuits).catch(() => {});
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
    // Le `.catch` muet annonçait « signalement envoyé » même sur un refus.
    try {
      await apiFetch(`/reports`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ reported_id: userId, reason: reportReason }) });
      setReportError(null);
      setReportSent(true);
    } catch (e: any) {
      setReportError(e?.message || "Le signalement n'a pas pu être envoyé.");
    }
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  if (error || !profile) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <p className="text-slate-500 font-semibold">Profil introuvable.</p>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"><ArrowLeft size={14} /> Retour</button>
    </div>
  );

  const sc = profile.sustainability_score !== null ? scoreColor(profile.sustainability_score) : null;
  const GUIDE_TYPE_LABEL = profile.guide_type ? (GUIDE_TYPE_LABELS[profile.guide_type] ?? profile.guide_type) : scoreLabel(profile.sustainability_score);

  return (
    <>
    <div className="min-h-screen bg-slate-50/70 pb-20">

      {/* ══ TOP NAV ══ */}
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

      {/* ══ MAIN CONTENT ══ */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ── PROFILE HEADER CARD ── */}
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
                    {profile.photo ? <img src={profile.photo} alt={profile.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 56 }}>person</span>}
                  </div>
                </div>
                <BadgeLabel role="guide" userId={userId} taille={11} />
              </div>
              <div className="text-center sm:text-left pt-3 sm:pt-0 pb-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">{profile.full_name}</h1>
                  <ShieldCheck size={20} className="text-emerald-500 fill-emerald-100 hidden sm:block" />
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-primary font-semibold text-sm">
                  <span>{GUIDE_TYPE_LABEL}</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                </div>
              </div>
            </div>
            {canFollow && (
              <div className="flex items-center gap-3 shrink-0 mt-6 md:mt-0 self-center md:self-end">
                <button onClick={toggleFollow} disabled={followLoading}
                  className={`flex items-center justify-center gap-2.5 py-3.5 px-7 font-extrabold rounded-2xl text-base transition-all disabled:opacity-60
                    ${following ? "border-2 border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-500"
                      : followPending ? "border-2 border-primary/40 text-primary hover:border-red-300 hover:text-red-500"
                      : "bg-primary text-slate-900 hover:bg-primary/90 active:scale-95 shadow-md"}`}>
                  {following ? <><UserMinus size={18} /> Abonné</>
                    : followPending ? <><span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" /> En attente</>
                    : <><UserPlus size={18} /> Suivre</>}
                </button>
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen((v) => !v)}
                    className="w-14 h-14 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors">
                    <MoreVertical size={22} />
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
          </div>
          </div>
        </div>

        {/* ── DASHBOARD COLUMNS ── */}
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
                {/* Présentation */}
                {profile.bio && (
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5">Présentation</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
                    <div className="mt-3 border-t border-slate-100" />
                  </div>
                )}
                {profile.country && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><MapPin size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Localisation</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{COUNTRY_LABELS[profile.country] ?? profile.country}</p>
                    </div>
                  </div>
                )}
                {profile.zone && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Globe size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Zone d&apos;activité</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.zone}</p>
                    </div>
                  </div>
                )}
                {profile.guide_type && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><BookOpen size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Type de guide</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{GUIDE_TYPE_LABELS[profile.guide_type] ?? profile.guide_type}</p>
                    </div>
                  </div>
                )}
                {(profile.years_experience !== null && profile.years_experience !== undefined) && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Star size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Années d&apos;expérience</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.years_experience} ans</p>
                    </div>
                  </div>
                )}
                {/* Domaines d'expertises */}
                {profile.domaines && profile.domaines.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-2">Domaines d&apos;expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.domaines.map((d) => {
                        const m = DOMAINES_META[d];
                        return (
                          <span key={d} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-xl px-2.5 py-1 text-[11px] font-bold">
                            <span className="material-symbols-outlined text-xs">{m?.icon ?? "label"}</span>{m?.label ?? d}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Expertises */}
                {profile.expertises && profile.expertises.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-2">Expertises</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.expertises.map((e) => (
                        <span key={e} className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-2.5 py-1 text-[11px] font-bold">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Pourquoi choisir */}
                {profile.pourquoi_moi && (
                  <div>
                    <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase mb-1.5">Pourquoi choisir ce guide ?</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{profile.pourquoi_moi}</p>
                  </div>
                )}
                {!profile.country && !profile.zone && !profile.guide_type && !profile.bio && !profile.domaines?.length && !profile.expertises?.length && (
                  <p className="text-xs text-slate-400 italic">Aucune information renseignée.</p>
                )}
              </div>
            </div>

            {/* Score durabilité */}
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

            {/* Followers */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-extrabold text-base text-slate-800">Followers</span>
                  <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{theirFollowers.length}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {theirFollowers.slice(0, 5).map((f) => {
                    const ownPath = f._type === "guide" ? "/profile/guide" : f._type === "project" ? "/profile/project-owner" : "/profile/ecovoyageur";
                    const pubPath = f._type === "guide" ? `/profile/guide/${f.user_id}` : f._type === "project" ? `/profile/project-owner/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                    const path = f.user_id === viewerId ? ownPath : pubPath;
                    return (
                      <button key={f.user_id} onClick={() => router.push(path)}
                        className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center hover:scale-105 transition-transform"
                        title={f.full_name ?? ""}>
                        {f.photo ? <img src={f.photo} alt={f.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-lg">person</span>}
                      </button>
                    );
                  })}
                  {theirFollowers.length > 5 && (
                    <button onClick={() => setShowFollowersModal(true)} className="w-10 h-10 rounded-xl bg-emerald-50 text-primary text-[11px] font-black border border-emerald-100/60 shadow-sm flex items-center justify-center">+{theirFollowers.length - 5}</button>
                  )}
                </div>
                {theirFollowers.length > 5 && (
                  <button onClick={() => setShowFollowersModal(true)} className="text-xs font-bold text-primary hover:underline">Voir tous les followers</button>
                )}
                {theirFollowers.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Aucun follower pour l&apos;instant.</p>
                )}
              </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Tab bar — IDENTIQUE au profil propre */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/50">
              {([
                { key: "tout",           label: "Tout",           Icon: LayoutGrid },
                { key: "offres",         label: "Offres",         Icon: Tag },
                { key: "reseau",         label: "Réseau",         Icon: Users },
                { key: "collaborations", label: "Collaborations", Icon: Users },
                { key: "circuits",       label: "Circuits",       Icon: Route },
                { key: "apropos",        label: "À propos",       Icon: Info },
              ] as { key: "tout" | "offres" | "circuits" | "collaborations" | "reseau" | "apropos"; label: string; Icon: React.ComponentType<any> }[]).map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex-1 min-w-[60px] py-3 px-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}>
                  <Icon size={14} strokeWidth={2.5} /><span>{label}</span>
                </button>
              ))}
            </div>

            {/* Tab: Tout */}
            {activeTab === "tout" && (() => {
              const nonCircuitOffers = profile.offers;
              const isEmpty = nonCircuitOffers.length === 0 && theirCircuits.length === 0 && theirCollabs.length === 0;
              return (
                <div className="space-y-8">
                  {isEmpty && (
                    <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-14 text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">public</span>
                      <p className="font-extrabold text-slate-700 text-base mb-1">Aucune publication</p>
                      <p className="text-slate-400 text-sm">Les offres, circuits et collaborations de ce guide apparaîtront ici.</p>
                    </div>
                  )}
                  {nonCircuitOffers.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Tag size={12} className="text-primary" /><span>Offres publiées</span>
                      </h3>
                      {nonCircuitOffers.slice(0, 3).map((o) => (
                        <div key={o.id} ref={(el) => { offerRefs.current[o.id] = el; }}
                          className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${highlightedOfferId === o.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-slate-100"}`}>
                          <OfferCard offer={o} onClick={() => openOfferDetail(o.id)} />
                          <PubInteractions pubId={o.id} token={token} viewerId={viewerId}
                            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?offer=${o.id}`}
                            pubTitle={o.title} itemApiBase="/interactions/offer" commentApiBase="/interactions" />
                        </div>
                      ))}
                      {nonCircuitOffers.length > 3 && <button onClick={() => setActiveTab("offres")} className="text-primary text-xs font-extrabold hover:underline flex items-center gap-1">Voir toutes les offres <ArrowRight size={13} /></button>}
                    </div>
                  )}
                  {theirCircuits.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Route size={12} className="text-primary" /><span>Circuits publiés</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {theirCircuits.slice(0, 3).map((circuit) => {
                          const etapes: any[] = circuit.etapes ?? [];
                          return (
                            <div key={circuit.id} className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden hover:shadow-md transition-all">
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
                                      <MapPin size={10} />{etapes.length} étape{etapes.length !== 1 ? "s" : ""}
                                    </span>
                                    <SustainabilityBadge score={circuit.sustainability_score} kind="circuit" />
                                  </div>
                                  {etapes.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                      {etapes.slice(0, 3).map((etape: any) => {
                                        const eCat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
                                        const catLabel = eCat?.label ?? DOMAINES_META[etape.categorie]?.label ?? etape.categorie ?? "";
                                        const displayName = etape.titre || etape.destination || catLabel || "Étape";
                                        const stLabels = ((etape.subtypes as string[]) ?? []).slice(0, 2).map((sv: string) => eCat?.subtypes?.find((s) => s.value === sv)?.label ?? sv);
                                        const expertiseLabels = ((etape.fields as any)?.expertises as string[] | undefined ?? []).slice(0, 2);
                                        const secondaryLabel = stLabels.length > 0 ? stLabels.join(", ") : expertiseLabels.join(", ");
                                        return (
                                          <div key={etape.id ?? etape.jour} className="flex items-center gap-2 text-xs">
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour}</span>
                                            <span className="font-semibold text-slate-700 truncate">{displayName}</span>
                                            {secondaryLabel && <><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 truncate text-[11px]">{secondaryLabel}</span></>}
                                            {etape.heure_debut && <><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 text-[10px] shrink-0">{etape.heure_debut}{etape.heure_fin ? ` → ${etape.heure_fin}` : ""}</span></>}
                                          </div>
                                        );
                                      })}
                                      {etapes.length > 3 && <p className="text-[10px] text-slate-400 font-semibold">+{etapes.length - 3} étape{etapes.length - 3 > 1 ? "s" : ""}…</p>}
                                    </div>
                                  )}
                                  <button onClick={() => openCircuitDetail(circuit.id)} className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer">
                                    <Info size={12} />Voir les détails
                                  </button>
                                </div>
                              </div>
                              <PubInteractions pubId={circuit.id} token={token} viewerId={viewerId}
                                shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?tab=circuits&circuit=${circuit.id}`}
                                pubTitle={circuit.title} itemApiBase="/interactions/circuit" commentApiBase="/interactions" />
                            </div>
                          );
                        })}
                      </div>
                      {theirCircuits.length > 3 && <button onClick={() => setActiveTab("circuits")} className="text-primary text-xs font-extrabold hover:underline flex items-center gap-1">Voir tous les circuits <ArrowRight size={13} /></button>}
                    </div>
                  )}
                  {theirCollabs.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Users size={12} className="text-primary" /><span>Collaborations publiées</span>
                      </h3>
                      {theirCollabs.slice(0, 3).map((c) => {
                        const isCircuit = c.source_type === "circuit";
                        const displayTitle = isCircuit ? (c.circuit_title ?? "Circuit") : (c.offer_title ?? "Offre");
                        const displayCover = isCircuit ? c.circuit_cover : c.offer_cover;
                        const stCls = c.status === "completed"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-teal-100 text-teal-700 border-teal-200";
                        const stLabel = c.status === "completed" ? "Complétée" : "Acceptée";
                        const stIcon = c.status === "completed" ? "task_alt" : "check_circle";
                        const sectionLabel = c.section ? c.section.charAt(0).toUpperCase() + c.section.slice(1).replace(/_/g, " ") : "";
                        return (
                          <div key={c.id} className="relative bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                            {isCircuit ? (
                              <div className="flex gap-0">
                                <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center overflow-hidden">
                                  {displayCover ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" /> : <Users size={32} className="text-primary/30" />}
                                  <span className={`absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg border ${stCls}`}>{stLabel}</span>
                                </div>
                                <div className="flex-1 p-5">
                                  <h4 className="text-base font-extrabold text-slate-800 leading-tight">{displayTitle}</h4>
                                  {c.circuit_description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.circuit_description}</p>}
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {c.circuit_nb_jours && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-xl"><Calendar size={10} />{c.circuit_nb_jours} jour{c.circuit_nb_jours > 1 ? "s" : ""}</span>}
                <SustainabilityBadge score={c.source_type === "circuit" ? c.circuit_sustainability_score : c.offer_sustainability_score} kind={c.source_type === "circuit" ? "circuit" : "offer"} />
                                    {c.circuit_nb_etapes != null && c.circuit_nb_etapes > 0 && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl"><MapPin size={10} />{c.circuit_nb_etapes} étape{c.circuit_nb_etapes > 1 ? "s" : ""}</span>}
                                  </div>
                                  {c.message && <p className="mt-2 text-slate-400 text-xs leading-relaxed line-clamp-1 italic border-l-2 border-slate-200 pl-2">&ldquo;{c.message}&rdquo;</p>}
                                  {c.circuit_id && (
                                    <button onClick={() => c.circuit_id && openCircuitDetail(c.circuit_id)} className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer">
                                      <Info size={12} />Voir les détails
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row">
                                <div className="relative bg-slate-50 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-100 sm:w-2/5 min-h-[180px]">
                                  {displayCover ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" /> : (<><div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-emerald-100 opacity-90" /><Users size={60} className="text-white/30 relative z-10" /></>)}
                                  <div className={`absolute top-2 left-2 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-xl shadow border flex items-center gap-1 ${stCls}`}><span className="material-symbols-outlined text-xs">{stIcon}</span>{stLabel}</div>
                                </div>
                                <div className="flex-1 flex flex-col justify-between p-6">
                                  <div>
                                    <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-tight mb-2">{displayTitle}</h3>
                                    {c.offer_description && <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{c.offer_description}</p>}
                                    {c.message && <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2 italic border-l-2 border-slate-200 pl-3">&ldquo;{c.message}&rdquo;</p>}
                                    {sectionLabel && <div className="flex flex-wrap gap-2 mb-4"><span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-green-500 uppercase">{sectionLabel}</span></div>}
                                    <SustainabilityBadge score={c.offer_sustainability_score} kind="offer" className="mb-4" />
                                  </div>
                                  <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3">
                                    <p className="text-[11px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                                    {c.offer_id && <button onClick={() => openOfferDetail(c.offer_id!)} className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200"><span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} /></button>}
                                  </div>
                                </div>
                              </div>
                            )}
                            {!isCircuit && c.offer_status === "approved" && c.offer_id && (
                              <PubInteractions pubId={c.offer_id} token={token} viewerId={viewerId}
                                shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?offer=${c.offer_id}`}
                                pubTitle={c.offer_title ?? undefined} itemApiBase="/interactions/offer" commentApiBase="/interactions" />
                            )}
                            {isCircuit && c.circuit_status === "approved" && c.circuit_id && (
                              <PubInteractions pubId={c.circuit_id} token={token} viewerId={viewerId}
                                shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?tab=circuits&circuit=${c.circuit_id}`}
                                pubTitle={c.circuit_title ?? undefined} itemApiBase="/interactions/circuit" commentApiBase="/interactions" />
                            )}
                          </div>
                        );
                      })}
                      {theirCollabs.length > 3 && <button onClick={() => setActiveTab("collaborations")} className="text-primary text-xs font-extrabold hover:underline flex items-center gap-1">Voir toutes les collaborations <ArrowRight size={13} /></button>}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tab: Offres */}
            {activeTab === "offres" && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-base font-extrabold text-slate-800">Offres</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{profile.offers.length === 0 ? "Aucune offre" : `${profile.offers.length} offre${profile.offers.length > 1 ? "s" : ""}`}</p>
                </div>
                {profile.offers.length === 0 ? (
                  <div className="py-16 text-center"><Leaf size={40} className="text-slate-200 mx-auto mb-3" /><p className="text-slate-400 font-semibold text-sm">Aucune offre pour l&apos;instant.</p></div>
                ) : (
                  <div className="p-4 space-y-4">
                    {profile.offers.map((o) => (
                      <div key={o.id} ref={(el) => { offerRefs.current[o.id] = el; }}
                        className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${highlightedOfferId === o.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-slate-100"}`}>
                        <OfferCard offer={o} onClick={() => openOfferDetail(o.id)} />
                        <PubInteractions pubId={o.id} token={token} viewerId={viewerId}
                          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?offer=${o.id}`}
                          pubTitle={o.title} itemApiBase="/interactions/offer" commentApiBase="/interactions" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Circuits */}
            {activeTab === "circuits" && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-base font-extrabold text-slate-800">Circuits</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{theirCircuits.length === 0 ? "Aucun circuit" : `${theirCircuits.length} circuit${theirCircuits.length > 1 ? "s" : ""}`}</p>
                </div>
                {theirCircuits.length === 0 ? (
                  <div className="py-16 text-center">
                    <Route size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold text-sm">Aucun circuit pour l&apos;instant.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {theirCircuits.map((circuit) => {
                      const etapes: any[] = circuit.etapes ?? [];
                      return (
                        <div key={circuit.id} className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden hover:shadow-md transition-all">
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
                                  <MapPin size={10} />{etapes.length} étape{etapes.length !== 1 ? "s" : ""}
                                </span>
                                <SustainabilityBadge score={circuit.sustainability_score} kind="circuit" />
                              </div>
                              {etapes.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  {etapes.slice(0, 3).map((etape: any) => {
                                    const eCat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
                                    const catLabel = eCat?.label ?? DOMAINES_META[etape.categorie]?.label ?? etape.categorie ?? "";
                                    const displayName = etape.titre || etape.destination || catLabel || "Étape";
                                    const stLabels = ((etape.subtypes as string[]) ?? []).slice(0, 2).map((sv: string) => eCat?.subtypes?.find((s) => s.value === sv)?.label ?? sv);
                                    const expertiseLabels = ((etape.fields as any)?.expertises as string[] | undefined ?? []).slice(0, 2);
                                    const secondaryLabel = stLabels.length > 0 ? stLabels.join(", ") : expertiseLabels.join(", ");
                                    return (
                                      <div key={etape.id ?? etape.jour} className="flex items-center gap-2 text-xs">
                                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour}</span>
                                        <span className="font-semibold text-slate-700 truncate">{displayName}</span>
                                        {secondaryLabel && <><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 truncate text-[11px]">{secondaryLabel}</span></>}
                                        {etape.heure_debut && <><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 text-[10px] shrink-0">{etape.heure_debut}{etape.heure_fin ? ` → ${etape.heure_fin}` : ""}</span></>}
                                      </div>
                                    );
                                  })}
                                  {etapes.length > 3 && <p className="text-[10px] text-slate-400 font-semibold">+{etapes.length - 3} étape{etapes.length - 3 > 1 ? "s" : ""}…</p>}
                                </div>
                              )}
                              <button onClick={() => setViewingCircuit(circuit)} className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer">
                                <Info size={12} />Voir les détails
                              </button>
                            </div>
                          </div>
                          <PubInteractions pubId={circuit.id} token={token} viewerId={viewerId}
                            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?tab=circuits&circuit=${circuit.id}`}
                            pubTitle={circuit.title} itemApiBase="/interactions/circuit" commentApiBase="/interactions" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Collaborations */}
            {activeTab === "collaborations" && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                  <h2 className="text-base font-extrabold text-slate-800">Collaborations</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{theirCollabs.length === 0 ? "Aucune collaboration" : `${theirCollabs.length} collaboration${theirCollabs.length > 1 ? "s" : ""}`}</p>
                </div>
                {theirCollabs.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold text-sm">Aucune collaboration pour l&apos;instant.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {theirCollabs.map((c) => {
                      const isCircuit = c.source_type === "circuit";
                      const displayTitle = isCircuit ? (c.circuit_title ?? "Circuit") : (c.offer_title ?? "Offre");
                      const displayCover = isCircuit ? c.circuit_cover : c.offer_cover;
                      const stCls = c.status === "completed"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-teal-100 text-teal-700 border-teal-200";
                      const stLabel = c.status === "completed" ? "Complétée" : "Acceptée";
                      const stIcon = c.status === "completed" ? "task_alt" : "check_circle";
                      const sectionLabel = c.section ? c.section.charAt(0).toUpperCase() + c.section.slice(1).replace(/_/g, " ") : "";
                      return (
                        <div key={c.id} className="relative bg-white rounded-3xl border border-slate-100/90 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
                          {isCircuit ? (
                            <div className="flex gap-0">
                              <div className="relative w-40 shrink-0 bg-gradient-to-br from-primary/20 to-emerald-100 flex items-center justify-center overflow-hidden">
                                {displayCover ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" /> : <Users size={32} className="text-primary/30" />}
                                <span className={`absolute top-2 left-2 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg border ${stCls}`}>{stLabel}</span>
                              </div>
                              <div className="flex-1 p-5">
                                <h4 className="text-base font-extrabold text-slate-800 leading-tight">{displayTitle}</h4>
                                {c.circuit_description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.circuit_description}</p>}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {c.circuit_nb_jours && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-xl"><Calendar size={10} />{c.circuit_nb_jours} jour{c.circuit_nb_jours > 1 ? "s" : ""}</span>}
                                  <SustainabilityBadge score={c.source_type === "circuit" ? c.circuit_sustainability_score : c.offer_sustainability_score} kind={c.source_type === "circuit" ? "circuit" : "offer"} />
                                  {c.circuit_nb_etapes != null && c.circuit_nb_etapes > 0 && <span className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl"><MapPin size={10} />{c.circuit_nb_etapes} étape{c.circuit_nb_etapes > 1 ? "s" : ""}</span>}
                                </div>
                                {c.message && <p className="mt-2 text-slate-400 text-xs leading-relaxed line-clamp-1 italic border-l-2 border-slate-200 pl-2">&ldquo;{c.message}&rdquo;</p>}
                                {c.circuit_id && (
                                  <button onClick={() => c.circuit_id && openCircuitDetail(c.circuit_id)} className="mt-3 flex items-center gap-1.5 text-[11px] font-extrabold text-primary hover:text-primary/80 transition-colors cursor-pointer">
                                    <Info size={12} />Voir les détails
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row">
                              <div className="relative bg-slate-50 flex items-center justify-center overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-100 sm:w-2/5 min-h-[180px]">
                                {displayCover ? <img src={displayCover} alt={displayTitle} className="absolute inset-0 w-full h-full object-cover" /> : (<><div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-emerald-100 opacity-90" /><Users size={60} className="text-white/30 relative z-10" /></>)}
                                <div className={`absolute top-2 left-2 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-xl shadow border flex items-center gap-1 ${stCls}`}><span className="material-symbols-outlined text-xs">{stIcon}</span>{stLabel}</div>
                              </div>
                              <div className="flex-1 flex flex-col justify-between p-6">
                                <div>
                                  <h3 className="text-lg font-extrabold text-slate-800 tracking-tight leading-tight mb-2">{displayTitle}</h3>
                                  {c.offer_description && <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{c.offer_description}</p>}
                                  {c.message && <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2 italic border-l-2 border-slate-200 pl-3">&ldquo;{c.message}&rdquo;</p>}
                                  {sectionLabel && <div className="flex flex-wrap gap-2 mb-4"><span className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider px-3 py-1 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-green-500 uppercase">{sectionLabel}</span></div>}
                                  <SustainabilityBadge score={c.offer_sustainability_score} kind="offer" className="mb-4" />
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3">
                                  <p className="text-[11px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                                  {c.offer_id && <button onClick={() => openOfferDetail(c.offer_id!)} className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200"><span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} /></button>}
                                </div>
                              </div>
                            </div>
                          )}
                          {!isCircuit && c.offer_status === "approved" && c.offer_id && (
                            <PubInteractions pubId={c.offer_id} token={token} viewerId={viewerId}
                              shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?offer=${c.offer_id}`}
                              pubTitle={c.offer_title ?? undefined} itemApiBase="/interactions/offer" commentApiBase="/interactions" />
                          )}
                          {isCircuit && c.circuit_status === "approved" && c.circuit_id && (
                            <PubInteractions pubId={c.circuit_id} token={token} viewerId={viewerId}
                              shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${userId}?tab=circuits&circuit=${c.circuit_id}`}
                              pubTitle={c.circuit_title ?? undefined} itemApiBase="/interactions/circuit" commentApiBase="/interactions" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Réseau */}
            {activeTab === "reseau" && (
              <div className="space-y-4">
                {/* Suivi(e)s */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-primary text-lg">person_add</span>
                    <h2 className="text-base font-extrabold text-slate-800">Suivi(e)s</h2>
                    <span className="ml-auto bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{theirFollowing.length}</span>
                  </div>
                  {theirFollowing.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">Ne suit personne pour l&apos;instant.</p>
                  ) : (
                    <div className="space-y-2">
                      {theirFollowing.map((f) => {
                        const isCommon = myConnectionIds.has(f.user_id) && f.user_id !== viewerId;
                        const ownPath = f._type === "guide" ? "/profile/guide" : f._type === "provider" ? "/profile/provider" : "/profile/ecovoyageur";
                        const pubPath = f._type === "guide" ? `/profile/guide/${f.user_id}` : f._type === "provider" ? `/profile/provider/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                        const path = f.user_id === viewerId ? ownPath : pubPath;
                        return (
                          <button key={f.user_id} onClick={() => router.push(path)}
                            className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-2xl px-3 py-2.5 transition-colors text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                              {f.photo ? <img src={f.photo} alt={f.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                            </div>
                            <p className="text-sm font-extrabold text-slate-800 truncate flex-1">{f.full_name ?? "—"}</p>
                            {isCommon && <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">En commun</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Followers */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="material-symbols-outlined text-primary text-lg">group</span>
                    <h2 className="text-base font-extrabold text-slate-800">Mes abonnés</h2>
                    <span className="ml-auto bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{theirFollowers.length}</span>
                  </div>
                  {theirFollowers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">Aucun abonné pour l&apos;instant.</p>
                  ) : (
                    <div className="space-y-2">
                      {theirFollowers.map((f) => {
                        const isCommon = myConnectionIds.has(f.user_id) && f.user_id !== viewerId;
                        const ownPath = f._type === "guide" ? "/profile/guide" : f._type === "project" ? "/profile/project-owner" : "/profile/ecovoyageur";
                        const pubPath = f._type === "guide" ? `/profile/guide/${f.user_id}` : f._type === "project" ? `/profile/project-owner/${f.user_id}` : `/profile/ecovoyageur/${f.user_id}`;
                        const path = f.user_id === viewerId ? ownPath : pubPath;
                        return (
                          <button key={f.user_id} onClick={() => router.push(path)}
                            className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-2xl px-3 py-2.5 transition-colors text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                              {f.photo ? <img src={f.photo} alt={f.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                            </div>
                            <p className="text-sm font-extrabold text-slate-800 truncate flex-1">{f.full_name ?? "—"}</p>
                            {isCommon && <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">En commun</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: À propos */}
            {activeTab === "apropos" && (
              <div className="space-y-4">
                {/* Bio + infos clés */}
                {(profile.bio || (profile.years_experience !== null && profile.years_experience !== undefined) || (profile.domaines?.length ?? 0) > 0 || (profile.expertises?.length ?? 0) > 0 || profile.pourquoi_moi) && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                    {profile.bio && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Présentation</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{profile.bio}</p>
                      </div>
                    )}
                    {(profile.years_experience !== null && profile.years_experience !== undefined) && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Star size={15} /></div>
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Années d&apos;expérience</p>
                          <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.years_experience} ans</p>
                        </div>
                      </div>
                    )}
                    {profile.domaines && profile.domaines.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Domaines d&apos;expertise</p>
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
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Expertises</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.expertises.map((e) => (
                            <span key={e} className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-3 py-1.5 text-xs font-bold">{e}</span>
                          ))}
                        </div>
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
                {((profile.zones_couvertes?.length ?? 0) > 0 || (profile.villes_couvertes?.length ?? 0) > 0 || (profile.sites_maitrises?.length ?? 0) > 0) && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Zone d&apos;activité</p>
                    {profile.zones_couvertes && profile.zones_couvertes.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-slate-400">map</span>Régions</p>
                        <div className="flex flex-wrap gap-2">{profile.zones_couvertes.map((z) => <span key={z} className="bg-secondary/10 text-secondary border border-secondary/20 rounded-xl px-3 py-1.5 text-xs font-bold">{ZONES_META[z] ?? z}</span>)}</div>
                      </div>
                    )}
                    {profile.villes_couvertes && profile.villes_couvertes.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-slate-400">location_on</span>Villes &amp; lieux</p>
                        <div className="flex flex-wrap gap-2">{profile.villes_couvertes.map((v) => <span key={v} className="flex items-center gap-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold"><span className="material-symbols-outlined text-xs text-slate-400">place</span>{v}</span>)}</div>
                      </div>
                    )}
                    {profile.sites_maitrises && profile.sites_maitrises.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-slate-400">landscape</span>Sites maîtrisés</p>
                        <div className="flex flex-wrap gap-2 mb-3">{profile.sites_maitrises.map((s) => <span key={s} className="flex items-center gap-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl px-3 py-1.5 text-xs font-bold"><span className="material-symbols-outlined text-xs text-secondary/60">landscape</span>{s}</span>)}</div>
                        <LieuxMap lieux={profile.sites_maitrises} />
                      </div>
                    )}
                  </div>
                )}
                {profile.publics_accueillis && profile.publics_accueillis.length > 0 && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Publics accueillis</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.publics_accueillis.map((p) => {
                        const m = PUBLICS_META[p];
                        return <span key={p} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl px-3 py-1.5 text-xs font-bold"><span className="material-symbols-outlined text-sm">{m?.icon ?? "group"}</span>{m?.label ?? p}</span>;
                      })}
                    </div>
                  </div>
                )}
                {(profile.experience_pro || profile.centres_interet) && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                    {profile.experience_pro && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Expérience professionnelle</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.experience_pro}</p>
                      </div>
                    )}
                    {profile.centres_interet && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Centres d&apos;intérêt</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{profile.centres_interet}</p>
                      </div>
                    )}
                  </div>
                )}
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
                {reportError && (
                  <p className="mb-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-center">
                    {reportError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setReportOpen(false)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-2xl text-sm">Annuler</button>
                  <button onClick={reportUser} disabled={!reportReason} className="flex-1 py-3 bg-red-500 text-white font-extrabold rounded-2xl text-sm disabled:opacity-50">Signaler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


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

      {/* Spinner chargement offre */}
      {viewingOfferLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin" />
        </div>
      )}

      {/* Modal détail offre (lecture seule) */}
      {viewingOffer && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingOffer(null)} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-extrabold text-slate-800 leading-tight truncate pr-3">{viewingOffer.title}</h3>
              <button onClick={() => setViewingOffer(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <OfferDetailView offer={viewingOffer} />
            </div>
          </div>
        </div>
      )}

      {/* Spinner chargement circuit */}
      {viewingCircuitLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin" />
        </div>
      )}

      {/* Modal détail circuit (lecture seule) */}
      {viewingCircuit && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingCircuit(null)} />
          <div className="relative z-10 bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header cover */}
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
              <CircuitViewContent circuit={viewingCircuit} ownerName={profile?.full_name ?? undefined} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
