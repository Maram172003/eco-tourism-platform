"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, ArrowLeft, Check, Plus, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import dynamic from "next/dynamic";

const MultiLocationPicker = dynamic(
  () => import("@/components/map/MultiLocationPicker"),
  { ssr: false }
);

// ─── Data ─────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "fr", label: "Français" }, { value: "ar", label: "Arabe" },
  { value: "en", label: "Anglais" }, { value: "es", label: "Espagnol" },
  { value: "de", label: "Allemand" }, { value: "it", label: "Italien" },
];

const DOMAINES_PRINCIPAUX = [
  { value: "nature_ecotourisme",    label: "Nature & Écotourisme",       icon: "park",            desc: "Faune, flore, biodiversité et espaces naturels" },
  { value: "culture_patrimoine",    label: "Culture & Patrimoine",       icon: "account_balance", desc: "Patrimoine, architecture, traditions et musées" },
  { value: "historique_archeo",     label: "Historique & Archéologique", icon: "history_edu",     desc: "Histoire, fouilles, civilisations et monuments" },
  { value: "aventure_randonnee",    label: "Aventure & Randonnée",       icon: "hiking",          desc: "Trek, camping, escalade et activités outdoor" },
  { value: "gastronomie_locale",    label: "Gastronomie locale",         icon: "restaurant",      desc: "Cuisine, marchés, dégustation et savoir-faire culinaire" },
  { value: "artisanat_traditions",  label: "Artisanat & Traditions",     icon: "palette",         desc: "Poterie, tissage, bijoux et savoir-faire locaux" },
  { value: "decouverte_urbaine",    label: "Découverte urbaine",         icon: "location_city",   desc: "Architecture, vie locale, quartiers et street art" },
  { value: "autre",                 label: "Autre",                      icon: "auto_awesome",    desc: "Profil hybride ou spécialité unique" },
];

const EXPERTISES_PAR_DOMAINE: Record<string, string[]> = {
  nature_ecotourisme: [
    "Faune","Flore","Biodiversité","Ornithologie","Géologie",
    "Botanique","Entomologie","Herpétologie","Mammalogie",
    "Écologie marine","Zones humides","Forêts & maquis",
    "Désert & dunes","Oasis","Parcs naturels",
    "Astronomie & ciel nocturne","Photographie nature",
    "Éducation environnementale","Conservation & protection","Apiculture",
  ],
  culture_patrimoine: [
    "Architecture islamique","Architecture romaine",
    "Architecture coloniale","Artisanat traditionnel","Musées",
    "Médinas","Traditions locales","Costumes & bijoux",
    "Musique traditionnelle","Danse folklorique","Littérature & poésie",
    "Calligraphie arabe","Tissage & broderie","Poterie & céramique",
    "Hammam & bains","Fêtes & festivals","Contes & légendes",
    "Religion & spiritualité","Berbère & amazigh","Art contemporain",
  ],
  historique_archeo: [
    "Période punique","Période romaine","Période byzantine",
    "Période arabe & médiévale","Période ottomane","Période coloniale",
    "Préhistoire","Fouilles archéologiques","Numismatique","Épigraphie",
    "Mosaïques antiques","Thermes romains","Amphithéâtres","Nécropoles",
    "Citernes & aqueducs","Ksour & greniers berbères","Fortifications",
    "Routes commerciales","Histoire maritime","Carthage & civilisation punique",
  ],
  aventure_randonnee: [
    "Randonnée pédestre","Trek multi-jours","Escalade","Via ferrata",
    "Spéléologie","Canyoning","VTT & cyclisme","Kayak & canoë",
    "Surf & windsurf","Plongée sous-marine","Snorkeling","Quad & 4x4",
    "Safari désert","Bivouac","Camping sauvage","Dromadaire",
    "Équitation","Course d'orientation","Parapente","Pêche traditionnelle",
  ],
  gastronomie_locale: [
    "Cuisine tunisienne traditionnelle","Cuisine berbère",
    "Cuisine côtière & fruits de mer","Pâtisserie & sucreries",
    "Street food","Épices & condiments","Huile d'olive & oléiculture",
    "Dattes & palmeraies","Harissa artisanale","Boulangerie traditionnelle",
    "Marchés locaux","Producteurs locaux","Agriculture biologique",
    "Cours de cuisine","Dégustation de thés","Vins & viticulture",
    "Fromages locaux","Miel & apiculture","Lait de chamelle",
    "Boissons traditionnelles",
  ],
  artisanat_traditions: [
    "Poterie & céramique","Tissage & tapis","Broderie","Bijoux berbères",
    "Bijoux en argent","Maroquinerie & cuir","Sculpture sur bois",
    "Thuya & marqueterie","Ferronnerie","Vannerie & alfa",
    "Parfumerie naturelle","Savon artisanal","Teinture naturelle",
    "Verrerie soufflée","Calligraphie","Enluminure","Peinture sur soie",
    "Couture & caftan","Dinanderie","Travail de l'esparto",
  ],
  decouverte_urbaine: [
    "Architecture moderne","Street art & graffiti","Quartiers historiques",
    "Vie de quartier","Marchés urbains","Cafés & culture locale",
    "Gastronomie urbaine","Transport local","Scène artistique",
    "Musique & nuits locales","Shopping alternatif","Communautés locales",
    "Urbanisme & ville durable","Histoire de la ville","Cinéma & culture pop",
    "Littérature & librairies","Parcs & espaces verts","Plages urbaines",
    "Port & activités maritimes","Jeunesse & innovation",
  ],
  autre: [
    "Bien-être & yoga","Méditation & pleine conscience",
    "Retraite spirituelle","Développement personnel","Photographie",
    "Peinture & arts plastiques","Écriture créative","Astronomie",
    "Archéo-astronomie","Géographie","Climatologie","Tourisme solidaire",
    "Bénévolat","Langues & dialectes locaux","Généalogie",
    "Sciences de la terre","Tourisme accessible","Tourisme sénior",
    "Tourisme scolaire","Tourisme d'affaires",
  ],
};

