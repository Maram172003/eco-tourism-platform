"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getConsistentSession } from "@/lib/auth";
import React from "react";
import { formatSubtypeLabel } from "@/lib/offer-variant";
import OfferDetailView, { type OfferFull } from "@/components/offer/OfferDetailView";
import CircuitViewContent from "@/components/circuit/CircuitViewContent";
import {
  ArrowLeft, Leaf, Calendar, Users, Clock, Pencil,
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
  organizer_id: string;
  /** Vrai tant qu'un invité n'a pas répondu : rien n'est encore parti au prestataire. */
  awaiting_group?: boolean;
  share_amount?: number | null;
  /** organizer | equal | custom — nul sur une réservation solo. */
  payment_split?: string | null;
  /** Profil de l'organisateur, pour le nommer auprès de ses invités. */
  traveler?: {
    user_id: string;
    full_name: string | null;
    photo: string | null;
  } | null;
  provider?: {
    user_id: string;
    full_name: string | null;
    organization: string | null;
    phone: string | null;
    photo: string | null;
  };
}

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
  awaiting_group: {
    label: "En attente de vos invités",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    icon: <Clock size={18} className="text-violet-500" />,
  },
  completed: {
    label: "Expérience terminée",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <Star size={18} className="text-blue-500" />,
  },
};

