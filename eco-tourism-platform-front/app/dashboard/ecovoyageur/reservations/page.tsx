"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { monTableauDeBord } from "@/lib/dashboard-path";
import {
  ArrowLeft, Calendar, Clock, MapPin, ChevronRight, CheckCircle,
  XCircle, AlertCircle, Star, Leaf, PackageSearch,
} from "lucide-react";

interface ReservationSummary {
  id: string;
  status: string;
  reservation_type: string;
  participant_count: number;
  total_price: number | null;
  reservation_date: string | null;
  created_at: string;
  /** Vrai tant qu'un invité n'a pas répondu : rien n'est encore parti au prestataire. */
  awaiting_group?: boolean;
  _role?: "organizer" | "invited";
  /** Réponse de l'invité à sa propre invitation — absente pour l'organisateur. */
  _myStatus?: string;
  offer?: {
    id: string;
    title: string;
    offer_type: string | null;
    region: string | null;
    images: string[] | null;
  } | null;
  circuit?: {
    id: string;
    title: string;
    cover_image?: string | null;
    nb_jours?: number;
  } | null;
  session: {
    id: string;
    date: string;
    start_time: string | null;
  } | null;
}

interface MineResponse {
  organized: ReservationSummary[];
  invited: { id: string; status: string; reservation: ReservationSummary }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  pending: {
    label: "En attente",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-400",
    icon: <Clock size={13} className="text-amber-500" />,
  },
  confirmed: {
    label: "Confirmée",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-400",
    icon: <CheckCircle size={13} className="text-emerald-500" />,
  },
  rejected: {
    label: "Refusée",
    color: "text-red-700",
    bg: "bg-red-50",
    dot: "bg-red-400",
    icon: <XCircle size={13} className="text-red-500" />,
  },
  cancelled: {
    label: "Annulée",
    color: "text-slate-500",
    bg: "bg-slate-50",
    dot: "bg-slate-300",
    icon: <XCircle size={13} className="text-slate-400" />,
  },
  completed: {
    label: "Terminée",
    color: "text-blue-700",
    bg: "bg-blue-50",
    dot: "bg-blue-400",
    icon: <Star size={13} className="text-blue-500" />,
  },
  awaiting_group: {
    label: "En attente de vos invités",
    color: "text-violet-700",
    bg: "bg-violet-50",
    dot: "bg-violet-400",
    icon: <Clock size={13} className="text-violet-500" />,
  },
  invitation: {
    label: "Invitation à répondre",
    color: "text-violet-700",
    bg: "bg-violet-50",
    dot: "bg-violet-400",
    icon: <AlertCircle size={13} className="text-violet-500" />,
  },
  declined: {
    label: "Vous avez refusé",
    color: "text-slate-500",
    bg: "bg-slate-50",
    dot: "bg-slate-300",
    icon: <XCircle size={13} className="text-slate-400" />,
  },
};

/**
 * Ce qu'une ligne annonce à celui qui la lit.
 *
 * L'organisateur voit l'état de sa réservation. Un invité voit d'abord sa
 * propre réponse : tant qu'il n'a pas répondu, ou s'il a refusé, l'état de la
 * réservation ne le concerne plus — il affichait « En attente » alors que
 * l'attente ne portait plus sur lui.
 */
function statutAffiche(res: ReservationSummary): string {
  if (res._role !== "invited" || !res._myStatus) {
    // Pour l'organisateur, « En attente » sans plus de précision laissait
    // croire que le prestataire tardait, alors que ce sont ses propres invités
    // qui n'ont pas encore répondu — et que rien ne lui est encore parti.
    if (res.status === "pending" && res.awaiting_group) return "awaiting_group";
    return res.status;
  }
  if (res._myStatus === "pending") return "invitation";
  if (res._myStatus === "declined") return "declined";
  return res.status;
}

/** L'onglet sous lequel ranger une ligne, pour qu'aucune ne devienne introuvable. */
function ongletDe(res: ReservationSummary): string {
  const statut = statutAffiche(res);
  if (statut === "invitation" || statut === "awaiting_group") return "pending";
  if (statut === "declined") return "cancelled";
  return statut;
}

const TYPE_EMOJI: Record<string, string> = {
  hebergement: "🏕️", activite: "🧗", circuit: "🗺️",
  restauration: "🍽️", artisanat: "🪴", location_materiel: "🎒",
  volontariat: "🌱", bien_etre: "🧘", transport: "🚌",
};

