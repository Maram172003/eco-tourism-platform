"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getConsistentSession } from "@/lib/auth";
import { formatSubtypeLabel, formatOfferCapacityLabel, getBookingUnitPrice, hasSelectableFormulas, isPackageOffer, defaultPackageSubtypes, parseSubtypesParam } from "@/lib/offer-variant";
import {
  type CircuitBooking,
  defaultPackageOptions,
  formatCircuitCapacityLabel,
  getCircuitBookingUnitPrice,
  hasSelectableCircuitFormulas,
  isPackageCircuit,
  parseCircuitSubtypesParam,
  resolveCircuitDateMode,
} from "@/lib/circuit-booking";
import {
  Calendar, Users, User, UserPlus, X, ChevronLeft, ChevronRight,
  Leaf, Clock, MapPin, AlertCircle, CheckCircle, Search, Check,
  CreditCard, Zap, Package,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Offer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_type: string | null;
  duration: string | null;
  region: string | null;
  images: string[] | null;
  offer_type: string | null;
  offer_mode?: string | null;
  offer_subtypes?: string[] | null;
  variant_pricing?: Record<string, number> | null;
  price_display_from?: number | null;
  fulfillment_mode: string | null;
  confirmation_mode: string | null;
  capacity: number | null;
  deposit_percentage: number | null;
  booking_deadline_hours: number | null;
  min_group_size: number | null;
  max_group_size: number | null;
  cancellation_policy: string | null;
  availability_start?: string | null;
  availability_end?: string | null;
  details?: {
    disponibilite?: {
      type?: string | null;
      dates?: string[] | null;
      start_date?: string | null;
      end_date?: string | null;
      days_of_week?: string[] | null;
    } | null;
  } | null;
}

interface OfferSession {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  spots_taken: number;
  status: string;
}

interface UserResult {
  user_id: string;
  full_name: string;
  photo: string | null;
}

type DateMode =
  | { kind: "sessions" }
  | { kind: "fixed"; date: string }
  | { kind: "pick_list"; dates: string[] }
  | { kind: "pick_range"; start: string; end: string; days_of_week?: string[] }
  | { kind: "none" };

