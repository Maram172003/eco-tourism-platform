"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Globe, Star, UserPlus, UserMinus,
  Clock, Leaf, MoreVertical, Flag, X, Check, ChevronLeft, ChevronRight,
  Send, ArrowRight, Sparkles, Phone, ShieldBan,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import PubInteractions from "@/components/PubInteractions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  provider_type: string | null;
  bio: string | null;
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
  languages_spoken: string[] | null;
  years_experience: number | null;
  sustainability_score: number | null;
  eco_labels: string[] | null;
  certifications: string[] | null;
  opening_hours: string | null;
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
  sustainability_score: number | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_TYPES: Record<string, { label: string; icon: string }> = {
  guide:       { label: "Guide nature",           icon: "explore" },
  agence:      { label: "Agence de voyage",        icon: "travel_explore" },
  ecolodge:    { label: "Écolodge / Hébergement",  icon: "hotel" },
  restaurant:  { label: "Restauration",            icon: "restaurant" },
  artisan:     { label: "Artisan",                 icon: "palette" },
  association: { label: "Association",             icon: "volunteer_activism" },
  bien_etre:   { label: "Bien-être",               icon: "spa" },
  transport:   { label: "Transport",               icon: "directions_bus" },
};

const OFFER_TYPES = [
  { value: "hebergement",  label: "Hébergement",  icon: "hotel",          gradient: "from-blue-500 to-cyan-400" },
  { value: "activite",     label: "Activité",      icon: "sports",         gradient: "from-orange-500 to-amber-400" },
  { value: "circuit",      label: "Circuit",       icon: "route",          gradient: "from-indigo-500 to-blue-400" },
  { value: "restauration", label: "Restauration",  icon: "restaurant",     gradient: "from-rose-500 to-pink-400" },
  { value: "artisanat",    label: "Artisanat",     icon: "palette",        gradient: "from-violet-500 to-purple-400" },
  { value: "bien_etre",    label: "Bien-être",     icon: "spa",            gradient: "from-teal-500 to-emerald-400" },
  { value: "transport",    label: "Transport",     icon: "directions_car", gradient: "from-slate-500 to-slate-400" },
  { value: "autre",        label: "Autre",         icon: "category",       gradient: "from-emerald-500 to-teal-400" },
];

const REPORT_REASONS = [
  "Contenu inapproprié", "Faux profil", "Harcèlement ou spam",
  "Informations trompeuses", "Autre",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-primary", bar: "bg-primary" };
  if (score >= 60) return { text: "text-emerald-600", bar: "bg-emerald-500" };
  if (score >= 40) return { text: "text-teal-600", bar: "bg-teal-500" };
  return { text: "text-blue-600", bar: "bg-blue-500" };
}

function scoreLabel(score: number | null) {
  if (score === null) return "Prestataire Éco-Voyage";
  if (score >= 80) return "Prestataire Ambassadeur";
  if (score >= 60) return "Prestataire Engagé";
  if (score >= 40) return "Prestataire Sensible";
  return "Prestataire en Développement";
}

