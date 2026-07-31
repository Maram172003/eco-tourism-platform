"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import GuideOfferModal from "@/components/GuideOfferModal";

type DashNotif = {
  id: string;
  type: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
};

type User = { id: string; email: string; role: string; full_name: string };
type Badge = { label: string; obtained_at: string };

type Offer = {
  id: string; title: string; description: string | null;
  offer_type: string | null; offer_subtype: string | null;
  status: string; created_at: string;
  region: string | null; images?: string[] | null;
};

type GuideProfile = {
  user_id: string;
  full_name: string;
  guide_type: string | null;
  bio: string | null;
  country: string | null;
  language: string | null;
  photo: string | null;
  zone: string | null;
  specialties: string[] | null;
  domaines: string[] | null;
  expertises: string[] | null;
  zones_couvertes: string[] | null;
  publics_accueillis: string[] | null;
  languages_spoken: string[] | null;
  years_experience: number | null;
  status: string;
  sustainability_score: number | null;
  score_questionnaire: number | null;
  score_reservations: number;
  score_feedbacks: number;
  profile_completion: number;
  is_onboarded: boolean;
  skills_activities: string[];
  certifications: { label: string; proof: string; _id?: string }[];
  badges: Badge[];
  feedback_received: number;
  reservations_handled: number;
};

const BADGE_CONFIG = [
  { label: "Guide Éco-Certifié", icon: "verified", description: "Onboarding complété" },
  { label: "Guide Ambassadeur Éco-Voyage", icon: "stars", description: "Score ≥ 80%" },
  { label: "Guide Expert", icon: "psychology", description: "10 réservations gérées" },
  { label: "Formateur Durable", icon: "school", description: "5 évaluations reçues" },
];

