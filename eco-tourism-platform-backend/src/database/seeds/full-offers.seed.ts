/**
 * Full demo catalogue — rich offers with all entity fields + type-specific details.
 * Idempotent by title. Requires demo users (npm run seed:demo).
 *
 * Login: guide@demo.local | provider@demo.local | traveler@demo.local — Demo123!
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../../users/entities/user.entity';
import { Offer } from '../../offer/entities/offer.entity';
import { OfferSession } from '../../offer/entities/offer-session.entity';
import { OfferCollaboration } from '../../offer/entities/offer-collaboration.entity';
import { Organization } from '../../organization/entities/organization.entity';
import { Provider } from '../../provider/entities/provider.entity';
import { Guide } from '../../guide/entities/guide.entity';

config({ path: join(__dirname, '../../../.env.dev') });
config({ path: join(__dirname, '../../../.env') });

// ─── Availability helpers ─────────────────────────────────────────────────────

type Dispo =
  | { type: 'range'; start_date: string; end_date: string }
  | { type: 'specific'; start_date: string; end_date: string; dates: string[] }
  | {
      type: 'recurring';
      start_date: string;
      end_date: string;
      days_of_week: string[];
    }
  | { type: 'season'; start_date: string; end_date: string; season: string };

function dispoRange(start: string, end: string): Dispo {
  return { type: 'range', start_date: start, end_date: end };
}

const IMG = {
  forest:
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
  lodge:
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
  food:
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
  trek:
    'https://images.unsplash.com/photo-1551632811-561732d1e67f?w=1200&q=80',
  kayak:
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80',
  pottery:
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1200&q=80',
  yoga:
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80',
  bike:
    'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1200&q=80',
  bus:
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80',
  birds:
    'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200&q=80',
  heritage:
    'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=1200&q=80',
  volunteer:
    'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80',
};

interface CollabSpec {
  section: string;
  message: string;
  contribution_data: Record<string, unknown>;
  section_context: Record<string, unknown>;
}

interface OfferSpec {
  title: string;
  data: Partial<Offer>;
  sessions?: Array<{
    date: string;
    start_time: string;
    end_time: string;
    capacity?: number;
    notes?: string;
  }>;
  collabs?: CollabSpec[];
}

function baseDates(dispo: Dispo) {
  return {
    availability_start: new Date(dispo.start_date) as unknown as Date,
    availability_end: new Date(dispo.end_date) as unknown as Date,
    availability_mode:
      dispo.type === 'recurring'
        ? 'weekly'
        : dispo.type === 'specific'
          ? 'specific'
          : dispo.type === 'season'
            ? 'always'
            : 'period',
  };
}

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USERNAME,
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    entities: [User, Offer, OfferSession, OfferCollaboration, Organization, Provider, Guide],
    synchronize: false,
  });

  await ds.initialize();
  console.log('✅ Connected to Postgres');

  const users = ds.getRepository(User);
  const offers = ds.getRepository(Offer);
  const sessions = ds.getRepository(OfferSession);
  const collabs = ds.getRepository(OfferCollaboration);
  const orgs = ds.getRepository(Organization);
  const providers = ds.getRepository(Provider);
  const guides = ds.getRepository(Guide);

  const guide = await users.findOne({ where: { email: 'guide@demo.local' } });
  const provider = await users.findOne({ where: { email: 'provider@demo.local' } });
  if (!guide || !provider) {
    console.error('❌ Demo users missing. Run: npm run seed:demo');
    process.exit(1);
  }

  const org = await orgs.findOne({ where: { provider_id: provider.id } });
  const provProfile = await providers.findOne({ where: { user_id: provider.id } });
  const guideProfile = await guides.findOne({ where: { user_id: guide.id } });
  const providerLabel = provProfile
    ? `${provProfile.full_name} — ${provProfile.organization ?? 'Prestataire'}`
    : 'Leila Trabelsi — Écolodge Les Chênes';
  const guideLabel = guideProfile?.full_name ?? 'Youssef Mansouri';

  const catalogue: OfferSpec[] = [
    // ── 1. Hébergement — période continue ───────────────────────────────────
    {
      title: 'Nuitée Écolodge Les Chênes — Chambre Forêt',
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'Chambre double en bois local, vue forêt, petit-déjeuner bio inclus. Salle de bain privée, chauffage solaire, produits d\'accueil artisanaux.',
        price: 120,
        duration: '1 nuit',
        offer_type: 'hebergement',
        offer_subtype: 'ecolodge',
        offer_subtypes: ['ecolodge', 'chambre_standard'],
        offer_mode: 'single',
        fulfillment_mode: 'calendar_stock',
        confirmation_mode: 'manual',
        price_type: 'per_night',
        capacity: 4,
        min_group_size: 1,
        max_group_size: 4,
        min_age: 0,
        booking_deadline_hours: 48,
        confirmation_deadline_hours: 24,
        deposit_percentage: 30,
        region: 'Jendouba',
        meeting_point: 'Écolodge Les Chênes, Forêt d\'Aïn Draham',
        meeting_lat: 36.7834,
        meeting_lng: 8.6901,
        inclusions:
          'Petit-déjeuner bio, draps & serviettes, accès sentiers privés, parking gratuit',
        cancellation_policy:
          'Flexible : annulation gratuite jusqu\'à 72 h avant. 50 % remboursé entre 72 h et 24 h.',
        sustainability_score: 92,
        tags: ['hebergement', 'ecolodge', 'bio', 'foret'],
        images: [IMG.lodge, IMG.forest],
        status: 'approved',
        ...baseDates(dispoRange('2026-10-01', '2027-03-31')),
        details: {
          pension: 'petit_dejeuner',
          check_in: '15:00',
          check_out: '11:00',
          nb_chambres: 4,
          superficie_m2: 22,
          equipements: ['wifi', 'chauffage_solaire', 'terrasse', 'vue_foret'],
          langues_accueil: ['fr', 'ar', 'en'],
          animaux_acceptes: false,
          accessibilite: 'Rez-de-chaussée sur demande',
          disponibilite: dispoRange('2026-10-01', '2027-03-31'),
        },
      },
    },

    // ── 1b. Hébergement variant — plusieurs formules ────────────────────────
    {
      title: 'Écolodge Les Chênes — Choisissez votre formule',
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'Trois ambiances au cœur de la forêt : chambre Forêt, chambre Montagne ou Suite Terrasse. Petit-déjeuner bio inclus, accès sentiers privés.',
        price: 95,
        duration: '1 nuit',
        offer_type: 'hebergement',
        offer_subtype: 'ecolodge',
        offer_subtypes: ['chambre_foret', 'chambre_montagne', 'suite_terrasse'],
        offer_mode: 'variant',
        fulfillment_mode: 'calendar_stock',
        confirmation_mode: 'manual',
        price_type: 'per_night',
        capacity: 6,
        min_group_size: 1,
        max_group_size: 6,
        min_age: 0,
        booking_deadline_hours: 48,
        confirmation_deadline_hours: 24,
        deposit_percentage: 30,
        region: 'Jendouba',
        meeting_point: 'Écolodge Les Chênes, Forêt d\'Aïn Draham',
        meeting_lat: 36.7834,
        meeting_lng: 8.6901,
        inclusions:
          'Petit-déjeuner bio, draps & serviettes, accès sentiers privés, parking gratuit',
        cancellation_policy:
          'Flexible : annulation gratuite jusqu\'à 72 h avant. 50 % remboursé entre 72 h et 24 h.',
        sustainability_score: 91,
        tags: ['hebergement', 'ecolodge', 'formules', 'foret'],
        images: [IMG.lodge, IMG.forest],
        status: 'approved',
        ...baseDates(dispoRange('2026-10-01', '2027-03-31')),
        details: {
          pension: 'petit_dejeuner',
          check_in: '15:00',
          check_out: '11:00',
          subtypes_pricing: {
            chambre_foret: 95,
            chambre_montagne: 110,
            suite_terrasse: 165,
          },
          equipements: ['wifi', 'chauffage_solaire', 'terrasse', 'vue_foret'],
          langues_accueil: ['fr', 'ar', 'en'],
          animaux_acceptes: false,
          disponibilite: dispoRange('2026-10-01', '2027-03-31'),
        },
      },
    },

    // ── 2. Restauration — récurrent ven/sam ─────────────────────────────────
    {
      title: "Table d'hôtes — Menu Terroir du Nord-Ouest",
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'Dîner 4 services : entrée de saison, plat du jour (viande ou végétarien), fromage local, dessert maison. Produits circuits courts.',
        price: 45,
        duration: '2h30',
        offer_type: 'restauration',
        offer_subtype: 'table_hote',
        offer_subtypes: ['table_hote'],
        offer_mode: 'single',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'manual',
        price_type: 'per_person',
        capacity: 16,
        min_group_size: 2,
        max_group_size: 16,
        min_age: 6,
        booking_deadline_hours: 24,
        confirmation_deadline_hours: 12,
        deposit_percentage: 15,
        region: 'Jendouba',
        meeting_point: 'Salle à manger de l\'Écolodge Les Chênes',
        meeting_lat: 36.7836,
        meeting_lng: 8.6903,
        inclusions: 'Menu 4 services, eau, café ou thé',
        cancellation_policy: 'Modérée : remboursement 50 % jusqu\'à 48 h avant.',
        sustainability_score: 88,
        tags: ['gastronomie', 'local', 'terroir', 'vegetarien'],
        images: [IMG.food, IMG.lodge],
        status: 'approved',
        ...baseDates({
          type: 'recurring',
          start_date: '2026-09-01',
          end_date: '2027-01-31',
          days_of_week: ['4', '5'],
        }),
        details: {
          menu_type: 'terroir',
          vegetarian_options: true,
          vegan_on_request: true,
          allergenes: 'Gluten, fruits à coque — signaler à la réservation',
          boissons_incluses: ['eau', 'cafe', 'the'],
          langues_service: ['fr', 'ar'],
          disponibilite: {
            type: 'recurring',
            start_date: '2026-09-01',
            end_date: '2027-01-31',
            days_of_week: ['4', '5'],
          },
        },
      },
    },

    // ── 3. Activité — dates spécifiques, confirmation instantanée ───────────
    {
      title: 'Randonnée Cascades de Beni M\'Tir — Demi-journée',
      data: {
        author_id: guide.id,
        author_type: 'guide',
        description:
          'Randonnée modérée de 4 h jusqu\'aux cascades, avec guide naturaliste. Observation flore méditerranéenne et pause baignade.',
        price: 55,
        duration: '4h',
        offer_type: 'activite',
        offer_subtype: 'randonnee',
        offer_subtypes: ['randonnee'],
        offer_mode: 'single',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'instant',
        price_type: 'per_person',
        capacity: 10,
        min_group_size: 2,
        max_group_size: 10,
        min_age: 10,
        booking_deadline_hours: 12,
        confirmation_deadline_hours: 2,
        deposit_percentage: 0,
        region: 'Jendouba',
        meeting_point: 'Parking entrée forêt Beni M\'Tir',
        meeting_lat: 36.8012,
        meeting_lng: 8.7123,
        inclusions: 'Guide certifié, bâtons de marche, collation locale, eau',
        cancellation_policy: 'Flexible jusqu\'à 24 h avant.',
        sustainability_score: 84,
        tags: ['randonnee', 'nature', 'cascade', 'instant'],
        images: [IMG.trek, IMG.forest],
        status: 'approved',
        ...baseDates({
          type: 'specific',
          start_date: '2026-09-06',
          end_date: '2026-11-22',
          dates: ['2026-09-06', '2026-09-20', '2026-10-04', '2026-10-18', '2026-11-01', '2026-11-22'],
        }),
        details: {
          niveau_difficulte: 'moderee',
          distance_km: 8,
          denivele_positif: 320,
          langues_guides: ['fr', 'ar', 'en'],
          equipement_fourni: ['batons', 'sac_etanche'],
          equipement_obligatoire: 'Chaussures de randonnée, chapeau, crème solaire',
          annulation_meteo: true,
          disponibilite: {
            type: 'specific',
            start_date: '2026-09-06',
            end_date: '2026-11-22',
            dates: ['2026-09-06', '2026-09-20', '2026-10-04', '2026-10-18', '2026-11-01', '2026-11-22'],
          },
        },
      },
    },

    // ── 4. Circuit multi-jours ──────────────────────────────────────────────
    {
      title: 'Circuit 3 jours — Trésors du Kef & Montagnes',
      data: {
        author_id: guide.id,
        author_type: 'guide',
        description:
          'Circuit culturel et nature : médina du Kef, villages de montagne, atelier artisanal. Hébergements et repas non inclus (réservation séparée possible).',
        price: 280,
        duration: '3 jours / 2 nuits',
        offer_type: 'circuit',
        offer_subtype: 'circuit_historique',
        offer_subtypes: ['circuit_historique', 'circuit_nature'],
        offer_mode: 'package',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'manual',
        price_type: 'per_person',
        capacity: 8,
        min_group_size: 4,
        max_group_size: 8,
        min_age: 14,
        booking_deadline_hours: 72,
        confirmation_deadline_hours: 48,
        deposit_percentage: 25,
        region: 'Le Kef',
        meeting_point: 'Gare routière El Kef — 08:30',
        meeting_lat: 36.1821,
        meeting_lng: 8.7147,
        inclusions: 'Guide 3 jours, transport local, entrées sites, atelier poterie',
        cancellation_policy: 'Stricte : acompte non remboursable sous 7 jours.',
        sustainability_score: 79,
        tags: ['circuit', 'patrimoine', 'culture', 'groupe'],
        images: [IMG.heritage, IMG.trek],
        status: 'approved',
        ...baseDates({
          type: 'specific',
          start_date: '2026-10-03',
          end_date: '2026-12-12',
          dates: ['2026-10-03', '2026-10-24', '2026-11-14', '2026-12-12'],
        }),
        details: {
          nom_circuit: 'Trésors du Kef',
          point_depart: 'El Kef',
          point_arrivee: 'El Kef',
          distance_km: 45,
          type_circuit: 'Boucle',
          programme_jours: [
            { titre_jour: 'Jour 1 — Médina & kasbah', description: 'Visite guidée et déjeuner libre' },
            { titre_jour: 'Jour 2 — Villages berbères', description: 'Randonnée douce et rencontres locales' },
            { titre_jour: 'Jour 3 — Atelier & retour', description: 'Poterie traditionnelle puis départ' },
          ],
          niveau_offre: 'moderee',
          langues_guides: ['fr', 'ar'],
          disponibilite: {
            type: 'specific',
            start_date: '2026-10-03',
            end_date: '2026-12-12',
            dates: ['2026-10-03', '2026-10-24', '2026-11-14', '2026-12-12'],
          },
        },
      },
    },

    // ── 5. Artisanat — délai de fabrication ───────────────────────────────
    {
      title: 'Atelier Poterie Berbère — Pièce sur mesure',
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'Initiation au tour et modelage, puis création d\'une pièce personnalisée (bol, tagine décorative). Cuisson et finition incluses.',
        price: 75,
        duration: '3h + fabrication 7 j',
        offer_type: 'artisanat',
        offer_subtype: 'poterie_ceramique',
        offer_subtypes: ['poterie_ceramique'],
        offer_mode: 'single',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'manual',
        price_type: 'per_person',
        capacity: 6,
        min_group_size: 1,
        max_group_size: 6,
        min_age: 8,
        production_delay_days: 7,
        booking_deadline_hours: 48,
        confirmation_deadline_hours: 24,
        deposit_percentage: 40,
        region: 'Jendouba',
        meeting_point: 'Atelier poterie — village Dougga Nord',
        meeting_lat: 36.4245,
        meeting_lng: 9.2201,
        inclusions: 'Matériaux, cuisson, gravure prénom optionnelle',
        cancellation_policy: 'Acompte conservé si annulation < 48 h.',
        sustainability_score: 86,
        tags: ['artisanat', 'poterie', 'atelier', 'sur_mesure'],
        images: [IMG.pottery],
        status: 'approved',
        ...baseDates(dispoRange('2026-09-01', '2027-04-30')),
        details: {
          technique: 'tour_et_modelage',
          materiaux: ['argile_locale', 'engobes_naturels'],
          pieces_possibles: ['bol', 'assiette', 'tagine_decorative', 'vase'],
          livraison: 'Retrait atelier ou envoi sur devis',
          langues_atelier: ['fr', 'ar'],
          disponibilite: dispoRange('2026-09-01', '2027-04-30'),
        },
      },
    },

    // ── 6. Location matériel ────────────────────────────────────────────────
    {
      title: 'Location VTT Électrique — Journée Forêt',
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'VTT électrique tout suspendu, batterie 500 Wh, casque et antivol fournis. Parcours balisé fourni sur carte.',
        price: 40,
        duration: '1 journée (8h)',
        offer_type: 'location_materiel',
        offer_subtype: 'velo',
        offer_subtypes: ['velo'],
        offer_mode: 'single',
        fulfillment_mode: 'instant_stock',
        confirmation_mode: 'instant',
        price_type: 'per_unit',
        capacity: 8,
        min_group_size: 1,
        max_group_size: 8,
        min_age: 16,
        booking_deadline_hours: 4,
        confirmation_deadline_hours: 1,
        deposit_percentage: 50,
        region: 'Jendouba',
        meeting_point: 'Accueil Écolodge Les Chênes',
        meeting_lat: 36.7834,
        meeting_lng: 8.6901,
        inclusions: 'VTT, casque, antivol, carte GPX, kit réparation',
        cancellation_policy: 'Flexible jusqu\'à 12 h avant.',
        sustainability_score: 90,
        tags: ['velo', 'eco', 'outdoor', 'instant'],
        images: [IMG.bike, IMG.forest],
        status: 'approved',
        ...baseDates(dispoRange('2026-03-15', '2026-11-30')),
        details: {
          type_materiel: 'vtt_electrique',
          caution_eur: 150,
          tailles_disponibles: ['S', 'M', 'L'],
          autonomie_km: 60,
          equipements_inclus: ['casque', 'antivol', 'sacoche'],
          disponibilite: dispoRange('2026-03-15', '2026-11-30'),
        },
      },
    },

    // ── 7. Volontariat ──────────────────────────────────────────────────────
    {
      title: 'Volontariat — Reboisement Forêt de Chênes-Lièges',
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'Journée citoyenne : plantation de jeunes plants, entretien sentiers, sensibilisation biodiversité. Certificat de participation.',
        price: 0,
        duration: '1 journée',
        offer_type: 'volontariat',
        offer_subtype: 'environnement',
        offer_subtypes: ['environnement'],
        offer_mode: 'single',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'manual',
        price_type: 'on_request',
        capacity: 25,
        min_group_size: 1,
        max_group_size: 25,
        min_age: 12,
        booking_deadline_hours: 24,
        confirmation_deadline_hours: 48,
        deposit_percentage: 0,
        region: 'Jendouba',
        meeting_point: 'Maison forestière — Aïn Draham',
        meeting_lat: 36.7751,
        meeting_lng: 8.7012,
        inclusions: 'Encadrement, outils, déjeuner partagé, certificat',
        cancellation_policy: 'Prévenir 24 h avant pour libérer la place.',
        sustainability_score: 95,
        tags: ['volontariat', 'reforestation', 'citoyen', 'gratuit'],
        images: [IMG.volunteer, IMG.forest],
        status: 'approved',
        ...baseDates({
          type: 'specific',
          start_date: '2026-11-01',
          end_date: '2027-03-15',
          dates: ['2026-11-01', '2026-11-15', '2026-12-06', '2027-01-10', '2027-02-14', '2027-03-15'],
        }),
        details: {
          type_mission: 'reboisement',
          duree_h: 6,
          repas_fourni: true,
          transport_inclus: false,
          niveau_effort: 'modere',
          disponibilite: {
            type: 'specific',
            start_date: '2026-11-01',
            end_date: '2027-03-15',
            dates: ['2026-11-01', '2026-11-15', '2026-12-06', '2027-01-10', '2027-02-14', '2027-03-15'],
          },
        },
      },
    },

    // ── 8. Bien-être — récurrent ────────────────────────────────────────────
    {
      title: 'Séance Yoga & Méditation — Lever de soleil',
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'Séance de 90 min en plein air : respiration, yoga doux, méditation guidée face à la forêt. Tapis fournis.',
        price: 30,
        duration: '1h30',
        offer_type: 'bien_etre',
        offer_subtype: 'yoga',
        offer_subtypes: ['yoga', 'meditation'],
        offer_mode: 'single',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'instant',
        price_type: 'per_person',
        capacity: 12,
        min_group_size: 1,
        max_group_size: 12,
        min_age: 16,
        booking_deadline_hours: 6,
        confirmation_deadline_hours: 2,
        deposit_percentage: 0,
        region: 'Jendouba',
        meeting_point: 'Terrasse panoramique Écolodge',
        meeting_lat: 36.7838,
        meeting_lng: 8.6899,
        inclusions: 'Tapis, coussin, tisane bio après séance',
        cancellation_policy: 'Flexible jusqu\'à 6 h avant.',
        sustainability_score: 87,
        tags: ['yoga', 'bien_etre', 'meditation', 'lever_soleil'],
        images: [IMG.yoga, IMG.lodge],
        status: 'approved',
        ...baseDates({
          type: 'recurring',
          start_date: '2026-06-01',
          end_date: '2026-10-31',
          days_of_week: ['0', '2', '5'],
        }),
        details: {
          style: 'hatha_doux',
          niveau: 'tous_niveaux',
          langues: ['fr', 'en'],
          materiel_fourni: ['tapis', 'coussin', 'couverture'],
          disponibilite: {
            type: 'recurring',
            start_date: '2026-06-01',
            end_date: '2026-10-31',
            days_of_week: ['0', '2', '5'],
          },
        },
      },
    },

    // ── 9. Transport — séances planifiées ───────────────────────────────────
    {
      title: 'Navette Éco Tunis ↔ Aïn Draham — Minibus 8 places',
      data: {
        author_id: provider.id,
        author_type: 'provider',
        organization_id: org?.id ?? null,
        description:
          'Transfert partagé en minibus récent (Euro 6). Départs programmés le week-end. 1 bagage soute + 1 cabine par personne.',
        price: 35,
        duration: '2h30',
        offer_type: 'transport',
        offer_subtype: 'navette',
        offer_subtypes: ['navette', 'minibus'],
        offer_mode: 'single',
        fulfillment_mode: 'scheduled',
        confirmation_mode: 'instant',
        price_type: 'per_person',
        capacity: 8,
        min_group_size: 1,
        max_group_size: 8,
        min_age: 3,
        booking_deadline_hours: 24,
        confirmation_deadline_hours: 4,
        deposit_percentage: 20,
        region: 'Tunis → Jendouba',
        meeting_point: 'Gare routière Bab Saadoun, Tunis',
        meeting_lat: 36.8065,
        meeting_lng: 10.1612,
        inclusions: 'Siège assigné, eau, arrêt pause café',
        cancellation_policy: 'Modérée : 50 % remboursé jusqu\'à 48 h avant.',
        sustainability_score: 76,
        tags: ['transport', 'navette', 'eco', 'scheduled'],
        images: [IMG.bus],
        status: 'approved',
        ...baseDates(dispoRange('2026-09-05', '2026-12-20')),
        details: {
          type_vehicule: 'minibus_8_places',
          norme_euro: 6,
          bagages: '1 soute + 1 cabine',
          point_arrivee: 'Écolodge Les Chênes, Aïn Draham',
          disponibilite: dispoRange('2026-09-05', '2026-12-20'),
        },
      },
      sessions: [
        { date: '2026-09-06', start_time: '07:00', end_time: '09:30', capacity: 8, notes: 'Aller' },
        { date: '2026-09-06', start_time: '16:00', end_time: '18:30', capacity: 8, notes: 'Retour' },
        { date: '2026-09-13', start_time: '07:00', end_time: '09:30', capacity: 8 },
        { date: '2026-09-13', start_time: '16:00', end_time: '18:30', capacity: 8 },
        { date: '2026-09-20', start_time: '07:00', end_time: '09:30', capacity: 8 },
        { date: '2026-09-20', start_time: '16:00', end_time: '18:30', capacity: 8 },
        { date: '2026-10-04', start_time: '07:00', end_time: '09:30', capacity: 8 },
        { date: '2026-10-04', start_time: '16:00', end_time: '18:30', capacity: 8 },
      ],
    },

    // ── 10. Kayak — saison ──────────────────────────────────────────────────
    {
      title: 'Sortie Kayak Mer — Côte de Tabarka',
      data: {
        author_id: guide.id,
        author_type: 'guide',
        description:
          'Kayak de mer en petit groupe, initiation ou perfectionnement. Observation côtière et criques sauvages.',
        price: 65,
        duration: '3h',
        offer_type: 'activite',
        offer_subtype: 'kayak',
        offer_subtypes: ['kayak'],
        offer_mode: 'single',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'manual',
        price_type: 'per_person',
        capacity: 6,
        min_group_size: 2,
        max_group_size: 6,
        min_age: 12,
        booking_deadline_hours: 24,
        confirmation_deadline_hours: 12,
        deposit_percentage: 25,
        region: 'Tabarka',
        meeting_point: 'Plage de Tabarka — base nautique',
        meeting_lat: 36.9544,
        meeting_lng: 8.7581,
        inclusions: 'Kayak, pagaie, gilet, guide diplômé, briefing sécurité',
        cancellation_policy: 'Annulation météo = report ou remboursement intégral.',
        sustainability_score: 83,
        tags: ['kayak', 'mer', 'tabarka', 'ete'],
        images: [IMG.kayak],
        status: 'approved',
        ...baseDates({
          type: 'season',
          start_date: '2026-06-01',
          end_date: '2026-09-30',
          season: 'Été',
        }),
        details: {
          niveau: 'debutant_intermediaire',
          distance_km: 5,
          equipement_fourni: ['kayak', 'pagaie', 'gilet'],
          savoir_nager_obligatoire: true,
          langues_guides: ['fr', 'en'],
          disponibilite: {
            type: 'season',
            start_date: '2026-06-01',
            end_date: '2026-09-30',
            season: 'Été',
          },
        },
      },
    },

    // ── 11. Guide — observation oiseaux (scheduled + sessions) ──────────────
    {
      title: 'Ornithologie — Matinée aux étangs de Tabarka',
      data: {
        author_id: guide.id,
        author_type: 'guide',
        description:
          'Sortie matinale avec jumelles et guide ornithologue. Hérons, flamants, migrateurs selon saison.',
        price: 48,
        duration: '4h',
        offer_type: 'activite',
        offer_subtype: 'ornithologie',
        offer_subtypes: ['ornithologie', 'nature'],
        offer_mode: 'single',
        fulfillment_mode: 'scheduled',
        confirmation_mode: 'instant',
        price_type: 'per_person',
        capacity: 8,
        min_group_size: 2,
        max_group_size: 8,
        min_age: 8,
        booking_deadline_hours: 12,
        confirmation_deadline_hours: 4,
        deposit_percentage: 0,
        region: 'Tabarka',
        meeting_point: 'Parking réserve ornithologique',
        meeting_lat: 36.9488,
        meeting_lng: 8.7422,
        inclusions: 'Guide expert, jumelles prêtées, checklist espèces',
        cancellation_policy: 'Flexible 24 h avant.',
        sustainability_score: 91,
        tags: ['ornithologie', 'nature', 'tabarka', 'scheduled'],
        images: [IMG.birds],
        status: 'approved',
        ...baseDates(dispoRange('2026-09-01', '2026-11-30')),
        details: {
          especes_cibles: ['heron', 'flamant', 'egrette'],
          materiel: ['jumelles', 'guide_papier'],
          langues_guides: ['fr', 'ar', 'en'],
          disponibilite: dispoRange('2026-09-01', '2026-11-30'),
        },
      },
      sessions: [
        { date: '2026-09-07', start_time: '06:30', end_time: '10:30', capacity: 8 },
        { date: '2026-09-14', start_time: '06:30', end_time: '10:30', capacity: 8 },
        { date: '2026-09-21', start_time: '06:30', end_time: '10:30', capacity: 8 },
        { date: '2026-10-05', start_time: '07:00', end_time: '11:00', capacity: 8 },
        { date: '2026-10-19', start_time: '07:00', end_time: '11:00', capacity: 8 },
      ],
    },

    // ── 12. COLLAB — Trek + nuitée écolodge ─────────────────────────────────
    {
      title: 'Week-end Forêt : Trek guidé + Nuitée Écolodge',
      data: {
        author_id: guide.id,
        author_type: 'guide',
        description:
          'Package 2 jours / 1 nuit : randonnée guidée le samedi, nuit à l\'Écolodge Les Chênes, petit-déjeuner et brunch du dimanche.',
        price: 195,
        duration: '2 jours / 1 nuit',
        offer_type: 'circuit',
        offer_subtype: 'circuit_nature',
        offer_subtypes: ['circuit_nature', 'ecolodge'],
        offer_mode: 'package',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'manual',
        price_type: 'per_person',
        capacity: 6,
        min_group_size: 2,
        max_group_size: 6,
        min_age: 12,
        booking_deadline_hours: 72,
        confirmation_deadline_hours: 48,
        deposit_percentage: 30,
        region: 'Jendouba',
        meeting_point: 'Écolodge Les Chênes — 09:00',
        meeting_lat: 36.7834,
        meeting_lng: 8.6901,
        inclusions:
          'Guide 2 jours, 1 nuitée, petit-déjeuner, brunch dimanche, pique-nique samedi',
        cancellation_policy: 'Acompte 30 % non remboursable sous 7 jours.',
        sustainability_score: 93,
        tags: ['package', 'collaboration', 'trek', 'hebergement', 'weekend'],
        images: [IMG.trek, IMG.lodge, IMG.forest],
        status: 'approved',
        ...baseDates({
          type: 'specific',
          start_date: '2026-10-10',
          end_date: '2026-11-28',
          dates: ['2026-10-10', '2026-10-24', '2026-11-07', '2026-11-21'],
        }),
        details: {
          package: true,
          nom_circuit: 'Week-end Forêt',
          programme_jours: [
            { titre_jour: 'Samedi', description: 'Trek 6 h en forêt + dîner table d\'hôtes' },
            { titre_jour: 'Dimanche', description: 'Brunch et départ libre' },
          ],
          hebergement_types: ['ecolodge'],
          collaborateurs: [
            {
              user_id: provider.id,
              user_type: 'provider',
              name: providerLabel,
              section: 'hebergement',
              status: 'completed',
            },
          ],
          disponibilite: {
            type: 'specific',
            start_date: '2026-10-10',
            end_date: '2026-11-28',
            dates: ['2026-10-10', '2026-10-24', '2026-11-07', '2026-11-21'],
          },
        },
      },
      collabs: [
        {
          section: 'hebergement',
          message: 'Merci de bloquer les chambres pour les week-ends trek.',
          contribution_data: {
            hebergement_type: 'ecolodge',
            nights: 1,
            pension: 'petit_dejeuner_brunch',
            chambres: 'twin ou double',
            notes: 'Check-in samedi 18h après trek',
          },
          section_context: {
            category: 'hebergement',
            subtypes: ['ecolodge', 'chambre_standard'],
          },
        },
      ],
    },

    // ── 13. COLLAB — Patrimoine + table d'hôtes ───────────────────────────
    {
      title: 'Journée Patrimoine & Gastronomie Locale',
      data: {
        author_id: guide.id,
        author_type: 'guide',
        description:
          'Matinée visite patrimoine El Kef avec guide, après-midi retour à l\'écolodge pour atelier cuisine et dîner terroir.',
        price: 95,
        duration: '1 journée',
        offer_type: 'circuit',
        offer_subtype: 'circuit_historique',
        offer_subtypes: ['circuit_historique', 'table_hote'],
        offer_mode: 'package',
        fulfillment_mode: 'on_request',
        confirmation_mode: 'manual',
        price_type: 'per_person',
        capacity: 10,
        min_group_size: 4,
        max_group_size: 10,
        min_age: 10,
        booking_deadline_hours: 48,
        confirmation_deadline_hours: 24,
        deposit_percentage: 20,
        region: 'Le Kef → Jendouba',
        meeting_point: 'Porte médina El Kef — 08:00',
        meeting_lat: 36.1825,
        meeting_lng: 8.7151,
        inclusions: 'Guide matinée, transport retour, atelier cuisine, dîner 4 services',
        cancellation_policy: 'Modérée : 50 % sous 48 h.',
        sustainability_score: 89,
        tags: ['collaboration', 'patrimoine', 'gastronomie', 'package'],
        images: [IMG.heritage, IMG.food],
        status: 'approved',
        ...baseDates({
          type: 'specific',
          start_date: '2026-09-20',
          end_date: '2026-12-05',
          dates: ['2026-09-20', '2026-10-11', '2026-11-08', '2026-12-05'],
        }),
        details: {
          package: true,
          point_depart: 'El Kef',
          point_arrivee: 'Écolodge Les Chênes',
          collaborateurs: [
            {
              user_id: provider.id,
              user_type: 'provider',
              name: providerLabel,
              section: 'restauration',
              status: 'completed',
            },
          ],
          disponibilite: {
            type: 'specific',
            start_date: '2026-09-20',
            end_date: '2026-12-05',
            dates: ['2026-09-20', '2026-10-11', '2026-11-08', '2026-12-05'],
          },
        },
      },
      collabs: [
        {
          section: 'restauration',
          message: 'Prévoir menu terroir et atelier cuisine pour le groupe l\'après-midi.',
          contribution_data: {
            type_prestation: 'table_hote',
            menu: 'terroir_4_services',
            atelier_cuisine: true,
            duree_atelier_h: 1.5,
            options_vegetariennes: true,
          },
          section_context: {
            category: 'restauration',
            subtypes: ['table_hote', 'atelier'],
          },
        },
      ],
    },
  ];

  let created = 0;
  let skipped = 0;
  let sessionsAdded = 0;
  let collabsAdded = 0;

  for (const spec of catalogue) {
    const exists = await offers.findOne({ where: { title: spec.title } });
    if (exists) {
      console.log('⏭️  Skip (exists):', spec.title);
      skipped++;
      continue;
    }

    const saved = await offers.save(offers.create({ ...spec.data, title: spec.title }));

    if (spec.sessions?.length) {
      for (const s of spec.sessions) {
        await sessions.save(
          sessions.create({
            offer_id: saved.id,
            date: s.date,
            start_time: s.start_time,
            end_time: s.end_time,
            capacity: s.capacity ?? saved.capacity ?? null,
            spots_taken: 0,
            guide_id: saved.author_type === 'guide' ? saved.author_id : null,
            status: 'scheduled',
            notes: s.notes ?? null,
          }),
        );
        sessionsAdded++;
      }
    }

    if (spec.collabs?.length) {
      for (const c of spec.collabs) {
        await collabs.save(
          collabs.create({
            offer_id: saved.id,
            guide_id: guide.id,
            invited_user_id: provider.id,
            invited_user_type: 'provider',
            invited_user_name: providerLabel,
            section: c.section,
            status: 'completed',
            message: c.message,
            contribution_data: c.contribution_data,
            section_context: c.section_context,
          }),
        );
        collabsAdded++;
      }
    }

    created++;
    console.log(
      `✅ ${saved.title} | ${saved.offer_type} | ${saved.confirmation_mode} | cap ${saved.capacity}`,
    );
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(` Done: ${created} offer(s) created, ${skipped} skipped`);
  console.log(`       ${sessionsAdded} session(s), ${collabsAdded} collaboration(s)`);
  console.log('───────────────────────────────────────────────────');
  console.log(` Guide   : ${guideLabel} (${guide.email})`);
  console.log(` Provider: ${providerLabel} (${provider.email})`);
  console.log('═══════════════════════════════════════════════════');

  await ds.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
