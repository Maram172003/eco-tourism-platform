"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Plus, Edit3, MapPin, ArrowLeft, Leaf, ArrowRight, Send, X,
  ChevronLeft, ChevronRight, Check, Star, Compass, Heart,
  Camera, Mountain, Globe, Info, Users, LayoutGrid, ShieldCheck,
  Search, UserPlus, UserCheck, UserX, MoreVertical, ShieldBan, Flag,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { logoutUser } from "@/lib/auth";
import MessagerieWidget from "@/components/MessagerieWidget";
import PubInteractions from "@/components/PubInteractions";
import PlaceContributions, { type TopPhotoData, type TopDescData } from "@/components/PlaceContributions";
import { MACRO_CATEGORIES, TAXONOMY_TAGS as ALL_TAXONOMY_TAGS } from "@/lib/constants/taxonomy-tags";

const MapPicker = dynamic(
  () => import("@/components/map/MapPicker"),
  { ssr: false, loading: () => <div className="h-[268px] rounded-2xl bg-slate-100 animate-pulse" /> }
);
const MapView = dynamic(() => import("@/components/map/MapView"),
  { ssr: false, loading: () => <div className="h-[200px] rounded-xl bg-slate-100 animate-pulse" /> }
);

// ─── MeetingMap: affiche la carte depuis les coordonnées ou géocode l'adresse ─

