// ── Spécialités ────────────────────────────────────────────────────────────────

export const SPECIALITES_CONFIG: Record<string, { label: string; icon: string; desc: string }> = {
  randonnee_nature:       { label: "Randonnée nature",       icon: "hiking",          desc: "Trekking, sentiers, sommets" },
  safari_photo:           { label: "Safari photo",            icon: "photo_camera",    desc: "Photographie guidée de terrain" },
  ornithologie:           { label: "Ornithologie",            icon: "flutter_dash",    desc: "Observation des oiseaux" },
  astronomie:             { label: "Astronomie",              icon: "nights_stay",     desc: "Observation du ciel nocturne" },
  culture_patrimoine:     { label: "Culture & Patrimoine",    icon: "account_balance", desc: "Sites, médinas, histoire" },
  gastronomie:            { label: "Gastronomie",             icon: "restaurant",      desc: "Saveurs locales et authentiques" },
  speleologie:            { label: "Spéléologie",             icon: "landslide",       desc: "Exploration de grottes" },
  vtt_cyclisme:           { label: "VTT & Cyclisme",          icon: "directions_bike", desc: "Single tracks et routes" },
  kayak_sports_nautiques: { label: "Kayak & Sports nautiques",icon: "kayaking",        desc: "Mer, lac, rivière" },
  desert_camping:         { label: "Désert & Camping",        icon: "wb_sunny",        desc: "Bivouac, dunes, dromadaires" },
};

export const NIVEAU_EXPERIENCE = [
  { value: "debutant",      label: "Débutant",       color: "bg-primary/30", dot: "bg-primary/40", desc: "Aucun prérequis" },
  { value: "intermediaire", label: "Intermédiaire",  color: "bg-primary/55", dot: "bg-primary/65", desc: "Quelques bases utiles" },
  { value: "avance",        label: "Avancé",         color: "bg-primary/80", dot: "bg-primary/90", desc: "Bonne condition requise" },
  { value: "expert",        label: "Expert",         color: "bg-primary",    dot: "bg-primary",    desc: "Expérience indispensable" },
];

export const PUBLIC_RECOMMANDE = [
  { value: "familles",   icon: "family_restroom", label: "Familles" },
  { value: "couples",    icon: "favorite",        label: "Couples" },
  { value: "solo",       icon: "person",          label: "Solo" },
  { value: "groupes",    icon: "group",           label: "Groupes" },
  { value: "seniors",    icon: "elderly",         label: "Seniors" },
  { value: "scolaires",  icon: "school",          label: "Scolaires" },
  { value: "photo",      icon: "photo_camera",    label: "Photographes" },
];

export const SAISONS = ["Printemps", "Été", "Automne", "Hiver"];
export const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ── Points forts suggérés par spécialité ──────────────────────────────────────

export const POINTS_FORTS_SUGGESTIONS: Record<string, string[]> = {
  randonnee_nature: [
    "Vue panoramique exceptionnelle au sommet",
    "Sentier peu fréquenté et préservé",
    "Faune et flore endémiques",
    "Guide certifié premiers secours",
    "Tracé GPX fourni avant départ",
    "Petit groupe garanti (max 8 personnes)",
    "Pauses pique-nique dans des spots secrets",
    "Adaptation au rythme du groupe",
  ],
  safari_photo: [
    "Accès aux meilleurs spots avant le lever du soleil",
    "Conseils techniques personnalisés",
    "Emplacements exclusifs non accessibles aux touristes",
    "Guide photographe professionnel",
    "Rapport lumière/conditions optimal garanti",
    "Partage des photos du guide après la sortie",
  ],
  ornithologie: [
    "Guide ornithologue certifié",
    "Espèces rares garanties ou remboursement",
    "Jumelles professionnelles Swarovski fournies",
    "Liste eBird remise à la fin",
    "Petit groupe max 6 personnes",
    "Accès à des zones protégées",
  ],
  astronomie: [
    "Site Bortle 2 — l'un des meilleurs d'Afrique du Nord",
    "Télescope 12 pouces professionnel",
    "Animateur scientifique diplômé",
    "Observation garantie ou remboursement",
    "Boissons chaudes et couvertures incluses",
    "Photos du ciel nocturne partagées",
  ],
  culture_patrimoine: [
    "Accès à des lieux privés non ouverts au public",
    "Rencontre avec des artisans locaux",
    "Anecdotes historiques exclusives",
    "Petit groupe max 8 personnes",
    "Guides en arabe, français et anglais",
    "Dégustation de produits locaux incluse",
  ],
  gastronomie: [
    "Repas chez l'habitant authentique",
    "Marché local avec le guide qui sélectionne",
    "Recettes traditionnelles remises",
    "Producteurs locaux et circuits courts",
    "Adaptation aux régimes alimentaires",
    "Cours de cuisine inclus",
  ],
  speleologie: [
    "Tout l'équipement professionnel fourni",
    "Ratio 1 guide pour 4 participants",
    "Grotte classée site naturel protégé",
    "Concrétions millénaires spectaculaires",
    "Briefing sécurité complet",
    "Matériel de secours embarqué",
  ],
  vtt_cyclisme: [
    "Vélos trail haut de gamme fournis",
    "Tracé GPX envoyé 48h avant",
    "Single tracks exclusifs peu fréquentés",
    "Assistant mécanicien disponible",
    "Vélos électriques disponibles sur demande",
    "Petit groupe max 8 participants",
  ],
  kayak_sports_nautiques: [
    "Sites secrets inaccessibles par voie terrestre",
    "Eau cristalline et faune marine",
    "Équipement de sécurité certifié",
    "Guide breveté d'État",
    "Arrêts baignade dans des criques privées",
    "Photos sous-marines incluses",
  ],
  desert_camping: [
    "Bivouac sous un ciel étoilé exceptionnel",
    "Cuisine berbère authentique au feu de bois",
    "Dromadaires bien traités et reposés",
    "GPS et téléphone satellite embarqués",
    "Guide berbère né dans le désert",
    "Couchers et levers de soleil sur les dunes",
  ],
};

