"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { type OfferFull } from "@/components/offer/OfferDetailView";
import {
  offerToFormData,
  GuideOfferReadOnlySteps,
  OFFER_STEPS,
  type GuideOfferFormData,
} from "@/components/GuideOfferModal";
import CircuitDetailView from "@/components/circuit/CircuitDetailView";
import { EMPTY_HEBERG } from "@/components/guide/offer/ProviderServiceBlock";

// ── Sections service (étape 6) vs custom (étape 9) ───────────────────────────

const SERVICE_SECTIONS = ["restauration", "transport", "hebergement", "autre_service"] as const;
type ServiceSection = (typeof SERVICE_SECTIONS)[number];
const isServiceSection = (s: string): s is ServiceSection =>
  (SERVICE_SECTIONS as readonly string[]).includes(s);

// ── Champs pour sections custom (guide / autre) ───────────────────────────────

type SectionField = { key: string; label: string; type: "text" | "textarea" | "number"; placeholder?: string };

const CUSTOM_SECTION_FIELDS: Record<string, { title: string; icon: string; color: string; fields: (SectionField & { required?: boolean })[] }> = {
  guide: {
    title: "Guidage", icon: "hiking", color: "green",
    fields: [
      { key: "langues",       label: "Langues de guidage",         type: "text",     placeholder: "Ex : Français, Arabe, Anglais", required: true },
      { key: "specialite",    label: "Spécialité / zone couverte", type: "text",     placeholder: "Ex : Désert du Sahara…",       required: true },
      { key: "duree_guidage", label: "Durée du guidage",           type: "text",     placeholder: "Ex : demi-journée" },
      { key: "tarif",         label: "Tarif (TND)",                type: "number",   placeholder: "Ex : 60" },
      { key: "note",          label: "Note complémentaire",        type: "textarea", placeholder: "Certifications, équipement…" },
    ],
  },
  restauration: {
    title: "Restauration", icon: "restaurant", color: "orange",
    fields: [
      { key: "type_cuisine",  label: "Type de cuisine",            type: "text",     placeholder: "Ex : Tunisienne traditionnelle", required: true },
      { key: "capacite",      label: "Capacité d'accueil (pers.)", type: "number",   placeholder: "Ex : 30" },
      { key: "formule",       label: "Formule proposée",           type: "text",     placeholder: "Ex : Buffet, à la carte…" },
      { key: "tarif",         label: "Tarif par personne (TND)",   type: "number",   placeholder: "Ex : 25" },
      { key: "note",          label: "Note complémentaire",        type: "textarea", placeholder: "Spécialités, restrictions alimentaires…" },
    ],
  },
  transport: {
    title: "Transport", icon: "directions_bus", color: "violet",
    fields: [
      { key: "type_vehicule", label: "Type de véhicule",           type: "text",     placeholder: "Ex : Minibus 9 places, 4x4…", required: true },
      { key: "capacite",      label: "Capacité (personnes)",       type: "number",   placeholder: "Ex : 8" },
      { key: "tarif",         label: "Tarif (TND)",                type: "number",   placeholder: "Ex : 150" },
      { key: "note",          label: "Note complémentaire",        type: "textarea", placeholder: "Équipement, climatisation, options…" },
    ],
  },
  hebergement: {
    title: "Hébergement", icon: "hotel", color: "blue",
    fields: [
      { key: "type_hebergement", label: "Type d'hébergement",     type: "text",     placeholder: "Ex : Hôtel 3*, gîte, tente…", required: true },
      { key: "capacite",         label: "Capacité (personnes)",   type: "number",   placeholder: "Ex : 10" },
      { key: "tarif_nuit",       label: "Tarif par nuit (TND)",   type: "number",   placeholder: "Ex : 80" },
      { key: "note",             label: "Note complémentaire",    type: "textarea", placeholder: "Équipements, petit-déjeuner inclus…" },
    ],
  },
  autre: {
    title: "Autre service", icon: "category", color: "slate",
    fields: [
      { key: "description", label: "Description de votre service", type: "textarea", placeholder: "Décrivez votre contribution…", required: true },
      { key: "tarif",       label: "Tarif (TND)",                  type: "number",   placeholder: "Ex : 50" },
      { key: "note",        label: "Note complémentaire",          type: "textarea", placeholder: "Informations supplémentaires…" },
    ],
  },
  autre_service: {
    title: "Autre service", icon: "category", color: "slate",
    fields: [
      { key: "description", label: "Description de votre service", type: "textarea", placeholder: "Décrivez votre contribution…", required: true },
      { key: "tarif",       label: "Tarif (TND)",                  type: "number",   placeholder: "Ex : 50" },
      { key: "note",        label: "Note complémentaire",          type: "textarea", placeholder: "Informations supplémentaires…" },
    ],
  },
};

