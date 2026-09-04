"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, CalendarDays, Users, MapPin, User } from "lucide-react";
import { apiFetch } from "@/lib/api";

/**
 * Bloc « réservations » des tableaux de bord.
 *
 * Chaque rôle avait sa propre version : le prestataire une vraie liste, le
 * guide rien du tout, l'éco-voyageur trois voyages écrits en dur dans le code.
 * Tout part désormais d'ici, et des mêmes routes que les écrans dédiés — un
 * compteur ne peut plus annoncer zéro pendant qu'une demande attend une
 * réponse deux clics plus loin.
 */

export type ReservationDashboard = {
  id: string;
  status: string;
  reservation_type: string;
  participant_count: number;
  total_price: number | null;
  reservation_date: string | null;
  created_at: string;
  awaiting_group?: boolean;
  offer?: { id: string; title: string; images?: string[] | null; region?: string | null; meeting_point?: string | null } | null;
  /** Ce que doit celui qui regarde. */
  share_amount?: number | null;
  payment_split?: string | null;
  provider?: { full_name: string | null; photo: string | null } | null;
  circuit?: { id: string; title: string; cover_image?: string | null } | null;
  session?: { date: string } | null;
  /** Vrai quand la ligne vient d'une offre où l'on collabore : on la voit,
      on ne la tranche pas — l'auteur seul confirme. */
  as_collaborator?: boolean;
  traveler?: { full_name: string | null; photo: string | null } | null;
  invited_members?: { user_id: string | null; status: string }[];
};

