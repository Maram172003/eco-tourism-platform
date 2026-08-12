"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import Navbar from "@/components/home/Navbar";
import { apiFetch } from "@/lib/api";
import { getConsistentSession } from "@/lib/auth";

// ─── Step components ───────────────────────────────────────────────────────────

function PhotoUpload({ photo, onChange }: { photo: string; onChange: (v: string) => void }) {
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
          {photo ? (
            <img src={photo} alt="Photo de profil" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-slate-300 text-4xl">person</span>
          )}
        </div>
        <label
          htmlFor="owner-photo-upload"
          className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-900 text-base">photo_camera</span>
        </label>
        <input id="owner-photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
      </div>
      <p className="text-xs text-slate-400 font-medium">Photo de profil (optionnel)</p>
    </div>
  );
}

function StepIdentity({ data, setData }: any) {
  return (
    <div className="space-y-5">
      <PhotoUpload photo={data.photo} onChange={(v) => setData({ ...data, photo: v })} />

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Nom complet *</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
          <input
            className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
            value={data.full_name}
            onChange={(e) => setData({ ...data, full_name: e.target.value })}
            placeholder="Leila Trabelsi"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Présentation (optionnel)</label>
        <textarea
          className="w-full px-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium resize-none"
          value={data.bio}
          onChange={(e) => setData({ ...data, bio: e.target.value })}
          placeholder="Passionnée par le développement durable et l'écotourisme en Tunisie…"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Pays *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">public</span>
            <select
              className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium appearance-none"
              value={data.country}
              onChange={(e) => setData({ ...data, country: e.target.value })}
            >
              <option value="">Sélectionner</option>
              <option value="TN">Tunisie</option>
              <option value="MA">Maroc</option>
              <option value="DZ">Algérie</option>
              <option value="FR">France</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Langue *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">translate</span>
            <select
              className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium appearance-none"
              value={data.language}
              onChange={(e) => setData({ ...data, language: e.target.value })}
            >
              <option value="">Sélectionner</option>
              <option value="fr">Français</option>
              <option value="ar">Arabe</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepOrganization({ data, setData }: any) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Entreprise / Structure <span className="text-slate-400 font-normal">(optionnel)</span></label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">business</span>
          <input
            className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
            value={data.organization}
            onChange={(e) => setData({ ...data, organization: e.target.value })}
            placeholder="Éco-Voyage, Éco-Lodge Djerba…"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Votre poste</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">work</span>
          <input
            className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
            value={data.position}
            onChange={(e) => setData({ ...data, position: e.target.value })}
            placeholder="Directeur(trice), Gérant(e), Responsable…"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Téléphone</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">phone</span>
          <input
            type="tel"
            className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
            value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            placeholder="+216 12 345 678"
          />
        </div>
      </div>

      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
          <div>
            <p className="text-sm font-bold text-slate-800 mb-1">Étape suivante : vos projets</p>
            <p className="text-xs text-slate-500 font-medium">
              Après avoir complété votre profil personnel, vous pourrez ajouter et gérer vos projets touristiques depuis votre tableau de bord.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Votre identité", subtitle: "Présentez-vous" },
  { id: 2, title: "Votre activité", subtitle: "Structure & poste" },
];

export default function ProjectOwnerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState({
    full_name: "",
    bio: "",
    country: "",
    language: "",
    photo: "",
    organization: "",
    position: "",
    phone: "",
  });

  useEffect(() => {
    // Le jeton doit désigner le compte affiché, sinon l'onboarding écrirait
    // dans le profil d'une session restée ouverte dans un autre onglet.
    if (!getConsistentSession()) router.push("/auth/login");
  }, [router]);

  const getToken = () => localStorage.getItem("access_token") || "";

  const canProceed = () => {
    if (step === 1) return !!data.full_name.trim() && !!data.country && !!data.language;
    if (step === 2) return true;
    return true;
  };

  const handleNext = async () => {
    setError("");
    if (!canProceed()) {
      setError("Veuillez compléter les champs obligatoires.");
      return;
    }

    try {
      setLoading(true);

      if (step === 1) {
        await apiFetch("/project-owner/profile", {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            full_name: data.full_name,
            bio: data.bio || undefined,
            country: data.country,
            language: data.language,
            photo: data.photo || undefined,
          }),
        });
      } else if (step === 2) {
        await apiFetch("/project-owner/profile", {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            full_name: data.full_name,
            bio: data.bio || undefined,
            country: data.country,
            language: data.language,
            photo: data.photo || undefined,
            organization: data.organization,
            position: data.position || undefined,
            phone: data.phone || undefined,
          }),
        });

        await apiFetch("/project-owner/onboarded", {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        router.push("/dashboard");
        return;
      }

      setStep((s) => s + 1);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar variant="auth" backHref="/" />
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-end">
          <span className="text-sm font-semibold text-slate-500">
            Étape {step} sur {STEPS.length}
          </span>
        </div>
      </header>

      <div className="h-1.5 bg-slate-100">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="flex justify-center gap-2 mb-10">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s.id === step ? "w-8 bg-primary" : s.id < step ? "w-4 bg-primary/40" : "w-4 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 pb-0">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full mb-4">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {STEPS[step - 1].subtitle}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{STEPS[step - 1].title}</h1>
            </div>

            <div className="p-8">
              {step === 1 && <StepIdentity data={data} setData={setData} />}
              {step === 2 && <StepOrganization data={data} setData={setData} />}

              {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
            </div>

            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:border-slate-300 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={loading || !canProceed()}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-slate-900 rounded-xl font-extrabold shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60 disabled:translate-y-0"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                ) : step === STEPS.length ? (
                  <>
                    <Check className="w-4 h-4" />
                    Terminer mon profil
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
