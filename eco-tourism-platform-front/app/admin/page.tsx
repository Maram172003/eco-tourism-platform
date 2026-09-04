"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import { Leaf, Check, X, LogOut, ChevronRight, ExternalLink, Flag, ShieldOff, Trash2, AlertTriangle, ShieldCheck, Clock, UserCheck } from "lucide-react";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-xl bg-slate-100 animate-pulse" />,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingPublication = {
  id: string;
  type: "place" | "experience";
  title: string;
  description: string | null;
  region: string | null;
  place_name: string | null;
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  author_id: string;
  created_at: string;
};


type PendingProvider = {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  provider_type: string | null;
  bio: string | null;
  region: string | null;
  address: string | null;
  zone: string | null;
  photo: string | null;
  cover_photo: string | null;
  opening_hours: string | null;
  services: string[] | null;
  eco_labels: string[] | null;
  certifications: string[] | null;
  website: string | null;
  phone: string | null;
  whatsapp: string | null;
  facebook: string | null;
  instagram: string | null;
  activity_types: string[] | null;
  languages_spoken: string[] | null;
  years_experience: number | null;
  sustainability_score: number | null;
  // Champs de l'onboarding restés absents de la fiche
  country: string | null;
  language: string | null;
  position: string | null;
  personal_bio: string | null;
  personal_certifications: Array<{ name: string; document_url?: string }> | null;
  secondary_activity_types: string[] | null;
  specialties: string[] | null;
  photos: string[] | null;
  videos: string[] | null;
  history: string | null;
  lat: number | null;
  lng: number | null;
  score_questionnaire: number | null;
  score_reservations: number | null;
  score_feedbacks: number | null;
  // Organisation et activités jointes par le back, comme dans l'onglet « À propos »
  org: {
    name: string | null; logo: string | null; provider_type: string | null;
    bio: string | null; history: string | null;
    phone: string | null; whatsapp: string | null; email: string | null;
    website: string | null; facebook: string | null; instagram: string | null; tiktok: string | null;
    region: string | null; address: string | null; zone: string | null; country: string | null;
    lat: number | null; lng: number | null;
    photos: string[] | null; videos: string[] | null;
    eco_labels: string[] | null;
    certifications: Array<{ name: string; document_url?: string }> | null;
    opening_hours: string | null;
    sustainability_score: number | null;
  } | null;
  account_email: string | null;
  member_since: string | null;
  activities: Array<{
    id: string; level: string; category: string;
    subtypes: string[] | null; years_experience: number | null;
    photos: Record<string, string[]>;
    certifications: Array<{ name: string; document_url?: string }>;
  }> | null;
};

type PendingGuide = {
  user_id: string;
  full_name: string | null;
  guide_type: string | null;
  bio: string | null;
  country: string | null;
  language: string | null;
  photo: string | null;
  cover_photo: string | null;
  zone: string | null;
  telephone: string | null;
  ville_residence: string | null;
  specialties: string[] | null;
  domaines: string[] | null;
  expertises: string[] | null;
  zones_couvertes: string[] | null;
  villes_couvertes: string[] | null;
  sites_maitrises: string[] | null;
  publics_accueillis: string[] | null;
  languages_spoken: string[] | null;
  deplacement_possible: boolean | null;
  years_experience: number | null;
  experience_pro: string | null;
  centres_interet: string | null;
  pourquoi_moi: string | null;
  profile_completion: number | null;
  sustainability_score: number | null;
  score_questionnaire: number | null;
  score_reservations: number | null;
  score_feedbacks: number | null;
  created_at?: string;
  // Compétences stockées dans MongoDB, jointes par le back
  account_email: string | null;
  member_since: string | null;
  certifications: Array<{ label: string; proof: string }> | null;
  assurance: { name: string; proof: string } | null;
  skills_activities: string[] | null;
  skills_landscapes: string[] | null;
};

type Tab = "publications" | "providers" | "guides" | "reports" | "banned";

type BannedUser = {
  user_id: string;
  email: string;
  role: string;
  status: string;
  ban_until: string | null;
  banned_at: string;
  full_name: string | null;
  photo: string | null;
};

type ReportUser = { user_id: string; full_name: string | null; photo: string | null; role: string; email: string | null; status: string | null };
type Report = {
  id: string;
  reporter_id: string;
  reporter_role: string;
  reported_id: string;
  reported_role: string;
  reason: string;
  status: string;
  action_taken: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter: ReportUser;
  reported: ReportUser;
};

// ─── RejectModal ──────────────────────────────────────────────────────────────