function PubMap({ lat, lng, address }: { lat: number | null; lng: number | null; address: string }) {
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

type EcoTravelerProfile = {
  user_id: string;
  full_name: string;
  bio: string | null;
  photo: string | null;
  cover_photo: string | null;
  country: string | null;
  language: string | null;
  traveler_types: string[] | null;
  motivations: string[] | null;
  sustainability_values: string[] | null;
  interests: string[] | null;
  landscapes: string[] | null;
  travel_styles: string[] | null;
  sustainability_goals: string[] | null;
  sustainability_score: number | null;
  profile_completion: number;
  is_onboarded: boolean;
  badges: { label: string; obtained_at: string }[];
  feedback_given: number;
  plans_shared: number;
  reservations_made: number;
};

type Publication = {
  id: string;
  type: "place" | "experience";
  title: string;
  description: string | null;
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  place_name: string | null;
  region: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TRAVELER_TYPES = [
  { value: "solo",      label: "Solo" },
  { value: "couples",   label: "Couples" },
  { value: "familles",  label: "Familles" },
  { value: "groupes",   label: "Groupes" },
  { value: "seniors",   label: "Seniors" },
  { value: "scolaires", label: "Scolaires" },
  { value: "photo",     label: "Photographes" },
];

// Les 11 univers proviennent de la taxonomie commune : ainsi « Hébergement »
// n'est plus oublié ici, et toute macro ajoutée plus tard apparaît d'office.
const UNIVERS = MACRO_CATEGORIES.map((c) => ({ value: c.slug, label: c.label }));


const SUSTAINABILITY_VALUES = [
  { value: "support_local_economy",   label: "Économie locale" },
  { value: "protect_biodiversity",    label: "Biodiversité" },
  { value: "reduce_carbon",           label: "Réduire l'empreinte carbone" },
  { value: "responsible_tourism",     label: "Tourisme responsable" },
  { value: "respect_cultures",        label: "Respect des cultures" },
  { value: "local_consumption",       label: "Consommation locale" },
  { value: "avoid_mass_tourism",      label: "Éviter le tourisme de masse" },
];

// « Hébergement » reste un univers que l'on peut cocher, mais ses sous-types
// (Dortoir, Suite, Chambre standard…) ne sont pas des centres d'intérêt : on ne
// les propose donc jamais à la sélection. L'univers seul suffit à recevoir des
// recommandations d'hébergement, le moteur faisant la correspondance par macro.
const INTEREST_MACROS = MACRO_CATEGORIES.filter((c) => c.slug !== "hebergement");

// Activités groupées par univers, dérivées de la même source que les offres et
// les circuits — plus de liste recopiée à la main qui finit par diverger.
const TAXONOMY_TAGS: Record<string, { value: string; label: string }[]> =
  INTEREST_MACROS.reduce((acc, macro) => {
    acc[macro.slug] = ALL_TAXONOMY_TAGS
      .filter((tag) => tag.macro === macro.slug)
      .map((tag) => ({ value: tag.slug, label: tag.label }));
    return acc;
  }, {} as Record<string, { value: string; label: string }[]>);


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

const COUNTRY_LABELS: Record<string, string> = {
  TN: "Tunisie", MA: "Maroc", DZ: "Algérie", FR: "France", OTHER: "Autre",
};
const LANG_LABELS: Record<string, string> = {
  fr: "Français", ar: "Arabe", en: "Anglais", es: "Espagnol", de: "Allemand", it: "Italien",
};

type Tab = "tout" | "experiences" | "lieux" | "amis" | "apropos";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EcoTravelerProfilePage() {
  const router = useRouter();

  const [profile,       setProfile]       = useState<EcoTravelerProfile | null>(null);
  const profileUserIdRef = useRef<string | undefined>(undefined);
  const [publications,  setPublications]  = useState<Publication[]>([]);
  const [contribCounts, setContribCounts] = useState<Record<string, number>>({});
  const [topPhotos,     setTopPhotos]     = useState<Record<string, TopPhotoData | null>>({});
  const [topDescs,      setTopDescs]      = useState<Record<string, TopDescData  | null>>({});
  const [token,        setToken]        = useState("");
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<Tab>("tout");

  // ── Add publication modal ────────────────────────────────────────────────
  const [addPubOpen,   setAddPubOpen]   = useState(false);
  const [pubType,      setPubType]      = useState<"experience" | "place">("experience");
  const [pubForm,      setPubForm]      = useState({ title: "", description: "", place_name: "", region: "" });
  const [pubTitleErr,  setPubTitleErr]  = useState("");
  const [pubSaving,    setPubSaving]    = useState(false);
  const [pubError,     setPubError]     = useState("");
  const [pubImages,    setPubImages]    = useState<{ file: File; preview: string }[]>([]);
  const [pubCoverIdx,  setPubCoverIdx]  = useState(0);
  const [pubMapLat,    setPubMapLat]    = useState<number | null>(null);
  const [pubMapLng,    setPubMapLng]    = useState<number | null>(null);

  // ── View publication detail ──────────────────────────────────────────────
  const [viewPubOpen,  setViewPubOpen]  = useState(false);
  const [viewPub,      setViewPub]      = useState<Publication | null>(null);
  const [sliderIdx,    setSliderIdx]    = useState(0);
  const [touchStartX,  setTouchStartX]  = useState<number | null>(null);
  const [pubDeleting,  setPubDeleting]  = useState(false);

  // ── Edit publication modal ───────────────────────────────────────────────
  const [editPubOpen,  setEditPubOpen]  = useState(false);
  const [editPubForm,  setEditPubForm]  = useState({ title: "", description: "", place_name: "", region: "" });
  const [editPubImgs,  setEditPubImgs]  = useState<{ src: string; file?: File }[]>([]);
  const [editPubCover, setEditPubCover] = useState(0);
  const [editPubErr,   setEditPubErr]   = useState("");
  const [editPubSaving,setEditPubSaving]= useState(false);
  const [editPubMapLat,setEditPubMapLat]= useState<number | null>(null);
  const [editPubMapLng,setEditPubMapLng]= useState<number | null>(null);

  // ── Social network ───────────────────────────────────────────────────────
  type Traveler = { user_id: string; full_name: string; photo: string | null; country: string | null; sustainability_score: number | null; friendship_id?: string | null };
  type FriendRequest = { id: string; created_at: string; sender: Traveler };
  type AnyResult = { user_id: string; full_name: string; photo: string | null; _type: "traveler" | "guide" | "project" | "provider"; sub?: string | null };
  type FollowUser = { user_id: string; full_name: string | null; photo: string | null; _type: string; sub: string | null };
  const [searchQuery,    setSearchQuery]    = useState("");
  const [searchResults,  setSearchResults]  = useState<Traveler[]>([]);
  const [searchLoading,  setSearchLoading]  = useState(false);
  const [allResults,     setAllResults]     = useState<AnyResult[]>([]);
  const [allLoading,     setAllLoading]     = useState(false);
  const [friends,        setFriends]        = useState<Traveler[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [socialLoaded,   setSocialLoaded]   = useState(false);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [followings,     setFollowings]     = useState<FollowUser[]>([]);
  const [followers,      setFollowers]      = useState<FollowUser[]>([]);
  const [openMenuId,     setOpenMenuId]     = useState<string | null>(null);
  const [reportTarget,   setReportTarget]   = useState<{ id: string; name: string } | null>(null);
  const [reportReason,   setReportReason]   = useState("");
  const [reportSending,  setReportSending]  = useState(false);

  const REPORT_REASONS = ["Contenu inapproprié", "Faux profil", "Harcèlement ou spam", "Informations trompeuses", "Autre"];

  // ── Edit profile modal ───────────────────────────────────────────────────
  const [editProfileOpen,   setEditProfileOpen]   = useState(false);
  const [editProfileForm,   setEditProfileForm]   = useState({ full_name: "", bio: "", country: "", language: "" });
  const [editProfilePhoto,  setEditProfilePhoto]  = useState<{ file?: File; preview: string } | null>(null);
  const [editProfileCover,  setEditProfileCover]  = useState<{ file?: File; preview: string } | null>(null);
  const [editTravTypes,     setEditTravTypes]     = useState<string[]>([]);
  const [editMotivations,   setEditMotivations]   = useState<string[]>([]);
  const [editSustValues,    setEditSustValues]    = useState<string[]>([]);
  const [editInterests,       setEditInterests]       = useState<string[]>([]);
  const [editLandscapes,      setEditLandscapes]      = useState<string[]>([]);
  const [editInterestSearch,  setEditInterestSearch]  = useState("");
  const [editGoals,         setEditGoals]         = useState<string[]>([]);
  const [editProfileSaving, setEditProfileSaving] = useState(false);
  const [editProfileError,  setEditProfileError]  = useState("");

  // ── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const tkn = localStorage.getItem("access_token");
      if (!tkn) { router.push("/auth/login"); return; }
      setToken(tkn);
      try {
        const [p, pubs] = await Promise.all([
          apiFetch<EcoTravelerProfile>("/eco-traveler/profile", { headers: { Authorization: `Bearer ${tkn}` } }),
          apiFetch<Publication[]>("/publications/mine", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => [] as Publication[]),
        ]);
        setProfile(p);
        profileUserIdRef.current = p.user_id;
        setPublications(pubs);
        // Load social data in background
        Promise.all([
          apiFetch<Traveler[]>("/eco-traveler/friends", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<FriendRequest[]>("/eco-traveler/friends/requests", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<FollowUser[]>("/follows/following/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
          apiFetch<FollowUser[]>("/follows/followers/profiles", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => []),
        ]).then(([f, r, fwing, fwers]) => { setFriends(f); setFriendRequests(r); setFollowings(fwing as FollowUser[]); setFollowers(fwers as FollowUser[]); setSocialLoaded(true); });
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  async function handleLogout() {
    try { if (token) await logoutUser(token); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  }

  // Unified search — eco-travelers + guides + project-owners
  useEffect(() => {
    if (!searchQuery.trim() || !token) { setAllResults([]); return; }
    const t = setTimeout(() => {
      setAllLoading(true);
      const enc = encodeURIComponent(searchQuery);
      Promise.all([
        apiFetch<Traveler[]>(`/eco-traveler/search?q=${enc}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
        apiFetch<AnyResult[]>(`/guide/public/search?q=${enc}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
        apiFetch<AnyResult[]>(`/project-owner/public/search?q=${enc}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
        apiFetch<AnyResult[]>(`/providers/search?q=${enc}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []),
      ]).then(([travelers, guides, owners, providers]) => {
        const currentUserId = profileUserIdRef.current;
        const raw = [
          ...travelers.map((t) => ({ user_id: t.user_id, full_name: t.full_name, photo: t.photo, _type: "traveler" as const, sub: t.country })),
          ...guides.map((g: any) => ({ user_id: g.user_id, full_name: g.full_name, photo: g.photo, _type: "guide" as const, sub: g.zone ?? null })),
          ...owners.map((o: any) => ({ user_id: o.user_id, full_name: o.full_name, photo: o.photo, _type: "project" as const, sub: o.organization ?? null })),
          ...providers.map((p: any) => ({ user_id: p.user_id, full_name: p.organization ?? p.full_name, photo: p.org_logo ?? p.photo, _type: "provider" as const, sub: p.full_name ?? p.provider_type ?? null })),
        ];
        const seen = new Set<string>();
        const deduped = raw.filter((r) => {
          if (r.user_id === currentUserId) return false;
          const key = `${r._type}-${r.user_id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAllResults(deduped);
      }).finally(() => setAllLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, token]);

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/upload`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    if (!res.ok) throw new Error("Upload échoué");
    const data = await res.json();
    if (!data?.url || typeof data.url !== "string") throw new Error("URL d'image invalide après upload");
    return data.url;
  }

  // ── Score label ──────────────────────────────────────────────────────────

  const scoreLabel = (score: number | null) => {
    if (score === null) return "Éco-Voyageur";
    if (score >= 80) return "Ambassadeur Éco Voyage";
    if (score >= 60) return "Explorateur Engagé";
    if (score >= 40) return "Voyageur Sensible";
    return "Voyageur Éco-Débutant";
  };

  // ── Add publication ──────────────────────────────────────────────────────

  function openAddPub(type: "experience" | "place") {
    setPubType(type);
    setPubForm({ title: "", description: "", place_name: "", region: "" });
    setPubTitleErr(""); setPubError("");
    setPubImages([]); setPubCoverIdx(0);
    setPubMapLat(null); setPubMapLng(null);
    setAddPubOpen(true);
  }

  function closeAddPub() {
    pubImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setPubImages([]); setPubCoverIdx(0);
    setAddPubOpen(false);
    setPubTitleErr(""); setPubError("");
  }

  async function handlePublish(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pubForm.title.trim()) { setPubTitleErr("Le titre est obligatoire."); return; }
    setPubError(""); setPubSaving(true);
    try {
      let imageUrls: string[] = [];
      if (pubImages.length > 0) {
        imageUrls = await Promise.all(pubImages.map((img) => uploadImage(img.file)));
        const cover = imageUrls[pubCoverIdx] ?? imageUrls[0];
        imageUrls = [cover, ...imageUrls.filter((u) => u !== cover)];
      }
      const created = await apiFetch<Publication>("/publications", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: pubType,
          title: pubForm.title.trim(),
          description: pubForm.description.trim() || undefined,
          place_name: pubForm.place_name.trim() || undefined,
          region: pubForm.region.trim() || undefined,
          latitude: pubMapLat ?? undefined,
          longitude: pubMapLng ?? undefined,
          images: imageUrls.length ? imageUrls : undefined,
        }),
      });
      setPublications((prev) => [created, ...prev]);
      closeAddPub();
    } catch (err: any) {
      setPubError(err.message || "Erreur lors de la publication.");
    } finally { setPubSaving(false); }
  }

  // ── View / delete publication ────────────────────────────────────────────

  function openViewPub(pub: Publication) {
    setViewPub(pub); setSliderIdx(0); setTouchStartX(null);
    setViewPubOpen(true);
  }

  function closeViewPub() { setViewPubOpen(false); setViewPub(null); }

  async function handleDeletePub() {
    if (!viewPub) return;
    if (!confirm(`Supprimer "${viewPub.title}" ? Cette action est irréversible.`)) return;
    setPubDeleting(true);
    try {
      await apiFetch(`/publications/${viewPub.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPublications((prev) => prev.filter((p) => p.id !== viewPub.id));
      closeViewPub();
    } catch { alert("Erreur lors de la suppression."); }
    finally { setPubDeleting(false); }
  }

  // ── Edit publication ─────────────────────────────────────────────────────

  function openEditPub(pub: Publication) {
    setViewPub(pub);
    setEditPubForm({
      title: pub.title,
      description: pub.description ?? "",
      place_name: pub.place_name ?? "",
      region: pub.region ?? "",
    });
    const imgs = (pub.images ?? []).filter((s) => s.startsWith("http"));
    setEditPubImgs(imgs.map((src) => ({ src })));
    setEditPubMapLat(pub.latitude ?? null);
    setEditPubMapLng(pub.longitude ?? null);
    setEditPubCover(0); setEditPubErr("");
    setEditPubOpen(true);
  }

  function closeEditPub() { setEditPubOpen(false); setEditPubErr(""); }

  async function handleSavePub(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!viewPub) return;
    setEditPubErr(""); setEditPubSaving(true);
    try {
      const finalUrls = (await Promise.all(
        editPubImgs.map(async (img) => {
          if (img.file) { try { return await uploadImage(img.file); } catch { return null; } }
          return img.src.startsWith("http") ? img.src : null;
        })
      )).filter((url): url is string => url !== null);
      const coverSrc = finalUrls[editPubCover] ?? finalUrls[0] ?? null;
      const ordered = coverSrc ? [coverSrc, ...finalUrls.filter((u) => u !== coverSrc)] : finalUrls;

      const updated = await apiFetch<Publication>(`/publications/${viewPub.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editPubForm.title.trim() || undefined,
          description: editPubForm.description.trim() || undefined,
          place_name: editPubForm.place_name.trim() || undefined,
          latitude: editPubMapLat ?? undefined,
          longitude: editPubMapLng ?? undefined,
          images: ordered.length ? ordered : [],
        }),
      });
      const finalPub: Publication = { ...updated, images: ordered.length ? ordered : null };
      setPublications((prev) => prev.map((p) => p.id === viewPub.id ? finalPub : p));
      setViewPub(finalPub);
      setEditPubOpen(false);
    } catch (err: any) {
      setEditPubErr(err.message || "Erreur lors de la sauvegarde.");
    } finally { setEditPubSaving(false); }
  }

  // ── Edit profile ─────────────────────────────────────────────────────────

  function openEditProfile() {
    if (!profile) return;
    setEditProfileForm({
      full_name: profile.full_name ?? "",
      bio:       profile.bio       ?? "",
      country:   profile.country   ?? "",
      language:  profile.language  ?? "",
    });
    setEditProfilePhoto(profile.photo       ? { preview: profile.photo }       : null);
    setEditProfileCover(profile.cover_photo ? { preview: profile.cover_photo } : null);
    setEditTravTypes(profile.traveler_types    ?? []);
    setEditMotivations(profile.motivations     ?? []);
    setEditSustValues(profile.sustainability_values ?? []);
    setEditInterests(profile.interests   ?? []);
    setEditLandscapes(profile.landscapes ?? []);
    setEditInterestSearch("");
    setEditGoals(profile.sustainability_goals  ?? []);
    setEditProfileError("");
    setEditProfileOpen(true);
  }

  function closeEditProfile() { setEditProfileOpen(false); setEditProfileError(""); }

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

      const [updated] = await Promise.all([
        apiFetch<EcoTravelerProfile>("/eco-traveler/profile", {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            full_name:  editProfileForm.full_name.trim(),
            bio:        editProfileForm.bio.trim()    || undefined,
            country:    editProfileForm.country       || undefined,
            language:   editProfileForm.language      || undefined,
            photo:      photoUrl,
            cover_photo: coverUrl,
          }),
        }),
        apiFetch("/eco-traveler/traveler-types", {
          method: "PATCH", headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ traveler_types: editTravTypes }),
        }).catch(() => {}),
        apiFetch("/eco-traveler/motivations", {
          method: "PATCH", headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ motivations: editMotivations, sustainability_values: editSustValues }),
        }).catch(() => {}),
        apiFetch("/eco-traveler/interests", {
          method: "PATCH", headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ interests: editInterests, landscapes: editLandscapes }),
        }).catch(() => {}),
        apiFetch("/eco-traveler/goals", {
          method: "PATCH", headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sustainability_goals: editGoals }),
        }).catch(() => {}),
      ]);

      setProfile((prev) => prev ? {
        ...prev, ...updated,
        photo: photoUrl ?? null, cover_photo: coverUrl ?? null,
        traveler_types:       editTravTypes,
        motivations:          editMotivations,
        sustainability_values: editSustValues,
        interests:  editInterests,
        landscapes: editLandscapes,
        sustainability_goals: editGoals,
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

  const experiences  = publications.filter((p) => p.type === "experience");
  const lieux        = publications.filter((p) => p.type === "place");

  const roleLabel = profile.traveler_types?.[0]
    ? (TRAVELER_TYPES.find((t) => t.value === profile.traveler_types![0])?.label ?? "Éco-Voyageur")
    : scoreLabel(profile.sustainability_score);

  // ─── Publication card ────────────────────────────────────────────────────────

  const PubCard = ({ pub }: { pub: Publication }) => {
    const isExp = pub.type === "experience";
    const cover = pub.images?.[0];
    const topPhoto = topPhotos[pub.id] ?? null;
    const shareUrl = typeof window !== "undefined"
      ? `${window.location.origin}/profile/ecovoyageur/${profile?.user_id}?pub=${pub.id}`
      : `/profile/ecovoyageur/${profile?.user_id}?pub=${pub.id}`;

    const authorInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

    return (
      <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col lg:flex-row overflow-hidden rounded-3xl">
          {/* ── Photo area ── */}
          <div className="lg:w-2/5 relative min-h-[180px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
            {cover ? (
              <img src={cover} alt={pub.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <div className={`absolute inset-0 opacity-85 ${isExp ? "bg-gradient-to-br from-teal-500 to-emerald-400" : "bg-gradient-to-br from-blue-500 to-cyan-400"}`} />
                <span className="material-symbols-outlined text-white/35 relative z-10" style={{ fontSize: 90 }}>
                  {isExp ? "hiking" : "location_on"}
                </span>
              </>
            )}
            {/* Type badge */}
            <div className="absolute top-3 left-3 z-10 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border bg-white/90 text-slate-700 border-white/40">
              {isExp ? "Expérience" : "Lieu"}
            </div>
            {/* Officiel badge */}
            {pub.type === "place" && cover && (
              <span className="absolute bottom-3 left-3 z-10 text-[9px] font-black uppercase tracking-wide bg-white/90 text-slate-700 px-2 py-0.5 rounded-full shadow-sm border border-white/40">
                Officiel
              </span>
            )}
            {/* Community avatar indicator */}
            {pub.type === "place" && topPhoto && (() => {
              const descAuthor = topDescs[pub.id]?.author ?? null;
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
              {pub.description && <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{pub.description}</p>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
              <p className="text-[11px] font-bold text-slate-400">
                {new Date(pub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="flex items-center gap-3">
                {pub.status === "approved" && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publié</span>
                )}
                {pub.status === "pending" && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">En attente</span>
                )}
                {pub.status === "rejected" && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600" title={pub.rejection_reason ?? ""}>Refusé</span>
                )}
                <button onClick={() => openViewPub(pub)}
                  className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                  <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
        {pub.status === "approved" && (
          <PubInteractions
            pubId={pub.id}
            token={token}
            viewerId={profile?.user_id ?? ""}
            shareUrl={shareUrl}
            pubTitle={pub.title}
            contributionsCount={contribCounts[pub.id]}
            contributionsContent={pub.type === "place" ? (
              <PlaceContributions
                publicationId={pub.id}
                publisherId={profile?.user_id}
                onCountLoaded={(n) => setContribCounts((prev) => {
                  if (prev[pub.id] === n) return prev;
                  return { ...prev, [pub.id]: n };
                })}
                onTopPhotoLoaded={(data) => setTopPhotos((prev) => {
                  const prevUrl = prev[pub.id]?.images[0] ?? null;
                  const newUrl = data?.images[0] ?? null;
                  if (prevUrl === newUrl) return prev;
                  return { ...prev, [pub.id]: data };
                })}
                onTopDescLoaded={(data) => setTopDescs((prev) => {
                  const prevTxt = prev[pub.id]?.content ?? null;
                  const newTxt = data?.content ?? null;
                  if (prevTxt === newTxt) return prev;
                  return { ...prev, [pub.id]: data };
                })}
              />
            ) : undefined}
          />
        )}
      </div>
    );
  };

  // ── Follow user path helper ──────────────────────────────────────────────
  function followUserPath(u: FollowUser) {
    const t = u._type ?? (u as any).role;
    if (t === "guide") return `/profile/guide/${u.user_id}`;
    if (t === "provider") return `/profile/provider/${u.user_id}`;
    if (t === "project") return `/profile/project-owner/${u.user_id}`;
    return `/profile/ecovoyageur/${u.user_id}`;
  }

  function followTypeLabel(type: string) {
    const t = type ?? (type as any);
    if (t === "guide") return "Guide";
    if (t === "provider") return "Prestataire";
    if (t === "project") return "Propriétaire de projet";
    return "Éco-Voyageur";
  }

  function followTypeBadgeColor(type: string) {
    if (type === "guide") return "bg-emerald-50 text-emerald-700";
    if (type === "provider") return "bg-blue-50 text-blue-700";
    if (type === "project") return "bg-violet-50 text-violet-700";
    return "bg-teal-50 text-teal-700";
  }

  // ── Menu 3 points actions ────────────────────────────────────────────────
  async function handleRemoveFriend(userId: string, friendshipId: string | null | undefined) {
    if (!friendshipId) return;
    try {
      await apiFetch(`/eco-traveler/friends/${friendshipId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setFriends((prev) => prev.filter((f) => f.user_id !== userId));
    } catch { }
    setOpenMenuId(null);
  }

  async function handleBlockFriend(userId: string) {
    try {
      await apiFetch(`/eco-traveler/block/${userId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setFriends((prev) => prev.filter((f) => f.user_id !== userId));
    } catch { }
    setOpenMenuId(null);
  }

  async function handleSendReport() {
    if (!reportTarget || !reportReason) return;
    setReportSending(true);
    try {
      await apiFetch(`/eco-traveler/report/${reportTarget.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reportReason }),
      });
      setReportTarget(null); setReportReason("");
    } catch { }
    setReportSending(false);
  }

  async function handleUnfollow(userId: string) {
    try {
      await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setFollowings((prev) => prev.filter((u) => u.user_id !== userId));
    } catch { }
    setOpenMenuId(null);
  }

  // ── Friend actions ───────────────────────────────────────────────────────
  async function acceptRequest(id: string, senderId: string) {
    setActionLoading(id);
    try {
      await apiFetch(`/eco-traveler/friends/accept/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      const sender = friendRequests.find((r) => r.id === id)?.sender;
      if (sender) setFriends((prev) => [...prev, sender]);
      setFriendRequests((prev) => prev.filter((r) => r.id !== id));
    } finally { setActionLoading(null); }
  }

  async function rejectRequest(id: string) {
    setActionLoading(id);
    try {
      await apiFetch(`/eco-traveler/friends/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setFriendRequests((prev) => prev.filter((r) => r.id !== id));
    } finally { setActionLoading(null); }
  }

  async function removeFriend(userId: string) {
    // find friendship — just reload friends list
    setFriends((prev) => prev.filter((f) => f.user_id !== userId));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/70 pb-20" onClick={() => setOpenMenuId(null)}>

      {/* ══ MODAL SIGNALEMENT ════════════════════════════════════════════════ */}
      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Flag size={16} className="text-red-500" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-sm">Signaler {reportTarget.name}</p>
                <p className="text-xs text-slate-400">Choisissez un motif</p>
              </div>
            </div>
            <div className="space-y-2 mb-5">
              {REPORT_REASONS.map((r) => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${reportReason === r ? "bg-red-50 border-red-300 text-red-700" : "border-slate-100 text-slate-600 hover:bg-slate-50"}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setReportTarget(null); setReportReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSendReport} disabled={!reportReason || reportSending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                {reportSending ? "Envoi…" : "Signaler"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-slate-400 text-xs mt-0.5">Mettez à jour vos informations de voyageur</p>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <form id="edit-profile-form" onSubmit={handleSaveProfile} className="px-8 py-6 space-y-5">

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

                {/* Nom */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Nom complet *</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
                    <input type="text" placeholder="Votre nom complet"
                      value={editProfileForm.full_name}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Présentation <span className="normal-case font-medium text-slate-300">(optionnel)</span></label>
                  <textarea rows={3} placeholder="Passionné·e de voyages durables, de nature et de rencontres authentiques…"
                    value={editProfileForm.bio}
                    onChange={(e) => setEditProfileForm((f) => ({ ...f, bio: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* Pays + Langue */}
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
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Langue principale</label>
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
                        <option value="de">Allemand</option>
                        <option value="it">Italien</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Types de voyageur */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Profil de voyageur</label>
                  <div className="flex flex-wrap gap-2">
                    {TRAVELER_TYPES.map(({ value, label }) => {
                      const active = editTravTypes.includes(value);
                      return (
                        <button key={value} type="button"
                          onClick={() => setEditTravTypes((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                          {active && <Check size={10} className="inline mr-1" />}{label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Univers */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Univers qui vous attirent</label>
                  <div className="flex flex-wrap gap-2">
                    {UNIVERS.map(({ value, label }) => {
                      const active = editMotivations.includes(value);
                      return (
                        <button key={value} type="button"
                          onClick={() => setEditMotivations((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                          {active && <Check size={10} className="inline mr-1" />}{label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Valeurs de durabilité */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Valeurs durables</label>
                  <div className="flex flex-wrap gap-2">
                    {SUSTAINABILITY_VALUES.map(({ value, label }) => {
                      const active = editSustValues.includes(value);
                      return (
                        <button key={value} type="button"
                          onClick={() => setEditSustValues((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-emerald-300"}`}>
                          {active && <Check size={10} className="inline mr-1" />}{label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Centres d'intérêt — tags taxonomie */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Activités & intérêts</label>
                  {/* Barre de recherche */}
                  <div className="relative mb-3">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={editInterestSearch}
                      onChange={(e) => setEditInterestSearch(e.target.value)}
                      placeholder="Filtrer les activités…"
                      className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-400 font-medium"
                    />
                    {editInterestSearch && (
                      <button type="button" onClick={() => setEditInterestSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {/* Activités regroupées sous leur univers */}
                  {(() => {
                    const cats = editMotivations.length > 0 ? editMotivations : INTEREST_MACROS.map((u) => u.slug);
                    const query = editInterestSearch.trim().toLowerCase();
                    const groupes = cats
                      .map((slug) => {
                        const univers = UNIVERS.find((u) => u.value === slug);
                        const tags = (TAXONOMY_TAGS[slug] ?? []).filter(
                          (tag) => !query || tag.label.toLowerCase().includes(query),
                        );
                        return { slug, label: univers?.label ?? slug, tags };
                      })
                      .filter((g) => g.tags.length > 0);

                    if (groupes.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 italic">
                          {query
                            ? "Aucune activité correspondante."
                            : "Les univers choisis n'appellent aucune précision — vous recevrez déjà des recommandations correspondantes."}
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {groupes.map((groupe) => (
                          <div key={groupe.slug}>
                            <p className="text-[10px] font-black tracking-wider text-primary/70 uppercase mb-1.5">
                              {groupe.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {groupe.tags.map((tag) => {
                                const active = editInterests.includes(tag.value);
                                return (
                                  <button key={tag.value} type="button"
                                    onClick={() => setEditInterests((prev) => active ? prev.filter((s) => s !== tag.value) : [...prev, tag.value])}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                                    {active && <Check size={10} className="inline mr-1" />}{tag.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {editInterests.length > 0 && (
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">{editInterests.length} activité{editInterests.length > 1 ? "s" : ""} sélectionnée{editInterests.length > 1 ? "s" : ""}</p>
                  )}
                </div>

                {/* Paysages */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Paysages préférés</label>
                  <div className="flex flex-wrap gap-2">
                    {LANDSCAPES.map(({ value, label }) => {
                      const active = editLandscapes.includes(value);
                      return (
                        <button key={value} type="button"
                          onClick={() => setEditLandscapes((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? "bg-primary/10 border-primary text-primary" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                          {active && <Check size={10} className="inline mr-1" />}{label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Objectifs */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Objectifs durables</label>
                  <div className="space-y-2">
                    {GOALS.map(({ value, label }) => {
                      const active = editGoals.includes(value);
                      return (
                        <button key={value} type="button"
                          onClick={() => setEditGoals((prev) => active ? prev.filter((x) => x !== value) : [...prev, value])}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-bold text-left transition-all ${active ? "bg-emerald-50 border-emerald-400 text-slate-900" : "border-slate-100 text-slate-600 hover:border-emerald-200 bg-white"}`}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                            {active && <Check size={10} className="text-white" />}
                          </div>
                          {label}
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

      {/* ══ ADD PUBLICATION MODAL ════════════════════════════════════════════ */}
      {addPubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <button onClick={closeAddPub}
              className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
              <X size={16} />
            </button>
            <div className="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${pubType === "experience" ? "bg-teal-50" : "bg-blue-50"}`}>
                  {pubType === "experience"
                    ? <span className="material-symbols-outlined text-teal-600">hiking</span>
                    : <MapPin size={20} className="text-blue-600" />
                  }
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    {pubType === "experience" ? "Partager une expérience" : "Recommander un lieu"}
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {pubType === "experience" ? "Racontez votre vécu éco-touristique" : "Partagez un lieu remarquable"}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <form id="add-pub-form" onSubmit={handlePublish} className="px-8 py-6 space-y-5">

                {/* Titre */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">
                    {pubType === "experience" ? "Titre de l'expérience *" : "Nom du lieu *"}
                  </label>
                  <input type="text"
                    placeholder={pubType === "experience" ? "Ex : Trek au Jebel Chaambi, une aventure inoubliable" : "Ex : Forêt de Fernana"}
                    value={pubForm.title}
                    onChange={(e) => { setPubForm((f) => ({ ...f, title: e.target.value })); setPubTitleErr(""); }}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all placeholder:font-normal ${pubTitleErr ? "bg-red-50 border border-red-300 focus:ring-red-200" : "bg-slate-50 border border-slate-200 focus:ring-primary focus:bg-white"}`}
                  />
                  {pubTitleErr && <p className="text-xs font-semibold text-red-500 mt-1">{pubTitleErr}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">
                    {pubType === "experience" ? "Récit de l'expérience" : "Description du lieu"}
                  </label>
                  <textarea rows={5}
                    placeholder={pubType === "experience"
                      ? "Décrivez votre vécu : le trajet, les rencontres, les découvertes, l'impact écologique…"
                      : "Décrivez ce lieu : son intérêt écologique, son histoire, comment y accéder…"
                    }
                    value={pubForm.description}
                    onChange={(e) => setPubForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none placeholder:text-slate-400"
                  />
                </div>

                {/* Localisation */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Localisation</label>
                  <input type="text"
                    placeholder={pubType === "experience" ? "Ex : Jebel Chaambi, Kasserine" : "Ex : Lac de Bizerte, Bizerte"}
                    value={pubForm.place_name}
                    onChange={(e) => setPubForm((f) => ({ ...f, place_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400 mb-2"
                  />
                  <MapPicker lat={pubMapLat} lng={pubMapLng}
                    onPick={(lat, lng, address) => {
                      setPubMapLat(lat); setPubMapLng(lng);
                      if (address) setPubForm((f) => ({ ...f, place_name: address }));
                    }}
                  />
                </div>

                {/* Photos */}
                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos</label>
                  <label htmlFor="pub-images-input"
                    className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                    <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
                    <p className="text-xs font-semibold text-slate-400">Cliquez pour ajouter des photos</p>
                    <input id="pub-images-input" type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setPubImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {pubImages.length > 0 && (
                    <>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {pubImages.map((img, i) => {
                          const isCover = i === pubCoverIdx;
                          return (
                            <div key={i} onClick={() => setPubCoverIdx(i)}
                              className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${isCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                              <img src={img.preview} alt="" className="w-full h-full object-cover" />
                              {isCover && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                              <button type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  URL.revokeObjectURL(img.preview);
                                  setPubImages((prev) => prev.filter((_, idx) => idx !== i));
                                  setPubCoverIdx((c) => c >= i && c > 0 ? c - 1 : c);
                                }}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={10} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-2">Cliquez sur une photo pour la définir comme image principale.</p>
                    </>
                  )}
                </div>

                {pubError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <span className="material-symbols-outlined text-red-500 text-base">error</span>
                    <p className="text-sm font-semibold text-red-600">{pubError}</p>
                  </div>
                )}
              </form>
            </div>
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={closeAddPub}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button type="submit" form="add-pub-form" disabled={pubSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60">
                {pubSaving
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Publication…</>
                  : <><Send size={14} />Publier</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW PUBLICATION MODAL ═══════════════════════════════════════════ */}
      {viewPubOpen && viewPub && (() => {
        const officialImgs = viewPub.images?.filter((s) => s.startsWith("http")) ?? [];
        const communityItems = viewPub.type === "place" ? (topPhotos[viewPub.id]?.items ?? []) : [];
        const topDesc = viewPub.type === "place" ? topDescs[viewPub.id] : null;

        type SlideItem = { url: string; tag: "officiel" | "communauté"; authorPhoto?: string | null; authorName?: string; authorUserId?: string; authorRole?: string };
        const slides: SlideItem[] = [
          ...officialImgs.map((url) => ({ url, tag: "officiel" as const })),
          ...communityItems.map((item) => ({ url: item.url, tag: "communauté" as const, authorPhoto: item.author.photo, authorName: item.author.full_name, authorUserId: item.author.user_id, authorRole: item.author.role })),
        ];
        const safeIdx = Math.min(sliderIdx, Math.max(slides.length - 1, 0));
        const isExp = viewPub.type === "experience";
        const authorInitialsModal = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        const getProfilePath = (userId: string, role: string) => {
          if (role === "guide") return `/profile/guide/${userId}`;
          if (role === "project_owner") return `/profile/project-owner/${userId}`;
          return `/profile/ecovoyageur/${userId}`;
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={closeViewPub}
                className="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors">
                <X size={16} />
              </button>

              {/* Image carousel */}
              <div className="relative h-56 w-full overflow-hidden shrink-0 select-none"
                onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                onTouchEnd={(e) => {
                  if (touchStartX === null || slides.length <= 1) return;
                  const diff = touchStartX - e.changedTouches[0].clientX;
                  if (Math.abs(diff) > 40) setSliderIdx((i) => diff > 0 ? Math.min(i + 1, slides.length - 1) : Math.max(i - 1, 0));
                  setTouchStartX(null);
                }}>
                {slides.length > 0 ? (
                  <div className="flex h-full transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${(safeIdx / slides.length) * 100}%)`, width: `${slides.length * 100}%` }}>
                    {slides.map((slide, i) => (
                      <div key={i} className="h-full relative" style={{ width: `${100 / slides.length}%` }}>
                        <img src={slide.url} alt="" className="w-full h-full object-cover" />
                        {/* Badge Officiel / Communauté */}
                        {slide.tag === "officiel" ? (
                          <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wide bg-white/90 text-slate-700 px-2.5 py-1 rounded-full shadow border border-white/40">
                            Officiel
                          </span>
                        ) : (
                          <>
                            <span className="absolute bottom-3 left-3 text-[10px] font-black uppercase tracking-wide bg-emerald-500/90 text-white px-2.5 py-1 rounded-full shadow">
                              Communauté
                            </span>
                            {slide.authorPhoto !== undefined && (
                              <button
                                type="button"
                                onClick={() => slide.authorUserId && slide.authorRole && router.push(getProfilePath(slide.authorUserId, slide.authorRole))}
                                className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full hover:bg-black/60 transition-colors cursor-pointer"
                              >
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/60 bg-emerald-100 shrink-0 flex items-center justify-center">
                                  {slide.authorPhoto
                                    ? <img src={slide.authorPhoto} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-[7px] font-black text-emerald-700">{authorInitialsModal(slide.authorName ?? "")}</span>}
                                </div>
                                <span className="text-[10px] font-bold text-white">{slide.authorName}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className={`absolute inset-0 opacity-85 ${isExp ? "bg-gradient-to-br from-teal-500 to-emerald-400" : "bg-gradient-to-br from-blue-500 to-cyan-400"}`} />
                    <span className="material-symbols-outlined text-white/25 absolute inset-0 flex items-center justify-center" style={{ fontSize: 110 }}>
                      {isExp ? "hiking" : "location_on"}
                    </span>
                  </>
                )}
                {slides.length > 1 && (
                  <>
                    <button type="button" onClick={() => setSliderIdx((i) => Math.max(i - 1, 0))} disabled={safeIdx === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                      <ChevronLeft size={18} />
                    </button>
                    <button type="button" onClick={() => setSliderIdx((i) => Math.min(i + 1, slides.length - 1))} disabled={safeIdx === slides.length - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all disabled:opacity-30">
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {slides.map((_, i) => (
                        <button key={i} type="button" onClick={() => setSliderIdx(i)}
                          className={`h-1.5 rounded-full transition-all duration-200 ${i === safeIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="overflow-y-auto flex-1 px-8 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl ${isExp ? "bg-teal-50 text-teal-700 border border-teal-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                    {isExp ? "Expérience" : "Lieu recommandé"}
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight pr-8">{viewPub.title}</h2>
                {(viewPub.place_name || viewPub.region) && (
                  <div className="flex items-center gap-1.5 text-slate-600 text-sm font-semibold">
                    <MapPin size={14} className="text-primary shrink-0" />
                    {[viewPub.place_name, viewPub.region].filter(Boolean).join(" — ")}
                  </div>
                )}

                {/* Carte */}
                {!isExp && (
                  <PubMap
                    lat={viewPub.latitude}
                    lng={viewPub.longitude}
                    address={[viewPub.place_name, viewPub.region].filter(Boolean).join(", ")}
                  />
                )}
                {isExp && viewPub.region && (
                  <PubMap lat={null} lng={null} address={viewPub.region} />
                )}

                {/* Description officielle */}
                {viewPub.description && (
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{isExp ? "Récit" : "Description"}</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{viewPub.description}</p>
                  </div>
                )}

                {/* Description communauté gagnante */}
                {topDesc && (
                  <div className="border border-emerald-100 rounded-2xl p-4 bg-emerald-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => router.push(getProfilePath(topDesc.author.user_id, topDesc.author.role))}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-sm bg-emerald-100 shrink-0 flex items-center justify-center">
                          {topDesc.author.photo
                            ? <img src={topDesc.author.photo} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[7px] font-black text-emerald-700">{authorInitialsModal(topDesc.author.full_name)}</span>}
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700">{topDesc.author.full_name}</span>
                      </button>
                      <span className="ml-auto text-[9px] font-black uppercase tracking-wide bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                        Communauté
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{topDesc.content}</p>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 font-medium">
                  Publié le {new Date(viewPub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>

              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
                <button type="button" onClick={closeViewPub}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
                  Fermer
                </button>
                <button type="button" onClick={() => { closeViewPub(); openEditPub(viewPub); }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm hover:shadow transition-all active:scale-95">
                  <Edit3 size={13} />Gérer
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ EDIT PUBLICATION MODAL ═══════════════════════════════════════════ */}
      {editPubOpen && viewPub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <button onClick={closeEditPub}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
              <X size={16} />
            </button>
            <div className="px-8 pt-8 pb-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Edit3 size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Gérer la publication</h3>
                  <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{viewPub.title}</p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <form id="edit-pub-form" onSubmit={handleSavePub} className="px-8 py-6 space-y-5">

                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre</label>
                  <input type="text" value={editPubForm.title}
                    onChange={(e) => setEditPubForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description</label>
                  <textarea rows={4} value={editPubForm.description}
                    onChange={(e) => setEditPubForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Localisation</label>
                  <input type="text" value={editPubForm.place_name}
                    onChange={(e) => setEditPubForm((f) => ({ ...f, place_name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white mb-2"
                  />
                  <MapPicker lat={editPubMapLat} lng={editPubMapLng}
                    onPick={(lat, lng, address) => {
                      setEditPubMapLat(lat); setEditPubMapLng(lng);
                      if (address) setEditPubForm((f) => ({ ...f, place_name: address }));
                    }}
                  />
                </div>

                {/* Gérer les photos existantes */}
                {editPubImgs.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Photos actuelles</label>
                    <div className="grid grid-cols-4 gap-2">
                      {editPubImgs.map((img, i) => (
                        <div key={i} onClick={() => setEditPubCover(i)}
                          className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${i === editPubCover ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                          <img src={img.src} alt="" className="w-full h-full object-cover" />
                          {i === editPubCover && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                          <button type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditPubImgs((prev) => prev.filter((_, idx) => idx !== i));
                              setEditPubCover((c) => c >= i && c > 0 ? c - 1 : c);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="edit-pub-images" className="flex flex-col items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
                    <span className="material-symbols-outlined text-slate-300 text-2xl">add_photo_alternate</span>
                    <p className="text-xs font-semibold text-slate-400">Ajouter des photos</p>
                    <input id="edit-pub-images" type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setEditPubImgs((prev) => [...prev, ...files.map((f) => ({ src: URL.createObjectURL(f), file: f }))]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {editPubErr && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <span className="material-symbols-outlined text-red-500 text-base">error</span>
                    <p className="text-sm font-semibold text-red-600">{editPubErr}</p>
                  </div>
                )}
              </form>
            </div>
            <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setEditPubOpen(false); setEditPubErr(""); setViewPubOpen(true); setSliderIdx(0); }}
                  className="flex items-center gap-1.5 px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={14} />Retour
                </button>
                <button type="button" onClick={handleDeletePub} disabled={pubDeleting}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-red-500 hover:bg-red-50 font-bold text-xs transition-colors disabled:opacity-50">
                  <span className="material-symbols-outlined text-base leading-none">delete</span>
                  {pubDeleting ? "Suppression…" : "Supprimer"}
                </button>
              </div>
              <button type="submit" form="edit-pub-form" disabled={editPubSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-60">
                {editPubSaving
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Enregistrement…</>
                  : <><Send size={14} />Enregistrer</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MAIN CONTENT ═════════════════════════════════════════════════════ */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">

        {/* ── Profile Header Card ──────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden bg-white shadow-sm rounded-3xl border border-slate-100/80 mb-6">
          {profile.cover_photo
            ? <img src={profile.cover_photo} alt="" className="h-48 md:h-64 w-full object-cover" />
            : <BotanicalCover />
          }
          <div className="relative px-6 pb-6 pt-3 md:pt-0">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 md:-mt-20 gap-4">

              {/* Left : avatar + name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 min-w-0">
                <div className="flex flex-col items-center gap-2 shrink-0">
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

              {/* Right : action buttons — shrink-0 so they never compress */}
              <div className="flex flex-row flex-wrap justify-center md:justify-end gap-3 shrink-0 self-end pb-1">
                <button onClick={() => openAddPub("experience")}
                  className="whitespace-nowrap bg-teal-600 hover:bg-teal-600/90 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 hover:shadow-lg transition-all shadow-sm text-sm">
                  <span className="material-symbols-outlined text-base">hiking</span>
                  Ajouter une expérience
                </button>
                <button onClick={() => openAddPub("place")}
                  className="whitespace-nowrap bg-primary hover:bg-primary/90 active:scale-95 text-white font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 hover:shadow-lg transition-all shadow-sm text-sm">
                  <MapPin size={18} strokeWidth={2.5} />
                  Recommander un lieu
                </button>
                <button onClick={openEditProfile}
                  className="whitespace-nowrap border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 hover:shadow-sm active:scale-95 transition-all text-sm">
                  <Edit3 size={16} />
                  Modifier le profil
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ── Dashboard Columns ─────────────────────────────────────────────── */}
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
                        {(profile.interests as string[]).slice(0, 6).map((slug) => {
                          const tag = Object.values(TAXONOMY_TAGS).flat().find((t) => t.value === slug);
                          return <span key={slug} className="text-xs font-semibold text-slate-700">{tag?.label ?? slug}</span>;
                        })}
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

            {/* Messagerie */}
            <MessagerieWidget token={token} />

            {/* Amis */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-extrabold text-base text-slate-800">Amis</span>
                {friends.length > 0 && (
                  <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{friends.length}</span>
                )}
              </div>
              {/* Pending requests badge */}
              {friendRequests.length > 0 && (
                <button onClick={() => setActiveTab("amis")}
                  className="w-full flex items-center gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors">
                  <UserPlus size={13} />
                  {friendRequests.length} demande{friendRequests.length > 1 ? "s" : ""} en attente
                </button>
              )}
              {friends.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {friends.slice(0, 5).map((f) => (
                    <button key={f.user_id}
                      onClick={() => router.push(`/profile/ecovoyageur/${f.user_id}`)}
                      className="w-10 h-10 rounded-xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center hover:scale-105 transition-transform"
                      title={f.full_name}>
                      {f.photo
                        ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" />
                        : <span className="material-symbols-outlined text-slate-400 text-lg">person</span>
                      }
                    </button>
                  ))}
                  {friends.length > 5 && (
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-primary text-[11px] font-black border border-emerald-100/60 shadow-sm flex items-center justify-center">
                      +{friends.length - 5}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium">Aucun ami pour l'instant.</p>
              )}
            </div>


          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Tabs */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/50">
              {[
                { key: "tout",        label: "Tout",        Icon: LayoutGrid },
                { key: "experiences", label: "Expériences", Icon: Mountain    },
                { key: "lieux",       label: "Lieux",       Icon: MapPin      },
                { key: "amis",        label: "Amis",        Icon: Users       },
                { key: "apropos",     label: "À propos",    Icon: Info        },
              ].map(({ key, label, Icon }) => (
                <button key={key} onClick={() => setActiveTab(key as Tab)}
                  className={`flex-1 min-w-[70px] py-3 px-4 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}>
                  <Icon size={14} strokeWidth={2.5} /><span>{label}</span>
                </button>
              ))}
            </div>

            {/* ── Tout ── */}
            {activeTab === "tout" && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                  <Leaf size={12} className="text-primary" /><span>Publications éco-touristiques</span>
                </h3>
                {publications.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-100/90 shadow-sm p-12 text-center">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Compass className="text-primary w-7 h-7" />
                    </div>
                    <p className="text-slate-800 font-extrabold text-base mb-1">Aucune publication pour le moment</p>
                    <p className="text-slate-400 text-sm mb-5">Partagez une expérience vécue ou recommandez un lieu éco-touristique.</p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <button onClick={() => openAddPub("experience")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-2xl text-sm font-bold hover:bg-teal-600/90 shadow-sm">
                        <span className="material-symbols-outlined text-base leading-none">hiking</span>Ajouter une expérience
                      </button>
                      <button onClick={() => openAddPub("place")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 shadow-sm">
                        <MapPin size={16} />Recommander un lieu
                      </button>
                    </div>
                  </div>
                ) : (
                  publications.map((pub) => <PubCard key={pub.id} pub={pub} />)
                )}
              </div>
            )}

            {/* ── Expériences ── */}
            {activeTab === "experiences" && (
              <div className="space-y-4">
                {experiences.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">hiking</span>
                    <p className="font-bold text-slate-500">Aucune expérience partagée</p>
                    <p className="text-sm text-slate-400 mt-1">Racontez vos aventures éco-touristiques.</p>
                    <button onClick={() => openAddPub("experience")} className="mt-4 px-5 py-2.5 bg-teal-50 text-teal-700 font-bold rounded-xl text-sm hover:bg-teal-100 transition-colors">
                      Partager une expérience
                    </button>
                  </div>
                ) : (
                  experiences.map((pub) => <PubCard key={pub.id} pub={pub} />)
                )}
              </div>
            )}

            {/* ── Lieux ── */}
            {activeTab === "lieux" && (
              <div className="space-y-4">
                {lieux.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <MapPin className="text-slate-300 w-12 h-12 mb-3" />
                    <p className="font-bold text-slate-500">Aucun lieu recommandé</p>
                    <p className="text-sm text-slate-400 mt-1">Partagez des endroits éco-touristiques remarquables.</p>
                    <button onClick={() => openAddPub("place")} className="mt-4 px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors">
                      Recommander un lieu
                    </button>
                  </div>
                ) : (
                  lieux.map((pub) => <PubCard key={pub.id} pub={pub} />)
                )}
              </div>
            )}

            {/* ── Amis ── */}
            {activeTab === "amis" && (
              <div className="space-y-5">

                {/* Search bar */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <Search size={16} className="text-primary" /> Rechercher
                  </h3>
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nom d'un éco-voyageur, guide ou prestataire…"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors" />
                    {searchQuery && (
                      <button onClick={() => { setSearchQuery(""); setAllResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {allLoading && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-medium px-1">
                      <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Recherche…
                    </div>
                  )}
                  {!allLoading && allResults.length > 0 && (
                    <div className="mt-3 divide-y divide-slate-50">
                      {allResults.map((r) => {
                        const path = r._type === "traveler" ? `/profile/ecovoyageur/${r.user_id}` : r._type === "guide" ? `/profile/guide/${r.user_id}` : r._type === "provider" ? `/profile/provider/${r.user_id}` : `/profile/project-owner/${r.user_id}`;
                        const typeLabel = r._type === "traveler" ? "Éco-Voyageur" : r._type === "guide" ? "Guide" : r._type === "provider" ? "Prestataire" : "Propriétaire de projet";
                        const typeColor = r._type === "traveler" ? "bg-teal-50 text-teal-700" : r._type === "guide" ? "bg-emerald-50 text-emerald-700" : r._type === "provider" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700";
                        return (
                          <div key={`${r._type}-${r.user_id}`} className="flex items-center justify-between py-3 gap-3">
                            <button onClick={() => router.push(path)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 text-left">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                {r.photo ? <img src={r.photo} alt={r.full_name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400">{r._type === "project" || r._type === "provider" ? "business" : "person"}</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="font-extrabold text-slate-800 text-sm truncate">{r.full_name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${typeColor}`}>{typeLabel}</span>
                                  {r.sub && <span className="text-[10px] text-slate-400 font-medium truncate">{r.sub}</span>}
                                </div>
                              </div>
                            </button>
                            <button onClick={() => router.push(path)}
                              className="shrink-0 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">
                              Voir
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!allLoading && searchQuery.trim() && allResults.length === 0 && (
                    <p className="mt-3 text-xs text-slate-400 italic px-1">Aucun résultat pour "{searchQuery}"</p>
                  )}
                </div>

                {/* Pending requests */}
                {friendRequests.length > 0 && (
                  <div className="bg-white rounded-3xl border border-amber-100 shadow-sm p-6">
                    <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                      <UserPlus size={16} className="text-amber-500" />
                      Demandes reçues
                      <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">{friendRequests.length}</span>
                    </h3>
                    <div className="divide-y divide-slate-50">
                      {friendRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between py-3 gap-3">
                          <button onClick={() => router.push(`/profile/ecovoyageur/${req.sender.user_id}`)}
                            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {req.sender.photo
                                ? <img src={req.sender.photo} alt={req.sender.full_name} className="w-full h-full object-cover" />
                                : <span className="material-symbols-outlined text-slate-400">person</span>
                              }
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-sm">{req.sender.full_name}</p>
                              <p className="text-xs text-slate-400 font-medium">
                                {new Date(req.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                          </button>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => acceptRequest(req.id, req.sender.user_id)}
                              disabled={actionLoading === req.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-slate-900 text-xs font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-60">
                              <Check size={12} /> Accepter
                            </button>
                            <button onClick={() => rejectRequest(req.id)}
                              disabled={actionLoading === req.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:border-red-300 hover:text-red-500 transition-all disabled:opacity-60">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends list */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <UserCheck size={16} className="text-primary" /> Mes amis
                    {friends.length > 0 && <span className="bg-primary/10 text-primary text-xs font-black px-2 py-0.5 rounded-full">{friends.length}</span>}
                  </h3>
                  {friends.length === 0 ? (
                    <div className="text-center py-8">
                      <Users size={36} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Vous n'avez pas encore d'amis.</p>
                      <p className="text-xs text-slate-300 mt-1">Recherchez des éco-voyageurs ci-dessus.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {friends.map((f) => (
                        <div key={f.user_id} className="flex items-center justify-between py-3 gap-2">
                          <button onClick={() => router.push(`/profile/ecovoyageur/${f.user_id}`)}
                            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {f.photo
                                ? <img src={f.photo} alt={f.full_name} className="w-full h-full object-cover" />
                                : <span className="material-symbols-outlined text-slate-400">person</span>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-800 text-sm truncate">{f.full_name}</p>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">Éco-Voyageur</span>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => router.push(`/profile/ecovoyageur/${f.user_id}`)}
                              className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">
                              Voir
                            </button>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setOpenMenuId(openMenuId === `f-${f.user_id}` ? null : `f-${f.user_id}`)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                <MoreVertical size={15} />
                              </button>
                              {openMenuId === `f-${f.user_id}` && (
                                <div className="absolute right-0 top-9 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                  <button onClick={() => handleRemoveFriend(f.user_id, f.friendship_id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                    <UserX size={14} className="text-slate-400" /> Retirer
                                  </button>
                                  <button onClick={() => { handleBlockFriend(f.user_id); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50">
                                    <ShieldBan size={14} /> Bloquer
                                  </button>
                                  <div className="border-t border-slate-100 my-0.5" />
                                  <button onClick={() => { setReportTarget({ id: f.user_id, name: f.full_name }); setOpenMenuId(null); }}
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

                {/* Suivi(e)s list */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 flex items-center gap-2">
                    <ArrowRight size={16} className="text-emerald-600" /> Mes suivi(e)s
                    {followings.length > 0 && <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-2 py-0.5 rounded-full">{followings.length}</span>}
                  </h3>
                  {followings.length === 0 ? (
                    <div className="text-center py-8">
                      <Users size={36} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">Vous ne suivez personne pour l'instant.</p>
                      <p className="text-xs text-slate-300 mt-1">Découvrez des guides et prestataires à suivre.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {followings.map((u) => (
                        <div key={u.user_id} className="flex items-center justify-between py-3 gap-2">
                          <button onClick={() => router.push(followUserPath(u))}
                            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {u.photo
                                ? <img src={u.photo} alt={u.full_name ?? ""} className="w-full h-full object-cover" />
                                : <span className="material-symbols-outlined text-slate-400">{u._type === "project" ? "business" : u._type === "provider" ? "storefront" : "person"}</span>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-800 text-sm truncate">{u.full_name ?? "—"}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${followTypeBadgeColor(u._type ?? (u as any).role)}`}>{followTypeLabel(u._type ?? (u as any).role)}</span>
                                {u.sub && <span className="text-[10px] text-slate-400 font-medium truncate">{u.sub}</span>}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => router.push(followUserPath(u))}
                              className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-slate-900 transition-all">
                              Voir
                            </button>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => setOpenMenuId(openMenuId === `u-${u.user_id}` ? null : `u-${u.user_id}`)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                                <MoreVertical size={15} />
                              </button>
                              {openMenuId === `u-${u.user_id}` && (
                                <div className="absolute right-0 top-9 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
                                  <button onClick={() => handleUnfollow(u.user_id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                    <UserX size={14} className="text-slate-400" /> Se désabonner
                                  </button>
                                  <button onClick={async () => {
                                    try {
                                      await apiFetch(`/follows/${u.user_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
                                      await apiFetch(`/eco-traveler/block/${u.user_id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                                      setFollowings((prev) => prev.filter((x) => x.user_id !== u.user_id));
                                    } catch {}
                                    setOpenMenuId(null);
                                  }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50">
                                    <ShieldBan size={14} /> Bloquer
                                  </button>
                                  <div className="border-t border-slate-100 my-0.5" />
                                  <button onClick={() => { setReportTarget({ id: u.user_id, name: u.full_name ?? "" }); setOpenMenuId(null); }}
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


              </div>
            )}

            {/* ── À propos ── */}
            {activeTab === "apropos" && (
              <div className="space-y-6">

                {/* Bio */}
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

                {/* Profil voyageur */}
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

                {/* Centres d'intérêt */}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100/80 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center">
                        <Heart size={16} className="text-violet-600" />
                      </div>
                      <h3 className="text-base font-extrabold text-slate-800">Activités & intérêts</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(profile.interests as string[]).map((slug) => {
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

                {/* Paysages + Valeurs + Objectifs */}
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

                {/* Score + Badges */}
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
                  {profile.badges.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-3">Badges</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map((b, i) => (
                          <div key={i} className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold">
                            <Star size={11} className="text-amber-500" />{b.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
