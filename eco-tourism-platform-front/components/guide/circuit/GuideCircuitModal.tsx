"use client";

import { useState, useEffect, Fragment } from "react";
import dynamic from "next/dynamic";
import { Route, X, Check, Edit3, Plus, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";
import { DOMAINES } from "@/lib/guideOfferConfig";
import { OfferAvailPicker, EMPTY_OFFER_AVAIL, type OfferAvailSlot } from "@/components/offer/OfferAvailPicker";
import EtapeCollabPickerModal from "@/components/guide/offer/EtapeCollabPickerModal";
import DynamicFields from "@/components/guide/offer/DynamicFields";
import TaxonomyTagPicker from "@/components/common/TaxonomyTagPicker";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), { ssr: false });
const CircuitRouteMap = dynamic(() => import("@/components/map/CircuitRouteMap"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-2xl bg-slate-100 animate-pulse" />,
});

function genId() { return Math.random().toString(36).slice(2, 10); }

type CircuitEtape = {
  id: string; jour: number; heure_debut: string; heure_fin: string;
  titre: string; categorie: string; subtypes: string[]; destination: string;
  description_courte: string; prix: number | null;
  etape_mode: "guidage" | "service"; author_type: "self" | "guide" | "provider";
  collaborator_id: string | null; collaborator_name: string | null; collaborator_type: string | null;
  lat: number | null; lng: number | null; address?: string;
  collab_lat?: number | null; collab_lng?: number | null; collab_destination?: string;
  photos: string[]; fields: Record<string, unknown>; unit_details: Record<string, unknown>;
  nb_unites: Record<string, number>; form_config: Record<string, unknown>; entity_photos: Record<string, string[]>;
};

type PendingKick = { collabId: string; circuitId: string };

function computeNbJours(avail: OfferAvailSlot): number | null {
  if (avail.type === "range" && avail.start_date && avail.end_date) {
    const s = new Date(avail.start_date + "T12:00:00"), e = new Date(avail.end_date + "T12:00:00");
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  }
  if (avail.type === "specific" && (avail.dates?.length ?? 0) > 0) return avail.dates!.length;
  if (avail.type === "recurring" && (avail.days_of_week?.length ?? 0) > 0) return avail.days_of_week!.length;
  return null;
}

interface Props {
  open: boolean;
  token: string;
  editingCircuit?: any | null;
  onClose: () => void;
  onSaved: (circuit: any, isNew: boolean) => void;
}

