"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getConsistentSession } from "@/lib/auth";
import {
  ChevronLeft, Calendar, Users, MapPin, Clock, CreditCard,
  CheckCircle, XCircle, User, Phone, MessageSquare, AlertCircle,
} from "lucide-react";

type Role = "guide" | "provider";

interface Reservation {
  id: string;
  status: string;
  reservation_type: string;
  participant_count: number;
  total_price: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  reservation_date: string | null;
  notes: string | null;
  created_at: string;
  can_confirm?: boolean;
  availability?: {
    spots_total: number | null;
    spots_taken: number;
    spots_available: number;
    max_group_size: number | null;
  } | null;
  offer: {
    id: string;
    title: string;
    offer_type: string | null;
    region: string | null;
    duration: string | null;
    capacity?: number | null;
    max_group_size?: number | null;
  };
  session: {
    date: string;
    start_time: string | null;
    end_time: string | null;
  } | null;
  traveler?: {
    user_id: string;
    full_name: string | null;
    photo: string | null;
    phone: string | null;
  };
  invited_members?: {
    user_id: string | null;
    full_name: string;
    photo: string | null;
    status: string;
  }[];
}

const TYPE_ICONS: Record<string, string> = {
  hebergement: "🏕️", activite: "🧗", circuit: "🗺️",
  restauration: "🍽️", artisanat: "🪴", location_materiel: "🎒",
  volontariat: "🌱", bien_etre: "🧘", transport: "🚌",
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "En attente", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  confirmed: { label: "Confirmée",  color: "text-secondary", bg: "bg-primary/10 border-primary/20" },
  rejected:  { label: "Refusée",   color: "text-red-700", bg: "bg-red-50 border-red-200" },
  cancelled: { label: "Annulée",   color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
  completed: { label: "Terminée",  color: "text-tertiary", bg: "bg-tertiary-container/40 border-tertiary/20" },
};

export default function AuthorReservationDetail({ role }: { role: Role }) {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState("");

  const listHref =
    role === "guide"
      ? "/dashboard/guide/reservations"
      : "/dashboard/provider/reservations";

  useEffect(() => {
    const session = getConsistentSession();
    if (!session || session.role !== role) {
      router.replace("/auth/login");
      return;
    }
    if (!id) return;
    apiFetch<Reservation>(`/reservations/${id}`)
      .then(setReservation)
      .catch(() => setReservation(null))
      .finally(() => setLoading(false));
  }, [id, role, router]);

  async function handleAction(status: "confirmed" | "rejected") {
    setActionLoading(true);
    setError("");
    try {
      const body: { status: string; cancellation_reason?: string } = { status };
      if (status === "rejected" && rejectReason.trim()) {
        body.cancellation_reason = rejectReason.trim();
      }
      const updated = await apiFetch<Reservation>(`/reservations/${id}/confirm`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setReservation(updated);
      setShowRejectForm(false);
    } catch (e: any) {
      setError(e?.message || "Action impossible.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-outline">
        <AlertCircle size={40} className="opacity-30" />
        <p>Réservation introuvable</p>
        <button onClick={() => router.push(listHref)} className="text-secondary text-sm font-semibold hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_LABELS[reservation.status] ?? STATUS_LABELS.pending;
  const canAct = reservation.status === "pending";

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-surface border-b border-surface-container-highest sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push(listHref)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container text-outline"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-extrabold text-on-surface flex-1">Demande de réservation</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${statusCfg.bg}`}>
          {reservation.status === "confirmed" ? <CheckCircle size={18} className="text-primary" />
            : reservation.status === "rejected" ? <XCircle size={18} className="text-red-500" />
            : <Clock size={18} className="text-amber-500" />}
          <div>
            <p className={`font-bold text-sm ${statusCfg.color}`}>{statusCfg.label}</p>
            <p className="text-xs text-outline mt-0.5">
              Reçue le {new Date(reservation.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-4 flex items-center gap-3">
          <span className="text-4xl">{TYPE_ICONS[reservation.offer.offer_type ?? ""] ?? "🌿"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-on-surface">{reservation.offer.title}</p>
            <div className="flex flex-wrap gap-2 text-xs text-outline mt-1">
              {reservation.offer.region && <span className="flex items-center gap-1"><MapPin size={10} />{reservation.offer.region}</span>}
              {reservation.offer.duration && <span className="flex items-center gap-1"><Clock size={10} />{reservation.offer.duration}</span>}
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
          <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
            <Calendar size={15} className="text-primary" /> Créneau demandé
          </h3>
          {reservation.session ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-on-surface">
                {new Date(`${reservation.session.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              {reservation.session.start_time && (
                <p className="text-outline">
                  {reservation.session.start_time}{reservation.session.end_time ? ` → ${reservation.session.end_time}` : ""}
                </p>
              )}
            </div>
          ) : reservation.reservation_date ? (
            <p className="text-sm font-semibold text-on-surface">
              {new Date(`${String(reservation.reservation_date).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          ) : (
            <p className="text-outline text-sm">Date à convenir</p>
          )}
          {reservation.availability && reservation.availability.spots_total != null && (
            <div className="mt-3 pt-3 border-t border-surface-container flex items-center gap-2 text-sm">
              <Users size={14} className="text-primary shrink-0" />
              <span className="text-outline">Places dispo ce jour :</span>
              <span className={`font-extrabold ${reservation.availability.spots_available > 0 ? "text-secondary" : "text-red-600"}`}>
                {reservation.availability.spots_available} / {reservation.availability.spots_total}
              </span>
              <span className="text-xs text-outline">
                ({reservation.availability.spots_taken} confirmée{reservation.availability.spots_taken > 1 ? "s" : ""})
              </span>
            </div>
          )}
        </div>

        {reservation.traveler && (
          <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
            <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <User size={15} className="text-primary" /> Voyageur organisateur
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/15 overflow-hidden flex items-center justify-center flex-shrink-0">
                {reservation.traveler.photo
                  ? <img src={reservation.traveler.photo} alt="" className="w-full h-full object-cover" />
                  : <User size={20} className="text-primary" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-on-surface">{reservation.traveler.full_name ?? "—"}</p>
                {reservation.traveler.phone && (
                  <a href={`tel:${reservation.traveler.phone}`}
                    className="flex items-center gap-1 text-xs text-secondary mt-0.5 hover:underline">
                    <Phone size={11} /> {reservation.traveler.phone}
                  </a>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-outline">Participants</p>
                <p className="font-bold text-on-surface">{reservation.participant_count} pers.</p>
              </div>
            </div>

            {reservation.invited_members && reservation.invited_members.length > 0 && (
              <div className="mt-3 pt-3 border-t border-surface-container">
                <p className="text-xs text-outline font-medium mb-2">Membres invités</p>
                <div className="space-y-2">
                  {reservation.invited_members.map((m, idx) => (
                    <div key={m.user_id ?? `m-${idx}`} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : <User size={12} className="text-primary" />}
                      </div>
                      <span className="text-sm text-on-surface flex-1">{m.full_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${m.status === "accepted" ? "bg-primary/15 text-secondary" :
                          m.status === "declined" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                        {m.status === "accepted" ? "Accepté" : m.status === "declined" ? "Refusé" : "En attente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {reservation.notes && (
          <div className="bg-tertiary-container/30 rounded-2xl border border-tertiary/20 p-4">
            <p className="text-xs font-bold text-on-tertiary-container mb-1 flex items-center gap-1">
              <MessageSquare size={12} /> Notes du voyageur
            </p>
            <p className="text-sm text-on-surface">{reservation.notes}</p>
          </div>
        )}

        {reservation.total_price !== null && (
          <div className="bg-surface rounded-2xl shadow-sm border border-surface-container-highest p-5">
            <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <CreditCard size={15} className="text-primary" /> Paiement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-surface-container pb-2">
                <span className="text-outline">Total</span>
                <span className="font-bold text-on-surface text-base">{Number(reservation.total_price).toFixed(0)} TND</span>
              </div>
              {reservation.deposit_amount !== null && Number(reservation.deposit_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-outline">Acompte</span>
                  <span className={`font-semibold ${reservation.deposit_paid ? "text-secondary" : "text-amber-600"}`}>
                    {Number(reservation.deposit_amount).toFixed(0)} TND {reservation.deposit_paid ? "✓" : "(non payé)"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-semibold">
            {error}
          </div>
        )}

        {canAct && (
          <div className="space-y-3">
            {reservation.can_confirm === false && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                Impossible d&apos;accepter cette demande : elle dépasse les places restantes
                {reservation.availability
                  ? ` (${reservation.availability.spots_available} restante${reservation.availability.spots_available > 1 ? "s" : ""} pour ${reservation.participant_count} pers.)`
                  : ""}.
              </div>
            )}
            <button
              onClick={() => handleAction("confirmed")}
              disabled={actionLoading || reservation.can_confirm === false}
              className="w-full py-4 bg-primary text-slate-900 font-extrabold rounded-2xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 text-base"
            >
              <CheckCircle size={18} /> Accepter & confirmer
            </button>

            {!showRejectForm ? (
              <button
                onClick={() => setShowRejectForm(true)}
                className="w-full py-3 border-2 border-red-200 text-red-600 font-semibold rounded-2xl hover:bg-red-50 flex items-center justify-center gap-2 text-sm"
              >
                <XCircle size={16} /> Refuser
              </button>
            ) : (
              <div className="bg-red-50 rounded-2xl border border-red-200 p-4 space-y-3">
                <p className="text-sm font-bold text-red-800">Motif de refus (optionnel)</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Ex: Dates non disponibles, capacité insuffisante..."
                  className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 py-2 border border-surface-container-highest rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleAction("rejected")}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50"
                  >
                    {actionLoading ? "…" : "Confirmer le refus"}
                  </button>
                </div>
              </div>
            )}
            <p className="text-[11px] text-outline text-center">
              Le voyageur recevra une notification et un email de confirmation ou d&apos;annulation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
