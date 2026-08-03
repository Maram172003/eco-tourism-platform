"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, MessageSquare, Search, X, MoreVertical, Trash2, ShieldBan } from "lucide-react";
import { apiFetch } from "@/lib/api";

type OtherUser = {
  user_id: string;
  full_name: string | null;
  photo: string | null;
  role: string;
};

type Conversation = {
  id: string;
  other_user: OtherUser;
  last_message: { content: string; created_at: string; is_mine: boolean } | null;
  unread_count: number;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_mine: boolean;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

function roleLabel(role: string) {
  if (role === "eco_traveler") return "Éco-Voyageur";
  if (role === "guide") return "Guide";
  if (role === "project_owner") return "Prestataire";
  return role;
}

function Avatar({ photo, name, size = 10 }: { photo: string | null; name: string | null; size?: number }) {
  const sz = `w-${size} h-${size}`;
  return (
    <div className={`${sz} rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0`}>
      {photo
        ? <img src={photo} alt={name ?? ""} className="w-full h-full object-cover" />
        : <span className="material-symbols-outlined text-slate-400" style={{ fontSize: size * 4 * 0.55 }}>person</span>
      }
    </div>
  );
}

type PendingConv = { recipientId: string; name: string; photo: string; role: string };
type Contact = { user_id: string; full_name: string | null; photo: string | null; role: string; source: "friend" | "following" | "suggestion" };

export default function MessageriePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [myId, setMyId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [pending, setPending] = useState<PendingConv | null>(null); // chat en attente
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [myRole, setMyRole] = useState("");
  const [connections, setConnections] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [convMenu, setConvMenu] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tkn = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
    if (!tkn) { router.push("/auth/login"); return; }
    setToken(tkn);
    let viewerRole = "";
    try { const p = JSON.parse(atob(tkn.split(".")[1])); setMyId(p.sub ?? ""); viewerRole = p.role ?? ""; setMyRole(viewerRole); } catch {}

    // Charger amis (eco-traveler) + suivis
    const headers = { Authorization: `Bearer ${tkn}` };
    const contactsPromises: Promise<Contact[]>[] = [];
    if (viewerRole === "eco_traveler") {
      contactsPromises.push(
        apiFetch<{ user_id: string; full_name: string; photo: string | null }[]>("/eco-traveler/friends", { headers })
          .then((list) => list.map((f) => ({ user_id: f.user_id, full_name: f.full_name, photo: f.photo, role: "eco_traveler", source: "friend" as const })))
          .catch(() => [])
      );
    }
    contactsPromises.push(
      apiFetch<{ user_id: string; full_name: string | null; photo: string | null; _type: string }[]>("/follows/following/profiles", { headers })
        .then((list) => list.map((f) => ({ user_id: f.user_id, full_name: f.full_name, photo: f.photo, role: f._type === "project" ? "project_owner" : f._type, source: "following" as const })))
        .catch(() => [])
    );
    Promise.all(contactsPromises).then((results) => {
      const merged = results.flat();
      const seen = new Set<string>();
      setConnections(merged.filter((c) => { if (seen.has(c.user_id)) return false; seen.add(c.user_id); return true; }));
    });

    const params = new URLSearchParams(window.location.search);
    const convId    = params.get("conv");
    const recipient = params.get("recipient");
    const name      = params.get("name") ?? "";
    const role      = params.get("role") ?? "";

    apiFetch<Conversation[]>("/messages/conversations", { headers: { Authorization: `Bearer ${tkn}` } })
      .then(async (list) => {
        setConversations(list);
        if (convId) {
          // Ouvrir une conversation existante par ID
          const target = list.find((c) => c.id === convId);
          if (target) { setSelected(target); return; }
          try {
            const fresh = await apiFetch<Conversation>(`/messages/conversations/${convId}`, { headers: { Authorization: `Bearer ${tkn}` } });
            setConversations((prev) => [fresh, ...prev]);
            setSelected(fresh);
          } catch {}
        } else if (recipient) {
          // Chercher si une conversation existe déjà avec ce destinataire
          const existing = list.find(
            (c) => c.other_user.user_id === recipient
          );
          if (existing) {
            setSelected(existing);
          } else {
            // Afficher un chat vide sans créer de conversation en DB
            setPending({ recipientId: recipient, name: decodeURIComponent(name), photo: "", role });
          }
        }
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Recherche debounced — API + filtre connexions
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!search.trim() || !token) { setSearchResults([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    searchRef.current = setTimeout(async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const q = encodeURIComponent(search.trim());
      const [travelers, guides, owners] = await Promise.all([
        myRole === "eco_traveler"
          ? apiFetch<{ user_id: string; full_name: string; photo: string | null }[]>(`/eco-traveler/search?q=${q}`, { headers }).catch(() => [])
          : Promise.resolve([]),
        apiFetch<{ user_id: string; full_name: string; photo: string | null }[]>(`/guide/public/search?q=${q}`, { headers }).catch(() => []),
        apiFetch<{ user_id: string; full_name: string; photo: string | null }[]>(`/project-owner/public/search?q=${q}`, { headers }).catch(() => []),
      ]);
      const connIds = new Set(connections.map((c) => c.user_id));
      const convIds = new Set(conversations.map((c) => c.other_user.user_id));
      const results: Contact[] = [
        ...travelers.map((u) => ({ ...u, role: "eco_traveler", source: connIds.has(u.user_id) ? "friend" as const : "suggestion" as const })),
        ...guides.map((u) => ({ ...u, role: "guide", source: connIds.has(u.user_id) ? "following" as const : "suggestion" as const })),
        ...owners.map((u) => ({ ...u, role: "project_owner", source: connIds.has(u.user_id) ? "following" as const : "suggestion" as const })),
      ].filter((u) => u.user_id !== myId);
      const seen = new Set<string>();
      setSearchResults(results.filter((u) => { if (seen.has(u.user_id)) return false; seen.add(u.user_id); return true; }));
      setSearchLoading(false);
    }, 300);
  }, [search, token]);

  useEffect(() => {
    if (!selected || !token) return;
    setMsgLoading(true);
    apiFetch<Message[]>(`/messages/conversations/${selected.id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((msgs) => { setMessages(msgs); setMsgLoading(false); }).catch(() => setMsgLoading(false));

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      apiFetch<Message[]>(`/messages/conversations/${selected.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(setMessages).catch(() => {});
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected?.id, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function deleteConversation(convId: string) {
    try {
      await apiFetch(`/messages/conversations/${convId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (selected?.id === convId) setSelected(null);
    setConvMenu(null);
  }

  async function blockFromConversation(conv: Conversation) {
    try {
      await apiFetch(`/eco-traveler/block/${conv.other_user.user_id}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    setConversations((prev) => prev.filter((c) => c.id !== conv.id));
    if (selected?.id === conv.id) setSelected(null);
    setConvMenu(null);
  }

  async function send() {
    if (!draft.trim() || (!selected && !pending) || sending) return;
    setSending(true);
    try {
      let convId = selected?.id ?? "";

      // Si conversation en attente → la créer maintenant (premier message)
      if (pending && !selected) {
        const conv = await apiFetch<{ id: string }>("/messages/conversations", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ recipient_id: pending.recipientId }),
        });
        convId = conv.id;
        const newConv: Conversation = {
          id: conv.id,
          other_user: { user_id: pending.recipientId, full_name: pending.name, photo: pending.photo || null, role: pending.role },
          last_message: null,
          unread_count: 0,
        };
        setConversations((prev) => [newConv, ...prev]);
        setSelected(newConv);
        setPending(null);
      }

      const msg = await apiFetch<Message>("/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversation_id: convId, content: draft.trim() }),
      });
      setMessages((p) => [...p, msg]);
      setDraft("");
      setConversations((prev) => prev.map((c) =>
        c.id === convId
          ? { ...c, last_message: { content: draft.trim(), created_at: new Date().toISOString(), is_mine: true } }
          : c
      ));
    } catch {} finally { setSending(false); }
  }

  const filtered = conversations.filter((c) =>
    (c.other_user.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Nav */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-primary" />
          <span className="font-extrabold text-slate-900 text-base">Messagerie</span>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex gap-4 items-start">

        {/* ── LEFT: Conversation list ── */}
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden ${selected ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0`} style={{ height: "calc(100vh - 120px)" }}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors"
              />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={13} /></button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" onClick={() => setConvMenu(null)}>
            {/* ── Mode recherche ── */}
            {search.trim() ? (
              searchLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400 font-medium">
                  <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Recherche…
                </div>
              ) : searchResults.length === 0 && connections.filter((c) => (c.full_name ?? "").toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <div className="text-center py-10 px-4">
                  <p className="text-sm text-slate-400 font-medium">Aucun résultat pour « {search} »</p>
                </div>
              ) : (() => {
                const q = search.toLowerCase();
                const matchedConns = connections.filter((c) => (c.full_name ?? "").toLowerCase().includes(q));
                const connIds = new Set(matchedConns.map((c) => c.user_id));
                const suggestions = searchResults.filter((r) => !connIds.has(r.user_id) && r.source === "suggestion");
                const sourceLabel = (s: Contact["source"]) => s === "friend" ? "Ami" : s === "following" ? "Suivi(e)" : "";
                const roleColor = (r: string) => r === "eco_traveler" ? "bg-teal-50 text-teal-700" : r === "guide" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
                const roleLabel2 = (r: string) => r === "eco_traveler" ? "Éco-Voyageur" : r === "guide" ? "Guide" : "Prestataire";
                const openChat = (u: Contact) => {
                  const existing = conversations.find((c) => c.other_user.user_id === u.user_id);
                  if (existing) { setSelected(existing); setPending(null); setSearch(""); }
                  else { setPending({ recipientId: u.user_id, name: u.full_name ?? "", photo: u.photo ?? "", role: u.role }); setSelected(null); setSearch(""); }
                };
                return (
                  <div>
                    {matchedConns.length > 0 && (
                      <>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Amis & Suivis</p>
                        {matchedConns.map((u) => (
                          <button key={u.user_id} onClick={() => openChat(u)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                              {u.photo ? <img src={u.photo} alt={u.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{u.full_name ?? "—"}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${roleColor(u.role)}`}>{roleLabel2(u.role)}</span>
                                {sourceLabel(u.source) && <span className="text-[10px] text-slate-400 font-medium">{sourceLabel(u.source)}</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {suggestions.length > 0 && (
                      <>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Suggestions</p>
                        {suggestions.map((u) => (
                          <button key={u.user_id} onClick={() => openChat(u)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                              {u.photo ? <img src={u.photo} alt={u.full_name ?? ""} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-slate-400 text-base">person</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{u.full_name ?? "—"}</p>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${roleColor(u.role)}`}>{roleLabel2(u.role)}</span>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                );
              })()
            ) : null}

            {/* ── Mode liste conversations ── */}
            {!search.trim() && (loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                    <div className="h-2.5 bg-slate-100 rounded-full w-1/2" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-4 text-center">
                <MessageSquare size={36} className="text-slate-200" />
                <p className="text-sm text-slate-400 font-medium">Aucune conversation</p>
                <p className="text-xs text-slate-300">Vos échanges apparaîtront ici</p>
              </div>
            ) : (
              filtered.map((c) => (
                <div key={c.id} className={`relative flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors ${selected?.id === c.id ? "bg-primary/5 border-l-2 border-primary" : ""}`}>
                  {/* Zone cliquable principale */}
                  <button onClick={() => { setSelected(c); setConvMenu(null); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="relative shrink-0">
                      <Avatar photo={c.other_user.photo} name={c.other_user.full_name} size={10} />
                      {c.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[9px] font-black text-slate-900 flex items-center justify-center">
                          {c.unread_count > 9 ? "9+" : c.unread_count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${c.unread_count > 0 ? "font-extrabold text-slate-900" : "font-bold text-slate-700"}`}>
                          {c.other_user.full_name ?? "—"}
                        </p>
                        {c.last_message && (
                          <span className="text-[10px] text-slate-400 font-medium shrink-0">
                            {timeAgo(c.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {c.last_message
                          ? `${c.last_message.is_mine ? "Vous : " : ""}${c.last_message.content}`
                          : <span className="italic">{roleLabel(c.other_user.role)}</span>
                        }
                      </p>
                    </div>
                  </button>

                  {/* Trois points */}
                  <div className="relative shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setConvMenu(convMenu === c.id ? null : c.id); }}
                      className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreVertical size={15} />
                    </button>
                    {convMenu === c.id && (
                      <div className="absolute right-0 top-8 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 z-30 overflow-hidden py-1">
                        <button onClick={() => deleteConversation(c.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} /> Supprimer
                        </button>
                        <button onClick={() => blockFromConversation(c)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors">
                          <ShieldBan size={14} /> Bloquer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ))}
          </div>
        </div>

        {/* ── RIGHT: Chat view ── */}
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden flex-1 ${(selected || pending) ? "flex" : "hidden md:flex"}`} style={{ height: "calc(100vh - 120px)" }}>
          {!selected && !pending ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquare size={28} className="text-primary" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-base">Sélectionnez une conversation</p>
                <p className="text-sm text-slate-400 mt-1">Choisissez une conversation dans la liste pour commencer à échanger</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
                <button onClick={() => { setSelected(null); setPending(null); }} className="md:hidden w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center mr-1">
                  <ArrowLeft size={16} className="text-slate-600" />
                </button>
                <button
                  onClick={() => {
                    const role = selected?.other_user.role ?? pending?.role ?? "";
                    const uid = selected?.other_user.user_id ?? pending?.recipientId ?? "";
                    if (!uid) return;
                    const path = role === "guide" ? `/profile/guide/${uid}` : role === "eco_traveler" ? `/profile/eco-traveler/${uid}` : `/profile/provider/${uid}`;
                    router.push(path);
                  }}
                  className="hover:opacity-80 transition-opacity shrink-0"
                >
                  <Avatar photo={selected?.other_user.photo ?? pending?.photo ?? null} name={selected?.other_user.full_name ?? pending?.name ?? null} size={10} />
                </button>
                <button
                  onClick={() => {
                    const role = selected?.other_user.role ?? pending?.role ?? "";
                    const uid = selected?.other_user.user_id ?? pending?.recipientId ?? "";
                    if (!uid) return;
                    const path = role === "guide" ? `/profile/guide/${uid}` : role === "eco_traveler" ? `/profile/eco-traveler/${uid}` : `/profile/provider/${uid}`;
                    router.push(path);
                  }}
                  className="text-left hover:opacity-80 transition-opacity"
                >
                  <p className="font-extrabold text-slate-800 text-sm hover:underline">{selected?.other_user.full_name ?? pending?.name ?? "—"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{roleLabel(selected?.other_user.role ?? pending?.role ?? "")}</p>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {msgLoading ? (
                  <div className="flex justify-center pt-8">
                    <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                    <p className="text-sm text-slate-400 font-medium">
                      {pending ? `Démarrez la conversation avec ${pending.name}` : "Aucun message"}
                    </p>
                    <p className="text-xs text-slate-300">Écrivez votre premier message ci-dessous</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                        msg.is_mine
                          ? "bg-primary text-slate-900 rounded-br-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-sm"
                      }`}>
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {msg.content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                            /^https?:\/\//.test(part) ? (
                              <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                                className={`underline break-all ${msg.is_mine ? "text-slate-900 hover:text-slate-700" : "text-blue-600 hover:text-blue-800"}`}>
                                {part}
                              </a>
                            ) : <span key={i}>{part}</span>
                          )}
                        </p>
                        <p className={`text-[10px] mt-1 ${msg.is_mine ? "text-slate-700/70 text-right" : "text-slate-400"}`}>
                          {timeAgo(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Écrivez un message…"
                    rows={1}
                    className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-colors max-h-32"
                    style={{ minHeight: 48 }}
                  />
                  <button onClick={send} disabled={!draft.trim() || sending}
                    className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 shrink-0">
                    <Send size={16} className="text-slate-900" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
