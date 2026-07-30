"use client";

import { DOMAIN_CASCADE_CONFIG, getTypesDisponibles, getTypesGrouped, getExperiencesGrouped, getMediationGrouped } from "@/lib/domainCascadeConfig";

interface CascadeValue {
  types_visite: string[];
  experiences: string[];
  mediation: string[];
}

interface Props {
  domaine: string;
  expertisesSelectionnees: string[];
  value: CascadeValue;
  onChange: (v: Partial<CascadeValue>) => void;
}

const pill = (active: boolean) =>
  `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border cursor-pointer select-none ${
    active
      ? "bg-primary/10 border-primary/30 text-primary"
      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-primary/20 hover:bg-primary/5"
  }`;

function CheckDot({ active }: { active: boolean }) {
  return (
    <span
      className={`w-3 h-3 rounded-full border-2 shrink-0 transition-all ${
        active ? "bg-primary border-primary" : "border-slate-300"
      }`}
    />
  );
}

function GroupBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{label}</p>
      {children}
    </div>
  );
}

function PillGroup({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <button key={item} type="button" onClick={() => onToggle(item)} className={pill(active)}>
            <CheckDot active={active} />
            {item}
          </button>
        );
      })}
    </div>
  );
}

export default function GenericCascadeFields({ domaine, expertisesSelectionnees, value, onChange }: Props) {
  const cfg = DOMAIN_CASCADE_CONFIG[domaine];
  if (!cfg || expertisesSelectionnees.length === 0) return null;

  const typesDisponibles = getTypesDisponibles(cfg, expertisesSelectionnees);
  const grouped = getTypesGrouped(cfg, expertisesSelectionnees);

  const selectedTypes = value.types_visite;
  const selectedExp = value.experiences;
  const selectedMed = value.mediation;

  function toggleType(t: string) {
    const next = selectedTypes.includes(t)
      ? selectedTypes.filter((x) => x !== t)
      : [...selectedTypes, t];
    // retirer expériences et médiation qui ne sont plus liés
    const expGroups = getExperiencesGrouped(cfg, next);
    const medGroups = getMediationGrouped(cfg, next);
    const expSet = new Set(expGroups.flatMap((g) => g.experiences));
    const medSet = new Set(medGroups.flatMap((g) => g.mediation));
    onChange({
      types_visite: next,
      experiences: selectedExp.filter((e) => expSet.has(e)),
      mediation: selectedMed.filter((m) => medSet.has(m)),
    });
  }

  function toggleExp(e: string) {
    onChange({
      experiences: selectedExp.includes(e)
        ? selectedExp.filter((x) => x !== e)
        : [...selectedExp, e],
    });
  }

  function toggleMed(m: string) {
    onChange({
      mediation: selectedMed.includes(m)
        ? selectedMed.filter((x) => x !== m)
        : [...selectedMed, m],
    });
  }

  const expGroups = getExperiencesGrouped(cfg, selectedTypes);
  const medGroups = getMediationGrouped(cfg, selectedTypes);

  return (
    <div className="space-y-5">
      {/* Niveau 1 : Types par expertise */}
      <GroupBlock label={cfg.labelType}>
        {grouped.map(({ expertise, types }) => (
          <div key={expertise} className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 pl-0.5">{expertise}</p>
            <PillGroup items={types} selected={selectedTypes} onToggle={toggleType} />
          </div>
        ))}
        {grouped.length === 0 && (
          <PillGroup items={typesDisponibles} selected={selectedTypes} onToggle={toggleType} />
        )}
      </GroupBlock>

      {/* Niveau 2 : Expériences */}
      {selectedTypes.length > 0 && expGroups.length > 0 && (
        <GroupBlock label={cfg.labelExperiences}>
          {expGroups.map(({ typeVisite, experiences }) => (
            <div key={typeVisite} className="space-y-1.5">
              <p className="text-[10px] font-bold text-primary/60 pl-0.5">{typeVisite}</p>
              <PillGroup items={experiences} selected={selectedExp} onToggle={toggleExp} />
            </div>
          ))}
        </GroupBlock>
      )}

      {/* Niveau 3 : Médiation / Supports */}
      {selectedTypes.length > 0 && medGroups.length > 0 && (
        <GroupBlock label={cfg.labelMediation}>
          {medGroups.map(({ typeVisite, mediation }) => (
            <div key={typeVisite} className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 pl-0.5">{typeVisite}</p>
              <PillGroup items={mediation} selected={selectedMed} onToggle={toggleMed} />
            </div>
          ))}
        </GroupBlock>
      )}
    </div>
  );
}