// ── Équipement à apporter par spécialité ──────────────────────────────────────

export const EQUIPEMENT_A_APPORTER: Record<string, string> = {
  randonnee_nature:
    "• Chaussures de randonnée imperméables\n• Gourde (min 1,5 L)\n• Crème solaire SPF 50+\n• Chapeau / casquette\n• Vêtements en couches\n• Imperméable léger\n• Téléphone chargé",
  safari_photo:
    "• Appareil photo (reflex, hybride ou smartphone)\n• Batteries de rechange chargées\n• Cartes mémoire supplémentaires\n• Trépied (recommandé)\n• Vêtements de couleurs neutres\n• Crème solaire",
  ornithologie:
    "• Tenue de couleurs neutres ou camouflage\n• Chaussures silencieuses\n• Carnet de notes et stylo\n• Eau (1,5 L minimum)\n• Collation légère\n• Patience et discrétion !",
  astronomie:
    "• Vêtements très chauds (nuit froide même en été)\n• Veste imperméable coupe-vent\n• Chaussures fermées\n• Lampe de poche à lumière rouge\n• Chaise pliante ou tapis de sol\n• Application Stellarium",
  culture_patrimoine:
    "• Tenue correcte et couverte (sites religieux)\n• Foulard pour les femmes (mosquées)\n• Eau (1 L minimum)\n• Chaussures confortables pour marcher",
  gastronomie:
    "• Bon appétit !\n• Signaler toute allergie alimentaire à l'avance\n• Estomac vide recommandé\n• Petit budget pour achats au marché (optionnel)",
  speleologie:
    "• Vêtements que vous pouvez salir\n• Chaussures fermées à semelle antidérapante\n• Changement de vêtements pour après\n• Eau (1 L)\n• Aucune claustrophobie",
  vtt_cyclisme:
    "• Tenue de cyclisme (cuissard recommandé)\n• Gants de vélo\n• Lunettes de soleil\n• Eau (1,5 L minimum)\n• En-cas énergétiques",
  kayak_sports_nautiques:
    "• Maillot de bain\n• Serviette\n• Crème solaire waterproof\n• Vêtements de rechange\n• Lunettes de soleil avec cordon\n• Chaussures pouvant se mouiller",
  desert_camping:
    "• Vêtements chauds pour les nuits\n• Lunettes de soleil à protection UV max\n• Crème solaire SPF 50+\n• Chapeau à larges bords\n• Chaussures fermées\n• Batterie externe rechargée",
};

// ── Services inclus pré-sélectionnés par spécialité ───────────────────────────