const CERTIFICATIONS = [
  "Guide certifié Éco-Voyage",
  "Premiers secours (PSC1)",
  "Guide de montagne agréé",
  "Formation éco-tourisme",
  "Brevet de guide touristique",
  "Certification environnement",
];

const ZONES_COUVERTES = [
  { value: "grand_tunis",       label: "Grand Tunis" },
  { value: "cap_bon",           label: "Cap Bon" },
  { value: "nord_ouest",        label: "Nord-Ouest" },
  { value: "sahel",             label: "Sahel" },
  { value: "centre_ouest",      label: "Centre-Ouest" },
  { value: "sfax",              label: "Sfax & Environs" },
  { value: "djerba_sud_est",    label: "Djerba & Sud-Est" },
  { value: "tozeur_sahara",     label: "Tozeur & Sahara" },
  { value: "tataouine_berbere", label: "Tataouine & Berbère" },
];

const PUBLICS_ACCUEILLIS = [
  { value: "familles",     label: "Familles avec enfants", icon: "family_restroom" },
  { value: "scolaires",    label: "Enfants (scolaires)",   icon: "school" },
  { value: "adultes",      label: "Adultes",               icon: "person" },
  { value: "seniors",      label: "Seniors",               icon: "elderly" },
  { value: "pmr",          label: "PMR",                   icon: "accessible" },
  { value: "groupes",      label: "Groupes de voyageurs",  icon: "group" },
  { value: "photographes", label: "Photographes",          icon: "photo_camera" },
];

const STEPS = [
  { id: 1, title: "Informations personnelles",  subtitle: "Votre profil" },
  { id: 2, title: "Expertise professionnelle",  subtitle: "Vos compétences" },
  { id: 3, title: "Zone d'activité",            subtitle: "Où vous guidez" },
  { id: 4, title: "Votre présentation",         subtitle: "Votre histoire" },
];

// ─── Composants helpers ────────────────────────────────────────────────────────

const inputCls = "w-full px-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium";
const inputClsIcon = "w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium";
const labelCls = "text-sm font-bold text-slate-700 ml-1";

