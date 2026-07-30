"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import {
  CHAMPS_DYNAMIQUES_PAR_DOMAINE,
  type DynamicField,
  type FieldOptionVisual,
} from "@/lib/guideDomainesConfig";

export type DynData = Record<string, any>;

interface Props {
  domaine: string;
  expertisesDisponibles: string[];
  value: DynData;
  onChange: (updates: Partial<DynData>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isVisualOpt(o: any): o is FieldOptionVisual {
  return typeof o === "object" && o !== null && "emoji" in o;
}

function conditionMet(value: DynData, cond: DynamicField["conditionalOn"]): boolean {
  if (!cond) return true;
  const v = value[cond.field];
  if (Array.isArray(v)) return v.includes(cond.value);
  return v === cond.value;
}

// ── Micro-composants internes ─────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase pt-2 pb-1 border-t border-slate-100 first:border-t-0 first:pt-0">
      {children}
    </p>
  );
}

function FieldWrap({ field, children }: { field: DynamicField; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {field.hint && <p className="text-[10px] text-slate-400">{field.hint}</p>}
    </div>
  );
}

// ── Rendu de chaque type de champ ─────────────────────────────────────────────

function TextField({ field, val, set }: { field: DynamicField; val: string; set: (v: string) => void }) {
  return (
    <FieldWrap field={field}>
      <input
        type={field.type === "number" ? "number" : "text"}
        className={inputCls}
        value={val ?? ""}
        onChange={(e) => set(e.target.value)}
        placeholder={field.placeholder}
        min={field.min}
        max={field.max}
      />
    </FieldWrap>
  );
}

function TextareaField({ field, val, set }: { field: DynamicField; val: string; set: (v: string) => void }) {
  return (
    <FieldWrap field={field}>
      <textarea
        className={`${inputCls} resize-none`}
        value={val ?? ""}
        onChange={(e) => set(e.target.value)}
        placeholder={field.placeholder}
        rows={3}
      />
    </FieldWrap>
  );
}

function NumberField({ field, val, set }: { field: DynamicField; val: number | ""; set: (v: number | "") => void }) {
  return (
    <FieldWrap field={field}>
      <input
        type="number"
        className={inputCls}
        value={val ?? ""}
        onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))}
        placeholder={field.placeholder ?? "0"}
        min={field.min}
        max={field.max}
      />
    </FieldWrap>
  );
}