export const SERVICES_PAR_SPECIALITE: Record<string, string[]> = {
  randonnee_nature: [
    "Guidage professionnel certifié",
    "Carte topographique et tracé GPX",
    "Trousse de premiers secours",
    "Eau et collation en route",
    "Briefing sécurité complet",
    "Photos souvenir du groupe",
    "Certificat de participation",
  ],
  safari_photo: [
    "Guidage photo professionnel",
    "Conseils techniques personnalisés",
    "Repérage exclusif des spots",
    "Trousse de premiers secours",
    "Eau et collation",
    "Photos du guide partagées après",
    "Certificat de participation",
  ],
  ornithologie: [
    "Guide ornithologue expert",
    "Jumelles professionnelles",
    "Longue-vue sur trépied",
    "Fiches espèces illustrées",
    "Liste officielle espèces observées",
    "Trousse de premiers secours",
    "Eau et collation",
    "Certificat participation",
  ],
  astronomie: [
    "Animateur scientifique diplômé",
    "Télescope professionnel",
    "Laser pointeur étoiles",
    "Cartes célestes interactives",
    "Boissons chaudes",
    "Couvertures polaires",
    "Transport vers le site",
    "Certificat de participation",
  ],
  culture_patrimoine: [
    "Guide culturel certifié",
    "Plan détaillé du site / médina",
    "Livret patrimoine illustré",
    "Eau en route",
    "Photos souvenir",
    "Anecdotes historiques exclusives",
    "Certificat de participation",
  ],
  gastronomie: [
    "Guide gastronomique local expert",
    "Dégustations de produits locaux",
    "Visite marché avec sélection",
    "Recettes traditionnelles remises",
    "Eau et boissons",
    "Tablier si cours de cuisine",
    "Certificat de participation",
  ],
  speleologie: [
    "Guide spéléologue certifié",
    "Casque et lampe frontale pro",
    "Baudrier et équipement complet",
    "Briefing sécurité obligatoire",
    "Trousse premiers secours spécialisée",
    "Eau et collation",
    "Certificat de participation",
  ],
  vtt_cyclisme: [
    "Guide VTT professionnel",
    "Casque homologué",
    "Tracé GPX envoyé 48h avant",
    "Kit réparation crevaison",
    "Trousse de premiers secours",
    "Eau et ravitaillement",
    "Certificat de participation",
  ],
  kayak_sports_nautiques: [
    "Guide nautique breveté d'État",
    "Kayak ou embarcation fourni",
    "Gilet de sauvetage certifié",
    "Pagaie et équipement complet",
    "Briefing sécurité maritime",
    "Trousse de premiers secours",
    "Eau et collation",
    "Certificat de participation",
  ],
  desert_camping: [
    "Guide désert expert né du désert",
    "Kit survie désert complet",
    "GPS professionnel et téléphone satellite",
    "Trousse premiers secours avancée",
    "Eau potable garantie (3 L/pers/jour)",
    "Cuisine berbère traditionnelle",
    "Observation guidée des étoiles",
    "Photos souvenir",
    "Certificat de participation",
  ],
};

// ── Durées ────────────────────────────────────────────────────────────────────

export const DUREE_OPTIONS = [
  "2 heures",
  "Demi-journée (4h)",
  "Journée complète (8h)",
  "2 jours / 1 nuit",
  "3 jours / 2 nuits",
  "4 jours / 3 nuits",
  "5 jours / 4 nuits",
  "1 semaine",
  "Sur mesure",
];

// ── Zones ─────────────────────────────────────────────────────────────────────

export const ZONES_LABELS: Record<string, string> = {
  grand_tunis:      "Grand Tunis",
  cap_bon:          "Cap Bon",
  nord_ouest:       "Nord-Ouest",
  sahel:            "Sahel",
  centre_ouest:     "Centre-Ouest",
  sfax:             "Sfax & Environs",
  djerba_sud_est:   "Djerba & Sud-Est",
  tozeur_sahara:    "Tozeur & Sahara",
  tataouine_berbere:"Tataouine & Berbère",
};

// ── Repas / Hébergement / Équipement ─────────────────────────────────────────

export const REPAS_OPTIONS = [
  "Petit-déjeuner traditionnel",
  "Déjeuner pique-nique",
  "Déjeuner chez habitant / restaurant partenaire",
  "Dîner",
  "Thé / café en route",
  "Collation / fruits de saison",
  "Eau minérale tout au long",
];

export const REGIMES_OPTIONS = ["Végétarien possible", "Vegan possible", "Sans gluten possible", "Halal (par défaut)"];

export const TYPES_HEBERGEMENT = [
  "Gîte rural", "Maison d'hôtes", "Éco-lodge",
  "Camping / tentes fournies", "Bivouac (à la belle étoile)", "Auberge de jeunesse", "Hôtel simple",
];

