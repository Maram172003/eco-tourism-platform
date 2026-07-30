"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

// ── Shared styles ──────────────────────────────────────────────────────────────

const ic = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Pills({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const tog = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => tog(o)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${value.includes(o) ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput("");
  };
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder} className={`${ic} flex-1`} />
        <button type="button" onClick={add}
          className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors">
          <Plus size={14} />
        </button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => (
            <span key={v} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))}>
                <X size={10} className="text-slate-400 hover:text-red-500" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Radios({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${value === o ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {desc && <p className="text-xs text-slate-400">{desc}</p>}
      </div>
      <div className="flex gap-1.5">
        {[true, false].map((v) => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border-2 transition-all ${value === v ? "border-primary bg-primary text-slate-900" : "border-slate-200 bg-white text-slate-400"}`}>
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Dynamic fields map (exported) ──────────────────────────────────────────────

export type DynData = Record<string, any>;

interface Props {
  specialite: string;
  value: DynData;
  onChange: (v: Partial<DynData>) => void;
}

// ── Randonnée ────────────────────────────────────────────────────────────────

function RandonneeFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  const DIFFICULTE = [
    { v: "tres_facile", label: "Très facile", color: "bg-emerald-400" },
    { v: "facile",      label: "Facile",      color: "bg-yellow-400"  },
    { v: "moderee",     label: "Modérée",     color: "bg-orange-400"  },
    { v: "difficile",   label: "Difficile",   color: "bg-red-400"     },
    { v: "expert",      label: "Expert",      color: "bg-slate-800"   },
  ];
  return (
    <div className="space-y-5">
      <Section title="Données techniques">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Distance (km)" required><input type="number" placeholder="Ex: 12" className={ic} value={value.distance_km ?? ""} onChange={(e) => onChange({ distance_km: e.target.value })} /></Field>
          <Field label="Dénivelé + (m)" required><input type="number" placeholder="Ex: 450" className={ic} value={value.denivele_positif_m ?? ""} onChange={(e) => onChange({ denivele_positif_m: e.target.value })} /></Field>
          <Field label="Altitude max (m)"><input type="number" placeholder="Ex: 1200" className={ic} value={value.altitude_max_m ?? ""} onChange={(e) => onChange({ altitude_max_m: e.target.value })} /></Field>
        </div>
        <Field label="Difficulté physique" required>
          <div className="grid grid-cols-5 gap-1.5">
            {DIFFICULTE.map((d) => (
              <button key={d.v} type="button" onClick={() => onChange({ difficulte: d.v })}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all ${value.difficulte === d.v ? "border-primary" : "border-slate-200"}`}>
                <span className={`w-5 h-5 rounded-full ${d.color}`} />
                <span className="text-[9px] font-extrabold text-slate-600 text-center leading-tight">{d.label}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Type de parcours"><Radios options={["Boucle", "Aller-retour", "Traversée", "Linéaire"]} value={value.type_parcours ?? ""} onChange={(v) => onChange({ type_parcours: v })} /></Field>
        <Field label="Type de terrain"><Pills options={["Sentier balisé", "Hors sentier", "Forêt", "Montagne", "Côtier", "Désert", "Oasis"]} value={value.type_terrain ?? []} onChange={(v) => onChange({ type_terrain: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Infos pratiques">
        <Field label="Heure de retour estimée"><input type="time" className={ic} value={value.retour_estime ?? ""} onChange={(e) => onChange({ retour_estime: e.target.value })} /></Field>
        <ToggleRow label="Eau disponible sur le parcours" value={!!value.eau_disponible} onChange={(v) => onChange({ eau_disponible: v })} />
        {value.eau_disponible && <Field label="Points d'eau"><TagsInput value={value.point_eau ?? []} onChange={(v) => onChange({ point_eau: v })} placeholder="Ex: Source au km 3" /></Field>}
        <ToggleRow label="Refuge disponible" value={!!value.refuge_disponible} onChange={(v) => onChange({ refuge_disponible: v })} />
        <ToggleRow label="Départ possible avant le lever du soleil" value={!!value.depart_tot} onChange={(v) => onChange({ depart_tot: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Équipement">
        <Field label="Équipement obligatoire"><TagsInput value={value.equipement_obligatoire ?? []} onChange={(v) => onChange({ equipement_obligatoire: v })} placeholder="Ex: Chaussures de randonnée" /></Field>
        <Field label="Équipement recommandé"><TagsInput value={value.equipement_recommande ?? []} onChange={(v) => onChange({ equipement_recommande: v })} placeholder="Ex: Bâtons de marche" /></Field>
      </Section>
    </div>
  );
}

// ── Safari Photo ──────────────────────────────────────────────────────────────

function SafariPhotoFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Sujets photographiques">
        <Field label="Sujets phares" required><Pills options={["Désert & dunes", "Faune sauvage", "Architecture", "Portraits", "Paysages côtiers", "Oasis", "Nuit étoilée", "Marchés"]} value={value.sujets_photo ?? []} onChange={(v) => onChange({ sujets_photo: v })} /></Field>
        <Field label="Styles photographiques"><Pills options={["Paysage", "Portrait", "Macro", "Nocturne", "Aérien", "Architecture", "Street"]} value={value.styles_photo ?? []} onChange={(v) => onChange({ styles_photo: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Timing lumière">
        <Field label="Meilleure lumière"><Pills options={["Aube (lever soleil)", "Matin (2h après lever)", "Golden hour soir", "Crépuscule", "Nuit"]} value={value.meilleure_lumiere ?? []} onChange={(v) => onChange({ meilleure_lumiere: v })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Heure lever soleil"><input type="time" className={ic} value={value.heure_lever ?? ""} onChange={(e) => onChange({ heure_lever: e.target.value })} /></Field>
          <Field label="Heure coucher soleil"><input type="time" className={ic} value={value.heure_coucher ?? ""} onChange={(e) => onChange({ heure_coucher: e.target.value })} /></Field>
        </div>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Niveau & Matériel">
        <Field label="Niveau photo requis"><Radios options={["Aucun (smartphone suffit)", "Débutant", "Amateur éclairé", "Avancé"]} value={value.niveau_photo ?? ""} onChange={(v) => onChange({ niveau_photo: v })} /></Field>
        <Field label="Équipement photo recommandé"><TagsInput value={value.equip_photo ?? []} onChange={(v) => onChange({ equip_photo: v })} placeholder="Ex: Trépied, objectif téléphoto..." /></Field>
        <ToggleRow label="Guide partage ses propres photos après la sortie" value={!!value.partage_photos} onChange={(v) => onChange({ partage_photos: v })} />
        <ToggleRow label="Conseils post-traitement Lightroom inclus" value={!!value.lightroom} onChange={(v) => onChange({ lightroom: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Conditions">
        <Field label="Plan B si mauvaise lumière"><textarea className={`${ic} resize-none`} rows={2} placeholder="Alternative prévue si ciel couvert..." value={value.plan_b ?? ""} onChange={(e) => onChange({ plan_b: e.target.value })} /></Field>
      </Section>
    </div>
  );
}

// ── Ornithologie ──────────────────────────────────────────────────────────────

function OrnithologieFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Espèces et milieux">
        <Field label="Espèces cibles phares" required><TagsInput value={value.especes_cibles ?? []} onChange={(v) => onChange({ especes_cibles: v })} placeholder="Ex: Flamant rose, Cigogne blanche..." /></Field>
        <Field label="Espèces rares observables"><TagsInput value={value.especes_rares ?? []} onChange={(v) => onChange({ especes_rares: v })} placeholder="Ex: Ibis falcinelle..." /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nb espèces min attendues"><input type="number" className={ic} value={value.especes_min ?? ""} onChange={(e) => onChange({ especes_min: e.target.value })} /></Field>
          <Field label="Nb espèces max attendues"><input type="number" className={ic} value={value.especes_max ?? ""} onChange={(e) => onChange({ especes_max: e.target.value })} /></Field>
        </div>
        <Field label="Milieux d'observation"><Pills options={["Zone humide", "Forêt", "Côte & îles", "Steppe", "Montagne", "Oasis", "Lac & sebkha"]} value={value.milieux ?? []} onChange={(v) => onChange({ milieux: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Timing">
        <Field label="Heure recommandée"><Pills options={["Aube", "Matin", "Après-midi", "Crépuscule"]} value={value.heure_reco ?? []} onChange={(v) => onChange({ heure_reco: v })} /></Field>
        <Field label="Meilleure période de l'année"><Pills options={["Janv", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"]} value={value.periode_annee ?? []} onChange={(v) => onChange({ periode_annee: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Équipement optique">
        <ToggleRow label="Jumelles professionnelles fournies" value={!!value.jumelles_fournies} onChange={(v) => onChange({ jumelles_fournies: v })} />
        {value.jumelles_fournies && <Field label="Puissance des jumelles"><input className={ic} placeholder="Ex: 8x42" value={value.puissance_jumelles ?? ""} onChange={(e) => onChange({ puissance_jumelles: e.target.value })} /></Field>}
        <ToggleRow label="Longue-vue sur trépied fournie" value={!!value.longue_vue} onChange={(v) => onChange({ longue_vue: v })} />
        <ToggleRow label="Fiches espèces illustrées fournies" value={!!value.fiches_especes} onChange={(v) => onChange({ fiches_especes: v })} />
        <Field label="Application mobile recommandée"><input className={ic} placeholder="Ex: Merlin Bird ID" value={value.app_mobile ?? ""} onChange={(e) => onChange({ app_mobile: e.target.value })} /></Field>
        <ToggleRow label="Liste officielle eBird remise à la fin" value={!!value.liste_officielle} onChange={(v) => onChange({ liste_officielle: v })} />
      </Section>
    </div>
  );
}

// ── Astronomie ────────────────────────────────────────────────────────────────

function AstronomieFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  const POLLUTION = [
    { v: "excellent", label: "Excellent (Bortle 1-2)", dot: "bg-indigo-600" },
    { v: "tres_bon",  label: "Très bon (Bortle 3-4)",  dot: "bg-blue-500"   },
    { v: "bon",       label: "Bon (Bortle 5-6)",        dot: "bg-sky-400"    },
    { v: "moyen",     label: "Moyen (Bortle 7+)",       dot: "bg-slate-400"  },
  ];
  return (
    <div className="space-y-5">
      <Section title="Objets observés">
        <Field label="Objets célestes au programme" required><Pills options={["Lune", "Planètes", "Voie Lactée", "Amas d'étoiles", "Nébuleuses", "Galaxies", "Pluies météorites"]} value={value.objets ?? []} onChange={(v) => onChange({ objets: v })} /></Field>
        <Field label="Événement spécial"><input className={ic} placeholder="Ex: Pluie météorites Perséides" value={value.evenement ?? ""} onChange={(e) => onChange({ evenement: e.target.value })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Qualité du site">
        <Field label="Pollution lumineuse" required>
          <div className="space-y-1.5">
            {POLLUTION.map((p) => (
              <button key={p.v} type="button" onClick={() => onChange({ pollution: p.v })}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all text-sm font-bold ${value.pollution === p.v ? "border-primary bg-primary/10 text-slate-900" : "border-slate-200 bg-white text-slate-500 hover:border-primary/30"}`}>
                <span className={`w-3 h-3 rounded-full ${p.dot}`} />{p.label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Altitude du site (m)"><input type="number" className={ic} placeholder="Ex: 800" value={value.altitude_site ?? ""} onChange={(e) => onChange({ altitude_site: e.target.value })} /></Field>
          <Field label="Distance de la ville (km)"><input type="number" className={ic} placeholder="Ex: 45" value={value.distance_ville ?? ""} onChange={(e) => onChange({ distance_ville: e.target.value })} /></Field>
        </div>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Équipement">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nombre de télescopes" required><input type="number" className={ic} placeholder="Ex: 2" value={value.nb_telescopes ?? ""} onChange={(e) => onChange({ nb_telescopes: e.target.value })} /></Field>
          <Field label="Puissance"><input className={ic} placeholder="Ex: 12 pouces" value={value.puissance_tel ?? ""} onChange={(e) => onChange({ puissance_tel: e.target.value })} /></Field>
        </div>
        <ToggleRow label="Laser pointeur étoiles" value={!!value.laser} onChange={(v) => onChange({ laser: v })} />
        <ToggleRow label="Cartes célestes fournies" value={!!value.cartes} onChange={(v) => onChange({ cartes: v })} />
        <ToggleRow label="Boissons chaudes incluses" value={!!value.boissons_chaudes} onChange={(v) => onChange({ boissons_chaudes: v })} />
        <ToggleRow label="Couvertures polaires fournies" value={!!value.couvertures} onChange={(v) => onChange({ couvertures: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Programme">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Heure début officielle"><input type="time" className={ic} value={value.heure_debut ?? ""} onChange={(e) => onChange({ heure_debut: e.target.value })} /></Field>
          <Field label="Heure fin estimée"><input type="time" className={ic} value={value.heure_fin ?? ""} onChange={(e) => onChange({ heure_fin: e.target.value })} /></Field>
        </div>
        <ToggleRow label="Nuit complète (dormir sur place)" value={!!value.nuit_complete} onChange={(v) => onChange({ nuit_complete: v })} />
      </Section>
    </div>
  );
}

// ── Culture & Patrimoine ─────────────────────────────────────────────────────

function CultureFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Type de visite">
        <Field label="Types de visite" required><Pills options={["Médina & souk", "Site archéologique", "Musée", "Village traditionnel", "Soirée culturelle", "Mosquée / Zaouïa", "Ksar / Ksour"]} value={value.type_visite ?? []} onChange={(v) => onChange({ type_visite: v })} /></Field>
        <Field label="Périodes historiques couvertes"><Pills options={["Punique", "Romaine", "Byzantine", "Arabe médiévale", "Ottoman", "Coloniale", "Contemporaine"]} value={value.periodes ?? []} onChange={(v) => onChange({ periodes: v })} /></Field>
        <Field label="Thèmes principaux"><Pills options={["Architecture", "Artisanat", "Religion", "Traditions", "Gastronomie", "Musique", "Fouilles"]} value={value.themes ?? []} onChange={(v) => onChange({ themes: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Sites visités">
        <Field label="Sites au programme"><TagsInput value={value.sites ?? []} onChange={(v) => onChange({ sites: v })} placeholder="Ex: Médina de Tunis, Carthage..." /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Médiation & Expérience">
        <Field label="Niveau de détail"><Radios options={["Grand public — accessible à tous", "Intermédiaire — passionnés d'histoire", "Expert — chercheurs"]} value={value.niveau_detail ?? ""} onChange={(v) => onChange({ niveau_detail: v })} /></Field>
        <Field label="Supports pédagogiques"><Pills options={["Cartes historiques", "Livret patrimoine", "Photos & documents", "Audioguide", "Application mobile"]} value={value.supports ?? []} onChange={(v) => onChange({ supports: v })} /></Field>
        <ToggleRow label="Anecdotes exclusives (non disponibles dans les guides)" value={!!value.anecdotes_exclusives} onChange={(v) => onChange({ anecdotes_exclusives: v })} />
        <ToggleRow label="Rencontre avec des artisans locaux" value={!!value.rencontre_artisans} onChange={(v) => onChange({ rencontre_artisans: v })} />
        <ToggleRow label="Dégustation locale incluse" value={!!value.degustation} onChange={(v) => onChange({ degustation: v })} />
        <ToggleRow label="Accès à des lieux privés non touristiques" value={!!value.acces_prives} onChange={(v) => onChange({ acces_prives: v })} />
      </Section>
    </div>
  );
}

// ── Gastronomie ───────────────────────────────────────────────────────────────

function GastronomieFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Type d'expérience">
        <Field label="Types d'expérience gastronomique" required><Pills options={["Visite marché local", "Cours de cuisine", "Dégustation produits", "Repas chez l'habitant", "Circuit restaurants", "Rencontre producteurs", "Atelier pâtisserie"]} value={value.type_experience ?? []} onChange={(v) => onChange({ type_experience: v })} /></Field>
        <Field label="Produits phares mis en avant"><TagsInput value={value.produits ?? []} onChange={(v) => onChange({ produits: v })} placeholder="Ex: Harissa, Huile d'olive, Couscous..." /></Field>
        <Field label="Origine des produits"><Radios options={["Local (village / région immédiate)", "Régional", "National"]} value={value.origine ?? ""} onChange={(v) => onChange({ origine: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Repas">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nb de plats minimum"><input type="number" className={ic} value={value.plats_min ?? ""} onChange={(e) => onChange({ plats_min: e.target.value })} /></Field>
          <Field label="Nb de plats maximum"><input type="number" className={ic} value={value.plats_max ?? ""} onChange={(e) => onChange({ plats_max: e.target.value })} /></Field>
        </div>
        <ToggleRow label="Repas complet inclus" value={!!value.repas_complet} onChange={(v) => onChange({ repas_complet: v })} />
        <ToggleRow label="Cours de cuisine inclus" value={!!value.cours_cuisine} onChange={(v) => onChange({ cours_cuisine: v })} />
        {value.cours_cuisine && (
          <>
            <ToggleRow label="Recettes remises" value={!!value.recettes} onChange={(v) => onChange({ recettes: v })} />
            <ToggleRow label="Tablier fourni" value={!!value.tablier} onChange={(v) => onChange({ tablier: v })} />
          </>
        )}
        <ToggleRow label="Certification bio" value={!!value.bio} onChange={(v) => onChange({ bio: v })} />
        <ToggleRow label="Rencontre avec des producteurs" value={!!value.producteurs} onChange={(v) => onChange({ producteurs: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Régimes alimentaires gérés">
        <Field label="Options disponibles"><Pills options={["Végétarien", "Vegan", "Sans gluten", "Halal", "Kasher", "Sans lactose"]} value={value.regimes ?? []} onChange={(v) => onChange({ regimes: v })} /></Field>
        <Field label="Allergies gérées"><TagsInput value={value.allergies ?? []} onChange={(v) => onChange({ allergies: v })} placeholder="Ex: Arachides, fruits de mer..." /></Field>
      </Section>
    </div>
  );
}

// ── Spéléologie ───────────────────────────────────────────────────────────────

function SpeleologieFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="La grotte">
        <Field label="Nom de la grotte" required><input className={ic} placeholder="Ex: Grotte de..." value={value.nom_grotte ?? ""} onChange={(e) => onChange({ nom_grotte: e.target.value })} /></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Longueur (m)"><input type="number" className={ic} value={value.longueur_m ?? ""} onChange={(e) => onChange({ longueur_m: e.target.value })} /></Field>
          <Field label="Profondeur max (m)"><input type="number" className={ic} value={value.profondeur_m ?? ""} onChange={(e) => onChange({ profondeur_m: e.target.value })} /></Field>
          <Field label="Dénivelé (m)"><input type="number" className={ic} value={value.denivele_m ?? ""} onChange={(e) => onChange({ denivele_m: e.target.value })} /></Field>
        </div>
        <Field label="Histoire et découverte"><textarea className={`${ic} resize-none`} rows={2} placeholder="Historique de la grotte..." value={value.histoire ?? ""} onChange={(e) => onChange({ histoire: e.target.value })} /></Field>
        <Field label="Concrétions remarquables"><TagsInput value={value.concretions ?? []} onChange={(v) => onChange({ concretions: v })} placeholder="Ex: Stalagmites géantes..." /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Niveau et passages">
        <Field label="Niveau" required><Radios options={["Initiation (aucun prérequis)", "Intermédiaire", "Avancé", "Expert"]} value={value.niveau ?? ""} onChange={(v) => onChange({ niveau: v })} /></Field>
        <ToggleRow label="Passages étroits (claustrophobie excluante)" value={!!value.passages_etroits} onChange={(v) => onChange({ passages_etroits: v })} />
        <ToggleRow label="Passages aquatiques" value={!!value.passages_eau} onChange={(v) => onChange({ passages_eau: v })} />
        <ToggleRow label="Escalade requise" value={!!value.escalade} onChange={(v) => onChange({ escalade: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Équipement fourni">
        <div className="grid grid-cols-2 gap-2">
          {(["casques", "lampes", "combinaisons", "baudriers", "cordes", "wetsuits"] as const).map((k) => (
            <ToggleRow key={k} label={{ casques: "Casques", lampes: "Lampes frontales", combinaisons: "Combinaisons", baudriers: "Baudriers", cordes: "Cordes", wetsuits: "Wetsuits (si eau)" }[k]} value={!!value[k]} onChange={(v) => onChange({ [k]: v })} />
          ))}
        </div>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Sécurité">
        <Field label="Ratio guide / participants"><input className={ic} placeholder="Ex: 1 guide pour 4" value={value.ratio ?? ""} onChange={(e) => onChange({ ratio: e.target.value })} /></Field>
        <ToggleRow label="Téléphone satellite embarqué" value={!!value.tel_satellite} onChange={(v) => onChange({ tel_satellite: v })} />
        <Field label="Protocole d'urgence"><textarea className={`${ic} resize-none`} rows={2} placeholder="Décrivez le protocole en cas d'urgence..." value={value.urgence ?? ""} onChange={(e) => onChange({ urgence: e.target.value })} /></Field>
      </Section>
    </div>
  );
}

// ── VTT & Cyclisme ────────────────────────────────────────────────────────────

function VttFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  const DIFFICULTE = [
    { v: "verte", label: "Verte", color: "bg-green-500" },
    { v: "bleue", label: "Bleue", color: "bg-blue-500"  },
    { v: "rouge", label: "Rouge", color: "bg-red-500"   },
    { v: "noire", label: "Noire", color: "bg-slate-900" },
  ];
  return (
    <div className="space-y-5">
      <Section title="Données techniques">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Distance (km)" required><input type="number" className={ic} value={value.distance_km ?? ""} onChange={(e) => onChange({ distance_km: e.target.value })} /></Field>
          <Field label="Dénivelé + (m)"><input type="number" className={ic} value={value.denivele_m ?? ""} onChange={(e) => onChange({ denivele_m: e.target.value })} /></Field>
          <Field label="Altitude max (m)"><input type="number" className={ic} value={value.altitude_max ?? ""} onChange={(e) => onChange({ altitude_max: e.target.value })} /></Field>
        </div>
        <Field label="Difficulté" required>
          <div className="flex gap-2">
            {DIFFICULTE.map((d) => (
              <button key={d.v} type="button" onClick={() => onChange({ difficulte: d.v })}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${value.difficulte === d.v ? "border-primary" : "border-slate-200"}`}>
                <span className={`w-6 h-6 rounded-full ${d.color}`} />
                <span className="text-xs font-extrabold text-slate-700">{d.label}</span>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Type de parcours"><Radios options={["Boucle", "Aller-retour", "Linéaire"]} value={value.type_parcours ?? ""} onChange={(v) => onChange({ type_parcours: v })} /></Field>
        <Field label="Type de terrain"><Pills options={["Single track", "Piste", "Route", "Montagne", "Forêt", "Désert"]} value={value.type_terrain ?? []} onChange={(v) => onChange({ type_terrain: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Vélos fournis">
        <ToggleRow label="Vélo fourni" value={!!value.velo_fourni} onChange={(v) => onChange({ velo_fourni: v })} />
        {value.velo_fourni && (
          <>
            <Field label="Type(s) de vélo"><Pills options={["VTT trail 29\"", "VTT enduro", "Gravel", "Cross-country"]} value={value.type_velo ?? []} onChange={(v) => onChange({ type_velo: v })} /></Field>
            <Field label="Tailles disponibles"><Pills options={["XS", "S", "M", "L", "XL"]} value={value.tailles_velo ?? []} onChange={(v) => onChange({ tailles_velo: v })} /></Field>
            <ToggleRow label="Vélo électrique disponible" value={!!value.velo_electrique} onChange={(v) => onChange({ velo_electrique: v })} />
          </>
        )}
        <ToggleRow label="Casque homologué fourni" value={!!value.casque_fourni} onChange={(v) => onChange({ casque_fourni: v })} />
        <Field label="Protections fournies"><Pills options={["Genouillères", "Coudières", "Dorsale", "Gants"]} value={value.protections ?? []} onChange={(v) => onChange({ protections: v })} /></Field>
        <ToggleRow label="Kit réparation + pompe" value={!!value.kit_reparation} onChange={(v) => onChange({ kit_reparation: v })} />
        <ToggleRow label="Assistance mécanique disponible" value={!!value.assistance_meca} onChange={(v) => onChange({ assistance_meca: v })} />
      </Section>
    </div>
  );
}

// ── Kayak & Sports nautiques ──────────────────────────────────────────────────

function KayakFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Type d'activité">
        <Field label="Activités proposées" required><Pills options={["Kayak mer", "Kayak rivière", "Canoë", "Stand-up paddle", "Snorkeling", "Plongée découverte"]} value={value.type_activite ?? []} onChange={(v) => onChange({ type_activite: v })} /></Field>
        <Field label="Type d'eau" required><Radios options={["Mer", "Lac", "Rivière", "Estuaire", "Mixte"]} value={value.type_eau ?? ""} onChange={(v) => onChange({ type_eau: v })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Conditions">
        <Field label="Niveau des vagues / courant"><Pills options={["Calme (mer d'huile)", "Léger", "Modéré", "Fort (expérimentés)"]} value={value.niveau_vagues ?? []} onChange={(v) => onChange({ niveau_vagues: v })} /></Field>
        <Field label="Vent max acceptable (km/h)"><input type="number" className={ic} placeholder="Ex: 20" value={value.vent_max ?? ""} onChange={(e) => onChange({ vent_max: e.target.value })} /></Field>
        <ToggleRow label="Annulation si vent trop fort" value={!!value.annulation_vent} onChange={(v) => onChange({ annulation_vent: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Équipement">
        <Field label="Embarcations fournies"><Pills options={["Kayak solo", "Kayak duo", "Canoë", "Paddle board"]} value={value.embarcations ?? []} onChange={(v) => onChange({ embarcations: v })} /></Field>
        <ToggleRow label="Gilets de sauvetage certifiés" value={!!value.gilets} onChange={(v) => onChange({ gilets: v })} />
        <ToggleRow label="Combinaisons fournies" value={!!value.combinaisons} onChange={(v) => onChange({ combinaisons: v })} />
        <ToggleRow label="Sacs étanches fournis" value={!!value.sacs_etanches} onChange={(v) => onChange({ sacs_etanches: v })} />
        <ToggleRow label="Masques & tubas (snorkeling)" value={!!value.masques_tubas} onChange={(v) => onChange({ masques_tubas: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Sécurité maritime">
        <ToggleRow label="Capitaine / guide certifié" value={!!value.certifie} onChange={(v) => onChange({ certifie: v })} />
        {value.certifie && <Field label="Certification"><input className={ic} placeholder="Ex: BPJEPS, MHM..." value={value.certification ?? ""} onChange={(e) => onChange({ certification: e.target.value })} /></Field>}
        <ToggleRow label="Balise de détresse embarquée" value={!!value.balise} onChange={(v) => onChange({ balise: v })} />
        <ToggleRow label="Radio VHF" value={!!value.radio_vhf} onChange={(v) => onChange({ radio_vhf: v })} />
        <Field label="Arrêts baignade prévus (nb)"><input type="number" className={ic} value={value.arrets_baignade ?? ""} onChange={(e) => onChange({ arrets_baignade: e.target.value })} /></Field>
      </Section>
    </div>
  );
}

// ── Désert & Camping ──────────────────────────────────────────────────────────

function DesertFields({ value, onChange }: { value: DynData; onChange: (v: Partial<DynData>) => void }) {
  return (
    <div className="space-y-5">
      <Section title="Type de séjour">
        <Field label="Type de séjour désert" required><Pills options={["Bivouac 1 nuit", "Trek multi-jours", "Safari 4x4", "Balade en dromadaire", "Combiné"]} value={value.type_sejour ?? []} onChange={(v) => onChange({ type_sejour: v })} /></Field>
        <Field label="Nombre de nuits" required><input type="number" className={ic} placeholder="Ex: 1" value={value.nb_nuits ?? ""} onChange={(e) => onChange({ nb_nuits: e.target.value })} /></Field>
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Hébergement désert">
        <Field label="Type d'hébergement"><Pills options={["Tente fournie", "Belle étoile", "Ksar", "Oasis lodge", "Camp glamping"]} value={value.type_heberg ?? []} onChange={(v) => onChange({ type_heberg: v })} /></Field>
        <Field label="Qualité des tentes"><Radios options={["Basique", "Confort", "Glamping"]} value={value.qualite_tentes ?? ""} onChange={(v) => onChange({ qualite_tentes: v })} /></Field>
        <ToggleRow label="Sacs de couchage fournis" value={!!value.sacs_couchage} onChange={(v) => onChange({ sacs_couchage: v })} />
        {value.sacs_couchage && <Field label="Indice thermique du sac (°C)"><input type="number" className={ic} placeholder="Ex: -5" value={value.indice_sac ?? ""} onChange={(e) => onChange({ indice_sac: e.target.value })} /></Field>}
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Moyens de transport désert">
        <ToggleRow label="Dromadaires disponibles" value={!!value.dromadaires} onChange={(v) => onChange({ dromadaires: v })} />
        {value.dromadaires && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nb de dromadaires"><input type="number" className={ic} value={value.nb_dromadaires ?? ""} onChange={(e) => onChange({ nb_dromadaires: e.target.value })} /></Field>
            <Field label="Durée promenade (h)"><input type="number" className={ic} value={value.duree_dromadaire ?? ""} onChange={(e) => onChange({ duree_dromadaire: e.target.value })} /></Field>
          </div>
        )}
        <ToggleRow label="Véhicules 4x4" value={!!value.vehicules_4x4} onChange={(v) => onChange({ vehicules_4x4: v })} />
        {value.vehicules_4x4 && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nb de véhicules"><input type="number" className={ic} value={value.nb_4x4 ?? ""} onChange={(e) => onChange({ nb_4x4: e.target.value })} /></Field>
            <Field label="Type de véhicule"><input className={ic} placeholder="Ex: Land Cruiser" value={value.type_4x4 ?? ""} onChange={(e) => onChange({ type_4x4: e.target.value })} /></Field>
          </div>
        )}
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Programme & Activités">
        <Field label="Activités incluses"><Pills options={["Quad", "Sandboard", "Randonnée dunes", "Photographie", "Musique berbère", "Conte du désert"]} value={value.activites ?? []} onChange={(v) => onChange({ activites: v })} /></Field>
        <ToggleRow label="Observation des étoiles" value={!!value.etoiles} onChange={(v) => onChange({ etoiles: v })} />
        <ToggleRow label="Lever de soleil programmé" value={!!value.lever_soleil} onChange={(v) => onChange({ lever_soleil: v })} />
        <ToggleRow label="Coucher de soleil programmé" value={!!value.coucher_soleil} onChange={(v) => onChange({ coucher_soleil: v })} />
        <ToggleRow label="Cuisine berbère au feu de bois" value={!!value.cuisine_berbere} onChange={(v) => onChange({ cuisine_berbere: v })} />
        <ToggleRow label="Eau potable garantie tout au long" value={!!value.eau_potable} onChange={(v) => onChange({ eau_potable: v })} />
      </Section>
      <div className="h-px bg-slate-100" />
      <Section title="Sécurité désert">
        <ToggleRow label="GPS professionnel" value={!!value.gps} onChange={(v) => onChange({ gps: v })} />
        <ToggleRow label="Téléphone satellite" value={!!value.tel_sat} onChange={(v) => onChange({ tel_sat: v })} />
        <ToggleRow label="Kit de survie désert complet" value={!!value.kit_survie} onChange={(v) => onChange({ kit_survie: v })} />
        <Field label="Protocole médical d'urgence"><textarea className={`${ic} resize-none`} rows={2} placeholder="Comment gérez-vous une urgence médicale dans le désert ?" value={value.protocole ?? ""} onChange={(e) => onChange({ protocole: e.target.value })} /></Field>
      </Section>
    </div>
  );
}

// ── Router component ──────────────────────────────────────────────────────────

export default function DynamicOfferFields({ specialite, value, onChange }: Props) {
  if (!specialite) return null;

  const props = { value, onChange };

  const MAP: Record<string, React.ReactNode> = {
    randonnee_nature:       <RandonneeFields {...props} />,
    safari_photo:           <SafariPhotoFields {...props} />,
    ornithologie:           <OrnithologieFields {...props} />,
    astronomie:             <AstronomieFields {...props} />,
    culture_patrimoine:     <CultureFields {...props} />,
    gastronomie:            <GastronomieFields {...props} />,
    speleologie:            <SpeleologieFields {...props} />,
    vtt_cyclisme:           <VttFields {...props} />,
    kayak_sports_nautiques: <KayakFields {...props} />,
    desert_camping:         <DesertFields {...props} />,
  };

  return MAP[specialite] ?? (
    <div className="p-6 text-center text-slate-400 text-sm">
      Spécialité non reconnue : {specialite}
    </div>
  );
}
