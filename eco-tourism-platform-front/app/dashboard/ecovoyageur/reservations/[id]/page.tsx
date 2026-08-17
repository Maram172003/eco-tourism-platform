"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import React from "react";
import { formatSubtypeLabel } from "@/lib/offer-variant";
import {
  ChevronLeft, Calendar, Users, MapPin, Clock, Leaf,
  CheckCircle, XCircle, AlertCircle, CreditCard, User,
  QrCode, Download, Phone, Star, Package,
} from "lucide-react";

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
  cancellation_reason?: string | null;
  chosen_subtypes?: string[] | null;
  created_at: string;
  payment_status: string | null;
  offer?: {
    id: string;
    title: string;
    offer_type: string | null;
    region: string | null;
    duration: string | null;
    images: string[] | null;
    confirmation_mode: string | null;
    meeting_point: string | null;
  } | null;
  circuit?: {
    id: string;
    title: string;
    nb_jours?: number;
    cover_image?: string | null;
  } | null;
  session: {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
  } | null;
  invited_members?: {
    user_id: string | null;
    full_name: string;
    photo: string | null;
    status: string;
    share_amount: number | null;
  }[];
  share_amount?: number | null;
  provider?: {
    user_id: string;
    full_name: string | null;
    organization: string | null;
    phone: string | null;
    photo: string | null;
  };
}

const TYPE_ICONS: Record<string, string> = {
  hebergement: "🏕️", activite: "🧗", circuit: "🗺️",
  restauration: "🍽️", artisanat: "🪴", location_materiel: "🎒",
  volontariat: "🌱", bien_etre: "🧘", transport: "🚌",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: "En attente de confirmation",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <Clock size={18} className="text-amber-500" />,
  },
  confirmed: {
    label: "Réservation confirmée",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle size={18} className="text-emerald-500" />,
  },
  rejected: {
    label: "Réservation refusée",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <XCircle size={18} className="text-red-500" />,
  },
  cancelled: {
    label: "Réservation annulée",
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    icon: <XCircle size={18} className="text-slate-400" />,
  },
  completed: {
    label: "Expérience terminée",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <Star size={18} className="text-blue-500" />,
  },
};

const MEMBER_STATUS: Record<string, string> = {
  pending: "En attente",
  accepted: "Accepté",
  declined: "Décliné",
};