/** Ce que l'organisateur avait choisi au moment de réserver. */
const LIBELLES_REPARTITION: Record<string, string> = {
  organizer: "Vous payez pour tout le monde",
  equal: "Division équitable entre les participants",
  custom: "Répartition personnalisée",
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


/**
 * Colonne de gauche : la prestation, présentée comme dans le catalogue.
 *
 * La réservation ne transporte qu'un résumé de l'offre — titre, région, une
 * image. Assez pour une vignette dans une liste, pas pour retrouver ce qu'on a
 * réservé. On recharge donc la fiche publique et on la rend avec le composant
 * même du catalogue : les deux écrans ne peuvent alors plus diverger.
 */
function ColonneOffre({ reservation, onOuvrirOffre }: {
  reservation: Reservation;
  onOuvrirOffre: (offerId: string) => void;
}) {
  const offerId = reservation.offer?.id;
  const circuitId = reservation.circuit?.id;
  const [offre, setOffre] = useState<OfferFull | null>(null);
  const [circuit, setCircuit] = useState<Record<string, any> | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    const requete = offerId
      ? apiFetch<OfferFull>(`/offers/${offerId}`).then(setOffre)
      : circuitId
        ? apiFetch<Record<string, any>>(`/circuits/${circuitId}/public-detail`).then(setCircuit)
        : Promise.resolve();
    requete.catch(() => {}).finally(() => setChargement(false));
  }, [offerId, circuitId]);

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase px-1">
        L&apos;offre réservée
      </p>

      {chargement ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-56 bg-slate-100 animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-5 w-2/3 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      ) : offre ? (
        <OfferDetailView offer={offre} />
      ) : circuit ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {circuit.cover_image && (
            <img src={circuit.cover_image as string} alt="" className="w-full h-56 object-cover" />
          )}
          <div className="px-5 pt-5">
            <h2 className="text-xl font-black text-slate-900">{circuit.title as string}</h2>
          </div>
          <CircuitViewContent circuit={circuit} ownerName={reservation.provider?.full_name ?? undefined} />
        </div>
      ) : (
        /* La fiche publique n'a pas pu être chargée — l'offre a pu être
           dépubliée depuis. On garde au moins de quoi l'identifier. */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          {reservation.offer ? (
            <button onClick={() => onOuvrirOffre(reservation.offer!.id)}
              className="font-bold text-slate-800 text-lg hover:text-emerald-600 transition-colors text-left">
              {reservation.offer.title}
            </button>
          ) : (
            <p className="font-bold text-slate-800 text-lg">{reservation.circuit?.title ?? "Prestation"}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            La fiche détaillée n&apos;est plus consultable.
          </p>
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
    </div>
  );
}

/**
 * Colonne de droite : la réservation elle-même.
 *
 * Le créneau retenu, qui participe, qui paie quoi, et les actions possibles.
 */
function ColonneReservation({
  reservation, cancelling, cancelled, onCancel, onModifier,
  estOrganisateur, monInvitation, repondEnCours, onRepondre,
}: {
  reservation: Reservation;
  cancelling: boolean;
  cancelled: boolean;
  onCancel: () => void;
  /** Faux quand c'est un invité qui consulte : il n'a pas les mêmes actions. */
  estOrganisateur: boolean;
  /** La ligne de participation de celui qui regarde, s'il est invité. */
  monInvitation: { status: string; share_amount: number | null } | null;
  repondEnCours: boolean;
  onRepondre: (statut: "accepted" | "declined") => void;
  onModifier: () => void;
}) {
  const remainingAmount = reservation.total_price !== null && reservation.deposit_amount
    ? Number(reservation.total_price) - Number(reservation.deposit_amount)
    : null;
  const canCancel = reservation.status === "pending";

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase px-1">
        Votre réservation
      </p>

      {/* Invitation en attente — l'invité répond ici, c'est la première chose
          qu'il doit pouvoir faire en arrivant. */}
      {monInvitation?.status === "pending" && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
          <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Users size={16} className="text-primary" /> Vous êtes invité(e)
          </h3>
          <p className="text-sm text-slate-600">
            {reservation.traveler?.full_name ?? "L'organisateur"} vous invite à rejoindre cette réservation
            {monInvitation.share_amount != null && (
              <> — votre part serait de <span className="font-bold text-slate-800">{Number(monInvitation.share_amount).toFixed(0)} TND</span></>
            )}.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onRepondre("accepted")}
              disabled={repondEnCours}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-slate-900 text-sm font-extrabold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={15} /> Accepter
            </button>
            <button
              onClick={() => onRepondre("declined")}
              disabled={repondEnCours}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <XCircle size={15} /> Refuser
            </button>
          </div>
        </div>
      )}

      {/* Réponse déjà donnée : on la rappelle, sans reproposer les boutons. */}
      {monInvitation && monInvitation.status !== "pending" && (
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
          monInvitation.status === "accepted"
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-slate-50"
        }`}>
          {monInvitation.status === "accepted"
            ? <CheckCircle size={18} className="text-emerald-500" />
            : <XCircle size={18} className="text-slate-400" />}
          <p className={`text-sm font-bold ${
            monInvitation.status === "accepted" ? "text-emerald-700" : "text-slate-600"
          }`}>
            {monInvitation.status === "accepted"
              ? "Vous avez accepté cette invitation"
              : "Vous avez refusé cette invitation"}
          </p>
        </div>
      )}

      {/* Détails de la réservation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-emerald-500" /> Détails de la réservation
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
        </div>
      </div>

      {/* Formule retenue — c'est ce que le voyageur a choisi, donc un
          élément de sa réservation et non une propriété de l'offre. */}
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

      {/* Participants */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Users size={16} className="text-emerald-500" /> Participants
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {reservation.traveler?.photo
              ? <img src={reservation.traveler.photo} alt="" className="w-full h-full object-cover" />
              : <User size={18} className="text-emerald-600" />}
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">
              {estOrganisateur
                ? "Vous (organisateur)"
                : `${reservation.traveler?.full_name ?? "L'organisateur"} (organisateur)`}
            </p>
            <p className="text-xs text-slate-400">
              Réservation {reservation.reservation_type === "group" ? "de groupe" : "solo"}
              {/* La part annoncée est celle du lecteur : un invité n'a que faire
                  de ce que doit l'organisateur. */}
              {estOrganisateur && reservation.share_amount != null && (
                <> · Votre part : {Number(reservation.share_amount).toFixed(0)} TND</>
              )}
              {!estOrganisateur && reservation.share_amount != null && (
                <> · Sa part : {Number(reservation.share_amount).toFixed(0)} TND</>
              )}
            </p>
          </div>
        </div>
        {reservation.reservation_type === "group" && (
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mb-3">
            {LIBELLES_REPARTITION[reservation.payment_split ?? "equal"] ?? LIBELLES_REPARTITION.equal}
          </p>
        )}
        {reservation.invited_members && reservation.invited_members.length > 0 && (
          <div className="space-y-2">
            {reservation.invited_members.map((m) => (
              <div key={m.user_id ?? m.full_name} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {m.photo ? <img src={m.photo} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-emerald-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{m.full_name}</p>
                  {/* Qui a refusé ne doit rien : afficher une part à côté de
                      « Décliné » laissait croire à une somme encore due. */}
                  {m.status !== "declined" && m.share_amount !== null && (
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
                {/* « Part par personne » serait faux dès que les montants
                    diffèrent : on annonce ce que doit celui qui regarde. */}
                <span className="text-slate-500">
                  {reservation.reservation_type === "group" ? "Votre part" : "Part par personne"}
                </span>
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

      {/* Modification — possible tant que le prestataire n'a pas confirmé :
          rien n'est encore engagé de son côté. */}
      {canCancel && estOrganisateur && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Pencil size={15} className="text-emerald-500" /> Modifier ma réservation
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Date, formule, invités et répartition du paiement restent modifiables
            tant que le prestataire n&apos;a pas confirmé.
          </p>
          <button
            onClick={onModifier}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil size={14} /> Modifier
          </button>
        </div>
      )}

      {/* Annulation — refusée côté serveur à quiconque n'organise pas. */}
      {canCancel && estOrganisateur && (
        <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
          <p className="text-sm font-bold text-red-800 mb-2">Annuler la réservation</p>
          <p className="text-xs text-red-600 mb-3">
            Vous pouvez annuler uniquement tant que la réservation n&apos;est pas encore confirmée.
          </p>
          <button onClick={onCancel} disabled={cancelling || cancelled}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-200 disabled:opacity-50">
            <XCircle size={14} /> {cancelling ? "Annulation..." : cancelled ? "Annulée" : "Annuler ma réservation"}
          </button>
        </div>
      )}
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
  const [repondEnCours, setRepondEnCours] = useState(false);
  // La session se lit après le montage : `localStorage` n'existe pas au rendu
  // serveur, et l'initialiser dans useState laisserait la valeur figée.
  const [monId, setMonId] = useState<string | null>(null);
  useEffect(() => { setMonId(getConsistentSession()?.userId ?? null); }, []);

  useEffect(() => {
    if (!id) return;
    apiFetch<Reservation>(`/reservations/${id}`)
      .then(setReservation)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  /** Réponse de l'invité, puis rechargement pour refléter le nouvel état. */
  async function handleRepondre(statut: "accepted" | "declined") {
    setRepondEnCours(true);
    try {
      await apiFetch(`/reservations/${id}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ status: statut }),
      });
      const frais = await apiFetch<Reservation>(`/reservations/${id}`);
      setReservation(frais);
    } catch { /* le message d'erreur du serveur reste dans la console */ }
    finally { setRepondEnCours(false); }
  }

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

  const status =
    reservation.status === "pending" && reservation.awaiting_group
      ? STATUS_CONFIG.awaiting_group
      : STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.pending;
  // Le même écran sert à l'organisateur et à ses invités ; ils n'y font pas
  // les mêmes choses.
  const estOrganisateur = !!monId && reservation.organizer_id === monId;
  const monInvitation =
    reservation.invited_members?.find((m) => m.user_id && m.user_id === monId) ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Barre de navigation — même repère que sur le profil : retour à gauche,
          identité de la plateforme à droite, et rien d'autre. */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/ecovoyageur/reservations")}
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

      {/* Le titre descend dans le flux de la page, comme sur le profil. */}
      <div className="max-w-6xl mx-auto px-4 pt-7">
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Calendar size={22} className="text-primary" />
          Détail de la réservation
        </h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
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

        {reservation.status === "pending" && reservation.awaiting_group && estOrganisateur && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
            Votre demande partira au prestataire dès que tous vos invités auront
            répondu. D&apos;ici là, vous pouvez encore la modifier librement.
          </div>
        )}

        {(reservation.status === "cancelled" || reservation.status === "rejected") &&
          reservation.cancellation_reason && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold text-xs uppercase tracking-wide text-amber-700 mb-1">Motif</p>
            <p>{reservation.cancellation_reason}</p>
          </div>
        )}

        {/* Deux colonnes : la prestation à gauche, la réservation à droite.
            En dessous de `lg` elles retombent l'une sous l'autre, dans le même
            ordre de lecture. */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          <ColonneOffre
            reservation={reservation}
            onOuvrirOffre={(offerId) => router.push(`/offers/${offerId}`)}
          />
          <ColonneReservation
            reservation={reservation}
            estOrganisateur={estOrganisateur}
            monInvitation={monInvitation}
            repondEnCours={repondEnCours}
            onRepondre={handleRepondre}
            onModifier={() => router.push(
              reservation.offer
                ? `/reservations/new?offerId=${reservation.offer.id}&edit=${reservation.id}`
                : `/reservations/new?circuitId=${reservation.circuit?.id}&edit=${reservation.id}`,
            )}
            cancelling={cancelling}
            cancelled={cancelled}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}
