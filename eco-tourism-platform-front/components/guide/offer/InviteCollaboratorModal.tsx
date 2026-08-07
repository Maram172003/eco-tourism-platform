"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, UserPlus, CheckCircle, Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { conflictsDetailed, type OfferAvailSlot, type ConflictDetail } from "@/hooks/useOfferAvailability";
import type { AvailabilitySlot } from "@/lib/availabilityConflicts";
import { DOMAINES } from "@/lib/guideOfferConfig";
import { PROVIDER_SCHEMA } from "@/lib/provider-schema";

export type CollabSection = "transport" | "restauration" | "hebergement" | "autre_service";

export interface SectionContext {
  domaine?: string;
  expertises?: string[];
  categorie?: string;
  sous_types?: string[];
}

const SECTION_LABELS: Record<CollabSection, { label: string; icon: string; color: string }> = {
  transport:      { label: "Transport",      icon: "directions_car",    color: "bg-sky-100 text-sky-700 border-sky-200" },
  restauration:   { label: "Restauration",   icon: "restaurant",        color: "bg-orange-100 text-orange-700 border-orange-200" },
  hebergement:    { label: "Hébergement",    icon: "hotel",             color: "bg-violet-100 text-violet-700 border-violet-200" },
  autre_service:  { label: "Autre service",  icon: "add_circle",        color: "bg-teal-100 text-teal-700 border-teal-200" },
};

// Sous-types disponibles par section (pour le mode prestataire)
function getProviderSubtypes(section: CollabSection, filterMode?: string): Array<{ value: string; label: string }> {
  if (section === "transport") {
    const eco = PROVIDER_SCHEMA.find((c) => c.value === "transport_eco")?.subtypes ?? [];
    const std = PROVIDER_SCHEMA.find((c) => c.value === "transport")?.subtypes ?? [];
    return [...eco, ...std];
  }
  if (section === "hebergement") {
    return PROVIDER_SCHEMA.find((c) => c.value === "hebergement")?.subtypes ?? [];
  }
  if (section === "restauration") {
    return PROVIDER_SCHEMA.find((c) => c.value === "restaurant_terroir")?.subtypes ?? [];
  }
  if (section === "autre_service" && filterMode && filterMode !== "guide") {
    return PROVIDER_SCHEMA.find((c) => c.value === filterMode)?.subtypes ?? [];
  }
  return [];
}

// Catégorie par défaut pour le section_context
function getSectionCategorie(section: CollabSection, filterMode?: string): string {
  if (section === "transport") return "transport";
  if (section === "hebergement") return "hebergement";
  if (section === "restauration") return "restaurant_terroir";
  return filterMode ?? section;
}

interface Collaborator {
  user_id: string;
  name: string;
  photo?: string;
  type: "guide" | "provider";
  subtitle?: string;
}

interface Props {
  section: CollabSection;
  token: string;
  offerId: string;
  offerAvail?: OfferAvailSlot;
  alreadyInvited: string[];
  filterMode?: string;
  /** Valeurs pré-sélectionnées depuis le formulaire de l'offre */
  formContext?: {
    transportTypes?: string[];
    hebergementTypes?: string[];
    /** Domaine guide déjà choisi dans le formulaire (toute section en mode guidage) */
    prefillGuideDomaine?: string;
    /** Expertise guide déjà choisie dans le formulaire */
    prefillGuideExpertise?: string;
    /** Sous-type prestataire déjà choisi dans le formulaire (restauration, autre_service) */
    prefillPrestSousType?: string;
  };
  onClose: () => void;
  onInvited: (collaborator: Collaborator, sectionContext: SectionContext | null) => void;
}

