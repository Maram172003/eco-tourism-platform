"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Leaf } from "lucide-react";
import { apiFetch } from "@/lib/api";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import { monTableauDeBord } from "@/lib/dashboard-path";

type SectionField = { key: string; label: string; type: "text" | "textarea" | "number"; placeholder?: string };

const SECTION_FIELDS: Record<string, { title: string; icon: string; color: string; fields: SectionField[] }> = {
  restauration: {
    title: "Restauration", icon: "restaurant", color: "orange",
    fields: [
      { key: "menu_description", label: "Description du menu proposé", type: "textarea", placeholder: "Décrivez les plats, options végétariennes, allergènes…" },
      { key: "nb_couverts", label: "Nombre de couverts disponibles", type: "number", placeholder: "Ex : 30" },
      { key: "prix_par_personne", label: "Prix par personne (TND)", type: "number", placeholder: "Ex : 25" },
      { key: "lieu_restauration", label: "Lieu de restauration", type: "text", placeholder: "Nom ou adresse du restaurant" },
      { key: "horaires", label: "Horaires de service", type: "text", placeholder: "Ex : 12h00 – 14h30" },
      { key: "note", label: "Note complémentaire", type: "textarea", placeholder: "Informations supplémentaires…" },
    ],
  },
  hebergement: {
    title: "Hébergement", icon: "hotel", color: "blue",
    fields: [
      { key: "nom_etablissement", label: "Nom de l'établissement", type: "text", placeholder: "Hôtel, gîte, riad…" },
      { key: "type_chambre", label: "Type de chambre proposée", type: "text", placeholder: "Ex : chambre double, suite, dortoir…" },
      { key: "nb_chambres", label: "Nombre de chambres disponibles", type: "number", placeholder: "Ex : 10" },
      { key: "prix_nuit", label: "Prix par nuit (TND)", type: "number", placeholder: "Ex : 80" },
      { key: "services_inclus", label: "Services inclus", type: "textarea", placeholder: "Petit-déjeuner, piscine, wifi, transfert…" },
      { key: "note", label: "Note complémentaire", type: "textarea", placeholder: "Informations supplémentaires…" },
    ],
  },
  transport: {
    title: "Transport", icon: "directions_bus", color: "violet",
    fields: [
      { key: "type_vehicule", label: "Type de véhicule", type: "text", placeholder: "Minibus, 4x4, bus, van…" },
      { key: "capacite", label: "Capacité (personnes)", type: "number", placeholder: "Ex : 12" },
      { key: "trajet", label: "Trajet assuré", type: "text", placeholder: "Départ → Arrivée" },
      { key: "prix_total", label: "Prix total (TND)", type: "number", placeholder: "Ex : 150" },
      { key: "heure_depart", label: "Heure de départ", type: "text", placeholder: "Ex : 08h00" },
      { key: "note", label: "Note complémentaire", type: "textarea", placeholder: "Bagages, climatisation, chauffeur bilingue…" },
    ],
  },
  guide: {
    title: "Guidage", icon: "hiking", color: "green",
    fields: [
      { key: "langues", label: "Langues de guidage", type: "text", placeholder: "Ex : Français, Arabe, Anglais" },
      { key: "specialite", label: "Spécialité / zone couverte", type: "text", placeholder: "Ex : Désert du Sahara, médina de Tunis…" },
      { key: "duree_guidage", label: "Durée du guidage", type: "text", placeholder: "Ex : demi-journée, journée complète" },
      { key: "tarif", label: "Tarif (TND)", type: "number", placeholder: "Ex : 60" },
      { key: "note", label: "Note complémentaire", type: "textarea", placeholder: "Certifications, équipement fourni…" },
    ],
  },
  autre: {
    title: "Autre service", icon: "category", color: "slate",
    fields: [
      { key: "description", label: "Description de votre service", type: "textarea", placeholder: "Décrivez votre contribution à cette offre…" },
      { key: "tarif", label: "Tarif (TND)", type: "number", placeholder: "Ex : 50" },
      { key: "note", label: "Note complémentaire", type: "textarea", placeholder: "Informations supplémentaires…" },
    ],
  },
};

const sectionBgMap: Record<string, string> = {
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  blue:   "bg-blue-50 border-blue-200 text-blue-700",
  violet: "bg-violet-50 border-violet-200 text-violet-700",
  green:  "bg-emerald-50 border-emerald-200 text-emerald-700",
  slate:  "bg-slate-50 border-slate-200 text-slate-700",
};

