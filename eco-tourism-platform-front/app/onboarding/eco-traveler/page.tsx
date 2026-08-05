"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

// ─── Étape 2 — Type de voyageur ───────────────────────────────────────────────
// Slugs identiques à public_recommande (guide) et details.public_cible (prestataire)

const TRAVELER_TYPES = [
  { value: "solo",      label: "Solo" },
  { value: "couples",   label: "Couples" },
  { value: "familles",  label: "Familles" },
  { value: "groupes",   label: "Groupes" },
  { value: "seniors",   label: "Seniors" },
  { value: "scolaires", label: "Scolaires" },
  { value: "photo",     label: "Photographes" },
];

// ─── Étape 3 — Univers (macro-catégories) ────────────────────────────────────

const UNIVERS = [
  { value: "nature",                label: "Nature" },
  { value: "histoire_archeologie",  label: "Histoire & Archéologie" },
  { value: "aventure_sport",        label: "Aventure & Sport" },
  { value: "gastronomie",           label: "Gastronomie" },
  { value: "artisanat",             label: "Artisanat" },
  { value: "decouverte_urbaine",    label: "Découverte urbaine" },
  { value: "culture_patrimoine",    label: "Culture & Patrimoine" },
  { value: "bien_etre",             label: "Bien-être" },
  { value: "transport_experientiel",label: "Transport expérientiel" },
  { value: "volontariat",           label: "Volontariat" },
];

// ─── Étape 3 — Valeurs durables (contenu inchangé, affichage #Label) ─────────

const SUSTAINABILITY_VALUES = [
  { value: "support_local_economy", label: "Soutenir l'économie locale" },
  { value: "protect_biodiversity",  label: "Protéger la biodiversité" },
  { value: "reduce_carbon",         label: "Réduire mon empreinte carbone" },
  { value: "responsible_tourism",   label: "Tourisme responsable" },
  { value: "respect_cultures",      label: "Respect des cultures" },
  { value: "local_consumption",     label: "Consommation locale" },
  { value: "avoid_mass_tourism",    label: "Éviter le tourisme de masse" },
];

// ─── Étape 4 — Tags fins (~153 tags, groupés par macro-catégorie) ─────────────

