"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ArrowLeft, User, ShieldCheck, Eye, EyeOff, Check, Award } from "lucide-react";
import BadgeGrid from "@/components/common/BadgeGrid";
import { apiFetch } from "@/lib/api";
import ProviderProfilePage from "@/app/profile/provider/page";
import GuideProfilePage from "@/app/profile/guide/page";
import ProjectOwnerProfilePage from "@/app/profile/project-owner/page";
import EcoTravelerProfilePage from "@/app/profile/ecovoyageur/page";

type Compte = { id: string; email: string; role: string; full_name?: string };

/** Chemin du profil correspondant au rôle — le prestataire y était oublié. */
function cheminProfil(role: string): string {
  if (role === "eco_traveler") return "/profile/ecovoyageur";
  if (role === "guide")        return "/profile/guide";
  if (role === "provider")     return "/profile/provider";
  if (role === "project" || role === "project_owner") return "/profile/project-owner";
  return "/";
}

type Onglet = "informations" | "securite" | "badges";

export default function ParametresPage() {
  const router = useRouter();
  const [compte, setCompte] = useState<Compte | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("informations");

  // ── Changement de mot de passe ──────────────────────────────────────────
  const [actuel, setActuel]       = useState("");
  const [nouveau, setNouveau]     = useState("");
  const [confirme, setConfirme]   = useState("");
  const [voirActuel, setVoirActuel]   = useState(false);
  const [voirNouveau, setVoirNouveau] = useState(false);
  const [envoi, setEnvoi]         = useState(false);
  const [erreur, setErreur]       = useState("");
  const [succes, setSucces]       = useState("");
  /** Le mot de passe actuel est validé par le serveur avant d'ouvrir la suite. */
  const [etapeVerifiee, setEtapeVerifiee] = useState(false);

  // Lien profond depuis le tableau de bord. Lu dans un effet : l'initialiseur
  // de useState ne rejoue pas à l'hydratation.
  useEffect(() => {
    const o = new URLSearchParams(window.location.search).get("onglet");
    if (o === "badges" || o === "securite" || o === "informations") setOnglet(o);
  }, []);

  useEffect(() => {
    const stocke = localStorage.getItem("user");
    if (!stocke) { router.push("/auth/login"); return; }
    try { setCompte(JSON.parse(stocke)); }
    catch { router.push("/auth/login"); }
  }, [router]);

  const entete = () => ({ Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}` });

  /** Étape 1 — on ne dévoile les champs suivants qu'une fois l'actuel validé. */
  async function verifierActuel(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setSucces("");
    if (!actuel) { setErreur("Saisissez votre mot de passe actuel."); return; }

    setEnvoi(true);
    try {
      await apiFetch("/auth/verify-password", {
        method: "POST",
        headers: entete(),
        body: JSON.stringify({ current_password: actuel }),
      });
      setEtapeVerifiee(true);
    } catch (err: any) {
      setErreur(err?.message ?? "Mot de passe actuel incorrect.");
    } finally {
      setEnvoi(false);
    }
  }

  /** Retour à l'étape 1 : le mot de passe actuel est ressaisi de zéro. */
  function recommencer() {
    setEtapeVerifiee(false);
    setActuel(""); setNouveau(""); setConfirme("");
    setErreur(""); setSucces("");
  }

  /** Étape 2 — le serveur revalide l'actuel : la vérification n'est pas une autorisation. */
  async function changerMotDePasse(e: React.FormEvent) {
    e.preventDefault();
    setErreur(""); setSucces("");

    if (nouveau.length < 6) { setErreur("Le nouveau mot de passe doit faire au moins 6 caractères."); return; }
    if (nouveau !== confirme) { setErreur("Les deux nouveaux mots de passe ne correspondent pas."); return; }

    setEnvoi(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "PATCH",
        headers: entete(),
        body: JSON.stringify({ current_password: actuel, new_password: nouveau }),
      });
      setSucces("Mot de passe modifié avec succès.");
      setEtapeVerifiee(false);
      setActuel(""); setNouveau(""); setConfirme("");
    } catch (err: any) {
      setErreur(err?.message ?? "La modification a échoué.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!compte) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Le profil du rôle, monté pour fournir son formulaire de modification.
  const ProfilDuRole =
    compte.role === "provider"     ? ProviderProfilePage :
    compte.role === "guide"        ? GuideProfilePage :
    compte.role === "project" || compte.role === "project_owner" ? ProjectOwnerProfilePage :
    compte.role === "eco_traveler" ? EcoTravelerProfilePage :
    null;

  const champ = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition";
  const libelle = "text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1.5 block";

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">

      {/* Barre supérieure */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all">
            <ArrowLeft size={16} />Retour
          </button>
          <div className="flex items-center gap-2 text-slate-900">
            <Leaf className="text-primary w-6 h-6" />
            <span className="text-base font-extrabold tracking-tight">Éco-Voyage</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Paramètres</h1>
        <p className="text-sm text-slate-500 font-medium mb-6">Votre compte et sa sécurité</p>

        {/* Les deux parties */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-200/50 mb-6">
          {([
            { cle: "informations", label: "Informations personnelles", Icon: User },
            { cle: "badges",      label: "Badges",                    Icon: Award },
            { cle: "securite",     label: "Sécurité",                  Icon: ShieldCheck },
          ] as const).map(({ cle, label, Icon }) => (
            <button key={cle} onClick={() => setOnglet(cle)}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all ${
                onglet === cle ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              <Icon size={14} strokeWidth={2.5} />{label}
            </button>
          ))}
        </div>

        {/* ── Informations personnelles ─────────────────────────────────── */}
        {onglet === "informations" && (
          /* Le formulaire du profil, ouvert d'emblée : mêmes champs que le
             bouton « Modifier » de la page profil. */
          ProfilDuRole ? <ProfilDuRole embedded openEditOnMount /> : null
        )}

        {/* ── Badges ────────────────────────────────────────────────────── */}
        {onglet === "badges" && (
          <section className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
            <header className="px-5 py-3 bg-slate-50/80 border-b border-slate-100">
              <h2 className="text-[11px] font-black tracking-widest text-slate-500 uppercase">Mes badges</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Une progression en cinq badges, à gravir dans l'ordre.
              </p>
            </header>
            <div className="p-5">
              <BadgeGrid role={compte.role} />
            </div>
          </section>
        )}

        {/* ── Sécurité ──────────────────────────────────────────────────── */}
        {onglet === "securite" && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
              <header className="px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                <h2 className="text-[11px] font-black tracking-widest text-slate-500 uppercase">Mot de passe</h2>
              </header>
              <form onSubmit={etapeVerifiee ? changerMotDePasse : verifierActuel} className="p-5 space-y-4">

                {/* Fil des deux étapes */}
                <ol className="flex items-center gap-3 pb-1">
                  {["Vérification", "Nouveau mot de passe"].map((titre, i) => {
                    const faite   = etapeVerifiee && i === 0;
                    const courante = etapeVerifiee ? i === 1 : i === 0;
                    return (
                      <li key={titre} className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          faite ? "bg-primary text-slate-900"
                          : courante ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-400"
                        }`}>
                          {faite ? <Check size={11} strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={`text-[11px] font-bold ${courante ? "text-slate-700" : "text-slate-400"}`}>{titre}</span>
                        {i === 0 && <span className="w-6 h-px bg-slate-200" />}
                      </li>
                    );
                  })}
                </ol>

                {/* ── Étape 1 : mot de passe actuel ─────────────────────── */}
                <div>
                  <label className={libelle}>Mot de passe actuel</label>
                  <div className="relative">
                    <input type={voirActuel ? "text" : "password"} value={actuel}
                      onChange={(e) => setActuel(e.target.value)} className={champ}
                      autoComplete="current-password" disabled={etapeVerifiee} />
                    {etapeVerifiee ? (
                      <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                    ) : (
                      <button type="button" onClick={() => setVoirActuel((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {voirActuel ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                  {etapeVerifiee && (
                    <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
                      Mot de passe vérifié.
                      <button type="button" onClick={recommencer}
                        className="text-slate-400 hover:text-slate-600 underline underline-offset-2 font-semibold">
                        Modifier
                      </button>
                    </p>
                  )}
                </div>

                {/* ── Étape 2 : le nouveau, révélé après vérification ────── */}
                {etapeVerifiee && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={libelle}>Nouveau mot de passe</label>
                      <div className="relative">
                        <input type={voirNouveau ? "text" : "password"} value={nouveau} autoFocus
                          onChange={(e) => setNouveau(e.target.value)} className={champ} autoComplete="new-password" />
                        <button type="button" onClick={() => setVoirNouveau((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {voirNouveau ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Au moins 6 caractères.</p>
                    </div>
                    <div>
                      <label className={libelle}>Confirmer le nouveau</label>
                      <input type={voirNouveau ? "text" : "password"} value={confirme}
                        onChange={(e) => setConfirme(e.target.value)} className={champ} autoComplete="new-password" />
                    </div>
                  </div>
                )}

                {erreur && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{erreur}</p>
                )}
                {succes && (
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <Check size={14} />{succes}
                  </p>
                )}

                <button type="submit"
                  disabled={envoi || (etapeVerifiee ? !nouveau || !confirme : !actuel)}
                  className="px-5 py-2.5 bg-primary text-slate-900 font-bold rounded-xl text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                  {envoi
                    ? (etapeVerifiee ? "Modification…" : "Vérification…")
                    : (etapeVerifiee ? "Changer le mot de passe" : "Vérifier")}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
