"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { conflictsDetailed, type OfferAvailSlot, type ConflictDetail } from "@/hooks/useOfferAvailability";
import type { AvailabilitySlot } from "@/lib/availabilityConflicts";

interface Collab {
  user_id: string;
  name: string;
  photo?: string;
  type: "guide" | "provider";
  subtitle?: string;
}

interface Props {
  open: boolean;
  filterMode: string;
  token: string;
  /** Slot de disponibilité de l'étape (type specific + date + horaires) pour vérifier les conflits guide */
  etapeAvail?: OfferAvailSlot;
  onClose: () => void;
  onSelect: (collab: { user_id: string; name: string; type: string }) => void;
}

function filterHint(filterMode: string): string {
  if (filterMode === "guide") return "Guides uniquement";
  return "Prestataires de cette catégorie uniquement";
}

export default function EtapeCollabPickerModal({ open, filterMode, token, etapeAvail, onClose, onSelect }: Props) {
  const [query,          setQuery]          = useState("");
  const [results,        setResults]        = useState<Collab[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [pending,        setPending]        = useState<Collab | null>(null);
  const [conflictDetails, setConflictDetails] = useState<ConflictDetail[]>([]);
  const [checkingAvail,  setCheckingAvail]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(""); setResults([]); setPending(null); setConflictDetails([]);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Recherche debounce 350ms
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch<Collab[]>(
          `/guide/collaborators/search?q=${encodeURIComponent(query)}&section=autre_service&mode=${encodeURIComponent(filterMode)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setResults(Array.isArray(res) ? res : []);
      } catch { setResults([]); }
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, filterMode, token]);

  // Vérification de disponibilité quand un guide est sélectionné (pending)
  useEffect(() => {
    setConflictDetails([]);
    if (!pending || pending.type !== "guide" || !etapeAvail?.type) return;
    setCheckingAvail(true);
    apiFetch<AvailabilitySlot[]>(`/guide/public/${pending.user_id}/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((agenda) => {
        const slots = Array.isArray(agenda) ? agenda : [];
        setConflictDetails(conflictsDetailed(etapeAvail, slots));
      })
      .catch(() => setConflictDetails([]))
      .finally(() => setCheckingAvail(false));
  }, [pending, etapeAvail, token]);

  function selectCollab(r: Collab) {
    // Toujours passer par le mode "pending" — le bouton de confirmation s'affiche pour tous.
    // Le check de dispo n'est déclenché que si r.type === "guide" (voir useEffect ci-dessus).
    setPending(r);
    setResults([]);
  }

  function confirm() {
    if (!pending) return;
    onSelect(pending);
    onClose();
  }

  if (!open || typeof document === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold bg-teal-100 text-teal-700 border-teal-200">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            Étape circuit
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-slate-700">Inviter un collaborateur</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{filterHint(filterMode)}</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Champ de recherche (masqué en mode pending) */}
          {!pending && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un guide ou prestataire…"
                className="w-full pl-9 pr-4 py-3 border-2 border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-primary transition-colors"
              />
              {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>
          )}

          {/* Résultats */}
          {!pending && results.length > 0 && (
            <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 max-h-52 overflow-y-auto">
              {results.map((r) => (
                <button key={r.user_id} type="button"
                  onClick={() => selectCollab(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                  {r.photo ? (
                    <img src={r.photo} alt={r.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-extrabold text-primary">{r.name.slice(0, 1).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{r.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{r.subtitle ?? (r.type === "guide" ? "Guide" : "Prestataire")}</p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${r.type === "guide" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                    {r.type === "guide" ? "Guide" : "Prestataire"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!pending && query.length >= 2 && !loading && results.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-4">Aucun résultat pour « {query} »</p>
          )}

          {/* Badge collaborateur sélectionné (mode pending) */}
          {pending && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 border-2 border-primary/20 rounded-2xl">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-extrabold text-primary">{pending.name.slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-slate-800 truncate">{pending.name}</p>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${pending.type === "guide" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                  {pending.type === "guide" ? "Guide" : "Prestataire"}
                </span>
              </div>
              <button type="button" onClick={() => { setPending(null); setConflictDetails([]); setQuery(""); }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer">
                <X size={12} className="text-slate-400 hover:text-red-500" />
              </button>
            </div>
          )}

          {/* Vérification en cours */}
          {pending && checkingAvail && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <Loader2 size={13} className="text-slate-400 animate-spin shrink-0" />
              <p className="text-xs text-slate-500 font-medium">Vérification de l'agenda du guide…</p>
            </div>
          )}

          {/* Avertissement conflit */}
          {pending && !checkingAvail && conflictDetails.length > 0 && (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                <p className="text-xs font-extrabold text-amber-800">
                  {pending.name} a déjà un créneau à cette date
                </p>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Conflit détecté sur{" "}
                <strong>{conflictDetails.length} jour{conflictDetails.length > 1 ? "s" : ""}</strong>{" "}
                — vérification faite sur le jour et les horaires.
              </p>
              <div className="space-y-1.5 pt-1">
                {conflictDetails.slice(0, 3).map((c) => (
                  <div key={c.date} className="flex items-start gap-2 text-[10px]">
                    <span className="bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 font-bold shrink-0">
                      {new Date(c.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    <div className="text-amber-600 leading-relaxed">
                      {c.agendaHours
                        ? <>Agenda : <strong>{c.agendaHours}</strong>{c.offerHours && <> · Étape : <strong>{c.offerHours}</strong></>}</>
                        : <span>Journée entière bloquée</span>}
                    </div>
                  </div>
                ))}
                {conflictDetails.length > 3 && (
                  <p className="text-[10px] text-amber-500 font-medium">+{conflictDetails.length - 3} autre(s) conflit(s)</p>
                )}
              </div>
              <p className="text-[10px] text-amber-600 pt-1 border-t border-amber-200">
                Vous pouvez tout de même l'inviter — il pourra accepter ou refuser.
              </p>
            </div>
          )}

          {/* Guide disponible */}
          {pending && !checkingAvail && conflictDetails.length === 0 && pending.type === "guide" && etapeAvail?.type && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle size={14} className="text-green-500 shrink-0" />
              <p className="text-xs text-green-700 font-semibold">Disponible sur la date de cette étape</p>
            </div>
          )}

          {/* Bouton confirmer */}
          {pending && !checkingAvail && (
            <button type="button" onClick={confirm}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-extrabold text-sm transition-all cursor-pointer ${
                conflictDetails.length > 0
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}>
              <span className="material-symbols-outlined text-base">person_add</span>
              {conflictDetails.length > 0 ? "Sélectionner quand même" : "Sélectionner ce collaborateur"}
            </button>
          )}

        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