const ETAT: Record<string, { label: string; cls: string }> = {
  pending:   { label: "En attente",  cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmée",   cls: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Refusée",     cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Annulée",     cls: "bg-slate-100 text-slate-600" },
  completed: { label: "Terminée",    cls: "bg-blue-100 text-blue-700" },
};

function vignette(r: ReservationDashboard): string | null {
  return r.offer?.images?.[0] ?? r.circuit?.cover_image ?? null;
}

function titre(r: ReservationDashboard): string {
  return r.offer?.title ?? r.circuit?.title ?? "Réservation";
}

/**
 * Où ça se passe. Le point de rendez-vous est une adresse complète, souvent
 * trop longue pour une ligne : on n'en garde que la ville quand la région
 * n'est pas renseignée.
 */
function ou(r: ReservationDashboard): string | null {
  const region = r.offer?.region?.trim();
  if (region) return region;
  const rdv = r.offer?.meeting_point?.trim();
  if (!rdv) return null;
  const morceaux = rdv.split(",").map((m) => m.trim()).filter(Boolean);
  return morceaux.length > 2 ? morceaux[morceaux.length - 3] : morceaux[0];
}

function quand(r: ReservationDashboard): string {
  const brut = r.session?.date ?? r.reservation_date;
  if (!brut) return "Date à confirmer";
  return new Date(`${String(brut).slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Côté prestataire et guide ───────────────────────────────────────────────

/** Les demandes reçues sur ses propres prestations. */
export function useDemandesRecues() {
  const [reservations, setReservations] = useState<ReservationDashboard[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    apiFetch<ReservationDashboard[]>("/reservations/provider/received")
      .then((r) => setReservations(Array.isArray(r) ? r : []))
      .catch(() => setReservations([]))
      .finally(() => setChargement(false));
  }, []);

  const repondre = useCallback(async (id: string, statut: "confirmed" | "rejected") => {
    await apiFetch(`/reservations/${id}/confirm`, {
      method: "PATCH",
      body: JSON.stringify({ status: statut }),
    });
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: statut } : r)));
  }, []);

  const enAttente = reservations.filter((r) => r.status === "pending").length;
  return { reservations, chargement, enAttente, repondre };
}

export function DemandesRecuesPanel({ role, reservations, onRepondre }: {
  role: "guide" | "provider";
  reservations: ReservationDashboard[];
  onRepondre: (id: string, statut: "confirmed" | "rejected") => Promise<void>;
}) {
  const router = useRouter();
  const base = role === "guide" ? "/dashboard/guide/reservations" : "/dashboard/provider/reservations";
  // Ce qui appelle une décision passe devant ; le reste suit.
  const triees = [...reservations].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Demandes de réservation</h3>
        <button onClick={() => router.push(base)} className="text-xs font-bold text-primary hover:underline">
          Voir tout
        </button>
      </div>

      {triees.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-8 text-center">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Aucune demande pour l&apos;instant</p>
          <p className="text-xs text-slate-400 mt-1">
            Les réservations sur vos prestations apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {triees.slice(0, 2).map((r) => {
            const etat =
              r.status === "confirmed" ? { label: "Confirmée", cls: "bg-emerald-100 text-emerald-700", barre: "bg-emerald-400" }
              : r.status === "pending" ? { label: "À traiter", cls: "bg-amber-100 text-amber-700", barre: "bg-amber-400" }
              : r.status === "rejected" ? { label: "Refusée", cls: "bg-red-100 text-red-700", barre: "bg-red-400" }
              : r.status === "cancelled" ? { label: "Annulée", cls: "bg-slate-100 text-slate-600", barre: "bg-slate-300" }
              : { label: "Terminée", cls: "bg-blue-100 text-blue-700", barre: "bg-blue-400" };
            return (
              <div
                key={r.id}
                onClick={() => router.push(`${base}/${r.id}`)}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 overflow-hidden flex cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
              >
                {/* Bande d'état : l'information la plus utile se lit avant le texte. */}
                <span className={`w-1 shrink-0 ${etat.barre}`} aria-hidden />

                <div className="flex-1 min-w-0 p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                      {vignette(r) && (
                        <img
                          src={vignette(r)!}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm truncate text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                        {titre(r)}
                      </p>
                      <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />{quand(r)}
                        {ou(r) && (
                          <><span className="text-slate-300">·</span><MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ou(r)}</span></>
                        )}
                      </p>
                      {/* Côté auteur, la personne qui compte est celle qui réserve. */}
                      {r.traveler?.full_name && (
                        <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 shrink-0" />{r.traveler.full_name}
                        </p>
                      )}
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${etat.cls}`}>
                      {etat.label}
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-3 mt-3 pt-2.5 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 min-w-0">
                      <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      {r.participant_count} participant{r.participant_count > 1 ? "s" : ""}
                      {r.reservation_type === "group" && (
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-px rounded-full">
                          groupe
                        </span>
                      )}
                    </p>
                    {r.total_price != null && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                          {Number(r.total_price).toFixed(0)} <span className="text-[10px] font-bold text-slate-400">TND</span>
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">au total</p>
                      </div>
                    )}
                  </div>

                  {/* Collaboration : la prestation le concerne, la décision non. */}
                  {r.as_collaborator && (
                    <p className="mt-2.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5">
                      Vous collaborez sur cette offre — son auteur décide de la réponse.
                    </p>
                  )}

                  {r.status === "pending" && !r.as_collaborator && (
                    <div className="flex gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onRepondre(r.id, "confirmed").catch(() => {})}
                        className="flex-1 py-2 bg-primary text-slate-900 text-xs font-bold rounded-xl hover:bg-primary/90 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Confirmer
                      </button>
                      <button
                        onClick={() => onRepondre(r.id, "rejected").catch(() => {})}
                        className="flex-1 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 border border-red-200 flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Côté éco-voyageur ───────────────────────────────────────────────────────

type Invitation = {
  status: string;
  /** Ce que doit cet invité — distinct de `share_amount` sur la réservation,
      qui porte la part de l'organisateur. */
  share_amount?: number | null;
  reservation: ReservationDashboard;
};
type Mine = { organized: ReservationDashboard[]; invited: Invitation[] };

/** Ses propres réservations, celles qu'il organise et celles où il est invité. */
export function useMesReservations() {
  const [organisees, setOrganisees] = useState<ReservationDashboard[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    apiFetch<Mine>("/reservations/mine")
      .then((d) => {
        setOrganisees(d.organized ?? []);
        setInvitations((d.invited ?? []).filter((p) => p.reservation));
      })
      .catch(() => {})
      .finally(() => setChargement(false));
  }, []);

  const total = organisees.length + invitations.length;
  /** Invitations auxquelles il n'a pas encore répondu : ce qui l'attend. */
  const aRepondre = invitations.filter((p) => p.status === "pending").length;
  return { organisees, invitations, chargement, total, aRepondre };
}

export function MesReservationsPanel({ organisees, invitations }: {
  organisees: ReservationDashboard[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const lignes = [
    // Pour une invitation, la part qui compte est celle de l'invité.
    ...invitations.map((p) => ({ r: p.reservation, invitation: p.status, maPart: p.share_amount ?? null })),
    ...organisees.map((r) => ({ r, invitation: null as string | null, maPart: r.share_amount ?? null })),
  ]
    // Une invitation sans réponse d'abord : c'est la seule qui demande un geste.
    .sort((a, b) => {
      if (a.invitation === "pending" && b.invitation !== "pending") return -1;
      if (b.invitation === "pending" && a.invitation !== "pending") return 1;
      return new Date(b.r.created_at).getTime() - new Date(a.r.created_at).getTime();
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Mes réservations</h3>
        <button
          onClick={() => router.push("/dashboard/ecovoyageur/reservations")}
          className="text-xs font-bold text-primary hover:underline"
        >
          Voir tout
        </button>
      </div>

      {lignes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-8 text-center">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Aucune réservation</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Parcourez le catalogue pour réserver votre première expérience.
          </p>
          <button
            onClick={() => router.push("/catalogue")}
            className="px-4 py-2 rounded-xl bg-primary text-slate-900 text-xs font-extrabold hover:bg-primary/90"
          >
            Voir le catalogue
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lignes.slice(0, 2).map(({ r, invitation, maPart }) => {
            // Le badge dit ce qui concerne le lecteur : sa réponse s'il est
            // invité, l'état de la réservation s'il l'organise.
            const etat =
              invitation === "pending" ? { label: "À répondre", cls: "bg-violet-100 text-violet-700", barre: "bg-violet-400" }
              : invitation === "declined" ? { label: "Refusée", cls: "bg-slate-100 text-slate-600", barre: "bg-slate-300" }
              : r.status === "pending" && r.awaiting_group ? { label: "Vos invités", cls: "bg-violet-100 text-violet-700", barre: "bg-violet-400" }
              : r.status === "confirmed" ? { label: "Confirmée", cls: "bg-emerald-100 text-emerald-700", barre: "bg-emerald-400" }
              : r.status === "pending" ? { label: "En attente", cls: "bg-amber-100 text-amber-700", barre: "bg-amber-400" }
              : r.status === "rejected" ? { label: "Refusée", cls: "bg-red-100 text-red-700", barre: "bg-red-400" }
              : r.status === "cancelled" ? { label: "Annulée", cls: "bg-slate-100 text-slate-600", barre: "bg-slate-300" }
              : { label: "Terminée", cls: "bg-blue-100 text-blue-700", barre: "bg-blue-400" };
            return (
              <div
                key={r.id}
                onClick={() => router.push(`/dashboard/ecovoyageur/reservations/${r.id}`)}
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 overflow-hidden flex cursor-pointer hover:border-primary/30 hover:shadow-md transition-all"
              >
                {/* Bande d'état : l'information la plus utile se lit avant le texte. */}
                <span className={`w-1 shrink-0 ${etat.barre}`} aria-hidden />

                <div className="flex-1 min-w-0 p-3.5">

                  {/* En-tête : ce qui est réservé, et où l'on en est. */}
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 overflow-hidden">
                      {vignette(r) && (
                        <img
                          src={vignette(r)!}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-sm truncate text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                        {titre(r)}
                      </p>
                      <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />{quand(r)}
                        {ou(r) && (
                          <><span className="text-slate-300">·</span><MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ou(r)}</span></>
                        )}
                      </p>
                      {r.provider?.full_name && (
                        <p className="text-xs text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3 shrink-0" />{r.provider.full_name}
                        </p>
                      )}
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${etat.cls}`}>
                      {etat.label}
                    </span>
                  </div>

                  {/* Pied : qui vient, et qui paie combien. */}
                  <div className="flex items-end justify-between gap-3 mt-3 pt-2.5 border-t border-slate-50 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        {r.participant_count} participant{r.participant_count > 1 ? "s" : ""}
                        {r.reservation_type === "group" && (
                          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-px rounded-full">
                            groupe
                          </span>
                        )}
                      </p>
                      {/* Le compte des réponses n'a de sens qu'en groupe. */}
                      {r.reservation_type === "group" && (r.invited_members?.length ?? 0) > 0 && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {r.invited_members!.filter((m) => m.status === "accepted").length} accepté
                          {r.invited_members!.filter((m) => m.status === "accepted").length > 1 ? "s" : ""}
                          {" · "}
                          {r.invited_members!.filter((m) => m.status === "pending").length} en attente
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {/* En groupe on annonce d'abord ce que doit le lecteur :
                          le total ne lui dit pas ce qu'il aura à régler. */}
                      {maPart != null && r.reservation_type === "group" ? (
                        <>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                            {Number(maPart).toFixed(0)} <span className="text-[10px] font-bold text-slate-400">TND</span>
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            votre part {r.total_price != null && `· ${Number(r.total_price).toFixed(0)} au total`}
                          </p>
                        </>
                      ) : r.total_price != null ? (
                        <>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                            {Number(r.total_price).toFixed(0)} <span className="text-[10px] font-bold text-slate-400">TND</span>
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">au total</p>
                        </>
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-400 italic">Prix à définir</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
