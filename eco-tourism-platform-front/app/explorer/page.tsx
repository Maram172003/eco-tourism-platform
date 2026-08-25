"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Leaf, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { logoutUser } from "@/lib/auth";
import { MapPin, Clock, Users, Star, Calendar, Loader2, UserPlus, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";
import { DOMAINES } from "@/lib/guideOfferConfig";
import PubInteractions from "@/components/PubInteractions";
import PlaceContributions, { type TopPhotoData, type TopDescData } from "@/components/PlaceContributions";
import OfferDetailView from "@/components/offer/OfferDetailView";
import CircuitDetailView from "@/components/circuit/CircuitDetailView";
import SustainabilityBadge from "@/components/common/SustainabilityBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashNotif = { id: string; type: string; data: Record<string, any>; is_read: boolean; created_at: string };

type BasicProfile = {
  user_id: string;
  full_name: string;
  photo: string | null;
  profile_completion: number;
  sustainability_score: number | null;
};

type OfferCollaborator = {
  name: string;
  section: string;
  photo: string | null;
  section_context: {
    domaine?: string; expertises?: string[];
    categorie?: string; sous_types?: string[];
  } | null;
  contribution_data: Record<string, any> | null;
};

type OfferFeed = {
  id: string; title: string; description: string | null;
  price: number | null; duration: string | null;
  offer_type: string | null; offer_subtypes: string[] | null;
  region: string | null; meeting_point: string | null;
  availability_mode: string | null;
  availability_start: string | null; availability_end: string | null;
  author_type: "guide" | "project_owner";
  author_name: string | null; author_photo: string | null;
  org_name: string | null; org_logo: string | null;
  images: string[] | null;
  min_group_size: number | null; max_group_size: number | null;
  min_age: number | null; sustainability_score: number | null;
  collaborators: OfferCollaborator[];
  details: Record<string, any> | null;
  created_at: string;
};

type CircuitFeed = {
  id: string; provider_id: string; title: string;
  description: string | null; nb_jours: number;
  sustainability_score?: number | null;
  cover_image: string | null; etapes: any[]; owner_type: string;
  author_name: string | null; author_photo: string | null;
  org_name: string | null; org_logo: string | null;
  created_at: string;
};

type PublicationFeed = {
  id: string; author_id: string; type: "place" | "experience";
  title: string; description: string | null;
  images: string[] | null; region: string | null;
  place_name: string | null; status: string; created_at: string;
  author?: { user_id: string; full_name: string; photo: string | null; role: string };
};

type FeedItem =
  | { type: "publication"; id: string; created_at: string; data: PublicationFeed }
  | { type: "offer";       id: string; created_at: string; data: OfferFeed }
  | { type: "circuit";     id: string; created_at: string; data: CircuitFeed };

type RecommendedItem = {
  type: "offer" | "circuit";
  id: string;
  created_at: string;
  matchScore: number;
  likesCount?: number;
  data: OfferFeed | CircuitFeed;
};

type RecoResponse = {
  items: RecommendedItem[];
  mode: "tagged" | "recent";
};

// ─── Notification label (identique au dashboard) ──────────────────────────────

function notifLabel(n: DashNotif): { title: string; body: string; icon: string } {
  const section   = n.data?.section ?? "";
  const isCircuit = !!n.data?.circuit_id;
  const resource  = isCircuit ? (n.data?.circuit_title ?? "un circuit") : (n.data?.offer_title ?? "une offre");
  const who       = n.data?.inviter_name ?? n.data?.invited_user_name ?? "Quelqu'un";
  const sourceOf  = isCircuit ? "du circuit" : "de l'offre";
  switch (n.type) {
    case "collaboration_invite":
      return { title: "Invitation à collaborer", icon: "handshake",
        body: `${who} vous invite à compléter la section « ${section} » ${sourceOf} « ${resource} »` };
    case "collab_accepted":
      return { title: "Collaboration acceptée", icon: "check_circle",
        body: `${who} a accepté votre invitation pour la section « ${section} » ${sourceOf} « ${resource} »` };
    case "collab_declined":
      return { title: "Invitation refusée", icon: "cancel",
        body: `${who} a refusé votre invitation pour la section « ${section} » ${sourceOf} « ${resource} »` };
    case "collab_quit":
      return { title: "Collaborateur retiré", icon: "person_remove",
        body: `${who} a quitté la section « ${section} » ${sourceOf} « ${resource} »` };
    case "offer_deleted":
      return { title: "Offre supprimée", icon: "delete_forever",
        body: `L'offre « ${resource} » à laquelle vous collaboriez a été supprimée` };
    case "circuit_deleted":
      return { title: "Circuit supprimé", icon: "delete_forever",
        body: `Le circuit « ${resource} » auquel vous collaboriez a été supprimé` };
    case "collab_kicked":
      return { title: "Retiré de la collaboration", icon: "person_remove",
        body: `Vous avez été retiré de la section « ${section} » ${sourceOf} « ${resource} »` };
    case "offer_schedule_changed":
    case "circuit_schedule_changed":
      return { title: "Horaires mis à jour", icon: "event_available",
        body: `Les horaires de « ${resource} » (${section}) ont changé. Votre agenda a été synchronisé automatiquement.` };
    case "offer_schedule_conflict":
    case "circuit_schedule_conflict":
      return { title: "Conflit d'agenda", icon: "event_busy",
        body: `Les horaires de « ${resource} » (${section}) créent un conflit avec votre agenda. Réglez votre agenda.` };
    default:
      return { title: "Notification", icon: "notifications", body: n.data?.message ?? "" };
  }
}

// ─── Score helpers ────────────────────────────────────────────────────────────

function getScoreLabel(score: number | null, role: string): string {
  if (score === null) {
    if (role === "guide") return "Guide — Évaluation en attente";
    if (role === "eco_traveler") return "Éco-Voyageur";
    return "Prestataire — Évaluation en attente";
  }
  if (role === "guide") {
    if (score >= 80) return "Guide Ambassadeur";
    if (score >= 60) return "Guide Expert";
    if (score >= 40) return "Guide Engagé";
    return "Guide en Développement";
  }
  if (role === "eco_traveler") {
    if (score >= 80) return "Ambassadeur Éco-Voyage";
    if (score >= 60) return "Voyageur Éco-Responsable";
    if (score >= 40) return "Voyageur Engagé";
    return "Voyageur Éco-Débutant";
  }
  if (score >= 80) return "Prestataire Ambassadeur";
  if (score >= 60) return "Prestataire Expert";
  if (score >= 40) return "Prestataire Engagé";
  return "Prestataire en Développement";
}

// ─── Feed helpers ──────────────────────────────────────────────────────────────

const OFFER_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=800&q=80",
  "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
];

