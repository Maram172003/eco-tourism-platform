// ── Config cascade générique pour tous les domaines ───────────────────────────
// Chaque domaine suit : Expertises → Types → Expériences → Médiation/Supports

export interface DomainCascadeConfig {
  labelType: string;
  labelExperiences: string;
  labelMediation: string;
  typesByExpertise: Record<string, string[]>;
  experiencesByType: Record<string, string[]>;
  mediationByType: Record<string, string[]>;
}

// ──────────────────────────────────────────────────────────────────────────────
// NATURE & ÉCOTOURISME
// ──────────────────────────────────────────────────────────────────────────────

const nature_ecotourisme: DomainCascadeConfig = {
  labelType: "Type de sortie nature",
  labelExperiences: "Activités & expériences",
  labelMediation: "Matériel & supports fournis",

  typesByExpertise: {
    "Faune": ["Observation mammifères", "Sortie nocturne faune", "Safari photo animalier", "Suivi traces & empreintes"],
    "Flore": ["Balade botanique", "Atelier herborisation", "Cueillette plantes aromatiques", "Sortie mycologie"],
    "Biodiversité": ["Inventaire biodiversité", "Parcours éducatif écosystème", "Atelier identification espèces"],
    "Ornithologie": ["Observation oiseaux à l'aube", "Comptage ornithologique", "Initiation ornithologie"],
    "Géologie": ["Randonnée géologique", "Atelier identification roches & minéraux", "Visite site géologique"],
    "Botanique": ["Balade botanique thématique", "Atelier herbier", "Sortie plantes médicinales"],
    "Écologie marine": ["Snorkeling guidé récif", "Observation posidonie", "Sortie kayak côtière nature"],
    "Zones humides": ["Observation zone humide", "Comptage espèces aquatiques", "Circuit lac & marais"],
    "Forêts & maquis": ["Trek en forêt guidé", "Sortie maquis méditerranéen", "Initiation sylviculture"],
    "Désert & dunes": ["Randonnée désertique", "Bivouac sous les étoiles", "Safari dunes & erg"],
    "Oasis": ["Circuit oasis", "Visite palmeraie", "Rencontre agriculteurs oasis"],
    "Parcs naturels": ["Randonnée guidée parc national", "Visite centre écologique", "Sortie sentier balisé"],
    "Astronomie & ciel nocturne": ["Observation étoiles", "Nuit astronomique guidée", "Atelier constellations"],
    "Photographie nature": ["Sortie photo nature", "Atelier photo macro & faune", "Photo lever de soleil"],
    "Éducation environnementale": ["Atelier éco-gestes", "Animation enfants nature", "Visite éducative écosystème"],
    "Conservation & protection": ["Visite réserve naturelle", "Atelier sensibilisation", "Rencontre rangers & gardes"],
    "_default": ["Sortie découverte nature", "Observation en milieu naturel"],
  },

  experiencesByType: {
    "Observation mammifères": ["Utilisation jumelles & longue-vue", "Identification empreintes & traces", "Comportement animal expliqué", "Carnet d'observations fourni"],
    "Sortie nocturne faune": ["Écoute sons nocturnes", "Détecteur chauves-souris", "Observation insectes nocturnes", "Guide sonore de la nuit"],
    "Safari photo animalier": ["Conseils techniques photo faune", "Meilleurs points d'affût", "Post-traitement images", "Identification espèces photographiées"],
    "Balade botanique": ["Identification plantes locales", "Usages médicinaux & culinaires", "Carnet botanique", "Collecte & pressage spécimens"],
    "Atelier herborisation": ["Récolte plantes aromatiques", "Séchage & conservation", "Préparation tisanes", "Carnet herbier personnel"],
    "Observation oiseaux à l'aube": ["Liste d'espèces locales fournie", "Identification chants d'oiseaux", "Carte zone migratoire", "Jumelles fournies"],
    "Bivouac sous les étoiles": ["Lecture carte du ciel", "Repas traditionnel désert", "Réveil lever de soleil guidé", "Découverte Voie Lactée"],
    "Randonnée désertique": ["Navigation traditionnelle", "Survie en milieu désertique", "Faune & flore désert", "Bivouac dunes"],
    "Observation étoiles": ["Télescope mis à disposition", "Carte du ciel fournie", "Explication constellations", "Photo astrophotographie basique"],
    "_default": ["Explication écosystème local", "Carnet de terrain fourni", "Quiz faune & flore interactif", "Fiche espèces à observer"],
  },

  mediationByType: {
    "Observation mammifères": ["Jumelles & longue-vue", "Guide faune régionale illustré", "Carnet terrain", "Fiche traces & empreintes"],
    "Sortie nocturne faune": ["Torches frontales", "Détecteur ultrasons chauves-souris", "Carnet nuit", "Guide sons nocturnes"],
    "Safari photo animalier": ["Télé-objectif prêté", "Monopied", "Guide photo nature", "Liste espèces photographiables"],
    "Balade botanique": ["Loupe de terrain", "Guide botanique régional", "Carnet herbier", "Sac de collecte"],
    "Observation oiseaux à l'aube": ["Jumelles fournies", "Guide ornithologique régional", "Liste d'espèces", "Enregistreur chants"],
    "Bivouac sous les étoiles": ["Carte du ciel plastifiée", "Télescope portatif", "Tapis de sol", "Sac de couchage"],
    "_default": ["Carte zone naturelle", "Guide espèces locales", "Carnet de terrain", "Matériel d'observation"],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// HISTORIQUE & ARCHÉOLOGIQUE
// ──────────────────────────────────────────────────────────────────────────────

const historique_archeo: DomainCascadeConfig = {
  labelType: "Type de visite historique",
  labelExperiences: "Expériences & activités",
  labelMediation: "Supports pédagogiques",

  typesByExpertise: {
    "Période punique": ["Visite Carthage", "Circuit sites puniques", "Nécropole punique", "Ports antiques Carthage"],
    "Période romaine": ["Visite amphithéâtre", "Circuit thermes romains", "Visite mosaïques El Jem", "Visite cité romaine", "Visite forum romain"],
    "Période byzantine": ["Visite basilique byzantine", "Circuit forteresses byzantines", "Visite mostre byzantine"],
    "Période arabe & médiévale": ["Visite médina", "Circuit ribats côtiers", "Visite mosquée fondatrice", "Circuit medersa"],
    "Période ottomane": ["Visite mosquée ottomane", "Circuit héritage ottoman", "Palais beys"],
    "Période coloniale": ["Quartier colonial Tunis", "Architecture coloniale Sfax", "Visite maison coloniale"],
    "Préhistoire": ["Site préhistorique Gafsa", "Atelier tracés rupestres", "Visite collections préhistoriques"],
    "Fouilles archéologiques": ["Visite chantier actif", "Atelier initiation fouilles", "Musée de site"],
    "Mosaïques antiques": ["Musée du Bardo", "Mosaïques in situ El Jem", "Atelier copie mosaïque"],
    "Thermes romains": ["Thermes Antonins Carthage", "Thermes El Jem", "Explication système hydraulique"],
    "Amphithéâtres": ["El Jem grand amphithéâtre", "Carthage amphithéâtre", "Reconstitution spectacles"],
    "Nécropoles": ["Nécropole punique Carthage", "Nécropole romaine", "Catacombes Sousse"],
    "Ksour & greniers berbères": ["Circuit ksour Tataouine", "Ksar Ouled Soltane", "Ghorfas troglodytes"],
    "Routes commerciales": ["Circuit route commerciale antique", "Ports anciens & comptoirs"],
    "Carthage & civilisation punique": ["Circuit Carthage complet", "Tophet de Salammbô", "Colline de Byrsa"],
    "_default": ["Visite site historique guidée", "Circuit archéologique commenté"],
  },

  experiencesByType: {
    "Visite Carthage": ["Reconstitution 3D Carthage antique", "Histoire de Didon & Hannibal", "Vestiges tophet expliqués", "Panorama baie de Tunis"],
    "Visite amphithéâtre": ["Descente dans l'arène", "Histoire des gladiateurs", "Acoustique & architecture expliquées", "Reconstitution spectacles"],
    "Musée du Bardo": ["Parcours mosaïques majeures guidé", "Histoire collections", "Œuvres phares commentées", "Atelier dessin mosaïque"],
    "Circuit thermes romains": ["Explication chauffage hypocauste", "Parcours des différents bains", "Reconstitution vie quotidienne", "Techniques construction romaine"],
    "Visite médina": ["Porte des souks expliquée", "Architecture zaouïa & medersa", "Secrets ruelles & impasses", "Artisans en exercice"],
    "Ksar Ouled Soltane": ["Montée ghorfas panoramique", "Histoire commerce caravansier", "Architecture troglodyte", "Récit vie nomade berbère"],
    "_default": ["Récit historique illustré", "Anecdotes & faits méconnus", "Plan & chronologie fournis", "Quiz histoire interactif"],
  },

  mediationByType: {
    "Visite Carthage": ["Plan Carthage antique", "Reconstitution illustrée", "Photos & gravures historiques", "Chronologie punique"],
    "Visite amphithéâtre": ["Plan de coupe amphithéâtre", "Illustrations gladiateurs", "Carte sites romains Tunisie"],
    "Musée du Bardo": ["Livret mosaïques", "Plan musée thématique", "Fiches œuvres majeures"],
    "_default": ["Plan annoté site", "Frise chronologique", "Photos historiques comparatives", "Glossaire termes archéo"],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// AVENTURE & RANDONNÉE
// ──────────────────────────────────────────────────────────────────────────────

const aventure_randonnee: DomainCascadeConfig = {
  labelType: "Type d'activité",
  labelExperiences: "Expériences incluses",
  labelMediation: "Équipement & supports",

  typesByExpertise: {
    "Randonnée pédestre": ["Trek journée", "Randonnée familiale facile", "Trek panoramique crête", "Rando nocturne"],
    "Trek multi-jours": ["Trek 2 jours bivouac", "Circuit montagne 3 jours", "Grande traversée Kroumirie", "Trek Dorsale tunisienne"],
    "Escalade": ["Voie d'initiation falaise", "Escalade grande voie", "Session bloc outdoor"],
    "Via ferrata": ["Via ferrata débutant", "Via ferrata sportive", "Passerelle & pont de singe"],
    "Spéléologie": ["Grotte initiation", "Exploration grotte guidée", "Rappel souterrain"],
    "Canyoning": ["Canyon eau vive", "Canyon sec & rappels", "Toboggan naturel"],
    "VTT & cyclisme": ["Sortie VTT débutant", "Trail technique single track", "Cyclo-rando route"],
    "Kayak & canoë": ["Kayak mer initiation", "Descente rivière", "Circuit côtier kayak"],
    "Surf & windsurf": ["Cours surf débutant", "Windsurf initiation", "Bodyboard & surf longboard"],
    "Plongée sous-marine": ["Baptême plongée", "Plongée exploratoire", "Plongée épave"],
    "Snorkeling": ["Sortie snorkeling récif", "Snorkeling épave peu profonde", "Observation posidonie"],
    "Quad & 4x4": ["Safari 4x4 désert", "Piste quad montagne", "Sortie bivouac 4x4"],
    "Safari désert": ["4x4 erg & dunes", "Dromadaire coucher de soleil", "Bivouac désert toile des étoiles"],
    "Bivouac": ["Bivouac montagne", "Bivouac oasis", "Bivouac forêt", "Bivouac désert"],
    "Équitation": ["Balade équestre côte", "Trek cheval montagne", "Initiation équitation"],
    "_default": ["Activité encadrée guidée", "Sortie aventure commentée"],
  },

  experiencesByType: {
    "Trek journée": ["Navigation carte & boussole", "Lecture paysage & relief", "Pause panoramique commentée", "Flora & faune en route"],
    "Trek 2 jours bivouac": ["Installation bivouac guidée", "Cuisine trail & réchaud", "Orientation nocturne", "Lever de soleil depuis sommet"],
    "Voie d'initiation falaise": ["Initiation nœuds & équipement", "Techniques escalade pieds-mains", "Assurage top rope", "Descente rappel"],
    "Grotte initiation": ["Équipement spéléo expliqué", "Techniques progression souterrain", "Faune cavernicole", "Géologie concrétions"],
    "Baptême plongée": ["Équipement & sécurité plongée", "Premiers signes sous-marins", "Faune sous-marine", "Gonflage & manœuvres de base"],
    "Kayak mer initiation": ["Techniques de pagaie", "Lecture du vent & courant", "Sécurité en mer", "Points d'intérêt côtiers"],
    "Safari désert": ["Navigation désert", "Lecture dunes & vents", "Vie bédouine & traditions", "Ciel étoilé depuis l'erg"],
    "Bivouac désert": ["Installation camp désert", "Préparation repas traditionnel", "Nuit sous voie lactée", "Réveil lever du soleil"],
    "_default": ["Brief sécurité & équipement", "Techniques adaptées au niveau", "Découverte environnement naturel", "Retour d'expérience guidé"],
  },

  mediationByType: {
    "Trek journée": ["Carte topo plastifiée", "Altimètre & boussole", "Fiche faune & flore sentier", "Tracé GPX"],
    "Trek 2 jours bivouac": ["Tente fournie", "Sac de couchage", "Réchaud & popote", "Kit premiers secours"],
    "Voie d'initiation falaise": ["Baudrier & casque", "Chaussons d'escalade", "Corde & équipements", "Guide techniques escalade"],
    "Baptême plongée": ["Combinaison fournie", "Masque & détendeur", "Bouteille & gilet", "Carnet espèces sous-marines"],
    "Kayak mer initiation": ["Kayak & pagaie", "Gilet de sauvetage", "Étanche sac & carte côtière"],
    "_default": ["Équipement de sécurité", "Carte & documentation activité", "Kit premiers secours", "Fiche technique"],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// GASTRONOMIE LOCALE
// ──────────────────────────────────────────────────────────────────────────────

const gastronomie_locale: DomainCascadeConfig = {
  labelType: "Type de session culinaire",
  labelExperiences: "Expériences culinaires",
  labelMediation: "Supports & outils fournis",

  typesByExpertise: {
    "Cuisine tunisienne traditionnelle": ["Cours de cuisine maison", "Visite marché + atelier cuisine", "Dégustation commentée plats emblématiques"],
    "Cuisine berbère": ["Atelier pain berbère tabouna", "Repas chez famille berbère", "Cuisine troglodyte Matmata"],
    "Cuisine côtière & fruits de mer": ["Visite pêcheurs + cuisine poissons", "Cours fruits de mer & grillades", "Dégustation plateau mer"],
    "Street food": ["Tour street food Tunis", "Street food Djerba & Sfax", "Circuit snacks régionaux authentiques"],
    "Épices & condiments": ["Visite souk des épices", "Atelier mélanges épices tunisiennes", "Dégustation harissa artisanale"],
    "Huile d'olive & oléiculture": ["Visite oliveraie & pressoir", "Dégustation huiles d'olive", "Atelier pressage à froid"],
    "Dattes & palmeraies": ["Visite palmeraie Tozeur", "Dégustation variétés dattes", "Circuit oasis & agriculture"],
    "Marchés locaux": ["Tour marché central Tunis", "Marché producteurs locaux", "Marché traditionnel de village"],
    "Cours de cuisine": ["Cours tajine & couscous", "Atelier brik & salade méchouia", "Cours pâtisseries orientales"],
    "Dégustation de thés": ["Cérémonie thé tunisien", "Dégustation thés régionaux à la menthe", "Histoire café & thé tradition"],
    "Vins & viticulture": ["Visite domaine viticole", "Dégustation vins Mornag & Cap Bon", "Histoire viticulture Tunisie"],
    "Boulangerie traditionnelle": ["Visite four traditionnel", "Atelier pain & galette", "Dégustation pains régionaux"],
    "Miel & apiculture": ["Visite rucher", "Extraction miel guidée", "Dégustation variétés miel Tunisie"],
    "_default": ["Session culinaire guidée", "Dégustation commentée"],
  },

  experiencesByType: {
    "Cours de cuisine maison": ["Préparation plat tunisien de A à Z", "Secrets & astuces chef local", "Repas partagé en famille", "Fiche recette emportée"],
    "Visite marché + atelier cuisine": ["Sélection produits frais guidée", "Négociation souk apprise", "Cours cuisine produits du jour", "Dégustation finale"],
    "Tour street food Tunis": ["Lablabi rue Tunis", "Fricassé & brik ambulant", "Makroud pâtissier", "Histoire chaque spécialité"],
    "Visite oliveraie & pressoir": ["Cueillette olives de saison", "Processus pressage expliqué", "Dégustation huiles extra-vierge", "Différences variétales"],
    "Visite souk des épices": ["Identification 20 épices tunisiennes", "Composition tabil & ras el hanout", "Usage culinaire & médicinal", "Achat guidé"],
    "Visite pêcheurs + cuisine poissons": ["Départ à l'aube avec pêcheurs", "Criée & choix poissons", "Cuisson sur feu de bois", "Partage repas bord de mer"],
    "Dégustation variétés dattes": ["Medjool, Deglet Nour & Allig comparées", "Histoire palmeraie Jerid", "Confection dattes farcies", "Accord thé & dattes"],
    "_default": ["Explication des saveurs & techniques", "Dégustation produits locaux", "Rencontre producteurs & artisans", "Fiche recette souvenir"],
  },

  mediationByType: {
    "Cours de cuisine maison": ["Tablier & ustensiles fournis", "Fiche recette illustrée", "Liste ingrédients & fournisseurs locaux"],
    "Visite marché + atelier cuisine": ["Panier marché fourni", "Fiche produits & saison", "Carnet recettes cours"],
    "Tour street food Tunis": ["Carte street food quartiers", "Fiche spécialités & ingrédients", "Liste adresses incontournables"],
    "Visite souk des épices": ["Sachet épices emporté", "Livret 30 épices tunisiennes", "Recettes utilisant les épices"],
    "_default": ["Fiches recettes", "Guide produits locaux", "Liste marchés & producteurs", "Ustensiles mis à disposition"],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// ARTISANAT & TRADITIONS
// ──────────────────────────────────────────────────────────────────────────────

const artisanat_traditions: DomainCascadeConfig = {
  labelType: "Type d'atelier ou visite",
  labelExperiences: "Expériences créatives",
  labelMediation: "Matériel & supports fournis",

  typesByExpertise: {
    "Poterie & céramique": ["Atelier tournage potier", "Décoration & émaillage céramique", "Visite maître potier en exercice"],
    "Tissage & tapis": ["Démonstration métier à tisser", "Initiation tapis berbère noué", "Visite manufacture tapis Kairouan"],
    "Broderie": ["Atelier broderie traditionnelle tunisienne", "Broderie de Tunis au fil d'or", "Visite brodeuse professionnelle"],
    "Bijoux berbères": ["Atelier bijoux argent & corail", "Démonstration bijoutier Tataouine", "Histoire bijoux régionaux"],
    "Bijoux en argent": ["Atelier filigrane argent", "Visite orfèvre médina", "Décoration bagues & bracelets"],
    "Maroquinerie & cuir": ["Visite tannerie traditionnelle", "Atelier fabrication sandales", "Atelier sac cuir naturel"],
    "Sculpture sur bois": ["Atelier initiation sculpture bois", "Visite menuisier arabesque", "Sculpture porte & mashrabiyya"],
    "Thuya & marqueterie": ["Atelier marqueterie thuya", "Visite atelier Essaouira-style", "Initiation incrustation nacre"],
    "Vannerie & alfa": ["Atelier vannerie alfa", "Tressage panier & chapeau", "Visite artisans Sahel"],
    "Calligraphie": ["Atelier calligraphie arabe coufique", "Initiation thuluth & naskhi", "Visite atelier calligraphe maître"],
    "Enluminure": ["Atelier enluminure manuscrit", "Décoration motifs géométriques", "Techniques pigments naturels"],
    "Teinture naturelle": ["Atelier teinture plantes & minéraux", "Démonstration teinturier traditionnel", "Bain de teinture naturelle fibres"],
    "Dinanderie": ["Visite dinandier & chaudronnier", "Atelier cuivre repoussé initiation", "Décoration plats & plateaux"],
    "Savon artisanal": ["Atelier fabrication savon beldi", "Saponification naturelle", "Parfumage & conditionnement"],
    "Couture & caftan": ["Atelier couture caftan tunisien", "Visite couturier haute couture locale", "Histoire habillement traditionnel"],
    "_default": ["Visite atelier artisan en exercice", "Initiation technique traditionnelle"],
  },

  experiencesByType: {
    "Atelier tournage potier": ["Centrage argile sur tour", "Façonnage bol & vase", "Décoration engobes & oxydes", "Cuisson four expliquée", "Pièce emportée après séchage"],
    "Initiation tapis berbère noué": ["Apprentissage nœud berbère", "Lecture & création motif", "Symbolique couleurs & motifs", "Remise carton de visite artisane"],
    "Visite tannerie traditionnelle": ["Procédé tan végétal expliqué", "Démonstration bains & pigments", "Histoire maroquinerie région", "Boutique directe producteur"],
    "Atelier calligraphie arabe coufique": ["Calligraphie à l'outil traditionnel", "Apprentissage lettres de base", "Composition prénoms & phrases", "Œuvre encadrée emportée"],
    "Atelier teinture plantes & minéraux": ["Préparation bains teinture", "Immersion & fixation mordant", "Résultats comparatifs couleurs", "Carré tissu teinté emporté"],
    "Atelier fabrication savon beldi": ["Saponification à froid", "Parfumage huiles essentielles", "Moulage & démoulage", "3 savons emportés"],
    "Démonstration métier à tisser": ["Explication chaîne & trame", "Passage sur métier guidé", "Motifs géométriques & symbolique", "Carré tissé offert"],
    "_default": ["Apprentissage technique maître artisan", "Œuvre ou création emportée", "Histoire du métier & tradition", "Rencontre artisan & échange"],
  },

  mediationByType: {
    "Atelier tournage potier": ["Tablier fourni", "Argile & outils mis à disposition", "Livret poterie Tunisie", "Emballage pièce créée"],
    "Initiation tapis berbère noué": ["Cadre & fils fournis", "Fiche motifs berbères", "Guide symbolique couleurs"],
    "Atelier calligraphie arabe coufique": ["Calame & encre fournis", "Papier aquarelle", "Livret alphabets calligraphiques", "Cadre souvenir"],
    "Atelier teinture plantes & minéraux": ["Fibres & tissu vierge fournis", "Plantes tinctoriales", "Livret guide teintures naturelles"],
    "_default": ["Matériaux & outils fournis", "Livret technique du métier", "Fiche histoire artisanat régional", "Emballage création personnelle"],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// DÉCOUVERTE URBAINE
// ──────────────────────────────────────────────────────────────────────────────

const decouverte_urbaine: DomainCascadeConfig = {
  labelType: "Type de visite urbaine",
  labelExperiences: "Expériences urbaines",
  labelMediation: "Supports de découverte",

  typesByExpertise: {
    "Architecture moderne": ["Tour architecture contemporaine", "Visite quartiers nouveaux Tunis", "Circuit immeubles emblématiques"],
    "Street art & graffiti": ["Tour street art Tunis / Sfax", "Rencontre artistes urbains locaux", "Atelier initiation graffiti"],
    "Quartiers historiques": ["Visite médina guidée", "Quartier juif la Hara", "Visite quartier colonial Belle Époque"],
    "Vie de quartier": ["Immersion vie locale", "Visite marché de quartier", "Rencontre habitants & commerçants"],
    "Marchés urbains": ["Souk Tunis tour complet", "Marchés couverts", "Marché nocturne"],
    "Cafés & culture locale": ["Circuit cafés historiques Tunis", "Café maure traditionnel", "Ambiance café Ramadan"],
    "Gastronomie urbaine": ["Street food tour urbain", "Restaurants traditionnels cachés", "Pâtisseries emblématiques"],
    "Transport local": ["Tour en métro léger Tunis", "Calèche Djerba", "TGM bord de mer"],
    "Scène artistique": ["Visite galeries d'art contemporain", "Rencontre artistes locaux", "Visite ateliers Gammarth"],
    "Musique & nuits locales": ["Soirée musique malouf", "Concert fusion contemporaine", "Nouba & improvisation"],
    "Shopping alternatif": ["Boutiques vintage médina", "Créateurs tunisiens locaux", "Souvenirs éthiques & artisanat"],
    "Communautés locales": ["Rencontre association locale", "Projet social quartier", "Bénévolat journée"],
    "Parcs & espaces verts": ["Parc Belvédère Tunis", "Jardin botanique", "Promenade lac de Tunis"],
    "Port & activités maritimes": ["Visite port La Goulette", "Tour bateau rade Tunis", "Histoire maritime côte"],
    "_default": ["Visite guidée quartier", "Découverte urbaine commentée"],
  },

  experiencesByType: {
    "Tour street art Tunis / Sfax": ["Décryptage codes & messages", "Histoire mouvement street art local", "Selfie spots meilleurs murs", "Rencontre artiste si disponible"],
    "Visite médina guidée": ["Porte Bab Bhar & remparts expliqués", "Souks thématiques (chéchia, huile, tissu)", "Zaouïas & mosquées historiques", "Impasses & fondouks secrets"],
    "Circuit cafés historiques Tunis": ["Café Mrabet depuis 1930", "Café des Nattes Sidi Bou Saïd", "Culture du café maure", "Dégustation thé & café baladi"],
    "Street food tour urbain": ["Lablabi matin", "Fricassé midi", "Brik & makroud après-midi", "Histoire chaque spécialité"],
    "Visite galeries d'art contemporain": ["Analyse œuvres guidée", "Rencontre artiste vernissage", "Tendances art tunisien actuel", "Achat conseillé"],
    "Soirée musique malouf": ["Présentation instruments traditionnels", "Histoire malouf tunisien", "Participation instruments", "Soirée concert guidée"],
    "Parc Belvédère Tunis": ["Histoire parc colonial", "Zoo & espace naturel", "Musée d'art moderne", "Vue panoramique Tunis"],
    "_default": ["Récit historique & anecdotes locales", "Rencontre acteurs du quartier", "Carte interactive quartier", "Photos spots incontournables"],
  },

  mediationByType: {
    "Tour street art Tunis / Sfax": ["Carte street art quartier", "Liste artistes locaux", "QR codes œuvres expliquées"],
    "Visite médina guidée": ["Plan médina annoté", "Fiche monuments & dates", "Lexique arabe dialectal utile"],
    "Circuit cafés historiques Tunis": ["Carte cafés emblématiques", "Fiche histoire chaque café", "Carnet adresses secrètes"],
    "Street food tour urbain": ["Carte street food Tunis", "Fiche recettes & ingrédients", "Liste adresses testées"],
    "_default": ["Carte quartier annotée", "Fiche histoire & culture locale", "Liste adresses incontournables", "QR code audio-guide"],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// CULTURE & PATRIMOINE (import depuis culturePatrimoineConfig.ts)
// ──────────────────────────────────────────────────────────────────────────────

import {
  TYPES_VISITE_PAR_EXPERTISE,
  EXPERIENCES_PAR_TYPE_VISITE,
  MEDIATION_PAR_TYPE_VISITE,
} from "./culturePatrimoineConfig";

const culture_patrimoine: DomainCascadeConfig = {
  labelType: "Type de visite",
  labelExperiences: "Expériences incluses",
  labelMediation: "Supports de médiation fournis",
  typesByExpertise: TYPES_VISITE_PAR_EXPERTISE,
  experiencesByType: EXPERIENCES_PAR_TYPE_VISITE,
  mediationByType: MEDIATION_PAR_TYPE_VISITE,
};

// ──────────────────────────────────────────────────────────────────────────────
// AUTRE (domaines divers sans cascade spécifique)
// ──────────────────────────────────────────────────────────────────────────────

const autre: DomainCascadeConfig = {
  labelType: "Format de l'activité",
  labelExperiences: "Expériences proposées",
  labelMediation: "Supports fournis",

  typesByExpertise: {
    "Bien-être & yoga":             ["Cours de yoga", "Séance de relaxation", "Atelier respiration & méditation", "Yoga en plein air"],
    "Méditation & pleine conscience": ["Séance de méditation guidée", "Atelier pleine conscience", "Retraite silence", "Méditation en nature"],
    "Photographie":                 ["Atelier photo débutant", "Sortie photo thématique", "Stage retouche photo", "Photo de paysage & nature"],
    "Peinture & arts plastiques":   ["Atelier aquarelle", "Cours dessin & croquis", "Stage huile & acrylique", "Art en plein air"],
    "Écriture créative":            ["Atelier nouvelles & contes", "Carnet de voyage illustré", "Écriture poétique", "Journal créatif"],
    "Astronomie":                   ["Nuit d'observation étoiles", "Atelier télescope", "Initiation astrophotographie", "Conférence astronomie"],
    "Tourisme solidaire":           ["Visite projet solidaire", "Rencontre associations locales", "Atelier échange culturel", "Chantier participatif"],
    "Langues & dialectes locaux":   ["Initiation dialecte tunisien", "Atelier calligraphie arabe", "Cours français-arabe", "Échange linguistique"],
    "_default": ["Atelier pratique", "Stage découverte", "Session initiation", "Conférence & échange", "Session groupe", "Session individuelle"],
  },

  experiencesByType: {
    "Cours de yoga":                ["Postures adaptées au niveau", "Exercices de respiration", "Relaxation guidée en fin de séance"],
    "Nuit d'observation étoiles":  ["Télescope mis à disposition", "Carte du ciel fournie", "Explication constellations", "Photo astrophotographie basique"],
    "Sortie photo thématique":     ["Conseils cadrage & lumière", "Repérages meilleurs spots", "Retour critique collectif"],
    "_default": ["Contenu adapté au niveau", "Matériel inclus", "Support de cours fourni", "Échanges en groupe"],
  },

  mediationByType: {
    "_default": ["Support pédagogique imprimé", "Matériel de pratique", "Guide de référence", "Carnet personnel"],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Registre global
// ──────────────────────────────────────────────────────────────────────────────

export const DOMAIN_CASCADE_CONFIG: Record<string, DomainCascadeConfig> = {
  culture_patrimoine,
  historique_archeo,
  nature_ecotourisme,
  aventure_randonnee,
  gastronomie_locale,
  artisanat_traditions,
  decouverte_urbaine,
  autre,
};

// ──────────────────────────────────────────────────────────────────────────────
// Helpers génériques
// ──────────────────────────────────────────────────────────────────────────────

export function getTypesDisponibles(cfg: DomainCascadeConfig, expertises: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const exp of expertises) {
    const types = cfg.typesByExpertise[exp] ?? cfg.typesByExpertise["_default"] ?? [];
    for (const t of types) {
      if (!seen.has(t)) { seen.add(t); result.push(t); }
    }
  }
  if (result.length === 0) {
    for (const t of (cfg.typesByExpertise["_default"] ?? [])) {
      if (!seen.has(t)) { seen.add(t); result.push(t); }
    }
  }
  return result;
}

export function getExperiencesDisponibles(cfg: DomainCascadeConfig, types: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of types) {
    const exps = cfg.experiencesByType[t] ?? cfg.experiencesByType["_default"] ?? [];
    for (const e of exps) {
      if (!seen.has(e)) { seen.add(e); result.push(e); }
    }
  }
  return result;
}

export function getMediationDisponible(cfg: DomainCascadeConfig, types: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of types) {
    const meds = cfg.mediationByType[t] ?? cfg.mediationByType["_default"] ?? [];
    for (const m of meds) {
      if (!seen.has(m)) { seen.add(m); result.push(m); }
    }
  }
  return result;
}

export function getTypesGrouped(cfg: DomainCascadeConfig, expertises: string[]): { expertise: string; types: string[] }[] {
  return expertises.map((exp) => ({
    expertise: exp,
    types: cfg.typesByExpertise[exp] ?? cfg.typesByExpertise["_default"] ?? [],
  })).filter((g) => g.types.length > 0);
}

export function getExperiencesGrouped(cfg: DomainCascadeConfig, types: string[]): { typeVisite: string; experiences: string[] }[] {
  return types.map((t) => ({
    typeVisite: t,
    experiences: cfg.experiencesByType[t] ?? cfg.experiencesByType["_default"] ?? [],
  })).filter((g) => g.experiences.length > 0);
}

export function getMediationGrouped(cfg: DomainCascadeConfig, types: string[]): { typeVisite: string; mediation: string[] }[] {
  return types.map((t) => ({
    typeVisite: t,
    mediation: cfg.mediationByType[t] ?? cfg.mediationByType["_default"] ?? [],
  })).filter((g) => g.mediation.length > 0);
}
