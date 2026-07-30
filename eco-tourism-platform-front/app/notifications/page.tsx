"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Notif = { id: string; type: string; data: Record<string, any>; is_read: boolean; created_at: string };
type Filter = "unread" | "read";

const SECTION_LABEL: Record<string, string> = {
  hebergement: "Hébergement", restauration: "Restauration",
  transport: "Transport", guide: "Guidage", autre: "Autre",
};

// ── Métadonnées par type ──────────────────────────────────────────────────────
function notifMeta(n: Notif) {
  const section = SECTION_LABEL[n.data?.section ?? ""] ?? (n.data?.section ?? "");
  const offer   = n.data?.offer_title ?? "une offre";
  const name    = n.data?.invited_user_name ?? n.data?.inviter_name ?? "Quelqu'un";

  const map: Record<string, { icon: string; accent: string; iconBg: string; iconColor: string; title: string; body: string; isCollab: boolean }> = {
    collaboration_invite: {
      icon: "handshake", accent: "bg-primary", iconBg: "bg-primary/10", iconColor: "text-primary",
      title: "Invitation à collaborer",
      body: `**${n.data?.inviter_name ?? "Un guide"}** vous invite à rejoindre la section **${section}** de l'offre **« ${offer} »**.`,
      isCollab: true,
    },
    collab_accepted: {
      icon: "check_circle", accent: "bg-teal-500", iconBg: "bg-teal-50", iconColor: "text-teal-600",
      title: "Collaboration acceptée",
      body: `**${name}** a accepté votre invitation pour la section **${section}** de **« ${offer} »**.`,
      isCollab: true,
    },
    collab_declined: {
      icon: "cancel", accent: "bg-red-400", iconBg: "bg-red-50", iconColor: "text-red-500",
      title: "Invitation refusée",
      body: `**${name}** a refusé votre invitation pour la section **${section}** de **« ${offer} »**.`,
      isCollab: true,
    },
    collab_quit: {
      icon: "person_remove", accent: "bg-amber-400", iconBg: "bg-amber-50", iconColor: "text-amber-600",
      title: "Collaborateur retiré",
      body: `**${name}** a quitté la section **${section}** de **« ${offer} »**.`,
      isCollab: true,
    },
    offer_deleted: {
      icon: "delete_forever", accent: "bg-slate-400", iconBg: "bg-slate-100", iconColor: "text-slate-500",
      title: "Offre supprimée",
      body: `L'offre **« ${offer} »** à laquelle vous collaboriez a été supprimée par son propriétaire.`,
      isCollab: true,
    },
    offer_schedule_changed: {
      icon: "event_available", accent: "bg-teal-500", iconBg: "bg-teal-50", iconColor: "text-teal-600",
      title: "Horaires mis à jour",
      body: `Les horaires de l'offre **« ${offer} »** (section **${section}**) ont changé. Votre agenda a été synchronisé automatiquement.`,
      isCollab: true,
    },
    offer_schedule_conflict: {
      icon: "event_busy", accent: "bg-amber-500", iconBg: "bg-amber-50", iconColor: "text-amber-600",
      title: "Conflit d'agenda — offre modifiée",
      body: `Les horaires de **« ${offer} »** (section **${section}**) créent un conflit avec votre agenda. Réglez votre agenda pour maintenir votre collaboration.`,
      isCollab: true,
    },
  };
  return map[n.type] ?? {
    icon: "notifications", accent: "bg-slate-300", iconBg: "bg-slate-100", iconColor: "text-slate-400",
    title: n.type, body: JSON.stringify(n.data), isCollab: false,
  };
}

// ── Rendu texte bold markdown simple ─────────────────────────────────────────
function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <span>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <span key={i} className="font-bold text-slate-800 dark:text-slate-100">{p}</span>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// ── Temps relatif ─────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const day = Math.floor(h / 24);
  if (day === 1) return "Hier";
  if (day < 7)  return `Il y a ${day} jours`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ── Groupes par date ──────────────────────────────────────────────────────────
function groupLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7)  return "Cette semaine";
  if (days < 30) return "Ce mois-ci";
  return "Plus ancien";
}

