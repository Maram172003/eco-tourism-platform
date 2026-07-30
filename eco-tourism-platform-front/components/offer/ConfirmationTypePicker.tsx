"use client";

export interface ConfirmationData {
  type_confirmation: string;
  politique_annulation: string;
  description_politique: string;
  annulation_meteo: boolean | null;
}

export const EMPTY_CONFIRMATION: ConfirmationData = {
  type_confirmation: "", politique_annulation: "", description_politique: "", annulation_meteo: null,
};

const ic = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm";

const CONFIRMATION_OPTIONS = [
  { value: "Instantanée (confirmé dès paiement)",   icon: "bolt",         desc: "Confirmation automatique" },
  { value: "Sous 24h (validation manuelle)",         icon: "schedule",     desc: "Vous validez dans la journée" },
  { value: "Sous 48h (validation manuelle)",         icon: "pending",      desc: "Vous validez sous 48 heures" },
  { value: "Demande de devis",                       icon: "request_quote",desc: "Échange préalable requis" },
  { value: "Sur demande avec acompte",               icon: "payments",     desc: "Acompte demandé à la validation" },
];

const ANNULATION_OPTIONS = [
  { value: "Flexible (100% remboursé jusqu'à 24h avant)", desc: "Annulation libre jusqu'à la veille" },
  { value: "Modérée (50% remboursé jusqu'à 48h avant)",   desc: "Remboursement partiel sous 48h" },
  { value: "Stricte (non remboursable)",                  desc: "Aucun remboursement" },
  { value: "Personnalisée",                               desc: "Décrivez vos propres conditions" },
];

export function ConfirmationTypePicker({ value, onChange, hideMeteо = false }: {
  value: ConfirmationData;
  onChange: (v: Partial<ConfirmationData>) => void;
  hideMeteо?: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Confirmation */}
      <div>
        <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">
          Type de confirmation <span className="text-red-500">*</span>
        </p>
        <div className="space-y-1.5">
          {CONFIRMATION_OPTIONS.map((opt) => {
            const active = value.type_confirmation === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => onChange({ type_confirmation: opt.value })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                  ${active ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                <span className={`material-symbols-outlined text-lg ${active ? "text-primary" : "text-slate-400"}`}>{opt.icon}</span>
                <div>
                  <p className="text-sm font-bold">{opt.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Annulation */}
      <div>
        <p className="text-xs font-black tracking-widest text-slate-400 uppercase mb-2">
          Politique d'annulation <span className="text-red-500">*</span>
        </p>
        <div className="space-y-1.5">
          {ANNULATION_OPTIONS.map((opt) => {
            const active = value.politique_annulation === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => onChange({ politique_annulation: opt.value })}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all
                  ${active ? "border-primary bg-primary/5 text-slate-900" : "border-slate-100 bg-white hover:border-primary/30 text-slate-600"}`}>
                <p>{opt.value}</p>
                <p className="text-xs text-slate-400 font-normal mt-0.5">{opt.desc}</p>
              </button>
            );
          })}
        </div>
        {value.politique_annulation === "Personnalisée" && (
          <div className="mt-3">
            <label className="text-xs font-black text-slate-400 uppercase block mb-1">Décrivez vos conditions</label>
            <textarea value={value.description_politique} onChange={(e) => onChange({ description_politique: e.target.value })}
              rows={3} placeholder="Détaillez les conditions de remboursement…"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none" />
          </div>
        )}
      </div>

      {!hideMeteо && <div className="h-px bg-slate-100" />}

      {/* Météo */}
      {!hideMeteо && <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500 text-lg">thunderstorm</span>
          <div>
            <p className="text-sm font-bold text-slate-700">Remboursement si météo dangereuse</p>
            <p className="text-xs text-slate-400">En cas d'annulation pour raisons météo</p>
          </div>
        </div>
        <div className="flex gap-2">
          {([true, false] as const).map((v) => (
            <button key={String(v)} type="button" onClick={() => onChange({ annulation_meteo: v })}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all border-2
                ${value.annulation_meteo === v ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40 bg-white"}`}>
              {v ? "Oui" : "Non"}
            </button>
          ))}
        </div>
      </div>}
    </div>
  );
}
