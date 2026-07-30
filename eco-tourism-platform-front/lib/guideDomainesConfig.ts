// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldOptionSimple = string;
export type FieldOptionVisual = { value: string; emoji: string; label: string; desc: string };
export type FieldOption = FieldOptionSimple | FieldOptionVisual;

export interface DynamicField {
  key: string;
  label: string;
  type:
    | "text" | "textarea" | "number" | "boolean"
    | "select" | "radio" | "radio_visual"
    | "checkboxes" | "tags" | "file" | "time" | "range_number";
  options?: FieldOption[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  conditionalOn?: { field: string; value: any };
  max?: number;
  min?: number;
}

export interface DynamicSection {
  titre: string;
  fields: DynamicField[];
}

export interface DomainDynamicConfig {
  sections: DynamicSection[];
}

// ── Domaines ──────────────────────────────────────────────────────────────────

export const DOMAINES_CONFIG: Record<string, { label: string; icon: string; expertises: string[] }> = {
  nature_ecotourisme: {
    label: "Nature & Écotourisme",
    icon: "🌿",
    expertises: [
      "Faune", "Flore", "Biodiversité", "Ornithologie", "Géologie",
      "Botanique", "Entomologie", "Herpétologie", "Mammalogie",
      "Écologie marine", "Zones humides", "Forêts & maquis",
      "Désert & dunes", "Oasis", "Parcs naturels",
      "Astronomie & ciel nocturne", "Photographie nature",
      "Éducation environnementale", "Conservation & protection", "Apiculture",
    ],
  },
  culture_patrimoine: {
    label: "Culture & Patrimoine",
    icon: "🏛️",
    expertises: [
      "Architecture islamique", "Architecture romaine", "Architecture coloniale",
      "Artisanat traditionnel", "Musées", "Médinas", "Traditions locales",
      "Costumes & bijoux", "Musique traditionnelle", "Danse folklorique",
      "Littérature & poésie", "Calligraphie arabe", "Tissage & broderie",
      "Poterie & céramique", "Hammam & bains", "Fêtes & festivals",
      "Contes & légendes", "Religion & spiritualité", "Berbère & amazigh",
      "Art contemporain",
    ],
  },
  historique_archeo: {
    label: "Historique & Archéologique",
    icon: "📜",
    expertises: [
      "Période punique", "Période romaine", "Période byzantine",
      "Période arabe & médiévale", "Période ottomane", "Période coloniale",
      "Préhistoire", "Fouilles archéologiques", "Numismatique", "Épigraphie",
      "Mosaïques antiques", "Thermes romains", "Amphithéâtres", "Nécropoles",
      "Citernes & aqueducs", "Ksour & greniers berbères", "Fortifications",
      "Routes commerciales", "Histoire maritime", "Carthage & civilisation punique",
    ],
  },
  aventure_randonnee: {
    label: "Aventure & Randonnée",
    icon: "🥾",
    expertises: [
      "Randonnée pédestre", "Trek multi-jours", "Escalade", "Via ferrata",
      "Spéléologie", "Canyoning", "VTT & cyclisme", "Kayak & canoë",
      "Surf & windsurf", "Plongée sous-marine", "Snorkeling", "Quad & 4x4",
      "Safari désert", "Bivouac", "Camping sauvage", "Dromadaire",
      "Équitation", "Course d'orientation", "Parapente", "Pêche traditionnelle",
    ],
  },
  gastronomie_locale: {
    label: "Gastronomie locale",
    icon: "🍽️",
    expertises: [
      "Cuisine tunisienne traditionnelle", "Cuisine berbère",
      "Cuisine côtière & fruits de mer", "Pâtisserie & sucreries",
      "Street food", "Épices & condiments", "Huile d'olive & oléiculture",
      "Dattes & palmeraies", "Harissa artisanale", "Boulangerie traditionnelle",
      "Marchés locaux", "Producteurs locaux", "Agriculture biologique",
      "Cours de cuisine", "Dégustation de thés", "Vins & viticulture",
      "Fromages locaux", "Miel & apiculture", "Lait de chamelle",
      "Boissons traditionnelles",
    ],
  },
  artisanat_traditions: {
    label: "Artisanat & Traditions",
    icon: "🎨",
    expertises: [
      "Poterie & céramique", "Tissage & tapis", "Broderie", "Bijoux berbères",
      "Bijoux en argent", "Maroquinerie & cuir", "Sculpture sur bois",
      "Thuya & marqueterie", "Ferronnerie", "Vannerie & alfa",
      "Parfumerie naturelle", "Savon artisanal", "Teinture naturelle",
      "Verrerie soufflée", "Calligraphie", "Enluminure", "Peinture sur soie",
      "Couture & caftan", "Dinanderie", "Travail de l'esparto",
    ],
  },
  decouverte_urbaine: {
    label: "Découverte urbaine",
    icon: "🏙️",
    expertises: [
      "Architecture moderne", "Street art & graffiti", "Quartiers historiques",
      "Vie de quartier", "Marchés urbains", "Cafés & culture locale",
      "Gastronomie urbaine", "Transport local", "Scène artistique",
      "Musique & nuits locales", "Shopping alternatif", "Communautés locales",
      "Urbanisme & ville durable", "Histoire de la ville", "Cinéma & culture pop",
      "Littérature & librairies", "Parcs & espaces verts", "Plages urbaines",
      "Port & activités maritimes", "Jeunesse & innovation",
    ],
  },
  autre: {
    label: "Autre",
    icon: "✨",
    expertises: [
      "Bien-être & yoga", "Méditation & pleine conscience", "Retraite spirituelle",
      "Développement personnel", "Photographie", "Peinture & arts plastiques",
      "Écriture créative", "Astronomie", "Archéo-astronomie", "Géographie",
      "Climatologie", "Tourisme solidaire", "Bénévolat",
      "Langues & dialectes locaux", "Généalogie", "Sciences de la terre",
      "Tourisme accessible", "Tourisme sénior", "Tourisme scolaire",
      "Tourisme d'affaires",
    ],
  },
};

// ── Services inclus par domaine ───────────────────────────────────────────────

export const SERVICES_PAR_DOMAINE: Record<string, string[]> = {
  nature_ecotourisme: [
    "Guide naturaliste certifié",
    "Fiches espèces illustrées",
    "Jumelles / équipement optique",
    "Trousse de premiers secours",
    "Eau et collation en route",
    "Briefing éco-responsable",
    "Photos souvenir",
    "Certificat de participation",
  ],
  culture_patrimoine: [
    "Guide culturel certifié",
    "Plan détaillé des sites",
    "Livret patrimoine illustré",
    "Eau en route",
    "Photos souvenir",
    "Anecdotes exclusives",
    "Certificat de participation",
  ],
  historique_archeo: [
    "Guide historien spécialisé",
    "Cartes historiques et plans",
    "Livret archéologique",
    "Eau en route",
    "Photos souvenir",
    "Bibliographie remise",
    "Certificat de participation",
  ],
  aventure_randonnee: [
    "Guide certifié activités outdoor",
    "Équipement de sécurité complet",
    "Trousse premiers secours avancée",
    "Eau et ravitaillement",
    "Briefing sécurité obligatoire",
    "GPS professionnel",
    "Photos souvenir",
    "Certificat de participation",
  ],
  gastronomie_locale: [
    "Guide gastronomique local",
    "Dégustations incluses",
    "Sélection au marché guidée",
    "Recettes traditionnelles remises",
    "Eau et boissons",
    "Tablier si atelier cuisine",
    "Certificat de participation",
  ],
  artisanat_traditions: [
    "Guide artisan expert",
    "Démonstration live incluse",
    "Matériel d'initiation fourni",
    "Rencontre avec artisans",
    "Eau et thé traditionnel",
    "Pièce créée à emporter",
    "Certificat de participation",
  ],
  decouverte_urbaine: [
    "Guide local expert du quartier",
    "Carte du quartier annotée",
    "Bons plans exclusifs",
    "Eau en route",
    "Photos souvenir",
    "Certificat de participation",
  ],
  autre: [
    "Guide / animateur spécialisé",
    "Matériel fourni",
    "Support pédagogique",
    "Eau et collation",
    "Photos souvenir",
    "Certificat de participation",
  ],
};

// ── Équipement à apporter par domaine ────────────────────────────────────────

export const A_APPORTER_PAR_DOMAINE: Record<string, string[]> = {
  nature_ecotourisme: [
    "Chaussures de marche fermées",
    "Gourde (min 1.5L)",
    "Crème solaire SPF 50+",
    "Chapeau / casquette",
    "Vêtements couvrants (protection insectes)",
    "Carnet de notes et stylo",
    "Appareil photo (optionnel)",
  ],
  culture_patrimoine: [
    "Tenue correcte et couverte",
    "Foulard (sites religieux)",
    "Eau (1L minimum)",
    "Carnet de notes",
    "Petit budget achats éventuels",
    "Chaussures confortables",
  ],
  historique_archeo: [
    "Carnet de notes et stylo",
    "Chapeau (sites en plein air)",
    "Eau (1.5L)",
    "Crème solaire",
    "Chaussures fermées",
    "Appareil photo",
  ],
  aventure_randonnee: [
    "Chaussures adaptées à l'activité",
    "Gourde (min 1.5L)",
    "Crème solaire SPF 50+",
    "Vêtements en couches",
    "Imperméable léger",
    "Collations personnelles",
    "Téléphone chargé",
  ],
  gastronomie_locale: [
    "Bon appétit !",
    "Signaler toute allergie à l'avance",
    "Estomac légèrement vide recommandé",
    "Sac isotherme (pour rapporter des produits)",
    "Petit budget achats marché",
  ],
  artisanat_traditions: [
    "Vêtements que vous pouvez salir",
    "Enthousiasme et curiosité",
    "Appareil photo",
    "Petit budget pour achats éventuels",
  ],
  decouverte_urbaine: [
    "Chaussures confortables pour marcher",
    "Eau (1L)",
    "Chargeur téléphone / powerbank",
    "Petit budget pour cafés et découvertes",
    "Carnet de notes",
  ],
  autre: [
    "Selon l'activité — détails fournis à la confirmation",
    "Tenue adaptée à l'activité",
    "Eau",
    "Téléphone chargé",
  ],
};

// ── Points forts suggérés par domaine ────────────────────────────────────────

export const POINTS_FORTS_PAR_DOMAINE: Record<string, string[]> = {
  nature_ecotourisme: [
    "Guide naturaliste expert avec 10+ ans d'expérience",
    "Espèces rares observées garanties",
    "Matériel optique professionnel fourni",
    "Petit groupe (max 6) pour ne pas déranger la faune",
    "Site préservé loin des circuits touristiques",
    "Fiches espèces et listes d'observation remises",
    "Engagement éco-responsable fort",
    "Ciel nocturne classé parmi les plus purs d'Afrique du Nord",
  ],
  culture_patrimoine: [
    "Accès à des lieux privés non ouverts au public",
    "Rencontre avec des artisans locaux authentiques",
    "Anecdotes et histoires exclusives",
    "Guide bilingue / trilingue",
    "Petit groupe pour une immersion réelle",
    "Dégustation de produits traditionnels incluse",
    "Support patrimoine illustré remis",
  ],
  historique_archeo: [
    "Guide historien avec formation universitaire",
    "Accès à des zones de fouilles actives",
    "Documents historiques originaux partagés",
    "Chronologie illustrée remise",
    "Sites hors des circuits touristiques classiques",
    "Partenariat avec musées locaux",
  ],
  aventure_randonnee: [
    "Guide certifié et diplômé",
    "Équipement de sécurité professionnel fourni",
    "Ratio 1 guide pour 6 participants maximum",
    "Tracé GPX partagé avant la sortie",
    "Alternative météo prévue",
    "Téléphone satellite embarqué",
    "Ravitaillement en eau garanti sur le parcours",
  ],
  gastronomie_locale: [
    "Repas chez l'habitant authentique",
    "100% produits locaux et de saison",
    "Recettes traditionnelles remises",
    "Rencontre directe avec les producteurs",
    "Cours de cuisine avec chef local",
    "Adaptation garantie aux régimes alimentaires",
    "Marchés locaux sélectionnés par le guide",
  ],
  artisanat_traditions: [
    "Rencontre avec de vrais maîtres artisans",
    "Création d'une pièce unique à emporter",
    "Accès à des ateliers non touristiques",
    "Histoire et contexte culturel expliqués",
    "Démonstration live de techniques ancestrales",
    "Conseils d'achat et de négociation",
  ],
  decouverte_urbaine: [
    "Circuit anti-touriste 100% authentique",
    "Guide habitant du quartier depuis l'enfance",
    "Bons plans exclusifs non trouvables en ligne",
    "Rencontres avec des habitants locaux",
    "Accès à des espaces privés et cachés",
    "Transport local utilisé comme un vrai local",
  ],
  autre: [
    "Expérience unique et personnalisée",
    "Encadrement professionnel certifié",
    "Petit groupe garantissant l'attention individuelle",
    "Matériel professionnel fourni",
    "Certificat de participation remis",
  ],
};

// ── Champs dynamiques par domaine ─────────────────────────────────────────────

export const CHAMPS_DYNAMIQUES_PAR_DOMAINE: Record<string, DomainDynamicConfig> = {

  // ─── Nature & Écotourisme ─────────────────────────────────────────────────
  nature_ecotourisme: {
    sections: [
      {
        titre: "Votre expertise pour cette sortie",
        fields: [
          {
            key: "expertises_offre",
            label: "Expertises mobilisées",
            type: "checkboxes",
            options: [], // filled at runtime from profile.expertises
            required: true,
            hint: "Sélectionnez les expertises que vous mobilisez pour cette offre",
          },
          {
            key: "type_sortie_nature",
            label: "Type de sortie",
            type: "checkboxes",
            options: [
              "Observation faune", "Observation flore", "Ornithologie",
              "Géologie / minéraux", "Astronomie nocturne",
              "Photographie nature", "Éducation environnementale",
              "Découverte écosystème", "Apiculture / ruche", "Randonnée naturaliste",
            ],
            required: true,
          },
          {
            key: "especes_phares",
            label: "Espèces / éléments phares",
            type: "tags",
            placeholder: "Ex: Flamants roses, Faucon crécerelle, Thuya...",
            hint: "Ce que les participants vont observer",
          },
        ],
      },
      {
        titre: "Données techniques",
        fields: [
          {
            key: "milieux_traverses",
            label: "Milieux naturels traversés",
            type: "checkboxes",
            options: [
              "Forêt de chênes-lièges", "Zone humide / marais",
              "Maquis méditerranéen", "Littoral / plage",
              "Montagne / altitude", "Steppe aride",
              "Désert / dunes", "Oasis", "Prairie",
              "Fond marin / récif", "Grotte / souterrain",
            ],
          },
          {
            key: "distance_km",
            label: "Distance (km)",
            type: "number",
            placeholder: "0",
            hint: "Laissez vide si sortie stationnaire",
            min: 0,
          },
          {
            key: "fichier_gpx",
            label: "Tracé GPX",
            type: "file",
            hint: "Affiché sur la carte",
          },
          {
            key: "meilleure_periode",
            label: "Meilleure période pour cette sortie",
            type: "checkboxes",
            options: [
              "Janvier-Février", "Mars-Avril", "Mai-Juin",
              "Juillet-Août", "Septembre-Octobre", "Novembre-Décembre",
            ],
          },
          {
            key: "heure_optimale",
            label: "Heure optimale d'observation",
            type: "radio",
            options: [
              "Aube (avant lever du soleil)",
              "Matin (7h-10h)",
              "Milieu de journée",
              "Après-midi",
              "Crépuscule",
              "Nuit (astro, faune nocturne)",
            ],
          },
        ],
      },
      {
        titre: "Équipement optique et matériel",
        fields: [
          { key: "jumelles_fournies",    label: "Jumelles professionnelles fournies",  type: "boolean" },
          { key: "longue_vue_fournie",   label: "Longue-vue / spotting scope fourni",  type: "boolean" },
          { key: "fiches_especes",       label: "Fiches espèces illustrées remises",   type: "boolean" },
          {
            key: "materiel_astro",
            label: "Matériel astronomique",
            type: "checkboxes",
            options: ["Télescope professionnel", "Laser pointeur étoiles", "Cartes célestes", "Application planétarium"],
            conditionalOn: { field: "expertises_offre", value: "Astronomie & ciel nocturne" },
          },
          {
            key: "ruches_visitees",
            label: "Visite de ruches incluse",
            type: "boolean",
            conditionalOn: { field: "expertises_offre", value: "Apiculture" },
          },
          {
            key: "combinaison_apiculteur",
            label: "Combinaison apiculteur fournie",
            type: "boolean",
            conditionalOn: { field: "ruches_visitees", value: true },
          },
        ],
      },
      {
        titre: "Éco-responsabilité",
        fields: [
          { key: "charte_respect_nature", label: "Charte de respect de la nature respectée", type: "boolean" },
          {
            key: "impact_minimal",
            label: "Pratique à impact minimal",
            type: "boolean",
            hint: "Pas de collecte, pas de dérangement de la faune",
          },
          {
            key: "message_conservation",
            label: "Message de conservation transmis",
            type: "textarea",
            placeholder: "Quel message de conservation portez-vous ?",
          },
        ],
      },
    ],
  },

  // ─── Culture & Patrimoine ──────────────────────────────────────────────────
  culture_patrimoine: {
    sections: [
      {
        titre: "Votre expertise culturelle",
        fields: [
          {
            key: "expertises_offre",
            label: "Expertises mobilisées",
            type: "checkboxes",
            options: [],
            required: true,
          },
          {
            key: "type_visite_culturelle",
            label: "Type de visite",
            type: "checkboxes",
            options: [
              "Visite de médina", "Visite de musée",
              "Découverte d'un quartier", "Visite d'atelier artisan",
              "Soirée culturelle", "Visite de hammam",
              "Découverte musicale", "Visite de lieu de culte",
              "Festival / événement", "Rencontre communautaire",
            ],
            required: true,
          },
        ],
      },
      {
        titre: "Contenu de l'expérience",
        fields: [
          {
            key: "sites_visites_liste",
            label: "Sites / lieux visités",
            type: "tags",
            placeholder: "Ex: Grande Mosquée, Souk des chéchias...",
            required: true,
          },
          {
            key: "acces_lieux_prives",
            label: "Accès à des lieux non ouverts au public",
            type: "boolean",
            hint: "Riads privés, ateliers fermés, cours intérieures...",
          },
          {
            key: "detail_lieux_prives",
            label: "Décrivez ces accès exclusifs",
            type: "textarea",
            conditionalOn: { field: "acces_lieux_prives", value: true },
          },
          { key: "rencontre_artisans",  label: "Rencontre avec des artisans locaux",  type: "boolean" },
          {
            key: "type_artisans",
            label: "Type d'artisans rencontrés",
            type: "tags",
            placeholder: "Ex: Tisseur, potier, chanteur traditionnel...",
            conditionalOn: { field: "rencontre_artisans", value: true },
          },
          { key: "demonstration_incluse", label: "Démonstration live incluse",       type: "boolean" },
          { key: "degustation_locale",    label: "Dégustation produits locaux incluse", type: "boolean" },
          { key: "atelier_pratique",      label: "Atelier pratique inclus",           type: "boolean" },
          {
            key: "type_atelier_pratique",
            label: "Type d'atelier",
            type: "text",
            placeholder: "Ex: Initiation à la calligraphie",
            conditionalOn: { field: "atelier_pratique", value: true },
          },
        ],
      },
      {
        titre: "Supports & médiation",
        fields: [
          {
            key: "supports_pedagogiques",
            label: "Supports pédagogiques fournis",
            type: "checkboxes",
            options: [
              "Livret patrimoine illustré", "Cartes et plans du site",
              "Photos historiques", "Audioguide",
              "Application mobile", "QR codes informatifs",
            ],
          },
          {
            key: "niveau_detail",
            label: "Niveau de profondeur historique",
            type: "radio",
            options: [
              "Grand public — accessible à tous",
              "Intermédiaire — pour passionnés",
              "Expert — chercheurs et érudits",
            ],
            required: true,
          },
          {
            key: "anecdotes_exclusives",
            label: "Anecdotes et histoires exclusives",
            type: "boolean",
            hint: "Non trouvables dans les guides touristiques classiques",
          },
        ],
      },
    ],
  },

  // ─── Historique & Archéologique ───────────────────────────────────────────
  historique_archeo: {
    sections: [
      {
        titre: "Votre expertise historique",
        fields: [
          {
            key: "expertises_offre",
            label: "Périodes et thèmes couverts",
            type: "checkboxes",
            options: [],
            required: true,
          },
          {
            key: "type_visite_histo",
            label: "Type de visite",
            type: "checkboxes",
            options: [
              "Visite site archéologique", "Circuit historique",
              "Visite de fouilles", "Visite de musée archéologique",
              "Parcours épigraphique", "Étude mosaïques",
              "Visite thermes / monuments", "Parcours défensif / fortifications",
            ],
            required: true,
          },
        ],
      },
      {
        titre: "Sites et monuments",
        fields: [
          {
            key: "sites_historiques_liste",
            label: "Sites visités",
            type: "tags",
            placeholder: "Ex: Carthage, El Jem, Dougga...",
            required: true,
          },
          {
            key: "entrees_incluses",
            label: "Entrées des sites",
            type: "radio",
            options: [
              "Toutes incluses dans le prix",
              "Certaines incluses (préciser)",
              "Non incluses (à charge du participant)",
            ],
            required: true,
          },
          {
            key: "detail_entrees",
            label: "Détail des entrées incluses",
            type: "textarea",
            placeholder: "Ex: Entrée Carthage incluse, musée à part",
            conditionalOn: { field: "entrees_incluses", value: "Certaines incluses (préciser)" },
          },
        ],
      },
      {
        titre: "Contenu scientifique",
        fields: [
          { key: "fouilles_actives",       label: "Visite de fouilles archéologiques actives", type: "boolean" },
          { key: "specialiste_invite",      label: "Spécialiste / archéologue invité",          type: "boolean" },
          { key: "reproductions_objets",    label: "Reproductions d'objets anciens montrées",   type: "boolean" },
          {
            key: "supports_scientifiques",
            label: "Supports scientifiques fournis",
            type: "checkboxes",
            options: [
              "Cartes historiques", "Chronologie illustrée",
              "Photos fouilles", "Plans du site",
              "Bibliographie recommandée", "Fiches d'objets",
            ],
          },
          {
            key: "niveau_scientifique",
            label: "Niveau scientifique",
            type: "radio",
            options: [
              "Grand public — vulgarisation accessible",
              "Intermédiaire — passionnés d'histoire",
              "Avancé — étudiants et professionnels",
              "Expert — chercheurs spécialisés",
            ],
            required: true,
          },
        ],
      },
    ],
  },

  // ─── Aventure & Randonnée ─────────────────────────────────────────────────
  aventure_randonnee: {
    sections: [
      {
        titre: "Type d'aventure",
        fields: [
          {
            key: "expertises_offre",
            label: "Activités proposées",
            type: "checkboxes",
            options: [],
            required: true,
          },
        ],
      },
      {
        titre: "Données techniques",
        fields: [
          { key: "distance_km",        label: "Distance totale (km)",     type: "number", min: 0 },
          { key: "denivele_positif_m",  label: "Dénivelé positif (m)",     type: "number", min: 0 },
          { key: "altitude_max_m",      label: "Altitude maximale (m)",    type: "number", min: 0 },
          {
            key: "type_parcours",
            label: "Type de parcours",
            type: "radio",
            options: ["Boucle", "Aller-retour", "Traversée", "Linéaire"],
          },
          {
            key: "difficulte_technique",
            label: "Difficulté physique",
            type: "radio_visual",
            options: [
              { value: "tres_facile", emoji: "🟢", label: "Très facile",   desc: "Accessible à tous" },
              { value: "facile",      emoji: "🟡", label: "Facile",        desc: "Bonne condition basique" },
              { value: "moderee",     emoji: "🟠", label: "Modérée",       desc: "Bonne condition physique" },
              { value: "difficile",   emoji: "🔴", label: "Difficile",     desc: "Entraînement requis" },
              { value: "expert",      emoji: "⚫", label: "Expert",        desc: "Technique avancée" },
            ],
            required: true,
          },
          { key: "fichier_gpx", label: "Tracé GPX", type: "file", hint: "Polyline affichée sur la carte" },
          {
            key: "nom_grotte",
            label: "Nom de la grotte / du site",
            type: "text",
            placeholder: "Ex: Grotte de Bulla Regia",
            conditionalOn: { field: "expertises_offre", value: "Spéléologie" },
          },
          {
            key: "profondeur_max_m",
            label: "Profondeur maximale (m)",
            type: "number",
            conditionalOn: { field: "expertises_offre", value: "Spéléologie" },
          },
          {
            key: "profondeur_plongee_m",
            label: "Profondeur de plongée (m)",
            type: "number",
            conditionalOn: { field: "expertises_offre", value: "Plongée sous-marine" },
          },
          {
            key: "niveau_plongee_requis",
            label: "Niveau requis",
            type: "radio",
            options: ["Baptême (débutant)", "Niveau 1", "Niveau 2", "Niveau 3+"],
            conditionalOn: { field: "expertises_offre", value: "Plongée sous-marine" },
          },
          {
            key: "poids_max_kg",
            label: "Poids maximum (kg)",
            type: "number",
            conditionalOn: { field: "expertises_offre", value: "Équitation" },
          },
          {
            key: "nuits_bivouac",
            label: "Nombre de nuits en bivouac",
            type: "number",
            conditionalOn: { field: "expertises_offre", value: "Bivouac" },
          },
        ],
      },
      {
        titre: "Équipement fourni",
        fields: [
          {
            key: "equipement_fourni_aventure",
            label: "Équipement fourni",
            type: "checkboxes",
            options: [
              "Casque", "Baudrier & harnais", "Cordes & matériel escalade",
              "Kayak / pagaie", "Gilet de sauvetage",
              "Combinaison néoprène", "Masque & tuba",
              "Bouteille plongée & détendeur",
              "VTT / vélo", "Dromadaire / cheval",
              "Tentes & sacs de couchage", "Réchaud & popote",
              "GPS professionnel", "Lampes frontales",
              "Kit survie désert", "Bâtons de marche",
            ],
          },
        ],
      },
      {
        titre: "Sécurité",
        fields: [
          {
            key: "certification_securite",
            label: "Certifications de sécurité",
            type: "checkboxes",
            options: [
              "Guide certifié PSC1", "Guide breveté d'État",
              "Certification plongée PADI / CMAS",
              "Brevet secourisme spécialisé",
              "Assurance activités à risque",
            ],
          },
          { key: "telephone_satellite", label: "Téléphone satellite embarqué", type: "boolean" },
          {
            key: "ratio_encadrement",
            label: "Ratio d'encadrement",
            type: "text",
            placeholder: "Ex: 1 guide pour 6 participants",
          },
        ],
      },
    ],
  },

  // ─── Gastronomie locale ───────────────────────────────────────────────────
  gastronomie_locale: {
    sections: [
      {
        titre: "Votre expertise culinaire",
        fields: [
          {
            key: "expertises_offre",
            label: "Spécialités culinaires",
            type: "checkboxes",
            options: [],
            required: true,
          },
          {
            key: "type_experience_gastro",
            label: "Type d'expérience",
            type: "checkboxes",
            options: [
              "Visite de marché traditionnel", "Cours de cuisine",
              "Dégustation de produits", "Repas chez l'habitant",
              "Circuit de restaurants locaux", "Rencontre avec producteurs",
              "Atelier pâtisserie traditionnelle", "Visite de ferme / exploitation",
              "Découverte street food", "Atelier de fabrication artisanale",
            ],
            required: true,
          },
        ],
      },
      {
        titre: "L'expérience culinaire",
        fields: [
          {
            key: "plats_au_programme",
            label: "Plats / produits au programme",
            type: "tags",
            placeholder: "Ex: Couscous berbère, Brik à l'œuf, Harissa...",
            required: true,
          },
          {
            key: "produits_locaux_pct",
            label: "Pourcentage de produits locaux",
            type: "radio",
            options: [
              "100% local — du producteur à l'assiette",
              "Majoritairement local (> 80%)",
              "Mixte local et régional",
            ],
          },
          { key: "cours_cuisine_inclus", label: "Cours de cuisine inclus", type: "boolean" },
          {
            key: "niveau_cuisine",
            label: "Niveau cuisine requis",
            type: "radio",
            options: ["Aucun — débutant total", "Bases recommandées", "Intermédiaire"],
            conditionalOn: { field: "cours_cuisine_inclus", value: true },
          },
          { key: "recettes_remises", label: "Recettes traditionnelles remises", type: "boolean" },
          { key: "repas_complet",    label: "Repas complet inclus",             type: "boolean" },
          { key: "nombre_plats",     label: "Nombre de plats / dégustations",   type: "number", min: 1, max: 10 },
        ],
      },
      {
        titre: "Lieux et producteurs",
        fields: [
          {
            key: "lieux_gastronomiques",
            label: "Lieux visités",
            type: "tags",
            placeholder: "Ex: Marché central Sousse, Ferme Bio El Haouaria...",
          },
          { key: "rencontre_producteurs", label: "Rencontre avec producteurs locaux",              type: "boolean" },
          { key: "visite_exploitation",   label: "Visite d'exploitation (ferme, oliveraie, ruche...)", type: "boolean" },
        ],
      },
      {
        titre: "Régimes et allergies",
        fields: [
          {
            key: "options_regimes",
            label: "Régimes alimentaires gérés",
            type: "checkboxes",
            options: ["Végétarien", "Vegan", "Sans gluten", "Sans lactose", "Halal", "Kasher"],
          },
          {
            key: "allergies_gestion",
            label: "Gestion des allergies",
            type: "radio",
            options: [
              "Allergies gérées sur demande préalable",
              "Certaines allergies non gérables (préciser)",
              "Toutes les allergies communes gérées",
            ],
          },
        ],
      },
    ],
  },

  // ─── Artisanat & Traditions ───────────────────────────────────────────────
  artisanat_traditions: {
    sections: [
      {
        titre: "Votre expertise artisanale",
        fields: [
          {
            key: "expertises_offre",
            label: "Artisanats présentés",
            type: "checkboxes",
            options: [],
            required: true,
          },
          {
            key: "type_experience_artisanat",
            label: "Type d'expérience",
            type: "checkboxes",
            options: [
              "Visite d'atelier", "Démonstration live",
              "Initiation pratique", "Atelier guidé complet",
              "Rencontre avec maître artisan",
              "Visite de coopérative", "Visite de souk spécialisé",
              "Création d'une pièce personnalisée",
            ],
            required: true,
          },
        ],
      },
      {
        titre: "La création",
        fields: [
          {
            key: "piece_creee",
            label: "Pièce créée / fabriquée",
            type: "text",
            placeholder: "Ex: Bol en poterie, carré brodé, savon artisanal...",
          },
          { key: "piece_a_emporter", label: "La pièce est à emporter", type: "boolean" },
          {
            key: "niveau_difficulte_artisanat",
            label: "Niveau de l'atelier",
            type: "radio",
            options: [
              "Très accessible — tous publics",
              "Facile — concentration requise",
              "Intermédiaire — bases utiles",
              "Avancé — expérience recommandée",
            ],
          },
          { key: "age_minimum_atelier", label: "Âge minimum pour l'atelier", type: "number", placeholder: "Ex: 6 ans" },
        ],
      },
      {
        titre: "Artisans et lieux",
        fields: [
          {
            key: "artisans_rencontres",
            label: "Profils d'artisans rencontrés",
            type: "tags",
            placeholder: "Ex: Maître potier 30 ans d'expérience, Tisserand berbère...",
          },
          {
            key: "lieux_artisanat",
            label: "Ateliers / lieux visités",
            type: "tags",
            placeholder: "Ex: Atelier Nabeul, Coopérative Kairouan...",
          },
          { key: "histoire_artisanat",   label: "Histoire et contexte de l'artisanat expliqués", type: "boolean" },
          { key: "achat_possible",        label: "Achat de pièces possibles sur place",           type: "boolean" },
          { key: "conseil_negociation",   label: "Conseils de négociation fournis",               type: "boolean" },
        ],
      },
    ],
  },

  // ─── Découverte urbaine ───────────────────────────────────────────────────
  decouverte_urbaine: {
    sections: [
      {
        titre: "Votre expertise urbaine",
        fields: [
          {
            key: "expertises_offre",
            label: "Thèmes abordés",
            type: "checkboxes",
            options: [],
            required: true,
          },
          {
            key: "type_decouverte_urbaine",
            label: "Type de découverte",
            type: "checkboxes",
            options: [
              "Balade de quartier", "Tour street art",
              "Circuit gastronomique urbain", "Tour nocturne",
              "Découverte transports locaux", "Rencontre communauté locale",
              "Circuit architectural", "Tour alternatif anti-touriste",
              "Découverte scène artistique", "Tour shopping local",
            ],
            required: true,
          },
        ],
      },
      {
        titre: "Le circuit urbain",
        fields: [
          {
            key: "quartiers_traverses",
            label: "Quartiers traversés",
            type: "tags",
            placeholder: "Ex: Médina, Bab Souika, Lafayette...",
            required: true,
          },
          { key: "distance_marche_km",     label: "Distance de marche (km)", type: "number", min: 0 },
          { key: "bons_plans_inclus",       label: "Bons plans exclusifs partagés",              type: "boolean" },
          { key: "cafes_locaux_inclus",     label: "Pause café / thé dans un café local incluse", type: "boolean" },
          {
            key: "transport_local_utilise",
            label: "Transport local utilisé pendant la visite",
            type: "checkboxes",
            options: ["À pied uniquement", "Bus local", "Metro léger", "Taxi collectif (louage)", "Vélo", "Calèche"],
          },
          { key: "rencontre_habitants",     label: "Rencontres avec des habitants locaux", type: "boolean" },
          { key: "visite_chez_habitant",    label: "Visite chez un habitant",              type: "boolean" },
        ],
      },
      {
        titre: "Expériences spécifiques",
        fields: [
          {
            key: "street_art_spots",
            label: "Spots de street art",
            type: "tags",
            placeholder: "Ex: Rue des arts Tunis, Mur collectif...",
            conditionalOn: { field: "expertises_offre", value: "Street art & graffiti" },
          },
          {
            key: "scene_musicale",
            label: "Bars / scènes musicales inclus",
            type: "boolean",
            conditionalOn: { field: "expertises_offre", value: "Musique & nuits locales" },
          },
          {
            key: "librairies_incluses",
            label: "Librairies / éditeurs indépendants visités",
            type: "tags",
            placeholder: "Ex: Librairie Livres en tête...",
            conditionalOn: { field: "expertises_offre", value: "Littérature & librairies" },
          },
        ],
      },
    ],
  },

  // ─── Autre ────────────────────────────────────────────────────────────────
  autre: {
    sections: [
      {
        titre: "Votre expertise",
        fields: [
          {
            key: "expertises_offre",
            label: "Expertise(s) mobilisée(s)",
            type: "checkboxes",
            options: [],
            required: true,
          },
          {
            key: "type_experience_autre",
            label: "Type d'expérience",
            type: "text",
            placeholder: "Ex: Retraite yoga, Atelier photo, Cours de langue...",
            required: true,
          },
        ],
      },
      {
        titre: "Détails de l'expérience",
        fields: [
          {
            key: "description_specifique",
            label: "Description détaillée de votre offre unique",
            type: "textarea",
            placeholder: "Décrivez ce qui rend votre offre unique...",
            required: true,
          },
          {
            key: "materiel_specifique",
            label: "Matériel spécifique fourni",
            type: "tags",
            placeholder: "Ajouter un item",
          },
          {
            key: "competences_transmises",
            label: "Compétences / savoirs transmis",
            type: "tags",
            placeholder: "Ex: Techniques de méditation, Base de yoga...",
          },
          {
            key: "prealables_requis",
            label: "Prérequis nécessaires",
            type: "textarea",
            placeholder: "Ex: Aucun / Niveau débutant yoga / Parler français...",
          },
        ],
      },
    ],
  },
};
