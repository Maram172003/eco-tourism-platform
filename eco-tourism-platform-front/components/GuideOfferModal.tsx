"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { X, ArrowLeft, ArrowRight, Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  NIVEAU_EXPERIENCE,
  PUBLIC_RECOMMANDE,
  REGIMES_OPTIONS,
  EQUIP_SECURITE,
  EQUIP_CONFORT,
  LANGUES_OPTIONS,
  DOMAINES,
  SERVICES_DEFAUT,
  A_APPORTER,
} from "@/lib/guideOfferConfig";
import DomainPicker from "@/components/guide/offer/DomainPicker";
import ExpertisesPicker from "@/components/guide/offer/ExpertisesPicker";
import DynamicFields from "@/components/guide/offer/DynamicFields";
import { DOMAIN_CASCADE_CONFIG, getExperiencesGrouped, getMediationGrouped } from "@/lib/domainCascadeConfig";
import { OFFER_DETAIL_FIELDS } from "@/lib/offer-schema";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";

import ProviderSchemaForm from "@/components/guide/offer/ProviderSchemaForm";
import {
  SimpleServiceBlock, HebergBlock,
  EMPTY_SIMPLE_SERVICE, EMPTY_HEBERG,
  type SimpleServiceData, type HebergData,
} from "@/components/guide/offer/ProviderServiceBlock";
import LocationPicker from "@/components/guide/offer/LocationPicker";
import { OfferAvailPicker, EMPTY_OFFER_AVAIL, type OfferAvailSlot } from "@/components/offer/OfferAvailPicker";
import AvailabilitySyncPanel from "@/components/guide/offer/AvailabilitySyncPanel";
import { PricingBlock, type PricingData, EMPTY_PRICING } from "@/components/offer/PricingBlock";
import { ConfirmationTypePicker, type ConfirmationData, EMPTY_CONFIRMATION } from "@/components/offer/ConfirmationTypePicker";
import InviteCollaboratorModal, { type CollabSection } from "@/components/guide/offer/InviteCollaboratorModal";
import TaxonomyTagPicker from "@/components/common/TaxonomyTagPicker";


const MultiLocationPickerDyn = dynamic(() => import("@/components/map/MultiLocationPicker"), { ssr: false });

// ── Steps ──────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Présentation de l'offre",    subtitle: "Domaine, photos, titre & public" },
  { id: 2, title: "Localisation",               subtitle: "Point de départ et lieux visités" },
  { id: 3, title: "Expertises & Détails",        subtitle: "Compétences et champs spécifiques" },
  { id: 4, title: "Groupe & Conditions",         subtitle: "Participants, langues & restrictions" },
  { id: 5, title: "Disponibilités",              subtitle: "Quand êtes-vous disponible ?" },
  { id: 6, title: "Équipement & Services",       subtitle: "Ce que vous fournissez" },
  { id: 7, title: "Tarification",                subtitle: "Prix & Acompte" },
  { id: 8, title: "Confirmation & Récapitulatif", subtitle: "Finaliser et publier" },
];

const TYPE_PRESTATION_OFFRE = [
  { value: "guidage_seul",    icon: "explore",        label: "Guidage seul",         desc: "Accompagnement et expertise uniquement" },
  { value: "avec_transport",  icon: "directions_car", label: "+ Transport",           desc: "Transport + guidage inclus" },
  { value: "transport_repas", icon: "restaurant",     label: "+ Transport & Repas",   desc: "Transport, repas et guidage" },
  { value: "immersion",       icon: "camping",        label: "Immersion complète",    desc: "Multi-jours, tout inclus" },
  { value: "sur_mesure",      icon: "tune",           label: "Sur mesure",            desc: "Contenu entièrement personnalisé" },
];

const TYPE_GUIDAGE_OPTIONS = [
  { value: "prive",  icon: "person",        label: "Guide privé",  desc: "Individuel ou famille" },
  { value: "groupe", icon: "group",         label: "Guide groupe", desc: "Petit groupe · jusqu'à 15 pers." },
];

const GUIDE_TRANSPORT_TYPES = [
  { value: "transfert_partage",  icon: "airport_shuttle", label: "Transfert / Navette",   desc: "Navette partagée, départ groupé" },
  { value: "transporteur_local", icon: "local_taxi",      label: "Transporteur partenaire", desc: "Prestataire transport local" },
];

const GUIDE_RESTAURATION_TYPES = [
  { value: "restaurant_traditionnel", icon: "restaurant",  label: "Restaurant",        desc: "Restaurant traditionnel partenaire" },
  { value: "ferme_restaurant",        icon: "agriculture", label: "Ferme-restaurant",  desc: "Repas à la ferme, circuit court" },
  { value: "table_hotes",             icon: "dining",      label: "Table d'hôtes",     desc: "Repas chez l'habitant" },
  { value: "diner_panoramique",       icon: "landscape",   label: "Dîner panoramique", desc: "Repas avec vue imprenable" },
];

const GUIDE_HEBERGEMENT_TYPES = [
  { value: "chambre_standard",   icon: "hotel",      label: "Chambre standard",   desc: "Chambre classique" },
  { value: "chambre_superieure", icon: "king_bed",   label: "Chambre supérieure", desc: "Chambre premium" },
  { value: "suite",              icon: "villa",      label: "Suite",              desc: "Suite de luxe" },
  { value: "bungalow",           icon: "cottage",    label: "Bungalow",           desc: "Bungalow indépendant" },
  { value: "tente_glamping",     icon: "cabin",      label: "Tente glamping",     desc: "Tente confort" },
  { value: "gite_rural",         icon: "home",       label: "Gîte rural",         desc: "Gîte complet" },
  { value: "maison_hotes",       icon: "house",      label: "Maison d'hôtes",     desc: "Chez l'habitant" },
  { value: "riad_traditionnel",  icon: "foundation", label: "Riad / Dar",         desc: "Maison traditionnelle" },
  { value: "ecolodge",           icon: "forest",     label: "Éco-lodge",          desc: "Hébergement écologique" },
  { value: "camping_sauvage",    icon: "camping",    label: "Camping / Bivouac",  desc: "En plein air" },
  { value: "dortoir",            icon: "bed",        label: "Dortoir",            desc: "Lits en dortoir" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuideProfile {
  domaines: string[] | null;
  expertises: string[] | null;
  zones_couvertes: string[] | null;
  publics_accueillis: string[] | null;
  languages_spoken: string[] | null;
}

interface FormData {
  // Domaine — choisi en étape 1
  domaine: string;
  isAutreDomaine: boolean;
  // Expertises — choisies en étape 3
  expertises: string[];
  // Étape 1
  photos: string[];
  titre: string;
  description_courte: string;
  description_longue: string;
  type_guidage: string | null;
  type_prestation: string | null;
  niveau_experience: string[];
  public_recommande: string[];
  points_forts: string[];
  // Étape 2
  lieu_precis: string;
  zone_offre: string;
  point_rendez_vous: string;
  lieu_lat: number | null;
  lieu_lng: number | null;
  lieux_visites: string[];
  heure_depart: string;
  // Étape 3 — champs dynamiques par domaine
  dynamic_details: Record<string, any>;
  // Étape 4
  nb_participants_min: string;
  nb_participants_max: string;
  age_minimum: string;
  age_maximum: string;
  langue_guidage: string[];
  annulation_meteo: boolean | null;
  restrictions_medicales: string;
  conditions_particulieres: string;
  // Étape 5 — Transport
  transport_inclus: boolean | null;
  transport_types: string[];
  transport_active: string;
  transport_svcs: Record<string, SimpleServiceData>;
  // Étape 5 — Restauration
  repas_flag: boolean | null;
  restauration_types: string[];
  restauration_active: string;
  restauration_svcs: Record<string, SimpleServiceData>;
  // Étape 5 — Hébergement
  hebergement_inclus: boolean | null;
  hebergement_types: string[];
  hebergement_active: string;
  hebergement_svcs: Record<string, HebergData>;
  hebergement_prest_sous_type: string;
  hebergement_prest_details: Record<string, any>;
  // Étape 5 — Transport prestataire (deux catégories séparées)
  transport_eco_sous_type: string;
  transport_eco_details: Record<string, any>;
  transport_std_sous_type: string;
  transport_std_details: Record<string, any>;
  // Étape 5 — Restauration mode + prestataire + guidage gastronomie
  restauration_mode: string;
  restauration_prest_sous_type: string;
  restauration_prest_details: Record<string, any>;
  restauration_gastro_expertise: string;
  restauration_gastro_details: Record<string, any>;
  // Étape 5 — Autre service (Sur mesure)
  autre_service_inclus: boolean | null;
  autre_service_categorie: string;
  autre_service_sous_type: string;
  autre_service_details: Record<string, any>;
  services_inclus: string[];
  equipement_a_apporter: string;
  non_inclus: string;
  // Étape 5
  avail: OfferAvailSlot;
  avail_has_conflict: boolean;
  // Étape 7
  pricing: PricingData;
  // Étape 8
  confirmation: ConfirmationData;
  tags: string[];
}

const EMPTY_FORM: FormData = {
  domaine: "", isAutreDomaine: false, expertises: [],
  photos: [], titre: "", description_courte: "", description_longue: "",
  type_guidage: null,
  type_prestation: null, niveau_experience: [], public_recommande: [], points_forts: [],
  lieu_precis: "", zone_offre: "", point_rendez_vous: "", lieu_lat: null, lieu_lng: null,
  lieux_visites: [],
  heure_depart: "",
  dynamic_details: {},
  nb_participants_min: "", nb_participants_max: "",
  age_minimum: "", age_maximum: "",
  langue_guidage: [], annulation_meteo: null,
  restrictions_medicales: "", conditions_particulieres: "",
  transport_inclus: null, transport_types: [], transport_active: "", transport_svcs: {},
  repas_flag: null, restauration_types: [], restauration_active: "", restauration_svcs: {},
  hebergement_inclus: null, hebergement_types: [], hebergement_active: "", hebergement_svcs: {},
  hebergement_prest_sous_type: "", hebergement_prest_details: {},
  transport_eco_sous_type: "", transport_eco_details: {},
  transport_std_sous_type: "", transport_std_details: {},
  restauration_mode: "",
  restauration_prest_sous_type: "", restauration_prest_details: {},
  restauration_gastro_expertise: "", restauration_gastro_details: {},
  autre_service_inclus: null, autre_service_categorie: "", autre_service_sous_type: "", autre_service_details: {},
  services_inclus: [], equipement_a_apporter: "", non_inclus: "",
  avail: EMPTY_OFFER_AVAIL,
  avail_has_conflict: false,
  pricing: EMPTY_PRICING,
  confirmation: EMPTY_CONFIRMATION,
  tags: [],
};

function buildEmptyForProfile(profile: GuideProfile): FormData {
  const dom = profile.domaines?.length === 1 ? (profile.domaines[0] ?? "") : "";
  return {
    ...EMPTY_FORM,
    domaine: dom,
    public_recommande: [],
    services_inclus: dom ? (SERVICES_DEFAUT[dom] ?? []) : [],
    equipement_a_apporter: dom ? (A_APPORTER[dom] ?? "") : "",
  };
}

function inferDomain(d: Record<string, any>, base: FormData): string {
  if (d.domaine_offre) return String(d.domaine_offre);
  // Infer from stored expertises: find the DOMAINES entry that contains one of the offer's expertises
  const expertises: string[] = Array.isArray(d.expertises_offre) ? d.expertises_offre : [];
  for (const [key, cfg] of Object.entries(DOMAINES)) {
    if (expertises.some((e: string) => (cfg.expertises as string[]).includes(e))) return key;
  }
  return base.domaine;
}

function offerToFormData(offer: Record<string, any>, profile: GuideProfile): FormData {
  const d = (offer.details ?? {}) as Record<string, any>;
  const base = buildEmptyForProfile(profile);
  const domaine = inferDomain(d, base);
  return {
    ...base,
    domaine,
    isAutreDomaine: d.domaine_hors_profil ?? false,
    expertises: d.expertises_offre ?? [],
    photos: (offer.images ?? []).filter((s: string) => s?.startsWith("data:") || s?.startsWith("http")),
    titre: offer.title ?? "",
    description_courte: offer.description ?? "",
    description_longue: d.description_longue ?? "",
    type_guidage: d.type_guidage_offre ?? null,
    type_prestation: d.type_prestation ?? null,
    niveau_experience: d.difficulte_physique ? (d.difficulte_physique as string).split(", ").filter(Boolean) : [],
    public_recommande: d.public_recommande ?? [],
    points_forts: d.points_forts ?? [],
    lieu_precis: d.lieu_precis ?? offer.meeting_point ?? "",
    zone_offre: d.zone_offre ?? "",
    point_rendez_vous: offer.meeting_point ?? "",
    lieu_lat: d.lieu_lat ?? offer.meeting_lat ?? null,
    lieu_lng: d.lieu_lng ?? offer.meeting_lng ?? null,
    lieux_visites: d.lieux_visites ?? [],
    heure_depart: d.heure_depart ?? "",
    dynamic_details: d.domaine_details ?? {},
    nb_participants_min: d.nb_participants_min != null ? String(d.nb_participants_min) : "",
    nb_participants_max: offer.max_group_size != null ? String(offer.max_group_size) : "",
    age_minimum: d.age_minimum != null ? String(d.age_minimum) : (offer.min_age != null ? String(offer.min_age) : ""),
    age_maximum: d.age_maximum != null ? String(d.age_maximum) : "",
    langue_guidage: d.langue_guidage ?? [],
    annulation_meteo: d.annulation_meteo ?? null,
    restrictions_medicales: d.restrictions_medicales ?? "",
    conditions_particulieres: d.conditions_particulieres ?? "",
    transport_inclus: d.transport_inclus ?? null,
    transport_types: d.transport_types ?? [],
    transport_active: (d.transport_types ?? [])[0] ?? "",
    transport_svcs: d.transport_svcs ?? {},
    repas_flag: d.repas_flag ?? null,
    restauration_types: d.restauration_types ?? [],
    restauration_active: (d.restauration_types ?? [])[0] ?? "",
    restauration_svcs: d.restauration_svcs ?? {},
    hebergement_inclus: d.hebergement_inclus ?? null,
    hebergement_types: d.hebergement_types ?? [],
    hebergement_active: (d.hebergement_types ?? [])[0] ?? "",
    hebergement_svcs: d.hebergement_svcs ?? {},
    hebergement_prest_sous_type: d.hebergement_prest_sous_type ?? "",
    hebergement_prest_details: d.hebergement_prest_details ?? {},
    transport_eco_sous_type: d.transport_eco_sous_type ?? "",
    transport_eco_details: d.transport_eco_details ?? {},
    transport_std_sous_type: d.transport_std_sous_type ?? "",
    transport_std_details: d.transport_std_details ?? {},
    restauration_mode: d.restauration_mode ?? "",
    restauration_prest_sous_type: d.restauration_prest_sous_type ?? "",
    restauration_prest_details: d.restauration_prest_details ?? {},
    restauration_gastro_expertise: d.restauration_gastro_expertise ?? "",
    restauration_gastro_details: d.restauration_gastro_details ?? {},
    autre_service_inclus: d.autre_service_inclus ?? null,
    autre_service_categorie: d.autre_service_categorie ?? "",
    autre_service_sous_type: d.autre_service_sous_type ?? "",
    autre_service_details: d.autre_service_details ?? {},
    services_inclus: Array.isArray(d.inclus_resume) ? d.inclus_resume : [],
    equipement_a_apporter: d.equipement_a_apporter ?? "",
    non_inclus: d.non_inclus ?? "",
    avail: d.disponibilite ?? { ...EMPTY_OFFER_AVAIL },
    avail_has_conflict: false,
    pricing: d.tarification ?? { ...EMPTY_PRICING, prix_par_personne: offer.price ? String(offer.price) : "" },
    confirmation: {
      type_confirmation: d.type_confirmation ?? "",
      politique_annulation: offer.cancellation_policy ?? d.politique_annulation ?? "",
      description_politique: d.description_politique ?? "",
      annulation_meteo: d.annulation_meteo_confirmation ?? null,
    },
    tags: offer.tags ?? [],
  };
}

// ── Micro-composants ──────────────────────────────────────────────────────────

const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Txt({ value, onChange, placeholder, rows, maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number }) {
  return (
    <textarea className={`${inputCls} resize-none`} value={value}
      onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
      placeholder={placeholder} rows={rows ?? 3} />
  );
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function Bool({ label, icon, value, onChange }: { label: string; icon?: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
      <div className="flex items-center gap-2">
        {icon && <span className="material-symbols-outlined text-slate-500 text-lg">{icon}</span>}
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all border-2 ${value === v ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40 bg-white"}`}>
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </div>
  );
}

function PhotoMultiUpload({ photos, onChange }: { photos: string[]; onChange: (v: string[]) => void }) {
  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 8) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800; const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange([...photos, canvas.toDataURL("image/jpeg", 0.75)]);
      URL.revokeObjectURL(url);
    };
    img.src = url; e.target.value = "";
  }
  function setCover(i: number) {
    if (i === 0) return;
    const reordered = [photos[i], ...photos.filter((_, j) => j !== i)];
    onChange(reordered);
  }
  return (
    <div className="space-y-2">
      {photos.length === 0 ? (
        <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all bg-slate-50/60 group">
          <span className="material-symbols-outlined text-slate-300 group-hover:text-primary text-3xl transition-colors">add_photo_alternate</span>
          <div className="text-center">
            <p className="text-xs font-extrabold text-slate-500 group-hover:text-primary transition-colors">Ajouter des photos</p>
            <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG · Max. 8 photos</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={addPhoto} />
        </label>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={i} onClick={() => setCover(i)}
                className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${i === 0 ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                <img src={p} alt="" className="w-full h-full object-cover" />
                {i === 0 && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                <button type="button" onClick={(e) => { e.stopPropagation(); onChange(photos.filter((_, j) => j !== i)); }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
              </div>
            ))}
            {photos.length < 8 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
                <span className="material-symbols-outlined text-slate-400 text-xl">add</span>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5">{photos.length}/8</span>
                <input type="file" accept="image/*" className="hidden" onChange={addPhoto} />
              </label>
            )}
          </div>
          <p className="text-[10px] text-slate-400">{photos.length}/8 photo{photos.length > 1 ? "s" : ""} · Cliquer sur une photo pour la définir comme cover</p>
        </>
      )}
    </div>
  );
}

