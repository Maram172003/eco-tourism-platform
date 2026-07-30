"use client";

import { Check } from "lucide-react";
import { DOMAINES } from "@/lib/guideOfferConfig";

interface Props {
  domaine: string;
  onboardingExpertises: string[];
  isAutreDomaine: boolean;
  value: string[];
  onChange: (v: string[]) => void;
}

export default function ExpertisesPicker({ domaine, onboardingExpertises, isAutreDomaine, value, onChange }: Props) {
  const domainExpertises = DOMAINES[domaine]?.expertises ?? [];

  const available = isAutreDomaine
    ? domainExpertises
    : domainExpertises.filter((e) => onboardingExpertises.includes(e));

  const toggle = (exp: string) =>
    onChange(value.includes(exp) ? value.filter((x) => x !== exp) : [...value, exp]);

  if (available.length === 0) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs font-bold text-amber-700">
          {isAutreDomaine
            ? "Aucune expertise disponible pour ce domaine."
            : "Aucune expertise de votre profil correspond à ce domaine. Ajoutez des expertises dans votre profil ou choisissez un autre domaine."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
          {isAutreDomaine ? "Expertises de ce domaine" : "Vos expertises pour ce domaine"}
        </p>
        {value.length > 0 && (
          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            {value.length} sélectionnée{value.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!isAutreDomaine && onboardingExpertises.length === 0 && (
        <p className="text-[10px] text-slate-400 italic">
          Basé sur toutes les expertises du domaine — ajoutez les vôtres dans votre profil.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {available.map((exp) => {
          const active = value.includes(exp);
          return (
            <button
              key={exp}
              type="button"
              onClick={() => toggle(exp)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                active
                  ? "bg-green-500 border-green-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50"
              }`}
            >
              {active && <Check size={10} strokeWidth={3} />}
              {exp}
            </button>
          );
        })}
      </div>

      {value.length === 0 && (
        <p className="text-[10px] text-red-500 font-semibold">Sélectionnez au moins une expertise *</p>
      )}
    </div>
  );
}
