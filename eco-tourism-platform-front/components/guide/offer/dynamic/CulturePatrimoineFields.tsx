"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import {
  getTypesVisiteGrouped,
  getExperiencesGrouped,
  getMediationGrouped,
  getExperiencesDisponibles,
  getMediationDisponible,
  isCustomExperience,
} from "@/lib/culturePatrimoineConfig";

type DynData = Record<string, any>;

interface Props {
  expertisesSelectionnees: string[];
  value: DynData;
  onChange: (v: Partial<DynData>) => void;
}

// ─── Cascade Arrow ────────────────────────────────────────────────────────────

function CascadeArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="h-px flex-1 bg-slate-100" />
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100">
        <ChevronDown size={10} className="text-slate-400" />
        <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase">{label}</span>
      </div>
      <div className="h-px flex-1 bg-slate-100" />
    </div>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({
  label,
  selected,
  color,
  onToggle,
}: {
  label: string;
  selected: boolean;
  color: "green" | "blue";
  onToggle: () => void;
}) {
  const activeClass =
    color === "green"
      ? "bg-green-100 text-green-700 border-green-300"
      : "bg-blue-100 text-blue-700 border-blue-300";
  const hoverClass =
    color === "green"
      ? "hover:border-green-200 hover:bg-green-50/60"
      : "hover:border-blue-200 hover:bg-blue-50/60";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
        selected ? activeClass : `border-slate-200 bg-white text-slate-600 ${hoverClass}`
      }`}
    >
      {selected && <Check size={10} strokeWidth={3} />}
      {label}
    </button>
  );
}

// ─── Group Section (header + pills avec bordure latérale) ─────────────────────

function GroupBlock({
  title,
  color,
  children,
}: {
  title: string;
  color: "green" | "blue";
  children: React.ReactNode;
}) {
  const dotColor = color === "green" ? "bg-green-400" : "bg-blue-400";
  const borderColor = color === "green" ? "border-green-100" : "border-blue-100";

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
        <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${dotColor}`} />
        {title}
      </p>
      <div className={`flex flex-wrap gap-1.5 pl-3 border-l-2 ${borderColor}`}>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CulturePatrimoineFields({
  expertisesSelectionnees,
  value,
  onChange,
}: Props) {
  const typesVisiteSelectionnes: string[] = value.type_visite ?? [];
  const experiencesSelectionnees: string[] = value.experiences_incluses ?? [];
  const mediationSelectionnee: string[] = value.mediation ?? [];

  const typesVisiteGrouped = getTypesVisiteGrouped(expertisesSelectionnees);
  const experiencesGrouped = getExperiencesGrouped(typesVisiteSelectionnes);
  const mediationGrouped   = getMediationGrouped(typesVisiteSelectionnes);

  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  function showResetBadge(count: number) {
    setResetMsg(`${count} option${count > 1 ? "s" : ""} réinitialisée${count > 1 ? "s" : ""}`);
    setTimeout(() => setResetMsg(null), 3000);
  }

  // Cascade reset quand expertises changent
  useEffect(() => {
    const allAvailableTypes = new Set(
      expertisesSelectionnees.flatMap((e) => getTypesVisiteGrouped([e]).flatMap((g) => g.types))
    );
    const typesValides = typesVisiteSelectionnes.filter((t) => allAvailableTypes.has(t));
    const removed = typesVisiteSelectionnes.length - typesValides.length;
    if (removed > 0) {
      onChangeRef.current({ type_visite: typesValides, experiences_incluses: [], mediation: [] });
      showResetBadge(removed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertisesSelectionnees.join("|")]);

  // Cascade reset quand type_visite change
  useEffect(() => {
    const newExp = getExperiencesDisponibles(typesVisiteSelectionnes);
    const newMed = getMediationDisponible(typesVisiteSelectionnes);
    const expValides = experiencesSelectionnees.filter(
      (e) => newExp.includes(e) || isCustomExperience(e)
    );
    const medValides = mediationSelectionnee.filter((m) => newMed.includes(m));
    const updates: Partial<DynData> = {};
    const removedExp = experiencesSelectionnees.length - expValides.length;
    const removedMed = mediationSelectionnee.length - medValides.length;
    if (removedExp > 0) updates.experiences_incluses = expValides;
    if (removedMed > 0) updates.mediation = medValides;
    if (Object.keys(updates).length > 0) {
      onChangeRef.current(updates);
      showResetBadge(removedExp + removedMed);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesVisiteSelectionnes.join("|")]);

  function toggleTypeVisite(type: string) {
    const updated = typesVisiteSelectionnes.includes(type)
      ? typesVisiteSelectionnes.filter((t) => t !== type)
      : [...typesVisiteSelectionnes, type];
    onChange({ type_visite: updated });
  }

  function toggleExperience(exp: string) {
    const updated = experiencesSelectionnees.includes(exp)
      ? experiencesSelectionnees.filter((e) => e !== exp)
      : [...experiencesSelectionnees, exp];
    onChange({ experiences_incluses: updated });
  }

  function toggleMediation(m: string) {
    const updated = mediationSelectionnee.includes(m)
      ? mediationSelectionnee.filter((x) => x !== m)
      : [...mediationSelectionnee, m];
    onChange({ mediation: updated });
  }

  function addCustomExp() {
    const val = customInput.trim();
    if (!val || experiencesSelectionnees.includes(val)) return;
    onChange({ experiences_incluses: [...experiencesSelectionnees, val] });
    setCustomInput("");
  }

  return (
    <div className="space-y-5" style={{ animation: "cultureIn 0.2s ease-out" }}>
      <style>{`@keyframes cultureIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Badge de reset */}
      {resetMsg && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-[10px] font-black text-amber-600">{resetMsg}</span>
          <button type="button" onClick={() => setResetMsg(null)}>
            <X size={10} className="text-amber-400" />
          </button>
        </div>
      )}

      {/* ═══ SECTION 1 — TYPE DE VISITE ════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="mb-1">
          <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Type de visite *</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {expertisesSelectionnees.length === 0
              ? "Sélectionnez d'abord vos expertises ↑"
              : `Groupés par expertise · ${typesVisiteSelectionnes.length} sélectionné${typesVisiteSelectionnes.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {expertisesSelectionnees.length === 0 ? (
          <div className="flex items-center justify-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400 font-semibold">
              ↑ Sélectionnez des expertises pour voir les types de visite
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {typesVisiteGrouped.map(({ expertise, types }) => (
              <GroupBlock key={expertise} title={expertise} color="green">
                {types.map((type) => (
                  <Pill
                    key={type}
                    label={type}
                    selected={typesVisiteSelectionnes.includes(type)}
                    color="green"
                    onToggle={() => toggleTypeVisite(type)}
                  />
                ))}
              </GroupBlock>
            ))}
          </div>
        )}

        {typesVisiteSelectionnes.length === 0 && expertisesSelectionnees.length > 0 && (
          <p className="text-[10px] text-red-500 font-semibold">Sélectionnez au moins un type de visite *</p>
        )}
      </div>

      {/* ═══ SECTIONS CONDITIONNELLES ══════════════════════════════════════════ */}
      {typesVisiteSelectionnes.length > 0 && (
        <>
          <CascadeArrow label="Détermine les expériences et supports" />

          {/* ─── SECTION 2 — EXPÉRIENCES INCLUSES ──────────────────────────── */}
          <div className="space-y-3" style={{ animation: "cultureIn 0.25s ease-out" }}>
            <div className="mb-1">
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Expériences incluses *</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Groupées par type de visite</p>
            </div>

            <div className="space-y-3">
              {experiencesGrouped.map(({ typeVisite, experiences }) => (
                <GroupBlock key={typeVisite} title={typeVisite} color="green">
                  {experiences.map((exp) => (
                    <Pill
                      key={exp}
                      label={exp}
                      selected={experiencesSelectionnees.includes(exp)}
                      color="green"
                      onToggle={() => toggleExperience(exp)}
                    />
                  ))}
                </GroupBlock>
              ))}

              {/* Expériences custom (ajoutées manuellement) */}
              {experiencesSelectionnees.filter(isCustomExperience).length > 0 && (
                <GroupBlock title="Expériences personnalisées" color="green">
                  {experiencesSelectionnees.filter(isCustomExperience).map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => toggleExperience(exp)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-green-100 text-green-700 border-green-300"
                    >
                      <Check size={10} strokeWidth={3} />
                      {exp}
                      <span className="text-[8px] bg-green-200 px-1 rounded-full ml-0.5">custom</span>
                    </button>
                  ))}
                </GroupBlock>
              )}
            </div>

            {/* Champ expérience personnalisée */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomExp(); } }}
                placeholder="Ajouter une expérience personnalisée… (↵)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={addCustomExp}
                disabled={!customInput.trim()}
                className="px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-green-600 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* ─── SECTION 3 — MÉDIATION ──────────────────────────────────────── */}
          <div className="space-y-3" style={{ animation: "cultureIn 0.3s ease-out" }}>
            <div className="mb-1">
              <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Supports de médiation fournis</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Groupés par type de visite</p>
            </div>

            <div className="space-y-3">
              {mediationGrouped.map(({ typeVisite, mediation }) => (
                <GroupBlock key={typeVisite} title={typeVisite} color="blue">
                  {mediation.map((support) => (
                    <Pill
                      key={support}
                      label={support}
                      selected={mediationSelectionnee.includes(support)}
                      color="blue"
                      onToggle={() => toggleMediation(support)}
                    />
                  ))}
                </GroupBlock>
              ))}
            </div>
          </div>

          {/* ─── SECTION 4 — ACCÈS & CONDITIONS ────────────────────────────── */}
          <div className="space-y-3" style={{ animation: "cultureIn 0.35s ease-out" }}>
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Accès et conditions</p>

            {/* Accès privés */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700">Accès à des lieux privés non touristiques</p>
                <p className="text-[10px] text-slate-400">Cours intérieures, ateliers fermés, riads privés…</p>
              </div>
              <button
                type="button"
                onClick={() => onChange({ acces_prives: !value.acces_prives })}
                className={`ml-3 w-10 h-6 rounded-full transition-all relative shrink-0 ${
                  value.acces_prives ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    value.acces_prives ? "left-5" : "left-1"
                  }`}
                />
              </button>
            </div>
            {value.acces_prives && (
              <textarea
                value={value.detail_acces_prives ?? ""}
                onChange={(e) => onChange({ detail_acces_prives: e.target.value })}
                placeholder="Décrivez ces accès exclusifs…"
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400 resize-none"
              />
            )}

            {/* Entrées des sites */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Entrées des sites</p>
              <div className="space-y-1.5">
                {[
                  "Toutes incluses dans le prix",
                  "Certaines incluses (préciser)",
                  "Non incluses — à la charge du participant",
                ].map((opt) => {
                  const active = value.entrees === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onChange({ entrees: active ? undefined : opt })}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-left text-xs font-semibold transition-all ${
                        active
                          ? "bg-slate-800 border-slate-800 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "bg-white border-white" : "border-slate-400"}`}>
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-slate-800 block" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {value.entrees === "Certaines incluses (préciser)" && (
                <textarea
                  value={value.detail_entrees ?? ""}
                  onChange={(e) => onChange({ detail_entrees: e.target.value })}
                  placeholder="Ex: Entrée Grande Mosquée incluse, musée à part…"
                  rows={2}
                  className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white placeholder:text-slate-400 resize-none"
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