const TAXONOMY_TAGS: Record<string, { value: string; label: string }[]> = {
  nature: [
    { value: "faune",                   label: "Faune" },
    { value: "flore",                   label: "Flore" },
    { value: "biodiversite",            label: "Biodiversité" },
    { value: "ornithologie",            label: "Ornithologie & oiseaux" },
    { value: "geologie",                label: "Géologie" },
    { value: "botanique",               label: "Botanique" },
    { value: "ecologie_marine",         label: "Écologie marine" },
    { value: "zones_humides",           label: "Zones humides" },
    { value: "forets_maquis",           label: "Forêts & maquis" },
    { value: "desert_dunes",            label: "Désert & dunes" },
    { value: "oasis",                   label: "Oasis" },
    { value: "parcs_naturels",          label: "Parcs naturels" },
    { value: "astronomie",              label: "Astronomie & ciel nocturne" },
    { value: "photographie_nature",     label: "Photographie nature" },
    { value: "conservation_protection", label: "Conservation & protection" },
    { value: "observation_faune",       label: "Observation faune & mammifères" },
    { value: "safari_desert",           label: "Safari désert" },
    { value: "circuit_nature",          label: "Circuit nature" },
    { value: "circuit_montagne",        label: "Circuit montagne" },
    { value: "tour_cotier",             label: "Tour côtier" },
  ],
  histoire_archeologie: [
    { value: "periode_punique",              label: "Période punique" },
    { value: "periode_romaine",              label: "Période romaine" },
    { value: "periode_byzantine",            label: "Période byzantine" },
    { value: "periode_arabe_medievale",      label: "Période arabe & médiévale" },
    { value: "periode_ottomane",             label: "Période ottomane" },
    { value: "periode_coloniale",            label: "Période coloniale" },
    { value: "prehistoire",                  label: "Préhistoire" },
    { value: "fouilles_archeologiques",      label: "Fouilles archéologiques" },
    { value: "mosaiques_antiques",           label: "Mosaïques antiques" },
    { value: "thermes_romains",              label: "Thermes romains" },
    { value: "amphitheatres",               label: "Amphithéâtres" },
    { value: "necropoles",                   label: "Nécropoles" },
    { value: "ksour_greniers_berberes",      label: "Ksour & greniers berbères" },
    { value: "routes_commerciales",          label: "Routes commerciales" },
    { value: "carthage_civilisation_punique",label: "Carthage & civilisation punique" },
    { value: "circuit_historique",           label: "Circuit historique" },
  ],
  aventure_sport: [
    { value: "randonnee_pedestre",   label: "Randonnée pédestre" },
    { value: "trek_multi_jours",     label: "Trek multi-jours" },
    { value: "escalade",             label: "Escalade" },
    { value: "via_ferrata",          label: "Via ferrata" },
    { value: "speleologie",          label: "Spéléologie" },
    { value: "canyoning",            label: "Canyoning" },
    { value: "vtt_cyclisme",         label: "VTT & cyclisme" },
    { value: "kayak_canoe",          label: "Kayak & canoë" },
    { value: "surf_windsurf",        label: "Surf & windsurf" },
    { value: "plongee_sous_marine",  label: "Plongée sous-marine" },
    { value: "snorkeling",           label: "Snorkeling" },
    { value: "quad_4x4",             label: "Quad & 4x4" },
    { value: "bivouac",              label: "Bivouac" },
    { value: "equitation",           label: "Équitation" },
    { value: "tir_arc",              label: "Tir à l'arc" },
    { value: "peche_traditionnelle", label: "Pêche traditionnelle" },
  ],
  gastronomie: [
    { value: "cuisine_tunisienne_traditionnelle", label: "Cuisine tunisienne traditionnelle" },
    { value: "cuisine_berbere",                   label: "Cuisine berbère" },
    { value: "cuisine_cotiere_fruits_mer",        label: "Cuisine côtière & fruits de mer" },
    { value: "street_food",                       label: "Street food" },
    { value: "epices_condiments",                 label: "Épices & condiments" },
    { value: "huile_olive_oleiculture",           label: "Huile d'olive & oléiculture" },
    { value: "dattes_palmeraies",                 label: "Dattes & palmeraies" },
    { value: "marches_locaux",                    label: "Marchés locaux" },
    { value: "cours_cuisine",                     label: "Cours de cuisine" },
    { value: "degustation_thes",                  label: "Dégustation de thés" },
    { value: "vins_viticulture",                  label: "Vins & viticulture" },
    { value: "boulangerie_traditionnelle",        label: "Boulangerie traditionnelle" },
    { value: "miel_apiculture",                   label: "Miel & apiculture" },
    { value: "restaurant_traditionnel",           label: "Restaurant traditionnel" },
    { value: "cafe_salon_the",                    label: "Café & salon de thé" },
    { value: "ferme_restaurant",                  label: "Ferme-restaurant" },
    { value: "food_truck",                        label: "Food truck" },
    { value: "table_hotes",                       label: "Table d'hôtes" },
    { value: "degustation_produits",              label: "Dégustation de produits" },
    { value: "diner_panoramique",                 label: "Dîner panoramique" },
    { value: "visite_ferme",                      label: "Visite ferme" },
    { value: "cueillette",                        label: "Cueillette" },
    { value: "atelier_fromage_yaourt",            label: "Atelier fromage & yaourt" },
    { value: "jardinage",                         label: "Jardinage & plantation" },
    { value: "elevage_responsable",               label: "Élevage responsable" },
  ],
  artisanat: [
    { value: "poterie_ceramique",      label: "Poterie & céramique" },
    { value: "tissage_tapis",          label: "Tissage & tapis" },
    { value: "broderie",               label: "Broderie" },
    { value: "bijoux_berberes",        label: "Bijoux berbères" },
    { value: "bijoux_argent",          label: "Bijoux en argent" },
    { value: "maroquinerie_cuir",      label: "Maroquinerie & cuir" },
    { value: "sculpture_bois",         label: "Sculpture sur bois" },
    { value: "thuya_marqueterie",      label: "Thuya & marqueterie" },
    { value: "vannerie_alfa",          label: "Vannerie & alfa" },
    { value: "calligraphie",           label: "Calligraphie arabe" },
    { value: "enluminure",             label: "Enluminure" },
    { value: "teinture_naturelle",     label: "Teinture naturelle" },
    { value: "dinanderie",             label: "Dinanderie" },
    { value: "savon_artisanal",        label: "Savon artisanal" },
    { value: "couture_caftan",         label: "Couture & caftan" },
    { value: "tannerie",               label: "Tannerie" },
    { value: "parfumerie_naturelle",   label: "Parfumerie naturelle" },
    { value: "peinture_traditionnelle",label: "Peinture traditionnelle" },
  ],
  decouverte_urbaine: [
    { value: "architecture_moderne",      label: "Architecture moderne" },
    { value: "street_art_graffiti",       label: "Street art & graffiti" },
    { value: "quartiers_historiques",     label: "Quartiers historiques" },
    { value: "vie_de_quartier",           label: "Vie de quartier" },
    { value: "marches_urbains",           label: "Marchés urbains" },
    { value: "cafes_culture_locale",      label: "Cafés & culture locale" },
    { value: "gastronomie_urbaine",       label: "Gastronomie urbaine" },
    { value: "transport_local",           label: "Transport local" },
    { value: "scene_artistique",          label: "Scène artistique" },
    { value: "musique_nuits_locales",     label: "Musique & nuits locales" },
    { value: "shopping_alternatif",       label: "Shopping alternatif" },
    { value: "communautes_locales",       label: "Communautés locales" },
    { value: "parcs_espaces_verts",       label: "Parcs & espaces verts" },
    { value: "port_activites_maritimes",  label: "Port & activités maritimes" },
  ],
  culture_patrimoine: [
    { value: "architecture_islamique",   label: "Architecture islamique" },
    { value: "architecture_romaine",     label: "Architecture romaine" },
    { value: "architecture_coloniale",   label: "Architecture coloniale" },
    { value: "musees",                   label: "Musées" },
    { value: "medinas",                  label: "Médinas" },
    { value: "traditions_locales",       label: "Traditions locales" },
    { value: "costumes_bijoux",          label: "Costumes & bijoux" },
    { value: "musique_traditionnelle",   label: "Musique traditionnelle" },
    { value: "danse_folklorique",        label: "Danse folklorique" },
    { value: "litterature_poesie",       label: "Littérature & poésie" },
    { value: "fetes_festivals",          label: "Fêtes & festivals" },
    { value: "contes_legendes",          label: "Contes & légendes" },
    { value: "religion_spiritualite",    label: "Religion & spiritualité" },
    { value: "berbere_amazigh",          label: "Berbère & amazigh" },
    { value: "art_contemporain",         label: "Art contemporain" },
    { value: "soiree_culturelle",        label: "Soirée culturelle" },
    { value: "spectacle_traditionnel",   label: "Spectacle traditionnel" },
    { value: "atelier_musical",          label: "Atelier musical" },
    { value: "visite_medina",            label: "Visite médina guidée" },
    { value: "visite_musee",             label: "Visite musée" },
  ],
  bien_etre: [
    { value: "hammam_traditionnel",  label: "Hammam traditionnel" },
    { value: "massage_naturel",      label: "Massage naturel" },
    { value: "retraite_yoga",        label: "Retraite yoga" },
    { value: "meditation",           label: "Méditation" },
    { value: "bain_thermal",         label: "Bain thermal" },
    { value: "therapie_plantes",     label: "Thérapie par les plantes" },
    { value: "gommage_savon_noir",   label: "Gommage & savon noir" },
    { value: "yoga",                 label: "Yoga" },
  ],
  transport_experientiel: [
    { value: "location_velo",      label: "Balade à vélo" },
    { value: "caleche",            label: "Calèche" },
    { value: "bateau_traditionnel",label: "Bateau traditionnel" },
    { value: "tuk_tuk",            label: "Tuk-tuk" },
    { value: "dromadaire",         label: "Balade à dromadaire" },
    { value: "transfert_partage",  label: "Transfert partagé & covoiturage local" },
  ],
  volontariat: [
    { value: "plantation_arbres",            label: "Plantation d'arbres" },
    { value: "nettoyage_plage",              label: "Nettoyage plage" },
    { value: "nettoyage_foret",              label: "Nettoyage forêt" },
    { value: "education_environnementale",   label: "Éducation environnementale" },
    { value: "jardin_communautaire",         label: "Jardin communautaire" },
    { value: "sensibilisation_ecoles",       label: "Sensibilisation dans les écoles" },
  ],
};

