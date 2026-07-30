"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CollaborationModal from "@/components/CollaborationModal";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import dynamic from "next/dynamic";
import {
  Plus, Edit3, ShieldCheck, MapPin, Calendar, Leaf, ArrowLeft,
  LayoutGrid, Tag, Users, Info, Sparkles, ArrowRight, X, Search, UserPlus,
  Clock, ChevronLeft, ChevronRight, Check, Globe, Star, BookOpen,
  MoreVertical, UserX, ShieldBan, Flag,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { DOMAIN_CASCADE_CONFIG } from "@/lib/domainCascadeConfig";
import { OFFER_DETAIL_FIELDS } from "@/lib/offer-schema";
import MessagerieWidget from "@/components/MessagerieWidget";
import PubInteractions from "@/components/PubInteractions";
import GuideOfferModal from "@/components/GuideOfferModal";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"),
  { ssr: false, loading: () => <div className="h-[268px] rounded-2xl bg-slate-100 animate-pulse" /> }
);
const MapView = dynamic(() => import("@/components/map/MapView"),
  { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-slate-100 animate-pulse" /> }
);
const MultiLocationPicker = dynamic(() => import("@/components/map/MultiLocationPicker"),
  { ssr: false, loading: () => <div className="h-[220px] rounded-2xl bg-slate-100 animate-pulse" /> }
);
const AvailabilityCalendar = dynamic(
  () => import("@/components/guide/availability/AvailabilityCalendar"),
  { ssr: false, loading: () => <div className="h-40 rounded-3xl bg-slate-100 animate-pulse" /> }
);

// ─── LieuxMap: multi-marker geocoded map for lieux_visites ────────────────────

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

// ─── MeetingMap: shows map from coords or geocodes from address ───────────────

function MeetingMap({ lat, lng, fallbackLat, fallbackLng, address }: { lat: number | null; lng: number | null; fallbackLat?: number|null; fallbackLng?: number|null; address: string }) {
  const initLat = lat ?? fallbackLat ?? null;
  const initLng = lng ?? fallbackLng ?? null;
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initLat && initLng ? { lat: Number(initLat), lng: Number(initLng) } : null
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

  if (geocoding) return <div className="h-[220px] rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold">Chargement de la carte…</div>;
  if (failed || !coords) return null;
  return <MapView lat={coords.lat} lng={coords.lng} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type GuideProfile = {
  user_id: string; full_name: string; bio: string | null;
  guide_type: string | null; photo: string | null; cover_photo: string | null;
  country: string | null; language: string | null; zone: string | null;
  specialties: string[] | null; languages_spoken: string[] | null;
  years_experience: number | null;
  sustainability_score: number | null;
  feedback_received: number; reservations_handled: number;
  skills_activities: string[]; skills_landscapes: string[]; certifications: { label: string; proof: string; _id?: string }[];
  badges: { label: string; obtained_at: string }[];
  // Nouveaux champs onboarding
  domaines: string[] | null;
  expertises: string[] | null;
  zones_couvertes: string[] | null;
  villes_couvertes: string[] | null;
  sites_maitrises: string[] | null;
  deplacement_possible: boolean | null;
  publics_accueillis: string[] | null;
  telephone: string | null;
  ville_residence: string | null;
  experience_pro: string | null;
  centres_interet: string | null;
  pourquoi_moi: string | null;
};

type Offer = {
  id: string; title: string; description: string | null;
  price: number | null; duration: string | null;
  offer_type: string | null; status: string; created_at: string;
  region: string | null; inclusions: string | null; meeting_point: string | null;
  meeting_lat: number | null; meeting_lng: number | null;
  min_group_size: number | null; max_group_size: number | null;
  min_age: number | null; cancellation_policy: string | null;
  sustainability_score: number | null;
  images?: string[] | null; cover_image?: string | null;
  details?: Record<string, any> | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFER_TYPES = [
  { value: "eco_tour",  label: "Éco-Tour",  icon: "hiking",         gradient: "from-emerald-500 to-teal-400" },
  { value: "activity",  label: "Activité",  icon: "sports",         gradient: "from-orange-500 to-amber-400" },
  { value: "workshop",  label: "Atelier",   icon: "school",         gradient: "from-slate-600 to-slate-500" },
  { value: "transfer",  label: "Transfert", icon: "directions_car", gradient: "from-blue-500 to-cyan-400" },
];

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
  if (score >= 31) return { label: "Offre Sensibilisée",            color: "text-secondary",   bg: "bg-secondary/10", emoji: "💡" };
  return              { label: "Offre Conventionnelle",              color: "text-slate-500",   bg: "bg-slate-100",    emoji: "📋" };
}

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France", OTHER: "Autre",
};

const LANG_LABELS: Record<string, string> = {
  fr: "Français", ar: "Arabe", en: "Anglais", es: "Espagnol", de: "Allemand", it: "Italien",
};

const GUIDE_TYPE_LABELS: Record<string, string> = {
  local: "Guide Local", professionnel: "Guide Professionnel",
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

const DOMAINES_PRINCIPAUX_EDIT = [
  { value: "nature_ecotourisme",    label: "Nature & Écotourisme",       icon: "park",            desc: "Faune, flore, biodiversité et espaces naturels" },
  { value: "culture_patrimoine",    label: "Culture & Patrimoine",       icon: "account_balance", desc: "Patrimoine, architecture, traditions et musées" },
  { value: "historique_archeo",     label: "Historique & Archéologique", icon: "history_edu",     desc: "Histoire, fouilles, civilisations et monuments" },
  { value: "aventure_randonnee",    label: "Aventure & Randonnée",       icon: "hiking",          desc: "Trek, camping, escalade et activités outdoor" },
  { value: "gastronomie_locale",    label: "Gastronomie locale",         icon: "restaurant",      desc: "Cuisine, marchés, dégustation et savoir-faire culinaire" },
  { value: "artisanat_traditions",  label: "Artisanat & Traditions",     icon: "palette",         desc: "Poterie, tissage, bijoux et savoir-faire locaux" },
  { value: "decouverte_urbaine",    label: "Découverte urbaine",         icon: "location_city",   desc: "Architecture, vie locale, quartiers et street art" },
  { value: "autre",                 label: "Autre",                      icon: "auto_awesome",    desc: "Profil hybride ou spécialité unique" },
];

const EXPERTISES_PAR_DOMAINE_EDIT: Record<string, string[]> = {
  nature_ecotourisme: ["Faune","Flore","Biodiversité","Ornithologie","Géologie","Botanique","Entomologie","Herpétologie","Mammalogie","Écologie marine","Zones humides","Forêts & maquis","Désert & dunes","Oasis","Parcs naturels","Astronomie & ciel nocturne","Photographie nature","Éducation environnementale","Conservation & protection","Apiculture"],
  culture_patrimoine: ["Architecture islamique","Architecture romaine","Architecture coloniale","Artisanat traditionnel","Musées","Médinas","Traditions locales","Costumes & bijoux","Musique traditionnelle","Danse folklorique","Littérature & poésie","Calligraphie arabe","Tissage & broderie","Poterie & céramique","Hammam & bains","Fêtes & festivals","Contes & légendes","Religion & spiritualité","Berbère & amazigh","Art contemporain"],
  historique_archeo: ["Période punique","Période romaine","Période byzantine","Période arabe & médiévale","Période ottomane","Période coloniale","Préhistoire","Fouilles archéologiques","Numismatique","Épigraphie","Mosaïques antiques","Thermes romains","Amphithéâtres","Nécropoles","Citernes & aqueducs","Ksour & greniers berbères","Fortifications","Routes commerciales","Histoire maritime","Carthage & civilisation punique"],
  aventure_randonnee: ["Randonnée pédestre","Trek multi-jours","Escalade","Via ferrata","Spéléologie","Canyoning","VTT & cyclisme","Kayak & canoë","Surf & windsurf","Plongée sous-marine","Snorkeling","Quad & 4x4","Safari désert","Bivouac","Camping sauvage","Dromadaire","Équitation","Course d'orientation","Parapente","Pêche traditionnelle"],
  gastronomie_locale: ["Cuisine tunisienne traditionnelle","Cuisine berbère","Cuisine côtière & fruits de mer","Pâtisserie & sucreries","Street food","Épices & condiments","Huile d'olive & oléiculture","Dattes & palmeraies","Harissa artisanale","Boulangerie traditionnelle","Marchés locaux","Producteurs locaux","Agriculture biologique","Cours de cuisine","Dégustation de thés","Vins & viticulture","Fromages locaux","Miel & apiculture","Lait de chamelle","Boissons traditionnelles"],
  artisanat_traditions: ["Poterie & céramique","Tissage & tapis","Broderie","Bijoux berbères","Bijoux en argent","Maroquinerie & cuir","Sculpture sur bois","Thuya & marqueterie","Ferronnerie","Vannerie & alfa","Parfumerie naturelle","Savon artisanal","Teinture naturelle","Verrerie soufflée","Calligraphie","Enluminure","Peinture sur soie","Couture & caftan","Dinanderie","Travail de l'esparto"],
  decouverte_urbaine: ["Architecture moderne","Street art & graffiti","Quartiers historiques","Vie de quartier","Marchés urbains","Cafés & culture locale","Gastronomie urbaine","Transport local","Scène artistique","Musique & nuits locales","Shopping alternatif","Communautés locales","Urbanisme & ville durable","Histoire de la ville","Cinéma & culture pop","Littérature & librairies","Parcs & espaces verts","Plages urbaines","Port & activités maritimes","Jeunesse & innovation"],
  autre: ["Bien-être & yoga","Méditation & pleine conscience","Retraite spirituelle","Développement personnel","Photographie","Peinture & arts plastiques","Écriture créative","Astronomie","Archéo-astronomie","Géographie","Climatologie","Tourisme solidaire","Bénévolat","Langues & dialectes locaux","Généalogie","Sciences de la terre","Tourisme accessible","Tourisme sénior","Tourisme scolaire","Tourisme d'affaires"],
};

const ZONES_COUVERTES_EDIT = [
  { value: "grand_tunis", label: "Grand Tunis" }, { value: "cap_bon", label: "Cap Bon" },
  { value: "nord_ouest", label: "Nord-Ouest" }, { value: "sahel", label: "Sahel" },
  { value: "centre_ouest", label: "Centre-Ouest" }, { value: "sfax", label: "Sfax & Environs" },
  { value: "djerba_sud_est", label: "Djerba & Sud-Est" }, { value: "tozeur_sahara", label: "Tozeur & Sahara" },
  { value: "tataouine_berbere", label: "Tataouine & Berbère" },
];

const PUBLICS_ACCUEILLIS_EDIT = [
  { value: "familles", label: "Familles", icon: "family_restroom" },
  { value: "scolaires", label: "Scolaires", icon: "school" },
  { value: "adultes", label: "Adultes", icon: "person" },
  { value: "seniors", label: "Seniors", icon: "elderly" },
  { value: "pmr", label: "PMR", icon: "accessible" },
  { value: "groupes", label: "Groupes", icon: "group" },
  { value: "photographes", label: "Photographes", icon: "photo_camera" },
];

const SPECIALTIES_LIST = [
  { value: "randonnee",    label: "Randonnée" },
  { value: "ornithologie", label: "Ornithologie" },
  { value: "photographie", label: "Photographie" },
  { value: "culture",      label: "Culture & Patrimoine" },
  { value: "gastronomie",  label: "Gastronomie" },
  { value: "kayak",        label: "Kayak & Sports nautiques" },
  { value: "speleologie",  label: "Spéléologie" },
  { value: "vtt",          label: "VTT & Cyclisme" },
  { value: "safari",       label: "Safari photo" },
  { value: "astronomie",   label: "Astronomie" },
];

const LANDSCAPES_LIST = [
  { value: "mountain",    label: "Montagne" },
  { value: "desert",      label: "Désert" },
  { value: "sea",         label: "Mer & Côte" },
  { value: "forest",      label: "Forêt" },
  { value: "oasis",       label: "Oasis" },
  { value: "village",     label: "Villages" },
  { value: "archaeology", label: "Sites archéologiques" },
  { value: "lake",        label: "Lacs & Zones humides" },
];

function ProofInput({ proof, onChange }: { proof: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<"url" | "image">("url");
  const isImage = proof.startsWith("data:");

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  if (isImage) {
    return (
      <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
        <img src={proof} alt="Justificatif" className="w-10 h-10 object-cover rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-700">Justificatif</p>
          <p className="text-[10px] text-slate-400">Image uploadée</p>
        </div>
        <button type="button" onClick={() => onChange("")} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("url")}
          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all
            ${mode === "url" ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40"}`}>
          <span className="material-symbols-outlined text-xs">link</span> URL
        </button>
        <button type="button" onClick={() => setMode("image")}
          className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all
            ${mode === "image" ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40"}`}>
          <span className="material-symbols-outlined text-xs">photo_camera</span> Photo
        </button>
        {proof && (
          <button type="button" onClick={() => onChange("")} className="ml-auto text-[10px] text-red-400 hover:text-red-600 font-bold flex items-center gap-0.5">
            <span className="material-symbols-outlined text-xs">delete</span> Supprimer
          </button>
        )}
      </div>
      {mode === "url" ? (
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">link</span>
          <input type="url" value={proof} onChange={(e) => onChange(e.target.value)}
            placeholder="https://exemple.com/certificat.pdf"
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-700 placeholder:text-slate-400 font-medium" />
        </div>
      ) : (
        <label className="flex items-center gap-3 p-2.5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
          <span className="material-symbols-outlined text-slate-400 text-xl">upload_file</span>
          <div>
            <p className="text-xs font-bold text-slate-600">Cliquer pour uploader</p>
            <p className="text-[10px] text-slate-400">JPG, PNG — max 2Mo</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>
      )}
    </div>
  );
}

const CERTIFICATIONS_LIST = [
  "Guide certifié Éco-Voyage",
  "Premiers secours (PSC1)",
  "Guide de montagne agréé",
  "Formation éco-tourisme",
  "Brevet de guide touristique",
  "Certification environnement",
];

const LANGUAGES_LIST = [
  { value: "fr", label: "Français" }, { value: "ar", label: "Arabe" },
  { value: "en", label: "Anglais" }, { value: "es", label: "Espagnol" },
  { value: "de", label: "Allemand" }, { value: "it", label: "Italien" },
];

type Tab = "tout" | "offres" | "reseau" | "apropos" | "agenda" | "collaborations";

type MyCollab = {
  id: string;
  offer_id: string;
  offer_title: string;
  offer_description: string | null;
  offer_cover: string | null;
  offer_status: string;
  guide_id: string;
  section: string;
  status: "pending" | "accepted" | "completed" | "declined";
  message: string | null;
  created_at: string;
};

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

// Poll le DOM jusqu'à trouver l'élément puis scroll + retire le highlight après 3s
function scrollToElement(id: string, onDone: () => void) {
  const deadline = Date.now() + 5000;
  const tick = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(onDone, 3000);
    } else if (Date.now() < deadline) {
      setTimeout(tick, 100);
    }
  };
  setTimeout(tick, 100);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuideProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [profile,   setProfile]   = useState<GuideProfile | null>(null);
  const [offers,    setOffers]    = useState<Offer[]>([]);
  const [token,     setToken]     = useState("");
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("tout");
  const [collaborations, setCollaborations] = useState<MyCollab[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [openCollab, setOpenCollab] = useState<MyCollab | null>(null);
  const [highlightCollabId, setHighlightCollabId] = useState<string | null>(null);
  const [highlightOfferId, setHighlightOfferId] = useState<string | null>(null);
  const [collabResponding, setCollabResponding] = useState(false);
  const [collabConflict, setCollabConflict] = useState<{ label: string; days: string[] } | null>(null);
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [detailOffer, setDetailOffer] = useState<OfferFull | null>(null);
  const [detailOfferLoading, setDetailOfferLoading] = useState(false);
  type NetUser = { user_id: string; full_name: string; photo: string | null; _type: string; sub?: string | null };
  const [following,      setFollowing]      = useState<NetUser[]>([]);
  const [followers,      setFollowers]      = useState<NetUser[]>([]);
  type FollowRequest = { id: string; created_at: string; sender: { user_id: string; full_name: string | null; photo: string | null; role: string } };
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [netLoaded,      setNetLoaded]      = useState(false);
  const [netSearch,      setNetSearch]      = useState("");
  const [netResults,     setNetResults]     = useState<NetUser[]>([]);
  const [netLoading,     setNetLoading]     = useState(false);
  const [netMenuId,      setNetMenuId]      = useState<string | null>(null);
  const [netReport,      setNetReport]      = useState<{ id: string; name: string } | null>(null);
  const [netReportReason,setNetReportReason]= useState("");
  const [netReportSending,setNetReportSending]=useState(false);
  const NET_REPORT_REASONS = ["Contenu inapproprié", "Faux profil", "Harcèlement ou spam", "Informations trompeuses", "Autre"];


  // ── Offer detail / edit modal ────────────────────────────────────────────
  const [editModalOpen,  setEditModalOpen]  = useState(false);
  const [editMode,       setEditMode]       = useState(false);
  const [viewOffer,      setViewOffer]      = useState<Offer | null>(null);
  const [editOfferModal, setEditOfferModal] = useState<Offer | null>(null);
  const [sliderIdx,      setSliderIdx]      = useState(0);
  const [touchStartX,    setTouchStartX]    = useState<number | null>(null);
  const [editOfferId,    setEditOfferId]    = useState("");
  const [editForm,       setEditForm]       = useState({ title: "", offer_type: "", description: "", price: "", duration: "", status: "", region: "", inclusions: "", meeting_point: "", min_group_size: "", max_group_size: "", min_age: "", cancellation_policy: "" });
  const [editTitleError, setEditTitleError] = useState("");
  const [editSaving,     setEditSaving]     = useState(false);
  const [editError,      setEditError]      = useState("");
  const [offerDeleting,  setOfferDeleting]  = useState(false);
  const [editImages,     setEditImages]     = useState<{ src: string; file?: File }[]>([]);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [oqOpen,    setOqOpen]    = useState(false);
  const [oqOfferId, setOqOfferId] = useState("");
  const [oqStep,    setOqStep]    = useState(0);
  const [oqAnswers, setOqAnswers] = useState<Record<string, number>>({});
  const [oqSaving,  setOqSaving]  = useState(false);
  const [editCoverIdx,   setEditCoverIdx]   = useState(0);
  const [showEditMap,    setShowEditMap]    = useState(false);
  const [editMapLat,     setEditMapLat]     = useState<number | null>(null);
  const [editMapLng,     setEditMapLng]     = useState<number | null>(null);

  // ── Edit profile modal ───────────────────────────────────────────────────
  const [editProfileOpen,       setEditProfileOpen]       = useState(false);
  const [editProfileForm,       setEditProfileForm]       = useState({
    full_name: "", bio: "", years_experience: "",
    telephone: "", ville_residence: "",
    experience_pro: "", centres_interet: "", pourquoi_moi: "",
  });
  const [editProfilePhoto,      setEditProfilePhoto]      = useState<{ file?: File; preview: string } | null>(null);
  const [editProfileCover,      setEditProfileCover]      = useState<{ file?: File; preview: string } | null>(null);
  const [editLangsSpoken,       setEditLangsSpoken]       = useState<string[]>([]);
  const [editDomaines,          setEditDomaines]          = useState<string[]>([]);
  const [editExpertises,        setEditExpertises]        = useState<string[]>([]);
  const [editCertifications,    setEditCertifications]    = useState<{ label: string; proof: string }[]>([]);
  const [customCertPool,        setCustomCertPool]        = useState<{ label: string; proof: string }[]>([]);
  const [editZonesCouvertes,    setEditZonesCouvertes]    = useState<string[]>([]);
  const [editVillesCouvertes,   setEditVillesCouvertes]   = useState<string[]>([]);
  const [editSitesMaitrises,    setEditSitesMaitrises]    = useState<string[]>([]);
  const [editDeplacementPossible, setEditDeplacementPossible] = useState<boolean | null>(null);
  const [editPublicsAccueillis, setEditPublicsAccueillis] = useState<string[]>([]);
  const [editProfileSaving,     setEditProfileSaving]     = useState(false);
  const [editProfileError,      setEditProfileError]      = useState("");

  // ── Confirmation publication ─────────────────────────────────────────────
  const [publishOfferModal,    setPublishOfferModal]    = useState<{ offer: Offer; detail: OfferFull | null } | null>(null);
  const [publishOfferLoading,  setPublishOfferLoading]  = useState(false);
  const [publishOfferSaving,   setPublishOfferSaving]   = useState(false);


  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["tout","offres","reseau","apropos","agenda","collaborations"].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== "collaborations" || !token) return;
    setCollabLoading(true);
    const autoOpenId = searchParams.get("openCollab");
    apiFetch<MyCollab[]>("/guide/collaborations/mine", { headers: { Authorization: `Bearer ${token}` } })
      .then((list) => {
        setCollaborations(list);
        if (autoOpenId) {
          setHighlightCollabId(autoOpenId);
          scrollToElement(`collab-${autoOpenId}`, () => setHighlightCollabId(null));
        }
      })
      .catch(() => setCollaborations([]))
      .finally(() => setCollabLoading(false));
  }, [activeTab, token, searchParams]);

  useEffect(() => {
    if (activeTab !== "offres") return;
    const openOfferId = searchParams.get("openOffer");
    if (!openOfferId) return;
    setHighlightOfferId(openOfferId);
    scrollToElement(`offer-${openOfferId}`, () => setHighlightOfferId(null));
  }, [activeTab, searchParams]);

  useEffect(() => {
    async function init() {
      const tkn = localStorage.getItem("access_token");
      if (!tkn) { router.push("/auth/login"); return; }
      setToken(tkn);
      try {
        const [p, myOffers] = await Promise.all([
          apiFetch<GuideProfile>("/guide/profile", { headers: { Authorization: `Bearer ${tkn}` } }),
          apiFetch<Offer[]>("/guide/offers", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => [] as Offer[]),
        ]);
        setProfile(p);
        const offersWithCover = myOffers.map((o) => {
          const validImages = o.images?.filter((url) => url.startsWith("http") || url.startsWith("data:")) ?? null;
          return { ...o, images: validImages?.length ? validImages : null, cover_image: o.cover_image ?? validImages?.[0] ?? null };
        });
        setOffers(offersWithCover);
        // Load network in background
        Promise.all([
          apiFetch<NetUser[]>("/follows/following/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<NetUser[]>("/follows/followers/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<FollowRequest[]>("/follows/requests", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
        ]).then(([fwing, fwers, reqs]) => {
          setFollowing(fwing); setFollowers(fwers); setFollowRequests(reqs); setNetLoaded(true);
        });
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  // Network search — prestataires + guides
  useEffect(() => {
    if (!netSearch.trim() || !token) { setNetResults([]); return; }
    const t = setTimeout(() => {
      setNetLoading(true);
      Promise.all([
        apiFetch<any[]>(`/providers/search?q=${encodeURIComponent(netSearch)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
        apiFetch<any[]>(`/guide/public/search?q=${encodeURIComponent(netSearch)}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
      ]).then(([providers, guides]) => {
        const p = providers.map((o: any) => ({ user_id: o.user_id, full_name: o.organization ?? o.full_name, photo: o.photo, _type: "provider", sub: o.provider_type ?? null }));
        const g = guides.map((o: any) => ({ user_id: o.user_id, full_name: o.full_name, photo: o.photo, _type: "guide", sub: o.zone ?? null }));
        setNetResults([...p, ...g]);
      }).catch(() => setNetResults([]))
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
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    if (!res.ok) throw new Error("Upload échoué");
    const data = await res.json();
    return data.url as string;
  }

  // ── Score label ─────────────────────────────────────────────────────────
  const scoreLabel = (score: number | null) => {
    if (score === null) return "Guide";
    if (score >= 80) return "Guide Ambassadeur";
    if (score >= 60) return "Guide Expert";
    if (score >= 40) return "Guide Engagé";
    return "Guide en Formation";
  };

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

  // ── Offer detail / edit modal ──────────────────────────────────────────────

  function openEditModal(offer: Offer) {
    setViewOffer(offer);
    setEditOfferId(offer.id);
    setEditForm({
      title: offer.title, offer_type: offer.offer_type ?? "", description: offer.description ?? "",
      price: offer.price !== null ? String(offer.price) : "", duration: offer.duration ?? "",
      status: offer.status, region: offer.region ?? "", inclusions: offer.inclusions ?? "", meeting_point: offer.meeting_point ?? "",
      min_group_size: offer.min_group_size !== null ? String(offer.min_group_size) : "",
      max_group_size: offer.max_group_size !== null ? String(offer.max_group_size) : "",
      min_age: offer.min_age !== null ? String(offer.min_age) : "",
      cancellation_policy: offer.cancellation_policy ?? "",
    });
    const imgs = (offer.images?.filter((s) => s.startsWith("http") || s.startsWith("data:")) ?? []);
    setEditImages(imgs.map((src) => ({ src })));
    setEditCoverIdx(0);
    setEditTitleError(""); setEditError("");
    setEditMode(false); setSliderIdx(0);
    setShowEditMap(false);
    setEditMapLat(offer.meeting_lat ?? null);
    setEditMapLng(offer.meeting_lng ?? null);
    setEditModalOpen(true);
    // Fetcher les détails enrichis (collaborateurs) en arrière-plan
    apiFetch<OfferFull>(`/guide/offers/${offer.id}/detail`, { headers: { Authorization: `Bearer ${token}` } })
      .then((detail) => {
        const collabs = (detail.details as any)?.collaborators;
        if (Array.isArray(collabs) && collabs.length > 0) {
          setViewOffer((prev) => prev ? { ...prev, details: { ...(prev.details ?? {}), collaborators: collabs } } : prev);
        }
      })
      .catch(() => {});
  }

  function closeEditModal() {
    setEditModalOpen(false); setEditMode(false); setViewOffer(null);
    setEditTitleError(""); setEditError("");
    setShowEditMap(false); setEditMapLat(null); setEditMapLng(null);
  }

  async function handleDeleteOffer() {
    if (!viewOffer) return;
    if (!confirm(`Supprimer l'offre "${viewOffer.title}" ? Cette action est irréversible.`)) return;
    setOfferDeleting(true);
    try {
      await apiFetch(`/guide/offers/${viewOffer.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setOffers((prev) => prev.filter((o) => o.id !== viewOffer.id));
      closeEditModal();
    } catch { alert("Erreur lors de la suppression."); }
    finally { setOfferDeleting(false); }
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
          title: editForm.title.trim(), offer_type: editForm.offer_type || undefined,
          description: editForm.description.trim() || undefined,
          price: editForm.price ? Number(editForm.price) : undefined,
          duration: editForm.duration.trim() || undefined,
          region: editForm.region.trim() || undefined,
          inclusions: editForm.inclusions.trim() || undefined,
          meeting_point: editForm.meeting_point.trim() || undefined,
          meeting_lat: editMapLat ?? undefined,
          meeting_lng: editMapLng ?? undefined,
          min_group_size: editForm.min_group_size ? Number(editForm.min_group_size) : undefined,
          max_group_size: editForm.max_group_size ? Number(editForm.max_group_size) : undefined,
          min_age: editForm.min_age ? Number(editForm.min_age) : undefined,
          cancellation_policy: editForm.cancellation_policy.trim() || undefined,
          status: editForm.status,
        }),
      });
      const finalImageSrcs = (await Promise.all(
        editImages.map(async (img) => {
          if (img.file) { try { return await uploadImage(img.file); } catch { return null; } }
          return img.src.startsWith("http") ? img.src : null;
        })
      )).filter((url): url is string => url !== null);
      const coverSrc = finalImageSrcs[editCoverIdx] ?? finalImageSrcs[0] ?? null;
      const orderedImages = coverSrc
        ? [coverSrc, ...finalImageSrcs.filter((_, i) => i !== finalImageSrcs.indexOf(coverSrc))]
        : finalImageSrcs;
      await apiFetch<Offer>(`/offers/${editOfferId}`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ images: orderedImages.length ? orderedImages : [] }),
      }).catch(() => {});
      const finalUpdated: Offer = { ...updated, images: finalImageSrcs.length ? finalImageSrcs : null, cover_image: orderedImages[0] ?? null };
      setOffers((prev) => prev.map((o) => o.id === editOfferId ? finalUpdated : o));
      setViewOffer(finalUpdated);
      setEditMode(false);
    } catch (err: any) {
      setEditError(err.message || "Erreur lors de la sauvegarde.");
    } finally { setEditSaving(false); }
  }

  // ── Edit profile ─────────────────────────────────────────────────────────

  function openEditProfile() {
    if (!profile) return;
    setEditProfileForm({
      full_name:        profile.full_name       ?? "",
      bio:              profile.bio             ?? "",
      years_experience: profile.years_experience !== null ? String(profile.years_experience) : "",
      telephone:        profile.telephone       ?? "",
      ville_residence:  profile.ville_residence ?? "",
      experience_pro:   profile.experience_pro  ?? "",
      centres_interet:  profile.centres_interet ?? "",
      pourquoi_moi:     profile.pourquoi_moi    ?? "",
    });
    setEditProfilePhoto(profile.photo       ? { preview: profile.photo }       : null);
    setEditProfileCover(profile.cover_photo ? { preview: profile.cover_photo } : null);
    setEditLangsSpoken(profile.languages_spoken ?? []);
    setEditDomaines(profile.domaines ?? []);
    setEditExpertises(profile.expertises ?? []);
    const allCerts = (profile.certifications ?? []).map((c) => ({ label: c.label, proof: c.proof ?? "" }));
    setEditCertifications(allCerts);
    setCustomCertPool(allCerts.filter((c) => !CERTIFICATIONS_LIST.includes(c.label)));
    setEditZonesCouvertes(profile.zones_couvertes ?? []);
    setEditVillesCouvertes(profile.villes_couvertes ?? []);
    setEditSitesMaitrises(profile.sites_maitrises ?? []);
    setEditDeplacementPossible(profile.deplacement_possible ?? null);
    setEditPublicsAccueillis(profile.publics_accueillis ?? []);
    setEditProfileError("");
    setEditProfileOpen(true);
  }

  function closeEditProfile() { setEditProfileOpen(false); setEditProfileError(""); }

  function toggleDomaineEdit(v: string) {
    if (editDomaines.includes(v)) {
      const removed = editDomaines.filter((x) => x !== v);
      const removedExps = EXPERTISES_PAR_DOMAINE_EDIT[v] ?? [];
      const remainingExps = [...new Set(removed.flatMap((d) => EXPERTISES_PAR_DOMAINE_EDIT[d] ?? []))];
      setEditDomaines(removed);
      setEditExpertises(editExpertises.filter((e) => remainingExps.includes(e) || !removedExps.includes(e)));
    } else {
      setEditDomaines([...editDomaines, v]);
    }
  }

  async function handleSaveProfile(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editProfileForm.full_name.trim()) { setEditProfileError("Le nom complet est obligatoire."); return; }
    setEditProfileError(""); setEditProfileSaving(true);
    try {
      let photoUrl: string | undefined = profile?.photo ?? undefined;
      let coverUrl: string | undefined = profile?.cover_photo ?? undefined;
      if (editProfilePhoto?.file) photoUrl = await uploadImage(editProfilePhoto.file);
      else if (editProfilePhoto === null) photoUrl = undefined;
      if (editProfileCover?.file) coverUrl = await uploadImage(editProfileCover.file);
      else if (editProfileCover === null) coverUrl = undefined;

      const headers = { Authorization: `Bearer ${token}` };

      await Promise.all([
        // Étape 1 + 4 : identité + présentation
        apiFetch("/guide/identity", {
          method: "POST", headers,
          body: JSON.stringify({
            full_name:       editProfileForm.full_name.trim(),
            bio:             editProfileForm.bio.trim()             || undefined,
            photo:           photoUrl,
            languages_spoken: editLangsSpoken,
            years_experience: editProfileForm.years_experience !== "" ? Number(editProfileForm.years_experience) : undefined,
            telephone:       editProfileForm.telephone.trim()       || undefined,
            ville_residence: editProfileForm.ville_residence.trim() || undefined,
            experience_pro:  editProfileForm.experience_pro.trim()  || undefined,
            centres_interet: editProfileForm.centres_interet.trim() || undefined,
            pourquoi_moi:    editProfileForm.pourquoi_moi.trim()    || undefined,
          }),
        }),
        // Étape 2 : domaines + expertises + certifications
        apiFetch("/guide/certifications", {
          method: "PATCH", headers,
          body: JSON.stringify({
            certifications: editCertifications.filter((c) => c.label.trim()),
            domaines: editDomaines,
            expertises: editExpertises,
            assurance: null,
          }),
        }),
        // Étape 3 : zones + services
        apiFetch("/guide/services", {
          method: "PATCH", headers,
          body: JSON.stringify({
            zones_couvertes: editZonesCouvertes,
            villes_couvertes: editVillesCouvertes,
            sites_maitrises: editSitesMaitrises,
            deplacement_possible: editDeplacementPossible,
            publics_accueillis: editPublicsAccueillis,
          }),
        }),
        // Photo de couverture via l'ancien endpoint si changée
        coverUrl !== profile?.cover_photo
          ? apiFetch("/guide/profile", {
              method: "POST", headers,
              body: JSON.stringify({ full_name: editProfileForm.full_name.trim(), cover_photo: coverUrl }),
            }).catch(() => {})
          : Promise.resolve(),
      ]);

      setProfile((prev) => prev ? {
        ...prev,
        full_name:             editProfileForm.full_name.trim(),
        bio:                   editProfileForm.bio.trim() || null,
        photo:                 photoUrl ?? null,
        cover_photo:           coverUrl ?? null,
        languages_spoken:      editLangsSpoken,
        years_experience:      editProfileForm.years_experience !== "" ? Number(editProfileForm.years_experience) : null,
        telephone:             editProfileForm.telephone.trim() || null,
        ville_residence:       editProfileForm.ville_residence.trim() || null,
        experience_pro:        editProfileForm.experience_pro.trim() || null,
        centres_interet:       editProfileForm.centres_interet.trim() || null,
        pourquoi_moi:          editProfileForm.pourquoi_moi.trim() || null,
        domaines:              editDomaines,
        expertises:            editExpertises,
        certifications:        editCertifications,
        zones_couvertes:       editZonesCouvertes,
        villes_couvertes:      editVillesCouvertes,
        sites_maitrises:       editSitesMaitrises,
        deplacement_possible:  editDeplacementPossible,
        publics_accueillis:    editPublicsAccueillis,
      } : prev);
      setEditProfileOpen(false);
    } catch (err: any) {
      setEditProfileError(err.message || "Erreur lors de la sauvegarde.");
    } finally { setEditProfileSaving(false); }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!profile) return null;

  const AvatarImg = () =>
    profile.photo ? (
      <img src={profile.photo} alt="" className="w-full h-full object-cover" />
    ) : (
      <span className="material-symbols-outlined text-primary text-5xl">person</span>
    );

  const roleLabel = profile.guide_type
    ? GUIDE_TYPE_LABELS[profile.guide_type] ?? profile.guide_type
    : scoreLabel(profile.sustainability_score);

  // ─── Offer card ─────────────────────────────────────────────────────────────
  const OfferCard = ({ offer }: { offer: Offer }) => {
    const typeData = OFFER_TYPES.find((t) => t.value === offer.offer_type) ?? OFFER_TYPES[0];
    const statusLabel = offer.status === "approved" ? "Active" : offer.status === "pending" ? "En attente" : offer.status === "draft" ? "Brouillon" : offer.status === "attente_publication" ? "Prêt à publier" : "Refusée";
    const statusClass = offer.status === "approved" ? "bg-primary text-white border-white/20" : offer.status === "pending" ? "bg-amber-500 text-white border-white/20" : offer.status === "draft" ? "bg-slate-400 text-white border-white/20" : offer.status === "attente_publication" ? "bg-teal-600 text-white border-white/20" : "bg-red-500 text-white border-white/20";
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
                {offer.duration && <span className="text-slate-400 text-[10px] font-bold block leading-none">/{offer.duration}</span>}
              </div>
            )}
          </div>
          <div className="lg:w-3/5 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight leading-tight">{offer.title}</h3>
              </div>
              {offer.description && <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">{offer.description}</p>}
              <div className="flex flex-wrap gap-2.5 mb-4">
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-xl px-3 py-1 text-[11px] font-extrabold tracking-wider flex items-center gap-1 uppercase">
                  <Sparkles size={11} className="text-emerald-500 shrink-0" />{typeData.label}
                </span>
              </div>
              {offer.sustainability_score !== null ? (
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
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setOqOfferId(offer.id); setOqStep(0); setOqAnswers({}); setOqOpen(true); }}
                  className="w-full border border-dashed border-primary/40 text-primary text-[11px] font-bold py-1.5 rounded-xl hover:bg-primary/5 transition-colors mb-1"
                >
                  🌿 Évaluer la durabilité
                </button>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-3">
              <p className="text-[11px] font-bold text-slate-400">
                {new Date(offer.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <button onClick={() => openEditModal(offer)}
                className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        {offer.status === "approved" && (
          <PubInteractions
            pubId={offer.id}
            token={token}
            viewerId={profile?.user_id ?? ""}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/guide/${profile?.user_id}?offer=${offer.id}`}
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
                  const detail = await apiFetch<OfferFull>(`/guide/offers/${offer.id}/detail`, { headers: { Authorization: `Bearer ${token}` } });
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

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    {/* ══ MODAL CONFIRMATION PUBLICATION ════════════════════════════════════ */}
    {publishOfferModal && (
      <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-3xl h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
          {/* Bouton fermeture flottant */}
          <button onClick={() => setPublishOfferModal(null)}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors">
            <X size={16} className="text-white" />
          </button>

          {/* Body scrollable */}
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

          {/* Footer */}
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
                  await apiFetch(`/guide/offers/${publishOfferModal.offer.id}/publish`, {
                    method: "POST", headers: { Authorization: `Bearer ${token}` },
                  });
                  setOffers((prev) => prev.map((o) => o.id === publishOfferModal.offer.id ? { ...o, status: "approved" } : o));
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

    {/* ══ MODAL SIGNALEMENT RÉSEAU ═══════════════════════════════════════════ */}
    {netReport && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Flag size={16} className="text-red-500" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Signaler {netReport.name}</p>
              <p className="text-xs text-slate-400">Choisissez un motif</p>
            </div>
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
            <button onClick={() => { setNetReport(null); setNetReportReason(""); }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Annuler</button>
            <button onClick={handleNetReport} disabled={!netReportReason || netReportSending}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50">
              {netReportSending ? "Envoi…" : "Signaler"}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="min-h-screen bg-slate-50/70 pb-20" onClick={() => setNetMenuId(null)}>

      {/* ══ TOP NAV ══════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all">
            <ArrowLeft size={16} />Retour
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
                  <p className="text-slate-400 text-xs mt-0.5">Mettez à jour vos informations de guide</p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <form id="edit-profile-form" onSubmit={handleSaveProfile} className="px-8 py-6 space-y-5">

                {/* ── PHOTOS ──────────────────────────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="material-symbols-outlined text-primary text-lg">photo_camera</span>
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Photos</h4>
                  </div>

                  {/* Cover */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photo de couverture</label>
                    <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-teal-100 via-emerald-50 to-slate-100 border-2 border-dashed border-slate-200 group">
                      {editProfileCover
                        ? <img src={editProfileCover.preview} alt="" className="w-full h-full object-cover" />
                        : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                            <p className="text-xs font-semibold text-slate-400">Ajouter une photo de couverture</p>
                          </div>
                      }
                      <label htmlFor="cover-upload" className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 text-3xl transition-opacity">edit</span>
                      </label>
                      <input id="cover-upload" type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          if (editProfileCover?.file) URL.revokeObjectURL(editProfileCover.preview);
                          setEditProfileCover({ file, preview: URL.createObjectURL(file) });
                          e.target.value = "";
                        }}
                      />
                      {editProfileCover && (
                        <button type="button"
                          onClick={() => { if (editProfileCover.file) URL.revokeObjectURL(editProfileCover.preview); setEditProfileCover(null); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center z-10">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Photo de profil */}
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
                        <label htmlFor="photo-upload" className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer">
                          <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 text-xl transition-opacity">edit</span>
                        </label>
                        <input id="photo-upload" type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
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
                </div>

                {/* ── INFORMATIONS PERSONNELLES ─────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="material-symbols-outlined text-primary text-lg">person</span>
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Informations personnelles</h4>
                  </div>

                  {/* Nom complet */}
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

                  {/* Ville résidence + Téléphone */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Ville de résidence</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">location_city</span>
                        <input type="text" placeholder="Tunis, Sfax…"
                          value={editProfileForm.ville_residence}
                          onChange={(e) => setEditProfileForm((f) => ({ ...f, ville_residence: e.target.value }))}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Téléphone</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">phone</span>
                        <input type="tel" placeholder="+216 XX XXX XXX"
                          value={editProfileForm.telephone}
                          onChange={(e) => setEditProfileForm((f) => ({ ...f, telephone: e.target.value }))}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Langues parlées */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Langues parlées</label>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES_LIST.map(({ value, label }) => {
                        const active = editLangsSpoken.includes(value);
                        return (
                          <button key={value} type="button"
                            onClick={() => setEditLangsSpoken((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                            {active && <Check size={10} className="inline mr-1" />}{label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Années d'expérience */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Années d'expérience</label>
                    <div className="relative">
                      <Star size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="number" min="0" max="50" placeholder="5"
                        value={editProfileForm.years_experience}
                        onChange={(e) => setEditProfileForm((f) => ({ ...f, years_experience: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* ── EXPERTISE ─────────────────────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="material-symbols-outlined text-primary text-lg">workspace_premium</span>
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Expertise</h4>
                  </div>

                  {/* Domaines */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Vos domaines *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DOMAINES_PRINCIPAUX_EDIT.map((d) => {
                        const active = editDomaines.includes(d.value);
                        return (
                          <button key={d.value} type="button" onClick={() => toggleDomaineEdit(d.value)}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${active ? "border-primary bg-primary/8 shadow-sm" : "border-slate-100 bg-white hover:border-primary/30 hover:bg-primary/3"}`}>
                            <span className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${active ? "text-primary" : "text-slate-400"}`}>{d.icon}</span>
                            <div className="min-w-0">
                              <p className={`text-xs font-extrabold leading-tight ${active ? "text-slate-900" : "text-slate-600"}`}>{d.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">{d.desc}</p>
                            </div>
                            {active && (
                              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0 ml-auto">
                                <Check size={9} className="text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expertises groupées par domaine */}
                  {editDomaines.length > 0 && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase block">Vos expertises</label>
                      {editDomaines.map((d) => {
                        const domaineMeta = DOMAINES_PRINCIPAUX_EDIT.find((x) => x.value === d);
                        const exps = EXPERTISES_PAR_DOMAINE_EDIT[d] ?? [];
                        return (
                          <div key={d}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <span className="material-symbols-outlined text-base text-primary">{domaineMeta?.icon ?? "label"}</span>
                              <span className="text-xs font-extrabold text-primary uppercase tracking-wide">{domaineMeta?.label ?? d}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {exps.map((s) => {
                                const active = editExpertises.includes(s);
                                return (
                                  <button key={s} type="button"
                                    onClick={() => setEditExpertises((prev) => active ? prev.filter((x) => x !== s) : [...prev, s])}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}>
                                    {s}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Certifications */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Certifications</label>
                    <div className="space-y-2">
                      {(() => {
                        const allCerts = [
                          ...CERTIFICATIONS_LIST.map((label) => ({ label, isCustom: false })),
                          ...customCertPool.map((c) => ({ label: c.label, isCustom: true })),
                        ];
                        return allCerts.map(({ label, isCustom }) => {
                          const active = editCertifications.some((c) => c.label === label);
                          const certObj = editCertifications.find((c) => c.label === label);
                          return (
                            <div key={label} className={`rounded-xl border-2 overflow-hidden transition-all ${active ? "border-primary bg-primary/5" : "border-slate-100 bg-white hover:border-primary/30"}`}>
                              <button type="button"
                                onClick={() => {
                                  if (active) {
                                    setEditCertifications(editCertifications.filter((c) => c.label !== label));
                                  } else {
                                    const poolEntry = customCertPool.find((c) => c.label === label);
                                    setEditCertifications([...editCertifications, { label, proof: poolEntry?.proof ?? "" }]);
                                  }
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary bg-primary" : "border-slate-300"}`}>
                                  {active && <Check size={10} className="text-white" />}
                                </div>
                                <span className={active ? "text-slate-900" : "text-slate-600"}>{label}</span>
                                {isCustom && <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Personnalisé</span>}
                              </button>
                              {active && (
                                <div className="px-4 pb-3 space-y-2">
                                  {isCustom && (
                                    <div className="relative">
                                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">edit</span>
                                      <input
                                        type="text"
                                        value={label}
                                        onChange={(e) => {
                                          const newLabel = e.target.value;
                                          setEditCertifications(editCertifications.map((c) => c.label === label ? { ...c, label: newLabel } : c));
                                          setCustomCertPool(customCertPool.map((c) => c.label === label ? { ...c, label: newLabel } : c));
                                        }}
                                        placeholder="Nom de la certification"
                                        className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-700 placeholder:text-slate-400 font-medium"
                                      />
                                    </div>
                                  )}
                                  <ProofInput
                                    proof={certObj?.proof ?? ""}
                                    onChange={(v) => {
                                      setEditCertifications(editCertifications.map((c) => c.label === label ? { ...c, proof: v } : c));
                                      setCustomCertPool(customCertPool.map((c) => c.label === label ? { ...c, proof: v } : c));
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                      <button type="button"
                        onClick={() => {
                          const newCert = { label: "", proof: "" };
                          setCustomCertPool([...customCertPool, newCert]);
                          setEditCertifications([...editCertifications, newCert]);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-primary/40 hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-base">add</span>
                        Ajouter une certification personnalisée
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── ZONE D'ACTIVITÉ ───────────────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="material-symbols-outlined text-primary text-lg">map</span>
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Zone d'activité</h4>
                  </div>

                  {/* Zones couvertes */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Zones couvertes</label>
                    <div className="flex flex-wrap gap-2">
                      {ZONES_COUVERTES_EDIT.map(({ value, label }) => {
                        const active = editZonesCouvertes.includes(value);
                        return (
                          <button key={value} type="button"
                            onClick={() => setEditZonesCouvertes((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                            {active && <Check size={10} className="inline mr-1" />}{label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Villes & lieux couverts */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Villes & lieux couverts</label>
                    <MultiLocationPicker value={editVillesCouvertes} onChange={setEditVillesCouvertes} />
                  </div>

                  {/* Sites maîtrisés */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Sites maîtrisés</label>
                    <MultiLocationPicker value={editSitesMaitrises} onChange={setEditSitesMaitrises} />
                  </div>

                  {/* Déplacement hors zone */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Déplacement hors zone possible ?</label>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setEditDeplacementPossible(true)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold border-2 transition-all ${editDeplacementPossible === true ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40 bg-white"}`}>
                        <span className="material-symbols-outlined text-base">check_circle</span>Oui
                      </button>
                      <button type="button" onClick={() => setEditDeplacementPossible(false)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold border-2 transition-all ${editDeplacementPossible === false ? "bg-slate-700 border-slate-700 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400 bg-white"}`}>
                        <span className="material-symbols-outlined text-base">cancel</span>Non
                      </button>
                    </div>
                  </div>

                  {/* Publics accueillis */}
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Publics accueillis</label>
                    <div className="flex flex-wrap gap-2">
                      {PUBLICS_ACCUEILLIS_EDIT.map(({ value, label, icon }) => {
                        const active = editPublicsAccueillis.includes(value);
                        return (
                          <button key={value} type="button"
                            onClick={() => setEditPublicsAccueillis((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                            <span className="material-symbols-outlined text-sm">{icon}</span>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── PRÉSENTATION ──────────────────────────── */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Présentation</h4>
                  </div>

                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Bio / Présentation courte</label>
                    <textarea rows={3} placeholder="Guide spécialisé en écotourisme dans le sud tunisien…"
                      value={editProfileForm.bio}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, bio: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Expérience professionnelle</label>
                    <textarea rows={3} placeholder="Décrivez votre parcours et vos expériences significatives…"
                      value={editProfileForm.experience_pro}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, experience_pro: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Centres d'intérêt</label>
                    <textarea rows={2} placeholder="Nature, photographie, anthropologie, cuisine locale…"
                      value={editProfileForm.centres_interet}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, centres_interet: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Pourquoi me choisir ?</label>
                    <textarea rows={3} placeholder="Ce qui me distingue des autres guides…"
                      value={editProfileForm.pourquoi_moi}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, pourquoi_moi: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
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

      {/* ══ OFFER DETAIL / EDIT MODAL ════════════════════════════════════════ */}
      {editModalOpen && viewOffer && (() => {
        const sliderImgs = viewOffer.images?.length ? viewOffer.images : viewOffer.cover_image ? [viewOffer.cover_image] : [];
        const td = OFFER_TYPES.find((t) => t.value === viewOffer.offer_type) ?? OFFER_TYPES[0];
        const safeIdx = Math.min(sliderIdx, Math.max(sliderImgs.length - 1, 0));
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
              <button onClick={closeEditModal}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors">
                <X size={16} />
              </button>

              {!editMode ? (
                <>
                  {/* ── HERO: cover image + gradient overlay + titre ── */}
                  <div className="relative shrink-0 select-none"
                    onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                    onTouchEnd={(e) => {
                      if (touchStartX === null || sliderImgs.length <= 1) return;
                      const diff = touchStartX - e.changedTouches[0].clientX;
                      if (Math.abs(diff) > 40) setSliderIdx((i) => diff > 0 ? Math.min(i + 1, sliderImgs.length - 1) : Math.max(i - 1, 0));
                      setTouchStartX(null);
                    }}>
                    <div className="h-56 overflow-hidden">
                      {sliderImgs.length > 0 ? (
                        <div className="flex h-full transition-transform duration-300 ease-out"
                          style={{ transform: `translateX(-${(safeIdx / sliderImgs.length) * 100}%)`, width: `${sliderImgs.length * 100}%` }}>
                          {sliderImgs.map((src, i) => (
                            <div key={i} className="h-full" style={{ width: `${100 / sliderImgs.length}%` }}>
                              <img src={src} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${td.gradient} flex items-center justify-center`}>
                          <span className="material-symbols-outlined text-white/25" style={{ fontSize: 110 }}>{td.icon}</span>
                        </div>
                      )}
                    </div>
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                    {/* Titre + meta en bas de l'image */}
                    {(() => {
                      const dv = (viewOffer.details ?? {}) as Record<string, any>;
                      const lv: string[] = Array.isArray(dv.langue_guidage) ? dv.langue_guidage : [];
                      const PREST: Record<string, string> = { visite_guidee: "Visite guidée", randonnee: "Randonnée", excursion: "Excursion", atelier: "Atelier", transfert: "Transfert", sur_mesure: "Sur mesure" };
                      const DIFF: Record<string, string> = { facile: "Facile ✦", moderee: "Modérée ✦✦", difficile: "Difficile ✦✦✦", tres_difficile: "Très difficile ✦✦✦✦" };
                      return (
                        <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {dv.type_prestation && <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-slate-900 px-2 py-0.5 rounded-lg">{PREST[dv.type_prestation] ?? dv.type_prestation}</span>}
                            {lv.map(l => <span key={l} className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-lg backdrop-blur-sm">{l}</span>)}
                          </div>
                          <h2 className="text-xl font-extrabold text-white leading-tight drop-shadow">{viewOffer.title}</h2>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {viewOffer.price !== null && <span className="text-sm font-black text-primary drop-shadow">{viewOffer.price} DT</span>}
                            {viewOffer.region && <span className="flex items-center gap-1 text-[11px] font-bold text-white/90"><span className="material-symbols-outlined text-sm">location_on</span>{viewOffer.region}</span>}
                            {dv.difficulte_physique && <span className="text-[11px] font-bold text-white/90">{DIFF[dv.difficulte_physique] ?? dv.difficulte_physique}</span>}
                          </div>
                        </div>
                      );
                    })()}
                    {/* Navigation arrows */}
                    {sliderImgs.length > 1 && (
                      <>
                        <button type="button" onClick={() => setSliderIdx((i) => Math.max(i - 1, 0))} disabled={safeIdx === 0}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                          <ChevronLeft size={18} />
                        </button>
                        <button type="button" onClick={() => setSliderIdx((i) => Math.min(i + 1, sliderImgs.length - 1))} disabled={safeIdx === sliderImgs.length - 1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                          <ChevronRight size={18} />
                        </button>
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {sliderImgs.map((_, i) => (
                            <button key={i} type="button" onClick={() => setSliderIdx(i)}
                              className={`h-1.5 rounded-full transition-all duration-200 ${i === safeIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── BODY scrollable ── */}
                  <div className="overflow-y-auto flex-1 p-5 space-y-6">
                    {(() => {
                      const d = (viewOffer.details ?? {}) as Record<string, any>;
                      const GUIDAGE: Record<string,string> = { guidage_seul:"Guidage seul", avec_transport:"+ Transport", transport_repas:"+ Transport & Repas", immersion:"Immersion complète", sur_mesure:"Sur mesure" };
                      const PREST: Record<string,string> = { visite_guidee:"Visite guidée", randonnee:"Randonnée", excursion:"Excursion", atelier:"Atelier", transfert:"Transfert", sur_mesure:"Sur mesure" };
                      const CONF: Record<string,string> = { instant:"Instantanée", manual:"Manuelle", conditional:"Sous conditions" };
                      const ANNUL: Record<string,string> = { flexible:"Flexible", moderate:"Modérée", stricte:"Stricte", non_remboursable:"Non remboursable" };
                      const PUBLIC_ICONS: Record<string,string> = { familles:"family_restroom", adultes:"person", seniors:"elderly", enfants:"child_care", groupes:"groups", photographes:"photo_camera", tous_publics:"diversity_3" };
                      const PUBLIC_LABELS_V: Record<string,string> = { familles:"Familles", adultes:"Adultes", seniors:"Seniors", enfants:"Enfants", groupes:"Groupes", photographes:"Photographes", tous_publics:"Tous publics" };
                      const langs: string[] = Array.isArray(d.langue_guidage) ? d.langue_guidage : [];
                      const inclus: string[] = Array.isArray(d.inclus_resume) ? d.inclus_resume : (viewOffer.inclusions ? viewOffer.inclusions.split("||") : []);
                      const pointsForts: string[] = Array.isArray(d.points_forts) ? d.points_forts : [];
                      const lieux: string[] = Array.isArray(d.lieux_visites) ? d.lieux_visites : [];
                      const expertises: string[] = Array.isArray(d.expertises_offre) ? d.expertises_offre : [];
                      const publicRec: string[] = Array.isArray(d.public_recommande) ? d.public_recommande : [];
                      const allImages = viewOffer.images?.filter((s) => s?.startsWith("http") || s?.startsWith("data:")) ?? [];
                      const domDetails = d.domaine_details as Record<string,any> | null | undefined;

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
                        <>
                          {/* Photo strip */}
                          {allImages.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-0.5">
                              {allImages.map((src, i) => (
                                <button key={i} type="button" onClick={() => setSliderIdx(i)} className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === safeIdx ? "border-primary" : "border-transparent opacity-60"}`}>
                                  <img src={src} alt="" className="w-full h-full object-cover"/>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Présentation */}
                          <section>
                            <SH icon="description" title="Présentation de l'offre"/>
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
                                    <p className="text-xs font-extrabold text-slate-700 leading-tight">{PREST[d.type_prestation]??d.type_prestation}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {viewOffer.description && <p className="text-sm text-slate-600 leading-relaxed mb-2">{viewOffer.description}</p>}
                            {d.description_longue && <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line mb-4">{String(d.description_longue)}</p>}
                            {d.difficulte_physique && (
                              <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 w-fit">
                                <span className="material-symbols-outlined text-primary text-sm">fitness_center</span>
                                <span className="text-xs font-bold text-slate-600">Niveau d'expérience : <span className="text-slate-800">{d.difficulte_physique}</span></span>
                              </div>
                            )}
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
                            {publicRec.length>0 && (
                              <div>
                                <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-secondary/60 text-sm">groups</span>Public recommandé
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {publicRec.map(p=>(
                                    <div key={p} className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 rounded-2xl px-3 py-2">
                                      <span className="material-symbols-outlined text-secondary text-base">{PUBLIC_ICONS[p]??'person'}</span>
                                      <span className="text-xs font-bold text-secondary">{PUBLIC_LABELS_V[p]??p}</span>
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
                              expertises:  { border:"border-secondary/70", text:"text-secondary",    icon:"eco"       },
                              types:       { border:"border-secondary/70", text:"text-secondary",    icon:"landscape" },
                              experiences: { border:"border-secondary/70", text:"text-secondary",    icon:"explore"   },
                              supports:    { border:"border-secondary/70", text:"text-secondary",    icon:"backpack"  },
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
                                              <div className="flex flex-wrap gap-1.5">
                                                {tExps.map(e=>(
                                                  <span key={e} className="bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold px-2.5 py-1.5 rounded-xl">{e}</span>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {selExp.map(e=>(
                                          <span key={e} className="bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold px-2.5 py-1.5 rounded-xl">{e}</span>
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
                            {viewOffer.meeting_point && (
                              <>
                                  <div className="flex items-start gap-3 mb-3">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-emerald-600 text-sm">location_on</span>
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Point de départ / Point de rendez-vous</p>
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{viewOffer.meeting_point}</p>
                                    {d.lieu_precis && d.lieu_precis!==viewOffer.meeting_point && <p className="text-xs text-slate-500 mt-1">{d.lieu_precis}</p>}
                                  </div>
                                </div>
                              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-3">
                                  <MeetingMap lat={viewOffer.meeting_lat} lng={viewOffer.meeting_lng} fallbackLat={d.lieu_lat as number|null} fallbackLng={d.lieu_lng as number|null} address={viewOffer.meeting_point ?? ""}/>
                                </div>
                              </>
                            )}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {d.heure_depart && d.heure_depart!=="00:00" && (
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                                  <span className="material-symbols-outlined text-primary text-sm">alarm</span>
                                  <div><p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Heure de départ</p><p className="text-xs font-bold text-slate-700">{d.heure_depart}</p></div>
                                </div>
                              )}
                            </div>
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
                                { icon:"groups", label:"Nb max. participants", val: (d.nb_participants_max!=null||viewOffer.max_group_size) ? String(d.nb_participants_max??viewOffer.max_group_size) : null },
                                { icon:"child_care", label:"Âge minimum", val: (d.age_minimum!=null||viewOffer.min_age) ? `${d.age_minimum??viewOffer.min_age} ans` : null },
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
                                    {days_of_week.length>0 && (
                                      <div>
                                        <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                          <span className="material-symbols-outlined text-primary text-sm">view_week</span>Jours disponibles
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {days_of_week.map(dw=>{
                                            const label = FR_DAYS_DISPLAY[parseInt(dw)] ?? dw;
                                            return <span key={dw} className="bg-primary/10 text-primary text-xs font-black px-3 py-1.5 rounded-xl">{label}</span>;
                                          })}
                                        </div>
                                      </div>
                                    )}
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
                            {(() => {
                              const collabs = Array.isArray(d.collaborators) ? (d.collaborators as Array<{id:string;name:string;section:string;status?:string}>) : [];
                              const collabFor = (section: string) => collabs.find(c => c.section === section && c.status !== "declined");
                              const CollabBadge = ({ section }: { section: string }) => {
                                const c = collabFor(section);
                                if (!c) return null;
                                const st = c.status ?? "pending";
                                const cls = st === "declined" ? "bg-red-50 border-red-200 text-red-600" : st === "pending" ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-teal-50 border-teal-200 text-teal-700";
                                const icon = st === "declined" ? "cancel" : st === "pending" ? "schedule" : "check_circle";
                                return (
                                  <span className={`ml-auto flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
                                    <span className="material-symbols-outlined text-[11px]">{icon}</span>
                                    {st === "declined" || st === "pending" ? `${c.name} · ${st === "declined" ? "Refusé" : "En attente"}` : c.name}
                                  </span>
                                );
                              };
                              return (
                            <div className="space-y-3">
                              {d.transport_inclus===true && (
                                <div className="border border-secondary/20 rounded-2xl overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-3 bg-secondary/5 border-b border-secondary/20">
                                    <span className="material-symbols-outlined text-secondary text-lg">directions_bus</span>
                                    <p className="text-xs font-extrabold text-secondary">Transport</p>
                                    <CollabBadge section="transport" />
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
                                <div className="border border-emerald-100 rounded-2xl overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                                    <span className="material-symbols-outlined text-emerald-600 text-lg">restaurant</span>
                                    <p className="text-xs font-extrabold text-emerald-700">Restauration</p>
                                    <CollabBadge section="restauration" />
                                  </div>
                                  <div className="px-4 py-3 space-y-2">
                                    {Array.isArray(d.restauration_types)&&d.restauration_types.length>0 && (
                                      <div className="flex flex-wrap gap-1.5">{(d.restauration_types as string[]).map(t=><span key={t} className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{t}</span>)}</div>
                                    )}
                                    {d.restauration_svcs && Object.entries(d.restauration_svcs as Record<string,any>).map(([type,svc])=>{
                                      const flds: Record<string,any> = (svc as any)?.fields ?? {};
                                      const photos: string[] = (svc as any)?.photos ?? [];
                                      const fieldDefs = OFFER_DETAIL_FIELDS[type]?.sections?.flatMap((s: any) => s.fields) ?? [];
                                      return svc && (
                                        <div key={type} className="space-y-2">
                                          <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{type.replace(/_/g," ")}</span>
                                          {photos.length>0 && (
                                            <div className="flex gap-2 overflow-x-auto pb-1">
                                              {photos.slice(0,4).map((p,i)=><img key={i} src={p} alt="" className="h-20 w-28 object-cover rounded-lg shrink-0 border border-emerald-100"/>)}
                                            </div>
                                          )}
                                          <div className="space-y-1.5">
                                            {fieldDefs.filter((f: any)=>{const v=flds[f.key];if(v===null||v===undefined||v===''||v===false)return false;if(Array.isArray(v)&&!v.length)return false;if(f.conditionalOn&&flds[f.conditionalOn.field]!==f.conditionalOn.value)return false;return true;}).map((f: any)=>{const v=flds[f.key];return(
                                              <div key={f.key} className="flex flex-col gap-0.5">
                                                <p className="text-[9px] font-black tracking-widest text-emerald-600 uppercase">{f.label}</p>
                                                {Array.isArray(v)?<div className="flex flex-wrap gap-1.5">{v.map((it: string)=><span key={it} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg font-bold">{it}</span>)}</div>:v===true?<span className="text-xs text-slate-700 font-semibold">Oui</span>:<p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>}
                                              </div>
                                            );})}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {d.hebergement_inclus===true && (
                                <div className="border border-teal-100 rounded-2xl overflow-hidden">
                                  <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border-b border-teal-100">
                                    <span className="material-symbols-outlined text-teal-600 text-lg">hotel</span>
                                    <p className="text-xs font-extrabold text-teal-700">Hébergement</p>
                                    <CollabBadge section="hebergement" />
                                  </div>
                                  <div className="px-4 py-3 space-y-2">
                                    {Array.isArray(d.hebergement_types)&&d.hebergement_types.length>0 && (
                                      <div className="flex flex-wrap gap-1.5">{(d.hebergement_types as string[]).map(t=><span key={t} className="bg-teal-50 text-teal-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{t}</span>)}</div>
                                    )}
                                    {d.hebergement_svcs && Object.entries(d.hebergement_svcs as Record<string,any>).map(([type,svc])=>{
                                      const fieldDefs = OFFER_DETAIL_FIELDS[type]?.sections?.flatMap((s: any) => s.fields) ?? [];
                                      // HebergData: { units: [...] } — valeurs directement dans chaque unit
                                      // SimpleServiceData: { fields: {...}, photos: [...] }
                                      const isHeberg = (svc as any)?.units && Array.isArray((svc as any).units);
                                      const unitsToRender: Array<{flds: Record<string,any>; photos: string[]}> = isHeberg
                                        ? ((svc as any).units as Array<Record<string,any>>).map((u: Record<string,any>)=>({flds: u, photos: (u.photos as string[]) ?? []}))
                                        : [{flds: (svc as any)?.fields ?? {}, photos: (svc as any)?.photos ?? []}];
                                      return svc && (
                                        <div key={type} className="space-y-2">
                                          <span className="inline-flex items-center bg-teal-50 text-teal-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{type.replace(/_/g," ")}</span>
                                          {unitsToRender.map(({flds, photos}, ui)=>(
                                            <div key={ui} className="space-y-2">
                                              {unitsToRender.length>1 && <p className="text-[9px] font-black tracking-widest text-teal-600 uppercase">Unité {ui+1}</p>}
                                              {photos.length>0 && (
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                  {photos.slice(0,4).map((p,i)=><img key={i} src={p} alt="" className="h-20 w-28 object-cover rounded-lg shrink-0 border border-teal-100"/>)}
                                                </div>
                                              )}
                                              <div className="space-y-1.5">
                                                {fieldDefs.filter((f: any)=>{const v=flds[f.key];if(v===null||v===undefined||v===''||v===false)return false;if(Array.isArray(v)&&!v.length)return false;if(f.conditionalOn&&flds[f.conditionalOn.field]!==f.conditionalOn.value)return false;return true;}).map((f: any)=>{const v=flds[f.key];return(
                                                  <div key={f.key} className="flex flex-col gap-0.5">
                                                    <p className="text-[9px] font-black tracking-widest text-teal-700 uppercase">{f.label}</p>
                                                    {Array.isArray(v)?<div className="flex flex-wrap gap-1.5">{v.map((it: string)=><span key={it} className="text-[11px] bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-lg font-bold">{it}</span>)}</div>:v===true?<span className="text-xs text-slate-700 font-semibold">Oui</span>:<p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>}
                                                  </div>
                                                );})}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
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
                              );
                            })()}
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
                              {(viewOffer.cancellation_policy||d.politique_annulation) && (
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                  <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-slate-400 text-sm">policy</span>Politique d'annulation
                                  </p>
                                  <p className="text-sm font-bold text-slate-700 mb-1">{ANNUL[viewOffer.cancellation_policy??d.politique_annulation??'']??(viewOffer.cancellation_policy??d.politique_annulation)}</p>
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
                        </>
                      );
                    })()}
                  </div>

                  <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end shrink-0">
                    <button type="button" onClick={() => { setEditOfferModal(viewOffer); setEditModalOpen(false); }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-primary text-slate-900 font-extrabold rounded-2xl text-xs shadow-sm hover:bg-primary/90 transition-all active:scale-95">
                      <Edit3 size={14} />Gérer
                    </button>
                  </div>
                </>
              ) : (
                /* ── EDIT MODE ───────────────────────────────────────────── */
                <>
                  <div className="px-8 pt-7 pb-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-lg font-extrabold text-slate-800">Gérer l'offre</h3>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    <form id="edit-offer-form" onSubmit={handleSaveOffer} className="px-8 py-6 space-y-5">

                      {/* Type */}
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Type d'offre</label>
                        <div className="grid grid-cols-4 gap-2">
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

                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre *</label>
                        <input type="text" value={editForm.title}
                          onChange={(e) => { setEditForm((f) => ({ ...f, title: e.target.value })); setEditTitleError(""); }}
                          className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all ${editTitleError ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
                        />
                        {editTitleError && <p className="text-xs font-semibold text-red-500 mt-1">{editTitleError}</p>}
                      </div>

                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description</label>
                        <textarea rows={4} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none" />
                      </div>

                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Région / Emplacement</label>
                        <input type="text" placeholder="Tunis, Djerba, Sfax…" value={editForm.region} onChange={(e) => setEditForm((f) => ({ ...f, region: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white" />
                      </div>

                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Inclusions</label>
                        <textarea rows={3} value={editForm.inclusions} onChange={(e) => setEditForm((f) => ({ ...f, inclusions: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Point de départ</label>
                          <button type="button" onClick={() => setShowEditMap((v) => !v)}
                            className="flex items-center gap-1 text-[10px] font-extrabold text-primary hover:text-primary/80 transition-colors">
                            <MapPin size={12} />{showEditMap ? "Masquer" : "Carte"}
                          </button>
                        </div>
                        <input type="text" value={editForm.meeting_point} onChange={(e) => setEditForm((f) => ({ ...f, meeting_point: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white mb-2" />
                        {showEditMap && (
                          <MapPicker lat={editMapLat} lng={editMapLng}
                            onPick={(lat, lng, address) => { setEditMapLat(lat); setEditMapLng(lng); setEditForm((f) => ({ ...f, meeting_point: address })); }}
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Tarif (DT)</label>
                          <input type="number" min="0" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Durée</label>
                          <input type="text" value={editForm.duration} onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Max. pers.</label>
                          <input type="number" min="1" value={editForm.max_group_size} onChange={(e) => setEditForm((f) => ({ ...f, max_group_size: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Âge min.</label>
                          <input type="number" min="0" value={editForm.min_age} onChange={(e) => setEditForm((f) => ({ ...f, min_age: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white font-mono" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Annulation</label>
                        <textarea rows={2} value={editForm.cancellation_policy} onChange={(e) => setEditForm((f) => ({ ...f, cancellation_policy: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none" />
                      </div>


                      {/* Photos */}
                      <div>
                        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos</label>
                        <label htmlFor="edit-images-input"
                          className="flex flex-col items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                          <span className="material-symbols-outlined text-slate-300 text-2xl">add_photo_alternate</span>
                          <p className="text-xs font-semibold text-slate-400">Ajouter des photos</p>
                          <input id="edit-images-input" type="file" accept="image/*" multiple className="hidden"
                            onChange={(e) => {
                              const files = Array.from(e.target.files ?? []);
                              setEditImages((prev) => [...prev, ...files.map((f) => ({ src: URL.createObjectURL(f), file: f }))]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {editImages.length > 0 && (
                          <div className="mt-3 grid grid-cols-4 gap-2">
                            {editImages.map((img, i) => {
                              const isCover = i === editCoverIdx;
                              return (
                                <div key={i} onClick={() => setEditCoverIdx(i)}
                                  className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                                  <img src={img.src} alt="" className="w-full h-full object-cover" />
                                  {isCover && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                                  <button type="button"
                                    onClick={(e) => { e.stopPropagation(); setEditImages((prev) => prev.filter((_, idx) => idx !== i)); setEditCoverIdx((c) => c >= i && c > 0 ? c - 1 : c); }}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={10} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {editError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                          <span className="material-symbols-outlined text-red-500 text-base">error</span>
                          <p className="text-sm font-semibold text-red-600">{editError}</p>
                        </div>
                      )}
                    </form>
                  </div>
                  <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditMode(false)}
                        className="px-4 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
                        Retour
                      </button>
                      <button type="button" onClick={handleDeleteOffer} disabled={offerDeleting}
                        className="px-4 py-2.5 border border-red-200 text-red-600 bg-white rounded-2xl text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-60">
                        {offerDeleting ? "Suppression…" : "Supprimer"}
                      </button>
                    </div>
                    <button type="submit" form="edit-offer-form" disabled={editSaving}
                      className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-extrabold rounded-2xl text-xs shadow-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60">
                      {editSaving ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Sauvegarde…</> : <><Check size={14} />Enregistrer</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ── PROFILE HEADER ────────────────────────────────────────────────── */}
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
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800">{profile.full_name || "Guide"}</h1>
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
              <div className="flex items-center gap-2 shrink-0 mt-6 md:mt-0 self-center md:self-end">
                <button onClick={() => setShowCreateOffer(true)}
                  className="bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 hover:shadow-lg transition-all shadow-sm text-sm whitespace-nowrap">
                  <Plus size={16} strokeWidth={2.5} /><span>Créer une offre</span>
                </button>
                <button onClick={openEditProfile}
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 hover:shadow-sm active:scale-95 transition-all text-sm whitespace-nowrap">
                  <Edit3 size={15} /><span>Modifier</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── DASHBOARD COLUMNS ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT SIDEBAR ────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
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
                {profile.zone && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Globe size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Zone d'activité</p>
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
                {profile.years_experience !== null && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-slate-50 text-slate-400"><Star size={16} /></div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Expérience</p>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5">{profile.years_experience} ans</p>
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
                {!profile.country && !profile.zone && !profile.guide_type && (
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
                      const path = f._type === "eco_traveler" ? `/profile/ecovoyageur/${f.user_id}` : f._type === "project" ? `/profile/project-owner/${f.user_id}` : `/profile/guide/${f.user_id}`;
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

          {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/50">
              {[
                { key: "tout",           label: "Tout",           Icon: LayoutGrid },
                { key: "offres",         label: "Offres",         Icon: Tag },
                { key: "reseau",         label: "Réseau",         Icon: Users },
                { key: "apropos",        label: "À propos",       Icon: Info },
                { key: "agenda",         label: "Agenda",         Icon: Calendar },
                { key: "collaborations", label: "Collaborations", Icon: Users },
              ].map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveTab(key as Tab)}
                  className={`flex-1 min-w-[70px] py-3 px-4 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}>
                  <Icon size={14} strokeWidth={2.5} /><span>{label}</span>
                </button>
              ))}
            </div>

            {/* TAB: TOUT */}
            {activeTab === "tout" && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                  <Sparkles size={12} className="text-primary" /><span>Offres de guide</span>
                </h3>
                {offers.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-primary text-3xl">hiking</span>
                    </div>
                    <p className="text-slate-800 font-extrabold text-base mb-1">Aucune offre publiée</p>
                    <p className="text-slate-400 text-sm mb-5">Publiez votre première expérience guidée.</p>
                    <button onClick={() => setShowCreateOffer(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 shadow-sm">
                      <Plus size={16} />Créer une offre
                    </button>
                  </div>
                ) : (
                  offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)
                )}
              </div>
            )}

            {/* TAB: OFFRES */}
            {activeTab === "offres" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800">Offres disponibles ({offers.length})</h3>
                  <button onClick={() => setShowCreateOffer(true)} className="text-primary hover:text-primary/80 text-xs font-extrabold flex items-center gap-1">+ Créer une offre</button>
                </div>
                {offers.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                    <p className="text-slate-800 font-extrabold text-base">Aucune offre pour l'instant</p>
                    <p className="text-slate-400 text-sm mt-1">Publiez votre première expérience guidée.</p>
                  </div>
                ) : (
                  offers.map((offer) => (
                    <div key={offer.id} id={`offer-${offer.id}`}
                      className={`rounded-3xl transition-all duration-500 ${highlightOfferId === offer.id ? "ring-2 ring-primary/50 shadow-lg shadow-primary/10" : ""}`}>
                      <OfferCard offer={offer} />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: AMIS */}
            {activeTab === "reseau" && (
              <div className="space-y-5">
                {/* Search */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2"><Search size={16} className="text-primary" />Rechercher un utilisateur à suivre</h3>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" value={netSearch} onChange={(e) => setNetSearch(e.target.value)} placeholder="Nom, organisation ou guide…"
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
                          <button onClick={() => router.push(`/profile/project-owner/${f.user_id}`)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">{f.photo ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">business</span>}</div>
                            <div className="min-w-0"><p className="font-extrabold text-slate-800 text-sm truncate">{f.full_name}</p>{f.sub && <p className="text-xs text-slate-400">{f.sub}</p>}</div>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => router.push(`/profile/project-owner/${f.user_id}`)} className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">Voir</button>
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
                        const path = f._type === "eco_traveler" ? `/profile/ecovoyageur/${f.user_id}` : f._type === "project" ? `/profile/project-owner/${f.user_id}` : `/profile/guide/${f.user_id}`;
                        const typeLabel = f._type === "eco_traveler" ? "Éco-Voyageur" : f._type === "project" ? "Prestataire" : "Guide";
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

            {/* TAB: À PROPOS */}
            {activeTab === "apropos" && (
              <div className="space-y-5">

                {profile.bio && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-3">Présentation</p>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
                  </div>
                )}

                {/* Infos professionnelles */}
                <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Informations professionnelles</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {profile.years_experience !== null && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                          <Star size={16} className="text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Expérience</p>
                          <p className="text-sm font-bold text-slate-800">{profile.years_experience} ans</p>
                        </div>
                      </div>
                    )}
                    {profile.languages_spoken && profile.languages_spoken.length > 0 && (
                      <div className="flex items-start gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-sky-500" style={{ fontSize: 18 }}>translate</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1.5">Langues parlées</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.languages_spoken.map((l) => (
                              <span key={l} className="bg-sky-50 text-sky-700 border border-sky-100 rounded-lg px-2.5 py-1 text-xs font-bold">
                                {LANG_LABELS[l] ?? l}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {profile.ville_residence && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <MapPin size={16} className="text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Ville de résidence</p>
                          <p className="text-sm font-bold text-slate-800">{profile.ville_residence}</p>
                        </div>
                      </div>
                    )}
                    {profile.telephone && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 18 }}>phone</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Téléphone</p>
                          <p className="text-sm font-bold text-slate-800">{profile.telephone}</p>
                        </div>
                      </div>
                    )}
                    {profile.deplacement_possible !== null && (
                      <div className="flex items-center gap-4 px-6 py-4">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-teal-500" style={{ fontSize: 18 }}>directions_car</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-0.5">Déplacement hors zone</p>
                          <p className="text-sm font-bold text-slate-800">{profile.deplacement_possible ? "Possible" : "Non disponible"}</p>
                        </div>
                      </div>
                    )}
                    {!profile.years_experience && !(profile.languages_spoken?.length) && !profile.ville_residence && !profile.telephone && (
                      <div className="px-6 py-8 text-center text-slate-400 text-xs font-medium">Aucune information renseignée.</div>
                    )}
                  </div>
                </div>

                {/* Domaines */}
                {profile.domaines && profile.domaines.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Domaines d'expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.domaines.map((d) => {
                        const meta = DOMAINES_META[d];
                        return (
                          <span key={d} className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl px-3 py-1.5 text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">{meta?.icon ?? "label"}</span>
                            {meta?.label ?? d}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expertises */}
                {profile.expertises && profile.expertises.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Expertises</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.expertises.map((e) => (
                        <span key={e} className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-3 py-1.5 text-xs font-bold">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Zone d'activité */}
                {((profile.zones_couvertes?.length ?? 0) > 0 || (profile.villes_couvertes?.length ?? 0) > 0 || (profile.sites_maitrises?.length ?? 0) > 0) && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm space-y-4">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Zone d'activité</p>
                    {profile.zones_couvertes && profile.zones_couvertes.length > 0 && (
                      <div>
                        <p className="text-xs font-black text-slate-500 mb-2 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-slate-400">map</span>Régions
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {profile.zones_couvertes.map((z) => (
                            <span key={z} className="bg-secondary/10 text-secondary border border-secondary/20 rounded-xl px-3 py-1.5 text-xs font-bold">
                              {ZONES_META[z] ?? z}
                            </span>
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
                  </div>
                )}

                {/* Publics accueillis */}
                {profile.publics_accueillis && profile.publics_accueillis.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Publics accueillis</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.publics_accueillis.map((p) => {
                        const meta = PUBLICS_META[p];
                        return (
                          <span key={p} className="flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl px-3 py-1.5 text-xs font-bold">
                            <span className="material-symbols-outlined text-sm">{meta?.icon ?? "group"}</span>
                            {meta?.label ?? p}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {profile.certifications?.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Certifications</p>
                    <div className="space-y-2">
                      {profile.certifications.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Check size={12} className="text-primary" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700">{c.label}</p>
                          {c.proof && (
                            <button type="button" onClick={() => {
                              if (c.proof.startsWith("data:")) {
                                const w = window.open(); w?.document.write(`<img src="${c.proof}" style="max-width:100%">`);
                              } else { window.open(c.proof, "_blank"); }
                            }} className="ml-auto text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              Justificatif
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Textes de présentation */}
                {(profile.experience_pro || profile.centres_interet || profile.pourquoi_moi) && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm space-y-4">
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

                {/* Activité */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-4">Activité</p>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: profile.reservations_handled, label: "Réservations", icon: "event_available", color: "text-secondary bg-secondary/10" },
                      { value: profile.feedback_received,    label: "Avis reçus",   icon: "star",            color: "text-amber-500 bg-amber-50" },
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
                      {profile.sustainability_score >= 80 ? "Guide Ambassadeur Éco Voyage"
                        : scoreLabel(profile.sustainability_score)}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* TAB: AGENDA */}
            {activeTab === "agenda" && token && (
              <AvailabilityCalendar token={token} />
            )}

            {/* ── Onglet Collaborations ── */}
            {activeTab === "collaborations" && (() => {
              const SECTION_META: Record<string, { label: string; icon: string; grad: string }> = {
                restauration: { label: "Restauration", icon: "restaurant",    grad: "from-emerald-600 to-green-500" },
                transport:    { label: "Transport",    icon: "directions_bus", grad: "from-slate-600 to-slate-500" },
                hebergement:  { label: "Hébergement", icon: "hotel",          grad: "from-teal-600 to-emerald-500" },
                guide:        { label: "Guidage",     icon: "hiking",         grad: "from-emerald-500 to-green-500" },
                autre:        { label: "Autre",       icon: "category",       grad: "from-slate-500 to-slate-600" },
              };
              const STATUS_META: Record<string, { label: string; cls: string; icon: string }> = {
                pending:   { label: "En attente", cls: "bg-slate-100 text-slate-600 border-slate-200",     icon: "schedule" },
                accepted:  { label: "Acceptée",   cls: "bg-teal-100 text-teal-700 border-teal-200",       icon: "check_circle" },
                completed: { label: "Complétée",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: "task_alt" },
                declined:  { label: "Refusée",    cls: "bg-red-100 text-red-700 border-red-200",          icon: "cancel" },
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
                      const st = STATUS_META[c.status] ?? STATUS_META.pending;
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
                              } catch {}
                              setCollaborations(prev => prev.filter(x => x.id !== c.id));
                            }}
                            className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/80 hover:bg-red-50 border border-slate-100 hover:border-red-200 text-slate-300 hover:text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                          <div className="flex flex-col lg:flex-row">
                            {/* Image gauche — même proportion que les cartes d'offre */}
                            <div className="lg:w-2/5 relative min-h-[200px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
                              {c.offer_cover ? (
                                <img src={c.offer_cover} alt={c.offer_title} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <>
                                  <div className={`absolute inset-0 bg-gradient-to-br ${sm.grad} opacity-90`} />
                                  <span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 100 }}>{sm.icon}</span>
                                </>
                              )}
                              {/* Badge statut */}
                              <div className={`absolute top-3 left-3 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border flex items-center gap-1 ${st.cls}`}>
                                <span className="material-symbols-outlined text-xs">{st.icon}</span>{st.label}
                              </div>
                            </div>
                            {/* Contenu droite */}
                            <div className="lg:w-3/5 p-6 md:p-8 flex flex-col justify-between">
                              <div>
                                <h3 className="text-lg md:text-xl font-extrabold text-slate-800 tracking-tight leading-tight mb-2">{c.offer_title}</h3>
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
                                <button onClick={() => {
                                  setOpenCollab(c);
                                  setDetailOffer(null);
                                  setDetailOfferLoading(true);
                                  apiFetch<OfferFull>(`/guide/offers/${c.offer_id}/detail`, { headers: { Authorization: `Bearer ${token}` } })
                                    .then(setDetailOffer).catch(() => setDetailOffer(null)).finally(() => setDetailOfferLoading(false));
                                }}
                                  className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                                  <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            </div>
                          </div>
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
                    offerId={openCollab.offer_id}
                    section={openCollab.section}
                    token={token}
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
                  <button onClick={() => { setOpenCollab(null); setDetailOffer(null); }}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors">
                    <X size={16} className="text-white" />
                  </button>
                  {/* Collaboration context banner */}
                  {(() => {
                    const sectionLabels: Record<string, string> = { restauration: "Restauration", transport: "Transport", hebergement: "Hébergement", guide: "Guidage", autre_service: "Autre service", autre: "Autre" };
                    const statusInfo: Record<string, { label: string; cls: string }> = {
                      pending:   { label: "En attente", cls: "bg-slate-100 text-slate-600 border-slate-200" },
                      accepted:  { label: "Acceptée",   cls: "bg-teal-50 text-teal-700 border-teal-200" },
                      completed: { label: "Complétée",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      declined:  { label: "Refusée",    cls: "bg-red-50 text-red-600 border-red-200" },
                    };
                    const si = statusInfo[openCollab.status] ?? { label: openCollab.status, cls: "bg-slate-100 text-slate-600 border-slate-200" };
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
                  {/* Corps scrollable : OfferDetailView */}
                  <div className="flex-1 overflow-y-auto">
                    {detailOfferLoading ? (
                      <div className="flex items-center justify-center h-full gap-3 text-slate-400">
                        <span className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <span className="text-sm">Chargement de l&apos;offre…</span>
                      </div>
                    ) : detailOffer ? (
                      <OfferDetailView offer={detailOffer} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-sm">Impossible de charger l&apos;offre.</div>
                    )}
                  </div>
                  {/* Bandeau conflit d'agenda */}
                  {collabConflict && (
                    <div className="mx-6 mb-2 mt-0 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-3 items-start">
                      <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">warning</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-amber-800">Conflit d'agenda détecté</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Cette offre chevauche le créneau <span className="font-bold">«&nbsp;{collabConflict.label}&nbsp;»</span>
                          {collabConflict.days.length > 0 && (
                            <> aux dates : {collabConflict.days.map(d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })).join(", ")}</>
                          )}.
                        </p>
                        <button onClick={() => { setOpenCollab(null); setCollabConflict(null); setActiveTab("agenda" as any); }}
                          className="mt-2 text-xs font-extrabold text-amber-700 underline underline-offset-2 hover:text-amber-900">
                          Régler mon agenda →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pied : boutons action */}
                  <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex gap-3">
                    {openCollab.status === "pending" && (
                      <>
                        <button onClick={async () => {
                          setCollabResponding(true);
                          setCollabConflict(null);
                          try {
                            await apiFetch(`/guide/collaborations/${openCollab.id}/respond`, {
                              method: "PATCH",
                              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "accepted" }),
                            });
                            setCollaborations((prev) => prev.map((x) => x.id === openCollab!.id ? { ...x, status: "accepted" } : x));
                            setOpenCollab((prev) => prev ? { ...prev, status: "accepted" } : null);
                            setShowCollabForm(true);
                          } catch (err) {
                            if (err instanceof ApiError && err.status === 409) {
                              setCollabConflict(err.data?.message?.conflictingSlot ?? { label: "un créneau existant", days: [] });
                            }
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
                    {openCollab.status === "completed" && openCollab.offer_status === "approved" && (
                      <button onClick={() => setShowCollabForm(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-700 transition-all">
                        <span className="material-symbols-outlined text-base">visibility</span>Voir ma contribution
                      </button>
                    )}
                    {openCollab.status === "completed" && openCollab.offer_status !== "approved" && (
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
                const r = 54; const circ = 2 * Math.PI * r;
                return (
                  <>
                    <div className="flex flex-col items-center py-4">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                        <circle cx="70" cy="70" r={r} fill="none" stroke="#86efac" strokeWidth="10"
                          strokeDasharray={circ} strokeDashoffset={circ * (1 - oqScore / 100)}
                          strokeLinecap="round" transform="rotate(-90 70 70)" className="transition-all duration-700" />
                        <text x="70" y="65" textAnchor="middle" style={{ fontSize: 28, fontWeight: 900 }}>{oqScore}</text>
                        <text x="70" y="82" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 12, fontWeight: 700 }}>/100</text>
                      </svg>
                      <span className={`mt-2 text-base font-extrabold ${level.color}`}>{level.emoji} {level.label}</span>
                      <p className="text-sm text-slate-500 mt-1 text-center">{oqScore >= 71 ? "Votre offre est éco-responsable. Excellent !" : oqScore >= 51 ? "Votre offre est sur la bonne voie. Continuez vos efforts !" : "Des améliorations sont possibles pour cette offre."}</p>
                    </div>
                    <div className="space-y-3 mb-4">
                      {OFFER_SUSTAINABILITY_STEPS.map((step) => {
                        const catScore = step.questions.reduce((sum, q) => sum + (oqAnswers[q.id] ?? 0), 0);
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
      {showCreateOffer && (
        <GuideOfferModal
          open={showCreateOffer}
          onClose={() => setShowCreateOffer(false)}
          onSuccess={(newOffer) => {
            const validImages = (newOffer.images as string[] | null)?.filter((u: string) => u?.startsWith("http") || u?.startsWith("data:")) ?? null;
            const withCover = { ...newOffer, images: validImages?.length ? validImages : null, cover_image: validImages?.[0] ?? null };
            setOffers((prev) => [withCover, ...prev]);
            setShowCreateOffer(false);
          }}
          profile={{
            domaines: profile?.domaines ?? null,
            expertises: profile?.expertises ?? null,
            zones_couvertes: profile?.zones_couvertes ?? null,
            publics_accueillis: profile?.publics_accueillis ?? null,
            languages_spoken: profile?.languages_spoken ?? null,
          }}
          token={token}
        />
      )}
      {editOfferModal && (
        <GuideOfferModal
          open={!!editOfferModal}
          onClose={() => setEditOfferModal(null)}
          onSuccess={(updated) => {
            const validImages = (updated.images as string[] | null)?.filter((u: string) => u?.startsWith("http") || u?.startsWith("data:")) ?? null;
            const withCover = { ...updated, images: validImages?.length ? validImages : null, cover_image: validImages?.[0] ?? null };
            setOffers((prev) => prev.map((o) => o.id === withCover.id ? withCover : o));
            setEditOfferModal(null);
          }}
          onDelete={() => {
            setOffers((prev) => prev.filter((o) => o.id !== editOfferModal.id));
            setEditOfferModal(null);
          }}
          profile={{
            domaines: profile?.domaines ?? null,
            expertises: profile?.expertises ?? null,
            zones_couvertes: profile?.zones_couvertes ?? null,
            publics_accueillis: profile?.publics_accueillis ?? null,
            languages_spoken: profile?.languages_spoken ?? null,
          }}
          token={token}
          editOffer={editOfferModal}
        />
      )}
    </>
  );
}
