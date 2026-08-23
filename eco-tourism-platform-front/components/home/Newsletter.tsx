"use client";

import Link from "next/link";
import { Compass, Map, Store } from "lucide-react";

/**
 * Remplace l'ancienne inscription à une newsletter, qui n'était reliée à aucun
 * service : l'appel à l'action mène désormais à l'inscription réelle, avec le
 * rôle présélectionné. Seuls ces trois rôles sont ouverts à l'inscription.
 */
const roles = [
  {
    role: "eco_traveler",
    icon: Compass,
    titre: "Éco-voyageur",
    texte: "Explorez, réservez et suivez votre score de durabilité.",
  },
  {
    role: "guide",
    icon: Map,
    titre: "Guide",
    texte: "Publiez vos offres, rejoignez des circuits, gérez votre agenda.",
  },
  {
    role: "provider",
    icon: Store,
    titre: "Prestataire",
    texte: "Présentez votre organisation, vos activités et vos hébergements.",
  },
];

export default function Newsletter() {
  return (
    <section id="rejoindre" className="scroll-mt-24 px-6 md:px-20 lg:px-40 pb-24">
      <div className="max-w-[1440px] mx-auto rounded-[2.5rem] bg-primary dark:bg-primary/90 p-12 md:p-20 flex flex-col items-center text-center overflow-hidden relative">
        <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-slate-900/10 blur-3xl" />

        <h2 className="text-3xl md:text-5xl font-black text-slate-900 max-w-2xl mb-6 relative z-10">
          Rejoignez la plateforme
        </h2>

        <p className="text-slate-900/70 text-lg font-semibold max-w-xl mb-10 relative z-10">
          Choisissez votre rôle : la création du compte enchaîne sur un parcours
          d'intégration adapté à votre activité.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl relative z-10">
          {roles.map(({ role, icon: Icon, titre, texte }) => (
            <Link
              key={role}
              href={`/auth/register?role=${role}`}
              className="group flex flex-col items-center gap-2 rounded-2xl bg-white/95 px-6 py-7 text-slate-900 shadow-lg hover:-translate-y-1 transition-all"
            >
              <span className="h-12 w-12 rounded-xl bg-primary/15 text-slate-900 flex items-center justify-center mb-1">
                <Icon className="w-6 h-6" />
              </span>
              <span className="font-extrabold">{titre}</span>
              <span className="text-sm text-slate-500 leading-snug">{texte}</span>
              <span className="mt-2 text-xs font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Créer mon compte
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm font-semibold text-slate-900/70 relative z-10">
          Déjà inscrit ?{" "}
          <Link href="/auth/login" className="underline underline-offset-4">
            Connectez-vous
          </Link>
        </p>
      </div>
    </section>
  );
}
