"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Ce qui manque au profil pour atteindre 100 %.
 *
 * Le pourcentage seul ne dit rien : un profil à 45 % laisse son propriétaire
 * deviner. Le barème vient du serveur — c'est lui qui calcule le score, il ne
 * peut donc pas diverger de ce que cet écran annonce.
 */

export type LigneCompletion = {
  etape: string;
  label: string;
  poids: number;
  obtenus: number;
};

export default function DetailCompletion({ lignes, total }: {
  lignes: LigneCompletion[];
  total: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  // `document` n'existe pas au rendu serveur : le portail attend le montage.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  // Échap ferme, et la page derrière ne défile plus tant que le panneau est là.
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("keydown", surTouche);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = avant;
    };
  }, [ouvert]);

  if (!lignes.length) return null;

  const manquantes = lignes.filter((l) => l.obtenus < l.poids);
  // Les lignes d'une même étape se suivent : on les regroupe dans leur ordre.
  const etapes: { nom: string; lignes: LigneCompletion[] }[] = [];
  for (const l of lignes) {
    const derniere = etapes[etapes.length - 1];
    if (derniere?.nom === l.etape) derniere.lignes.push(l);
    else etapes.push({ nom: l.etape, lignes: [l] });
  }

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        className="mt-4 w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">checklist</span>
        Voir détails
      </button>

      {ouvert && monte && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setOuvert(false)}
        >
          {/* Colonne : l'en-tête reste fixe, seul le corps défile. Le rendre
              `sticky` dans un conteneur qui défile faisait sortir le bouton de
              fermeture du cadre. */}
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête : le chiffre d'abord, puis ce qu'il reste à faire. */}
            <div className="relative shrink-0 bg-white dark:bg-slate-900 px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setOuvert(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              <p className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                Complétion du profil
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-slate-900 dark:text-slate-50 leading-none tabular-nums">
                  {total}
                </span>
                <span className="text-sm font-bold text-slate-400">/ 100</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${total}%` }}
                />
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-2">
                {manquantes.length === 0
                  ? "Votre profil est complet."
                  : `${manquantes.length} élément${manquantes.length > 1 ? "s" : ""} à renseigner pour atteindre 100.`}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {etapes.map((e) => {
                const obtenus = e.lignes.reduce((t, l) => t + l.obtenus, 0);
                const poids = e.lignes.reduce((t, l) => t + l.poids, 0);
                const complete = obtenus >= poids;
                return (
                  <div
                    key={e.nom}
                    className={`rounded-2xl border p-4 ${
                      complete
                        ? "border-primary/20 bg-primary/5"
                        : "border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{e.nom}</p>
                      <p className={`text-[11px] font-black tabular-nums shrink-0 ${complete ? "text-primary" : "text-slate-400"}`}>
                        {obtenus}/{poids}
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {e.lignes.map((l) => {
                        const complet = l.obtenus >= l.poids;
                        const partiel = l.obtenus > 0 && !complet;
                        return (
                          <li key={l.label} className="flex items-center gap-2.5">
                            <span className={`material-symbols-outlined text-[18px] shrink-0 ${
                              complet ? "text-primary" : partiel ? "text-amber-500" : "text-slate-300"
                            }`} style={complet ? { fontVariationSettings: '"FILL" 1' } : undefined}>
                              {complet ? "check_circle" : partiel ? "adjust" : "radio_button_unchecked"}
                            </span>
                            <span className={`text-[13px] flex-1 min-w-0 truncate ${
                              complet
                                ? "text-slate-400 dark:text-slate-500 line-through decoration-slate-200"
                                : "text-slate-800 dark:text-slate-100 font-semibold"
                            }`}>
                              {l.label}
                            </span>
                            {/* Le poids ne se lit que sur ce qui reste à faire :
                                sur une ligne acquise, il n'apprend plus rien. */}
                            {!complet && (
                              <span className="text-[11px] font-black shrink-0 tabular-nums text-slate-400">
                                +{l.poids - l.obtenus}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