function QrCodeDisplay({ value }: { value: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`;
    setQrUrl(url);
  }, [value]);

  if (!qrUrl) return <div className="w-40 h-40 bg-slate-100 animate-pulse rounded-xl" />;

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={qrUrl} alt="QR Code réservation" className="w-40 h-40 rounded-xl border border-slate-200 shadow-sm" />
      <a href={qrUrl} download={`reservation-${value}.png`} target="_blank" rel="noreferrer"
        className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold hover:underline">
        <Download size={12} /> Télécharger le QR
      </a>
    </div>
  );
}

export default function ReservationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiFetch<Reservation>(`/reservations/${id}`)
      .then(setReservation)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;
    setCancelling(true);
    try {
      await apiFetch(`/reservations/${id}/cancel`, { method: "PATCH" });
      setCancelled(true);
      setReservation((r) => r ? { ...r, status: "cancelled" } : r);
    } catch {} finally { setCancelling(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
        <AlertCircle size={40} className="opacity-30" />
        <p>Réservation introuvable</p>
        <button onClick={() => router.push("/reservations")} className="text-emerald-600 text-sm hover:underline">
          Mes réservations
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.pending;
  const remainingAmount = reservation.total_price !== null && reservation.deposit_amount
    ? Number(reservation.total_price) - Number(reservation.deposit_amount)
    : null;
  const canCancel = reservation.status === "pending";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/ecovoyageur/reservations")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-800 flex-1">Détail de la réservation</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Statut */}
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${status.bg}`}>
          {status.icon}
          <div>
            <p className={`font-bold text-sm ${status.color}`}>{status.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Réservé le {new Date(reservation.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {(reservation.status === "cancelled" || reservation.status === "rejected") &&
          reservation.cancellation_reason && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold text-xs uppercase tracking-wide text-amber-700 mb-1">Motif</p>
            <p>{reservation.cancellation_reason}</p>
          </div>
        )}

        {/* Offre ou circuit */}
        {(reservation.offer || reservation.circuit) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-emerald-100 to-teal-200 relative">
            {reservation.offer?.images?.[0] ? (
              <img src={reservation.offer.images[0]} alt="" className="w-full h-full object-cover" />
            ) : reservation.circuit?.cover_image ? (
              <img src={reservation.circuit.cover_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl">
                {reservation.circuit ? "🗺️" : TYPE_ICONS[reservation.offer?.offer_type ?? ""] ?? "🌿"}
              </div>
            )}
          </div>
          <div className="p-4">
            {reservation.offer ? (
              <button onClick={() => router.push(`/offers/${reservation.offer!.id}`)}
                className="font-bold text-slate-800 text-lg hover:text-emerald-600 transition-colors text-left">
                {reservation.offer.title}
              </button>
            ) : (
              <p className="font-bold text-slate-800 text-lg">{reservation.circuit!.title}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
              {reservation.offer?.region && (
                <span className="flex items-center gap-1"><MapPin size={10} /> {reservation.offer.region}</span>
              )}
              {reservation.offer?.duration && (
                <span className="flex items-center gap-1"><Clock size={10} /> {reservation.offer.duration}</span>
              )}
              {reservation.circuit?.nb_jours && (
                <span className="flex items-center gap-1"><Clock size={10} /> {reservation.circuit.nb_jours} jour{reservation.circuit.nb_jours > 1 ? "s" : ""}</span>
              )}
            </div>
          </div>
        </div>
        )}

        {reservation.chosen_subtypes && reservation.chosen_subtypes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Package size={16} className="text-emerald-500" /> Formule
            </h3>
            <p className="text-sm font-medium text-slate-700">
              {reservation.chosen_subtypes.map((k) =>
                reservation.circuit
                  ? k.replace(/^etape:/, "").replace(/^hebergement:/, "Hébergement — ").replace(/_/g, " ")
                  : formatSubtypeLabel(k),
              ).join(", ")}
            </p>
          </div>
        )}

        {/* Détails créneau */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-emerald-500" /> Créneau
          </h3>
          <div className="space-y-2 text-sm">
            {reservation.session ? (
              <>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-800">
                    {new Date(reservation.session.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
                {reservation.session.start_time && (
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Horaire</span>
                    <span className="font-medium text-slate-800">
                      {reservation.session.start_time}{reservation.session.end_time ? ` → ${reservation.session.end_time}` : ""}
                    </span>
                  </div>
                )}
              </>
            ) : reservation.reservation_date ? (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Date souhaitée</span>
                <span className="font-medium text-slate-800">
                  {new Date(reservation.reservation_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Date à confirmer avec le prestataire</p>
            )}
            {reservation.offer?.meeting_point && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Point de rendez-vous</span>
                <span className="font-medium text-slate-800 text-right max-w-52">{reservation.offer.meeting_point}</span>
              </div>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Users size={16} className="text-emerald-500" /> Participants
          </h3>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <User size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Vous (organisateur)</p>
              <p className="text-xs text-slate-400">Réservation {reservation.reservation_type === "group" ? "de groupe" : "solo"}</p>
            </div>
          </div>
          {reservation.invited_members && reservation.invited_members.length > 0 && (
            <div className="space-y-2">
              {reservation.invited_members.map((m) => (
                <div key={m.user_id ?? m.full_name} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-emerald-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{m.full_name}</p>
                    {m.share_amount !== null && (
                      <p className="text-xs text-slate-400">Part : {Number(m.share_amount).toFixed(0)} TND</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${m.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                      m.status === "declined" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>
                    {MEMBER_STATUS[m.status] ?? m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">{reservation.participant_count} participant{reservation.participant_count > 1 ? "s" : ""} au total</p>
        </div>

        {/* Paiement */}
        {reservation.total_price !== null && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-500" /> Paiement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Total</span>
                <span className="font-bold text-slate-800 text-base">{Number(reservation.total_price).toFixed(0)} TND</span>
              </div>
              {(reservation.share_amount != null || (reservation.participant_count > 1 && reservation.total_price != null)) && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Part par personne</span>
                  <span className="font-semibold text-emerald-700">
                    {Number(
                      reservation.share_amount ??
                        Number(reservation.total_price) / reservation.participant_count,
                    ).toFixed(0)}{" "}
                    TND
                  </span>
                </div>
              )}
              {reservation.deposit_amount !== null && Number(reservation.deposit_amount) > 0 && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Acompte</span>
                    <span className={`font-semibold ${reservation.deposit_paid ? "text-emerald-600" : "text-amber-600"}`}>
                      {Number(reservation.deposit_amount).toFixed(0)} TND
                      {reservation.deposit_paid ? " ✓ payé" : " (à payer)"}
                    </span>
                  </div>
                  {remainingAmount !== null && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Reste à payer</span>
                      <span className="font-semibold text-slate-700">{remainingAmount.toFixed(0)} TND</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {reservation.payment_status && (
              <div className={`mt-3 rounded-xl p-2.5 text-xs font-medium text-center
                ${reservation.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {reservation.payment_status === "paid" ? "Paiement complet ✓" : "Paiement en attente"}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {reservation.notes && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <p className="text-xs font-bold text-blue-800 mb-1">Vos notes</p>
            <p className="text-sm text-blue-700">{reservation.notes}</p>
          </div>
        )}

        {/* Prestataire contact */}
        {reservation.provider && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Contact prestataire</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-xl">
                {reservation.provider.photo
                  ? <img src={reservation.provider.photo} alt="" className="w-full h-full object-cover" />
                  : "🌿"}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{reservation.provider.full_name ?? reservation.provider.organization}</p>
                {reservation.provider.phone && (
                  <a href={`tel:${reservation.provider.phone}`}
                    className="flex items-center gap-1 text-xs text-emerald-600 mt-0.5 hover:underline">
                    <Phone size={11} /> {reservation.provider.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR Code (seulement si confirmé) */}
        {reservation.status === "confirmed" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-3">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 self-start">
              <QrCode size={16} className="text-emerald-500" /> QR Code de confirmation
            </h3>
            <QrCodeDisplay value={`eco-voyage-reservation:${reservation.id}`} />
            <p className="text-xs text-slate-400 text-center">Présentez ce QR code au prestataire le jour J</p>
          </div>
        )}

        {/* Annulation */}
        {canCancel && (
          <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
            <p className="text-sm font-bold text-red-800 mb-2">Annuler la réservation</p>
            <p className="text-xs text-red-600 mb-3">
              Vous pouvez annuler uniquement tant que la réservation n&apos;est pas encore confirmée.
            </p>
            <button onClick={handleCancel} disabled={cancelling || cancelled}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-200 disabled:opacity-50">
              <XCircle size={14} /> {cancelling ? "Annulation..." : cancelled ? "Annulée" : "Annuler ma réservation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