const FILTER_TABS = [
  { value: "all",       label: "Toutes" },
  { value: "pending",   label: "En attente" },
  { value: "confirmed", label: "Confirmées" },
  { value: "completed", label: "Terminées" },
  { value: "cancelled", label: "Annulées" },
] as const;

type FilterValue = typeof FILTER_TABS[number]["value"];

export default function ReservationsListPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/auth/login"); return; }

    apiFetch<MineResponse>("/reservations/mine")
      .then((data) => {
        const organized = (data.organized ?? []).map((r) => ({ ...r, _role: "organizer" as const }));
        const invited = (data.invited ?? [])
          .filter((p) => p.reservation)
          .map((p) => ({ ...p.reservation, _role: "invited" as const, _myStatus: p.status }));
        const all = [...organized, ...invited].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReservations(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = reservations.filter((r) =>
    filter === "all" ? true : ongletDe(r) === filter
  );

  const counts: Record<string, number> = {};
  for (const r of reservations) {
    const onglet = ongletDe(r);
    counts[onglet] = (counts[onglet] ?? 0) + 1;
  }

  function formatDate(res: ReservationSummary): string {
    const dateStr = res.session?.date ?? res.reservation_date;
    if (!dateStr) return "Date à confirmer";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barre supérieure — identique à celle du profil. */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(monTableauDeBord())}
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

      {/* Titre et filtres — dans le flux, pas dans la barre collante. */}
      <div className="max-w-3xl mx-auto w-full px-6 pt-7">
        <h1 className="text-2xl font-extrabold text-slate-800">Mes réservations</h1>
        {!loading && (
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {reservations.length} réservation{reservations.length !== 1 ? "s" : ""} au total
          </p>
        )}

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5 mt-5">
          {FILTER_TABS.map(({ value, label }) => {
            const count = value === "all" ? reservations.length : (counts[value] ?? 0);
            return (
              <button key={value} onClick={() => setFilter(value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  filter === value
                    ? "bg-primary text-slate-900"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}>
                {label}
                {count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    filter === value ? "bg-white/30 text-slate-900" : "bg-white text-slate-600"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-6 py-5 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                <div className="h-3 bg-slate-100 rounded-lg w-2/3" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <PackageSearch size={48} className="text-slate-200 mb-4" />
            <p className="font-bold text-slate-400">Aucune réservation</p>
            <p className="text-sm text-slate-300 mt-1">
              {filter === "all"
                ? "Explorez des offres éco-touristiques et faites votre première réservation."
                : `Aucune réservation avec le statut « ${FILTER_TABS.find((t) => t.value === filter)?.label} ».`}
            </p>
            {filter === "all" && (
              <button onClick={() => router.push("/catalogue")}
                className="mt-5 px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors">
                Voir le catalogue
              </button>
            )}
          </div>
        ) : (
          filtered.map((res) => {
            const st = STATUS_CONFIG[statutAffiche(res)] ?? STATUS_CONFIG.pending;
            const img = res.offer?.images?.[0] ?? res.circuit?.cover_image;
            const emoji = res.circuit ? "🗺️" : TYPE_EMOJI[res.offer?.offer_type ?? ""] ?? "🌿";
            const title = res.offer?.title ?? res.circuit?.title ?? "Réservation";
            return (
              <button key={res.id} onClick={() => router.push(`/dashboard/ecovoyageur/reservations/${res.id}`)}
                className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-left group">
                <div className="flex items-stretch overflow-hidden rounded-2xl">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 flex-shrink-0 bg-slate-100 flex items-center justify-center text-3xl overflow-hidden">
                    {img
                      ? <img src={img} alt="" className="w-full h-full object-cover" />
                      : <span>{emoji}</span>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                          {title}
                        </p>
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary flex-shrink-0 mt-0.5 transition-colors" />
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                        {res.offer?.region && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> {res.offer.region}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(res)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${st.bg} ${st.color}`}>
                          {st.icon}
                          {st.label}
                        </span>
                        {/* Le badge principal dit déjà « invitation » ou « refusé » :
                            on ne rappelle le rôle que lorsqu'il l'a acceptée. */}
                        {res._role === "invited" && res._myStatus === "accepted" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-50 text-violet-700">Invité</span>
                        )}
                      </div>
                      {res.total_price !== null && (
                        <span className="text-xs font-bold text-slate-600">
                          {Number(res.total_price).toFixed(0)} TND
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
