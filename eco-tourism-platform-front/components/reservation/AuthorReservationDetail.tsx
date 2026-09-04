"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getConsistentSession } from "@/lib/auth";
import {
  ArrowLeft, Leaf, Calendar, Users, MapPin, Clock, CreditCard,
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
  /** Vrai quand on consulte en tant que collaborateur : la décision revient
      à l'auteur de l'offre, pas à nous. */
  as_collaborator?: boolean;
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
    images?: string[] | null;
    meeting_point?: string | null;
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
  confirmed: { label: "Confirmée",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  rejected:  { label: "Refusée",   color: "text-red-700", bg: "bg-red-50 border-red-200" },
  cancelled: { label: "Annulée",   color: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
  completed: { label: "Terminée",  color: "text-blue-700", bg: "bg-blue-50 border-blue-100" },
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
        <AlertCircle size={40} className="opacity-30" />
        <p>Réservation introuvable</p>
        <button onClick={() => router.push(listHref)} className="text-emerald-700 text-sm font-semibold hover:underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_LABELS[reservation.status] ?? STATUS_LABELS.pending;
  // Un collaborateur consulte, il ne tranche pas — le serveur le refuserait
  // de toute façon, autant ne pas lui proposer les boutons.
  const canAct = reservation.status === "pending" && !reservation.as_collaborator;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Même repère que sur le profil : retour à gauche, identité de la
          plateforme à droite, et le titre dans le flux de la page. */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(listHref)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all"
          >
            <ArrowLeft size={16} />Retour
          </button>
          <div className="flex items-center gap-2 text-slate-900">
            <Leaf className="text-primary w-6 h-6" />
            <span className="text-base font-extrabold tracking-tight">Éco-Voyage</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-7">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Calendar size={22} className="text-emerald-500" />
          Demande de réservation
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${statusCfg.bg}`}>
          {reservation.status === "confirmed" ? <CheckCircle size={18} className="text-emerald-500" />
            : reservation.status === "rejected" ? <XCircle size={18} className="text-red-500" />
            : <Clock size={18} className="text-amber-500" />}
          <div>
            <p className={`font-bold text-sm ${statusCfg.color}`}>{statusCfg.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Reçue le {new Date(reservation.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Vignette réelle plutôt qu'une icône générique : le prestataire
            reconnaît sa prestation d'un coup d'œil, comme dans la liste. */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex items-stretch">
          <div className="w-24 h-24 flex-shrink-0 bg-slate-100 flex items-center justify-center text-3xl overflow-hidden">
            {reservation.offer.images?.[0]
              ? <img src={reservation.offer.images[0]} alt="" className="w-full h-full object-cover" />
              : <span>{TYPE_ICONS[reservation.offer.offer_type ?? ""] ?? "🌿"}</span>}
          </div>
          <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-center">
            <p className="font-bold text-slate-800 leading-tight">{reservation.offer.title}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
              {reservation.offer.region && <span className="flex items-center gap-1"><MapPin size={10} />{reservation.offer.region}</span>}
              {reservation.offer.duration && <span className="flex items-center gap-1"><Clock size={10} />{reservation.offer.duration}</span>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-emerald-500" /> Créneau demandé
          </h3>
          {reservation.session ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-800">
                {new Date(`${reservation.session.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              {reservation.session.start_time && (
                <p className="text-slate-400">
                  {reservation.session.start_time}{reservation.session.end_time ? ` → ${reservation.session.end_time}` : ""}
                </p>
              )}
            </div>
          ) : reservation.reservation_date ? (
            <p className="text-sm font-semibold text-slate-800">
              {new Date(`${String(reservation.reservation_date).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          ) : (
            <p className="text-slate-400 text-sm">Date à convenir</p>
          )}
          {reservation.availability && reservation.availability.spots_total != null && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 text-sm">
              <Users size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-slate-500">
                <span className={`font-extrabold ${reservation.availability.spots_available > 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {reservation.availability.spots_available} place{reservation.availability.spots_available > 1 ? "s" : ""} restante{reservation.availability.spots_available > 1 ? "s" : ""}
                </span>
                {" "}sur {reservation.availability.spots_total} ce jour-là
                {reservation.availability.spots_taken > 0 && (
                  <span className="text-slate-400">
                    {" "}· {reservation.availability.spots_taken} déjà confirmée{reservation.availability.spots_taken > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {reservation.traveler && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <User size={16} className="text-emerald-500" /> Voyageur organisateur
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {reservation.traveler.photo
                  ? <img src={reservation.traveler.photo} alt="" className="w-full h-full object-cover" />
                  : <User size={20} className="text-emerald-500" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{reservation.traveler.full_name ?? "—"}</p>
                {reservation.traveler.phone && (
                  <a href={`tel:${reservation.traveler.phone}`}
                    className="flex items-center gap-1 text-xs text-emerald-700 mt-0.5 hover:underline">
                    <Phone size={11} /> {reservation.traveler.phone}
                  </a>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Participants</p>
                <p className="font-bold text-slate-800 text-lg leading-tight">
                  {reservation.participant_count}
                </p>
                <p className="text-[11px] text-slate-400">
                  {reservation.participant_count > 1 ? "personnes au total" : "personne"}
                </p>
              </div>
            </div>

            {/* Le serveur ne transmet que les membres ayant accepté : ceux qui
                ont décliné ne viendront pas, et le prestataire n'a pas à
                connaître les hésitations du groupe. */}
            {reservation.invited_members && reservation.invited_members.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 font-medium mb-2">
                  Accompagnants ({reservation.invited_members.length})
                </p>
                <div className="space-y-2">
                  {reservation.invited_members.map((m, idx) => (
                    <div key={m.user_id ?? `m-${idx}`} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : <User size={12} className="text-emerald-500" />}
                      </div>
                      <span className="text-sm text-slate-800 flex-1">{m.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {reservation.notes && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
              <MessageSquare size={12} /> Notes du voyageur
            </p>
            <p className="text-sm text-slate-800">{reservation.notes}</p>
          </div>
        )}

        {reservation.total_price !== null && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <CreditCard size={16} className="text-emerald-500" /> Paiement
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-400">Total</span>
                <span className="font-bold text-slate-800 text-base">{Number(reservation.total_price).toFixed(0)} TND</span>
              </div>
              {reservation.deposit_amount !== null && Number(reservation.deposit_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Acompte</span>
                  <span className={`font-semibold ${reservation.deposit_paid ? "text-emerald-700" : "text-amber-600"}`}>
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

        {reservation.as_collaborator && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            Vous collaborez sur cette offre. Son auteur décide d&apos;accepter ou de refuser
            la demande ; vous êtes informé pour pouvoir vous organiser.
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
                    className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
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
            <p className="text-[11px] text-slate-400 text-center">
              Le voyageur recevra une notification et un email de confirmation ou d&apos;annulation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