function getScoreLabel(score: number | null) {
  if (score === null) return "—";
  if (score >= 80) return "Guide Ambassadeur";
  if (score >= 60) return "Guide Expert";
  if (score >= 40) return "Guide Engagé";
  return "Guide en Développement";
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

function ScoreBreakdown({ profile }: { profile: GuideProfile }) {
  const components = [
    { label: "Questionnaire", weight: "40%", value: profile.score_questionnaire, color: "bg-green-500" },
    { label: "Réservations", weight: "40%", value: profile.score_reservations, color: "bg-blue-500" },
    { label: "Feedbacks", weight: "20%", value: profile.score_feedbacks, color: "bg-orange-400" },
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

export default function GuideDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [activeItem, setActiveItem] = useState("Tableau de bord");
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [notifications, setNotifications] = useState<DashNotif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifVisible, setNotifVisible] = useState(5);
  const [notifMenuOpen, setNotifMenuOpen] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: "Tableau de bord", icon: "dashboard" },
    { label: "Mes Offres", icon: "map" },
    { label: "Réservations", icon: "event_available" },
    { label: "Mes Avis", icon: "star" },
    { label: "Certifications", icon: "verified" },
    { label: "Paramètres", icon: "settings" },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (!storedUser || !token) { router.push("/auth/login"); return; }

    try {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.role !== "guide") { router.push("/auth/login"); return; }
      setUser(parsedUser);

      apiFetch<DashNotif[]>("/notifications", { headers: { Authorization: `Bearer ${token}` } })
        .then(setNotifications).catch(() => {});

      apiFetch<GuideProfile>("/guide/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((p) => {
          setProfile(p);
          if (!p?.is_onboarded) router.push("/onboarding/guide");
        })
        .catch(() => router.push("/onboarding/guide"));

      apiFetch<Offer[]>("/guide/offers", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(setOffers)
        .catch(() => {});
    } catch {
      router.push("/auth/login");
    }
  }, [router]);

  async function handleLogout() {
    const token = localStorage.getItem("access_token") || "";
    try { if (token) await logoutUser(token); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/auth/login");
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
    const section = n.data?.section ?? "";
    const offer   = n.data?.offer_title ?? "une offre";
    const who     = n.data?.inviter_name ?? n.data?.invited_user_name ?? "Quelqu'un";
    switch (n.type) {
      case "collaboration_invite":
        return { title: "Invitation à collaborer", icon: "handshake",
          body: `${who} vous invite à compléter la section « ${section} » de l'offre « ${offer} »` };
      case "collab_accepted":
        return { title: "Collaboration acceptée", icon: "check_circle",
          body: `${who} a accepté votre invitation pour la section « ${section} » de « ${offer} »` };
      case "collab_declined":
        return { title: "Invitation refusée", icon: "cancel",
          body: `${who} a refusé votre invitation pour la section « ${section} » de « ${offer} »` };
      case "collab_quit":
        return { title: "Collaborateur retiré", icon: "person_remove",
          body: `${who} a quitté la section « ${section} » de « ${offer} »` };
      case "offer_deleted":
        return { title: "Offre supprimée", icon: "delete_forever",
          body: `L'offre « ${offer} » à laquelle vous collaboriez a été supprimée` };
      case "collab_kicked":
        return { title: "Retiré de la collaboration", icon: "person_remove",
          body: `Vous avez été retiré de la section « ${section} » de l'offre « ${offer} »` };
      case "offer_schedule_changed":
        return { title: "Horaires mis à jour", icon: "event_available",
          body: `Les horaires de « ${offer} » (${section}) ont changé. Votre agenda a été synchronisé automatiquement.` };
      case "offer_schedule_conflict":
        return { title: "Conflit d'agenda", icon: "event_busy",
          body: `Les horaires de « ${offer} » (${section}) créent un conflit avec votre agenda. Réglez votre agenda.` };
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

  async function reportNotif(id: string) {
    const tkn = localStorage.getItem("access_token") || "";
    await apiFetch(`/notifications/${id}/report`, { method: "PATCH", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setNotifMenuOpen(null);
  }

  async function deleteNotif(id: string) {
    const tkn = localStorage.getItem("access_token") || "";
    await apiFetch(`/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${tkn}` } }).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setNotifMenuOpen(null);
  }

  const score = profile?.sustainability_score ?? null;
  const scoreWidth = score !== null ? `${score}%` : "0%";
  const obtainedBadgeLabels = new Set((profile?.badges ?? []).map((b) => b.label));

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
                  onClick={() => setActiveItem(item.label)}
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

            {profile && (
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profil complété</p>
                  <p className="text-xs font-extrabold text-primary">{profile.profile_completion}%</p>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${profile.profile_completion}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/questionnaire/guide")}
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
                Bonjour, {profile?.full_name || user?.full_name || "Guide"} 👋
              </h2>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-5 py-2 gap-2 whitespace-nowrap">
                <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                <span className="text-sm font-semibold">
                  {score !== null ? getScoreLabel(score) : "Guide — Évaluation en attente"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-1 justify-end">
              <div className="relative w-full max-w-md">
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Rechercher un circuit, une zone…"
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
                                  const collabId = n.data?.collab_id as string | undefined;
                                  router.push(collabId ? `/profile/guide?tab=collaborations&openCollab=${collabId}` : "/profile/guide?tab=collaborations");
                                } else if (n.type === "collab_accepted" || n.type === "collab_declined" || n.type === "collab_quit") {
                                  const offerId = n.data?.offer_id as string | undefined;
                                  router.push(offerId ? `/profile/guide?tab=offres&openOffer=${offerId}` : "/profile/guide?tab=offres");
                                } else if (n.type === "offer_deleted") {
                                  const collabId = n.data?.collab_id as string | undefined;
                                  const offerId = n.data?.offer_id as string | undefined;
                                  if (collabId) router.push(`/profile/guide?tab=collaborations&openCollab=${collabId}`);
                                  else if (offerId) router.push(`/profile/guide?tab=collaborations&openCollabByOffer=${offerId}`);
                                  else router.push("/profile/guide?tab=collaborations");
                                } else if (n.type === "offer_schedule_conflict") {
                                  router.push("/profile/guide?tab=agenda");
                                } else if (n.type === "offer_schedule_changed") {
                                  const offerId = n.data?.offer_id as string | undefined;
                                  router.push(offerId ? `/profile/guide?tab=collaborations&openCollabByOffer=${offerId}` : "/profile/guide?tab=collaborations");
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
                                    <button onClick={(e) => { e.stopPropagation(); reportNotif(n.id); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                                      <span className="material-symbols-outlined text-base text-amber-400">flag</span>Signaler
                                    </button>
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
                      <div className="border-t border-slate-100 dark:border-slate-800 rounded-b-2xl overflow-hidden">
                        <button
                          onClick={() => setNotifVisible((v) => v + 5)}
                          className="w-full py-3 text-xs text-primary font-semibold hover:bg-primary/5 transition-colors"
                        >
                          Voir plus ({notifications.length - notifVisible} restantes)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />
              <button onClick={() => router.push("/profile/guide")}
                className="size-11 rounded-full bg-slate-200 border-2 border-primary overflow-hidden shrink-0 hover:opacity-80 transition-opacity" title="Voir mon profil">
                {profile?.photo ? (
                  <img src={profile.photo} alt="Photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                  </div>
                )}
              </button>
            </div>
          </header>

          <div className="p-8">

            {/* Bannière questionnaire non complété */}
            {score === null && (
              <div className="mb-6 p-5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">quiz</span>
                  <div>
                    <p className="font-bold text-slate-800">Passez votre évaluation de guide éco-responsable</p>
                    <p className="text-sm text-slate-500 font-medium">Obtenez votre score et valorisez votre profil auprès des voyageurs.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/questionnaire/guide")}
                  className="px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                >
                  Commencer →
                </button>
              </div>
            )}

            {/* ── Stats Grid ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              {/* Score durabilité */}
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
                {showScoreDetail && profile && <ScoreBreakdown profile={profile} />}
              </div>

              {/* Réservations gérées */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Réservations gérées</p>
                    <h3 className="text-3xl font-extrabold mt-1">{profile?.reservations_handled ?? 0}</h3>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <span className="material-symbols-outlined">event_available</span>
                  </div>
                </div>
              </div>

              {/* Avis reçus */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Avis reçus</p>
                    <h3 className="text-3xl font-extrabold mt-1">{profile?.feedback_received ?? 0}</h3>
                  </div>
                  <div className="bg-green-500/10 p-2 rounded-lg text-green-500">
                    <span className="material-symbols-outlined">star</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Mes Offres ───────────────────────────────────────── */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Mes Offres</h3>
                <button
                  onClick={() => setShowCreateOffer(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Créer une offre
                </button>
              </div>

              {offers.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 p-10 text-center">
                  <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 block">hiking</span>
                  <p className="text-slate-700 font-bold mb-1">Aucune offre publiée</p>
                  <p className="text-slate-400 text-sm mb-5">Créez votre première expérience guidée et proposez-la aux voyageurs.</p>
                  <button
                    onClick={() => setShowCreateOffer(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 rounded-xl text-sm font-bold hover:bg-primary/90 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Créer ma première offre
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offers.map((offer) => (
                    <div key={offer.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/10 overflow-hidden hover:shadow-md transition-shadow">
                      {offer.images?.[0] ? (
                        <img src={offer.images[0]} alt={offer.title} className="w-full h-36 object-cover" />
                      ) : (
                        <div className="w-full h-36 bg-primary/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-4xl">hiking</span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">{offer.title}</h4>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            offer.status === "approved" ? "bg-green-100 text-green-700" :
                            offer.status === "pending"  ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {offer.status === "approved" ? "Approuvée" : offer.status === "pending" ? "En attente" : offer.status}
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

            {/* ── Circuits + Badges ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Circuits / Spécialités */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Mes Spécialités & Circuits</h3>
                  <a className="text-primary font-bold text-sm hover:underline" href="#">Voir tout</a>
                </div>
                <div className="space-y-4">
                  {/* Zone d'activité card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-2xl">location_on</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Zone d'activité</p>
                        <p className="text-lg font-bold text-slate-900">{profile?.zone ?? "Non renseignée"}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {profile?.guide_type === "local" ? "Guide Local" : profile?.guide_type === "professionnel" ? "Guide Professionnel" : "—"}
                          {profile?.years_experience !== null && profile?.years_experience !== undefined
                            ? ` • ${profile.years_experience} an${profile.years_experience > 1 ? "s" : ""} d'expérience`
                            : ""}
                        </p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        profile?.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {profile?.status === "active" ? "Actif" : "En attente"}
                      </span>
                    </div>
                  </div>

                  {/* Spécialités */}
                  {(profile?.specialties?.length ?? 0) > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Spécialités</p>
                      <div className="flex flex-wrap gap-2">
                        {profile!.specialties!.map((s) => (
                          <span key={s} className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {(profile?.certifications?.length ?? 0) > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Certifications</p>
                      <div className="space-y-2">
                        {profile!.certifications.map((cert) => (
                          <div key={cert.label} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <span className="material-symbols-outlined text-primary text-xl">verified</span>
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{cert.label}</span>
                            {cert.proof && (
                              <button type="button" onClick={() => {
                                if (cert.proof.startsWith("data:")) {
                                  const w = window.open(); w?.document.write(`<img src="${cert.proof}" style="max-width:100%">`);
                                } else { window.open(cert.proof, "_blank"); }
                              }} className="ml-auto text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                                Justificatif
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Langues */}
                  {(profile?.languages_spoken?.length ?? 0) > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-primary/5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Langues parlées</p>
                      <div className="flex flex-wrap gap-2">
                        {profile!.languages_spoken!.map((l) => (
                          <span key={l} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-full uppercase">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div>
                <h3 className="text-xl font-bold mb-6">Mes Badges</h3>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-primary/10">
                  <div className="grid grid-cols-2 gap-4">
                    {BADGE_CONFIG.map((config) => {
                      const obtained = obtainedBadgeLabels.has(config.label);
                      const obtainedData = profile?.badges.find((b) => b.label === config.label);
                      return (
                        <div
                          key={config.label}
                          title={obtained && obtainedData
                            ? `Obtenu le ${new Date(obtainedData.obtained_at).toLocaleDateString("fr-FR")}`
                            : config.description}
                          className={`flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all
                            ${obtained
                              ? "bg-slate-50 dark:bg-slate-800 border-primary/20"
                              : "bg-slate-100/50 dark:bg-slate-800/50 border-dashed border-slate-200 dark:border-slate-700"
                            }`}
                        >
                          <div className="size-16 flex items-center justify-center mb-2">
                            <span
                              className={`material-symbols-outlined text-4xl transition-all ${obtained ? "text-primary" : "text-slate-300"}`}
                              style={obtained ? { fontVariationSettings: '"FILL" 1' } : {}}
                            >
                              {config.icon}
                            </span>
                          </div>
                          <p className={`text-xs font-bold ${obtained ? "text-slate-700" : "text-slate-300"}`}>{config.label}</p>
                          <p className={`text-[10px] font-bold uppercase mt-1 ${obtained ? "text-green-500" : "text-slate-300"}`}>
                            {obtained ? "Débloqué" : "Verrouillé"}
                          </p>
                          {!obtained && <p className="text-[9px] text-slate-300 mt-1 italic">{config.description}</p>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile?.feedback_received ?? 0}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Avis</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile?.years_experience ?? 0}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Années</p>
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{profile?.reservations_handled ?? 0}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Circuits</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showCreateOffer && (
        <GuideOfferModal
          open={showCreateOffer}
          onClose={() => setShowCreateOffer(false)}
          onSuccess={(newOffer) => {
            setOffers((prev) => [newOffer, ...prev]);
            setShowCreateOffer(false);
          }}
          profile={{
            domaines: profile?.domaines ?? null,
            expertises: profile?.expertises ?? null,
            zones_couvertes: profile?.zones_couvertes ?? null,
            publics_accueillis: profile?.publics_accueillis ?? null,
            languages_spoken: profile?.languages_spoken ?? null,
          }}
          token={localStorage.getItem("access_token") ?? ""}
        />
      )}
    </div>
  );
}