const SECTION_META: Record<string, { title: string; icon: string; color: string }> = {
  restauration:  { title: "Restauration",  icon: "restaurant",    color: "orange" },
  transport:     { title: "Transport",     icon: "directions_bus", color: "violet" },
  hebergement:   { title: "Hébergement",  icon: "hotel",          color: "blue"   },
  guide:         { title: "Guidage",      icon: "hiking",         color: "green"  },
  autre:         { title: "Autre",        icon: "category",       color: "slate"  },
  autre_service: { title: "Autre",        icon: "category",       color: "slate"  },
};

// Mapping catégories circuit (étape.categorie) → section CUSTOM_SECTION_FIELDS
const CIRCUIT_SECTION_MAP: Record<string, string> = {
  hebergement:           "hebergement",
  transport:             "transport",
  transport_eco:         "transport",
  restaurant_terroir:    "restauration",
  gastronomie_locale:    "restauration",
  eco_tour:              "guide",
  activite:              "guide",
  culture_patrimoine:    "guide",
  bien_etre_spa:         "guide",
  volontariat_eco:       "guide",
  nature_ecotourisme:    "guide",
  historique_archeo:     "guide",
  aventure_randonnee:    "guide",
  decouverte_urbaine:    "guide",
  artisanat:             "autre",
  artisanat_traditions:  "autre",
  agriculture_terroir:   "autre",
  equipement:            "autre",
  guide:                 "guide",
  restauration:          "restauration",
  autre:                 "autre",
  autre_service:         "autre",
};

// Labels/icônes propres aux catégories circuit pour l'affichage
const CIRCUIT_META_OVERRIDE: Record<string, { title: string; icon: string; color: string }> = {
  transport_eco:        { title: "Transport Éco",          icon: "electric_bike",      color: "violet" },
  gastronomie_locale:   { title: "Gastronomie locale",     icon: "restaurant",         color: "orange" },
  restaurant_terroir:   { title: "Restaurant & Terroir",   icon: "restaurant",         color: "orange" },
  eco_tour:             { title: "Éco-Tour",               icon: "eco",                color: "green"  },
  activite:             { title: "Activité Outdoor",       icon: "hiking",             color: "green"  },
  culture_patrimoine:   { title: "Culture & Patrimoine",   icon: "account_balance",    color: "green"  },
  bien_etre_spa:        { title: "Bien-être & Spa",        icon: "spa",                color: "green"  },
  volontariat_eco:      { title: "Volontariat",            icon: "volunteer_activism", color: "green"  },
  nature_ecotourisme:   { title: "Nature & Écotourisme",   icon: "eco",                color: "green"  },
  historique_archeo:    { title: "Historique & Archéo",    icon: "account_balance",    color: "green"  },
  aventure_randonnee:   { title: "Aventure & Randonnée",   icon: "terrain",            color: "green"  },
  decouverte_urbaine:   { title: "Découverte urbaine",     icon: "location_city",      color: "green"  },
  artisanat:            { title: "Artisanat",              icon: "palette",            color: "slate"  },
  artisanat_traditions: { title: "Artisanat & Traditions", icon: "palette",            color: "slate"  },
  agriculture_terroir:  { title: "Agriculture & Terroir",  icon: "agriculture",        color: "slate"  },
  equipement:           { title: "Location Matériel",      icon: "construction",       color: "slate"  },
};