function seedFromId(id: string, mod: number) { return id.charCodeAt(0) % mod; }

const GUIDE_TYPE_LABELS: Record<string, string> = {
  guide: "Guidage", eco_tour: "Éco-Tour", activite: "Activité",
  culture_patrimoine: "Culture & Patrimoine", bien_etre_spa: "Bien-être & Spa",
  volontariat_eco: "Volontariat éco", artisanat: "Artisanat",
  agriculture_terroir: "Agriculture & Terroir",
};

function getTypeLabel(type: string | null) {
  if (!type) return "Offre";
  return PROVIDER_SCHEMA.find((c) => c.value === type)?.label
    ?? GUIDE_TYPE_LABELS[type]
    ?? type;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ─── Sustainability (dupliqué depuis destinations/page.tsx) ───────────────────


// ─── Helpers offre ───────────────────────────────────────────────────────────

const ALL_SUBTYPES = PROVIDER_SCHEMA.flatMap((c) => c.subtypes ?? []);
function subtypeLabel(v: string) { return ALL_SUBTYPES.find((s) => s.value === v)?.label ?? v; }

const SECTION_LABELS: Record<string, string> = {
  transport: "Transport", transport_eco: "Transport éco",
  hebergement: "Hébergement", restauration: "Restauration",
  guide: "Guidage", activite: "Activité", artisanat: "Artisanat",
  bien_etre_spa: "Bien-être & Spa", volontariat_eco: "Volontariat éco",
  autre_service: "Autre service",
};
function sectionLabel(s: string) { return SECTION_LABELS[s] ?? s; }
function domaineLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return DOMAINES[key]?.label ?? key;
}

function availLabel(mode: string | null, start: string | null, end: string | null, isGuide?: boolean): string | null {
  if (!mode) return isGuide ? "Selon disponibilités du guide" : null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (mode === "period" && start && end) return `Du ${fmt(start)} au ${fmt(end)}`;
  if (mode === "period") return "Période définie";
  if (mode === "weekly") return "Récurrent (hebdomadaire)";
  if (mode === "specific") return "Dates spécifiques";
  if (mode === "always") return "Disponible en permanence";
  return null;
}

// ─── Chips collaborateur ─────────────────────────────────────────────────────

function collabChips(c: OfferCollaborator, det: Record<string, any>): { guide: string[]; provider: string[] } {
  const ctx = c.section_context;
  // Source 1 : section_context (rempli lors de l'invitation)
  if (ctx) {
    const domaineRaw = ctx.domaine ?? null;
    const dom = domaineLabel(domaineRaw);
    const expertises: string[] = Array.isArray(ctx.expertises) ? ctx.expertises : [];
    const categorieRaw = ctx.categorie ?? null;
    const cat = categorieRaw
      ? (PROVIDER_SCHEMA.find((p) => p.value === categorieRaw)?.label ?? sectionLabel(categorieRaw))
      : null;
    const sous = ((ctx.sous_types ?? []) as string[]).map(subtypeLabel).filter(Boolean);
    if (expertises.length > 0) return { guide: expertises.map((e) => dom ? `${dom} · ${e}` : e), provider: [] };
    if (dom) return { guide: [dom], provider: [] };
    if (sous.length > 0) return { guide: [], provider: sous.map((s) => cat ? `${cat} · ${s}` : s) };
    if (cat) return { guide: [], provider: [cat] };
  }
  // Source 2 : contribution_data.formData (rempli par le collaborateur à sa contribution)
  const fd = (c.contribution_data?.formData ?? {}) as Record<string, any>;
  const sec = c.section;
  if (sec === "transport") {
    const ecoSt = (fd.transport_eco_sous_type ?? det.transport_eco_sous_type) as string | undefined;
    const stdSt = (fd.transport_std_sous_type ?? det.transport_std_sous_type) as string | undefined;
    if (ecoSt) return { guide: [], provider: [`Transport éco · ${subtypeLabel(ecoSt)}`] };
    if (stdSt) return { guide: [], provider: [`Transport · ${subtypeLabel(stdSt)}`] };
    // Fallback sur transport_types (contient des valeurs de sous-types comme "caleche_charrette")
    const tTypes = ((fd.transport_types ?? det.transport_types) ?? []) as string[];
    if (tTypes.length > 0) {
      const ecoVals = new Set(PROVIDER_SCHEMA.find((p) => p.value === "transport_eco")?.subtypes?.map((s) => s.value) ?? []);
      const firstT = tTypes[0];
      const prefix = ecoVals.has(firstT) ? "Transport éco" : "Transport";
      const lbl = subtypeLabel(firstT);
      return { guide: [], provider: lbl !== firstT ? [`${prefix} · ${lbl}`] : [prefix] };
    }
  }
  if (sec === "hebergement") {
    const st = (fd.hebergement_prest_sous_type ?? det.hebergement_prest_sous_type) as string | undefined;
    if (st) return { guide: [], provider: [`Hébergement · ${subtypeLabel(st)}`] };
    const hTypes = ((fd.hebergement_types ?? det.hebergement_types) ?? []) as string[];
    if (hTypes.length > 0) {
      const lbl = subtypeLabel(hTypes[0]);
      return { guide: [], provider: [lbl !== hTypes[0] ? `Hébergement · ${lbl}` : "Hébergement"] };
    }
  }
  if (sec === "restauration") {
    const pSt = (fd.restauration_prest_sous_type ?? det.restauration_prest_sous_type) as string | undefined;
    const gExp = (fd.restauration_gastro_expertise ?? det.restauration_gastro_expertise) as string | undefined;
    if (pSt) return { guide: [], provider: [`Restaurant & Terroir · ${subtypeLabel(pSt)}`] };
    if (gExp) return { guide: [`Restauration · ${gExp}`], provider: [] };
    const rTypes = ((fd.restauration_types ?? det.restauration_types) ?? []) as string[];
    if (rTypes.length > 0) return { guide: [], provider: ["Restauration"] };
  }
  if (sec === "autre_service") {
    const fdMode = (fd.autre_service_details as Record<string, any> | undefined)?._mode
      ?? (det.autre_service_details as Record<string, any> | undefined)?._mode
      ?? "prestataire";
    const catRaw = (fd.autre_service_categorie ?? det.autre_service_categorie) as string | undefined;
    const stRaw  = (fd.autre_service_sous_type  ?? det.autre_service_sous_type)  as string | undefined;
    if (fdMode === "guide" && catRaw) {
      const dom = domaineLabel(catRaw);
      const exp = stRaw ?? null;
      if (dom && exp) return { guide: [`${dom} · ${exp}`], provider: [] };
      if (dom) return { guide: [dom], provider: [] };
    }
    if (fdMode === "prestataire" && catRaw) {
      const catLabel = PROVIDER_SCHEMA.find((p) => p.value === catRaw)?.label ?? catRaw;
      if (stRaw) return { guide: [], provider: [`${catLabel} · ${subtypeLabel(stRaw)}`] };
      return { guide: [], provider: [catLabel] };
    }
  }
  return { guide: [], provider: [] };
}