export const EQUIP_SECURITE = [
  "Trousse de premiers secours", "Radio de communication", "GPS",
  "Équipement de survie", "Gilets de sauvetage", "Cordes & Sangles",
];

export const EQUIP_CONFORT = [
  "Tentes & Bivouac", "Glacières & Vivres", "Chaises & Tables pliantes",
  "Jumelles", "Appareils photo prêtés", "Parasols & Abris",
];

// ── Type prestation (legacy pour payload) ────────────────────────────────────

export const TYPE_PRESTATION_OPTIONS = [
  { value: "famille",         label: "Famille avec enfants",         icon: "family_restroom" },
  { value: "couple_solo",     label: "Couple / Solo",                icon: "favorite" },
  { value: "groupe_amis",     label: "Groupe d'amis",                icon: "group" },
  { value: "groupe_scolaire", label: "Groupe scolaire",              icon: "school" },
  { value: "entreprise",      label: "Entreprise / Team-building",   icon: "business" },
  { value: "seniors",         label: "Seniors (60+)",                icon: "elderly" },
  { value: "pmr",             label: "PMR / Accessibilité réduite",  icon: "accessible" },
];

export const LANGUES_OPTIONS = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "Arabe" },
  { value: "en", label: "Anglais" },
  { value: "es", label: "Espagnol" },
  { value: "de", label: "Allemand" },
  { value: "it", label: "Italien" },
];

// ── Certifications sécurité ───────────────────────────────────────────────────

export const CERTIFICATIONS_SECURITE = [
  "Guide certifié PSC1 (premiers secours)",
  "Assurance responsabilité civile professionnelle",
  "Assurance activités de plein air",
  "Guide de remplacement disponible si besoin",
  "Véhicule assuré tout risque",
];

// ═══════════════════════════════════════════════════════════════════════════════
// NOUVEAU SYSTÈME DOMAINES (remplace SPECIALITES_CONFIG pour les nouvelles offres)
// ═══════════════════════════════════════════════════════════════════════════════

export const DOMAINES: Record<string, { label: string; icon: string; expertises: string[] }> = {
  nature_ecotourisme: {
    label: "Nature & Écotourisme", icon: "eco",
    expertises: ["Faune","Flore","Biodiversité","Ornithologie","Géologie","Botanique","Entomologie","Herpétologie","Mammalogie","Écologie marine","Zones humides","Forêts & maquis","Désert & dunes","Oasis","Parcs naturels","Astronomie & ciel nocturne","Photographie nature","Éducation environnementale","Conservation & protection","Apiculture"],
  },
  culture_patrimoine: {
    label: "Culture & Patrimoine", icon: "museum",
    expertises: ["Architecture islamique","Architecture romaine","Architecture coloniale","Artisanat traditionnel","Musées","Médinas","Traditions locales","Costumes & bijoux","Musique traditionnelle","Danse folklorique","Littérature & poésie","Calligraphie arabe","Tissage & broderie","Poterie & céramique","Hammam & bains","Fêtes & festivals","Contes & légendes","Religion & spiritualité","Berbère & amazigh","Art contemporain"],
  },
  historique_archeo: {
    label: "Historique & Archéologique", icon: "history_edu",
    expertises: ["Période punique","Période romaine","Période byzantine","Période arabe & médiévale","Période ottomane","Période coloniale","Préhistoire","Fouilles archéologiques","Numismatique","Épigraphie","Mosaïques antiques","Thermes romains","Amphithéâtres","Nécropoles","Citernes & aqueducs","Ksour & greniers berbères","Fortifications","Routes commerciales","Histoire maritime","Carthage & civilisation punique"],
  },
  aventure_randonnee: {
    label: "Aventure & Randonnée", icon: "hiking",
    expertises: ["Randonnée pédestre","Trek multi-jours","Escalade","Via ferrata","Spéléologie","Canyoning","VTT & cyclisme","Kayak & canoë","Surf & windsurf","Plongée sous-marine","Snorkeling","Quad & 4x4","Safari désert","Bivouac","Camping sauvage","Dromadaire","Équitation","Course d'orientation","Parapente","Pêche traditionnelle"],
  },
  gastronomie_locale: {
    label: "Gastronomie locale", icon: "restaurant",
    expertises: ["Cuisine tunisienne traditionnelle","Cuisine berbère","Cuisine côtière & fruits de mer","Pâtisserie & sucreries","Street food","Épices & condiments","Huile d'olive & oléiculture","Dattes & palmeraies","Harissa artisanale","Boulangerie traditionnelle","Marchés locaux","Producteurs locaux","Agriculture biologique","Cours de cuisine","Dégustation de thés","Vins & viticulture","Fromages locaux","Miel & apiculture","Lait de chamelle","Boissons traditionnelles"],
  },
  artisanat_traditions: {
    label: "Artisanat & Traditions", icon: "palette",
    expertises: ["Poterie & céramique","Tissage & tapis","Broderie","Bijoux berbères","Bijoux en argent","Maroquinerie & cuir","Sculpture sur bois","Thuya & marqueterie","Ferronnerie","Vannerie & alfa","Parfumerie naturelle","Savon artisanal","Teinture naturelle","Verrerie soufflée","Calligraphie","Enluminure","Peinture sur soie","Couture & caftan","Dinanderie","Travail de l'esparto"],
  },
  decouverte_urbaine: {
    label: "Découverte urbaine", icon: "location_city",
    expertises: ["Architecture moderne","Street art & graffiti","Quartiers historiques","Vie de quartier","Marchés urbains","Cafés & culture locale","Gastronomie urbaine","Transport local","Scène artistique","Musique & nuits locales","Shopping alternatif","Communautés locales","Urbanisme & ville durable","Histoire de la ville","Cinéma & culture pop","Littérature & librairies","Parcs & espaces verts","Plages urbaines","Port & activités maritimes","Jeunesse & innovation"],
  },
  autre: {
    label: "Autre", icon: "category",
    expertises: ["Bien-être & yoga","Méditation & pleine conscience","Retraite spirituelle","Développement personnel","Photographie","Peinture & arts plastiques","Écriture créative","Astronomie","Archéo-astronomie","Géographie","Climatologie","Tourisme solidaire","Bénévolat","Langues & dialectes locaux","Généalogie","Sciences de la terre","Tourisme accessible","Tourisme sénior","Tourisme scolaire","Tourisme d'affaires"],
  },
};

