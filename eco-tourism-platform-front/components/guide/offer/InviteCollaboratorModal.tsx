"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, UserPlus, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { conflictsDetailed, type OfferAvailSlot, type ConflictDetail } from "@/hooks/useOfferAvailability";
import type { AvailabilitySlot } from "@/lib/availabilityConflicts";

export type CollabSection = "transport" | "restauration" | "hebergement" | "autre_service";

const SECTION_LABELS: Record<CollabSection, { label: string; icon: string; color: string }> = {
  transport:      { label: "Transport",      icon: "directions_car",    color: "bg-sky-100 text-sky-700 border-sky-200" },
  restauration:   { label: "Restauration",   icon: "restaurant",        color: "bg-orange-100 text-orange-700 border-orange-200" },
  hebergement:    { label: "Hébergement",    icon: "hotel",             color: "bg-violet-100 text-violet-700 border-violet-200" },
  autre_service:  { label: "Autre service",  icon: "add_circle",        color: "bg-teal-100 text-teal-700 border-teal-200" },
};

function getFilterHint(section: CollabSection, filterMode?: string): string | null {
  if (filterMode === "guide") return "Guides uniquement";
  if (section === "transport") return "Prestataires de transport uniquement";
  if (section === "hebergement") return "Prestataires d'hébergement uniquement";
  if (section === "restauration" && filterMode) return "Prestataires de restauration uniquement";
  if (section === "autre_service" && filterMode) return "Prestataires de cette catégorie uniquement";
  return null;
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
  onClose: () => void;
  onInvited: (collaborator: Collaborator) => void;
}

export default function InviteCollaboratorModal({
  section, token, offerId, offerAvail, alreadyInvited, filterMode, onClose, onInvited,
}: Props) {
  const [query,          setQuery]          = useState("");
  const [results,        setResults]        = useState<Collaborator[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [selected,       setSelected]       = useState<Collaborator | null>(null);
  const [message,        setMessage]        = useState("");
  const [sending,        setSending]        = useState(false);
  const [done,           setDone]           = useState(false);
  const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
  const [checkingAvail,  setCheckingAvail]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = SECTION_LABELS[section];
  const filterHint = getFilterHint(section, filterMode);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Recherche avec debounce 350 ms
  useEffect(() => {
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
  }, [query, section, filterMode, alreadyInvited, token]);

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

  const send = async () => {
    if (!selected) return;
    setSending(true);
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
        }),
      });
      setDone(true);
      setTimeout(() => { onInvited(selected); onClose(); }, 1400);
    } catch { /* silent */ }
    setSending(false);
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold ${meta.color}`}>
            <span className="material-symbols-outlined text-sm">{meta.icon}</span>
            {meta.label}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-slate-700">Inviter un collaborateur</p>
            {filterHint && (
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{filterHint}</p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">

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

          {/* Vérification disponibilité en cours */}
          {selected && checkingAvail && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <Loader2 size={13} className="text-slate-400 animate-spin shrink-0" />
              <p className="text-xs text-slate-500 font-medium">Vérification de l&apos;agenda…</p>
            </div>
          )}

          {/* Avertissement indisponibilité */}
          {selected && !checkingAvail && conflictDetails.length > 0 && (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <p className="text-xs font-extrabold text-amber-800">
                  {selected.name} n&apos;est pas disponible
                </p>
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
                        <>
                          Agenda : <strong>{c.agendaHours}</strong>
                          {c.offerHours && <> · Offre : <strong>{c.offerHours}</strong></>}
                        </>
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

          {/* Guide disponible */}
          {selected && !checkingAvail && conflictDetails.length === 0 && selected.type === "guide" && offerAvail?.type && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle size={14} className="text-green-500 shrink-0" />
              <p className="text-xs text-green-700 font-semibold">Disponible sur les dates de cette offre</p>
            </div>
          )}

          {/* Message optionnel */}
          {selected && (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message pour le collaborateur (optionnel)…"
              rows={2}
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm resize-none focus:outline-none focus:border-slate-300 transition-colors placeholder:text-slate-300"
            />
          )}

          {/* Bouton d'envoi */}
          {selected && !done && (
            <button type="button" onClick={send} disabled={sending}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold text-sm transition-all disabled:opacity-60 ${
                conflictDetails.length > 0
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-primary text-white hover:bg-primary/90"
              }`}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {sending
                ? "Envoi en cours…"
                : conflictDetails.length > 0
                  ? "Inviter quand même"
                  : "Envoyer l'invitation"}
            </button>
          )}

          {/* Succès */}
          {done && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl">
              <CheckCircle size={20} className="text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-extrabold text-green-800">Invitation envoyée !</p>
                <p className="text-xs text-green-600">L&apos;offre a été sauvegardée comme brouillon.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
