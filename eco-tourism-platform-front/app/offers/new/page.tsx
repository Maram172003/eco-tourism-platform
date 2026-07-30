"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import { ChevronLeft, ChevronRight, Check, Leaf, AlertCircle, X } from "lucide-react";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";
import { OFFER_DETAIL_FIELDS, OFFER_COMMON_FIELDS, getCapacityLimit, type OfferField } from "@/lib/offer-schema";
import { PUBLIC_RECOMMANDE } from "@/lib/guideOfferConfig";
import LocationPicker from "@/components/guide/offer/LocationPicker";
import { OfferAvailPicker, EMPTY_OFFER_AVAIL, type OfferAvailSlot } from "@/components/offer/OfferAvailPicker";
import { PricingBlock, EMPTY_PRICING, type PricingData } from "@/components/offer/PricingBlock";
import { ConfirmationTypePicker, EMPTY_CONFIRMATION, type ConfirmationData } from "@/components/offer/ConfirmationTypePicker";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrgActivity {
  id: string;
  category: string;
  level: string;
  subtypes: string[];
  years_experience: number | null;
  fields: Record<string, any>;
  photos: Record<string, string[]>;
  certifications: any[];
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
  logo: string | null;
  region: string | null;
  zone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  "Activité",
  "Titre & Public",
  "Localisation",
  "Sous-types & Détails",
  "Disponibilité",
  "Services inclus",
  "Tarification",
  "Conditions",
];

const TYPE_PRESTATION_PROVIDER = [
  { value: "individuel", icon: "person",    label: "Individuel",  desc: "Pour une personne ou famille" },
  { value: "groupe",     icon: "group",     label: "Groupe",      desc: "Pour petits ou grands groupes" },
  { value: "forfait",    icon: "inventory", label: "Forfait",     desc: "Pack de services combinés" },
  { value: "sur_mesure", icon: "tune",      label: "Sur mesure",  desc: "Prestation personnalisée" },
];