// ─── Étape 4 — Paysages (contenu inchangé, affichage #Label) ─────────────────

const LANDSCAPES = [
  { value: "mountain",    label: "Montagne",    icon: "terrain" },
  { value: "desert",      label: "Désert",      icon: "sunny" },
  { value: "sea",         label: "Mer",         icon: "beach_access" },
  { value: "forest",      label: "Forêt",       icon: "forest" },
  { value: "lake",        label: "Lac",         icon: "water" },
  { value: "village",     label: "Village",     icon: "holiday_village" },
  { value: "archaeology", label: "Archéologie", icon: "account_balance" },
  { value: "oasis",       label: "Oasis",       icon: "local_florist" },
];

// ─── Étape 5 — Objectifs durables (inchangé) ─────────────────────────────────

const GOALS = [
  { value: "reduce_carbon",          label: "Réduire mon impact carbone" },
  { value: "support_local_projects", label: "Soutenir des projets locaux" },
  { value: "preserve_biodiversity",  label: "Préserver la biodiversité" },
  { value: "avoid_mass_tourism",     label: "Voyager hors tourisme de masse" },
  { value: "support_local_crafts",   label: "Soutenir l'artisanat local" },
  { value: "promote_local_culture",  label: "Promouvoir la culture locale" },
];

// ─── Composant commun ─────────────────────────────────────────────────────────