function OfferCard({ offer, onClick }: { offer: Offer; onClick: () => void }) {
  const coverImg = offer.images?.[0];
  const typeData = OFFER_TYPES.find((t) => t.value === offer.offer_type)
    ?? { label: "Offre", icon: "category", gradient: "from-slate-400 to-slate-500" };
  return (
    <div onClick={onClick} className="flex flex-col lg:flex-row cursor-pointer">
      <div className="lg:w-2/5 relative min-h-[180px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
        {coverImg ? (
          <img src={coverImg} alt={offer.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${typeData.gradient} opacity-90`} />
            <span className="material-symbols-outlined text-white/40 relative z-10" style={{ fontSize: 80 }}>{typeData.icon}</span>
          </>
        )}
        {offer.price !== null && (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow border border-slate-100 text-right">
            <span className="text-primary font-extrabold text-base tracking-tight">{offer.price} TND</span>
            {offer.duration && <span className="text-slate-400 text-[10px] font-bold block leading-none">/{offer.duration}</span>}
          </div>
        )}
      </div>
      <div className="lg:w-3/5 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 leading-tight mb-2">{offer.title}</h3>
          {offer.description && <p className="text-slate-500 text-sm leading-relaxed mb-3 line-clamp-2">{offer.description}</p>}
          <div className="flex flex-wrap gap-2">
            <span className="bg-primary/10 text-primary rounded-xl px-3 py-1 text-[11px] font-extrabold tracking-wider flex items-center gap-1">
              <Sparkles size={11} className="text-primary shrink-0" />{typeData.label}
            </span>
            {offer.region && (
              <span className="bg-slate-50 text-slate-500 border border-slate-100 rounded-xl px-3 py-1 text-[11px] font-bold flex items-center gap-1">
                <MapPin size={10} className="text-primary" />{offer.region}
              </span>
            )}
          </div>
          {offer.sustainability_score !== null && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Durabilité</span>
                <span className="text-[10px] font-black text-primary">{offer.sustainability_score}/100</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${offer.sustainability_score}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end border-t border-slate-50 pt-3 mt-3">
          <span className="text-primary font-extrabold text-xs inline-flex items-center gap-1">
            Voir les détails <ArrowRight size={13} strokeWidth={2.5} />
          </span>
        </div>
      </div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [userRole, setUserRole] = useState("");
  const [viewerId, setViewerId] = useState("");

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [sliderIdx, setSliderIdx] = useState(0);

  const [following, setFollowing] = useState(false);
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

    Promise.all([
      apiFetch<Provider>(`/providers/${userId}`),
      apiFetch<Offer[]>(`/offers?authorId=${userId}`).catch(() => [] as Offer[]),
      apiFetch<{ following: boolean; pending: boolean; followId: string | null }>(`/follows/status/${userId}`, { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => ({ following: false, pending: false, followId: null })),
    ]).then(([p, o, status]) => {
      setProfile(p);
      setOffers(o);
      setFollowing(status.following);
      setFollowPending(status.pending);
      setFollowId(status.followId);
    }).catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

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
        setFollowing(false); setFollowId(null);
      } else if (followPending && followId) {
        await apiFetch(`/follows/${followId}/reject`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setFollowPending(false); setFollowId(null);
      } else {
        const f = await apiFetch<{ id: string }>(`/follows/${userId}/provider`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        setFollowPending(true); setFollowId(f.id);
      }
    } finally { setFollowLoading(false); }
  }

  function handleContact() {
    const name = encodeURIComponent(profile?.organization ?? profile?.full_name ?? "");
    router.push(`/messagerie?recipient=${userId}&name=${name}&role=provider`);
  }

  async function blockUser() {
    if (!token) return;
    try {
      if (following && followId) await apiFetch(`/follows/${userId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      await apiFetch(`/eco-traveler/block/${userId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setFollowing(false); setFollowId(null); setMenuOpen(false);
    } catch {}
  }

  async function reportUser() {
    if (!token || !reportReason) return;
    await apiFetch(`/reports`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ reported_id: userId, reason: reportReason }) }).catch(() => {});
    setReportSent(true);
  }

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

  const typeInfo = profile.provider_type ? (PROVIDER_TYPES[profile.provider_type] ?? { label: profile.provider_type, icon: "eco" }) : { label: "Prestataire", icon: "eco" };
  const sc = profile.sustainability_score !== null ? scoreColor(profile.sustainability_score) : null;
  const displayName = profile.organization ?? profile.full_name ?? "Prestataire";

  return (
    <>
    <div className="min-h-screen bg-slate-100 pb-16">

      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <span className="font-extrabold text-slate-900 text-base">{displayName}</span>
        <div className="w-9 h-9" />
      </div>

      {/* Cover */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-teal-200 via-emerald-100 to-slate-200 overflow-hidden">
        {profile.cover_photo && (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${profile.cover_photo}')` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100">
              <div className="flex flex-col items-center px-6 pb-6 pt-2">
                <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-teal-100 to-emerald-50 flex items-center justify-center mb-4">
                  {profile.photo
                    ? <img src={profile.photo} alt={displayName} className="w-full h-full object-cover" />
                    : <span className="material-symbols-outlined text-primary" style={{ fontSize: 52 }}>{typeInfo.icon}</span>
                  }
                </div>

                <h1 className="text-xl font-black text-slate-900 text-center">{displayName}</h1>
                {profile.organization && profile.full_name && (
                  <p className="text-sm text-slate-400 font-medium mt-0.5 text-center">{profile.full_name}</p>
                )}
                <p className="text-sm font-semibold text-primary mt-1 text-center">
                  <span className="material-symbols-outlined align-middle" style={{ fontSize: 16 }}>{typeInfo.icon}</span> {typeInfo.label}
                </p>

                {profile.bio && <p className="text-sm text-slate-500 leading-relaxed mt-3 text-center">{profile.bio}</p>}

                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {profile.region && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <MapPin size={13} className="text-primary" />{profile.region}
                    </span>
                  )}
                  {profile.zone && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <MapPin size={13} className="text-primary" />{profile.zone}
                    </span>
                  )}
                  {profile.years_experience && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Star size={13} className="text-primary" />{profile.years_experience} ans d'exp.
                    </span>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                      <Globe size={13} />{profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {profile.opening_hours && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Clock size={13} className="text-primary" />{profile.opening_hours}
                    </span>
                  )}
                </div>

                {(profile.activity_types?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {profile.activity_types!.map((a) => (
                      <span key={a} className="px-2.5 py-1 bg-teal-50 text-teal-700 text-[11px] font-bold rounded-full">{a}</span>
                    ))}
                  </div>
                )}

                {(profile.languages_spoken?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {profile.languages_spoken!.map((l) => (
                      <span key={l} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-full">{l}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
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

                {/* Contact */}
                {(profile.phone || profile.whatsapp) && (
                  <div className="mt-3 w-full flex gap-2">
                    {profile.phone && (
                      <a href={`tel:${profile.phone}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600">
                        <Phone size={14} /> Appeler
                      </a>
                    )}
                    {profile.whatsapp && (
                      <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600">
                        💬 WhatsApp
                      </a>
                    )}
                  </div>
                )}
                {(userRole === "eco_traveler" || userRole === "project") && (
                  <button onClick={handleContact}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 text-slate-700 rounded-2xl font-extrabold text-sm hover:bg-slate-50 active:scale-95 transition-all">
                    <Send size={14} /> Message
                  </button>
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

            {/* Labels écologiques */}
            {(profile.eco_labels?.length ?? 0) > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Labels écologiques</p>
                <div className="flex flex-wrap gap-2">
                  {profile.eco_labels!.map((l) => (
                    <span key={l} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-100">
                      🌿 {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            {(profile.certifications?.length ?? 0) > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Certifications</p>
                <div className="space-y-2">
                  {profile.certifications!.map((c) => (
                    <div key={c} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <span className="material-symbols-outlined text-primary text-base">verified</span>{c}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Offers */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-extrabold text-slate-800">Offres</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {offers.length === 0 ? "Aucune offre publiée" : `${offers.length} offre${offers.length > 1 ? "s" : ""}`}
                </p>
              </div>
              {offers.length === 0 ? (
                <div className="py-16 text-center">
                  <Leaf size={40} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold text-sm">Aucune offre pour l'instant.</p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {offers.map((o) => (
                    <div key={o.id}
                      ref={(el) => { offerRefs.current[o.id] = el; }}
                      className={`bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${highlightedOfferId === o.id ? "border-primary ring-2 ring-primary ring-offset-2" : "border-slate-100"}`}>
                      <OfferCard offer={o} onClick={() => { setSelectedOffer(o); setSliderIdx(0); }} />
                      <PubInteractions
                        pubId={o.id}
                        token={token}
                        viewerId={viewerId}
                        shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/profile/provider/${userId}?offer=${o.id}`}
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

      {/* ══ REPORT MODAL ═════════════════════════════════════════════════════ */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!reportSent) setReportOpen(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {reportSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <Check size={24} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-4">Signalement envoyé</h3>
                <button onClick={() => { setReportOpen(false); setReportSent(false); setReportReason(""); }}
                  className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-2xl text-sm">
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><Flag size={22} className="text-red-500" /></div>
                <h3 className="text-lg font-extrabold text-slate-900 text-center mb-5">Signaler ce profil</h3>
                <div className="space-y-2 mb-5">
                  {REPORT_REASONS.map((r) => (
                    <button key={r} onClick={() => setReportReason(r)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${reportReason === r ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {r}
                    </button>
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

      {/* ══ OFFER DETAIL MODAL ═══════════════════════════════════════════════ */}
      {selectedOffer && (() => {
        const imgs = selectedOffer.images?.filter((s) => s.startsWith("http")) ?? [];
        const typeData = OFFER_TYPES.find((t) => t.value === selectedOffer.offer_type) ?? OFFER_TYPES[OFFER_TYPES.length - 1];
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedOffer(null)}>
            <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {imgs.length > 0 ? (
                <div className="relative h-60 overflow-hidden rounded-t-3xl bg-slate-900">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${imgs[sliderIdx]}')` }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {imgs.length > 1 && <>
                    <button onClick={(e) => { e.stopPropagation(); setSliderIdx((i) => (i - 1 + imgs.length) % imgs.length); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><ChevronLeft size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); setSliderIdx((i) => (i + 1) % imgs.length); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><ChevronRight size={18} /></button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {imgs.map((_, i) => <button key={i} onClick={() => setSliderIdx(i)} className={`w-2 h-2 rounded-full ${i === sliderIdx ? "bg-white scale-125" : "bg-white/50"}`} />)}
                    </div>
                  </>}
                  <button onClick={() => setSelectedOffer(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><X size={16} /></button>
                </div>
              ) : (
                <div className={`relative h-24 bg-gradient-to-br ${typeData.gradient} rounded-t-3xl flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white/40" style={{ fontSize: 56 }}>{typeData.icon}</span>
                  <button onClick={() => setSelectedOffer(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></button>
                </div>
              )}
              <div className="px-6 py-5 space-y-4">
                {selectedOffer.offer_type && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20">{typeData.label}</span>}
                <h2 className="text-xl font-extrabold text-slate-800 leading-snug">{selectedOffer.title}</h2>
                <div className="flex flex-wrap gap-3">
                  {selectedOffer.price !== null && <span className="text-sm font-black text-primary">💰 {selectedOffer.price} TND</span>}
                  {selectedOffer.duration && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><Clock size={13} />{selectedOffer.duration}</span>}
                  {selectedOffer.region && <span className="flex items-center gap-1 text-sm font-semibold text-slate-500"><MapPin size={13} className="text-primary" />{selectedOffer.region}</span>}
                </div>
                {selectedOffer.description && (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedOffer.description}</p>
                )}
                {selectedOffer.sustainability_score !== null && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">🌿 Durabilité</span>
                      <span className="text-sm font-black text-primary">{selectedOffer.sustainability_score}/100</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${selectedOffer.sustainability_score}%` }} />
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
