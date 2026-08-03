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

function notifMeta(n: Notif) {
  const isCircuit  = !!n.data?.circuit_id;
  const section    = SECTION_LABEL[n.data?.section ?? ""] ?? (n.data?.section ?? "");
  const resource   = isCircuit
    ? (n.data?.circuit_title ?? "un circuit")
    : (n.data?.offer_title   ?? "une offre");
  const name       = n.data?.invited_user_name ?? n.data?.inviter_name ?? "Quelqu'un";
  const sourceOf   = isCircuit ? "du circuit" : "de l'offre";

  const map: Record<string, { icon: string; accent: string; iconBg: string; iconColor: string; title: string; body: string }> = {
    collaboration_invite: {
      icon: "handshake", accent: "bg-primary", iconBg: "bg-primary/10", iconColor: "text-primary",
      title: "Invitation à collaborer",
      body: `**${n.data?.inviter_name ?? "Un guide"}** vous invite à rejoindre la section **${section}** ${sourceOf} **« ${resource} »**.`,
    },
    collab_accepted: {
      icon: "check_circle", accent: "bg-teal-500", iconBg: "bg-teal-50", iconColor: "text-teal-600",
      title: "Collaboration acceptée",
      body: `**${name}** a accepté votre invitation pour la section **${section}** ${sourceOf} **« ${resource} »**.`,
    },
    collab_declined: {
      icon: "cancel", accent: "bg-red-400", iconBg: "bg-red-50", iconColor: "text-red-500",
      title: "Invitation refusée",
      body: `**${name}** a refusé votre invitation pour la section **${section}** ${sourceOf} **« ${resource} »**.`,
    },
    collab_quit: {
      icon: "exit_to_app", accent: "bg-amber-400", iconBg: "bg-amber-50", iconColor: "text-amber-600",
      title: "Un collaborateur a quitté",
      body: `**${name}** a quitté la collaboration pour la section **${section}** ${sourceOf} **« ${resource} »**.`,
    },
    collab_kicked: {
      icon: "person_remove", accent: "bg-red-400", iconBg: "bg-red-50", iconColor: "text-red-500",
      title: "Retiré de la collaboration",
      body: `Vous avez été retiré de la section **${section}** ${sourceOf} **« ${resource} »** par son propriétaire.`,
    },
    offer_deleted: {
      icon: "delete_forever", accent: "bg-slate-400", iconBg: "bg-slate-100", iconColor: "text-slate-500",
      title: "Offre supprimée",
      body: `L'offre **« ${resource} »** à laquelle vous collaboriez a été supprimée par son propriétaire.`,
    },
    circuit_deleted: {
      icon: "delete_forever", accent: "bg-slate-400", iconBg: "bg-slate-100", iconColor: "text-slate-500",
      title: "Circuit supprimé",
      body: `Le circuit **« ${resource} »** auquel vous collaboriez a été supprimé par son propriétaire.`,
    },
    offer_schedule_changed: {
      icon: "event_available", accent: "bg-teal-500", iconBg: "bg-teal-50", iconColor: "text-teal-600",
      title: "Horaires mis à jour",
      body: `Les horaires de l'offre **« ${resource} »** (section **${section}**) ont changé. Votre agenda a été synchronisé automatiquement.`,
    },
    circuit_schedule_changed: {
      icon: "event_available", accent: "bg-teal-500", iconBg: "bg-teal-50", iconColor: "text-teal-600",
      title: "Horaires mis à jour",
      body: `Les horaires du circuit **« ${resource} »** (section **${section}**) ont changé. Votre agenda a été synchronisé automatiquement.`,
    },
    offer_schedule_conflict: {
      icon: "event_busy", accent: "bg-amber-500", iconBg: "bg-amber-50", iconColor: "text-amber-600",
      title: "Conflit d'agenda",
      body: `Les horaires de **« ${resource} »** (section **${section}**) créent un conflit avec votre agenda. Réglez votre agenda pour maintenir votre collaboration.`,
    },
    circuit_schedule_conflict: {
      icon: "event_busy", accent: "bg-amber-500", iconBg: "bg-amber-50", iconColor: "text-amber-600",
      title: "Conflit d'agenda",
      body: `Les horaires du circuit **« ${resource} »** (section **${section}**) créent un conflit avec votre agenda. Réglez votre agenda pour maintenir votre collaboration.`,
    },
  };
  return map[n.type] ?? {
    icon: "notifications", accent: "bg-slate-300", iconBg: "bg-slate-100", iconColor: "text-slate-400",
    title: n.type, body: n.data?.message ?? JSON.stringify(n.data),
  };
}

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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifs, setNotifs]         = useState<Notif[]>([]);
  const [token, setToken]           = useState("");
  const [role, setRole]             = useState<"guide" | "provider" | "">("");
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<Filter>("unread");
  const [dismissed, setDismissed]   = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const tokenRef = useRef("");

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") ?? "";
    if (!tkn) { router.push("/auth/login"); return; }
    setToken(tkn);
    tokenRef.current = tkn;
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u?.role === "guide" || u?.role === "provider") setRole(u.role);
    } catch {}
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

  async function deleteAll() {
    await apiFetch("/notifications/all", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    setNotifs([]);
    setSelected(new Set());
    setSelectMode(false);
    setConfirmDeleteAll(false);
  }

  async function deleteSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    await apiFetch("/notifications/bulk", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => {});
    ids.forEach((id) => setDismissed((p) => new Set([...p, id])));
    setTimeout(() => {
      setNotifs((p) => p.filter((n) => !ids.includes(n.id)));
      setSelected(new Set());
      setSelectMode(false);
    }, 300);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const visibleIds = filtered.map((n) => n.id);
    const allSelected = visibleIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); visibleIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelected((prev) => new Set([...prev, ...visibleIds]));
    }
  }

  function handleClick(n: Notif) {
    if (selectMode) { toggleSelect(n.id); return; }
    if (!n.is_read) markRead(n.id);

    const circuitId = n.data?.circuit_id as string | undefined;
    const collabId  = n.data?.collab_id  as string | undefined;
    const offerId   = n.data?.offer_id   as string | undefined;
    const isCircuit = !!circuitId;
    const gBase     = "/profile/guide";
    const pBase     = "/profile/provider";

    if (role === "guide") {
      // ── Guide reçoit ces notifications ──────────────────────────────
      switch (n.type) {
        case "collaboration_invite":
        case "collab_kicked":
          // Invité à une collab (offre ou circuit) → onglet collabs, ouvre la fiche collab
          router.push(collabId
            ? `${gBase}?tab=collaborations&openCollab=${collabId}`
            : `${gBase}?tab=collaborations`);
          break;
        case "collab_accepted":
        case "collab_declined":
        case "collab_quit":
          // Guide propriétaire d'une offre, quelqu'un a répondu
          router.push(offerId
            ? `${gBase}?tab=offres&openOffer=${offerId}`
            : `${gBase}?tab=offres`);
          break;
        case "offer_deleted":
          router.push(collabId
            ? `${gBase}?tab=collaborations&openCollab=${collabId}`
            : offerId
              ? `${gBase}?tab=collaborations&openCollabByOffer=${offerId}`
              : `${gBase}?tab=collaborations`);
          break;
        case "circuit_deleted":
          router.push(collabId
            ? `${gBase}?tab=collaborations&openCollab=${collabId}`
            : circuitId
              ? `${gBase}?tab=collaborations&openCollabByCircuit=${circuitId}`
              : `${gBase}?tab=collaborations`);
          break;
        case "offer_schedule_changed":
          router.push(offerId
            ? `${gBase}?tab=collaborations&openCollabByOffer=${offerId}`
            : `${gBase}?tab=collaborations`);
          break;
        case "circuit_schedule_changed":
          router.push(circuitId
            ? `${gBase}?tab=collaborations&openCollabByCircuit=${circuitId}`
            : `${gBase}?tab=collaborations`);
          break;
        case "offer_schedule_conflict":
        case "circuit_schedule_conflict":
          router.push(`${gBase}?tab=agenda`);
          break;
        default:
          router.push(gBase);
      }
    } else if (role === "provider") {
      // ── Prestataire reçoit ces notifications ─────────────────────────
      switch (n.type) {
        case "collab_accepted":
        case "collab_declined":
        case "collab_quit":
          // Propriétaire circuit ou offre → quelqu'un a répondu à son invitation
          if (isCircuit) router.push(circuitId ? `${pBase}?tab=circuits&openCircuit=${circuitId}` : `${pBase}?tab=circuits`);
          else router.push(offerId ? `${pBase}?tab=offres&openOffer=${offerId}` : `${pBase}?tab=offres`);
          break;
        case "collaboration_invite":
          // Prestataire reçoit une invitation (collab sur offre d'un autre)
          router.push(collabId
            ? `${pBase}?tab=collaborations&openCollab=${collabId}`
            : `${pBase}?tab=collaborations`);
          break;
        case "collab_kicked":
          router.push(collabId
            ? `${pBase}?tab=collaborations&openCollab=${collabId}`
            : `${pBase}?tab=collaborations`);
          break;
        case "offer_deleted":
          router.push(collabId
            ? `${pBase}?tab=collaborations&openCollab=${collabId}`
            : offerId
              ? `${pBase}?tab=collaborations&openCollabByOffer=${offerId}`
              : `${pBase}?tab=collaborations`);
          break;
        case "circuit_deleted":
          router.push(`${pBase}?tab=circuits`);
          break;
        case "offer_schedule_changed":
          router.push(offerId
            ? `${pBase}?tab=collaborations&openCollabByOffer=${offerId}`
            : `${pBase}?tab=collaborations`);
          break;
        case "circuit_schedule_changed":
          router.push(circuitId ? `${pBase}?tab=circuits&openCircuit=${circuitId}` : `${pBase}?tab=circuits`);
          break;
        case "offer_schedule_conflict":
        case "circuit_schedule_conflict":
          router.push(`${pBase}?tab=agenda`);
          break;
        default:
          router.push(pBase);
      }
    }
  }

  const unreadCount = notifs.filter((n) => !n.is_read).length;
  const filtered = notifs.filter((n) => filter === "unread" ? !n.is_read : n.is_read);
  const groups = groupNotifs(filtered);
  const visibleIds = filtered.map((n) => n.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">

          <button onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Retour
          </button>

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

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white">
              <Leaf className="text-primary w-5 h-5" />
              <span className="text-sm font-extrabold tracking-tight">Éco-Voyage</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

          {/* Toolbar filtres + actions */}
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
            {/* Filtres */}
            <div className="flex gap-2">
              {([
                { key: "unread", label: `Non lu${unreadCount ? ` (${unreadCount})` : ""}` },
                { key: "read",   label: "Lu" },
              ] as { key: Filter; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => { setFilter(key); setSelectMode(false); setSelected(new Set()); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    filter === key
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Actions globales */}
            <div className="flex items-center gap-2">
              {!selectMode ? (
                <>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary border border-primary/30 hover:bg-primary/5 transition-colors">
                      <span className="material-symbols-outlined text-sm">done_all</span>
                      Tout marquer lu
                    </button>
                  )}
                  {notifs.length > 0 && (
                    <button onClick={() => setSelectMode(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <span className="material-symbols-outlined text-sm">checklist</span>
                      Sélectionner
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-sm">{allVisibleSelected ? "deselect" : "select_all"}</span>
                    {allVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  {someSelected && (
                    <button onClick={deleteSelected}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Supprimer ({selected.size})
                    </button>
                  )}
                  <button onClick={() => { setSelectMode(false); setSelected(new Set()); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                    Annuler
                  </button>
                </>
              )}
              {!selectMode && notifs.length > 0 && (
                <button onClick={() => setConfirmDeleteAll(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                  Tout supprimer
                </button>
              )}
            </div>
          </div>

          {/* ── Liste ─────────────────────────────────────────────────── */}
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
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="space-y-2">
                    {items.map((n) => {
                      const meta         = notifMeta(n);
                      const isDismissing = dismissed.has(n.id);
                      const isSelected   = selected.has(n.id);

                      return (
                        <div key={n.id}
                          style={{ transition: "opacity 0.3s, transform 0.3s", opacity: isDismissing ? 0 : 1, transform: isDismissing ? "translateX(40px)" : "none" }}
                          onClick={() => handleClick(n)}
                          className={`relative group bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden border transition-all hover:shadow-md cursor-pointer ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/20"
                              : n.is_read
                                ? "border-slate-100 dark:border-slate-800"
                                : "border-slate-200 dark:border-slate-700"
                          }`}>

                          {/* Bande colorée gauche */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${n.is_read ? "opacity-30" : "opacity-100"} ${meta.accent}`} />

                          <div className="pl-4 pr-4 py-4 flex gap-3 items-start">
                            {/* Checkbox en mode sélection */}
                            {selectMode && (
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"
                              }`}>
                                {isSelected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                              </div>
                            )}

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
                                  {!selectMode && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                                      className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all">
                                      <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                  )}
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

      {/* ── Modal confirmation supprimer tout ─────────────────────────── */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500">delete_sweep</span>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">Supprimer toutes les notifications</p>
                <p className="text-xs text-slate-400 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Les {notifs.length} notification{notifs.length > 1 ? "s" : ""} seront définitivement supprimée{notifs.length > 1 ? "s" : ""}.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAll(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={deleteAll}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
