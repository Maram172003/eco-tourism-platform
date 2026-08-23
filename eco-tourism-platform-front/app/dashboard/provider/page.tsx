"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Plus, CheckCircle, XCircle } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import BadgeGrid from "@/components/common/BadgeGrid";
import ProviderProfilePage from "@/app/profile/provider/page";
import BadgeChip from "@/components/common/BadgeChip";

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

type Reservation = {
  id: string;
  status: string;
  participant_count: number;
  total_price: number | null;
  created_at: string;
  offer: { title: string };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  guide: "Guide nature",
  agence: "Agence de voyage",
  ecolodge: "Écolodge / Hébergement",
  restaurant: "Restauration",
  artisan: "Artisan",
  association: "Association",
  bien_etre: "Bien-être",
  transport: "Transport",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreLabel(score: number | null) {
  if (score === null) return "—";
  if (score >= 80) return "Prestataire Ambassadeur";
  if (score >= 60) return "Prestataire Engagé";
  if (score >= 40) return "Prestataire Sensible";
  return "Prestataire en Développement";
}

function getScoreColor(score: number | null) {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getBarColor(score: number | null) {
  if (score === null) return "bg-slate-300";
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-primary";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-400";
}

// ─── ScoreBreakdown ────────────────────────────────────────────────────────────

function ScoreBreakdown({ provider }: { provider: Provider }) {
  const components = [
    { label: "Questionnaire", weight: "40%", value: provider.score_questionnaire, color: "bg-green-500" },
    { label: "Réservations", weight: "40%", value: provider.score_reservations, color: "bg-blue-500" },
    { label: "Feedbacks", weight: "20%", value: provider.score_feedbacks, color: "bg-orange-400" },
  ];
  return (
    <div className="mt-4 space-y-2.5">
      {components.map((c) => (
        <div key={c.label}>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">{c.label}</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{c.weight}</span>
            </div>
            <span className="text-xs font-extrabold text-slate-700">
              {c.value !== null && c.value !== undefined ? `${c.value}%` : "—"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${c.color} rounded-full transition-all duration-700`} style={{ width: `${c.value ?? 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProviderDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [orgLogo, setOrgLogo] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
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
  const [showScoreDetail, setShowScoreDetail] = useState(false);
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
    { label: "Réservations",    icon: "event_available", href: "/reservations" },
    { label: "Avis",            icon: "star",            href: "/profile/provider?tab=apropos" },
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
  const scoreWidth = score !== null ? `${score}%` : "0%";
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

            <button
              onClick={() => router.push("/questionnaire/provider")}
              className="mt-4 w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">quiz</span>
              {score === null ? "Passer l'évaluation" : "Voir mon score"}
            </button>
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
            {/* Bannière questionnaire non complété */}
            {score === null && (
              <div className="mb-6 p-5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">quiz</span>
                  <div>
                    <p className="font-bold text-slate-800">Passez l'évaluation de durabilité</p>
                    <p className="text-sm text-slate-500 font-medium">Obtenez votre score et valorisez vos activités auprès des voyageurs éco-responsables.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              {/* Score durabilité — col-span-2 */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col justify-between lg:col-span-2">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Score de durabilité</p>
                    <h3 className={`text-3xl font-extrabold mt-1 ${getScoreColor(score)}`}>
                      {score !== null ? score : "—"}
                      {score !== null && <span className="text-slate-400 text-lg font-normal">/100</span>}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg text-primary">
                      <span className="material-symbols-outlined">analytics</span>
                    </div>
                    <button
                      onClick={() => setShowScoreDetail((v) => !v)}
                      className="text-xs text-slate-400 hover:text-primary font-bold transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showScoreDetail ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${getBarColor(score)} rounded-full transition-all duration-1000`} style={{ width: scoreWidth }} />
                </div>
                <p className="text-xs font-bold mt-2" style={{ color: score !== null ? (score >= 60 ? "#22c55e" : "#f97316") : "#94a3b8" }}>
                  {score !== null ? getScoreLabel(score) : "Évaluation non complétée"}
                </p>
                {showScoreDetail && <ScoreBreakdown provider={provider} />}
              </div>

              {/* Offres actives */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Offres actives</p>
                    <h3 className="text-3xl font-extrabold mt-1">{approvedOffers.length}</h3>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <span className="material-symbols-outlined">storefront</span>
                  </div>
                </div>
              </div>

              {/* Réservations */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Réservations reçues</p>
                    <h3 className="text-3xl font-extrabold mt-1">{provider.total_reservations ?? reservations.length}</h3>
                  </div>
                  <div className="bg-green-500/10 p-2 rounded-lg text-green-500">
                    <span className="material-symbols-outlined">event_available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Informations + Activités + Badges ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Colonne gauche */}
              <div className="lg:col-span-2 space-y-6">

                {/* Informations du prestataire */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Informations</h3>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-6 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border-2 border-primary/20">
                        {(orgLogo ?? provider.photo) ? (
                          <img src={(orgLogo ?? provider.photo)!} alt="Photo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400 text-3xl">person</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                          {provider.full_name ?? provider.organization ?? "—"}
                        </h4>
                        {provider.organization && provider.full_name && (
                          <p className="text-sm text-slate-500 font-medium mt-0.5">{provider.organization}</p>
                        )}
                        {provider.provider_type && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full mt-1.5">
                            <span className="material-symbols-outlined text-sm">eco</span>
                            {PROVIDER_TYPE_LABELS[provider.provider_type] ?? provider.provider_type}
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
                        provider.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {provider.status === "active" ? "Actif" : "En attente"}
                      </span>
                    </div>

                    {provider.bio && (
                      <p className="text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-4">{provider.bio}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {provider.region && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-slate-400 text-base">location_on</span>
                          <span className="font-medium">{provider.region}</span>
                        </div>
                      )}
                      {provider.years_experience != null && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-slate-400 text-base">work_history</span>
                          <span className="font-medium">{provider.years_experience} ans d'expérience</span>
                        </div>
                      )}
                      {provider.phone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="material-symbols-outlined text-slate-400 text-base">phone</span>
                          <span className="font-medium">{provider.phone}</span>
                        </div>
                      )}
                      {provider.website && (
                        <div className="flex items-center gap-2 text-slate-600 overflow-hidden">
                          <span className="material-symbols-outlined text-slate-400 text-base flex-shrink-0">language</span>
                          <a
                            href={provider.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline truncate"
                          >
                            {provider.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                    </div>

                    {(provider.languages_spoken ?? []).length > 0 && (
                      <div className="flex items-center flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <span className="material-symbols-outlined text-slate-400 text-base">translate</span>
                        {(provider.languages_spoken ?? []).map((lang) => (
                          <span key={lang} className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{lang}</span>
                        ))}
                      </div>
                    )}

                    {(provider.certifications ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        {(provider.certifications ?? []).map((cert) => (
                          <span key={cert} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-green-50 text-green-700 rounded-full">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Activités */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Activité Principale */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">local_activity</span>
                      Activité Principale
                    </h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 p-4 min-h-[100px] flex items-start">
                      {(provider.activity_types ?? []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center w-full py-6 text-center">
                          <span className="material-symbols-outlined text-slate-200 text-3xl mb-1">category</span>
                          <p className="text-xs text-slate-300 font-bold">Aucune activité principale</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(provider.activity_types ?? []).map((act) => (
                            <span key={act} className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 bg-primary/10 text-primary rounded-xl">
                              <span className="material-symbols-outlined text-sm">eco</span>
                              {act}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activité Secondaire */}
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-400 text-xl">category</span>
                      Activité Secondaire
                    </h3>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 p-4 min-h-[100px] flex items-start">
                      {(provider.secondary_activity_types ?? []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center w-full py-6 text-center">
                          <span className="material-symbols-outlined text-slate-200 text-3xl mb-1">add_circle</span>
                          <p className="text-xs text-slate-300 font-bold">Aucune activité secondaire</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(provider.secondary_activity_types ?? []).map((act) => (
                            <span key={act} className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl">
                              <span className="material-symbols-outlined text-sm">category</span>
                              {act}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mes Offres */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Mes Offres</h3>
                    <button
                      onClick={() => router.push("/profile/provider")}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 font-bold rounded-xl text-xs shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      Créer une offre
                    </button>
                  </div>

                  {offers.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                      <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 block">storefront</span>
                      <p className="text-slate-700 font-bold mb-1">Aucune offre publiée</p>
                      <p className="text-slate-400 text-sm mb-5">Créez votre première prestation et proposez-la aux voyageurs.</p>
                      <button
                        onClick={() => router.push("/profile/provider")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 rounded-xl text-sm font-bold hover:bg-primary/90 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Créer ma première offre
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {offers.map((offer) => (
                        <div
                          key={offer.id}
                          onClick={() => router.push("/profile/provider")}
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        >
                          {offer.images?.[0] ? (
                            <img src={offer.images[0]} alt={offer.title} className="w-full h-36 object-cover" />
                          ) : (
                            <div className="w-full h-36 bg-primary/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-4xl">storefront</span>
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{offer.title}</h4>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                offer.status === "approved"            ? "bg-green-100 text-green-700"  :
                                offer.status === "pending"             ? "bg-amber-100 text-amber-700"  :
                                offer.status === "draft"               ? "bg-slate-100 text-slate-500"  :
                                offer.status === "attente_publication" ? "bg-teal-100 text-teal-700"    :
                                "bg-red-100 text-red-600"
                              }`}>
                                {offer.status === "approved"            ? "Approuvée"       :
                                 offer.status === "pending"             ? "En attente"      :
                                 offer.status === "draft"               ? "Brouillon"       :
                                 offer.status === "attente_publication" ? "Prêt à publier"  :
                                 "Refusée"}
                              </span>
                            </div>
                            {offer.region && (
                              <p className="text-xs text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">location_on</span>
                                {offer.region}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Réservations récentes */}
                {reservations.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Réservations récentes</h3>
                    <div className="space-y-3">
                      {reservations.slice(0, 3).map((r) => (
                        <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-slate-900 dark:text-slate-100 text-sm line-clamp-1">{r.offer?.title}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {r.participant_count} participant{r.participant_count > 1 ? "s" : ""} · {new Date(r.created_at).toLocaleDateString("fr-FR")}
                              </p>
                              {r.total_price && (
                                <p className="text-primary font-bold text-sm mt-1">{Number(r.total_price).toFixed(0)} TND</p>
                              )}
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                              r.status === "pending" ? "bg-amber-100 text-amber-700"
                              : r.status === "confirmed" ? "bg-green-100 text-green-700"
                              : r.status === "cancelled" ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                            }`}>
                              {r.status === "pending" ? "En attente"
                                : r.status === "confirmed" ? "Confirmée"
                                : r.status === "cancelled" ? "Annulée"
                                : "Terminée"}
                            </span>
                          </div>
                          {r.status === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleReservationAction(r.id, "confirmed")}
                                className="flex-1 py-2 bg-primary text-slate-900 text-xs font-bold rounded-xl hover:bg-primary/90 flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Confirmer
                              </button>
                              <button
                                onClick={() => handleReservationAction(r.id, "rejected")}
                                className="flex-1 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 flex items-center justify-center gap-1.5 border border-red-200"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Refuser
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Colonne droite : Badges */}
              <div>
                <h3 className="text-xl font-bold mb-6">Mes Badges</h3>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-primary/10">
                  <BadgeGrid role="provider" details={false} />
                  <a href="/dashboard/profile?onglet=badges" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">Voir le détail des paliers →</a>

                  
                </div>
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