// ── FieldDef ──────────────────────────────────────────────────────────────────

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "radio" | "radio_visual" | "checkboxes" | "tags" | "file" | "multilocation";
  options?: string[] | Array<{ value: string; emoji: string; label: string; desc: string }>;
  source?: "expertises_du_domaine";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  accept?: string;
  min?: number;
  max?: number;
  conditionalOn?: { field: string; value?: any; includes?: string };
}

// ── Champs dynamiques par domaine ─────────────────────────────────────────────

export const CHAMPS_DOMAINE: Record<string, Array<{ section: string; showIf?: { field: string; notEmpty?: boolean }; fields: FieldDef[] }>> = {

  nature_ecotourisme: [
    {
      section: "La sortie",
      fields: [
        { key: "type_sortie", label: "Type de sortie", type: "checkboxes", required: true,
          options: ["Observation faune","Observation flore","Ornithologie","Géologie","Astronomie nocturne","Photographie nature","Éducation environnementale","Apiculture","Randonnée naturaliste"] },
        { key: "especes_elements", label: "Espèces / éléments observables", type: "tags", placeholder: "Ex: Flamants roses, Thuya..." },
        { key: "milieux", label: "Milieux naturels traversés", type: "checkboxes",
          options: ["Forêt","Zone humide","Littoral","Montagne","Steppe","Désert / dunes","Oasis","Fond marin","Grotte"] },
        { key: "distance_km", label: "Distance (km)", type: "number", placeholder: "0 si sortie stationnaire", min: 0 },
        { key: "heure_optimale", label: "Heure optimale", type: "radio",
          options: ["Aube","Matin (7h-10h)","Journée","Crépuscule","Nuit"] },
        { key: "meilleure_periode", label: "Meilleure période", type: "checkboxes",
          options: ["Jan-Fév","Mar-Avr","Mai-Jun","Jul-Aoû","Sep-Oct","Nov-Déc"] },
      ],
    },
    {
      section: "Matériel fourni",
      fields: [
        { key: "jumelles",        label: "Jumelles professionnelles",        type: "boolean" },
        { key: "longue_vue",      label: "Longue-vue / spotting scope",      type: "boolean" },
        { key: "fiches_especes",  label: "Fiches espèces illustrées",        type: "boolean" },
        { key: "materiel_astro",  label: "Matériel astronomique",            type: "checkboxes",
          options: ["Télescope","Laser pointeur","Cartes célestes","App planétarium"],
          conditionalOn: { field: "type_sortie", includes: "Astronomie nocturne" } },
        { key: "materiel_apiculture", label: "Combinaison apiculteur fournie", type: "boolean",
          conditionalOn: { field: "type_sortie", includes: "Apiculture" } },
      ],
    },
    {
      section: "Éco-responsabilité",
      fields: [
        { key: "charte_nature",         label: "Charte respect de la nature", type: "boolean" },
        { key: "message_conservation",  label: "Message de conservation", type: "textarea", placeholder: "Quel message portez-vous ?" },
      ],
    },
  ],

  // culture_patrimoine est géré par CulturePatrimoineFields (cascade dynamique)

  historique_archeo: [
    {
      section: "La visite",
      fields: [
        { key: "type_visite", label: "Type de visite", type: "checkboxes", required: true,
          source: "expertises_du_domaine",
          hint: "Options générées depuis les expertises du domaine Historique & Archéologique" },
        { key: "sites", label: "Sites visités", type: "multilocation", required: true },
        { key: "entrees", label: "Entrées des sites", type: "radio", required: true,
          options: ["Toutes incluses","Certaines incluses","Non incluses"] },
        { key: "detail_entrees", label: "Détail des entrées", type: "textarea",
          conditionalOn: { field: "entrees", value: "Certaines incluses" } },
      ],
    },
    {
      section: "Expériences incluses",
      showIf: { field: "type_visite", notEmpty: true },
      fields: [
        { key: "fouilles_actives",    label: "Visite de fouilles actives",      type: "boolean",
          conditionalOn: { field: "type_visite", includes: "Fouilles archéologiques" } },
        { key: "specialiste_invite",  label: "Spécialiste / archéologue invité", type: "boolean" },
        { key: "reconstitution",      label: "Reconstitution historique",        type: "boolean",
          conditionalOn: { field: "type_visite", includes: "Période punique" } },
        { key: "visite_thermes",      label: "Visite guidée des thermes",        type: "boolean",
          conditionalOn: { field: "type_visite", includes: "Thermes romains" } },
        { key: "visite_amphitheatre", label: "Visite guidée amphithéâtre",       type: "boolean",
          conditionalOn: { field: "type_visite", includes: "Amphithéâtres" } },
        { key: "dechiffrage_epigraph",label: "Atelier déchiffrage épigraphique", type: "boolean",
          conditionalOn: { field: "type_visite", includes: "Épigraphie" } },
        { key: "numismatique_session",label: "Session numismatique",             type: "boolean",
          conditionalOn: { field: "type_visite", includes: "Numismatique" } },
      ],
    },
    {
      section: "Médiation",
      showIf: { field: "type_visite", notEmpty: true },
      fields: [
        { key: "supports", label: "Supports fournis", type: "checkboxes",
          options: ["Cartes historiques","Chronologie illustrée","Plans du site","Bibliographie","Fiches d'objets","Reconstitutions 3D"] },
        { key: "niveau", label: "Niveau scientifique", type: "radio",
          options: ["Grand public","Intermédiaire","Avancé","Expert"] },
        { key: "langue_mediation", label: "Langues de médiation", type: "checkboxes",
          options: ["Arabe","Français","Anglais","Espagnol","Allemand","Italien"] },
      ],
    },
  ],

  aventure_randonnee: [
    {
      section: "L'activité",
      fields: [
        { key: "activites", label: "Activités", type: "checkboxes", required: true, source: "expertises_du_domaine" },
        { key: "difficulte", label: "Difficulté", type: "radio_visual", required: true,
          options: [
            { value: "tres_facile", emoji: "🟢", label: "Très facile", desc: "Accessible à tous" },
            { value: "facile",      emoji: "🟡", label: "Facile",      desc: "Bonne condition basique" },
            { value: "moderee",     emoji: "🟠", label: "Modérée",     desc: "Bonne condition physique" },
            { value: "difficile",   emoji: "🔴", label: "Difficile",   desc: "Entraînement requis" },
            { value: "expert",      emoji: "⚫", label: "Expert",      desc: "Technique avancée" },
          ],
        },
      ],
    },
    {
      section: "Données techniques",
      fields: [
        { key: "distance_km",    label: "Distance (km)",           type: "number", min: 0 },
        { key: "denivele_m",     label: "Dénivelé positif (m)",    type: "number", min: 0 },
        { key: "altitude_max_m", label: "Altitude max (m)",        type: "number", min: 0 },
        { key: "type_parcours",  label: "Type de parcours",        type: "radio",
          options: ["Boucle","Aller-retour","Traversée","Linéaire"] },
        { key: "gpx", label: "Tracé GPX", type: "file", accept: ".gpx", hint: "Affiché sur la carte" },
        { key: "nom_grotte",       label: "Nom de la grotte",         type: "text",   conditionalOn: { field: "activites", includes: "Spéléologie" } },
        { key: "profondeur_speleo",label: "Profondeur max (m)",        type: "number", conditionalOn: { field: "activites", includes: "Spéléologie" } },
        { key: "profondeur_plongee",label: "Profondeur de plongée (m)", type: "number", conditionalOn: { field: "activites", includes: "Plongée sous-marine" } },
        { key: "niveau_plongee",   label: "Niveau requis",              type: "radio",
          options: ["Baptême","N1","N2","N3+"],
          conditionalOn: { field: "activites", includes: "Plongée sous-marine" } },
        { key: "nuits_bivouac",    label: "Nombre de nuits",           type: "number", conditionalOn: { field: "activites", includes: "Bivouac" } },
        { key: "poids_max_kg",     label: "Poids max cavalier (kg)",   type: "number", conditionalOn: { field: "activites", includes: "Équitation" } },
      ],
    },
    {
      section: "Équipement et sécurité",
      fields: [
        { key: "equipement_fourni", label: "Équipement fourni", type: "checkboxes",
          options: ["Casque","Baudrier","Cordes","Kayak / pagaie","Gilet de sauvetage","Combinaison néoprène","Masque & tuba","Bouteille plongée","VTT / vélo","Tentes","Sacs de couchage","Réchaud","GPS","Lampes frontales","Kit survie","Bâtons de marche"] },
        { key: "ratio_encadrement",    label: "Ratio d'encadrement",           type: "text", placeholder: "Ex: 1 guide pour 6 participants" },
        { key: "telephone_satellite",  label: "Téléphone satellite embarqué",  type: "boolean" },
      ],
    },
  ],

  gastronomie_locale: [
    {
      section: "L'expérience",
      fields: [
        { key: "type_experience", label: "Type d'expérience", type: "checkboxes", required: true,
          options: ["Visite de marché","Cours de cuisine","Dégustation","Repas chez l'habitant","Circuit restaurants","Rencontre producteurs","Atelier pâtisserie","Visite ferme / exploitation","Street food tour"] },
        { key: "plats_produits", label: "Plats / produits au programme", type: "tags", required: true, placeholder: "Ex: Couscous berbère, Brik, Harissa..." },
        { key: "lieux",          label: "Lieux visités",                 type: "multilocation" },
        { key: "nb_degustations",label: "Nombre de plats / dégustations", type: "number", min: 1, max: 10 },
      ],
    },
    {
      section: "Inclus",
      fields: [
        { key: "cours_cuisine",      label: "Cours de cuisine inclus",   type: "boolean" },
        { key: "niveau_cuisine",     label: "Niveau cuisine",            type: "radio",
          options: ["Débutant total","Bases recommandées","Intermédiaire"],
          conditionalOn: { field: "cours_cuisine", value: true } },
        { key: "recettes_remises",   label: "Recettes remises",          type: "boolean" },
        { key: "repas_complet",      label: "Repas complet inclus",      type: "boolean" },
        { key: "rencontre_producteurs", label: "Rencontre producteurs locaux", type: "boolean" },
        { key: "regimes",            label: "Régimes gérés",             type: "checkboxes",
          options: ["Végétarien","Vegan","Sans gluten","Halal","Kasher"] },
      ],
    },
  ],

  artisanat_traditions: [
    {
      section: "L'expérience",
      fields: [
        { key: "type_experience", label: "Type d'expérience", type: "checkboxes", required: true,
          options: ["Visite d'atelier","Démonstration live","Initiation pratique","Atelier guidé complet","Rencontre maître artisan","Visite coopérative","Création pièce personnalisée"] },
        { key: "artisans", label: "Artisans rencontrés", type: "tags", placeholder: "Ex: Maître potier 30 ans, Tisserande berbère..." },
        { key: "lieux",    label: "Ateliers / lieux",   type: "multilocation" },
      ],
    },
    {
      section: "La création",
      fields: [
        { key: "piece_creee",    label: "Pièce créée lors de l'atelier", type: "text", placeholder: "Ex: Bol en poterie, carré brodé..." },
        { key: "piece_a_emporter", label: "Pièce à emporter",            type: "boolean" },
        { key: "niveau_atelier", label: "Niveau de l'atelier",           type: "radio",
          options: ["Très accessible — tous publics","Facile","Intermédiaire","Avancé"] },
        { key: "age_min_atelier",label: "Âge minimum (ans)",             type: "number" },
        { key: "achat_possible", label: "Achat de pièces possible",      type: "boolean" },
        { key: "conseil_nego",   label: "Conseils de négociation fournis", type: "boolean" },
      ],
    },
  ],

  decouverte_urbaine: [
    {
      section: "Le circuit",
      fields: [
        { key: "type_decouverte", label: "Type de découverte", type: "checkboxes", required: true,
          options: ["Balade de quartier","Tour street art","Circuit gastronomique","Tour nocturne","Transports locaux","Rencontre communauté","Circuit architectural","Tour anti-touriste","Scène artistique","Shopping local"] },
        { key: "quartiers",           label: "Quartiers traversés",    type: "tags", required: true, placeholder: "Ex: Médina, Bab Souika, Lafayette..." },
        { key: "distance_marche_km",  label: "Distance de marche (km)", type: "number", min: 0 },
      ],
    },
    {
      section: "Expériences",
      fields: [
        { key: "bons_plans",          label: "Bons plans exclusifs partagés", type: "boolean", hint: "Non trouvables en ligne" },
        { key: "cafe_local",          label: "Pause café / thé incluse",      type: "boolean" },
        { key: "transport_local",     label: "Transport local utilisé",        type: "checkboxes",
          options: ["À pied","Bus","Metro","Louage","Vélo","Calèche"] },
        { key: "rencontre_habitants", label: "Rencontres habitants",           type: "boolean" },
        { key: "visite_chez_habitant",label: "Visite chez un habitant",        type: "boolean" },
      ],
    },
  ],

  autre: [
    {
      section: "L'expérience",
      fields: [
        { key: "type_experience",     label: "Type d'expérience",            type: "text", required: true, placeholder: "Ex: Retraite yoga, Atelier photo..." },
        { key: "description_unique",  label: "Ce qui rend votre offre unique", type: "textarea", required: true, placeholder: "Décrivez en détail..." },
        { key: "materiel_fourni",     label: "Matériel fourni",              type: "tags", placeholder: "Ajouter un item" },
        { key: "competences_transmises", label: "Compétences transmises",    type: "tags", placeholder: "Ex: Bases de méditation..." },
        { key: "prerequis",           label: "Prérequis",                    type: "textarea", placeholder: "Ex: Aucun / Niveau débutant..." },
      ],
    },
  ],
};

