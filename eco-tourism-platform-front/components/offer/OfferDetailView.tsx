"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Globe, X } from "lucide-react";
import { formatSubtypeLabel, formatOfferCapacityLabel } from "@/lib/offer-variant";
import { OFFER_DETAIL_FIELDS } from "@/lib/offer-schema";
import { DOMAINES } from "@/lib/guideOfferConfig";
import { TRANSPORT_ECO_SUBTYPES, TRANSPORT_STD_SUBTYPES } from "@/components/GuideOfferModal";

const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

export type OfferFull = {
  id: string;
  title: string;
  description: string | null;
  offer_type: string | null;
  duration: string | null;
  region: string | null;
  price: number | null;
  images: string[] | null;
  cover_image?: string | null;
  meeting_point: string | null;
  meeting_lat?: number | null;
  meeting_lng?: number | null;
  max_group_size?: number | null;
  min_group_size?: number | null;
  capacity?: number | null;
  min_age?: number | null;
  offer_mode?: string | null;
  offer_subtypes?: string[] | null;
  variant_pricing?: Record<string, number> | null;
  price_display_from?: number | null;
  cancellation_policy?: string | null;
  inclusions?: string | null;
  details: Record<string, unknown> | null;
};

// ── Lookup tables ─────────────────────────────────────────────────────────────
const LANG_LABELS: Record<string, string> = {
  fr: "Français", ar: "Arabe", en: "Anglais", es: "Espagnol", de: "Allemand", it: "Italien",
};
const GUIDAGE: Record<string, string> = {
  guidage_seul: "Guidage seul", avec_transport: "+ Transport",
  transport_repas: "+ Transport & Repas", immersion: "Immersion complète", sur_mesure: "Sur mesure",
};
const PREST: Record<string, string> = {
  visite_guidee: "Visite guidée", randonnee: "Randonnée", excursion: "Excursion",
  atelier: "Atelier", transfert: "Transfert", sur_mesure: "Sur mesure",
};
const CONF: Record<string, string> = { instant: "Instantanée", manual: "Manuelle", conditional: "Sous conditions" };
const ANNUL: Record<string, string> = {
  flexible: "Flexible", moderate: "Modérée", stricte: "Stricte", non_remboursable: "Non remboursable",
};
const PUBLIC_ICONS: Record<string, string> = {
  familles: "family_restroom", adultes: "person", seniors: "elderly", enfants: "child_care",
  groupes: "groups", photographes: "photo_camera", tous_publics: "diversity_3",
};
const PUBLIC_LABELS: Record<string, string> = {
  familles: "Familles", adultes: "Adultes", seniors: "Seniors", enfants: "Enfants",
  groupes: "Groupes", photographes: "Photographes", tous_publics: "Tous publics",
};
const DISPO_LABELS: Record<string, { label: string; icon: string }> = {
  specific:  { label: "Date unique / Dates spécifiques", icon: "calendar_today" },
  range:     { label: "Période continue",                icon: "date_range" },
  recurring: { label: "Récurrent",                      icon: "event_repeat" },
  season:    { label: "Saison",                         icon: "wb_sunny" },
};
const DIFF: Record<string, string> = {
  facile: "Facile ✦", moderee: "Modérée ✦✦", difficile: "Difficile ✦✦✦", tres_difficile: "Très difficile ✦✦✦✦",
};
const FR_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// ── Sub-components ─────────────────────────────────────────────────────────────
function SH({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
      </div>
      <h3 className="text-sm font-extrabold text-slate-700 tracking-wide">{title}</h3>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function MeetingMapInline({ lat, lng, address }: { lat?: number | null; lng?: number | null; address: string }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
  );
  const [geocoding, setGeocoding] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (coords || !address) return;
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

  if (geocoding) return <div className="h-[180px] rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400 font-semibold">Chargement de la carte…</div>;
  if (failed || !coords) return null;
  return <MapView lat={coords.lat} lng={coords.lng} />;
}

// ── Photo lightbox ─────────────────────────────────────────────────────────────
function PhotoLightbox({ photos, startIdx, onClose }: { photos: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  setIdx((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % photos.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) setIdx((i) => dx < 0 ? (i + 1) % photos.length : (i - 1 + photos.length) % photos.length);
        touchStartX.current = null;
      }}
    >
      {/* Fermer */}
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
        <X size={20} className="text-white" />
      </button>

      {/* Image principale */}
      <div className="relative max-w-4xl w-full max-h-[80vh] flex items-center justify-center px-14" onClick={(e) => e.stopPropagation()}>
        <img
          src={photos[idx]}
          alt=""
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl select-none"
          draggable={false}
        />
      </div>

      {/* Prev / Next */}
      {photos.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i - 1 + photos.length) % photos.length); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
            <ChevronLeft size={22} className="text-white" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIdx((i) => (i + 1) % photos.length); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors">
            <ChevronRight size={22} className="text-white" />
          </button>
        </>
      )}

      {/* Dots */}
      {photos.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {photos.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"}`} />
          ))}
        </div>
      )}

      {/* Compteur */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-bold">
        {idx + 1} / {photos.length}
      </div>
    </div>
  );
}

