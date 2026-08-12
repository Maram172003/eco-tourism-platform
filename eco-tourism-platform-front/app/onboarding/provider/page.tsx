"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Leaf, ArrowRight, ArrowLeft, Check, X, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { PROVIDER_SCHEMA, SUBTYPE_FIELDS, getCategoryByValue } from "@/lib/provider-schema";
import type { FieldConfig } from "@/lib/provider-schema";
import { getConsistentSession } from "@/lib/auth";

const MapPicker = dynamic(() => import("@/components/map/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] bg-slate-100 rounded-2xl flex items-center justify-center">
      <span className="text-sm text-slate-400 font-medium">Chargement de la carte…</span>
    </div>
  ),
});

// ─── Static data ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "ar", label: "Arabe" },
  { value: "fr", label: "Français" },
  { value: "en", label: "Anglais" },
  { value: "it", label: "Italien" },
  { value: "es", label: "Espagnol" },
  { value: "de", label: "Allemand" },
  { value: "ber", label: "Amazigh" },
];

const TUNISIAN_GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa",
  "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia",
  "La Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid",
  "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];

const ECO_CERTIFICATIONS = [
  "ISO 21401 — Hébergement durable",
  "GSTC — Global Sustainable Tourism",
  "Label Écolodge Tunisie",
  "Charte Tourisme Durable ONTT",
  "Marque Terroir Tunisien",
  "Certification Artisanat Tunisien",
  "Green Key",
  "Travelife",
  "EarthCheck",
];


