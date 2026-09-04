"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart, MessageCircle, Share2, Send, Trash2, Check, X,
  UserCircle2, Copy, Link2, Search, Leaf,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type Author   = { user_id: string; full_name: string; photo: string | null; role: string };
type Reply    = { id: string; content: string; created_at: string; parent_id: string; author: Author; likes_count: number; liked_by_viewer: boolean };
type Comment  = { id: string; content: string; created_at: string; parent_id: string | null; author: Author; likes_count: number; liked_by_viewer: boolean; replies: Reply[] };
type Liker    = { user_id: string; full_name: string; photo: string | null; role: string };
type Contact  = { user_id: string; full_name: string | null; photo: string | null; role: string; conv_id?: string };

type Props = {
  pubId: string;
  token: string;
  viewerId: string;
  shareUrl: string;
  pubTitle?: string;
  /** API base for item-level endpoints. Default: "/publications"
   *  For offers: "/interactions/offer", for projects: "/interactions/project" */
  itemApiBase?: string;
  /** API base for comment-level endpoints. Default: same as itemApiBase
   *  For interactions module use "/interactions" */
  commentApiBase?: string;
  /** Extra content rendered inside the comments section (ex: contributions for LIEU) */
  extraContent?: React.ReactNode;
  /** Content shown in the collapsible contributions panel */
  contributionsContent?: React.ReactNode;
  /** Number of community contributions (shown in stats bar and button) */
  contributionsCount?: number;
};

const ROLE_LABEL: Record<string, string> = {
  eco_traveler: "Éco-Voyageur", guide: "Guide", provider: "Prestataire", project_owner: "Prestataire", admin: "Admin",
};
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

function avatar(photo: string | null, name: string) {
  return photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=d1fae5&color=065f46&bold=true&size=64`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function decodeRole(token: string): string {
  try { return JSON.parse(atob(token.split(".")[1])).role ?? ""; } catch { return ""; }
}

// ─── Comment Like Button ───────────────────────────────────────────────────────
function CommentLikeBtn({ commentId, initialLikes, initialLiked, token, cmtBase }: { commentId: string; initialLikes: number; initialLiked: boolean; token: string; cmtBase: string }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialLikes);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!token || pending) return;
    setPending(true);
    const was = liked; setLiked(!was); setCount((n) => n + (was ? -1 : 1));
    try {
      const res = await apiFetch<{ liked: boolean; count: number }>(
        `${cmtBase}/comments/${commentId}/like`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      setLiked(res.liked); setCount(res.count);
    } catch { setLiked(was); setCount((n) => n + (was ? 1 : -1)); }
    finally { setPending(false); }
  }

  return (
    <button onClick={toggle} disabled={!token}
      className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${liked ? "text-rose-500" : "text-slate-400 hover:text-rose-400"} disabled:opacity-40`}>
      <Heart size={11} fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 2} />
      {count > 0 && <span>{count}</span>}
      <span>J&apos;aime</span>
    </button>
  );
}

