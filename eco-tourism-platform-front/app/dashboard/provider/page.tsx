"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Plus, CheckCircle, XCircle } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import ProviderProfilePage from "@/app/profile/provider/page";
import BadgeChip from "@/components/common/BadgeChip";
import { DemandesRecuesPanel, type ReservationDashboard } from "@/components/reservation/DashboardReservations";
import ScoreBadgeCard from "@/components/common/ScoreBadgeCard";
import DetailCompletion from "@/components/common/DetailCompletion";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashNotif = {
  id: string;
  type: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
};

type User = { id: string; email: string; role: string; full_name: string };
type Badge = { label: string; obtained_at: string };

type Provider = {
  user_id: string;
  full_name: string | null;
  organization: string | null;
  provider_type: string | null;
  region: string | null;
  photo: string | null;
  sustainability_score: number | null;
  score_questionnaire: number | null;
  score_reservations: number | null;
  score_feedbacks: number | null;
  status: string;
  rejection_reason?: string | null;
  eco_labels: string[] | null;
  activity_types: string[] | null;
  secondary_activity_types: string[] | null;
  languages_spoken: string[] | null;
  years_experience: number | null;
  bio: string | null;
  certifications: string[] | null;
  badges: Badge[];
  total_reservations: number;
  feedback_received: number;
  profile_completion: number;
  is_onboarded: boolean;
  phone: string | null;
  website: string | null;
};

type Offer = {
  id: string;
  title: string;
  offer_type: string | null;
  status: string;
  price: number | null;
  images?: string[] | null;
  region?: string | null;
};

// Le type du bloc partagé fait foi : la définition locale ne portait que six
// champs et ne pouvait pas décrire ce que la route renvoie réellement.
type Reservation = ReservationDashboard;

// ─── Constants ────────────────────────────────────────────────────────────────


// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreLabel(score: number | null) {
  if (score === null) return "—";
  if (score >= 80) return "Prestataire Ambassadeur";
  if (score >= 60) return "Prestataire Engagé";
  if (score >= 40) return "Prestataire Sensible";
  return "Prestataire en Développement";
}




// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProviderDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  /** Ce qui appelle une décision de sa part. */
  const enAttente = reservations.filter((r) => r.status === "pending").length;
  // Circuits et collaborations : les mêmes routes que côté guide, qui acceptent
  // toutes deux le rôle prestataire.
  const [nbCircuits, setNbCircuits] = useState(0);
  const [nbCollabs, setNbCollabs] = useState(0);
  useEffect(() => {
    const n = (v: unknown) => (Array.isArray(v) ? v.length : 0);
    apiFetch<unknown[]>("/circuits/mine").then((r) => setNbCircuits(n(r))).catch(() => {});
    apiFetch<unknown[]>("/guide/collaborations/mine").then((r) => setNbCollabs(n(r))).catch(() => {});
  }, []);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState("Tableau de bord");

  // ?section=Offres — arriver directement sur une section depuis une autre page.
  // Lu dans un effet, pas dans l'initialiseur d'état : ce composant est aussi
  // pré-rendu côté serveur, où `window` n'existe pas. React conserve alors la
  // valeur du serveur lors de l'hydratation et ne rejoue pas l'initialiseur —
  // la section demandée était donc ignorée à l'arrivée.
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("section");
    if (s === "Offres" || s === "Circuits") setActiveItem(s);
  }, []);
  const [notifications, setNotifications] = useState<DashNotif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifVisible, setNotifVisible] = useState(5);
  const [notifMenuOpen, setNotifMenuOpen] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: "Tableau de bord", icon: "dashboard",      section: true as const },
    { label: "Explorer",        icon: "explore",         href: "/explorer" },
    { label: "Offres",          icon: "storefront",      section: true as const },
    { label: "Circuits",        icon: "route",           section: true as const },
    { label: "Réservations",    icon: "event_available", href: "/dashboard/provider/reservations" },
    { label: "Paramètres",      icon: "settings",        href: "/dashboard/profile" },
    { label: "Messagerie",      icon: "forum",           href: "/messagerie" },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const tkn = localStorage.getItem("access_token");
    if (!storedUser || !tkn) { router.push("/auth/login"); return; }

    try {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.role !== "provider") { router.push("/auth/login"); return; }
      setUser(parsedUser);

      apiFetch<DashNotif[]>("/notifications", { headers: { Authorization: `Bearer ${tkn}` } })
        .then(setNotifications).catch(() => {});

      Promise.all([
        apiFetch<Provider>("/providers/me", { headers: { Authorization: `Bearer ${tkn}` } }),
        apiFetch<Offer[]>("/offers/mine", { headers: { Authorization: `Bearer ${tkn}` } }),
        apiFetch<Reservation[]>("/reservations/provider/received", { headers: { Authorization: `Bearer ${tkn}` } }),
        apiFetch<{ logo?: string | null }>("/organizations/me", { headers: { Authorization: `Bearer ${tkn}` } }).catch(() => null),
      ])
        .then(([p, o, r, org]) => {
          setProvider(p);
          setOffers(o);
          setReservations(r);
          setOrgLogo(org?.logo ?? null);
          if (!p.is_onboarded && !p.full_name) {
            router.push("/onboarding/provider");
          }
        })
        .catch(() => router.push("/onboarding/provider"))
        .finally(() => setLoading(false));
    } catch {
      router.push("/auth/login");
    }
  }, [router]);

  async function handleLogout() {
    const tkn = localStorage.getItem("access_token") || "";
    try { if (tkn) await logoutUser(tkn); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  }

  async function handleReservationAction(id: string, action: "confirmed" | "rejected") {
    try {
      await apiFetch(`/reservations/${id}/confirm`, {
        method: "PATCH",
        body: JSON.stringify({ status: action }),
      });
      setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status: action } : r));
    } catch {}
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        setNotifVisible(5);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function notifLabel(n: DashNotif): { title: string; body: string; icon: string } {
    const section    = n.data?.section ?? "";
    const isCircuit  = !!n.data?.circuit_id;
    const resource   = isCircuit
      ? (n.data?.circuit_title ?? "un circuit")
      : (n.data?.offer_title   ?? "une offre");
    const who        = n.data?.inviter_name ?? n.data?.invited_user_name ?? "Quelqu'un";
    const sourceOf   = isCircuit ? "du circuit" : "de l'offre";
    switch (n.type) {
      case "profile_rejected": {
        const deadline = n.data?.disable_at
          ? new Date(n.data.disable_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
          : null;
        return { title: "Profil refusé", icon: "gpp_bad",
          body: `Votre profil n'a pas été validé${n.data?.reason ? ` — motif : ${n.data.reason}` : ""}. `
            + `Votre compte sera désactivé${deadline ? ` le ${deadline}` : ` sous ${n.data?.grace_hours ?? 24}h`}.` };
      }
      case "collaboration_invite":
        return { title: "Invitation à collaborer", icon: "handshake",
          body: `${who} vous invite à compléter la section « ${section} » ${sourceOf} « ${resource} »` };
      case "collab_accepted":
        return { title: "Collaboration acceptée", icon: "check_circle",
          body: `${who} a accepté votre invitation pour la section « ${section} » ${sourceOf} « ${resource} »` };
      case "collab_declined":
        return { title: "Invitation refusée", icon: "cancel",
          body: `${who} a refusé votre invitation pour la section « ${section} » ${sourceOf} « ${resource} »` };
      case "collab_quit":
        return { title: "Collaborateur retiré", icon: "person_remove",
          body: `${who} a quitté la section « ${section} » ${sourceOf} « ${resource} »` };
      case "collab_kicked":
        return { title: "Retiré de la collaboration", icon: "person_remove",
          body: `Vous avez été retiré de la section « ${section} » ${sourceOf} « ${resource} »` };
      case "offer_deleted":
        return { title: "Offre supprimée", icon: "delete_forever",
          body: `L'offre « ${resource} » à laquelle vous collaboriez a été supprimée` };
      case "circuit_deleted":
        return { title: "Circuit supprimé", icon: "delete_forever",
          body: `Le circuit « ${resource} » auquel vous collaboriez a été supprimé` };
      case "offer_schedule_changed":
      case "circuit_schedule_changed":
        return { title: "Horaires mis à jour", icon: "event_available",
          body: `Les horaires de « ${resource} » (${section}) ont changé. Votre agenda a été synchronisé automatiquement.` };
      case "offer_schedule_conflict":
      case "circuit_schedule_conflict":
        return { title: "Conflit d'agenda", icon: "event_busy",
          body: `Les horaires de « ${resource} » (${section}) créent un conflit avec votre agenda. Réglez votre agenda.` };
      default:
        return { title: "Notification", icon: "notifications", body: n.data?.message ?? "" };
    }
  }

  async function markNotifRead(id: string) {
    const tkn = localStorage.getItem("access_token") || "";
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markNotifUnread(id: string) {
    const tkn = localStorage.getItem("access_token") || "";
    await apiFetch(`/notifications/${id}/unread`, { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n));
  }

  async function markAllNotifRead() {
    const tkn = localStorage.getItem("access_token") || "";
    await apiFetch("/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function deleteNotif(id: string) {
    const tkn = localStorage.getItem("access_token") || "";
    await apiFetch(`/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setNotifMenuOpen(null);
  }

  async function reportNotif(id: string) {
    const tkn = localStorage.getItem("access_token") || "";
    await apiFetch(`/notifications/${id}/report`, { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setNotifMenuOpen(null);
  }

  const score = provider?.sustainability_score ?? null;
  const approvedOffers = offers.filter((o) => o.status === "approved");

  if (loading || !provider) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="flex min-h-screen">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-72 bg-white dark:bg-slate-900 border-r border-primary/10 flex flex-col fixed h-full">
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-10">
              <Leaf className="text-primary w-8 h-8" />
              <h1 className="text-xl font-extrabold tracking-tight">Éco-Voyage</h1>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if ("section" in item) {
                      setActiveItem(item.label);
                      // L'adresse suit la section affichée : sans cela, un
                      // ?section= hérité contredirait l'écran au rechargement.
                      const url = item.label === "Tableau de bord"
                        ? window.location.pathname
                        : `${window.location.pathname}?section=${item.label}`;
                      window.history.replaceState(null, "", url);
                      // La section s'affiche en haut, pas à la position de défilement
                      // héritée du tableau de bord.
                      window.scrollTo({ top: 0 });
                      return;
                    }
                    router.push(item.href!);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeItem === item.label
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined">logout</span>
                <span>Déconnexion</span>
              </button>
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profil complété</p>
                <p className="text-xs font-extrabold text-primary">{provider.profile_completion ?? 0}%</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${provider.profile_completion ?? 0}%` }} />
              </div>
            </div>

            {/* Le grand bouton menait au questionnaire quel que soit son
                libellé. Il ouvre maintenant ce que la jauge juste au-dessus
                laisse deviner : ce qui manque au profil. */}
            <DetailCompletion
              lignes={(provider as any)?.completion_details ?? []}
              total={provider?.profile_completion ?? 0}
            />
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="flex-1 ml-72">

          <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-primary/10 px-10 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-12 shrink-0">
              <h2 className="text-2xl font-bold whitespace-nowrap">
                Bonjour, {provider.full_name || user?.full_name || "Prestataire"}
              </h2>
              <BadgeChip role="provider" icon="domain_verification" fallback={score !== null ? getScoreLabel(score) : "Prestataire — Évaluation en attente"} />
            </div>

            <div className="flex items-center gap-6 flex-1 justify-end">
              <div className="relative w-full max-w-md">
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Rechercher une activité, une région…"
                />
                <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl">search</span>
              </div>
              <div ref={notifRef} className="relative shrink-0">
                <button
                  onClick={() => { setNotifOpen((o) => !o); setNotifMenuOpen(null); }}
                  className="size-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary transition-colors relative"
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {notifications.filter((n) => !n.is_read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {notifications.filter((n) => !n.is_read).length > 9 ? "9+" : notifications.filter((n) => !n.is_read).length}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl">
                      <span className="font-semibold text-sm">Notifications</span>
                      {notifications.some((n) => !n.is_read) && (
                        <button onClick={markAllNotifRead} className="text-xs text-primary hover:underline">
                          Tout marquer lu
                        </button>
                      )}
                    </div>
                    <div className="max-h-[26rem] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                          <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">notifications_none</span>
                          Aucune notification
                        </div>
                      ) : (
                        notifications.slice(0, notifVisible).map((n, nIdx) => {
                          const { title, body, icon } = notifLabel(n);
                          const isUnread = !n.is_read;
                          const menuOpen = notifMenuOpen === `bell-${n.id}`;
                          const openUp = nIdx >= Math.min(notifVisible, notifications.length) - 2;
                          return (
                            <div key={n.id} className={`relative flex gap-3 items-start px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isUnread ? "bg-primary/5" : ""}`}>
                              <div className="flex-1 min-w-0 flex gap-3 items-start" onClick={() => {
                                if (!n.is_read) markNotifRead(n.id);
                                setNotifOpen(false);
                                if (n.type === "collaboration_invite" || n.type === "collab_kicked") {
                                  const collabId  = n.data?.collab_id  as string | undefined;
                                  const circuitId = n.data?.circuit_id as string | undefined;
                                  if (circuitId) router.push(`/profile/provider?tab=circuits&openCircuit=${circuitId}`);
                                  else router.push(collabId ? `/profile/provider?tab=collaborations&openCollab=${collabId}` : "/profile/provider?tab=collaborations");
                                } else if (n.type === "collab_accepted" || n.type === "collab_declined" || n.type === "collab_quit") {
                                  const circuitId = n.data?.circuit_id as string | undefined;
                                  const offerId   = n.data?.offer_id   as string | undefined;
                                  if (circuitId) router.push(`/profile/provider?tab=circuits&openCircuit=${circuitId}`);
                                  else router.push(offerId ? `/profile/provider?tab=offres&openOffer=${offerId}` : "/profile/provider?tab=offres");
                                } else if (n.type === "offer_deleted") {
                                  const collabId = n.data?.collab_id as string | undefined;
                                  const offerId  = n.data?.offer_id  as string | undefined;
                                  if (collabId) router.push(`/profile/provider?tab=collaborations&openCollab=${collabId}`);
                                  else if (offerId) router.push(`/profile/provider?tab=collaborations&openCollabByOffer=${offerId}`);
                                  else router.push("/profile/provider?tab=collaborations");
                                } else if (n.type === "circuit_deleted") {
                                  router.push("/profile/provider?tab=circuits");
                                } else if (n.type === "offer_schedule_conflict" || n.type === "circuit_schedule_conflict") {
                                  router.push("/profile/provider?tab=agenda");
                                } else if (n.type === "offer_schedule_changed") {
                                  const offerId = n.data?.offer_id as string | undefined;
                                  router.push(offerId ? `/profile/provider?tab=collaborations&openCollabByOffer=${offerId}` : "/profile/provider?tab=collaborations");
                                } else if (n.type === "circuit_schedule_changed") {
                                  const circuitId = n.data?.circuit_id as string | undefined;
                                  router.push(circuitId ? `/profile/provider?tab=circuits&openCircuit=${circuitId}` : "/profile/provider?tab=circuits");
                                }
                              }}>
                                <span className={`mt-0.5 material-symbols-outlined text-lg shrink-0 ${isUnread ? "text-primary" : "text-slate-400"}`}>
                                  {icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-semibold truncate ${isUnread ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                                    {title}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{body}</p>
                                  <p className="text-[10px] text-slate-300 mt-1">
                                    {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                              <div className="relative shrink-0">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setNotifMenuOpen(menuOpen ? null : `bell-${n.id}`); }}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-base">more_vert</span>
                                </button>
                                {menuOpen && (
                                  <div className={`absolute right-0 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-[60] overflow-hidden ${openUp ? "bottom-7" : "top-7"}`}>
                                    {n.is_read ? (
                                      <button onClick={(e) => { e.stopPropagation(); markNotifUnread(n.id); setNotifMenuOpen(null); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-400">mark_email_unread</span>Marquer comme non lu
                                      </button>
                                    ) : (
                                      <button onClick={(e) => { e.stopPropagation(); markNotifRead(n.id); setNotifMenuOpen(null); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-400">mark_email_read</span>Marquer comme lu
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }} className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-base">delete</span>Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                              {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                    {notifVisible < notifications.length && (
                      <div className="border-t border-slate-100 dark:border-slate-800 overflow-hidden">
                        <button
                          onClick={() => setNotifVisible((v) => v + 5)}
                          className="w-full py-3 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors"
                        >
                          Voir plus ({notifications.length - notifVisible} restantes)
                        </button>
                      </div>
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-800 rounded-b-2xl overflow-hidden">
                      <button
                        onClick={() => { setNotifOpen(false); router.push("/notifications"); }}
                        className="w-full py-3 text-xs text-slate-500 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Voir toutes les notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />
              <button
                onClick={() => router.push("/profile/provider")}
                className="size-11 rounded-full bg-slate-200 border-2 border-primary overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
                title="Voir mon profil"
              >
                {(orgLogo ?? provider.photo) ? (
                  <img src={(orgLogo ?? provider.photo)!} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                  </div>
                )}
              </button>
            </div>
          </header>

          <div className="p-8">

            {activeItem === "Tableau de bord" && (<>

            {/* Profil refusé — compte désactivé sous 24h */}
            {provider.status === "rejected" && (
              <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-2xl">gpp_bad</span>
                <div>
                  <p className="font-bold text-red-800">Profil refusé</p>
                  <p className="text-sm text-red-600 font-medium">
                    {provider.rejection_reason
                      ? `Motif : ${provider.rejection_reason}`
                      : "Aucun motif n'a été précisé."}
                  </p>
                  <p className="text-sm text-red-600 font-medium mt-1">
                    Votre compte sera désactivé sous 24h. Contactez l&apos;équipe Éco-Voyage avant ce délai.
                  </p>
                </div>
              </div>
            )}

            {/* Validation en attente */}
            {provider.status === "pending" && provider.full_name && (
              <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500 text-2xl">schedule</span>
                <div>
                  <p className="font-bold text-amber-800">Profil en attente de validation</p>
                  <p className="text-sm text-amber-600 font-medium">L'équipe Éco-Voyage va examiner votre profil sous 48h.</p>
                </div>
              </div>
            )}

            {/* ── Stats Grid ───────────────────────────────────────────── */}
            {/* Bannière questionnaire non complété.
                 La condition portait sur le score final, qui vaut désormais 0
                 et jamais `null` : la bannière ne pouvait plus s'afficher.
                 Elle porte maintenant sur le fait réel — le questionnaire est
                 passé ou il ne l'est pas. */}
            {!((provider?.score_questionnaire ?? 0) > 0) && (
              <div className="mb-6 p-5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">quiz</span>
                  <div>
                    <p className="font-bold text-slate-800">Passez votre évaluation de durabilité</p>
                    <p className="text-sm text-slate-500 font-medium">Obtenez votre score et valorisez votre profil auprès des voyageurs.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/questionnaire/provider")}
                  className="px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                >
                  Commencer →
                </button>
              </div>
            )}

            {/* Trois colonnes : la carte de progression en occupe deux, les
                 compteurs s'empilent dans la troisième plutôt que de flotter
                 à côté d'une carte deux fois plus haute qu'eux. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">

              {/* Score et badge réunis : le badge nomme, le score chiffre,
                  et le palier en cours dit ce qui reste à faire. */}
              <ScoreBadgeCard role="provider" scoreInitial={provider.score_questionnaire} />

              <div className="space-y-3">

                {/* Réservations reçues — celles de ses offres et celles des
                    offres où il collabore, comme sur le tableau guide. */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Réservations reçues</p>
                      <h3 className="text-2xl font-extrabold mt-0.5">{reservations.length}</h3>
                      {enAttente > 0 && (
                        <p className="text-xs font-bold text-amber-600 mt-1">
                          {enAttente} en attente de réponse
                        </p>
                      )}
                    </div>
                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                      <span className="material-symbols-outlined">event_available</span>
                    </div>
                  </div>
                </div>

                {/* Offres, circuits et collaborations : trois comptes courts,
                    côte à côte plutôt qu'empilés, pour tenir dans la colonne. */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Offres", valeur: approvedOffers.length, icone: "storefront", teinte: "text-emerald-500 bg-emerald-500/10", href: "/profile/provider?tab=offres" },
                    { label: "Circuits", valeur: nbCircuits, icone: "route", teinte: "text-teal-500 bg-teal-500/10", href: "/profile/provider?tab=circuits" },
                    { label: "Collabs", valeur: nbCollabs, icone: "handshake", teinte: "text-violet-500 bg-violet-500/10", href: "/profile/provider?tab=collaborations" },
                  ].map((c) => (
                    <button
                      key={c.label}
                      onClick={() => router.push(c.href)}
                      className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-primary/10 text-left hover:border-primary/30 transition-colors"
                    >
                      <span className={`inline-flex p-1.5 rounded-lg ${c.teinte}`}>
                        <span className="material-symbols-outlined text-lg">{c.icone}</span>
                      </span>
                      <p className="text-xl font-extrabold mt-1.5 leading-none">{c.valeur}</p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{c.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Réservations + Badges ─────────────────────────────── */}
            <div className="grid grid-cols-1 gap-8">

              {/* Colonne gauche */}
              <div className="space-y-6">
                {/* Demandes de réservation — même bloc que le tableau de
                    bord guide, avec un état vide qui explique la suite. */}
                <DemandesRecuesPanel
                  role="provider"
                  reservations={reservations}
                  onRepondre={handleReservationAction}
                />
              </div>

            </div>
            </>)}

            {/* ── Offres et Circuits : l'interface du profil, montée ici ──
                 Les formulaires viennent avec, sans être dupliqués. */}
            {activeItem === "Offres" && (
              <ProviderProfilePage embedded forcedTab="offres" />
            )}

            {activeItem === "Circuits" && (
              <ProviderProfilePage embedded forcedTab="circuits" />
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
