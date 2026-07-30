"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Leaf, Plus, X, Check, MapPin } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import CollaborationModal from "@/components/CollaborationModal";

const MapPicker = dynamic(
  () => import("@/components/map/MapPicker"),
  { ssr: false, loading: () => <div className="h-[268px] rounded-2xl bg-slate-100 animate-pulse" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "eco_traveler" | "guide" | "project";
type Badge = { label: string; obtained_at: string };

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

type Offer = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  duration: string | null;
  offer_type: string | null;
  status: string;
  rejection_reason: string | null;
  project_id?: string | null;
  created_at: string;
};

type Project = {
  id: string;
  name: string;
  project_type: string[] | null;
  description: string | null;
  region: string | null;
  address: string | null;
  photo: string | null;
  photos: string[] | null;
  lat: number | null;
  lng: number | null;
  opening_hours: string | null;
  facebook: string | null;
  instagram: string | null;
  status: string;
  rejection_reason: string | null;
  services: string[] | null;
  eco_labels: string[] | null;
  website: string | null;
  phone: string | null;
};

type AnyProfile = {
  full_name: string;
  bio?: string | null;
  photo?: string | null;
  country?: string | null;
  language?: string | null;
  profile_completion: number;
  is_onboarded: boolean;
  sustainability_score: number | null;
  score_questionnaire: number | null;
  score_reservations: number;
  score_feedbacks: number;
  badges: Badge[];
  // eco_traveler
  score_partages?: number;
  feedback_given?: number;
  plans_shared?: number;
  reservations_made?: number;
  // guide
  guide_type?: string | null;
  zone?: string | null;
  specialties?: string[] | null;
  languages_spoken?: string[] | null;
  years_experience?: number | null;
  status?: string;
  certifications?: { label: string; proof: string; _id?: string }[];
  feedback_received?: number;
  reservations_handled?: number;
  // project_owner
  organization?: string | null;
  position?: string | null;
  phone?: string | null;
  total_reservations?: number;
  projects?: Project[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GUIDE_OFFER_TYPES = [
  { value: "eco_tour", label: "Éco-Tour", icon: "hiking" },
  { value: "activity", label: "Activité", icon: "sports" },
  { value: "workshop", label: "Atelier", icon: "school" },
  { value: "transfer", label: "Transfert", icon: "directions_car" },
];

const PROJ_OFFER_TYPES = [
  { value: "sejour", label: "Séjour" },
  { value: "circuit", label: "Circuit" },
  { value: "activite", label: "Activité" },
  { value: "restauration", label: "Restauration" },
  { value: "hebergement", label: "Hébergement" },
  { value: "autre", label: "Autre" },
];

const PROJECT_TYPES = [
  { value: "hebergement", label: "Hébergement", icon: "hotel" },
  { value: "restauration", label: "Restauration", icon: "restaurant" },
  { value: "artisanat", label: "Artisanat", icon: "brush" },
  { value: "agence", label: "Agence de voyage", icon: "luggage" },
  { value: "centre_loisir", label: "Centre de loisirs", icon: "sports" },
];

const ECO_PRACTICES = [
  "Panneaux solaires", "Eau recyclée", "Zéro plastique", "Produits locaux",
  "Compostage", "Éco-certification", "Véhicules électriques", "Éclairage LED",
];

const PROJECT_SERVICES = [
  { value: "hebergement", label: "Hébergement", icon: "hotel" },
  { value: "restauration", label: "Restauration", icon: "restaurant" },
  { value: "transport", label: "Transport", icon: "directions_car" },
  { value: "excursions", label: "Excursions", icon: "hiking" },
  { value: "artisanat", label: "Artisanat", icon: "brush" },
  { value: "spa_bien_etre", label: "Spa & Bien-être", icon: "spa" },
  { value: "location", label: "Location matériel", icon: "backpack" },
  { value: "animation", label: "Animation culturelle", icon: "celebration" },
];

const BADGE_CONFIGS: Record<Role, { label: string; icon: string; description: string }[]> = {
  eco_traveler: [
    { label: "Explorateur Durable", icon: "explore", description: "Onboarding complété" },
    { label: "Ambassadeur ", icon: "stars", description: "Score ≥ 80%" },
    { label: "Contributeur Communautaire", icon: "groups", description: "3 plans partagés" },
    { label: "Protecteur de la Nature", icon: "eco", description: "10 réservations durables" },
  ],
  guide: [
    { label: "Guide Éco-Certifié", icon: "verified", description: "Onboarding complété" },
    { label: "Guide Ambassadeur Éco-Voyage", icon: "stars", description: "Score ≥ 80%" },
    { label: "Guide Expert", icon: "psychology", description: "10 réservations gérées" },
    { label: "Formateur Durable", icon: "school", description: "5 évaluations reçues" },
  ],
  project: [
    { label: "Prestataire Éco-Certifié", icon: "verified", description: "Onboarding complété" },
    { label: "Ambassadeur Éco-Voyage", icon: "stars", description: "Score ≥ 80%" },
    { label: "Projet d'Excellence", icon: "domain_verification", description: "10 réservations gérées" },
    { label: "Champion Durable", icon: "eco", description: "5 évaluations reçues" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreLabel(score: number | null, role: Role): string {
  if (score === null) return "—";
  const labels: Record<Role, string[]> = {
    eco_traveler: ["Ambassadeur durable", "Écovoyageur engagé", "Voyageur sensible", "Voyageur classique"],
    guide: ["Guide Ambassadeur", "Guide Expert", "Guide Engagé", "Guide en Développement"],
    project: ["Prestataire Ambassadeur", "Prestataire Engagé", "Prestataire Sensible", "Prestataire en Développement"],
  };
  const l = labels[role];
  if (score >= 80) return l[0];
  if (score >= 60) return l[1];
  if (score >= 40) return l[2];
  return l[3];
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getBarColor(score: number | null): string {
  if (score === null) return "bg-slate-300";
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-primary";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-400";
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, reason }: { status: string; reason?: string | null }) {
  if (status === "approved" || status === "active") {
    return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Publié</span>;
  }
  if (status === "rejected") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">Refusé</span>
        {reason && <p className="text-[10px] font-medium text-red-500 max-w-[160px] text-right leading-tight">{reason}</p>}
      </div>
    );
  }
  return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">En attente</span>;
}

// ─── ScoreBreakdown ───────────────────────────────────────────────────────────

function ScoreBreakdown({ profile, role }: { profile: AnyProfile; role: Role }) {
  const components = role === "eco_traveler"
    ? [
        { label: "Questionnaire", weight: "20%", value: profile.score_questionnaire, color: "bg-green-500" },
        { label: "Réservations", weight: "40%", value: profile.score_reservations, color: "bg-blue-500" },
        { label: "Feedbacks", weight: "20%", value: profile.score_feedbacks, color: "bg-orange-400" },
        { label: "Partages", weight: "20%", value: profile.score_partages ?? 0, color: "bg-purple-400" },
      ]
    : [
        { label: "Questionnaire", weight: "40%", value: profile.score_questionnaire, color: "bg-green-500" },
        { label: "Réservations", weight: "40%", value: profile.score_reservations, color: "bg-blue-500" },
        { label: "Feedbacks", weight: "20%", value: profile.score_feedbacks, color: "bg-orange-400" },
      ];

  return (
    <div className="mt-4 space-y-2.5">
      {components.map((c) => (
        <div key={c.label}>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">{c.label}</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{c.weight}</span>
            </div>
            <span className="text-xs font-extrabold text-slate-700">
              {c.value !== null && c.value !== undefined ? `${c.value}%` : "—"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${c.color} rounded-full transition-all duration-700`} style={{ width: `${c.value ?? 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ProjectTypeIcon ──────────────────────────────────────────────────────────

function ProjectTypeIcon({ types }: { types: string[] | null }) {
  const found = PROJECT_TYPES.find((t) => t.value === types?.[0]);
  return <span className="material-symbols-outlined text-2xl text-primary">{found?.icon ?? "domain"}</span>;
}

// ─── AddPublicationModal ──────────────────────────────────────────────────────

function AddPublicationModal({ onClose, onSuccess, token }: {
  onClose: () => void;
  onSuccess: (p: Publication) => void;
  token: string;
}) {
  const [step, setStep] = useState<"place" | "experience" | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", place_name: "", region: "", lat: null as number | null, lng: null as number | null });

  const inputClass = (hasErr: boolean) =>
    `w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${hasErr ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.title.trim()) { setTitleError("Le titre est obligatoire."); return; }
    setSubmitError("");
    setLoading(true);
    try {
      const created = await apiFetch<Publication>("/publications", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: step,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          place_name: form.place_name.trim() || undefined,
          region: form.region.trim() || undefined,
          latitude: form.lat ?? undefined,
          longitude: form.lng ?? undefined,
        }),
      });
      onSuccess(created);
    } catch (err: any) {
      setSubmitError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900">
            {step === null ? "Que voulez-vous partager ?" : step === "place" ? "Partager un lieu" : "Partager une expérience"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {step === null && (
          <div className="p-6 grid grid-cols-2 gap-4">
            <button onClick={() => setStep("place")} className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all">
              <MapPin className="w-8 h-8 text-primary" />
              <span className="font-extrabold text-slate-800">Un lieu</span>
              <span className="text-xs text-slate-400 text-center">Recommandez un endroit sur la carte</span>
            </button>
            <button onClick={() => setStep("experience")} className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all">
              <span className="material-symbols-outlined text-3xl text-primary">hiking</span>
              <span className="font-extrabold text-slate-800">Une expérience</span>
              <span className="text-xs text-slate-400 text-center">Partagez une aventure vécue</span>
            </button>
          </div>
        )}

        {step !== null && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Titre *</label>
              <input
                className={inputClass(!!titleError)}
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); setTitleError(""); }}
                placeholder={step === "place" ? "Oasis de Chebika, Djerba la Douce…" : "Trek dans le Jbel Chambi…"}
              />
              {titleError && <p className="text-xs font-semibold text-red-500">{titleError}</p>}
            </div>

            {step === "place" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    Cliquez sur la carte pour placer le lieu
                  </label>
                  <MapPicker lat={form.lat} lng={form.lng} onPick={(lat, lng) => setForm({ ...form, lat, lng })} />
                  {form.lat !== null && <p className="text-xs text-slate-400 font-medium">📍 {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Nom du lieu</label>
                    <input className={inputClass(false)} value={form.place_name} onChange={(e) => setForm({ ...form, place_name: e.target.value })} placeholder="Oasis de Chebika" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Région</label>
                    <input className={inputClass(false)} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Tozeur, Nabeul…" />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Description</label>
              <textarea
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={step === "place" ? "Pourquoi recommandez-vous ce lieu ?" : "Décrivez votre expérience…"}
                rows={3}
              />
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <span className="material-symbols-outlined text-base text-red-500">error</span>
                <p className="text-sm font-semibold text-red-600">{submitError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(null)} className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Retour
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-3 bg-primary text-slate-900 font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-60">
                {loading ? "Publication…" : "Publier"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── GuideOfferModal ──────────────────────────────────────────────────────────

function GuideOfferModal({ onClose, onSuccess, token }: {
  onClose: () => void;
  onSuccess: (o: Offer) => void;
  token: string;
}) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; price?: string }>({});
  const [form, setForm] = useState({ title: "", offer_type: "", description: "", price: "", duration: "", region: "" });

  const inputClass = (hasErr: boolean) =>
    `w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${hasErr ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: { title?: string; price?: string } = {};
    if (!form.title.trim()) errors.title = "Le titre est obligatoire.";
    else if (form.title.trim().length < 3) errors.title = "Le titre doit contenir au moins 3 caractères.";
    if (form.price && isNaN(Number(form.price))) errors.price = "Le prix doit être un nombre.";
    if (form.price && Number(form.price) < 0) errors.price = "Le prix ne peut pas être négatif.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitError("");
    setLoading(true);
    try {
      const created = await apiFetch<Offer>("/offers", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(),
          offer_type: form.offer_type || undefined,
          description: form.description.trim() || undefined,
          price: form.price ? Number(form.price) : undefined,
          duration: form.duration.trim() || undefined,
          region: form.region.trim() || undefined,
        }),
      });
      onSuccess(created);
    } catch (err: any) {
      setSubmitError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900">Ajouter une offre</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Titre de l'offre *</label>
            <input className={inputClass(!!fieldErrors.title)} value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); setFieldErrors((fe) => ({ ...fe, title: undefined })); }}
              placeholder="Randonnée dans le Jbel Zaghouan…" />
            {fieldErrors.title && <p className="text-xs font-semibold text-red-500">{fieldErrors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Type d'offre</label>
            <div className="grid grid-cols-2 gap-2">
              {GUIDE_OFFER_TYPES.map((t) => {
                const active = form.offer_type === t.value;
                return (
                  <button key={t.value} type="button"
                    onClick={() => setForm({ ...form, offer_type: active ? "" : t.value })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                    <span className="material-symbols-outlined text-base">{t.icon}</span>
                    {t.label}
                    {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium resize-none"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez votre offre…" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Prix (TND)</label>
              <input type="number" min="0" step="0.5" className={inputClass(!!fieldErrors.price)} value={form.price}
                onChange={(e) => { setForm({ ...form, price: e.target.value }); setFieldErrors((fe) => ({ ...fe, price: undefined })); }} placeholder="50" />
              {fieldErrors.price && <p className="text-xs font-semibold text-red-500">{fieldErrors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Durée</label>
              <input className={inputClass(false)} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="2h, 1 journée…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Région / Emplacement</label>
            <input className={inputClass(false)} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Tunis, Djerba, Sfax…" />
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="material-symbols-outlined text-base text-red-500">error</span>
              <p className="text-sm font-semibold text-red-600">{submitError}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-primary text-slate-900 font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60">
            {loading ? "Publication en cours…" : "Publier l'offre"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── ProjectOfferModal ────────────────────────────────────────────────────────

function ProjectOfferModal({ onClose, onSuccess, token, projects }: {
  onClose: () => void;
  onSuccess: (o: Offer) => void;
  token: string;
  projects: Project[];
}) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; price?: string }>({});
  const [form, setForm] = useState({ title: "", offer_type: "", project_id: "", description: "", price: "", duration: "", region: "" });

  const inputClass = (hasErr: boolean) =>
    `w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${hasErr ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`;

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: { title?: string; price?: string } = {};
    if (!form.title.trim()) errors.title = "Le titre est obligatoire.";
    else if (form.title.trim().length < 3) errors.title = "Le titre doit contenir au moins 3 caractères.";
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) errors.price = "Le prix doit être un nombre positif.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmitError("");
    setLoading(true);
    try {
      const created = await apiFetch<Offer>("/offers", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(),
          offer_type: form.offer_type || undefined,
          project_id: form.project_id || undefined,
          description: form.description.trim() || undefined,
          price: form.price ? Number(form.price) : undefined,
          duration: form.duration.trim() || undefined,
          region: form.region.trim() || undefined,
          author_type: "project_owner",
        }),
      });
      onSuccess(created);
    } catch (err: any) {
      setSubmitError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900">Ajouter une offre</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Titre de l'offre *</label>
            <input className={inputClass(!!fieldErrors.title)} value={form.title}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); setFieldErrors((fe) => ({ ...fe, title: undefined })); }}
              placeholder="Week-end éco-lodge, Circuit des oasis…" />
            {fieldErrors.title && <p className="text-xs font-semibold text-red-500">{fieldErrors.title}</p>}
          </div>

          {(() => {
            const activeProjects = projects.filter((p) => p.status === "active");
            return (
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Projet associé</label>
                {activeProjects.length === 0 ? (
                  <p className="text-xs font-medium text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
                    Aucun projet validé. Vos projets doivent être approuvés par l'admin avant de pouvoir y lier une offre.
                  </p>
                ) : (
                  <select className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium"
                    value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                    <option value="">— Aucun projet spécifique —</option>
                    {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
            );
          })()}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Type d'offre</label>
            <div className="flex flex-wrap gap-2">
              {PROJ_OFFER_TYPES.map((t) => {
                const active = form.offer_type === t.value;
                return (
                  <button key={t.value} type="button"
                    onClick={() => setForm({ ...form, offer_type: active ? "" : t.value })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/30"}`}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium resize-none"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Décrivez votre offre éco-touristique…" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Prix (TND)</label>
              <input type="number" min="0" step="0.01" className={inputClass(!!fieldErrors.price)} value={form.price}
                onChange={(e) => { setForm({ ...form, price: e.target.value }); setFieldErrors((fe) => ({ ...fe, price: undefined })); }} placeholder="150" />
              {fieldErrors.price && <p className="text-xs font-semibold text-red-500">{fieldErrors.price}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Durée</label>
              <input className={inputClass(false)} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="2 jours, 1 semaine…" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Région / Emplacement</label>
            <input className={inputClass(false)} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Tunis, Djerba, Sfax…" />
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="material-symbols-outlined text-base text-red-500">error</span>
              <p className="text-sm font-semibold text-red-600">{submitError}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-primary text-slate-900 font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60">
            {loading ? "Création en cours…" : "Publier l'offre"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── AddProjectModal ──────────────────────────────────────────────────────────

const PHONE_RE = /^(\+216|00216)?[2-9]\d{7}$|^\+?[0-9\s\-().]{7,20}$/;
const URL_RE = /^https?:\/\/.+\..+/;

async function uploadImage(file: File, token: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error("Upload échoué");
  return ((await res.json()) as { url: string }).url;
}

function AddProjectModal({ onClose, onSuccess, token }: {
  onClose: () => void;
  onSuccess: (p: Project) => void;
  token: string;
}) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; website?: string; region?: string }>({});
  const [form, setForm] = useState({
    name: "", project_types: [] as string[], description: "", region: "", address: "",
    website: "", phone: "", eco_labels: [] as string[], services: [] as string[],
    opening_hours: "", facebook: "", instagram: "",
  });
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [coverIdx, setCoverIdx] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);

  const toggle = (key: "project_types" | "eco_labels" | "services", v: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

  function addImages(files: FileList | null) {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files).map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setCoverIdx((c) => (c >= idx && c > 0 ? c - 1 : c));
  }

  function validate() {
    const errors: { name?: string; phone?: string; website?: string; region?: string } = {};
    if (!form.name.trim()) errors.name = "Le nom du projet est obligatoire.";
    else if (form.name.trim().length < 2) errors.name = "Le nom doit contenir au moins 2 caractères.";
    if (form.phone && !PHONE_RE.test(form.phone.replace(/\s/g, ""))) errors.phone = "Numéro de téléphone invalide.";
    if (form.website && !URL_RE.test(form.website)) errors.website = "L'URL doit commencer par http:// ou https://";
    if (form.region && form.region.trim().length === 1) errors.region = "La région doit contenir au moins 2 caractères.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError("");
    setLoading(true);
    try {
      const uploaded = await Promise.all(images.map((img) => uploadImage(img.file, token)));
      const ordered = uploaded.length ? [uploaded[coverIdx], ...uploaded.filter((_, i) => i !== coverIdx)] : [];
      const created = await apiFetch<Project>("/project-owner/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          project_type: form.project_types.length ? form.project_types : undefined,
          description: form.description.trim() || undefined,
          region: form.region.trim() || undefined,
          address: form.address.trim() || undefined,
          website: form.website.trim() || undefined,
          phone: form.phone.trim() || undefined,
          eco_labels: form.eco_labels.length ? form.eco_labels : undefined,
          services: form.services.length ? form.services : undefined,
          opening_hours: form.opening_hours.trim() || undefined,
          facebook: form.facebook.trim() || undefined,
          instagram: form.instagram.trim() || undefined,
          lat: mapLat ?? undefined,
          lng: mapLng ?? undefined,
          photos: ordered.length ? ordered : undefined,
        }),
      });
      onSuccess(created);
    } catch (err: any) {
      setSubmitError(err.message || "Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const fc = (hasErr: boolean) =>
    `w-full px-4 py-3 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 transition-all ${hasErr ? "bg-red-50 border border-red-400 focus:ring-red-300" : "bg-slate-50 border border-transparent focus:ring-primary"}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900">Ajouter un projet</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Photos */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Photos du projet</label>
            <label htmlFor="proj-images" className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all bg-slate-50/70">
              <span className="material-symbols-outlined text-slate-300 text-3xl">add_photo_alternate</span>
              <p className="text-xs font-semibold text-slate-400">Cliquez pour ajouter des photos</p>
              <input id="proj-images" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
            </label>
            {images.length > 0 && (
              <>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {images.map((img, i) => (
                    <div key={i} onClick={() => setCoverIdx(i)}
                      className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${i === coverIdx ? "border-primary shadow-md" : "border-transparent hover:border-slate-300"}`}>
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      {i === coverIdx && <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none">Cover</div>}
                      <button type="button" onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(img.preview); removeImage(i); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Cliquez sur une photo pour la définir comme cover.</p>
              </>
            )}
          </div>

          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Nom du projet *</label>
            <input value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFieldErrors((fe) => ({ ...fe, name: undefined })); }}
              placeholder="Éco-Lodge Sahara, Restaurant Terroir…" className={fc(!!fieldErrors.name)} />
            {fieldErrors.name && <p className="text-xs font-semibold text-red-500">{fieldErrors.name}</p>}
          </div>

          {/* Types */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Type de projet <span className="ml-1.5 text-xs font-normal text-slate-400">(plusieurs choix possibles)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map((t) => {
                const active = form.project_types.includes(t.value);
                return (
                  <button key={t.value} type="button" onClick={() => toggle("project_types", t.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                    <span className="material-symbols-outlined text-base">{t.icon}</span>{t.label}
                    {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Décrivez votre projet éco-touristique…"
              className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium resize-none" />
          </div>

          {/* Région */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Région</label>
            <input value={form.region} onChange={(e) => { setForm((f) => ({ ...f, region: e.target.value })); setFieldErrors((fe) => ({ ...fe, region: undefined })); }}
              placeholder="Tataouine, Djerba…" className={fc(!!fieldErrors.region)} />
            {fieldErrors.region && <p className="text-xs font-semibold text-red-500">{fieldErrors.region}</p>}
          </div>

          {/* Phone + Website */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Téléphone</label>
              <input type="tel" value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setFieldErrors((fe) => ({ ...fe, phone: undefined })); }}
                placeholder="+216 XX XXX XXX" className={fc(!!fieldErrors.phone)} />
              {fieldErrors.phone && <p className="text-xs font-semibold text-red-500">{fieldErrors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Site web</label>
              <input value={form.website} onChange={(e) => { setForm((f) => ({ ...f, website: e.target.value })); setFieldErrors((fe) => ({ ...fe, website: undefined })); }}
                placeholder="https://mon-projet.tn" className={fc(!!fieldErrors.website)} />
              {fieldErrors.website && <p className="text-xs font-semibold text-red-500">{fieldErrors.website}</p>}
            </div>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Services proposés <span className="ml-1.5 text-xs font-normal text-slate-400">(plusieurs choix possibles)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_SERVICES.map((s) => {
                const active = form.services.includes(s.value);
                return (
                  <button key={s.value} type="button" onClick={() => toggle("services", s.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}>
                    <span className="material-symbols-outlined text-base">{s.icon}</span>{s.label}
                    {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">Localisation</label>
              <button type="button" onClick={() => setShowMap((v) => !v)} className="text-xs font-bold text-primary hover:underline">
                {showMap ? "Masquer la carte" : "Choisir sur la carte"}
              </button>
            </div>
            <input readOnly value={form.address} placeholder="Auto-rempli par la carte…"
              className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-slate-500 font-medium cursor-default" />
            {showMap && (
              <MapPicker lat={mapLat} lng={mapLng} onPick={(lat, lng, address) => {
                setMapLat(lat); setMapLng(lng);
                setForm((f) => ({ ...f, address: address ?? "" }));
              }} />
            )}
          </div>

          {/* Horaires */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Horaires d'ouverture</label>
            <input value={form.opening_hours} onChange={(e) => setForm((f) => ({ ...f, opening_hours: e.target.value }))}
              placeholder="Lun-Sam 9h-19h"
              className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
          </div>

          {/* Réseaux sociaux */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Facebook</label>
              <input value={form.facebook} onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))} placeholder="https://facebook.com/..."
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Instagram</label>
              <input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="https://instagram.com/..."
                className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium" />
            </div>
          </div>

          {/* Éco-pratiques */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Pratiques éco-responsables</label>
            <div className="flex flex-wrap gap-2">
              {ECO_PRACTICES.map((p) => {
                const active = form.eco_labels.includes(p);
                return (
                  <button key={p} type="button" onClick={() => toggle("eco_labels", p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-green-50 border-green-400 text-green-700" : "border-slate-200 text-slate-500 hover:border-green-300"}`}>
                    {active && <Check className="w-3 h-3" />}{p}
                  </button>
                );
              })}
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="material-symbols-outlined text-base text-red-500">error</span>
              <p className="text-sm font-semibold text-red-600">{submitError}</p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-primary text-slate-900 font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60">
            {loading ? "Création en cours…" : "Créer le projet"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<AnyProfile | null>(null);
  const [activeItem, setActiveItem] = useState("Tableau de bord");
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [token, setToken] = useState("");
  const [publications, setPublications] = useState<Publication[]>([]);
  const [showAddPublication, setShowAddPublication] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  type DashConv = { id: string; other_user: { full_name: string | null; photo: string | null }; last_message: { content: string; is_mine: boolean } | null; unread_count: number };
  const [dashConvos, setDashConvos] = useState<DashConv[]>([]);

  type DashNotif = { id: string; type: string; data: Record<string, any>; is_read: boolean; created_at: string };
  type NotifOffer = OfferFull & { price_type?: string | null; status?: string; };
  const [notifications, setNotifications] = useState<DashNotif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [expandedNotif, setExpandedNotif] = useState<string | null>(null);
  const [notifVisible, setNotifVisible] = useState(5);
  const [respondingNotif, setRespondingNotif] = useState<string | null>(null);
  const [notifResponses, setNotifResponses] = useState<Record<string, "accepted" | "declined">>({});
  const [notifOffers, setNotifOffers] = useState<Record<string, NotifOffer>>({});
  const [loadingOffer, setLoadingOffer] = useState<string | null>(null);
  const [notifMenuOpen, setNotifMenuOpen] = useState<string | null>(null);
  const [failedOfferIds, setFailedOfferIds] = useState<Set<string>>(new Set());
  const [notifToast, setNotifToast] = useState<string | null>(null);
  const [collabModal, setCollabModal] = useState<{ collabId: string; offerId: string; section: string; inviterName?: string } | null>(null);
  const fetchedOfferIds = useRef<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const storedUser = localStorage.getItem("user");
      const tkn = localStorage.getItem("access_token");
      if (!storedUser || !tkn) { router.push("/auth/login"); return; }

      try {
        const parsedUser = JSON.parse(storedUser) as { role: string };
        if (parsedUser.role === "admin") { router.push("/admin"); return; }
        const userRole = parsedUser.role as Role;
        if (!["eco_traveler", "guide", "project"].includes(userRole)) {
          router.push("/auth/login"); return;
        }
        setRole(userRole);
        setToken(tkn);
        apiFetch<DashConv[]>("/messages/conversations", { headers: { Authorization: `Bearer ${tkn}` } })
          .then(setDashConvos).catch(() => {});
        apiFetch<DashNotif[]>("/notifications", { headers: { Authorization: `Bearer ${tkn}` } })
          .then(setNotifications).catch(() => {});

        const apiPath = userRole === "eco_traveler" ? "/eco-traveler/profile"
          : userRole === "guide" ? "/guide/profile"
          : "/project-owner/profile";
        const onboardingPath = userRole === "eco_traveler" ? "/onboarding/eco-traveler"
          : userRole === "guide" ? "/onboarding/guide"
          : "/onboarding/project-owner";

        try {
          const p = await apiFetch<AnyProfile>(apiPath, { headers: { Authorization: `Bearer ${tkn}` } });
          setProfile(p);
          if (!p?.is_onboarded) { router.push(onboardingPath); return; }
        } catch {
          router.push(onboardingPath); return;
        }

        if (userRole === "eco_traveler") {
          try {
            const pubs = await apiFetch<Publication[]>("/publications/mine", { headers: { Authorization: `Bearer ${tkn}` } });
            setPublications(pubs);
          } catch {}
        } else if (userRole === "guide") {
          try {
            const myOffers = await apiFetch<Offer[]>("/guide/offers", { headers: { Authorization: `Bearer ${tkn}` } });
            setOffers(myOffers);
          } catch {}
        } else if (userRole === "provider") {
          try {
            const myOffers = await apiFetch<Offer[]>("/offers/mine", { headers: { Authorization: `Bearer ${tkn}` } });
            setOffers(myOffers);
          } catch {}
        }
      } catch {
        router.push("/auth/login");
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

  async function handleDeletePublication(id: string) {
    if (!confirm("Supprimer cette publication ?")) return;
    try {
      await apiFetch(`/publications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPublications((prev) => prev.filter((p) => p.id !== id));
    } catch { alert("Erreur lors de la suppression."); }
  }

  async function handleDeleteOffer(id: string) {
    if (!confirm("Supprimer cette offre ?")) return;
    try {
      await apiFetch(`/offers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } catch { alert("Erreur lors de la suppression."); }
  }

  async function handleDeleteProject(projectId: string) {
    if (!confirm("Supprimer ce projet ?")) return;
    try {
      await apiFetch(`/project-owner/projects/${projectId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setProfile((prev) => prev ? { ...prev, projects: prev.projects?.filter((p) => p.id !== projectId) } : prev);
    } catch { alert("Erreur lors de la suppression."); }
  }

  const navItems = role === "eco_traveler"
    ? [
        { label: "Tableau de bord", icon: "dashboard" },
        { label: "Mes Publications", icon: "public" },
        { label: "Mes Voyages", icon: "map" },
        { label: "Impact Éco", icon: "energy_savings_leaf" },
        { label: "Favoris", icon: "favorite" },
        { label: "Paramètres", icon: "settings" },
      ]
    : role === "guide"
    ? [
        { label: "Tableau de bord", icon: "dashboard" },
        { label: "Mes Offres", icon: "sell" },
        { label: "Réservations", icon: "event_available" },
        { label: "Mes Avis", icon: "star" },
        { label: "Certifications", icon: "verified" },
        { label: "Paramètres", icon: "settings" },
      ]
    : [
        { label: "Tableau de bord", icon: "dashboard" },
        { label: "Mes Projets", icon: "domain" },
        { label: "Mes Offres", icon: "sell" },
        { label: "Réservations", icon: "event_available" },
        { label: "Avis reçus", icon: "star" },
        { label: "Certifications", icon: "verified" },
        { label: "Paramètres", icon: "settings" },
      ];

  const score = profile?.sustainability_score ?? null;
  const scoreWidth = score !== null ? `${score}%` : "0%";
  const badgeConfig = role ? BADGE_CONFIGS[role] : [];
  const obtainedBadgeLabels = new Set((profile?.badges ?? []).map((b) => b.label));
  const profilePath = role === "eco_traveler" ? "/profile/ecovoyageur"
    : role === "guide" ? "/profile/guide"
    : "/profile/project-owner";
  const questionnairePath = role === "eco_traveler" ? "/questionnaire/eco-traveler"
    : role === "guide" ? "/questionnaire/guide"
    : "/questionnaire/project-owner";
  const searchPlaceholder = role === "eco_traveler" ? "Rechercher un guide, un projet éco…"
    : role === "guide" ? "Rechercher un projet éco-touristique…"
    : "Rechercher un guide certifié…";

  type SearchResult = { user_id: string; full_name: string; photo: string | null; zone?: string | null; organization?: string | null; guide_type?: string | null; sustainability_score?: number | null };
  const [searchQ, setSearchQ]         = useState("");
  const [searchRes, setSearchRes]     = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen]   = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQ.trim() || !token) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const enc = encodeURIComponent(searchQ);
        if (role === "eco_traveler") {
          const [guides, owners] = await Promise.all([
            apiFetch<SearchResult[]>(`/guide/public/search?q=${enc}`).catch(() => []),
            apiFetch<SearchResult[]>(`/project-owner/public/search?q=${enc}`).catch(() => []),
          ]);
          setSearchRes([...guides.map((g) => ({ ...g, _type: "guide" })), ...owners.map((o) => ({ ...o, _type: "project" }))]);
        } else if (role === "guide") {
          const owners = await apiFetch<SearchResult[]>(`/project-owner/public/search?q=${enc}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []);
          setSearchRes(owners.map((o) => ({ ...o, _type: "project" })));
        } else {
          const guides = await apiFetch<SearchResult[]>(`/guide/public/search?q=${enc}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => []);
          setSearchRes(guides.map((g) => ({ ...g, _type: "guide" })));
        }
      } finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQ, token, role]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) { setNotifOpen(false); setNotifVisible(5); }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function markNotifRead(id: string) {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }

  async function markNotifUnread(id: string) {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n));
    await apiFetch(`/notifications/${id}/unread`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }

  async function markAllNotifsRead() {
    if (!token) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await apiFetch("/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }

  async function fetchNotifOffer(offerId: string) {
    if (notifOffers[offerId] || fetchedOfferIds.current.has(offerId)) return;
    fetchedOfferIds.current.add(offerId);
    setLoadingOffer(offerId);
    try {
      const offer = await apiFetch<NotifOffer>(`/guide/offers/${offerId}/detail`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifOffers((prev) => ({ ...prev, [offerId]: offer }));
    } catch {
      setFailedOfferIds((prev) => new Set([...prev, offerId]));
    } finally {
      setLoadingOffer(null);
    }
  }

  async function deleteNotif(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (expandedNotif === id) setExpandedNotif(null);
    setNotifMenuOpen(null);
    await apiFetch(`/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }

  async function reportNotif(id: string) {
    setNotifMenuOpen(null);
    markNotifRead(id);
    await apiFetch(`/notifications/${id}/report`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setNotifToast("Signalement envoyé. Merci pour votre retour.");
    setTimeout(() => setNotifToast(null), 3000);
  }

  async function respondToInvite(notifId: string, collabId: string, offerId: string, section: string, status: "accepted" | "declined") {
    if (!token || respondingNotif) return;
    setRespondingNotif(notifId);
    try {
      await apiFetch(`/guide/collaborations/${collabId}/respond`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setNotifResponses((prev) => ({ ...prev, [notifId]: status }));
      markNotifRead(notifId);
      if (status === "accepted") {
        const n = notifications.find((x) => x.id === notifId);
        setCollabModal({
          collabId,
          offerId,
          section,
          inviterName: n?.data?.inviter_name as string | undefined,
        });
      }
    } catch { /* non-bloquant */ } finally {
      setRespondingNotif(null);
    }
  }

  function notifLabel(n: DashNotif): { title: string; body: string } {
    const sectionLabel: Record<string, string> = {
      hebergement: "hébergement", restauration: "restauration",
      transport: "transport", guide: "guidage", autre: "autre",
    };
    if (n.type === "collaboration_invite") {
      const section = n.data.section ?? "";
      const inviter = n.data.inviter_name ?? "Un guide";
      const offerTitle = n.data.offer_title ?? "une offre";
      return {
        title: "Invitation à collaborer",
        body: `${inviter} vous invite pour la section « ${sectionLabel[section] ?? section} » de l'offre « ${offerTitle} »`,
      };
    }
    if (n.type === "collab_accepted") {
      const name = n.data.invited_user_name ?? "Un collaborateur";
      const section = n.data.section ?? "";
      const offerTitle = n.data.offer_title ?? "votre offre";
      return {
        title: "Collaboration acceptée ✓",
        body: `${name} a accepté votre invitation pour la section « ${sectionLabel[section] ?? section} » de « ${offerTitle} »`,
      };
    }
    if (n.type === "collab_declined") {
      const name = n.data.invited_user_name ?? "Un collaborateur";
      const section = n.data.section ?? "";
      const offerTitle = n.data.offer_title ?? "votre offre";
      return {
        title: "Collaboration refusée",
        body: `${name} a refusé votre invitation pour la section « ${sectionLabel[section] ?? section} » de « ${offerTitle} »`,
      };
    }
    if (n.type === "collab_quit") {
      const name = n.data.invited_user_name ?? "Un collaborateur";
      const section = n.data.section ?? "";
      const offerTitle = n.data.offer_title ?? "votre offre";
      return {
        title: "Collaborateur retiré",
        body: `${name} a quitté la collaboration pour la section « ${sectionLabel[section] ?? section} » de « ${offerTitle} »`,
      };
    }
    if (n.type === "offer_deleted") {
      const offerTitle = n.data.offer_title ?? "une offre";
      return {
        title: "Offre supprimée",
        body: `L'offre « ${offerTitle} » à laquelle vous collaboriez a été supprimée.`,
      };
    }
    if (n.type === "offer_schedule_changed") {
      const section = sectionLabel[n.data?.section ?? ""] ?? (n.data?.section ?? "");
      const offerTitle = n.data?.offer_title ?? "une offre";
      return {
        title: "Horaires mis à jour",
        body: `Les horaires de « ${offerTitle} » (${section}) ont changé. Votre agenda a été synchronisé automatiquement.`,
      };
    }
    if (n.type === "offer_schedule_conflict") {
      const section = sectionLabel[n.data?.section ?? ""] ?? (n.data?.section ?? "");
      const offerTitle = n.data?.offer_title ?? "une offre";
      return {
        title: "Conflit d'agenda",
        body: `Les horaires de « ${offerTitle} » (${section}) créent un conflit avec votre agenda. Réglez votre agenda.`,
      };
    }
    return { title: "Notification", body: n.data?.message ?? "" };
  }

  if (!role || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

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
                <button key={item.label} onClick={() => setActiveItem(item.label)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeItem === item.label
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <button onClick={() => router.push("/messagerie")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-symbols-outlined">chat</span>
                <span>Messagerie</span>
                {dashConvos.reduce((s, c) => s + c.unread_count, 0) > 0 && (
                  <span className="ml-auto bg-primary text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    {dashConvos.reduce((s, c) => s + c.unread_count, 0)}
                  </span>
                )}
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-symbols-outlined">logout</span>
                <span>Déconnexion</span>
              </button>
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profil complété</p>
                <p className="text-xs font-extrabold text-primary">{profile.profile_completion}%</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${profile.profile_completion}%` }} />
              </div>
            </div>

            {/* Role-specific CTAs */}
            {role === "eco_traveler" && (
              <button onClick={() => router.push(questionnairePath)}
                className="mt-4 w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">add_location_alt</span>
                Réserver un voyage
              </button>
            )}
            {role === "guide" && (
              <button onClick={() => router.push(questionnairePath)}
                className="mt-4 w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">quiz</span>
                {score === null ? "Passer l'évaluation" : "Voir mon score"}
              </button>
            )}
            {role === "project" && (
              <button onClick={() => router.push(questionnairePath)}
                className="mt-4 w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">quiz</span>
                {score === null ? "Passer l'évaluation" : "Voir mon score"}
              </button>
            )}
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="flex-1 ml-72">

          <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-primary/10 px-10 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-12 shrink-0">
              <h2 className="text-2xl font-bold whitespace-nowrap">
                Bonjour, {profile.full_name || (role === "guide" ? "Guide" : role === "project" ? "Prestataire" : "Voyageur")} 👋
              </h2>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-5 py-2 gap-2 whitespace-nowrap">
                <span className="material-symbols-outlined text-primary text-base">
                  {role === "project" ? "domain_verification" : "verified_user"}
                </span>
                <span className="text-sm font-semibold">
                  {score !== null ? getScoreLabel(score, role) : role === "eco_traveler" ? "Nouveau voyageur" : "Évaluation en attente"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-1 justify-end">
              <div className="relative w-full max-w-md" ref={searchRef}>
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder={searchPlaceholder}
                  value={searchQ}
                  onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                />
                <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl">search</span>
                {searchQ && (
                  <button onClick={() => { setSearchQ(""); setSearchRes([]); }}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}

                {/* Dropdown */}
                {searchOpen && searchQ.trim() && (
                  <div className="absolute top-12 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden max-h-80 overflow-y-auto">
                    {searchLoading && (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-400 font-medium">
                        <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Recherche…
                      </div>
                    )}
                    {!searchLoading && searchRes.length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-400 italic">Aucun résultat pour "{searchQ}"</p>
                    )}
                    {!searchLoading && searchRes.map((r: any) => (
                      <button key={r.user_id}
                        onClick={() => { router.push(`/profile/${r._type === "guide" ? "guide" : "project-owner"}/${r.user_id}`); setSearchOpen(false); setSearchQ(""); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                          {r.photo
                            ? <img src={r.photo} alt={r.full_name} className="w-full h-full object-cover" />
                            : <span className="material-symbols-outlined text-slate-400 text-base">{r._type === "guide" ? "person" : "business"}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-800 text-sm truncate">{r.full_name}</p>
                          <p className="text-xs text-slate-400 font-medium truncate">
                            {r._type === "guide" ? `Guide${r.zone ? ` · ${r.zone}` : ""}` : `Prestataire${r.organization ? ` · ${r.organization}` : ""}`}
                          </p>
                        </div>
                        {r.sustainability_score !== null && r.sustainability_score !== undefined && (
                          <span className="shrink-0 text-[10px] font-black text-primary ml-auto">🌿 {r.sustainability_score}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div ref={notifRef} className="relative shrink-0">
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  className="size-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary transition-colors relative"
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {notifications.filter((n) => !n.is_read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {notifications.filter((n) => !n.is_read).length > 9 ? "9+" : notifications.filter((n) => !n.is_read).length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl">
                      <span className="font-semibold text-sm">Notifications</span>
                      {notifications.some((n) => !n.is_read) && (
                        <button onClick={markAllNotifsRead} className="text-xs text-primary hover:underline">
                          Tout marquer lu
                        </button>
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
                          const { title, body } = notifLabel(n);
                          const isUnread = !n.is_read && !notifResponses[n.id];
                          const menuOpen = notifMenuOpen === `bell-${n.id}`;
                          const openUp = nIdx >= Math.min(notifVisible, notifications.length) - 2;
                          return (
                            <div key={n.id} className={`relative flex gap-3 items-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isUnread ? "bg-primary/5" : ""}`}>
                              <div className="flex-1 min-w-0 flex gap-3 items-start" onClick={() => {
                                if (!n.is_read) markNotifRead(n.id);
                                setNotifOpen(false);
                                const base = role === "guide" ? "/profile/guide" : "/profile/provider";
                                if (n.type === "collaboration_invite") {
                                  const collabId = n.data?.collab_id as string | undefined;
                                  router.push(collabId ? `${base}?tab=collaborations&openCollab=${collabId}` : `${base}?tab=collaborations`);
                                } else if (["collab_accepted", "collab_declined", "collab_quit"].includes(n.type)) {
                                  const offerId = n.data?.offer_id as string | undefined;
                                  router.push(offerId ? `/profile/guide?tab=offres&openOffer=${offerId}` : "/profile/guide?tab=offres");
                                } else if (n.type === "offer_schedule_conflict") {
                                  router.push(`${base}?tab=agenda`);
                                } else if (n.type === "offer_schedule_changed") {
                                  router.push(`${base}?tab=collaborations`);
                                }
                              }}>
                                <span className={`mt-0.5 material-symbols-outlined text-lg shrink-0 ${isUnread ? "text-primary" : "text-slate-400"}`}>
                                  {n.type === "collaboration_invite" ? "handshake" : n.type === "collab_accepted" ? "check_circle" : n.type === "collab_declined" ? "cancel" : n.type === "collab_quit" ? "person_remove" : n.type === "offer_deleted" ? "delete_forever" : n.type === "offer_schedule_conflict" ? "event_busy" : n.type === "offer_schedule_changed" ? "event_available" : "notifications"}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold truncate ${isUnread ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                    {title}
                                  </p>
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
                                    <button onClick={(e) => { e.stopPropagation(); reportNotif(n.id); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-base text-amber-400">flag</span>Signaler
                                    </button>
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
                        <button
                          onClick={() => setNotifVisible((v) => v + 5)}
                          className="w-full py-2.5 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors"
                        >
                          Voir plus ({notifications.length - notifVisible} restantes)
                        </button>
                      </div>
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-800 rounded-b-2xl overflow-hidden">
                      <button
                        onClick={() => { setNotifOpen(false); router.push("/notifications"); }}
                        className="w-full py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Voir toutes les notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />
              <button onClick={() => router.push(profilePath)}
                className="size-11 rounded-full bg-slate-200 border-2 border-primary overflow-hidden shrink-0 hover:opacity-80 transition-opacity" title="Voir mon profil">
                {profile.photo ? (
                  <img src={profile.photo} alt="Photo de profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                  </div>
                )}
              </button>
            </div>
          </header>

          <div className="p-8">

            {/* ── Tableau de bord ───────────────────────────────────────── */}
            {activeItem === "Tableau de bord" && (
              <>
                {/* Questionnaire banner */}
                {score === null && (
                  <div className="mb-6 p-5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-2xl">quiz</span>
                      <div>
                        <p className="font-bold text-slate-800">
                          {role === "eco_traveler" ? "Passez votre test de durabilité" : "Passez votre évaluation de durabilité"}
                        </p>
                        <p className="text-sm text-slate-500 font-medium">
                          {role === "eco_traveler"
                            ? "Obtenez votre score initial et des recommandations personnalisées."
                            : "Obtenez votre score et valorisez votre profil auprès des voyageurs."}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => router.push(questionnairePath)}
                      className="px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                      Commencer →
                    </button>
                  </div>
                )}

                {/* Stats grid */}
                <div className={`grid grid-cols-1 md:grid-cols-2 ${role === "eco_traveler" ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-6 mb-8`}>

                  {/* Score card */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col justify-between lg:col-span-2">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-slate-500 text-sm font-medium">Score de durabilité</p>
                        <h3 className={`text-3xl font-extrabold mt-1 ${getScoreColor(score)}`}>
                          {score !== null ? score : "—"}
                          {score !== null && <span className="text-slate-400 text-lg font-normal">/100</span>}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/20 p-2 rounded-lg text-primary">
                          <span className="material-symbols-outlined">analytics</span>
                        </div>
                        <button onClick={() => setShowScoreDetail((v) => !v)}
                          className="text-xs text-slate-400 hover:text-primary font-bold transition-colors">
                          <span className="material-symbols-outlined text-lg">{showScoreDetail ? "expand_less" : "expand_more"}</span>
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${getBarColor(score)} rounded-full transition-all duration-1000`} style={{ width: scoreWidth }} />
                    </div>
                    <p className="text-xs font-bold mt-2" style={{ color: score !== null ? (score >= 60 ? "#22c55e" : "#f97316") : "#94a3b8" }}>
                      {score !== null ? getScoreLabel(score, role) : "Questionnaire non complété"}
                    </p>
                    {showScoreDetail && <ScoreBreakdown profile={profile} role={role} />}
                  </div>

                  {/* eco_traveler stats */}
                  {role === "eco_traveler" && (
                    <>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-sm font-medium">Expériences créées</p>
                            <h3 className="text-3xl font-extrabold mt-1">{publications.filter((p) => p.type === "experience").length}</h3>
                          </div>
                          <div className="bg-teal-500/10 p-2 rounded-lg text-teal-500"><span className="material-symbols-outlined">hiking</span></div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-sm font-medium">Lieux créés</p>
                            <h3 className="text-3xl font-extrabold mt-1">{publications.filter((p) => p.type === "place").length}</h3>
                          </div>
                          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><span className="material-symbols-outlined">location_on</span></div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-sm font-medium">Réservations</p>
                            <h3 className="text-3xl font-extrabold mt-1">{profile.reservations_made ?? 0}</h3>
                          </div>
                          <div className="bg-green-500/10 p-2 rounded-lg text-green-500"><span className="material-symbols-outlined">task_alt</span></div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* guide stats */}
                  {role === "guide" && (
                    <>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-sm font-medium">Réservations gérées</p>
                            <h3 className="text-3xl font-extrabold mt-1">{profile.reservations_handled ?? 0}</h3>
                          </div>
                          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><span className="material-symbols-outlined">event_available</span></div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-sm font-medium">Avis reçus</p>
                            <h3 className="text-3xl font-extrabold mt-1">{profile.feedback_received ?? 0}</h3>
                          </div>
                          <div className="bg-green-500/10 p-2 rounded-lg text-green-500"><span className="material-symbols-outlined">star</span></div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* project stats */}
                  {role === "project" && (
                    <>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-sm font-medium">Projets actifs</p>
                            <h3 className="text-3xl font-extrabold mt-1">{profile.projects?.length ?? 0}</h3>
                          </div>
                          <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><span className="material-symbols-outlined">domain</span></div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-slate-500 text-sm font-medium">Réservations reçues</p>
                            <h3 className="text-3xl font-extrabold mt-1">{profile.total_reservations ?? 0}</h3>
                          </div>
                          <div className="bg-green-500/10 p-2 rounded-lg text-green-500"><span className="material-symbols-outlined">event_available</span></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Content + Badges */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                  {/* Left column: role-specific content */}
                  <div className="lg:col-span-2">

                    {/* eco_traveler: Plans de voyage */}
                    {role === "eco_traveler" && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold">Mes Plans de Voyage</h3>
                          <a className="text-primary font-bold text-sm hover:underline" href="#">Voir tout</a>
                        </div>
                        <div className="space-y-4">
                          {[
                            { title: "Randonnée durable à Zaghouan", badge: "Randonnée", badgeColor: "bg-green-100 text-green-700", date: "14 - 15 Oct. • 4 participants", status: "Confirmé", statusColor: "bg-green-500", eco: "A+", icon: "hiking", tag: "Zéro déchet", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBD5akWau1kblm8fq7Tx2Gb_0_xLp3mQzhBkmRMTCwP4gTD9CSQAANQlL0YDLaTPuPJRU6KvcFPO6k2Z0XaqbQoKbMAOK5WBHeMHMnt1TRMgl1Y7aUZFQNg1FT4jZWgn0Wrxv71JI-UPJCAjt8_4-3bzG2SNsAgq_Ftpl-L1bToKH-hqsogDzYBKSTbxXhEQLfsVHEB_B4TUu3cTA9B7ioPh1f6qctmXGcTpXYceiy91_3s4bDfyCVRUFpnILZV0dgP9ZKtZF0fa6A" },
                            { title: "Séjour nature à Aïn Draham", badge: "Plan partagé", badgeColor: "bg-blue-100 text-blue-700", date: "22 - 25 Oct. • 2 participants", status: "En cours", statusColor: "bg-orange-400", eco: "A", icon: "cottage", tag: "Éco-gîte", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBPCrg1ZmXVLbEPD-8lp6H0mdqw8OUDeijVrAZTFq0zto2v3-_cD4n4oGhCFYORXsbpOhhim9BsoK6fLjA3KZ4WXULIFZ4GtIDPiqVEGjsr2jqkm0Eo5SO102iyX57ppBgj1gpfLy_3nCiWbRpyYAzfzsG-z1YeqFFSsfqFDlXhUdy0YrGeHUEP4uCOZxSFvr0V9ZOTlmb9te0xg3vgZkiVH0xWtqyukLVEbUxYn580NOCZ7P712ArePj4isI0atUXHzpvfrtqTrpw" },
                            { title: "Week-end éco en groupe à Tozeur", badge: "Groupe", badgeColor: "bg-orange-100 text-orange-700", date: "02 - 04 Nov. • 8 participants", status: "Confirmé", statusColor: "bg-green-500", eco: "A+", icon: "train", tag: "Transport collectif", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5jT6WYwSYRRMZkPCNOBrnz44sPEOf3vt8vGQAXP_9oauhXfRuN3iCW8E7E6gc-OZQ8vsDzOUvVh_5xdOYt_rO_F8qZPcDl9P-dGlbHnCdip5hG5VauEsZxb7L4MFmkIgmuxDjB5jpLJ24b6cbwAGNiHXzgmm7GYixoWH_vRGfaPxQiDRFW6S80aZzKe_X0FtOCQKwgh_TcAdy4tAq9weqRrUYIrpoC7OXPXi8oF6ZKGnTcuPoGSJuouQ9yZ3yhw7ldps2FdgyNBg" },
                          ].map((plan, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-primary/5 hover:border-primary/30 transition-all group cursor-pointer">
                              <div className="flex flex-col md:flex-row gap-6">
                                <div className="w-full md:w-48 h-32 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                                  <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url("${plan.img}")` }} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-2 ${plan.badgeColor}`}>{plan.badge}</span>
                                      <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{plan.title}</h4>
                                      <p className="text-slate-500 text-sm flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span> {plan.date}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <span className={`px-2 py-1 rounded text-white text-[10px] font-bold uppercase ${plan.statusColor}`}>{plan.status}</span>
                                      <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1">
                                        <span className="material-symbols-outlined text-green-600 text-sm">eco</span>
                                        <span className="text-green-600 text-xs font-bold">{plan.eco}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-slate-400 text-lg">{plan.icon}</span>
                                      <span className="text-xs text-slate-500">{plan.tag}</span>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                      <span className="material-symbols-outlined">more_horiz</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* guide: Spécialités & Circuits */}
                    {role === "guide" && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold">Mes Spécialités & Circuits</h3>
                          <a className="text-primary font-bold text-sm hover:underline" href="#">Voir tout</a>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-primary text-2xl">location_on</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Zone d'activité</p>
                                <p className="text-lg font-bold text-slate-900">{profile.zone ?? "Non renseignée"}</p>
                                <p className="text-sm text-slate-500 mt-1">
                                  {profile.guide_type === "local" ? "Guide Local" : profile.guide_type === "professionnel" ? "Guide Professionnel" : "—"}
                                  {profile.years_experience != null ? ` • ${profile.years_experience} an${profile.years_experience > 1 ? "s" : ""} d'expérience` : ""}
                                </p>
                              </div>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${profile.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {profile.status === "active" ? "Actif" : "En attente"}
                              </span>
                            </div>
                          </div>

                          {(profile.specialties?.length ?? 0) > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Spécialités</p>
                              <div className="flex flex-wrap gap-2">
                                {profile.specialties!.map((s) => (
                                  <span key={s} className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {(profile.certifications?.length ?? 0) > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Certifications</p>
                              <div className="space-y-2">
                                {profile.certifications!.map((cert) => (
                                  <div key={cert.label} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                    <span className="material-symbols-outlined text-primary text-xl">verified</span>
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{cert.label}</span>
                                    {cert.proof && (
                                      <button type="button" onClick={() => {
                                        if (cert.proof.startsWith("data:")) {
                                          const w = window.open(); w?.document.write(`<img src="${cert.proof}" style="max-width:100%">`);
                                        } else { window.open(cert.proof, "_blank"); }
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

                          {(profile.languages_spoken?.length ?? 0) > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Langues parlées</p>
                              <div className="flex flex-wrap gap-2">
                                {profile.languages_spoken!.map((l) => (
                                  <span key={l} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-full uppercase">{l}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* project: Mes Projets */}
                    {role === "project" && (
                      <>
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold">Mes Projets</h3>
                          <button onClick={() => setShowAddProject(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-xl font-extrabold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                            <Plus className="w-4 h-4" />Ajouter
                          </button>
                        </div>

                        {(profile.projects?.length ?? 0) === 0 ? (
                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center">
                            <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">domain</span>
                            <p className="text-slate-800 dark:text-slate-200 font-extrabold text-lg mb-2">Aucun projet pour l'instant</p>
                            <p className="text-slate-400 font-medium text-sm mb-5">Ajoutez votre premier projet éco-touristique.</p>
                            <button onClick={() => setShowAddProject(true)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 rounded-xl font-extrabold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">
                              <Plus className="w-4 h-4" />Créer mon premier projet
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {profile.projects!.map((project) => (
                              <div key={project.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-5 flex gap-5">
                                <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
                                  {project.photo
                                    ? <img src={project.photo} alt={project.name} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center"><ProjectTypeIcon types={project.project_type} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-tight">{project.name}</h4>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${project.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                        {project.status === "active" ? "Actif" : "En attente"}
                                      </span>
                                      <button onClick={() => handleDeleteProject(project.id)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  {project.project_type?.length ? (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {project.project_type.map((pt) => (
                                        <span key={pt} className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                          {PROJECT_TYPES.find((t) => t.value === pt)?.label ?? pt}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                  {project.description && <p className="text-sm text-slate-500 font-medium line-clamp-1 mb-2">{project.description}</p>}
                                  <div className="flex flex-wrap gap-3">
                                    {project.region && (
                                      <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                        <span className="material-symbols-outlined text-sm">location_on</span>{project.region}
                                      </span>
                                    )}
                                    {project.website && (
                                      <a href={project.website} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                                        <span className="material-symbols-outlined text-sm">language</span>
                                        {project.website.replace(/^https?:\/\//, "")}
                                      </a>
                                    )}
                                  </div>
                                  {(project.eco_labels?.length ?? 0) > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {project.eco_labels!.slice(0, 3).map((label) => (
                                        <span key={label} className="text-xs font-bold px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{label}</span>
                                      ))}
                                      {project.eco_labels!.length > 3 && (
                                        <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">+{project.eco_labels!.length - 3}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Right column: Badges */}
                  <div>
                    <h3 className="text-xl font-bold mb-6">Mes Badges</h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-primary/10">
                      <div className="grid grid-cols-2 gap-4">
                        {badgeConfig.map((config) => {
                          const obtained = obtainedBadgeLabels.has(config.label);
                          const obtainedData = profile.badges.find((b) => b.label === config.label);
                          return (
                            <div key={config.label}
                              title={obtained && obtainedData ? `Obtenu le ${new Date(obtainedData.obtained_at).toLocaleDateString("fr-FR")}` : config.description}
                              className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${obtained ? "bg-slate-50 dark:bg-slate-800 border-primary/20" : "bg-slate-100/50 dark:bg-slate-800/50 border-dashed border-slate-200 dark:border-slate-700"}`}>
                              <div className="size-16 flex items-center justify-center mb-2">
                                <span className={`material-symbols-outlined text-4xl transition-all ${obtained ? "text-primary" : "text-slate-300"}`}
                                  style={obtained ? { fontVariationSettings: '"FILL" 1' } : {}}>
                                  {config.icon}
                                </span>
                              </div>
                              <p className={`text-xs font-bold ${obtained ? "text-slate-700" : "text-slate-300"}`}>{config.label}</p>
                              <p className={`text-[10px] font-bold uppercase mt-1 ${obtained ? "text-green-500" : "text-slate-300"}`}>
                                {obtained ? "Débloqué" : "Verrouillé"}
                              </p>
                              {!obtained && <p className="text-[9px] text-slate-300 mt-1 italic">{config.description}</p>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Engagement footer */}
                      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                        {role === "eco_traveler" && (
                          <>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.feedback_given ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Feedbacks</p></div>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{publications.filter((p) => p.type === "experience").length}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Expériences</p></div>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.reservations_made ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Réservations</p></div>
                          </>
                        )}
                        {role === "guide" && (
                          <>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.feedback_received ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Avis</p></div>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.years_experience ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Années</p></div>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.reservations_handled ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Circuits</p></div>
                          </>
                        )}
                        {role === "project" && (
                          <>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.feedback_received ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Avis</p></div>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.projects?.length ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Projets</p></div>
                            <div><p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile.total_reservations ?? 0}</p><p className="text-[10px] text-slate-400 font-bold uppercase">Réserv.</p></div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Mes Publications (eco_traveler) ──────────────────────── */}
            {role === "eco_traveler" && activeItem === "Mes Publications" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Mes Publications</h3>
                  <button onClick={() => setShowAddPublication(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                    <Plus className="w-4 h-4" />Partager
                  </button>
                </div>

                {publications.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">public</span>
                    <p className="font-bold text-slate-500">Aucune publication</p>
                    <p className="text-sm text-slate-400 mt-1">Partagez un lieu ou une expérience éco-touristique.</p>
                    <button onClick={() => setShowAddPublication(true)} className="mt-4 px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors">
                      Créer une publication
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {publications.map((pub) => (
                      <div key={pub.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {pub.type === "place" ? <MapPin className="w-5 h-5 text-primary" /> : <span className="material-symbols-outlined text-primary text-lg">hiking</span>}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{pub.title}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pub.type === "place" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                {pub.type === "place" ? "Lieu" : "Expérience"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 flex-shrink-0">
                            <StatusBadge status={pub.status} reason={pub.rejection_reason} />
                            <button onClick={() => handleDeletePublication(pub.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {pub.description && <p className="text-sm text-slate-500 font-medium line-clamp-2">{pub.description}</p>}
                        {pub.type === "place" && pub.latitude && pub.longitude && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <MapPin className="w-3.5 h-3.5" />
                            {pub.place_name ?? `${Number(pub.latitude).toFixed(4)}, ${Number(pub.longitude).toFixed(4)}`}
                            {pub.region && <span className="text-slate-300">• {pub.region}</span>}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 font-medium mt-auto">
                          {new Date(pub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Mes Offres (guide + project) ─────────────────────────── */}
            {(role === "guide" || role === "project") && activeItem === "Mes Offres" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Mes Offres</h3>
                  <button onClick={() => setShowAddOffer(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                    <Plus className="w-4 h-4" />Ajouter une offre
                  </button>
                </div>

                {offers.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">sell</span>
                    <p className="font-bold text-slate-500">Aucune offre publiée</p>
                    <p className="text-sm text-slate-400 mt-1">Créez votre première offre pour la rendre visible sur votre profil.</p>
                    <button onClick={() => setShowAddOffer(true)} className="mt-4 px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors">
                      Créer une offre
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {offers.map((offer) => {
                      const offerTypes = role === "guide" ? GUIDE_OFFER_TYPES : PROJ_OFFER_TYPES;
                      const typeLabel = offerTypes.find((t) => t.value === offer.offer_type)?.label;
                      const typeIcon = role === "guide" ? (GUIDE_OFFER_TYPES.find((t) => t.value === offer.offer_type) as any)?.icon ?? "sell" : "sell";
                      return (
                        <div key={offer.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-5 flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-primary text-lg">{typeIcon}</span>
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-slate-100 leading-tight">{offer.title}</p>
                                {typeLabel && <p className="text-xs font-bold text-primary mt-0.5">{typeLabel}</p>}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteOffer(offer.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {offer.description && <p className="text-sm text-slate-500 font-medium line-clamp-2">{offer.description}</p>}
                          <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                            {offer.price !== null && <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{offer.price} TND</span>}
                            {offer.duration && (
                              <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                <span className="material-symbols-outlined text-sm">schedule</span>{offer.duration}
                              </span>
                            )}
                            <div className="ml-auto">
                              <StatusBadge status={offer.status} reason={offer.rejection_reason} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Mes Projets tab (project only) ───────────────────────── */}
            {role === "project" && activeItem === "Mes Projets" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Mes Projets</h3>
                  <button onClick={() => setShowAddProject(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                    <Plus className="w-4 h-4" />Ajouter un projet
                  </button>
                </div>

                {(profile.projects?.length ?? 0) === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">domain</span>
                    <p className="font-bold text-slate-500">Aucun projet</p>
                    <button onClick={() => setShowAddProject(true)} className="mt-4 px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors">
                      Créer mon premier projet
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {profile.projects!.map((project) => (
                      <div key={project.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-5 flex gap-5">
                        <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
                          {project.photo
                            ? <img src={project.photo} alt={project.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><ProjectTypeIcon types={project.project_type} /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-tight">{project.name}</h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge status={project.status} reason={project.rejection_reason} />
                              <button onClick={() => handleDeleteProject(project.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {project.description && <p className="text-sm text-slate-500 font-medium line-clamp-2">{project.description}</p>}
                          {project.region && (
                            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-2">
                              <span className="material-symbols-outlined text-sm">location_on</span>{project.region}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Notifications panel supprimé — géré directement dans le popup bell ── */}
            {false && (
              <div className="flex gap-5" style={{ height: "calc(100vh - 112px)" }}>

                {/* ── Liste gauche ── */}
                <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <span className="font-bold text-base">Notifications</span>
                    {notifications.some((n) => !n.is_read) && (
                      <button onClick={markAllNotifsRead} className="text-xs text-primary hover:underline font-medium">
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                        <span className="material-symbols-outlined text-5xl opacity-30">notifications_none</span>
                        <p className="text-sm">Aucune notification</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const { title, body } = notifLabel(n);
                        const isSelected = expandedNotif === n.id;
                        const responded = notifResponses[n.id];
                        const isUnread = !n.is_read && !responded;
                        const menuOpen = notifMenuOpen === `panel-${n.id}`;
                        return (
                          <div
                            key={n.id}
                            className={`relative flex gap-3 items-start px-4 py-3.5 transition-colors cursor-pointer
                              ${isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-slate-50 dark:hover:bg-slate-800"}
                              ${isUnread && !isSelected ? "bg-primary/5" : ""}`}
                          >
                            <div className="flex-1 min-w-0 flex gap-3 items-start" onClick={() => {
                              if (!n.is_read) markNotifRead(n.id);
                              const base = role === "guide" ? "/profile/guide" : "/profile/provider";
                              if (n.type === "collaboration_invite") {
                                const collabProfilePath = `${base}?tab=collaborations`;
                                router.push(collabProfilePath);
                              } else if (["collab_accepted", "collab_declined", "collab_quit"].includes(n.type)) {
                                router.push("/profile/guide?tab=offres");
                              } else if (n.type === "offer_schedule_conflict") {
                                router.push(`${base}?tab=agenda`);
                              } else if (n.type === "offer_schedule_changed") {
                                router.push(`${base}?tab=collaborations`);
                              } else {
                                setExpandedNotif(n.id);
                              }
                            }}>
                              <span className={`mt-0.5 material-symbols-outlined text-xl shrink-0 ${isUnread ? "text-primary" : "text-slate-400"}`}>
                                {n.type === "collaboration_invite" ? "handshake" : n.type === "collab_accepted" ? "check_circle" : n.type === "collab_declined" ? "cancel" : n.type === "collab_quit" ? "person_remove" : n.type === "offer_deleted" ? "delete_forever" : n.type === "offer_schedule_conflict" ? "event_busy" : n.type === "offer_schedule_changed" ? "event_available" : "notifications"}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold leading-tight ${isUnread ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                  {title}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-snug">{body}</p>
                                <p className="text-[10px] text-slate-300 mt-1.5">
                                  {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                            <div className="relative shrink-0 flex items-center gap-1">
                              {isUnread && <span className="w-2 h-2 rounded-full bg-primary" />}
                              <button
                                onClick={(e) => { e.stopPropagation(); setNotifMenuOpen(menuOpen ? null : `panel-${n.id}`); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                              >
                                <span className="material-symbols-outlined text-lg">more_vert</span>
                              </button>
                              {menuOpen && (
                                <div className="absolute right-0 top-8 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
                                  {n.is_read ? (
                                    <button onClick={(e) => { e.stopPropagation(); markNotifUnread(n.id); setNotifMenuOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5">
                                      <span className="material-symbols-outlined text-base text-slate-400">mark_email_unread</span>Marquer comme non lu
                                    </button>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); markNotifRead(n.id); setNotifMenuOpen(null); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5">
                                      <span className="material-symbols-outlined text-base text-slate-400">mark_email_read</span>Marquer comme lu
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); reportNotif(n.id); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-base text-amber-400">flag</span>Signaler
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2.5">
                                    <span className="material-symbols-outlined text-base">delete</span>Supprimer
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ── Détail droite ── */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
                  {collabModal ? (
                    <CollaborationModal
                      collabId={collabModal.collabId}
                      offerId={collabModal.offerId}
                      section={collabModal.section}
                      inviterName={collabModal.inviterName}
                      token={token}
                      onClose={() => setCollabModal(null)}
                      onContributed={() => {
                        const n = notifications.find(
                          (x) => x.data?.collab_id === collabModal.collabId
                        );
                        if (n && !n.is_read) markNotifRead(n.id);
                      }}
                    />
                  ) : !expandedNotif ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                      <span className="material-symbols-outlined text-6xl opacity-40">notifications</span>
                      <p className="text-sm text-slate-400">Sélectionnez une notification pour voir les détails</p>
                    </div>
                  ) : (() => {
                    const n = notifications.find((x) => x.id === expandedNotif);
                    if (!n) return null;
                    const responded = notifResponses[n.id];
                    const collabId = n.data.collab_id as string | undefined;
                    const offerId = n.data.offer_id as string | undefined;
                    const section = n.data.section as string | undefined;
                    const offer = offerId ? notifOffers[offerId] : undefined;
                    const sectionLabel: Record<string, string> = {
                      hebergement: "Hébergement", restauration: "Restauration",
                      transport: "Transport", guide: "Guidage", autre: "Autre",
                    };
                    const offerTypeLabel: Record<string, string> = {
                      eco_tour: "Éco-Tour", activity: "Activité", workshop: "Atelier",
                      transfer: "Transfert", sejour: "Séjour", circuit: "Circuit",
                      activite: "Activité", restauration: "Restauration",
                      hebergement: "Hébergement", autre: "Autre",
                    };
                    // Fetch l'offre si pas encore chargée
                    if (offerId && !offer && loadingOffer !== offerId) fetchNotifOffer(offerId);

                    return (
                      <div className="flex flex-col h-full">
                        {/* En-tête */}
                        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center gap-4">
                          <span className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined text-2xl">handshake</span>
                          </span>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold leading-tight">Invitation à collaborer</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(n.created_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          {section && (
                            <span className="shrink-0 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {sectionLabel[section] ?? section}
                            </span>
                          )}
                        </div>

                        {/* Corps scrollable */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                          {/* ── Invitation info ── */}
                          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                            <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-base text-primary">person</span>
                            </span>
                            <div>
                              <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400">Invitation de</p>
                              <p className="font-bold text-slate-800 dark:text-white mt-0.5">{n.data.inviter_name ?? "—"}</p>
                              {n.data.message && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">« {n.data.message} »</p>
                              )}
                            </div>
                          </div>

                          {/* ── Offre complète ── */}
                          {loadingOffer === offerId ? (
                            <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
                              <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                              <span className="text-sm">Chargement de l&apos;offre…</span>
                            </div>
                          ) : offer ? (
                            <OfferDetailView offer={offer} />
                          ) : offerId && failedOfferIds.has(offerId) ? (
                            <div className="rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-5 py-5 flex items-start gap-3">
                              <span className="material-symbols-outlined text-2xl text-red-400 shrink-0">error_outline</span>
                              <div>
                                <p className="font-bold text-red-700 dark:text-red-400 text-sm">Cette offre n&apos;est plus disponible</p>
                                <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-1">L&apos;offre a peut-être été supprimée ou modifiée par son propriétaire.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 px-5 py-4">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{n.data.offer_title ?? "Offre"}</p>
                            </div>
                          )}

                          {/* ── Boutons réponse ── */}
                          {offerId && failedOfferIds.has(offerId) ? (
                            <div className="flex items-center gap-3 rounded-2xl px-6 py-4 font-bold text-sm bg-slate-50 dark:bg-slate-800/60 text-slate-400 border border-slate-200 dark:border-slate-700">
                              <span className="material-symbols-outlined text-2xl">block</span>
                              Impossible de répondre — l&apos;offre n&apos;existe plus
                            </div>
                          ) : responded === "accepted" ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-3 rounded-2xl px-6 py-4 font-bold text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                <span className="material-symbols-outlined text-2xl">check_circle</span>
                                Invitation acceptée
                              </div>
                              {collabId && offerId && section && (
                                <button
                                  onClick={() => setCollabModal({ collabId, offerId, section, inviterName: n.data?.inviter_name as string | undefined })}
                                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 text-slate-900 font-bold py-3.5 transition-all text-sm"
                                >
                                  <span className="material-symbols-outlined text-xl">edit_note</span>
                                  Remplir / Modifier ma contribution
                                </button>
                              )}
                            </div>
                          ) : responded === "declined" ? (
                            <div className="flex items-center gap-3 rounded-2xl px-6 py-4 font-bold text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                              <span className="material-symbols-outlined text-2xl">cancel</span>
                              Invitation refusée
                            </div>
                          ) : (
                            <div className="flex gap-3 pb-2">
                              <button
                                disabled={respondingNotif === n.id}
                                onClick={() => collabId && offerId && section && respondToInvite(n.id, collabId, offerId, section, "accepted")}
                                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-green-500 hover:bg-green-600 active:scale-95 disabled:opacity-60 text-white font-bold py-3.5 transition-all text-sm shadow-lg shadow-green-200 dark:shadow-none"
                              >
                                {respondingNotif === n.id ? (
                                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                  <span className="material-symbols-outlined text-xl">check_circle</span>
                                )}
                                Accepter &amp; Compléter ma partie
                              </button>
                              <button
                                disabled={respondingNotif === n.id}
                                onClick={() => collabId && offerId && section && respondToInvite(n.id, collabId, offerId, section, "declined")}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 disabled:opacity-60 text-red-500 font-bold px-5 py-3.5 transition-all text-sm border border-red-200 dark:border-red-800"
                              >
                                <span className="material-symbols-outlined text-xl">cancel</span>
                                Refuser
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {role === "eco_traveler" && showAddPublication && (
        <AddPublicationModal token={token} onClose={() => setShowAddPublication(false)}
          onSuccess={(p) => { setPublications((prev) => [p, ...prev]); setShowAddPublication(false); }} />
      )}
      {role === "guide" && showAddOffer && (
        <GuideOfferModal token={token} onClose={() => setShowAddOffer(false)}
          onSuccess={(o) => { setOffers((prev) => [o, ...prev]); setShowAddOffer(false); }} />
      )}
      {role === "project" && showAddOffer && (
        <ProjectOfferModal token={token} projects={profile.projects ?? []} onClose={() => setShowAddOffer(false)}
          onSuccess={(o) => { setOffers((prev) => [o, ...prev]); setShowAddOffer(false); }} />
      )}
      {role === "project" && showAddProject && (
        <AddProjectModal token={token} onClose={() => setShowAddProject(false)}
          onSuccess={(p) => { setProfile((prev) => prev ? { ...prev, projects: [...(prev.projects ?? []), p] } : prev); setShowAddProject(false); }} />
      )}

      {/* ── Toast notifications ── */}
      {notifToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="material-symbols-outlined text-amber-400 text-xl">flag</span>
          {notifToast}
        </div>
      )}

      {/* Fermer menu 3 points en cliquant ailleurs */}
      {notifMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifMenuOpen(null)} />
      )}
    </div>
  );
}