const PROVIDER_SERVICES = [
  "Eau / Boissons", "Déjeuner inclus", "Équipement fourni", "Transport inclus",
  "Guide local", "Assurance incluse", "Wi-Fi disponible", "Photos / Vidéos",
  "Certificat", "Formation / Initiation", "Traduction", "Service VIP",
  "Livraison", "Installation / Montage", "Pack famille", "Parking gratuit",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryMeta(categoryValue: string) {
  return PROVIDER_SCHEMA.find((c) => c.value === categoryValue);
}

function getSubtypeLabel(categoryValue: string, subtypeValue: string) {
  const cat = getCategoryMeta(categoryValue);
  return cat?.subtypes.find((s) => s.value === subtypeValue)?.label ?? subtypeValue;
}

const ic = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium text-sm";
const lbl = "block text-xs font-black tracking-widest text-slate-400 uppercase mb-2";

// ─── Field renderer (pour OFFER_DETAIL_FIELDS) ────────────────────────────────

function OfferFieldInput({ field, value, onChange }: { field: OfferField; value: any; onChange: (v: any) => void }) {
  const cls = "w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm border-slate-200";

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div onClick={() => onChange(!value)}
          className={`w-11 h-6 rounded-full flex items-center transition-colors ${value ? "bg-primary" : "bg-slate-200"}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${value ? "translate-x-5" : "translate-x-0"}`} />
        </div>
        <span className="text-sm text-slate-700">{field.label}</span>
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{field.label}</label>
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">— Sélectionner —</option>
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.type === "multiselect") {
    const arr: string[] = Array.isArray(value) ? value : [];
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">{field.label}</label>
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => (
            <button key={o} type="button"
              onClick={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])}
              className={`px-3 py-1 rounded-full text-xs border transition-all ${arr.includes(o) ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary/40"}`}>
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{field.label}</label>
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder} rows={3} className={cls + " resize-none"} />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {field.label}{field.unit ? ` (${field.unit})` : ""}
      </label>
      <input type={field.type === "number" ? "number" : "text"} value={value ?? ""}
        onChange={(e) => onChange(field.type === "number" ? (e.target.value ? Number(e.target.value) : "") : e.target.value)}
        placeholder={field.placeholder} className={cls} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function NewOfferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preActivityId = searchParams.get("activityId");

  const [step, setStep]               = useState(0);
  const [loading, setLoading]         = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError]             = useState("");

  // Data fetched
  const [org, setOrg]               = useState<Organization | null>(null);
  const [activities, setActivities] = useState<OrgActivity[]>([]);

  // ── Étape 0 : Activité ─────────────────────────────────────────────────────
  const [selectedActivity, setSelectedActivity] = useState<OrgActivity | null>(null);

  // ── Étape 1 : Titre & Public ───────────────────────────────────────────────
  const [photos, setPhotos]               = useState<string[]>([]);
  const [title, setTitle]                 = useState("");
  const [descCourte, setDescCourte]       = useState("");
  const [descLongue, setDescLongue]       = useState("");
  const [publicCible, setPublicCible]     = useState<string[]>([]);
  const [typePrestation, setTypePrestation] = useState<string | null>(null);
  const [capacity, setCapacity]           = useState("");
  const [maxGroup, setMaxGroup]           = useState("");
  const [minAge, setMinAge]               = useState("");
  const [duration, setDuration]           = useState("");
  const [capacityError, setCapacityError] = useState("");
  const [maxGroupError, setMaxGroupError] = useState("");

  // ── Étape 2 : Localisation ──────────────────────────────────────────────────
  const [locLat, setLocLat]           = useState<number | null>(null);
  const [locLng, setLocLng]           = useState<number | null>(null);
  const [locAdresse, setLocAdresse]   = useState("");
  const [locDesc, setLocDesc]         = useState("");

  // ── Étape 3 : Sous-types & Détails ─────────────────────────────────────────
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([]);
  const [offerMode, setOfferMode] = useState<"single" | "variant" | "package">("single");
  const [subtypeDetails, setSubtypeDetails] = useState<Record<string, Record<string, any>>>({});
  const [commonDetails, setCommonDetails]   = useState<Record<string, any>>({});

  // ── Étape 4 : Disponibilité ────────────────────────────────────────────────
  const [avail, setAvail] = useState<OfferAvailSlot>(EMPTY_OFFER_AVAIL);

  // ── Étape 5 : Services inclus ───────────────────────────────────────────────
  const [servicesInclus, setServicesInclus] = useState<string[]>([]);

  // ── Étape 6 : Tarification ─────────────────────────────────────────────────
  const [pricing, setPricing] = useState<PricingData>(EMPTY_PRICING);

  // ── Étape 7 : Conditions ───────────────────────────────────────────────────
  const [confirmation, setConfirmation] = useState<ConfirmationData>(EMPTY_CONFIRMATION);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      try {
        const [orgRes, actRes] = await Promise.all([
          apiFetch("/organizations/me"),
          apiFetch("/provider-activities/mine"),
        ]) as [Organization, OrgActivity[]];
        setOrg(orgRes);
        setActivities(actRes);
        if (preActivityId) {
          const found = actRes.find((a: OrgActivity) => a.id === preActivityId);
          if (found) { setSelectedActivity(found); setStep(1); }
        }
      } catch { /* non bloquant */ }
      finally { setInitLoading(false); }
    }
    init();
  }, [preActivityId]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const capacityLimit = selectedActivity ? getCapacityLimit(selectedActivity.fields) : null;

  function validateCapacity(val: string) {
    if (capacityLimit !== null && val && Number(val) > capacityLimit)
      setCapacityError(`Max autorisé : ${capacityLimit}`);
    else setCapacityError("");
  }
  function validateMaxGroup(val: string) {
    if (capacityLimit !== null && val && Number(val) > capacityLimit)
      setMaxGroupError(`Max autorisé : ${capacityLimit}`);
    else setMaxGroupError("");
  }

  function setDetail(subtype: string, key: string, val: any) {
    setSubtypeDetails((prev) => ({ ...prev, [subtype]: { ...(prev[subtype] ?? {}), [key]: val } }));
  }

  function togPublic(v: string) {
    setPublicCible((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }
  function togService(v: string) {
    setServicesInclus((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  function canNext(): boolean {
    if (step === 0) return selectedActivity !== null;
    if (step === 1) return !!title.trim() && !capacityError && !maxGroupError;
    if (step === 3) return selectedSubtypes.length > 0;
    return true;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function submit() {
    if (!selectedActivity || !org) return;
    setLoading(true); setError("");
    try {
      const mergedDetails: Record<string, any> = { ...commonDetails };
      for (const sv of selectedSubtypes) {
        if (subtypeDetails[sv]) mergedDetails[sv] = subtypeDetails[sv];
      }
      if (offerMode === "variant") mergedDetails.prices = {};

      const payload: Record<string, any> = {
        organization_id: org.id,
        activity_id: selectedActivity.id,
        offer_type: selectedActivity.category,
        offer_subtype: selectedSubtypes[0] ?? null,
        offer_subtypes: selectedSubtypes,
        offer_mode: selectedSubtypes.length === 1 ? "single" : offerMode,
        title: title.trim(),
        description: descCourte.trim() || null,
        description_longue: descLongue.trim() || null,
        public_cible: publicCible,
        type_prestation: typePrestation,
        duration: duration.trim() || null,
        capacity: capacity ? Number(capacity) : null,
        max_group_size: maxGroup ? Number(maxGroup) : null,
        min_age: minAge ? Number(minAge) : null,
        images: photos.filter(Boolean),
        meeting_lat: locLat,
        meeting_lng: locLng,
        meeting_point: locAdresse || org.address || null,
        meeting_point_description: locDesc.trim() || null,
        region: org.region ?? null,
        disponibilite: avail,
        services_inclus: servicesInclus,
        pricing,
        confirmation,
        details: mergedDetails,
      };

      await apiFetch("/offers", { method: "POST", body: JSON.stringify(payload) });
      router.push("/profile/provider");
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la création.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const catMeta = selectedActivity ? getCategoryMeta(selectedActivity.category) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(step - 1) : router.back()}
            className="text-slate-400 hover:text-slate-700">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Leaf size={18} className="text-primary" /> Nouvelle offre
            </h1>
            <p className="text-xs text-slate-400">Étape {step + 1} sur {STEPS.length} — {STEPS[step]}</p>
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-1 bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${i < step ? "bg-primary text-white" : i === step ? "bg-primary/10 text-primary ring-2 ring-primary/40" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-5 h-0.5 ${i < step ? "bg-primary/60" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        {/* ─── Étape 0 : Activité ───────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Lier à une activité</h2>
              <p className="text-sm text-slate-500">Sélectionnez une de vos activités déclarées.</p>
            </div>
            {activities.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <AlertCircle size={24} className="text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-amber-800">Aucune activité déclarée</p>
                <p className="text-xs text-amber-600 mt-1">Complétez votre profil pour lier vos offres à vos activités.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {activities.map((act) => {
                  const meta = getCategoryMeta(act.category);
                  const isPrimary = act.level === "primary";
                  const firstPhoto = Object.values(act.photos ?? {}).flat().filter(Boolean)[0] ?? null;
                  return (
                    <button key={act.id}
                      onClick={() => setSelectedActivity(selectedActivity?.id === act.id ? null : act)}
                      className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${
                        selectedActivity?.id === act.id ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-slate-300"
                      }`}>
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
                          {firstPhoto
                            ? <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                            : <span className="material-symbols-outlined text-primary text-2xl">{meta?.icon ?? "eco"}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPrimary ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}`}>
                              {isPrimary ? "Principale" : "Secondaire"}
                            </span>
                            <span className="text-xs text-slate-500">{meta?.label ?? act.category}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {act.subtypes?.map((sv) => getSubtypeLabel(act.category, sv)).join(" · ") || meta?.label}
                          </p>
                          {act.years_experience && (
                            <p className="text-xs text-slate-400">{act.years_experience} an{act.years_experience > 1 ? "s" : ""} d'expérience</p>
                          )}
                        </div>
                        {selectedActivity?.id === act.id && <Check size={18} className="text-primary flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Étape 1 : Titre & Public ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Titre & Public ciblé</h2>
              <p className="text-sm text-slate-500">Présentez votre offre et définissez à qui elle s'adresse.</p>
            </div>

            {/* Photos */}
            <div>
              <label className={lbl}>Photos de l'offre</label>
              <textarea value={photos.join("\n")}
                onChange={(e) => setPhotos(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                placeholder="https://… (une URL par ligne)" rows={3}
                className={ic + " resize-none font-mono text-xs"} />
            </div>

            {/* Titre */}
            <div>
              <label className={lbl}>Titre de l'offre <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={`Ex: ${catMeta?.label ?? "Offre"} — ${org?.name ?? "Mon Organisation"}`}
                className={ic} />
            </div>

            {/* Description courte */}
            <div>
              <label className={lbl}>Description courte <span className="text-red-500">*</span></label>
              <div className="relative">
                <textarea value={descCourte} onChange={(e) => setDescCourte(e.target.value.slice(0, 160))}
                  placeholder="Résumé percutant en quelques mots…" rows={2}
                  className={ic + " resize-none"} />
                <span className={`absolute bottom-2 right-3 text-xs font-semibold ${descCourte.length > 140 ? "text-amber-500" : "text-slate-400"}`}>
                  {descCourte.length}/160
                </span>
              </div>
            </div>

            {/* Description longue */}
            <div>
              <label className={lbl}>Description complète</label>
              <textarea value={descLongue} onChange={(e) => setDescLongue(e.target.value)}
                placeholder="Décrivez l'expérience complète, l'ambiance, les points clés…" rows={5}
                className={ic + " resize-none"} />
            </div>

            {/* Public ciblé */}
            <div>
              <label className={lbl}>Public ciblé</label>
              <div className="grid grid-cols-2 gap-2">
                {PUBLIC_RECOMMANDE.map((p) => {
                  const active = publicCible.includes(p.value);
                  return (
                    <button key={p.value} type="button" onClick={() => togPublic(p.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-100 bg-white hover:border-primary/30 text-slate-600"
                      }`}>
                      <span className={`material-symbols-outlined text-base ${active ? "text-primary" : "text-slate-400"}`}>{p.icon}</span>
                      {p.label}
                      {active && <Check size={12} className="ml-auto text-primary" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type de prestation */}
            <div>
              <label className={lbl}>Type de prestation <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_PRESTATION_PROVIDER.map((tp) => {
                  const active = typePrestation === tp.value;
                  return (
                    <button key={tp.value} type="button"
                      onClick={() => setTypePrestation(active ? null : tp.value)}
                      className={`relative flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all ${
                        active ? "bg-primary/10 border-primary shadow-sm" : "border-slate-100 bg-white hover:border-primary/30 text-slate-600"
                      }`}>
                      {active && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check size={9} className="text-white" strokeWidth={3} />
                        </span>
                      )}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary" : "bg-slate-100"}`}>
                        <span className={`material-symbols-outlined text-lg ${active ? "text-white" : "text-slate-400"}`}>{tp.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className={`font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>{tp.label}</p>
                        <p className={`text-[10px] mt-0.5 leading-tight ${active ? "text-primary/70" : "text-slate-400"}`}>{tp.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Durée + Capacité */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Durée</label>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ex: 2h, 1 journée, 3 jours" className={ic} />
              </div>
              <div>
                <label className={lbl}>Capacité{capacityLimit !== null ? ` (max ${capacityLimit})` : ""}</label>
                <input type="number" value={capacity}
                  onChange={(e) => { setCapacity(e.target.value); validateCapacity(e.target.value); }}
                  placeholder="Places" min={1} className={ic} />
                {capacityError && <p className="text-xs text-red-500 mt-1">{capacityError}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Groupe max{capacityLimit !== null ? ` (max ${capacityLimit})` : ""}</label>
                <input type="number" value={maxGroup}
                  onChange={(e) => { setMaxGroup(e.target.value); validateMaxGroup(e.target.value); }}
                  placeholder="Ex: 15" min={1} className={ic} />
                {maxGroupError && <p className="text-xs text-red-500 mt-1">{maxGroupError}</p>}
              </div>
              <div>
                <label className={lbl}>Âge minimum</label>
                <input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)}
                  placeholder="Ex: 12" min={0} className={ic} />
              </div>
            </div>
          </div>
        )}

        {/* ─── Étape 2 : Localisation ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Localisation</h2>
              <p className="text-sm text-slate-500">Indiquez l'adresse ou lieu précis de votre prestation.</p>
            </div>

            <div>
              <label className={lbl}>Localisation <span className="text-red-500">*</span></label>
              <LocationPicker
                value={{ lat: locLat, lng: locLng, adresse: locAdresse }}
                onChange={(loc) => { setLocLat(loc.lat); setLocLng(loc.lng); setLocAdresse(loc.adresse); }}
                hint="Positionnez le point de rendez-vous sur la carte."
              />
            </div>

            <div>
              <label className={lbl}>Description du localisation <span className="text-red-500">*</span></label>
              <textarea value={locDesc} onChange={(e) => setLocDesc(e.target.value)}
                rows={2} placeholder="Ex: Entrée principale, parking nord, à côté de la fontaine…"
                className={ic + " resize-none"} />
            </div>
          </div>
        )}

        {/* ─── Étape 3 : Sous-types & Détails ──────────────────────────────── */}
        {step === 3 && selectedActivity && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Sous-types & Détails</h2>
              <p className="text-sm text-slate-500">
                Sélectionnez les sous-types de <strong>{catMeta?.label}</strong> et renseignez les détails.
              </p>
            </div>

            {/* Sélection sous-types */}
            <div className="grid grid-cols-2 gap-2">
              {(selectedActivity.subtypes ?? []).map((sv) => {
                const label = getSubtypeLabel(selectedActivity.category, sv);
                const isSelected = selectedSubtypes.includes(sv);
                return (
                  <button key={sv}
                    onClick={() => setSelectedSubtypes((prev) =>
                      prev.includes(sv) ? prev.filter((x) => x !== sv) : [...prev, sv]
                    )}
                    className={`px-3 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all flex items-center gap-2 ${
                      isSelected ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}>
                    {isSelected && <Check size={14} />}
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Mode si plusieurs sous-types */}
            {selectedSubtypes.length > 1 && (
              <div>
                <label className={lbl}>Mode de l'offre</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOfferMode("variant")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${offerMode === "variant" ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}`}>
                    <p className="text-sm font-bold text-slate-800">🔀 Variantes</p>
                    <p className="text-xs text-slate-500 mt-0.5">Le voyageur choisit un sous-type.</p>
                  </button>
                  <button onClick={() => setOfferMode("package")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${offerMode === "package" ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}`}>
                    <p className="text-sm font-bold text-slate-800">📦 Package</p>
                    <p className="text-xs text-slate-500 mt-0.5">Tous les sous-types inclus.</p>
                  </button>
                </div>
              </div>
            )}

            {/* Détails spécifiques par sous-type */}
            {selectedSubtypes.map((sv) => {
              const config = OFFER_DETAIL_FIELDS[sv];
              const svLabel = getSubtypeLabel(selectedActivity.category, sv);
              if (!config) return null;
              return (
                <div key={sv} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-800 px-4 py-3">
                    <h3 className="text-sm font-bold text-white">{svLabel}</h3>
                  </div>
                  <div className="p-4 space-y-5">
                    {config.sections.map((section) => (
                      <div key={section.label}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                          {section.icon} {section.label}
                        </p>
                        <div className="space-y-3">
                          {section.fields.map((field) => (
                            <OfferFieldInput key={field.key} field={field}
                              value={subtypeDetails[sv]?.[field.key]}
                              onChange={(v) => setDetail(sv, field.key, v)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Champs communs */}
            {selectedSubtypes.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-700">{OFFER_COMMON_FIELDS.icon} {OFFER_COMMON_FIELDS.label}</h3>
                </div>
                <div className="p-4 space-y-3">
                  {OFFER_COMMON_FIELDS.fields.map((field) => (
                    <OfferFieldInput key={field.key} field={field}
                      value={commonDetails[field.key]}
                      onChange={(v) => setCommonDetails((prev) => ({ ...prev, [field.key]: v }))} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Étape 4 : Disponibilité ──────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Quand êtes-vous disponible ?</h2>
              <p className="text-sm text-slate-500">Définissez les créneaux de disponibilité de cette offre.</p>
            </div>
            <OfferAvailPicker value={avail} onChange={(v) => setAvail(v)} />
          </div>
        )}

        {/* ─── Étape 5 : Services inclus ────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Services inclus</h2>
              <p className="text-sm text-slate-500">Sélectionnez ce qui est inclus dans votre prestation.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {PROVIDER_SERVICES.map((s) => {
                const active = servicesInclus.includes(s);
                return (
                  <button key={s} type="button" onClick={() => togService(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border-2 transition-all ${
                      active ? "bg-primary/10 border-primary text-primary" : "border-slate-200 bg-white text-slate-600 hover:border-primary/30"
                    }`}>
                    {active && <Check size={11} strokeWidth={3} />}
                    {s}
                  </button>
                );
              })}
            </div>

            {servicesInclus.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <p className="w-full text-xs font-bold text-primary/70 mb-1">Sélectionnés :</p>
                {servicesInclus.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => togService(s)}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Étape 6 : Tarification ───────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Tarification</h2>
              <p className="text-sm text-slate-500">Définissez les tarifs de votre offre.</p>
            </div>
            <PricingBlock value={pricing} onChange={(v) => setPricing({ ...pricing, ...v })} />
          </div>
        )}

        {/* ─── Étape 7 : Conditions ─────────────────────────────────────────── */}
        {step === 7 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 mb-1">Conditions & Confirmation</h2>
              <p className="text-sm text-slate-500">Définissez votre politique d'annulation et votre mode de confirmation.</p>
            </div>
            <ConfirmationTypePicker value={confirmation}
              onChange={(v) => setConfirmation({ ...confirmation, ...v })}
              hideMeteо />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
              <ChevronLeft size={16} /> Précédent
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2">
              Suivant <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={submit} disabled={loading || !!capacityError || !!maxGroupError}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? "Publication..." : "Publier l'offre"} <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewOfferPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <NewOfferContent />
    </Suspense>
  );
}