function MultiChipSelect({
  options, selected, onToggle, max,
}: {
  options: { value: string; label: string; icon?: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        const disabled = !active && max !== undefined && selected.length >= max;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(opt.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border-2
              ${active
                ? "bg-primary border-primary text-slate-900"
                : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"
              }
              ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {opt.icon && <span className="material-symbols-outlined text-base">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 1 — Identité ────────────────────────────────────────────────────────

function StepBasicInfo({ data, setData }: any) {
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 400;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      setData({ ...data, photo: canvas.toDataURL("image/jpeg", 0.7) });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-primary/20 overflow-hidden flex items-center justify-center">
            {data.photo
              ? <img src={data.photo} alt="Photo de profil" className="w-full h-full object-cover" />
              : <span className="material-symbols-outlined text-slate-300 text-4xl">person</span>}
          </div>
          <label htmlFor="photo-upload"
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-slate-900 text-base">photo_camera</span>
          </label>
          <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <p className="text-xs text-slate-400 font-medium">Photo de profil (optionnel)</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Nom complet *</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">person</span>
          <input
            className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium"
            value={data.full_name}
            onChange={(e) => setData({ ...data, full_name: e.target.value })}
            placeholder="Jean Dupont"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700 ml-1">Bio (optionnel)</label>
        <textarea
          className="w-full px-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 placeholder:text-slate-400 font-medium resize-none"
          value={data.bio}
          onChange={(e) => setData({ ...data, bio: e.target.value })}
          placeholder="Passionné(e) de voyages durables et de nature…"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Pays *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">public</span>
            <select
              className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium appearance-none"
              value={data.country}
              onChange={(e) => setData({ ...data, country: e.target.value })}>
              <option value="">Sélectionner</option>
              <option value="TN">Tunisie</option>
              <option value="MA">Maroc</option>
              <option value="DZ">Algérie</option>
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="CA">Canada</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700 ml-1">Langue *</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">translate</span>
            <select
              className="w-full pl-11 pr-4 py-3.5 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary text-slate-900 font-medium appearance-none"
              value={data.language}
              onChange={(e) => setData({ ...data, language: e.target.value })}>
              <option value="">Sélectionner</option>
              <option value="fr">Français</option>
              <option value="ar">Arabe</option>
              <option value="en">Anglais</option>
              <option value="es">Espagnol</option>
              <option value="de">Allemand</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Type de voyageur ────────────────────────────────────────────────

function StepTravelerType({ data, setData }: any) {
  const toggle = (v: string) => {
    const s = data.traveler_types.includes(v)
      ? data.traveler_types.filter((x: string) => x !== v)
      : [...data.traveler_types, v];
    setData({ ...data, traveler_types: s });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 font-medium">Sélectionnez un ou plusieurs profils qui vous correspondent.</p>
      <MultiChipSelect options={TRAVELER_TYPES} selected={data.traveler_types} onToggle={toggle} />
    </div>
  );
}

// ─── Step 4 — Motivations & Valeurs (valeurs durables uniquement) ────────────

function StepMotivations({ data, setData }: any) {
  const toggleVal = (v: string) => {
    const s = data.sustainability_values.includes(v)
      ? data.sustainability_values.filter((x: string) => x !== v)
      : [...data.sustainability_values, v];
    setData({ ...data, sustainability_values: s });
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-slate-700 mb-3">Valeurs durables</p>
        <MultiChipSelect options={SUSTAINABILITY_VALUES} selected={data.sustainability_values} onToggle={toggleVal} />
      </div>
    </div>
  );
}

// ─── Step 3 — Intérêts & Paysages ────────────────────────────────────────────

function StepInterests({ data, setData }: any) {
  const [searchQuery, setSearchQuery] = useState("");

  const toggleUnivers = (v: string) => {
    const s = data.motivations.includes(v)
      ? data.motivations.filter((x: string) => x !== v)
      : [...data.motivations, v];
    setData({ ...data, motivations: s });
  };

  // Tags filtrés selon les univers sélectionnés
  const selectedCategories: string[] = data.motivations;
  const rawPool = selectedCategories.length > 0
    ? selectedCategories.flatMap((cat) => TAXONOMY_TAGS[cat] ?? [])
    : Object.values(TAXONOMY_TAGS).flat();

  const seen = new Set<string>();
  const tagPool = rawPool.filter((t) => {
    if (seen.has(t.value)) return false;
    seen.add(t.value);
    return true;
  });

  const visibleTags = searchQuery.trim()
    ? tagPool.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : tagPool;

  const toggleInterest = (slug: string) => {
    const current: string[] = data.interests;
    const updated = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setData({ ...data, interests: updated });
  };

  const toggleLandscape = (v: string) => {
    const s = data.landscapes.includes(v)
      ? data.landscapes.filter((x: string) => x !== v)
      : [...data.landscapes, v];
    setData({ ...data, landscapes: s });
  };

  const selectedCount: number = (data.interests as string[]).length;

  return (
    <div className="space-y-6">
      {/* Univers qui vous attirent — filtre les activités ci-dessous */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-3">Univers qui vous attirent</p>
        <MultiChipSelect options={UNIVERS} selected={data.motivations} onToggle={toggleUnivers} />
      </div>

      {/* Activités & intérêts */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Activités & intérêts</p>

        {/* Barre de recherche */}
        <div className="relative mb-3">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer les activités…"
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {visibleTags.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Aucun tag correspondant.</p>
          ) : visibleTags.map((tag) => {
            const active = (data.interests as string[]).includes(tag.value);
            return (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleInterest(tag.value)}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all cursor-pointer
                  ${active
                    ? "bg-primary border-primary text-slate-900"
                    : "border-slate-200 text-slate-600 hover:border-primary/50 bg-white"
                  }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>

        {selectedCount > 0 && (
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {selectedCount} activité{selectedCount > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Paysages préférés */}
      <div>
        <p className="text-sm font-bold text-slate-700 mb-3">Paysages préférés</p>
        <MultiChipSelect options={LANDSCAPES} selected={data.landscapes} onToggle={toggleLandscape} />
      </div>
    </div>
  );
}

// ─── Step 5 — Objectifs durables ──────────────────────────────────────────────

function StepGoals({ data, setData }: any) {
  const toggle = (v: string) => {
    const s = data.sustainability_goals.includes(v)
      ? data.sustainability_goals.filter((x: string) => x !== v)
      : [...data.sustainability_goals, v];
    setData({ ...data, sustainability_goals: s });
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 font-medium">Quels sont vos objectifs durables en tant que voyageur ?</p>
      <div className="grid grid-cols-1 gap-3">
        {GOALS.map((g) => {
          const active = data.sustainability_goals.includes(g.value);
          return (
            <button key={g.value} type="button" onClick={() => toggle(g.value)}
              className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold border-2 transition-all text-left
                ${active
                  ? "bg-primary/10 border-primary text-slate-900"
                  : "border-slate-100 text-slate-600 hover:border-primary/30 bg-white"
                }`}>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${active ? "border-primary bg-primary" : "border-slate-300"}`}>
                {active && <Check className="w-3 h-3 text-slate-900" />}
              </div>
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Votre identité",       subtitle: "Dites-nous qui vous êtes" },
  { id: 2, title: "Type de voyageur",     subtitle: "Comment voyagez-vous ?" },
  { id: 3, title: "Intérêts & Paysages", subtitle: "Vos préférences" },
  { id: 4, title: "Motivations & Valeurs",subtitle: "Ce qui vous anime" },
  { id: 5, title: "Objectifs durables",   subtitle: "Votre engagement" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState({
    full_name: "",
    bio: "",
    country: "",
    language: "",
    photo: "",
    traveler_types:       [] as string[],
    motivations:          [] as string[],
    sustainability_values:[] as string[],
    interests:            [] as string[],
    landscapes:           [] as string[],
    travel_styles:        [] as string[], // conservé en state, non affiché ni envoyé
    sustainability_goals: [] as string[],
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const user  = localStorage.getItem("user");
    if (!token || !user) router.push("/auth/login");
  }, [router]);

  const getToken = () => localStorage.getItem("access_token") || "";

  const canProceed = () => {
    if (step === 1) return !!data.full_name.trim() && !!data.country && !!data.language;
    if (step === 2) return data.traveler_types.length > 0;
    return true;
  };

  const handleNext = async () => {
    setError("");
    if (!canProceed()) {
      setError("Veuillez compléter les champs obligatoires.");
      return;
    }

    try {
      setLoading(true);

      if (step === 1) {
        await apiFetch("/eco-traveler/profile", {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            full_name: data.full_name,
            bio:       data.bio || undefined,
            country:   data.country,
            language:  data.language,
            photo:     data.photo || undefined,
          }),
        });
      } else if (step === 2) {
        await apiFetch("/eco-traveler/traveler-types", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ traveler_types: data.traveler_types }),
        });
      } else if (step === 3) {
        await apiFetch("/eco-traveler/interests", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            interests:  data.interests,
            landscapes: data.landscapes,
          }),
        });
      } else if (step === 4) {
        await apiFetch("/eco-traveler/motivations", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            motivations:           data.motivations,
            sustainability_values: data.sustainability_values,
          }),
        });
      } else if (step === 5) {
        await apiFetch("/eco-traveler/goals", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ sustainability_goals: data.sustainability_goals }),
        });

        await apiFetch("/eco-traveler/onboarded", {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
        });

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

      {/* Barre de progression */}
      <div className="h-1.5 bg-slate-100">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Contenu */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {/* Indicateurs d'étapes */}
          <div className="flex justify-center gap-2 mb-10">
            {STEPS.map((s) => (
              <div key={s.id} className={`h-2 rounded-full transition-all duration-300
                ${s.id === step ? "w-8 bg-primary" : s.id < step ? "w-4 bg-primary/40" : "w-4 bg-slate-200"}`} />
            ))}
          </div>

          {/* Carte */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 pb-0">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full mb-4">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  {STEPS[step - 1].subtitle}
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{STEPS[step - 1].title}</h1>
            </div>

            <div className="p-8 pt-6 max-h-[60vh] overflow-y-auto">
              {step === 1 && <StepBasicInfo    data={data} setData={setData} />}
              {step === 2 && <StepTravelerType data={data} setData={setData} />}
              {step === 3 && <StepInterests    data={data} setData={setData} />}
              {step === 4 && <StepMotivations  data={data} setData={setData} />}
              {step === 5 && <StepGoals        data={data} setData={setData} />}

              {error && <p className="text-sm font-semibold text-red-600 mt-4">{error}</p>}
            </div>

            <div className="p-8 pt-4 border-t border-slate-50 flex items-center justify-between">
              <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>

              <button type="button" onClick={handleNext} disabled={loading}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-slate-900 font-extrabold text-sm shadow-lg shadow-primary/30 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60">
                {loading ? "Chargement..." : step === STEPS.length ? "Terminer & Passer le test" : "Continuer"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {step > 2 && (
            <div className="text-center mt-4">
              <button type="button" onClick={() => router.push("/dashboard")}
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