// Affichage des catégories d'étape circuit dans le programme
const CIRCUIT_CAT_DISPLAY: Record<string, { label: string; icon: string }> = {
  transport_eco:        { label: "Transport Éco",          icon: "electric_bike"      },
  gastronomie_locale:   { label: "Gastronomie locale",     icon: "restaurant"         },
  restaurant_terroir:   { label: "Restaurant & Terroir",   icon: "restaurant"         },
  hebergement:          { label: "Hébergement",            icon: "hotel"              },
  eco_tour:             { label: "Éco-Tour",               icon: "eco"                },
  activite:             { label: "Activité Outdoor",       icon: "hiking"             },
  culture_patrimoine:   { label: "Culture & Patrimoine",   icon: "account_balance"    },
  bien_etre_spa:        { label: "Bien-être & Spa",        icon: "spa"                },
  volontariat_eco:      { label: "Volontariat",            icon: "volunteer_activism" },
  nature_ecotourisme:   { label: "Nature & Écotourisme",   icon: "eco"                },
  historique_archeo:    { label: "Historique & Archéo",    icon: "account_balance"    },
  aventure_randonnee:   { label: "Aventure & Randonnée",   icon: "terrain"            },
  decouverte_urbaine:   { label: "Découverte urbaine",     icon: "location_city"      },
  artisanat:            { label: "Artisanat",              icon: "palette"            },
  artisanat_traditions: { label: "Artisanat & Traditions", icon: "palette"            },
  agriculture_terroir:  { label: "Agriculture & Terroir",  icon: "agriculture"        },
  equipement:           { label: "Location Matériel",      icon: "construction"       },
  transport:            { label: "Transport",              icon: "directions_bus"     },
  autre:                { label: "Autre",                  icon: "category"           },
};

const SECTION_GRAD: Record<string, string> = {
  orange: "from-orange-500 to-amber-500",
  blue:   "from-blue-500 to-sky-500",
  violet: "from-violet-500 to-purple-500",
  green:  "from-emerald-500 to-green-500",
  slate:  "from-slate-500 to-slate-600",
};

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  collabId: string;
  offerId: string;
  section: string;
  inviterName?: string;
  token: string;
  offerApproved?: boolean;
  circuitId?: string;
  etapeId?: string;
  onClose: () => void;
  onContributed?: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
};

// ── Composant ─────────────────────────────────────────────────────────────────

