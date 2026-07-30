"use client";

import { Check } from "lucide-react";

export interface PricingData {
  prix_par_personne: string;
  prix_groupe: string;
  nb_personnes_groupe: string;
  prix_enfant: string;
  age_max_enfant: string;
  supp_privatisation: string;
  acompte_requis: boolean | null;
  type_acompte: string;
  valeur_acompte: string;
}

export const EMPTY_PRICING: PricingData = {
  prix_par_personne: "",
  prix_groupe: "",
  nb_personnes_groupe: "",
  prix_enfant: "",
  age_max_enfant: "",
  supp_privatisation: "",
  acompte_requis: null,
  type_acompte: "pourcentage",
  valeur_acompte: "",
};

const ic = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm";
const lbl = "text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-2";

export function PricingBlock({ value, onChange }: {
  value: PricingData;
  onChange: (v: Partial<PricingData>) => void;
}) {
  return (
    <div className="space-y-5">

      {/* Prix par personne */}
      <div>
        <label className={lbl}>
          Prix par personne (DT) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">DT</span>
          <input
            type="number" min="0" placeholder="Ex: 150"
            value={value.prix_par_personne}
            onChange={(e) => onChange({ prix_par_personne: e.target.value })}
            className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm"
          />
        </div>
      </div>

      {/* Prix groupe */}
      <div>
        <label className={lbl}>Prix groupe (DT)</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">DT</span>
            <input
              type="number" min="0" placeholder="Ex: 500"
              value={value.prix_groupe}
              onChange={(e) => onChange({ prix_groupe: e.target.value })}
              className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">pers.</span>
            <input
              type="number" min="1" placeholder="10 pers."
              value={value.nb_personnes_groupe}
              onChange={(e) => onChange({ nb_personnes_groupe: e.target.value })}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm"
            />
          </div>
        </div>
      </div>

      {/* Prix enfant */}
      <div>
        <label className={lbl}>Prix enfant (DT)</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">DT</span>
            <input
              type="number" min="0" placeholder="Ex: 75"
              value={value.prix_enfant}
              onChange={(e) => onChange({ prix_enfant: e.target.value })}
              className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">≤ ans</span>
            <input
              type="number" min="0" placeholder="12"
              value={value.age_max_enfant}
              onChange={(e) => onChange({ age_max_enfant: e.target.value })}
              className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm"
            />
          </div>
        </div>
      </div>

      {/* Supplément privatisation */}
      <div>
        <label className={lbl}>Supplément privatisation (DT)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">DT</span>
          <input
            type="number" min="0" placeholder="Ex: 200"
            value={value.supp_privatisation}
            onChange={(e) => onChange({ supp_privatisation: e.target.value })}
            className="w-full pl-14 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-slate-900 font-medium text-sm"
          />
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Acompte */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onChange({ acompte_requis: !value.acompte_requis })}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border w-full text-xs font-bold transition-all
            ${value.acompte_requis
              ? "border-primary bg-primary/10 text-primary"
              : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"
            }`}
        >
          <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-all ${value.acompte_requis ? "border-primary bg-primary" : "border-slate-300"}`}>
            {value.acompte_requis && <Check size={10} className="text-white" />}
          </div>
          Acompte requis à la réservation
        </button>

        {value.acompte_requis && (
          <div className="grid grid-cols-2 gap-2">
            <select
              value={value.type_acompte}
              onChange={(e) => onChange({ type_acompte: e.target.value })}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pourcentage">% du prix</option>
              <option value="fixe">Montant fixe (DT)</option>
            </select>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                {value.type_acompte === "pourcentage" ? "%" : "DT"}
              </span>
              <input
                type="number" min="1" placeholder="30"
                value={value.valeur_acompte}
                onChange={(e) => onChange({ valeur_acompte: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