function BooleanField({ field, val, set }: { field: DynamicField; val: boolean | null; set: (v: boolean) => void }) {
  return (
    <FieldWrap field={field}>
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
        <span className="text-sm font-bold text-slate-700">{field.label}</span>
        <div className="flex gap-2">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => set(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all border-2 ${
                val === v
                  ? "bg-primary border-primary text-slate-900"
                  : "border-slate-200 text-slate-500 hover:border-primary/40 bg-white"
              }`}
            >
              {v ? "Oui" : "Non"}
            </button>
          ))}
        </div>
      </div>
    </FieldWrap>
  );
}

function RadioField({ field, val, set }: { field: DynamicField; val: string; set: (v: string) => void }) {
  const opts = (field.options ?? []) as string[];
  return (
    <FieldWrap field={field}>
      <div className="space-y-1.5">
        {opts.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => set(opt)}
            className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
              val === opt
                ? "bg-primary/10 border-primary text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-primary/30"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </FieldWrap>
  );
}

function RadioVisualField({ field, val, set }: { field: DynamicField; val: string; set: (v: string) => void }) {
  const opts = (field.options ?? []) as FieldOptionVisual[];
  return (
    <FieldWrap field={field}>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => set(opt.value)}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl border-2 text-left transition-all ${
              val === opt.value
                ? "bg-primary/10 border-primary"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="text-xl shrink-0">{opt.emoji}</span>
            <div className="min-w-0">
              <p className={`text-xs font-extrabold leading-tight ${val === opt.value ? "text-slate-900" : "text-slate-700"}`}>
                {opt.label}
              </p>
              <p className={`text-[10px] mt-0.5 leading-tight ${val === opt.value ? "text-primary/70" : "text-slate-400"}`}>
                {opt.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </FieldWrap>
  );
}

function CheckboxesField({ field, val, set }: { field: DynamicField; val: string[]; set: (v: string[]) => void }) {
  const opts = (field.options ?? []) as string[];
  const arr = Array.isArray(val) ? val : [];
  const toggle = (o: string) =>
    set(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
  return (
    <FieldWrap field={field}>
      <div className="flex flex-wrap gap-2">
        {opts.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
              arr.includes(opt)
                ? "bg-primary border-primary text-slate-900"
                : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </FieldWrap>
  );
}

function TagsField({ field, val, set }: { field: DynamicField; val: string[]; set: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const arr = Array.isArray(val) ? val : [];
  const commit = () => {
    const v = input.trim();
    if (v && !arr.includes(v)) { set([...arr, v]); }
    setInput("");
  };
  return (
    <FieldWrap field={field}>
      {arr.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {arr.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs font-bold text-slate-800"
            >
              {tag}
              <button type="button" onClick={() => set(arr.filter((t) => t !== tag))}>
                <X size={10} className="text-slate-400 hover:text-red-400 transition-colors" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          placeholder={field.placeholder}
          className={`${inputCls} flex-1 py-2`}
        />
        <button
          type="button"
          onClick={commit}
          className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </FieldWrap>
  );
}

function FileField({ field, val, set }: { field: DynamicField; val: string; set: (v: string) => void }) {
  return (
    <FieldWrap field={field}>
      <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
        <span className="material-symbols-outlined text-slate-400 text-xl">upload_file</span>
        <div className="flex-1 min-w-0">
          {val ? (
            <p className="text-xs font-bold text-slate-700 truncate">{val}</p>
          ) : (
            <p className="text-xs font-bold text-slate-400">
              {field.placeholder ?? "Choisir un fichier..."}
            </p>
          )}
        </div>
        {val && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); set(""); }}
            className="text-slate-400 hover:text-red-400"
          >
            <X size={12} />
          </button>
        )}
        <input
          type="file"
          accept=".gpx,.kml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) set(f.name);
            e.target.value = "";
          }}
        />
      </label>
      {field.hint && <p className="text-[10px] text-slate-400">{field.hint}</p>}
    </FieldWrap>
  );
}

function SelectField({ field, val, set }: { field: DynamicField; val: string; set: (v: string) => void }) {
  const opts = (field.options ?? []) as string[];
  return (
    <FieldWrap field={field}>
      <select
        className={`${inputCls} appearance-none`}
        value={val ?? ""}
        onChange={(e) => set(e.target.value)}
      >
        <option value="">Sélectionner</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </FieldWrap>
  );
}

function TimeField({ field, val, set }: { field: DynamicField; val: string; set: (v: string) => void }) {
  return (
    <FieldWrap field={field}>
      <input
        type="time"
        className={inputCls}
        value={val ?? ""}
        onChange={(e) => set(e.target.value)}
      />
    </FieldWrap>
  );
}

function RangeNumberField({ field, val, set }: { field: DynamicField; val: [number|"", number|""]; set: (v: [number|"", number|""]) => void }) {
  const pair: [number|"", number|""] = Array.isArray(val) ? val : ["", ""];
  return (
    <FieldWrap field={field}>
      <div className="flex items-center gap-3">
        <input
          type="number"
          className={`${inputCls} flex-1`}
          placeholder="Min"
          value={pair[0] ?? ""}
          min={field.min}
          max={field.max}
          onChange={(e) => set([e.target.value === "" ? "" : Number(e.target.value), pair[1]])}
        />
        <span className="text-slate-400 font-bold text-sm shrink-0">→</span>
        <input
          type="number"
          className={`${inputCls} flex-1`}
          placeholder="Max"
          value={pair[1] ?? ""}
          min={field.min}
          max={field.max}
          onChange={(e) => set([pair[0], e.target.value === "" ? "" : Number(e.target.value)])}
        />
      </div>
    </FieldWrap>
  );
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

function RenderField({
  field,
  value,
  onChange,
  expertisesDisponibles,
}: {
  field: DynamicField;
  value: DynData;
  onChange: (updates: Partial<DynData>) => void;
  expertisesDisponibles: string[];
}) {
  const val = value[field.key];
  const set = (v: any) => onChange({ [field.key]: v });

  if (!conditionMet(value, field.conditionalOn)) return null;

  const resolvedOpts: DynamicField["options"] =
    field.key === "expertises_offre" && expertisesDisponibles.length > 0
      ? expertisesDisponibles
      : field.options;

  const f: DynamicField = { ...field, options: resolvedOpts };

  switch (f.type) {
    case "text":
      return <TextField field={f} val={val ?? ""} set={set} />;
    case "textarea":
      return <TextareaField field={f} val={val ?? ""} set={set} />;
    case "number":
      return <NumberField field={f} val={val ?? ""} set={set} />;
    case "boolean":
      return <BooleanField field={f} val={val ?? null} set={set} />;
    case "radio":
      return <RadioField field={f} val={val ?? ""} set={set} />;
    case "radio_visual":
      return <RadioVisualField field={f} val={val ?? ""} set={set} />;
    case "checkboxes":
      return <CheckboxesField field={f} val={val ?? []} set={set} />;
    case "tags":
      return <TagsField field={f} val={val ?? []} set={set} />;
    case "file":
      return <FileField field={f} val={val ?? ""} set={set} />;
    case "select":
      return <SelectField field={f} val={val ?? ""} set={set} />;
    case "time":
      return <TimeField field={f} val={val ?? ""} set={set} />;
    case "range_number":
      return <RangeNumberField field={f} val={val ?? ["", ""]} set={set} />;
    default:
      return null;
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function DynamicDomainFields({ domaine, expertisesDisponibles, value, onChange }: Props) {
  const config = CHAMPS_DYNAMIQUES_PAR_DOMAINE[domaine];

  if (!config) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="material-symbols-outlined text-slate-300 text-5xl">category</span>
        <p className="text-slate-500 font-semibold text-sm">
          Domaine non reconnu — contactez le support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {config.sections.map((section) => (
        <div key={section.titre} className="space-y-4">
          <SectionTitle>{section.titre}</SectionTitle>
          {section.fields.map((field) => (
            <RenderField
              key={field.key}
              field={field}
              value={value}
              onChange={onChange}
              expertisesDisponibles={expertisesDisponibles}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
