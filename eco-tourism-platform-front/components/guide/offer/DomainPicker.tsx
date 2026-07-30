"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { DOMAINES } from "@/lib/guideOfferConfig";

interface Props {
  onboardingDomaines: string[];
  value: string | null;
  isAutreDomaine: boolean;
  onSelect: (domaine: string, isAutre: boolean) => void;
}

export default function DomainPicker({ onboardingDomaines, value, isAutreDomaine, onSelect }: Props) {
  const [showAutre, setShowAutre] = useState(isAutreDomaine);
  useEffect(() => { setShowAutre(isAutreDomaine); }, [isAutreDomaine]);
  const profileDomains = onboardingDomaines.filter((d) => DOMAINES[d]);
  const otherDomains = Object.keys(DOMAINES).filter((d) => !onboardingDomaines.includes(d));

  function handleToggleAutre() {
    const next = !showAutre;
    setShowAutre(next);
    if (!next && value && isAutreDomaine) {
      onSelect("", false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Section 1 — Domaines du profil */}
      {profileDomains.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black tracking-widest text-primary/70 uppercase">Vos domaines</p>
          <div className="grid grid-cols-2 gap-2">
            {profileDomains.map((key) => {
              const cfg = DOMAINES[key];
              const active = value === key && !isAutreDomaine;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(key, false)}
                  className={`relative flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all duration-150 ${
                    active
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "border-slate-100 bg-white hover:border-primary/30 hover:bg-primary/5"
                  }`}
                >
                  {active && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Check size={9} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary/20" : "bg-slate-100"}`}>
                    <span className={`material-symbols-outlined text-lg ${active ? "text-primary" : "text-slate-500"}`}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>
                      {cfg.label}
                    </p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                      Votre profil
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="text-xs font-bold text-primary/80">
            Aucun domaine déclaré dans votre profil. Choisissez un domaine ci-dessous.
          </p>
        </div>
      )}

      {/* Toggle "Autre domaine" */}
      {otherDomains.length > 0 && (
        <button
          type="button"
          onClick={handleToggleAutre}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
            showAutre
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-slate-200 bg-white text-slate-500 hover:border-primary/20 hover:bg-primary/5"
          }`}
        >
          <span>Proposer une offre dans un autre domaine</span>
          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${showAutre ? "bg-primary border-primary" : "border-slate-300"}`}>
            {showAutre && <Check size={9} className="text-white" strokeWidth={3} />}
          </span>
        </button>
      )}

      {/* Section 2 — Autres domaines (hors profil) */}
      {showAutre && otherDomains.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Autres domaines</p>
          <div className="grid grid-cols-2 gap-2">
            {otherDomains.map((key) => {
              const cfg = DOMAINES[key];
              const active = value === key && isAutreDomaine;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(key, true)}
                  className={`relative flex items-center gap-2.5 px-3 py-3 rounded-2xl border-2 text-left transition-all duration-150 ${
                    active
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "border-slate-100 bg-white hover:border-primary/20 hover:bg-primary/5"
                  }`}
                >
                  {active && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <Check size={9} className="text-white" strokeWidth={3} />
                    </span>
                  )}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary/20" : "bg-slate-100"}`}>
                    <span className={`material-symbols-outlined text-lg ${active ? "text-primary" : "text-slate-500"}`}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className={`font-extrabold text-xs leading-tight ${active ? "text-slate-900" : "text-slate-700"}`}>
                      {cfg.label}
                    </p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"}`}>
                      Hors profil
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