export default function CollaboratePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const offerId = params.offerId as string;
  const collabId = searchParams.get("collabId") ?? "";
  const section = searchParams.get("section") ?? "autre";

  const [offer, setOffer] = useState<OfferFull | null>(null);
  const [loadingOffer, setLoadingOffer] = useState(true);
  const [collabStatus, setCollabStatus] = useState<string>("pending");
  const [token, setToken] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  const config = SECTION_FIELDS[section] ?? SECTION_FIELDS.autre;
  const sectionBg = sectionBgMap[config.color] ?? sectionBgMap.slate;

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") ?? "";
    setToken(tkn);
    if (!tkn) { router.push("/auth/login"); return; }

    Promise.all([
      apiFetch<OfferFull>(`/guide/offers/${offerId}/detail`, { headers: { Authorization: `Bearer ${tkn}` } }),
      collabId
        ? apiFetch<{ status: string; contribution_data?: Record<string, string> }>(
            `/guide/collaborations/${collabId}/status`,
            { headers: { Authorization: `Bearer ${tkn}` } }
          ).catch(() => null)
        : Promise.resolve(null),
    ]).then(([offerData, collabData]) => {
      setOffer(offerData);
      if (collabData) {
        setCollabStatus(collabData.status ?? "pending");
        if (collabData.contribution_data) {
          setForm(Object.fromEntries(
            Object.entries(collabData.contribution_data).map(([k, v]) => [k, String(v)])
          ));
          if (collabData.status === "completed") setSaved(true);
        }
      }
    }).catch(() => setError("Impossible de charger l'offre."))
      .finally(() => setLoadingOffer(false));
  }, [offerId, collabId, router]);

  function upd(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleAccept() {
    if (!token || !collabId) return;
    setAccepting(true);
    try {
      await apiFetch(`/guide/collaborations/${collabId}/respond`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      setCollabStatus("accepted");
    } catch {
      setError("Erreur lors de l'acceptation.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleSave() {
    if (!token || !collabId) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/guide/collaborations/${collabId}/contribution`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setCollabStatus("completed");
    } catch {
      setError("Erreur lors de la sauvegarde. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <Leaf className="text-primary w-5 h-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="font-extrabold text-sm leading-tight">Offre collaborative</h1>
          {offer && <p className="text-xs text-slate-400 truncate">{offer.title}</p>}
        </div>
        {collabStatus === "completed" && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <span className="material-symbols-outlined text-sm">check_circle</span>Complété
          </span>
        )}
        {collabStatus === "accepted" && (
          <span className="flex items-center gap-1.5 text-primary text-xs font-bold px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
            <span className="material-symbols-outlined text-sm">handshake</span>Accepté
          </span>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {loadingOffer ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : offer ? (
          <>
            {/* ── Offre complète (même présentation que le propriétaire) ───── */}
            <OfferDetailView offer={offer} />

            {/* ── En attente d'acceptation ─────────────────────────────────── */}
            {collabStatus === "pending" && (
              <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-amber-600">handshake</span>
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-800">Invitation à collaborer</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Le guide vous invite à compléter la section <strong>{config.title}</strong> de cette offre.
                    </p>
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-60 text-slate-900 font-extrabold py-3 transition-all text-sm"
                  >
                    {accepting
                      ? <span className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                      : <span className="material-symbols-outlined text-lg">check_circle</span>
                    }
                    Accepter et remplir ma partie
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Refuser cette invitation ?")) return;
                      try {
                        await apiFetch(`/guide/collaborations/${collabId}/respond`, {
                          method: "PATCH",
                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "declined" }),
                        });
                        router.push(monTableauDeBord());
                      } catch { setError("Erreur."); }
                    }}
                    className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            )}

            {/* ── Formulaire de contribution (après acceptation) ───────────── */}
            {(collabStatus === "accepted" || collabStatus === "completed") && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className={`flex items-center gap-3 px-5 py-4 border-b border-slate-100 ${sectionBg}`}>
                  <span className="material-symbols-outlined text-xl">{config.icon}</span>
                  <div>
                    <p className="text-[10px] font-black tracking-widest uppercase opacity-70">Votre partie à remplir</p>
                    <p className="font-extrabold text-sm">{config.title}</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {config.fields.map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs font-extrabold text-slate-600 mb-1.5">{f.label}</label>
                      {f.type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={form[f.key] ?? ""}
                          onChange={(e) => upd(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          disabled={saved}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      ) : (
                        <input
                          type={f.type}
                          value={form[f.key] ?? ""}
                          onChange={(e) => upd(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          disabled={saved}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      )}
                    </div>
                  ))}

                  {error && (
                    <p className="text-sm text-red-500 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">error</span>{error}
                    </p>
                  )}

                  {saved ? (
                    <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4">
                      <span className="material-symbols-outlined text-2xl text-emerald-600">check_circle</span>
                      <div>
                        <p className="font-extrabold text-emerald-700 text-sm">Contribution enregistrée !</p>
                        <p className="text-xs text-emerald-600/80 mt-0.5">Le guide a été notifié. Si tous les collaborateurs ont terminé, l'offre sera publiée automatiquement.</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 disabled:opacity-60 text-slate-900 font-extrabold py-3.5 transition-all text-sm shadow-lg shadow-primary/20"
                    >
                      {saving
                        ? <span className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                        : <span className="material-symbols-outlined text-xl">save</span>
                      }
                      Enregistrer ma contribution
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">error_outline</span>
            <p className="text-sm">{error || "Offre introuvable."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