function profilePath(role: string, userId: string): string {
  if (role === "guide") return `/profile/guide/${userId}`;
  if (role === "eco_traveler") return `/profile/eco-traveler/${userId}`;
  return `/profile/provider/${userId}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PubInteractions({ pubId, token, viewerId, shareUrl, pubTitle, itemApiBase = "/publications", commentApiBase, extraContent, contributionsContent, contributionsCount }: Props) {
  const cmtBase = commentApiBase ?? itemApiBase;
  const router = useRouter();
  const [likes,           setLikes]           = useState(0);
  const [liked,           setLiked]           = useState(false);
  const [commentsCount,   setCommentsCount]   = useState(0);
  const [commentsOpen,    setCommentsOpen]    = useState(false);
  const [comments,        setComments]        = useState<Comment[]>([]);
  const [commentText,     setCommentText]     = useState("");
  const [sendingComment,  setSendingComment]  = useState(false);
  const [likePending,     setLikePending]     = useState(false);
  const [commentsLoaded,  setCommentsLoaded]  = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [likersOpen,      setLikersOpen]      = useState(false);
  const [likers,          setLikers]          = useState<Liker[]>([]);
  const [likersLoaded,    setLikersLoaded]    = useState(false);
  const [likersLoading,   setLikersLoading]   = useState(false);
  const [replyingToId,    setReplyingToId]    = useState<string | null>(null);
  const [replyText,       setReplyText]       = useState("");
  const [sendingReply,    setSendingReply]    = useState(false);

  // Share
  const [shareDropdown,   setShareDropdown]   = useState(false);
  const [shareModal,      setShareModal]      = useState(false);
  const [contacts,        setContacts]        = useState<Contact[]>([]);
  const [contactsLoaded,  setContactsLoaded]  = useState(false);
  const [contactSearch,   setContactSearch]   = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [shareMsg,        setShareMsg]        = useState("");
  const [sendingShare,    setSendingShare]    = useState(false);
  const [shareSent,       setShareSent]       = useState(false);
  const [contribOpen,     setContribOpen]     = useState(false);

  const [searchResults,   setSearchResults]   = useState<Contact[]>([]);
  const [searchLoading,   setSearchLoading]   = useState(false);

  const inputRef       = useRef<HTMLInputElement>(null);
  const replyRef       = useRef<HTMLInputElement>(null);
  const shareRef       = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pubId) return;
    const ac = new AbortController();
    const vp = viewerId ? `?viewer=${viewerId}` : "";
    fetch(`${API}${itemApiBase}/${pubId}/interactions${vp}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => { setLikes(d.likes ?? 0); setLiked(d.liked ?? false); setCommentsCount(d.commentsCount ?? 0); })
      .catch(() => {});
    return () => ac.abort();
  }, [pubId, viewerId]); // itemApiBase est stable (prop constante)

  // Close share dropdown on outside click
  useEffect(() => {
    if (!shareDropdown) return;
    function onClickOutside(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareDropdown(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [shareDropdown]);

  // ── Publication like ──────────────────────────────────────────────────────
  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation();
    if (!token || likePending) return;
    setLikePending(true);
    const was = liked; setLiked(!was); setLikes((n) => n + (was ? -1 : 1)); setLikersLoaded(false);
    try {
      const res = await apiFetch<{ liked: boolean; count: number }>(
        `${itemApiBase}/${pubId}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      setLiked(res.liked); setLikes(res.count);
    } catch { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); }
    finally { setLikePending(false); }
  }

  // ── Likers modal ──────────────────────────────────────────────────────────
  async function openLikers(e: React.MouseEvent) {
    e.stopPropagation();
    if (likes === 0) return;
    setLikersOpen(true);
    if (likersLoaded) return;
    setLikersLoading(true);
    try { const d = await apiFetch<Liker[]>(`${itemApiBase}/${pubId}/likes`); setLikers(d); setLikersLoaded(true); }
    catch {} finally { setLikersLoading(false); }
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  async function loadComments() {
    try {
      const vp = viewerId ? `?viewer=${viewerId}` : "";
      const data = await apiFetch<Comment[]>(`${itemApiBase}/${pubId}/comments${vp}`);
      setComments(data); setCommentsLoaded(true);
    } catch {}
  }

  async function toggleComments(e: React.MouseEvent) {
    e.stopPropagation();
    if (!commentsOpen && !commentsLoaded) await loadComments();
    setCommentsOpen((o) => !o);
    if (!commentsOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || !token) return;
    setSendingComment(true);
    try {
      const c = await apiFetch<Comment>(`${itemApiBase}/${pubId}/comments`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: text }),
      });
      setComments((prev) => [...prev, c]); setCommentsCount((n) => n + 1); setCommentText("");
    } catch {} finally { setSendingComment(false); }
  }

  async function deleteTopComment(commentId: string, repliesCount: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await apiFetch(`${cmtBase}/comments/${commentId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((n) => n - 1 - repliesCount);
    } catch {}
  }

  async function deleteReply(commentId: string, parentId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await apiFetch(`${cmtBase}/comments/${commentId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setComments((prev) => prev.map((c) => c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) } : c));
      setCommentsCount((n) => n - 1);
    } catch {}
  }

  // ── Replies ───────────────────────────────────────────────────────────────
  function openReply(commentId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setReplyingToId((prev) => prev === commentId ? null : commentId);
    setReplyText("");
    setTimeout(() => replyRef.current?.focus(), 100);
  }

  async function sendReply(parentId: string, e: React.FormEvent) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !token) return;
    setSendingReply(true);
    try {
      const reply = await apiFetch<Reply>(`${cmtBase}/comments/${parentId}/reply`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: text }),
      });
      setComments((prev) => prev.map((c) => c.id === parentId ? { ...c, replies: [...c.replies, reply] } : c));
      setCommentsCount((n) => n + 1); setReplyText(""); setReplyingToId(null);
    } catch {} finally { setSendingReply(false); }
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  function handleCopyLink(e: React.MouseEvent) {
    e.stopPropagation();
    setShareDropdown(false);
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    // Le partage n'était jusqu'ici qu'une copie dans le presse-papier : rien
    // ne le comptait. Best-effort, il ne doit pas gêner le geste s'il échoue.
    apiFetch(`${itemApiBase}/${pubId}/share`, { method: "POST" }).catch(() => {});
  }

  async function openShareModal(e: React.MouseEvent) {
    e.stopPropagation();
    setShareDropdown(false);
    setShareModal(true);
    setSelectedContact(null);
    setShareSent(false);
    setContactSearch("");
    setSearchResults([]);
    setShareMsg(pubTitle ? `📎 ${pubTitle}\n${shareUrl}` : shareUrl);
    if (contactsLoaded) return;
    // Fetch contacts: conversations + friends (eco_traveler) + followings (all roles)
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const role = decodeRole(token);
      const [convs, friends, followings] = await Promise.all([
        apiFetch<any[]>("/messages/conversations", { headers }).catch(() => []),
        role === "eco_traveler"
          ? apiFetch<any[]>("/eco-traveler/friends", { headers }).catch(() => [])
          : Promise.resolve([]),
        apiFetch<any[]>("/follows/following/profiles", { headers }).catch(() => []),
      ]);

      const seen = new Set<string>();
      const list: Contact[] = [];

      for (const c of convs) {
        if (!c.other_user?.user_id) continue;
        if (seen.has(c.other_user.user_id)) continue;
        seen.add(c.other_user.user_id);
        list.push({ user_id: c.other_user.user_id, full_name: c.other_user.full_name, photo: c.other_user.photo, role: c.other_user.role, conv_id: c.id });
      }
      for (const f of friends) {
        if (seen.has(f.user_id)) continue;
        seen.add(f.user_id);
        list.push({ user_id: f.user_id, full_name: f.full_name, photo: f.photo, role: "eco_traveler" });
      }
      for (const f of followings) {
        if (seen.has(f.user_id)) continue;
        seen.add(f.user_id);
        list.push({ user_id: f.user_id, full_name: f.full_name, photo: f.photo, role: f._type === "project" ? "provider" : f._type });
      }

      setContacts(list);
      setContactsLoaded(true);
    } catch {}
  }

  // Debounced server-side search when typing in share modal
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!contactSearch.trim() || !token || !shareModal) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const role = decodeRole(token);
      const q = encodeURIComponent(contactSearch.trim());
      try {
        const [travelers, guides, providers] = await Promise.all([
          apiFetch<any[]>(`/eco-traveler/search?q=${q}`, { headers }).catch(() => []),
          apiFetch<any[]>(`/guide/public/search?q=${q}`, { headers }).catch(() => []),
          apiFetch<any[]>(`/providers/search?q=${q}`, { headers }).catch(() => []),
        ]);
        const raw: Contact[] = [
          ...travelers.map((u: any) => ({ user_id: u.user_id, full_name: u.full_name, photo: u.photo, role: "eco_traveler" })),
          ...guides.map((u: any) => ({ user_id: u.user_id, full_name: u.full_name, photo: u.photo, role: "guide" })),
          ...providers.map((u: any) => ({ user_id: u.user_id, full_name: u.full_name, photo: u.photo, role: "provider" })),
        ].filter((u) => u.user_id !== viewerId);
        const seen = new Set<string>();
        setSearchResults(raw.filter((u) => { if (seen.has(u.user_id)) return false; seen.add(u.user_id); return true; }));
      } catch {} finally { setSearchLoading(false); }
    }, 300);
  }, [contactSearch, token, shareModal]);

  async function handleSendToContact() {
    if (!selectedContact || !shareMsg.trim() || sendingShare) return;
    setSendingShare(true);
    try {
      // Create or get conversation
      const conv = await apiFetch<{ id: string }>("/messages/conversations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient_id: selectedContact.user_id }),
      });
      // Send message
      await apiFetch("/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversation_id: conv.id, content: shareMsg }),
      });
      setShareSent(true);
      apiFetch(`${itemApiBase}/${pubId}/share`, { method: "POST" }).catch(() => {});
    } catch {} finally { setSendingShare(false); }
  }

  const isSearching = contactSearch.trim().length > 0;
  const displayedContacts = isSearching ? searchResults : contacts;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div onClick={(e) => e.stopPropagation()} className="border-t border-slate-100">

      {/* ── Stats bar ── */}
      {(likes > 0 || commentsCount > 0 || (contributionsCount ?? 0) > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-[12px] text-slate-500">
          <div>
            {likes > 0 && (
              <button onClick={openLikers} className="flex items-center gap-1 hover:underline hover:text-rose-500 transition-colors">
                <span className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center shadow-sm">
                  <Heart size={10} fill="white" strokeWidth={0} />
                </span>
                <span className="font-semibold">{likes}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(contributionsCount ?? 0) > 0 && contributionsContent && (
              <button
                onClick={() => setContribOpen((o) => !o)}
                className="flex items-center gap-1 font-medium text-emerald-600 hover:underline hover:text-emerald-700 transition-colors"
              >
                <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M17 8C8 10 5.9 16.17 3.82 22c3.67-4 8.53-5.12 12.18-5.12V22l7-7-7-7v3z"/></svg>
                </span>
                {contributionsCount} contribution{(contributionsCount ?? 0) > 1 ? "s" : ""}
              </button>
            )}
            {commentsCount > 0 && (
              <button onClick={toggleComments} className="hover:underline font-medium hover:text-blue-500 transition-colors">
                {commentsCount} commentaire{commentsCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="flex items-center border-t border-slate-50">
        <button onClick={handleLike} disabled={!token}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${liked ? "text-rose-500" : "text-slate-500 hover:text-rose-400 hover:bg-rose-50"} disabled:opacity-40`}>
          <Heart size={16} fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 2} />
          J&apos;aime
        </button>

        <div className="w-px h-5 bg-slate-100" />

        <button onClick={toggleComments}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${commentsOpen ? "text-blue-500 bg-blue-50/50" : "text-slate-500 hover:text-blue-400 hover:bg-blue-50/50"}`}>
          <MessageCircle size={16} />
          Commenter
        </button>

        <div className="w-px h-5 bg-slate-100" />

        {contributionsContent && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setContribOpen((o) => !o); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${
                contribOpen ? "text-emerald-600 bg-emerald-50/60" : "text-slate-500 hover:text-emerald-500 hover:bg-emerald-50/50"
              }`}
            >
              <Leaf size={16} />
              Contributions
            </button>
            <div className="w-px h-5 bg-slate-100" />
          </>
        )}

        {/* Share button with dropdown */}
        <div ref={shareRef} className="flex-1 relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShareDropdown((o) => !o); }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all ${copied ? "text-emerald-500" : shareDropdown ? "text-slate-700 bg-slate-50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
            {copied ? <Check size={16} /> : <Share2 size={16} />}
            {copied ? "Copié !" : "Partager"}
          </button>

          {/* Dropdown */}
          {shareDropdown && (
            <div className="absolute bottom-full mb-1 right-0 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10">
              <button onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                <Link2 size={14} className="text-slate-400 shrink-0" />
                Copier le lien
              </button>
              {token && (
                <button onClick={openShareModal}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-50">
                  <MessageCircle size={14} className="text-blue-400 shrink-0" />
                  Envoyer par message
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Comments section ── */}
      {commentsOpen && (
        <div className="border-t border-slate-50 bg-slate-50/40 px-4 pb-4 pt-3">
          <div className="space-y-4">
            {comments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3 font-medium">Aucun commentaire. Soyez le premier !</p>
            )}

            {comments.map((c) => (
              <div key={c.id}>
                <div className="flex gap-2.5 group">
                  <button onClick={() => router.push(profilePath(c.author.role, c.author.user_id))} className="w-8 h-8 shrink-0 mt-0.5 p-0 leading-none">
                    <img src={avatar(c.author.photo, c.author.full_name)} alt={c.author.full_name} className="w-8 h-8 rounded-full object-cover hover:opacity-80 transition-opacity" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl rounded-tl-none px-3 py-2 shadow-sm border border-slate-100/80 inline-block max-w-full">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <button onClick={() => router.push(profilePath(c.author.role, c.author.user_id))} className="text-[12px] font-extrabold text-slate-800 hover:underline">{c.author.full_name}</button>
                        <span className="text-[10px] text-slate-400 font-medium">{ROLE_LABEL[c.author.role] ?? c.author.role}</span>
                      </div>
                      <p className="text-[13px] text-slate-700 leading-relaxed mt-0.5">{c.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-medium">{fmtDate(c.created_at)}</span>
                      <span className="text-slate-200">·</span>
                      <CommentLikeBtn commentId={c.id} initialLikes={c.likes_count} initialLiked={c.liked_by_viewer} token={token} cmtBase={cmtBase} />
                      <span className="text-slate-200">·</span>
                      <button onClick={(e) => openReply(c.id, e)}
                        className={`text-[11px] font-bold transition-colors ${replyingToId === c.id ? "text-blue-500" : "text-slate-400 hover:text-blue-400"}`}>
                        Répondre
                      </button>
                      {c.author.user_id === viewerId && (
                        <><span className="text-slate-200">·</span>
                          <button onClick={(e) => deleteTopComment(c.id, c.replies.length, e)}
                            className="text-[11px] font-bold text-slate-300 hover:text-rose-400 transition-colors">Supprimer</button></>
                      )}
                    </div>

                    {/* Reply input */}
                    {replyingToId === c.id && token && (
                      <form onSubmit={(e) => sendReply(c.id, e)} className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <input ref={replyRef} type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Répondre à ${c.author.full_name}…`} maxLength={500}
                          className="flex-1 text-xs bg-white border border-slate-200 rounded-2xl px-3 py-1.5 outline-none focus:border-primary/40 transition-colors" />
                        <button type="submit" disabled={!replyText.trim() || sendingReply}
                          className="w-7 h-7 flex items-center justify-center rounded-2xl bg-primary text-slate-900 hover:bg-primary/80 disabled:opacity-40 shrink-0 self-center">
                          <Send size={12} strokeWidth={2.5} />
                        </button>
                      </form>
                    )}

                    {/* Replies */}
                    {c.replies.length > 0 && (
                      <div className="mt-3 ml-2 space-y-3 border-l-2 border-slate-100 pl-3">
                        {c.replies.map((r) => (
                          <div key={r.id} className="flex gap-2">
                            <button onClick={() => router.push(profilePath(r.author.role, r.author.user_id))} className="w-6 h-6 shrink-0 mt-0.5 p-0 leading-none">
                              <img src={avatar(r.author.photo, r.author.full_name)} alt={r.author.full_name} className="w-6 h-6 rounded-full object-cover hover:opacity-80 transition-opacity" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="bg-white rounded-2xl rounded-tl-none px-3 py-1.5 shadow-sm border border-slate-100/80 inline-block max-w-full">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <button onClick={() => router.push(profilePath(r.author.role, r.author.user_id))} className="text-[11px] font-extrabold text-slate-800 hover:underline">{r.author.full_name}</button>
                                  <span className="text-[10px] text-slate-400 font-medium">{ROLE_LABEL[r.author.role] ?? r.author.role}</span>
                                </div>
                                <p className="text-[12px] text-slate-700 leading-relaxed mt-0.5">{r.content}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 px-1 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-medium">{fmtDate(r.created_at)}</span>
                                <span className="text-slate-200">·</span>
                                <CommentLikeBtn commentId={r.id} initialLikes={r.likes_count} initialLiked={r.liked_by_viewer} token={token} cmtBase={cmtBase} />
                                {r.author.user_id === viewerId && (
                                  <><span className="text-slate-200">·</span>
                                    <button onClick={(e) => deleteReply(r.id, c.id, e)}
                                      className="text-[11px] font-bold text-slate-300 hover:text-rose-400 transition-colors">Supprimer</button></>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Extra content (ex: contributions pour les lieux) */}
          {extraContent && (
            <div className="mt-3">
              {extraContent}
            </div>
          )}

          {/* New comment input */}
          {token ? (
            <form onSubmit={sendComment} className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              <input ref={inputRef} type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                placeholder="Écrire un commentaire…" maxLength={500}
                className="flex-1 text-xs bg-white border border-slate-200 rounded-2xl px-3 py-2 outline-none focus:border-primary/40 transition-colors shadow-sm" />
              <button type="submit" disabled={!commentText.trim() || sendingComment}
                className="w-8 h-8 flex items-center justify-center rounded-2xl bg-primary text-slate-900 hover:bg-primary/80 disabled:opacity-40 transition-colors shrink-0 self-center">
                <Send size={13} strokeWidth={2.5} />
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-400 text-center mt-3 font-medium">
              <a href="/auth/login" className="text-primary font-bold hover:underline">Connectez-vous</a> pour commenter
            </p>
          )}
        </div>
      )}

      {/* ── Contributions panel — always mounted so count loads, hidden when closed ── */}
      {contributionsContent && (
        <div style={{ display: contribOpen ? undefined : "none" }} onClick={(e) => e.stopPropagation()}>
          {contributionsContent}
        </div>
      )}

      {/* ── Likers modal ── */}
      {likersOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLikersOpen(false)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-rose-500 flex items-center justify-center shadow">
                  <Heart size={13} fill="white" strokeWidth={0} />
                </span>
                <h3 className="font-extrabold text-slate-800 text-base">{likes} {likes === 1 ? "J'aime" : "J'aimes"}</h3>
              </div>
              <button onClick={() => setLikersOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"><X size={16} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {likersLoading && (
                <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-rose-400 animate-spin" />
                  <span className="text-xs font-medium">Chargement…</span>
                </div>
              )}
              {!likersLoading && likers.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-sm">
                  <UserCircle2 size={32} className="mx-auto mb-2 text-slate-200" />
                  Aucun J&apos;aime pour l&apos;instant
                </div>
              )}
              {!likersLoading && likers.map((l) => (
                <button key={l.user_id} onClick={() => { setLikersOpen(false); router.push(profilePath(l.role, l.user_id)); }}
                  className="w-full flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors text-left">
                  <img src={avatar(l.photo, l.full_name)} alt={l.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 text-sm truncate hover:underline">{l.full_name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{ROLE_LABEL[l.role] ?? l.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Share via message modal ── */}
      {shareModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setShareModal(false); setShareSent(false); }}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Share2 size={16} className="text-primary" />
                Envoyer par message
              </h3>
              <button onClick={() => { setShareModal(false); setShareSent(false); }} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500"><X size={16} /></button>
            </div>

            {shareSent ? (
              /* ── Success ── */
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <Check size={28} className="text-emerald-500" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-lg mb-1">Publication envoyée !</h4>
                <p className="text-sm text-slate-500 mb-6">Le message a bien été envoyé à <span className="font-bold text-slate-700">{selectedContact?.full_name}</span>.</p>
                <button onClick={() => { setShareModal(false); setShareSent(false); }}
                  className="px-6 py-2.5 bg-primary text-slate-900 font-bold rounded-2xl text-sm hover:bg-primary/90">Fermer</button>
              </div>
            ) : (
              <>
                {/* Contact picker */}
                {!selectedContact ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Search */}
                    <div className="px-4 py-3 border-b border-slate-50 shrink-0">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input type="text" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)}
                          placeholder="Rechercher un contact…"
                          className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-primary/40 transition-colors" />
                      </div>
                    </div>

                    {/* Contact list */}
                    <div className="flex-1 overflow-y-auto">
                      {(!contactsLoaded && !isSearching) && (
                        <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
                          <span className="text-xs">Chargement des contacts…</span>
                        </div>
                      )}
                      {searchLoading && (
                        <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
                          <span className="text-xs">Recherche…</span>
                        </div>
                      )}
                      {!searchLoading && (contactsLoaded || isSearching) && displayedContacts.length === 0 && (
                        <div className="py-10 text-center text-slate-400 px-6">
                          <UserCircle2 size={36} className="mx-auto mb-3 text-slate-200" />
                          <p className="text-sm font-semibold text-slate-500">
                            {isSearching ? "Aucun résultat" : "Aucun contact"}
                          </p>
                          <p className="text-xs mt-1">
                            {isSearching ? "Essayez un autre nom." : "Tapez un nom dans la barre de recherche pour trouver quelqu'un."}
                          </p>
                        </div>
                      )}
                      {!searchLoading && displayedContacts.map((c) => (
                        <button key={c.user_id} onClick={() => setSelectedContact(c)}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left">
                          <img src={avatar(c.photo, c.full_name ?? "?")} alt={c.full_name ?? ""} className="w-10 h-10 rounded-full object-cover shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-slate-800 text-sm truncate">{c.full_name}</p>
                            <p className="text-[11px] text-slate-400 font-medium">{ROLE_LABEL[c.role] ?? c.role}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── Compose message ── */
                  <div className="flex-1 flex flex-col p-5 gap-4">
                    {/* Selected contact */}
                    <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3">
                      <img src={avatar(selectedContact.photo, selectedContact.full_name ?? "?")} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm truncate">{selectedContact.full_name}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{ROLE_LABEL[selectedContact.role] ?? selectedContact.role}</p>
                      </div>
                      <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-slate-600 p-1">
                        <X size={14} />
                      </button>
                    </div>

                    {/* Message preview */}
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Message</label>
                      <textarea value={shareMsg} onChange={(e) => setShareMsg(e.target.value)} rows={4}
                        className="w-full text-xs bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed"
                        onClick={(e) => e.stopPropagation()} />
                    </div>

                    {/* Send button */}
                    <button onClick={handleSendToContact} disabled={!shareMsg.trim() || sendingShare}
                      className="w-full py-3 bg-primary text-slate-900 font-extrabold rounded-2xl text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                      {sendingShare
                        ? <><div className="w-4 h-4 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" /> Envoi…</>
                        : <><Send size={14} /> Envoyer</>}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