function RejectModal({ onConfirm, onClose }: { onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-900">Motif de rejet</h3>
        <textarea
          className="w-full h-28 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          placeholder="Expliquez pourquoi ce contenu est rejeté…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Annuler</button>
          <button
            disabled={!reason.trim() || submitting}
            onClick={() => {
              if (!reason.trim() || submitting) return;
              setSubmitting(true);
              onConfirm(reason.trim());
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
            {submitting ? "Envoi…" : "Rejeter"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DetailField ──────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}


function DetailMap({ lat, lng }: { lat: number | null; lng: number | null }) {
  if (!lat || !lng) return null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Localisation</p>
      <MapView lat={lat} lng={lng} />
    </div>
  );
}

function DetailImages({ images }: { images: string[] | null }) {
  if (!images?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Photos</p>
      <div className="grid grid-cols-3 gap-2">
        {images.map((src, i) => (
          <img key={i} src={src} alt="" className="w-full h-24 object-cover rounded-xl" />
        ))}
      </div>
    </div>
  );
}


function DetailSustainability({ score }: { score: number | null }) {
  if (score === null) return null;
  const level =
    score >= 86 ? { label: "Ambassadeur Éco Voyage", color: "text-primary",      bar: "bg-primary" } :
    score >= 71 ? { label: "Éco-Responsable",        color: "text-emerald-600", bar: "bg-emerald-500" } :
    score >= 51 ? { label: "Engagé",                 color: "text-teal-600",    bar: "bg-teal-500" } :
    score >= 31 ? { label: "Sensibilisé",            color: "text-blue-600",    bar: "bg-blue-500" } :
                  { label: "Conventionnel",           color: "text-slate-500",   bar: "bg-slate-400" };
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">🌿 Score de durabilité</p>
        <span className={`text-sm font-black ${level.color}`}>{score}/100</span>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full ${level.bar} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-bold ${level.color}`}>{level.label}</span>
    </div>
  );
}

// ─── Detail Modals ────────────────────────────────────────────────────────────

function PublicationDetail({ pub, onClose, onApprove, onReject, loading }: {
  pub: PendingPublication;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  return (
    <DetailModal title={pub.title} badge={pub.type === "place" ? "Lieu" : "Expérience"} date={pub.created_at} onClose={onClose} onApprove={onApprove} onReject={onReject} loading={loading}>
      <DetailImages images={pub.images} />
      <DetailField label="Nom du lieu" value={pub.place_name} />
      <DetailField label="Région" value={pub.region} />
      <DetailField label="Description" value={pub.description} />
      <DetailMap lat={pub.latitude} lng={pub.longitude} />
    </DetailModal>
  );
}


const PROVIDER_TYPE_LABELS: Record<string, string> = {
  guide: "Guide nature", agence: "Agence de voyage", ecolodge: "Écolodge",
  restaurant: "Restauration", artisan: "Artisan", association: "Association",
  bien_etre: "Bien-être", transport: "Transport",
  eco_tour: "Éco-tour", hebergement: "Hébergement", artisanat: "Artisanat",
  culture_patrimoine: "Culture & Patrimoine",
};

// Les profils stockent des codes ISO : on les affiche en clair pour l'administrateur.
const LANGUAGE_LABELS: Record<string, string> = {
  ar: "Arabe", fr: "Français", en: "Anglais", it: "Italien", de: "Allemand",
  es: "Espagnol", ber: "Berbère", ru: "Russe", zh: "Chinois", ja: "Japonais",
};

/** Date lisible, pour « membre depuis ». */
function formatMonth(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** Rend un code lisible : slug → libellé connu, sinon slug « déslugifié ». */
function humanize(value: string, dictionary?: Record<string, string>): string {
  if (dictionary?.[value]) return dictionary[value];
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

type InfoField = { label: string; value?: string | number | null };
type InfoTags  = { label: string; values?: string[] | null; dictionary?: Record<string, string> };
type InfoLink  = { label: string; url?: string | null };

/**
 * Section d'une fiche : elle se masque d'elle-même si elle n'a rien à montrer.
 * Piloté par les données plutôt que par les enfants JSX — un composant enfant
 * qui rend `null` reste un élément React, donc « truthy » : le tester ne dit
 * rien de ce qui sera réellement affiché.
 */
function InfoSection({ title, fields = [], tags = [], links = [], hasExtra = false, children }: {
  title: string;
  fields?: InfoField[];
  tags?: InfoTags[];
  links?: InfoLink[];
  hasExtra?: boolean;
  children?: React.ReactNode;
}) {
  const visibleFields = fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== "");
  const visibleTags   = tags.filter((tg) => tg.values && tg.values.length > 0);
  const visibleLinks  = links.filter((l) => !!l.url);

  if (!visibleFields.length && !visibleTags.length && !visibleLinks.length && !hasExtra) return null;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
      <header className="px-5 py-3 bg-slate-50/80 border-b border-slate-100">
        <h4 className="text-[11px] font-black tracking-widest text-slate-500 uppercase">{title}</h4>
      </header>

      <div className="p-5 space-y-4">
        {visibleFields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {visibleFields.map((f) => (
              <div key={f.label} className={f.value && String(f.value).length > 90 ? "sm:col-span-2" : ""}>
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1">{f.label}</p>
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">{f.value}</p>
              </div>
            ))}
          </div>
        )}

        {visibleTags.map((tg) => (
          <div key={tg.label}>
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">{tg.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {tg.values!.map((v) => (
                <span key={v} className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary">
                  {humanize(v, tg.dictionary)}
                </span>
              ))}
            </div>
          </div>
        ))}

        {visibleLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleLinks.map((l) => (
              <a key={l.label} href={l.url!} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:border-primary/50 hover:text-primary transition-colors">
                <ExternalLink className="w-3 h-3" />{l.label}
              </a>
            ))}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}

/** Galerie de photos, au même arrondi que le reste de la plateforme. */
function InfoPhotos({ images }: { images: (string | null | undefined)[] }) {
  const valid = images.filter(Boolean) as string[];
  if (!valid.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {valid.map((src, i) => (
        <img key={i} src={src} alt="" className="w-full h-28 object-cover rounded-xl border border-slate-100" />
      ))}
    </div>
  );
}

function ProviderDetail({ provider, onClose, onApprove, onReject, loading }: {
  provider: PendingProvider;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  // Le nom de la personne en titre, celui de l'organisation en sous-titre :
  // l'administrateur identifie ainsi les deux d'un coup d'œil.
  const name = provider.full_name ?? "Prestataire";
  const badge = provider.org?.name ?? provider.organization ?? "—";
  const photos = [provider.photo, provider.cover_photo];
  const hasScore = provider.sustainability_score !== null && provider.sustainability_score !== undefined;
  const org = provider.org;
  const activities = provider.activities ?? [];

  return (
    <DetailModal title={name} badge={badge} date={new Date().toISOString()} onClose={onClose} onApprove={onApprove} onReject={onReject} loading={loading}>

      <InfoSection title="Identité" hasExtra={photos.some(Boolean)}
        fields={[
          { label: "Nom du prestataire", value: provider.full_name },
          { label: "Organisation", value: provider.org?.name ?? provider.organization },
          { label: "E-mail du compte", value: provider.account_email },
          { label: "Membre depuis", value: formatMonth(provider.member_since) },
          { label: "Type d'activité", value: humanize(provider.provider_type ?? "", PROVIDER_TYPE_LABELS) },
          { label: "Pays", value: provider.country },
          { label: "Langue principale", value: humanize(provider.language ?? "", LANGUAGE_LABELS) },
          { label: "Expérience", value: provider.years_experience ? `${provider.years_experience} ans` : null },
          { label: "Présentation", value: provider.bio },
          { label: "Historique", value: provider.history },
        ]}>
        <InfoPhotos images={photos} />
      </InfoSection>

      <InfoSection title="Localisation" hasExtra={!!(provider.lat && provider.lng)}
        fields={[
          { label: "Région", value: provider.region },
          { label: "Zone", value: provider.zone },
          { label: "Adresse", value: provider.address },
          { label: "Horaires", value: provider.opening_hours },
        ]}>
        <DetailMap lat={provider.lat} lng={provider.lng} />
      </InfoSection>

      <InfoSection title="Activité"
        tags={[
          { label: "Activités principales", values: provider.activity_types },
          { label: "Activités secondaires", values: provider.secondary_activity_types },
          { label: "Services", values: provider.services },
          { label: "Spécialités", values: provider.specialties },
          { label: "Langues parlées", values: provider.languages_spoken, dictionary: LANGUAGE_LABELS },
        ]} />

      <InfoSection title="Contact"
        fields={[
          { label: "Téléphone", value: provider.phone },
          { label: "WhatsApp", value: provider.whatsapp },
        ]}
        links={[
          { label: "Site web", url: provider.website },
          { label: "Facebook", url: provider.facebook },
          { label: "Instagram", url: provider.instagram },
        ]} />

      <InfoSection title="Référent" hasExtra={!!provider.personal_certifications?.length}
        fields={[
          { label: "Fonction", value: provider.position },
          { label: "Présentation", value: provider.personal_bio },
        ]}>
        <DetailCertifications label="Certifications du référent" certifications={provider.personal_certifications} />
      </InfoSection>

      <InfoSection title="Engagement écologique" hasExtra={hasScore}
        tags={[{ label: "Labels éco", values: provider.eco_labels }]}>
        <DetailSustainability score={provider.sustainability_score} />
        <DetailScoreBreakdown
          questionnaire={provider.score_questionnaire}
          reservations={provider.score_reservations}
          feedbacks={provider.score_feedbacks}
        />
      </InfoSection>

      <InfoSection title="Médias" hasExtra={!!provider.photos?.length}
        tags={[{ label: "Vidéos", values: provider.videos }]}>
        <InfoPhotos images={provider.photos ?? []} />
      </InfoSection>

      {/* ── Organisation : second volet du « À propos » du prestataire ── */}
      {org && (
        <>
          <InfoSection title="Organisation" hasExtra={!!org.logo}
            fields={[
              { label: "Nom", value: org.name },
              { label: "Type", value: humanize(org.provider_type ?? "", PROVIDER_TYPE_LABELS) },
              { label: "Description", value: org.bio },
              { label: "Histoire & origine", value: org.history },
              { label: "Horaires", value: org.opening_hours },
            ]}>
            <InfoPhotos images={[org.logo]} />
          </InfoSection>

          <InfoSection title="Organisation — Localisation" hasExtra={!!(org.lat && org.lng)}
            fields={[
              { label: "Pays", value: org.country },
              { label: "Région", value: org.region },
              { label: "Zone", value: org.zone },
              { label: "Adresse", value: org.address },
            ]}>
            <DetailMap lat={org.lat} lng={org.lng} />
          </InfoSection>

          <InfoSection title="Organisation — Contact"
            fields={[
              { label: "Téléphone", value: org.phone },
              { label: "WhatsApp", value: org.whatsapp },
              { label: "E-mail", value: org.email },
            ]}
            links={[
              { label: "Site web", url: org.website },
              { label: "Facebook", url: org.facebook },
              { label: "Instagram", url: org.instagram },
              { label: "TikTok", url: org.tiktok },
            ]} />

          <InfoSection title="Organisation — Certifications & labels"
            hasExtra={!!org.certifications?.length}
            tags={[{ label: "Labels éco", values: org.eco_labels }]}>
            <DetailCertifications label="Certifications de l'organisation" certifications={org.certifications} />
          </InfoSection>

          <InfoSection title="Organisation — Médias"
            hasExtra={!!org.photos?.length}
            tags={[{ label: "Vidéos", values: org.videos }]}>
            <InfoPhotos images={org.photos ?? []} />
          </InfoSection>
        </>
      )}

      {/* ── Activités déclarées, avec leurs photos et justificatifs ── */}
      {activities.length > 0 && (
        <InfoSection title={`Activités proposées (${activities.length})`} hasExtra>
          <div className="space-y-3">
            {activities.map((act) => {
              const photos = Object.values(act.photos ?? {}).flat().filter(Boolean);
              return (
                <div key={act.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-primary/10 text-primary">
                      {humanize(act.category, PROVIDER_TYPE_LABELS)}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {act.level === "primary" ? "Principale" : "Secondaire"}
                    </span>
                    {act.years_experience != null && (
                      <span className="text-[11px] font-bold text-slate-500">{act.years_experience} ans</span>
                    )}
                  </div>
                  {act.subtypes?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {act.subtypes.map((st) => (
                        <span key={st} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-slate-200 text-slate-600">
                          {humanize(st)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <InfoPhotos images={photos} />
                  <DetailCertifications label="Certifications de l'activité" certifications={act.certifications} />
                </div>
              );
            })}
          </div>
        </InfoSection>
      )}

    </DetailModal>
  );
}

// Fiche complète d'un guide : reprend l'intégralité de son onboarding.
function GuideDetail({ guide, onClose, onApprove, onReject, loading }: {
  guide: PendingGuide;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const photos = [guide.photo, guide.cover_photo];
  const hasScore = guide.sustainability_score !== null && guide.sustainability_score !== undefined;

  return (
    <DetailModal
      title={guide.full_name ?? "Guide"}
      badge=""
      date={guide.created_at ?? new Date().toISOString()}
      onClose={onClose} onApprove={onApprove} onReject={onReject} loading={loading}
    >
      <InfoSection title="Identité" hasExtra={photos.some(Boolean)}
        fields={[
          { label: "Nom du guide", value: guide.full_name },
          { label: "E-mail du compte", value: guide.account_email },
          { label: "Membre depuis", value: formatMonth(guide.member_since) },
          { label: "Type de guide", value: humanize(guide.guide_type ?? "") },
          { label: "Expérience", value: guide.years_experience ? `${guide.years_experience} ans` : null },
          { label: "Pays", value: guide.country },
          { label: "Langue principale", value: humanize(guide.language ?? "", LANGUAGE_LABELS) },
          { label: "Téléphone", value: guide.telephone },
          { label: "Ville de résidence", value: guide.ville_residence },
          { label: "Biographie", value: guide.bio },
        ]}>
        <InfoPhotos images={photos} />
      </InfoSection>

      <InfoSection title="Parcours"
        fields={[
          { label: "Parcours professionnel", value: guide.experience_pro },
          { label: "Centres d'intérêt", value: guide.centres_interet },
          { label: "Pourquoi moi", value: guide.pourquoi_moi },
        ]} />

      <InfoSection title="Compétences"
        tags={[
          { label: "Domaines", values: guide.domaines },
          { label: "Expertises", values: guide.expertises },
          { label: "Spécialités", values: guide.specialties },
          { label: "Langues parlées", values: guide.languages_spoken, dictionary: LANGUAGE_LABELS },
          { label: "Publics accueillis", values: guide.publics_accueillis },
        ]} />

      <InfoSection title="Zone d'intervention"
        fields={[
          { label: "Zone", value: guide.zone },
          {
            label: "Déplacement possible",
            value: guide.deplacement_possible === null || guide.deplacement_possible === undefined
              ? null
              : guide.deplacement_possible ? "Oui" : "Non",
          },
        ]}
        tags={[
          { label: "Zones couvertes", values: guide.zones_couvertes },
          { label: "Villes couvertes", values: guide.villes_couvertes },
          { label: "Sites maîtrisés", values: guide.sites_maitrises },
        ]} />

      <InfoSection title="Certifications & assurance"
        hasExtra={!!guide.certifications?.length || !!guide.assurance}>
        <DetailCertifications
          label="Certifications"
          certifications={(guide.certifications ?? []).map((c) => ({ name: c.label, document_url: c.proof }))}
        />
        <DetailCertifications
          label="Assurance professionnelle"
          certifications={guide.assurance ? [{ name: guide.assurance.name, document_url: guide.assurance.proof }] : null}
        />
      </InfoSection>

      <InfoSection title="Engagement écologique" hasExtra={hasScore}
        tags={[
          { label: "Activités maîtrisées", values: guide.skills_activities },
          { label: "Paysages", values: guide.skills_landscapes },
        ]}
        fields={[{
          label: "Complétion du profil",
          value: guide.profile_completion !== null && guide.profile_completion !== undefined
            ? `${guide.profile_completion} %` : null,
        }]}>
        <DetailSustainability score={guide.sustainability_score} />
        <DetailScoreBreakdown
          questionnaire={guide.score_questionnaire}
          reservations={guide.score_reservations}
          feedbacks={guide.score_feedbacks}
        />
      </InfoSection>
    </DetailModal>
  );
}

// Certifications avec leur justificatif : l'administrateur doit pouvoir
// l'ouvrir pour vérifier, qu'il s'agisse d'un lien ou d'un scan téléversé.
function DetailCertifications({ label = "Certifications", certifications }: {
  label?: string;
  certifications: Array<{ name: string; document_url?: string }> | null;
}) {
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);
  if (!certifications?.length) return null;

  // Une image (URL directe ou data URI) s'affiche ; tout le reste s'ouvre à part.
  const isImage = (url: string) =>
    url.startsWith("data:image") || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url);

  return (
    <div className="mb-4">
      <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase mb-2">{label}</p>
      <ul className="space-y-2">
        {certifications.map((cert, i) => (
          <li key={i} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-base shrink-0">workspace_premium</span>
              <span className="text-sm font-bold text-slate-700 truncate">{cert.name}</span>
            </div>
            {cert.document_url ? (
              isImage(cert.document_url) ? (
                // Un scan s'ouvre dans une visionneuse, sans quitter la modération.
                <button type="button"
                  onClick={() => setPreview({ name: cert.name, url: cert.document_url! })}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-extrabold hover:bg-primary/20 transition-colors">
                  <ExternalLink className="w-3 h-3" />Voir
                </button>
              ) : (
                // PDF ou lien externe : le navigateur sait mieux faire que nous.
                <a href={cert.document_url} target="_blank" rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-extrabold hover:bg-primary/20 transition-colors">
                  <ExternalLink className="w-3 h-3" />Voir
                </a>
              )
            ) : (
              <span className="shrink-0 text-xs font-bold text-slate-400 italic">Aucun justificatif</span>
            )}
          </li>
        ))}
      </ul>

      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-6"
          onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-extrabold text-slate-800">{preview.name}</p>
              <div className="flex items-center gap-3">
                <a href={preview.url} target="_blank" rel="noreferrer"
                  className="text-xs font-bold text-primary hover:underline">Ouvrir dans un onglet</a>
                <button onClick={() => setPreview(null)}
                  className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="overflow-auto p-4 bg-slate-50">
              <img src={preview.url} alt={preview.name} className="max-w-full mx-auto rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Détail des trois composantes du score de durabilité.
function DetailScoreBreakdown({ questionnaire, reservations, feedbacks }: {
  questionnaire: number | null | undefined;
  reservations: number | null | undefined;
  feedbacks: number | null | undefined;
}) {
  const lignes = [
    { label: "Questionnaire", value: questionnaire },
    { label: "Réservations", value: reservations },
    { label: "Évaluations", value: feedbacks },
  ].filter((l) => l.value !== null && l.value !== undefined);
  if (!lignes.length) return null;
  return (
    <div className="mb-4">
      <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase mb-1.5">Détail du score</p>
      <div className="grid grid-cols-3 gap-3">
        {lignes.map((l) => (
          <div key={l.label} className="bg-slate-50 rounded-xl px-3 py-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase">{l.label}</p>
            <p className="text-sm font-extrabold text-slate-800">{l.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailModal({ title, badge, date, onClose, onApprove, onReject, loading, children }: {
  title: string;
  badge?: string;
  date: string;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {badge ? <TypeBadge label={badge} /> : null}
              <span className="text-xs font-medium text-slate-400">
                {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors shrink-0 ml-4">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body — fond légèrement teinté pour détacher les cartes de section */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4 bg-slate-50/60">
          {children}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end shrink-0">
          <button disabled={loading} onClick={onReject}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
            <X className="w-4 h-4" /> Rejeter
          </button>
          <button disabled={loading} onClick={onApprove}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors disabled:opacity-50">
            <Check className="w-4 h-4" /> Approuver
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────

function TypeBadge({ label }: { label: string }) {
  return <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{label}</span>;
}

// ─── ContentCard ──────────────────────────────────────────────────────────────

function ContentCard({ title, badge, meta, description, date, loading, onOpen, onApprove, onReject }: {
  title: string;
  badge?: string;
  meta: string;
  description: string | null;
  date: string;
  loading: boolean;
  onOpen?: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-5">
      <button className="flex-1 min-w-0 text-left group" onClick={onOpen} disabled={!onOpen}>
        <div className="flex items-center gap-2 mb-1.5">
          {badge ? <TypeBadge label={badge} /> : null}
          <span className="text-xs font-medium text-slate-400">
            {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <h3 className="text-base font-extrabold text-slate-900 truncate group-hover:text-primary transition-colors">{title}</h3>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary shrink-0 transition-colors" />
        </div>
        {meta && <p className="text-xs font-medium text-slate-500 mt-0.5">{meta}</p>}
        {description && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{description}</p>}
      </button>
      <div className="flex flex-col gap-2 shrink-0">
        <button disabled={loading} onClick={onApprove}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-bold hover:bg-green-100 transition-colors disabled:opacity-50">
          <Check className="w-4 h-4" /> Approuver
        </button>
        <button disabled={loading} onClick={onReject}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50">
          <X className="w-4 h-4" /> Rejeter
        </button>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-20 text-slate-400">
      <Check className="w-10 h-10 mx-auto mb-3 text-green-400" />
      <p className="text-sm font-bold">{label}</p>
    </div>
  );
}

// ─── ResolveModal ─────────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  { value: "warn",    label: "Avertir l'utilisateur",    icon: AlertTriangle, color: "text-orange-600 border-orange-300 bg-orange-50 hover:bg-orange-100" },
  { value: "ban",     label: "Bannir le compte",          icon: ShieldOff,     color: "text-red-600 border-red-300 bg-red-50 hover:bg-red-100" },
  { value: "delete",  label: "Supprimer le compte",       icon: Trash2,        color: "text-red-700 border-red-400 bg-red-100 hover:bg-red-200" },
  { value: "dismiss", label: "Rejeter le signalement",    icon: X,             color: "text-slate-600 border-slate-300 bg-slate-50 hover:bg-slate-100" },
];

/** Les rôles techniques n'ont pas à s'afficher tels quels. */
const ROLE_LABELS: Record<string, string> = {
  eco_traveler: "Éco-voyageur",
  guide: "Guide",
  provider: "Prestataire",
  project: "Prestataire",
  admin: "Administrateur",
};

const BAN_DURATIONS = [
  { label: "1 jour",    days: 1 },
  { label: "3 jours",   days: 3 },
  { label: "7 jours",   days: 7 },
  { label: "30 jours",  days: 30 },
  { label: "Permanent", days: 0 },
];

function ResolveModal({ report, onConfirm, onClose }: { report: Report; onConfirm: (action: string, note: string, banDays?: number) => void; onClose: () => void }) {
  const [action, setAction] = useState("");
  const [banDays, setBanDays] = useState(7);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Résoudre le signalement</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {new Date(report.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Le motif est le cœur du signalement : il porte la décision. */}
        <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
          <p className="text-[10px] font-black tracking-widest text-red-400 uppercase mb-1">Motif invoqué</p>
          <p className="text-sm font-semibold text-red-900 leading-snug">{report.reason || "Aucun motif précisé"}</p>
        </div>

        {/* Les deux personnes, côte à côte : qui signale, qui est signalé. */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { titre: "Signalant", p: report.reporter, teinte: "bg-slate-50" },
            { titre: "Signalé", p: report.reported, teinte: "bg-amber-50/70 border border-amber-100" },
          ].map(({ titre, p, teinte }) => (
            <div key={titre} className={`rounded-2xl p-3.5 ${teinte}`}>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">{titre}</p>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {p.photo
                    ? <img src={p.photo} alt="" className="w-full h-full object-cover" />
                    : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-800 truncate">{p.full_name ?? "Nom inconnu"}</p>
                  <p className="text-[11px] text-slate-400 font-medium truncate">{ROLE_LABELS[p.role] ?? p.role}</p>
                  <p className="text-[11px] text-slate-400 font-medium truncate">{p.email}</p>
                </div>
              </div>
              {p.status === "banned" && (
                <span className="mt-2 inline-block text-[10px] font-black px-2 py-0.5 bg-red-100 text-red-600 rounded-lg">
                  Compte banni
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Action choice */}
        <div>
        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Décision</p>
        <div className="grid grid-cols-2 gap-2">
          {ACTION_OPTIONS.map(({ value, label, icon: Icon, color }) => (
            <button key={value} onClick={() => setAction(value)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${action === value ? color + " ring-2 ring-offset-1 ring-current" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <Icon size={15} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>
        </div>

        {/* Ban duration selector */}
        {action === "ban" && (
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Durée du ban</p>
            <div className="flex gap-2 flex-wrap">
              {BAN_DURATIONS.map((d) => (
                <button key={d.days} onClick={() => setBanDays(d.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${banDays === d.days ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-400"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note admin */}
        <textarea
          className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Note optionnelle pour l'utilisateur signalé et le signalant…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Annuler</button>
          <button
            disabled={!action || submitted}
            onClick={() => {
              if (!action || submitted) return;
              setSubmitted(true);
              onConfirm(action, note, action === "ban" ? banDays : undefined);
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40">
            {submitted && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
            Confirmer l'action
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<Tab>("publications");

  const [publications, setPublications] = useState<PendingPublication[]>([]);
  const [providers, setProviders] = useState<PendingProvider[]>([]);
  const [guides, setGuides] = useState<PendingGuide[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [detailPub, setDetailPub] = useState<PendingPublication | null>(null);
  const [detailProvider, setDetailProvider] = useState<PendingProvider | null>(null);
  const [detailGuide, setDetailGuide] = useState<PendingGuide | null>(null);

  const [rejectTarget, setRejectTarget] = useState<{ type: Tab; id: string } | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Report | null>(null);
  const [banEditTarget, setBanEditTarget] = useState<BannedUser | null>(null);
  const [banEditDays, setBanEditDays] = useState(7);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const tkn = localStorage.getItem("access_token");
    if (!stored || !tkn) { router.push("/auth/login"); return; }
    const { role } = JSON.parse(stored) as { role: string };
    if (role !== "admin") { router.push("/auth/login"); return; }
    setToken(tkn);
  }, [router]);

  useEffect(() => {
    if (!token) return;
    async function fetchAll() {
      setLoading(true);
      try {
        const [pubs, provs, gds, reps, banned] = await Promise.all([
          apiFetch<PendingPublication[]>("/admin/publications/pending", { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch<PendingProvider[]>("/admin/providers/pending", { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch<PendingGuide[]>("/admin/guides/pending", { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch<Report[]>("/admin/reports", { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch<BannedUser[]>("/admin/users/banned", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setPublications(pubs);
        setProviders(provs);
        setGuides(gds);
        setReports(reps);
        setBannedUsers(banned);
      } catch {}
      finally { setLoading(false); }
    }
    fetchAll();
  }, [token]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  }

  async function approve(type: Tab, id: string) {
    setActionLoading(id);
    try {
      await apiFetch(`/admin/${type}/${id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      removeItem(type, id);
      closeDetail();
    } catch {}
    setActionLoading(null);
  }

  async function reject(type: Tab, id: string, reason: string) {
    setActionLoading(id);
    try {
      await apiFetch(`/admin/${type}/${id}/reject`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      removeItem(type, id);
      closeDetail();
    } catch {}
    setActionLoading(null);
    setRejectTarget(null);
  }

  function removeItem(type: Tab, id: string) {
    if (type === "publications") setPublications((p) => p.filter((x) => x.id !== id));
    if (type === "providers") setProviders((p) => p.filter((x) => x.user_id !== id));
    if (type === "guides") setGuides((p) => p.filter((x) => x.user_id !== id));
  }

  async function resolveReport(action: string, note: string, banDays?: number) {
    if (!resolveTarget) return;
    setActionLoading(resolveTarget.id);
    try {
      await apiFetch(`/admin/reports/${resolveTarget.id}/resolve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, note, ban_days: banDays }),
      });
      setReports((prev) => prev.map((r) => r.id === resolveTarget.id
        ? { ...r, status: action === "dismiss" ? "dismissed" : "resolved", action_taken: action, admin_note: note }
        : r
      ));
      setResolveTarget(null);
    } catch {}
    setActionLoading(null);
  }

  function closeDetail() {
    setDetailPub(null);
    setDetailProvider(null);
    setDetailGuide(null);
  }

  async function unbanUser(userId: string) {
    setActionLoading(userId);
    try {
      await apiFetch(`/admin/users/${userId}/unban`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      setBannedUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch {}
    setActionLoading(null);
  }

  async function updateBan(userId: string, days: number) {
    setActionLoading(userId);
    try {
      const result = await apiFetch<{ ban_until: string | null }>(`/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ban_days: days }),
      });
      setBannedUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, ban_until: result.ban_until } : u));
      setBanEditTarget(null);
    } catch {}
    setActionLoading(null);
  }

  const pendingReports = reports.filter((r) => r.status === "pending");
  const counts: Record<Tab, number> = { publications: publications.length, providers: providers.length, guides: guides.length, reports: pendingReports.length, banned: bannedUsers.length };
  const tabLabels: Record<Tab, string> = { publications: "Lieux", providers: "Prestataires", guides: "Guides", reports: "Signalements", banned: "Bannis" };

  if (!token) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Administration</p>
              <h1 className="text-lg font-extrabold text-slate-900 leading-none">Modération du contenu</h1>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-8">
          {(["publications", "providers", "guides"] as Tab[]).map((t) => (
            <div key={t} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{tabLabels[t]}</p>
              <p className="text-3xl font-extrabold text-slate-900">{counts[t]}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">en attente</p>
            </div>
          ))}
          <div className="bg-red-50 rounded-2xl p-5 border border-red-100 shadow-sm">
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Signalements</p>
            <p className="text-3xl font-extrabold text-red-600">{pendingReports.length}</p>
            <p className="text-xs font-medium text-red-400 mt-1">en attente</p>
          </div>
          <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100 shadow-sm">
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Bannis</p>
            <p className="text-3xl font-extrabold text-orange-600">{bannedUsers.length}</p>
            <p className="text-xs font-medium text-orange-400 mt-1">comptes suspendus</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["publications", "providers", "guides", "reports", "banned"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t
                  ? t === "reports" ? "bg-red-500 text-white shadow-md"
                  : t === "banned" ? "bg-orange-500 text-white shadow-md"
                  : "bg-primary text-slate-900 shadow-md shadow-primary/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}>
              {t === "reports" && <Flag size={14} />}
              {t === "banned" && <ShieldOff size={14} />}
              {tabLabels[t]}
              {counts[t] > 0 && (
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-extrabold ${
                  tab === t ? "bg-white text-slate-900" : "bg-red-100 text-red-600"
                }`}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {tab === "publications" && (
              publications.length === 0 ? <Empty label="Aucun lieu en attente" /> :
              publications.map((pub) => (
                <ContentCard key={pub.id}
                  title={pub.title}
                  badge={pub.type === "place" ? "Lieu" : "Expérience"}
                  meta={[pub.place_name, pub.region].filter(Boolean).join(" · ")}
                  description={pub.description}
                  date={pub.created_at}
                  loading={actionLoading === pub.id}
                  onOpen={() => setDetailPub(pub)}
                  onApprove={() => approve("publications", pub.id)}
                  onReject={() => setRejectTarget({ type: "publications", id: pub.id })}
                />
              ))
            )}


            {tab === "providers" && (
              providers.length === 0 ? <Empty label="Aucun prestataire en attente" /> :
              providers.map((prov) => (
                <ContentCard key={prov.user_id}
                  title={prov.full_name ?? "Prestataire"}
                  badge={prov.org?.name ?? prov.organization ?? "—"}
                  meta={[prov.region, prov.account_email].filter(Boolean).join(" · ")}
                  description={prov.bio}
                  date={new Date().toISOString()}
                  loading={actionLoading === prov.user_id}
                  onOpen={() => setDetailProvider(prov)}
                  onApprove={() => approve("providers", prov.user_id)}
                  onReject={() => setRejectTarget({ type: "providers", id: prov.user_id })}
                />
              ))
            )}

            {tab === "guides" && (
              guides.length === 0 ? <Empty label="Aucun guide en attente" /> :
              guides.map((gd) => (
                <ContentCard key={gd.user_id}
                  title={gd.full_name ?? "Guide"}

                  meta={[gd.zone, gd.ville_residence].filter(Boolean).join(" · ")}
                  description={gd.bio}
                  date={new Date().toISOString()}
                  loading={actionLoading === gd.user_id}
                  onOpen={() => setDetailGuide(gd)}
                  onApprove={() => approve("guides", gd.user_id)}
                  onReject={() => setRejectTarget({ type: "guides", id: gd.user_id })}
                />
              ))
            )}

            {tab === "reports" && (
              reports.length === 0 ? <Empty label="Aucun signalement" /> :
              reports.map((rep) => {
                const isPending = rep.status === "pending";
                const actionLabel: Record<string, string> = { warn: "Averti", ban: "Banni", delete: "Compte supprimé", dismiss: "Rejeté" };
                return (
                  <div key={rep.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${isPending ? "border-red-200" : "border-slate-100"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Reported user */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {rep.reported.photo
                              ? <img src={rep.reported.photo} alt="" className="w-full h-full object-cover" />
                              : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-slate-900 truncate">{rep.reported.full_name ?? "—"}</p>
                            <p className="text-xs text-slate-400 font-medium capitalize">{rep.reported.role.replace("_", " ")}</p>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">
                              <Flag size={11} /> {rep.reason}
                            </span>
                            {!isPending && rep.action_taken && (
                              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                                {actionLabel[rep.action_taken] ?? rep.action_taken}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-medium">
                            Signalé par <strong className="text-slate-600">{rep.reporter.full_name ?? "—"}</strong> · {new Date(rep.created_at).toLocaleDateString("fr-FR")}
                          </p>
                          {rep.admin_note && (
                            <p className="text-xs text-slate-500 mt-1 italic">Note : {rep.admin_note}</p>
                          )}
                        </div>
                      </div>

                      {isPending ? (
                        <button
                          onClick={() => setResolveTarget(rep)}
                          disabled={actionLoading === rep.id}
                          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                          {actionLoading === rep.id
                            ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            : <ShieldOff size={14} />}
                          Résoudre
                        </button>
                      ) : (
                        <span className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl ${rep.status === "dismissed" ? "bg-slate-100 text-slate-500" : "bg-green-50 text-green-600 border border-green-200"}`}>
                          {rep.status === "dismissed" ? "Rejeté" : "Résolu"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            {tab === "banned" && (
              bannedUsers.length === 0 ? <Empty label="Aucun utilisateur banni" /> :
              bannedUsers.map((u) => {
                const isPermanent = !u.ban_until;
                const banDate = u.ban_until ? new Date(u.ban_until) : null;
                const isExpired = banDate && new Date() > banDate;
                return (
                  <div key={u.user_id} className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-slate-900">{u.full_name ?? "—"}</p>
                        <p className="text-xs text-slate-400 font-medium">{u.email} · {u.role.replace("_", " ")}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {isPermanent ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-100 text-red-600">Ban permanent</span>
                          ) : isExpired ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">Expiré le {banDate!.toLocaleDateString("fr-FR")}</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg bg-orange-100 text-orange-700">
                              <Clock size={11} /> Jusqu'au {banDate!.toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Edit ban duration */}
                        {banEditTarget?.user_id === u.user_id ? (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {BAN_DURATIONS.map((d) => (
                                <button key={d.days} onClick={() => setBanEditDays(d.days)}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${banEditDays === d.days ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"}`}>
                                  {d.label}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => updateBan(u.user_id, banEditDays)} disabled={actionLoading === u.user_id}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50">
                              {actionLoading === u.user_id ? "..." : "Appliquer"}
                            </button>
                            <button onClick={() => setBanEditTarget(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100">
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setBanEditTarget(u); setBanEditDays(7); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors">
                            <Clock size={13} /> Modifier
                          </button>
                        )}

                        {/* Unban */}
                        <button onClick={() => unbanUser(u.user_id)} disabled={actionLoading === u.user_id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50">
                          {actionLoading === u.user_id
                            ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            : <UserCheck size={13} />}
                          Débannir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Detail modals */}
      {detailPub && (
        <PublicationDetail pub={detailPub} onClose={closeDetail}
          onApprove={() => approve("publications", detailPub.id)}
          onReject={() => { closeDetail(); setRejectTarget({ type: "publications", id: detailPub.id }); }}
          loading={actionLoading === detailPub.id}
        />
      )}
      {detailGuide && (
        <GuideDetail guide={detailGuide} onClose={closeDetail}
          onApprove={() => approve("guides", detailGuide.user_id)}
          onReject={() => { closeDetail(); setRejectTarget({ type: "guides", id: detailGuide.user_id }); }}
          loading={actionLoading === detailGuide.user_id}
        />
      )}

      {detailProvider && (
        <ProviderDetail provider={detailProvider} onClose={closeDetail}
          onApprove={() => approve("providers", detailProvider.user_id)}
          onReject={() => { closeDetail(); setRejectTarget({ type: "providers", id: detailProvider.user_id }); }}
          loading={actionLoading === detailProvider.user_id}
        />
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={(reason) => reject(rejectTarget.type, rejectTarget.id, reason)}
          onClose={() => setRejectTarget(null)}
        />
      )}

      {/* Resolve report modal */}
      {resolveTarget && (
        <ResolveModal
          report={resolveTarget}
          onConfirm={(action, note) => resolveReport(action, note)}
          onClose={() => setResolveTarget(null)}
        />
      )}
    </div>
  );
}
