"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Plus, MapPin, ArrowRight } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import BadgeGrid from "@/components/common/BadgeGrid";
import SharedAddPublicationModal from "@/components/publication/AddPublicationModal";
import ViewPublicationModal from "@/components/publication/ViewPublicationModal";
import PubInteractions from "@/components/PubInteractions";
import BadgeChip from "@/components/common/BadgeChip";

type Publication = {
  id: string;
  type: "experience" | "place";
  title: string;
  description: string | null;
  place_name: string | null;
  region: string | null;
  images: string[] | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  rejection_reason?: string | null;
  created_at: string;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  id: string;
  email: string;
  role: string;
  status: string;
  full_name: string;
};

type Badge = {
  label: string;
  obtained_at: string;
};

type EcoProfile = {
  // Identité
  full_name: string;
  photo: string | null;
  country: string | null;
  language: string | null;
  profile_completion: number;
  is_onboarded: boolean;

  // Score final + 4 composants (spec Éco-Voyage)
  sustainability_score: number | null;
  score_questionnaire: number | null;  // 20%
  score_reservations: number;          // 40%
  score_feedbacks: number;             // 20%
  score_partages: number;              // 20%

  // MongoDB engagement
  badges: Badge[];
  feedback_given: number;
  plans_shared: number;
  reservations_made: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreLabel(score: number | null): string {
  if (score === null) return "—";
  if (score >= 80) return "Ambassadeur durable";
  if (score >= 60) return "Écovoyageur engagé";
  if (score >= 40) return "Voyageur sensible";
  return "Voyageur classique";
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-slate-400";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

function getBarColor(score: number | null): string {
  if (score === null) return "bg-slate-300";
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-primary";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-400";
}

// ─── Config des badges (tous les badges possibles de la plateforme) ────────────

// ─── Composant Score Décomposé ────────────────────────────────────────────────

function ScoreBreakdown({ profile }: { profile: EcoProfile }) {
  const components = [
    {
      label: "Questionnaire",
      weight: "20%",
      value: profile.score_questionnaire,
      color: "bg-green-500",
      sprint: null,
    },
    {
      label: "Réservations",
      weight: "40%",
      value: profile.score_reservations,
      color: "bg-blue-500",
    },
    {
      label: "Feedbacks",
      weight: "20%",
      value: profile.score_feedbacks,
      color: "bg-orange-400",
    },
    {
      label: "Partages",
      weight: "20%",
      value: profile.score_partages,
      color: "bg-purple-400",
    },
  ];

  return (
    <div className="mt-4 space-y-2.5">
      {components.map((c) => (
        <div key={c.label}>
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">{c.label}</span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {c.weight}
              </span>
            </div>
            <span className="text-xs font-extrabold text-slate-700">
              {c.value !== null && c.value !== undefined ? `${c.value}%` : "—"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${c.color} rounded-full transition-all duration-700`}
              style={{ width: `${c.value ?? 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function EcoVoyageurDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EcoProfile | null>(null);
  const [activeItem, setActiveItem] = useState("Tableau de bord");
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [showAddPub, setShowAddPub] = useState(false);
  const [pubType, setPubType] = useState<"experience" | "place">("experience");
  const [viewPub, setViewPub] = useState<Publication | null>(null);
  const [token, setToken] = useState<string>("");

  const navItems: { label: string; icon: string; action: () => void }[] = [
    { label: "Tableau de bord", icon: "dashboard",   action: () => setActiveItem("Tableau de bord") },
    { label: "Explorer",        icon: "explore",      action: () => router.push("/explorer") },
    { label: "Expériences",     icon: "auto_stories", action: () => setActiveItem("Expériences") },
    { label: "Lieux",           icon: "location_on",  action: () => setActiveItem("Lieux") },
    { label: "Séjour",          icon: "hotel",        action: () => router.push("/offers") },
    { label: "Réservations",    icon: "book_online",  action: () => router.push("/dashboard/ecovoyageur/reservations") },
    { label: "Paramètres",      icon: "settings",     action: () => router.push("/dashboard/profile") },
    { label: "Messagerie",      icon: "forum",        action: () => router.push("/messagerie") },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");

    if (!storedUser || !token) { router.push("/auth/login"); return; }
    setToken(token);

    try {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.role !== "eco_traveler") { router.push("/auth/login"); return; }

      // Version antérieure du tableau de bord : `/dashboard` porte désormais
      // les expériences et les lieux. On y renvoie plutôt que d'afficher un
      // second écran incomplet. Ses sous-pages de réservations restent en place.
      router.replace("/dashboard");
      return;
      setUser(parsedUser);

      apiFetch<EcoProfile>("/eco-traveler/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((p) => {
          setProfile(p);
          if (!p?.is_onboarded) router.push("/onboarding/eco-traveler");
        })
        .catch(() => router.push("/onboarding/eco-traveler"));

      apiFetch<Publication[]>("/publications/mine", {
        headers: { Authorization: `Bearer ${token}` },
      }).then(setPublications).catch(() => {});
    } catch {
      router.push("/auth/login");
    }
  }, [router]);

  async function handleLogout() {
    const token = localStorage.getItem("access_token");
    try { if (token) await logoutUser(token); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  }

  const score = profile?.sustainability_score ?? null;
  const scoreWidth = score !== null ? `${score}%` : "0%";

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
                  onClick={item.action}
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

            {/* Profile completion */}
            {profile && (
              <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Profil complété</p>
                  <p className="text-xs font-extrabold text-primary">{profile.profile_completion}%</p>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${profile.profile_completion}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => router.push("/questionnaire/eco-traveler")}
              className="mt-4 w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add_location_alt</span>
              Réserver un voyage
            </button>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="flex-1 ml-72">

          {/* Header */}
          <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-primary/10 px-10 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-12 shrink-0">
              <h2 className="text-2xl font-bold whitespace-nowrap">
                Bonjour, {profile?.full_name || user?.full_name || "Voyageur"}
              </h2>
              <BadgeChip role="eco_traveler" fallback={score !== null ? getScoreLabel(score) : "Nouveau voyageur"} />
            </div>

            <div className="flex items-center gap-6 flex-1 justify-end">
              <div className="relative w-full max-w-md">
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Rechercher une expérience, un lieu…"
                />
                <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl">search</span>
              </div>

              <button className="size-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary transition-colors shrink-0">
                <span className="material-symbols-outlined">notifications</span>
              </button>

              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />

              {/* Avatar avec photo de profil */}
              <button onClick={() => router.push("/profile/ecovoyageur")}
                className="size-11 rounded-full bg-slate-200 border-2 border-primary overflow-hidden shrink-0 hover:opacity-80 transition-opacity" title="Voir mon profil">
                {profile?.photo ? (
                  <img src={profile.photo} alt="Photo de profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/20">
                    <span className="material-symbols-outlined text-primary text-xl">person</span>
                  </div>
                )}
              </button>
            </div>
          </header>

          <div className="p-8">

            {/* ── Section Expériences ──────────────────────────────────── */}
            {activeItem === "Expériences" && (() => {
              const experiences = publications.filter((p) => p.type === "experience");
              return (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Mes Expériences</h3>
                    <button onClick={() => { setPubType("experience"); setShowAddPub(true); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                      <Plus className="w-4 h-4" />Partager une expérience
                    </button>
                  </div>
                  {experiences.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                      <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">hiking</span>
                      <p className="font-bold text-slate-500">Aucune expérience partagée</p>
                      <p className="text-sm text-slate-400 mt-1">Racontez vos aventures éco-touristiques.</p>
                      <button onClick={() => { setPubType("experience"); setShowAddPub(true); }}
                        className="mt-4 px-5 py-2.5 bg-teal-50 text-teal-700 font-bold rounded-xl text-sm hover:bg-teal-100 transition-colors">
                        Partager une expérience
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {experiences.map((pub) => (
                        <div key={pub.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/90 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                          <div className="flex flex-col lg:flex-row">
                            <div className="lg:w-2/5 relative min-h-[180px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
                              {pub.images?.[0] ? <img src={pub.images[0]} alt={pub.title} className="absolute inset-0 w-full h-full object-cover" /> : (
                                <><div className="absolute inset-0 opacity-85 bg-gradient-to-br from-teal-500 to-emerald-400" /><span className="material-symbols-outlined text-white/35 relative z-10" style={{ fontSize: 90 }}>hiking</span></>
                              )}
                              <div className="absolute top-3 left-3 z-10 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border bg-white/90 text-slate-700 border-white/40">Expérience</div>
                            </div>
                            <div className="lg:w-3/5 p-6 flex flex-col justify-between">
                              <div>
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight mb-1">{pub.title}</h3>
                                {(pub.place_name || pub.region) && (
                                  <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold mb-3"><MapPin size={11} className="text-primary shrink-0" />{[pub.place_name, pub.region].filter(Boolean).join(", ")}</div>
                                )}
                                {pub.description && <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{pub.description}</p>}
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
                                <p className="text-[11px] font-bold text-slate-400">{new Date(pub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                                <div className="flex items-center gap-3">
                                  {pub.status === "approved" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publié</span>}
                                  {pub.status === "pending" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">En attente</span>}
                                  {pub.status === "rejected" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">Refusé</span>}
                                  <button onClick={() => setViewPub(pub)} className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                                    Voir les détails <ArrowRight size={14} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          {pub.status === "approved" && (
                            <PubInteractions
                              pubId={pub.id}
                              token={token}
                              viewerId={user?.id ?? ""}
                              shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/publications/${pub.id}`}
                              pubTitle={pub.title}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Section Lieux ────────────────────────────────────────── */}
            {activeItem === "Lieux" && (() => {
              const lieux = publications.filter((p) => p.type === "place");
              return (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Mes Lieux</h3>
                    <button onClick={() => { setPubType("place"); setShowAddPub(true); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm">
                      <Plus className="w-4 h-4" />Recommander un lieu
                    </button>
                  </div>
                  {lieux.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                      <MapPin className="text-slate-300 w-12 h-12 mb-3" />
                      <p className="font-bold text-slate-500">Aucun lieu recommandé</p>
                      <p className="text-sm text-slate-400 mt-1">Partagez des endroits éco-touristiques remarquables.</p>
                      <button onClick={() => { setPubType("place"); setShowAddPub(true); }}
                        className="mt-4 px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors">
                        Recommander un lieu
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {lieux.map((pub) => (
                        <div key={pub.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100/90 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                          <div className="flex flex-col lg:flex-row">
                            <div className="lg:w-2/5 relative min-h-[180px] bg-slate-50 flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100">
                              {pub.images?.[0] ? <img src={pub.images[0]} alt={pub.title} className="absolute inset-0 w-full h-full object-cover" /> : (
                                <><div className="absolute inset-0 opacity-85 bg-gradient-to-br from-blue-500 to-cyan-400" /><span className="material-symbols-outlined text-white/35 relative z-10" style={{ fontSize: 90 }}>location_on</span></>
                              )}
                              <div className="absolute top-3 left-3 z-10 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl shadow border bg-white/90 text-slate-700 border-white/40">Lieu</div>
                            </div>
                            <div className="lg:w-3/5 p-6 flex flex-col justify-between">
                              <div>
                                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight mb-1">{pub.title}</h3>
                                {(pub.place_name || pub.region) && (
                                  <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold mb-3"><MapPin size={11} className="text-primary shrink-0" />{[pub.place_name, pub.region].filter(Boolean).join(", ")}</div>
                                )}
                                {pub.description && <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{pub.description}</p>}
                              </div>
                              <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
                                <p className="text-[11px] font-bold text-slate-400">{new Date(pub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                                <div className="flex items-center gap-3">
                                  {pub.status === "approved" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publié</span>}
                                  {pub.status === "pending" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">En attente</span>}
                                  {pub.status === "rejected" && <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-600">Refusé</span>}
                                  <button onClick={() => setViewPub(pub)} className="text-primary hover:text-primary/80 font-extrabold text-xs inline-flex items-center gap-1 hover:translate-x-1 transition-transform duration-200">
                                    Voir les détails <ArrowRight size={14} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          {pub.status === "approved" && (
                            <PubInteractions
                              pubId={pub.id}
                              token={token}
                              viewerId={user?.id ?? ""}
                              shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/publications/${pub.id}`}
                              pubTitle={pub.title}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── Tableau de bord ──────────────────────────────────────── */}
            {activeItem === "Tableau de bord" && <>

            {/* Bannière questionnaire non complété */}
            {score === null && (
              <div className="mb-6 p-5 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-2xl">quiz</span>
                  <div>
                    <p className="font-bold text-slate-800">Passez votre test de durabilité</p>
                    <p className="text-sm text-slate-500 font-medium">
                      Obtenez votre score initial et des recommandations personnalisées.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/questionnaire/eco-traveler")}
                  className="px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                >
                  Commencer →
                </button>
              </div>
            )}

            {/* ── Stats Grid ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

              {/* Score de durabilité — avec décomposition */}
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
                    {/* Bouton afficher/masquer détail */}
                    <button
                      onClick={() => setShowScoreDetail((v) => !v)}
                      className="text-xs text-slate-400 hover:text-primary font-bold transition-colors"
                      title="Voir la décomposition"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {showScoreDetail ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Barre score global */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getBarColor(score)} rounded-full transition-all duration-1000`}
                    style={{ width: scoreWidth }}
                  />
                </div>
                <p className="text-xs font-bold mt-2" style={{ color: score !== null ? (score >= 60 ? "#22c55e" : "#f97316") : "#94a3b8" }}>
                  {score !== null ? getScoreLabel(score) : "Questionnaire non complété"}
                </p>

                {/* Décomposition des 4 composants */}
                {showScoreDetail && profile && (
                  <ScoreBreakdown profile={profile} />
                )}

              </div>

              {/* Plans partagés */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Plans partagés</p>
                    <h3 className="text-3xl font-extrabold mt-1">
                      {profile?.plans_shared ?? 0}
                    </h3>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <span className="material-symbols-outlined">edit_calendar</span>
                  </div>
                </div>
              </div>

              {/* Réservations */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Réservations</p>
                    <h3 className="text-3xl font-extrabold mt-1">
                      {profile?.reservations_made ?? 0}
                    </h3>
                  </div>
                  <div className="bg-green-500/10 p-2 rounded-lg text-green-500">
                    <span className="material-symbols-outlined">task_alt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Plans + Badges ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                

              {/* Plans de voyage */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Mes Plans de Voyage</h3>
                  <a className="text-primary font-bold text-sm hover:underline" href="#">Voir tout</a>
                </div>
                <div className="space-y-4">
                  {[
                    { title: "Randonnée durable à Zaghouan", badge: "Randonnée", badgeColor: "bg-green-100 text-green-700", date: "14 - 15 Oct. • 4 participants", status: "Confirmé", statusColor: "bg-green-500", eco: "A+", icon: "hiking", tag: "Zéro déchet", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBD5akWau1kblm8fq7Tx2Gb_0_xLp3mQzhBkmRMTCwP4gTD9CSQAANQlL0YDLaTPuPJRU6KvcFPO6k2Z0XaqbQoKbMAOK5WBHeMHMnt1TRMgl1Y7aUZFQNg1FT4jZWgn0Wrxv71JI-UPJCAjt8_4-3bzG2SNsAgq_Ftpl-L1bToKH-hqsogDzYBKSTbxXhEQLfsVHEB_B4TUu3cTA9B7ioPh1f6qctmXGcTpXYceiy91_3s4bDfyCVRUFpnILZV0dgP9ZKtZF0fa6A" },
                    { title: "Séjour nature à Aïn Draham", badge: "Plan partagé", badgeColor: "bg-blue-100 text-blue-700", date: "22 - 25 Oct. • 2 participants", status: "En cours", statusColor: "bg-orange-400", eco: "A", icon: "cottage", tag: "Éco-gîte", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBPCrg1ZmXVLbEPD-8lp6H0mdqw8OUDeijVrAZTFq0zto2v3-_cD4n4oGhCFYORXsbpOhhim9BsoK6fLjA3KZ4WXULIFZ4GtIDPiqVEGjsr2jqkm0Eo5SO102iyX57ppBgj1gpfLy_3nCiWbRpyYAzfzsG-z1YeqFFSsfqFDlXhUdy0YrGeHUEP4uCOZxSFvr0V9ZOTlmb9te0xg3vgZkiVH0xWtqyukLVEbUxYn580NOCZ7P712ArePj4isI0atUXHzpvfrtqTrpw" },
                    { title: "Week-end éco en groupe à Tozeur", badge: "Groupe", badgeColor: "bg-orange-100 text-orange-700", date: "02 - 04 Nov. • 8 participants", status: "Confirmé", statusColor: "bg-green-500", eco: "A+", icon: "train", tag: "Transport collectif", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5jT6WYwSYRRMZkPCNOBrnz44sPEOf3vt8vGQAXP_9oauhXfRuN3iCW8E7E6gc-OZQ8vsDzOUvVh_5xdOYt_rO_F8qZPcDl9P-dGlbHnCdip5hG5VauEsZxb7L4MFmkIgmuxDjB5jpLJ24b6cbwAGNiHXzgmm7GYixoWH_vRGfaPxQiDRFW6S80aZzKe_X0FtOCQKwgh_TcAdy4tAq9weqRrUYIrpoC7OXPXi8oF6ZKGnTcuPoGSJuouQ9yZ3yhw7ldps2FdgyNBg" },
                  ].map((plan, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-primary/5 hover:border-primary/30 transition-all group cursor-pointer">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-48 h-32 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                          <div
                            className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                            style={{ backgroundImage: `url("${plan.img}")` }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider mb-2 ${plan.badgeColor}`}>
                                {plan.badge}
                              </span>
                              <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{plan.title}</h4>
                              <p className="text-slate-500 text-sm flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">calendar_today</span> {plan.date}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-2 py-1 rounded text-white text-[10px] font-bold uppercase ${plan.statusColor}`}>
                                {plan.status}
                              </span>
                              <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full flex items-center gap-1">
                                <span className="material-symbols-outlined text-green-600 text-sm">eco</span>
                                <span className="text-green-600 text-xs font-bold">{plan.eco}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-slate-400 text-lg">{plan.icon}</span>
                              <span className="text-xs text-slate-500">{plan.tag}</span>
                            </div>
                            <button className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Badges dynamiques depuis MongoDB ──────────────────── */}
              <div>
                <h3 className="text-xl font-bold mb-6">Mes Badges</h3>
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-primary/10">

                  <BadgeGrid role="eco_traveler" details={false} />
                  <a href="/dashboard/profile?onglet=badges" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">Voir le détail des paliers →</a>

                  

                </div>
              </div>

            </div>
          </>}
          </div>
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAddPub && (
        <SharedAddPublicationModal
          type={pubType}
          token={localStorage.getItem("access_token") ?? ""}
          onClose={() => setShowAddPub(false)}
          onSuccess={(p) => { setPublications((prev) => [p, ...prev]); setShowAddPub(false); }}
        />
      )}
      {viewPub && (
        <ViewPublicationModal pub={viewPub} onClose={() => setViewPub(null)} />
      )}
    </div>
  );
}