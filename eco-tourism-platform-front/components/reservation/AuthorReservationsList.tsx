"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getConsistentSession } from "@/lib/auth";
import {
  Calendar, Clock, MapPin, ChevronLeft, ChevronRight, CheckCircle,
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
  offer: {
    id: string;
    title: string;
    offer_type: string | null;
    region: string | null;
    images: string[] | null;
    capacity?: number | null;
  };
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
    color: "text-secondary",
    bg: "bg-primary/10",
    icon: <CheckCircle size={13} className="text-primary" />,
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
    color: "text-tertiary",
    bg: "bg-tertiary-container/40",
    icon: <CheckCircle size={13} className="text-tertiary" />,
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
    <div className="min-h-screen bg-background">
      <div className="bg-surface border-b border-surface-container-highest sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push(dashboard)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container text-outline"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold text-on-surface flex items-center gap-2">
              <Calendar size={20} className="text-primary" />
              Demandes de réservation
            </h1>
            <p className="text-xs text-outline">
              {pendingCount} demande{pendingCount !== 1 ? "s" : ""} en attente
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const count = f.value === "all" ? rows.length : rows.filter((r) => r.status === f.value).length;
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-primary text-slate-900"
                    : "bg-surface border border-surface-container-highest text-outline hover:border-primary/40"
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-outline">
            <PackageSearch size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-on-surface">Aucune réservation</p>
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
                  className="w-full text-left bg-surface rounded-2xl border border-surface-container-highest p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  <div className="flex gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                      {r.offer?.images?.[0] ? (
                        <img src={r.offer.images[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Leaf size={20} className="text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-on-surface text-sm line-clamp-1">{r.offer?.title}</p>
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${st.bg} ${st.color}`}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-outline">
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
                        <p className="text-sm font-extrabold text-secondary mt-1">
                          {Number(r.total_price).toFixed(0)} TND
                        </p>
                      )}
                      {r.status === "pending" && r.availability && r.availability.spots_total != null && (
                        <p className={`text-[11px] font-semibold mt-1 ${
                          r.can_confirm === false ? "text-red-600" : "text-outline"
                        }`}>
                          {r.availability.spots_available} place{r.availability.spots_available !== 1 ? "s" : ""} dispo
                          {r.can_confirm === false ? " — trop de participants" : ""}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={18} className="text-outline shrink-0 self-center" />
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