export default function InviteCollaboratorModal({
  section, token, offerId, offerAvail, alreadyInvited, filterMode, formContext, onClose, onInvited,
}: Props) {
  const isGuideMode = filterMode === "guide";

  // Guide mode — pré-rempli si le formulaire a déjà un domaine+expertise pour cette section
  const initialDomaine    = formContext?.prefillGuideDomaine ?? "";
  const initialExpertises = formContext?.prefillGuideExpertise ? [formContext.prefillGuideExpertise] : [];

  // ── Phase 1 : contexte (guide uniquement, sauf si domaine déjà connu via formContext)
  const [phase, setPhase] = useState<"context" | "search">(
    isGuideMode && !initialDomaine ? "context" : "search"
  );

  // Guide mode
  const [selDomaine,    setSelDomaine]    = useState(initialDomaine);
  const [selExpertises, setSelExpertises] = useState<string[]>(initialExpertises);

  // Provider mode — pré-rempli depuis formContext
  const providerSubtypes = getProviderSubtypes(section, filterMode);
  const initialSousTypes = (() => {
    if (section === "transport")   return formContext?.transportTypes ?? [];
    if (section === "hebergement") return formContext?.hebergementTypes ?? [];
    if (formContext?.prefillPrestSousType) return [formContext.prefillPrestSousType];
    return [];
  })();
  const [selSousTypes, setSelSousTypes] = useState<string[]>(initialSousTypes);

  // ── Phase 2 : recherche ─────────────────────────────────────────────────────
  const [query,           setQuery]           = useState("");
  const [results,         setResults]         = useState<Collaborator[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [selected,        setSelected]        = useState<Collaborator | null>(null);
  const [message,         setMessage]         = useState("");
  const [sending,         setSending]         = useState(false);
  const [done,            setDone]            = useState(false);
  const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
  const [checkingAvail,   setCheckingAvail]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const meta = SECTION_LABELS[section];

  // Focus sur le champ de recherche dès l'entrée en phase 2
  useEffect(() => {
    if (phase === "search") setTimeout(() => inputRef.current?.focus(), 100);
  }, [phase]);

  // Recherche avec debounce
  useEffect(() => {
    if (phase !== "search") return;
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, section });
        if (filterMode) params.set("mode", filterMode);
        const data = await apiFetch<Collaborator[]>(
          `/guide/collaborators/search?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setResults(Array.isArray(data) ? data.filter((r) => !alreadyInvited.includes(r.user_id)) : []);
      } catch { setResults([]); }
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, section, filterMode, alreadyInvited, token, phase]);

  // Vérification de disponibilité quand un guide est sélectionné
  useEffect(() => {
    setConflictDetails([]);
    if (!selected || selected.type !== "guide" || !offerAvail?.type) return;
    setCheckingAvail(true);
    apiFetch<AvailabilitySlot[]>(`/guide/public/${selected.user_id}/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((agenda) => {
        const slots = Array.isArray(agenda) ? agenda : [];
        setConflictDetails(conflictsDetailed(offerAvail, slots));
      })
      .catch(() => setConflictDetails([]))
      .finally(() => setCheckingAvail(false));
  }, [selected, offerAvail, token]);

  // ── Envoi de l'invitation ───────────────────────────────────────────────────
  const buildSectionContext = (): SectionContext | null => {
    if (isGuideMode) {
      if (!selDomaine) return null;
      return { domaine: selDomaine, expertises: selExpertises };
    }
    return {
      categorie: getSectionCategorie(section, filterMode),
      sous_types: selSousTypes,
    };
  };

  const send = async () => {
    if (!selected) return;
    setSending(true);
    const sectionContext = buildSectionContext();
    try {
      await apiFetch(`/guide/offers/${offerId}/collaborations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          invited_user_id:   selected.user_id,
          invited_user_type: selected.type,
          invited_user_name: selected.name,
          section,
          message: message.trim() || undefined,
          section_context: sectionContext,
        }),
      });
      setDone(true);
      setTimeout(() => { onInvited(selected, sectionContext); onClose(); }, 1400);
    } catch { /* silent */ }
    setSending(false);
  };

  // ── Pill de contexte choisi (affiché en phase 2) ────────────────────────────
  const contextPill = (() => {
    if (isGuideMode && selDomaine) {
      const dom = DOMAINES[selDomaine];
      const parts = [dom?.label ?? selDomaine];
      if (selExpertises.length) parts.push(selExpertises.slice(0, 2).join(", ") + (selExpertises.length > 2 ? "…" : ""));
      return parts.join(" · ");
    }
    if (!isGuideMode && selSousTypes.length) {
      return selSousTypes.slice(0, 3).map((v) => providerSubtypes.find((s) => s.value === v)?.label ?? v).join(", ")
        + (selSousTypes.length > 3 ? "…" : "");
    }
    return null;
  })();

  // ── Rendu ───────────────────────────────────────────────────────────────────
  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold ${meta.color}`}>
            <span className="material-symbols-outlined text-sm">{meta.icon}</span>
            {meta.label}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-slate-700">Inviter un collaborateur</p>
            {phase === "context" && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {isGuideMode ? "Choisissez le domaine attendu" : "Confirmez les sous-types (optionnel)"}
              </p>
            )}
            {phase === "search" && contextPill && (
              <p className="text-[10px] text-primary font-semibold mt-0.5 truncate">{contextPill}</p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── PHASE 1 : CONTEXTE ─────────────────────────────────────── */}
          {phase === "context" && isGuideMode && (
            <>
              {/* Sélection du domaine */}
              <div>
                <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">
                  Domaine de guidage <span className="text-red-400">*</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DOMAINES).map(([key, cfg]) => {
                    const active = selDomaine === key;
                    return (
                      <button key={key} type="button"
                        onClick={() => { setSelDomaine(active ? "" : key); setSelExpertises([]); }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          active ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/40"
                        }`}>
                        <span className={`material-symbols-outlined text-base shrink-0 ${active ? "text-primary" : "text-slate-400"}`}>{cfg.icon}</span>
                        <span className="text-[11px] font-bold leading-tight">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expertises du domaine sélectionné */}
              {selDomaine && DOMAINES[selDomaine]?.expertises?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">
                    Expertises <span className="text-slate-300 normal-case font-medium">(optionnel)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {DOMAINES[selDomaine].expertises.map((exp) => {
                      const sel = selExpertises.includes(exp);
                      return (
                        <button key={exp} type="button"
                          onClick={() => setSelExpertises((prev) => sel ? prev.filter((e) => e !== exp) : [...prev, exp])}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                            sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30"
                          }`}>
                          {exp}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button type="button"
                disabled={!selDomaine}
                onClick={() => setPhase("search")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm transition-all disabled:opacity-40 bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed">
                Continuer
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {phase === "context" && !isGuideMode && (
            <>
              {providerSubtypes.length > 0 && (
                <div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">
                    Sous-types <span className="text-slate-300 normal-case font-medium">(optionnel — pré-sélectionné depuis l'offre)</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {providerSubtypes.map((st) => {
                      const sel = selSousTypes.includes(st.value);
                      return (
                        <button key={st.value} type="button"
                          onClick={() => setSelSousTypes((prev) => sel ? prev.filter((v) => v !== st.value) : [...prev, st.value])}
                          className={`px-3 py-1.5 rounded-xl border-2 text-[11px] font-extrabold transition-all cursor-pointer ${
                            sel ? "bg-primary/10 border-primary text-primary" : "bg-white border-slate-200 text-slate-600 hover:border-primary/40"
                          }`}>
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button type="button"
                onClick={() => setPhase("search")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm bg-primary text-white hover:bg-primary/90 transition-all">
                Continuer
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* ── PHASE 2 : RECHERCHE ────────────────────────────────────── */}
          {phase === "search" && (
            <>
              {/* Champ de recherche */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                  placeholder="Rechercher un guide ou prestataire…"
                  className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-primary transition-colors"
                />
                {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              </div>

              {/* Résultats */}
              {results.length > 0 && !selected && (
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 max-h-52 overflow-y-auto">
                  {results.map((r) => (
                    <button key={r.user_id} type="button" onClick={() => setSelected(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
                      {r.photo ? (
                        <img src={r.photo} alt={r.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-extrabold text-primary">{r.name.slice(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{r.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{r.subtitle ?? r.type}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.type === "guide" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {r.type === "guide" ? "Guide" : "Prestataire"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {query.length >= 2 && !loading && results.length === 0 && !selected && (
                <p className="text-center text-sm text-slate-400 py-4">Aucun résultat pour « {query} »</p>
              )}

              {/* Sélectionné */}
              {selected && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                  {selected.photo ? (
                    <img src={selected.photo} alt={selected.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-extrabold text-primary">{selected.name.slice(0, 1).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-slate-800">{selected.name}</p>
                    <p className="text-[11px] text-slate-500">{selected.subtitle}</p>
                  </div>
                  <button type="button" onClick={() => { setSelected(null); setConflictDetails([]); }}
                    className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center hover:bg-red-100 transition-colors group">
                    <X size={11} className="text-slate-400 group-hover:text-red-500" />
                  </button>
                </div>
              )}

              {selected && checkingAvail && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <Loader2 size={13} className="text-slate-400 animate-spin shrink-0" />
                  <p className="text-xs text-slate-500 font-medium">Vérification de l&apos;agenda…</p>
                </div>
              )}

              {selected && !checkingAvail && conflictDetails.length > 0 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-xs font-extrabold text-amber-800">{selected.name} n&apos;est pas disponible</p>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Conflit détecté sur{" "}
                    <strong>{conflictDetails.length} jour{conflictDetails.length > 1 ? "s" : ""}</strong>{" "}
                    — vérification faite sur le jour <em>et</em> les horaires.
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {conflictDetails.slice(0, 5).map((c) => (
                      <div key={c.date} className="flex items-start gap-2 text-[10px]">
                        <span className="bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 font-bold shrink-0">
                          {new Date(c.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                        <div className="text-amber-600 leading-relaxed">
                          {c.agendaHours ? (
                            <>Agenda : <strong>{c.agendaHours}</strong>{c.offerHours && <> · Offre : <strong>{c.offerHours}</strong></>}</>
                          ) : (
                            <span>Journée entière bloquée</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {conflictDetails.length > 5 && (
                      <p className="text-[10px] text-amber-500 font-medium">+{conflictDetails.length - 5} autre{conflictDetails.length - 5 > 1 ? "s" : ""} jour{conflictDetails.length - 5 > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-amber-600 pt-1 border-t border-amber-200">
                    Vous pouvez tout de même envoyer l&apos;invitation — il pourra accepter ou refuser.
                  </p>
                </div>
              )}

              {selected && !checkingAvail && conflictDetails.length === 0 && selected.type === "guide" && offerAvail?.type && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                  <p className="text-xs text-green-700 font-semibold">Disponible sur les dates de cette offre</p>
                </div>
              )}

              {selected && (
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message pour le collaborateur (optionnel)…"
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm resize-none focus:outline-none focus:border-slate-300 transition-colors placeholder:text-slate-300"
                />
              )}

              {selected && !done && (
                <button type="button" onClick={send} disabled={sending}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm transition-all disabled:opacity-60 ${
                    conflictDetails.length > 0
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}>
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {sending ? "Envoi en cours…" : conflictDetails.length > 0 ? "Inviter quand même" : "Envoyer l'invitation"}
                </button>
              )}

              {done && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl">
                  <CheckCircle size={20} className="text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-extrabold text-green-800">Invitation envoyée !</p>
                    <p className="text-xs text-green-600">L&apos;offre a été sauvegardée comme brouillon.</p>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