const STEPS = [
  { id: 1, title: "Identité & Médias", subtitle: "Présentation de l'organisation" },
  { id: 2, title: "Localisation & Contact", subtitle: "Où vous trouver" },
  { id: 3, title: "Activité principale", subtitle: "Ce que vous faites" },
  { id: 4, title: "Activités secondaires", subtitle: "Services complémentaires" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function compressImage(file: File, maxPx = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className="material-symbols-outlined text-primary text-xl">{icon}</span>
        <span className="font-bold text-sm text-slate-800">{title}</span>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function ChipsField({
  label, options, selected, onToggle,
}: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt} type="button" onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border-2
                ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiChipSelect({
  options, selected, onToggle,
}: {
  options: { value: string; label: string; icon?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value} type="button" onClick={() => onToggle(opt.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2
              ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}
          >
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldInput({
  label, icon, value, onChange, placeholder, type = "text", required = false, error, hint,
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; required?: boolean; error?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-slate-700 ml-1">{label}{required && " *"}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">{icon}</span>
        <input
          type={type}
          className={`w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium ${error ? "ring-2 ring-red-400" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {error && <p className="text-xs text-red-500 font-semibold ml-1 mt-0.5">{error}</p>}
      {!error && hint && <p className="text-xs text-slate-400 ml-1 mt-0.5">{hint}</p>}
    </div>
  );
}

// Photo grid — reused for both presentation and activity photos
function PhotoGrid({
  photos,
  setPhotos,
  maxPhotos = 5,
  label,
}: {
  photos: string[];
  setPhotos: (p: string[]) => void;
  maxPhotos?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = maxPhotos - photos.length;
    const compressed = await Promise.all(files.slice(0, remaining).map((f) => compressImage(f, 900)));
    setPhotos([...photos, ...compressed]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {label && (
          <p className="text-sm font-bold text-slate-700">
            {label} <span className="text-slate-400 font-normal">(max {maxPhotos})</span>
          </p>
        )}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors ml-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAdd} />
      <div className="grid grid-cols-4 gap-2">
        {photos.map((src, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group">
            <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-all"
          >
            <Plus className="w-5 h-5 text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Photo</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Single dynamic field renderer ───────────────────────────────────────────

function DynField({ field, value, onChange }: { field: FieldConfig; value: any; onChange: (v: any) => void }) {
  if (field.type === "multiselect" && field.options) {
    return (
      <ChipsField
        label={field.label}
        options={field.options}
        selected={value || []}
        onToggle={(v) => {
          const cur: string[] = value || [];
          onChange(cur.includes(v) ? cur.filter((x: string) => x !== v) : [...cur, v]);
        }}
      />
    );
  }
  if (field.type === "text") {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wide">{field.label}</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">edit</span>
          <input type="text" className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={field.label} />
        </div>
      </div>
    );
  }
  if (field.type === "number") {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wide">{field.label}</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">tag</span>
          <input type="number" min={0} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 text-sm font-medium" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="0" />
        </div>
      </div>
    );
  }
  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wide">{field.label}</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">expand_circle_down</span>
          <select className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 text-sm font-medium appearance-none" value={value || ""} onChange={(e) => onChange(e.target.value)}>
            <option value="">Sélectionner…</option>
            {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
    );
  }
  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl">
        <span className="text-sm font-semibold text-slate-700 pr-4">{field.label}</span>
        <button type="button" onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${value ? "bg-primary" : "bg-slate-200"}`}>
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${value ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wide">{field.label}</label>
        <textarea className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium resize-none" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={`Décrivez…`} rows={3} />
      </div>
    );
  }
  if (field.type === "url") {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 ml-1 uppercase tracking-wide">{field.label}</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
          <input
            type="url"
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>
    );
  }
  return null;
}

// ─── DynCertCard — inline cert card for boolean-triggered cert fields ─────────

function DynCertCard({ nameField, urlField, nameValue, urlValue, onNameChange, onUrlChange }: {
  nameField: FieldConfig;
  urlField: FieldConfig;
  nameValue: string;
  urlValue: string;
  onNameChange: (v: string) => void;
  onUrlChange: (v: string) => void;
}) {
  const imgRef = useRef<HTMLInputElement>(null);
  const isPhoto = urlValue.startsWith("data:");
  const [useUrl, setUseUrl] = useState(!isPhoto);

  async function handleImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 800);
    onUrlChange(compressed);
    setUseUrl(false);
    if (imgRef.current) imgRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 border-b border-emerald-200">
        <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
        <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest">Certificat</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{nameField.label}</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">workspace_premium</span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 text-slate-900 placeholder:text-slate-400 text-sm font-medium"
              value={nameValue}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={nameField.label}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Document / Preuve</label>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setUseUrl(false)} className={`px-2.5 py-1 rounded-full font-bold transition-all ${!useUrl ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>Photo</button>
              <button type="button" onClick={() => setUseUrl(true)} className={`px-2.5 py-1 rounded-full font-bold transition-all ${useUrl ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>URL</button>
            </div>
          </div>

          {!useUrl ? (
            <div key="photo-mode">
              {urlValue && isPhoto ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28">
                  <img src={urlValue} alt="Certificat" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onUrlChange("")}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow">
                    <X className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => imgRef.current?.click()}
                  className="w-full border-2 border-dashed border-emerald-200 hover:border-emerald-400/60 rounded-xl py-5 flex flex-col items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-emerald-300 text-3xl">upload_file</span>
                  <span className="text-xs text-slate-400 font-medium">Uploader le certificat</span>
                </button>
              )}
              <input ref={imgRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImgChange} />
            </div>
          ) : (
            <div key="url-mode" className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
              <input
                type="url"
                className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-400 text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                value={isPhoto ? "" : urlValue}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="https://…"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ActivityFields — reusable for primary + secondary activities ─────────────

function ActivityFields({
  categoryValue,
  subtypeValues,
  setSubtypes,
  dynFields,
  setDynField,
  photos,
  setPhotos,
  subtypePhotos = {},
  setSubtypePhotos,
}: {
  categoryValue: string;
  subtypeValues: string[];
  setSubtypes: (v: string[]) => void;
  dynFields: Record<string, any>;
  setDynField: (key: string, val: any) => void;
  photos: string[];
  setPhotos: (p: string[]) => void;
  subtypePhotos?: Record<string, string[]>;
  setSubtypePhotos?: (subtypeVal: string, photos: string[]) => void;
}) {
  const category = getCategoryByValue(categoryValue);
  const subtypeRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    subtypeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (subtypeValues.length > 0 && fieldsRef.current) {
      fieldsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [subtypeValues.length]);

  if (!category) return null;

  const MULTI_SUBTYPE_CATEGORIES = new Set([
    "hebergement", "activite", "eco_tour", "restaurant_terroir",
    "artisanat", "agriculture_terroir", "culture_patrimoine",
    "bien_etre_spa", "transport_eco", "volontariat_eco",
  ]);
  const isMultiSubtype = MULTI_SUBTYPE_CATEGORIES.has(categoryValue);

  function toggleSubtype(value: string) {
    if (isMultiSubtype) {
      if (subtypeValues.includes(value)) {
        setSubtypes(subtypeValues.filter((v) => v !== value));
      } else {
        setSubtypes([...subtypeValues, value]);
      }
    } else {
      setSubtypes(subtypeValues[0] === value ? [] : [value]);
    }
  }

  return (
    <div className="space-y-5">
      {/* Sub-type selector — multi-select */}
      <div ref={subtypeRef}>
        <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">
          Sous-type — <span className="material-symbols-outlined align-middle" style={{ fontSize: 15 }}>{category.icon}</span> {category.label}
          {isMultiSubtype && subtypeValues.length > 0 && (
            <span className="ml-2 normal-case text-primary font-bold">{subtypeValues.length} sélectionné{subtypeValues.length > 1 ? "s" : ""}</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {category.subtypes.map((st) => (
            <button
              key={st.value} type="button"
              onClick={() => toggleSubtype(st.value)}
              className={`px-3.5 py-2 rounded-full text-sm font-bold transition-all border-2 flex items-center gap-1.5
                ${subtypeValues.includes(st.value) ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/40 bg-white"}`}
            >
              {subtypeValues.includes(st.value) && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>}
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Champs par sous-type — communs extraits en haut, spécifiques séparés */}
      <div ref={fieldsRef} className="space-y-4">
        {(() => {
          if (subtypeValues.length === 0) return null;

          // Collect all fields per subtype
          const subtypeFieldSets = subtypeValues.map((v) => {
            const keys = new Set(
              (SUBTYPE_FIELDS[v]?.sections ?? []).flatMap((s) => s.fields.map((f) => f.key))
            );
            return { v, keys };
          });

          // A key is "common" if it appears in ALL selected subtypes (only for hebergement multi-select)
          const commonKeys = isMultiSubtype && subtypeValues.length > 1
            ? new Set(
                [...subtypeFieldSets[0].keys].filter((k) =>
                  subtypeFieldSets.slice(1).every((x) => x.keys.has(k))
                )
              )
            : new Set<string>();

          // Common fields grouped by their section name (from first subtype that defines them)
          const commonSections: Array<{ section: string; fields: FieldConfig[] }> = [];
          const commonKeysSeen = new Set<string>();
          for (const subtypeVal of subtypeValues) {
            for (const { section, fields } of SUBTYPE_FIELDS[subtypeVal]?.sections ?? []) {
              const newCommon = fields.filter((f) => commonKeys.has(f.key) && !commonKeysSeen.has(f.key));
              if (newCommon.length > 0) {
                newCommon.forEach((f) => commonKeysSeen.add(f.key));
                const existing = commonSections.find((s) => s.section === section);
                if (existing) existing.fields.push(...newCommon);
                else commonSections.push({ section, fields: newCommon });
              }
            }
          }

          function renderFields(fields: FieldConfig[]) {
            const visible = fields.filter(f => !f.dependsOn || dynFields[f.dependsOn.field] === f.dependsOn.value);
            const skipped = new Set<string>();
            return visible.map((f, fi) => {
              if (skipped.has(f.key)) return null;
              const isCertText = f.type === "text" && f.dependsOn && (
                f.key.includes("certif") ||
                f.label.toLowerCase().includes("certif") ||
                f.label.toLowerCase().includes("organisme") ||
                f.label.toLowerCase().includes("diplôme")
              );
              if (isCertText) {
                const urlSib = visible.find((x, xi) => xi > fi && x.type === "url" && x.dependsOn?.field === f.dependsOn?.field);
                if (urlSib) {
                  skipped.add(urlSib.key);
                  return (
                    <DynCertCard
                      key={f.key}
                      nameField={f}
                      urlField={urlSib}
                      nameValue={dynFields[f.key] ?? ""}
                      urlValue={dynFields[urlSib.key] ?? ""}
                      onNameChange={(val) => setDynField(f.key, val)}
                      onUrlChange={(val) => setDynField(urlSib.key, val)}
                    />
                  );
                }
              }
              return <DynField key={f.key} field={f} value={dynFields[f.key]} onChange={(val) => setDynField(f.key, val)} />;
            });
          }

          return (
            <>
              {/* Blocs communs — section names from schema, shared badge */}
              {commonSections.map(({ section, fields: cFields }) => (
                <div key={`common-${section}`} className="rounded-2xl border border-primary/20 overflow-hidden">
                  <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/15 flex items-center justify-between">
                    <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{section}</p>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>layers</span>
                      partagé
                    </span>
                  </div>
                  <div className="p-4 space-y-4">
                    {renderFields(cFields)}
                  </div>
                </div>
              ))}

              {/* Sections spécifiques par sous-type */}
              {subtypeValues.map((subtypeVal) => {
                const stConfig = SUBTYPE_FIELDS[subtypeVal];
                if (!stConfig) return null;
                const stLabel = category.subtypes.find((s) => s.value === subtypeVal)?.label ?? subtypeVal;

                const specificSections = stConfig.sections.map(({ section, fields }) => ({
                  section,
                  fields: fields.filter((f) => !commonKeys.has(f.key)),
                })).filter(({ fields }) => fields.length > 0);

                if (specificSections.length === 0) return null;

                return (
                  <div key={subtypeVal} className="space-y-3">
                    {subtypeValues.length > 1 && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200" />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white">
                          <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 14 }}>{category.icon}</span>
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{stLabel}</span>
                        </div>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    {specificSections.map(({ section, fields }, si) => (
                      <div key={`${subtypeVal}-${si}`} className="rounded-2xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{section}</p>
                        </div>
                        <div className="p-4 space-y-4">
                          {renderFields(fields)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          );
        })()}
      </div>

      {/* Photos — par sous-type pour hébergement multi, sinon global */}
      {subtypeValues.length > 0 && (
        <div className="pt-1 space-y-4">
          {isMultiSubtype && subtypeValues.length > 1 ? (
            subtypeValues.map((subtypeVal) => {
              const stLabel = category.subtypes.find((s) => s.value === subtypeVal)?.label ?? subtypeVal;
              return (
                <PhotoGrid
                  key={subtypeVal}
                  photos={subtypePhotos[subtypeVal] ?? []}
                  setPhotos={(p) => setSubtypePhotos?.(subtypeVal, p)}
                  maxPhotos={4}
                  label={`Photos — ${stLabel}`}
                />
              );
            })
          ) : (
            <PhotoGrid photos={photos} setPhotos={setPhotos} maxPhotos={4} label="Photos de l'activité" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── CertCard — for personal + org certifications ────────────────────────────

function PersonalCertCard({ cert, index, onChange, onRemove }: {
  cert: { name: string; image: string; url: string };
  index: number;
  onChange: (c: { name: string; image: string; url: string }) => void;
  onRemove: () => void;
}) {
  const imgRef = useRef<HTMLInputElement>(null);
  const name  = cert.name  ?? "";
  const image = cert.image ?? "";
  const url   = cert.url   ?? "";
  const [useUrl, setUseUrl] = useState(!!url && !image);

  async function handleImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 800);
    onChange({ name, image: compressed, url: "" });
    setUseUrl(false);
    if (imgRef.current) imgRef.current.value = "";
  }

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">verified</span>
          <span className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Certification {index + 1}</span>
        </div>
        <button type="button" onClick={onRemove} className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors">
          <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        {/* Nom */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nom du label / certification *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">workspace_premium</span>
            <input
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium"
              value={name}
              onChange={(e) => onChange({ name: e.target.value, image, url })}
              placeholder="Ex: Guide certifié ONTT, ISO 21401, Green Key…"
            />
          </div>
        </div>

        {/* Image ou URL */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Document / Preuve</label>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setUseUrl(false)} className={`px-2.5 py-1 rounded-full font-bold transition-all ${!useUrl ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>Photo</button>
              <button type="button" onClick={() => setUseUrl(true)}  className={`px-2.5 py-1 rounded-full font-bold transition-all ${useUrl  ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>URL</button>
            </div>
          </div>

          {!useUrl ? (
            <div key="photo-mode">
              {image ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 h-28">
                  <img src={image} alt="Certification" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onChange({ name, image: "", url })}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow">
                    <X className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => imgRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-primary/40 rounded-xl py-5 flex flex-col items-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-slate-300 text-3xl">upload_file</span>
                  <span className="text-xs text-slate-400 font-medium">Uploader le certificat</span>
                </button>
              )}
              <input ref={imgRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImgChange} />
            </div>
          ) : (
            <div key="url-mode" className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
              <input
                type="url"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 text-sm font-medium"
                value={url}
                onChange={(e) => onChange({ name, image: "", url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 : Identité & Médias ───────────────────────────────────────────────

function StepIdentity({ data, setData, fieldErrors = {} }: any) {
  const logoInputRef       = useRef<HTMLInputElement>(null);
  const personalPhotoRef   = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setData({ ...data, logo: await compressImage(file, 400) });
  }

  async function handlePersonalPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setData({ ...data, personal_photo: await compressImage(file, 400) });
  }

  return (
    <div className="space-y-7">

      {/* ── Présentation personnelle du prestataire ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-base">person</span>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Votre présentation personnelle</p>
        </div>

        <div className="flex items-start gap-4">
          {/* Photo personnelle */}
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-slate-100 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
                {data.personal_photo
                  ? <img src={data.personal_photo} alt="Photo" className="w-full h-full object-cover" />
                  : <span className="material-symbols-outlined text-slate-300 text-3xl">person</span>
                }
              </div>
              <button type="button" onClick={() => personalPhotoRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-slate-900 text-sm">photo_camera</span>
              </button>
              <input ref={personalPhotoRef} type="file" accept="image/*" className="hidden" onChange={handlePersonalPhotoChange} />
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Prénom & Nom *</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">badge</span>
                <input
                  className={`w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium ${fieldErrors.personal_name ? "ring-2 ring-red-400" : ""}`}
                  value={data.personal_name}
                  onChange={(e) => setData({ ...data, personal_name: e.target.value })}
                  placeholder="Ex: Mohamed Ben Ali, Fatima Riahi…"
                />
              </div>
              {fieldErrors.personal_name && <p className="text-xs text-red-500 font-semibold ml-1">{fieldErrors.personal_name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Titre / Rôle</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">work</span>
                <input
                  className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
                  value={data.personal_role}
                  onChange={(e) => setData({ ...data, personal_role: e.target.value })}
                  placeholder="Ex: Directeur, Guide certifié, Fondateur…"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Bio personnelle</label>
          <textarea
            className="w-full px-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium resize-none"
            value={data.personal_bio}
            onChange={(e) => setData({ ...data, personal_bio: e.target.value })}
            placeholder="Présentez-vous brièvement — votre parcours, votre passion pour le tourisme durable…"
            rows={3}
          />
        </div>

        {/* Langues parlées — dans la section personnelle */}
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">Langues parlées</p>
          <MultiChipSelect
            options={LANGUAGES}
            selected={data.languages_spoken}
            onToggle={(v) => {
              const arr: string[] = data.languages_spoken;
              setData({ ...data, languages_spoken: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
            }}
          />
        </div>

        {/* Certifications personnelles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-slate-700">Certifications personnelles</p>
              <p className="text-xs text-slate-400 mt-0.5">Guide certifié, formateur, diplôme, agrément…</p>
            </div>
            <button type="button"
              onClick={() => setData({ ...data, personal_certifications: [...data.personal_certifications, { name: "", image: "", url: "" }] })}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-full transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
          <div className="space-y-3">
            {data.personal_certifications.map((cert: any, i: number) => (
              <PersonalCertCard key={i} cert={cert} index={i}
                onChange={(updated: any) => {
                  const arr = [...data.personal_certifications];
                  arr[i] = updated;
                  setData({ ...data, personal_certifications: arr });
                }}
                onRemove={() => setData({ ...data, personal_certifications: data.personal_certifications.filter((_: any, j: number) => j !== i) })}
              />
            ))}
            {data.personal_certifications.length === 0 && (
              <p className="text-xs text-slate-400 ml-1">Aucune certification ajoutée.</p>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* ── Présentation de l'organisation ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary text-base">store</span>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Présentation de l'organisation</p>
        </div>

        {/* Logo + Nom organisation */}
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
                {data.logo
                  ? <img src={data.logo} alt="Logo" className="w-full h-full object-cover" />
                  : <span className="material-symbols-outlined text-slate-300 text-3xl">store</span>
                }
              </div>
              <button type="button" onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-slate-900 text-sm">photo_camera</span>
              </button>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Nom de l'organisation *</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">store</span>
              <input
                className={`w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium ${fieldErrors.commercial_name ? "ring-2 ring-red-400" : ""}`}
                value={data.commercial_name}
                onChange={(e) => setData({ ...data, commercial_name: e.target.value })}
                placeholder="Ex: Écolodge Ain Draham, Coopérative Amazigh…"
              />
            </div>
            {fieldErrors.commercial_name && <p className="text-xs text-red-500 font-semibold ml-1">{fieldErrors.commercial_name}</p>}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-sm font-bold text-slate-700">Description *</label>
            <span className={`text-xs font-semibold ${data.description.trim().length >= 20 ? "text-primary" : "text-slate-400"}`}>
              {data.description.trim().length} / 20 min
            </span>
          </div>
          <textarea
            className={`w-full px-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium resize-none ${fieldErrors.description ? "ring-2 ring-red-400" : ""}`}
            value={data.description}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="Décrivez votre organisation, ce qui vous rend unique, votre approche durable…"
            rows={3}
          />
          {fieldErrors.description && <p className="text-xs text-red-500 font-semibold ml-1">{fieldErrors.description}</p>}
        </div>

        {/* Histoire */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Histoire & Origine</label>
          <textarea
            className="w-full px-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium resize-none"
            value={data.history}
            onChange={(e) => setData({ ...data, history: e.target.value })}
            placeholder="L'histoire de votre organisation, vos motivations, votre parcours…"
            rows={3}
          />
        </div>

        {/* Photos */}
        <div>
          <label className="text-sm font-bold text-slate-700 ml-1 block mb-2">
            Photos de présentation <span className="text-slate-400 font-normal">(max 5)</span>
          </label>
          <PhotoGrid photos={data.photos} setPhotos={(p) => setData({ ...data, photos: p })} maxPhotos={5} />
        </div>

        {/* Vidéos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-700 ml-1">
              Liens vidéos <span className="text-slate-400 font-normal">(YouTube, Vimeo…)</span>
            </label>
            <button type="button" onClick={() => setData({ ...data, video_urls: [...data.video_urls, ""] })}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {data.video_urls.map((url: string, i: number) => (
              <div key={i} className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">videocam</span>
                <input
                  className="w-full pl-11 pr-10 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
                  value={url}
                  onChange={(e) => { const urls = [...data.video_urls]; urls[i] = e.target.value; setData({ ...data, video_urls: urls }); }}
                  placeholder="https://youtube.com/watch?v=…" type="url"
                />
                <button type="button" onClick={() => setData({ ...data, video_urls: data.video_urls.filter((_: any, j: number) => j !== i) })}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            ))}
            {data.video_urls.length === 0 && <p className="text-xs text-slate-400 ml-1">Aucun lien vidéo ajouté.</p>}
          </div>
        </div>

        {/* Certifications de l'organisation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-slate-700">Labels & Certifications de l'organisation</p>
              <p className="text-xs text-slate-400 mt-0.5">ISO, Green Key, GSTC, label écolodge, certification Travelife…</p>
            </div>
            <button type="button"
              onClick={() => setData({ ...data, org_certifications: [...data.org_certifications, { name: "", image: "", url: "" }] })}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-full transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
          <div className="space-y-3">
            {data.org_certifications.map((cert: any, i: number) => (
              <PersonalCertCard key={i} cert={cert} index={i}
                onChange={(updated: any) => {
                  const arr = [...data.org_certifications];
                  arr[i] = updated;
                  setData({ ...data, org_certifications: arr });
                }}
                onRemove={() => setData({ ...data, org_certifications: data.org_certifications.filter((_: any, j: number) => j !== i) })}
              />
            ))}
            {data.org_certifications.length === 0 && (
              <p className="text-xs text-slate-400 ml-1">Aucun label ajouté.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Step 2 : Localisation & Contact ─────────────────────────────────────────

function StepContact({ data, setData, fieldErrors = {} }: any) {
  return (
    <div className="space-y-4">

      {/* Card — Localisation */}
      <SectionCard icon="location_on" title="Localisation">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Gouvernorat *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">map</span>
            <select
              className={`w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium appearance-none ${fieldErrors.governorate ? "ring-2 ring-red-400" : ""}`}
              value={data.governorate}
              onChange={(e) => setData({ ...data, governorate: e.target.value })}
            >
              <option value="">Sélectionner un gouvernorat</option>
              {TUNISIAN_GOVERNORATES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          {fieldErrors.governorate && <p className="text-xs text-red-500 font-semibold ml-1">{fieldErrors.governorate}</p>}
        </div>

        <FieldInput
          label="Délégation / Ville" icon="location_city"
          value={data.city}
          onChange={(v) => setData({ ...data, city: v })}
          placeholder="Ex: Ain Draham, Djerba, Tozeur…"
        />

        <FieldInput
          label="Adresse précise" icon="signpost"
          value={data.address}
          onChange={(v) => setData({ ...data, address: v })}
          placeholder="Ex: Route de Tabarka km 5, Ain Draham"
        />

        {/* Leaflet map */}
        <div>
          <p className="text-sm font-bold text-slate-700 mb-2">Position sur la carte</p>
          <MapPicker
            lat={data.gps_lat}
            lng={data.gps_lng}
            onPick={(lat, lng, address) => {
              setData({
                ...data,
                gps_lat: lat,
                gps_lng: lng,
                address: data.address || address,
              });
            }}
          />
          {data.gps_lat && data.gps_lng && (
            <p className="text-xs text-slate-400 mt-1 font-medium">
              📍 {Number(data.gps_lat).toFixed(5)}, {Number(data.gps_lng).toFixed(5)}
            </p>
          )}
        </div>
      </SectionCard>

      {/* Card — Présence en ligne */}
      <SectionCard icon="language" title="Présence en ligne">
        <FieldInput
          label="Site web" icon="link"
          value={data.website}
          onChange={(v) => setData({ ...data, website: v })}
          placeholder="https://…"
          type="url"
          error={fieldErrors.website}
          hint="Doit commencer par https://"
        />
        {[
          { key: "instagram", icon: "photo_camera", label: "Instagram", placeholder: "@compte Instagram" },
          { key: "facebook", icon: "groups", label: "Facebook", placeholder: "Page Facebook" },
          { key: "tiktok", icon: "videocam", label: "TikTok", placeholder: "@compte TikTok" },
        ].map(({ key, icon, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">{icon}</span>
              <input
                className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
                value={data.social_networks[key] || ""}
                onChange={(e) => setData({ ...data, social_networks: { ...data.social_networks, [key]: e.target.value } })}
                placeholder={placeholder}
              />
            </div>
          </div>
        ))}
      </SectionCard>

      {/* Card — Contact */}
      <SectionCard icon="call" title="Contact">
        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="Téléphone" icon="phone" required value={data.phone} onChange={(v) => setData({ ...data, phone: v })} placeholder="+216 52 000 000" type="tel" error={fieldErrors.phone} hint="Format : +216 XX XXX XXX" />
          <FieldInput label="WhatsApp" icon="chat" value={data.whatsapp} onChange={(v) => setData({ ...data, whatsapp: v })} placeholder="+216 XX XXX XXX" type="tel" />
        </div>
        <FieldInput label="Email professionnel" icon="email" value={data.email} onChange={(v) => setData({ ...data, email: v })} placeholder="contact@votre-etablissement.tn" type="email" error={fieldErrors.email} />
      </SectionCard>

    </div>
  );
}

// ─── Step 3 : Activité principale ─────────────────────────────────────────────

function StepPrimary({ data, setData, fieldErrors = {} }: any) {
  function setDynField(key: string, val: any) {
    setData({ ...data, primary_fields: { ...data.primary_fields, [key]: val } });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500 font-medium mb-4">Sélectionnez votre catégorie principale.</p>
        {fieldErrors.primary_category && (
          <p className="text-xs text-red-500 font-semibold mb-3 px-1">{fieldErrors.primary_category}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {PROVIDER_SCHEMA.map((cat) => {
            const active = data.primary_category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setData({ ...data, primary_category: cat.value, primary_subtypes: [], primary_fields: {}, primary_photos: [] })}
                className={`text-left p-4 rounded-2xl border-2 transition-all
                  ${active ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 bg-white hover:border-primary/30"}`}
              >
                <span className="material-symbols-outlined block mb-1.5 text-primary" style={{ fontSize: 28 }}>{cat.icon}</span>
                <div className="font-extrabold text-sm text-slate-900 leading-tight">{cat.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {data.primary_category && (
        <>
          <div className="h-px bg-slate-100" />
          <ActivityFields
            categoryValue={data.primary_category}
            subtypeValues={data.primary_subtypes}
            setSubtypes={(vs) => setData({ ...data, primary_subtypes: vs, primary_fields: {} })}
            dynFields={data.primary_fields}
            setDynField={setDynField}
            photos={data.primary_photos}
            setPhotos={(p) => setData({ ...data, primary_photos: p })}
            subtypePhotos={data.primary_subtype_photos}
            setSubtypePhotos={(sv, p) => setData({ ...data, primary_subtype_photos: { ...data.primary_subtype_photos, [sv]: p } })}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Années d'expérience</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">workspace_premium</span>
              <input
                type="number" min={0}
                className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
                value={data.years_experience}
                onChange={(e) => setData({ ...data, years_experience: e.target.value })}
                placeholder="Ex: 5"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Step 4 : Activités secondaires ──────────────────────────────────────────

function StepSecondary({ data, setData }: any) {
  const secondaryOptions = PROVIDER_SCHEMA.filter((cat) => cat.value !== data.primary_category);

  function toggleCategory(catValue: string) {
    const isSelected = data.secondary_selections.includes(catValue);
    if (isSelected) {
      const newSelections = data.secondary_selections.filter((v: string) => v !== catValue);
      const newData = { ...data.secondary_data };
      delete newData[catValue];
      setData({ ...data, secondary_selections: newSelections, secondary_data: newData });
    } else {
      setData({
        ...data,
        secondary_selections: [...data.secondary_selections, catValue],
        secondary_data: { ...data.secondary_data, [catValue]: { subtypes: [], fields: {}, images: [], subtype_photos: {}, years_experience: "" } },
      });
    }
  }

  function setSecondarySubtypes(catValue: string, subtypes: string[]) {
    setData({
      ...data,
      secondary_data: {
        ...data.secondary_data,
        [catValue]: { ...data.secondary_data[catValue], subtypes, fields: {} },
      },
    });
  }

  function setSecondaryField(catValue: string, key: string, val: any) {
    setData({
      ...data,
      secondary_data: {
        ...data.secondary_data,
        [catValue]: {
          ...data.secondary_data[catValue],
          fields: { ...data.secondary_data[catValue]?.fields, [key]: val },
        },
      },
    });
  }

  function setSecondaryImages(catValue: string, images: string[]) {
    setData({
      ...data,
      secondary_data: {
        ...data.secondary_data,
        [catValue]: { ...data.secondary_data[catValue], images },
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Activités secondaires proposées</p>
        <p className="text-xs text-slate-400 mb-3">En plus de votre activité principale, sélectionnez les autres services que vous proposez.</p>
        <div className="grid grid-cols-2 gap-3">
          {secondaryOptions.map((cat) => {
            const active = data.secondary_selections.includes(cat.value);
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => toggleCategory(cat.value)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left
                  ${active ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-primary/30"}`}
              >
                <span className="material-symbols-outlined flex-shrink-0 text-primary" style={{ fontSize: 22 }}>{cat.icon}</span>
                <div className="font-bold text-sm text-slate-900 leading-tight flex-1">{cat.label}</div>
                {active && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-slate-900" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {data.secondary_selections.length > 0 && (
        <div className="space-y-6">
          <div className="h-px bg-slate-100" />
          <p className="text-sm font-bold text-slate-700">Détails par activité secondaire</p>
          {data.secondary_selections.map((catValue: string) => {
            const cat = getCategoryByValue(catValue);
            const catData = data.secondary_data[catValue] || { subtypes: [], fields: {}, images: [] };
            return (
              <div key={catValue} className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>{cat?.icon}</span>
                  <span className="font-bold text-sm text-slate-800">{cat?.label}</span>
                </div>
                <div className="p-4 space-y-5">
                  <ActivityFields
                    categoryValue={catValue}
                    subtypeValues={catData.subtypes || []}
                    setSubtypes={(vs) => setSecondarySubtypes(catValue, vs)}
                    dynFields={catData.fields}
                    setDynField={(key, val) => setSecondaryField(catValue, key, val)}
                    photos={catData.images || []}
                    setPhotos={(imgs) => setSecondaryImages(catValue, imgs)}
                    subtypePhotos={catData.subtype_photos || {}}
                    setSubtypePhotos={(sv, p) => setData({ ...data, secondary_data: { ...data.secondary_data, [catValue]: { ...catData, subtype_photos: { ...(catData.subtype_photos || {}), [sv]: p } } } })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Années d'expérience</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">workspace_premium</span>
                      <input
                        type="number" min={0}
                        className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
                        value={catData.years_experience || ""}
                        onChange={(e) => setData({
                          ...data,
                          secondary_data: { ...data.secondary_data, [catValue]: { ...catData, years_experience: e.target.value } },
                        })}
                        placeholder="Ex: 3"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 5 : Durabilité ──────────────────────────────────────────────────────

// ─── CertCard — one certification entry with name + certificate image ─────────

function CertCard({
  cert, index, onNameChange, onImageChange, onRemove, error,
}: {
  cert: { name: string; image: string };
  index: number;
  onNameChange: (name: string) => void;
  onImageChange: (file: File) => void;
  onRemove: () => void;
  error?: string;
}) {
  const imgRef = useRef<HTMLInputElement>(null);
  const isCustom = cert.name !== "" && !ECO_CERTIFICATIONS.includes(cert.name);
  const [customMode, setCustomMode] = useState(isCustom);
  const selectValue = customMode ? "__autre__" : cert.name;

  function handleSelect(val: string) {
    if (val === "__autre__") {
      setCustomMode(true);
      onNameChange("");
    } else {
      setCustomMode(false);
      onNameChange(val);
    }
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${error ? "border-red-300" : "border-slate-200"}`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">verified</span>
          <span className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Certification {index + 1}</span>
        </div>
        <button type="button" onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors group">
          <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 transition-colors" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Nom du label / certification *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">workspace_premium</span>
            <select
              className="w-full pl-10 pr-4 py-3 bg-surface-container border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-slate-900 text-sm font-medium appearance-none"
              value={selectValue}
              onChange={(e) => handleSelect(e.target.value)}
            >
              <option value="">Sélectionner un label…</option>
              {ECO_CERTIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__autre__">Autre — saisir manuellement</option>
            </select>
          </div>
          {customMode && (
            <input
              type="text"
              className="w-full px-4 py-3 bg-surface-container border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium placeholder:text-slate-400"
              placeholder="Nom exact de votre certification…"
              value={isCustom ? cert.name : ""}
              onChange={(e) => onNameChange(e.target.value)}
              autoFocus
            />
          )}
        </div>

        {/* Certificate image */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">Photo du certificat *</label>
            <span className="text-[10px] text-slate-400 font-medium">(obligatoire)</span>
          </div>
          <input
            ref={imgRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageChange(f); if (imgRef.current) imgRef.current.value = ""; }}
          />
          {cert.image ? (
            <div
              className="relative rounded-xl overflow-hidden border border-slate-200 group cursor-pointer"
              onClick={() => imgRef.current?.click()}
            >
              <img src={cert.image} alt="Certificat" className="w-full h-32 object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                <span className="material-symbols-outlined text-white text-lg">photo_camera</span>
                <span className="text-white text-xs font-extrabold">Changer l'image</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => imgRef.current?.click()}
              className={`w-full h-[72px] rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all
                ${error ? "border-red-300 bg-red-50/60" : "border-slate-200 hover:border-primary/50 hover:bg-primary/5"}`}
            >
              <span className="material-symbols-outlined text-xl text-slate-400">upload_file</span>
              <span className="text-sm text-slate-400 font-medium">Uploader le certificat</span>
            </button>
          )}
          {error && <p className="text-xs text-red-500 font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{error}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Step 5 : Durabilité ──────────────────────────────────────────────────────

function StepSustainability({ data, setData, fieldErrors = {} }: any) {
  type Cert = { name: string; image: string };

  function addCert() {
    setData({ ...data, eco_certifications: [...data.eco_certifications, { name: "", image: "" }] });
  }

  function removeCert(i: number) {
    setData({ ...data, eco_certifications: data.eco_certifications.filter((_: Cert, j: number) => j !== i) });
  }

  function setCertName(i: number, name: string) {
    const certs = [...data.eco_certifications];
    certs[i] = { ...certs[i], name };
    setData({ ...data, eco_certifications: certs });
  }

  async function setCertImage(i: number, file: File) {
    const compressed = await compressImage(file, 1400, 0.88);
    const certs = [...data.eco_certifications];
    certs[i] = { ...certs[i], image: compressed };
    setData({ ...data, eco_certifications: certs });
  }

  const hasCertErrors = Object.keys(fieldErrors).some((k) => k.startsWith("cert_"));

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-800">Labels & Certifications</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Ajoutez chaque certification avec une photo du document officiel.
            <br />Optionnel — passez cette étape si vous n'en possédez pas encore.
          </p>
        </div>
        <button
          type="button" onClick={addCert}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 text-primary rounded-xl text-xs font-extrabold hover:bg-primary/20 transition-colors whitespace-nowrap flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {hasCertErrors && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="material-symbols-outlined text-red-500 text-base">warning</span>
          <p className="text-xs font-semibold text-red-600">Complétez ou supprimez les certifications incomplètes.</p>
        </div>
      )}

      {data.eco_certifications.length === 0 ? (
        <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-200">
          <span className="material-symbols-outlined text-slate-300 text-4xl block mb-2">workspace_premium</span>
          <p className="text-sm text-slate-400 font-semibold">Aucune certification ajoutée</p>
          <p className="text-xs text-slate-300 mt-1">Cliquez sur « Ajouter » pour en ajouter une</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.eco_certifications.map((cert: Cert, i: number) => (
            <CertCard
              key={i}
              cert={cert}
              index={i}
              onNameChange={(name) => setCertName(i, name)}
              onImageChange={(file) => setCertImage(i, file)}
              onRemove={() => removeCert(i)}
              error={fieldErrors[`cert_${i}`]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProviderOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState({
    // Step 1 — Prestataire personnel
    personal_photo: "",
    personal_name: "",
    personal_role: "",
    personal_bio: "",
    personal_certifications: [] as { name: string; image: string; url: string }[],
    org_certifications: [] as { name: string; image: string; url: string }[],
    // Step 1 — Organisation
    logo: "",
    commercial_name: "",
    description: "",
    history: "",
    photos: [] as string[],
    video_urls: [] as string[],
    // Step 2
    governorate: "",
    city: "",
    address: "",
    gps_lat: null as number | null,
    gps_lng: null as number | null,
    website: "",
    social_networks: {} as Record<string, string>,
    phone: "",
    whatsapp: "",
    email: "",
    // Step 3
    primary_category: "",
    primary_subtypes: [] as string[],
    primary_subtype_photos: {} as Record<string, string[]>,
    primary_fields: {} as Record<string, any>,
    primary_photos: [] as string[],
    languages_spoken: [] as string[],
    years_experience: "",
    // Step 4
    secondary_selections: [] as string[],
    secondary_data: {} as Record<string, { subtypes: string[]; fields: Record<string, any>; images: string[]; subtype_photos: Record<string, string[]>; years_experience: string }>,
    // Step 5
    eco_certifications: [] as { name: string; image: string }[],
  });

  useEffect(() => {
    // Le jeton doit désigner le compte affiché, sinon l'onboarding écrirait
    // dans le profil d'une session restée ouverte dans un autre onglet.
    if (!getConsistentSession()) router.push("/auth/login");
  }, [router]);

  function validateStep(): boolean {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!data.commercial_name.trim())
        errors.commercial_name = "Le nom commercial est requis.";
      else if (data.commercial_name.trim().length < 2)
        errors.commercial_name = "Minimum 2 caractères.";

      if (!data.description.trim())
        errors.description = "La description est requise.";
      else if (data.description.trim().length < 20)
        errors.description = `Description trop courte — ${data.description.trim().length}/20 caractères minimum.`;
    }

    if (step === 2) {
      if (!data.governorate)
        errors.governorate = "Sélectionnez un gouvernorat.";

      if (!data.phone.trim()) {
        errors.phone = "Le numéro de téléphone est requis.";
      } else {
        const clean = data.phone.replace(/[\s\-().]/g, "");
        if (!/^(\+216)?[259]\d{7}$/.test(clean))
          errors.phone = "Format invalide. Ex : +216 52 000 000";
      }

      if (data.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
        errors.email = "Adresse email invalide.";

      if (data.website.trim() && !/^https?:\/\/.+/.test(data.website.trim()))
        errors.website = "L'URL doit commencer par https://";
    }

    if (step === 3) {
      if (!data.primary_category)
        errors.primary_category = "Sélectionnez votre activité principale.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleNext() {
    setError("");
    if (!validateStep()) return;
    if (step < STEPS.length) {
      setStep((s) => s + 1);
      return;
    }
    try {
      setLoading(true);

      // Photos de présentation de l'organisation uniquement (pas les photos d'activités)
      const orgPhotos = data.photos.filter(Boolean);

      const specialties = (
        Object.values(data.primary_fields).flat() as unknown[]
      ).filter((v): v is string => typeof v === "string" && v.trim().length > 0);

      const personalCerts = data.personal_certifications
        .filter((c: any) => c.name?.trim())
        // Le justificatif peut être une URL saisie ou une image téléversée :
        // ne retenir que l'URL faisait perdre silencieusement les scans déposés.
        .map((c: any) => ({ name: c.name.trim(), document_url: c.url || c.image || undefined }));

      // ── 1. Provider (personne) ──────────────────────────────────────────
      await apiFetch("/providers/onboarding", {
        method: "POST",
        body: JSON.stringify({
          full_name: data.personal_name || data.commercial_name,
          photo: data.personal_photo || undefined,
          position: data.personal_role || undefined,
          personal_bio: data.personal_bio || undefined,
          languages_spoken: data.languages_spoken.length ? data.languages_spoken : undefined,
          years_experience: data.years_experience ? Number(data.years_experience) : undefined,
          personal_certifications: personalCerts.length ? personalCerts : undefined,
          // champs org temporaires (compatibilité profil existant)
          provider_type: data.primary_category,
          organization: data.commercial_name || undefined,
          region: data.governorate,
          activity_types: data.primary_subtypes.length ? data.primary_subtypes : undefined,
          secondary_activity_types: data.secondary_selections.length ? data.secondary_selections : undefined,
          specialties: specialties.length ? specialties : undefined,
        }),
      });

      // ── 2. Organisation ────────────────────────────────────────────────
      const org = await apiFetch("/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: data.commercial_name || data.personal_name,
          provider_type: data.primary_category,
          logo: data.logo || undefined,
          bio: data.description || undefined,
          history: data.history || undefined,
          // Contact
          phone: data.phone || undefined,
          whatsapp: data.whatsapp || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          facebook: data.social_networks["facebook"] || undefined,
          instagram: data.social_networks["instagram"] || undefined,
          tiktok: data.social_networks["tiktok"] || undefined,
          // Localisation
          region: data.governorate,
          address: data.address || undefined,
          zone: data.city || undefined,
          country: "Tunisie",
          lat: data.gps_lat ?? undefined,
          lng: data.gps_lng ?? undefined,
          // Médias
          photos: orgPhotos.length ? orgPhotos : undefined,
          videos: data.video_urls.filter(Boolean).length ? data.video_urls.filter(Boolean) : undefined,
          // Certifications org avec documents
          certifications: data.org_certifications.filter((c: any) => c.name?.trim()).length
            ? data.org_certifications
                .filter((c: any) => c.name?.trim())
                .map((c: any) => ({
                  name: c.name.trim(),
                  document_url: c.url || c.image || undefined,
                }))
            : undefined,
        }),
      }) as { id: string };

      // ── 3. Activités (primaire + secondaires) ──────────────────────────
      if (data.primary_category && org?.id) {
        // Photos pour l'activité primaire (par sous-type)
        const primaryPhotos: Record<string, string[]> = { ...data.primary_subtype_photos };
        if (data.primary_photos.length && data.primary_subtypes.length) {
          const k = data.primary_subtypes[0];
          primaryPhotos[k] = [...(primaryPhotos[k] || []), ...data.primary_photos];
        }

        const activities = [
          // Activité primaire
          {
            organization_id: org.id,
            level: "primary",
            category: data.primary_category,
            subtypes: data.primary_subtypes.length ? data.primary_subtypes : undefined,
            years_experience: data.years_experience ? Number(data.years_experience) : undefined,
            fields: Object.keys(data.primary_fields).length ? data.primary_fields : undefined,
            photos: Object.keys(primaryPhotos).length ? primaryPhotos : undefined,
          },
          // Activités secondaires
          ...data.secondary_selections.map((catValue: string) => {
            const catData = data.secondary_data[catValue] || {};
            const secPhotos: Record<string, string[]> = { ...(catData.subtype_photos || {}) };
            if ((catData.images || []).length && catData.subtypes?.length) {
              const k = catData.subtypes[0];
              secPhotos[k] = [...(secPhotos[k] || []), ...(catData.images || [])];
            }
            return {
              organization_id: org.id,
              level: "secondary",
              category: catValue,
              subtypes: catData.subtypes?.length ? catData.subtypes : undefined,
              years_experience: catData.years_experience ? Number(catData.years_experience) : undefined,
              fields: Object.keys(catData.fields || {}).length ? catData.fields : undefined,
              photos: Object.keys(secPhotos).length ? secPhotos : undefined,
            };
          }),
        ];

        await apiFetch("/provider-activities/bulk", {
          method: "POST",
          body: JSON.stringify({ organization_id: org.id, activities }),
        });
      }

      router.push("/dashboard/provider");
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la soumission.");
    } finally {
      setLoading(false);
    }
  }

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="text-primary w-7 h-7" />
            <span className="text-lg font-extrabold tracking-tight">Éco-Voyage</span>
          </div>
          <span className="text-sm font-semibold text-slate-500">Étape {step} sur {STEPS.length}</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Step dots */}
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

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 pb-0">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full mb-4">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{STEPS[step - 1].subtitle}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{STEPS[step - 1].title}</h1>
            </div>

            <div className="p-8 pt-6 max-h-[60vh] overflow-y-auto">
              {step === 1 && <StepIdentity data={data} setData={setData} fieldErrors={fieldErrors} />}
              {step === 2 && <StepContact data={data} setData={setData} fieldErrors={fieldErrors} />}
              {step === 3 && <StepPrimary data={data} setData={setData} fieldErrors={fieldErrors} />}
              {step === 4 && <StepSecondary data={data} setData={setData} />}

              {error && <p className="text-sm font-semibold text-red-600 mt-4">{error}</p>}
            </div>

            <div className="p-8 pt-4 border-t border-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep((s) => Math.max(1, s - 1)); setFieldErrors({}); setError(""); }}
                disabled={step === 1}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-slate-900 font-extrabold text-sm shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60"
              >
                {loading ? "Envoi en cours…" : step === STEPS.length ? "Créer mon profil" : "Continuer"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {step === 4 && (
            <div className="text-center mt-4">
              <button type="button" onClick={() => setStep((s) => s + 1)}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors">
                Passer cette étape →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
