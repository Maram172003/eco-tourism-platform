// Taxonomie commune offres & circuits — données seules, non encore connectées au filtre.

export type MacroSlug =
  | "nature" | "histoire_archeologie" | "aventure_sport" | "gastronomie"
  | "artisanat" | "decouverte_urbaine" | "culture_patrimoine"
  | "bien_etre" | "transport_experientiel" | "volontariat";

export interface MacroCategory {
  slug: MacroSlug;
  label: string;
}

export interface TaxonomyTag {
  slug: string;
  label: string;
  macro: MacroSlug;
}

// ── 1. Les 10 macro-catégories ────────────────────────────────────────────────

export const MACRO_CATEGORIES: MacroCategory[] = [
  { slug: "nature",                 label: "Nature" },
  { slug: "histoire_archeologie",   label: "Histoire & Archéologie" },
  { slug: "aventure_sport",         label: "Aventure & Sport" },
  { slug: "gastronomie",            label: "Gastronomie" },
  { slug: "artisanat",              label: "Artisanat" },
  { slug: "decouverte_urbaine",     label: "Découverte urbaine" },
  { slug: "culture_patrimoine",     label: "Culture & Patrimoine" },
  { slug: "bien_etre",              label: "Bien-Être" },
  { slug: "transport_experientiel", label: "Transport expérientiel" },
  { slug: "volontariat",            label: "Volontariat" },
];

// ── 2. Les ~153 tags fins, groupés par macro ──────────────────────────────────

