"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  Calendar, Users, User, ChevronLeft, Leaf, MapPin, Clock,
  CheckCircle, XCircle, AlertCircle, Clock3, Plus, ArrowRight,
} from "lucide-react";

interface Offer {
  id: string;
  title: string;
  region: string | null;
  duration: string | null;
  images: string[] | null;
  price: number | null;
}

interface Reservation {
  id: string;
  offer_id: string;
  offer: Offer;
  organizer_id: string;
  reservation_type: string;
  status: string;
  reservation_date: string;
  participant_count: number;
  price_per_person: number | null;
  total_price: number | null;
  notes: string | null;
  participants: { id: string; user_id: string; status: string }[];
  created_at: string;
}

interface Invitation {
  id: string;
  reservation_id: string;
  status: string;
  invited_at: string;
  reservation: Reservation;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "En attente",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock3 size={12} />,
  },
  confirmed: {
    label: "Confirmée",
    color: "bg-secondary-container text-on-secondary-container",
    icon: <CheckCircle size={12} />,
  },
  cancelled: {
    label: "Annulée",
    color: "bg-red-100 text-red-600",
    icon: <XCircle size={12} />,
  },
  completed: {
    label: "Terminée",
    color: "bg-slate-100 text-slate-600",
    icon: <CheckCircle size={12} />,
  },
};

