"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { AVAILABILITY_TYPES, SAISONS, OFFER_DETAIL_FIELDS } from "@/lib/offer-schema";
import ProviderSchemaForm from "@/components/guide/offer/ProviderSchemaForm";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const inputCls =
  "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono";

// ── Availability Block ─────────────────────────────────────────────────────────
export function AvailBlock({
  value,
  onChange,
}: {
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  const mode = (value.mode as string) ?? "specific";
  const weekdays: number[] = (value.weekdays as number[]) ?? [];
  const specificDates: string[] = (value.specific_dates as string[]) ?? [];
  const saisons: string[] = (value.saisons as string[]) ?? [];
  const set = (f: string, v: any) => onChange({ ...value, [f]: v });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {AVAILABILITY_TYPES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => set("mode", m.value)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
              mode === m.value
                ? "border-primary bg-primary/10 text-slate-900"
                : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"
            }`}
          >
            <span className={`material-symbols-outlined text-sm ${mode === m.value ? "text-primary" : "text-slate-400"}`}>
              {m.icon}
            </span>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "specific" && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="date"
              value={(value.new_date as string) ?? ""}
              onChange={(e) => set("new_date", e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => {
                const d = (value.new_date as string) ?? "";
                if (d && !specificDates.includes(d))
                  onChange({ ...value, specific_dates: [...specificDates, d].sort(), new_date: "" });
              }}
              className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-extrabold hover:bg-primary/90"
            >
              Ajouter
            </button>
          </div>
          {specificDates.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {specificDates.map((d) => (
                <span key={d} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold border border-primary/20">
                  {d}
                  <button type="button" onClick={() => onChange({ ...value, specific_dates: specificDates.filter((x) => x !== d) })}>
                    <X size={8} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "weekly" && (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {WEEKDAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => set("weekdays", weekdays.includes(i) ? weekdays.filter((d) => d !== i) : [...weekdays, i])}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black border-2 transition-all ${
                  weekdays.includes(i) ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début</label>
              <input type="date" value={(value.start as string) ?? ""} onChange={(e) => set("start", e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin</label>
              <input type="date" value={(value.end as string) ?? ""} onChange={(e) => set("end", e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>
      )}

      {mode === "period" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Début *</label>
            <input type="date" value={(value.start as string) ?? ""} onChange={(e) => set("start", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Fin *</label>
            <input type="date" value={(value.end as string) ?? ""} onChange={(e) => set("end", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      )}

      {mode === "on_demand" && (
        <div className="flex gap-2">
          {["24h", "48h", "72h"].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => set("delai", d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border-2 transition-all ${
                (value.delai ?? "24h") === d ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {mode === "season" && (
        <div className="flex gap-1.5">
          {SAISONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("saisons", saisons.includes(s) ? saisons.filter((x) => x !== s) : [...saisons, s])}
              className={`flex-1 py-1.5 rounded-xl text-[9px] font-black border-2 transition-all ${
                saisons.includes(s) ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {mode !== "on_demand" && (
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure début</label>
            <input type="time" value={(value.heure_debut as string) ?? ""} onChange={(e) => set("heure_debut", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">Heure fin</label>
            <input type="time" value={(value.heure_fin as string) ?? ""} onChange={(e) => set("heure_fin", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Global Pricing Block ───────────────────────────────────────────────────────
export function GlobalPricingBlock({
  value,
  onChange,
}: {
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  const set = (f: string, v: any) => onChange({ ...value, [f]: v });
  return (
    <div className="space-y-2.5">
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">
          Prix groupe <span className="normal-case font-medium text-slate-300">(optionnel)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span>
            <input type="number" min="0" placeholder="1200" value={(value.prix_groupe as string) ?? ""}
              onChange={(e) => set("prix_groupe", e.target.value)} className={`${inputCls} pl-8`} />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">pers.</span>
            <input type="number" min="1" placeholder="10" value={(value.nb_pers_groupe as string) ?? ""}
              onChange={(e) => set("nb_pers_groupe", e.target.value)} className={`${inputCls} pl-10`} />
          </div>
        </div>
      </div>
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">
          Prix enfant <span className="normal-case font-medium text-slate-300">(optionnel)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span>
            <input type="number" min="0" placeholder="150" value={(value.prix_enfant as string) ?? ""}
              onChange={(e) => set("prix_enfant", e.target.value)} className={`${inputCls} pl-8`} />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">≤ âge</span>
            <input type="number" min="0" max="18" placeholder="12" value={(value.age_max_enfant as string) ?? ""}
              onChange={(e) => set("age_max_enfant", e.target.value)} className={`${inputCls} pl-11`} />
          </div>
        </div>
      </div>
      <div>
        <label className="text-[9px] font-black text-slate-400 uppercase mb-0.5 block">
          Supplément privatisation <span className="normal-case font-medium text-slate-300">(optionnel)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">DT</span>
          <input type="number" min="0" placeholder="500" value={(value.supp_priv as string) ?? ""}
            onChange={(e) => set("supp_priv", e.target.value)} className={`${inputCls} pl-8`} />
        </div>
      </div>
    </div>
  );
}

// ── Unit Pricing Block (prix/nuit, max pers, acompte) ─────────────────────────
function UnitPricingBlock({
  value,
  onChange,
}: {
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
}) {
  const set = (f: string, v: any) => onChange({ ...value, [f]: v });
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Prix / nuit (TND)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold">DT</span>
          <input type="number" min="0" placeholder="Ex : 380"
            value={(value.prix_unite as string) ?? ""}
            onChange={(e) => set("prix_unite", e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-1 block">Max. personnes pour cette unité</label>
        <input type="number" min="1" placeholder="Ex : 2"
          value={(value.max_pers as string) ?? ""}
          onChange={(e) => set("max_pers", e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
      </div>
      <button
        type="button"
        onClick={() => set("acompte_requis", !(value.acompte_requis ?? false))}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
          value.acompte_requis ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"
        }`}
      >
        <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-all ${value.acompte_requis ? "border-primary bg-primary" : "border-slate-300"}`}>
          {value.acompte_requis && <Check size={9} className="text-white" />}
        </div>
        Acompte requis pour cette unité
      </button>
      {value.acompte_requis && (
        <div className="grid grid-cols-2 gap-2 mt-1">
          <select
            value={(value.type_acompte as string) ?? "pourcentage"}
            onChange={(e) => set("type_acompte", e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="pourcentage">% du prix</option>
            <option value="fixe">Montant fixe (DT)</option>
          </select>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">
              {(value.type_acompte ?? "pourcentage") === "pourcentage" ? "%" : "DT"}
            </span>
            <input type="number" min="1" placeholder="30"
              value={(value.valeur_acompte as string) ?? ""}
              onChange={(e) => set("valeur_acompte", e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini Photo Upload ──────────────────────────────────────────────────────────
function MiniPhotoBlock({
  label,
  photos,
  onChange,
}: {
  label: string;
  photos: string[];
  onChange: (v: string[]) => void;
}) {
  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 6) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 600;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange([...photos, canvas.toDataURL("image/jpeg", 0.7)]);
      URL.revokeObjectURL(url);
    };
    img.src = url;
    e.target.value = "";
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
        📷 {label}
      </p>
      {photos.length === 0 ? (
        <label className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
          <span className="material-symbols-outlined text-slate-300 text-2xl">add_photo_alternate</span>
          <p className="text-[10px] text-slate-400 font-bold">Cliquez pour ajouter des photos</p>
          <input type="file" accept="image/*" className="hidden" onChange={addPhoto} />
        </label>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group">
              <img src={p} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={8} className="text-white" />
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-lg">add</span>
              <input type="file" accept="image/*" className="hidden" onChange={addPhoto} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionSep({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase border-b border-slate-100 pb-1 mb-3">
      {label}
    </p>
  );
}

// ── Hébergement Block (with nb units + unit tabs) ─────────────────────────────
export interface HebergData {
  nb_unites: number;
  active_unit: number;
  units: Array<Record<string, any>>;    // each: avail, pricing, photos[], + OFFER_DETAIL_FIELDS values
  global_pricing: Record<string, any>; // prix groupe, enfant, supp
  subtype_avail: Record<string, any>;  // global avail (when nb=1)
}

export const EMPTY_HEBERG: HebergData = {
  nb_unites: 1,
  active_unit: 0,
  units: [{}],
  global_pricing: {},
  subtype_avail: {},
};

export function HebergBlock({
  subtype,
  value,
  onChange,
}: {
  subtype: string;
  value: HebergData;
  onChange: (v: HebergData) => void;
}) {
  const config = OFFER_DETAIL_FIELDS[subtype];
  if (!config) return null;

  const nb = value.nb_unites;
  const activeI = value.active_unit;
  const units = value.units;

  const setUnit = (i: number, patch: Record<string, any>) => {
    const next = [...units];
    next[i] = { ...(next[i] ?? {}), ...patch };
    onChange({ ...value, units: next });
  };

  const getUnit = (i: number) => units[i] ?? {};

  const nameKey = config.sections[0]?.fields.find((f) => f.key.startsWith("nom_"))?.key ?? "";

  const unitName = (i: number) => (getUnit(i)[nameKey] as string) || `Unité ${i + 1}`;

  function addUnit() {
    onChange({ ...value, nb_unites: nb + 1, units: [...units, {}], active_unit: nb });
  }

  function removeUnit() {
    if (nb <= 1) return;
    const newUnits = units.slice(0, -1);
    onChange({ ...value, nb_unites: nb - 1, units: newUnits, active_unit: Math.min(activeI, nb - 2) });
  }

  const unitPhotos = (getUnit(activeI).photos as string[]) ?? [];
  const unitFields = getUnit(activeI);

  return (
    <div className="space-y-4">
      {/* ── Nb d'unités */}
      <div className="flex items-center justify-between py-2 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Nb d'unités</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Chambres / suites / tentes disponibles</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={removeUnit}
            className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center text-sm transition-colors">−</button>
          <span className="text-base font-extrabold text-slate-800 w-6 text-center">{nb}</span>
          <button type="button" onClick={addUnit}
            className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center text-sm transition-colors">+</button>
        </div>
      </div>

      {/* ── Si plusieurs unités : tabs */}
      {nb > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: nb }, (_, i) => (
            <button key={i} type="button" onClick={() => onChange({ ...value, active_unit: i })}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${
                activeI === i ? "bg-primary text-white border-primary" : "bg-white border-slate-200 text-slate-500 hover:border-primary/30"
              }`}>
              {unitName(i)}
            </button>
          ))}
        </div>
      )}

      {/* ── Photos de l'unité */}
      <MiniPhotoBlock
        label={nb > 1 ? `Photos — ${unitName(activeI)}` : "Photos"}
        photos={unitPhotos}
        onChange={(v) => setUnit(activeI, { photos: v })}
      />

      {/* ── Champs OFFER_DETAIL_FIELDS */}
      <ProviderSchemaForm
        config={config}
        value={unitFields}
        onChange={(p) => setUnit(activeI, p)}
      />
    </div>
  );
}

// ── Simple Service Block (transport / restauration) ────────────────────────────
export interface SimpleServiceData {
  avail: Record<string, any>;
  pricing: Record<string, any>;
  photos: string[];
  fields: Record<string, any>;
}

export const EMPTY_SIMPLE_SERVICE: SimpleServiceData = {
  avail: {},
  pricing: {},
  photos: [],
  fields: {},
};

export function SimpleServiceBlock({
  subtype,
  value,
  onChange,
}: {
  subtype: string;
  value: SimpleServiceData;
  onChange: (v: SimpleServiceData) => void;
}) {
  const config = OFFER_DETAIL_FIELDS[subtype];
  if (!config) return null;

  return (
    <div className="space-y-4">
      {/* ── Photos */}
      <MiniPhotoBlock
        label="Photos de l'offre"
        photos={value.photos}
        onChange={(v) => onChange({ ...value, photos: v })}
      />

      {/* ── Champs OFFER_DETAIL_FIELDS */}
      <ProviderSchemaForm
        config={config}
        value={value.fields}
        onChange={(p) => onChange({ ...value, fields: { ...value.fields, ...p } })}
      />
    </div>
  );
}
