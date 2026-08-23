"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Plus, X, Check } from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type User = { id: string; email: string; role: string; full_name: string };
type Badge = { label: string; obtained_at: string };

type Project = {
  id: string;
  name: string;
  project_type: string | null;
  description: string | null;
  region: string | null;
  address: string | null;
  photo: string | null;
  status: string;
  services: string[] | null;
  eco_labels: string[] | null;
  website: string | null;
  phone: string | null;
};

type OwnerProfile = {
  user_id: string;
  full_name: string;
  bio: string | null;
  country: string | null;
  language: string | null;
  photo: string | null;
  organization: string | null;
  position: string | null;
  phone: string | null;
  profile_completion: number;
  is_onboarded: boolean;
  sustainability_score: number | null;
  score_questionnaire: number | null;
  score_reservations: number;
  score_feedbacks: number;
  badges: Badge[];
  total_reservations: number;
  feedback_received: number;
  projects_count: number;
  projects: Project[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  { value: "hebergement", label: "Hébergement", icon: "hotel" },
  { value: "restauration", label: "Restauration", icon: "restaurant" },
  { value: "artisanat", label: "Artisanat", icon: "brush" },
  { value: "agence", label: "Agence de voyage", icon: "luggage" },
  { value: "centre_loisir", label: "Centre de loisirs", icon: "sports" },
];

const ECO_PRACTICES = [
  "Panneaux solaires",
  "Eau recyclée",
  "Zéro plastique",
  "Produits locaux",
  "Compostage",
  "Éco-certification",
  "Véhicules électriques",
  "Éclairage LED",
];

const BADGE_CONFIG = [
  { label: "Prestataire Éco-Certifié", icon: "verified", description: "Onboarding complété" },
  { label: "Ambassadeur Éco-Voyage", icon: "stars", description: "Score ≥ 80%" },
  { label: "Projet d'Excellence", icon: "domain_verification", description: "10 réservations gérées" },
  { label: "Champion Durable", icon: "eco", description: "5 évaluations reçues" },
];

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

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScoreBreakdown({ profile }: { profile: OwnerProfile }) {
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

function ProjectTypeIcon({ type }: { type: string | null }) {
  const found = PROJECT_TYPES.find((t) => t.value === type);
  return (
    <span className="material-symbols-outlined text-2xl text-primary">
      {found?.icon ?? "domain"}
    </span>
  );
}

function AddProjectModal({
  onClose,
  onSuccess,
  token,
}: {
  onClose: () => void;
  onSuccess: (p: Project) => void;
  token: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    project_type: "",
    description: "",
    region: "",
    address: "",
    website: "",
    phone: "",
    eco_labels: [] as string[],
  });

  const toggleEco = (v: string) => {
    const s = form.eco_labels.includes(v)
      ? form.eco_labels.filter((x) => x !== v)
      : [...form.eco_labels, v];
    setForm({ ...form, eco_labels: s });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Le nom du projet est obligatoire."); return; }
    setError("");
    setLoading(true);
    try {
      const created = await apiFetch<Project>("/project-owner/projects", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          project_type: form.project_type || undefined,
          description: form.description || undefined,
          region: form.region || undefined,
          address: form.address || undefined,
          website: form.website || undefined,
          phone: form.phone || undefined,
          eco_labels: form.eco_labels.length ? form.eco_labels : undefined,
        }),
      });
      onSuccess(created);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900">Ajouter un projet</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Nom du projet *</label>
            <input
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Éco-Lodge Sahara, Restaurant Terroir…"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Type de projet</label>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, project_type: form.project_type === t.value ? "" : t.value })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all
                    ${form.project_type === t.value ? "bg-primary/10 border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/30"}`}
                >
                  <span className="material-symbols-outlined text-base">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Description</label>
            <textarea
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Décrivez votre projet éco-touristique…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Région</label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="Tataouine, Djerba…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Téléphone</label>
              <input
                type="tel"
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+216 …"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Site web</label>
            <input
              type="url"
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://mon-projet.tn"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Pratiques éco-responsables</label>
            <div className="flex flex-wrap gap-2">
              {ECO_PRACTICES.map((p) => {
                const active = form.eco_labels.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleEco(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all
                      ${active ? "bg-green-50 border-green-400 text-green-700" : "border-slate-200 text-slate-500 hover:border-green-300"}`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full py-3.5 bg-primary text-slate-900 font-extrabold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? "Création en cours…" : "Créer le projet"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectOwnerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState("Tableau de bord");
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [token, setToken] = useState("");

  const navItems = [
    { label: "Tableau de bord", icon: "dashboard" },
    { label: "Mes Projets", icon: "domain" },
    { label: "Réservations", icon: "event_available" },
    { label: "Avis reçus", icon: "star" },
    { label: "Certifications", icon: "verified" },
    { label: "Paramètres", icon: "settings" },
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const tkn = localStorage.getItem("access_token");
    if (!storedUser || !tkn) { router.push("/auth/login"); return; }

    try {
      const parsedUser: User = JSON.parse(storedUser);
      if (parsedUser.role !== "project") { router.push("/auth/login"); return; }
      setUser(parsedUser);
      setToken(tkn);

      apiFetch<OwnerProfile>("/project-owner/profile", {
        headers: { Authorization: `Bearer ${tkn}` },
      })
        .then((p) => {
          setProfile(p);
          if (!p?.is_onboarded) router.push("/onboarding/project-owner");
        })
        .catch(() => router.push("/onboarding/project-owner"))
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

  const handleProjectAdded = (project: Project) => {
    setProfile((prev) =>
      prev ? { ...prev, projects: [...prev.projects, project], projects_count: prev.projects_count + 1 } : prev
    );
    setShowAddProject(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Supprimer ce projet ?")) return;
    try {
      await apiFetch(`/project-owner/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile((prev) =>
        prev ? { ...prev, projects: prev.projects.filter((p) => p.id !== projectId), projects_count: prev.projects_count - 1 } : prev
      );
    } catch {
      alert("Erreur lors de la suppression.");
    }
  };

  const score = profile?.sustainability_score ?? null;
  const scoreWidth = score !== null ? `${score}%` : "0%";
  const obtainedBadgeLabels = new Set((profile?.badges ?? []).map((b) => b.label));

  if (loading || !profile) {
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
              onClick={() => router.push("/questionnaire/project-owner")}
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
                Bonjour, {profile?.full_name || user?.full_name || "Prestataire"}
              </h2>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-5 py-2 gap-2 whitespace-nowrap">
                <span className="material-symbols-outlined text-primary text-base">domain_verification</span>
                <span className="text-sm font-semibold">
                  {score !== null ? getScoreLabel(score) : "Prestataire — Évaluation en attente"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 flex-1 justify-end">
              <div className="relative w-full max-w-md">
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/50"
                  placeholder="Rechercher un projet, une région…"
                />
                <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 text-xl">search</span>
              </div>
              <button className="size-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary transition-colors shrink-0">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0" />
              <button onClick={() => router.push("/profile/project-owner")}
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
                    <p className="font-bold text-slate-800">Passez l'évaluation de durabilité de votre projet</p>
                    <p className="text-sm text-slate-500 font-medium">Obtenez votre score et valorisez votre projet auprès des voyageurs éco-responsables.</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/questionnaire/project-owner")}
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

              {/* Projets */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Projets actifs</p>
                    <h3 className="text-3xl font-extrabold mt-1">{profile?.projects_count ?? 0}</h3>
                  </div>
                  <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                    <span className="material-symbols-outlined">domain</span>
                  </div>
                </div>
              </div>

              {/* Réservations */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-primary/10 flex flex-col self-start">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Réservations reçues</p>
                    <h3 className="text-3xl font-extrabold mt-1">{profile?.total_reservations ?? 0}</h3>
                  </div>
                  <div className="bg-green-500/10 p-2 rounded-lg text-green-500">
                    <span className="material-symbols-outlined">event_available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Projects + Badges ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Projects list */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Mes Projets</h3>
                  <button
                    onClick={() => setShowAddProject(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-slate-900 rounded-xl font-extrabold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>

                {profile?.projects.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">domain</span>
                    <p className="text-slate-800 dark:text-slate-200 font-extrabold text-lg mb-2">Aucun projet pour l'instant</p>
                    <p className="text-slate-400 font-medium text-sm mb-5">
                      Ajoutez votre premier projet éco-touristique pour le présenter aux voyageurs.
                    </p>
                    <button
                      onClick={() => setShowAddProject(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-slate-900 rounded-xl font-extrabold text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Créer mon premier projet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile!.projects.map((project) => (
                      <div key={project.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-primary/5 p-5 flex gap-5">
                        {/* Project image */}
                        <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
                          {project.photo ? (
                            <img src={project.photo} alt={project.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ProjectTypeIcon type={project.project_type} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base leading-tight">{project.name}</h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                project.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                              }`}>
                                {project.status === "active" ? "Actif" : "En attente"}
                              </span>
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {project.project_type && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                              {PROJECT_TYPES.find((t) => t.value === project.project_type)?.label}
                            </span>
                          )}

                          {project.description && (
                            <p className="text-sm text-slate-500 font-medium line-clamp-1 mb-2">{project.description}</p>
                          )}

                          <div className="flex flex-wrap gap-3">
                            {project.region && (
                              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                <span className="material-symbols-outlined text-sm">location_on</span>
                                {project.region}
                              </span>
                            )}
                            {project.website && (
                              <a
                                href={project.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                              >
                                <span className="material-symbols-outlined text-sm">language</span>
                                {project.website.replace(/^https?:\/\//, "")}
                              </a>
                            )}
                          </div>

                          {(project.eco_labels?.length ?? 0) > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {project.eco_labels!.slice(0, 3).map((label) => (
                                <span key={label} className="text-xs font-bold px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
                                  {label}
                                </span>
                              ))}
                              {project.eco_labels!.length > 3 && (
                                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                  +{project.eco_labels!.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

                  
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showAddProject && (
        <AddProjectModal
          token={token}
          onClose={() => setShowAddProject(false)}
          onSuccess={handleProjectAdded}
        />
      )}
    </div>
  );
}