export const TAXONOMY_TAGS: TaxonomyTag[] = [

  // 1. Nature & Faune-Flore
  { slug: "faune",                   label: "Faune",                              macro: "nature" },
  { slug: "flore",                   label: "Flore",                              macro: "nature" },
  { slug: "biodiversite",            label: "Biodiversité",                       macro: "nature" },
  { slug: "ornithologie",            label: "Ornithologie / observation oiseaux", macro: "nature" },
  { slug: "geologie",                label: "Géologie",                           macro: "nature" },
  { slug: "botanique",               label: "Botanique",                          macro: "nature" },
  { slug: "ecologie_marine",         label: "Écologie marine",                    macro: "nature" },
  { slug: "zones_humides",           label: "Zones humides",                      macro: "nature" },
  { slug: "forets_maquis",           label: "Forêts & maquis",                    macro: "nature" },
  { slug: "desert_dunes",            label: "Désert & dunes",                     macro: "nature" },
  { slug: "oasis",                   label: "Oasis",                              macro: "nature" },
  { slug: "parcs_naturels",          label: "Parcs naturels",                     macro: "nature" },
  { slug: "astronomie",              label: "Astronomie & ciel nocturne",         macro: "nature" },
  { slug: "photographie_nature",     label: "Photographie nature",                macro: "nature" },
  { slug: "conservation_protection", label: "Conservation & protection",          macro: "nature" },
  { slug: "observation_faune",       label: "Observation mammifères / faune",     macro: "nature" },
  { slug: "safari_desert",           label: "Safari désert",                      macro: "nature" },
  { slug: "circuit_nature",          label: "Circuit nature",                     macro: "nature" },
  { slug: "circuit_montagne",        label: "Circuit montagne",                   macro: "nature" },
  { slug: "tour_cotier",             label: "Tour côtier",                        macro: "nature" },

  // 2. Histoire & Archéologie
  { slug: "periode_punique",               label: "Période punique",                  macro: "histoire_archeologie" },
  { slug: "periode_romaine",               label: "Période romaine",                  macro: "histoire_archeologie" },
  { slug: "periode_byzantine",             label: "Période byzantine",                macro: "histoire_archeologie" },
  { slug: "periode_arabe_medievale",       label: "Période arabe & médiévale",        macro: "histoire_archeologie" },
  { slug: "periode_ottomane",              label: "Période ottomane",                 macro: "histoire_archeologie" },
  { slug: "periode_coloniale",             label: "Période coloniale",                macro: "histoire_archeologie" },
  { slug: "prehistoire",                   label: "Préhistoire",                      macro: "histoire_archeologie" },
  { slug: "fouilles_archeologiques",       label: "Fouilles archéologiques",          macro: "histoire_archeologie" },
  { slug: "mosaiques_antiques",            label: "Mosaïques antiques",               macro: "histoire_archeologie" },
  { slug: "thermes_romains",               label: "Thermes romains",                  macro: "histoire_archeologie" },
  { slug: "amphitheatres",                 label: "Amphithéâtres",                    macro: "histoire_archeologie" },
  { slug: "necropoles",                    label: "Nécropoles",                       macro: "histoire_archeologie" },
  { slug: "ksour_greniers_berberes",       label: "Ksour & greniers berbères",        macro: "histoire_archeologie" },
  { slug: "routes_commerciales",           label: "Routes commerciales",              macro: "histoire_archeologie" },
  { slug: "carthage_civilisation_punique", label: "Carthage & civilisation punique",  macro: "histoire_archeologie" },
  { slug: "circuit_historique",            label: "Circuit historique",               macro: "histoire_archeologie" },

  // 3. Aventure & Sport Outdoor
  { slug: "randonnee_pedestre",   label: "Randonnée pédestre",   macro: "aventure_sport" },
  { slug: "trek_multi_jours",     label: "Trek multi-jours",     macro: "aventure_sport" },
  { slug: "escalade",             label: "Escalade",             macro: "aventure_sport" },
  { slug: "via_ferrata",          label: "Via ferrata",          macro: "aventure_sport" },
  { slug: "speleologie",          label: "Spéléologie",          macro: "aventure_sport" },
  { slug: "canyoning",            label: "Canyoning",            macro: "aventure_sport" },
  { slug: "vtt_cyclisme",         label: "VTT & cyclisme",       macro: "aventure_sport" },
  { slug: "kayak_canoe",          label: "Kayak & canoë",        macro: "aventure_sport" },
  { slug: "surf_windsurf",        label: "Surf & windsurf",      macro: "aventure_sport" },
  { slug: "plongee_sous_marine",  label: "Plongée sous-marine",  macro: "aventure_sport" },
  { slug: "snorkeling",           label: "Snorkeling",           macro: "aventure_sport" },
  { slug: "quad_4x4",             label: "Quad & 4x4",           macro: "aventure_sport" },
  { slug: "bivouac",              label: "Bivouac",              macro: "aventure_sport" },
  { slug: "equitation",           label: "Équitation",           macro: "aventure_sport" },
  { slug: "tir_arc",              label: "Tir à l'arc",          macro: "aventure_sport" },
  { slug: "peche_traditionnelle", label: "Pêche traditionnelle", macro: "aventure_sport" },

  // 4. Gastronomie & Terroir
  { slug: "cuisine_tunisienne_traditionnelle", label: "Cuisine tunisienne traditionnelle", macro: "gastronomie" },
  { slug: "cuisine_berbere",                   label: "Cuisine berbère",                   macro: "gastronomie" },
  { slug: "cuisine_cotiere_fruits_mer",        label: "Cuisine côtière & fruits de mer",   macro: "gastronomie" },
  { slug: "street_food",                       label: "Street food",                       macro: "gastronomie" },
  { slug: "epices_condiments",                 label: "Épices & condiments",               macro: "gastronomie" },
  { slug: "huile_olive_oleiculture",           label: "Huile d'olive & oléiculture",       macro: "gastronomie" },
  { slug: "dattes_palmeraies",                 label: "Dattes & palmeraies",               macro: "gastronomie" },
  { slug: "marches_locaux",                    label: "Marchés locaux",                    macro: "gastronomie" },
  { slug: "cours_cuisine",                     label: "Cours de cuisine",                  macro: "gastronomie" },
  { slug: "degustation_thes",                  label: "Dégustation de thés",               macro: "gastronomie" },
  { slug: "vins_viticulture",                  label: "Vins & viticulture",                macro: "gastronomie" },
  { slug: "boulangerie_traditionnelle",        label: "Boulangerie traditionnelle",        macro: "gastronomie" },
  { slug: "miel_apiculture",                   label: "Miel & apiculture",                 macro: "gastronomie" },
  { slug: "restaurant_traditionnel",           label: "Restaurant traditionnel",           macro: "gastronomie" },
  { slug: "cafe_salon_the",                    label: "Café / salon de thé",               macro: "gastronomie" },
  { slug: "ferme_restaurant",                  label: "Ferme-restaurant",                  macro: "gastronomie" },
  { slug: "food_truck",                        label: "Food truck",                        macro: "gastronomie" },
  { slug: "table_hotes",                       label: "Table d'hôtes",                     macro: "gastronomie" },
  { slug: "degustation_produits",              label: "Dégustation de produits",           macro: "gastronomie" },
  { slug: "diner_panoramique",                 label: "Dîner panoramique",                 macro: "gastronomie" },
  { slug: "visite_ferme",                      label: "Visite ferme",                      macro: "gastronomie" },
  { slug: "cueillette",                        label: "Cueillette",                        macro: "gastronomie" },
  { slug: "atelier_fromage_yaourt",            label: "Atelier fromage / yaourt",          macro: "gastronomie" },
  { slug: "jardinage",                         label: "Jardinage / plantation",            macro: "gastronomie" },
  { slug: "elevage_responsable",               label: "Élevage responsable",               macro: "gastronomie" },

  // 5. Artisanat
  { slug: "poterie_ceramique",      label: "Poterie & céramique",     macro: "artisanat" },
  { slug: "tissage_tapis",          label: "Tissage & tapis",         macro: "artisanat" },
  { slug: "broderie",               label: "Broderie",                macro: "artisanat" },
  { slug: "bijoux_berberes",        label: "Bijoux berbères",         macro: "artisanat" },
  { slug: "bijoux_argent",          label: "Bijoux en argent",        macro: "artisanat" },
  { slug: "maroquinerie_cuir",      label: "Maroquinerie & cuir",     macro: "artisanat" },
  { slug: "sculpture_bois",         label: "Sculpture sur bois",      macro: "artisanat" },
  { slug: "thuya_marqueterie",      label: "Thuya & marqueterie",     macro: "artisanat" },
  { slug: "vannerie_alfa",          label: "Vannerie & alfa",         macro: "artisanat" },
  { slug: "calligraphie",           label: "Calligraphie (arabe)",    macro: "artisanat" },
  { slug: "enluminure",             label: "Enluminure",              macro: "artisanat" },
  { slug: "teinture_naturelle",     label: "Teinture naturelle",      macro: "artisanat" },
  { slug: "dinanderie",             label: "Dinanderie",              macro: "artisanat" },
  { slug: "savon_artisanal",        label: "Savon artisanal",         macro: "artisanat" },
  { slug: "couture_caftan",         label: "Couture & caftan",        macro: "artisanat" },
  { slug: "tannerie",               label: "Tannerie",                macro: "artisanat" },
  { slug: "parfumerie_naturelle",   label: "Parfumerie naturelle",    macro: "artisanat" },
  { slug: "peinture_traditionnelle",label: "Peinture traditionnelle", macro: "artisanat" },

  // 6. Découverte urbaine
  { slug: "architecture_moderne",    label: "Architecture moderne",         macro: "decouverte_urbaine" },
  { slug: "street_art_graffiti",     label: "Street art & graffiti",        macro: "decouverte_urbaine" },
  { slug: "quartiers_historiques",   label: "Quartiers historiques",        macro: "decouverte_urbaine" },
  { slug: "vie_de_quartier",         label: "Vie de quartier",              macro: "decouverte_urbaine" },
  { slug: "marches_urbains",         label: "Marchés urbains",              macro: "decouverte_urbaine" },
  { slug: "cafes_culture_locale",    label: "Cafés & culture locale",       macro: "decouverte_urbaine" },
  { slug: "gastronomie_urbaine",     label: "Gastronomie urbaine",          macro: "decouverte_urbaine" },
  { slug: "transport_local",         label: "Transport local (découverte)", macro: "decouverte_urbaine" },
  { slug: "scene_artistique",        label: "Scène artistique",             macro: "decouverte_urbaine" },
  { slug: "musique_nuits_locales",   label: "Musique & nuits locales",      macro: "decouverte_urbaine" },
  { slug: "shopping_alternatif",     label: "Shopping alternatif",          macro: "decouverte_urbaine" },
  { slug: "communautes_locales",     label: "Communautés locales",          macro: "decouverte_urbaine" },
  { slug: "parcs_espaces_verts",     label: "Parcs & espaces verts",        macro: "decouverte_urbaine" },
  { slug: "port_activites_maritimes",label: "Port & activités maritimes",   macro: "decouverte_urbaine" },

  // 7. Culture & Patrimoine
  { slug: "architecture_islamique",   label: "Architecture islamique",            macro: "culture_patrimoine" },
  { slug: "architecture_romaine",     label: "Architecture romaine (patrimoine)", macro: "culture_patrimoine" },
  { slug: "architecture_coloniale",   label: "Architecture coloniale",            macro: "culture_patrimoine" },
  { slug: "musees",                   label: "Musées",                            macro: "culture_patrimoine" },
  { slug: "medinas",                  label: "Médinas",                           macro: "culture_patrimoine" },
  { slug: "traditions_locales",       label: "Traditions locales",                macro: "culture_patrimoine" },
  { slug: "costumes_bijoux",          label: "Costumes & bijoux",                 macro: "culture_patrimoine" },
  { slug: "musique_traditionnelle",   label: "Musique traditionnelle",            macro: "culture_patrimoine" },
  { slug: "danse_folklorique",        label: "Danse folklorique",                 macro: "culture_patrimoine" },
  { slug: "litterature_poesie",       label: "Littérature & poésie",              macro: "culture_patrimoine" },
  { slug: "fetes_festivals",          label: "Fêtes & festivals",                 macro: "culture_patrimoine" },
  { slug: "contes_legendes",          label: "Contes & légendes",                 macro: "culture_patrimoine" },
  { slug: "religion_spiritualite",    label: "Religion & spiritualité",           macro: "culture_patrimoine" },
  { slug: "berbere_amazigh",          label: "Berbère & amazigh",                 macro: "culture_patrimoine" },
  { slug: "art_contemporain",         label: "Art contemporain",                  macro: "culture_patrimoine" },
  { slug: "soiree_culturelle",        label: "Soirée culturelle",                 macro: "culture_patrimoine" },
  { slug: "spectacle_traditionnel",   label: "Spectacle traditionnel",            macro: "culture_patrimoine" },
  { slug: "atelier_musical",          label: "Atelier musical",                   macro: "culture_patrimoine" },
  { slug: "visite_medina",            label: "Visite médina (guidée)",             macro: "culture_patrimoine" },
  { slug: "visite_musee",             label: "Visite musée",                      macro: "culture_patrimoine" },

  // 8. Bien-Être & Spa
  { slug: "hammam_traditionnel", label: "Hammam traditionnel",       macro: "bien_etre" },
  { slug: "massage_naturel",     label: "Massage naturel",           macro: "bien_etre" },
  { slug: "retraite_yoga",       label: "Retraite yoga",             macro: "bien_etre" },
  { slug: "meditation",          label: "Méditation",                macro: "bien_etre" },
  { slug: "bain_thermal",        label: "Bain thermal",              macro: "bien_etre" },
  { slug: "therapie_plantes",    label: "Thérapie par les plantes",  macro: "bien_etre" },
  { slug: "gommage_savon_noir",  label: "Gommage / savon noir",      macro: "bien_etre" },
  { slug: "yoga",                label: "Yoga",                      macro: "bien_etre" },

  // 9. Transport expérientiel
  { slug: "location_velo",       label: "Balade à vélo",                        macro: "transport_experientiel" },
  { slug: "caleche",             label: "Calèche",                              macro: "transport_experientiel" },
  { slug: "bateau_traditionnel", label: "Bateau traditionnel",                  macro: "transport_experientiel" },
  { slug: "tuk_tuk",             label: "Tuk-tuk",                              macro: "transport_experientiel" },
  { slug: "dromadaire",          label: "Balade à dromadaire",                  macro: "transport_experientiel" },
  { slug: "transfert_partage",   label: "Transfert partagé / covoiturage local",macro: "transport_experientiel" },

  // 10. Volontariat & Impact
  { slug: "plantation_arbres",          label: "Plantation d'arbres",             macro: "volontariat" },
  { slug: "nettoyage_plage",            label: "Nettoyage plage",                 macro: "volontariat" },
  { slug: "nettoyage_foret",            label: "Nettoyage forêt",                 macro: "volontariat" },
  { slug: "education_environnementale", label: "Éducation environnementale",      macro: "volontariat" },
  { slug: "jardin_communautaire",       label: "Jardin communautaire",            macro: "volontariat" },
  { slug: "sensibilisation_ecoles",     label: "Sensibilisation dans les écoles", macro: "volontariat" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retourne les tags fins d'une macro-catégorie donnée. */
export function getTagsByMacro(macro: MacroSlug): TaxonomyTag[] {
  return TAXONOMY_TAGS.filter((t) => t.macro === macro);
}

/** Retourne un tag fin par son slug, ou undefined si inexistant. */
export function findTagBySlug(slug: string): TaxonomyTag | undefined {
  return TAXONOMY_TAGS.find((t) => t.slug === slug);
}