export default function CollaborationModal({
  collabId, offerId, section, inviterName, token, offerApproved = false,
  circuitId, etapeId,
  onClose, onContributed, onSaved, onDeleted,
}: Props) {
  const isCircuitCollab = !offerId;
  const isService = isServiceSection(section);
  // Circuit collab : 1 étape directe (formulaire simple, pas de lecture d'offre)
  // Service offre  : 8 étapes (1-5 verrouillées, 6 éditable, 7-8 verrouillées)
  // Custom offre   : 9 étapes (1-8 verrouillées, 9 = formulaire libre)
  const TOTAL_STEPS  = isCircuitCollab ? 1 : (isService ? 8 : 9);
  const TARGET_STEP  = isCircuitCollab ? 1 : (isService ? 6 : 9);

  const [step, setStep]       = useState(TARGET_STEP);
  const [offerData, setOffer] = useState<GuideOfferFormData | null>(null);
  const [loading, setLoading] = useState(true);

  // Section service : types choisis + svcs + onglet actif + champs libres (mode, gastro…)
  const [svcTypes,  setSvcTypes]  = useState<string[]>([]);
  const [svcData,   setSvcData]   = useState<Record<string, any>>({});
  const [svcActive, setSvcActive] = useState<string>("");
  const [svcFormData, setSvcFormData] = useState<Record<string, any>>({});

  // Section custom (offre) ou contribution circuit : clés → valeurs natives
  const [form, setForm] = useState<Record<string, any>>({});

  const [circuitData, setCircuitData] = useState<any | null>(null);

  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);   // true uniquement après un save dans cette session
  const [wasComplete, setWasComplete] = useState(false);  // contribution existante au chargement
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  const meta        = isCircuitCollab
    ? (CIRCUIT_META_OVERRIDE[section] ?? SECTION_META[section] ?? SECTION_META.autre)
    : (SECTION_META[section] ?? SECTION_META.autre);
  const grad        = SECTION_GRAD[meta.color] ?? SECTION_GRAD.slate;
  const resolvedSection = isCircuitCollab ? (CIRCUIT_SECTION_MAP[section] ?? "autre") : section;
  const customCfg   = CUSTOM_SECTION_FIELDS[resolvedSection];
  const isEditStep  = step === TARGET_STEP;

  const currentMeta = isEditStep
    ? { title: meta.title, subtitle: "Votre partie à compléter" }
    : OFFER_STEPS[step - 1] ?? { title: "", subtitle: "" };

  useEffect(() => {
    setLoading(true);
    setOffer(null);
    setError("");
    setStep(TARGET_STEP);

    const collabFetch = apiFetch<{ status: string; contribution_data?: Record<string, any> }>(
      `/guide/collaborations/${collabId}/status`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => null);

    if (isCircuitCollab) {
      const circuitFetch = circuitId
        ? apiFetch<any>(`/circuits/${circuitId}/view`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
        : Promise.resolve(null);
      Promise.all([collabFetch, circuitFetch]).then(([collab, circuit]) => {
        // Préserver les types natifs (tableaux, booléens) — utilisés par DynamicFields / ProviderSchemaForm
        const initForm: Record<string, any> = collab?.contribution_data ? { ...collab.contribution_data } : {};
        // Pour hébergement : pré-remplir les clés hb_${sv} manquantes avec EMPTY_HEBERG
        // Évite que le HebergBlock parte de EMPTY sans enregistrer la valeur dans le form avant "Mettre à jour"
        if ((collab as any)?.section === 'hebergement') {
          const subtypes: string[] = circuit?.hebergement?.etape?.subtypes ?? [];
          subtypes.forEach((sv: string) => {
            if (!initForm[`hb_${sv}`]) initForm[`hb_${sv}`] = EMPTY_HEBERG;
          });
        }
        if (Object.keys(initForm).length > 0) setForm(initForm);
        if (collab?.status === "completed") setWasComplete(true);
        if (circuit) setCircuitData(circuit);
      }).finally(() => setLoading(false));
      return;
    }

    Promise.all([
      apiFetch<OfferFull>(`/guide/offers/${offerId}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      collabFetch,
    ]).then(([offer, collab]) => {
      const parsed = offerToFormData(offer as Record<string, any>, {
        domaines: null, expertises: null,
        zones_couvertes: null, publics_accueillis: null, languages_spoken: null,
      });
      setOffer(parsed);

      if (isService) {
        const savedContrib = collab?.contribution_data as { types?: string[]; svcs?: Record<string, any>; formData?: Record<string, any> } | null ?? null;
        const restoredTypes = savedContrib?.types ?? [];
        const restoredSvcs  = savedContrib?.svcs  ?? {};
        setSvcTypes(restoredTypes);
        setSvcData(restoredSvcs);
        setSvcActive(restoredTypes[0] ?? "");
        setSvcFormData(savedContrib?.formData ?? {});
      } else if (collab?.contribution_data) {
        setForm(Object.fromEntries(
          Object.entries(collab.contribution_data).map(([k, v]) => [k, String(v)])
        ));
      }

      if (collab?.status === "completed") setWasComplete(true);
    }).catch(() => setError("Impossible de charger l'offre."))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabId, offerId, token]);

  const contributionDone = saved || wasComplete;

  function goTo(n: number) {
    setStep(n);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleClose() {
    if (!contributionDone && !offerApproved) {
      setError("Veuillez remplir et enregistrer votre contribution avant de fermer.");
      goTo(TARGET_STEP);
      return;
    }
    onClose();
  }

  async function handleDelete() {
    if (!confirm("Quitter cette collaboration ? Votre acceptation et vos données seront supprimées.")) return;
    setDeleting(true);
    try {
      await apiFetch(`/guide/collaborations/${collabId}/withdraw`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted?.();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors de la suppression.");
    } finally {
      setDeleting(false);
    }
  }

  function getValidationError(): string | null {
    // Circuit : validation gérée inline dans CircuitDetailView
    if (isCircuitCollab) return null;
    if (isService) {
      if (svcTypes.length === 0 && Object.keys(svcFormData).length === 0)
        return "Complétez votre section avant d'enregistrer.";
      return null;
    }
    if (customCfg) {
      const missing = customCfg.fields
        .filter((f) => f.required && !String(form[f.key] ?? "").trim())
        .map((f) => f.label);
      if (missing.length > 0)
        return `Champs obligatoires manquants : ${missing.join(", ")}.`;
    }
    return null;
  }

  async function handleSave() {
    const validErr = getValidationError();
    if (validErr) { setError(validErr); return; }
    setSaving(true); setError("");
    try {
      const payload = (isService && !isCircuitCollab)
        ? { types: svcTypes, svcs: svcData, ...(Object.keys(svcFormData).length > 0 ? { formData: svcFormData } : {}) }
        : form;
      await apiFetch(`/guide/collaborations/${collabId}/contribution`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      onContributed?.();
      // Re-fetch le circuit pour que la localisation contribution apparaisse sur la carte
      if (isCircuitCollab && circuitId) {
        apiFetch<any>(`/circuits/${circuitId}/view`, { headers: { Authorization: `Bearer ${token}` } })
          .then((updated) => { if (updated) setCircuitData(updated); })
          .catch(() => {});
      }
    } catch {
      setError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  // ── Contenu du corps ─────────────────────────────────────────────────────────

  function renderBody() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
          <span className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Chargement de l&apos;offre…</span>
        </div>
      );
    }
    if (!offerData && !isCircuitCollab) {
      return (
        <div className="text-center py-24 text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2 block">error_outline</span>
          <p className="text-sm">{error || "Impossible de charger l'offre."}</p>
        </div>
      );
    }

    // ── Étapes 1-8 : formulaire du guide (non disponibles pour les circuits)
    //    Étape 6 + isService : Step5 avec seulement la section du collab déverrouillée
    //    Toutes les autres   : pointer-events-none (verrouillé)
    if (!isCircuitCollab && (!isEditStep || (isEditStep && isService))) {
      return (
        <GuideOfferReadOnlySteps
          data={offerData!}
          step={step}
          locked={offerApproved}
          collabSection={isEditStep && isService ? {
            name: section,
            types: svcTypes,
            svcs: svcData,
            active: svcActive,
            formData: svcFormData as Partial<GuideOfferFormData>,
            onUpdate: (saved || offerApproved) ? () => {} : ({ types, svcs, active, formData: fd }) => {
              if (types  !== undefined) { setSvcTypes(types); setSvcActive(active ?? types[0] ?? ""); }
              if (svcs   !== undefined) setSvcData(svcs);
              if (active !== undefined) setSvcActive(active);
              if (fd     !== undefined) setSvcFormData((prev) => ({ ...prev, ...fd }));
            },
          } : undefined}
        />
      );
    }

    // ── Circuit : vue complète avec formulaire contribution inline ──
    if (isCircuitCollab) {
      if (!circuitData) {
        return (
          <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
            <span className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-sm">Chargement du circuit…</span>
          </div>
        );
      }
      const fieldLocked = saved || offerApproved;
      return (
        <div className="space-y-4">
          <CircuitDetailView
            circuit={circuitData}
            editEtapeId={etapeId}
            editCustomCfg={customCfg ?? undefined}
            editForm={form}
            editMeta={meta}
            editGrad={grad}
            onFormChange={(k, v) => setForm((p) => ({ ...p, [k]: v }))}
            fieldLocked={fieldLocked}
            editSaved={saved}
            token={token}
          />
          {saved && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-5 py-4">
              <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
              <div>
                <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">Contribution enregistrée !</p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">Merci, votre contribution au circuit a été enregistrée.</p>
              </div>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-500 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">error</span>{error}
            </p>
          )}
        </div>
      );
    }

    // ── Étape 9 : formulaire libre pour offre (sections custom : guide / autre) ──
    if (!customCfg) return null;
    return (
      <div className="space-y-5">
        {inviterName && (
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-4 py-3">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sm text-primary">person</span>
            </span>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">{inviterName}</strong>{" "}
              vous invite à compléter la section <strong>{customCfg.title}</strong> de cette offre.
            </p>
          </div>
        )}
        <div className="rounded-2xl border-2 border-primary/30 overflow-hidden shadow-md shadow-primary/10">
          <div className={`flex items-center gap-3 px-5 py-4 bg-gradient-to-r ${grad} text-white`}>
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">{meta.icon}</span>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black tracking-widest uppercase opacity-80">Votre partie à remplir</p>
              <p className="font-extrabold text-base">{customCfg.title}</p>
            </div>
            {saved && (
              <span className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full text-xs font-bold">
                <span className="material-symbols-outlined text-sm">check_circle</span>Enregistré
              </span>
            )}
          </div>
          <div className="bg-white dark:bg-slate-900 px-5 py-5 space-y-4">
            {customCfg.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-1.5">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea rows={3} value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} disabled={saved || offerApproved}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed" />
                ) : (
                  <input type={f.type} value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} disabled={saved || offerApproved}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed" />
                )}
              </div>
            ))}
          </div>
        </div>
        {saved && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-5 py-4">
            <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
            <div>
              <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">Contribution enregistrée !</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                Si tous les collaborateurs ont terminé, l&apos;offre sera publiée automatiquement.
              </p>
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">error</span>{error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">

      {/* ── En-tête identique à GuideOfferModal ── */}
      <div className="px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors shrink-0">
            <span className="material-symbols-outlined text-base">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight truncate">
              {offerData?.titre ?? (isCircuitCollab ? "Collaboration circuit" : "Offre collaborative")}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">{isCircuitCollab ? "Circuit" : "Offre"} collaborative · {inviterName ?? "Guide"}</p>
          </div>
          <span className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white bg-gradient-to-r ${grad}`}>
            <span className="material-symbols-outlined text-sm">{meta.icon}</span>
            {meta.title}
          </span>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{currentMeta.subtitle}</span>
          <span className="text-xs font-black text-slate-400">{step}/{TOTAL_STEPS}</span>
        </div>

        <div className="flex gap-1 mt-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-300 ${i < step ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
          ))}
        </div>
      </div>

      {/* Bandeau lecture seule si offre publiée */}
      {offerApproved && (
        <div className="shrink-0 px-8 py-2.5 flex items-center gap-2 bg-amber-50 border-b border-amber-100">
          <span className="material-symbols-outlined text-amber-500 text-base">lock</span>
          <p className="text-xs font-bold text-amber-700">Offre publiée — votre contribution est en lecture seule</p>
        </div>
      )}

      {/* ── Corps ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-5">
        {renderBody()}
      </div>

      {/* ── Pied de page ── */}
      <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
        {isEditStep && error && (
          <p className="text-xs text-red-500 flex items-center gap-1.5 mb-3">
            <span className="material-symbols-outlined text-sm">error</span>{error}
          </p>
        )}
        <div className="flex items-center gap-3">
          {/* Retour — icône seule */}
          {step > 1 ? (
            <button type="button" onClick={() => goTo(step - 1)}
              className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 transition-all shrink-0">
              <span className="material-symbols-outlined text-base">arrow_back</span>
            </button>
          ) : <div />}

          {/* Supprimer — visible à l'étape édition quand une contribution existe (pas si offre publiée) */}
          {isEditStep && wasComplete && !offerApproved && (
            <button type="button" onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-bold text-sm transition-all shrink-0 disabled:opacity-60">
              <span className="material-symbols-outlined text-base">delete</span>
              {deleting ? "…" : "Quitter"}
            </button>
          )}

          <div className="flex-1" />

          {isEditStep ? (
            saved ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold border border-emerald-200 dark:border-emerald-800 shrink-0">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {wasComplete ? "Mis à jour ✓" : "Enregistré ✓"}
                </div>
                {step < TOTAL_STEPS && (
                  <button type="button" onClick={() => goTo(step + 1)} disabled={loading || !offerData}
                    className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 transition-all shrink-0 disabled:opacity-60">
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                )}
              </>
            ) : (
              /* Pas encore enregistré → bouton Enregistrer + flèche → pour naviguer librement */
              <>
                {!offerApproved && (
                  <button type="button" onClick={handleSave} disabled={saving || !!getValidationError()}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-slate-900 font-extrabold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed shrink-0">
                    {saving
                      ? <span className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                      : <span className="material-symbols-outlined text-base">{wasComplete ? "sync" : "save"}</span>}
                    {wasComplete ? "Mettre à jour" : "Enregistrer"}
                  </button>
                )}
                {step < TOTAL_STEPS && (
                  <button type="button" onClick={() => goTo(step + 1)} disabled={loading || !offerData}
                    className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 transition-all shrink-0 disabled:opacity-60">
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                )}
              </>
            )
          ) : (
            step < TOTAL_STEPS ? (
              <button type="button" onClick={() => goTo(step + 1)} disabled={loading || !offerData}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-slate-900 transition-all shadow-sm disabled:opacity-60 shrink-0">
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            ) : contributionDone ? (
              <button type="button" onClick={() => { if (onSaved) onSaved(); else onClose(); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-slate-900 font-extrabold text-sm transition-all shadow-sm shrink-0">
                <span className="material-symbols-outlined text-base">visibility</span>
                Voir les détails de l&apos;offre
              </button>
            ) : (
              <button type="button" onClick={() => goTo(TARGET_STEP)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-sm transition-all shadow-sm shrink-0">
                <span className="material-symbols-outlined text-base">edit</span>
                Compléter ma contribution
              </button>
            )
          )}
        </div>

      </div>
    </div>
  );
}