function groupNotifs(list: Notif[]): { label: string; items: Notif[] }[] {
  const order = ["Aujourd'hui", "Hier", "Cette semaine", "Ce mois-ci", "Plus ancien"];
  const map = new Map<string, Notif[]>();
  for (const n of list) {
    const lbl = groupLabel(n.created_at);
    if (!map.has(lbl)) map.set(lbl, []);
    map.get(lbl)!.push(n);
  }
  return order.filter((l) => map.has(l)).map((label) => ({ label, items: map.get(label)! }));
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function NotificationsPage() {
  const router  = useRouter();
  const [notifs, setNotifs]     = useState<Notif[]>([]);
  const [token, setToken]       = useState("");
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<Filter>("unread");
  const [dismissed, setDismissed]   = useState<Set<string>>(new Set());
  const tokenRef = useRef("");

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") ?? "";
    if (!tkn) { router.push("/auth/login"); return; }
    setToken(tkn);
    tokenRef.current = tkn;
    apiFetch<Notif[]>("/notifications", { headers: { Authorization: `Bearer ${tkn}` } })
      .then(setNotifs).catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, [router]);

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await apiFetch("/notifications/read-all", { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setNotifs((p) => p.map((n) => ({ ...n, is_read: true })));
  }

  async function dismiss(id: string) {
    setDismissed((p) => new Set([...p, id]));
    await apiFetch(`/notifications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setTimeout(() => setNotifs((p) => p.filter((n) => n.id !== id)), 300);
  }

  function handleClick(n: Notif) {
    if (!n.is_read) markRead(n.id);
    if (n.type === "collaboration_invite") {
      const collabId = n.data?.collab_id as string | undefined;
      router.push(collabId ? `/profile/guide?tab=collaborations&openCollab=${collabId}` : "/profile/guide?tab=collaborations");
    } else if (["collab_accepted", "collab_declined", "collab_quit"].includes(n.type)) {
      const offerId = n.data?.offer_id as string | undefined;
      router.push(offerId ? `/profile/guide?tab=offres&openOffer=${offerId}` : "/profile/guide?tab=offres");
    } else if (n.type === "offer_schedule_changed") {
      router.push("/profile/guide?tab=collaborations");
    } else if (n.type === "offer_schedule_conflict") {
      router.push("/profile/guide?tab=agenda");
    }
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const filtered = notifs.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read")   return n.is_read;
    return true;
  });
  const groups = groupNotifs(filtered);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">

      {/* ── Header app ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

          {/* Gauche : Retour */}
          <button onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Retour
          </button>

          {/* Centre : titre + badge */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">notifications</span>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications</h1>
              {!loading && unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-slate-900 text-[11px] font-black">{unreadCount}</span>
              )}
            </div>
            {!loading && unreadCount > 0 && (
              <p className="text-[11px] text-slate-400 font-medium">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
            )}
          </div>

          {/* Droite : logo + Tout lire */}
          <div className="flex items-center gap-3 shrink-0">
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors whitespace-nowrap">
                Tout lire
              </button>
            )}
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
              <Leaf className="text-primary w-5 h-5" />
              <span className="text-sm font-extrabold tracking-tight">Éco-Voyage</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Contenu centré ──────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Filtres : Lu / Non lu uniquement */}
        <div className="flex gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          {([
            { key: "unread", label: `Non lu${unreadCount ? ` (${unreadCount})` : ""}` },
            { key: "read",   label: "Lu" },
          ] as { key: Filter; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filter === key
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Liste (pas de scroll interne, la page scroll) ───────────── */}
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
        <div className="px-4 py-4 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Chargement…</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
            </div>
            <p className="font-extrabold text-slate-700 dark:text-slate-300 text-base mb-1">
              {filter === "unread" ? "Tout est lu !" : "Aucune notification"}
            </p>
            <p className="text-sm text-slate-400">
              {filter === "unread" ? "Vous êtes à jour." : "Les nouvelles notifications apparaîtront ici."}
            </p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label}>
              {/* Label de groupe */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="space-y-2">
                {items.map((n) => {
                  const meta         = notifMeta(n);
                  const isDismissing = dismissed.has(n.id);

                  return (
                    <div key={n.id}
                      style={{ transition: "opacity 0.3s, transform 0.3s", opacity: isDismissing ? 0 : 1, transform: isDismissing ? "translateX(40px)" : "none" }}
                      className={`relative group bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border transition-shadow hover:shadow-md ${
                        n.is_read ? "border-slate-100 dark:border-slate-800" : "border-slate-200 dark:border-slate-700"
                      }`}>

                      {/* Bande colorée gauche */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${n.is_read ? "opacity-30" : "opacity-100"} ${meta.accent}`} />

                      <div className="pl-4 pr-4 py-4 flex gap-3 cursor-pointer" onClick={() => handleClick(n)}>
                        {/* Icône */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                          <span className={`material-symbols-outlined text-[20px] ${meta.iconColor}`}>{meta.icon}</span>
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className={`text-sm font-extrabold leading-snug flex-1 ${n.is_read ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>
                              {meta.title}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                              <button
                                onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            <RichText text={meta.body} />
                          </p>

                          <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-2 font-medium">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}