// ── Services pré-cochés par domaine ───────────────────────────────────────────

export const SERVICES_DEFAUT: Record<string, string[]> = {
  nature_ecotourisme:   ["Guide naturaliste certifié","Fiches espèces","Trousse secours","Eau et collation","Briefing éco","Certificat"],
  culture_patrimoine:   ["Guide culturel certifié","Plan du site","Eau","Anecdotes exclusives","Certificat"],
  historique_archeo:    ["Guide historien","Cartes historiques","Livret archéologique","Eau","Certificat"],
  aventure_randonnee:   ["Guide certifié","Équipement sécurité","Trousse secours","Eau et ravitaillement","Briefing sécurité","Certificat"],
  gastronomie_locale:   ["Guide gastronomique","Dégustations","Recettes remises","Eau et boissons","Certificat"],
  artisanat_traditions: ["Guide artisan","Démonstration live","Matériel initiation","Thé traditionnel","Certificat"],
  decouverte_urbaine:   ["Guide local","Carte annotée","Bons plans","Eau","Certificat"],
  autre:                ["Guide spécialisé","Matériel fourni","Eau","Certificat"],
};

// ── Texte "À apporter" par domaine ────────────────────────────────────────────

export const A_APPORTER: Record<string, string> = {
  nature_ecotourisme:   "Chaussures de marche, gourde 1.5L, crème solaire, chapeau, vêtements couvrants, carnet",
  culture_patrimoine:   "Tenue couverte, foulard (sites religieux), eau 1L, carnet, chaussures confortables",
  historique_archeo:    "Chapeau, eau 1.5L, crème solaire, carnet, chaussures fermées",
  aventure_randonnee:   "Chaussures adaptées, gourde 1.5L, crème solaire, vêtements en couches, imperméable",
  gastronomie_locale:   "Bon appétit ! Signaler toute allergie à l'avance.",
  artisanat_traditions: "Vêtements à salir, enthousiasme, appareil photo",
  decouverte_urbaine:   "Chaussures confortables, eau 1L, powerbank, petit budget découvertes",
  autre:                "Selon l'activité — détails fournis à la confirmation",
};