function CustomTagAdd({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder?: string }) {
  const [val, setVal] = useState("");
  const commit = () => { const v = val.trim(); if (v) { onAdd(v); setVal(""); } };
  return (
    <div className="flex gap-2 mt-1.5">
      <input value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
        placeholder={placeholder} className={`${inputCls} flex-1 py-2`} />
      <button type="button" onClick={commit}
        className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors">
        <Plus size={14} />
      </button>
    </div>
  );
}

const ALL_LANGS = LANGUES_OPTIONS;

// ── Étapes ────────────────────────────────────────────────────────────────────

function Step1({ d, u, profile }: { d: FormData; u: (x: Partial<FormData>) => void; profile: GuideProfile }) {
  function togArr<K extends keyof FormData>(key: K, v: string) {
    const arr = (d[key] as string[]) ?? [];
    u({ [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] } as any);
  }

  return (
    <div className="space-y-5">

      {/* Sélection du domaine */}
      <Field label="Domaine de l'offre" required>
        <DomainPicker
          onboardingDomaines={profile.domaines ?? []}
          value={d.domaine}
          isAutreDomaine={d.isAutreDomaine}
          onSelect={(dom, isAutre) => {
            u({
              domaine: dom,
              isAutreDomaine: isAutre,
              expertises: [],
              dynamic_details: {},
              services_inclus: SERVICES_DEFAUT[dom] ?? [],
              equipement_a_apporter: A_APPORTER[dom] ?? "",
            });
          }}
        />
      </Field>

      <Field label="Photos de l'offre" required>
        <PhotoMultiUpload photos={d.photos} onChange={(v) => u({ photos: v })} />
      </Field>

      <Field label="Titre de l'offre" required>
        <input className={inputCls} value={d.titre} onChange={(e) => u({ titre: e.target.value })}
          placeholder="Ex: Trek 2 jours Kroumirie avec bivouac" />
      </Field>

      <Field label="Description courte" required>
        <div className="relative">
          <Txt value={d.description_courte} onChange={(v) => u({ description_courte: v })} maxLength={160}
            placeholder="Résumé percutant en quelques mots…" rows={2} />
          <span className={`absolute bottom-2 right-3 text-xs font-semibold ${d.description_courte.length > 140 ? "text-amber-500" : "text-slate-400"}`}>
            {d.description_courte.length}/160
          </span>
        </div>
      </Field>

      <Field label="Description complète" required>
        <Txt value={d.description_longue} onChange={(v) => u({ description_longue: v })}
          placeholder="Décrivez l'expérience complète, l'ambiance, les paysages traversés…" rows={5} />
      </Field>

      {/* ── TYPE DE GUIDAGE ─────────────────────────────────────────── */}
      <Field label="Type de guidage" required>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_GUIDAGE_OPTIONS.map((tg) => {
            const active = d.type_guidage === tg.value;
            return (
              <button key={tg.value} type="button"
                onClick={() => u({ type_guidage: active ? null : tg.value })}
                className={`relative flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all duration-150 ${active ? "bg-primary/10 border-primary shadow-sm" : "border-slate-100 bg-white hover:border-primary/30 hover:bg-slate-50/60 text-slate-600"}`}>
                {active && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check size={9} className="text-slate-900" strokeWidth={3} />
                  </span>
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary" : "bg-slate-100"}`}>
                  <span className={`material-symbols-outlined text-lg ${active ? "text-slate-900" : "text-slate-400"}`}>{tg.icon}</span>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className={`font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>{tg.label}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${active ? "text-primary/70" : "text-slate-400"}`}>{tg.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Field>

      {/* ── PUBLIC RECOMMANDÉ — conditionnel au type de guidage ─────── */}
      {d.type_guidage && (
        <Field label="Public recommandé" required>
          <div className="grid grid-cols-2 gap-2">
            {PUBLIC_RECOMMANDE.map((p) => {
              const active = d.public_recommande.includes(p.value);
              return (
                <button key={p.value} type="button" onClick={() => togArr("public_recommande", p.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-100 bg-white hover:border-primary/30 text-slate-600"}`}>
                  <span className={`material-symbols-outlined text-base ${active ? "text-primary" : "text-slate-400"}`}>{p.icon}</span>
                  {p.label}
                  {active && <Check size={12} className="ml-auto text-primary" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {/* ── TYPE DE PRESTATION — single select ──────────────────────── */}
      <Field label="Type de prestation" required>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_PRESTATION_OFFRE.map((tp) => {
            const active = d.type_prestation === tp.value;
            return (
              <button key={tp.value} type="button"
                onClick={() => u({ type_prestation: active ? null : tp.value })}
                className={`relative flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-xs font-bold transition-all duration-150 text-left ${active ? "bg-primary/10 border-primary shadow-sm" : "border-slate-100 bg-white hover:border-primary/30 hover:bg-slate-50/60 text-slate-600"}`}>
                {active && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check size={9} className="text-slate-900" strokeWidth={3} />
                  </span>
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${active ? "bg-primary" : "bg-slate-100"}`}>
                  <span className={`material-symbols-outlined text-lg ${active ? "text-slate-900" : "text-slate-400"}`}>{tp.icon}</span>
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className={`font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>{tp.label}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${active ? "text-primary/70" : "text-slate-400"}`}>{tp.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Niveau(x) d'expérience */}
      <Field label="Niveau(x) d'expérience" required>
        <div className="space-y-1.5">
          {NIVEAU_EXPERIENCE.map((n) => {
            const active = d.niveau_experience.includes(n.value);
            return (
              <button key={n.value} type="button" onClick={() => togArr("niveau_experience", n.value)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all duration-150 ${
                  active ? "border-primary/40 bg-primary/5" : "border-transparent bg-slate-50 hover:bg-slate-100"
                }`}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${n.dot}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-bold ${active ? "text-slate-900" : "text-slate-600"}`}>{n.label}</span>
                  <span className={`ml-2 text-xs ${active ? "text-slate-500" : "text-slate-400"}`}>— {n.desc}</span>
                </div>
                {active && <Check size={14} className="text-primary shrink-0" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </Field>

      {/* Points forts */}
      <Field label="Points forts" hint="Ajoutez vos arguments clés pour cette offre">
        {d.points_forts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {d.points_forts.map((pf) => (
              <span key={pf} className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 rounded-full text-xs font-semibold text-primary">
                {pf}
                <button type="button" onClick={() => {
                  const arr = d.points_forts;
                  u({ points_forts: arr.filter((x) => x !== pf) });
                }}><X size={10} className="text-primary/60" /></button>
              </span>
            ))}
          </div>
        )}
        <CustomTagAdd onAdd={(v) => { if (!d.points_forts.includes(v)) u({ points_forts: [...d.points_forts, v] }); }}
          placeholder="Ex: Vue panoramique, petit groupe garanti…" />
      </Field>
    </div>
  );
}

function Step2({ d, u }: { d: FormData; u: (x: Partial<FormData>) => void }) {
  return (
    <div className="space-y-5">
      <Field label="Point de départ / Point de rendez-vous" required hint="L'adresse ou lieu précis où les participants doivent se retrouver.">
        <LocationPicker
          value={{ lat: d.lieu_lat, lng: d.lieu_lng, adresse: d.lieu_precis }}
          onChange={(loc) => u({ lieu_lat: loc.lat, lieu_lng: loc.lng, lieu_precis: loc.adresse, point_rendez_vous: loc.adresse })}
          hint="Positionnez le point de départ de l'activité sur la carte."
        />
      </Field>
      <Field label="Description du point de rendez-vous" required hint="Ex: Devant l'entrée principale, parking nord…">
        <Txt value={d.point_rendez_vous} onChange={(v) => u({ point_rendez_vous: v })} rows={2}
          placeholder="Ex: Parking nord du Parc El Fehoul, à côté de la fontaine" />
      </Field>
    </div>
  );
}

function Step3({ d, u, profile }: { d: FormData; u: (x: Partial<FormData>) => void; profile: GuideProfile }) {
  const domCfg = DOMAINES[d.domaine];

  if (!d.domaine || !domCfg) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="material-symbols-outlined text-slate-300 text-5xl">category</span>
        <p className="text-slate-500 font-semibold text-sm">Sélectionnez un domaine à l'étape 1 pour continuer.</p>
      </div>
    );
  }

  const hasCascade = !!DOMAIN_CASCADE_CONFIG[d.domaine];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <span className="material-symbols-outlined text-2xl text-slate-600">{domCfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-slate-800">{domCfg.label}</p>
          <p className="text-xs text-slate-400">
            {hasCascade ? "Expertises → Types → Expériences incluses → Supports" : "Champs spécifiques à ce domaine"}
          </p>
        </div>
        {d.isAutreDomaine && (
          <span className="text-[9px] font-black px-2 py-1 bg-primary/10 text-primary rounded-full shrink-0">Hors profil</span>
        )}
      </div>

      {/* ExpertisesPicker = Niveau 1 pour tous les domaines avec cascade */}
      {hasCascade && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-widest text-green-600 uppercase bg-green-50 px-2 py-1 rounded-full border border-green-200">
              Niveau 1 — Vos expertises
            </span>
          </div>
          <Field label="Expertises pour cette offre" required>
            <ExpertisesPicker
              domaine={d.domaine}
              onboardingExpertises={profile.expertises ?? []}
              isAutreDomaine={d.isAutreDomaine}
              value={d.expertises}
              onChange={(v) => u({ expertises: v })}
            />
          </Field>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
              Niveau 2+ — Détails de l'offre
            </span>
          </div>
        </>
      )}

      <DynamicFields
        domaine={d.domaine}
        expertisesSelectionnees={d.expertises}
        value={d.dynamic_details}
        onChange={(v) => {
          u({ dynamic_details: { ...d.dynamic_details, ...v } });
        }}
      />

      {/* Sites / Lieux visités — sous les champs spécifiques */}
      <Field label="Sites / Lieux visités" hint="Épinglez sur la carte tous les lieux de votre parcours.">
        <MultiLocationPickerDyn
          value={d.lieux_visites}
          onChange={(v) => u({ lieux_visites: v })}
          hint="Ajoutez tous les lieux que vous allez visiter."
        />
      </Field>
    </div>
  );
}

function Step4({ d, u, profile }: { d: FormData; u: (x: Partial<FormData>) => void; profile: GuideProfile }) {
  const togLang = (v: string) => {
    const arr = d.langue_guidage;
    u({ langue_guidage: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };
  const langs = profile.languages_spoken?.length
    ? profile.languages_spoken.map((v) => ALL_LANGS.find((l) => l.value === v) ?? { value: v, label: v })
    : ALL_LANGS;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nb min. participants">
          <input type="number" className={inputCls} value={d.nb_participants_min}
            onChange={(e) => u({ nb_participants_min: e.target.value })} placeholder="2" min={1} />
        </Field>
        <Field label="Nb max. participants" required>
          <input type="number" className={inputCls} value={d.nb_participants_max}
            onChange={(e) => u({ nb_participants_max: e.target.value })} placeholder="12" min={1} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Âge minimum">
          <input type="number" className={inputCls} value={d.age_minimum}
            onChange={(e) => u({ age_minimum: e.target.value })} placeholder="10" min={0} />
        </Field>
        <Field label="Âge maximum">
          <input type="number" className={inputCls} value={d.age_maximum}
            onChange={(e) => u({ age_maximum: e.target.value })} placeholder="75" min={0} />
        </Field>
      </div>

      <Field label="Langue(s) de guidage" required>
        <div className="flex flex-wrap gap-2">
          {langs.map((l) => {
            const active = d.langue_guidage.includes(l.value);
            return (
              <button key={l.value} type="button" onClick={() => togLang(l.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}>
                {l.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Restrictions médicales / contre-indications" required>
        <Txt value={d.restrictions_medicales} onChange={(v) => u({ restrictions_medicales: v })} rows={3}
          placeholder="Ex: Déconseillé aux personnes ayant des problèmes cardiaques…" />
      </Field>

      <Field label="Conditions particulières">
        <Txt value={d.conditions_particulieres} onChange={(v) => u({ conditions_particulieres: v })} rows={2}
          placeholder="Règles spécifiques, tenue obligatoire…" />
      </Field>
    </div>
  );
}

function SubTypePicker({
  options, values, onChange,
}: {
  options: { value: string; icon: string; label: string; desc: string }[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) =>
    onChange(values.includes(val) ? values.filter((x) => x !== val) : [...values, val]);
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border-2 text-left transition-all ${
              active
                ? "bg-primary/10 border-primary"
                : "border-slate-100 bg-white hover:border-primary/30 hover:bg-primary/5"
            }`}
          >
            <span className={`material-symbols-outlined text-base shrink-0 ${active ? "text-primary" : "text-slate-400"}`}>
              {opt.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[11px] font-extrabold leading-tight truncate ${active ? "text-slate-900" : "text-slate-600"}`}>
                {opt.label}
              </p>
              <p className="text-[9px] text-slate-400 leading-snug truncate">{opt.desc}</p>
            </div>
            {active && <Check size={12} className="text-primary shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function MultiTypeSection<TSvc>({
  title,
  icon,
  options,
  types: typesProp,
  active: activeProp,
  svcs: svcsProp,
  emptyFn,
  onToggleType,
  onSetActive,
  onSvcChange,
  renderBlock,
}: {
  title: string;
  icon: string;
  options: { value: string; icon: string; label: string; desc: string }[];
  types: string[];
  active: string;
  svcs: Record<string, TSvc>;
  emptyFn: () => TSvc;
  onToggleType: (types: string[], active: string, svcs: Record<string, TSvc>) => void;
  onSetActive: (a: string) => void;
  onSvcChange: (type: string, svc: TSvc) => void;
  renderBlock: (type: string, svc: TSvc) => React.ReactNode;
}) {
  const types = typesProp ?? [];
  const active = activeProp ?? "";
  const svcs = svcsProp ?? {};
  function handleToggle(newTypes: string[]) {
    const removed = types.filter((t) => !newTypes.includes(t));
    const added   = newTypes.filter((t) => !types.includes(t));
    const nextSvcs = { ...svcs };
    removed.forEach((t) => delete nextSvcs[t]);
    added.forEach((t) => { if (!nextSvcs[t]) nextSvcs[t] = emptyFn(); });
    const nextActive = newTypes.includes(active) ? active : (newTypes[0] ?? "");
    onToggleType(newTypes, nextActive, nextSvcs);
  }

  const activeLabel = options.find((o) => o.value === active)?.label ?? "";

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm text-slate-400">{icon}</span>
        {title}
      </p>
      <SubTypePicker options={options} values={types} onChange={handleToggle} />

      {types.length > 0 && (
        <div className="space-y-3">
          {/* Tabs si plusieurs types */}
          {types.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => {
                const lbl = options.find((o) => o.value === t)?.label ?? t;
                return (
                  <button key={t} type="button" onClick={() => onSetActive(t)}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${
                      active === t ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30"
                    }`}>
                    {lbl}
                  </button>
                );
              })}
            </div>
          )}

          {/* Bloc actif */}
          {active && svcs[active] && (
            <div className="pl-3 border-l-2 border-primary/30">
              {types.length > 1 && (
                <p className="text-[10px] font-black text-primary mb-2">{activeLabel}</p>
              )}
              {renderBlock(active, svcs[active])}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SectionLockedBanner({ collab, onKick }: { collab: Collab; onKick?: () => void }) {
  const st = COLLAB_STATUS[collab.status ?? "pending"] ?? COLLAB_STATUS.pending;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
      <span className="material-symbols-outlined text-sm text-primary/50 shrink-0">lock</span>
      <p className="text-xs font-extrabold text-slate-600 flex-1 truncate">
        Géré par <span className="text-primary">{collab.userName}</span>
      </p>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${st.cls}`}>{st.label}</span>
      {onKick && (
        <button type="button" onClick={onKick} title="Retirer ce collaborateur"
          className="ml-1 w-5 h-5 rounded-full bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center shrink-0 transition-colors">
          <X size={10} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}

export function InviteButton({ section, onInvite, loading }: { section: CollabSection; onInvite: (s: CollabSection) => void; loading?: boolean }) {
  return (
    <button type="button" onClick={() => onInvite(section)} disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed">
      {loading
        ? <span className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
        : <span className="material-symbols-outlined text-base group-hover:text-primary">person_add</span>
      }
      <span className="text-xs font-extrabold">{loading ? "Sauvegarde en cours…" : "Inviter un collaborateur pour cette section"}</span>
    </button>
  );
}

const COLLAB_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "En attente",  cls: "bg-amber-100 text-amber-700" },
  accepted:  { label: "Accepté",     cls: "bg-primary/10 text-primary" },
  completed: { label: "Complété",    cls: "bg-emerald-100 text-emerald-700" },
  declined:  { label: "Refusé",      cls: "bg-red-100 text-red-600" },
};

function CollabBadge({ collab }: { collab: Collab }) {
  const st = COLLAB_STATUS[collab.status ?? "pending"] ?? COLLAB_STATUS.pending;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-extrabold text-primary">{collab.userName.slice(0,1).toUpperCase()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-slate-700 truncate">{collab.userName}</p>
        <p className="text-[10px] text-slate-400">{collab.userType === "guide" ? "Guide" : "Prestataire"}</p>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${st.cls}`}>{st.label}</span>
    </div>
  );
}


// Pill toggle helper
function PillToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border-2 transition-all cursor-pointer select-none ${
        active
          ? "bg-primary/10 border-primary/40 text-primary"
          : "bg-white border-slate-200 text-slate-600 hover:border-primary/30 hover:bg-primary/5"
      }`}>
      <span className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-all ${active ? "bg-primary border-primary" : "border-slate-300"}`} />
      {label}
    </button>
  );
}

type AutreMode = "guide" | "prestataire";

function AutreServiceFields({ d, u, lockMeta, lockMode, hideMode, prestataireSlot, prestataireSousTypeSlot, guidageSlot, guidageSousTypeSlot, guidageInviteSlot }: {
  d: FormData;
  u: (x: Partial<FormData>) => void;
  lockMeta?: boolean;
  lockMode?: boolean;
  hideMode?: boolean;
  prestataireSlot?: React.ReactNode;
  prestataireSousTypeSlot?: (cat: string) => React.ReactNode | null | undefined;
  guidageSlot?: React.ReactNode;
  guidageSousTypeSlot?: (domaine: string) => React.ReactNode | null | undefined;
  guidageInviteSlot?: React.ReactNode;
}) {
  const mode: AutreMode = (d.autre_service_details._mode as AutreMode) || "guide";

  function setMode(m: AutreMode) {
    u({ autre_service_categorie: "", autre_service_sous_type: "", autre_service_details: { _mode: m } });
  }

  // ── Guide mode ──────────────────────────────────────────────────────────────
  const selectedDomaine   = mode === "guide" ? d.autre_service_categorie : "";
  const selectedExpertise = mode === "guide" ? d.autre_service_sous_type : "";
  const selectedTypes: string[] = d.autre_service_details.types       ?? [];
  const selectedExps: string[]  = d.autre_service_details.experiences  ?? [];
  const selectedMed: string[]   = d.autre_service_details.mediation    ?? [];

  const domaineCfg = selectedDomaine ? DOMAINES[selectedDomaine] : null;
  const cascadeCfg = selectedDomaine ? DOMAIN_CASCADE_CONFIG[selectedDomaine] : null;
  const typesForExpertise: string[] = cascadeCfg && selectedExpertise
    ? (cascadeCfg.typesByExpertise?.[selectedExpertise] ?? cascadeCfg.typesByExpertise["_default"] ?? []) : [];
  const expGroups  = cascadeCfg && selectedTypes.length ? getExperiencesGrouped(cascadeCfg, selectedTypes) : [];
  const medGroups  = cascadeCfg && selectedTypes.length ? getMediationGrouped(cascadeCfg,  selectedTypes) : [];
  const allExpItems = [...new Set(expGroups.flatMap((g) => g.experiences))];
  const allMedItems = [...new Set(medGroups.flatMap((g) => g.mediation))];

  function toggleGuideArr(key: "types" | "experiences" | "mediation", val: string, current: string[]) {
    const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
    u({ autre_service_details: { ...d.autre_service_details, [key]: next } });
  }

  // ── Prestataire mode ────────────────────────────────────────────────────────
  const selectedCat  = mode === "prestataire" ? d.autre_service_categorie : "";
  const selectedSub  = mode === "prestataire" ? d.autre_service_sous_type : "";
  const catCfg       = PROVIDER_SCHEMA.find((c) => c.value === selectedCat) ?? null;
  const subtypeCfg   = selectedSub ? (OFFER_DETAIL_FIELDS[selectedSub] ?? null) : null;

  function setDetailField(key: string, val: any) {
    u({ autre_service_details: { ...d.autre_service_details, [key]: val } });
  }
  function toggleDetailArr(key: string, val: string) {
    const arr: string[] = Array.isArray(d.autre_service_details[key]) ? d.autre_service_details[key] : [];
    const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
    u({ autre_service_details: { ...d.autre_service_details, [key]: next } });
  }

  const CascadeLabel = ({ step, label }: { step: string; label: string }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">{step}</span>
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{label}</p>
    </div>
  );

  return (
    <div className="space-y-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">

      {/* ── Sélecteur de mode ──────────────────────────────────────────────────── */}
      {!hideMode && (
        <div className={`flex gap-2${(lockMeta || lockMode) ? " pointer-events-none select-none opacity-70" : ""}`}>
          {(["guide", "prestataire"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                mode === m
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 bg-white text-slate-500 hover:border-primary/20 hover:bg-primary/5"
              }`}>
              <span className="material-symbols-outlined text-base">{m === "guide" ? "hiking" : "store"}</span>
              {m === "guide" ? "Guidage" : "Service prestataire"}
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODE GUIDE : Domaine → Expertise → Type → Expériences → Matériel
          gastronomie_locale est géré dans la section Repas
      ════════════════════════════════════════════════════════════════════════ */}
      {mode === "guide" && (
        guidageSlot != null ? guidageSlot : (
        <>
          {/* Étape 1 : Domaine (sans gastronomie_locale → géré dans Repas) */}
          <div className={lockMeta ? "pointer-events-none select-none opacity-70" : ""}>
            <CascadeLabel step="1" label="Domaine" />
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DOMAINES).filter(([key]) => key !== "gastronomie_locale").map(([key, dom]) => {
                const active = selectedDomaine === key;
                return (
                  <button key={key} type="button"
                    onClick={() => u({ autre_service_categorie: key, autre_service_sous_type: "", autre_service_details: { _mode: "guide" } })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/20 hover:bg-primary/5"
                    }`}>
                    <span className={`material-symbols-outlined text-lg ${active ? "text-primary" : "text-slate-400"}`}>{dom.icon}</span>
                    <span className="text-xs font-bold leading-tight">{dom.label}</span>
                    {active && <span className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0"><Check size={9} className="text-white" strokeWidth={3} /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Étapes 2-5 : remplacées par guidageSousTypeSlot si domaine sélectionné et slot défini */}
          {(() => {
            if (selectedDomaine && guidageSousTypeSlot != null) {
              const domaineSlotContent = guidageSousTypeSlot(selectedDomaine);
              if (domaineSlotContent != null) return domaineSlotContent;
            }
            return (
              <>
                {/* Étape 2 : Expertise */}
                {domaineCfg && (
                  <div>
                    <CascadeLabel step="2" label="Expertise" />
                    <div className="flex flex-wrap gap-1.5">
                      {domaineCfg.expertises.map((exp) => (
                        <button key={exp} type="button"
                          onClick={() => u({ autre_service_sous_type: exp, autre_service_details: { _mode: "guide", types: [], experiences: [], mediation: [] } })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                            selectedExpertise === exp
                              ? "border-primary bg-primary text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                          }`}>
                          {exp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Étape 3 : Type */}
                {cascadeCfg && selectedExpertise && typesForExpertise.length > 0 && (
                  <div>
                    <CascadeLabel step="3" label={cascadeCfg.labelType} />
                    <div className="flex flex-wrap gap-1.5">
                      {typesForExpertise.map((t) => (
                        <PillToggle key={t} label={t} active={selectedTypes.includes(t)}
                          onClick={() => toggleGuideArr("types", t, selectedTypes)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Étape 4 : Activités & expériences */}
                {cascadeCfg && selectedTypes.length > 0 && allExpItems.length > 0 && (
                  <div>
                    <CascadeLabel step="4" label={cascadeCfg.labelExperiences} />
                    <div className="flex flex-wrap gap-1.5">
                      {allExpItems.map((e) => (
                        <PillToggle key={e} label={e} active={selectedExps.includes(e)}
                          onClick={() => toggleGuideArr("experiences", e, selectedExps)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Étape 5 : Matériel & supports */}
                {cascadeCfg && selectedTypes.length > 0 && allMedItems.length > 0 && (
                  <div>
                    <CascadeLabel step="5" label={cascadeCfg.labelMediation} />
                    <div className="flex flex-wrap gap-1.5">
                      {allMedItems.map((m) => (
                        <PillToggle key={m} label={m} active={selectedMed.includes(m)}
                          onClick={() => toggleGuideArr("mediation", m, selectedMed)} />
                      ))}
                    </div>
                  </div>
                )}

                {domaineCfg && !cascadeCfg && selectedExpertise && (
                  <p className="text-[11px] text-slate-400 italic pl-1">
                    Ce domaine ne dispose pas de types d&apos;activités prédéfinis.
                  </p>
                )}
              </>
            );
          })()}
        {guidageInviteSlot != null && (
          <div className="pt-1 border-t border-slate-200">{guidageInviteSlot}</div>
        )}
        </>
        )
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODE PRESTATAIRE : Catégorie → Sous-type → Champs OFFER_DETAIL_FIELDS
          hebergement, restaurant_terroir, transport_eco, transport → gérés dans leurs sections
      ════════════════════════════════════════════════════════════════════════ */}
      {mode === "prestataire" && (
        prestataireSlot != null ? prestataireSlot : (
        <>
          {/* Étape 1 : Catégorie (sans hebergement, restaurant_terroir, transport_eco, transport) */}
          <div className={lockMeta ? "pointer-events-none select-none opacity-70" : ""}>
            <CascadeLabel step="1" label="Catégorie de service" />
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_SCHEMA.filter((c) => !["hebergement", "restaurant_terroir", "transport_eco", "transport"].includes(c.value)).map((cat) => {
                const active = selectedCat === cat.value;
                return (
                  <button key={cat.value} type="button"
                    onClick={() => u({ autre_service_categorie: cat.value, autre_service_sous_type: "", autre_service_details: { _mode: "prestataire" } })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/20 hover:bg-primary/5"
                    }`}>
                    <span className={`material-symbols-outlined text-lg ${active ? "text-primary" : "text-slate-400"}`}>{cat.icon}</span>
                    <span className="text-xs font-bold leading-tight">{cat.label}</span>
                    {active && <span className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0"><Check size={9} className="text-white" strokeWidth={3} /></span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Étapes 2+3 : sous-type et champs — slot injectée si la catégorie n'appartient pas au prestataire */}
          {selectedCat && (() => {
            const subSlot = prestataireSousTypeSlot?.(selectedCat);
            if (subSlot != null) return subSlot;
            return (
              <>

          {/* Étape 2 : Sous-type */}
          {catCfg && catCfg.subtypes.length > 0 && (
            <div>
              <CascadeLabel step="2" label="Type précis" />
              <div className="flex flex-wrap gap-1.5">
                {catCfg.subtypes.map((st) => (
                  <button key={st.value} type="button"
                    onClick={() => u({ autre_service_sous_type: st.value, autre_service_details: { _mode: "prestataire" } })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                      selectedSub === st.value
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                    }`}>
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Étape 3 : Champs spécifiques du sous-type */}
          {subtypeCfg && (
            <div className="space-y-5">
              {subtypeCfg.sections.map((sec, si) => {
                if (sec.conditionalOn?.field) {
                  const cv = d.autre_service_details[sec.conditionalOn.field];
                  if (sec.conditionalOn.value !== undefined && cv !== sec.conditionalOn.value) return null;
                }
                return (
                  <div key={si} className="space-y-3">
                    <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                      {sec.icon && <span className="material-symbols-outlined text-sm">{sec.icon}</span>}
                      {sec.label}
                    </p>
                    {sec.fields.map((f) => {
                      if (f.conditionalOn?.field) {
                        const cv = d.autre_service_details[f.conditionalOn.field];
                        if (f.conditionalOn.value !== undefined && cv !== f.conditionalOn.value) return null;
                        if (f.conditionalOn.notValue !== undefined && cv === f.conditionalOn.notValue) return null;
                      }
                      const val = d.autre_service_details[f.key] ?? (f.type === "multiselect" ? [] : f.type === "boolean" ? null : "");

                      if (f.type === "boolean") {
                        return (
                          <div key={f.key} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                            <span className="text-sm font-bold text-slate-700">
                              {f.label}{f.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                            <div className="flex gap-2">
                              {([true, false] as const).map((bv) => (
                                <button key={String(bv)} type="button" onClick={() => setDetailField(f.key, bv)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${val === bv ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40 bg-white"}`}>
                                  {bv ? "Oui" : "Non"}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={f.key}>
                          <Field label={f.label} required={f.required}>
                            {f.type === "multiselect" && (f.options ?? []).length > 0 ? (
                              <Chips
                                options={f.options!}
                                selected={Array.isArray(val) ? (val as string[]) : []}
                                onToggle={(v) => toggleDetailArr(f.key, v)}
                              />
                            ) : f.type === "multiselect" ? (
                              <Txt value={Array.isArray(val) ? (val as string[]).join(", ") : ""}
                                onChange={(v) => setDetailField(f.key, v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])}
                                placeholder={f.placeholder ?? "Valeurs séparées par des virgules"} rows={2} />
                            ) : f.type === "select" && (f.options ?? []).length > 0 ? (
                              <select value={val as string} onChange={(e) => setDetailField(f.key, e.target.value)} className={inputCls}>
                                <option value="">— Choisir —</option>
                                {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : f.type === "select" ? (
                              <input type="text" value={val as string}
                                onChange={(e) => setDetailField(f.key, e.target.value)}
                                className={inputCls} placeholder={f.placeholder ?? f.label} />
                            ) : f.type === "textarea" ? (
                              <Txt value={val as string} onChange={(v) => setDetailField(f.key, v)} placeholder={f.placeholder ?? f.label} rows={3} />
                            ) : f.type === "time" ? (
                              <input type="time" value={val as string} onChange={(e) => setDetailField(f.key, e.target.value)} className={inputCls} />
                            ) : f.type === "file" ? (
                              <input type="file" onChange={(e) => setDetailField(f.key, e.target.files?.[0]?.name ?? "")} className={`${inputCls} cursor-pointer`} />
                            ) : f.type === "repeater" ? (
                              <Txt value={typeof val === "string" ? val : ""} onChange={(v) => setDetailField(f.key, v)}
                                placeholder={f.placeholder ?? "Listez les éléments (un par ligne)"} rows={4} />
                            ) : (
                              <input
                                type={f.type === "number" ? "number" : "text"}
                                value={val as string}
                                onChange={(e) => setDetailField(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                                className={inputCls}
                                placeholder={f.placeholder ?? f.label}
                              />
                            )}
                          </Field>
                          {f.dynamicOptions && !(f.options?.length) && (
                            <p className="text-[10px] text-slate-400 mt-1 pl-1">
                              Options issues du profil · <span className="font-mono">{f.dynamicOptions.replace("onboarding.", "")}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
              </>
            );
          })()}
        </>
        )
      )}
    </div>
  );
}

/** Section Repas : toggle Guidage (gastronomie locale) / Service prestataire (restaurant & terroir) */
function RepasFields({ d, u, prestataireSlot, guidageSlot, guidageInviteSlot, lockMode }: { d: FormData; u: (x: Partial<FormData>) => void; prestataireSlot?: React.ReactNode; guidageSlot?: React.ReactNode; guidageInviteSlot?: React.ReactNode; lockMode?: boolean }) {
  type RepasMode = "guide" | "prestataire";
  const mode: RepasMode = (d.restauration_mode as RepasMode) || "guide";

  function setMode(m: RepasMode) {
    u({
      restauration_mode: m,
      restauration_gastro_expertise: "",
      restauration_gastro_details: {},
      restauration_prest_sous_type: "",
      restauration_prest_details: {},
    });
  }

  return (
    <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
      {/* Toggle */}
      <div className={`flex gap-2${lockMode ? " pointer-events-none select-none opacity-70" : ""}`}>
        {(["guide", "prestataire"] as const).map((m) => (
          <button key={m} type="button" onClick={() => !lockMode && setMode(m)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
              mode === m
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 bg-white text-slate-500 hover:border-primary/20 hover:bg-primary/5"
            }`}>
            <span className="material-symbols-outlined text-base">{m === "guide" ? "hiking" : "storefront"}</span>
            {m === "guide" ? "Guidage" : "Service prestataire"}
          </button>
        ))}
      </div>

      {/* Guidage : cascade gastronomie locale */}
      {mode === "guide" && (
        guidageSlot != null ? guidageSlot : (
        <>
        <div className="space-y-3">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">restaurant</span>
            Guidage Gastronomie locale
          </p>
          {(() => {
            const gastroCfg  = DOMAIN_CASCADE_CONFIG["gastronomie_locale"];
            const gastroExps = DOMAINES["gastronomie_locale"]?.expertises ?? [];
            const selectedTypes: string[] = d.restauration_gastro_details.types       ?? [];
            const selectedExps: string[]  = d.restauration_gastro_details.experiences  ?? [];
            const selectedMed: string[]   = d.restauration_gastro_details.mediation    ?? [];
            const typesForExp = gastroCfg && d.restauration_gastro_expertise ? (gastroCfg.typesByExpertise?.[d.restauration_gastro_expertise] ?? gastroCfg.typesByExpertise["_default"] ?? []) : [];
            const expGroups   = gastroCfg && selectedTypes.length ? getExperiencesGrouped(gastroCfg, selectedTypes) : [];
            const medGroups   = gastroCfg && selectedTypes.length ? getMediationGrouped(gastroCfg, selectedTypes)   : [];
            const allExpItems = [...new Set(expGroups.flatMap((g) => g.experiences))];
            const allMedItems = [...new Set(medGroups.flatMap((g) => g.mediation))];

            function toggle(key: "types" | "experiences" | "mediation", val: string, current: string[]) {
              const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
              u({ restauration_gastro_details: { ...d.restauration_gastro_details, [key]: next } });
            }

            return (
              <div className="space-y-3">
                {/* Expertises */}
                <div className="flex flex-wrap gap-1.5">
                  {gastroExps.map((exp) => (
                    <button key={exp} type="button"
                      onClick={() => {
                        u({ restauration_gastro_expertise: d.restauration_gastro_expertise === exp ? "" : exp, restauration_gastro_details: { types: [], experiences: [], mediation: [] } });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                        d.restauration_gastro_expertise === exp ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                      }`}>
                      {exp}
                    </button>
                  ))}
                </div>
                {gastroCfg && d.restauration_gastro_expertise && typesForExp.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelType}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {typesForExp.map((t) => <PillToggle key={t} label={t} active={selectedTypes.includes(t)} onClick={() => toggle("types", t, selectedTypes)} />)}
                    </div>
                  </div>
                )}
                {gastroCfg && selectedTypes.length > 0 && allExpItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelExperiences}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allExpItems.map((e) => <PillToggle key={e} label={e} active={selectedExps.includes(e)} onClick={() => toggle("experiences", e, selectedExps)} />)}
                    </div>
                  </div>
                )}
                {gastroCfg && selectedTypes.length > 0 && allMedItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelMediation}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {allMedItems.map((m) => <PillToggle key={m} label={m} active={selectedMed.includes(m)} onClick={() => toggle("mediation", m, selectedMed)} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        {guidageInviteSlot != null && (
          <div className="pt-1 border-t border-slate-200">{guidageInviteSlot}</div>
        )}
        </>
        )
      )}

      {/* Service prestataire : Restaurant & Terroir */}
      {mode === "prestataire" && (
        prestataireSlot != null ? prestataireSlot : (
          <PrestSubBlock
            title="Restaurant & Terroir" icon="storefront"
            subtypes={RESTAURANT_PREST_SUBTYPES}
            sousType={d.restauration_prest_sous_type}
            details={d.restauration_prest_details}
            onSousType={(v) => u({ restauration_prest_sous_type: v, restauration_prest_details: {} })}
            onDetails={(k, v) => u({ restauration_prest_details: { ...d.restauration_prest_details, [k]: v } })}
          />
        )
      )}
    </div>
  );
}

// ── Listes de sous-types prestataires intégrées dans chaque section ──────────
export const TRANSPORT_ECO_SUBTYPES = PROVIDER_SCHEMA.find((c) => c.value === "transport_eco")?.subtypes ?? [];
export const TRANSPORT_STD_SUBTYPES = PROVIDER_SCHEMA.find((c) => c.value === "transport")?.subtypes ?? [];

export const RESTAURANT_PREST_SUBTYPES = PROVIDER_SCHEMA
  .find((c) => c.value === "restaurant_terroir")?.subtypes ?? [];

export const HEBERGEMENT_PREST_SUBTYPES = PROVIDER_SCHEMA
  .find((c) => c.value === "hebergement")?.subtypes ?? [];

// ── Wrappers exportés pour réutilisation dans le provider ────────────────────

export interface RepasBlockData {
  mode: "guide" | "prestataire";
  gastroExpertise: string;
  gastroDet: Record<string, any>;
  prestSousType: string;
  prestDet: Record<string, any>;
}

export function RepasBlock({ data, onUpdate, prestataireSlot, guidageSlot, guidageInviteSlot, lockMode }: {
  data: RepasBlockData;
  onUpdate: (patch: Partial<RepasBlockData>) => void;
  prestataireSlot?: React.ReactNode;
  guidageSlot?: React.ReactNode;
  guidageInviteSlot?: React.ReactNode;
  lockMode?: boolean;
}) {
  const shimD = {
    restauration_mode: data.mode,
    restauration_gastro_expertise: data.gastroExpertise,
    restauration_gastro_details: data.gastroDet,
    restauration_prest_sous_type: data.prestSousType,
    restauration_prest_details: data.prestDet,
  } as unknown as FormData;

  const shimU = (patch: Partial<FormData>) => {
    const p: Partial<RepasBlockData> = {};
    if (patch.restauration_mode !== undefined)           p.mode            = patch.restauration_mode as "guide" | "prestataire";
    if (patch.restauration_gastro_expertise !== undefined) p.gastroExpertise = patch.restauration_gastro_expertise as string;
    if (patch.restauration_gastro_details !== undefined)   p.gastroDet       = patch.restauration_gastro_details as Record<string, any>;
    if (patch.restauration_prest_sous_type !== undefined)  p.prestSousType   = patch.restauration_prest_sous_type as string;
    if (patch.restauration_prest_details !== undefined)    p.prestDet        = patch.restauration_prest_details as Record<string, any>;
    if (Object.keys(p).length > 0) onUpdate(p);
  };

  return <RepasFields d={shimD} u={shimU} prestataireSlot={prestataireSlot} guidageSlot={guidageSlot} guidageInviteSlot={guidageInviteSlot} lockMode={lockMode} />;
}

export interface AutreServiceBlockData {
  categorie: string;
  sousType: string;
  details: Record<string, any>;
}

export function AutreServiceBlock({ data, onUpdate, prestataireSlot, prestataireSousTypeSlot, guidageSlot, guidageSousTypeSlot, guidageInviteSlot, lockMode, hideMode }: {
  data: AutreServiceBlockData;
  onUpdate: (patch: Partial<AutreServiceBlockData>) => void;
  prestataireSlot?: React.ReactNode;
  prestataireSousTypeSlot?: (cat: string) => React.ReactNode | null | undefined;
  guidageSlot?: React.ReactNode;
  guidageSousTypeSlot?: (domaine: string) => React.ReactNode | null | undefined;
  guidageInviteSlot?: React.ReactNode;
  lockMode?: boolean;
  hideMode?: boolean;
}) {
  const shimD = {
    autre_service_categorie: data.categorie,
    autre_service_sous_type: data.sousType,
    autre_service_details: data.details,
  } as unknown as FormData;

  const shimU = (patch: Partial<FormData>) => {
    const p: Partial<AutreServiceBlockData> = {};
    if (patch.autre_service_categorie !== undefined) p.categorie = patch.autre_service_categorie as string;
    if (patch.autre_service_sous_type !== undefined) p.sousType  = patch.autre_service_sous_type as string;
    if (patch.autre_service_details !== undefined)   p.details   = patch.autre_service_details as Record<string, any>;
    if (Object.keys(p).length > 0) onUpdate(p);
  };

  return <AutreServiceFields d={shimD} u={shimU}
    prestataireSlot={prestataireSlot}
    prestataireSousTypeSlot={prestataireSousTypeSlot}
    guidageSlot={guidageSlot}
    guidageSousTypeSlot={guidageSousTypeSlot}
    guidageInviteSlot={guidageInviteSlot}
    lockMode={lockMode}
    hideMode={hideMode}
  />;
}

/** Bloc prestataire générique : sous-type picker + champs OFFER_DETAIL_FIELDS */
export interface PrestSubBlockMultiMode {
  sousTypes: string[];
  activeType: string;
  detailsMap: Record<string, Record<string, any>>;
  onToggle: (v: string) => void;
  onSetActive: (v: string) => void;
  onDetailsChange: (type: string, k: string, v: any) => void;
}

export function PrestSubBlock({
  title, icon, subtypes, sousType, details, onSousType, onDetails, lockedSousType, multiMode,
}: {
  title: string; icon: string;
  subtypes: Array<{ value: string; label: string }>;
  sousType: string; details: Record<string, any>;
  onSousType: (v: string) => void;
  onDetails: (k: string, v: any) => void;
  lockedSousType?: boolean;
  multiMode?: PrestSubBlockMultiMode;
}) {
  // En mode multi, le type actif et les détails viennent de multiMode
  const effectiveSousType = multiMode ? multiMode.activeType : sousType;
  const effectiveDetails  = multiMode ? (multiMode.detailsMap[multiMode.activeType] ?? {}) : details;
  const cfg = effectiveSousType ? (OFFER_DETAIL_FIELDS[effectiveSousType] ?? null) : null;

  const setField = (k: string, v: any) => {
    if (multiMode) multiMode.onDetailsChange(multiMode.activeType, k, v);
    else onDetails(k, v);
  };
  const toggleField = (k: string, v: string) => {
    const arr: string[] = Array.isArray(effectiveDetails[k]) ? effectiveDetails[k] : [];
    setField(k, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const handlePillClick = (stValue: string) => {
    if (lockedSousType) return;
    if (multiMode) {
      const { sousTypes, activeType, onToggle, onSetActive } = multiMode;
      const isIn = sousTypes.includes(stValue);
      if (!isIn) {
        // Ajouter et activer
        onToggle(stValue);
        onSetActive(stValue);
      } else if (activeType !== stValue) {
        // Déjà sélectionné mais pas actif → activer sans retirer
        onSetActive(stValue);
      } else {
        // Actif → retirer ; si d'autres restent, activer le premier
        onToggle(stValue);
        const remaining = sousTypes.filter((t) => t !== stValue);
        if (remaining.length > 0) onSetActive(remaining[0]);
      }
    } else {
      onSousType(sousType === stValue ? "" : stValue);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-dashed border-slate-200">
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {title}
        {lockedSousType && <span className="material-symbols-outlined text-xs text-slate-400 ml-1">lock</span>}
      </p>

      <div className={`flex flex-wrap gap-1.5${lockedSousType ? " pointer-events-none select-none" : ""}`}>
        {subtypes.map((st) => {
          const isSelected = multiMode ? multiMode.sousTypes.includes(st.value) : sousType === st.value;
          const isActive   = multiMode ? multiMode.activeType === st.value      : sousType === st.value;
          return (
            <button key={st.value} type="button" onClick={() => handlePillClick(st.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                isActive   ? "border-primary bg-primary text-white"
                : isSelected ? "border-primary/60 bg-primary/10 text-primary"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
              }`}>
              {st.label}
            </button>
          );
        })}
      </div>

      {/* Onglets de navigation quand plusieurs types sélectionnés (mode multi uniquement) */}
      {multiMode && multiMode.sousTypes.length > 1 && (
        <div className="flex gap-0 border-b border-slate-200">
          {multiMode.sousTypes.map((st) => {
            const stLabel = subtypes.find((s) => s.value === st)?.label ?? st;
            return (
              <button key={st} type="button" onClick={() => multiMode.onSetActive(st)}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all -mb-px ${
                  multiMode.activeType === st
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-400 hover:text-primary"
                }`}>
                {stLabel}
              </button>
            );
          })}
        </div>
      )}

      {cfg && (
        <div className="space-y-4 pl-1">
          {cfg.sections.map((sec, si) => {
            if (sec.conditionalOn?.field) {
              const cv = effectiveDetails[sec.conditionalOn.field];
              if (sec.conditionalOn.value !== undefined && cv !== sec.conditionalOn.value) return null;
            }
            return (
              <div key={si} className="space-y-3">
                <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                  {sec.icon && <span className="material-symbols-outlined text-sm">{sec.icon}</span>}
                  {sec.label}
                </p>
                {sec.fields.map((f) => {
                  if (f.conditionalOn?.field) {
                    const cv = effectiveDetails[f.conditionalOn.field];
                    if (f.conditionalOn.value !== undefined && cv !== f.conditionalOn.value) return null;
                    if (f.conditionalOn.notValue !== undefined && cv === f.conditionalOn.notValue) return null;
                  }
                  const val = effectiveDetails[f.key] ?? (f.type === "multiselect" ? [] : f.type === "boolean" ? null : "");

                  if (f.type === "boolean") {
                    return (
                      <div key={f.key} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                        <span className="text-sm font-bold text-slate-700">{f.label}{f.required && <span className="text-red-500 ml-1">*</span>}</span>
                        <div className="flex gap-2">
                          {([true, false] as const).map((bv) => (
                            <button key={String(bv)} type="button" onClick={() => setField(f.key, bv)}
                              className={`px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${val === bv ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 bg-white"}`}>
                              {bv ? "Oui" : "Non"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Field key={f.key} label={f.label} required={f.required}>
                      {f.type === "multiselect" && (f.options ?? []).length > 0 ? (
                        <Chips options={f.options!} selected={Array.isArray(val) ? val as string[] : []} onToggle={(v) => toggleField(f.key, v)} />
                      ) : f.type === "multiselect" ? (
                        <Txt value={Array.isArray(val) ? (val as string[]).join(", ") : ""}
                          onChange={(v) => setField(f.key, v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])}
                          placeholder={f.placeholder ?? "Valeurs séparées par des virgules"} rows={2} />
                      ) : f.type === "select" && (f.options ?? []).length > 0 ? (
                        <select value={val as string} onChange={(e) => setField(f.key, e.target.value)} className={inputCls}>
                          <option value="">— Choisir —</option>
                          {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === "select" ? (
                        <input type="text" value={val as string}
                          onChange={(e) => setField(f.key, e.target.value)}
                          className={inputCls} placeholder={f.placeholder ?? f.label} />
                      ) : f.type === "textarea" ? (
                        <Txt value={val as string} onChange={(v) => setField(f.key, v)} placeholder={f.placeholder ?? f.label} rows={3} />
                      ) : f.type === "time" ? (
                        <input type="time" value={val as string} onChange={(e) => setField(f.key, e.target.value)} className={inputCls} />
                      ) : f.type === "repeater" ? (
                        <Txt value={typeof val === "string" ? val : ""} onChange={(v) => setField(f.key, v)} placeholder={f.placeholder ?? "Un élément par ligne"} rows={4} />
                      ) : (
                        <input type={f.type === "number" ? "number" : "text"} value={val as string}
                          onChange={(e) => setField(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)}
                          className={inputCls} placeholder={f.placeholder ?? f.label} />
                      )}
                    </Field>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Bloc guidage gastronomie locale : expertise + cascade type/expériences/matériel */
function GastroGuideBlock({
  expertise, details, onExpertise, onDetails,
}: {
  expertise: string; details: Record<string, any>;
  onExpertise: (v: string) => void;
  onDetails: (d: Record<string, any>) => void;
}) {
  const gastroCfg    = DOMAIN_CASCADE_CONFIG["gastronomie_locale"];
  const gastroExps   = DOMAINES["gastronomie_locale"]?.expertises ?? [];
  const selectedTypes: string[] = details.types       ?? [];
  const selectedExps: string[]  = details.experiences  ?? [];
  const selectedMed: string[]   = details.mediation    ?? [];

  const typesForExp = gastroCfg && expertise ? (gastroCfg.typesByExpertise?.[expertise] ?? gastroCfg.typesByExpertise["_default"] ?? []) : [];
  const expGroups   = gastroCfg && selectedTypes.length ? getExperiencesGrouped(gastroCfg, selectedTypes) : [];
  const medGroups   = gastroCfg && selectedTypes.length ? getMediationGrouped(gastroCfg,  selectedTypes) : [];
  const allExpItems = [...new Set(expGroups.flatMap((g) => g.experiences))];
  const allMedItems = [...new Set(medGroups.flatMap((g) => g.mediation))];

  function toggleArr(key: "types" | "experiences" | "mediation", val: string, current: string[]) {
    const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
    onDetails({ ...details, [key]: next });
  }

  return (
    <div className="space-y-3 pt-3 border-t border-dashed border-slate-200">
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm">restaurant</span>
        Guidage Gastronomie locale
      </p>

      <div className="flex flex-wrap gap-1.5">
        {gastroExps.map((exp) => (
          <button key={exp} type="button"
            onClick={() => { onExpertise(expertise === exp ? "" : exp); onDetails({ types: [], experiences: [], mediation: [] }); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
              expertise === exp ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
            }`}>
            {exp}
          </button>
        ))}
      </div>

      {gastroCfg && expertise && typesForExp.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelType}</p>
          <div className="flex flex-wrap gap-1.5">
            {typesForExp.map((t) => (
              <PillToggle key={t} label={t} active={selectedTypes.includes(t)} onClick={() => toggleArr("types", t, selectedTypes)} />
            ))}
          </div>
        </div>
      )}

      {gastroCfg && selectedTypes.length > 0 && allExpItems.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelExperiences}</p>
          <div className="flex flex-wrap gap-1.5">
            {allExpItems.map((e) => (
              <PillToggle key={e} label={e} active={selectedExps.includes(e)} onClick={() => toggleArr("experiences", e, selectedExps)} />
            ))}
          </div>
        </div>
      )}

      {gastroCfg && selectedTypes.length > 0 && allMedItems.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelMediation}</p>
          <div className="flex flex-wrap gap-1.5">
            {allMedItems.map((m) => (
              <PillToggle key={m} label={m} active={selectedMed.includes(m)} onClick={() => toggleArr("mediation", m, selectedMed)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Step5({ d, u, collaborations, onInvite, onKickCollab, savingDraft, collabSectionOnly }: { d: FormData; u: (x: Partial<FormData>) => void; collaborations: Collab[]; onInvite: (s: CollabSection) => void; onKickCollab?: (collabId: string) => void; savingDraft?: boolean; collabSectionOnly?: string }) {
  const tp = d.type_prestation;
  const isSurMesure = tp === "sur_mesure";
  const togArr = (field: keyof FormData, v: string) => {
    const arr = (d[field] as string[]) ?? [];
    u({ [field]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] } as any);
  };
  const servicesPool = [...new Set([...(SERVICES_DEFAUT[d.domaine] ?? []), ...EQUIP_SECURITE, ...EQUIP_CONFORT])];

  // Visibilité des sections : basée sur le type d'offre uniquement (indép. de collabSectionOnly)
  const showTransport   = tp !== null && ["avec_transport", "transport_repas", "immersion", "sur_mesure"].includes(tp);
  const showRepas       = tp !== null && ["transport_repas", "immersion", "sur_mesure"].includes(tp);
  const showHebergement = tp !== null && ["immersion", "sur_mesure"].includes(tp);
  const showAutreService = isSurMesure;

  // Vue collab : sections étrangères visibles mais verrouillées (pointer-events-none)
  const lockTransport    = !!collabSectionOnly && collabSectionOnly !== "transport";
  const lockRepas        = !!collabSectionOnly && collabSectionOnly !== "restauration";
  const lockHebergement  = !!collabSectionOnly && collabSectionOnly !== "hebergement";
  const lockAutreService = !!collabSectionOnly && collabSectionOnly !== "autre_service";

  // Collab actif (non-refusé) pour chaque section → verrouille la section pour le propriétaire
  const activeCollab = (s: CollabSection) =>
    collaborations.find((c) => c.section === s && c.status !== "declined") ?? null;
  const transportCollab    = activeCollab("transport");
  const restaurationCollab = activeCollab("restauration");
  const hebergementCollab  = activeCollab("hebergement");
  const autreServiceCollab = activeCollab("autre_service");

  const prestationLabel = tp ? TYPE_PRESTATION_OFFRE.find((o) => o.value === tp)?.label : null;

  // Bloc "invitation obligatoire" : le guide ne remplit pas les sections prestataires lui-même
  function InviteRequired({ section, icon, message }: { section: CollabSection; icon: string; message: string }) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">{icon}</span>
          <p className="text-xs font-semibold text-amber-700">{message}</p>
        </div>
        <InviteButton section={section} onInvite={onInvite} loading={savingDraft} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {prestationLabel && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-[10px] font-black text-slate-400 uppercase">Prestation :</span>
          <span className="px-2.5 py-1 bg-primary/10 rounded-full text-[10px] font-extrabold text-primary">{prestationLabel}</span>
        </div>
      )}

      {/* Transport */}
      {showTransport && (
        <div className={lockTransport ? "space-y-3 pointer-events-none select-none opacity-60" : "space-y-3"}>
          {isSurMesure && (
            <Bool label="Transport inclus dans cette offre" icon="directions_car"
              value={d.transport_inclus}
              onChange={(v) => {
                if (!v && transportCollab?.id) onKickCollab?.(transportCollab.id);
                u({ transport_inclus: v, transport_types: v ? d.transport_types : [], transport_active: "", transport_svcs: v ? d.transport_svcs : {} });
              }} />
          )}
          {(!isSurMesure || d.transport_inclus === true) && (() => {
            const toggleType = (v: string) => {
              const next = d.transport_types.includes(v)
                ? d.transport_types.filter((x) => x !== v)
                : [...d.transport_types, v];
              u({ transport_types: next });
            };
            const TransportPills = ({ active }: { active: boolean }) => (
              <div className="space-y-3">
                {([
                  { title: "Transport Éco", icon: "electric_bike", items: TRANSPORT_ECO_SUBTYPES },
                  { title: "Transport", icon: "directions_car", items: TRANSPORT_STD_SUBTYPES },
                ] as const).map(({ title, icon, items }) => (
                  <div key={title}>
                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                      {title}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((st) => (
                        <button key={st.value} type="button"
                          onClick={() => active && toggleType(st.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                            d.transport_types.includes(st.value)
                              ? "border-primary bg-primary text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                          }`}>
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );

            if (collabSectionOnly === "transport") {
              // Filtrer aux sous-types choisis par le guide ; fallback sur tout si transport_types est vide/corrompu
              const ecoFiltered = TRANSPORT_ECO_SUBTYPES.filter((st) => d.transport_types.includes(st.value));
              const stdFiltered = TRANSPORT_STD_SUBTYPES.filter((st) => d.transport_types.includes(st.value));
              const ecoList = ecoFiltered.length > 0 ? ecoFiltered : TRANSPORT_ECO_SUBTYPES;
              const stdList = stdFiltered.length > 0 ? stdFiltered : TRANSPORT_STD_SUBTYPES;
              return (
                <div className="space-y-3">
                  <PrestSubBlock
                    title="Transport Éco" icon="electric_bike"
                    subtypes={ecoList}
                    sousType={d.transport_eco_sous_type || (ecoList.length >= 1 ? ecoList[0].value : "")}
                    details={d.transport_eco_details}
                    onSousType={(v) => u({ transport_eco_sous_type: v })}
                    onDetails={(k, v) => u({ transport_eco_details: { ...d.transport_eco_details, [k]: v } })}
                    lockedSousType={true}
                  />
                  <PrestSubBlock
                    title="Transport" icon="directions_car"
                    subtypes={stdList}
                    sousType={d.transport_std_sous_type || (stdList.length >= 1 ? stdList[0].value : "")}
                    details={d.transport_std_details}
                    onSousType={(v) => u({ transport_std_sous_type: v })}
                    onDetails={(k, v) => u({ transport_std_details: { ...d.transport_std_details, [k]: v } })}
                    lockedSousType={true}
                  />
                </div>
              );
            }
            if (lockTransport) return <TransportPills active={false} />;
            if (transportCollab) return (
              <div className="space-y-2">
                <SectionLockedBanner collab={transportCollab} onKick={transportCollab.id ? () => onKickCollab?.(transportCollab.id!) : undefined} />
                <div className="pointer-events-none select-none opacity-70">
                  <TransportPills active={false} />
                </div>
              </div>
            );
            return (
              <div className="space-y-3">
                <TransportPills active={true} />
                {d.transport_types.length > 0
                  ? <InviteRequired section="transport" icon="directions_car"
                      message="Le transport doit être assuré par un prestataire de transport — invitez-en un ci-dessous." />
                  : <p className="text-xs font-semibold text-slate-400 text-center py-2">Sélectionnez au moins un type de transport avant d'inviter un collaborateur.</p>
                }
              </div>
            );
          })()}
        </div>
      )}

      {/* Restauration */}
      {showRepas && (
        <div className={lockRepas ? "space-y-3 pointer-events-none select-none opacity-60" : "space-y-3"}>
          {isSurMesure && (
            <Bool label="Repas inclus dans cette offre" icon="restaurant"
              value={d.repas_flag}
              onChange={(v) => {
                if (!v && restaurationCollab?.id) onKickCollab?.(restaurationCollab.id);
                u({ repas_flag: v, restauration_types: v ? d.restauration_types : [], restauration_active: "", restauration_svcs: v ? d.restauration_svcs : {} });
              }} />
          )}
          {(!isSurMesure || d.repas_flag === true) && (
            lockRepas ? (
              <RepasFields d={d} u={() => {}} />
            ) : restaurationCollab ? (
              <div className="space-y-2">
                <SectionLockedBanner collab={restaurationCollab} onKick={restaurationCollab.id ? () => onKickCollab?.(restaurationCollab.id!) : undefined} />
                <div className="pointer-events-none select-none opacity-70">
                  <RepasFields d={d} u={() => {}} />
                </div>
              </div>
            ) : (() => {
              const isCollabRepas = collabSectionOnly === "restauration";
              const gastroCfg = DOMAIN_CASCADE_CONFIG["gastronomie_locale"];
              const gastroExpertise = d.restauration_gastro_expertise;
              const gastroTypes: string[]  = d.restauration_gastro_details?.types        ?? [];
              const gastroExps: string[]   = d.restauration_gastro_details?.experiences  ?? [];
              const gastroMed: string[]    = d.restauration_gastro_details?.mediation     ?? [];
              const typesForExp = gastroCfg && gastroExpertise ? (gastroCfg.typesByExpertise?.[gastroExpertise] ?? gastroCfg.typesByExpertise["_default"] ?? []) : [];
              const expGroups   = gastroCfg && gastroTypes.length ? getExperiencesGrouped(gastroCfg, gastroTypes) : [];
              const medGroups   = gastroCfg && gastroTypes.length ? getMediationGrouped(gastroCfg, gastroTypes)   : [];
              const allExpItems = [...new Set(expGroups.flatMap((g) => g.experiences))];
              const allMedItems = [...new Set(medGroups.flatMap((g) => g.mediation))];
              function toggleGastro(key: "types"|"experiences"|"mediation", val: string, current: string[]) {
                const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
                u({ restauration_gastro_details: { ...d.restauration_gastro_details, [key]: next } });
              }
              const collabGuidageSlot = isCollabRepas ? (
                <div className="space-y-3">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">restaurant</span>
                    Guidage Gastronomie locale
                  </p>
                  {gastroExpertise && (
                    <div className="flex flex-wrap items-center gap-2 pointer-events-none">
                      <span className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-primary bg-primary text-white opacity-70">{gastroExpertise}</span>
                      <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">lock</span>Définie par le propriétaire
                      </span>
                    </div>
                  )}
                  {gastroCfg && gastroExpertise && typesForExp.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelType}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {typesForExp.map((t) => <PillToggle key={t} label={t} active={gastroTypes.includes(t)} onClick={() => toggleGastro("types", t, gastroTypes)} />)}
                      </div>
                    </div>
                  )}
                  {gastroCfg && gastroTypes.length > 0 && allExpItems.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelExperiences}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allExpItems.map((e) => <PillToggle key={e} label={e} active={gastroExps.includes(e)} onClick={() => toggleGastro("experiences", e, gastroExps)} />)}
                      </div>
                    </div>
                  )}
                  {gastroCfg && gastroTypes.length > 0 && allMedItems.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{gastroCfg.labelMediation}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allMedItems.map((m) => <PillToggle key={m} label={m} active={gastroMed.includes(m)} onClick={() => toggleGastro("mediation", m, gastroMed)} />)}
                      </div>
                    </div>
                  )}
                </div>
              ) : undefined;
              return (
                <RepasFields d={d} u={u}
                  lockMode={isCollabRepas}
                  guidageSlot={collabGuidageSlot}
                  guidageInviteSlot={
                    gastroExpertise
                      ? <InviteButton section="restauration" onInvite={onInvite} loading={savingDraft} />
                      : <p className="text-xs font-semibold text-slate-400 text-center py-2">Sélectionnez d'abord une expertise de guidage avant d'inviter un collaborateur.</p>
                  }
                  prestataireSlot={
                    <div className="space-y-3 pt-3 border-t border-dashed border-slate-200">
                      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">storefront</span>
                        Restaurant &amp; Terroir
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {RESTAURANT_PREST_SUBTYPES.map((st) => (
                          <button key={st.value} type="button"
                            onClick={() => u({ restauration_prest_sous_type: d.restauration_prest_sous_type === st.value ? "" : st.value })}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                              d.restauration_prest_sous_type === st.value
                                ? "border-primary bg-primary text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                            }`}>
                            {st.label}
                          </button>
                        ))}
                      </div>
                      {d.restauration_prest_sous_type
                        ? <InviteRequired section="restauration" icon="restaurant"
                            message="La restauration sera assurée par un prestataire — invitez-en un ci-dessous." />
                        : <p className="text-xs font-semibold text-slate-400 text-center py-2">Sélectionnez un type de restaurant avant d'inviter un collaborateur.</p>
                      }
                    </div>
                  }
                />
              );
            })()
          )}
        </div>
      )}

      {/* Hébergement */}
      {showHebergement && (
        <div className={lockHebergement ? "space-y-3 pointer-events-none select-none opacity-60" : "space-y-3"}>
          {isSurMesure && (
            <Bool label="Hébergement inclus dans cette offre" icon="hotel"
              value={d.hebergement_inclus}
              onChange={(v) => {
                if (!v && hebergementCollab?.id) onKickCollab?.(hebergementCollab.id);
                u({ hebergement_inclus: v, hebergement_types: v ? d.hebergement_types : [], hebergement_active: "", hebergement_svcs: v ? d.hebergement_svcs : {} });
              }} />
          )}
          {(!isSurMesure || d.hebergement_inclus === true) && (() => {
            const toggleHeberg = (v: string) => {
              const next = d.hebergement_types.includes(v)
                ? d.hebergement_types.filter((x) => x !== v)
                : [...d.hebergement_types, v];
              u({ hebergement_types: next });
            };
            const HebergPills = ({ active }: { active: boolean }) => (
              <div>
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-sm">hotel</span>
                  Type d&apos;hébergement
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GUIDE_HEBERGEMENT_TYPES.map((t) => (
                    <button key={t.value} type="button"
                      onClick={() => active && toggleHeberg(t.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                        d.hebergement_types.includes(t.value)
                          ? "border-primary bg-primary text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
            if (collabSectionOnly === "hebergement") {
              // Collab hébergement : types fixés par le guide (lecture seule), collab remplit les détails
              const selectedTypes = d.hebergement_types;
              const activeType = d.hebergement_active || selectedTypes[0] || "";
              return (
                <div className="space-y-3">
                  {/* Types en lecture seule — seuls ceux du guide sont disponibles */}
                  <div>
                    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5 mb-1.5">
                      <span className="material-symbols-outlined text-sm">hotel</span>
                      Type d&apos;hébergement
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {GUIDE_HEBERGEMENT_TYPES.map((t) => {
                        const isSelected = selectedTypes.includes(t.value);
                        const isActive = activeType === t.value;
                        return (
                          <button key={t.value} type="button"
                            disabled={!isSelected}
                            onClick={() => isSelected && u({ hebergement_active: t.value, hebergement_svcs: { ...d.hebergement_svcs, [t.value]: d.hebergement_svcs[t.value] ?? { ...EMPTY_HEBERG } } })}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                              !isSelected
                                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                : isActive
                                  ? "border-primary bg-primary text-white"
                                  : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                            }`}>
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Champs de détails pour le type actif */}
                  {activeType && selectedTypes.includes(activeType) && (
                    <HebergBlock
                      subtype={activeType}
                      value={d.hebergement_svcs[activeType] ?? { ...EMPTY_HEBERG }}
                      onChange={(s) => u({ hebergement_svcs: { ...d.hebergement_svcs, [activeType]: s } })}
                    />
                  )}
                  {selectedTypes.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Le propriétaire n&apos;a pas encore choisi de type d&apos;hébergement.</p>
                  )}
                </div>
              );
            }
            if (lockHebergement) return <HebergPills active={false} />;
            if (hebergementCollab) return (
              <div className="space-y-2">
                <SectionLockedBanner collab={hebergementCollab} onKick={hebergementCollab.id ? () => onKickCollab?.(hebergementCollab.id!) : undefined} />
                <div className="pointer-events-none select-none opacity-70">
                  <HebergPills active={false} />
                </div>
              </div>
            );
            return (
              <div className="space-y-3">
                <HebergPills active={true} />
                {d.hebergement_types.length > 0
                  ? <InviteRequired section="hebergement" icon="hotel"
                      message="L'hébergement doit être assuré par un prestataire d'hébergement — invitez-en un ci-dessous." />
                  : <p className="text-xs font-semibold text-slate-400 text-center py-2">Sélectionnez au moins un type d'hébergement avant d'inviter un collaborateur.</p>
                }
              </div>
            );
          })()}
        </div>
      )}

      {/* Autre service */}
      {showAutreService && (
        <div className={lockAutreService ? "space-y-3 pointer-events-none select-none opacity-60" : "space-y-3"}>
          <Bool
            label="Autre service inclus dans cette offre"
            icon="add_circle"
            value={d.autre_service_inclus}
            onChange={(v) => {
              if (!v && autreServiceCollab?.id) onKickCollab?.(autreServiceCollab.id);
              u({ autre_service_inclus: v, autre_service_categorie: "", autre_service_sous_type: "", autre_service_details: {} });
            }}
          />
          {d.autre_service_inclus === true && (
            lockAutreService ? (
              <AutreServiceFields d={d} u={() => {}} lockMeta={true} />
            ) : autreServiceCollab ? (() => {
              const autreMode = (d.autre_service_details._mode as string) || "guide";
              const domaineManquant = autreMode === "guide" && !d.autre_service_categorie;
              return (
                <div className="space-y-2">
                  <SectionLockedBanner collab={autreServiceCollab} onKick={autreServiceCollab.id ? () => onKickCollab?.(autreServiceCollab.id!) : undefined} />
                  {domaineManquant ? (
                    <AutreServiceFields d={d} u={u} lockMode={true} />
                  ) : (
                    <div className="pointer-events-none select-none opacity-70">
                      <AutreServiceFields d={d} u={() => {}} />
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="space-y-3">
                <AutreServiceFields d={d} u={u}
                  lockMode={collabSectionOnly === "autre_service"}
                  lockMeta={collabSectionOnly === "autre_service"}
                  guidageSousTypeSlot={collabSectionOnly === "autre_service" ? (domaine) => {
                    const domCfg = DOMAINES[domaine];
                    const cascadeCfg = DOMAIN_CASCADE_CONFIG[domaine];
                    const lockedExp = d.autre_service_sous_type;
                    if (!domCfg) return null;
                    const selTypes: string[]  = (d.autre_service_details as any)?.types        ?? [];
                    const selExps: string[]   = (d.autre_service_details as any)?.experiences  ?? [];
                    const selMed: string[]    = (d.autre_service_details as any)?.mediation     ?? [];
                    const typesForExp = cascadeCfg && lockedExp ? (cascadeCfg.typesByExpertise?.[lockedExp] ?? cascadeCfg.typesByExpertise["_default"] ?? []) : [];
                    const expGroups   = cascadeCfg && selTypes.length ? getExperiencesGrouped(cascadeCfg, selTypes) : [];
                    const medGroups   = cascadeCfg && selTypes.length ? getMediationGrouped(cascadeCfg, selTypes)   : [];
                    const allExpItems = [...new Set(expGroups.flatMap((g) => g.experiences))];
                    const allMedItems = [...new Set(medGroups.flatMap((g) => g.mediation))];
                    function toggleAutreCollab(key: "types"|"experiences"|"mediation", val: string, current: string[]) {
                      const next = current.includes(val) ? current.filter((x) => x !== val) : [...current, val];
                      u({ autre_service_details: { ...(d.autre_service_details as any), [key]: next } });
                    }
                    return (
                      <div className="space-y-3">
                        {/* Expertise verrouillée */}
                        <div className="flex flex-wrap items-center gap-2 pointer-events-none">
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-primary bg-primary text-white opacity-70">{lockedExp || domCfg.label}</span>
                          <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">lock</span>Défini par le propriétaire
                          </span>
                        </div>
                        {/* Cascade éditable par le collaborateur */}
                        {cascadeCfg && lockedExp && typesForExp.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{cascadeCfg.labelType}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {typesForExp.map((t) => <PillToggle key={t} label={t} active={selTypes.includes(t)} onClick={() => toggleAutreCollab("types", t, selTypes)} />)}
                            </div>
                          </div>
                        )}
                        {cascadeCfg && selTypes.length > 0 && allExpItems.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{cascadeCfg.labelExperiences}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {allExpItems.map((e) => <PillToggle key={e} label={e} active={selExps.includes(e)} onClick={() => toggleAutreCollab("experiences", e, selExps)} />)}
                            </div>
                          </div>
                        )}
                        {cascadeCfg && selTypes.length > 0 && allMedItems.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">{cascadeCfg.labelMediation}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {allMedItems.map((m) => <PillToggle key={m} label={m} active={selMed.includes(m)} onClick={() => toggleAutreCollab("mediation", m, selMed)} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } : undefined}
                  guidageInviteSlot={
                    (d.autre_service_categorie && d.autre_service_sous_type)
                      ? <InviteButton section="autre_service" onInvite={onInvite} loading={savingDraft} />
                      : <p className="text-xs font-semibold text-slate-400 text-center py-2">Sélectionnez d'abord un domaine et une expertise avant d'inviter un collaborateur.</p>
                  }
                  prestataireSousTypeSlot={(cat) => {
                    const cfg = PROVIDER_SCHEMA.find((c) => c.value === cat) ?? null;
                    if (!cfg || cfg.subtypes.length === 0) return undefined;
                    return (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                          Type précis
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {cfg.subtypes.map((st) => (
                            <button key={st.value} type="button"
                              onClick={() => u({ autre_service_sous_type: d.autre_service_sous_type === st.value ? "" : st.value })}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                                d.autre_service_sous_type === st.value
                                  ? "border-primary bg-primary text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                              }`}>
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                {(d.autre_service_details as Record<string, unknown>)._mode === "prestataire" && d.autre_service_categorie && (
                  d.autre_service_sous_type
                    ? <InviteButton section="autre_service" onInvite={onInvite} loading={savingDraft} />
                    : <p className="text-xs font-semibold text-slate-400 text-center py-2">Sélectionnez d'abord un type précis avant d'inviter un collaborateur.</p>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Guidage seul */}
      {!showTransport && !showRepas && !showHebergement && !!tp && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="material-symbols-outlined text-primary text-xl">explore</span>
          <p className="text-xs font-bold text-slate-700">
            Guidage seul — aucun service transport, repas ou hébergement à renseigner.
          </p>
        </div>
      )}

      {/* Services inclus / À apporter / Non inclus — verrouillés en vue collab (champs du guide) */}
      <div className={collabSectionOnly ? "space-y-3 pointer-events-none select-none opacity-60" : "space-y-3"}>
        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Services inclus</p>
        {servicesPool.length > 0 ? (
          <Chips options={servicesPool} selected={d.services_inclus}
            onToggle={(v) => togArr("services_inclus", v)} />
        ) : (
          <p className="text-xs text-slate-400 italic">Sélectionnez un domaine à l'étape 1 pour voir les services.</p>
        )}
      </div>

      <div className={collabSectionOnly ? "pointer-events-none select-none opacity-60" : ""}>
        <Field label="À apporter par le participant" required>
          <Txt value={d.equipement_a_apporter} onChange={(v) => u({ equipement_a_apporter: v })} rows={4}
            placeholder="Chaussures de randonnée, vêtements chauds, gourde…" />
        </Field>
      </div>

      <div className={collabSectionOnly ? "pointer-events-none select-none opacity-60" : ""}>
        <Field label="Non inclus (à prévoir par le participant)">
          <Txt value={d.non_inclus} onChange={(v) => u({ non_inclus: v })} rows={2}
            placeholder="Assurance voyage personnelle, pourboire…" />
        </Field>
      </div>
    </div>
  );
}

const SECTION_LABEL_STEP6: Record<string, string> = {
  hebergement: "Hébergement", restauration: "Restauration",
  transport: "Transport", guide: "Guidage", autre: "Autre",
};

type CollabConflict = { userName: string; section: string; conflictSlot: string; conflictDays: string[]; conflictTimeSlots?: Record<string, { start: string; end: string }[]> | null };

function Step6({ d, u, token, editOfferTitle, editOfferId, onCollabConflictsChange }: {
  d: FormData; u: (x: Partial<FormData>) => void; token: string;
  editOfferTitle?: string; editOfferId?: string;
  onCollabConflictsChange?: (conflicts: CollabConflict[]) => void;
}) {
  const [collabConflicts, setCollabConflicts] = useState<CollabConflict[]>([]);
  const [checkingCollabs, setCheckingCollabs] = useState(false);

  const availKey = JSON.stringify(d.avail);
  useEffect(() => {
    if (!editOfferId || !d.avail.type) {
      setCollabConflicts([]);
      onCollabConflictsChange?.([]);
      return;
    }
    setCheckingCollabs(true);
    const timer = setTimeout(async () => {
      try {
        const result = await apiFetch<CollabConflict[]>(`/guide/offers/${editOfferId}/collab-conflicts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ disponibilite: d.avail }),
        });
        const conflicts = Array.isArray(result) ? result : [];
        setCollabConflicts(conflicts);
        onCollabConflictsChange?.(conflicts);
      } catch {
        setCollabConflicts([]);
        onCollabConflictsChange?.([]);
      }
      finally { setCheckingCollabs(false); }
    }, 700);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availKey, editOfferId, token]);

  return (
    <div className="space-y-4">
      <OfferAvailPicker value={d.avail} onChange={(v) => u({ avail: v })} />
      {d.avail.type && (
        <AvailabilitySyncPanel
          avail={d.avail}
          token={token}
          editOfferTitle={editOfferTitle}
          onConflictChange={(v) => u({ avail_has_conflict: v })}
        />
      )}
      {editOfferId && d.avail.type && (
        checkingCollabs ? (
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-slate-500 font-medium">Vérification de l&apos;agenda des collaborateurs…</p>
          </div>
        ) : collabConflicts.length > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-amber-500 text-base shrink-0">event_busy</span>
              <p className="text-xs font-extrabold text-amber-800">
                {collabConflicts.length} collaborateur{collabConflicts.length > 1 ? "s ont" : " a"} un conflit avec ces nouvelles dates
              </p>
            </div>
            {collabConflicts.map((c, i) => (
              <div key={i} className="pl-6 space-y-1">
                <p className="text-xs text-amber-700 font-semibold">
                  {c.userName} <span className="font-normal text-amber-600">({SECTION_LABEL_STEP6[c.section] ?? c.section})</span>
                  {" — "}
                  <span className="italic">&ldquo;{c.conflictSlot}&rdquo;</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {c.conflictDays.map((day) => (
                    <span key={day} className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-bold">{day}</span>
                  ))}
                  {c.conflictTimeSlots && [...new Map(
                    Object.values(c.conflictTimeSlots).flat()
                      .map((ts) => [`${ts.start}-${ts.end}`, ts])
                  ).values()].map((ts, ti) => (
                    <span key={`cts-${ti}`} className="text-[10px] bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 font-bold">
                      {ts.start}–{ts.end}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p className="pl-6 text-[10px] text-amber-500 pt-1.5 border-t border-amber-200">
              Vous pouvez continuer — le(s) collaborateur(s) seront notifiés du conflit lors de l&apos;enregistrement.
            </p>
          </div>
        ) : null
      )}
    </div>
  );
}

function Step7({ d, u }: { d: FormData; u: (x: Partial<FormData>) => void }) {
  return <PricingBlock value={d.pricing} onChange={(v) => u({ pricing: { ...d.pricing, ...v } })} />;
}

function Step8({ d, u, collaborations }: { d: FormData; u: (x: Partial<FormData>) => void; collaborations?: Collab[] }) {
  const suggest = async () => {
    const activeCollabs = (collaborations ?? []).filter((c) => c.status !== "declined");
    const res = await fetch('/api/offers/suggest-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: d.titre,
        description: d.description_courte,
        contexte: {
          domaine_guide:    d.domaine ?? "",
          expertises_guide: Array.isArray(d.expertises) ? d.expertises : [],
          sections_collab:  activeCollabs.map((c) => ({
            section:    c.section,
            domaine:    c.sectionContext?.domaine,
            expertises: c.sectionContext?.expertises,
            categorie:  c.sectionContext?.categorie,
            sous_types: c.sectionContext?.sous_types,
          })),
        },
      }),
    });
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json() as { tags?: unknown };
    if (!Array.isArray(data.tags)) throw new Error('invalid response');
    return data.tags as string[];
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-0.5">Tags thématiques</p>
          <p className="text-xs text-slate-500">Facultatif — aide à classer et retrouver votre offre.</p>
        </div>
        <TaxonomyTagPicker value={d.tags} onChange={(tags) => u({ tags })} onSuggest={suggest} />
      </div>
      <ConfirmationTypePicker value={d.confirmation} onChange={(v) => u({ confirmation: { ...d.confirmation, ...v } })} />
    </div>
  );
}

// ── Lecture seule — toutes les étapes pour collaborateur ─────────────────────

export { offerToFormData };
export type { FormData as GuideOfferFormData };

export const OFFER_STEPS = STEPS;

type CollabEditSection = {
  name: string;                          // "restauration" | "transport" | "hebergement"
  types: string[];                       // types CHOISIS par le collaborateur
  svcs: Record<string, any>;             // détails remplis par le collaborateur
  active: string;                        // onglet actif dans MultiTypeSection
  formData?: Partial<FormData>;          // champs libres (ex: restauration_gastro_*, mode…)
  onUpdate: (patch: {
    types?: string[];
    svcs?: Record<string, any>;
    active?: string;
    formData?: Partial<FormData>;
  }) => void;
};

export function GuideOfferReadOnlySteps({
  data,
  step,
  collabSection,
  locked = false,
}: {
  data: FormData;
  step: number;
  collabSection?: CollabEditSection;
  locked?: boolean;
}) {
  const profile: GuideProfile = {
    domaines: data.domaine ? [data.domaine] : [],
    expertises: data.expertises,
    zones_couvertes: [],
    publics_accueillis: [],
    languages_spoken: data.langue_guidage,
  };
  const noop = (_: Partial<FormData>) => {};

  // Pré-remplir les svcs pour que les sous-blocs (SimpleServiceBlock, HebergBlock) s'affichent
  const filledData: FormData = {
    ...data,
    transport_svcs: Object.fromEntries(
      data.transport_types.map((t) => [t, data.transport_svcs[t] ?? { ...EMPTY_SIMPLE_SERVICE }])
    ),
    restauration_svcs: Object.fromEntries(
      data.restauration_types.map((t) => [t, data.restauration_svcs[t] ?? { ...EMPTY_SIMPLE_SERVICE }])
    ),
    hebergement_svcs: Object.fromEntries(
      data.hebergement_types.map((t) => [t, data.hebergement_svcs[t] ?? { ...EMPTY_HEBERG }])
    ),
  };

  // Pour l'étape 6 collab : le collaborateur choisit SES propres types et remplit SES svcs
  const step6Data: FormData = (() => {
    if (!collabSection) return filledData;
    const { name, types, svcs, active, formData: extraFormData } = collabSection;
    const svcsKey  = `${name}_svcs`   as keyof FormData;
    const activeKey = `${name}_active` as keyof FormData;
    const typesKey  = `${name}_types`  as keyof FormData;
    // Svcs fusionnés : données du collab en priorité, fallback selon la section
    // Pour hébergement : utiliser les types du propriétaire (pas svcTypes qui est vide)
    const emptySvc = name === 'hebergement' ? { ...EMPTY_HEBERG } : { ...EMPTY_SIMPLE_SERVICE };
    const mergedKeys = name === 'hebergement' ? filledData.hebergement_types : types;
    const mergedSvcs = Object.fromEntries(
      mergedKeys.map((t) => [t, svcs[t] ?? emptySvc])
    );
    return {
      ...filledData,
      // Transport et hébergement : garder les types du propriétaire (filtre/disponibilité).
      // Pour les autres sections : types = sélection du collaborateur.
      ...(name !== 'transport' && name !== 'hebergement' ? { [typesKey]: types } : {}),
      [svcsKey]:   mergedSvcs,
      [activeKey]: active || (name === 'hebergement' ? filledData.hebergement_types[0] : types[0]) || "",
      ...(extraFormData ?? {}),                        // champs libres restaurés (mode, gastro…)
    };
  })();

  // Fonction u filtrée pour l'étape 6 collab :
  // - Autorise : types/svcs/active pour la section, + tous les autres champs section-spécifiques (mode, gastro…)
  // - Bloque   : toggles Bool (Repas inclus / Transport inclus / Hébergement inclus) = décision du guide
  const step6U = collabSection
    ? (patch: Partial<FormData>) => {
        const { name } = collabSection;
        // Bloquer les toggles Bool (verrouillés - choix du guide)
        if ((patch as any).repas_flag !== undefined)           return;
        if ((patch as any).transport_inclus !== undefined)     return;
        if ((patch as any).hebergement_inclus !== undefined)   return;
        if ((patch as any).autre_service_inclus !== undefined) return;
        // Bloquer les champs globaux de l'offre (gérés par le guide seul)
        if ((patch as any).services_inclus !== undefined)       return;
        if ((patch as any).equipement_a_apporter !== undefined) return;
        if ((patch as any).non_inclus !== undefined)            return;
        // Pour autre_service : bloquer le mode et le domaine (choix du guide)
        if (name === 'autre_service' && (patch as any).autre_service_categorie !== undefined) return;

        const typesKey  = `${name}_types`  as keyof FormData;
        const activeKey = `${name}_active` as keyof FormData;
        const svcsKey   = `${name}_svcs`   as keyof FormData;

        const update: { types?: string[]; svcs?: Record<string, any>; active?: string; formData?: Partial<FormData> } = {};
        if (patch[typesKey]  !== undefined) update.types  = patch[typesKey]  as string[];
        if (patch[activeKey] !== undefined) update.active = patch[activeKey] as string;
        if (patch[svcsKey]   !== undefined) update.svcs   = patch[svcsKey]   as Record<string, any>;

        // Transmettre les champs libres (restauration_mode, restauration_gastro_*, …)
        const extraEntries = Object.entries(patch).filter(
          ([k]) => k !== typesKey && k !== activeKey && k !== svcsKey
        );
        if (extraEntries.length > 0)
          update.formData = Object.fromEntries(extraEntries) as Partial<FormData>;

        if (Object.keys(update).length > 0) collabSection.onUpdate(update);
      }
    : noop;

  const isStep6Collab = step === 6 && !!collabSection;

  const stepContents: Record<number, React.ReactNode> = {
    1: <Step1 d={filledData} u={noop} profile={profile} />,
    2: <Step2 d={filledData} u={noop} />,
    3: <Step3 d={filledData} u={noop} profile={profile} />,
    4: <Step4 d={filledData} u={noop} profile={profile} />,
    5: <OfferAvailPicker value={filledData.avail} onChange={() => {}} />,
    // Étape 6 : si collabSection → données fusionnées + u filtré (section collab éditable)
    //           sinon         → données guide + noop (tout verrouillé)
    6: <Step5
         d={isStep6Collab ? step6Data : filledData}
         u={isStep6Collab ? step6U : noop}
         collaborations={[]}
         onInvite={() => {}}
         collabSectionOnly={isStep6Collab ? collabSection?.name : undefined}
       />,
    7: <Step7 d={filledData} u={noop} />,
    8: <Step8 d={filledData} u={noop} />,
  };

  return (
    // Étape 6 collab : pas de pointer-events-none global (le SimpleServiceBlock doit être interactif)
    // Sauf si locked=true (offre publiée) : tout verrouillé dans tous les cas
    <div className={(isStep6Collab && !locked) ? "" : "pointer-events-none select-none opacity-80"}>
      {stepContents[step] ?? null}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function canProceed(step: number, d: FormData, collabs: Collab[] = []): boolean {
  switch (step) {
    case 1: return !!d.domaine && d.photos.length >= 1 && !!d.titre && !!d.description_courte && !!d.description_longue && !!d.type_guidage && d.public_recommande.length > 0 && !!d.type_prestation && d.niveau_experience.length > 0;
    case 2: return !!d.lieu_precis && !!d.point_rendez_vous;
    case 3: {
      if (!d.domaine) return false;
      if (DOMAIN_CASCADE_CONFIG[d.domaine]) {
        const tv = d.dynamic_details.types_visite as string[] | undefined;
        return d.expertises.length > 0 && (tv?.length ?? 0) > 0;
      }
      const typeVisiteRequired = ["historique_archeo"].includes(d.domaine);
      return !typeVisiteRequired || d.expertises.length > 0;
    }
    case 4: return !!d.nb_participants_max && d.langue_guidage.length > 0 && !!d.restrictions_medicales;
    case 5: return !!d.avail.type && !d.avail_has_conflict;
    case 6: {
      if (!d.equipement_a_apporter) return false;
      const tp = d.type_prestation ?? "";
      const isSurMesure = tp === "sur_mesure";
      const hasTransport   = ["avec_transport", "transport_repas", "immersion", "sur_mesure"].includes(tp);
      const hasRepas       = ["transport_repas", "immersion", "sur_mesure"].includes(tp);
      const hasHebergement = ["immersion", "sur_mesure"].includes(tp);
      // Pour les types non-sur_mesure, la section est incluse par définition → toujours obligatoire
      // Pour sur_mesure, seulement si le toggle = true
      const transportRequired   = hasTransport   && (!isSurMesure || d.transport_inclus === true);
      const repasRequired       = hasRepas       && (!isSurMesure || d.repas_flag === true);
      const hebergementRequired = hasHebergement && (!isSurMesure || d.hebergement_inclus === true);
      if (transportRequired && d.transport_types.length === 0 && !collabs.some((c) => c.section === "transport")) return false;
      if (repasRequired && d.restauration_types.length === 0 && !collabs.some((c) => c.section === "restauration")) return false;
      if (hebergementRequired && d.hebergement_types.length === 0 && !collabs.some((c) => c.section === "hebergement")) return false;
      // Sur mesure : toutes les décisions doivent être prises
      if (isSurMesure) {
        if (d.transport_inclus === null || d.repas_flag === null || d.hebergement_inclus === null) return false;
        // Autre service (guidage) : domaine obligatoire si mode guide sélectionné
        if (d.autre_service_inclus === true) {
          const autreMode = (d.autre_service_details._mode as string) || "guide";
          if (autreMode === "guide" && !d.autre_service_categorie) return false;
        }
        return true;
      }
      return true;
    }
    case 7: return !!d.pricing.prix_par_personne;
    case 8: return !!d.confirmation.type_confirmation && !!d.confirmation.politique_annulation;
    default: return true;
  }
}

// ── Payload ───────────────────────────────────────────────────────────────────

function deriveModeTargification(p: typeof EMPTY_PRICING): string {
  const hasPerso = !!p.prix_par_personne;
  const hasGroupe = !!p.prix_groupe;
  if (hasPerso && hasGroupe) return "mixte";
  if (hasGroupe) return "groupe";
  return "par_personne";
}

function buildPayload(d: FormData) {
  return {
    // Bloc 1
    titre: d.titre,
    description_courte: d.description_courte,
    description_longue: d.description_longue,
    photos: d.photos,
    // Bloc 2
    type_prestation: d.type_prestation,
    type_guidage_offre: d.type_guidage ?? "",
    zone_offre: d.lieu_precis,
    lieu_precis: d.lieu_precis,
    langue_guidage: d.langue_guidage,
    // Bloc 3
    point_rendez_vous: d.point_rendez_vous || d.lieu_precis,
    heure_depart: d.heure_depart || "00:00",
    difficulte_physique: d.niveau_experience.join(", ") || "Tous niveaux",
    // Bloc 9
    public_cible_offre: d.public_recommande.join(","),
    nb_participants_max: parseInt(d.nb_participants_max) || 1,
    restrictions_medicales: d.restrictions_medicales,
    equipement_a_apporter: d.equipement_a_apporter,
    // Bloc 10
    inclus_resume: d.services_inclus,
    // Bloc 11
    type_disponibilite: d.avail.type ?? "",
    // Bloc 12
    mode_tarification: deriveModeTargification(d.pricing),
    // Bloc 13
    type_confirmation: d.confirmation.type_confirmation,
    politique_annulation: d.confirmation.politique_annulation,
    details: {
      points_forts: d.points_forts,
      lieu_lat: d.lieu_lat,
      lieu_lng: d.lieu_lng,
      lieux_visites: d.lieux_visites,
      nb_participants_min: d.nb_participants_min ? Number(d.nb_participants_min) : null,
      public_recommande: d.public_recommande,
      age_minimum: d.age_minimum ? Number(d.age_minimum) : null,
      age_maximum: d.age_maximum ? Number(d.age_maximum) : null,
      annulation_meteo: d.confirmation.annulation_meteo,
      conditions_particulieres: d.conditions_particulieres || null,
      // Transport
      transport_inclus: d.transport_inclus,
      transport_types: d.transport_types,
      transport_svcs: d.transport_svcs,
      // Restauration
      repas_flag: d.repas_flag,
      restauration_types: d.restauration_types,
      restauration_svcs: d.restauration_svcs,
      // Hébergement
      hebergement_inclus: d.hebergement_inclus,
      hebergement_types: d.hebergement_types,
      hebergement_svcs: d.hebergement_svcs,
      hebergement_prest_sous_type: d.hebergement_prest_sous_type || null,
      hebergement_prest_details: Object.keys(d.hebergement_prest_details ?? {}).length > 0 ? d.hebergement_prest_details : null,
      transport_eco_sous_type: d.transport_eco_sous_type || null,
      transport_eco_details: Object.keys(d.transport_eco_details ?? {}).length > 0 ? d.transport_eco_details : null,
      transport_std_sous_type: d.transport_std_sous_type || null,
      transport_std_details: Object.keys(d.transport_std_details ?? {}).length > 0 ? d.transport_std_details : null,
      restauration_prest_sous_type: d.restauration_prest_sous_type || null,
      restauration_prest_details: Object.keys(d.restauration_prest_details ?? {}).length > 0 ? d.restauration_prest_details : null,
      restauration_mode: d.restauration_mode || null,
      restauration_gastro_expertise: d.restauration_gastro_expertise || null,
      restauration_gastro_details: Object.keys(d.restauration_gastro_details ?? {}).length > 0 ? d.restauration_gastro_details : null,
      // Autre service
      autre_service_inclus: d.autre_service_inclus,
      autre_service_categorie: d.autre_service_categorie || null,
      autre_service_sous_type: d.autre_service_sous_type || null,
      autre_service_details: Object.keys(d.autre_service_details ?? {}).length > 0 ? d.autre_service_details : null,
      non_inclus: d.non_inclus || null,
      expertises_offre: d.expertises,
      domaine_offre: d.domaine,
      domaine_hors_profil: d.isAutreDomaine,
      domaine_details: d.dynamic_details,
      disponibilite: d.avail,
      tarification: d.pricing,
      description_politique: d.confirmation.description_politique || null,
      annulation_meteo_confirmation: d.confirmation.annulation_meteo,
    },
    ...(d.tags.length ? { tags: d.tags } : {}),
  };
}

// ── Composant Modal principal ─────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (offer: any) => void;
  onDelete?: () => void;
  profile: GuideProfile;
  token: string;
  editOffer?: Record<string, any> | null;
}

export interface Collab {
  id?: string;
  userId: string;
  userName: string;
  userType: string;
  section: CollabSection;
  status?: string;
  sectionContext?: {
    domaine?: string;
    expertises?: string[];
    categorie?: string;
    sous_types?: string[];
  } | null;
}

export default function GuideOfferModal({ open, onClose, onSuccess, onDelete, profile, token, editOffer }: Props) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(() =>
    editOffer ? offerToFormData(editOffer, profile) : buildEmptyForProfile(profile)
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [draftOfferId,  setDraftOfferId]  = useState<string | null>(null);
  const [collaborations, setCollaborations] = useState<Collab[]>([]);
  const [inviteSection,  setInviteSection]  = useState<CollabSection | null>(null);
  const [savingDraft,    setSavingDraft]    = useState(false);
  // Conflits collaborateurs détectés à l'étape disponibilités
  const [collabConflicts, setCollabConflicts] = useState<CollabConflict[]>([]);
  const [showCollabConfirm, setShowCollabConfirm] = useState(false);
  const collabAckedRef = useRef(false);

  useEffect(() => {
    if (open) {
      setData(editOffer ? offerToFormData(editOffer, profile) : buildEmptyForProfile(profile));
      setStep(1);
      setError("");
      setInviteSection(null);
      if (editOffer) {
        setDraftOfferId(editOffer.id);
        apiFetch<any[]>(`/guide/offers/${editOffer.id}/collaborations`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((collabs) => {
          if (Array.isArray(collabs)) {
            const mapped = collabs.map((c) => ({
              id: c.id,
              userId: c.invited_user_id,
              userName: c.invited_user_name,
              userType: c.invited_user_type,
              section: c.section as CollabSection,
              status: c.status,
              sectionContext: c.section_context ?? null,
            }));
            setCollaborations(mapped);
            // Si une collaboration hébergement active existe, vider les svcs du state local
            const hasActiveHebergCollab = mapped.some(
              (c) => c.section === "hebergement" && (c.status === "pending" || c.status === "accepted"),
            );
            if (hasActiveHebergCollab) upd({ hebergement_svcs: {} });
          }
        }).catch(() => {});
      } else {
        setDraftOfferId(null);
        setCollaborations([]);
      }
    }
  }, [open]); // eslint-disable-line

  const upd = (x: Partial<FormData>) => setData((prev) => ({ ...prev, ...x }));

  function handleClose() {
    setStep(1); setData(buildEmptyForProfile(profile)); setError(""); setDraftOfferId(null);
    setCollaborations([]); setInviteSection(null);
    setCollabConflicts([]); setShowCollabConfirm(false); collabAckedRef.current = false;
    onClose();
  }

  async function saveAsDraft(): Promise<string | null> {
    try {
      const payload = { ...buildPayload(data), draft_offer_id: draftOfferId };
      const result = await apiFetch<{ id: string }>("/guide/offers/draft", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (result?.id) { setDraftOfferId(result.id); return result.id; }
    } catch { /* silent */ }
    return null;
  }

  async function handleInvite(s: CollabSection) {
    let id = draftOfferId;
    if (!id) {
      setSavingDraft(true);
      id = await saveAsDraft();
      setSavingDraft(false);
      if (!id) return;
    }
    setInviteSection(s);
  }

  async function kickCollab(collabId: string) {
    try {
      await apiFetch(`/guide/collaborations/${collabId}/kick`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCollaborations((prev) => prev.filter((c) => c.id !== collabId));
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (!editOffer) return;
    if (!confirm("Supprimer cette offre ? Cette action est irréversible.")) return;
    setDeleting(true);
    try {
      await apiFetch(`/guide/offers/${editOffer.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      handleClose();
      onDelete?.();
    } catch {
      setError("Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }

  function stepError(s: number, d: FormData): string {
    if (canProceed(s, d, collaborations)) return "";
    if (s === 5) {
      if (!d.avail.type) return "Sélectionnez un mode de disponibilité.";
      if (d.avail_has_conflict) return "Résolvez les conflits avec votre agenda avant de continuer.";
    }
    if (s === 6) {
      const tp = d.type_prestation ?? "";
      const isSurMesure = tp === "sur_mesure";
      const hasTransport   = ["avec_transport", "transport_repas", "immersion", "sur_mesure"].includes(tp);
      const hasRepas       = ["transport_repas", "immersion", "sur_mesure"].includes(tp);
      const hasHebergement = ["immersion", "sur_mesure"].includes(tp);
      const transportRequired   = hasTransport   && (!isSurMesure || d.transport_inclus === true);
      const repasRequired       = hasRepas       && (!isSurMesure || d.repas_flag === true);
      const hebergementRequired = hasHebergement && (!isSurMesure || d.hebergement_inclus === true);
      if (transportRequired && d.transport_types.length === 0 && !collaborations.some((c) => c.section === "transport"))
        return "Transport : sélectionnez au moins un type ou invitez un collaborateur.";
      if (repasRequired && d.restauration_types.length === 0 && !collaborations.some((c) => c.section === "restauration"))
        return "Restauration : sélectionnez au moins un type ou invitez un collaborateur.";
      if (hebergementRequired && d.hebergement_types.length === 0 && !collaborations.some((c) => c.section === "hebergement"))
        return "Hébergement : sélectionnez au moins un type ou invitez un collaborateur.";
      if (isSurMesure && (d.transport_inclus === null || d.repas_flag === null || d.hebergement_inclus === null))
        return "Veuillez confirmer Oui ou Non pour chaque service proposé.";
      if (isSurMesure && d.autre_service_inclus === true) {
        const autreMode = (d.autre_service_details._mode as string) || "guide";
        if (autreMode === "guide" && !d.autre_service_categorie)
          return "Autre service · Guidage : sélectionnez un domaine de guidage avant de continuer.";
      }
    }
    return "Veuillez compléter les champs obligatoires (*).";
  }

  async function handleNext() {
    setError("");
    if (!canProceed(step, data, collaborations)) { setError(stepError(step, data)); return; }
    if (step < STEPS.length) { setStep((s) => s + 1); return; }

    // Avant de sauvegarder : si des conflits collaborateurs existent et ne sont pas encore confirmés
    if (editOffer && collabConflicts.length > 0 && !collabAckedRef.current) {
      setShowCollabConfirm(true);
      return;
    }
    collabAckedRef.current = false; // reset après usage

    try {
      setLoading(true);
      // Si un brouillon existe (invitations faites pendant la création), on le met à jour
      // plutôt que de créer une nouvelle offre
      const targetId = editOffer?.id ?? draftOfferId;
      const offer = await apiFetch(targetId ? `/guide/offers/${targetId}` : "/guide/offers", {
        method: targetId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...buildPayload(data), _finalize: true }),
      });
      // Sync agenda uniquement à la création (l'édition est gérée côté backend dans updateOffer)
      if (!editOffer && data.avail.type) {
        try {
          await apiFetch("/guide/availability", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              type: data.avail.type === "season" ? "range" : data.avail.type,
              dates: data.avail.dates ?? null,
              start_date: data.avail.start_date ?? null,
              end_date: data.avail.end_date ?? null,
              days_of_week: data.avail.days_of_week ?? null,
              label: `[Offre] ${data.titre}`,
              time_slots: data.avail.time_slots && Object.keys(data.avail.time_slots).length
                ? data.avail.time_slots
                : null,
            }),
          });
        } catch { /* non-bloquant : l'offre est publiée même si l'agenda échoue */ }
      }
      handleClose();
      onSuccess?.(offer);
    } catch (err: any) {
      const msg = err.message || "Une erreur est survenue.";
      setError(Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const progress = (step / STEPS.length) * 100;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

        {/* En-tête */}
        <button onClick={handleClose}
          className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
          <X size={16} />
        </button>
        <div className="px-8 pt-8 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{editOffer ? "Modifier l'offre" : "Publier une offre guide"}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{editOffer ? "Modifiez les informations de cette offre" : "Proposez une expérience éco-touristique guidée"}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{STEPS[step - 1].subtitle}</span>
            <div className="flex items-center gap-2">
              {draftOfferId && (
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-xs">edit_note</span>
                  Brouillon
                </span>
              )}
              <span className="text-xs font-black text-slate-400">{step}/{STEPS.length}</span>
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            {STEPS.map((s) => (
              <button key={s.id} type="button" onClick={() => s.id < step && setStep(s.id)}
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  s.id < step ? "bg-primary cursor-pointer" :
                  s.id === step ? "bg-primary" :
                  "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {step === 1 && <Step1 d={data} u={upd} profile={profile} />}
          {step === 2 && <Step2 d={data} u={upd} />}
          {step === 3 && <Step3 d={data} u={upd} profile={profile} />}
          {step === 4 && <Step4 d={data} u={upd} profile={profile} />}
          {step === 5 && <Step6 d={data} u={upd} token={token} editOfferTitle={editOffer?.title} editOfferId={editOffer?.id} onCollabConflictsChange={(c) => { setCollabConflicts(c); setShowCollabConfirm(false); collabAckedRef.current = false; }} />}
          {step === 6 && <Step5 d={data} u={upd} collaborations={collaborations} onInvite={handleInvite} onKickCollab={kickCollab} savingDraft={savingDraft} />}
          {step === 7 && <Step7 d={data} u={upd} />}
          {step === 8 && <Step8 d={data} u={upd} collaborations={collaborations} />}
        </div>

        {/* Pied */}
        <div className="px-8 py-5 border-t border-slate-100 shrink-0 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-600 font-bold whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* Confirmation de conflits collaborateurs */}
          {showCollabConfirm && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">event_busy</span>
                <div>
                  <p className="text-xs font-extrabold text-amber-800 mb-1">
                    {collabConflicts.length} collaborateur{collabConflicts.length > 1 ? "s ont" : " a"} un conflit avec ces nouvelles dates.
                  </p>
                  {collabConflicts.map((c, i) => (
                    <p key={i} className="text-[11px] text-amber-700">
                      • <strong>{c.userName}</strong> ({SECTION_LABEL_STEP6[c.section] ?? c.section})
                      {" — "}conflit avec <em>&ldquo;{c.conflictSlot}&rdquo;</em>
                    </p>
                  ))}
                  <p className="text-[10px] text-amber-600 mt-1.5">
                    Si vous continuez, le(s) collaborateur(s) seront notifiés et devront régler leur agenda eux-mêmes.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button"
                  onClick={() => { setShowCollabConfirm(false); setStep(5); }}
                  className="px-3 py-2 rounded-xl border border-amber-300 text-amber-700 font-bold text-xs hover:bg-amber-100 transition-all">
                  Non, modifier les dates
                </button>
                <button type="button"
                  onClick={() => {
                    setShowCollabConfirm(false);
                    collabAckedRef.current = true;
                    handleNext();
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-all">
                  Oui, continuer quand même
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-center">
            {/* Boutons édition : Supprimer + Annuler */}
            {editOffer && (
              <>
                <button type="button" onClick={handleDelete} disabled={deleting || loading}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold text-xs transition-all disabled:opacity-50 shrink-0">
                  {deleting ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" /> : <Trash2 size={13} />}
                  Supprimer
                </button>
                <button type="button" onClick={handleClose} disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs transition-all disabled:opacity-50 shrink-0">
                  Annuler
                </button>
              </>
            )}
            <div className="flex-1" />
            {step > 1 && (
              <button type="button" onClick={() => { setStep((s) => s - 1); setError(""); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-slate-200 text-slate-600 hover:border-slate-300 font-bold text-sm transition-all shrink-0">
                <ArrowLeft size={16} /> Retour
              </button>
            )}
            <button type="button" onClick={handleNext} disabled={loading || deleting}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-slate-900 font-extrabold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed shrink-0">
              {loading ? (
                <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : step < STEPS.length ? (
                <> Continuer <ArrowRight size={16} /> </>
              ) : editOffer ? (
                <> Enregistrer <Check size={16} /> </>
              ) : (
                <> Publier l'offre <Check size={16} /> </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Modal d'invitation — le brouillon est toujours sauvegardé avant l'ouverture */}
    {inviteSection && draftOfferId && (
      <InviteCollaboratorModal
        section={inviteSection}
        token={token}
        offerId={draftOfferId}
        offerAvail={data.avail}
        formContext={(() => {
          const asMode = (data.autre_service_details._mode as string) || "guide";
          const repasMode = data.restauration_mode;
          const isRepasGuide = repasMode === "guide";
          const isRepasPresta = repasMode !== "guide" && repasMode !== "";
          return {
            transportTypes:  data.transport_types,
            hebergementTypes: data.hebergement_types,
            prefillGuideDomaine:
              (inviteSection === "restauration" && isRepasGuide) ? "gastronomie_locale" :
              (inviteSection === "autre_service" && asMode === "guide") ? (data.autre_service_categorie || undefined) :
              undefined,
            prefillGuideExpertise:
              (inviteSection === "restauration" && isRepasGuide) ? (data.restauration_gastro_expertise || undefined) :
              (inviteSection === "autre_service" && asMode === "guide") ? (data.autre_service_sous_type || undefined) :
              undefined,
            prefillPrestSousType:
              (inviteSection === "restauration" && isRepasPresta) ? (data.restauration_prest_sous_type || undefined) :
              (inviteSection === "autre_service" && asMode === "prestataire") ? (data.autre_service_sous_type || undefined) :
              undefined,
          };
        })()}
        filterMode={(() => {
          if (inviteSection === "restauration") {
            return data.restauration_mode === "guide" ? "guide" : "restaurant_terroir";
          }
          if (inviteSection === "autre_service") {
            const asMode = (data.autre_service_details._mode as string) || "guide";
            if (asMode === "guide") return "guide";
            return data.autre_service_categorie || undefined;
          }
          return undefined;
        })()}
        alreadyInvited={collaborations.filter((c) => c.section === inviteSection && c.status !== "declined").map((c) => c.userId)}
        onClose={() => setInviteSection(null)}
        onInvited={(c, sectionContext) => {
          // Optimistic update, puis re-fetch pour récupérer les IDs
          setCollaborations((prev) => {
            const exists = prev.findIndex((x) => x.userId === c.user_id && x.section === inviteSection);
            if (exists >= 0) {
              const updated = [...prev];
              updated[exists] = { ...updated[exists], status: "pending", sectionContext };
              return updated;
            }
            return [...prev, { userId: c.user_id, userName: c.name, userType: c.type, section: inviteSection!, status: "pending", sectionContext }];
          });
          // Section hébergement déléguée → effacer les unités du state local (le collab remplira les siennes)
          if (inviteSection === "hebergement") upd({ hebergement_svcs: {} });
          setInviteSection(null);
          // Re-fetch pour avoir les IDs de collab (nécessaires pour kick)
          const offerId = draftOfferId;
          if (offerId) {
            apiFetch<any[]>(`/guide/offers/${offerId}/collaborations`, { headers: { Authorization: `Bearer ${token}` } })
              .then((collabs) => {
                if (Array.isArray(collabs)) {
                  setCollaborations(collabs.map((x) => ({
                    id: x.id,
                    userId: x.invited_user_id,
                    userName: x.invited_user_name,
                    userType: x.invited_user_type,
                    section: x.section as CollabSection,
                    status: x.status,
                    sectionContext: x.section_context ?? null,
                  })));
                }
              }).catch(() => {});
          }
        }}
      />
    )}
    </>
  );
}