function InputIcon({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl pointer-events-none">{icon}</span>
      {children}
    </div>
  );
}

function ChipSelect({ options, selected, onToggle }: {
  options: { value: string; label: string; icon?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button key={opt.value} type="button" onClick={() => onToggle(opt.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2
              ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}>
            {opt.icon && <span className="material-symbols-outlined text-base">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]); setInput("");
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold border border-primary/20">
              {tag}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder ?? "Ajouter…"} className={`${inputCls} flex-1`} />
        <button type="button" onClick={add}
          className="px-4 py-3.5 bg-primary rounded-xl text-sm font-extrabold text-slate-900 hover:bg-primary/90 shrink-0 shadow-sm">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function PhotoUpload({ photo, onChange }: { photo: string; onChange: (v: string) => void }) {
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400; const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL("image/jpeg", 0.7));
      URL.revokeObjectURL(url);
    };
    img.src = url; e.target.value = "";
  }
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
          {photo
            ? <img src={photo} alt="Photo de profil" className="w-full h-full object-cover" />
            : <span className="material-symbols-outlined text-slate-300 text-4xl">person</span>}
        </div>
        <label htmlFor="guide-photo-upload"
          className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
          <span className="material-symbols-outlined text-slate-900 text-base">photo_camera</span>
        </label>
        <input id="guide-photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <p className="text-xs text-slate-400 font-medium">Photo de profil (optionnel)</p>
    </div>
  );
}

function BoolToggle({ label, icon, value, onChange }: { label: string; icon: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-slate-400 text-xl">{icon}</span>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      <div className="flex gap-2">
        {([true, false] as const).map((v) => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition-all border-2
              ${value === v ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40 bg-white"}`}>
            {v ? "Oui" : "Non"}
          </button>
        ))}
      </div>
    </div>
  );
}

