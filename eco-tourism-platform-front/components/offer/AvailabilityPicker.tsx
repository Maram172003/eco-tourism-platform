"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export interface AvailData {
  type_disponibilite: string;
  // A — dates spécifiques
  avail_dates: string[];
  heure_debut_A: string; heure_fin_A: string;
  // B — récurrence
  jours_recurrence: string[];
  heure_debut_B: string; heure_fin_B: string;
  valable_du: string; valable_au: string;
  // C — période
  date_debut_C: string; date_fin_C: string;
  jours_dispo_C: string[];
  heure_debut_C: string; heure_fin_C: string;
  // D — sur demande
  delai_reponse: string; message_accueil: string;
  // E — saison
  saisons_offre: string[]; heure_debut_E: string;
}

export const EMPTY_AVAIL: AvailData = {
  type_disponibilite: "",
  avail_dates: [], heure_debut_A: "", heure_fin_A: "",
  jours_recurrence: [], heure_debut_B: "", heure_fin_B: "", valable_du: "", valable_au: "",
  date_debut_C: "", date_fin_C: "", jours_dispo_C: [], heure_debut_C: "", heure_fin_C: "",
  delai_reponse: "", message_accueil: "",
  saisons_offre: [], heure_debut_E: "",
};

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const SAISONS = ["Printemps", "Été", "Automne", "Hiver"];

const ic = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm";

const TYPE_OPTIONS = [
  { value: "A", label: "Dates spécifiques",        icon: "event",      desc: "Choisir des dates précises" },
  { value: "B", label: "Récurrence hebdomadaire",  icon: "view_week",  desc: "Mêmes jours chaque semaine" },
  { value: "C", label: "Période ouverte",          icon: "date_range", desc: "Du … au …" },
  { value: "D", label: "Sur demande",              icon: "schedule",   desc: "Vous confirmez après contact" },
  { value: "E", label: "Saison complète",          icon: "wb_sunny",   desc: "Disponible toute une saison" },
];

export function AvailabilityPicker({ value, onChange }: {
  value: AvailData;
  onChange: (v: Partial<AvailData>) => void;
}) {
  const [newDate, setNewDate] = useState("");

  const togArr = (field: keyof AvailData, v: string) => {
    const arr = (value[field] as string[]) ?? [];
    onChange({ [field]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] } as any);
  };

  const addDate = () => {
    if (!newDate || value.avail_dates.includes(newDate)) return;
    onChange({ avail_dates: [...value.avail_dates, newDate] });
    setNewDate("");
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">
          Mode de disponibilité <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const active = value.type_disponibilite === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => onChange({ type_disponibilite: opt.value })}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-xs font-bold transition-all text-left
                  ${active ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                <span className={`material-symbols-outlined text-base ${active ? "text-primary" : "text-slate-400"}`}>{opt.icon}</span>
                <div>
                  <p className="font-extrabold">{opt.label}</p>
                  <p className={`text-[10px] font-medium mt-0.5 ${active ? "text-slate-600" : "text-slate-400"}`}>{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {value.type_disponibilite === "A" && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex gap-2">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            <button type="button" onClick={addDate}
              className="px-3 py-2 bg-primary text-slate-900 rounded-xl text-xs font-extrabold hover:bg-primary/90">
              <Plus size={14} />
            </button>
          </div>
          {value.avail_dates.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {value.avail_dates.map((dt) => (
                <span key={dt} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold border border-primary/20">
                  {dt}
                  <button type="button" onClick={() => onChange({ avail_dates: value.avail_dates.filter((x) => x !== dt) })}>
                    <X size={8} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Heure début</label>
              <input type="time" value={value.heure_debut_A} onChange={(e) => onChange({ heure_debut_A: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Heure fin</label>
              <input type="time" value={value.heure_fin_A} onChange={(e) => onChange({ heure_fin_A: e.target.value })} className={ic} />
            </div>
          </div>
        </div>
      )}

      {value.type_disponibilite === "B" && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex flex-wrap gap-1">
            {JOURS.map((j) => (
              <button key={j} type="button" onClick={() => togArr("jours_recurrence", j)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 transition-all
                  ${value.jours_recurrence.includes(j) ? "border-primary bg-primary text-slate-900" : "border-slate-200 bg-white text-slate-500"}`}>
                {j.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Heure début</label>
              <input type="time" value={value.heure_debut_B} onChange={(e) => onChange({ heure_debut_B: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Heure fin</label>
              <input type="time" value={value.heure_fin_B} onChange={(e) => onChange({ heure_fin_B: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Valable du</label>
              <input type="date" value={value.valable_du} onChange={(e) => onChange({ valable_du: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Valable au</label>
              <input type="date" value={value.valable_au} onChange={(e) => onChange({ valable_au: e.target.value })} className={ic} />
            </div>
          </div>
        </div>
      )}

      {value.type_disponibilite === "C" && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Début *</label>
              <input type="date" value={value.date_debut_C} onChange={(e) => onChange({ date_debut_C: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Fin *</label>
              <input type="date" value={value.date_fin_C} onChange={(e) => onChange({ date_fin_C: e.target.value })} className={ic} />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Jours disponibles</label>
            <div className="flex flex-wrap gap-1">
              {JOURS.map((j) => (
                <button key={j} type="button" onClick={() => togArr("jours_dispo_C", j)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 transition-all
                    ${value.jours_dispo_C.includes(j) ? "border-primary bg-primary text-slate-900" : "border-slate-200 bg-white text-slate-500"}`}>
                  {j.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Heure début</label>
              <input type="time" value={value.heure_debut_C} onChange={(e) => onChange({ heure_debut_C: e.target.value })} className={ic} />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Heure fin</label>
              <input type="time" value={value.heure_fin_C} onChange={(e) => onChange({ heure_fin_C: e.target.value })} className={ic} />
            </div>
          </div>
        </div>
      )}

      {value.type_disponibilite === "D" && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Délai de réponse</label>
            <div className="flex gap-2">
              {["24h", "48h", "72h"].map((v) => (
                <button key={v} type="button" onClick={() => onChange({ delai_reponse: v })}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold border-2 transition-all
                    ${value.delai_reponse === v ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Message envoyé au client</label>
            <textarea value={value.message_accueil} onChange={(e) => onChange({ message_accueil: e.target.value })}
              rows={3} placeholder="Merci pour votre demande ! Je vous réponds sous 24h…"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none" />
          </div>
        </div>
      )}

      {value.type_disponibilite === "E" && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Saisons disponibles</label>
            <div className="flex gap-2">
              {SAISONS.map((s) => (
                <button key={s} type="button" onClick={() => togArr("saisons_offre", s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-extrabold border-2 transition-all
                    ${value.saisons_offre.includes(s) ? "border-primary bg-primary text-slate-900" : "border-slate-200 bg-white text-slate-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Heure de début habituelle</label>
            <input type="time" value={value.heure_debut_E} onChange={(e) => onChange({ heure_debut_E: e.target.value })} className={ic} />
          </div>
        </div>
      )}
    </div>
  );
}