// ─── OfferCard (dupliqué depuis destinations/page.tsx) ────────────────────────

function OfferCard({ offer, onClick }: { offer: OfferFeed; onClick: () => void }) {
  const image = offer.images?.[0] ?? OFFER_PLACEHOLDERS[seedFromId(offer.id, OFFER_PLACEHOLDERS.length)];
  const isGuide = offer.author_type === "guide";
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={onClick}>
      <div className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url('${image}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <span className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-extrabold text-slate-700 uppercase tracking-widest shadow-sm">Offre</span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm shadow-sm ${isGuide ? "bg-emerald-500/90 text-white" : "bg-blue-500/90 text-white"}`}>{isGuide ? "Guide" : "Prestataire"}</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          {offer.region && (<span className="flex items-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full"><MapPin className="w-3 h-3 shrink-0" /> {offer.region}</span>)}
          {offer.price !== null && (<span className="ml-auto bg-primary text-slate-900 font-black text-sm px-3 py-1.5 rounded-xl shadow-lg shrink-0">{offer.price} TND</span>)}
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-lg font-extrabold text-slate-900 mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">{offer.title}</h3>
        {offer.description && (<p className="text-slate-500 text-sm mb-3 line-clamp-2 leading-relaxed">{offer.description}</p>)}

        {/* Localisation */}
        {offer.meeting_point && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{offer.meeting_point}</span>
          </div>
        )}

        {/* Disponibilité */}
        {(() => {
          const dispo = (offer.details?.disponibilite ?? null) as Record<string, any> | null;
          if (dispo?.type) {
            const dates: string[] = Array.isArray(dispo.dates) ? dispo.dates : [];
            const rawTs = dispo.time_slots as Record<string, Array<{ start: string; end: string }>> | null | undefined;
            const firstSlot = rawTs && typeof rawTs === "object" && !Array.isArray(rawTs)
              ? (Object.values(rawTs).flat()[0] ?? null) : null;
            const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
            const fmtFull = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
            if (dates.length > 0) return (
              <div className="mb-3 space-y-1">
                {dates.slice(0, 2).map((dt) => (
                  <div key={dt} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium">{fmtDate(dt)}</span>
                    {firstSlot && <span className="text-slate-400">· {firstSlot.start} → {firstSlot.end}</span>}
                  </div>
                ))}
                {dates.length > 2 && <p className="text-[10px] text-slate-400 ml-5">+{dates.length - 2} date{dates.length - 2 > 1 ? "s" : ""}</p>}
              </div>
            );
            if (dispo.start_date) return (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Du {fmtFull(dispo.start_date)}{dispo.end_date ? ` au ${fmtFull(dispo.end_date)}` : ""}</span>
              </div>
            );
            const fallback = dispo.type === "always" ? "Disponible en permanence" : dispo.type === "weekly" ? "Récurrent (hebdomadaire)" : null;
            if (fallback) return (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{fallback}</span>
              </div>
            );
            return null;
          }
          const label = availLabel(offer.availability_mode, offer.availability_start, offer.availability_end, isGuide);
          if (!label) return null;
          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{label}</span>
            </div>
          );
        })()}

        {/* Partie propriétaire */}
        {(() => {
          if (isGuide) {
            const det = offer.details ?? {};
            const domaineKey = (det.domaine_offre ?? null) as string | null;
            const domLabel = domaineLabel(domaineKey);
            const expertisesOffre: string[] = Array.isArray(det.expertises_offre) ? (det.expertises_offre as string[]) : [];
            const chips = expertisesOffre.length > 0
              ? expertisesOffre.map((e) => domLabel ? `${domLabel} · ${e}` : e)
              : domLabel ? [domLabel]
              : offer.offer_type ? [getTypeLabel(offer.offer_type)]
              : [];
            if (chips.length === 0) return null;
            return (
              <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1.5">Section guide</p>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((chip) => (
                    <span key={chip} className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary">{chip}</span>
                  ))}
                </div>
              </div>
            );
          }
          if (!offer.offer_type && !(offer.offer_subtypes?.length)) return null;
          return (
            <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-1.5">Section prestataire</p>
              <div className="flex flex-wrap gap-1.5">
                {offer.offer_type && (offer.offer_subtypes ?? []).length === 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary">{getTypeLabel(offer.offer_type)}</span>
                )}
                {offer.offer_type && (offer.offer_subtypes ?? []).map((sv) => (
                  <span key={sv} className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary">
                    {getTypeLabel(offer.offer_type)} · {subtypeLabel(sv)}
                  </span>
                ))}
                {!offer.offer_type && (offer.offer_subtypes ?? []).map((sv) => (
                  <span key={sv} className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-200 text-slate-600">{subtypeLabel(sv)}</span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Collaborateurs */}
        {offer.collaborators && offer.collaborators.length > 0 && (
          <div className="mb-3 space-y-2.5">
            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">Collaborateurs</p>
            {offer.collaborators.map((c, i) => {
              const det = offer.details ?? {};
              const { guide: gChips, provider: pChips } = collabChips(c, det);
              return (
                <div key={i} className="flex items-start gap-2">
                  {c.photo
                    ? <img src={c.photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-100" />
                    : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-[11px] shrink-0">{c.name[0]?.toUpperCase()}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-slate-700">{c.name}</p>
                      {c.section && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                          {sectionLabel(c.section)}
                        </span>
                      )}
                    </div>
                    {(gChips.length > 0 || pChips.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {gChips.map((chip) => (
                          <span key={chip} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">{chip}</span>
                        ))}
                        {pChips.map((chip) => (
                          <span key={chip} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">{chip}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SustainabilityBadge score={offer.sustainability_score} kind="offer" className="mt-3" />

        {/* Auteur */}
        {(offer.author_name || offer.org_name) && (
          <div className="flex items-center gap-2 mt-3 mb-2">
            {(() => {
              const displayPhoto = isGuide ? offer.author_photo : (offer.org_logo ?? offer.author_photo);
              const displayName  = isGuide ? offer.author_name  : (offer.org_name  ?? offer.author_name);
              const initials     = displayName ? displayName[0].toUpperCase() : "?";
              return (
                <>
                  {displayPhoto
                    ? <img src={displayPhoto} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-100" />
                    : <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[10px] shrink-0 ${isGuide ? "bg-emerald-500" : "bg-blue-500"}`}>{initials}</div>
                  }
                  <span className="text-xs font-bold text-slate-700 truncate">{displayName}</span>
                  {!isGuide && offer.author_name && offer.org_name && (
                    <span className="text-xs text-slate-400 truncate">· {offer.author_name}</span>
                  )}
                </>
              );
            })()}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          {offer.price !== null ? (
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">À partir de</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{offer.price} <span className="text-sm font-bold text-slate-500">TND</span></span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-400 italic">Prix sur demande</span>
          )}
          <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="h-10 px-5 rounded-xl bg-primary text-slate-900 font-bold hover:bg-primary/90 transition-all text-sm">Voir l'offre</button>
        </div>
      </div>
    </div>
  );
}

// ─── CircuitCard (dupliqué depuis destinations/page.tsx) ──────────────────────

function CircuitCard({ circuit, onClick }: { circuit: CircuitFeed; onClick: () => void }) {
  const image = circuit.cover_image ?? OFFER_PLACEHOLDERS[seedFromId(circuit.id, OFFER_PLACEHOLDERS.length)];
  const nbEtapes = circuit.etapes?.length ?? 0;
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={onClick}>
      <div className="relative h-60 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url('${image}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-extrabold text-slate-700 uppercase tracking-widest shadow-sm">Circuit</span>
          <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">{circuit.owner_type === "guide" ? "Guide" : "Prestataire"}</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="flex items-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full"><Clock className="w-3 h-3 shrink-0" /> {circuit.nb_jours} jour{circuit.nb_jours > 1 ? "s" : ""}</span>
          {nbEtapes > 0 && (<span className="flex items-center gap-1 text-white text-xs font-semibold bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full"><MapPin className="w-3 h-3 shrink-0" /> {nbEtapes} étape{nbEtapes > 1 ? "s" : ""}</span>)}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <SustainabilityBadge score={circuit.sustainability_score} kind="circuit" className="mb-3 self-start" />
        <h3 className="font-extrabold text-slate-900 text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">{circuit.title}</h3>
        {circuit.description && (<p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-3">{circuit.description}</p>)}
        {(circuit.author_name || circuit.org_name) && (() => {
          const isGuideOwner = circuit.owner_type === "guide";
          const displayPhoto = isGuideOwner ? circuit.author_photo : (circuit.org_logo ?? circuit.author_photo);
          const displayName  = isGuideOwner ? circuit.author_name  : (circuit.org_name  ?? circuit.author_name);
          const initials     = displayName ? displayName[0].toUpperCase() : "?";
          return (
            <div className="flex items-center gap-2 mb-3">
              {displayPhoto
                ? <img src={displayPhoto} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-100 shrink-0" />
                : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[9px] shrink-0 ${isGuideOwner ? "bg-emerald-500" : "bg-blue-500"}`}>{initials}</div>
              }
              <span className="text-xs font-bold text-slate-700 truncate">{displayName}</span>
              {!isGuideOwner && circuit.author_name && circuit.org_name && (
                <span className="text-xs text-slate-400 truncate">· {circuit.author_name}</span>
              )}
            </div>
          );
        })()}
        {nbEtapes > 0 && (
          <div className="mb-3 space-y-1.5">
            {(circuit.etapes ?? []).slice(0, 3).map((etape: any, i: number) => {
              const displayName = etape.titre || etape.destination || etape.categorie || "Étape";
              const eCat = PROVIDER_SCHEMA.find((c) => c.value === etape.categorie);
              const stLabels = ((etape.subtypes as string[]) ?? []).slice(0, 2).map((sv: string) => (eCat as any)?.subtypes?.find((s: any) => s.value === sv)?.label ?? sv);
              const secondaryLabel = stLabels.length > 0 ? stLabels.join(", ") : (etape.categorie ?? "");
              return (
                <div key={etape.id ?? i} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-[10px] shrink-0">{etape.jour ?? i + 1}</span>
                  <span className="font-semibold text-slate-700 truncate">{displayName}</span>
                  {secondaryLabel && (<><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 truncate text-[11px]">{secondaryLabel}</span></>)}
                  {etape.heure_debut && (<><span className="text-slate-300 shrink-0">·</span><span className="text-slate-400 text-[10px] shrink-0">{etape.heure_debut}{etape.heure_fin ? ` → ${etape.heure_fin}` : ""}</span></>)}
                </div>
              );
            })}
            {nbEtapes > 3 && <p className="text-[10px] text-slate-400 font-semibold">+{nbEtapes - 3} étape{nbEtapes - 3 > 1 ? "s" : ""}…</p>}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /><span className="text-xs font-semibold text-slate-400">{circuit.nb_jours}J / {nbEtapes} étape{nbEtapes > 1 ? "s" : ""}</span></div>
          <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="h-10 px-5 rounded-xl bg-primary text-slate-900 font-bold hover:bg-primary/90 transition-all text-sm">Voir le circuit</button>
        </div>
      </div>
    </div>
  );
}

// ─── RecoCard ─────────────────────────────────────────────────────────────────

function RecoCard({ item, onOpen }: { item: RecommendedItem; onOpen: () => void }) {
  const isOffer = item.type === "offer";
  const data = item.data as any;
  const image = isOffer
    ? (data.images?.[0] ?? OFFER_PLACEHOLDERS[seedFromId(item.id, OFFER_PLACEHOLDERS.length)])
    : (data.cover_image ?? OFFER_PLACEHOLDERS[seedFromId(item.id, OFFER_PLACEHOLDERS.length)]);
  const authorName = data.org_name ?? data.author_name ?? null;
  const authorPhoto = data.org_logo ?? data.author_photo ?? null;

  return (
    <div
      className="w-56 shrink-0 flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
      onClick={onOpen}
    >
      <div className="relative h-36 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url('${image}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-extrabold text-slate-700 uppercase tracking-wider shadow-sm">
            {isOffer ? "Offre" : "Circuit"}
          </span>
        </div>
        <div className="absolute bottom-2 left-2">
          {item.matchScore > 0 ? (
            <span className="flex items-center gap-1 bg-primary text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm">
              <Sparkles className="w-2.5 h-2.5" />
              {item.matchScore} tag{item.matchScore > 1 ? "s" : ""} en commun
            </span>
          ) : (item.likesCount ?? 0) > 0 ? (
            <span className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm">
              ❤️ {item.likesCount} j&apos;aime
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="font-extrabold text-slate-900 text-sm line-clamp-2 group-hover:text-primary transition-colors mb-2">{data.title}</h4>
        <SustainabilityBadge score={data.sustainability_score} kind={isOffer ? "offer" : "circuit"} className="mb-2 self-start" />
        {authorName && (
          <div className="flex items-center gap-1.5 mb-2">
            {authorPhoto
              ? <img src={authorPhoto} alt="" className="w-5 h-5 rounded-full object-cover border border-slate-100 shrink-0" />
              : <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-[8px] shrink-0">{authorName[0]?.toUpperCase()}</div>
            }
            <span className="text-[11px] font-semibold text-slate-500 truncate">{authorName}</span>
          </div>
        )}
        <button
          className="mt-auto w-full py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
        >
          Voir
        </button>
      </div>
    </div>
  );
}

// ─── PublicationCard ──────────────────────────────────────────────────────────

function PublicationCard({
  pub,
  token,
  viewerId,
  origin,
  onViewDetail,
}: {
  pub: PublicationFeed;
  token: string;
  viewerId: string;
  origin: string;
  onViewDetail: () => void;
}) {
  const [topPhoto,    setTopPhoto]    = useState<TopPhotoData | null>(null);
  const [topDesc,     setTopDesc]     = useState<TopDescData  | null>(null);
  const [contribCount, setContribCount] = useState<number | undefined>(undefined);

  const isExp    = pub.type === "experience";
  const cover    = pub.images?.[0] ?? null;
  const authorId = pub.author?.user_id ?? pub.author_id;
  const shareUrl = `${origin}/profile/ecovoyageur/${authorId}?pub=${pub.id}`;

  const authorInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="bg-white rounded-3xl border border-slate-100/80 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex flex-col lg:flex-row overflow-hidden rounded-3xl">

        {/* ── Photo area ── */}
        <div className="lg:w-2/5 relative min-h-[200px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
          {cover ? (
            <img src={cover} alt={pub.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className={`absolute inset-0 opacity-80 ${isExp ? "bg-gradient-to-br from-teal-500 to-emerald-400" : "bg-gradient-to-br from-blue-500 to-cyan-400"}`} />
          )}
          {/* Type badge */}
          <div className="absolute top-3 left-3 z-10 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border bg-white/90 text-slate-700 border-white/40">
            {isExp ? "Expérience" : "Lieu"}
          </div>
          {/* Officiel badge (lieux avec photo officielle) */}
          {!isExp && cover && (
            <span className="absolute bottom-3 left-3 z-10 text-[9px] font-black uppercase tracking-wide bg-white/90 text-slate-700 px-2 py-0.5 rounded-full shadow-sm border border-white/40">
              Officiel
            </span>
          )}
          {/* Community avatar indicator */}
          {!isExp && topPhoto && (() => {
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
                    {descAuthor!.photo
                      ? <img src={descAuthor!.photo} alt="" className="w-full h-full object-cover" />
                      : <span className="text-[7px] font-black text-emerald-700">{authorInitials(descAuthor!.full_name)}</span>}
                  </div>
                )}
                <span className="text-[9px] font-bold text-white ml-0.5">+photo</span>
              </div>
            );
          })()}
        </div>

        {/* ── Contenu ── */}
        <div className="lg:w-3/5 p-6 flex flex-col justify-between">
          <div>
            {/* Auteur */}
            {pub.author && (
              <div className="flex items-center gap-2 mb-3">
                {pub.author.photo ? (
                  <img src={pub.author.photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0">
                    {(pub.author.full_name?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <p className="text-xs font-bold text-slate-600">{pub.author.full_name}</p>
                <span className="text-[10px] text-slate-400">· {timeAgo(pub.created_at)}</span>
              </div>
            )}
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
              <button
                onClick={onViewDetail}
                className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200"
              >
                <span>Voir les détails</span><ArrowRight size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactions */}
      {pub.status === "approved" && (
        <PubInteractions
          pubId={pub.id}
          token={token}
          viewerId={viewerId}
          shareUrl={shareUrl}
          pubTitle={pub.title}
          contributionsCount={contribCount}
          contributionsContent={!isExp ? (
            <PlaceContributions
              publicationId={pub.id}
              publisherId={authorId}
              onCountLoaded={(n) => setContribCount((prev) => (prev === n ? prev : n))}
              onTopPhotoLoaded={(data) => setTopPhoto(data)}
              onTopDescLoaded={(data) => setTopDesc(data)}
            />
          ) : undefined}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const router   = useRouter();
  const notifRef = useRef<HTMLDivElement>(null);

  const [role, setRole]         = useState<string | null>(null);
  const [token, setToken]       = useState<string | null>(null);
  const [profile, setProfile]   = useState<BasicProfile | null>(null);
  const [feed, setFeed]         = useState<FeedItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [notifications, setNotifications]   = useState<DashNotif[]>([]);
  const [notifOpen, setNotifOpen]           = useState(false);
  const [notifVisible, setNotifVisible]     = useState(5);
  const [notifMenuOpen, setNotifMenuOpen]   = useState<string | null>(null);

  const [detailItem, setDetailItem]   = useState<FeedItem | null>(null);
  const [detailData, setDetailData]   = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedPub, setSelectedPub] = useState<PublicationFeed | null>(null);
  const [pubSliderIdx, setPubSliderIdx] = useState(0);
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [recoMode, setRecoMode] = useState<"tagged" | "recent">("recent");
  const [recoLoading, setRecoLoading] = useState(false);

  /* ── Close notif dropdown on outside click ── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false); setNotifVisible(5);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [orgLogo, setOrgLogo] = useState<string | null>(null);

  /* ── Auth + profile + notifications ── */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const tkn = localStorage.getItem("access_token");
    if (!storedUser || !tkn) { router.push("/auth/login"); return; }
    try {
      const parsed = JSON.parse(storedUser) as { role: string };
      setRole(parsed.role);
      setToken(tkn);

      const profileEndpoint =
        parsed.role === "guide"         ? "/guide/profile"
        : parsed.role === "eco_traveler" ? "/eco-traveler/profile"
        : "/providers/me";

      apiFetch<BasicProfile>(profileEndpoint, { headers: { Authorization: `Bearer ${tkn}` } })
        .then(setProfile).catch(() => {});

      if (parsed.role !== "guide" && parsed.role !== "eco_traveler") {
        apiFetch<{ logo?: string | null }>("/organizations/me", { headers: { Authorization: `Bearer ${tkn}` } })
          .then((org) => setOrgLogo(org?.logo ?? null)).catch(() => {});
      }

      apiFetch<DashNotif[]>("/notifications", { headers: { Authorization: `Bearer ${tkn}` } })
        .then(setNotifications).catch(() => {});
    } catch { router.push("/auth/login"); }
  }, [router]);

  /* ── Feed ── */
  useEffect(() => {
    if (!role || !token) return;
    const endpoint = role === "eco_traveler" ? "/publications/feed" : "/publications/feed/pro";
    apiFetch<{ items: FeedItem[] }>(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ items }) => setFeed(items))
      .catch((err) => setError(err.message ?? "Erreur lors du chargement du fil"))
      .finally(() => setLoading(false));
  }, [role, token]);

  /* ── Recommendations (tous les rôles) ── */
  useEffect(() => {
    if (!role || !token) return;
    if (role === "project" || role === "admin") return;
    setRecoLoading(true);
    apiFetch<RecoResponse>("/publications/recommendations", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ items, mode }) => { setRecommendations(items); setRecoMode(mode); })
      .catch(() => {})
      .finally(() => setRecoLoading(false));
  }, [role, token]);

  /* ── Detail modal ── */
  async function openDetail(item: FeedItem) {
    setDetailItem(item);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const tkn = token ?? "";
      if (item.type === "offer") {
        const data = await apiFetch<any>(`/guide/offers/${item.id}/public-detail`, { headers: { Authorization: `Bearer ${tkn}` } });
        setDetailData(data);
      } else if (item.type === "circuit") {
        const data = await apiFetch<any>(`/circuits/${item.id}/public-detail`, { headers: { Authorization: `Bearer ${tkn}` } });
        setDetailData(data);
      }
    } catch { /* garde le modal ouvert, affiche un spinner */ }
    finally { setDetailLoading(false); }
  }

  /* ── Logout ── */
  async function handleLogout() {
    try { if (token) await logoutUser(token); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  }

  /* ── Notif helpers ── */
  async function markNotifRead(id: string) {
    const tkn = token || "";
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }
  async function markAllNotifRead() {
    const tkn = token || "";
    await apiFetch("/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
  }
  async function markNotifUnread(id: string) {
    const tkn = token || "";
    await apiFetch(`/notifications/${id}/unread`, { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((p) => p.map((n) => n.id === id ? { ...n, is_read: false } : n));
  }
  async function deleteNotif(id: string) {
    const tkn = token || "";
    await apiFetch(`/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((p) => p.filter((n) => n.id !== id));
    setNotifMenuOpen(null);
  }

  /* ── Nav items by role ── */
  const navItems =
    role === "guide" ? [
      { label: "Tableau de bord", icon: "dashboard",      href: "/dashboard/guide" },
      { label: "Explorer",        icon: "explore",         href: "/explorer" },
      { label: "Offres",          icon: "storefront",      href: "/dashboard/guide?section=Offres" },
      { label: "Circuits",        icon: "route",           href: "/dashboard/guide?section=Circuits" },
      { label: "Réservations",    icon: "event_available", href: "/dashboard/guide/reservations" },
      { label: "Avis",            icon: "star",            href: "/profile/guide?tab=apropos" },
      { label: "Paramètres",      icon: "settings",        href: "/dashboard/profile" },
      { label: "Messagerie",      icon: "forum",           href: "/messagerie" },
    ] : role === "eco_traveler" ? [
      { label: "Tableau de bord", icon: "dashboard",      href: "/dashboard" },
      { label: "Explorer",        icon: "explore",         href: "/explorer" },
      { label: "Expériences",     icon: "auto_stories",   href: "/profile/ecovoyageur?tab=experiences" },
      { label: "Lieux",           icon: "location_on",    href: "/profile/ecovoyageur?tab=lieux" },
      { label: "Séjour",          icon: "hotel",           href: "/offers" },
      { label: "Paramètres",      icon: "settings",        href: "/dashboard/profile" },
      { label: "Messagerie",      icon: "forum",           href: "/messagerie" },
    ] : [
      { label: "Tableau de bord", icon: "dashboard",      href: "/dashboard/provider" },
      { label: "Explorer",        icon: "explore",         href: "/explorer" },
      { label: "Offres",          icon: "storefront",      href: "/dashboard/provider?section=Offres" },
      { label: "Circuits",        icon: "route",           href: "/dashboard/provider?section=Circuits" },
      { label: "Réservations",    icon: "event_available", href: "/dashboard/provider/reservations" },
      { label: "Avis",            icon: "star",            href: "/profile/provider?tab=apropos" },
      { label: "Paramètres",      icon: "settings",        href: "/dashboard/profile" },
      { label: "Messagerie",      icon: "forum",           href: "/messagerie" },
    ];

  const profileHref =
    role === "guide"         ? "/profile/guide"
    : role === "eco_traveler" ? "/profile/ecovoyageur"
    : "/profile/provider";

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const emptyTitle = role === "eco_traveler" ? "Votre fil est vide pour l'instant" : "Votre fil professionnel est vide";
  const emptyDesc  = role === "eco_traveler"
    ? "Suivez des guides et prestataires pour voir leurs offres et circuits ici, et ajoutez des amis pour voir leurs publications."
    : "Suivez des confrères pour voir leurs offres et circuits apparaître ici.";

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="flex min-h-screen">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-primary/10 flex flex-col fixed h-full">
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-10">
              <Leaf className="text-primary w-8 h-8" />
              <h1 className="text-xl font-extrabold tracking-tight">Éco-Voyage</h1>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    item.href === "/explorer"
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined">logout</span>
                <span>Déconnexion</span>
              </button>
            </nav>

            {profile && (
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profil complété</p>
                  <p className="text-xs font-extrabold text-primary">{profile.profile_completion}%</p>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${profile.profile_completion}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={() => router.push(role === "guide" ? "/questionnaire/guide" : role === "eco_traveler" ? "/questionnaire/eco-traveler" : "/questionnaire/provider")}
              className="mt-4 w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">quiz</span>
              {profile?.sustainability_score === null ? "Passer l'évaluation" : "Voir mon score"}
            </button>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="flex-1 ml-72">

          {/* ── Header ── */}
          <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-primary/10 px-10 flex items-center justify-between sticky top-0 z-10">
            {/* Search — left */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Rechercher une offre, un circuit…"
                  onKeyDown={(e) => e.key === "Enter" && router.push("/destinations")}
                />
                <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl">search</span>
              </div>
            </div>

            {/* Right — notifications + avatar */}
            <div className="flex items-center gap-6 shrink-0 ml-6">
              {/* Notifications */}
              <div ref={notifRef} className="relative shrink-0">
                <button
                  onClick={() => { setNotifOpen((o) => !o); setNotifMenuOpen(null); }}
                  className="size-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary transition-colors relative"
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl">
                      <span className="font-semibold text-sm">Notifications</span>
                      {notifications.some((n) => !n.is_read) && (
                        <button onClick={markAllNotifRead} className="text-xs text-primary hover:underline">Tout marquer lu</button>
                      )}
                    </div>
                    <div className="max-h-[26rem] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                          <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">notifications_none</span>
                          Aucune notification
                        </div>
                      ) : (
                        notifications.slice(0, notifVisible).map((n, nIdx) => {
                          const { title, body, icon } = notifLabel(n);
                          const isUnread = !n.is_read;
                          const menuOpen = notifMenuOpen === `bell-${n.id}`;
                          const openUp = nIdx >= Math.min(notifVisible, notifications.length) - 2;
                          return (
                            <div key={n.id} className={`relative flex gap-3 items-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isUnread ? "bg-primary/5" : ""}`}>
                              <div className="flex-1 min-w-0 flex gap-3 items-start" onClick={() => { if (!n.is_read) markNotifRead(n.id); setNotifOpen(false); }}>
                                <span className={`mt-0.5 material-symbols-outlined text-lg shrink-0 ${isUnread ? "text-primary" : "text-slate-400"}`}>{icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold truncate ${isUnread ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>{title}</p>
                                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{body}</p>
                                  <p className="text-[10px] text-slate-300 mt-1">
                                    {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                              <div className="relative shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNotifMenuOpen(menuOpen ? null : `bell-${n.id}`); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">more_vert</span>
                                </button>
                                {menuOpen && (
                                  <div className={`absolute right-0 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-[60] overflow-hidden ${openUp ? "bottom-7" : "top-7"}`}>
                                    {n.is_read ? (
                                      <button onClick={(e) => { e.stopPropagation(); markNotifUnread(n.id); setNotifMenuOpen(null); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-400">mark_email_unread</span>Marquer comme non lu
                                      </button>
                                    ) : (
                                      <button onClick={(e) => { e.stopPropagation(); markNotifRead(n.id); setNotifMenuOpen(null); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-400">mark_email_read</span>Marquer comme lu
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-base">delete</span>Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                              {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {notifVisible < notifications.length && (
                      <div className="border-t border-slate-100 dark:border-slate-800 overflow-hidden">
                        <button onClick={() => setNotifVisible((v) => v + 5)} className="w-full py-3 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors">
                          Voir plus ({notifications.length - notifVisible} restantes)
                        </button>
                      </div>
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-800 rounded-b-2xl overflow-hidden">
                      <button
                        onClick={() => { setNotifOpen(false); router.push("/notifications"); }}
                        className="w-full py-3 text-xs text-slate-500 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Voir toutes les notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />

              {/* Profile avatar */}
              <button
                onClick={() => router.push(profileHref)}
                className="size-11 rounded-full bg-slate-200 border-2 border-primary overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
              >
                {(orgLogo ?? profile?.photo) ? (
                  <img src={(orgLogo ?? profile?.photo)!} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                  </div>
                )}
              </button>
            </div>{/* end right */}
          </header>

          {/* ── Feed content ── */}
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Explorer</h2>
              <p className="text-sm text-slate-500 mt-1">
                {role === "eco_traveler"
                  ? "Publications, offres et circuits de vos amis et des profils que vous suivez"
                  : "Offres et circuits des profils que vous suivez"}
              </p>
            </div>

            {/* ── Pour vous / À découvrir (recommendations) ── */}
            {(recoLoading || recommendations.length > 0) && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide uppercase">
                    {recoMode === "tagged" ? "Pour vous" : "À découvrir"}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {recoMode === "tagged" ? "· basé sur vos intérêts" : "· offres et circuits récents"}
                  </span>
                </div>
                {recoLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs text-slate-400">Chargement des recommandations…</span>
                  </div>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                    {recommendations.map((reco) => (
                      <RecoCard
                        key={reco.id}
                        item={reco}
                        onOpen={() => openDetail(reco as unknown as FeedItem)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-slate-400 font-semibold">Chargement du fil…</p>
              </div>
            )}

            {!loading && error && (
              <div className="bg-red-50 border border-red-100 rounded-3xl p-8 text-center">
                <p className="text-red-600 font-bold mb-1">Erreur</p>
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && feed.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100/80 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">{emptyTitle}</h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">{emptyDesc}</p>
                <button
                  onClick={() => router.push("/destinations")}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-slate-900 font-bold text-sm hover:bg-primary/90 transition-all"
                >
                  Parcourir les destinations
                </button>
              </div>
            )}

            {!loading && !error && feed.length > 0 && (
              <div className="flex flex-col gap-5">
                {feed.map((item) => {
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const viewerId = profile?.user_id ?? "";
                  const tkn = token ?? "";

                  if (item.type === "publication") {
                    return (
                      <PublicationCard
                        key={item.id}
                        pub={item.data}
                        token={tkn}
                        viewerId={viewerId}
                        origin={origin}
                        onViewDetail={() => { setSelectedPub(item.data); setPubSliderIdx(0); }}
                      />
                    );
                  }

                  if (item.type === "offer") {
                    const authorType = item.data.author_type;
                    const shareUrl =
                      authorType === "guide"
                        ? `${origin}/profile/guide/${item.data.author_name ?? ""}`
                        : `${origin}/profile/provider/${item.data.org_name ?? ""}`;
                    return (
                      <div key={item.id} className="flex flex-col gap-2">
                        <OfferCard offer={item.data} onClick={() => openDetail(item)} />
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <PubInteractions
                            pubId={item.id}
                            token={tkn}
                            viewerId={viewerId}
                            itemApiBase="/interactions/offer"
                            commentApiBase="/interactions"
                            shareUrl={shareUrl}
                            pubTitle={item.data.title}
                          />
                        </div>
                      </div>
                    );
                  }

                  if (item.type === "circuit") {
                    const ownerType = item.data.owner_type;
                    const shareUrl =
                      ownerType === "guide"
                        ? `${origin}/profile/guide/${item.data.author_name ?? ""}`
                        : `${origin}/profile/provider/${item.data.author_name ?? ""}`;
                    return (
                      <div key={item.id} className="flex flex-col gap-2">
                        <CircuitCard circuit={item.data} onClick={() => openDetail(item)} />
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <PubInteractions
                            pubId={item.id}
                            token={tkn}
                            viewerId={viewerId}
                            itemApiBase="/interactions/circuit"
                            commentApiBase="/interactions"
                            shareUrl={shareUrl}
                            pubTitle={item.data.title}
                          />
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Publication detail modal ── */}
      {selectedPub && (() => {
        const imgs = selectedPub.images ?? [];
        const safeIdx = imgs.length > 0 ? Math.min(pubSliderIdx, imgs.length - 1) : 0;
        const isExp = selectedPub.type === "experience";
        const authorId = selectedPub.author?.user_id ?? selectedPub.author_id;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedPub(null)}>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedPub(null)} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X size={16} className="text-slate-600" />
              </button>

              {/* Image slider */}
              <div className="relative h-60 bg-slate-100 rounded-t-3xl overflow-hidden flex items-center justify-center">
                {imgs.length > 0 ? (
                  <img src={imgs[safeIdx]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className={`absolute inset-0 ${isExp ? "bg-gradient-to-br from-teal-500 to-emerald-400" : "bg-gradient-to-br from-blue-500 to-cyan-400"}`} />
                )}
                {imgs.length > 1 && (
                  <>
                    <button onClick={() => setPubSliderIdx((i) => (i - 1 + imgs.length) % imgs.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 z-10">
                      <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setPubSliderIdx((i) => (i + 1) % imgs.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 z-10">
                      <ChevronRight size={18} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {imgs.map((_, i) => (
                        <button key={i} onClick={() => setPubSliderIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === safeIdx ? "bg-white scale-125" : "bg-white/50"}`} />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute top-3 left-3 z-10 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border bg-white/90 text-slate-700 border-white/40">
                  {isExp ? "Expérience" : "Lieu"}
                </div>
              </div>

              {/* Contenu */}
              <div className="p-6">
                <h2 className="text-xl font-extrabold text-slate-800 leading-snug mb-1">{selectedPub.title}</h2>
                {(selectedPub.place_name || selectedPub.region) && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-sm font-semibold mb-3">
                    <MapPin size={13} className="text-primary shrink-0" />
                    {[selectedPub.place_name, selectedPub.region].filter(Boolean).join(" — ")}
                  </div>
                )}
                {selectedPub.description && (
                  <p className="text-slate-600 text-sm leading-relaxed mb-4 whitespace-pre-line">{selectedPub.description}</p>
                )}

                {/* Auteur + date */}
                {selectedPub.author && (
                  <div className="flex items-center gap-3 py-3 border-t border-slate-100 mb-4">
                    {selectedPub.author.photo ? (
                      <img src={selectedPub.author.photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0">
                        {(selectedPub.author.full_name?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-700">{selectedPub.author.full_name}</p>
                      <p className="text-[11px] text-slate-400">
                        Publié le {new Date(selectedPub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    {selectedPub.status === "approved" && (
                      <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publié</span>
                    )}
                  </div>
                )}

                {/* Contributions communautaires pour les lieux */}
                {!isExp && (
                  <PlaceContributions
                    publicationId={selectedPub.id}
                    publisherId={authorId}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Detail modal ── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDetailItem(null)}>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setDetailItem(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-slate-600 dark:text-slate-300" />
            </button>

            {detailLoading && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {!detailLoading && detailData && detailItem.type === "offer" && (
              <div className="p-6">
                <OfferDetailView offer={detailData} />
              </div>
            )}

            {!detailLoading && detailData && detailItem.type === "circuit" && (
              <CircuitDetailView circuit={detailData} token={token ?? undefined} />
            )}

            {!detailLoading && !detailData && (
              <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
                Impossible de charger les détails.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