function CertProofInput({ proof, onChange }: { proof: string; onChange: (v: string) => void }) {
  const [mode, setMode] = useState<"url" | "image">("url");

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-2 ml-8 space-y-2">
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all
            ${mode === "url" ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40"}`}
        >
          <span className="material-symbols-outlined text-sm">link</span>
          URL / Lien
        </button>
        <button
          type="button"
          onClick={() => setMode("image")}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all
            ${mode === "image" ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-500 hover:border-primary/40"}`}
        >
          <span className="material-symbols-outlined text-sm">photo_camera</span>
          Photo
        </button>
      </div>

      {mode === "url" ? (
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">link</span>
          <input
            type="url"
            value={proof.startsWith("data:") ? "" : proof}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://exemple.com/mon-certificat.pdf"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-slate-700 placeholder:text-slate-400 font-medium"
          />
        </div>
      ) : (
        <div>
          {proof.startsWith("data:") ? (
            <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <img src={proof} alt="Justificatif" className="w-12 h-12 object-cover rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate">Justificatif ajouté</p>
                <p className="text-xs text-slate-400">Image téléchargée</p>
              </div>
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-2xl">upload_file</span>
              <div>
                <p className="text-sm font-bold text-slate-600">Cliquer pour uploader</p>
                <p className="text-xs text-slate-400">JPG, PNG, PDF — max 2Mo</p>
              </div>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleImage} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Étape 1 — Informations personnelles ──────────────────────────────────────

function Step1Personal({ data, setData }: any) {
  const toggle = (field: string, v: string) => {
    const arr = data[field] as string[];
    setData({ ...data, [field]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] });
  };
  return (
    <div className="space-y-5">
      <PhotoUpload photo={data.photo} onChange={(v) => setData({ ...data, photo: v })} />
      <hr className="border-slate-100" />

      <div className="space-y-1.5">
        <label className={labelCls}>Nom complet <span className="text-red-500">*</span></label>
        <InputIcon icon="person">
          <input className={inputClsIcon} value={data.full_name}
            onChange={(e) => setData({ ...data, full_name: e.target.value })}
            placeholder="Prénom Nom" />
        </InputIcon>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className={labelCls}>Téléphone <span className="text-red-500">*</span></label>
          <InputIcon icon="phone">
            <input className={inputClsIcon} value={data.telephone}
              onChange={(e) => setData({ ...data, telephone: e.target.value })}
              placeholder="+216 XX XXX XXX" />
          </InputIcon>
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Email <span className="text-red-500">*</span></label>
          <InputIcon icon="mail">
            <input type="email" className={inputClsIcon} value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              placeholder="guide@email.com" />
          </InputIcon>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Ville / Région <span className="text-red-500">*</span></label>
        <InputIcon icon="location_city">
          <input className={inputClsIcon} value={data.ville_residence}
            onChange={(e) => setData({ ...data, ville_residence: e.target.value })}
            placeholder="Ex: Sousse" />
        </InputIcon>
      </div>

      <div className="space-y-1.5">
        <label className={labelCls}>Langues parlées <span className="text-red-500">*</span></label>
        <ChipSelect options={LANGUAGES} selected={data.languages_spoken} onToggle={(v) => toggle("languages_spoken", v)} />
      </div>
    </div>
  );
}

// ─── Étape 2 — Expertise professionnelle ──────────────────────────────────────

function Step2Pro({ data, setData }: any) {
  const [autreLabel, setAutreLabel] = useState("");
  const isActiveCert = (label: string) => data.certifications.some((c: any) => c.label === label);
  const setProof = (label: string, proof: string) =>
    setData({ ...data, certifications: data.certifications.map((c: any) => c.label === label ? { ...c, proof } : c) });
  const toggleCert = (label: string) => {
    if (isActiveCert(label)) {
      setData({ ...data, certifications: data.certifications.filter((c: any) => c.label !== label) });
    } else {
      setData({ ...data, certifications: [...data.certifications, { label, proof: "" }] });
    }
  };
  const autreEntry = data.certifications.find((c: any) => !CERTIFICATIONS.includes(c.label));
  const autreActive = !!autreEntry;
  const toggleAutre = () => {
    if (autreActive) {
      setData({ ...data, certifications: data.certifications.filter((c: any) => CERTIFICATIONS.includes(c.label)) });
    } else {
      setData({ ...data, certifications: [...data.certifications, { label: autreLabel || "Autre", proof: "" }] });
    }
  };

  const toggleExpertise = (v: string) => {
    const arr = data.expertises as string[];
    setData({ ...data, expertises: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] });
  };

  const toggleDomaine = (v: string) => {
    const current = data.domaines as string[];
    if (current.includes(v)) {
      const removed = current.filter((x) => x !== v);
      const removedExpertises = EXPERTISES_PAR_DOMAINE[v] ?? [];
      const remainingExpertises = [
        ...new Set(removed.flatMap((d) => EXPERTISES_PAR_DOMAINE[d] ?? [])),
      ];
      setData({
        ...data,
        domaines: removed,
        expertises: (data.expertises as string[]).filter((e) => remainingExpertises.includes(e) || !removedExpertises.includes(e)),
      });
    } else {
      setData({ ...data, domaines: [...current, v] });
    }
  };

  return (
    <div className="space-y-5">
      {/* Domaines */}
      <div className="space-y-1.5">
        <label className={labelCls}>Vos domaines <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 gap-2">
          {DOMAINES_PRINCIPAUX.map((t) => {
            const active = (data.domaines as string[]).includes(t.value);
            return (
              <button key={t.value} type="button"
                onClick={() => toggleDomaine(t.value)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all
                  ${active ? "border-primary bg-primary/5" : "border-slate-100 bg-white hover:border-primary/30"}`}>
                <span className={`material-symbols-outlined text-xl flex-shrink-0 ${active ? "text-primary" : "text-slate-400"}`}>{t.icon}</span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vos expertises — groupées par domaine sélectionné */}
      <div className="space-y-1.5">
        <label className={labelCls}>Vos expertises <span className="text-red-500">*</span></label>
        {(data.domaines as string[]).length === 0 ? (
          <p className="text-xs text-slate-400 ml-1">Sélectionnez d'abord un ou plusieurs domaines ci-dessus.</p>
        ) : (
          <div className="space-y-4">
            {(data.domaines as string[]).map((d: string) => {
              const domaineMeta = DOMAINES_PRINCIPAUX.find((x) => x.value === d);
              const exps = EXPERTISES_PAR_DOMAINE[d] ?? [];
              return (
                <div key={d}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="material-symbols-outlined text-base text-primary">{domaineMeta?.icon ?? "label"}</span>
                    <span className="text-xs font-extrabold text-primary uppercase tracking-wide">{domaineMeta?.label ?? d}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exps.map((s) => {
                      const active = (data.expertises as string[]).includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleExpertise(s)}
                          className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all
                            ${active ? "bg-primary border-primary text-slate-900" : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"}`}>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Années d'expérience */}
      <div className="space-y-1.5">
        <label className={labelCls}>Années d'expérience <span className="text-red-500">*</span></label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={30}
            value={data.years_experience}
            onChange={(e) => setData({ ...data, years_experience: parseInt(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="text-2xl font-extrabold text-primary w-16 text-center">
            {data.years_experience} an{data.years_experience > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Certifications */}
      <div className="space-y-2">
        <p className={labelCls}>Certifications & formations</p>
        <p className="text-xs text-slate-400 ml-1">Ajoutez un justificatif pour chaque certification sélectionnée.</p>
        <div className="space-y-2">
          {CERTIFICATIONS.map((cert) => {
            const active = isActiveCert(cert);
            const certObj = data.certifications.find((c: any) => c.label === cert);
            return (
              <div key={cert} className={`rounded-xl border-2 overflow-hidden transition-all ${active ? "border-primary bg-primary/5" : "border-slate-100 bg-white hover:border-primary/30"}`}>
                <button type="button" onClick={() => toggleCert(cert)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? "border-primary bg-primary" : "border-slate-300"}`}>
                    {active && <Check className="w-3 h-3 text-slate-900" />}
                  </div>
                  <span className={active ? "text-slate-900" : "text-slate-600"}>{cert}</span>
                  {active && certObj?.proof && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-bold">
                      <span className="material-symbols-outlined text-sm">verified</span>Justifié
                    </span>
                  )}
                </button>
                {active && (
                  <div className="px-4 pb-4">
                    <CertProofInput proof={certObj?.proof ?? ""} onChange={(v) => setProof(cert, v)} />
                  </div>
                )}
              </div>
            );
          })}
          {/* Autre */}
          <div className={`rounded-xl border-2 overflow-hidden transition-all ${autreActive ? "border-primary bg-primary/5" : "border-slate-100 bg-white hover:border-primary/30"}`}>
            <button type="button" onClick={toggleAutre}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${autreActive ? "border-primary bg-primary" : "border-slate-300"}`}>
                {autreActive && <Check className="w-3 h-3 text-slate-900" />}
              </div>
              <span className={autreActive ? "text-slate-900" : "text-slate-600"}>Autre</span>
            </button>
            {autreActive && (
              <div className="px-4 pb-4 space-y-2">
                <InputIcon icon="edit">
                  <input type="text" value={autreLabel}
                    onChange={(e) => {
                      setAutreLabel(e.target.value);
                      setData({ ...data, certifications: data.certifications.map((c: any) => !CERTIFICATIONS.includes(c.label) ? { ...c, label: e.target.value || "Autre" } : c) });
                    }}
                    placeholder="Nom de la certification…" className={inputClsIcon} />
                </InputIcon>
                <CertProofInput proof={autreEntry?.proof ?? ""} onChange={(v) => {
                  setData({ ...data, certifications: data.certifications.map((c: any) => !CERTIFICATIONS.includes(c.label) ? { ...c, proof: v } : c) });
                }} />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── Étape 3 — Zone d'activité ────────────────────────────────────────────────

function Step3Zone({ data, setData }: any) {
  const toggle = (field: string, v: string) => {
    const arr = data[field] as string[];
    setData({ ...data, [field]: arr.includes(v) ? arr.filter((x: string) => x !== v) : [...arr, v] });
  };
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className={labelCls}>Zones couvertes <span className="text-red-500">*</span></label>
        <ChipSelect options={ZONES_COUVERTES} selected={data.zones_couvertes} onToggle={(v) => toggle("zones_couvertes", v)} />
      </div>
      <div className="space-y-1.5">
        <label className={labelCls}>Villes & lieux spécifiques</label>
        <MultiLocationPicker
          value={data.villes_couvertes}
          onChange={(v) => setData({ ...data, villes_couvertes: v })}
          hint="Cliquez sur la carte pour épingler les villes et zones que vous couvrez."
        />
      </div>
      <div className="space-y-1.5">
        <label className={labelCls}>Sites maîtrisés</label>
        <MultiLocationPicker
          value={data.sites_maitrises}
          onChange={(v) => setData({ ...data, sites_maitrises: v })}
          hint="Cliquez sur la carte pour marquer les sites patrimoniaux, naturels ou culturels que vous maîtrisez."
        />
      </div>
      <BoolToggle label="Déplacement possible hors zone" icon="directions_car"
        value={data.deplacement_possible} onChange={(v) => setData({ ...data, deplacement_possible: v })} />
      <div className="space-y-1.5">
        <label className={labelCls}>Publics accueillis <span className="text-red-500">*</span></label>
        <ChipSelect options={PUBLICS_ACCUEILLIS} selected={data.publics_accueillis} onToggle={(v) => toggle("publics_accueillis", v)} />
      </div>
    </div>
  );
}

// ─── Étape 4 — Présentation ───────────────────────────────────────────────────

function Step4Presentation({ data, setData }: any) {
  const ta = "w-full px-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium resize-none";
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className={labelCls}>Présentation courte <span className="text-red-500">*</span></label>
        <div className="relative">
          <textarea className={ta} rows={3} maxLength={300} value={data.bio}
            onChange={(e) => setData({ ...data, bio: e.target.value })}
            placeholder="Décrivez votre profil en quelques mots percutants…" />
          <span className={`absolute bottom-2 right-3 text-xs font-semibold ${data.bio.length > 270 ? "text-amber-500" : "text-slate-400"}`}>
            {data.bio.length}/300
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={labelCls}>Expérience professionnelle</label>
        <textarea className={ta} rows={4} value={data.experience_pro}
          onChange={(e) => setData({ ...data, experience_pro: e.target.value })}
          placeholder="Décrivez vos expériences passées, formations, parcours…" />
      </div>
      <div className="space-y-1.5">
        <label className={labelCls}>Centres d'intérêt</label>
        <textarea className={ta} rows={3} value={data.centres_interet}
          onChange={(e) => setData({ ...data, centres_interet: e.target.value })}
          placeholder="Ce qui vous passionne, vos loisirs, vos engagements…" />
      </div>
      <div className="space-y-1.5">
        <label className={labelCls}>Pourquoi choisir ce guide ?</label>
        <textarea className={ta} rows={4} value={data.pourquoi_moi}
          onChange={(e) => setData({ ...data, pourquoi_moi: e.target.value })}
          placeholder="Votre point de différence, votre approche unique de l'éco-tourisme…" />
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function GuideOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    photo: "", full_name: "",
    ville_residence: "", telephone: "", email: "", languages_spoken: [] as string[],
    domaines: [] as string[], expertises: [] as string[], years_experience: 0,
    certifications: [] as { label: string; proof: string }[],
    zones_couvertes: [] as string[], villes_couvertes: [] as string[],
    sites_maitrises: [] as string[], deplacement_possible: null as boolean | null,
    publics_accueillis: [] as string[],
    bio: "", experience_pro: "", centres_interet: "", pourquoi_moi: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/auth/login"); return; }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user.email) setData((prev) => ({ ...prev, email: user.email }));
    } catch { /* ignore */ }
  }, [router]);

  const getToken = () => localStorage.getItem("access_token") || "";

  const canProceed = () => {
    if (step === 1) return !!data.full_name.trim() && !!data.ville_residence.trim() && !!data.telephone.trim() && data.languages_spoken.length > 0;
    if (step === 2) return data.domaines.length > 0 && data.expertises.length > 0;
    if (step === 3) return data.zones_couvertes.length > 0 && data.publics_accueillis.length > 0;
    if (step === 4) return !!data.bio.trim();
    return true;
  };

  const handleNext = async () => {
    setError("");
    if (!canProceed()) { setError("Veuillez compléter les champs obligatoires."); return; }
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${getToken()}` };
      if (step === 1) {
        await apiFetch("/guide/identity", {
          method: "POST", headers,
          body: JSON.stringify({
            full_name: data.full_name.trim(),
            photo: data.photo || undefined,
            languages_spoken: data.languages_spoken,
            years_experience: data.years_experience,
            telephone: data.telephone || undefined,
            ville_residence: data.ville_residence || undefined,
          }),
        });
      } else if (step === 2) {
        await apiFetch("/guide/certifications", {
          method: "PATCH", headers,
          body: JSON.stringify({
            certifications: data.certifications.filter((c) => c.label.trim()),
            domaines: data.domaines,
            expertises: data.expertises,
            assurance: null,
          }),
        });
      } else if (step === 3) {
        await apiFetch("/guide/services", {
          method: "PATCH", headers,
          body: JSON.stringify({
            zones_couvertes: data.zones_couvertes,
            villes_couvertes: data.villes_couvertes,
            sites_maitrises: data.sites_maitrises,
            deplacement_possible: data.deplacement_possible,
            publics_accueillis: data.publics_accueillis,
          }),
        });
      } else if (step === 4) {
        await apiFetch("/guide/identity", {
          method: "POST", headers,
          body: JSON.stringify({
            full_name: data.full_name.trim(),
            bio: data.bio || undefined,
            photo: data.photo || undefined,
            languages_spoken: data.languages_spoken,
            experience_pro: data.experience_pro || undefined,
            centres_interet: data.centres_interet || undefined,
            pourquoi_moi: data.pourquoi_moi || undefined,
          }),
        });
        await apiFetch("/guide/onboarded", { method: "POST", headers });
        router.push("/dashboard");
        return;
      }
      setStep((s) => s + 1);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="text-primary w-7 h-7" />
            <span className="text-lg font-extrabold tracking-tight">Éco-Voyage</span>
          </div>
          <span className="text-sm font-semibold text-slate-500">Étape {step} sur {STEPS.length}</span>
        </div>
      </header>

      {/* Barre de progression */}
      <div className="h-1.5 bg-slate-100">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Dots */}
          <div className="flex justify-center gap-2 mb-10">
            {STEPS.map((s) => (
              <div key={s.id} className={`h-2 rounded-full transition-all duration-300
                ${s.id === step ? "w-8 bg-primary" : s.id < step ? "w-4 bg-primary/40" : "w-4 bg-slate-200"}`} />
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            {/* En-tête carte */}
            <div className="p-8 pb-0">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full mb-4">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">{STEPS[step - 1].subtitle}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{STEPS[step - 1].title}</h1>
            </div>

            {/* Corps */}
            <div className="p-8">
              {step === 1 && <Step1Personal data={data} setData={setData} />}
              {step === 2 && <Step2Pro data={data} setData={setData} />}
              {step === 3 && <Step3Zone data={data} setData={setData} />}
              {step === 4 && <Step4Presentation data={data} setData={setData} />}

              {error && (
                <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>
              )}
            </div>

            {/* Pied */}
            <div className="px-8 pb-8 flex items-center justify-between gap-4">
              {step > 1
                ? <button type="button" onClick={() => { setError(""); setStep((s) => s - 1); }}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:border-slate-300 transition-all">
                    <ArrowLeft className="w-4 h-4" />Retour
                  </button>
                : <div />
              }
              <button type="button" onClick={handleNext} disabled={loading || !canProceed()}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-slate-900 rounded-xl font-extrabold shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60 disabled:translate-y-0">
                {loading
                  ? <div className="w-5 h-5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                  : step === STEPS.length
                    ? <><Check className="w-4 h-4" />Terminer</>
                    : <>Continuer<ArrowRight className="w-4 h-4" /></>
                }
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