// ── Service photos grid ─────────────────────────────────────────────────────────
function ServicePhotosGrid({ photos, accentCls }: { photos: string[]; accentCls: string }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (photos.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <button key={i} type="button" onClick={() => setLightboxIdx(i)}
            className={`relative aspect-[4/3] rounded-xl overflow-hidden border ${accentCls} group cursor-pointer`}>
            <img src={p} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-xl drop-shadow-lg">zoom_in</span>
            </span>
          </button>
        ))}
      </div>
      {lightboxIdx !== null && (
        <PhotoLightbox photos={photos} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OfferDetailView({ offer }: { offer: OfferFull }) {
  const [sliderIdx, setSliderIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const d = (offer.details ?? {}) as Record<string, any>;
  const imgs = offer.images?.filter((s) => s?.startsWith("http") || s?.startsWith("data:")) ?? [];
  const sliderImgs = imgs.length ? imgs : offer.cover_image ? [offer.cover_image] : [];
  const safeIdx = Math.min(sliderIdx, Math.max(sliderImgs.length - 1, 0));

  const langs: string[] = Array.isArray(d.langue_guidage) ? d.langue_guidage : [];
  const inclus: string[] = Array.isArray(d.inclus_resume) ? d.inclus_resume
    : (offer.inclusions ? offer.inclusions.split("||").filter(Boolean) : []);
  const expertises: string[] = Array.isArray(d.expertises_offre) ? d.expertises_offre : [];
  const publicRec: string[] = Array.isArray(d.public_recommande) ? d.public_recommande : [];
  const pointsForts: string[] = Array.isArray(d.points_forts) ? d.points_forts : [];
  const lieux: string[] = Array.isArray(d.lieux_visites) ? d.lieux_visites : [];
  const domaineKey = (d.domaine_offre as string | undefined);
  const cascadeCfg = domaineKey ? (DOMAIN_CASCADE_CONFIG[domaineKey] ?? null) : null;
  const cascade = d.domaine_details as { types_visite?: string[]; experiences?: string[]; mediation?: string[] } | null | undefined;
  const selTypes: string[] = cascade?.types_visite ?? [];
  const selExp: string[] = cascade?.experiences ?? [];
  const selMed: string[] = cascade?.mediation ?? [];
  const domDetails = d.domaine_details as Record<string, any> | null | undefined;

  const CL_STYLES = {
    expertises:  { border: "border-secondary/70", text: "text-secondary", icon: "eco" },
    types:       { border: "border-secondary/70", text: "text-secondary", icon: "landscape" },
    experiences: { border: "border-secondary/70", text: "text-secondary", icon: "explore" },
    supports:    { border: "border-secondary/70", text: "text-secondary", icon: "backpack" },
  } as const;
  function CL({ label, tone }: { label: string; tone: keyof typeof CL_STYLES }) {
    const s = CL_STYLES[tone];
    return (
      <div className={`flex items-center gap-2 border-l-[3px] ${s.border} pl-3 py-1 mb-3`}>
        <span className={`material-symbols-outlined text-[17px] ${s.text}`}>{s.icon}</span>
        <span className={`text-[11px] font-extrabold tracking-wide ${s.text}`}>{label}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

      {/* ── Hero image slider ───────────────────────────────────────────────── */}
      <div className="relative select-none"
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || sliderImgs.length <= 1) return;
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 40) setSliderIdx((i) => diff > 0 ? Math.min(i + 1, sliderImgs.length - 1) : Math.max(i - 1, 0));
          touchStartX.current = null;
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
            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/25" style={{ fontSize: 110 }}>hiking</span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Title + meta */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {d.type_prestation && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-slate-900 px-2 py-0.5 rounded-lg">
                {PREST[d.type_prestation] ?? d.type_prestation}
              </span>
            )}
            {langs.map((l) => (
              <span key={l} className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-lg backdrop-blur-sm">{l}</span>
            ))}
          </div>
          <h2 className="text-xl font-extrabold text-white leading-tight drop-shadow">{offer.title}</h2>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {offer.price != null && <span className="text-sm font-black text-primary drop-shadow">{offer.price} DT</span>}
            {offer.region && <span className="flex items-center gap-1 text-[11px] font-bold text-white/90"><span className="material-symbols-outlined text-sm">location_on</span>{offer.region}</span>}
            {d.difficulte_physique && <span className="text-[11px] font-bold text-white/90">{DIFF[d.difficulte_physique] ?? d.difficulte_physique}</span>}
          </div>
        </div>

        {/* Slider arrows */}
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

      {/* ── Body ───────────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-6">

        {/* Photo strip */}
        {imgs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {imgs.map((src, i) => (
              <button key={i} type="button" onClick={() => setSliderIdx(i)}
                className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === safeIdx ? "border-primary" : "border-transparent opacity-60"}`}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* ── Présentation ─────────────────────────────────────────────────── */}
        <section>
          <SH icon="description" title="Présentation de l'offre" />
          <div className="flex flex-wrap gap-2 mb-4">
            {d.type_guidage_offre && (
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-2xl px-4 py-2.5">
                <span className="material-symbols-outlined text-primary text-lg">hiking</span>
                <div>
                  <p className="text-[8px] font-black tracking-widest text-primary/60 uppercase">Type de guidage</p>
                  <p className="text-xs font-extrabold text-primary leading-tight">{GUIDAGE[d.type_guidage_offre] ?? d.type_guidage_offre}</p>
                </div>
              </div>
            )}
            {d.type_prestation && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5">
                <span className="material-symbols-outlined text-slate-500 text-lg">category</span>
                <div>
                  <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Type de prestation</p>
                  <p className="text-xs font-extrabold text-slate-700 leading-tight">{PREST[d.type_prestation] ?? d.type_prestation}</p>
                </div>
              </div>
            )}
          </div>
          {offer.description && <p className="text-sm text-slate-600 leading-relaxed mb-2">{offer.description}</p>}
          {d.description_longue && <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line mb-4">{String(d.description_longue)}</p>}
          {d.difficulte_physique && (
            <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 w-fit">
              <span className="material-symbols-outlined text-primary text-sm">fitness_center</span>
              <span className="text-xs font-bold text-slate-600">Niveau d'expérience : <span className="text-slate-800">{d.difficulte_physique}</span></span>
            </div>
          )}
          {pointsForts.length > 0 && (
            <div className="mb-4">
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400 text-sm">star</span>Points forts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pointsForts.map((pf, i) => (
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
          {publicRec.length > 0 && (
            <div>
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary/60 text-sm">groups</span>Public recommandé
              </p>
              <div className="flex flex-wrap gap-2">
                {publicRec.map((p) => (
                  <div key={p} className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 rounded-2xl px-3 py-2">
                    <span className="material-symbols-outlined text-secondary text-base">{PUBLIC_ICONS[p] ?? "person"}</span>
                    <span className="text-xs font-bold text-secondary">{PUBLIC_LABELS[p] ?? p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Expertises & cascade ─────────────────────────────────────────── */}
        {(expertises.length > 0 || selTypes.length > 0 || selExp.length > 0 || selMed.length > 0) && (
          <section>
            <SH icon="psychology" title="Expertises & Détails" />
            {expertises.length > 0 && (
              <div className="mb-4">
                <CL label="Expertises" tone="expertises" />
                <div className="flex flex-wrap gap-2">
                  {expertises.map((e, i) => (
                    <span key={i} className="flex items-center gap-1.5 bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold px-3 py-2 rounded-2xl">
                      <span className="material-symbols-outlined text-sm">psychology</span>{e}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selTypes.length > 0 && (
              <div className="mb-4">
                <CL label={cascadeCfg?.labelType ?? "Types sélectionnés"} tone="types" />
                <div className="flex flex-wrap gap-1.5">
                  {selTypes.map((t) => <span key={t} className="bg-secondary/10 text-secondary text-xs font-bold px-3 py-1.5 rounded-xl">{t}</span>)}
                </div>
              </div>
            )}
            {selExp.length > 0 && (
              <div className="mb-4">
                <CL label={cascadeCfg?.labelExperiences ?? "Activités & expériences incluses"} tone="experiences" />
                <div className="flex flex-wrap gap-1.5">
                  {selExp.map((e) => <span key={e} className="bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold px-2.5 py-1.5 rounded-xl">{e}</span>)}
                </div>
              </div>
            )}
            {selMed.length > 0 && (
              <div>
                <CL label={cascadeCfg?.labelMediation ?? "Matériel & supports fournis"} tone="supports" />
                <div className="flex flex-wrap gap-1.5">
                  {selMed.map((m) => <span key={m} className="bg-secondary/10 border border-secondary/20 text-secondary text-[11px] font-bold px-2.5 py-1.5 rounded-xl">{m}</span>)}
                </div>
              </div>
            )}
            {!cascadeCfg && domDetails && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-3">
                {Object.entries(domDetails).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length)).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">{k.replace(/_/g, " ")}</p>
                    <p className="text-[11px] font-bold text-slate-700">{Array.isArray(v) ? (v as string[]).join(", ") : String(v)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Localisation ─────────────────────────────────────────────────── */}
        <section>
          <SH icon="map" title="Localisation" />
          {offer.meeting_point && (
            <>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-sm">location_on</span>
                </div>
                <div>
                  <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Point de départ / Rendez-vous</p>
                  <p className="text-sm font-bold text-slate-800 leading-tight">{offer.meeting_point}</p>
                  {d.lieu_precis && d.lieu_precis !== offer.meeting_point && <p className="text-xs text-slate-500 mt-1">{d.lieu_precis}</p>}
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-3">
                <MeetingMapInline lat={offer.meeting_lat} lng={offer.meeting_lng} address={offer.meeting_point} />
              </div>
            </>
          )}
          {d.heure_depart && d.heure_depart !== "00:00" && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 w-fit mb-3">
              <span className="material-symbols-outlined text-primary text-sm">alarm</span>
              <div>
                <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Heure de départ</p>
                <p className="text-xs font-bold text-slate-700">{d.heure_depart}</p>
              </div>
            </div>
          )}
          {lieux.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">route</span>Sites / Lieux visités
              </p>
              {lieux.map((l, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                  <div className="w-5 h-5 rounded-full bg-primary text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                  <span className="text-sm font-semibold text-slate-700">{l}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Groupe & Conditions ──────────────────────────────────────────── */}
        <section>
          <SH icon="groups" title="Groupe & Conditions" />
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {([
              { icon: "person", label: "Nb min. participants", val: d.nb_participants_min != null ? String(d.nb_participants_min) : null },
              { icon: "groups", label: "Nb max. participants", val: (d.nb_participants_max != null || offer.max_group_size) ? String(d.nb_participants_max ?? offer.max_group_size) : null },
              { icon: "child_care", label: "Âge minimum", val: (d.age_minimum != null || offer.min_age) ? `${d.age_minimum ?? offer.min_age} ans` : null },
              { icon: "elderly", label: "Âge maximum", val: d.age_maximum != null ? `${d.age_maximum} ans` : null },
            ] as { icon: string; label: string; val: string | null }[]).filter((it) => it.val != null).map(({ icon, label, val }) => (
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
          {langs.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">translate</span>Langue(s) de guidage
              </p>
              <div className="flex flex-wrap gap-2">
                {langs.map((l) => (
                  <span key={l} className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-xl">
                    <Globe size={12} />{LANG_LABELS[l] ?? l}
                  </span>
                ))}
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
        </section>

        {/* ── Disponibilités ───────────────────────────────────────────────── */}
        {d.disponibilite?.type && (() => {
          const dispType = d.disponibilite.type as string;
          const dispMeta = DISPO_LABELS[dispType] ?? { label: dispType, icon: "event" };
          const rawTs = d.disponibilite.time_slots as Record<string, Array<{ start: string; end: string }>> | null | undefined;
          const timeWindows: Array<{ start: string; end: string }> = rawTs && typeof rawTs === "object" && !Array.isArray(rawTs)
            ? Array.from(new Map(Object.values(rawTs).flat().map((w) => [`${w.start}-${w.end}`, w])).values())
            : [];
          const days_of_week: string[] = Array.isArray(d.disponibilite.days_of_week) ? d.disponibilite.days_of_week as string[] : [];
          return (
            <section>
              <SH icon="calendar_month" title="Disponibilités" />
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
                          {new Date(d.disponibilite.start_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          {d.disponibilite.end_date && <> → {new Date(d.disponibilite.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</>}
                        </p>
                      </div>
                    </div>
                  )}
                  {days_of_week.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm">view_week</span>Jours disponibles
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {days_of_week.map((dw) => (
                          <span key={dw} className="bg-primary/10 text-primary text-xs font-black px-3 py-1.5 rounded-xl">
                            {FR_DAYS[parseInt(dw)] ?? dw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(d.disponibilite.dates) && d.disponibilite.dates.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2">
                        {d.disponibilite.dates.length === 1 ? "Date unique" : `${d.disponibilite.dates.length} dates`}
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {(d.disponibilite.dates as string[]).map((dt) => (
                          <span key={dt} className="bg-white border border-primary/20 text-primary text-[11px] font-bold px-3 py-1.5 rounded-xl">
                            {new Date(dt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {timeWindows.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-sm">schedule</span>Horaires
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {timeWindows.map((tw, i) => (
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

        {/* ── Ce que vous fournissez ───────────────────────────────────────── */}
        {(() => {
          const sectionCollabs = Array.isArray(d.collaborators)
            ? (d.collaborators as Array<{ id: string; name: string; section: string; status?: string }>)
            : [];
          const collabFor = (section: string) => {
            const candidates = sectionCollabs.filter((c) => c.section === section);
            return candidates.find((c) => c.status !== "declined") ?? candidates[0] ?? null;
          };
          const CollabBadge = ({ section }: { section: string }) => {
            const c = collabFor(section);
            if (!c) return null;
            const st = c.status ?? "pending";
            const cls = st === "declined"
              ? "bg-red-50 border-red-200 text-red-600"
              : st === "pending"
              ? "bg-amber-50 border-amber-200 text-amber-600"
              : "bg-teal-50 border-teal-200 text-teal-700";
            const icon = st === "declined" ? "cancel" : st === "pending" ? "schedule" : "check_circle";
            const label = st === "declined" ? "Refusé" : st === "pending" ? "En attente" : c.name;
            return (
              <span className={`ml-auto flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cls}`}>
                <span className="material-symbols-outlined text-[11px]">{icon}</span>
                {st === "declined" || st === "pending" ? `${c.name} · ${label}` : label}
              </span>
            );
          };
          return (
        <section>
          <SH icon="room_service" title="Ce que vous fournissez" />
          <div className="space-y-3">
            {d.transport_inclus === true && (
              <div className="border border-secondary/20 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-secondary/5 border-b border-secondary/20">
                  <span className="material-symbols-outlined text-secondary text-lg">directions_bus</span>
                  <p className="text-xs font-extrabold text-secondary">Transport</p>
                  <CollabBadge section="transport" />
                </div>
                <div className="px-4 py-3 space-y-4">
                  {/* Format multi-type (prestataire transport classique) */}
                  {Array.isArray(d.transport_types) && (d.transport_types as string[]).map((type) => {
                    const svcEntry = (d.transport_svcs as Record<string, any>)?.[type];
                    const fields: Record<string, any> = svcEntry?.fields ?? {};
                    const photos: string[] = svcEntry?.photos ?? [];
                    const fieldDefs = OFFER_DETAIL_FIELDS[type]?.sections?.flatMap((s: any) => s.fields) ?? [];
                    return (
                      <div key={type} className="space-y-3">
                        <span className="inline-flex items-center bg-secondary/10 text-secondary text-[11px] font-bold px-2.5 py-1 rounded-lg">{type.replace(/_/g, " ")}</span>
                        <ServicePhotosGrid photos={photos} accentCls="border-secondary/20" />
                        {fieldDefs.filter((f: any) => {
                          const v = fields[f.key];
                          if (v === null || v === undefined || v === "" || v === false) return false;
                          if (Array.isArray(v) && v.length === 0) return false;
                          if (f.conditionalOn && fields[f.conditionalOn.field] !== f.conditionalOn.value) return false;
                          return true;
                        }).map((f: any) => {
                          const v = fields[f.key];
                          return (
                            <div key={f.key} className="flex flex-col gap-0.5">
                              <p className="text-[9px] font-black tracking-widest text-secondary/80 uppercase">{f.label}</p>
                              {Array.isArray(v) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {v.map((item: string) => <span key={item} className="text-[11px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-lg font-bold">{item}</span>)}
                                </div>
                              ) : v === true ? (
                                <span className="text-xs text-slate-700 font-semibold">Oui</span>
                              ) : (
                                <p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {/* Format PrestSubBlock (collab transport : transport_eco_sous_type / transport_std_sous_type) */}
                  {[
                    { sousType: d.transport_eco_sous_type as string | undefined, details: (d.transport_eco_details as Record<string, any>) ?? {}, subtypes: TRANSPORT_ECO_SUBTYPES, label: "Transport Éco" },
                    { sousType: d.transport_std_sous_type as string | undefined, details: (d.transport_std_details as Record<string, any>) ?? {}, subtypes: TRANSPORT_STD_SUBTYPES, label: "Transport" },
                  ].filter(({ sousType }) => !!sousType).map(({ sousType, details, subtypes, label }) => {
                    const subLabel = subtypes.find((s) => s.value === sousType)?.label ?? sousType!.replace(/_/g, " ");
                    const fieldDefs = OFFER_DETAIL_FIELDS[sousType!]?.sections?.flatMap((s: any) => s.fields) ?? [];
                    return (
                      <div key={sousType} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black tracking-widest text-secondary/60 uppercase">{label}</span>
                          <span className="inline-flex items-center bg-secondary/10 text-secondary text-[11px] font-bold px-2.5 py-1 rounded-lg">{subLabel}</span>
                        </div>
                        {fieldDefs.filter((f: any) => {
                          const v = details[f.key];
                          if (v === null || v === undefined || v === "" || v === false) return false;
                          if (Array.isArray(v) && v.length === 0) return false;
                          if (f.conditionalOn && details[f.conditionalOn.field] !== f.conditionalOn.value) return false;
                          return true;
                        }).map((f: any) => {
                          const v = details[f.key];
                          return (
                            <div key={f.key} className="flex flex-col gap-0.5">
                              <p className="text-[9px] font-black tracking-widest text-secondary/80 uppercase">{f.label}</p>
                              {Array.isArray(v) ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {v.map((item: string) => <span key={item} className="text-[11px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-lg font-bold">{item}</span>)}
                                </div>
                              ) : v === true ? (
                                <span className="text-xs text-slate-700 font-semibold">Oui</span>
                              ) : (
                                <p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {d.repas_flag === true && (
              <div className="border border-emerald-100 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">restaurant</span>
                  <p className="text-xs font-extrabold text-emerald-700">Restauration</p>
                  <CollabBadge section="restauration" />
                </div>
                <div className="px-4 py-3 space-y-4">
                  {d.restauration_mode === "guide" ? (() => {
                    // Mode guidage gastronomie locale (offre guide)
                    const gastroCfg = DOMAIN_CASCADE_CONFIG["gastronomie_locale"];
                    const gastroDetails = (d.restauration_gastro_details as Record<string, string[]>) ?? {};
                    const pill = (v: string) => (
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg font-bold">{v}</span>
                    );
                    return (
                      <div className="space-y-3">
                        {d.restauration_gastro_expertise && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-500 text-sm">hiking</span>
                            <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Guidage Gastronomie locale</span>
                            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{d.restauration_gastro_expertise as string}</span>
                          </div>
                        )}
                        {Array.isArray(gastroDetails.types) && gastroDetails.types.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black tracking-widest text-emerald-600 uppercase mb-1.5">{gastroCfg?.labelType ?? "Types"}</p>
                            <div className="flex flex-wrap gap-1.5">{gastroDetails.types.map((t) => <span key={t}>{pill(t)}</span>)}</div>
                          </div>
                        )}
                        {Array.isArray(gastroDetails.experiences) && gastroDetails.experiences.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black tracking-widest text-emerald-600 uppercase mb-1.5">{gastroCfg?.labelExperiences ?? "Expériences"}</p>
                            <div className="flex flex-wrap gap-1.5">{gastroDetails.experiences.map((e) => <span key={e}>{pill(e)}</span>)}</div>
                          </div>
                        )}
                        {Array.isArray(gastroDetails.mediation) && gastroDetails.mediation.length > 0 && (
                          <div>
                            <p className="text-[9px] font-black tracking-widest text-emerald-600 uppercase mb-1.5">{gastroCfg?.labelMediation ?? "Médiation"}</p>
                            <div className="flex flex-wrap gap-1.5">{gastroDetails.mediation.map((m) => <span key={m}>{pill(m)}</span>)}</div>
                          </div>
                        )}
                      </div>
                    );
                  })() : d.restauration_mode === "prestataire" ? (() => {
                    // Mode service prestataire restaurant (offre guide)
                    const sous = d.restauration_prest_sous_type as string | undefined;
                    const details = (d.restauration_prest_details as Record<string, any>) ?? {};
                    if (!sous) return null;
                    const fieldDefs = OFFER_DETAIL_FIELDS[sous]?.sections?.flatMap((s: any) => s.fields) ?? [];
                    return (
                      <div className="space-y-3">
                        <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{sous.replace(/_/g, " ")}</span>
                        {fieldDefs.filter((f: any) => {
                          const v = details[f.key];
                          if (v === null || v === undefined || v === "" || v === false) return false;
                          if (Array.isArray(v) && v.length === 0) return false;
                          return true;
                        }).map((f: any) => {
                          const v = details[f.key];
                          return (
                            <div key={f.key} className="flex flex-col gap-0.5">
                              <p className="text-[9px] font-black tracking-widest text-emerald-600 uppercase">{f.label}</p>
                              {Array.isArray(v) ? (
                                <div className="flex flex-wrap gap-1.5">{v.map((item: string) => <span key={item} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg font-bold">{item}</span>)}</div>
                              ) : <p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })() : (
                    // Fallback : offre prestataire format (restauration_types / OFFER_DETAIL_FIELDS)
                    Array.isArray(d.restauration_types) && (d.restauration_types as string[]).map((type) => {
                      const svcEntry = (d.restauration_svcs as Record<string, any>)?.[type];
                      const fields: Record<string, any> = svcEntry?.fields ?? {};
                      const photos: string[] = svcEntry?.photos ?? [];
                      const fieldDefs = OFFER_DETAIL_FIELDS[type]?.sections?.flatMap((s: any) => s.fields) ?? [];
                      return (
                        <div key={type} className="space-y-3">
                          <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{type.replace(/_/g, " ")}</span>
                          <ServicePhotosGrid photos={photos} accentCls="border-emerald-100" />
                          {fieldDefs.filter((f: any) => {
                            const v = fields[f.key];
                            if (v === null || v === undefined || v === "" || v === false) return false;
                            if (Array.isArray(v) && v.length === 0) return false;
                            if (f.conditionalOn && fields[f.conditionalOn.field] !== f.conditionalOn.value) return false;
                            return true;
                          }).map((f: any) => {
                            const v = fields[f.key];
                            return (
                              <div key={f.key} className="flex flex-col gap-0.5">
                                <p className="text-[9px] font-black tracking-widest text-emerald-600 uppercase">{f.label}</p>
                                {Array.isArray(v) ? (
                                  <div className="flex flex-wrap gap-1.5">{v.map((item: string) => <span key={item} className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg font-bold">{item}</span>)}</div>
                                ) : v === true ? (
                                  <span className="text-xs text-slate-700 font-semibold">Oui</span>
                                ) : (
                                  <p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            {d.hebergement_inclus === true && (
              <div className="border border-teal-100 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-teal-50 border-b border-teal-100">
                  <span className="material-symbols-outlined text-teal-600 text-lg">hotel</span>
                  <p className="text-xs font-extrabold text-teal-700">Hébergement</p>
                  <CollabBadge section="hebergement" />
                </div>
                <div className="px-4 py-3 space-y-4">
                  {Array.isArray(d.hebergement_types) && (d.hebergement_types as string[]).map((type) => {
                    const svcEntry = (d.hebergement_svcs as Record<string, any>)?.[type];
                    const fieldDefs = OFFER_DETAIL_FIELDS[type]?.sections?.flatMap((s: any) => s.fields) ?? [];
                    // HebergData: { units: [...], nb_unites, ... } — valeurs dans chaque unit directement
                    // SimpleServiceData: { fields: {...}, photos: [...] }
                    const isHeberg = svcEntry?.units && Array.isArray(svcEntry.units);
                    const unitsToRender: Array<{ fields: Record<string, any>; photos: string[] }> = isHeberg
                      ? (svcEntry.units as Array<Record<string, any>>).map((u: Record<string, any>) => ({ fields: u, photos: (u.photos as string[]) ?? [] }))
                      : [{ fields: svcEntry?.fields ?? svcEntry ?? {}, photos: svcEntry?.photos ?? [] }];
                    return (
                      <div key={type} className="space-y-3">
                        <span className="inline-flex items-center bg-teal-50 text-teal-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">{type.replace(/_/g, " ")}</span>
                        {unitsToRender.map(({ fields, photos }, ui) => (
                          <div key={ui} className="space-y-2">
                            {unitsToRender.length > 1 && (
                              <p className="text-[9px] font-black tracking-widest text-teal-600 uppercase">Unité {ui + 1}</p>
                            )}
                            <ServicePhotosGrid photos={photos} accentCls="border-teal-100" />
                            {fieldDefs.filter((f: any) => {
                              const v = fields[f.key];
                              if (v === null || v === undefined || v === "" || v === false) return false;
                              if (Array.isArray(v) && v.length === 0) return false;
                              if (f.conditionalOn && fields[f.conditionalOn.field] !== f.conditionalOn.value) return false;
                              return true;
                            }).map((f: any) => {
                              const v = fields[f.key];
                              return (
                                <div key={f.key} className="flex flex-col gap-0.5">
                                  <p className="text-[9px] font-black tracking-widest text-teal-700 uppercase">{f.label}</p>
                                  {Array.isArray(v) ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {v.map((item: string) => <span key={item} className="text-[11px] bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-lg font-bold">{item}</span>)}
                                    </div>
                                  ) : v === true ? (
                                    <span className="text-xs text-slate-700 font-semibold">Oui</span>
                                  ) : (
                                    <p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {d.autre_service_inclus === true && (() => {
              const autreMode = ((d.autre_service_details as Record<string, any>)?._mode as "guide" | "prestataire") || "guide";
              const autreCat = d.autre_service_categorie as string | undefined;
              const autreSub = d.autre_service_sous_type as string | undefined;
              const autreDetails = (d.autre_service_details as Record<string, any>) ?? {};
              const autreCascade = autreCat ? (DOMAIN_CASCADE_CONFIG[autreCat] ?? null) : null;
              return (
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <span className="material-symbols-outlined text-slate-600 text-lg">category</span>
                    <p className="text-xs font-extrabold text-slate-700">Autre service</p>
                    <CollabBadge section="autre_service" />
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    {autreMode === "guide" && autreCat && (
                      <>
                        <div>
                          <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-1">Domaine</p>
                          <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg">
                            <span className="material-symbols-outlined text-sm">{DOMAINES[autreCat]?.icon ?? "category"}</span>
                            {DOMAINES[autreCat]?.label ?? autreCat.replace(/_/g, " ")}
                          </span>
                        </div>
                        {autreSub && (
                          <div>
                            <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-1">Expertise</p>
                            <span className="inline-flex items-center bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg">{autreSub}</span>
                          </div>
                        )}
                        {Array.isArray(autreDetails.types) && (autreDetails.types as string[]).length > 0 && (
                          <div>
                            <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-1">Types</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(autreDetails.types as string[]).map((t: string) => (
                                <span key={t} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-bold">{t}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(autreDetails.experiences) && (autreDetails.experiences as string[]).length > 0 && (
                          <div>
                            <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-1">
                              {autreCascade?.labelExperiences ?? "Expériences"}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(autreDetails.experiences as string[]).map((e: string) => (
                                <span key={e} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-bold">{e}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(autreDetails.mediation) && (autreDetails.mediation as string[]).length > 0 && (
                          <div>
                            <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase mb-1">
                              {autreCascade?.labelMediation ?? "Médiation"}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(autreDetails.mediation as string[]).map((m: string) => (
                                <span key={m} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-bold">{m}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {autreMode === "prestataire" && autreCat && (
                      <>
                        <span className="inline-flex items-center bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                          {autreCat.replace(/_/g, " ")}
                          {autreSub && ` · ${autreSub.replace(/_/g, " ")}`}
                        </span>
                        {autreSub && (() => {
                          const fieldDefs = OFFER_DETAIL_FIELDS[autreSub]?.sections?.flatMap((s: any) => s.fields) ?? [];
                          return fieldDefs.filter((f: any) => {
                            const v = autreDetails[f.key];
                            if (v === null || v === undefined || v === "" || v === false) return false;
                            if (Array.isArray(v) && v.length === 0) return false;
                            if (f.conditionalOn && autreDetails[f.conditionalOn.field] !== f.conditionalOn.value) return false;
                            return true;
                          }).map((f: any) => {
                            const v = autreDetails[f.key];
                            return (
                              <div key={f.key} className="flex flex-col gap-0.5">
                                <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">{f.label}</p>
                                {Array.isArray(v) ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {(v as string[]).map((item: string) => <span key={item} className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg font-bold">{item}</span>)}
                                  </div>
                                ) : v === true ? (
                                  <span className="text-xs text-slate-700 font-semibold">Oui</span>
                                ) : (
                                  <p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {inclus.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-[9px] font-black tracking-widest text-emerald-700 uppercase mb-2.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">check_circle</span>Services inclus
                </p>
                <ul className="space-y-1.5">
                  {inclus.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="material-symbols-outlined text-emerald-500 text-base shrink-0 mt-0.5">done</span>{item}
                    </li>
                  ))}
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
          </div>
        </section>
          );
        })()}

        {/* ── Formules / variantes ─────────────────────────────────────────── */}
        {(() => {
          const pricing = offer.variant_pricing
            ?? (d.subtypes_pricing as Record<string, number> | undefined);
          const keys = pricing ? Object.keys(pricing) : [];
          if (!keys.length) return null;
          const capacityLabel = formatOfferCapacityLabel(offer);
          const isPackage = offer.offer_mode === "package";
          return (
            <section>
              <SH icon="category" title={isPackage ? "Package — formules incluses" : "Formules disponibles"} />
              <div className="space-y-2">
                {keys.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">{formatSubtypeLabel(key)}</p>
                      {capacityLabel && (
                        <p className="text-[11px] text-slate-400">{capacityLabel}</p>
                      )}
                    </div>
                    <p className="text-sm font-black text-primary whitespace-nowrap">
                      {Number(pricing![key]).toFixed(0)} DT
                    </p>
                  </div>
                ))}
              </div>
              {!isPackage && (
                <p className="text-xs text-slate-500 mt-3">
                  Vous pouvez sélectionner une ou plusieurs formules lors de la réservation.
                </p>
              )}
            </section>
          );
        })()}

        {/* ── Tarification ─────────────────────────────────────────────────── */}
        {d.tarification && (
          <section>
            <SH icon="payments" title="Tarification" />
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl overflow-hidden">
              <div className="flex flex-wrap divide-x divide-emerald-100">
                {(d.tarification.prix_par_personne ?? d.tarification.price_per_person) != null && (
                  <div className="flex-1 p-5 text-center min-w-[120px]">
                    <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">Par personne</p>
                    <p className="text-2xl font-extrabold text-primary leading-none">{d.tarification.prix_par_personne ?? d.tarification.price_per_person}</p>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">DT</p>
                  </div>
                )}
                {(d.tarification.prix_groupe ?? d.tarification.price_per_group) != null && (
                  <div className="flex-1 p-5 text-center min-w-[120px]">
                    <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-1">Par groupe</p>
                    <p className="text-2xl font-extrabold text-primary leading-none">{d.tarification.prix_groupe ?? d.tarification.price_per_group}</p>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">DT</p>
                  </div>
                )}
                {d.tarification.deposit_percent != null && (
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

        {/* ── Confirmation & Annulation ────────────────────────────────────── */}
        {(d.type_confirmation || offer.cancellation_policy || d.politique_annulation) && (
          <section>
            <SH icon="policy" title="Confirmation & Annulation" />
            <div className="space-y-3">
              {d.type_confirmation && (
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-600 text-xl">verified</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-0.5">Type de confirmation</p>
                    <p className="text-sm font-bold text-slate-700">{CONF[d.type_confirmation] ?? d.type_confirmation}</p>
                  </div>
                </div>
              )}
              {(offer.cancellation_policy || d.politique_annulation) && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-slate-400 text-sm">policy</span>Politique d'annulation
                  </p>
                  <p className="text-sm font-bold text-slate-700">
                    {ANNUL[offer.cancellation_policy ?? d.politique_annulation ?? ""] ?? (offer.cancellation_policy ?? d.politique_annulation)}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}


      </div>
    </div>
  );
}
