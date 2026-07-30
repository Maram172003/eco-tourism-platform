"use client";

import { OfferSubtypeConfig, OfferField } from "@/lib/offer-schema";

type DynData = Record<string, any>;

const cls =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm";

function condMet(data: DynData, cond: OfferField["conditionalOn"]): boolean {
  if (!cond) return true;
  const v = data[cond.field!];
  if (cond.value !== undefined) return v === cond.value;
  if (cond.notValue !== undefined) return v !== cond.notValue;
  return true;
}

function FieldWrap({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-black tracking-widest text-slate-400 uppercase">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function BoolRow({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all border-2 ${
              value === v
                ? "bg-primary border-primary text-slate-900"
                : "border-slate-200 text-slate-500 hover:border-primary/40 bg-white"
            }`}>
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiChips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${
              active
                ? "bg-primary border-primary text-slate-900"
                : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"
            }`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function RenderField({ field, data, onChange }: {
  field: OfferField;
  data: DynData;
  onChange: (v: Partial<DynData>) => void;
}) {
  if (!condMet(data, field.conditionalOn)) return null;

  const v = data[field.key];
  const set = (val: any) => onChange({ [field.key]: val });
  const opts = field.options ?? [];

  switch (field.type) {
    case "text":
      return (
        <FieldWrap label={field.label} required={field.required}>
          <input type="text" value={v ?? ""} onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder} className={cls} />
        </FieldWrap>
      );

    case "textarea":
      return (
        <FieldWrap label={field.label} required={field.required}>
          <textarea value={v ?? ""} onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder} rows={3} className={`${cls} resize-none`} />
        </FieldWrap>
      );

    case "number":
      return (
        <FieldWrap label={field.label} required={field.required}>
          <input type="number" value={v ?? ""}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
            placeholder={field.placeholder} className={cls} />
        </FieldWrap>
      );

    case "boolean":
      return <BoolRow label={field.label} value={v ?? null} onChange={set} />;

    case "select":
      if (opts.length === 0) {
        return (
          <FieldWrap label={field.label} required={field.required}>
            <input type="text" value={v ?? ""} onChange={(e) => set(e.target.value)}
              placeholder={field.placeholder} className={cls} />
          </FieldWrap>
        );
      }
      return (
        <FieldWrap label={field.label} required={field.required}>
          <select value={v ?? ""} onChange={(e) => set(e.target.value)} className={`${cls} appearance-none`}>
            <option value="">Sélectionner</option>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </FieldWrap>
      );

    case "multiselect":
      if (opts.length === 0) {
        // dynamicOptions uniquement : saisie libre par tags
        const arr: string[] = Array.isArray(v) ? v : [];
        return (
          <FieldWrap label={field.label} required={field.required}>
            <div className="space-y-2">
              <input type="text" placeholder={field.placeholder ?? "Tapez puis Entrée…"} className={cls}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const tag = e.currentTarget.value.trim().replace(/,$/, "");
                    if (tag && !arr.includes(tag)) set([...arr, tag]);
                    e.currentTarget.value = "";
                  }
                }} />
              {arr.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {arr.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                      {tag}
                      <button type="button" onClick={() => set(arr.filter((t) => t !== tag))}
                        className="text-primary/60 hover:text-primary leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FieldWrap>
        );
      }
      return (
        <FieldWrap label={field.label} required={field.required}>
          <MultiChips
            options={opts}
            selected={Array.isArray(v) ? v : []}
            onToggle={(item) => {
              const arr: string[] = Array.isArray(v) ? v : [];
              set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
            }}
          />
        </FieldWrap>
      );

    case "time":
      return (
        <FieldWrap label={field.label} required={field.required}>
          <input type="time" value={v ?? ""} onChange={(e) => set(e.target.value)} className={cls} />
        </FieldWrap>
      );

    case "file":
    case "repeater":
      return null;

    default:
      return null;
  }
}

interface Props {
  config: OfferSubtypeConfig;
  value: DynData;
  onChange: (patch: Partial<DynData>) => void;
}

export default function ProviderSchemaForm({ config, value, onChange }: Props) {
  const patch = (p: Partial<DynData>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-5">
      {config.sections.map((section) => (
        <div key={section.label} className="space-y-3">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase border-b border-slate-100 pb-1">
            {section.label}
          </p>
          <div className="space-y-3">
            {section.fields.map((field) => (
              <RenderField key={field.key} field={field} data={value} onChange={patch} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