function toYmd(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

/** Agenda index: 0=Lun … 6=Dim → JS getDay (0=Dim) */
function matchesRecurringDay(ymd: string, days: string[]): boolean {
  if (!days.length) return true;
  const js = new Date(`${ymd}T12:00:00`).getDay(); // 0 Sun
  const agenda = js === 0 ? "6" : String(js - 1);
  return days.map(String).includes(agenda);
}

function resolveDateMode(offer: Offer): DateMode {
  const mode = offer.fulfillment_mode;
  if (mode === "scheduled" || mode === "recurring") return { kind: "sessions" };

  const dispo = offer.details?.disponibilite;
  const start =
    toYmd(dispo?.start_date) ?? toYmd(offer.availability_start);
  const end =
    toYmd(dispo?.end_date) ?? toYmd(offer.availability_end) ?? start;
  const dates = (dispo?.dates ?? [])
    .map((d) => toYmd(d))
    .filter((d): d is string => !!d);

  if (dispo?.type === "specific" || dates.length > 0) {
    const list = dates.length ? dates : start ? [start] : [];
    if (list.length === 0) return { kind: "none" };
    if (list.length === 1) return { kind: "fixed", date: list[0] };
    return { kind: "pick_list", dates: list };
  }

  if (dispo?.type === "recurring" && start && end) {
    return {
      kind: "pick_range",
      start,
      end,
      days_of_week: (dispo.days_of_week ?? []).map(String),
    };
  }

  if ((dispo?.type === "range" || dispo?.type === "season") && start && end) {
    if (start === end) return { kind: "fixed", date: start };
    return { kind: "pick_range", start, end };
  }

  // Fallback columns
  if (start && end && start === end) return { kind: "fixed", date: start };
  if (start && end) return { kind: "pick_range", start, end };
  if (start) return { kind: "fixed", date: start };
  return { kind: "none" };
}

type StepKind = "formula" | "creneau" | "participants" | "paiement";

const STEP_LABELS: Record<StepKind, string> = {
  formula: "Formule",
  creneau: "Créneau",
  participants: "Participants",
  paiement: "Paiement",
};

function buildStepKinds(offer: Offer | null, circuit?: CircuitBooking | null): StepKind[] {
  if (circuit) {
    if (hasSelectableCircuitFormulas(circuit)) {
      return ["formula", "creneau", "participants", "paiement"];
    }
    return ["creneau", "participants", "paiement"];
  }
  if (hasSelectableFormulas(offer)) {
    return ["formula", "creneau", "participants", "paiement"];
  }
  return ["creneau", "participants", "paiement"];
}

const TYPE_ICONS: Record<string, string> = {
  hebergement: "🏕️", activite: "🧗", circuit: "🗺️",
  restauration: "🍽️", artisanat: "🪴", location_materiel: "🎒",
  volontariat: "🌱", bien_etre: "🧘", transport: "🚌",
};

const FULFILLMENT_LABELS: Record<string, string> = {
  instant_stock: "Réservation directe",
  calendar_stock: "Calendrier",
  scheduled: "Séances planifiées",
  recurring: "Récurrent",
  on_request: "Sur demande",
  mixed: "Mixte",
};

// ─── Page principale ──────────────────────────────────────────────────────────

function NewReservationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offerId");
  const circuitId = searchParams.get("circuitId");
  const subtypesFromUrl = parseSubtypesParam(searchParams.get("subtypes") ?? searchParams.get("subtype"));
  const circuitSubtypesFromUrl = parseCircuitSubtypesParam(searchParams.get("subtypes") ?? searchParams.get("subtype"));
  const isCircuit = !!circuitId && !offerId;

  const [authOk, setAuthOk] = useState(false);
  const [step, setStep] = useState(0);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [circuit, setCircuit] = useState<CircuitBooking | null>(null);
  const [chosenSubtypes, setChosenSubtypes] = useState<string[]>([]);
  const [sessions, setSessions] = useState<OfferSession[]>([]);
  const [loadingOffer, setLoadingOffer] = useState(true);

  // Étape 1
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Étape 2
  const [participantCount, setParticipantCount] = useState(1);
  const [reservationType, setReservationType] = useState<"solo" | "group">("solo");
  const [invitedUsers, setInvitedUsers] = useState<UserResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTried, setSearchTried] = useState(false);
  const [notes, setNotes] = useState("");
  const [spotsAvailable, setSpotsAvailable] = useState<number | null>(null);

  // Soumission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const dateMode: DateMode = isCircuit && circuit
    ? resolveCircuitDateMode(circuit)
    : offer
      ? resolveDateMode(offer)
      : { kind: "none" };
  const stepKinds = buildStepKinds(offer, circuit);
  const stepLabels = stepKinds.map((k) => STEP_LABELS[k]);
  const currentKind = stepKinds[step] ?? "creneau";
  const effectiveDate =
    (selectedSessionId
      ? sessions.find((s) => s.id === selectedSessionId)?.date
      : null) ??
    selectedDate ??
    "";

  useEffect(() => {
    const session = getConsistentSession();
    if (!session) {
      const redirect = circuitId
        ? `/reservations/new?circuitId=${circuitId}`
        : offerId
          ? `/reservations/new?offerId=${offerId}`
          : "/reservations/new";
      window.location.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }
    if (session.role !== "eco_traveler") {
      window.location.replace(
        session.role === "guide"
          ? "/dashboard/guide/reservations"
          : session.role === "provider"
            ? "/dashboard/provider/reservations"
            : "/reservations",
      );
      return;
    }
    setAuthOk(true);
  }, [offerId, circuitId]);

  useEffect(() => {
    if (!authOk || !circuitId || offerId) return;
    apiFetch<CircuitBooking>(`/circuits/${circuitId}/public-detail`)
      .then((c) => {
        setCircuit(c);
        if (isPackageCircuit(c)) {
          setChosenSubtypes(defaultPackageOptions(c));
        } else if (c.circuit_mode === "variant") {
          const required = (c.bookable_options ?? []).filter((o) => o.required).map((o) => o.key);
          const fromUrl = circuitSubtypesFromUrl.filter((k) =>
            (c.bookable_options ?? []).some((o) => o.key === k),
          );
          setChosenSubtypes([...new Set([...required, ...fromUrl])].sort());
        } else if (circuitSubtypesFromUrl.length) {
          const valid = circuitSubtypesFromUrl.filter((k) =>
            (c.bookable_options ?? []).some((o) => o.key === k),
          );
          if (valid.length) setChosenSubtypes(valid);
        }
        const dm = resolveCircuitDateMode(c);
        if (dm.kind === "fixed") setSelectedDate(dm.date);
        else setSelectedDate("");
      })
      .catch(() => setError("Circuit introuvable."))
      .finally(() => setLoadingOffer(false));
  }, [authOk, circuitId, offerId, circuitSubtypesFromUrl.join(",")]);

  useEffect(() => {
    if (!authOk || !offerId || circuitId) return;
    apiFetch<Offer>(`/offers/${offerId}`)
      .then((o) => {
        setOffer(o);
        if (isPackageOffer(o)) {
          setChosenSubtypes(defaultPackageSubtypes(o));
        } else if (subtypesFromUrl.length) {
          const valid = subtypesFromUrl.filter((k) => o.variant_pricing?.[k] !== undefined);
          if (valid.length) setChosenSubtypes(valid);
        }
        const dm = resolveDateMode(o);
        if (dm.kind === "fixed") setSelectedDate(dm.date);
        else setSelectedDate("");
        if (o.fulfillment_mode === "scheduled" || o.fulfillment_mode === "recurring") {
          return apiFetch<OfferSession[]>(`/offers/${offerId}/sessions`).then(setSessions).catch(() => {});
        }
      })
      .catch(() => setError("Offre introuvable."))
      .finally(() => setLoadingOffer(false));
  }, [authOk, offerId, subtypesFromUrl.join(",")]);

  // Recherche d'éco-voyageurs (profils existants uniquement)
  useEffect(() => {
    if (!searchQuery.trim() || reservationType !== "group") {
      setSearchResults([]);
      setSearchTried(false);
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchTried(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await apiFetch<UserResult[]>(`/eco-traveler/search?q=${encodeURIComponent(q)}`);
        setSearchResults(results.filter((u) => !invitedUsers.find((i) => i.user_id === u.user_id)));
        setSearchTried(true);
      } catch {
        setSearchResults([]);
        setSearchTried(true);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, reservationType, invitedUsers]);

  // Nombre de places dispo selon la date/séance
  useEffect(() => {
    if (isCircuit) {
      if (!circuitId || !circuit) return;
      if (!effectiveDate) {
        setSpotsAvailable(null);
        return;
      }
      const params = new URLSearchParams({ circuit_id: circuitId, date: effectiveDate });
      apiFetch<{ spots_available: number }>(`/reservations/availability?${params}`)
        .then((a) => setSpotsAvailable(a.spots_available))
        .catch(() => setSpotsAvailable(circuit.max_group_size ?? circuit.capacity ?? 99));
      return;
    }
    if (!offerId || !offer) return;
    if (dateMode.kind === "sessions" && !selectedSessionId) {
      setSpotsAvailable(null);
      return;
    }
    if (dateMode.kind !== "sessions" && !effectiveDate) {
      setSpotsAvailable(null);
      return;
    }
    const params = new URLSearchParams({ offer_id: offerId });
    if (selectedSessionId) params.set("session_id", selectedSessionId);
    if (effectiveDate) params.set("date", effectiveDate);
    apiFetch<{ spots_available: number }>(`/reservations/availability?${params}`)
      .then((a) => setSpotsAvailable(a.spots_available))
      .catch(() => {
        if (selectedSessionId) {
          const s = sessions.find((x) => x.id === selectedSessionId);
          if (s) setSpotsAvailable(Math.max(0, (s.capacity ?? offer.capacity ?? 0) - s.spots_taken));
        } else {
          setSpotsAvailable(offer.max_group_size ?? offer.capacity ?? 99);
        }
      });
  }, [isCircuit, circuitId, circuit, offerId, offer, selectedSessionId, effectiveDate, dateMode.kind, sessions]);

  // ─── Calculs prix ───────────────────────────────────────────────────────────
  const realParticipantCount =
    reservationType === "group" ? 1 + invitedUsers.length : participantCount;
  const pricePerUnit = isCircuit && circuit
    ? getCircuitBookingUnitPrice(circuit, chosenSubtypes)
    : offer != null
      ? getBookingUnitPrice(offer, chosenSubtypes)
      : null;
  const capacityLabel = isCircuit && circuit
    ? formatCircuitCapacityLabel(circuit)
    : offer
      ? formatOfferCapacityLabel(offer)
      : null;

  function toggleSubtype(key: string) {
    setChosenSubtypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort(),
    );
  }
  const totalPrice = pricePerUnit !== null ? pricePerUnit * realParticipantCount : null;
  const shareAmount =
    totalPrice !== null && realParticipantCount > 0
      ? Math.round((totalPrice / realParticipantCount) * 100) / 100
      : null;
  const depositPct = (isCircuit ? circuit?.deposit_percentage : offer?.deposit_percentage) ?? 0;
  const depositAmount = totalPrice !== null && depositPct > 0 ? (totalPrice * depositPct) / 100 : null;
  const remainingAmount = totalPrice !== null && depositAmount !== null ? totalPrice - depositAmount : null;
  const maxSpots = spotsAvailable ?? (isCircuit
    ? (circuit?.max_group_size ?? circuit?.capacity ?? 99)
    : (offer?.max_group_size ?? offer?.capacity ?? 99));
  const remainingAfterParty = Math.max(0, maxSpots - realParticipantCount);

  // ─── Validation par étape ───────────────────────────────────────────────────
  function canNext() {
    if (!offer && !circuit) return false;
    if (currentKind === "formula") return chosenSubtypes.length > 0;
    if (currentKind === "creneau") {
      if (dateMode.kind === "sessions") return !!selectedSessionId;
      if (dateMode.kind === "fixed") return !!selectedDate;
      if (dateMode.kind === "pick_list") return !!selectedDate;
      if (dateMode.kind === "pick_range") {
        if (!selectedDate) return false;
        if (selectedDate < dateMode.start || selectedDate > dateMode.end) return false;
        if (dateMode.days_of_week?.length && !matchesRecurringDay(selectedDate, dateMode.days_of_week)) {
          return false;
        }
        return true;
      }
      return false;
    }
    if (currentKind === "participants") {
      if (reservationType === "group" && invitedUsers.length === 0) return false;
      if (realParticipantCount > maxSpots) return false;
      return true;
    }
    return true;
  }

  // ─── Soumission ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch<{ message?: string; confirmation_mode?: string }>("/reservations", {
        method: "POST",
        body: JSON.stringify({
          ...(isCircuit ? { circuit_id: circuitId } : { offer_id: offerId }),
          session_id: selectedSessionId ?? undefined,
          reservation_date: effectiveDate || undefined,
          reservation_type: reservationType,
          participant_count: realParticipantCount,
          notes: notes || undefined,
          invited_user_ids: reservationType === "group" ? invitedUsers.map((u) => u.user_id) : [],
          ...(chosenSubtypes.length ? { chosen_subtypes: chosenSubtypes } : {}),
        }),
      });
      const instant = isCircuit
        ? circuit?.confirmation_mode === "instant"
        : offer?.confirmation_mode === "instant";
      setSuccessMessage(
        res.message ??
          (instant
            ? "Votre réservation est confirmée."
            : "Votre réservation est en attente de confirmation."),
      );
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/ecovoyageur/reservations"), 2500);
    } catch (e: any) {
      setError(e.message ?? "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!offerId && !circuitId) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Aucune offre ou circuit sélectionné.</div>;
  }

  if (!authOk) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-surface-container-highest sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(step - 1) : router.back()} className="text-outline hover:text-on-surface">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-extrabold text-on-surface flex items-center gap-2">
              <Leaf size={18} className="text-primary" /> Réserver
            </h1>
            <p className="text-xs text-outline">Étape {step + 1} sur {stepLabels.length} — {stepLabels[step]}</p>
          </div>
        </div>
        <div className="h-1 bg-surface-container">
          <div className="h-1 bg-primary transition-all" style={{ width: `${((step + 1) / stepLabels.length) * 100}%` }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${i < step ? "bg-primary text-slate-900" : i === step ? "bg-primary/15 text-secondary ring-2 ring-primary" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-secondary font-semibold" : "text-slate-400"}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        {/* Fiche offre */}
        {loadingOffer ? (
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        ) : (offer || circuit) ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/5 flex-shrink-0 flex items-center justify-center text-3xl">
              {offer?.images?.[0]
                ? <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover rounded-xl" />
                : circuit?.cover_image
                  ? <img src={circuit.cover_image} alt={circuit.title} className="w-full h-full object-cover rounded-xl" />
                  : isCircuit ? "🗺️" : TYPE_ICONS[offer?.offer_type ?? ""] ?? "🌿"
              }
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-slate-800 text-sm line-clamp-1">{offer?.title ?? circuit?.title}</h2>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                {offer?.region && <span className="flex items-center gap-1"><MapPin size={10} />{offer.region}</span>}
                {circuit?.nb_jours && <span className="flex items-center gap-1"><Clock size={10} />{circuit.nb_jours} jour{circuit.nb_jours > 1 ? "s" : ""}</span>}
                {offer?.duration && <span className="flex items-center gap-1"><Clock size={10} />{offer.duration}</span>}
                {offer?.fulfillment_mode && (
                  <span className="bg-primary/15 text-secondary rounded-full px-2 py-0.5">
                    {FULFILLMENT_LABELS[offer.fulfillment_mode]}
                  </span>
                )}
                {isCircuit && (
                  <span className="bg-primary/15 text-secondary rounded-full px-2 py-0.5">Circuit</span>
                )}
              </div>
              {(offer?.confirmation_mode === "instant" || circuit?.confirmation_mode === "instant") && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 mt-1">
                  <Zap size={10} /> Confirmation instantanée
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 rounded-2xl p-4 text-red-600 text-sm">{error}</div>
        )}

        {success ? (
          <div className="bg-primary/5 border border-primary/30 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <CheckCircle size={40} className="text-primary" />
            <div>
              <p className="font-bold text-on-primary-container text-lg">Réservation envoyée !</p>
              <p className="text-sm text-secondary mt-1">
                {successMessage ||
                  ((isCircuit ? circuit?.confirmation_mode : offer?.confirmation_mode) === "instant"
                    ? "Votre réservation est confirmée automatiquement."
                    : "Le prestataire va confirmer votre réservation sous peu.")}
              </p>
            </div>
          </div>
        ) : (offer || circuit) ? (
          <>
            {/* ─── Formule (variant) ─── */}
            {currentKind === "formula" && isCircuit && circuit?.bookable_options && (
              <div className="space-y-4">
                <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
                  <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                    <Package size={16} className="text-primary" /> Choisissez une ou plusieurs étapes
                  </h3>
                  <p className="text-xs text-outline mb-2">
                    Sélectionnez les blocs du circuit. Les étapes obligatoires sont pré-cochées.
                    {capacityLabel ? ` (${capacityLabel.toLowerCase()}).` : "."}
                  </p>
                  {capacityLabel && (
                    <p className="text-xs font-semibold text-secondary mb-4">{capacityLabel}</p>
                  )}
                  <div className="space-y-2">
                    {(circuit.bookable_options ?? []).map((opt) => {
                      const selected = chosenSubtypes.includes(opt.key);
                      const locked = opt.required;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          disabled={locked}
                          onClick={() => !locked && toggleSubtype(opt.key)}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3
                            ${selected
                              ? "border-primary bg-primary/5"
                              : "border-surface-container-highest bg-surface hover:border-primary/40"}
                            ${locked ? "opacity-80" : ""}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary bg-primary" : "border-slate-300"}`}>
                              {selected && <Check size={12} className="text-slate-900" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-on-surface text-sm block">{opt.label}</span>
                              {locked && <span className="text-[11px] text-outline">Obligatoire</span>}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-secondary whitespace-nowrap">
                            {opt.price_per_person.toFixed(0)} TND
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {chosenSubtypes.length > 1 && pricePerUnit !== null && (
                    <p className="text-xs text-secondary font-semibold mt-3">
                      Total : {pricePerUnit.toFixed(0)} TND / personne
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentKind === "formula" && !isCircuit && offer?.variant_pricing && (
              <div className="space-y-4">
                <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
                  <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                    <Package size={16} className="text-primary" /> Choisissez une ou plusieurs formules
                  </h3>
                  <p className="text-xs text-outline mb-2">
                    Sélectionnez toutes les options souhaitées. Le nombre de participants s&apos;applique à l&apos;ensemble de votre réservation
                    {capacityLabel ? ` (${capacityLabel.toLowerCase()}).` : "."}
                  </p>
                  {capacityLabel && (
                    <p className="text-xs font-semibold text-secondary mb-4">{capacityLabel} — identique pour chaque formule</p>
                  )}
                  <div className="space-y-2">
                    {Object.entries(offer.variant_pricing).map(([key, price]) => {
                      const selected = chosenSubtypes.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleSubtype(key)}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between gap-3
                            ${selected
                              ? "border-primary bg-primary/5"
                              : "border-surface-container-highest bg-surface hover:border-primary/40"}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary bg-primary" : "border-slate-300"}`}>
                              {selected && <Check size={12} className="text-slate-900" />}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-on-surface text-sm block">
                                {formatSubtypeLabel(key)}
                              </span>
                              {capacityLabel && (
                                <span className="text-[11px] text-outline">{capacityLabel}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-secondary whitespace-nowrap">
                            {price.toFixed(0)} TND
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {chosenSubtypes.length > 1 && pricePerUnit !== null && (
                    <p className="text-xs text-secondary font-semibold mt-3">
                      Total formules : {pricePerUnit.toFixed(0)} TND / personne
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ─── Créneau ─── */}
            {currentKind === "creneau" && (
              <div className="space-y-4">
                {isCircuit && isPackageCircuit(circuit) && circuit?.bookable_options && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-secondary">
                    <p className="font-bold text-on-primary-container mb-1">Circuit tout inclus</p>
                    <p className="text-xs">
                      Étapes incluses : {(circuit.bookable_options ?? []).map((o) => o.label).join(", ")}.
                      {capacityLabel && ` ${capacityLabel}.`}
                    </p>
                  </div>
                )}
                {!isCircuit && isPackageOffer(offer) && offer?.variant_pricing && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-secondary">
                    <p className="font-bold text-on-primary-container mb-1">Package tout inclus</p>
                    <p className="text-xs">
                      Formules incluses : {chosenSubtypes.map((k) => formatSubtypeLabel(k)).join(", ")}.
                      {capacityLabel && ` ${capacityLabel}.`}
                    </p>
                  </div>
                )}
                {dateMode.kind === "sessions" && (
                  <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
                    <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-primary" /> Séances proposées
                    </h3>
                    <p className="text-xs text-outline mb-3">
                      Choisissez une séance parmi les dates fixées par le guide / prestataire.
                    </p>
                    {sessions.length === 0 ? (
                      <p className="text-outline text-sm text-center py-4">Aucune séance disponible pour le moment.</p>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((s) => {
                          const available = (s.capacity ?? offer.capacity ?? 0) - s.spots_taken;
                          const full = available <= 0;
                          return (
                            <button
                              key={s.id}
                              disabled={full}
                              onClick={() => setSelectedSessionId(s.id)}
                              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all
                                ${full ? "opacity-40 cursor-not-allowed border-surface-container bg-surface-container-low"
                                  : selectedSessionId === s.id
                                  ? "border-primary bg-primary/5"
                                  : "border-surface-container-highest bg-surface hover:border-primary/40"}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-on-surface text-sm">
                                    {new Date(s.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                                  </span>
                                  {(s.start_time || s.end_time) && (
                                    <span className="text-outline text-xs ml-2">
                                      {s.start_time}{s.end_time ? ` → ${s.end_time}` : ""}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${full ? "bg-error-container text-on-error-container" : "bg-primary/15 text-secondary"}`}>
                                  {full ? "Complet" : `${available} place${available > 1 ? "s" : ""}`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {dateMode.kind === "fixed" && (
                  <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
                    <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-primary" /> {isCircuit ? "Date de départ" : "Date de l'offre"}
                    </h3>
                    <p className="text-xs text-outline mb-3">
                      Une seule date est prévue — elle est fixe, vous ne pouvez pas en choisir une autre.
                    </p>
                    <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                      <p className="font-bold text-on-primary-container text-sm">
                        {new Date(`${dateMode.date}T12:00:00`).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {spotsAvailable != null && (
                      <p className="text-xs text-secondary font-semibold mt-3">
                        {spotsAvailable} place{spotsAvailable > 1 ? "s" : ""} disponible{spotsAvailable > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {dateMode.kind === "pick_list" && (
                  <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
                    <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-primary" /> Dates disponibles
                    </h3>
                    <p className="text-xs text-outline mb-3">
                      Plusieurs dates sont proposées. Choisissez celle qui vous convient.
                    </p>
                    <div className="space-y-2">
                      {dateMode.dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDate(d)}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all
                            ${selectedDate === d
                              ? "border-primary bg-primary/5"
                              : "border-surface-container-highest bg-surface hover:border-primary/40"}`}
                        >
                          <span className="font-semibold text-on-surface text-sm">
                            {new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </button>
                      ))}
                    </div>
                    {selectedDate && spotsAvailable != null && (
                      <p className="text-xs text-secondary font-semibold mt-3">
                        {spotsAvailable} place{spotsAvailable > 1 ? "s" : ""} disponible{spotsAvailable > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {dateMode.kind === "pick_range" && (
                  <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
                    <h3 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                      <Calendar size={16} className="text-primary" /> Choisir une date
                    </h3>
                    <p className="text-xs text-outline mb-3">
                      Sélectionnez une date dans la période du{" "}
                      <span className="font-semibold text-on-surface">
                        {new Date(`${dateMode.start}T12:00:00`).toLocaleDateString("fr-FR")}
                      </span>
                      {" "}au{" "}
                      <span className="font-semibold text-on-surface">
                        {new Date(`${dateMode.end}T12:00:00`).toLocaleDateString("fr-FR")}
                      </span>
                      {dateMode.days_of_week && dateMode.days_of_week.length > 0 && (
                        <> (jours : {dateMode.days_of_week.map((i) => ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][Number(i)] ?? i).join(", ")})</>
                      )}
                      .
                    </p>
                    <input
                      type="date"
                      min={dateMode.start}
                      max={dateMode.end}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
                    />
                    {selectedDate &&
                      dateMode.days_of_week &&
                      dateMode.days_of_week.length > 0 &&
                      !matchesRecurringDay(selectedDate, dateMode.days_of_week) && (
                        <p className="text-xs text-error mt-2 font-semibold">
                          Cette date ne correspond pas aux jours disponibles de l&apos;offre.
                        </p>
                      )}
                    {selectedDate && spotsAvailable != null && (
                      <p className="text-xs text-secondary font-semibold mt-3">
                        {spotsAvailable} place{spotsAvailable > 1 ? "s" : ""} disponible{spotsAvailable > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {dateMode.kind === "none" && (
                  <div className="bg-error-container/40 border border-error/20 rounded-2xl p-4 text-sm text-on-error-container">
                    Aucune disponibilité n&apos;est définie sur cette offre.
                  </div>
                )}

                {offer.cancellation_policy && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-xs font-bold text-amber-800 mb-1">Politique d&apos;annulation</p>
                    <p className="text-xs text-amber-700">{offer.cancellation_policy}</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Participants ─── */}
            {currentKind === "participants" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h3 className="font-semibold text-slate-700 mb-3">Type de réservation</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: "solo", icon: <User size={20} />, label: "Solo", desc: "Réservation individuelle" },
                      { v: "group", icon: <Users size={20} />, label: "Groupe", desc: "Inviter des amis" },
                    ].map((t) => (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => { setReservationType(t.v as any); if (t.v === "solo") { setInvitedUsers([]); setSearchQuery(""); setSearchResults([]); setSearchTried(false); } }}
                        className={`p-4 rounded-xl border-2 text-left transition-all
                          ${reservationType === t.v ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
                      >
                        <div className={reservationType === t.v ? "text-primary mb-2" : "text-slate-400 mb-2"}>{t.icon}</div>
                        <p className={`font-semibold text-sm ${reservationType === t.v ? "text-secondary" : "text-slate-600"}`}>{t.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {reservationType === "solo" && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Users size={16} /> Nombre de participants
                    </h3>
                    {spotsAvailable != null && (
                      <p className="text-xs text-secondary mb-3">
                        {spotsAvailable} place{spotsAvailable > 1 ? "s" : ""} disponible{spotsAvailable > 1 ? "s" : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setParticipantCount(Math.max(1, participantCount - 1))}
                        className="w-10 h-10 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xl hover:border-primary/50 flex items-center justify-center"
                      >−</button>
                      <span className="text-2xl font-bold text-slate-800 w-8 text-center">{participantCount}</span>
                      <button
                        type="button"
                        onClick={() => setParticipantCount(Math.min(maxSpots, participantCount + 1))}
                        className="w-10 h-10 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-xl hover:border-primary/50 flex items-center justify-center"
                      >+</button>
                      <span className="text-sm text-slate-400">personne{participantCount > 1 ? "s" : ""}</span>
                    </div>
                    {totalPrice !== null && (
                      <div className="mt-4 pt-3 border-t border-slate-100 text-sm space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Total</span>
                          <span className="font-bold text-slate-800">{totalPrice.toFixed(0)} TND</span>
                        </div>
                        {shareAmount !== null && participantCount > 1 && (
                          <div className="flex justify-between text-slate-500 text-xs">
                            <span>Part par personne</span>
                            <span>{shareAmount.toFixed(0)} TND</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {reservationType === "group" && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <UserPlus size={16} /> Inviter des éco-voyageurs
                    </h3>
                    <p className="text-xs text-secondary mb-3">
                      {spotsAvailable != null
                        ? `${remainingAfterParty} place${remainingAfterParty > 1 ? "s" : ""} restante${remainingAfterParty > 1 ? "s" : ""} (vous + ${invitedUsers.length} invité${invitedUsers.length > 1 ? "s" : ""} / max ${maxSpots})`
                        : "Chargement des places disponibles…"}
                    </p>
                    <p className="text-xs text-outline mb-2">
                      Recherchez un profil existant (nom ou email). Les invitations hors plateforme ne sont pas autorisées.
                    </p>
                    <div className="relative mb-3">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Nom ou email d'un éco-voyageur…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {searching && <p className="text-xs text-slate-400 mb-2">Recherche en cours…</p>}
                    {!searching && searchTried && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                      <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 font-semibold">
                        Aucun profil éco-voyageur trouvé. Utilisez un profil déjà inscrit sur la plateforme.
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="border border-slate-100 rounded-xl divide-y mb-3 overflow-hidden">
                        {searchResults.map((u) => (
                          <button
                            key={u.user_id}
                            type="button"
                            disabled={1 + invitedUsers.length >= maxSpots}
                            onClick={() => {
                              if (1 + invitedUsers.length >= maxSpots) return;
                              setInvitedUsers((p) => [...p, u]);
                              setSearchQuery("");
                              setSearchResults([]);
                              setSearchTried(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 text-left disabled:opacity-40"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {u.photo ? <img src={u.photo} alt={u.full_name} className="w-full h-full object-cover" /> : <User size={16} className="text-primary" />}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{u.full_name}</span>
                            <span className="ml-auto text-xs text-primary">+ Inviter</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {invitedUsers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 font-medium">
                          Invités ({invitedUsers.length})
                        </p>
                        {invitedUsers.map((u) => (
                          <div key={u.user_id} className="flex items-center gap-3 bg-primary/5 rounded-xl px-3 py-2">
                            <div className="w-7 h-7 rounded-full bg-primary/25 flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover" /> : <User size={13} className="text-primary" />}
                            </div>
                            <span className="text-sm font-medium text-slate-700 flex-1">{u.full_name}</span>
                            <button type="button" onClick={() => setInvitedUsers((p) => p.filter((x) => x.user_id !== u.user_id))} className="text-slate-400 hover:text-red-400">
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {totalPrice !== null && (
                      <div className="mt-4 pt-3 border-t border-slate-100 text-sm space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Total ({realParticipantCount} pers.)</span>
                          <span className="font-bold text-slate-800">{totalPrice.toFixed(0)} TND</span>
                        </div>
                        {shareAmount !== null && (
                          <div className="flex justify-between text-secondary text-xs font-semibold">
                            <span>Part par personne</span>
                            <span>{shareAmount.toFixed(0)} TND</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h3 className="font-semibold text-slate-700 mb-3">Notes (optionnel)</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, demandes spéciales, questions pour le prestataire..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
            )}

            {/* ─── Étape 3 : Paiement ─── */}
            {currentKind === "paiement" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <CreditCard size={16} /> Récapitulatif & Paiement
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Offre</span>
                      <span className="font-medium line-clamp-1 max-w-40 text-right">{offer.title}</span>
                    </div>
                    {chosenSubtypes.length > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Formule{chosenSubtypes.length > 1 ? "s" : ""}</span>
                        <span className="font-medium text-right max-w-[55%]">
                          {chosenSubtypes.map((k) => formatSubtypeLabel(k)).join(", ")}
                        </span>
                      </div>
                    )}
                    {selectedSessionId && sessions.length > 0 && (() => {
                      const s = sessions.find((x) => x.id === selectedSessionId);
                      return s ? (
                        <div className="flex justify-between text-slate-600">
                          <span>Séance</span>
                          <span className="font-medium">{new Date(s.date).toLocaleDateString("fr-FR")} {s.start_time && `à ${s.start_time}`}</span>
                        </div>
                      ) : null;
                    })()}
                    {!selectedSessionId && effectiveDate && (
                      <div className="flex justify-between text-slate-600">
                        <span>Date</span>
                        <span className="font-medium">{new Date(`${effectiveDate}T12:00:00`).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Participants</span>
                      <span className="font-medium">{realParticipantCount} personne{realParticipantCount > 1 ? "s" : ""}</span>
                    </div>
                    {pricePerUnit !== null && (
                      <div className="flex justify-between text-slate-600">
                        <span>Prix unitaire</span>
                        <span>{pricePerUnit.toFixed(0)} TND</span>
                      </div>
                    )}
                    {shareAmount !== null && realParticipantCount > 1 && (
                      <div className="flex justify-between text-secondary font-semibold">
                        <span>Part par personne</span>
                        <span>{shareAmount.toFixed(0)} TND</span>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-3">
                      {totalPrice !== null ? (
                        <>
                          <div className="flex justify-between font-bold text-slate-800 text-base">
                            <span>Total</span>
                            <span>{totalPrice.toFixed(0)} TND</span>
                          </div>
                          {depositAmount !== null && depositAmount > 0 ? (
                            <>
                              <div className="flex justify-between text-amber-600 font-semibold mt-2">
                                <span>Acompte à payer maintenant ({depositPct}%)</span>
                                <span>{depositAmount.toFixed(0)} TND</span>
                              </div>
                              <div className="flex justify-between text-slate-400 text-xs mt-1">
                                <span>Reste à payer le jour J</span>
                                <span>{remainingAmount!.toFixed(0)} TND</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-secondary mt-1">Paiement intégral à la confirmation.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-slate-400 text-sm">Le prix sera défini par le prestataire.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mode de confirmation */}
                <div className={`rounded-2xl p-4 border ${offer.confirmation_mode === "instant" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
                  {offer.confirmation_mode === "instant" ? (
                    <div className="flex items-center gap-2 text-amber-700">
                      <Zap size={16} />
                      <div>
                        <p className="font-semibold text-sm">Confirmation instantanée</p>
                        <p className="text-xs mt-0.5">Votre réservation sera confirmée immédiatement.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-700">
                      <Clock size={16} />
                      <div>
                        <p className="font-semibold text-sm">Confirmation sous 48h</p>
                        <p className="text-xs mt-0.5">Le prestataire vous confirmera votre réservation.</p>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 rounded-xl p-3 text-sm">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 bg-primary text-slate-900 font-bold rounded-2xl hover:bg-primary/90 disabled:opacity-60 transition-colors text-base shadow-sm flex items-center justify-center gap-2"
                >
                  {submitting ? "Envoi en cours…" : depositAmount ? `Confirmer & payer l'acompte (${depositAmount.toFixed(0)} TND)` : "Confirmer la réservation"}
                </button>
              </div>
            )}

            {/* Navigation */}
            {step < stepKinds.length - 1 && (
              <div className="flex gap-3">
                {step > 0 && (
                  <button onClick={() => setStep(step - 1)} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
                    <ChevronLeft size={16} /> Précédent
                  </button>
                )}
                <button
                  onClick={() => canNext() && setStep(step + 1)}
                  disabled={!canNext()}
                  className="flex-1 py-3 rounded-xl bg-primary text-slate-900 font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function NewReservationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>}>
      <NewReservationContent />
    </Suspense>
  );
}
