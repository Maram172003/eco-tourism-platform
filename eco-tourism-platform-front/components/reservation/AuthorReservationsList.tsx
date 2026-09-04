"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getConsistentSession } from "@/lib/auth";
import {
  ArrowLeft, Calendar, Clock, MapPin, ChevronRight, CheckCircle,
  XCircle, Users, User, Leaf, PackageSearch,
} from "lucide-react";

type Role = "guide" | "provider";

interface ReservationRow {
  id: string;
  status: string;
  reservation_type: string;
  participant_count: number;
  total_price: number | null;
  reservation_date: string | null;
  created_at: string;
  notes: string | null;
  can_confirm?: boolean;
  availability?: {
    spots_total: number | null;
    spots_taken: number;
    spots_available: number;
    max_group_size: number | null;
  } | null;
  offer?: {
    id: string;
    title: string;
    offer_type: string | null;
    region: string | null;
    images: string[] | null;
    capacity?: number | null;
  } | null;
  circuit?: {
    id: string;
    title: string;
    cover_image?: string | null;
    nb_jours?: number;
  } | null;
  session: { date: string; start_time: string | null } | null;
  traveler?: {
    user_id: string;
    full_name: string | null;
    photo: string | null;
  } | null;
}

const STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: "En attente",
    color: "text-amber-700",
    bg: "bg-amber-50",
    icon: <Clock size={13} className="text-amber-500" />,
  },
  confirmed: {
    label: "Confirmée",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    icon: <CheckCircle size={13} className="text-emerald-500" />,
  },
  rejected: {
    label: "Refusée",
    color: "text-red-700",
    bg: "bg-red-50",
    icon: <XCircle size={13} className="text-red-500" />,
  },
  cancelled: {
    label: "Annulée",
    color: "text-slate-500",
    bg: "bg-slate-50",
    icon: <XCircle size={13} className="text-slate-400" />,
  },
  completed: {
    label: "Terminée",
    color: "text-blue-700",
    bg: "bg-blue-50",
    icon: <CheckCircle size={13} className="text-blue-700" />,
  },
};

const FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "Demandes" },
  { value: "confirmed", label: "Confirmées" },
  { value: "rejected", label: "Refusées" },
  { value: "cancelled", label: "Annulées" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export default function AuthorReservationsList({ role }: { role: Role }) {
  const router = useRouter();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const dashboard = role === "guide" ? "/dashboard/guide" : "/dashboard/provider";
  const detailBase =
    role === "guide"
      ? "/dashboard/guide/reservations"
      : "/dashboard/provider/reservations";

  useEffect(() => {
    const session = getConsistentSession();
    if (!session || session.role !== role) {
      router.replace("/auth/login");
      return;
    }
    apiFetch<ReservationRow[]>("/reservations/provider/received")
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [role, router]);

  const filtered = rows.filter((r) => (filter === "all" ? true : r.status === filter));
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barre supérieure — identique au profil et aux écrans voyageur. */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(dashboard)}
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

      {/* Titre dans le flux de la page, comme côté voyageur. */}
      <div className="max-w-3xl mx-auto w-full px-6 pt-7">
        <h1 className="text-2xl font-extrabold text-slate-800">Demandes de réservation</h1>
        <p className="text-sm text-slate-500 font-medium mt-0.5">
          {pendingCount} demande{pendingCount !== 1 ? "s" : ""} en attente
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {FILTERS.map((f) => {
            const count = f.value === "all" ? rows.length : rows.filter((r) => r.status === f.value).length;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  active
                    ? "bg-primary text-slate-900"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/30 text-slate-900" : "bg-white text-slate-600"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <PackageSearch size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-slate-800">Aucune réservation</p>
            <p className="text-sm mt-1">Les demandes des voyageurs apparaîtront ici.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const st = STATUS[r.status] ?? STATUS.pending;
              const dateStr = r.session?.date ?? r.reservation_date;
              return (
                <button
                  key={r.id}
                  onClick={() => router.push(`${detailBase}/${r.id}`)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-emerald-50 overflow-hidden flex items-center justify-center shrink-0">
                      {r.offer?.images?.[0] || r.circuit?.cover_image ? (
                        <img src={(r.offer?.images?.[0] ?? r.circuit?.cover_image)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Leaf size={20} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-slate-800 text-sm line-clamp-1">{r.offer?.title ?? r.circuit?.title}</p>
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.bg} ${st.color}`}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                        {r.traveler?.full_name && (
                          <span className="flex items-center gap-1">
                            <User size={11} /> {r.traveler.full_name}
                          </span>
                        )}
                        {dateStr && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(`${String(dateStr).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {r.reservation_type === "solo" ? <User size={11} /> : <Users size={11} />}
                          {r.participant_count} pers.
                        </span>
                        {r.offer?.region && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {r.offer.region}
                          </span>
                        )}
                      </div>
                      {r.total_price != null && (
                        <p className="text-sm font-extrabold text-emerald-700 mt-1">
                          {Number(r.total_price).toFixed(0)} TND
                        </p>
                      )}
                      {r.status === "pending" && r.availability && r.availability.spots_total != null && (
                        <p className={`text-[11px] font-semibold mt-1 ${
                          r.can_confirm === false ? "text-red-600" : "text-slate-400"
                        }`}>
                          {r.availability.spots_available} place{r.availability.spots_available !== 1 ? "s" : ""} dispo
                          {r.can_confirm === false ? " — trop de participants" : ""}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0 self-center" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