export default function GuideCircuitModal({ open, token, editingCircuit, onClose, onSaved }: Props) {

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/upload`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    if (!r.ok) throw new Error("Upload échoué");
    return ((await r.json()) as { url: string }).url;
  }

  // ── Form states ───────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  type EtapeConflictEntry = { userName: string; section: string; conflictSlot: string; conflictDays: string[] };
  const [etapeConflict, setEtapeConflict] = useState<{ etapeId: string; data: EtapeConflictEntry[] } | null>(null);
  // Circuit enrichi (depuis /view) utilisé uniquement pour la carte — ne réinitialise pas le formulaire
  const [enrichedForMap, setEnrichedForMap] = useState<any>(null);

  // Infos générales
  const [circTitle, setCircTitle]               = useState("");
  const [circDesc, setCircDesc]                 = useState("");
  const [circNbJours, setCircNbJours]           = useState(1);
  const [circCoverImg, setCircCoverImg]         = useState<{ file: File; preview: string } | null>(null);
  const [circCoverExisting, setCircCoverExisting] = useState<string | null>(null);

  // Disponibilité
  const [circAvail, setCircAvail] = useState<OfferAvailSlot>(EMPTY_OFFER_AVAIL);

  // Hébergement
  const [hebergInclus, setHebergInclus]     = useState(false);
  const [hebergType, setHebergType]         = useState<"same" | "per_day">("same");
  const [hebergSubtypes, setHebergSubtypes] = useState<string[]>([]);
  const [hebergCollab, setHebergCollab]     = useState<{ user_id: string; name: string; type: string } | null>(null);
  const [hebergCollabOpen, setHebergCollabOpen] = useState(false);
  const [hebergConfigOpen, setHebergConfigOpen] = useState(false);

  // Étapes
  const [etapes, setEtapes]               = useState<CircuitEtape[]>([]);
  const [pendingKicks, setPendingKicks]   = useState<PendingKick[]>([]);
  const [etapeStatusMap, setEtapeStatusMap] = useState<Map<string, { status: string; collab_id: string }>>(new Map());
  const [circTags, setCircTags]           = useState<string[]>([]);

  // Étape form (inline, par jour)
  const [etapeFormOpen, setEtapeFormOpen]     = useState(false);
  const [etapeJour, setEtapeJour]             = useState(1);
  const [editingEtapeId, setEditingEtapeId]   = useState<string | null>(null);
  const [editingTimeEtapeId, setEditingTimeEtapeId] = useState<string | null>(null);
  const [etapeMode, setEtapeMode]             = useState<"guidage" | "service">("service");
  const [etapeCategorie, setEtapeCategorie]   = useState("");
  const [etapeSubtypes, setEtapeSubtypes]     = useState<string[]>([]);
  const [etapeTitre, setEtapeTitre]           = useState("");
  const [etapeDescCourte, setEtapeDescCourte] = useState("");
  const [etapePrix, setEtapePrix]             = useState("");
  const [etapeHeureDebut, setEtapeHeureDebut] = useState("09:00");
  const [etapeHeureFin, setEtapeHeureFin]     = useState("12:00");
  const [etapeLat, setEtapeLat]               = useState<number | null>(null);
  const [etapeLng, setEtapeLng]               = useState<number | null>(null);
  const [etapeAddress, setEtapeAddress]       = useState<string | undefined>(undefined);
  const [etapeCollabSelected, setEtapeCollabSelected] = useState<{ user_id: string; name: string; type: string } | null>(null);
  const [etapeCollabOpen, setEtapeCollabOpen] = useState(false);
  const [etapeFormError, setEtapeFormError]   = useState("");
  // Mode guidage : domaine + expertises + responsable
  const [etapeGuidageDomaine, setEtapeGuidageDomaine]         = useState("");
  const [etapeGuidageExpertises, setEtapeGuidageExpertises]   = useState<string[]>([]);
  const [etapeGuidageAuthorType, setEtapeGuidageAuthorType]   = useState<"self" | "guide">("self");
  const [etapeGuidageFields, setEtapeGuidageFields]           = useState<Record<string, any>>({});
  const [etapeDescLongue, setEtapeDescLongue]                 = useState("");
  // Mode service : responsable (guide lui-même ou prestataire partenaire)
  const [etapeServiceAuthorType, setEtapeServiceAuthorType]   = useState<"self" | "provider">("provider");

  // Fetch circuit enrichi (contribution prestataire hébergement) pour afficher le marqueur sur la carte
  useEffect(() => {
    if (!open || !editingCircuit?.id) { setEnrichedForMap(null); return; }
    apiFetch<any>(`/circuits/${editingCircuit.id}/view`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (r) setEnrichedForMap(r); })
      .catch(() => {});
  }, [open, editingCircuit?.id]);

  // ── Init / reset ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (editingCircuit) {
      setCircTitle(editingCircuit.title ?? "");
      setCircDesc(editingCircuit.description ?? "");
      setCircNbJours(editingCircuit.nb_jours ?? 1);
      setCircCoverExisting(editingCircuit.cover_image ?? null);
      setCircCoverImg(null);
      setCircAvail(editingCircuit.availability ?? EMPTY_OFFER_AVAIL);
      const hb = (editingCircuit.hebergement ?? {}) as any;
      setHebergInclus(!!hb.inclus);
      setHebergType(hb.type ?? "same");
      setHebergSubtypes((hb.etape?.subtypes ?? []) as string[]);
      setHebergCollab(hb.etape?.collaborator_id ? { user_id: hb.etape.collaborator_id, name: hb.etape.collaborator_name ?? "", type: "provider" } : null);
      setEtapes((editingCircuit.etapes ?? []) as CircuitEtape[]);
      setCircTags(editingCircuit.tags ?? []);
      setFormError(""); setEtapeConflict(null); setPendingKicks([]);
      if (editingCircuit.id) {
        apiFetch<any[]>(`/circuits/${editingCircuit.id}/collaborations`, { headers: { Authorization: `Bearer ${token}` } })
          .then((cs) => {
            const m = new Map<string, { status: string; collab_id: string }>();
            (cs ?? []).forEach((c) => m.set(c.etape_id, { status: c.status, collab_id: c.id }));
            setEtapeStatusMap(m);
          }).catch(() => {});
      }
    } else {
      resetAll();
    }
  }, [open, editingCircuit]);

  // Auto nb_jours depuis disponibilité
  useEffect(() => {
    const n = computeNbJours(circAvail);
    if (n !== null) {
      setCircNbJours(n);
      setEtapes((prev) => prev.filter((e) => e.jour <= n));
    }
  }, [circAvail]);

  function resetAll() {
    setFormError(""); setEtapeConflict(null); setSaving(false);
    setCircTitle(""); setCircDesc(""); setCircNbJours(1);
    setCircCoverImg(null); setCircCoverExisting(null);
    setCircAvail(EMPTY_OFFER_AVAIL);
    setHebergInclus(false); setHebergType("same"); setHebergSubtypes([]); setHebergCollab(null);
    setEtapes([]); setPendingKicks([]); setEtapeStatusMap(new Map()); setCircTags([]);
    resetEtapeForm();
  }

  function resetEtapeForm() {
    setEtapeFormOpen(false); setEditingEtapeId(null); setEtapeJour(1);
    setEtapeMode("service");
    setEtapeCategorie(""); setEtapeSubtypes([]); setEtapeTitre(""); setEtapeDescCourte(""); setEtapeDescLongue("");
    setEtapePrix(""); setEtapeHeureDebut("09:00"); setEtapeHeureFin("12:00");
    setEtapeLat(null); setEtapeLng(null); setEtapeAddress(undefined);
    setEtapeCollabSelected(null); setEtapeFormError("");
    setEtapeGuidageDomaine(""); setEtapeGuidageExpertises([]); setEtapeGuidageAuthorType("self"); setEtapeGuidageFields({});
    setEtapeServiceAuthorType("provider");
  }

  function openEtapeEdit(act: CircuitEtape) {
    resetEtapeForm();
    setEditingEtapeId(act.id); setEtapeJour(act.jour);
    setEtapeMode(act.etape_mode ?? "service");
    if (act.etape_mode === "guidage") {
      setEtapeGuidageDomaine(act.categorie ?? "");
      setEtapeGuidageExpertises((act.fields?.expertises as string[]) ?? []);
      setEtapeDescLongue((act.fields?.description_longue as string) ?? "");
      setEtapeGuidageFields((act.fields?.dynamic_fields as Record<string, any>) ?? {});
      const gAuthor = act.author_type === "guide" ? "guide" : "self";
      setEtapeGuidageAuthorType(gAuthor);
      if (gAuthor === "guide" && act.collaborator_id) {
        setEtapeCollabSelected({ user_id: act.collaborator_id, name: act.collaborator_name ?? "", type: act.collaborator_type ?? "guide" });
      }
    } else {
      setEtapeCategorie(act.categorie); setEtapeSubtypes(act.subtypes);
      setEtapeServiceAuthorType(act.author_type === "self" ? "self" : "provider");
      setEtapeDescLongue((act.fields?.description_longue as string) ?? "");
    }
    setEtapeTitre(act.titre); setEtapeDescCourte(act.description_courte);
    setEtapePrix(act.prix?.toString() ?? "");
    setEtapeHeureDebut(act.heure_debut); setEtapeHeureFin(act.heure_fin);
    setEtapeLat(act.lat); setEtapeLng(act.lng); setEtapeAddress(act.address);
    if (act.collaborator_id) setEtapeCollabSelected({ user_id: act.collaborator_id, name: act.collaborator_name ?? "", type: act.collaborator_type ?? "provider" });
    setEtapeFormOpen(true);
  }

  async function addEtape() {
    setEtapeFormError("");
    const isGuidage = etapeMode === "guidage";
    if (!etapeHeureDebut || !etapeHeureFin) { setEtapeFormError("Horaires requis."); return; }
    if (isGuidage && !etapeGuidageDomaine) { setEtapeFormError("Choisissez un domaine de guidage."); return; }
    if (isGuidage && etapeGuidageAuthorType === "self" && !etapeTitre.trim()) { setEtapeFormError("Titre requis."); return; }
    if (isGuidage && etapeGuidageAuthorType === "guide" && !etapeCollabSelected) { setEtapeFormError("Invitez un guide pour cette activité."); return; }
    if (!isGuidage && !etapeCategorie) { setEtapeFormError("Choisissez une catégorie de service."); return; }
    if (!isGuidage && etapeServiceAuthorType === "self" && !etapeTitre.trim()) { setEtapeFormError("Titre requis."); return; }
    if (!isGuidage && etapeServiceAuthorType === "provider" && !etapeCollabSelected) { setEtapeFormError("Invitez un prestataire pour cette étape."); return; }

    // Vérification agenda : guide fait lui-même l'activité → bloquer si créneau personnel conflictuel
    const isSelfActivity = (isGuidage && etapeGuidageAuthorType === "self") || (!isGuidage && etapeServiceAuthorType === "self");
    if (isSelfActivity) {
      if (!circAvail.type) {
        setEtapeFormError("Définissez d'abord la disponibilité du circuit pour vérifier votre agenda.");
        return;
      }
      try {
        const res = await apiFetch<{ conflicts: Array<{ jour: number; conflictSlot: string; conflictDays: string[] }> }>(
          "/circuits/validate-guide-etapes",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ availability: circAvail, nb_jours: circNbJours, etapes: [{ jour: etapeJour, heure_debut: etapeHeureDebut, heure_fin: etapeHeureFin }] }),
          }
        );
        if (res.conflicts.length > 0) {
          const c = res.conflicts[0];
          setEtapeFormError(`Conflit d'agenda : créneau « ${c.conflictSlot} » le ${c.conflictDays[0] ?? ""}. Libérez ce créneau dans votre agenda ou modifiez les horaires.`);
          return;
        }
      } catch {
        setEtapeFormError("Impossible de vérifier votre agenda. Vérifiez votre connexion et réessayez.");
        return;
      }
    }

    const resolvedAuthorType = isGuidage ? etapeGuidageAuthorType : etapeServiceAuthorType;
    const hasCollab = (isGuidage && etapeGuidageAuthorType === "guide") || (!isGuidage && etapeServiceAuthorType === "provider");

    const newEtape: CircuitEtape = {
      id: editingEtapeId ?? genId(),
      jour: etapeJour, heure_debut: etapeHeureDebut, heure_fin: etapeHeureFin,
      titre: etapeTitre,
      categorie: isGuidage ? (etapeGuidageDomaine || "guidage") : etapeCategorie,
      subtypes: isGuidage ? [] : etapeSubtypes,
      destination: etapeAddress?.split(",")[0].trim() ?? "",
      description_courte: etapeDescCourte, prix: etapePrix ? Number(etapePrix) : null,
      etape_mode: isGuidage ? "guidage" : "service",
      author_type: resolvedAuthorType,
      collaborator_id: hasCollab ? (etapeCollabSelected?.user_id ?? null) : null,
      collaborator_name: hasCollab ? (etapeCollabSelected?.name ?? null) : null,
      collaborator_type: hasCollab ? (etapeCollabSelected?.type ?? null) : null,
      lat: etapeLat, lng: etapeLng, address: etapeAddress,
      photos: [],
      fields: isGuidage
        ? { domaine: etapeGuidageDomaine, expertises: etapeGuidageExpertises, description_longue: etapeDescLongue, dynamic_fields: etapeGuidageFields }
        : (etapeServiceAuthorType === "self" ? { description_longue: etapeDescLongue } : {}),
      unit_details: {}, nb_unites: {}, form_config: {}, entity_photos: {},
    };

    setEtapes((prev) => editingEtapeId ? prev.map((e) => e.id === editingEtapeId ? newEtape : e) : [...prev, newEtape]);
    resetEtapeForm();
  }

  async function saveCircuit() {
    setFormError("");
    setEtapeConflict(null);
    if (!circTitle.trim()) { setFormError("Le titre est requis."); return; }
    if (circNbJours < 1) { setFormError("Au moins 1 jour requis."); return; }
    if (hebergInclus && hebergType === "same" && hebergSubtypes.length === 0) { setFormError("Choisissez au moins un type d'hébergement dans le slot 'Hébergement du circuit'."); return; }
    if (hebergInclus && hebergType === "same" && !hebergCollab) { setFormError("Hébergement inclus : invitez un prestataire hébergement dans le slot 'Hébergement du circuit'."); return; }

    // Filet de sécurité : re-vérifier les étapes "self" au moment de la sauvegarde
    const selfEtapes = etapes.filter((e) => e.author_type === "self");
    if (selfEtapes.length > 0 && circAvail.type) {
      try {
        const res = await apiFetch<{ conflicts: Array<{ jour: number; conflictSlot: string; conflictDays: string[] }> }>(
          "/circuits/validate-guide-etapes",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ availability: circAvail, nb_jours: circNbJours, etapes: selfEtapes.map((e) => ({ jour: e.jour, heure_debut: e.heure_debut, heure_fin: e.heure_fin })) }),
          }
        );
        if (res.conflicts.length > 0) {
          const c = res.conflicts[0];
          setFormError(`Conflit d'agenda : Jour ${c.jour} — créneau « ${c.conflictSlot} » le ${c.conflictDays[0] ?? ""}. Libérez ce créneau dans votre agenda ou modifiez les horaires.`);
          return;
        }
      } catch {
        setFormError("Impossible de vérifier votre disponibilité agenda. Vérifiez votre connexion et réessayez.");
        return;
      }
    }

    setSaving(true);
    try {
      let coverUrl: string | null = circCoverExisting ?? null;
      if (circCoverImg) coverUrl = await uploadImage(circCoverImg.file);

      const hebergBody = hebergInclus ? {
        inclus: true, type: hebergType,
        etape: hebergType === "same" ? {
          id: "hebergement", categorie: "hebergement", subtypes: hebergSubtypes,
          author_type: "provider", collaborator_id: hebergCollab?.user_id ?? null,
          collaborator_name: hebergCollab?.name ?? null, collaborator_type: "provider",
          jour: -1, heure_debut: "", heure_fin: "", titre: "", description_courte: "",
          destination: "", prix: null, lat: null, lng: null,
          photos: [], fields: {}, unit_details: {}, nb_unites: {}, form_config: {}, entity_photos: {},
        } : null,
      } : { inclus: false };

      const body = { title: circTitle.trim(), description: circDesc.trim() || null, nb_jours: circNbJours, cover_image: coverUrl, etapes, availability: circAvail, hebergement: hebergBody, ...(circTags.length ? { tags: circTags } : {}) };

      let circuit: any;
      if (editingCircuit?.id) {
        circuit = await apiFetch<any>(`/circuits/${editingCircuit.id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        circuit = await apiFetch<any>("/circuits", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      const cId = circuit?.id ?? editingCircuit?.id;

      // Inviter les collaborateurs des étapes (seulement les nouvelles)
      const collabEtapes = etapes.filter((e) => (e.author_type === "provider" || e.author_type === "guide") && e.collaborator_id && !etapeStatusMap.has(e.id));
      for (const e of collabEtapes) {
        const invitedType = e.author_type === "guide" ? "guide" : "provider";
        await apiFetch(`/circuits/${cId}/collaborations`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ etape_id: e.id, invited_user_id: e.collaborator_id, invited_user_type: invitedType, invited_user_name: e.collaborator_name, section: e.categorie }),
        }).catch(() => {});
      }

      // Inviter le collaborateur hébergement si nouveau
      if (hebergInclus && hebergType === "same" && hebergCollab && !etapeStatusMap.has("hebergement")) {
        await apiFetch(`/circuits/${cId}/collaborations`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ etape_id: "hebergement", invited_user_id: hebergCollab.user_id, invited_user_type: "provider", invited_user_name: hebergCollab.name, section: "hebergement" }),
        }).catch(() => {});
      }

      // Exécuter les kicks différés
      for (const kick of pendingKicks) {
        await apiFetch(`/circuits/${kick.circuitId}/collaborations/${kick.collabId}/kick`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }

      onSaved(circuit ?? { ...body, id: cId }, !editingCircuit?.id);
    } catch (err: any) {
      setFormError(err?.message ?? "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const isApproved = editingCircuit?.status === "approved";
  const isAutoNbJours = computeNbJours(circAvail) !== null;

  // Disponibilité de l'étape pour la vérification de conflits (EtapeCollabPickerModal)
  const etapeConflictAvail = (() => {
    let date: string | null = null;
    if (circAvail.type === "range" && circAvail.start_date) {
      const d = new Date(circAvail.start_date + "T12:00:00"); d.setDate(d.getDate() + etapeJour - 1); date = d.toISOString().split("T")[0];
    } else if (circAvail.type === "specific" && circAvail.dates?.length) {
      date = [...circAvail.dates].sort()[etapeJour - 1] ?? null;
    }
    if (!date) return undefined;
    return { type: "specific" as const, dates: [date], time_slots: etapeHeureDebut && etapeHeureFin ? { [date]: [{ start: etapeHeureDebut, end: etapeHeureFin }] } : null };
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-slate-100 shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Route size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
              {editingCircuit ? (isApproved ? "Circuit publié (lecture seule)" : "Modifier le circuit") : "Nouveau circuit"}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Itinéraire multi-destinations avec activités guidées et services partenaires</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body — scroll unique */}
        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-7">

          {/* ── Informations générales ── */}
          <div className="space-y-4">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Informations générales</p>
            <div>
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Titre du circuit *</label>
              <input type="text" placeholder="Ex : Tour du Nord Tunisien — 5 jours"
                value={circTitle} onChange={(e) => { setCircTitle(e.target.value); setFormError(""); }} disabled={isApproved}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white disabled:opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Nombre de jours</label>
                {isAutoNbJours ? (
                  <div className="flex items-center gap-2 w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-extrabold text-primary">{circNbJours}</span>
                    <span className="text-xs text-slate-400 font-medium">jour(s) — calculé depuis les dates</span>
                    <span className="material-symbols-outlined text-slate-300 text-base ml-auto">lock</span>
                  </div>
                ) : (
                  <input type="number" min="1" max="30" value={circNbJours}
                    onChange={(e) => { const n = Math.max(1, Number(e.target.value)); setEtapes((prev) => prev.filter((ep) => ep.jour <= n)); setCircNbJours(n); }}
                    disabled={isApproved}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60" />
                )}
              </div>
              <div>
                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Photo de couverture</label>
                <label className={`flex items-center gap-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 hover:border-primary/50 transition-colors ${isApproved ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
                  {circCoverImg
                    ? <img src={circCoverImg.preview} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    : circCoverExisting
                      ? <img src={circCoverExisting} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      : <span className="material-symbols-outlined text-slate-300 text-xl">add_photo_alternate</span>}
                  <span className="text-xs font-semibold text-slate-400">{circCoverImg || circCoverExisting ? "Changer" : "Choisir"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    if (circCoverImg) URL.revokeObjectURL(circCoverImg.preview);
                    setCircCoverImg({ file: f, preview: URL.createObjectURL(f) }); e.target.value = "";
                  }} />
                </label>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block">Description</label>
              <textarea rows={3} placeholder="Décrivez le circuit, les points forts…"
                value={circDesc} onChange={(e) => setCircDesc(e.target.value)} disabled={isApproved}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-400 disabled:opacity-60" />
            </div>
          </div>

          {/* ── Disponibilité ── */}
          <div className="space-y-3">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Disponibilité</p>
            <OfferAvailPicker value={circAvail} onChange={setCircAvail} hideTimeSlots />
          </div>

          {/* ── Hébergement ── */}
          <div className="space-y-3">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Hébergement</p>
            <div className="grid grid-cols-2 gap-2">
              {(["non", "inclus"] as const).map((val) => {
                const isInclus = val === "inclus";
                const active = hebergInclus === isInclus;
                return (
                  <button key={val} type="button" onClick={() => !isApproved && setHebergInclus(isInclus)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${active ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                    <span className={`material-symbols-outlined text-sm ${active ? "text-primary" : "text-slate-400"}`}>{isInclus ? "hotel" : "hotel_class"}</span>
                    {isInclus ? "Hébergement inclus" : "Non inclus"}
                  </button>
                );
              })}
            </div>

            {hebergInclus && (
              <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "same",    label: "Même sur tout le circuit", icon: "sync" },
                    { value: "per_day", label: "Variable par jour",         icon: "calendar_view_day" },
                  ] as const).map((opt) => (
                    <button key={opt.value} type="button" onClick={() => !isApproved && setHebergType(opt.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl border-2 text-[10px] font-bold transition-all ${hebergType === opt.value ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                      <span className={`material-symbols-outlined text-sm ${hebergType === opt.value ? "text-primary" : "text-slate-400"}`}>{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {hebergType === "same" && (
                  <p className="text-[10px] text-slate-400">
                    <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">info</span>
                    Configurez l'hébergement dans le slot "Hébergement du circuit" ci-dessous.
                  </p>
                )}

                {hebergType === "per_day" && (
                  <p className="text-[10px] text-slate-400">
                    <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">info</span>
                    Configurez l'hébergement dans chaque jour directement.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Étapes — un slot par jour ── */}
          <div className="space-y-4">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
              Étapes ({etapes.length}/{circNbJours} jours configurés)
            </p>

            {/* ── Slot hébergement du circuit ── */}
            {hebergInclus && hebergType === "same" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${hebergSubtypes.length > 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                    <span className="material-symbols-outlined text-[13px]">hotel</span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-600">Hébergement du circuit</p>
                  {hebergConfigOpen && (
                    <button type="button" onClick={() => setHebergConfigOpen(false)}
                      className="ml-auto text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">Annuler</button>
                  )}
                </div>

                {!hebergConfigOpen && hebergSubtypes.length > 0 && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {hebergSubtypes.map((sv) => {
                          const stLabel = PROVIDER_SCHEMA.find((c) => c.value === "hebergement")?.subtypes.find((s) => s.value === sv)?.label ?? sv;
                          return <span key={sv} className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-bold rounded-lg">{stLabel}</span>;
                        })}
                      </div>
                      {!isApproved && (
                        <button type="button" onClick={() => setHebergConfigOpen(true)}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer shrink-0">Modifier</button>
                      )}
                    </div>
                    {hebergCollab && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <span className="material-symbols-outlined text-[14px] text-primary">person</span>
                        {hebergCollab.name}
                      </div>
                    )}
                  </div>
                )}

                {!hebergConfigOpen && hebergSubtypes.length === 0 && !isApproved && (
                  <button type="button" onClick={() => setHebergConfigOpen(true)}
                    className="w-full flex items-center justify-between px-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer">
                    <span className="text-xs font-extrabold">Non configuré</span>
                    <span className="text-xs font-extrabold text-primary">Configurer →</span>
                  </button>
                )}

                {hebergConfigOpen && (
                  <div className="p-4 bg-emerald-50/60 border border-primary/20 rounded-2xl space-y-4">
                    <p className="text-[10px] font-black tracking-widest text-teal-700 uppercase">Configurer l'hébergement</p>

                    <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">info</span>
                      <p className="text-xs font-semibold text-amber-800">En tant que guide, l'hébergement doit être géré par un prestataire partenaire. Invitez-le pour qu'il configure les détails.</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Type d'hébergement *</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(PROVIDER_SCHEMA.find((c) => c.value === "hebergement")?.subtypes ?? []).map((st) => {
                          const sel = hebergSubtypes.includes(st.value);
                          return (
                            <button key={st.value} type="button"
                              onClick={() => setHebergSubtypes((prev) => sel ? prev.filter((v) => v !== st.value) : [...prev, st.value])}
                              className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-extrabold transition-all cursor-pointer ${sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {hebergCollab ? (
                      <div className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-extrabold text-primary">{hebergCollab.name.slice(0, 1).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-slate-800 truncate">{hebergCollab.name}</p>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Prestataire hébergement</span>
                        </div>
                        <button type="button" onClick={() => setHebergCollab(null)}
                          className="w-7 h-7 rounded-full bg-white hover:bg-red-50 border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setHebergCollabOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group cursor-pointer">
                        <span className="material-symbols-outlined text-base group-hover:text-primary">person_add</span>
                        <span className="text-xs font-extrabold">+ Inviter un prestataire hébergement</span>
                      </button>
                    )}

                    <EtapeCollabPickerModal
                      open={hebergCollabOpen} filterMode="hebergement" token={token}
                      onClose={() => setHebergCollabOpen(false)}
                      onSelect={(r) => { setHebergCollab(r); setHebergCollabOpen(false); }}
                    />

                    <div className="flex gap-2 justify-end pt-1">
                      <button type="button" onClick={() => setHebergConfigOpen(false)}
                        className="px-4 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors">
                        Annuler
                      </button>
                      <button type="button"
                        disabled={!hebergCollab || hebergSubtypes.length === 0}
                        onClick={() => setHebergConfigOpen(false)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <Check size={12} />Enregistrer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {Array.from({ length: circNbJours }, (_, i) => i + 1).map((jour) => {
              const jourEtapes = etapes.filter((e) => e.jour === jour);
              const isFormHere = etapeFormOpen && etapeJour === jour;

              return (
                <div key={jour} className="space-y-2">
                  {/* Jour header */}
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${jourEtapes.length > 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                      {jour}
                    </div>
                    <p className="text-xs font-extrabold text-slate-600">Jour {jour}</p>
                    {isFormHere && (
                      <button type="button" onClick={resetEtapeForm}
                        className="ml-auto text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer">Annuler</button>
                    )}
                  </div>

                  {/* Liste des activités */}
                  {jourEtapes.map((act) => {
                    const actCat = PROVIDER_SCHEMA.find((c) => c.value === act.categorie);
                    const actCatLabel = actCat?.label ?? DOMAINES[act.categorie as string]?.label ?? act.categorie;
                    const actStLabels = act.subtypes.map((sv) => actCat?.subtypes.find((s) => s.value === sv)?.label ?? sv);
                    const actExpertises = (act.fields?.expertises as string[] | undefined) ?? [];
                    const hasCollab = !!act.collaborator_id && act.author_type !== "self";
                    const collabEntry = etapeStatusMap.get(act.id);
                    const collabStatusMeta: Record<string, { label: string; cls: string }> = {
                      pending:   { label: "En attente",         cls: "bg-amber-100 text-amber-700" },
                      accepted:  { label: "Accepté",            cls: "bg-blue-100 text-blue-700" },
                      completed: { label: "Contribution reçue", cls: "bg-teal-100 text-teal-700" },
                      declined:  { label: "Refusé",             cls: "bg-red-100 text-red-600" },
                    };
                    const sMeta = collabEntry?.status ? (collabStatusMeta[collabEntry.status] ?? { label: collabEntry.status, cls: "bg-slate-100 text-slate-500" }) : null;

                    return (
                      <Fragment key={act.id}>
                      <div className={`rounded-2xl border ml-9 overflow-hidden ${hasCollab ? "bg-green-50/40 border-green-200/60" : "bg-slate-50 border-slate-100"}`}>
                        <div className="flex items-center gap-3 p-3">
                          <div className="flex-1 min-w-0">
                            {hasCollab && !isApproved && editingTimeEtapeId === act.id ? (
                              <div className="flex items-center gap-1 mb-0.5">
                                <input
                                  type="time"
                                  value={act.heure_debut}
                                  onChange={(e) => setEtapes((prev) => prev.map((et) => et.id === act.id ? { ...et, heure_debut: e.target.value } : et))}
                                  className="text-[10px] font-black text-primary bg-transparent border-b border-primary/40 focus:border-primary focus:outline-none w-[72px]"
                                />
                                <span className="text-[10px] font-black text-primary">→</span>
                                <input
                                  type="time"
                                  value={act.heure_fin}
                                  onChange={(e) => setEtapes((prev) => prev.map((et) => et.id === act.id ? { ...et, heure_fin: e.target.value } : et))}
                                  className="text-[10px] font-black text-primary bg-transparent border-b border-primary/40 focus:border-primary focus:outline-none w-[72px]"
                                />
                              </div>
                            ) : (
                              <p className="text-[10px] font-black text-primary mb-0.5">{act.heure_debut} → {act.heure_fin}</p>
                            )}
                            <p className="text-sm font-extrabold text-slate-800 truncate">{act.titre || act.destination}</p>
                            <p className="text-[10px] text-slate-400 font-semibold truncate">
                              {actCatLabel}
                              {actStLabels.length > 0 && ` · ${actStLabels.join(", ")}`}
                              {actExpertises.length > 0 && ` · ${actExpertises.slice(0, 2).join(", ")}${actExpertises.length > 2 ? "…" : ""}`}
                              {act.author_type === "self" && act.etape_mode === "guidage" && <span className="ml-1 text-primary font-bold">· Guidé par moi</span>}
                              {act.author_type === "self" && act.etape_mode === "service" && <span className="ml-1 text-primary font-bold">· Assuré par moi</span>}
                            </p>
                            {act.prix != null && <p className="text-[10px] font-black text-primary mt-0.5">{act.prix} TND</p>}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {!isApproved && !hasCollab && (
                              <button type="button" onClick={() => openEtapeEdit(act)}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-primary flex items-center justify-center transition-colors cursor-pointer">
                                <Edit3 size={10} />
                              </button>
                            )}
                            {!isApproved && !hasCollab && (
                              <button type="button" onClick={() => setEtapes((prev) => prev.filter((e) => e.id !== act.id))}
                                className="w-6 h-6 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer">
                                <X size={10} />
                              </button>
                            )}
                            {!isApproved && hasCollab && editingTimeEtapeId !== act.id && (
                              <button type="button" onClick={() => setEditingTimeEtapeId(act.id)}
                                title="Modifier l'horaire"
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-primary flex items-center justify-center transition-colors cursor-pointer">
                                <Edit3 size={10} />
                              </button>
                            )}
                            {!isApproved && hasCollab && editingTimeEtapeId === act.id && (
                              <button type="button" title="Confirmer"
                                className="w-6 h-6 rounded-lg bg-green-50 hover:bg-green-100 text-green-500 flex items-center justify-center transition-colors cursor-pointer"
                                onClick={async () => {
                                  setEditingTimeEtapeId(null);
                                  setEtapeConflict(null);
                                  if (editingCircuit?.id && circAvail.type) {
                                    try {
                                      const result = await apiFetch<EtapeConflictEntry[]>(
                                        `/circuits/${editingCircuit.id}/collab-conflicts`,
                                        {
                                          method: "POST",
                                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                          body: JSON.stringify({ availability: circAvail, etapes }),
                                        }
                                      );
                                      if (result && result.length > 0) setEtapeConflict({ etapeId: act.id, data: result });
                                    } catch {}
                                  }
                                }}>
                                <Check size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                        {hasCollab && (
                          <div className="flex items-center gap-2 px-3 py-2 border-t border-green-200/50 bg-green-50/60">
                            <span className="material-symbols-outlined text-[13px] text-green-600">lock</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 truncate">
                                Géré par <span className="font-extrabold text-green-700">{act.collaborator_name ?? "collaborateur"}</span>
                              </p>
                            </div>
                            {sMeta && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${sMeta.cls}`}>{sMeta.label}</span>}
                            {!isApproved && (
                              <button type="button" onClick={() => {
                                if (collabEntry?.collab_id && editingCircuit?.id) {
                                  setPendingKicks((prev) => [...prev, { collabId: collabEntry.collab_id, circuitId: editingCircuit.id }]);
                                }
                                setEtapes((prev) => prev.filter((e) => e.id !== act.id));
                              }} className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Retirer le collaborateur">
                                <X size={9} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {etapeConflict?.etapeId === act.id && etapeConflict.data.length > 0 && (
                        <div className="ml-9 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-amber-500 text-[14px] mt-0.5">warning</span>
                            <div className="flex-1">
                              <p className="text-[11px] font-extrabold text-amber-700 mb-1">
                                {etapeConflict.data.length} collaborateur{etapeConflict.data.length > 1 ? "s ont" : " a"} un conflit d&apos;agenda
                              </p>
                              {etapeConflict.data.map((c, i) => (
                                <p key={i} className="text-[10px] text-amber-700 font-semibold mb-0.5">
                                  <span className="font-extrabold">{c.userName}</span> — conflit avec &ldquo;{c.conflictSlot}&rdquo;
                                  {c.conflictDays.length > 0 && (
                                    <span className="text-amber-500">
                                      {" · "}
                                      {c.conflictDays.slice(0, 2).map((d) =>
                                        new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                                      ).join(", ")}
                                      {c.conflictDays.length > 2 && ` +${c.conflictDays.length - 2}`}
                                    </span>
                                  )}
                                </p>
                              ))}
                              <button type="button"
                                onClick={() => setEtapeConflict(null)}
                                className="mt-1.5 text-[10px] font-extrabold text-amber-700 underline cursor-pointer hover:text-amber-900">
                                Confirmer quand même
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      </Fragment>
                    );
                  })}

                  {/* Slot vide / bouton ajouter */}
                  {!isFormHere && !isApproved && (
                    <div className="ml-9">
                      {jourEtapes.length === 0 ? (
                        <div className="flex items-center justify-between px-4 py-3 border-2 border-dashed border-slate-200 rounded-2xl">
                          <p className="text-xs text-slate-400 font-semibold">Non configuré</p>
                          <button type="button"
                            onClick={() => { resetEtapeForm(); setEtapeJour(jour); setEtapeFormOpen(true); }}
                            className="text-[11px] font-extrabold text-primary hover:text-primary/80 cursor-pointer">
                            Configurer →
                          </button>
                        </div>
                      ) : (
                        <button type="button"
                          onClick={() => { resetEtapeForm(); setEtapeJour(jour); setEtapeFormOpen(true); }}
                          className="w-full py-2 border-2 border-dashed border-primary/30 rounded-xl text-[11px] font-extrabold text-primary hover:bg-primary/5 transition-colors cursor-pointer">
                          + Ajouter une activité pour ce jour
                        </button>
                      )}
                    </div>
                  )}

                  {/* Formulaire activité inline */}
                  {isFormHere && (
                    <div className="ml-9 border-2 border-primary/20 rounded-2xl p-5 bg-primary/5 space-y-4">
                      <p className="text-[10px] font-black tracking-widest text-primary uppercase">
                        {editingEtapeId ? "Modifier l'activité" : "Nouvelle activité"} — Jour {jour}
                      </p>

                      {/* Horaires */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">
                          Plage horaire dans le circuit <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Début</label>
                            <input type="time" value={etapeHeureDebut} onChange={(e) => setEtapeHeureDebut(e.target.value)}
                              className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${!etapeHeureDebut && etapeFormError ? "border-red-300" : "border-slate-200"}`} />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 mb-0.5 block">Fin</label>
                            <input type="time" value={etapeHeureFin} onChange={(e) => setEtapeHeureFin(e.target.value)}
                              className={`w-full bg-white border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${!etapeHeureFin && etapeFormError ? "border-red-300" : "border-slate-200"}`} />
                          </div>
                        </div>
                      </div>

                      {/* Toggle mode : Guidage | Service prestataire */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                          Mode de l'étape <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            ["service", "Service prestataire", "store"],
                            ["guidage", "Guidage", "hiking"],
                          ] as const).map(([val, lbl, ico]) => (
                            <button key={val} type="button"
                              onClick={() => { setEtapeMode(val); setEtapeCategorie(""); setEtapeSubtypes([]); setEtapeCollabSelected(null); setEtapeGuidageDomaine(""); setEtapeGuidageExpertises([]); setEtapeFormError(""); }}
                              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${etapeMode === val ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                              <span className="material-symbols-outlined text-base">{ico}</span>{lbl}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* ── Mode GUIDAGE : guide participe lui-même ── */}
                      {etapeMode === "guidage" && (
                        <div className="space-y-4">
                          {/* Domaines (même UI que le prestataire) */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                              Domaine de guidage <span className="text-red-400">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(DOMAINES).map(([key, cfg]) => {
                                const active = etapeGuidageDomaine === key;
                                return (
                                  <button key={key} type="button"
                                    onClick={() => { setEtapeGuidageDomaine(active ? "" : key); setEtapeGuidageExpertises([]); setEtapeGuidageFields({}); setEtapeFormError(""); }}
                                    className={`flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${active ? "bg-primary/10 border-primary shadow-sm" : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/5"}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary/20" : "bg-slate-100"}`}>
                                      <span className={`material-symbols-outlined text-base ${active ? "text-primary" : "text-slate-500"}`}>{cfg.icon}</span>
                                    </div>
                                    <p className={`flex-1 font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>{cfg.label}</p>
                                    {active && <span className="material-symbols-outlined text-primary text-base shrink-0">check_circle</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Expertises du domaine sélectionné */}
                          {etapeGuidageDomaine && (() => {
                            const domaine = DOMAINES[etapeGuidageDomaine];
                            if (!domaine?.expertises?.length) return null;
                            return (
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                                  Expertises <span className="text-slate-300 normal-case font-medium">(optionnel)</span>
                                </label>
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                                  {domaine.expertises.map((exp) => {
                                    const sel = etapeGuidageExpertises.includes(exp);
                                    return (
                                      <button key={exp} type="button"
                                        onClick={() => setEtapeGuidageExpertises((prev) => sel ? prev.filter((e) => e !== exp) : [...prev, exp])}
                                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30 hover:text-slate-700"}`}>
                                        {exp}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Responsable (dès qu'un domaine est choisi) */}
                          {etapeGuidageDomaine && (
                            <>
                              <div>
                                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Responsable</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {([
                                    ["self",  "Moi-même",        "person"],
                                    ["guide", "Inviter un guide", "person_add"],
                                  ] as const).map(([val, lbl, ico]) => (
                                    <button key={val} type="button"
                                      onClick={() => { setEtapeGuidageAuthorType(val); setEtapeCollabSelected(null); setEtapeFormError(""); }}
                                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${etapeGuidageAuthorType === val ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                                      <span className="material-symbols-outlined text-base">{ico}</span>{lbl}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Moi-même : champs de l'activité */}
                              {etapeGuidageAuthorType === "self" && (
                                <>
                                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Informations de l'activité</p>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Titre <span className="text-red-400">*</span></label>
                                    <input type="text" placeholder="Ex : Randonnée au Djebel Zaghouan"
                                      value={etapeTitre} onChange={(e) => { setEtapeTitre(e.target.value); setEtapeFormError(""); }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description courte</label>
                                    <textarea rows={2} placeholder="Résumé de l'activité en 1-2 phrases…"
                                      value={etapeDescCourte} onChange={(e) => setEtapeDescCourte(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-300" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description détaillée</label>
                                    <textarea rows={3} placeholder="Description complète de l'activité, points d'intérêt, niveau requis…"
                                      value={etapeDescLongue} onChange={(e) => setEtapeDescLongue(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-300" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Prix de base (TND)</label>
                                    <input type="number" min="0" placeholder="0" value={etapePrix} onChange={(e) => setEtapePrix(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                                      Localisation
                                      {etapeLat && <span className="ml-2 text-primary font-black">✓ Positionnée</span>}
                                    </label>
                                    <MapPicker lat={etapeLat} lng={etapeLng} onPick={(lat, lng, address) => { setEtapeLat(lat); setEtapeLng(lng); setEtapeAddress(address); }} />
                                    {etapeAddress && <p className="text-[10px] text-slate-400 mt-1 truncate">{etapeAddress}</p>}
                                  </div>

                                  {/* Champs dynamiques par domaine (CHAMPS_DOMAINE) */}
                                  <DynamicFields
                                    domaine={etapeGuidageDomaine}
                                    expertisesSelectionnees={etapeGuidageExpertises}
                                    value={etapeGuidageFields}
                                    onChange={(v) => setEtapeGuidageFields((prev) => ({ ...prev, ...v }))}
                                  />
                                </>
                              )}

                              {/* Inviter un guide */}
                              {etapeGuidageAuthorType === "guide" && (
                                <>
                                  {etapeCollabSelected ? (
                                    <div className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-extrabold text-primary">{etapeCollabSelected.name.slice(0, 1).toUpperCase()}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-extrabold text-slate-800 truncate">{etapeCollabSelected.name}</p>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Guide</span>
                                      </div>
                                      <button type="button" onClick={() => setEtapeCollabSelected(null)}
                                        className="w-7 h-7 rounded-full bg-white hover:bg-red-50 border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setEtapeCollabOpen(true)}
                                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group cursor-pointer">
                                      <span className="material-symbols-outlined text-base group-hover:text-primary">person_add</span>
                                      <span className="text-xs font-extrabold">+ Inviter un guide pour cette étape</span>
                                    </button>
                                  )}

                                  <EtapeCollabPickerModal
                                    open={etapeCollabOpen} filterMode="guide" token={token}
                                    etapeAvail={etapeConflictAvail}
                                    onClose={() => setEtapeCollabOpen(false)}
                                    onSelect={(r) => { setEtapeCollabSelected(r); setEtapeCollabOpen(false); }}
                                  />
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* ── Mode SERVICE : catégorie + sous-types + responsable ── */}
                      {etapeMode === "service" && (
                        <>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Catégorie *</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {PROVIDER_SCHEMA.filter((cat) => !(hebergInclus && hebergType === "same" && cat.value === "hebergement")).map((cat) => {
                                const active = etapeCategorie === cat.value;
                                return (
                                  <button key={cat.value} type="button"
                                    onClick={() => { setEtapeCategorie(active ? "" : cat.value); setEtapeSubtypes([]); setEtapeFormError(""); setEtapeCollabSelected(null); }}
                                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border-2 text-center transition-all cursor-pointer ${active ? "bg-primary/10 border-primary text-slate-900 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:border-primary/40"}`}>
                                    <span className={`material-symbols-outlined text-base ${active ? "text-primary" : "text-slate-400"}`}>{cat.icon}</span>
                                    <span className="text-[9px] font-extrabold leading-tight">{cat.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {etapeCategorie && (() => {
                            const cat = PROVIDER_SCHEMA.find((c) => c.value === etapeCategorie);
                            if (!cat?.subtypes.length) return null;
                            return (
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Sous-types</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {cat.subtypes.map((st) => {
                                    const sel = etapeSubtypes.includes(st.value);
                                    return (
                                      <button key={st.value} type="button"
                                        onClick={() => setEtapeSubtypes((prev) => sel ? prev.filter((v) => v !== st.value) : [...prev, st.value])}
                                        className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-extrabold transition-all cursor-pointer ${sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-600 hover:border-primary/40"}`}>
                                        {st.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {etapeCategorie && (
                            <>
                              {/* Toggle responsable */}
                              <div>
                                <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2 block">Responsable</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {([
                                    ["self",     "Moi-même",              "person"],
                                    ["provider", "Prestataire partenaire", "store"],
                                  ] as const).map(([val, lbl, ico]) => (
                                    <button key={val} type="button"
                                      onClick={() => { setEtapeServiceAuthorType(val); setEtapeCollabSelected(null); setEtapeFormError(""); }}
                                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${etapeServiceAuthorType === val ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                                      <span className="material-symbols-outlined text-base">{ico}</span>{lbl}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Mode Moi-même : champs de l'activité */}
                              {etapeServiceAuthorType === "self" && (
                                <>
                                  <p className="text-[10px] font-black tracking-widests text-slate-400 uppercase">Informations de l'activité</p>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Titre <span className="text-red-400">*</span></label>
                                    <input type="text" placeholder="Ex : Randonnée au Djebel Zaghouan"
                                      value={etapeTitre} onChange={(e) => { setEtapeTitre(e.target.value); setEtapeFormError(""); }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description courte</label>
                                    <textarea rows={2} placeholder="Résumé de l'étape en 1-2 phrases…"
                                      value={etapeDescCourte} onChange={(e) => setEtapeDescCourte(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-300" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description détaillée</label>
                                    <textarea rows={3} placeholder="Description complète de l'étape…"
                                      value={etapeDescLongue} onChange={(e) => setEtapeDescLongue(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-slate-300" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Prix de base (TND)</label>
                                    <input type="number" min="0" placeholder="0" value={etapePrix} onChange={(e) => setEtapePrix(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary" />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">
                                      Localisation
                                      {etapeLat && <span className="ml-2 text-primary font-black">✓ Positionnée</span>}
                                    </label>
                                    <MapPicker lat={etapeLat} lng={etapeLng} onPick={(lat, lng, address) => { setEtapeLat(lat); setEtapeLng(lng); setEtapeAddress(address); }} />
                                    {etapeAddress && <p className="text-[10px] text-slate-400 mt-1 truncate">{etapeAddress}</p>}
                                  </div>
                                </>
                              )}

                              {/* Mode Prestataire partenaire : warning + placeholder + collab picker */}
                              {etapeServiceAuthorType === "provider" && (
                                <>
                                  <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                                    <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">warning</span>
                                    <p className="text-xs font-semibold text-amber-800">Cette catégorie nécessite un prestataire partenaire — invitez-le ci-dessous pour qu'il configure les détails.</p>
                                  </div>
                                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                                    <span className="material-symbols-outlined text-[16px] text-slate-300">location_on</span>
                                    <span className="text-[11px] font-semibold text-slate-400">La localisation sera renseignée par votre prestataire</span>
                                  </div>

                                  {etapeCollabSelected ? (
                                    <div className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-extrabold text-primary">{etapeCollabSelected.name.slice(0, 1).toUpperCase()}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-extrabold text-slate-800 truncate">{etapeCollabSelected.name}</p>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Prestataire</span>
                                      </div>
                                      <button type="button" onClick={() => setEtapeCollabSelected(null)}
                                        className="w-7 h-7 rounded-full bg-white hover:bg-red-50 border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setEtapeCollabOpen(true)}
                                      className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all group cursor-pointer">
                                      <span className="material-symbols-outlined text-base group-hover:text-primary">person_add</span>
                                      <span className="text-xs font-extrabold">+ Inviter un prestataire pour cette étape</span>
                                    </button>
                                  )}

                                  <EtapeCollabPickerModal
                                    open={etapeCollabOpen} filterMode={etapeCategorie} token={token}
                                    etapeAvail={etapeConflictAvail}
                                    onClose={() => setEtapeCollabOpen(false)}
                                    onSelect={(r) => { setEtapeCollabSelected(r); setEtapeCollabOpen(false); }}
                                  />
                                </>
                              )}
                            </>
                          )}
                        </>
                      )}

                      {etapeFormError && <p className="text-xs font-semibold text-red-500">{etapeFormError}</p>}

                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={resetEtapeForm}
                          className="flex-1 py-2 text-xs font-bold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer">Annuler</button>
                        <button type="button" onClick={addEtape}
                          className="flex-1 py-2 text-xs font-extrabold text-white bg-primary hover:bg-primary/90 rounded-xl cursor-pointer">
                          <Check size={12} className="inline mr-1" />{editingEtapeId ? "Mettre à jour" : "Ajouter"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tracé du circuit (réactif : s'affiche dès qu'une étape a une localisation) */}
          {(() => {
            const pts = etapes
              .filter((e) => (e.lat != null && e.lng != null) || (e.collab_lat != null && e.collab_lng != null))
              .sort((a, b) => a.jour - b.jour)
              .map((e) => ({ jour: e.jour, lat: (e.collab_lat ?? e.lat) as number, lng: (e.collab_lng ?? e.lng) as number, destination: e.collab_destination ?? e.address?.split(",")[0].trim() ?? e.destination ?? e.titre ?? "" }));
            // Point hébergement depuis le circuit enrichi (collab_contribution du prestataire hébergement)
            const circuitSrc = enrichedForMap ?? editingCircuit;
            const hbEtapeSrc = circuitSrc?.hebergement?.inclus && circuitSrc?.hebergement?.type === "same"
              ? (circuitSrc.hebergement.etape as any)
              : null;
            const hbContribSrc = hbEtapeSrc?.collab_contribution as Record<string, any> | undefined;
            const hbMapLat = hbContribSrc?.collab_lat != null ? Number(hbContribSrc.collab_lat) : (hbEtapeSrc?.collab_lat ?? hbEtapeSrc?.lat ?? undefined);
            const hbMapLng = hbContribSrc?.collab_lng != null ? Number(hbContribSrc.collab_lng) : (hbEtapeSrc?.collab_lng ?? hbEtapeSrc?.lng ?? undefined);
            const hbPt = hbMapLat && hbMapLng
              ? { lat: hbMapLat, lng: hbMapLng, nom: (hbContribSrc?.titre ?? hbEtapeSrc?.titre) || hbContribSrc?.collab_destination || hbEtapeSrc?.destination || "Hébergement" }
              : undefined;
            if (pts.length === 0 && !hbPt) return null;
            return (
              <div>
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Tracé du circuit</p>
                <CircuitRouteMap points={pts} hebergementPoint={hbPt} />
              </div>
            );
          })()}

          {/* Tags thématiques */}
          <div className="space-y-3 border border-slate-100 rounded-2xl p-5 bg-white">
            <div>
              <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-0.5">Tags thématiques</p>
              <p className="text-xs text-slate-500">Facultatif — aide à classer et retrouver ce circuit.</p>
            </div>
            <TaxonomyTagPicker
              value={circTags}
              onChange={setCircTags}
              onSuggest={async () => {
                const res = await fetch('/api/offers/suggest-tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ titre: circTitle, description: circDesc }),
                });
                if (!res.ok) throw new Error('fetch failed');
                const data = await res.json() as { tags?: unknown };
                if (!Array.isArray(data.tags)) throw new Error('invalid response');
                return data.tags as string[];
              }}
            />
          </div>

          {/* Erreur globale */}
          {formError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
              <span className="material-symbols-outlined text-red-500 text-base">error</span>
              <p className="text-sm font-semibold text-red-600">{formError}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
          {isApproved ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="material-symbols-outlined text-emerald-500 text-base">lock</span>
                <p className="text-xs font-bold text-emerald-700">Circuit publié — modification impossible. Supprimez-le si nécessaire.</p>
              </div>
              <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">Fermer</button>
            </div>
          ) : (
            <>
              <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-200 text-slate-600 bg-white rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer">Annuler</button>
              <button type="button" onClick={() => saveCircuit()} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl text-xs shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer">
                {saving
                  ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Sauvegarde…</>
                  : <><Check size={14} />{editingCircuit ? "Enregistrer" : "Créer le circuit"}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