export default function ReservationsPage() {
  const router = useRouter();
  const [organized, setOrganized] = useState<Reservation[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"organized" | "invitations">("organized");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [mine, pending] = await Promise.all([
        apiFetch<{ organized: Reservation[]; invited: Invitation[] }>("/reservations/mine"),
        apiFetch<Invitation[]>("/reservations/invitations"),
      ]);
      setOrganized(mine.organized);
      setInvitations(pending);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Annuler cette réservation ?")) return;
    setCancelling(id);
    try {
      await apiFetch(`/reservations/${id}/cancel`, { method: "PATCH" });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'annulation.");
    } finally {
      setCancelling(null);
    }
  };

  const handleRespond = async (reservationId: string, status: "accepted" | "declined") => {
    setResponding(reservationId);
    try {
      await apiFetch(`/reservations/${reservationId}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Erreur.");
    } finally {
      setResponding(null);
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-surface-container-highest sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-outline hover:text-on-surface text-sm"
          >
            <ChevronLeft size={18} /> Retour
          </button>
          <h1 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
            <Calendar size={20} className="text-primary" />
            Mes réservations
          </h1>
          <button
            onClick={() => router.push("/destinations")}
            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-primary text-slate-900 rounded-xl font-extrabold hover:bg-primary/90"
          >
            <Plus size={14} /> Nouvelle
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Onglets */}
        <div className="flex rounded-2xl bg-white shadow-sm border border-slate-100 p-1 mb-6">
          <button
            onClick={() => setTab("organized")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === "organized"
                ? "bg-primary text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Mes réservations ({organized.length})
          </button>
          <button
            onClick={() => setTab("invitations")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all relative ${
              tab === "invitations"
                ? "bg-primary text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Invitations
            {pendingInvitations.length > 0 && (
              <span className="absolute top-1 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {pendingInvitations.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : tab === "organized" ? (
          <div className="space-y-4">
            {organized.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucune réservation</p>
                <p className="text-sm mt-1">Explorez le catalogue pour réserver une expérience</p>
                <button
                  onClick={() => router.push("/destinations")}
                  className="mt-4 px-4 py-2 bg-primary text-slate-900 rounded-xl text-sm font-semibold flex items-center gap-2 mx-auto"
                >
                  <Leaf size={15} /> Voir les destinations
                </button>
              </div>
            ) : (
              organized.map((r) => (
                <ReservationCard
                  key={r.id}
                  reservation={r}
                  isOrganizer
                  onCancel={() => handleCancel(r.id)}
                  cancelling={cancelling === r.id}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucune invitation</p>
              </div>
            ) : (
              invitations.map((inv) => (
                <InvitationCard
                  key={inv.id}
                  invitation={inv}
                  onRespond={handleRespond}
                  responding={responding === inv.reservation_id}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReservationCard({
  reservation: r,
  isOrganizer,
  onCancel,
  cancelling,
}: {
  reservation: Reservation;
  isOrganizer: boolean;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const router = useRouter();
  const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
  const date = new Date(r.reservation_date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => router.push(`/dashboard/ecovoyageur/reservations/${r.id}`)}>

      <div className="flex gap-4 p-4">
        <div className="w-16 h-16 rounded-xl bg-primary/15 flex-shrink-0 overflow-hidden">
          {r.offer?.images?.[0] ? (
            <img src={r.offer.images[0]} alt={r.offer.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Leaf size={20} className="text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{r.offer?.title}</h3>
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusCfg.color}`}>
              {statusCfg.icon} {statusCfg.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
            <span className="flex items-center gap-1"><Calendar size={11} />{date}</span>
            <span className="flex items-center gap-1">
              {r.reservation_type === "solo" ? <User size={11} /> : <Users size={11} />}
              {r.participant_count} personne{r.participant_count > 1 ? "s" : ""}
            </span>
            {r.offer?.region && <span className="flex items-center gap-1"><MapPin size={11} />{r.offer.region}</span>}
          </div>
          {r.total_price !== null && (
            <p className="text-secondary font-bold text-sm">
              {Number(r.total_price).toFixed(0)} TND
              {r.participant_count > 1 && (
                <span className="text-slate-400 font-normal text-xs ml-1">
                  ({Number(r.price_per_person).toFixed(0)} TND/pers.)
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Participants (groupe) */}
      {r.reservation_type === "group" && r.participants?.length > 0 && (
        <div className="px-4 pb-3 border-t border-slate-50 pt-3">
          <p className="text-xs text-slate-500 font-medium mb-2">Statut des invités</p>
          <div className="flex flex-wrap gap-2">
            {r.participants.map((p) => (
              <span
                key={p.id}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  p.status === "accepted"
                    ? "bg-primary/15 text-secondary"
                    : p.status === "declined"
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {p.status === "accepted" ? "✓ Accepté" : p.status === "declined" ? "✗ Refusé" : "⏳ En attente"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action annuler */}
      {isOrganizer && !["cancelled", "completed"].includes(r.status) && (
        <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
          >
            {cancelling ? "Annulation…" : "Annuler la réservation"}
          </button>
        </div>
      )}
    </div>
  );
}

function InvitationCard({
  invitation: inv,
  onRespond,
  responding,
}: {
  invitation: Invitation;
  onRespond: (id: string, status: "accepted" | "declined") => void;
  responding: boolean;
}) {
  const r = inv.reservation;
  const date = new Date(r.reservation_date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex gap-4 mb-3">
        <div className="w-14 h-14 rounded-xl bg-primary/15 flex-shrink-0 overflow-hidden">
          {r.offer?.images?.[0] ? (
            <img src={r.offer.images[0]} alt={r.offer.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Leaf size={18} className="text-primary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{r.offer?.title}</h3>
            {inv.status !== "pending" && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                inv.status === "accepted" ? "bg-primary/15 text-secondary" : "bg-red-100 text-red-600"
              }`}>
                {inv.status === "accepted" ? "Acceptée" : "Refusée"}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar size={11} />{date}</span>
            <span className="flex items-center gap-1"><Users size={11} />{r.participant_count} personnes</span>
          </div>
          {r.price_per_person !== null && (
            <p className="text-secondary font-semibold text-sm mt-1">
              {Number(r.price_per_person).toFixed(0)} TND <span className="text-slate-400 font-normal text-xs">/ votre part</span>
            </p>
          )}
        </div>
      </div>

      {inv.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(inv.reservation_id, "declined")}
            disabled={responding}
            className="flex-1 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
          >
            Refuser
          </button>
          <button
            onClick={() => onRespond(inv.reservation_id, "accepted")}
            disabled={responding}
            className="flex-1 py-2 rounded-xl bg-primary text-slate-900 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {responding ? "…" : "Accepter"}
          </button>
        </div>
      )}
    </div>
  );
}
