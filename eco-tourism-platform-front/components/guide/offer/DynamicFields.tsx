"use client";

import dynamic from "next/dynamic";
import { CHAMPS_DOMAINE, DOMAINES, FieldDef } from "@/lib/guideOfferConfig";
import { DOMAIN_CASCADE_CONFIG } from "@/lib/domainCascadeConfig";
import GenericCascadeFields from "@/components/guide/offer/dynamic/GenericCascadeFields";

const MultiLocationPickerDyn = dynamic(
  () => import("@/components/map/MultiLocationPicker"),
  { ssr: false }
);

export type DynData = Record<string, any>;

interface Props {
  domaine: string;
  expertisesSelectionnees: string[];
  value: DynData;
  onChange: (v: Partial<DynData>) => void;
}

function conditionMet(data: DynData, cond: FieldDef["conditionalOn"]): boolean {
  if (!cond) return true;
  const v = data[cond.field];
  if (cond.includes !== undefined) {
    return Array.isArray(v) ? v.includes(cond.includes) : false;
  }
  return v === cond.value;
}

function getOptions(field: FieldDef, domaine: string): string[] {
  if (field.source === "expertises_du_domaine") {
    return DOMAINES[domaine]?.expertises ?? [];
  }
  if (!field.options) return [];
  if (typeof field.options[0] === "string") return field.options as string[];
  return [];
}

type VisualOption = { value: string; emoji: string; label: string; desc: string };
function getVisualOptions(field: FieldDef): VisualOption[] {
  if (!field.options) return [];
  if (typeof field.options[0] === "object") return field.options as VisualOption[];
  return [];
}

function FieldInput({ field, domaine, value, onChange }: {
  field: FieldDef;
  domaine: string;
  value: DynData;
  onChange: (v: Partial<DynData>) => void;
}) {
  const v = value[field.key];

  if (!conditionMet(value, field.conditionalOn)) return null;

  function set(val: any) { onChange({ [field.key]: val }); }

  function toggleArray(arr: string[] | undefined, item: string): string[] {
    const a = arr ?? [];
    return a.includes(item) ? a.filter((x) => x !== item) : [...a, item];
  }

  const labelEl = (
    <label className="text-[10px] font-black tracking-widest text-slate-500 uppercase block mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );

  switch (field.type) {
    case "text":
      return (
        <div>
          {labelEl}
          <input
            type="text"
            value={v ?? ""}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
          />
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );

    case "textarea":
      return (
        <div>
          {labelEl}
          <textarea
            value={v ?? ""}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400 resize-none"
          />
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );

    case "number":
      return (
        <div>
          {labelEl}
          <input
            type="number"
            value={v ?? ""}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
          />
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs font-bold text-slate-700">{field.label}</span>
          <button
            type="button"
            onClick={() => set(!v)}
            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${v ? "bg-green-500" : "bg-slate-200"}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${v ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      );

    case "radio": {
      const opts = getOptions(field, domaine);
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-1.5">
            {opts.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set(opt)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                  v === opt
                    ? "bg-primary border-primary text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );
    }

    case "radio_visual": {
      const opts = getVisualOptions(field);
      return (
        <div>
          {labelEl}
          <div className="grid grid-cols-2 gap-2">
            {opts.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set(opt.value)}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${
                  v === opt.value
                    ? "bg-primary/5 border-primary"
                    : "border-slate-100 bg-white hover:border-primary/30"
                }`}
              >
                <span className="text-xl shrink-0">{opt.emoji}</span>
                <div>
                  <p className={`text-xs font-extrabold leading-tight ${v === opt.value ? "text-primary" : "text-slate-700"}`}>
                    {opt.label}
                  </p>
                  {opt.desc && (
                    <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{opt.desc}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );
    }

    case "checkboxes": {
      const opts = getOptions(field, domaine);
      const arr: string[] = v ?? [];
      return (
        <div>
          {labelEl}
          <div className="flex flex-wrap gap-1.5">
            {opts.map((opt) => {
              const active = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set(toggleArray(arr, opt))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                    active
                      ? "bg-primary border-primary text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-primary/40"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );
    }

    case "tags": {
      const arr: string[] = v ?? [];
      function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
          e.preventDefault();
          const input = e.currentTarget;
          const tag = input.value.trim().replace(/,$/, "");
          if (tag && !arr.includes(tag)) set([...arr, tag]);
          input.value = "";
        }
      }
      return (
        <div>
          {labelEl}
          <input
            type="text"
            placeholder={field.placeholder ?? "Tapez un tag puis Entrée…"}
            onKeyDown={addTag}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
          />
          {arr.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {arr.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => set(arr.filter((t) => t !== tag))}
                    className="text-primary/60 hover:text-primary leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );
    }

    case "file":
      return (
        <div>
          {labelEl}
          <label className="block cursor-pointer">
            <input
              type="file"
              accept={field.accept}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) set(file);
              }}
              className="hidden"
            />
            <div className="border-2 border-dashed border-slate-200 rounded-2xl px-4 py-5 text-center hover:border-primary/40 hover:bg-primary/5 transition-all">
              <span className="text-2xl block mb-1">📎</span>
              <p className="text-xs font-bold text-slate-600">
                {v ? (v as File).name : "Cliquez pour sélectionner un fichier"}
              </p>
              {field.accept && (
                <p className="text-[10px] text-slate-400 mt-0.5">{field.accept}</p>
              )}
            </div>
          </label>
          {field.hint && <p className="text-[10px] text-slate-400 mt-1">{field.hint}</p>}
        </div>
      );

    case "multilocation":
      return (
        <div>
          {labelEl}
          <MultiLocationPickerDyn
            value={Array.isArray(v) ? v : []}
            onChange={(locs) => set(locs)}
            hint={field.hint}
          />
          {field.required && (!v || (v as string[]).length === 0) && (
            <p className="text-[10px] text-red-500 font-semibold mt-1">Ajoutez au moins un lieu *</p>
          )}
        </div>
      );

    default:
      return null;
  }
}

function sectionVisible(data: DynData, showIf?: { field: string; notEmpty?: boolean }): boolean {
  if (!showIf) return true;
  const v = data[showIf.field];
  if (showIf.notEmpty) return Array.isArray(v) ? v.length > 0 : !!v;
  return true;
}

export default function DynamicFields({ domaine, expertisesSelectionnees, value, onChange }: Props) {
  // Tous les domaines avec config cascade utilisent GenericCascadeFields
  if (DOMAIN_CASCADE_CONFIG[domaine]) {
    return (
      <GenericCascadeFields
        domaine={domaine}
        expertisesSelectionnees={expertisesSelectionnees}
        value={{
          types_visite: value.types_visite ?? [],
          experiences: value.experiences ?? [],
          mediation: value.mediation ?? [],
        }}
        onChange={onChange}
      />
    );
  }

  const sections = CHAMPS_DOMAINE[domaine] ?? [];

  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        if (!sectionVisible(value, section.showIf)) return null;
        if (!section.showIf) {
          const visibleFields = section.fields.filter((f) => conditionMet(value, f.conditionalOn));
          if (visibleFields.length === 0) return null;
        }
        return (
          <div key={section.section} className="space-y-4">
            <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase border-b border-slate-100 pb-1">
              {section.section}
            </p>
            {section.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                domaine={domaine}
                value={value}
                onChange={onChange}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
